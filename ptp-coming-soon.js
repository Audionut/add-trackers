// ==UserScript==
// @name        PTP - Coming Soon
// @author      Perilune, alfablac
// @match       https://passthepopcorn.me/
// @match       https://passthepopcorn.me/index.php
// @match       https://passthepopcorn.me/user.php*
// @icon        https://passthepopcorn.me/favicon.ico
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @version     0.2.0
// ==/UserScript==

// v0.1.9 - added comingSoon graphql query and GM storage support
// v0.2.0 - add option for poster links to point to Letterboxd instead of IMDb

const LOG_LEVEL = "DEBUG";
const GM_STORAGE_UNSET = "__upcoming_gm_storage_unset__";
const IMDB_GRAPHQL_URL = "https://api.graphql.imdb.com/";
const IMDB_COMING_SOON_PAGE_SIZE = 45;
const IMDB_COMING_SOON_MAX_PAGES = 200;
const IMDB_COMING_SOON_MAX_WINDOWS = 24;
const IMDB_COMING_SOON_SAFETY_DAYS = 3;
const DEFAULT_COUNTRY_CODE = "US";
const COUNTRY_OPTIONS_HTML = '<option value="AF">Afghanistan</option><option value="AL">Albania</option><option value="AS">American Samoa</option><option value="AI">Anguilla</option><option value="AR">Argentina</option><option value="AM">Armenia</option><option value="AU">Australia</option><option value="AT">Austria</option><option value="BD">Bangladesh</option><option value="BB">Barbados</option><option value="BY">Belarus</option><option value="BE">Belgium</option><option value="BJ">Benin</option><option value="BM">Bermuda</option><option value="BR">Brazil</option><option value="KH">Cambodia</option><option value="CM">Cameroon</option><option value="CA">Canada</option><option value="CF">Central African Republic</option><option value="CL">Chile</option><option value="CN">China</option><option value="CC">Cocos (Keeling) Islands</option><option value="CO">Colombia</option><option value="CR">Costa Rica</option><option value="HR">Croatia</option><option value="CU">Cuba</option><option value="CW">Curaçao</option><option value="CY">Cyprus</option><option value="CZ">Czechia</option><option value="DK">Denmark</option><option value="DM">Dominica</option><option value="DO">Dominican Republic</option><option value="EC">Ecuador</option><option value="EG">Egypt</option><option value="GQ">Equatorial Guinea</option><option value="EE">Estonia</option><option value="FI">Finland</option><option value="FR">France</option><option value="GF">French Guiana</option><option value="GA">Gabon</option><option value="GM">Gambia</option><option value="GE">Georgia</option><option value="DE">Germany</option><option value="GR">Greece</option><option value="GN">Guinea</option><option value="GW">Guinea-Bissau</option><option value="HK">Hong Kong SAR China</option><option value="HU">Hungary</option><option value="IS">Iceland</option><option value="IN">India</option><option value="ID">Indonesia</option><option value="IR">Iran</option><option value="IE">Ireland</option><option value="IL">Israel</option><option value="IT">Italy</option><option value="JP">Japan</option><option value="KZ">Kazakhstan</option><option value="KW">Kuwait</option><option value="LV">Latvia</option><option value="LB">Lebanon</option><option value="LR">Liberia</option><option value="LY">Libya</option><option value="LT">Lithuania</option><option value="LU">Luxembourg</option><option value="MO">Macao SAR China</option><option value="MY">Malaysia</option><option value="MV">Maldives</option><option value="MH">Marshall Islands</option><option value="MX">Mexico</option><option value="ME">Montenegro</option><option value="MM">Myanmar (Burma)</option><option value="NP">Nepal</option><option value="NL">Netherlands</option><option value="NZ">New Zealand</option><option value="NI">Nicaragua</option><option value="NG">Nigeria</option><option value="NO">Norway</option><option value="PK">Pakistan</option><option value="PY">Paraguay</option><option value="PE">Peru</option><option value="PH">Philippines</option><option value="PL">Poland</option><option value="PT">Portugal</option><option value="PR">Puerto Rico</option><option value="QA">Qatar</option><option value="RO">Romania</option><option value="RU">Russia</option><option value="SA">Saudi Arabia</option><option value="RS">Serbia</option><option value="SG">Singapore</option><option value="SK">Slovakia</option><option value="SI">Slovenia</option><option value="ZA">South Africa</option><option value="KR">South Korea</option><option value="ES">Spain</option><option value="LK">Sri Lanka</option><option value="SE">Sweden</option><option value="CH">Switzerland</option><option value="TW">Taiwan</option><option value="TH">Thailand</option><option value="TR">Turkey</option><option value="UA">Ukraine</option><option value="AE">United Arab Emirates</option><option value="GB">United Kingdom</option><option value="US">United States</option><option value="UY">Uruguay</option><option value="VE">Venezuela</option><option value="VN">Vietnam</option>';
const EDITABLE_STORAGE_KEYS = [
    "upcoming.toggled",
    "upcoming.country",
    "upcoming.tmdb-api-key",
    "upcoming.poster-links-to-letterboxd",
    "upcoming.availability-indicator",
    "upcoming.default-tab",
    "upcoming.enabled-tabs",
    "upcoming.navbar-location",
    "upcoming.cutoff-hours-ptp",
    "upcoming.cutoff-hours-imdb",
    "upcoming.cutoff-hours-imdb-calendar",
    "upcoming.imdb-calendar",
    "upcoming.cutoff-hours-dvd-digital",
    "upcoming.cutoff-hours-dvd-physical"
];


const storage = (() => {
    const hasGMStorage = typeof GM_getValue === "function" && typeof GM_setValue === "function";

    const readLocalStorage = (key) => {
        if (typeof localStorage === "undefined") {
            return null;
        }

        return localStorage.getItem(key);
    };

    return {
        getItem(key) {
            if (!hasGMStorage) {
                return readLocalStorage(key);
            }

            const storedValue = GM_getValue(key, GM_STORAGE_UNSET);
            if (storedValue !== GM_STORAGE_UNSET) {
                return storedValue;
            }

            const legacyValue = readLocalStorage(key);
            if (legacyValue !== null) {
                GM_setValue(key, legacyValue);
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem(key);
                }
                return legacyValue;
            }

            return null;
        },

        setItem(key, value) {
            const normalizedValue = String(value);

            if (hasGMStorage) {
                GM_setValue(key, normalizedValue);
            } else if (typeof localStorage !== "undefined") {
                localStorage.setItem(key, normalizedValue);
            }

            return normalizedValue;
        },

        removeItem(key) {
            if (hasGMStorage && typeof GM_deleteValue === "function") {
                GM_deleteValue(key);
            }

            if (typeof localStorage !== "undefined") {
                localStorage.removeItem(key);
            }
        }
    };
})();


/* -------------------------------
 * LOGGING
 * ------------------------------- */
switch (LOG_LEVEL) {
    case 'ERROR':
        console.warn = function () { };
    // Falls through
    case 'WARN':
        console.info = function () { };
    // Falls through
    case 'INFO':
        console.log = function () { };
    // Falls through
    case 'LOG':
        console.debug = function () { };
        console.dir = function () { };
}


/* -------------------------------
 * DEFAULT SETTINGS
 * ------------------------------- */
if (storage.getItem("upcoming.toggled") === null) {
    storage.setItem("upcoming.toggled", false);
}
if (storage.getItem("upcoming.country") === null) {
    storage.setItem("upcoming.country", DEFAULT_COUNTRY_CODE);
}
if (storage.getItem("upcoming.tmdb-api-key") === null) {
    storage.setItem("upcoming.tmdb-api-key", "");
}
if (storage.getItem("upcoming.poster-links-to-letterboxd") === null) {
    storage.setItem("upcoming.poster-links-to-letterboxd", false);
}
if (storage.getItem("upcoming.availability-indicator") === null) {
    storage.setItem("upcoming.availability-indicator", "text-color");
}
if (storage.getItem("upcoming.default-tab") === null) {
    storage.setItem("upcoming.default-tab", "list");
}
if (storage.getItem("upcoming.enabled-tabs") === null) {
    storage.setItem("upcoming.enabled-tabs", '["list", "calendar", "digital", "physical"]');
}
if (storage.getItem("upcoming.navbar-location") === null) {
    storage.setItem("upcoming.navbar-location", "top");
}
if (storage.getItem("upcoming.cutoff-hours-ptp") === null) {
    storage.setItem("upcoming.cutoff-hours-ptp", 24);
}
if (storage.getItem("upcoming.cutoff-hours-imdb") === null) {
    storage.setItem("upcoming.cutoff-hours-imdb", 730);
}
if (storage.getItem("upcoming.cutoff-hours-imdb-calendar") === null) {
    storage.setItem("upcoming.cutoff-hours-imdb-calendar", 730);
}
if (storage.getItem("upcoming.imdb-calendar") === null) {
    emptyImdbCalendar();
}
if (storage.getItem("upcoming.cutoff-hours-dvd-digital") === null) {
    storage.setItem("upcoming.cutoff-hours-dvd-digital", 24);
}
if (storage.getItem("upcoming.cutoff-hours-dvd-physical") === null) {
    storage.setItem("upcoming.cutoff-hours-dvd-physical", 24);
}
setImdbCacheTtlHours(
    storage.getItem("upcoming.cutoff-hours-imdb-calendar")
    || storage.getItem("upcoming.cutoff-hours-imdb")
    || 730
);
normalizeStoredCountrySetting();


function getTmdbApiKey() {
    return (storage.getItem("upcoming.tmdb-api-key") || "").trim();
}


function getPosterLinksToLetterboxd() {
    return storage.getItem("upcoming.poster-links-to-letterboxd") === "true";
}


function getLetterboxdPosterUrl(movie) {
    if (movie.imdbId) {
        return `https://letterboxd.com/imdb/${movie.imdbId}`;
    }

    const searchTerms = [movie.title, movie.releaseDate ? movie.releaseDate.slice(-4) : ""]
        .filter(Boolean)
        .join(" ");
    return `https://letterboxd.com/search/${encodeURIComponent(searchTerms)}/`;
}


