// ==UserScript==
// @name         PTP - Add to collage from search
// @version      1.3
// @description  Search for torrents matching a collection, filter and add, with caching
// @namespace    https://github.com/Audionut/add-trackers
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-collage-add.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-collage-add.js
// @match        https://passthepopcorn.me/torrents.php?action=*
// @match        https://passthepopcorn.me/torrents.php?page=*&action=*
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

(function() {
    'use strict';

    const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 1 month in milliseconds

    function getCollageCache(collageId) {
        const compressedData = GM_getValue(`collage_${collageId}`, null);
        if (!compressedData) return null;

        const decompressedData = LZString.decompress(compressedData);
        const { timestamp, data } = JSON.parse(decompressedData);

        if (Date.now() - timestamp > CACHE_EXPIRATION_MS) {
            // Cache expired, return null to indicate the cache should be refreshed
            return null;
        }

        return data;
    }

    function setCollageCache(collageId, data) {
        const cacheEntry = {
            timestamp: Date.now(),
            data
        };
        const compressedData = LZString.compress(JSON.stringify(cacheEntry));
        GM_setValue(`collage_${collageId}`, compressedData);
    }

    const CURRENTPAGE_CACHE_EXPIRATION = 10 * 60 * 1000; // 10 minutes in milliseconds

    function setCurrentPageCache(collageId) {
        const timestamp = Date.now(); // Current time in milliseconds
        GM_setValue('currentpage_collageid', collageId);
        GM_setValue('currentpage_timestamp', timestamp); // Set a unique timestamp for this key
    }

    function getCurrentPageCache() {
        const cachedCollageId = GM_getValue('currentpage_collageid');
        const cachedTimestamp = GM_getValue('currentpage_timestamp');
        const now = Date.now();

        // Check if the currentpage cache is still valid
        if (cachedCollageId && cachedTimestamp && (now - cachedTimestamp) < CURRENTPAGE_CACHE_EXPIRATION) {
            return cachedCollageId;
        } else {
            // Cache expired or not set; clear the currentpage cache and return null
            GM_deleteValue('currentpage_collageid');
            GM_deleteValue('currentpage_timestamp');
            return null;
        }
    }

    function showLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.classList.add('loading-container');
        spinner.innerHTML = `
            <div class="spinner"></div>
            <p>Fetching titles from collection...</p>
        `;
        ul.innerHTML = ''; // Clear previous results
        ul.appendChild(spinner);
    }

    function hideLoadingSpinner() {
        const spinner = ul.querySelector('.loading-container');
        if (spinner) {
            spinner.remove();
        }
    }

    async function fetchAndCacheCollage(collageId) {
        showLoadingSpinner(); // Show the loading spinner when fetching starts

        const response = await fetch(`https://passthepopcorn.me/collages.php?id=${collageId}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const collageData = {
            name: doc.querySelector('h2.page__title').textContent,
            links: Array.from(doc.querySelectorAll('#collection_movielist .list a[href*="torrents.php?id="]'))
                .map(link => new URL(link.href, 'https://passthepopcorn.me').origin + new URL(link.href).pathname + "?id=" + new URL(link.href).searchParams.get("id"))
        };

        setCollageCache(collageId, collageData); // Cache the fetched data

        hideLoadingSpinner(); // Hide the loading spinner after fetching completes
        return collageData;
    }

    async function fetchAndDisplayCollage(collageId) {
        // Check if we're on the match page
        const currentUrl = window.location.href;
        const isMatchPage = /https:\/\/passthepopcorn\.me\/torrents\.php\?action=/.test(currentUrl);
        const isRefreshedPage = /https:\/\/passthepopcorn\.me\/torrents\.php\?page=.*&action=/.test(currentUrl);

        // Set a new cache key if we're on the match page
        if (isMatchPage) {
            setCurrentPageCache(collageId);
        }

        // Proceed only if we have a collageId
        if (!collageId) {
            console.warn('No collage ID found for the current page.');
            return;
        }

        // Try to retrieve the collage data from the cache first
        let collageData = getCollageCache(collageId);
        if (!collageData) {
            // Fetch and cache if data is not in cache or is expired
            collageData = await fetchAndCacheCollage(collageId);
        }

        const collageName = collageData.name;

        // Display collage name with target="_blank"
        panelHeaderTitle.innerHTML = `Releases not in selected collection: <a href="https://passthepopcorn.me/collages.php?id=${collageId}" target="_blank" style="font-weight: bold; color: yellow;">${collageName}</a>`;

        const antiCsrfToken = document.body.getAttribute('data-anticsrftoken');

        // Ensure links are loaded before filtering
        if (!links || links.length === 0) {
            console.warn('No links found on the page to filter.');
            return;
        }

        const uniqueUrls = new Set();
        const filteredLinks = links.filter(link => {
            const url = new URL(link.href);
            const baseLink = url.origin + url.pathname + "?id=" + url.searchParams.get("id");

            // Ensure link is not in collage data and is unique
            const isUnique = !uniqueUrls.has(baseLink);
            if (isUnique && !collageData.links.includes(baseLink)) {
                uniqueUrls.add(baseLink); // Track unique links
                return true;
            }
            return false;
        });

        ul.innerHTML = '';
        if (filteredLinks.length > 0) {
            filteredLinks.forEach(link => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = link.href;
                a.textContent = `${link.title} ${link.year} by ${link.director}`;
                a.target = "_blank"; // Open in new tab
                a.style.display = 'inline-block';
                a.style.marginRight = '10px';

                const addButton = document.createElement('input');
                addButton.type = "submit";
                addButton.setAttribute('value', 'Add to collection');
                addButton.onclick = async function() {
                    if (confirm(`Add ${link.title} to collage?`)) {
                        try {
                            const formData = new FormData();
                            formData.append('AntiCsrfToken', antiCsrfToken);
                            formData.append('action', 'add_torrent');
                            formData.append('collageid', collageId);
                            formData.append('url', link.href);

                            await fetch('https://passthepopcorn.me/collages.php', {
                                method: 'POST',
                                body: formData
                            });

                            // Update the cache with the new link
                            collageData.links.push(link.href);
                            setCollageCache(collageId, collageData);

                            alert(`${link.title} added to collage.`);
                        } catch (error) {
                            console.error('Failed to add torrent to collage:', error);
                            alert('Error adding torrent to collage.');
                        }
                    }
                };

                li.appendChild(a);
                li.appendChild(addButton);
                ul.appendChild(li);
            });
        } else {
            const noResults = document.createElement('li');
            noResults.textContent = 'No links found after filtering.';
            ul.appendChild(noResults);
        }
    }

    // When retrieving the currentpage cache, use the unique expiration time
    window.addEventListener("load", () => {
        const currentUrl = window.location.href;
        const isPagedUrl = /https:\/\/passthepopcorn\.me\/torrents\.php\?page=.*&action=/.test(currentUrl);

        if (isPagedUrl) {
            const cachedCollageId = getCurrentPageCache();

            if (cachedCollageId) {
                fetchAndDisplayCollage(cachedCollageId);
            }
        }
    });

    // Add styles for the spinner
    const style = document.createElement('style');
    style.textContent = `
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 20px;
            font-size: 1em;
            color: #ffffff;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #ffffff;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Original functionality for finding title rows
    const allTitleRows = document.querySelectorAll('.basic-movie-list__movie__title-row');
    const links = Array.from(allTitleRows).map(row => {
        const link = row.querySelector('a.basic-movie-list__movie__title');
        const year = row.querySelector('.basic-movie-list__movie__year').textContent;
        const director = row.querySelector('.basic-movie-list__movie__director-list').textContent;
        return { href: link.href, title: link.textContent, year, director };
    });

    const targetDiv = document.getElementById('torrents-movie-view');
    if (!targetDiv) {
        console.warn('Target div with id "torrents-movie-view" not found.');
        return;
    }

    const panel = document.createElement('div');
    panel.classList.add('panel');
    panel.id = 'collage_add';

    const panelHeader = document.createElement('div');
    panelHeader.classList.add('panel__heading');

    const panelHeaderTitle = document.createElement('span');
    panelHeaderTitle.classList.add('panel__heading__title');
    panelHeaderTitle.textContent = 'Filter shown torrents by a collection id';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.placeholder = 'Input Collage ID...';
    inputBox.style = 'float:right;margin-right:10px;font-size:0.9em';

    const filterButton = document.createElement('input');
    filterButton.type = "submit";
    filterButton.setAttribute('value', 'Filter torrents');
    filterButton.style = 'float:right;font-size:0.9em';

    const findCollectionsButton = document.createElement('input');
    findCollectionsButton.type = "submit";
    findCollectionsButton.setAttribute('value', 'Find all matching collections');
    findCollectionsButton.style = 'float:right;font-size:0.9em;margin-right:10px;';

    panelHeader.appendChild(findCollectionsButton);
    panelHeader.appendChild(inputBox);
    panelHeader.appendChild(filterButton);
    panelHeader.appendChild(panelHeaderTitle);
    panel.appendChild(panelHeader);

    const panelBody = document.createElement('div');
    panelBody.classList.add('panel__body');
    const ul = document.createElement('ul');
    ul.style.padding = '10px';
    panelBody.appendChild(ul);
    panel.appendChild(panelBody);
    targetDiv.parentNode.insertBefore(panel, targetDiv);

    filterButton.onclick = async function() {
        const collageId = inputBox.value.trim();
        if (collageId) {
            try {
                await fetchAndDisplayCollage(collageId);
            } catch (error) {
                console.error('Failed to load Collage ID content:', error);
                alert('Error loading Collage ID content.');
            }
        } else {
            alert('Please enter a Collage ID.');
        }
    };

    findCollectionsButton.onclick = async function() {
        const editionTitleInput = document.getElementById('edition_title');
        if (editionTitleInput && editionTitleInput.value.trim()) {
            const searchQuery = encodeURIComponent(editionTitleInput.value.trim());
            const searchUrl = `https://passthepopcorn.me/collages.php?action=search&search=${searchQuery}`;
            try {
                const response = await fetch(searchUrl);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const matchingCollages = Array.from(doc.querySelectorAll('a[href^="collages.php?id="]'))
                    .map(link => ({ id: link.href.match(/id=(\d+)/)[1], name: link.textContent }));

                ul.innerHTML = '';
                if (matchingCollages.length > 0) {
                    matchingCollages.forEach(collage => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = `https://passthepopcorn.me/collages.php?id=${collage.id}`;
                        a.textContent = collage.name;
                        a.target = "_blank"; // Open in new tab
                        a.style.cursor = 'pointer';
                        a.onclick = async function(event) {
                            event.preventDefault();
                            await fetchAndDisplayCollage(collage.id);
                        };

                        li.appendChild(a);
                        ul.appendChild(li);
                    });
                } else {
                    const noResults = document.createElement('li');
                    noResults.textContent = 'No matching collections found.';
                    ul.appendChild(noResults);
                }
            } catch (error) {
                console.error('Failed to load matching collections:', error);
                alert('Error loading matching collections.');
            }
        } else {
            alert('Please ensure there is a value in the "Edition Title" field.');
        }
    };

})();