// ==UserScript==
// @name         PTP - Add Time Column and Highlight Recent Torrents
// @namespace    PTP-Add-Time-Column-and-Highlight-Recent-Torrents
// @version      0.5.6
// @description  Add a Time column to the Torrent Group Page, Collage Page,
//               Artist Page, and Bookmark Page.
//               Highlight recent and latest torrent within a group.
// @author       mcnellis (additions by Audionut)
// @match        https://passthepopcorn.me/torrents.php*
// @match        https://passthepopcorn.me/collages.php?*
// @match        https://passthepopcorn.me/artist.php?*
// @match        https://passthepopcorn.me/bookmarks.php*
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

    function main() {
        if (isIgnoredTorrentsPage()) {
            return;
        } else if (isTorrentsGroupPage()) {
            torrentsGroupPage();
        } else if (isTorrentsPage()) {
            torrentsPage();
        } else if (isCollageSubscriptionsPage()) {
            collageSubscriptionsPage();
        } else if (isCollagesPage() || isArtistPage() || isBookmarksPage()) {
            artistAndBookmarksAndCollagesPage();
        }
    }

    function torrentsGroupPage() {
        if (!$('.torrent_table thead tr th:contains("Time")').length) {
            $('.torrent_table thead tr th:nth(0)').after($('<th>Time</th>'));
        }
        $('.group_torrent td.basic-movie-list__torrent-edition').each((i, edition) => {
            $(edition).attr('colspan', parseInt($(edition).attr('colspan')) + 1);
        });
        $('.torrent_info_row td').each((i, info) => {
            $(info).attr('colspan', parseInt($(info).attr('colspan')) + 1);
        });

        handleExistingTorrents();
        handleNewTorrents();
    }

    function handleExistingTorrents() {
        let times = [];
        $('.group_torrent_header').each(function(i, element) {
            const torrentRow = $(element);
            if (!torrentRow.find('td.time-cell').length) {
                let time = torrentRow.next().find('span.time').first();
                if (time.length) {
                    const timeTitle = time.attr('title');
                    const parsedDate = moment.utc(timeTitle, "MMM DD YYYY, HH:mm");

                    if (parsedDate.isValid()) {
                        const isoString = parsedDate.toISOString();
                        const formattedTime = formatTime(parsedDate);
                        times.push(timeTitle);

                        const clonedTime = time.clone().html(formattedTime).addClass('nobr');
                        const timeCell = $('<td class="time-cell"></td>').append(clonedTime);
                        torrentRow.find('td:nth(0)').after(timeCell);
                    } else {
                        console.error('Invalid date:', timeTitle);
                        const timeCell = $('<td class="time-cell"></td>').append($('<span>').addClass('nobr').text('Invalid date'));
                        torrentRow.find('td:nth(0)').after(timeCell);
                    }
                }
            }
        });
        highlightTimes(times);
    }

    function handleNewTorrents() {
        let times = [];
        $('.group_torrent_header').each(function(i, element) {
            const torrentRow = $(element);
            if (!torrentRow.find('td.time-cell').length) {
                let time = torrentRow.find('span.release.time').first();
                if (time.length) {
                    const unixTimestamp = parseInt(time.attr('title'));
                    if (!isNaN(unixTimestamp)) {
                        const formattedTime = formatTime(moment.unix(unixTimestamp));
                        time.html(formattedTime);
                        times.push(time.attr('title'));

                        $(time).addClass('nobr');
                        const timeCell = $('<td class="time-cell"></td>').append(time);
                        torrentRow.find('td:nth(0)').after(timeCell);
                    }
                } else {
                    const timeCell = $('<td class="time-cell"></td>').append($('<span>').addClass('nobr'));
                    torrentRow.find('td:nth(0)').after(timeCell);
                }
            }
        });
        highlightTimes(times);
    }

    function highlightTimes(times) {
        times.sort(descendingDate);
        const nowMillis = new Date().getTime();

        setTimeout(() => {
            let latestTimeHighlighted = false;
            for (let i in times) {
                const time = times[i];
                let timeMillis;
                if (isNaN(time)) {
                    timeMillis = moment.utc(time, "MMM DD YYYY, HH:mm [UTC]").valueOf();
                } else {
                    timeMillis = parseInt(time) * 1000;
                }
                if (nowMillis - timeMillis < RECENT_DAYS_IN_MILLIS) {
                    highlightRecentTime(time, '.group_torrent_header');
                }
                if (!latestTimeHighlighted && timeMillis) {
                    highlightLatestTime(time, '.group_torrent_header');
                    latestTimeHighlighted = true;
                }
            }
        }, 100); // 100 milliseconds delay
    }

    function torrentsPage() {
        $('.torrent_table tbody').each(function(i, group) {
            let times = collectTimes(group);
            times.sort(descendingDate);

            const nowMillis = new Date().getTime();
            for (let i in times) {
                const time = times[i];
                const parsedDate = moment.utc(time, "MMM DD YYYY, HH:mm");
                if (parsedDate.isValid() && nowMillis - parsedDate.valueOf() < RECENT_DAYS_IN_MILLIS) {
                    highlightRecentTime(time, '.basic-movie-list__torrent-row', group);
                }
            }

            if (times.length > 0) {
                highlightLatestTime(times[0], '.basic-movie-list__torrent-row', group);
            }
        });
    }

    function artistAndBookmarksAndCollagesPage() {
        if (!$('.torrent_table:visible thead tr th:contains("Time")').length) {
            $('.torrent_table:visible thead tr th:nth(1)').after($('<th>Time</th>'));
        }
        $('.torrent_table:visible td.basic-movie-list__torrent-edition').each((i, edition) => {
            $(edition).attr('colspan', parseInt($(edition).attr('colspan')) + 1);
        });
        $('.basic-movie-list__details-row').each((i, detailsRow) => {
            const detailsCell = $(detailsRow).find('td:nth(1)');
            detailsCell.attr('colspan', parseInt(detailsCell.attr('colspan')) + 1);
        });

        const torrentGroupTimes = {};
        const torrentIdToTime = {};
        const torrentGroups = new Set();
        $(coverViewJsonData).each((i, data) => {
            $(data.Movies).each((j, movieGroup) => {
                const groupId = movieGroup.GroupId;
                torrentGroups.add(groupId);
                $(movieGroup.GroupingQualities).each((k, edition) => {
                    $(edition.Torrents).each((m, torrent) => {
                        if (!torrentGroupTimes[groupId]) {
                            torrentGroupTimes[groupId] = [];
                        }
                        const timeTitle = $(torrent.Time).attr('title');
                        const parsedDate = moment.utc(timeTitle, "MMM DD YYYY, HH:mm");
                        if (parsedDate.isValid()) {
                            torrentGroupTimes[groupId].push(parsedDate.toISOString());
                            torrentIdToTime[torrent.TorrentId] = formatTime(parsedDate);
                        } else {
                            console.error('Invalid date:', timeTitle);
                            torrentIdToTime[torrent.TorrentId] = 'Invalid date';
                        }
                    });
                });
            });
        });

        $('.basic-movie-list__torrent-row .basic-movie-list__torrent__action').each((i, element) => {
            const parent = $(element).parent();
            if (!parent.find('td.time-cell').length) {
                const href = parent.find('a.torrent-info-link').attr('href');
                const hrefParts = href.match(/torrents.php\?id=([0-9]+)&torrentid=([0-9]+)/);
                const groupId = hrefParts[1];
                const torrentId = hrefParts[2];
                const timeText = torrentIdToTime[torrentId] || 'Unknown';
                parent.after($('<td class="nobr time-cell">' + timeText + '</td>'));
            }
        });

        torrentGroups.forEach(groupId => {
            torrentGroupTimes[groupId] = torrentGroupTimes[groupId].sort(descendingDate);
        });

        const nowMillis = new Date().getTime();
        for (const i in torrentGroupTimes) {
            const times = torrentGroupTimes[i];
            for (const j in times) {
                const time = times[j];
                if (nowMillis - moment.utc(time).valueOf() < RECENT_DAYS_IN_MILLIS) {
                    highlightRecentTime(time, '.basic-movie-list__torrent-row');
                }
            }

            if (times.length > 1) {
                highlightLatestTime(times[0], '.basic-movie-list__torrent-row');
            }
        }
    }

    function collageSubscriptionsPage() {
        const torrentGroupTimes = {};
        const torrentIdToTime = {};
        const torrentGroups = new Set();
        $(coverViewJsonData).each((j, jsonData) => {
            $(jsonData.Movies).each((i, movieGroup) => {
                const groupId = movieGroup.GroupId;
                torrentGroups.add(groupId);
                $(movieGroup.GroupingQualities).each((j, edition) => {
                    $(edition.Torrents).each((k, torrent) => {
                        if (!torrentGroupTimes[groupId]) {
                            torrentGroupTimes[groupId] = [];
                        }
                        const timeTitle = $(torrent.Time).attr('title');
                        const unixTimestamp = moment.utc(timeTitle, "MMM DD YYYY, HH:mm").unix();
                        if (!isNaN(unixTimestamp)) {
                            torrentGroupTimes[groupId].push(timeTitle);
                            torrentIdToTime[torrent.TorrentId] = formatTime(moment.unix(unixTimestamp));
                        } else {
                            console.error('Invalid date:', timeTitle);
                            torrentIdToTime[torrent.TorrentId] = 'Invalid date';
                        }
                    });
                });
            });
        });

        torrentGroups.forEach(groupId => {
            torrentGroupTimes[groupId] = torrentGroupTimes[groupId].sort(descendingDate);
        });

        const nowMillis = new Date().getTime();
        for (const i in torrentGroupTimes) {
            const times = torrentGroupTimes[i];
            for (const j in times) {
                const time = times[j];
                if (nowMillis - moment.utc(time + ' UTC').valueOf() < RECENT_DAYS_IN_MILLIS) {
                    highlightRecentTime(time, '.basic-movie-list__torrent-row');
                }
            }

            if (times.length > 1) {
                highlightLatestTime(times[0], '.basic-movie-list__torrent-row');
            }
        }
    }

    function isArtistPage() {
        return window.location.pathname === '/artist.php';
    }

    function isBookmarksPage() {
        return window.location.pathname === '/bookmarks.php';
    }

    function isCollageSubscriptionsPage() {
        return (
            window.location.pathname === '/collages.php' &&
            window.location.search.includes('action=subscriptions')
        );
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
        return (
            isTorrentsPage() &&
            (
                window.location.search.includes('type=downloaded') ||
                window.location.search.includes('type=uploaded') ||
                window.location.search.includes('type=leeching') ||
                window.location.search.includes('type=snatched') ||
                window.location.search.includes('type=seeding')
            )
        );
    }

    function collectTimes(group) {
        let times = [];
        $(group).find('.basic-movie-list__torrent-row').each(function (i, torrentRow) {
            const spanTime = $(torrentRow).find('td span.time');
            if (spanTime && spanTime.length > 0) {
                const timeTitle = spanTime.attr('title');
                times.push(moment.utc(timeTitle, "MMM DD YYYY, HH:mm").toISOString());
            }
        });
        return times;
    }

    function descendingDate(a, b) {
        const aDate = new Date(a);
        const bDate = new Date(b);
        if (aDate === bDate) return 0;
        return aDate > bDate ? -1 : 1;
    }

    function highlightTime(time, rowClassName, textColor, backgroundColor, fontWeight) {
        $(rowClassName + " span.time[title='" + time + "'], " + rowClassName + " span.release.time[title='" + time + "']").each(function(i, span) {
            highlightSpan(span, textColor, backgroundColor, fontWeight);
        });
    }

    function highlightSpan(span, textColor, backgroundColor, fontWeight) {
        if (textColor) $(span).css('color', textColor);
        if (backgroundColor) $(span).parent().css('background-color', backgroundColor);
        if (fontWeight) $(span).css('font-weight', fontWeight);
    }

    function highlightRecentTime(time, rowClassName) {
        highlightTime(time, rowClassName, HIGHLIGHT_RECENT_TEXT_COLOR, HIGHLIGHT_RECENT_BACKGROUND_COLOR, HIGHLIGHT_RECENT_FONT_WEIGHT);
    }

    function highlightLatestTime(time, rowClassName) {
        highlightTime(time, rowClassName, HIGHLIGHT_LATEST_TEXT_COLOR, HIGHLIGHT_LATEST_BACKGROUND_COLOR, HIGHLIGHT_LATEST_FONT_WEIGHT);
    }

    function formatRoundedRelative(time) {
        const relativeTimeText = time.html();
        if (relativeTimeText !== undefined) {
            const relativeTimeParts = relativeTimeText.split(' ');
            if (relativeTimeParts.length > 1 && relativeTimeText !== 'Just now') {
                time.html(`${relativeTimeParts[0]} ${relativeTimeParts[1].replace(',', '')} ago`);
            } else if (relativeTimeText === 'Just now') {
                time.html('Just now');
            }
        } else {
            time.html('Undefined');
        }
    }

    function formatTime(momentTime) {
        if (TIME_FORMAT === 'relative') {
            return momentTime.fromNow();
        } else if (TIME_FORMAT === 'rounded-relative') {
            const relativeTimeText = momentTime.fromNow(true);
            const relativeTimeParts = relativeTimeText.split(' ');
            if (relativeTimeParts.length > 1 && relativeTimeText !== 'Just now') {
                return `${relativeTimeParts[0]} ${relativeTimeParts[1].replace(',', '')} ago`;
            } else if (relativeTimeText === 'Just now') {
                return 'Just now';
            }
        } else {
            return momentTime.format(TIME_FORMAT);
        }
    }

    main();

    document.addEventListener('PTPAddReleasesFromOtherTrackersComplete', () => {
        console.log("Rerunning Time Column to fix added releases");
        handleNewTorrents(); // Run the script again for new torrents
    });
})();