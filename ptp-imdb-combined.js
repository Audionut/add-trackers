// ==UserScript==
// @name         PTP - iMDB Combined Script
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.3.0
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
// @run-at       document-start
// @connect      api.graphql.imdb.com
// @connect      metacritic.com
// @connect      rottentomatoes.com
// @connect      letterboxd.com
// @connect      query.wikidata.org
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

let SHOW_SIMILAR_MOVIES = true;
let PLACE_UNDER_CAST = false;
let SHOW_TECHNICAL_SPECIFICATIONS = true;
let SHOW_BOX_OFFICE = true;
let SHOW_AWARDS = true;
let SHOW_SOUNDTRACKS = true;
let SHOW_IMDB_TRAILERS = false;
let CACHE_EXPIRY_DAYS = 7;
let NEW_MOVIE_TTL_DAYS = 3;
let SHOW_ALTERNATE_VERSIONS = true;
let ALTERNATE_VERSIONS_PANEL_OPEN = false;
let SHOW_KEYWORDS = true;
let KEYWORDS_PANEL_OPEN = false;
let SHOW_PARENTS_GUIDE = true;
let ENABLE_IMDB_RATINGS_PANEL = false;
let SHOW_RATINGS_METACRITIC = true;
let SHOW_RATINGS_METACRITIC_USER_SCORE = true;
let SHOW_RATINGS_METACRITIC_BREAKDOWN = true;
let SHOW_RATINGS_AGGREGATE = false;
let RATINGS_AGGREGATE_DROP_EXTREMES = false;
let RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES = false;
let RATINGS_AGGREGATE_METHOD = 'mean';
let RATINGS_AGGREGATE_SOURCE_SETTINGS = {
    imdb: { enabled: true, option: 'displayed', weight: 1 },
    ptp: { enabled: true, option: 'user', weight: 1 },
    metacritic: { enabled: true, option: 'critic', weight: 1 },
    rottenTomatoes: { enabled: false, option: 'critic', weight: 1 },
    tmdb: { enabled: false, option: 'default', weight: 1 },
    letterboxd: { enabled: false, option: 'user', weight: 1 }
};
let SHOW_RATINGS_IMDB_METER = true;
let SHOW_RATINGS_ROTTEN_TOMATOES = false;
let SHOW_RATINGS_TMDB = false;
let SHOW_RATINGS_LETTERBOXD = false;
let SHOW_RATINGS_LETTERBOXD_HISTOGRAM = false;
let SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE = false;
let USE_SQUEEZED_RATINGS_TILES = false;
let SHOW_IMDB_VOTE_HISTOGRAM = false;
let SHOW_IMDB_WEIGHTED_SCORE = false;
let SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE = false;
let SHOW_IMDB_DEMOGRAPHICS = false;
let SHOW_IMDB_COUNTRY_AVERAGES = false;
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
let IMDB_DEMOGRAPHICS_PANEL_HEIGHT = 216;
let CAST_IMAGES_PER_ROW = 4;
let CAST_DEFAULT_ROWS = 2;
let DISABLE_CUSTOM_COLORS = false;
let IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED = {
    ageOnly: true,
    genderOnly: true,
    genderAge: true,
    userCategoryOnly: true,
    countryOnly: true,
    other: true
};
let IMDB_DEMOGRAPHIC_GENDERS_ENABLED = {
    FEMALE: true,
    MALE: true
};
let IMDB_DEMOGRAPHIC_AGES_ENABLED = {
    AGE_UNDER_18: true,
    AGE_18_29: true,
    AGE_30_44: true,
    AGE_45_PLUS: true
};
let IMDB_DEMOGRAPHIC_SORT_BY = 'label';
let IMDB_DEMOGRAPHIC_SORT_DIRECTION = 'asc';
let IMDB_WEIGHTED_SCORE_TYPE = 'trimmed5';
let IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY = 'gender:FEMALE';
const IMDB_TRAILER_PREVIEW_HEIGHT = 200;
const IMDB_TRAILER_FALLBACK_ASPECT_RATIO = 16 / 9;
const IMDB_TRAILER_MIN_ASPECT_RATIO = 1.2;
const IMDB_TRAILER_MAX_ASPECT_RATIO = 2.5;
const PTP_ID = (() => {
    const candidate = typeof groupid !== 'undefined'
        ? groupid
        : new URLSearchParams(window.location.search).get('id');
    const parsed = parseInt(candidate, 10);
    return Number.isFinite(parsed) ? parsed : null;
})();

const DEFAULT_IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED = {
    ageOnly: true,
    genderOnly: true,
    genderAge: true,
    userCategoryOnly: true,
    countryOnly: true,
    other: true
};
const DEFAULT_IMDB_DEMOGRAPHIC_GENDERS_ENABLED = {
    FEMALE: true,
    MALE: true
};
const DEFAULT_IMDB_DEMOGRAPHIC_AGES_ENABLED = {
    AGE_UNDER_18: true,
    AGE_18_29: true,
    AGE_30_44: true,
    AGE_45_PLUS: true
};
const DEFAULT_IMDB_DEMOGRAPHIC_SORT_BY = 'label';
const DEFAULT_IMDB_DEMOGRAPHIC_SORT_DIRECTION = 'asc';
const IMDB_DEMOGRAPHIC_LABEL_FIELDS = ['userCategory', 'gender', 'age', 'country'];
const DEFAULT_IMDB_WEIGHTED_SCORE_TYPE = 'trimmed5';
const DEFAULT_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY = 'gender:FEMALE';
const IMDB_WEIGHTED_SCORE_TYPE_LABELS = {
    trimmed5: 'Trimmed mean 5%',
    trimmed10: 'Trimmed mean 10%',
    median: 'Weighted median',
    mean: 'Mean',
    bayesian: 'Bayesian blend'
};
const LETTERBOXD_TRANSIENT_ERROR_RETRY_MS = 5 * 60 * 1000;
const IMDB_SCORE_OVERRIDE_OPTIONS = [
    { value: 'gender:FEMALE', label: 'Female' },
    { value: 'gender:MALE', label: 'Male' },
    { value: 'age:AGE_UNDER_18', label: 'UNDER-18' },
    { value: 'age:AGE_18_29', label: '18-29' },
    { value: 'age:AGE_30_44', label: '30-44' },
    { value: 'age:AGE_45_PLUS', label: '45-PLUS' },
    { value: 'gender:FEMALE|age:AGE_UNDER_18', label: 'Female / UNDER-18' },
    { value: 'gender:FEMALE|age:AGE_18_29', label: 'Female / 18-29' },
    { value: 'gender:FEMALE|age:AGE_30_44', label: 'Female / 30-44' },
    { value: 'gender:FEMALE|age:AGE_45_PLUS', label: 'Female / 45-PLUS' },
    { value: 'gender:MALE|age:AGE_UNDER_18', label: 'Male / UNDER-18' },
    { value: 'gender:MALE|age:AGE_18_29', label: 'Male / 18-29' },
    { value: 'gender:MALE|age:AGE_30_44', label: 'Male / 30-44' },
    { value: 'gender:MALE|age:AGE_45_PLUS', label: 'Male / 45-PLUS' }
];
const DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS = {
    imdb: { enabled: true, option: 'displayed', weight: 1 },
    ptp: { enabled: true, option: 'user', weight: 1 },
    metacritic: { enabled: true, option: 'critic', weight: 1 },
    rottenTomatoes: { enabled: false, option: 'critic', weight: 1 },
    tmdb: { enabled: false, option: 'default', weight: 1 },
    letterboxd: { enabled: false, option: 'user', weight: 1 }
};
const RATINGS_AGGREGATE_SOURCE_OPTION_DEFINITIONS = {
    imdb: [
        { value: 'displayed', label: 'Displayed users score' },
        { value: 'overall', label: 'Overall users score' },
        { value: 'demographic', label: 'Selected demographic score' },
        { value: 'weighted_trimmed5', label: 'Weighted trimmed mean 5%' },
        { value: 'weighted_trimmed10', label: 'Weighted trimmed mean 10%' },
        { value: 'weighted_median', label: 'Weighted median' },
        { value: 'weighted_mean', label: 'Weighted mean' },
        { value: 'weighted_bayesian', label: 'Weighted Bayesian blend' }
    ],
    ptp: [
        { value: 'user', label: 'User score' }
    ],
    metacritic: [
        { value: 'critic', label: 'Critic score' },
        { value: 'user', label: 'User score' }
    ],
    rottenTomatoes: [
        { value: 'critic', label: 'Critic score' },
        { value: 'user', label: 'User score' }
    ],
    tmdb: [
        { value: 'default', label: 'Vote average' }
    ],
    letterboxd: [
        { value: 'user', label: 'User score' },
        { value: 'weighted_trimmed5', label: 'Weighted trimmed mean 5%' },
        { value: 'weighted_trimmed10', label: 'Weighted trimmed mean 10%' },
        { value: 'weighted_median', label: 'Weighted median' },
        { value: 'weighted_mean', label: 'Weighted mean' },
        { value: 'weighted_bayesian', label: 'Weighted Bayesian blend' }
    ]
};
const RATINGS_AGGREGATE_SOURCE_LABELS = {
    imdb: 'IMDb',
    ptp: 'PTP',
    metacritic: 'Metacritic',
    rottenTomatoes: 'Rotten Tomatoes',
    tmdb: 'TMDb',
    letterboxd: 'Letterboxd'
};
const RATINGS_AGGREGATE_METHOD_LABELS = {
    average: 'Average',
    mean: 'Mean',
    median: 'Median'
};

const saveSettings = () => {
    GM.setValue('SHOW_SIMILAR_MOVIES', SHOW_SIMILAR_MOVIES);
    GM.setValue('PLACE_UNDER_CAST', PLACE_UNDER_CAST);
    GM.setValue('SHOW_TECHNICAL_SPECIFICATIONS', SHOW_TECHNICAL_SPECIFICATIONS);
    GM.setValue('SHOW_BOX_OFFICE', SHOW_BOX_OFFICE);
    GM.setValue('SHOW_AWARDS', SHOW_AWARDS);
    GM.setValue('SHOW_SOUNDTRACKS', SHOW_SOUNDTRACKS);
    GM.setValue('SHOW_IMDB_TRAILERS', SHOW_IMDB_TRAILERS);
    GM.setValue('CACHE_EXPIRY_DAYS', CACHE_EXPIRY_DAYS);
    GM.setValue('NEW_MOVIE_TTL_DAYS', NEW_MOVIE_TTL_DAYS);
    GM.setValue('SHOW_ALTERNATE_VERSIONS', SHOW_ALTERNATE_VERSIONS);
    GM.setValue('ALTERNATE_VERSIONS_PANEL_OPEN', ALTERNATE_VERSIONS_PANEL_OPEN);
    GM.setValue('SHOW_KEYWORDS', SHOW_KEYWORDS);
    GM.setValue('KEYWORDS_PANEL_OPEN', KEYWORDS_PANEL_OPEN);
    GM.setValue('SHOW_PARENTS_GUIDE', SHOW_PARENTS_GUIDE);
    GM.setValue('ENABLE_IMDB_RATINGS_PANEL', ENABLE_IMDB_RATINGS_PANEL);
    GM.setValue('SHOW_RATINGS_METACRITIC', SHOW_RATINGS_METACRITIC);
    GM.setValue('SHOW_RATINGS_METACRITIC_USER_SCORE', SHOW_RATINGS_METACRITIC_USER_SCORE);
    GM.setValue('SHOW_RATINGS_METACRITIC_BREAKDOWN', SHOW_RATINGS_METACRITIC_BREAKDOWN);
    GM.setValue('SHOW_RATINGS_AGGREGATE', SHOW_RATINGS_AGGREGATE);
    GM.setValue('RATINGS_AGGREGATE_DROP_EXTREMES', RATINGS_AGGREGATE_DROP_EXTREMES);
    GM.setValue('RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES', RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES);
    GM.setValue('RATINGS_AGGREGATE_METHOD', RATINGS_AGGREGATE_METHOD);
    GM.setValue('RATINGS_AGGREGATE_SOURCE_SETTINGS', RATINGS_AGGREGATE_SOURCE_SETTINGS);
    GM.setValue('SHOW_RATINGS_IMDB_METER', SHOW_RATINGS_IMDB_METER);
    GM.setValue('SHOW_RATINGS_ROTTEN_TOMATOES', SHOW_RATINGS_ROTTEN_TOMATOES);
    GM.setValue('SHOW_RATINGS_TMDB', SHOW_RATINGS_TMDB);
    GM.setValue('SHOW_RATINGS_LETTERBOXD', SHOW_RATINGS_LETTERBOXD);
    GM.setValue('SHOW_RATINGS_LETTERBOXD_HISTOGRAM', SHOW_RATINGS_LETTERBOXD_HISTOGRAM);
    GM.setValue('SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE', SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE);
    GM.setValue('SHOW_IMDB_VOTE_HISTOGRAM', SHOW_IMDB_VOTE_HISTOGRAM);
    GM.setValue('SHOW_IMDB_WEIGHTED_SCORE', SHOW_IMDB_WEIGHTED_SCORE);
    GM.setValue('SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE', SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE);
    GM.setValue('SHOW_IMDB_DEMOGRAPHICS', SHOW_IMDB_DEMOGRAPHICS);
    GM.setValue('SHOW_IMDB_COUNTRY_AVERAGES', SHOW_IMDB_COUNTRY_AVERAGES);
    GM.setValue('isPanelVisible', isPanelVisible);
    GM.setValue('isToggleableSections', isToggleableSections);
    GM.setValue('hideSpoilers', hideSpoilers);
    GM.setValue('hidetext', hidetext);
    GM.setValue('SHOW_CAST_PHOTOS', SHOW_CAST_PHOTOS);
    GM.setValue('USE_SQUEEZED_RATINGS_TILES', USE_SQUEEZED_RATINGS_TILES);
    GM.setValue('CAST_FILTER_TYPE', CAST_FILTER_TYPE);
    GM.setValue('CAST_MAX_DISPLAY', CAST_MAX_DISPLAY);
    GM.setValue('CAST_IMAGES_PER_ROW', CAST_IMAGES_PER_ROW);
    GM.setValue('CAST_DEFAULT_ROWS', CAST_DEFAULT_ROWS);
    GM.setValue('CONST_PIXEL_HEIGHT', CONST_PIXEL_HEIGHT);
    GM.setValue('IMDB_DEMOGRAPHICS_PANEL_HEIGHT', IMDB_DEMOGRAPHICS_PANEL_HEIGHT);
    GM.setValue('TECHSPECS_LOCATION', TECHSPECS_LOCATION);
    GM.setValue('BOXOFFICE_LOCATION', BOXOFFICE_LOCATION);
    GM.setValue('AWARDS_LOCATION', AWARDS_LOCATION);
    GM.setValue('EXISTING_IMDB_TAGS', EXISTING_IMDB_TAGS);
    GM.setValue('SIMILAR_MOVIES_LOCATION', SIMILAR_MOVIES_LOCATION);
    GM.setValue('PARENTS_LOCATION', PARENTS_LOCATION);
    GM.setValue('DISABLE_CUSTOM_COLORS', DISABLE_CUSTOM_COLORS);
    GM.setValue('IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED', IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED);
    GM.setValue('IMDB_DEMOGRAPHIC_GENDERS_ENABLED', IMDB_DEMOGRAPHIC_GENDERS_ENABLED);
    GM.setValue('IMDB_DEMOGRAPHIC_AGES_ENABLED', IMDB_DEMOGRAPHIC_AGES_ENABLED);
    GM.setValue('IMDB_DEMOGRAPHIC_SORT_BY', IMDB_DEMOGRAPHIC_SORT_BY);
    GM.setValue('IMDB_DEMOGRAPHIC_SORT_DIRECTION', IMDB_DEMOGRAPHIC_SORT_DIRECTION);
    GM.setValue('IMDB_WEIGHTED_SCORE_TYPE', IMDB_WEIGHTED_SCORE_TYPE);
    GM.setValue('IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY', IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY);
};

const loadSettings = async () => {
    SHOW_SIMILAR_MOVIES = await GM.getValue('SHOW_SIMILAR_MOVIES', true);
    PLACE_UNDER_CAST = await GM.getValue('PLACE_UNDER_CAST', false);
    SHOW_TECHNICAL_SPECIFICATIONS = await GM.getValue('SHOW_TECHNICAL_SPECIFICATIONS', true);
    SHOW_BOX_OFFICE = await GM.getValue('SHOW_BOX_OFFICE', true);
    SHOW_AWARDS = await GM.getValue('SHOW_AWARDS', true);
    SHOW_SOUNDTRACKS = await GM.getValue('SHOW_SOUNDTRACKS', true);
    SHOW_IMDB_TRAILERS = await GM.getValue('SHOW_IMDB_TRAILERS', true);
    CACHE_EXPIRY_DAYS = await GM.getValue('CACHE_EXPIRY_DAYS', 14);
    NEW_MOVIE_TTL_DAYS = await GM.getValue('NEW_MOVIE_TTL_DAYS', 3);
    SHOW_ALTERNATE_VERSIONS = await GM.getValue('SHOW_ALTERNATE_VERSIONS', true);
    ALTERNATE_VERSIONS_PANEL_OPEN = await GM.getValue('ALTERNATE_VERSIONS_PANEL_OPEN', false);
    SHOW_KEYWORDS = await GM.getValue('SHOW_KEYWORDS', true);
    KEYWORDS_PANEL_OPEN = await GM.getValue('KEYWORDS_PANEL_OPEN', false);
    SHOW_PARENTS_GUIDE = await GM.getValue('SHOW_PARENTS_GUIDE', true);
    ENABLE_IMDB_RATINGS_PANEL = await GM.getValue('ENABLE_IMDB_RATINGS_PANEL', false);
    SHOW_RATINGS_METACRITIC = await GM.getValue('SHOW_RATINGS_METACRITIC', true);
    SHOW_RATINGS_METACRITIC_USER_SCORE = await GM.getValue('SHOW_RATINGS_METACRITIC_USER_SCORE', true);
    SHOW_RATINGS_METACRITIC_BREAKDOWN = await GM.getValue('SHOW_RATINGS_METACRITIC_BREAKDOWN', true);
    SHOW_RATINGS_AGGREGATE = await GM.getValue('SHOW_RATINGS_AGGREGATE', false);
    RATINGS_AGGREGATE_DROP_EXTREMES = await GM.getValue('RATINGS_AGGREGATE_DROP_EXTREMES', false);
    RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES = await GM.getValue('RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES', false);
    RATINGS_AGGREGATE_METHOD = await GM.getValue('RATINGS_AGGREGATE_METHOD', 'mean');
    if (!(RATINGS_AGGREGATE_METHOD in RATINGS_AGGREGATE_METHOD_LABELS)) {
        RATINGS_AGGREGATE_METHOD = 'mean';
    }
    RATINGS_AGGREGATE_SOURCE_SETTINGS = normalizeAggregateSourceSettings(
        await GM.getValue('RATINGS_AGGREGATE_SOURCE_SETTINGS', DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS)
    );
    SHOW_RATINGS_IMDB_METER = await GM.getValue('SHOW_RATINGS_IMDB_METER', true);
    SHOW_RATINGS_ROTTEN_TOMATOES = await GM.getValue('SHOW_RATINGS_ROTTEN_TOMATOES', false);
    SHOW_RATINGS_TMDB = await GM.getValue('SHOW_RATINGS_TMDB', false);
    SHOW_RATINGS_LETTERBOXD = await GM.getValue('SHOW_RATINGS_LETTERBOXD', false);
    SHOW_RATINGS_LETTERBOXD_HISTOGRAM = await GM.getValue('SHOW_RATINGS_LETTERBOXD_HISTOGRAM', false);
    SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE = await GM.getValue(
        'SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE',
        await GM.getValue('SHOW_RATINGS_LETTERBOXD_HISTOGRAM', false)
    );
    SHOW_IMDB_VOTE_HISTOGRAM = await GM.getValue('SHOW_IMDB_VOTE_HISTOGRAM', false);
    SHOW_IMDB_WEIGHTED_SCORE = await GM.getValue('SHOW_IMDB_WEIGHTED_SCORE', false);
    SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE = await GM.getValue('SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE', false);
    SHOW_IMDB_DEMOGRAPHICS = await GM.getValue('SHOW_IMDB_DEMOGRAPHICS', false);
    SHOW_IMDB_COUNTRY_AVERAGES = await GM.getValue('SHOW_IMDB_COUNTRY_AVERAGES', false);
    isPanelVisible = await GM.getValue('isPanelVisible', true);
    isToggleableSections = await GM.getValue('isToggleableSections', true);
    hideSpoilers = await GM.getValue('hideSpoilers', true);
    hidetext = await GM.getValue('hidetext', false);
    SHOW_CAST_PHOTOS = await GM.getValue('SHOW_CAST_PHOTOS', true);
    USE_SQUEEZED_RATINGS_TILES = await GM.getValue('USE_SQUEEZED_RATINGS_TILES', false);
    CAST_FILTER_TYPE = await GM.getValue('CAST_FILTER_TYPE', 'actors');
    CAST_MAX_DISPLAY = await GM.getValue('CAST_MAX_DISPLAY', 128);
    CAST_IMAGES_PER_ROW = await GM.getValue('CAST_IMAGES_PER_ROW', 4);
    CAST_DEFAULT_ROWS = await GM.getValue('CAST_DEFAULT_ROWS', 2);
    CONST_PIXEL_HEIGHT = await GM.getValue('CONST_PIXEL_HEIGHT', 300);
    IMDB_DEMOGRAPHICS_PANEL_HEIGHT = await GM.getValue('IMDB_DEMOGRAPHICS_PANEL_HEIGHT', 216);
    TECHSPECS_LOCATION = await GM.getValue('TECHSPECS_LOCATION', 1);
    BOXOFFICE_LOCATION = await GM.getValue('BOXOFFICE_LOCATION', 2);
    AWARDS_LOCATION = await GM.getValue('AWARDS_LOCATION', 4);
    EXISTING_IMDB_TAGS = await GM.getValue('EXISTING_IMDB_TAGS', 6);
    SIMILAR_MOVIES_LOCATION = await GM.getValue('SIMILAR_MOVIES_LOCATION', 5);
    PARENTS_LOCATION = await GM.getValue('PARENTS_LOCATION', 3);
    DISABLE_CUSTOM_COLORS = await GM.getValue('DISABLE_CUSTOM_COLORS', false);

    const storedRowTypes = await GM.getValue('IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED', DEFAULT_IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED);
    IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED = normalizeDemographicOptionMap(storedRowTypes, DEFAULT_IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED);

    const storedGenders = await GM.getValue('IMDB_DEMOGRAPHIC_GENDERS_ENABLED', DEFAULT_IMDB_DEMOGRAPHIC_GENDERS_ENABLED);
    IMDB_DEMOGRAPHIC_GENDERS_ENABLED = normalizeDemographicOptionMap(storedGenders, DEFAULT_IMDB_DEMOGRAPHIC_GENDERS_ENABLED);

    const storedAges = await GM.getValue('IMDB_DEMOGRAPHIC_AGES_ENABLED', DEFAULT_IMDB_DEMOGRAPHIC_AGES_ENABLED);
    IMDB_DEMOGRAPHIC_AGES_ENABLED = normalizeDemographicOptionMap(storedAges, DEFAULT_IMDB_DEMOGRAPHIC_AGES_ENABLED);

    const storedSortBy = await GM.getValue('IMDB_DEMOGRAPHIC_SORT_BY', DEFAULT_IMDB_DEMOGRAPHIC_SORT_BY);
    IMDB_DEMOGRAPHIC_SORT_BY = ['label', 'rating', 'votes'].includes(storedSortBy) ? storedSortBy : DEFAULT_IMDB_DEMOGRAPHIC_SORT_BY;

    const storedSortDirection = await GM.getValue('IMDB_DEMOGRAPHIC_SORT_DIRECTION', DEFAULT_IMDB_DEMOGRAPHIC_SORT_DIRECTION);
    IMDB_DEMOGRAPHIC_SORT_DIRECTION = ['asc', 'desc'].includes(storedSortDirection) ? storedSortDirection : DEFAULT_IMDB_DEMOGRAPHIC_SORT_DIRECTION;

    const storedWeightedScoreType = await GM.getValue('IMDB_WEIGHTED_SCORE_TYPE', DEFAULT_IMDB_WEIGHTED_SCORE_TYPE);
    IMDB_WEIGHTED_SCORE_TYPE = storedWeightedScoreType in IMDB_WEIGHTED_SCORE_TYPE_LABELS
        ? storedWeightedScoreType
        : DEFAULT_IMDB_WEIGHTED_SCORE_TYPE;

    const storedDemographicScoreOverrideKey = await GM.getValue('IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY', DEFAULT_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY);
    IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY = IMDB_SCORE_OVERRIDE_OPTIONS.some((option) => option.value === storedDemographicScoreOverrideKey)
        ? storedDemographicScoreOverrideKey
        : DEFAULT_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY;
};

const IMDB_ACCENT_COLOR = '#F2DB83';
const AWARDS_HIGHLIGHT_COLOR = 'yellow';
const PARENTS_GUIDE_SEVERITY_COLORS = {
    None: IMDB_ACCENT_COLOR,
    Mild: '#c5e197',
    Moderate: '#fbca8c',
    Severe: '#ffb3ad'
};

const getColorStyleAttr = (color) => DISABLE_CUSTOM_COLORS ? '' : ` style="color: ${color};"`;
const getInlineColorPrefix = (color) => DISABLE_CUSTOM_COLORS ? '' : `color: ${color}; `;

const applyColorIfEnabled = (element, color) => {
    if (!DISABLE_CUSTOM_COLORS && element) {
        element.style.color = color;
    }
};

