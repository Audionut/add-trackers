import qbittorrentapi
import asyncio
import os
import bencodepy
import hashlib
import shutil
import argparse
import re
import traceback
from pathlib import Path
from config import config


# Look for torrent files in the file_path directory
# and match them against the hashes in the qBittorrent client.
# If a match is found, prompt to delete the torrent from client, and optionally its files.
# Will also remove the .torent files from the file_path directory.
# Adds any deleted torrent's hash to a hashes.txt file in cross-seed blockList format.
# Additionally, it checks for torrents with the "cross-seed" tag and in 'stalledDL' or 'stoppedDL' state.

# Only tested on windows, your mileage may vary.
# You get to keep any broken pieces the script creates, for free.

# rename example-config.py to config.py and adjust the paths accordingly.

# add --brave to run in "brave mode" which automatically deletes torrents without prompts
# and updates a valid cross-seed config file with the deleted torrent's hash.


class Wait:

    def __init__(self, brave_mode=False):
        self.qbt_client = None
        self.hash_to_filename = {}
        self.brave_mode = brave_mode

    async def connect_qbittorrent(self):
        if self.qbt_client:
            return self.qbt_client

        default_torrent_client = config['DEFAULT']['default_torrent_client']
        client = config['TORRENT_CLIENTS'][default_torrent_client]

        qbt_client = qbittorrentapi.Client(
            host=client['qbit_url'],
            port=client['qbit_port'],
            username=client['qbit_user'],
            password=client['qbit_pass'],
            VERIFY_WEBUI_CERTIFICATE=client.get('VERIFY_WEBUI_CERTIFICATE', True)
        )

        try:
            await asyncio.to_thread(qbt_client.auth_log_in)
            self.qbt_client = qbt_client
            return qbt_client
        except qbittorrentapi.LoginFailed as e:
            raise Exception(f"[ERROR] qBittorrent login failed: {e}")

    async def get_v1_hash_from_torrent_file(self, torrent_path):
        """Extract v1 hash from torrent file"""
        try:
            with open(torrent_path, 'rb') as f:
                torrent_data = bencodepy.decode(f.read())

            info_dict = torrent_data[b'info']
            info_encoded = bencodepy.encode(info_dict)

            v1_hash = hashlib.sha1(info_encoded).hexdigest()
            return v1_hash
        except Exception as e:
            print(f"[ERROR] Failed to extract hash from {torrent_path}: {e}")
            return None

    async def get_torrent_files_from_directory(self):
        """Get all torrent files from the configured directory and extract their v1 hashes"""
        file_path = config["file_path"]
        if not os.path.exists(file_path):
            print(f"[WARNING] Directory {file_path} does not exist.")
            return []

        torrent_files = list(Path(file_path).glob("*.torrent"))
        if not torrent_files:
            print(f"[INFO] No torrent files found in {file_path}")
            return []

        torrent_hashes = []
        for torrent_file in torrent_files:
            v1_hash = await self.get_v1_hash_from_torrent_file(torrent_file)
            if v1_hash:
                self.hash_to_filename[v1_hash] = torrent_file.name

                torrent_hashes.append({
                    'file': torrent_file.name,
                    'hash': v1_hash
                })
                print(f"[INFO] Found torrent: {torrent_file.name} -> {v1_hash}")

        return torrent_hashes

    async def get_matching_torrents_from_client(self, target_hashes=None):
        """Get torrents from client that match criteria"""
        client = await self.connect_qbittorrent()
        if not client:
            print("[ERROR] Failed to connect to qBittorrent.")
            return []

        try:
            all_torrents = await asyncio.to_thread(client.torrents_info)
            matching_torrents = []

            for torrent in all_torrents:
                if "cross-seed" in torrent.tags and torrent.state in {'stalledDL', 'stoppedDL'}:
                    if target_hashes:
                        if torrent.hash in [t['hash'] for t in target_hashes]:
                            matching_torrents.append(torrent)
                            print(f"[MATCH] Found matching torrent: {torrent.name} ({torrent.hash}) - State: {torrent.state}")
                    else:
                        matching_torrents.append(torrent)

            return matching_torrents

        except Exception as e:
            print(f"[ERROR] Failed to get torrents from client: {e}")
            return []

    async def check_torrent_state(self, infohash):
        """Check a specific torrent's state (original method)"""
        client = await self.connect_qbittorrent()
        if not client:
            print("[ERROR] Failed to connect to qBittorrent.")
            return

        while True:
            try:
                torrents = await asyncio.to_thread(client.torrents_info, hashes=infohash)
                target_torrent = next((t for t in torrents if t.hash == infohash), None)

                if not target_torrent:
                    print(f"[ERROR] Torrent with hash {infohash} not found!")
                    break

                print(f"[DEBUG] Torrent {infohash} state: {target_torrent.state}")

                if target_torrent.state in {'stalledDL', 'stoppedDL'}:
                    print(f"[INFO] Torrent {infohash} wanted!")
                    return

                await asyncio.sleep(5)
            except Exception as e:
                print(f"[ERROR] Error checking torrent state: {e}")
                break

    async def update_cross_seed_config(self, torrent_hash):
        """Update cross-seed config blockList with torrent hash"""
        if not self.brave_mode:
            return

        cross_seed_config_path = config.get("cross_seed_config_path")
        if not cross_seed_config_path or not os.path.exists(cross_seed_config_path):
            print(f"[yellow]Cross-seed config path not found or invalid: {cross_seed_config_path}")
            return

        try:
            # Create backup of the config file
            backup_path = f"{cross_seed_config_path}.bak"
            try:
                shutil.copy2(cross_seed_config_path, backup_path)
                print(f"[cyan]Created backup: {backup_path}")
            except Exception as backup_error:
                print(f"[yellow]Warning: Failed to create backup: {backup_error}")
                return

            with open(cross_seed_config_path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_entry = f'"infoHash:{torrent_hash}",'
            blocklist_pattern = r'blockList:\s*\[(.*?)\]'
            match = re.search(blocklist_pattern, content, re.DOTALL)

            if match:
                current_list = match.group(1).strip()

                if current_list:
                    current_list = current_list.rstrip().rstrip(',')
                    new_blocklist = f"[\n\t\t{current_list},\n\t\t{new_entry}\n\t]"
                else:
                    new_blocklist = f"[\n\t\t{new_entry}\n\t]"

                new_content = re.sub(blocklist_pattern, f'blockList: {new_blocklist}', content, flags=re.DOTALL)
            else:
                config_end_pattern = r'(\w+:\s*[^,\n]+,?\s*)\n(\s*)(}|\);?)'

                if re.search(config_end_pattern, content):
                    new_blocklist_section = f'\n\tblockList: [\n\t\t{new_entry}\n\t],'
                    new_content = re.sub(
                        r'(\w+:\s*[^,\n]+,?\s*)\n(\s*)(}|\);?)',
                        r'\1' + new_blocklist_section + r'\n\2\3',
                        content
                    )
                else:
                    new_content = content + f'\n\nblockList: [\n\t{new_entry}\n]'
                    print("[yellow]Warning: Could not find proper insertion point, appended to end of file")

            with open(cross_seed_config_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            print(f"[green]Added hash to cross-seed config blockList: {torrent_hash}")

        except Exception as e:
            print(f"[bold red]Failed to update cross-seed config: {e}")
            # Try to restore from backup if it exists
            backup_path = f"{cross_seed_config_path}.bak"
            if os.path.exists(backup_path):
                try:
                    shutil.copy2(backup_path, cross_seed_config_path)
                    print("[yellow]Restored config from backup due to error")
                except Exception as restore_error:
                    print(f"[bold red]Failed to restore from backup: {restore_error}")
            print(f"[dim]{traceback.format_exc()}[/dim]")

    async def run(self):
        """Main method to run the complete process"""
        print("[INFO] Starting torrent monitoring...")
        if self.brave_mode:
            print("[WARNING] BRAVE MODE: Doing everything automatically without prompts!")
        client = await self.connect_qbittorrent()

        torrent_hashes = await self.get_torrent_files_from_directory()

        if torrent_hashes:
            print(f"[INFO] Found {len(torrent_hashes)} torrent files, looking for matches in client...")
            matching_torrents = await self.get_matching_torrents_from_client(torrent_hashes)
        else:
            print("[INFO] No torrent files found, checking all cross-seed torrents in client...")
            matching_torrents = await self.get_matching_torrents_from_client()

        if matching_torrents:
            print(f"[INFO] Found {len(matching_torrents)} matching torrents")

            for torrent in matching_torrents:
                print()
                print(f"[PROCESS] Processing torrent: {torrent.name}")
                print(f"  Hash: {torrent.hash}")
                print(f"  State: {torrent.state}")
                print(f"  Tags: {torrent.tags}")
                print(f"  Progress: {torrent.progress:.2%}")
                print(f"  Location: {torrent.content_path}")
                print()

                # In brave mode, automatically delete without prompts
                if self.brave_mode:
                    keep_files = False
                    print(f"[BRAVE] Auto-deleting torrent and files: {torrent.name}")
                else:
                    while True:
                        response = input("\nDelete this torrent? [y]es/[n]o/[s]kip all: ").strip().lower()
                        if response in ['y', 'yes']:
                            keep_files_response = input("Keep files on disk? [Y/n]: ").strip().lower()
                            keep_files = keep_files_response != 'n'
                            break
                        elif response in ['s', 'skip', 'skip all']:
                            continue
                        elif response in ['n', 'no']:
                            continue

                    # If user chose not to delete, skip to next torrent
                    if response not in ['y', 'yes']:
                        continue

                print(f"Deleting torrent: {torrent.name}")
                try:
                    await asyncio.to_thread(client.torrents_delete, delete_files=not keep_files, torrent_hashes=torrent.hash)

                    await asyncio.sleep(1)
                    remaining_torrents = await asyncio.to_thread(client.torrents_info, torrent_hashes=torrent.hash)

                    if remaining_torrents:
                        print("[yellow]Initial deletion attempt failed, trying alternative method...")
                        alt_hashes = [torrent.hash] if isinstance(torrent.hash, str) else torrent.hash
                        await asyncio.to_thread(client.torrents_delete, delete_files=not keep_files, torrent_hashes=alt_hashes)
                        await asyncio.sleep(1)
                        still_remaining = await asyncio.to_thread(client.torrents_info, torrent_hashes=torrent.hash)
                        if still_remaining:
                            print(f"[bold red]Failed to delete torrent: {torrent.name}")
                            print("[yellow]Try deleting it directly from the qBittorrent interface.")
                            continue
                        else:
                            print("[green]Torrent deleted successfully with alternative method")
                    else:
                        print("[green]Torrent deleted successfully")

                    if not keep_files and torrent.content_path and os.path.exists(torrent.content_path):
                        print("[yellow]Warning: Files still exist on disk after deletion.")
                        print(f"[yellow]Path: {torrent.content_path}")

                        # In brave mode, automatically attempt manual deletion
                        if self.brave_mode or input("Attempt to manually delete files? [y/N]: ").strip().lower() == 'y':
                            try:
                                if os.path.isdir(torrent.content_path):
                                    shutil.rmtree(torrent.content_path)
                                else:
                                    os.remove(torrent.content_path)
                                print("[green]Files deleted successfully")
                            except Exception as e:
                                print(f"[bold red]Failed to delete files: {str(e)}")

                    # Delete .torrent file
                    if torrent.hash in self.hash_to_filename:
                        torrent_file_path = os.path.join(config["file_path"], self.hash_to_filename[torrent.hash])
                        if os.path.exists(torrent_file_path):
                            try:
                                os.remove(torrent_file_path)
                                print(f"[green]Deleted .torrent file: {torrent_file_path}")
                            except Exception as e:
                                print(f"[bold red]Failed to delete .torrent file: {e}")
                        else:
                            print(f"[yellow]Torrent file not found: {torrent_file_path}")
                    else:
                        print(f"[yellow]No filename mapping found for hash: {torrent.hash}")

                    # Write hash to blocklist file
                    try:
                        with open(config["hashes_path"], "a", encoding="utf-8") as hashfile:
                            hashfile.write(f'"infoHash:{torrent.hash}",\n')
                        print(f"[cyan]Wrote hash to {config['hashes_path']}")
                    except Exception as e:
                        print(f"[bold red]Failed to write hash to file: {e}")

                    # Update cross-seed config
                    await self.update_cross_seed_config(torrent.hash)

                except Exception as e:
                    print(f"[bold red]Error during deletion: {str(e)}")
                    import traceback
                    print(f"[dim]{traceback.format_exc()}[/dim]")
        else:
            print("[INFO] No matching torrents found")


async def main():
    """Entry point"""
    parser = argparse.ArgumentParser(description='Cross-seed torrent cleanup helper')
    parser.add_argument('--brave', action='store_true',
                        help='Automatically delete torrents and files without prompts')

    args = parser.parse_args()

    try:
        wait_instance = Wait(brave_mode=args.brave)
        await wait_instance.run()
    except Exception as e:
        print(f"[ERROR] Application error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
