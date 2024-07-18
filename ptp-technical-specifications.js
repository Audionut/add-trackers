// ==UserScript==
// @name         PTP Technical Specifications
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1.0
// @description  Add "Technical Specifications" onto PTP from IMDB API
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-technical-specifications.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-technical-specifications.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        .technicalSpecification {
            padding: 5px;
            margin: 5px 0;
            color: #fff;
            font-size: 1em;
        }
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
    panelHeading.appendChild(toggle);
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

    const fetchTechnicalSpecifications = async () => {
        const cachespecsKey = `technicalSpecifications_${imdbId}`;
        const cachedData = await GM.getValue(cachespecsKey);
        const cacheTimestamp = await GM.getValue(`${cachespecsKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
            const currentTime = new Date().getTime();
            if (currentTime - cacheTimestamp < 24 * 60 * 60 * 1000) {
                console.log("Using cached data for technical specifications");
                displayTechnicalSpecifications(JSON.parse(cachedData));
                return;
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
                                    displayableProperty {
                                        qualifiersInMarkdownList {
                                            markdown
                                        }
                                        value {
                                            markdown
                                            expandedMarkdown
                                            plaidHtml
                                            plainText
                                        }
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
                    console.log("Fetched data:", JSON.stringify(data, null, 2));
                    GM.setValue(cachespecsKey, JSON.stringify(data));
                    GM.setValue(`${cachespecsKey}_timestamp`, new Date().getTime());
                    displayTechnicalSpecifications(data);
                } else {
                    console.error("Failed to fetch technical specifications", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    const displayTechnicalSpecifications = (data) => {
        console.log("Displaying technical specifications with data:", JSON.stringify(data, null, 2));
        const specs = data.data.title.technicalSpecifications;
        console.log("Specs:", specs);
        const runtime = data.data.title.runtime.displayableProperty.value.plainText;
        const panelBody = document.getElementById('technical_specifications').querySelector('.panel__body');

        const specContainer = document.createElement('div');
        specContainer.className = 'technicalSpecification';

        const formatSpec = (title, items, key, attributesKey) => {
            console.log(`Formatting ${title}:`, items);
            if (items && items.length > 0) {
                let values = items.map(item => {
                    console.log("Item:", item);
                    let value = item[key];
                    if (item[attributesKey] && item[attributesKey].length > 0) {
                        value += ` (${item[attributesKey].map(attr => attr.text).join(", ")})`;
                    }
                    return value;
                }).filter(value => value).join(", ");
                console.log(`${title} values:`, values);
                return `<strong>${title}:</strong> ${values}<br>`;
            }
            return "";
        };

        specContainer.innerHTML += `<strong>Runtime:</strong> ${runtime}<br>`;
        specContainer.innerHTML += formatSpec("Aspect Ratio", specs.aspectRatios.items, "aspectRatio", "attributes");
        specContainer.innerHTML += formatSpec("Camera", specs.cameras.items, "camera", "attributes");
        specContainer.innerHTML += formatSpec("Color", specs.colorations.items, "text", "attributes");
        specContainer.innerHTML += formatSpec("Laboratory", specs.laboratories.items, "laboratory", "attributes");
        specContainer.innerHTML += formatSpec("Negative Format", specs.negativeFormats.items, "negativeFormat", "attributes");
        specContainer.innerHTML += formatSpec("Printed Film Format", specs.printedFormats.items, "printedFormat", "attributes");
        specContainer.innerHTML += formatSpec("Cinematographic Process", specs.processes.items, "process", "attributes");
        specContainer.innerHTML += formatSpec("Sound Mix", specs.soundMixes.items, "text", "attributes");

        panelBody.appendChild(specContainer);
    };

    fetchTechnicalSpecifications();
})();