function getPosterUrl(movie, fallbackUrl) {
    if (getPosterLinksToLetterboxd()) {
        return getLetterboxdPosterUrl(movie);
    }

    if (!fallbackUrl) {
        return null;
    }

    if (fallbackUrl.includes("undefined") || fallbackUrl.includes("null")) {
        return null;
    }

    return fallbackUrl;
}


function normalizePositiveIntegerString(value, fallback) {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0
        ? String(parsed)
        : String(fallback);
}


function setImdbCacheTtlHours(value) {
    const normalized = normalizePositiveIntegerString(value, 730);
    storage.setItem("upcoming.cutoff-hours-imdb", normalized);
    storage.setItem("upcoming.cutoff-hours-imdb-calendar", normalized);
    return normalized;
}


function getImdbCacheTtlHours() {
    const rawValue = storage.getItem("upcoming.cutoff-hours-imdb")
        || storage.getItem("upcoming.cutoff-hours-imdb-calendar")
        || 730;
    const normalized = setImdbCacheTtlHours(rawValue);
    return Number.parseInt(normalized, 10);
}


function createCountryOptionsContainer() {
    const container = document.createElement("select");
    container.innerHTML = COUNTRY_OPTIONS_HTML;
    return container;
}


function normalizeCountryCode(countryValue) {
    if (!countryValue) {
        return DEFAULT_COUNTRY_CODE;
    }

    const normalizedInput = String(countryValue).trim();
    const optionContainer = createCountryOptionsContainer();
    const matchingByCode = optionContainer.querySelector(`[value="${normalizedInput.toUpperCase()}"]`);
    if (matchingByCode) {
        return normalizedInput.toUpperCase();
    }

    const matchingByName = Array.from(optionContainer.options).find((option) => option.textContent.trim().toLowerCase() === normalizedInput.toLowerCase());
    return matchingByName ? matchingByName.value : DEFAULT_COUNTRY_CODE;
}


function getStoredCountryCode() {
    return normalizeCountryCode(storage.getItem("upcoming.country"));
}


function normalizeStoredCountrySetting() {
    const normalizedCountry = getStoredCountryCode();
    if (storage.getItem("upcoming.country") !== normalizedCountry) {
        storage.setItem("upcoming.country", normalizedCountry);
    }
}


function getImdbUserLanguage() {
    const navigatorLanguage = typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    const languageCode = navigatorLanguage.replace("_", "-").split("-")[0] || "en";
    return `${languageCode}-${getStoredCountryCode()}`;
}


function getImdbRequestHeaders(extraHeaders = {}) {
    return {
        "x-imdb-user-country": getStoredCountryCode(),
        "x-imdb-user-language": getImdbUserLanguage(),
        ...extraHeaders
    };
}


/* -------------------------------
 * CACHE CLEANUP
 * ------------------------------- */
initializeDatabases();
cleanupData("imdbPageData", getImdbCacheTtlHours());
cleanupData("ptpMeta", storage.getItem("upcoming.cutoff-hours-ptp"));
cleanupData("dvdDigitalData", storage.getItem("upcoming.cutoff-hours-dvd-digital"));
cleanupData("dvdPhysicalData", storage.getItem("upcoming.cutoff-hours-dvd-physical"));


/* -------------------------------
 * STYLES
 * ------------------------------- */
const css = `
#upcoming-footer {
  display: flex;
  align-items: center;
  padding: 5px;
  color: #c5c5c5;
}

#upcoming-footer-locale {
  flex: 1;
}
#upcoming-footer-locale > select {
  opacity: 0.5;
  margin-right: 5px;
}
#upcoming-footer-locale > label {
  margin-right: 5px;
}

#upcoming-footer-status {
  flex: 1;
  text-align: right;
}

.upcoming-arrows {
  display: flex;
  align-items: center;
  padding: 5px;
  margin-bottom: 1px;
}

.upcoming-arrows-previous {
  flex: 1;
}
.upcoming-arrows-current {
  flex: 1;
  text-align: center;
}
.upcoming-arrows-next {
  flex: 1;
  text-align: right;
}

.disabled-arrow {
  /*cursor: not-allowed;*/
  opacity: 0.5;
}
.disabled-arrow > a {
  pointer-events: none;
  text-decoration: none;
}

.hidden {
  display: none !important;
}

.alert-fade {
  opacity: 1;
  transition: opacity 1s linear;
}

.alert-fade-out {
  opacity: 0;
}

#upcoming-table-list > table {
  margin: 12px 0;
  border-collapse: separate;
  border-spacing: 0;
}

#upcoming-table-list > table:first-child {
  margin-top: 0;
}

#upcoming-table-list > table:last-child {
  margin-bottom: 0;
}

#upcoming-table-list {
  width: 100%;
  table-layout: fixed;
}
#upcoming-table-list td {
  vertical-align: top;
  padding: 5px;
}

.upcoming-table-list-cover img {
  width: 95px;
}

.upcoming-table-list-meta img {
  margin-right: 4px;
  vertical-align: middle;
}

.upcoming-table-list-meta img.upcoming-table-list-logo {
  width: 25px;
  height: 25px;
}

#upcoming-table-calendar {
  /* padding: 15px 10px; */
}

#upcoming-settings-body > .grid {
  margin-bottom: 5px;
}

.upcoming-settings-container {
  position: relative;
  margin-top: 1em;
}

.upcoming-settings-label {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 9em;
  height: 2.5em;
  text-align: right;
  /* background-image: linear-gradient(to top, #B80000, #680000); */
  /* background-color: #2c2c2c; */
  color: white;
  /* line-height: 40px; */
  /* border: solid 2px #555; */
  /* border-radius: 5px; */
  /* display: flex; */
  /* align-items: center; */
  /* justify-content: center; */
}
.upcoming-settings-label > div {
  margin-top: 0.25em;
}

#upcoming-setting-cache-ttl > input {
  width: 62px;
  margin-right: 10px;
}
#upcoming-setting-cache-ttl > label {
  margin-right: 5px;
}

#upcoming-storage-editor {
    width: 100%;
    min-height: 260px;
    font-family: Consolas, Monaco, monospace;
    resize: vertical;
}

.upcoming-storage-editor__help {
    margin-bottom: 8px;
    opacity: 0.75;
}

.upcoming-storage-editor__actions {
    margin-top: 10px;
}

.upcoming-storage-editor__actions > button {
    margin-right: 8px;
}

.upcoming-loading {
  text-align: center;
  opacity: 0.25;
}
.upcoming-loading img {
  width: 32px;
  height: 32px;
}
`;


function injectStyles() {
    if (typeof GM_addStyle != "undefined") {
        GM_addStyle(css);
    } else {
        var node = document.createElement("style");
        node.type = "text/css";
        node.appendChild(document.createTextNode(css));
        var heads = document.getElementsByTagName("head");
        if (heads.length > 0) {
            heads[0].appendChild(node);
        } else {
            document.documentElement.appendChild(node);
        }
    }
}


if (document.documentElement) {
    injectStyles();
} else {
    // Work-around for https://github.com/greasemonkey/greasemonkey/issues/2996
    var obs = new MutationObserver(function () {
        if (document.documentElement) { obs.disconnect(); injectStyles(); }
    });
    obs.observe(document, { childList: true });
}



/* -------------------------------
 * PATHS
 * ------------------------------- */
if (location.pathname === "/" || location.pathname === "/index.php") {
    main();
} else if (/user.php/.test(location.pathname) && new URLSearchParams(location.search).get("action") === "edit") {
    addSettings();
}


/* -------------------------------
 * DATABASES
 * ------------------------------- */
function emptyImdbCalendar() {
    console.info("Emptied IMDb calendar.");
    storage.setItem("upcoming.imdb-calendar", JSON.stringify({
        lastUpdate: null,
        country: getStoredCountryCode(),
        data: [],
        movieMap: {}
    }));
    refreshStorageEditor();
}


async function cleanupData(dbName, cutoffHours) {
    return await removeMovieDataOlderThan(dbName, cutoffHours);
}


async function removeMovieDataOlderThan(dbName, hours) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        let deletedMovieCount = 0;
        const deletedMovies = [];

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('movies', 'readwrite');
            const objectStore = transaction.objectStore('movies');
            const cutoffDate = new Date();
            cutoffDate.setTime(cutoffDate.getTime() - hours * 60 * 60 * 1000);
            const range = IDBKeyRange.upperBound(cutoffDate, true);
            const index = objectStore.index('lastUpdateIndex');
            const getRequest = index.openCursor(range);

            getRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const movie = cursor.value;
                    const movieId = cursor.primaryKey;
                    const lastUpdate = movie.lastUpdate;
                    const deleteRequest = cursor.delete();

                    deleteRequest.onsuccess = () => {
                        deletedMovieCount++;
                        deletedMovies.push({ id: movieId, lastUpdate });
                    };
                    deleteRequest.onerror = (event) => {
                        console.error(`[${dbName}] Error removing data (request):`, event.target.error);
                        reject();
                    };
                    cursor.continue();
                } else {
                    const message = `[${dbName}] ${deletedMovieCount} entries deleted:`;
                    (deletedMovieCount > 0) ? console.info(message, deletedMovies) : console.info(message, deletedMovies);
                    resolve();
                }
            };

            getRequest.onerror = (event) => {
                console.error(`[${dbName}] Error retrieving data (request):`, event.target.error);
                reject(event.target.error);
            };
            transaction.oncomplete = () => {
                db.close();
            };
            transaction.onerror = (event) => {
                console.error(`[${dbName}] Error removing data (transaction):`, event.target.error);
                reject(event.target.error);
            };
        };
        request.onerror = (event) => {
            console.error(`Error opening ${dbName} database:`, event.target.error);
            reject(event.target.error);
        };
    });
}


async function retrieveDvdPhysicalData(dateId) {
    return await retrieveFromDatabase("dvdPhysicalData", dateId);
}


async function retrieveDvdDigitalData(dateId) {
    return await retrieveFromDatabase("dvdDigitalData", dateId);
}


async function retrieveImdbPageData(imdbId) {
    return await retrieveFromDatabase("imdbPageData", imdbId);
}


