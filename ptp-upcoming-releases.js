// ==UserScript==
// @name         PTP upcoming releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1.6
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
    const FILTERED_CACHE_KEY = 'filterALLData';
    const API_KEY_TMDB = 'tmdbApiKey';
    const RESULT_TYPE_KEY = 'resultType';
    const radarrSignal = new CustomEvent('UpcomingReleasesDisplayChanged');
    const container = document.querySelector("#torrents-movie-view > div");

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
            // Return null when no valid data is found
            console.warn(`No valid data found for key ${key}.`);
            return null;
        }
    };
    let aCacheWasCleared = 0;
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
        aCacheWasCleared = 1;
    };

    // Function to format date to YYYY-MM-DD
    function formatDate(date) {
        const d = new Date(date);
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    }

    // Helper function to deduplicate results by movie ID
    const deduplicateResults = (results) => {
        const uniqueData = [];
        const seenIds = new Set();

        results.forEach(edge => {
            // Handle cases where the structure has a node property (IMDb) or not (TMDb)
            const movie = edge.node || edge; // Fallback to `edge` if `node` doesn't exist (for TMDb data)

            if (!movie || !movie.id) {
                console.warn("Skipping edge without valid movie ID during deduplication:", edge);
                return; // Skip if no valid movie ID is found
            }

            const id = movie.id; // Use only the movie ID as the unique key

            if (!seenIds.has(id)) {
                // If this ID has not been seen, add it to the uniqueData
                seenIds.add(id);
                uniqueData.push(edge);
            }
        });

        return uniqueData;
    };

    const fetchDetailsWithRetry = (movie, retries, callback) => {
        //const container = document.querySelector("#torrents-movie-view > div");
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading upcoming releases...</p>
            </div>
        `;
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

const sortAndFilterTmdbData = (data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set today's date to midnight for accurate comparison

    //console.log("Today's date:", today);

    // Filter out movies that are not future releases and movies with a release date before today
    const filteredDateData = data.filter(movie => {
        const releaseDate = new Date(movie.release_date); // Ensure release_date is a valid date object

        if (isNaN(releaseDate)) {
            console.warn("Invalid release date for movie:", movie.title, movie.release_date);
            return false;
        }

        // Check if the movie is in the future (isFuture should be true)
        const isFuture = releaseDate >= today;
        if (!isFuture) {
            //console.log(`Excluding movie: ${movie.title} | Release Date: ${releaseDate} | Is Future: ${isFuture}`);
            return false;
        }

        //console.log(`Including movie: ${movie.title} | Release Date: ${releaseDate} | Is Future: ${isFuture}`);
        return true;
    });

    // Sort the remaining movies by release date in ascending order
    filteredDateData.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

    //console.log("Filtered and sorted TMDB data:", filteredDateData);
    return filteredDateData;
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
                    //console.log("Digital releases before filtering:", digitalReleases);
                    // Filter and sort the TMDb data before caching and displaying
                    const filteredData = sortAndFilterTmdbData(digitalReleases);
                    resolve(filteredData); // Resolve the filtered data correctly
                }
            });
        });
    });
};

    const fetchComingSoonDataWithRetry = async (afterDate = null, retries = 3) => {
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
            const attemptFetch = (remainingRetries) => {
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
                        } else if (remainingRetries > 0) {
                            console.warn(`Retrying fetch from IMDb API. Remaining retries: ${remainingRetries - 1}`);
                            attemptFetch(remainingRetries - 1);
                        } else {
                            console.error("Failed to fetch coming soon data after multiple attempts", response);
                            reject(response);
                        }
                    },
                    onerror: function (response) {
                        if (remainingRetries > 0) {
                            console.warn(`Retrying fetch from IMDb API. Remaining retries: ${remainingRetries - 1}`);
                            attemptFetch(remainingRetries - 1);
                        } else {
                            console.error("Request error after multiple attempts", response);
                            reject(response);
                        }
                    }
                });
            };

            attemptFetch(retries);
        });
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

    const fetchAllComingSoonData = async () => {
        //const container = document.querySelector("#torrents-movie-view > div");
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading upcoming releases...</p>
            </div>
        `;
        let allEdges = [];
        let lastReleaseDate = null;

        while (true) {
            const newEdges = await fetchComingSoonDataWithRetry(lastReleaseDate ? lastReleaseDate : null);
            if (newEdges.length === 0) break;

            allEdges = allEdges.concat(newEdges);
            const lastEdge = newEdges[newEdges.length - 1];
            lastReleaseDate = `${lastEdge.node.releaseDate.year}-${String(lastEdge.node.releaseDate.month).padStart(2, '0')}-${String(lastEdge.node.releaseDate.day).padStart(2, '0')}`;

            if (newEdges.length < MAX_RESULTS) break;
        }

        const cachedData = { edges: allEdges };
        //console.log('IMDb Data before deduplication:', cachedData);

        // Deduplicate before caching
        const deduplicatedIMDbData = deduplicateResults(cachedData.edges);
        //console.log('IMDb Data after deduplication:', deduplicatedIMDbData);

        setCache(CACHE_KEY_IMDB, { edges: deduplicatedIMDbData });  // Cache deduplicated IMDb data

        const nameIds = [];
        cachedData.edges.forEach(edge => {
            edge.node.credits.edges.forEach(credit => {
                nameIds.push(credit.node.name.id);
            });
        });

        const primaryImageUrls = await fetchPrimaryImageUrls(nameIds);
        setCache(NAME_IMAGES_CACHE_KEY, primaryImageUrls);
        container.innerHTML = "";
        //displayResults(1);
    };

