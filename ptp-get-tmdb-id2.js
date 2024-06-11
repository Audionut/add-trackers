// ==UserScript==
// @name       PTP - Get TVDB ID from IMDb ID
// @version    1.2
// @description Fetch TVDB ID using IMDb ID on PTP torrent pages and dispatch an event with the result.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM_xmlHttpRequest
// @grant      GM.registerMenuCommand
// ==/UserScript==

'use strict';

// Function to prompt for API key
function promptForApiKey() {
    const apiKey = prompt("Please enter your TMDB API key:", "");
    if (apiKey) {
        localStorage.setItem('tmdb_api_key', apiKey);
    }
    return apiKey;
}

// Function to get the API key from localStorage or prompt for it
function getApiKey() {
    let apiKey = localStorage.getItem('tmdb_api_key');
    if (!apiKey) {
        apiKey = promptForApiKey();
    }
    return apiKey;
}

// TMDB API configuration
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/find/';
const TMDB_EXTERNAL_IDS_URL = 'https://api.themoviedb.org/3/';

// Function to store TVDB ID and dispatch event
function storeTvdbIdAndDispatchEvent(ptpId, tvdbId) {
    localStorage.setItem(`tvdb_id_${ptpId}`, tvdbId);
    const event = new CustomEvent('tvdbIdFetched', { detail: { ptpId, tvdbId } });
    document.dispatchEvent(event);
}

// Function to fetch TVDB ID using TMDB ID
function fetchTvdbIdFromTmdb(apiKey, tmdbId, ptpId, mediaType) {
    const url = `${TMDB_EXTERNAL_IDS_URL}${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`;

    GM_xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.tvdb_id) {
                storeTvdbIdAndDispatchEvent(ptpId, data.tvdb_id);
            } else {
                console.error("TVDB ID not found in TMDB external IDs response.");
            }
        },
        onerror: function() {
            console.error("Failed to fetch TVDB ID from TMDB API.");
        }
    });
}

// Function to fetch TMDB ID using IMDb ID
function fetchTmdbId(apiKey, imdbId, ptpId) {
    const url = `${TMDB_SEARCH_URL}${imdbId}?external_source=imdb_id&api_key=${apiKey}`;

    GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.movie_results && data.movie_results.length > 0) {
                const tmdbId = data.movie_results[0].id;
                fetchTvdbIdFromTmdb(apiKey, tmdbId, ptpId, 'movie');
            } else if (data && data.tv_results && data.tv_results.length > 0) {
                const tmdbId = data.tv_results[0].id;
                fetchTvdbIdFromTmdb(apiKey, tmdbId, ptpId, 'tv');
            } else {
                console.error("TMDB ID not found in response.");
            }
        },
        onerror: function() {
            console.error("Failed to fetch TMDB ID from TMDB API.");
        }
    });
}

// Add menu command to set API key
GM.registerMenuCommand("Set TMDB API Key", promptForApiKey);

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
        fetchTmdbId(apiKey, imdbId, ptpId);
    }
})();