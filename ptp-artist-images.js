// ==UserScript==
// @name         PTP Artist Image Enhancer
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.2
// @description  Fetch and display IMDb images and details for artists
// @match        https://passthepopcorn.me/artist.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Compress and set cache with expiration
    const setCache = async (key, data) => {
        const cacheData = {
            timestamp: Date.now(),
            data: LZString.compress(JSON.stringify(data)) // Compress the data before storing
        };
        await GM.setValue(key, JSON.stringify(cacheData));
    };

    // Decompress and get cache with expiration check
    const getCache = async (key) => {
        const cached = await GM.getValue(key, null);
        if (cached) {
            const cacheData = JSON.parse(cached);
            const currentTime = Date.now();

            // Check if the cache is expired
            if (currentTime - cacheData.timestamp < CACHE_DURATION) {
                const decompressedData = LZString.decompress(cacheData.data);
                return JSON.parse(decompressedData); // Return the decompressed and parsed data
            } else {
                console.log("Cache expired for key:", key);
                return null; // Cache expired, return null
            }
        }
        return null; // No cache found
    };

    const calculateAge = (birthDate) => {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateStr) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, options);
    };

    const fetchDetails = async (imdbID, data) => {
        const cacheKey = `imdb_details_${imdbID}`;

        // Check the cache first
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            console.log("Using cached data for artist details");
            return cachedData;
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    name(id: "${imdbID}") {
                        akas(first: 5) {
                            total
                            edges {
                                node {
                                    text
                                }
                            }
                        }
                        bio {
                            text {
                                plainText
                            }
                        }
                        birthDate {
                            date
                        }
                        deathDate {
                            date
                        }
                        prestigiousAwardSummary {
                            wins
                            nominations
                        }
                        id
                        nameText {
                            text
                        }
                        primaryImage {
                            url
                        }
                        images(first: 30) {
                            edges {
                                node {
                                    url
                                }
                            }
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
                data: JSON.stringify(query),
                onload: async function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const data = JSON.parse(response.responseText);
                            //console.log("Live data received:", data);

                            // Cache the data with expiration
                            setCache(cacheKey, data.data);
                            resolve(data.data); // Resolve with the fetched data
                        } catch (error) {
                            console.error("Error parsing IMDb response:", error); // Log parsing error
                            reject(new Error("Failed to parse IMDb response"));
                        }
                    } else {
                        console.error("Failed to fetch details, status:", response.status); // Log failure
                        reject(new Error(`Failed to fetch details, status: ${response.status}`));
                    }
                },
                onerror: function (response) {
                    console.error("Request error", response); // Log request error
                    reject(new Error("Request error"));
                }
            });
        });
    };

    const addDetailsToPanel = (details) => {
        const artistInfoPanel = document.querySelector('#artistinfo');
        if (artistInfoPanel) {
            const panelBody = artistInfoPanel.querySelector('.panel__body ul');
            if (!panelBody) return;

            const existingText = panelBody.innerText.toLowerCase();
            const bioText = details.bio && details.bio.text.plainText ? details.bio.text.plainText : null;
            const birthDate = details.birthDate ? formatDate(details.birthDate.date) : null;
            const deathDate = details.deathDate ? formatDate(details.deathDate.date) : null;
            const age = details.birthDate ? calculateAge(details.birthDate.date) : null;
            const awards = details.prestigiousAwardSummary ?
                `Wins: ${details.prestigiousAwardSummary.wins || "N/A"}, Nominations: ${details.prestigiousAwardSummary.nominations || "N/A"}`
                : null;
            const akas = details.akas && details.akas.edges.length > 0 ? details.akas.edges.map(edge => edge.node.text).join(', ') : null;

            if (birthDate && !existingText.includes('born:')) {
                const birthItem = document.createElement('li');
                birthItem.innerHTML = `<strong>Born:</strong> ${birthDate} (age: ${age || 'N/A'})`;
                panelBody.appendChild(birthItem);
            }

            if (deathDate && !existingText.includes('died:')) {
                const deathItem = document.createElement('li');
                deathItem.innerHTML = `<strong>Died:</strong> ${deathDate}`;
                panelBody.appendChild(deathItem);
            }

            if (akas && !existingText.includes('akas:')) {
                const akasItem = document.createElement('li');
                akasItem.innerHTML = `<strong>AKAs:</strong> ${akas}`;
                panelBody.appendChild(akasItem);
            }

            if (awards && !existingText.includes('oscars:')) {
                const awardsItem = document.createElement('li');
                awardsItem.innerHTML = `<strong style="color: rgb(255, 227, 110);">Oscars:</strong> ${awards}`;
                panelBody.appendChild(awardsItem);
            }

            if (bioText && !existingText.includes('bio:')) {
                const bioItem = document.createElement('li');
                bioItem.innerHTML = `<strong>Bio:</strong> <span class="bio-text">${bioText.substring(0, 100)}</span>`;
                panelBody.appendChild(bioItem);
            }
        }
    };

    const addImagePanel = (nameData) => {
        const primaryImage = nameData.primaryImage ? nameData.primaryImage.url : null;
        const images = nameData.images && nameData.images.edges.length > 0 ? nameData.images.edges.map(edge => edge.node.url) : [];

        if (!primaryImage && images.length === 0) {
            console.log("No images available for this artist.");
            return; // Exit if no images are available
        }

        if (primaryImage) {
            images.unshift(primaryImage); // Add primary image to the start of the array
        }

        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            let existingPanel = sidebar.querySelector('.panel img.sidebar-cover-image');
            if (existingPanel) {
                images.unshift(existingPanel.src);
            } else {
                existingPanel = document.createElement('img');
                existingPanel.className = 'sidebar-cover-image';
                existingPanel.alt = nameData.nameText.text;

                const newPanel = document.createElement('div');
                newPanel.className = 'panel';

                const headingDiv = document.createElement('div');
                headingDiv.className = 'panel__heading';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'panel__heading__title';
                titleSpan.innerText = nameData.nameText.text;

                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'panel__body';

                bodyDiv.appendChild(existingPanel);
                headingDiv.appendChild(titleSpan);
                newPanel.appendChild(headingDiv);
                newPanel.appendChild(bodyDiv);
                sidebar.insertBefore(newPanel, sidebar.firstChild);
            }

            let currentIndex = 0;
            existingPanel.src = images[currentIndex];
            setInterval(() => {
                currentIndex = (currentIndex + 1) % images.length;
                existingPanel.src = images[currentIndex];
            }, 5000);
        }
    };

    const init = async () => {
        const artistInfoPanel = document.querySelector('#artistinfo');
        if (artistInfoPanel) {
            const imdbLink = artistInfoPanel.querySelector('a[href*="http://www.imdb.com/name/"]');
            if (imdbLink) {
                const imdbUrl = new URL(imdbLink.href);
                const imdbId = imdbUrl.pathname.split('/')[2];

            fetchDetails(imdbId)
                .then((data) => {
                    //console.log("Data fetched from API:", data);
                    if (data && data.name) {
                        addDetailsToPanel(data.name); // Ensure details are correctly passed
                        addImagePanel(data.name); // Ensure image panel is updated correctly
                    } else {
                        console.error("API returned incomplete or invalid data.");
                    }
                })
                .catch(error => console.error('Failed to fetch details:', error));
            }
        }
    };

    init();
})();