async function retrievePtpMeta(imdbId) {
    return await retrieveFromDatabase("ptpMeta", imdbId);
}


async function retrieveFromDatabase(dbName, id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('movies', 'readonly');
            const objectStore = transaction.objectStore('movies');
            const getRequest = objectStore.get(id);

            getRequest.onsuccess = (event) => {
                const movie = event.target.result;
                if (movie) {
                    console.debug(`[${dbName}] Data found:`, movie);
                    resolve(movie);
                } else {
                    console.debug(`[${dbName}] Data not found for ID:`, id);
                    resolve(null);
                    // reject(new Error("Data not found."));
                }
            };
            getRequest.onerror = (event) => {
                console.error(`[${dbName}] Error retrieving data (request):`, event.target.error);
                reject(event.target.error);
            };
            transaction.oncomplete = () => { db.close(); };
            transaction.onerror = (event) => {
                console.error(`[${dbName}] Error retrieving data (transaction):`, event.target.error);
                reject(event.target.error);
            };
        };
        request.onerror = (event) => {
            console.error(`Error opening ${dbName} database:`, event.target.error);
            reject(event.target.error);
        };
    });
}


async function storeDvdPhysicalData(movies) {
    return await storeInDatabase("dvdPhysicalData", movies);
}


async function storeDvdDigitalData(movies) {
    return await storeInDatabase("dvdDigitalData", movies);
}


async function storeImdbPageData(movie) {
    return await storeInDatabase("imdbPageData", movie);
}


async function storePtpMeta(ptp) {
    return await storeInDatabase("ptpMeta", ptp);
}


async function storeInDatabase(dbName, movie) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('movies', 'readwrite');
            const objectStore = transaction.objectStore('movies');

            movie.lastUpdate = new Date();  // Set lastUpdate

            const putRequest = objectStore.put(movie);

            putRequest.onsuccess = () => {
                console.debug(`[${dbName}] Data stored successfully.`, movie);
                resolve();
            };
            putRequest.onerror = (event) => {
                console.error(`[${dbName}] Error storing data (request):`, event.target.error);
                reject(event.target.error);
            };
            transaction.oncomplete = () => { db.close(); };
            transaction.onerror = (event) => {
                console.error(`[${dbName}] Error storing data (transaction):`, event.target.error);
                reject(event.target.error);
            };
        };
        request.onerror = (event) => {
            console.error(`Error opening ${dbName} database:`, event.target.error);
            reject(event.target.error);
        };
    });
}


function initializeDatabases() {
    const myDbs = [
        { name: "imdbPageData", id: "imdbId" },
        { name: "ptpMeta", id: "imdbId" },
        { name: "dvdDigitalData", id: "dateId" },
        { name: "dvdPhysicalData", id: "dateId" }
    ];

    myDbs.forEach(myDb => {
        const request = indexedDB.open(myDb.name, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const objectStore = db.createObjectStore('movies', { keyPath: myDb.id });
            objectStore.createIndex('lastUpdateIndex', 'lastUpdate', { unique: false });
            console.info(`[${myDb.name}] Database created.`);
        };
        // request.onsuccess = (event) => { };
        // request.onerror = (event) => { };
    })
}


/* -------------------------------
 * UTILS
 * ------------------------------- */
async function getDocument(url, isJson = false, method = "GET", data = null) {
    console.debug(`New request to: ${url}`);
    const headers = (/imdb.com/.test(url))
        ? getImdbRequestHeaders({
            Cookie: `lc-main=${getImdbUserLanguage().replace("-", "_")}`
        })
        : {};
    const gmXhr = (typeof GM !== "undefined" && GM.xmlHttpRequest) ? GM.xmlHttpRequest : GM_xmlhttpRequest;

    return new Promise((resolve, reject) => {
        gmXhr({
            method: method,
            url: url,
            headers: headers,
            data: data,
            onload: function (response) {
                if (isJson) {
                    const data = JSON.parse(response.responseText);
                    resolve(data);
                } else {
                    const html = response.responseText;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");
                    resolve(doc);
                }
            },
            onerror: function (error) {
                reject(error);
            }
        });
    });
}


function createElement(elementType, id, className = null) {
    const elem = document.createElement(elementType);
    elem.id = id;
    if (className) {
        elem.className = className;
    }
    return elem;
}


function getWeekExtremes(currentDate) {
    currentDate.setHours(0);
    currentDate.setMinutes(0);
    currentDate.setSeconds(0);
    currentDate.setMilliseconds(0);

    const dayOfWeek = currentDate.getDay();
    const firstDayOfWeek = new Date(currentDate);
    const lastDayOfWeek = new Date(currentDate);

    firstDayOfWeek.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    lastDayOfWeek.setDate(currentDate.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));

    return {
        start: firstDayOfWeek,
        end: lastDayOfWeek
    };
}


/* -------------------------------
 * DATA
 * ------------------------------- */
function findReleaseType(td) {
    var tr = td.parentElement;
    do {
        tr = tr.previousElementSibling;
        var reltype = tr.querySelector(".reltype");
        if (reltype) {
            return reltype.textContent.trim().slice(-8, -1);
        }
    } while (tr);
}


async function getDvdPhysicalReleasesData(month, year) {
    const baseUrl = "https://www.dvdsreleasedates.com"
    //const doc = await getDocument(`${baseUrl}/releases/${year}/${month+1}/`);
    const doc = await getDocument(`${baseUrl}/releases/${year}/${month + 1}/`, false, "POST", "toggleShow=1");
    var releasesData = [];
    const dvdcells = doc.querySelectorAll(".dvdcell");

    for (let i = 0; i < dvdcells.length; i++) {
        const release = dvdcells[i];
        const releaseDate = release.parentNode.parentNode.querySelector("td.reldate").innerText;
        const links = release.querySelectorAll("a");

        const title = links[1].innerText;
        if (title.toLowerCase().includes("season")) {  // TODO: Not optimal, may exclude movies - anything better?
            continue;
        }

        const image = `${baseUrl}${new URL(release.querySelector("img").src).pathname}`;
        const imdbId = links[2].href.match(/\/title\/([a-z0-9]+)/)[1];
        const dvdId = links[0].href.match(/\/movies\/(\d+)\//)[1];
        const releaseType = findReleaseType(release);
        const formats = release.querySelector(".celldiscs:last-child").textContent.trim().split("\u200A\u200A").map(x => x === "Blu-ray" ? "BD" : x);

        releasesData.push({
            releaseDate: (new Date(releaseDate)).toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            title: title,
            image: image,
            imdbId: imdbId,
            dvdId: dvdId,
            releaseType: releaseType,
            formats: formats
        });
    }

    return releasesData;
}


async function getDvdDigitalReleasesData(month, year) {
    const baseUrl = "https://www.dvdsreleasedates.com"
    const doc = await getDocument(`${baseUrl}/digital-releases/${year}/${month + 1}/`);
    var releasesData = [];

    doc.querySelectorAll(".dvdcell").forEach(release => {
        const releaseDate = release.parentNode.parentNode.querySelector("td.reldate").innerText;
        const links = release.querySelectorAll("a");
        const image = `${baseUrl}${new URL(release.querySelector("img").src).pathname}`;
        const title = links[1].innerText;
        const imdbId = links[2].href.match(/\/title\/([a-z0-9]+)/)[1];
        const dvdId = links[0].href.match(/\/movies\/(\d+)\//)[1];

        releasesData.push({
            releaseDate: (new Date(releaseDate)).toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            title: title,
            image: image,
            imdbId: imdbId,
            dvdId: dvdId
        });
    });

    return releasesData;
}
function getImdbDateStringParts(date) {
        return {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate()
        };
}


function getImdbDateValue(releaseDate) {
        if (!releaseDate?.year || !releaseDate?.month || !releaseDate?.day) {
                return null;
        }

        return `${releaseDate.year}-${String(releaseDate.month).padStart(2, "0")}-${String(releaseDate.day).padStart(2, "0")}`;
}


function getImdbDisplayDate(releaseDateValue) {
        if (!releaseDateValue) {
                return null;
        }

        return new Date(`${releaseDateValue}T00:00:00`).toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
        });
}


function getNextDateValue(dateValue) {
        const nextDate = new Date(`${dateValue}T00:00:00`);
        nextDate.setDate(nextDate.getDate() + 1);
        return getImdbDateValue(getImdbDateStringParts(nextDate));
}


function getPreviousDateValue(dateValue, days = 1) {
    if (!dateValue) {
        return null;
    }

    const previousDate = new Date(`${dateValue}T00:00:00`);
    previousDate.setDate(previousDate.getDate() - days);
    return getImdbDateValue(getImdbDateStringParts(previousDate));
}


function normalizeDirectorNames(principalCredits = []) {
        const directorCredit = principalCredits.find((credit) => {
                const categoryId = credit.category?.id?.toLowerCase();
                const categoryText = credit.category?.text?.toLowerCase();
                return categoryId === "director" || categoryId === "directors" || categoryText === "director" || categoryText === "directors";
        });

        if (!directorCredit?.credits?.length) {
                return [];
        }

        return directorCredit.credits
                .map((credit) => credit.name?.nameText?.text)
                .filter(Boolean);
}


function normalizeComingSoonMovie(node) {
        const releaseDateValue = getImdbDateValue(node.releaseDate);
        const releaseDate = releaseDateValue ? new Date(`${releaseDateValue}T00:00:00`) : new Date();
        const weekExtremes = getWeekExtremes(new Date(releaseDate));

        return {
                imdbId: node.id,
                tmdbId: null,
                letterboxdId: null,
                image: node.primaryImage?.url || "https://ptpimg.me/w6l4kj.png",
                title: node.titleText?.text || node.id,
                storyline: node.plot?.plotText?.plainText || "",
                directors: normalizeDirectorNames(node.principalCredits),
                genres: node.genres?.genres?.map((genre) => genre.text).filter(Boolean) || [],
                imdbScore: node.ratingsSummary?.aggregateRating != null
                        ? String(node.ratingsSummary.aggregateRating)
                        : null,
                imdbVoteCount: node.ratingsSummary?.voteCount != null
                        ? formatVoteCount(node.ratingsSummary.voteCount)
                        : null,
                releaseWeekStart: weekExtremes.start,
                releaseWeekEnd: weekExtremes.end,
                releaseDate: getImdbDisplayDate(releaseDateValue),
                releaseDateValue: releaseDateValue
        };
}