const getIMDbLabelHTML = (suffix = '') => {
    const imdbCore = DISABLE_CUSTOM_COLORS ? 'IMDb' : `<span style="color: ${IMDB_ACCENT_COLOR};">IMDb</span>`;
    return suffix ? `${imdbCore} ${suffix}` : imdbCore;
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
                width: min(1100px, 92vw);
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

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
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
                            <input type="checkbox" id="show-imdb-trailers" style="margin-right: 8px;">
                            <span>Replace Trailer with IMDb Video</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-cast-photos" style="margin-right: 8px;">
                            <span>Credit Photos</span>
                        </label>

                        <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                            <input type="checkbox" id="disable-custom-colors" style="margin-right: 8px;">
                            <span>Use default site colors</span>
                        </label>
                        <p style="margin: 0 0 12px 26px; font-size: 0.85em; color: #ccc;">
                            Prevent the script from applying custom text colors.
                        </p>

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

                        <h3 style="color: #F2DB83; margin: 24px 0 10px;">Parents Guide</h3>

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
                    </div>

                    <!-- Ratings + Parents Column -->
                    <div>
                        <h3 style="color: #F2DB83; margin-top: 0;">Ratings Box</h3>

                        <label style="display: block; margin-bottom: 12px; cursor: pointer;">
                            <input type="checkbox" id="enable-imdb-ratings-panel" style="margin-right: 8px;">
                            <span>Enable IMDb Ratings + Ratings Panel Modifications</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-ratings-metacritic" style="margin-right: 8px;">
                            <span>Show Metacritic</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="show-ratings-metacritic-user-score" style="margin-right: 8px;">
                            <span>Show Metacritic User Score</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="show-ratings-metacritic-breakdown" style="margin-right: 8px;">
                            <span>Show Metacritic Pos/Mix/Neg Breakdown</span>
                        </label>

                        <details style="margin: 0 0 16px 0; border: 1px solid #555; border-radius: 6px; background: #383838;">
                            <summary style="cursor: pointer; padding: 10px 12px;">
                                <input type="checkbox" id="show-ratings-aggregate" style="margin-right: 8px;">
                                <span>Show Aggregate Score Tile</span>
                            </summary>
                            <div style="padding: 0 12px 12px; border-top: 1px solid #555;">
                                <label style="display: block; margin: 12px 0 10px; cursor: pointer;">
                                    <input type="checkbox" id="ratings-aggregate-drop-extremes" style="margin-right: 8px;">
                                    <span>Discard Highest and Lowest</span>
                                </label>
                                <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                                    <input type="checkbox" id="ratings-aggregate-keep-rotten-tomatoes" style="margin-right: 8px;">
                                    <span>Never Discard Rotten Tomatoes</span>
                                </label>
                                <label style="display: block; margin-bottom: 10px;">
                                    <span style="display: block; margin-bottom: 5px;">Aggregate method:</span>
                                    <select id="ratings-aggregate-method" style="
                                        width: 100%;
                                        padding: 5px;
                                        background: #444;
                                        color: #fff;
                                        border: 1px solid #666;
                                        border-radius: 3px;
                                    ">
                                        <option value="average">Average</option>
                                        <option value="mean">Mean</option>
                                        <option value="median">Median</option>
                                    </select>
                                </label>
                                <div style="display: grid; gap: 8px; margin-top: 12px;">
                                    <div style="font-weight: bold;">
                                        Aggregate sources
                                        <span title="Weight controls how strongly a source influences the aggregate. Higher values matter more for Mean and Median. Average ignores weights." style="display: inline-block; margin-left: 6px; width: 16px; height: 16px; line-height: 16px; text-align: center; border: 1px solid #777; border-radius: 50%; font-size: 11px; color: #ccc; cursor: help;">?</span>
                                    </div>
                                    <div style="display: grid; gap: 8px;">
                                        <div style="display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 72px; gap: 8px; align-items: center;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="aggregate-source-imdb-enabled" style="margin-right: 8px;">IMDb</label>
                                            <select id="aggregate-source-imdb-option" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;">${buildAggregateSourceSelectHtml('imdb')}</select>
                                            <input type="number" id="aggregate-source-imdb-weight" min="0.1" max="10" step="0.1" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;" title="Higher weight increases this source's influence for Mean and Median. Average ignores weights.">
                                        </div>
                                        <div style="display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 72px; gap: 8px; align-items: center;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="aggregate-source-ptp-enabled" style="margin-right: 8px;">PTP</label>
                                            <select id="aggregate-source-ptp-option" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;">${buildAggregateSourceSelectHtml('ptp')}</select>
                                            <input type="number" id="aggregate-source-ptp-weight" min="0.1" max="10" step="0.1" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;" title="Higher weight increases this source's influence for Mean and Median. Average ignores weights.">
                                        </div>
                                        <div style="display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 72px; gap: 8px; align-items: center;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="aggregate-source-metacritic-enabled" style="margin-right: 8px;">Metacritic</label>
                                            <select id="aggregate-source-metacritic-option" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;">${buildAggregateSourceSelectHtml('metacritic')}</select>
                                            <input type="number" id="aggregate-source-metacritic-weight" min="0.1" max="10" step="0.1" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;" title="Higher weight increases this source's influence for Mean and Median. Average ignores weights.">
                                        </div>
                                        <div style="display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 72px; gap: 8px; align-items: center;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="aggregate-source-rottenTomatoes-enabled" style="margin-right: 8px;">RT</label>
                                            <select id="aggregate-source-rottenTomatoes-option" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;">${buildAggregateSourceSelectHtml('rottenTomatoes')}</select>
                                            <input type="number" id="aggregate-source-rottenTomatoes-weight" min="0.1" max="10" step="0.1" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;" title="Higher weight increases this source's influence for Mean and Median. Average ignores weights.">
                                        </div>
                                        <div style="display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 72px; gap: 8px; align-items: center;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="aggregate-source-tmdb-enabled" style="margin-right: 8px;">TMDb</label>
                                            <select id="aggregate-source-tmdb-option" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;">${buildAggregateSourceSelectHtml('tmdb')}</select>
                                            <input type="number" id="aggregate-source-tmdb-weight" min="0.1" max="10" step="0.1" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;" title="Higher weight increases this source's influence for Mean and Median. Average ignores weights.">
                                        </div>
                                        <div style="display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 72px; gap: 8px; align-items: center;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="aggregate-source-letterboxd-enabled" style="margin-right: 8px;">Letterboxd</label>
                                            <select id="aggregate-source-letterboxd-option" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;">${buildAggregateSourceSelectHtml('letterboxd')}</select>
                                            <input type="number" id="aggregate-source-letterboxd-weight" min="0.1" max="10" step="0.1" style="width: 100%; padding: 5px; background: #444; color: #fff; border: 1px solid #666; border-radius: 3px;" title="Higher weight increases this source's influence for Mean and Median. Average ignores weights.">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-ratings-imdb-meter" style="margin-right: 8px;">
                            <span>Show IMDb Meter</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-ratings-rotten-tomatoes" style="margin-right: 8px;">
                            <span>Show Rotten Tomatoes</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-ratings-tmdb" style="margin-right: 8px;">
                            <span>Show TMDb</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-ratings-letterboxd" style="margin-right: 8px;">
                            <span>Show Letterboxd</span>
                        </label>

                        <label style="display: block; margin-bottom: 4px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="show-ratings-letterboxd-weighted-score" style="margin-right: 8px;">
                            <span>Show Letterboxd Weighting</span>
                        </label>
                        <p style="margin: 0 0 12px 26px; font-size: 0.85em; color: #ccc;">
                            Uses the IMDb weighting type for the Letterboxd weighted badge.
                        </p>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer; margin-left: 20px;">
                            <input type="checkbox" id="show-ratings-letterboxd-histogram" style="margin-right: 8px;">
                            <span>Show Letterboxd Histogram</span>
                        </label>

                        <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                            <input type="checkbox" id="show-imdb-vote-histogram" style="margin-right: 8px;">
                            <span>Show IMDb Vote Histogram</span>
                        </label>

                        <details style="margin: 0 0 14px 20px; border: 1px solid #555; border-radius: 6px; background: #383838;">
                            <summary style="cursor: pointer; padding: 10px 12px;">
                                <input type="checkbox" id="show-imdb-weighted-score" style="margin-right: 8px;">
                                <span>Show Weighted IMDb Score</span>
                                <span title="Calculates an alternate IMDb score from the vote histogram instead of using only the default IMDb aggregate." style="display: inline-block; margin-left: 6px; width: 16px; height: 16px; line-height: 16px; text-align: center; border: 1px solid #777; border-radius: 50%; font-size: 11px; color: #ccc; cursor: help;">?</span>
                            </summary>
                            <div style="padding: 0 12px 12px; border-top: 1px solid #555;">
                                <label style="display: block; margin-top: 12px;">
                                    <span style="display: block; margin-bottom: 5px;">Active weighting type:
                                        <span title="Mean: plain average of all votes.&#10;Trimmed mean 5%: removes the lowest and highest 5% before averaging.&#10;Trimmed mean 10%: removes the lowest and highest 10% before averaging.&#10;Weighted median: the middle vote in the weighted distribution.&#10;Bayesian blend: blends the histogram mean toward a fixed prior for extra stability." style="display: inline-block; margin-left: 6px; width: 16px; height: 16px; line-height: 16px; text-align: center; border: 1px solid #777; border-radius: 50%; font-size: 11px; color: #ccc; cursor: help;">?</span>
                                    </span>
                                    <select id="imdb-weighted-score-type" style="
                                        width: 100%;
                                        padding: 5px;
                                        background: #444;
                                        color: #fff;
                                        border: 1px solid #666;
                                        border-radius: 3px;
                                    ">
                                        <option value="trimmed5">Trimmed mean 5%</option>
                                        <option value="trimmed10">Trimmed mean 10%</option>
                                        <option value="median">Weighted median</option>
                                        <option value="mean">Mean</option>
                                        <option value="bayesian">Bayesian blend</option>
                                    </select>
                                </label>
                            </div>
                        </details>

                        <details style="margin: 0 0 14px 20px; border: 1px solid #555; border-radius: 6px; background: #383838;">
                            <summary style="cursor: pointer; padding: 10px 12px;">
                                <input type="checkbox" id="show-imdb-demographic-score-override" style="margin-right: 8px;">
                                <span>Replace IMDb User Score With Demographic Score</span>
                                <span title="Uses a selected IMDb demographic score in the main IMDb Users card instead of the overall IMDb users aggregate." style="display: inline-block; margin-left: 6px; width: 16px; height: 16px; line-height: 16px; text-align: center; border: 1px solid #777; border-radius: 50%; font-size: 11px; color: #ccc; cursor: help;">?</span>
                            </summary>
                            <div style="padding: 0 12px 12px; border-top: 1px solid #555;">
                                <label style="display: block; margin-top: 12px;">
                                    <span style="display: block; margin-bottom: 5px;">Demographic source:</span>
                                    <select id="imdb-demographic-score-override-key" style="
                                        width: 100%;
                                        padding: 5px;
                                        background: #444;
                                        color: #fff;
                                        border: 1px solid #666;
                                        border-radius: 3px;
                                    ">
                                        <option value="gender:FEMALE">Female</option>
                                        <option value="gender:MALE">Male</option>
                                        <option value="age:AGE_UNDER_18">UNDER-18</option>
                                        <option value="age:AGE_18_29">18-29</option>
                                        <option value="age:AGE_30_44">30-44</option>
                                        <option value="age:AGE_45_PLUS">45-PLUS</option>
                                        <option value="gender:FEMALE|age:AGE_UNDER_18">Female / UNDER-18</option>
                                        <option value="gender:FEMALE|age:AGE_18_29">Female / 18-29</option>
                                        <option value="gender:FEMALE|age:AGE_30_44">Female / 30-44</option>
                                        <option value="gender:FEMALE|age:AGE_45_PLUS">Female / 45-PLUS</option>
                                        <option value="gender:MALE|age:AGE_UNDER_18">Male / UNDER-18</option>
                                        <option value="gender:MALE|age:AGE_18_29">Male / 18-29</option>
                                        <option value="gender:MALE|age:AGE_30_44">Male / 30-44</option>
                                        <option value="gender:MALE|age:AGE_45_PLUS">Male / 45-PLUS</option>
                                    </select>
                                </label>
                            </div>
                        </details>

                        <label style="display: block; margin-bottom: 18px; cursor: pointer;">
                            <input type="checkbox" id="use-squeezed-ratings-tiles" style="margin-right: 8px;">
                            <span>Use Squeezed Tiles</span>
                        </label>

                        <details style="margin-top: 18px; border: 1px solid #555; border-radius: 6px; background: #383838;">
                            <summary style="cursor: pointer; padding: 10px 12px;">
                                <input type="checkbox" id="show-imdb-demographics" style="margin-right: 8px;">
                                <span>IMDb Demographics</span>
                            </summary>
                            <div style="padding: 0 12px 12px; border-top: 1px solid #555;">
                                <label style="display: block; margin: 12px 0 14px; cursor: pointer;">
                                    <input type="checkbox" id="show-imdb-country-averages" style="margin-right: 8px;">
                                    <span>Show Country Averages</span>
                                </label>
                                <p style="margin: 0 0 10px; font-size: 0.85em; color: #ccc;">
                                    Use the filters below to control which demographic rows appear.
                                </p>
                                <div style="display: grid; gap: 12px; margin-bottom: 12px;">
                                    <div>
                                        <div style="margin-bottom: 6px; font-weight: bold;">Show demographic row types</div>
                                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-row-age-only" style="margin-right: 8px;">Age only</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-row-gender-only" style="margin-right: 8px;">Gender only</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-row-gender-age" style="margin-right: 8px;">Gender + age</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-row-user-category-only" style="margin-right: 8px;">User category only</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-row-country-only" style="margin-right: 8px;">Country only</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-row-other" style="margin-right: 8px;">Other combinations</label>
                                        </div>
                                    </div>
                                    <div>
                                        <div style="margin-bottom: 6px; font-weight: bold;">Show ages</div>
                                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-age-under-18" style="margin-right: 8px;">UNDER-18</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-age-18-29" style="margin-right: 8px;">18-29</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-age-30-44" style="margin-right: 8px;">30-44</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-age-45-plus" style="margin-right: 8px;">45-PLUS</label>
                                        </div>
                                    </div>
                                    <div>
                                        <div style="margin-bottom: 6px; font-weight: bold;">Show genders</div>
                                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-gender-female" style="margin-right: 8px;">Female</label>
                                            <label style="cursor: pointer;"><input type="checkbox" id="demographic-gender-male" style="margin-right: 8px;">Male</label>
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 140px); gap: 10px;">
                                        <label style="display: block;">
                                            <span style="display: block; margin-bottom: 5px;">Sort demographics by:</span>
                                            <select id="imdb-demographics-sort-by" style="
                                                width: 100%;
                                                padding: 5px;
                                                background: #444;
                                                color: #fff;
                                                border: 1px solid #666;
                                                border-radius: 3px;
                                            ">
                                                <option value="label">Label</option>
                                                <option value="rating">Rating</option>
                                                <option value="votes">Votes</option>
                                            </select>
                                        </label>
                                        <label style="display: block;">
                                            <span style="display: block; margin-bottom: 5px;">Direction:</span>
                                            <select id="imdb-demographics-sort-direction" style="
                                                width: 100%;
                                                padding: 5px;
                                                background: #444;
                                                color: #fff;
                                                border: 1px solid #666;
                                                border-radius: 3px;
                                            ">
                                                <option value="asc">Ascending</option>
                                                <option value="desc">Descending</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                                <label style="display: block; margin-top: 10px;">
                                    <span style="display: block; margin-bottom: 5px;">IMDb Demographics Panel Height (px):</span>
                                    <input type="number" id="imdb-demographics-height" min="120" max="600" step="1" style="
                                        width: 90px;
                                        padding: 5px;
                                        background: #444;
                                        color: #fff;
                                        border: 1px solid #666;
                                        border-radius: 3px;
                                    ">
                                </label>
                            </div>
                        </details>

                    </div>

                    <!-- Panel Locations + Cache Column -->
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

                        <label style="display: block; margin-bottom: 10px;">
                            <span style="display: block; margin-bottom: 5px;">New Movie TTL (days):</span>
                            <input type="number" id="new-movie-ttl" min="1" max="30" style="
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

    panel.querySelectorAll('summary input, summary select, summary label').forEach((element) => {
        element.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    });

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

function normalizeDemographicOptionMap(storedValue, defaults) {
    return {
        ...defaults,
        ...(storedValue && typeof storedValue === 'object' ? storedValue : {})
    };
}

function normalizeAggregateSourceSettings(storedValue) {
    const normalized = {};

    Object.entries(DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS).forEach(([sourceKey, defaults]) => {
        const candidate = storedValue && typeof storedValue === 'object' ? storedValue[sourceKey] : null;
        const allowedOptions = (RATINGS_AGGREGATE_SOURCE_OPTION_DEFINITIONS[sourceKey] || []).map((option) => option.value);
        const requestedWeight = Number.parseFloat(candidate?.weight);
        normalized[sourceKey] = {
            enabled: Object.prototype.hasOwnProperty.call(candidate || {}, 'enabled') ? !!candidate.enabled : defaults.enabled,
            option: allowedOptions.includes(candidate?.option) ? candidate.option : defaults.option,
            weight: Number.isFinite(requestedWeight) && requestedWeight > 0 ? requestedWeight : defaults.weight
        };
    });

    return normalized;
}

function getAggregateSourceSetting(sourceKey) {
    return normalizeAggregateSourceSettings(RATINGS_AGGREGATE_SOURCE_SETTINGS)[sourceKey] || DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS[sourceKey];
}

function getAggregateSourceOptions(sourceKey) {
    return RATINGS_AGGREGATE_SOURCE_OPTION_DEFINITIONS[sourceKey] || [];
}

function getAggregateSourceOptionLabel(sourceKey, optionValue) {
    return getAggregateSourceOptions(sourceKey).find((option) => option.value === optionValue)?.label || optionValue;
}

function buildAggregateSourceSelectHtml(sourceKey) {
    return getAggregateSourceOptions(sourceKey)
        .map((option) => `<option value="${option.value}">${option.label}</option>`)
        .join('');
}

function getEnabledAggregateSources() {
    if (!SHOW_RATINGS_AGGREGATE) {
        return [];
    }

    return Object.keys(DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS)
        .map((sourceKey) => [sourceKey, getAggregateSourceSetting(sourceKey)])
        .filter(([, settings]) => settings.enabled);
}

function isAggregateWeightedOption(optionValue) {
    return typeof optionValue === 'string' && optionValue.startsWith('weighted_');
}

function getAggregateWeightedScoreType(optionValue) {
    return isAggregateWeightedOption(optionValue)
        ? optionValue.slice('weighted_'.length)
        : null;
}

function aggregateNeedsImdbHistogram() {
    return getEnabledAggregateSources().some(([sourceKey, settings]) => sourceKey === 'imdb' && isAggregateWeightedOption(settings.option));
}

function aggregateNeedsImdbDemographic() {
    return getEnabledAggregateSources().some(([sourceKey, settings]) => sourceKey === 'imdb' && (
        settings.option === 'demographic' ||
        (settings.option === 'displayed' && SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE)
    ));
}

function aggregateNeedsMetacriticUserData() {
    return getEnabledAggregateSources().some(([sourceKey, settings]) => sourceKey === 'metacritic' && settings.option === 'user');
}

function aggregateNeedsRottenTomatoesData() {
    return getEnabledAggregateSources().some(([sourceKey]) => sourceKey === 'rottenTomatoes');
}

function aggregateNeedsTMDbData() {
    return getEnabledAggregateSources().some(([sourceKey]) => sourceKey === 'tmdb');
}

function aggregateNeedsLetterboxdData() {
    return getEnabledAggregateSources().some(([sourceKey]) => sourceKey === 'letterboxd');
}

function aggregateNeedsLetterboxdHistogram() {
    return getEnabledAggregateSources().some(([sourceKey, settings]) => sourceKey === 'letterboxd' && isAggregateWeightedOption(settings.option));
}

function shouldFetchRottenTomatoesSupplementalData() {
    return SHOW_RATINGS_ROTTEN_TOMATOES || aggregateNeedsRottenTomatoesData();
}

function shouldFetchTMDbSupplementalData() {
    return SHOW_RATINGS_TMDB || aggregateNeedsTMDbData();
}

function shouldFetchLetterboxdSupplementalData() {
    return SHOW_RATINGS_LETTERBOXD || aggregateNeedsLetterboxdData();
}

function shouldIncludeHistogramData() {
    return SHOW_IMDB_VOTE_HISTOGRAM || SHOW_IMDB_WEIGHTED_SCORE || aggregateNeedsImdbHistogram();
}

function shouldIncludeLetterboxdHistogramData() {
    return SHOW_RATINGS_LETTERBOXD_HISTOGRAM || SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE || aggregateNeedsLetterboxdHistogram();
}

function shouldFetchMetacriticSupplementalData() {
    return (SHOW_RATINGS_METACRITIC && (SHOW_RATINGS_METACRITIC_USER_SCORE || SHOW_RATINGS_METACRITIC_BREAKDOWN))
        || aggregateNeedsMetacriticUserData();
}

function shouldIncludeDemographicsData() {
    return SHOW_IMDB_DEMOGRAPHICS || SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE || aggregateNeedsImdbDemographic();
}

function getEnabledWeightedScoreTypes() {
    return Object.keys(IMDB_WEIGHTED_SCORE_TYPE_LABELS);
}

function getActiveWeightedScoreType() {
    return getEnabledWeightedScoreTypes().includes(IMDB_WEIGHTED_SCORE_TYPE)
        ? IMDB_WEIGHTED_SCORE_TYPE
        : DEFAULT_IMDB_WEIGHTED_SCORE_TYPE;
}

function loadSettingsIntoForm() {
    document.getElementById('show-similar-movies').checked = SHOW_SIMILAR_MOVIES;
    document.getElementById('place-under-cast').checked = PLACE_UNDER_CAST;
    document.getElementById('show-technical-specs').checked = SHOW_TECHNICAL_SPECIFICATIONS;
    document.getElementById('show-box-office').checked = SHOW_BOX_OFFICE;
    document.getElementById('show-awards').checked = SHOW_AWARDS;
    document.getElementById('show-soundtracks').checked = SHOW_SOUNDTRACKS;
    document.getElementById('show-imdb-trailers').checked = SHOW_IMDB_TRAILERS;
    document.getElementById('show-cast-photos').checked = SHOW_CAST_PHOTOS;
    document.getElementById('disable-custom-colors').checked = DISABLE_CUSTOM_COLORS;
    document.getElementById('cast-filter-type').value = CAST_FILTER_TYPE;
    document.getElementById('cast-max-display').value = CAST_MAX_DISPLAY;
    document.getElementById('cast-images-per-row').value = CAST_IMAGES_PER_ROW;
    document.getElementById('cast-default-rows').value = CAST_DEFAULT_ROWS;
    document.getElementById('panel-height').value = CONST_PIXEL_HEIGHT;
    document.getElementById('imdb-demographics-height').value = IMDB_DEMOGRAPHICS_PANEL_HEIGHT;
    document.getElementById('show-alternate-versions').checked = SHOW_ALTERNATE_VERSIONS;
    document.getElementById('alternate-versions-open').checked = ALTERNATE_VERSIONS_PANEL_OPEN;
    document.getElementById('show-keywords').checked = SHOW_KEYWORDS;
    document.getElementById('keywords-open').checked = KEYWORDS_PANEL_OPEN;
    document.getElementById('show-parents-guide').checked = SHOW_PARENTS_GUIDE;
    document.getElementById('enable-imdb-ratings-panel').checked = ENABLE_IMDB_RATINGS_PANEL;
    document.getElementById('show-ratings-metacritic').checked = SHOW_RATINGS_METACRITIC;
    document.getElementById('show-ratings-metacritic-user-score').checked = SHOW_RATINGS_METACRITIC_USER_SCORE;
    document.getElementById('show-ratings-metacritic-breakdown').checked = SHOW_RATINGS_METACRITIC_BREAKDOWN;
    document.getElementById('show-ratings-aggregate').checked = SHOW_RATINGS_AGGREGATE;
    document.getElementById('ratings-aggregate-drop-extremes').checked = RATINGS_AGGREGATE_DROP_EXTREMES;
    document.getElementById('ratings-aggregate-keep-rotten-tomatoes').checked = RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES;
    document.getElementById('ratings-aggregate-method').value = RATINGS_AGGREGATE_METHOD;
    document.getElementById('show-ratings-imdb-meter').checked = SHOW_RATINGS_IMDB_METER;
    document.getElementById('show-ratings-rotten-tomatoes').checked = SHOW_RATINGS_ROTTEN_TOMATOES;
    document.getElementById('show-ratings-tmdb').checked = SHOW_RATINGS_TMDB;
    document.getElementById('show-ratings-letterboxd').checked = SHOW_RATINGS_LETTERBOXD;
    document.getElementById('show-ratings-letterboxd-histogram').checked = SHOW_RATINGS_LETTERBOXD_HISTOGRAM;
    document.getElementById('show-ratings-letterboxd-weighted-score').checked = SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE;
    document.getElementById('show-imdb-vote-histogram').checked = SHOW_IMDB_VOTE_HISTOGRAM;
    document.getElementById('show-imdb-weighted-score').checked = SHOW_IMDB_WEIGHTED_SCORE;
    document.getElementById('imdb-weighted-score-type').value = IMDB_WEIGHTED_SCORE_TYPE;
    document.getElementById('show-imdb-demographic-score-override').checked = SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE;
    document.getElementById('imdb-demographic-score-override-key').value = IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY;
    document.getElementById('show-imdb-demographics').checked = SHOW_IMDB_DEMOGRAPHICS;
    document.getElementById('show-imdb-country-averages').checked = SHOW_IMDB_COUNTRY_AVERAGES;
    document.getElementById('use-squeezed-ratings-tiles').checked = USE_SQUEEZED_RATINGS_TILES;
    document.getElementById('panel-visible').checked = isPanelVisible;
    document.getElementById('toggleable-sections').checked = isToggleableSections;
    document.getElementById('hide-spoilers').checked = hideSpoilers;
    document.getElementById('hide-text').checked = hidetext;
    document.getElementById('cache-expiry').value = CACHE_EXPIRY_DAYS;
    document.getElementById('new-movie-ttl').value = NEW_MOVIE_TTL_DAYS;
    document.getElementById('techspecs-location').value = TECHSPECS_LOCATION;
    document.getElementById('boxoffice-location').value = BOXOFFICE_LOCATION;
    document.getElementById('parents-location').value = PARENTS_LOCATION;
    document.getElementById('awards-location').value = AWARDS_LOCATION;
    document.getElementById('similar-movies-location').value = SIMILAR_MOVIES_LOCATION;
    document.getElementById('existing-imdb-tags').value = EXISTING_IMDB_TAGS;
    document.getElementById('demographic-row-age-only').checked = !!IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED.ageOnly;
    document.getElementById('demographic-row-gender-only').checked = !!IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED.genderOnly;
    document.getElementById('demographic-row-gender-age').checked = !!IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED.genderAge;
    document.getElementById('demographic-row-user-category-only').checked = !!IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED.userCategoryOnly;
    document.getElementById('demographic-row-country-only').checked = !!IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED.countryOnly;
    document.getElementById('demographic-row-other').checked = !!IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED.other;
    document.getElementById('demographic-age-under-18').checked = !!IMDB_DEMOGRAPHIC_AGES_ENABLED.AGE_UNDER_18;
    document.getElementById('demographic-age-18-29').checked = !!IMDB_DEMOGRAPHIC_AGES_ENABLED.AGE_18_29;
    document.getElementById('demographic-age-30-44').checked = !!IMDB_DEMOGRAPHIC_AGES_ENABLED.AGE_30_44;
    document.getElementById('demographic-age-45-plus').checked = !!IMDB_DEMOGRAPHIC_AGES_ENABLED.AGE_45_PLUS;
    document.getElementById('demographic-gender-female').checked = !!IMDB_DEMOGRAPHIC_GENDERS_ENABLED.FEMALE;
    document.getElementById('demographic-gender-male').checked = !!IMDB_DEMOGRAPHIC_GENDERS_ENABLED.MALE;
    document.getElementById('imdb-demographics-sort-by').value = IMDB_DEMOGRAPHIC_SORT_BY;
    document.getElementById('imdb-demographics-sort-direction').value = IMDB_DEMOGRAPHIC_SORT_DIRECTION;

    Object.keys(DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS).forEach((sourceKey) => {
        const setting = getAggregateSourceSetting(sourceKey);
        document.getElementById(`aggregate-source-${sourceKey}-enabled`).checked = !!setting.enabled;
        document.getElementById(`aggregate-source-${sourceKey}-option`).value = setting.option;
        document.getElementById(`aggregate-source-${sourceKey}-weight`).value = setting.weight;
    });
}

