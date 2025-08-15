// ==UserScript==
// @name         PTP - iMDB Combined Script
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1.7.0
// @description  Add many iMDB functions into one script
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @match        https://passthepopcorn.me/requests.php?*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-imdb-combined.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-imdb-combined.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM_registerMenuCommand
// @grant        GM.listValues
// @grant        GM.deleteValue
// @connect      api.graphql.imdb.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

let SHOW_SIMILAR_MOVIES = true;
let PLACE_UNDER_CAST = false;
let SHOW_TECHNICAL_SPECIFICATIONS = true;
let SHOW_BOX_OFFICE = true;
let SHOW_AWARDS = true;
let SHOW_SOUNDTRACKS = true;
let CACHE_EXPIRY_DAYS = 7;
let SHOW_ALTERNATE_VERSIONS = true;
let ALTERNATE_VERSIONS_PANEL_OPEN = false;
let SHOW_KEYWORDS = true;
let KEYWORDS_PANEL_OPEN = false;
let SHOW_PARENTS_GUIDE = true;
let isPanelVisible = true;
let isToggleableSections = true;
let hideSpoilers = true;
let hidetext = false;
let SHOW_CAST_PHOTOS = true;
let TECHSPECS_LOCATION = 1;
let BOXOFFICE_LOCATION = 2;
let AWARDS_LOCATION = 4;
let EXISTING_IMDB_TAGS = 6;
let SIMILAR_MOVIES_LOCATION = 5;
let PARENTS_LOCATION = 3;
let CAST_FILTER_TYPE = 'actors'; // 'actors' or 'all'
let CAST_MAX_DISPLAY = 128;
let CONST_PIXEL_HEIGHT = 300;
let CAST_IMAGES_PER_ROW = 4;
let CAST_DEFAULT_ROWS = 2;

const saveSettings = () => {
    GM.setValue('SHOW_SIMILAR_MOVIES', SHOW_SIMILAR_MOVIES);
    GM.setValue('PLACE_UNDER_CAST', PLACE_UNDER_CAST);
    GM.setValue('SHOW_TECHNICAL_SPECIFICATIONS', SHOW_TECHNICAL_SPECIFICATIONS);
    GM.setValue('SHOW_BOX_OFFICE', SHOW_BOX_OFFICE);
    GM.setValue('SHOW_AWARDS', SHOW_AWARDS);
    GM.setValue('SHOW_SOUNDTRACKS', SHOW_SOUNDTRACKS);
    GM.setValue('CACHE_EXPIRY_DAYS', CACHE_EXPIRY_DAYS);
    GM.setValue('SHOW_ALTERNATE_VERSIONS', SHOW_ALTERNATE_VERSIONS);
    GM.setValue('ALTERNATE_VERSIONS_PANEL_OPEN', ALTERNATE_VERSIONS_PANEL_OPEN);
    GM.setValue('SHOW_KEYWORDS', SHOW_KEYWORDS);
    GM.setValue('KEYWORDS_PANEL_OPEN', KEYWORDS_PANEL_OPEN);
    GM.setValue('SHOW_PARENTS_GUIDE', SHOW_PARENTS_GUIDE);
    GM.setValue('isPanelVisible', isPanelVisible);
    GM.setValue('isToggleableSections', isToggleableSections);
    GM.setValue('hideSpoilers', hideSpoilers);
    GM.setValue('hidetext', hidetext);
    GM.setValue('SHOW_CAST_PHOTOS', SHOW_CAST_PHOTOS);
    GM.setValue('CAST_FILTER_TYPE', CAST_FILTER_TYPE);
    GM.setValue('CAST_MAX_DISPLAY', CAST_MAX_DISPLAY);
    GM.setValue('CAST_IMAGES_PER_ROW', CAST_IMAGES_PER_ROW);
    GM.setValue('CAST_DEFAULT_ROWS', CAST_DEFAULT_ROWS);
    GM.setValue('CONST_PIXEL_HEIGHT', CONST_PIXEL_HEIGHT);
    GM.setValue('TECHSPECS_LOCATION', TECHSPECS_LOCATION);
    GM.setValue('BOXOFFICE_LOCATION', BOXOFFICE_LOCATION);
    GM.setValue('AWARDS_LOCATION', AWARDS_LOCATION);
    GM.setValue('EXISTING_IMDB_TAGS', EXISTING_IMDB_TAGS);
    GM.setValue('SIMILAR_MOVIES_LOCATION', SIMILAR_MOVIES_LOCATION);
    GM.setValue('PARENTS_LOCATION', PARENTS_LOCATION);
};

const loadSettings = async () => {
    SHOW_SIMILAR_MOVIES = await GM.getValue('SHOW_SIMILAR_MOVIES', true);
    PLACE_UNDER_CAST = await GM.getValue('PLACE_UNDER_CAST', false);
    SHOW_TECHNICAL_SPECIFICATIONS = await GM.getValue('SHOW_TECHNICAL_SPECIFICATIONS', true);
    SHOW_BOX_OFFICE = await GM.getValue('SHOW_BOX_OFFICE', true);
    SHOW_AWARDS = await GM.getValue('SHOW_AWARDS', true);
    SHOW_SOUNDTRACKS = await GM.getValue('SHOW_SOUNDTRACKS', true);
    CACHE_EXPIRY_DAYS = await GM.getValue('CACHE_EXPIRY_DAYS', 7);
    SHOW_ALTERNATE_VERSIONS = await GM.getValue('SHOW_ALTERNATE_VERSIONS', true);
    ALTERNATE_VERSIONS_PANEL_OPEN = await GM.getValue('ALTERNATE_VERSIONS_PANEL_OPEN', false);
    SHOW_KEYWORDS = await GM.getValue('SHOW_KEYWORDS', true);
    KEYWORDS_PANEL_OPEN = await GM.getValue('KEYWORDS_PANEL_OPEN', false);
    SHOW_PARENTS_GUIDE = await GM.getValue('SHOW_PARENTS_GUIDE', true);
    isPanelVisible = await GM.getValue('isPanelVisible', true);
    isToggleableSections = await GM.getValue('isToggleableSections', true);
    hideSpoilers = await GM.getValue('hideSpoilers', true);
    hidetext = await GM.getValue('hidetext', false);
    SHOW_CAST_PHOTOS = await GM.getValue('SHOW_CAST_PHOTOS', true);
    CAST_FILTER_TYPE = await GM.getValue('CAST_FILTER_TYPE', 'actors');
    CAST_MAX_DISPLAY = await GM.getValue('CAST_MAX_DISPLAY', 128);
    CAST_IMAGES_PER_ROW = await GM.getValue('CAST_IMAGES_PER_ROW', 4);
    CAST_DEFAULT_ROWS = await GM.getValue('CAST_DEFAULT_ROWS', 2);
    CONST_PIXEL_HEIGHT = await GM.getValue('CONST_PIXEL_HEIGHT', 300);
    TECHSPECS_LOCATION = await GM.getValue('TECHSPECS_LOCATION', 1);
    BOXOFFICE_LOCATION = await GM.getValue('BOXOFFICE_LOCATION', 2);
    AWARDS_LOCATION = await GM.getValue('AWARDS_LOCATION', 4);
    EXISTING_IMDB_TAGS = await GM.getValue('EXISTING_IMDB_TAGS', 6);
    SIMILAR_MOVIES_LOCATION = await GM.getValue('SIMILAR_MOVIES_LOCATION', 5);
    PARENTS_LOCATION = await GM.getValue('PARENTS_LOCATION', 3);
};

const flushCache = async () => {
    try {
        // Get all stored keys
        const keys = await GM.listValues();
        let deletedCount = 0;

        // Delete all cache keys
        for (const key of keys) {
            if (key.includes('_data_') || key.includes('iMDB_') || key.includes('names_')) {
                await GM.deleteValue(key);
                deletedCount++;
            }
        }

        alert(`Cache flushed successfully!\n${deletedCount} cache entries deleted.`);
        console.log(`Cache flush completed. Deleted ${deletedCount} entries.`);
    } catch (error) {
        console.error('Error flushing cache:', error);
        alert('Error flushing cache. Check console for details.');
    }
};

GM_registerMenuCommand('⚙️ IMDB Script Settings', showSettingsPanel);

