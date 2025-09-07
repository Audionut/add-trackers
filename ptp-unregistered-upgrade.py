#!/usr/bin/env python3

import os
import sys
import time
import logging
import requests
import json
from datetime import datetime

# Environment variables
PTP_API_BASE      = os.environ.get("PTP_API_BASE", "https://passthepopcorn.me").strip("/")
PTP_API_USER      = os.environ["PTP_API_USER"]
PTP_API_KEY       = os.environ["PTP_API_KEY"]

QBT_API_BASE      = os.environ["QBT_API_BASE"].strip("/")      # e.g. http://qbittorrent:8080
QBT_USERNAME      = os.environ.get("QBT_USERNAME")
QBT_PASSWORD      = os.environ.get("QBT_PASSWORD")

RADARR_API_BASE   = os.environ["RADARR_API_BASE"].strip("/")   # e.g. http://radarr:7878
RADARR_API_KEY    = os.environ["RADARR_API_KEY"]
RADARR_LOW_PROFILE= int(os.environ.get("RADARR_LOW_PROFILE", 0))  # "Unknown" quality

# Default to dry_run to prevent people who haven't read from breaking stuff
DRY_RUN           = os.environ.get("DRY_RUN", "1").lower() in ("1","true","yes")

# This will also delete any other torrents in qBittorrent that have the same content name
DELETE_MATCHING_CONTENT = os.environ.get("DELETE_MATCHING_CONTENT", "0").lower() in ("1","true","yes")

# Setup logging
start_time = datetime.now().strftime("%Y-%m-%d_%H%M%S")
log_path   = f"/app/log/{start_time}.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_path, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Also set console output to UTF-8 for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def qbittorrent_session():
    """Authenticate to qBittorrent and return a session with cookies."""
    sess = requests.Session()
    if QBT_USERNAME and QBT_PASSWORD:
        login_url = f"{QBT_API_BASE}/api/v2/auth/login"
        r = sess.post(login_url, data={
            "username": QBT_USERNAME,
            "password": QBT_PASSWORD
        })
        if r.text != "Ok.":
            logging.error("qBittorrent login failed: %r", r.text)
            sys.exit(1)
    return sess


def get_largest_torrent_file_size(sess, info_hash):
    """Return the size of the largest file in the given torrent."""
    files_url = f"{QBT_API_BASE}/api/v2/torrents/files"
    r = sess.get(files_url, params={"hash": info_hash})
    r.raise_for_status()
    files = r.json()
    if not files:
        logging.warning("No files found for torrent %s", info_hash)
        return 0
    sizes = [f.get("size", 0) for f in files]
    return max(sizes)


def fetch_unregistered():
    """Fetch the current list of unregistered torrents from PTP."""
    url = f"{PTP_API_BASE}/userhistory.php"
    headers = {"ApiUser": PTP_API_USER, "ApiKey": PTP_API_KEY}
    params = {"action": "unregistered", "type": "json"}
    r = requests.get(url, headers=headers, params=params)
    r.raise_for_status()
    return r.json().get("Unregistered", [])


def fetch_ptp_group_details(group_id):
    """Fetch full torrent/group details from PTP (to get ImdbId)"""
    url = f"{PTP_API_BASE}/torrents.php"
    headers = {"ApiUser": PTP_API_USER, "ApiKey": PTP_API_KEY}
    params = {"id": group_id, "json": 1}
    r = requests.get(url, headers=headers, params=params)
    r.raise_for_status()
    data = r.json()
    imdb = data.get("ImdbId")
    if not imdb:
        logging.warning("No ImdbId for group %s", group_id)
    return imdb


def fetch_radarr_movie_by_imdb(imdb_id):
    """query Radarr for a managed movie by its IMDb ID"""
    # Radarr stores imdbId with 'tt...' prefix
    imdb_tag = imdb_id if imdb_id.startswith("tt") else f"tt{imdb_id.zfill(7)}"
    url = f"{RADARR_API_BASE}/api/v3/movie"
    headers = {
        "X-Api-Key": RADARR_API_KEY,
        "Accept": "text/json"
    }
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    for m in r.json():
        if m.get("imdbId") == imdb_tag:
            return m
    return None


def downgrade_radarr_quality(movie_file_id):
    """Downgrade the quality of a specific movie file using Radarr's bulk API."""
    url = f"{RADARR_API_BASE}/api/v3/moviefile/bulk"
    headers = {
        "X-Api-Key": RADARR_API_KEY,
        "Accept": "*/*",
        "Content-Type": "application/json"
    }
    payload = [
        {
            "id": movie_file_id,
            "quality": {
                "quality": {
                    "id": RADARR_LOW_PROFILE
                }
            }
        }
    ]
    if DRY_RUN:
        logging.info("[dry-run] Would downgrade movieFile %s to quality ID %s", movie_file_id, RADARR_LOW_PROFILE)
        return
    r = requests.put(url, headers=headers, json=payload)
    if r.status_code not in (200, 202):
        logging.error("Failed to downgrade quality for movieFile %s: %s", movie_file_id, r.text)
        r.raise_for_status()
    logging.info("Successfully downgraded movieFile %s to quality ID %s", movie_file_id, RADARR_LOW_PROFILE)


