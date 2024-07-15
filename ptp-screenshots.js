// ==UserScript==
// @name         PTP Screenshots
// @version      2.3
// @description  Load and display screenshots from all torrents on a movie page with dimension checks for different groups and status indicators.
// @grant        GM.setValue
// @grant        GM.getValue
// @namespace    https://github.com/Audionut/add-trackers
// @match        https://passthepopcorn.me/torrents.php?id=*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-screenshots.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-screenshots.js
// ==/UserScript==

(function() {
    'use strict';

    const imageSrcGroups = {}; // Object to store image URLs grouped by the row group text
    const dimensionLimits = {
        'Standard Definition': { min: { width: 500, height: 250 }, max: { width: 1064, height: 616 } },
        'High Definition': { min: { width: 600, height: 500 }, max: { width: 1940, height: 1120 } },
        'Ultra High Definition': { min: { width: 2000, height: 1100 }, max: { width: 3880, height: 2200 } }
    };

    const comparisonImages = [];
    let processingStatus = 0; // Store the processing status
    let debug = false;

    // Fetch the actual debug value asynchronously
    GM.getValue('debug', false).then(value => {
        debug = value;
        if (debug) {
            console.log('Debugging is enabled');
        }
    });

    // Create a new div element to hold the images and settings
    const newDiv = document.createElement('div');
    newDiv.className = 'screenshots-panel panel';

    const panelHeading = document.createElement('div');
    panelHeading.className = 'panel__heading';

    const panelTitle = document.createElement('span');
    panelTitle.className = 'panel__heading__title';
    panelTitle.textContent = 'Screenshots from all torrents';

    panelHeading.appendChild(panelTitle);

    const settingsButton = document.createElement('span');
    settingsButton.style = 'float:right;font-size:0.9em';

    const settingsButtonA = document.createElement('a');
    settingsButtonA.textContent = '(Settings)';
    settingsButtonA.style.cursor = 'pointer';
    settingsButtonA.onclick = function(event) {
        event.stopPropagation(); // Prevent this click from propagating to the panelHeading click event
        const settingsDiv = document.getElementById('settings-panel');
        if (settingsDiv.style.display === 'none') {
            refreshSettings();
            settingsDiv.style.display = 'block';
        } else {
            settingsDiv.style.display = 'none';
        }
    };
    settingsButton.appendChild(settingsButtonA);
    panelHeading.appendChild(settingsButton);

    newDiv.appendChild(panelHeading);

    const settingsDiv = document.createElement('div');
    settingsDiv.id = 'settings-panel';
    settingsDiv.style.display = 'none';
    settingsDiv.style.marginTop = '10px';
    settingsDiv.style.padding = '10px';
    settingsDiv.style.borderRadius = '5px';
    settingsDiv.style.border = '1px solid #ccc';

    // Add CSS for better spacing and styling
    const style = document.createElement('style');
    style.innerHTML = `
        .settings-table {
            width: 100%;
            margin: auto;
            table-layout: fixed;
        }
        .settings-table td {
            padding: 10px;
            vertical-align: top;
        }
        .settings-table .setting {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .settings-table label {
            margin-right: 10px;
        }
        .settings-table input.small-input {
            width: 50px; /* Adjust this width as needed */
        }
        .release-images-div {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .release-images-div .image-container {
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            background-color: rgb(51, 51, 51);
            max-width: 100%;
        }
        .release-images-div img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: auto;
        }
        .release-div {
            margin-bottom: 10px;
        }
        .release-div.with-header {
            margin-top: 10px;
        }
        .status-message {
            margin-top: 10px;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);

    // Create table for settings
    const settingsTable = document.createElement('table');
    settingsTable.className = 'settings-table';

    const row = document.createElement('tr');

    const leftColumn = document.createElement('td');
    const middleColumn = document.createElement('td');
    const rightColumn = document.createElement('td');

    // Array to store the settings for easy access
    const settings = [
        { label: 'Show Release Names: ', type: 'checkbox', id: 'showReleaseNames', defaultValue: true, onChange: updateReleaseNameVisibility },
        { label: 'Show UNIT3D Images: ', type: 'checkbox', id: 'showUNIT3D', defaultValue: true, onChange: () => {} },
        { label: 'Show Comparison Images: ', type: 'checkbox', id: 'showComparisonImages', defaultValue: true, onChange: () => {} },
        { label: 'Enable Check Image Status: ', type: 'checkbox', id: 'enableCheckImageStatus', defaultValue: true, onChange: () => {} },
        { label: 'Show Failed Image Indicator: ', type: 'checkbox', id: 'showFailedImageIndicator', defaultValue: true, onChange: () => {} },
        { label: 'Check Image Dimensions: ', type: 'checkbox', id: 'checkImageDimensions', defaultValue: true, onChange: () => {} },
        { label: 'Skip Cache: ', type: 'checkbox', id: 'skipcache', defaultValue: false, onChange: () => {} },
        { label: 'Enable Debugging: ', type: 'checkbox', id: 'debug', defaultValue: false, onChange: () => {} },
        { label: 'Number of Images per Row: ', type: 'number', id: 'imagesPerRow', defaultValue: 4, onChange: updateImageLayout, inputClass: 'small-input' },
        { label: 'Hide Panel Body by Default: ', type: 'checkbox', id: 'hidePanelBody', defaultValue: false, onChange: updateHidePanelBodySetting }
    ];

    // Helper function to create setting elements
    function createSetting(labelText, inputType, inputId, defaultValuePromise, onChange, inputClass = '') {
        const settingDiv = document.createElement('div');
        settingDiv.className = 'setting';

        const label = document.createElement('label');
        label.textContent = labelText;
        settingDiv.appendChild(label);

        const input = document.createElement('input');
        input.type = inputType;
        input.id = inputId;
        if (inputClass) input.className = inputClass;

        if (inputType === 'checkbox') {
            defaultValuePromise.then(value => {
                input.checked = value;
            });

            input.onchange = function() {
                GM.setValue(inputId, input.checked);
                onChange(input.checked);
            };
        } else if (inputType === 'number') {
            input.min = 1;
            input.max = 10;

            defaultValuePromise.then(value => {
                input.value = value;
            });

            input.onchange = function() {
                GM.setValue(inputId, input.value);
                onChange(input.value);
            };
        }

        settingDiv.appendChild(input);
        return settingDiv;
    }

    // Function to refresh settings values
    function refreshSettings() {
        settings.forEach(setting => {
            GM.getValue(setting.id, setting.defaultValue).then(value => {
                const input = document.getElementById(setting.id);
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else if (input.type === 'number') {
                    input.value = value;
                }
            });
        });
    }

    // Append settings to columns based on the provided layout
    leftColumn.appendChild(createSetting('Show Release Names: ', 'checkbox', 'showReleaseNames', GM.getValue('showReleaseNames', true), updateReleaseNameVisibility));
    leftColumn.appendChild(createSetting('Show UNIT3D Images: ', 'checkbox', 'showUNIT3D', GM.getValue('showUNIT3D', true), () => {}));
    leftColumn.appendChild(createSetting('Show Comparison Images: ', 'checkbox', 'showComparisonImages', GM.getValue('showComparisonImages', true), () => {}));

    middleColumn.appendChild(createSetting('Enable Check Image Status: ', 'checkbox', 'enableCheckImageStatus', GM.getValue('enableCheckImageStatus', true), () => {}));
    middleColumn.appendChild(createSetting('Show Failed Image Indicator: ', 'checkbox', 'showFailedImageIndicator', GM.getValue('showFailedImageIndicator', true), () => {}));
    middleColumn.appendChild(createSetting('Check Image Dimensions: ', 'checkbox', 'checkImageDimensions', GM.getValue('checkImageDimensions', true), () => {}));

    rightColumn.appendChild(createSetting('Hide Panel Body by Default: ', 'checkbox', 'hidePanelBody', GM.getValue('hidePanelBody', false), updateHidePanelBodySetting));
    rightColumn.appendChild(createSetting('Skip Cache: ', 'checkbox', 'skipcache', GM.getValue('skipcache', false), () => {}));
    rightColumn.appendChild(createSetting('Enable Debugging: ', 'checkbox', 'debug', GM.getValue('debug', false), () => {}));
    rightColumn.appendChild(createSetting('Number of Images per Row: ', 'number', 'imagesPerRow', GM.getValue('imagesPerRow', 4), updateImageLayout, 'small-input'));

    // Append columns to row
    row.appendChild(leftColumn);
    row.appendChild(middleColumn);
    row.appendChild(rightColumn);

    // Append row to table
    settingsTable.appendChild(row);

    // Append table to settingsDiv
    settingsDiv.appendChild(settingsTable);

    newDiv.appendChild(settingsDiv);
    document.body.appendChild(newDiv);

    const panelBody = document.createElement('div');
    panelBody.className = 'panel__body';
    newDiv.appendChild(panelBody);

    const statusMessage = document.createElement('div');
    statusMessage.className = 'status-message';
    panelBody.appendChild(statusMessage);

    // Function to toggle panel body visibility
    function togglePanelBodyVisibility(isHidden) {
        panelBody.style.display = isHidden ? 'none' : 'block';
    }

    // Function to update hide panel body setting without toggling panel body
    function updateHidePanelBodySetting(isHidden) {
        GM.setValue('hidePanelBody', isHidden);
    }

    // Initialize panel body visibility based on the setting
    GM.getValue('hidePanelBody', false).then(hidePanelBody => {
        togglePanelBodyVisibility(hidePanelBody);
    });

    // Add toggle functionality to panel heading
    panelHeading.onclick = function() {
        const isHidden = panelBody.style.display === 'none';
        panelBody.style.display = isHidden ? 'block' : 'none';
        GM.setValue('hidePanelBody', !isHidden); // Update the setting
    };

    function addHeaders() {
        if (debug) {
            console.time('addHeaders');
        }
        const rowGroups = document.querySelectorAll('.basic-movie-list__torrent-edition__sub');

        rowGroups.forEach(rowGroup => {
            const groupText = rowGroup.textContent.trim();
            if (!imageSrcGroups[groupText]) {
                imageSrcGroups[groupText] = {};
            }

            const groupContainer = document.createElement('div');
            groupContainer.style.marginBottom = '10px';

            const groupHeader = document.createElement('strong');
            groupHeader.textContent = groupText;
            groupHeader.style.cursor = 'pointer';
            groupHeader.style.userSelect = 'none';
            groupHeader.style.display = 'block';
            groupHeader.style.marginBottom = '5px';
            groupHeader.onclick = function() {
                const groupDiv = this.nextElementSibling;
                groupDiv.style.display = groupDiv.style.display === 'none' ? 'block' : 'none';
                if (groupDiv.style.display === 'block' && groupDiv.dataset.loaded !== 'true') {
                    processImagesForGroup(groupText, groupDiv).then(() => {});
                    groupDiv.dataset.loaded = 'true';
                }
            };
            groupContainer.appendChild(groupHeader);

            const groupDiv = document.createElement('div');
            groupDiv.style.display = 'none';
            groupDiv.className = 'image-group';
            groupDiv.dataset.groupText = groupText;
            groupContainer.appendChild(groupDiv);

            panelBody.appendChild(groupContainer);
        });

        const synopsisElement = document.getElementById('torrent-table');

        if (synopsisElement) {
            function getNextVisibleSibling(element) {
                var sibling = element.nextElementSibling;
                while (sibling) {
                    if (sibling.offsetParent !== null) {
                        return sibling;
                    }
                    sibling = sibling.nextElementSibling;
                }
                return null;
            }

            var nextVisibleSibling = getNextVisibleSibling(synopsisElement);
            if (nextVisibleSibling) {
                synopsisElement.parentNode.insertBefore(newDiv, nextVisibleSibling);
            } else {
                synopsisElement.parentNode.appendChild(newDiv);
            }

            if (debug) {
                console.log('Inserted new div with images after the torrent table and any hidden siblings');
            }
        } else {
            console.warn('Correct element not found');
        }
        if (debug) {
            console.timeEnd('addHeaders');
        }
    }

    function incrementProcessingStatus(count = 0) {
        processingStatus += count;
        if (debug) {
            console.log(`Incrementing processingStatus. New value: ${processingStatus}`);
        }
    }

    function decrementProcessingStatus(count = 1) {
        processingStatus -= count;
        if (debug) {
            console.log(`Decrementing processingStatus. New value: ${processingStatus}`);
        }
    }

    const checkProcessingCompletion = async (groupText, groupDiv, failedReleases, showFailedImageIndicator, showComparisonImages) => {
        if (debug) {
            console.log(`Final check for processing completion. Status: ${processingStatus}`);
        }
        if (processingStatus === 0) {
            statusMessage.textContent = `Finished fetching and processing all images for group: ${groupText}`;
            if (failedReleases.size > 0) {
                statusMessage.textContent += `\nFailed image checks for releases: ${Array.from(failedReleases).join(', ')}`;
            }
            if (showFailedImageIndicator) {
                failedReleases.forEach(name => {
                    const failedReleaseDiv = document.createElement('div');
                    failedReleaseDiv.textContent = name;
                    failedReleaseDiv.style.color = 'red';
                    groupDiv.appendChild(failedReleaseDiv);
                });
            }
            if (showComparisonImages) {
                await displayComparisonLinks(groupText, groupDiv);
            }
        }
    };

    let isCached = false;

    async function processImagesForGroup(groupText, groupDiv) {
        let debug = await GM.getValue('debug', false);
        statusMessage.textContent = `Fetching and processing images for group: ${groupText}...`;
        if (debug) {
            console.time(`processImagesForGroup_${groupText}`);
        }
        const parentRows = document.querySelectorAll('.group_torrent.group_torrent_header');
        const rowGroupMap = new Map();
        const processedMatches = new Set();
        const failedReleases = new Set();

        parentRows.forEach(row => {
            let currentRow = row;
            while (currentRow) {
                if (currentRow.querySelector('.basic-movie-list__torrent-edition__sub')) {
                    const rowGroupText = currentRow.querySelector('.basic-movie-list__torrent-edition__sub').textContent.trim();
                    rowGroupMap.set(row, rowGroupText);
                    break;
                }
                currentRow = currentRow.previousElementSibling;
            }
        });

        const rowsToProcess = Array.from(parentRows).filter(row => rowGroupMap.get(row) === groupText);

        const showReleaseNames = await GM.getValue('showReleaseNames', true);
        const showUNIT3D = await GM.getValue('showUNIT3D', true);
        const showFailedImageIndicator = await GM.getValue('showFailedImageIndicator', true);
        const showComparisonImages = await GM.getValue('showComparisonImages', true);
        const skipcache = await GM.getValue('skipcache', false);

        const processRow = async (row) => {
            const rowClass = row.className;
            const rowTimer = `processRow_${rowClass}`;
            if (debug) {
                console.time(rowTimer);
            }
            let releaseName, releaseGroup, size;

            try {
                releaseName = row.getAttribute('data-releasename') || '';
                releaseGroup = row.getAttribute('data-releasegroup') || '';
                const sizeElement = row.querySelector('td.nobr span[title]');
                size = sizeElement ? sizeElement.getAttribute('title') : 'Unknown Size';

                const linkElement = row.querySelector('a.torrent-info-link');
                const imgSrcList = new Set();

                if (linkElement) {
                    const onclickContent = linkElement.getAttribute('onclick');
                    if (onclickContent) {
                        const match = onclickContent.match(/show_description\('(\d+)', '(\d+)'\);/);
                        if (match) {
                            const movieId = match[1];
                            const torrentId = match[2];
                            if (debug) {
                                console.log('movieId:', movieId);
                                console.log('torrentId:', torrentId);
                                console.time(`fetchRequest_${releaseName}`);
                            }
                            const url = `https://passthepopcorn.me/torrents.php?action=description&id=${movieId}&torrentid=${torrentId}`;
                            const fetchPromise = fetch(url).then(response => response.json());
                            const delayPromise = new Promise(r => setTimeout(r, 600));
                            const [data] = await Promise.all([fetchPromise, delayPromise]);
                            if (debug) {
                                console.timeEnd(`fetchRequest_${releaseName}`);
                            }

                            const description = data.Description;
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(description, 'text/html');
                            const imgElements = doc.querySelectorAll('img.bbcode__image');
                            const cacheKey = `images_${movieId}_${torrentId}`;
                            const cachedData = await GM.getValue(cacheKey, null);
                            if (!skipcache) {
                                if (cachedData) {
                                    let isCached = true;
                                    if (!imageSrcGroups[groupText][releaseName]) {
                                        imageSrcGroups[groupText][releaseName] = [];
                                    }
                                    imageSrcGroups[groupText][releaseName].push(...cachedData);
                                    cachedData.forEach(src => imgSrcList.add(src));
                                    processingStatus += cachedData.length;
                                    await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages);
                                    console.log(`Loaded cached images for movieId ${movieId}, torrentId ${torrentId}:`, cachedData);
                                    return;
                                }
                            }

                            const comparisonLinks = Array.from(doc.querySelectorAll('a[onclick*="BBCode.ScreenshotComparisonToggleShow"]'));
                            const slowPicsLinks = Array.from(doc.querySelectorAll('a[href*="slow.pics"]'));

                            if (comparisonLinks.length > 0) {
                                if (debug) {
                                    console.log(`Found ${comparisonLinks.length} comparison links for releaseName: ${releaseName}`);
                                }
                                comparisonLinks.forEach(link => {
                                    console.log(`Comparison link found: ${link.outerHTML}`);
                                    const strongElement = link.previousElementSibling;
                                    const strongText = strongElement && strongElement.tagName.toLowerCase() === 'strong' ? strongElement.outerHTML : '';
                                    const htmlString = `${strongText}: ${link.outerHTML}<br>`;
                                    if (!imageSrcGroups[groupText][`${releaseName}_comparison`]) {
                                        imageSrcGroups[groupText][`${releaseName}_comparison`] = [];
                                    }
                                    imageSrcGroups[groupText][`${releaseName}_comparison`].push(htmlString);
                                    incrementProcessingStatus();
                                });
                            }

                            if (slowPicsLinks.length > 0) {
                                if (debug) {
                                    console.log(`Found ${slowPicsLinks.length} slow.pics links for releaseName: ${releaseName}`);
                                }
                                slowPicsLinks.forEach(link => {
                                    console.log(`slow.pics link found: ${link.outerHTML}`);
                                    const strongElement = link.previousElementSibling;
                                    const strongText = strongElement && strongElement.tagName.toLowerCase() === 'strong' ? strongElement.outerHTML : '';
                                    const htmlString = `${strongText}: ${link.outerHTML}<br>`;
                                    if (!imageSrcGroups[groupText][`${releaseName}_comparison`]) {
                                        imageSrcGroups[groupText][`${releaseName}_comparison`] = [];
                                    }
                                    imageSrcGroups[groupText][`${releaseName}_comparison`].push(htmlString);
                                    incrementProcessingStatus();
                                });
                            }

                            if (imgElements.length > 0) {
                                if (debug) {
                                    console.time(`processImages_${releaseName}`);
                                }
                                incrementProcessingStatus(imgElements.length); // Increment here for images found
                                imgElements.forEach(imgElement => {
                                    const imgSrc = imgElement.src;
                                    if (debug) {
                                        console.log(`Image found: ${imgSrc}`);
                                    }
                                    imgSrcList.add(imgSrc);
                                    if (!imageSrcGroups[groupText][releaseName]) {
                                        imageSrcGroups[groupText][releaseName] = [];
                                    }
                                    imageSrcGroups[groupText][releaseName].push(imgSrc);
                                });
                                GM.setValue(cacheKey, Array.from(imgSrcList));
                                GM.setValue('skipcache', false);
                                await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages);
                                if (debug) {
                                    console.log(`Processed images for movieId ${movieId}, torrentId ${torrentId}, releaseName: ${releaseName}`);
                                    console.timeEnd(`processImages_${releaseName}`);
                                }
                            } else {
                                console.log(`No image elements found in description for movieId ${movieId}, torrentId ${torrentId}`);
                            }
                        }
                    }
                }

                // Process UNIT3D image links
                const unit3dImageElements = row.querySelectorAll('.UNIT3D.images');
                if (unit3dImageElements.length > 0) {
                    const showUNIT3D = await GM.getValue('showUNIT3D', true);
                    if (showUNIT3D) {
                        incrementProcessingStatus(unit3dImageElements.length);
                        unit3dImageElements.forEach(imgElement => {
                            const imgSrc = imgElement.getAttribute('title'); // Get the image link from the title attribute
                            if (debug) {
                                console.log(`UNIT3D image found: ${imgSrc}`);
                            }
                            if (!imageSrcGroups[groupText][releaseName]) {
                                imageSrcGroups[groupText][releaseName] = [];
                            }
                            if (!imgSrcList.has(imgSrc)) { // Ensure no duplication
                                imageSrcGroups[groupText][releaseName].push(imgSrc);
                                imgSrcList.add(imgSrc); // Add UNIT3D images to the imgSrcList to be processed for dimensions
                                if (imgSrc.includes('slow.pics')) {
                                    const strongText = imgElement.previousElementSibling ? imgElement.previousElementSibling.outerHTML : '';
                                    const htmlString = `${strongText}: <a href="${imgSrc}" target="_blank">${imgSrc}</a><br>`;
                                    if (!imageSrcGroups[groupText][`${releaseName}_comparison`]) {
                                        imageSrcGroups[groupText][`${releaseName}_comparison`] = [];
                                    }
                                    imageSrcGroups[groupText][`${releaseName}_comparison`].push(htmlString);
                                }
                            }
                        });

                        // Process the UNIT3D images for status and dimensions
                        await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages);
                    }
                }

            } catch (error) {
                console.error(`Error processing row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`, error);
            } finally {
                if (debug) {
                    console.timeEnd(rowTimer);
                }
                decrementProcessingStatus(); // Decrement after processing each row
            }
        };
        if (isCached) {
            processingStatus = rowsToProcess.length; // Set initial processing status
        }
        incrementProcessingStatus(rowsToProcess.length); // Increment for the number of rows to process

        await Promise.all(rowsToProcess.map(row => processRow(row)));
        if (debug) {
            console.timeEnd(`processImagesForGroup_${groupText}`);
            console.log(`Processing status: ${processingStatus}`);
        }
        await checkProcessingCompletion(groupText, groupDiv, failedReleases, showFailedImageIndicator, showComparisonImages);
    }

    async function displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages) {
        let debug = await GM.getValue('debug', false);
        const displayTimer = `displayImagesForRelease_${releaseName}`;
        if (debug) {
            console.time(displayTimer);
        }

        const releaseDiv = document.createElement('div');
        releaseDiv.className = 'release-div';
        if (showReleaseNames) {
            releaseDiv.classList.add('with-header');
        }

        if (showReleaseNames) {
            const releaseHeader = createReleaseHeader(releaseName);
            releaseDiv.appendChild(releaseHeader);
        }

        let releaseImagesDiv;
        if (showReleaseNames) {
            releaseImagesDiv = document.createElement('div');
            releaseImagesDiv.className = 'release-images-div';
            releaseDiv.appendChild(releaseImagesDiv);
            groupDiv.appendChild(releaseDiv);
        } else {
            releaseImagesDiv = groupDiv.querySelector('.release-images-div') || document.createElement('div');
            releaseImagesDiv.className = 'release-images-div';
            if (!groupDiv.contains(releaseImagesDiv)) {
                groupDiv.appendChild(releaseImagesDiv);
            }
        }

        const imgSrcList = imageSrcGroups[groupText]?.[releaseName] || [];
        const imagesPerRow = await getSetting('imagesPerRow', 4);
        const enableCheckImageStatus = await getSetting('enableCheckImageStatus', true);
        const enableCheckImageDimensions = await getSetting('checkImageDimensions', true);

        const processImage = async (imgSrc) => {
            let status = true;
            if (enableCheckImageStatus) {
                status = await checkImageStatus(imgSrc);
            }
            if (status && enableCheckImageDimensions && dimensionLimits[groupText]) {
                const dimensions = await getImageDimensions(imgSrc);
                if (debug) {
                    console.log(`Dimensions for ${imgSrc}: Width=${dimensions.width}, Height=${dimensions.height}`);
                }
                const limits = dimensionLimits[groupText];
                if (dimensions.width > limits.max.width || dimensions.height > limits.max.height ||
                    dimensions.width < limits.min.width || dimensions.height < limits.min.height) {
                    status = false;
                }
            }
            if (status) {
                appendImage(imgSrc, releaseImagesDiv, imagesPerRow);
            } else if (enableCheckImageStatus) {
                failedReleases.add(releaseName);
            }

            decrementProcessingStatus(); // Decrement after processing each image
            if (processingStatus === 0) {
                statusMessage.textContent = `Finished adding all images for group: ${groupText}`;
                if (failedReleases.size > 0) {
                    statusMessage.textContent += `\nFailed image checks for releases: ${Array.from(failedReleases).join(', ')}`;
                }
                if (showFailedImageIndicator) {
                    failedReleases.forEach(name => {
                        const failedReleaseDiv = document.createElement('div');
                        failedReleaseDiv.textContent = name;
                        failedReleaseDiv.style.color = 'red';
                        groupDiv.appendChild(failedReleaseDiv);
                    });
                }
            }
        };

        if (imgSrcList.length > 0) {
            await Promise.all(imgSrcList.map(processImage)); // Process images
        } else {
            console.log(`No images to process for releaseName: ${releaseName}`);
        }
        if (debug) {
            console.timeEnd(displayTimer);
        }
    }

    async function displayComparisonLinks(groupText, groupDiv) {
        let debug = await GM.getValue('debug', false);
        console.log("If comparison links were found they're being displayed now...");
        Object.keys(imageSrcGroups[groupText]).forEach(releaseName => {
            if (releaseName.endsWith('_comparison')) {
                const links = imageSrcGroups[groupText][releaseName];
                if (debug) {
                    console.log(`Comparison Images for ${releaseName.replace('_comparison', '')}:`, links);
                }

                const comparisonDiv = document.createElement('div');
                comparisonDiv.className = 'comparison-links-div';
                const releaseHeader = createReleaseHeader(releaseName.replace('_comparison', ''));
                comparisonDiv.appendChild(releaseHeader);

                links.forEach(link => {
                    if (debug) {
                        console.log(`Adding comparison link to div: ${link}`);
                    }
                    const container = document.createElement('div');
                    container.className = 'image-container';
                    container.style.width = '100%';
                    container.style.color = 'green';
                    container.innerHTML = link;
                    comparisonDiv.appendChild(container);
                });

                groupDiv.appendChild(comparisonDiv);
            }
        });
    }

    function createReleaseHeader(releaseName) {
        const releaseHeader = document.createElement('strong');
        releaseHeader.textContent = releaseName;
        releaseHeader.style.display = 'block';
        releaseHeader.style.marginBottom = '5px';
        releaseHeader.style.cursor = 'pointer';
        releaseHeader.onclick = function() {
            const releaseImagesDiv = this.nextElementSibling;
            releaseImagesDiv.style.display = releaseImagesDiv.style.display === 'none' ? 'block' : 'none';
        };
        return releaseHeader;
    }

    async function getSetting(settingName, defaultValue) {
        try {
            return await GM.getValue(settingName, defaultValue);
        } catch (error) {
            console.error(`Error fetching setting ${settingName}:`, error);
            return defaultValue;
        }
    }

    function appendImage(imgSrc, releaseImagesDiv, imagesPerRow) {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.style.width = `calc(100% / ${imagesPerRow} - 10px)`;

        const img = document.createElement('img');
        img.src = imgSrc;
        img.style.width = '100%';
        img.style.height = 'auto'; // Maintain aspect ratio
        img.style.display = 'block';
        img.style.margin = 'auto';
        img.onclick = () => lightbox.init(img, 500);

        container.appendChild(img);
        releaseImagesDiv.appendChild(container);
    }

    function checkImageStatus(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    function getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
                reject(new Error('Image failed to load'));
            };
            img.src = url;
        });
    }

    function updateReleaseNameVisibility() {
        GM.getValue('showReleaseNames', true).then(showReleaseNames => {
            const releaseHeaders = document.querySelectorAll('.release-div strong');
            releaseHeaders.forEach(header => {
                header.style.display = showReleaseNames ? 'block' : 'none';
            });
            const releaseDivs = document.querySelectorAll('.release-div');
            releaseDivs.forEach(div => {
                if (showReleaseNames) {
                    div.classList.add('with-header');
                } else {
                    div.classList.remove('with-header');
                }
            });
            const screenshotsPanel = document.querySelector('.screenshots-panel .panel__body');
            if (!showReleaseNames) {
                const releaseImagesDiv = document.createElement('div');
                releaseImagesDiv.className = 'release-images-div';
                const allImages = [];
                releaseDivs.forEach(div => {
                    allImages.push(...div.querySelector('.release-images-div').childNodes);
                });
                releaseImagesDiv.append(...allImages);
                screenshotsPanel.innerHTML = '';
                screenshotsPanel.appendChild(releaseImagesDiv);
            } else {
                // Clear the panel body and reinitialize headers and images
                screenshotsPanel.innerHTML = '';
                addHeaders();
            }
        });
    }

    function updateImageLayout() {
        GM.getValue('imagesPerRow', 4).then(imagesPerRow => {
            const images = document.querySelectorAll('.image-container');
            images.forEach(img => {
                img.style.width = `calc(100% / ${imagesPerRow} - 10px)`;
            });
        });
    }

    window.addEventListener('load', function() {
        addHeaders();
    });
})();