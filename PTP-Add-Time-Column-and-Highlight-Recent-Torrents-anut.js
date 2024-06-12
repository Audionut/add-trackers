// ==UserScript==
// @name         PTP - Add Time Column and Highlight Recent Torrents
// @namespace    PTP-Add-Time-Column-and-Highlight-Recent-Torrents
// @version      0.4.9
// @description  Add a Time column to the Torrent Group Page, Collage Page,
//               Artist Page, and Bookmark Page.
//               Highlight recent and latest torrent within a group.
// @author       mcnellis (additions by Audionut)
// @match        https://passthepopcorn.me/torrents.php*
// @match        https://passthepopcorn.me/collages.php?*
// @match        https://passthepopcorn.me/artist.php?*
// @match        https://passthepopcorn.me/bookmarks.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.js
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/PTP-Add-Time-Column-and-Highlight-Recent-Torrents-anut.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/PTP-Add-Time-Column-and-Highlight-Recent-Torrents-anut.js
// ==/UserScript==
/* globals $, moment, coverViewJsonData, ungroupedCoverViewJsonData */

(function() {
    'use strict';

    const TIME_FORMAT = 'rounded-relative'; // 'relative', 'rounded-relative', or any format value supported by moment.js
    const HIGHLIGHT_LATEST_TEXT_COLOR = 'black';
    const HIGHLIGHT_LATEST_BACKGROUND_COLOR = 'silver';
    const HIGHLIGHT_LATEST_FONT_WEIGHT = 'bold';
    const HIGHLIGHT_RECENT_TEXT_COLOR = 'black';
    const HIGHLIGHT_RECENT_BACKGROUND_COLOR = 'gainsboro';
    const HIGHLIGHT_RECENT_FONT_WEIGHT = 'bold';
    const RECENT_DAYS_IN_MILLIS = 7 * 24 * 60 * 60 * 1000;
    const LOAD_DELAY = 7000;
    const UTC_STRING = ' UTC';

    function main() {
        if (isIgnoredTorrentsPage()) return;

        if (isTorrentsGroupPage()) {
            addTimeColumn('.torrent_table thead tr th:nth(0)', '.group_torrent_header', '.group_torrent td.basic-movie-list__torrent-edition', '.torrent_info_row td');
        } else if (isTorrentsPage()) {
            processTorrentsPage();
        } else if (isCollageSubscriptionsPage()) {
            processCollageSubscriptionsPage();
        } else if (isCollagesPage() || isArtistPage() || isBookmarksPage()) {
            processArtistAndBookmarksAndCollagesPage();
        }
    }

    function addTimeColumn(headerSelector, rowSelector, editionSelector, infoSelector) {
        $(headerSelector).after($('<th>Time</th>'));
        $(editionSelector).attr('colspan', (i, val) => +val + 1);
        $(infoSelector).attr('colspan', (i, val) => +val + 1);

        const times = [];
        $(rowSelector).each(function() {
            const torrentRow = $(this);
            const time = torrentRow.next().find('span.time').first().clone();
            times.push(time.attr('title'));
            $(time).addClass('nobr');
            const timeCell = $('<td></td>').append(time);
            const unixTimestamp = new Date(time.attr('title') + UTC_STRING).getTime() / 1000;

            if (TIME_FORMAT === 'rounded-relative') {
                formatRoundedRelative(time);
            } else if (TIME_FORMAT !== 'relative') {
                time.html(moment.unix(unixTimestamp).format(TIME_FORMAT));
            }
            torrentRow.find('td:nth(0)').after(timeCell);
        });

        highlightTimes(times);
    }

    function formatRoundedRelative(time) {
        const relativeTimeText = time.html();
        if (relativeTimeText !== undefined) {
            const relativeTimeParts = relativeTimeText.split(' ');
            if (relativeTimeText !== 'Just now') {
                time.html(`${relativeTimeParts[0]} ${relativeTimeParts[1].replace(',', '')} ago`);
            }
        } else {
            time.html('Undefined');
        }
    }

    function highlightTimes(times) {
        times.sort(descendingDate);
        const nowMillis = Date.now();
        times.forEach(time => {
            if (nowMillis - new Date(time + UTC_STRING).getTime() < RECENT_DAYS_IN_MILLIS) {
                highlightTime(time, '.group_torrent_header', HIGHLIGHT_RECENT_TEXT_COLOR, HIGHLIGHT_RECENT_BACKGROUND_COLOR, HIGHLIGHT_RECENT_FONT_WEIGHT);
            }
        });

        if (times.length > 1) {
            highlightTime(times[0], '.group_torrent_header', HIGHLIGHT_LATEST_TEXT_COLOR, HIGHLIGHT_LATEST_BACKGROUND_COLOR, HIGHLIGHT_LATEST_FONT_WEIGHT);
        }
    }

    function processTorrentsPage() {
        $('.torrent_table tbody').each(function() {
            let times = collectTimes(this);
            highlightTimes(times);
        });
    }

    function processArtistAndBookmarksAndCollagesPage() {
        addTimeColumn('.torrent_table:visible thead tr th:nth(1)', '.basic-movie-list__torrent-row', '.torrent_table:visible td.basic-movie-list__torrent-edition', '.basic-movie-list__details-row td:nth(1)');
        processJsonData(coverViewJsonData);
    }

    function processCollageSubscriptionsPage() {
        processJsonData(coverViewJsonData);
    }

    function processJsonData(jsonData) {
        const torrentGroupTimes = {};
        const torrentIdToTime = {};

        $(jsonData).each((_, data) => {
            $(data.Movies).each((_, movieGroup) => {
                const groupId = movieGroup.GroupId;
                $(movieGroup.GroupingQualities).each((_, edition) => {
                    $(edition.Torrents).each((_, torrent) => {
                        if (!torrentGroupTimes[groupId]) {
                            torrentGroupTimes[groupId] = [];
                        }
                        torrentGroupTimes[groupId].push($(torrent.Time).attr('title'));
                        torrentIdToTime[torrent.TorrentId] = torrent.Time;
                    });
                });
            });
        });

        highlightTimesInGroups(torrentGroupTimes, torrentIdToTime);
    }

    function highlightTimesInGroups(torrentGroupTimes, torrentIdToTime) {
        const nowMillis = Date.now();
        Object.values(torrentGroupTimes).forEach(times => {
            times.sort(descendingDate);
            times.forEach(time => {
                if (nowMillis - new Date(time + UTC_STRING).getTime() < RECENT_DAYS_IN_MILLIS) {
                    highlightTime(time, '.basic-movie-list__torrent-row', HIGHLIGHT_RECENT_TEXT_COLOR, HIGHLIGHT_RECENT_BACKGROUND_COLOR, HIGHLIGHT_RECENT_FONT_WEIGHT);
                }
            });
            if (times.length > 1) {
                highlightTime(times[0], '.basic-movie-list__torrent-row', HIGHLIGHT_LATEST_TEXT_COLOR, HIGHLIGHT_LATEST_BACKGROUND_COLOR, HIGHLIGHT_LATEST_FONT_WEIGHT);
            }
        });
    }

    function isArtistPage() {
        return window.location.pathname === '/artist.php';
    }

    function isBookmarksPage() {
        return window.location.pathname === '/bookmarks.php';
    }

    function isCollageSubscriptionsPage() {
        return window.location.pathname === '/collages.php' && window.location.search.includes('action=subscriptions');
    }

    function isCollagesPage() {
        return window.location.pathname === '/collages.php';
    }

    function isTorrentsPage() {
        return window.location.pathname === '/torrents.php';
    }

    function isTorrentsGroupPage() {
        return isTorrentsPage() && window.location.search.includes('id=');
    }

    function isIgnoredTorrentsPage() {
        return isTorrentsPage() && ['type=downloaded', 'type=uploaded', 'type=leeching', 'type=snatched', 'type=seeding'].some(type => window.location.search.includes(type));
    }

    function collectTimes(group) {
        const times = [];
        $(group).find('.basic-movie-list__torrent-row td span.time').each((_, span) => {
            times.push($(span).attr('title'));
        });
        return times;
    }

    function descendingDate(a, b) {
        return new Date(b) - new Date(a);
    }

    function highlightTime(time, rowClassName, textColor, backgroundColor, fontWeight) {
        $(rowClassName + " span.time[title|='" + time + "']").each((_, span) => {
            if (textColor) $(span).css('color', textColor);
            if (backgroundColor) $(span).parent().css('background-color', backgroundColor);
            if (fontWeight) $(span).css('font-weight', fontWeight);
        });
    }

    setTimeout(main, LOAD_DELAY);
})();