function saveSettingsFromForm() {
    SHOW_SIMILAR_MOVIES = document.getElementById('show-similar-movies').checked;
    PLACE_UNDER_CAST = document.getElementById('place-under-cast').checked;
    SHOW_TECHNICAL_SPECIFICATIONS = document.getElementById('show-technical-specs').checked;
    SHOW_BOX_OFFICE = document.getElementById('show-box-office').checked;
    SHOW_AWARDS = document.getElementById('show-awards').checked;
    SHOW_SOUNDTRACKS = document.getElementById('show-soundtracks').checked;
    SHOW_IMDB_TRAILERS = document.getElementById('show-imdb-trailers').checked;
    SHOW_CAST_PHOTOS = document.getElementById('show-cast-photos').checked;
    DISABLE_CUSTOM_COLORS = document.getElementById('disable-custom-colors').checked;
    CAST_FILTER_TYPE = document.getElementById('cast-filter-type').value;
    CAST_MAX_DISPLAY = parseInt(document.getElementById('cast-max-display').value) || 128;
    CAST_IMAGES_PER_ROW = parseInt(document.getElementById('cast-images-per-row').value) || 4;
    CAST_DEFAULT_ROWS = parseInt(document.getElementById('cast-default-rows').value) || 2;
    CONST_PIXEL_HEIGHT = parseInt(document.getElementById('panel-height').value) || 300;
    IMDB_DEMOGRAPHICS_PANEL_HEIGHT = parseInt(document.getElementById('imdb-demographics-height').value) || 216;
    SHOW_ALTERNATE_VERSIONS = document.getElementById('show-alternate-versions').checked;
    ALTERNATE_VERSIONS_PANEL_OPEN = document.getElementById('alternate-versions-open').checked;
    SHOW_KEYWORDS = document.getElementById('show-keywords').checked;
    KEYWORDS_PANEL_OPEN = document.getElementById('keywords-open').checked;
    SHOW_PARENTS_GUIDE = document.getElementById('show-parents-guide').checked;
    ENABLE_IMDB_RATINGS_PANEL = document.getElementById('enable-imdb-ratings-panel').checked;
    SHOW_RATINGS_METACRITIC = document.getElementById('show-ratings-metacritic').checked;
    SHOW_RATINGS_METACRITIC_USER_SCORE = document.getElementById('show-ratings-metacritic-user-score').checked;
    SHOW_RATINGS_METACRITIC_BREAKDOWN = document.getElementById('show-ratings-metacritic-breakdown').checked;
    SHOW_RATINGS_AGGREGATE = document.getElementById('show-ratings-aggregate').checked;
    RATINGS_AGGREGATE_DROP_EXTREMES = document.getElementById('ratings-aggregate-drop-extremes').checked;
    RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES = document.getElementById('ratings-aggregate-keep-rotten-tomatoes').checked;
    RATINGS_AGGREGATE_METHOD = document.getElementById('ratings-aggregate-method').value;
    if (!(RATINGS_AGGREGATE_METHOD in RATINGS_AGGREGATE_METHOD_LABELS)) {
        RATINGS_AGGREGATE_METHOD = 'mean';
    }
    SHOW_RATINGS_IMDB_METER = document.getElementById('show-ratings-imdb-meter').checked;
    SHOW_RATINGS_ROTTEN_TOMATOES = document.getElementById('show-ratings-rotten-tomatoes').checked;
    SHOW_RATINGS_TMDB = document.getElementById('show-ratings-tmdb').checked;
    SHOW_RATINGS_LETTERBOXD = document.getElementById('show-ratings-letterboxd').checked;
    SHOW_RATINGS_LETTERBOXD_HISTOGRAM = document.getElementById('show-ratings-letterboxd-histogram').checked;
    SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE = document.getElementById('show-ratings-letterboxd-weighted-score').checked;
    SHOW_IMDB_VOTE_HISTOGRAM = document.getElementById('show-imdb-vote-histogram').checked;
    SHOW_IMDB_WEIGHTED_SCORE = document.getElementById('show-imdb-weighted-score').checked;
    SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE = document.getElementById('show-imdb-demographic-score-override').checked;
    SHOW_IMDB_DEMOGRAPHICS = document.getElementById('show-imdb-demographics').checked;
    SHOW_IMDB_COUNTRY_AVERAGES = document.getElementById('show-imdb-country-averages').checked;
    USE_SQUEEZED_RATINGS_TILES = document.getElementById('use-squeezed-ratings-tiles').checked;
    isPanelVisible = document.getElementById('panel-visible').checked;
    isToggleableSections = document.getElementById('toggleable-sections').checked;
    hideSpoilers = document.getElementById('hide-spoilers').checked;
    hidetext = document.getElementById('hide-text').checked;
    CACHE_EXPIRY_DAYS = parseInt(document.getElementById('cache-expiry').value) || 7;
    NEW_MOVIE_TTL_DAYS = parseInt(document.getElementById('new-movie-ttl').value) || 3;
    TECHSPECS_LOCATION = parseInt(document.getElementById('techspecs-location').value) || 1;
    BOXOFFICE_LOCATION = parseInt(document.getElementById('boxoffice-location').value) || 2;
    PARENTS_LOCATION = parseInt(document.getElementById('parents-location').value) || 3;
    AWARDS_LOCATION = parseInt(document.getElementById('awards-location').value) || 4;
    SIMILAR_MOVIES_LOCATION = parseInt(document.getElementById('similar-movies-location').value) || 5;
    EXISTING_IMDB_TAGS = parseInt(document.getElementById('existing-imdb-tags').value) || 6;
    IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED = {
        ageOnly: document.getElementById('demographic-row-age-only').checked,
        genderOnly: document.getElementById('demographic-row-gender-only').checked,
        genderAge: document.getElementById('demographic-row-gender-age').checked,
        userCategoryOnly: document.getElementById('demographic-row-user-category-only').checked,
        countryOnly: document.getElementById('demographic-row-country-only').checked,
        other: document.getElementById('demographic-row-other').checked
    };
    IMDB_DEMOGRAPHIC_AGES_ENABLED = {
        AGE_UNDER_18: document.getElementById('demographic-age-under-18').checked,
        AGE_18_29: document.getElementById('demographic-age-18-29').checked,
        AGE_30_44: document.getElementById('demographic-age-30-44').checked,
        AGE_45_PLUS: document.getElementById('demographic-age-45-plus').checked
    };
    IMDB_DEMOGRAPHIC_GENDERS_ENABLED = {
        FEMALE: document.getElementById('demographic-gender-female').checked,
        MALE: document.getElementById('demographic-gender-male').checked
    };
    RATINGS_AGGREGATE_SOURCE_SETTINGS = normalizeAggregateSourceSettings(
        Object.keys(DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS).reduce((settings, sourceKey) => {
            settings[sourceKey] = {
                enabled: document.getElementById(`aggregate-source-${sourceKey}-enabled`).checked,
                option: document.getElementById(`aggregate-source-${sourceKey}-option`).value,
                weight: Number.parseFloat(document.getElementById(`aggregate-source-${sourceKey}-weight`).value) || 1
            };
            return settings;
        }, {})
    );
    IMDB_DEMOGRAPHIC_SORT_BY = document.getElementById('imdb-demographics-sort-by').value;
    IMDB_DEMOGRAPHIC_SORT_DIRECTION = document.getElementById('imdb-demographics-sort-direction').value;
    IMDB_WEIGHTED_SCORE_TYPE = document.getElementById('imdb-weighted-score-type').value;
    IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY = document.getElementById('imdb-demographic-score-override-key').value;

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
        SHOW_IMDB_TRAILERS = true;
        CACHE_EXPIRY_DAYS = 7;
        NEW_MOVIE_TTL_DAYS = 3;
        SHOW_ALTERNATE_VERSIONS = true;
        ALTERNATE_VERSIONS_PANEL_OPEN = false;
        SHOW_KEYWORDS = true;
        KEYWORDS_PANEL_OPEN = false;
        SHOW_PARENTS_GUIDE = true;
        ENABLE_IMDB_RATINGS_PANEL = false;
        SHOW_RATINGS_METACRITIC = true;
        SHOW_RATINGS_METACRITIC_USER_SCORE = true;
        SHOW_RATINGS_METACRITIC_BREAKDOWN = true;
        SHOW_RATINGS_AGGREGATE = false;
        RATINGS_AGGREGATE_DROP_EXTREMES = false;
        RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES = false;
        RATINGS_AGGREGATE_METHOD = 'mean';
        RATINGS_AGGREGATE_SOURCE_SETTINGS = normalizeAggregateSourceSettings(DEFAULT_RATINGS_AGGREGATE_SOURCE_SETTINGS);
        SHOW_RATINGS_IMDB_METER = true;
        SHOW_RATINGS_ROTTEN_TOMATOES = false;
        SHOW_RATINGS_TMDB = false;
        SHOW_RATINGS_LETTERBOXD = false;
        SHOW_RATINGS_LETTERBOXD_HISTOGRAM = false;
        SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE = false;
        SHOW_IMDB_VOTE_HISTOGRAM = false;
        SHOW_IMDB_WEIGHTED_SCORE = false;
        SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE = false;
        SHOW_IMDB_DEMOGRAPHICS = false;
        SHOW_IMDB_COUNTRY_AVERAGES = false;
        isPanelVisible = true;
        isToggleableSections = true;
        hideSpoilers = true;
        hidetext = false;
        SHOW_CAST_PHOTOS = true;
        USE_SQUEEZED_RATINGS_TILES = false;
        CAST_FILTER_TYPE = 'actors';
        CAST_MAX_DISPLAY = 128;
        CONST_PIXEL_HEIGHT = 300;
        IMDB_DEMOGRAPHICS_PANEL_HEIGHT = 216;
        TECHSPECS_LOCATION = 1;
        BOXOFFICE_LOCATION = 2;
        PARENTS_LOCATION = 3;
        AWARDS_LOCATION = 4;
        SIMILAR_MOVIES_LOCATION = 5;
        EXISTING_IMDB_TAGS = 6;
        DISABLE_CUSTOM_COLORS = false;
        IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED = { ...DEFAULT_IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED };
        IMDB_DEMOGRAPHIC_GENDERS_ENABLED = { ...DEFAULT_IMDB_DEMOGRAPHIC_GENDERS_ENABLED };
        IMDB_DEMOGRAPHIC_AGES_ENABLED = { ...DEFAULT_IMDB_DEMOGRAPHIC_AGES_ENABLED };
        IMDB_DEMOGRAPHIC_SORT_BY = DEFAULT_IMDB_DEMOGRAPHIC_SORT_BY;
        IMDB_DEMOGRAPHIC_SORT_DIRECTION = DEFAULT_IMDB_DEMOGRAPHIC_SORT_DIRECTION;
        IMDB_WEIGHTED_SCORE_TYPE = DEFAULT_IMDB_WEIGHTED_SCORE_TYPE;
        IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY = DEFAULT_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY;

        saveSettings();
        flushCache();
        closeSettingsPanel();
        alert('All settings reset and cache flushed!\nReloading page to apply changes.');
        window.location.reload();
    }
}

const RATINGS_PANEL_ID = 'movie-ratings-table';
const RATINGS_STYLE_ID = 'ptp-imdb-graphql-ratings-box-style';
const METER_UP_COLOR = '#8dc891';
const METER_DOWN_COLOR = '#d98c8c';

function textRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = {
            method: 'GET',
            url,
            onload: (response) => {
                if (response.status < 200 || response.status >= 300) {
                    reject(new Error(`HTTP ${response.status}: ${url}`));
                    return;
                }

                resolve(response.responseText || '');
            },
            onerror: () => {
                reject(new Error(`Request failed: ${url}`));
            }
        };

        if (headers && Object.keys(headers).length > 0) {
            request.headers = headers;
        }

        GM_xmlhttpRequest(request);
    });
}

function textRequestDetailed(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = {
            method: 'GET',
            url,
            onload: (response) => {
                if (response.status < 200 || response.status >= 300) {
                    reject(new Error(`HTTP ${response.status}: ${url}`));
                    return;
                }

                resolve({
                    text: response.responseText || '',
                    finalUrl: response.finalUrl || url
                });
            },
            onerror: () => {
                reject(new Error(`Request failed: ${url}`));
            }
        };

        if (headers && Object.keys(headers).length > 0) {
            request.headers = headers;
        }

        GM_xmlhttpRequest(request);
    });
}

async function jsonRequest(url) {
    const text = await textRequest(url);
    return JSON.parse(text);
}

function parseHtmlDocument(html) {
    return new DOMParser().parseFromString(html, 'text/html');
}

function isPendingValue(value) {
    return value === undefined;
}

function parsePtpRating() {
    const userScore = parseInt(document.getElementById('user_rating')?.textContent || '', 10);
    const userCount = parseInt(document.getElementById('user_total')?.textContent || '', 10);
    const personalRating = parseInt(
        (document.getElementById('ptp_your_rating')?.textContent || '').replace(/[^\d]+/g, ''),
        10
    );

    return {
        userScore: Number.isFinite(userScore) ? userScore : null,
        userCount: Number.isFinite(userCount) ? userCount : 0,
        personalRating: Number.isFinite(personalRating) ? personalRating : null
    };
}

function captureOriginalPtpVoteControls() {
    const ratingSpan = document.getElementById('ptp_your_rating');
    const voteAnchor = document.getElementById('star0');
    const voteContainer = voteAnchor
        ? (voteAnchor.closest('.clearfix') || voteAnchor.closest('.star-rating-container') || voteAnchor.parentElement)
        : null;

    return {
        ratingSpan: ratingSpan || null,
        voteAnchor: voteAnchor || null,
        voteContainer: voteContainer || null
    };
}

function ensureRatingsStyles() {
    if (document.getElementById(RATINGS_STYLE_ID)) {
        return;
    }

    const headingColor = DISABLE_CUSTOM_COLORS ? 'inherit' : IMDB_ACCENT_COLOR;
    const style = document.createElement('style');
    style.id = RATINGS_STYLE_ID;
    style.textContent = `
        #${RATINGS_PANEL_ID}.imdb-graphql-ratings-box {
            padding: 12px 0;
        }

        .imdb-ratings-shell {
            display: grid;
            gap: 12px;
        }

        .imdb-ratings-consensus,
        .imdb-ratings-card,
        .imdb-ratings-section {
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.025);
        }

        .imdb-ratings-consensus {
            font-size: 12px;
            color: #d5d5d5;
            line-height: 1.5;
        }

        .imdb-ratings-top {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(var(--imdb-top-card-min, 170px), 1fr));
            gap: 10px;
        }

        .imdb-ratings-top.imdb-ratings-top-squeezed {
            display: flex;
            flex-wrap: wrap;
            align-items: stretch;
            justify-content: flex-start;
            gap: 8px;
        }

        .imdb-ratings-top.imdb-ratings-top-squeezed .imdb-ratings-card {
            flex: 1 1 145px;
            min-width: 145px;
            max-width: 100%;
            padding: 10px;
        }

        .imdb-ratings-card-metacritic-expanded {
            grid-column: span 2;
        }

        .imdb-ratings-top.imdb-ratings-top-single-column .imdb-ratings-card-metacritic-expanded {
            grid-column: span 1;
        }

        .imdb-ratings-top.imdb-ratings-top-squeezed .imdb-ratings-card-metacritic-expanded {
            flex-basis: 240px;
            min-width: 240px;
            flex-grow: 2;
        }

        .imdb-ratings-card h4,
        .imdb-ratings-section h4 {
            margin: 0 0 8px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: ${headingColor};
        }

        .imdb-provider-heading {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .imdb-provider-heading img {
            width: 18px;
            height: 18px;
            object-fit: contain;
        }

        .imdb-ratings-value,
        .imdb-provider-split-value {
            font-size: 28px;
            font-weight: 700;
            line-height: 1;
            margin: 0 0 6px;
        }

        .imdb-weighted-score-inline {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            grid-template-rows: auto auto;
            column-gap: 12px;
            align-items: end;
        }

        .imdb-weighted-score-badge {
            display: block;
            align-items: flex-end;
            justify-content: flex-end;
            grid-column: 2;
            grid-row: 1 / span 2;
            min-width: fit-content;
            font-size: 28px;
            font-weight: 700;
            line-height: 1;
            color: inherit;
            white-space: nowrap;
        }

        .imdb-primary-score {
            grid-column: 1;
            grid-row: 1 / span 2;
            align-self: center;
        }

        .imdb-ratings-meta-top {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 10px;
        }

        .imdb-weighted-meta-label {
            font-size: 12px;
            line-height: 1.2;
            color: #c7c7c7;
            margin-left: auto;
            white-space: nowrap;
        }

        .imdb-ptp-value-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
        }

        .imdb-ptp-value-label {
            position: relative;
            z-index: 1;
            pointer-events: none;
        }

        .imdb-ptp-overlay-target {
            position: absolute;
            inset: 0;
            z-index: 2;
            overflow: hidden;
        }

        .imdb-ptp-overlay-target .clearfix,
        .imdb-ptp-overlay-target .star-rating-container {
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
        }

        .imdb-ptp-overlay-target .star-rating-container {
            display: block !important;
        }

        .imdb-ptp-overlay-target #star0 {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            opacity: 0.01 !important;
            cursor: pointer !important;
        }

        .imdb-ratings-meta {
            font-size: 12px;
            color: #c7c7c7;
            line-height: 1.5;
        }

        .imdb-provider-split {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .imdb-provider-split-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #a7a7a7;
            margin-bottom: 4px;
        }

        .imdb-ratings-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
            gap: 12px;
            align-items: start;
        }

        .imdb-histogram-row {
            display: grid;
            grid-template-columns: 22px minmax(0, 1fr) 78px;
            gap: 8px;
            align-items: center;
            margin-top: 5px;
            font-size: 12px;
        }

        .imdb-histogram-track {
            height: 9px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 999px;
            overflow: hidden;
        }

        .imdb-histogram-fill {
            height: 100%;
            background: linear-gradient(90deg, ${IMDB_ACCENT_COLOR}, #c4a33f);
        }

        .imdb-letterboxd-histogram {
            display: grid;
            grid-template-columns: repeat(10, minmax(0, 1fr));
            gap: 6px;
            align-items: end;
            height: 88px;
            margin-top: 10px;
        }

        .imdb-letterboxd-bar {
            position: relative;
            display: grid;
            grid-template-rows: minmax(0, 1fr) auto;
            gap: 6px;
            align-items: end;
            height: 100%;
            min-width: 0;
        }

        .imdb-letterboxd-bar-fill {
            width: 100%;
            min-height: 4px;
            border-radius: 6px 6px 0 0;
            background: linear-gradient(180deg, ${IMDB_ACCENT_COLOR}, #c4a33f);
        }

        .imdb-letterboxd-bar-label {
            font-size: 10px;
            line-height: 1.2;
            text-align: center;
            color: #a7a7a7;
            white-space: nowrap;
        }

        .imdb-letterboxd-bar::after {
            content: attr(data-count);
            position: absolute;
            left: 50%;
            bottom: calc(100% + 8px);
            transform: translateX(-50%);
            padding: 4px 6px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            font-size: 11px;
            line-height: 1.2;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.12s ease;
            z-index: 3;
        }

        .imdb-letterboxd-bar:hover::after,
        .imdb-letterboxd-bar:focus-visible::after {
            opacity: 1;
        }

        .imdb-chip-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .imdb-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.06);
            font-size: 12px;
        }

        .imdb-detail-list {
            display: grid;
            gap: 6px;
            font-size: 12px;
        }

        .imdb-detail-list-scroll {
            max-height: ${IMDB_DEMOGRAPHICS_PANEL_HEIGHT}px;
            overflow-y: auto;
            padding-right: 4px;
        }

        .imdb-detail-item {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            gap: 8px;
            align-items: baseline;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .imdb-detail-item:last-child {
            border-bottom: 0;
            padding-bottom: 0;
        }

        .imdb-meter-up {
            color: ${METER_UP_COLOR};
        }

        .imdb-meter-down {
            color: ${METER_DOWN_COLOR};
        }

        .imdb-muted {
            color: #a7a7a7;
        }

        .imdb-ptp-trigger {
            color: inherit;
            text-decoration: none;
            font-weight: 700;
        }

        .imdb-ptp-trigger:hover,
        .imdb-ptp-trigger:focus {
            text-decoration: underline;
        }

        .imdb-ptp-compat {
            position: absolute;
            left: -9999px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        }

        @media (max-width: 900px) {
            .imdb-ratings-grid {
                grid-template-columns: 1fr;
            }

            .imdb-ratings-card-metacritic-expanded {
                grid-column: span 1;
            }
        }
    `;
    document.head.appendChild(style);
}

function formatTenScale(scoreTimesTen) {
    if (!Number.isFinite(scoreTimesTen)) {
        return 'None';
    }

    return (scoreTimesTen / 10).toFixed(1);
}

function formatCount(value) {
    if (!Number.isFinite(value)) {
        return 'Unknown';
    }

    return Math.round(value).toLocaleString();
}

function escapeHtmlAttribute(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatPercentAsTenScale(value) {
    if (!Number.isFinite(value)) {
        return 'None';
    }

    return `${(value / 10).toFixed(1)}/10`;
}

function formatDisplayCount(value, fallback) {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }

    return formatCount(fallback);
}

function formatRottenTomatoesAudienceCount(value, fallback) {
    const display = formatDisplayCount(value, fallback);
    if (!display || display === 'Unknown') {
        return display;
    }

    const withoutRatings = display
        .replace(/\s*Ratings?\b/gi, '')
        .replace(/\s*\+\s*/g, '+')
        .trim();

    return withoutRatings.includes('+') ? withoutRatings : `${withoutRatings}+`;
}

function formatMeterRankChange(meterRank) {
    const change = meterRank?.rankChange;
    if (!change || !Number.isFinite(change.difference) || !change.changeDirection) {
        return '';
    }

    const changeClass = change.changeDirection === 'UP' ? 'imdb-meter-up' : 'imdb-meter-down';
    const arrow = change.changeDirection === 'UP' ? 'up' : 'down';
    return `<span class="${changeClass}">${arrow} ${change.difference.toLocaleString()}</span>`;
}