function buildCalendarDataFromMovies(movies) {
        const groupedMovies = new Map();

        movies.forEach((movie) => {
                if (!movie.releaseDateValue) {
                        return;
                }

                if (!groupedMovies.has(movie.releaseDateValue)) {
                        groupedMovies.set(movie.releaseDateValue, []);
                }

                groupedMovies.get(movie.releaseDateValue).push(movie.imdbId);
        });

        return Array.from(groupedMovies.entries())
                .sort(([leftDate], [rightDate]) => new Date(leftDate) - new Date(rightDate))
                .map(([date, movieIds]) => ({ date: date, movieIds: movieIds }));
}


function buildMovieMap(movies) {
        return movies.reduce((accumulator, movie) => {
                accumulator[movie.imdbId] = movie;
                return accumulator;
        }, {});
}


async function fetchComingSoonPage(releasingOnOrAfter, afterCursor = null, retries = 3) {
        const todayWeekStart = getWeekExtremes(new Date()).start;
        const dateFilter = releasingOnOrAfter || getImdbDateValue(getImdbDateStringParts(todayWeekStart));
    const safeDateFilter = getPreviousDateValue(dateFilter, IMDB_COMING_SOON_SAFETY_DAYS) || dateFilter;
        const countryCode = getStoredCountryCode();
        const requestBody = {
                variables: {
                        after: afterCursor,
                        first: IMDB_COMING_SOON_PAGE_SIZE,
                        region: countryCode,
            releasingOnOrAfter: safeDateFilter
                },
                query: `
                    query ($after: ID, $first: Int!, $region: String!, $releasingOnOrAfter: Date!) {
                        comingSoon(
                            comingSoonType: MOVIE,
                            first: $first,
                            after: $after,
                            regionOverride: $region,
                            disablePopularityFilter: true,
                            releasingOnOrAfter: $releasingOnOrAfter,
                            sort: [{ sortBy: RELEASE_DATE, sortOrder: ASC }]
                        ) {
                            edges {
                                node {
                                    id
                                    titleText {
                                        text
                                    }
                                    releaseDate {
                                        day
                                        month
                                        year
                                    }
                                    plot {
                                        plotText {
                                            plainText
                                        }
                                    }
                                    genres {
                                        genres {
                                            text
                                        }
                                    }
                                    primaryImage {
                                        url
                                    }
                                    principalCredits {
                                        category {
                                            id
                                            text
                                        }
                                        credits {
                                            name {
                                                nameText {
                                                    text
                                                }
                                            }
                                        }
                                    }
                                    ratingsSummary {
                                        aggregateRating
                                        voteCount
                                    }
                                }
                            }
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                        }
                    }
                `
        };

        try {
                const data = await gmFetch(IMDB_GRAPHQL_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                });

                return {
                    edges: data?.data?.comingSoon?.edges || [],
                    pageInfo: data?.data?.comingSoon?.pageInfo || { endCursor: null, hasNextPage: false }
                };
        } catch (error) {
                if (retries > 0) {
                        console.warn(`Retrying IMDb comingSoon fetch. Remaining retries: ${retries - 1}`);
                    return fetchComingSoonPage(dateFilter, afterCursor, retries - 1);
                }

                throw error;
        }
}


async function fetchImdbComingSoonData(onProgress = () => {}) {
        const allEdges = [];
        const seenMovieIds = new Set();
    const todayWeekStart = getWeekExtremes(new Date()).start;
    let windowStartDate = getImdbDateValue(getImdbDateStringParts(todayWeekStart));
    let totalPagesFetched = 0;

    onProgress(`IMDb refresh: starting from ${windowStartDate}...`);

    for (let windowCount = 0; windowCount < IMDB_COMING_SOON_MAX_WINDOWS; windowCount++) {
        let afterCursor = null;
        let pageCount = 0;
        let maxWindowDate = null;
        let sawAnyWindowEdges = false;

        onProgress(`IMDb refresh: window ${windowCount + 1}/${IMDB_COMING_SOON_MAX_WINDOWS} (from ${windowStartDate})...`);

        while (true) {
            pageCount += 1;
            totalPagesFetched += 1;
            if (pageCount > IMDB_COMING_SOON_MAX_PAGES) {
                console.warn(`IMDb comingSoon pagination stopped after ${IMDB_COMING_SOON_MAX_PAGES} pages for window starting ${windowStartDate}.`);
                onProgress(`IMDb refresh: reached per-window safety limit (${IMDB_COMING_SOON_MAX_PAGES} pages).`);
                break;
            }

            const { edges, pageInfo } = await fetchComingSoonPage(windowStartDate, afterCursor);
            onProgress(`IMDb refresh: window ${windowCount + 1}, page ${pageCount} fetched (${edges.length} rows, ${seenMovieIds.size} unique titles).`);
            if (!edges.length) {
                break;
            }

            sawAnyWindowEdges = true;

            edges.forEach((edge) => {
                const releaseDateValue = getImdbDateValue(edge.node?.releaseDate);
                if (releaseDateValue && (!maxWindowDate || releaseDateValue > maxWindowDate)) {
                    maxWindowDate = releaseDateValue;
                }
            });

            const newEdges = edges.filter((edge) => {
                const imdbId = edge.node?.id;
                if (!imdbId || seenMovieIds.has(imdbId)) {
                    return false;
                }

                seenMovieIds.add(imdbId);
                return true;
            });

            if (newEdges.length) {
                allEdges.push(...newEdges);
            }

            if (!pageInfo?.hasNextPage) {
                break;
            }

            if (!pageInfo.endCursor || pageInfo.endCursor === afterCursor) {
                console.warn("IMDb comingSoon pagination cursor did not advance; stopping to prevent duplicate looping.");
                onProgress("IMDb refresh: pagination cursor stalled, stopping this window.");
                break;
            }

            afterCursor = pageInfo.endCursor;
        }

        if (!sawAnyWindowEdges || !maxWindowDate) {
            break;
        }

        const nextWindowStart = getNextDateValue(maxWindowDate);
        if (!nextWindowStart || nextWindowStart === windowStartDate) {
            break;
        }

        windowStartDate = nextWindowStart;
    }

    onProgress(`IMDb refresh complete: ${seenMovieIds.size} titles across ${totalPagesFetched} pages.`);

        const movies = allEdges
                .map((edge) => normalizeComingSoonMovie(edge.node))
                .filter((movie) => movie.imdbId && movie.releaseDateValue)
                .sort((leftMovie, rightMovie) => new Date(leftMovie.releaseDateValue) - new Date(rightMovie.releaseDateValue));

        return {
                calendarData: buildCalendarDataFromMovies(movies),
                movieMap: buildMovieMap(movies)
        };
}

/**
 * Wraps GM_xmlhttpRequest in a Promise for async/await usage.
 * This bypasses CORS — required for userscripts hitting api.graphql.imdb.com.
 */
function gmFetch(url, options = {}) {
    const gmXhr = (typeof GM !== "undefined" && GM.xmlHttpRequest) ? GM.xmlHttpRequest : GM_xmlhttpRequest;
    const requestHeaders = url === IMDB_GRAPHQL_URL
        ? getImdbRequestHeaders(options.headers || {})
        : (options.headers || {});

    return new Promise((resolve, reject) => {
        gmXhr({
            method: options.method || "GET",
            url,
            headers: requestHeaders,
            data: options.body || null,
            onload(response) {
                if (response.status >= 200 && response.status < 300) {
                    resolve(JSON.parse(response.responseText));
                } else {
                    reject(new Error(`gmFetch failed: HTTP ${response.status}`));
                }
            },
            onerror(response) {
                reject(new Error("gmFetch network error"));
            }
        });
    });
}

/**
 * Formats a raw numeric vote count into IMDb's display format.
 *   1_534_000 → "1.5M"
 *   245_800   → "246K"
 *   890       → "890"
 */
