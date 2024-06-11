// ==UserScript==
// @name       PTP - Get TVDB ID from IMDb ID
// @version    1.0
// @description Fetch TVDB ID using IMDb ID on PTP torrent pages and dispatch an event with the result.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM.xmlHttpRequest
// ==/UserScript==

'use strict';

// TVDB API configuration
const TVDB_API_KEY = 'YOUR_TVDB_API_KEY';
const TVDB_LOGIN_URL = 'https://api.thetvdb.com/login';
const TVDB_SEARCH_URL = 'https://api.thetvdb.com/search/series?imdbId=';

// Function to get JWT token from TVDB
function getTvdbToken(callback) {
    const loginData = {
        apikey: TVDB_API_KEY,
    };

    GM.xmlHttpRequest({
        method: "POST",
        url: TVDB_LOGIN_URL,
        data: JSON.stringify(loginData),
        headers: {
            "Content-Type": "application/json"
        },
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.token) {
                callback(data.token);
            } else {
                console.error("Failed to retrieve TVDB token.");
            }
        },
        onerror: function() {
            console.error("Failed to login to TVDB.");
        }
    });
}

// Function to store TVDB ID and dispatch event
function storeTvdbIdAndDispatchEvent(ptpId, tvdbId) {
    localStorage.setItem(`tvdb_id_${ptpId}`, tvdbId);
    const event = new CustomEvent('tvdbIdFetched', { detail: { ptpId, tvdbId } });
    document.dispatchEvent(event);
}

// Function to fetch TVDB ID using IMDb ID
function fetchTvdbId(token, imdbId, ptpId) {
    const url = `${TVDB_SEARCH_URL}${imdbId}`;

    GM.xmlHttpRequest({
        method: "GET",
        url: url,
        headers: {
            "Authorization": `Bearer ${token}`
        },
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.data && data.data.length > 0 && data.data[0].id) {
                const tvdbId = data.data[0].id;
                storeTvdbIdAndDispatchEvent(ptpId, tvdbId);
            } else {
                console.error("TVDB ID not found in response.");
            }
        },
        onerror: function() {
            console.error("Failed to fetch TVDB ID from TVDB API.");
        }
    });
}

// Initialize script
(function init() {
    const ptpId = new URL(window.location.href).searchParams.get("id");

    const imdbLinkElement = document.getElementById("imdb-title-link");
    if (!imdbLinkElement) {
        console.warn("No IMDb ID found, aborting.");
        return;
    }

    const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];

    getTvdbToken(function(token) {
        fetchTvdbId(token, imdbId, ptpId);
    });
})();