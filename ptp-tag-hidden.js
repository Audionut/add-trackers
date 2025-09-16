// ==UserScript==
// @name         PTP content hider
// @version      1.9.3
// @description  Hide html elements with specified tags
// @match        https://passthepopcorn.me/index.php*
// @match        https://passthepopcorn.me/top10.php*
// @match        https://passthepopcorn.me/torrents.php*
// @match        https://passthepopcorn.me/user.php*
// @match        https://passthepopcorn.me/forums.php*
// @match        https://passthepopcorn.me/requests.php*
// @match        https://passthepopcorn.me/collages.php*
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
    let TAGS_TO_HIDE = GM_getValue('TAGS_TO_HIDE', 'adult');
    let IMDB_KEYWORDS_TO_HIDE = GM_getValue('IMDB_KEYWORDS_TO_HIDE', 'masturbation');
    let DELAY_RENDER = GM_getValue('DELAY_RENDER', true);
    let HIDDEN_CACHE = GM_getValue('HIDDEN_CACHE', '{}');
    let IMDB_KEYWORDS_CACHE = GM_getValue('IMDB_KEYWORDS_CACHE', '{}');
    let SHOW_LOADING_SPINNER = GM_getValue('SHOW_LOADING_SPINNER', false);
    let HIDE_TORRENT_PAGES = GM_getValue('HIDE_TORRENT_PAGES', true);
    let HIDE_TORRENT_PAGES_BY_COLLAGE = GM_getValue('HIDE_TORRENT_PAGES_BY_COLLAGE', true);
    let ENABLE_IMDB_KEYWORD_CHECK = GM_getValue('ENABLE_IMDB_KEYWORD_CHECK', false);
    
    // Convert to array and clean up
    let tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    let imdbKeywordsArray = IMDB_KEYWORDS_TO_HIDE.split(',').map(keyword => keyword.trim().toLowerCase()).filter(keyword => keyword.length > 0);
    let hiddenCache = {};
    let imdbKeywordsCache = {};
    let collageProcessingTimeout = null;
    let isProcessingCollages = false;

    try {
        hiddenCache = JSON.parse(HIDDEN_CACHE);
    } catch (e) {
        console.warn('Failed to parse hidden cache, starting fresh:', e);
        hiddenCache = {};
    }

    try {
        imdbKeywordsCache = JSON.parse(IMDB_KEYWORDS_CACHE);
    } catch (e) {
        console.warn('Failed to parse IMDb keywords cache, starting fresh:', e);
        imdbKeywordsCache = {};
    }

    console.log('Tags to hide:', tagsArray);
    console.log('IMDb keywords to hide:', imdbKeywordsArray);
    console.log('Delay render:', DELAY_RENDER);
    console.log('Show loading spinner:', SHOW_LOADING_SPINNER);
    console.log('Hide torrent pages:', HIDE_TORRENT_PAGES);
    console.log('Hide torrent pages by collage tags:', HIDE_TORRENT_PAGES_BY_COLLAGE);
    console.log('IMDb keyword checking:', ENABLE_IMDB_KEYWORD_CHECK);
    console.log('Cached hidden movies:', Object.keys(hiddenCache).length);
    console.log('Cached IMDb keywords:', Object.keys(imdbKeywordsCache).length);

    // Register settings panel menu command
    GM_registerMenuCommand('Open Settings Panel', showSettingsPanel);

    // Settings Panel Functions
    function showSettingsPanel() {
        // Remove existing panel if it exists
        const existingPanel = document.getElementById('ptp-settings-overlay');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'ptp-settings-overlay';
        overlay.innerHTML = createSettingsPanelHTML();
        
        // Add styles
        injectSettingsPanelStyles();
        
        // Add to page
        document.body.appendChild(overlay);
        
        // Populate current values
        populateSettings();
        
        // Add event listeners
        setupEventListeners();
        
        console.log('Settings panel opened');
    }

    function hideSettingsPanel() {
        const overlay = document.getElementById('ptp-settings-overlay');
        if (overlay) {
            overlay.remove();
            console.log('Settings panel closed');
        }
    }

    function injectSettingsPanelStyles() {
        // Remove existing styles
        const existingStyles = document.getElementById('ptp-settings-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const style = document.createElement('style');
        style.id = 'ptp-settings-styles';
        style.textContent = `
            #ptp-settings-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .ptp-settings-panel {
                background: #1a1a1a;
                border-radius: 12px;
                width: 90vw;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                color: #fff;
            }

            .ptp-settings-header {
                background: #2d2d2d;
                padding: 20px;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ptp-settings-title {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                color: #fff;
            }

            .ptp-settings-close {
                background: none;
                border: none;
                color: #ccc;
                font-size: 28px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .ptp-settings-close:hover {
                background: #444;
                color: #fff;
            }

            .ptp-settings-content {
                max-height: calc(90vh - 140px);
                overflow-y: auto;
                padding: 0;
            }

            .ptp-settings-section {
                padding: 20px;
                border-bottom: 1px solid #333;
            }

            .ptp-settings-section:last-child {
                border-bottom: none;
            }

            .ptp-section-title {
                margin: 0 0 15px 0;
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ptp-section-icon {
                font-size: 20px;
            }

            .ptp-setting-group {
                margin-bottom: 20px;
            }

            .ptp-setting-group:last-child {
                margin-bottom: 0;
            }

            .ptp-setting-label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #ddd;
                font-size: 14px;
            }

            .ptp-setting-input {
                width: 100%;
                padding: 10px;
                border: 1px solid #444;
                border-radius: 6px;
                background: #2d2d2d;
                color: #fff;
                font-size: 14px;
                box-sizing: border-box;
                transition: border-color 0.2s;
            }

            .ptp-setting-input:focus {
                outline: none;
                border-color: #007acc;
            }

            .ptp-setting-textarea {
                min-height: 80px;
                resize: vertical;
                font-family: inherit;
            }

            .ptp-setting-checkbox {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                cursor: pointer;
                padding: 8px 0;
            }

            .ptp-setting-checkbox input[type="checkbox"] {
                margin: 0;
                transform: scale(1.2);
                accent-color: #007acc;
            }

            .ptp-setting-checkbox label {
                margin: 0;
                cursor: pointer;
                color: #ddd;
                flex: 1;
            }

            .ptp-setting-description {
                font-size: 12px;
                color: #999;
                margin-top: 5px;
                line-height: 1.4;
            }

            .ptp-cache-stats {
                background: #2d2d2d;
                border: 1px solid #444;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 15px;
            }

            .ptp-cache-stat {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .ptp-cache-stat:last-child {
                margin-bottom: 0;
            }

            .ptp-cache-count {
                color: #007acc;
                font-weight: 600;
            }

            .ptp-button-group {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .ptp-button {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                text-align: center;
                min-width: 120px;
            }

            .ptp-button-primary {
                background: #007acc;
                color: #fff;
            }

            .ptp-button-primary:hover {
                background: #005a9e;
            }

            .ptp-button-secondary {
                background: #444;
                color: #ccc;
            }

            .ptp-button-secondary:hover {
                background: #555;
                color: #fff;
            }

            .ptp-button-danger {
                background: #d73a49;
                color: #fff;
            }

            .ptp-button-danger:hover {
                background: #b52d3a;
            }

            .ptp-settings-footer {
                padding: 20px;
                background: #2d2d2d;
                border-top: 1px solid #444;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }

            /* Scrollbar styling */
            .ptp-settings-content::-webkit-scrollbar {
                width: 8px;
            }

            .ptp-settings-content::-webkit-scrollbar-track {
                background: #1a1a1a;
            }

            .ptp-settings-content::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 4px;
            }

            .ptp-settings-content::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        `;
        
        document.head.appendChild(style);
    }

    function createSettingsPanelHTML() {
        return `
            <div class="ptp-settings-panel">
                <div class="ptp-settings-header">
                    <h2 class="ptp-settings-title">PTP Content Hider Settings</h2>
                    <button class="ptp-settings-close">×</button>
                </div>
                
                <div class="ptp-settings-content">
                    <!-- PTP Tags Section -->
                    <div class="ptp-settings-section">
                        <h3 class="ptp-section-title">
                            <span class="ptp-section-icon">🏷️</span>
                            PTP Tags Filtering
                        </h3>
                        <div class="ptp-setting-group">
                            <label class="ptp-setting-label" for="tags-to-hide">Tags to hide (comma-separated):</label>
                            <textarea id="tags-to-hide" class="ptp-setting-input ptp-setting-textarea" placeholder="family, animation, comedy, romance"></textarea>
                            <div class="ptp-setting-description">Enter PTP tags separated by commas. Movies with any of these tags will be hidden.</div>
                        </div>
                    </div>

                    <!-- General Settings Section -->
                    <div class="ptp-settings-section">
                        <h3 class="ptp-section-title">
                            <span class="ptp-section-icon">⚙️</span>
                            General Settings
                        </h3>
                        <div class="ptp-setting-group">
                            <div class="ptp-setting-checkbox">
                                <input type="checkbox" id="delay-render">
                                <label for="delay-render">Delay page rendering while processing</label>
                            </div>
                            <div class="ptp-setting-description">Shows a blank screen while the script processes movies to hide.</div>
                        </div>
                        
                        <div class="ptp-setting-group">
                            <div class="ptp-setting-checkbox">
                                <input type="checkbox" id="show-loading-spinner">
                                <label for="show-loading-spinner">Show loading spinner</label>
                            </div>
                            <div class="ptp-setting-description">Display an animated spinner during loading. Slows processing slightly</div>
                        </div>
                        
                        <div class="ptp-setting-group">
                            <div class="ptp-setting-checkbox">
                                <input type="checkbox" id="hide-torrent-pages">
                                <label for="hide-torrent-pages">Hide individual torrent pages</label>
                            </div>
                            <div class="ptp-setting-description">Hide torrent detail pages (torrents.php?id=) that match filtering criteria.</div>
                        </div>
                        
                        <div class="ptp-setting-group">
                            <div class="ptp-setting-checkbox">
                                <input type="checkbox" id="hide-torrent-pages-by-collage">
                                <label for="hide-torrent-pages-by-collage">Hide torrent pages by collage tags</label>
                            </div>
                            <div class="ptp-setting-description">Also check collage tags when hiding individual torrent pages.</div>
                        </div>
                    </div>

                    <!-- IMDb Settings Section -->
                    <div class="ptp-settings-section">
                        <h3 class="ptp-section-title">
                            <span class="ptp-section-icon">🎬</span>
                            IMDb Integration
                        </h3>
                        <div class="ptp-setting-group">
                            <div class="ptp-setting-checkbox">
                                <input type="checkbox" id="enable-imdb-keywords">
                                <label for="enable-imdb-keywords">Enable IMDb keyword filtering</label>
                            </div>
                            <div class="ptp-setting-description">Filter movies based on IMDb keywords (requires PTP IMDb Combined script).</div>
                        </div>
                        
                        <div class="ptp-setting-group">
                            <label class="ptp-setting-label" for="imdb-keywords">IMDb keywords to hide (comma-separated):</label>
                            <textarea id="imdb-keywords" class="ptp-setting-input ptp-setting-textarea" placeholder="masturbation, explicit-sex"></textarea>
                            <div class="ptp-setting-description">Movies with any of these IMDb keywords will be hidden.</div>
                        </div>
                    </div>

                    <!-- Cache Management Section -->
                    <div class="ptp-settings-section">
                        <h3 class="ptp-section-title">
                            <span class="ptp-section-icon">💾</span>
                            Cache Management
                        </h3>
                        <div class="ptp-cache-stats">
                            <div class="ptp-cache-stat">
                                <span>Hidden movies cache:</span>
                                <span class="ptp-cache-count" id="hidden-cache-count">0</span>
                            </div>
                            <div class="ptp-cache-stat">
                                <span>IMDb keywords cache:</span>
                                <span class="ptp-cache-count" id="imdb-cache-count">0</span>
                            </div>
                        </div>
                        
                        <div class="ptp-button-group">
                            <button class="ptp-button ptp-button-secondary" id="view-hidden-cache-btn">View Hidden Cache</button>
                            <button class="ptp-button ptp-button-secondary" id="view-imdb-cache-btn">View IMDb Cache</button>
                            <button class="ptp-button ptp-button-secondary" id="clean-outdated-cache-btn">Clean Outdated</button>
                            <button class="ptp-button ptp-button-danger" id="clear-hidden-cache-btn">Clear Hidden Cache</button>
                            <button class="ptp-button ptp-button-danger" id="clear-imdb-cache-btn">Clear IMDb Cache</button>
                            <button class="ptp-button ptp-button-danger" id="clear-all-caches-btn">Clear All Caches</button>
                        </div>
                    </div>
                </div>

                <div class="ptp-settings-footer">
                    <button class="ptp-button ptp-button-secondary" id="reset-defaults-btn">Reset to Defaults</button>
                    <button class="ptp-button ptp-button-secondary" id="cancel-btn">Cancel</button>
                    <button class="ptp-button ptp-button-primary" id="save-settings-btn">Save Settings</button>
                </div>
            </div>
        `;
    }

    function populateSettings() {
        document.getElementById('tags-to-hide').value = TAGS_TO_HIDE;
        document.getElementById('delay-render').checked = DELAY_RENDER;
        document.getElementById('show-loading-spinner').checked = SHOW_LOADING_SPINNER;
        document.getElementById('hide-torrent-pages').checked = HIDE_TORRENT_PAGES;
        document.getElementById('hide-torrent-pages-by-collage').checked = HIDE_TORRENT_PAGES_BY_COLLAGE;
        document.getElementById('enable-imdb-keywords').checked = ENABLE_IMDB_KEYWORD_CHECK;
        document.getElementById('imdb-keywords').value = IMDB_KEYWORDS_TO_HIDE;
        
        // Update cache counts
        document.getElementById('hidden-cache-count').textContent = Object.keys(hiddenCache).length;
        document.getElementById('imdb-cache-count').textContent = Object.keys(imdbKeywordsCache).length;
    }

    function setupEventListeners() {
        // Close button
        const closeButton = document.querySelector('.ptp-settings-close');
        if (closeButton) {
            closeButton.addEventListener('click', hideSettingsPanel);
        }

        // Footer buttons
        document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
        document.getElementById('cancel-btn').addEventListener('click', hideSettingsPanel);
        document.getElementById('reset-defaults-btn').addEventListener('click', resetToDefaults);

        // Cache management buttons
        document.getElementById('view-hidden-cache-btn').addEventListener('click', viewHiddenCache);
        document.getElementById('view-imdb-cache-btn').addEventListener('click', viewIMDbCache);
        document.getElementById('clean-outdated-cache-btn').addEventListener('click', cleanOutdatedCache);
        document.getElementById('clear-hidden-cache-btn').addEventListener('click', function() {
            if (confirm(`Clear the hidden movies cache?\n\nThis will remove ${Object.keys(hiddenCache).length} cached entries. NOT RECOMMENDED unless you are experiencing issues.`)) {
                hiddenCache = {};
                GM_setValue('HIDDEN_CACHE', '{}');
                document.getElementById('hidden-cache-count').textContent = '0';
                console.log('Hidden cache cleared');
                alert('Hidden movies cache cleared.');
            }
        });
        document.getElementById('clear-imdb-cache-btn').addEventListener('click', clearIMDbCache);
        document.getElementById('clear-all-caches-btn').addEventListener('click', clearAllCaches);

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideSettingsPanel();
            }
        });

        // Close on background click
        document.getElementById('ptp-settings-overlay').addEventListener('click', function(e) {
            if (e.target === this) {
                hideSettingsPanel();
            }
        });
    }

    function saveSettings() {
        // Get values from form
        const newTagsToHide = document.getElementById('tags-to-hide').value.trim();
        const newDelayRender = document.getElementById('delay-render').checked;
        const newShowLoadingSpinner = document.getElementById('show-loading-spinner').checked;
        const newHideTorrentPages = document.getElementById('hide-torrent-pages').checked;
        const newHideTorrentPagesByCollage = document.getElementById('hide-torrent-pages-by-collage').checked;
        const newEnableIMDbKeywords = document.getElementById('enable-imdb-keywords').checked;
        const newIMDbKeywords = document.getElementById('imdb-keywords').value.trim();

        // Save to GM storage
        GM_setValue('TAGS_TO_HIDE', newTagsToHide);
        GM_setValue('DELAY_RENDER', newDelayRender);
        GM_setValue('SHOW_LOADING_SPINNER', newShowLoadingSpinner);
        GM_setValue('HIDE_TORRENT_PAGES', newHideTorrentPages);
        GM_setValue('HIDE_TORRENT_PAGES_BY_COLLAGE', newHideTorrentPagesByCollage);
        GM_setValue('ENABLE_IMDB_KEYWORD_CHECK', newEnableIMDbKeywords);
        GM_setValue('IMDB_KEYWORDS_TO_HIDE', newIMDbKeywords);

        // Update runtime variables
        TAGS_TO_HIDE = newTagsToHide;
        DELAY_RENDER = newDelayRender;
        SHOW_LOADING_SPINNER = newShowLoadingSpinner;
        HIDE_TORRENT_PAGES = newHideTorrentPages;
        HIDE_TORRENT_PAGES_BY_COLLAGE = newHideTorrentPagesByCollage;
        ENABLE_IMDB_KEYWORD_CHECK = newEnableIMDbKeywords;
        IMDB_KEYWORDS_TO_HIDE = newIMDbKeywords;

        // Update arrays
        tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
        imdbKeywordsArray = IMDB_KEYWORDS_TO_HIDE.split(',').map(keyword => keyword.trim().toLowerCase()).filter(keyword => keyword.length > 0);

        hideSettingsPanel();
        
        if (confirm('Settings saved successfully!\n\nWould you like to reload the page to apply changes immediately?')) {
            window.location.reload();
        }
    }

    function resetToDefaults() {
        if (!confirm('Are you sure you want to reset all settings to their default values?\n\nThis cannot be undone.')) {
            return;
        }

        // Set default values
        document.getElementById('tags-to-hide').value = 'family, animation, comedy, romance';
        document.getElementById('delay-render').checked = true;
        document.getElementById('show-loading-spinner').checked = false;
        document.getElementById('hide-torrent-pages').checked = true;
        document.getElementById('hide-torrent-pages-by-collage').checked = true;
        document.getElementById('enable-imdb-keywords').checked = false;
        document.getElementById('imdb-keywords').value = 'masturbation';
    }

    // Cache management functions
    function viewHiddenCache() {
        const cacheEntries = Object.entries(hiddenCache);
        if (cacheEntries.length === 0) {
            alert('No movies currently in hidden cache.');
            return;
        }

        const cacheList = cacheEntries.map(([groupId, data]) => {
            return `${data.title} (${data.year}) - IMDB: ${data.imdbId || 'N/A'} - Tags: ${data.tags.join(', ')}`;
        }).join('\n');

        alert(`Hidden Movies Cache (${cacheEntries.length} entries):\n\n${cacheList}`);
    }

    function viewIMDbCache() {
        const cacheEntries = Object.entries(imdbKeywordsCache);
        if (cacheEntries.length === 0) {
            alert('No IMDb keywords currently in cache.');
            return;
        }

        const cacheList = cacheEntries.map(([imdbId, data]) => {
            const age = Math.round((Date.now() - data.cachedAt) / (1000 * 60 * 60));
            const keywordCount = data.keywords.length;
            return `${imdbId}: ${keywordCount} keywords (cached ${age}h ago)`;
        }).join('\n');

        alert(`IMDb Keywords Cache (${cacheEntries.length} entries):\n\n${cacheList}`);
    }

    function cleanOutdatedCache() {
        if (confirm('Clean outdated entries from cache?\n\nThis will remove cached movies that no longer match your current tag settings. NOT RECOMMENDED!')) {
            const cleanedCount = cleanCache();
            document.getElementById('hidden-cache-count').textContent = Object.keys(hiddenCache).length;
            
            if (cleanedCount > 0) {
                alert(`Cleaned ${cleanedCount} outdated entries from cache.`);
            } else {
                alert('Cache is already clean - no outdated entries found.');
            }
        }
    }

    function clearIMDbCache() {
        if (confirm(`Clear the IMDb keywords cache?\n\nThis will remove ${Object.keys(imdbKeywordsCache).length} cached entries. NOT RECOMMENDED unless you are experiencing issues.`)) {
            clearIMDbKeywordsCache();
            document.getElementById('imdb-cache-count').textContent = '0';
            alert('IMDb keywords cache cleared.');
        }
    }

    function clearAllCaches() {
        const hiddenCount = Object.keys(hiddenCache).length;
        const keywordsCount = Object.keys(imdbKeywordsCache).length;
        
        if (confirm(`Clear all caches?\n\nHidden movies: ${hiddenCount} entries\nIMDb keywords: ${keywordsCount} entries. NOT RECOMMENDED unless you are experiencing issues.`)) {
            clearHiddenCache();
            clearIMDbKeywordsCache();
            document.getElementById('hidden-cache-count').textContent = '0';
            document.getElementById('imdb-cache-count').textContent = '0';
            alert('All caches cleared.');
        }
    }



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
        
        if (tagsArray.length === 0 && imdbKeywordsArray.length === 0) {
            return false;
        }
        
        // Check if the cached movie should still be hidden with current tags/keywords
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
        if (tagsArray.length === 0 && imdbKeywordsArray.length === 0) {
            return false;
        }
        
        // Check if any of the cached movie's tags are still in the current hide lists
        return cachedMovie.tags.some(tag => {
            const lowercaseTag = tag.toLowerCase();
            
            // Check against PTP tags (remove imdb: prefix if present)
            if (lowercaseTag.startsWith('imdb:')) {
                const imdbKeyword = lowercaseTag.replace('imdb:', '');
                return imdbKeywordsArray.includes(imdbKeyword);
            } else {
                return tagsArray.includes(lowercaseTag);
            }
        });
    }

    // Function to clean cache of items that no longer match current tags
    function cleanCache() {
        // Don't clean cache if no tags or keywords are configured
        if (tagsArray.length === 0 && imdbKeywordsArray.length === 0) {
            console.log('No tags or keywords configured for hiding - cache cleaning skipped to preserve entries');
            return 0;
        }
        
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

    // Function to add IMDb keywords to cache
    function addToIMDbKeywordsCache(imdbId, keywords, timestamp = Date.now()) {
        imdbKeywordsCache[imdbId] = {
            keywords: keywords,
            cachedAt: timestamp,
            lastChecked: timestamp
        };
        
        // Save to GM storage
        GM_setValue('IMDB_KEYWORDS_CACHE', JSON.stringify(imdbKeywordsCache));
        console.log(`Added IMDb keywords to cache: ${imdbId} - Keywords: ${keywords.join(', ')}`);
    }

    // Function to check if cached IMDb keywords are still valid (not expired)
    function isIMDbKeywordsCacheValid(imdbId, maxAgeHours = 24) {
        if (!imdbKeywordsCache.hasOwnProperty(imdbId)) {
            return false;
        }
        
        const cached = imdbKeywordsCache[imdbId];
        const ageInHours = (Date.now() - cached.cachedAt) / (1000 * 60 * 60);
        
        return ageInHours < maxAgeHours;
    }

    // Function to get cached IMDb keywords
    function getCachedIMDbKeywords(imdbId) {
        if (!isIMDbKeywordsCacheValid(imdbId)) {
            return null;
        }
        
        return imdbKeywordsCache[imdbId].keywords;
    }

    // Function to clean expired IMDb keywords cache
    function cleanIMDbKeywordsCache(maxAgeHours = 24) {
        let cleanedCount = 0;
        const originalCacheSize = Object.keys(imdbKeywordsCache).length;
        const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
        
        Object.keys(imdbKeywordsCache).forEach(imdbId => {
            if (imdbKeywordsCache[imdbId].cachedAt < cutoffTime) {
                delete imdbKeywordsCache[imdbId];
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            GM_setValue('IMDB_KEYWORDS_CACHE', JSON.stringify(imdbKeywordsCache));
            console.log(`Cleaned ${cleanedCount} expired IMDb keyword entries from cache (${originalCacheSize} -> ${Object.keys(imdbKeywordsCache).length})`);
        }
        
        return cleanedCount;
    }

    // Function to clear IMDb keywords cache
    function clearIMDbKeywordsCache() {
        imdbKeywordsCache = {};
        GM_setValue('IMDB_KEYWORDS_CACHE', '{}');
        console.log('IMDb keywords cache cleared');
    }



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
                display: ${SHOW_LOADING_SPINNER ? 'block' : 'none'};
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
        
        // Create the loading overlay with conditional spinner
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'ptp-loading-overlay';
        
        let loadingContent = `
            <div id="ptp-loading-content">
                <div id="ptp-loading-logo"></div>
        `;
        
        if (SHOW_LOADING_SPINNER) {
            loadingContent += `<div id="ptp-loading-spinner"></div>`;
        }
        
        loadingContent += `</div>`;
        
        loadingOverlay.innerHTML = loadingContent;
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

    // Function to extract data from torrent detail pages
    function extractTorrentPageData() {
        // Look for GroupID in script tags first
        let groupId = null;
        
        const scripts = document.querySelectorAll('script[type="text/javascript"]');
        scripts.forEach(script => {
            const scriptText = script.textContent || script.innerHTML;
            
            // Look for TGroupID or groupid variables
            const tgroupMatch = scriptText.match(/var\s+TGroupID\s*=\s*['"]*(\d+)['"]*\s*;/);
            const groupMatch = scriptText.match(/var\s+groupid\s*=\s*(\d+)\s*;/);
            
            if (tgroupMatch) {
                groupId = tgroupMatch[1];
            } else if (groupMatch) {
                groupId = groupMatch[1];
            }
        });
        
        if (!groupId) {
            // Fallback: check for group_torrent_header elements
            const groupTorrentHeaders = document.querySelectorAll('tr.group_torrent.group_torrent_header[id*="group_torrent_header"]');
            
            if (groupTorrentHeaders.length > 0) {
                const idAttribute = groupTorrentHeaders[0].getAttribute('id');
                const groupIdMatch = idAttribute.match(/group_torrent_header_(\d+)/);
                if (groupIdMatch) {
                    groupId = groupIdMatch[1];
                }
            }
        }

        if (!groupId) {
            const requestsHeader = document.querySelector('h2.page__title');
            if (requestsHeader) {
                const torrentLink = requestsHeader.querySelector('a[href*="torrents.php?id="]');
                if (torrentLink) {
                    const href = torrentLink.getAttribute('href');
                    const groupIdMatch = href.match(/torrents\.php\?id=(\d+)/);
                    if (groupIdMatch) {
                        groupId = groupIdMatch[1];
                    }
                }
            }
        }

        if (!groupId) {
            return false; // Not a torrent detail page or couldn't find GroupID
        }

        console.log('Found torrent detail page with GroupID:', groupId);

        // Extract movie title from the page (look for common title selectors)
        let title = '';
        let year = '';
        
        // Try to find title in various locations
        const titleSelectors = [
            'h2.page__title',
            '.torrent-title',
            '.group-title',
            'h1',
            'h2'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
                const titleText = titleElement.textContent.trim();
                // Try to extract year from title
                const yearMatch = titleText.match(/\[(\d{4})\]|\((\d{4})\)/);
                if (yearMatch) {
                    year = yearMatch[1] || yearMatch[2];
                    title = titleText.replace(/\s*[\[\(]\d{4}[\]\)]\s*/, ' ').trim();
                    // Clean up any double spaces
                    title = title.replace(/\s+/g, ' ');
                } else {
                    title = titleText;
                }
                break;
            }
        }

        // Extract tags from the tags panel
        const tags = [];
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            const heading = panel.querySelector('.panel__heading .panel__heading__title');
            if (heading && heading.textContent.trim().toLowerCase() === 'tags') {
                const panelBody = panel.querySelector('.panel__body');
                if (panelBody) {
                    const tagLinks = panelBody.querySelectorAll('a[href*="taglist="]');
                    console.log(`Found ${tagLinks.length} tag links in new panel format`);
                    tagLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        console.log('Processing tag link:', href);
                        // Updated regex to handle both "taglist=tag" and "taglist=tag&other" formats
                        const tagMatch = href.match(/taglist=([^&\s]+)/);
                        if (tagMatch) {
                            const tag = decodeURIComponent(tagMatch[1]).toLowerCase();
                            if (!tags.includes(tag)) {
                                tags.push(tag);
                                console.log('Added tag:', tag);
                            }
                        }
                    });
                }
            }
        });

        const oldTagsPanel = document.querySelector('.box_tags.panel');
        if (oldTagsPanel) {
            const tagLinks = oldTagsPanel.querySelectorAll('a[href*="taglist="]');
            tagLinks.forEach(link => {
                const href = link.getAttribute('href');
                const tagMatch = href.match(/taglist=([^&]+)/);
                if (tagMatch) {
                    const tag = decodeURIComponent(tagMatch[1]).toLowerCase();
                    if (!tags.includes(tag)) {
                        tags.push(tag);
                    }
                }
            });
        };

        console.log('All panels on page:', document.querySelectorAll('.panel').length);
        console.log('Panel headings found:', Array.from(document.querySelectorAll('.panel .panel__heading .panel__heading__title')).map(h => h.textContent.trim()));

        console.log('Extracted tags:', tags);

        // Extract IMDB ID
        let imdbId = null;
        
        // First try: look for direct IMDb link
        const imdbLink = document.querySelector("a#imdb-title-link.rating");
        if (imdbLink) {
            const imdbUrl = imdbLink.getAttribute("href");
            if (imdbUrl) {
                const urlParts = imdbUrl.split("/");
                imdbId = urlParts[4];
                if (imdbId && !imdbId.startsWith('tt')) {
                    imdbId = 'tt' + imdbId;
                }
            }
        }
        
        // Fallback: check request table for IMDb link
        if (!imdbId) {
            const requestTable = document.querySelector('table#request-table');
            if (requestTable) {
                const imdbRow = Array.from(requestTable.querySelectorAll('tr')).find(tr =>
                    tr.querySelector('.label') && tr.querySelector('.label').textContent.trim().toLowerCase() === 'imdb link'
                );
                if (imdbRow) {
                    const imdbAnchor = imdbRow.querySelector('a[href*="imdb.com/title/tt"]');
                    if (imdbAnchor) {
                        const imdbUrl = imdbAnchor.getAttribute('href');
                        const match = imdbUrl.match(/tt\d+/);
                        imdbId = match ? match[0] : null;
                    }
                }
            }
        }

        // Additional fallback: look for any IMDb link on the page
        if (!imdbId) {
            const allImdbLinks = document.querySelectorAll('a[href*="imdb.com/title/tt"]');
            if (allImdbLinks.length > 0) {
                const imdbUrl = allImdbLinks[0].getAttribute('href');
                const match = imdbUrl.match(/tt\d+/);
                imdbId = match ? match[0] : null;
            }
        }

        console.log('Extracted IMDB ID:', imdbId || 'N/A');

        // Check if any PTP tags match our filter
        const ptpMatchedTags = tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
        
        // Check IMDb keywords if enabled (regardless of PTP tag matches)
        let imdbMatchedKeywords = [];
        let shouldHideByImdb = false;
        
        if (ENABLE_IMDB_KEYWORD_CHECK && imdbId) {
            // For torrent pages, we need to handle this synchronously or show a loading state
            // Let's add the IMDb check asynchronously
            checkIMDbKeywords(imdbId, title, year).then(keywordMatch => {
                if (keywordMatch) {
                    imdbMatchedKeywords = keywordMatch.keywords.map(k => `imdb:${k}`);
                    shouldHideByImdb = true;
                    
                    console.log(`Found torrent page with IMDb keyword matches: ${title} (${year}) - GroupId: ${groupId} - IMDB: ${imdbId} - Matched keywords: ${keywordMatch.keywords.join(', ')}`);
                    
                    // If we should hide by IMDb and the page isn't already hidden by PTP tags
                    if (ptpMatchedTags.length === 0) {
                        // Add to cache with IMDb keyword tags
                        addToHiddenCache(groupId, title, year, imdbMatchedKeywords, imdbId);
                        
                        // Hide the torrent page if the option is enabled
                        if (HIDE_TORRENT_PAGES) {
                            hideTorrentPageContent(title, year, imdbMatchedKeywords);
                            console.log('Torrent page content replaced by IMDb keywords, showing page');
                            showPage();
                        }
                    } else {
                        // Both PTP and IMDb matched, update cache with combined tags
                        const combinedTags = [...ptpMatchedTags, ...imdbMatchedKeywords];
                        addToHiddenCache(groupId, title, year, combinedTags, imdbId);
                    }
                }
            }).catch(error => {
                console.warn(`Failed to check IMDb keywords for torrent page ${title} (${imdbId}):`, error);
            });
        }
        
        // Handle PTP tag matches immediately
        if (ptpMatchedTags.length > 0) {
            console.log(`Found torrent page with target PTP tags: ${title} (${year}) - GroupId: ${groupId} - IMDB: ${imdbId || 'N/A'} - Matched tags: ${ptpMatchedTags.join(', ')}`);
            
            // Add to cache
            addToHiddenCache(groupId, title, year, ptpMatchedTags, imdbId);
            
            // Hide the torrent page if the option is enabled
            if (HIDE_TORRENT_PAGES) {
                hideTorrentPageContent(title, year, ptpMatchedTags);
                
                // Show page immediately since we've replaced the content
                console.log('Torrent page content replaced by PTP tags, showing page immediately');
                showPage();
                return true; // Indicate that content was hidden and page should be shown
            }
        } else if (tags.length > 0) {
            console.log(`Found torrent page without matching PTP tags: ${title} (${year}) - GroupId: ${groupId} - IMDB: ${imdbId || 'N/A'} - Available tags: ${tags.join(', ')}`);
            
            // Don't return true here - let IMDb checking happen asynchronously
            // The page will be shown by the normal flow or by the IMDb check above
        } else {
            console.log(`Found torrent page with no tags: ${title} (${year}) - GroupId: ${groupId} - IMDB: ${imdbId || 'N/A'}`);
        }
        
        return false; // No immediate content hiding by PTP tags
    }

    // Global flag to track IMDb script availability
    let imdbScriptAvailable = null; // null = unknown, true = available, false = unavailable

    // Function to check if the IMDb Combined script is ready
    function waitForIMDbScript(maxWaitTime = 10000) {
        return new Promise((resolve, reject) => {
            // If we already know the script is unavailable, reject immediately
            if (imdbScriptAvailable === false) {
                reject(new Error('IMDb Combined script is not available (previously failed)'));
                return;
            }
            
            // If we already know the script is available, resolve immediately
            if (imdbScriptAvailable === true) {
                resolve(true);
                return;
            }
            
            const startTime = Date.now();
            let attemptCount = 0;
            const maxAttempts = 2;
            
            // First, try to ping the script to see if it's ready
            const checkReady = () => {
                if (Date.now() - startTime > maxWaitTime) {
                    imdbScriptAvailable = false; // Mark as unavailable
                    reject(new Error('Timeout waiting for IMDb Combined script'));
                    return;
                }
                
                if (attemptCount >= maxAttempts) {
                    imdbScriptAvailable = false; // Mark as unavailable
                    reject(new Error(`Failed to reach IMDb Combined script after ${maxAttempts} attempts`));
                    return;
                }
                
                attemptCount++;
                console.log(`Attempting to ping IMDb Combined script (attempt ${attemptCount}/${maxAttempts})`);
                
                // Send a ping event
                const pingId = Date.now() + '_ping_' + Math.random();
                let pingTimeout;
                
                const pongHandler = (event) => {
                    if (event.detail.pingId === pingId) {
                        document.removeEventListener('imdbScriptPong', pongHandler);
                        if (pingTimeout) clearTimeout(pingTimeout);
                        console.log(`IMDb Combined script is ready (responded on attempt ${attemptCount})`);
                        imdbScriptAvailable = true; // Mark as available
                        resolve(true);
                    }
                };
                
                document.addEventListener('imdbScriptPong', pongHandler);
                
                // Send ping
                document.dispatchEvent(new CustomEvent('imdbScriptPing', {
                    detail: { pingId: pingId }
                }));
                
                // If no response in 1 second, try again or give up
                pingTimeout = setTimeout(() => {
                    document.removeEventListener('imdbScriptPong', pongHandler);
                    
                    if (attemptCount < maxAttempts) {
                        console.log(`No response from IMDb Combined script on attempt ${attemptCount}, retrying in 500ms...`);
                        setTimeout(checkReady, 500); // Try again in 500ms
                    } else {
                        console.log(`No response from IMDb Combined script after ${maxAttempts} attempts, giving up`);
                        imdbScriptAvailable = false; // Mark as unavailable
                        reject(new Error(`No response from IMDb Combined script after ${maxAttempts} attempts`));
                    }
                }, 1000);
            };
            
            checkReady();
        });
    }

    // checkIMDbKeywords function with global availability check and processing wait
    async function checkIMDbKeywords(imdbId, title, year) {
        if (!imdbId || imdbKeywordsArray.length === 0) return null;
        
        try {
            // First, check if we have valid cached keywords
            const cachedKeywords = getCachedIMDbKeywords(imdbId);
            
            if (cachedKeywords) {
                console.log(`Using cached IMDb keywords for ${title} (${imdbId}):`, cachedKeywords);
                
                // Check if any cached keywords match our IMDb keywords list
                const matchedKeywords = cachedKeywords.filter(keyword => 
                    imdbKeywordsArray.includes(keyword.toLowerCase())
                );
                
                if (matchedKeywords.length > 0) {
                    console.log(`Found cached IMDb keyword matches for ${title}: ${matchedKeywords.join(', ')}`);
                    return {
                        matched: true,
                        keywords: matchedKeywords,
                        allKeywords: cachedKeywords,
                        fromCache: true
                    };
                } else {
                    console.log(`Cached keywords for ${title} don't match current filter list`);
                    return null;
                }
            }
            
            // Check if IMDb script is known to be unavailable
            if (imdbScriptAvailable === false) {
                console.log(`Skipping IMDb keyword check for ${title} (${imdbId}) - IMDb script unavailable`);
                return null;
            }
            
            // No valid cache, first wait for the IMDb script to be ready
            console.log(`No cached keywords for ${imdbId}, checking if IMDb combined script is ready...`);
            
            try {
                await waitForIMDbScript(5000); // Wait up to 5 seconds
            } catch (error) {
                console.warn(`IMDb Combined script not ready: ${error.message}`);
                return null;
            }
            
            console.log(`IMDb script ready, requesting keywords for ${imdbId}...`);
            
            const response = await new Promise((resolve, reject) => {
                const requestId = Date.now() + '_keywords_' + Math.random();
                let timeoutId;
                
                console.log(`checkIMDbKeywords: Sending IMDb data request for ${imdbId} with requestId: ${requestId}`);
                
                // Create the response handler
                const responseHandler = (event) => {
                    console.log(`checkIMDbKeywords received imdbDataResponse event:`, event.detail);
                    
                    // Check if this response is for our request
                    if (event.detail.requestId === requestId) {
                        console.log(`checkIMDbKeywords: This response matches our requestId: ${requestId}`);
                        // Clean up: remove event listener and clear timeout
                        document.removeEventListener('imdbDataResponse', responseHandler);
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        
                        resolve(event.detail);
                    } else {
                        console.log(`checkIMDbKeywords: Response requestId ${event.detail.requestId} doesn't match our requestId ${requestId}`);
                    }
                };
                
                // Add the event listener
                document.addEventListener('imdbDataResponse', responseHandler);
                
                // Send the request
                document.dispatchEvent(new CustomEvent('requestIMDbData', {
                    detail: {
                        imdbId: imdbId,
                        requestId: requestId
                    }
                }));
                
                // Set timeout for cleanup (5 seconds)
                timeoutId = setTimeout(() => {
                    // Clean up: remove event listener
                    document.removeEventListener('imdbDataResponse', responseHandler);
                    console.warn(`checkIMDbKeywords: IMDb data request timeout for ${imdbId} (requestId: ${requestId})`);
                    reject(new Error(`IMDb keywords request timeout for ${imdbId}`));
                }, 5000);
            });
            
            // Check if data was found or if we need to wait for processing
            if (response.found === false) {
                console.log(`No cached IMDb data found for ${imdbId}, waiting for IMDb script to fetch and process...`);
                
                // Wait for the IMDb processing to complete
                const processingResult = await new Promise((resolve, reject) => {
                    let processingTimeoutId;
                    
                    const processingHandler = (event) => {
                        const { imdbId: eventImdbId, success, error } = event.detail;
                        
                        // Check if this event is for our IMDb ID
                        if (eventImdbId === imdbId) {
                            console.log(`checkIMDbKeywords: Received imdbProcessingComplete for ${imdbId}, success: ${success}`);
                            
                            // Clean up
                            document.removeEventListener('imdbProcessingComplete', processingHandler);
                            if (processingTimeoutId) {
                                clearTimeout(processingTimeoutId);
                            }
                            
                            if (success) {
                                resolve(true);
                            } else {
                                console.warn(`checkIMDbKeywords: IMDb processing failed for ${imdbId}: ${error}`);
                                resolve(false);
                            }
                        }
                    };
                    
                    // Listen for processing completion
                    document.addEventListener('imdbProcessingComplete', processingHandler);
                    
                    // Set timeout for processing (10 seconds)
                    processingTimeoutId = setTimeout(() => {
                        document.removeEventListener('imdbProcessingComplete', processingHandler);
                        console.warn(`checkIMDbKeywords: Timeout waiting for IMDb processing completion for ${imdbId}`);
                        resolve(false);
                    }, 10000);
                });
                
                if (processingResult) {
                    console.log(`checkIMDbKeywords: IMDb processing completed for ${imdbId}, retrying data request...`);
                    
                    // Retry the data request now that processing is complete
                    const retryResponse = await new Promise((resolve, reject) => {
                        const retryRequestId = Date.now() + '_retry_' + Math.random();
                        let retryTimeoutId;
                        
                        console.log(`checkIMDbKeywords: Retrying IMDb data request for ${imdbId} with requestId: ${retryRequestId}`);
                        
                        const retryResponseHandler = (event) => {
                            console.log(`checkIMDbKeywords received retry imdbDataResponse event:`, event.detail);
                            
                            if (event.detail.requestId === retryRequestId) {
                                console.log(`checkIMDbKeywords: Retry response matches our requestId: ${retryRequestId}`);
                                document.removeEventListener('imdbDataResponse', retryResponseHandler);
                                if (retryTimeoutId) {
                                    clearTimeout(retryTimeoutId);
                                }
                                resolve(event.detail);
                            }
                        };
                        
                        document.addEventListener('imdbDataResponse', retryResponseHandler);
                        
                        // Send the retry request
                        document.dispatchEvent(new CustomEvent('requestIMDbData', {
                            detail: {
                                imdbId: imdbId,
                                requestId: retryRequestId
                            }
                        }));
                        
                        retryTimeoutId = setTimeout(() => {
                            document.removeEventListener('imdbDataResponse', retryResponseHandler);
                            console.warn(`checkIMDbKeywords: Retry request timeout for ${imdbId}`);
                            reject(new Error(`Retry IMDb keywords request timeout for ${imdbId}`));
                        }, 5000);
                    });
                    
                    // Process the retry response
                    return await processIMDbResponse(retryResponse, title, imdbId);
                } else {
                    console.log(`checkIMDbKeywords: IMDb processing failed or timed out for ${imdbId}`);
                    // Cache empty result to avoid repeated requests
                    addToIMDbKeywordsCache(imdbId, []);
                    return null;
                }
            } else {
                // Data was found immediately, process it
                return await processIMDbResponse(response, title, imdbId);
            }
            
        } catch (error) {
            console.warn(`Failed to check IMDb keywords for ${imdbId}:`, error);
            return null;
        }
    }

    // Helper function to process IMDb response data
    async function processIMDbResponse(response, title, imdbId) {
        // Process the response - use the correct data structure
        let keywordsData = null;
        
        if (response.found && response.data) {
            if (response.data.data && response.data.data.title && response.data.data.title.keywords) {
                // Correct GraphQL structure: data.data.title.keywords
                keywordsData = response.data.data.title.keywords;
                console.log(`Found keywords in GraphQL structure for ${title}`);
            } else if (response.data.title && response.data.title.keywords) {
                // Fallback: direct structure data.title.keywords (probably won't be used but kept for compatibility)
                keywordsData = response.data.title.keywords;
                console.log(`Found keywords in direct structure for ${title}`);
            }
        }
        
        if (keywordsData) {
            const keywords = keywordsData.edges || [];
            
            // Extract keyword legacyIds with proper null checking
            const keywordTexts = keywords.map(edge => edge.node ? edge.node.legacyId : null).filter(Boolean);
            console.log(`Received IMDb keywords for ${title} (${imdbId}):`, keywordTexts);
            
            // Cache the keywords for future use
            addToIMDbKeywordsCache(imdbId, keywordTexts);
            
            // Check if any keywords match our IMDb keywords list
            const matchedKeywords = keywordTexts.filter(keyword => 
                imdbKeywordsArray.includes(keyword.toLowerCase())
            );
            
            if (matchedKeywords.length > 0) {
                console.log(`Found IMDb keyword matches for ${title}: ${matchedKeywords.join(', ')}`);
                return {
                    matched: true,
                    keywords: matchedKeywords,
                    allKeywords: keywordTexts,
                    fromCache: false
                };
            }
        } else if (response.found === false) {
            // Cache empty result to avoid repeated requests for movies without data
            addToIMDbKeywordsCache(imdbId, []);
            console.log(`No IMDb data found for ${imdbId}, cached empty result`);
        } else {
            console.warn(`Received response but no keywords data found for ${imdbId}:`, response);
            console.log('Response data structure:', response.data ? Object.keys(response.data) : 'No data');
        }
        
        return null;
    }

    // Function to hide torrent page content when matched by collage tags
    function hideTorrentPageContentByCollage(title, year, matchedCollages) {
        const thinDiv = document.querySelector('div.thin');
        
        if (thinDiv) {
            // Check if replacement content already exists
            const existingReplacement = document.querySelector('.ptp-hidden-replacement');
            if (existingReplacement) {
                console.log('Replacement content already exists, skipping...');
                return;
            }
            
            // Hide the original content
            thinDiv.style.display = 'none';
            
            // Create replacement content
            const hiddenMessage = document.createElement('div');
            hiddenMessage.className = 'thin ptp-hidden-replacement'; // Add unique class
            hiddenMessage.style.cssText = `
                text-align: center;
                padding: 50px 20px;
                color: #666;
                font-size: 18px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            const collageInfo = matchedCollages.map(collage => 
                `"${collage.title}" (${collage.tags.join(', ')})`
            ).join('<br>');
            
            hiddenMessage.innerHTML = `
                <div style="background: rgba(0, 0, 0, 0.1); padding: 30px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); display: inline-block;">
                    <div style="font-size: 24px; margin-bottom: 15px; font-weight: bold;">🚫 Hidden by Collage Tag Match</div>
                    <div style="font-size: 16px; color: #888; margin-bottom: 10px;">
                        ${title}${year ? ` (${year})` : ''}
                    </div>
                    <div style="font-size: 14px; color: #aaa; margin-bottom: 10px;">
                        Found in ${matchedCollages.length} cached collage${matchedCollages.length > 1 ? 's' : ''}:
                    </div>
                    <div style="font-size: 12px; color: #bbb; margin-bottom: 20px;">
                        ${collageInfo}
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        Configure your tag filters in the userscript menu
                    </div>
                </div>
            `;
            
            // Insert the replacement after the hidden div
            thinDiv.parentNode.insertBefore(hiddenMessage, thinDiv.nextSibling);
            
            console.log(`Hidden torrent page content for: ${title} (${year}) - Collages: ${matchedCollages.map(c => c.title).join(', ')}`);
        }
    }

    // Function to hide torrent page content
    function hideTorrentPageContent(title, year, matchedTags) {
        const thinDiv = document.querySelector('div.thin');
        
        if (thinDiv) {
            // Check if replacement content already exists
            const existingReplacement = document.querySelector('.ptp-hidden-replacement');
            if (existingReplacement) {
                console.log('Replacement content already exists, skipping...');
                return;
            }
            
            // Hide the original content
            thinDiv.style.display = 'none';
            
            // Create replacement content
            const hiddenMessage = document.createElement('div');
            hiddenMessage.className = 'thin ptp-hidden-replacement'; // Add unique class
            hiddenMessage.style.cssText = `
                text-align: center;
                padding: 50px 20px;
                color: #666;
                font-size: 18px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            hiddenMessage.innerHTML = `
                <div style="background: rgba(0, 0, 0, 0.1); padding: 30px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); display: inline-block;">
                    <div style="font-size: 24px; margin-bottom: 15px; font-weight: bold;">🚫 Hidden by Tag Match</div>
                    <div style="font-size: 16px; color: #888; margin-bottom: 10px;">
                        ${title}${year ? ` (${year})` : ''}
                    </div>
                    <div style="font-size: 14px; color: #aaa;">
                        Matched tags: ${matchedTags.join(', ')}
                    </div>
                    <div style="font-size: 12px; color: #999; margin-top: 20px;">
                        Configure your tag filters in the userscript menu
                    </div>
                </div>
            `;
            
            // Insert the replacement after the hidden div
            thinDiv.parentNode.insertBefore(hiddenMessage, thinDiv.nextSibling);
            
            console.log(`Hidden torrent page content for: ${title} (${year}) - Tags: ${matchedTags.join(', ')}`);
        }
    }

    // Function to check and hide direct torrent links
    function hideCachedTorrentLinks() {
        // Find all links that match the pattern torrents.php?id=XXXXX
        const torrentLinks = document.querySelectorAll('a[href*="torrents.php?id="]');
        
        torrentLinks.forEach(link => {
            const href = link.getAttribute('href');
            const groupIdMatch = href.match(/torrents\.php\?id=(\d+)(?:&|$)/);
            
            if (groupIdMatch) {
                const groupId = groupIdMatch[1];
                
                // Check if this GroupID is in cache and still valid with current tags
                if (isInHiddenCacheAndValid(groupId)) {
                    const cachedMovie = hiddenCache[groupId];
                    
                    // Replace the link with hidden text
                    const hiddenSpan = document.createElement('span');
                    hiddenSpan.textContent = '[hidden by tag match]';
                    hiddenSpan.style.color = '#666';
                    hiddenSpan.style.fontStyle = 'italic';
                    hiddenSpan.style.fontSize = '0.9em';
                    hiddenSpan.title = `Hidden: ${cachedMovie.title} (${cachedMovie.year}) - Tags: ${cachedMovie.tags.join(', ')}`;
                    
                    // Replace the link with the hidden span
                    link.parentNode.replaceChild(hiddenSpan, link);
                    
                    console.log(`Hidden torrent link for ${cachedMovie.title} (${cachedMovie.year}) - GroupId: ${groupId} - Tags: ${cachedMovie.tags.join(', ')}`);
                }
            }
        });

        // Also find and process request links - handle both encoded and non-encoded ampersands
        const requestLinks = document.querySelectorAll('a[href*="requests.php?action=view"], a[href*="requests.php?action=view&amp;id="]');
        
        requestLinks.forEach(link => {
            const href = link.getAttribute('href');
            // Handle both &amp; (encoded) and & (unencoded) in the URL
            const requestIdMatch = href.match(/requests\.php\?action=view&(?:amp;)?id=(\d+)/);
            
            if (requestIdMatch) {
                const requestId = requestIdMatch[1];
                
                // For request links, we need to check if any cached movie matches this request
                // This would require additional logic to map request IDs to group IDs
                // For now, we can look for any data attributes or check if the link text matches cached titles
                
                const linkText = link.textContent.trim();
                
                // Check if any cached movie title matches the link text
                const matchingCacheEntry = Object.entries(hiddenCache).find(([groupId, cachedMovie]) => {
                    if (!isInHiddenCacheAndValid(groupId)) return false;
                    
                    // Check if the link text contains the movie title
                    return linkText.toLowerCase().includes(cachedMovie.title.toLowerCase());
                });
                
                if (matchingCacheEntry) {
                    const [groupId, cachedMovie] = matchingCacheEntry;
                    
                    // Replace the link with hidden text
                    const hiddenSpan = document.createElement('span');
                    hiddenSpan.textContent = '[hidden by tag match]';
                    hiddenSpan.style.color = '#666';
                    hiddenSpan.style.fontStyle = 'italic';
                    hiddenSpan.style.fontSize = '0.9em';
                    hiddenSpan.title = `Hidden: ${cachedMovie.title} (${cachedMovie.year}) - Tags: ${cachedMovie.tags.join(', ')}`;
                    
                    // Replace the link with the hidden span
                    link.parentNode.replaceChild(hiddenSpan, link);
                    
                    console.log(`Hidden request link for ${cachedMovie.title} (${cachedMovie.year}) - RequestId: ${requestId} - Tags: ${cachedMovie.tags.join(', ')}`);
                }
            }
        });
    }

    // Function to hide request entries on the main requests page
    function hideRequestEntries() {
        // Find all request links that match the pattern
        const requestLinks = document.querySelectorAll('a.l_movie[href*="requests.php?action=view&"]');
        
        requestLinks.forEach(link => {
            const href = link.getAttribute('href');
            const requestIdMatch = href.match(/requests\.php\?action=view&(?:amp;)?id=(\d+)/);
            
            if (requestIdMatch) {
                const requestId = requestIdMatch[1];
                const linkText = link.textContent.trim();
                const matchingCacheEntry = Object.entries(hiddenCache).find(([groupId, cachedMovie]) => {
                    if (!isInHiddenCacheAndValid(groupId)) return false;
                    
                    return linkText.toLowerCase().includes(cachedMovie.title.toLowerCase()) ||
                        cachedMovie.title.toLowerCase().includes(linkText.toLowerCase());
                });
                
                if (matchingCacheEntry) {
                    const [groupId, cachedMovie] = matchingCacheEntry;
                    
                    // Find the parent <tr> element and hide it
                    const parentRow = link.closest('tr');
                    if (parentRow) {
                        parentRow.style.display = 'none';
                        console.log(`Hidden request row for ${cachedMovie.title} (${cachedMovie.year}) - RequestId: ${requestId} - Tags: ${cachedMovie.tags.join(', ')}`);
                    }
                }
            }
        });
    }

    // Function to hide collage entries on collages pages
    function hideCollageEntries() {
        console.log('Processing collages page for hidden entries...');
        
        // Find all collage rows in the main table (not torrent_table)
        const collageRows = document.querySelectorAll('table tbody tr');
        console.log(`Found ${collageRows.length} total table rows to check`);
        
        let processedCount = 0;
        
        collageRows.forEach((row, index) => {
            // Look for collage link to get ID
            const collageLink = row.querySelector('a[href*="collages.php?id="]');
            if (!collageLink) return;
            
            processedCount++;
            
            const href = collageLink.getAttribute('href');
            const collageIdMatch = href.match(/collages\.php\?id=(\d+)/);
            if (!collageIdMatch) return;
            
            const collageId = collageIdMatch[1];
            const collageTitle = collageLink.textContent.trim();
            
            // Look for tags in this row - they're in a .tags div
            const tagsDiv = row.querySelector('.tags');
            if (!tagsDiv) {
                console.log(`No tags found for collage: ${collageTitle} (ID: ${collageId})`);
                return;
            }
            
            // Extract tags from the tags div - look for links with tags= parameter
            const tagLinks = tagsDiv.querySelectorAll('a[href*="tags="]');
            const collageTags = [];
            
            console.log(`Found ${tagLinks.length} tag links for collage: ${collageTitle}`);
            
            tagLinks.forEach(tagLink => {
                const tagHref = tagLink.getAttribute('href');
                console.log('Processing tag href:', tagHref);
                
                // Handle both encoded and unencoded ampersands
                const tagMatch = tagHref.match(/tags=([^&\s]+)/);
                if (tagMatch) {
                    const tag = decodeURIComponent(tagMatch[1]).toLowerCase();
                    if (!collageTags.includes(tag)) {
                        collageTags.push(tag);
                        console.log('Added collage tag:', tag);
                    }
                }
            });
            
            console.log(`Collage "${collageTitle}" (ID: ${collageId}) has tags:`, collageTags);
            
            // Check if any tags match our filter
            const matchedTags = collageTags.filter(tag => tagsArray.includes(tag.toLowerCase()));
            
            if (matchedTags.length > 0) {
                console.log(`Hiding collage "${collageTitle}" (ID: ${collageId}) - Matched tags: ${matchedTags.join(', ')}`);
                
                // Hide the entire row
                row.style.display = 'none';
                
                // Add to cache using collage ID (prefix with 'collage_' to distinguish from group IDs)
                addToHiddenCache(`collage_${collageId}`, collageTitle, '', matchedTags, null);
            }
        });
        
        console.log(`Processed ${processedCount} collage rows out of ${collageRows.length} total rows`);
    }

    // Function to hide cached collage links
    function hideCachedCollageLinks() {
        console.log('Checking for cached collage links to hide...');
        
        // Find all collage links
        const collageLinks = document.querySelectorAll('a[href*="collages.php?id="]');
        console.log(`Found ${collageLinks.length} collage links to check`);
        
        // Check if we're on a torrent detail page for potential page hiding
        const isTorrentDetailPage = window.location.pathname.includes('/torrents.php') && window.location.search.includes('id=');
        let matchedCollagesForPageHiding = [];
        
        collageLinks.forEach(link => {
            const href = link.getAttribute('href');
            const collageIdMatch = href.match(/collages\.php\?id=(\d+)/);
            
            if (collageIdMatch) {
                const collageId = collageIdMatch[1];
                const cacheKey = `collage_${collageId}`;
                
                // Check if this collage ID is in cache and still valid with current tags
                if (isInHiddenCacheAndValid(cacheKey)) {
                    const cachedCollage = hiddenCache[cacheKey];
                    
                    // If we're on a torrent detail page and the option is enabled, collect for potential page hiding
                    if (isTorrentDetailPage && HIDE_TORRENT_PAGES_BY_COLLAGE) {
                        matchedCollagesForPageHiding.push({
                            id: collageId,
                            title: cachedCollage.title,
                            tags: cachedCollage.tags
                        });
                    }
                    
                    // Find the parent row and hide it
                    const parentRow = link.closest('tr');
                    if (parentRow) {
                        parentRow.style.display = 'none';
                        console.log(`Hidden cached collage row: ${cachedCollage.title} (ID: ${collageId}) - Tags: ${cachedCollage.tags.join(', ')}`);
                    } else {
                        // If not in a table row, replace the link with hidden text
                        const hiddenSpan = document.createElement('span');
                        hiddenSpan.textContent = '[hidden by tag match]';
                        hiddenSpan.style.color = '#666';
                        hiddenSpan.style.fontStyle = 'italic';
                        hiddenSpan.style.fontSize = '0.9em';
                        hiddenSpan.title = `Hidden: ${cachedCollage.title} - Tags: ${cachedCollage.tags.join(', ')}`;
                        
                        link.parentNode.replaceChild(hiddenSpan, link);
                        console.log(`Hidden cached collage link: ${cachedCollage.title} (ID: ${collageId}) - Tags: ${cachedCollage.tags.join(', ')}`);
                    }
                }
            }
        });
        
        // If we found matching collages on a torrent detail page, hide the entire page
        if (isTorrentDetailPage && matchedCollagesForPageHiding.length > 0) {
            // Extract title and year from page title
            let title = '';
            let year = '';
            
            const titleElement = document.querySelector('h2.page__title');
            if (titleElement && titleElement.textContent.trim()) {
                const titleText = titleElement.textContent.trim();
                const yearMatch = titleText.match(/\[(\d{4})\]|\((\d{4})\)/);
                if (yearMatch) {
                    year = yearMatch[1] || yearMatch[2];
                    title = titleText.replace(/\s*[\[\(]\d{4}[\]\)]\s*/, ' ').trim();
                    title = title.replace(/\s+/g, ' ');
                } else {
                    title = titleText;
                }
            }
            
            console.log(`Torrent page "${title}" (${year}) should be hidden due to ${matchedCollagesForPageHiding.length} matching collage(s)`);
            hideTorrentPageContentByCollage(title, year, matchedCollagesForPageHiding);
            
            // Show page immediately since we've replaced the content
            console.log('Torrent page content replaced by collage match, showing page immediately');
            showPage();
            return true; // Indicate that content was hidden and page should be shown
        }
        
        return false;
    }

    async function hideMoviesWithTargetTags() {
        // Check page type
        const isForumPage = window.location.pathname.includes('/forums.php');
        const isRequestPage = window.location.pathname.includes('/requests.php') && !window.location.search.includes('action=view');
        const isCollagesPage = window.location.pathname.includes('/collages.php');

        if (isForumPage || isRequestPage) {
            console.log('Forum or request page detected, processing links only');

            const hasAnchor = window.location.hash;
            
            if (hasAnchor) {
                console.log('Forum or request anchor navigation detected:', window.location.hash);
                
                if (isRequestPage) {
                    hideRequestEntries();
                }
                showPage();
                setTimeout(() => {
                    const targetElement = document.querySelector(window.location.hash);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('Scrolled to anchor:', window.location.hash);
                    }
                    hideCachedTorrentLinks();
                    hideCachedCollageLinks();
                    if (isRequestPage) {
                        hideRequestEntries();
                    }
                }, 50);
                
                return;
            }
            
            if (isRequestPage) {
                hideRequestEntries();
            }
            
            if (document.readyState === 'complete') {
                console.log('Forum/request page complete, showing immediately');
                showPage();
            } else {
                setTimeout(() => {
                    hideCachedTorrentLinks();
                    hideCachedCollageLinks();
                    if (isRequestPage) {
                        hideRequestEntries();
                    }
                    showPage();
                }, 100);
            }
            return;
        }
        
        // Handle collages pages
        if (isCollagesPage) {
            console.log('Collages page detected, processing collage entries');
            
            const hasAnchor = window.location.hash;
            
            isProcessingCollages = true;
            hideCollageEntries();
            
            setTimeout(() => {
                isProcessingCollages = false;
            }, 500);
            
            if (hasAnchor) {
                console.log('Collages anchor navigation detected:', window.location.hash);
                showPage();
                setTimeout(() => {
                    const targetElement = document.querySelector(window.location.hash);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('Scrolled to anchor:', window.location.hash);
                    }
                }, 50);
                return;
            }
            
            if (document.readyState === 'complete') {
                console.log('Collages page complete, showing immediately');
                showPage();
            } else {
                setTimeout(() => {
                    showPage();
                }, 100);
            }
            return;
        }
        
        let foundData = false;
        let hiddenElements = false;
        
        // Find all script tags
        const scripts = document.querySelectorAll('script');
        
        // Helper function to process movie arrays with optional IMDb keyword checking
        const processMovieArrayAsync = async (movies, arrayName, arrayIndex = -1) => {
            if (!movies || !Array.isArray(movies)) return false;
            
            let elementsHidden = false;
            
            for (let movieIndex = 0; movieIndex < movies.length; movieIndex++) {
                const movie = movies[movieIndex];
                
                // First check if movie is already in cache AND still valid with current tags/keywords
                if (isInHiddenCacheAndValid(movie.GroupId)) {
                    console.log(`Found valid cached movie: ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId}`);
                    hideSpecificMovieElement(arrayIndex, movieIndex, movie.GroupId, movie.Title, hiddenCache[movie.GroupId].tags);
                    elementsHidden = true;
                    continue; // Skip further processing for this movie
                }
                
                // Check if movie should be hidden based on PTP tags OR IMDb keywords
                let shouldHide = false;
                let matchedTags = [];
                let matchType = '';
                
                // Check PTP tags first
                if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                    const ptpMatchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                    matchedTags = ptpMatchedTags;
                    shouldHide = true;
                    matchType = 'PTP tags';
                    console.log(`Found movie with target PTP tags (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId || 'N/A'} - Matched tags: ${ptpMatchedTags.join(', ')}`);
                }
                
                // Check IMDb keywords if enabled (regardless of PTP tag matches)
                if (ENABLE_IMDB_KEYWORD_CHECK && movie.ImdbId) {
                    try {
                        const keywordMatch = await checkIMDbKeywords(movie.ImdbId, movie.Title, movie.Year);
                        if (keywordMatch) {
                            const imdbTags = keywordMatch.keywords.map(k => `imdb:${k}`);
                            
                            if (!shouldHide) {
                                // Only IMDb keywords matched
                                matchedTags = imdbTags;
                                shouldHide = true;
                                matchType = 'IMDb keywords';
                                console.log(`Found movie with IMDb keyword matches (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId} - Matched keywords: ${keywordMatch.keywords.join(', ')}`);
                            } else {
                                // Both PTP tags and IMDb keywords matched
                                matchedTags = [...matchedTags, ...imdbTags];
                                matchType = 'PTP tags + IMDb keywords';
                                console.log(`Found movie with BOTH PTP tags AND IMDb keyword matches (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId} - PTP: ${movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase())).join(', ')} - IMDb: ${keywordMatch.keywords.join(', ')}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to check IMDb keywords for ${movie.Title} (${movie.ImdbId}):`, error);
                    }
                }
                
                // Hide the movie if it matches any criteria
                if (shouldHide) {
                    console.log(`Hiding movie based on ${matchType}: ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - All matched tags: ${matchedTags.join(', ')}`);
                    
                    // Add to cache with all matched tags (both PTP and IMDb)
                    addToHiddenCache(movie.GroupId, movie.Title, movie.Year, matchedTags, movie.ImdbId);
                    
                    // Hide corresponding HTML elements
                    hideSpecificMovieElement(arrayIndex, movieIndex, movie.GroupId, movie.Title, matchedTags);
                    elementsHidden = true;
                }
            }
            
            return elementsHidden;
        };
        
        // Process scripts for movie data
        for (const script of scripts) {
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
                            console.log(`Processing coverViewJsonData[${arrayIndex}] with ${data.Movies.length} movies, IMDb checking: ${ENABLE_IMDB_KEYWORD_CHECK ? 'enabled' : 'disabled'}`);
                            
                            const elementsHidden = await processMovieArrayAsync(data.Movies, `coverViewJsonData[${arrayIndex}]`, arrayIndex);
                            if (elementsHidden) {
                                hiddenElements = true;
                            }
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
                        
                        console.log(`Processing PageData, IMDb checking: ${ENABLE_IMDB_KEYWORD_CHECK ? 'enabled' : 'disabled'}`);
                        
                        // Process all movie arrays
                        const results = await Promise.all([
                            processMovieArrayAsync(pageData.Movies, 'PageData.Movies'),
                            processMovieArrayAsync(pageData.RecentRatings, 'PageData.RecentRatings'),
                            processMovieArrayAsync(pageData.RecentSnatches, 'PageData.RecentSnatches'),
                            processMovieArrayAsync(pageData.RecentUploads, 'PageData.RecentUploads')
                        ]);
                        
                        if (results.some(result => result)) {
                            hiddenElements = true;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse PageData:', e);
                }
            }
        }

        const isRequestDetailPage = window.location.pathname.includes('/requests.php') && window.location.search.includes('action=view');
        
        if (!isRequestDetailPage) {
            hideCachedTorrentLinks();
            hideCachedCollageLinks();
        }

        // Check for torrent detail pages (even if no script data found)
        const torrentPageHidden = extractTorrentPageData();
        
        // If torrent page was hidden and shown, don't continue with other processing
        if (torrentPageHidden) {
            console.log('Torrent page was found and processed, showing page immediately');
            showPage();
            return;
        }

        // Check if any links were hidden
        const linksHidden = document.querySelectorAll('span[title*="Hidden:"]').length > 0;
        if (linksHidden) {
            hiddenElements = true;
            foundData = true;
        }

        // Show page based on different conditions
        if (document.readyState === 'complete' && !hiddenElements) {
            console.log('DOM complete, no hiding required - showing page immediately');
            showPage();
        } else if (foundData || document.readyState === 'complete') {
            setTimeout(showPage, hiddenElements ? 100 : 50);
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

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('DOMContentLoaded fired, scheduling initial processing...');
        console.log('Running initial hideMoviesWithTargetTags...');
        await hideMoviesWithTargetTags();
    });

    document.addEventListener('imdbProcessingComplete', (event) => {
        const { imdbId, success, titleData, error } = event.detail;
        
        if (success) {
            console.log(`PTP Content Hider: IMDb processing completed for ${imdbId}`);
            // You could trigger additional processing here if needed
            // For example, check if this movie should be hidden based on IMDb data
        } else {
            console.log(`PTP Content Hider: IMDb processing failed for ${imdbId}:`, error);
        }
    });

    // Final fallback: ensure page is shown
    setTimeout(() => {
        if (DELAY_RENDER && !pageProcessed) {
            console.log('Maximum timeout reached, showing page anyway');
            showPage();
        }
    }, 3000);

})();