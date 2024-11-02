// ==UserScript==
// @name         UNIT3D - iMDB Combined Script
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Add many iMDB functions into one script
// @author       Audionut
// @match        https://blutopia.cc/torrents/similar/*
// @match        https://aither.cc/torrents/similar/*
// @match        https://reelflix.xyz/torrents/similar/*
// @match        https://onlyencodes.cc/torrents/similar/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAI/0lEQVR4nLxaC1BU1/n/3cc+2MVdkOcCAllREVCMj7/6tyZR25qq1cg023SIpsVWp5NpNW2jmDEdJ3VSR5Na4zg2D9A4sZMmjVab6Uim4CPaSsQEDIioi6Ai7grsg33v3r2ds8Bell3YvUvMb2Zn9p57zvf9fne/851zvrssz/MYL67f6s6r/7J9aUvb/bntnQ+ndz0w5ZvMjhQAisEujuQkRW92ZnKHNi+ttXhaVsP82dq6wgJN53h9U/EKMPZY1ceOX6o4VdP4QrfBUhqPDU2Gumn18lnvl5ctqE5PVVnisSFagL7TmP320XO/qznTXOH2+FTxOB0JmZS1Ll9SUr1p/ZNvTM5L7xIzNmYBDqdb+ud3/r312PFLlRznV8ZLdiwwDG0vL1uwe8vG7+5RJMg8sYyJSUBjy53pL/3+w4+6DZaSb4JoNGgy1M37XntON6s4tzVa36gCTp7+atWO3SeOeX3cNxIusULCMtZdlWvL1zz9+Kdj9RtTwIGq2s0HD9e9SX5dsQSKpb34hbIJHQYT/ilZCD2VJdYEAffiz5b+9lcblu0frQOzc+fOiDcOVNX++uDhOjKQFuv1+4pOvJv8GQroPqCnE0/4rqKbSUEXnSbWFH258fbTPA/T/Nna+ogdIjWSsDl4uO5PYr0RlEh7sVd1DhL4BSe8H5tcpzCZuxuPSRAuhFOke2ECyITdsfvEB/GEjZTi8EbSOcgoLuwey3PY5DgBOExizRIwhBPhNvJGiACSKkm28fo4dTxefpquR77aAyQmBD9sIh385ExwYIX3LNz94tcswolwIxyHt4dM4tf3f7rj6Mf//UM85BVyoPYtJZIShWdC+T1A9zsh/Sw2BqUVRaBTCiBNFJ/Y1j+78NVXNq/aNXQd9KbvMGYfO15fGQ95glX/z4aQHw3qRA66JX2w3G2P65cgHAnXoeugR7I9GM8Ku2KhJKyNc9qB/vA0vfYJC8DzsMYhgnAkXIeuAwLIxqzmbHNFnNyhlAOzpwlz3mnsxP3aajScPI72QyrwR/xApyBkXqEdKuXARLfeuw2PzSrKH+FKOAcFkF3leDZmj09lIGGpwHeP2YCbF2qw/WoZNrdvxoqHZdDdWAXDJ3LAMCCCZXjML3IMDOZ50eFEuBLOQQFkSxwveYLCPCH2rbcu41j3Mtx05QbbvvamYY95HtAg/AoztC7BQBzhNMSZJoeRePfzQ8jNEAR4rT1odeSF9WnwZAK9wvVjGndYHzHhRDgT7vSlK+1L4yU+hNQkKvidlimQIgknoWHsQIJwnZ7sCzckMpwId/rajftz4+QdhFwqCFDmTMePUs+AgbAaM/DjxcRGoFAYI5P4IxsTEU6EO9ve8TBseRYLj1f4rswtwYKiu3idPYT/mGaASXRipbwdRTP7gBJBqNdHjWmThJN6knbMxY5wZ7semMIDViTsLmFyUhSFlNkr8H/591H64DbU6VeAXArICl3kXN4oi95gOKlyHoNsQuSdDeHOmiyO1PEKMJrCw0E2MQvypFRA/dUoY9johgfDSTVJG1EE4U4PK33EBQ1tw9T686Ba2mMeY2pygj1vQBrjjKn/GNlJIfqwMhzlimuoSf8Ei2ytQMvtmMeZv3ZhqtmAqqxz+GFiR/QBY2QnIsAhljjBM/KbeFVVDyk1GD768GqI//Rl3DsZ/uSsNwfWAAnF45fJrVimuBeTiAjZyUEnqxU9YskrKQ8qVV8AwxNJjxmUqT/U5+dXYThjC2lz9/ngNgoplqKAjcnXkUB5Y/I9PJwIdzo7M1l0eW+J7A6SmAhlm+vRw8HS4gprUzFezE8wxuZ8WDgR7rQ2Py1q7WUkshlb5Bttd6KOtbSGbyEIMmKc0AEMhlNOquw6XTQ1qyH2kQMw++UR261c9NTopiP36feHnyeioVCbdoVeMEdbJ3ZgPdmYjTin3HNJ8MxnKRizUMYDL7fOhtEX+gDIkCZ3ilgaWLx45lm2sEDTqclQN4nZkXZwSWjypqJUKsz/KxYFrt2ywdRwGhMynJDKvQDvAe8HTHeT4OfccNvMuKqXo02lRjorzIU2jwpdvkRR5CflZjYXF+XrA+vA6uWz3hc1GsAH9qKQaznth4+jYO2zgvF3A96HA48cFHxuFpxHBqsF8PhoIfUO4lR/vlj3eFa39CiGDjTlZQuqZVJW1LnuX67HcGfYU5undoCheFy8LgPnDS8p+f0+XGpXg+J5TJeZg+3d3gScd2hEkZdKJf0bNqx8NyggPVVlWf5USbUYIxxovG2bGbyeKOWwKs2CmkY53PbB0g2F4FrBeZyovTYRixIeBNLmEP5mnRywJQZry546kpmRHHgKwbqQvsOYvfqFA21iKhNkn7+evwi4BtJqp1OCEz0T8fmu+ygo7gXnAB7q1aAVDIwGI5bvLcUiaTcyJQMp08dT+LtVK0oAyzLOCxcPTZsyJSdQpwzmtMn56V3lZfN3iylsEcfV/CJYjHp47cLa8OGFCfhNjh1ytRuMUgKv24rjDalw+RjU+nJiJhsJP9+4Zs8QeYwsLW7Z+L09mgx1sxiDFE1DPWky2ARhU/vXCwpYexWBDMTzfrgdNnz0Rca4iCOQeTJaX9n+/B+Ht4UIUCTIPPtee04nYRlR1aaAiFxBhMHM4uMLiXBZZfB57Dj15UR0W2TjIk8m7ntV23VKpdw9qgCCWcW5rbsq1z4fiBARoBkWSXlTIFEOZKaDNRPQZ1TAbrPhL2fGFzaEy779m9fNnTM1LDoivuAoLNDc4HmYLzfe/oEYL+Q4KVMlw2Pvh83OISWRQ9s9Cqebx3fo27Z93cubNq4+EtHno3jF5Od8sNzRI1VqAQX/eMKH21a5btvWrT95c7QOj+wlH+/3w3I3NDuJAYn5/W9tWa/TLfnHWP0e6WtWIsLceRM+p7hDH8k271VV6ubOmRY1Iz7yF91D4RSLCLJIkTxPUuXIbDMavpW/GkQLJ7lc2r9m7ZNHXtqi2ztlSraoN4Hf2p89IoXTpNzMFt2Plx6pqFhZlZmRHNfbv7gFDEesf7fJSlN1ZCq5tpkztFe+s7i0rrgoL/Zi0ij4XwAAAP//m8NMGjlR44EAAAAASUVORK5CYII=
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/unit3d-imdb-combined.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/unit3d-imdb-combined.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    // Options to display each script type
    const SHOW_SIMILAR_MOVIES = true; // Change to false to hide "Movies Like This"
    const PLACE_UNDER_CAST = false; // Put more like this under the cast list, else in the side panel
    const SHOW_TECHNICAL_SPECIFICATIONS = true; // Change to false to hide "Technical Specifications"
    const SHOW_BOX_OFFICE = true; // Change to false to hide "Box Office" data
    const SHOW_AWARDS = true; // Change to false to hide awards data

    // Function to format the IMDb text
    function formatIMDbText() {
        // Find the element containing the IMDb text
        var imdbElement = document.querySelector('div.box_tags .panel__heading__title');

        if (imdbElement) {
            // Create the new formatted HTML
            var formattedHTML = '<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> tags</span>';
            // Set the inner HTML of the element to the formatted HTML
            imdbElement.innerHTML = formattedHTML;
        }
    }
    // Run the function when the DOM is fully loaded
    window.addEventListener('load', formatIMDbText);

    var link = document.querySelector(".meta__imdb > a.meta-id-tag");
    console.log(`element: ${link}`);
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

    // Function to fetch data from IMDb API
    const fetchIMDBData = async (imdbId, afterCursor = null, allAwards = []) => {

        const cacheiMDBKey = `iMDB_data_${imdbId}`;
        const cachedData = await GM.getValue(cacheiMDBKey);
        const cacheTimestamp = await GM.getValue(`${cacheiMDBKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
            const currentTime = new Date().getTime();
            if (currentTime - cacheTimestamp < 1 * 1 * 1 * 1 * 1000) {
                console.log("Using cached data for IMDb");
                const data = JSON.parse(cachedData);
                return data;
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query getTitleDetails($id: ID!, $first: Int!, $after: ID) {
                    title(id: $id) {
                        id
                        titleText {
                            text
                        }
                        releaseYear {
                            year
                        }
                        runtimes(first: 5) {
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
                        moreLikeThisTitles(first: 16) {
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
                    }
                }
            `,
            variables: {
                id: imdbId,
                first: 250,
                after: afterCursor
            }
        };

        return new Promise((resolve, reject) => {
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
                        if (data && data.data && data.data.title) {
                            const titleData = data.data.title;
                            const awardNominations = titleData.awardNominations.edges.map(edge => edge.node);
                            allAwards.push(...awardNominations);

                            if (titleData.awardNominations.pageInfo.hasNextPage) {
                                fetchIMDBData(imdbId, titleData.awardNominations.pageInfo.endCursor, allAwards)
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                titleData.awardNominationsCombined = allAwards;

                                // Remove awardNominations from data as we have combined it
                                delete titleData.awardNominations;

                                // Cache the data
                                data.data.title = titleData;
                                GM.setValue(cacheiMDBKey, JSON.stringify(data));
                                GM.setValue(`${cacheiMDBKey}_timestamp`, new Date().getTime());
                                resolve(data);
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
                const sidebar = document.querySelector('main > article');
                if (!sidebar) {
                    console.error("Sidebar not found");
                    return;
                }
                sidebar.appendChild(newPanel);
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
            let searchLink = `https://blutopia.cc/torrents?imdbId=${movie.id}`;
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
            } else if (displayMethod === 'flex' && count % 8 === 0) {
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

        var newPanel = document.createElement('section');
        newPanel.className = 'panelV2';
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

        var article = document.querySelector('main > article');
        if (!article) {
            console.error("Article not found");
            return;
        }
        article.appendChild(newPanel);

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
                    if (runtime.node.attributes && runtime.node.attributes.length > 0) {
                        value += ` (${runtime.node.attributes.map(attr => attr.text).join(", ")})`;
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

        var sidebar = document.querySelector('.similar-torrents-list');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(newPanel, sidebar.childNodes[4]);

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

        const awardsBefore = document.querySelector('.similar-torrents-list');

        if (awardsBefore && awardsBefore.nextElementSibling) {
            const nextSibling = awardsBefore.nextElementSibling;
            // Append the awards panel after the next sibling div
            nextSibling.parentNode.insertBefore(aDiv, nextSibling.nextElementSibling);
        }
    };

    // Initialize panels
    fetchIMDBData(imdbId).then(data => {
        if (data && data.data && data.data.title) {
            if (SHOW_SIMILAR_MOVIES && data.data.title.moreLikeThisTitles) {
                displaySimilarMovies(data.data.title.moreLikeThisTitles.edges);
            } else if (SHOW_SIMILAR_MOVIES) {
                console.warn("No similar movies found");
            }

            if (SHOW_TECHNICAL_SPECIFICATIONS && data.data.title.technicalSpecifications) {
                displayTechnicalSpecifications(data);
            } else if (SHOW_TECHNICAL_SPECIFICATIONS) {
                console.warn("No technical specifications found");
            }

            if (SHOW_BOX_OFFICE && (data.data.title.worldwideGross || data.data.title.domesticGross || data.data.title.internationalGross)) {
                displayBoxOffice(data);
            } else if (SHOW_BOX_OFFICE) {
                console.warn("No box office data found");
            }

            if (SHOW_AWARDS) {
                displayAwardsData(data.data.title);
            }

        } else {
            console.error("Failed to retrieve valid data");
        }
    }).catch(err => {
        console.error(err);
    });
})();