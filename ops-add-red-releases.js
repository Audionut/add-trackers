// ==UserScript==
// @name         OPS - add RED releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.2
// @description  Add releases from RED to OPS
// @author       Audionut
// @match        https://orpheus.network/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_deleteValue
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ops-add-red-releases.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ops-add-red-releases.js
// @icon         https://orpheus.network/favicon.ico
// @run-at       document-idle
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
                open: function(doc) {
                    console.log('Settings panel opened');

                    // Apply styles directly to the iframe (this.frame)
                    let style = this.frame.style;
                    style.width = "500px"; // Adjust the width of the iframe
                    style.height = "400px"; // Adjust the height of the iframe
                    style.top = "10%"; // Adjust the top position as needed
                    style.left = "50%"; // Center horizontally
                    style.transform = "translateX(-50%)"; // Horizontal centering with transform
                    style.borderRadius = "10px"; // Adds border radius
                    style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)"; // Apply a shadow to the iframe
                    style.backgroundColor = "#333"; // Ensure the background is dark
                    style.position = "fixed"; // Fixed positioning to keep it in place
                },
                save: function() {
                    console.log('Saving settings...');
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

        // Register the menu command to open the settings panel
        GM_registerMenuCommand('Configure API & Cache Settings', () => { GM_config.open(); });
    }

    const opsApiUrl = 'https://orpheus.network/ajax.php?action=torrent&id=';
    const redApiUrl = 'https://redacted.ch/ajax.php?action=artist&artistreleases=1&artistname=';

    const OPS_API_KEY = GM_getValue('OPS_API_KEY');
    const RED_API_KEY = GM_getValue('RED_API_KEY');
    const sizeMatching = GM_getValue('sizeMatching', 0);
    const CACHE_EXPIRY_DAYS = GM_getValue('CACHE_EXPIRY_TIME', 7); // Default to 7 days
    const CACHE_EXPIRY_TIME = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const OPS_RATE_LIMIT = 5; // Max 5 requests per 10 seconds
    const OPS_RATE_INTERVAL = 10000; // 10 seconds

    let opsRequestQueue = [];
    let opsRequestCount = 0;
    let opsRequestTimer;

    // Function to compress and cache data
    const setCache = (key, data) => {
        try {
            const stringData = JSON.stringify(data);
            const compressedData = LZString.compress(stringData);
            GM_setValue(key, compressedData);
            //console.log(`Data compressed and cached under key: ${key}`);
        } catch (e) {
            console.error(`Failed to compress and cache data for key: ${key}`, e);
        }
    };

    // Function to decompress and retrieve cached data
    const getCache = (key) => {
        const compressedData = GM_getValue(key, null);
        if (compressedData && typeof compressedData === 'string') {
            try {
                const decompressedData = LZString.decompress(compressedData);
                if (decompressedData) {
                    return JSON.parse(decompressedData);
                } else {
                    //console.warn(`Data for key ${key} was not properly compressed or decompressed.`);
                    return null;
                }
            } catch (e) {
                console.error(`Failed to decompress data for key: ${key}`, e);
                return null;
            }
        } else {
            //console.warn(`Data for key ${key} is not in string format or is null, returning as is.`);
            return compressedData;
        }
    };

    // Function to handle OPS API rate limiting
    function handleOpsRateLimit(requestFn) {
        if (opsRequestCount < OPS_RATE_LIMIT) {
            opsRequestCount++;
            requestFn();

            // Reset the request count after the interval
            if (!opsRequestTimer) {
                opsRequestTimer = setTimeout(() => {
                    opsRequestCount = 0;
                    opsRequestTimer = null;
                    processOpsQueue(); // Process any remaining requests in the queue
                }, OPS_RATE_INTERVAL);
            }
        } else {
            // Add the request to the queue if the limit is reached
            opsRequestQueue.push(requestFn);
        }
    }

    // Function to process the queued OPS API requests
    function processOpsQueue() {
        while (opsRequestQueue.length > 0 && opsRequestCount < OPS_RATE_LIMIT) {
            const requestFn = opsRequestQueue.shift();
            handleOpsRateLimit(requestFn);
        }
    }

    // Function to send OPS API request with caching
    const opsApiRequest = (torrentId) => {
        const cacheKey = `OPS_${torrentId}`;
        const cachedData = getCache(cacheKey);

        if (cachedData) {
            //console.log('OPS API data from cache:', cachedData);
            return Promise.resolve(cachedData);
        }

        return new Promise((resolve, reject) => {
            handleOpsRateLimit(() => {
                GM_xmlhttpRequest({
                    url: `${opsApiUrl}${torrentId}`,
                    method: 'GET',
                    headers: {
                        'Authorization': OPS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    onload: (res) => {
                        if (res.status === 200) {
                            const responseJson = JSON.parse(res.responseText);
                            console.log("OPS API Data:", responseJson);
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
        });
    };

    // Function to send RED API request with caching
    const redApiRequest = (artistName) => {
        const cacheKey = `RED_${artistName}`;
        const cachedData = getCache(cacheKey);

        if (cachedData) {
            //console.log('RED API data from cache:', cachedData);
            return Promise.resolve(cachedData);
        }

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
                        setCache(cacheKey, responseJson);
                        resolve(responseJson);
                    } else {
                        reject(new Error(`RED API Error: HTTP ${res.status}`));
                    }
                },
                onerror: (err) => {
                    reject(err);
                }
            });
        });
    };

    function createMatchHtml(torrent) {
        const { leechers, seeders, snatched, size, media, format, encoding, scene, logScore, hasCue, groupId, id, remasterRecordLabelAppended, fileCountAppended, sizeToleranceAppended, isFreeload, freeTorrent, isNeutralleech } = torrent;

        let sizeDisplay;
        if (size >= 1024 ** 3) {
            sizeDisplay = (size / (1024 ** 3)).toFixed(2) + ' GiB'; // Convert to GiB if size >= 1 GiB
        } else {
            sizeDisplay = (size / (1024 ** 2)).toFixed(2) + ' MiB'; // Convert to MiB if size < 1 GiB
        }

        // Dynamically build the info string
        let torrentDetails = `RED / ${media} / ${format} / ${encoding}`;

        if (scene) {
            torrentDetails += ` / Scene`;
        }
        if (logScore) {
            torrentDetails += ` / Log (${logScore}%)`;
        }
        if (hasCue) {
            torrentDetails += ` / Cue`;
        }
        if (remasterRecordLabelAppended) {
            torrentDetails += ` / (RED label) ${remasterRecordLabelAppended}`;
        }
        if (fileCountAppended) {
            torrentDetails += ` / ${fileCountAppended}`;
        }
        if (sizeToleranceAppended) {
            torrentDetails += ` / ${sizeToleranceAppended}`;
        }

        // Construct the correct link for the torrent
        const torrentLink = `https://redacted.ch/torrents.php?id=${groupId}&torrentid=${id}#torrent${id}`;

        // Construct the download link for RED API call
        const downloadUrl = `https://redacted.ch/ajax.php?action=download&id=${id}`;

        // Determine which label to show based on freeload, freeTorrent, or neutral leech
        let leechLabel = '';
        if (isFreeload) {
            leechLabel = '<strong class="torrent_label tooltip tl_free" title="Freeload!" style="white-space: nowrap;">Freeload!</strong>';
        } else if (freeTorrent) {
            leechLabel = '<strong class="torrent_label tooltip tl_free" title="Freeleech!" style="white-space: nowrap;">Freeleech!</strong>';
        } else if (isNeutralleech) {
            leechLabel = '<strong class="torrent_label tooltip tl_neutral" title="Neutral Leech!" style="white-space: nowrap;">Neutral Leech!</strong>';
        }

        // Returning the content inside the <tr> that matches the current HTML structure
        return `
            <td class="td_info" colspan="1">
                <span class="torrent_links_block">
                    [ <a href="#" class="dl-link" data-id="${id}" title="Download">DL</a> ]
                </span>
                <a href="${torrentLink}" target="_blank">▶ [${torrentDetails}] ${leechLabel}</a>
            </td>
            <td class="number_column td_size nobr">${sizeDisplay}</td>
            <td class="number_column m_td_right td_snatched">${snatched}</td>
            <td class="number_column m_td_right td_seeders">${seeders}</td>
            <td class="number_column m_td_right td_leechers">${leechers}</td>
        `;
    }

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('dl-link')) {
            event.preventDefault(); // Prevent the default link behavior
            const torrentId = event.target.getAttribute('data-id');
            const downloadUrl = `https://redacted.ch/ajax.php?action=download&id=${torrentId}`;

            //console.log("Attempting to download torrent:", torrentId);
            console.log("Download URL:", downloadUrl);

            // Make the API request to download the torrent file
            GM_xmlhttpRequest({
                url: downloadUrl,
                method: 'GET',
                headers: {
                    'Authorization': RED_API_KEY, // Your RED API key
                },
                responseType: 'blob', // Receive the response as a file
                onload: (res) => {
                    if (res.status === 200) {
                        console.log('Download successful');
                        // Successfully downloaded .torrent file, now handle the file download
                        const blob = new Blob([res.response], { type: 'application/x-bittorrent' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `torrent_${torrentId}.torrent`; // Set the download filename
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url); // Clean up after download
                    } else {
                        console.error('Failed to download torrent:', res.responseText);
                        console.error('HTTP Status:', res.status); // Log status for debugging
                    }
                },
                onerror: (err) => {
                    console.error('Error during download request:', err);
                }
            });
        }
    });

    // Function to insert the exact match HTML under the matched torrent ID as a new row
    function appendMatchHtml(torrentId, exactMatch) {
        const torrentRow = document.getElementById(`torrent${torrentId}`);
        if (torrentRow) {
            const matchHtml = createMatchHtml(exactMatch);

            // Create a new <tr> element for the match
            const matchRow = document.createElement('tr');
            matchRow.id = `torrent${torrentId}`;
            matchRow.classList.add('torrent_row', 'exact_match_row', 'group_torrent');
            matchRow.style.fontWeight = 'normal';
            matchRow.innerHTML = matchHtml;

            // Insert the new row after the current torrent row
            torrentRow.parentNode.insertBefore(matchRow, torrentRow.nextSibling);
        } else {
            console.warn(`No element found for torrent ID: ${torrentId}`);
        }
    }

    // Helper function to normalize strings (trim, convert to lowercase, decode HTML entities, normalize spaces around dashes and special characters)
    function normalize(str) {
        if (!str) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        let decodedStr = textarea.value;  // Decode HTML entities
        // Replace en-dash (–), em-dash (—), and hyphen (-) with a single hyphen and remove spaces around them
        decodedStr = decodedStr.replace(/\s*[-–—]\s*/g, '-');
        // Replace multiple spaces with a single space
        decodedStr = decodedStr.replace(/\s+/g, ' ');
        return decodedStr.trim().toLowerCase().replace(/['"]/g, ''); // Remove quotes and trim spaces
    }

    function findMatchingTorrent(opsData, redData) {
        const opsTorrent = opsData.response.torrent;
        const redTorrents = redData.response.torrentgroup;

        // Arrays to store exact and tolerance matches
        const exactMatches = [];
        const toleranceMatches = [];
        const unmatchedRedTorrents = [];

        redTorrents.forEach(group => {
            const opsGroupName = normalize(opsData.response.group.name);
            const redGroupName = normalize(group.groupName);

            const groupMatch = opsGroupName === redGroupName;

            if (!groupMatch) {
                unmatchedRedTorrents.push(group);
                return;
            }

            // Compare the torrent properties once a group match is found
            group.torrent.forEach(torrent => {
                const exactSizeMatch = torrent.size === opsTorrent.size;
                const sizeDifference = Math.abs(torrent.size - opsTorrent.size);
                const sizeTolerance = 1024 * 1024 * sizeMatching;
                const fileCountMatch = torrent.fileCount === opsTorrent.fileCount;

                const allPropsMatch = (
                    (!torrent.media || !opsTorrent.media || normalize(torrent.media) === normalize(opsTorrent.media)) &&
                    (!torrent.format || !opsTorrent.format || normalize(torrent.format) === normalize(opsTorrent.format)) &&
                    (!torrent.encoding || !opsTorrent.encoding || normalize(torrent.encoding) === normalize(opsTorrent.encoding)) &&
                    (!torrent.remasterTitle || !opsTorrent.remasterTitle || normalize(torrent.remasterTitle) === normalize(opsTorrent.remasterTitle)) &&
                    (!torrent.remasterYear || !opsTorrent.remasterYear || torrent.remasterYear === opsTorrent.remasterYear)
                );

                // Allow mismatch in remasterRecordLabel, fileCount, or size tolerance but append the differences
                let labelMismatch = !normalize(torrent.remasterRecordLabel).includes(normalize(opsTorrent.remasterRecordLabel));
                let fileCountMismatch = torrent.fileCount !== opsTorrent.fileCount;
                let sizeToleranceMatch = sizeDifference < sizeTolerance && !exactSizeMatch;

                if (allPropsMatch && (exactSizeMatch || sizeToleranceMatch)) {
                    if (labelMismatch && torrent.remasterRecordLabel) {
                        torrent.remasterRecordLabelAppended = torrent.remasterRecordLabel; // Append remasterRecordLabel
                    }
                    if (fileCountMismatch) {
                        torrent.fileCountAppended = `RED FileCount: ${torrent.fileCount}`; // Append fileCount from RED API
                    }
                    if (sizeToleranceMatch) {
                        const sizeDifferenceMiB = Math.abs(torrent.size - opsTorrent.size) / (1024 ** 2); // Calculate size difference in MiB
                        torrent.sizeToleranceAppended = `SizeDifference: ${sizeDifferenceMiB.toFixed(2)} MiB`; // Append size difference
                    }

                    appendMatchHtml(opsTorrent.id, torrent);
                    exactMatches.push(torrent);
                } else if (allPropsMatch && sizeDifference < sizeTolerance) {
                    toleranceMatches.push(torrent);
                } else {
                    unmatchedRedTorrents.push(group);
                }
            });
        });

        if (exactMatches.length > 0 || toleranceMatches.length > 0) {
            return {
                exactMatches,
                toleranceMatches
            };
        }

        return null;
    }

    // Process the extracted torrent ID
    function processTorrentId(torrentId) {
        opsApiRequest(torrentId)
            .then(opsResponse => {
                const artistName = opsResponse.response.group.musicInfo.artists[0].name;
                //console.log('Extracted artist name:', artistName);

                return redApiRequest(artistName).then(redResponse => {
                    findMatchingTorrent(opsResponse, redResponse);
                });
            })
            .catch(error => {
                console.error('API request error:', error);
            });
    }

    // Find all elements with torrent links and process them
    const groupInfoElements = document.querySelectorAll('.torrent_links_block');
    //console.log("Found Group Info Elements:", groupInfoElements.length);
    groupInfoElements.forEach(groupInfo => {
        const torrentId = extractTorrentId(groupInfo);
        //console.log('Group Info Element:', groupInfo);
        if (torrentId) {
            //console.log('Extracted torrent ID:', torrentId);
            processTorrentId(torrentId);
        } else {
            console.log('No torrent ID found.');
        }
    });

    // Helper function to extract torrent ID from anchor tag
    function extractTorrentId(groupInfo) {
        const match = groupInfo.querySelector('a[href*="torrentid"]');
        createSettingsMenu();
        if (match) {
            //console.log("Match found:", match.href);
            const torrentId = match.href.match(/torrentid=(\d+)/);
            return torrentId ? torrentId[1] : null;
        }
        return null;
    }

})();