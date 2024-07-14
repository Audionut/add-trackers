// ==UserScript==
// @name         PTP Cross-Seed Checker
// @version      0.1.3
// @author       Ignacio (additions by Audionut)
// @description  Find cross-seedable and add cross-seed markers to non-ptp releases
// @match        https://passthepopcorn.me/torrents.php*
// @icon         https://passthepopcorn.me/favicon.ico
// downloadURL   https://github.com/Audionut/add-trackers/raw/main/ptp-cross-seed-checker.user.js
// updateURL     https://github.com/Audionut/add-trackers/raw/main/ptp-cross-seed-checker.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let dnum = GM_getValue('dnumlimit', 5); // Size tolerance
    let pnum = GM_getValue('pnumlimit', 10);
    let size = GM_getValue('rowhtsize', 8); // Empty row height
    let pcs = GM_getValue('pcscheckbox', true); // Optional partial cross-seedable releases recognition
    let others = GM_getValue('secondPassCheckbox', false);

    let defaultdnum = 5;
    let defaultpnum = 10;
    let defaultsize = 8;
    let defaultpcs = true;
    let defaultsecond = false;

function releasenameparser(name) {
    var EventEmitter = function() {
        this.events = {};
    };

    EventEmitter.prototype.on = function(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    };

    EventEmitter.prototype.emit = function(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(function(listener) {
                listener(data);
            });
        }
    };

    var Core = function() {
        EventEmitter.call(this);
        var parts;
        this.getParts = function() {
            return parts;
        };
        this.on('setup', function() {
            parts = {};
        });
        this.on('part', function(part) {
            parts[part.name] = part.clean;
        });
    };

    Core.prototype = Object.create(EventEmitter.prototype);
    Core.prototype.constructor = EventEmitter;
    Core.prototype.exec = function(name) {
        this.emit('setup', { name: name });
        this.emit('start');
        this.emit('end');
        return this.getParts();
    };

    var core = new Core();

    var patterns = {
        season: /([Ss]?([0-9]{1,2}))[Eex]|((?<=[\.\- ])[Ss]{1}([0-9]{1,2})(?=[\.\- ]))/,
        episode: /([Eex]{1}([0-9]{2})(?:[^0-9]|$))/,
        format: /NTSC|PAL|SECAM/,
        year: /([\[\(]?((?:19[0-9]|20[012])[0-9])[\]\)]?)/,
        resolution: /(?:\.|^)([0-9]{3,4}p)(?:\.|$)[^M]/,
        quality: /(?:PPV.)?[HP]DTV|(?:HD)?CAM|B[rR]Rip|(?:PPV )?WEB-?DL(?: DVDRip)?|TS|H[dD]Rip|DVDRip|DVDRiP|DVDRIP|DVD[.\- ]?(?:5|9|10)?|CamRip|W[EB]B[rR]ip|WEB|[Bb]lu[Rr]ay|DvDScr|hdtv/,
        codec: /xvid|x264|x265|h.?264|AVC/i,
        audio: /MP3|DDP?[+\.]?[57].?1|DD2.?0|Dual[- ]Audio|LiNE|DTS(?:[.\- ]?)?(?:[Hh][Dd][.\- ]?)?(?:[Mm][Aa][.\- ]?)?(?:[567].1)?|AAC(?:.?2.0)?|FLAC(?:.?2.0)?|AC3(?:.5.1)?|(?:True[Hh][Dd].)?Atmos[. ]?(?:[579]\.1)?/,
        transcoding: /REMUX/i,
        region: /R[0-9]/,
        extended: /EXTENDED/,
        hardcoded: /HC/,
        proper: /PROPER/,
        repack: /REPACK/,
        widescreen: /WS/,
        website: /^(\[ ?([^\]]+?) ?\])/,
        language: /rus.eng|FRENCH|RUSSIAN|SPANISH|JAPANESE|ENGLISH|KOREAN|PORTUGUESE|SWEDISH|VIETNAMESE|FINNISH|GERMAN|CHINESE|DANISH|ITALIAN/,
        platform: /DSNP|AMZN|NF|HMAX|CRITERION/,
        garbage: /1400Mb|3rd Nov| ((Rip))/,
        sub: /ENGSUB/,
    };

    var types = {
        season: 'integer',
        episode: 'integer',
        year: 'integer',
        extended: 'boolean',
        hardcoded: 'boolean',
        proper: 'boolean',
        repack: 'boolean',
        widescreen: 'boolean'
    };

    var torrent;

    core.on('setup', function(data) {
        torrent = data;
    });

    core.on('start', function() {
        var key, match, index, clean, part;
        for (key in patterns) {
            if (!(match = torrent.name.match(patterns[key]))) {
                continue;
            }
            index = {
                raw: match[1] ? 1 : 0,
                clean: match[1] ? 2 : 0
            };
            if (types[key] && types[key] === 'boolean') {
                clean = true;
            } else {
                clean = match[index.clean];
                if (types[key] && types[key] === 'integer') {
                    if (key === 'season' && clean[0].match(/[Ss]/)) {
                        clean = clean.slice(1);
                    }
                    clean = parseInt(clean, 10);
                }
            }
            part = {
                name: key,
                match: match,
                raw: match[index.raw],
                clean: clean
            };
            if (key === 'episode') {
                core.emit('map', torrent.name.replace(part.raw, '{episode}'));
            }
            core.emit('part', part);
        }
        core.emit('common');
    });

    core.on('late', function(part) {
        if (part.name === 'episodeName') {
            part.clean = part.clean.replace(/[\._]/g, ' ');
            part.clean = part.clean.replace(/_+$/, '').trim();
            core.emit('part', part);
        }
    });

    core.on('common', function() {
        var raw = torrent.name.replace(/\.mkv$/, ''); // Remove .mkv extension if present
        var clean = raw.replace(/^ -/, '');
        if (clean.indexOf(' ') === -1 && clean.indexOf('.') !== -1) {
            clean = clean.replace(/\./g, ' ');
        }
        clean = clean.replace(/_/g, ' ');
        clean = clean.replace(/([\(_]|- )$/, '').trim();
        core.emit('part', {
            name: 'title',
            raw: raw,
            clean: clean
        });
    });

    return core.exec(name);
}

