// ==UserScript==
// @name       PTP - Get TVmaze ID from IMDb ID
// @version    1.1
// @description Fetch TVmaze ID using IMDb ID on PTP torrent pages and return the result via a Promise.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM.xmlHttpRequest
// ==/UserScript==

'use strict';

// Function to get TVmaze ID
function getTvmazeId() {
    return new Promise((resolve, reject) => {
        // Get PTP ID
        const ptpId = new URL(window.location.href).searchParams.get("id");

        // Get IMDb URL
        const imdbLinkElement = document.getElementById("imdb-title-link");
        if (!imdbLinkElement) {
            console.warn("No IMDb ID found, aborting.");
            reject("No IMDb ID found.");
            return;
        }

        const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
        const tvmazeUrl = `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`;

        // Parse TVmaze response
        function parseTvmazeResponse(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.id) {
                resolve(data.id);
            } else {
                console.error("TVmaze ID not found in response.");
                reject("TVmaze ID not found in response.");
            }
        }

        // Fetch TV show information from TVmaze
        GM.xmlHttpRequest({
            method: "GET",
            url: tvmazeUrl,
            timeout: 10000,
            onload: parseTvmazeResponse,
            onerror: () => {
                console.error("Failed to fetch TVmaze data.");
                reject("Failed to fetch TVmaze data.");
            }
        });
    });
}

// Export function for use in another script
window.getTvmazeId = getTvmazeId;