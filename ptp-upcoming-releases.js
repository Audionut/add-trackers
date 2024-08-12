// ==UserScript==
// @name         PTP upcoming releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.7
// @description  Get a list of upcoming releases from IMDB and TMDb and integrate with site search form.
// @author       Audionut
// @match        https://passthepopcorn.me/upcoming.php*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-upcoming-releases.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-upcoming-releases.js
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// @connect      api.themoviedb.org
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY_IMDB = 'comingSoonData';
    const CACHE_KEY_TMDB = 'digitalReleasesData';
    const CACHE_EXPIRATION_KEY_IMDB = 'comingSoonDataExpiration';
    const CACHE_EXPIRATION_KEY_TMDB = 'digitalReleasesDataExpiration';
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
    const API_KEY_TMDB = 'tmdbApiKey';
    const RESULT_TYPE_KEY = 'resultType';

    let digitalReleases = [];

const setCache = (key, data) => {
    try {
        const stringData = JSON.stringify(data);
        const compressedData = LZString.compress(stringData);
        GM_setValue(key, compressedData);
        console.log(`Data compressed and cached under key: ${key}`);
    } catch (e) {
        console.error(`Failed to compress and cache data for key: ${key}`, e);
    }
};

const getCache = (key) => {
    const compressedData = GM_getValue(key, null);
    if (compressedData && typeof compressedData === 'string') {
        try {
            const decompressedData = LZString.decompress(compressedData);
            if (decompressedData) {
                return JSON.parse(decompressedData);
            } else {
                console.warn(`Data for key ${key} was not properly compressed or decompressed.`);
                return null;
            }
        } catch (e) {
            console.error(`Failed to decompress data for key: ${key}`, e);
            return null;
        }
    } else {
        console.warn(`Data for key ${key} is not in string format or is null, returning as is.`);
        return compressedData;
    }
};

const clearCache = (cacheType) => {
    switch (cacheType) {
        case 'IMDb':
            GM_setValue(CACHE_KEY_IMDB, null);
            GM_setValue(CACHE_EXPIRATION_KEY_IMDB, 0);
            GM_setValue(NAME_IMAGES_CACHE_KEY, null);
            console.log("IMDb cache cleared");
            break;
        case 'TMDb':
            GM_setValue(CACHE_KEY_TMDB, null);
            GM_setValue(CACHE_EXPIRATION_KEY_TMDB, 0);
            console.log("TMDb cache cleared");
            break;
        case 'All':
            clearCache('IMDb');
            clearCache('TMDb');
            GM_setValue(CURRENT_PAGE_KEY, 1);
            GM_setValue(FILTERED_CACHE_KEY, null);
            console.log("All caches cleared");
            break;
    }
};

const setFilteredCacheTimer = () => {
    setTimeout(() => {
        GM_setValue(FILTERED_CACHE_KEY, null);
        console.log("Filtered cache cleared after 5 minutes");
    }, 5 * 60 * 1000);  // 5 minutes in milliseconds
};

const handleFilteredCache = (filteredData) => {
    GM_setValue(FILTERED_CACHE_KEY, { edges: filteredData });
    setFilteredCacheTimer();  // Start the timer every time the filtered cache is set
};

