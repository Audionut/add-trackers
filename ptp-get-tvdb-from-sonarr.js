// ==UserScript==
// @name       PTP - Get TVDB ID from IMDb ID using Sonarr API
// @version    1.2
// @description Fetch TVDB ID using IMDb ID on PTP torrent pages and dispatch an event with the result using Sonarr API.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM.xmlHttpRequest
// @grant      GM.registerMenuCommand
// @grant      GM.setValue
// @grant      GM.getValue
// ==/UserScript==

'use strict';

// Function to prompt for Sonarr API key and URL
function promptForSonarrConfig() {
    const apiKey = prompt("Please enter your Sonarr API key:", "");
    const apiUrl = prompt("Please enter your Sonarr URL:", "http://localhost:8989");
    if (apiKey && apiUrl) {
        GM.setValue('sonarr_api_key', apiKey);
        GM.setValue('sonarr_api_url', apiUrl);
    }
    return { apiKey, apiUrl };
}

// Function to get Sonarr config from GM storage or prompt for it
async function getSonarrConfig() {
    let apiKey = await GM.getValue('sonarr_api_key');
    let apiUrl = await GM.getValue('sonarr_api_url');
    if (!apiKey || !apiUrl) {
        const config = promptForSonarrConfig();
        apiKey = config.apiKey;
        apiUrl = config.apiUrl;
    }
    return { apiKey, apiUrl };
}

// Function to store TVDB ID and dispatch event
function storeTvdbIdAndDispatchEvent(ptpId, tvdbId) {
    GM.setValue(`tvdb_id_${ptpId}`, tvdbId);
    const event = new CustomEvent('tvdbIdFetched', { detail: { ptpId, tvdbId } });
    document.dispatchEvent(event);
}

// Function to handle errors gracefully
function handleError(message) {
    console.error(message);
    const event = new CustomEvent('tvdbIdFetchError', { detail: { message } });
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
                handleError("TVDB ID not found in Sonarr response.");
            }
        },
        onerror: function() {
            handleError("Failed to fetch TVDB ID from Sonarr API.");
        }
    });
}

// Add menu command to set Sonarr API key and URL
GM.registerMenuCommand("Set Sonarr API Key and URL", promptForSonarrConfig);

// Initialize script
(async function init() {
    const ptpId = new URL(window.location.href).searchParams.get("id");

    const imdbLinkElement = document.getElementById("imdb-title-link");
    if (!imdbLinkElement) {
        handleError("No IMDb ID found, aborting.");
        return;
    }

    const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
    const { apiKey, apiUrl } = await getSonarrConfig();

    if (apiKey && apiUrl) {
        fetchTvdbIdFromSonarr(apiKey, apiUrl, imdbId, ptpId);
    } else {
        handleError("Sonarr API key and URL are not configured.");
    }
})();