function showSettingsPanel() {
    // Remove existing panel if it exists
    const existingPanel = document.getElementById('imdb-settings-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create the settings panel
    const panel = document.createElement('div');
    panel.id = 'imdb-settings-panel';
    panel.innerHTML = `
        <div id="imdb-settings-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background: #2c2c2c;
                border: 2px solid #555;
                border-radius: 10px;
                padding: 20px;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                color: #fff;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #555;
                    padding-bottom: 10px;
                ">
                    <h2 style="margin: 0; color: #F2DB83;">⚙️ IMDB Script Settings</h2>
                    <button id="close-settings" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 5px 10px;
                        cursor: pointer;
                        font-size: 16px;
                    ">✕</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <!-- Content Panels Column -->
                    <div>
                        <h3 style="color: #F2DB83; margin-top: 0;">Content Panels</h3>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-similar-movies" style="margin-right: 8px;">
                            <span>Similar Movies</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="place-under-cast" style="margin-right: 8px;">
                            <span>Place Similar Movies Under Cast</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-technical-specs" style="margin-right: 8px;">
                            <span>Technical Specifications</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-box-office" style="margin-right: 8px;">
                            <span>Box Office</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-awards" style="margin-right: 8px;">
                            <span>Awards</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-soundtracks" style="margin-right: 8px;">
                            <span>Soundtracks</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-cast-photos" style="margin-right: 8px;">
                            <span>Credit Photos</span>
                        </label>

                        <div style="margin-left: 20px; margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px;">
                                <span style="display: block; margin-bottom: 3px; font-size: 0.9em;">Credit Types:</span>
                                <select id="cast-filter-type" style="
                                    padding: 4px;
                                    background: #444;
                                    color: #fff;
                                    border: 1px solid #666;
                                    border-radius: 3px;
                                    width: 120px;
                                ">
                                    <option value="actors">Actors/Actresses Only</option>
                                    <option value="all">All Credits</option>
                                </select>
                            </label>

                            <label style="display: block; margin-bottom: 8px;">
                                <span style="display: block; margin-bottom: 3px; font-size: 0.9em;">Max Credits:</span>
                                <input type="number" id="cast-max-display" min="12" max="500" step="12" style="
                                    width: 80px;
                                    padding: 4px;
                                    background: #444;
                                    color: #fff;
                                    border: 1px solid #666;
                                    border-radius: 3px;
                                ">
                            </label>

                            <label style="display: block; margin-bottom: 8px;">
                                <span style="display: block; margin-bottom: 3px; font-size: 0.9em;">Cast Images Per Row:</span>
                                <input type="number" id="cast-images-per-row" min="2" max="8" step="1" value="${CAST_IMAGES_PER_ROW}" style="
                                    width: 80px;
                                    padding: 4px;
                                    background: #444;
                                    color: #fff;
                                    border: 1px solid #666;
                                    border-radius: 3px;
                                ">
                            </label>

                            <label style="display: block; margin-bottom: 8px;">
                                <span style="display: block; margin-bottom: 3px; font-size: 0.9em;">Default Cast Rows:</span>
                                <input type="number" id="cast-default-rows" min="1" max="8" value="${CAST_DEFAULT_ROWS}" style="
                                    width: 80px;
                                    padding: 4px;
                                    background: #444;
                                    color: #fff;
                                    border: 1px solid #666;
                                    border-radius: 3px;
                                ">
                            </label>

                            <label style="display: block; margin-bottom: 8px;">
                                <span style="display: block; margin-bottom: 3px; font-size: 0.9em;">Credit Image Height:</span>
                                <input type="number" id="panel-height" min="100" max="800" step="10" value="${CONST_PIXEL_HEIGHT}" style="
                                    width: 80px;
                                    padding: 4px;
                                    background: #444;
                                    color: #fff;
                                    border: 1px solid #666;
                                    border-radius: 3px;
                                ">
                            </label>
                        </div>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-alternate-versions" style="margin-right: 8px;">
                            <span>Alternate Versions</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="alternate-versions-open" style="margin-right: 8px;">
                            <span>Open Alternate Versions by Default</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-keywords" style="margin-right: 8px;">
                            <span>Keywords</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="keywords-open" style="margin-right: 8px;">
                            <span>Open Keywords by Default</span>
                        </label>
                    </div>

                    <!-- Parents Guide Column -->
                    <div>
                        <h3 style="color: #F2DB83; margin-top: 0;">Parents Guide</h3>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-parents-guide" style="margin-right: 8px;">
                            <span>Show Parents Guide</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="panel-visible" style="margin-right: 8px;">
                            <span>Panel Visible by Default</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="toggleable-sections" style="margin-right: 8px;">
                            <span>Toggleable Sections</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="hide-spoilers" style="margin-right: 8px;">
                            <span>Hide Spoilers</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="hide-text" style="margin-right: 8px;">
                            <span>Hide Parental Guide Text</span>
                        </label>

                        <h3 style="color: #F2DB83; margin-top: 30px;">Cache Settings</h3>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Cache Expiry (days):</span>
                            <input type="number" id="cache-expiry" min="1" max="365" style="
                                width: 80px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>

                        <button id="flush-cache-btn" style="
                            background: #ffc107;
                            color: #000;
                            border: none;
                            border-radius: 5px;
                            padding: 8px 16px;
                            cursor: pointer;
                            margin-top: 10px;
                            margin-right: 10px;
                        ">🗑️ Flush Cache</button>

                        <button id="reset-all-btn" style="
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            padding: 8px 16px;
                            cursor: pointer;
                            margin-top: 10px;
                        ">🔄 Reset All</button>
                    </div>

                    <!-- Panel Locations Column -->
                    <div>
                        <h3 style="color: #F2DB83; margin-top: 0;">Panel Locations</h3>
                        <p style="font-size: 0.9em; color: #ccc; margin-bottom: 15px;">Lower numbers appear higher in sidebar</p>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Technical Specs:</span>
                            <input type="number" id="techspecs-location" min="1" max="20" style="
                                width: 60px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Box Office:</span>
                            <input type="number" id="boxoffice-location" min="1" max="20" style="
                                width: 60px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Parental Guide:</span>
                            <input type="number" id="parents-location" min="1" max="20" style="
                                width: 60px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Awards:</span>
                            <input type="number" id="awards-location" min="1" max="20" style="
                                width: 60px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Similar Movies:</span>
                            <input type="number" id="similar-movies-location" min="1" max="20" style="
                                width: 60px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">Existing IMDb Tags:</span>
                            <input type="number" id="existing-imdb-tags" min="1" max="20" style="
                                width: 60px;
                                padding: 5px;
                                background: #444;
                                color: #fff;
                                border: 1px solid #666;
                                border-radius: 3px;
                            ">
                        </label>
                    </div>
                </div>

                <div style="
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #555;
                    text-align: center;
                ">
                    <button id="save-settings-btn" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 12px 30px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                        margin-right: 10px;
                    ">💾 Save & Reload</button>

                    <button id="cancel-settings-btn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        padding: 12px 30px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Cancel</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Load current settings into the form
    loadSettingsIntoForm();

    // Add event listeners
    document.getElementById('close-settings').addEventListener('click', closeSettingsPanel);
    document.getElementById('cancel-settings-btn').addEventListener('click', closeSettingsPanel);
    document.getElementById('save-settings-btn').addEventListener('click', saveSettingsFromForm);
    document.getElementById('flush-cache-btn').addEventListener('click', handleFlushCache);
    document.getElementById('reset-all-btn').addEventListener('click', handleResetAll);

    // Close on overlay click
    document.getElementById('imdb-settings-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'imdb-settings-overlay') {
            closeSettingsPanel();
        }
    });
}

function loadSettingsIntoForm() {
    document.getElementById('show-similar-movies').checked = SHOW_SIMILAR_MOVIES;
    document.getElementById('place-under-cast').checked = PLACE_UNDER_CAST;
    document.getElementById('show-technical-specs').checked = SHOW_TECHNICAL_SPECIFICATIONS;
    document.getElementById('show-box-office').checked = SHOW_BOX_OFFICE;
    document.getElementById('show-awards').checked = SHOW_AWARDS;
    document.getElementById('show-soundtracks').checked = SHOW_SOUNDTRACKS;
    document.getElementById('show-cast-photos').checked = SHOW_CAST_PHOTOS;
    document.getElementById('cast-filter-type').value = CAST_FILTER_TYPE;
    document.getElementById('cast-max-display').value = CAST_MAX_DISPLAY;
    document.getElementById('cast-images-per-row').value = CAST_IMAGES_PER_ROW;
    document.getElementById('cast-default-rows').value = CAST_DEFAULT_ROWS;
    document.getElementById('panel-height').value = CONST_PIXEL_HEIGHT;
    document.getElementById('show-alternate-versions').checked = SHOW_ALTERNATE_VERSIONS;
    document.getElementById('alternate-versions-open').checked = ALTERNATE_VERSIONS_PANEL_OPEN;
    document.getElementById('show-keywords').checked = SHOW_KEYWORDS;
    document.getElementById('keywords-open').checked = KEYWORDS_PANEL_OPEN;
    document.getElementById('show-parents-guide').checked = SHOW_PARENTS_GUIDE;
    document.getElementById('panel-visible').checked = isPanelVisible;
    document.getElementById('toggleable-sections').checked = isToggleableSections;
    document.getElementById('hide-spoilers').checked = hideSpoilers;
    document.getElementById('hide-text').checked = hidetext;
    document.getElementById('cache-expiry').value = CACHE_EXPIRY_DAYS;
    document.getElementById('techspecs-location').value = TECHSPECS_LOCATION;
    document.getElementById('boxoffice-location').value = BOXOFFICE_LOCATION;
    document.getElementById('parents-location').value = PARENTS_LOCATION;
    document.getElementById('awards-location').value = AWARDS_LOCATION;
    document.getElementById('similar-movies-location').value = SIMILAR_MOVIES_LOCATION;
    document.getElementById('existing-imdb-tags').value = EXISTING_IMDB_TAGS;
}

function saveSettingsFromForm() {
    SHOW_SIMILAR_MOVIES = document.getElementById('show-similar-movies').checked;
    PLACE_UNDER_CAST = document.getElementById('place-under-cast').checked;
    SHOW_TECHNICAL_SPECIFICATIONS = document.getElementById('show-technical-specs').checked;
    SHOW_BOX_OFFICE = document.getElementById('show-box-office').checked;
    SHOW_AWARDS = document.getElementById('show-awards').checked;
    SHOW_SOUNDTRACKS = document.getElementById('show-soundtracks').checked;
    SHOW_CAST_PHOTOS = document.getElementById('show-cast-photos').checked;
    CAST_FILTER_TYPE = document.getElementById('cast-filter-type').value;
    CAST_MAX_DISPLAY = parseInt(document.getElementById('cast-max-display').value) || 128;
    CAST_IMAGES_PER_ROW = parseInt(document.getElementById('cast-images-per-row').value) || 4;
    CAST_DEFAULT_ROWS = parseInt(document.getElementById('cast-default-rows').value) || 2;
    CONST_PIXEL_HEIGHT = parseInt(document.getElementById('panel-height').value) || 300;
    SHOW_ALTERNATE_VERSIONS = document.getElementById('show-alternate-versions').checked;
    ALTERNATE_VERSIONS_PANEL_OPEN = document.getElementById('alternate-versions-open').checked;
    SHOW_KEYWORDS = document.getElementById('show-keywords').checked;
    KEYWORDS_PANEL_OPEN = document.getElementById('keywords-open').checked;
    SHOW_PARENTS_GUIDE = document.getElementById('show-parents-guide').checked;
    isPanelVisible = document.getElementById('panel-visible').checked;
    isToggleableSections = document.getElementById('toggleable-sections').checked;
    hideSpoilers = document.getElementById('hide-spoilers').checked;
    hidetext = document.getElementById('hide-text').checked;
    CACHE_EXPIRY_DAYS = parseInt(document.getElementById('cache-expiry').value) || 7;
    TECHSPECS_LOCATION = parseInt(document.getElementById('techspecs-location').value) || 1;
    BOXOFFICE_LOCATION = parseInt(document.getElementById('boxoffice-location').value) || 2;
    PARENTS_LOCATION = parseInt(document.getElementById('parents-location').value) || 3;
    AWARDS_LOCATION = parseInt(document.getElementById('awards-location').value) || 4;
    SIMILAR_MOVIES_LOCATION = parseInt(document.getElementById('similar-movies-location').value) || 5;
    EXISTING_IMDB_TAGS = parseInt(document.getElementById('existing-imdb-tags').value) || 6;

    saveSettings();
    closeSettingsPanel();

    alert('Settings saved successfully!\nReloading page to apply changes...');
    window.location.reload();
}

function closeSettingsPanel() {
    const panel = document.getElementById('imdb-settings-panel');
    if (panel) {
        panel.remove();
    }
}

function handleFlushCache() {
    if (confirm('This will delete all cached IMDB data and force fresh fetches.\n\nAre you sure you want to flush the cache?')) {
        flushCache();
    }
}

function handleResetAll() {
    if (confirm('Reset all settings to defaults AND flush all cached data?\n\nThis will:\n- Reset all toggles to default\n- Delete all cached IMDB data\n- Require page reload')) {
        SHOW_SIMILAR_MOVIES = true;
        PLACE_UNDER_CAST = false;
        SHOW_TECHNICAL_SPECIFICATIONS = true;
        SHOW_BOX_OFFICE = true;
        SHOW_AWARDS = true;
        SHOW_SOUNDTRACKS = true;
        CACHE_EXPIRY_DAYS = 7;
        SHOW_ALTERNATE_VERSIONS = true;
        ALTERNATE_VERSIONS_PANEL_OPEN = false;
        SHOW_KEYWORDS = true;
        KEYWORDS_PANEL_OPEN = false;
        SHOW_PARENTS_GUIDE = true;
        isPanelVisible = true;
        isToggleableSections = true;
        hideSpoilers = true;
        hidetext = false;
        SHOW_CAST_PHOTOS = true;
        CAST_FILTER_TYPE = 'actors';
        CAST_MAX_DISPLAY = 128;
        CONST_PIXEL_HEIGHT = 300;
        TECHSPECS_LOCATION = 1;
        BOXOFFICE_LOCATION = 2;
        PARENTS_LOCATION = 3;
        AWARDS_LOCATION = 4;
        SIMILAR_MOVIES_LOCATION = 5;
        EXISTING_IMDB_TAGS = 6;

        saveSettings();
        flushCache();
        closeSettingsPanel();
        alert('All settings reset and cache flushed!\nReloading page to apply changes.');
        window.location.reload();
    }
}

(async function () {
    'use strict';
    await loadSettings();

    // Function to format and move the IMDb panel
    function formatIMDbText() {
        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }

        // Find all panels with heading "IMDb tags"
        var imdbPanels = Array.from(document.querySelectorAll('div.box_tags.panel')).filter(panel => {
            var heading = panel.querySelector('.panel__heading__title');
            return heading && heading.textContent.trim() === 'IMDb tags';
        });

        // Find the User tags panel
        var userTagsPanel = Array.from(document.querySelectorAll('div.box_tags.panel')).find(panel => {
            var heading = panel.querySelector('.panel__heading__title');
            return heading && heading.textContent.trim() === 'User tags';
        });

        imdbPanels.forEach(imdbPanel => {
            var imdbElement = imdbPanel.querySelector('.panel__heading__title');
            if (imdbElement) {
                imdbElement.innerHTML = '<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> tags</span>';
            }
            // Move the IMDb panel to the desired location
            sidebar.insertBefore(imdbPanel, sidebar.childNodes[3 + EXISTING_IMDB_TAGS]);

            // If User tags panel exists, append it directly after IMDb tags panel
            if (userTagsPanel) {
                sidebar.insertBefore(userTagsPanel, imdbPanel.nextSibling);
            }
        });
    }

    var link = document.querySelector("a#imdb-title-link.rating");
    let imdbUrl, imdbId;

    if (link) {
        imdbUrl = link.getAttribute("href");
        if (!imdbUrl) {
            console.error("IMDb URL not found");
            return;
        }
        imdbId = imdbUrl.split("/")[4];
        if (!imdbId) {
            console.error("IMDb ID not found");
            return;
        }
    } else {
        // Fallback: check request table for IMDb link
        const requestTable = document.querySelector('table#request-table');
        if (requestTable) {
            const imdbRow = Array.from(requestTable.querySelectorAll('tr')).find(tr =>
                tr.querySelector('.label') && tr.querySelector('.label').textContent.trim().toLowerCase() === 'imdb link'
            );
            if (imdbRow) {
                const imdbAnchor = imdbRow.querySelector('a[href*="imdb.com/title/tt"]');
                if (imdbAnchor) {
                    imdbUrl = imdbAnchor.getAttribute('href');
                    const match = imdbUrl.match(/tt\d+/);
                    imdbId = match ? match[0] : null;
                }
            }
        }
        if (!imdbId) {
            console.error("IMDb link not found in request table");
            return;
        }
    }

    // Cache duration (1 week (by default) in milliseconds)
    const CACHE_DURATION = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    // Compress and set cache with expiration
    const setCache = async (key, data) => {
        const cacheData = {
            timestamp: Date.now(),
            data: LZString.compress(JSON.stringify(data))
        };
        await GM.setValue(key, JSON.stringify(cacheData));
    };

    // Decompress and get cache with expiration check
    const getCache = async (key) => {
        const cached = await GM.getValue(key, null);
        if (cached) {
            try {
                const cacheData = JSON.parse(cached);
                const currentTime = Date.now();

                // Check if the cache is expired
                if (currentTime - cacheData.timestamp < CACHE_DURATION) {
                    const decompressedData = LZString.decompress(cacheData.data);
                    const parsedData = JSON.parse(decompressedData);
                    if (parsedData && typeof parsedData === 'object') {
                        //console.log("Cache hit for key:", key);
                        return parsedData; // Return the decompressed and parsed data
                    } else {
                        console.error("Decompressed data is invalid:", decompressedData);
                    }
                } else {
                    console.log("Cache expired for key:", key);
                }
            } catch (error) {
                console.error("Error parsing cache for key:", key, error);
            }
        }
        return null;
    };

    // Function to fetch names from IMDb API with caching
    const fetchNames = async (uniqueIds) => {
        const cacheKey = `names_data_${JSON.stringify(uniqueIds)}`;

        // Try to get cached names
        const cachedNames = await getCache(cacheKey);
        if (cachedNames) {
            console.log("Using cached compressed names");
            return cachedNames;
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    names(ids: ${JSON.stringify(uniqueIds)}) {
                        id
                        nameText {
                            text
                        }
                        primaryImage {
                            url
                        }
                    }
                }
            `
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(query),
                onload: async function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        //console.log("Name ID query output:", data.data.names); // Log the output

                        setCache(cacheKey, data.data.names);

                        resolve(data.data.names);
                    } else {
                        reject("Failed to fetch names");
                    }
                },
                onerror: function (response) {
                    reject("Request error");
                }
            });
        });
    };

    // Function to fetch data from IMDb API with caching and expiration
    const fetchIMDBData = async (imdbId, afterCursor = null, allAwards = []) => {
        const cacheKey = `iMDB_data_${imdbId}`;

        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            console.log("Using cached compressed IMDb data");
            if (cachedData.data && cachedData.data.title) {
                const titleData = cachedData.data.title;
                const soundtracks = titleData.soundtrack.edges;
                const uniqueIds = [];
                soundtracks.forEach(edge => {
                    edge.node.comments.forEach(comment => {
                        const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                        if (match) {
                            uniqueIds.push(`nm${match[1]}`);
                        }
                    });
                });

                const credits = titleData.credits.edges;
                credits.forEach(edge => {
                    const creditNode = edge.node;
                    if (creditNode.name && creditNode.name.id) {
                        uniqueIds.push(creditNode.name.id);
                    }
                });

                const uniqueIdSet = [...new Set(uniqueIds)];
                const names = await fetchNames(uniqueIdSet);
                const idToNameMap = {};
                names.forEach(name => {
                    idToNameMap[name.id] = name.nameText.text;
                });

                const processedSoundtracks = soundtracks.map(edge => {
                    const soundtrack = edge.node;
                    let artistName = null;
                    let artistLink = null;
                    let artistId = null;

                    soundtrack.comments.forEach(comment => {
                        const performedByMatch = comment.markdown.match(/Performed by \[link=nm(\d+)\]/);
                        if (performedByMatch && !artistName) {
                            artistId = `nm${performedByMatch[1]}`;
                            artistName = idToNameMap[artistId];
                            artistLink = `https://www.imdb.com/name/${artistId}/`;
                        }
                    });

                    if (!artistName) {
                        soundtrack.comments.forEach(comment => {
                            const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                            if (match && !artistName) {
                                artistId = `nm${match[1]}`;
                                artistName = idToNameMap[artistId] || match[0];
                                artistLink = `https://www.imdb.com/name/${artistId}/`;
                            } else if (!match && !artistName) {
                                const performedByMatch = comment.markdown.match(/Performed by (.*)/);
                                if (performedByMatch) {
                                    artistName = performedByMatch[1];
                                    artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                }
                            }
                        });
                    }

                    if (!artistName && soundtrack.amazonMusicProducts.length > 0) {
                        const product = soundtrack.amazonMusicProducts[0];
                        if (product.artists && product.artists.length > 0) {
                            artistName = product.artists[0].artistName.text;
                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                        } else {
                            artistName = product.productTitle.text;
                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                        }
                    }

                    if (!artistName) {
                        artistName = soundtrack.text;
                        artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                    }

                    return {
                        title: soundtrack.text,
                        artist: artistName,
                        link: artistLink,
                        artistId: artistId
                    };
                });

                return { titleData, processedSoundtracks, idToNameMap, namesData: names };
            } else {
                console.error("Cached data structure invalid. Fetching fresh data...");
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query getTitleDetails($id: ID!, $first: Int!, $after: ID) {
                    title(id: $id) {
                        soundtrack(first: 40) {
                            edges {
                                node {
                                    id
                                    text
                                    comments {
                                        markdown
                                    }
                                    amazonMusicProducts {
                                        amazonId {
                                            asin
                                        }
                                        artists {
                                            artistName {
                                                text
                                            }
                                        }
                                        format {
                                            text
                                        }
                                        productTitle {
                                            text
                                        }
                                    }
                                }
                            }
                        }
                        id
                        titleText {
                            text
                        }
                        releaseYear {
                            year
                        }
                        alternateVersions(first: 50) {
                            edges {
                                node {
                                    text {
                                        plainText
                                    }
                                }
                            }
                        }
                        keywords(first: 150) {
                            edges {
                                node {
                                    interestScore {
                                        usersInterested
                                        usersVoted
                                    }
                                    itemCategory {
                                        id
                                        itemCategoryId
                                        language { id }
                                        text
                                    }
                                    keyword {
                                        id
                                        text { text }
                                    }
                                    legacyId
                                }
                            }
                        }
                        runtimes(first: 15) {
                            edges {
                                node {
                                    id
                                    seconds
                                    displayableProperty {
                                        value {
                                            plainText
                                        }
                                    }
                                    attributes {
                                        text
                                    }
                                    country {
                                        text
                                    }
                                }
                            }
                        }
                        technicalSpecifications {
                            aspectRatios {
                                items {
                                    aspectRatio
                                    attributes {
                                        text
                                    }
                                }
                            }
                            cameras {
                                items {
                                    camera
                                    attributes {
                                        text
                                    }
                                }
                            }
                            colorations {
                                items {
                                    text
                                    attributes {
                                        text
                                    }
                                }
                            }
                            laboratories {
                                items {
                                    laboratory
                                    attributes {
                                        text
                                    }
                                }
                            }
                            negativeFormats {
                                items {
                                    negativeFormat
                                    attributes {
                                        text
                                    }
                                }
                            }
                            printedFormats {
                                items {
                                    printedFormat
                                    attributes {
                                        text
                                    }
                                }
                            }
                            processes {
                                items {
                                    process
                                    attributes {
                                        text
                                    }
                                }
                            }
                            soundMixes {
                                items {
                                    text
                                    attributes {
                                        text
                                    }
                                }
                            }
                            filmLengths {
                                items {
                                    filmLength
                                    countries {
                                        text
                                    }
                                    numReels
                                }
                            }
                        }
                        moreLikeThisTitles(first: 12) {
                            edges {
                                node {
                                    titleText {
                                        text
                                    }
                                    primaryImage {
                                        url
                                    }
                                    id
                                }
                            }
                        }
                        worldwideGross: rankedLifetimeGross(boxOfficeArea: WORLDWIDE) {
                            total {
                                amount
                            }
                            rank
                        }
                        domesticGross: rankedLifetimeGross(boxOfficeArea: DOMESTIC) {
                            total {
                                amount
                            }
                            rank
                        }
                        internationalGross: rankedLifetimeGross(boxOfficeArea: INTERNATIONAL) {
                            total {
                                amount
                            }
                            rank
                        }
                        domesticOpeningWeekend: openingWeekendGross(boxOfficeArea: DOMESTIC) {
                            gross {
                                total {
                                    amount
                                }
                            }
                            theaterCount
                            weekendEndDate
                            weekendStartDate
                        }
                        internationalOpeningWeekend: openingWeekendGross(boxOfficeArea: INTERNATIONAL) {
                            gross {
                                total {
                                    amount
                                }
                            }
                        }
                        productionBudget {
                            budget {
                                amount
                            }
                        }
                        prestigiousAwardSummary {
                            wins
                            nominations
                            award {
                                year
                                category {
                                    text
                                }
                            }
                        }
                        awardNominations(first: $first, after: $after) {
                            edges {
                                node {
                                    id
                                    award {
                                        id
                                        text
                                    }
                                    awardedEntities {
                                        ... on AwardedNames {
                                            names {
                                                id
                                                nameText {
                                                    text
                                                }
                                            }
                                        }
                                        ... on AwardedTitles {
                                            titles {
                                                id
                                                titleText {
                                                    text
                                                }
                                            }
                                        }
                                    }
                                    category {
                                        text
                                    }
                                    forEpisodes {
                                        id
                                        titleText {
                                            text
                                        }
                                    }
                                    forSongTitles
                                    isWinner
                                    notes {
                                        plainText
                                    }
                                    winAnnouncementDate {
                                        date
                                    }
                                    winningRank
                                }
                            }
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                        }
                        parentsGuide {
                            categories {
                                category {
                                    text
                                }
                                guideItems(first: 100) {
                                    edges {
                                        node {
                                            ... on ParentsGuideItem {
                                                isSpoiler
                                                text {
                                                    plainText
                                                }
                                            }
                                        }
                                    }
                                }
                                severity {
                                    text
                                }
                            }
                        }
                        credits(first: 130) {
                            edges {
                            node {
                                name {
                                id
                                nameText {
                                    text
                                }
                                }
                                category {
                                id
                                text
                                }
                                title {
                                id
                                titleText {
                                    text
                                }
                                }
                            }
                            }
                        }
                    }
                }
            `,
            variables: {
                id: imdbId,
                first: 250,
                after: afterCursor
            }
        };

        return new Promise(async (resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(query),
                onload: async function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        //console.log("IMDb data fetched successfully:", data); // Log the fetched data
                        if (data && data.data && data.data.title) {
                            const titleData = data.data.title;
                            const soundtracks = titleData.soundtrack.edges;
                            const alternateVersions = titleData.alternateVersions.edges;
                            const keywords = titleData.keywords.edges;

                            const awardNominations = titleData.awardNominations.edges.map(edge => edge.node);
                            allAwards.push(...awardNominations);

                            if (titleData.awardNominations.pageInfo.hasNextPage) {
                                fetchIMDBData(imdbId, titleData.awardNominations.pageInfo.endCursor, allAwards)
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                titleData.awardNominationsCombined = allAwards;
                                delete titleData.awardNominations;

                                // Extract unique IDs from comments
                                const uniqueIds = [];
                                soundtracks.forEach(edge => {
                                    edge.node.comments.forEach(comment => {
                                        const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                        if (match) {
                                            uniqueIds.push(`nm${match[1]}`);
                                        }
                                    });
                                });

                                // Add unique IDs from credits
                                const credits = titleData.credits.edges;
                                credits.forEach(edge => {
                                    const creditNode = edge.node;
                                    if (creditNode.name && creditNode.name.id) {
                                        uniqueIds.push(creditNode.name.id);
                                    }
                                });

                                // Fetch names for unique IDs
                                const uniqueIdSet = [...new Set(uniqueIds)];
                                const names = await fetchNames(uniqueIdSet);

                                // Map IDs to names
                                const idToNameMap = {};
                                names.forEach(name => {
                                    idToNameMap[name.id] = name.nameText.text;
                                });
                                //console.log("ID to Name Map:", idToNameMap); // Log the ID to Name mapping

                                // Process the soundtrack data
                                const processedSoundtracks = soundtracks.map(edge => {
                                    const soundtrack = edge.node;
                                    let artistName = null;
                                    let artistLink = null;
                                    let artistId = null;

                                    // Try to find "Performed by" first
                                    soundtrack.comments.forEach(comment => {
                                        const performedByMatch = comment.markdown.match(/Performed by \[link=nm(\d+)\]/);
                                        if (performedByMatch && !artistName) {
                                            artistId = `nm${performedByMatch[1]}`;
                                            artistName = idToNameMap[artistId];
                                            artistLink = `https://www.imdb.com/name/${artistId}/`;
                                            //console.log(`Matched "Performed by" ID: ${artistId}, Artist Name: ${artistName}, Artist Link: ${artistLink}`);
                                        }
                                    });

                                    // If no "Performed by" found, try to find other roles
                                    if (!artistName) {
                                        soundtrack.comments.forEach(comment => {
                                            const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                            if (match && !artistName) {
                                                artistId = `nm${match[1]}`;
                                                artistName = idToNameMap[artistId] || match[0];
                                                artistLink = `https://www.imdb.com/name/${artistId}/`;
                                            } else if (!match && !artistName) {
                                                const performedByMatch = comment.markdown.match(/Performed by (.*)/);
                                                if (performedByMatch) {
                                                    artistName = performedByMatch[1];
                                                    artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                                }
                                            }
                                        });
                                    }

                                    // Fallback to amazonMusicProducts if no artist name found
                                    if (!artistName && soundtrack.amazonMusicProducts.length > 0) {
                                        const product = soundtrack.amazonMusicProducts[0];
                                        if (product.artists && product.artists.length > 0) {
                                            artistName = product.artists[0].artistName.text;
                                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                        } else {
                                            artistName = product.productTitle.text;
                                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                        }
                                    }

                                    // Final fallback to text
                                    if (!artistName) {
                                        artistName = soundtrack.text;
                                        artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                    }

                                    return {
                                        title: soundtrack.text,
                                        artist: artistName,
                                        link: artistLink,
                                        artistId: artistId
                                    };
                                });

                                setCache(cacheKey, data);
                                resolve({ titleData, processedSoundtracks, idToNameMap, namesData: names });
                            }
                        } else {
                            console.error("Invalid data structure", data);
                            reject(new Error("Invalid data structure"));
                        }
                    } else {
                        console.error("Failed to fetch data", response);
                        reject(new Error("Failed to fetch data"));
                    }
                },
                onerror: function (response) {
                    console.error("Request error", response);
                    reject(new Error("Request error"));
                }
            });
        });
    };

    // Function to display similar movies
    const displaySimilarMovies = (similarMovies) => {

        let style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            .panel__heading__toggler {
                margin-left: auto;
                cursor: pointer;
            }
        `;
        document.getElementsByTagName('head')[0].appendChild(style);

        var newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'similar_movies';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' More like this'));

        var toggle = document.createElement('a');
        toggle.href = 'javascript:void(0);';
        toggle.style.float = "right";
        toggle.textContent = '(Show all movies)';

        panelHeading.appendChild(title);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        var panelBody = document.createElement('div');
        panelBody.style.position = 'relative';
        panelBody.style.display = 'block';
        panelBody.style.paddingTop = "0px";
        panelBody.style.width = "100%";
        newPanel.appendChild(panelBody);

        const insertAfterElement = (referenceNode, newNode) => {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        };

        let displayMethod = '';

        if (PLACE_UNDER_CAST) {
            const targetTable = document.querySelector('.table.table--panel-like.table--bordered.table--striped');
            if (targetTable) {
                insertAfterElement(targetTable, newPanel);
                displayMethod = 'table';
            } else {
                console.error("Target table not found");
                return;
            }
        } else {
            const parentGuidePanel = document.querySelector('div.panel#parents_guide');
            if (parentGuidePanel) {
                parentGuidePanel.parentNode.insertBefore(newPanel, parentGuidePanel.nextSibling);
                displayMethod = 'flex';
                toggle.textContent = 'Toggle';
                toggle.className = 'panel__heading__toggler';
                toggle.title = 'Toggle';
                toggle.onclick = function () {
                    panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
                    return false;
                };
            } else {
                const sidebar = document.querySelector('div.sidebar');
                if (!sidebar) {
                    console.error("Sidebar not found");
                    return;
                }
                sidebar.insertBefore(newPanel, sidebar.childNodes[3 + SIMILAR_MOVIES_LOCATION]);
                displayMethod = 'flex';

                toggle.textContent = 'Toggle';
                toggle.className = 'panel__heading__toggler';
                toggle.title = 'Toggle';
                toggle.onclick = function () {
                    panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
                    return false;
                };
            }
        }

        var similarMoviesDiv = document.createElement('div');
        if (displayMethod === 'table') {
            similarMoviesDiv.style.textAlign = 'center';
            similarMoviesDiv.style.display = 'table';
            similarMoviesDiv.style.width = '100%';
            similarMoviesDiv.style.borderCollapse = 'separate';
            similarMoviesDiv.style.borderSpacing = '4px';
        } else {
            similarMoviesDiv.style.display = 'flex';
            similarMoviesDiv.style.flexWrap = 'wrap';
            similarMoviesDiv.style.justifyContent = 'center';
            similarMoviesDiv.style.padding = '4px';
            similarMoviesDiv.style.width = '100%';
        }

        let count = 0;
        let rowDiv = document.createElement('div');
        if (displayMethod === 'table') {
            rowDiv.style.display = 'table-row';
        } else {
            rowDiv.style.display = 'flex';
            rowDiv.style.justifyContent = 'center';
            rowDiv.style.width = '100%';
            rowDiv.style.marginBottom = '2px';
        }
        similarMoviesDiv.appendChild(rowDiv);

        similarMovies.forEach((edge) => {
            let movie = edge.node;

            if (!movie.primaryImage) {
                console.warn("No like this image found for movie:", movie.titleText.text);
                return;
            }

            let title = movie.titleText.text;
            let searchLink = `https://passthepopcorn.me/torrents.php?imdb=${movie.id}`;
            let image = movie.primaryImage.url;

            var movieDiv = document.createElement('div');
            if (displayMethod === 'table') {
                movieDiv.style.width = '25%';
                movieDiv.style.display = 'table-cell';
                movieDiv.style.textAlign = 'center';
                movieDiv.style.backgroundColor = '#2c2c2c';
                movieDiv.style.borderRadius = '10px';
                movieDiv.style.overflow = 'hidden';
                movieDiv.style.fontSize = '1em';
            } else {
                movieDiv.style.width = '33%';
                movieDiv.style.textAlign = 'center';
                movieDiv.style.backgroundColor = '#2c2c2c';
                movieDiv.style.borderRadius = '10px';
                movieDiv.style.overflow = 'hidden';
                movieDiv.style.fontSize = '1em';
                movieDiv.style.margin = '3px 3px 1px 1px';
            }
            movieDiv.innerHTML = `<a href="${searchLink}" target="_blank"><img style="max-width:100%; display:block; margin:auto;" src="${image}" alt="${title}" /></a><span>${title}</span>`;
            rowDiv.appendChild(movieDiv);

            count++;
            if (displayMethod === 'table' && count % 4 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.style.display = 'table-row';
                similarMoviesDiv.appendChild(rowDiv);
            } else if (displayMethod === 'flex' && count % 3 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.style.display = 'flex';
                rowDiv.style.justifyContent = 'center';
                rowDiv.style.width = '100%';
                rowDiv.style.marginBottom = '2px';
                similarMoviesDiv.appendChild(rowDiv);
            }
        });

        if (displayMethod === 'table' && similarMoviesDiv.children.length > 2) {
            Array.from(similarMoviesDiv.children).slice(2).forEach(child => child.style.display = 'none');
        } else if (displayMethod === 'flex' && similarMoviesDiv.children.length > 3) {
            Array.from(similarMoviesDiv.children).slice(3).forEach(child => child.style.display = 'none');
        }

        if (displayMethod === 'table') {
            toggle.addEventListener('click', function () {
                const rows = Array.from(similarMoviesDiv.children);
                const isHidden = rows.slice(2).some(row => row.style.display === 'none');
                rows.slice(2).forEach(row => {
                    row.style.display = isHidden ? 'table-row' : 'none';
                });
                toggle.textContent = isHidden ? '(Hide extra movies)' : '(Show all movies)';
            });
        }

        panelBody.appendChild(similarMoviesDiv);
    };

    // Function to display technical specifications
    const displayTechnicalSpecifications = (data) => {

        var newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'technical_specifications';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Technical Specifications'));

        var imdbLink = document.createElement('a');
        imdbLink.href = `https://www.imdb.com/title/${imdbId}/technical`;
        imdbLink.title = 'IMDB Url';
        imdbLink.textContent = 'IMDb Url';
        imdbLink.target = '_blank';
        imdbLink.style.marginLeft = '5px';

        var toggle = document.createElement('a');
        toggle.className = 'panel__heading__toggler';
        toggle.title = 'Toggle';
        toggle.href = '#';
        toggle.textContent = 'Toggle';

        toggle.onclick = function () {
            var panelBody = document.querySelector('#technical_specifications .panel__body');
            panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
            return false;
        };

        panelHeading.appendChild(title);
        panelHeading.appendChild(imdbLink);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        var panelBody = document.createElement('div');
        panelBody.className = 'panel__body';
        newPanel.appendChild(panelBody);

        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(newPanel, sidebar.childNodes[3 + TECHSPECS_LOCATION]);

        const specs = data.data.title.technicalSpecifications || {};
        const runtimes = data.data.title.runtimes?.edges || [];
        const panelBodyElement = document.getElementById('technical_specifications').querySelector('.panel__body');

        const specContainer = document.createElement('div');
        specContainer.className = 'technicalSpecification';
        specContainer.style.color = "#fff";
        specContainer.style.fontSize = "1em";

        const formatSpec = (title, items, key, attributesKey) => {
            if (items && items.length > 0) {
                let values = items.map(item => {
                    let value = item[key];
                    if (item[attributesKey] && item[attributesKey].length > 0) {
                        value += ` (${item[attributesKey].map(attr => attr.text).join(", ")})`;
                    }
                    return value;
                }).filter(value => value).join(", ");
                return `<strong>${title}:</strong> ${values}<br>`;
            }
            return "";
        };

        const formatFilmLengths = (items) => {
            if (items && items.length > 0) {
                let values = items.map(item => {
                    let value = `${item.filmLength} m`;
                    if (item.countries && item.countries.length > 0) {
                        value += ` (${item.countries.map(country => country.text).join(", ")})`;
                    }
                    if (item.numReels) {
                        value += ` (${item.numReels} reels)`;
                    }
                    return value;
                }).filter(value => value).join(", ");
                return `<strong>Film Length:</strong> ${values}<br>`;
            }
            return "";
        };

        const formatRuntimes = (runtimes) => {
            if (runtimes && runtimes.length > 0) {
                let values = runtimes.map(runtime => {
                    let value = `${runtime.node.displayableProperty.value.plainText}`;
                    // Add attributes if present
                    if (runtime.node.attributes && runtime.node.attributes.length > 0) {
                        value += ` (${runtime.node.attributes.map(attr => attr.text).join(", ")})`;
                    }
                    // Add country if present
                    if (runtime.node.country && runtime.node.country.text) {
                        value += ` [${runtime.node.country.text}]`;
                    }
                    return value;
                }).join(", ");
                return `<strong>Runtime:</strong> ${values}<br>`;
            }
            return "";
        };

        specContainer.innerHTML += formatRuntimes(runtimes);
        specContainer.innerHTML += formatSpec("Sound mix", specs.soundMixes?.items || [], "text", "attributes");
        specContainer.innerHTML += formatSpec("Color", specs.colorations?.items || [], "text", "attributes");
        specContainer.innerHTML += formatSpec("Aspect ratio", specs.aspectRatios?.items || [], "aspectRatio", "attributes");
        specContainer.innerHTML += formatSpec("Camera", specs.cameras?.items || [], "camera", "attributes");
        specContainer.innerHTML += formatSpec("Laboratory", specs.laboratories?.items || [], "laboratory", "attributes");
        specContainer.innerHTML += formatFilmLengths(specs.filmLengths?.items || []);
        specContainer.innerHTML += formatSpec("Negative Format", specs.negativeFormats?.items || [], "negativeFormat", "attributes");
        specContainer.innerHTML += formatSpec("Cinematographic Process", specs.processes?.items || [], "process", "attributes");
        specContainer.innerHTML += formatSpec("Printed Film Format", specs.printedFormats?.items || [], "printedFormat", "attributes");

        panelBodyElement.appendChild(specContainer);
    };

    // Function to display box office details
    const displayBoxOffice = (data) => {

        var newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'box_office';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Box Office'));

        var toggle = document.createElement('a');
        toggle.className = 'panel__heading__toggler';
        toggle.title = 'Toggle';
        toggle.href = '#';
        toggle.textContent = 'Toggle';

        toggle.onclick = function () {
            var panelBody = document.querySelector('#box_office .panel__body');
            panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
            return false;
        };

        panelHeading.appendChild(title);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        var panelBody = document.createElement('div');
        panelBody.className = 'panel__body';
        newPanel.appendChild(panelBody);

        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(newPanel, sidebar.childNodes[3 + BOXOFFICE_LOCATION]);

        const titleData = data.data.title || {};
        const panelBodyElement = document.getElementById('box_office').querySelector('.panel__body');

        const boxOfficeContainer = document.createElement('div');
        boxOfficeContainer.className = 'boxOffice';
        boxOfficeContainer.style.color = "#fff";
        boxOfficeContainer.style.fontSize = "1em";

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
        };

        const formatRankedGross = (title, boxOfficeData) => {
            if (boxOfficeData && boxOfficeData.total && boxOfficeData.total.amount) {
                return `<strong>${title}:</strong> ${formatCurrency(boxOfficeData.total.amount)} (Rank: ${boxOfficeData.rank})<br>`;
            }
            return "";
        };

        const formatOpeningWeekendGross = (title, boxOfficeData) => {
            if (boxOfficeData && boxOfficeData.gross && boxOfficeData.gross.total.amount) {
                return `<strong>${title}:</strong> ${formatCurrency(boxOfficeData.gross.total.amount)}<br>`;
            }
            return "";
        };

        const formatProductionBudget = (budgetData) => {
            if (budgetData && budgetData.amount) {
                return `<strong>Production Budget:</strong> ${formatCurrency(budgetData.amount)}<br>`;
            }
            return "";
        };

        let output = '';

        if (titleData.productionBudget && titleData.productionBudget.budget) {
            output += formatProductionBudget(titleData.productionBudget.budget);
        }
        if (titleData.worldwideGross) {
            output += formatRankedGross("Worldwide Gross", titleData.worldwideGross);
        }
        if (titleData.domesticGross) {
            output += formatRankedGross("Domestic Gross", titleData.domesticGross);
        }
        if (titleData.internationalGross) {
            output += formatRankedGross("International Gross", titleData.internationalGross);
        }
        if (titleData.domesticOpeningWeekend) {
            output += formatOpeningWeekendGross("Domestic Opening Weekend Gross", titleData.domesticOpeningWeekend);
            if (titleData.domesticOpeningWeekend) {
                output += `<strong>Theater Count:</strong> ${titleData.domesticOpeningWeekend.theaterCount}<br>
                           <strong>Weekend Start Date:</strong> ${titleData.domesticOpeningWeekend.weekendStartDate}<br>
                           <strong>Weekend End Date:</strong> ${titleData.domesticOpeningWeekend.weekendEndDate}<br>`;
            }
        }
        if (titleData.internationalOpeningWeekend) {
            output += formatOpeningWeekendGross("International Opening Weekend Gross", titleData.internationalOpeningWeekend);
        }

        boxOfficeContainer.innerHTML = output;
        panelBodyElement.appendChild(boxOfficeContainer);
    };

    const displayAwardsData = (titleData) => {

        const imdbId = titleData.id;

        const wins = titleData.prestigiousAwardSummary?.wins ?? 0;
        const nominations = titleData.prestigiousAwardSummary?.nominations ?? 0;

        // Calculate total wins and nominations
        let totalWins = 0;
        let totalNominations = 0;

        if (titleData.awardNominationsCombined && titleData.awardNominationsCombined.length > 0) {
            titleData.awardNominationsCombined.forEach(nomination => {
                if (nomination.isWinner) {
                    totalWins++;
                } else {
                    totalNominations++;
                }
            });
        }

        const aDiv = document.createElement('div');
        aDiv.setAttribute('id', 'imdb-award');
        aDiv.setAttribute('class', 'panel');
        aDiv.innerHTML = `
            <div class="panel__heading">
                <span class="panel__heading__title">
                    <span style="color: rgb(242, 219, 131);">IMDb</span> Awards
                </span>
                <a href="https://www.imdb.com/title/${imdbId}/awards/" target="_blank" rel="noreferrer" style="float:right; font-size:0.9em; margin-right: 10px;">(View on IMDb)</a>
            </div>`;
        const awardDiv = document.createElement('div');
        awardDiv.setAttribute('style', 'text-align:center; display:table; width:100%; border-collapse: separate; border-spacing:4px;');
        aDiv.appendChild(awardDiv);

        // Placeholder for the awards content
        const awardsContent = document.createElement('div');
        awardsContent.setAttribute('id', 'awards-content');
        awardsContent.innerHTML = `
            <style>
                .awards-text {
                    font-size: 1.0em; /* Adjust this value to change the text size */
                }
                .awards-table {
                    width: 100%;
                    text-align: left;
                    border-collapse: collapse;
                }
                .awards-table th, .awards-table td {
                    padding: 15px;
                    border-bottom: 1px solid #ddd;
                }
            </style>
            <div class="awards-text">
                <table class="awards-table">
                    <tr>
                        <th style="color: yellow;">OSCARS</th>
                        <th>Wins</th>
                        <th>Nominations</th>
                    </tr>
                    <tr>
                        <td></td>
                        <td style="color: yellow;">${wins}</td>
                        <td style="color: yellow;">${nominations}</td>
                    </tr>
                    <tr>
                        <th>Total Awards</th>
                        <th>Wins</th>
                        <th>Nominations</th>
                    </tr>
                    <tr>
                        <td></td>
                        <td style="color: yellow;">${totalWins}</td>
                        <td style="color: yellow;">${totalNominations}</td>
                    </tr>
                </table>
            </div>`;
        aDiv.appendChild(awardsContent);

        //const awardsBefore = document.querySelector('div.box_albumart');

        //if (awardsBefore && awardsBefore.nextElementSibling) {
        //    const nextSibling = awardsBefore.nextElementSibling;
            // Append the awards panel after the next sibling div
        //    nextSibling.parentNode.insertBefore(aDiv, nextSibling.nextElementSibling);
        //}
        var sidebar = document.querySelector('div.sidebar');
        if (!sidebar) {
            console.error("Sidebar not found");
            return;
        }
        sidebar.insertBefore(aDiv, sidebar.childNodes[3 + AWARDS_LOCATION]);
    };

    const appendSongs = (songs, idToNameMap) => {
        let movie_title = document.querySelector(".page__title").textContent.split("[")[0].trim();
        if (movie_title.includes(" AKA ")) movie_title = movie_title.split(" AKA ")[1]; // 0 = title in foreign lang, 1 = title in eng lang

        let cast_container = [...document.querySelectorAll("table")].find(e => e.textContent.trim().startsWith("Actor\n"));
        let bg_color_1 = "#222";
        let bg_color_2 = "#222";
        let border_color = "#444";
        if (cast_container) {
            bg_color_1 = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("background-color").split("none")[0];
            bg_color_2 = window.getComputedStyle(cast_container.querySelector("tbody > tr"), null).getPropertyValue("background-color").split("none")[0];
            border_color = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("border-color").split("none")[0];
        }

        let new_panel = document.createElement("div");
        new_panel.id = "imdb-soundtrack";
        new_panel.className = "panel";
        new_panel.style.padding = 0;
        new_panel.style.margin = "18px 0";

        new_panel.innerHTML = '<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/' + imdbId + '/soundtrack" target="_blank" rel="noopener noreferrer"><span style="color: rgb(242, 219, 131);">IMDb</span> Soundtrack</a></span></div>';

        new_panel.querySelector(".panel__heading").style.display = "flex";
        new_panel.querySelector(".panel__heading").style.justifyContent = "space-between";

        let yt_search = document.createElement("a");
        yt_search.href = "https://www.youtube.com/results?search_query=" + movie_title + " soundtrack";
        yt_search.textContent = "(YouTube search)";
        yt_search.target = "_blank";

        let yt_search_wrapper = document.createElement("span");
        yt_search_wrapper.style.float = "right";
        yt_search_wrapper.style.fontSize = "0.9em";
        yt_search_wrapper.appendChild(yt_search);

        new_panel.querySelector(".panel__heading").appendChild(yt_search_wrapper);

        let songs_container = document.createElement("div");
        songs_container.className = "panel__body";
        songs_container.style.display = "flex";
        songs_container.style.padding = 0;

        if (songs.length === 0) {
            let no_songs_container = document.createElement("div");
            no_songs_container.style.padding = "11px";
            no_songs_container.textContent = "No soundtrack information found on IMDb.";
            no_songs_container.style.textAlign = "center";
            new_panel.appendChild(no_songs_container);
            cast_container.parentNode.insertBefore(new_panel, cast_container);
            return;
        }

        let songs_col_1 = document.createElement("div");
        songs_col_1.style.display = "inline-block";
        songs_col_1.style.width = "50%";
        songs_col_1.style.padding = 0;
        songs_col_1.style.borderRight = "1px solid " + border_color;

        let songs_col_2 = document.createElement("div");
        songs_col_2.style.display = "inline-block";
        songs_col_2.style.width = "50%";
        songs_col_2.style.padding = 0;

        let j = 0;
        for (let i = 0; i < songs.length / 2; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2, idToNameMap);
            songs_col_1.appendChild(div);
            j++;
        }

        for (let i = Math.ceil(songs.length / 2); i < songs.length; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2, idToNameMap);
            songs_col_2.appendChild(div);
            j++;
        }

        songs_container.appendChild(songs_col_1);
        songs_container.appendChild(songs_col_2);
        new_panel.appendChild(songs_container);

        if (cast_container && cast_container.parentNode) {
            cast_container.parentNode.insertBefore(new_panel, cast_container);
        } else {
            // Fallback: insert after request table or at top of main content
            const requestTable = document.getElementById('request-table');
            if (requestTable && requestTable.parentNode) {
                requestTable.parentNode.insertBefore(new_panel, requestTable.nextSibling);
            } else {
                document.body.insertBefore(new_panel, document.body.firstChild);
            }
        }
    };

    const createSongDiv = (song, movie_title, index, bg_color_1, bg_color_2, idToNameMap) => {
        let div = document.createElement("div");
        div.style.height = "31px";
        div.style.overflow = "hidden";
        div.style.padding = "6px 14px";

        let track_line = document.createElement("a");
        track_line.textContent = song.title;
        track_line.title = song.title;
        track_line.href = "https://www.youtube.com/results?search_query=" + movie_title.replace(/&/, " and ") + " " + song.title.replace(/&/, " and ");
        track_line.target = "_blank";

        let seperator = document.createElement("span");
        seperator.innerHTML = "-&nbsp;&nbsp;&nbsp;";

        let artist_link = document.createElement("a");
        artist_link.textContent = song.artistId ? idToNameMap[song.artistId] : song.artist;
        artist_link.href = song.link;
        artist_link.target = "_blank";
        artist_link.style.marginRight = "10px";

        if (index % 2 === 0) div.style.background = bg_color_1;
        else div.style.background = bg_color_2;

        div.appendChild(artist_link);
        div.appendChild(seperator);
        div.appendChild(track_line);

        return div;
    };

    function displayAlternateVersionsPanel(alternateVersionsEdges) {
        if (!alternateVersionsEdges || !alternateVersionsEdges.length) return;

        // Create the panel container
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'alternate_versions_panel';

        // Panel heading
        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.style.cursor = 'pointer';
        heading.innerHTML = `<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> Alternate Versions</span>`;
        panel.appendChild(heading);

        // Panel body (toggle display based on option)
        const body = document.createElement('div');
        body.className = 'panel__body';
        body.style.display = ALTERNATE_VERSIONS_PANEL_OPEN ? 'block' : 'none';

        alternateVersionsEdges.forEach((edge, idx) => {
            const node = edge.node;
            if (node && node.text && node.text.plainText) {
                const versionDiv = document.createElement('div');
                versionDiv.style.marginBottom = '12px';
                versionDiv.style.fontSize = '1em';

                // Split at the first newline
                const text = node.text.plainText;
                const newlineIdx = text.indexOf('\n');
                let header, details;
                if (newlineIdx !== -1) {
                    header = text.slice(0, newlineIdx);
                    details = text.slice(newlineIdx + 1);
                } else {
                    header = text;
                    details = '';
                }

                // Bold the title up to the first ' - ' not in parentheses
                const match = header.match(/^((?:[^(]|\([^)]*\))*)\s-\s(.*)$/s);
                let headerHtml;
                if (match) {
                    headerHtml = `<strong>${match[1].trim()}</strong> - ${match[2]}`;
                } else {
                    headerHtml = header;
                }

                // Create clickable header
                const headerDiv = document.createElement('div');
                headerDiv.innerHTML = headerHtml;
                headerDiv.style.cursor = 'auto';
                headerDiv.style.userSelect = 'text';
                headerDiv.style.padding = '2px 0';

                // Create details div, hidden by default
                const detailsDiv = document.createElement('div');
                detailsDiv.style.display = 'none';
                detailsDiv.style.whiteSpace = 'pre-line';
                detailsDiv.style.marginTop = '4px';
                detailsDiv.textContent = details;
                detailsDiv.style.userSelect = 'text';

                // Toggle details on header click
                headerDiv.addEventListener('click', () => {
                    detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                });

                versionDiv.appendChild(headerDiv);
                versionDiv.appendChild(detailsDiv);
                body.appendChild(versionDiv);
            }
        });

        panel.appendChild(body);

        // Toggle panel body on heading click
        heading.addEventListener('click', () => {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });

        // Find the synopsis panel and insert after it
        const synopsisPanel = document.getElementById('synopsis-and-trailer');
        if (synopsisPanel && synopsisPanel.parentNode) {
            synopsisPanel.parentNode.insertBefore(panel, synopsisPanel.nextSibling);
        } else {
            // Fallback: append to sidebar
            const sidebar = document.querySelector('div.sidebar');
            if (sidebar) sidebar.appendChild(panel);
        }
    }

    function displayKeywordsPanel(keywordsEdges) {
        if (!keywordsEdges || !keywordsEdges.length) return;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'imdb_keywords_panel';

        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.innerHTML = `<span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">IMDb</span> Keywords</span>`;
        panel.appendChild(heading);

        const body = document.createElement('div');
        body.className = 'panel__body';
        body.style.display = KEYWORDS_PANEL_OPEN ? 'block' : 'none';

        const keywordList = document.createElement('div');
        keywordList.style.display = 'flex';
        keywordList.style.flexWrap = 'wrap';
        keywordList.style.gap = '8px';

        keywordsEdges.forEach(edge => {
            const node = edge.node;
            if (node && node.keyword && node.keyword.text && node.keyword.text.text) {
                const keywordText = node.keyword.text.text;
                const keywordUrlPart = keywordText.trim().toLowerCase().replace(/\s+/g, '-');
                const url = `https://www.imdb.com/search/title/?keywords=${encodeURIComponent(keywordUrlPart)}&explore=keywords`;

                const kw = document.createElement('a');
                kw.textContent = keywordText;
                kw.href = url;
                kw.target = "_blank";
                kw.rel = "noopener noreferrer";
                kw.style.background = '#222';
                kw.style.color = '#F2DB83';
                kw.style.padding = '2px 8px';
                kw.style.borderRadius = '8px';
                kw.style.fontSize = '0.95em';
                kw.style.marginBottom = '4px';
                kw.style.textDecoration = 'none';

                keywordList.appendChild(kw);
            }
        });

        body.appendChild(keywordList);
        panel.appendChild(body);

        heading.addEventListener('click', () => {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });

        const sidebar = document.querySelector('div.sidebar');
        if (sidebar) {
            sidebar.appendChild(panel);
        } else {
            console.error("Sidebar not found");
        }
    }

    function addParentalGuidePanel(imdbData) {
        if (!document.getElementById('parental-guide-style')) {
            const style = document.createElement('style');
            style.id = 'parental-guide-style';
            style.type = 'text/css';
            style.innerHTML = `
                .parentalspoiler { color: transparent; }
                .parentalspoiler:hover { color: inherit; }
                .parentalHeader { color: #F2DB83; margin-top: 12px; margin-bottom: 5px; }
                .parentalHeader:hover { cursor: pointer; }
                .hide { display: none; }
            `;
            document.head.appendChild(style);
        }

        const advisoryDiv = document.createElement('div');
        const newPanel = document.createElement('div');
        newPanel.className = 'panel';
        newPanel.id = 'parents_guide';

        const panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';

        const title = document.createElement('span');
        title.className = 'panel__heading__title';
        const imdb = document.createElement('span');
        imdb.style.color = '#F2DB83';
        imdb.textContent = 'IMDb';
        title.appendChild(imdb);
        title.appendChild(document.createTextNode(' Parental Notes'));

        const toggle = document.createElement('a');
        toggle.className = 'panel__heading__toggler';
        toggle.title = 'Toggle';
        toggle.href = '#';
        toggle.textContent = 'Toggle';

        let imdbId = null;
        if (Array.isArray(imdbData)) {
        } else if (imdbData?.parentsGuide?.title?.id) {
            imdbId = imdbData.parentsGuide.title.id;
        } else if (imdbData?.title?.id) {
            imdbId = imdbData.title.id;
        }

        const imdbDisplay = document.createElement('a');
        imdbDisplay.title = 'IMDB Url';
        imdbDisplay.href = imdbId ? `https://www.imdb.com/title/${imdbId}/parentalguide` : "#";
        imdbDisplay.target = "_blank";
        imdbDisplay.textContent = 'IMDB Url';
        imdbDisplay.style.cssText = "margin-left: 5px;";

        toggle.onclick = function () {
            const panelBody = document.querySelector('#parents_guide .panel__body');
            panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
            return false;
        };

        panelHeading.appendChild(title);
        panelHeading.appendChild(imdbDisplay);
        panelHeading.appendChild(toggle);
        newPanel.appendChild(panelHeading);

        const panelBody = document.createElement('div');
        panelBody.className = 'panel__body';
        panelBody.style.position = 'relative';
        panelBody.style.display = isPanelVisible ? 'block' : 'none';
        panelBody.style.paddingTop = "0px";
        panelBody.appendChild(advisoryDiv);
        newPanel.appendChild(panelBody);

        const sidebar = document.querySelector('div.sidebar');
        if (sidebar) sidebar.insertBefore(newPanel, sidebar.childNodes[3 + PARENTS_LOCATION]);

        let categories;
        if (Array.isArray(imdbData)) {
            categories = imdbData;
        } else {
            categories =
                imdbData?.parentsGuide?.title?.parentsGuide?.categories ||
                imdbData?.title?.parentsGuide?.categories ||
                imdbData?.parentsGuide?.categories;
        }

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            advisoryDiv.textContent = "No parental guide data found.";
            return;
        }
        renderParentalGuideCategories(categories, advisoryDiv, { hidetext, isToggleableSections, hideSpoilers });
    }

    function renderParentalGuideCategories(categories, advisoryDiv, opts) {
        const { hidetext, isToggleableSections, hideSpoilers } = opts;
        for (let i = 0; i < categories.length; i++) {
            const container = document.createElement("div");
            const itemHeader = document.createElement("h4");
            itemHeader.className = "parentalHeader";

            const severity = document.createElement("span");
            if (categories[i].severity != null) {
                const sev = categories[i].severity.text;
                severity.style.color =
                    sev === "None" ? "#F2DB83" :
                    sev === "Mild" ? "#c5e197" :
                    sev === "Moderate" ? "#fbca8c" :
                    sev === "Severe" ? "#ffb3ad" : "#F2DB83";
                severity.innerHTML = sev;
            } else {
                severity.innerHTML = "Unknown";
            }

            itemHeader.innerHTML = categories[i].category.text + " - ";
            itemHeader.appendChild(severity);
            itemHeader.innerHTML += ` - (${categories[i].guideItems.edges.length})`;
            container.appendChild(itemHeader);

            const listItems = document.createElement("ul");
            listItems.style.paddingLeft = "0px";
            listItems.style.margin = "0px 15px";
            listItems.style.marginLeft = "10px";

            if (isToggleableSections) listItems.classList.add("hide");

            for (let j = 0; j < categories[i].guideItems.edges.length; j++) {
                const currentItem = categories[i].guideItems.edges[j];
                const item = document.createElement("li");
                item.style.padding = "3px 0px";
                const text = document.createElement('a');
                text.style.color = "#FFF";
                text.textContent = currentItem.node.text.plainText;
                if (hidetext) text.classList.add('parentalspoiler');
                if (currentItem.node.isSpoiler && hideSpoilers) {
                    text.textContent = "Potential Spoilers";
                    text.style.textDecoration = "underline";
                    text.onclick = (e) => {
                        if (e.target.textContent == currentItem.node.text.plainText) {
                            e.target.textContent = "Potential Spoilers";
                            e.target.style.textDecoration = "underline";
                        } else {
                            e.target.textContent = currentItem.node.text.plainText;
                            e.target.style.textDecoration = "none";
                        }
                    };
                }
                item.appendChild(text);
                listItems.appendChild(item);
            }
            container.appendChild(listItems);
            advisoryDiv.appendChild(container);
            if (isToggleableSections) {
                itemHeader.onclick = () => {
                    let list = itemHeader.parentElement.querySelector("ul");
                    list.classList.toggle("hide");
                };
            }
        }
    }

    const checkAwardsData = (titleData) => {
        const wins = titleData.prestigiousAwardSummary?.wins ?? 0;
        const nominations = titleData.prestigiousAwardSummary?.nominations ?? 0;
        let totalWins = 0;
        let totalNominations = 0;

        if (titleData.awardNominationsCombined && titleData.awardNominationsCombined.length > 0) {
            titleData.awardNominationsCombined.forEach(nomination => {
                if (nomination.isWinner) {
                    totalWins++;
                } else {
                    totalNominations++;
                }
            });
        }

        // Return true if any award data exists
        return (wins > 0 || nominations > 0 || totalWins > 0 || totalNominations > 0);
    };

    const displayCastPhotos = (titleData, idToNameMap, namePhotos) => {
        const credits = titleData.credits.edges;
        if (!credits || credits.length === 0) {
            console.warn("No credits data found");
            return;
        }

        // Filter credits based on type setting
        let filteredCredits = credits;
        if (CAST_FILTER_TYPE === 'actors') {
            filteredCredits = credits.filter(edge => {
                const category = edge.node.category.id.toLowerCase();
                return category === 'actor' || category === 'actress';
            });
        }

        // Map credits to cast format with photos from fetchNames
        let cast = filteredCredits.map(edge => {
            const creditNode = edge.node;
            const personId = creditNode.name.id;
            const personName = idToNameMap[personId] || creditNode.name.nameText.text;

            let photoUrl = 'https://ptpimg.me/9wv452.png'; // Default

            const nameData = Object.values(namePhotos || {}).find(name => name.id === personId);
            if (nameData && nameData.primaryImage && nameData.primaryImage.url) {
                photoUrl = nameData.primaryImage.url;
            }

            return {
                photo: photoUrl,
                name: personName,
                imdbId: personId,
                role: creditNode.category.text || 'Unknown',
                link: `https://www.imdb.com/name/${personId}/`
            };
        });

        // Try to match with existing cast table on page
        const actorRows = document.querySelectorAll('.table--panel-like tbody tr');
        actorRows.forEach(row => {
            const actorNameElement = row.querySelector('.movie-page__actor-column a');
            const roleNameElement = row.querySelector('td:nth-child(2)');
            if (actorNameElement && roleNameElement) {
                const actorName = actorNameElement.textContent;
                const roleName = roleNameElement.textContent;
                const actorLink = actorNameElement.href;
                const castMember = cast.find(member => member.name === actorName);
                if (castMember) {
                    castMember.role = roleName;
                    castMember.link = actorLink;
                }
            }
        });

        // Filter and limit based on settings
        const filteredCast = cast
            .filter(person => person.role && person.role.trim())
            .slice(0, CAST_MAX_DISPLAY);

        const cDiv = document.createElement('div');
        cDiv.className = 'panel';
        cDiv.id = 'imdb_cast_photos';

        const titleText = CAST_FILTER_TYPE === 'actors' ? 'Cast' : 'Credits';
        cDiv.innerHTML = `<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/${imdbId}/fullcredits" target="_blank" rel="noopener noreferrer"><span style="color: rgb(242, 219, 131);">IMDb</span> ${titleText}</a></span></div>`;

        const castDiv = document.createElement('div');
        castDiv.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: flex-start; margin: -4px;';
        cDiv.appendChild(castDiv);

        const toggleButton = document.createElement('a');
        toggleButton.innerHTML = `(Show all ${titleText.toLowerCase()})`;
        toggleButton.href = 'javascript:void(0);';
        toggleButton.style.cssText = 'float:right; font-size:0.9em;';

        cDiv.firstElementChild.appendChild(toggleButton);

        toggleButton.addEventListener('click', function() {
            const cells = castDiv.getElementsByClassName('cast-member-cell');
            const cutoff = CAST_IMAGES_PER_ROW * CAST_DEFAULT_ROWS;
            const isHidden = cells[cutoff] && cells[cutoff].style.display === 'none';

            toggleButton.innerHTML = isHidden ? `(Hide extra ${titleText.toLowerCase()})` : `(Show all ${titleText.toLowerCase()})`;
            for (let i = cutoff; i < cells.length; i++) {
                cells[i].style.display = isHidden ? 'block' : 'none';
            }
        });

        const castTable = Array.from(document.querySelectorAll('.table--panel-like')).find(table => {
            const actorHeader = table.querySelector('th.movie-page__actor-column');
            return actorHeader && actorHeader.textContent.trim() === 'Actor';
        });

        if (castTable && castTable.parentNode) {
            castTable.parentNode.insertBefore(cDiv, castTable);
            castTable.parentNode.removeChild(castTable);
        }

        const bg = getComputedStyle(document.querySelector('.panel') || document.body).backgroundColor || '#2c2c2c';

        filteredCast.forEach((person, index) => {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cast-member-cell';
            castDiv.appendChild(cellDiv);

            const cellWidthPercent = 100 / CAST_IMAGES_PER_ROW;
            const aspectRatio = 0.7; // portrait aspect ratio (width/height)
            const cellHeightPx = Math.round(CONST_PIXEL_HEIGHT / aspectRatio);

            cellDiv.style.cssText = `
                box-sizing: border-box;
                width: calc(${cellWidthPercent}% - 8px);
                margin: 4px;
                text-align: center;
                background-color: ${bg};
                border-radius: 10px;
                overflow: hidden;
                font-size: 1em;
                vertical-align: top;
            `;

            if (index >= CAST_IMAGES_PER_ROW * CAST_DEFAULT_ROWS) {
                cellDiv.style.display = 'none';
            }

            cellDiv.innerHTML = `
                <a href="${person.link}" target="_blank">
                    <div style="width: 100%; height: ${cellHeightPx}px; overflow: hidden; background: #333; border-radius: 8px 8px 0 0; position: relative;">
                        <img style="width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block;"
                            src="${person.photo}"
                            alt="${person.name}"
                            onerror="this.onerror=null; this.src='https://ptpimg.me/9wv452.png'; this.style.objectFit='contain'; this.style.objectPosition='center';" />
                    </div>
                </a>
                <div style="padding: 8px;">
                    <div><a href="https://www.imdb.com/name/${person.imdbId}" target="_blank" style="color: #F2DB83; text-decoration: none; font-size: 0.9em;">${person.name}</a></div>
                    <div style="color: #ccc; font-size: 0.9em; margin-top: 2px;">${person.role}</div>
                </div>
            `;
        });

        if (filteredCast.length === 0) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = 'padding: 20px; text-align: center; color: #ccc;';
            messageDiv.textContent = `No ${CAST_FILTER_TYPE === 'actors' ? 'actor/actress' : 'credit'} data found`;
            castDiv.appendChild(messageDiv);
        }
    };

    // Initialize panels
    fetchIMDBData(imdbId).then(data => {
        const { titleData, processedSoundtracks, idToNameMap, namesData } = data;

        if (titleData) {
            if (SHOW_SIMILAR_MOVIES && titleData.moreLikeThisTitles) {
                displaySimilarMovies(titleData.moreLikeThisTitles.edges);
            } else if (SHOW_SIMILAR_MOVIES) {
                console.warn("No similar movies found");
            }

            if (SHOW_TECHNICAL_SPECIFICATIONS && titleData.technicalSpecifications) {
                displayTechnicalSpecifications({ data: { title: titleData } });
            } else if (SHOW_TECHNICAL_SPECIFICATIONS) {
                console.warn("No technical specifications found");
            }

            if (SHOW_BOX_OFFICE && (titleData.worldwideGross || titleData.domesticGross || titleData.internationalGross)) {
                displayBoxOffice({ data: { title: titleData } });
            } else if (SHOW_BOX_OFFICE) {
                console.warn("No box office data found");
            }

            if (SHOW_AWARDS) {
                // Check if there's actual awards data before displaying
                const hasAwardsData = checkAwardsData(titleData);
                if (hasAwardsData) {
                    displayAwardsData(titleData);
                } else {
                    console.warn("No awards data found - panel not displayed");
                }
            }

            if (SHOW_SOUNDTRACKS && processedSoundtracks.length > 0) {
                appendSongs(processedSoundtracks, idToNameMap);
            } else if (SHOW_SOUNDTRACKS) {
                console.warn("No soundtracks found");
            }
            if (SHOW_ALTERNATE_VERSIONS && titleData.alternateVersions && titleData.alternateVersions.edges.length > 0) {
                displayAlternateVersionsPanel(titleData.alternateVersions.edges);
            }
            if (SHOW_KEYWORDS && titleData.keywords && titleData.keywords.edges.length > 0) {
                displayKeywordsPanel(titleData.keywords.edges);
            } else {
                console.warn("No keywords found");
            }
            if (SHOW_PARENTS_GUIDE) {
                addParentalGuidePanel(titleData.parentsGuide.categories);
            }

            if (SHOW_CAST_PHOTOS && titleData.credits && titleData.credits.edges && titleData.credits.edges.length > 0) {
                displayCastPhotos(titleData, idToNameMap, namesData);
            }

            formatIMDbText()
        } else {
            console.error("Failed to retrieve valid title data");
        }
    }).catch(err => {
        console.error(err);
    });
})();