// ==UserScript==
// @name         PTP Screenshots
// @version      1.6
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
        'Standard Definition': { width: 1024, height: 576 },
        'High Definition': { width: 1920, height: 1080 },
        'Ultra High Definition': { width: 3840, height: 2160 }
    };

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
            border-radius: 10px;
            background-color: rgb(51, 51, 51);
            width: calc(100% / 4 - 10px); /* Default to 4 images per row with 10px gap */
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

    const checkImageDimensionsLabel = document.createElement('label');
    checkImageDimensionsLabel.textContent = 'Check Image Dimensions: ';
    const checkImageDimensionsCheckbox = document.createElement('input');
    checkImageDimensionsCheckbox.type = 'checkbox';

    GM.getValue('checkImageDimensions', true).then(value => {
        checkImageDimensionsCheckbox.checked = value;
    });

    checkImageDimensionsCheckbox.onchange = function() {
        GM.setValue('checkImageDimensions', checkImageDimensionsCheckbox.checked);
    };
    checkImageDimensionsLabel.appendChild(checkImageDimensionsCheckbox);
    settingsDiv.appendChild(checkImageDimensionsLabel);

    newDiv.appendChild(settingsDiv);

    const panelBody = document.createElement('div');
    panelBody.className = 'panel__body';
    newDiv.appendChild(panelBody);

    const statusMessage = document.createElement('div');
    statusMessage.className = 'status-message';
    panelBody.appendChild(statusMessage);

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
        statusMessage.textContent = `Fetching and processing images for group: ${groupText}...`;
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

        // Initialize the processing counter
        const processingStatus = { [groupText]: 0 };

        const processRow = async (row) => {
            const rowClass = row.className;
            const rowTimer = `processRow_${rowClass}`;
            console.time(rowTimer);
            try {
                if (processedRows.has(row)) return; // Skip if already processed
                processedRows.add(row);

                const releaseName = row.getAttribute('data-releasename') || '';
                const releaseGroup = row.getAttribute('data-releasegroup') || '';
                const sizeElement = row.querySelector('td.nobr span[title]');
                const size = sizeElement ? sizeElement.getAttribute('title') : 'Unknown Size';

                const matchKey = `${releaseGroup}_${size}`;
                if (processedMatches.has(matchKey)) {
                    console.log(`Skipping row due to duplicate match: ${matchKey}`);
                    return; // Skip if already processed
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
                            processingStatus[groupText] += imageSrcGroups[groupText][releaseName].length;
                            await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, processingStatus);
                            console.log(`Processed UNIT3D images for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                            return; // Skip if no links or image spans
                        }
                    } else {
                        return; // Skip if showUNIT3D is false
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
                            processingStatus[groupText] += imageSrcGroups[groupText][releaseName].length;
                            await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, processingStatus);
                            console.log(`Processed UNIT3D images for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                            return; // Skip if no links or image spans
                        }
                    }
                    return; // Skip if no onclick content and no UNIT3D images
                }

                const match = onclickContent.match(/show_description\('(\d+)', '(\d+)'\);/);
                if (!match) {
                    console.log(`No show_description match found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    return; // Skip to next row
                }

                const [_, movieId, torrentId] = match;
                const cacheKey = `images_${movieId}_${torrentId}`;

                const cachedData = await GM.getValue(cacheKey, null);
                if (cachedData) {
                    if (!imageSrcGroups[groupText][releaseName]) {
                        imageSrcGroups[groupText][releaseName] = [];
                    }
                    imageSrcGroups[groupText][releaseName].push(...cachedData);
                    processingStatus[groupText] += cachedData.length;
                    await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, processingStatus);
                    console.log(`Loaded cached images for movieId ${movieId}, torrentId ${torrentId}:`, cachedData);
                    processedMatches.add(matchKey);
                    return; // Skip delay
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
                    processingStatus[groupText] += imgSrcList.length;
                    await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, processingStatus); // Display images for this release immediately
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
        };

        await Promise.all(rowsToProcess.map(row => processRow(row)));
        console.timeEnd(`processImagesForGroup_${groupText}`);
        // Ensure the status message is updated after all rows are processed and images added
        if (processingStatus[groupText] === 0) {
            statusMessage.textContent = `Finished fetching and processing all images for group: ${groupText}`;
        }
    }

    async function displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, processingStatus) {
        const displayTimer = `displayImagesForRelease_${releaseName}`;
        console.time(displayTimer);

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
        const imgWidth = await getSetting('imgWidth', 100);
        const enableCheckImageStatus = await getSetting('enableCheckImageStatus', true);
        const enableCheckImageDimensions = await getSetting('checkImageDimensions', true);

        const dimensionLimits = {
            'Standard Definition': { min: { width: 500, height: 300 }, max: { width: 1024, height: 576 } },
            'High Definition': { min: { width: 1000, height: 500 }, max: { width: 1920, height: 1080 } },
            'Ultra High Definition': { min: { width: 2000, height: 1100 }, max: { width: 3840, height: 2160 } }
        };

        const processImage = async (imgSrc) => {
            let status = true;
            if (enableCheckImageStatus) {
                status = await checkImageStatus(imgSrc);
            }
            if (status && enableCheckImageDimensions && dimensionLimits[groupText]) {
                const dimensions = await getImageDimensions(imgSrc);
                console.log(`Dimensions for ${imgSrc}: Width=${dimensions.width}, Height=${dimensions.height}`);
                const limits = dimensionLimits[groupText];
                if (dimensions.width > limits.max.width || dimensions.height > limits.max.height ||
                    dimensions.width < limits.min.width || dimensions.height < limits.min.height) {
                    status = false;
                }
            }
            if (status) {
                appendImage(imgSrc, releaseImagesDiv, imgWidth);
            }
            // Decrement the processing counter and check if all processing is done
            processingStatus[groupText]--;
            if (processingStatus[groupText] === 0) {
                statusMessage.textContent = `Finished adding all images for group: ${groupText}`;
            }
        };

        await Promise.all(imgSrcList.map(imgSrc => processImage(imgSrc)));

        console.log(`Images have been added to the group: ${groupText}, release: ${releaseName}`);
        console.timeEnd(displayTimer);
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

    function appendImage(imgSrc, releaseImagesDiv, imgWidth) {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.style.width = `${imgWidth}px`;

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