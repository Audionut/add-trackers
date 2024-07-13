// ==UserScript==
// @name         PTP - Add releases from other trackers
// @namespace    https://github.com/Audionut/add-trackers
// @version      4.0.6-A
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
        "avistaz": {"label": "Avistaz *", "type": "checkbox", "default": false, "tooltip": "Enter needed details below. PID can be found on your profile page"},
        "avistaz_user": {"label": "Avistaz Username", "type": "text", "default": ""},
        "avistaz_pass": {"label": "Avistaz Password", "type": "text", "default": ""},
        "avistaz_pid": {"label": "Avistaz PID", "type": "text", "default": ""},
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
        "cinemaz": {"label": "CinemaZ *", "type": "checkbox", "default": false, "tooltip": "Enter needed details below. PID can be found on your profile page"},
        "cinemaz_user": {"label": "CinemaZ Username", "type": "text", "default": ""},
        "cinemaz_pass": {"label": "CinemaZ Password", "type": "text", "default": ""},
        "cinemaz_pid": {"label": "CinemaZ PID", "type": "text", "default": ""},
        "fl": {"label": "FL", "type": "checkbox", "default": false},
        "hdb": {"label": "HDB *", "type": "checkbox", "default": false, "tooltip": "Enter username and passkey below"},
        "hdb_user": {"label": "HDB_USER_NAME *", "type": "text", "default": "", "tooltip": "Requires 2fa enabled at HDB"},
        "hdb_pass": {"label": "HDB_PASS_KEY *", "type": "text", "default": "", "tooltip": "Passkey from your HDB profile page"},
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
        "phd": {"label": "PHD *", "type": "checkbox", "default": false, "tooltip": "Enter needed details below. PID can be found on your profile page"},
        "phd_user": {"label": "PHD Username", "type": "text", "default": ""},
        "phd_pass": {"label": "PHD Password", "type": "text", "default": ""},
        "phd_pid": {"label": "PHD PID", "type": "text", "default": ""},
        "ptp": {"label": "PTP", "type": "checkbox", "default": true},
        "pxhd": {"label": "PxHD", "type": "checkbox", "default": false},
        "rfx": {"label": "RFX *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "rfx_api": {"label": "RFX_API_TOKEN", "type": "text", "default": ""},
        "rtf": {"label": "RTF *", "type": "checkbox", "default": false, "tooltip": "Enter RTF username and password below"},
        "rtf_user": {"label": "RTF Username", "type": "text", "default": ""},
        "rtf_pass": {"label": "RTF Password", "type": "text", "default": ""},
        "tik": {"label": "TIK *", "type": "checkbox", "default": false, "tooltip": "Enter API key below"},
        "tik_api": {"label": "TIK_API_TOKEN", "type": "text", "default": ""},
        "tl": {"label": "TL", "type": "checkbox", "default": false},
        "tvv": {"label": "TVV *", "type": "checkbox", "default": false, "tooltip": "Enter auth key & torrent pass below"},
        "tvv_auth": {"label": "TVV_AUTH_KEY", "type": "text", "default": "", "tooltip": "Find from a torrent download link at TVV"},
        "tvv_torr": {"label": "TVV_TORR_PASS", "type": "text", "default": "", "tooltip": "Needed to access TVV xml output"},
        "easysearch": {"label": "TVV easy searching", "type": "checkbox", "default": true, "tooltip": "TVV has strict searching limits, especially for lower user groups. Disable this to search with more expensive options, better feedback including seeding status, but you're more likely to hit searching to soon error."},
        "show_icon": {"label": "Show Tracker Icon", "type": "checkbox", "default": true, "tooltip": "Display the tracker icon next to releases"},
        "show_name": {"label": "Show Tracker Name", "type": "checkbox", "default": true, "tooltip": "Display the tracker name next to releases"},
        "hide_filters": {"label": "Hide filter releases box", "type": "checkbox", "default": false, "tooltip": "Hide the filter releases box in the UI"},
        "filterboxlocation": {"label": "Where to display the filter box", "type": "select", "options": ["Above", "Below", "Torrents"], "default": "Below", "tooltip": "Choose where to display the filter box. Above places above the movie poster, below places below. Torrents places it above the torrent group OG style."},
        "simplediscounts": {"label": "Show simple discounts", "type": "checkbox", "default": false, "tooltip": "Change 75% Freeleech > 75%"},
        "hidesamesize": {"label": "Hide torrents with same size", "type": "checkbox", "default": false, "tooltip": "Hide torrents that have the same file size as existing ones"},
        "logsamesize": {"label": "Log torrents with same size", "type": "checkbox", "default": false, "tooltip": "Log torrents that have the same file size as existing ones"},
        "fuzzyMatching": {"label": "Fuzzy size matching", "type": "checkbox", "default": false, "tooltip": "Useful to catch torrents with or without additional nfo files or whatnot, or for non API sites"},
        "valueinMIB": {"label": "Fuzzy size threshold (MiB)", "type": "int", "default": 6, "tooltip": "Set the threshold in MiB for the fuzzy size matching. 6 MiB will catch non API sites"},
        "hide_dead": {"label": "Hide dead external torrents", "type": "checkbox", "default": false, "tooltip": "Hide torrents that have no seeders"},
        "new_tab": {"label": "Open in new tab", "type": "checkbox", "default": true, "tooltip": "Open links in a new browser tab"},
        "hide_tags": {"label": "Hide tags", "type": "checkbox", "default": false, "tooltip": "Hide tags such as Featured, DU, reported, etc."},
        "run_default": {"label": "Run by default?", "type": "checkbox", "default": true, "tooltip": "Run this script by default on page load, else click Other Trackers under title to run the script"},
        "ptp_name": {"label": "Show release name", "type": "checkbox", "default": true, "tooltip": "Display the PTP release (file) name instead of the default display"},
        "filterhidden": {"label": "Minimize the filter box by default", "type": "checkbox", "default": false, "tooltip": "Toggle visibility by clicking header"},
        "funky_tags": {"label": "Improved Tags", "type": "checkbox", "default": false, "tooltip": "Work with jmxd' PTP Improved Tags script"},
        "btntimer": {"label": "Timer for BTN TVDB ID searches via Sonarr (ms)", "type": "int", "default": 800, "tooltip": "If you don't use Sonarr you can set this very low, but the main script delay is overall site response, not this response"},
        "tracker_by_default": {"label": "Only these sites by default", "type": "text", "default": "", "tooltip": "Show only these sites by default. Comma separated. PTP, BHD, ANT, etc"},
        "res_by_default": {"label": "Only these resolutions by default", "type": "text", "default": "", "tooltip": "Show only these resolutions by default. Comma separated, with valued values. SD, 480p, 576p, 720p, 1080p, 2160p"},
        "hideBlankLinks": {"label": "How to display download link", "type": "select", "options": ["DL", "Download", "Spaced"], "default": "DL", "tooltip": "Choose how to display the download links: DL (original method), DOWNLOAD, or Spaced. Other methods help with some stylesheets."},
        "timer": {"label": "Error timeout (seconds)", "type": "int", "default": 4, "tooltip": "Set the error timeout duration in seconds to skip slow/dead trackers"},
        "timerDuration": {"label": "Error display duration (seconds)", "type": "int", "default": 2, "tooltip": "Set the duration for displaying errors in seconds"},
        "debugging": {"label": "Enable debugging", "type": "checkbox", "default": false, "tooltip": "Enable this to help track down issues, then browse a torrent page and look in browser console"},
        "authloginwait": {"label": "How often should Auth login be performed (hours)", "type": "int", "default": 22, "tooltip": "For sites that need to run auth login to get API tokens. If RTF only this can be set anywhere before 2 weeks, if Avistaz network sites, set before 24 hours."},
        "avistaz_token": {"label": "AVISTAZ_API_TOKEN *", "type": "text", "default": "", "tooltip": "This is set automatically. Clear token to force auth login"},
        "avistaz_last_login_run_raw": {"label": "AvistaZ Last Login Run UTC", "type": "text", "default": ""},
        "cinemaz_token": {"label": "CINEMAZ_API_TOKEN *", "type": "text", "default": "", "tooltip": "This is set automatically. Clear token to force auth login"},
        "cinemaz_last_login_run_raw": {"label": "CinemaZ Last Login Run UTC", "type": "text", "default": ""},
        "phd_token": {"label": "PHD_API_TOKEN", "type": "text", "default": "", "tooltip": "This is set automatically. Clear token to force auth login"},
        "phd_last_login_run_raw": {"label": "PHD Last Login Run UTC", "type": "text", "default": ""},
        "rtf_token": {"label": "RTF_API_TOKEN *", "type": "text", "default": "", "tooltip": "This is set automatically. Clear token to force auth login"},
        "rtf_last_login_run_raw": {"label": "RTF Last Login Run UTC", "type": "text", "default": ""}
    };

    function resetToDefaults() {
        // Add a confirmation popup
        if (confirm("Are you sure you want to reset all settings to their default values?")) {
            // Reset each field to its default value
            for (const field in fields) {
                if (fields.hasOwnProperty(field)) {
                    GM_config.set(field, fields[field].default);
                } else {
                    console.error(`Field ${field} does not exist in fields object`);
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
            "tvv": ["tvv_auth", "tvv_torr", "easysearch"],
            "rtf": ["rtf_user", "rtf_pass", "rtf_token", "rtf_last_login_run_raw", "authloginwait"],
            "avistaz": ["avistaz_user", "avistaz_pass", "avistaz_pid", "avistaz_token", "avistaz_last_login_run_raw", "authloginwait"],
            "cinemaz": ["cinemaz_user", "cinemaz_pass", "cinemaz_pid", "cinemaz_token", "cinemaz_last_login_run_raw", "authloginwait"],
            "phd": ["phd_user", "phd_pass", "phd_pid", "phd_token", "phd_last_login_run_raw", "authloginwait"],
            "hidesamesize": ["logsamesize", "fuzzyMatching", "valueinMIB"]
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
                    "avistaz": GM_config.fields.avistaz.node,
                    "bhd": GM_config.fields.bhd.node,
                    "blu": GM_config.fields.blu.node,
                    "btn": GM_config.fields.btn.node,
                    "cinemaz": GM_config.fields.cinemaz.node,
                    "hdb": GM_config.fields.hdb.node,
                    "lst": GM_config.fields.lst.node,
                    "mtv": GM_config.fields.mtv.node,
                    "nbl": GM_config.fields.nbl.node,
                    "huno": GM_config.fields.huno.node,
                    "oe": GM_config.fields.oe.node,
                    "phd": GM_config.fields.phd.node,
                    "rfx": GM_config.fields.rfx.node,
                    "rtf": GM_config.fields.rtf.node,
                    "tik": GM_config.fields.tik.node,
                    "tvv": GM_config.fields.tvv.node,
                    "hidesamesize": GM_config.fields.hidesamesize.node,
                };

                // Add event listeners for trackers with auth
                for (const [key, value] of Object.entries(api_based_nodes)) {
                    toggleAuthFields(key, value.checked);
                    value.addEventListener('change', function () {
                        toggleAuthFields(key, value.checked);
                    });
                }
            },
            "save": function () {
                const filterBox = document.querySelector(".panel__body");
                if (GM_config.get('filterhidden')) {
                    filterBox.style.display = "none";
                } else {
                    filterBox.style.display = "block";
                }
                //alert("Saved Successfully!");
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
            "TL": GM_config.get("tl"),
        };

        const movie_only_dict = {};

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
    const RTF_USER = GM_config.get("rtf_user");
    const RTF_PASS = GM_config.get("rtf_pass");
    const AVISTAZ_USER = GM_config.get("avistaz_user");
    const AVISTAZ_PASS = GM_config.get("avistaz_pass");
    const AVISTAZ_PID = GM_config.get("avistaz_pid");
    const CINEMAZ_USER = GM_config.get("cinemaz_user");
    const CINEMAZ_PASS = GM_config.get("cinemaz_pass");
    const CINEMAZ_PID = GM_config.get("cinemaz_pid");
    const PHD_USER = GM_config.get("phd_user");
    const PHD_PASS = GM_config.get("phd_pass");
    const PHD_PID = GM_config.get("phd_pid");
    const rtf_token = GM_config.get("rtf_token");
    const avistaz_token = GM_config.get("avistaz_token");
    const cinemaz_token = GM_config.get("cinemaz_token");
    const phd_token = GM_config.get("phd_token");

    // We need to use XML response with TVV and have to define some parameters for it to work correctly.
    const TVV_AUTH_KEY = GM_config.get("tvv_auth"); // If you want to use TVV - find your authkey from a torrent download link
    const TVV_TORR_PASS = GM_config.get("tvv_torr"); // We also need the torrent pass - find your torrent_pass from a torrent download link

    const hideBlankLinks = GM_config.get("hideBlankLinks");
    const filterboxlocation = GM_config.get("filterboxlocation");
    const show_tracker_icon = GM_config.get("show_icon"); // false = will show default green checked icon ||| true = will show tracker logo instead of checked icon
    const show_tracker_name = GM_config.get("show_name"); // false = will hide tracker name ||| true = will show tracker name
    const hide_if_torrent_with_same_size_exists = GM_config.get("hidesamesize"); // true = will hide torrents with the same file size as existing PTP ones
    const log_torrents_with_same_size = GM_config.get("logsamesize"); // true = will log torrents with the same file size as existing PTP ones in console (F12)
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
    const authloginwait = GM_config.get("authloginwait");
    const easysearching = GM_config.get("easysearch");
    const valueinMIB = GM_config.get("valueinMIB");
    const fuzzyMatching = GM_config.get("fuzzyMatching");
    const simplediscounts = GM_config.get("simplediscounts");

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

        let discounts;
        if (simplediscounts) {
            discounts = ["FL", "75%", "50%", "40%", "30%", "25%", "Refund", "Rewind", "Rescue", "Pollin", "None"];
        } else {
            discounts = ["Freeleech", "75% Freeleech", "50% Freeleech", "40% Bonus", "30% Bonus", "25% Freeleech", "Copper", "Bronze", "Silver", "Golden", "Refundable", "Rewind", "Rescuable", "Pollination", "None"];
        }

        let qualities = ["SD", "720p", "1080p", "2160p"];
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
            else return "SD";
        };

        const get_default_doms = () => {
            [...document.querySelectorAll("tr.group_torrent_header")].forEach((d, i) => {
                let tracker = "PTP";
                let dom_path = d;
                let quality = dom_get_quality(d.textContent);
                let discount = "None";
                const modifiers = d.querySelectorAll(".torrent-info__download-modifier");
                modifiers.forEach(modifier => {
                    const text = modifier.textContent.trim().toLowerCase();
                    if (text.includes("freeleech") || text.includes("freeleech!")) {
                        if (simplediscounts) {
                            discount = "FL";
                        } else {
                            discount = "Freeleech";
                        }
                    } else if (text.includes("half-leech") || text.includes("half-leech!")) {
                        if (simplediscounts) {
                            discount = "50%"
                        } else {
                            discount = "50% Freeleech";
                        }
                    }
                });
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

        const trackerIcons = {
            "BHD": " data:image/png;base64,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",
            "BLU": " data:image/png;base64,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",
            "Aither": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACYElEQVQokT2RS2sUQRSFb9169MOZScc8TBQN0Wg2URBB3Sj+ZHe6VhQloAgu1GjMQxMhycx093RXdVfVvS5G3BzO4izOxye2nzwbLq8MlleK9atSaQAAgLacMpFAzEYjW1XT0999284uzl1dqeTSYHRlrVi/lheFSdLOWSYKfddMxgtX1vPFRZ1mKGVvW52mtiyVybLhyuqtra0+hEjUObuytLRzc3PStABwXs/IBJPnebGYF4tn+98VKpWNFs6qmmK8u3H94damkVIiaim7EGrrPh4ej38dp0Mo1q424wsVuq48PTktp6u3bi/kd3Z/HJwcHTWTsdR6YW19e+PG/Y3rddOc7f8wWc5EqmubP3tfB5eXtm5uPn/x8uDDbvReIAKAMubbYHht597Tx4/eVdWfb19cXSlvbfR+4/6Dz58+7b19TSH4zqGUiLKbzVxdt+UUmKU2s4tz7xwyEYWQDoZ7b15F70PfRe+7pumd7W3bNTNblj9339uq9NZSDDIbjRBRJcnF4UHoXOh7jhEA5gkARJFiTIfD6emJrUqpkwQAlEnGx0eh7ykEZgZmgQjMTDTvJs3q87N2MlFM5J2z5TQGP7crBDIAMwMAMIMQKGVbTr1zIIRMB0MhQCDG3kfvmQgAQMC/NQDFIJWS2ri6jsHLvCjm3DpNo/f/rwMzMzETCGGyvG+a3lkAkCbLmTkGj1JKpVFKZmYiZhaIKJVOUiayVUkhUIxKIEqtmYiJAFGnqeJkji6VQqWEELauhBDSmBiCEkJIpaPv575i8EobVCp6j0r1bUsUo/fALLQWQvwFLByUKNhkQJ4AAAAASUVORK5CYII=",
            "RFX": " data:image/png;base64,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",
            "OE": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABVUlEQVQokWNgwAvstXgv92khizDhUR1rJ7izVmX9yQ/4DYWC+lDJv6uM3s7X4+diRhZnwVTKyswwJ1M+zkGEgYGhd/Orj9/+4tMgyM20rlTZQYePgYHh1cffk7a9RFOAokFRjG1rlYqmDCeE27Xh5Zcf/3FqsFDl2lCuIi7ACuH++vXv9affIRYCcAU3n/24/OgHI4QTbC64KE+Bix1noP39+y995qO5+94yMjAwJDsLz0yTY2bGqfrbz39xk+6vPfmBgYGBkYGBQVeOQ12KAy7Nxc40O12ejQ2q/+WHX/4dd0/e+Ybww+VHPy4/+gHXUOwrDld9/cl377bb91/9xuJpCOBhZywLEIew91/5HNR958PXf8gK0DXkeYuL8bMyMDAsOvAmZfrD338Z8AF+Lua38/T+rjKqD5PEqxAGGsMlfyw3jLMXIko1AwPD5T4tB20e/GoAzd9vMJ4A6VIAAAAASUVORK5CYII=",
            "CG": "data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAABMLAAATCwAAAAAAAAAAAAA0NEk1NUU1NUc1NUcuLj4dHSYABQgAWpAAm/cAnvwAnvwAnvwAnvwAnvwAnvwJofwzMzY3Nzc5OTk5OTk1NTUmJiYHBwcAPGAAjuIAnvwAnvwAnvwAnvwAnvwSpfxJuv0kJCUrKysxMTE1NTU1NTUqKioPDw8ALEYAkugQpPwBnvwAnvwAnvwZqPxVvv1bnMIEBAQNDQ0cHBwnJycrKyslJSUVFRUAFCAQbaUwfq0no+wIofwiq/xewv1Qh6gFCQwAUoIAMEwACxIGBgYPDw8VFRUPDw8GBgYABQcAChADDhQWW4RSvf0/aoQSEhIqKioAmPIAhdQAaqkARW4ALUgABgkAAgMAJjwAR3EAVooAVYgBCQ4RKjoWFhYzMzM5OTkAnvwAnvwAnPkAkukhq/wAHzEAIDMAVogAitsAmvUBnvwZbJ0ODg4uLi4zMzM3NzcAnvwAnvwAnvwBnvxOuvoFEhsAPmMAecIAnvwAnvwXp/xEodgDAwMVFRUhISEqKioAnvwAnvwAnvwAnvw6s/wJGiQAPmMAhNIAnvwGoPxGuf1Gkb4AAQIAEx4AAgMLCwsAnvwAnvwAnvwAnvwVpvwbT28BERsAiNk1sv1Svf1kuOoIHisAIDMAS3gAVYgANFMAnvwAnvwAnvwBnvwxsf1QreUECw8BDBMWQFkXQVoCDBIAFCAASnYAesMAmvUAiNkAnvwAnvwBnvwxsf1qxfsrSVoBAQIiIiINDQ0ACQ4AK0QAS3gAc7cAm/cAnvwAnvwAnvwBnvwxsf1qxforSFkXFxc1NTUmJiYLCwsAJDoAV4oAhdQAnPgAnvwAnvwAnvwAnvwwsP1qxforSFkXFxc5OTk1NTUnJycNDQ0AITUAc7gAnvwAnvwAnvwAnvwAnvwur/1qxv0sSVoXFxc5OTk5OTk2NjYpKSkPDw8AGysAba4AnvwAnvwAnvwAnvwAnvxqxv0vTmAVFR01NUg1NUg1NUgzM0UnJzUPDxUAFiMAZ6UAnvwAnvwAnvwAnvwAnvwAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//",
            "FL": "data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAClhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSzVoh8vLSwvLSwvLSwvLSzVoh/Voh/Voh/Voh8vLSwvLSylhCylhCwvLSwvLSyeeyPVoh8vLSwvLSwvLSyeeyPVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSx8ZCbVoh/Voh/Voh9bTCl8ZCbVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh8vLSwvLSwvLSx8ZCbVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh8vLSwvLSwvLSxbTCnVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh/Voh/Voh/Voh9bTCnVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "AvistaZ": " data:image/png;base64,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",
            "PHD": " data:image/webp;base64,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",
            "CinemaZ": " data:image/webp;base64,UklGRv4EAABXRUJQVlA4TPEEAAAvf8AfEKDkNpIgSeL/v93T5uZeFbO7p42QAEmSaVv9bNu2bdvftm3btm3btm1cPPveZ/v1BMB/m9R4S9PfGGMNkCqE2RVqvMXraZRxhuglguk3ICvGMvcIdOOfSTy1w0ima8ItcZFAF/6ZxFtHjGT9WcLsVYRjHa4YTWVBoC0KcO6h8fQ/xgA/sExiHe2Sfp5iWaNtdD9Ckte4qMaMBj9PcFGdNRTPMXYKl/2QNqFpNy7L1++YIRpw3wEKkf7KcN9eepecxpPEvAPb8KQKMWcoe4tXxf/iNl416AhlArwr4wd5L/GujBvu4GWmAOAZHtbN7YJdeFoegJl4WiPTPcuxq4SAQK7mCrplJnaVEfgvR0MFFdDd0g+LflgvjhU5AGDA1zT3dM6qBNZIZksBAOjwNs1NzTP0fYkhzp0WATFLi0nWXBEHMQPTSUZo2o7dIwLxMKbp3I4iUTCm7cBI6QoNTRO7oaqPpgVnqUJTgrIBmr9hMw6NhDJr4pq5UKbt90AHuR5DHQMDoU5NXslQqNMlyNCGnsOYGw2L9DVUzINFCgoypNMirylzDFaFNjyEVfYDU1v6YawSlu2eaaeyA+ZmfrRcyfTYIqNuZApsy4+QTYk0IoZ1cyeqYV2/zKiOYIz13aOodmD2HqiJXO2YH6mBg7Zl2ikfcDNSTqbiQOTrBcMzj+CgqZFOehXPI+cvSM4su8AvQk4V/yKLLnDKjL9AQ0vEtyIvMuQCVfWRwReAKBJUURVJuwDyI71P+BiJrKiLpJyQG+l1wodIVEVZpP8FiqoiA0/4EwmtyI7MvMBSd2TMBUpqIwEVbyKHL4jB2NwLnDDmUnE58uaC/pnzFwzKmFcsi0guWJWpIXfA2UgFxYq4CMUdUJ6hYQeURx5AlZrWyJM9vXDoz55AjC3pgGcRclsjmqC4Na8zASXTM1+2jMGx/C1JGCuDMsMMTd6hq3OGNuyQVZXZ0QK3MhS/QdU3bOq14iHm7GtsB8h/wWfs8lzwCnPnoO/eQDW3mvNY1iqi5jQO2SywHaAO/TssvcW+iR267uDQOdj0cIDoBN2CiZpw01UaBUNJcKiNzgq/EZIYT2Ugyh1cVmom7YEA93BsH+xaO0IktVcGS5o/KDESaKlPeFCdY9JY0f5BkaEA87zGuSq6S+DkDBF1q1VA6K88Uq3Y9MOW2U91Cgn9kadcC1bZw7qPjVWW4HplUyLsU1ZwSiYAkJ4yFi5yuWQdAABHzYeshpvCtJyxFv7IWekZB+EqJ19uqDUSfqXl8Q1dFsNh8y44CrE+pAe8ZAunZcjfc8Uxt9z+3WV7FO/ZD9cpWKVl67iXwuEDmdj1PfySBp/J7nu4CR9q9ffQQuNDbPoeyLKlvzv+e2XShnXfQyezDj+v8aenryJjGf5q15v0IcbfVbyIvluYqn8PBdPVY6zxOdYoxaH6xwjzDcdvYeIwFp9ikhZ8Gk/3sPsMJnZi+wVID8hZqRUfphakycXFF6jyDldfsP1/OFQ4+zqNwN7Gt+lmBsDZ+5fpZAYAYLKq1wFde18HIIXwdQAWaXsdsLTldQCcXXsdgEy/M40PArAjUvckEOBpoOxNAAaq+sWiB+hiXgGGlilGRA2WQN/m74EsOgDk9bfcGPqwaPX30ESttS74e/gMn+rq1zDiY8CFL2EpfLAsS6y15sOttdpcYfBfKAA=",
            "HDB": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAED0lEQVRIibVWz09dRRT+Dr3y4AktBEEopYTSJm2JVjc1qXFjYtKFJrrShQtdu+6/4L9h3Lgzxh9xY1c2NkZrE6ykpSoWCimmKFLgAZ1z5nNxZu677/Ejralnce/cud/M+fXNnCOfX70FEC4CEAIhmD7KFyACACREhIRDQQEgIMvVoEDyShYxGv5PKcwMIkJQKHRj3GiBJNPANAYEBN0+CkHJDrpjOQ4A6YtKD/Km6QkfEBAyRSdP+psCwUHi0MIsPolISDORrVKYWdWyJy5ZAUquoNUW/6ZQmsEqg5YCxZSxPQxloWoCQqSzODTQ17u+ubW+tV3yUwBAeuq13qe7//pn42EIFKkVh57p68lWCcCNxs6Dze1kmUAgnmMChZk6dGpi5PzUiaX7q19/93ObmxeePzs62P/DzNz0rwuAnJoYOT91og2zE/TWnXvTtxd2glb9KMzUeRljBEBSVSGJn/4mCSAymhoFjnywuXXzjyVHDfb3Th4bOndq7PT4yJdXrt9fXRdJLCw0mAc3MikwM/9J5hy4AouqBiBGAljbaPw4M5fPiRzp6b544dxQ/+E3Xnnx46+uPAzqCzvUNKiZajRmD4KaqpqZmQXVwEjfN6iqaelrCA41U/17df3Ty9+vbTRqnU+dnRhVVQ3BTDtU1VRV1U8cyTyRxMwIV2BmGjSUSDM1y3DTjcb29OwdAM+dHEtTah3lRtUcVPdX1RSiGDWoqbUjQxM6t7gM4Ehvvae75ooL1cQiXzY80Pf2xZfbGDI80JcUmJbIRIdWWVxe8UFvvWtldQ1Au4KuWufE6LPYS2L0JGe+xT0UlGLR/G+hQZ2zvuz3hXsfffZNG/r9t16bPD4SY1QNTqf9PGgqsFKBHzTC9nfcc2Ax+i/jvsiT40d9MDt31wftITpAQYxRVUVakG236OSxYQCLyytq6j8KU/UCE81aFaS7iM2DZqZK7EYmGeg7/NILZwBcvf6LBXXFRVDzjfbyINnnChhj0F0s8gouOD0x9s7rr9a7arNzd7+9dkPgdywLteDV0K+KSJpa6TdFQEbPAZk8iBHA2MjgB+++6bDxo0P17i4AP83c/uSLyxYC/OYWFKZ+86QbZrOxpRZSsXQdwGZjK+XADKSbUu/uOjN53BXMLy3PL/157cbszd/mc9klKQLIe5c+xONIJavVvqa9xymlUDVIKixeoRI0z3n9Sg9K7o4oHsCmo8yNR+qRMotM8+Vf4U2y0DuwlqGIgGCLvd72tFdaR1Rq8n+UPfqJ6tSjK9jVdzxaI1KkU1PRe1Cg8mw1saXdkopgiyuFmrUhJW/AcncR0DNY7TeYu2CfcH74w2kCihR+ah5ZHjtQbQro3Xm50tmJkrLI/MkeM98JJZErfREI+RcQW6iyrDiregAAAABJRU5ErkJggg==",
            "PxHD": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB53cyAgN/PgIfh0oCO4tSAAAAAAJrl2YCg59uApujdgKvq34AAAAAAtOzjgLjt5IC87uWAvu/mgAAAAAAAAAAAdNzL/3vezf+C4ND/ieHT/wAAAACW5Nf/nOba/6Ln3P+o6d7/AAAAALHr4v+27OP/uu3l/73u5v8AAAAAAAAAAG7ayP913Mv/fd7O/4Tg0P8AAAAAkePV/5fl2P+d5tr/o+jc/wAAAACt6uD/suzi/7bt4/+67uX/AAAAAAAAAABp2caAcdvJgHjdzIB/38+AAAAAAI3i1ICT5NaAmuXZgKDn24AAAAAAqurfgK/r4YC07OKAuO3kgAAAAAAAAAAAX9fDgGfZxoBv28mAdtzLgAAAAACE4NGAi+LTgJLj1oCY5diAAAAAAKTo3ICp6d6ArurggLPs4oAAAAAAAAAAAFrVwf9i18T/atnH/3Hbyv8AAAAAgN/P/4fh0v+O4tT/lOTX/wAAAACg59v/pujd/6vq3/+w6+H/AAAAAAAAAABT1L7/XNbB/2PYxP9r2sf/AAAAAHrdzf+B39D/iOHS/4/j1f8AAAAAm+bZ/6Hn2/+n6d3/rOrf/wAAAAAAAAAATtK8gFfUv4Bf1sKAZtjFgAAAAAB13MuAfd7OgITg0ICL4tOAAAAAAJfl2ICd5tqAo+jcgKnp3oAAAAAAAAAAAETQuIBM0ryAVNS/gFzWwoAAAAAAbNrIgHPcyoB73s2Agt/QgAAAAACP49WAluTXgJzm2YCi59yAAAAAAAAAAAA+zrb/R9G6/0/Tvf9X1cD/AAAAAGfZxv9v28n/dtzL/33ezv8AAAAAi+LT/5Lj1v+Y5dj/nuba/wAAAAAAAAAAN8y0/0DPt/9I0br/UdO9/wAAAABh18P/adnG/3Dbyf933cz/AAAAAIbg0f+M4tT/k+TW/5nl2P8AAAAAAAAAADHLsoA6zbWAQ8+4gEvSu4AAAAAAXNbBgGTYxIBr2seAc9zKgAAAAACB39CAiOHSgI/j1YCV5NeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            "KG": "data:image/x-icon;base64,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",
            "TIK": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAguSURBVFhHvVdrbFPnGc7Wabc/+9FNVXPzJfY5x5dzfItj+9iOc7/RAqMgrUsgV8dxLr7bucdJ7IQACgFaMarSsYLUbqWrtqJ1Kx2UhK5lYVtHlwUqGIzRrptahgSMphT49nze0aRuSE26to90ZOfkO9/3nvd93ud5nbUSJIpUuXGRLQ3bWV669fkgbFcXRZzMwajI/CYiMldiTvZK1Mn+pBv3pSWfDTZkZd0Td3PphIt7HYee7y/WBIMO5gf4/maqkicJN0fCovqJHlFVID3y6aG3VGfoK9PNRl3cUotZUd9qzB+JORkSEdmliIuLhJzM1j6PhkxWCQTZeDckMql2C/NN6fFPjh6V6ivpasMY3vB2rFibbOZzar1GGWnFtUnII16znATtKhJ3sqeQjcMRJ9cVdjKvIrBbMRdzNehQB6StVoZ2i/IbU3WW1pk11rPjVYa5mJurajLK/tRukn/oN8pJu0FGaCBdhQrSoM85HhLZevDiJMpxJCSqb8ZdLEEgP0UAl1CSKmnb5SNgVx0dLufJ1IPmxmaz/Gm/VXnCa1EeaDPLn/eaFbfDRQXEK8j+0sjnNfmtiiOpKuG5fo92adCjJUg/iSEAHH404mTngqJ6v7Tt8gEyzQft6lstZvkbXpP8ZsCiJPg87bMqZhDERX+hYqrLVnBwx5qi6VSlsNTv0Sz2OJiNyMJsL8g4VKIFIZkdIReTCtiZWWnb5SPsYObCIkv81gLSYZBnrh6zgvgtihdajLLH/GbFlM+qPJUG6eLFbLTHxkQG3NxptGUEJIwiiMWQg3kNJTmEzyelbZeHZFbWF5G2s0gf8aHefhyOdN/0CTLSwuXsbWazX/TyeSdaC5XN3TbVlZBDtQ91/2VfsYbQt0cW5kKiKhEtZqzIwoUVEzFi5RhaQxCPdFqVS20G2Us+g6ykhc+/7NXmftjEZg/RdYOlurmES+PvLFKFacqDqD29aBBhh/oquPAUDn8nYFOqMxsvFz0O9fahUt07Ebfm5WS1sA5/H/eZ5Qu+ItV0q01xH10zUqb3ba4xvjVZZ34S5DuHN6WkywQwCD0Iimw8ILIdAYd6IbPpcoHUG2kLRdzc/qEK4dTmVabXRyuFRxp0OQZpSdbEaqN2S52JxEStcaBMv3vHGisZqYQAuTiCelM1fA9d9BSyeBH7NUmPLQ9I2yxE5ZWIi90b9XDf6bJy90r/yiDp8XxprMrwWrpCSKEUP+9GiaIImAaQrjWRLbiibs10D0yKKmJSq/2y9Cg8RKsK2li59OfdkbRYvi59vSvGKvjJqVoj6S/VrWvV513sBEkpUTvRLVSKx2oMZ6gmYN3ViJutp8/gU4SHvIIyXaL8QMDPdDsYLrPhSkBtd6BE+8a21Zb149WGY8kyPQni4FZ9Pu0SEitSkQbN/YnJVeZGaMMZ+gzErB1leq+vVPcCMteNEqXhoku0Y9AtOwMSp5YFmM58wK7eDbIVb1llnp5Zb/NP1hrnhkt0JFxYQDaps/f6BdmeiVrj7eRqU/Z4jWX91AOWPwedzK5mY/40pPlOusb4w4k6UwP0Yk8fsgGeXMb90Hp77tekY+4O1LMEJDvdxOV838fnv98Lsg2V6P649UFLYmZdUXyq1vTWWJUwMvmA5TlkZ3NqTWEeVJIkXLrERiZnY6BQSZoM+aTbVkASxdw/EVgk7OQ2IQvXU+V6GsjfQ6KyUDrufwGn+3XMrd1Zz+c+3AkDahXyCa1/H9QSLXv80e86ZHDN42PVwtsbNmTdgyDO7/p20aomXe5jYcg4VVIfFTSj7E4Dn7uYrBQi/eX6d6Nu9lBYVD0Uc7Nj6Jgb0nEfRZdVwQQcqsVEiTaFdN5ss8hJI94Gkkw6EISXz78R0CvuG63gT41VCrbRcv6RqVrD0nCpfh+85BI8hHjhniGzkrRpc1+sZ7PZXnAAXbNNOiID8GOP9PWjwD/60NsXIi7NWgwlJAbV68QM0GKS0bTeauCydyVE9vx4lfAMgnh4rEL47eRa673DZfrt6Iaz6AB4ipI083kvo4T9PpPsXCOfu1va/uOB9P8s7uK2oY0WaM9HEX2iVEfisF6/reDaYI25IF6iXQg7WR/Gsg8STm6+Xn3/9iY+93ddNlXvllpjOl3BXx6u1O9AJoebhfwVqeMXkAHqbGm00+JohUBtNuP5GNNIP9KN0szFPJr5kF11BtLbPl4pzGyu4Ek33LONzyd428MgsGWqznxsosZIukxstrT3x6PRI/sqyHE67OK8aL/vQWxupKuNpA9loKISEJkG6P/TYPHtEAyox65+Ft6wsBliBT6QfshzFziwVvWtglSN4USq2uSTtl4eMtbsUL8Jaf5xFP0M3/fDpg8kMS0NlvG/xxAykXFCu/oPHQ6lHms/QLmo2hHwgaAz3h4p0z0xXq6/PlrJH5O2XRmQ7p3gwUsQjHMJF3sFvbsVJenCvV2o+TAG0BM0KAR4FlnIlAelyExFuD+P7HmQsfcnqvQrl1+KPhgS3uwk1XrMAGQA5MNIfiHoVK/Doftw/Srh0b5K60sdEWszvxEQxDSuH41BaLptK3TF/0YYUok378OI9VfMAiSJTTGyHQEhD2H8PtnjUO3BodeRcmpUd/7924DtwKT0i7BT/bi0zf8Pas+YF9MDJZpr8WJuFmXoRVmuIbD9ePMAMnMw5tYcihdr3AN0MHEwz0qPfrrwF6qVEYzbqPHfMBFTZzsDHXgcZIS+swd6i7l/gAspaflnh6BY4EDqnwfrF2Czh2kHxFzc0YBTVSkt+XyAehfCUB6KfJJB4z/IyvoXb5tcWAOtX68AAAAASUVORK5CYII=",
            "MTV": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAAlCAIAAABK/LdUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD40lEQVRYhbXXT4tbVRgG8N+9uUlmkpnWOq2jHes4tkUUC0UQBAuKILhw4aqrfgIXfgqXbv0EoqtCBZciKFS6sGgRLVarBcvUajuTqdOkmcmf6+J6rjdJk7lWfTlJuOeec573ed9z3vOkooRVCt9jFoOImLT0UntYxFMktCf6Y1Y5wFY5vLgMHvqs0hidELOfZ0lKrlKSH7apc4gWKSkxdU5wk6uhc08rxS9b6zoVjoQwxhyjz08MGZbzexa/qNAya/MkA3Y4zGNcZofh6OCxWWNr/vWTxadKhQrJaMs6qyyzxC2O0GIjgN3XemyyznYIQJR95jnEEoss0KRJg3nmqBUgYxIiBgynpy3zIGWHH/ic6wyIIqqscJB9LAbIhQA5FyjmqU4DWN7GINPQmUW1ziXOskWSUqMexu3yG+tUA7ksyFVqgV/ech5j8YxpUmPAgF3WWMrwsMsGHbbo0WK3kNQ4RLJLQp04vIqm4FVY4iVWQ8ArzCPD63E7+JtOpCQOqT7KLtenbI0x+5k+p6mNOhTnGIPCFsgtYsgKb/Eua8H9/O20hi06RKMLzqpEWTDP8BpdbtAOYayMejZWr9PC9+SaU21In9fZ4gYxvdA5GF1ubMfOsPvzy4LwOMfZpk+dHk/TCNOusR6y+zDPsUNMn68Y/CO8mAGvcoZvQs8OL9NgSJPzvBcCe5o3ucZDXOJicLosXmYpHbrMh8Pb4xZDNjlMkzYVTvIjd+jx0QPkLxt6k19YCuGNabGfJikHOA6Os0yHffzK1enldCpelvNPeJt6qBRNPuRjnqAHToAX6bNLjQsMZm7CWfszK615WIYs8im7NNjhKAkn2WSOVsjcjC06Cy+d2PR1unzJo3RZ4BUe4Q4LfM3dvW7wsvpF2C84RzMc8Ddoh0L/RYlF9sDLKWaFbZU12nzPwXDGWzS5wnoY9oB42aXaIWFIh1O8wynOcYh+qDUR58OUB+eXvTvPGvVwtLdZ5iJtVoIw+J3LJciZfd4zx89S4/nQ2WKLPh/wAhss8hn90ZI9jWg0+XqajMyqTHcvBrkd4wz7GDLgfb7N+FVphoh1uDtabaNQlO+Fmyh7jEe9LEYyZp5nWJw4/gnmWGaRBim3uUdMlSSIlySIxEpQGHFBWIxFqMJB1gqdaeCQ5K5l8nKBFWo0QqsX9GAuk/KKPCw8FkOicE0mtPgjw4vo0mIuZCimUdCD9cAv5zEcvVon92SaUyGmzQU2cleioOAeCoKzzlxotcAvGVW9ef6mSfeM4ibfcSWUob9HRsGdouwZk35jj0UxeF/IfrhBS/6b+e9tzwL0b2eW+VP4P9qfD28k0CfyG9oAAAAASUVORK5CYII=",
            "ANT": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAZCAIAAAC+dZmEAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEKklEQVQ4jY2UWUxUVxiA/3PuvbMxdzZGGGQZHBCRGREapdCmhhYtNTa82CqpbSgvXSHWByuamlrTRWOaNIa0StSa2Bjb2prSRIMRGrRQomjJjDEMRQrMsA4ww2x3mXvv6QNIwILxe/yT7/xLzv9T8BQgTKHl4tRKQlrhc+bMXDkhyAJPFBkAEMIA5KnkbYfPFO/ZV7CjJjI+BIQk+LgiiYCWVIBXkiWBk/i4GAuHhvu3Hj674/hPlux8hDHC+IkywoBQNDCCaWb49g1TVi6bmpFW+Pyz7xwhskwU5bH8cw56LKo1mHWWlPL9J+s64zu/a03OcVYcOm3KynvU//96prVJudUfZWytthZvQWpdqN893NWCMNV79cK6yjcKqmqN6WsGO64pCRHQnIwQAOgz1ua9+bEs8tHhPmF2SkmI/KQfCMEqzeDN5lV5RWXvHxXCM6wty9/9R2TCh2kaIYQJURjWVHzgNMOaaB3bc+zd2YcezKhydu815m5U6U293x8Nef9++cj52NRY3/VLGqPFf/emLPIUAGBGhWmVJjnV4HD5rl2YfejWpWYSRba/WqtizQCgt68b77jqv9OmMVs37HyvaFf9QPtvXGiKAgCdzZ5X0zBwuTHo6Qp67+XXfpK1/S2Ji/lv/GgrfUXiIhqLLTz4gJvwbf/iIpuaCRiPuTuDQ14MAGpzSrKrTGfLDvZ2q1iTweGSRSGzco8i8NPuDpXBosiyYY1TEoWAt0cWBYSQzmIDABoAMMMQRUYYJ6U7gBDPN/vStlRZnKXpL7020vozm70+Kd2BMAUIdTV9pkpiEcKRieF5WeK5mL+fm/Rv2Ps1pdaN3Wr2tVwcu/W7khAiQ709Jz40OJzRIS8QsnFXXbKjgNZou88fj4z7MABwk76Rtl9Y+3qV0aqIfOa26qIDpzTWtNl+N6JolcGy6plyRZYYjTatsJRdbTdm5Irx8Pz3FIOBsT+bzc4SJSECxhIXfXDqUGxkoPhgE2vPz3m9jtaxiUgwY3OF1mSVuHhsanSqzz1fNgAhChFmxmm1FgHc/7aB1upddcdonZFJMoS890bbr1CMqmh3vZwQGJ3ed6c1Nj2OMEUDACEEEBpsPivFIhIfo9Q6V/0JKTobHx3gAiPTnk5M0+X7G5NzXEJkRs2qPb82AQBCy+wH6LPyGL1JCAXio/8CQFph2aa3G2wFm+PBgD5l9f0rZzoaDyKMiaIskRHGQIAQBQDMWWszSyoyNr1oc5YghPlIKMlq899tv/5pjZwQCCFAyDKZMaYIkMrPf3C8UMUFJyU+jilaY0oe+qul7asPxFgYIUQIWRjYEgghhCiywInRMADRmqxcKHD73Jc9l04SWV4wl5cfvQGJeHiq3zPm7vyn9XJk3De3vAvmk9CarGrWvGgcK57KFUEIYZpZfPQW8x9x/NhSozt00QAAAABJRU5ErkJggg==",
            "HUNO": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFi0lEQVRIie2WW4xdVRnHf99ae+9zP2fOdMa5Vmg7aIk41gDiBBwhEAhNpIZQFZ5MmqgPY9Vg0IRIjIlRkxL0hSj4olEiVmKmqTU2hYKoERmGtmZKp/Qy1HYYO50LM+e6915r+bDPKW2m2gcfeOHLys5ee3/5/v/9XdZ/w/v2Xptc6ZkgCgHX3lqLs2u8RIkAOIcIDuusuxqcoPR/eaVQKrlVF0OvMS0il7+6ZKMU1gJk8lw/wsAQ6Rwm5vwZTkwyN5P4KOesc8D6UsfHevsGiiVfqWoUnl5cfHX2bDUMEwaJzyUASmMNnX18dozR7fQPkRIsCFhYmOfwQXbvYvpVYEvfwNgtI7ddc21vvqBFrEMpqUfRzNLS+BtTT0/+43ylchFD3uX+8Tt5+GkGN9AwRI3W1yQk/IB0oBpN/eyPHjlxYOzW0bQf1MMoNLGjVSwlkva8jO+fXFzYuW/PyzOnEwyN0ljLJ7by3ecodbO6irOtjF9c1tKoSypLvntLXLkjw0oYIk6JSuqhREQksrYaRV3Z3LbNH/nnv+dOLi5oEQ3Qt4kf/IF0nkYNz0cE53AWBGdJSKYy7twJ9v7876tRh68/nVV1J7hWpq1zAkpEizTjOON5d2+6bvzY0eVGXSPCV55gywiVKp4HYC1+ilwaNOkUXkAcYw3PPyuVZfFTEw27Nac6lUsFQcbzlEg+lbLOxdYmvds0pieXzwX+vuPTmuFRHnoUPFpNbUlnWZpj9xP8/icc+TPZIhuHOHaIIy8TZLTYuqGo3X0d6YNnzvz4b3/51eHXpxfmhzq7OjOZ0JgEIzRmsFR6bfac8K1fMrq9nRBH4DM7w3c+w9npdm/7fPsXSIrJg2Tyylln3c3F1BeXpnbu2xMbk3gNdXb9evsXru0oN00sSFL28WNHNTufxA9a7eQcqTSP72Dqr/gBgPIwERP7KffjBa1sa32hsrp//2/COPK0FvC1nq9Vz62+88ANw2FskmFz0F8oKvId70b3fJbmOT6BqFbeTYQI9VXOHcfzcYBDe82F2UbYFCQ2xjgXW6tEDr09e75S8ZV27RErpdPqygfD1e1qp07bFJVlkmYTIY4od3P9J3EWz0NpPB/nyJVZv5k4RADBxOmugVwq7XC+1lrEU8o6d2P/YE8+H1kjbQrvNBqKyQMo3WIkYCJ2/JD1m4lCrCGO8Hy+8SQfvolGDdFKkNgMl0u77t7qax0ZY5wLjbluXddjd9wVGdNqRtAiL82c0qxcYGQbqUxrgE1MuYdPPUBxHdkCN93Dl3dx271Ua5yeQntKnHXyUN4+smnw5ms25v2gJ1/43A3D37/znsFiqR7HyUHriaw0G9978XkB+PrPuP9LLK7g+e1BC8j4NC2+wkC9hlbseUpmT+Ony8q+uN5bp1wQBL5SYWzSvlcNw9CYJHpszQdy+Z9OvPLwH/dqRHjrKLc/SLZIFKIUIlhDo4G1hE3iCAEvoNQpbx5ycfxYj39XVmpIbEwjjo21tShyzrWj26wfzFerY3vHV5pNjdKsLnDqCKP3k8nTrLcULUES1ZrwqKm6BqRr4Gurx79ZZim2uq080r4652LnCkHQMGbH+O8OvT2rRRTWoBQTf+LR+zg7TblIkMY5TNxa1uB5lIo06/qlZ7wjB6qWzkzG09o4G1trrI2tdc4FntedzZ1cXHzwt88cPHVSiRjnLhecjm62fZXbP0/fRjIeFhTEcGGOwy+w+3HenASGe/vGbhm59YMb+goFX2nrnFJSbYYzy0vjb0w99dorC7Xa5YLTwrgomQU+dCO9Gyh106gw/y9OvM782YSHcs46C/QXih/t6R0olnJBsFCrvrW8fHhutrJGMi+3/yH66v8X/Uthktq69vRZyxpGa35bnHVXpv2+vcf2HxvMmXL9o5lXAAAAAElFTkSuQmCC",
            "BTN": "data:image/x-icon;base64,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",
            "TVV": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABaElEQVQokb2SsWrCYACE708kZsmSzTSgIClCLTYYLHYROghCwCdQRx/AVXwNxU4dpFMnQSdRwSVooXRQyZBNEBcdVGrMn7+DpXMztLcd3Ad3cCSdTiOIuEDpfwNEUazVarIs/wYIAcjlcoVCYbPZOI4jCIJlWcfjMRaLRSIRURQvVlVVSZIWiwWvKEqxWNR1nVK63++r1arnebZtNxoNQkilUqGU2rZdr9cPh8NyueQAdDodAK1Wq9frDYdD0zSj0Wg2mx0MBuPx2DRNVVVTqdRoNPreQCl1XfdSsd/va5pWLpen0+l6ve52u5qmlUqlyWSy2+0A8Iqi+L6fz+dlWQ6Hw7PZLJFIZDKZZrPpOM52u43H44ZhtNvt1WoFgMyv4HHc6TopPTx+vlv+xxuf1Lm7+9PLU+jsAvBvdHZrsNfnkOcKlJL5FQCcOZ4BBOCZz0B8gAMIGIAfyzMfAAn6JcIYCwb8+Vu/AEC5mnrULGUWAAAAAElFTkSuQmCC",
            "NBL": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyMUJENDczQzJFMjJFNzExQjY2Q0ZDM0MxODhFRTAyMCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5RkEyRTRFRDJFQkQxMUU3QUU5NUFFNzM4QkNCRTk3MSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5RkEyRTRFQzJFQkQxMUU3QUU5NUFFNzM4QkNCRTk3MSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjVDOEJGQ0FBNzcyM0U3MTFBOTU5ODg3Q0UxNUVFRjFDIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjIxQkQ0NzNDMkUyMkU3MTFCNjZDRkMzQzE4OEVFMDIwIi8+IDwvcmRmOkRlc2NyaXB0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",
            "RTF": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAACXBIWXMAAA7EAAAOxAGVKw4bAAADc0lEQVQ4ja1TTUhyWxTd55yrJgZmN3MglmU0qEZZEhRlQUkUNMhxgyZBP9CkYYOmzQKJBmGBUnQhghSEokEQODASbJA80wZCFkThX5ree883OA/z5df74vHWcN+9111nrb0B/ieg2hLGGKHPuizLlNIfESGEEEKUUjYvy3ItNSuyzi9fKaWU0t8ostls09PTra2tmUwmGAyenJwUCgVCiCRJf1DE8zzP8+VyuVQqbW1tDQ0NhcPh+/t7rVZrtVpVKtXq6qrf71coFHq9vr6+HmNcKBQQQrIsE0KKxWIqlQIAODw8vL29FQTh+fn54uKis7Oz8h9CyMrKysfHh9Pp1Gg0Dw8PgUDA6/Umk8l4PP74+JhIJARBaG9vB4SQxWLZ29s7Ozu7vr4mhAAAx3GEEI7jGN3c3Nzb25vBYBgZGTk+Pvb5fC6Xy2w29/T0bGxsxGKxrq4uYN2Li4uhUEgQhC+pIYRYw/n5+ebmJgDs7OxEIpH19XXWUFdXNz8/r9VqMZuklIbD4Vwup1Qqq1NjwSOEBEGw2+0Y40wmEwqFmGQAKBaLbrc7nU5jljfjEkWxNg6WbjKZ1Ol0siyzRUmn05Ik+f3+sbExZgL3mV/NglTqGGODwZDNZpn9+Xze4XCYTCaLxdLY2ChJ0j+IKgv5hYXFPDMzEwwGWQ6lUslkMgHA09NTxQcOvgHGGGMsSVK5XHY4HOPj4/39/QAgimJDQ4Pb7d7e3o5EIuVy+ZOICfmy/rIsM0ecTqfH41lbW4tGo0ydLMsajeb9/X1gYCCfzwOAJElcJRpmKmOklE5MTPT19dlsNrvdvrS05Ha7OY4TRRFjLIkiO5eXl5eKLViSJKVS2dHREY1GlUpl5dCNRuPs7Gw8Ho9EIoFAgBAiimJbW5tarb67u7NarWq1uvoRBAD29/ftdjtCqKmpyev1UkoJITc3Nzqdbmpqymg0mkym09NTvV5/eXmJEGrk+cnJyeHh4aOjo8rGcADgcrmam5sVCkUikahkhxC6uroaHR2tU6l6e3u1Wm02m11eXmZBezyeYrFYcfpbMC6z2XxwcODz+f6Kxcxm87+P/H0ihBBCCMb40zyMk8lkKpVqaWl5z+WYEIVCQarwBznVonie393dfX19XVhYAICfDv+WCwAGBwe7u7vh+zP6Edd/H65FtX3f4RdCCJ2O1iXaRgAAAABJRU5ErkJggg==",
            "LST": "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABdUlEQVQokX1SvU7CUBQ+X9sEGdClrogLKrt20ycwBgd2HGSoEyagATWGRTQkkuCL4MQbFGZ4B9tEht4aidxyHNpKReQs5/+73z3nEIUCWiF/kohZ+HGAlSiEsBFEIEQg//SAEJXEcTFPR5aqAGvJ5FROozQ0TdtKpwFMJp8AEUAcQ6nVa1LK3d29AOnw6MhxHJ6xL/1qtVqpVITrCiGEcIUQpmlqYKiKurGxTgRiuiyX9U29eFb88D6EEI7juK54fHocv48fms1er0c39TrzzDCM4BN3t7fMbNtvz+22rusBC9u2+5YVkFI4iDERExHdNxr503x/MLi4MLuv3diMQ60F3vHJ8V4uNxwODWN/5vNLp3Owf5DN7jDPJ8QgYqJCoTD9+vKl9H2/1WpdXV9L6fOMPc8rnZeCOY9GI6tvLdsFERFSqVQms51IJMIwSFVURVGX7zpUIXcs5PArFhT9rAixDsRL8PdcMD+V3/e38MISkot1oG8LrYcYvGwHdwAAAABJRU5ErkJggg==",
            "TL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADVklEQVRYhe2XbWhTZxTHf+fmJk2ikWrTGuIcGTrjZv02JmxjCmqHuq5qUUTQCoNtOJh+KBMmbChT1i0MVOr2SfYioiBuDDYGohudU9up+DZXlmpLNZlFLLZJV5cm99mHxLTZvTe2sQw/9HzLOff8/7/75HkezhV/2KeBNAJbFCooCA9C13WenTOPgb8HuN7VwWhDuRQqYCC9giS1whoKQeLAHiCi58ybAEaaL1lYw97d+6msqATgyrXLvL61gc7uG/bGDkW6/j7Gi0OgAwqk3YHzaw/SlwXJeQTznv6wLwYSHCkUevIpWr47g8ftKTBoj/7BwroXMAzDEiC9+j6ZxSlTXro0nJ9MKnjBXMS1/5oD1Na8ZjIHmPv0M8wLV1u/PYrM80PWtZCBqrKAVgQ1cxaqKgOWQtnadNsaPjW2moAlwP8ZJgC320NF+TTbhlmh2VTPnU+Zq2z8ARo3v0u0tYs1detsG3a99xE/fXuKP8928tamt8cPoL52Ddve2Y67zD2qRq93Eju37aJm0SvjA7By2eoxN4sIdSX0WQI4dWdJAqX2mQB+PPlDSQKl9pkAvjryBV8ePoBSRc7yiDAMg+YD+zj2/dFHAhB/eEqBYzAwg93bm1ixtNayIbL/Y85f+o0r1y7Rc6cnn1coUs0JWyPnp16067opb8rEb8e4Gb9pK3TuYhsnWo7b1scaj99NOAEwATAB8HgAFLmOLQbLRwrz3Qj0J/ttGzasbWDa1Ap+bW0hdjs2aiPlVQ++CQrylivwe/tVW6HlS16luelz2o5fZMPaTYVF66EYgPSbg6R2JMlUFz5kCXC67RSp1D/2aoDL6aLp/QihmSEg+9dIrMiWEsCvSL8xiPFEpjjAvf57HDp2sCgAZIeRlxa8PCx2dRTDiQOM54ZXwRZ5Z+QDOjqjD9XrS/QNa//sgt6xbVINiFsVEskEqxpqab1w1rY59tctTv5yIv9bBgXnZ164WwQiA9r53EopFXd4/WU6sNTq2eRAksPfHKLjRhTfZB/TqwL5GbCjM8rGzeuJ9xSeBEloOM64YEjAq2CyIr/xewX9oAdHNHf4RD4Uf3iKBjQCW8h+tdqGrusEAzMQoPtWN4qHj2/KpVDlBpIW6BUEQaHiguwBIv8CADAD2HVSly4AAAAASUVORK5CYII="
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
              (tracker === "RTF") ||
              (tracker === "AvistaZ") ||
              (tracker === "CinemaZ") ||
              (tracker === "PHD") ||
              (tracker === "TL")
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
                "FTW-HD",
                "de[42]"
                //"ExampleText3"
            ];
        };

        const badGroups = () => {
            return [
                "NOGRP",
                "nogroup",
                "NOGROUP",
                "VC-1",
                "MIXED",
                "Mixed",
                "MiXED",
                "BTN",
                "Unknown",
                "-UNK-"
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
                        const discountTVVElement = torrent.querySelector('torrentinfo[type="freeleech"]');
                        let discountType = "None";
                        if (discountTVVElement) {
                            const isFreeLeech = discountTVVElement.textContent.includes("Freeleech");
                            discountType = isFreeLeech ? (simplediscounts ? "FL" : "Freeleech") : "None";
                        }
                        torrent_obj.discount = discountType;
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
                            const discountMTVElement = torrent.querySelector('torznab\\:attr[name="downloadvolumefactor"]');
                            let discountType = "None";
                            if (discountMTVElement) {
                                const discountValue = discountMTVElement.getAttribute('value');
                                const isFreeLeech = discountValue === "0";
                                if (simplediscounts) {
                                    discountType = isFreeLeech ? "FL" : "None";
                                } else {
                                    discountType = isFreeLeech ? "Freeleech" : "None";
                                }
                            }
                            torrent_obj.discount = discountType;
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
                    let size = [...d.querySelectorAll("font")].find((font) => {
                        return (font.textContent.includes("[") === false) && (font.textContent.includes("TB") || font.textContent.includes("GB") || font.textContent.includes("MB"));
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
                    const groups = goodGroups();
                    const badGroupsList = badGroups();
                    let matchedGroup = null;
                    let badGroupFound = false;

                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim();
                            groupText = "";
                            break;
                        }
                    }

                    if (!badGroupFound) {
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
                                groupText = match[1];
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
                    const discountImage = [...document.querySelectorAll("img")].find(image => image.alt.includes("FreeLeech"));
                    const discountType = discountImage ? (simplediscounts ? "FL" : "FreeLeech") : "None";
                    torrent_obj.discount = discountType;
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
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024);
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024);
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    } else {
                        size = 1;
                    }

                    torrent_obj.size = size;
                    let releaseName = d.querySelectorAll("td")[1].querySelector("b").textContent.trim();
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups();
                    const badGroupsList = badGroups();
                    let matchedGroup = null;
                    let badGroupFound = false;

                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim();
                            groupText = "";
                            break;
                        }
                    }

                    if (!badGroupFound) {
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
                                groupText = match[1];
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

                    const discountImg = [...document.querySelectorAll("img")].find(e => e.alt.includes("bonus"));
                    let discountType = "None";
                    if (discountImg) {
                        const altText = discountImg.alt;
                        if (simplediscounts) {
                            if (altText === "100% bonus") {
                                discountType = "FL";
                            } else if (altText === "30% bonus") {
                                discountType = "30%";
                            } else if (altText === "40% bonus") {
                                discountType = "40%";
                            } else {
                                discountType = "None";
                            }
                        } else {
                            if (altText === "100% bonus") {
                                discountType = "FreeLeech";
                            } else if (altText === "30% bonus") {
                                discountType = "30% Bonus";
                            } else if (altText === "40% bonus") {
                                discountType = "40% Bonus";
                            } else {
                                discountType = "None";
                            }
                        }
                    }
                    torrent_obj.discount = discountType;
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
                        torrent_obj.discount = "None";
                        torrent_objs.push(torrent_obj);
                    } catch (e) {
                        console.error("An error has occurred: ", e);
                    }
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
            if (debug) {
                console.log(`${tracker} processed torrent objects`, torrent_objs);
            }
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
                    console.warn(`TVV: ${timeValue}`);
                    displayAlert(`TVV: ${timeValue}`);
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

        const isTrackerSelected = (tracker) => {
            return GM_config.get(tracker.toLowerCase());
        };

        const login_json = async (login_url, tracker, loginData) => {
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

            if (response.status === 201 || response.status === 200) {
                if (debug) {
                    console.log(`Login response from ${tracker}`, response.responseText);
                }
                return JSON.parse(response.responseText);
            } else if (response.status === 422) {
                const jsonResponse = JSON.parse(response.responseText);
                console.warn(`Auth details not correct for ${tracker} auth login`);
                console.log(`Login response from ${tracker}`, response.responseText);
                displayAlert(`Auth details not correct for ${tracker} auth login`);
                return JSON.parse(response.responseText);
            } else {
                if (debug) {
                    console.log(`Login response from ${tracker}`, response.responseText);
                }
                console.warn(`Error: ${tracker} HTTP ${response.status} Error.`);
                displayAlert(`${tracker} returned not ok`);
                return null;
            }
        };

        const fetch_login = async (login_url, tracker, loginData) => {
            try {
                const result = await login_json(login_url, tracker, loginData);
                if (result && result.token) {
                    return result;
                } else {
                    console.log(`${tracker} response`, result);
                    console.log(`${tracker} data`, loginData);
                    return null;
                }
            } catch (error) {
                console.error(`Error in fetch_login for ${tracker}`, error);
                return null;
            }
        };

        const rtf_login = async () => {
            const login_url = "https://retroflix.club/api/login";
            const loginData = {
                username: RTF_USER,
                password: RTF_PASS
            };
            return await fetch_login(login_url, 'rtf', loginData);
        };

        const avistaz_login = async () => {
            const login_url = "https://avistaz.to/api/v1/jackett/auth";
            const loginData = {
                username: AVISTAZ_USER,
                password: AVISTAZ_PASS,
                pid: AVISTAZ_PID
            };
            return await fetch_login(login_url, 'avistaz', loginData);
        };

        const cinemaz_login = async () => {
            const login_url = "https://cinemaz.to/api/v1/jackett/auth";
            const loginData = {
                username: CINEMAZ_USER,
                password: CINEMAZ_PASS,
                pid: CINEMAZ_PID
            };
            return await fetch_login(login_url, 'cinemaz', loginData);
        };

        const phd_login = async () => {
            const login_url = "https://privatehd.to/api/v1/jackett/auth";
            const loginData = {
                username: PHD_USER,
                password: PHD_PASS,
                pid: PHD_PID
            };
            return await fetch_login(login_url, 'phd', loginData);
        };

        const shouldRunAfterInterval = (tracker, intervalHours) => {
            const token = GM_config.get(`${tracker.toLowerCase()}_token`);
            if (!token) {
                console.log(`No token found for ${tracker}, overriding wait period.`);
                return true;
            }

            const lastRunRaw = GM_config.get(`${tracker.toLowerCase()}_last_login_run_raw`);
            if (lastRunRaw) {
                const lastRunDate = new Date(lastRunRaw);
                if (isNaN(lastRunDate.getTime())) {
                    console.error(`Invalid lastRun date for ${tracker}: ${lastRunRaw}`);
                    return false;
                }
                const now = new Date();
                const timeDifference = (now - lastRunDate) / (1000 * 60 * 60); // Time difference in hours
                const shouldRun = timeDifference >= intervalHours;
                console.log(`${tracker} auth login last run ${timeDifference} hours ago. Should run = ${shouldRun}`);

                if (debug) {
                    console.log(`Last run date for ${tracker}: ${lastRunDate.toISOString()}, Current date: ${now.toISOString()}, Time difference: ${timeDifference} hours, Should run: ${shouldRun}`);
                }

                return shouldRun;
            }
            return true;
        };

        (async (intervalHours = authloginwait) => {

            const updateTrackerLogin = async (tracker, loginFunction, loginData) => {
                if (isTrackerSelected(tracker) && shouldRunAfterInterval(tracker, intervalHours)) {
                    console.log(`Running ${tracker} login function...`);
                    const result = await loginFunction(loginData);
                    if (result) {
                        const token = result.token;
                        if (debug) {
                            console.log(`${tracker} Login successful`, result);
                            console.log("Extracted token:", token);
                        }
                        GM_config.set(`${tracker.toLowerCase()}_token`, token);
                        console.log(`${tracker} token found and set`);
                        const rawDate = new Date().toISOString();
                        GM_config.set(`${tracker.toLowerCase()}_last_login_run_raw`, rawDate);
                        GM_config.save();
                    } else {
                        console.warn(`${tracker} Auth Login failed`);
                    }
                } else {
                    if (debug) {
                        console.log(`${tracker} Auth login already performed within the time period or the tracker is not selected.`);
                    }
                }
            };

            await updateTrackerLogin('rtf', rtf_login, {});
            await updateTrackerLogin('avistaz', avistaz_login, {});
            await updateTrackerLogin('cinemaz', cinemaz_login, {});
            await updateTrackerLogin('phd', phd_login, {});
        })();

        const post_json = async (post_query_url, tracker, postData, timeout = timer) => {
                const timer = setTimeout(() => {
                    return null
                }, timeout);
            const headersMapping = {
                'ANT': {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Host': 'anthelion.me'
                },
                'RTF': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': GM_config.get("rtf_token"),
                },
                'AvistaZ': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${GM_config.get("avistaz_token")}`,
                },
                'CinemaZ': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${GM_config.get("cinemaz_token")}`,
                },
                'PHD': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${GM_config.get("phd_token")}`,
                },
                'TL': {
                    'Content-Type': 'application/json',
                    //'Accept': 'application/json',
                    //'Authorization': GM_config.get("rtf_token"),
                },
                // Add more trackers and their headers as needed
            };

            const headers = headersMapping[tracker] || {
                'Content-Type': 'application/json'
            };

            if (debug) {
                console.log(`Headers for ${tracker}`, headers);
            }

            const methodMapping = {
                'RTF': 'GET',
                'AvistaZ': 'GET',
                'CinemaZ': 'GET',
                'PHD': 'GET',
                'TL': 'GET',
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
                clearTimeout(timer);
            } else if (response.status === 401) {
                const jsonResponse = JSON.parse(response.responseText);
                clearTimeout(timer);
                console.log(`raw response from ${tracker}`, response.responseText);
                if (tracker === 'RTF' && jsonResponse.error && jsonResponse.message === "Invalid API token.") {
                    displayAlert("Something went wrong with RTF API token");
                }
                return jsonResponse;
            } else if (response.status === 404) {
                clearTimeout(timer);
                const jsonResponse = JSON.parse(response.responseText);
                if (debug) {
                    console.log(`raw response from ${tracker}`, response.responseText);
                }
                if (tracker === "AvistaZ" || tracker === "CinemaZ" || tracker === "PHD") {
                    console.log(`${tracker} reached successfully but no results were returned`);
                }
                return jsonResponse;
            } else if (response.status === 422) {
                clearTimeout(timer);
                console.log(`Confirmed Auth details incorrect for ${tracker}`);
                return null;
            } else if (response.status === 502) {
                console.warn(`502 bad gateway for ${tracker}`);
                displayAlert(`502 bad gateway for ${tracker}`);
                clearTimeout(timer);
                return null;
            } else {
                clearTimeout(timer);
                if (debug) {
                    console.log(`Raw response from ${tracker}`, response.responseText);
                }
                console.warn(`Error: ${tracker} HTTP ${response.status} Error.`);
                displayAlert(`${tracker} returned not ok`);
                return null;
            }
        };

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

        const fetch_tracker = async (tracker, imdb_id, show_name, show_nbl_name, tvdbId, tvmazeId, timeout = timer) => {
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
                    if (!easysearching) {
                        query_url = "https://tv-vault.me/xmlsearch.php?query=get&torrent_pass=" + TVV_TORR_PASS + "&imdbid=" + imdb_id + "&xmladd-x-currentseed=1";
                    } else {
                        query_url = "https://tv-vault.me/xmlsearch.php?query=get&torrent_pass=" + TVV_TORR_PASS + "&imdbid=" + imdb_id;
                    }
                }
                else if (tracker === "RTF") {
                    post_query_url = "https://retroflix.club/api/torrent?imdbId=" + imdb_id + "&page=1&itemsPerPage=50&sort=torrent.createdAt&direction=desc";
                }
                else if (tracker === "NBL") {
                    post_query_url = "https://nebulance.io/api.php";
                    if (tvmazeId) {
                        postData = {
                            jsonrpc: "2.0",
                            id: generateGUID().substring(0, 8),
                            method: "getTorrents",
                            params: [
                                NBL_API_TOKEN,
                                {
                                    tvmaze: tvmazeId
                                    //imdb: imdb_id
                                },
                                100, // Results per page
                                0,   // Page number
                                1
                            ]
                        };
                    } else {
                        postData = {
                            jsonrpc: "2.0",
                            id: generateGUID().substring(0, 8),
                            method: "getTorrents",
                            params: [
                                NBL_API_TOKEN,
                                {
                                    //tvmaze: tvmazeId
                                    series: show_nbl_name
                                    //imdb: imdb_id
                                },
                                20, // Results per page
                                0,   // Page number
                                1
                            ]
                        };
                    }
                }
                else if (tracker === "AvistaZ") {
                    post_query_url = "https://avistaz.to/api/v1/jackett/torrents?imdb=" + imdb_id;
                }
                else if (tracker === "CinemaZ") {
                    post_query_url = "https://cinemaz.to/api/v1/jackett/torrents?imdb=" + imdb_id;
                }
                else if (tracker === "PHD") {
                    post_query_url = "https://privatehd.to/api/v1/jackett/torrents?imdb=" + imdb_id;
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
                else if (tracker === "TL") {
                    post_query_url = "https://www.torrentleech.cc/torrents/browse/list/imdbID/"+ imdb_id;
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
                                    console.log(`Result from ${tracker}`, result);
                                }
                                clearTimeout(timer); // Clear the timer on successful fetch

                                if (result) {
                                    try {
                                        if (result?.results && tracker === "BHD") {
                                            if (result.status_code !== 1) {
                                                console.warn("BHD returned a failed status code");
                                                resolve([]);
                                            }
                                            if (result.total_results === 0) {
                                                console.log("BHD reached successfully but no results were returned");
                                                resolve([]);
                                            } else {
                                                console.log("Data fetched successfully from BHD");
                                                resolve(get_post_torrent_objects(tracker, result));
                                            }
                                        } else if (result?.data && tracker === "HDB") {
                                            switch (result.status) {
                                                case 1:
                                                    console.warn("HDB: Failure (something bad happened)");
                                                    resolve([]);
                                                    break;
                                                case 4:
                                                    console.warn("HDB: Auth data missing");
                                                    resolve([]);
                                                    break;
                                                case 5:
                                                    console.warn("HDB: Auth failed (incorrect username / password)");
                                                    resolve([]);
                                                    break;
                                                default:
                                                    if (result.data.length === 0) {
                                                        console.log("HDB reached successfully but no results were returned");
                                                        resolve([]);
                                                    } else {
                                                        console.log("Data fetched successfully from HDB");
                                                        resolve(get_post_torrent_objects(tracker, result));
                                                    }
                                            }
                                        } else if (result?.result && tracker === "NBL") {
                                            if (result.result.count === 0) {  // Fixed from result.result.item to result.result.items
                                                console.log("NBL reached successfully but no results were returned");
                                                resolve([]);
                                            } else {
                                                console.log("Data fetched successfully from NBL");
                                                resolve(get_post_torrent_objects(tracker, result));
                                            }
                                        } else if (tracker === "BTN" && result?.result) {
                                            if (result.result.results === "0") {
                                                console.log("BTN reached successfully but no results were returned");
                                                resolve([]);
                                            } else {
                                                console.log("Data fetched successfully from BTN");
                                                resolve(get_post_torrent_objects(tracker, result));
                                            }
                                        } else if (result?.item && tracker === "ANT") {
                                            if (result.item.length === 0) {
                                                console.log("ANT reached successfully but no results were returned");
                                                resolve([]);
                                            } else {
                                                console.log("Data fetched successfully from ANT");
                                                resolve(get_post_torrent_objects(tracker, result));
                                            }
                                        } else if (tracker === "RTF" && Array.isArray(result)) {
                                            if (result.length === 0) {
                                                console.log("RTF reached successfully but no results were returned");
                                                resolve([]);
                                            } else {
                                                console.log("Data fetched successfully from RTF");
                                                resolve(get_post_torrent_objects(tracker, result)); // Resolve the result directly
                                            }
                                        } else if (result?.data && tracker === "AvistaZ" || tracker === "CinemaZ" || tracker === "PHD") {
                                                console.log(`Data fetched successfully from ${tracker}`);
                                                resolve(get_post_torrent_objects(tracker, result));
                                        } else if (result?.torrentList && tracker === "TL") {
                                            if (result.numFound === "0") {
                                                console.log("TL reached successfully but no results were returned");
                                                resolve([]);
                                            } else {
                                                console.log("Data fetched successfully from TL");
                                                resolve(get_post_torrent_objects(tracker, result));
                                            }
                                        } else {
                                            console.warn(`Unhandled tracker or response format for ${tracker}`);
                                            resolve([]);
                                        }
                                    } catch (processingError) {
                                        console.error(`Error processing result from ${tracker}:`, processingError);
                                        resolve([]);
                                    }
                                } else {
                                    console.warn(`No result returned from ${tracker}`);
                                    resolve([]);
                                }
                            })
                            .catch(error => {
                                console.warn(`Error fetching data from ${tracker}:`, error);
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

                            let discounted = "None";
                            if (is25) {
                                discounted = simplediscounts ? "25%" : "25% Freeleech";
                            } else if (is50) {
                                discounted = simplediscounts ? "50%" : "50% Freeleech";
                            } else if (is75) {
                                discounted = simplediscounts ? "75%" : "75% Freeleech";
                            } else if (is100) {
                                discounted = simplediscounts ? "FL" : "Freeleech";
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
                                let discountText = "None";

                                if (d.freeleech === "yes") {
                                    discountText = simplediscounts ? "FL" : "Freeleech";
                                } else {
                                    if (isInternal || isRemux || isDisc || isCapture || isTv || isDoco) {
                                        discountText = simplediscounts ? "50%" : "50% Freeleech";
                                    } else if (isWeb && isInternal) {
                                        discountText = simplediscounts ? "25%" : "25% Freeleech";
                                    } else {
                                        discountText = "None";
                                    }
                                }

                                return discountText;
                            };
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
            else if (tracker === "AvistaZ" || tracker === "CinemaZ" || tracker === "PHD") {
                try {
                    torrent_objs = postData.data.map((d) => {
                        const size = parseInt(d.file_size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.file_size); // Original size

                        const inputTime = d.created_at;
                        let time = toUnixTime(inputTime);
                        if (isNaN(time)) {
                            return null;
                        }

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: d.file_name,
                                size: size,
                                info_text: d.file_name,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.completed || 0,
                                seed: d.seed || 0,
                                leech: d.leech || 0,
                                download_link: d.download,
                                torrent_page: d.url || "",
                                discount: "None",
                                status: "default",
                                //groupId: d.releaseGroup,
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
            else if (tracker === "TL") {
                try {
                    if (postData.torrentList) {
                        torrent_objs = Object.values(postData.torrentList).map(d => {
                            const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                            const api_size = parseInt(d.size); // Original size

                            const originalInfoText = d.name;
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
                                  const inputTime = d.addedTimestamp;
                                  let time = toUnixTime(inputTime);
                                  if (isNaN(time)) {
                                      return null;
                                  }
                                  const id = d.fid;
                                  const down = d.filename;

                                  const match = infoText.match(" TS ");
                                  if (match) {
                                      if (improved_tags) {
                                          infoText = infoText.replace(" TS ", 'CAM').trim();
                                      }
                                  }
                                  const match1 = infoText.match("HDTS");
                                  if (match1) {
                                      if (improved_tags) {
                                          infoText = infoText.replace("HDTS", 'CAM').trim();
                                      }
                                  }

                                  const torrentObj = {
                                      api_size: api_size,
                                      datasetRelease: originalInfoText,
                                      size: size,
                                      info_text: infoText,
                                      tracker: tracker,
                                      site: tracker,
                                      snatch: parseInt(d.completed) || 0,
                                      seed: parseInt(d.seeders) || 0,
                                      leech: parseInt(d.Leechers) || 0,
                                      download_link: `https://www.torrentleech.cc/download/${id}/${down}`,
                                      torrent_page: `https://www.torrentleech.cc/torrent/${id}`,
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
            if (debug) {
                console.log(`${tracker} processed torrent objects`, torrent_objs);
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
                    discountText = simplediscounts ? "25%" : "25% Freeleech";
                } else if (text === "Copper") {
                    discountText = simplediscounts ? "25% " : "Copper";
                } else if (text === "50%") {
                    discountText = simplediscounts ? "50%" : "50% Freeleech";
                } else if (text === "Bronze") {
                    discountText = simplediscounts ? "50%" : "Bronze";
                } else if (text === "75%") {
                    discountText = simplediscounts ? "75%" : "75% Freeleech";
                } else if (text === "Silver") {
                    discountText = simplediscounts ? "75%" : "Silver";
                } else if (text === "100%") {
                    discountText = simplediscounts ? "FL" : "Freeleech";
                } else if (text === "Golden") {
                    discountText = simplediscounts ? "FL" : "Golden";
                } else {
                    discountText = text + (simplediscounts ? " FL" : " Freeleech");
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
                              updatedInfoText = "2160p " + updatedInfoText;
                            } else if (tikQuality.includes("BD")) {
                              updatedInfoText = "1080p " + updatedInfoText;
                            }
                          }
                        }

                        const inputTime = element.attributes.created_at;
                        let time = toUnixTime(inputTime);
                        if (isNaN(time)) {
                            return null;
                        }

                        const descriptionText = element.attributes.description;
                        const imageUrls = [];
                        const regex = /\[img(?:=\d+)?\](https?:\/\/[^\s\[\]]+?\.png)\[\/img\]|(?:^|\s)(https?:\/\/[^\s\[\]]+?\.png)(?=\s|$)/gi;
                        const slowPicsRegex = /(https?:\/\/slow\.pics\/\S+)/gi;
                        let match;

                        while ((match = regex.exec(descriptionText)) !== null) {
                            const url = match[1] || match[2];
                            imageUrls.push(url);
                        }
                        while ((match = slowPicsRegex.exec(descriptionText)) !== null) {
                            let url = match[0];
                            // Remove [url] and [/url] tags if present
                            url = url.replace(/\[\/?url\]/gi, '');
                            imageUrls.push(url);
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
                            images: imageUrls,
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
                if (debug) {
                    console.log(`${tracker} processed torrent objects`, torrent_objs);
                }
                return torrent_objs;
            }
        };

        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

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
            if (lower.includes("cam")) bonuses.push("CAM");
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
            const existing_torrent_sizes = Array.from(document.querySelectorAll("span[style='float: left;']")).map(x => {
                const sizeStr = x.title.replace(" bytes", "").replace(/,/g, '');
                return parseInt(sizeStr, 10);
            });
            //console.warn("existing sizes", existing_torrent_sizes);

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
                if (!hide_tags) {
                    if (improved_tags) {
                        const torrentInfoLink = cln.querySelector(".torrent-info-link");
                        if (torrent.discount === "Freeleech" || torrent.discount === "FL" || torrent.discount === "Golden") {
                            torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
                        } else if (torrent.discount === "50% Freeleech" || torrent.discount === "50%" || torrent.discount === "Bronze") {
                            torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
                        } else if (torrent.discount != "None") {
                            torrentInfoLink.innerHTML += ` / <span class='torrent-info__download-modifier'>${torrent.discount}!</span>`;
                        }
                    } else {
                        if (torrent.discount != "None") {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>${torrent.discount}!</span>`;
                        }
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

                const groupTorrent = cln.querySelector('.torrent-info-link');
                let newHtml = groupTorrent.outerHTML;

                if (torrent.time && torrent.time !== "None") {
                    if (groupTorrent) {
                        newHtml += `<span class='release time' title="${torrent.time}"></span>`;
                    }
                }

                if (torrent.images && Array.isArray(torrent.images) && torrent.images.length > 0) {
                    if (groupTorrent) {
                        torrent.images.forEach(image => {
                            newHtml += `<span class='UNIT3D images' title="${image}"></span>`;
                        });
                    }
                }

                if (groupTorrent) {
                    groupTorrent.outerHTML = newHtml;
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

                let api_sized = torrent.api_size;
                const menu_value = valueinMIB; // This value can be set dynamically based on your menu selection
                const MIB_IN_BYTES = menu_value * 1024 * 1024;
                const sizeWithinMiBExists = existing_torrent_sizes.some(existingSize =>
                Math.abs(existingSize - api_sized) <= MIB_IN_BYTES
                );

                const exactSizeExists = existing_torrent_sizes.includes(api_sized);
                const ptp_format_size = get_ptp_format_size(torrent.size);

                if (hide_if_torrent_with_same_size_exists) {
                    if (!fuzzyMatching && exactSizeExists) {
                        if (log_torrents_with_same_size) {
                            console.log(`[${torrent.site}] A ${ptp_format_size} torrent already exists:\n${torrent.datasetRelease}\n${torrent.torrent_page}`);
                        }
                        return;
                    } else if (fuzzyMatching && sizeWithinMiBExists) {
                        if (log_torrents_with_same_size) {
                            console.log(`[${torrent.site}] A torrent within ${menu_value} MiB of ${ptp_format_size} already exists:\n${torrent.datasetRelease}\n${torrent.torrent_page}`);
                        }
                        return;
                    }
                }
                const element_size = get_element_size(torrent.size);

                if (api_sized !== undefined && api_sized !== null) {
                    api_sized = api_sized.toLocaleString() + " Bytes";
                }

                cln.querySelector(".size-span").textContent = ptp_format_size;

                const byteSizedTrackers = ["BLU", "Aither", "RFX", "OE", "HUNO", "TIK", "TVV", "BHD", "HDB", "NBL", "BTN", "MTV", "LST", "ANT", "RTF", "AvistaZ", "CinemaZ", "PHD", "TL"];
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
                        //dom_path.style.color = "#111";
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
                            //dom_path.style.color = "#111";
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
                    //dom_path.style.color = "#111";
                } else if (current_status === "include") {
                    filters.trackers.find(e => e.name === value).status = "exclude";
                    dom_path.style.background = "#920000";
                    //dom_path.style.color = "#eee";
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
                    //dom_path.style.color = "#111";
                } else if (current_status === "include") {
                    filters.discounts.find(e => e.name === value).status = "exclude";
                    dom_path.style.background = "#920000";
                    //dom_path.style.color = "#eee";
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
                    //dom_path.style.color = "#111";
                } else if (current_status === "include") {
                    filters.qualities.find(e => e.name === value).status = "exclude";
                    dom_path.style.background = "#920000";
                    //dom_path.style.color = "#eee";
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
            const filterboxlocationMap = {
                "Above": ".box_albumart",
                "Below": "#movieinfo",
                "Torrents": "#torrent-table",
            };

            const addBeforeThis = document.querySelector(filterboxlocationMap[filterboxlocation] || "#movieinfo");

            let div = document.createElement("div");
            div.className = "panel__body";
            div.style.padding = "0 10px 5px 10px";
            div.style.display = GM_config.get('filterhidden') ? "none" : "block";

            // Filter by tracker section
            let filterByTracker = document.createElement("div");
            filterByTracker.style = "display: flex; align-items: baseline";
            filterByTracker.style.margin = "4px 0";

            let label = document.createElement("div");
            label.textContent = "Tracker: ";
            label.style.cursor = "default";
            label.style.flex = "0 0 60px";
            filterByTracker.appendChild(label);

            let trackerContents = document.createElement("div");
            trackers.forEach((tracker_name) => {
                let div = document.createElement("div");
                div.id = `filter-${tracker_name.toLowerCase()}`;
                div.className = "filter-box";
                div.textContent = tracker_name;
                div.style.padding = "2px 5px";
                div.style.margin = "3px";
                //div.style.color = "#eee";
                div.style.display = "inline-block";
                div.style.cursor = "pointer";
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

            // Filter by discount section
            let additional_settings = document.createElement("div");
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
                //only_discount.style.color = "#eee";
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

            // Filter by quality section
            let filterByQuality = document.createElement("div");
            filterByQuality.style = "display: flex; align-items: baseline";
            filterByQuality.style.margin = "4px 0";

            let label_3 = document.createElement("div");
            label_3.textContent = "Quality: ";
            label_3.style.cursor = "default";
            label_3.style.flex = "0 0 60px";
            filterByQuality.appendChild(label_3);

            let qualityContents = document.createElement("div");
            qualities.forEach((quality_name) => {
                let quality = document.createElement("div");
                quality.className = "filter-box";
                quality.textContent = quality_name;
                quality.style.padding = "2px 5px";
                quality.style.margin = "3px";
                //quality.style.color = "#eee";
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

            // Search box
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

            // Reset button
            let rst = document.createElement("div");
            rst.textContent = "⟳";
            rst.style.padding = "4px 8px";
            rst.style.margin = "0px 4px";
            //rst.style.color = "#eee";
            rst.style.display = "inline-block";
            rst.style.cursor = "pointer";
            rst.style.border = "1px dashed #606060";
            rst.style.fontSize = "1em";
            rst.style.textAlign = "center";

            rst.addEventListener("click", () => {
                document.querySelector(".torrent-search").value = "";
                filters = {
                    "trackers": trackers.map((e) => {
                        return { "name": e, "status": "default" };
                    }),
                    "discounts": discounts.map((e) => {
                        return { "name": e, "status": "default" };
                    }),
                    "qualities": qualities.map((e) => {
                        return { "name": e, "status": "default" };
                    }),
                };

                filter_torrents();

                document.querySelectorAll(".filter-box").forEach(d => {
                    d.style.background = "";
                    //d.style.color = "#eee";
                });
            });
            filterByText.appendChild(rst);

            div.appendChild(filterByText);

            // Panel setup
            const panel = document.createElement("div");
            panel.className = "panel";
            const panelHeading = document.createElement("div");
            panelHeading.className = "panel__heading";
            panelHeading.style.cursor = "pointer"; // Make the header clickable

            const panelHeadingTitle = document.createElement("span");
            panelHeadingTitle.textContent = "Filter Releases";
            panelHeadingTitle.className = "panel__heading__title";
            panelHeading.append(panelHeadingTitle);

            // Toggle functionality
            panelHeading.addEventListener("click", () => {
                let isHidden = div.style.display === "none";
                div.style.display = isHidden ? "block" : "none";
                GM_config.set('filterhidden', !isHidden);
            });

            panel.append(panelHeading, div);
            addBeforeThis.insertAdjacentElement("beforeBegin", panel);
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
            //span.style.marginLeft = "12px";
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
                else if (q === "720p") arr.push({ "value": 3, "name": q });
                else if (q === "1080p") arr.push({ "value": 4, "name": q });
                else if (q === "2160p") arr.push({ "value": 5, "name": q });

            });

            return arr.sort((a, b) => (a.value > b.value) ? 1 : -1).map(e => e.name);
        };

        const get_sorted_discounts = (discounts, simplediscounts) => {
            let arr = [];

            discounts.forEach(q => {
                if (q === "None") arr.push({ "value": 0, "name": q });
                else if (q === "Rescuable") arr.push({ "value": 1, "name": q });
                else if (q === "Rescue") arr.push({ "value": 1, "name": q });
                else if (q === "Rewind") arr.push({ "value": 2, "name": q });
                else if (q === "Refundable") arr.push({ "value": 3, "name": q });
                else if (q === "Refund") arr.push({ "value": 3, "name": q });
                else if (q === "25% Freeleech") arr.push({ "value": 4, "name": q });
                else if (q === "25%") arr.push({ "value": 4, "name": q });
                else if (q === "Copper") arr.push({ "value": 5, "name": q });
                else if (q === "30% Bonus") arr.push({ "value": 6, "name": q });
                else if (q === "30%") arr.push({ "value": 6, "name": q });
                else if (q === "40% Bonus") arr.push({ "value": 7, "name": q });
                else if (q === "40%") arr.push({ "value": 7, "name": q });
                else if (q === "50% Freeleech") arr.push({ "value": 8, "name": q });
                else if (q === "50%") arr.push({ "value": 8, "name": q });
                else if (q === "Bronze") arr.push({ "value": 9, "name": q });
                else if (q === "75% Freeleech") arr.push({ "value": 10, "name": q });
                else if (q === "75%") arr.push({ "value": 10, "name": q });
                else if (q === "Silver") arr.push({ "value": 11, "name": q });
                else if (q === "Freeleech") arr.push({ "value": 12, "name": q });
                else if (q === "FL") arr.push({ "value": 12, "name": q });
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

        // Function to get TVmaze ID
        function getTvmazeId() {
            return new Promise((resolve, reject) => {
                // Add event listener for TVmaze ID
                const onTvmazeIdFetched = (event) => {
                    const { tvmazeId } = event.detail;
                    resolve(tvmazeId);
                    cleanup();
                };

                // Add event listener for TVmaze ID fetch errors
                const onTvmazeIdFetchError = (event) => {
                    const { message } = event.detail;
                    reject(new Error(message));
                    cleanup();
                };

                // Cleanup function to remove event listeners
                const cleanup = () => {
                    clearTimeout(timeoutId);
                    document.removeEventListener('tvmazeIdFetched', onTvmazeIdFetched);
                    document.removeEventListener('tvmazeIdFetchError', onTvmazeIdFetchError);
                };

                document.addEventListener('tvmazeIdFetched', onTvmazeIdFetched);
                document.addEventListener('tvmazeIdFetchError', onTvmazeIdFetchError);

                // Set a timeout to reject the promise if neither event is triggered
                const timeoutId = setTimeout(() => {
                    reject(new Error("TVmaze ID fetch timed out."));
                    cleanup();
                }, 2000); // Adjusted timeout to 10 seconds for better reliability
            });
        }

        // Function to wait for TVmaze ID with a timeout
        async function waitForTvmazeId() {
            try {
                const tvmazeId = await getTvmazeId();
                return tvmazeId;
            } catch (error) {
                console.log('TVmaze error:', error.message);
                return null;
            }
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

            let tvmazeId;
            if (trackers.includes("NBL")) {
                try {
                    tvmazeId = await waitForTvmazeId();
                    if (tvmazeId) {
                        console.log(`TVmaze ID is ${tvmazeId}`);
                    } else {
                        console.log('TVmaze ID not found yet.');
                    }
                } catch (error) {
                    console.log('TVmaze error:', error.message);
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
            trackers.forEach(t => promises.push(fetch_tracker(t, imdb_id, show_name, show_nbl_name, tvdbId, tvmazeId)));
            Promise.all(promises)
                .then(torrents_lists => {
                    var all_torrents = [].concat.apply([], torrents_lists).sort((a, b) => a.size < b.size ? 1 : -1);
                    add_external_torrents(all_torrents);
                    //document.querySelectorAll(".basic-movie-list__torrent__action").forEach(d => { d.style.marginLeft = "12px"; });
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