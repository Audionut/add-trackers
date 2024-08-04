// ==UserScript==
// @name         PTP Artist Image Enhancer
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0
// @description  Fetch and display IMDb images for artists
// @match        https://passthepopcorn.me/artist.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function() {
    'use strict';

    // Helper function to fetch image URLs from IMDb API
    const fetchImageUrls = async (nameIds, callback) => {
        const cacheKey = `imdb_images_${nameIds[0]}`;
        const cachedData = await GM.getValue(cacheKey);
        if (cachedData) {
            console.log("Using cached data for artist images");
            callback(JSON.parse(cachedData));
            return;
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    names(ids: ${JSON.stringify(nameIds)}) {
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

        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify(query),
            onload: async function (response) {
                if (response.status >= 200 && response.status < 300) {
                    const data = JSON.parse(response.responseText);
                    await GM.setValue(cacheKey, JSON.stringify(data.data.names));
                    callback(data.data.names);
                } else {
                    console.error("Failed to fetch image URLs", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    // Helper function to add a new panel with the fetched image URLs
    const addImagePanel = (names) => {
        if (names.length > 0) {
            const nameData = names[0];
            const primaryImage = nameData.primaryImage ? nameData.primaryImage.url : null;
            const images = nameData.images.edges.map(edge => edge.node.url);
            if (primaryImage) {
                images.unshift(primaryImage);
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
                    existingPanel.onclick = () => { lightbox.init(existingPanel, 220); };

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

                // Function to cycle through images every 5 seconds
                let currentIndex = 0;
                existingPanel.src = images[currentIndex];
                setInterval(() => {
                    currentIndex = (currentIndex + 1) % images.length;
                    existingPanel.src = images[currentIndex];
                }, 5000);
            }
        } else {
            console.error("No images found for the artist");
        }
    };

    // Main function to initialize the script
    const init = () => {
        const artistInfoPanel = document.querySelector('#artistinfo');
        if (artistInfoPanel) {
            const imdbLink = artistInfoPanel.querySelector('a[href*="http://www.imdb.com/name/"]');
            if (imdbLink) {
                const imdbUrl = new URL(imdbLink.href);
                const imdbId = imdbUrl.pathname.split('/')[2];
                fetchImageUrls([imdbId], addImagePanel);
            }
        }
    };

    // Run the script once the page is fully loaded
    window.addEventListener('load', init);
})();