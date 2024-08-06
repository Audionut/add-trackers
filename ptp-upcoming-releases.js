// ==UserScript==
// @name         PTP upcoming releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.2
// @description  Get a list of upcoming releases from IMDB and integrate with site search form.
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
    const RESULTS_PER_PAGE_KEY = 'resultsPerPage';
    const RESULTS_PER_PAGE_DEFAULT = 20;
    const MAX_RESULTS = 45;  // per API call - Maximum 45 per call
    const ALLOWED_GENRES = new Set([]); // Define your allowed genres here. ["Crime", "Drama", "Thriller"] for example.
    const LAYOUT_KEY = 'displayLayout';
    const LAYOUT_ORIGINAL = 'Original';
    const LAYOUT_CONDENSED = 'Condensed';
    const FILTERED_CACHE_KEY = 'filteredData';

    const clearCache = () => {
        GM_setValue(CACHE_KEY, null);
        GM_setValue(CACHE_EXPIRATION_KEY, 0);
        GM_setValue(NAME_IMAGES_CACHE_KEY, null);
        GM_setValue(CURRENT_PAGE_KEY, 1);
        GM_setValue(FILTERED_CACHE_KEY, null);
    };

    const fetchComingSoonData = async (afterDate = null) => {
        const url = `https://api.graphql.imdb.com/`;
        const today = new Date().toISOString().split('T')[0];
        const dateFilter = afterDate ? afterDate : today;
        const comingSoonQuery = {
            query: `
                query {
                    comingSoon(
                        comingSoonType: MOVIE,
                        first: ${MAX_RESULTS},
                        releasingOnOrAfter: "${dateFilter}",
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

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(comingSoonQuery),
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        const comingSoonData = JSON.parse(response.responseText);
                        console.log("Coming Soon data:", comingSoonData);

                        if (!comingSoonData.data || !comingSoonData.data.comingSoon || comingSoonData.data.comingSoon.edges.length === 0) {
                            console.log("No more data available or received empty data.");
                            resolve([]);
                            return;
                        }

                        const edges = comingSoonData.data.comingSoon.edges;
                        resolve(edges);
                    } else {
                        console.error("Failed to fetch coming soon data", response);
                        reject(response);
                    }
                },
                onerror: function (response) {
                    console.error("Request error", response);
                    reject(response);
                }
            });
        });
    };

    const fetchAllComingSoonData = async () => {
        let allEdges = [];
        let lastReleaseDate = null;

        while (true) {
            const newEdges = await fetchComingSoonData(lastReleaseDate ? lastReleaseDate : null);
            if (newEdges.length === 0) break;

            allEdges = allEdges.concat(newEdges);
            const lastEdge = newEdges[newEdges.length - 1];
            lastReleaseDate = `${lastEdge.node.releaseDate.year}-${String(lastEdge.node.releaseDate.month).padStart(2, '0')}-${String(lastEdge.node.releaseDate.day).padStart(2, '0')}`;

            if (newEdges.length < MAX_RESULTS) break;
        }

        const cachedData = { edges: allEdges };
        GM_setValue(CACHE_KEY, cachedData);
        GM_setValue(CACHE_EXPIRATION_KEY, Date.now() + 2 * 24 * 60 * 60 * 1000);

        const nameIds = [];
        cachedData.edges.forEach(edge => {
            edge.node.credits.edges.forEach(credit => {
                nameIds.push(credit.node.name.id);
            });
        });

        const primaryImageUrls = await fetchPrimaryImageUrls(nameIds);
        GM_setValue(NAME_IMAGES_CACHE_KEY, primaryImageUrls);

        displayResults(1);
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

    const displayResultsOriginal = (page, data) => {
        const nameImagesData = GM_getValue(NAME_IMAGES_CACHE_KEY);
        const resultsPerPage = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
        if (!data || !data.edges || !nameImagesData) {
            fetchAllComingSoonData(); // Fetch fresh data if no cached data is available
            return;
        }

        const totalResults = data.edges.length;
        const totalPages = Math.ceil(totalResults / resultsPerPage);

        // Ensure the page is within the valid range
        page = Math.max(1, Math.min(page, totalPages));

        const startIndex = (page - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        let pageData = data.edges.slice(startIndex, endIndex);

        if (ALLOWED_GENRES.size > 0) {
            pageData = pageData.filter(movie => {
                return movie.node.genres.genres.some(genre => ALLOWED_GENRES.has(genre.text));
            });
        }

        const container = document.querySelector("#torrents-movie-view > div");
        container.innerHTML = ""; // Clear previous results

        const groupedByDate = pageData.reduce((acc, movie) => {
            const releaseDate = movie.node.releaseDate;
            if (!releaseDate) return acc;
            const dateStr = new Date(`${releaseDate.year}-${String(releaseDate.month).padStart(2, '0')}-${String(releaseDate.day).padStart(2, '0')}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(movie);
            return acc;
        }, {});

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
                image.src = node.primaryImage && node.primaryImage.url ? node.primaryImage.url : 'https://ptpimg.me/w6l4kj.png';
                image.alt = node.primaryImage && node.primaryImage.caption ? node.primaryImage.caption.plainText : 'No image available';
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
                plot.textContent = node.plot ? node.plot.plotText.plainText : "No plot available.";
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

        createPagination(page, totalResults);
    };

    const displayResultsCondensed = (page, data) => {
        const nameImagesData = GM_getValue(NAME_IMAGES_CACHE_KEY);
        const resultsPerPage = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
        if (!data || !data.edges || !nameImagesData) {
            fetchAllComingSoonData(); // Fetch fresh data if no cached data is available
            return;
        }

        const totalResults = data.edges.length;
        const totalPages = Math.ceil(totalResults / resultsPerPage);

        // Ensure the page is within the valid range
        page = Math.max(1, Math.min(page, totalPages));

        const startIndex = (page - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        let pageData = data.edges.slice(startIndex, endIndex);

        if (ALLOWED_GENRES.size > 0) {
            pageData = pageData.filter(movie => {
                return movie.node.genres.genres.some(genre => ALLOWED_GENRES.has(genre.text));
            });
        }

        const container = document.querySelector("#torrents-movie-view > div");
        container.innerHTML = ""; // Clear previous results

        const groupedByDate = pageData.reduce((acc, movie) => {
            const releaseDate = movie.node.releaseDate;
            if (!releaseDate) return acc;
            const dateStr = new Date(`${releaseDate.year}-${String(releaseDate.month).padStart(2, '0')}-${String(releaseDate.day).padStart(2, '0')}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(movie);
            return acc;
        }, {});

        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";

        for (const [date, movies] of Object.entries(groupedByDate)) {
            const dateHeaderRow = document.createElement("tr");
            const dateHeader = document.createElement("th");
            dateHeader.colSpan = 2;
            dateHeader.textContent = date;
            dateHeader.style.fontSize = "1.5em";
            dateHeader.style.color = "white";
            dateHeader.style.backgroundColor = "#333";
            dateHeader.style.padding = "10px";
            dateHeaderRow.appendChild(dateHeader);
            table.appendChild(dateHeaderRow);

            for (let i = 0; i < movies.length; i += 2) {
                const row = document.createElement("tr");

                for (let j = 0; j < 2; j++) {
                    const movie = movies[i + j];
                    if (!movie) break;

                    const node = movie.node;
                    const cell = document.createElement("td");
                    cell.style.border = "1px solid #ccc";
                    cell.style.padding = "10px";
                    cell.style.verticalAlign = "top";

                    const movieDiv = document.createElement("div");
                    movieDiv.style.display = "flex";

                    const imageLink = document.createElement("a");
                    imageLink.href = `https://passthepopcorn.me/requests.php?search=${node.id}`;
                    const image = document.createElement("img");
                    image.src = node.primaryImage && node.primaryImage.url ? node.primaryImage.url : 'https://ptpimg.me/w6l4kj.png';
                    image.alt = node.primaryImage && node.primaryImage.caption ? node.primaryImage.caption.plainText : 'No image available';
                    image.style.maxWidth = "60px";
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
                    titleLink.style.marginBottom = "2px";
                    infoDiv.appendChild(titleLink);

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
                    cell.appendChild(movieDiv);
                    row.appendChild(cell);
                }

                table.appendChild(row);
            }
        }

        container.appendChild(table);

        createPagination(page, totalResults);
    };

    const createPagination = (currentPage, totalResults) => {
        const resultsPerPage = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
        const totalPages = Math.ceil(totalResults / resultsPerPage);

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

    const displayResults = (page) => {
        const layout = GM_getValue(LAYOUT_KEY, LAYOUT_ORIGINAL);
        const filteredData = GM_getValue(FILTERED_CACHE_KEY);
        const data = filteredData || GM_getValue(CACHE_KEY);
        if (layout === LAYOUT_ORIGINAL) {
            displayResultsOriginal(page, data);
        } else if (layout === LAYOUT_CONDENSED) {
            displayResultsCondensed(page, data);
        }
    };

    const handleSearchForm = () => {
        const searchForm = document.querySelector("#filter_torrents_form");
        if (searchForm) {
            searchForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const formData = new FormData(searchForm);
                const searchstr = formData.get("searchstr") || "";
                const taglist = formData.get("taglist") || "";
                const castlist = formData.get("castlist") || "";

                // Implement your search logic here
                // Filter cachedData based on search criteria and display the results
                const cachedData = GM_getValue(CACHE_KEY);
                if (cachedData && cachedData.edges) {
                    let filteredData = cachedData.edges;

                    if (searchstr) {
                        filteredData = filteredData.filter(movie => movie.node.titleText.text.toLowerCase().includes(searchstr.toLowerCase()));
                    }
                    if (taglist) {
                        const tags = taglist.split(',').map(tag => tag.trim().toLowerCase());
                        filteredData = filteredData.filter(movie => {
                            const movieTags = movie.node.genres.genres.map(genre => genre.text.toLowerCase());
                            return tags.every(tag => movieTags.includes(tag));
                        });
                    }
                    if (castlist) {
                        const casts = castlist.split(',').map(cast => cast.trim().toLowerCase());
                        filteredData = filteredData.filter(movie => {
                            const movieCasts = movie.node.credits.edges.map(credit => credit.node.name.nameText.text.toLowerCase());
                            return casts.every(cast => movieCasts.includes(cast));
                        });
                    }

                    if (!searchstr && !taglist && !castlist) {
                        filteredData = null; // Reset filtered data
                        GM_setValue(FILTERED_CACHE_KEY, null);
                        displayResults(1);
                        return;
                    }

                    GM_setValue(FILTERED_CACHE_KEY, { edges: filteredData });
                    displayResults(1);
                }
            });
        }
    };

    const init = () => {
        const currentPage = GM_getValue(CURRENT_PAGE_KEY, 1);
        const cacheExpiration = GM_getValue(CACHE_EXPIRATION_KEY, 0);
        const isCacheExpired = Date.now() > cacheExpiration;

        if (isCacheExpired) {
            clearCache();
            console.log("Fetching fresh data for upcoming movies");
            fetchAllComingSoonData();
        } else {
            console.log("Using cached data for upcoming movies");
            const cachedData = GM_getValue(CACHE_KEY);
            const nameImagesData = GM_getValue(NAME_IMAGES_CACHE_KEY);
            if (cachedData && cachedData.edges.length > 0 && nameImagesData) {
                displayResults(currentPage);
            } else {
                fetchAllComingSoonData();
            }
        }

        handleSearchForm();
        updateSearchForm();
    };

    // Function to remove IMDb and List search fields and update search link text
    const updateSearchForm = () => {
        const filterTorrentsToggle = document.getElementById("filter_torrents_toggle");
        if (filterTorrentsToggle) {
            filterTorrentsToggle.querySelector("a").textContent = "[+] Search and settings";
        }

        // Remove IMDb and List fields
        document.querySelectorAll(".filter_torrents .grid").forEach(grid => {
            const label = grid.querySelector(".form__label");
            if (label && (label.textContent.includes("IMDb:") || label.textContent.includes("List:"))) {
                grid.remove();
            }
        });

        // Rename "Tags:" to "Genres:"
        document.querySelectorAll(".form__label").forEach(label => {
            if (label.textContent.includes("Tags:")) {
                label.textContent = label.textContent.replace("Tags:", "Genres:");
            }
        });

        // Remove "0 results" field
        const resultsField = document.querySelector(".search-form__footer__results");
        if (resultsField) {
            resultsField.remove();
        }
        const emptyLabel = document.querySelector(".search-form__footer > .grid > .grid__item.grid-u-2-10");
        if (emptyLabel) {
            const table = document.createElement("label");
            table.classList.add("form__label");
            table.textContent = "Filtering:";
            emptyLabel.appendChild(table);
        }

        // Add layout toggle, results per page setting, and cast search to the search form
        const searchFormFooter = document.querySelector(".search-form__footer__buttons");
        if (searchFormFooter) {
            const layoutToggle = document.createElement("button");
            layoutToggle.textContent = "Toggle Layout";
            layoutToggle.type = "button";
            layoutToggle.style.marginLeft = "10px";
            searchFormFooter.appendChild(layoutToggle);

            layoutToggle.addEventListener("click", () => {
                const currentLayout = GM_getValue(LAYOUT_KEY, LAYOUT_ORIGINAL);
                const newLayout = currentLayout === LAYOUT_ORIGINAL ? LAYOUT_CONDENSED : LAYOUT_ORIGINAL;
                GM_setValue(LAYOUT_KEY, newLayout);
                displayResults(GM_getValue(CURRENT_PAGE_KEY, 1));
            });

            const resultsPerPageLabel = document.createElement("label");
            resultsPerPageLabel.textContent = "Results per page: ";
            resultsPerPageLabel.style.marginLeft = "10px";
            searchFormFooter.appendChild(resultsPerPageLabel);

            const resultsPerPageInput = document.createElement("input");
            resultsPerPageInput.type = "number";
            resultsPerPageInput.value = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
            resultsPerPageInput.style.width = "50px";
            resultsPerPageLabel.appendChild(resultsPerPageInput);

            resultsPerPageInput.addEventListener("change", () => {
                const value = parseInt(resultsPerPageInput.value, 10);
                if (value > 0) {
                    GM_setValue(RESULTS_PER_PAGE_KEY, value);
                    displayResults(GM_getValue(CURRENT_PAGE_KEY, 1));
                }
            });
        }

        const castGrid = document.createElement("div");
        castGrid.className = "grid";
        castGrid.innerHTML = `
            <div class="grid__item grid-u-2-10">
                <label class="form__label">Cast:</label>
            </div>
            <div class="grid__item grid-u-8-10">
                <input type="text" size="40" id="cast" class="form__input" title="Comma-separated cast names" value="">
            </div>`;

        const genresGrid = document.querySelector(".filter_torrents .grid:nth-child(2)");
        genresGrid.insertAdjacentElement('afterend', castGrid);
    };

    init();
})();