const fetchUpcomingDigitalMovies = async (page = 1) => {
    const apiKey = GM_getValue(API_KEY_TMDB, '');
    if (!apiKey) {
        console.error('TMDb API key is not set.');
        return;
    }

    const today = new Date();
    const fourMonthsFromNow = new Date();
    fourMonthsFromNow.setMonth(today.getMonth() + 4);

    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&region=US&sort_by=release_date.desc&release_date.gte=${formatDate(today)}&release_date.lte=${formatDate(fourMonthsFromNow)}&with_release_type=4&page=${page}`;

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
                        fetchMovieDetails().then((filteredData) => {
                            //console.log('Filtered Data before deduplication:', filteredData);

                            // Deduplicate before caching
                            const deduplicatedTMDBData = deduplicateResults(filteredData);
                            //console.log('TMDB Data after deduplication:', deduplicatedTMDBData);

                            setCache(CACHE_KEY_TMDB, deduplicatedTMDBData);  // Cache only deduplicated data
                            resolve(deduplicatedTMDBData); // Resolve only the deduplicated data
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

    const sortCombinedDataByDate = (data) => {
        return data.sort((a, b) => {
            const dateA = a.node.releaseDate ?
                new Date(`${a.node.releaseDate.year}-${String(a.node.releaseDate.month).padStart(2, '0')}-${String(a.node.releaseDate.day).padStart(2, '0')}`) :
                (a.node && a.node.release_date ? new Date(a.node.release_date) : null);
            const dateB = b.node.releaseDate ?
                new Date(`${b.node.releaseDate.year}-${String(b.node.releaseDate.month).padStart(2, '0')}-${String(b.node.releaseDate.day).padStart(2, '0')}`) :
                (b.node && b.node.release_date ? new Date(b.node.release_date) : null);

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
        // IMDb image handling
        image.src = node.primaryImage && node.primaryImage.url ? node.primaryImage.url : 'https://ptpimg.me/w6l4kj.png';
        image.alt = node.primaryImage && node.primaryImage.caption ? node.primaryImage.caption.plainText : 'No image available';
    } else if (source === 'TMDb') {
        // TMDb image handling for both wrapped and unwrapped data
        const posterPath = node.details?.poster_path || node.poster_path || (node.primaryImage && node.primaryImage.url);
        const titleText = node.details?.title || node.title;

        // Use direct URL if primaryImage is available, otherwise construct the URL
        image.src = posterPath && node.primaryImage ? posterPath : (posterPath ? `https://image.tmdb.org/t/p/original${posterPath}` : 'https://ptpimg.me/w6l4kj.png');
        image.alt = titleText ? titleText : 'No image available';
    }

    image.style.maxWidth = size;
    //image.style.aspectRatio = "2 / 3";
    image.style.marginRight = "10px";
    image.classList.add('lightbox-trigger');
    image.loading = "lazy";

    return image;
};

