// ==UserScript==
// @name         PTP iMDB Box Office
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Add "Box Office" details onto PTP from IMDB API
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-imdb-box-office.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-imdb-box-office.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

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

    const fetchBoxOfficeData = async (imdbId, boxOfficeArea) => {
        const cacheboxKey = `boxOffice_${imdbId}_${boxOfficeArea}`;
        const cachedData = await GM.getValue(cacheboxKey);
        const cacheTimestamp = await GM.getValue(`${cacheboxKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
            const currentTime = new Date().getTime();
            if (currentTime - cacheTimestamp < 24 * 60 * 60 * 1000) {
                console.log("Using cached data for box office");
                displayBoxOffice(JSON.parse(cachedData), boxOfficeArea);
                return;
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    title(id: "${imdbId}") {
                        rankedLifetimeGross(boxOfficeArea: ${boxOfficeArea}) {
                            total {
                                amount
                                currency
                            }
                            rank
                        }
                        openingWeekendGross(boxOfficeArea: ${boxOfficeArea}) {
                            gross {
                                total {
                                    amount
                                    currency
                                }
                            }
                            theaterCount
                            weekendEndDate
                            weekendStartDate
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
                    const data = JSON.parse(response.responseText);
                    GM.setValue(cacheboxKey, JSON.stringify(data));
                    GM.setValue(`${cacheboxKey}_timestamp`, new Date().getTime());
                    displayBoxOffice(data, boxOfficeArea);
                } else {
                    console.error("Failed to fetch box office data", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    const displayBoxOffice = (data, boxOfficeArea) => {
        const titleData = data.data.title || {};
        const panelBody = document.getElementById('box_office').querySelector('.panel__body');

        const boxOfficeContainer = document.createElement('div');
        boxOfficeContainer.className = 'boxOffice';
        boxOfficeContainer.style.color = "#fff";
        boxOfficeContainer.style.fontSize = "1em";

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        };

        const formatBoxOffice = (title, boxOfficeData, boxOfficeArea) => {
            if (boxOfficeData && boxOfficeData.total && boxOfficeData.total.amount) {
                return `<strong>Gross (${boxOfficeArea}):</strong> USD ${formatCurrency(boxOfficeData.total.amount)} (Rank: ${boxOfficeData.rank})<br>`;
            }
            return "";
        };

        const formatOpeningWeekendGross = (boxOfficeData) => {
            if (boxOfficeData && boxOfficeData.gross && boxOfficeData.gross.total.amount) {
                return `<strong>Opening Weekend Gross (${boxOfficeArea}):</strong> USD ${formatCurrency(boxOfficeData.gross.total.amount)}<br>`;
            }
            return "";
        };

        if (boxOfficeArea === 'WORLDWIDE') {
            boxOfficeContainer.innerHTML += formatBoxOffice("Ranked Lifetime Gross", titleData.rankedLifetimeGross, boxOfficeArea);
        } else if (boxOfficeArea === 'DOMESTIC') {
            boxOfficeContainer.innerHTML += formatBoxOffice("Ranked Lifetime Gross", titleData.rankedLifetimeGross, boxOfficeArea);
            boxOfficeContainer.innerHTML += formatOpeningWeekendGross(titleData.openingWeekendGross);
            if (titleData.openingWeekendGross) {
                boxOfficeContainer.innerHTML += `<strong>Theater Count:</strong> ${titleData.openingWeekendGross.theaterCount}<br>
                        <strong>Weekend Start Date:</strong> ${titleData.openingWeekendGross.weekendStartDate}<br>
                        <strong>Weekend End Date:</strong> ${titleData.openingWeekendGross.weekendEndDate}<br>`;
            }
        } else if (boxOfficeArea === 'INTERNATIONAL') {
            boxOfficeContainer.innerHTML += formatBoxOffice("Ranked Lifetime Gross", titleData.rankedLifetimeGross, boxOfficeArea);
            boxOfficeContainer.innerHTML += formatOpeningWeekendGross(titleData.openingWeekendGross);
        }

        panelBody.appendChild(boxOfficeContainer);
    };

    const boxOfficeAreas = ['WORLDWIDE', 'DOMESTIC', 'INTERNATIONAL'];

    boxOfficeAreas.forEach(area => {
        fetchBoxOfficeData(imdbId, area);
    });
})();