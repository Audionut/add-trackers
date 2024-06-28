// ==UserScript==
// @name         PTP Screenshots
// @version      1.1
// @description  Load and display screenshots from all torrents on a movie page.
// @author       Audionut
// @namespace    https://github.com/Audionut/add-trackers
// @match        https://passthepopcorn.me/torrents.php?id=*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-screenshots.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-screenshots.js
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

(function() {
    'use strict';

    const imageSrcGroups = {}; // Object to store image URLs grouped by the row group text

    // Create a new div element to hold the images and settings
    const newDiv = document.createElement('div');
    newDiv.className = 'panel';

    const panelHeading = document.createElement('div');
    panelHeading.className = 'panel__heading';

    const panelTitle = document.createElement('span');
    panelTitle.className = 'panel__heading__title';
    panelTitle.textContent = 'Screenshots from all torrents';
    panelHeading.appendChild(panelTitle);

    const settingsButton = document.createElement('span');
    settingsButton.className = 'panel__heading__settings';
    settingsButton.textContent = 'Settings';
    settingsButton.style.float = 'right';
    settingsButton.style.cursor = 'pointer';
    settingsButton.onclick = function() {
        const settingsDiv = document.getElementById('settings-panel');
        settingsDiv.style.display = settingsDiv.style.display === 'none' ? 'block' : 'none';
    };
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
        #settings-panel label {
            display: block;
            margin-bottom: 10px;
        }
        #settings-panel input[type="checkbox"] {
            margin-right: 10px;
        }
        #settings-panel input[type="number"] {
            margin-right: 10px;
        }
    `;
    document.head.appendChild(style);

    const showReleaseNamesLabel = document.createElement('label');
    showReleaseNamesLabel.textContent = 'Show Release Names: ';
    const showReleaseNamesCheckbox = document.createElement('input');
    showReleaseNamesCheckbox.type = 'checkbox';

    GM.getValue('showReleaseNames', true).then(value => {
        showReleaseNamesCheckbox.checked = value;
    });

    showReleaseNamesCheckbox.onchange = function() {
        GM.setValue('showReleaseNames', showReleaseNamesCheckbox.checked);
        updateReleaseNameVisibility();
    };
    showReleaseNamesLabel.appendChild(showReleaseNamesCheckbox);
    settingsDiv.appendChild(showReleaseNamesLabel);

    const imgWidthLabel = document.createElement('label');
    imgWidthLabel.textContent = 'Image Width (px): ';
    const imgWidthInput = document.createElement('input');
    imgWidthInput.type = 'number';
    imgWidthInput.min = 50;
    imgWidthInput.max = 500;

    GM.getValue('imgWidth', 100).then(value => {
        imgWidthInput.value = value;
    });

    imgWidthInput.onchange = function() {
        GM.setValue('imgWidth', imgWidthInput.value);
        updateImageWidths();
    };
    imgWidthLabel.appendChild(imgWidthInput);
    settingsDiv.appendChild(imgWidthLabel);

    const showUNIT3DLabel = document.createElement('label');
    showUNIT3DLabel.textContent = 'Show UNIT3D Images: ';
    const showUNIT3DCheckbox = document.createElement('input');
    showUNIT3DCheckbox.type = 'checkbox';

    GM.getValue('showUNIT3D', true).then(value => {
        showUNIT3DCheckbox.checked = value;
    });

    showUNIT3DCheckbox.onchange = function() {
        GM.setValue('showUNIT3D', showUNIT3DCheckbox.checked);
    };
    showUNIT3DLabel.appendChild(showUNIT3DCheckbox);
    settingsDiv.appendChild(showUNIT3DLabel);

    const checkImageStatusLabel = document.createElement('label');
    checkImageStatusLabel.textContent = 'Enable Check Image Status: ';
    const checkImageStatusCheckbox = document.createElement('input');
    checkImageStatusCheckbox.type = 'checkbox';

    GM.getValue('enableCheckImageStatus', true).then(value => {
        checkImageStatusCheckbox.checked = value;
    });

    checkImageStatusCheckbox.onchange = function() {
        GM.setValue('enableCheckImageStatus', checkImageStatusCheckbox.checked);
    };
    checkImageStatusLabel.appendChild(checkImageStatusCheckbox);
    settingsDiv.appendChild(checkImageStatusLabel);

    newDiv.appendChild(settingsDiv);

    const panelBody = document.createElement('div');
    panelBody.className = 'panel__body';
    newDiv.appendChild(panelBody);

    function addHeaders() {
        console.time('addHeaders');
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

        const synopsisElement = document.getElementById('synopsis-and-trailer');
        if (synopsisElement) {
            synopsisElement.parentNode.insertBefore(newDiv, synopsisElement);
            console.log('Inserted new div with images before #synopsis-and-trailer');
        } else {
            console.warn('#synopsis-and-trailer element not found');
        }
        console.timeEnd('addHeaders');
    }

    async function processImagesForGroup(groupText, groupDiv) {
        console.time(`processImagesForGroup_${groupText}`);
        const parentRows = document.querySelectorAll('.group_torrent.group_torrent_header');
        const rowGroupMap = new Map();
        const processedMatches = new Set(); // To track processed releaseGroup-size matches

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
        const processedRows = new Set(); // Track processed rows

        const showReleaseNames = await GM.getValue('showReleaseNames', true);
        const showUNIT3D = await GM.getValue('showUNIT3D', true);

        for (const row of rowsToProcess) {
            const rowClass = row.className;
            const rowTimer = `processRow_${rowClass}`;
            console.time(rowTimer);
            try {
                if (processedRows.has(row)) continue; // Skip if already processed
                processedRows.add(row);

                const releaseName = row.getAttribute('data-releasename') || '';
                const releaseGroup = row.getAttribute('data-releasegroup') || '';
                const sizeElement = row.querySelector('td.nobr span[title]');
                const size = sizeElement ? sizeElement.getAttribute('title') : 'Unknown Size';

                const matchKey = `${releaseGroup}_${size}`;
                if (processedMatches.has(matchKey)) {
                    console.log(`Skipping row due to duplicate match: ${matchKey}`);
                    continue; // Skip if already processed
                }

                const linkElement = row.querySelector('a.torrent-info-link');
                if (!linkElement) {
                    console.log(`No link element found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    // Check for UNIT3D image spans
                    if (showUNIT3D) {
                        const unit3dImages = row.querySelectorAll('.UNIT3D.images');
                        if (unit3dImages.length > 0) {
                            if (!imageSrcGroups[groupText][releaseName]) {
                                imageSrcGroups[groupText][releaseName] = [];
                            }
                            unit3dImages.forEach(span => {
                                const imgSrc = span.getAttribute('title');
                                imageSrcGroups[groupText][releaseName].push(imgSrc);
                            });
                            displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames);
                            console.log(`Processed UNIT3D images for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                            continue; // Skip if no links or image spans
                        }
                    } else {
                        continue; // Skip if showUNIT3D is false
                    }
                }

                const onclickContent = linkElement.getAttribute('onclick');
                if (!onclickContent) {
                    console.log(`No onclickContent found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    // Check for UNIT3D image spans
                    if (showUNIT3D) {
                        const unit3dImages = row.querySelectorAll('.UNIT3D.images');
                        if (unit3dImages.length > 0) {
                            if (!imageSrcGroups[groupText][releaseName]) {
                                imageSrcGroups[groupText][releaseName] = [];
                            }
                            unit3dImages.forEach(span => {
                                const imgSrc = span.getAttribute('title');
                                imageSrcGroups[groupText][releaseName].push(imgSrc);
                            });
                            displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames);
                            console.log(`Processed UNIT3D images for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                            continue; // Skip if no links or image spans
                        }
                    }
                    continue; // Skip if no onclick content and no UNIT3D images
                }

                const match = onclickContent.match(/show_description\('(\d+)', '(\d+)'\);/);
                if (!match) {
                    console.log(`No show_description match found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    continue; // Skip to next row
                }

                const [_, movieId, torrentId] = match;
                const cacheKey = `images_${movieId}_${torrentId}`;

                const cachedData = await GM.getValue(cacheKey, null);
                if (cachedData) {
                    if (!imageSrcGroups[groupText][releaseName]) {
                        imageSrcGroups[groupText][releaseName] = [];
                    }
                    imageSrcGroups[groupText][releaseName].push(...cachedData);
                    displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames);
                    console.log(`Loaded cached images for movieId ${movieId}, torrentId ${torrentId}:`, cachedData);
                    processedMatches.add(matchKey);
                    continue; // Skip delay
                }

                // Apply delay only once per fetch request
                console.time(`fetchRequest_${releaseName}`);
                const url = `https://passthepopcorn.me/torrents.php?action=description&id=${movieId}&torrentid=${torrentId}`;
                const fetchPromise = fetch(url).then(response => response.json());
                const delayPromise = new Promise(r => setTimeout(r, 600));
                const [data] = await Promise.all([fetchPromise, delayPromise]);
                console.timeEnd(`fetchRequest_${releaseName}`);

                const description = data.Description;
                const parser = new DOMParser();
                const doc = parser.parseFromString(description, 'text/html');
                const imgElements = doc.querySelectorAll('img.bbcode__image');
                const imgSrcList = [];
                if (imgElements.length > 0) {
                    console.time(`processImages_${releaseName}`);
                    imgElements.forEach(imgElement => {
                        const imgSrc = imgElement.src;
                        imgSrcList.push(imgSrc);
                        if (!imageSrcGroups[groupText][releaseName]) {
                            imageSrcGroups[groupText][releaseName] = [];
                        }
                        imageSrcGroups[groupText][releaseName].push(imgSrc);
                    });
                    GM.setValue(cacheKey, imgSrcList);
                    displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames); // Display images for this release immediately
                    console.log(`Processed images for movieId ${movieId}, torrentId ${torrentId}, releaseName: ${releaseName}`);
                    processedMatches.add(matchKey);
                    console.timeEnd(`processImages_${releaseName}`);
                } else {
                    console.log(`No image elements found in description for movieId ${movieId}, torrentId ${torrentId}`);
                }
            } catch (error) {
                console.error(`Error processing row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`, error);
            }
            console.timeEnd(rowTimer);
        }
        console.timeEnd(`processImagesForGroup_${groupText}`);
    }

    async function displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames) {
        const displayTimer = `displayImagesForRelease_${releaseName}`;
        console.time(displayTimer);
        const releaseDiv = document.createElement('div');
        releaseDiv.style.marginBottom = '5px';

        if (showReleaseNames) {
            const releaseHeader = document.createElement('strong');
            releaseHeader.textContent = releaseName;
            releaseHeader.style.display = 'block';
            releaseHeader.style.marginBottom = '5px';
            releaseHeader.style.cursor = 'pointer';
            releaseHeader.onclick = function() {
                const releaseImagesDiv = this.nextElementSibling;
                releaseImagesDiv.style.display = releaseImagesDiv.style.display === 'none' ? 'block' : 'none';
            };
            releaseDiv.appendChild(releaseHeader);
        }

        const releaseImagesDiv = document.createElement('div');
        releaseImagesDiv.style.display = 'block';
        releaseDiv.appendChild(releaseImagesDiv);

        const imgSrcList = imageSrcGroups[groupText][releaseName] || [];
        let delay = 0;

        const imgWidth = await GM.getValue('imgWidth', 100);
        const enableCheckImageStatus = await GM.getValue('enableCheckImageStatus', true);

        if (enableCheckImageStatus) {
            const checkImageStatusPromises = imgSrcList.map(imgSrc => checkImageStatus(imgSrc).then(status => ({ imgSrc, status })));
            const imgStatusList = await Promise.all(checkImageStatusPromises);

            for (const { imgSrc, status } of imgStatusList) {
                console.time(`checkImageStatus_${imgSrc}`);
                if (status) {
                    console.timeEnd(`checkImageStatus_${imgSrc}`);
                    const img = document.createElement('img');
                    img.src = imgSrc;
                    img.style.width = `${imgWidth}px`;
                    img.style.marginRight = '5px';
                    img.style.marginBottom = '5px';
                    img.onclick = function() {
                        lightbox.init(img, 500);
                    };

                    setTimeout(() => {
                        releaseImagesDiv.appendChild(img);
                    }, delay);
                    delay += 50; // Increment delay for each image
                } else {
                    console.timeEnd(`checkImageStatus_${imgSrc}`);
                }
            }
        } else {
            for (const imgSrc of imgSrcList) {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.style.width = `${imgWidth}px`;
                img.style.marginRight = '5px';
                img.style.marginBottom = '5px';
                img.onclick = function() {
                    lightbox.init(img, 500);
                };

                setTimeout(() => {
                    releaseImagesDiv.appendChild(img);
                }, delay);
                delay += 50; // Increment delay for each image
            }
        }

        groupDiv.appendChild(releaseDiv);
        console.log(`Images have been added to the group: ${groupText}, release: ${releaseName}`);
        console.timeEnd(displayTimer);
    }

    async function checkImageStatus(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    function updateReleaseNameVisibility() {
        GM.getValue('showReleaseNames', true).then(showReleaseNames => {
            const releaseHeaders = document.querySelectorAll('.image-group strong');
            releaseHeaders.forEach(header => {
                header.style.display = showReleaseNames ? 'block' : 'none';
            });
        });
    }

    function updateImageWidths() {
        GM.getValue('imgWidth', 100).then(imgWidth => {
            const images = document.querySelectorAll('.image-group img');
            images.forEach(img => {
                img.style.width = `${imgWidth}px`;
            });
        });
    }

    window.addEventListener('load', function() {
        addHeaders();
    });
})();