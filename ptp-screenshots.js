// ==UserScript==
// @name         PTP Screenshots
// @version      1.9
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

    const imagesPerRowLabel = document.createElement('label');
    imagesPerRowLabel.textContent = 'Number of Images per Row: ';
    const imagesPerRowInput = document.createElement('input');
    imagesPerRowInput.type = 'number';
    imagesPerRowInput.min = 1;
    imagesPerRowInput.max = 10;

    GM.getValue('imagesPerRow', 4).then(value => {
        imagesPerRowInput.value = value;
    });

    imagesPerRowInput.onchange = function() {
        GM.setValue('imagesPerRow', imagesPerRowInput.value);
        updateImageLayout();
    };
    imagesPerRowLabel.appendChild(imagesPerRowInput);
    settingsDiv.appendChild(imagesPerRowLabel);

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

    // Adding the new setting to the settings panel
    const showFailedImageIndicatorLabel = document.createElement('label');
    showFailedImageIndicatorLabel.textContent = 'Show Failed Image Indicator: ';
    const showFailedImageIndicatorCheckbox = document.createElement('input');
    showFailedImageIndicatorCheckbox.type = 'checkbox';

    GM.getValue('showFailedImageIndicator', true).then(value => {
        showFailedImageIndicatorCheckbox.checked = value;
    });

    showFailedImageIndicatorCheckbox.onchange = function() {
        GM.setValue('showFailedImageIndicator', showFailedImageIndicatorCheckbox.checked);
    };
    showFailedImageIndicatorLabel.appendChild(showFailedImageIndicatorCheckbox);
    settingsDiv.appendChild(showFailedImageIndicatorLabel);

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

    const showComparisonImagesLabel = document.createElement('label');
    showComparisonImagesLabel.textContent = 'Show Comparison Images: ';
    const showComparisonImagesCheckbox = document.createElement('input');
    showComparisonImagesCheckbox.type = 'checkbox';

    GM.getValue('showComparisonImages', true).then(value => {
        showComparisonImagesCheckbox.checked = value;
    });

    showComparisonImagesCheckbox.onchange = function() {
        GM.setValue('showComparisonImages', showComparisonImagesCheckbox.checked);
    };
    showComparisonImagesLabel.appendChild(showComparisonImagesCheckbox);
    settingsDiv.appendChild(showComparisonImagesLabel);

    const skipCacheLabel = document.createElement('label');
    skipCacheLabel.textContent = 'Skip Cache: ';
    const skipCacheCheckbox = document.createElement('input');
    skipCacheCheckbox.type = 'checkbox';

    GM.getValue('skipcache', true).then(value => {
        skipCacheCheckbox.checked = value;
    });

    skipCacheCheckbox.onchange = function() {
        GM.setValue('skipcache', skipCacheCheckbox.checked);
    };
    skipCacheLabel.appendChild(skipCacheCheckbox);
    settingsDiv.appendChild(skipCacheLabel);

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

    function incrementProcessingStatus(count = 0) {
        processingStatus += count;
        console.log(`Incrementing processingStatus. New value: ${processingStatus}`);
    }

    function decrementProcessingStatus(count = 1) {
        processingStatus -= count;
        console.log(`Decrementing processingStatus. New value: ${processingStatus}`);
    }

    const checkProcessingCompletion = async (groupText, groupDiv, failedReleases, showFailedImageIndicator, showComparisonImages) => {
        console.log(`Final check for processing completion. Status: ${processingStatus}`);
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
        statusMessage.textContent = `Fetching and processing images for group: ${groupText}...`;
        console.time(`processImagesForGroup_${groupText}`);
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
        const skipcache = await GM.getValue('skipcache', true);

        const processRow = async (row) => {
            const rowClass = row.className;
            const rowTimer = `processRow_${rowClass}`;
            console.time(rowTimer);
            let releaseName, releaseGroup, size;

            try {
                releaseName = row.getAttribute('data-releasename') || '';
                releaseGroup = row.getAttribute('data-releasegroup') || '';
                const sizeElement = row.querySelector('td.nobr span[title]');
                size = sizeElement ? sizeElement.getAttribute('title') : 'Unknown Size';

                const linkElement = row.querySelector('a.torrent-info-link');
                if (!linkElement) {
                //    console.log(`No link element found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    return;
                }

                const onclickContent = linkElement.getAttribute('onclick');
                if (!onclickContent) {
                //    console.log(`No onclickContent found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    return;
                }

                const match = onclickContent.match(/show_description\('(\d+)', '(\d+)'\);/);
                if (!match) {
                    return;
                }
                const movieId = match[1];
                const torrentId = match[2];
                console.log('movieId:', movieId);
                console.log('torentId:', torrentId);
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
                const cacheKey = `images_${movieId}_${torrentId}`;
                const cachedData = await GM.getValue(cacheKey, null);
                if (!skipcache) {
                    if (cachedData) {
                        let isCached = true;
                        if (!imageSrcGroups[groupText][releaseName]) {
                            imageSrcGroups[groupText][releaseName] = [];
                        }
                        imageSrcGroups[groupText][releaseName].push(...cachedData);
                        processingStatus += cachedData.length;
                        await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages);
                        console.log(`Loaded cached images for movieId ${movieId}, torrentId ${torrentId}:`, cachedData);
                        return;
                    }
                }

                const comparisonLinks = Array.from(doc.querySelectorAll('a[onclick*="BBCode.ScreenshotComparisonToggleShow"]'));
                //const compareList = [];
                if (comparisonLinks.length > 0) {
                    console.log(`Found ${comparisonLinks.length} comparison links for releaseName: ${releaseName}`);
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


                const imgSrcList = [];
                if (imgElements.length > 0) {
                    console.time(`processImages_${releaseName}`);
                    incrementProcessingStatus(imgElements.length); // Increment here for images found
                    imgElements.forEach(imgElement => {
                        const imgSrc = imgElement.src;
                        console.log(`Image found: ${imgSrc}`);
                        imgSrcList.push(imgSrc);
                        if (!imageSrcGroups[groupText][releaseName]) {
                            imageSrcGroups[groupText][releaseName] = [];
                        }
                        imageSrcGroups[groupText][releaseName].push(imgSrc);
                    });
                    GM.setValue(cacheKey, imgSrcList);
                    await displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages);
                    console.log(`Processed images for movieId ${movieId}, torrentId ${torrentId}, releaseName: ${releaseName}`);
                    console.timeEnd(`processImages_${releaseName}`);
                } else {
                    console.log(`No image elements found in description for movieId ${movieId}, torrentId ${torrentId}`);
                }
            } catch (error) {
                console.error(`Error processing row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`, error);
            } finally {
                console.timeEnd(rowTimer);
                decrementProcessingStatus(); // Decrement after processing each row
            }
        };
        if (isCached) {
            processingStatus = rowsToProcess.length; // Set initial processing status
        }
        incrementProcessingStatus(rowsToProcess.length); // Increment for the number of rows to process

        await Promise.all(rowsToProcess.map(row => processRow(row)));
        console.timeEnd(`processImagesForGroup_${groupText}`);

        console.log(`Processing status: ${processingStatus}`);
        await checkProcessingCompletion(groupText, groupDiv, failedReleases, showFailedImageIndicator, showComparisonImages);
    }

    async function displayImagesForRelease(groupText, releaseName, groupDiv, showReleaseNames, failedReleases, showFailedImageIndicator, showComparisonImages) {
        //let isCached = 0;
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
                console.log(`Dimensions for ${imgSrc}: Width=${dimensions.width}, Height=${dimensions.height}`);
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

        console.timeEnd(displayTimer);
    }

    async function displayComparisonLinks(groupText, groupDiv) {
        console.log("If comparison links were found they're being displayed now...");
        Object.keys(imageSrcGroups[groupText]).forEach(releaseName => {
            if (releaseName.endsWith('_comparison')) {
                const links = imageSrcGroups[groupText][releaseName];
                console.log(`Comparison Images for ${releaseName.replace('_comparison', '')}:`, links);

                const comparisonDiv = document.createElement('div');
                comparisonDiv.className = 'comparison-links-div';
                const releaseHeader = createReleaseHeader(releaseName.replace('_comparison', ''));
                comparisonDiv.appendChild(releaseHeader);

                links.forEach(link => {
                    console.log(`Adding comparison link to div: ${link}`);
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