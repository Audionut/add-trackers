// ==UserScript==
// @name         PTP Find All Runtimes
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Find and print all runtimes from torrent descriptions on PTP
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-runtimes.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-runtimes.js
// @connect      passthepopcorn.me
// ==/UserScript==

(function () {
    'use strict';

    // ====== USER CONFIGURATION ======
    // Maximum allowed difference in seconds between torrent runtime and IMDb technical specs
    const MAX_RUNTIME_DIFFERENCE_SECONDS = 60; // 60 seconds = 1 minute tolerance
    // =================================

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

    // Convert duration strings to minutes for comparison
    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return null;

        // Match patterns like "1h 41mn", "1 h 41 min", "101 min", "1:41:30", "01:55:10.904", "2h 18m", etc.
        const patterns = [
            /(\d+)\s*h\s*(\d+)\s*m[in]*/i,          // 1h 41mn or 1 h 41 min or 2h 18m
            /(\d+)\s*m[in]*/i,                      // 41 min
            /(\d+):(\d+):(\d+)(?:\.\d+)?/,          // 1:41:30 or 01:55:10.904
            /(\d+):(\d+)/                           // 1:41
        ];

        for (const pattern of patterns) {
            const match = timeStr.match(pattern);
            if (match) {
                if (pattern.source.includes('h')) {
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

    function addButton() {
        const linkbox = document.querySelector('.linkbox');
        if (!linkbox) return;
        
        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'linkbox__link';
        btn.textContent = ' [Find all runtimes]';
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await findAllRuntimes();
            } catch (error) {
                console.error('Error finding runtimes:', error);
                displayAlert('Error occurred while finding runtimes. Check console for details.', 'red');
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
                    
                    // Skip General duration for DVDs
                    if ((label === 'runtime:' || label === 'duration:') && section === 'general' && !isDVD) {
                        generalDuration = value;
                    }
                    if ((label === 'runtime:' || label === 'duration:') && section === 'video') {
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
                        // Match "Audio", "Audio #1", "Audio #2", etc.
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
                        // Skip General duration for DVDs
                        if (currentSection === 'general' && !generalDuration && !isDVD) generalDuration = duration;
                        if (currentSection === 'video' && !videoDuration) videoDuration = duration;
                    } else if (/^length\s*[:]/i.test(line)) {
                        // Handle Blu-ray "Length: 01:55:10.904" format
                        const duration = line.split(':').slice(1).join(':').trim();
                        if (!generalDuration && !isDVD) generalDuration = duration;
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

            // Store torrent data for later processing
            const duration = generalDuration || videoDuration;
            const uniqueFrameRates = [...new Set(frameRates)];
            
            const data = {
                duration: duration,
                formattedDuration: formatDurationForDisplay(duration),
                frameRates: uniqueFrameRates,
                isDVD: isDVD,
                generalDuration: generalDuration,
                videoDuration: videoDuration
            };

            torrentData[torrentId] = data;
            
            // Save to cache
            saveTorrentData(groupId, torrentId, data);

            console.log(`Torrent ${torrentId} - Runtime: ${duration}${isDVD ? ' (DVD - using video duration)' : ''}`);
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

    function processAllTorrentsForPALSpeedup() {
        try {
            // Extract IMDb runtimes for comparison
            const imdbRuntimes = extractIMDbRuntimes();
            
            // Check if any torrent has 23.976fps (original rate)
            const hasOriginalRate = Object.values(torrentData).some(data => 
                data.frameRates && data.frameRates.some(fps => Math.abs(fps - 23.976) < 0.1 || Math.abs(fps - 29.97) < 0.1)
            );

            if (!hasOriginalRate) {
                // No original rate found, just update all torrents normally
                updateAllTorrentRows(imdbRuntimes);
                return;
            }

            // Process each torrent
            for (const [torrentId, data] of Object.entries(torrentData)) {
                let runtimeInfo = '';
                const has25fps = data.frameRates && data.frameRates.some(fps => Math.abs(fps - 25) < 0.1);
                
                if (has25fps && hasOriginalRate && data.duration) {
                    // This is likely PAL speedup - calculate original runtime
                    const durationMinutes = parseTimeToMinutes(data.duration);
                    if (durationMinutes) {
                        const originalMinutes = Math.round(durationMinutes * 1.043);
                        const originalHours = Math.floor(originalMinutes / 60);
                        const remainingMinutes = originalMinutes % 60;
                        
                        const originalRuntime = originalHours > 0 ? 
                            `${originalHours}h ${remainingMinutes}mn` : 
                            `${remainingMinutes}mn`;

                        // Check if PAL runtime matches IMDb
                        const palMatches = matchesIMDbRuntime(durationMinutes, imdbRuntimes);
                        const originalMatches = matchesIMDbRuntime(originalMinutes, imdbRuntimes);
                        
                        const palStyle = palMatches ? '' : ' style="color: red;"';
                        const originalStyle = originalMatches ? '' : ' style="color: red;"';
                        
                        runtimeInfo = ` / Runtime: <span${palStyle}>${data.formattedDuration} (PAL)</span>, <span${originalStyle}>${originalRuntime} (Original)</span>`;
                        console.log(`Torrent ${torrentId} - PAL speedup detected: ${data.formattedDuration} (PAL) vs ${originalRuntime} (Original)`);
                    } else {
                        const matches = matchesIMDbRuntime(parseTimeToMinutes(data.duration), imdbRuntimes);
                        const style = matches ? '' : ' style="color: red;"';
                        runtimeInfo = ` / Runtime: <span${style}>${data.formattedDuration}</span>`;
                    }
                } else {
                    // Normal runtime display
                    const generalMinutes = parseTimeToMinutes(data.generalDuration);
                    const videoMinutes = parseTimeToMinutes(data.videoDuration);
                    
                    if (generalMinutes && videoMinutes && Math.abs(generalMinutes - videoMinutes) > 1) {
                        const formattedGeneral = formatDurationForDisplay(data.generalDuration);
                        const formattedVideo = formatDurationForDisplay(data.videoDuration);
                        
                        const generalMatches = matchesIMDbRuntime(generalMinutes, imdbRuntimes);
                        const videoMatches = matchesIMDbRuntime(videoMinutes, imdbRuntimes);
                        
                        const generalStyle = generalMatches ? '' : ' style="color: red;"';
                        const videoStyle = videoMatches ? '' : ' style="color: red;"';
                        
                        runtimeInfo = ` / Runtime: <span${generalStyle}>${formattedGeneral} (General)</span>, <span${videoStyle}>${formattedVideo} (Video)</span>`;
                    } else if (data.formattedDuration) {
                        const runtimeMinutes = parseTimeToMinutes(data.duration);
                        const matches = matchesIMDbRuntime(runtimeMinutes, imdbRuntimes);
                        const style = matches ? '' : ' style="color: red;"';
                        runtimeInfo = ` / Runtime: <span${style}>${data.formattedDuration}</span>`;
                    }
                }

                // Add frame rates
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

    function updateAllTorrentRows(imdbRuntimes = []) {
        try {
            // Fallback for when no PAL speedup is detected
            for (const [torrentId, data] of Object.entries(torrentData)) {
                let runtimeInfo = '';
                
                const generalMinutes = parseTimeToMinutes(data.generalDuration);
                const videoMinutes = parseTimeToMinutes(data.videoDuration);
                
                if (generalMinutes && videoMinutes && Math.abs(generalMinutes - videoMinutes) > 1) {
                    const formattedGeneral = formatDurationForDisplay(data.generalDuration);
                    const formattedVideo = formatDurationForDisplay(data.videoDuration);
                    
                    const generalMatches = matchesIMDbRuntime(generalMinutes, imdbRuntimes);
                    const videoMatches = matchesIMDbRuntime(videoMinutes, imdbRuntimes);
                    
                    const generalStyle = generalMatches ? '' : ' style="color: red;"';
                    const videoStyle = videoMatches ? '' : ' style="color: red;"';
                    
                    runtimeInfo = ` / Runtime: <span${generalStyle}>${formattedGeneral} (General)</span>, <span${videoStyle}>${formattedVideo} (Video)</span>`;
                } else if (data.formattedDuration) {
                    const runtimeMinutes = parseTimeToMinutes(data.duration);
                    const matches = matchesIMDbRuntime(runtimeMinutes, imdbRuntimes);
                    const style = matches ? '' : ' style="color: red;"';
                    runtimeInfo = ` / Runtime: <span${style}>${data.formattedDuration}</span>`;
                }

                // Add frame rates
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
                            torrentInfoLink.innerHTML += runtimeInfo;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating torrent rows:', error);
            displayAlert('Error updating torrent information.', 'red');
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

        const headers = Array.from(document.querySelectorAll('[id^="group_torrent_header_"]'));
        if (!headers.length) {
            console.error('No torrent headers found');
            displayAlert('No torrent headers found.', 'red');
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

        if (cachedCount > 0) {
            displayAlert(`Loaded ${cachedCount} torrents from cache. Fetching ${torrentsToFetch.length} new torrents...`, 'blue', 5000);
        } else {
            displayAlert(`Fetching runtime data for ${torrentsToFetch.length} torrents...`, 'blue', 10000);
        }

        if (torrentsToFetch.length === 0) {
            // All data was cached, process immediately
            processAllTorrentsForPALSpeedup();
            displayAlert('Runtime data updated successfully!', 'green', 2000);
            
            const event = new CustomEvent('AddReleasesStatusChanged');
            document.dispatchEvent(event);
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

    addButton();
})();