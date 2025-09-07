// ==UserScript==
// @name         PTP Find All Runtimes
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.2.4
// @description  Find and print all runtimes from torrent descriptions on PTP
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-runtimes.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-runtimes.js
// @connect      passthepopcorn.me
// ==/UserScript==

(function () {
    'use strict';

    // ====== USER CONFIGURATION ======
    // Maximum allowed difference in seconds between torrent runtime and IMDb technical specs
    let MAX_RUNTIME_DIFFERENCE_SECONDS = GM_getValue('maxRuntimeDiffSeconds', 60); // 60 seconds = 1 minute tolerance
    // =================================

    const originalTorrentInfoLinks = {};

    // Settings with defaults
    const SETTINGS = {
        showRuntimeColoring: GM_getValue('showRuntimeColoring', true),
        showFramerateInfo: GM_getValue('showFramerateInfo', true),
        manualFramerate: GM_getValue('manualFramerate', null), // null = auto-detect
        manualFramerateType: GM_getValue('manualFramerateType', null), // 'film', 'ntsc_video', 'pal_video'
        skipWords: GM_getValue('skipWords', '')
    };
    // =================================

    // Save setting to storage
    function saveSetting(key, value) {
        SETTINGS[key] = value;
        GM_setValue(key, value);
    }

    // Get group-specific manual framerate setting
    function getManualFramerate(groupId) {
        return {
            manualFramerate: GM_getValue(`manualFramerate_${groupId}`, null),
            manualFramerateType: GM_getValue(`manualFramerateType_${groupId}`, null)
        };
    }

    // Save group-specific manual framerate setting
    function saveManualFramerate(groupId, framerate, type) {
        GM_setValue(`manualFramerate_${groupId}`, framerate);
        GM_setValue(`manualFramerateType_${groupId}`, type);
    }

    // Update all cached torrent data for current group with new framerate setting
    function updateCachedTorrentFramerate(groupId, framerate, type) {
        const headers = getValidTorrentHeaders();
        for (const header of headers) {
            const match = header.id.match(/group_torrent_header_(\d+)/);
            if (!match) continue;
            const torrentId = match[1];
            
            const cachedData = loadTorrentData(groupId, torrentId);
            if (cachedData) {
                // Update the cached data with new framerate info
                const updatedData = {
                    ...cachedData,
                    manualFramerate: framerate,
                    manualFramerateType: type,
                    timestamp: Date.now() // Update timestamp
                };
                saveTorrentData(groupId, torrentId, updatedData);
            }
        }
    }

    // Register menu commands
    function registerMenuCommands() {
        // Toggle runtime coloring
        GM_registerMenuCommand(
            `${SETTINGS.showRuntimeColoring ? '✓' : '✗'} Runtime Coloring`, 
            () => {
                const newValue = !SETTINGS.showRuntimeColoring;
                saveSetting('showRuntimeColoring', newValue);
                displayAlert(`Runtime coloring ${newValue ? 'enabled' : 'disabled'}`, 'blue', 2000);
                location.reload();
            }
        );

        // Toggle framerate conversion info display
        GM_registerMenuCommand(
            `${SETTINGS.showFramerateInfo ? '✓' : '✗'} Show Framerate Conversions`, 
            () => {
                const newValue = !SETTINGS.showFramerateInfo;
                saveSetting('showFramerateInfo', newValue);
                displayAlert(`Framerate conversion info ${newValue ? 'enabled' : 'disabled'}`, 'blue', 2000);
                location.reload();
            }
        );

        // Adjust runtime tolerance
        GM_registerMenuCommand(
            `Runtime Tolerance: ${MAX_RUNTIME_DIFFERENCE_SECONDS}s`,
            () => {
                const current = MAX_RUNTIME_DIFFERENCE_SECONDS;
                const input = prompt(
`Set max runtime difference (seconds).
Current: ${current}
Examples:
30  -> 30s
60  -> 1 min
90  -> 1m30s

Enter new value (5-600):`, current);
                if (input === null) return;
                const val = parseInt(input.trim(), 10);
                if (isNaN(val) || val < 5 || val > 600) {
                    displayAlert('Invalid value (5-600).', 'red', 2500);
                    return;
                }
                GM_setValue('maxRuntimeDiffSeconds', val);
                MAX_RUNTIME_DIFFERENCE_SECONDS = val;
                displayAlert(`Runtime tolerance set to ${val}s`, 'green', 2000);
                location.reload();
            }
        );

        // Manual framerate setting - now per group
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('id');
        
        if (groupId) {
            const { manualFramerate, manualFramerateType } = getManualFramerate(groupId);
            const currentSetting = manualFramerate ? 
                `${manualFramerate}fps (${manualFramerateType})` : 
                'Auto-detect';
            
            GM_registerMenuCommand(
                `Manual Framerate: ${currentSetting}`, 
                () => {
                    const options = [
                        'Auto-detect from IMDb',
                        '23.976fps (Film)',
                        '25fps (PAL Video)', 
                        '29.97fps (NTSC Video)'
                    ];
                    
                    let choice = prompt(
                        `Select expected framerate for this torrent group:\n\n` +
                        `0: ${options[0]}\n` +
                        `1: ${options[1]}\n` +
                        `2: ${options[2]}\n` +
                        `3: ${options[3]}\n\n` +
                        `Enter 0-3:`, 
                        '0'
                    );
                    
                    if (choice !== null) {
                        choice = parseInt(choice);
                        if (choice >= 0 && choice <= 3) {
                            switch (choice) {
                                case 0:
                                    saveManualFramerate(groupId, null, null);
                                    updateCachedTorrentFramerate(groupId, null, null);
                                    displayAlert('Framerate detection set to auto-detect for this group', 'green', 2000);
                                    break;
                                case 1:
                                    saveManualFramerate(groupId, 23.976, 'film');
                                    updateCachedTorrentFramerate(groupId, 23.976, 'film');
                                    displayAlert('Manual framerate set to 23.976fps (Film) for this group', 'green', 2000);
                                    break;
                                case 2:
                                    saveManualFramerate(groupId, 25, 'pal_video');
                                    updateCachedTorrentFramerate(groupId, 25, 'pal_video');
                                    displayAlert('Manual framerate set to 25fps (PAL Video) for this group', 'green', 2000);
                                    break;
                                case 3:
                                    saveManualFramerate(groupId, 29.97, 'ntsc_video');
                                    updateCachedTorrentFramerate(groupId, 29.97, 'ntsc_video');
                                    displayAlert('Manual framerate set to 29.97fps (NTSC Video) for this group', 'green', 2000);
                                    break;
                            }
                            location.reload();
                        } else {
                            displayAlert('Invalid choice. Please enter 0-3.', 'red', 2000);
                        }
                    }
                }
            );
        }

        GM_registerMenuCommand(
            `Set Skip Words (current: ${SETTINGS.skipWords})`,
            () => {
                const input = prompt(
                    "Enter comma-separated list of words to skip (in span elements (eg: m2ts)):",
                    SETTINGS.skipWords
                );
                if (input !== null) {
                    saveSetting('skipWords', input.trim());
                    displayAlert('Skip words updated. Reloading...', 'blue', 2000);
                    location.reload();
                }
            }
        );

        // Global clear cache (all groups)
        GM_registerMenuCommand('Clear ALL Runtime Cache', () => {
            if (confirm('Clear ALL cached runtime data (every group)?')) {
                clearAllCachedData();
                location.reload();
            }
        });

        // group-specific clear cache
        if (groupId) {
            GM_registerMenuCommand('Clear This Group Runtime Cache', () => {
                if (confirm('Clear cached runtime data only for this torrent group?')) {
                    clearCurrentGroupCache(groupId);
                    location.reload();
                }
            });
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function displayAlert(text, backgroundColor = "red", timerDuration = 3000) {
        // Remove any existing alerts first
        const existingAlerts = document.querySelectorAll('.alert.text--center.alert-fade');
        existingAlerts.forEach(alert => {
            if (alert.parentNode) {
                alert.remove();
            }
        });

        const alert = document.createElement("div");
        alert.className = "alert text--center alert-fade";
        alert.textContent = text;
        alert.style = `background-color: ${backgroundColor}; color: white; position: relative; z-index: 1000;`;
        const content = document.querySelector("#content");
        if (content) {
            content.prepend(alert);
        } else {
            document.body.prepend(alert);
        }

        setTimeout(() => {
            alert.classList.add("alert-fade-out");
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 1000);
        }, timerDuration);
    }

    // Storage functions
    function saveTorrentData(groupId, torrentId, data) {
        const key = `ptp_runtime_${groupId}_${torrentId}`;
        const dataWithTimestamp = {
            ...data,
            timestamp: Date.now()
        };
        GM_setValue(key, JSON.stringify(dataWithTimestamp));
    }

    function loadTorrentData(groupId, torrentId) {
        const key = `ptp_runtime_${groupId}_${torrentId}`;
        const stored = GM_getValue(key, null);
        if (!stored) return null;
        
        try {
            const data = JSON.parse(stored);
            // Cache expires after 28 days
            if (Date.now() - data.timestamp > 28 * 24 * 60 * 60 * 1000) {
                GM_setValue(key, null); // Clear expired data
                return null;
            }
            return data;
        } catch (e) {
            console.error('Error parsing stored data:', e);
            GM_setValue(key, null); // Clear corrupted data
            return null;
        }
    }

    function clearAllCachedData() {
        // Get all GM storage keys and clear runtime data
        const keys = [];
        for (let i = 0; i < 1000; i++) { // Reasonable limit
            try {
                const key = GM_getValue(`ptp_runtime_${i}`, null);
                if (key === null) break;
                keys.push(`ptp_runtime_${i}`);
            } catch (e) {
                break;
            }
        }
        
        // Clear all found keys
        keys.forEach(key => GM_setValue(key, null));
        displayAlert('Cache cleared successfully!', 'green');
    }

    function clearCurrentGroupCache(groupId) {
        const headers = getValidTorrentHeaders();
        if (!headers.length) {
            displayAlert('No torrents found in this group.', 'red');
            return;
        }
        let cleared = 0;
        for (const header of headers) {
            const match = header.id.match(/group_torrent_header_(\d+)/);
            if (!match) continue;
            const torrentId = match[1];
            const key = `ptp_runtime_${groupId}_${torrentId}`;
            if (GM_getValue(key, null) !== null) {
                GM_setValue(key, null);
                cleared++;
            }
            // Remove from in-memory cache too
            if (torrentData[torrentId]) {
                delete torrentData[torrentId];
            }
        }
        displayAlert(`Cleared cache for ${cleared} torrent(s) in this group.`, 'green', 3000);
    }

    // Convert duration strings to minutes for comparison
    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return null;

        // Match patterns like "1h 41mn", "1 h 41 min", "101 min", "1:41:30", "01:55:10.904", "2h 18m", "2h", etc.
        const patterns = [
            /(\d+)\s*h\s*(\d+)\s*m[in]*/i,          // 1h 41mn or 1 h 41 min or 2h 18m
            /(\d+)\s*h$/i,                          // 2h (standalone hours)
            /(\d+)\s*m[in]*/i,                      // 41 min
            /(\d+):(\d+):(\d+)(?:\.\d+)?/,          // 1:41:30 or 01:55:10.904
            /(\d+):(\d+)/                           // 1:41
        ];

        for (const pattern of patterns) {
            const match = timeStr.match(pattern);
            if (match) {
                if (pattern.source.includes('h') && pattern.source.includes('$')) {
                    // Standalone hours like "2h"
                    return parseInt(match[1]) * 60;
                } else if (pattern.source.includes('h')) {
                    // Hours and minutes
                    return parseInt(match[1]) * 60 + parseInt(match[2]);
                } else if (pattern.source === /(\d+)\s*m[in]*/i.source) {
                    // Minutes only
                    return parseInt(match[1]);
                } else if (match[3]) {
                    // H:M:S format (including HH:MM:SS.milliseconds)
                    return parseInt(match[1]) * 60 + parseInt(match[2]);
                } else {
                    // H:M format
                    return parseInt(match[1]) * 60 + parseInt(match[2]);
                }
            }
        }
        return null;
    }

    // Convert HH:MM:SS.milliseconds format to readable format like "1h 55mn"
    function formatDurationForDisplay(timeStr) {
        if (!timeStr) return timeStr;
        
        // Check if it's in HH:MM:SS format
        const match = timeStr.match(/(\d+):(\d+):(\d+)(?:\.\d+)?/);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            
            if (hours > 0) {
                return `${hours}h ${minutes}mn`;
            } else {
                return `${minutes}mn`;
            }
        }
        
        // Return original format if not HH:MM:SS
        return timeStr;
    }

    // Extract frame rate number from strings like "25.000 fps" or "25.000 FPS"
    function parseFrameRate(frameRateStr) {
        if (!frameRateStr) return null;
        const match = frameRateStr.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : null;
    }

    // Extract IMDb technical specifications runtimes
    function extractIMDbRuntimes() {
        const techSpecs = document.querySelector('#technical_specifications .technicalSpecification');
        if (!techSpecs) return [];

        const runtimeMatch = techSpecs.innerHTML.match(/<strong>Runtime:<\/strong>\s*([^<]+)/i);
        if (!runtimeMatch) return [];

        const runtimeText = runtimeMatch[1];
        console.log('Found IMDb runtime text:', runtimeText);

        // Extract all runtime patterns like "2h 18m", "1h 55m", "1h 33m", etc.
        const runtimeMatches = runtimeText.match(/(\d+h\s*\d+m|\d+h|\d+m)/gi);
        if (!runtimeMatches) return [];

        const runtimes = runtimeMatches.map(runtime => {
            const minutes = parseTimeToMinutes(runtime);
            return minutes ? minutes * 60 : null; // Convert to seconds
        }).filter(runtime => runtime !== null);

        console.log('Extracted IMDb runtimes (seconds):', runtimes);
        return runtimes;
    }

    // Check if a runtime matches any IMDb runtime within tolerance
    function matchesIMDbRuntime(runtimeMinutes, imdbRuntimesSeconds) {
        if (!runtimeMinutes || !imdbRuntimesSeconds.length) return true; // No comparison possible

        const runtimeSeconds = runtimeMinutes * 60;
        return imdbRuntimesSeconds.some(imdbSeconds => 
            Math.abs(runtimeSeconds - imdbSeconds) <= MAX_RUNTIME_DIFFERENCE_SECONDS
        );
    }

    // Filter torrent headers to exclude those after "Other" edition
    function getValidTorrentHeaders() {
        const allHeaders = Array.from(document.querySelectorAll('[id^="group_torrent_header_"]'));
        const validHeaders = [];
        const skipWords = SETTINGS.skipWords
            .split(',')
            .map(w => w.trim().toLowerCase())
            .filter(Boolean);
        outerLoop:
        for (const header of allHeaders) {
            // Check if there's an "Other" edition row before this torrent header
            let currentElement = header;
            let foundOtherEdition = false;

            // Walk backwards through DOM elements to find edition rows
            while (currentElement && currentElement.previousElementSibling) {
                currentElement = currentElement.previousElementSibling;

                const torrentInfoLink = header.querySelector('.torrent-info-link');
                if (torrentInfoLink) {
                    const spans = torrentInfoLink.querySelectorAll('span');
                    for (const span of spans) {
                        const text = span.textContent.toLowerCase();
                        if (skipWords.some(word => text.includes(word))) {
                            continue outerLoop;
                        }
                    }
                    const linkText = torrentInfoLink.textContent.toLowerCase();
                    if (skipWords.some(word => linkText.includes(word))) {
                        continue outerLoop;
                    }
                }

                // Check if this is an edition row with "Other"
                if (currentElement.classList.contains('group_torrent') && 
                    currentElement.querySelector('.basic-movie-list__torrent-edition__sub')) {
                    
                    const editionText = currentElement.querySelector('.basic-movie-list__torrent-edition__sub').textContent.trim();
                    if (editionText === 'Other') {
                        foundOtherEdition = true;
                        break;
                    } else {
                        // Found a non-"Other" edition, so this torrent is valid
                        break;
                    }
                }
            }
            
            if (!foundOtherEdition) {
                validHeaders.push(header);
            } else {
                const match = header.id.match(/group_torrent_header_(\d+)/);
                const torrentId = match ? match[1] : 'unknown';
                console.log(`Skipping torrent ${torrentId} - found after "Other" edition`);
            }
        }
        
        return validHeaders;
    }

    function addButton() {
        const linkbox = document.querySelector('.linkbox');
        if (!linkbox) return;

        // Prevent duplicate button
        if (document.getElementById('find-all-runtimes-btn')) return;

        const btn = document.createElement('a');
        btn.id = 'find-all-runtimes-btn';
        btn.href = '#';
        btn.className = 'linkbox__link';
        btn.textContent = ' [Find all runtimes]';

        let runtimesVisible = false;

        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const headers = getValidTorrentHeaders();
            if (!runtimesVisible) {
                try {
                    await findAllRuntimes();
                    btn.textContent = ' [Hide runtimes]';
                    runtimesVisible = true;
                } catch (error) {
                    console.error('Error finding runtimes:', error);
                    displayAlert('Error occurred while finding runtimes. Check console for details.', 'red');
                }
            } else {
                // Remove only the runtime info from torrent rows
                for (const header of headers) {
                    const match = header.id.match(/group_torrent_header_(\d+)/);
                    if (!match) continue;
                    const torrentId = match[1];
                    const torrentRow = document.querySelector(`#group_torrent_header_${torrentId}`);
                    if (torrentRow) {
                        const torrentInfoLink = torrentRow.querySelector('.torrent-info-link');
                        if (torrentInfoLink) {
                            // Restore original HTML if we have it
                            if (originalTorrentInfoLinks[torrentId]) {
                                torrentInfoLink.innerHTML = originalTorrentInfoLinks[torrentId];
                            }
                        }
                    }
                }
                btn.textContent = ' [Find all runtimes]';
                runtimesVisible = false;
            }
        });
        linkbox.appendChild(btn);
    }

    let torrentData = {}; // Store all torrent information

    function extractDurationsFromDescription(responseText, torrentId, groupId) {
        try {
            // Parse JSON response first
            let html;
            try {
                const jsonData = JSON.parse(responseText);
                html = jsonData.Description || responseText;
            } catch (e) {
                // If not JSON, treat as raw HTML
                html = responseText;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Check if this is a DVD release (contains .IFO or DVD Video)
            const isDVD = html.includes('DVD Video') || html.includes('.IFO') || html.includes('.VOB');

            // Collect all frame rates and durations
            let generalDuration = null;
            let videoDuration = null;
            let frameRates = [];
            let allDurations = []; // Store all durations found for DVDs

            // 1. HTML Table Extraction
            const tables = doc.querySelectorAll('.mediainfo__section');
            tables.forEach(table => {
                const caption = table.querySelector('.mediainfo__section__caption');
                if (!caption) return;
                const section = caption.textContent.trim().toLowerCase();
                
                // Skip audio, text, and subtitle sections
                if (section === 'audio' || section === 'text' || section === 'subtitle') return;
                
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 2) return;
                    const label = cells[0].textContent.trim().toLowerCase();
                    const value = cells[1].textContent.trim();
                    
                    // Collect durations differently for DVDs
                    if ((label === 'runtime:' || label === 'duration:') && section === 'general') {
                        if (isDVD) {
                            allDurations.push(value);
                            if (!generalDuration) generalDuration = value;
                        } else if (!generalDuration) {
                            generalDuration = value;
                        }
                    }
                    if ((label === 'runtime:' || label === 'duration:') && section === 'video') {
                        if (isDVD) {
                            allDurations.push(value);
                        }
                        videoDuration = value;
                    }
                    if ((label === 'frame rate:') && section === 'video') {
                        const frameRate = parseFrameRate(value);
                        if (frameRate) frameRates.push(frameRate);
                    }
                });
            });

            // 2. Plaintext Blockquote Extraction
            const blockquote = doc.querySelector('blockquote.spoiler, blockquote.hidden');
            if (blockquote) {
                const lines = blockquote.innerText.split('\n');
                let currentSection = '';
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Detect section headers
                    if (/^general$/i.test(line)) {
                        currentSection = 'general';
                    } else if (/^video$/i.test(line)) {
                        currentSection = 'video';
                    } else if (/^audio\s*#?\d*$/i.test(line)) {
                        currentSection = 'audio';
                    } else if (/^text$/i.test(line)) {
                        currentSection = 'text';
                    } else if (/^subtitle$/i.test(line)) {
                        currentSection = 'subtitle';
                    } else if (/^menu$/i.test(line)) {
                        currentSection = 'menu';
                    } else if (/^duration\s*[:]/i.test(line)) {
                        // Skip audio, text, and subtitle sections
                        if (currentSection === 'audio' || currentSection === 'text' || currentSection === 'subtitle') continue;
                        
                        const duration = line.split(':').slice(1).join(':').trim();
                        if (currentSection === 'general') {
                            if (isDVD) {
                                allDurations.push(duration);
                                if (!generalDuration) generalDuration = duration;
                            } else if (!generalDuration) {
                                generalDuration = duration;
                            }
                        }
                        if (currentSection === 'video') {
                            if (isDVD) {
                                allDurations.push(duration);
                            }
                            if (!videoDuration) videoDuration = duration;
                        }
                    } else if (/^length\s*[:]/i.test(line)) {
                        // Handle Blu-ray "Length: 01:55:10.904" format
                        const duration = line.split(':').slice(1).join(':').trim();
                        if (isDVD) {
                            allDurations.push(duration);
                            if (!generalDuration) generalDuration = duration;
                        } else if (!generalDuration) {
                            generalDuration = duration;
                        }
                    } else if (/^frame rate\s*[:]/i.test(line)) {
                        // ONLY extract frame rate from video section
                        if (currentSection !== 'video') continue;
                        
                        const frameRateStr = line.split(':').slice(1).join(':').trim();
                        const frameRate = parseFrameRate(frameRateStr);
                        if (frameRate) {
                            frameRates.push(frameRate);
                        }
                    }
                }
            }

            // For DVDs, find the longest duration from all collected durations
            let finalDuration;
            if (isDVD && allDurations.length > 0) {
                let longestDuration = allDurations[0];
                let longestMinutes = parseTimeToMinutes(longestDuration) || 0;
                
                for (const duration of allDurations) {
                    const minutes = parseTimeToMinutes(duration);
                    if (minutes && minutes > longestMinutes) {
                        longestDuration = duration;
                        longestMinutes = minutes;
                    }
                }
                finalDuration = longestDuration;
                console.log(`Torrent ${torrentId} - DVD detected, found ${allDurations.length} durations, longest: ${finalDuration}`);
            } else {
                finalDuration = generalDuration || videoDuration;
            }

            const uniqueFrameRates = [...new Set(frameRates)];

            const data = {
                duration: finalDuration,
                formattedDuration: formatDurationForDisplay(finalDuration),
                frameRates: uniqueFrameRates,
                isDVD: isDVD,
                generalDuration: generalDuration,
                videoDuration: videoDuration
            };

            torrentData[torrentId] = data;
            
            // Save to cache
            saveTorrentData(groupId, torrentId, data);

            console.log(`Torrent ${torrentId} - Runtime: ${finalDuration}${isDVD ? ' (DVD - longest duration)' : ''}`);
            if (uniqueFrameRates.length > 0) {
                const displayFrameRates = uniqueFrameRates.map(fps => 
                    fps % 1 === 0 ? Math.round(fps) : fps
                ).join('/');
                console.log(`Torrent ${torrentId} - Frame rates: ${displayFrameRates}fps`);
            }
        } catch (error) {
            console.error(`Error extracting data from torrent ${torrentId}:`, error);
            // Still store empty data to prevent issues
            const emptyData = {
                duration: null,
                formattedDuration: null,
                frameRates: [],
                isDVD: false,
                generalDuration: null,
                videoDuration: null
            };
            torrentData[torrentId] = emptyData;
            saveTorrentData(groupId, torrentId, emptyData);
        }
    }

    // Extract technical specifications to determine if content is film or video
    function extractTechnicalSpecs() {
        const techSpecs = document.querySelector('#technical_specifications .technicalSpecification');
        if (!techSpecs) return { isFilm: false, negativeFormat: null };

        const techSpecsText = techSpecs.innerHTML;
        
        // Look for Negative Format
        const negativeFormatMatch = techSpecsText.match(/<strong>Negative Format:<\/strong>\s*([^<]+)/i);
        const negativeFormat = negativeFormatMatch ? negativeFormatMatch[1].trim() : null;
        
        // Consider film if negative format exists AND is not "Video"
        const isFilm = negativeFormat && !negativeFormat.toLowerCase().includes('video');
        
        return { isFilm, negativeFormat };
    }

    // Extract country information from movie info panel
    function extractCountryInfo() {
        const movieInfo = document.querySelector('#movieinfo .panel__body');
        if (!movieInfo) return [];

        const countryDiv = Array.from(movieInfo.querySelectorAll('div')).find(div => 
            div.innerHTML.includes('<strong>Country:</strong>')
        );
        
        if (!countryDiv) return [];

        const countryLinks = countryDiv.querySelectorAll('a[href*="countrylist="]');
        return Array.from(countryLinks).map(link => {
            const match = link.href.match(/countrylist=([^&]+)/);
            return match ? match[1].toLowerCase() : null;
        }).filter(country => country !== null);
    }

    // PAL countries list
    const PAL_COUNTRIES = [
        'uk', 'united kingdom', 'britain', 'england', 'scotland', 'wales', 'ireland',
        'germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'austria',
        'switzerland', 'sweden', 'norway', 'denmark', 'finland', 'poland', 'czech republic',
        'hungary', 'romania', 'bulgaria', 'greece', 'portugal', 'croatia', 'slovenia',
        'slovakia', 'estonia', 'latvia', 'lithuania', 'luxembourg', 'malta', 'cyprus',
        'australia', 'new zealand', 'south africa', 'india', 'pakistan', 'bangladesh',
        'sri lanka', 'thailand', 'malaysia', 'singapore', 'indonesia', 'philippines',
        'hong kong', 'china', 'taiwan', 'south korea', 'russia', 'ukraine', 'belarus'
    ];

    // Determine expected framerate based on technical specs and country
    function determineExpectedFramerate(groupId) {
        // Check for manual override first (group-specific)
        const { manualFramerate, manualFramerateType } = getManualFramerate(groupId);
        if (manualFramerate && manualFramerateType) {
            console.log(`Using manual framerate override for group ${groupId}: ${manualFramerate}fps (${manualFramerateType})`);
            return { 
                framerate: manualFramerate, 
                type: manualFramerateType 
            };
        }
        
        // Auto-detect from IMDb data
        const { isFilm } = extractTechnicalSpecs();
        const countries = extractCountryInfo();
        
        if (isFilm) {
            // Film content: always 23.976fps
            return { framerate: 23.976, type: 'film' };
        } else {
            // Video content: check if from PAL country
            const isPALCountry = countries.some(country => 
                PAL_COUNTRIES.includes(country.toLowerCase())
            );
            
            return {
                framerate: isPALCountry ? 25 : 29.97,
                type: isPALCountry ? 'pal_video' : 'ntsc_video'
            };
        }
    }

    // Helper function to apply styling based on settings
    function getStyleForRuntime(matches) {
        if (!SETTINGS.showRuntimeColoring) return '';
        return matches ? '' : ' style="color: red;"';
    }

    // processAllTorrentsForPALSpeedup to use settings
    function processAllTorrentsForPALSpeedup() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const groupId = urlParams.get('id');
            
            // Extract IMDb runtimes for comparison
            const imdbRuntimes = extractIMDbRuntimes();
            
            // Determine expected framerate from IMDb technical specs or manual override
            const expected = determineExpectedFramerate(groupId);
            console.log(`Expected framerate: ${expected.framerate}fps (${expected.type})`);

            // Process each torrent
            for (const [torrentId, data] of Object.entries(torrentData)) {
                let runtimeInfo = '';
                const has25fps = data.frameRates && data.frameRates.some(fps => Math.abs(fps - 25) < 0.1);
                const has2997fps = data.frameRates && data.frameRates.some(fps => Math.abs(fps - 29.97) < 0.1);
                const has23976fps = data.frameRates && data.frameRates.some(fps => Math.abs(fps - 23.976) < 0.1);
                
                // Only show PAL/NTSC/Telecined conversions if framerate info is enabled
                if (SETTINGS.showFramerateInfo) {
                    if (expected.type === 'film' && has25fps && data.duration) {
                        // Film content with 25fps = PAL speedup (content is sped up, original is longer)
                        const durationMinutes = parseTimeToMinutes(data.duration);
                        if (durationMinutes) {
                            const originalMinutes = Math.round(durationMinutes / 0.959); // Convert PAL back to original
                            const originalHours = Math.floor(originalMinutes / 60);
                            const remainingMinutes = originalMinutes % 60;
                            
                            const originalRuntime = originalHours > 0 ? 
                                `${originalHours}h ${remainingMinutes}mn` : 
                                `${remainingMinutes}mn`;

                            const palMatches = matchesIMDbRuntime(durationMinutes, imdbRuntimes);
                            const originalMatches = matchesIMDbRuntime(originalMinutes, imdbRuntimes);
                            
                            const palStyle = getStyleForRuntime(palMatches);
                            const originalStyle = getStyleForRuntime(originalMatches);
                            
                            runtimeInfo = ` / <span${palStyle}>${data.formattedDuration} (PAL)</span>, <span${originalStyle}>${originalRuntime} (Original)</span>`;
                            console.log(`Torrent ${torrentId} - PAL speedup detected: ${data.formattedDuration} (PAL) vs ${originalRuntime} (Original)`);
                        }
                    } else if (expected.type === 'ntsc_video' && has23976fps && data.duration) {
                        // Expected NTSC video (29.97) but encode is film-speed 23.976 (slowed video or IVTC of video-sourced material)
                        // Compute what the original 29.97 runtime would be (shorter)
                        const filmMinutes = parseTimeToMinutes(data.duration);
                        if (filmMinutes) {
                            const originalMinutes = Math.round(filmMinutes * (23.976 / 29.97)); // Convert 23.976 back to 29.97
                            const originalHours = Math.floor(originalMinutes / 60);
                            const remainingMinutes = originalMinutes % 60;
                            const originalRuntime = originalHours > 0 ? `${originalHours}h ${remainingMinutes}mn` : `${remainingMinutes}mn`;

                            const filmMatches = matchesIMDbRuntime(filmMinutes, imdbRuntimes);
                            const originalMatches = matchesIMDbRuntime(originalMinutes, imdbRuntimes);

                            const filmStyle = getStyleForRuntime(filmMatches);
                            const originalStyle = getStyleForRuntime(originalMatches);

                            runtimeInfo = ` / <span${filmStyle}>${data.formattedDuration} (Film-speed)</span>, <span${originalStyle}>${originalRuntime} (Original 29.97)</span>`;
                            console.log(`Torrent ${torrentId} - Film-speed under NTSC context: ${data.formattedDuration} (Film-speed) vs ${originalRuntime} (Original 29.97)`);
                        }
                    } else if (expected.type === 'ntsc_video' && has25fps && data.duration) {
                        // NTSC video content with 25fps = converted from NTSC to PAL (content is sped up, original is longer)
                        const durationMinutes = parseTimeToMinutes(data.duration);
                        if (durationMinutes) {
                            const originalMinutes = Math.round(durationMinutes * (29.97 / 25)); // Convert PAL back to NTSC
                            const originalHours = Math.floor(originalMinutes / 60);
                            const remainingMinutes = originalMinutes % 60;
                            
                            const originalRuntime = originalHours > 0 ? 
                                `${originalHours}h ${remainingMinutes}mn` : 
                                `${remainingMinutes}mn`;

                            const palMatches = matchesIMDbRuntime(durationMinutes, imdbRuntimes);
                            const originalMatches = matchesIMDbRuntime(originalMinutes, imdbRuntimes);
                            
                            const palStyle = getStyleForRuntime(palMatches);
                            const originalStyle = getStyleForRuntime(originalMatches);
                            
                            runtimeInfo = ` / <span${palStyle}>${data.formattedDuration} (PAL)</span>, <span${originalStyle}>${originalRuntime} (Original)</span>`;
                            console.log(`Torrent ${torrentId} - PAL conversion detected: ${data.formattedDuration} (PAL) vs ${originalRuntime} (Original)`);
                        }
                    } else if (expected.type === 'pal_video' && has2997fps && data.duration) {
                        // PAL video at 29.97 -> invert math (original longer at 25fps)
                        const durationMinutes = parseTimeToMinutes(data.duration);
                        if (durationMinutes) {
                            // Inverted: multiply instead of divide
                            const originalMinutes = Math.round(durationMinutes * (29.97 / 25));
                            const originalHours = Math.floor(originalMinutes / 60);
                            const remainingMinutes = originalMinutes % 60;
                            const originalRuntime = originalHours > 0 ? `${originalHours}h ${remainingMinutes}mn` : `${remainingMinutes}mn`;
                            const ntscMatches = matchesIMDbRuntime(durationMinutes, imdbRuntimes);
                            const originalMatches = matchesIMDbRuntime(originalMinutes, imdbRuntimes);
                            const ntscStyle = getStyleForRuntime(ntscMatches);
                            const originalStyle = getStyleForRuntime(originalMatches);
                            runtimeInfo = ` / <span${ntscStyle}>${data.formattedDuration} (NTSC)</span>, <span${originalStyle}>${originalRuntime} (Original)</span>`;
                            console.log(`Torrent ${torrentId} - NTSC (from PAL) detected: ${data.formattedDuration} (NTSC) vs ${originalRuntime} (Original)`);
                        }
                    }
                }
                
                // If no PAL/NTSC/Telecined conversion detected, show normal runtime
                if (!runtimeInfo) {
                    if (data.isDVD && data.formattedDuration) {
                        const runtimeMinutes = parseTimeToMinutes(data.duration);
                        const matches = matchesIMDbRuntime(runtimeMinutes, imdbRuntimes);
                        const style = getStyleForRuntime(matches);
                        runtimeInfo = ` / <span${style}>${data.formattedDuration}</span>`;
                    } else {
                        const generalMinutes = parseTimeToMinutes(data.generalDuration);
                        const videoMinutes = parseTimeToMinutes(data.videoDuration);
                        
                        if (generalMinutes && videoMinutes && generalMinutes !== videoMinutes) {
                            const formattedGeneral = formatDurationForDisplay(data.generalDuration);
                            const formattedVideo = formatDurationForDisplay(data.videoDuration);
                            
                            const generalMatches = matchesIMDbRuntime(generalMinutes, imdbRuntimes);
                            const videoMatches = matchesIMDbRuntime(videoMinutes, imdbRuntimes);
                            
                            const generalStyle = getStyleForRuntime(generalMatches);
                            const videoStyle = getStyleForRuntime(videoMatches);
                            
                            runtimeInfo = ` / <span${generalStyle}>${formattedGeneral} (General)</span>, <span${videoStyle}>${formattedVideo} (Video)</span>`;
                        } else if (data.formattedDuration) {
                            const runtimeMinutes = parseTimeToMinutes(data.duration);
                            const matches = matchesIMDbRuntime(runtimeMinutes, imdbRuntimes);
                            const style = getStyleForRuntime(matches);
                            runtimeInfo = ` / <span${style}>${data.formattedDuration}</span>`;
                        }
                    }
                }

                // ALWAYS add frame rates (regardless of setting)
                if (data.frameRates && data.frameRates.length > 0) {
                    const displayFrameRates = data.frameRates.map(fps => 
                        fps % 1 === 0 ? Math.round(fps) : fps
                    ).join('/');
                    runtimeInfo += ` / ${displayFrameRates}fps`;
                }

                // Update the torrent row
                if (runtimeInfo) {
                    const torrentRow = document.querySelector(`#group_torrent_header_${torrentId}`);
                    if (torrentRow) {
                        const torrentInfoLink = torrentRow.querySelector('.torrent-info-link');
                        if (torrentInfoLink) {
                            // Save original HTML only once
                            if (!(torrentId in originalTorrentInfoLinks)) {
                                originalTorrentInfoLinks[torrentId] = torrentInfoLink.innerHTML;
                            }
                            torrentInfoLink.innerHTML += runtimeInfo;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error processing PAL speedup:', error);
            displayAlert('Error processing PAL speedup data.', 'red');
        }
    }

    async function findAllRuntimes() {
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('id');
        if (!groupId) {
            console.error('Group ID not found in URL');
            displayAlert('Group ID not found in URL.', 'red');
            return;
        }

        // Use filtered headers instead of all headers
        const headers = getValidTorrentHeaders();
        if (!headers.length) {
            console.error('No valid torrent headers found');
            displayAlert('No valid torrent headers found.', 'red');
            return;
        }

        // Reset torrent data
        torrentData = {};
        
        // Check cache first
        let cachedCount = 0;
        const torrentsToFetch = [];
        
        for (const header of headers) {
            const match = header.id.match(/group_torrent_header_(\d+)/);
            if (!match) continue;
            const torrentId = match[1];
            
            const cachedData = loadTorrentData(groupId, torrentId);
            if (cachedData) {
                // Remove timestamp before using
                const { timestamp, ...data } = cachedData;
                torrentData[torrentId] = data;
                cachedCount++;
                console.log(`Loaded cached data for torrent ${torrentId}`);
            } else {
                torrentsToFetch.push({ header, torrentId });
            }
        }

        if (cachedCount > 0 && torrentsToFetch.length > 0) {
            displayAlert(`Loaded ${cachedCount} torrents from cache. Fetching ${torrentsToFetch.length} new torrents...`, 'blue', 5000);
        } else if (cachedCount === 0 && torrentsToFetch.length > 0) {
            displayAlert(`Fetching runtime data for ${torrentsToFetch.length} torrents...`, 'blue', 10000);
        }

        if (torrentsToFetch.length === 0) {
            // All data was cached, process immediately
            processAllTorrentsForPALSpeedup();
            return;
        }

        // Track completion for new fetches
        let completedRequests = 0;
        const totalRequests = torrentsToFetch.length;

        function checkCompletion() {
            completedRequests++;
            
            // Update progress
            if (completedRequests < totalRequests) {
                displayAlert(`Processing torrents... ${completedRequests}/${totalRequests} (${cachedCount} cached)`, 'blue', 2000);
            } else {
                // All requests completed, now process PAL speedup
                console.log('All torrent data collected, processing PAL speedup...');
                displayAlert('Processing PAL speedup and updating display...', 'green', 3000);
                
                try {
                    processAllTorrentsForPALSpeedup();
                    displayAlert('Runtime data updated successfully!', 'green', 2000);
                    
                    // Fire the completion event
                    const event = new CustomEvent('AddReleasesStatusChanged');
                    document.dispatchEvent(event);
                } catch (error) {
                    console.error('Error in final processing:', error);
                    displayAlert('Error in final processing. Check console for details.', 'red');
                }
            }
        }

        for (let i = 0; i < torrentsToFetch.length; i++) {
            const { torrentId } = torrentsToFetch[i];
            const descUrl = `https://passthepopcorn.me/torrents.php?id=${groupId}&torrentid=${torrentId}&action=description`;
            console.log(`Fetching: ${descUrl}`);
            await sleep(1000);

            GM_xmlhttpRequest({
                method: "GET",
                url: descUrl,
                onload: function (response) {
                    try {
                        if (response.status >= 200 && response.status < 300) {
                            extractDurationsFromDescription(response.responseText, torrentId, groupId);
                        } else {
                            console.error(`Failed to fetch description for torrent ${torrentId}: Status ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`Error processing response for torrent ${torrentId}:`, error);
                    }
                    checkCompletion();
                },
                onerror: function (response) {
                    console.error(`Request error for torrent ${torrentId}`, response);
                    checkCompletion();
                }
            });
        }
    }

    registerMenuCommands();
    addButton();
})();