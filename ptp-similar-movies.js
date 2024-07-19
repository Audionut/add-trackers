// ==UserScript==
// @name         PTP Similar Movies Helper
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.4
// @description  Add "Movies Like This" onto PTP from IMDB API
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-similar-movies.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-similar-movies.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    const PLACE_UNDER_CAST = false;

    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        .panel__heading__toggler {
            margin-left: auto;
            cursor: pointer;
        }
    `;
    document.getElementsByTagName('head')[0].appendChild(style);

    var link = document.querySelector("a#imdb-title-link.rating");
    if (!link) {
        console.error("IMDB link not found");
        return;
    }

    var imdbUrl = link.getAttribute("href");
    if (!imdbUrl) {
        console.error("IMDB URL not found");
        return;
    }

    var newPanel = document.createElement('div');
    newPanel.className = 'panel';
    newPanel.id = 'similar_movies';
    var panelHeading = document.createElement('div');
    panelHeading.className = 'panel__heading';
    var title = document.createElement('span');
    title.className = 'panel__heading__title';

    var imdb = document.createElement('span');
    imdb.style.color = '#F2DB83';
    imdb.textContent = 'iMDB';
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
            console.log("Inserted panel after the specified table");
        } else {
            console.error("Target table not found");
            return;
        }
    } else {
        const parentGuidePanel = document.querySelector('div.panel#parents_guide');
        if (parentGuidePanel) {
            parentGuidePanel.parentNode.insertBefore(newPanel, parentGuidePanel.nextSibling);
            displayMethod = 'flex';
            console.log("Inserted panel after parent guide panel");
            // Update toggle for sidebar
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
            sidebar.insertBefore(newPanel, sidebar.childNodes[4]);
            displayMethod = 'flex';
            console.log("Inserted panel in the sidebar");

            // Update toggle for sidebar
            toggle.textContent = 'Toggle';
            toggle.className = 'panel__heading__toggler';
            toggle.title = 'Toggle';
            toggle.onclick = function () {
                panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
                return false;
            };
        }
    }

    let imdbId = imdbUrl.split("/")[4];
    if (!imdbId) {
        console.error("IMDB ID not found");
        return;
    }

    const fetchSimilarMovies = async (imdbId) => {
        const cacheKey = `similarMovies_${imdbId}`;
        const cachedData = await GM.getValue(cacheKey);
        const cacheTimestamp = await GM.getValue(`${cacheKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
            const currentTime = new Date().getTime();
            if (currentTime - cacheTimestamp < 24 * 60 * 60 * 1000) {
                console.log("Using cached data for similar movies");
                displaySimilarMovies(JSON.parse(cachedData));
                return;
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    title(id: "${imdbId}") {
                        moreLikeThisTitles(first: 10) {
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
                    let data = JSON.parse(response.responseText);
                    let similarMovies = data.data.title.moreLikeThisTitles.edges;

                    if (similarMovies.length === 0) {
                        console.warn("No similar movies found");
                        return;
                    }

                    GM.setValue(cacheKey, JSON.stringify(similarMovies));
                    GM.setValue(`${cacheKey}_timestamp`, new Date().getTime());
                    displaySimilarMovies(similarMovies);
                } else {
                    console.error("Failed to fetch similar movies", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    const displaySimilarMovies = (similarMovies) => {
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
            similarMoviesDiv.style.borderCollapse = 'separate';
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

            let title = movie.titleText.text;
            let searchLink = `https://passthepopcorn.me/torrents.php?action=advanced&searchstr=${movie.id}`;
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
        console.log("Displayed similar movies");
    };

    fetchSimilarMovies(imdbId);
})();