const displayResultsOriginal = (page, data, source) => {
    const nameImagesData = getCache(NAME_IMAGES_CACHE_KEY);
    const resultsPerPage = GM_getValue(RESULTS_PER_PAGE_KEY, RESULTS_PER_PAGE_DEFAULT);
    const resultType = GM_getValue(RESULT_TYPE_KEY, 'All');

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

    //const container = document.querySelector("#torrents-movie-view > div");
    container.innerHTML = "";

    const groupedByDate = pageData.reduce((acc, movie) => {
        const node = movie.node;
        if (!node) return acc;
        const releaseDate = node.releaseDate ? `${node.releaseDate.year}-${String(node.releaseDate.month).padStart(2, '0')}-${String(node.releaseDate.day).padStart(2, '0')}` : node.release_date;
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
            movieDiv.setAttribute('class', 'huge-movie-list__movie');
            movieDiv.style.border = "1px solid #ccc";
            movieDiv.style.padding = "10px";
            movieDiv.style.marginBottom = "10px";
            movieDiv.style.display = "flex";
            movieDiv.style.position = "relative";

            const image = createImageElement(node, "200px", movie.source);
            movieDiv.appendChild(image);

            const infoDiv = document.createElement("div");
            infoDiv.setAttribute('class', 'site-link');
            infoDiv.style.flex = "1";
            infoDiv.style.display = "flex";
            infoDiv.style.flexDirection = "column";
            infoDiv.style.whiteSpace = "nowrap"; // Prevent wrapping
            infoDiv.style.overflow = "hidden";   // Hide overflowed content
            infoDiv.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed content

            const titleLinkDiv = document.createElement("div");
            titleLinkDiv.style.display = "flex";
            titleLinkDiv.style.justifyContent = "space-between";
            titleLinkDiv.style.alignItems = "center";

            const titleLink = document.createElement("a");
            titleLink.href = movie.source === 'IMDb' ? `https://www.imdb.com/title/${node.id}/` : `https://www.themoviedb.org/movie/${node.id}`;
            titleLink.target = "_blank";
            titleLink.rel = "noreferrer";
            titleLink.setAttribute('class', 'title-link');
            titleLink.textContent = node.titleText?.text || node.details?.title || node.title || node.original_title;
            titleLink.style.fontWeight = "bold";
            titleLink.style.fontSize = "1.2em";
            titleLink.style.textDecoration = "none";
            titleLink.style.color = "white";
            titleLink.style.display = "block";
            titleLink.style.marginBottom = "10px";
            titleLink.style.whiteSpace = "nowrap"; // Prevent wrapping
            titleLink.style.overflow = "hidden";   // Hide overflowed content
            titleLink.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed content

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

            const radarLink = document.createElement("a");
            radarLink.setAttribute('class', 'radarLink');
            radarLink.style.float = "left";

            const ptpLink = document.createElement("a");
            if(movie.source === 'IMDb') {
                ptpLink.href = `https://passthepopcorn.me/requests.php?search=${node.id || node.titleText?.text}`;
            }
            if(movie.source === 'TMDb') {
                ptpLink.href = `https://passthepopcorn.me/requests.php?search=${node.title || node.details?.title || node.titleText?.text}`;
            }
            ptpLink.target = "_blank";
            ptpLink.setAttribute('class', 'request-link');
            ptpLink.textContent = "(Search PTP requests)";
            ptpLink.style.float = "right";
            ptpLink.style.fontSize = "0.9em";

            titleLinkDiv.appendChild(titleLink);
            titleLinkDiv.appendChild(radarLink);
            titleLinkDiv.appendChild(ptpLink);
            infoDiv.appendChild(titleLinkDiv);

            const plot = document.createElement("p");
            plot.textContent = node.plot?.plotText?.plainText || node.details?.overview || "No plot available.";
            infoDiv.appendChild(plot);

            const genres = document.createElement("p");
            const genresList = node.genres?.genres || (node.details?.genres?.length ? node.details.genres : []);
            genresList.forEach(genre => {
                const genreLink = document.createElement("a");
                genreLink.setAttribute('class', 'genres');
                genreLink.href = `https://passthepopcorn.me/torrents.php?action=advanced&taglist=${genre.text || genre.name}`;
                genreLink.textContent = genre.text || genre.name;
                genreLink.style.color = "white";
                genreLink.style.marginRight = "5px";
                genreLink.style.whiteSpace = "nowrap"; // Prevent wrapping
                genreLink.style.overflow = "hidden";   // Hide overflowed content
                genreLink.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed content
                genres.appendChild(genreLink);
            });
            infoDiv.appendChild(genres);

            const castContainer = document.createElement("div");
            castContainer.style.display = "flex";
            castContainer.style.flexWrap = "nowrap"; // Prevent wrapping
            castContainer.style.overflow = "auto";   // Allow horizontal scrolling if needed
            castContainer.style.gap = "10px";

            let castCount = 0;
            const creditsList = movie.source === 'IMDb'
                ? (node.cast || node.credits?.edges || [])  // IMDb: Handle wrapped and unwrapped data
                : (node.cast || node.details?.credits?.cast || []);  // TMDb: Handle wrapped (node.cast) and unwrapped (node.details.credits.cast)

            creditsList.forEach(credit => {
                // IMDb case: Check if it's wrapped (node.cast) or unwrapped (credits.edges)
                const castMember = movie.source === 'IMDb'
                    ? (node.cast ? credit : nameImagesData.find(name => name.id === credit.node.name.id)) // IMDb: Handle wrapped and unwrapped
                    : (node.cast ? credit : credit);  // TMDb: Handle wrapped (node.cast) and unwrapped (credit)

                // Check for valid images
                const hasValidImage = movie.source === 'IMDb'
                    ? (node.cast ? castMember?.profilePath : castMember?.primaryImage?.url) // IMDb: Wrapped uses profilePath, unwrapped uses primaryImage.url
                    : (movie.source === 'TMDb' && castMember?.profilePath) // TMDb: Wrapped data (node.cast)
                    || (movie.source === 'TMDb' && castMember?.profile_path); // TMDb: Unwrapped data (credits.cast)

                if (castMember && hasValidImage && castCount < 5) {
                    castCount++;
                    const castDiv = document.createElement("div");
                    castDiv.style.textAlign = "center";
                    castDiv.style.width = "auto";
                    castDiv.style.whiteSpace = "nowrap";

                    const castImageLink = document.createElement("a");
                    let test = "test";
                    castImageLink.href = movie.source === 'IMDb'
                        ? (node.cast ? `https://www.imdb.com/name/${castMember.id}/` : `https://www.imdb.com/name/${credit.node.name.id}/`)  // IMDb: Wrapped (castMember.id), Unwrapped (credit.node.name.id)
                        : (node.cast ? `https://www.themoviedb.org/person/${castMember.id}` : `https://www.themoviedb.org/person/${credit.id}`);  // TMDb: Wrapped (castMember.id), Unwrapped (credit.id)
                    castImageLink.target = "_blank";
                    castImageLink.rel = "noreferrer";

                    const castImage = document.createElement("img");
                    castImage.src = movie.source === 'IMDb'
                        ? (node.cast ? castMember.profilePath : castMember.primaryImage.url)  // IMDb: Wrapped (profilePath), Unwrapped (primaryImage.url)
                        : (node.cast ? castMember.profilePath : `https://image.tmdb.org/t/p/w185${castMember.profile_path}`);  // TMDb: Wrapped (profilePath), Unwrapped (profile_path)
                    //castImage.alt = movie.source === 'IMDb' ? credit.node.name.nameText.text : credit.name;
                    castImage.style.maxHeight = "150px";
                    castImage.style.width = "auto";
                    castImage.style.display = "block";
                    castImageLink.appendChild(castImage);
                    castDiv.appendChild(castImageLink);

                    const castNameLink = document.createElement("a");
                    const castName = movie.source === 'IMDb'
                        ? (node.cast ? credit.name : credit.node.name.nameText.text)  // IMDb: Wrapped or unwrapped
                        : (node.cast ? credit.name : credit.name);  // TMDb: Handle both wrapped and unwrapped
                    castNameLink.href = `https://passthepopcorn.me/artist.php?artistname=${encodeURIComponent(castName)}`;
                    castNameLink.target = "_blank";
                    castNameLink.rel = "noreferrer";
                    castNameLink.textContent = castName;
                    castNameLink.style.display = "block";
                    castNameLink.style.textDecoration = "none";
                    castNameLink.style.color = "white";
                    castNameLink.style.marginTop = "10px";
                    castNameLink.style.whiteSpace = "nowrap";
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
        const releaseDate = node.releaseDate ? `${node.releaseDate.year}-${String(node.releaseDate.month).padStart(2, '0')}-${String(node.releaseDate.day).padStart(2, '0')}` : node.release_date;
        if (!releaseDate) return acc;
        const dateStr = new Date(releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(movie);
        return acc;
    }, {});

    const table = document.createElement("table");
    table.setAttribute('id', 'torrent-table');
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
                cell.setAttribute('class', 'basic-movie-list');
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
                infoDiv.setAttribute('class', 'site-link');
                infoDiv.style.whiteSpace = "nowrap"; // Prevent wrapping
                infoDiv.style.overflow = "hidden";   // Hide overflowed content
                infoDiv.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed content

                const titleLink = document.createElement("a");
                titleLink.href = movie.source === 'IMDb'
                    ? `https://www.imdb.com/title/${node.id}/`
                    : `https://www.themoviedb.org/movie/${node.id}`;
                titleLink.target = "_blank";
                titleLink.rel = "noreferrer";
                titleLink.textContent = node.titleText?.text || node.details?.title || node.title || node.original_title;
                titleLink.style.fontWeight = "bold";
                titleLink.style.fontSize = "1.2em";
                titleLink.style.textDecoration = "none";
                titleLink.style.color = "white";
                titleLink.style.marginBottom = "2px";
                titleLink.style.whiteSpace = "nowrap"; // Prevent wrapping
                titleLink.style.overflow = "hidden";   // Hide overflowed content
                titleLink.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed content
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
                if(movie.source === 'IMDb') {
                    ptpLink.href = `https://passthepopcorn.me/requests.php?search=${node.id || node.details?.title}`;
                }
                if(movie.source === 'TMDb') {
                    ptpLink.href = `https://passthepopcorn.me/requests.php?search=${node.details?.title || node.titleText?.text}`;
                }
                ptpLink.target = "_blank";
                ptpLink.textContent = "(Search PTP requests)";
                ptpLink.style.float = "right";
                ptpLink.style.fontSize = "0.9em";
                infoDiv.appendChild(ptpLink);

                const genres = document.createElement("p");
                const genresList = node.genres?.genres || node.details?.genres || [];
                genresList.forEach(genre => {
                    const genreLink = document.createElement("a");
                    genreLink.href = `https://passthepopcorn.me/torrents.php?action=advanced&taglist=${genre.text || genre.name}`;
                    genreLink.textContent = genre.text || genre.name;
                    genreLink.style.color = "white";
                    genreLink.style.marginRight = "10px";
                    genreLink.style.whiteSpace = "nowrap"; // Prevent wrapping
                    genreLink.style.overflow = "hidden";   // Hide overflowed content
                    genreLink.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed content
                    genres.appendChild(genreLink);
                });
                infoDiv.appendChild(genres);

                const castContainer = document.createElement("div");
                castContainer.setAttribute('class', 'cast-list');
                castContainer.style.display = "flex";
                castContainer.style.flexWrap = "nowrap"; // Prevent wrapping
                castContainer.style.overflow = "auto";   // Allow horizontal scrolling if needed
                castContainer.style.gap = "10px";

                let castCount = 0;

                // Handle IMDb or TMDb cast lists for both wrapped and unwrapped data
                const creditsList = movie.source === 'IMDb'
                    ? (node.cast || node.credits?.edges || [])  // IMDb: Handle wrapped and unwrapped data
                    : (node.cast || node.details?.credits?.cast || []);  // TMDb: Handle wrapped (node.cast) and unwrapped (node.details.credits.cast)

                creditsList.forEach(credit => {
                    // IMDb case: Check if it's wrapped (node.cast) or unwrapped (credits.edges)
                    const castMember = movie.source === 'IMDb'
                        ? (node.cast ? credit : nameImagesData.find(name => name.id === credit.node.name.id)) // IMDb: Handle wrapped and unwrapped
                        : (node.cast ? credit : credit);  // TMDb: Handle wrapped (node.cast) and unwrapped (credit)

                    if (castMember && castCount < 5) {
                        castCount++;

                        // Create a div to hold the cast member details
                        const castDiv = document.createElement("div");
                        castDiv.style.textAlign = "center";
                        castDiv.style.width = "auto";
                        castDiv.style.whiteSpace = "nowrap";

                        // Create a clickable link for the cast member
                        const castNameLink = document.createElement("a");

                        // Get the cast name based on whether the data is wrapped or not for both IMDb and TMDb
                        const castName = movie.source === 'IMDb'
                            ? (node.cast ? credit.name : credit.node.name.nameText.text)  // IMDb: Wrapped or unwrapped
                            : (node.cast ? credit.name : credit.name);  // TMDb: Handle both wrapped and unwrapped

                        castNameLink.href = `https://passthepopcorn.me/artist.php?artistname=${encodeURIComponent(castName)}`;
                        castNameLink.target = "_blank";
                        castNameLink.textContent = castName;
                        castNameLink.style.display = "block";
                        castNameLink.style.textDecoration = "none";
                        castNameLink.style.color = "white";
                        castNameLink.style.marginTop = "10px";
                        castNameLink.style.whiteSpace = "nowrap";

                        // Append the cast name link to the div
                        castDiv.appendChild(castNameLink);

                        // Append the cast div to the container
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

    // Define the maximum number of page ranges to display
    const maxPageRanges = 5;

    // Calculate the start and end page range to display
    const startPage = Math.max(1, currentPage - Math.floor(maxPageRanges / 2));
    const endPage = Math.min(totalPages, startPage + maxPageRanges - 1);

    const paginationContent = (currentPage) => {
        let html = "";

        // First and Previous links
        if (currentPage > 1) {
            html += `<a href="#" class="pagination__link pagination__link--first" data-page="1">&lt;&lt; First</a> `;
            html += `<a href="#" class="pagination__link pagination__link--prev" data-page="${currentPage - 1}">&lt; Previous</a> `;
        }

        // Page range links (up to 5)
        for (let page = startPage; page <= endPage; page++) {
            const pageStart = (page - 1) * resultsPerPage + 1;
            const pageEnd = Math.min(page * resultsPerPage, totalResults);

            if (page === currentPage) {
                html += ` <span class="pagination__current-page">${pageStart}-${pageEnd}</span> `;
            } else {
                html += ` <a href="#" class="pagination__link pagination__link--page" data-page="${page}">${pageStart}-${pageEnd}</a> `;
            }

            if (page < endPage) {
                html += ' | ';
            }
        }

        // Next and Last links
        if (currentPage < totalPages) {
            html += ` | <a href="#" class="pagination__link pagination__link--next" data-page="${currentPage + 1}">Next &gt;</a>`;
            html += ` <a href="#" class="pagination__link pagination__link--last" data-page="${totalPages}">Last &gt;&gt;</a>`;
        }

        return html;
    };

    // Update the pagination elements
    paginationTop.innerHTML = paginationContent(currentPage);
    paginationBottom.innerHTML = paginationContent(currentPage);

    // Add event listeners for the pagination links
    const paginationLinks = document.querySelectorAll(".pagination__link");
    paginationLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const targetPage = parseInt(link.getAttribute("data-page"));
            GM_setValue(CURRENT_PAGE_KEY, targetPage);
            displayResults(targetPage);
            document.dispatchEvent(radarrSignal);
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

const handleSearchForm = (filteredDateData) => {
    const searchForm = document.querySelector("#filter_torrents_form");

    if (searchForm) {
        //console.log("Form found");

        const searchInput = searchForm.querySelector('input[title="Movie name or IMDb link"]');
        const tagInput = searchForm.querySelector('#tags');
        const castInput = searchForm.querySelector('input[title="Comma-separated cast names"]');

        // Log field detection
        //searchInput ? console.log("Search input found:", searchInput) : console.log("Search input NOT found");
        //tagInput ? console.log("Tag input found:", tagInput) : console.log("Tag input NOT found");
        //castInput ? console.log("Cast input found:", castInput) : console.log("Cast input NOT found");

        searchForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const searchstr = searchInput?.value || "";
            const taglist = tagInput?.value || "";
            const castlist = castInput?.value || "";

            //console.log("Search string:", searchstr);
            //console.log("Tag list:", taglist);
            //console.log("Cast list:", castlist);

            const tagsType = document.querySelector('input[name="tags_type"]:checked')?.value || "all";

            const cachedIMDbData = getCache(CACHE_KEY_IMDB);
            const cachedTMDBData = getCache(CACHE_KEY_TMDB);
            const cachednamesData = getCache(NAME_IMAGES_CACHE_KEY);
            //console.log("IMDb cache:", cachedIMDbData);
            //console.log("TMDB cache:", cachedTMDBData);
            //console.log("Names cache:", cachednamesData);

            if (cachedIMDbData && cachedIMDbData.edges && cachedTMDBData) {
                let filterIMDbData = cachedIMDbData.edges;
                let filterTMDBData = cachedTMDBData;

                // Search string filtering
                if (searchstr) {
                    filterIMDbData = filterIMDbData.filter(movie =>
                        movie.node.titleText?.text?.toLowerCase().includes(searchstr.toLowerCase())
                    );
                    filterTMDBData = filterTMDBData.filter(movie =>
                        movie.title?.toLowerCase().includes(searchstr.toLowerCase())
                    );
                }

                // Tag filtering
                if (taglist) {
                    const tags = taglist.split(',').map(tag => tag.trim().toLowerCase());

                    // IMDb tag filtering
                    filterIMDbData = filterIMDbData.filter(movie => {
                        const movieTags = movie.node.genres?.genres?.map(genre => genre.text?.toLowerCase()) || [];
                        return tagsType === "any"
                            ? tags.some(tag => movieTags.includes(tag))
                            : tags.every(tag => movieTags.includes(tag));
                    });

                    // TMDb tag filtering
                    filterTMDBData = filterTMDBData.filter(movie => {
                        // Safely retrieve genre names in lowercase
                        const movieTags = movie.details?.genres?.map(genre => genre.name?.toLowerCase()) || [];

                        // Log the genres and movie details for debugging
                        //console.log(`Movie ID: ${movie.id}, Title: ${movie.title}, Genres:`, movieTags);

                        // Filter based on the type of tag matching (either 'any' or 'all')
                        return tagsType === "any"
                            ? tags.some(tag => movieTags.includes(tag.toLowerCase()))  // Match any tag
                            : tags.every(tag => movieTags.includes(tag.toLowerCase()));  // Match all tags
                    });
                }

                // Cast filtering
                if (castlist) {
                    const casts = castlist.split(',').map(cast => cast.trim().toLowerCase());

                    // IMDb cast filtering
                    filterIMDbData = filterIMDbData.filter(movie => {
                        if (!movie.node || !movie.node.credits?.edges) {
                            console.warn("Skipping IMDb movie without credits:", movie);
                            return false; // Skip movies without credits or node
                        }
                        const movieCasts = movie.node.credits.edges.map(credit => credit.node.name.nameText.text.toLowerCase());
                        return casts.some(cast => movieCasts.some(movieCast => movieCast.includes(cast)));
                    });

                    // TMDb cast filtering
                    filterTMDBData = filterTMDBData.filter(movie => {
                        if (!movie.details?.credits?.cast) {
                            console.warn("Skipping TMDb movie without cast details:", movie);
                            return false; // Skip movies without cast details
                        }
                        const movieCasts = movie.details.credits.cast.map(cast => cast.name?.toLowerCase());
                        return casts.some(cast => movieCasts.some(movieCast => movieCast.includes(cast)));
                    });
                }

                // Cast filtering and data mapping for IMDb
                filterIMDbData = filterIMDbData.map(movie => {
                    // Extract cast details and map profile paths from cachednamesData
                    const movieCasts = movie.node.credits?.edges?.map(castMember => {
                        const castId = castMember.node.name.id;
                        const cachedCast = cachednamesData.find(cachedName => cachedName.id === castId);

                        return {
                            name: castMember.node.name.nameText.text,
                            id: castMember.node.name.id,
                            category: castMember.node.category?.text || '',
                            character: castMember.node.title?.titleText?.text || '', // Character
                            profilePath: cachedCast ? cachedCast.primaryImage?.url : null // Map the profile image URL from cache
                        };
                    }) || [];

                    // Map remaining movie details
                    return {
                        node: {
                            id: movie.node.id,
                            titleText: { text: movie.node.titleText?.text || '' },
                            releaseDate: {
                                day: movie.node.releaseDate?.day || null,
                                month: movie.node.releaseDate?.month || null,
                                year: movie.node.releaseDate?.year || null
                            },
                            genres: {
                                genres: movie.node.genres?.genres?.map(genre => ({ text: genre.text })) || []
                            },
                            primaryImage: {
                                url: movie.node.primaryImage?.url || null
                            },
                            plot: { plotText: { text: movie.node.plot?.plotText?.plainText || '' } },
                            popularity: movie.node.popularity || 0,
                            imdbId: movie.node.id,
                            spokenLanguages: movie.node.spokenLanguages?.map(lang => lang.id) || [],
                            cast: movieCasts,  // Use the new cast with profile paths
                            crew: movie.node.credits?.edges?.map(crewMember => ({
                                name: crewMember.node.name.nameText.text,
                                job: crewMember.node.job?.text || ''
                            })) || []
                        },
                        source: 'IMDb'
                    };
                });

                filterTMDBData = filterTMDBData.map(movie => ({
                    node: {
                        id: movie.id,
                        titleText: { text: movie.title || movie.original_title },
                        releaseDate: {
                            day: movie.release_date ? new Date(movie.release_date).getDate() : null,
                            month: movie.release_date ? new Date(movie.release_date).getMonth() + 1 : null,
                            year: movie.release_date ? new Date(movie.release_date).getFullYear() : null
                        },
                        genres: {
                            genres: movie.details?.genres?.map(genre => ({ text: genre.name })) || []
                        },
                        primaryImage: {
                            url: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : null
                        },
                        plot: { plotText: { text: movie.overview || '' } },
                        popularity: movie.popularity || 0,
                        imdbId: movie.external_ids?.imdb_id || null,
                        spokenLanguages: movie.spoken_languages?.map(lang => lang.iso_639_1) || [],

                        // Correctly map cast and crew from movie.details.credits
                        cast: movie.details?.credits?.cast?.map(castMember => ({
                            name: castMember.name,
                            id: castMember.id,
                            character: castMember.character || '',
                            profilePath: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : null
                        })) || [],
                        crew: movie.details?.credits?.crew?.map(crewMember => ({
                            name: crewMember.name,
                            job: crewMember.job || ''
                        })) || []
                    },
                    source: 'TMDb'
                }));

                //console.log("Filtered IMDB data:", filterIMDbData);
                //console.log("Filtered TMDB data:", filterTMDBData);

                // Handle no filters
                if (!searchstr && !taglist && !castlist) {
                    filterIMDbData = null;
                    filterTMDBData = null;
                    GM_setValue(FILTERED_CACHE_KEY, null);
                    displayResults(1);
                    document.dispatchEvent(radarrSignal);
                    return;
                }
                // Combine IMDb and TMDb results (optional: you can adjust based on needs)
                const combinedResults = [...filterIMDbData, ...filterTMDBData];

                // Cache and display the filtered results
                GM_setValue(FILTERED_CACHE_KEY, { edges: combinedResults });
                document.dispatchEvent(radarrSignal);
                displayResults(1);
            } else {
                console.log("No cached data available.");
            }
        });

    } else {
        console.log("Search form not found.");
    }
};

const displayResults = async (page) => {
    try {
        const fetchAndProcessData = async () => {
            const filteredALLData = GM_getValue(FILTERED_CACHE_KEY); // Use filtered data if available
            const cachedIMDbData = getCache(CACHE_KEY_IMDB);
            const cachedTMDBData = getCache(CACHE_KEY_TMDB);
            const layout = GM_getValue(LAYOUT_KEY, LAYOUT_ORIGINAL);
            const resultType = GM_getValue(RESULT_TYPE_KEY, 'All');
            let imdbData = [];
            let tmdbData = [];

            // Process filtered data directly without deduplication
            if (filteredALLData) {
                imdbData = filteredALLData.edges
                    .filter(edge => edge.source === 'IMDb')
                    .map(edge => ({ ...edge, source: 'IMDb' }));

                tmdbData = filteredALLData.edges
                    .filter(edge => edge.source === 'TMDb')
                    .map(edge => ({ ...edge, source: 'TMDb' }));

                //console.log("Filtered data being used.");
            } else {
                // Use cached unfiltered data directly (already deduplicated in the caching step)
                if (resultType === 'Theatrical' || resultType === 'All') {
                    if (cachedIMDbData) {
                        imdbData = cachedIMDbData.edges.map(edge => ({ ...edge, source: 'IMDb' }));
                    }
                }

                if (resultType === 'Digital' || resultType === 'All') {
                    if (cachedTMDBData) {
                        tmdbData = cachedTMDBData.map(movie => ({
                            node: movie,
                            source: 'TMDb'
                        }));
                    }
                }

                //console.log("Cached unfiltered data being used.");
            }

            // Combine IMDb and TMDb results
            const combinedResults = [...imdbData, ...tmdbData];

            // Sort the combined data by release date
            const sortedData = sortCombinedDataByDate(combinedResults);

            //console.log("Cached IMDB data", cachedIMDbData);
            //console.log("Cached TMDB data", cachedTMDBData);
            //console.log("Final sorted data:", sortedData);

            // Display results based on layout
            if (layout === LAYOUT_ORIGINAL) {
                displayResultsOriginal(page, { edges: sortedData }, 'All');
            } else if (layout === LAYOUT_CONDENSED) {
                displayResultsCondensed(page, { edges: sortedData }, 'All');
            }

            if (aCacheWasCleared === 1) {
                setTimeout(() => {
                    document.dispatchEvent(radarrSignal);
                }, 500);
            }
        };

        // Fetch and process data
        await fetchAndProcessData();

    } catch (error) {
        container.innerHTML = "<p style='color: red; font-size: 1.5em; text-align: center;'>Failed to load data. Please try again later.</p>";
        console.error("Error loading data:", error); // Log the error for debugging
    }
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
        layoutToggle.type = "submit";
        layoutToggle.style.marginLeft = "10px";
        layoutToggle.setAttribute('value', 'Toggle Layout');
        searchFormFooter.appendChild(layoutToggle);

        layoutToggle.addEventListener("click", () => {
            const currentLayout = GM_getValue(LAYOUT_KEY, LAYOUT_ORIGINAL);
            const newLayout = currentLayout === LAYOUT_ORIGINAL ? LAYOUT_CONDENSED : LAYOUT_ORIGINAL;
            GM_setValue(LAYOUT_KEY, newLayout);
            displayResults(GM_getValue(CURRENT_PAGE_KEY, 1));
            document.dispatchEvent(radarrSignal);
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
        clearCacheButton.type = "submit";
        clearCacheButton.style.marginLeft = "10px";
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
            document.dispatchEvent(radarrSignal);
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

const init = () => {
    const currentPage = GM_getValue(CURRENT_PAGE_KEY, 1);
    const cacheExpirationIMDb = GM_getValue(CACHE_EXPIRATION_KEY_IMDB, 0);
    const cacheExpirationTMDb = GM_getValue(CACHE_EXPIRATION_KEY_TMDB, 0);

    if (Date.now() > cacheExpirationIMDb) {
        clearCache('IMDb');
        clearCache('TMDb');
        Promise.all([
            fetchAllComingSoonData(),
            fetchUpcomingDigitalMovies()
        ]).then(() => {
            // After both fetch functions complete, display results
            displayResults(currentPage);
            GM_setValue(CACHE_EXPIRATION_KEY_TMDB, Date.now() + 4 * 24 * 60 * 60 * 1000);
            GM_setValue(CACHE_EXPIRATION_KEY_IMDB, Date.now() + 4 * 24 * 60 * 60 * 1000);
        }).catch(error => {
            console.error("Error fetching data:", error);
            // Handle error if needed
        });
    } else {
        const cachedDataIMDb = getCache(CACHE_KEY_IMDB);
        const cachedDataTMDB = getCache(CACHE_KEY_TMDB);
        const nameImagesData = getCache(NAME_IMAGES_CACHE_KEY);
        if (cachedDataIMDb && cachedDataIMDb.edges.length > 0 && nameImagesData) {
            displayResults(currentPage);
        } else {
            fetchAllComingSoonData();
            fetchUpcomingDigitalMovies()
            Promise.all([
                fetchAllComingSoonData(),
                fetchUpcomingDigitalMovies()
            ]).then(() => {
                // After both fetch functions complete, display results
                displayResults(currentPage);
                GM_setValue(CACHE_EXPIRATION_KEY_TMDB, Date.now() + 4 * 24 * 60 * 60 * 1000);
                GM_setValue(CACHE_EXPIRATION_KEY_IMDB, Date.now() + 4 * 24 * 60 * 60 * 1000);
            }).catch(error => {
                console.error("Error fetching data:", error);
                // Handle error if needed
            });
        }
    }

    document.dispatchEvent(radarrSignal);
    updateSearchForm();
    handleSearchForm();
};

window.addEventListener('load', function() {
    addLightboxStyles();
    addSpinnerStyles();
    initLightbox();
    init();
    bindKeyBindings();
});

})();