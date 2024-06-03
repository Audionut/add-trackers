// ==UserScript==
// @name         PTP - Add releases from other trackers
// @namespace    https://github.com/Audionut/add-trackers
// @version      3.6.3-A
// @description  Add releases from other trackers
// @author       passthepopcorn_cc (edited by Perilune + Audionut)
// @match        https://passthepopcorn.me/torrents.php?id=*
// @match        *://passthepopcorn.me/*threadid=44047*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-add-filter-all-releases-anut.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-add-filter-all-releases-anut.js
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// ==/UserScript==

(function () {
    "use strict";

    const fields = {
        "aither": {"label": "Aither *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "aither_api": {"label": "AITHER_API_TOKEN", "type": "text", "default": ""},
        "avistaz": {"label": "Avistaz", "type": "checkbox", "default": false},
        "ant": {"label": "ANT", "type": "checkbox", "default": false},
        "bhd": {"label": "BHD *", "type": "checkbox", "default": false, "tooltip": "Enter API and RSS key below"},
        "bhd_api": {"label": "BHD_API_TOKEN", "type": "text", "default": ""},
        "bhd_rss": {"label": "BHD_RSS_KEY", "type": "text", "default": ""},
        "blu": {"label": "BLU *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "blu_api": {"label": "BLU_API_TOKEN", "type": "text", "default": ""},
        "btn": {"label": "BTN *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "btn_api": {"label": "BTN_API_TOKEN", "type": "text", "default": ""},
        "cg": {"label": "CG", "type": "checkbox", "default": false},
        "cinemaz": {"label": "CinemaZ", "type": "checkbox", "default": false},
        "fl": {"label": "FL", "type": "checkbox", "default": false},
        "hdb": {"label": "HDB *", "type": "checkbox", "default": false, "tooltip": "Enter username and passkey below"},
        "hdb_user": {"label": "HDB_USER_NAME *", "type": "text", "default": "", "tooltip": "Requires 2fa enabled at HDB"},
        "hdb_pass": {"label": "HDB_PASS_KEY *", "type": "text", "default": "", "tooltip": "passkey from your HDB profile page"},
        "huno": {"label": "HUNO *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "huno_api": {"label": "HUNO_API_TOKEN", "type": "text", "default": ""},
        "kg": {"label": "KG", "type": "checkbox", "default": false},
        "mtv": {"label": "MTV *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "mtv_api": {"label": "MTV_API_TOKEN", "type": "text", "default": ""},
        "nbl": {"label": "NBL *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "nbl_api": {"label": "NBL_API_TOKEN", "type": "text", "default": ""},
        "oe": {"label": "OE *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "oe_api": {"label": "OE_API_TOKEN", "type": "text", "default": ""},
        "phd": {"label": "PHD", "type": "checkbox", "default": false},
        "ptp": {"label": "PTP", "type": "checkbox", "default": true},
        "pxhd": {"label": "PxHD", "type": "checkbox", "default": false},
        "rfx": {"label": "RFX *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "rfx_api": {"label": "RFX_API_TOKEN", "type": "text", "default": ""},
        "rtf": {"label": "RTF", "type": "checkbox", "default": false},
        "tik": {"label": "TIK *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "tik_api": {"label": "TIK_API_TOKEN", "type": "text", "default": ""},
        "tvv": {"label": "TVV *", "type": "checkbox", "default": false, "tooltip": "Enter auth key & torrent pass below"},
        "tvv_auth": {"label": "TVV_AUTH_KEY", "type": "text", "default": "", "tooltip": "Find from a torrent download link at TVV"},
        "tvv_torr": {"label": "TVV_TORR_PASS", "type": "text", "default": "", "tooltip": "Needed to access TVV xml output"},
        "show_icon": {"label": "Show Tracker Icon", "type": "checkbox", "default": true, "tooltip": "Display the tracker icon next to releases"},
        "show_name": {"label": "Show Tracker Name", "type": "checkbox", "default": true, "tooltip": "Display the tracker name next to releases"},
        "hide_same_size": {"label": "Hide torrents with same size", "type": "checkbox", "default": false, "tooltip": "Hide torrents that have the same file size as existing ones"},
        "log_same_size": {"label": "Log torrents with same size", "type": "checkbox", "default": false, "tooltip": "Log torrents that have the same file size as existing ones"},
        "hide_filters": {"label": "Hide filters box", "type": "checkbox", "default": false, "tooltip": "Hide the Filter Releases box in the UI"},
        "hide_dead": {"label": "Hide dead external torrents", "type": "checkbox", "default": false, "tooltip": "Hide torrents that have no seeders"},
        "new_tab": {"label": "Open in new tab", "type": "checkbox", "default": true, "tooltip": "Open links in a new browser tab"},
        "hide_tags": {"label": "Hide tags", "type": "checkbox", "default": false, "tooltip": "Hide tags such as Featured, DU, reported, etc."},
        "run_default": {"label": "Run by default?", "type": "checkbox", "default": true, "tooltip": "Run this script by default on page load, else click Other Trackers under title to run the script"},
        "ptp_name": {"label": "Show release name", "type": "checkbox", "default": true, "tooltip": "Display the PTP release (file) name instead of the default display"},
        "funky_tags": {"label": "Improved Tags", "type": "checkbox", "default": false, "tooltip": "Work with jmxd' PTP Improved Tags script"},
        "tracker_by_default": {"label": "Only these sites by default", "type": "text", "default": "", "tooltip": "Show only these sites by default. Comma separated. PTP, BHD, ANT, etc"},
        "res_by_default": {"label": "Only these resolutions by default", "type": "text", "default": "", "tooltip": "Show only these resolutions by default. Comma separated, with valued values. SD, 480p, 576p, 720p, 1080p, 2160p"},
        "hideBlankLinks": {"label": "How to display download link", "type": "select", "options": ["DL", "Download", "Spaced"], "default": "DL", "tooltip": "Choose how to display the download links: DL (original method), DOWNLOAD, or Spaced. Other methods help with some stylesheets."},
        "cache_tracker_icons": {"label": "Cache tracker icons (weeks)", "type": "int", "default": 4, "tooltip": "Set the duration for caching tracker icons, in weeks"},
        "timer": {"label": "Error timeout (seconds)", "type": "int", "default": 4, "tooltip": "Set the error timeout duration in seconds to skip slow/dead trackers"},
        "timerDuration": {"label": "Error display duration (seconds)", "type": "int", "default": 2, "tooltip": "Set the duration for displaying errors in seconds"}
    };

    function resetToDefaults() {
        // Add a confirmation popup
        if (confirm("Are you sure you want to reset all settings to their default values?")) {
            // Reset each field to its default value
            for (const field in fields) {
                if (fields.hasOwnProperty(field)) {
                    GM_config.set(field, fields[field].default);
                }
            }
            GM_config.save();
            alert("All settings have been reset to their default values.");
            GM_config.close();
            GM_config.open();
       }
   }

    // Toggle the visibility of api fields if they've been enabled or disabled
    function toggleAuthFields(key, isAuthEnabled) {
        const multi_auth = {
            "bhd": ["bhd_api", "bhd_rss"],
            "hdb": ["hdb_user", "hdb_pass"],
            "tvv": ["tvv_auth", "tvv_torr"]
        };

        if (key in multi_auth) {
            multi_auth[key].forEach(subKey => toggleAuthFields(subKey, isAuthEnabled));
            return;
        }

        const allKeys = Object.values(multi_auth).flat();
        const fieldName = allKeys.includes(key) ? key : `${key}_api`;

        if (GM_config.fields[fieldName]) {
            GM_config.fields[fieldName].wrapper.style.display = isAuthEnabled ? '' : 'none';
        } else {
            console.error(`Field ${fieldName} does not exist in GM_config.fields`);
        }
    }

    GM_config.init({
        "id": "PTPAddReleases",
        "title": "<div>Add releases from other trackers<br><small style='font-weight:normal;'>Select trackers you have access too</small></div>",
        "fields": fields,
        "css": `
            #PTPAddReleases {background: #333333; margin: 0; padding: 20px 20px}
            #PTPAddReleases .field_label {color: #fff; width: 100%;}
            #PTPAddReleases .config_header {color: #fff; padding-bottom: 10px; font-weight: 100;}
            #PTPAddReleases .reset {color: #e8d3d3; text-decoration: none;}
            #PTPAddReleases .config_var {display: flex; flex-direction: row; text-align: left; justify-content: center; align-items: center; width: 85%; margin: 4px auto; padding: 4px 0; border-bottom: 1px solid #7470703d;}
            #PTPAddReleases_buttons_holder {display: grid; gap: 10px; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; width:85%; height: 100px; margin: 0 auto; text-align: center; align-items: center;}
            #PTPAddReleases_saveBtn {grid-column:1; grid-row:1; cursor: pointer;}
            #PTPAddReleases_closeBtn {grid-column:3; grid-row:1; cursor: pointer;}
            #PTPAddReleases .reset_holder {grid-column:2; grid-row:2}
            #PTPAddReleases .config_var input[type="checkbox"] {cursor: pointer;}
        `,
        "events": {
            "open": function (doc) {
                let style = this.frame.style;
                style.width = "500px";
                style.height = "800px";
                style.inset = "";
                style.top = "6%";
                style.right = "6%";
                style.borderRadius = "5px";
                console.log("Config window opened");

                // Add tooltips
                for (const field in fields) {
                    if (fields.hasOwnProperty(field) && fields[field].tooltip) {
                        let label = doc.querySelector(`label[for="PTPAddReleases_field_${field}"]`);
                        if (label) {
                            label.title = fields[field].tooltip;
                        }
                    }
                }
                // Nodes that require API keys
                const api_based_nodes = {
                    "aither": GM_config.fields.aither.node,
                    "bhd": GM_config.fields.bhd.node,
                    "blu": GM_config.fields.blu.node,
                    "btn": GM_config.fields.btn.node,
                    "hdb": GM_config.fields.hdb.node,
                    "mtv": GM_config.fields.mtv.node,
                    "nbl": GM_config.fields.nbl.node,
                    "huno": GM_config.fields.huno.node,
                    "oe": GM_config.fields.oe.node,
                    "rfx": GM_config.fields.rfx.node,
                    "tik": GM_config.fields.tik.node,
                    "tvv": GM_config.fields.tvv.node
                }

                // Add event listeners for trackers with auth
                for (const [key, value] of Object.entries(api_based_nodes)) {
                    toggleAuthFields(key, value.checked);
                    value.addEventListener('change', function () {
                        toggleAuthFields(key, value.checked);
                    });
                }
            },
            "save": function () {
                alert("Saved Successfully!");
                console.log("Settings saved");
            },
            "close": function () {
                console.log("Config window closed, reloading page");
                if (this.frame) {
                    window.location.reload();
                } else {
                    setTimeout(() => {
                        window.location.reload();
                    }, 250);
                }
            }
        }
    });

    // Register menu command
    GM.registerMenuCommand("PTP - Add releases from other trackers", () => {
        console.log("Menu command clicked");
        GM_config.open();
    });

    if (window.location.href.includes('/torrents.php?id=')) {

    const show_only_by_default = GM_config.get("tracker_by_default").split(',').map(t => t.trim()).filter(Boolean); // Ensure it's an array and remove empty values
    const show_resolution_by_default = GM_config.get("res_by_default").split(',').map(t => t.trim()).filter(Boolean); // Ensure it's an array and remove empty values

    // Function to get trackers from the configuration
    function getTrackersFromConfig() {
        const movie_dict = {
            "BHD": GM_config.get("bhd"),
            "FL": GM_config.get("fl"),
            "HDB": GM_config.get("hdb"),
            "KG": GM_config.get("kg"),
            "PTP": GM_config.get("ptp"),
            "PxHD": GM_config.get("pxhd"),
            "MTV": GM_config.get("mtv"),
            "BLU": GM_config.get("blu"),
            "HUNO": GM_config.get("huno"),
            "TIK": GM_config.get("tik"),
            "Aither": GM_config.get("aither"),
            "RFX": GM_config.get("rfx"),
            "OE": GM_config.get("oe"),
            "AvistaZ": GM_config.get("avistaz"),
            "CinemaZ": GM_config.get("cinemaz"),
            "PHD": GM_config.get("phd"),
            "RTF": GM_config.get("rtf"),
        };

        const movie_only_dict = {
            "ANT": GM_config.get("ant"),
            "CG": GM_config.get("cg"),
        };

        const tv_dict = {
            "BTN": GM_config.get("btn"),
            "NBL": GM_config.get("nbl"),
            "TVV": GM_config.get("tvv"),
        };

        const old_dict = {
            "TVV": GM_config.get("tvv")
        };

        const very_old_dict = {
            "RTF": GM_config.get("rtf")
        };

        return {
            movie_dict,
            movie_only_dict,
            tv_dict,
            old_dict,
            very_old_dict
        };
    }

    // Filter trackers by default setting
    function filterTrackersByDefault(trackers) {
        return trackers.filter(tracker => show_only_by_default.includes(tracker));
    }

    // Fill trackers arrays with enabled trackers
    function fillTrackers(dict, trackerArray) {
        for (const [key, value] of Object.entries(dict)) {
            if (value) {
                trackerArray.push(key);
            }
        }
    }

    // Get trackers from the configuration
    const { movie_dict, movie_only_dict, tv_dict, old_dict, very_old_dict } = getTrackersFromConfig();

    const movie_trackers = [];
    const movie_only_trackers = [];
    const tv_trackers = [];
    const old_trackers = [];
    const very_old_trackers = [];

    // Fill trackers arrays
    fillTrackers(movie_dict, movie_trackers);
    fillTrackers(movie_only_dict, movie_only_trackers);
    fillTrackers(tv_dict, tv_trackers);
    fillTrackers(old_dict, old_trackers);
    fillTrackers(very_old_dict, very_old_trackers);

    // Apply default filters
    const filtered_movie_trackers = filterTrackersByDefault(movie_trackers);
    const filtered_movie_only_trackers = filterTrackersByDefault(movie_only_trackers);
    const filtered_tv_trackers = filterTrackersByDefault(tv_trackers);
    const filtered_old_trackers = filterTrackersByDefault(old_trackers);
    const filtered_very_old_trackers = filterTrackersByDefault(very_old_trackers);

        const BLU_API_TOKEN = GM_config.get("blu_api"); // if you want to use BLU - find your api key here: https://blutopia.cc/users/YOUR_USERNAME_HERE/apikeys
        const TIK_API_TOKEN = GM_config.get("tik_api"); // if you want to use TIK - find your api key here: https://cinematik.net/users/YOUR_USERNAME_HERE/apikeys
        const AITHER_API_TOKEN = GM_config.get("aither_api"); // if you want to use Aither - find your api key here: https:/aither.cc/users/YOUR_USERNAME_HERE/apikeys
        const HUNO_API_TOKEN = GM_config.get("huno_api"); // if you want to use HUNO - find your api key here: https://hawke.uno/users/YOUR_USERNAME_HERE/settings/security#api
        const RFX_API_TOKEN = GM_config.get("rfx_api"); // if you want to use RFX - find your api key here: https:/reelflix.xyz/users/YOUR_USERNAME_HERE/apikeys
        const OE_API_TOKEN = GM_config.get("oe_api"); /// if you want to use OE - find your api key here: https:/onlyencodes.cc/users/YOUR_USERNAME_HERE/apikeys
        const BHD_API_TOKEN = GM_config.get("bhd_api");
        const BHD_RSS_KEY = GM_config.get("bhd_rss");
        const HDB_USER_NAME = GM_config.get("hdb_user");
        const HDB_PASS_KEY = GM_config.get("hdb_pass");
        const NBL_API_TOKEN = GM_config.get("nbl_api");
        const BTN_API_TOKEN = GM_config.get("btn_api");
        const MTV_API_TOKEN = GM_config.get("mtv_api");

        // We need to use XML resposne with TVV and have to define some parameters for it to work correctly.
        const TVV_AUTH_KEY = GM_config.get("tvv_auth"); // If you want to use TVV - find your authkey from a torrent download link
        const TVV_TORR_PASS = GM_config.get("tvv_torr"); // We also need the torrent pass - find your torrent_pass from a torrent download link

        const hideBlankLinks = GM_config.get("hideBlankLinks");
        const show_tracker_icon = GM_config.get("show_icon"); // false = will show default green checked icon ||| true = will show tracker logo instead of checked icon
        const show_tracker_name = GM_config.get("show_name"); // false = will hide tracker name ||| true = will show tracker name
        const hide_if_torrent_with_same_size_exists = GM_config.get("hide_same_size"); // true = will hide torrents with the same file size as existing PTP ones
        const log_torrents_with_same_size = GM_config.get("log_same_size"); // true = will log torrents with the same file size as existing PTP ones in console (F12)
        const hide_filters_div = GM_config.get("hide_filters"); // false = will show filters box ||| true = will hide filters box
        const hide_dead_external_torrents = GM_config.get("hide_dead"); // true = won't display dead external torrents
        const open_in_new_tab = GM_config.get("new_tab"); // false : when you click external torrent, it will open the page in new tab. ||| true : it will replace current tab.
        let hide_tags = GM_config.get("hide_tags"); // true = will hide all of the tags. Featured, DU, reported, etc.
        const run_by_default = GM_config.get("run_default"); // false = won't run the script by default, but will add an "Other Trackers" link under the page title, which when clicked will run the script.
        const timer = GM_config.get("timer") * 1000; // Convert to milliseconds
        const timerDuration = GM_config.get("timerDuration") * 1000; // Convert to milliseconds
        let ptp_release_name = GM_config.get("ptp_name"); // true = show release name - false = original PTP release style. Ignored if Improved Tags  = true
        let improved_tags = GM_config.get("funky_tags"); // true = Change display to work fully with PTP Improved Tags from jmxd.

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // This handles Miniseries pages.
        const isMiniSeriesFromSpan = Array.from(document.querySelectorAll("span.basic-movie-list__torrent-edition__main"))
            .some(el => el.textContent.trim() === "Miniseries");
        // This handles text parsing of Collections to capture some more content we can later use.
        const detailsCollections = document.querySelector("#detailsCollections");
        const listItems = detailsCollections ? detailsCollections.querySelectorAll("ul.list--unstyled li") : null;
        const isMiniSeriesFromList = listItems ? Array.from(listItems).some(li => {
            const text = li.textContent.toLowerCase().trim(); // Trim to remove any leading/trailing whitespace
            // Use regular expressions with word boundaries to ensure whole word matching
            const hasMiniseries = /\bminiseries\b/.test(text);
            const hasTV = /\btv\b/.test(text);
            const hasTelevision = /\btelevision\b/.test(text);
            // Regex to match the string starting with "films based on television programs" followed by anything else.
           // const skip1 = /^films based on television programs\b.*/i.test(text);

            //if (skip1) {
            //    return false; // Return false to skip adding if the exact skip text is found
            //}

            return hasMiniseries || hasTV || hasTelevision;
        }) : false;
        // Combine both handle methods above.
        const isMiniSeries = isMiniSeriesFromSpan || isMiniSeriesFromList;
        // Find the year of the content.
        const pageTitleElement = document.querySelector(".page__title");
        const pageTitleText = pageTitleElement ? pageTitleElement.textContent : "";
        const matches = pageTitleText.match(/\[(\d{4})\]/);
        const year = matches ? parseInt(matches[1], 10) : null;
        // Start the array with the list of movie trackers.
        let trackers = movie_trackers.slice();
        let excludedTrackers = [];

        // Add movie-only trackers when not at a PTP miniseries page.
        if (!isMiniSeriesFromSpan) {
            trackers = trackers.concat(movie_only_trackers);
        } else {
            movie_only_trackers.forEach(tracker => {
                // else exclude the movie only trackers from the array with reason.
                excludedTrackers.push({ tracker: tracker, reason: 'Not classified as a Feature Film' });
            });
        }
        const selectedTVTrackers = ["TVV", "BTN"]; // Trackers defined here also contain TV movies and the like.

        // Add TV trackers if it is a PTP miniseries page, but skip selected TV Trackers handling for now.
        if (isMiniSeriesFromSpan) {
            trackers = trackers.concat(tv_trackers.filter(tracker => !selectedTVTrackers.includes(tracker)));
        } else {
            tv_trackers.forEach(tracker => {
                if (!selectedTVTrackers.includes(tracker)) {
                    excludedTrackers.push({ tracker: tracker, reason: 'Not classified as a Miniseries' });
                }
            });
        }

        // This also captures TV movies and the like from Collections. Add selected TV Trackers.
        if (isMiniSeries) {
            // Filter selectedTVTrackers to only include those that are also in tv_trackers
            const validSelectedTVTrackers = selectedTVTrackers.filter(tracker => tv_trackers.includes(tracker));

            // Only add trackers from validSelectedTVTrackers if they are not already in the trackers array
            validSelectedTVTrackers.forEach(tracker => {
                if (!trackers.includes(tracker)) {
                    trackers.push(tracker);
                }
            });
        } else {
            selectedTVTrackers.forEach(tracker => {
                if (tv_trackers.includes(tracker)) {
                    excludedTrackers.push({ tracker: tracker, reason: 'Not classified as a Miniseries' });
                }
            });
        }
        if (year && (year < 2014 || year > 2100)) {
            very_old_trackers.forEach(tracker => {
                if (!trackers.includes(tracker)) {
                    trackers.push(tracker);
                }
            });
        } else {
            const initialTrackers = [...trackers]; // Make a copy to compare later
            trackers = trackers.filter(tracker => !very_old_trackers.includes(tracker));

            initialTrackers.forEach(tracker => {
                if (!trackers.includes(tracker)) {
                    excludedTrackers.push({ tracker, reason: `Excluded by year range check (Year: ${year})` });
                }
            });
        }

        // Remove old trackers from the included trackers array if the content matches the year range.
        if (year && (year < 2019 || year > 2100)) {
            if (isMiniSeries) {
                old_trackers.forEach(tracker => {
                    if (!trackers.includes(tracker)) {
                        trackers.push(tracker);
                    }
                });
            }
        } else {
            const initialTrackers = [...trackers]; // Make a copy to compare later
            trackers = trackers.filter(tracker => !old_trackers.includes(tracker));

            initialTrackers.forEach(tracker => {
                if (!trackers.includes(tracker)) {
                    excludedTrackers.push({ tracker, reason: `Excluded by year range check (Year: ${year})` });
                }
            });
        }

        console.log("Active trackers:", trackers);
        console.log("Excluded trackers:", excludedTrackers.map(e => `${e.tracker} - ${e.reason}`));

        let discounts = ["Freeleech", "75% Freeleech", "50% Freeleech", "40% Bonus", "30% Bonus", "25% Freeleech", "Copper", "Bronze", "Silver", "Golden", "Refundable", "Rewind", "Rescuable", "Pollination", "None"];
        let qualities = ["SD", "480p", "576p", "720p", "1080p", "2160p"];
        let filters = {
            "trackers": trackers.map((e) => {
                return ({ "name": e, "status": "default" });
            }),

            "discounts": discounts.map((e) => {
                return ({ "name": e, "status": "default" });
            }),

            "qualities": qualities.map((e) => {
                return ({ "name": e, "status": "default" });
            }),
        };
        let doms = [];
        const TIMEOUT_DURATION = 10000;

        const dom_get_quality = (text) => {
            if (text.includes("720p")) return "720p";
            else if (text.includes("1080p")) return "1080p";
            else if (text.includes("2160p")) return "2160p";
            else if (text.includes("576p")) return "576p";
            else if (text.includes("480p")) return "480p";
            else return "SD";
        };

        const get_default_doms = () => {
            [...document.querySelectorAll("tr.group_torrent_header")].forEach((d, i) => {
                let tracker = "PTP";
                let dom_path = d;
                let quality = dom_get_quality(d.textContent);
                let discount = "None";
                let releaseName = d.closest('tr.group_torrent_header');
                let groupName = d.closest('tr.group_torrent_header');
                let info_text = releaseName.dataset.releasename;
                let group_id = groupName.dataset.releasegroup;
                let seeders = parseInt(d.querySelector("td:nth-child(4)").textContent.replace(",", ""));
                let leechers = parseInt(d.querySelector("td:nth-child(5)").textContent.replace(",", ""));
                let snatchers = parseInt(d.querySelector("td:nth-child(3)").textContent.replace(",", ""));
                let size = d.querySelector("td:nth-child(2)").textContent.trim();

                if (size.includes("TiB")) {
                    size = (parseFloat(size.split(" ")[0]) * 1048576).toFixed(2); // Convert TiB to MiB
                } else if (size.includes("GiB")) {
                    size = (parseFloat(size.split(" ")[0]) * 1024).toFixed(2); // Convert GiB to MiB
                } else if (size.includes("MiB")) {
                    size = parseFloat(size.split(" ")[0]).toFixed(2); // Directly use the MiB value
                } else {
                    size = 1; // Default case when no size unit is provided
                }

                let dom_id = "ptp_" + i;

                d.className += " " + dom_id;

                doms.push({ tracker, dom_path, quality, discount, group_id, info_text, seeders, leechers, snatchers, dom_id, size });
            });
        };

        get_default_doms();

        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

        const get_discount_text = (div, tracker) => {
            if (["BLU", "Aither", "RFX", "OE", "TIK", "HUNO"].includes(tracker)) {
                return true;
            }
            else if (tracker === "FL") {
                if ([...div.querySelectorAll("img")].find(e => e.alt === "FreeLeech") != undefined) return "Freeleech";
            }
            else if (tracker === "ANT") {
                const pollenLabel = div.querySelector(".torrent_table#torrent_details .torrent_label.tooltip.tl_pollen");
                const freeLabel = div.querySelector(".torrent_table#torrent_details .torrent_label.tooltip.tl_free");
                const personalFree = div.querySelector(".torrent_table#torrent_details .torrent_label.tooltip.tl_free.tl_personal");

                let label;

                if (pollenLabel !== null) {
                    const labelText = pollenLabel.textContent.trim();
                    let pollenText = labelText.split("Pollination")[1].trim();
                    // Remove the exclamation mark if it appears after "Pollination"
                    if (pollenText.charAt(0) === '!') {
                        pollenText = pollenText.substring(1);
                    }
                    // Extract time value from pollenText
                    const pollenTime = pollenText.match(/\(([^)]+)\)/)[1];
                    // Remove brackets from pollenText
                    pollenText = pollenText.replace(/\(([^)]+)\)/, "").trim();
                    label = "Pollination";
                } else if (personalFree !== null) {
                    label = "Personal Freeleech";
                } else if (freeLabel !== null) {
                    const labelText = freeLabel.textContent.trim();
                    const freeTime = labelText.match(/\(([^)]+)\)/)[1];
                    const freeText = labelText.replace(/\(([^)]+)\)/, "").trim();
                    label = "Freeleech";
                }

                return label !== undefined ? label : "None";
            }
            else if (tracker === "CG") {
                if ([...div.querySelectorAll("img")].find(e => e.alt === "100% bonus")) return "Freeleech";
                else if ([...div.querySelectorAll("img")].find(e => e.alt === "30% bonus")) return "30% Bonus";
                else if ([...div.querySelectorAll("img")].find(e => e.alt === "40% bonus")) return "40% Bonus";
            }
            else if (["AvistaZ", "CinemaZ", "PHD"].includes(tracker)) {
                const icons = div.querySelectorAll(".torrent-file > div > i");
                if (icons.length > 0) {
                    let discount = "";
                    let text;
                    for (let [i, icon] of icons.entries()) {
                        if (icon.title === "Free Download") {
                            text = "Freeleech";
                        } else if (icon.title === "Half Download") {
                            text = "50% Freeleech";
                        } else if (icon.title === "Double upload") {
                            text = "Double Upload";
                        } else {
                            text = icon.title;
                        }
                        discount += text + (icons.length > 0 && i < icons.length - 1 ? " / " : "");
                    }
                    return text;
                }
            }
            return "None";
        };

        const get_tracker_icon = (tracker) => {
            const cacheDurationInWeeks = GM_config.get("cache_tracker_icons"); // Retrieve the cache duration in weeks
            const cacheDurationInMilliseconds = cacheDurationInWeeks * 7 * 24 * 60 * 60 * 1000; // Convert weeks to milliseconds
            const currentTime = new Date().getTime(); // Current timestamp in milliseconds

            // First, try to retrieve the cached URL and timestamp from localStorage
            const cachedData = localStorage.getItem(tracker + "_icon_data");
            if (cachedData) {
                const { iconURL, timestamp } = JSON.parse(cachedData);
                if (currentTime - timestamp < cacheDurationInMilliseconds) {
                    return iconURL; // Use cached data if within cache duration
                }
            }

            // Define the URLs if not found in cache or data is old
            const icons = {
                "BHD": "https://beyond-hd.me/favicon.ico",
                "BLU": "https://blutopia.cc/favicon.ico",
                "Aither": "https://aither.cc/favicon.ico",
                "RFX": "https://reelflix.xyz/favicon.ico",
                "OE": "https://onlyencodes.cc/favicon.ico",
                "CG": "https://cinemageddon.net/favicon.ico",
                "FL": "https://filelist.io/favicon.ico",
                "AvistaZ": "https://avistaz.to/images/avistaz-favicon.png",
                "PHD": "https://privatehd.to/images/privatehd-favicon.png",
                "CinemaZ": "https://cinemaz.to/images/cinemaz-favicon.png",
                "HDB": "https://hdbits.org/pic/favicon/favicon.ico",
                "PxHD": "https://pixelhd.me/favicon.ico",
                "KG": "https://karagarga.in/favicon.ico",
                "TIK": "https://cinematik.net/favicon.ico",
                "MTV": "https://www.morethantv.me/favicon.ico",
                "ANT": "https://anthelion.me/favicon.ico",
                "HUNO": "https://hawke.uno/favicon.ico",
                "BTN": "https://broadcasthe.net/favicon.ico",
                "TVV": "https://tv-vault.me/favicon.ico",
                "NBL": "https://nebulance.io/favicon.ico",
                "RTF": "https://retroflix.club/favicon.ico"
            };

            // Get the URL from the icons object
            const iconURL = icons[tracker];
            if (iconURL) {
                // Cache the URL and the current timestamp in localStorage
                const dataToStore = JSON.stringify({ iconURL, timestamp: currentTime });
                localStorage.setItem(tracker + "_icon_data", dataToStore);
                console.log("Updating cache for:", tracker);
            }

            return iconURL;
        };

        const use_api_instead = (tracker) => {
            if (
                (tracker === "BLU") ||
                (tracker === "Aither") ||
                (tracker === "RFX") ||
                (tracker === "OE") ||
                (tracker === "HUNO") ||
                (tracker === "TIK")
            )
                return true;
            else return false;
        };

        const use_post_instead = (tracker) => {
            if (
              (tracker === "BHD") ||
              (tracker === "HDB") ||
              (tracker === "NBL") ||
              (tracker === "BTN")
              ) {
                return true;
            } else {
                return false;
            }
        };

        const goodGroups = () => {
            return [
                "D-Z0N3",
                "Tigole QxR",
                "FraMeSToR",
                "HONE",
                "TAoE",
                "Silence QxR",
                "0xC0",
                "r00t QxR",
                "AI-Raws"
                //"ExampleText3"
            ];
        };

        const badGroups = () => {
            return [
                "NOGRP"
                //"ExampleText2",
                //"ExampleText3"
            ];
        };

        const get_torrent_objs = async (tracker, html) => {
            const get_dvd_type = (size) => {
                const sizeInGB = size / 1024; // Convert size from MiB to GB
                if (sizeInGB <= 4.7) {
                    return "DVD5";
                } else if (sizeInGB <= 8.5) {
                    return "DVD9";
                } else {
                    return "DVDSET";
                }
            };

            const get_bd_type = (size) => {
                const sizeInGB = size / 1024; // Convert size from MiB to GB
                if (sizeInGB <= 25) {
                    return "BD25";
                } else if (sizeInGB <= 50) {
                    return "BD50";
                } else if (sizeInGB <= 66) {
                    return "BD66";
                } else if (sizeInGB <= 100) {
                    return "BD100";
                } else {
                    return "BDSET";
                }
            };
            let torrent_objs = [];
            if (tracker === "TVV") {
                try {
                    // Process the XML document
                    const torrents = html.querySelectorAll('torrent');
                    torrents.forEach(torrent => {
                        let torrent_obj = {};

                        const documentTitle = torrent.querySelector('title').textContent;
                        if (documentTitle.includes("Extras") || documentTitle.includes("Episode")) {
                            return; // Skip further processing for this torrent
                        }

                        const sizeElement = torrent.querySelector('size[type="formatted"]');
                        if (sizeElement) {
                            const sizeText = sizeElement.textContent;
                            let sizeInMiB;

                            if (sizeText.includes(" TB")) {
                                sizeInMiB = parseFloat(sizeText.split(" TB")[0]) * 1024 * 1024; // Convert TB to MiB
                            } else if (sizeText.includes(" GB")) {
                                sizeInMiB = parseFloat(sizeText.split(" GB")[0]) * 1024; // Convert GB to MiB
                            } else if (sizeText.includes(" MB")) {
                                sizeInMiB = parseFloat(sizeText.split(" MB")[0]); // MB is already in MiB
                            } else {
                                console.error("Unknown size unit.");
                                return;
                            }

                            torrent_obj.size = parseInt(sizeInMiB);
                        } else {
                            console.error("Missing size information.");
                            return;
                        }
                        const bytesElement = torrent.querySelector('size[type="bytes"]');
                        if (bytesElement) {
                            torrent_obj.api_size = parseInt(bytesElement.textContent);
                        } else {
                            console.error("Missing TVV bytes information");
                            return;
                        }

                        const combinedInfo = torrent.querySelector('torrentinfo[type="combined"]');
                        if (combinedInfo) {
                            let infoText = combinedInfo.textContent.replace(/\/?Freeleech\/?/g, "").replace(/\//g, " ");

                            if (improved_tags) {
                                infoText = infoText.replace("VOB IFO", "VOB");
                                if (documentTitle.includes("(720p)")) {
                                    infoText += " 720p";
                                }
                                if (documentTitle.includes("(1080p)")) {
                                    infoText += " 1080p";
                                }
                                if (documentTitle.includes("(2160p)")) {
                                    infoText += " 2160p";
                                }
                                // Always append "Special Edition" if present
                                if (documentTitle.includes("(Special Edition)")) {
                                    infoText += " (Special Edition)";
                                }
                                if (infoText.includes("VOB") && torrent_obj.size) {
                                    const dvdType = get_dvd_type(torrent_obj.size, documentTitle);
                                    infoText = `${dvdType} ${infoText}`;
                                } else if (infoText.includes("m2ts") && torrent_obj.size) {
                                    const bdType = get_bd_type(torrent_obj.size, documentTitle);
                                    infoText = `${bdType} ${infoText}`;
                                }
                            } else {
                                // Remove "Freeleech" and any surrounding forward slashes
                                infoText = combinedInfo.textContent.replace(/\/?Freeleech\/?/g, "").replace(/\//g, " / ");
                                // Append resolution tags if necessary
                                if (documentTitle.includes("(720p)")) {
                                    infoText += " / 720p";
                                }
                                if (documentTitle.includes("(1080p)")) {
                                    infoText += " / 1080p";
                                }
                                if (documentTitle.includes("(2160p)")) {
                                    infoText += " / 2160p";
                                }
                                if (documentTitle.includes("(Special Edition)")) {
                                    infoText += " / (Special Edition)";
                                }
                            }

                            torrent_obj.info_text = infoText;
                        } else {
                            console.error("Missing combined torrent info.");
                            return; // Skip this torrent if critical information is missing
                        }

                        const base_url = "https://tv-vault.me/torrents.php?action=download&id=";
                        let id = torrent.getAttribute('id'); // Extract the id attribute
                        if (id) {
                            const downloadUrl = `${base_url}${id}&authkey=${TVV_AUTH_KEY}&torrent_pass=${TVV_TORR_PASS}`;
                            torrent_obj.download_link = downloadUrl;
                        } else {
                            console.error("Missing torrent ID.");
                            return; // Skip this torrent if ID is missing
                        }

                        torrent_obj.snatch = parseInt(torrent.querySelector('snatches')?.textContent || "0");
                        torrent_obj.seed = parseInt(torrent.querySelector('seeders')?.textContent || "0");
                        torrent_obj.leech = parseInt(torrent.querySelector('leechers')?.textContent || "0");

                        const linkElement = torrent.querySelector('link');
                        if (linkElement) {
                            torrent_obj.torrent_page = linkElement.textContent;
                        } else {
                            console.error("Missing link information.");
                            return; // Skip this torrent if link is missing
                        }

                        torrent_obj.site = "TVV";
                        const discountTVVFind = torrent.querySelector('torrentinfo[type="freeleech"]');
                        if (discountTVVFind) {
                            torrent_obj.discount = discountTVVFind.textContent.includes("Freeleech") ? "Freeleech" : "None";
                        } else {
                            torrent_obj.discount = "None";
                        }

                        torrent_objs.push(torrent_obj);
                    });
                } catch (error) {
                    console.error("Error processing XML from TVV:", error);
                }
            }
            else if (tracker === "MTV") {
                try {
                    const torrents = html.querySelectorAll('item');

                    torrents.forEach(torrent => {
                        let torrent_obj = {};

                        const documentTitle = torrent.querySelector('title')?.textContent;
                        if (!documentTitle) {
                            console.error("Missing title information.");
                            return; // Skip this torrent if title information is missing
                        }
                        let infoText = documentTitle;
                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            torrent_obj.datasetRelease = documentTitle;
                            const isInternal = infoText.includes("-hallowed") || infoText.includes("-TEPES") || infoText.includes("-E.N.D") || infoText.includes("-WDYM");
                            torrent_obj.internal = isInternal ? true : false;

                            const sizeElement = torrent.querySelector('size');
                            if (sizeElement) {
                                const sizeValue = sizeElement.textContent;
                                torrent_obj.size = parseInt(parseFloat(sizeValue) / (1024 * 1024)); // Convert size from bytes to MB
                                torrent_obj.api_size = parseInt(sizeValue);
                            } else {
                                console.error("Missing size information.");
                                return; // Skip this torrent if size information is missing
                            }
                            let groupText = "";
                            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                            const badGroupsList = badGroups(); // Get the list of bad group names
                            let matchedGroup = null;
                            let badGroupFound = false;

                            // Check for bad groups
                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                    groupText = ""; // Set groupText to an empty string
                                    break;
                                }
                            }

                            if (!badGroupFound) {
                                // Check for good groups if no bad group was found
                                for (const group of groups) {
                                    if (infoText.includes(group)) {
                                        matchedGroup = group;
                                        break;
                                    }
                                }

                                if (matchedGroup) {
                                    groupText = matchedGroup;
                                    if (improved_tags) {
                                        infoText = infoText.replace(groupText, '').trim();
                                    }
                                } else {
                                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                    if (match) {
                                        groupText = match[1]; // Use match[1] to get the capturing group
                                        groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                        if (improved_tags) {
                                            infoText = infoText.replace(`-${match[1]}`, '').trim();
                                        }
                                    }
                                }
                            }
                            torrent_obj.groupId = groupText;

                                let cleanTheText = infoText;
                                const replaceFullStops = (text) => {

                                    const placeholders = new Map();
                                    let tempText = text;

                                    const keepPatterns = [
                                        /\b\d\.\d\b/g,
                                        /\bDD\d\.\d\b/g,
                                        /\bDDP\d\.\d\b/g,
                                        /\bDD\+\d\.\d\b/g,
                                        /\bTrueHD \d\.\d\b/g,
                                        /\bDTS\d\.\d\b/g,
                                        /\bAC3\d\.\d\b/g,
                                        /\bAAC\d\.\d\b/g,
                                        /\bOPUS\d\.\d\b/g,
                                        /\bMP3\d\.\d\b/g,
                                        /\bFLAC\d\.\d\b/g,
                                        /\bLPCM\d\.\d\b/g,
                                        /\bH\.264\b/g,
                                        /\bH\.265\b/g,
                                        /\bDTS-HD MA \d\.\d\b/g,
                                        /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                    ];

                                    keepPatterns.forEach((pattern, index) => {
                                        tempText = tempText.replace(pattern, (match) => {
                                            const placeholder = `__PLACEHOLDER${index}__`;
                                            placeholders.set(placeholder, match);
                                            return placeholder;
                                        });
                                    });

                                    // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                    tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                    tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                    tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                    tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                    placeholders.forEach((original, placeholder) => {
                                        tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                    });

                                    tempText = tempText
                                        .replace(/DD\+/g, 'DD+ ')
                                        .replace(/DDP/g, 'DD+ ')
                                        .replace(/DoVi/g, 'DV')
                                        .replace(/\(/g, '')
                                        .replace(/\)/g, '')
                                        .replace(/\bhdr\b/g, 'HDR')
                                        .replace(/\bweb\b/g, 'WEB')
                                        .replace(/\bbluray\b/gi, 'BluRay')
                                        .replace(/\bh254\b/g, 'H.264')
                                        .replace(/\bh265\b/g, 'H.265')
                                        .replace(/\b\w/g, char => char.toUpperCase())
                                        .replace(/\bX264\b/g, 'x264')
                                        .replace(/\bX265\b/g, 'x265')
                                        .replace(/\b - \b/g, ' ');

                                    return tempText;
                                };
                            let formatted = replaceFullStops(cleanTheText);
                            let files = parseInt(torrent.querySelector('files').textContent);

                            if (formatted.includes("BluRay") && torrent_obj.size && files > 10) {
                                const bdType = get_bd_type(torrent_obj.size);
                                formatted = `${bdType} ${formatted}`;
                            }

                            torrent_obj.info_text = formatted;

                            const linkElement = torrent.querySelector('link');
                            if (linkElement) {
                                torrent_obj.download_link = linkElement.textContent;
                            } else {
                                console.error("Missing download link.");
                                return;
                            }

                            torrent_obj.snatch = parseInt(torrent.querySelector('attr[name="grabs"]')?.getAttribute('value') || "0");
                            torrent_obj.seed = parseInt(torrent.querySelector('attr[name="seeders"]')?.getAttribute('value') || "0");
                            torrent_obj.leech = parseInt(torrent.querySelector('attr[name="leechers"]')?.getAttribute('value') || "0");

                            const commentsElement = torrent.querySelector('comments');
                            if (commentsElement) {
                                torrent_obj.torrent_page = commentsElement.textContent;
                            } else {
                                console.error("Missing comments link.");
                                return;
                            }

                            torrent_obj.site = "MTV";
                            const discountTVVFind = torrent.querySelector('torznab\\:attr[name="downloadvolumefactor"]');
                            if (discountTVVFind) {
                                torrent_obj.discount = discountTVVFind.getAttribute('value') === "0" ? "Freeleech" : "None";
                            } else {
                                torrent_obj.discount = "None";
                            }

                            torrent_objs.push(torrent_obj);
                        };
                    });
                } catch (error) {
                    console.error("Error processing XML from MTV:", error);
                }
            }
            else if (tracker === "ANT") {
                const rows = html.querySelector(".torrent_table#torrent_details > tbody").querySelectorAll("tr:not(.colhead_dark):not(.sortGroup)");
                rows.forEach((d, index) => {
                    let torrent_obj = {};
                    let size = null;
                    const tdElements = d.querySelectorAll("td");
                    if (tdElements.length >= 2) {
                        size = tdElements[1].textContent.trim();
                        if (size.includes("TiB")) {
                            // 1 TiB = 1024 GiB = 1024 * 1024 MiB
                            size = parseInt(parseFloat(size.split("TiB")[0]) * 1024 * 1024);
                        } else if (size.includes("GiB")) {
                            // 1 GiB = 1024 MiB
                            size = parseInt(parseFloat(size.split("GiB")[0]) * 1024);
                        } else if (size.includes("MiB")) {
                            size = parseInt(parseFloat(size.split("MiB")[0]));
                        }
                    }
                    // didn't just find the PL link. Did things the hard way instead.
                    let torrentId = null;
                    // pulled the torrent ID from this element
                    const hrefElement = d.querySelector('a[data-toggle-target^="#torrent_"]');
                    if (hrefElement) {
                        const hrefValue = hrefElement.getAttribute('data-toggle-target');
                        // remove everything except the actual ID number
                        const match = hrefValue.match(/#torrent_(\d+)/);
                        if (match) {
                            torrentId = match[1];
                        }
                    }
                    // define a base URL to work with my hacky torrent ID searching.
                    const baseUrl = 'https://anthelion.me/torrents.php?';

                    if (torrentId !== null) {
                        // add the elements together to create the link.
                        const torrentPageUrl = `${baseUrl}torrentid=${torrentId}`;
                        torrent_obj.size = size;

                        const nextRow = rows[index + 1];
                        if (nextRow) {
                            let antname = nextRow.querySelector('.row > td').textContent.trim();
                            torrent_obj.datasetRelease = antname;
                            let mediaInfo = nextRow.querySelector('.mediainfo > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td:nth-child(2)').textContent.trim();
                            if (improved_tags) {
                                const titleElement = d.querySelector("td:nth-child(1) > a");
                                if (titleElement) {
                                    let infoTextParts = [];
                                    const titleText = Array.from(titleElement.childNodes)
                                        .filter(node => node.nodeType === Node.TEXT_NODE)
                                        .map(node => node.textContent.trim())
                                        .join('')
                                        .replace(/\/+/g, '/') // Replace multiple slashes with a single slash
                                        .replace(/\/$/, '');  // Remove the trailing slash if present
                                    if (titleText) {
                                        infoTextParts.push(titleText);
                                    }
                                    let groupText = "";
                                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                                    const badGroupsList = badGroups(); // Get the list of bad group names
                                    let matchedGroup = null;
                                    let badGroupFound = false;

                                    // Check for bad groups
                                    for (const badGroup of badGroupsList) {
                                        if (infoTextParts.includes(badGroup)) {
                                            badGroupFound = true;
                                            infoTextParts = infoTextParts.replace(badGroup, '').trim(); // Remove the bad group text
                                            groupText = ""; // Set groupText to an empty string
                                            break;
                                        }
                                    }

                                    if (!badGroupFound) {
                                        // Check for good groups if no bad group was found
                                        for (const group of groups) {
                                            if (infoTextParts.includes(group)) {
                                                matchedGroup = group;
                                                break;
                                            }
                                        }

                                        if (matchedGroup) {
                                            groupText = matchedGroup;
                                            if (improved_tags) {
                                                infoTextParts = infoTextParts.replace(groupText, '').trim();
                                            }
                                        } else {
                                            const match = infoTextParts.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                            if (match) {
                                                groupText = match[1]; // Use match[1] to get the capturing group
                                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                                if (improved_tags) {
                                                    infoTextParts = infoTextParts.replace(`-${match[1]}`, '').trim();
                                                }
                                            }
                                        }
                                    }
                                    torrent_obj.groupId = groupText;
                                    const strongElements = titleElement.querySelectorAll("strong.torrent_label");
                                    strongElements.forEach((strong, index) => {
                                        const text = strong.textContent.trim();
                                        if (strong.classList.contains("tl_notice")) {
                                            infoTextParts.push(text);
                                        }
                                    });
                                    let formattedText = infoTextParts.join(' / ')
                                        .replace(/\/+/g, '/')
                                        .replace(/\s*\/\s*/g, ' / ');
                                    if (formattedText.includes("Blu-ray") && torrent_obj.size) {
                                        const bdType = get_bd_type(torrent_obj.size);
                                        formattedText = `${bdType} ${formattedText}`;
                                    }
                                    if (mediaInfo.includes("HDR10+")) {
                                        formattedText = formattedText.replace("HDR10", "HDR10+");
                                    }
                                    torrent_obj.info_text = formattedText;
                                }
                            } else {
                                if (!(antname.includes(".mkv") || antname.includes(".mpg") || antname.includes(".avi") || antname.includes(".mp4"))) {
                                    const titleElement = d.querySelector("td:nth-child(1) > a");
                                    if (titleElement) {
                                        let infoTextParts = [];
                                        const titleText = Array.from(titleElement.childNodes)
                                            .filter(node => node.nodeType === Node.TEXT_NODE)
                                            .map(node => node.textContent.trim())
                                            .join('');
                                        if (titleText) {
                                            infoTextParts.push(titleText);
                                        }
                                        const strongElements = titleElement.querySelectorAll("strong.torrent_label");
                                        // more than 1 strong element.
                                        strongElements.forEach((strong, index) => {
                                            const text = strong.textContent.trim();
                                            // make sure they are the correct strong element.
                                            if (strong.classList.contains("tl_notice")) {
                                                infoTextParts.push(text);
                                            }
                                        });
                                        let otherText = infoTextParts.join(' / ')
                                            .replace(/\/+/g, '/')
                                            .replace(/\s*\/\s*/g, ' / ');
                                        torrent_obj.info_text = otherText;
                                        torrent_obj.datasetRelease = otherText;
                                    }
                                } else {
                                    torrent_obj.datasetRelease = antname;
                                    antname = antname.replace(/\.[^.]*$/, "").replace(/\./g, " ");
                                    torrent_obj.info_text = antname;
                                }
                            }
                            torrent_obj.site = "ANT";
                            torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("torrents.php?action=") && !a.href.includes("&usetoken=1")).href.replace("passthepopcorn.me", "anthelion.me");
                            torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(3)").textContent);
                            torrent_obj.seed = parseInt(d.querySelector("td:nth-child(4)").textContent);
                            torrent_obj.leech = parseInt(d.querySelector("td:nth-child(5)").textContent);
                            torrent_obj.torrent_page = torrentPageUrl;
                            torrent_obj.discount = get_discount_text(d, tracker);
                            const elements = d.querySelectorAll('strong.torrent_label.tl_seeding.tooltip');
                            torrent_obj.status = elements.length > 0 ? 'seeding' : 'default';
                            torrent_obj.internal = d.querySelector('strong.torrent_label.tooltip.internal') ? true : false;
                            torrent_obj.trumpable = d.querySelector(".torrent_table#torrent_details .torrent_label.tl_trumpable.tooltip") ? true : false;
                            torrent_obj.reported = d.querySelector(".torrent_table#torrent_details .torrent_label.tl_reported.tooltip") ? true : false;
                            torrent_objs.push(torrent_obj);
                        }
                    }
                });
            }
            else if (tracker === "FL") {
                html.querySelectorAll(".torrentrow").forEach((d) => {
                    let torrent_obj = {};
                    let size = [...d.querySelectorAll("font")].find((d) => {
                        return (d.textContent.includes("[") === false) && (d.textContent.includes("TB") || d.textContent.includes("GB") || d.textContent.includes("MB"));
                    }).textContent;

                    if (size.includes("TB")) {
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024); // Convert TiB to MiB
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // Convert GB to MiB
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    }

                    torrent_obj.size = size;
                    let releaseName = [...d.querySelectorAll("a")].find(a => a.href.includes("details.php?id=")).title;
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                    const badGroupsList = badGroups(); // Get the list of bad group names
                    let matchedGroup = null;
                    let badGroupFound = false;

                    // Check for bad groups
                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                            groupText = ""; // Set groupText to an empty string
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        // Check for good groups if no bad group was found
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                            if (match) {
                                groupText = match[1]; // Use match[1] to get the capturing group
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }
                    torrent_obj.info_text = releaseName.replace(/\./g, " ");
                    torrent_obj.groupId = groupText;
                    torrent_obj.site = "FL";
                    torrent_obj.snatch = parseInt(d.querySelector("div:nth-child(8)").textContent.replace(/,/g, ""));
                    torrent_obj.seed = parseInt(d.querySelector("div:nth-child(9)").textContent.replace(/,/g, ""));
                    torrent_obj.leech = parseInt(d.querySelector("div:nth-child(10)").textContent.replace(/,/g, ""));
                    torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("download.php?id=")).href.replace("passthepopcorn.me", "filelist.io");
                    torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "filelist.io");
                    torrent_obj.status = "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_objs.push(torrent_obj);
                });
            }
            else if (tracker === "CG") {
                let ar1 = [...html.querySelectorAll("tr.prim")];
                let ar2 = [...html.querySelectorAll("tr.sec")];
                let ar3 = [...html.querySelectorAll("tr.torrenttable_usersnatched")];
                let ar4 = [...html.querySelectorAll("tr.torrenttable_bumped")];

                let combined_arr = ar1.concat(ar2).concat(ar3).concat(ar4);

                combined_arr.forEach((d) => {
                    let torrent_obj = {};

                    let size = d.querySelector("td:nth-child(5)").textContent;

                    if (size.includes("TB")) {
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024); // Convert TiB to MiB
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // Convert GB to MiB
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    }
                    else size = 1; // must be kiloBytes, so lets assume 1mb.

                    torrent_obj.size = size;
                    let releaseName = d.querySelectorAll("td")[1].querySelector("b").textContent.trim();
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                    const badGroupsList = badGroups(); // Get the list of bad group names
                    let matchedGroup = null;
                    let badGroupFound = false;

                    // Check for bad groups
                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                            groupText = ""; // Set groupText to an empty string
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        // Check for good groups if no bad group was found
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/-(?![^(]*[()[]])[a-zA-Z]([a-zA-Z0-9]*$|[^-]*\([^()]*\)[^-]*)/);
                            if (match) {
                                groupText = match[1]; // Use match[1] to get the capturing group
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }
                    torrent_obj.info_text = releaseName;
                    torrent_obj.groupId = groupText;
                    torrent_obj.site = "CG";
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(6)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(7)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(8)").textContent);
                    torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("download.php?id=")).href.replace("passthepopcorn.me", "cinemageddon.net");
                    torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "cinemageddon.net");
                    torrent_obj.status = d.className.includes("torrenttable_usersnatched") ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_objs.push(torrent_obj);
                });
            }
            else if (tracker === "KG") {
                html.querySelector("#browse > tbody").querySelectorAll("tr").forEach((d) => {
                    try {
                        let torrent_obj = {};
                        let size = d.querySelector("td:nth-child(11)").textContent.replace(",", "");

                        if (size.includes("TB")) {
                            size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024); // Convert TiB to MiB
                        } else if (size.includes("GB")) {
                            size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // Convert GB to MiB
                        } else if (size.includes("MB")) {
                            size = parseInt(parseFloat(size.split("MB")[0]));
                        }
                        else size = 1; // must be kiloBytes, so lets assume 1mb.

                        const images = d.querySelectorAll("[style='position:absolute;top:0px; left:0px'] > img");
                        torrent_obj.quality = Array.from(images).some(img => img.title.includes("HD")) ? "HD" : "SD";
                        torrent_obj.size = size;
                        let releaseName = d.querySelectorAll("td")[1].querySelector("a").textContent.trim();
                        torrent_obj.datasetRelease = releaseName;
                        let groupText = "";
                        const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                        const badGroupsList = badGroups(); // Get the list of bad group names
                        let matchedGroup = null;
                        let badGroupFound = false;

                        // Check for bad groups
                        for (const badGroup of badGroupsList) {
                            if (releaseName.includes(badGroup)) {
                                badGroupFound = true;
                                releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                                groupText = ""; // Set groupText to an empty string
                                break;
                            }
                        }

                        if (!badGroupFound) {
                            // Check for good groups if no bad group was found
                            for (const group of groups) {
                                if (releaseName.includes(group)) {
                                    matchedGroup = group;
                                    break;
                                }
                            }

                            if (matchedGroup) {
                                groupText = matchedGroup;
                                if (improved_tags) {
                                    releaseName = releaseName.replace(groupText, '').trim();
                                }
                            } else {
                                const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                if (match) {
                                    groupText = match[1]; // Use match[1] to get the capturing group
                                    groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                    if (improved_tags) {
                                        releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                    }
                                }
                            }
                        }
                        torrent_obj.info_text = releaseName;
                        torrent_obj.groupId = groupText;
                        torrent_obj.site = "KG";
                        torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(12)").textContent);
                        torrent_obj.seed = parseInt(d.querySelector("td:nth-child(13)").textContent);
                        torrent_obj.leech = parseInt(d.querySelector("td:nth-child(14)").textContent);
                        torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("/down.php/")).href.replace("passthepopcorn.me", "karagarga.in");
                        torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "karagarga.in");
                        torrent_obj.status = d.className.includes("snatchedrow") ? "seeding" : "default";
                        torrent_obj.discount = get_discount_text(d, tracker);
                        torrent_objs.push(torrent_obj);
                    } catch (e) {
                        console.error("An error has occurred: ", e);
                    }
                });
            }
            else if (tracker === "AvistaZ") {
                // requires another request to get to the torrents
                const groupUrl = html.querySelector("h3.movie-title > a").href;
                const groupId = groupUrl.match(/\/movie\/(\d+)-/)[1];
                const url = `https://avistaz.to/movies/torrents/${groupId}?quality=all`;
                const result = await fetch_url(url);

                result.querySelectorAll("tbody > tr").forEach(d => {
                    let torrent_obj = {};
                    let size = d.querySelector("td:nth-child(5)").textContent.trim().replace(",", "");

                    if (size.includes("TB")) {
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024); // Convert TiB to MiB
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // Convert GB to MiB
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    }
                    else size = 1;

                    const torrentLink = d.querySelector(".torrent-file > div > a");
                    torrent_obj.size = size;
                    let releaseName = torrentLink.textContent.trim();
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                    const badGroupsList = badGroups(); // Get the list of bad group names
                    let matchedGroup = null;
                    let badGroupFound = false;

                    // Check for bad groups
                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                            groupText = ""; // Set groupText to an empty string
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        // Check for good groups if no bad group was found
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                            if (match) {
                                groupText = match[1]; // Use match[1] to get the capturing group
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }
                    torrent_obj.info_text = releaseName;
                    torrent_obj.groupId = groupText;
                    torrent_obj.site = "AvistaZ";
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(8)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(6)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(7)").textContent);
                    torrent_obj.download_link = d.querySelector(".torrent-download-icon").href.replace("passthepopcorn.me", "avistaz.to");
                    torrent_obj.torrent_page = torrentLink.href.replace("passthepopcorn.me", "avistaz.to");
                    torrent_obj.status = d.className.includes("success") ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_objs.push(torrent_obj);
                });
            }
            else if (tracker === "CinemaZ") {
                // requires another request to get to the torrents
                const groupUrl = html.querySelector("h3.movie-title > a").href;
                const groupId = groupUrl.match(/\/movie\/(\d+)-/)[1];
                const url = `https://cinemaz.to/movies/torrents/${groupId}?quality=all`;
                const result = await fetch_url(url);

                result.querySelectorAll("tbody > tr").forEach(d => {
                    let torrent_obj = {};
                    let size = d.querySelector("td:nth-child(5)").textContent.trim().replace(",", "");

                    if (size.includes("TB")) {
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024); // Convert TiB to MiB
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // Convert GB to MiB
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    }
                    else size = 1;

                    const torrentLink = d.querySelector(".torrent-file > div > a");
                    torrent_obj.size = size;
                    let releaseName = torrentLink.textContent.trim();
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                    const badGroupsList = badGroups(); // Get the list of bad group names
                    let matchedGroup = null;
                    let badGroupFound = false;

                    // Check for bad groups
                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                            groupText = ""; // Set groupText to an empty string
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        // Check for good groups if no bad group was found
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                            if (match) {
                                groupText = match[1]; // Use match[1] to get the capturing group
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }
                    torrent_obj.info_text = releaseName;
                    torrent_obj.groupId = groupText;
                    torrent_obj.site = "CinemaZ";
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(8)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(6)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(7)").textContent);
                    torrent_obj.download_link = d.querySelector(".torrent-download-icon").href.replace("passthepopcorn.me", "cinemaz.to");
                    torrent_obj.torrent_page = torrentLink.href.replace("passthepopcorn.me", "cinemaz.to");
                    torrent_obj.status = d.className.includes("success") ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_objs.push(torrent_obj);
                });
            }
            else if (tracker === "PHD") {
                // requires another request to get to the torrents
                const groupUrl = html.querySelector("h3.movie-title > a").href;
                const groupId = groupUrl.match(/\/movie\/(\d+)-/)[1];
                const url = `https://privatehd.to/movies/torrents/${groupId}?quality=all`;
                const result = await fetch_url(url);

                result.querySelectorAll("tbody > tr").forEach(d => {
                    let torrent_obj = {};
                    let size = d.querySelector("td:nth-child(5)").textContent.trim().replace(",", "");

                    if (size.includes("TB")) {
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024); // Convert TiB to MiB
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // Convert GB to MiB
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    }
                    else size = 1;

                    const torrentLink = d.querySelector(".torrent-file > div > a");
                    torrent_obj.size = size;
                    let releaseName = torrentLink.textContent.trim();
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                    const badGroupsList = badGroups(); // Get the list of bad group names
                    let matchedGroup = null;
                    let badGroupFound = false;

                    // Check for bad groups
                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                            groupText = ""; // Set groupText to an empty string
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        // Check for good groups if no bad group was found
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                            if (match) {
                                groupText = match[1]; // Use match[1] to get the capturing group
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }
                    torrent_obj.info_text = releaseName;
                    torrent_obj.groupId = groupText;
                    torrent_obj.site = "PHD";
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(8)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(6)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(7)").textContent);
                    torrent_obj.download_link = d.querySelector(".torrent-download-icon").href.replace("passthepopcorn.me", "privatehd.to");
                    torrent_obj.torrent_page = torrentLink.href.replace("passthepopcorn.me", "privatehd.to");
                    torrent_obj.status = d.className.includes("success") ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_objs.push(torrent_obj);
                });
            }
            else if (tracker === "PxHD") {
                let currentEdition = null;

                html.querySelectorAll("tr.group_torrent").forEach((item) => {
                    // Get the edition info for the current item
                    let editionInfoElement = item.querySelector('.edition_info');
                    let edition = editionInfoElement ? editionInfoElement.textContent.replace(/\n/g, "") : null;

                    // If edition is not found, use the current edition
                    if (!edition) {
                        edition = currentEdition;

                        let sizeText = item.querySelector("td:nth-child(4)").textContent.trim();
                        let size = 0;
                        if (sizeText.includes("TB")) {
                            size = parseInt(parseFloat(sizeText.split("TB")[0]) * 1024 * 1024); // Convert TB to MB
                        } else if (sizeText.includes("GB")) {
                            size = parseInt(parseFloat(sizeText.split("GB")[0]) * 1024); // Convert GB to MB
                        } else if (sizeText.includes("MB")) {
                            size = parseInt(parseFloat(sizeText.split("MB")[0]));
                        }

                        let releaseNameElement = item.querySelector("td:nth-child(1) > a");
                        let releaseName = releaseNameElement ? releaseNameElement.textContent.trim() : "";
                        let groupText = "";
                        const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                        const badGroupsList = badGroups(); // Get the list of bad group names
                        let matchedGroup = null;
                        let badGroupFound = false;

                        // Check for bad groups
                        for (const badGroup of badGroupsList) {
                            if (releaseName.includes(badGroup)) {
                                badGroupFound = true;
                                releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                                groupText = ""; // Set groupText to an empty string
                                break;
                            }
                        }

                        if (!badGroupFound) {
                            // Check for good groups if no bad group was found
                            for (const group of groups) {
                                if (releaseName.includes(group)) {
                                    matchedGroup = group;
                                    break;
                                }
                            }

                            if (matchedGroup) {
                                groupText = matchedGroup;
                                if (improved_tags) {
                                    releaseName = releaseName.replace(groupText, '').trim();
                                }
                            } else {
                                const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                if (match) {
                                    groupText = match[1]; // Use match[1] to get the capturing group
                                    groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                    if (improved_tags) {
                                        releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                    }
                                }
                            }
                        }

                        let downloadLinkElement = item.querySelector("td:nth-child(1) > span > a");
                        let torrentPageElement = item.querySelector("td:nth-child(1) > a");
                        let torrent_obj = {
                            edition: currentEdition,
                            size: size,
                            datasetRelease: releaseName,
                            info_text: `${releaseName.replace(/\n/g, "")} / ${edition}`,
                            groupId: groupText,
                            site: "PxHD",
                            download_link: downloadLinkElement ? downloadLinkElement.href.replace("passthepopcorn.me", "pixelhd.me") : "",
                            snatch: parseInt(item.querySelector("td:nth-child(6)").textContent),
                            seed: parseInt(item.querySelector("td:nth-child(7)").textContent),
                            leech: parseInt(item.querySelector("td:nth-child(8)").textContent),
                            torrent_page: torrentPageElement ? torrentPageElement.href.replace("passthepopcorn.me", "pixelhd.me") : "",
                            status: item.querySelectorAll("span.tag_seeding").length > 0 ? "seeding" : "default",
                            discount: "None",
                            internal: false,
                            exclusive: false,
                        };
                        torrent_objs.push(torrent_obj);
                    } else {
                        // Update the current edition
                        currentEdition = edition;
                    }
                });
            }
            else if (tracker === "RTF") {
                const rows = html.querySelectorAll("div.row.pt-2.pb-2");

                rows.forEach((d) => {

                    let torrent_obj = {};
                    let sizeText = "";
                    d.querySelectorAll("div.col-4.col-xl-2.text-center").forEach((sizeElement) => {
                        let textContent = sizeElement.textContent.trim();
                        if (textContent.includes("TB") || textContent.includes("GB") || textContent.includes("MB")) {
                            sizeText = textContent;
                        }
                    });

                    let size = 0;
                    if (sizeText.includes("TB")) {
                        size = parseInt(parseFloat(sizeText.split("TB")[0]) * 1024 * 1024); // Convert TB to MB
                    } else if (sizeText.includes("GB")) {
                        size = parseInt(parseFloat(sizeText.split("GB")[0]) * 1024); // Convert GB to MB
                    } else if (sizeText.includes("MB")) {
                        size = parseInt(parseFloat(sizeText.split("MB")[0]));
                    }

                    torrent_obj.size = size;

                    let releaseName = d.querySelector("div.col-md-8.col-xl-8 a.font-weight-bold")?.textContent.trim() || "";

                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                    const badGroupsList = badGroups(); // Get the list of bad group names
                    let matchedGroup = null;
                    let badGroupFound = false;

                    // Check for bad groups
                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                            groupText = ""; // Set groupText to an empty string
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        // Check for good groups if no bad group was found
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                            if (match) {
                                groupText = match[1]; // Use match[1] to get the capturing group
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }
                    torrent_obj.groupId = groupText;

                            let cleanTheText = releaseName;
                            const replaceFullStops = (text) => {

                                const placeholders = new Map();
                                let tempText = text;

                                const keepPatterns = [
                                    /\b\d\.\d\b/g,
                                    /\bDD\d\.\d\b/g,
                                    /\bDDP\d\.\d\b/g,
                                    /\bDD\+\d\.\d\b/g,
                                    /\bTrueHD \d\.\d\b/g,
                                    /\bDTS\d\.\d\b/g,
                                    /\bAC3\d\.\d\b/g,
                                    /\bAAC\d\.\d\b/g,
                                    /\bOPUS\d\.\d\b/g,
                                    /\bMP3\d\.\d\b/g,
                                    /\bFLAC\d\.\d\b/g,
                                    /\bLPCM\d\.\d\b/g,
                                    /\bH\.264\b/g,
                                    /\bH\.265\b/g,
                                    /\bDTS-HD MA \d\.\d\b/g,
                                    /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                ];

                                keepPatterns.forEach((pattern, index) => {
                                    tempText = tempText.replace(pattern, (match) => {
                                        const placeholder = `__PLACEHOLDER${index}__`;
                                        placeholders.set(placeholder, match);
                                        return placeholder;
                                    });
                                });

                                // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                placeholders.forEach((original, placeholder) => {
                                    tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                });

                                tempText = tempText
                                    .replace(/DD\+/g, 'DD+ ')
                                    .replace(/DDP/g, 'DD+ ')
                                    .replace(/DoVi/g, 'DV')
                                    .replace(/\(/g, '')
                                    .replace(/\)/g, '')
                                    .replace(/\bhdr\b/g, 'HDR')
                                    .replace(/\bweb\b/g, 'WEB')
                                    .replace(/\bbluray\b/gi, 'BluRay')
                                    .replace(/\bh254\b/g, 'H.264')
                                    .replace(/\bh265\b/g, 'H.265')
                                    .replace(/\b\w/g, char => char.toUpperCase())
                                    .replace(/\bX264\b/g, 'x264')
                                    .replace(/\bX265\b/g, 'x265')
                                    .replace(/\b - \b/g, ' ');

                                return tempText;
                            };

                    torrent_obj.info_text = replaceFullStops(cleanTheText);
                    torrent_obj.site = "RTF";

                    const downloadLinkElement = d.querySelector(".download");
                    if (downloadLinkElement) {
                        torrent_obj.download_link = downloadLinkElement.closest("a")?.href.replace("passthepopcorn.me", "retroflix.club");
                    }

                    const torrentPageElement = d.querySelector("div.col-md-8.col-xl-8 a.font-weight-bold");
                    if (torrentPageElement) {
                        torrent_obj.torrent_page = torrentPageElement.href.replace("passthepopcorn.me", "retroflix.club");
                    }

                    const snatchSpan = [...d.querySelectorAll("div.col-2.col-xl-1.text-center span")]
                        .find(span => !span.classList.contains("text-success") && !span.classList.contains("text-muted") && !span.classList.contains("text-danger"));
                    torrent_obj.snatch = snatchSpan ? parseInt(snatchSpan.textContent.trim()) : 0;

                    const seedSpan = d.querySelector("div.col-2.col-xl-1.text-center span.text-success");
                    torrent_obj.seed = seedSpan ? parseInt(seedSpan.textContent.trim()) : 0;

                    const leechSpan = d.querySelector("div.col-2.col-xl-1.text-center span.text-muted");
                    torrent_obj.leech = leechSpan ? parseInt(leechSpan.textContent.trim()) : 0;

                    torrent_obj.status = d.querySelectorAll("span.tag_seeding").length > 0 ? "seeding" : "default";
                    torrent_obj.discount = "None";

                    torrent_objs.push(torrent_obj);

                });
            }
            torrent_objs = torrent_objs.map(e => {
                return { ...e, "quality": get_torrent_quality(e) };
            });
            return torrent_objs;
        };

        const is_movie_exist = (tracker, html) => { // true or false
            if (tracker === "PTP") {
                if (html.querySelector("#no_results_message > div") === null) return true;
                else return false;
            }
            else if (tracker === "HDB") {
                return true;
            }
            else if (tracker === "TVV") {
                if (html.querySelector('NoResults') !== null) {
                    return false;
                } else if (html.querySelector('SearchError[value="1"]') !== null) {
                    console.error("TVV authorization missing");
                    return false;
                } else if (html.querySelector('SearchError[value="2"]') !== null) {
                    console.error("TVV authorization invalid or account disabled");
                    return false;
                } else if (html.querySelector('SearchError[value="3"]') !== null) {
                    console.error("Not enough privileges for this TVV search");
                    return false;
                } else if (html.querySelector('SearchError[value="100"]') !== null) {
                    console.error("Searching TVV too soon");
                    return false;
                } else if (html.querySelector('SearchError') !== null) {
                    console.error("Some issue with TVV searching");
                    return false;
                } else {
                    return true;
                }
            }
            else if (tracker === "RTF") {
                const element = html.querySelector("div.col-md-12 > h4")
                if (element) {
                    if (element.textContent.includes("No results found")) {
                        return false;
                    } else {
                        return true;
                    }
                } else {
                    return true;
                }
            }
            else if (tracker === "NBL") {
                 return true;
            }
            else if (tracker === "BTN") {
                  return true;
            }
            else if (tracker === "MTV") {
                return true;
            }
            else if (tracker === "ANT") {
                if (html.querySelector(".head").textContent.includes("Basic Search (")) return false;
                else return true;
            }
            else if (tracker === "BHD") {
                    return true;
            }
            else if (tracker === "BLU" || tracker === "Aither" || tracker === "RFX" || tracker === "OE" || tracker === "HUNO" || tracker === "TIK") {
                if (html.querySelector(".torrent-search--list__no-result") === null) return true;
                else return false;
            }
            else if (["AvistaZ", "CinemaZ", "PHD"].includes(tracker)) {
                if (html.querySelector("#content-area > div.block > p") === null) return true;
                else return false;
            }
            else if (tracker === "FL") {
                if (html.querySelectorAll(".torrentrow").length === 0) return false;
                else return true;
            }
            else if (tracker === "CG") {
                let ar1 = [...html.querySelectorAll("tr.prim")];
                let ar2 = [...html.querySelectorAll("tr.even")];
                let ar3 = [...html.querySelectorAll("tr.torrenttable_usersnatched")];
                let ar4 = [...html.querySelectorAll("tr.torrenttable_bumped")];

                let combined_arr = ar1.concat(ar2).concat(ar3).concat(ar4);

                if (combined_arr.length > 0) return true; // it's different, pay attention !
                else return false;
            }
            else if (tracker === "KG") {
                if (html.querySelector("tr.oddrow") === null) return false; // it's different, pay attention !
                else return true;
            }
            else if (tracker === "PxHD") {
                const element = html.querySelector("div.box.pad > h2");

                // Check if element exists
                if (element) {
                    if (element.textContent.includes("did not match anything")) {
                        return false; // Text did not match anything
                    } else {
                        return true; // Text matched something
                    }
                } else {
                    return true; // Element not found
                }
            }
        };

        const post_json = async (post_query_url, tracker, postData, timeout = timer) => {
            let timer;
            try {
                const response = await new Promise((resolve, reject) => {
                    timer = setTimeout(() => {
                        console.error(`Request timed out for ${tracker} at URL: ${post_query_url}`);
                        displayAlert(`Request timed out for ${tracker}`);
                        reject(new Error('Request timed out'));
                    }, timeout);

                    GM_xmlhttpRequest({
                        url: post_query_url,
                        method: "POST",
                        data: JSON.stringify(postData),
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        onload: (res) => {
                            clearTimeout(timer);
                            resolve(res);
                        },
                        onerror: (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                        onabort: (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                        ontimeout: (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                    });
                });

                if (response.status === 200) {
                    return JSON.parse(response.responseText);
                } else {
                    console.error(`Error: HTTP ${response.status} Error.`);
                    return null;  // Allow other processing to continue by returning null
                }
            } catch (error) {
                console.error(`Error fetching URL from ${tracker}: ${error.message}`);
                return null;  // Return null to allow continuation of other operations
            }
        };

        const fetch_url = async (query_url, tracker, timeout = timer) => {
            let timer;
            try {
                const response = await new Promise((resolve, reject) => {
                    timer = setTimeout(() => {
                        console.error(`Request timed out for ${tracker} at URL: ${query_url}`);
                        displayAlert(`Request timed out for ${tracker}`);
                        reject(new Error('Request timed out'));
                    }, timeout);

                    GM_xmlhttpRequest({
                        url: query_url,
                        method: "GET",
                        onload: (res) => {
                            clearTimeout(timer);
                            resolve(res);
                        },
                        onerror: (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                        onabort: (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                        ontimeout: (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                    });
                });

                if (response.status === 200) {
                    const contentType = response.responseHeaders.match(/content-type: ([^;]+)/i)[1].toLowerCase();
                    const parser = new DOMParser();
                    let result;

                    if (contentType.includes("xml")) {
                        result = parser.parseFromString(response.responseText, "text/xml");
                    } else {
                        result = parser.parseFromString(response.responseText, "text/html").body;
                    }

                    return result;
                } else if (response.status === 100) {
                    console.log(`Notice: HTTP ${response.status} Too soon after last search.`);
                    return null;  // Return null to indicate that the data shouldn't be processed further but doesn't halt other processing
                } else {
                    console.error(`Error: HTTP ${response.status} Error.`);
                    return null;  // Similar to the 100 case, allow other processing to continue by returning null
                }
            } catch (error) {
                console.error(`Error fetching URL from ${tracker}: ${error.message}`);
                return null;  // Return null to allow continuation of other operations
            }
        };

        const generateGUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const fetch_tracker = async (tracker, imdb_id, show_name, show_nbl_name, timeout = timer) => {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    console.error(`Request timed out for ${tracker}`);
                    displayAlert(`Request timed out for ${tracker}`);
                    resolve([]);
                }, timeout);
                let query_url = "";
                let api_query_url = "";
                let post_query_url = "";
                let postData = {};

                if (tracker === "PTP") {
                    query_url = "https://passthepopcorn.me/torrents.php?imdb=" + imdb_id;
                }
                else if (tracker === "HDB") {
                  try {
                      post_query_url = "https://hdbits.org/api/torrents";
                      postData = {
                      username: HDB_USER_NAME,
                      passkey: HDB_PASS_KEY,
                      imdb: { id: imdb_id.split("tt")[1] }
                      };
                    } catch (error) {
                        console.error(`Error setting up HDB query: ${error.message}`);
                        resolve([]); // Resolve with an empty array if there's an error
                        return;
                    }
                }
                else if (tracker === "BTN") {
                    try {
                        post_query_url = "https://api.broadcasthe.net/";
                        postData = {
                            jsonrpc: "2.0",
                            id: generateGUID().substring(0, 8),
                            method: "getTorrentsSearch",
                            params: [
                                BTN_API_TOKEN,
                                {
                                    //imdb_id: parseInt(imdb_id.split("tt")[1])
                                    //series: show_name
                                    search: show_name
                                    //name: show_name
                                },
                                20, // Results per page
                                //0   // Page number
                            ]
                        };
                    } catch (error) {
                        console.error(`Error setting up NBL query: ${error.message}`);
                        resolve([]); // Resolve with an empty array if there's an error
                        return;
                    }
                }
                else if (tracker === "MTV") {
                    query_url = "https://www.morethantv.me/api/torznab?t=search&apikey=" + MTV_API_TOKEN + "&imdbid=" + imdb_id;
                }
                else if (tracker === "ANT") {
                    query_url = "https://anthelion.me/torrents.php?searchstr=" + imdb_id + "&order_by=time&order_way=desc&group_results=1&action=basic&searchsubmit=1";
                } else if (tracker === "BHD") {
                    try {
                        post_query_url = "https://beyond-hd.me/api/torrents/" + BHD_API_TOKEN;
                        postData = {
                            action: "search",
                            rsskey: BHD_RSS_KEY,
                            imdb_id: imdb_id.split("tt")[1]
                        };
                    } catch (error) {
                        console.error(`Error setting up BHD query: ${error.message}`);
                        resolve([]); // Resolve with an empty array if there's an error
                        return;
                    }
                } else if (tracker === "BLU") {
                    api_query_url =
                        "https://blutopia.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=3&api_token=" +
                        BLU_API_TOKEN;
                }
                else if (tracker === "TIK") {
                    api_query_url =
                        "https://cinematik.net/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=3&categories[3]=4&categories[4]=5&categories[5]=6&api_token=" +
                        TIK_API_TOKEN;
                }
                else if (tracker === "Aither") {
                    api_query_url =
                        "https://aither.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&api_token=" +
                        AITHER_API_TOKEN;
                }
                else if (tracker === "RFX") {
                    api_query_url =
                        "https://reelflix.xyz/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&api_token=" +
                        RFX_API_TOKEN;
                }
                else if (tracker === "OE") {
                    api_query_url =
                        "https://onlyencodes.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&api_token=" +
                        OE_API_TOKEN;
                }
                else if (tracker === "HUNO") {
                    api_query_url =
                        "https://hawke.uno/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=2&categories[1]=1&api_token=" +
                        HUNO_API_TOKEN;
                }
                else if (tracker === "TVV") {
                    query_url = "https://tv-vault.me/xmlsearch.php?query=get&torrent_pass=" + TVV_TORR_PASS + "&imdbid=" + imdb_id;
                }
                else if (tracker === "RTF") {
                    query_url = "https://retroflix.club/browse?years%5B%5D=1890&years%5B%5D=2024&includingDead=1&promotionType=&bookmarked=&search=" + imdb_id + "&searchIn=4&termMatchKind=2&submit=";
                }
                else if (tracker === "NBL") {
                    try {
                        post_query_url = "https://nebulance.io/api.php";
                        postData = {
                            jsonrpc: "2.0",
                            id: generateGUID().substring(0, 8),
                            method: "getTorrents",
                            params: [
                                NBL_API_TOKEN,
                                {
                                    //imdb: parseInt(imdb_id.split("tt")[1])
                                    series: show_nbl_name
                                },
                                20, // Results per page
                                0   // Page number
                            ]
                        };
                    } catch (error) {
                        console.error(`Error setting up NBL query: ${error.message}`);
                        resolve([]); // Resolve with an empty array if there's an error
                        return;
                    }
                }
                else if (tracker === "AvistaZ") {
                    query_url = "https://avistaz.to/movies?search=&imdb=" + imdb_id + "&view=lists";
                }
                else if (tracker === "CinemaZ") {
                    query_url = "https://cinemaz.to/movies?search=&imdb=" + imdb_id + "&view=lists";
                }
                else if (tracker === "PHD") {
                    query_url = "https://privatehd.to/movies?search=&imdb=" + imdb_id + "&view=lists";
                }
                else if (tracker === "FL") {
                    query_url = "https://filelist.io/browse.php?search=" + imdb_id + "&cat=0&searchin=1&sort=3";
                }
                else if (tracker === "CG") {
                    query_url = "https://cinemageddon.net/browse.php?search=" + imdb_id + "&orderby=size&dir=DESC";
                }
                else if (tracker === "KG") {
                    query_url = "https://karagarga.in/browse.php?sort=size&search=" + imdb_id + "&search_type=imdb&d=DESC";
                }
                else if (tracker === "PxHD") {
                    query_url = "https://pixelhd.me/torrents.php?groupname=&year=&tmdbover=&tmdbunder=&tmdbid=&imdbover=&imdbunder=&imdbid=" + imdb_id + "&order_by=time&order_way=desc&taglist=&tags_type=1&filter_cat%5B1%5D=1&filterTorrentsButton=Filter+Torrents";
                }
                const performRequest = () => {
                    if (use_post_instead(tracker) === true) {
                        post_json(post_query_url, tracker, postData, timeout)
                            .then(result => {
                                clearTimeout(timer); // Clear the timer on successful fetch
                                if (result) {
                                    if (result.results && tracker === "BHD") {
                                        resolve(get_post_torrent_objects(tracker, result));
                                    } else if (result.data && tracker === "HDB") {
                                        resolve(get_post_torrent_objects(tracker, result));
                                    } else if (result.result && tracker === "NBL") {
                                        resolve(get_post_torrent_objects(tracker, result));
                                    } else if (tracker === "BTN" && result.result) {
                                        resolve(get_post_torrent_objects(tracker, result));
                                    } else {
                                        console.log(`${tracker} reached successfully but no valid results found`);
                                        resolve([]);
                                    }
                                } else {
                                    console.log(`${tracker} reached successfully but no results found`);
                                    resolve([]);
                                }
                            })
                            .catch(error => {
                                console.error(`Error fetching data from ${tracker}:`, error);
                                displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]);
                            });
                    } else if (use_api_instead(tracker) === false) {
                        fetch_url(query_url)
                            .then(result => {
                                clearTimeout(timer); // Clear the timer on successful fetch
                                let movie_exist = is_movie_exist(tracker, result);
                                if (movie_exist === false) {
                                    console.log(`${tracker} reached successfully`);
                                    resolve([]);
                                } else {
                                    console.log(`Data fetched successfully from ${tracker}`);
                                    resolve(get_torrent_objs(tracker, result));
                                }
                            })
                            .catch(error => {
                                console.error(`Error fetching data from ${tracker}:`, error);
                                displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]); // Resolve with an empty array if there's an error
                            });
                    } else {
                        fetch(api_query_url)
                            .then(response => {
                                clearTimeout(timer); // Clear the timer on successful fetch
                                if (!response.ok) throw new Error('Failed to fetch data');
                                return response.json();
                            })
                            .then(data => {
                                if (data.data.length === 0) {
                                    console.log(`${tracker} reached successfully`);
                                } else {
                                    console.log(`Data fetched successfully from ${tracker}`);
                                }
                                resolve(get_api_torrent_objects(tracker, data));
                            })
                            .catch(error => {
                                console.error(`Error fetching data from ${tracker}:`, error);
                                displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]);
                            });
                    }
                };

                performRequest();
            });
        };

        const get_post_torrent_objects = (tracker, postData, isMiniSeries) => {
            let torrent_objs = [];
            if (tracker === "BHD") {
                try {
                    torrent_objs = postData.results.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size

                        const originalInfoText = d.name;
                        let infoText = originalInfoText;

                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            let groupText = "";
                            const groups = goodGroups(); // Array of good group names
                            const badGroupsList = badGroups(); // Array of bad group names
                            let matchedGroup = null;
                            let badGroupFound = false;

                            // Remove bad groups if found
                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim();
                                    break;
                                }
                            }

                            if (!badGroupFound) {
                                // Check for good groups if no bad group was found
                                for (const group of groups) {
                                    if (infoText.includes(group)) {
                                        matchedGroup = group;
                                        break;
                                    }
                                }
                            }

                            if (matchedGroup) {
                                groupText = matchedGroup;
                                if (improved_tags) {
                                    infoText = infoText.replace(groupText, '').trim();
                                }
                            }

                            const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                            if (match) {
                                groupText = match[1].replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    infoText = infoText.replace(`-${match[1]}`, '').trim();
                                }
                            }

                                if (improved_tags) {
                                    // Handle HDR and DV tags
                                    const dv = (d.dv === 1);
                                    const hdr10 = (d.hdr10 === 1);
                                    const hdr10Plus = (d["hdr10+"] === 1);

                                    if (hdr10Plus) {
                                        if (infoText.includes("HDR")) {
                                            infoText = infoText.replace("HDR", "HDR10+");
                                        } else if (!infoText.includes("HDR10+")) {
                                            infoText += " HDR10+";
                                        }
                                    } else if (hdr10) {
                                        if (infoText.includes("HDR")) {
                                            infoText = infoText.replace("HDR", "HDR10");
                                        } else if (!infoText.includes("HDR10")) {
                                            infoText += " HDR10";
                                        }
                                    }

                                    // Append DV tag
                                    if (dv) {
                                        if (hdr10Plus && !infoText.includes("DV HDR10+")) {
                                            infoText = "DV HDR10+ " + infoText.replace("HDR10+", "").replace("HDR10", "").replace("DV", "").trim();
                                        } else if (hdr10 && !infoText.includes("DV HDR10")) {
                                            infoText = "DV HDR10 " + infoText.replace("HDR10+", "").replace("HDR10", "").replace("DV", "").trim();
                                        } else if (!infoText.includes("DV")) {
                                            infoText = "DV " + infoText;
                                        }
                                    }

                                    // Append Blu-ray type
                                    const bdType = get_blu_ray_disc_type(d.size);
                                    if (infoText.includes("Blu-ray")) {
                                        infoText = `${bdType} ${infoText}`;
                                    }

                                    // Append Commentary tag
                                    if (d.commentary === 1) {
                                        infoText = "Commentary " + infoText;
                                    }
                                }

                            const is25 = d.promo25 === 1 ? true : false;
                            const is50 = d.promo50 === 1 ? true : false;
                            const is75 = d.promo75 === 1 ? true : false;
                            const is100 = d.freeleech === 1 ? true : false;

                            let discounted = "";
                            if (is25) {
                                discounted = "25% Freeleech";
                            } else if (is50) {
                                discounted = "50% Freeleech";
                            } else if (is75) {
                                discounted = "75% Freeleech";
                            } else if (is100) {
                                discounted = "Freeleech";
                            } else {
                                discounted = "None";
                            }

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: originalInfoText,
                                size: size,
                                info_text: infoText,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.times_completed || 0,
                                seed: d.seeders || 0,
                                leech: d.leechers || 0,
                                download_link: d.download_url || "",
                                torrent_page: d.url || "",
                                discount: discounted,
                                internal: d.internal === 1 ? true : false,
                                status: "default",
                                groupId: groupText,
                                bhd_rating: d.bhd_rating,
                                tmdb_rating: d.tmdb_rating,
                                imdb_rating: d.imdb_rating,
                                year: d.year,
                                type: d.type,
                            };

                            // Map additional properties if necessary
                            const mappedObj = {
                                ...torrentObj,
                                quality: get_torrent_quality(torrentObj),
                            };
                            return mappedObj;
                        } else {
                          return null;
                        }
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing BHD tracker:", error);
                }
            } else if (tracker === "HDB") {
                try {
                    torrent_objs = postData.data.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size

                        const originalInfoText = d.name;
                        let infoText = originalInfoText;
                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            let groupText = "";
                            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                            const badGroupsList = badGroups(); // Get the list of bad group names
                            let matchedGroup = null;
                            let badGroupFound = false;

                            // Check for bad groups
                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                    groupText = ""; // Set groupText to an empty string
                                    break;
                                }
                            }

                            if (!badGroupFound) {
                                // Check for good groups if no bad group was found
                                for (const group of groups) {
                                    if (infoText.includes(group)) {
                                        matchedGroup = group;
                                        break;
                                    }
                                }

                                if (matchedGroup) {
                                    groupText = matchedGroup;
                                    if (improved_tags) {
                                        infoText = infoText.replace(groupText, '').trim();
                                    }
                                } else {
                                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                    if (match) {
                                        groupText = match[1]; // Use match[1] to get the capturing group
                                        groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                        if (improved_tags) {
                                            infoText = infoText.replace(`-${match[1]}`, '').trim();
                                        }
                                    }
                                }
                            }

                            const id = d.id;
                            const baseURL = 'https://hdbits.org/download.php/';
                            const pageURL = 'https://hdbits.org/details.php?id=';
                            const torrent = d.filename;
                            const releaseName = d.filename.replace(/\.torrent$/, "");

                            // Check if web.dl, web-dl, or webdl is present in the infoText
                            const isWebDL = /web.dl|web-dl|webdl/i.test(infoText);
                            let finalReleaseName = releaseName;

                            if (isWebDL) {
                                const tagsArray = d.tags.filter(tag => !infoText.includes(tag));

                                // Create webTagsArray only if web.dl, web-dl, or webdl is present
                                const webTagsArray = tagsArray.map(tag => `${tag.toLowerCase()}.web.dl`);
                                const tags = webTagsArray.join(' ');

                                if (tags && improved_tags) {
                                    infoText += ` ${tags}`;
                                }

                                let finalReleaseName = releaseName;
                                if (improved_tags) {
                                    finalReleaseName = `${tags} ${releaseName}`;
                                }
                            } else {
                                const tagsArray = d.tags.filter(tag => !infoText.includes(tag));
                                const tags = tagsArray.join(' ');

                                if (tags && improved_tags) {
                                    infoText += ` ${tags}`;
                                }

                                let finalReleaseName = releaseName;
                                if (improved_tags) {
                                    finalReleaseName = `${tags} ${releaseName}`;
                                }
                            }
                            const bdType = get_blu_ray_disc_type(d.size);
                            if (improved_tags && infoText.includes("Blu-ray") && (infoText.includes("1080p") || infoText.includes("2160p"))) {
                                infoText = `${bdType} ${infoText}`;
                            }
                            const isAudioOnly = d.type_category === 6 ? true : false;
                            if (isAudioOnly) {
                                infoText = infoText += "Audio Only Track";
                            }
                            const isRemux = d.type_medium === 5 ? true : false;
                            const isDisc = d.type_medium === 1 ? true : false;
                            const isCapture = d.type_medium === 4 ? true : false;
                            const isWeb = d.type_medium === 6 ? true : false;
                            const isInternal = d.type_origin === 1 ? true : false;
                            const isDoco = d.type_category === 3 ? true : false;
                            const isTv = d.type_category === 2 ? true : false;
                            const get_hdb_discount = () => {
                                let discountText = "";
                                if (d.freeleech === "yes") {
                                    discountText = "Freeleech";
                                } else {
                                    if (isInternal || isRemux || isDisc || isCapture ||  isTv || isDoco) {
                                    discountText = "50% Freeleech";
                                    }
                                  else if (isWeb && isInternal) {
                                    discountText = "25% Freeleech";
                                  } else {
                                    discountText = "None";
                                  }
                                }
                                return discountText;
                            }
                            const status = d.torrent_status || "default";

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: finalReleaseName,
                                size: size,
                                info_text: infoText,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.times_completed || 0,
                                seed: d.seeders || 0,
                                leech: d.leechers || 0,
                                download_link: `${baseURL}${torrent}?id=${id}&passkey=${HDB_PASS_KEY}`,
                                torrent_page: `${pageURL}${id}`,
                                discount: d.freeleech === "yes" ? "Freeleech" : "None",
                                internal: isInternal,
                                exclusive: d.type_exclusive === 1 ? true : false,
                                status: status,
                                groupId: groupText,
                            };

                            const mappedObj = {
                                ...torrentObj,
                                quality: get_torrent_quality(torrentObj), "discount": get_hdb_discount(torrentObj.discount),
                            };

                            return mappedObj;
                        } else {
                          return null;
                        }
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing HDB tracker:", error);
                }
            } else if (tracker === "NBL") {
                try {
                    if (postData.result && postData.result.items) {
                        torrent_objs = postData.result.items.map(d => {
                            const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                            const api_size = parseInt(d.size); // Original size

                            const originalInfoText = d.rls_name;
                            let infoText = originalInfoText;
                            if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            let groupText = "";
                            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                            const badGroupsList = badGroups(); // Get the list of bad group names
                            let matchedGroup = null;
                            let badGroupFound = false;

                            // Check for bad groups
                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                    groupText = ""; // Set groupText to an empty string
                                    break;
                                }
                            }

                            if (!badGroupFound) {
                                // Check for good groups if no bad group was found
                                for (const group of groups) {
                                    if (infoText.includes(group)) {
                                        matchedGroup = group;
                                        break;
                                    }
                                }

                                if (matchedGroup) {
                                    groupText = matchedGroup;
                                    if (improved_tags) {
                                        infoText = infoText.replace(groupText, '').trim();
                                    }
                                } else {
                                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                    if (match) {
                                        groupText = match[1]; // Use match[1] to get the capturing group
                                        groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                        if (improved_tags) {
                                            infoText = infoText.replace(`-${match[1]}`, '').trim();
                                        }
                                    }
                                }
                            }
                                let cleanTheText = infoText;
                                const replaceFullStops = (text) => {

                                    const placeholders = new Map();
                                    let tempText = text;

                                    const keepPatterns = [
                                        /\b\d\.\d\b/g,
                                        /\bDD\d\.\d\b/g,
                                        /\bDDP\d\.\d\b/g,
                                        /\bDD\+\d\.\d\b/g,
                                        /\bTrueHD \d\.\d\b/g,
                                        /\bDTS\d\.\d\b/g,
                                        /\bAC3\d\.\d\b/g,
                                        /\bAAC\d\.\d\b/g,
                                        /\bOPUS\d\.\d\b/g,
                                        /\bMP3\d\.\d\b/g,
                                        /\bFLAC\d\.\d\b/g,
                                        /\bLPCM\d\.\d\b/g,
                                        /\bH\.264\b/g,
                                        /\bH\.265\b/g,
                                        /\bDTS-HD MA \d\.\d\b/g,
                                        /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                    ];

                                    keepPatterns.forEach((pattern, index) => {
                                        tempText = tempText.replace(pattern, (match) => {
                                            const placeholder = `__PLACEHOLDER${index}__`;
                                            placeholders.set(placeholder, match);
                                            return placeholder;
                                        });
                                    });

                                    // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                    tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                    tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                    tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                    tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                    placeholders.forEach((original, placeholder) => {
                                        tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                    });

                                    tempText = tempText
                                        .replace(/DD\+/g, 'DD+ ')
                                        .replace(/DDP/g, 'DD+ ')
                                        .replace(/DoVi/g, 'DV')
                                        .replace(/\(/g, '')
                                        .replace(/\)/g, '')
                                        .replace(/\bhdr\b/g, 'HDR')
                                        .replace(/\bweb\b/g, 'WEB')
                                        .replace(/\bbluray\b/gi, 'BluRay')
                                        .replace(/\bh254\b/g, 'H.264')
                                        .replace(/\bh265\b/g, 'H.265')
                                        .replace(/\b\w/g, char => char.toUpperCase())
                                        .replace(/\bX264\b/g, 'x264')
                                        .replace(/\bX265\b/g, 'x265')
                                        .replace(/\b - \b/g, ' ');

                                    return tempText;
                                };

                                const id = d.group_id;
                                const pageURL = 'https://nebulance.io/details.php?id=';

                                const torrentObj = {
                                    api_size: api_size,
                                    datasetRelease: originalInfoText,
                                    size: size,
                                    info_text: replaceFullStops(cleanTheText),
                                    tracker: tracker,
                                    site: tracker,
                                    snatch: d.snatch || 0,
                                    seed: d.seed || 0,
                                    leech: d.leech || 0,
                                    download_link: d.download,
                                    torrent_page: `${pageURL}${id}`,
                                    discount: "None",
                                    status: "default",
                                    groupId: groupText,
                                };

                                // Map additional properties if necessary
                                const mappedObj = {
                                    ...torrentObj,
                                    quality: get_torrent_quality(torrentObj),
                                };

                                return mappedObj;
                            } else {
                              return null;
                            }
                        }).filter(obj => obj !== null); // Filter out any null objects
                    } else {
                        console.log("No items found in the response from NBL");
                    }
                } catch (error) {
                    console.error("An error occurred while processing NBL tracker:", error);
                }
            } else if (tracker === "BTN") {
                try {
                    if (postData.result && postData.result.torrents) {
                        torrent_objs = Object.values(postData.result.torrents).map(d => {
                            const size = parseInt(d.Size / (1024 * 1024)); // Convert size to MiB
                            const api_size = parseInt(d.Size); // Original size

                            const originalInfoText = d.ReleaseName;
                            let infoText = originalInfoText;
                            if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                              if (!isMiniSeriesFromSpan && /S\d{2}/.test(infoText)) {
                                  return null;
                              } else {
                                  let groupText = "";
                                  const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                                  const badGroupsList = badGroups(); // Get the list of bad group names
                                  let matchedGroup = null;
                                  let badGroupFound = false;

                                  // Check for bad groups
                                  for (const badGroup of badGroupsList) {
                                      if (infoText.includes(badGroup)) {
                                          badGroupFound = true;
                                          infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                          groupText = ""; // Set groupText to an empty string
                                          break;
                                      }
                                  }

                                  if (!badGroupFound) {
                                      // Check for good groups if no bad group was found
                                      for (const group of groups) {
                                          if (infoText.includes(group)) {
                                              matchedGroup = group;
                                              break;
                                          }
                                      }

                                      if (matchedGroup) {
                                          groupText = matchedGroup;
                                          if (improved_tags) {
                                              infoText = infoText.replace(groupText, '').trim();
                                          }
                                      } else {
                                          const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                          if (match) {
                                              groupText = match[1]; // Use match[1] to get the capturing group
                                              groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                              if (improved_tags) {
                                                  infoText = infoText.replace(`-${match[1]}`, '').trim();
                                              }
                                          }
                                      }
                                  }
                                  let cleanTheText = infoText;
                                  const replaceFullStops = (text) => {

                                      const placeholders = new Map();
                                      let tempText = text;

                                      const keepPatterns = [
                                          /\b\d\.\d\b/g,
                                          /\bDD\d\.\d\b/g,
                                          /\bDDP\d\.\d\b/g,
                                          /\bDD\+\d\.\d\b/g,
                                          /\bTrueHD \d\.\d\b/g,
                                          /\bDTS\d\.\d\b/g,
                                          /\bAC3\d\.\d\b/g,
                                          /\bAAC\d\.\d\b/g,
                                          /\bOPUS\d\.\d\b/g,
                                          /\bMP3\d\.\d\b/g,
                                          /\bFLAC\d\.\d\b/g,
                                          /\bLPCM\d\.\d\b/g,
                                          /\bH\.264\b/g,
                                          /\bH\.265\b/g,
                                          /\bDTS-HD MA \d\.\d\b/g,
                                          /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                      ];

                                      keepPatterns.forEach((pattern, index) => {
                                          tempText = tempText.replace(pattern, (match) => {
                                              const placeholder = `__PLACEHOLDER${index}__`;
                                              placeholders.set(placeholder, match);
                                              return placeholder;
                                          });
                                      });

                                      // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                      tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                      tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                      tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                      tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                      placeholders.forEach((original, placeholder) => {
                                          tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                      });

                                      tempText = tempText
                                          .replace(/DD\+/g, 'DD+ ')
                                          .replace(/DDP/g, 'DD+ ')
                                          .replace(/DoVi/g, 'DV')
                                          .replace(/\(/g, '')
                                          .replace(/\)/g, '')
                                          .replace(/\bhdr\b/g, 'HDR')
                                          .replace(/\bweb\b/g, 'WEB')
                                          .replace(/\bbluray\b/gi, 'BluRay')
                                          .replace(/\bh254\b/g, 'H.264')
                                          .replace(/\bh265\b/g, 'H.265')
                                          .replace(/\b\w/g, char => char.toUpperCase())
                                          .replace(/\bX264\b/g, 'x264')
                                          .replace(/\bX265\b/g, 'x265')
                                          .replace(/\b - \b/g, ' ');

                                      return tempText;
                                  };
                                  const id = d.GroupID;
                                  const tid = d.TorrentID;
                                  const pageURL = 'https://broadcasthe.net/torrents.php?id=';

                                  const torrentObj = {
                                      api_size: api_size,
                                      datasetRelease: originalInfoText,
                                      size: size,
                                      info_text: replaceFullStops(cleanTheText),
                                      tracker: tracker,
                                      site: tracker,
                                      snatch: parseInt(d.Snatched) || 0,
                                      seed: parseInt(d.Seeders) || 0,
                                      leech: parseInt(d.Leechers) || 0,
                                      download_link: d.DownloadURL,
                                      torrent_page: `${pageURL}${id}&torrentid=${tid}`,
                                      discount: "None",
                                      status: "default",
                                      groupId: groupText,
                                  };

                                  const mappedObj = {
                                      ...torrentObj,
                                      quality: get_torrent_quality(torrentObj),
                                  };

                                  return mappedObj;
                              }
                            } else {
                              return null;
                            }
                        }).filter(obj => obj !== null); // Filter out any null objects
                    } else {
                        console.log("No torrents found in the response from BTN");
                    }
                } catch (error) {
                    console.error("An error occurred while processing BTN tracker:", error);
                }
            }
            return torrent_objs;
        };

        const get_api_discount = (text, refundable) => {
            let discountText = "";

            if (refundable === true) {
                discountText += "Refundable";
            } else {
                if (text === 0 || text === "0%") {
                    discountText = "None";
                } else if (text === "25%") {
                    discountText = "25% Freeleech";
                } else if (text === "Copper") {
                    discountText = "Copper";
                } else if (text === "50%") {
                    discountText = "50% Freeleech";
                } else if (text === "Bronze") {
                    discountText = "Bronze";
                } else if (text === "75%") {
                    discountText = "75% Freeleech";
                } else if (text === "Silver") {
                    discountText = "Silver";
                } else if (text === "100%") {
                    discountText = "Freeleech";
                } else if (text === "Golden") {
                    discountText = "Golden";
                } else {
                    discountText = text + " Freeleech";
                }
            }

            return discountText;
        };

        const get_api_internal = (internal) => {
            return !!internal; // Convert internal to boolean directly
        };

        const get_api_personal_release = (personal_release) => {
            return !!personal_release; // Convert internal to boolean directly
        };

        const get_api_double_upload = (double_upload, tracker) => {
            if (tracker === "TIK" && double_upload === true) {
                return "Emerald";
            } else if (double_upload === true) {
                return "DU";
            } else return false;
        };

        const get_api_featured = (featured, tracker) => {
            if (tracker === "TIK" && featured === true) {
                return "Platinum";
            } else if (featured === true) {
                return "Featured";
            } else {
                return false;
            }
        };

        const get_api_files = (files) => {
            const containerExtensions = ["m2ts", "mkv", "vob", "iso", "mpg", "mp4"]; // List of possible containers you might be looking for

            for (const file of files) {
                const singleFileName = file.name;
                const lastDotIndex = singleFileName.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    const extension = singleFileName.substring(lastDotIndex + 1).toLowerCase();
                    if (containerExtensions.includes(extension)) {
                        return extension; // Return the container if it's one of the specified extensions
                    }
                }
            }

            // If no specific container found, return default behavior
            if (files.length > 1) {
                return "m2ts";
            } else if (files.length === 1) {
                const singleFileName = files[0].name;
                const lastDotIndex = singleFileName.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    return singleFileName.substring(lastDotIndex + 1);
                } else {
                    // Handle case where there is no full stop in the name
                    return singleFileName;
                }
            } else {
                // Handle case where there are no files, if necessary
                return null;
            }
        };
        const get_blu_ray_disc_type = (size) => {
            const sizeInGB = size / (1024 * 1024 * 1024); // Convert size to GB
            if (sizeInGB <= 25) {
                return "BD25";
            } else if (sizeInGB <= 50) {
                return "BD50";
            } else if (sizeInGB <= 66) {
                return "BD66";
            } else if (sizeInGB <= 100) {
                return "BD100";
            } else {
                return "BDSET";
            }
        };

        const get_api_torrent_objects = (tracker, json) => {
            let torrent_objs = [];

            if (
                tracker === "BLU" ||
                tracker === "Aither" ||
                tracker === "RFX" ||
                tracker === "OE" ||
                tracker === "HUNO" ||
                tracker === "TIK"
            ) {
                torrent_objs = json.data.map((element) => {
                    // Mapping element attributes to a torrent object
                    const originalInfoText = tracker === "HUNO" ? element.attributes.name.replace(/[()]/g, "") : element.attributes.name;
                    let getRelease = originalInfoText;
                    let infoText = originalInfoText;

                    // Check if the info text contains "SxxExx" where "xx" is not known beforehand
                    if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                        // If the info text does not contain the pattern, proceed with further processing
                        const files = element.attributes.files || []; // Ensure files is defined
                        const container = get_api_files(files); // Call the function with files as argument
                        // Step 1: Identify the year
                        const yearMatch = infoText.match(/\((\d{4})\)/);
                        let relevantText = infoText;

                        if (yearMatch) {
                            // Step 2: If a year is found, process only the text after the year
                            const yearIndex = infoText.indexOf(yearMatch[0]) + yearMatch[0].length;
                            relevantText = infoText.substring(yearIndex).trim();
                        }

                        // Step 3: Perform the match on the relevant text
                        let groupText = "";
                        const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                        const badGroupsList = badGroups(); // Get the list of bad group names
                        let matchedGroup = null;
                        let badGroupFound = false;

                        // Check for bad groups
                        for (const badGroup of badGroupsList) {
                            if (infoText.includes(badGroup)) {
                                badGroupFound = true;
                                infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                groupText = ""; // Set groupText to an empty string
                                break;
                            }
                        }

                        if (!badGroupFound) {
                            // Check for good groups if no bad group was found
                            for (const group of groups) {
                                if (infoText.includes(group)) {
                                    matchedGroup = group;
                                    break;
                                }
                            }

                            if (matchedGroup) {
                                groupText = matchedGroup;
                                if (improved_tags) {
                                    infoText = infoText.replace(groupText, '').trim();
                                }
                            } else {
                                // Adjust the regex to correctly capture the desired group
                                const match = relevantText.match(/-\s*([a-zA-Z0-9]+)$/);
                                if (match) {
                                    groupText = match[1]; // Use match[1] to get the capturing group
                                    groupText = groupText.replace(/[()]/g, ' '); // Replace parentheses with spaces
                                    //groupText = groupText.replace(/\[.*?\]/g, '').trim(); // Remove text inside brackets and trim
                                    groupText = groupText.replace(/[^a-z0-9]/gi, ''); // Sanitize to alphanumeric characters
                                    if (improved_tags) {
                                        infoText = infoText.replace(`-${match[0].substring(1)}`, '').trim(); // Remove the matched group
                                    }
                                } else {
                                    groupText = ""; // Explicitly set to an empty string if no match
                                }
                            }
                        }

                        let updatedInfoText = infoText.trim();
                        if (improved_tags) {
                            const region = element.attributes.region;
                            if (region) {
                                const regionRegex = new RegExp(`\\b${region}\\b`, 'gi');
                                updatedInfoText = updatedInfoText.replace(regionRegex, '').trim();
                            }
                            updatedInfoText = updatedInfoText.replace(groupText, '').trim();
                            if (container) {
                                //updatedInfoText = updatedInfoText.replace(/\[.*?\]/g, '').trim();
                                updatedInfoText = `${container} ${updatedInfoText}`; // Append container to info_text
                                // Add BD type if container is m2ts or iso
                                if (container === "m2ts" || container === "iso") {
                                    const bdType = get_blu_ray_disc_type(element.attributes.size);
                                    if (tracker === "TIK") {
                                        updatedInfoText = `${bdType} Blu-ray ${updatedInfoText}`;
                                    } else {
                                        updatedInfoText = `${bdType} ${updatedInfoText}`;
                                    }
                                }
                            }
                        }
                        const mediaInfo = element.attributes.media_info;
                        if (mediaInfo) {
                            let isHdr10Plus = mediaInfo.includes("HDR10+");
                            let isCommentary = mediaInfo.includes("Commentary");
                            if (isHdr10Plus) {
                                updatedInfoText = updatedInfoText.replace("HDR", "HDR10+");
                            }
                            if (improved_tags) {
                                if (isCommentary) {
                                    updatedInfoText = updatedInfoText += "Commentary";
                                }
                            }
                        }
                        const torrentObj = {
                            api_size: parseInt(element.attributes.size),
                            datasetRelease: getRelease,
                            size: parseInt(element.attributes.size / (1024 * 1024)),
                            info_text: updatedInfoText,
                            tracker: tracker,
                            site: tracker,
                            snatch: element.attributes.times_completed,
                            seed: element.attributes.seeders,
                            leech: element.attributes.leechers,
                            download_link: element.attributes.download_link,
                            torrent_page: element.attributes.details_link,
                            discount: (tracker === "TIK") ?
                                (
                                    (element.attributes.freeleech === "75%") ? "Silver" :
                                        (element.attributes.freeleech === "50%") ? "Bronze" :
                                            (element.attributes.freeleech === "100%") ? "Golden" :
                                                (element.attributes.freeleech === "25%") ? "Copper" :
                                                    element.attributes.freeleech
                                ) :
                                element.attributes.freeleech,
                            featured: element.attributes.featured,
                            internal: element.attributes.internal,
                            double_upload: element.attributes.double_upload,
                            refundable: element.attributes.refundable,
                            personal_release: element.attributes.personal_release,
                            groupId: groupText,
                            distributor: element.attributes.distributor,
                            region: element.attributes.region,
                        };
                        // Mapping additional properties and logging the final torrent objects
                        const mappedObj = { ...torrentObj, "quality": get_torrent_quality(torrentObj), "discount": get_api_discount(torrentObj.discount, torrentObj.refundable, tracker), "internal": get_api_internal(torrentObj.internal), "Featured": get_api_featured(torrentObj.featured) };

                        // Returning the final torrent object if it passes the "SxxExx" check
                        return mappedObj;
                    } else {
                        // If the info text contains the pattern, skip further processing
                        return null; // Return null to filter out this torrent object
                    }
                }).filter(obj => obj !== null); // Filter out the null objects (skipped torrents)
                // Returning the final torrent objects
                return torrent_objs;
            }
        };

        const get_filtered_torrents = (quality) => {
            let all_trs = [...document.querySelectorAll("tr.group_torrent")];
            let filtered_torrents = [];

            if (quality === "SD") {
                let first_idx = all_trs.findIndex((a) => a.textContent.includes("Standard Definition"));
                let sliced = all_trs.slice(first_idx + 1, all_trs.length);

                let last_idx = sliced.findIndex((a) => a.className === "group_torrent");
                if (last_idx === -1) last_idx = all_trs.length;
                filtered_torrents = sliced.slice(0, last_idx);
            }
            else if (quality === "HD") {
                let first_idx = all_trs.findIndex((a) => a.textContent.includes("High Definition") && !a.textContent.includes("Ultra High Definition"));
                let sliced = all_trs.slice(first_idx + 1, all_trs.length);

                let last_idx = sliced.findIndex((a) => a.className === "group_torrent");
                if (last_idx === -1) last_idx = all_trs.length;
                filtered_torrents = sliced.slice(0, last_idx);
            }
            else if (quality === "UHD") {
                let first_idx = all_trs.findIndex((a) => a.textContent.includes("Ultra High Definition"));
                let sliced = all_trs.slice(first_idx + 1, all_trs.length);

                let last_idx = sliced.findIndex((a) => a.className === "group_torrent");
                if (last_idx === -1) last_idx = all_trs.length;
                filtered_torrents = sliced.slice(0, last_idx);
            }

            // part 2 !
            let group_torrent_objs = [];

            filtered_torrents.forEach((t) => {
                try {
                    // Find the first span with a title that includes " bytes" and extract its title
                    let sizeSpan = [...t.querySelectorAll("span")].find(s => s.title && s.title.includes(" bytes"));
                    if (!sizeSpan) {
                        console.log("No size information found for torrent.");
                        return; // Skip this iteration if no relevant span is found
                    }
                    let sizeText = sizeSpan.title;

                    // Remove commas for conversion and split by " bytes" then convert to integer
                    let sizeInBytes = parseInt(sizeText.replace(/,/g, '').split(" bytes")[0]);
                    if (isNaN(sizeInBytes)) {
                        console.error("Failed to parse size from text: ", sizeText);
                        return; // Skip this iteration if parsing fails
                    }

                    // Convert from bytes to MiB
                    let sizeInMiB = Math.floor(sizeInBytes / 1024 / 1024);

                    // Add the torrent info to the array
                    group_torrent_objs.push({
                        dom_path: t,
                        size: sizeInMiB
                    });

                } catch (e) {
                    console.error("An error has occurred during processing a torrent: ", e);
                }
            });

            return group_torrent_objs;
        };

        const get_torrent_quality = (torrent) => {
            if (torrent.quality) return torrent.quality;

            let text = torrent.info_text.toLowerCase();

            if (text.includes("2160p")) return "UHD";
            else if (text.includes("1080p") || text.includes("720p") || text.includes("1080i") || text.includes("720i")) return "HD";
            else return "SD";
        };

        const get_ref_div = (torrent, ptp_torrent_group) => {
            let my_size = torrent.size;

            try {
                // dont add after this div, add it after the hidden div !
                let div = ptp_torrent_group.find(e => e.size < my_size).dom_path;
                let selector_id = "torrent_" + div.id.split("header_")[1];
                return document.getElementById(selector_id);
            } catch (e) {
                return false; // the size is too small, put it at the top of the group.
            }
        };

        const get_ptp_format_size = (size) => {
            // Ensure 'size' is a number. If it's a string, try converting it to a number.
            if (typeof size === 'string') {
                size = parseFloat(size);
            }

            // Check if 'size' is a number after potential conversion. If not, return "N/A".
            if (isNaN(size) || size === null || size === undefined) {
                return "N/A"; // or any default value you prefer
            }

            // Format size based on its magnitude.
            if (size >= 1048576) { // TiB format, where 1 TiB = 1024 GiB = 1048576 MiB
                return (size / 1048576).toFixed(2) + " TiB";
            } else if (size >= 1024) { // GiB format
                return (size / 1024).toFixed(2) + " GiB";
            } else { // MiB format
                return size.toFixed(2) + " MiB";
            }
        };

        const get_element_size = (size) => {
            if (typeof size === 'string') {
                size = parseFloat(size);
            }
            if (isNaN(size) || size === null || size === undefined) {
                return "N/A"; // or any default value you prefer
            }
            const bytes = size * 1024 * 1024;
            return bytes.toLocaleString() + " Bytes";
        };

        const add_as_first = (div, quality) => { // puts 2gb 1080p at the top of the pack.
            let all_trs = [...document.querySelectorAll("tr.group_torrent")];
            let first_idx;

            if (quality === "SD") {
                first_idx = all_trs.findIndex((a) => a.textContent.includes("Standard Definition"));
            }
            else if (quality === "HD") {
                first_idx = all_trs.findIndex((a) => a.textContent.includes("High Definition") && !a.textContent.includes("Ultra High Definition"));
            }
            else if (quality === "UHD") {
                first_idx = all_trs.findIndex((a) => a.textContent.includes("Ultra High Definition"));
            }

            insertAfter(div, all_trs[first_idx]);
        };

        const get_codec = (lower, torrent) => {
            if (lower.includes("x264") || lower.includes("x.264") || lower.includes("x 264")) return "x264 / ";
            else if (lower.includes("x265") || lower.includes("x.265") || lower.includes("x 265")) return "x265 / ";
            else if (lower.includes("h264") || lower.includes("h.264") || lower.includes("avc") || lower.includes("h 264")) return "H.264 / ";
            else if (lower.includes("h265") || lower.includes("h.265") || lower.includes("hevc") || lower.includes("h 265")) return "H.265 / ";
            else if (lower.includes("xvid") || lower.includes("x.vid")) return "XviD / ";
            else if (lower.includes("divx") || lower.includes("div.x")) return "DivX / ";
            else if (lower.includes("mpeg2") || lower.includes("mpeg-2")) return "MPEG2 / ";
            else if (lower.includes("mpeg1") || lower.includes("mpeg-1")) return "MPEG1 / ";
            else if (lower.includes("vc-1")) return "VC-1 / ";

            return null; // skip this info
        };

        const get_disc = (lower, torrent) => {
            if (lower.includes("dvd5") || lower.includes("dvd-5") || lower.includes("dvd 5")) return "DVD5 / ";
            else if (lower.includes("dvd9") || lower.includes("dvd-9") || lower.includes("dvd 9")) return "DVD9 / ";
            else if (lower.includes("bd25") || lower.includes("bd-25") || lower.includes("bd 25") || lower.includes("uhd 25") || lower.includes("uhd25") || lower.includes("uhd-25")) return "BD25 / ";
            else if (lower.includes("bd50") || lower.includes("bd-50") || lower.includes("bd 50") || lower.includes("uhd 50") || lower.includes("uhd50") || lower.includes("uhd-50")) return "BD50 / ";
            else if (lower.includes("bd66") || lower.includes("bd-66") || lower.includes("bd 66") || lower.includes("uhd 66") || lower.includes("uhd66") || lower.includes("uhd-66")) return "BD66 / ";
            else if (lower.includes("bd100") || lower.includes("bd-100") || lower.includes("bd 100") || lower.includes("uhd 100") || lower.includes("uhd100") || lower.includes("uhd-100")) return "BD100 / ";
            else if (lower.includes("dvdset")) return "Disc Set / ";
            else if (lower.includes("bdset")) return "Disc Set / ";

            return null;
        };

        const get_container = (lower, torrent) => {
            if (lower.includes("avi")) return "AVI / ";
            else if (lower.includes("mpg")) return "MPG / ";
            else if (lower.includes("mkv")) return "MKV / ";
            else if (lower.includes("mp4")) return "MP4 / ";
            else if (lower.includes("vob")) return "VOB IFO / ";
            else if (lower.includes("iso")) return "ISO / ";
            else if (lower.includes("m2ts")) return "m2ts / ";

            return null;
        };

        const get_source = (lower, torrent) => {
            if (lower.includes("/cam")) return "CAM / ";
            else if (lower.includes("/ts")) return "TS / ";
            else if (lower.includes("/r5")) return "R5 / ";
            else if (lower.includes("vhs")) return "VHS / ";
            else if (lower.includes("web")) return "WEB / ";
            else if (lower.includes("hddvd") || lower.includes("hd-dvd") || lower.includes("hd dvd")) return "HD-DVD / ";
            else if (lower.includes("dvd")) return "DVD / ";
            else if (lower.includes("hdtv") || lower.includes("hd-tv")) return "HDTV / ";
            else if (lower.includes("tv")) return "TV / ";
            else if (lower.includes("bluray") || lower.includes("blu-ray") || lower.includes("blu.ray") || lower.includes("blu ray")) return "Blu-ray / ";

            return null;
        };

        const get_res = (lower, torrent) => {
            if (lower.includes("ntsc")) return "NTSC / ";
            else if (lower.includes("pal")) return "PAL / ";
            else if (lower.includes("480p")) return "480p / ";
            else if (lower.includes("576p")) return "576p / ";
            else if (lower.includes("720p")) return "720p / ";
            else if (lower.includes("1080i")) return "1080i / ";
            else if (lower.includes("1080p")) return "1080p / ";
            else if (lower.includes("2160p")) return "2160p / ";

            return null;
        };

        const get_audio = (lower, torrent) => {
            if (lower.includes("atmos")) return "Dolby Atmos / ";
            else if (lower.includes("dts:x") || lower.includes("dts-x")) return "DTS:X / ";
            else if (lower.includes("mp3")) return "MP3 / ";

            return null;
        };

        const get_hdr = (lower, torrent) => {
            if (lower.includes("dolby vision hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dolby vision hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dolby vision hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dv hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dv hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dv hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr10+ / dv")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("hdr10 / dv")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr / dv")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr dv")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes(" dv ")) return "Dolby Vision / "; // Need spaces or else DVD suddenly has Dolby Vision.
            else if (lower.includes("dovi hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dovi hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi")) return "Dolby Vision / ";
            else if (lower.includes("dolby vision")) return "Dolby Vision / ";
            else if (lower.includes("hdr10+")) return "HDR10+ / ";
            else if (lower.includes("hdr10")) return "HDR10 / ";
            else if (lower.includes("hdr")) return "HDR10 / ";
            else if (lower.includes("pq10")) return "10bit / ";
            else if (lower.includes("sdr")) return "SDR / ";

            return null;
        };

        const get_bonus = (lower, torrent) => {
            const bonuses = [];

            if (lower.includes("remux")) bonuses.push("Remux");
            const anthologyMatch = lower.match(/anthology/);
            const yearMatch = lower.match(/\d{4}/);

            if (anthologyMatch && yearMatch && anthologyMatch.index < yearMatch.index) {
                bonuses.push("Anthology");
            }
            if (lower.includes("2in1")) bonuses.push("2in1");
            if (lower.includes("3in1")) bonuses.push("3in1");
            if (lower.includes("4in1")) bonuses.push("4in1");
            if (lower.includes("special features")) bonuses.push("Special Features");
            if (lower.includes("special edition")) bonuses.push("Special Edition");
            if (lower.includes("directors cut")) bonuses.push("Directors Cut");
            if (lower.includes("director's cut")) bonuses.push("Directors Cut");
            if (lower.includes("pan & scan")) bonuses.push("Pan & Scan");
            if (lower.includes("repack2")) bonuses.push("Repack2");
            else if (lower.includes("repack")) bonuses.push("Repack");
            if (lower.includes("hybrid")) bonuses.push("Hybrid");
            if (lower.includes("proper")) bonuses.push("Proper");
            if (lower.includes("skynet edition")) bonuses.push("Skynet Edition");
            if (lower.includes("ultimate cut")) bonuses.push("Ultimate Cut");
            if (lower.includes("ultimate edition")) bonuses.push("Ultimate Edition");
            if (lower.includes("extended edition")) bonuses.push("Extended Edition");
            else if (lower.includes("extended")) bonuses.push("Extended Edition");
            if (lower.includes("remastered")) bonuses.push("Remastered");
            if (lower.includes("commentary")) bonuses.push("Commentary");
            if (lower.includes("10bit")) bonuses.push("10bit");
            if (lower.includes("35mm")) bonuses.push("35mm");
            if (lower.includes("half-sbs") || lower.includes("half sbs")) {
                bonuses.push("3D Half SBS");
            }
            else if (lower.includes("half-ou") || lower.includes("half ou")) {
                bonuses.push("3D Half OU");
            }
            else if (lower.includes("3d")) bonuses.push("3D Edition");
            if (lower.includes("hfr")) bonuses.push("High Frame-rate");
            if (lower.includes("dcp")) bonuses.push("Digital Cinema Package");
            if (lower.includes("open matte")) bonuses.push("Open Matte");

            return bonuses.length > 0 ? bonuses.join(" / ") + " / " : null;
        };

        const get_country = (normal, torrent) => {
            const exceptions = ["AVC", "DDP", "DTS", "PAL", "VHS", "WEB", "DVD", "HDR", "GLK", "UHD", "AKA", "TMT", "HDT", "ABC", "MKV", "AVI", "MP4", "VOB", "MAX", "HFR", "SDR", "DCP", "MVC"]; // Add any other exceptions as needed
            const countryCodeMatch = normal.match(/\b[A-Z]{3}\b/g);
            if (countryCodeMatch) {
                const filteredCodes = countryCodeMatch.filter(code => !exceptions.includes(code));
                if (filteredCodes.length > 0) {
                    return filteredCodes.join(' / ') + " / ";
                }
            }

            return null;
        };

        const get_scene = (lower, torrent) => {
            if (lower.includes("scene")) return "Scene / ";

            return null;
        }

        const get_simplified_title = (info_text, torrent) => {
            let lower = info_text.toLowerCase();
            let normal = info_text;

            // required infos: codec (x264 vs) / container (mkv, mp4) / source (dvd, web, bluray) / res (1080p, 720, SD, 1024x768 etc) / Bonus (with commentary, remux, XYZ edition)
            let codec = get_codec(lower, torrent);
            let container = get_container(lower, torrent);
            let source = get_source(lower, torrent);
            let res = get_res(lower, torrent);
            let audio = get_audio(lower, torrent);
            let hdr = get_hdr(lower, torrent);
            let bonus = get_bonus(lower, torrent);
            let country = get_country(normal, torrent);
            let disc = get_disc(lower, torrent);
            let scene = get_scene(lower, torrent);

            const parts = [];

            if (codec) parts.push(codec.trim());
            if (container) parts.push(container.trim());
            if (source) parts.push(source.trim());
            if (res) parts.push(res.trim());
            if (audio) parts.push(audio.trim());
            if (hdr) parts.push(hdr.trim());
            if (bonus) parts.push(bonus.trim());
            if (country) parts.push(country.trim());
            if (disc) parts.push(disc.trim());
            if (scene) parts.push(scene.trim());

            // Use a Set to filter out duplicates
            const uniqueParts = [...new Set(parts)];

            let combined_text = uniqueParts.join(' ').replace(/\s+\/$/, '').trim();

            if (combined_text === "") return info_text;
            else return combined_text;
        };

        const get_discount_color = (discount) => {
            if (discount === "Freeleech") return "inherit";
            else if (discount === "50% Freeleech") return "inherit";
            else if (discount === "25% Freeleech") return "inherit";
            else return "inherit";
        };

        const add_external_torrents = (external_torrents) => {
            const existing_torrent_sizes = Array.from(document.querySelectorAll("span[style='float: left;']")).map(x => x.textContent);
            // console.log(existing_torrent_sizes);

            let sd_ptp_torrents = get_filtered_torrents("SD").sort((a, b) => a.size < b.size ? 1 : -1);
            let hd_ptp_torrents = get_filtered_torrents("HD").sort((a, b) => a.size < b.size ? 1 : -1);
            let uhd_ptp_torrents = get_filtered_torrents("UHD").sort((a, b) => a.size < b.size ? 1 : -1);

            create_needed_groups(external_torrents);

            external_torrents.forEach((torrent, i) => {
                let seeders = parseInt(torrent.seed);
                if (hide_dead_external_torrents && parseInt(seeders) === 0) return;

                let group_torrents;
                let ref_div;
                let tracker = torrent.site;
                let dom_id = tracker + "_" + i;
                const group_id = torrent.groupId;

                if (torrent.quality === "UHD") {
                    ref_div = get_ref_div(torrent, uhd_ptp_torrents);
                    group_torrents = uhd_ptp_torrents; // needed just in case ref returns false/if its smallest
                } else if (torrent.quality === "HD") {
                    ref_div = get_ref_div(torrent, hd_ptp_torrents);
                    group_torrents = hd_ptp_torrents;
                } else {
                    ref_div = get_ref_div(torrent, sd_ptp_torrents);
                    group_torrents = sd_ptp_torrents;
                }

                let cln = line_example.cloneNode(true);

                if (improved_tags && show_tracker_name) {
                    cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] / ` + get_simplified_title(torrent.info_text);
                } else if (improved_tags) {
                    cln.querySelector(".torrent-info-link").textContent = get_simplified_title(torrent.info_text);
                } else if (show_tracker_name) {
                    cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] ` + torrent.info_text;
                } else {
                    cln.querySelector(".torrent-info-link").textContent = torrent.info_text;
                }

                if (!hide_tags) {
                    if (improved_tags) {
                        if (torrent.region != null && torrent.region != false) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__region'>${torrent.region}</span>`;
                        }
                    if (torrent.distributor != null && torrent.distributor != false) {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__distributor'>${torrent.distributor}</span>`;
                    }
                    if (torrent.site === "HDB") {
                        torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>" : false;
                        torrent.exclusive ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__exclusive'>Exclusive</span>" : false;
                    }
                    if (torrent.site === "BHD") {
                        torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>" : false;
                    }
                    if (torrent.site === "BTN") {
                        torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>" : false;
                        torrent.season2 ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__season2'>Season 2</span>" : false;
                        torrent.extras ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__season2'>Extras</span>" : false;
                    }
                    if (torrent.site === "ANT") {
                        torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>" : false;
                    }
                    if (torrent.site === "MTV") {
                        torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>" : false;
                    }
                    if (torrent.site === "BLU" || torrent.site === "Aither" || torrent.site === "RFX" || torrent.site === "OE" || torrent.site === "HUNO") {
                        get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>") : false;
                        get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__DU'>DU</span>") : false;
                        get_api_featured(torrent.featured) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Featured'>Featured</span>") : false;
                        get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Personal'>Personal Release</span>") : false;
                    }
                    if (torrent.site === "TIK") {
                        get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal'>Internal</span>") : false;
                        get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Emerald'>Emerald</span>") : false;
                        get_api_featured(torrent.featured, torrent.site) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Platinum'>Platinum</span>") : false;
                        get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Personal'>Personal Release</span>") : false;
                    }
                    } else if (!improved_tags) {
                        if (torrent.site === "HDB") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                            torrent.exclusive ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__exclusive' style='font-weight: bold; color: #a14989'>Exclusive</span>" : false;
                        }
                        if (torrent.site === "BHD") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                        }
                        if (torrent.site === "BTN") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #00FF00'>Internal</span>" : false;
                            torrent.season2 ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__season2' style='font-weight: bold; color: #FF0000'>Season 2</span>" : false;
                            torrent.extras ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__season2' style='font-weight: bold; color: #a14989'>Extras</span>" : false;
                        }
                        if (torrent.site === "ANT") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2CB430'>Internal</span>" : false;
                        }
                        if (torrent.site === "MTV") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                        }
                        if (torrent.site === "BLU" || torrent.site === "Aither" || torrent.site === "RFX" || torrent.site === "OE" || torrent.site === "HUNO") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #baaf92'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__DU' style='font-weight: bold; color: #279d29'>DU</span>") : false;
                            get_api_featured(torrent.featured) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Featured' style='font-weight: bold; color: #997799'>Featured</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Personal' style='font-weight: bold; color: #865BE9'>Personal Release</span>") : false;
                        }
                        if (torrent.site === "TIK") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #baaf92'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Emerald' style='font-weight: bold; color: #3FB618'>Emerald</span>") : false;
                            get_api_featured(torrent.featured, torrent.site) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Platinum' style='font-weight: bold; color: #26A69A'>Platinum</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Personal' style='font-weight: bold; color: #865BE9'>Personal Release</span>") : false;
                        }
                    }
                }
                if (improved_tags) {
                    if (torrent.discount === "Freeleech" || torrent.discount === "Golden") {
                        cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
                    } else if (torrent.discount === "50% Freeleech" || torrent.discount === "Bronze") {
                        cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
                    } else if (torrent.discount != "None") {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__download-mod'>${torrent.discount}!</span>`;
                    }
                } else {
                    if (torrent.discount != "None") {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>${torrent.discount}!</span>`;
                    }
                }
                if (!hide_tags) {
                    if (torrent.reported != null && torrent.reported != false) {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__reported'>Reported</span>`;
                    }
                    if (torrent.trumpable != null && torrent.trumpable != false) {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__trumpable'>Trumpable</span>`;
                    }
                }

                if (torrent.status === "seeding") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-seeding";
                if (torrent.status === "leeching") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-leeching";
                if (torrent.status === "grabbed") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-downloaded";
                if (torrent.status === "snatched") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-snatched";

                let elements = cln.querySelector(".basic-movie-list__torrent__action").querySelectorAll("a");

                if (elements.length > 0) {
                    if (hideBlankLinks === "DL") {
                        let element = [...elements].find(a => a.textContent === " DL ");
                        if (element) {
                            element.href = torrent.download_link;
                        }
                    } else if (hideBlankLinks === "Download") {
                        let element = [...elements].find(a => a.textContent === " DOWNLOAD ");
                        if (element) {
                            element.href = torrent.download_link;
                        }
                    } else if (hideBlankLinks === "Spaced") {
                        let element = [...elements].find(a => a.textContent.trim() === "DL");
                        if (element) {
                            element.style.paddingRight = "51px";
                            element.href = torrent.download_link;
                        }
                    }
                } else {
                    console.log("No elements found matching the criteria.");
                }

                const ptp_format_size = get_ptp_format_size(torrent.size);
                if (hide_if_torrent_with_same_size_exists && existing_torrent_sizes.includes(ptp_format_size)) {
                    if (log_torrents_with_same_size) {
                        console.log(`[${torrent.site}] A ${ptp_format_size} torrent already exists:\n${torrent.info_text}\n${torrent.torrent_page}`);
                    }
                    return;
                }
                const element_size = get_element_size(torrent.size);
                let api_sized = torrent.api_size;

                if (api_sized !== undefined && api_sized !== null) {
                    api_sized = api_sized.toLocaleString() + " Bytes";
                }

                cln.querySelector(".size-span").textContent = ptp_format_size;

                const byteSizedTrackers = ["BLU", "Aither", "RFX", "OE", "HUNO", "TIK", "TVV", "BHD", "HDB", "NBL", "BTN", "MTV"];
                if (byteSizedTrackers.includes(torrent.site)) {
                    cln.querySelector(".size-span").setAttribute("title", api_sized);
                } else {
                    cln.querySelector(".size-span").setAttribute("title", element_size);
                }
                cln.querySelector("td:nth-child(3)").textContent = torrent.snatch; // snatch
                cln.querySelector("td:nth-child(4)").textContent = torrent.seed; // seed

                if (torrent.seed === 0) {
                    cln.querySelector("td:nth-child(4)").className = "no-seeders";
                }

                cln.querySelector("td:nth-child(5)").textContent = torrent.leech; // leech
                cln.querySelector(".link_3").href = torrent.torrent_page;
                cln.className += " " + dom_id;
                cln.id += " " + dom_id;
                if (torrent?.datasetRelease) {
                    if (cln?.dataset?.releasename) {
                        cln.dataset.releasename += torrent.datasetRelease;
                    } else {
                        cln.dataset.releasename = torrent.datasetRelease;
                    }
                } else if (torrent.info_text && cln.dataset.releasename) {
                    cln.dataset.releasename += `[${torrent.site}] ` + torrent.info_text;
                } else if (torrent.info_text) {
                    cln.dataset.releasename = `[${torrent.site}] ` + torrent.info_text;
                }
                if (group_id && cln.dataset.releasegroup) {
                    cln.dataset.releasegroup += group_id;
                } else if (group_id || group_id === "") {
                    cln.dataset.releasegroup = group_id;
                }

                if (open_in_new_tab) cln.querySelector(".link_3").target = "_blank";

                if (show_tracker_icon) {
                    cln.querySelector("img").src = get_tracker_icon(torrent.site);
                    cln.querySelector("img").title = torrent.site;
                }

                if (ref_div != false) insertAfter(cln, ref_div);
                else {
                    add_as_first(cln, torrent.quality);
                }

                let dom_path = cln;
                let quality = dom_get_quality(torrent.info_text);
                let discount = torrent.discount;
                let info_text = torrent.info_text;
                let leechers = parseInt(torrent.leech);
                let snatchers = parseInt(torrent.snatch);
                let size = torrent.size;

                doms.push({ tracker, dom_path, quality, discount, info_text, group_id, seeders, leechers, snatchers, dom_id, size });
            });

            console.log("Finished processing for other scripts");
            const event = new CustomEvent('PTPAddReleasesFromOtherTrackersComplete');
            document.dispatchEvent(event);

            let reduced_trackers = get_reduced_trackers(doms);
            let reduced_discounts = get_reduced_discounts(doms);
            let reduced_qualities = get_reduced_qualities(doms);

            if (!hide_filters_div) {
                add_filters_div(reduced_trackers, reduced_discounts, reduced_qualities);
                // disable_highlight()
                add_sort_listeners();
            }
        };

        const insert_group = (quality, header_div) => {
            let all_trs = [...document.querySelector("#torrent-table > tbody").querySelectorAll("tr.group_torrent")];
            let tbody = document.querySelector("#torrent-table > tbody");

            if (quality === "HD") {
                let idx = -2; // add_after_this_index

                for (let i = 0; i < all_trs.length; i++) {
                    if (all_trs[i].textContent.includes("Other") || all_trs[i].textContent.includes("Ultra High Definition")) {
                        idx = i - 1;
                        break;
                    }
                }
                if (idx === -2) {
                    tbody.appendChild(header_div); // nothing to stop me
                } else {
                    insertAfter(header_div, all_trs[idx]);
                }
            }
            else if (quality === "UHD") {
                let idx = -2; // add_after_this_index

                for (let i = 0; i < all_trs.length; i++) {
                    if (all_trs[i].textContent.includes("Other")) {
                        idx = i - 1;
                        break;
                    }
                }

                if (idx === -2) {
                    tbody.appendChild(header_div); // nothing to stop me
                } else {
                    insertAfter(header_div, all_trs[idx]);
                }
            }
        };

        const create_needed_groups = (torrents) => {
            let all_trs = [...document.querySelector("#torrent-table > tbody").querySelectorAll("tr.group_torrent")];
            let tbody = document.querySelector("#torrent-table > tbody");

            if (torrents.find(e => e.quality === "SD") != undefined && all_trs.find(d => d.textContent.includes("Standard Definition")) === undefined) {
                group_header_example.querySelector(".basic-movie-list__torrent-edition__sub").textContent = "Standard Definition";
                tbody.insertBefore(group_header_example, document.querySelector("#torrent-table > tbody").firstChild);
            }
            if (torrents.find(e => e.quality === "HD") != undefined &&
                all_trs.find(d => d.textContent.includes("High Definition") && !d.textContent.includes("Ultra High Definition")) === undefined) {
                group_header_example.querySelector(".basic-movie-list__torrent-edition__sub").textContent = "High Definition";
                insert_group("HD", group_header_example);
            }
            if (torrents.find(e => e.quality === "UHD") != undefined && all_trs.find(d => d.textContent.includes("Ultra High Definition")) === undefined) {
                group_header_example.querySelector(".basic-movie-list__torrent-edition__sub").textContent = "Ultra High Definition";
                insert_group("UHD", group_header_example);
            }
        };

        const fix_doms = () => {
            doms.forEach((d) => {
                // Find the element with class 'group_torrent' that also has a class matching d.dom_id
                const targetElement = [...document.querySelectorAll(".group_torrent")].find(e =>
                    e.classList.contains(d.dom_id)
                );
                // Update the dom_path property
                d.dom_path = targetElement;
            });
        };

        const filter_torrents = () => {
            doms.forEach((e, i) => {
                let tracker_constraint = false;

                let inc_value = undefined;
                let exc_value = undefined;

                let status = filters.trackers.find(d => d.name === e.tracker).status;

                if (status === "include") inc_value = true;
                else if (status === "exclude") exc_value = true;

                if (inc_value === true) tracker_constraint = true;
                else if (exc_value === true) tracker_constraint = false;
                else {
                    tracker_constraint = true;
                    if (filters.trackers.filter(e => e.status === "include").length > 0) tracker_constraint = false;
                }

                if (tracker_constraint === false) {
                    e.dom_path.style.display = "none";
                    return;
                }

                ////////////////////
                let discount_constraint = false;

                let inc_value_2 = undefined;
                let exc_value_2 = undefined;

                let status_2 = filters.discounts.find(d => d.name === e.discount).status;

                if (status_2 === "include") inc_value_2 = true;
                else if (status_2 === "exclude") exc_value_2 = true;

                if (inc_value_2 === true) discount_constraint = true;
                else if (exc_value_2 === true) discount_constraint = false;
                else {
                    discount_constraint = true;
                    if (filters.discounts.filter(e => e.status === "include").length > 0) discount_constraint = false;
                }

                if (discount_constraint === false) {
                    e.dom_path.style.display = "none";
                    return;
                }

                /////////////////////////////////
                let quality_constraint = false;

                let inc_value_3 = undefined;
                let exc_value_3 = undefined;

                let status_3 = filters.qualities.find(d => d.name === e.quality).status;

                if (status_3 === "include") inc_value_3 = true;
                else if (status_3 === "exclude") exc_value_3 = true;

                if (inc_value_3 === true) quality_constraint = true;
                else if (exc_value_3 === true) quality_constraint = false;
                else {
                    quality_constraint = true;
                    if (filters.qualities.filter(e => e.status === "include").length > 0) quality_constraint = false;
                }

                if (quality_constraint === false) {
                    e.dom_path.style.display = "none";
                    return;
                }

                //////////////////////
                let text_constraint = true;
                const torrentSearchElement = document.querySelector(".torrent-search");
                if (torrentSearchElement) {
                    let must_include_words = torrentSearchElement.value.split(" ").map((w) => w.toLowerCase());

                    for (let word of must_include_words) {
                        if (e.info_text.toLowerCase().includes(word) === false) {
                            text_constraint = false;
                            break;
                        }
                    }
                } else {
                    console.log("No element with class 'torrent-search' found.");
                }

                if (text_constraint === false) {
                    e.dom_path.style.display = "none";
                    return;
                }

                // congrats!
                e.dom_path.style.display = "table-row";
            });
        };

        function apply_default_filters() {
            console.log("Applying default filters...");

            // Apply default tracker filters
            show_only_by_default.forEach(tracker => {
                const trackerID = `#filter-${tracker.toLowerCase()}`;
                const dom_path = document.querySelector(trackerID);

                if (dom_path) {
                    const trackerFilter = filters.trackers.find(e => e.name === tracker);
                    if (trackerFilter) {
                        trackerFilter.status = "include";
                        dom_path.style.background = "#40E0D0";
                        dom_path.style.color = "#111";
                        console.log(`Applied tracker filter for ${tracker}`);
                    } else {
                        console.log(`Tracker ${tracker} not found in filters.`);
                    }
                } else {
                    console.log(`No DOM element found for tracker ${trackerID}`);
                }
            });

            // Apply default quality filters
            show_resolution_by_default.forEach(quality => {
                const qualityElements = document.querySelectorAll(".filter-box");
                let qualityFound = false;

                qualityElements.forEach(dom_path => {
                    if (dom_path.textContent.trim().toLowerCase() === quality.toLowerCase()) {
                        const qualityFilter = filters.qualities.find(e => e.name === quality);
                        if (qualityFilter) {
                            qualityFilter.status = "include";
                            dom_path.style.background = "#40E0D0";
                            dom_path.style.color = "#111";
                            qualityFound = true;
                            console.log(`Applied quality filter for ${quality}`);
                        } else {
                            console.log(`Quality ${quality} not found in filters.`);
                        }
                    }
                });

                if (!qualityFound) {
                    console.log(`No DOM element found for quality ${quality}`);
                }
            });

            filter_torrents(); // Applies the filters to the page
        }

        const update_filter_box_status = (object_key, value, dom_path) => { // object_key = tracker/quality/discount || value = BHD, HDB, 50% Freeleech, 720p etc...
            // let all_values = ["default", "include", "exclude"];

            if (object_key === "trackers") {
                let current_status = filters.trackers.find(e => e.name === value).status;

                if (current_status === "default") {
                    filters.trackers.find(e => e.name === value).status = "include";
                    dom_path.style.background = "#40E0D0";
                    dom_path.style.color = "#111";
                } else if (current_status === "include") {
                    filters.trackers.find(e => e.name === value).status = "exclude";
                    dom_path.style.background = "#920000";
                    dom_path.style.color = "#eee";
                } else {
                    filters.trackers.find(e => e.name === value).status = "default";
                    dom_path.style.background = "";
                    dom_path.style.opacity = 1;
                }
            }
            else if (object_key === "discounts") {
                let current_status = filters.discounts.find(e => e.name === value).status;

                if (current_status === "default") {
                    filters.discounts.find(e => e.name === value).status = "include";
                    dom_path.style.background = "#40E0D0";
                    dom_path.style.color = "#111";
                } else if (current_status === "include") {
                    filters.discounts.find(e => e.name === value).status = "exclude";
                    dom_path.style.background = "#920000";
                    dom_path.style.color = "#eee";
                } else {
                    filters.discounts.find(e => e.name === value).status = "default";
                    dom_path.style.background = "";
                    dom_path.style.opacity = 1;
                }
            }
            else if (object_key === "qualities") {
                let current_status = filters.qualities.find(e => e.name === value).status;

                if (current_status === "default") {
                    filters.qualities.find(e => e.name === value).status = "include";
                    dom_path.style.background = "#40E0D0";
                    dom_path.style.color = "#111";
                } else if (current_status === "include") {
                    filters.qualities.find(e => e.name === value).status = "exclude";
                    dom_path.style.background = "#920000";
                    dom_path.style.color = "#eee";
                } else {
                    filters.qualities.find(e => e.name === value).status = "default";
                    dom_path.style.background = "";
                    dom_path.style.opacity = 1;
                }
            }

            filter_torrents(); // big update
        };

        const fix_ptp_names = () => {
            document.querySelectorAll("tr.group_torrent").forEach(d => {
                if (ptp_release_name && !improved_tags) {
                    // Find the closest header element with a matching dom_id class
                    const matchingDom = doms.find(dom => d.classList.contains(dom.dom_id));
                    if (matchingDom) {
                        const torrent = d.querySelector("a.torrent-info-link");
                        if (torrent) {
                            // Extract the HTML element with the specific class if present
                            const freeleechSpan = torrent.querySelector("span.torrent-info__download-modifier.torrent-info__download-modifier--free");
                            const halfleechSpan = torrent.querySelector("span.torrent-info__download-modifier.torrent-info__download-modifier--half");
                            const trumpableSpan = torrent.querySelector("span.torrent-info__trumpable");
                            const reportedSpan = torrent.querySelector("span.torrent-info__reported");

                            const freeleechSpanHtml = freeleechSpan ? freeleechSpan.outerHTML : '';
                            const halfleechSpanHtml = halfleechSpan ? halfleechSpan.outerHTML : '';
                            const trumpableSpanHtml = trumpableSpan ? trumpableSpan.outerHTML : '';
                            const reportedSpanHtml = reportedSpan ? reportedSpan.outerHTML : '';

                            [freeleechSpan, halfleechSpan, trumpableSpan, reportedSpan].forEach(span => {
                                if (span) span.remove(); // Remove the element temporarily
                            });

                            // Define patterns to keep full stops
                            const keepPatterns = [
                                /\b\d\.\d\b/g,
                                /\bDD\d\.\d\b/g,
                                /\bDDP\d\.\d\b/g,
                                /\bDD\+\d\.\d\b/g,
                                /\bTrueHD \d\.\d\b/g,
                                /\bDTS\d\.\d\b/g,
                                /\bAC3\d\.\d\b/g,
                                /\bAAC\d\.\d\b/g,
                                /\bOPUS\d\.\d\b/g,
                                /\bMP3\d\.\d\b/g,
                                /\bFLAC\d\.\d\b/g,
                                /\bLPCM\d\.\d\b/g,
                                /\bH\.264\b/g,
                                /\bH\.265\b/g,
                                /\bDTS-HD MA \d\.\d\b/g
                            ];

                            let ptp_info_text = matchingDom.info_text;

                            // Function to replace full stops outside of the patterns
                            const replaceFullStops = (text) => {
                                // Map to store original patterns and their placeholders
                                const placeholders = new Map();
                                let tempText = text;

                                // Define patterns to keep full stops
                                const keepPatterns = [
                                    /\b\d\.\d\b/g,
                                    /\bDD\d\.\d\b/g,
                                    /\bDDP\d\.\d\b/g,
                                    /\bDD\+\d\.\d\b/g,
                                    /\bTrueHD \d\.\d\b/g,
                                    /\bDTS\d\.\d\b/g,
                                    /\bAC3\d\.\d\b/g,
                                    /\bAAC\d\.\d\b/g,
                                    /\bOPUS\d\.\d\b/g,
                                    /\bMP3\d\.\d\b/g,
                                    /\bFLAC\d\.\d\b/g,
                                    /\bLPCM\d\.\d\b/g,
                                    /\bH\.264\b/g,
                                    /\bH\.265\b/g,
                                    /\bDTS-HD MA \d\.\d\b/g,
                                    /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                ];

                                // Temporarily replace patterns with placeholders
                                keepPatterns.forEach((pattern, index) => {
                                    tempText = tempText.replace(pattern, (match) => {
                                        const placeholder = `__PLACEHOLDER${index}__`;
                                        placeholders.set(placeholder, match);
                                        return placeholder;
                                    });
                                });

                                // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                // Restore the original patterns from the placeholders
                                placeholders.forEach((original, placeholder) => {
                                    tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                });

                                // Additional replacements
                                tempText = tempText
                                    .replace(/DD\+/g, 'DD+ ')
                                    .replace(/DDP/g, 'DD+ ')
                                    .replace(/DoVi/g, 'DV')
                                    .replace(/\(/g, '')
                                    .replace(/\)/g, '')
                                    .replace(/\bhdr\b/g, 'HDR')
                                    .replace(/\bweb\b/g, 'WEB')
                                    .replace(/\bbluray\b/gi, 'BluRay')
                                    .replace(/\bh254\b/g, 'H.264')
                                    .replace(/\bh265\b/g, 'H.265')
                                    .replace(/\b\w/g, char => char.toUpperCase())
                                    .replace(/\bX264\b/g, 'x264')
                                    .replace(/\bX265\b/g, 'x265')
                                    .replace(/\b - \b/g, ' ');

                                return tempText;
                            };

                            // Clean ptp_info_text by replacing full stops according to the rules
                            const cleanedPtpInfoText = replaceFullStops(ptp_info_text);

                            // Re-add the extracted HTML elements after making the modifications
                            // Construct the final innerHTML string
                            let finalHtml = show_tracker_name
                                ? `[PTP]${improved_tags ? ' /' : ''} ${cleanedPtpInfoText}`
                                : `${cleanedPtpInfoText}`;

                            [freeleechSpanHtml, halfleechSpanHtml, trumpableSpanHtml, reportedSpanHtml].forEach(spanHtml => {
                                if (spanHtml) finalHtml += ` / ${spanHtml}`;
                            });

                            torrent.innerHTML = finalHtml;
                        }
                    }
                } else {
                    if (d.className !== "group_torrent") {
                        const torrent = d.querySelector("a.torrent-info-link");
                        if (torrent) {
                            if (improved_tags && show_tracker_name) {
                                torrent.innerHTML = "[PTP] / " + torrent.innerHTML;
                            } else if (show_tracker_name) {
                                torrent.innerHTML = "[PTP] " + torrent.innerHTML;
                            }
                        }
                    }
                }
            });
        };

        const add_filters_div = (trackers, discounts, qualities) => {
            let addBeforeThis = document.querySelector("#movieinfo");

            let div = document.createElement("div");
            div.className = "panel__body";
            div.style.padding = "0 10px 5px 10px";

            let filterByTracker = document.createElement("div");
            filterByTracker.style = "display: flex; align-items: baseline";

            let label = document.createElement("div");
            label.textContent = "Tracker: ";
            label.style.cursor = "default";
            label.style.flex = "0 0 60px";
            filterByTracker.appendChild(label);

            filterByTracker.style.margin = "4px 0";

            let trackerContents = document.createElement("div");

            trackers.forEach((tracker_name) => {
                let div = document.createElement("div");
                div.id = `filter-${tracker_name.toLowerCase()}`;
                div.className = "filter-box";
                div.textContent = tracker_name;
                div.style.padding = "2px 5px";
                div.style.margin = "3px";
                div.style.color = "#eee";
                div.style.display = "inline-block";
                div.style.cursor = "pointer";
                // div.style.width = "40px"
                div.style.border = "1px dashed #606060";
                div.style.fontSize = "1em";
                div.style.textAlign = "center";

                div.addEventListener("click", () => {
                    update_filter_box_status("trackers", tracker_name, div);
                });

                trackerContents.append(div);
            });

            filterByTracker.append(trackerContents);
            div.append(filterByTracker);

            let additional_settings = document.createElement("div"); // discounts
            additional_settings.style = "display: flex; align-items: baseline";

            let label_2 = document.createElement("div");
            label_2.textContent = "Discount: ";
            label_2.style.cursor = "default";
            label_2.style.flex = "0 0 60px";
            additional_settings.appendChild(label_2);

            let discountContents = document.createElement("div");

            discounts.forEach((discount_name) => {
                let only_discount = document.createElement("div");
                only_discount.className = "filter-box";
                only_discount.textContent = discount_name;
                only_discount.style.padding = "2px 5px";
                only_discount.style.margin = "3px";
                only_discount.style.color = "#eee";
                only_discount.style.display = "inline-block";
                only_discount.style.cursor = "pointer";
                only_discount.style.border = "1px dashed #606060";
                only_discount.style.fontSize = "1em";

                only_discount.addEventListener("click", () => {
                    update_filter_box_status("discounts", discount_name, only_discount);
                });
                discountContents.append(only_discount);
            });

            additional_settings.append(discountContents);
            div.append(additional_settings);

            ///////
            let filterByQuality = document.createElement("div");
            filterByQuality.style = "display: flex; align-items: baseline";

            let label_3 = document.createElement("div");
            label_3.textContent = "Quality: ";
            label_3.style.cursor = "default";
            label_3.style.flex = "0 0 60px";
            filterByQuality.appendChild(label_3);

            filterByQuality.style.margin = "4px 0";

            let qualityContents = document.createElement("div");

            qualities.forEach((quality_name) => {

                let quality = document.createElement("div");
                quality.className = "filter-box";
                quality.textContent = quality_name;
                quality.style.padding = "2px 5px";
                quality.style.margin = "3px";
                quality.style.color = "#eee";
                quality.style.display = "inline-block";
                quality.style.cursor = "pointer";
                quality.style.border = "1px dashed #606060";
                quality.style.fontSize = "1em";
                quality.style.textAlign = "center";

                quality.addEventListener("click", () => {
                    update_filter_box_status("qualities", quality_name, quality);
                });

                qualityContents.append(quality);
            });

            filterByQuality.append(qualityContents);
            div.append(filterByQuality);

            /////////////////////
            let filterByText = document.createElement("div");
            filterByText.style.margin = "8px 0 0";

            let input = document.createElement("input");
            input.className = "torrent-search search-bar__search-field__input";
            input.type = "text";
            input.spellcheck = false;
            input.placeholder = "Search torrents...";
            input.style.fontSize = "1em";
            input.style.width = "84%";

            input.addEventListener("input", (e) => {
                filter_torrents();
            });

            filterByText.appendChild(input);

            // reset btn
            let rst = document.createElement("div");
            rst.textContent = "⟳";

            rst.style.padding = "4px 8px";
            rst.style.margin = "0px 4px";
            rst.style.color = "#eee";
            rst.style.display = "inline-block";
            rst.style.cursor = "pointer";
            rst.style.border = "1px dashed #606060";
            rst.style.fontSize = "1em";
            rst.style.textAlign = "center";

            rst.addEventListener("click", () => {
                document.querySelector(".torrent-search").value = "";
                filters = {
                    "trackers": trackers.map((e) => {
                        return ({ "name": e, "status": "default" });
                    }),
                    "discounts": discounts.map((e) => {
                        return ({ "name": e, "status": "default" });
                    }),
                    "qualities": qualities.map((e) => {
                        return ({ "name": e, "status": "default" });
                    }),
                };

                filter_torrents();

                document.querySelectorAll(".filter-box").forEach(d => {
                    d.style.background = "";
                    d.style.color = "#eee";
                });
            });

            filterByText.appendChild(rst);

            div.appendChild(filterByText);

            const panel = document.createElement("div");
            panel.className = "panel";
            const panelHeading = document.createElement("div");
            panelHeading.className = "panel__heading";

            const panelHeadingTitle = document.createElement("span");
            panelHeadingTitle.textContent = "Filter Releases";
            panelHeadingTitle.className = "panel__heading__title";
            panelHeading.append(panelHeadingTitle);

            panel.append(panelHeading, div);


            addBeforeThis.insertAdjacentElement("beforeBegin", panel);

            // done.
        };

        const get_example_div = () => {
            let tr = document.createElement("tr");
            tr.className = "group_torrent group_torrent_header";
            tr.id = "group_torrent_header";
            tr["data-releasename"] = "release_name_here";
            tr["data-releasegroup"] = "group_name_here";

            let td = document.createElement("td");
            td.style.width = "596px";

            let span = document.createElement("span");
            span.className = "basic-movie-list__torrent__action";
            span.style.marginLeft = "12px";
            span.textContent = "[";

            if (hideBlankLinks === "DL") {
                let a = document.createElement("a");
                a.href = "#";
                a.className = "link_1";
                a.textContent = " DL ";
                a.title = "Download";
                span.appendChild(a); // Append the <a> element to the <span> element
            } else if (hideBlankLinks === "Download") {
                let aDownload = document.createElement("a"); // Create a new <a> element for "Download"
                aDownload.href = "#";
                aDownload.className = "link_1";
                aDownload.textContent = " DOWNLOAD ";
                aDownload.title = "Download";
                span.appendChild(aDownload); // Append the <a> element to the <span> element
            }
            else if (hideBlankLinks === "Spaced") {
                let aSpaced = document.createElement("a"); // Create a new <a> element for "Spaced"
                aSpaced.href = "#";
                aSpaced.className = "link_1";
                aSpaced.title = "Download";
                aSpaced.style.paddingLeft = "3px";
                aSpaced.style.paddingRight = "51px";
                let textNode = document.createTextNode("DL"); // Create a text node with "DL"
                aSpaced.appendChild(textNode); // Append the text node to the <a> element

                span.appendChild(aSpaced); // Append the <a> element to the <span> element
            }

            span.innerHTML += "]"; // Append closing bracket to the span element

            let a2 = document.createElement("a");
            a2.href = "#";
            a2.className = "link_2";
            a2.style.marginRight = "4px";

            let img = document.createElement("img");
            img.style.width = "12px";
            img.style.height = "12px";
            img.src = "static/common/check.png";
            img.alt = "☑";
            img.title = "Tracker title";

            a2.appendChild(img);

            let a3 = document.createElement("a");
            a3.href = "link_3";
            a3.className = "torrent-info-link link_3";
            a3.textContent = "INFO_TEXT_HERE";

            td.appendChild(span);
            td.appendChild(a2);
            td.appendChild(a3);

            let td2 = document.createElement("td");
            td2.className = "nobr";
            td2.style.width = "63px";

            let span2 = document.createElement("span");
            span2.className = "size-span";
            span2.style.float = "left";
            span2.title = "SIZE_IN_BYTES_HERE";
            span2.textContent = "TORRENT_SIZE_HERE";
            td2.appendChild(span2);

            let td3 = document.createElement("td");
            let td4 = document.createElement("td");
            let td5 = document.createElement("td");

            tr.appendChild(td);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td5);

            return tr;
        };

        const disable_highlight = () => {
            document.querySelector(".filter-container").addEventListener("mousedown", function (event) {
                if (event.detail > 1) {
                    event.preventDefault();
                    // of course, you still do not know what you prevent here...
                    // You could also check event.ctrlKey/event.shiftKey/event.altKey
                    // to not prevent something useful.
                }
            }, false);

            document.querySelector("table.torrent_table > thead").addEventListener("mousedown", function (event) {
                if (event.detail > 1) {
                    event.preventDefault();
                    // of course, you still do not know what you prevent here...
                    // You could also check event.ctrlKey/event.shiftKey/event.altKey
                    // to not prevent something useful.
                }
            }, false);
        };

        const get_sorted_qualities = (qualities) => {
            let arr = [];

            qualities.forEach(q => {

                if (q === "SD") arr.push({ "value": 0, "name": q });
                else if (q === "480p") arr.push({ "value": 1, "name": q });
                else if (q === "576p") arr.push({ "value": 2, "name": q });
                else if (q === "720p") arr.push({ "value": 3, "name": q });
                else if (q === "1080p") arr.push({ "value": 4, "name": q });
                else if (q === "2160p") arr.push({ "value": 5, "name": q });

            });

            return arr.sort((a, b) => (a.value > b.value) ? 1 : -1).map(e => e.name);
        };

        const get_sorted_discounts = (discounts) => {
            let arr = [];

            discounts.forEach(q => {
                if (q === "None") arr.push({ "value": 0, "name": q });
                else if (q === "Rescuable") arr.push({ "value": 1, "name": q });
                else if (q === "Rewind") arr.push({ "value": 2, "name": q });
                else if (q === "Refundable") arr.push({ "value": 3, "name": q });
                else if (q === "25% Freeleech") arr.push({ "value": 4, "name": q });
                else if (q === "Copper") arr.push({ "value": 5, "name": q });
                else if (q === "30% Bonus") arr.push({ "value": 6, "name": q });
                else if (q === "40% Bonus") arr.push({ "value": 7, "name": q });
                else if (q === "50% Freeleech") arr.push({ "value": 8, "name": q });
                else if (q === "Bronze") arr.push({ "value": 9, "name": q });
                else if (q === "75% Freeleech") arr.push({ "value": 10, "name": q });
                else if (q === "Silver") arr.push({ "value": 11, "name": q });
                else if (q === "Freeleech") arr.push({ "value": 12, "name": q });
                else if (q === "Golden") arr.push({ "value": 13, "name": q });
                else if (q === "Pollination") arr.push({ "value": 14, "name": q });
            });

            return arr.sort((a, b) => (a.value < b.value) ? 1 : -1).map(e => e.name);
        };

        const get_reduced_trackers = (doms) => {
            let lst = []; // default

            doms.forEach(t => {
                if (lst.includes(t.tracker) === false) lst.push(t.tracker);
            });

            return lst.sort((a, b) => a > b ? 1 : -1);
        };

        const get_reduced_discounts = (doms) => {
            let lst = [];

            doms.forEach(t => {
                if (lst.includes(t.discount) === false) lst.push(t.discount);
            });

            return get_sorted_discounts(lst);
        };

        const get_reduced_qualities = (doms) => {
            let lst = [];

            qualities.forEach(q => {
                for (let i = 0; i < doms.length; i++) {
                    if (doms[i].info_text.toLowerCase().includes(q.toLowerCase()) && q != "SD" && !lst.includes(q)) {
                        lst.push(q);
                        break;
                    }
                }
            });

            return get_sorted_qualities(lst.concat(["SD"]));
        };

        let seed_desc = true;
        let leech_desc = true;
        let snatch_desc = true;
        let size_desc = true;

        const add_sort_listeners = () => {
            let seed_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].filter(e => e.querySelector("img") != null).find(t => t.querySelector("img").src.includes("seeders.png"));

            seed_th.style.cursor = "pointer";
            seed_th.addEventListener("click", () => {
                if (seed_desc) doms = doms.sort((a, b) => parseInt(a.seeders) < parseInt(b.seeders) ? 1 : -1);
                else doms = doms.sort((a, b) => parseInt(a.seeders) > parseInt(b.seeders) ? 1 : -1);

                seed_desc = !seed_desc;

                document.querySelectorAll(".group_torrent").forEach(d => d.remove());

                doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
            });

            /////////////////////////////////////
            let leech_th = [...document.querySelector("table.torrent_table").querySelectorAll("th.sign")].filter(e => e.querySelector("img") != null).find(t => t.querySelector("img").src.includes("leechers.png"));

            leech_th.style.cursor = "pointer";
            leech_th.addEventListener("click", () => {
                if (leech_desc) doms = doms.sort((a, b) => parseInt(a.leechers) < parseInt(b.leechers) ? 1 : -1);
                else doms = doms.sort((a, b) => parseInt(a.leechers) > parseInt(b.leechers) ? 1 : -1);

                leech_desc = !leech_desc;

                document.querySelectorAll(".group_torrent").forEach(d => d.remove());

                doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
            });

            ////////////////////////////
            let snatch_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].filter(e => e.querySelector("img") != null).find(t => t.querySelector("img").src.includes("snatched.png"));

            snatch_th.style.cursor = "pointer";
            snatch_th.addEventListener("click", () => {
                if (snatch_desc) doms = doms.sort((a, b) => parseInt(a.snatchers) < parseInt(b.snatchers) ? 1 : -1);
                else doms = doms.sort((a, b) => parseInt(a.snatchers) > parseInt(b.snatchers) ? 1 : -1);

                snatch_desc = !snatch_desc;

                document.querySelectorAll(".group_torrent").forEach(d => d.remove());

                doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
            });

            /////////////////////////////////
            let size_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].find(e => e.textContent === "Size");

            size_th.style.cursor = "pointer";
            size_th.addEventListener("click", () => {

                if (size_desc) doms = doms.sort((a, b) => parseInt(a.size) < parseInt(b.size) ? 1 : -1);
                else doms = doms.sort((a, b) => parseInt(a.size) > parseInt(b.size) ? 1 : -1);

                size_desc = !size_desc;

                document.querySelectorAll(".group_torrent").forEach(d => d.remove());

                doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
            });
        };

        let line_example = get_example_div();
        let group_header_example = document.querySelector("tr.group_torrent").cloneNode(true);
        let original_table;

        function displayAlert(text, backgroundColor = "red") {
            const alert = document.createElement("div");
            alert.className = "alert text--center alert-fade";
            alert.textContent = text;
            alert.style = `background-color: ${backgroundColor}; color: white`;
            document.querySelector("#content").prepend(alert);

            setTimeout(() => {
                alert.classList.add("alert-fade-out");
                setTimeout(() => {
                    alert.remove();
                }, 1000);
            }, timerDuration);
        }

        const mainFunc = async () => {
            if (show_tracker_name || improved_tags || ptp_release_name) {
                fix_ptp_names();
            }

            let imdb_id;

            try {
                // Attempt to fetch the IMDb ID from a specific link
                imdb_id = "tt" + document.getElementById("imdb-title-link").href.split("/tt")[1].split("/")[0];
            } catch (e) {
                console.log("Failed to extract IMDb ID using imdb-title-link, attempting fallback method:", e);
                // Fallback to fetching the IMDb ID from any link within a `.rating` element that includes an IMDb URL
                try {
                    imdb_id = "tt" + [...document.querySelectorAll(".rating")]
                        .find(a => a.href.includes("imdb.com"))
                        .href.split("/tt")[1]
                        .split("/")[0];
                } catch (fallbackError) {
                    console.log("Failed to extract IMDb ID using fallback method:", fallbackError);
                }
            }

            let name_url = document.querySelector("h2.page__title").textContent.trim();
            let show_name;
            let show_nbl_name;
            const akaIndex = name_url.indexOf(" AKA ");
            if (akaIndex !== -1) {
                show_name = name_url.substring(0, akaIndex);
                show_nbl_name = show_name;
            } else {
                const yearMatch = name_url.match(/\[\d{4}\]/);
                show_name = yearMatch ? name_url.substring(0, yearMatch.index).trim() : name_url;
                show_nbl_name = show_name;
            }

            const colonIndex = show_nbl_name.indexOf(":");
            if (colonIndex !== -1) {
                show_nbl_name = show_nbl_name.substring(0, colonIndex);
            }

            show_name = show_name.trim().replace(/[\s:]+$/, '');
            show_nbl_name = show_nbl_name.trim().replace(/[\s:]+$/, '');

            let promises = [];
            trackers.forEach(t => promises.push(fetch_tracker(t, imdb_id, show_name, show_nbl_name)));

            Promise.all(promises)
                .then(torrents_lists => {
                    var all_torrents = [].concat.apply([], torrents_lists).sort((a, b) => a.size < b.size ? 1 : -1);
                    add_external_torrents(all_torrents);
                    document.querySelectorAll(".basic-movie-list__torrent__action").forEach(d => { d.style.marginLeft = "12px"; });
                    original_table = document.querySelector("table.torrent_table").cloneNode(true);

                    // Only apply default filters if there are any specified
                    if (show_only_by_default.length > 0 || show_resolution_by_default.length > 0) {
                        apply_default_filters();
                    }

                    localStorage.setItem("play_now_flag", "true");
                });
        };

        const addLink = function () {
            var menu = document.querySelector("#content > div > div.linkbox");
            if (menu) {
                var newLink = document.createElement("a");
                newLink.id = "other-trackers";
                newLink.textContent = "[Other Trackers]";
                newLink.href = "#";
                newLink.className = "linkbox_link";
                const clickHandler = function (e) {
                    e.preventDefault();
                    mainFunc();
                    newLink.removeEventListener('click', clickHandler); // Ensure the function only runs once by removing the event listener after the first click
                };
                newLink.addEventListener('click', clickHandler);
                menu.appendChild(newLink);
            }
        };

        if (!run_by_default) {
            addLink();
        } else {
            mainFunc();
        }
    }
})();