// Function to format date to YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

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
                                credits(first: 20) {
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
                        if (!comingSoonData.data || !comingSoonData.data.comingSoon || comingSoonData.data.comingSoon.edges.length === 0) {
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
    const container = document.querySelector("#torrents-movie-view > div");
    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading upcoming releases...</p>
        </div>
    `;
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
        setCache(CACHE_KEY_IMDB, cachedData);
        GM_setValue(CACHE_EXPIRATION_KEY_IMDB, Date.now() + 2 * 24 * 60 * 60 * 1000);

        const nameIds = [];
        cachedData.edges.forEach(edge => {
            edge.node.credits.edges.forEach(credit => {
                nameIds.push(credit.node.name.id);
            });
        });

        const primaryImageUrls = await fetchPrimaryImageUrls(nameIds);
        setCache(NAME_IMAGES_CACHE_KEY, primaryImageUrls);
        container.innerHTML = "";
        displayResults(1);
    };

    const fetchPrimaryImageUrls = async (nameIds) => {
        const url = `https://api.graphql.imdb.com/`;
        const queries = [];

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

        return results.flat();
    };

const fetchUpcomingDigitalMovies = async (page = 1) => {
    const container = document.querySelector("#torrents-movie-view > div");
    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading upcoming releases...</p>
        </div>
    `;
    const apiKey = GM_getValue(API_KEY_TMDB, '');
    if (!apiKey) {
        console.error('TMDb API key is not set.');
        return;
    }

    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&region=US&sort_by=release_date.desc&release_date.gte=${formatDate(today)}&release_date.lte=${formatDate(threeMonthsFromNow)}&with_release_type=4&page=${page}`;

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    digitalReleases = digitalReleases.concat(data.results);

                    if (data.page < data.total_pages) {
                        fetchUpcomingDigitalMovies(data.page + 1).then(resolve).catch(reject);
                    } else {
                        fetchMovieDetails().then(() => {
                            setCache(CACHE_KEY_TMDB, digitalReleases);
                            container.innerHTML = "";
                            displayResults(1);
                            resolve(digitalReleases);
                        }).catch(reject);
                    }
                } else {
                    console.error('Failed to fetch data from TMDb API', response); // Debugging log for errors
                    reject(new Error('Failed to fetch data from TMDb API'));
                }
            },
            onerror: function (response) {
                console.error('Error occurred while fetching data from TMDb API', response); // Debugging log for errors
                reject(new Error('Error occurred while fetching data from TMDb API'));
            }
        });
    });
};

const sortAndFilterTmdbData = (data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to midnight for accurate comparison

    // Filter out movies with a release date before today
    const filteredData = data.filter(movie => {
        const releaseDate = new Date(movie.release_date);
        return releaseDate >= today;
    });

    // Sort the movies by release date in ascending order
    filteredData.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

    return filteredData;
};

const fetchMovieDetails = async () => {
    const apiKey = GM_getValue(API_KEY_TMDB, '');
    if (!apiKey) {
        console.error('TMDb API key is not set.');
        return;
    }

    let remainingRequests = digitalReleases.length;
    return new Promise((resolve) => {
        digitalReleases.forEach(movie => {
            fetchDetailsWithRetry(movie, 3, () => {
                if (--remainingRequests === 0) {
                    // Sort and filter the TMDb data before caching and displaying
                    digitalReleases = sortAndFilterTmdbData(digitalReleases);
                    setCache(CACHE_KEY_TMDB, digitalReleases);
                    resolve();
                }
            });
        });
    });
};

const fetchDetailsWithRetry = (movie, retries, callback) => {
    const apiKey = GM_getValue(API_KEY_TMDB, '');
    const url = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&append_to_response=credits,external_ids,images`;

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            if (response.status === 200) {
                const data = JSON.parse(response.responseText);
                movie.details = data;
            } else if (retries > 0) {
                console.warn(`Retrying fetch for movie ID ${movie.id}. Remaining retries: ${retries - 1}`);
                fetchDetailsWithRetry(movie, retries - 1, callback);
            } else {
                console.error(`Failed to fetch details for movie ID ${movie.id} after multiple attempts`);
            }
            callback();
        },
        onerror: function () {
            if (retries > 0) {
                console.warn(`Retrying fetch for movie ID ${movie.id}. Remaining retries: ${retries - 1}`);
                fetchDetailsWithRetry(movie, retries - 1, callback);
            } else {
                console.error(`Error occurred while fetching details for movie ID ${movie.id} after multiple attempts`);
                callback();
            }
        }
    });
};

const sortCombinedDataByDate = (data) => {
    return data.sort((a, b) => {
        const dateA = a.node.releaseDate ?
            new Date(`${a.node.releaseDate.year}-${String(a.node.releaseDate.month).padStart(2, '0')}-${String(a.node.releaseDate.day).padStart(2, '0')}`) :
            (a.node.details && a.node.details.release_date ? new Date(a.node.details.release_date) : null);
        const dateB = b.node.releaseDate ?
            new Date(`${b.node.releaseDate.year}-${String(b.node.releaseDate.month).padStart(2, '0')}-${String(b.node.releaseDate.day).padStart(2, '0')}`) :
            (b.node.details && b.node.details.release_date ? new Date(b.node.details.release_date) : null);

        if (!dateA || !dateB) {
            return 0; // If either date is missing, consider them equal.
        }

        return dateA - dateB;
    });
};

    const addLightboxStyles = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            .lightbox {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                cursor: pointer;
            }
            .lightbox img {
                max-width: 90%;
                max-height: 90%;
            }
        `;
        document.head.appendChild(style);
    };

    const createLightbox = () => {
        const lightbox = document.createElement('div');
        lightbox.classList.add('lightbox');
        lightbox.innerHTML = '<img src="" alt="lightbox image">';
        document.body.appendChild(lightbox);

        lightbox.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });

        return lightbox;
    };

    const initLightbox = () => {
        const lightbox = createLightbox();

        document.addEventListener('click', (event) => {
            if (event.target.tagName === 'IMG' && event.target.classList.contains('lightbox-trigger')) {
                lightbox.querySelector('img').src = event.target.src;
                lightbox.style.display = 'flex';
            }
        });
    };

