// ==UserScript==
// @name       PTP - Get TVmaze ID from IMDb ID
// @version    1.1
// @description Fetch TVmaze ID using IMDb ID on PTP torrent pages and dispatch an event with the result.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM.xmlHttpRequest
// ==/UserScript==

'use strict';

// Get PTP ID
const ptpId = new URL(window.location.href).searchParams.get("id");

// Get IMDb URL
const imdbLinkElement = document.getElementById("imdb-title-link");
if (!imdbLinkElement) {
    console.warn("No IMDb ID found, aborting.");
    return;
}
const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
const tvmazeUrl = `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`;

// Function to dispatch event with TVmaze ID
function dispatchTvmazeEvent(tvmazeId) {
    const event = new CustomEvent('tvmazeIdFetched', { detail: { ptpId, tvmazeId } });
    document.dispatchEvent(event);
}

// Parse TVmaze response
function parseTvmazeResponse(response) {
    const data = JSON.parse(response.responseText);
    if (data && data.id) {
        waitForMainScript(() => {
            dispatchTvmazeEvent(data.id);
        });
    } else {
        console.error("TVmaze ID not found in response.");
    }
}

// Fetch TV show information from TVmaze
function fetchTvmazeData() {
    GM.xmlHttpRequest({
        method: "GET",
        url: tvmazeUrl,
        timeout: 10000,
        onload: parseTvmazeResponse,
        onerror: () => console.error("Failed to fetch TVmaze data."),
    });
}

// Function to wait for the main script to be ready
function waitForMainScript(callback) {
    if (document.readyState === "complete") {
        callback();
    } else {
        setTimeout(() => waitForMainScript(callback), 100); // Adjust the interval as needed
    }
}

// Initialize script
(function init() {
    fetchTvmazeData();
})();