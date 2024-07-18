// ==UserScript==
// @name         PTP Similar Movies Helper
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Add "Movies Like This" onto PTP from IMDB API
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-similar-movies.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-similar-movies.js
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        .similarMoviesPanel {
            text-align: center;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            padding: 2px;
            width: 100%;
        }
        .similarMoviesRow {
            display: flex;
            justify-content: center;
            width: 100%;
            margin-bottom: 2px;
        }
        .similarMovie {
            text-align: center;
            background-color: #2c2c2c;
            border-radius: 10px;
            overflow: hidden;
            font-size: 1em;
            margin: 5px 3px 3px 3px; /* Adjusted margins to reduce borders */
            width: 95px;
        }
        .similarMovie img {
            width: 101px;
            height: 150px;
            display: block;
            margin: auto;
        }
        .similarMovie span {
            display: block;
            margin-top: 5px;
            color: #fff;
            font-size: 0.8em;
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

    console.log("IMDB URL: " + imdbUrl);

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
    title.appendChild(document.createTextNode(' Similar Movies'));

    panelHeading.appendChild(title);
    newPanel.appendChild(panelHeading);
    var panelBody = document.createElement('div');
    panelBody.className = 'panel__body';
    panelBody.style.position = 'relative';
    panelBody.style.display = 'block';
    panelBody.style.paddingTop = "0px";
    newPanel.appendChild(panelBody);
    var sidebar = document.querySelector('div.sidebar');
    if (!sidebar) {
        console.error("Sidebar not found");
        return;
    }
    sidebar.insertBefore(newPanel, sidebar.childNodes[4]);

    let imdbId = imdbUrl.split("/")[4];
    if (!imdbId) {
        console.error("IMDB ID not found");
        return;
    }

    const fetchSimilarMovies = async (imdbId) => {
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

                    var similarMoviesDiv = document.createElement('div');
                    similarMoviesDiv.className = 'similarMoviesPanel';

                    let count = 0;
                    let rows = 0;
                    var rowDiv = document.createElement('div');
                    rowDiv.className = 'similarMoviesRow';
                    similarMoviesDiv.appendChild(rowDiv);

                    similarMovies.forEach((edge) => {
                        let movie = edge.node;
                        if (rows >= 3) {
                            return;
                        }

                        let title = movie.titleText.text;
                        let searchLink = `https://passthepopcorn.me/torrents.php?action=advanced&searchstr=${movie.id}`;
                        let image = movie.primaryImage.url;

                        var movieDiv = document.createElement('div');
                        movieDiv.className = 'similarMovie';
                        movieDiv.innerHTML = `<a href="${searchLink}" target="_blank"><img src="${image}" alt="${title}" /></a><span>${title}</span>`;
                        rowDiv.appendChild(movieDiv);

                        count++;
                        if (count % 3 === 0) {
                            rowDiv = document.createElement('div');
                            rowDiv.className = 'similarMoviesRow';
                            similarMoviesDiv.appendChild(rowDiv);
                            rows++;
                        }
                    });

                    panelBody.appendChild(similarMoviesDiv);
                } else {
                    console.error("Failed to fetch similar movies", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    fetchSimilarMovies(imdbId);
})();