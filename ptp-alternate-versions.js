// ==UserScript==
// @name         PTP - Alternate Versions Sidebar
// @version      1.3.0
// @description  Add alternate versions tracking to the sidebar
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @downloadURL  https://raw.githubusercontent.com/Audionut/add-trackers/refs/heads/main/ptp-alternate-versions.js
// @updateURL    https://raw.githubusercontent.com/Audionut/add-trackers/refs/heads/main/ptp-alternate-versions.js
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function () {
    "use strict";

    // USER SETTINGS - Adjust these to customize behavior
    const USER_SETTINGS = {
        SORT_BY: 'popularity',       // Options: 'name', 'popularity', 'count', 'seeders', 'snatches'
        SORT_ORDER: 'desc',          // Options: 'asc' (ascending), 'desc' (descending)
        FILTER_MODE: 'exclusive',    // Options: 'editions_only' (hide other editions), 'exclusive' (show only selected edition)
        SHOW_STATS: 'all',            // Options: 'name' (name only), 'minimal' (name + seeders), 'all' (all stats)
        SHOW_SETTINGS: true,           // New: toggle for settings panel
        CUSTOM_IGNORE_TAGS: []          // New: user-defined ignore tags
    };

    // POPULARITY SCORE WEIGHTING CONSTANTS (adjust these to fine-tune scoring)
    // Set to 0 to disable a factor, 1 for full weight, values between 0-1 for partial weight
    const WEIGHTS = {
        QUALITY_TORRENT: 0.2,    // Weight for high quality torrents (0 = no effect, 1 = full penalty for GP torrents (which naturally have higher seeds regardless of edition))
        AGE_FACTOR: 0.2,         // Weight for torrent age (0 = no effect, 1 = full penalty for older torrents)
        SNATCH_RATIO: 0.5,      // Weight for snatch/seeder ratio (0 = no effect, 1 = full penalty for poor ratio)
        EDITION_COUNT: 0.8,     // Weight for number of torrents in edition (0 = no effect, 1 = full penalty for lesser torrents)
        SEEDER_COUNT: 0.8        // Weight for high seeder count (0 = no effect, 1 = full bonus for highest seeders)
    };

    // Additional scoring constants
    const SCORING = {
        MAX_AGE_DAYS: 7300,       // Maximum age to consider for scoring
        BASE_SCORE: 100,         // Base score to start with before applying penalties/bonuses
        MIN_SEEDERS: 1           // Minimum seeders to avoid division by zero
    };

    // Define video/audio attributes and other tags to ignore
    const IGNORE_TAGS = [
        // Video formats
        '480p', '576p', '720p', '1080p', '1080i', '2160p', '4K', 'UHD',
        // Codecs
        'x264', 'x265', 'H.264', 'H.265', 'HEVC', 'AVC', 'XviD', 'DivX', 'VC-1', 'AV1',
        // Containers
        'MKV', 'MP4', 'AVI', 'WMV', 'M2TS', 'VOB', 'IFO', 'VOB IFO', 'ISO', 'Remux', 'm2ts',
        // Sources
        'Blu-ray', 'BluRay', 'BD', 'DVD', 'DVD5', 'DVD9', 'WEB-DL', 'WEBDL', 'WEBRip', 'HDTV', 'TV', 'PAL', 'NTSC',
        // Blu-ray disc types
        'BD25', 'BD33', 'BD50', 'BD66', 'BD100',
        // Audio
        'DTS', 'AC3', 'AAC', 'MP3', 'FLAC', 'TrueHD', 'Atmos', 'DDP', 'OPUS', 'DTS-X', 'DTS-HD', 'Dual Audio',
        // HDR
        'HDR', 'HDR10', 'HDR10+', 'Dolby Vision', 'DoVi', '10-bit', 'DV', 'DV HDR', 'DV HDR10', 'DV HDR10+',
        // Commentary
        'With Commentary', 'Commentary',
        // Groups (last tag pattern)
        /^[A-Z0-9]{2,10}$/i,
        // Site tags
        'Downloaded', 'Snatched', 'Seeding', 'Trumpable', 'Release Group', 'Scene', 'Freeleech', 'Half Leech', 'Neutral Leech',
        // Legitimate edition tags that are not Alternate Versions
        'Masters of Cinema', 'Collection', 'StudioCanal', 'Kino Lorber'
    ];

    // Boxset/Collection editions to ignore
    const BOXSET_KEYWORDS = [
        'Anniversary Edition',
        'Collector\'s Edition',
        'Ultimate Edition',
        'Definitive Edition',
        'Complete Collection',
        'Box Set',
        'Boxset',
        'Disc Set',
        'disc edition',
        'Collection',
        'Anthology',
        '2in1',
        '3in1',
        '4in1',
        '5in1',
        '2D/3D'
    ];

    function isIgnoredTag(tag) {
        const allIgnoreTags = getAllIgnoreTags();
        return allIgnoreTags.some(ignored => {
            if (ignored instanceof RegExp) {
                return ignored.test(tag);
            }
            return tag.toLowerCase().includes(ignored.toLowerCase());
        });
    }

    function isBoxsetEdition(tag) {
        return BOXSET_KEYWORDS.some(keyword =>
            tag.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    function isOtherSubEdition(torrentRow) {
        // Check if this torrent is under an "Other" or "3D" sub-edition
        let currentRow = torrentRow.previousElementSibling;
        while (currentRow) {
            const editionCell = currentRow.querySelector('.basic-movie-list__torrent-edition');
            if (editionCell) {
                const subEdition = editionCell.querySelector('.basic-movie-list__torrent-edition__sub');
                if (subEdition) {
                    const subText = subEdition.textContent.trim();
                    if (subText === 'Other' || subText === '3D') {
                        return true;
                    }
                }
                // Found an edition row, stop looking
                break;
            }
            currentRow = currentRow.previousElementSibling;
        }
        return false;
    }

    function extractEdition(torrentRow) {
        const torrentLink = torrentRow.querySelector('.torrent-info-link');
        if (!torrentLink) return null;

        let tags = [];

        // Check if using improved tags (span elements)
        const spanTags = torrentLink.querySelectorAll('span[data-attr]');
        if (spanTags.length > 0) {
            tags = Array.from(spanTags).map(span => span.getAttribute('data-attr'));
        } else {
            // Parse plain text
            const text = torrentLink.textContent.trim();
            tags = text.split('/').map(tag => tag.trim());
        }

        // First, check for boxset editions and ignore them completely
        const hasBoxsetEdition = tags.some(tag => isBoxsetEdition(tag));
        if (hasBoxsetEdition) {
            return null; // Ignore boxset editions completely
        }

        // Remove ignored tags and find potential editions
        const relevantTags = tags.filter(tag => !isIgnoredTag(tag));

        // Check for multiple editions in a single tag (e.g., "Theatrical Cut & Special Edition")
        const multiEditionPattern = /(&|and|\+)/i;
        const hasMultipleEditions = relevantTags.some(tag => multiEditionPattern.test(tag));
        if (hasMultipleEditions) {
            return null; // Ignore torrents with multiple editions
        }

        // If multiple relevant tags found, ignore this torrent (multiple editions)
        if (relevantTags.length > 1) {
            return null;
        }

        // If we have exactly one relevant tag, use it as the edition
        if (relevantTags.length === 1) {
            const tag = relevantTags[0];
            // Normalize "Theatrical Cut" variations to just "Theatrical"
            if (tag.toLowerCase().includes('theatrical')) {
                return 'Theatrical';
            }
            return tag;
        }

        // No relevant tags found, default to Theatrical
        return 'Theatrical';
    }

    function extractTorrentStats(torrentRow) {
        // Find the table header to determine column layout
        const table = torrentRow.closest('table');
        if (!table) return { snatches: 0, seeders: 0 };

        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return { snatches: 0, seeders: 0 };

        const headerCells = headerRow.querySelectorAll('th');
        let snatchesIndex = -1;
        let seedersIndex = -1;

        // Find the correct column indices by looking for the images/titles
        headerCells.forEach((cell, index) => {
            const img = cell.querySelector('img');
            if (img) {
                const src = img.getAttribute('src') || '';
                const alt = img.getAttribute('alt') || '';
                const title = img.getAttribute('title') || '';

                if (src.includes('snatched') || alt.toLowerCase().includes('snatch') || title.toLowerCase().includes('snatch')) {
                    snatchesIndex = index;
                } else if (src.includes('seeders') || alt.toLowerCase().includes('seed') || title.toLowerCase().includes('seed')) {
                    seedersIndex = index;
                }
            }
        });

        // Fallback to default indices if not found
        if (snatchesIndex === -1) snatchesIndex = 3;
        if (seedersIndex === -1) seedersIndex = 4;

        const cells = torrentRow.querySelectorAll('td');

        const snatchesCell = cells[snatchesIndex];
        const seedersCell = cells[seedersIndex];

        const snatches = snatchesCell ? parseInt(snatchesCell.textContent.trim().replace(/,/g, '')) || 0 : 0;
        const seeders = seedersCell ? parseInt(seedersCell.textContent.trim().replace(/,/g, '')) || 0 : 0;

        return { snatches, seeders };
    }

    function extractTorrentAge(torrentRow) {
        const timeCell = torrentRow.querySelector('.time-cell .time');
        if (!timeCell) {
            console.log('[DEBUG] No time cell found');
            return 0;
        }

        const title = timeCell.getAttribute('title');
        if (!title) {
            console.log('[DEBUG] No title attribute found');
            return 0;
        }

        // Parse date from title like "Feb 22 2012, 05:33"
        const dateMatch = title.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})/);
        if (!dateMatch) {
            console.log('[DEBUG] Date regex did not match');
            return 0;
        }

        const [, month, day, year] = dateMatch;
        //console.log(`[DEBUG] Parsed date parts: month=${month}, day=${day}, year=${year}`);

        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        const torrentDate = new Date(parseInt(year), months[month], parseInt(day));
        const ageInDays = (new Date() - torrentDate) / (1000 * 60 * 60 * 24);

        //console.log(`[DEBUG] Torrent date: ${torrentDate}, Age in days: ${ageInDays}`);

        // Return 0 for invalid dates instead of NaN
        const result = isNaN(ageInDays) ? 0 : Math.max(0, ageInDays);
        //console.log(`[DEBUG] Final age result: ${result}`);
        return result;
    }

    function isQualityTorrent(torrentRow) {
        const qualityImg = torrentRow.querySelector('img[src*="quality.gif"]');
        return qualityImg !== null;
    }

    function calculatePopularityScore(editionData, totalEditions, allEditions) {
        const {
            snatches,
            seeders,
            qualityCount,
            averageAge,
            count,
            torrents
        } = editionData;

        //console.log(`[DEBUG] Calculating score for edition: ${editionData.name}`);
        //console.log(`[DEBUG] Edition data:`, { snatches, seeders, qualityCount, averageAge, count, torrentsLength: torrents.length });

        let totalScore = 0;

        // Calculate score for each individual torrent, then average
        torrents.forEach((torrent, index) => {
            //console.log(`[DEBUG] Processing torrent ${index}:`, torrent);

            let torrentScore = SCORING.BASE_SCORE;
            //console.log(`[DEBUG] Starting torrent score: ${torrentScore}`);

            // Age factor (penalty for older torrents)
            if (WEIGHTS.AGE_FACTOR > 0) {
                const ageInDays = isNaN(torrent.age) ? 0 : torrent.age;
                //console.log(`[DEBUG] Age in days: ${ageInDays}, SCORING.MAX_AGE_DAYS: ${SCORING.MAX_AGE_DAYS}`);
                const ageThreshold = 1095;
                const ageFactor = Math.min(ageInDays / ageThreshold, 1);
                //console.log(`[DEBUG] Age factor: ${ageFactor}`);

                const scaledAgeFactor = Math.pow(ageFactor, 0.5); // Square root scaling
                const agePenalty = scaledAgeFactor * 30 * WEIGHTS.AGE_FACTOR;
                //console.log(`[DEBUG] Scaled age factor: ${scaledAgeFactor}`);
                //console.log(`[DEBUG] Age penalty: ${agePenalty}`);

                torrentScore -= agePenalty;
                //console.log(`[DEBUG] Torrent score after age penalty: ${torrentScore}`);
            }

            const finalTorrentScore = Math.max(0, torrentScore);
            //console.log(`[DEBUG] Final torrent score: ${finalTorrentScore}`);

            totalScore += finalTorrentScore;
            //console.log(`[DEBUG] Running total score: ${totalScore}`);
        });

        // Average the individual torrent scores
        let finalScore = totalScore / count;
        //console.log(`[DEBUG] Average score after torrent processing: ${finalScore}`);

        // Quality torrent factor
        if (WEIGHTS.QUALITY_TORRENT > 0) {
            const qualityPercentage = qualityCount / count;
            //console.log(`[DEBUG] Quality percentage: ${qualityPercentage}`);

            let qualityMultiplier;
            if (qualityPercentage > 0.75) {
                qualityMultiplier = 1.0 + qualityPercentage * 3.0;
            } else if (qualityPercentage > 0.5) {
                qualityMultiplier = 1.0 + qualityPercentage * 2.0;
            } else {
                qualityMultiplier = 1.0 + qualityPercentage * 1.0;
            }
            //console.log(`[DEBUG] Quality multiplier: ${qualityMultiplier}`);

            const qualityPenalty = 25 * qualityMultiplier * WEIGHTS.QUALITY_TORRENT;
            //console.log(`[DEBUG] Quality penalty: ${qualityPenalty}`);

            finalScore -= qualityPenalty;
            //console.log(`[DEBUG] Score after quality penalty: ${finalScore}`);
        }

        // Snatch to seeder ratio
        if (WEIGHTS.SNATCH_RATIO > 0) {
            //console.log(`[DEBUG] Processing snatch ratio. Snatches: ${snatches}, Seeders: ${seeders}`);

            const effectiveSeeders = Math.max(seeders, SCORING.MIN_SEEDERS);
            const snatchRatio = snatches / effectiveSeeders;
            //console.log(`[DEBUG] Effective seeders: ${effectiveSeeders}, Snatch ratio: ${snatchRatio}`);

            const idealRatio = 1.0;
            if (snatchRatio > idealRatio) {
                const excessRatio = snatchRatio - idealRatio;
                //console.log(`[DEBUG] Excess ratio: ${excessRatio}`);

                const maxSnatches = Math.max(...allEditions.map(e => e.snatches));
                const snatchVolumeFactor = maxSnatches > 0 ? snatches / maxSnatches : 0;
                const volumeMultiplier = 1 + (1 - snatchVolumeFactor) * 2.5;
                //console.log(`[DEBUG] Max snatches: ${maxSnatches}, Volume factor: ${snatchVolumeFactor}, Volume multiplier: ${volumeMultiplier}`);

                const ageThreshold = 182; // 6 months in days
                const ageFactor = Math.min(averageAge / ageThreshold, 1);
                const ageMultiplier = 3.0 - (ageFactor * 2.0);
                //console.log(`[DEBUG] Average age: ${averageAge}, Age threshold: ${ageThreshold}, Age factor: ${ageFactor}, Age multiplier: ${ageMultiplier}`);

                const freshThreshold = 182; // 6 months in days
                const matureTorrents = torrents.filter(t => t.age >= freshThreshold).length;
                const maturityPercentage = matureTorrents / torrents.length;
                const freshPercentage = 1 - maturityPercentage;
                //console.log(`[DEBUG] Mature torrents: ${matureTorrents}/${torrents.length}, Maturity %: ${maturityPercentage}, Fresh %: ${freshPercentage}`);

                let maturityMultiplier;
                if (freshPercentage > 0.75) {
                    maturityMultiplier = 1.0 + freshPercentage * 4.0;
                } else if (freshPercentage > 0.5) {
                    maturityMultiplier = 1.0 + freshPercentage * 2.5;
                } else {
                    maturityMultiplier = 1.0 + freshPercentage * 1.0;
                }
                //console.log(`[DEBUG] Maturity multiplier: ${maturityMultiplier}`);

                const basePenalty = Math.min(excessRatio * 15, 50);
                const ratioPenalty = basePenalty * volumeMultiplier * ageMultiplier * maturityMultiplier * WEIGHTS.SNATCH_RATIO;
                //console.log(`[DEBUG] Base penalty: ${basePenalty}, Final ratio penalty: ${ratioPenalty}`);

                finalScore -= ratioPenalty;
                //console.log(`[DEBUG] Score after ratio penalty: ${finalScore}`);
            }
        }

        // Edition count factor (penalty for editions with fewer torrents)
        if (WEIGHTS.EDITION_COUNT > 0 && totalEditions > 1) {
            const editionCountFactor = count / totalEditions; // 0-1, higher is better
            //console.log(`[DEBUG] Edition count factor: ${editionCountFactor}`);
            const editionCountPenalty = (1 - editionCountFactor) * 25 * WEIGHTS.EDITION_COUNT; // 0-25, higher is worse
            //console.log(`[DEBUG] Edition count penalty: ${editionCountPenalty}`);
            finalScore -= editionCountPenalty;
            //console.log(`[DEBUG] Score after edition count penalty: ${finalScore}`);
        }

        // Seeder count factor (bonus for editions with high seeder counts)
        if (WEIGHTS.SEEDER_COUNT > 0 && allEditions) {
            //console.log(`[DEBUG] Processing seeder count bonus`);

            // Calculate average seeders per torrent for fair comparison
            const currentAvgSeeders = seeders / count;
            //console.log(`[DEBUG] Current edition: ${seeders} seeders / ${count} torrents = ${currentAvgSeeders} avg seeders per torrent`);

            // Find the maximum average seeders per torrent across all editions
            const maxAvgSeeders = Math.max(...allEditions.map(e => e.seeders / e.count));
            //console.log(`[DEBUG] Max average seeders per torrent across all editions: ${maxAvgSeeders}`);

            if (maxAvgSeeders > 0) {
                const seederFactor = currentAvgSeeders / maxAvgSeeders; // 0-1, higher is better
                //console.log(`[DEBUG] Seeder factor: ${currentAvgSeeders} / ${maxAvgSeeders} = ${seederFactor}`);

                // Quality torrent adjustment - reduce bonus for editions with high percentage of quality torrents
                const qualityPercentage = qualityCount / count; // 0-1, higher = more quality torrents
                //console.log(`[DEBUG] Quality percentage: ${qualityPercentage}`);

                let qualityAdjustment;

                if (qualityPercentage > 0.75) {
                    // Very high quality percentage (>75%) gets minimal bonus
                    qualityAdjustment = 0.25; // Only 25% of normal bonus
                    //console.log(`[DEBUG] Very high quality percentage (>75%), adjustment: ${qualityAdjustment}`);
                } else if (qualityPercentage > 0.5) {
                    // High quality percentage (50-75%) gets reduced bonus
                    qualityAdjustment = 0.5; // Only 50% of normal bonus
                    //console.log(`[DEBUG] High quality percentage (50-75%), adjustment: ${qualityAdjustment}`);
                } else if (qualityPercentage > 0.25) {
                    // Moderate quality percentage (25-50%) gets slightly reduced bonus
                    qualityAdjustment = 0.75; // 75% of normal bonus
                    //console.log(`[DEBUG] Moderate quality percentage (25-50%), adjustment: ${qualityAdjustment}`);
                } else {
                    // Low quality percentage (<25%) gets full bonus
                    qualityAdjustment = 1.0; // Full bonus
                    //console.log(`[DEBUG] Low quality percentage (<25%), adjustment: ${qualityAdjustment}`);
                }

                const seederBonus = seederFactor * 25 * qualityAdjustment * WEIGHTS.SEEDER_COUNT;
                //console.log(`[DEBUG] Seeder bonus calculation: ${seederFactor} * 25 * ${qualityAdjustment} * ${WEIGHTS.SEEDER_COUNT} = ${seederBonus}`);

                finalScore += seederBonus;
                //console.log(`[DEBUG] Score after seeder bonus: ${finalScore}`);
            } else {
                //console.log(`[DEBUG] Max average seeders is 0, skipping seeder bonus`);
            }
        } else {
            console.log(`[DEBUG] Seeder count weight is 0 or no allEditions data, skipping seeder bonus`);
        }

        const result = Math.max(0, Math.round(finalScore));
        //console.log(`[DEBUG] Final result for ${editionData.name}: ${result}`);
        //console.log(`[DEBUG] =====================================`);

        return result;
    }

    function sortEditions(editions) {
        const sortBy = USER_SETTINGS.SORT_BY.toLowerCase();
        const sortOrder = USER_SETTINGS.SORT_ORDER.toLowerCase();

        // Sort all editions together
        editions.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'popularity':
                    valueA = a.popularityScore;
                    valueB = b.popularityScore;
                    break;
                case 'count':
                    valueA = a.count;
                    valueB = b.count;
                    break;
                case 'seeders':
                    valueA = a.seeders;
                    valueB = b.seeders;
                    break;
                case 'snatches':
                    valueA = a.snatches;
                    valueB = b.snatches;
                    break;
                default:
                    // Default to popularity
                    valueA = a.popularityScore;
                    valueB = b.popularityScore;
            }

            // For string values, use localeCompare
            if (typeof valueA === 'string') {
                const comparison = valueA.localeCompare(valueB);
                return sortOrder === 'asc' ? comparison : -comparison;
            } else {
                // For numeric values
                const comparison = valueA - valueB;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });

        return editions;
    }

    // Global variable to track current filter state
    let currentActiveFilter = null;

    function toggleEditionFilter(editionName) {
        const torrentTable = document.querySelector('#torrent-table');
        if (!torrentTable) return;

        const torrentRows = torrentTable.querySelectorAll('tr.group_torrent.group_torrent_header');
        const filterMode = USER_SETTINGS.FILTER_MODE.toLowerCase();

        // First, reset all rows to visible if we're toggling the same filter or switching filters
        if (currentActiveFilter) {
            torrentRows.forEach(row => {
                row.classList.remove('hidden');
                // Always ensure detail rows are hidden by default when resetting
                const detailRow = getCorrespondingDetailRow(row);
                if (detailRow) {
                    detailRow.classList.remove('hidden');
                    detailRow.classList.add('hidden'); // Always hide detail rows by default
                }
            });
        }

        // Check if we're toggling the same filter (turning it off)
        if (currentActiveFilter === editionName) {
            currentActiveFilter = null;

            // When completely clearing filters, ensure all detail rows are hidden
            torrentRows.forEach(row => {
                const detailRow = getCorrespondingDetailRow(row);
                if (detailRow) {
                    detailRow.classList.add('hidden');
                }
            });

            // Update button states - all buttons inactive
            const editionButtons = document.querySelectorAll('.edition-filter-btn');
            editionButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.backgroundColor = 'transparent';
            });
            return; // Exit here - we've reset everything, no need to apply new filters
        }

        // Apply new filter
        currentActiveFilter = editionName;

        // Get all detected editions for comparison
        const detectedEditions = new Set();
        torrentRows.forEach(row => {
            if (!isOtherSubEdition(row)) {
                const edition = extractEdition(row);
                if (edition) {
                    detectedEditions.add(edition);
                }
            }
        });

        torrentRows.forEach(row => {
            const rowEdition = extractEdition(row);

            if (filterMode === 'exclusive') {
                // Exclusive mode: hide everything except selected edition (including Other/Extras)
                if (rowEdition !== editionName) {
                    row.classList.add('hidden');
                    // Also hide the corresponding detail row
                    const detailRow = getCorrespondingDetailRow(row);
                    if (detailRow) {
                        detailRow.classList.add('hidden');
                    }
                } else {
                    // Even for visible rows, ensure detail rows are hidden by default
                    const detailRow = getCorrespondingDetailRow(row);
                    if (detailRow) {
                        detailRow.classList.add('hidden');
                    }
                }
            } else {
                // Editions only mode: hide only other detected editions, skip Other/Extras
                if (isOtherSubEdition(row)) {
                    // Ensure detail rows for Other/Extras are also hidden by default
                    const detailRow = getCorrespondingDetailRow(row);
                    if (detailRow) {
                        detailRow.classList.add('hidden');
                    }
                    return;
                }

                if (rowEdition !== editionName && detectedEditions.has(rowEdition)) {
                    row.classList.add('hidden');
                    // Also hide the corresponding detail row
                    const detailRow = getCorrespondingDetailRow(row);
                    if (detailRow) {
                        detailRow.classList.add('hidden');
                    }
                } else {
                    // Even for visible rows, ensure detail rows are hidden by default
                    const detailRow = getCorrespondingDetailRow(row);
                    if (detailRow) {
                        detailRow.classList.add('hidden');
                    }
                }
            }
        });

        // Update button states
        const editionButtons = document.querySelectorAll('.edition-filter-btn');
        editionButtons.forEach(btn => {
            if (btn.dataset.edition === editionName) {
                btn.classList.add('active');
                btn.style.backgroundColor = '#4a90e2';
            } else {
                btn.classList.remove('active');
                btn.style.backgroundColor = 'transparent';
            }
        });
    }

    function getCorrespondingDetailRow(headerRow) {
        // Extract the ID from the header row (e.g., "group_torrent_header_134308")
        const headerId = headerRow.id;
        if (!headerId || !headerId.startsWith('group_torrent_header_')) {
            return null;
        }

        // Get the torrent ID (e.g., "134308")
        const torrentId = headerId.replace('group_torrent_header_', '');

        // Find the corresponding detail row (e.g., "torrent_134308")
        const detailRowId = `torrent_${torrentId}`;
        return document.getElementById(detailRowId);
    }

    // Combine default and custom ignore tags
    function getAllIgnoreTags() {
        return [...IGNORE_TAGS, ...USER_SETTINGS.CUSTOM_IGNORE_TAGS];
    }

    // Settings management functions
    async function saveSettings() {
        if (typeof GM !== "undefined" && GM.setValue) {
            await GM.setValue('ptp-alternate-versions-settings', JSON.stringify(USER_SETTINGS));
        } else {
            localStorage.setItem('ptp-alternate-versions-settings', JSON.stringify(USER_SETTINGS));
        }
    }

    async function loadSettings() {
        let saved;
        if (typeof GM !== "undefined" && GM.getValue) {
            saved = await GM.getValue('ptp-alternate-versions-settings');
        } else {
            saved = localStorage.getItem('ptp-alternate-versions-settings');
        }
        if (saved) {
            try {
                const parsedSettings = JSON.parse(saved);
                Object.assign(USER_SETTINGS, parsedSettings);
            } catch (e) {
                console.log('[DEBUG] Failed to load settings:', e);
            }
        }
    }

    function addCustomIgnoreTag(tag) {
        if (tag && !USER_SETTINGS.CUSTOM_IGNORE_TAGS.includes(tag)) {
            USER_SETTINGS.CUSTOM_IGNORE_TAGS.push(tag);
            saveSettings();
            refreshPanels(); // Refresh to apply new ignore tag
        }
    }

    function removeCustomIgnoreTag(tag) {
        const index = USER_SETTINGS.CUSTOM_IGNORE_TAGS.indexOf(tag);
        if (index > -1) {
            USER_SETTINGS.CUSTOM_IGNORE_TAGS.splice(index, 1);
            saveSettings();
            refreshPanels(); // Refresh to apply changes
        }
    }

    function refreshPanels() {
        // Remove existing panels
        const existingPanel = document.getElementById('alternate-versions-panel');
        const existingSettings = document.getElementById('settings-panel');
        if (existingPanel) existingPanel.remove();
        if (existingSettings) existingSettings.remove();
        
        // Re-run main function
        main();
    }

    let customTagsListElement = null;

    function updateCustomTagsList() {
        if (!customTagsListElement) return;
        
        customTagsListElement.innerHTML = '';
        
        if (USER_SETTINGS.CUSTOM_IGNORE_TAGS.length === 0) {
            customTagsListElement.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px;">No custom tags added</div>';
            return;
        }

        USER_SETTINGS.CUSTOM_IGNORE_TAGS.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 3px 5px;
                margin: 2px 0;
                background: #3a3a3a;
                border-radius: 3px;
            `;

            const tagText = document.createElement('span');
            tagText.textContent = tag;
            tagText.style.fontSize = '0.9em';

            const removeButton = document.createElement('button');
            removeButton.textContent = '×';
            removeButton.style.cssText = `
                background: #d32f2f;
                color: white;
                border: none;
                border-radius: 3px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                font-size: 12px;
                line-height: 1;
            `;

            removeButton.addEventListener('click', () => {
                removeCustomIgnoreTag(tag);
                updateCustomTagsList();
            });

            tagItem.appendChild(tagText);
            tagItem.appendChild(removeButton);
            customTagsListElement.appendChild(tagItem);
        });
    }

    // Create settings panel
    function createSettingsPanel(editions) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'settings-panel';
        panel.style.display = USER_SETTINGS.SHOW_SETTINGS ? 'block' : 'none';

        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.innerHTML = '<span class="panel__heading__title">Alternate Versions Settings</span>';

        const body = document.createElement('div');
        body.className = 'panel__body';
        body.style.padding = '10px';

        // --- User Settings Controls ---
        // Sort By
        const sortByLabel = document.createElement('label');
        sortByLabel.textContent = 'Sort by: ';
        const sortBySelect = document.createElement('select');
        ['popularity', 'name', 'count', 'seeders', 'snatches'].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (USER_SETTINGS.SORT_BY === opt) option.selected = true;
            sortBySelect.appendChild(option);
        });
        sortBySelect.addEventListener('change', () => {
            USER_SETTINGS.SORT_BY = sortBySelect.value;
            saveSettings();
            refreshPanels();
        });

        // Sort Order
        const sortOrderLabel = document.createElement('label');
        sortOrderLabel.textContent = 'Order: ';
        const sortOrderSelect = document.createElement('select');
        ['asc', 'desc'].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt.toUpperCase();
            if (USER_SETTINGS.SORT_ORDER === opt) option.selected = true;
            sortOrderSelect.appendChild(option);
        });
        sortOrderSelect.addEventListener('change', () => {
            USER_SETTINGS.SORT_ORDER = sortOrderSelect.value;
            saveSettings();
            refreshPanels();
        });

        // Filter Mode
        const filterModeLabel = document.createElement('label');
        filterModeLabel.textContent = 'Filter mode: ';
        const filterModeSelect = document.createElement('select');
        [['exclusive', 'Exclusive'], ['editions_only', 'Editions Only']].forEach(([val, txt]) => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = txt;
            if (USER_SETTINGS.FILTER_MODE === val) option.selected = true;
            filterModeSelect.appendChild(option);
        });
        filterModeSelect.addEventListener('change', () => {
            USER_SETTINGS.FILTER_MODE = filterModeSelect.value;
            saveSettings();
            refreshPanels();
        });

        // Show Stats
        const showStatsLabel = document.createElement('label');
        showStatsLabel.textContent = 'Show stats: ';
        const showStatsSelect = document.createElement('select');
        [['all', 'All'], ['minimal', 'Minimal'], ['name', 'Name Only']].forEach(([val, txt]) => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = txt;
            if (USER_SETTINGS.SHOW_STATS === val) option.selected = true;
            showStatsSelect.appendChild(option);
        });
        showStatsSelect.addEventListener('change', () => {
            USER_SETTINGS.SHOW_STATS = showStatsSelect.value;
            saveSettings();
            refreshPanels();
        });

        // --- Add all controls to body ---
        [sortByLabel, sortBySelect, sortOrderLabel, sortOrderSelect, filterModeLabel, filterModeSelect, showStatsLabel, showStatsSelect].forEach(el => {
            el.style.marginRight = '10px';
            body.appendChild(el);
        });

        body.appendChild(document.createElement('hr'));

        // --- Add Edition Ignore Controls ---
        const ignoreLabel = document.createElement('div');
        ignoreLabel.textContent = 'Add edition to ignore:';
        ignoreLabel.style.margin = '10px 0 5px 0';
        body.appendChild(ignoreLabel);

        const editionList = document.createElement('ul');
        editionList.style.listStyle = 'none';
        editionList.style.padding = '0';
        editionList.style.margin = '0';

        editions.forEach(edition => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '4px';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = edition.name;
            nameSpan.style.flex = '1';

            const addBtn = document.createElement('button');
            addBtn.textContent = 'Add to ignore';
            addBtn.style.cssText = `
                margin-left: 8px;
                background: #d32f2f;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 2px 8px;
                cursor: pointer;
                font-size: 0.9em;
            `;
            addBtn.addEventListener('click', () => {
                addCustomIgnoreTag(edition.name);
                updateCustomTagsList();
            });

            li.appendChild(nameSpan);
            li.appendChild(addBtn);
            editionList.appendChild(li);
        });
        body.appendChild(editionList);

        // --- Custom ignore tags management ---
        body.appendChild(document.createElement('hr'));
        const customTagsLabel = document.createElement('div');
        customTagsLabel.textContent = 'Custom ignore tags:';
        customTagsLabel.style.margin = '10px 0 5px 0';
        body.appendChild(customTagsLabel);

        const tagsList = document.createElement('div');
        tagsList.id = 'custom-tags-list';
        tagsList.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #444;
            background: #2a2a2a;
            border-radius: 3px;
            padding: 5px;
        `;
        customTagsListElement = tagsList;
        body.appendChild(tagsList);

        // Add new tag input
        const addSection = document.createElement('div');
        addSection.style.marginTop = '10px';
        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = 'Enter tag to ignore...';
        addInput.style.cssText = `
            width: 60%;
            padding: 5px;
            border: 1px solid #444;
            background: #2a2a2a;
            color: white;
            border-radius: 3px;
            margin-right: 5px;
        `;
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Tag';
        addButton.style.cssText = `
            padding: 5px 10px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.9em;
        `;
        addButton.addEventListener('click', () => {
            const tag = addInput.value.trim();
            if (tag) {
                addCustomIgnoreTag(tag);
                addInput.value = '';
                updateCustomTagsList();
            }
        });
        addInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addButton.click();
        });
        addSection.appendChild(addInput);
        addSection.appendChild(addButton);
        body.appendChild(addSection);

        panel.appendChild(heading);
        panel.appendChild(body);

        // Initialize the custom tags list
        updateCustomTagsList();

        return panel;
    }

    // --- MAIN PANEL ---
    function createAlternateVersionsPanel(editions) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'alternate-versions-panel';

        // Panel heading with settings button
        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.innerHTML = `
            <span class="panel__heading__title">Alternate Versions</span>
            <span style="float: right; font-size: 0.9em;">
                <a id="altver-settings-btn" style="cursor: pointer;">(Settings)</a>
            </span>
        `;

        // Settings button click handler
        setTimeout(() => {
            const settingsBtn = document.getElementById('altver-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    USER_SETTINGS.SHOW_SETTINGS = !USER_SETTINGS.SHOW_SETTINGS;
                    saveSettings();
                    const settingsPanel = document.getElementById('settings-panel');
                    if (settingsPanel) {
                        settingsPanel.style.display = USER_SETTINGS.SHOW_SETTINGS ? 'block' : 'none';
                    }
                });
            }
        }, 0);

        const body = document.createElement('div');
        body.className = 'panel__body';

        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';
        list.style.margin = '0';

        editions.forEach(edition => {
            const listItem = document.createElement('li');
            listItem.style.padding = '6px 0';
            listItem.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

            const button = document.createElement('button');
            button.className = 'edition-filter-btn';
            button.dataset.edition = edition.name;
            button.style.cssText = `
                width: 100%;
                background: transparent;
                border: 1px solid rgba(255,255,255,0.2);
                color: inherit;
                padding: 8px 10px;
                cursor: pointer;
                border-radius: 3px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background-color 0.2s;
                font-size: 1.1em;
            `;

            button.addEventListener('click', () => toggleEditionFilter(edition.name));
            button.addEventListener('mouseenter', () => {
                if (!button.classList.contains('active')) {
                    button.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
            });
            button.addEventListener('mouseleave', () => {
                if (!button.classList.contains('active')) {
                    button.style.backgroundColor = 'transparent';
                }
            });

            const leftDiv = document.createElement('div');
            const showStats = USER_SETTINGS.SHOW_STATS.toLowerCase();

            if (showStats === 'name') {
                leftDiv.innerHTML = `<strong>${edition.name}</strong>`;
            } else {
                leftDiv.innerHTML = `<strong>${edition.name}</strong>`;
                if (edition.count > 1) {
                    leftDiv.innerHTML += ` <span style="color: #888; font-size: 0.9em;">(${edition.count})</span>`;
                }
            }

            const rightDiv = document.createElement('div');
            rightDiv.style.fontSize = '1em';
            rightDiv.style.color = '#aaa';
            rightDiv.style.display = 'flex';
            rightDiv.style.alignItems = 'center';
            rightDiv.style.gap = '8px';

            if (showStats === 'name') {
                rightDiv.style.display = 'none';
            } else if (showStats === 'minimal') {
                rightDiv.innerHTML = `<span>↑${edition.seeders}</span>`;
            } else {
                rightDiv.innerHTML = `
                    <span style="font-size: 0.9em; color: #ffa500;">★${edition.popularityScore}</span>
                    <span>↓${edition.snatches} ↑${edition.seeders}</span>
                `;
            }

            button.appendChild(leftDiv);
            button.appendChild(rightDiv);
            listItem.appendChild(button);
            list.appendChild(listItem);
        });

        body.appendChild(list);
        panel.appendChild(heading);
        panel.appendChild(body);

        return panel;
    }

    async function main() {
        await loadSettings();

        // Find the torrent table
        const torrentTable = document.querySelector('#torrent-table');
        if (!torrentTable) return;

        // Get all torrent rows
        const torrentRows = torrentTable.querySelectorAll('tr.group_torrent.group_torrent_header');
        if (torrentRows.length === 0) return;

        // Extract editions from each row
        const editionData = {};
        torrentRows.forEach(row => {
            // Skip if this is under an "Other" sub-edition
            if (isOtherSubEdition(row)) {
                return;
            }

            const edition = extractEdition(row);
            const stats = extractTorrentStats(row);
            const age = extractTorrentAge(row);
            const isQuality = isQualityTorrent(row);

            if (edition) {
                if (!editionData[edition]) {
                    editionData[edition] = {
                        name: edition,
                        count: 0,
                        snatches: 0,
                        seeders: 0,
                        qualityCount: 0,
                        totalAge: 0,
                        averageAge: 0,
                        torrents: []
                    };
                }

                // Store individual torrent data
                editionData[edition].torrents.push({
                    snatches: stats.snatches,
                    seeders: stats.seeders,
                    age: age,
                    isQuality: isQuality
                });

                editionData[edition].count++;
                editionData[edition].snatches += stats.snatches;
                editionData[edition].seeders += stats.seeders;
                editionData[edition].qualityCount += isQuality ? 1 : 0;
                editionData[edition].totalAge += age;
                editionData[edition].averageAge = editionData[edition].totalAge / editionData[edition].count;
            }
        });

        // Calculate popularity scores
        const totalEditions = Object.keys(editionData).length;
        const allEditions = Object.values(editionData);
        allEditions.forEach(edition => {
            edition.popularityScore = calculatePopularityScore(edition, totalEditions, allEditions);
        });

        // Normalize scores so highest edition gets 100
        if (allEditions.length > 0) {
            const maxScore = Math.max(...allEditions.map(e => e.popularityScore));
            if (maxScore > 0) {
                allEditions.forEach(edition => {
                    edition.popularityScore = Math.round((edition.popularityScore / maxScore) * 100);
                });
            }
        }

        // Convert to array and sort using user settings
        const editions = sortEditions(Object.values(editionData));

        // Only show panel if there are non-theatrical editions
        const hasNonTheatrical = editions.some(edition => edition.name !== 'Theatrical');
        if (!hasNonTheatrical) return;

        // Find the sidebar and album art panel
        const sidebar = document.querySelector('.sidebar');
        const albumArtPanel = sidebar?.querySelector('.box_albumart.panel');
        if (!sidebar || !albumArtPanel) return;

        // Remove old panels if they exist (but only once, not on every toggle)
        const oldAlt = document.getElementById('alternate-versions-panel');
        const oldSet = document.getElementById('settings-panel');
        if (oldAlt) oldAlt.remove();
        if (oldSet) oldSet.remove();

        // Create both panels
        const alternateVersionsPanel = createAlternateVersionsPanel(editions);
        const settingsPanel = createSettingsPanel(editions);

        // Always insert both panels directly after album art
        let insertAfter = albumArtPanel;
        insertAfter.parentNode.insertBefore(alternateVersionsPanel, insertAfter.nextSibling);
        insertAfter.parentNode.insertBefore(settingsPanel, alternateVersionsPanel.nextSibling);

        // Show/hide settings panel only
        settingsPanel.style.display = USER_SETTINGS.SHOW_SETTINGS ? 'block' : 'none';
    }

    // Run when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();