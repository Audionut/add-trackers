// ==UserScript==
// @name       PTP - Get TVDB ID from IMDb ID using Wikidata
// @version    1.0
// @description Fetch TVDB ID using IMDb ID on PTP torrent pages and dispatch an event with the result using Wikidata.
// @match      https://passthepopcorn.me/torrents.php?*id=*
// @namespace  https://github.com/Audionut
// @grant      GM.xmlHttpRequest
// @grant      GM.registerMenuCommand
// @grant      GM.setValue
// @grant      GM.getValue
// ==/UserScript==

'use strict';

// Function to store TVDB ID and dispatch event
function storeTvdbIdAndDispatchEvent(ptpId, tvdbId) {
    GM.setValue(`tvdb_id_${ptpId}`, tvdbId);
    const event = new CustomEvent('tvdbIdFetched', { detail: { ptpId, tvdbId } });
    document.dispatchEvent(event);
}

// Function to handle configuration errors
function handleConfigError(message) {
    console.error(message);
    const event = new CustomEvent('tvdbIdFetchError', { detail: { message } });
    document.dispatchEvent(event);
}

// Function to fetch TVDB ID using Wikidata
function fetchTvdbIdFromWikidata(imdbId, ptpId) {
    const query = `
        SELECT ?item ?itemLabel ?tvdbID WHERE {
          ?item wdt:P345 "${imdbId}" .
          ?item wdt:P4835 ?tvdbID .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
    `;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

    GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            if (data && data.results && data.results.bindings.length > 0) {
                const tvdbId = data.results.bindings[0].tvdbID.value;
                storeTvdbIdAndDispatchEvent(ptpId, tvdbId);
            } else {
                const event = new CustomEvent('tvdbIdFetchError', { detail: { message: "TVDB ID not found in Wikidata response." } });
                document.dispatchEvent(event);
            }
        },
        onerror: function() {
            const event = new CustomEvent('tvdbIdFetchError', { detail: { message: "Failed to fetch TVDB ID from Wikidata." } });
            document.dispatchEvent(event);
        }
    });
}

// Initialize script
(function init() {
    const ptpId = new URL(window.location.href).searchParams.get("id");

    const imdbLinkElement = document.getElementById("imdb-title-link");
    if (!imdbLinkElement) {
        return;
    }

    const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
    if (imdbId) {
        fetchTvdbIdFromWikidata(imdbId, ptpId);
    } else {
        handleConfigError("IMDb ID not found.");
    }
})();