// ==UserScript==
// @name         OPS - add RED releases
// @namespace    https://github.com/Audionut/add-trackers
// @version      2.2
// @description  Add releases from RED to OPS
// @author       Audionut
// @match        https://orpheus.network/torrents.php?id=*
// @match        https://orpheus.network/artist.php?id=*
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

    const opsApiArtistUrl = 'https://orpheus.network/ajax.php?action=artist&id=';
    const redApiUrl = 'https://redacted.ch/ajax.php?action=artist&artistreleases=1&artistname=';

    const OPS_API_KEY = GM_getValue('OPS_API_KEY');
    const RED_API_KEY = GM_getValue('RED_API_KEY');
    const sizeMatching = GM_getValue('sizeMatching', 0);
    const CACHE_EXPIRY_DAYS = GM_getValue('CACHE_EXPIRY_TIME', 7);
    const CACHE_EXPIRY_TIME = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Function to extract artist ID and artist name from the page header
    function extractArtistData() {
        let artistLink = document.querySelector('.header h2 a[href*="artist.php?id="]');
        let artistName, artistId;

        if (artistLink) {
            artistId = artistLink.href.match(/id=(\d+)/)[1];
            artistName = artistLink.textContent.trim();
        } else {
            const artistNameElement = document.querySelector('.header h2');
            const artistIdLink = document.querySelector('.linkbox a[href*="artistid="]');

            if (artistNameElement && artistIdLink) {
                artistName = artistNameElement.textContent.trim();
                artistId = artistIdLink.href.match(/artistid=(\d+)/)[1];
            }
        }

        if (artistName && artistId) {
            return { artistId, artistName };
        }

        console.warn('Artist data not found.');
        return null;
    }

    // Add the h2 text as the first child of <div id="SnatchData">
    const snatchDataDiv = document.querySelector('.header');
    let searchingHeader = document.getElementById('searching-header');
    if (!searchingHeader) {
        searchingHeader = document.createElement('h2');
        searchingHeader.classList.add('page__title');
        searchingHeader.textContent = "Pulling data from RED API.....";
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
    const opsApiRequest = (artistId) => {
        const cacheKey = `OPS_${artistId}`;
        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log('OPS API data from cache:', cachedData);
            return Promise.resolve(cachedData);
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: `${opsApiArtistUrl}${artistId}`,
                method: 'GET',
                headers: {
                    'Authorization': OPS_API_KEY,
                    'Content-Type': 'application/json',
                },
                onload: (res) => {
                    if (res.status === 200) {
                        const responseJson = JSON.parse(res.responseText);
                        console.log(`OPS API response: ${JSON.stringify(responseJson, null, 2)}`);
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
                        console.log(`RED API response: ${JSON.stringify(responseJson, null, 2)}`);
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

    // Function to match torrents between OPS and RED
    function findMatchingTorrent(opsData, redData) {
        const opsTorrents = opsData.response.torrentgroup;
        const redTorrents = redData.response.torrentgroup;

        const exactMatches = [];
        const toleranceMatches = [];
        const unmatchedRedTorrents = [];

        redTorrents.forEach(redGroup => {
            const redGroupName = normalize(redGroup.groupName);

            opsTorrents.forEach(opsGroup => {
                const opsGroupName = normalize(opsGroup.groupName);

                if (opsGroupName === redGroupName) {
                    // Now match torrents within this group
                    opsGroup.torrent.forEach(opsTorrent => {
                        redGroup.torrent.forEach(redTorrent => {
                            const exactSizeMatch = redTorrent.size === opsTorrent.size;
                            const sizeDifference = Math.abs(redTorrent.size - opsTorrent.size);
                            const sizeTolerance = 1024 * 1024 * sizeMatching; // MiB tolerance

                            const allPropsMatch = (
                                (!redTorrent.media || !opsTorrent.media || normalize(redTorrent.media) === normalize(opsTorrent.media)) &&
                                (!redTorrent.format || !opsTorrent.format || normalize(redTorrent.format) === normalize(opsTorrent.format)) &&
                                (!redTorrent.encoding || !opsTorrent.encoding || normalize(redTorrent.encoding) === normalize(opsTorrent.encoding)) &&
                                (!redTorrent.remasterTitle || !opsTorrent.remasterTitle || normalize(redTorrent.remasterTitle) === normalize(opsTorrent.remasterTitle)) &&
                                (!redTorrent.remasterYear || !opsTorrent.remasterYear || redTorrent.remasterYear === opsTorrent.remasterYear)
                            );

                            let labelMismatch = !normalize(redTorrent.remasterRecordLabel).includes(normalize(opsTorrent.remasterRecordLabel));
                            let fileCountMismatch = redTorrent.fileCount !== opsTorrent.fileCount;
                            let sizeToleranceMatch = sizeDifference < sizeTolerance && !exactSizeMatch;

                            if (allPropsMatch && (exactSizeMatch || sizeToleranceMatch)) {
                                if (!exactMatches.some(t => t.id === redTorrent.id)) { // Check for duplicates
                                    if (labelMismatch && redTorrent.remasterRecordLabel) {
                                        redTorrent.remasterRecordLabelAppended = redTorrent.remasterRecordLabel;
                                    }
                                    if (fileCountMismatch) {
                                        redTorrent.fileCountAppended = `RED FileCount: ${redTorrent.fileCount}`;
                                    }
                                    if (sizeToleranceMatch) {
                                        const sizeDifferenceMiB = sizeDifference / (1024 ** 2);
                                        redTorrent.sizeToleranceAppended = `SizeDifference: ${sizeDifferenceMiB.toFixed(2)} MiB`;
                                    }
                                    appendMatchHtml(opsTorrent.id, redTorrent);
                                    exactMatches.push(redTorrent);
                                }
                            } else if (allPropsMatch && sizeDifference < sizeTolerance) {
                                if (!toleranceMatches.some(t => t.id === redTorrent.id)) { // Check for duplicates
                                    toleranceMatches.push(redTorrent);
                                }
                            } else {
                                if (!unmatchedRedTorrents.some(t => t.id === redGroup.id)) { // Check for duplicates in unmatched
                                    unmatchedRedTorrents.push(redGroup);
                                }
                            }
                        });
                    });
                } else {
                    if (!unmatchedRedTorrents.some(t => t.id === redGroup.id)) { // Check for duplicates in unmatched
                        unmatchedRedTorrents.push(redGroup);
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

    // Extract artist info and initiate the API requests
    const artistData = extractArtistData();
    if (artistData) {
        opsApiRequest(artistData.artistId)
            .then(opsResponse => {
                return redApiRequest(artistData.artistName).then(redResponse => {
                    findMatchingTorrent(opsResponse, redResponse);
                });
            })
            .catch(error => {
                console.error('API request error:', error);
            });
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

    let whatVersion = 1; // Default to version 1

    function appendMatchHtml(torrentId, exactMatch) {
        const torrentRow = document.getElementById(`torrent${torrentId}`);

        if (torrentRow) {
            // Use the value of whatVersion to determine which version of the HTML to create
            const matchHtml = createMatchHtml(exactMatch, `version${whatVersion}`);

            // Check if we are on an artist page or a torrent page
            const isArtistPage = window.location.href.includes('artist.php?id=');

            if (isArtistPage) {
                // On artist pages, append directly to the torrentRow
                const matchRow = document.createElement('tr');
                matchRow.id = `torrent${torrentId}_match`;
                matchRow.classList.add('torrent_row', 'exact_match_row', 'group_torrent');
                matchRow.style.fontWeight = 'normal';
                matchRow.innerHTML = matchHtml;
                torrentRow.parentNode.insertBefore(matchRow, torrentRow.nextSibling);
            } else {
                // On torrent pages, find the hidden row and append as usual
                let hiddenRow = torrentRow.nextElementSibling;
                while (hiddenRow && !hiddenRow.id.includes(`torrent_${torrentId}`)) {
                    hiddenRow = hiddenRow.nextElementSibling;
                }

                if (hiddenRow) {
                    const matchRow = document.createElement('tr');
                    matchRow.id = `torrent${torrentId}_match`;
                    matchRow.classList.add('torrent_row', 'exact_match_row', 'group_torrent');
                    matchRow.style.fontWeight = 'normal';
                    matchRow.innerHTML = matchHtml;
                    hiddenRow.parentNode.insertBefore(matchRow, hiddenRow.nextSibling);
                } else {
                    console.warn(`No hidden row found for torrent ID: ${torrentId}`);
                }
            }
        } else {
            // console.warn(`No element found for torrent ID: ${torrentId}`);
        }
    }

    function createMatchHtml(torrent, version = 'version1') {
        const { leechers, seeders, snatched, size, media, format, encoding, scene, logScore, hasCue, groupId, id, remasterRecordLabelAppended, fileCountAppended, sizeToleranceAppended, isFreeload, freeTorrent, isNeutralleech } = torrent;

        let sizeDisplay = (size >= 1024 ** 3) ? (size / (1024 ** 3)).toFixed(2) + ' GiB' : (size / (1024 ** 2)).toFixed(2) + ' MiB';
        let torrentDetails = `RED / ${media} / ${format} / ${encoding}`;

        if (scene) torrentDetails += ` / Scene`;
        if (logScore) torrentDetails += ` / Log (${logScore}%)`;
        if (hasCue) torrentDetails += ` / Cue`;
        if (remasterRecordLabelAppended) torrentDetails += ` / (RED label) ${remasterRecordLabelAppended}`;
        if (fileCountAppended) torrentDetails += ` / ${fileCountAppended}`;
        if (sizeToleranceAppended) torrentDetails += ` / ${sizeToleranceAppended}`;

        const isArtistPage = window.location.href.includes('artist.php?id=');
        const colspanValue = isArtistPage ? 2 : 1;

        const torrentLink = `https://redacted.ch/torrents.php?id=${groupId}&torrentid=${id}#torrent${id}`;
        const leechLabel = isFreeload ? '<strong class="torrent_label tooltip tl_free" title="Freeload!" style="white-space: nowrap;">Freeload!</strong>' :
            freeTorrent ? '<strong class="torrent_label tooltip tl_free" title="Freeleech!" style="white-space: nowrap;">Freeleech!</strong>' :
            isNeutralleech ? '<strong class="torrent_label tooltip tl_neutral" title="Neutral Leech!" style="white-space: nowrap;">Neutral Leech!</strong>' : '';

        if (version === 'version1') {
            //console.log("version 1 triggered");
            return `
                <td class="td_info" colspan="${colspanValue}">
                    <span class="torrent_links_block">
                        [ <a href="#" class="dl-link" data-id="${id}" title="Download">DL</a> ]
                    </span>
                    <a href="${torrentLink}" target="_blank">▶ [${torrentDetails}] ${leechLabel}</a>
                </td>
                <td class="RED_filecount_placeholder hidden">${torrent.fileCount}</td>
                <td class="number_column td_size nobr">${sizeDisplay}</td>
                <td class="number_column m_td_right td_snatched">${snatched}</td>
                <td class="number_column m_td_right td_seeders">${seeders}</td>
                <td class="number_column m_td_right td_leechers">${leechers}</td>
            `;
        } else if (version === 'version2') {
            //console.log("version 2 triggered");
            return `
                <td class="td_info" colspan="${colspanValue}">
                    <span class="torrent_links_block">
                        [ <a href="#" class="dl-link" data-id="${id}" title="Download">DL</a> ]
                    </span>
                    <a href="${torrentLink}" target="_blank">▶ [${torrentDetails}] ${leechLabel}</a>
                </td>
                <td class="RED_filecount_placeholder number_column hidden">${torrent.fileCount}</td>
                <td class="number_column td_size nobr">${sizeDisplay}</td>
                <td class="number_column m_td_right td_snatched">${snatched}</td>
                <td class="number_column m_td_right td_seeders">${seeders}</td>
                <td class="number_column m_td_right td_leechers">${leechers}</td>
            `;
        }
    }

    document.addEventListener('vardisplay3', function () {
        //console.log("found event signal 3");
        whatVersion = 1;
    });

    document.addEventListener('vardisplay4', function () {
        //console.log("found event signal 4");
        whatVersion = 2;
    });

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('dl-link')) {
            event.preventDefault();
            const torrentId = event.target.getAttribute('data-id');
            const downloadUrl = `https://redacted.ch/ajax.php?action=download&id=${torrentId}`;

            GM_xmlhttpRequest({
                url: downloadUrl,
                method: 'GET',
                headers: { 'Authorization': RED_API_KEY },
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
})();