def trigger_radarr_search(movie_id):
    """Tell Radarr to search for a better release."""
    url = f"{RADARR_API_BASE}/api/v3/command"
    headers = {"X-Api-Key": RADARR_API_KEY, "Content-Type": "application/json"}
    body = {"name": "MoviesSearch", "movieIds": [movie_id]}
    if DRY_RUN:
        logging.info("[dry-run] Would trigger Radarr search for %s", movie_id)
        return
    r = requests.post(url, headers=headers, json=body)
    r.raise_for_status()
    logging.info("Triggered search for Radarr movie %s", movie_id)


def find_matching_torrents_by_content(sess, target_hash):
    """Find all torrents in qBittorrent that have the same content name as the target hash."""
    # First get the content name of the target torrent
    info_url = f"{QBT_API_BASE}/api/v2/torrents/info"
    r = sess.get(info_url, params={"hashes": target_hash})
    r.raise_for_status()
    target_torrents = r.json()

    if not target_torrents:
        logging.warning("Target torrent %s not found in qBittorrent", target_hash)
        return []

    target_name = target_torrents[0].get("content_path", "").strip()
    if not target_name:
        logging.warning("No content name found for target torrent %s", target_hash)
        return []

    # Get all torrents and find matches
    r = sess.get(info_url)
    r.raise_for_status()
    all_torrents = r.json()

    matching_torrents = []
    for torrent in all_torrents:
        torrent_hash = torrent.get("hash", "")
        torrent_name = torrent.get("content_path", "").strip()
        torrent_tracker = torrent.get('tracker', "").strip()

        # Skip the original torrent and check for name match
        if torrent_hash != target_hash and torrent_name == target_name:
            matching_torrents.append({
                "hash": torrent_hash,
                "name": torrent.get("name", ""),
                "tracker": torrent_tracker,
                "content_path": torrent_name
            })

    return matching_torrents


def delete_qbittorrent(info_hash):
    """Remove torrent from qBittorrent, gracefully handle if not present."""
    if DELETE_MATCHING_CONTENT:
        # Find and delete matching content torrents first
        matching_torrents = find_matching_torrents_by_content(qb_sess, info_hash)
        if matching_torrents:
            logging.info("Found %d matching content torrents for %s", len(matching_torrents), info_hash)
            for torrent in matching_torrents:
                delete_url = f"{QBT_API_BASE}/api/v2/torrents/delete"
                data = {"hashes": torrent["hash"], "deleteFiles": True}
                if DRY_RUN:
                    logging.info("[dry-run] Would delete matching qBittorrent torrent %s (%s) (%s)", 
                                 torrent["hash"], torrent["tracker"][:20], torrent["content_path"])
                else:
                    try:
                        r = qb_sess.post(delete_url, data=data)
                        if r.status_code == 200:
                            logging.info("Deleted matching qB torrent %s (%s)",
                                         torrent["hash"], torrent["name"])
                        else:
                            logging.warning("Unexpected status deleting matching torrent %s: %s %s",
                                            torrent["hash"], r.status_code, r.text)
                    except requests.RequestException as e:
                        logging.warning("Failed to delete matching torrent %s from qBittorrent: %s",
                                        torrent["hash"], e)

    # Delete the original torrent
    delete_url = f"{QBT_API_BASE}/api/v2/torrents/delete"
    data = {"hashes": info_hash, "deleteFiles": True}
    if DRY_RUN:
        logging.info("[dry-run] Would delete qBittorrent torrent and data %s", info_hash)
        return
    try:
        r = qb_sess.post(delete_url, data=data)
        # qBittorrent returns 200 even if the torrent doesn't exist, but let's check for errors
        if r.status_code == 200:
            logging.info("Deleted qB torrent %s (or it was already absent)", info_hash)
        else:
            logging.warning("Unexpected status deleting torrent %s: %s %s", info_hash, r.status_code, r.text)
    except requests.RequestException as e:
        logging.warning("Failed to delete torrent %s from qBittorrent: %s", info_hash, e)