const createImageElement = (node, size, source) => {
    const image = document.createElement("img");
    if (source === 'IMDb') {
        image.src = node.primaryImage && node.primaryImage.url ? node.primaryImage.url : 'https://ptpimg.me/w6l4kj.png';
        image.alt = node.primaryImage && node.primaryImage.caption ? node.primaryImage.caption.plainText : 'No image available';
    } else if (source === 'TMDb') {
        image.src = node.details && node.details.poster_path ? `https://image.tmdb.org/t/p/original${node.details.poster_path}` : 'https://ptpimg.me/w6l4kj.png';
        image.alt = node.details && node.details.title ? node.details.title : 'No image available';
    }
    image.style.maxWidth = size;
    image.style.marginRight = "10px";
    image.classList.add('lightbox-trigger');
    return image;
};

const displayResultsOriginal = (page, data, source) => {
    const nameImagesData = getCache(NAME_IMAGES_CACHE_KEY);
    const resultsPerPage = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
    const resultType = GM_getValue(RESULT_TYPE_KEY, 'All');

    if (!data || !data.edges || !nameImagesData) {
        if (source === 'IMDb') {
            fetchAllComingSoonData();
        } else if (source === 'TMDb') {
            fetchUpcomingDigitalMovies();
        }
        return;
    }

    const totalResults = data.edges.length;
    const totalPages = Math.ceil(totalResults / resultsPerPage);

    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    let pageData = data.edges.slice(startIndex, endIndex);

    if (ALLOWED_GENRES.size > 0) {
        pageData = pageData.filter(movie => {
            return movie.node && movie.node.genres && movie.node.genres.genres.some(genre => ALLOWED_GENRES.has(genre.text || genre.name));
        });
    }

    const container = document.querySelector("#torrents-movie-view > div");
    container.innerHTML = "";

    const groupedByDate = pageData.reduce((acc, movie) => {
        const node = movie.node;
        if (!node) return acc;
        const releaseDate = node.releaseDate ? `${node.releaseDate.year}-${String(node.releaseDate.month).padStart(2, '0')}-${String(node.releaseDate.day).padStart(2, '0')}` : node.details.release_date;
        if (!releaseDate) return acc;
        const dateStr = new Date(releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
            movieDiv.style.position = "relative";

            const image = createImageElement(node, "200px", movie.source);
            movieDiv.appendChild(image);

            const infoDiv = document.createElement("div");
            infoDiv.style.flex = "1";
            infoDiv.style.display = "flex";
            infoDiv.style.flexDirection = "column";

            const titleLinkDiv = document.createElement("div");
            titleLinkDiv.style.display = "flex";
            titleLinkDiv.style.justifyContent = "space-between";
            titleLinkDiv.style.alignItems = "center";

            const titleLink = document.createElement("a");
            titleLink.href = movie.source === 'IMDb' ? `https://www.imdb.com/title/${node.id}/` : `https://www.themoviedb.org/movie/${node.id}`;
            titleLink.target = "_blank";
            titleLink.rel = "noreferrer";
            titleLink.textContent = node.titleText ? node.titleText.text : node.details.title;
            titleLink.style.fontWeight = "bold";
            titleLink.style.fontSize = "1.2em";
            titleLink.style.textDecoration = "none";
            titleLink.style.color = "white";
            titleLink.style.display = "block";
            titleLink.style.marginBottom = "10px";

                if (movie.source === 'TMDb' && resultType === "All") {
                    const digitalLabel = document.createElement('span');
                    digitalLabel.textContent = 'Digital';
                    digitalLabel.style.color = 'teal';
                    digitalLabel.style.marginLeft = '10px';
                    titleLink.appendChild(digitalLabel);
                }

                if (movie.source === 'IMDb' && resultType === "All") {
                    const digitalLabel = document.createElement('span');
                    digitalLabel.textContent = 'Theatrical';
                    digitalLabel.style.color = 'orange';
                    digitalLabel.style.marginLeft = '10px';
                    titleLink.appendChild(digitalLabel);
                }

            const ptpLink = document.createElement("a");
            ptpLink.href = `https://passthepopcorn.me/requests.php?search=${node.id || node.details.title}`;
            ptpLink.target = "_blank";
            ptpLink.textContent = "(Search PTP requests)";
            ptpLink.style.float = "right";
            ptpLink.style.fontSize = "0.9em";

            titleLinkDiv.appendChild(titleLink);
            titleLinkDiv.appendChild(ptpLink);
            infoDiv.appendChild(titleLinkDiv);

            const plot = document.createElement("p");
            plot.textContent = node.plot ? node.plot.plotText.plainText : node.details.overview || "No plot available.";
            infoDiv.appendChild(plot);

            const genres = document.createElement("p");
            const genresList = node.genres ? node.genres.genres : node.details.genres;
            genresList.forEach(genre => {
                const genreLink = document.createElement("a");
                genreLink.href = `https://passthepopcorn.me/torrents.php?action=advanced&taglist=${genre.text || genre.name}`;
                genreLink.textContent = genre.text || genre.name;
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
            const creditsList = node.credits ? node.credits.edges : node.details.credits.cast;
            creditsList.forEach(credit => {
                const castMember = movie.source === 'IMDb' ? nameImagesData.find(name => name.id === credit.node.name.id) : credit;

                // Skip cast members without images
                const hasValidImage = (movie.source === 'IMDb' && castMember?.primaryImage?.url) ||
                                      (movie.source === 'TMDb' && castMember?.profile_path);

                if (castMember && hasValidImage && castCount < 5) {
                    castCount++;
                    const castDiv = document.createElement("div");
                    castDiv.style.textAlign = "center";
                    castDiv.style.width = "auto";

                    const castImageLink = document.createElement("a");
                    castImageLink.href = movie.source === 'IMDb' ? `https://www.imdb.com/name/${credit.node.name.id}/` : `https://www.themoviedb.org/person/${credit.id}`;
                    castImageLink.target = "_blank";
                    castImageLink.rel = "noreferrer";

                    const castImage = document.createElement("img");
                    castImage.src = movie.source === 'IMDb' ? castMember.primaryImage.url
                                : `https://image.tmdb.org/t/p/w185${castMember.profile_path}`;
                    castImage.alt = movie.source === 'IMDb' ? credit.node.name.nameText.text : credit.name;
                    castImage.style.maxHeight = "150px";
                    castImage.style.width = "auto";
                    castImage.style.display = "block";
                    castImageLink.appendChild(castImage);
                    castDiv.appendChild(castImageLink);

                    const castNameLink = document.createElement("a");
                    const castName = movie.source === 'IMDb' ? credit.node.name.nameText.text : credit.name;
                    castNameLink.href = `https://passthepopcorn.me/artist.php?artistname=${encodeURIComponent(castName)}`;
                    castNameLink.target = "_blank";
                    castNameLink.rel = "noreferrer";
                    castNameLink.textContent = castName;
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

const displayResultsCondensed = (page, data, source) => {
    const nameImagesData = getCache(NAME_IMAGES_CACHE_KEY);
    const resultsPerPage = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
    const resultType = GM_getValue(RESULT_TYPE_KEY, 'All');

    if (!data || !data.edges || !nameImagesData) {
        if (source === 'IMDb') {
            fetchAllComingSoonData();
        } else if (source === 'TMDb') {
            fetchUpcomingDigitalMovies();
        }
        return;
    }

    const totalResults = data.edges.length;
    const totalPages = Math.ceil(totalResults / resultsPerPage);

    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    let pageData = data.edges.slice(startIndex, endIndex);

    if (ALLOWED_GENRES.size > 0) {
        pageData = pageData.filter(movie => {
            return movie.node && movie.node.genres && movie.node.genres.genres.some(genre => ALLOWED_GENRES.has(genre.text || genre.name));
        });
    }

    const container = document.querySelector("#torrents-movie-view > div");
    container.innerHTML = "";

    const groupedByDate = pageData.reduce((acc, movie) => {
        const node = movie.node;
        if (!node) return acc;
        const releaseDate = node.releaseDate ? `${node.releaseDate.year}-${String(node.releaseDate.month).padStart(2, '0')}-${String(node.releaseDate.day).padStart(2, '0')}` : node.details.release_date;
        if (!releaseDate) return acc;
        const dateStr = new Date(releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
        dateHeader.style.padding = "10px";
        dateHeaderRow.appendChild(dateHeader);
        table.appendChild(dateHeaderRow);

        for (let i = 0; i < movies.length; i += 2) {
            const row = document.createElement("tr");

            for (let j = 0; j < 2; j++) {
                const movie = movies[i + j];
                if (!movie || !movie.node) continue;

                const node = movie.node;
                const cell = document.createElement("td");
                cell.style.border = "1px solid #525252";
                cell.style.padding = "10px";
                cell.style.verticalAlign = "top";
                cell.style.width = "50%";

                const movieDiv = document.createElement("div");
                movieDiv.style.display = "flex";
                movieDiv.style.position = "relative";

                const image = createImageElement(node, "60px", movie.source); // Pass source to distinguish between IMDb and TMDb
                movieDiv.appendChild(image);

                const infoDiv = document.createElement("div");
                infoDiv.style.flex = "1";

                const titleLink = document.createElement("a");
                titleLink.href = movie.source === 'IMDb' ? `https://www.imdb.com/title/${node.id}/` : `https://www.themoviedb.org/movie/${node.id}`;
                titleLink.target = "_blank";
                titleLink.rel = "noreferrer";
                titleLink.textContent = node.titleText ? node.titleText.text : node.details.title;
                titleLink.style.fontWeight = "bold";
                titleLink.style.fontSize = "1.2em";
                titleLink.style.textDecoration = "none";
                titleLink.style.color = "white";
                titleLink.style.marginBottom = "2px";
                infoDiv.appendChild(titleLink);

                if (movie.source === 'TMDb' && resultType === "All") {
                    const digitalLabel = document.createElement('span');
                    digitalLabel.textContent = 'Digital';
                    digitalLabel.style.color = 'teal';
                    digitalLabel.style.marginLeft = '10px';
                    titleLink.appendChild(digitalLabel);
                }

                if (movie.source === 'IMDb' && resultType === "All") {
                    const digitalLabel = document.createElement('span');
                    digitalLabel.textContent = 'Theatrical';
                    digitalLabel.style.color = 'orange';
                    digitalLabel.style.marginLeft = '10px';
                    titleLink.appendChild(digitalLabel);
                }

                const ptpLink = document.createElement("a");
                ptpLink.href = `https://passthepopcorn.me/requests.php?search=${node.id || node.details.title}`;
                ptpLink.target = "_blank";
                ptpLink.textContent = "(Search PTP requests)";
                ptpLink.style.float = "right";
                ptpLink.style.fontSize = "0.9em";
                infoDiv.appendChild(ptpLink);

                const genres = document.createElement("p");
                const genresList = node.genres ? node.genres.genres : node.details.genres;
                genresList.forEach(genre => {
                    const genreLink = document.createElement("a");
                    genreLink.href = `https://passthepopcorn.me/torrents.php?action=advanced&taglist=${genre.text || genre.name}`;
                    genreLink.textContent = genre.text || genre.name;
                    genreLink.style.color = "white";
                    genreLink.style.marginRight = "10px";
                    genres.appendChild(genreLink);
                });
                infoDiv.appendChild(genres);

                const castContainer = document.createElement("div");
                castContainer.style.display = "flex";
                castContainer.style.flexWrap = "wrap";
                castContainer.style.gap = "10px";

                let castCount = 0;
                const creditsList = node.credits ? node.credits.edges : node.details.credits.cast;
                creditsList.forEach(credit => {
                    const castMember = movie.source === 'IMDb' ? nameImagesData.find(name => name.id === credit.node.name.id) : credit;

                    if (castMember && castCount < 5) {
                        castCount++;
                        const castDiv = document.createElement("div");
                        castDiv.style.textAlign = "center";
                        castDiv.style.width = "auto";

                        const castNameLink = document.createElement("a");
                        const castName = movie.source === 'IMDb' ? credit.node.name.nameText.text : credit.name;
                        castNameLink.href = `https://passthepopcorn.me/artist.php?artistname=${encodeURIComponent(castName)}`;
                        castNameLink.target = "_blank";
                        castNameLink.textContent = castName;
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
        html += ` Page ${currentPage} of ${totalPages} `;  // Show current page out of total pages
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

const addSpinnerStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .spinner {
            border: 16px solid #f3f3f3;
            border-top: 16px solid #3498db;
            border-radius: 50%;
            width: 120px;
            height: 120px;
            animation: spin 2s linear infinite;
            margin: 20px auto;
        }
        .loading-container {
            text-align: center;
            color: white;
            font-size: 1.5em;
        }
    `;
    document.head.appendChild(style);
};

const displayResults = async (page) => {
    try {
        // Placeholder function for fetching and processing data
        const fetchAndProcessData = async () => {
            const layout = GM_getValue(LAYOUT_KEY, LAYOUT_ORIGINAL);
            const resultType = GM_getValue(RESULT_TYPE_KEY, 'All');
            let data = { edges: [] };
            let imdbData = [];
            let tmdbData = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to midnight to compare only dates

            if (resultType === 'Theatrical' || resultType === 'All') {
                const filteredData = GM_getValue(FILTERED_CACHE_KEY);
                const imdbCache = filteredData || getCache(CACHE_KEY_IMDB);
                if (imdbCache) {
                    imdbData = imdbCache.edges.map(edge => ({
                        ...edge,
                        source: 'IMDb'
                    }));
                }
            }

            if (resultType === 'Digital' || resultType === 'All') {
                const tmdbCache = getCache(CACHE_KEY_TMDB);
                if (tmdbCache) {
                    tmdbData = tmdbCache.map(movie => ({
                        node: movie,
                        source: 'TMDb'
                    }));
                }
            }

            // Combine IMDb and TMDb data
            data.edges = [...imdbData, ...tmdbData];

            // Filter out items with dates before today
            data.edges = data.edges.filter(edge => {
                const releaseDate = edge.node.releaseDate ?
                    new Date(`${edge.node.releaseDate.year}-${String(edge.node.releaseDate.month).padStart(2, '0')}-${String(edge.node.releaseDate.day).padStart(2, '0')}`) :
                    (edge.node.details && edge.node.details.release_date ? new Date(edge.node.details.release_date) : null);

                return releaseDate && releaseDate >= today;
            });

            // Remove potential duplicates by using a Set or filtering based on a unique identifier like `node.id`
            const uniqueData = [];
            const seenIds = new Set();

            data.edges.forEach(edge => {
                const id = edge.node.id || edge.node.details.id;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    uniqueData.push(edge);
                }
            });

            data.edges = uniqueData;

            // Sort the combined data by release date
            if (data.edges.length > 0) {
                data.edges = sortCombinedDataByDate(data.edges);
            }

            if (layout === LAYOUT_ORIGINAL) {
                displayResultsOriginal(page, data, 'All');
            } else if (layout === LAYOUT_CONDENSED) {
                displayResultsCondensed(page, data, 'All');
            }
        };

        // Fetch and process data
        await fetchAndProcessData();

    } catch (error) {
        container.innerHTML = "<p style='color: red; font-size: 1.5em; text-align: center;'>Failed to load data. Please try again later.</p>";
        console.error("Error loading data:", error); // Log the error for debugging
    }
};

const handleSearchForm = () => {
    const searchForm = document.querySelector("#filter_torrents_form");
    if (searchForm) {
        searchForm.addEventListener("submit", (event) => {
            event.preventDefault();
            console.log("Search form submitted.");  // Log when form is submitted

            const formData = new FormData(searchForm);
            const searchstr = formData.get("searchstr") || "";
            const taglist = formData.get("taglist") || "";
            const castlist = formData.get("castlist") || "";

            console.log("Search string:", searchstr);
            console.log("Tag list:", taglist);
            console.log("Cast list:", castlist);  // Log the cast list to check if it's correctly retrieved

            const tagsType = formData.get("tags_type") || "all";  // Get the selected tags_type

            const cachedData = getCache(CACHE_KEY_IMDB);
            if (cachedData && cachedData.edges) {
                let filteredData = cachedData.edges;

                if (searchstr) {
                    filteredData = filteredData.filter(movie => movie.node.titleText.text.toLowerCase().includes(searchstr.toLowerCase()));
                }
                if (taglist) {
                    const tags = taglist.split(',').map(tag => tag.trim().toLowerCase());
                    filteredData = filteredData.filter(movie => {
                        const movieTags = movie.node.genres.genres.map(genre => genre.text.toLowerCase());

                        if (tagsType === "any") {
                            // "Any" logic: Movie matches if it has any of the selected tags
                            return tags.some(tag => movieTags.includes(tag));
                        } else {
                            // "All" logic: Movie matches only if it has all the selected tags
                            return tags.every(tag => movieTags.includes(tag));
                        }
                    });
                }
                if (castlist) {
                    const casts = castlist.split(',').map(cast => cast.trim().toLowerCase());

                    console.log("Processing cast filtering with these names:", casts);  // Log the cast list being processed

                    filteredData = filteredData.filter(movie => {
                        const movieCasts = movie.node.credits.edges.map(credit => credit.node.name.nameText.text.toLowerCase());

                        return casts.some(cast => {
                            return movieCasts.some(movieCast => {
                                const [firstName, lastName] = movieCast.split(' ');
                                return firstName === cast || lastName === cast || movieCast.includes(cast);
                            });
                        });
                    });
                }

                if (!searchstr && !taglist && !castlist) {
                    filteredData = null;
                    GM_setValue(FILTERED_CACHE_KEY, null);
                    displayResults(1);
                    return;
                }

                GM_setValue(FILTERED_CACHE_KEY, { edges: filteredData });
                displayResults(1);
            }
        });
    } else {
        console.log("Search form not found.");  // Log if the form is not found
    }
};

const init = () => {
    const currentPage = GM_getValue(CURRENT_PAGE_KEY, 1);
    const cacheExpirationIMDb = GM_getValue(CACHE_EXPIRATION_KEY_IMDB, 0);
    const cacheExpirationTMDb = GM_getValue(CACHE_EXPIRATION_KEY_TMDB, 0);

    if (Date.now() > cacheExpirationIMDb) {
        clearCache('IMDb');
        fetchAllComingSoonData();
    } else {
        const cachedDataIMDb = getCache(CACHE_KEY_IMDB);
        const nameImagesData = getCache(NAME_IMAGES_CACHE_KEY);
        if (cachedDataIMDb && cachedDataIMDb.edges.length > 0 && nameImagesData) {
            displayResults(currentPage);
        } else {
            fetchAllComingSoonData();
        }
    }

    if (Date.now() > cacheExpirationTMDb) {
        clearCache('TMDb');
        fetchUpcomingDigitalMovies().then(() => {
            setCache(CACHE_KEY_TMDB, digitalReleases);
            GM_setValue(CACHE_EXPIRATION_KEY_TMDB, Date.now() + 2 * 24 * 60 * 60 * 1000);
            displayResults(currentPage);
        });
    } else {
        displayResults(currentPage);
    }

    handleSearchForm();
    updateSearchForm();
};

const updateSearchForm = () => {
    const filterTorrentsToggle = document.getElementById("filter_torrents_toggle");
    if (filterTorrentsToggle) {
        filterTorrentsToggle.querySelector("a").textContent = "[+] Search and settings";
    }

    document.querySelectorAll(".filter_torrents .grid").forEach(grid => {
        const label = grid.querySelector(".form__label");
        if (label && (label.textContent.includes("IMDb:") || label.textContent.includes("List:"))) {
            grid.remove();
        }
    });

    document.querySelectorAll(".form__label").forEach(label => {
        if (label.textContent.includes("Tags:")) {
            label.textContent = label.textContent.replace("Tags:", "Genres:");
        }
    });

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

    const searchFormFooter = document.querySelector(".search-form__footer__buttons");
    if (searchFormFooter) {
        const layoutToggle = document.createElement("input");
        //layoutToggle.textContent = "Toggle Layout";
        layoutToggle.type = "submit";
        layoutToggle.setAttribute('value', 'Toggle Layout');
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

        const clearCacheButton = document.createElement("input");
        //clearCacheButton.textContent = "Clear All Caches";
        clearCacheButton.type = "submit";
        clearCacheButton.setAttribute('value', 'Clear All Caches');
        searchFormFooter.appendChild(clearCacheButton);

        clearCacheButton.addEventListener("click", () => {
            const userConfirmed = window.confirm(
                "This script clears the cache on a regular basis and attempts to keep the data fresh. " +
                "There are quite a few API calls required at both IMDB and TMDB in order to gather a list of movies, " +
                "and also gather a list of cast for every movie. You're on your own if being trigger happy with this button causes issues."
            );

            if (userConfirmed) {
                clearCache('All');
                console.log("All caches force cleared");
                window.location.reload();  // Reload the page after clearing all caches
            } else {
                console.log("Clear cache action canceled by the user");
            }
        });

        const castGrid = document.createElement("div");
        castGrid.className = "grid";
        castGrid.innerHTML = `
            <div class="grid__item grid-u-2-10">
                <label class="form__label">Cast:</label>
            </div>
            <div class="grid__item grid-u-8-10">
                <input type="text" size="40" id="cast" name="castlist" class="form__input" title="Comma-separated cast names" value="">
            </div>`; // Added name="castlist"
        const genresGrid = document.querySelector(".filter_torrents .grid:nth-child(2)");
        genresGrid.insertAdjacentElement('afterend', castGrid);
    }

     const footer = document.querySelector(".search-form__footer")
     if (footer) {
        const tmdbApiKeyGrid = document.createElement("div");
        tmdbApiKeyGrid.className = "grid";
        tmdbApiKeyGrid.innerHTML = `
            <div class="grid__item grid-u-2-10">
                <label class="form__label">TMDb API Key:</label>
            </div>
            <div class="grid__item grid-u-7-10">
                <input type="text" size="40" id="tmdb_api_key" class="form__input" value="${GM_getValue(API_KEY_TMDB, '')}">
            </div>
            <div class="grid__item grid-u-1-10">
                <input id="save_tmdb_api_key" class="form__input" type="submit" value="Save"></input>
            </div>`;
        footer.appendChild(tmdbApiKeyGrid);

        const saveTmdbApiKeyButton = document.getElementById("save_tmdb_api_key");
        saveTmdbApiKeyButton.addEventListener("click", () => {
            const tmdbApiKeyInput = document.getElementById("tmdb_api_key");
            GM_setValue(API_KEY_TMDB, tmdbApiKeyInput.value);
            console.log('TMDb API Key saved:', tmdbApiKeyInput.value); // Debugging log
        });

        const resultTypeGrid = document.createElement("div");
        resultTypeGrid.className = "grid";
        resultTypeGrid.innerHTML = `
            <div class="grid__item grid-u-2-10">
                <label class="form__label">Result Type:</label>
            </div>
            <div class="grid__item grid-u-7-10">
                <select id="result_type" class="form__input">
                    <option value="All">All</option>
                    <option value="Theatrical">Theatrical</option>
                    <option value="Digital">Digital</option>
                </select>
            </div>
            <div class="grid__item grid-u-1-10">
                <input id="refresh_results" class="form__input" type="submit" value="Refresh"></input>
            </div>`;
        footer.appendChild(resultTypeGrid);

        const resultTypeSelect = document.getElementById("result_type");
        resultTypeSelect.value = GM_getValue(RESULT_TYPE_KEY, 'All');
        resultTypeSelect.addEventListener("change", () => {
            GM_setValue(RESULT_TYPE_KEY, resultTypeSelect.value);
        });

        const refreshResultsButton = document.getElementById("refresh_results");
        refreshResultsButton.addEventListener("click", () => {
            displayResults(1);
            console.log('Results refreshed for type:', resultTypeSelect.value);
        });
     }
};

    function bindKeyBindings() {
        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.key === 's') {
                event.preventDefault();
                console.log('save');
            }
        });
    }

window.addEventListener('load', function() {
    addLightboxStyles();
    addSpinnerStyles();
    initLightbox();
    init();
    bindKeyBindings();
});

})();