// ==UserScript==
// @name       PTP - Get TVDB ID from IMDb ID using Sonarr API
// @version    1.0
// @description Fetch TVDB ID using IMDb ID on PTP torrent pages and dispatch an event with the result using Sonarr API.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM.xmlHttpRequest
// ==/UserScript==

'use strict';

// Function to prompt for Sonarr API key and URL
function promptForSonarrConfig() {
    const apiKey = prompt("Please enter your Sonarr API key:", "");
    const apiUrl = prompt("Please enter your Sonarr URL:", "http://localhost:8989");
    if (apiKey && apiUrl) {
        localStorage.setItem('sonarr_api_key', apiKey);
        localStorage.setItem('sonarr_api_url', apiUrl);
    }
    return { apiKey, apiUrl };
}

// Function to get Sonarr config from localStorage or prompt for it
function getSonarrConfig() {
    let apiKey = localStorage.getItem('sonarr_api_key');
    let apiUrl = localStorage.getItem('sonarr_api_url');
    if (!apiKey || !apiUrl) {
        const config = promptForSonarrConfig();
        apiKey = config.apiKey;
        apiUrl = config.apiUrl;
    }
    return { apiKey, apiUrl };
}

// Function to store TVDB ID and dispatch event
function storeTvdbIdAndDispatchEvent(ptpId, tvdbId) {
    localStorage.setItem(`tvdb_id_${ptpId}`, tvdbId);
    const event = new CustomEvent('tvdbIdFetched', { detail: { ptpId, tvdbId } });
    document.dispatchEvent(event);
}

// Function to fetch TVDB ID using Sonarr API
function fetchTvdbIdFromSonarr(apiKey, apiUrl, imdbId, ptpId) {
    const url = `${apiUrl}/api/v3/series/lookup?term=imdb:${imdbId}`;

    GM.xmlHttpRequest({
        method: "GET",
        url: url,
        headers: {
            "X-Api-Key": apiKey
        },
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.length > 0 && data[0].tvdbId) {
                const tvdbId = data[0].tvdbId;
                storeTvdbIdAndDispatchEvent(ptpId, tvdbId);
            } else {
                console.error("TVDB ID not found in Sonarr response.");
            }
        },
        onerror: function() {
            console.error("Failed to fetch TVDB ID from Sonarr API.");
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
    const { apiKey, apiUrl } = getSonarrConfig();

    if (apiKey && apiUrl) {
        fetchTvdbIdFromSonarr(apiKey, apiUrl, imdbId, ptpId);
    }
})();