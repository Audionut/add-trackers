// ==UserScript==
// @name         PTP - Add releases from other trackers
// @namespace    https://github.com/Audionut/add-trackers
// @version      3.9.7-A
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
// @require      https://github.com/Audionut/add-trackers/raw/main/scene_groups.js
// ==/UserScript==

(function () {
    "use strict";

    const fields = {
        "aither": {"label": "Aither *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "aither_api": {"label": "AITHER_API_TOKEN", "type": "text", "default": ""},
        "avistaz": {"label": "Avistaz", "type": "checkbox", "default": false},
        "ant": {"label": "ANT *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "ant_api": {"label": "ANT_API_TOKEN", "type": "text", "default": ""},
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
        "lst": {"label": "LST *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "lst_api": {"label": "LST_API_TOKEN", "type": "text", "default": ""},
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
        "rtf": {"label": "RTF *", "type": "checkbox", "default": false, "tooltip": "Enter API key below. Alternatively, you can enter your details at bottom of settings to automatically grab and update API key"},
        "rtf_api": {"label": "RTF_API_TOKEN", "type": "text", "default": ""},
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
        "btntimer": {"label": "Timer for BTN TVDB ID searches via Sonarr (ms)", "type": "int", "default": 800, "tooltip": "If you don't use Sonarr you can set this very low, but the main script delay is overall site response, not this response"},
        "tracker_by_default": {"label": "Only these sites by default", "type": "text", "default": "", "tooltip": "Show only these sites by default. Comma separated. PTP, BHD, ANT, etc"},
        "res_by_default": {"label": "Only these resolutions by default", "type": "text", "default": "", "tooltip": "Show only these resolutions by default. Comma separated, with valued values. SD, 480p, 576p, 720p, 1080p, 2160p"},
        "hideBlankLinks": {"label": "How to display download link", "type": "select", "options": ["DL", "Download", "Spaced"], "default": "DL", "tooltip": "Choose how to display the download links: DL (original method), DOWNLOAD, or Spaced. Other methods help with some stylesheets."},
        "timer": {"label": "Error timeout (seconds)", "type": "int", "default": 4, "tooltip": "Set the error timeout duration in seconds to skip slow/dead trackers"},
        "timerDuration": {"label": "Error display duration (seconds)", "type": "int", "default": 2, "tooltip": "Set the duration for displaying errors in seconds"},
        "debugging": {"label": "Enable debugging", "type": "checkbox", "default": false, "tooltip": "Enable this to help track down issues, then browse a torrent page and look in browser console"},
        "rtf_login": {"label": "Get RTF API key", "type": "checkbox", "default": false, "tooltip": "Enter your RTF username and password below to automatically grab and update RTF API key"},
        "rtf_user": {"label": "RTF Username", "type": "text", "default": ""},
        "rtf_pass": {"label": "RTF Password", "type": "text", "default": ""}
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
            "tvv": ["tvv_auth", "tvv_torr"],
            "rtf_login": ["rtf_user", "rtf_pass"]
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
                    "ant": GM_config.fields.ant.node,
                    "bhd": GM_config.fields.bhd.node,
                    "blu": GM_config.fields.blu.node,
                    "btn": GM_config.fields.btn.node,
                    "hdb": GM_config.fields.hdb.node,
                    "lst": GM_config.fields.lst.node,
                    "mtv": GM_config.fields.mtv.node,
                    "nbl": GM_config.fields.nbl.node,
                    "huno": GM_config.fields.huno.node,
                    "oe": GM_config.fields.oe.node,
                    "rfx": GM_config.fields.rfx.node,
                    "rtf": GM_config.fields.rtf.node,
                    "rtf_login": GM_config.fields.rtf_login.node,
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
            "LST": GM_config.get("lst"),
            "ANT": GM_config.get("ant"),
            "CG": GM_config.get("cg"),
        };

        const movie_only_dict = {
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
        const LST_API_TOKEN = GM_config.get("lst_api");
        const ANT_API_TOKEN = GM_config.get("ant_api");
        const RTF_API_TOKEN = GM_config.get("rtf_api");
        const RTF_USER = GM_config.get("rtf_user");
        const RTF_PASS = GM_config.get("rtf_pass");
        const RTF_LOGIN = GM_config.get("rtf_login");

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
        const btnTimer = GM_config.get("btntimer");
        const debug = GM_config.get("debugging");

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

        function toUnixTime(dateString) {
            // Check if the date string is in the ISO 8601 format (ends with 'Z' or includes time zone offset)
            if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-')) {
                return Math.floor(new Date(dateString).getTime() / 1000);
            }

            // Check if the date string is in 'YYYY-MM-DD HH:MM:SS' format
            else if (dateString.includes('-') && dateString.includes(':')) {
                return Math.floor(new Date(dateString.replace(' ', 'T') + 'Z').getTime() / 1000);
            }

            // Check if the date string is in the format "Sat, 20 Jun 2015 01:58:58 +0000"
            else if (Date.parse(dateString)) {
                return Math.floor(new Date(dateString).getTime() / 1000);
            }

            // Parse relative time strings
            else {
                const now = new Date();
                const regex = /(\d+)\s*(years?|months?|weeks?|days?|hours?|mins?|minutes?|secs?|seconds?)/g;
                let match;

                while ((match = regex.exec(dateString)) !== null) {
                    const value = parseInt(match[1], 10);
                    const unit = match[2].toLowerCase();

                    switch (unit) {
                        case 'year':
                        case 'years':
                            now.setFullYear(now.getFullYear() - value);
                            break;
                        case 'month':
                        case 'months':
                            now.setMonth(now.getMonth() - value);
                            break;
                        case 'week':
                        case 'weeks':
                            now.setDate(now.getDate() - (value * 7));
                            break;
                        case 'day':
                        case 'days':
                            now.setDate(now.getDate() - value);
                            break;
                        case 'hour':
                        case 'hours':
                            now.setHours(now.getHours() - value);
                            break;
                        case 'min':
                        case 'mins':
                        case 'minute':
                        case 'minutes':
                            now.setMinutes(now.getMinutes() - value);
                            break;
                        case 'sec':
                        case 'secs':
                        case 'second':
                        case 'seconds':
                            now.setSeconds(now.getSeconds() - value);
                            break;
                        default:
                            break;
                    }
                }

                return Math.floor(now.getTime() / 1000);
            }
        }

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
            else if (text.includes("1080p") || text.includes("1080i")) return "1080p";
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
            if (["BLU", "Aither", "RFX", "OE", "TIK", "HUNO", "LST"].includes(tracker)) {
                return true;
            }
            else if (tracker === "FL") {
                if ([...div.querySelectorAll("img")].find(e => e.alt === "FreeLeech") != undefined) return "Freeleech";
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

        const trackerIcons = {
            "BHD": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAA57mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMwNjcgNzkuMTU3NzQ3LCAyMDE1LzAzLzMwLTIzOjQwOjQyICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgICAgICAgICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgICAgICAgICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cyk8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhtcDpDcmVhdGVEYXRlPjIwMTktMDItMThUMTg6Mjk6NDYtMDU6MDA8L3htcDpDcmVhdGVEYXRlPgogICAgICAgICA8eG1wOk1vZGlmeURhdGU+MjAxOS0wMy0wMlQxNjoxNDoyOS0wNTowMDwveG1wOk1vZGlmeURhdGU+CiAgICAgICAgIDx4bXA6TWV0YWRhdGFEYXRlPjIwMTktMDMtMDJUMTY6MTQ6MjktMDU6MDA8L3htcDpNZXRhZGF0YURhdGU+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgICAgIDxwaG90b3Nob3A6Q29sb3JNb2RlPjM8L3Bob3Rvc2hvcDpDb2xvck1vZGU+CiAgICAgICAgIDx4bXBNTTpJbnN0YW5jZUlEPnhtcC5paWQ6N2MyNzA3MjItZTgwYy05YjQ3LWEyZWUtYjg1ZmNmYjg4NTFmPC94bXBNTTpJbnN0YW5jZUlEPgogICAgICAgICA8eG1wTU06RG9jdW1lbnRJRD5hZG9iZTpkb2NpZDpwaG90b3Nob3A6MTBiYzVjZTEtM2QzMC0xMWU5LTkxZWMtOWM1ZTJjZWNhNzVkPC94bXBNTTpEb2N1bWVudElEPgogICAgICAgICA8eG1wTU06T3JpZ2luYWxEb2N1bWVudElEPnhtcC5kaWQ6MTZhOWIyZGYtYjQ5Yi0yMzQ5LTk4YmEtZTEwMjQwYjRjYmM2PC94bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+CiAgICAgICAgIDx4bXBNTTpIaXN0b3J5PgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+Y3JlYXRlZDwvc3RFdnQ6YWN0aW9uPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6aW5zdGFuY2VJRD54bXAuaWlkOjE2YTliMmRmLWI0OWItMjM0OS05OGJhLWUxMDI0MGI0Y2JjNjwvc3RFdnQ6aW5zdGFuY2VJRD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OndoZW4+MjAxOS0wMi0xOFQxODoyOTo0Ni0wNTowMDwvc3RFdnQ6d2hlbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OnNvZnR3YXJlQWdlbnQ+QWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpPC9zdEV2dDpzb2Z0d2FyZUFnZW50PgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+c2F2ZWQ8L3N0RXZ0OmFjdGlvbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0Omluc3RhbmNlSUQ+eG1wLmlpZDo3YzI3MDcyMi1lODBjLTliNDctYTJlZS1iODVmY2ZiODg1MWY8L3N0RXZ0Omluc3RhbmNlSUQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDp3aGVuPjIwMTktMDMtMDJUMTY6MTQ6MjktMDU6MDA8L3N0RXZ0OndoZW4+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpzb2Z0d2FyZUFnZW50PkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE1IChXaW5kb3dzKTwvc3RFdnQ6c29mdHdhcmVBZ2VudD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OmNoYW5nZWQ+Lzwvc3RFdnQ6Y2hhbmdlZD4KICAgICAgICAgICAgICAgPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC94bXBNTTpIaXN0b3J5PgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpYUmVzb2x1dGlvbj43MjAwMDAvMTAwMDA8L3RpZmY6WFJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOllSZXNvbHV0aW9uPjcyMDAwMC8xMDAwMDwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT42NTUzNTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MjU2PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjI1NjwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+g7FyvAAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAABSIUlEQVR42uy9d5gc1ZW4/d6q6jjdk3PUSAwCCRAII5EROdnGxhF7jI131zaLc8AJvM7+Oa3XXq/5HNZRzmmNAWOiyGIECIRAQqM0OefpXFX3+6O6p3uCpJnRJI3ueZ7RjLqrOtyq855wzz1XEJAoOabFA3iTP37ABRhAFNAAX/K5QPJ4AxCABBKAlXxcJv82k89bQDh5TAGQlfw7nvwdBrqAgeTxIuN1AWx1aZa+iKMGwFV/mNMPlI1FBUGkhAFtFHd2CX6hYUuBlBJp6Ni6wB23sTULgcTWNETUjyYt0E2E6SGelUDYAh0bG4ltg1uzMTWNhCbwxG1Mt44tJS4TXLqLnpEB9CwXASOIjEukpuHSLGKJEYbjNiWBXCzbQpoWthBohoZLQk94CJfmIujyYWm2owlSYCNAgtAczbBtG9sQ2JrAEwdbsxHS0TSBwNAspC2whQDbRiJASvb+/kI3sAqoBVYC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",
            "BLU": " data:image/png;base64,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",
            "Aither": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACYElEQVQokT2RS2sUQRSFb9169MOZScc8TBQN0Wg2URBB3Sj+ZHe6VhQloAgu1GjMQxMhycx093RXdVfVvS5G3BzO4izOxye2nzwbLq8MlleK9atSaQAAgLacMpFAzEYjW1XT0999284uzl1dqeTSYHRlrVi/lheFSdLOWSYKfddMxgtX1vPFRZ1mKGVvW52mtiyVybLhyuqtra0+hEjUObuytLRzc3PStABwXs/IBJPnebGYF4tn+98VKpWNFs6qmmK8u3H94damkVIiaim7EGrrPh4ej38dp0Mo1q424wsVuq48PTktp6u3bi/kd3Z/HJwcHTWTsdR6YW19e+PG/Y3rddOc7f8wWc5EqmubP3tfB5eXtm5uPn/x8uDDbvReIAKAMubbYHht597Tx4/eVdWfb19cXSlvbfR+4/6Dz58+7b19TSH4zqGUiLKbzVxdt+UUmKU2s4tz7xwyEYWQDoZ7b15F70PfRe+7pumd7W3bNTNblj9339uq9NZSDDIbjRBRJcnF4UHoXOh7jhEA5gkARJFiTIfD6emJrUqpkwQAlEnGx0eh7ykEZgZmgQjMTDTvJs3q87N2MlFM5J2z5TQGP7crBDIAMwMAMIMQKGVbTr1zIIRMB0MhQCDG3kfvmQgAQMC/NQDFIJWS2ri6jsHLvCjm3DpNo/f/rwMzMzETCGGyvG+a3lkAkCbLmTkGj1JKpVFKZmYiZhaIKJVOUiayVUkhUIxKIEqtmYiJAFGnqeJkji6VQqWEELauhBDSmBiCEkJIpaPv575i8EobVCp6j0r1bUsUo/fALLQWQvwFLByUKNhkQJ4AAAAASUVORK5CYII=",
            "RFX": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAANTmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjFmYzZkZjJlLWI2ZWItZTQ0MC1hNWE5LWNmODMwYzdmYzExOCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmNmE5ZjY0NS0xYmI5LWUyNGUtYWFhNy1jZDViZmFkZmRkNDEiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0iN0FEQjYyMDkyRDdCODM4RDFCRUU1RUU2NDExOTk3NTIiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiIgeG1wOkNyZWF0ZURhdGU9IjIwMjEtMDgtMDFUMDg6MjY6NTYtMDQ6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIxLTA4LTAxVDEzOjE2OjExLTA0OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIxLTA4LTAxVDEzOjE2OjExLTA0OjAwIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgdGlmZjpJbWFnZVdpZHRoPSIxMDI0IiB0aWZmOkltYWdlTGVuZ3RoPSIxMDI0IiB0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb249IjIiIHRpZmY6T3JpZW50YXRpb249IjEiIHRpZmY6U2FtcGxlc1BlclBpeGVsPSIzIiB0aWZmOlhSZXNvbHV0aW9uPSI3MjAwMDAvMTAwMDAiIHRpZmY6WVJlc29sdXRpb249IjcyMDAwMC8xMDAwMCIgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIgZXhpZjpFeGlmVmVyc2lvbj0iMDIzMSIgZXhpZjpDb2xvclNwYWNlPSIxIiBleGlmOlBpeGVsWERpbWVuc2lvbj0iMjU2IiBleGlmOlBpeGVsWURpbWVuc2lvbj0iMjU2Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZmRiMjJhMGItZTYzOS1hMjRlLWFiYmQtODk4OTJmYWNhMzZhIiBzdEV2dDp3aGVuPSIyMDIxLTA4LTAxVDExOjIwOjE1LTA0OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBpbWFnZS9qcGVnIHRvIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImRlcml2ZWQiIHN0RXZ0OnBhcmFtZXRlcnM9ImNvbnZlcnRlZCBmcm9tIGltYWdlL2pwZWcgdG8gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZmJkZGE4NjgtNzlhMS1hYzQ3LWExZTItODhlYWNhYzNiNDM5IiBzdEV2dDp3aGVuPSIyMDIxLTA4LTAxVDExOjIwOjE1LTA0OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmU2N2YwZTdlLWQ5NmQtY2Y0YS05ZDg1LTk4MjM1NDU5MjVjOCIgc3RFdnQ6d2hlbj0iMjAyMS0wOC0wMVQxMzoxNjoxMS0wNDowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjb252ZXJ0ZWQiIHN0RXZ0OnBhcmFtZXRlcnM9ImZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9wbmciLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImRlcml2ZWQiIHN0RXZ0OnBhcmFtZXRlcnM9ImNvbnZlcnRlZCBmcm9tIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AgdG8gaW1hZ2UvcG5nIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmNmE5ZjY0NS0xYmI5LWUyNGUtYWFhNy1jZDViZmFkZmRkNDEiIHN0RXZ0OndoZW49IjIwMjEtMDgtMDFUMTM6MTY6MTEtMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6ZTY3ZjBlN2UtZDk2ZC1jZjRhLTlkODUtOTgyMzU0NTkyNWM4IiBzdFJlZjpkb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6ZDJjMWQ1NWQtZTBlNS05OTQwLWJmNmItZTE0NTc1YWM4ZTFhIiBzdFJlZjpvcmlnaW5hbERvY3VtZW50SUQ9IjdBREI2MjA5MkQ3QjgzOEQxQkVFNUVFNjQxMTk5NzUyIi8+IDxwaG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDxyZGY6QmFnPiA8cmRmOmxpPmFkb2JlOmRvY2lkOnBob3Rvc2hvcDplZTc5NmI3Mi1iNDcxLWE2NGItOWYxZC05MDdkYWE4NmNlYmY8L3JkZjpsaT4gPHJkZjpsaT5hZG9iZTpkb2NpZDpzdG9jazpmMDgzOWZlNi1kODAwLTRjNzktYWE2Yy1mMjYyYjczMWJlMjA8L3JkZjpsaT4gPC9yZGY6QmFnPiA8L3Bob3Rvc2hvcDpEb2N1bWVudEFuY2VzdG9ycz4gPHRpZmY6Qml0c1BlclNhbXBsZT4gPHJkZjpTZXE+IDxyZGY6bGk+ODwvcmRmOmxpPiA8cmRmOmxpPjg8L3JkZjpsaT4gPHJkZjpsaT44PC9yZGY6bGk+IDwvcmRmOlNlcT4gPC90aWZmOkJpdHNQZXJTYW1wbGU+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Ki+YoQAAPzlJREFUeJztnXlc1lXa/z9fQEDWG9lc2EEB0cSlSS0zNRVNStPMfjXzTGqKC1mNLdMzU+qM2mAKmUulNU/2pJVj7mIiIqaAaO4bmyCaWmoCws0icP3+uLGHjOV81/O9b+7363W9fBVnuc453+u6z34EIoIVK1baJja8FbBi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",
            "OE": " data:image/png;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMqv/vDOs//8zrP//M6z//zOs//8yrP+TVar/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxrv85M63//jOs//8zrP//M6z//zOs//8yrP+yKqr/DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzrf+0M6z//zOs//8zrP//M6z//zOs//8zrP/MM63/GQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADKq/zMzrP/+M6z//zOs//8zrP//M6z//zOs//8zrP/hM6r/LQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADKs/60zrP//M6z//zOs//8zrP//M6z//zOs//8zrP/wNK7/RQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANK7/LDKr//0zrP//M6z//zOs//8zrP//M6z//zOs//8zrP/6M6v/ZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM6z/pjOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrf/+Mav/hgD//wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2rv8mM6z/+zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//Mq3/pyCf/wgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAurv8WM63/oTOr/6szq/+rM6v/qzOr/6szq/+rM6v/qzOr/6szq/+rM6v/qzOr/6syq//uM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z/xDOm/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCr/zozrP/+M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//Mqz/2i+o/yYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADOt/1oyrP/4M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z/7DKr/z0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADKr/z0zrP/sM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z/9zSs/1kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADau/yYzrP/bM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//jCr/zoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGq/xUyq//FM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//Mqv/7jOr/6szq/+rM6v/qzOr/6szq/+rM6v/qzOr/6szq/+rM6v/qzOr/6szrf+hLq7/FgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADmq/wkzrP+pM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP/7NKr/JwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/wIzrP+IM63//jOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP+mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyqv9mM6z/+jOs//8zrP//M6z//zOs//8zrP//M6z//zKr//0zqv8tAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyrP9HM6v/8TOs//8zrP//M6z//zOs//8zrP//M6z//zOr/64AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzqv8tM6z/4jOs//8zrP//M6z//zOs//8zrP//M6z//jGs/zQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxp/8aM6z/zTOs//8zrP//M6z//zOs//8zrP//M6z/tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqqv8MMqz/sjOs//8zrP//M6z//zOs//8zrf/+MKv/OgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABVqv8DM6v/kjOs//8zrP//M6z//zOs//8yq/+9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMqv/cDOs//wzrP//M6z//zOs//8yqv9CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMKv/TzOs//QzrP//M6z//zOs/8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMaz/NDOs/+YzrP//M6z//zKu/0gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMa3/HzOs/9MzrP//M63/yQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM6r/DzKs/7YyrP/RAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAADAAAABgAAAAAQAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADOs/5E0rf/jMa7/Yjmq/wkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADOs/+YzrP//M6z/+DOs/4s1qv8YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADOt/4MzrP//M6z//zOr//o0rf+nNq7/EwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC6q/yEzrP/dM6z//zOs//8zrP//M6v/vzCn/yAA//8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACS2/wcxq/+GM6z/+jOs//8zrP//M6z//zOs/80yrv9CVar/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyrP8uNK3/4zOs//8zrP//M6z//zOs//4yrf/fMav/SQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANK3/jzOs//8zrP//M6z//zOs//8zrP//NKz/9zKt/2Azmf8KAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL6r/GzOs/+IzrP//M6z//zOs//8zrP//M6z//zOs//Izq/+CN7b/DgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADKs/2szrP//M6z//zOs//8zrP//M6z//zOs//8zrP/2M63/pDmq/wkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGx/xozrP/OM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zKr/7w0rP8iAP//AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEC//wQzq/93M6z/+DOs//8zrP//M6z//zOs//8zrP//M6z//zOs//wzrP+/NKr/NgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2qv8hM63/3DOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP/+M6z/4TKp/0cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM6v/dzOs//4zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs/+4xqv9dKqr/BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMK//EDKr/9UzrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8yrP/pM6v/eUC//wgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADKq/1czrP/8M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6v/9zOs/6Awr/8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC6u/xYzrP+/M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//wzrP+mN63/HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wIxrP9oM6z/9TOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8yrP/9M6z/uTKv/zMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuov8WM6z/0zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOr/9gxrP9EAP//AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMq3/YDOs//0zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrf/iNKz/SkC//wQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqqv8MM6z/KC+s/ysvrP8rL6z/Ky+s/ysvrP8rL6z/Ky+s/ysvrP8rL6z/Ky+s/ysvrP8rL6z/Ky+s/ysvrP8rMq//MzOs/9wzrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6v/7TGs/3Insf8NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACqq/wwzrP+RM6z/4TOs/+MzrP/jM6z/4zOs/+MzrP/jM6z/4zOs/+MzrP/jM6z/4zOs/+MzrP/jM6z/4zOs/+MzrP/jM6z/4zOs//UzrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//QzrP+LLrn/CwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADWq/xgzrP/IM6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP/+M63/mzGq/xUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACqq/wYxrP9iM6z/6TOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zKs/7Y1qv8wAP//AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqqv8GMaz/RDOt/+szrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOr//0zrP/PMa7/LwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCq/zAyrP/QM6v//TOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z/6jGr/0Mqqv8GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wE0rP8xNK3/tzOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs/+kxrP9iKqr/BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALqL/FjKt/54zrP/+M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP//M6z//zOs//8zrP/INar/GAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAurv8WM6v/iDOs//YzrP//M6z/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOar/CTCs/18zrP/iM6z/kQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            "CG": "data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAABMLAAATCwAAAAAAAAAAAAA0NEk1NUU1NUc1NUcuLj4dHSYABQgAWpAAm/cAnvwAnvwAnvwAnvwAnvwAnvwJofwzMzY3Nzc5OTk5OTk1NTUmJiYHBwcAPGAAjuIAnvwAnvwAnvwAnvwAnvwSpfxJuv0kJCUrKysxMTE1NTU1NTUqKioPDw8ALEYAkugQpPwBnvwAnvwAnvwZqPxVvv1bnMIEBAQNDQ0cHBwnJycrKyslJSUVFRUAFCAQbaUwfq0no+wIofwiq/xewv1Qh6gFCQwAUoIAMEwACxIGBgYPDw8VFRUPDw8GBgYABQcAChADDhQWW4RSvf0/aoQSEhIqKioAmPIAhdQAaqkARW4ALUgABgkAAgMAJjwAR3EAVooAVYgBCQ4RKjoWFhYzMzM5OTkAnvwAnvwAnPkAkukhq/wAHzEAIDMAVogAitsAmvUBnvwZbJ0ODg4uLi4zMzM3NzcAnvwAnvwAnvwBnvxOuvoFEhsAPmMAecIAnvwAnvwXp/xEodgDAwMVFRUhISEqKioAnvwAnvwAnvwAnvw6s/wJGiQAPmMAhNIAnvwGoPxGuf1Gkb4AAQIAEx4AAgMLCwsAnvwAnvwAnvwAnvwVpvwbT28BERsAiNk1sv1Svf1kuOoIHisAIDMAS3gAVYgANFMAnvwAnvwAnvwBnvwxsf1QreUECw8BDBMWQFkXQVoCDBIAFCAASnYAesMAmvUAiNkAnvwAnvwBnvwxsf1qxfsrSVoBAQIiIiINDQ0ACQ4AK0QAS3gAc7cAm/cAnvwAnvwAnvwBnvwxsf1qxforSFkXFxc1NTUmJiYLCwsAJDoAV4oAhdQAnPgAnvwAnvwAnvwAnvwwsP1qxforSFkXFxc5OTk1NTUnJycNDQ0AITUAc7gAnvwAnvwAnvwAnvwAnvwur/1qxv0sSVoXFxc5OTk5OTk2NjYpKSkPDw8AGysAba4AnvwAnvwAnvwAnvwAnvxqxv0vTmAVFR01NUg1NUg1NUgzM0UnJzUPDxUAFiMAZ6UAnvwAnvwAnvwAnvwAnvwAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//",
            "FL": "data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAClhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSzVoh8vLSwvLSwvLSwvLSzVoh/Voh/Voh/Voh8vLSwvLSylhCylhCwvLSwvLSyeeyPVoh8vLSwvLSwvLSyeeyPVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSx8ZCbVoh/Voh/Voh9bTCl8ZCbVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh8vLSwvLSwvLSx8ZCbVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh8vLSwvLSwvLSxbTCnVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh/Voh/Voh/Voh9bTCnVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "AvistaZ": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAArGklEQVR42uzIvUuVYRjH8c99nnOsRI9g2EExKWvoBXoZrJYoHCoqqLWpEIoG15qChvaGQJrqL4i2oIagKQSHNkkJEpciCk6hEdXxikAiySYP8ST3B778uC5ZlmVZlmVZlmVZlmVZlmVZm2zBYcBmqxvHaWyVrTvPEZjBR0zhNu5gApMIBFp4gIMYwXFZaXX703XM4iVe4AimEWvoqaw0LuAo7uMDJjCKS3iGWKVFxBq7hUcYk/1zAxjEDUQJOiADUEMX6uhBNzqszXkMAnbgG1qIknRZmyT/h11dye5tRdo5XLG9UaShoYpGPan3JF31pLMjpUKE71LrU/jcDAuLEQvzS969XYr51y3zc6141QzTmMFXf3cR4xjBCTxRHl/Qj6Z17NCearo2tqny8G69MjfZW8T7viKiUY3o/62Bn1tbvpf3V7WVv0Y1mn3VmOot4l69eHO1s/J4fy3dxD6cxJiVWpjFFKJEXdFGqaI0zp7amM6d2ZBGj3Wk4b3VRAUQKwthCVIiAJAIQSRJ8IOcMwGzorry+F2qgabZoQEbsIGWRRDobgVa9lVAQEBAkS2sKrKJ4sLmLu6ihqAERaOTzGg0cU2CYyZGzRijOBnFaBTjlkgANcaFSC3vP+d4z/dePerRNEI3TnK+7/edc9equuecqluvGkjYMhquUas0LDzJdnLzg3tSasUXKa5ZS/yKeJe4nyhXR0b+KpneVmXLj4nT1D+R9OhTS9+4vpF5992WFmjjAUcTrV12pyhzQyJwmrBOFwmZ+hheDmyWzfNFpHGUHKttHubk630zLSRQg7xF3E1Miu1h2ovD1xHL1T+LGKVOnlVgHv9NC+sc3pZoQ7QSx7ayhCdYBKLT5USdECsHOctJgiIJvGIPc+pKENQ8i9S/gnhKjT2vgXn2HXIM2nvieIuAHBBQJoZtCNZcx1psgfuRlrqsdk/G2sx4It4WcBtrIjZW2lwAoMTDOfVMTTh8OzGTmEycqJLSUn49FMnq05RoRRQRjYja6v+B9J3fwDz1Li04jvHAzk9R5odHW4TFHmGdLQSsqT0olnaGywT1dbjxMoe0EUH2nDKGcPM5zaTHuj4MOnh4vPlhCYAviRQB0a8TfyIg/FRVLs9Lv2LiJfn5+HTi9zJ3KHxG7JC535T2B4gZ6lsiDQfn640vUPahUx7Y+VFbi7Ctl0VAdUzIup0n9VImEn3bWbFZO1v6ClIXa8/uL7SLt7vgfLmVRUur0D5Po3ttjc61sh8L9QzrA/KxbCA9FRNxGERPVrllnfT5mzge35C7iQ7xV2liKJEnZaOqU2pTxG5obnahswd0zgNnfUCE7S3rDCVUlrrQIWWbLJeIHasPmayxYssY0bF6nidxHGl3QbCHAiNV4u4I6OjhgZYGx9dxgVBfKyxoqHFDCxMdk6d2Ut2jxMuSmX8gNhF/Id4RexZxKnGxOBUxHibGqGzZSOAw8hqxNVb+s3yjeJ/or6pBvKF19eZ3ybE4zi1icAzRgTNT0SJrhFQXHsPYNAGRXefFyWoPmOw2abdSTo4RnZhfyukxEdnkdEcH6+hCdicPrxZb3NLcYHVTgwdaWTxXbD87t4lhhxWqbCmQL32oIk8TA5WIZOp9cqdANfKqOsxSenlz9SYKFdBMIaynENQhPMISDYkCooTajvUQdmQsgrS2mXK8TspBdltGd5B+ybaMnRhrY/OJHesfMLHjo5MEQjeCzv2J1haPt7H4fbHFxpbmteI81UUlpYxADp4ntuSo/6/E656rQzWRUodL8pWa9kRrBRxfF1gwAcHY3gi/MxrRxbMRXbkM0TUrkfrVLxDdejmCFpxxBmFnD0FnS5rxWHM5U5ewvRxtnqOTaw9zzuchIh2JLcdlyJlS78Y5Okmf2HwB1aEr0YPoLvo4D8+2s/j+UQabWxmMqKcXqGyZSCDGB8SEWHtX4tn97CHqEKPlUYJq4GfydnHoUpKn12znxSw1SDW2iO64FmD5ZCdSjzyIcMFMRCvPAUTC8QPAd4KwiwUTEBnbE9tjpC5Dsk7GiM5gXbZ2dfOijCincmke2ZzJFhHVO0eyJo4nu9w5NjjWy5wXBwk5/YV2BneQs7eWWPyDx/I8ffPwKdmdaitc29JgbhN9vcoI2xB2EvVVbnmUQBzZR6ASIgIHyW5iA3GCOlxSka83fMGLeIKHkBeuk0ZQrBBO7I2gqC6ixVMRXb0S0drzEd3+PYRjeiEoa+RutcdZN4Z1DqSNYVtgm+s8RzebqRcCcnqKzulL0ii3fG7sGCxpZvAqHfcHbQz2cDb39LCquQHP8Voni5VkryUnotQyPI+cg5tjc5vMK2KBUZjQUOPW1gbXHpWpX+uC4C5FIosN4SpVuTxO4CDYQ8yQO8VxxCLZaP5G2l8g+sibQBeiuwTg4ZMhBfo+cNb0FEd0t+RcD2FXhaAFoRSi768FS7R0ArgcNFa0qArcL6D+BI3zCJuhh8zloLIn9VInhHFi9SnqF9H8pfkaF5BTN7ROvNtTxmosKtRgu189jVo608aORW8PONEFNo4nSh2vULYvOcBvBQMKNIprqbu0cwKE4erA8iMCMXzRcV4m1sj7/i+IW4jBREfiGnnM3KmqWwYV6HvBi9TLQ8AO44xJ45Gz3AYQu3cg9cHbbiPYnShzfaW/aI+QspApe0ymrUza4u1ig2FnVXj4qJs9pGfkYAqKJzpabCOHv893kjIJiAFu/tep/vKjNOY21VhNWf/T9gYv0jEnN9LpObTTQuLDjpXd/nnElFj9LOITGfOe7BPaE+1y/J1DD7mz3C1BsZTorapbyvL1elR8vSDOoeWO4HiCdS8iXyGaOxAs4cjOCJorBD2lnQhFy5hYfXw+Jt4/aYPawVnah2Gb6G2xt6eHDnUOz4bJaoVONNe8Qo2tXS1fNx9Djkn0zWjmtMaJbwo7lBMtG8PNkqmI8b68+k0RvVfqtxH/Lpm+UIKmSCXF1Ijzizx18Zd88f08BCfYNGFP0XxHKOFsbwbs3YPoxhXgYAgqTLyvIOPZjus08TrWQmyeXaXsEIunKSOnUDaWkKPa11bomK9Rx1TP6xNnOga5ux/6yV2hr6UywYkx0MO0Zibd3yj1n1qpXmS/TeAg+BvxsOwl1on9DPES8VviEeJ2+W4QEEtkT1A9opUa9zZn3GCPHOMyPexNmgjFDss1gtLGiDZdhmjtIgSNFLUb6q+onmhDtCX68DiP55CxsfmERFu8THC2vdLDomtBzX7F60hBhv4eYfE7CoYHOxq8QeeRquC1IUZ6mNc8c061tfrY01We/1NivGR6e5WUjnLr70ScSVwnr3SzVDVLu8ePNcBJnnNAhXBihpB1T4NwTFOEg5vBVwpBO+fscHgj6lML0dXzEV02E0FXQ06UMRWM2EmkLWlHBIZaLCmq+c+4/EjoVj/7uO3qaKwvMXjuOHsoc4fECuF5eX38UPiC8OWjz0WqJuWiVuZtjPIQ9bUIiFAI0lroZxB0UIiWjUXqyQcRzunHZcrgo5B68ddI7fwLUvfcQo7M57tC9hx9iMT8MeJ10j/qz0HgYUMHg4oGGgWGF/Ffhs3Eq8Qm4kJivqoO6V6gNmIk397YwRZhf9JCKATMAGIgUeQyP/Xhn8AS9FDwWyvK/OnEDPcYGJR7jjhhXOfEnQ8GECM88N1g14kWL5YZ/Ftng8vaGkxtoVFWP70fqDFqH/rxAvkZ+EH5fLyFeFY+7ry3n39rcK2qBhn8AWUaTnYODgc6glz00whONAhvmoVw/mAE3RTCGeUIhnDGKvh1qXxWP4SzuyM43gVBYr5kOcmg3H0xiBhGjCBGESd7pF3dDgqULeUGc1tV7+Pi2NoKV7U3yD+0APiIOKby7ZhqQpQQ5cQYokJVh9xYoj/CBIuQs58Z4ghZDzZSlraBVC5XCFfNAUvqmUfg8wegLm7jF/3yIURP3YegNJ/70hwyr4wXYmVuT7QR0sY6QXb/FJUxVIJiDDHRwzYK6P6NKw+Eo/NZHxxdChS+oER5reKQ9gBbvzX/QLRTXX0zTnGLFwwlhgliJxhOUF+/SCFc0g/RNTPg11PklGZI/fltpP76DmV+HQS9qH24R2MOMOdQJrcdip0usxbEThCeZPFhf3IQBcBLfQxu72JQz2YW/4aOGtsoqN/sa5GiYOH2ulqBs1lX4rTmtRSu7GiQ4rvNaR5e72O+qfOvUN8iKX6htwEmimNPqgwjmvsahJMawW+h4DdViG5cCpbUtv9GcKxCUE5QloQyJhfRCGoXOwm3VTbe7Lcc0XE/oEC4uotGWSOFPJ3tgK0nGmC6BcYSowkK/uhUi43HmUQAFJLTJ7TUuKu7wec0NyZ5bsxIixRRVOegHjXvERPVt0lGF+oncboFR3Uw0grG6VEC24LUu0fAwgqk3noF+GQ3WKJ7r4fPr4MnEmO9HONEk+NxqnPAXnZyop9xOif7tI0mxlPdZOI0simQ/XEy/1SLXeTc7/YyuKRcYx3pTScYbOfHCmV+ROMxkZjiATR20lHOmR0LNH5E/QIOEGYCcRrbmXPFKFd/UmHlATCgqcaYQv2GfKyJSz0JhjXElfLeX+NS+s4Qd3HBycLouGaM2Ca7z1CFoJ9C6vmHgc8+QrisP/xiquuv4J9AegAxLt2fkPG8cGdYPEVZ+APKqnC8RRg/Zto2iXOQMjuPnE11U9j5slc5gegsfw3cgnQz0k09oBXRlagghhLj5XqnGHCA/HagwZy2Gvk623HdG2jcXW6ASRwgErxyXny+Idlcv7BtJgAa5ylc3sngis4GKzpo3FOq+Vjc7+/F+enN3nJ5/iPG60RrVdMyuUj/GjMsIl7QsfvDgHUYs4MxvPi1EQxW8JsR7YgOihZHIZxdgnD1CMrE+u5OcGpmHDuQb71P9HXPzucGGGBy+jjCfspjxNkz2PnyptLBQ9iIMISqnEiJ7RHN3N8DbCwziQ1heSONHg01rHF1resqvDzMALMtQAHtj5FzI83Xcn3XTACUNlTAPA9YRJxDnEVQn510/t0aaP5x59Z9/mbvfmKKyi0NiEJVjdLtraEGmMa3TMPZKmTsMFYOx8faxygEw+ogevB6pF76JVJbn0T001sRbb4U0Z2rAZFwehfwHYHH+adY8KMmPM3tnOcXa2AelU+RebMwMVscP5PqTpdfFQv3cbAmvMqBl+dQnpCHbcpiktK4qdBgz3jrnDeX9CynfzMoEyD3VhhgpnN6JOfMyfNQ70yfDvUUdlFgbOlvcOmxBkMKNerncVtO1hOlxNHEPCn/B/E48SbxCDFMVZcMa64f4KhOcYYyExjjkLqMbaTNpjU7NrxkGFLvvYLUk5sRPbwe4UWjEV4+EfxxKLXtdwiX9YRP/XiOiMZgvsWoFi5jMJUDQo4ryDEFcfw0YrZxGd845nRDeAcmIlLEDcbgegJk+8QKbXCvtuAy6uTh/Q4WP+xrcB5l9LhWGqs7aXBy9G6SyfBTqP4PYwwHrjv/KRY7RmUCwNMKdb199gDNKcDK6Fj9Taq8kfpT7M+0vi8//HxIII7Ul6hqlKZPDXAXEkwkJhkiy04y0WS3nUEMV/D7EIUK0d3nA5GPaMsGBFN7wO+lEIwkznDzYo7F709yi7WhVANnWoSnZh0j+zy4bS4fxyBsbzOOt4RXdVIE8vKwzGQcVY+1YJxO0Lr5/n8jWHasxid0rlhgwUlU1khntXPW/3Kwwd6p7rox1wPOtXhrhPkf+eI3RGWkDjFIMv53xARV3dKmrroQMziK5Xka53RDmrFCvGyS5dMV/FKF6MlNYAnG1YJfrqhNyVwWKcoUnGVRXKBQ2ypgrhw719yTRS+QvUdBLOPzCO/giSQIXibdWztn9SA9lmhLdqlWWG4MHjMWr2uLzws9sGO30vnf2F3j/r4G3+tpcHLrjKONVrittwGWe3h0gASXUNcq/GygARZbpOTtBKe7YChrrBerIy1rjtNvYqFFyLtbgTJVtGEtmFhbHMO4+rFu88cSPXa9c/50bhdoEXGOxc/lefojfgdf6ILLzZHumykvNgiHxbLeOzQCAowEwo6MnYTrFZFPcAavJOYRZxNnWuyma76uZyYQhhdp3NvHoHEtLmfzxinuLuvLOmCRxfd6mVfVEZZufxxrwBkZTCWmGSKtE3buNmG6Bmd/6rl7gS8/hj9EIZikssamZljwrbJpbYX6ngIfNzUz19xyPkuznC9Zf2hEBIS4478i+1NiO/FOuk1QLhj2TrKIFhpghgTB+R6w2uKlkw3qebGsFzvO9PYaHOyRrBcHw+7JFkar/upISdfG+ip2Ar7jXqkcRrBxXTnT5RZ920xgx3YEs4rgj1SkZTzBffjZ9+hgl/0PDeAyOzsxv6s7l+fM7XwI0UE6PyVjLjYGb4vzvyTNe4JCpZBPKGEq1XH7e9R+NtlDlOay2/0vMnh6hMGG3gZvjDPA5Rbj21T+I9AxDbS8Vbjr5WTAQpq3SF+njpSsLtOvYLlFyAHwNaYKSL9ZNlOephHMa4HwrrMRzGkAf5SicqadSc02wFLK/jpuYwR+Js7d97jyirfYlUMbc352xmbsgwgAEDsJdkg74gxj0LISp3XWGp7YQ43GFmUxq65BUWGmT1lzjYkdNNtyF8hNvxYaWMTrkLlenG9577DtSP2/Ta2fGWOAZRb+bEOOI0QnbRuz43U2U57Pu3XFG0Gypb/gzzLgQHtypDz7eVN0oeV66ROb60ximcm833vZzv+ZteDsHKw11pD+WOqjKt4BfOo7UjZ/VUUTrfap69la4dnxBh/SNdzXX+PHQw0+oqBnbXRyjkeGGeC8zHqxxhKLNyaaI/NfwDWqpWb4c92mLJhnBLET2FzlKpMip+ICi9YFCrWMAs7lZ+i+80nQrCQqbNZrHoTZxiQWtgmxxdoqBwGE9cZgIdFMKdSuYiCUa41NxuI5ZYHJxFrePxHnumzGxe62nmeyx3VprMCJljora61prOtf0kAtVDUtI9qoO7CcT4Kzzjq+tjP4ohN1Wf1sjKx613++W5iXJsp7fz8DrKG2+VnHcOXz3OKEJn3rT7+7jztA1j4jQVDVtwDuy/yd7B3EylhwddMa91iLP1L9b0lzoKwg0uMU0cSDz/uURXwN7Fi3F9g0KBmkPxmugVXpa04TEVhh8Z3O+m5V03JJT70V7IizjWNBGqmzsToLP6s9PU7sWD+xA9ERaVxi0b2ZWwy+DWKpSR6X7UsNwq42c+uXBX/W2gNmZz7xBff/Jm8EcpwnrcXtMUeLziABJHsT9wcodM4+ZTNf4xszDbx9sr9NPeXuDotj1yvaJ80+WD9Iv1jT+4D6PxltvgIHwEITQ8oJbLYtZT/R38bryHYR/v4slxWrjtfAldR2To5jXCjZr71EAFwk2XkgrjAm8SioItnOTgZK9px5co4NPATLXObvpGtoUjt5TrcPMsCVkkwLk2CVwa8nm8/kO0CNSe/XKFqx0vKOOws/bifLyb6VEC4ywNUWo9u523e4lDd/PM4SsTkWEVcTfWzOjd8ZVdy09dA648DqRh5TOMMivMGgbf3k+TSopRBxgFyw/zXi9dh9pkFtW4P/RXzTfDX1q6+dYRGQZvy4Zs4lm2BbSNazzTrRz9VjpcEe0opfuTpr4DqDcElyvuB86r+C2prk3vnL8/+ANCX2yriwWpH9CQdAmYdRPXKfz6peGrjGIliSXCMuM1ju6NREzVU1JWUt1Wqskshc5jZfPiO21OXEF+L9kmPk4m60WC4/le7m291lNucx/CtIT5fs18kAmFjFAGhIfFpDARDJud2h9v94+ngR739kXeNr7KA6CYBLDYYX66tUTcm4jvp2XGWQ4gBY/s3xc5Y1OV8By4nVbiFOaKnBwRDlGOsz1xv35+Iq99e7WVXcAxjivRoKABC7if2dy7SufM0G0flyzU4niMgHWGswr7u+U9WUzCnVj4IWPbyIN19JfKn3mXhbur/Ux1mh4Z+p4M9VFNkecGdH/HBCffcPKycq4CYL/4LkOJ7Tv8Yg7BwPAEEC4GIJgKrwdrUHQNVeTV+bY/iRx9cs15rEF3CTwYo++ueqpuTCPvp/+aDBxcQKA5814QtBDD9GvE7GChp7ZyoE63oi2roJqec3Ao9NQ2FRWzRuWwp8tyFSixX8VTJ+RWyeNUz8l79kADxgbZWc3082gVnfCqoBPsbWSs6pXxuX/amVfJ0HBjcbXDZAb6WxnqoJuXaIfge3ul/dfCFYJbAt+HFb2qRPxl6jwVkf/nA2WILbpgGfPo0/PLYBvBh33nkPEH0AfzH1W67AY/z0nMRV7vYY1skdACnRN1fhLnCeMfhb8vOuKx/m7K+oJPu3TNEU9BzoibVMrB/X4xaDzWP1dt6fq5qQdSP1Dqw38NdkEwhi76dOiy3OP08hWNseJBQEYxEMVgA+w+CLfgxeDKwrdm3PXMuBwmMII8jzf5Fh5xOV/3K3wVp0OcCGsC5RpjUmERwQG4nt1qYDIToM2f9CJdnfvokCbjDA5QZBYm01IfUxcJvBQ6frHTX2W8C60XoXbjfwLzUIBF/I1B2gXfDnK0TP34bU57vw1RgF3F+OfwBQqj6mH62AWwiA2v8Kf6miC1Y0TmfG30z2gkQA5A6CWrXwiCz+wTLXGLzv/V975wEfVZX98XNeCEUQdQEbyBIEFFlYKSqIiuIqsf/XuvK3gCsW1rVQVCwrBCkRWKSHFgKJpCdAgrSIUpQaCILlL4oNUWRd/awF5r2Z+f3PfffuFIYMETAZdM7n8/3cMve9efecc/vLJLjD5xxF6/9TFCecfj0DM4zBD6mzyHzVGIt68zdE1JKqQ16+gb+WpgF7WBAnEEbGTVqILKOM6i35K/wfr4V9DwHYjaHpK11lfP6Iag3GAf79EezHlfEp/DsnSNg/ugPAKH6pGP8PWvlHRF1hgtktFI6o9e+M4oAn1iY4wy1gTDS9RuoWUy0U31WNDiA9wB7MtORhWbBgD2fBCmLyFXZkGJ43lGA/RfB/tAL497tQUuvkFmjRgIBhkp/WEUq8yx6D/TelIA6/3yQJHw11gEjD75XwTj0HOCYkM+Mrc2//z2z9D0V5joGXMJAhdUk5nO4MJq0aY+FdvKfa/kB0VC/ehdkW7BGWgeEIEgbynBDsIKqcEJIeybAfJnjLnoaSlXOHucrIvY6A6Y1069+7HfaTBHuoEHY/4wCDA2cAEcbPlBbXkAh0jDkl5BgZVVz3HxDqRrnnLqmHGlo9B9cxoEdWYRCjb2WLmTfzB/rPv6tBBl7BWzHHgjNKrcFZkHC0Sbuwi6PzAtjhYTD+IsOfWhcouRAdTiIz+WsGvDMZvi3psP9BsJ8jOC/pewevZzgTdI/gbRBwgIBR7tOt7RdlfIgTOIfp/mdHeZ5LW5JrSP9oo0Ndvwj9CRGfY66FF65yTwQTqDqkz0Vc7HZVagaeytowqSGo/GBcQta8JJh8R6PTY9REhrDvCa2MuzsysKgRvBNOg2cgwU4hOGNNWfV9gr6vME6YxO7f8fnIjLOicDPWVwv3B4+Ao85BOkd5przeDLyiG5LWDwdDl7B8rUuTRpaFIVdyCVWXXN+OJiOd4R/Hyngh6LQTGh9r0gYnrKw2pE/KYLGFgVdoBe0cwsAsgj1SGMsujikvoblHEM881j+3RrVVt6zf0KlmujCHrRK8BsfkvR9l8ndKPYJ/gp7Nh+szsq5OmI6N7uZa6HMBTafqkg7NaAjS1PqT4YxjtxU6gh2ISyg4gXwJDaa8wArXQdRw8qUY2bIIHZqS2xL8pqzzTw5e908r/L4GZz67b9tmkFZyTXGisCBsSAge+jwepfsfdg0Bhdq4un56eWuH6VYw6SAMvCzMstCzNaVQdclJ9ej2H8fp2acznmG7SFwRErddWIcRn+kKIsfCuicZdRO0Mi7+71g4KezemuC1GuUc4hRKeRueYBBRTPCUZYW9EWRLeEIlZa0Ewg9jGZgdqNeh6xqMh+kFU1iwcHYT6kPVKJ22PctApgVnglqLs8ESVB6H5kXgGPxqxisVb9nkoIOQZxjIlrLi3V4p552oukddUaQJ6XrcQ4FQpB1g9O3aAWKFHsz4wTiAxCstN+1iC1ggdXxZ6yRSZ+H5Rrc6T+kl3cJXoxiJCXQJVaPUy72ff1TK96gJ2CQ9EdNIPCKtywTjKl+3/k0DIpWzoD8Dq42BC4V8Yb5eIyONsXcMo1wc8JV+jAG9GH88KzZ/k6+p0DrK54+R5b7w6s1jMWaoroRA3OQbTH4A5FkoG8Df6t8CrkYZkszrsMiCM0XBsCcLKi7YLqyJiJtwsgVkMPaNZzQ+6HWok08gzLyPkfMg48HLGXd3I/RqR+iSRGh1KuGEOrFp8J9DKpl/h1fI8Ewz+onU3UGE6NjoHCUWxv+F11F1yxXn0iTkmnnAVIY9TZhqKXRccKaFxHVokGsUqgJLLAy9iWPWUMea5swo4gT9avhAC54SFj1ovWl9KVgTTIeFjtGnT/SuGmHvbjyDqlvq16E7flKtOIthq3OBNNZMZzhu3DKh+7nAJi9Y1itxlFp4yCz/2p9BSGoQm4ZT9GQOrOWPlBcty12u4twEeEoZ9gylD43WUYSegphyznQN5uhetNnvqB/VgJy6YhC7BvQoA89gQYeOCYNYBvO5ztdjeibjhNqERvUJKEoE1lyAwckNYtIBnrGs0Dd5jojBZAGNEgFlzGJj1KBuNJHpsHxH8EhaTR63DXWf5TyqCRl0HW3Ea5Y26CxLCA1NfKYVkeeYOAosfDZWK/PxqwhYagFb+gDwo/2lt8WcAzQQYE4CHz7CbebmxMjuycA6C1gm5LFu+TM5qKNIXUUiTqB0/9LtvJlqSlqpt4MLGJjHsGezwYKdzkJEnsGStIJdBRQ8oh2g5FECcgl2KgGf9ENq/67HxGgt6NjOL/LMRo/i2SN0AqpF6JREGPm/jH8pPbhDgdaTYHTE4XpMD0/75+gJ4MVtaBjVoLSqSNETOc8chiPYLpaLE4iHhAZH0lhp4e9XawPtSWsErE+GU3o58H4/bJh9M+gojNelNWHLKAZOrYU+dOwOhS5nDtvkGWNZVbsugXHzCRy5DdyA8MZwBhYb484Jx+gtAixkfDHRvd8FVJMy8FquUGt2bwbDmcuww7CCZIR/5p9nAUsZrU/XikD2yQD2w5Wtj8HeU46Tkrod2U7crVqh2KF32HBiIhofg56gtjAi+OdjASeYVYW3jLrXYUD08MRtkc9xQ2eG/3XR4Tylm8r0yAbjAG9aGHsPV1BNS5OG1B/5DIU9rzKsiDzlwV+naWUknUrAcoI/9yzYWc2AimeBbzNx5Tn1f5aBzm/JWD2SgbcsoIjhUePq6wxkJWD2mUffC9wa0vodTcAJcqrgBCl9CfjYwvwBjBs6BvPrJZLUW8+J7EytLw1LOlJ3yNYOfk5TGkIxIA2KB7FXKd2jvDPLMnAoEXm+Usb2MYxbLmJkPirpEoJnNMH3QTpc2fkwnrmmaobp2JKQ1l+PpVjF8LpKNN+VwfCtZKCYMTWZcZp15A7QWJgYnAOY077g2z7FVXCCz6YxsMsCyhnXdNJ591xGbm/oy65MX0KmCo0DvMFY/wJ7iKgpxYJ0bUOzscpU4JWq4clkIFcoExbq3TDfp/lQ4pTeACVlRePCWknncwi9exCev5Ux7UFGwQDG22P09XiT9a7aPDbfYQk6jQLhMwu7Uhknawc4Kv7MjL3G6DjICUopuhNcdi7pbe4NjDsvJdzRjQHV/atnzzq83nxSBusYN13EGRRDkrR1JANrtNLtbGG+ChWWEMgzBNO+HAknq5Y/RRt/ZTIODCb4v8qCDWDM+DQsLMzE3pymQDEBq0wXv5aB1cJyoUArR99X45E0srWysIKR0vvYrgYaChmBo9/EwG8Io0kiSq61QAmVX7vyOQY2WPhyOgMLhEXG+NlssIyedKgxdVrJ2D3DrUtniiXp1ZFLsMEY1MUS+PDkMjwzCN7194gTTJVxm2DPITh5TYHvNkPLPuD1NsA8KXeoe2SHpUWZxjE2WlgxmmVu8MvtDdzEjE8TzS+I/82CP4+B9xldz638mvYtyF3D41U9NHnmc5V05ZVy2MLo25OWUQxK6+3jGVjP8GQrw1YRKeuUNoMnneCZQLDzhUI11pHKE88X5gpZQn4V7idKUo74fTHjXr3E/EW4sQmjWWIwPf4hBj4X3tHfP/zO6N+9NoXdXswTeHYrSr20TrGK8cUs974XUizKJW0pD5sYPmXAPEO+CqOQQXBW9YL/221wlnWFnUmBa5xFjZQj6F6hgCW/kvsZx3AEVDAqpqv98V/2gGnu3Qzvm+JkycG8C9sQ1k9mYJ+FnWnRv//v1xKw2YITqIMmIm7SPgnxtoVbunMBxbA0XqbGt22m2yow5KuwEuaThAlQ4v80Uw0HOj+b4Cy/FP5vNsG79n90b1B46Ht4lLMU6HV/2ZjqOVns0JqA/1NGYbwxjtG1bfCzZ+9iYAmjQ1Ll11/QivQEeEF4XYzxw/WmHHszo+JlhuppKZblzMb0DFbpMdijHr7wMOSRC/xeeLc9Dc9skgprY3tmEbzvpECJvbitGgYirlff4ZUQ7zJKUqr3WNkd8jYJG/QqZOaTjPp19WfNGquxvvJr6yQSvtNzlWB9CiLjqn7+Uv0d7X9PI+l4kKf/zJ/gfW0Yu+gwFBI8WQT/T5/Du+M5HJhKcJYkwV5YS/cOOQQlvi9LtXMUKdjFU8hwJMR7jAXDtPGrkys7ErDNOKDZefy+hDHojqo9y6pRDKyPrh8nj92eZtIDvIuIEug4kfO3TzVDQb5QHB3PHIL/i3z4962Gd8218L6bopdFuQTv5vu1A+ycCE8GSXkFuziF2vivjtAKrwlWjzD1LNDgdT0R3J7JuLx99Oea0t9cW1SJXvIZ2Mj4IptBTFfQ8SQtTqMRWKd3rTyqggsqxzOf4CxrAxjxbnlAj/kLGc7S38NZ3hL2orqwQ+9ToBX91iSt5Jqi9ZkEvMXwLzHPVczwFjGwi/HN/OjP9uB1BFRI+UPppFjvX6jPO59N4+l4lL5XcLnqvnylqkJRnGCh2uQgeMvvg3/vMjivtYcnRzuAXUDwzBPmkpQlk8fAVsaneWx+VrVmyRqgJ4N2SB2xTA8LTRtFOSBqR8AaBkojje+VeuIjxpDbuIKOYzllzuO8HzvVWB3NAYRCM74vbCDOoEKjUMnzbroXvl1pcEpOgidf7wb6VzNa6NfJa5yrO2mH9IXUCYv0LmSvzlF+law+YX8hA2Xh+nAK9GbS4uG8n4ha0nEu3TdO0bN0u6AyJ9ArAefVlsCBf8H3wTjd4nMkb931wP6vJG+MOEVjeAvJbW13XhI7L5Im1iJ8ls7AqhAjCuo5B9wc/Tm3TtSOEtBFvp4XfJzjXpdMvwapX4fu21MUmBSGG3+RWQnM0Rs+rvh/0g6QTfBWPAbvjiHwSNyTR8Amy1UaEcUS+hh6U2jddH1nPR79WV8ZxMBW0/Xn63v8uJxx+sn0GP2a5Kzf0fP/kYphS7gTKMM6b/aSVUAhfJ+lA873svYfCv/Xa+C80RXezf3h250Pu6QpnDxyJ36P3hhbDvDkLQzvKqHkIAfYyFg7lqO/aHo7AxWm5a/X6/0uLWk0/RqlbVNK/WklA+XK242ictWOXyv4Pl9sfgpmIw6MU/sCH0l8HQ6MJegPbCCHgDLCeTH0l0DdztVDEsr0vkSYA7zO2JvFMkREOVruRvpkc6N2gB7n0RT6NUu7ZpT63fKQtfMiIYfgSSPgpy/he28gDkwk+H/8GD7pFTy5jd3tYN/uAmApYffs2Or6r+pI+l0E3frDwFJhCctSsfLrW51BwA49X+jRjqbSb0GSmtA/Pi/S63hHQjXe+z4YAZHA5E+J9+1H4MmuB7u4th7/NzNKXoit7r/7eaQ3fxZHOgBK9BZxcqfKrz/tFMJ7mVLmjzSGfktySj16YN10BnYQUNoQItLii+CUJQMHdkNEDN8QnlyCXaCXiNjOGNU3thygW1sCVh7aARwBWxiPXF/5M9erQ6hF9Dz9RuVPswfRf/BhQ+D7bHjyE+CsvQz+Hz6E82aye0ZgL9TK9Bpl9r06toaAi84h4DUGXg0YPmIl8HK/qE7bl37j0uzhm+gtLCOgnODkEzzzhWxt/LDudC2jR4fYcoAL2hzGAcoZC58/pAN8KHSmuGhp35xGb57FwAcErCB9lLwgfGvVv5jR/LQYcgDzBygoi+IAbzHejTyvmCvUprhESI/n+/A7WMXAdqEkeJCENxh7Mhm1EmLLATqdrRz2UA6gnx1L9C5o9z+45b8W/kJxiS7nNaehpanswzbdhfoX6Nl0eQzuAKoXTrFcGzpg/CKGt5iBjdqR16QxOraiCUTUkOJSZTn7+u6UtX6ankhhX4wtAQ0dkkIcoMg46wZhB+PduYzevXhRfKw/Oul2W08q+liUXPhc7DlAuxaku/nXhC3aWbdnMPrdyGVEdBXF5diIRdQl6XSaI1E7puYArQnYpVv90pcYt/akPKLj7O2d40yaCYOFrQJqmrbNCamP8Hvnt6Fhv4az++NNuggvClsE/ByWvcTIHnxUQ8oOYaxwGcUlJqS10EeYIZQL+yszXs7TDEDwMW7uXiVj28LbQobwgNCO4hLz0ljoJtwrvGCMt0IoH3kvfzTzKf5q/nDed3Un2kdEe4VPzLDymjBPSBH+KlwqnEFxiUtc4hKXuMQlLnGJS1ziEpe4xCUucYlLXOLym5L/Bw9PylkJB+jjAAAAAElFTkSuQmCC",
            "PHD": " data:image/webp;base64,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",
            "CinemaZ": " data:image/webp;base64,UklGRv4EAABXRUJQVlA4TPEEAAAvf8AfEKDkNpIgSeL/v93T5uZeFbO7p42QAEmSaVv9bNu2bdvftm3btm3btm1cPPveZ/v1BMB/m9R4S9PfGGMNkCqE2RVqvMXraZRxhuglguk3ICvGMvcIdOOfSTy1w0ima8ItcZFAF/6ZxFtHjGT9WcLsVYRjHa4YTWVBoC0KcO6h8fQ/xgA/sExiHe2Sfp5iWaNtdD9Ckte4qMaMBj9PcFGdNRTPMXYKl/2QNqFpNy7L1++YIRpw3wEKkf7KcN9eepecxpPEvAPb8KQKMWcoe4tXxf/iNl416AhlArwr4wd5L/GujBvu4GWmAOAZHtbN7YJdeFoegJl4WiPTPcuxq4SAQK7mCrplJnaVEfgvR0MFFdDd0g+LflgvjhU5AGDA1zT3dM6qBNZIZksBAOjwNs1NzTP0fYkhzp0WATFLi0nWXBEHMQPTSUZo2o7dIwLxMKbp3I4iUTCm7cBI6QoNTRO7oaqPpgVnqUJTgrIBmr9hMw6NhDJr4pq5UKbt90AHuR5DHQMDoU5NXslQqNMlyNCGnsOYGw2L9DVUzINFCgoypNMirylzDFaFNjyEVfYDU1v6YawSlu2eaaeyA+ZmfrRcyfTYIqNuZApsy4+QTYk0IoZ1cyeqYV2/zKiOYIz13aOodmD2HqiJXO2YH6mBg7Zl2ikfcDNSTqbiQOTrBcMzj+CgqZFOehXPI+cvSM4su8AvQk4V/yKLLnDKjL9AQ0vEtyIvMuQCVfWRwReAKBJUURVJuwDyI71P+BiJrKiLpJyQG+l1wodIVEVZpP8FiqoiA0/4EwmtyI7MvMBSd2TMBUpqIwEVbyKHL4jB2NwLnDDmUnE58uaC/pnzFwzKmFcsi0guWJWpIXfA2UgFxYq4CMUdUJ6hYQeURx5AlZrWyJM9vXDoz55AjC3pgGcRclsjmqC4Na8zASXTM1+2jMGx/C1JGCuDMsMMTd6hq3OGNuyQVZXZ0QK3MhS/QdU3bOq14iHm7GtsB8h/wWfs8lzwCnPnoO/eQDW3mvNY1iqi5jQO2SywHaAO/TssvcW+iR267uDQOdj0cIDoBN2CiZpw01UaBUNJcKiNzgq/EZIYT2Ugyh1cVmom7YEA93BsH+xaO0IktVcGS5o/KDESaKlPeFCdY9JY0f5BkaEA87zGuSq6S+DkDBF1q1VA6K88Uq3Y9MOW2U91Cgn9kadcC1bZw7qPjVWW4HplUyLsU1ZwSiYAkJ4yFi5yuWQdAABHzYeshpvCtJyxFv7IWekZB+EqJ19uqDUSfqXl8Q1dFsNh8y44CrE+pAe8ZAunZcjfc8Uxt9z+3WV7FO/ZD9cpWKVl67iXwuEDmdj1PfySBp/J7nu4CR9q9ffQQuNDbPoeyLKlvzv+e2XShnXfQyezDj+v8aenryJjGf5q15v0IcbfVbyIvluYqn8PBdPVY6zxOdYoxaH6xwjzDcdvYeIwFp9ikhZ8Gk/3sPsMJnZi+wVID8hZqRUfphakycXFF6jyDldfsP1/OFQ4+zqNwN7Gt+lmBsDZ+5fpZAYAYLKq1wFde18HIIXwdQAWaXsdsLTldQCcXXsdgEy/M40PArAjUvckEOBpoOxNAAaq+sWiB+hiXgGGlilGRA2WQN/m74EsOgDk9bfcGPqwaPX30ESttS74e/gMn+rq1zDiY8CFL2EpfLAsS6y15sOttdpcYfBfKAA=",
            "HDB": " data:image/png;base64,AAABAAIAICAAAAEAIACoEAAAJgAAABAQAAABACAAaAQAAM4QAAAoAAAAIAAAAEAAAAABACAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAb15J/29eSf9vXkn/b15J/25eSf9uXUj/b15J/29eSf9vXUn/b15J/29dSP9uXkn/b11J/29dSf9vXkn/b15J/29eSP9vXkj/b11J/29dSf9vXUn/b15I/25eSP9vXkj/bl1J/29eSf9uXUj/bl5I/29eSf9uXUj/bl1J/29dSP9xYEv/cWBL/3FgS/9xYEv/cWBL/3FgS/9xYEv/cWBL/3FgS/9xYEv/cWBL/3FgS/9xYEv/cWBL/3FgS/9wYEv/cWBL/3FgS/9xYEv/cWBL/3FgS/9xX0v/cWBL/3FgS/9xYEv/cWBL/3FgS/9xYEv/cWBL/3FgS/9xYEv/cWBL/3NiTf9zY03/c2JN/3NiTf9zYk3/c2JN/3NiTv9zY07/c2JO/3NiTf90Yk7/c2JN/3RjTf90Yk3/c2JO/3NiTv9zYk3/c2NN/3RiTf9zYk3/dGNO/3RiTf90Yk3/dGJO/3NjTf9zY07/dGJO/3RiTv9zY03/c2NN/3NiTv90Y03/dmVR/3ZlUf92ZVD/dmZQ/3ZlUP92ZVD/dmVR/3ZmUP92ZVD/dmVQ/3ZlUP93ZVH/dmVQ/3ZlUP93ZVD/dmVQ/3ZlUP92ZVD/dmVR/3dlUP92ZVD/dmVQ/3ZlUP92ZVD/d2VQ/3ZmUf92ZVD/dmVQ/3ZlUP92ZVD/dmVQ/3ZlUf95aFP/eWhT/3loU/95aFP/eWhT/3loU/95aFP/eWhT/3loU/95aFP/eWhT/3loU/95aFP/eGhT/3loU/95aFP/eWhT/3loU/95aFP/eWdT/3loU/95aFP/eWhT/3loU/95aFP/eWhT/3loU/95aFP/eWhT/3loU/95aFP/eWhT/3xrVv98a1b/fGtW/3xrVv98a1b/fGtW/3xrVv98a1b/fGtW/3xrVv98a1b/fGtW/3xrVv98a1b/fGtW/3xrVv98a1b/fGtW/3xrVv98a1b/fGtW/31rVv98a1b/fGtW/3xrVv98a1b/fGtW/3xrVv98a1f/fGtW/3xrVv98a1b/f25Z/39vWv9/bln/f25Z/39uWv9/b1n/f25Z/39uWf9/bln/gG5a/39uWf9/bln/gG5Z/39vWf9/bln/f25Z/4BvWv+Ablr/f25Z/39uWf9/blr/f25Z/4BuWf9/b1r/f25a/39uWf9/bln/f25Z/39uWf9/blr/f25Z/39vWf+DcVz/gnJc/4JyXf+Dcl3/g3Fd/4NyXP+Cclz/gnJc/4NxXf+DcV3/g3Jd/4JxXf+Dcl3/g3Fc/4JyXf+DcVz/g3Jd/4NyXf+CcVz/gnFd/4NyXP+Dclz/g3Jd/4NyXf+Cclz/g3Jd/4NxXf+Ccl3/gnJc/4JyXf+CcV3/gnFd/4Z1YP+GdWD/hnVg/4Z1YP+GdWD/hnVg/4Z1YP+GdWD/hnVg/4Z1YP+GdWD/hnVg/4Z1YP+GdWD/hnVg/4Z1YP+GdWH/hnVg/4Z1YP+HdWD/hnVg/4Z1YP+GdWH/h3Vg/4Z1YP+GdWD/hnVh/4Z1YP+GdWD/hnVg/4Z1YP+GdWD/inlk/4p4ZP+KeWT/wbis///////Y0sv/iXlk/4p5ZP+KeWP/inlk/4p5ZP+KeWP/2NLL///////BuKz/inlk/4l4ZP/AuKz////////////////////////////n5OD/0MnB/6mcjf+KeGT/inlk/4p4ZP+JeWT/inhj/4p4ZP+NfWf/jn1o/458aP/Cuq7//////+Hc1v+OfGj/jXxo/418aP+NfGj/jn1n/418Z//h3Nb//////8O6rv+NfGj/jXxn/8K5rv//////9/b1/+Hc1v/h3Nb/4dzW//f29f///////////9nUzP+VhnL/jXxo/418aP+NfGf/jX1o/5KAa/+RgGv/kYBs/8S7sP//////4t3Y/5GAa/+RgGv/kYBr/5KAa/+RgGv/kYBr/+Ld2P//////xLux/5GAa/+RgGv/xLuw///////i3dj/kYBr/5GBa/+RgGz/kYFr/66ik//w7uv//////+Ld2P+SgWv/koFs/5KAa/+RgWv/lYRw/5WFb/+VhG//xr2y///////j3tn/lYRv/5WEb/+WhG//lYRv/5WEcP+VhG//497Z///////GvbL/lYRw/5WEb//GvbL//////+Pe2f+VhG//lYRv/5WEb/+VhG//lYRv/6OUgv/49/X//////7+1qf+VhHD/lYRv/5WEb/+ZiHP/mYhz/5mIc//JwLT//////+Tf2v+ZiHP/mYhz/5mIc/+ZiHP/mYhz/5mIc//k39r//////8nAtP+ZiHP/mYl0/8nAtP//////5N/a/5mIc/+ZiHT/mYhz/5mIc/+ZiHP/mYhz/8/Hvv//////6+fj/5mJc/+ZiHP/mYhz/52Md/+djHf/nYt3/8vCtv//////5eDb/52Md/+djHf/nYx3/52Md/+djHf/nYx3/+Xg2///////y8K2/52Md/+djHf/y8K2///////l4Nv/nYx3/52Md/+djHf/nYx3/52Md/+djHf/t6ub////////////nYx3/52Md/+djHf/oY97/6GQe/+hkHv/zcS5///////m4dz/oZB7/6GQe/+hkHv/oZB7/6GQe/+hkHv/5uHc///////NxLn/oZB7/6GQe//Nw7n//////+bh3P+hkHv/oZB7/6GQe/+hkHv/oZB7/6GQe/+hkHv///////////+6rp7/oZB7/6GQe/+llH//pZR//6WUf//Pxrv//////////////////////////////////////////////////////8/Gu/+mlH//pZR//8/Gu///////5+Ld/6WUf/+llH//pZR//6WUf/+llH//pZR//6WUf////////////72xof+llH//pZR//6mYg/+pmIP/qZiD/9HIvf//////+fj3/+jk3v/o5N7/6OTe/+jk3v/o5N7/6OTe//n49///////0ci9/6mYg/+pmIP/0ci9///////o5N7/qZiD/6mYg/+pmIP/qZiD/6mYg/+pmIP/qZiD////////////wLOk/6mYg/+pmIP/rZyH/62ch/+tnIf/08q////////p5d//rZyH/62ch/+tnIf/rZyH/62ch/+tnIf/6eXf///////Tyr//rZuH/62ch//Tyr///////+nl3/+tnIf/rZyH/62bh/+tnIf/rZyH/62ch/+9sJ////////////+4qZf/rZyH/62ch/+xoIv/saCL/7Ggi//VzMH//////+rm4P+xoIv/saCL/7Ggi/+xoIv/sKCL/7Ggi//q5uD//////9XMwf+xoIv/sKCK/9XMwf//////6ubg/7Ggi/+xoIv/saCL/7Ggi/+xoIv/saCK/9XMwf//////9fLw/7Ggi/+xn4v/saCL/7Wkj/+1pI7/taSP/9jOw///////6+fh/7Skj/+1pI//taSP/7Wkj/+0pI//tKOO/+vm4f//////2M7D/7Wjjv+1pI//2M7D///////r5+H/taOO/7Wjjv+1o4//taSP/7Wjj/+5qpb/9fPw///////YzsP/taSP/7Sjj/+0pI//uaeT/7iok/+5qJL/2dHF///////s6OL/uaiT/7mnk/+4qJP/uKeS/7mnkv+5p5L/7Oji///////Z0MX/uaeT/7mnk//a0MX//////+zo4v+5qJP/uKeT/7ink/+5qJL/wrSh//Hu6f//////+vn4/72tmf+5qJP/uaiT/7inkv+8rJf/vauW/7yrlv/b0sf//////+3p4/+8q5b/vayW/7yrlv+8q5b/vKyX/7yrlv/t6eP//////9vTx/+8q5f/vKyW/9vSx///////9vTx/9vTyP/b0sf/3NLH/+nj3P////////////v5+P/JvKv/vKuW/7ysl/+8rJb/vKuX/8Cvmv/Ar5r/wK+a/93Uyf//////7urk/8Cvmv/Ar5r/wK+a/8Cvmv/Ar5r/wK+a/+7q5P//////3dTJ/7+vmv/Ar5r/3dTJ//////////////////////////////////v6+P/i2tD/xLSh/8Cvmv/Arpr/wK+a/8Cvmv/Ar5r/xLKd/8Oynv/Es57/x7ek/9THt//LvKr/w7Od/8Oynf/Esp3/w7Kd/8Oynv/Esp7/y7yq/9THt//It6T/w7Ke/8Sznf/Ht6T/08e4/9PHuP/Tx7j/1Me3/9PHt//Mvav/xLKd/8Oynf/Dsp3/w7Od/8Sznv/Dsp3/xLKe/8Synf/HtqH/x7ah/8e2of/HtaH/x7Wh/8e2of/GtqH/xrah/8a2of/GtqH/x7ah/8e2of/GtqD/x7Wh/8a2of/HtqD/x7ah/8a1of/HtqH/x7ah/8e1of/HtqD/xrah/8a2oP/HtqH/x7ah/8e1of/HtqH/x7ah/8e2of/HtqH/xrah/8q5pP/KuaT/yrik/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/yrmk/8q5pP/KuaT/zbyn/828p//NvKf/zbyn/828p//NvKf/zbyn/828p//NvKf/zbyn/828p//NvKf/zbyn/828p//NvKf/zbyn/828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",
            "PxHD": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB53cyAgN/PgIfh0oCO4tSAAAAAAJrl2YCg59uApujdgKvq34AAAAAAtOzjgLjt5IC87uWAvu/mgAAAAAAAAAAAdNzL/3vezf+C4ND/ieHT/wAAAACW5Nf/nOba/6Ln3P+o6d7/AAAAALHr4v+27OP/uu3l/73u5v8AAAAAAAAAAG7ayP913Mv/fd7O/4Tg0P8AAAAAkePV/5fl2P+d5tr/o+jc/wAAAACt6uD/suzi/7bt4/+67uX/AAAAAAAAAABp2caAcdvJgHjdzIB/38+AAAAAAI3i1ICT5NaAmuXZgKDn24AAAAAAqurfgK/r4YC07OKAuO3kgAAAAAAAAAAAX9fDgGfZxoBv28mAdtzLgAAAAACE4NGAi+LTgJLj1oCY5diAAAAAAKTo3ICp6d6ArurggLPs4oAAAAAAAAAAAFrVwf9i18T/atnH/3Hbyv8AAAAAgN/P/4fh0v+O4tT/lOTX/wAAAACg59v/pujd/6vq3/+w6+H/AAAAAAAAAABT1L7/XNbB/2PYxP9r2sf/AAAAAHrdzf+B39D/iOHS/4/j1f8AAAAAm+bZ/6Hn2/+n6d3/rOrf/wAAAAAAAAAATtK8gFfUv4Bf1sKAZtjFgAAAAAB13MuAfd7OgITg0ICL4tOAAAAAAJfl2ICd5tqAo+jcgKnp3oAAAAAAAAAAAETQuIBM0ryAVNS/gFzWwoAAAAAAbNrIgHPcyoB73s2Agt/QgAAAAACP49WAluTXgJzm2YCi59yAAAAAAAAAAAA+zrb/R9G6/0/Tvf9X1cD/AAAAAGfZxv9v28n/dtzL/33ezv8AAAAAi+LT/5Lj1v+Y5dj/nuba/wAAAAAAAAAAN8y0/0DPt/9I0br/UdO9/wAAAABh18P/adnG/3Dbyf933cz/AAAAAIbg0f+M4tT/k+TW/5nl2P8AAAAAAAAAADHLsoA6zbWAQ8+4gEvSu4AAAAAAXNbBgGTYxIBr2seAc9zKgAAAAACB39CAiOHSgI/j1YCV5NeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            "KG": "data:image/x-icon;base64,AAABAAMAEBAQAAEABAAoAQAANgAAABAQAAABAAgAaAUAAF4BAAAQEAAAAQAgAGgEAADGBgAAKAAAABAAAAAgAAAAAQAEAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIAAAACAgACAAAAAgACAAICAAACAgIAAwMDAAAAA/wAA/wAAAP//AP8AAAD/AP8A//8AAP///wAIAAAACICIB/d3eHCH8AAAAAAHeAAAAAAAAAB3cAAAAIAACIiHiAAAdwAAiAiIiAAAd3cHdwgAAAcAAAABYAAAAHBwcGAYAAAAAAhwEAcAAAAAAAB2AAFgAAAAAAcACAAAAAAAAIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+SAAABHwAA+P8AAPx/AAB4DwAAPIMAAAAvAACAHwAAwA8AAPgPAAD/AQAA/4MAAP/PAAD//wAA//8AAP//AAAoAAAAEAAAACAAAAABAAgAAAAAAAABAAAAAAAAAAAAAAABAAAAAQAAAAAAAAcHBwALCwsAFRUVABkZGQAdHR0AISEhACMkIwAmJiYAKSkpACwsLAAxMTEAMTQ9ADs8PAA9Pj4APz9AAE5OTgBITFUAT1FUAFJSUgBaWloAX15fAGJiYgBlZWYAYGRrAGNmbABzc3MAcXJ1AHR0dAB7e3sAeHuCAIeHhwCAg4kAhYeNAJCQkACWlpcAmJmeAJCOqwCenq4An6GmAKKiogCjo6QApKSkAKirrwClpbYAra+zALa2tgC3t7gAubq+ALu8vwChoMAApKTAAMHCxQDDxMgAxcfJAMjIyADIycwAzMzMAMLB1gDOz9IAz9DSANLS1QDU1NQA1tbYANjY2QDY2OUA3dznAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwrAAAAAAAAACY6AEEyACU8IRgeITAnADIsQQAAAAAAAAAAAAAkETEAAAAAAAAAAAAAAAAAACMSGwAAAAAAAABAAAAAAC4+OS8YLTkAAAAAEBYAAAAAOTkAPj82NjQAABMKCxQoDwoNGygAOwAAAAAAGwsKCgYFBQYJCQAAAAAAAAAWBgoGBgYFBQkuAAAAAAAAAAAAKBUKBgYDEAAAAAAAAAAAAAAAACMFAwALBg0AAAAAAAAAAAAAHQICBR8AAAAAAAAAAAAAAAAuIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/kgAAAR8AAPj/AAD8fwAAeA8AADyDAAAALwAAgB8AAMAPAAD4DwAA/wEAAP+DAAD/zwAA//8AAP//AAD//wAAKAAAABAAAAAgAAAAAQAgAAAAAABABAAAAAAAAAAAAAAAAAAAAAAAAC4xOvuDhoyx9PT1GAAAAAAAAAAAAAAAAPDw8SHIycx0x8fPboGClsSfnr+h2tnlV7a1zoWMi7LP2NjjSmxpkL+lp6uIZWhvyVVZYe5jZ2/cZ2py1JaYnqmBhIvCv8DEZ4SEqruFhZ28wL/UidPS4Vfw8PUm9/f5Hv7+/gEAAAAAAAAAAAAAAADJys114+TmOb/AxGl1d32+RUlS+pWXm6Lu7u4oAAAAAAAAAAAAAAAAAAAAAAAAAAD+/v4BAAAAAAAAAAAAAAAA+/v7C/z8/QQAAAAAzMzMWnl5e8dLTVD4Xl9j4Ojo6TUAAAAA9fX2FtbX2Uyys7d109TWVQAAAAC2treF6enpJAAAAAAAAAAA9/f3FZaWlq+urq6FqampkpGRk6VVWF/pjpCWt6eprp7Exch39fX2HP7+/gEAAAAASkpK909PT+O7urtt+Pj5DgAAAAC8vLx8p6ankaenp53+/v4BsbK3kq6vs4GcnqOTnJ6kmZqboZvm5+gvAAAAAElJSfErKyv/MjIy/01NTet9fX21PDw9+ywsLP85Ojr8V1dX0np6e67Y2NhAqauwj+3t7inj4+VI19faTf7+/gK0tLR2W1tb2TExMf8pKSn/LCws/yIiIv8dHR3/HR0d/yMkI/8lJSX/Jycn/eHh4TQAAAAAAAAAAAAAAAAAAAAAAAAAANvb20xSUlPiJycn/yYnJv8iIiL/ICAg/yAgIP8dHR3/Hh8e/ygoKP+KiYqdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/v7+AtTU1UilpaZ9e3t8sU5NTuYtLS3/IyMj/x8fH/8VFRX/OTg54/r6+hX09PUg9/f3F/j4+RAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/v4B7e3uKWtrbL8dHR3/GBgY/wEBAf8vLy/9IyMj/zs8PPy7urtqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8/P0FWlpazAsLC/8HBwf/Gxsb/2hoaMnNzc1VAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPX19RSEhIWUaGhor8vLzE4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAEAAMB9AADIIQAAMAEAAAgBAAAAAAAAAA8AAIAPAADAAAAA/AAAAP8BAAD/hwAA//8AAP//AAD//wAA",
            "TIK": "data:image/x-icon;base64,AAABAAEAAAAAAAEAIAAoIAQAFgAAACgAAAAAAQAAAAIAAAEAIAAAAAAAACAEAEZcAABGXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfMmVlKz915iY7cv8lOXD/Jjlv/yk9c/8pPHL/JTlv/yU5cP8lOG7/JDhu/yY6cP8mO3H/Jjtz/yY6cP8oPHL/KD1y/yU6cP8nOnD/Jjlw/yU4bv8mOnD/Jjpw/yY7cv8mOnL/Jjpw/yk9c/8oPHH/Jjpw/yY5b/8mOXD/IjZq/yQ4bv8kOG7FJThvVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAf///////////////////////////////////////AAAP//////////////////////////////////////wAAAP/////////////////////////////////////8AAAAP/////////////////////////////////////AAAAAP////////////////////////////////////4AAAAAP///////////////////////////////////+AAAAAAP///////////////////////////////////gAAAAAAP//////////////////////////////////4AAAAAAAP/////////////////////////////////+AAAfwAAAf/////////////////////////////////gAAH/4AAAf////////////////////////////////8AAB/+AAAA/////////////////////////////////AAAI/gAAAA////////////////////////////////wAAAAAAHAAB///////////////////////////////8AAAAAAD/gAD///////////////////////////////AAAAAAAf+AAD//////////////////////////////4AAAAAAD/gAAH/////////////////////////////+AAAAAAAP8AAAP/////////////////////////////gAAQAAAD/AAAAf////////////////////////////4AAHAAAA/wAcAA////////////////////////////+AAB4AAAH8AH8AB////////////////////////////gAAPgAAB/AB/4AD///////////////////////////8AAB+AAAfwAP/wAH///////////////////////////AAAP4AAH8AAP/gAP//////////////////////////wAAB/AAB/gAAf8AAf/////////////////////////8AAAH4AAf4AAA/AAA//////////////////////////AAAAfAAH+AAABwAAB/////////////////////////wAAAB4AA/gAAAAAAAD////////////////////////8AAAAOAAP4AAAAAAAAH////////////////////////AAAAAAAB+AAAAAAAAAP///////////////////////wAAAAAAAHwAAAAAAHgAf//////////////////////+AAAAAAAAcAAAAAAB/AA///////////////////////gAAAAAAwBAAAAAAAf+AD//////////////////////4AAAAAAPAAAAAAAAB/8AH/////////////////////+AAAAAAB8AAAAAAAAD/wAP/////////////////////wAAAAAAfwAAAAAAAAH/gAf////////////////////8AAAAAAD/AAAAAAAAAf+AA/////////////////////gAAAAAAP8AAAAAAAAA/gAD////////////////////8AAAAAAAfwAAAAAAAAB4AAH////////////////////gAAAAAAD+AHAAAAAAAAAAAP///////////////////+AAAAAAAfwAeAAAAAAAAAAAf///////////////////wAAAAAAH8AB+AAAAAAAAAAB///////////////////+AAAAAAB/AAD8AAAAAAAAAAD///////////////////4AMAAAAfwAAP4AAAAAAAAAAP///////////////////ABgAAAH+AAA/AAAAAAAAAwAP//////////////////8AOAAAA/gAgDwAAAAAAAAHgA///////////////////gB4AAAP4AOAMAAAAAAAAB/AB//////////////////+AHAAAD+AD4AAAAAAAAAAf8AD//////////////////4A8AAA/gAfwAAAAAAAAAB/4AP//////////////////AHwAAP4AD/AAAAAAAAAAD/wAf/////////////////8AeAAD/AAP8AAAwAAAAAAH/AA//////////////////wBgAAfwAA/wAAPgAAAAAAf8AD/////////////////+AIAAH8AAD/AAD/AAAAAAA/AAH/////////////////4AAAB/AAAH4AAf+AAAAAABwAAf/////////////////gAAAfwAAAeAAA/8AAAAAAAAAA/////////////////+AAAH8AAABgAAB/4AAAAAAAAAB/////////////////wABA/AAAAAAAAD/AAAAAAAAAAH/////////////////AAcP4AAAAAAAAH4AAAAAAAAAAP////////////////8ADz+AAAAAAAAAOAAAAAAAAAAA/////////////////wA//gAAAAAAAAAAAAAAAAAAHAB/////////////////AH/4AAAAAAOAAAAAAAAAAAA+AD////////////////8Af+AAAAAAB4AAAAAAAAAAAP8AP////////////////wB/gAAAAAAfwAAAAAAAAAAA/4Af////////////////AH8AAAAAAD/AAAAAAAAAAAH/gA////////////////8AfAAAAAAAP8AAAAMAAAAAAP/AD////////////////wBwAAAAAAA/4AAAD4AAAAAAf8AH////////////////AEAAAAAAAD/gAAA/wAAAAAA/4AP///////////////8AAAAAAAAAH+AEAH/gAAAAAD/gA////////////////wAAAAAAAAAf4AQAP+AAAAAAH/AB////////////////AAAAAAAAAA+AAgAf8AAAAAAf4AD///////////////+AA4AAAAAADgADAB/4AAAAAB/AAP///////////////4APgAAAAAAAAAGAD/AAAAAAPwAAf///////////////gB+AAAAAAAAAAYAHwAAAAAD8AAA///////////////+AP4AAAAAAAAABwAMAAAAAA/gAAD///////////////4A/wAAAAAAAAADgAAAAAAAP4AAAH///////////////gD/AAAAAAAAOAPAAAAAAAD+AAAAP//////////////+AP8AAAAAAAH4AeAAAAAAA/gAAAAf//////////////8AfgAAAAAAA/gB4AAAAAAH4AAHAA///////////////wB8AAAAAAAH/ADwAAAAAB+AAB+AD///////////////AHAAAAAAAAf8APgAAcAAfgAAP8AH//////////////8AAAAAAAAAA/4AfAAP4AH8AAB/4AP//////////////4AAAAAAAAAD/gB8AB/wB/AAAD/gAf//////////////gAAAAAAAAAH+AD4AP/APwAAAP/AB//////////////+AAAAAAAAAAf4APwAf+D8AAAAf8AD//////////////4AAQAAAAAAA/AAfgB/8/AAAAA/wAH//////////////wAHgAAAAAAD4AA/AD//wAAAAD8AAP//////////////AB/AAAAAAAGAAD8AH/+AAAAAHAAAf/////////////8AP8AAAAAAAAAAH4Af/gAAAAAAAAA//////////////wA/wAAAAAAAAAAfwA/4AAAAAAAAAD//////////////gD/AAAAAAAAAAA/AB+AAAAAAAAAAH/////////////+AP8AAAAAAAADAD+ADgAAAAAAADwAP/////////////4Af4AAAAAAAA8AH8AAAAAAAAAA/wAf/////////////wB/gAAAAAAAP4Af4AAAAAAAAAH/gA//////////////AD4AAAAAAAB/wA/gAAAAAAAAAf+AB/////B///////+APAAAAAAAAH/AD/AAAAAAAAAB/8AD////4D///////4AAAAAAAAAAf+AH+AAAAAAAAAD/wAH////AP///////gAAAAAAAAAA/4Af4AAPAAAAAAH/AAP///8A////////AAAAAAAAAAD/wA/wAD+AAAAAAPwAAP///gD///////8AAAAAAAAAAH/AD/gAf4AAAAAAcAAAf//+AP///////4ABwAAAAAAAf+AH/AD/wAAAAAAAAAA///4A////////gAPgAAAAAAA/8AP8AH/gAAAAAAAAAA///gD///////+AD+AAAAAAAB/wA/4AP/AAAAAAAD4AA//8AP///////8Af8AAAAAAAH+AB/wA/8AAAAAAAfwAAf/wA////////wA/wAAAAAAA/gAD/gB/gAAAAAAH/gAA/8AD////////AD/gAAAAAAP8AAH+AD4AAAAAAAf8AAAAAAf///////+AP+AAAAAAB/AAAf8AGAAAAAAAA/AAAAAAB////////4Af8AAAAAAfwAAA/4AAAAAAAAABwAAAAAAP////////wB/wAAAAAH8AAAD/gAAAAAAAAAAABAAAAA/////////gD8AAAAAB/AAAAH/AAAYAAAAAAAA/AAAAH////////+APAAAAAAfwAAQAP+AAH4AAAAAAAP8AAAA/////////4AQAAAAAD8AAHwA/8AB/wAAAAAAD/AAAAH/////////wAAAAAAA/gAA/gB/4AP/gAAAAAA/wAAAA//////////AAAAAAAP4AAP+AD/gAf/AAAAAAP8AAAAH/////////+AAAAAAD+AAAf8AP/AB/+AAAAAB/gAAAB//////////4AAEAAA/gAAB/wAf+AD/wAAAAAf4AAAAf//////////wAB4AAP4AAAD/AB/8AH+AAAAAH+AAAAH///////////gAfgAD/AAAAP+AD/4APwAAAAA/gAAAB///////////+AH/AAfwAAAAfwAH/wAcAAAAAP4AAAAf///////////8Af8AH8AAAAA8AAf/AAAAAAAD/AAAAH////////////wA/4B/AAAAADAAA/+AAAOAAA/wAAAB/////////////gD/gfwAAAAAAAAB/8AAB8AAP8AAAAf////////////+AH/H8AAAAAAAAAH/4AA/4AB/AAAAD/////////////8Af//gAAAAAAAAAP/wAH/gAfwAAAA//////////////wA//4AAAAAAAB4A//gAP4AH8AAAAP//////////////gD/+AAAAAAAAfgB//AAeAB/gAAAD///////////////AH/gAAAAAAAD/AD/+AAAA/4AAAAf//////////////8AP4AAAAAAAAf+AP/8AAAP+AAAAH///////////////4A/AAAAAAAAA/4Af/4AAD/gAAAB////////////////gBgAAAAAAAAD/gA//4AAf4AAAAf////////////////AAAAAAAAAAAH+AD//wAB/AAAAH////////////////+AAAAAAAAAAAf4AH//gAAAAAAA/////////////////4AAAAAAAAAAA/AAf//AAAAAAAP/////////////////wAAAAAAAAAAD4AA//+AAAAAAD//////////////////AAAwAAAAAAAGAAD//+AAAAAA//////////////////+AAPgAAAAAAAAAAH//8AAAAAP//////////////////8AD/AAAAAAAAAAAP//8AAAAD///////////////////wAf8AAAAAAAAAAA///4AAAAf///////////////////gB/4AAAAAAAAAAB///4AAAH////////////////////AD/wAAAAAAAAOAH///4AAB/////////gf/////////+AH/gAAAAAAAD8AP///+AAf////////8AB/////////4Af4AAAAAAAA/4A/////wf/////////wAAH////////wA/AAAAAAAAD/gB////////////////AAAB////////gB4AAAAAAAAP/AH///////////////8AAAAf//////+ACAAAAAAAAAf8AP///////////////wAAAAP//////8AAAAAAAAAAB/4A////////////////gAAAAP//////wAAAAAAAAAAD/gB////////////////AAAAAH//////gAAcAAAAAAAP8AH///////////////+AAAAAD//////AAH4AAAAAAAfAAP///////////////8AAAAAD/////+AA/gAAAAAAAwAA////////////////4AAAAAA/////4AP/AAAAAAAAAAB////////////////wAeAAAB/////wA/+AAAAAAAAAAH////////////////gA/gAAA/////gB/8AAAAAAAAAAP////////////////AB/wAAA/////AD/wAAAAAAAAAA////////////////8AD8AAAA////8AH/AAAAAAAAHgD////////////////4APAAAAA////4Af4AAAAAAAB+AH////////////////gAQAMAAA////wA+AAAAAAAAP8Af////////////////AAAD8AAB////AAwAAAAAAAA/wA////////////////8AAA/+AAB///+AAAAAAAAAAD/AD////////////////4AAH//AAB///8AAAAAAAAAAP+AP////////////////gAAH/8AAB///4AAAAAAAAAAf4Af////////////////AAAH+AAAD///wAAYAAAAAAB/wB////////////////8AAADgAAAB///AAHgAAAAAAH+AH////////////////4AAAAAAAAD//+AB/AAAAAAAPgAP////////////////gAAAAA+AAD//8AP+AAAAAAA4AA/////////////////AAAAAP+AAD//wA/4AAAAAAAAAD////////////////8AAAAD/+AAH//gB/wAAAAAAAAAH////////////////wAAAAH/+AAH/+AH/gAAAAAAAAAf////////////////AAAAAP/gAAH/8AP+AAAAAAAAAB////////////////+AAAAAH8AAAH/wA/4AAAAAAAAAD////////////////4AAAAAPAAAAP/gB/AAAAAAAAeAP////////////////gAAAAAAAAAAP/ADgAAAAAAAH4A/////////////////AAAAAAAAAAAf8AEAAAAAAAB/gB////////////////8AAAAAAAAAAA/4AAAAAAAAAf+AH////////////////wAAAAAAAAAAA/gAAAAAAAAD/4Af////////////////AAAAAAAAAAAB/AAAAAAAAA//wB////////////////8AAAAAAAABgAB+AACAAAAAP//AD////////////////wAAAAAAAA/gAB4AA8AAAAD+P4AP////////////////gAAAAAAAH/gABwAPwAAAA/geAA////////////////+AAAAAAAB//AABgB/gAAAH8BgAD////////////////4AAAAAAAD/4AACAH/AAAB/AAAAH////////////////gAAAAAAAD+AAAAAf8AAAfwAAAAf///////////////+AAAAAAAAHgAAAAA/4AAH8AAAAB////////////////4AAAAAAAAAAAAAAD/gAB/AAAAAH////////////////gAAAAAAAAAAAAAAH8AAP4AAAMAf///////////////+AAAAAAAAAAP8AAAfgAD+AAADwB////////////////4AAAAAAAAAD/8AAA4AA/gAAA/AD////////////////gAAAAAAAAAP/4AAAAAP4AAAH8AP///////////////+AAAAAAAAAAP/wAAAAD+AAAAfwA////////////////4AAAAAAAAAAf8AAAAA/wAAAB/AD////////////////gAAAAAAAAAAfAAAAAP8AAAAH8AP///////////////+AAAAAAAAAAAAAAAAB/AAAAAfwA////////////////4AAAAAAAA+AAAAAAAfwAAAAB/AD////////////////gAAAAAAAP4AAAHgAA8AAAAAH4AP///////////////+AAAAAAAD/AAAD/gABwAAAAAeAA////////////////4AAGAAAA/wAAAf/AABAAAAAAgAD////////////////gAB/AAAH8AAAB//AAAAAAAAAAAP///////////////+AAP+AAB/gAAAB/+AAAAAAAAAAA////////////////4AD/+AAP4AAAAD/gAAAAAAAAAAH////////////////gAD/4AAeAAAAAH4AAAAAAAAAEAf///////////////+AAD+AAAAAAAAAGAAAAAAAAABwB////////////////4AAHgAAAAAAAAAAAAAAAAAAAfAH////////////////wAAAAAAAAAAAAAAA4AAAAAAD4Af////////////////gAAAB8AAAAAAAAAH4AAAAAAfgD/////////////////AAAAf8AAAAAAAAB/8AAAAAB8AP/////////////////gAAH/8AAAAAAAAP/8AAAAAPgA//////////////////wAAP/4AAAAAAAAf/wAAAAA+AH//////////////////wAAf/gAAAAAAAAf8AAAAADgAf//////////////////wAAf8AAAAAAAAAfAAAAAAAAD///////////////////wAAfAAAAAAAAAAwAAAAAAAAP///////////////////wAAQAAAAAAAAAAAAAAAAAAB////////////////////wAAAAgAAAAAAAAAD4AAAAAH////////////////////wAAAPAAAAAAAAAA/8AAAAA/////////////////////gAAD/AAAAAAAAAP/8AAAAH/////////////////////gAA/+AAAAAAAAA//gAAAA//////////////////////gAD/+AAAAAAAAAf4AQAAH//////////////////////AAH/8AAAAAAAAAOAGAAB///////////////////////AAP/gAAAAAAAAAABgAAP///////////////////////AAP4AAAAAAAAAAAYAAD///////////////////////+AAOAAAAAAAB8AAAAAA////////////////////////+AAAAAAAAAAfwAAAAAP////////////////////////8AAAAAAAAAH+AAAAAD/////////////////////////4AAAPgAAAB/gAAAAA//////////////////////////4AAB/gAAAf4AAAAAP//////////////////////////wAAf/gAAH+AAAAAD///////////////////////////wAD//AAA/gAAAAAf///////////////////////////gAD/8AAH4AAAAAH////////////////////////////gAD/AAAGAAAAAB/////////////////////////////AAHwAAAAAAAAAf/////////////////////////////AAAAAAAAAAAAH/////////////////////////////+AAAAAAAAAAAA//////////////////////////////8AAAB+AAAAAAP//////////////////////////////8AAAf+AAAAAD///////////////////////////////4AAD//AAAAA////////////////////////////////4AAP/wAAAAP////////////////////////////////wAAH8AEAAB/////////////////////////////////wAAAABAAAf/////////////////////////////////wAAAAAAAH//////////////////////////////////gAAAAAAB///////////////////////////////////gAAAAAAf///////////////////////////////////gAAAAAH////////////////////////////////////gAAAAB/////////////////////////////////////gAAAAP/////////////////////////////////////wAAAD//////////////////////////////////////wAAA///////////////////////////////////////4AAP///////////////////////////////////////8AD/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=",
            "MTV": "data:image/x-icon;base64,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",
            "ANT": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABkCAYAAAAR+rcWAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2NzA0MzZBQUQ4QzBFODExOThFMEZGODExRDM0MTU1NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4NUQxNjM2REMxMEMxMUU4ODNBQjhGMkQwMjlGMDUxNCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4NUQxNjM2Q0MxMEMxMUU4ODNBQjhGMkQwMjlGMDUxNCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjY4MDQzNkFBRDhDMEU4MTE5OEUwRkY4MTFEMzQxNTU2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjY3MDQzNkFBRDhDMEU4MTE5OEUwRkY4MTFEMzQxNTU2Ii8+IDwvcmRmOkRlc2NyaXB0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",
            "HUNO": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAq1BMVEX///8AtPYAtPYAtPbjdHrjdHrjdHoAtPYAtPYAtPYAtPbjdHrjdHrjdHrjdHoAtPYAtPbjdHrjdHoAtPbjdHoAtPYAtPbjdHrjdHoPqeXTcnoAtPbjdHoAtPbjdHoAtPbjdHoAUnYAUnYAUnYAtPbjdHoAj8YqWHfVcnoAUnYAot5VX3cAru4AXoacaXkAg7YcVnYAqOZxY3gAfa4AWH4Als4AZI4Aa5aOZ3hEjR7RAAAAJHRSTlMAIEAwMEAgcMDQkJDQwHDgYGDgUFCgEBCg8ODw8LCwgIDgkIBOVQZsAAAB4ElEQVRYw+1W23KCQAwFBAXEC6hgCwIqtKW11VZ7+f8vKywsbGDDMGX6xnliJpwzm2xONoIwYMAALkQpxYgXkZUU43byRI0KaDoQkadGXGA2x0Skkp1jsaQR04oBZgqHPqrRicQqi6xrdCIh1/mTiIuN7WxjLuaQv4kQ3N3HCLad+NHD41MHhRZ+knRQWKL85yTFCyYQm8Xtuxj/9JoJJG+YgJd3xA49wJnwkwuahE/6B+W/JwU+0CSUZgXdXRBsFuTzSgUu5GdrG4a+16ijDemBndc1k7hRgawKVl4xJ4QSDrwCt3SQrUWfJT+9CMMpfQUUTJgB40B7ca0ELpZTRWSYg8bwA2DOr0ogAfYLGQFDYA8gAn/sK/4eBMbsEVgBDRrsUAkcYMRABFT427ESOMLI7L8EeqfwtyKy16izv62+mWtcs5EpuMbejdS7laGZImomt24mj5oJ2tFpDkQ1CHYuO0+onT0/DGeQTsaiiA6UEz3CDzpQyEzDZ/KZPQAP+VzuPVTbxvqty1gXBB1VyB4WlD+teqPv09b/cS06pwkddj5TP1OoQeQtGFIWUXgLBm/NkWpvnLakEdOAdJ+34pBTTHY0EzWAS1bZxJ4/b9/UhGzNs3kBJ1vzhAEDBvDxC/Lj+t3PSg/vAAAAAElFTkSuQmCC",
            "BTN": "data:image/x-icon;base64,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",
            "TVV": "data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAAEgAAABIAAAAAAAAAAAAAAAzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzP///////////////////////////////////////////////////////////////8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMAG9YAG9YDHdEDHdADHdEBHNQCHNMCHNECHNMBHNQBHNQCHNMCHNECHNMAG9YAG9YAG9YCHdIuQ8twfdg5TdAGH843S9Fue9MJIswDHdADHdA0SM5odc0JIswDHtAAG9YzMzM7Ozve3t6urq5/f386OjrExMTz8/N0dHQ3Nzc3Nze+vr7s7OxpaWkzMzMzMzMzMzNHR0f19fVaWlpCQkJdXV3///+3t7fIyMg+Pj5ZWVn///+zs7Ozs7MzMzMzMzMzMzNKSkr7+/taWlpCQkKmpqba2tpZWVn9/f1WVlampqba2tpWVlbv7+9DQ0MzMzMzMzOlpaX7+/vCwsKMjIzn5+eOjo46OjrExMSZmZnl5eWOjo46OjrAwMCDg4MzMzMzMzN6enrv7++QkJBubm50dHQ9PT0zMzNTU1NsbGx0dHQ9PT0zMzNPT09cXFwzMzMzMzM7OzumpqZFRUUzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "NBL": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyMUJENDczQzJFMjJFNzExQjY2Q0ZDM0MxODhFRTAyMCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5RkEyRTRFRDJFQkQxMUU3QUU5NUFFNzM4QkNCRTk3MSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5RkEyRTRFQzJFQkQxMUU3QUU5NUFFNzM4QkNCRTk3MSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjVDOEJGQ0FBNzcyM0U3MTFBOTU5ODg3Q0UxNUVFRjFDIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjIxQkQ0NzNDMkUyMkU3MTFCNjZDRkMzQzE4OEVFMDIwIi8+IDwvcmRmOkRlc2NyaXB0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",
            "RTF": "data:image/x-icon;base64,AAABAAMAMDAAAAEAIACoJQAANgAAACAgAAABACAAqBAAAN4lAAAQEAAAAQAgAGgEAACGNgAAKAAAADAAAABgAAAAAQAgAAAAAAAAJAAAEwsAABMLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAMAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAQwAAAHAAAACCAAAAXQAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAD0AAACFAAAAmQAAAJkAAACZAAAAjgAAABYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAZmZmZj+/v79v7+/v7t7e3+6enp/uzs7P77+/v69fX16v/////7+/v5tLS0zSIiIq0BAQGkAAAAmgAAAJkAAACZAAAAmQAAAJkAAACZAAAAnAICAqk/Pz/D0NDQ7v/////9/f3+oaGh0A4ODkcAAAAFTExMVvr6+vT+/v7+7u7u/unp6f7p6en+6enp/vr6+v7////+/////v////7////+/////v39/f7u7u7+6enp/vn5+f69vb2kAAAAGwAAAAAiIiIulpaWfq6uro+urq6Prq6uj66uro+ampqAW1tbY+vr69f////+/////u7u7u6VlZXNKioquwwMDK4HBweqBQUFqgkJCasSEhK1R0dHxrCwsOP19fX7//////v7+/mxsbGqIyMjPgAAAAQAAAAAGRkZKJGRkXuurq6Prq6uj66uro+urq6Prq6uj66uro+urq6Prq6uj66uro+urq6Prq6uj66uro+urq6Prq6uj6ioqItLS0tUAAAABQAAAAAAAAAAAAAACgAAABIAAAASAAAAEgAAABIAAAALAAAACzMzM0TJycmr+vr68////////////f39/ePj4/DIyMjsw8PD6tDQ0O7w8PD5///////////8/Pz87e3t3JOTk3sAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAASAAAAEgAAABIAAAASAAAAEgAAABIAAAASAAAAEgAAABIAAAASAAAAEgAAABIAAAASAAAAEgAAAA8AAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQODg4nenp6ZdDQ0LTy8vLk/v7+/P//////////////////////////+vr68+jo6NOrq6uPODg4QQAAABEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAoKCiJMTExGgICAcq6urpPHx8epzMzMr7y8vJ6ampqFampqXSsrKzUAAAATAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAACAAAAAsAAAAYAAAAHgAAABAAAAAJAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////wAA////4///AAD///+B//8AAP///gH//wAA///8Af//AAD///gD//8AAP//8AP//wAA///gA///AAD//+AD//8AAPAPwAMAHwAA4AfAAgAPAADgB8ACAA8AAIAHwAAADwAAAAfAAAAPAAAAB4AAAB8AAAAHAAAAPwAAgAYAAAB/AADgBgACAH8AAOAGAAAAQwAA4AYAAABBAADgB4AAAAEAAOAH/AAAAQAA4Af+AAABAADgB/8AAAEAAOAH/4AAAQAA4Af/gAABAADgB//AAAEAAOAH/8AAAQAA4Af/wAADAADgB//AAAYAAOAH/8AACAAA4Af/wAB4AADgB/+AAGAAAOAB/wAAAAAA4AD+AAAAAACAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAADwAAQAA/4AAf///AAD/4AD///8AAP/4B////wAA////////AAD///////8AAP///////wAA////////AAD///////8AACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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",
            "LST": "data:image/x-icon;base64,AAABAAMAEBAAAAEAIABoBAAANgAAACAgAAABACAAKBEAAJ4EAAAwMAAAAQAgAGgmAADGFQAAKAAAABAAAAAgAAAAAQAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAABAAAAAAAwAAEAlwAAAdkAAAD5AQAA+QAAANkBAAGXAAAAMAAAAQAAAQAAAAAAAAABAAAAAQAAAAABAAAAAAkAAQCaAAAA/gAAAP8BAAD/AAEA/wABAf8AAAH/AQEA/wAAAf4BAAGaAAAACQAAAAAAAAEAAAABAAABAAkAAADCAQEA/wAAAP8BAQD/AAAB/wAAAP8AAQD/AAAA/wAAAf8AAAD/AAEA/wAAAcIAAAEJAAEBAAAAAAAAAQGaAAAA/wAAAP8AAAH/AAAA/wABAP8BAQD/AAAA/wEAAP8AAAD/AAAA/wAAAP8AAQD/AQAAmgAAAQABAAAwAAAA/gAAAP8AAQD/AAAB/wEAAP8NDQ3/ISAg/wcHB/8AAAD/AAAA/wABAf8DAgP/AwIC/wEBAf4AAAAwkpKTl/r6+//8/P3//f39/42Njf95eXj//fz8///+///09PT/Z2Zn/wAAAP8BAQD/1dXV/8jJyP8AAAD/AQEBl5OTk9n/////hIWE/2FgYP81NDT/amtr/2loaf9GR0f/6Ojo/+3t7P8AAAD/AQAB/+np6f/Iycn/AAEA/wAAANmAgID5/v///zc2N/8AAAH/AAAB/wEBAP9QUVD/srOy//z9/P/Gx8b/AAEB/wAAAP/p6en/yMnJ/wAAAf8AAAH5gICB+f7///83Nzf/AAEB/wAAAf9+fn///////+jp6f+RkZD/FBQU/wAAAP8AAAD/6enp/8jIyf8AAAH/AAEA+ZOSk9n//v//Nzc3/wEAAP8BAAD/sbGx//7//v9gYWD/VVVV/0hISP8yMjL/aWho//Pz8v/g4OD/aWlo/ykpKNnQ0dCY/Pz8/ykoKP8AAAD/AAEA/z8/Pv/q6ur///7///38/f93d3f/dnZ2//Ly8//z8/P/8vPz//Pz8/+3traXCgoLMAoKCv4AAAD/AQAA/wAAAP8BAAD/BAQE/yAgIf8RERH/AAAA/wABAf8BAQD/AQAA/wABAf8AAQD+AAABMAAAAAAAAQGaAQAB/wEAAf8AAAD/AQAA/wABAf8AAAD/AAAA/wEAAP8AAAD/AAAA/wABAP8AAAH/AAAAmgEAAAAAAAAAAAAACQAAAMIAAQD/AAEA/wAAAP8AAAH/AQAB/wABAP8AAAD/AQAA/wAAAP8AAAD/AAAAwgAAAAkAAAAAAAAAAAEAAAABAAAJAAAAmgABAP4BAAH/AAAB/wAAAP8AAAD/AQEB/wAAAP8AAAD+AAAAmgAAAQkAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAwAQAAlwEAAdkAAAD5AAEA+QABANkAAAGXAAAAMAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACAAAABAAAAAAQAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAPAAAAWQAAAJsAAADMAAAA7AAAAPwAAAD8AAAA7AAAAMwAAACbAQABWQAAAA8AAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAlAAABnQAAAPYAAAD/AAAA/wAAAP8AAAD/AAAB/wAAAP8AAQD/AQAB/wAAAP8AAAD/AAAA9gAAAZ0AAAAlAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAjAAAAPoAAQD/AAAA/wEAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPoAAAGMAAAACQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAQAAAAAAJQAAANQAAAD/AAAA/wAAAP8BAAD/AAEA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAADUAAAAJQEAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAADrAAAA/wAAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAB/wAAAP8AAADrAAAAMgAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAABAAAlAAEA6wEAAP8AAAD/AAAA/wAAAP8AAQD/AQAA/wAAAP8BAAD/AAAA/wAAAf8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8AAQD/AQAA/wAAAP8AAADrAAAAJQAAAAAAAAAAAAAAAAABAAABAAAAAAAACQAAANQAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AQAA/wABAP8AAADUAAAACQAAAAAAAQEAAAAAAAABAAAAAAGMAQAA/wAAAP8AAQD/AAAA/wAAAP8BAAD/AAAB/wAAAP8BAAD/AAAA/wAAAP8BAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAB/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAACMAQAAAAEAAAAAAAAAAAAAJQAAAPoAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPoAAAAlAAAAAAAAAAAAAACdAAAA/wAAAf8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wYGBv8tLS3/Q0ND/z09Pf8cHRz/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8LCwv/DQ0N/wAAAP8AAAD/AAAA/wAAAJ0AAAAAAAAAD3Fxcfbw8PD/+/v7//v7+//7+/v/+/v7//r7+//e3t7/FRUV/wICAv+Hh4f/8vLy/////////v////7////+///S09L/TExM/wAAAP8AAAD/AAAA/wAAAP8AAAD/hoeH//7+/v//////j4+P/wAAAf8AAAD/AAAA9gAAAA8BAABZ7+/v/////////v////////////////////7///////9BQUD/Wlpa///////////////////////////////////////9/f3/Tk9P/wAAAf8AAAD/AAAA/wAAAP/R0dH///////////+UlJT/AAAA/wAAAP8AAAD/AAAAWQABAJv6+vr////////////d3d3/w8LD/8PDw//Dw8P/wcHB/xEREP9UVFT///7///Hx8f+lpaX/goKC/5ycnP/6+vr////////////IyMj/AAAB/wAAAP8AAAD/AAAA/9PT0v///////////5SUlP8AAAD/AAAA/wEAAf8BAACbAAAAzPr6+////////////29vb/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP9aWlr/EBAQ/wAAAP8AAAD/AAAA/6mpqf///////////+rq6/8AAAD/AAAA/wEAAP8AAAD/09PT////////////lJSU/wAAAP8AAAD/AAAA/wAAAMwAAADs+vr6///////+////b29v/wABAP8AAAD/AAAA/wEAAP8AAAD/AAAA/wAAAf8AAQD/AAAA/zg4OP+SkpL/+fn5////////////ysvK/wAAAP8AAAD/AAAA/wAAAP/T0tP///////////+UlJT/AAAA/wABAP8AAQD/AAAA7AAAAPz6+vr///////////9vb2//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/BAQE/2tra//X19b////////////////////+//7+/v9TU1P/AAAA/wAAAP8AAAD/AQAA/9PT0/////7//////5SUlP8AAAD/AAAA/wAAAP8AAAD8AAAA/Pr7+v///////////29vb/8AAAD/AAAA/wAAAP8BAAD/AAAA/wABAf+ysrP////////////////////////////j4+P/UFBQ/wAAAP8AAAD/AAAB/wAAAP8AAAD/09PT///////+/v//lJSU/wAAAP8AAAD/AAAB/wEAAPwAAADs+vr6///+////////b29v/wEAAf8AAAD/AAAA/wAAAP8AAAD/R0dH//////////////7///X19f+sraz/VlZW/wcHB/8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP/T09P////////+//+UlJT/AAAA/wAAAP8AAAD/AAAA7AAAAMz6+vr///////////9vb2//AAAA/wAAAf8AAAH/AAAA/wAAAP9xcXH/////////////////Li4v/wAAAP8AAAD/AAAA/w4ODv8AAAD/AAAA/wAAAP8AAAD/AAAA/9PT0v///////////5SUlP8AAAD/AQAA/wAAAP8AAADMAAAAm/v6+v///////////29vb/8AAAD/AAAB/wABAP8AAAH/AAAA/1ZWVv///////v/////////Kysr/iIiI/4+Pj//ExMT/8/Pz/x8fH/8EBAT/xsbG/9PT0//S09P/9/f3////////////7e3t/9PT0//T09P/iYmJ/wAAAJsAAABZ+vr6//////////7/bW1t/wAAAP8AAAD/AAAA/wAAAP8AAAD/CQkJ/9nZ2f////////////////////////////7+////////QkJC/x0cHP////7///////////////7////+///////////////////////19fX/AAAAWQAAAA/6+vr7//////X19f8zMzP/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/Gxsb/7GxsP/8/Pz///7/////////////+fn5/5mZmf8CAwP/AwMD/7q6u//n5+b/5+fm/+fn5v/n5+f/5+fn/+fn5//n5+f/5+fn/8TExPYAAAAPAAAAAAsLC50dHR3/CgoK/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAB/wABAP8AAQD/AAAA/xISEv87Ozv/RUVF/zc2Nv8ODg7/AAAB/wAAAP8AAQD/AAAB/wAAAP8AAQD/AAAA/wEAAP8AAAD/AAAA/wAAAP8AAAD/AAAAnQEAAQAAAQAAAAAAJQAAAPoAAQD/AAAA/wAAAP8AAAD/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8AAAD/AAAA/wAAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAPoAAAAlAAAAAAAAAAAAAQAAAQAAjAAAAP8AAAD/AAAA/wEAAP8BAAD/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEBAP8AAAH/AAAA/wAAAP8AAAD/AAEA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAB/wAAAP8AAAD/AAABjAAAAAAAAAAAAQAAAAAAAAAAAAAJAAAA1AAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wABAP8BAAD/AAAA/wAAAP8AAQH/AAAA/wAAAP8AAAD/AAAA/wAAANQAAAAJAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAlAAAA6wAAAP8AAAH/AAAA/wAAAP8AAQD/AAAB/wABAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wABAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAADrAAAAJQAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAyAAAA6wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEAAP8AAAD/AAAA/wABAP8AAAD/AAEA6wAAATIAAAAAAAABAAAAAAABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlAAAA1AAAAf8AAAD/AAAA/wAAAP8BAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAH/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAD/AAAA/wAAANQAAAAlAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAQAJAAABjAAAAPoAAAD/AAAA/wAAAP8BAAD/AQEB/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAAD/AAAA/wAAAPoAAACMAAAACQAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAQAAAAEAAAAAJQAAAJ0AAAD2AAAA/wAAAP8AAAD/AAEA/wEAAP8AAAD/AAAA/wAAAP8AAAH/AQAA/wEAAPYAAACdAAAAJQAAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAQABAAAAAA8AAABZAAAAmwAAAMwAAADsAAAA/AAAAPwAAADsAAAAzAAAAZsAAABZAAAADwAAAAAAAAAAAAAAAAAAAAABAAEAAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAADAAAABgAAAAAQAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAARAAAAIgAAAEkAAACFAAAAtQAAANkAAADwAAAA/AAAAPwAAADwAAAA2QAAALUAAACFAQAASQAAACIAAAARAAAAAgAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEAAAAMgAAAHUAAACxAAAA5QAAAf8AAAD/AAAA/wAAAf8AAQD/AAAA/wAAAf8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAOUAAACxAAAAdQAAADEAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAB4AAACdAAAA4wAAAPoAAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA+gAAAOMAAACdAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAVAAAAcwAAAPIAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA8gAAAXMAAAAUAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAD8AAAC4AAAA+gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAPoAAQC4AAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAZQAAAOgAAAD+AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD+AAAA6AAAAGUAAAABAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAQBxAAAA9AAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPQAAABxAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAQAAAHEAAADtAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAADtAAAAcQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZQAAAPQAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAQD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AQAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA9AAAAGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAA/AAAA6AAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAOgAAAA/AAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUAAAC4AAAA/gAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAf8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAC4AAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHMAAAD6AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD6AAAAcwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAPIAAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAf8AAQD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA8gAAAB4AAAAAAAAAAAAAAAAAAAAEAAAAnQAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAJ0AAAAEAAAAAAAAAAAAAAAyAAAA4wAAAf8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wMDA/8oKSj/VVVV/21tbf9xcXH/YGBg/z09Pf8NDQ3/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8FBQX/Gxoa/xsbG/8HBgf/AQAA/wAAAP8AAAD/AAAA/wAAAOMAAAAxAAAAAAAAAAIRERF1Z2dn+tzc3P/29vb/+Pj4//j4+P/4+Pj/+Pj4//j4+P/4+Pj/+Pj4/+Li4v9ZWVn/AwMD/wAAAP8SEhL/bGxs/9zc3P/////////////////////////////////u7u7/mpqa/ykpKf8FBQX/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/zMzM//a2tr////////////6+/r/R0dH/wAAAP8AAAD/AAAA/wAAAPoAAAB1AAAAAgAAABFra2ux7e3t/////////v///////////v///////////////v////////////////+2trb/ExIS/w0NDf+UlJT/+Pn5/////////////////////////////////////////v///////+Pj4/9gYGD/BgYG/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/5mZmf///////v//////////////Tk5O/wAAAP8AAAD/AAAA/wAAAf8AAACxAAAAEQAAACKDg4Pl/Pz8///////////////////////////////////////////////////////AwMD/FRUV/yMjI//n5+f//v///////////////////////////////////////////////////////v/m5ub/LCws/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/7W1tf///////////////v//////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAADlAQAAIgAAAEl7e3v//f39//////////////////n5+f/r6+v/6+vr/+vr6//r6+v/6+vr/+vr6/+RkJH/CgoK/yIiIv/k5OT///////39/f/u7u7/3d3d/9XV1f/W1tb/4uLi//z8/P//////////////////////kJCQ/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAASQAAAIV7e3v//f39/////////////////8vLyv9DQ0P/Q0ND/0NDQ/9DQ0P/Q0ND/0NDQv8gICD/AQAA/woKCv+Dg4P/5OTk/5aWlv9MTEz/Gxsb/wQEBP8GBgb/KCgo/7Gxsf//////////////////////z8/P/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3t///////////////////////T05O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAhQAAALV7e3v//f39/////v///////////7m5uf8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8MDAz/JSQk/wkJCf8AAAD/AQAA/wAAAP8AAAD/AAAA/25ubv//////////////////////3Nzc/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAtQAAANl7e3v//f39/////////////////7m5uf8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/w4ODv8iIiL/ampq//Dw8f//////////////////////ubm5/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA2QAAAPB7e3v//f39/////////////////7m5uf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wICAv8mJib/aWlp/6mpqf/h4eH//f39///////////////////////7+vv/YWFh/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA8AAAAPx7e3v//f39/////////////////7m5uf8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/CgoK/4yMjP/f39//9/f3//////////////////////////////////7+/v+xsbH/FBQU/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3tv//////////////////////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/AAAAPx7e3v//f39/////////////////7m5uf8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8fHx//xMTE///////////////////////////////////////+/v7/8fDw/62trf8dHR3/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/AAAAPB7e3v//f39/////////////////7m5uf8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wkJCf+Ojo7/+/v7/////////////////////////////////+Tk5P+kpKT/VVVV/wgICP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA8AAAANl7env//f39/////////////////7m5uf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/x0dHf/U1NT//v///////////v////////n5+f+7u7v/X19f/yIiIv8NDQ3/AQEB/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA2QAAALV7e3v//f39/////////////////7m5uP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/yUlJf/v7u///////////////////////2FhYf8AAAD/AAAA/wAAAP8AAAD/AAAA/wUFBf8CAgL/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/7e3t///////////////////////Tk5O/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAAtQAAAIV7e3v//f39/////////////////7m5uf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/yQkJP/s7Oz//////////////////////3l5ef8aGhr/BgYG/wwMDP8jIiP/UlJS/4qKiv8+Pj7/AAEB/wAAAP8eHh7/UFBQ/1NTU/9TU1P/U1NT/87Ozv///////v//////////////iIiI/1NTU/9TU1P/U1NT/zQ0Nf8CAgL/AAAAhQAAAEl7e3v//f39/////////////v///7m5uf8AAQD/AAAA/wAAAf8AAAD/AQAA/wAAAP8AAAD/AAAA/xoaGv/MzMz///////////////////////X19f/d3d3/1tbW/9jY2P/g4eD/8PDw//39/f+srKz/EBAQ/wICAv95eXn/7u7u//Dw8P/w8PD/8PDw//v7+///////////////////////9fX1//Dw8P/w8PD/8PDw/9jY2f9CQkL/AAAASQAAACKJiYnl/f39/////////v///////7e3t/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wUFBf+AgID/+vr6/////v/////////////////////////////////////////////////IyMj/GBgY/wkJCf+cnJz//////////////////////////////////////////////////////////////v////////v7+/+BgYHlAAAAIgAAABGxsbGx/f39/////////////////56env8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8cHBz/oaGh//39/f////////////////////////////////////////////v7+v+Tk5P/CwsL/wYGBv+NjI3//v7+/////////////////////////////////////////////v///////v////////////n5+f+dnZ2xAAAAEQAAAALt7e1//v7+/f///v//////4+Pj/zIyMv8AAQD/AAAA/wAAAP8AAQD/AQAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/Dw8P/1xcXP/U1NT//f39////////////////////////////8PDw/4mJif8YGRj/AQAA/wAAAP8vLi//tbW1/9fX1//X19f/1tfX/9fX1//X1tf/19fX/9fX1v/X19f/19fX/9fX1//X19f/19fX/8rKyvp6enp1AAAAAgAAAAAAAAAxFRUV4y8vL/8qKir/BgYG/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8EBAT/LCws/1tbW/9xcXH/cnJy/2JiYv88PDz/CQkJ/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAOMAAAAyAAAAAAAAAAAAAAAEAAAAnQAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAJ0AAAAEAQAAAAAAAAAAAAAAAAAAHgAAAPIAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA8gAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHMAAAD6AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD6AAAAcwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARQAAAC4AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAC4AAAAFQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAEAAAA/AAAA6AAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAf8AAAD/AQAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAegAAAA/AAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAZQAAAPQAAAD/AAAA/wAAAf8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAQD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA9AAAAGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAQAAAXEAAADtAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAADtAAAAcQAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAQAAAAAAAAAAAQcAAQBxAAAA9AAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPQAAABxAQAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAZQAAAOgAAAD+AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAQD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AAAA/wAAAP8AAAD+AAAA6AAAAGUAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAC4AAAA+gAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPoAAAC4AAAAPwAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAUAAAAcwAAAPIAAQD/AAAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA8gAAAHMAAAAVAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAR4AAACdAAAA4wAAAfoAAAD/AAAA/wAAAP8AAAD/AQAA/wAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA+gAAAOMAAACdAAAAHgAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAEAAAAMQAAAHUAAACxAAAA5QAAAP8AAQD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAf8AAAD/AQAA/wAAAOUAAACxAQAAdQAAADIAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAARAAAAIgAAAUkAAACFAAAAtQAAANkAAADwAAAA/AAAAPwAAADwAAAA2QAAAbUAAACFAAAASQAAACIAAAARAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
        };

        const get_tracker_icon = (tracker) => {
            return trackerIcons[tracker] || "https://default-favicon.ico"; // Provide a default favicon URL
        };

        const use_api_instead = (tracker) => {
            if (
                (tracker === "BLU") ||
                (tracker === "Aither") ||
                (tracker === "RFX") ||
                (tracker === "OE") ||
                (tracker === "HUNO") ||
                (tracker === "TIK") ||
                (tracker === "LST")
            )
                return true;
            else return false;
        };

        const use_post_instead = (tracker) => {
            if (
              (tracker === "BHD") ||
              (tracker === "HDB") ||
              (tracker === "NBL") ||
              (tracker === "BTN") ||
              (tracker === "ANT") ||
              (tracker === "RTF")
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
                "AI-Raws",
                "3L",
                "3DAccess",
                "CultFilms",
                "BluDragon",
                "AdBlue",
                "EML HDTeam",
                "FTW-HD"
                //"ExampleText3"
            ];
        };

        const badGroups = () => {
            return [
                "NOGRP",
                "nogroup",
                "VC-1",
                "MIXED",
                "Mixed"
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
                                if (documentTitle.includes("(1080i)")) {
                                    infoText += " 1080i";
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
                        const statusFind = torrent.querySelector('seeders[currentseed="true"]');
                        if (statusFind) {
                            torrent_obj.status = "seeding";
                        } else {
                            torrent_obj.status = "default";
                        }
                        const inputTimeElement = parseInt(torrent.querySelector('date[type="UNIX"]').textContent);
                        if (inputTimeElement) {
                            let time = inputTimeElement;
                            if (isNaN(time)) {
                                return null;
                            }
                            torrent_obj.time = time;
                        }
                        torrent_obj.groupId = "";
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
                            if (groupText && groupText.includes("FraMeSToR")) {
                                if (formatted.includes("DV")) {
                                    if (improved_tags) {
                                        formatted = formatted.replace("DV", "DV HDR");
                                    }
                                }
                            }
                            let files = parseInt(torrent.querySelector('files').textContent);

                            if (formatted.includes("BluRay") && (!isMiniSeriesFromSpan) && torrent_obj.size && files > 10) {
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
                            const inputTimeElement = torrent.querySelector('pubDate');
                            if (inputTimeElement) {
                                const inputTime = inputTimeElement.textContent.trim();
                                let time = toUnixTime(inputTime);
                                if (isNaN(time)) {
                                    return null;
                                }
                                torrent_obj.time = time;
                            }

                            torrent_objs.push(torrent_obj);
                        };
                    });
                } catch (error) {
                    console.error("Error processing XML from MTV:", error);
                }
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
                    const inputTimeElement = d.querySelector('.torrenttable > tbody > tr > td:nth-child(4)');
                    if (inputTimeElement) {
                        let inputTime = inputTimeElement.innerHTML.trim();
                        inputTime = inputTime.replace('<br>', ' ');
                        inputTime = inputTime.replace(/<\/?nobr>/g, '');
                        let time = toUnixTime(inputTime);
                        if (isNaN(time)) {
                            return null;
                        }
                        torrent_obj.time = time;
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
            torrent_objs = torrent_objs.map(e => {
                return { ...e, "quality": get_torrent_quality(e) };
            });
            return torrent_objs;
        };

        const is_movie_exist = (tracker, html) => { // true or false
            if (tracker === "TVV") {
                if (html.querySelector('NoResults') !== null) {
                    return false;
                } else if (html.querySelector('SearchError[value="1"]') !== null) {
                    console.warn("TVV authorization missing");
                    return false;
                } else if (html.querySelector('SearchError[value="2"]') !== null) {
                    console.warn("TVV authorization invalid or account disabled");
                    return false;
                } else if (html.querySelector('SearchError[value="3"]') !== null) {
                    console.warn("Not enough privileges for this TVV search");
                    return false;
                } else if (html.querySelector('SearchError[value="100"]') !== null) {
                    console.warn("Searching TVV too soon");
                    displayAlert("Searching TVV too soon");
                    return false;
                } else if (html.querySelector('SearchError[value="101"]') !== null) {
                    let timeValue = html.querySelector('SearchError[value="101"]').textContent;
                    console.warn(`RTF: ${timeValue}`);
                    displayAlert(`RTF: ${timeValue}`);
                    return false;
                } else if (html.querySelector('SearchError') !== null) {
                    console.warn("Some issue with TVV searching");
                    return false;
                } else {
                    return true;
                }
            }
            else if (tracker === "MTV") {
                if (html.querySelector('item') === null) return false;
                else return true;
            }
            else if (tracker === "BLU" || tracker === "Aither" || tracker === "RFX" || tracker === "OE" || tracker === "HUNO" || tracker === "TIK" || tracker === "LST") {
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
            else if (tracker === "PTP") {
                return true;
            }
        };

        const post_json = async (post_query_url, tracker, postData) => {
            // Define the headers mapping
            const headersMapping = {
                'ANT': {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Host': 'anthelion.me'
                },
                'RTF': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': GM_config.get("rtf_api"),
                },
                // Add more trackers and their headers as needed
            };

            // Get the headers for the specific tracker
            const headers = headersMapping[tracker] || {
                'Content-Type': 'application/json'
            };  // Default headers if tracker not found

            if (debug) {
                console.log(`Headers for ${tracker}`, headers);
            }

            // Assign GET here as needed.
            const methodMapping = {
                'RTF': 'GET',
            };
            const method = methodMapping[tracker] || 'POST';

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: post_query_url,
                    method: method,
                    data: JSON.stringify(postData),
                    headers: headers,
                    onload: (res) => {
                        resolve(res);
                    },
                    onerror: (err) => {
                        reject(err);
                    },
                    onabort: (err) => {
                        reject(err);
                    },
                    ontimeout: (err) => {
                        reject(err);
                    },
                });
            });

            if (response.status === 200) {
                return JSON.parse(response.responseText);
            } else if (response.status === 401) {
                const jsonResponse = JSON.parse(response.responseText);
                console.log(`raw response from ${tracker}`, response.responseText);
                if (tracker === 'RTF' && jsonResponse.error && jsonResponse.message === "Invalid API token.") {
                    displayAlert("Updating RTF API token");
                }
                return jsonResponse;
            } else {
                if (debug) {
                    console.log(`Raw response from ${tracker}`, response.responseText);
                }
                console.warn(`Error: ${tracker} HTTP ${response.status} Error.`);
                displayAlert(`${tracker} returned not ok`);
                return null;  // Allow other processing to continue by returning null
            }
        };

        const login_json = async (login_url, RTF_LOGIN, loginData) => {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: login_url,
                    method: "POST",
                    data: JSON.stringify(loginData),
                    headers: headers,
                    onload: (res) => {
                        resolve(res);
                    },
                    onerror: (err) => {
                        reject(err);
                    },
                    onabort: (err) => {
                        reject(err);
                    },
                    ontimeout: (err) => {
                        reject(err);
                    },
                });
            });

            if (response.status === 201) {
                if (debug) {
                    console.log(`Raw response from ${RTF_LOGIN}`, response.responseText);
                }
                return JSON.parse(response.responseText);
            } else {
                if (debug) {
                    console.log(`Raw response from ${RTF_LOGIN}`, response.responseText);
                }
                console.warn(`Error: ${RTF_LOGIN} HTTP ${response.status} Error.`);
                displayAlert(`${RTF_LOGIN} returned not ok`);
                return null;  // Allow other processing to continue by returning null
            }
        };

        const fetch_login = async (login_url, loginData) => {
            try {
                const result = await login_json(login_url, 'RTF_LOGIN', loginData);
                if (result) {
                    if (result.token) {
                        return result;
                    } else {
                        console.log("RTF response", result);
                        console.log("RTF data", loginData);
                        return null;
                    }
                } else {
                    return null;
                }
            } catch (error) {
                console.error(`Error in fetch_login for RTF_LOGIN`, error);
                return null;
            }
        };

        // URL and login data
        const login_url = "https://retroflix.club/api/login";
        const loginData = { username: RTF_USER, password: RTF_PASS };

        (async () => {
            const result = await fetch_login(login_url, loginData);
            if (result) {
                const token = result.token;
                if (debug) {
                    console.log("Login successful", result);
                    console.log("Extracted token:", token);
                }
                GM_config.set("rtf_api", token);
            } else {
                console.log("Login failed");
            }
        })();

        const fetch_url = async (query_url, tracker) => {
            const response = await new Promise(async (resolve, reject) => {
                GM_xmlhttpRequest({
                    url: query_url,
                    method: "GET",
                    onload: (res) => {
                        resolve(res);
                    },
                    onerror: (err) => {
                        reject(err);
                    },
                    onabort: (err) => {
                        reject(err);
                    },
                    ontimeout: (err) => {
                        reject(err);
                    },
                });
            });

            if (response.status === 200) {
                const contentType = response.responseHeaders.match(/content-type: ([^;]+)/i)[1].toLowerCase();
                const parser = new DOMParser();
                let result;

                if (contentType.includes("xml")) {
                    const xmlDoc = parser.parseFromString(response.responseText, "text/xml");

                    if (debug) {
                    // Function to convert XML item to a JavaScript object
                    function parseItem(item) {
                        const getTextContent = (tagName) => item.getElementsByTagName(tagName)[0]?.textContent || "";

                        const attributes = Array.from(item.getElementsByTagName('torznab:attr')).reduce((acc, attr) => {
                            acc[attr.getAttribute('name')] = attr.getAttribute('value');
                            return acc;
                        }, {});

                        return {
                            title: getTextContent('title'),
                            guid: getTextContent('guid'),
                            link: getTextContent('link'),
                            comments: getTextContent('comments'),
                            pubDate: getTextContent('pubDate'),
                            size: getTextContent('size'),
                            files: getTextContent('files'),
                            grabs: getTextContent('grabs'),
                            categories: Array.from(item.getElementsByTagName('category')).map(cat => cat.textContent),
                            description: getTextContent('description'),
                            enclosure: {
                                url: item.getElementsByTagName('enclosure')[0]?.getAttribute('url') || "",
                                length: item.getElementsByTagName('enclosure')[0]?.getAttribute('length') || "",
                                type: item.getElementsByTagName('enclosure')[0]?.getAttribute('type') || ""
                            },
                            torznabAttributes: attributes
                        };
                    }

                    // Extract all <item> elements and parse them
                    const items = Array.from(xmlDoc.getElementsByTagName('item')).map(parseItem);

                    if (items.length === 0) {
                        console.log(`No resopnse XML from ${tracker}`, response.responseText);
                    }

                    console.log(`XML array from ${tracker}`, items); // Log the items array
                    }

                    result = xmlDoc; // Return the XML document for further processing
                } else {
                    result = parser.parseFromString(response.responseText, "text/html").body;
                }

                return result;
            } else {
                console.warn(`Error: HTTP ${response.status} Error.`);
                displayAlert(`${tracker} returned not ok`);
                return null;
            }
        };

        const generateGUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const fetch_tracker = async (tracker, imdb_id, show_name, show_nbl_name, tvdbId, timeout = timer) => {
            return new Promise(async (resolve, reject) => {
                const timer = setTimeout(() => {
                    console.warn(`Error fetching data from ${tracker}`);
                    displayAlert(`Error fetching data from ${tracker}`);
                    resolve([]);
                }, timeout);
                let query_url = "";
                let api_query_url = "";
                let post_query_url = "";
                let postData = {};

                if (tracker === "HDB") {
                    post_query_url = "https://hdbits.org/api/torrents";
                    postData = {
                    username: HDB_USER_NAME,
                    passkey: HDB_PASS_KEY,
                    imdb: { id: imdb_id.split("tt")[1] }
                    };
                }
                else if (tracker === "BTN") {
                    post_query_url = "https://api.broadcasthe.net/";
                    if (tvdbId) {
                        postData = {
                            jsonrpc: "2.0",
                            id: generateGUID().substring(0, 8),
                            method: "getTorrentsSearch",
                            params: [
                                BTN_API_TOKEN,
                                {
                                    tvdb: tvdbId
                                },
                                20, // Results per page
                            ]
                        };
                    } else {
                        // Fallback to search method if TVDB ID is not available
                        postData = {
                            jsonrpc: "2.0",
                            id: generateGUID().substring(0, 8),
                            method: "getTorrentsSearch",
                            params: [
                                BTN_API_TOKEN,
                                {
                                    search: show_name
                                },
                                20,
                            ]
                        };
                    }
                }
                else if (tracker === "MTV") {
                    query_url = "https://www.morethantv.me/api/torznab?t=search&apikey=" + MTV_API_TOKEN + "&imdbid=" + imdb_id;
                }
                else if (tracker === "ANT") {
                    post_query_url = "https://anthelion.me/api.php?apikey=" + ANT_API_TOKEN + "&t=movie&imdbid="+ imdb_id + "&o=json";
                } else if (tracker === "BHD") {
                    post_query_url = "https://beyond-hd.me/api/torrents/" + BHD_API_TOKEN;
                    postData = {
                        action: "search",
                        rsskey: BHD_RSS_KEY,
                        imdb_id: imdb_id.split("tt")[1]
                    };
                } else if (tracker === "BLU") {
                    api_query_url =
                        "https://blutopia.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=3&perPage=100&api_token=" +
                        BLU_API_TOKEN;
                }
                else if (tracker === "TIK") {
                    api_query_url =
                        "https://cinematik.net/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=3&categories[3]=4&categories[4]=5&categories[5]=6&perPage=100&api_token=" +
                        TIK_API_TOKEN;
                }
                else if (tracker === "Aither") {
                    api_query_url =
                        "https://aither.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&perPage=100&api_token=" +
                        AITHER_API_TOKEN;
                }
                else if (tracker === "RFX") {
                    api_query_url =
                        "https://reelflix.xyz/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&perPage=100&api_token=" +
                        RFX_API_TOKEN;
                }
                else if (tracker === "OE") {
                    api_query_url =
                        "https://onlyencodes.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&perPage=100&api_token=" +
                        OE_API_TOKEN;
                }
                else if (tracker === "HUNO") {
                    api_query_url =
                        "https://hawke.uno/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=2&categories[1]=1&perPage=100&api_token=" +
                        HUNO_API_TOKEN;
                } else if (tracker === "LST") {
                    api_query_url =
                        "https://lst.gg/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=6&categories[3]=8&perPage=100&api_token=" +
                        LST_API_TOKEN;
                }
                else if (tracker === "TVV") {
                    query_url = "https://tv-vault.me/xmlsearch.php?query=get&torrent_pass=" + TVV_TORR_PASS + "&imdbid=" + imdb_id + "&xmladd-x-currentseed=1";
                }
                else if (tracker === "RTF") {
                    post_query_url = "https://retroflix.club/api/torrent?imdbId=" + imdb_id + "&page=1&itemsPerPage=50&sort=torrent.createdAt&direction=desc";
                }
                else if (tracker === "NBL") {
                    post_query_url = "https://nebulance.io/api.php";
                    postData = {
                        jsonrpc: "2.0",
                        id: generateGUID().substring(0, 8),
                        method: "getTorrents",
                        params: [
                            NBL_API_TOKEN,
                            {
                                //tvmaze: nbl_test
                                series: show_nbl_name
                            },
                            20, // Results per page
                            0   // Page number
                        ]
                    };
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
                else if (tracker === "PTP") {
                    query_url = "https://passthepopcorn.me/torrents.php?imdb=" + imdb_id;
                }
                const performRequest = () => {
                    if (use_post_instead(tracker) === true) {
                        post_json(post_query_url, tracker, postData, timeout)
                            .then(result => {
                                if (debug) {
                                    console.log(`URL for ${tracker}`, post_query_url);
                                    console.log(`Post data for ${tracker}`, postData);
                                }
                                clearTimeout(timer); // Clear the timer on successful fetch
                                if (result) {
                                    if (result?.results && tracker === "BHD") {
                                        if (result.status_code !== 1) {
                                            console.log("BHD returned a failed status code");
                                            resolve([]);
                                        }
                                        if (result.total_results === 0) {
                                            console.log("BHD reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            if (debug) {
                                                console.log("BHD response", result.results);
                                            }
                                            console.log("Data fetched successfully from BHD");
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (result?.data && tracker === "HDB") {
                                        switch (result.status) {
                                            case 1:
                                                console.log("HDB: Failure (something bad happened)");
                                                resolve([]);
                                                break;
                                            case 4:
                                                console.log("HDB: Auth data missing");
                                                resolve([]);
                                                break;
                                            case 5:
                                                console.log("HDB: Auth failed (incorrect username / password)");
                                                resolve([]);
                                                break;
                                            default:
                                                if (result.data.length === 0) {
                                                    console.log("HDB reached successfully but no results were returned");
                                                    resolve([]);
                                                } else {
                                                    if (debug) {
                                                        console.log("HDB response", result.data);
                                                    }
                                                    console.log("Data fetched successfully from HDB");
                                                    resolve(get_post_torrent_objects(tracker, result));
                                                }
                                        }
                                    } else if (result.result && tracker === "NBL") {
                                        if (result) {
                                            const extractedText = result.result;
                                            if (extractedText.includes("NBL API is down at the moment")) {
                                                displayAlert('NBL API is down at the moment');
                                                console.warn("NBL API is down at the moment");
                                            }
                                        }
                                        if (debug) {
                                            console.log("NBL response", result.result);
                                        }
                                        resolve(get_post_torrent_objects(tracker, result));
                                    } else if (tracker === "BTN" && result?.result) {
                                        if (result.result.results === "0") {
                                            console.log("BTN reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            if (debug) {
                                                console.log("BTN response", result.result);
                                            }
                                            console.log("Data fetched successfully from BTN");
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (result?.item && tracker === "ANT") {
                                        if (result.item.length === 0) {
                                            console.log("ANT reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            if (debug) {
                                                console.log("ANT response", result.item);
                                            }
                                            console.log("Data fetched successfully from ANT");
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (tracker === "RTF" && Array.isArray(result)) {
                                        if (result.length === 0) {
                                            console.log("RTF reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            if (debug) {
                                                console.log("RTF response", result);
                                            }
                                            console.log("Data fetched successfully from RTF");
                                            resolve(get_post_torrent_objects(tracker, result)); // Resolve the result directly
                                        }
                                    }
                                }
                            })
                            .catch(error => {
                                console.warn(`Error fetching data from ${tracker}`);
                                //displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]);
                            });
                    } else if (use_api_instead(tracker) === false) {
                        fetch_url(query_url, tracker)
                            .then(result => {
                                if (debug) {
                                    console.log(`URL for ${tracker}`, query_url);
                                }
                                clearTimeout(timer); // Clear the timer on successful fetch
                                let movie_exist = is_movie_exist(tracker, result);
                                if (movie_exist === false) {
                                    console.log(`${tracker} reached successfully but no results were returned`);
                                    resolve([]);
                                } else {
                                    if (debug) {
                                        console.log(`HTML data from ${tracker}`, result);
                                    }
                                    console.log(`Data fetched successfully from ${tracker}`);
                                    resolve(get_torrent_objs(tracker, result));
                                }
                            })
                            .catch(error => {
                                console.warn(`Error fetching data from ${tracker}:`);
                                //displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]); // Resolve with an empty array if there's an error
                            });
                    } else {
                        fetch(api_query_url)
                            .then(response => {
                                clearTimeout(timer); // Clear the timer on successful fetch
                                if (!response.ok) throw new Error('Failed to fetch data');
                                if (debug) {
                                    console.log(`HTML response from ${tracker}`, response);
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (data.data.length === 0) {
                                    if (debug) {
                                    console.log(`Data array from ${tracker}`, data);
                                    }
                                    console.log(`${tracker} reached successfully but no results were returned`);
                                } else {
                                    if (debug) {
                                        console.log(`Data array from ${tracker}`, data.data);
                                    }
                                    console.log(`Data fetched successfully from ${tracker}`);
                                }
                                resolve(get_api_torrent_objects(tracker, data));
                            })
                            .catch(error => {
                                console.warn(`Error fetching data from ${tracker}:`);
                                //displayAlert(`Error fetching data from ${tracker}`);
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

                                if (d.commentary === 1) {
                                    infoText = "Commentary " + infoText;
                                }

                                const resolution = d.type;
                                if (resolution) {
                                    let resText = resolution;
                                    const originalResText = resText;

                                    resText = resText.replace(/UHD\s?.{0,3}/, "2160p");
                                    resText = resText.replace(/BD\s?.{0,3}/, "1080p");

                                    if (!infoText.includes(resText)) {
                                        infoText = `${resText} ${infoText}`;
                                    }

                                    if (!infoText.includes(originalResText)) {
                                        infoText = `${originalResText} ${infoText}`;
                                    }
                                    if (!infoText.toLowerCase().includes("remux") && (originalResText.includes("UHD") || originalResText.includes("BD"))) {
                                        infoText = "m2ts" + infoText;
                                    }
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

                            const inputTime = d.created_at;
                            let time = toUnixTime(inputTime);
                            if (isNaN(time)) {
                                return null;
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
                                time: time,
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
                            let releaseName = d.filename.replace(/\.torrent$/, "");
                            if (releaseName.length < 20) {
                                releaseName = d.name;
                            }
                            const pullExtention = releaseName.match(/[^.]+$/);
                            const extention = pullExtention ? pullExtention[0] : null;

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
                            if (improved_tags) {
                                const bdType = get_blu_ray_disc_type(d.size);
                                if (improved_tags && infoText.includes("Blu-ray") && (infoText.includes("1080p") || infoText.includes("2160p"))) {
                                    infoText = `${bdType} ${infoText}`;
                                }
                                const isAudioOnly = d.type_category === 6 ? true : false;
                                if (isAudioOnly) {
                                    infoText = infoText += "Audio Only Track";
                                }
                                if (extention) {
                                    infoText = `${infoText} ${extention}`;
                                }
                                if (!extention && releaseName.includes("Blu-ray") || releaseName.includes("BluRay") || releaseName.includes("BLURAY")) {
                                    let lower = releaseName.toLowerCase();
                                    if (!lower.includes("remux")) {
                                    infoText = "m2ts" + infoText;
                                    }
                                }
                                if (releaseName && releaseName.includes("Blu-ray") || releaseName.includes("BluRay") || releaseName.includes("BLURAY") && (!infoText.includes("Blu-ray"))) {
                                    infoText = infoText += "Blu-ray";
                                }
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

                            const time = parseInt(d.utadded);
                            if (isNaN(time)) {
                                return null;
                            }

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
                                time: time,
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

                                const inputTime = d.rls_utc;
                                let time = toUnixTime(inputTime);
                                if (isNaN(time)) {
                                    return null;
                                }

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
                    }
                } catch (error) {
                    console.error("An error occurred while processing NBL tracker:", error);
                }
            } else if (tracker === "BTN") {
                try {
                    let season2 = false;
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
                                              groupText = groupText.replace("Z0N3", "D-Z0N3");
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
                                  let updatedText = replaceFullStops(cleanTheText);
                                  if (updatedText.includes("S02")) {
                                      season2 = true;
                                  }
                                  const extension = d.Container;
                                  if (improved_tags) {
                                      if (extension) {
                                          updatedText = `${updatedText} ${extension}`;
                                      }
                                  }
                                  const id = d.GroupID;
                                  const tid = d.TorrentID;
                                  const pageURL = 'https://broadcasthe.net/torrents.php?id=';

                                  const time = parseInt(d.Time);
                                  if (isNaN(time)) {
                                      return null;
                                  }

                                  const torrentObj = {
                                      api_size: api_size,
                                      datasetRelease: originalInfoText,
                                      size: size,
                                      info_text: updatedText,
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
                                      time: time,
                                      season2: season2,
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
                    }
                } catch (error) {
                    console.error("An error occurred while processing BTN tracker:", error);
                }
            }
            else if (tracker === "ANT") {
                try {
                    torrent_objs = postData.item.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size

                        let infoText;
                        let filesCount = d.fileCount;
                        if (filesCount === 1 && d.files.length > 0) {
                          infoText = d.files[0].name;
                        } else {
                          infoText = d.fileName;
                        }

                        const inputTime = d.pubDate;
                        let time = toUnixTime(inputTime);
                        if (isNaN(time)) {
                            return null;
                        }

                        let download = d.link;
                        let cleanedLink = download.replace(/&amp;/g, '&');

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: infoText,
                                size: size,
                                info_text: infoText,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.grabs || 0,
                                seed: d.seeders || 0,
                                leech: d.leechers || 0,
                                download_link: cleanedLink || "",
                                torrent_page: d.guid || "",
                                discount: "None",
                                status: "default",
                                groupId: d.releaseGroup,
                                time: time,
                            };

                            // Map additional properties if necessary
                            const mappedObj = {
                                ...torrentObj,
                                quality: get_torrent_quality(torrentObj),
                            };
                            return mappedObj;
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing ANT tracker:", error);
                }
            }
            else if (tracker === "RTF") {
                try {
                    torrent_objs = postData.map((d) => {

                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size

                        const inputTime = d.created_at;
                        let time = toUnixTime(inputTime);
                        if (isNaN(time)) {
                            return null;
                        }

                        let infoText = d.name;
                            let groupText = "";
                            const groups = goodGroups();
                            const badGroupsList = badGroups();
                            let matchedGroup = null;
                            let badGroupFound = false;

                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim();
                                    groupText = "";
                                    break;
                                }
                            }

                            if (!badGroupFound) {
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
                                        groupText = match[1];
                                        groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                        if (improved_tags) {
                                            infoText = infoText.replace(`-${match[1]}`, '').trim();
                                        }
                                    }
                                }
                            }
                        let download = d.url;

                        const torrentObj = {
                            api_size: api_size,
                            datasetRelease: infoText,
                            size: size,
                            info_text: infoText,
                            tracker: tracker,
                            site: tracker,
                            snatch: d.times_completed || 0,
                            seed: d.seeders || 0,
                            leech: d.leechers || 0,
                            download_link: download || "",
                            torrent_page: d.url || "",
                            discount: "None",
                            status: "default",
                            groupId: groupText,
                            time: time,
                        };

                        const mappedObj = {
                            ...torrentObj,
                            quality: get_torrent_quality(torrentObj),
                        };

                        return mappedObj;
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing RTF tracker:", error);
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
                tracker === "TIK" ||
                tracker === "LST"
            ) {
                torrent_objs = json.data.map((element) => {
                    let originalInfoText;

                    if (tracker === "HUNO") {
                      originalInfoText = element.attributes.name ? element.attributes.name.replace(/[()]/g, "") : null;
                    } else if (tracker === "TIK") {
                      originalInfoText = element.attributes.bd_info ? element.attributes.bd_info : (element.attributes.name ? element.attributes.name : null);
                    } else {
                      originalInfoText = element.attributes.name ? element.attributes.name : null;
                    }

                    const parseDiscLabel = (text) => {
                      // Regular expression to match "Disc Label" line
                      const discLabelRegex = /Disc Label:\s*(.*)/;
                      // Extract the "Disc Label" line
                      const match = text.match(discLabelRegex);

                      if (match && match[1]) {
                        return match[1].trim();
                      }
                      return null;
                    };

                    if (tracker === "TIK") {
                      if (originalInfoText) {
                        const parsedText = parseDiscLabel(originalInfoText);
                        if (parsedText) {
                          originalInfoText = parsedText;
                        } else {
                          originalInfoText = element.attributes.name ? element.attributes.name : originalInfoText;
                        }
                      }
                    }
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
                            let isHdr10 = mediaInfo.includes("HDR10 compatible") || mediaInfo.includes("HDR10");
                            let isCommentary = mediaInfo.includes("Commentary");
                            let isdtsx = mediaInfo.includes("DTS:X");
                            if (improved_tags) {
                                if (isHdr10Plus) {
                                    if (!updatedInfoText.includes("HDR10+")) {
                                        updatedInfoText = "HDR10+ " + updatedInfoText.replace("HDR", "HDR10+").trim();
                                    }
                                } else if (isHdr10) {
                                    if (!updatedInfoText.includes("HDR10")) {
                                        updatedInfoText = "HDR10 " + updatedInfoText.replace("HDR", "HDR10").trim();
                                    } else if (!updatedInfoText.includes("HDR")) {
                                        updatedInfoText = "HDR10 " + updatedInfoText;
                                    }
                                }

                                if (isCommentary && !updatedInfoText.includes("Commentary")) {
                                    updatedInfoText = "Commentary " + updatedInfoText;
                                }
                                if (isdtsx && !updatedInfoText.includes("DTS:X")) {
                                    updatedInfoText = "DTS:X" + updatedInfoText;
                                }
                            }
                        }
                        if (tracker === "TIK") {
                          let tikQuality = element.attributes.type;
                          if (tikQuality) {
                            if (tikQuality.includes("UHD")) {
                              updatedInfoText = "2160p" + updatedInfoText;
                            } else if (tikQuality.includes("BD")) {
                              updatedInfoText = "1080p" + updatedInfoText;
                            } else {
                              updatedInfoText = "SD" + updatedInfoText;
                            }
                          }
                        }

                        const inputTime = element.attributes.created_at;
                        let time = toUnixTime(inputTime);
                        if (isNaN(time)) {
                            return null;
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
                            time: time,
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

        const countryCodes = [
            "AFG", "ALB", "DZA", "AND", "AGO", "ARG", "ARM", "AUS", "AUT", "AZE",
            "BHS", "BHR", "BGD", "BRB", "BLR", "BEL", "BLZ", "BEN", "BTN", "BOL",
            "BIH", "BWA", "BRA", "BRN", "BGR", "BFA", "BDI", "CPV", "KHM", "CMR",
            "CAN", "CAF", "TCD", "CHL", "CHN", "COL", "COM", "COG", "CRI", "HRV",
            "CUB", "CYP", "CZE", "DNK", "DJI", "DMA", "DOM", "ECU", "EGY", "SLV",
            "GNQ", "ERI", "EST", "ETH", "FJI", "FIN", "FRA", "GAB", "GMB", "GEO",
            "DEU", "GHA", "GRC", "GRD", "GTM", "GIN", "GNB", "GUY", "HTI", "HND",
            "HUN", "ISL", "IND", "IDN", "IRN", "IRQ", "IRL", "ISR", "ITA", "JAM",
            "JPN", "JOR", "KAZ", "KEN", "KIR", "PRK", "KOR", "KWT", "KGZ", "LAO",
            "LVA", "LBN", "LSO", "LBR", "LBY", "LIE", "LTU", "LUX", "MDG", "MWI",
            "MYS", "MDV", "MLI", "MLT", "MHL", "MRT", "MUS", "MEX", "FSM", "MDA",
            "MCO", "MNG", "MNE", "MAR", "MOZ", "MMR", "NAM", "NRU", "NPL", "NLD",
            "NZL", "NIC", "NER", "NGA", "NOR", "OMN", "PAK", "PLW", "PAN", "PNG",
            "PRY", "PER", "PHL", "POL", "PRT", "QAT", "ROU", "RUS", "RWA", "KNA",
            "LCA", "VCT", "WSM", "SMR", "STP", "SAU", "SEN", "SRB", "SYC", "SLE",
            "SGP", "SVK", "SVN", "SLB", "SOM", "ZAF", "SSD", "ESP", "LKA", "SDN",
            "SUR", "SWE", "CHE", "SYR", "TWN", "TJK", "TZA", "THA", "TLS", "TGO",
            "TON", "TTO", "TUN", "TUR", "TKM", "TUV", "UGA", "UKR", "ARE", "GBR",
            "USA", "URY", "UZB", "VUT", "VEN", "VNM", "YEM", "ZMB", "ZWE"
        ];

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
            else if (lower.includes("dovi hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dovi hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi")) return "Dolby Vision / ";
            else if (lower.includes("dolby vision")) return "Dolby Vision / ";
            else if (lower.includes(" dv ")) return "Dolby Vision / "; // Need spaces or else DVD suddenly has Dolby Vision.
            else if (lower.includes("hdr10+")) return "HDR10+ / ";
            else if (lower.includes("hdr10")) return "HDR10 / ";
            else if (lower.includes("hdr")) return "HDR10 / ";
            //else if (lower.includes("pq10")) return "10bit / ";
            else if (lower.includes("sdr")) return "SDR / ";

            return null;
        };

        const get_remux = (lower, torrent) => {
            if (lower.includes("remux")) return "Remux / ";

            return null;
        }

        const get_bonus = (lower, torrent) => {
            const bonuses = [];
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
            if (lower.includes("hybrid")) bonuses.push("Hybrid");
            if (lower.includes("proper")) bonuses.push("Proper");
            if (lower.includes("skynet edition")) bonuses.push("Skynet Edition");
            if (lower.includes("ultimate cut")) bonuses.push("Ultimate Cut");
            if (lower.includes("ultimate edition")) bonuses.push("Ultimate Edition");
            if (lower.includes("remastered")) bonuses.push("Remastered");
            if (lower.includes("commentary")) bonuses.push("Commentary");
            if (lower.includes("10bit")) bonuses.push("10bit");
            if (lower.includes("35mm")) bonuses.push("35mm");
            if (lower.includes("hfr")) bonuses.push("HFR");
            if (lower.includes("dcp")) bonuses.push("Digital Cinema Package");
            if (lower.includes("open matte")) bonuses.push("Open Matte");
            if (lower.includes("audio only track")) bonuses.push("Audio Only Track");
            if (lower.includes("repack2")) bonuses.push("Repack2");
            else if (lower.includes("repack")) bonuses.push("Repack");
            if (lower.includes("extended edition")) bonuses.push("Extended Edition");
            else if (lower.includes("extended")) bonuses.push("Extended Edition");
            if (lower.includes("half-sbs") || lower.includes("half sbs")) {
                bonuses.push("3D Half SBS");
            }
            else if (lower.includes("half-ou") || lower.includes("half ou")) {
                bonuses.push("3D Half OU");
            }
            else if (lower.includes("3d")) bonuses.push("3D Edition");

            return bonuses.length > 0 ? bonuses.join(" / ") + " / " : null;
        };

        const get_country = (normal, torrent) => {
            const countryCodeMatch = normal.match(/\b[A-Z]{3}\b/g);
            if (countryCodeMatch) {
                const filteredCodes = countryCodeMatch.filter(code => countryCodes.includes(code));
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
            let remux = get_remux(lower, torrent);

            const parts = [];

            if (disc) parts.push(disc.trim());
            if (codec) parts.push(codec.trim());
            if (container) parts.push(container.trim());
            if (source) parts.push(source.trim());
            if (res) parts.push(res.trim());
            if (scene) parts.push(scene.trim());
            if (remux) parts.push(remux.trim());
            if (audio) parts.push(audio.trim());
            if (hdr) parts.push(hdr.trim());
            if (bonus) parts.push(bonus.trim());
            if (country) parts.push(country.trim());

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
                if (improved_tags) {
                    if (typeof sceneGroups !== 'undefined') {
                        if (sceneGroups.includes(torrent.groupId)) {
                            torrent.info_text = "Scene / " + torrent.info_text;
                        }
                    }
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
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-region'>${torrent.region}</span>`;
                        }
                        if (torrent.distributor != null && torrent.distributor != false) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-distributor'>${torrent.distributor}</span>`;
                        }
                        if (torrent.site === "HDB") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                            torrent.exclusive ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--exclusive'>Exclusive</span>" : false;
                        }
                        if (torrent.site === "BHD") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                        }
                        if (torrent.site === "BTN") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                            // enforce styling because it's important
                            torrent.season2 ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--season2' style='font-weight: bold; color: #FF0000'>Season 2</span>" : false;
                            torrent.extras ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--extras'>Extras</span>" : false;
                        }
                        if (torrent.site === "MTV") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                        }
                        if (torrent.site === "BLU" || torrent.site === "Aither" || torrent.site === "RFX" || torrent.site === "OE" || torrent.site === "HUNO" || torrent.site === "LST") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>DU</span>") : false;
                            get_api_featured(torrent.featured) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>Featured</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--Personal'>Personal Release</span>") : false;
                        }
                        if (torrent.site === "TIK") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>Emerald</span>") : false;
                            get_api_featured(torrent.featured, torrent.site) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>Platinum</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='ttorrent-info__tags torrent-info__tags--Personal'>Personal Release</span>") : false;
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
                        if (torrent.site === "MTV") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                        }
                        if (torrent.site === "BLU" || torrent.site === "Aither" || torrent.site === "RFX" || torrent.site === "OE" || torrent.site === "HUNO" || torrent.site === "LST") {
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
                        const torrentInfoLink = cln.querySelector(".torrent-info-link");

                        if (torrent.discount === "Freeleech" || torrent.discount === "Golden") {
                            torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
                        } else if (torrent.discount === "50% Freeleech" || torrent.discount === "Bronze") {
                            torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
                        } else if (torrent.discount != "None") {
                            torrentInfoLink.innerHTML += ` / <span class='torrent-info__download-modifier'>${torrent.discount}!</span>`;
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

                if (torrent.time && torrent.time !== "None") {
                    const groupTorrent = cln.querySelector('.torrent-info-link');
                    if (groupTorrent) {
                        groupTorrent.outerHTML += `<span class='release time' title="${torrent.time}"></span>`;
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

                const byteSizedTrackers = ["BLU", "Aither", "RFX", "OE", "HUNO", "TIK", "TVV", "BHD", "HDB", "NBL", "BTN", "MTV", "LST", "ANT", "RTF"];
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

                if (improved_tags && cln?.dataset?.releasename) {
                    cln.dataset.releasename = cln.dataset.releasename.replace(/\./g, ' ');
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
            let any_include = false;
            let any_exclude = false;
            let empties = [...document.querySelectorAll("tr.empty-row")];

            doms.forEach((e, i) => {
                let include_tracker = false;
                let include_discount = false;
                let include_quality = false;
                let include_text = true;

                let status = filters.trackers.find(d => d.name === e.tracker)?.status;

                if (status === "include") {
                    include_tracker = true;
                    any_include = true;
                } else if (status === "exclude") {
                    include_tracker = false;
                    any_exclude = true;
                    e.dom_path.style.removeProperty('display');
                    e.dom_path.classList.add("hidden", "initially-hidden");
                    return;  // Skip further checks as this element is excluded
                } else {
                    include_tracker = filters.trackers.filter(d => d.status === "include").length === 0;
                }

                let status_2 = filters.discounts.find(d => d.name === e.discount)?.status;

                if (status_2 === "include") {
                    include_discount = true;
                    any_include = true;
                } else if (status_2 === "exclude") {
                    include_discount = false;
                    any_exclude = true;
                    e.dom_path.style.removeProperty('display');
                    e.dom_path.classList.add("hidden", "initially-hidden");
                    return;  // Skip further checks as this element is excluded
                } else {
                    include_discount = filters.discounts.filter(d => d.status === "include").length === 0;
                }

                let status_3 = filters.qualities.find(d => d.name === e.quality)?.status;

                if (status_3 === "include") {
                    include_quality = true;
                    any_include = true;
                } else if (status_3 === "exclude") {
                    include_quality = false;
                    any_exclude = true;
                    e.dom_path.style.removeProperty('display');
                    e.dom_path.classList.add("hidden", "initially-hidden");
                    return;  // Skip further checks as this element is excluded
                } else {
                    include_quality = filters.qualities.filter(d => d.status === "include").length === 0;
                }

                const torrentSearchElement = document.querySelector(".torrent-search");
                if (torrentSearchElement) {
                    let must_include_words = torrentSearchElement.value.split(" ").map((w) => w.toLowerCase());
                    include_text = must_include_words.every(word => e.info_text.toLowerCase().includes(word));
                }

                if (include_tracker && include_discount && include_quality && include_text) {
                    if (status === "include" || status_2 === "include" || status_3 === "include") {
                        e.dom_path.style.display = "table-row";
                        e.dom_path.classList.remove("hidden", "initially-hidden");
                    } else {
                        e.dom_path.style.removeProperty('display');
                        e.dom_path.classList.remove("hidden", "initially-hidden");
                    }
                } else {
                    e.dom_path.style.removeProperty('display');
                    e.dom_path.classList.add("hidden", "initially-hidden");
                }
            });

            if (!any_include) {
                doms.forEach((e, i) => {
                    if (!any_exclude || !e.dom_path.classList.contains("hidden")) {
                        e.dom_path.classList.remove("hidden", "initially-hidden");
                    }
                });
            }

            // Hide empty rows if there is any include
            if (any_include) {
                empties.forEach((e) => {
                    e.classList.add("hidden", "initially-hidden");
                });
            } else {
                empties.forEach((e) => {
                    e.classList.remove("hidden", "initially-hidden");
                });
            }
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

        const update_filter_box_status = (object_key, value, dom_path) => {
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
            const event = new CustomEvent('AddReleasesStatusChanged');
            document.dispatchEvent(event);

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
        let sortingInProgress = false;

        const add_sort_listeners = () => {
            const sortTable = (key, desc) => {
                if (sortingInProgress) return;
                sortingInProgress = true;

                let rowsData = [];

                // Collecting main rows and their hidden siblings
                document.querySelectorAll("tr.group_torrent.group_torrent_header").forEach(row => {
                    let keyElement;
                    let parsedKey = null; // Default value for rows without key elements
                    switch(key) {
                        case 'seeders':
                            keyElement = row.children[3];
                            parsedKey = keyElement ? parseInt(keyElement.textContent.trim().replace(/,/g, '')) || 0 : 0;
                            break;
                        case 'leechers':
                            keyElement = row.children[4];
                            parsedKey = keyElement ? parseInt(keyElement.textContent.trim().replace(/,/g, '')) || 0 : 0;
                            break;
                        case 'snatchers':
                            keyElement = row.children[2];
                            parsedKey = keyElement ? parseInt(keyElement.textContent.trim().replace(/,/g, '')) || 0 : 0;
                            break;
                        case 'size':
                            keyElement = row.querySelector('td.nobr span');
                            if (keyElement) {
                                let sizeText = keyElement.getAttribute('title');
                                if (sizeText) {
                                    parsedKey = parseInt(sizeText.replace(/,/g, '')) || 0;
                                }
                            }
                            break;
                        default:
                            keyElement = null;
                            parsedKey = 0;
                    }

                    if (parsedKey !== null) {
                        let dataObj = {
                            key: parsedKey,
                            mainRow: row,
                            hiddenRows: []
                        };

                        // Track hidden sibling rows
                        let nextRow = row.nextElementSibling;
                        while (nextRow && nextRow.classList.contains('torrent_info_row')) {
                            dataObj.hiddenRows.push(nextRow);
                            nextRow = nextRow.nextElementSibling;
                        }

                        rowsData.push(dataObj);
                    } else {
                        console.log('Skipping row due to null key:', row);
                    }
                });

                // Filter and sort rows with valid keys
                let sortableRows = rowsData.filter(row => row.key !== null);
                sortableRows.sort((a, b) => desc ? b.key - a.key : a.key - b.key);

                // Debugging output

                // Remove existing rows from the DOM
                document.querySelectorAll(".group_torrent, .torrent_info_row").forEach(d => d.remove());

                // Re-insert sorted rows and their hidden siblings
                const tbody = document.querySelector("table.torrent_table > tbody");
                sortableRows.forEach(dataObj => {
                    tbody.appendChild(dataObj.mainRow);
                    dataObj.hiddenRows.forEach(row => tbody.appendChild(row));
                });

                console.log("Finished sorting");
                const event = new CustomEvent('SortingComplete');
                document.dispatchEvent(event);

                // Allow sorting again after a brief delay
                setTimeout(() => {
                    sortingInProgress = false;
                }, 500); // Adjust the delay as needed
            };

            const addSortListener = (headerElement, key, descRef) => {
                headerElement.style.cursor = "pointer";
                headerElement.addEventListener("click", () => {
                    descRef.value = !descRef.value;
                    sortTable(key, descRef.value);
                });
            };

            const seed_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].find(e => e.querySelector("img")?.src.includes("seeders.png"));
            addSortListener(seed_th, 'seeders', { value: seed_desc });

            const leech_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].find(e => e.querySelector("img")?.src.includes("leechers.png"));
            addSortListener(leech_th, 'leechers', { value: leech_desc });

            const snatch_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].find(e => e.querySelector("img")?.src.includes("snatched.png"));
            addSortListener(snatch_th, 'snatchers', { value: snatch_desc });

            const size_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].find(e => e.textContent === "Size");
            addSortListener(size_th, 'size', { value: size_desc });
        };

        // Call the function to add the listeners
        add_sort_listeners();

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

        // Function to get TVDB ID from localStorage
        function getTvdbIdFromStorage(ptpId) {
            return localStorage.getItem(`tvdb_id_${ptpId}`);
        }

        // Function to get TVDB ID
        function getTvdbId() {
            const ptpId = new URL(window.location.href).searchParams.get("id");
            let tvdbId = getTvdbIdFromStorage(ptpId);
            return tvdbId;
        }

        // Function to wait for TVDB ID with a timeout
        function waitForTvdbId(timeout = btnTimer) {
            return new Promise((resolve, reject) => {
                // Check if the TVDB ID is already in localStorage
                let tvdbId = getTvdbId();
                if (tvdbId) {
                    resolve(tvdbId);
                } else {
                    // Add event listener for TVDB ID
                    const onTvdbIdFetched = (event) => {
                        const { tvdbId: fetchedTvdbId } = event.detail;
                        resolve(fetchedTvdbId);
                        cleanup();
                    };

                    // Add event listener for TVDB ID fetch errors
                    const onTvdbIdFetchError = (event) => {
                        const { message } = event.detail;
                        reject(new Error(message));
                        cleanup();
                    };

                    // Cleanup function to remove event listeners
                    const cleanup = () => {
                        clearTimeout(timeoutId);
                        document.removeEventListener('tvdbIdFetched', onTvdbIdFetched);
                        document.removeEventListener('tvdbIdFetchError', onTvdbIdFetchError);
                    };

                    document.addEventListener('tvdbIdFetched', onTvdbIdFetched);
                    document.addEventListener('tvdbIdFetchError', onTvdbIdFetchError);

                    // Set a timeout to reject the promise if neither event is triggered
                    const timeoutId = setTimeout(() => {
                        reject(new Error("TVDB ID fetch timed out."));
                        cleanup();
                    }, timeout);
                }
            });
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
                    return; // Exit if both attempts fail
                }
            }

            let tvdbId;
            if (trackers.includes("BTN")) {
                try {
                    tvdbId = getTvdbId();
                    if (!tvdbId) {
                        tvdbId = await waitForTvdbId();
                    }
                    if (tvdbId) {
                        console.log(`TVDB ID is ${tvdbId}`);
                    } else {
                        console.log('TVDB ID not found yet.');
                    }
                } catch (error) {
                    console.log('TVDB error:', error.message);
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
            trackers.forEach(t => promises.push(fetch_tracker(t, imdb_id, show_name, show_nbl_name, tvdbId)));
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