def fetch_radarr_data_since(since_date=None):
    """Fetch Radarr history records since a specific date."""
    url = f"{RADARR_API_BASE}/api/v3/history/since"
    headers = {"X-Api-Key": RADARR_API_KEY, "Content-Type": "application/json"}
    params = {"includeMovie": "true"}

    if since_date:
        # Ensure date is in ISO format
        if isinstance(since_date, datetime):
            since_date = since_date.isoformat()
        params["date"] = since_date

    logging.info("Fetching Radarr history since %s", since_date or "beginning")
    r = requests.get(url, headers=headers, params=params)
    r.raise_for_status()
    new_records = r.json()

    # Load existing history data
    existing_data = load_json("radarr_history.json")
    existing_records = existing_data.get("records", []) if isinstance(existing_data, dict) else existing_data

    # Create set of existing record IDs to avoid duplicates
    existing_ids = {record.get("id") for record in existing_records if record.get("id")}

    # Filter out duplicates from new records
    unique_new_records = [record for record in new_records if record.get("id") not in existing_ids]

    # Combine records
    all_records = existing_records + unique_new_records

    # Save updated history data to JSON
    save_json("radarr_history.json", {
        "totalRecords": len(all_records),
        "lastUpdated": datetime.now().isoformat(),
        "sinceDate": since_date,
        "newRecordsAdded": len(unique_new_records),
        "records": all_records
    })

    logging.info("Added %d new records to Radarr history (total: %d)", len(unique_new_records), len(all_records))
    return new_records


def fetch_radarr_data():
    """Fetch all history records from Radarr with pagination."""
    all_records = []
    page = 1
    page_size = 200

    while True:
        url = f"{RADARR_API_BASE}/api/v3/history"
        headers = {"X-Api-Key": RADARR_API_KEY, "Content-Type": "application/json"}
        params = {
            "page": page,
            "pageSize": page_size,
            "includeMovie": "true"
        }

        logging.info("Fetching Radarr history page %d", page)
        r = requests.get(url, headers=headers, params=params)
        r.raise_for_status()
        data = r.json()

        records = data.get("records", [])
        all_records.extend(records)
        total_records = data.get("totalRecords", 0)
        current_count = len(all_records)

        logging.info("Retrieved %d records (total: %d)", current_count, total_records)

        # Check if we have all records
        if current_count >= total_records:
            break

        page += 1

    # Save all history data to JSON with timestamp for future updates
    current_time = datetime.now().isoformat()
    save_json("radarr_history.json", {
        "totalRecords": len(all_records),
        "fetchedAt": current_time,
        "lastUpdated": current_time,
        "records": all_records
    })

    logging.info("Fetched complete Radarr history: %d total records", len(all_records))
    return all_records


def save_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_json(filename):
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def find_movie_by_filename(radarr_data, filename):
    """Find a movie in Radarr data by matching filename patterns."""
    if not isinstance(radarr_data, dict) or "records" not in radarr_data:
        return None

    # Clean filename for comparison (remove path and extension)
    clean_filename = os.path.basename(filename).lower()
    if '.' in clean_filename:
        clean_filename = clean_filename.rsplit('.', 1)[0]

    for record in radarr_data["records"]:
        data = record.get("data", {})

        # Check sourceTitle
        source_title = record.get("sourceTitle", "").lower()
        if source_title and clean_filename in source_title:
            return {
                "id": record.get("movieId"),
                "sourceTitle": record.get("sourceTitle"),
                "matchType": "sourceTitle",
                "size": int(data.get("size", 0))
            }

        # Check droppedPath in data
        dropped_path = data.get("droppedPath", "").lower()
        if dropped_path:
            dropped_filename = os.path.basename(dropped_path)
            if '.' in dropped_filename:
                dropped_filename = dropped_filename.rsplit('.', 1)[0]
            if clean_filename in dropped_filename:
                return {
                    "id": record.get("movieId"),
                    "droppedPath": data.get("droppedPath"),
                    "matchType": "droppedPath",
                    "size": int(data.get("size", 0))
                }

        # Check importedPath in data
        imported_path = data.get("importedPath", "").lower()
        if imported_path:
            imported_filename = os.path.basename(imported_path)
            if '.' in imported_filename:
                imported_filename = imported_filename.rsplit('.', 1)[0]
            if clean_filename in imported_filename:
                return {
                    "id": record.get("movieId"),
                    "importedPath": data.get("importedPath"),
                    "matchType": "importedPath",
                    "size": int(data.get("size", 0))
                }

    return None


