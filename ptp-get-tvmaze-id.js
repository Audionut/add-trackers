// ==UserScript==
// @name       PTP - Get TVmaze ID from IMDb ID
// @version    1.4
// @description Fetch TVmaze ID using IMDb ID on PTP torrent pages and return the result via a Promise.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant      GM_xmlHttpRequest
// ==/UserScript==

'use strict';

// Function to get the PTP ID from the URL
function getPtpId() {
    return new URL(window.location.href).searchParams.get("id");
}

// Function to get the IMDb ID from the page
function getImdbId() {
    const imdbLinkElement = document.getElementById("imdb-title-link");
    if (!imdbLinkElement) {
        console.warn("No IMDb ID found, aborting.");
        return null;
    }
    return imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
}

// Function to construct the TVmaze URL
function constructTvmazeUrl(imdbId) {
    return `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`;
}

// Function to parse the TVmaze response
function parseTvmazeResponse(response) {
    const data = JSON.parse(response.responseText);
    if (data && data.id) {
        return data.id;
    } else {
        console.error("TVmaze ID not found in response.");
        throw new Error("TVmaze ID not found in response.");
    }
}

// Function to fetch TV show information from TVmaze
function fetchTvmazeData(tvmazeUrl) {
    return new Promise((resolve, reject) => {
        GM_xmlHttpRequest({
            method: "GET",
            url: tvmazeUrl,
            timeout: 10000,
            onload: function(response) {
                try {
                    const tvmazeId = parseTvmazeResponse(response);
                    resolve(tvmazeId);
                } catch (error) {
                    reject(error.message);
                }
            },
            onerror: () => reject("Failed to fetch TVmaze data.")
        });
    });
}

// Main function to get TVmaze ID
async function getTvmazeId() {
    const ptpId = getPtpId();
    const imdbId = getImdbId();
    if (!imdbId) {
        throw new Error("No IMDb ID found.");
    }
    const tvmazeUrl = constructTvmazeUrl(imdbId);
    return await fetchTvmazeData(tvmazeUrl);
}

// Export function for use in another script
window.getTvmazeId = getTvmazeId;