function settingsmenu() {
    const showMarkers = GM_getValue('showMarkers', true);

    const settingsDialog = document.createElement('div');
    settingsDialog.id = 'cs_settingsDialog';
    settingsDialog.innerHTML = `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; background: #f5f5f5; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); max-width: 400px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-weight: bold; color: #333; text-decoration: underline;">Settings</h2>
            <button id="cs_closeSettings" style="background: none; border: none; font-size: 20px; color: darkred; cursor: pointer;">&times;</button>
        </div>
        <div style="display: flex; flex-direction: column;">
            <div style="display: flex; flex-direction: row; margin-bottom: 10px; justify-content: space-between;">
                <label for="dnumLimit" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Tolerance Size limit (MiB) TCS:</label>
                <input type="number" id="dnumLimit" value="${dnum}" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 125px;">
            </div>
            <div style="display: flex; flex-direction: row; margin-bottom: 10px; justify-content: space-between;">
                <label for="pnumLimit" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Tolerance Size limit (MiB) PCS:</label>
                <input type="number" id="pnumLimit" value="${pnum}" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 125px;">
            </div>
            <div style="display: flex; flex-direction: row; margin-bottom: 10px; justify-content: space-between;">
                <label for="rowhtSize" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Empty Row Height (px):</label>
                <input type="number" id="rowhtSize" value="${size}" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 125px;">
            </div>
            <div style="display: flex; flex-direction: row; margin-bottom: 10px;">
                <label for="pcsCheckbox" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Show Partial Cross-Seedable:</label>
                <input type="checkbox" id="pcsCheckbox" ${pcs ? 'checked' : ''} style="align-self: center;">
            </div>
            <div style="display: flex; flex-direction: row; margin-bottom: 10px;">
                <label for="secondPassCheckbox" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Match remaining releases from other trackers:</label>
                <input type="checkbox" id="secondPassCheckbox" ${GM_getValue('secondPassCheckbox', true) ? 'checked' : ''} style="align-self: center;">
            </div>
            <div style="display: flex; flex-direction: row; margin-bottom: 10px;">
                <label for="showMarkers" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Show Cross-Seeding Markers:</label>
                <input type="checkbox" id="showMarkers" ${showMarkers ? 'checked' : ''} style="align-self: center;">
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <button id="cs_resetSettings" style="background-color: #FF5733; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Reset</button>
            <button id="cs_saveSettings" style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Save</button>
        </div>
    </div>
    `;

    document.body.appendChild(settingsDialog);

    document.getElementById('cs_resetSettings').addEventListener('click', function() {
        document.getElementById('dnumLimit').value = dnum;
        document.getElementById('pnumLimit').value = pnum;
        document.getElementById('rowhtSize').value = size;
        document.getElementById('pcsCheckbox').checked = pcs;
        document.getElementById('secondPassCheckbox').checked = others;
        document.getElementById('showMarkers').checked = true;

        GM_setValue('dnumlimit', defaultdnum);
        GM_setValue('pnumlimit', defaultpnum);
        GM_setValue('rowhtsize', defaultsize);
        GM_setValue('pcscheckbox', defaultpcs);
        GM_setValue('secondPassCheckbox', defaultsecond);
        GM_setValue('showMarkers', true);

        alert('Settings reset to defaults and saved successfully!');

        document.getElementById('cs_settingsDialog').style.display = 'none';
    });

    document.getElementById('cs_saveSettings').addEventListener('click', function() {
        const newDnumLimit = parseInt(document.getElementById('dnumLimit').value, 10);
        const newPnumLimit = parseInt(document.getElementById('pnumLimit').value, 10);
        const newRowhtSize = parseInt(document.getElementById('rowhtSize').value, 10);
        const newPcsCheckbox = document.getElementById('pcsCheckbox').checked;
        const newSecondPassCheckbox = document.getElementById('secondPassCheckbox').checked;
        const newShowMarkers = document.getElementById('showMarkers').checked;

        dnum = newDnumLimit;
        pnum = newPnumLimit;
        size = newRowhtSize;
        pcs = newPcsCheckbox;

        GM_setValue('dnumlimit', newDnumLimit);
        GM_setValue('pnumlimit', newPnumLimit);
        GM_setValue('rowhtsize', newRowhtSize);
        GM_setValue('pcscheckbox', newPcsCheckbox);
        GM_setValue('secondPassCheckbox', newSecondPassCheckbox);
        GM_setValue('showMarkers', newShowMarkers);

        alert('Settings saved successfully!');

        document.getElementById('cs_settingsDialog').style.display = 'none';
    });

    document.getElementById('cs_closeSettings').addEventListener('click', function() {
        settingsDialog.style.display = 'none';
    });
}

