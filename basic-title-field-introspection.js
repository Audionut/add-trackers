// ==UserScript==
// @name         iMDB field Introspection
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.3
// @description  Run iMDB queries and introspect the IMDb API for Runtime type
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    // Helper: get IMDb ID from the page
    function getImdbId() {
        const link = document.querySelector("a#imdb-title-link.rating");
        if (!link) return null;
        const imdbUrl = link.getAttribute("href");
        if (!imdbUrl) return null;
        const imdbId = imdbUrl.split("/")[4];
        return imdbId || null;
    }

    // Fetch TitleKeyword details for a given IMDb ID
    function fetchTitleKeywords(imdbId) {
        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                {
                    title(id: "${imdbId}") {
                        keywords(first: 10) {
                            edges {
                                node {
                                    interestScore {
                                        score
                                    }
                                    itemCategory {
                                        text
                                    }
                                    keyword {
                                        text
                                    }
                                    legacyId
                                }
                            }
                        }
                    }
                }
            `
        };

        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify(query),
            onload: function (response) {
                if (response.status >= 200 && response.status < 300) {
                    const data = JSON.parse(response.responseText);
                    console.log("IMDb TitleKeyword details:", data);
                    // You can process and display the data here as needed
                } else {
                    console.error("Failed to fetch TitleKeyword data", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    }

    // Main
    const imdbId = getImdbId();
    if (imdbId) {
        fetchTitleKeywords(imdbId);
    } else {
        console.error("IMDb ID not found on page.");
    }
})();
