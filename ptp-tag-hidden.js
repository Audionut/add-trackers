// ==UserScript==
// @name         PTP content hider
// @version      1.9.5
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
    let IMDB_PARENTAL_GUIDE_SEVERITIES = GM_getValue('IMDB_PARENTAL_GUIDE_SEVERITIES', 'Severe');
    let IMDB_PARENTAL_GUIDE_CATEGORIES = GM_getValue('IMDB_PARENTAL_GUIDE_CATEGORIES', 'Sex & Nudity,Violence & Gore');
    let DELAY_RENDER = GM_getValue('DELAY_RENDER', true);
    let HIDDEN_CACHE = GM_getValue('HIDDEN_CACHE', '{}');
    let IMDB_KEYWORDS_CACHE = GM_getValue('IMDB_KEYWORDS_CACHE', '{}');
    let IMDB_PARENTAL_GUIDE_CACHE = GM_getValue('IMDB_PARENTAL_GUIDE_CACHE', '{}');
    let SHOW_LOADING_SPINNER = GM_getValue('SHOW_LOADING_SPINNER', false);
    let HIDE_TORRENT_PAGES = GM_getValue('HIDE_TORRENT_PAGES', true);
    let HIDE_TORRENT_PAGES_BY_COLLAGE = GM_getValue('HIDE_TORRENT_PAGES_BY_COLLAGE', true);
    let ENABLE_IMDB_KEYWORD_CHECK = GM_getValue('ENABLE_IMDB_KEYWORD_CHECK', false);
    let ENABLE_IMDB_PARENTAL_GUIDE_CHECK = GM_getValue('ENABLE_IMDB_PARENTAL_GUIDE_CHECK', false);
    let FINAL_FALLBACK_TIMEOUT = GM_getValue('FINAL_FALLBACK_TIMEOUT', 3000);
    let COLLAGE_IDS_TO_HIDE = GM_getValue('COLLAGE_IDS_TO_HIDE', '');
    
    // Convert to array and clean up
    let tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    let imdbKeywordsArray = IMDB_KEYWORDS_TO_HIDE.split(',').map(keyword => keyword.trim().toLowerCase()).filter(keyword => keyword.length > 0);
    let imdbParentalGuideSeveritiesArray = IMDB_PARENTAL_GUIDE_SEVERITIES.split(',').map(severity => severity.trim()).filter(severity => severity.length > 0);
    let imdbParentalGuideCategoriesArray = IMDB_PARENTAL_GUIDE_CATEGORIES.split(',').map(category => category.trim()).filter(category => category.length > 0);
    let collageIdsArray = COLLAGE_IDS_TO_HIDE.split(',').map(id => id.trim()).filter(id => id.length > 0);
    let hiddenCache = {};
    let imdbKeywordsCache = {};
    let imdbParentalGuideCache = {};
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

    try {
        imdbParentalGuideCache = JSON.parse(IMDB_PARENTAL_GUIDE_CACHE);
    } catch (e) {
        console.warn('Failed to parse IMDb parental guide cache, starting fresh:', e);
        imdbParentalGuideCache = {};
    }

    console.log('Tags to hide:', tagsArray);
    console.log('IMDb keywords to hide:', imdbKeywordsArray);
    console.log('IMDb parental guide severities:', imdbParentalGuideSeveritiesArray);
    console.log('IMDb parental guide categories:', imdbParentalGuideCategoriesArray);
    console.log('Delay render:', DELAY_RENDER);
    console.log('Show loading spinner:', SHOW_LOADING_SPINNER);
    console.log('Hide torrent pages:', HIDE_TORRENT_PAGES);
    console.log('Hide torrent pages by collage tags:', HIDE_TORRENT_PAGES_BY_COLLAGE);
    console.log('IMDb keyword checking:', ENABLE_IMDB_KEYWORD_CHECK);
    console.log('IMDb parental guide checking:', ENABLE_IMDB_PARENTAL_GUIDE_CHECK);
    console.log('Cached hidden movies:', Object.keys(hiddenCache).length);
    console.log('Cached IMDb keywords:', Object.keys(imdbKeywordsCache).length);
    console.log('Cached IMDb parental guides:', Object.keys(imdbParentalGuideCache).length);

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

            .ptp-checkbox-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin-bottom: 15px;
            }

            .ptp-parental-guide-grid {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin-bottom: 15px;
            }

            .ptp-parental-guide-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .ptp-parental-guide-item:last-child {
                border-bottom: none;
            }

            .ptp-parental-guide-item .ptp-setting-checkbox {
                margin-bottom: 0;
                flex: 1;
                min-width: 0;
            }

            .ptp-severity-dropdown {
                background: #2d2d2d;
                color: #ddd;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                padding: 6px 10px;
                font-size: 13px;
                min-width: 90px;
                cursor: pointer;
            }

            .ptp-severity-dropdown:focus {
                outline: none;
                border-color: #007acc;
                box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
            }

            .ptp-severity-dropdown option {
                background: #2d2d2d;
                color: #ddd;
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
                        
                        <div class="ptp-setting-group">
                            <label class="ptp-setting-label" for="collage-ids">Collage IDs to hide (comma-separated):</label>
                            <textarea id="collage-ids" class="ptp-setting-input ptp-setting-textarea" placeholder="123, 456, 789"></textarea>
                            <div class="ptp-setting-description">Enter collage IDs separated by commas. Movies from these collages will be hidden on movie list pages.</div>
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
                            <label class="ptp-setting-label" for="final-fallback-timeout">Final fallback timeout (milliseconds):</label>
                            <input type="number" id="final-fallback-timeout" class="ptp-setting-input" min="1000" max="10000" step="500" placeholder="3000">
                            <div class="ptp-setting-description">Maximum time to wait before showing page if processing hasn't completed (1000-10000ms).</div>
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
                            <div class="ptp-setting-description">Filter movies based on IMDb keywords (requires PTP IMDb Combined script AND keywords enabled).</div>
                        </div>
                        
                        <div class="ptp-setting-group">
                            <label class="ptp-setting-label" for="imdb-keywords">IMDb keywords to hide (comma-separated):</label>
                            <textarea id="imdb-keywords" class="ptp-setting-input ptp-setting-textarea" placeholder="masturbation, explicit-sex"></textarea>
                            <div class="ptp-setting-description">Movies with any of these IMDb keywords will be hidden.</div>
                        </div>

                        <div class="ptp-setting-group">
                            <div class="ptp-setting-checkbox">
                                <input type="checkbox" id="enable-imdb-parental-guide">
                                <label for="enable-imdb-parental-guide">Enable IMDb parental guide filtering</label>
                            </div>
                            <div class="ptp-setting-description">Filter movies based on IMDb parental guide categories and severity levels (requires PTP IMDb Combined script AND parental guidance enabled).</div>
                        </div>
                        
                        <div class="ptp-setting-group">
                            <label class="ptp-setting-label">Parental guide categories and minimum severity levels:</label>
                            <div class="ptp-parental-guide-grid">
                                <div class="ptp-parental-guide-item">
                                    <div class="ptp-setting-checkbox">
                                        <input type="checkbox" id="category-sex-nudity" value="Sex & Nudity">
                                        <label for="category-sex-nudity">Sex & Nudity</label>
                                    </div>
                                    <select id="severity-sex-nudity" class="ptp-severity-dropdown">
                                        <option value="None">None+</option>
                                        <option value="Mild">Mild+</option>
                                        <option value="Moderate">Moderate+</option>
                                        <option value="Severe">Severe</option>
                                    </select>
                                </div>
                                <div class="ptp-parental-guide-item">
                                    <div class="ptp-setting-checkbox">
                                        <input type="checkbox" id="category-violence-gore" value="Violence & Gore">
                                        <label for="category-violence-gore">Violence & Gore</label>
                                    </div>
                                    <select id="severity-violence-gore" class="ptp-severity-dropdown">
                                        <option value="None">None+</option>
                                        <option value="Mild">Mild+</option>
                                        <option value="Moderate">Moderate+</option>
                                        <option value="Severe">Severe</option>
                                    </select>
                                </div>
                                <div class="ptp-parental-guide-item">
                                    <div class="ptp-setting-checkbox">
                                        <input type="checkbox" id="category-profanity" value="Profanity">
                                        <label for="category-profanity">Profanity</label>
                                    </div>
                                    <select id="severity-profanity" class="ptp-severity-dropdown">
                                        <option value="None">None+</option>
                                        <option value="Mild">Mild+</option>
                                        <option value="Moderate">Moderate+</option>
                                        <option value="Severe">Severe</option>
                                    </select>
                                </div>
                                <div class="ptp-parental-guide-item">
                                    <div class="ptp-setting-checkbox">
                                        <input type="checkbox" id="category-alcohol-drugs" value="Alcohol, Drugs & Smoking">
                                        <label for="category-alcohol-drugs">Alcohol, Drugs & Smoking</label>
                                    </div>
                                    <select id="severity-alcohol-drugs" class="ptp-severity-dropdown">
                                        <option value="None">None+</option>
                                        <option value="Mild">Mild+</option>
                                        <option value="Moderate">Moderate+</option>
                                        <option value="Severe">Severe</option>
                                    </select>
                                </div>
                                <div class="ptp-parental-guide-item">
                                    <div class="ptp-setting-checkbox">
                                        <input type="checkbox" id="category-frightening" value="Frightening & Intense Scenes">
                                        <label for="category-frightening">Frightening & Intense Scenes</label>
                                    </div>
                                    <select id="severity-frightening" class="ptp-severity-dropdown">
                                        <option value="None">None+</option>
                                        <option value="Mild">Mild+</option>
                                        <option value="Moderate">Moderate+</option>
                                        <option value="Severe">Severe</option>
                                    </select>
                                </div>
                            </div>
                            <div class="ptp-setting-description">Select categories to check and set minimum severity levels. Movies with content at or above the selected severity will be hidden. "None+" means any content in this category will trigger hiding.</div>
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
                            <div class="ptp-cache-stat">
                                <span>IMDb parental guide cache:</span>
                                <span class="ptp-cache-count" id="imdb-parental-guide-cache-count">0</span>
                            </div>
                        </div>
                        
                        <div class="ptp-button-group">
                            <button class="ptp-button ptp-button-secondary" id="view-hidden-cache-btn">View Hidden Cache</button>
                            <button class="ptp-button ptp-button-secondary" id="view-imdb-cache-btn">View IMDb Cache</button>
                            <button class="ptp-button ptp-button-secondary" id="view-imdb-parental-guide-cache-btn">View Parental Guide Cache</button>
                            <button class="ptp-button ptp-button-secondary" id="clean-outdated-cache-btn">Clean Outdated</button>
                            <button class="ptp-button ptp-button-danger" id="clear-hidden-cache-btn">Clear Hidden Cache</button>
                            <button class="ptp-button ptp-button-danger" id="clear-imdb-cache-btn">Clear IMDb Cache</button>
                            <button class="ptp-button ptp-button-danger" id="clear-imdb-parental-guide-cache-btn">Clear Parental Guide Cache</button>
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
        document.getElementById('collage-ids').value = COLLAGE_IDS_TO_HIDE;
        document.getElementById('delay-render').checked = DELAY_RENDER;
        document.getElementById('show-loading-spinner').checked = SHOW_LOADING_SPINNER;
        document.getElementById('final-fallback-timeout').value = FINAL_FALLBACK_TIMEOUT;
        document.getElementById('hide-torrent-pages').checked = HIDE_TORRENT_PAGES;
        document.getElementById('hide-torrent-pages-by-collage').checked = HIDE_TORRENT_PAGES_BY_COLLAGE;
        document.getElementById('enable-imdb-keywords').checked = ENABLE_IMDB_KEYWORD_CHECK;
        document.getElementById('imdb-keywords').value = IMDB_KEYWORDS_TO_HIDE;
        document.getElementById('enable-imdb-parental-guide').checked = ENABLE_IMDB_PARENTAL_GUIDE_CHECK;
        
        // Set parental guide category checkboxes and severity dropdowns
        const categories = imdbParentalGuideCategoriesArray;
        const severities = imdbParentalGuideSeveritiesArray;
        
        // Parse category-severity pairs from stored data
        // Format: "Sex & Nudity:Severe,Violence & Gore:Moderate" etc.
        const categorySettings = {};
        categories.forEach((category, index) => {
            const severity = severities[index] || 'Severe'; // Default to Severe if not specified
            categorySettings[category] = severity;
        });
        
        // Set checkboxes and dropdowns
        document.getElementById('category-sex-nudity').checked = categorySettings.hasOwnProperty('Sex & Nudity');
        document.getElementById('severity-sex-nudity').value = categorySettings['Sex & Nudity'] || 'Severe';
        
        document.getElementById('category-violence-gore').checked = categorySettings.hasOwnProperty('Violence & Gore');
        document.getElementById('severity-violence-gore').value = categorySettings['Violence & Gore'] || 'Severe';
        
        document.getElementById('category-profanity').checked = categorySettings.hasOwnProperty('Profanity');
        document.getElementById('severity-profanity').value = categorySettings['Profanity'] || 'Severe';
        
        document.getElementById('category-alcohol-drugs').checked = categorySettings.hasOwnProperty('Alcohol, Drugs & Smoking');
        document.getElementById('severity-alcohol-drugs').value = categorySettings['Alcohol, Drugs & Smoking'] || 'Severe';
        
        document.getElementById('category-frightening').checked = categorySettings.hasOwnProperty('Frightening & Intense Scenes');
        document.getElementById('severity-frightening').value = categorySettings['Frightening & Intense Scenes'] || 'Severe';
        
        // Update cache counts
        document.getElementById('hidden-cache-count').textContent = Object.keys(hiddenCache).length;
        document.getElementById('imdb-cache-count').textContent = Object.keys(imdbKeywordsCache).length;
        document.getElementById('imdb-parental-guide-cache-count').textContent = Object.keys(imdbParentalGuideCache).length;
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
        document.getElementById('view-imdb-parental-guide-cache-btn').addEventListener('click', viewIMDbParentalGuideCache);
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
        document.getElementById('clear-imdb-parental-guide-cache-btn').addEventListener('click', clearIMDbParentalGuideCacheButton);
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
        const newCollageIds = document.getElementById('collage-ids').value.trim();
        const newDelayRender = document.getElementById('delay-render').checked;
        const newShowLoadingSpinner = document.getElementById('show-loading-spinner').checked;
        const newFinalFallbackTimeout = parseInt(document.getElementById('final-fallback-timeout').value) || 3000;
        const newHideTorrentPages = document.getElementById('hide-torrent-pages').checked;
        const newHideTorrentPagesByCollage = document.getElementById('hide-torrent-pages-by-collage').checked;
        const newEnableIMDbKeywords = document.getElementById('enable-imdb-keywords').checked;
        const newIMDbKeywords = document.getElementById('imdb-keywords').value.trim();
        const newEnableIMDbParentalGuide = document.getElementById('enable-imdb-parental-guide').checked;
        // Get selected parental guide categories and their severity levels
        const selectedCategories = [];
        const selectedSeverities = [];
        
        if (document.getElementById('category-sex-nudity').checked) {
            selectedCategories.push('Sex & Nudity');
            selectedSeverities.push(document.getElementById('severity-sex-nudity').value);
        }
        if (document.getElementById('category-violence-gore').checked) {
            selectedCategories.push('Violence & Gore');
            selectedSeverities.push(document.getElementById('severity-violence-gore').value);
        }
        if (document.getElementById('category-profanity').checked) {
            selectedCategories.push('Profanity');
            selectedSeverities.push(document.getElementById('severity-profanity').value);
        }
        if (document.getElementById('category-alcohol-drugs').checked) {
            selectedCategories.push('Alcohol, Drugs & Smoking');
            selectedSeverities.push(document.getElementById('severity-alcohol-drugs').value);
        }
        if (document.getElementById('category-frightening').checked) {
            selectedCategories.push('Frightening & Intense Scenes');
            selectedSeverities.push(document.getElementById('severity-frightening').value);
        }
        
        const newIMDbParentalGuideCategories = selectedCategories.join(',');
        const newIMDbParentalGuideSeverities = selectedSeverities.join(',');

        // Save to GM storage
        GM_setValue('TAGS_TO_HIDE', newTagsToHide);
        GM_setValue('COLLAGE_IDS_TO_HIDE', newCollageIds);
        GM_setValue('DELAY_RENDER', newDelayRender);
        GM_setValue('SHOW_LOADING_SPINNER', newShowLoadingSpinner);
        GM_setValue('FINAL_FALLBACK_TIMEOUT', newFinalFallbackTimeout);
        GM_setValue('HIDE_TORRENT_PAGES', newHideTorrentPages);
        GM_setValue('HIDE_TORRENT_PAGES_BY_COLLAGE', newHideTorrentPagesByCollage);
        GM_setValue('ENABLE_IMDB_KEYWORD_CHECK', newEnableIMDbKeywords);
        GM_setValue('IMDB_KEYWORDS_TO_HIDE', newIMDbKeywords);
        GM_setValue('ENABLE_IMDB_PARENTAL_GUIDE_CHECK', newEnableIMDbParentalGuide);
        GM_setValue('IMDB_PARENTAL_GUIDE_CATEGORIES', newIMDbParentalGuideCategories);
        GM_setValue('IMDB_PARENTAL_GUIDE_SEVERITIES', newIMDbParentalGuideSeverities);

        // Update runtime variables
        TAGS_TO_HIDE = newTagsToHide;
        COLLAGE_IDS_TO_HIDE = newCollageIds;
        DELAY_RENDER = newDelayRender;
        SHOW_LOADING_SPINNER = newShowLoadingSpinner;
        FINAL_FALLBACK_TIMEOUT = newFinalFallbackTimeout;
        HIDE_TORRENT_PAGES = newHideTorrentPages;
        HIDE_TORRENT_PAGES_BY_COLLAGE = newHideTorrentPagesByCollage;
        ENABLE_IMDB_KEYWORD_CHECK = newEnableIMDbKeywords;
        IMDB_KEYWORDS_TO_HIDE = newIMDbKeywords;
        ENABLE_IMDB_PARENTAL_GUIDE_CHECK = newEnableIMDbParentalGuide;
        IMDB_PARENTAL_GUIDE_CATEGORIES = newIMDbParentalGuideCategories;
        IMDB_PARENTAL_GUIDE_SEVERITIES = newIMDbParentalGuideSeverities;

        // Update arrays
        tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
        collageIdsArray = COLLAGE_IDS_TO_HIDE.split(',').map(id => id.trim()).filter(id => id.length > 0);
        imdbKeywordsArray = IMDB_KEYWORDS_TO_HIDE.split(',').map(keyword => keyword.trim().toLowerCase()).filter(keyword => keyword.length > 0);
        imdbParentalGuideCategoriesArray = IMDB_PARENTAL_GUIDE_CATEGORIES.split(',').map(category => category.trim()).filter(category => category.length > 0);
        imdbParentalGuideSeveritiesArray = IMDB_PARENTAL_GUIDE_SEVERITIES.split(',').map(severity => severity.trim()).filter(severity => severity.length > 0);

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
        document.getElementById('collage-ids').value = '';
        document.getElementById('delay-render').checked = true;
        document.getElementById('show-loading-spinner').checked = false;
        document.getElementById('final-fallback-timeout').value = 3000;
        document.getElementById('hide-torrent-pages').checked = true;
        document.getElementById('hide-torrent-pages-by-collage').checked = true;
        document.getElementById('enable-imdb-keywords').checked = false;
        document.getElementById('imdb-keywords').value = 'masturbation';
        document.getElementById('enable-imdb-parental-guide').checked = false;
        
        // Reset parental guide settings to defaults
        document.getElementById('category-sex-nudity').checked = true;
        document.getElementById('severity-sex-nudity').value = 'Severe';
        document.getElementById('category-violence-gore').checked = true;
        document.getElementById('severity-violence-gore').value = 'Severe';
        document.getElementById('category-profanity').checked = false;
        document.getElementById('severity-profanity').value = 'Severe';
        document.getElementById('category-alcohol-drugs').checked = false;
        document.getElementById('severity-alcohol-drugs').value = 'Severe';
        document.getElementById('category-frightening').checked = false;
        document.getElementById('severity-frightening').value = 'Severe';
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

    function viewIMDbParentalGuideCache() {
        const cacheEntries = Object.entries(imdbParentalGuideCache);
        if (cacheEntries.length === 0) {
            alert('No IMDb parental guides currently in cache.');
            return;
        }

        const cacheList = cacheEntries.map(([imdbId, data]) => {
            const age = Math.round((Date.now() - data.cachedAt) / (1000 * 60 * 60));
            const categoryCount = data.parentalGuide.length;
            return `${imdbId}: ${categoryCount} categories (cached ${age}h ago)`;
        }).join('\n');

        alert(`IMDb Parental Guide Cache (${cacheEntries.length} entries):\n\n${cacheList}`);
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

    function clearIMDbParentalGuideCacheButton() {
        if (confirm(`Clear the IMDb parental guide cache?\n\nThis will remove ${Object.keys(imdbParentalGuideCache).length} cached entries. NOT RECOMMENDED unless you are experiencing issues.`)) {
            clearIMDbParentalGuideCache();
            document.getElementById('imdb-parental-guide-cache-count').textContent = '0';
            alert('IMDb parental guide cache cleared.');
        }
    }

    function clearAllCaches() {
        const hiddenCount = Object.keys(hiddenCache).length;
        const keywordsCount = Object.keys(imdbKeywordsCache).length;
        const parentalGuideCount = Object.keys(imdbParentalGuideCache).length;
        
        if (confirm(`Clear all caches?\n\nHidden movies: ${hiddenCount} entries\nIMDb keywords: ${keywordsCount} entries\nIMDb parental guides: ${parentalGuideCount} entries\n\nNOT RECOMMENDED unless you are experiencing issues.`)) {
            clearHiddenCache();
            clearIMDbKeywordsCache();
            clearIMDbParentalGuideCache();
            document.getElementById('hidden-cache-count').textContent = '0';
            document.getElementById('imdb-cache-count').textContent = '0';
            document.getElementById('imdb-parental-guide-cache-count').textContent = '0';
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
        console.log(`shouldHideCachedMovie: Checking cached movie with tags:`, cachedMovie.tags);
        console.log(`shouldHideCachedMovie: Current tagsArray:`, tagsArray);
        console.log(`shouldHideCachedMovie: Current imdbKeywordsArray:`, imdbKeywordsArray);
        console.log(`shouldHideCachedMovie: IMDb parental guide enabled: ${ENABLE_IMDB_PARENTAL_GUIDE_CHECK}`);
        console.log(`shouldHideCachedMovie: Current parental guide categories:`, imdbParentalGuideCategoriesArray);
        console.log(`shouldHideCachedMovie: Current parental guide severities:`, imdbParentalGuideSeveritiesArray);
        
        if (tagsArray.length === 0 && imdbKeywordsArray.length === 0 && !ENABLE_IMDB_PARENTAL_GUIDE_CHECK) {
            console.log(`shouldHideCachedMovie: No filtering criteria configured, returning false`);
            return false;
        }
        
        // Check if any of the cached movie's tags match current filtering criteria
        const shouldHide = cachedMovie.tags.some(tag => {
            const lowercaseTag = tag.toLowerCase();
            console.log(`shouldHideCachedMovie: Checking tag "${lowercaseTag}"`);
            
            // Check for IMDb parental guide tags
            if (lowercaseTag.startsWith('imdb:parental-guide:') && ENABLE_IMDB_PARENTAL_GUIDE_CHECK) {
                console.log(`shouldHideCachedMovie: Found parental guide tag "${lowercaseTag}"`);
                
                // Parse the parental guide tag format: imdb:parental-guide:category:severity
                const parts = lowercaseTag.split(':');
                if (parts.length >= 4) {
                    const category = parts[2].replace(/---/g, ' & ').replace(/-/g, ' ');
                    const severity = parts[3];
                    
                    console.log(`shouldHideCachedMovie: Parsed category "${category}", severity "${severity}"`);
                    
                    // Check if this category and severity combination matches current settings
                    const categoryIndex = imdbParentalGuideCategoriesArray.findIndex(cat => 
                        cat.toLowerCase().replace(/\s+/g, ' ').trim() === category.trim()
                    );
                    
                    if (categoryIndex >= 0) {
                        const requiredSeverity = imdbParentalGuideSeveritiesArray[categoryIndex] || 'Severe';
                        const severityLevels = ['none', 'mild', 'moderate', 'severe'];
                        const tagSeverityLevel = severityLevels.indexOf(severity.toLowerCase());
                        const requiredSeverityLevel = severityLevels.indexOf(requiredSeverity.toLowerCase());
                        
                        const matches = tagSeverityLevel >= requiredSeverityLevel;
                        console.log(`shouldHideCachedMovie: Category "${category}" found at index ${categoryIndex}, required: "${requiredSeverity}", tag: "${severity}", matches: ${matches}`);
                        return matches;
                    } else {
                        console.log(`shouldHideCachedMovie: Category "${category}" not in current filter settings`);
                    }
                }
                return false;
            }
            // Check for other IMDb tags (keywords)
            else if (lowercaseTag.startsWith('imdb:') && !lowercaseTag.startsWith('imdb:parental-guide')) {
                const imdbKeyword = lowercaseTag.replace('imdb:', '');
                const matches = imdbKeywordsArray.includes(imdbKeyword);
                console.log(`shouldHideCachedMovie: IMDb keyword "${imdbKeyword}" matches: ${matches}`);
                return matches;
            }
            // Check for regular PTP tags
            else {
                const matches = tagsArray.includes(lowercaseTag);
                console.log(`shouldHideCachedMovie: PTP tag "${lowercaseTag}" matches: ${matches}`);
                return matches;
            }
        });
        
        console.log(`shouldHideCachedMovie: Final result: ${shouldHide}`);
        return shouldHide;
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

    // Function to add IMDb parental guide to cache
    function addToIMDbParentalGuideCache(imdbId, parentalGuide, timestamp = Date.now()) {
        imdbParentalGuideCache[imdbId] = {
            parentalGuide: parentalGuide,
            cachedAt: timestamp,
            lastChecked: timestamp
        };
        
        // Save to GM storage
        GM_setValue('IMDB_PARENTAL_GUIDE_CACHE', JSON.stringify(imdbParentalGuideCache));
        console.log(`Added IMDb parental guide to cache: ${imdbId} - Categories: ${parentalGuide.length}`);
    }

    // Function to check if cached IMDb parental guide is still valid (not expired)
    function isIMDbParentalGuideCacheValid(imdbId, maxAgeHours = 24) {
        if (!imdbParentalGuideCache.hasOwnProperty(imdbId)) {
            return false;
        }
        
        const cached = imdbParentalGuideCache[imdbId];
        const ageInHours = (Date.now() - cached.cachedAt) / (1000 * 60 * 60);
        
        return ageInHours < maxAgeHours;
    }

    // Function to get cached IMDb parental guide
    function getCachedIMDbParentalGuide(imdbId) {
        if (!isIMDbParentalGuideCacheValid(imdbId)) {
            return null;
        }
        
        return imdbParentalGuideCache[imdbId].parentalGuide;
    }

    // Function to clean expired IMDb parental guide cache
    function cleanIMDbParentalGuideCache(maxAgeHours = 24) {
        let cleanedCount = 0;
        const originalCacheSize = Object.keys(imdbParentalGuideCache).length;
        const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
        
        Object.keys(imdbParentalGuideCache).forEach(imdbId => {
            if (imdbParentalGuideCache[imdbId].cachedAt < cutoffTime) {
                delete imdbParentalGuideCache[imdbId];
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            GM_setValue('IMDB_PARENTAL_GUIDE_CACHE', JSON.stringify(imdbParentalGuideCache));
            console.log(`Cleaned ${cleanedCount} expired IMDb parental guide entries from cache (${originalCacheSize} -> ${Object.keys(imdbParentalGuideCache).length})`);
        }
        
        return cleanedCount;
    }

    // Function to clear IMDb parental guide cache
    function clearIMDbParentalGuideCache() {
        imdbParentalGuideCache = {};
        GM_setValue('IMDB_PARENTAL_GUIDE_CACHE', '{}');
        console.log('IMDb parental guide cache cleared');
    }

    // Function to check if parental guide categories/severities match filter
    function checkParentalGuideMatch(parentalGuide) {
        if (!parentalGuide || !Array.isArray(parentalGuide)) {
            return null;
        }

        // Create severity hierarchy for comparison
        const severityLevels = ['None', 'Mild', 'Moderate', 'Severe'];
        
        // Create category-severity mapping from current settings
        const categorySettings = {};
        imdbParentalGuideCategoriesArray.forEach((category, index) => {
            const severity = imdbParentalGuideSeveritiesArray[index] || 'Severe';
            categorySettings[category] = severity;
        });

        const matches = [];

        for (const category of parentalGuide) {
            const categoryName = category.category?.text;
            const severityLevel = category.severity?.text;

            if (!categoryName || !severityLevel) {
                continue;
            }

            // Check each configured category
            for (const [filterCategory, thresholdSeverity] of Object.entries(categorySettings)) {
                // Check if category matches (case-insensitive partial match)
                if (categoryName.toLowerCase().includes(filterCategory.toLowerCase()) || 
                    filterCategory.toLowerCase().includes(categoryName.toLowerCase())) {
                    
                    // Get severity level indices for comparison
                    const currentSeverityIndex = severityLevels.indexOf(severityLevel);
                    const thresholdSeverityIndex = severityLevels.indexOf(thresholdSeverity);
                    
                    // If current severity is at or above threshold, it's a match
                    if (currentSeverityIndex >= thresholdSeverityIndex && currentSeverityIndex !== -1) {
                        console.log(`Parental guide match found: ${categoryName} - ${severityLevel} (threshold: ${thresholdSeverity})`);
                        matches.push({
                            category: categoryName,
                            severity: severityLevel,
                            threshold: thresholdSeverity
                        });
                    }
                }
            }
        }

        return matches.length > 0 ? matches : null;
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
        
        // Check IMDb data (keywords and parental guide) if enabled (regardless of PTP tag matches)
        let imdbMatchedKeywords = [];
        let imdbMatchedParentalGuide = false;
        let shouldHideByImdb = false;
        
        if ((ENABLE_IMDB_KEYWORD_CHECK || ENABLE_IMDB_PARENTAL_GUIDE_CHECK) && imdbId) {
            // For torrent pages, we need to handle this asynchronously
            checkIMDbData(imdbId, title, year).then(imdbData => {
                let hideTags = [];
                
                // Handle keyword matches
                if (imdbData.keywords && imdbData.keywords.matched) {
                    imdbMatchedKeywords = imdbData.keywords.matched.map(k => `imdb:${k}`);
                    hideTags = hideTags.concat(imdbMatchedKeywords);
                    shouldHideByImdb = true;
                    console.log(`Found torrent page with IMDb keyword matches: ${title} (${year}) - GroupId: ${groupId} - IMDB: ${imdbId} - Matched keywords: ${imdbData.keywords.matched.join(', ')}`);
                }
                
                // Handle parental guide matches
                if (imdbData.parentalGuide && imdbData.parentalGuide.matched) {
                    imdbMatchedParentalGuide = true;
                    
                    // Create detailed tags for each parental guide match
                    imdbData.parentalGuide.matched.forEach(match => {
                        // Create tags in format: imdb:parental-guide:Category:Severity
                        const categoryTag = match.category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                        const detailedTag = `imdb:parental-guide:${categoryTag}:${match.severity.toLowerCase()}`;
                        hideTags.push(detailedTag);
                    });
                    
                    // Also add the general parental guide tag for backward compatibility
                    hideTags.push('imdb:parental-guide');
                    shouldHideByImdb = true;
                    
                    const matchSummary = imdbData.parentalGuide.matched.map(m => `${m.category}:${m.severity}`).join(', ');
                    console.log(`Found torrent page with IMDb parental guide matches: ${title} (${year}) - GroupId: ${groupId} - IMDB: ${imdbId} - Matches: ${matchSummary}`);
                }
                
                if (shouldHideByImdb) {
                    // If we should hide by IMDb and the page isn't already hidden by PTP tags
                    if (ptpMatchedTags.length === 0) {
                        // Add to cache with IMDb tags
                        addToHiddenCache(groupId, title, year, hideTags, imdbId);
                        
                        // Hide the torrent page if the option is enabled
                        if (HIDE_TORRENT_PAGES) {
                            hideTorrentPageContent(title, year, hideTags);
                            console.log('Torrent page content replaced by IMDb keywords, showing page');
                            showPage();
                        }
                    } else {
                        // Both PTP and IMDb matched, update cache with combined tags
                        const combinedTags = [...ptpMatchedTags, ...hideTags];
                        addToHiddenCache(groupId, title, year, combinedTags, imdbId);
                    }
                }
            }).catch(error => {
                console.log(`Error checking IMDb data for ${title} (${year}): ${error.message}`);
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

    // checkIMDbData function that handles both keywords and parental guide
    async function checkIMDbData(imdbId, title, year) {
        const results = { keywords: null, parentalGuide: null };
        
        if (!imdbId) return results;
        
        // Check if either feature is enabled
        const keywordsEnabled = ENABLE_IMDB_KEYWORD_CHECK && imdbKeywordsArray.length > 0;
        const parentalGuideEnabled = ENABLE_IMDB_PARENTAL_GUIDE_CHECK && 
            (imdbParentalGuideCategoriesArray.length > 0 || imdbParentalGuideSeveritiesArray.length > 0);
        
        if (!keywordsEnabled && !parentalGuideEnabled) {
            return results;
        }
        
        try {
            // Check caches first
            if (keywordsEnabled) {
                const cachedKeywords = getCachedIMDbKeywords(imdbId);
                if (cachedKeywords) {
                    console.log(`Using cached IMDb keywords for ${title} (${imdbId}):`, cachedKeywords);
                    const matchedKeywords = cachedKeywords.filter(keyword => 
                        imdbKeywordsArray.includes(keyword.toLowerCase())
                    );
                    if (matchedKeywords.length > 0) {
                        console.log(`Found cached IMDb keyword matches for ${title}: ${matchedKeywords.join(', ')}`);
                        results.keywords = { matched: matchedKeywords, source: 'cache' };
                    }
                }
            }
            
            if (parentalGuideEnabled) {
                const cachedParentalGuide = getCachedIMDbParentalGuide(imdbId);
                if (cachedParentalGuide) {
                    console.log(`Using cached IMDb parental guide for ${title} (${imdbId}):`, cachedParentalGuide);
                    const parentalGuideMatches = checkParentalGuideMatch(cachedParentalGuide);
                    if (parentalGuideMatches) {
                        console.log(`Found cached IMDb parental guide matches for ${title}:`, parentalGuideMatches);
                        results.parentalGuide = { matched: parentalGuideMatches, source: 'cache' };
                    }
                }
            }
            
            // If we have cache hits for all enabled features, return early
            if ((!keywordsEnabled || results.keywords) && (!parentalGuideEnabled || results.parentalGuide)) {
                return results;
            }
            
            // Need to fetch fresh data
            return await fetchIMDbData(imdbId, title, year, keywordsEnabled, parentalGuideEnabled);
            
        } catch (error) {
            console.error(`Error checking IMDb data for ${title} (${imdbId}):`, error);
            return results;
        }
    }
    
    // Fetch fresh IMDb data from the external script
    async function fetchIMDbData(imdbId, title, year, checkKeywords, checkParentalGuide) {
        const results = { keywords: null, parentalGuide: null };
        
        try {
            // Wait for IMDb script availability
            if (imdbScriptAvailable === null) {
                console.log(`checkIMDbData: Checking if IMDb Combined script is available for ${imdbId}...`);
                await waitForIMDbScript(5000);
            }
            
            if (imdbScriptAvailable === false) {
                console.log(`checkIMDbData: IMDb Combined script not available for ${imdbId}, skipping`);
                return results;
            }
            
            // Request data from IMDb Combined script
            const requestId = Date.now() + '_' + Math.random();
            console.log(`checkIMDbData: Sending IMDb data request for ${imdbId} with requestId: ${requestId}`);
            
            const response = await new Promise((resolve, reject) => {
                const responseHandler = (event) => {
                    console.log(`checkIMDbData received imdbDataResponse event:`, event.detail);
                    
                    if (event.detail.requestId === requestId) {
                        console.log(`checkIMDbData: This response matches our requestId: ${requestId}`);
                        document.removeEventListener('imdbDataResponse', responseHandler);
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        resolve(event.detail);
                    } else {
                        console.log(`checkIMDbData: Response requestId ${event.detail.requestId} doesn't match our requestId ${requestId}`);
                    }
                };
                
                document.addEventListener('imdbDataResponse', responseHandler);
                
                document.dispatchEvent(new CustomEvent('requestIMDbData', {
                    detail: {
                        imdbId: imdbId,
                        requestId: requestId
                    }
                }));
                
                const timeoutId = setTimeout(() => {
                    document.removeEventListener('imdbDataResponse', responseHandler);
                    console.warn(`checkIMDbData: IMDb data request timeout for ${imdbId} (requestId: ${requestId})`);
                    reject(new Error('IMDb data request timeout'));
                }, 10000);
            });
            
            if (response.found && response.data && response.data.data && response.data.data.title) {
                const titleData = response.data.data.title;
                
                // Process keywords if enabled
                if (checkKeywords && titleData.keywords && titleData.keywords.edges) {
                    const keywords = titleData.keywords.edges
                        .map(edge => edge.node ? edge.node.legacyId : null)
                        .filter(Boolean);
                    
                    console.log(`checkIMDbData: Found ${keywords.length} keywords for ${title} (${imdbId})`);
                    
                    // Cache the keywords
                    addToIMDbKeywordsCache(imdbId, keywords);
                    
                    // Check for matches
                    const matchedKeywords = keywords.filter(keyword => 
                        imdbKeywordsArray.includes(keyword.toLowerCase())
                    );
                    
                    if (matchedKeywords.length > 0) {
                        console.log(`Found IMDb keyword matches for ${title}: ${matchedKeywords.join(', ')}`);
                        results.keywords = { matched: matchedKeywords, source: 'fresh' };
                    }
                }
                
                // Process parental guide if enabled
                if (checkParentalGuide && titleData.parentsGuide && titleData.parentsGuide.categories) {
                    const parentalGuide = titleData.parentsGuide.categories;
                    
                    console.log(`checkIMDbData: Found parental guide for ${title} (${imdbId}) with ${parentalGuide.length} categories`);
                    
                    // Cache the parental guide
                    addToIMDbParentalGuideCache(imdbId, parentalGuide);
                    
                    // Check for matches
                    const parentalGuideMatches = checkParentalGuideMatch(parentalGuide);
                    if (parentalGuideMatches) {
                        console.log(`Found IMDb parental guide matches for ${title}:`, parentalGuideMatches);
                        results.parentalGuide = { matched: parentalGuideMatches, source: 'fresh' };
                    }
                }
            } else {
                console.log(`checkIMDbData: No valid data found for ${imdbId}`);
            }
            
        } catch (error) {
            console.error(`Error fetching IMDb data for ${title} (${imdbId}):`, error);
        }
        
        return results;
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
        
        // Check if we're on a specific collage page vs collages list page
        const isSpecificCollagePage = window.location.search.includes('id=');
        console.log('Is specific collage page:', isSpecificCollagePage);
        
        if (isSpecificCollagePage) {
            console.log('On specific collage page - checking if entire collage should be hidden');
            
            // First check if the entire collage should be hidden
            const isCollageHidden = handleHiddenCollagePage();
            
            if (isCollageHidden) {
                console.log('Entire collage is hidden - skipping individual movie processing');
                return;
            }
            
            console.log('Collage is not hidden - entries will be processed by processCoverViewJsonData');
            return; // Let processCoverViewJsonData handle the movie entries
        }
        
        // Find all collage rows in the main table (not torrent_table) - for collages list page
        const collageRows = document.querySelectorAll('table tbody tr');
        console.log(`Found ${collageRows.length} total table rows to check`);
        
        let processedCount = 0;
        
        collageRows.forEach((row, index) => {
            console.log(`Checking row ${index + 1}:`, row.innerHTML.substring(0, 200) + '...');
            
            // Look for collage link to get ID
            const collageLink = row.querySelector('a[href*="collages.php?id="]');
            if (!collageLink) {
                console.log(`Row ${index + 1}: No collage link found`);
                return;
            }
            
            processedCount++;
            console.log(`Row ${index + 1}: Found collage link:`, collageLink.href);
            
            const href = collageLink.getAttribute('href');
            const collageIdMatch = href.match(/collages\.php\?id=(\d+)/);
            if (!collageIdMatch) {
                console.log(`Row ${index + 1}: No collage ID match in href:`, href);
                return;
            }
            
            const collageId = collageIdMatch[1];
            const collageTitle = collageLink.textContent.trim();
            console.log(`Row ${index + 1}: Processing collage "${collageTitle}" (ID: ${collageId})`);
            
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
            
            // Check if this collage ID should be hidden
            let shouldHide = false;
            let hideReason = '';
            let matchedTags = [];
            
            if (collageIdsArray.includes(collageId)) {
                shouldHide = true;
                hideReason = 'Collage ID';
                console.log(`Hiding collage "${collageTitle}" (ID: ${collageId}) - Matched collage ID filter`);
            } else {
                // Check if any tags match our filter
                matchedTags = collageTags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                
                if (matchedTags.length > 0) {
                    shouldHide = true;
                    hideReason = 'Tags';
                    console.log(`Hiding collage "${collageTitle}" (ID: ${collageId}) - Matched tags: ${matchedTags.join(', ')}`);
                }
            }
            
            if (shouldHide) {
                // Hide the entire row
                row.style.display = 'none';
                
                // Add to cache using collage ID (prefix with 'collage_' to distinguish from group IDs)
                addToHiddenCache(`collage_${collageId}`, collageTitle, '', matchedTags, hideReason);
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

    // Function to process coverViewJsonData on collage pages
    function processCoverViewJsonData(retryCount = 0) {
        console.log(`Processing coverViewJsonData on collage page... (attempt ${retryCount + 1})`);
        
        // Look for the script tag containing coverViewJsonData within the main content div
        const contentDiv = document.querySelector('#content.page__main-content');
        const scripts = contentDiv ? contentDiv.querySelectorAll('script') : document.querySelectorAll('script');
        let coverViewData = null;
        let foundScript = false;
        
        console.log(`Searching in ${scripts.length} script tags${contentDiv ? ' within #content div' : ' in entire document'}`);
        
        for (const script of scripts) {
            const scriptContent = script.textContent || script.innerHTML;
            if (scriptContent.includes('coverViewJsonData')) {
                console.log('Found coverViewJsonData script, content preview:', scriptContent.substring(0, 200) + '...');
                foundScript = true;
                
                // Try multiple patterns to extract the JSON data - order matters!
                const patterns = [
                    /coverViewJsonData\[\s*(\d+)\s*\]\s*=\s*(\{.*?\});/s,  // Array index format: coverViewJsonData[0] = {...} - try this FIRST
                    /coverViewJsonData\s*=\s*(\[.*?\]);/s,  // Array format: coverViewJsonData = [...]
                    /coverViewJsonData\s*=\s*(\{.*?\});/s    // Object format: coverViewJsonData = {...}
                ];
                
                for (const pattern of patterns) {
                    console.log('Trying pattern:', pattern.toString());
                    const jsonMatch = scriptContent.match(pattern);
                    if (jsonMatch) {
                        console.log('Pattern matched, groups:', jsonMatch.length);
                        try {
                            let jsonData;
                            
                            // Check if this is the array index format by looking at the pattern
                            if (pattern.toString().includes('\\d+') && jsonMatch.length > 2 && jsonMatch[2]) {
                                // Array index format: coverViewJsonData[0] = {...}
                                jsonData = jsonMatch[2]; // The object part (second capture group)
                                console.log('Using array index format, parsing object:', jsonData.substring(0, 100) + '...');
                                coverViewData = JSON.parse(jsonData);
                            } else {
                                // Standard formats
                                jsonData = jsonMatch[1]; // The main capture group
                                console.log('Using standard format, parsing data:', jsonData.substring(0, 100) + '...');
                                
                                // Handle array format - extract first element if it's an array
                                if (jsonData.startsWith('[')) {
                                    const arrayData = JSON.parse(jsonData);
                                    if (arrayData.length > 0) {
                                        coverViewData = arrayData[0];
                                    } else {
                                        console.log('Array format found but array is empty');
                                        coverViewData = null;
                                    }
                                } else {
                                    coverViewData = JSON.parse(jsonData);
                                }
                            }
                            
                            console.log('Successfully parsed coverViewJsonData:', coverViewData ? 'Valid data found' : 'Data is null');
                            if (coverViewData && coverViewData.Movies) {
                                console.log(`Found ${coverViewData.Movies.length} movies in parsed data`);
                            }
                            break;
                        } catch (error) {
                            console.error('Error parsing coverViewJsonData with pattern:', pattern, 'Error:', error);
                            console.error('JSON data that failed to parse:', jsonMatch[1] ? jsonMatch[1].substring(0, 200) : 'undefined');
                        }
                    } else {
                        console.log('Pattern did not match');
                    }
                }
                break;
            }
        }
        
        // If no script found and we haven't retried much, wait and try again
        if (!foundScript && retryCount < 5) {
            console.log(`No coverViewJsonData script found, retrying in ${(retryCount + 1) * 200}ms...`);
            setTimeout(() => {
                processCoverViewJsonData(retryCount + 1);
            }, (retryCount + 1) * 200);
            return;
        }
        
        // If script found but no valid data and we haven't retried much, try again
        if (foundScript && (!coverViewData || !coverViewData.Movies) && retryCount < 3) {
            console.log(`Found script but no valid data, retrying in ${(retryCount + 1) * 300}ms...`);
            setTimeout(() => {
                processCoverViewJsonData(retryCount + 1);
            }, (retryCount + 1) * 300);
            return;
        }
        
        if (!coverViewData || !coverViewData.Movies) {
            console.log('No coverViewJsonData or Movies array found after all retries');
            return;
        }
        
        console.log(`Found ${coverViewData.Movies.length} movies in coverViewJsonData`);
        
        // Debug: Log some DOM structure info
        const allMovieLinks = document.querySelectorAll('a[href*="torrents.php?id="]');
        console.log(`Total movie links found in DOM: ${allMovieLinks.length}`);
        if (allMovieLinks.length > 0) {
            console.log('Sample movie links:');
            Array.from(allMovieLinks).slice(0, 5).forEach((link, i) => {
                console.log(`  ${i + 1}: ${link.href} - "${link.textContent.trim().substring(0, 50)}..."`);
            });
        }
        
        // Keep track of processed Group IDs to avoid duplicates
        const processedGroupIds = new Set();
        
        // Process each movie in the Movies array
        coverViewData.Movies.forEach((movie, index) => {
            if (!movie.GroupId) return;
            
            const groupId = movie.GroupId.toString();
            const title = movie.Title || 'Unknown Title';
            const year = movie.Year || '';
            
            // Skip if we've already processed this Group ID
            if (processedGroupIds.has(groupId)) {
                console.log(`Skipping already processed Group ID: ${groupId} - ${title}`);
                return;
            }
            processedGroupIds.add(groupId);
            
            console.log(`Processing movie from coverViewJsonData: ${title} (${year}) - Group ID: ${groupId}`);
            
            // Check if this movie is in the hidden cache and should be hidden
            console.log(`Checking if Group ID ${groupId} is in hidden cache...`);
            console.log(`Cache contains: ${Object.keys(hiddenCache).join(', ')}`);
            const isInCache = hiddenCache.hasOwnProperty(groupId);
            const isValid = isInCache ? isInHiddenCacheAndValid(groupId) : false;
            console.log(`Group ID ${groupId} - In cache: ${isInCache}, Valid: ${isValid}`);
            if (isInCache) {
                console.log(`Cached movie data for ${groupId}:`, hiddenCache[groupId]);
            }
            if (isInHiddenCacheAndValid(groupId)) {
                const cachedMovie = hiddenCache[groupId];
                console.log(`Movie ${title} (Group ID: ${groupId}) found in hidden cache - should be hidden`);
                console.log(`Cached movie tags:`, cachedMovie.tags);
                
                // Find and hide all rows for this movie group
                // On collage pages, movies are in basic-movie-list format
                let hiddenRowCount = 0;
                
                // Find the main movie details row
                const movieLinks = document.querySelectorAll(`a[href="torrents.php?id=${groupId}"]`);
                console.log(`Found ${movieLinks.length} movie links for Group ID ${groupId}`);
                
                if (movieLinks.length === 0) {
                    // Try alternative selectors
                    const altLinks = document.querySelectorAll(`a[href*="torrents.php?id=${groupId}"]`);
                    console.log(`Alternative search found ${altLinks.length} links for Group ID ${groupId}`);
                    altLinks.forEach((link, i) => {
                        console.log(`Alt link ${i + 1}:`, link.href);
                    });
                }
                
                movieLinks.forEach((link, linkIndex) => {
                    console.log(`Processing movie link ${linkIndex + 1} for ${title}:`, link.href);
                    // Find the main details row for this movie
                    const detailsRow = link.closest('tr.basic-movie-list__details-row');
                    if (detailsRow && !detailsRow.hasAttribute('data-cover-view-hidden')) {
                        // Get the rowspan value to know how many rows belong to this movie
                        const rowspanCell = detailsRow.querySelector('.js-basic-movie-list__rowspan');
                        let rowspan = 1;
                        
                        if (rowspanCell) {
                            rowspan = parseInt(rowspanCell.getAttribute('rowspan') || rowspanCell.getAttribute('data-rowspan') || '1');
                        }
                        
                        console.log(`Found movie ${title} with ${rowspan} rows to hide`);
                        
                        // Hide the main details row
                        detailsRow.style.display = 'none';
                        detailsRow.setAttribute('data-cover-view-hidden', 'true');
                        detailsRow.setAttribute('data-group-id', groupId);
                        detailsRow.setAttribute('data-hidden-reason', cachedMovie.tags ? cachedMovie.tags.join(', ') : 'cached');
                        hiddenRowCount++;
                        
                        // Hide all subsequent rows that belong to this movie (torrent rows)
                        let currentRow = detailsRow.nextElementSibling;
                        let remainingRows = rowspan - 1; // -1 because we already hid the main row
                        
                        while (currentRow && remainingRows > 0) {
                            currentRow.style.display = 'none';
                            currentRow.setAttribute('data-cover-view-hidden', 'true');
                            currentRow.setAttribute('data-group-id', groupId);
                            currentRow.setAttribute('data-hidden-reason', cachedMovie.tags ? cachedMovie.tags.join(', ') : 'cached');
                            
                            hiddenRowCount++;
                            remainingRows--;
                            currentRow = currentRow.nextElementSibling;
                        }
                        
                        console.log(`Hidden ${hiddenRowCount} rows for ${title} (Group ID: ${groupId}) - Tags: ${cachedMovie.tags ? cachedMovie.tags.join(', ') : 'none'}`);
                    }
                });
                
                if (movieLinks.length === 0) {
                    console.log(`No movie links found for Group ID ${groupId} - ${title}`);
                }
            } else {
                // Movie not in cache, check if it should be hidden based on current tag filters
                const movieTags = movie.Tags || [];
                const matchedTags = movieTags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                
                if (matchedTags.length > 0) {
                    console.log(`Movie ${title} (Group ID: ${groupId}) matches current tag filters: ${matchedTags.join(', ')}`);
                    
                    // Add to cache for future reference
                    addToHiddenCache(groupId, title, year, matchedTags, movie.ImdbId || null);
                    
                    // Find and hide all rows for this movie group (same logic as cached movies)
                    let hiddenRowCount = 0;
                    
                    // Find the main movie details row
                    const movieLinks = document.querySelectorAll(`a[href="torrents.php?id=${groupId}"]`);
                    console.log(`Found ${movieLinks.length} movie links for Group ID ${groupId} (tag match)`);
                    
                    if (movieLinks.length === 0) {
                        // Try alternative selectors
                        const altLinks = document.querySelectorAll(`a[href*="torrents.php?id=${groupId}"]`);
                        console.log(`Alternative search found ${altLinks.length} links for Group ID ${groupId} (tag match)`);
                        altLinks.forEach((link, i) => {
                            console.log(`Alt link ${i + 1} (tag match):`, link.href);
                        });
                    }
                    
                    movieLinks.forEach((link, linkIndex) => {
                        console.log(`Processing movie link ${linkIndex + 1} for ${title} (tag match):`, link.href);
                        // Find the main details row for this movie
                        const detailsRow = link.closest('tr.basic-movie-list__details-row');
                        if (detailsRow && !detailsRow.hasAttribute('data-cover-view-hidden')) {
                            // Get the rowspan value to know how many rows belong to this movie
                            const rowspanCell = detailsRow.querySelector('.js-basic-movie-list__rowspan');
                            let rowspan = 1;
                            
                            if (rowspanCell) {
                                rowspan = parseInt(rowspanCell.getAttribute('rowspan') || rowspanCell.getAttribute('data-rowspan') || '1');
                            }
                            
                            console.log(`Found movie ${title} with ${rowspan} rows to hide (matched tags)`);
                            
                            // Hide the main details row
                            detailsRow.style.display = 'none';
                            detailsRow.setAttribute('data-cover-view-hidden', 'true');
                            detailsRow.setAttribute('data-group-id', groupId);
                            detailsRow.setAttribute('data-hidden-reason', matchedTags.join(', '));
                            hiddenRowCount++;
                            
                            // Hide all subsequent rows that belong to this movie (torrent rows)
                            let currentRow = detailsRow.nextElementSibling;
                            let remainingRows = rowspan - 1; // -1 because we already hid the main row
                            
                            while (currentRow && remainingRows > 0) {
                                currentRow.style.display = 'none';
                                currentRow.setAttribute('data-cover-view-hidden', 'true');
                                currentRow.setAttribute('data-group-id', groupId);
                                currentRow.setAttribute('data-hidden-reason', matchedTags.join(', '));
                                
                                hiddenRowCount++;
                                remainingRows--;
                                currentRow = currentRow.nextElementSibling;
                            }
                            
                            console.log(`Hidden ${hiddenRowCount} rows for ${title} (Group ID: ${groupId}) - Matched tags: ${matchedTags.join(', ')}`);
                        }
                    });
                    
                    if (movieLinks.length === 0) {
                        console.log(`No movie links found for Group ID ${groupId} - ${title} (tag match)`);
                    }
                }
            }
        });
    }
    
    // Function to process sidebar movie list on collage pages
    function processSidebarMovieList() {
        console.log('Processing sidebar movie list...');
        
        // Find the sidebar movie list
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            console.log('No sidebar found');
            return;
        }
        
        const movieList = sidebar.querySelector('#collection_movielist .list');
        if (!movieList) {
            console.log('No movie list found in sidebar');
            return;
        }
        
        const movieItems = movieList.querySelectorAll('li[name="torrent"]');
        console.log(`Found ${movieItems.length} movies in sidebar list`);
        
        let hiddenCount = 0;
        
        movieItems.forEach((item, index) => {
            const movieLink = item.querySelector('a[href*="torrents.php?id="]');
            if (!movieLink) return;
            
            const href = movieLink.getAttribute('href');
            const groupIdMatch = href.match(/torrents\.php\?id=(\d+)/);
            if (!groupIdMatch) return;
            
            const groupId = groupIdMatch[1];
            const title = movieLink.textContent.trim();
            
            console.log(`Checking sidebar movie: ${title} (Group ID: ${groupId})`);
            
            // Check if this movie should be hidden based on cache or current filters
            let shouldHide = false;
            let hideReason = '';
            
            // First check cache
            if (isInHiddenCacheAndValid(groupId)) {
                const cachedMovie = hiddenCache[groupId];
                shouldHide = true;
                hideReason = `Cached: ${cachedMovie.tags ? cachedMovie.tags.join(', ') : 'unknown'}`;
                console.log(`Sidebar movie ${title} (Group ID: ${groupId}) found in cache - hiding`);
            }
            
            if (shouldHide) {
                // Hide the list item
                item.style.display = 'none';
                item.setAttribute('data-sidebar-hidden', 'true');
                item.setAttribute('data-group-id', groupId);
                item.setAttribute('data-hidden-reason', hideReason);
                
                hiddenCount++;
                console.log(`Hidden sidebar movie: ${title} (Group ID: ${groupId}) - Reason: ${hideReason}`);
            }
        });
        
        console.log(`Hidden ${hiddenCount} movies from sidebar list`);
        
        // Add a summary if movies were hidden
        if (hiddenCount > 0) {
            const existingSummary = movieList.querySelector('.ptp-hidden-summary');
            if (!existingSummary) {
                const summary = document.createElement('li');
                summary.className = 'ptp-hidden-summary';
                summary.style.cssText = `
                    color: #666;
                    font-style: italic;
                    font-size: 0.9em;
                    padding: 5px 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    margin-top: 10px;
                `;
                summary.innerHTML = `<span>🚫 ${hiddenCount} movie${hiddenCount > 1 ? 's' : ''} hidden by filters</span>`;
                movieList.appendChild(summary);
            }
        }
    }
    
    // Function to check if current collage is hidden and handle page content
    function handleHiddenCollagePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const collageId = urlParams.get('id');
        
        if (!collageId) {
            console.log('No collage ID found for hidden collage check');
            return false;
        }
        
        const isCollageHidden = collageIdsArray.includes(collageId);
        console.log(`Collage ${collageId} is ${isCollageHidden ? 'hidden' : 'not hidden'}`);
        
        if (isCollageHidden) {
            console.log(`Hiding main content for collage ${collageId}`);
            
            // Hide the main content areas but keep the header/linkbox visible
            const sidebar = document.querySelector('.sidebar');
            const mainColumn = document.querySelector('.main-column');
            
            if (sidebar) {
                sidebar.style.display = 'none';
                console.log('Hidden sidebar');
            }
            
            if (mainColumn) {
                mainColumn.style.display = 'none';
                console.log('Hidden main column');
            }
            
            // Ensure the linkbox/header area remains visible for the unhide button
            const linkbox = document.querySelector('.linkbox');
            const header = document.querySelector('.header, .thin h2, .box_title');
            
            if (linkbox) {
                linkbox.style.display = '';
                console.log('Ensured linkbox remains visible');
            }
            
            if (header) {
                header.style.display = '';
                console.log('Ensured header remains visible');
            }
            
            // Create a replacement message
            const container = sidebar?.parentNode || mainColumn?.parentNode || document.querySelector('.thin');
            if (container) {
                const hiddenMessage = document.createElement('div');
                hiddenMessage.className = 'ptp-hidden-collage-message';
                hiddenMessage.style.cssText = `
                    text-align: center;
                    padding: 50px 20px;
                    color: #666;
                    font-size: 18px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;
                
                hiddenMessage.innerHTML = `
                    <div style="background: rgba(0, 0, 0, 0.1); padding: 30px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); display: inline-block;">
                        <div style="font-size: 24px; margin-bottom: 15px; font-weight: bold;">🚫 Hidden Collage</div>
                        <div style="font-size: 16px; color: #888; margin-bottom: 10px;">
                            This collage is hidden by your filter settings.
                        </div>
                        <div style="font-size: 14px; color: #aaa;">
                            Collage ID: ${collageId}
                        </div>
                        <div style="font-size: 12px; color: #999; margin-top: 20px;">
                            Use the "Unhide this collage" button to remove it from your filter list.
                        </div>
                    </div>
                `;
                
                // Insert the message where the content was
                if (sidebar) {
                    container.insertBefore(hiddenMessage, sidebar);
                } else if (mainColumn) {
                    container.insertBefore(hiddenMessage, mainColumn);
                } else {
                    container.appendChild(hiddenMessage);
                }
                
                console.log('Added hidden collage message');
            }
        }
        
        return isCollageHidden;
    }
    
    // Function to add "Hide/Unhide this collage" button to collage linkbox
    function addCollageFilterButton() {
        console.log('Adding collage filter button to linkbox...');
        
        // Find the linkbox
        const linkbox = document.querySelector('.linkbox');
        if (!linkbox) {
            console.log('No linkbox found on this page');
            return;
        }
        
        // Extract collage ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const collageId = urlParams.get('id');
        
        if (!collageId) {
            console.log('No collage ID found in URL');
            return;
        }
        
        // Check if button already exists
        if (linkbox.querySelector('.ptp-add-collage-filter')) {
            console.log('Collage filter button already exists');
            return;
        }
        
        // Check if this collage is currently hidden
        const isCollageHidden = collageIdsArray.includes(collageId);
        
        // Create the button with exact same styling as existing linkbox buttons
        const filterButton = document.createElement('a');
        filterButton.href = '#';
        filterButton.className = 'linkbox__link ptp-add-collage-filter';
        filterButton.textContent = isCollageHidden ? 'Unhide this collage' : 'Hide this collage';
        
        // Add click handler
        filterButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (isCollageHidden) {
                // Remove from filter list
                const currentIds = COLLAGE_IDS_TO_HIDE.trim();
                const idsArray = currentIds.split(',').map(id => id.trim());
                const filteredIds = idsArray.filter(id => id !== collageId);
                const newIds = filteredIds.join(', ');
                
                // Update the setting
                GM_setValue('COLLAGE_IDS_TO_HIDE', newIds);
                COLLAGE_IDS_TO_HIDE = newIds;
                collageIdsArray = newIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
                
                console.log(`Removed collage ID ${collageId} from filter list. New list: ${newIds}`);
                
                // Reload the page to show the content
                window.location.reload();
                
            } else {
                // Add to filter list
                const currentIds = COLLAGE_IDS_TO_HIDE.trim();
                let newIds;
                
                if (currentIds === '') {
                    newIds = collageId;
                } else {
                    // Check if ID is already in the list (shouldn't happen, but safety check)
                    const idsArray = currentIds.split(',').map(id => id.trim());
                    if (idsArray.includes(collageId)) {
                        alert(`Collage ID ${collageId} is already in the filter list.`);
                        return;
                    }
                    newIds = currentIds + ', ' + collageId;
                }
                
                // Update the setting
                GM_setValue('COLLAGE_IDS_TO_HIDE', newIds);
                COLLAGE_IDS_TO_HIDE = newIds;
                collageIdsArray = newIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
                
                console.log(`Added collage ID ${collageId} to filter list. New list: ${newIds}`);
                
                // Hide the page content immediately
                handleHiddenCollagePage();
                
                // Update button text
                filterButton.textContent = 'Unhide this collage';
            }
        });
        
        // Create the bracketed container for the button to match linkbox format
        const bracketContainer = document.createElement('span');
        bracketContainer.style.marginLeft = '5px';
        
        // Add opening bracket, button, closing bracket
        bracketContainer.appendChild(document.createTextNode('['));
        bracketContainer.appendChild(filterButton);
        bracketContainer.appendChild(document.createTextNode(']'));
        
        // Find where to insert - after the last content
        const linkboxText = linkbox.textContent;
        const hasContent = linkboxText.trim().length > 0;
        
        if (hasContent) {
            // Add after existing content with appropriate spacing
            linkbox.appendChild(document.createTextNode('\n\t\t\t\t\t\t\t'));
            linkbox.appendChild(bracketContainer);
        } else {
            // First element in linkbox
            linkbox.appendChild(bracketContainer);
        }
        
        console.log(`Added collage ${isCollageHidden ? 'unhide' : 'hide'} button for collage ID: ${collageId}`);
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
            
            // Check if this is a specific collage page and process coverViewJsonData
            const urlParams = new URLSearchParams(window.location.search);
            const collageId = urlParams.get('id');
            if (collageId && !urlParams.has('action')) {
                console.log(`Specific collage page detected (ID: ${collageId}), calling processing functions`);
                // Wait a bit for the DOM to be fully populated before processing
                setTimeout(() => {
                    console.log('Timeout fired, calling processCoverViewJsonData...');
                    processCoverViewJsonData();
                    processSidebarMovieList();
                }, 100);
                addCollageFilterButton();
            } else {
                console.log('Not a specific collage page or has action parameter, skipping coverViewJsonData processing');
                console.log('URL params:', Object.fromEntries(urlParams));
            }
            
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
                
                // Check IMDb data (keywords and parental guide) if enabled (regardless of PTP tag matches)
                if ((ENABLE_IMDB_KEYWORD_CHECK || ENABLE_IMDB_PARENTAL_GUIDE_CHECK) && movie.ImdbId) {
                    try {
                        const imdbData = await checkIMDbData(movie.ImdbId, movie.Title, movie.Year);
                        
                        let imdbMatchedTags = [];
                        let imdbMatchTypes = [];
                        
                        // Handle keyword matches
                        if (imdbData.keywords && imdbData.keywords.matched) {
                            const keywordTags = imdbData.keywords.matched.map(k => `imdb:${k}`);
                            imdbMatchedTags = imdbMatchedTags.concat(keywordTags);
                            imdbMatchTypes.push('keywords');
                            console.log(`Found movie with IMDb keyword matches (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId} - Matched keywords: ${imdbData.keywords.matched.join(', ')}`);
                        }
                        
                        // Handle parental guide matches
                        if (imdbData.parentalGuide && imdbData.parentalGuide.matched) {
                            // Create detailed tags for each parental guide match
                            imdbData.parentalGuide.matched.forEach(match => {
                                // Create tags in format: imdb:parental-guide:Category:Severity
                                const categoryTag = match.category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                                const detailedTag = `imdb:parental-guide:${categoryTag}:${match.severity.toLowerCase()}`;
                                imdbMatchedTags.push(detailedTag);
                            });
                            
                            // Also add the general parental guide tag for backward compatibility
                            imdbMatchedTags.push('imdb:parental-guide');
                            imdbMatchTypes.push('parental guide');
                            
                            const matchSummary = imdbData.parentalGuide.matched.map(m => `${m.category}:${m.severity}`).join(', ');
                            console.log(`Found movie with IMDb parental guide matches (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId} - Matches: ${matchSummary}`);
                        }
                        
                        if (imdbMatchedTags.length > 0) {
                            if (!shouldHide) {
                                // Only IMDb data matched
                                matchedTags = imdbMatchedTags;
                                shouldHide = true;
                                matchType = `IMDb ${imdbMatchTypes.join(' + ')}`;
                            } else {
                                // Both PTP tags and IMDb data matched
                                matchedTags = [...matchedTags, ...imdbMatchedTags];
                                matchType = `PTP tags + IMDb ${imdbMatchTypes.join(' + ')}`;
                                console.log(`Found movie with BOTH PTP tags AND IMDb matches (${arrayName}): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - IMDB: ${movie.ImdbId} - PTP: ${movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase())).join(', ')} - IMDb: ${imdbMatchTypes.join(', ')}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to check IMDb data for ${movie.Title} (${movie.ImdbId}):`, error);
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
            console.log(`Maximum timeout reached (${FINAL_FALLBACK_TIMEOUT}ms), showing page anyway`);
            showPage();
        }
    }, FINAL_FALLBACK_TIMEOUT);

})();