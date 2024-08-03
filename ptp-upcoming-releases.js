// ==UserScript==
// @name         PTP upcoming releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Get a list of upcoming releases from IMDB.
// @author       Audionut
// @match        https://passthepopcorn.me/upcoming.php*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-upcoming-releases.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-upcoming-releases.js
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY = 'comingSoonData';
    const CACHE_EXPIRATION_KEY = 'comingSoonDataExpiration';
    const NAME_IMAGES_CACHE_KEY = 'nameImagesData';
    const CURRENT_PAGE_KEY = 'currentPage';
    const RESULTS_PER_PAGE = 20;

    const clearCache = () => {
        GM_setValue(CACHE_KEY, null);
        GM_setValue(CACHE_EXPIRATION_KEY, 0);
        GM_setValue(NAME_IMAGES_CACHE_KEY, null);
        GM_setValue(CURRENT_PAGE_KEY, 1);
    };

    const fetchComingSoonData = async () => {
        const url = `https://api.graphql.imdb.com/`;
        const today = new Date().toISOString().split('T')[0];
        const comingSoonQuery = {
            query: `
                query {
                    comingSoon(
                        comingSoonType: MOVIE,
                        first: 45,
                        releasingOnOrAfter: "${today}",
                        sort: {sortBy: RELEASE_DATE, sortOrder: ASC}
                    ) {
                        edges {
                            node {
                                id
                                titleText {
                                    text
                                }
                                releaseDate {
                                    day
                                    month
                                    year
                                }
                                plot {
                                    plotText {
                                        plainText
                                    }
                                }
                                genres {
                                    genres {
                                        text
                                    }
                                }
                                primaryImage {
                                    url
                                    width
                                    height
                                    caption {
                                        plainText
                                    }
                                }
                                credits(first: 10) {
                                    edges {
                                        node {
                                            name {
                                                id
                                                nameText {
                                                    text
                                                }
                                            }
                                            category {
                                                id
                                                text
                                            }
                                            title {
                                                id
                                                titleText {
                                                    text
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        pageInfo {
                            endCursor
                            hasNextPage
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
            data: JSON.stringify(comingSoonQuery),
            onload: async function (response) {
                if (response.status >= 200 && response.status < 300) {
                    const comingSoonData = JSON.parse(response.responseText);
                    console.log("Coming Soon data:", comingSoonData);

                    if (!comingSoonData.data || !comingSoonData.data.comingSoon || comingSoonData.data.comingSoon.edges.length === 0) {
                        console.log("No more data available or received empty data.");
                        return;
                    }

                    const edges = comingSoonData.data.comingSoon.edges;
                    const cachedData = { edges: edges };
                    GM_setValue(CACHE_KEY, cachedData);
                    GM_setValue(CACHE_EXPIRATION_KEY, Date.now() + 24 * 60 * 60 * 1000);

                    const nameIds = [];
                    cachedData.edges.forEach(edge => {
                        edge.node.credits.edges.forEach(credit => {
                            nameIds.push(credit.node.name.id);
                        });
                    });

                    const primaryImageUrls = await fetchPrimaryImageUrls(nameIds);
                    GM_setValue(NAME_IMAGES_CACHE_KEY, primaryImageUrls);

                    displayResults(1);
                } else {
                    console.error("Failed to fetch coming soon data", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    const fetchPrimaryImageUrls = async (nameIds) => {
        const url = `https://api.graphql.imdb.com/`;
        const queries = [];

        // Split the nameIds into chunks of 250
        for (let i = 0; i < nameIds.length; i += 250) {
            const chunk = nameIds.slice(i, i + 250);
            queries.push({
                query: `
                    query {
                        names(ids: ${JSON.stringify(chunk)}) {
                            id
                            nameText {
                                text
                            }
                            primaryImage {
                                url
                            }
                        }
                    }
                `
            });
        }

        const results = await Promise.all(queries.map(query =>
            new Promise((resolve, reject) => {
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
                            console.log("Primary Image URLs data:", data); // Log the response for debugging
                            if (data && data.data && data.data.names) {
                                resolve(data.data.names);
                            } else {
                                reject(new Error("Invalid response structure for primary image URLs"));
                            }
                        } else {
                            reject(new Error("Failed to fetch primary image URLs"));
                        }
                    },
                    onerror: function (response) {
                        reject(new Error("Request error"));
                    }
                });
            })
        ));

        // Flatten the results array
        return results.flat();
    };

    const displayResults = (page) => {
        const cachedData = GM_getValue(CACHE_KEY);
        const nameImagesData = GM_getValue(NAME_IMAGES_CACHE_KEY);
        if (!cachedData || !cachedData.edges || !nameImagesData) {
            console.log("No cached data available");
            fetchComingSoonData(); // Fetch fresh data if no cached data is available
            return;
        }

        const totalResults = cachedData.edges.length;
        const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);

        // Ensure the page is within the valid range
        page = Math.max(1, Math.min(page, totalPages));

        const startIndex = (page - 1) * RESULTS_PER_PAGE;
        const endIndex = startIndex + RESULTS_PER_PAGE;
        const pageData = cachedData.edges.slice(startIndex, endIndex);

        console.log(`Displaying results for page ${page}`);
        console.log(`Showing results from ${startIndex} to ${endIndex}`);
        console.log("Page data length:", pageData.length);

        const container = document.querySelector("#torrents-movie-view > div");
        container.innerHTML = ""; // Clear previous results

        const groupedByDate = pageData.reduce((acc, movie) => {
            const releaseDate = movie.node.releaseDate;
            if (!releaseDate) {
                console.log("Skipping movie due to missing release date:", movie);
                return acc;
            }
            const dateStr = new Date(`${releaseDate.year}-${releaseDate.month}-${releaseDate.day}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(movie);
            return acc;
        }, {});

        console.log("Grouped by date:", groupedByDate);

        for (const [date, movies] of Object.entries(groupedByDate)) {
            const dateHeader = document.createElement("h2");
            dateHeader.textContent = date;
            dateHeader.style.fontSize = "1.5em";
            dateHeader.style.color = "white";
            container.appendChild(dateHeader);

            movies.forEach(movie => {
                const node = movie.node;
                const movieDiv = document.createElement("div");
                movieDiv.style.border = "1px solid #ccc";
                movieDiv.style.padding = "10px";
                movieDiv.style.marginBottom = "10px";
                movieDiv.style.display = "flex";

                const imageLink = document.createElement("a");
                imageLink.href = `https://passthepopcorn.me/requests.php?search=${node.id}`;
                const image = document.createElement("img");
                image.src = node.primaryImage.url;
                image.alt = node.primaryImage.caption.plainText;
                image.style.maxWidth = "200px";
                image.style.marginRight = "10px";
                imageLink.appendChild(image);
                movieDiv.appendChild(imageLink);

                const infoDiv = document.createElement("div");
                infoDiv.style.flex = "1";

                const titleLink = document.createElement("a");
                titleLink.href = `https://www.imdb.com/title/${node.id}/`;
                titleLink.target = "_blank";
                titleLink.textContent = node.titleText.text;
                titleLink.style.fontWeight = "bold";
                titleLink.style.fontSize = "1.2em";
                titleLink.style.textDecoration = "none";
                titleLink.style.color = "white";
                titleLink.style.display = "block";
                titleLink.style.marginBottom = "10px";
                infoDiv.appendChild(titleLink);

                const plot = document.createElement("p");
                plot.textContent = node.plot.plotText.plainText;
                infoDiv.appendChild(plot);

                const genres = document.createElement("p");
                genres.textContent = "Genres: ";
                node.genres.genres.forEach(genre => {
                    const genreLink = document.createElement("a");
                    genreLink.href = `https://passthepopcorn.me/torrents.php?action=advanced&taglist=${genre.text}`;
                    genreLink.textContent = genre.text;
                    genreLink.style.color = "white";
                    genreLink.style.marginRight = "5px";
                    genres.appendChild(genreLink);
                });
                infoDiv.appendChild(genres);

                const castContainer = document.createElement("div");
                castContainer.style.display = "flex";
                castContainer.style.flexWrap = "wrap";
                castContainer.style.gap = "10px";

                let castCount = 0;
                node.credits.edges.forEach(credit => {
                    const castMember = nameImagesData.find(name => name.id === credit.node.name.id);
                    if (castMember && castMember.primaryImage && castCount < 5) {
                        castCount++;
                        const castDiv = document.createElement("div");
                        castDiv.style.textAlign = "center";
                        castDiv.style.width = "auto";

                        const castImageLink = document.createElement("a");
                        castImageLink.href = `https://passthepopcorn.me/artist.php?artistname=${credit.node.name.nameText.text}`;
                        const castImage = document.createElement("img");
                        castImage.src = castMember.primaryImage.url;
                        castImage.alt = credit.node.name.nameText.text;
                        castImage.style.maxHeight = "150px";
                        castImage.style.width = "auto";
                        castImage.style.display = "block";
                        castImageLink.appendChild(castImage);
                        castDiv.appendChild(castImageLink);

                        const castNameLink = document.createElement("a");
                        castNameLink.href = `https://www.imdb.com/name/${credit.node.name.id}/`;
                        castNameLink.target = "_blank";
                        castNameLink.textContent = credit.node.name.nameText.text;
                        castNameLink.style.display = "block";
                        castNameLink.style.textDecoration = "none";
                        castNameLink.style.color = "white";
                        castNameLink.style.marginTop = "10px";
                        castDiv.appendChild(castNameLink);

                        castContainer.appendChild(castDiv);
                    }
                });
                infoDiv.appendChild(castContainer);

                movieDiv.appendChild(infoDiv);
                container.appendChild(movieDiv);
            });
        }

        createPagination(page, cachedData.edges.length);
    };

    const createPagination = (currentPage, totalResults) => {
        const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
        console.log(`Creating pagination for page ${currentPage} with total results ${totalResults}`);
        console.log(`Total pages: ${totalPages}`);

        const paginationTop = document.querySelector(".pagination--top");
        const paginationBottom = document.querySelector(".pagination--bottom");

        const paginationContent = (page) => {
            let html = "";
            if (page > 1) {
                html += `<a href="#" class="prev-link" style="margin-right: 10px;">&lt; back</a>`;
            }
            if (page < totalPages) {
                html += `<a href="#" class="next-link" style="margin-left: 10px;">next &gt;</a>`;
            }
            return html;
        };

        paginationTop.innerHTML = paginationContent(currentPage);
        paginationBottom.innerHTML = paginationContent(currentPage);

        const prevLinks = document.querySelectorAll(".prev-link");
        const nextLinks = document.querySelectorAll(".next-link");

        prevLinks.forEach(link => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                const prevPage = Math.max(1, currentPage - 1);
                GM_setValue(CURRENT_PAGE_KEY, prevPage);
                displayResults(prevPage);
            });
        });

        nextLinks.forEach(link => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                const nextPage = Math.min(totalPages, currentPage + 1);
                GM_setValue(CURRENT_PAGE_KEY, nextPage);
                displayResults(nextPage);
            });
        });
    };

    const fetchPage = (page) => {
        const cachedData = GM_getValue(CACHE_KEY);
        if (cachedData && cachedData.edges.length > 0) {
            GM_setValue(CURRENT_PAGE_KEY, page);
            displayResults(page);
        } else {
            fetchComingSoonData();
        }
    };

    const init = () => {
        const currentPage = GM_getValue(CURRENT_PAGE_KEY, 1);
        const cacheExpiration = GM_getValue(CACHE_EXPIRATION_KEY, 0);
        const isCacheExpired = Date.now() > cacheExpiration;

        if (isCacheExpired) {
            //clearCache();
            console.log("Fetching fresh data for upcoming releases");
            fetchComingSoonData();
        } else {
            console.log("Using cached data for upcoming releases");
            const cachedData = GM_getValue(CACHE_KEY);
            const nameImagesData = GM_getValue(NAME_IMAGES_CACHE_KEY);
            if (cachedData && cachedData.edges.length > 0 && nameImagesData) {
                displayResults(currentPage);
            } else {
                fetchComingSoonData();
            }
        }
    };

    init();
})();