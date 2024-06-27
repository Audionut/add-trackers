// ==UserScript==
// @name         PTP Screenshots
// @version      1.0
// @description  Load and display screenshots from all torrents on a movie page.
// @author       Audionut
// @namespace    https://github.com/Audionut/add-trackers
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==


(function() {
    'use strict';

    const imageSrcGroups = {}; // Object to store image URLs grouped by the row group text

    // Create a new div element to hold the images
    const newDiv = document.createElement('div');
    newDiv.className = 'panel';

    const panelHeading = document.createElement('div');
    panelHeading.className = 'panel__heading';

    const panelTitle = document.createElement('span');
    panelTitle.className = 'panel__heading__title';
    panelTitle.textContent = 'Screenshots from all torrents';
    panelHeading.appendChild(panelTitle);

    newDiv.appendChild(panelHeading);

    const panelBody = document.createElement('div');
    panelBody.className = 'panel__body';
    newDiv.appendChild(panelBody);

    function addHeaders() {
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
    }

    async function processImagesForGroup(groupText, groupDiv) {
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

        for (const row of rowsToProcess) {
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
                    const unit3dImages = row.querySelectorAll('.UNIT3D.images');
                    if (unit3dImages.length > 0) {
                        if (!imageSrcGroups[groupText][releaseName]) {
                            imageSrcGroups[groupText][releaseName] = [];
                        }
                        unit3dImages.forEach(span => {
                            const imgSrc = span.getAttribute('title');
                            imageSrcGroups[groupText][releaseName].push(imgSrc);
                        });
                        displayImagesForRelease(groupText, releaseName, groupDiv);
                        console.log(`Processed UNIT3D images for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                        processedMatches.add(matchKey);
                        continue; // No delay required for these rows
                    } else {
                        console.log(`No UNIT3D images found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                        continue; // Skip if no links or image spans
                    }
                }

                const onclickContent = linkElement.getAttribute('onclick');
                if (!onclickContent) {
                    console.log(`No onclickContent found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                    // Check for UNIT3D image spans if onclickContent is null
                    const unit3dImages = row.querySelectorAll('.UNIT3D.images');
                    if (unit3dImages.length > 0) {
                        if (!imageSrcGroups[groupText][releaseName]) {
                            imageSrcGroups[groupText][releaseName] = [];
                        }
                        unit3dImages.forEach(span => {
                            const imgSrc = span.getAttribute('title');
                            imageSrcGroups[groupText][releaseName].push(imgSrc);
                        });
                        displayImagesForRelease(groupText, releaseName, groupDiv);
                        console.log(`Processed UNIT3D images for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                        processedMatches.add(matchKey);
                        continue; // No delay required for these rows
                    } else {
                        console.log(`No UNIT3D images found for row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`);
                        continue; // Skip if no links or image spans
                    }
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
                    displayImagesForRelease(groupText, releaseName, groupDiv);
                    console.log(`Loaded cached images for movieId ${movieId}, torrentId ${torrentId}:`, cachedData);
                    processedMatches.add(matchKey);
                    continue; // Skip delay
                }

                await new Promise(r => setTimeout(r, 600)); // Apply delay only once per row

                const url = `https://passthepopcorn.me/torrents.php?action=description&id=${movieId}&torrentid=${torrentId}`;
                const response = await fetch(url);
                const data = await response.json();

                const description = data.Description;
                const parser = new DOMParser();
                const doc = parser.parseFromString(description, 'text/html');
                const imgElements = doc.querySelectorAll('img.bbcode__image');
                const imgSrcList = [];
                if (imgElements.length > 0) {
                    imgElements.forEach(imgElement => {
                        const imgSrc = imgElement.src;
                        imgSrcList.push(imgSrc);
                        if (!imageSrcGroups[groupText][releaseName]) {
                            imageSrcGroups[groupText][releaseName] = [];
                        }
                        imageSrcGroups[groupText][releaseName].push(imgSrc);
                    });
                    GM.setValue(cacheKey, imgSrcList);
                    displayImagesForRelease(groupText, releaseName, groupDiv); // Display images for this release immediately
                    console.log(`Processed images for movieId ${movieId}, torrentId ${torrentId}, releaseName: ${releaseName}`);
                    processedMatches.add(matchKey);
                } else {
                    console.log(`No image elements found in description for movieId ${movieId}, torrentId ${torrentId}`);
                }
            } catch (error) {
                console.error(`Error processing row with releaseName: ${releaseName}, releaseGroup: ${releaseGroup}, size: ${size}`, error);
            }
        }
    }

    function displayImagesForRelease(groupText, releaseName, groupDiv) {
        const releaseDiv = document.createElement('div');
        releaseDiv.style.marginBottom = '5px';

        const releaseHeader = document.createElement('strong');
        releaseHeader.textContent = releaseName;
        releaseHeader.style.display = 'block';
        releaseHeader.style.marginBottom = '5px';
        releaseDiv.appendChild(releaseHeader);

        const imgSrcList = imageSrcGroups[groupText][releaseName] || [];
        let delay = 0;

        imgSrcList.forEach(imgSrc => {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.style.width = '100px';
            img.style.marginRight = '5px';
            img.style.marginBottom = '5px';
            img.onclick = function() {
                lightbox.init(img, 500);
            };

            setTimeout(() => {
                releaseDiv.appendChild(img);
            }, delay);
            delay += 150; // Increment delay for each image
        });

        groupDiv.appendChild(releaseDiv);
        console.log(`Images have been added to the group: ${groupText}, release: ${releaseName}`);
    }

    window.addEventListener('load', function() {
        addHeaders();
    });
})();