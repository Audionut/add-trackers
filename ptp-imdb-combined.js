// ==UserScript==
// @name         PTP - iMDB Combined Script
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1.5.1
// @description  Add many iMDB functions into one script
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-imdb-combined.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-imdb-combined.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

(function () {
    'use strict';

    // Options to display each script type
    const SHOW_SIMILAR_MOVIES = true; // Change to false to hide "Movies Like This"
    const PLACE_UNDER_CAST = false; // Put more like this under the cast list, else in the side panel
    const SHOW_TECHNICAL_SPECIFICATIONS = true; // Change to false to hide "Technical Specifications"
    const SHOW_BOX_OFFICE = true; // Change to false to hide "Box Office" data
    const SHOW_AWARDS = true; // Change to false to hide awards data
    const SHOW_SOUNDTRACKS = true; // Change to false to hide soundtracks data
    const CACHE_EXPIRY_DAYS = 7; // Default to 7 days of API cache
    const SHOW_ALTERNATE_VERSIONS = true; // Show or don't show details about different versions of the movie
    const ALTERNATE_VERSIONS_PANEL_OPEN = false; // Set to true to open the alternate versions panel by default
    const SHOW_KEYWORDS = true; // Show or don't show keywords
    const KEYWORDS_PANEL_OPEN = false; // Set to true to open the keywords panel by default
    const SHOW_PARENTS_GUIDE = true; // Show or don't show parental guide
    const isPanelVisible = true; // Show or don't show parental guide toggleable sections
    const isToggleableSections = true; // Set to true
    const hideSpoilers = true; // Hide parental guide spoilers by default
    const hidetext = false; // Hide parental guide text by default

    // order of the panels in the sidebar
    const techspecsLocation = 1;
    const boxofficeLocation = 2;
    const awardsLocation = 4;
    // move the existing tags html element
    const existingIMDBtags = 6;
    // only if displaying in sidebar
    const similarmoviesLocation = 5;
    // only if displaying parental guide
    const parentsLocation = 3

    // Function to format and move the IMDb panel
    function formatIMDbText() {
        // Find the entire IMDb panel container
        var imdbPanel = document.querySelector('div.box_tags.panel');
        var sidebar = document.querySelector('div.sidebar');

        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }

        if (imdbPanel) {
            // Find the panel heading inside the IMDb panel
            var imdbElement = imdbPanel.querySelector('.panel__heading__title');

            // Create the new formatted HTML for the heading
            var formattedHTML = '<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> tags</span>';
            // Set the inner HTML of the element to the formatted HTML
            if (imdbElement) {
                imdbElement.innerHTML = formattedHTML;
            }

            // Move the entire IMDb panel to the new location within the sidebar
            sidebar.insertBefore(imdbPanel, sidebar.childNodes[3 + existingIMDBtags]);
        }
    }
    // Run the function when the DOM is fully loaded
    window.addEventListener('load', formatIMDbText);

    var link = document.querySelector("a#imdb-title-link.rating");
    if (!link) {
        console.error("IMDb link not found");
        return;
    }

    var imdbUrl = link.getAttribute("href");
    if (!imdbUrl) {
        console.error("IMDb URL not found");
        return;
    }

    let imdbId = imdbUrl.split("/")[4];
    if (!imdbId) {
        console.error("IMDb ID not found");
        return;
    }

    // Cache duration (1 week in milliseconds)
    const CACHE_DURATION = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 1 week

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
            try {
                const cacheData = JSON.parse(cached);
                const currentTime = Date.now();

                // Check if the cache is expired
                if (currentTime - cacheData.timestamp < CACHE_DURATION) {
                    const decompressedData = LZString.decompress(cacheData.data);
                    const parsedData = JSON.parse(decompressedData);
                    if (parsedData && typeof parsedData === 'object') {
                        //console.log("Cache hit for key:", key);
                        return parsedData; // Return the decompressed and parsed data
                    } else {
                        console.error("Decompressed data is invalid:", decompressedData);
                    }
                } else {
                    console.log("Cache expired for key:", key);
                }
            } catch (error) {
                console.error("Error parsing cache for key:", key, error);
            }
        }
        return null; // No cache found or cache was invalid/expired
    };

    // Function to fetch names from IMDb API with caching
    const fetchNames = async (uniqueIds) => {
        const cacheKey = `names_data_${JSON.stringify(uniqueIds)}`;

        // Try to get cached names
        const cachedNames = await getCache(cacheKey);
        if (cachedNames) {
            console.log("Using cached compressed names");
            return cachedNames;
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    names(ids: ${JSON.stringify(uniqueIds)}) {
                        id
                        nameText {
                            text
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
                        const data = JSON.parse(response.responseText);
                        //console.log("Name ID query output:", data.data.names); // Log the output

                        // Cache the names
                        setCache(cacheKey, data.data.names);

                        resolve(data.data.names);
                    } else {
                        reject("Failed to fetch names");
                    }
                },
                onerror: function (response) {
                    reject("Request error");
                }
            });
        });
    };

    let processedSoundtracks = [];
    let idToNameMap = {};

    // Function to fetch data from IMDb API with caching and expiration
    const fetchIMDBData = async (imdbId, afterCursor = null, allAwards = []) => {
        const cacheKey = `iMDB_data_${imdbId}`;

        // Try to get cached IMDb data with compression and expiration
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            console.log("Using cached compressed IMDb data");
            if (cachedData.titleData) {
                return cachedData; // Return cached data if structure is valid
            } else {
                console.error("Cached data structure invalid. Fetching fresh data...");
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query getTitleDetails($id: ID!, $first: Int!, $after: ID) {
                    title(id: $id) {
                        soundtrack(first: 30) {
                            edges {
                                node {
                                    id
                                    text
                                    comments {
                                        markdown
                                    }
                                    amazonMusicProducts {
                                        amazonId {
                                            asin
                                        }
                                        artists {
                                            artistName {
                                                text
                                            }
                                        }
                                        format {
                                            text
                                        }
                                        productTitle {
                                            text
                                        }
                                    }
                                }
                            }
                        }
                        id
                        titleText {
                            text
                        }
                        releaseYear {
                            year
                        }
                        alternateVersions(first: 50) {
                            edges {
                                node {
                                    text {
                                        plainText
                                    }
                                }
                            }
                        }
                        keywords(first: 150) {
                            edges {
                                node {
                                    interestScore {
                                        usersInterested
                                        usersVoted
                                    }
                                    itemCategory {
                                        id
                                        itemCategoryId
                                        language { id }
                                        text
                                    }
                                    keyword {
                                        id
                                        text { text }
                                    }
                                    legacyId
                                }
                            }
                        }
                        runtimes(first: 15) {
                            edges {
                                node {
                                    id
                                    seconds
                                    displayableProperty {
                                        value {
                                            plainText
                                        }
                                    }
                                    attributes {
                                        text
                                    }
                                    country {
                                        text
                                    }
                                }
                            }
                        }
                        technicalSpecifications {
                            aspectRatios {
                                items {
                                    aspectRatio
                                    attributes {
                                        text
                                    }
                                }
                            }
                            cameras {
                                items {
                                    camera
                                    attributes {
                                        text
                                    }
                                }
                            }
                            colorations {
                                items {
                                    text
                                    attributes {
                                        text
                                    }
                                }
                            }
                            laboratories {
                                items {
                                    laboratory
                                    attributes {
                                        text
                                    }
                                }
                            }
                            negativeFormats {
                                items {
                                    negativeFormat
                                    attributes {
                                        text
                                    }
                                }
                            }
                            printedFormats {
                                items {
                                    printedFormat
                                    attributes {
                                        text
                                    }
                                }
                            }
                            processes {
                                items {
                                    process
                                    attributes {
                                        text
                                    }
                                }
                            }
                            soundMixes {
                                items {
                                    text
                                    attributes {
                                        text
                                    }
                                }
                            }
                            filmLengths {
                                items {
                                    filmLength
                                    countries {
                                        text
                                    }
                                    numReels
                                }
                            }
                        }
                        moreLikeThisTitles(first: 12) {
                            edges {
                                node {
                                    titleText {
                                        text
                                    }
                                    primaryImage {
                                        url
                                    }
                                    id
                                }
                            }
                        }
                        worldwideGross: rankedLifetimeGross(boxOfficeArea: WORLDWIDE) {
                            total {
                                amount
                            }
                            rank
                        }
                        domesticGross: rankedLifetimeGross(boxOfficeArea: DOMESTIC) {
                            total {
                                amount
                            }
                            rank
                        }
                        internationalGross: rankedLifetimeGross(boxOfficeArea: INTERNATIONAL) {
                            total {
                                amount
                            }
                            rank
                        }
                        domesticOpeningWeekend: openingWeekendGross(boxOfficeArea: DOMESTIC) {
                            gross {
                                total {
                                    amount
                                }
                            }
                            theaterCount
                            weekendEndDate
                            weekendStartDate
                        }
                        internationalOpeningWeekend: openingWeekendGross(boxOfficeArea: INTERNATIONAL) {
                            gross {
                                total {
                                    amount
                                }
                            }
                        }
                        productionBudget {
                            budget {
                                amount
                            }
                        }
                        prestigiousAwardSummary {
                            wins
                            nominations
                            award {
                                year
                                category {
                                    text
                                }
                            }
                        }
                        awardNominations(first: $first, after: $after) {
                            edges {
                                node {
                                    id
                                    award {
                                        id
                                        text
                                    }
                                    awardedEntities {
                                        ... on AwardedNames {
                                            names {
                                                id
                                                nameText {
                                                    text
                                                }
                                            }
                                        }
                                        ... on AwardedTitles {
                                            titles {
                                                id
                                                titleText {
                                                    text
                                                }
                                            }
                                        }
                                    }
                                    category {
                                        text
                                    }
                                    forEpisodes {
                                        id
                                        titleText {
                                            text
                                        }
                                    }
                                    forSongTitles
                                    isWinner
                                    notes {
                                        plainText
                                    }
                                    winAnnouncementDate {
                                        date
                                    }
                                    winningRank
                                }
                            }
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                        }
                        parentsGuide {
                            categories {
                                category {
                                    text
                                }
                                guideItems(first: 100) {
                                    edges {
                                        node {
                                            ... on ParentsGuideItem {
                                                isSpoiler
                                                text {
                                                    plainText
                                                }
                                            }
                                        }
                                    }
                                }
                                severity {
                                    text
                                }
                            }
                        }
                    }
                }
            `,
            variables: {
                id: imdbId,
                first: 250,
                after: afterCursor
            }
        };

        return new Promise(async (resolve, reject) => {
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
                        //console.log("IMDb data fetched successfully:", data); // Log the fetched data
                        if (data && data.data && data.data.title) {
                            const titleData = data.data.title;
                            const soundtracks = titleData.soundtrack.edges;
                            const alternateVersions = titleData.alternateVersions.edges;
                            const keywords = titleData.keywords.edges;

                            const awardNominations = titleData.awardNominations.edges.map(edge => edge.node);
                            allAwards.push(...awardNominations);

                            if (titleData.awardNominations.pageInfo.hasNextPage) {
                                fetchIMDBData(imdbId, titleData.awardNominations.pageInfo.endCursor, allAwards)
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                titleData.awardNominationsCombined = allAwards;
                                delete titleData.awardNominations;

                                // Extract unique IDs from comments
                                const uniqueIds = [];
                                soundtracks.forEach(edge => {
                                    edge.node.comments.forEach(comment => {
                                        const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                        if (match) {
                                            uniqueIds.push(`nm${match[1]}`);
                                        }
                                    });
                                });

                                // Fetch names for unique IDs
                                const uniqueIdSet = [...new Set(uniqueIds)];
                                const names = await fetchNames(uniqueIdSet);

                                // Map IDs to names
                                const idToNameMap = {};
                                names.forEach(name => {
                                    idToNameMap[name.id] = name.nameText.text;
                                });
                                //console.log("ID to Name Map:", idToNameMap); // Log the ID to Name mapping

                                // Process the soundtrack data
                                const processedSoundtracks = soundtracks.map(edge => {
                                    const soundtrack = edge.node;
                                    let artistName = null;
                                    let artistLink = null;
                                    let artistId = null;

                                    // Try to find "Performed by" first
                                    soundtrack.comments.forEach(comment => {
                                        const performedByMatch = comment.markdown.match(/Performed by \[link=nm(\d+)\]/);
                                        if (performedByMatch && !artistName) {
                                            artistId = `nm${performedByMatch[1]}`;
                                            artistName = idToNameMap[artistId];
                                            artistLink = `https://www.imdb.com/name/${artistId}/`;
                                            //console.log(`Matched "Performed by" ID: ${artistId}, Artist Name: ${artistName}, Artist Link: ${artistLink}`);
                                        }
                                    });

                                    // If no "Performed by" found, try to find other roles
                                    if (!artistName) {
                                        soundtrack.comments.forEach(comment => {
                                            const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                            if (match && !artistName) {
                                                artistId = `nm${match[1]}`;
                                                artistName = idToNameMap[artistId] || match[0];
                                                artistLink = `https://www.imdb.com/name/${artistId}/`;
                                            } else if (!match && !artistName) {
                                                const performedByMatch = comment.markdown.match(/Performed by (.*)/);
                                                if (performedByMatch) {
                                                    artistName = performedByMatch[1];
                                                    artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                                }
                                            }
                                        });
                                    }

                                    // Fallback to amazonMusicProducts if no artist name found
                                    if (!artistName && soundtrack.amazonMusicProducts.length > 0) {
                                        const product = soundtrack.amazonMusicProducts[0];
                                        if (product.artists && product.artists.length > 0) {
                                            artistName = product.artists[0].artistName.text;
                                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                        } else {
                                            artistName = product.productTitle.text;
                                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                        }
                                    }

                                    // Final fallback to text
                                    if (!artistName) {
                                        artistName = soundtrack.text;
                                        artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                    }

                                    return {
                                        title: soundtrack.text,
                                        artist: artistName,
                                        link: artistLink,
                                        artistId: artistId
                                    };
                                });

                                // Cache the data with compression
                                setCache(cacheKey, data);

                                // Resolve after processing soundtracks and other data
                                resolve({ titleData, processedSoundtracks, idToNameMap });
                            }
                        } else {
                            console.error("Invalid data structure", data);
                            reject(new Error("Invalid data structure"));
                        }
                    } else {
                        console.error("Failed to fetch data", response);
                        reject(new Error("Failed to fetch data"));
                    }
                },
                onerror: function (response) {
                    console.error("Request error", response);
                    reject(new Error("Request error"));
                }
            });
        });
    };

    // Function to display similar movies
    const displaySimilarMovies = (similarMovies) => {

        let style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            .panel__heading__toggler {
                margin-left: auto;
                cursor: pointer;
            }
        `;
        document.getElementsByTagName('head')[0].appendChild(style);

        var newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'similar_movies';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' More like this'));

        var toggle = document.createElement('a');
        toggle.href = 'javascript:void(0);';
        toggle.style.float = "right";
        toggle.textContent = '(Show all movies)';

        panelHeading.appendChild(title);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        var panelBody = document.createElement('div');
        panelBody.style.position = 'relative';
        panelBody.style.display = 'block';
        panelBody.style.paddingTop = "0px";
        panelBody.style.width = "100%";
        newPanel.appendChild(panelBody);

        const insertAfterElement = (referenceNode, newNode) => {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        };

        let displayMethod = '';

        if (PLACE_UNDER_CAST) {
            const targetTable = document.querySelector('.table.table--panel-like.table--bordered.table--striped');
            if (targetTable) {
                insertAfterElement(targetTable, newPanel);
                displayMethod = 'table';
            } else {
                console.error("Target table not found");
                return;
            }
        } else {
            const parentGuidePanel = document.querySelector('div.panel#parents_guide');
            if (parentGuidePanel) {
                parentGuidePanel.parentNode.insertBefore(newPanel, parentGuidePanel.nextSibling);
                displayMethod = 'flex';
                toggle.textContent = 'Toggle';
                toggle.className = 'panel__heading__toggler';
                toggle.title = 'Toggle';
                toggle.onclick = function () {
                    panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
                    return false;
                };
            } else {
                const sidebar = document.querySelector('div.sidebar');
                if (!sidebar) {
                    console.error("Sidebar not found");
                    return;
                }
                sidebar.insertBefore(newPanel, sidebar.childNodes[3 + similarmoviesLocation]);
                displayMethod = 'flex';

                toggle.textContent = 'Toggle';
                toggle.className = 'panel__heading__toggler';
                toggle.title = 'Toggle';
                toggle.onclick = function () {
                    panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
                    return false;
                };
            }
        }

        var similarMoviesDiv = document.createElement('div');
        if (displayMethod === 'table') {
            similarMoviesDiv.style.textAlign = 'center';
            similarMoviesDiv.style.display = 'table';
            similarMoviesDiv.style.width = '100%';
            similarMoviesDiv.style.borderCollapse = 'separate';
            similarMoviesDiv.style.borderSpacing = '4px';
        } else {
            similarMoviesDiv.style.display = 'flex';
            similarMoviesDiv.style.flexWrap = 'wrap';
            similarMoviesDiv.style.justifyContent = 'center';
            similarMoviesDiv.style.padding = '4px';
            similarMoviesDiv.style.width = '100%';
        }

        let count = 0;
        let rowDiv = document.createElement('div');
        if (displayMethod === 'table') {
            rowDiv.style.display = 'table-row';
        } else {
            rowDiv.style.display = 'flex';
            rowDiv.style.justifyContent = 'center';
            rowDiv.style.width = '100%';
            rowDiv.style.marginBottom = '2px';
        }
        similarMoviesDiv.appendChild(rowDiv);

        similarMovies.forEach((edge) => {
            let movie = edge.node;

            if (!movie.primaryImage) {
                console.warn("No like this image found for movie:", movie.titleText.text);
                return;
            }

            let title = movie.titleText.text;
            let searchLink = `https://passthepopcorn.me/torrents.php?imdb=${movie.id}`;
            let image = movie.primaryImage.url;

            var movieDiv = document.createElement('div');
            if (displayMethod === 'table') {
                movieDiv.style.width = '25%';
                movieDiv.style.display = 'table-cell';
                movieDiv.style.textAlign = 'center';
                movieDiv.style.backgroundColor = '#2c2c2c';
                movieDiv.style.borderRadius = '10px';
                movieDiv.style.overflow = 'hidden';
                movieDiv.style.fontSize = '1em';
            } else {
                movieDiv.style.width = '33%';
                movieDiv.style.textAlign = 'center';
                movieDiv.style.backgroundColor = '#2c2c2c';
                movieDiv.style.borderRadius = '10px';
                movieDiv.style.overflow = 'hidden';
                movieDiv.style.fontSize = '1em';
                movieDiv.style.margin = '3px 3px 1px 1px';
            }
            movieDiv.innerHTML = `<a href="${searchLink}" target="_blank"><img style="max-width:100%; display:block; margin:auto;" src="${image}" alt="${title}" /></a><span>${title}</span>`;
            rowDiv.appendChild(movieDiv);

            count++;
            if (displayMethod === 'table' && count % 4 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.style.display = 'table-row';
                similarMoviesDiv.appendChild(rowDiv);
            } else if (displayMethod === 'flex' && count % 3 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.style.display = 'flex';
                rowDiv.style.justifyContent = 'center';
                rowDiv.style.width = '100%';
                rowDiv.style.marginBottom = '2px';
                similarMoviesDiv.appendChild(rowDiv);
            }
        });

        if (displayMethod === 'table' && similarMoviesDiv.children.length > 2) {
            Array.from(similarMoviesDiv.children).slice(2).forEach(child => child.style.display = 'none');
        } else if (displayMethod === 'flex' && similarMoviesDiv.children.length > 3) {
            Array.from(similarMoviesDiv.children).slice(3).forEach(child => child.style.display = 'none');
        }

        if (displayMethod === 'table') {
            toggle.addEventListener('click', function () {
                const rows = Array.from(similarMoviesDiv.children);
                const isHidden = rows.slice(2).some(row => row.style.display === 'none');
                rows.slice(2).forEach(row => {
                    row.style.display = isHidden ? 'table-row' : 'none';
                });
                toggle.textContent = isHidden ? '(Hide extra movies)' : '(Show all movies)';
            });
        }

        panelBody.appendChild(similarMoviesDiv);
    };

    // Function to display technical specifications
    const displayTechnicalSpecifications = (data) => {

        var newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'technical_specifications';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Technical Specifications'));

        var imdbLink = document.createElement('a');
        imdbLink.href = `https://www.imdb.com/title/${imdbId}/technical`;
        imdbLink.title = 'IMDB Url';
        imdbLink.textContent = 'IMDb Url';
        imdbLink.target = '_blank';
        imdbLink.style.marginLeft = '5px';

        var toggle = document.createElement('a');
        toggle.className = 'panel__heading__toggler';
        toggle.title = 'Toggle';
        toggle.href = '#';
        toggle.textContent = 'Toggle';

        toggle.onclick = function () {
            var panelBody = document.querySelector('#technical_specifications .panel__body');
            panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
            return false;
        };

        panelHeading.appendChild(title);
        panelHeading.appendChild(imdbLink);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        var panelBody = document.createElement('div');
        panelBody.className = 'panel__body';
        newPanel.appendChild(panelBody);

        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(newPanel, sidebar.childNodes[3 + techspecsLocation]);

        const specs = data.data.title.technicalSpecifications || {};
        const runtimes = data.data.title.runtimes?.edges || [];
        const panelBodyElement = document.getElementById('technical_specifications').querySelector('.panel__body');

        const specContainer = document.createElement('div');
        specContainer.className = 'technicalSpecification';
        specContainer.style.color = "#fff";
        specContainer.style.fontSize = "1em";

        const formatSpec = (title, items, key, attributesKey) => {
            if (items && items.length > 0) {
                let values = items.map(item => {
                    let value = item[key];
                    if (item[attributesKey] && item[attributesKey].length > 0) {
                        value += ` (${item[attributesKey].map(attr => attr.text).join(", ")})`;
                    }
                    return value;
                }).filter(value => value).join(", ");
                return `<strong>${title}:</strong> ${values}<br>`;
            }
            return "";
        };

        const formatFilmLengths = (items) => {
            if (items && items.length > 0) {
                let values = items.map(item => {
                    let value = `${item.filmLength} m`;
                    if (item.countries && item.countries.length > 0) {
                        value += ` (${item.countries.map(country => country.text).join(", ")})`;
                    }
                    if (item.numReels) {
                        value += ` (${item.numReels} reels)`;
                    }
                    return value;
                }).filter(value => value).join(", ");
                return `<strong>Film Length:</strong> ${values}<br>`;
            }
            return "";
        };

        const formatRuntimes = (runtimes) => {
            if (runtimes && runtimes.length > 0) {
                let values = runtimes.map(runtime => {
                    let value = `${runtime.node.displayableProperty.value.plainText}`;
                    // Add attributes if present
                    if (runtime.node.attributes && runtime.node.attributes.length > 0) {
                        value += ` (${runtime.node.attributes.map(attr => attr.text).join(", ")})`;
                    }
                    // Add country if present
                    if (runtime.node.country && runtime.node.country.text) {
                        value += ` [${runtime.node.country.text}]`;
                    }
                    return value;
                }).join(", ");
                return `<strong>Runtime:</strong> ${values}<br>`;
            }
            return "";
        };

        specContainer.innerHTML += formatRuntimes(runtimes);
        specContainer.innerHTML += formatSpec("Sound mix", specs.soundMixes?.items || [], "text", "attributes");
        specContainer.innerHTML += formatSpec("Color", specs.colorations?.items || [], "text", "attributes");
        specContainer.innerHTML += formatSpec("Aspect ratio", specs.aspectRatios?.items || [], "aspectRatio", "attributes");
        specContainer.innerHTML += formatSpec("Camera", specs.cameras?.items || [], "camera", "attributes");
        specContainer.innerHTML += formatSpec("Laboratory", specs.laboratories?.items || [], "laboratory", "attributes");
        specContainer.innerHTML += formatFilmLengths(specs.filmLengths?.items || []);
        specContainer.innerHTML += formatSpec("Negative Format", specs.negativeFormats?.items || [], "negativeFormat", "attributes");
        specContainer.innerHTML += formatSpec("Cinematographic Process", specs.processes?.items || [], "process", "attributes");
        specContainer.innerHTML += formatSpec("Printed Film Format", specs.printedFormats?.items || [], "printedFormat", "attributes");

        panelBodyElement.appendChild(specContainer);
    };

    // Function to display box office details
    const displayBoxOffice = (data) => {

        var newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'box_office';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Box Office'));

        var toggle = document.createElement('a');
        toggle.className = 'panel__heading__toggler';
        toggle.title = 'Toggle';
        toggle.href = '#';
        toggle.textContent = 'Toggle';

        toggle.onclick = function () {
            var panelBody = document.querySelector('#box_office .panel__body');
            panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
            return false;
        };

        panelHeading.appendChild(title);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        var panelBody = document.createElement('div');
        panelBody.className = 'panel__body';
        newPanel.appendChild(panelBody);

        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(newPanel, sidebar.childNodes[3 + boxofficeLocation]);

        const titleData = data.data.title || {};
        const panelBodyElement = document.getElementById('box_office').querySelector('.panel__body');

        const boxOfficeContainer = document.createElement('div');
        boxOfficeContainer.className = 'boxOffice';
        boxOfficeContainer.style.color = "#fff";
        boxOfficeContainer.style.fontSize = "1em";

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
        };

        const formatRankedGross = (title, boxOfficeData) => {
            if (boxOfficeData && boxOfficeData.total && boxOfficeData.total.amount) {
                return `<strong>${title}:</strong> ${formatCurrency(boxOfficeData.total.amount)} (Rank: ${boxOfficeData.rank})<br>`;
            }
            return "";
        };

        const formatOpeningWeekendGross = (title, boxOfficeData) => {
            if (boxOfficeData && boxOfficeData.gross && boxOfficeData.gross.total.amount) {
                return `<strong>${title}:</strong> ${formatCurrency(boxOfficeData.gross.total.amount)}<br>`;
            }
            return "";
        };

        const formatProductionBudget = (budgetData) => {
            if (budgetData && budgetData.amount) {
                return `<strong>Production Budget:</strong> ${formatCurrency(budgetData.amount)}<br>`;
            }
            return "";
        };

        let output = '';

        if (titleData.productionBudget && titleData.productionBudget.budget) {
            output += formatProductionBudget(titleData.productionBudget.budget);
        }
        if (titleData.worldwideGross) {
            output += formatRankedGross("Worldwide Gross", titleData.worldwideGross);
        }
        if (titleData.domesticGross) {
            output += formatRankedGross("Domestic Gross", titleData.domesticGross);
        }
        if (titleData.internationalGross) {
            output += formatRankedGross("International Gross", titleData.internationalGross);
        }
        if (titleData.domesticOpeningWeekend) {
            output += formatOpeningWeekendGross("Domestic Opening Weekend Gross", titleData.domesticOpeningWeekend);
            if (titleData.domesticOpeningWeekend) {
                output += `<strong>Theater Count:</strong> ${titleData.domesticOpeningWeekend.theaterCount}<br>
                           <strong>Weekend Start Date:</strong> ${titleData.domesticOpeningWeekend.weekendStartDate}<br>
                           <strong>Weekend End Date:</strong> ${titleData.domesticOpeningWeekend.weekendEndDate}<br>`;
            }
        }
        if (titleData.internationalOpeningWeekend) {
            output += formatOpeningWeekendGross("International Opening Weekend Gross", titleData.internationalOpeningWeekend);
        }

        boxOfficeContainer.innerHTML = output;
        panelBodyElement.appendChild(boxOfficeContainer);
    };

    const displayAwardsData = (titleData) => {

        const imdbId = titleData.id;

        const wins = titleData.prestigiousAwardSummary?.wins ?? 0;
        const nominations = titleData.prestigiousAwardSummary?.nominations ?? 0;

        // Calculate total wins and nominations
        let totalWins = 0;
        let totalNominations = 0;

        if (titleData.awardNominationsCombined && titleData.awardNominationsCombined.length > 0) {
            titleData.awardNominationsCombined.forEach(nomination => {
                if (nomination.isWinner) {
                    totalWins++;
                } else {
                    totalNominations++;
                }
            });
        }

        const aDiv = document.createElement('div');
        aDiv.setAttribute('id', 'imdb-award');
        aDiv.setAttribute('class', 'panel');
        aDiv.innerHTML = `
            <div class="panel__heading">
                <span class="panel__heading__title">
                    <span style="color: rgb(242, 219, 131);">IMDb</span> Awards
                </span>
                <a href="https://www.imdb.com/title/${imdbId}/awards/" target="_blank" rel="noreferrer" style="float:right; font-size:0.9em; margin-right: 10px;">(View on IMDb)</a>
            </div>`;
        const awardDiv = document.createElement('div');
        awardDiv.setAttribute('style', 'text-align:center; display:table; width:100%; border-collapse: separate; border-spacing:4px;');
        aDiv.appendChild(awardDiv);

        // Placeholder for the awards content
        const awardsContent = document.createElement('div');
        awardsContent.setAttribute('id', 'awards-content');
        awardsContent.innerHTML = `
            <style>
                .awards-text {
                    font-size: 1.0em; /* Adjust this value to change the text size */
                }
                .awards-table {
                    width: 100%;
                    text-align: left;
                    border-collapse: collapse;
                }
                .awards-table th, .awards-table td {
                    padding: 15px;
                    border-bottom: 1px solid #ddd;
                }
            </style>
            <div class="awards-text">
                <table class="awards-table">
                    <tr>
                        <th style="color: yellow;">OSCARS</th>
                        <th>Wins</th>
                        <th>Nominations</th>
                    </tr>
                    <tr>
                        <td></td>
                        <td style="color: yellow;">${wins}</td>
                        <td style="color: yellow;">${nominations}</td>
                    </tr>
                    <tr>
                        <th>Total Awards</th>
                        <th>Wins</th>
                        <th>Nominations</th>
                    </tr>
                    <tr>
                        <td></td>
                        <td style="color: yellow;">${totalWins}</td>
                        <td style="color: yellow;">${totalNominations}</td>
                    </tr>
                </table>
            </div>`;
        aDiv.appendChild(awardsContent);

        //const awardsBefore = document.querySelector('div.box_albumart');

        //if (awardsBefore && awardsBefore.nextElementSibling) {
        //    const nextSibling = awardsBefore.nextElementSibling;
            // Append the awards panel after the next sibling div
        //    nextSibling.parentNode.insertBefore(aDiv, nextSibling.nextElementSibling);
        //}
        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(aDiv, sidebar.childNodes[3 + awardsLocation]);
    };

    const appendSongs = (songs, idToNameMap) => {
        let movie_title = document.querySelector(".page__title").textContent.split("[")[0].trim();
        if (movie_title.includes(" AKA ")) movie_title = movie_title.split(" AKA ")[1]; // 0 = title in foreign lang, 1 = title in eng lang

        let cast_container = [...document.querySelectorAll("table")].find(e => e.textContent.trim().startsWith("Actor\n"));
        let bg_color_1 = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("background-color").split("none")[0];
        let bg_color_2 = window.getComputedStyle(cast_container.querySelector("tbody > tr"), null).getPropertyValue("background-color").split("none")[0];
        let border_color = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("border-color").split("none")[0];

        let new_panel = document.createElement("div");
        new_panel.id = "imdb-soundtrack";
        new_panel.className = "panel";
        new_panel.style.padding = 0;
        new_panel.style.margin = "18px 0";

        new_panel.innerHTML = '<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/' + imdbId + '/soundtrack"><span style="color: rgb(242, 219, 131);">IMDb</span> Soundtrack</a></span></div>';

        new_panel.querySelector(".panel__heading").style.display = "flex";
        new_panel.querySelector(".panel__heading").style.justifyContent = "space-between";

        let yt_search = document.createElement("a");
        yt_search.href = "https://www.youtube.com/results?search_query=" + movie_title + " soundtrack";
        yt_search.textContent = "(YouTube search)";
        yt_search.target = "_blank";

        let yt_search_wrapper = document.createElement("span");
        yt_search_wrapper.style.float = "right";
        yt_search_wrapper.style.fontSize = "0.9em";
        yt_search_wrapper.appendChild(yt_search);

        new_panel.querySelector(".panel__heading").appendChild(yt_search_wrapper);

        let songs_container = document.createElement("div");
        songs_container.className = "panel__body";
        songs_container.style.display = "flex";
        songs_container.style.padding = 0;

        if (songs.length === 0) {
            let no_songs_container = document.createElement("div");
            no_songs_container.style.padding = "11px";
            no_songs_container.textContent = "No soundtrack information found on IMDb.";
            no_songs_container.style.textAlign = "center";
            new_panel.appendChild(no_songs_container);
            cast_container.parentNode.insertBefore(new_panel, cast_container);
            return;
        }

        let songs_col_1 = document.createElement("div");
        songs_col_1.style.display = "inline-block";
        songs_col_1.style.width = "50%";
        songs_col_1.style.padding = 0;
        songs_col_1.style.borderRight = "1px solid " + border_color;

        let songs_col_2 = document.createElement("div");
        songs_col_2.style.display = "inline-block";
        songs_col_2.style.width = "50%";
        songs_col_2.style.padding = 0;

        let j = 0;
        for (let i = 0; i < songs.length / 2; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2, idToNameMap);
            songs_col_1.appendChild(div);
            j++;
        }

        for (let i = Math.ceil(songs.length / 2); i < songs.length; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2, idToNameMap);
            songs_col_2.appendChild(div);
            j++;
        }

        songs_container.appendChild(songs_col_1);
        songs_container.appendChild(songs_col_2);
        new_panel.appendChild(songs_container);

        cast_container.parentNode.insertBefore(new_panel, cast_container);
    };

    const createSongDiv = (song, movie_title, index, bg_color_1, bg_color_2, idToNameMap) => {
        let div = document.createElement("div");
        div.style.height = "31px";
        div.style.overflow = "hidden";
        div.style.padding = "6px 14px";

        let track_line = document.createElement("a");
        track_line.textContent = song.title;
        track_line.title = song.title;
        track_line.href = "https://www.youtube.com/results?search_query=" + movie_title.replace(/&/, " and ") + " " + song.title.replace(/&/, " and ");
        track_line.target = "_blank";

        let seperator = document.createElement("span");
        seperator.innerHTML = "-&nbsp;&nbsp;&nbsp;";

        let artist_link = document.createElement("a");
        artist_link.textContent = song.artistId ? idToNameMap[song.artistId] : song.artist;
        artist_link.href = song.link;
        artist_link.target = "_blank";
        artist_link.style.marginRight = "10px";

        if (index % 2 === 0) div.style.background = bg_color_1;
        else div.style.background = bg_color_2;

        div.appendChild(artist_link);
        div.appendChild(seperator);
        div.appendChild(track_line);

        return div;
    };

    function displayAlternateVersionsPanel(alternateVersionsEdges) {
        if (!alternateVersionsEdges || !alternateVersionsEdges.length) return;

        // Create the panel container
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'alternate_versions_panel';

        // Panel heading
        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.style.cursor = 'pointer';
        heading.innerHTML = `<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> Alternate Versions</span>`;
        panel.appendChild(heading);

        // Panel body (toggle display based on option)
        const body = document.createElement('div');
        body.className = 'panel__body';
        body.style.display = ALTERNATE_VERSIONS_PANEL_OPEN ? 'block' : 'none';

        alternateVersionsEdges.forEach((edge, idx) => {
            const node = edge.node;
            if (node && node.text && node.text.plainText) {
                const versionDiv = document.createElement('div');
                versionDiv.style.marginBottom = '12px';
                versionDiv.style.fontSize = '1em';

                // Split at the first newline
                const text = node.text.plainText;
                const newlineIdx = text.indexOf('\n');
                let header, details;
                if (newlineIdx !== -1) {
                    header = text.slice(0, newlineIdx);
                    details = text.slice(newlineIdx + 1);
                } else {
                    header = text;
                    details = '';
                }

                // Bold the title up to the first ' - ' not in parentheses
                const match = header.match(/^((?:[^(]|\([^)]*\))*)\s-\s(.*)$/s);
                let headerHtml;
                if (match) {
                    headerHtml = `<strong>${match[1].trim()}</strong> - ${match[2]}`;
                } else {
                    headerHtml = header;
                }

                // Create clickable header
                const headerDiv = document.createElement('div');
                headerDiv.innerHTML = headerHtml;
                headerDiv.style.cursor = 'pointer';
                headerDiv.style.userSelect = 'text';
                headerDiv.style.padding = '2px 0';

                // Create details div, hidden by default
                const detailsDiv = document.createElement('div');
                detailsDiv.style.display = 'none';
                detailsDiv.style.whiteSpace = 'pre-line';
                detailsDiv.style.marginTop = '4px';
                detailsDiv.textContent = details;

                // Toggle details on header click
                headerDiv.addEventListener('click', () => {
                    detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                });

                versionDiv.appendChild(headerDiv);
                versionDiv.appendChild(detailsDiv);
                body.appendChild(versionDiv);
            }
        });

        panel.appendChild(body);

        // Toggle panel body on heading click
        heading.addEventListener('click', () => {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });

        // Find the synopsis panel and insert after it
        const synopsisPanel = document.getElementById('synopsis-and-trailer');
        if (synopsisPanel && synopsisPanel.parentNode) {
            synopsisPanel.parentNode.insertBefore(panel, synopsisPanel.nextSibling);
        } else {
            // Fallback: append to sidebar
            const sidebar = document.querySelector('div.sidebar');
            if (sidebar) sidebar.appendChild(panel);
        }
    }

    function displayKeywordsPanel(keywordsEdges) {
        if (!keywordsEdges || !keywordsEdges.length) return;

        // Create the panel container
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'imdb_keywords_panel';

        // Panel heading
        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.innerHTML = `<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> Keywords</span>`;
        panel.appendChild(heading);

        // Panel body
        const body = document.createElement('div');
        body.className = 'panel__body';
        body.style.display = KEYWORDS_PANEL_OPEN ? 'block' : 'none';

        // Collect and format keywords
        const keywordList = document.createElement('div');
        keywordList.style.display = 'flex';
        keywordList.style.flexWrap = 'wrap';
        keywordList.style.gap = '8px';

        keywordsEdges.forEach(edge => {
            const node = edge.node;
            if (node && node.keyword && node.keyword.text && node.keyword.text.text) {
                const keywordText = node.keyword.text.text;
                const keywordUrlPart = keywordText.trim().toLowerCase().replace(/\s+/g, '-');
                const url = `https://www.imdb.com/search/title/?keywords=${encodeURIComponent(keywordUrlPart)}&explore=keywords`;

                const kw = document.createElement('a');
                kw.textContent = keywordText;
                kw.href = url;
                kw.target = "_blank";
                kw.rel = "noopener noreferrer";
                kw.style.background = '#222';
                kw.style.color = '#F2DB83';
                kw.style.padding = '2px 8px';
                kw.style.borderRadius = '8px';
                kw.style.fontSize = '0.95em';
                kw.style.marginBottom = '4px';
                kw.style.textDecoration = 'none';

                keywordList.appendChild(kw);
            }
        });

        body.appendChild(keywordList);
        panel.appendChild(body);

        // Toggle panel body on heading click
        heading.addEventListener('click', () => {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });

        // Insert at the very bottom of the sidebar
        const sidebar = document.querySelector('div.sidebar');
        if (sidebar) {
            sidebar.appendChild(panel);
        } else {
            console.error("Sidebar not found");
        }
    }

    function addParentalGuidePanel(imdbData) {
        // Add CSS if not already present
        if (!document.getElementById('parental-guide-style')) {
            const style = document.createElement('style');
            style.id = 'parental-guide-style';
            style.type = 'text/css';
            style.innerHTML = `
                .parentalspoiler { color: transparent; }
                .parentalspoiler:hover { color: inherit; }
                .parentalHeader { color: #F2DB83; margin-top: 12px; margin-bottom: 5px; }
                .parentalHeader:hover { cursor: pointer; }
                .hide { display: none; }
            `;
            document.head.appendChild(style);
        }

        // Build panel structure
        const advisoryDiv = document.createElement('div');
        const newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'parents_guide';

        const panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';

        const title = document.createElement('span');
        title.className = 'panel__heading__title';
        const imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Parental Notes'));

        const toggle = document.createElement('a');
        toggle.className = 'panel__heading__toggler';
        toggle.title = 'Toggle';
        toggle.href = '#';
        toggle.textContent = 'Toggle';

        // Try to get imdbId for the link (optional)
        let imdbId = null;
        if (Array.isArray(imdbData)) {
            // If only categories array is passed, skip imdbId
        } else if (imdbData?.parentsGuide?.title?.id) {
            imdbId = imdbData.parentsGuide.title.id;
        } else if (imdbData?.title?.id) {
            imdbId = imdbData.title.id;
        }

        const imdbDisplay = document.createElement('a');
        imdbDisplay.title = 'IMDB Url';
        imdbDisplay.href = imdbId ? `https://www.imdb.com/title/${imdbId}/parentalguide` : "#";
        imdbDisplay.target = "_blank";
        imdbDisplay.textContent = 'IMDB Url';
        imdbDisplay.style.cssText = "margin-left: 5px;";

        toggle.onclick = function () {
            const panelBody = document.querySelector('#parents_guide .panel__body');
            panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
            return false;
        };

        panelHeading.appendChild(title);
        panelHeading.appendChild(imdbDisplay);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        const panelBody = document.createElement('div');
        panelBody.className = 'panel__body';
        panelBody.style.position = 'relative';
        panelBody.style.display = isPanelVisible ? 'block' : 'none';
        panelBody.style.paddingTop = "0px";
        panelBody.appendChild(advisoryDiv);
        newPanel.appendChild(panelBody);

        // Insert panel into sidebar
        const sidebar = document.querySelector('div.sidebar');
        if (sidebar) sidebar.insertBefore(newPanel, sidebar.childNodes[3 + parentsLocation]);

        // --- Extract categories robustly ---
        let categories;
        if (Array.isArray(imdbData)) {
            categories = imdbData;
        } else {
            categories =
                imdbData?.parentsGuide?.title?.parentsGuide?.categories ||
                imdbData?.title?.parentsGuide?.categories ||
                imdbData?.parentsGuide?.categories;
        }

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            advisoryDiv.textContent = "No parental guide data found.";
            return;
        }
        renderParentalGuideCategories(categories, advisoryDiv, { hidetext, isToggleableSections, hideSpoilers });
    }

    // Helper function to render categories
    function renderParentalGuideCategories(categories, advisoryDiv, opts) {
        const { hidetext, isToggleableSections, hideSpoilers } = opts;
        for (let i = 0; i < categories.length; i++) {
            const container = document.createElement("div");
            const itemHeader = document.createElement("h4");
            itemHeader.className = "parentalHeader";

            const severity = document.createElement("span");
            if (categories[i].severity != null) {
                const sev = categories[i].severity.text;
                severity.style.color =
                    sev === "None" ? "#F2DB83" :
                    sev === "Mild" ? "#c5e197" :
                    sev === "Moderate" ? "#fbca8c" :
                    sev === "Severe" ? "#ffb3ad" : "#F2DB83";
                severity.innerHTML = sev;
            } else {
                severity.innerHTML = "Unknown";
            }

            itemHeader.innerHTML = categories[i].category.text + " - ";
            itemHeader.appendChild(severity);
            itemHeader.innerHTML += ` - (${categories[i].guideItems.edges.length})`;
            container.appendChild(itemHeader);

            const listItems = document.createElement("ul");
            listItems.style.paddingLeft = "0px";
            listItems.style.margin = "0px 15px";
            listItems.style.marginLeft = "10px";

            if (isToggleableSections) listItems.classList.add("hide");

            for (let j = 0; j < categories[i].guideItems.edges.length; j++) {
                const currentItem = categories[i].guideItems.edges[j];
                const item = document.createElement("li");
                item.style.padding = "3px 0px";
                const text = document.createElement('a');
                text.style.color = "#FFF";
                text.textContent = currentItem.node.text.plainText;
                if (hidetext) text.classList.add('parentalspoiler');
                if (currentItem.node.isSpoiler && hideSpoilers) {
                    text.textContent = "Potential Spoilers";
                    text.style.textDecoration = "underline";
                    text.onclick = (e) => {
                        if (e.target.textContent == currentItem.node.text.plainText) {
                            e.target.textContent = "Potential Spoilers";
                            e.target.style.textDecoration = "underline";
                        } else {
                            e.target.textContent = currentItem.node.text.plainText;
                            e.target.style.textDecoration = "none";
                        }
                    };
                }
                item.appendChild(text);
                listItems.appendChild(item);
            }
            container.appendChild(listItems);
            advisoryDiv.appendChild(container);
            if (isToggleableSections) {
                itemHeader.onclick = () => {
                    let list = itemHeader.parentElement.querySelector("ul");
                    list.classList.toggle("hide");
                };
            }
        }
    }

    // Initialize panels
    fetchIMDBData(imdbId).then(data => {
        // The data returned now contains titleData, processedSoundtracks, and idToNameMap
        const { titleData, processedSoundtracks, idToNameMap } = data;

        if (titleData) {
            if (SHOW_SIMILAR_MOVIES && titleData.moreLikeThisTitles) {
                displaySimilarMovies(titleData.moreLikeThisTitles.edges);
            } else if (SHOW_SIMILAR_MOVIES) {
                console.warn("No similar movies found");
            }

            if (SHOW_TECHNICAL_SPECIFICATIONS && titleData.technicalSpecifications) {
                displayTechnicalSpecifications({ data: { title: titleData } });
            } else if (SHOW_TECHNICAL_SPECIFICATIONS) {
                console.warn("No technical specifications found");
            }

            if (SHOW_BOX_OFFICE && (titleData.worldwideGross || titleData.domesticGross || titleData.internationalGross)) {
                displayBoxOffice({ data: { title: titleData } });
            } else if (SHOW_BOX_OFFICE) {
                console.warn("No box office data found");
            }

            if (SHOW_AWARDS) {
                displayAwardsData(titleData);
            }

            if (SHOW_SOUNDTRACKS && processedSoundtracks.length > 0) {
                appendSongs(processedSoundtracks, idToNameMap);
            } else if (SHOW_SOUNDTRACKS) {
                console.warn("No soundtracks found");
            }
            if (SHOW_ALTERNATE_VERSIONS && titleData.alternateVersions && titleData.alternateVersions.edges.length > 0) {
                displayAlternateVersionsPanel(titleData.alternateVersions.edges);
            }
            if (SHOW_KEYWORDS && titleData.keywords && titleData.keywords.edges.length > 0) {
                displayKeywordsPanel(titleData.keywords.edges);
            } else {
                console.warn("No keywords found");
            }
            if (SHOW_PARENTS_GUIDE) {
                addParentalGuidePanel(titleData.parentsGuide.categories);
            }
        } else {
            console.error("Failed to retrieve valid title data");
        }
    }).catch(err => {
        console.error(err);
    });
})();