GM_registerMenuCommand('Open Settings', function() {
    let settingsDialog = document.getElementById('cs_settingsDialog');
    if (!settingsDialog) {
        settingsmenu();
        settingsDialog = document.getElementById('cs_settingsDialog');
    }
    settingsDialog.style.display = 'block';
});

function rowSorter(pcs = false, dnum, pnum) {
    return new Promise((resolve, reject) => {
        try {
            const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
            const regex = /ptp_\d+/;
            const { ptpRows, otherRows } = classifyRows(allRows, regex);
            const ptpRowsData = parsePtpRowsData(ptpRows);
            const otherRowsData = parseOtherRowsData(otherRows);
            const unmatchedRows = matchRows(ptpRows, ptpRowsData, otherRowsData, pcs, dnum, pnum);

            if (GM_getValue('secondPassCheckbox', true)) {
                return unmatchedPass(unmatchedRows, dnum).then(resolve).catch(reject);
            } else {
                resolve();
            }
        } catch (error) {
            reject("Error in row sorter: " + error);
        }
    });
}

function classifyRows(rows, regex) {
    const ptpRows = [];
    const otherRows = [];

    rows.forEach(row => {
        if (Array.from(row.classList).some(className => regex.test(className))) {
            ptpRows.push(row);
        } else {
            otherRows.push(row);
        }
    });

    return { ptpRows, otherRows };
}