function formatVoteCount(count) {
    if (count >= 1_000_000) {
        return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (count >= 1_000) {
        return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return String(count);
}


/* -------------------------------
 * LINKS
 * ------------------------------- */
async function getTmdbId(imdbId) {
    const tmdbApiKey = getTmdbApiKey();
    if (!tmdbApiKey) {
        return null;
    }

    const data = await getDocument(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`, true);
    const tmdbId = (data.movie_results && data.movie_results.length > 0) ? data.movie_results[0].id : null;
    return tmdbId;
}


async function getPtpLink(imdbId) {
    const data = await getDocument(`https://passthepopcorn.me/torrents.php?action=autocomplete&searchstr=${imdbId}`, true);
    const ptpStatus = data[2] ? data[2][0] : null;
    return ptpStatus;
}


/* -------------------------------
 * SETTINGS
 * ------------------------------- */
function addSettings() {
    const containerDiv = document.createElement("div");
    containerDiv.className = "tabs__panel tabs__panel--active upcoming-settings-container";

    const labelDiv = document.createElement("div");
    labelDiv.className = "upcoming-settings-label";
    const labelName = document.createElement("a");
    labelName.textContent = `🍿 Coming Soon`;
    labelName.href = "/forums.php?action=viewthread&threadid=39968&postid=2175682#post2175682";
    const labelVersion = document.createElement("div");
    labelVersion.textContent = GM_info.script.version;
    labelDiv.append(labelName, labelVersion);

    const form = document.createElement("form");
    form.id = "upcoming-settings-form";
    form.addEventListener("submit", (event) => onSettingsChange(event));

    const outerDiv = document.createElement("div");
    outerDiv.className = "panel panel--no-margin form--horizontal";
    const innerDiv = document.createElement("div");
    innerDiv.className = "panel__body";
    innerDiv.id = "upcoming-settings-body";
    const footerDiv = createSettingsFooter();

    // Individual settings:
    const countrySetting = createSetting("Country:", createCountryOption());
    const tmdbApiKeySetting = createSetting("TMDb API key:", createTmdbApiKeyOption());
    const posterLinksSetting = createSetting("Poster links:", createPosterLinksOption());
    const defaultTabSetting = createSetting("Default tab:", createDefaultTabOption());
    const enabledTabSetting = createSetting("Enabled tabs:", createEnabledTabsOption());
    const availabilityIndicatorSetting = createSetting("Availability indicator:", createAvailabilityIndicatorOption());
    const navbarLocationSetting = createSetting("Navbar position:", createNavbarLocationOption());
    const cacheTTLSetting = createSetting("Cache time to live:", createCacheTTLOption());
    const storageEditorSetting = createSetting("Storage items:", createStorageEditor());

    innerDiv.append(countrySetting, tmdbApiKeySetting, posterLinksSetting, defaultTabSetting, enabledTabSetting, availabilityIndicatorSetting, navbarLocationSetting, cacheTTLSetting, storageEditorSetting, footerDiv);
    outerDiv.append(innerDiv);
    form.append(outerDiv);
    containerDiv.append(labelDiv, form);
    document.querySelector(".tabs__panels").append(containerDiv);
}


function displayAlert(text, backgroundColor = "green") {
    const alert = document.createElement("div");
    alert.className = "alert text--center alert-fade";
    alert.textContent = text;
    alert.style = `background-color: ${backgroundColor}; color: white`;
    document.querySelector("#content").prepend(alert);

    setTimeout(() => {
        alert.classList.add("alert-fade-out");
        setTimeout(() => {
            alert.remove();
        }, 1000);
    }, 2000);
}


function parseStorageValue(value) {
    if (value === null) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}


function serializeStorageValue(value) {
    if (value !== null && typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}


function getStorageEditorSnapshot() {
    return EDITABLE_STORAGE_KEYS.reduce((snapshot, key) => {
        snapshot[key] = parseStorageValue(storage.getItem(key));
        return snapshot;
    }, {});
}


function refreshStorageEditor() {
    const textarea = document.querySelector("#upcoming-storage-editor");
    if (!textarea) {
        return;
    }

    textarea.value = JSON.stringify(getStorageEditorSnapshot(), null, 2);
}


function onStorageEditorSave() {
    const textarea = document.querySelector("#upcoming-storage-editor");
    if (!textarea) {
        return;
    }

    let parsedConfig;

    try {
        parsedConfig = JSON.parse(textarea.value);
    } catch {
        displayAlert("Storage editor JSON is invalid.", "red");
        return;
    }

    if (!parsedConfig || Array.isArray(parsedConfig) || typeof parsedConfig !== "object") {
        displayAlert("Storage editor expects a JSON object.", "red");
        return;
    }

    EDITABLE_STORAGE_KEYS.forEach((key) => {
        if (!(key in parsedConfig)) {
            return;
        }

        const value = parsedConfig[key];
        if (value === null) {
            storage.removeItem(key);
            return;
        }

        storage.setItem(key, serializeStorageValue(value));
    });

    refreshStorageEditor();
    displayAlert("Storage items have been saved. Reload if you need the UI to refresh immediately.");
}


function onSettingsChange(event) {
    event.preventDefault();

    const country = normalizeCountryCode(document.querySelector("#upcoming-country-selector").value);
    const tmdbApiKey = document.querySelector("#upcoming-tmdb-api-key").value.trim();
    const posterLinksToLetterboxd = document.querySelector("#upcoming-poster-links-to-letterboxd").checked;
    const defaultTab = document.querySelector("#upcoming-setting-default-tab").value;
    const enabledTabs = Array.from(document.querySelectorAll("#upcoming-setting-enabled-tabs > label > input:checked")).map(x => x.value);
    const availabilityIndicator = document.querySelector("#upcoming-setting-availability-indicator").value;
    const navbarLocation = document.querySelector("#upcoming-setting-navbar-location").value;
    const ptpCacheTTL = document.querySelector("#upcoming-ptp-cache-ttl").value;
    const imdbCacheTTL = document.querySelector("#upcoming-imdb-cache-ttl").value;
    const dvdDigitalCacheTTL = document.querySelector("#upcoming-dvd-digital-cache-ttl").value;
    const dvdPhysicalCacheTTL = document.querySelector("#upcoming-dvd-physical-cache-ttl").value;

    if (enabledTabs.length > 0 && !enabledTabs.includes(defaultTab)) {
        displayAlert("Error: The default tab must be one of the enabled tabs.", "red")
        return;
    }

    if (getStoredCountryCode() !== country) {
        emptyImdbCalendar();
    }

    storage.setItem("upcoming.country", country);
    storage.setItem("upcoming.tmdb-api-key", tmdbApiKey);
    storage.setItem("upcoming.poster-links-to-letterboxd", posterLinksToLetterboxd);
    storage.setItem("upcoming.default-tab", defaultTab);
    storage.setItem("upcoming.enabled-tabs", JSON.stringify(enabledTabs));
    storage.setItem("upcoming.availability-indicator", availabilityIndicator);
    storage.setItem("upcoming.navbar-location", navbarLocation);
    storage.setItem("upcoming.cutoff-hours-ptp", ptpCacheTTL);
    setImdbCacheTtlHours(imdbCacheTTL);
    storage.setItem("upcoming.cutoff-hours-dvd-digital", dvdDigitalCacheTTL);
    storage.setItem("upcoming.cutoff-hours-dvd-physical", dvdPhysicalCacheTTL);

    refreshStorageEditor();
    displayAlert("Coming Soon settings have been saved.");
}


// TODO: Generic create*
function createCountryOption() {
    const currentCountry = getStoredCountryCode();
    const selector = createCountryOptionsContainer();
    selector.id = "upcoming-country-selector";
    const selectedOption = selector.querySelector(`[value="${currentCountry}"]`);
    if (selectedOption) {
        selectedOption.toggleAttribute("selected");
    }
    return selector;
}


function createTmdbApiKeyOption() {
    const input = document.createElement("input");
    input.type = "password";
    input.id = "upcoming-tmdb-api-key";
    input.autocomplete = "off";
    input.value = getTmdbApiKey();
    input.placeholder = "TMDb v3 API key";
    input.style.width = "320px";
    return input;
}


function createAvailabilityIndicatorOption() {
    const currentAvailabilityIndicator = storage.getItem("upcoming.availability-indicator");
    const selector = document.createElement("select");
    selector.id = "upcoming-setting-availability-indicator";
    selector.innerHTML = '<option value="text-color">Text color</option><option value="icon">Icon</option>';
    selector.querySelector(`[value=${currentAvailabilityIndicator}]`).toggleAttribute("selected");
    return selector;
}


function createPosterLinksOption() {
    const wrapper = document.createElement("label");
    wrapper.className = "form__checkbox-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "upcoming-poster-links-to-letterboxd";
    checkbox.checked = getPosterLinksToLetterboxd();

    wrapper.append(checkbox, " Link all posters to Letterboxd");
    return wrapper;
}


function createDefaultTabOption() {
    const currentDefaultTab = storage.getItem("upcoming.default-tab");
    const selector = document.createElement("select");
    selector.id = "upcoming-setting-default-tab";
    selector.innerHTML = '<option value="list">New Movie List</option><option value="calendar">New Movie Calendar</option><option value="digital">New Digital Releases</option><option value="physical">New Physical Releases</option>';
    selector.querySelector(`[value=${currentDefaultTab}]`).toggleAttribute("selected");
    return selector;
}


function createEnabledTabsOption() {
    const currentEnabledTabs = JSON.parse(storage.getItem("upcoming.enabled-tabs"));
    const div = document.createElement("div");
    div.id = "upcoming-setting-enabled-tabs";
    div.innerHTML = '<label class="form__checkbox-label"><input type="checkbox" value="list">New Movie List</label><label class="form__checkbox-label"><input type="checkbox" value="calendar">New Movie Calendar</label><label class="form__checkbox-label"><input type="checkbox" value="digital">New Digital Releases</label><label class="form__checkbox-label"><input type="checkbox" value="physical">New Physical Releases</label>';
    currentEnabledTabs.forEach(tab => div.querySelector(`[value=${tab}]`).toggleAttribute("checked"));
    return div;
}


function createNavbarLocationOption() {
    const currentNavbarLocation = storage.getItem("upcoming.navbar-location");
    const selector = document.createElement("select");
    selector.id = "upcoming-setting-navbar-location";
    selector.innerHTML = '<option value="top">Top</option><option value="bottom">Bottom</option>';
    selector.querySelector(`[value=${currentNavbarLocation}]`).toggleAttribute("selected");
    return selector;
}


function createCacheTTLOption() {
    const cutoffHoursPtp = storage.getItem("upcoming.cutoff-hours-ptp");
        const cutoffHoursImdb = getImdbCacheTtlHours();
    const cutoffHoursDvdDigital = storage.getItem("upcoming.cutoff-hours-dvd-digital");
    const cutoffHoursDvdPhysical = storage.getItem("upcoming.cutoff-hours-dvd-physical");
    const div = document.createElement("div");
    div.id = "upcoming-setting-cache-ttl";
    div.innerHTML = `
  <label for="ptp-cache-ttl">PTP:</label><input type="number" name="ptp-cache-ttl" id="upcoming-ptp-cache-ttl" value="${cutoffHoursPtp}">
    <label for="imdb-cache-ttl">IMDb:</label><input type="number" name="imdb-cache-ttl" id="upcoming-imdb-cache-ttl" value="${cutoffHoursImdb}">
  <label for="dvd-digital-cache-ttl">DVD Digital:</label><input type="number" name="dvd-digital-cache-ttl" id="upcoming-dvd-digital-cache-ttl" value="${cutoffHoursDvdDigital}">
  <label for="dvd-physical-cache-ttl">DVD Physical:</label><input type="number" name="dvd-physical-cache-ttl" id="upcoming-dvd-physical-cache-ttl" value="${cutoffHoursDvdPhysical}">
  `;
    return div;
}


function createStorageEditor() {
    const container = document.createElement("div");

    const helpText = document.createElement("div");
    helpText.className = "upcoming-storage-editor__help";
    helpText.textContent = "Edit GM storage values as JSON. Use null to delete a key.";

    const textarea = document.createElement("textarea");
    textarea.id = "upcoming-storage-editor";
    textarea.spellcheck = false;
    textarea.value = JSON.stringify(getStorageEditorSnapshot(), null, 2);

    const actionRow = document.createElement("div");
    actionRow.className = "upcoming-storage-editor__actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save storage";
    saveButton.addEventListener("click", onStorageEditorSave);

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.textContent = "Reload values";
    refreshButton.addEventListener("click", refreshStorageEditor);

    actionRow.append(saveButton, refreshButton);
    container.append(helpText, textarea, actionRow);

    return container;
}


function createSetting(labelText, setting = "") {
    const gridDiv = document.createElement("div");
    gridDiv.className = "grid";

    const gridItemLeft = document.createElement("div");
    gridItemLeft.className = "grid__item grid-u-2-10";
    const label = document.createElement("label");
    label.className = "form__label";
    label.textContent = labelText;
    gridItemLeft.append(label);

    const gridItemRight = document.createElement("div");
    gridItemRight.className = "grid__item grid-u-8-10";
    gridItemRight.append(setting);

    gridDiv.append(gridItemLeft, gridItemRight);

    return gridDiv;
}


function createSettingsFooter() {
    const footerDiv = document.createElement("div");
    footerDiv.className = "generic-form__footer";
    const gridDiv = document.createElement("div");
    gridDiv.className = "grid";
    const gridItem = document.createElement("div");
    gridItem.className = "grid__item grid-u-8-10 grid-offset-u-2-10";

    const inputItem = document.createElement("input");
    inputItem.type = "submit";
    inputItem.value = "Save settings"

    gridItem.append(inputItem);
    gridDiv.append(gridItem);
    footerDiv.append(gridDiv);

    return footerDiv;
}


/* -------------------------------
 * LOADING & EMPTY
 * ------------------------------- */
function createLoading(viewId) {
    const id = ["list", "calendar"].includes(viewId) ? "imdb" : viewId;

    const divLoading = document.createElement("div");
    divLoading.className = "upcoming-loading";
    divLoading.id = `upcoming-loading-${id}`;
    const img = document.createElement("img");
    //img.src = "https://ptpimg.me/pm3a48.gif"
    divLoading.append(img);
    const divLoadingText = document.createElement("div");
    divLoading.append(divLoadingText);

    img.src = "https://ptpimg.me/animated_favicon.gif";
    divLoadingText.textContent = "Loading...";

    return divLoading;
}


function updateLoadingFail(id, text = "No results.") {
    updateLoading(id, text);
    document.querySelectorAll(`#upcoming-loading-${id} > img`).forEach(img => img.src = "https://ptpimg.me/hl2hz0.png");
}


function updateLoading(id, text) {
    document.querySelectorAll(`#upcoming-loading-${id} > div`).forEach(t => t.textContent = text);
}


/* -------------------------------
 * BOX
 * ------------------------------- */
function addBox(defaultTabSetting, enabledTabsSetting, navbarLocationSetting) {
    const divContainer = createElement("div", "upcomingt", "panel js-cover-view-index-store");
    const panelHeading = createElement("div", "upcoming-panel-heading", "panel__heading");
    const tabControl = createElement("span", "upcoming-tab-control", "panel__heading__title tab");
    const divContent = createElement("div", "upcoming");
    const toggler = createToggler(divContent);

    // Views
    const allViews = [
        ["list", "New Movie List"],
        ["calendar", "New Movie Calendar"],
        ["digital", "New Digital Releases"],
        ["physical", "New Physical Releases"]
    ];
    var enabledViewTabs = [];

    allViews.forEach(([viewId, viewText]) => {
        const tab = createTabLink(viewText, `upcoming-tab-${viewId}`);
        const table = createElement("div", `upcoming-table-${viewId}`, "panel__body hidden");
        const tbody = createLoading(viewId);
        tab.addEventListener("click", () => showView(viewId));
        if (enabledTabsSetting.includes(viewId)) {
            enabledViewTabs.push(tab);
        }
        table.append(tbody);
        divContent.append(table);
    });

    // Arrows
    const allArrows = ["imdb", "digital", "physical"];
    allArrows.forEach(arrowId => {
        const divArrows = createElement("div", `upcoming-arrows-${arrowId}`, "upcoming-arrows hidden");
        const [divArrowPrevious, divArrowCurrent, divArrowNext, previousLink, nextLink] = createArrows(arrowId);
        divArrows.append(divArrowPrevious, divArrowCurrent, divArrowNext);
        previousLink.addEventListener("click", (event) => changeDatespan(event, false, arrowId));
        nextLink.addEventListener("click", (event) => changeDatespan(event, true, arrowId));
        navbarLocationSetting === "bottom" ? divContent.append(divArrows) : divContent.prepend(divArrows);
    })

    // Putting it together
    toggler.addEventListener("click", () => useToggler(divContent));
    enabledViewTabs = enabledViewTabs.flatMap((tab) => [tab, " | "]).slice(0, -1);
    enabledViewTabs.forEach(tab => tabControl.append(tab));
    panelHeading.append(tabControl, toggler);

    // Show default tab & arrows
    panelHeading.querySelector(`#upcoming-tab-${defaultTabSetting}`).classList.add("simple-tabs__link--active");
    divContent.querySelector(`#upcoming-table-${defaultTabSetting}`).classList.remove("hidden");
    divContent.querySelector(`#upcoming-arrows-${["list", "calendar"].includes(defaultTabSetting) ? "imdb" : defaultTabSetting}`).classList.remove("hidden");
    divContainer.append(panelHeading, divContent);
    document.querySelector(".main-column").prepend(divContainer);
}


function createTabLink(text, id) {
    const tabLink = document.createElement("a");
    tabLink.href = "#";
    tabLink.id = id;
    tabLink.className = "simple-tabs__link";
    tabLink.textContent = text;
    return tabLink;
}


function createToggler(divContent) {
    const toggler = document.createElement("a");
    toggler.className = "panel__heading__toggler";
    if (JSON.parse(storage.getItem("upcoming.toggled"))) {
        divContent.classList.add("hidden");
    }
    toggler.title = "Toggle";
    toggler.textContent = "Toggle";
    toggler.href = "#";
    return toggler;
}

function useToggler(divContent) {
    const currentStatus = JSON.parse(storage.getItem("upcoming.toggled"));
    storage.setItem("upcoming.toggled", !currentStatus);
    divContent.classList.toggle("hidden");
}

function getArrowHeaderLink(arrowId, date = null) {
    if (arrowId === "imdb") {
        return {
            text: "[View on imdb.com]",
            url: `https://www.imdb.com/calendar/?region=${getStoredCountryCode()}&type=MOVIE`
        };
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    return {
        text: "[View on dvdsreleasedates.com]",
        url: arrowId === "digital"
            ? `https://www.dvdsreleasedates.com/digital-releases/${year}/${month}/`
            : `https://www.dvdsreleasedates.com/releases/${year}/${month}/`
    };
}

function setArrowCurrentContent(arrowId, divCurrent, label, date = null) {
    const link = getArrowHeaderLink(arrowId, date);
    divCurrent.innerHTML = `
    <strong>${label}</strong>
    <br>
    <a target="_blank" href="${link.url}">${link.text}</a>
  `;
}


function createArrows(arrowId) {
    const divPrevious = createElement("div", `upcoming-arrows-${arrowId}-previous`, "upcoming-arrows-previous");
    const previousLink = document.createElement("a");
    previousLink.href = "#";
    divPrevious.append(previousLink);

    const divNext = createElement("div", `upcoming-arrows-${arrowId}-next`, "upcoming-arrows-next");
    const nextLink = document.createElement("a");
    nextLink.href = "#";
    divNext.append(nextLink);

    const divCurrent = createElement("div", `upcoming-arrows-${arrowId}-current`, "upcoming-arrows-current");

    const currentDate = new Date();

    if (arrowId === "imdb") {
        previousLink.textContent = "< Previous Week";
        nextLink.textContent = "Next Week >";

        const weekExtremes = getWeekExtremes(currentDate);
        const start = weekExtremes.start.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const end = weekExtremes.end.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        divCurrent.setAttribute("data-start", start);
        divCurrent.setAttribute("data-end", end);
        setArrowCurrentContent(arrowId, divCurrent, `${start} - ${end}`);
    } else {
        const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

        previousLink.textContent = `< ${previousDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
        nextLink.textContent = `${nextDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })} >`;

        divCurrent.setAttribute("data-year", currentMonthDate.getFullYear());
        divCurrent.setAttribute("data-month", currentMonthDate.getMonth());

        setArrowCurrentContent(
            arrowId,
            divCurrent,
            currentMonthDate.toLocaleString('en-US', { year: 'numeric', month: 'long' }),
            currentMonthDate
        );
    }

    return [divPrevious, divCurrent, divNext, previousLink, nextLink];
}


function showView(name) {
    document.querySelectorAll(".upcoming-arrows").forEach(arrow => arrow.classList.add("hidden"));

    if (name == "list" || name == "calendar") {
        document.querySelector("#upcoming-arrows-imdb").classList.remove("hidden");
    } else {
        document.querySelector(`#upcoming-arrows-${name}`).classList.remove("hidden");
    }
    document.querySelectorAll("#upcoming-tab-control > a").forEach(tab => tab.classList.remove("simple-tabs__link--active"));
    document.querySelector(`#upcoming-tab-${name}`).classList.add("simple-tabs__link--active");
    document.querySelectorAll("#upcoming > .panel__body").forEach(view => view.classList.add("hidden"));
    document.querySelector(`#upcoming-table-${name}`).classList.remove("hidden");
}


/* -------------------------------
 * DATESPAN
 * ------------------------------- */
async function changeDatespan(event, isIncrease, arrowId, showLoading = true) {
    document.body.style.cursor = "wait";
    if (showLoading) {
        const currentPanel = document.querySelector("#upcoming > div.panel__body:not(.hidden)");
        currentPanel.innerHTML = "";
        currentPanel.append(createLoading(arrowId));
    }

    if (arrowId == "imdb") {
        const extremes = changeDatespanWeek(isIncrease, arrowId);
        loadListAndCalendar(extremes);

    } else if (arrowId === "digital") {
        const [month, year] = changeDatespanMonth(isIncrease, arrowId);
        loadDigital(month, year);

    } else if (arrowId == "physical") {
        const [month, year] = changeDatespanMonth(isIncrease, arrowId);
        loadPhysical(month, year);
    }

    document.body.style.cursor = "default";
}


function changeDatespanMonth(isIncrease, arrowId) {
    const divArrowPrevious = document.querySelector(`#upcoming-arrows-${arrowId}-previous`);
    const divArrowCurrent = document.querySelector(`#upcoming-arrows-${arrowId}-current`);
    const divArrowNext = document.querySelector(`#upcoming-arrows-${arrowId}-next`);

    const currentYear = parseInt(divArrowCurrent.getAttribute("data-year"), 10);
    const currentMonth = parseInt(divArrowCurrent.getAttribute("data-month"), 10);

    const newCurrentDate = new Date(currentYear, currentMonth + (isIncrease ? 1 : -1), 1);
    const newPreviousDate = new Date(newCurrentDate.getFullYear(), newCurrentDate.getMonth() - 1, 1);
    const newNextDate = new Date(newCurrentDate.getFullYear(), newCurrentDate.getMonth() + 1, 1);

    divArrowCurrent.setAttribute("data-year", newCurrentDate.getFullYear());
    divArrowCurrent.setAttribute("data-month", newCurrentDate.getMonth());

    setArrowCurrentContent(
        arrowId,
        divArrowCurrent,
        newCurrentDate.toLocaleString('en-US', { year: 'numeric', month: 'long' }),
        newCurrentDate
    );

    divArrowPrevious.querySelector("a").textContent = `< ${newPreviousDate.toLocaleString('en-US', { year: 'numeric', month: 'long' })}`;
    divArrowNext.querySelector("a").textContent = `${newNextDate.toLocaleString('en-US', { year: 'numeric', month: 'long' })} >`;

    return [newCurrentDate.getMonth(), newCurrentDate.getFullYear()];
}


function changeDatespanWeek(isIncrease, arrowId) {
    const divArrowCurrent = document.querySelector(`#upcoming-arrows-${arrowId}-current`);
    const previousArrow = document.querySelector(`#upcoming-arrows-${arrowId}-previous`);

    var oldDate;
    var newDate;

    if (isIncrease) {
        oldDate = new Date(divArrowCurrent.getAttribute("data-end"));
        newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + 1);
    } else {
        oldDate = new Date(divArrowCurrent.getAttribute("data-start"));
        newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() - 1);
    }

    const extremes = getWeekExtremes(newDate);

    const start = extremes.start.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const end = extremes.end.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    divArrowCurrent.setAttribute("data-start", start);
    divArrowCurrent.setAttribute("data-end", end);
    setArrowCurrentContent(arrowId, divArrowCurrent, `${start} - ${end}`);

    previousArrow.classList.remove("disabled-arrow");

    ["#upcoming-table-list", "#upcoming-table-calendar"].forEach(id => {
        var obj = document.querySelector(id);
        obj.innerHTML = "";
        obj.append(createLoading(arrowId));
    });

    return extremes;
}


/* -------------------------------
 * LIST VIEW
 * ------------------------------- */
function updateMovieListView(movies) {
    const listTable = document.querySelector("#upcoming-table-list");
    listTable.innerHTML = "";

    movies.forEach(movie => {
        var table = createMovieListTable(movie);
        listTable.append(table);
    });
}


function imdbScoreToHTMLPercentage(imdbScore) {
    const score = parseInt(parseFloat(imdbScore) * 10);
    const getColor = score => score >= 70 ? "#66CC33" : score >= 40 ? "#FFCC33" : "#FF0000";

    return `<span style="color: ${getColor(score)}">${score}%</span>`;
}


function createMovieListTable(movie) {
    const imdbUrl = `https://www.imdb.com/title/${movie.imdbId}`;
    const fallbackPosterUrl = movie.imdbId ? imdbUrl : null;
    const posterUrl = getPosterUrl(movie, fallbackPosterUrl);
    const imdbTrailerUrl = `https://www.imdb.com/title/${movie.imdbId}/videogallery`;

    const imdbLink = movie.imdbId
        ? `<a target="_blank" href="${imdbUrl}"><img class="upcoming-table-list-logo" src="https://upload.wikimedia.org/wikipedia/commons/c/cc/IMDb_Logo_Square.svg" alt="IMDb"></a>`
        : "";

    const tmdbUrl = movie.tmdbId
        ? `https://www.themoviedb.org/movie/${movie.tmdbId}`
        : `https://www.themoviedb.org/search?query=${encodeURIComponent(movie.title)}+y:${movie.releaseDate.slice(-4)}`;

    const tmdbLink = `<a target="_blank" href="${tmdbUrl}"><img class="upcoming-table-list-logo" src="https://ptpimg.me/9e6455.png" alt="TMDb"></a>`;

    const letterboxdLink = movie.imdbId
        ? `<a target="_blank" href="https://letterboxd.com/imdb/${movie.imdbId}"><img class="upcoming-table-list-logo" src="https://a.ltrbxd.com/logos/letterboxd-logo-alt-v-neg-rgb.svg" alt="Letterboxd"></a>`
        : "";

    const blurayLink = movie.imdbId
        ? `<a target="_blank" href="https://www.blu-ray.com/search/?quicksearch=1&quicksearch_country=all&quicksearch_keyword=${movie.imdbId}&section=theatrical"><img class="upcoming-table-list-logo" src="https://static.wikia.nocookie.net/logopedia/images/7/7d/Blu-ray_optimized_svg_icon.svg" alt="Blu-ray"></a>`
        : "";

    const genresList = (movie.genres.length > 0)
        ? movie.genres.map(d => `<a class="upcoming-table-list-genres" href="/torrents.php?taglist=${d.toLowerCase()}">${d.toLowerCase()}</a>`).join(", ")
        : "N.A.";

    const directorsList = movie.directors
        ? "by " + movie.directors.map(d => `<strong><a href="/artist.php?artistname=${d}">${d}</a></strong>`).join(", ")
        : "";

    const ratingsLink = `<a target="_blank" href="https://www.imdb.com/title/${movie.imdbId}/ratings">(${movie.imdbVoteCount} votes)</a>`;
    const score = movie.imdbScore ? `<br>IMDb: ${imdbScoreToHTMLPercentage(movie.imdbScore)} ${ratingsLink}` : "";
    const storyline = movie.storyline ? movie.storyline : "";
    const ptpMeta = movie.ptpLinkURL ? `<strong style="color: ${movie.ptpLinkColor}">${movie.ptpLinkText}</strong><br><a href="${movie.ptpLinkURL}">${movie.ptpLinkText2}</a>` : "";

    const coverImage = posterUrl
        ? `<a target="_blank" href="${posterUrl}"><img src="${movie.image}" alt="${movie.title}"></a>`
        : `<img src="${movie.image}" alt="${movie.title}">`;

    const imdbTrailerLink = movie.imdbId
        ? `<a target="_blank" href="${imdbTrailerUrl}">[IMDb trailer]</a> `
        : "";

    const table = document.createElement("table");
    table.innerHTML = `
    <col>
    <col style="width: 75%">
    <col style="width: 25%">
    <tbody>
        <tr>
            <td class="upcoming-table-list-cover" rowspan="2">
                ${coverImage}
            </td>
            <td class="upcoming-table-list-content">
                <strong>${movie.title}</strong> ${directorsList}
                <br>
                Release Date: ${movie.releaseDate}
                <br>
                Genres: ${genresList}
                ${score}
                <br><br>
                ${imdbTrailerLink}<a target="_blank" href="https://www.youtube.com/results?search_query=%22${movie.title}%22 ${movie.releaseDate.slice(-4)} trailer">[YouTube trailer]</a>
            </td>
            <td class="upcoming-table-list-meta">${ptpMeta}
                <br><br>
                ${imdbLink}${tmdbLink}${letterboxdLink}${blurayLink}
            </td>
        </tr>
        <tr>
            <td class="upcoming-table-list-plot" colspan="2">${storyline}</td>
        </tr>
    </tbody>
  `;
    return table;
}


/* -------------------------------
 * CALENDAR VIEW
 * ------------------------------- */
function divideIntoGroupsOfFive(list) {
    var dividedList = [];
    for (var i = 0; i < list.length; i += 5) {
        var group = list.slice(i, i + 5);
        dividedList.push(group);
    }
    return dividedList;
}


function updateAnyCalendarView(id, movies) {
    const calendarTable = document.querySelector(`#upcoming-table-${id}`);
    calendarTable.innerHTML = "";
    const movieGroups = divideIntoGroupsOfFive(movies);

    movieGroups.forEach((movieGroup, index) => {
        var [table, trCovers, trTexts] = createMovieCalendarTable((index === 0) ? true : false);

        movieGroup.forEach(movie => {
            var [tdCover, tdText] = createMovieCalendarItem(id, movie);
            trCovers.append(tdCover);
            trTexts.append(tdText);
        });

        calendarTable.append(table);
    });
}


function createMovieCalendarTable(isFirst) {
    const table = document.createElement("table");
    table.className = "last5-movies__table table--no-border";
    if (!isFirst) {
        table.style = "margin-top: 15px;";
    }
    const tbody = document.createElement("tbody");
    const trCovers = document.createElement("tr");
    const trTexts = document.createElement("tr");
    tbody.append(trCovers, trTexts);
    table.append(tbody);

    return [table, trCovers, trTexts];
}


function createMovieCalendarItem(id, movie) {
    const fallbackCoverLink = (id === "list" || id === "calendar")
        ? `https://www.imdb.com/title/${movie.imdbId}`
        : `https://www.dvdsreleasedates.com/movies/${movie.dvdId}/`;
    const coverLink = getPosterUrl(movie, fallbackCoverLink);

    const tdCover = document.createElement("td");
    tdCover.className = "text--center";
    tdCover.width = "20%";

    const coverImage = document.createElement("a");
    coverImage.className = "last5-movies__link";
    if (coverLink) {
        coverImage.href = coverLink;
    }
    coverImage.setAttribute("target", "_blank");
    coverImage.style = `background-image: url('${movie.image}');`;
    coverImage.title = movie.title;
    tdCover.append(coverImage);

    var ptpAvailabilityLink;
    if (storage.getItem("upcoming.availability-indicator") === "icon") {
        ptpAvailabilityLink = `<a class="username" href="${movie.ptpLinkURL}">${movie.ptpLinkIcon} ${movie.ptpLinkText2}</a>`;
    } else {
        ptpAvailabilityLink = `<a class="username" style="color: ${movie.ptpLinkColor}" href="${movie.ptpLinkURL}">${movie.ptpLinkText2}</a>`;
    }
    movie.ptpLinkURL === undefined ? ptpAvailabilityLink = "" : ptpAvailabilityLink;

    const dvdPhysicalReleaseType = (id === "physical" && movie.formats?.length)
        ? `<div><span style="opacity: 0.3">(${movie.formats.join(", ")})</span></div>`
        : "";

    const tdText = document.createElement("td");
    tdText.className = "text--center";
    tdText.innerHTML = `<div class="time">${movie.releaseDate}</div>${dvdPhysicalReleaseType}<div>${ptpAvailabilityLink}</div>`;

    return [tdCover, tdText];
}

/* -------------------------------
 * MANAGING DATA
 * ------------------------------- */
function findDataWithinExtremes(allData, extremes) {
    const data = [];

    allData.forEach(d => {
        const date = new Date(d.date);
        if (date >= extremes.start && date <= extremes.end) {
            data.push(d);
        }
    });

    return data;
}


async function getPtpLinkMeta(imdbId) {
    const ptpLink = await getPtpLink(imdbId);

    if (ptpLink) {
        return {
            imdbId: imdbId,
            link: ptpLink,
            color: "green",
            text: "Available on PTP",
            text2: "[View group]",
            icon: "🟢",
            url: ptpLink
        };
    } else {
        return {
            imdbId: imdbId,
            link: ptpLink,
            color: "red",
            text: "Missing from PTP",
            text2: "[Search requests]",
            icon: "🔴",
            url: `/requests.php?search=${imdbId}`
        };
    }
}


async function updateWithPtpMeta(ptp, movie) {
    movie.ptpLink = ptp.link;
    movie.ptpLinkColor = ptp.color;
    movie.ptpLinkText = ptp.text;
    movie.ptpLinkText2 = ptp.text2;
    movie.ptpLinkIcon = ptp.icon;
    movie.ptpLinkURL = ptp.url;
    return movie;
}


async function getMoviesWithInfo(data) {
    const savedCalendarData = JSON.parse(storage.getItem("upcoming.imdb-calendar"));
    const movieMap = savedCalendarData?.movieMap || {};
    var movies = [];
    var i = 0;
    var n = data.reduce((acc, obj) => acc + obj.movieIds.length, 0);

    for (const obj of data) {
        for (const imdbId of obj.movieIds) {
            i++;
            updateLoading("imdb", `Loading (${i}/${n})...`);

            const imdbPageData = await retrieveImdbPageData(imdbId);
            const countryMovieData = movieMap[imdbId] ? { ...movieMap[imdbId] } : null;
            var movie = null;

            if (countryMovieData) {
                movie = {
                    ...(imdbPageData || {}),
                    ...countryMovieData,
                    tmdbId: countryMovieData.tmdbId || imdbPageData?.tmdbId || null,
                    letterboxdId: countryMovieData.letterboxdId || imdbPageData?.letterboxdId || null
                };
            } else if (imdbPageData) {
                movie = { ...imdbPageData };
            }

            if (!movie) {
                console.warn(`Missing IMDb movie data for ${imdbId}. Refresh the IMDb calendar cache to recover this entry.`);
                continue;
            }

            if (!movie.tmdbId) {
                movie.tmdbId = await getTmdbId(imdbId);
            }

            await storeImdbPageData(movie);  // Keep local enrichment tied to fresh country-specific IMDb fields

            movies.push(movie);
        }
    }

    return movies;
}


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateMoviesWithPtpMeta(viewId, movies) {
    const n = movies.length;
    const delayMs = 2500; // 2.5 second delay between requests to avoid rate limiting
    for (let i = 0; i < n; i++) {
        updateLoading(viewId, `Checking (${i + 1}/${n})...`);
        const ptpMeta = await retrievePtpMeta(movies[i].imdbId);
        var ptp;

        if (!ptpMeta) {
            ptp = await getPtpLinkMeta(movies[i].imdbId); // Request
            await storePtpMeta(ptp); // Store
            await sleep(delayMs); // Delay to avoid rate limiting
        } else {
            ptp = ptpMeta;
        }

        updateWithPtpMeta(ptp, movies[i]);
    }

    return movies;
}


async function getDvdData(viewId, month, year) {
    const dateId = `${year}-${month.toString().padStart(2, '0')}`;
    var storedData;
    var data;

    const funcs = {
        physical: {
            retrieve: retrieveDvdPhysicalData,
            store: storeDvdPhysicalData,
            get: getDvdPhysicalReleasesData
        },
        digital: {
            retrieve: retrieveDvdDigitalData,
            store: storeDvdDigitalData,
            get: getDvdDigitalReleasesData
        }
    };

    const func = funcs[viewId];
    storedData = await func.retrieve(dateId);

    if (!storedData) {
        data = await func.get(month, year);  // Request
        data.dateId = dateId;  // Adds ID
        await func.store(data);
    } else {
        data = storedData;
    }

    return data;
}


/* -------------------------------
 * LOADING DATA
 * ------------------------------- */
async function loadDigital(month, year) {
    return await loadDvd("digital", month, year);
}


async function loadPhysical(month, year) {
    return await loadDvd("physical", month, year);
}


async function loadDvd(viewId, month, year) {
    var dvdMovies = await getDvdData(viewId, month, year);  // Cached
    dvdMovies = await updateMoviesWithPtpMeta(viewId, dvdMovies);  // Cached
    (dvdMovies.length > 0) ? updateAnyCalendarView(viewId, dvdMovies) : updateLoadingFail(viewId);
}


async function loadListAndCalendar(extremes, isFirstRun = false) {
    const viewId = "imdb";
    const imdbData = await loadImdbCalendar();  // Cached
    const data = findDataWithinExtremes(imdbData, extremes);

    if (data.length < 1) {
        if (!isFirstRun) {
            return updateLoadingFail(viewId);
        } else {
            return await changeDatespan(null, true, viewId, false);
        }
    }
    var movies = await getMoviesWithInfo(data);  // Cached
    movies = await updateMoviesWithPtpMeta(viewId, movies);  // Cached
    updateMovieListView(movies);
    updateAnyCalendarView("calendar", movies);
}


async function loadImdbCalendar() {
    const savedData = JSON.parse(storage.getItem("upcoming.imdb-calendar"));
    const cutoff = getImdbCacheTtlHours();
    const activeCountryCode = getStoredCountryCode();
    var imdbData;

    updateLoading("imdb", "IMDb: checking cached calendar...");

    // Determine if we need a refresh: either no lastUpdate (first run / cleared),
    // the country changed, or the cached data has expired past the cutoff.
    let needsRefresh = true;
    if (
        savedData
        && savedData.country === activeCountryCode
        && savedData.lastUpdate
        && Array.isArray(savedData.data)
        && savedData.movieMap
    ) {
        const hasCalendarRows = savedData.data.length > 0;
        const hasMovieEntries = Object.keys(savedData.movieMap).length > 0;
        const maxCachedDate = hasCalendarRows
            ? savedData.data.reduce((latest, entry) => {
                if (!entry?.date) {
                    return latest;
                }
                return !latest || entry.date > latest ? entry.date : latest;
            }, null)
            : null;
        const todayDateValue = getImdbDateValue(getImdbDateStringParts(new Date()));
        const cacheStillCoversCurrentWindow = Boolean(maxCachedDate && todayDateValue && maxCachedDate >= todayDateValue);
        const hoursDifference = (new Date() - new Date(savedData.lastUpdate)) / (1000 * 60 * 60);
        if (!isNaN(hoursDifference) && hoursDifference <= cutoff && hasCalendarRows && hasMovieEntries && cacheStillCoversCurrentWindow) {
            needsRefresh = false;
        }
    }

    if (needsRefresh) {
        console.info("Refreshing calendar data...");
        updateLoading("imdb", `IMDb: refreshing for ${activeCountryCode}...`);
        const refreshedData = await fetchImdbComingSoonData((statusText) => updateLoading("imdb", statusText));
        imdbData = refreshedData.calendarData;
        const newSavedData = {
            country: activeCountryCode,
            data: imdbData,
            movieMap: refreshedData.movieMap,
            lastUpdate: new Date()
        };
        storage.setItem("upcoming.imdb-calendar", JSON.stringify(newSavedData));
    } else {
        console.info("Loading saved calendar data...");
        updateLoading("imdb", "IMDb: using cached calendar data...");
        imdbData = savedData.data;
    }
    return imdbData;
}


/* -------------------------------
 * MAIN
 * ------------------------------- */
async function main() {
    const defaultTabSetting = storage.getItem("upcoming.default-tab");
    const enabledTabsSetting = JSON.parse(storage.getItem("upcoming.enabled-tabs"));
    const navbarLocationSetting = storage.getItem("upcoming.navbar-location");

    addBox(defaultTabSetting, enabledTabsSetting, navbarLocationSetting);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    if (enabledTabsSetting.includes("digital")) {
        loadDigital(currentMonth, currentYear);
    }
    if (enabledTabsSetting.includes("physical")) {
        loadPhysical(currentMonth, currentYear);
    }
    if (enabledTabsSetting.includes("list") || enabledTabsSetting.includes("calendar")) {
        const extremes = getWeekExtremes(currentDate);
        loadListAndCalendar(extremes, true);
    }
}