def main():
    logging.info("=== Starting unregistered-watch run ===")
    entries = fetch_unregistered()
    save_json("unregistered_list.json", entries)  # Save UR list

    # Load processed info_hashes from previous runs
    qb_processed = load_json("qbittorrent_processed.json")
    radarr_processed = load_json("radarr_processed.json")
    processed_hashes = {e["InfoHash"] for e in qb_processed}

    # Check if radarr history exists, fetch all or since last update
    radarr_history_file = "radarr_history.json"
    if os.path.exists(radarr_history_file):
        # Load existing data to get last fetch time
        existing_radarr_data = load_json(radarr_history_file)
        if isinstance(existing_radarr_data, dict) and ("fetchedAt" in existing_radarr_data or "lastUpdated" in existing_radarr_data):
            # Use lastUpdated if available, otherwise fetchedAt
            last_fetch = existing_radarr_data.get("lastUpdated") or existing_radarr_data.get("fetchedAt")
            logging.info("Found existing Radarr history, fetching since %s", last_fetch)
            fetch_radarr_data_since(last_fetch)
        else:
            logging.info("Existing Radarr history has no timestamp, fetching all data")
            fetch_radarr_data()
    else:
        logging.info("No existing Radarr history found, fetching all data")
        fetch_radarr_data()

    # Load the complete radarr history for filename matching
    radarr_history_data = load_json(radarr_history_file)

    if not entries:
        logging.info("No unregistered torrents found.")
        return

    new_qb_processed = []
    new_radarr_processed = []

    for entry in entries:
        info_hash = entry["InfoHash"].lower()
        group_id = entry["GroupID"]
        fileName = entry.get("FileName", "N/A")

        if info_hash in processed_hashes:
            logging.info("Skipping already processed UR torrent %s (group %s)", info_hash, group_id)
            continue

        logging.info("Handling UR torrent %s (group %s) (%s)", info_hash, group_id, fileName)

        # 1) Get torrent's largest file size
        size = get_largest_torrent_file_size(qb_sess, info_hash)
        logging.info("Largest file in torrent %s = %s bytes", info_hash, size)

        # 2) Try to find movie by filename in Radarr history first
        radarr_match = find_movie_by_filename(radarr_history_data, fileName)

        if radarr_match:
            logging.info("Found Radarr match for %s via %s: movieId=%s", fileName, radarr_match["matchType"], radarr_match["id"])
            movie = {"id": radarr_match["id"]}  # Create minimal movie object
            imdb_id = "matched_via_filename"  # Skip IMDb lookup
            disk_size = radarr_match["size"]  # Use size from history data
        else:
            # 2) Fetch IMDb ID from PTP group details (fallback)
            imdb_id = fetch_ptp_group_details(group_id)
            logging.info("Group %s → IMDb %s", group_id, imdb_id)

            if imdb_id:
                # 3) Check Radarr import
                movie = fetch_radarr_movie_by_imdb(imdb_id)
                if movie:
                    disk_size = movie.get("movieFile", {}).get("size", 0)
                else:
                    disk_size = 0
            else:
                movie = None
                disk_size = 0

        new_qb_processed.append({
            "InfoHash": info_hash,
            "GroupID": group_id,
            "LargestFileSize": size,
            "ImdbId": imdb_id,
            "FileName": fileName,
        })

        if movie:
            radarr_id = movie["id"]

            if radarr_match:
                logging.info("Radarr movie matched via filename (radarr_id=%s) at %s bytes", radarr_id, disk_size)
            else:
                logging.info("Radarr has movie %s (radarr_id=%s) at %s bytes", imdb_id, radarr_id, disk_size)

            # 4) If sizes match, force a quality downgrade
            if disk_size == size:
                movie_file_id = movie.get("movieFileId")
                if movie_file_id:
                    downgrade_radarr_quality(movie_file_id)

                # 5) Trigger Radarr search
                trigger_radarr_search(radarr_id)
            else:
                logging.info("Size mismatch (%s vs %s), triggering search anyway", disk_size, size)
                trigger_radarr_search(radarr_id)

            new_radarr_processed.append({
                "ImdbId": imdb_id,
                "RadarrId": radarr_id,
                "DiskSize": disk_size,
                "LargestFileSize": size,
                "Processed": disk_size == size,
                "MatchMethod": "filename" if radarr_match else "imdb"
            })
        else:
            logging.info("Movie %s not managed by Radarr", group_id)

        # 6) Delete torrent from qBittorrent
        delete_qbittorrent(info_hash)

        # 7) Pause to respect PTP rate limits
        if not radarr_match:
            logging.info("Sleeping 60s to respect API limits")
            time.sleep(60)
        else:
            logging.info("Skipping sleep - no PTP API calls made")

    # Append new processed entries to previous ones and save
    save_json("qbittorrent_processed.json", qb_processed + new_qb_processed)
    save_json("radarr_processed.json", radarr_processed + new_radarr_processed)

    logging.info("=== Run complete ===")


if __name__ == "__main__":
    qb_sess = qbittorrent_session()
    main()