function parsePtpRowsData(ptpRows) {
    const data = Array.from(ptpRows).map(row => {
        const group = row.getAttribute('data-releasegroup') || '';
        const rawName = row.getAttribute('data-releasename') || '';
        const normalizedName = rawName.replace(/\./g, ' ');
        const parsedName = releasenameparser(normalizedName) || {};
        const sizeEl = row.querySelector('.nobr span[title]');
        const rawSize = sizeEl ? sizeEl.getAttribute('title') : '';
        const size = rawSize ? parseInt(rawSize.replace(/[^0-9]/g, '')) : 0;
        const { pl, dl } = actionElsparser(row);
        return { group, size, pl, dl, rawName, parsedName };
    });

    return data;
}

    function actionElsparser(row) {
        const actionSpan = row.querySelector('.basic-movie-list__torrent__action');
        const plEl = actionSpan ? actionSpan.querySelector('a[title="Permalink"]') : null;
        const pl = plEl ? plEl.getAttribute('href') : '';
        const dlEl = actionSpan ? actionSpan.querySelector('a[title="Download"]') : null;
        const dl = dlEl ? dlEl.getAttribute('href') : '';
        return { pl, dl };
    }

function parseOtherRowsData(otherRows) {
    const data = Array.from(otherRows).map(row => {
        const rawGroup = row.getAttribute('data-releasegroup') || '';
        const rawName = row.getAttribute('data-releasename') || '';
        const parsedName = releasenameparser(rawName) || {};
        const sizeEl = row.querySelector('.nobr .size-span');
        const rawSize = sizeEl ? sizeEl.getAttribute('title') : '';
        const size = rawSize ? parseInt(rawSize.replace(/[^0-9]/g, '')) : 0;
        const classList = Array.from(row.classList);
        const classid = classList.length > 0 ? classList[classList.length - 1] : '';
        return { group: rawGroup, size, classid, rawName, parsedName };
    });

    return data;
}

function matchRows(ptpRows, ptpRowsData, otherRowsData, enablePCS, dnum, pnum) {
    const unmatchedRows = [];
    const showMarkers = GM_getValue('showMarkers', true);

    otherRowsData.forEach(otherRow => {
        const matchingPTPRow = TCSfinder(ptpRowsData, otherRow, dnum);

        if (matchingPTPRow) {
            const otherRowElement = document.querySelector(`.${otherRow.classid}`);
            otherRowElement.classList.add('tcs-matched');
            otherRowElement.setAttribute('data-pl-href', matchingPTPRow.pl); // Add the href attribute
            if (showMarkers) {
                const tcsLink = createLink('TCS', matchingPTPRow.pl, 'Total Cross-Seed compatibility - Identical Release', 'greenyellow');
                const infoLink = createInfoLink();
                actionSpnupdater(otherRow, tcsLink, infoLink);
                infoLinklistener(infoLink, ptpRows, matchingPTPRow);
            }
        } else if (enablePCS && otherRow.size) {
            const matchingPTPRowPCS = PCSfinder(ptpRowsData, otherRow, pnum);

            if (matchingPTPRowPCS) {
                const otherRowElement = document.querySelector(`.${otherRow.classid}`);
                otherRowElement.classList.add('pcs-matched');
                otherRowElement.setAttribute('data-pl-href', matchingPTPRowPCS.pl); // Add the href attribute
                if (showMarkers) {
                    const pcsLink = createLink('PCS', matchingPTPRowPCS.pl, 'Partial Cross-Seed compatibility - Re-verify File/Folder Structure', 'orange');
                    const infoLinkPCS = createInfoLink();
                    actionSpnupdater(otherRow, pcsLink, infoLinkPCS);
                    infoLinklistener(infoLinkPCS, ptpRows, matchingPTPRowPCS);
                }
            } else {
                unmatchedRows.push(otherRow);
            }
        } else {
            unmatchedRows.push(otherRow);
        }
    });
    return unmatchedRows;
}

function unmatchedPass(unmatchedRows, dnum) {
    const showMarkers = GM_getValue('showMarkers', true);

    return new Promise((resolve, reject) => {
        try {
            unmatchedRows.forEach((otherRow, index) => {
                for (let i = index + 1; i < unmatchedRows.length; i++) {
                    const otherRowToCompare = unmatchedRows[i];
                    const matchingOtherRow = TCSfinder([otherRow], otherRowToCompare, dnum);

                    if (matchingOtherRow) {
                        if (showMarkers) {
                            const tcsLink = createLink('TCS', '#', 'Total Cross-Seed compatibility - Identical Release', 'greenyellow');
                            const infoLink = createInfoLink('Other');
                            actionSpnupdater(otherRowToCompare, tcsLink, infoLink);
                            infoLinklistener(infoLink, unmatchedRows, matchingOtherRow);
                        }
                        // Always add matched row to rowsWithTCS
                        matchingOtherRow.tcs = true;
                        break;
                    }
                }
            });
            resolve();
        } catch (error) {
            reject("Error in unmatched pass: " + error);
        }
    });
}

