// ==UserScript==
// @name         OPS/RED - add releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.2.1
// @description  Add releases to/from RED/OPS
// @author       Audionut
// @match        https://orpheus.network/torrents.php?id=*
// @match        https://orpheus.network/artist.php?id=*
// @match        https://redacted.sh/torrents.php?id=*
// @match        https://redacted.sh/artist.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_deleteValue
// @grant        GM_listValues
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ops-red-add-releases.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ops-red-add-releases.js
// @icon         https://orpheus.network/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    function createSettingsMenu() {
        const fields = {
            OPS_API_KEY: {
                label: 'OPS API Key',
                type: 'text',
                default: GM_getValue('OPS_API_KEY', ''),
                tooltip: 'Enter your OPS API Key'
            },
            RED_API_KEY: {
                label: 'RED API Key',
                type: 'text',
                default: GM_getValue('RED_API_KEY', ''),
                tooltip: 'Enter your RED API Key'
            },
            High_Lighting: {
                label: 'Add highlighting to the added rows',
                type: 'checkbox',
                default: GM_getValue('High_Lighting', false),
                tooltip: 'Add or not'
            },
            sizeMatching: {
                label: 'Size Tolerance (in MiB)',
                type: 'number',
                default: GM_getValue('sizeMatching', 0),
                tooltip: 'Allowed difference in size for matching (in MiB)'
            },
            CACHE_EXPIRY_TIME: {
                label: 'Cache Expiry Time (in days)',
                type: 'number',
                default: GM_getValue('CACHE_EXPIRY_TIME', 7), // default 7 days
                tooltip: 'Cache expiry time in days'
            }
        };

        GM_config.init({
            id: 'APIConfig',
            title: 'API Configuration Settings',
            fields: fields,
            css: `
                #APIConfig {
                    background: #333;
                    color: #fff;
                    padding: 20px;
                    width: 400px;
                    max-width: 90%;
                    border-radius: 10px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                #APIConfig .field_label {
                    color: #fff;
                    width: 90%;
                }
                #APIConfig .config_header {
                    color: #fff;
                    padding-bottom: 10px;
                }
                #APIConfig .config_var {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                }
                #APIConfig .config_var input {
                    width: 60%;
                    padding: 4px;
                }
            `,
            events: {
                save: function() {
                    const fields = GM_config.fields;
                    for (const field in fields) {
                        if (fields.hasOwnProperty(field)) {
                            const value = GM_config.get(field);
                            GM_setValue(field, value);
                        }
                    }
                }
            }
        });

        GM_registerMenuCommand('Configure API & Cache Settings', () => { GM_config.open(); });
    }

    const isOPS = window.location.hostname.includes("orpheus.network");
    const sourceSiteUrl = isOPS ? 'https://orpheus.network' : 'https://redacted.sh';
    const targetSiteUrl = isOPS ? 'https://redacted.sh' : 'https://orpheus.network';

    const opsApiUrl = 'https://orpheus.network/ajax.php?action=artist&artistreleases=1&artistname=';
    const redApiUrl = 'https://redacted.sh/ajax.php?action=artist&artistreleases=1&artistname=';

    const sourceApiKey = isOPS ? GM_getValue('OPS_API_KEY') : GM_getValue('RED_API_KEY');
    const targetApiKey = isOPS ? GM_getValue('RED_API_KEY') : GM_getValue('OPS_API_KEY');
    const OPS_API_KEY = GM_getValue('OPS_API_KEY');
    const RED_API_KEY = GM_getValue('RED_API_KEY');
    const highLighting = GM_getValue('High_Lighting', false);
    const sizeMatching = GM_getValue('sizeMatching', 0);
    const CACHE_EXPIRY_DAYS = GM_getValue('CACHE_EXPIRY_TIME', 14);
    const CACHE_EXPIRY_TIME = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const isArtistPage = window.location.href.includes('artist.php?id=');
    // Function to extract artist name from the page header
    function extractArtistData() {
        let artistLink = document.querySelector('.header h2 a[href*="artist.php?id="]');
        let artistName;
        if (artistLink) {
            artistName = artistLink.textContent.trim();
        } else {
            const artistNameElement = document.querySelector('.header h2');
            artistName = artistNameElement ? artistNameElement.textContent : null;
        }
        if (artistName) {
            //console.log("Artist Name:", artistName);
            return { artistName };
        }

        console.warn('Artist data not found.');
        return null;
    }

    function flushCache() {
        const keys = GM_listValues();
        keys.forEach(key => {
            // Delete keys except OPS_API_KEY and RED_API_KEY
            if ((key.startsWith('CACHE_') || key.startsWith('OPS_') || key.startsWith('RED_') || key.startsWith('TARGET_') || key.startsWith('SOURCE_') || key.startsWith('https'))
                && key !== 'OPS_API_KEY' && key !== 'RED_API_KEY') {
                GM_deleteValue(key);
            }
        });
        alert("Cache has been flushed, except API keys.");
    }

    // Create the "Flush Cache" link
    const flushLink = document.createElement('a');
    flushLink.textContent = 'Flush Cache';
    flushLink.href = '#';
    flushLink.style.marginLeft = '10px';
    flushLink.onclick = (e) => {
        e.preventDefault();
        flushCache();
    };

    // Append the link to div.linkbox
    const linkboxDiv = document.querySelector('div.linkbox');
    if (linkboxDiv) {
        linkboxDiv.appendChild(flushLink);
    } else {
        console.warn('linkbox div not found, cannot append cache flush link.');
    }
    let siteName;
    if (!isOPS) {
        siteName = "OPS";
    } else {
        siteName = "RED";
    }
    // Add the h2 text as the first child of <div id="SnatchData">
    const snatchDataDiv = document.querySelector('.header');
    let searchingHeader = document.getElementById('searching-header');
    if (!searchingHeader) {
        searchingHeader = document.createElement('h2');
        searchingHeader.classList.add('page__title');
        searchingHeader.textContent = `Pulling data from ${siteName} API.....`;
        searchingHeader.style.color = "yellow";
        searchingHeader.id = "searching-header";
        snatchDataDiv.insertBefore(searchingHeader, snatchDataDiv.secondChild);
    }

    // Function to compress and cache data
    const setCache = (key, data) => {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        const stringData = JSON.stringify(cacheData);
        const compressedData = LZString.compress(stringData);
        GM_setValue(key, compressedData);
    };

    // Function to decompress and retrieve cached data
    const getCache = (key) => {
        const compressedData = GM_getValue(key, null);
        if (compressedData && typeof compressedData === 'string') {
            const decompressedData = LZString.decompress(compressedData);
            if (decompressedData) {
                const cacheData = JSON.parse(decompressedData);
                const currentTime = Date.now();
                if (currentTime - cacheData.timestamp > CACHE_EXPIRY_TIME) {
                    GM_deleteValue(key); // Delete expired cache
                    return null;
                }
                return cacheData.data;
            }
        }
        return null;
    };

    // Function to send OPS API request with caching (now using artist ID)
    const opsApiRequest = (artistName) => {
        //console.log("Artist Name being used for OPS API:", artistName);
        const cacheKey = `OPS_${artistName}`;
        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log('OPS API data from cache:', cachedData);
            return Promise.resolve(cachedData);
        }
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: `${opsApiUrl}${encodeURIComponent(artistName)}`,
                method: 'GET',
                headers: {
                    'Authorization': OPS_API_KEY,
                    'Content-Type': 'application/json',
                },
                onload: (res) => {
                    if (res.status === 200) {
                        const responseJson = JSON.parse(res.responseText);
                        console.log("OPS API response:", responseJson);
                        setCache(cacheKey, responseJson);
                        resolve(responseJson);
                    } else {
                        reject(new Error(`OPS API Error: HTTP ${res.status}`));
                    }
                },
                onerror: (err) => {
                    reject(err);
                }
            });
        });
    };

    // Function to send RED API request with caching (using artist name)
    const redApiRequest = (artistName) => {
        //console.log("Artist Name being used for RED API:", artistName);
        const cacheKey = `RED_${artistName}`;
        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log('RED API data from cache:', cachedData);
            return Promise.resolve(cachedData);
        }
        //console.log(`RED API URL: ${redApiUrl}${encodeURIComponent(artistName)}`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: `${redApiUrl}${encodeURIComponent(artistName)}`,
                method: 'GET',
                headers: {
                    'Authorization': RED_API_KEY,
                    'Content-Type': 'application/json',
                },
                onload: (res) => {
                    if (res.status === 200) {
                        const responseJson = JSON.parse(res.responseText);
                        console.log("RED API response:", responseJson);
                        setCache(cacheKey, responseJson);
                        resolve(responseJson);
                    } else {
                        reject(new Error(`RED API Error: HTTP ${res.status}`));
                        if (searchingHeader) {
                            searchingHeader.remove();
                        }
                    }
                },
                onerror: (err) => {
                    reject(err);
                }
            });
        });
    };

    let match_group;
    let release_Type;

    // Function to match torrents between OPS and RED
    function findMatchingTorrent(sourceData, targetData) {
        // Assign source and target torrents based on current site
        const sourceTorrents = sourceData.response.torrentgroup;
        const targetTorrents = targetData.response.torrentgroup;

        const exactMatches = [];
        const toleranceMatches = [];
        const unmatchedTargetTorrents = [];

        targetTorrents.forEach(targetGroup => {
            const targetGroupName = normalize(targetGroup.groupName);

            sourceTorrents.forEach(sourceGroup => {
                const sourceGroupName = normalize(sourceGroup.groupName);
                release_Type = sourceGroup.releaseType;

                if (sourceGroupName === targetGroupName) {
                    // Now match torrents within this group
                    sourceGroup.torrent.forEach(sourceTorrent => {
                        targetGroup.torrent.forEach(targetTorrent => {
                            const exactSizeMatch = targetTorrent.size === sourceTorrent.size;
                            const sizeDifference = Math.abs(targetTorrent.size - sourceTorrent.size);
                            const sizeTolerance = 1024 * 1024 * sizeMatching; // MiB tolerance
                            match_group = sourceTorrent.groupId;

                            const allPropsMatch = (
                                (!targetTorrent.media || !sourceTorrent.media || normalize(targetTorrent.media) === normalize(sourceTorrent.media)) &&
                                (!targetTorrent.format || !sourceTorrent.format || normalize(targetTorrent.format) === normalize(sourceTorrent.format)) &&
                                (!targetTorrent.encoding || !sourceTorrent.encoding || normalize(targetTorrent.encoding) === normalize(sourceTorrent.encoding)) &&
                                (!targetTorrent.remasterTitle || !sourceTorrent.remasterTitle || normalize(targetTorrent.remasterTitle) === normalize(sourceTorrent.remasterTitle)) &&
                                (!targetTorrent.remasterYear || !sourceTorrent.remasterYear || targetTorrent.remasterYear === sourceTorrent.remasterYear)
                            );

                            let labelMismatch = !normalize(targetTorrent.remasterRecordLabel).includes(normalize(sourceTorrent.remasterRecordLabel));
                            let fileCountMismatch = targetTorrent.fileCount !== sourceTorrent.fileCount;
                            let sizeToleranceMatch = sizeDifference < sizeTolerance && !exactSizeMatch;

                            if (allPropsMatch && (exactSizeMatch || sizeToleranceMatch)) {
                                if (!exactMatches.some(t => t.id === targetTorrent.id)) { // Check for duplicates
                                    if (labelMismatch && targetTorrent.remasterRecordLabel) {
                                        targetTorrent.remasterRecordLabelAppended = targetTorrent.remasterRecordLabel;
                                    }
                                    if (fileCountMismatch) {
                                        targetTorrent.fileCountAppended = `FileCount: ${targetTorrent.fileCount}`;
                                    }
                                    if (sizeToleranceMatch) {
                                        const sizeDifferenceMiB = sizeDifference / (1024 ** 2);
                                        targetTorrent.sizeToleranceAppended = `SizeDifference: ${sizeDifferenceMiB.toFixed(2)} MiB`;
                                    }
                                    appendMatchHtml(sourceTorrent.id, targetTorrent);
                                    exactMatches.push(targetTorrent);
                                }
                            } else if (allPropsMatch && sizeDifference < sizeTolerance) {
                                if (!toleranceMatches.some(t => t.id === targetTorrent.id)) { // Check for duplicates
                                    toleranceMatches.push(targetTorrent);
                                }
                            } else {
                                if (!unmatchedTargetTorrents.some(t => t.id === targetGroup.id)) { // Check for duplicates in unmatched
                                    unmatchedTargetTorrents.push(targetGroup);
                                }
                            }
                        });
                    });
                } else {
                    if (!unmatchedTargetTorrents.some(t => t.id === targetGroup.id)) { // Check for duplicates in unmatched
                        unmatchedTargetTorrents.push(targetGroup);
                    }
                }
            });
        });

        const event = new CustomEvent('OPSaddREDreleasescomplete');
        document.dispatchEvent(event);
        if (searchingHeader) {
            searchingHeader.remove();
        }
        if (exactMatches.length > 0 || toleranceMatches.length > 0) {
            return {
                exactMatches,
                toleranceMatches
            };
        }

        return null;
    }

    // Function to initiate the API requests based on the current site
    const artistData = extractArtistData();
    if (artistData) {
        if (isOPS) {
            opsApiRequest(artistData.artistName)
                .then(opsResponse => {
                    return redApiRequest(artistData.artistName).then(redResponse => {
                        findMatchingTorrent(opsResponse, redResponse); // Match from OPS to RED
                    });
                })
                .catch(error => {
                    console.error('API request error:', error);
                });
        } else {
            redApiRequest(artistData.artistName)
                .then(redResponse => {
                    return opsApiRequest(artistData.artistName).then(opsResponse => {
                        findMatchingTorrent(redResponse, opsResponse); // Match from RED to OPS
                    });
                })
                .catch(error => {
                    console.error('API request error:', error);
                });
        }
    } else {
        console.error('No artist data found on the page.');
    }

    // Helper function to normalize strings (trim, convert to lowercase, etc.)
    function normalize(str) {
        if (!str) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        let decodedStr = textarea.value;
        decodedStr = decodedStr.replace(/\s*[-–—]\s*/g, '-');
        decodedStr = decodedStr.replace(/\s+/g, ' ');
        return decodedStr.trim().toLowerCase().replace(/['"]/g, '');
    }

    if (isArtistPage) {
        if (isOPS) {
            // Function to toggle the hidden class on dynamically added torrent rows
            function toggleHiddenForDynamicRows(groupId) {
                const dynamicRows = document.querySelectorAll(`.torrent_row.exact_match_row.group_torrent.groupid_${match_group}`);
                dynamicRows.forEach(row => {
                    // Toggle the 'hidden' class based on its current state
                    if (row.classList.contains('hidden')) {
                        row.classList.remove('hidden');
                    } else {
                        row.classList.add('hidden');
                    }
                });
            }

            // Listen for the toggle_group event on the group link
            document.getElementById('showimg_1282625').addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior if needed

                // Call the function to toggle hidden on all rows with the group ID
                toggleHiddenForDynamicRows(1282625);
            });
        } else {
            // If not OPS, listen for the toggle_edition event on the specified group
            const editionToggleLink = document.querySelector(`.groupid_2292984 .edition_info a`);

            if (editionToggleLink) {
                editionToggleLink.addEventListener('click', (event) => {
                    event.preventDefault(); // Prevent default link behavior

                    // Get the edition number from the matching row's classes
                    const editionRow = editionToggleLink.closest('.torrent_row');
                    const editionClass = Array.from(editionRow.classList).find(cls => cls.startsWith('edition_'));

                    // Toggle the hidden class for rows with the specified group ID and edition
                    const editionRows = document.querySelectorAll(`.torrent_row.groupid_2292984.${editionClass}`);
                    editionRows.forEach(row => {
                        if (row.classList.contains('hidden')) {
                            row.classList.remove('hidden');
                        } else {
                            row.classList.add('hidden');
                        }
                    });
                });
            }
        }
    }

    function appendMatchHtml(torrentId, exactMatch) {
        const torrentRowId = `torrent${torrentId}`;
        let torrentRow = document.getElementById(torrentRowId);

        // Determine the version based on whatVersion
        const matchHtml = createMatchHtml(exactMatch);

        if (!torrentRow && isArtistPage && !isOPS) {
            // On artist pages without isOPS, locate the torrent row by searching for the torrentId within each row
            const rows = document.querySelectorAll('.torrent_row');
            rows.forEach(row => {
                if (row.innerHTML.includes(`torrentid=${torrentId}`)) {
                    torrentRow = row;
                }
            });
        }

        if (torrentRow) {
            const matchRow = document.createElement('tr');
            matchRow.id = `${torrentRowId}_match`;

            if (!isArtistPage) {
              // Extract the edition class from the original torrent row and add it to the new row
              const editionClass = Array.from(torrentRow.classList).find(cls => cls.startsWith('edition_'));
              if (highLighting) {
                  matchRow.classList.add('torrent_row', `releases_${release_Type}`, `groupid_${match_group}`, 'group_torrent', 'colhead_dark', editionClass);
              } else {
                  matchRow.classList.add('torrent_row', `releases_${release_Type}`, `groupid_${match_group}`, 'group_torrent', editionClass);
              }
            } else {
                matchRow.classList.add('torrent_row', 'exact_match_row', 'group_torrent', `groupid_${match_group}`);
            }
            matchRow.style.fontWeight = 'normal';
            if (!isOPS && !isArtistPage && highLighting) {
                matchRow.style.fontSize = '0.91em';
            }
            matchRow.innerHTML = matchHtml;

            if (isArtistPage) {
                // Insert directly after the matched row
                torrentRow.parentNode.insertBefore(matchRow, torrentRow.nextSibling);
            } else {
                // On torrent pages, insert after the "hidden" row as usual
                let hiddenRow = torrentRow.nextElementSibling;
                while (hiddenRow && !hiddenRow.id.includes(`torrent_${torrentId}`)) {
                    hiddenRow = hiddenRow.nextElementSibling;
                }

                if (hiddenRow) {
                    hiddenRow.parentNode.insertBefore(matchRow, hiddenRow.nextSibling);
                } else {
                    console.warn(`No hidden row found for torrent ID: ${torrentId}`);
                }
            }
        } else {
            //console.warn(`No element found for torrent ID: ${torrentId}`);
        }
    }

    function createMatchHtml(torrent, version = 'version1') {
        const { leechers, seeders, snatched, size, media, format, encoding, scene, logScore, hasCue, groupId, id, remasterRecordLabelAppended, fileCountAppended, sizeToleranceAppended, isFreeload, freeTorrent, isNeutralleech } = torrent;

        let sizeDisplay;
        let torrentDetails;
        let siteIcon;
        let details;
        let siteDlLink;
        if (!isOPS) {
            if (isArtistPage) {
              torrentDetails = `&nbsp;${format} / ${encoding}`;
            } else {
              torrentDetails = `${format} / ${encoding}`;
            }
            sizeDisplay = (size >= 1024 ** 3) ? (size / (1024 ** 3)).toFixed(2) + ' GB' : (size / (1024 ** 2)).toFixed(2) + ' MB';
            siteIcon = "»";
            details = `${torrentDetails}`;
            siteDlLink = `<a href="https://orpheus.network/download/torrentId=${id}#" class="dl-link" data-id="${id}" title="Download">DL</a>`;
        } else {
            torrentDetails = `${media} / ${format} / ${encoding}`;
            sizeDisplay = (size >= 1024 ** 3) ? (size / (1024 ** 3)).toFixed(2) + ' GiB' : (size / (1024 ** 2)).toFixed(2) + ' MiB';
            siteIcon = "▶"
            details = `${torrentDetails}`;
            siteDlLink = "<a href=\"#\" class=\"dl-link\" data-id=\"" + id + "\" title=\"Download\">DL</a>";
        }

        if (scene) details += ` / Scene`;
        if (logScore) details += ` / Log (${logScore}%)`;
        if (hasCue) details += ` / Cue`;
        if (remasterRecordLabelAppended) details += ` / (RED label) ${remasterRecordLabelAppended}`;
        if (fileCountAppended) details += ` / ${fileCountAppended}`;
        if (sizeToleranceAppended) details += ` / ${sizeToleranceAppended}`;

        const colspanValue = isArtistPage ? 2 : 1;
        let torrentLink;
        if (!isOPS) {
            torrentLink = `https://orpheus.network/torrents.php?id=${groupId}&torrentid=${id}#torrent${id}`;
        } else {
            torrentLink = `https://redacted.sh/torrents.php?id=${groupId}&torrentid=${id}#torrent${id}`;
        }
        const leechLabel = isFreeload ? '<strong class="torrent_label tooltip tl_free" title="Freeload!" style="white-space: nowrap;">Freeload!</strong>' :
            freeTorrent ? '<strong class="torrent_label tooltip tl_free" title="Freeleech!" style="white-space: nowrap;">Freeleech!</strong>' :
            isNeutralleech ? '<strong class="torrent_label tooltip tl_neutral" title="Neutral Leech!" style="white-space: nowrap;">Neutral Leech!</strong>' : '';

        let darkLines = "";
        if (highLighting) {
            if (!isOPS) {
                darkLines = "text-align: right; padding-right: 15px !important;";
            } else {
                darkLines = "";
            }
        }

            return `
                <td class="td_info" colspan=${colspanValue}>
                    ${!isOPS && isArtistPage
                        ? `&nbsp;&nbsp;${siteIcon} <a href="${torrentLink}" target="_blank">${details} ${leechLabel}</a>`
                        : `<a href="${torrentLink}" target="_blank">${siteIcon} ${details} ${leechLabel}</a>`
                    }
                    <span class="torrent_links_block" style="float: right;">
                        ${isOPS || (!isOPS && !isArtistPage) ? `${siteDlLink}` : siteDlLink}
                    </span>
                    ${!isOPS
                        ? `<strong class="torrent_label tooltip tl_notice">OPS</strong>`
                        : `<strong class="torrent hidden"></strong>`
                    }
                </td>
                <td class="number_column td_filecount nobr ${isOPS ? '' : 'hidden'}">${torrent.fileCount}</td>
                <td class="number_column td_size nobr" style="${darkLines}">${sizeDisplay}</td>
                <td class="number_column m_td_right td_snatched" style="${darkLines}">${snatched}</td>
                <td class="number_column m_td_right td_seeders" style="${darkLines}">${seeders}</td>
                <td class="number_column m_td_right td_leechers" style="${darkLines}">${leechers}</td>
            `;
    }

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('dl-link')) {
            event.preventDefault();
            const torrentId = event.target.getAttribute('data-id');
            let downloadUrl;
            let api_key;
            if (!isOPS) {
                downloadUrl = `https://orpheus.network/ajax.php?action=download&id=${torrentId}`;
                api_key = OPS_API_KEY;
            } else {
                downloadUrl = `https://redacted.sh/ajax.php?action=download&id=${torrentId}`;
                api_key = RED_API_KEY;
            }

            GM_xmlhttpRequest({
                url: downloadUrl,
                method: 'GET',
                headers: { 'Authorization': api_key },
                responseType: 'blob',
                onload: (res) => {
                    if (res.status === 200) {
                        const blob = new Blob([res.response], { type: 'application/x-bittorrent' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `torrent_${torrentId}.torrent`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                    } else {
                        console.error('Failed to download torrent:', res.responseText);
                    }
                },
                onerror: (err) => {
                    console.error('Error during download request:', err);
                }
            });
        }
    });
    createSettingsMenu();
})();
