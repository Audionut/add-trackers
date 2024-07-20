// ==UserScript==
// @name         PTP - iMDB Combined Script
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.2
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
// ==/UserScript==

(function () {
    'use strict';

    // Options to display each script type
    const SHOW_SIMILAR_MOVIES = true; // Change to false to hide "Movies Like This"
    const PLACE_UNDER_CAST = false;
    const SHOW_TECHNICAL_SPECIFICATIONS = true; // Change to false to hide "Technical Specifications"
    const SHOW_BOX_OFFICE = true; // Change to false to hide "Box Office"

    // Function to format the IMDb text
    function formatIMDbText() {
        // Find the element containing the IMDb text
        var imdbElement = document.querySelector('div.box_tags .panel__heading__title');

        if (imdbElement) {
            // Create the new formatted HTML
            var formattedHTML = '<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">iMDB</span> tags</span>';
            // Set the inner HTML of the element to the formatted HTML
            imdbElement.innerHTML = formattedHTML;
        }
    }
    // Run the function when the DOM is fully loaded
    window.addEventListener('load', formatIMDbText);

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

    let imdbId = imdbUrl.split("/")[4];
    if (!imdbId) {
        console.error("IMDB ID not found");
        return;
    }

    // Function to fetch data from IMDB API
    const fetchIMDBData = async (imdbId) => {

        const cacheiMDBKey = `iMDB_data_${imdbId}`;
        const cachedData = await GM.getValue(cacheiMDBKey);
        const cacheTimestamp = await GM.getValue(`${cacheiMDBKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
            const currentTime = new Date().getTime();
            if (currentTime - cacheTimestamp < 24 * 60 * 60 * 1000) {
                console.log("Using cached data for iMDB");
                const data = JSON.parse(cachedData);
                return data;
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    title(id: "${imdbId}") {
                        runtime {
                            displayableProperty {
                                value {
                                    plainText
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
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        if (data && data.data && data.data.title) {
                            GM.setValue(cacheiMDBKey, JSON.stringify(data));
                            GM.setValue(`${cacheiMDBKey}_timestamp`, new Date().getTime());
                            resolve(data);
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
                sidebar.insertBefore(newPanel, sidebar.childNodes[4]);
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
        imdb.textContent = 'iMDB';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Technical Specifications'));

        var imdbLink = document.createElement('a');
        imdbLink.href = `https://www.imdb.com/title/${imdbId}/technical/?ref_=tt_spec_sm`;
        imdbLink.title = 'IMDB Url';
        imdbLink.textContent = 'IMDB Url';
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
        sidebar.insertBefore(newPanel, sidebar.childNodes[4]);

        const specs = data.data.title.technicalSpecifications || {};
        const runtime = data.data.title.runtime?.displayableProperty?.value?.plainText || 'N/A';
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

        specContainer.innerHTML += `<strong>Runtime:</strong> ${runtime}<br>`;
        specContainer.innerHTML += formatSpec("Aspect Ratio", specs.aspectRatios?.items || [], "aspectRatio", "attributes");
        specContainer.innerHTML += formatSpec("Camera", specs.cameras?.items || [], "camera", "attributes");
        specContainer.innerHTML += formatSpec("Color", specs.colorations?.items || [], "text", "attributes");
        specContainer.innerHTML += formatSpec("Laboratory", specs.laboratories?.items || [], "laboratory", "attributes");
        specContainer.innerHTML += formatSpec("Negative Format", specs.negativeFormats?.items || [], "negativeFormat", "attributes");
        specContainer.innerHTML += formatSpec("Printed Film Format", specs.printedFormats?.items || [], "printedFormat", "attributes");
        specContainer.innerHTML += formatSpec("Cinematographic Process", specs.processes?.items || [], "process", "attributes");
        specContainer.innerHTML += formatSpec("Sound Mix", specs.soundMixes?.items || [], "text", "attributes");
        specContainer.innerHTML += formatFilmLengths(specs.filmLengths?.items || []);

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
        imdb.textContent = 'iMDB';
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
        } else {
            console.error("Failed to retrieve valid data");
        }
    }).catch(err => {
        console.error(err);
    });
})();