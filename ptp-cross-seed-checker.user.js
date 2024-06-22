// ==UserScript==
// @name         PTP Cross-Seed Checker
// @version      0.0.9
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

    let defaultdnum = 5;
    let defaultpnum = 10;
    let defaultsize = 8;
    let defaultpcs = true;

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
        resolution: /(([0-9]{3,4}p))[^M]/,
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
                <label for="secondPassCheckbox" style="font-weight: bold; margin-bottom: 5px; margin-right: 10px; align-self: center; color: #001f3f;">Enable Second Pass to match remaining:</label>
                <input type="checkbox" id="secondPassCheckbox" ${GM_getValue('secondPassCheckbox', true) ? 'checked' : ''} style="align-self: center;">
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
        document.getElementById('secondPassCheckbox').checked = true;

        GM_setValue('dnumlimit', defaultdnum);
        GM_setValue('pnumlimit', defaultpnum);
        GM_setValue('rowhtsize', defaultsize);
        GM_setValue('pcscheckbox', defaultpcs);
        GM_setValue('secondPassCheckbox', true);

        alert('Settings reset to defaults and saved successfully!');

        document.getElementById('cs_settingsDialog').style.display = 'none';
    });

    document.getElementById('cs_saveSettings').addEventListener('click', function() {
        const newDnumLimit = parseInt(document.getElementById('dnumLimit').value, 10);
        const newPnumLimit = parseInt(document.getElementById('pnumLimit').value, 10);
        const newRowhtSize = parseInt(document.getElementById('rowhtSize').value, 10);
        const newPcsCheckbox = document.getElementById('pcsCheckbox').checked;
        const newSecondPassCheckbox = document.getElementById('secondPassCheckbox').checked;

        dnum = newDnumLimit;
        pnum = newPnumLimit;
        size = newRowhtSize;
        pcs = newPcsCheckbox;

        GM_setValue('dnumlimit', newDnumLimit);
        GM_setValue('pnumlimit', newPnumLimit);
        GM_setValue('rowhtsize', newRowhtSize);
        GM_setValue('pcscheckbox', newPcsCheckbox);
        GM_setValue('secondPassCheckbox', newSecondPassCheckbox);

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
        return Array.from(ptpRows).map(row => {
            const group = row.getAttribute('data-releasegroup') || '';
            const rawName = row.getAttribute('data-releasename') || '';
            const parsedName = releasenameparser(rawName) || {};
            const sizeEl = row.querySelector('.nobr span[title]');
            const rawSize = sizeEl ? sizeEl.getAttribute('title') : '';
            const size = rawSize ? parseInt(rawSize.replace(/[^0-9]/g, '')) : 0;
            const { pl, dl } = actionElsparser(row);
            return { group, size, pl, dl, rawName, parsedName };
        });
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
        return Array.from(otherRows).map(row => {
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
    }

function matchRows(ptpRows, ptpRowsData, otherRowsData, enablePCS, dnum, pnum) {
    const unmatchedRows = [];
    otherRowsData.forEach(otherRow => {
        const matchingPTPRow = TCSfinder(ptpRowsData, otherRow, dnum);

        if (matchingPTPRow) {
            const tcsLink = createLink('TCS', matchingPTPRow.pl, 'Total Cross-Seed compatibility - Identical Release', 'greenyellow');
            const infoLink = createInfoLink();

            actionSpnupdater(otherRow, tcsLink, infoLink);
            infoLinklistener(infoLink, ptpRows, matchingPTPRow);
        } else if (enablePCS && otherRow.size) {
            const matchingPTPRowPCS = PCSfinder(ptpRowsData, otherRow, pnum);

            if (matchingPTPRowPCS) {
                const pcsLink = createLink('PCS', matchingPTPRowPCS.pl, 'Partial Cross-Seed compatibility - Re-verify File/Folder Structure', 'orange');
                const infoLinkPCS = createInfoLink();

                actionSpnupdater(otherRow, pcsLink, infoLinkPCS);
                infoLinklistener(infoLinkPCS, ptpRows, matchingPTPRowPCS);
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
    return new Promise((resolve, reject) => {
        try {
            unmatchedRows.forEach((otherRow, index) => {
                for (let i = index + 1; i < unmatchedRows.length; i++) {
                    const otherRowToCompare = unmatchedRows[i];
                    const matchingOtherRow = TCSfinder([otherRow], otherRowToCompare, dnum);

                    if (matchingOtherRow) {
                        const tcsLink = createLink('TCS', '#', 'Total Cross-Seed compatibility - Identical Release', 'greenyellow');
                        const infoLink = createInfoLink('Other');

                        actionSpnupdater(otherRowToCompare, tcsLink, infoLink);
                        infoLinklistener(infoLink, unmatchedRows, matchingOtherRow);
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
        return ptpRowsData.find(ptpRow =>
            ptpRow.group.toLowerCase() === otherRow.group.toLowerCase() &&
            Math.abs(ptpRow.size - otherRow.size) <= toleranceBytes
        );
    }

    function PCSfinder(ptpRowsData, otherRow, pnum) {
        const toleranceBytes = pnum * 1024 * 1024; // Convert MiB to bytes

        if (otherRow.rawName.includes("Audio Only Track")) {
            return null;
        }

        const otherRowTitle = normalizeTitle(otherRow.parsedName.title || "");
        const otherRowResolution = otherRow.parsedName.resolution || "";
        const otherRowHasDV = otherRowTitle.includes("DV");
        const otherRowHasHDR = /HDR/i.test(otherRowTitle);

        return ptpRowsData.find(ptpRow => {
            const ptpRowTitle = normalizeTitle(ptpRow.parsedName.title || "");
            const ptpRowResolution = ptpRow.parsedName.resolution || "";
            const ptpRowHasDV = ptpRowTitle.includes("DV");
            const ptpRowHasHDR = /HDR/i.test(ptpRowTitle);

            return (
                (otherRow.group.length === 0 || ptpRow.group.toLowerCase() === otherRow.group.toLowerCase()) &&
                ptpRowTitle === otherRowTitle &&
                ptpRowResolution === otherRowResolution &&
                Math.abs(ptpRow.size - otherRow.size) <= toleranceBytes && // Size within PCS tolerance
                !(ptpRow.group.toLowerCase() === otherRow.group.toLowerCase() && Math.abs(ptpRow.size - otherRow.size) <= (dnum * 1024 * 1024)) && // Ensure not a TCS match
                otherRowHasDV === ptpRowHasDV && // Ensure DV matches
                otherRowHasHDR === ptpRowHasHDR // Ensure HDR matches
            );
        });
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
        let spx = `${size}px`;

        return new Promise((resolve, reject) => {
            try {
                function getRowsWithTextContent(content) {
                    const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
                    const filteredRows = Array.from(allRows).filter(row => {
                        const link = row.querySelector('a.link_2');
                        return link && (link.textContent.toLowerCase() === content.toLowerCase());
                    });
                    return filteredRows;
                }

                function getRowsWithPLAnchors() {
                    const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
                    const filteredRows = Array.from(allRows).filter(row => {
                        const plAnchor = row.querySelector('a[title="Permalink"]');
                        return plAnchor !== null;
                    });
                    return filteredRows;
                }

                function getRowsWithPCS() {
                    const allRows = document.querySelectorAll('.torrent_table tr.group_torrent.group_torrent_header');
                    const filteredRows = Array.from(allRows).filter(row => {
                        const link = row.querySelector('a.link_2');
                        return link && (link.textContent.toLowerCase() === 'pcs');
                    });
                    return filteredRows;
                }

                const rowsWithTCS = getRowsWithTextContent('tcs');
                const rowsWithPCS = getRowsWithPCS();
                const rowsWithPLAnchors = getRowsWithPLAnchors();

                rowsWithPLAnchors.forEach(plRow => {
                    const plAnchor = plRow.querySelector('a[title="Permalink"]');
                    if (plAnchor) {
                        const plHref = plAnchor.getAttribute('href');
                        const matchingTCSRows = rowsWithTCS.filter(tcsRow => {
                            const tcsAnchor = tcsRow.querySelector('a.link_2');
                            return tcsAnchor && tcsAnchor.getAttribute('href') === plHref;
                        });
                        const matchingPCSRows = rowsWithPCS.filter(pcsRow => {
                            const pcsAnchor = pcsRow.querySelector('a.link_2');
                            return pcsAnchor && pcsAnchor.getAttribute('href') === plHref;
                        });
                        const combinedRows = [...matchingPCSRows, ...matchingTCSRows];

                        combinedRows.forEach((combinedRow, index) => {
                            let emptyRowAbovePl = plRow.previousElementSibling;
                            if (!emptyRowAbovePl || !emptyRowAbovePl.classList.contains('empty-row')) {
                                emptyRowAbovePl = document.createElement('tr');
                                emptyRowAbovePl.className = 'empty-row';
                                emptyRowAbovePl.style.height = spx;
                                plRow.parentNode.insertBefore(emptyRowAbovePl, plRow);
                            }

                            let siblingRow = plRow.nextElementSibling;
                            while (siblingRow && !siblingRow.classList.contains('torrent_info_row')) {
                                siblingRow = siblingRow.nextElementSibling;
                            }

                            if (siblingRow) {
                                plRow.parentNode.insertBefore(combinedRow, siblingRow.nextSibling);
                            } else {
                                plRow.parentNode.insertBefore(combinedRow, plRow.nextSibling);
                            }

                            if (index === 0) {
                                const emptyRowAfterFirstCombined = document.createElement('tr');
                                emptyRowAfterFirstCombined.className = 'empty-row';
                                emptyRowAfterFirstCombined.style.height = spx;
                                plRow.parentNode.insertBefore(emptyRowAfterFirstCombined, combinedRow.nextSibling);
                            }
                        });
                    }
                });
                resolve();
            } catch (error) {
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
                        span.textContent.includes('Feature Film') || span.textContent.includes('Miniseries') || span.textContent.includes('Short Film') || span.textContent.includes('Stand-up Comedy') || span.textContent.includes('Live Performance') || span.textContent.includes('Movie Collection')
                    );
                });

                featureFilmRows.forEach(featureFilmRow => {
                    let prevSibling = featureFilmRow.previousElementSibling;
                    while (prevSibling && prevSibling.classList.contains('empty-row')) {
                        featureFilmRow.parentNode.removeChild(prevSibling);
                        prevSibling = featureFilmRow.previousElementSibling;
                    }

                    let nxtSibling = featureFilmRow.nextElementSibling;
                    while (nxtSibling && nxtSibling.classList.contains('empty-row')) {
                        featureFilmRow.parentNode.removeChild(nxtSibling);
                        nxtSibling = featureFilmRow.nextElementSibling;
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
                resolve();
            } catch (error) {
                reject("Error in cleaner: " + error);
            }
        });
    }

    function recleaner() {
        return new Promise((resolve, reject) => {
            try {
                const allRows = document.querySelectorAll('.torrent_table tr');
                const lastRow = allRows[allRows.length - 1];

                if (lastRow && lastRow.classList.contains('empty-row')) {
                    lastRow.remove();
                    resolve();
                } else {
                    resolve();
                }
            } catch (error) {
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