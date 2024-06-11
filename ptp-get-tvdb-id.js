// ==UserScript==
// @name       PTP - Get TVDB ID from IMDb ID
// @version    1.1
// @description Fetch TVDB ID using IMDb ID on PTP torrent pages and dispatch an event with the result.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM.xmlHttpRequest
// ==/UserScript==

'use strict';

// Function to prompt for API key
function promptForApiKey() {
    const apiKey = prompt("Please enter your TVDB API key:", "");
    if (apiKey) {
        localStorage.setItem('tvdb_api_key', apiKey);
    }
    return apiKey;
}

// Function to get the API key from localStorage or prompt for it
function getApiKey() {
    let apiKey = localStorage.getItem('tvdb_api_key');
    if (!apiKey) {
        apiKey = promptForApiKey();
    }
    return apiKey;
}

// TVDB API configuration
const TVDB_LOGIN_URL = 'https://api.thetvdb.com/login';
const TVDB_SEARCH_URL = 'https://api.thetvdb.com/search/series?imdbId=';

// Function to get JWT token from TVDB
function getTvdbToken(apiKey, callback) {
    const loginData = {
        apikey: apiKey,
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

// Add menu command to set API key
GM_registerMenuCommand("Set TVDB API Key", promptForApiKey);

// Initialize script
(function init() {
    const ptpId = new URL(window.location.href).searchParams.get("id");

    const imdbLinkElement = document.getElementById("imdb-title-link");
    if (!imdbLinkElement) {
        console.warn("No IMDb ID found, aborting.");
        return;
    }

    const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
    const apiKey = getApiKey();

    if (apiKey) {
        getTvdbToken(apiKey, function(token) {
            fetchTvdbId(token, imdbId, ptpId);
        });
    }
})();