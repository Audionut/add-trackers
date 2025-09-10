// ==UserScript==
// @name         PTP content hider
// @version      1.4
// @description  Hide html elements with specified tags
// @match        https://passthepopcorn.me/index.php*
// @match        https://passthepopcorn.me/top10.php*
// @match        https://passthepopcorn.me/torrents.php*
// @match        https://passthepopcorn.me/torrents.php?*page=*
// @exclude      https://passthepopcorn.me/torrents.php?*id=*
// @match        https://passthepopcorn.me/user.php*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-tag-hidden.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-tag-hidden.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Load user configuration from GM storage with defaults
    let TAGS_TO_HIDE = GM_getValue('TAGS_TO_HIDE', 'family, animation, comedy, romance');
    let DELAY_RENDER = GM_getValue('DELAY_RENDER', true);
    let HIDDEN_CACHE = GM_getValue('HIDDEN_CACHE', '{}');
    
    // Convert to array and clean up
    let tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    let hiddenCache = {};
    
    try {
        hiddenCache = JSON.parse(HIDDEN_CACHE);
    } catch (e) {
        console.warn('Failed to parse hidden cache, starting fresh:', e);
        hiddenCache = {};
    }
    
    console.log('Tags to hide:', tagsArray);
    console.log('Delay render:', DELAY_RENDER);
    console.log('Cached hidden movies (before cleaning):', Object.keys(hiddenCache).length);

    // Clean outdated cache entries
    const cleanedOnStartup = cleanCache();
    if (cleanedOnStartup > 0) {
        console.log(`Cleaned ${cleanedOnStartup} outdated cache entries on startup`);
    }

    console.log('Cached hidden movies (after cleaning):', Object.keys(hiddenCache).length);

    // Function to add GroupID to cache
    function addToHiddenCache(groupId, title, year, matchedTags, imdbId = null) {
        hiddenCache[groupId] = {
            title: title,
            year: year,
            tags: matchedTags,
            imdbId: imdbId,
            hiddenAt: Date.now()
        };
        
        // Save to GM storage
        GM_setValue('HIDDEN_CACHE', JSON.stringify(hiddenCache));
        console.log(`Added to cache: ${title} (${year}) - GroupID: ${groupId} - IMDB: ${imdbId || 'N/A'} - Tags: ${matchedTags.join(', ')}`);
    }

    function isInHiddenCacheAndValid(groupId) {
        if (!hiddenCache.hasOwnProperty(groupId)) {
            return false;
        }
        
        // Check if the cached movie should still be hidden with current tags
        return shouldHideCachedMovie(hiddenCache[groupId]);
    }

    // Function to clear cache
    function clearHiddenCache() {
        hiddenCache = {};
        GM_setValue('HIDDEN_CACHE', '{}');
        console.log('Hidden cache cleared');
    }

    // Function to check if cached movie should still be hidden based on current tags
    function shouldHideCachedMovie(cachedMovie) {
        // Check if any of the cached movie's tags are still in the current hide list
        return cachedMovie.tags.some(tag => tagsArray.includes(tag.toLowerCase()));
    }

    // Function to clean cache of items that no longer match current tags
    function cleanCache() {
        let cleanedCount = 0;
        const originalCacheSize = Object.keys(hiddenCache).length;
        
        Object.keys(hiddenCache).forEach(groupId => {
            if (!shouldHideCachedMovie(hiddenCache[groupId])) {
                delete hiddenCache[groupId];
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            GM_setValue('HIDDEN_CACHE', JSON.stringify(hiddenCache));
            console.log(`Cleaned ${cleanedCount} outdated entries from cache (${originalCacheSize} -> ${Object.keys(hiddenCache).length})`);
        }
        
        return cleanedCount;
    }

    // Register menu commands
    GM_registerMenuCommand('Configure Tags to Hide', () => {
        const newTags = prompt(
            'Enter tags to hide (separated by commas):\n\nExample: family, animation, comedy, romance',
            TAGS_TO_HIDE
        );
        
        if (newTags !== null) {
            TAGS_TO_HIDE = newTags.trim();
            GM_setValue('TAGS_TO_HIDE', TAGS_TO_HIDE);
            tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
            
            console.log('Updated tags to hide:', tagsArray);
            window.location.reload();
        }
    });

    GM_registerMenuCommand('Toggle Delay Render', () => {
        DELAY_RENDER = !DELAY_RENDER;
        GM_setValue('DELAY_RENDER', DELAY_RENDER);
        
        alert(`Delay render is now: ${DELAY_RENDER ? 'ON' : 'OFF'}\n\nRefresh the page for changes to take effect.`);
        console.log('Delay render toggled to:', DELAY_RENDER);
    });

    GM_registerMenuCommand('View Hidden Cache', () => {
        const cacheEntries = Object.entries(hiddenCache);
        if (cacheEntries.length === 0) {
            alert('No movies currently in hidden cache.');
            return;
        }
        
        const cacheList = cacheEntries.map(([groupId, data]) => 
            `${data.title} (${data.year}) - IMDB: ${data.imdbId || 'N/A'} - Tags: ${data.tags.join(', ')}`
        ).join('\n');
        
        alert(`Hidden Movies Cache (${cacheEntries.length} entries):\n\n${cacheList}`);
    });

    GM_registerMenuCommand('Clean Outdated Cache (changed tags)', () => {
        if (confirm("This is not really recommended. It's better to leave the cache alone in case you revert tag changes at a later date.\n\n" +
            "The script will ignore entries that do not have matching tags to your current list.\n\nDo you want to proceed with cleaning the cache?")) {
            const cleanedCount = cleanCache();
            if (cleanedCount > 0) {
                if (confirm(`Cleaned ${cleanedCount} outdated entries from cache.\n\nRefresh the page to see changes?\n\nClick OK to refresh now, or Cancel to refresh later.`)) {
                    window.location.reload();
                }
            } else {
                if (confirm('Cache is already clean - no outdated entries found.\n\nRefresh the page anyway?\n\nClick OK to refresh now, or Cancel to continue.')) {
                    window.location.reload();
                }
            }
        }
    });

    GM_registerMenuCommand('Clear Hidden Cache', () => {
        if (confirm(`Clear the hidden movies cache?\n\nThis will remove ${Object.keys(hiddenCache).length} cached entries.`)) {
            clearHiddenCache();
            window.location.reload();
        }
    });

    GM_registerMenuCommand('Reset to Defaults', () => {
        if (confirm('Reset all settings to defaults?\n\nTags: family, animation, comedy, romance\nDelay Render: ON\nClear Cache: YES')) {
            GM_setValue('TAGS_TO_HIDE', 'family, animation, comedy, romance');
            GM_setValue('DELAY_RENDER', true);
            clearHiddenCache();
            
            window.location.reload();
        }
    });

    let pageProcessed = false;
    let originalDisplay = null;

    // Hide the page immediately if delay render is enabled
    if (DELAY_RENDER) {
        const style = document.createElement('style');
        style.id = 'hide-page-style';
        style.textContent = `
            body { display: none !important; }
            
            #ptp-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: #0c0c0c;
                background-image: url('static/styles/dark/bg.jpg');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            #ptp-loading-content {
                background: rgba(0, 0, 0, 0.8);
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            #ptp-loading-logo {
                width: 64px;
                height: 64px;
                background-image: url('static/common/favicon.png');
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                animation: pulse 1.5s ease-in-out infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }
            
            #ptp-loading-text {
                color: #fff;
                font-size: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin-bottom: 15px;
            }
            
            #ptp-loading-subtext {
                color: #ccc;
                font-size: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                opacity: 0.8;
            }
            
            #ptp-loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 15px auto 0;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
        
        // Create the loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'ptp-loading-overlay';
        loadingOverlay.innerHTML = `
            <div id="ptp-loading-content">
                <div id="ptp-loading-logo"></div>
                <div id="ptp-loading-text">Processing content...</div>
                <div id="ptp-loading-subtext">Filtering movies by tags</div>
                <div id="ptp-loading-spinner"></div>
            </div>
        `;
        document.documentElement.appendChild(loadingOverlay);
    }

    function showPage() {
        if (DELAY_RENDER && !pageProcessed) {
            // Remove loading overlay with fade effect
            const loadingOverlay = document.getElementById('ptp-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => {
                    loadingOverlay.remove();
                }, 300);
            }
            
            // Remove hide style
            const hideStyle = document.getElementById('hide-page-style');
            if (hideStyle) {
                hideStyle.remove();
            }
            
            pageProcessed = true;
            console.log('Page rendering restored');
        }
    }

    function hideMoviesWithTargetTags() {
        let foundData = false;
        
        // Find all script tags
        const scripts = document.querySelectorAll('script');
        
        scripts.forEach(script => {
            const scriptText = script.textContent || script.innerHTML;
            
            // Check for coverViewJsonData
            if (scriptText.includes('coverViewJsonData')) {
                foundData = true;
                
                // Extract all coverViewJsonData assignments
                const regex = /coverViewJsonData\[\s*(\d+)\s*\]\s*=\s*({.*?});/gs;
                let match;
                
                while ((match = regex.exec(scriptText)) !== null) {
                    const arrayIndex = parseInt(match[1]);
                    const jsonString = match[2];
                    
                    try {
                        const data = JSON.parse(jsonString);
                        
                        // Check if Movies array exists
                        if (data.Movies && Array.isArray(data.Movies)) {
                            data.Movies.forEach((movie, movieIndex) => {
                                // First check if movie is already in cache AND still valid with current tags
                                if (isInHiddenCacheAndValid(movie.GroupId)) {
                                    console.log(`Found valid cached movie: ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId}`);
                                    hideSpecificMovieElement(arrayIndex, movieIndex, movie.GroupId, movie.Title, hiddenCache[movie.GroupId].tags);
                                }
                                // Then check if movie has any of the current target tags
                                else if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                    const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                    console.log(`Found movie with target tags (coverViewJsonData): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId || 'N/A'} - Matched tags: ${matchedTags.join(', ')} - Array Index: ${arrayIndex}, Movie Index: ${movieIndex}`);
                                    
                                    // Add to cache with IMDB ID
                                    addToHiddenCache(movie.GroupId, movie.Title, movie.Year, matchedTags, movie.ImdbId);
                                    
                                    // Hide corresponding HTML elements using both indices
                                    hideSpecificMovieElement(arrayIndex, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to parse coverViewJsonData:', e);
                    }
                }
            }
            
            // Check for PageData
            if (scriptText.includes('var PageData = {')) {
                foundData = true;
                
                try {
                    // Extract PageData object
                    const pageDataMatch = scriptText.match(/var PageData = ({[\s\S]*?});/);
                    if (pageDataMatch) {
                        const pageDataString = pageDataMatch[1];
                        const pageData = JSON.parse(pageDataString);
                        
                        // Helper function to process movie arrays
                        const processMovieArray = (movies, arrayName) => {
                            if (movies && Array.isArray(movies)) {
                                movies.forEach((movie, movieIndex) => {
                                    // First check if movie is already in cache AND still valid with current tags
                                    if (isInHiddenCacheAndValid(movie.GroupId)) {
                                        console.log(`Found valid cached movie: ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId}`);
                                        hideSpecificMovieElement(-1, movieIndex, movie.GroupId, movie.Title, hiddenCache[movie.GroupId].tags);
                                    }
                                    // Then check if movie has any of the current target tags
                                    else if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                        const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                        console.log(`Found movie with target tags (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId || 'N/A'} - Matched tags: ${matchedTags.join(', ')} - Movie Index: ${movieIndex}`);
                                        
                                        // Add to cache with IMDB ID
                                        addToHiddenCache(movie.GroupId, movie.Title, movie.Year, matchedTags, movie.ImdbId);
                                        
                                        // Hide corresponding HTML elements
                                        hideSpecificMovieElement(-1, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                    }
                                });
                            }
                        };
                        
                        // Process all movie arrays
                        processMovieArray(pageData.Movies, 'PageData.Movies');
                        processMovieArray(pageData.RecentRatings, 'PageData.RecentRatings');
                        processMovieArray(pageData.RecentSnatches, 'PageData.RecentSnatches');
                        processMovieArray(pageData.RecentUploads, 'PageData.RecentUploads');
                    }
                } catch (e) {
                    console.warn('Failed to parse PageData:', e);
                }
            }
        });

        // If we found data and processed it, or if no data exists, show the page
        if (foundData || document.readyState === 'complete') {
            setTimeout(showPage, 100); // Small delay to ensure DOM updates are complete
        }
    }

    function hideSpecificMovieElement(arrayIndex, movieIndex, groupId, title, matchedTags) {
        // GroupID-based selectors
        const selectors = [
            // Direct group ID selectors (most reliable)
            `[data-group-id="${groupId}"]`,
            `[data-groupid="${groupId}"]`,
            `[href*="id=${groupId}"]`,              // Catches torrents.php?id=93851
            `[href*="id=${groupId}&"]`,             // Catches torrents.php?id=93851&torrentid=...
            `[href*="groupid=${groupId}"]`,
            `#group_${groupId}`,
            
            // Additional patterns for user recommendations and other layouts
            `[href="torrents.php?id=${groupId}"]`,  // Exact match for simple links
            `a[href^="torrents.php?id=${groupId}"]` // Links starting with this pattern
        ];

        let hiddenCount = 0;

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Check if the element is inside a Film Club panel
                const filmClubPanel = element.closest('#filmclub');
                if (filmClubPanel) {
                    // Hide the entire Film Club panel
                    filmClubPanel.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden Film Club panel with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, filmClubPanel);
                }
                // Check if the element is inside a cover movie list item
                else if (element.closest('.cover-movie-list__movie')) {
                    const coverMovieDiv = element.closest('.cover-movie-list__movie');
                    // Hide the entire cover movie div
                    coverMovieDiv.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden cover movie div with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, coverMovieDiv);
                }
                // Check if the element is inside a tbody (for movie list tables)
                else if (element.closest('tbody')) {
                    const parentTbody = element.closest('tbody');
                    // Hide the entire tbody instead of just individual cells
                    parentTbody.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden tbody with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, parentTbody);
                }
                // Check if the element is inside a table cell
                else if (element.closest('td')) {
                    const parentTd = element.closest('td');
                    // Hide the entire table cell instead of just the link
                    parentTd.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden table cell with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, parentTd);
                }
                // Check if the element is inside a user recommendation div
                else if (element.closest('.user-recommendation')) {
                    const recommendationDiv = element.closest('.user-recommendation');
                    recommendationDiv.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden user recommendation with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, recommendationDiv);
                }
                // Check for other common container patterns
                else if (element.closest('.movie-item, .cover-item, .torrent-group, [class*="movie"], [class*="cover"]')) {
                    const container = element.closest('.movie-item, .cover-item, .torrent-group, [class*="movie"], [class*="cover"]');
                    container.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden container with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, container);
                }
                // For other elements, hide the element itself
                else {
                    element.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden element with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, element);
                }
            });
        });

        // Log if nothing was hidden
        if (hiddenCount === 0) {
            console.warn(`No elements found with GroupID ${groupId} for ${title}`);
        }

        // If no direct selectors worked, try container-based approach
        if (hiddenCount === 0) {
            hideByContainerAndPosition(arrayIndex, movieIndex, title, matchedTags);
        }

        // Fallback: hide by text content but be more specific
        if (hiddenCount === 0) {
            hideBySpecificTextContent(title, groupId, matchedTags);
        }
    }

    function hideByContainerAndPosition(arrayIndex, movieIndex, title, matchedTags) {
        // Look for containers that might correspond to the array index
        const containerSelectors = [
            `.covers-${arrayIndex}`,
            `.movie-list-${arrayIndex}`,
            `.cover-view-${arrayIndex}`,
            `#cover_container_${arrayIndex}`,
            `.covers .cover-section:nth-child(${arrayIndex + 1})`,
        ];

        containerSelectors.forEach(containerSelector => {
            const container = document.querySelector(containerSelector);
            if (container) {
                const movieElements = container.querySelectorAll('.movie-item, .cover-item, .movie, .cover');
                if (movieElements[movieIndex]) {
                    movieElements[movieIndex].style.display = 'none';
                    console.log(`Hidden movie by container position - Array: ${arrayIndex}, Movie: ${movieIndex} for ${title} (tags: ${matchedTags.join(', ')}):`, movieElements[movieIndex]);
                }
            }
        });
    }

    function hideBySpecificTextContent(title, groupId, matchedTags) {
        // Be more specific when searching by text content
        const titleElements = document.querySelectorAll('*');
        titleElements.forEach(element => {
            // Only check elements that might be movie titles (not just any text)
            if (element.textContent && 
                element.textContent.trim() === title && 
                (element.tagName === 'A' || 
                 element.classList.contains('title') || 
                 element.classList.contains('movie-title') ||
                 element.closest('.movie-item, .cover-item, .torrent-group'))) {
                
                const parent = element.closest('.movie-item, .torrent-group, .group-item, .cover-item, [class*="movie"], [class*="group"], [class*="cover"]');
                if (parent) {
                    parent.style.display = 'none';
                    console.log(`Hidden by specific text content for ${title} (tags: ${matchedTags.join(', ')}):`, parent);
                }
            }
        });
    }

    // Run when DOM starts loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideMoviesWithTargetTags);
    } else {
        hideMoviesWithTargetTags();
    }

    // Monitor for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if script tags were added
                        if (node.tagName === 'SCRIPT' && node.textContent.includes('coverViewJsonData')) {
                            shouldCheck = true;
                        }
                        // Check if script tags were added as children
                        if (node.querySelectorAll && node.querySelectorAll('script').length > 0) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });
        
        if (shouldCheck) {
            setTimeout(hideMoviesWithTargetTags, 50);
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Fallback: ensure page is shown after a maximum delay
    setTimeout(() => {
        if (DELAY_RENDER && !pageProcessed) {
            console.log('Timeout reached, showing page anyway');
            showPage();
        }
    }, 3000); // 3 second maximum delay

})();