function TCSfinder(ptpRowsData, otherRow, num) {
    const toleranceBytes = num * 1024 * 1024;

    // Prioritize exact size and group match
    const exactMatch = ptpRowsData.find(ptpRow => {
        const match = ptpRow.size === otherRow.size && ptpRow.group.toLowerCase() === otherRow.group.toLowerCase();
        const match1 = ptpRow.size === otherRow.size && ptpRow.rawName.toLowerCase() === otherRow.rawName.toLowerCase();
        return match || match1;
    });

    if (exactMatch) {
        return exactMatch;
    }

    // Fallback to within tolerance size match
    const toleranceMatch = ptpRowsData.find(ptpRow => {
        const match = ptpRow.group.toLowerCase() === otherRow.group.toLowerCase() && Math.abs(ptpRow.size - otherRow.size) <= toleranceBytes;
        const match1 = ptpRow.rawName.toLowerCase() === otherRow.rawName.toLowerCase() && Math.abs(ptpRow.size - otherRow.size) <= toleranceBytes;
        return match || match1;
    });

    return toleranceMatch;
}

function PCSfinder(ptpRowsData, otherRow, pnum, dnum) {
    const toleranceBytes = pnum * 1024 * 1024; // Convert MiB to bytes
    const exactToleranceBytes = dnum * 1024 * 1024; // Convert dnum to bytes for exact size match check

    if (otherRow.rawName.includes("Audio Only Track")) {
        return null;
    }

    const otherRowTitle = normalizeTitle(otherRow.parsedName.title || "");
    const otherRowResolution = otherRow.parsedName.resolution || "";
    const otherRowHasDV = otherRowTitle.includes("DV");
    const otherRowHasHDR = /HDR/i.test(otherRowTitle);
    const otherRowHas3D = otherRowTitle.includes("3D");

    // Prioritize exact size match or rawName match
    const exactMatch = ptpRowsData.find(ptpRow => {
        const ptpRowTitle = normalizeTitle(ptpRow.parsedName.title || "");
        const ptpRowResolution = ptpRow.parsedName.resolution || "";
        const ptpRowHasDV = ptpRowTitle.includes("DV");
        const ptpRowHasHDR = /HDR/i.test(ptpRowTitle);
        const match = (ptpRow.size === otherRow.size) ||
                      (ptpRow.rawName.toLowerCase() === otherRow.rawName.toLowerCase());
        return match;
    });

    if (exactMatch) {
        return exactMatch;
    }

    // Fallback to within tolerance size match with additional checks
    const toleranceMatch = ptpRowsData.find(ptpRow => {
        const ptpRowTitle = normalizeTitle(ptpRow.parsedName.title || "");
        const ptpRowResolution = ptpRow.parsedName.resolution || "";
        const ptpRowHasDV = ptpRowTitle.includes("DV");
        const ptpRowHasHDR = /HDR/i.test(ptpRowTitle);
        const ptpRowHas3D = ptpRowTitle.includes("3D");
        const sizeDifference = Math.abs(ptpRow.size - otherRow.size);
        const match = (otherRow.group.length === 0 || ptpRow.group.toLowerCase() === otherRow.group.toLowerCase()) &&
                      ptpRowResolution === otherRowResolution &&
                      sizeDifference <= toleranceBytes && // Size within PCS tolerance
                      !(ptpRow.group.toLowerCase() === otherRow.group.toLowerCase() && sizeDifference <= exactToleranceBytes) && // Ensure not a TCS match
                      otherRowHasDV === ptpRowHasDV &&
                      otherRowHas3D === ptpRowHas3D &&
                      otherRowHasHDR === ptpRowHasHDR &&
                      ptpRowTitle === otherRowTitle;
        return match;
    });
    return toleranceMatch;
}

    function normalizeTitle(title) {
        // Define a set of common container formats to be removed
        const containers = ["mkv", "avi", "mp4", "mov", "m2ts"];
        containers.forEach(container => {
            const regex = new RegExp(`\\b${container}\\b`, 'gi');
            title = title.replace(regex, '');
        });
        return title.replace(/[\.\-_]/g, ' ').toLowerCase().trim();
    }

    function createLink(text, href, title, color) {
        const link = document.createElement('a');
        link.href = href;
        link.className = 'link_2';
        link.title = title;
        link.textContent = text;
        link.style.color = color;
        link.style.textShadow = '0 0 5px ' + color;
        return link;
    }

    function createInfoLink(text = 'INFO') {
        const infoLink = document.createElement('a');
        infoLink.href = '#';
        infoLink.className = 'link_4';
        infoLink.textContent = text;
        infoLink.style.color = '#ff1493';
        infoLink.style.textShadow = '0 0 5px #ff1493';
        return infoLink;
    }

    function createOtherLink() {
        const infoLink = document.createElement('a');
        infoLink.href = '#';
        infoLink.className = 'link_4';
        infoLink.textContent = 'Other';
        infoLink.style.color = '#ff1493';
        infoLink.style.textShadow = '0 0 5px #ff1493';
        return infoLink;
    }

    function actionSpnupdater(otherRow, mainLink, infoLink) {
        const otherRowElement = document.querySelector(`.${otherRow.classid}`);
        const existingActionSpan = otherRowElement ? otherRowElement.querySelector('.basic-movie-list__torrent__action') : null;

        if (existingActionSpan) {
            const existingLinks = Array.from(existingActionSpan.querySelectorAll('a'));
            const mainLinkExists = existingLinks.some(link => link.href === mainLink.href);

            if (!mainLinkExists) {
                const existingDownloadLink = existingActionSpan.querySelector('a[title="Download"]');
                if (existingDownloadLink) {
                    existingActionSpan.removeChild(existingActionSpan.lastChild);
                    existingActionSpan.appendChild(document.createTextNode('| '));
                    existingActionSpan.appendChild(mainLink);
                    existingActionSpan.appendChild(document.createTextNode(' | '));
                    existingActionSpan.appendChild(infoLink);
                    existingActionSpan.appendChild(document.createTextNode(' ]'));
                }
            }
        }
    }

    function infoLinklistener(infoLink, ptpRows) {
        infoLink.addEventListener('click', function(event) {
            event.preventDefault();
            const linkHref = this.parentNode.querySelector('a.link_2').href;
            const ptpRow = ptpRows.find(row => {
                const plAnc = row.querySelector('a[title="Permalink"]');
                return plAnc && plAnc.href === linkHref;
            });
            if (ptpRow) {
                const infoAnc = ptpRow.querySelector('.torrent-info-link');
                if (infoAnc) {
                    infoAnc.click();
                    this.focus();
                }
            }
        });
    }

    function rearranger(size) {
        const showMarkers = GM_getValue('showMarkers', true);
        let spx = `${size}px`;
    
        return new Promise((resolve, reject) => {
            try {
                function getMatchedRows(matchedClass) {
                    const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
                    return Array.from(allRows).filter(row => row.classList.contains(matchedClass));
                }
    
                function getRowsWithPLAnchors() {
                    const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
                    return Array.from(allRows).filter(row => {
                        const plAnchor = row.querySelector('a[title="Permalink"]');
                        return plAnchor !== null;
                    });
                }
    
                const rowsWithTCS = getMatchedRows('tcs-matched');
                const rowsWithPCS = getMatchedRows('pcs-matched');
                const rowsWithPLAnchors = getRowsWithPLAnchors();
    
                rowsWithPLAnchors.forEach(plRow => {
    
                    const plAnchor = plRow.querySelector('a[title="Permalink"]');
                    if (plAnchor) {
                        const plHref = plAnchor.getAttribute('href');
                        const matchingTCSRows = rowsWithTCS.filter(tcsRow => {
                            const tcsAnchor = tcsRow.getAttribute('data-pl-href');
                            return tcsAnchor === plHref;
                        });
                        const matchingPCSRows = rowsWithPCS.filter(pcsRow => {
                            const pcsAnchor = pcsRow.getAttribute('data-pl-href');
                            return pcsAnchor === plHref;
                        });
    
                        const combinedRows = [...matchingTCSRows, ...matchingPCSRows]; // TCS rows first, then PCS rows
    
                        if (combinedRows.length > 0) {
                            let emptyRowAbovePl = plRow.previousElementSibling;
                            if (!emptyRowAbovePl || !emptyRowAbovePl.classList.contains('empty-row')) {
                                emptyRowAbovePl = document.createElement('tr');
                                emptyRowAbovePl.className = 'empty-row';
                                emptyRowAbovePl.style.height = spx;
                                plRow.parentNode.insertBefore(emptyRowAbovePl, plRow);
                            }
    
                            let lastInsertedRow = plRow;
                            combinedRows.forEach(combinedRow => {
                                lastInsertedRow.parentNode.insertBefore(combinedRow, lastInsertedRow.nextSibling);
                                lastInsertedRow = combinedRow;
                            });
    
                            const emptyRowAfterCombined = lastInsertedRow.nextElementSibling;
                            if (!emptyRowAfterCombined || !emptyRowAfterCombined.classList.contains('empty-row')) {
                                const emptyRow = document.createElement('tr');
                                emptyRow.className = 'empty-row';
                                emptyRow.style.height = spx;
                                lastInsertedRow.parentNode.insertBefore(emptyRow, lastInsertedRow.nextSibling);
                            }
                        }
    
                        if (!showMarkers) {
                            let emptyRowAbovePl = plRow.previousElementSibling;
                            if (!emptyRowAbovePl || !emptyRowAbovePl.classList.contains('empty-row')) {
                                emptyRowAbovePl = document.createElement('tr');
                                emptyRowAbovePl.className = 'empty-row';
                                emptyRowAbovePl.style.height = spx;
                                plRow.parentNode.insertBefore(emptyRowAbovePl, plRow);
                            }
                        }
                    }
                });
    
                if (!showMarkers) {
                    const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
                    const groupedByHref = {};
    
                    allRows.forEach(row => {
                        const plAnchor = row.querySelector('a[title="Permalink"]');
                        if (plAnchor) {
                            const plHref = plAnchor.getAttribute('href');
                            if (!groupedByHref[plHref]) {
                                groupedByHref[plHref] = [];
                            }
                            groupedByHref[plHref].push(row);
                        }
                    });
    
                    Object.values(groupedByHref).forEach(group => {
                        if (group.length > 1) {
                            group.forEach((row, index) => {
                                if (index === 0) return;
                                group[0].parentNode.insertBefore(row, group[0].nextSibling);
                            });
                            const lastRow = group[group.length - 1];
                            const emptyRowAfterGroup = lastRow.nextElementSibling;
                            if (!emptyRowAfterGroup || !emptyRowAfterGroup.classList.contains('empty-row')) {
                                const emptyRow = document.createElement('tr');
                                emptyRow.className = 'empty-row';
                                emptyRow.style.height = spx;
                                lastRow.parentNode.insertBefore(emptyRow, lastRow.nextSibling);
                            }
                        }
                    });
                }
    
                resolve();
            } catch (error) {
                console.error('Error in rearranger:', error);
                reject("Error in rearranger: " + error);
            }
        });
    }
    
    function cleaner() {
        return new Promise((resolve, reject) => {
            try {
                const allRows = document.querySelectorAll('.torrent_table tr');
    
                const featureFilmRows = Array.from(allRows).filter(row => {
                    const spanElements = row.querySelectorAll('span');
                    return Array.from(spanElements).some(span =>
                        span.textContent.includes('Feature Film') ||
                        span.textContent.includes('Miniseries') ||
                        span.textContent.includes('Short Film') ||
                        span.textContent.includes('Stand-up Comedy') ||
                        span.textContent.includes('Live Performance') ||
                        span.textContent.includes('Movie Collection')
                    );
                });
    
                featureFilmRows.forEach(featureFilmRow => {
                    let prevSibling = featureFilmRow.previousElementSibling;
                    while (prevSibling && prevSibling.classList.contains('empty-row')) {
                        featureFilmRow.parentNode.removeChild(prevSibling);
                        prevSibling = featureFilmRow.previousElementSibling;
                    }
    
                    let nextSibling = featureFilmRow.nextElementSibling;
                    while (nextSibling && nextSibling.classList.contains('empty-row')) {
                        featureFilmRow.parentNode.removeChild(nextSibling);
                        nextSibling = featureFilmRow.nextElementSibling;
                    }
                });
    
                const updatedAllRows = document.querySelectorAll('.torrent_table tr');
                let previousRowWasEmpty = false;
                Array.from(updatedAllRows).forEach(row => {
                    if (row.classList.contains('empty-row')) {
                        if (previousRowWasEmpty) {
                            row.parentNode.removeChild(row);
                        } else {
                            previousRowWasEmpty = true;
                        }
                    } else {
                        previousRowWasEmpty = false;
                    }
                });
    
                Array.from(updatedAllRows).forEach(row => {
                    const idMatch = row.id.match(/group_torrent_header_(\d+)/);
                    if (idMatch) {
                        const idNumber = idMatch[1];
                        const hiddenRow = document.querySelector(`#torrent_${idNumber}`);
                        if (hiddenRow) {
                            row.parentNode.insertBefore(hiddenRow, row.nextSibling);
                        } else {
                            console.warn(`No element found with id #torrent_${idNumber}`);
                        }
                    }
                });
    
                featureFilmRows.forEach(row => {
                    let prevSibling = row.previousElementSibling;
                    if (prevSibling && prevSibling.classList.contains('empty-row')) {
                        row.parentNode.removeChild(prevSibling);
                    }
                });
    
                resolve();
            } catch (error) {
                console.error('Error in cleaner:', error);
                reject("Error in cleaner: " + error);
            }
        });
    }
    
    function recleaner() {
        return new Promise((resolve, reject) => {
            try {
                const allRows = document.querySelectorAll('.torrent_table tr');
                let previousRowWasEmpty = false;
    
                //allRows.forEach((row, index) => {
                //    if (row.className === '' && row.innerText.trim() === '') {
                //        const prevRow = allRows[index - 1];
                //        const nextRow = allRows[index + 1];
    
                //        if (prevRow && prevRow.classList.contains('empty-row')) {
                //            console.log('recleaner: removing empty row before a non-ID row', prevRow);
                //            prevRow.remove();
                //        }
    
                //        if (nextRow && nextRow.classList.contains('empty-row')) {
                //            console.log('recleaner: removing empty row after a non-ID row', nextRow);
                //            nextRow.remove();
                //        }
                //    }
                //});
    
                allRows.forEach((row, index) => {
                    if (row.classList.contains('torrent_info_row') || (row.className === '' && row.id === '')) {
                        const prevRow = allRows[index - 1];
    
                        if (prevRow && prevRow.classList.contains('empty-row')) {
                            prevRow.remove();
                        }
                    }
                });
    
                allRows.forEach(row => {
                    if (row.classList.contains('empty-row')) {
                        if (previousRowWasEmpty) {
                            row.remove();
                        } else {
                            previousRowWasEmpty = true;
                        }
                    } else if (row.id && !row.classList.contains('torrent_info_row')) {
                        previousRowWasEmpty = false;
                    }
                });
    
                // Check the final row to ensure no trailing empty row
                const lastRow = allRows[allRows.length - 1];
                if (lastRow && lastRow.classList.contains('empty-row')) {
                    lastRow.remove();
                }
    
                resolve();
            } catch (error) {
                console.error('Error in recleaner:', error);
                reject("Error in recleaner: " + error);
            }
        });
    }
    
    document.addEventListener('PTPAddReleasesFromOtherTrackersComplete', function(event) {
        rowSorter(pcs, dnum, pnum)
            .then(() => rearranger(size))
            .then(() => cleaner())
            .then(() => recleaner())
            .catch(error => {
                console.error('An error occurred:', error);
            });
    });
    
    document.addEventListener('SortingComplete', function(event) {
        rowSorter(pcs, dnum, pnum)
            .then(() => rearranger(size))
            .then(() => cleaner())
            .then(() => recleaner())
            .catch(error => {
                console.error('An error occurred:', error);
            });
    });
    })();