function formatUserCategory(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatAge(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .replace(/^AGE_/, '')
        .replace('_', '-');
}

function formatGender(value) {
    if (!value) {
        return '';
    }

    return String(value).charAt(0) + String(value).slice(1).toLowerCase();
}

function buildLegacyImdbAnchor(imdbId, label) {
    return `<a target="_blank" class="rating" id="imdb-title-link" href="http://www.imdb.com/title/${imdbId}/" rel="noreferrer" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">${label}</a>`;
}

function getOrderedHistogramValues(histogramValues) {
    if (!Array.isArray(histogramValues)) {
        return [];
    }

    return histogramValues
        .filter((item) => Number.isFinite(item?.rating) && Number.isFinite(item?.voteCount) && item.voteCount > 0)
        .slice()
        .sort((a, b) => a.rating - b.rating);
}

function calculateHistogramMean(histogramValues) {
    const ordered = getOrderedHistogramValues(histogramValues);
    const totalVotes = ordered.reduce((total, item) => total + item.voteCount, 0);
    if (totalVotes <= 0) {
        return null;
    }

    const weightedTotal = ordered.reduce((total, item) => total + (item.rating * item.voteCount), 0);
    return weightedTotal / totalVotes;
}

function calculateTrimmedHistogramMean(histogramValues, trimFraction) {
    const ordered = getOrderedHistogramValues(histogramValues)
        .map((item) => ({ rating: item.rating, voteCount: item.voteCount }));
    const totalVotes = ordered.reduce((total, item) => total + item.voteCount, 0);
    const totalTrimVotes = totalVotes * trimFraction;

    if (totalVotes <= 0 || (totalTrimVotes * 2) >= totalVotes) {
        return null;
    }

    let trimLowRemaining = totalTrimVotes;
    for (let index = 0; index < ordered.length && trimLowRemaining > 0; index++) {
        const removable = Math.min(ordered[index].voteCount, trimLowRemaining);
        ordered[index].voteCount -= removable;
        trimLowRemaining -= removable;
    }

    let trimHighRemaining = totalTrimVotes;
    for (let index = ordered.length - 1; index >= 0 && trimHighRemaining > 0; index--) {
        const removable = Math.min(ordered[index].voteCount, trimHighRemaining);
        ordered[index].voteCount -= removable;
        trimHighRemaining -= removable;
    }

    const remainingVotes = ordered.reduce((total, item) => total + item.voteCount, 0);
    if (remainingVotes <= 0) {
        return null;
    }

    const weightedTotal = ordered.reduce((total, item) => total + (item.rating * item.voteCount), 0);
    return weightedTotal / remainingVotes;
}

function calculateWeightedMedian(histogramValues) {
    const ordered = getOrderedHistogramValues(histogramValues);
    const totalVotes = ordered.reduce((total, item) => total + item.voteCount, 0);
    if (totalVotes <= 0) {
        return null;
    }

    const midpoint = totalVotes / 2;
    let runningVotes = 0;
    for (const item of ordered) {
        runningVotes += item.voteCount;
        if (runningVotes >= midpoint) {
            return item.rating;
        }
    }

    return ordered[ordered.length - 1]?.rating ?? null;
}

function calculateBayesianHistogramMean(histogramValues, priorMean = 6.5, priorVotes = 10000) {
    const mean = calculateHistogramMean(histogramValues);
    const totalVotes = getOrderedHistogramValues(histogramValues).reduce((total, item) => total + item.voteCount, 0);
    if (!Number.isFinite(mean) || totalVotes <= 0) {
        return null;
    }

    return ((mean * totalVotes) + (priorMean * priorVotes)) / (totalVotes + priorVotes);
}

function calculateWeightedScoreFromHistogram(histogramValues, weightingType) {
    switch (weightingType) {
        case 'mean':
            return calculateHistogramMean(histogramValues);
        case 'trimmed5':
            return calculateTrimmedHistogramMean(histogramValues, 0.05);
        case 'trimmed10':
            return calculateTrimmedHistogramMean(histogramValues, 0.10);
        case 'median':
            return calculateWeightedMedian(histogramValues);
        case 'bayesian':
            return calculateBayesianHistogramMean(histogramValues);
        default:
            return null;
    }
}

function getWeightedScoreSummary(histogramValues, options = {}) {
    const enabled = Object.prototype.hasOwnProperty.call(options, 'enabled')
        ? options.enabled
        : SHOW_IMDB_WEIGHTED_SCORE;
    const sourceLabel = options.sourceLabel || 'IMDb';
    const displayScoreMultiplier = Number.isFinite(options.displayScoreMultiplier)
        ? options.displayScoreMultiplier
        : 1;
    const activeType = getActiveWeightedScoreType();
    if (!enabled || !activeType) {
        return null;
    }

    const score = calculateWeightedScoreFromHistogram(histogramValues, activeType);
    if (!Number.isFinite(score)) {
        return null;
    }

    return {
        type: activeType,
        label: IMDB_WEIGHTED_SCORE_TYPE_LABELS[activeType],
        tooltip: `${IMDB_WEIGHTED_SCORE_TYPE_LABELS[activeType]} derived from the ${sourceLabel} vote histogram.`,
        score,
        displayScore: score * displayScoreMultiplier
    };
}

function getConfiguredDemographicScoreSummary(entries) {
    if (!Array.isArray(entries)) {
        return null;
    }

    const selectedEntry = entries.find((entry) => buildDemographicSelectionKey(entry?.demographic) === IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY);
    if (!selectedEntry || !Number.isFinite(selectedEntry.aggregate) || !Number.isFinite(selectedEntry.voteCount) || selectedEntry.voteCount <= 0) {
        return null;
    }

    const selectedOption = IMDB_SCORE_OVERRIDE_OPTIONS.find((option) => option.value === IMDB_DEMOGRAPHIC_SCORE_OVERRIDE_KEY);
    return {
        label: selectedOption?.label || buildDemographicLabel(selectedEntry),
        score: selectedEntry.aggregate,
        votes: selectedEntry.voteCount
    };
}

function buildDemographicSelectionKey(demographic) {
    const parts = [];
    if (demographic?.gender) {
        parts.push(`gender:${demographic.gender}`);
    }
    if (demographic?.age) {
        parts.push(`age:${demographic.age}`);
    }

    return parts.join('|');
}

function getDemographicScoreOverrideSummary(entries) {
    if (!SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE) {
        return null;
    }

    return getConfiguredDemographicScoreSummary(entries);
}

function getDemographicFieldValue(entry, field) {
    const demographic = entry?.demographic || {};

    switch (field) {
        case 'userCategory':
            return formatUserCategory(demographic.userCategory);
        case 'gender':
            return formatGender(demographic.gender);
        case 'age':
            return formatAge(demographic.age);
        case 'country':
            return demographic.country || '';
        default:
            return '';
    }
}

function buildDemographicLabel(entry) {
    const parts = IMDB_DEMOGRAPHIC_LABEL_FIELDS
        .map((field) => getDemographicFieldValue(entry, field))
        .filter(Boolean);

    return parts.join(' / ') || 'All IMDb users';
}

function getDemographicEntryType(entry) {
    const demographic = entry?.demographic || {};
    const hasAge = !!demographic.age;
    const hasGender = !!demographic.gender;
    const hasCountry = !!demographic.country;
    const hasUserCategory = !!demographic.userCategory;

    if (hasAge && hasGender && !hasCountry && !hasUserCategory) {
        return 'genderAge';
    }
    if (hasAge && !hasGender && !hasCountry && !hasUserCategory) {
        return 'ageOnly';
    }
    if (!hasAge && hasGender && !hasCountry && !hasUserCategory) {
        return 'genderOnly';
    }
    if (!hasAge && !hasGender && !hasCountry && hasUserCategory) {
        return 'userCategoryOnly';
    }
    if (!hasAge && !hasGender && hasCountry && !hasUserCategory) {
        return 'countryOnly';
    }
    if (!hasAge && !hasGender && !hasCountry && !hasUserCategory) {
        return 'overall';
    }

    return 'other';
}

function isDemographicOptionEnabled(optionMap, value) {
    if (!value) {
        return true;
    }

    if (!optionMap || typeof optionMap !== 'object') {
        return true;
    }

    return value in optionMap ? !!optionMap[value] : true;
}

function getDemographicSortMultiplier() {
    return IMDB_DEMOGRAPHIC_SORT_DIRECTION === 'desc' ? -1 : 1;
}

function compareDemographicLabels(left, right) {
    return buildDemographicLabel(left).localeCompare(buildDemographicLabel(right));
}

function getSortedDemographics(entries, overallVoteCount) {
    if (!Array.isArray(entries)) {
        return [];
    }

    const sortMultiplier = getDemographicSortMultiplier();
    const hasSelectedFieldValue = (entry) => IMDB_DEMOGRAPHIC_LABEL_FIELDS.some((field) => Boolean(getDemographicFieldValue(entry, field)));

    return entries
        .filter((entry) => Number.isFinite(entry.voteCount) && Number.isFinite(entry.aggregate))
        .filter((entry) => entry.voteCount > 0)
        .filter((entry) => !(
            entry.voteCount === overallVoteCount &&
            !entry.demographic?.age &&
            !entry.demographic?.gender &&
            !entry.demographic?.country &&
            !entry.demographic?.userCategory
        ))
        .filter((entry) => IMDB_DEMOGRAPHIC_ROW_TYPES_ENABLED[getDemographicEntryType(entry)] !== false)
        .filter((entry) => isDemographicOptionEnabled(IMDB_DEMOGRAPHIC_AGES_ENABLED, entry.demographic?.age))
        .filter((entry) => isDemographicOptionEnabled(IMDB_DEMOGRAPHIC_GENDERS_ENABLED, entry.demographic?.gender))
        .filter((entry) => hasSelectedFieldValue(entry))
        .sort((a, b) => {
            if (IMDB_DEMOGRAPHIC_SORT_BY === 'rating') {
                const aggregateCompare = (Number(a.aggregate) - Number(b.aggregate)) * sortMultiplier;
                if (aggregateCompare !== 0) {
                    return aggregateCompare;
                }
            } else if (IMDB_DEMOGRAPHIC_SORT_BY === 'votes') {
                const voteCompare = (Number(a.voteCount) - Number(b.voteCount)) * sortMultiplier;
                if (voteCompare !== 0) {
                    return voteCompare;
                }
            } else {
                const labelCompare = compareDemographicLabels(a, b) * sortMultiplier;
                if (labelCompare !== 0) {
                    return labelCompare;
                }
            }

            const labelCompare = compareDemographicLabels(a, b);
            if (labelCompare !== 0) {
                return labelCompare;
            }

            const aggregateCompare = Number(b.aggregate) - Number(a.aggregate);
            if (aggregateCompare !== 0) {
                return aggregateCompare;
            }

            return Number(b.voteCount) - Number(a.voteCount);
        });
}

function buildHistogramHtml(histogramValues, isLoading = false) {
    if (isLoading) {
        return '<div class="imdb-muted">Loading histogram...</div>';
    }
    if (!Array.isArray(histogramValues) || histogramValues.length === 0) {
        return '<div class="imdb-muted">No histogram data.</div>';
    }

    const maxVoteCount = histogramValues.reduce((max, item) => Math.max(max, item.voteCount || 0), 0);
    const ordered = histogramValues.slice().sort((a, b) => b.rating - a.rating);

    return ordered.map((item) => {
        const width = maxVoteCount > 0 ? Math.max(2, Math.round((item.voteCount / maxVoteCount) * 100)) : 0;
        return `
            <div class="imdb-histogram-row">
                <strong>${item.rating}</strong>
                <div class="imdb-histogram-track">
                    <div class="imdb-histogram-fill" style="width: ${width}%"></div>
                </div>
                <span>${formatCount(item.voteCount)}</span>
            </div>
        `;
    }).join('');
}

function buildLetterboxdHistogramHtml(histogramValues, isLoading = false) {
    if (isLoading) {
        return '<div class="imdb-muted">Loading Letterboxd histogram...</div>';
    }
    if (!Array.isArray(histogramValues) || histogramValues.length === 0) {
        return '<div class="imdb-muted">No Letterboxd histogram data.</div>';
    }

    const maxVoteCount = histogramValues.reduce((max, item) => Math.max(max, item.voteCount || 0), 0);
    const ordered = histogramValues.slice().sort((a, b) => a.rating - b.rating);

    return `
        <div class="imdb-letterboxd-histogram">
            ${ordered.map((item) => {
                const height = maxVoteCount > 0 ? Math.max(4, Math.round((item.voteCount / maxVoteCount) * 100)) : 0;
                return `
                    <div class="imdb-letterboxd-bar" title="${formatCount(item.voteCount)} ratings" data-count="${formatCount(item.voteCount)} ratings" tabindex="0">
                        <div class="imdb-letterboxd-bar-fill" style="height: ${height}%"></div>
                        <div class="imdb-letterboxd-bar-label">${Number(item.rating).toFixed(1)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function buildCountriesHtml(entries, isLoading = false) {
    if (isLoading) {
        return '<div class="imdb-muted">Loading country averages...</div>';
    }
    if (!Array.isArray(entries) || entries.length === 0) {
        return '<div class="imdb-muted">No country breakdown.</div>';
    }

    return `
        <div class="imdb-chip-list">
            ${entries.map((entry) => `
                <span class="imdb-chip">
                    <strong>${entry.country}</strong>
                    <span>${Number(entry.aggregate).toFixed(1)}</span>
                </span>
            `).join('')}
        </div>
    `;
}

function formatMetacriticBreakdown(summary) {
    if (!summary) {
        return '';
    }

    const labels = [
        ['positive', 'Pos'],
        ['mixed', 'Mix'],
        ['negative', 'Neg']
    ];
    const parts = labels
        .map(([key, shortLabel]) => {
            const percent = summary[`${key}Percent`];
            const count = summary[`${key}Count`];
            if (!Number.isFinite(percent) || !Number.isFinite(count)) {
                return null;
            }

            return `${shortLabel} ${Math.round(percent)}% (${formatCount(count)})`;
        })
        .filter(Boolean);

    return parts.join(' / ');
}

function buildPtpVoteHtml(ptpData) {
    const personalScoreHtml = ptpData.personalRating !== null
        ? formatTenScale(ptpData.personalRating)
        : 'None';
    const actionLabel = 'Open ratings page';
    const ptpRatingsUrl = PTP_ID !== null
        ? `https://passthepopcorn.me/torrents.php?action=ratings&id=${PTP_ID}`
        : '#';

    return `
        <div>Personal: ${personalScoreHtml}</div>
        <div style="margin-top: 6px;">
            <a href="${ptpRatingsUrl}" class="imdb-ptp-trigger" title="${actionLabel}" data-ptp-vote-trigger="1">
                <strong>${formatCount(ptpData.userCount)}</strong> votes
            </a>
        </div>
        <div class="imdb-ptp-compat" data-ptp-vote-hook="1"></div>
    `;
}

function hydratePtpVoteControls(container, originalControls) {
    if (!container || !originalControls?.voteAnchor) {
        return;
    }

    const hiddenHook = container.querySelector('[data-ptp-vote-hook="1"]');
    const overlayHook = container.querySelector('[data-ptp-overlay-hook="1"]');
    const triggers = Array.from(container.querySelectorAll('[data-ptp-vote-trigger="1"]'));
    if (!hiddenHook || !overlayHook || triggers.length === 0) {
        return;
    }

    hiddenHook.innerHTML = '';

    if (originalControls.ratingSpan) {
        hiddenHook.appendChild(originalControls.ratingSpan);
    }

    if (originalControls.voteContainer) {
        overlayHook.innerHTML = '';
        overlayHook.appendChild(originalControls.voteContainer);
    } else {
        hiddenHook.appendChild(originalControls.voteAnchor);
    }
}

function buildDemographicsHtml(entries, overallVoteCount, isLoading = false) {
    if (isLoading) {
        return '<div class="imdb-muted">Loading demographics...</div>';
    }

    const items = getSortedDemographics(entries, overallVoteCount);
    if (items.length === 0) {
        return '<div class="imdb-muted">No demographic breakdown.</div>';
    }

    return `
        <div class="imdb-detail-list imdb-detail-list-scroll">
            ${items.map((entry) => `
                <div class="imdb-detail-item">
                    <span>${buildDemographicLabel(entry)}</span>
                    <strong>${Number(entry.aggregate).toFixed(1)}</strong>
                    <span class="imdb-muted">${formatCount(entry.voteCount)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function getTMDbTitleUrl(tmdb) {
    if (!tmdb?.tmdbId) {
        return null;
    }

    return `https://www.themoviedb.org/${tmdb.mediaType === 'tv' ? 'tv' : 'movie'}/${tmdb.tmdbId}`;
}

function getAggregateSourceDisplayName(sourceKey) {
    return RATINGS_AGGREGATE_SOURCE_LABELS[sourceKey] || sourceKey;
}

function getAggregateSourceLabel(sourceKey, optionValue, detailLabel = null) {
    const sourceLabel = getAggregateSourceDisplayName(sourceKey);

    if (detailLabel) {
        return `${sourceLabel} ${detailLabel}`;
    }

    const optionLabel = getAggregateSourceOptionLabel(sourceKey, optionValue);
    if (!optionLabel || optionLabel === 'User score' || optionLabel === 'Vote average') {
        return sourceLabel;
    }

    return `${sourceLabel} ${optionLabel}`;
}

function getAggregateMethodLabel() {
    return RATINGS_AGGREGATE_METHOD_LABELS[RATINGS_AGGREGATE_METHOD] || RATINGS_AGGREGATE_METHOD_LABELS.mean;
}

function calculateAggregateMedian(sources) {
    if (!Array.isArray(sources) || !sources.length) {
        return null;
    }

    const sortedSources = sources
        .filter((source) => Number.isFinite(source.score) && Number.isFinite(source.weight) && source.weight > 0)
        .slice()
        .sort((left, right) => {
            if (left.score !== right.score) {
                return left.score - right.score;
            }

            return left.label.localeCompare(right.label);
        });

    if (!sortedSources.length) {
        return null;
    }

    const totalWeight = sortedSources.reduce((sum, source) => sum + source.weight, 0);
    if (!(totalWeight > 0)) {
        return null;
    }

    const midpoint = totalWeight / 2;
    let cumulativeWeight = 0;
    for (const source of sortedSources) {
        cumulativeWeight += source.weight;
        if (cumulativeWeight >= midpoint) {
            return source.score;
        }
    }

    return sortedSources[sortedSources.length - 1].score;
}

function buildAggregateTooltip(summary) {
    if (!summary) {
        return '';
    }

    if (summary.pending) {
        return 'Loading selected aggregate sources.';
    }

    if (!summary.allSources.length) {
        return 'No selected aggregate scores are available for this title.';
    }

    const lines = [
        `Aggregate ${summary.score.toFixed(1)}/10 from ${summary.usedSources.length} source${summary.usedSources.length === 1 ? '' : 's'} using ${summary.methodLabel}.`
    ];

    summary.usedSources.forEach((source) => {
        lines.push(`${source.label}: ${source.score.toFixed(1)}/10 x${source.weight.toFixed(1)}`);
    });

    if (summary.protectedSources.length) {
        lines.push(`Protected from discard: ${summary.protectedSources.map((source) => `${source.label} ${source.score.toFixed(1)}/10`).join(' | ')}`);
    }

    if (summary.discardedSources.length) {
        lines.push(`Discarded: ${summary.discardedSources.map((source) => `${source.label} ${source.score.toFixed(1)}/10`).join(' | ')}`);
    }

    return lines.join('\n');
}

function getAggregateDiscardSummaryText(summary) {
    if (!summary) {
        return '';
    }

    if (summary.discardedLowest && summary.discardedHighest) {
        return 'Highest and lowest discarded';
    }

    if (summary.discardedLowest && summary.protectedHighest) {
        return 'Only lowest discarded';
    }

    if (summary.protectedLowest && summary.discardedHighest) {
        return 'Only highest discarded';
    }

    if (summary.discardedSources.length > 0) {
        return 'Some extremes discarded';
    }

    return '';
}

function getAggregateScoreSummary(imdbData, ptpData, supplemental) {
    if (!SHOW_RATINGS_AGGREGATE) {
        return null;
    }

    const imdbPending = isPendingValue(imdbData);
    const histogramValues = imdbData?.aggregateRatingsBreakdown?.histogram?.histogramValues || [];
    const demographicEntries = imdbData?.aggregateRatingsBreakdown?.ratingsSummaryByDemographics || [];
    const imdbScore = imdbData?.ratingsSummary?.aggregateRating;
    const displayedImdbScore = getDemographicScoreOverrideSummary(demographicEntries)?.score ?? imdbScore;
    const configuredDemographicScore = getConfiguredDemographicScoreSummary(demographicEntries);
    const meta = supplemental?.metacritic;
    const rt = supplemental?.rottenTomatoes;
    const tmdb = supplemental?.tmdb;
    const lb = supplemental?.letterboxd;
    const enabledSources = getEnabledAggregateSources();
    const allSources = [];
    let pending = false;

    enabledSources.forEach(([sourceKey, settings]) => {
        const addSource = (score, detailLabel = null) => {
            if (!Number.isFinite(score)) {
                return;
            }

            allSources.push({
                sourceKey,
                option: settings.option,
                label: getAggregateSourceLabel(sourceKey, settings.option, detailLabel),
                score,
                weight: settings.weight
            });
        };

        switch (sourceKey) {
            case 'imdb': {
                if (imdbPending) {
                    pending = true;
                    return;
                }

                if (settings.option === 'displayed') {
                    addSource(displayedImdbScore, SHOW_IMDB_DEMOGRAPHIC_SCORE_OVERRIDE && configuredDemographicScore ? configuredDemographicScore.label : 'Users');
                    return;
                }

                if (settings.option === 'overall') {
                    addSource(imdbScore, 'Users');
                    return;
                }

                if (settings.option === 'demographic') {
                    addSource(configuredDemographicScore?.score, configuredDemographicScore?.label);
                    return;
                }

                const weightedType = getAggregateWeightedScoreType(settings.option);
                if (weightedType) {
                    addSource(calculateWeightedScoreFromHistogram(histogramValues, weightedType), IMDB_WEIGHTED_SCORE_TYPE_LABELS[weightedType]);
                }
                return;
            }
            case 'ptp':
                addSource(Number.isFinite(ptpData?.userScore) ? ptpData.userScore / 10 : null);
                return;
            case 'metacritic':
                if (imdbPending) {
                    pending = true;
                    return;
                }

                if (settings.option === 'critic') {
                    const criticScore = Number.isFinite(meta?.critic?.score)
                        ? meta.critic.score
                        : imdbData?.metacritic?.metascore?.score;
                    addSource(Number.isFinite(criticScore) ? criticScore / 10 : null, 'Critics');
                    return;
                }

                if (isPendingValue(meta)) {
                    pending = true;
                    return;
                }

                addSource(Number.isFinite(meta?.user?.score) ? meta.user.score : null, 'Users');
                return;
            case 'rottenTomatoes':
                if (isPendingValue(rt)) {
                    pending = true;
                    return;
                }

                if (settings.option === 'critic') {
                    addSource(Number.isFinite(rt?.critic?.percent) ? rt.critic.percent / 10 : null, 'Critics');
                    return;
                }

                addSource(Number.isFinite(rt?.user?.percent) ? rt.user.percent / 10 : null, 'Users');
                return;
            case 'tmdb':
                if (isPendingValue(tmdb)) {
                    pending = true;
                    return;
                }

                addSource(tmdb?.voteAverage);
                return;
            case 'letterboxd':
                if (isPendingValue(lb)) {
                    pending = true;
                    return;
                }

                if (settings.option === 'user') {
                    addSource(Number.isFinite(lb?.user?.score) ? lb.user.score / 10 : null, 'Users');
                    return;
                }

                const letterboxdWeightedType = getAggregateWeightedScoreType(settings.option);
                if (letterboxdWeightedType) {
                    const weightedScore = calculateWeightedScoreFromHistogram(lb?.histogram || [], letterboxdWeightedType);
                    addSource(Number.isFinite(weightedScore) ? weightedScore * 2 : null, IMDB_WEIGHTED_SCORE_TYPE_LABELS[letterboxdWeightedType]);
                }
                return;
            default:
                return;
        }
    });

    if (pending) {
        return {
            pending: true,
            score: null,
            allSources,
            usedSources: [],
            discardedSources: [],
            protectedSources: [],
            discardedLowest: false,
            discardedHighest: false,
            protectedLowest: false,
            protectedHighest: false,
            method: RATINGS_AGGREGATE_METHOD,
            methodLabel: getAggregateMethodLabel(),
            tooltip: 'Loading selected aggregate sources.'
        };
    }

    if (!allSources.length) {
        return {
            pending: false,
            score: null,
            allSources: [],
            usedSources: [],
            discardedSources: [],
            protectedSources: [],
            discardedLowest: false,
            discardedHighest: false,
            protectedLowest: false,
            protectedHighest: false,
            method: RATINGS_AGGREGATE_METHOD,
            methodLabel: getAggregateMethodLabel(),
            tooltip: 'No selected aggregate scores are available for this title.'
        };
    }

    let usedSources = allSources.slice();
    let discardedSources = [];
    let protectedSources = [];
    let discardedLowest = false;
    let discardedHighest = false;
    let protectedLowest = false;
    let protectedHighest = false;
    if (RATINGS_AGGREGATE_DROP_EXTREMES && usedSources.length > 2) {
        const sortedSources = usedSources.slice().sort((left, right) => {
            if (left.score !== right.score) {
                return left.score - right.score;
            }

            return left.label.localeCompare(right.label);
        });

        if (sortedSources.length > 1) {
            const lowestSource = sortedSources[0];
            const highestSource = sortedSources[sortedSources.length - 1];
            const discardTargets = [];

            if (RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES && lowestSource.sourceKey === 'rottenTomatoes') {
                protectedSources.push(lowestSource);
                protectedLowest = true;
            } else {
                discardTargets.push(lowestSource);
                discardedLowest = true;
            }

            if (highestSource !== lowestSource) {
                if (RATINGS_AGGREGATE_KEEP_ROTTEN_TOMATOES && highestSource.sourceKey === 'rottenTomatoes') {
                    protectedSources.push(highestSource);
                    protectedHighest = true;
                } else {
                    discardTargets.push(highestSource);
                    discardedHighest = true;
                }
            }

            discardedSources = [...new Set(discardTargets)];
            const discardedSet = new Set(discardedSources);
            usedSources = usedSources.filter((source) => !discardedSet.has(source));
        }
    }

    const totalWeight = usedSources.reduce((sum, source) => sum + source.weight, 0);
    const score = (() => {
        switch (RATINGS_AGGREGATE_METHOD) {
            case 'average':
                return usedSources.length > 0
                    ? usedSources.reduce((sum, source) => sum + source.score, 0) / usedSources.length
                    : null;
            case 'median':
                return calculateAggregateMedian(usedSources);
            case 'mean':
            default:
                return totalWeight > 0
                    ? usedSources.reduce((sum, source) => sum + (source.score * source.weight), 0) / totalWeight
                    : null;
        }
    })();

    const summary = {
        pending: false,
        score,
        allSources,
        usedSources,
        discardedSources,
        protectedSources,
        discardedLowest,
        discardedHighest,
        protectedLowest,
        protectedHighest,
        method: RATINGS_AGGREGATE_METHOD,
        methodLabel: getAggregateMethodLabel()
    };
    summary.tooltip = Number.isFinite(score) ? buildAggregateTooltip(summary) : 'No selected aggregate scores are available for this title.';
    return summary;
}

function buildTopCardsHtml(imdbId, imdbData, ptpData, supplemental) {
    const imdbScore = imdbData?.ratingsSummary?.aggregateRating;
    const imdbVotes = imdbData?.ratingsSummary?.voteCount;
    const histogramValues = imdbData?.aggregateRatingsBreakdown?.histogram?.histogramValues || [];
    const demographicEntries = imdbData?.aggregateRatingsBreakdown?.ratingsSummaryByDemographics || [];
    const topRanking = imdbData?.ratingsSummary?.topRanking;
    const meterRank = imdbData?.meterRank;
    const metaScore = imdbData?.metacritic?.metascore?.score;
    const metaReviews = imdbData?.metacritic?.metascore?.reviewCount;
    const metaUrl = imdbData?.metacritic?.url || `https://www.metacritic.com/movie/${imdbData?.titleText?.text || ''}`;
    const imdbTitleUrl = `https://www.imdb.com/title/${imdbId}/`;
    const imdbRatingsUrl = `https://www.imdb.com/title/${imdbId}/ratings/`;
    const imdbmeterUrl = `https://www.imdb.com/chart/moviemeter/`;
    const meta = supplemental?.metacritic;
    const rt = supplemental?.rottenTomatoes;
    const tmdb = supplemental?.tmdb;
    const lb = supplemental?.letterboxd;
    const imdbPending = isPendingValue(imdbData);
    const metaPending = SHOW_RATINGS_METACRITIC && isPendingValue(meta);
    const weightedScore = getWeightedScoreSummary(histogramValues);
    const letterboxdWeightedScore = getWeightedScoreSummary(lb?.histogram || [], {
        enabled: SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE,
        sourceLabel: 'Letterboxd',
        displayScoreMultiplier: 2
    });
    const demographicScoreOverride = getDemographicScoreOverrideSummary(demographicEntries);
    const primaryImdbScore = demographicScoreOverride?.score ?? imdbScore;
    const primaryImdbVotes = demographicScoreOverride?.votes ?? imdbVotes;
    const primaryImdbMetaLabel = demographicScoreOverride?.label || 'IMDb Users';
    const rtPending = SHOW_RATINGS_ROTTEN_TOMATOES && isPendingValue(rt);
    const tmdbPending = SHOW_RATINGS_TMDB && isPendingValue(tmdb);
    const lbPending = SHOW_RATINGS_LETTERBOXD && isPendingValue(lb);
    const tmdbUrl = getTMDbTitleUrl(tmdb);
    const metaCritic = meta?.critic || {};
    const metaUser = meta?.user || {};
    const showMetacriticUserData = SHOW_RATINGS_METACRITIC_USER_SCORE || SHOW_RATINGS_METACRITIC_BREAKDOWN;
    const showMetacriticExpanded = SHOW_RATINGS_METACRITIC_USER_SCORE && SHOW_RATINGS_METACRITIC_BREAKDOWN;
    const metaCriticScore = Number.isFinite(metaCritic.score) ? metaCritic.score : metaScore;
    const metaCriticCount = Number.isFinite(metaCritic.count) ? metaCritic.count : metaReviews;
    const metaCriticUrl = metaCritic.url || metaUrl;
    const metaUserScore = Number.isFinite(metaUser.score) ? metaUser.score : null;
    const metaUserCount = Number.isFinite(metaUser.count) ? metaUser.count : null;
    const metaUserUrl = metaUser.url || (metaUrl ? new URL('user-reviews/', metaUrl).toString() : null);
    const metaCriticBreakdown = formatMetacriticBreakdown(metaCritic);
    const metaUserBreakdown = formatMetacriticBreakdown(metaUser);
    const aggregateScore = getAggregateScoreSummary(imdbData, ptpData, supplemental);
    const aggregateTooltip = escapeHtmlAttribute(aggregateScore?.tooltip || '');
    const aggregateUsesWeightedSources = !!aggregateScore?.usedSources?.some((source) => source.weight !== 1);
    const aggregateProtectsRottenTomatoes = !!aggregateScore?.protectedSources?.length;
    const aggregateDiscardSummary = getAggregateDiscardSummaryText(aggregateScore);

    return `
        <div class="imdb-ratings-top">
            <div class="imdb-ratings-card">
                <h4><a href="${imdbTitleUrl}" target="_blank" rel="noreferrer" style="color: inherit;">IMDb Users</a>${buildLegacyImdbAnchor(imdbId, 'IMDb Users')}</h4>
                <div class="imdb-ratings-value imdb-weighted-score-inline">
                    <span class="imdb-primary-score" title="${demographicScoreOverride ? `Replacing IMDb Users with ${demographicScoreOverride.label}.` : 'IMDb Users aggregate rating.'}">${imdbPending ? '...' : (Number.isFinite(primaryImdbScore) ? primaryImdbScore.toFixed(1) : 'None')}</span>
                    ${imdbPending || !weightedScore ? '' : `<span class="imdb-weighted-score-badge" title="${weightedScore.tooltip}">${weightedScore.score.toFixed(1)}</span>`}
                </div>
                <div class="imdb-ratings-meta">
                    ${imdbPending ? 'Loading IMDb data...' : `${demographicScoreOverride || weightedScore ? `<div class="imdb-ratings-meta-top"><span>${demographicScoreOverride ? primaryImdbMetaLabel : '&nbsp;'}</span>${weightedScore ? '<span class="imdb-weighted-meta-label">Weighted</span>' : ''}</div>` : ''}<a href="${imdbRatingsUrl}" target="_blank" rel="noreferrer" style="color: inherit;">${formatCount(primaryImdbVotes)} votes</a><br>
                    ${topRanking?.rank ? `Top Rated rank #${formatCount(topRanking.rank)}` : 'No top ranking'}`}
                </div>
            </div>
            <div class="imdb-ratings-card">
                <h4>PTP</h4>
                <div class="imdb-ratings-value imdb-ptp-value-wrapper">
                    <span class="imdb-ptp-value-label">${formatTenScale(ptpData.userScore)}</span>
                    <div class="imdb-ptp-overlay-target" data-ptp-overlay-hook="1"></div>
                </div>
                <div class="imdb-ratings-meta">
                    ${buildPtpVoteHtml(ptpData)}
                </div>
            </div>
            ${SHOW_RATINGS_METACRITIC ? `
                <div class="imdb-ratings-card imdb-ratings-card-metacritic${showMetacriticExpanded ? ' imdb-ratings-card-metacritic-expanded' : ''}">
                    <h4><a href="${metaUrl}" target="_blank" rel="noreferrer" style="color: inherit;">Metacritic</a></h4>
                    ${showMetacriticUserData ? `
                        <div class="imdb-provider-split">
                            <div>
                                <div class="imdb-provider-split-value">${imdbPending ? '...' : (Number.isFinite(metaCriticScore) ? metaCriticScore : 'None')}</div>
                                <div class="imdb-provider-split-label">Critics</div>
                                <div class="imdb-ratings-meta">
                                    ${imdbPending
                                        ? 'Loading Metacritic...'
                                        : `${Number.isFinite(metaCriticCount) ? `<a href="${metaCriticUrl}" target="_blank" rel="noreferrer">${formatCount(metaCriticCount)} critic reviews</a>` : 'No critic reviews'}${metaPending ? '<br>Loading review split...' : (SHOW_RATINGS_METACRITIC_BREAKDOWN && metaCriticBreakdown ? `<br>${metaCriticBreakdown}` : '')}`
                                    }
                                </div>
                            </div>
                            <div>
                                ${SHOW_RATINGS_METACRITIC_USER_SCORE ? `<div class="imdb-provider-split-value">${metaPending ? '...' : (Number.isFinite(metaUserScore) ? metaUserScore.toFixed(1) : 'None')}</div>` : ''}
                                <div class="imdb-provider-split-label">Users</div>
                                <div class="imdb-ratings-meta">
                                    ${metaPending
                                        ? 'Loading Metacritic users...'
                                        : `${Number.isFinite(metaUserCount) ? `<a href="${metaUserUrl}" target="_blank" rel="noreferrer">${formatCount(metaUserCount)} user ratings</a>` : 'No user ratings'}${SHOW_RATINGS_METACRITIC_BREAKDOWN && metaUserBreakdown ? `<br>${metaUserBreakdown}` : ''}`
                                    }
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="imdb-ratings-value">${imdbPending ? '...' : (Number.isFinite(metaCriticScore) ? metaCriticScore : 'None')}</div>
                        <div class="imdb-ratings-meta">
                            ${imdbPending ? 'Loading Metacritic...' : `${Number.isFinite(metaCriticCount) ? `<a href="${metaCriticUrl}" target="_blank" rel="noreferrer">${formatCount(metaCriticCount)} critic reviews</a>` : 'No critic reviews'}`}
                        </div>
                    `}
                </div>
            ` : ''}
            ${SHOW_RATINGS_IMDB_METER ? `
                <div class="imdb-ratings-card">
                    <h4><a href="${imdbmeterUrl}" target="_blank" rel="noreferrer" style="color: inherit;">IMDb Meter</a></h4>
                    <div class="imdb-ratings-value">${imdbPending ? '...' : (meterRank?.currentRank ? `#${formatCount(meterRank.currentRank)}` : 'None')}</div>
                    <div class="imdb-ratings-meta">
                        ${imdbPending ? 'Loading meter rank...' : (formatMeterRankChange(meterRank) || 'No rank change')}
                    </div>
                </div>
            ` : ''}
            ${SHOW_RATINGS_ROTTEN_TOMATOES ? `
                <div class="imdb-ratings-card">
                    <h4>${rt?.url ? `<a href="${rt.url}" target="_blank" rel="noreferrer" style="color: inherit;" class="imdb-provider-heading">${rt?.icon ? `<img src="${rt.icon}" alt="Rotten Tomatoes status">` : ''}<span>Rotten Tomatoes</span></a>` : `<span class="imdb-provider-heading">${rt?.icon ? `<img src="${rt.icon}" alt="Rotten Tomatoes status">` : ''}<span>Rotten Tomatoes</span></span>`}</h4>
                    <div class="imdb-provider-split">
                        <div>
                            <div class="imdb-provider-split-value">${rtPending ? '...' : (Number.isFinite(rt?.critic?.percent) ? `${rt.critic.percent}%` : 'None')}</div>
                            <div class="imdb-provider-split-label">Critics</div>
                            <div class="imdb-ratings-meta">
                                ${rtPending ? 'Loading Rotten Tomatoes...' : `(${Number.isFinite(rt?.critic?.count) ? `<a href="${rt.critic.url}" target="_blank" rel="noreferrer" title="${Number.isFinite(rt?.critic?.percent) ? `${rt.critic.percent}% of critics have given this movie a positive review.` : ''}">${formatDisplayCount(rt.critic.countDisplay, rt.critic.count)} votes</a>` : 'Unknown'})`}
                            </div>
                        </div>
                        <div>
                            <div class="imdb-provider-split-value">${rtPending ? '...' : (Number.isFinite(rt?.user?.percent) ? `${rt.user.percent}%` : 'None')}</div>
                            <div class="imdb-provider-split-label">Users</div>
                            <div class="imdb-ratings-meta">
                                ${rtPending ? '&nbsp;' : `(${Number.isFinite(rt?.user?.count) || rt?.user?.countDisplay ? `<a href="${rt.user.url}" target="_blank" rel="noreferrer" title="${Number.isFinite(rt?.user?.percent) ? `${rt.user.percent}% of users have rated this movie 3.5 stars or higher.` : ''}">${formatRottenTomatoesAudienceCount(rt.user.countDisplay, rt.user.count)} votes</a>` : 'Unknown'})`}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            ${SHOW_RATINGS_TMDB ? `
                <div class="imdb-ratings-card">
                    <h4>${tmdbUrl ? `<a href="${tmdbUrl}" target="_blank" rel="noreferrer" style="color: inherit;">TMDb</a>` : 'TMDb'}</h4>
                    <div class="imdb-ratings-value">${tmdbPending ? '...' : (Number.isFinite(tmdb?.voteAverage) ? tmdb.voteAverage.toFixed(1) : 'None')}</div>
                    <div class="imdb-ratings-meta">
                        ${tmdbPending ? 'Loading TMDb...' : (Number.isFinite(tmdb?.voteCount) ? `${formatCount(tmdb.voteCount)} votes` : 'No vote count')}
                    </div>
                </div>
            ` : ''}
            ${SHOW_RATINGS_LETTERBOXD ? `
                <div class="imdb-ratings-card">
                    <h4>${lb?.url ? `<a href="${lb.url}" target="_blank" rel="noreferrer" style="color: inherit;">Letterboxd</a>` : 'Letterboxd'}</h4>
                    <div class="imdb-ratings-value${SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE ? ' imdb-weighted-score-inline' : ''}">
                        <span class="${SHOW_RATINGS_LETTERBOXD_WEIGHTED_SCORE ? 'imdb-primary-score' : ''}">${lbPending ? '...' : (Number.isFinite(lb?.user?.score) ? (lb.user.score / 10).toFixed(1) : 'None')}</span>
                        ${lbPending || !letterboxdWeightedScore ? '' : `<span class="imdb-weighted-score-badge" title="${letterboxdWeightedScore.tooltip}">${letterboxdWeightedScore.displayScore.toFixed(1)}</span>`}
                    </div>
                    ${SHOW_RATINGS_LETTERBOXD_HISTOGRAM
                        ? buildLetterboxdHistogramHtml(lb?.histogram || [], lbPending)
                        : `<div class="imdb-ratings-meta">
                            ${lbPending ? 'Loading Letterboxd...' : `Ratings: ${Number.isFinite(lb?.user?.count) ? `<a href="${lb.user.url}" target="_blank" rel="noreferrer">${formatCount(lb.user.count)}</a>` : 'Unknown'}<br>
                            Likes: ${Number.isFinite(lb?.likes) ? `<a href="${lb.likesUrl}" target="_blank" rel="noreferrer">${formatCount(lb.likes)}</a>` : 'Unknown'} | Fans: ${Number.isFinite(lb?.fans) ? `<a href="${lb.fansUrl}" target="_blank" rel="noreferrer">${formatCount(lb.fans)}</a>` : 'Unknown'}`}
                        </div>`
                    }
                </div>
            ` : ''}
            ${SHOW_RATINGS_AGGREGATE ? `
                <div class="imdb-ratings-card">
                    <h4>Aggregate</h4>
                    <div class="imdb-ratings-value" title="${aggregateTooltip}">
                        ${aggregateScore?.pending ? '...' : (Number.isFinite(aggregateScore?.score) ? aggregateScore.score.toFixed(1) : 'None')}
                    </div>
                    <div class="imdb-ratings-meta" title="${aggregateTooltip}">
                        ${aggregateScore?.pending
                            ? 'Loading selected sources...'
                            : (aggregateScore?.allSources?.length
                                ? `${aggregateScore.usedSources.length} source${aggregateScore.usedSources.length === 1 ? '' : 's'} used<br>${aggregateScore.methodLabel}${aggregateUsesWeightedSources && aggregateScore.method === 'mean' ? '<br>Custom weights applied' : ''}${aggregateProtectsRottenTomatoes ? '<br>RT protected from discard' : ''}${aggregateDiscardSummary ? `<br>${aggregateDiscardSummary}` : ''}`
                                : 'No selected scores available')
                        }
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function buildRottenTomatoesConsensusHtml(supplemental) {
    if (!SHOW_RATINGS_ROTTEN_TOMATOES) {
        return '';
    }

    const consensus = supplemental?.rottenTomatoes?.consensus;
    if (!consensus) {
        return '';
    }

    return `<div class="imdb-ratings-consensus"><em>${consensus}</em></div>`;
}

function buildBoxHtml(imdbId, imdbData, ptpData, supplemental) {
    const histogramValues = imdbData?.aggregateRatingsBreakdown?.histogram?.histogramValues || [];
    const countries = imdbData?.aggregateRatingsBreakdown?.ratingsSummaryByCountry || [];
    const demographics = imdbData?.aggregateRatingsBreakdown?.ratingsSummaryByDemographics || [];
    const overallVoteCount = imdbData?.ratingsSummary?.voteCount || 0;
    const imdbPending = isPendingValue(imdbData);
    const detailSections = [];

    if (SHOW_IMDB_VOTE_HISTOGRAM) {
        detailSections.push(`
            <div class="imdb-ratings-section">
                <h4>IMDb Vote Histogram</h4>
                ${buildHistogramHtml(histogramValues, imdbPending)}
            </div>
        `);
    }

    if (SHOW_IMDB_DEMOGRAPHICS) {
        detailSections.push(`
            <div class="imdb-ratings-section">
                <h4>IMDb Demographics</h4>
                ${buildDemographicsHtml(demographics, overallVoteCount, imdbPending)}
            </div>
        `);
    }

    return `
        <div class="imdb-ratings-shell">
            ${buildTopCardsHtml(imdbId, imdbData, ptpData, supplemental)}
            ${buildRottenTomatoesConsensusHtml(supplemental)}
            ${detailSections.length > 0 ? `<div class="imdb-ratings-grid">${detailSections.join('')}</div>` : ''}
            ${SHOW_IMDB_COUNTRY_AVERAGES ? `
                <div class="imdb-ratings-section">
                    <h4>Country Averages</h4>
                    ${buildCountriesHtml(countries, imdbPending)}
                </div>
            ` : ''}
        </div>
    `;
}

function setupAdaptiveTopCardsLayout(container) {
    if (!container) {
        return;
    }

    if (container._imdbTopCardsResizeObserver) {
        container._imdbTopCardsResizeObserver.disconnect();
        container._imdbTopCardsResizeObserver = null;
    }

    const topCards = container.querySelector('.imdb-ratings-top');
    if (!topCards) {
        return;
    }

    topCards.classList.toggle('imdb-ratings-top-squeezed', USE_SQUEEZED_RATINGS_TILES);

    if (USE_SQUEEZED_RATINGS_TILES) {
        topCards.classList.remove('imdb-ratings-top-single-column');
        topCards.style.removeProperty('--imdb-top-card-min');
        topCards.style.removeProperty('grid-template-columns');
        return;
    }

    const cards = topCards.querySelectorAll(':scope > .imdb-ratings-card');
    if (!cards.length) {
        return;
    }

    const apply = () => {
        const styles = getComputedStyle(topCards);
        const gap = Number.parseFloat(styles.columnGap || styles.gap || '10') || 10;
        const width = topCards.clientWidth;
        const cardCount = cards.length;
        const cardSpans = Array.from(cards, (card) => card.classList.contains('imdb-ratings-card-metacritic-expanded') ? 2 : 1);

        if (!width || cardCount <= 0) {
            return;
        }

        const widthPerCard = (width - (gap * Math.max(0, cardCount - 1))) / cardCount;
        const absoluteMinCardWidth = 145;
        const preferredMaxCardWidth = 190;
        const adaptiveMin = Math.max(absoluteMinCardWidth, Math.min(preferredMaxCardWidth, Math.floor(widthPerCard)));
        topCards.style.setProperty('--imdb-top-card-min', `${adaptiveMin}px`);

        const maxColumnsThatFit = Math.max(
            1,
            Math.min(cardCount, Math.floor((width + gap) / (absoluteMinCardWidth + gap)))
        );

        const getRowLoadsForColumns = (columns) => {
            const rowLoads = [];
            let currentLoad = 0;

            cardSpans.forEach((rawSpan) => {
                const span = Math.max(1, Math.min(columns, rawSpan));

                if (currentLoad > 0 && currentLoad + span > columns) {
                    rowLoads.push(currentLoad);
                    currentLoad = 0;
                }

                currentLoad += span;

                if (currentLoad >= columns) {
                    rowLoads.push(currentLoad);
                    currentLoad = 0;
                }
            });

            if (currentLoad > 0) {
                rowLoads.push(currentLoad);
            }

            return rowLoads;
        };

        let bestColumns = 1;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let columns = 1; columns <= maxColumnsThatFit; columns++) {
            const rowLoads = getRowLoadsForColumns(columns);
            const rows = rowLoads.length;
            const maxRowLoad = Math.max(...rowLoads);
            const minRowLoad = Math.min(...rowLoads);
            const imbalance = rows <= 1 ? 0 : (maxRowLoad - minRowLoad);
            const lastRowEmptySlots = columns - rowLoads[rowLoads.length - 1];
            const totalEmptySlots = rowLoads.reduce((sum, load) => sum + (columns - load), 0);
            const score = (imbalance * 1000000) + (lastRowEmptySlots * 10000) + (totalEmptySlots * 100) + rows;

            if (score < bestScore || (score === bestScore && columns > bestColumns)) {
                bestScore = score;
                bestColumns = columns;
            }
        }

        topCards.classList.toggle('imdb-ratings-top-single-column', bestColumns === 1);
        topCards.style.gridTemplateColumns = `repeat(${bestColumns}, minmax(0, 1fr))`;
    };

    apply();

    if (typeof ResizeObserver === 'function') {
        const resizeObserver = new ResizeObserver(() => {
            apply();
        });
        resizeObserver.observe(topCards);
        container._imdbTopCardsResizeObserver = resizeObserver;
    } else {
        topCards.style.setProperty('--imdb-top-card-min', '170px');
    }
}

function renderRatingsBox(container, imdbId, imdbData, ptpData, supplemental, originalControls) {
    container.innerHTML = buildBoxHtml(imdbId, imdbData, ptpData, supplemental);
    setupAdaptiveTopCardsLayout(container);
    hydratePtpVoteControls(container, originalControls);
}

function buildRatingsBox(imdbId, imdbData, ptpData, supplemental, originalControls) {
    const container = document.createElement('div');
    container.id = RATINGS_PANEL_ID;
    container.className = 'imdb-graphql-ratings-box';
    renderRatingsBox(container, imdbId, imdbData, ptpData, supplemental, originalControls);
    return container;
}

function replaceRatingsBox(oldTable, newTable) {
    oldTable.parentNode.replaceChild(newTable, oldTable);
}

function makeRatingsButton(text, onClick) {
    const button = document.createElement('a');
    button.href = '#';
    button.style.float = 'right';
    button.textContent = text;
    button.addEventListener('click', (event) => {
        event.preventDefault();
        onClick();
    });
    return button;
}

function reinitializeVoter(personalRating) {
    const initVoting = window.InitializeMoviePageVoting;
    if (typeof initVoting === 'function' && PTP_ID !== null) {
        initVoting(PTP_ID, personalRating);
    }
}

async function clearRatingsCaches(imdbId) {
    if (imdbId) {
        await GM.setValue(`iMDB_data_${imdbId}`, null);
        await GM.setValue(`ratings_supplemental_data_${imdbId}`, null);
    }

    window.location.reload();
}

function buildRequestRatingsPanel(imdbId, imdbData, ptpData, supplemental, originalControls) {
    const panel = document.createElement('div');
    panel.className = 'panel';

    const heading = document.createElement('div');
    heading.className = 'panel__heading';

    const title = document.createElement('span');
    title.className = 'panel__heading__title';
    title.textContent = 'Ratings';

    heading.appendChild(title);
    heading.appendChild(makeRatingsButton('Refresh', () => {
        clearRatingsCaches(imdbId);
    }));

    const body = document.createElement('div');
    body.className = 'panel__body';
    body.appendChild(buildRatingsBox(imdbId, imdbData, ptpData, supplemental, originalControls));

    panel.appendChild(heading);
    panel.appendChild(body);
    return panel;
}

function mountRatingsPanel(imdbId, ptpData, supplemental, originalControls) {
    ensureRatingsStyles();

    const ratingsTable = document.getElementById(RATINGS_PANEL_ID);
    let mountedBox = null;

    if (ratingsTable) {
        const newRatingsBox = buildRatingsBox(imdbId, undefined, ptpData, supplemental, originalControls);
        const header = ratingsTable.parentNode.querySelector('.panel__heading__title');
        if (header) {
            header.innerHTML = 'Ratings';
        }

        replaceRatingsBox(ratingsTable, newRatingsBox);
        mountedBox = newRatingsBox;
        reinitializeVoter(ptpData.personalRating);

        if (header && header.parentElement && !header.parentElement.querySelector('[data-imdb-graphql-ratings-refresh="1"]')) {
            const refreshButton = makeRatingsButton('Refresh', () => {
                clearRatingsCaches(imdbId);
            });
            refreshButton.dataset.imdbGraphqlRatingsRefresh = '1';
            header.parentElement.appendChild(refreshButton);
        }
    } else {
        const requestTable = document.getElementById('request-table');
        if (requestTable && requestTable.parentNode) {
            const panel = buildRequestRatingsPanel(imdbId, undefined, ptpData, supplemental, originalControls);
            requestTable.parentNode.insertBefore(panel, requestTable.nextSibling);
            mountedBox = panel.querySelector(`#${RATINGS_PANEL_ID}`);
        }
    }

    return mountedBox;
}

function getFirstNonEmptyValue(...values) {
    for (const value of values) {
        if (value === null || value === undefined) {
            continue;
        }
        if (typeof value === 'string' && value.trim() === '') {
            continue;
        }

        return value;
    }

    return null;
}

function parseRottenTomatoesNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const match = value.match(/-?\d+(\.\d+)?/);
        if (match) {
            return Number.parseFloat(match[0]);
        }
    }

    return null;
}

function parseRottenTomatoesCount(value) {
    const parsed = parseRottenTomatoesNumber(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function parseMetacriticCountText(text, label) {
    if (typeof text !== 'string' || !text.trim()) {
        return null;
    }

    const match = text.match(new RegExp(`Based on\\s+([\\d,]+)\\s+${label}`, 'i'));
    if (!match) {
        return null;
    }

    const parsed = Number.parseInt(match[1].replace(/,/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseMetacriticDistribution(doc) {
    const container = doc.querySelector('.score-count__container');
    if (!container) {
        return null;
    }

    const summary = {};
    const rows = Array.from(container.children);

    for (let index = 0; index < rows.length; index += 3) {
        const label = rows[index]?.textContent?.trim()?.toLowerCase();
        const countNode = rows[index + 2];
        if (!['positive', 'mixed', 'negative'].includes(label) || !countNode) {
            continue;
        }

        const spans = countNode.querySelectorAll('span');
        const count = Number.parseInt((spans[0]?.textContent || '').replace(/[^\d]/g, ''), 10);
        const percent = Number.parseFloat((spans[1]?.textContent || '').replace(/[^\d.]/g, ''));

        summary[`${label}Count`] = Number.isFinite(count) ? count : null;
        summary[`${label}Percent`] = Number.isFinite(percent) ? percent : null;
    }

    return Object.keys(summary).length > 0 ? summary : null;
}

function parseMetacriticReviewPage(html, type, pageUrl) {
    const doc = parseHtmlDocument(html);
    const scoreMatch = html.match(new RegExp(`${type === 'critic' ? 'Metascore' : 'User score'}\\s+([\\d.]+)\\s+out of\\s+${type === 'critic' ? '100' : '10'}`, 'i'));
    const sentiment = doc.querySelector('.score-card-left__score-sentiment .score-sentiment__texts > div')?.textContent?.trim() || null;
    const distribution = parseMetacriticDistribution(doc) || {};
    const countLabel = type === 'critic' ? 'Critic Reviews' : 'User Ratings';
    const totalCount = parseMetacriticCountText(html, countLabel);
    const scoreValue = scoreMatch ? Number.parseFloat(scoreMatch[1]) : null;

    return {
        url: pageUrl,
        score: Number.isFinite(scoreValue) ? scoreValue : null,
        count: Number.isFinite(totalCount) ? totalCount : null,
        sentiment,
        ...distribution
    };
}

function getRottenTomatoesCriticType(criticsScore) {
    const rawType = getFirstNonEmptyValue(
        criticsScore?.scoreType,
        criticsScore?.ratingState,
        criticsScore?.tomatometerState,
        criticsScore?.iconName,
        criticsScore?.scoreIcon?.name,
        criticsScore?.scoreIcon?.type,
        criticsScore?.scoreIcon?.tomatometer,
        criticsScore?.scoreSentiment,
        criticsScore?.classification?.type,
        criticsScore?.classification
    );

    return rawType ? String(rawType).trim().toLowerCase() : '';
}

function isRottenTomatoesCertified(criticsScore) {
    if (criticsScore?.certified === true || criticsScore?.isCertified === true) {
        return true;
    }

    return getRottenTomatoesCriticType(criticsScore).includes('certified');
}

async function fetchRottenTomatoesFromWikidata(imdbId) {
    const queryUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(`SELECT * WHERE {?s wdt:P345 "${imdbId}". OPTIONAL { ?s wdt:P1258 ?Rotten_Tomatoes_ID. }}`)}`;
    const payload = await jsonRequest(queryUrl);
    const rtId = payload?.results?.bindings?.[0]?.Rotten_Tomatoes_ID?.value;
    return rtId ? `https://www.rottentomatoes.com/${rtId}` : null;
}

async function fetchMetacriticData(url, options = {}) {
    if (!url) {
        return null;
    }

    try {
        const includeUserData = !!options.requireUserData;
        const includeBreakdown = !!options.requireBreakdown;
        const requestHeaders = {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9'
        };
        const mainUrlObject = new URL(url);
        const normalizedPath = `${mainUrlObject.pathname.replace(/\/+$/, '')}/`;
        const mainUrl = new URL(normalizedPath, mainUrlObject.origin).toString();
        const criticUrl = new URL(`${normalizedPath}critic-reviews/`, mainUrlObject.origin).toString();
        const userUrl = new URL(`${normalizedPath}user-reviews/`, mainUrlObject.origin).toString();
        const requests = [textRequest(mainUrl, requestHeaders)];
        if (includeBreakdown) {
            requests.push(textRequest(criticUrl, requestHeaders));
        }
        if (includeUserData) {
            requests.push(textRequest(userUrl, requestHeaders));
        }
        const responses = await Promise.all(requests);
        const [mainHtml] = responses;
        const criticHtml = includeBreakdown ? responses[1] : null;
        const userHtml = includeUserData ? responses[responses.length - 1] : null;

        const mainDoc = parseHtmlDocument(mainHtml);
        const critic = includeBreakdown ? parseMetacriticReviewPage(criticHtml, 'critic', criticUrl) : {};
        const user = includeUserData ? parseMetacriticReviewPage(userHtml, 'user', userUrl) : null;
        const mainUserCount = parseMetacriticCountText(mainHtml, 'User Ratings');
        const mainCriticCount = parseMetacriticCountText(mainHtml, 'Critic Reviews');

        return {
            url: mainUrl,
            critic: {
                ...critic,
                count: Number.isFinite(critic.count) ? critic.count : mainCriticCount
            },
            user: user ? {
                ...user,
                count: Number.isFinite(user.count) ? user.count : mainUserCount
            } : null,
            title: mainDoc.querySelector('title')?.textContent?.trim() || null
        };
    } catch (_) {
        return null;
    }
}

function getRottenTomatoesLogo(criticScore, isCertified, isLarge = true) {
    if (Number.isNaN(criticScore)) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAzBAMAAAAnTUYnAAAAMFBMVEX///8AAAD8/P/+/v/8/v/9/f/////9///8/P/////9/f/9/f/9///6///////7//9jXvJiAAAAEHRSTlPfAL/NsJUWol0ihXlpMk9AUJO7fgAAAZRJREFUOMt10j1Iw0AUwPGnEfxEfFVDq4j12S6CEDs4a7EUtxoo4ljQKohgq+jiUnFwcCmis3VwcHMRRBCKu1DQyUFEcBJpBxcnL9ckd6Z3f8iQ9yPkHQmg2zcG8uQlphObGhg5/lTIKhVMm2LvrTKWnH4moqugjJ08HcaTRIsYkDAbJolVDQh7gdsupR7KkqyTXLwhZOvt61KiKXmDXzGPXd9Xhfy4Q3Zl5wCMkidnxLKZpLI74NTjyqYDCwmiSfDaa8prkSgV7SDK+NLZlLCR3rcgQbEo+C1xqYOTTUUQ9TtiWsAy0suWJEaOyQjw+FxUYXIKqmaZXCilj4mllHaEcVCXg1GNlGBIIxUY1EgBBjQyoREL2rTPzDhiqIQ/o7QJ7W7zEIJghnueYWliSFaCcMu+zcpg8ruWHToQcFv7ferqgzIJyecxvJsqk3H1J2WCGX9nsUY3l5DinCUuEQuC9SIXxR9340okGoAudAXXAovVfMGPf3KLQsxHCVZQCOvI3/oOhfA2bD4/qKEQLzN/nkfRH1D6W+4DJAr9AAAAAElFTkSuQmCC';
    }
    if (criticScore < 60) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEUAAAAO/2wM/20N/3MN/20N/24N/20R/2wP/2wQ/3AN/24O/24P/20P/24M/20M/24BuYFjAAAAEHRSTlMAybgUrTqFLXggYUhUnpNr9KbLSQAAAdNJREFUOMuFlL8vBEEUx5dzOIR8xzoch0kkGhGiQETiKiVKnYtORUOhOfwDiD/gLlGLnwmJCIXeNgqVq7SXSERp3ns7e7syiW+xs7OfnX3vzfvOev/rUftfTrAAwD9ygFRBGbToIF0gDTpII5MhB1llohzkmYnvJAoqJJmH6xg5BqmPblsCqMM6aa7ndgWNfGxRQKSfloBUqpNWmo+Ym04m3fzd703alUszXzfjNmXP301VgawZ0xoom7ES5dIEBXxIsU82ILJhjXqY0uO4GZrKmipIJlI7Z9AJbfMvMHk1gaDyk6l9SG52jcpJI0YDiEocmPU5XdGIlJd9iUvJtcbVF5HU8u3upMdKBwkQ73jmriBFaLqUks45Q6QVL4mKDiKainKr/SENFIWViz2dWzuaKdJzzXR5y4Idtk1M6u2FQTsSko9OUB4niWdWvkH7cGrc9gdD57yd71SYkrokJbXCi7NeB83FYTKOiYF7rHcUBsImbAnpFSeKR7bB70pzc3QuEfqqjYYL6aD22aTWizfAEpWslbySrndw796LzsAiO1x8ZdUBGzDN6Zbj516FPZg1aDgCnIntzvwPHRwRB+aCHArE3w6dyj/JodQBsOECxBKzXw1bZfpNbnldAAAAAElFTkSuQmCC';
    }
    if (isCertified) {
        return isLarge
            ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEUAAAD/RTP/3ylG/3T//v7/7zb/nSz/1VP/3zH/aDhB/3tZ/33/5eHW/1z/hHv/wLpmoPHOAAAAEHRSTlMA0+6K+7S0N6XAdqzCUL21ms6D8QAAAutJREFUOMtlk09IFFEcx9cgtUBohMQBw/otb5xF7LCPJVnxELxLsLj5hvUPXnbn4NohWA1dPQg5S2JFoFLZXiIYjBjpMt526SDM2WyXVJIOhpdAiGCPQf3e223V2S8Db3if+X2/v5nfm0BdLQv5B/mNTKBBC5NTCZ5YntzwA3UKtIe6lYDllA9Y+v5Iq1Y6mActfR7MmZBO81mttGiNgpY8F/6KzN7cAyTNpX3NWj5rowOSL3oOSof6kxm4fH+R1KOaTBhtXSnxMQDQStlJCGX+p5A5LTsDYHCCqPVrD6RrKWafSeZBX8k9o5sA6UR2ZqRa1Mz7zH0gNqU2tQDIY3OWrEryGkgLeumU0mh0BaBn6lLNzgRA/zE7SlH2eyAHHDQBrpiAenrDdsrRsqMoKgc0uCZiBFhSUI8GFaEOQJOk6BlvQnLL+aJIXQeQQWJVLoqje7WBkI+04xa+J5I1H8EkTRKi+IVtZwJNFoRUVVHW8MJFlWRdkBYLhj3GPBbrZix2yoZO7nXF2kGXNSlJ2GckuAjSKUibIDuKt1OJM1Vhu7svh05jHfgRRE3ei8W8uBdnLO6x+AmWqrUcxZM2vxgb6mKsUicmqN7OcSXGutHtz09WudslifgGisjZZX/xYYY1Q10xRY5hHclvhCJHdi1rxpG8gZTiVwek5BQaSSek5QEZbiDtJCmnfauBmNgaytTxPn9hEjxUO1UYKaan/3hL5AOqjEE7vqSot0lCAw6cwzHG6KuStKyHpg+h10gQN5xw+eD3aWu8duQdm9q9upGDsIHQoJQ6garsCASN55Hc5gfDiPRTVLRGypQnSJi7A8QN8omw4fYP1v4Sm7ph1+Wcu6QXegkhNJqRYKtArTDnYWQTQSBg8OBWQZCjYoFGKIlEIjlijIWNSJDTgeInLKHFIvUJSUH4XS1i16Ihx3HkSqPFd7gvSfRjVmaK2Ow354xsbwfOa2CgTu4ELqpcI23Yh09He1XnjB/IrX92kRYQCwoChgAAAABJRU5ErkJggg=='
            : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEX/NAEAAAD/1wEE/0//eQ//XwkO/20R/1j/wi7/0QL/mwZG/1P/vwcW/1Gf/yX/rCaMpZb7AAAAEHRSTlP5AP6R0a/DejLZxV/DRYprc1z0OgAAAeNJREFUOMt10jFIG1EYB/BHaYZKoRxN8EGX8kiGSLcHPUEojbxAUjpcJFlcOhSeg0vhIKF0aAOxOJZrOhQ6HXboWEp1CIKIk4MgjpJFJxdBHBwc9HvffZec+eIfDu7ej+9737s74Y0jpcw8jUQ2jdkwpspkzfxRLvvm4q4U3kQqyQvTICFQo5RNNyMGK9Kq6lh6scqm30hFUq9ySiaV3q7CnKZSbJBQSfT91/mJwlQTKSwmFfqV1h+pqIvSi3CT81Br/TNKxqugvFUoB9rFP6N2IBKb9a+0DnUn/B8s46OTvJvshxDvvlx+zgVCiMc4HUgPbuaEy78PArPkNgJpggS4siaS5GClBgIDlMQ4VFQFWaSSTGaU2kMpi8nAcCglJrEqegKO843JA5LX90rAZAYlVmKa4ARcnlA3Lrm0hguetD5FHqrfIMtTZ6vhV+DySFVA8tEOP+lcA6QQP2eyVOyCePUSk2jDc9Is86FrKPmIXmnQytEAxQqKrJda14OOxvidwU0r7tN/vRXqNMTbJASZLJAcMZlPRPKaT4m0V5i0V518tVysnQex1k6Cb+171+2pDWnB91P5i/vMWu0PhuseRq4Pt8KX9pBkZehlc9weyYJ3J3KT5NmqN5l2F0UeMpmF6xZWVq84L+zNHAAAAABJRU5ErkJggg==';
    }
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEX/NAsAAAAC/1D/OQz/NAsJ/0//Nwz/MwsU/1Eo/04G/1EJ/1UD/1H/sTL/XhfJ/0x2piOmAAAAEHRSTlP7AJDOoXcqWj9mLB5PZaZRPI8p8gAAAX5JREFUOMt90jFLAzEUB/BXc9DVSGmhdXpyi4KkVropFv0CdnJSDwRXb6lzB8HBRcXBwUFBJ10EQd100sGP4OYHED+AmOTy+tK7nP+W4y4/8vJyF5AuhzIXkgcskz4OZfNoGJApXG/1UXNBWjh7hYjHeWm+v73GGuby1abR5SUnZgFKvHHpyT2DsaE35/n2xCe/gwNv/OPuxglDrP8XSoEYkFyjjq43v/TZAZPIyZOBzQnEGaB0M3k8Q9xSWr5HEiVWarD8BbCAsSJQ0LOyByY/eGrHMq4aqdt7cf6rwEuipQah9LRsB6WrZQWEqc8RtjstEIyQ0ADu1U8CwQYUQDomwvyoOZgs1GIREErFzmHkh7aV8jnlUuxB/VOtZ/YjxtZWLCakYnRNoQHhuHetChDZ7xNKtfBNqUK79BykWuqhnUbuvPG4cjcVKzXeKEUkVqQCUejMSqCHxIm/JZEdQ5JGfv8kVI+XZ5E7DFEqfZG7tNZiIkko+6sKOmsDSfkD2vBSWgDW61wAAAAASUVORK5ErkJggg==';
}

async function fetchRottenTomatoesData(imdbId) {
    try {
        const url = await fetchRottenTomatoesFromWikidata(imdbId);
        if (!url) {
            return null;
        }

        const doc = parseHtmlDocument(await textRequest(url));
        const jsonText = doc.getElementById('media-scorecard-json')?.textContent || '';
        if (!jsonText) {
            return null;
        }

        const payload = JSON.parse(jsonText);
        const criticsScore = payload?.criticsScore || {};
        const audienceScore = payload?.audienceScore || {};
        const criticPercent = parseRottenTomatoesNumber(getFirstNonEmptyValue(criticsScore?.score, criticsScore?.tomatometer, criticsScore?.value));
        const criticAverage = parseRottenTomatoesNumber(getFirstNonEmptyValue(criticsScore?.averageRating, criticsScore?.averageScore));
        const criticCountDisplay = getFirstNonEmptyValue(criticsScore?.ratingCount, criticsScore?.reviewCount, criticsScore?.count);
        const criticCount = parseRottenTomatoesCount(criticCountDisplay);
        const userPercent = parseRottenTomatoesNumber(getFirstNonEmptyValue(audienceScore?.score, audienceScore?.popcornScore, audienceScore?.value));
        const userAverage = parseRottenTomatoesNumber(getFirstNonEmptyValue(audienceScore?.averageRating, audienceScore?.averageScore));
        const userCountDisplay = getFirstNonEmptyValue(audienceScore?.bandedRatingCount, audienceScore?.ratingCount, audienceScore?.count);
        const userCount = parseRottenTomatoesCount(userCountDisplay);
        const criticCertified = isRottenTomatoesCertified(criticsScore);
        const criticUrl = new URL(url);
        criticUrl.pathname += '/reviews';
        const userUrl = new URL(url);
        userUrl.pathname += '/reviews';
        userUrl.search = 'type=user';

        return {
            url,
            critic: {
                score: Number.isFinite(criticAverage) ? Math.trunc(criticAverage * 10) : null,
                percent: Number.isFinite(criticPercent) ? Math.trunc(criticPercent) : null,
                count: criticCount,
                countDisplay: criticCountDisplay,
                certified: criticCertified,
                type: getRottenTomatoesCriticType(criticsScore) || null,
                url: criticUrl.toString()
            },
            user: {
                score: Number.isFinite(userAverage) ? Math.trunc(userAverage * 20) : null,
                percent: Number.isFinite(userPercent) ? Math.trunc(userPercent) : null,
                count: userCount,
                countDisplay: userCountDisplay,
                url: userUrl.toString()
            },
            consensus: doc.querySelector('#critics-consensus p')?.textContent?.trim() || '',
            icon: getRottenTomatoesLogo(Number.isFinite(criticPercent) ? Math.trunc(criticPercent) : Number.NaN, criticCertified)
        };
    } catch (_) {
        return null;
    }
}

async function fetchLetterboxdData(imdbId) {
    try {
        const baseUrl = `https://letterboxd.com/imdb/${imdbId}/`;
        const pageResponse = await textRequestDetailed(baseUrl);
        const page = parseHtmlDocument(pageResponse.text);
        const finalUrl = pageResponse.finalUrl || baseUrl;
        const imdbLink = page.querySelector('[data-track-action="IMDb"]')?.href || '';
        if (!imdbLink.includes(imdbId)) {
            return {
                status: 'not_found',
                data: null
            };
        }

        const membersUrl = new URL('members', finalUrl).toString();
        const membersPage = parseHtmlDocument(await textRequest(membersUrl));
        const jsonText = page.querySelector('script[type="application/ld+json"]')?.textContent?.replace(/\/\*.*?\*\//g, '').trim() || '';
        if (!jsonText) {
            return {
                status: 'not_found',
                data: null
            };
        }

        const payload = JSON.parse(jsonText);
        let userScore = null;
        let userCount = 0;
        let histogram = [];
        const normalizeLetterboxdUserScore = (scoreOutOfFive) => {
            const numericScore = Number.parseFloat(scoreOutOfFive);
            if (!Number.isFinite(numericScore) || numericScore < 0) {
                return 0;
            }

            const scaledScore = numericScore * 20;
            const floorValue = Math.floor(scaledScore);
            const fractional = scaledScore - floorValue;

            if (fractional > 0.5) {
                return floorValue + 1;
            }

            if (fractional < 0.5) {
                return floorValue;
            }

            // Resolve exact .05 /10 ties downward instead of away from zero.
            return floorValue;
        };

        const aggregateRatingValue = Number.parseFloat(payload?.aggregateRating?.ratingValue);
        if (Number.isFinite(aggregateRatingValue)) {
            userScore = normalizeLetterboxdUserScore(aggregateRatingValue);
            userCount = Number.parseInt(payload.aggregateRating.ratingCount, 10) || 0;
        }

        const filmSlug = String(payload['@id'] || '').split('.com/')[1];
        if (filmSlug) {
            const histogramHtml = await textRequest(`https://letterboxd.com/csi/${filmSlug}ratings-summary/`);
            const ratingCategories = histogramHtml.split('rating-histogram-bar');
            let ratingTotal = 0;
            let histogramVoteCount = 0;
            const nextHistogram = [];

            for (let i = 1; i < ratingCategories.length; i++) {
                const segment = ratingCategories[i];
                const dataCountMatch = segment.match(/data-count="(\d+)"/i);
                const titleMatch = segment.match(/title="([^"]+)"/i);
                let count = dataCountMatch ? Number.parseInt(dataCountMatch[1], 10) : 0;

                if (!Number.isFinite(count) || count <= 0) {
                    const titleText = titleMatch ? titleMatch[1] : '';
                    const titleCountMatch = titleText.match(/([\d,]+)\s+ratings?/i);

                    if (titleCountMatch) {
                        count = Number.parseInt(titleCountMatch[1].replace(/,/g, ''), 10) || 0;
                    } else {
                        const numericTokens = titleText.match(/\d[\d,]*/g) || [];
                        count = numericTokens.reduce((max, token) => {
                            const parsed = Number.parseInt(token.replace(/,/g, ''), 10) || 0;
                            return parsed > max ? parsed : max;
                        }, 0);
                    }
                }

                const rating = i / 2;
                nextHistogram.push({
                    rating,
                    voteCount: count
                });
                histogramVoteCount += count;
                ratingTotal += count * rating;
            }

            histogram = nextHistogram.filter((entry) => entry.voteCount > 0);

            if (histogramVoteCount > 0 && userCount <= 0) {
                userCount = histogramVoteCount;
            }
        }

        const likes = Number.parseInt((membersPage.querySelector('.js-route-likes a')?.title || '').replace(/[^\d]/g, ''), 10) || 0;
        const fans = Number.parseInt((membersPage.querySelector('.js-route-fans a')?.title || '').replace(/[^\d]/g, ''), 10) || 0;

        return {
            status: 'ok',
            data: {
                url: finalUrl,
                user: {
                    score: userScore,
                    count: userCount,
                    url: new URL('ratings', finalUrl).toString()
                },
                histogram,
                likes,
                fans,
                likesUrl: new URL('likes', finalUrl).toString(),
                fansUrl: new URL('fans', finalUrl).toString()
            }
        };
    } catch (_) {
        return {
            status: 'error',
            data: null
        };
    }
}

function hasValidLetterboxdHistogram(letterboxd) {
    if (!letterboxd || !Object.prototype.hasOwnProperty.call(letterboxd, 'histogram')) {
        return false;
    }

    if (!Array.isArray(letterboxd.histogram)) {
        return false;
    }

    if (!letterboxd.histogram.every((entry) => Number.isFinite(entry?.rating) && Number.isSafeInteger(entry?.voteCount) && entry.voteCount >= 0)) {
        return false;
    }

    const histogramTotal = letterboxd.histogram.reduce((sum, entry) => sum + entry.voteCount, 0);
    if (!Number.isSafeInteger(histogramTotal)) {
        return false;
    }

    const cachedUserCount = letterboxd.user?.count;
    if (Number.isSafeInteger(cachedUserCount) && histogramTotal > 0) {
        const allowedDrift = Math.max(25, Math.round(histogramTotal * 0.05));
        if (Math.abs(cachedUserCount - histogramTotal) > allowedDrift) {
            return false;
        }
    }

    return true;
}

function hasValidMetacriticData(metacritic, options = {}) {
    if (!metacritic || typeof metacritic !== 'object') {
        return false;
    }

    const requireUserData = !!options.requireUserData;
    const requireBreakdown = !!options.requireBreakdown;
    const critic = metacritic.critic;
    const user = metacritic.user;
    if (!critic || typeof critic !== 'object') {
        return false;
    }

    if (requireBreakdown) {
        const hasCriticBreakdown = ['positiveCount', 'neutralCount', 'negativeCount', 'positivePercent', 'neutralPercent', 'negativePercent']
            .every((key) => Number.isFinite(critic[key]));
        if (!hasCriticBreakdown) {
            return false;
        }
    }

    if (!requireUserData) {
        return true;
    }

    if (!user || typeof user !== 'object') {
        return false;
    }

    const hasUserCore = Number.isFinite(user.score) && Number.isFinite(user.count);
    if (!hasUserCore) {
        return false;
    }

    if (!requireBreakdown) {
        return true;
    }

    return ['positiveCount', 'neutralCount', 'negativeCount', 'positivePercent', 'neutralPercent', 'negativePercent']
        .every((key) => Number.isFinite(user[key]));
}

async function getSupplementalRatingsCache(imdbId) {
    return getCache(`ratings_supplemental_data_${imdbId}`);
}

async function mergeSupplementalRatingsCache(imdbId, partial) {
    const cached = await getSupplementalRatingsCache(imdbId);
    const nextValue = {
        ...(cached && typeof cached === 'object' ? cached : {}),
        ...partial
    };
    await setCache(`ratings_supplemental_data_${imdbId}`, nextValue);
    return nextValue;
}

async function fetchRottenTomatoesWithCache(imdbId) {
    const cached = await getSupplementalRatingsCache(imdbId);
    if (cached && Object.prototype.hasOwnProperty.call(cached, 'rottenTomatoes')) {
        return cached.rottenTomatoes;
    }

    const rottenTomatoes = await fetchRottenTomatoesData(imdbId);
    await mergeSupplementalRatingsCache(imdbId, { rottenTomatoes });
    return rottenTomatoes;
}

async function fetchMetacriticWithCache(imdbId, url, options = {}) {
    const cached = await getSupplementalRatingsCache(imdbId);
    if (
        cached
        && Object.prototype.hasOwnProperty.call(cached, 'metacritic')
        && hasValidMetacriticData(cached.metacritic, options)
    ) {
        return cached.metacritic;
    }

    const metacritic = await fetchMetacriticData(url, options);
    await mergeSupplementalRatingsCache(imdbId, { metacritic });
    return metacritic;
}

async function fetchLetterboxdWithCache(imdbId) {
    const cached = await getSupplementalRatingsCache(imdbId);

    // Keep transient network/parser failures on a short retry cooldown to avoid hammering.
    if (
        cached
        && Number.isFinite(cached.letterboxdTransientErrorAt)
        && Date.now() - cached.letterboxdTransientErrorAt < LETTERBOXD_TRANSIENT_ERROR_RETRY_MS
    ) {
        return null;
    }

    if (cached && Object.prototype.hasOwnProperty.call(cached, 'letterboxd')) {
        const cachedLetterboxd = cached.letterboxd;

        if (cachedLetterboxd !== null && !shouldIncludeLetterboxdHistogramData()) {
            return cachedLetterboxd;
        }

        if (cachedLetterboxd !== null && hasValidLetterboxdHistogram(cachedLetterboxd)) {
            return cachedLetterboxd;
        }
    }

    const letterboxdResponse = await fetchLetterboxdData(imdbId);

    if (letterboxdResponse.status === 'ok') {
        await mergeSupplementalRatingsCache(imdbId, {
            letterboxd: letterboxdResponse.data,
            letterboxdTransientErrorAt: null
        });
        return letterboxdResponse.data;
    }

    if (letterboxdResponse.status === 'error') {
        await mergeSupplementalRatingsCache(imdbId, {
            letterboxd: null,
            letterboxdTransientErrorAt: Date.now()
        });
        return null;
    }

    await mergeSupplementalRatingsCache(imdbId, {
        letterboxd: null,
        letterboxdTransientErrorAt: null
    });
    return null;
}

async function setCache(key, data) {
    const cacheData = {
        timestamp: Date.now(),
        data: LZString.compress(JSON.stringify(data))
    };
    await GM.setValue(key, JSON.stringify(cacheData));
}

function getCacheDurationForEntry(key, parsedData) {
    const standardDurationMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (!key.startsWith('iMDB_data_')) {
        return standardDurationMs;
    }

    const releaseYear = Number.parseInt(parsedData?.data?.title?.releaseYear?.year, 10);
    if (!Number.isFinite(releaseYear)) {
        return standardDurationMs;
    }

    const currentYear = new Date().getFullYear();
    if (releaseYear >= currentYear - 1) {
        return NEW_MOVIE_TTL_DAYS * 24 * 60 * 60 * 1000;
    }

    return standardDurationMs;
}

async function getCache(key) {
    const cached = await GM.getValue(key, null);
    if (cached) {
        try {
            const cacheData = JSON.parse(cached);
            const currentTime = Date.now();

            const decompressedData = LZString.decompress(cacheData.data);
            const parsedData = JSON.parse(decompressedData);
            if (!parsedData || typeof parsedData !== 'object') {
                console.error("Decompressed data is invalid:", decompressedData);
                return null;
            }

            const cacheDuration = getCacheDurationForEntry(key, parsedData);
            if (currentTime - cacheData.timestamp < cacheDuration) {
                return parsedData;
            } else {
                console.log("Cache expired for key:", key);
            }
        } catch (error) {
            console.error("Error parsing cache for key:", key, error);
        }
    }

    return null;
}

function fetchTMDBRatingsViaBridge(imdbId, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const requestId = `tmdb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let settled = false;
        let timeoutId = null;

        const cleanup = () => {
            document.removeEventListener('tmdbRatingsResponse', onResponse);
            document.removeEventListener('tmdbRatingsReady', onReady);
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };

        const settle = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            resolve(value);
        };

        const onResponse = (event) => {
            const detail = event.detail || {};
            if (detail.requestId !== requestId) {
                return;
            }

            settle(detail.found ? (detail.data || null) : null);
        };

        const onReady = (event) => {
            const detail = event.detail || {};
            if (detail.imdbId !== imdbId) {
                return;
            }

            settle({
                imdbId: detail.imdbId,
                tmdbId: detail.tmdbId,
                mediaType: detail.mediaType,
                title: detail.title,
                voteAverage: detail.voteAverage,
                voteCount: detail.voteCount
            });
        };

        document.addEventListener('tmdbRatingsResponse', onResponse);
        document.addEventListener('tmdbRatingsReady', onReady);

        timeoutId = window.setTimeout(() => {
            settle(null);
        }, timeoutMs);

        document.dispatchEvent(new CustomEvent('requestTMDBRatings', {
            detail: { requestId, imdbId }
        }));
    });
}

function hasRequiredRatingsData(titleData) {
    if (!titleData) {
        return false;
    }

    if (!ENABLE_IMDB_RATINGS_PANEL) {
        return true;
    }

    if (!titleData.ratingsSummary || !('metacritic' in titleData) || !('meterRank' in titleData)) {
        return false;
    }

    if (shouldIncludeHistogramData() && !titleData.aggregateRatingsBreakdown?.histogram) {
        return false;
    }

    if (SHOW_IMDB_COUNTRY_AVERAGES && !Array.isArray(titleData.aggregateRatingsBreakdown?.ratingsSummaryByCountry)) {
        return false;
    }

    if (shouldIncludeDemographicsData() && !Array.isArray(titleData.aggregateRatingsBreakdown?.ratingsSummaryByDemographics)) {
        return false;
    }

    return true;
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
                imdbElement.innerHTML = `<span class="panel__heading__title">${getIMDbLabelHTML('tags')}</span>`;
            }
            // Move the IMDb panel to the desired location
            sidebar.insertBefore(imdbPanel, sidebar.childNodes[3 + EXISTING_IMDB_TAGS]);

            // If User tags panel exists, append it directly after IMDb tags panel
            if (userTagsPanel) {
                sidebar.insertBefore(userTagsPanel, imdbPanel.nextSibling);
            }
        });
    }

    // Function to find IMDb ID with retry logic
    const findImdbIdWithRetry = async (maxRetries = 8, retryDelay = 500) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Attempt ${attempt}/${maxRetries} to find IMDb ID`);

            // Try to find the main IMDb link
            const link = document.querySelector("a#imdb-title-link.rating");
            let imdbUrl, imdbId;

            if (link) {
                imdbUrl = link.getAttribute("href");
                if (imdbUrl) {
                    imdbId = imdbUrl.split("/")[4];
                    if (imdbId) {
                        console.log(`Found IMDb ID on attempt ${attempt}: ${imdbId}`);
                        return imdbId;
                    }
                }
            }

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
                        if (imdbId) {
                            console.log(`Found IMDb ID in request table on attempt ${attempt}: ${imdbId}`);
                            return imdbId;
                        }
                    }
                }
            }

            // If this isn't the last attempt, wait before retrying
            if (attempt < maxRetries) {
                console.log(`IMDb ID not found on attempt ${attempt}, retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        console.error(`IMDb ID not found after ${maxRetries} attempts`);
        return null;
    };

    // Try to find IMDb ID with retry logic
    const imdbId = await findImdbIdWithRetry(8, 500); // 8 attempts, 500ms delay

    if (!imdbId) {
        console.error("Failed to find IMDb ID after all retry attempts");
        return;
    }

    console.log(`Successfully found IMDb ID: ${imdbId}`);

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
                const decompressedData = LZString.decompress(cacheData.data);
                const parsedData = JSON.parse(decompressedData);

                if (!parsedData || typeof parsedData !== 'object') {
                    console.error("Decompressed data is invalid:", decompressedData);
                    return null;
                }

                const cacheDuration = getCacheDurationForEntry(key, parsedData);

                // Check if the cache is expired
                if (currentTime - cacheData.timestamp < cacheDuration) {
                    //console.log("Cache hit for key:", key);
                    return parsedData; // Return the decompressed and parsed data
                } else {
                    console.log("Cache expired for key:", key);
                }
            } catch (error) {
                console.error("Error parsing cache for key:", key, error);
            }
        }
        return null;
    };

    const fetchIMDbGraphQL = async (query, variables = {}) => {
        const url = `https://api.graphql.imdb.com/`;
        const payload = {
            query,
            variables
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(payload),
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const parsedResponse = JSON.parse(response.responseText);
                            resolve(parsedResponse);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        const responseSnippet = (response.responseText || '').slice(0, 500);
                        reject(new Error(`Failed IMDb GraphQL request with status ${response.status}: ${responseSnippet}`));
                    }
                },
                onerror: function () {
                    reject(new Error("IMDb GraphQL request error"));
                }
            });
        });
    };

    const isValidIMDbPlaybackUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\//i.test(url);
    };

    const inferVideoMimeType = (url) => {
        if (!url || typeof url !== 'string') {
            return '';
        }

        const sanitizedUrl = url.split('?')[0].toLowerCase();
        if (sanitizedUrl.endsWith('.mp4')) {
            return 'video/mp4';
        }
        if (sanitizedUrl.endsWith('.webm')) {
            return 'video/webm';
        }
        if (sanitizedUrl.endsWith('.m3u8')) {
            return 'application/vnd.apple.mpegurl';
        }
        return '';
    };

    const rankPlaybackCandidates = (candidates) => {
        return [...candidates].sort((left, right) => {
            const leftMimeRank = left.mimeType === 'video/mp4' ? 0 : 1;
            const rightMimeRank = right.mimeType === 'video/mp4' ? 0 : 1;
            if (leftMimeRank !== rightMimeRank) return leftMimeRank - rightMimeRank;

            const leftArea = (left.width || 0) * (left.height || 0);
            const rightArea = (right.width || 0) * (right.height || 0);
            if (rightArea !== leftArea) return rightArea - leftArea;

            const leftBitrate = left.bitrate || 0;
            const rightBitrate = right.bitrate || 0;
            return rightBitrate - leftBitrate;
        });
    };

    const selectPlaybackSources = (video) => {
        const candidates = [];

        const appendCandidates = (items = []) => {
            items.forEach((item) => {
                const itemUrl = typeof item === 'string'
                    ? item
                    : (item && typeof item.url === 'string' ? item.url : null);

                if (!itemUrl || !isValidIMDbPlaybackUrl(itemUrl)) {
                    return;
                }

                const mimeType = (item && typeof item === 'object' && typeof item.mimeType === 'string' && item.mimeType)
                    ? item.mimeType
                    : inferVideoMimeType(itemUrl);

                candidates.push({
                    url: itemUrl,
                    width: (item && typeof item === 'object' && item.width) ? item.width : 0,
                    height: (item && typeof item === 'object' && item.height) ? item.height : 0,
                    bitrate: (item && typeof item === 'object' && item.bitrate) ? item.bitrate : 0,
                    mimeType
                });
            });
        };

        appendCandidates(video.playbackURLs);
        appendCandidates(video.previewURLs);

        if (candidates.length === 0) {
            return [];
        }

        const dedupedCandidates = [];
        const seenUrls = new Set();

        rankPlaybackCandidates(candidates).forEach((candidate) => {
            if (seenUrls.has(candidate.url)) {
                return;
            }
            seenUrls.add(candidate.url);
            dedupedCandidates.push(candidate);
        });

        return dedupedCandidates;
    };

    const normalizeIMDbVideo = (video) => {
        const playbackSources = selectPlaybackSources(video);
        if (playbackSources.length === 0) return null;

        const bestMp4 = playbackSources.find((source) => source.mimeType === 'video/mp4') || null;
        const primarySource = bestMp4 || playbackSources[0];

        const contentTypeLabel = video.contentType && video.contentType.displayName && video.contentType.displayName.value
            ? video.contentType.displayName.value
            : 'Video';

        return {
            id: video.id,
            title: (video.name && video.name.value) ? video.name.value : 'IMDb Video',
            contentTypeLabel,
            runtimeSeconds: (video.runtime && typeof video.runtime.value === 'number') ? video.runtime.value : null,
            primarySource,
            bestMp4,
            playbackSources
        };
    };

    const compareNormalizedVideoQuality = (left, right) => {
        const leftSource = left.primarySource || left.bestMp4 || null;
        const rightSource = right.primarySource || right.bestMp4 || null;
        const leftArea = leftSource ? (leftSource.width || 0) * (leftSource.height || 0) : 0;
        const rightArea = rightSource ? (rightSource.width || 0) * (rightSource.height || 0) : 0;
        if (rightArea !== leftArea) return rightArea - leftArea;

        const leftBitrate = leftSource ? (leftSource.bitrate || 0) : 0;
        const rightBitrate = rightSource ? (rightSource.bitrate || 0) : 0;
        return rightBitrate - leftBitrate;
    };

    const fetchIMDbTrailerData = async (imdbId) => {
        const cacheKey = `imdb_video_data_${imdbId}`;

        const cachedTrailerData = await getCache(cacheKey);
        if (cachedTrailerData && Array.isArray(cachedTrailerData.videos) && cachedTrailerData.defaultVideoId) {
            return cachedTrailerData;
        }

        try {
            const titleVideoIdsQuery = `
                query {
                    title(id: ${JSON.stringify(imdbId)}) {
                        id
                        latestTrailer { id }
                        primaryVideos(first: 20) {
                            edges { node { id } }
                        }
                        videoStrip(first: 20) {
                            edges { node { id } }
                        }
                    }
                }
            `;

            const titleVideoResponse = await fetchIMDbGraphQL(titleVideoIdsQuery);
            const titleNode = titleVideoResponse && titleVideoResponse.data ? titleVideoResponse.data.title : null;
            if (!titleNode) {
                return null;
            }

            const latestTrailerId = titleNode.latestTrailer && titleNode.latestTrailer.id ? titleNode.latestTrailer.id : null;
            const allVideoIds = [];
            if (latestTrailerId) {
                allVideoIds.push(latestTrailerId);
            }

            const primaryVideoEdges = titleNode.primaryVideos && titleNode.primaryVideos.edges ? titleNode.primaryVideos.edges : [];
            primaryVideoEdges.forEach((edge) => {
                const id = edge && edge.node ? edge.node.id : null;
                if (id) allVideoIds.push(id);
            });

            const videoStripEdges = titleNode.videoStrip && titleNode.videoStrip.edges ? titleNode.videoStrip.edges : [];
            videoStripEdges.forEach((edge) => {
                const id = edge && edge.node ? edge.node.id : null;
                if (id) allVideoIds.push(id);
            });

            const uniqueVideoIds = [...new Set(allVideoIds)];
            if (uniqueVideoIds.length === 0) {
                return null;
            }

            const videoQueries = [
                `
                    query {
                        videos(ids: ${JSON.stringify(uniqueVideoIds)}) {
                            id
                            name { value }
                            contentType { id displayName { value } }
                            runtime { value }
                            previewURLs { url }
                            playbackURLs { url }
                        }
                    }
                `,
                `
                    query {
                        videos(ids: ${JSON.stringify(uniqueVideoIds)}) {
                            id
                            name { value }
                            contentType { id displayName { value } }
                            runtime { value }
                            playbackURLs { url }
                            previewURLs { url }
                        }
                    }
                `,
                `
                    query {
                        videos(ids: ${JSON.stringify(uniqueVideoIds)}) {
                            id
                            name { value }
                            playbackURLs { url }
                        }
                    }
                `
            ];

            let videosByIdsResponse = null;
            let lastVideoQueryError = null;

            for (const videoQuery of videoQueries) {
                try {
                    const response = await fetchIMDbGraphQL(videoQuery);
                    const hasVideos = response && response.data && Array.isArray(response.data.videos);
                    if (hasVideos) {
                        videosByIdsResponse = response;
                        break;
                    }
                } catch (queryError) {
                    lastVideoQueryError = queryError;
                }
            }

            if (!videosByIdsResponse) {
                if (lastVideoQueryError) {
                    throw lastVideoQueryError;
                }
                return null;
            }

            const rawVideos = videosByIdsResponse && videosByIdsResponse.data && Array.isArray(videosByIdsResponse.data.videos)
                ? videosByIdsResponse.data.videos
                : [];

            const normalizedVideos = rawVideos.map(normalizeIMDbVideo).filter(Boolean);
            if (normalizedVideos.length === 0) {
                return null;
            }

            let defaultVideoId = null;
            const latestTrailerVideo = latestTrailerId ? normalizedVideos.find(video => video.id === latestTrailerId) : null;
            if (latestTrailerVideo) {
                defaultVideoId = latestTrailerVideo.id;
            } else {
                const bestVideo = [...normalizedVideos].sort(compareNormalizedVideoQuality)[0];
                defaultVideoId = bestVideo ? bestVideo.id : null;
            }

            const sortedVideos = [...normalizedVideos].sort((left, right) => {
                if (left.id === defaultVideoId && right.id !== defaultVideoId) return -1;
                if (right.id === defaultVideoId && left.id !== defaultVideoId) return 1;

                const typeCompare = (left.contentTypeLabel || '').localeCompare(right.contentTypeLabel || '');
                if (typeCompare !== 0) return typeCompare;

                return (left.title || '').localeCompare(right.title || '');
            });

            const trailerData = {
                imdbId,
                latestTrailerId,
                defaultVideoId,
                videos: sortedVideos
            };

            await setCache(cacheKey, trailerData);
            return trailerData;
        } catch (error) {
            console.error('Failed to fetch IMDb trailer data:', error);
            return null;
        }
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
    const fetchIMDBData = async (imdbId, afterCursor = null, allAwards = [], namesPromise = null, baseTitleData = null, creditsPrepared = false) => {
        const cacheKey = `iMDB_data_${imdbId}`;

        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            console.log("Using cached compressed IMDb data");
            if (cachedData.data && cachedData.data.title && hasRequiredRatingsData(cachedData.data.title)) {
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
                console.error("Cached IMDb data is missing required ratings fields. Fetching fresh data...");
            }
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query getTitleDetails($id: ID!, $first: Int!, $after: ID, $includeHistogram: Boolean!, $includeCountries: Boolean!, $includeDemographics: Boolean!) {
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
                        ratingsSummary {
                            aggregateRating
                            voteCount
                            topRanking {
                                id
                                rank
                            }
                        }
                        metacritic {
                            url
                            metascore {
                                reviewCount
                                score
                            }
                        }
                        aggregateRatingsBreakdown {
                            histogram @include(if: $includeHistogram) {
                                demographic {
                                    age
                                    country
                                    gender
                                    userCategory
                                }
                                histogramValues {
                                    rating
                                    voteCount
                                }
                            }
                            ratingsSummaryByCountry @include(if: $includeCountries) {
                                country
                                aggregate
                            }
                            ratingsSummaryByDemographics @include(if: $includeDemographics) {
                                aggregate
                                voteCount
                                demographic {
                                    age
                                    country
                                    gender
                                    userCategory
                                }
                            }
                        }
                        meterRank {
                            currentRank
                            meterType
                            rankChange {
                                changeDirection
                                difference
                            }
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
                        principalCreditsV2 {
                            grouping {
                                id
                                text
                            }
                            credits {
                                ... on CreditV2 {
                                    id
                                    name {
                                        id
                                        nameText {
                                            text
                                        }
                                    }
                                    creditedRoles {
                                        edges {
                                            node {
                                                category {
                                                    id
                                                    text
                                                }
                                                characters {
                                                    edges {
                                                        node {
                                                            name
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
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
                after: afterCursor,
                includeHistogram: shouldIncludeHistogramData(),
                includeCountries: SHOW_IMDB_COUNTRY_AVERAGES,
                includeDemographics: shouldIncludeDemographicsData()
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

                        if (data && data.data && data.data.title) {
                            const pageTitleData = data.data.title;
                            const titleData = baseTitleData || pageTitleData;

                            if (!creditsPrepared) {
                                // Merge principal credits once, then reuse during awards pagination.
                                const principalCreditsArray = [];
                                const fullCreditsArray = titleData.credits?.edges || [];

                                if (titleData.principalCreditsV2) {
                                    const groupedCredits = titleData.principalCreditsV2.map(grouping => ({
                                        grouping: grouping.grouping.text,
                                        credits: grouping.credits
                                    }));

                                    const starsGrouping = groupedCredits.find(g => g.grouping === 'Stars');
                                    const otherGroupings = groupedCredits.filter(g => g.grouping !== 'Stars');

                                    if (starsGrouping) {
                                        starsGrouping.credits.forEach((credit, indexInGroup) => {
                                            const firstRoleEdge = credit.creditedRoles?.edges?.[0];
                                            const firstRole = firstRoleEdge?.node;
                                            const characters = firstRole?.characters?.edges?.map(e => ({ name: e.node.name })) || [];

                                            principalCreditsArray.push({
                                                node: {
                                                    name: credit.name,
                                                    category: firstRole?.category || { id: 'actor', text: 'Actor' },
                                                    characters,
                                                    jobs: [],
                                                    isPrincipal: true,
                                                    principalGrouping: 'Stars',
                                                    positionInGrouping: indexInGroup
                                                }
                                            });
                                        });
                                    }

                                    otherGroupings.forEach(group => {
                                        group.credits.forEach((credit, indexInGroup) => {
                                            const firstRoleEdge = credit.creditedRoles?.edges?.[0];
                                            const firstRole = firstRoleEdge?.node;
                                            const characters = firstRole?.characters?.edges?.map(e => ({ name: e.node.name })) || [];

                                            principalCreditsArray.push({
                                                node: {
                                                    name: credit.name,
                                                    category: firstRole?.category || { id: 'unknown', text: 'Unknown' },
                                                    characters,
                                                    jobs: [],
                                                    isPrincipal: true,
                                                    principalGrouping: group.grouping,
                                                    positionInGrouping: indexInGroup
                                                }
                                            });
                                        });
                                    });
                                }

                                const principalIds = new Set(principalCreditsArray.map(e => e.node.name.id));
                                const additionalCredits = fullCreditsArray.filter(edge => !principalIds.has(edge.node.name.id));
                                titleData.credits = { edges: [...principalCreditsArray, ...additionalCredits] };
                                creditsPrepared = true;
                            }

                            const awardNominations = pageTitleData.awardNominations.edges.map(edge => edge.node);
                            allAwards.push(...awardNominations);

                            if (!namesPromise) {
                                const soundtracksForPrefetch = titleData.soundtrack?.edges || [];
                                const uniqueIdsForPrefetch = [];

                                soundtracksForPrefetch.forEach(edge => {
                                    edge.node.comments.forEach(comment => {
                                        const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                        if (match) {
                                            uniqueIdsForPrefetch.push(`nm${match[1]}`);
                                        }
                                    });
                                });

                                const prefetchedCredits = titleData.credits?.edges || [];
                                prefetchedCredits.forEach(edge => {
                                    const creditNode = edge.node;
                                    if (creditNode.name && creditNode.name.id) {
                                        uniqueIdsForPrefetch.push(creditNode.name.id);
                                    }
                                });

                                const uniqueIdSetForPrefetch = [...new Set(uniqueIdsForPrefetch)];
                                namesPromise = fetchNames(uniqueIdSetForPrefetch);
                            }

                            if (pageTitleData.awardNominations.pageInfo.hasNextPage) {
                                fetchIMDBData(
                                    imdbId,
                                    pageTitleData.awardNominations.pageInfo.endCursor,
                                    allAwards,
                                    namesPromise,
                                    titleData,
                                    creditsPrepared
                                )
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                titleData.awardNominationsCombined = allAwards;
                                delete titleData.awardNominations;

                                // Extract unique IDs from comments
                                const soundtracks = titleData.soundtrack?.edges || [];
                                const uniqueIds = [];
                                soundtracks.forEach(edge => {
                                    edge.node.comments.forEach(comment => {
                                        const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                        if (match) {
                                            uniqueIds.push(`nm${match[1]}`);
                                        }
                                    });
                                });

                                // Add unique IDs from credits (already flattened above)
                                const credits = titleData.credits.edges;
                                credits.forEach(edge => {
                                    const creditNode = edge.node;
                                    if (creditNode.name && creditNode.name.id) {
                                        uniqueIds.push(creditNode.name.id);
                                    }
                                });

                                // Fetch names for unique IDs
                                const uniqueIdSet = [...new Set(uniqueIds)];
                                const names = namesPromise
                                    ? await namesPromise
                                    : await fetchNames(uniqueIdSet);

                                // Map IDs to names
                                const idToNameMap = {};
                                names.forEach(name => {
                                    idToNameMap[name.id] = name.nameText.text;
                                });

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

                                await setCache(cacheKey, { data: { title: titleData } });
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
        newPanel.id = 'more_like_this';
        var panelHeading = document.createElement('div');
        panelHeading.className = 'panel__heading';
        var title = document.createElement('span');
        title.className = 'panel__heading__title';

        var imdb = document.createElement('span');
        imdb.textContent = 'IMDb';
        applyColorIfEnabled(imdb, IMDB_ACCENT_COLOR);
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
        imdb.textContent = 'IMDb';
        applyColorIfEnabled(imdb, IMDB_ACCENT_COLOR);
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
        applyColorIfEnabled(specContainer, '#fff');
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
        imdb.textContent = 'IMDb';
        applyColorIfEnabled(imdb, IMDB_ACCENT_COLOR);
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
        applyColorIfEnabled(boxOfficeContainer, '#fff');
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
                    ${getIMDbLabelHTML('Awards')}
                </span>
                <a href="https://www.imdb.com/title/${imdbId}/awards/" target="_blank" rel="noreferrer" style="float:right; font-size:0.9em; margin-right: 10px;">(View on IMDb)</a>
            </div>`;
        const awardDiv = document.createElement('div');
        awardDiv.setAttribute('style', 'text-align:center; display:table; width:100%; border-collapse: separate; border-spacing:4px;');
        aDiv.appendChild(awardDiv);

        // Placeholder for the awards content
        const awardsContent = document.createElement('div');
        awardsContent.setAttribute('id', 'awards-content');
        const awardsHighlightAttr = getColorStyleAttr(AWARDS_HIGHLIGHT_COLOR);
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
                        <th${awardsHighlightAttr}>OSCARS</th>
                        <th>Wins</th>
                        <th>Nominations</th>
                    </tr>
                    <tr>
                        <td></td>
                        <td${awardsHighlightAttr}>${wins}</td>
                        <td${awardsHighlightAttr}>${nominations}</td>
                    </tr>
                    <tr>
                        <th>Total Awards</th>
                        <th>Wins</th>
                        <th>Nominations</th>
                    </tr>
                    <tr>
                        <td></td>
                        <td${awardsHighlightAttr}>${totalWins}</td>
                        <td${awardsHighlightAttr}>${totalNominations}</td>
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

        new_panel.innerHTML = `<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/${imdbId}/soundtrack" target="_blank" rel="noopener noreferrer">${getIMDbLabelHTML('Soundtrack')}</a></span></div>`;

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
        // Skip songs with null/undefined title
        if (!song || !song.title) {
            console.warn("[Soundtrack Debug] Skipping song with null/undefined title:", song);
            const div = document.createElement("div");
            div.style.display = "none";
            return div;
        }

        let div = document.createElement("div");
        div.style.height = "31px";
        div.style.overflow = "hidden";
        div.style.padding = "6px 14px";

        let track_line = document.createElement("a");
        track_line.textContent = song.title;
        track_line.title = song.title;
        track_line.href = "https://www.youtube.com/results?search_query=" + movie_title.replace(/&/g, " and ") + " " + song.title.replace(/&/g, " and ");
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
        heading.innerHTML = `<span class="panel__heading__title">${getIMDbLabelHTML('Alternate Versions')}</span>`;

        const imdbDisplay = document.createElement('a');
        imdbDisplay.title = 'IMDB Url';
        imdbDisplay.href = `https://www.imdb.com/title/${imdbId}/alternateversions`;
        imdbDisplay.target = '_blank';
        imdbDisplay.textContent = 'IMDb Url';
        imdbDisplay.style.cssText = 'margin-left: 5px;';
        imdbDisplay.addEventListener('click', (event) => event.stopPropagation());
        heading.appendChild(imdbDisplay);
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
        heading.innerHTML = `<span class="panel__heading__title">${getIMDbLabelHTML('Keywords')}</span>`;
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
                applyColorIfEnabled(kw, IMDB_ACCENT_COLOR);
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
            const parentalHeaderColor = DISABLE_CUSTOM_COLORS ? '' : `color: ${IMDB_ACCENT_COLOR}; `;
            style.innerHTML = `
                .parentalspoiler { color: transparent; }
                .parentalspoiler:hover { color: inherit; }
                .parentalHeader { ${parentalHeaderColor}margin-top: 12px; margin-bottom: 5px; }
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
        imdb.textContent = 'IMDb';
        applyColorIfEnabled(imdb, IMDB_ACCENT_COLOR);
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
                const severityColor = PARENTS_GUIDE_SEVERITY_COLORS[sev] || IMDB_ACCENT_COLOR;
                applyColorIfEnabled(severity, severityColor);
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
                applyColorIfEnabled(text, "#FFF");
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
        // Important: Array.filter() preserves the original order from the API
        let filteredCredits = credits;
        if (CAST_FILTER_TYPE === 'actors') {
            filteredCredits = credits.filter(edge => {
                const category = edge.node.category.id.toLowerCase();
                return category === 'actor' || category === 'actress';
            });
        } else {
            console.log("[Credits Debug] Showing all credits (no filter applied)");
        }

        // Create a lookup map for namePhotos to improve performance
        // This preserves order since we're using the filteredCredits array order, not the namePhotos order
        const namePhotosMap = {};
        if (Array.isArray(namePhotos)) {
            namePhotos.forEach(name => {
                if (name && name.id) {
                    namePhotosMap[name.id] = name;
                }
            });
        } else if (namePhotos) {
            // Handle case where namePhotos might be an object
            const namePhotosArray = Object.values(namePhotos);
            namePhotosArray.forEach(name => {
                if (name && name.id) {
                    namePhotosMap[name.id] = name;
                }
            });
        }

        // Map credits to cast format with photos from fetchNames
        // Important: Array.map() preserves the order from filteredCredits, which maintains API order
        let cast = filteredCredits.map((edge, index) => {
            const creditNode = edge.node;
            const personId = creditNode.name.id;
            const personName = idToNameMap[personId] || creditNode.name.nameText.text;

            let photoUrl = 'https://ptpimg.me/9wv452.png'; // Default

            // Use the lookup map for O(1) access instead of find() which is O(n)
            const nameData = namePhotosMap[personId];
            if (nameData && nameData.primaryImage && nameData.primaryImage.url) {
                photoUrl = nameData.primaryImage.url;
            }

            // Get role from characters (for Cast) or jobs (for Crew) or category
            let role = creditNode.category?.text || 'Unknown';
            if (creditNode.characters && creditNode.characters.length > 0) {
                role = creditNode.characters.map(c => c.name).join(', ');
            } else if (creditNode.jobs && creditNode.jobs.length > 0) {
                role = creditNode.jobs.map(j => j.text).join(', ');
            }

            // If no specific role, use category text
            if (role === 'Unknown' && creditNode.category) {
                role = creditNode.category.text;
            }

            const castMember = {
                photo: photoUrl,
                name: personName,
                imdbId: personId,
                role: role,
                link: `https://www.imdb.com/name/${personId}/`,
                position: creditNode.position // billing position for Cast
            };

            return castMember;
        });

        // Try to match with existing cast table on page
        const actorRows = document.querySelectorAll('.table--panel-like tbody tr');
        let matchCount = 0;
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
                    matchCount++;
                }
            }
        });

        // Filter and limit based on settings, then reorder: cast with photos first, then without photos
        const filteredCast = cast
            .filter(person => person.role && person.role.trim())
            .slice(0, CAST_MAX_DISPLAY);

        // Separate cast members with and without photos
        const castWithPhotos = filteredCast.filter(person => person.photo !== 'https://ptpimg.me/9wv452.png');
        const castWithoutPhotos = filteredCast.filter(person => person.photo === 'https://ptpimg.me/9wv452.png');

        // Combine: photos first (in original order), then no photos (in original order)
        const reorderedCast = [...castWithPhotos, ...castWithoutPhotos];

        const cDiv = document.createElement('div');
        cDiv.className = 'panel';
        cDiv.id = 'imdb_cast_photos';

        const titleText = CAST_FILTER_TYPE === 'actors' ? 'Cast' : 'Credits';
        cDiv.innerHTML = `<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/${imdbId}/fullcredits" target="_blank" rel="noopener noreferrer">${getIMDbLabelHTML(titleText)}</a></span></div>`;

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

        reorderedCast.forEach((person, index) => {
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
                    <div><a href="https://www.imdb.com/name/${person.imdbId}" target="_blank" style="${getInlineColorPrefix(IMDB_ACCENT_COLOR)}text-decoration: none; font-size: 0.9em;">${person.name}</a></div>
                    <div style="${getInlineColorPrefix('#ccc')}font-size: 0.9em; margin-top: 2px;">${person.role}</div>
                </div>
            `;
        });

        if (reorderedCast.length === 0) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = 'padding: 20px; text-align: center;';
            applyColorIfEnabled(messageDiv, '#ccc');
            messageDiv.textContent = `No ${CAST_FILTER_TYPE === 'actors' ? 'actor/actress' : 'credit'} data found`;
            castDiv.appendChild(messageDiv);
        }
    };

    const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

    const normalizeAspectRatio = (ratio) => {
        if (!Number.isFinite(ratio) || ratio <= 0) {
            return IMDB_TRAILER_FALLBACK_ASPECT_RATIO;
        }
        return clampValue(ratio, IMDB_TRAILER_MIN_ASPECT_RATIO, IMDB_TRAILER_MAX_ASPECT_RATIO);
    };

    const waitForMediaEvent = (mediaElement, eventName, timeoutMs = 2000) => {
        return new Promise((resolve, reject) => {
            let settled = false;
            const onEvent = () => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve();
            };
            const onError = () => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error(`Media event failed: ${eventName}`));
            };
            const cleanup = () => {
                clearTimeout(timeoutId);
                mediaElement.removeEventListener(eventName, onEvent);
                mediaElement.removeEventListener('error', onError);
            };
            const timeoutId = setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error(`Timed out waiting for ${eventName}`));
            }, timeoutMs);

            mediaElement.addEventListener(eventName, onEvent, { once: true });
            mediaElement.addEventListener('error', onError, { once: true });
        });
    };

    const getVideoIntrinsicAspectRatio = (videoElement) => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            return normalizeAspectRatio(videoElement.videoWidth / videoElement.videoHeight);
        }
        return IMDB_TRAILER_FALLBACK_ASPECT_RATIO;
    };

    const computeRowDarkRatio = (imageData, width, rowIndex) => {
        let darkPixels = 0;
        for (let x = 0; x < width; x++) {
            const offset = (rowIndex * width + x) * 4;
            const r = imageData[offset];
            const g = imageData[offset + 1];
            const b = imageData[offset + 2];
            const luma = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
            const maxChannel = Math.max(r, g, b);
            const minChannel = Math.min(r, g, b);
            if (luma <= 24 && (maxChannel - minChannel) <= 18) {
                darkPixels++;
            }
        }
        return darkPixels / width;
    };

    const estimateLetterboxAspectRatio = (videoElement, intrinsicAspectRatio) => {
        if (!videoElement.videoWidth || !videoElement.videoHeight) {
            return null;
        }

        const sampleWidth = Math.min(320, videoElement.videoWidth);
        const sampleHeight = Math.max(90, Math.round(sampleWidth * videoElement.videoHeight / videoElement.videoWidth));
        const canvas = document.createElement('canvas');
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            return null;
        }

        try {
            context.drawImage(videoElement, 0, 0, sampleWidth, sampleHeight);
            const frame = context.getImageData(0, 0, sampleWidth, sampleHeight).data;

            const darkThreshold = 0.97;
            let topBarRows = 0;
            for (let y = 0; y < sampleHeight; y++) {
                const rowDarkRatio = computeRowDarkRatio(frame, sampleWidth, y);
                if (rowDarkRatio >= darkThreshold) {
                    topBarRows++;
                } else {
                    break;
                }
            }

            let bottomBarRows = 0;
            for (let y = sampleHeight - 1; y >= 0; y--) {
                const rowDarkRatio = computeRowDarkRatio(frame, sampleWidth, y);
                if (rowDarkRatio >= darkThreshold) {
                    bottomBarRows++;
                } else {
                    break;
                }
            }

            const totalBarRows = topBarRows + bottomBarRows;
            if (totalBarRows < Math.round(sampleHeight * 0.08)) {
                return null;
            }

            const centerRowDarkRatio = computeRowDarkRatio(frame, sampleWidth, Math.floor(sampleHeight / 2));
            if (centerRowDarkRatio > 0.92) {
                return null;
            }

            const effectiveHeight = sampleHeight - totalBarRows;
            if (effectiveHeight <= 0) {
                return null;
            }

            const detectedAspectRatio = sampleWidth / effectiveHeight;
            if (detectedAspectRatio <= (intrinsicAspectRatio * 1.06)) {
                return null;
            }

            return normalizeAspectRatio(detectedAspectRatio);
        } catch (error) {
            return null;
        }
    };

    const resolvePlaybackAspectRatio = async (videoElement) => {
        try {
            if (!(videoElement.videoWidth > 0 && videoElement.videoHeight > 0)) {
                await waitForMediaEvent(videoElement, 'loadedmetadata', 2500);
            }
        } catch (_) {
            return IMDB_TRAILER_FALLBACK_ASPECT_RATIO;
        }

        const intrinsicAspectRatio = getVideoIntrinsicAspectRatio(videoElement);

        try {
            if (videoElement.readyState < 2) {
                await waitForMediaEvent(videoElement, 'loadeddata', 2500);
            }
        } catch (_) {
            return intrinsicAspectRatio;
        }

        const letterboxAspectRatio = estimateLetterboxAspectRatio(videoElement, intrinsicAspectRatio);
        return letterboxAspectRatio || intrinsicAspectRatio;
    };

    const setTrailerWrapperHeight = (wrapper, aspectRatio) => {
        const width = wrapper.clientWidth || (wrapper.parentElement ? wrapper.parentElement.clientWidth : 0);
        if (!width) {
            return;
        }

        const safeAspectRatio = normalizeAspectRatio(aspectRatio);
        const targetHeight = Math.max(120, Math.round(width / safeAspectRatio));
        wrapper.style.height = `${targetHeight}px`;
    };

    const renderIMDbVideoToTrailer = (trailerContainer, video, movieTitle = null) => {
        if (typeof trailerContainer._imdbTrailerCleanup === 'function') {
            trailerContainer._imdbTrailerCleanup();
            trailerContainer._imdbTrailerCleanup = null;
        }

        trailerContainer.innerHTML = '';

        const videoWrapper = document.createElement('div');
        videoWrapper.style.position = 'relative';
        videoWrapper.style.width = '100%';
        videoWrapper.style.height = `${IMDB_TRAILER_PREVIEW_HEIGHT}px`;
        videoWrapper.style.background = '#000';
        videoWrapper.style.overflow = 'hidden';
        videoWrapper.style.transition = 'height 180ms ease';

        const videoElement = document.createElement('video');
        videoElement.controls = true;
        videoElement.preload = 'metadata';
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'contain';
        videoElement.style.background = '#000';

        const rawSources = Array.isArray(video.playbackSources) && video.playbackSources.length
            ? video.playbackSources
            : (video.primarySource ? [video.primarySource] : (video.bestMp4 ? [video.bestMp4] : []));
        const playableSources = [...rawSources];
        let sourceIndex = 0;

        const applySourceAt = (index) => {
            const source = playableSources[index];
            if (!source || !source.url) {
                return false;
            }
            videoElement.src = source.url;
            videoElement.load();
            return true;
        };

        if (!applySourceAt(0)) {
            trailerContainer.innerHTML = '';
            return;
        }

        const startPlayback = async () => {
            if (videoWrapper.dataset.mode === 'expanded' || videoWrapper.dataset.mode === 'expanding') {
                return;
            }

            videoWrapper.dataset.mode = 'expanding';

            const resolvedAspectRatio = await resolvePlaybackAspectRatio(videoElement);
            videoWrapper.dataset.aspectRatio = String(resolvedAspectRatio);
            setTrailerWrapperHeight(videoWrapper, resolvedAspectRatio);
            videoWrapper.dataset.mode = 'expanded';
        };

        videoElement.addEventListener('play', () => {
            startPlayback();
        });

        videoElement.addEventListener('error', () => {
            sourceIndex += 1;
            if (!applySourceAt(sourceIndex)) {
                return;
            }
            videoElement.play().catch(() => {});
        });

        const onWindowResize = () => {
            if (videoWrapper.dataset.mode !== 'expanded') {
                return;
            }
            const ratio = parseFloat(videoWrapper.dataset.aspectRatio || `${IMDB_TRAILER_FALLBACK_ASPECT_RATIO}`);
            setTrailerWrapperHeight(videoWrapper, ratio);
        };
        window.addEventListener('resize', onWindowResize);

        trailerContainer._imdbTrailerCleanup = () => {
            window.removeEventListener('resize', onWindowResize);
        };

        videoWrapper.appendChild(videoElement);
        trailerContainer.appendChild(videoWrapper);
    };

    const replacePTPTrailerWithIMDbVideos = async (imdbId, titleData, trailerDataPromise = null) => {
        if (!SHOW_IMDB_TRAILERS) {
            return;
        }

        const synopsisPanel = document.getElementById('synopsis-and-trailer');
        if (!synopsisPanel) {
            return;
        }

        const trailerContainer = synopsisPanel.querySelector('.panel__body > #trailer') || synopsisPanel.querySelector('#trailer');
        if (!trailerContainer || trailerContainer.dataset.imdbTrailerHandled === 'true') {
            return;
        }

        const trailerData = trailerDataPromise
            ? await trailerDataPromise
            : await fetchIMDbTrailerData(imdbId);
        if (!trailerData || !trailerData.defaultVideoId || !Array.isArray(trailerData.videos)) {
            return;
        }

        const defaultVideo = trailerData.videos.find(video => video.id === trailerData.defaultVideoId);
        const hasPlaybackSources = Array.isArray(defaultVideo && defaultVideo.playbackSources)
            && defaultVideo.playbackSources.length > 0;
        const hasLegacyMp4 = !!(defaultVideo && defaultVideo.bestMp4 && defaultVideo.bestMp4.url);
        if (!defaultVideo || (!hasPlaybackSources && !hasLegacyMp4)) {
            return;
        }

        const originalTrailerHtml = trailerContainer.innerHTML;
        const movieTitle = titleData && titleData.titleText ? titleData.titleText.text : null;

        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'imdb-trailer-selector-container';
        controlsContainer.style.marginBottom = '8px';

        const controlsLabel = document.createElement('label');
        controlsLabel.style.display = 'inline-block';
        controlsLabel.style.marginRight = '8px';
        controlsLabel.textContent = 'Video source:';

        const select = document.createElement('select');
        select.id = 'imdb-trailer-selector';
        select.style.maxWidth = '100%';
        select.style.padding = '3px 6px';

        const originalOption = document.createElement('option');
        originalOption.value = 'original';
        originalOption.textContent = 'Original PTP trailer';
        select.appendChild(originalOption);

        trailerData.videos.forEach(video => {
            const option = document.createElement('option');
            option.value = video.id;
            option.textContent = `${video.contentTypeLabel}: ${video.title}`;
            select.appendChild(option);
        });

        select.value = defaultVideo.id;
        select.addEventListener('change', () => {
            if (select.value === 'original') {
                if (typeof trailerContainer._imdbTrailerCleanup === 'function') {
                    trailerContainer._imdbTrailerCleanup();
                    trailerContainer._imdbTrailerCleanup = null;
                }
                trailerContainer.innerHTML = originalTrailerHtml;
                return;
            }

            const selectedVideo = trailerData.videos.find(video => video.id === select.value);
            if (!selectedVideo) {
                trailerContainer.innerHTML = originalTrailerHtml;
                return;
            }

            renderIMDbVideoToTrailer(trailerContainer, selectedVideo, movieTitle);
        });

        controlsContainer.appendChild(controlsLabel);
        controlsContainer.appendChild(select);

        trailerContainer.parentNode.insertBefore(controlsContainer, trailerContainer);
        renderIMDbVideoToTrailer(trailerContainer, defaultVideo, movieTitle);
        trailerContainer.dataset.imdbTrailerHandled = 'true';
    };

    const ptpRatingsData = ENABLE_IMDB_RATINGS_PANEL ? parsePtpRating() : null;
    const originalPtpVoteControls = ENABLE_IMDB_RATINGS_PANEL ? captureOriginalPtpVoteControls() : null;
    const supplementalRatings = {
        metacritic: shouldFetchMetacriticSupplementalData() ? undefined : null,
        rottenTomatoes: shouldFetchRottenTomatoesSupplementalData() ? undefined : null,
        tmdb: shouldFetchTMDbSupplementalData() ? undefined : null,
        letterboxd: shouldFetchLetterboxdSupplementalData() ? undefined : null
    };
    const mountedRatingsBox = ENABLE_IMDB_RATINGS_PANEL
        ? mountRatingsPanel(imdbId, ptpRatingsData, supplementalRatings, originalPtpVoteControls)
        : null;
    let ratingsTitleData;

    const rerenderRatingsPanel = () => {
        if (!ENABLE_IMDB_RATINGS_PANEL || !mountedRatingsBox) {
            return;
        }

        renderRatingsBox(mountedRatingsBox, imdbId, ratingsTitleData, ptpRatingsData, supplementalRatings, originalPtpVoteControls);
        reinitializeVoter(ptpRatingsData.personalRating);
    };

    if (ENABLE_IMDB_RATINGS_PANEL && shouldFetchRottenTomatoesSupplementalData()) {
        fetchRottenTomatoesWithCache(imdbId)
            .then((data) => {
                supplementalRatings.rottenTomatoes = data;
                rerenderRatingsPanel();
            })
            .catch((error) => {
                supplementalRatings.rottenTomatoes = null;
                console.error('Failed to fetch Rotten Tomatoes data:', error);
                rerenderRatingsPanel();
            });
    }

    if (ENABLE_IMDB_RATINGS_PANEL && shouldFetchTMDbSupplementalData()) {
        document.addEventListener('tmdbRatingsReady', (event) => {
            const detail = event.detail || {};
            if (detail.imdbId !== imdbId) {
                return;
            }

            supplementalRatings.tmdb = {
                imdbId: detail.imdbId,
                tmdbId: detail.tmdbId,
                mediaType: detail.mediaType,
                title: detail.title,
                voteAverage: detail.voteAverage,
                voteCount: detail.voteCount
            };
            rerenderRatingsPanel();
        });

        fetchTMDBRatingsViaBridge(imdbId)
            .then((data) => {
                supplementalRatings.tmdb = data;
                rerenderRatingsPanel();
            })
            .catch((error) => {
                supplementalRatings.tmdb = null;
                console.error('Failed to fetch TMDb data:', error);
                rerenderRatingsPanel();
            });
    }

    if (ENABLE_IMDB_RATINGS_PANEL && shouldFetchLetterboxdSupplementalData()) {
        fetchLetterboxdWithCache(imdbId)
            .then((data) => {
                supplementalRatings.letterboxd = data;
                rerenderRatingsPanel();
            })
            .catch((error) => {
                supplementalRatings.letterboxd = null;
                console.error('Failed to fetch Letterboxd data:', error);
                rerenderRatingsPanel();
            });
    }

    // Initialize panels
    const imdbTrailerDataPromise = SHOW_IMDB_TRAILERS ? fetchIMDbTrailerData(imdbId) : null;

    fetchIMDBData(imdbId).then(async data => {
        const { titleData, processedSoundtracks, idToNameMap, namesData } = data;
        ratingsTitleData = titleData || null;
        rerenderRatingsPanel();

        if (ENABLE_IMDB_RATINGS_PANEL && shouldFetchMetacriticSupplementalData()) {
            const metacriticUrl = titleData?.metacritic?.url || null;
            if (metacriticUrl) {
                fetchMetacriticWithCache(imdbId, metacriticUrl, {
                    requireUserData: SHOW_RATINGS_METACRITIC_USER_SCORE || SHOW_RATINGS_METACRITIC_BREAKDOWN || aggregateNeedsMetacriticUserData(),
                    requireBreakdown: SHOW_RATINGS_METACRITIC_BREAKDOWN
                })
                    .then((metaData) => {
                        supplementalRatings.metacritic = metaData;
                        rerenderRatingsPanel();
                    })
                    .catch((error) => {
                        supplementalRatings.metacritic = null;
                        console.error('Failed to fetch Metacritic data:', error);
                        rerenderRatingsPanel();
                    });
            } else {
                supplementalRatings.metacritic = null;
                rerenderRatingsPanel();
            }
        }

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

            await replacePTPTrailerWithIMDbVideos(imdbId, titleData, imdbTrailerDataPromise);

            formatIMDbText();

            // **NEW: Dispatch event when IMDb processing is complete**
            console.log(`PTP IMDb Combined: Processing complete for ${imdbId}, dispatching completion event`);
            document.dispatchEvent(new CustomEvent('imdbProcessingComplete', {
                detail: {
                    imdbId: imdbId,
                    timestamp: Date.now(),
                    source: 'ptp-imdb-combined',
                    success: true,
                    titleData: titleData,
                    processedSoundtracks: processedSoundtracks,
                    idToNameMap: idToNameMap,
                    namesData: namesData
                }
            }));

        } else {
            console.error("Failed to retrieve valid title data");

            // **NEW: Dispatch error event when processing fails**
            document.dispatchEvent(new CustomEvent('imdbProcessingComplete', {
                detail: {
                    imdbId: imdbId,
                    timestamp: Date.now(),
                    source: 'ptp-imdb-combined',
                    success: false,
                    error: 'Failed to retrieve valid title data'
                }
            }));
        }
    }).catch(err => {
        console.error("PTP IMDb Combined processing error:", err);
        ratingsTitleData = null;
        rerenderRatingsPanel();

        // **NEW: Dispatch error event when fetch fails**
        document.dispatchEvent(new CustomEvent('imdbProcessingComplete', {
            detail: {
                imdbId: imdbId,
                timestamp: Date.now(),
                source: 'ptp-imdb-combined',
                success: false,
                error: err.message || 'Unknown error'
            }
        }));
    });

    // Add IMDb cache sharing via document events
    document.addEventListener('requestIMDbData', async (event) => {
        const { imdbId, requestId } = event.detail;

        try {
            console.log(`PTP IMDb Combined: Received request for ${imdbId} (requestId: ${requestId})`);

            const cacheKey = `iMDB_data_${imdbId}`;
            console.log(`PTP IMDb Combined: Looking for cache key: ${cacheKey}`);

            // Try to get the data from cache using the same method as the script
            const cachedData = await getCache(cacheKey);
            let responseData = null;

            if (cachedData) {
                console.log(`PTP IMDb Combined: Found cached data for ${imdbId}`);
                console.log(`PTP IMDb Combined: Cache data type:`, typeof cachedData);
                console.log(`PTP IMDb Combined: Cache data keys:`, Object.keys(cachedData));

                responseData = {
                    found: true,
                    imdbId: imdbId,
                    timestamp: Date.now(),
                    data: cachedData,
                    source: 'ptp-imdb-combined'
                };
            } else {
                console.log(`PTP IMDb Combined: No cached data found for ${imdbId}`);

                responseData = {
                    found: false,
                    imdbId: imdbId,
                    data: null,
                    source: 'ptp-imdb-combined'
                };
            }

            // Send response back
            console.log(`PTP IMDb Combined: Sending response for ${imdbId} (requestId: ${requestId}):`, responseData.found ? 'Data found' : 'No data');
            document.dispatchEvent(new CustomEvent('imdbDataResponse', {
                detail: {
                    requestId: requestId,
                    ...responseData
                }
            }));

        } catch (error) {
            console.error('PTP IMDb Combined: Error processing IMDb request:', error);

            // Send error response
            document.dispatchEvent(new CustomEvent('imdbDataResponse', {
                detail: {
                    requestId: requestId,
                    found: false,
                    error: error.message,
                    imdbId: imdbId,
                    data: null,
                    source: 'ptp-imdb-combined'
                }
            }));
        }
    });

    console.log('PTP IMDb Combined: Event listener for requestIMDbData added');

    document.addEventListener('imdbScriptPing', (event) => {
        const { pingId } = event.detail;
        console.log(`PTP IMDb Combined: Received ping with ID: ${pingId}`);

        // Respond with pong
        document.dispatchEvent(new CustomEvent('imdbScriptPong', {
            detail: { pingId: pingId }
        }));

        console.log(`PTP IMDb Combined: Sent pong response for ID: ${pingId}`);
    });

})();
