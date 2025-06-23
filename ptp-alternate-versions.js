// ==UserScript==
// @name         PTP - Alternate Versions Sidebar
// @version      1.5.3
// @description  Add alternate versions tracking to the sidebar
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @downloadURL  https://raw.githubusercontent.com/Audionut/add-trackers/refs/heads/main/ptp-alternate-versions.js
// @updateURL    https://raw.githubusercontent.com/Audionut/add-trackers/refs/heads/main/ptp-alternate-versions.js
// @grant        GM.getValue
// @grant        GM.setValue
// @require      https://raw.githubusercontent.com/Audionut/add-trackers/refs/heads/main/distributors.js
// ==/UserScript==

(function () {
    "use strict";

    // Manual settings
    // how long to wait (ms) after adjusting slider before refreshing popularity score
    const REFRESH_DELAY = 500;
    // Shot link in link box to add unignore tags when only one edition and no side bar
    const add_unignore_link = true;

    // USER SETTINGS - Adjust these to customize behavior
    const USER_SETTINGS = {
        SORT_BY: 'popularity',       // Options: 'name', 'popularity', 'count', 'seeders', 'snatches'
        SORT_ORDER: 'desc',          // Options: 'asc' (ascending), 'desc' (descending)
        FILTER_MODE: 'exclusive',    // Options: 'editions_only' (hide other editions), 'exclusive' (show only selected edition)
        SHOW_STATS: 'all',            // Options: 'name' (name only), 'minimal' (name + seeders), 'all' (all stats)
        SHOW_SETTINGS: true,           // New: toggle for settings panel
        CUSTOM_IGNORE_TAGS: [],          // New: user-defined ignore tags
        CUSTOM_UNIGNORE_TAGS: [],         // New: user-defined unignore tags
        INCLUDE_DVD_FORMATS: false      // New: include DVD5/DVD9 in disc penalty
    };

    // POPULARITY SCORE WEIGHTING CONSTANTS (adjust these to fine-tune scoring)
    // Set to 0 to disable a factor, 1 for full weight, values between 0-1 for partial weight
    const WEIGHTS = {
        QUALITY_TORRENT: 0.2,    // Weight for high quality torrents (0 = no effect, 1 = full penalty for GP torrents (which naturally have higher seeds regardless of edition))
        AGE_FACTOR: 0.0,         // Weight for torrent age (0 = no effect, 1 = full penalty for older torrents)
        SNATCH_RATIO: 0.4,      // Weight for snatch/seeder ratio (0 = no effect, 1 = full penalty for poor ratio)
        EDITION_COUNT: 0.5,     // Weight for number of torrents in edition (0 = no effect, 1 = full penalty for lesser torrents)
        SEEDER_COUNT: 0.6,        // Weight for high seeder count (0 = no effect, 1 = full bonus for highest seeders)
        SEEDER_AVG_WEIGHT: 0.5,         // Weight for average seeders (0-1)
        SEEDER_TOTAL_WEIGHT: 0.5,        // Weight for total seeders (0-1)
        THEATRICAL_PENALTY: 0.0, // Weight for Theatrical editions (0 = no effect, 1 = full penalty for Theatrical editions)
        DISC_PENALTY: 0.0       // Weight for disc-based content
    };

    // Additional scoring constants
    const SCORING = {
        MAX_AGE_DAYS: 7300,       // Maximum age to consider for scoring
        BASE_SCORE: 100,         // Base score to start with before applying penalties/bonuses
        MIN_SEEDERS: 1           // Minimum seeders to avoid division by zero
    };

    const THRESHOLDS = {
        AGE_THRESHOLD: 712,      // Default: 182 days (~6 months)
        FRESH_THRESHOLD: 356     // Default: 182 days (~6 months)
    };

    let refreshTimer = null;

    // Define video/audio attributes and other tags to ignore
    const IGNORE_TAGS = [
        // Video formats
        '480p', '576p', '720p', '1080p', '1080i', '2160p', '4K', 'UHD',
        // Codecs
        'x264', 'x265', 'H.264', 'H.265', 'HEVC', 'AVC', 'XviD', 'DivX', 'VC-1', 'AV1',
        // Containers
        'MKV', 'MP4', 'AVI', 'WMV', 'M2TS', 'VOB', 'IFO', 'VOB IFO', 'ISO', 'Remux', 'm2ts',
        // Sources
        'Blu-ray', 'BluRay', 'BD', 'DVD', 'DVD5', 'DVD9', 'WEB-DL', 'WEBDL', 'WEBRip', 'HDTV', 'TV', 'PAL', 'NTSC', 'HD-DVD',
        // Blu-ray disc types
        'BD25', 'BD33', 'BD50', 'BD66', 'BD100', '4K Remaster', '4K Restoration',
        // Audio
        'DTS', 'AC3', 'AAC', 'MP3', 'FLAC', 'TrueHD', 'Atmos', 'Dolby Atmos', 'DDP', 'OPUS', 'DTS-X', 'DTS-HD', 'DTS:X', 'Dual Audio',
        // HDR
        'HDR', 'HDR10', 'HDR10+', 'Dolby Vision', 'DoVi', '10-bit', 'DV', 'DV HDR', 'DV HDR10', 'DV HDR10+', 'Dolby Vision HDR10', 'Dolby Vision HDR10+',
        // Commentary
        'With Commentary', 'Commentary',
        // Groups (last tag pattern)
        /^[A-Z0-9]{2,10}$/i,
        // Site tags
        'Downloaded', 'Snatched', 'Seeding', 'Trumpable', 'Release Group', 'Scene', 'Freeleech!', 'Half Leech!', 'Neutral Leech!', 'Half-Leech!', 'Freeleech', 'Half Leech', 'Neutral Leech', 'Half-Leech',
        // Legitimate edition tags that are not Alternate Versions
        'Masters of Cinema', 'Collection', 'StudioCanal', 'Kino Lorber', 'Anniversary', 'Lionsgate', 'Medusa', 'English Dub'
    ];

    // Boxset/Collection editions to ignore
    const BOXSET_KEYWORDS = [
        'Collector\'s',
        'Definitive',
        'Box Set',
        'Boxset',
        'Disc Set',
        'Collection',
        'Anthology',
        '2D/3D',
        '2-Disc',
        '3-Disc',
        '4-Disc',
        '5-Disc',
        '6-Disc'
    ];

    const COMBINED_EDITIONS = [
        '2in1',
        '3in1',
        '4in1',
        '5in1'
    ];

    const singleEditionExceptions = [
        'black & chrome',
        'black & white',
        'source'
    ];

    const userSettingTooltips = {
        filterMode: "Exclusive: Show only selected edition and hide everything else. Editions Only: Hide only the other detected editions.",
        showStats: "Name: Name only. Minimal: Name + seeder count. All: Name, Torrent count, Popularity core, Snatched count, Seeder count."
    };

    const weightTooltips = {
        QUALITY_TORRENT: "GP torrents naturally have a higher seedcount regardless of edition. Adjust the penalty applied to GP torrents to account for their natural increased seedcount advantage not indicative of edition desirability.",
        AGE_FACTOR: "Older torrents can gather more seeders over time. Adjust the penalty applied to older torrents to offset any naturally increased seedcount advantage not indicative of edition desirability.",
        SNATCH_RATIO: "This will apply a penalty for any editions with increased snatched/seeder ratio, which potentially indicates less desirable editions. A sliding scale, so that an edition with 1000 snatches and 100 seeders, gets less penalty than an edition with 100 snatches and 10 seeders, even though they have the same snatch ratio.",
        EDITION_COUNT: "This will apply a penalty for any editions that have less torrent on site. More torrents in an edition potentially indicates more deseriability. It also helps to offset editions with low (1-2) torrent counts that have better 'stats', because there's less torrents with which to generate useful averages.",
        SEEDER_COUNT: "This will appply a bonus for editions with more seeders. Uses an average, so that an edition with 5 torrents and with 300 seeders, will get more bonus than an edition with 10 torrents and also with 300 seeders.",
        THEATRICAL_PENALTY: "This will apply an additional penalty to Theatrical editions, which may have a natural advantage that is not indicative of edition desirability."
    };

    const thresholdTooltips = {
        AGE_THRESHOLD: "The number of days after which a torrent is considered 'old' for age-based penalties. Penalty scales with age so that as torrents get even older, penalties are increased.",
        FRESH_THRESHOLD: "(Snatch Ratio only) The number of days used to determine if a torrent is 'fresh'. This is the tipping point for the snatch ratio penalty, so that torrents younger than this are penalised more as their age decreases. Younger torrents are more likely to have excellnt snatch ratios",
    };

    function isIgnoredTag(tag) {
        if (tag.toLowerCase().includes('final cut') || tag.toLowerCase().includes('redux') || (tag.toLowerCase().includes('uncut')) || (tag.toLowerCase().includes('unrated')) || (tag.toLowerCase().includes('source'))) {
            return false;
        }
        // Check custom unignore list first - these tags are never ignored
        if (USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.some(unignored => {
            const tagLower = tag.toLowerCase();
            const unignoredLower = unignored.toLowerCase();

            // Exact match or contains match
            return tagLower === unignoredLower || tagLower.includes(unignoredLower);
        })) {
            return false; // Never ignore if in unignore list
        }

        const allIgnoreTags = getAllIgnoreTags();
        return allIgnoreTags.some(ignored => {
            if (ignored instanceof RegExp) {
                return ignored.test(tag);
            }

            // Exact match first
            if (tag.toLowerCase() === ignored.toLowerCase()) {
                return true;
            }

            const strippedTag = tag.replace(/\s*\([^)]*\)/g, '').trim();
            if (strippedTag.toLowerCase() === ignored.toLowerCase()) {
                return true;
            }

            // Check if tag matches ignored pattern with year in brackets
            const tagLower = tag.toLowerCase();
            const ignoredLower = ignored.toLowerCase();

            const yearPattern = /\s*\(\d{4}\)$/;
            if (tagLower.startsWith(ignoredLower) && yearPattern.test(tagLower)) {
                const tagWithoutYear = tagLower.replace(yearPattern, '').trim();
                if (tagWithoutYear === ignoredLower) {
                    return true;
                }
            }

            return false;
        });
    }

    function isBoxsetEdition(tag) {
        // Fuzzy match: ignore if the tag contains a boxset keyword (case-insensitive, as a word)
        const lowerTag = tag.toLowerCase().trim();
        return BOXSET_KEYWORDS.some(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            // Exact match or substring match (as a word)
            if (lowerTag === lowerKeyword) return true;
            if (lowerTag.replace(/\s+/g, ' ') === lowerKeyword) return true;
            // Fuzzy: keyword appears anywhere in the tag (as a word, not just substring)
            // e.g. "Ultimate Collector's Edition" matches "Collector's Edition"
            if (lowerTag.includes(lowerKeyword)) return true;
            // Fuzzy: keyword appears as a separate word (e.g. "4K Restoration" matches "Restoration")
            if (lowerTag.split(/[\s/-]+/).some(word => lowerKeyword.includes(word) || word.includes(lowerKeyword))) return true;
            return false;
        });
    }

    function isCombinedEdition(tag) {
        const lowerTag = tag.toLowerCase().trim();
        return COMBINED_EDITIONS.some(combined => {
            const lowerCombined = combined.toLowerCase();

            if (lowerTag === lowerCombined) return true;
            if (lowerTag.replace(/\s+/g, ' ') === lowerCombined) return true;
            if (lowerTag.includes(lowerCombined)) return true;

            return false;
        });
    }

    function getEditionBase(name) {
        return name.trim();
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

    function isPotentialCombinedEditionComponent(tag) {
        // Extract all individual components from combined editions
        const combinedComponents = COMBINED_EDITIONS.flatMap(combined =>
            combined.split(/\s*\/\s*/).map(part => part.trim().toLowerCase())
        );

        return combinedComponents.includes(tag.toLowerCase().trim());
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

        //console.log('[DEBUG] All tags:', tags);

        // Remove ignored tags and find potential editions
        const relevantTags = tags.filter(tag => {
            // Don't filter out potential combined edition components yet
            if (isPotentialCombinedEditionComponent(tag)) {
                return true; // Keep it for now
            }
            return !isIgnoredTag(tag);
        });

        //console.log('[DEBUG] Relevant tags:', relevantTags);

        // If any relevant tag is *exactly* a boxset keyword, ignore this torrent
        if (relevantTags.some(tag => isBoxsetEdition(tag))) {
            // But only if ALL relevant tags are boxset keywords, otherwise keep the edition
            const allBoxset = relevantTags.every(tag => isBoxsetEdition(tag));
            //console.log('[DEBUG] All relevant tags are boxset:', allBoxset, relevantTags);
            if (allBoxset) {
                //console.log('[DEBUG] Ignoring row because all relevant tags are boxset:', tags);
                return 'Theatrical'; // Ignore boxset-only editions completely
            }
        }

        // Check for multiple editions in a single tag (e.g., "Theatrical Cut & Special Edition")
        const multiEditionPattern = /(&|and|\+)/i;
        const hasMultipleEditions = relevantTags.some(tag => {
            // Skip known single editions that contain &
            const tagLower = tag.toLowerCase();
            if (singleEditionExceptions.some(exception => tagLower.includes(exception))) {
                return false;
            }
            return multiEditionPattern.test(tag);
        });
        if (hasMultipleEditions) {
            //console.log('[DEBUG] Ignoring row because of multiple editions in a tag:', relevantTags);
            return null; // Ignore torrents with multiple editions
        }

        // If multiple relevant tags found, prefer the first non-boxset tag as edition
        if (relevantTags.length > 1) {
            //console.log('[DEBUG] Multiple relevant tags:', relevantTags);

            // Check if ANY of the relevant tags is a combined edition
            if (relevantTags.some(tag => isCombinedEdition(tag))) {
                //console.log('[DEBUG] Found combined edition in tags, skipping all:', relevantTags);
                return null; // Skip all tags if any match combined editions
            }

            // Pick the first tag that is NOT a boxset keyword
            const nonBoxset = relevantTags.find(tag => {
                const isBoxset = isBoxsetEdition(tag);
                // console.log(`[DEBUG] Tag "${tag}" is boxset:`, isBoxset);
                return !isBoxset;
            });
            if (nonBoxset) {
                //console.log('[DEBUG] Returning non-boxset edition:', nonBoxset);
                return nonBoxset;
            }
            // If all are boxset
            // console.log('[DEBUG] All relevant tags are boxset (should not reach here):', relevantTags);
            return 'Theatrical'; // Default to Theatrical if all are boxset
        }

        // If we have exactly one relevant tag, use it as the edition
        if (relevantTags.length === 1) {
            const tag = relevantTags[0];
            // Check if the single tag is a combined edition
            if (isCombinedEdition(tag)) {
                //console.log('[DEBUG] Single tag is combined edition, skipping:', tag);
                return null;
            }
            // Normalize "Theatrical Cut" variations to just "Theatrical"
            //if (tag.toLowerCase().includes('theatrical')) {
                // console.log('[DEBUG] Returning Theatrical for:', tag);
            //    return 'Theatrical';
            //}
            // console.log('[DEBUG] Returning single relevant tag as edition:', tag);
            return tag;
        }

        // No relevant tags found, default to Theatrical
        // console.log('[DEBUG] No relevant tags found, defaulting to Theatrical');
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
        // Find the corresponding detail row
        const headerId = torrentRow.id;
        if (!headerId || !headerId.startsWith('group_torrent_header_')) {
            return 0;
        }
        const torrentId = headerId.replace('group_torrent_header_', '');
        const detailRow = document.getElementById(`torrent_${torrentId}`);
        if (!detailRow) {
            console.log('[DEBUG] No detail row found');
            return 0;
        }

        // Find the .time element inside the detail row
        const timeCell = detailRow.querySelector('.time');
        if (!timeCell) {
            console.log('[DEBUG] No .time element found in detail row');
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
        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        const torrentDate = new Date(parseInt(year), months[month], parseInt(day));
        const ageInDays = (new Date() - torrentDate) / (1000 * 60 * 60 * 24);

        const result = isNaN(ageInDays) ? 0 : Math.max(0, ageInDays);
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
            let torrentScore = SCORING.BASE_SCORE;

            // Remove AGE_FACTOR and QUALITY_TORRENT from here!
            // They are now only used in snatch_ratio and seeder_count below.

            // Theatrical penalty
            if (
                WEIGHTS.THEATRICAL_PENALTY > 0 &&
                (editionData.name.toLowerCase() === 'theatrical' ||
                editionData.name.toLowerCase().includes('theatrical'))
            ) {
                const theatricalPenalty = SCORING.BASE_SCORE * WEIGHTS.THEATRICAL_PENALTY / 3;
                torrentScore -= theatricalPenalty;
            }

            const finalTorrentScore = Math.max(0, torrentScore);
            totalScore += finalTorrentScore;
        });

        // Average the individual torrent scores
        let finalScore = totalScore / count;
        //console.log(`[DEBUG] Average score after torrent processing: ${finalScore}`);

        // Snatch to seeder ratio
        if (WEIGHTS.SNATCH_RATIO > 0) {
          //console.log(`[DEBUG] === SNATCH RATIO SCORING for ${editionData.name} ===`);
          //console.log(`[DEBUG] Raw stats - Snatches: ${snatches}, Seeders: ${seeders}, Count: ${count}`);

          const effectiveSeeders = Math.max(seeders, SCORING.MIN_SEEDERS);
          //console.log(`[DEBUG] Effective seeders: ${effectiveSeeders} (MIN_SEEDERS: ${SCORING.MIN_SEEDERS})`);

          const snatchRatio = snatches / effectiveSeeders;
          //console.log(`[DEBUG] Snatch ratio: ${snatchRatio.toFixed(2)} (${snatches}/${effectiveSeeders})`);

          const idealRatio = 1.0;
          //console.log(`[DEBUG] Ideal ratio: ${idealRatio}, Excess: ${(snatchRatio - idealRatio).toFixed(2)}`);

          const maxSnatches = Math.max(...allEditions.map(e => e.snatches));
          const snatchVolumeFactor = maxSnatches > 0 ? snatches / maxSnatches : 0;

          // Logarithmic volume penalty with knee at 5%
          const volumeRatio = Math.max(0.001, snatchVolumeFactor);
          const kneeThreshold = 0.05; // 5% threshold

          let volumeMultiplier;
          if (volumeRatio <= kneeThreshold) {
              // Below 5%: Apply steeper penalty
              const normalPenalty = Math.log10(1 / volumeRatio) * 1.5;
              const kneeBonus = Math.log10(1 / kneeThreshold) * 1.5; // What penalty would be at 5%
              const extraPenalty = (normalPenalty - kneeBonus) * 2.0; // Additional penalty factor
              volumeMultiplier = 1 + kneeBonus + Math.abs(extraPenalty); // Ensure it's always > 1
          } else {
              // Above 5%: Normal log curve
              volumeMultiplier = 1 + Math.log10(1 / volumeRatio) * 1.5;
          }

          //console.log(`[DEBUG] Volume ratio: ${volumeRatio.toFixed(6)}`);
          //console.log(`[DEBUG] Volume multiplier: ${volumeMultiplier.toFixed(3)} (knee at ${(kneeThreshold*100)}%)`);
          if (volumeRatio <= kneeThreshold) {
              //console.log(`[DEBUG] Below knee threshold - applying enhanced penalty`);
          }

          if (snatchRatio > idealRatio) {
              //console.log(`[DEBUG] Snatch ratio exceeds ideal - applying penalty`);

              const excessRatio = snatchRatio - idealRatio;
              //console.log(`[DEBUG] Excess ratio: ${excessRatio.toFixed(2)}`);

              // Calculate per-torrent age and fresh penalties, then average them
              let totalAgeMultiplier = 0;
              let totalMaturityMultiplier = 0;

              //console.log(`[DEBUG] Calculating per-torrent penalties for ${torrents.length} torrents:`);

              torrents.forEach((torrent, index) => {
                  // Per-torrent age penalty - penalizes OLDER torrents more
                  const ageThreshold = THRESHOLDS.AGE_THRESHOLD;
                  const ageFactor = ageThreshold / Math.max(torrent.age, 1);
                  const agePenalty = Math.pow(ageFactor, 0.5) * WEIGHTS.AGE_FACTOR;
                  const torrentAgeMultiplier = 1 + agePenalty;
                  totalAgeMultiplier += torrentAgeMultiplier;

                  // Per-torrent fresh penalty - penalizes YOUNGER torrents with high snatch ratios more
                  const freshThreshold = THRESHOLDS.FRESH_THRESHOLD;
                  let torrentMaturityMultiplier = 1.0;

                  if (torrent.age < freshThreshold) {
                      const freshnessFactor = Math.max(0, (freshThreshold - torrent.age) / freshThreshold);
                      if (freshnessFactor > 0.75) {
                          torrentMaturityMultiplier = 1.0 + freshnessFactor * 2.0;
                      } else if (freshnessFactor > 0.5) {
                          torrentMaturityMultiplier = 1.0 + freshnessFactor * 1.5;
                      } else {
                          torrentMaturityMultiplier = 1.0 + freshnessFactor * 1.0;
                      }
                      //console.log(`[DEBUG] Torrent ${index}: age=${torrent.age}, freshness=${freshnessFactor.toFixed(3)}, maturityMult=${torrentMaturityMultiplier.toFixed(3)}`);
                  }
                  totalMaturityMultiplier += torrentMaturityMultiplier;

                  //console.log(`[DEBUG] Torrent ${index}: age=${torrent.age}, ageMult=${torrentAgeMultiplier.toFixed(3)}, maturityMult=${torrentMaturityMultiplier.toFixed(3)}`);
              });

              // Average the per-torrent multipliers
              const avgAgeMultiplier = totalAgeMultiplier / torrents.length;
              const avgMaturityMultiplier = totalMaturityMultiplier / torrents.length;
              //console.log(`[DEBUG] Average age multiplier: ${avgAgeMultiplier.toFixed(3)}`);
              //console.log(`[DEBUG] Average maturity multiplier: ${avgMaturityMultiplier.toFixed(3)}`);

              const basePenalty = Math.log10(excessRatio + 1) * 50;
              //console.log(`[DEBUG] Base penalty: ${basePenalty.toFixed(2)} (min of ${(excessRatio * 15).toFixed(2)} and 50)`);

              const ratioPenalty = basePenalty * volumeMultiplier * avgAgeMultiplier * avgMaturityMultiplier * WEIGHTS.SNATCH_RATIO;
              //console.log(`[DEBUG] Final penalty calculation:`);
              //console.log(`[DEBUG] ${basePenalty.toFixed(2)} * ${volumeMultiplier.toFixed(3)} * ${avgAgeMultiplier.toFixed(3)} * ${avgMaturityMultiplier.toFixed(3)} * ${WEIGHTS.SNATCH_RATIO}`);
              //console.log(`[DEBUG] = ${ratioPenalty.toFixed(2)}`);

              //console.log(`[DEBUG] Final score before penalty: ${finalScore}`);
              finalScore -= ratioPenalty;
              //console.log(`[DEBUG] Final score after penalty: ${finalScore}`);
          } else {
              //console.log(`[DEBUG] Snatch ratio (${snatchRatio.toFixed(2)}) <= ideal ratio (${idealRatio}) - no penalty applied`);
          }
          //console.log(`[DEBUG] === END SNATCH RATIO SCORING ===`);
      }

        // --- Seeder count bonus (with age/gp penalty adjustment) ---
        if (WEIGHTS.SEEDER_COUNT > 0 && allEditions) {
            //console.log(`[DEBUG] === SEEDER COUNT BONUS SCORING ===`);
            //console.log(`[DEBUG] WEIGHTS.SEEDER_COUNT: ${WEIGHTS.SEEDER_COUNT}`);
            //console.log(`[DEBUG] Raw seeders: ${seeders}, count: ${count}`);

            const currentAvgSeeders = seeders / count;
            //console.log(`[DEBUG] Current avg seeders: ${currentAvgSeeders.toFixed(2)} (${seeders}/${count})`);

            const maxAvgSeeders = Math.max(...allEditions.map(e => e.seeders / e.count));
            const maxTotalSeeders = Math.max(...allEditions.map(e => e.seeders));
            //console.log(`[DEBUG] Max avg seeders: ${maxAvgSeeders.toFixed(2)}, Max total seeders: ${maxTotalSeeders}`);

            if (maxAvgSeeders > 0 && maxTotalSeeders > 0) {
                // Calculate both factors
                const avgSeederFactor = Math.log10(currentAvgSeeders + 1) / Math.log10(maxAvgSeeders + 1);
                const totalSeederFactor = Math.log10(seeders + 1) / Math.log10(maxTotalSeeders + 1);

                // Combine factors using user-adjustable weights
                const avgWeight = WEIGHTS.SEEDER_AVG_WEIGHT;
                const totalWeight = WEIGHTS.SEEDER_TOTAL_WEIGHT;
                const combinedSeederFactor = (avgSeederFactor * avgWeight) + (totalSeederFactor * totalWeight);

                //console.log(`[DEBUG] Avg seeder factor: ${avgSeederFactor.toFixed(3)}`);
                //console.log(`[DEBUG] Total seeder factor: ${totalSeederFactor.toFixed(3)}`);
                //console.log(`[DEBUG] Combined seeder factor: ${combinedSeederFactor.toFixed(3)} (${(avgWeight*100)}% avg + ${(totalWeight*100)}% total)`);

                // GP/Quality penalty adjustment (user-adjustable, per-torrent)
                let gpAdjustment = 1;
                if (WEIGHTS.QUALITY_TORRENT > 0 && count > 0) {
                    const gpCount = editionData.torrents.filter(t => t.isQuality).length;
                    //console.log(`[DEBUG] GP torrents: ${gpCount}/${count} torrents`);
                    const gpPenalty = Math.min(1, (gpCount / count) * WEIGHTS.QUALITY_TORRENT * 5);
                    gpAdjustment = 1 - gpPenalty;
                    //console.log(`[DEBUG] GP penalty: ${gpPenalty.toFixed(3)}, GP adjustment: ${gpAdjustment.toFixed(3)}`);
                } //else {
                    //console.log(`[DEBUG] GP adjustment disabled (WEIGHTS.QUALITY_TORRENT: ${WEIGHTS.QUALITY_TORRENT})`);
                //}

                // Clamp adjustments to [0,1]
                const adj = Math.max(0, gpAdjustment);
                //console.log(`[DEBUG] clamped GP adjustment: ${adj.toFixed(3)}`);

                const seederBonus = combinedSeederFactor * 25 * adj * (WEIGHTS.SEEDER_COUNT * 10);
                //console.log(`[DEBUG] Seeder bonus calculation:`);
                //console.log(`[DEBUG] ${combinedSeederFactor.toFixed(3)} * 25 * ${adj.toFixed(3)} * (${WEIGHTS.SEEDER_COUNT} * 10)`);
                //console.log(`[DEBUG] = ${seederBonus.toFixed(2)}`);

                //console.log(`[DEBUG] Final score before seeder bonus: ${finalScore}`);
                finalScore += seederBonus;
                //console.log(`[DEBUG] Final score after seeder bonus: ${finalScore}`);
            } //else {
                //console.log(`[DEBUG] maxAvgSeeders is 0, no seeder bonus applied`);
            //}
            //console.log(`[DEBUG] === END SEEDER COUNT BONUS SCORING ===`);
        }

        // --- Edition count penalty (relative to max count) ---
        if (WEIGHTS.EDITION_COUNT > 0 && totalEditions > 1) {
            const maxCount = Math.max(...allEditions.map(e => e.count));
            // Nonlinear scaling: use a power to make penalty more forceful for low counts, gentler as count increases
            const editionCountFactor = count / maxCount;
            // Use a higher exponent for a steeper curve at low counts (e.g., 2.5)
            const penalty = Math.max(0, 1 - Math.pow(editionCountFactor, 1.0));
            // Add a small extra penalty for single-torrent editions
            const singleTorrentPenalty = (count === 1) ? 2.0 : 0;
            const editionCountPenalty = (penalty + singleTorrentPenalty) * 25 * WEIGHTS.EDITION_COUNT;
            finalScore -= editionCountPenalty;
        }

        // --- Disc format penalty ---
        if (WEIGHTS.DISC_PENALTY > 0) {
            //console.log(`[DEBUG] === DISC FORMAT PENALTY SCORING ===`);
            //console.log(`[DEBUG] WEIGHTS.DISC_PENALTY: ${WEIGHTS.DISC_PENALTY}`);

            const discFormats = ['BD25', 'BD33', 'BD50', 'BD66', 'BD100'];
            const dvdFormats = ['DVD5', 'DVD9'];
            const formatsToCheck = USER_SETTINGS.INCLUDE_DVD_FORMATS
                ? [...discFormats, ...dvdFormats]
                : discFormats;

            let discFormatCount = 0;
            let totalTorrentsChecked = 0;

            // Get all torrent rows from the page
            const allTorrentRows = document.querySelectorAll('.torrent-info-link');
            //console.log(`[DEBUG] Found ${allTorrentRows.length} total torrent rows on page`);

            // We need to match torrents to this edition somehow
            // Let's check all rows for now and see what we find
            allTorrentRows.forEach((row, index) => {
                totalTorrentsChecked++;

                // Get all text from the row
                const rowText = row.textContent || row.innerText || '';

                // Check for disc formats in the row text
                const foundFormats = formatsToCheck.filter(format =>
                    rowText.toUpperCase().includes(format.toUpperCase())
                );

                if (foundFormats.length > 0) {
                    discFormatCount++;
                    //console.log(`[DEBUG] Row ${index}: Found disc formats: ${foundFormats.join(', ')}`);
                    //console.log(`[DEBUG] - Row text (first 200 chars): ${rowText.substring(0, 200)}`);
                }
            });

            const discFormatRatio = totalTorrentsChecked > 0 ? discFormatCount / totalTorrentsChecked : 0;
            const discFormatPenalty = discFormatRatio * 25 * (WEIGHTS.DISC_PENALTY * 10);

            //console.log(`[DEBUG] Disc format torrents: ${discFormatCount}/${totalTorrentsChecked}`);
            //console.log(`[DEBUG] Disc format ratio: ${discFormatRatio.toFixed(3)}`);
            //console.log(`[DEBUG] Formats checked: ${formatsToCheck.join(', ')}`);
            //console.log(`[DEBUG] Disc format penalty: ${discFormatPenalty.toFixed(2)}`);

            if (discFormatCount > 0) {
                finalScore -= discFormatPenalty;
                //console.log(`[DEBUG] Applied disc format penalty: -${discFormatPenalty.toFixed(2)}`);
            }

            //console.log(`[DEBUG] Final score after disc format penalty: ${finalScore}`);
            //console.log(`[DEBUG] === END DISC FORMAT PENALTY SCORING ===`);
        }

        return Math.max(0, Math.round(finalScore));
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
                // Skip "Other" or "3D" sub-editions entirely
                if (isOtherSubEdition(row)) {
                    const detailRow = getCorrespondingDetailRow(row);
                    if (detailRow) detailRow.classList.add('hidden');
                    row.classList.add('hidden');
                    return;
                }

                // Compare base names for merged editions
                const selectedBase = getEditionBase(editionName).toLowerCase();
                const rowBase = rowEdition ? getEditionBase(rowEdition).toLowerCase() : '';

                if (rowBase === selectedBase) {
                    row.classList.remove('hidden');
                } else {
                    row.classList.add('hidden');
                }

                // Always hide detail rows by default
                const detailRow = getCorrespondingDetailRow(row);
                if (detailRow) detailRow.classList.add('hidden');
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
        // Get all distributor names as an array
        const distributorTags = distributor_ids ? Object.keys(distributor_ids) : [];

        return [
            ...IGNORE_TAGS,
            ...(USER_SETTINGS.CUSTOM_IGNORE_TAGS || []),
            ...distributorTags  // Add all distributor names to the ignore list
        ];
    }

    // Settings management functions
    async function saveSettings() {
        const settings = {
            USER_SETTINGS,
            WEIGHTS,
            THRESHOLDS
        };
        if (typeof GM !== "undefined" && GM.setValue) {
            await GM.setValue('ptp-alternate-versions-settings', JSON.stringify(settings));
        } else {
            localStorage.setItem('ptp-alternate-versions-settings', JSON.stringify(settings));
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
                const parsed = JSON.parse(saved);
                if (parsed.USER_SETTINGS) Object.assign(USER_SETTINGS, parsed.USER_SETTINGS);
                if (parsed.WEIGHTS) Object.assign(WEIGHTS, parsed.WEIGHTS);
                if (parsed.THRESHOLDS) Object.assign(THRESHOLDS, parsed.THRESHOLDS);
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

    function addCustomUnignoreTag(tag) {
        if (tag && !USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.includes(tag)) {
            USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.push(tag);
            saveSettings();
            refreshPanels();
        }
    }

    function removeCustomUnignoreTag(tag) {
        const index = USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.indexOf(tag);
        if (index > -1) {
            USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.splice(index, 1);
            saveSettings();
            refreshPanels();
        }
    }

    function debouncedRefresh() {
        // Clear any existing timer
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }

        // Set a new timer
        refreshTimer = setTimeout(() => {
            refreshPanels();
            refreshTimer = null;
        }, REFRESH_DELAY);
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

    let customUnignoreTagsListElement = null;

    function updateCustomUnignoreTagsList() {
        if (!customUnignoreTagsListElement) return;

        customUnignoreTagsListElement.innerHTML = '';

        if (USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.length === 0) {
            customUnignoreTagsListElement.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px;">No custom unignore tags added</div>';
            return;
        }

        USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.forEach(tag => {
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
                removeCustomUnignoreTag(tag);
                updateCustomUnignoreTagsList();
            });

            tagItem.appendChild(tagText);
            tagItem.appendChild(removeButton);
            customUnignoreTagsListElement.appendChild(tagItem);
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
        filterModeLabel.title = userSettingTooltips.filterMode;
        const filterModeSelect = document.createElement('select');
        filterModeSelect.title = userSettingTooltips.filterMode;
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
        showStatsLabel.title = userSettingTooltips.showStats;
        const showStatsSelect = document.createElement('select');
        showStatsSelect.title = userSettingTooltips.showStats;
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

        // --- Weights Controls ---
        const weightsLabel = document.createElement('div');
        weightsLabel.textContent = 'Popularity Scoring Penalty (0 = off, 1 = max):';
        weightsLabel.style.margin = '10px 0 5px 0';
        body.appendChild(weightsLabel);

        const weightsTable = document.createElement('table');
        weightsTable.style.width = '100%';
        weightsTable.style.marginBottom = '10px';
        weightsTable.innerHTML = `
            <tr>
                <th style="text-align:left;">Weight</th>
                <th style="text-align:left;">Value</th>
            </tr>
        `;

        const thresholdsTable = document.createElement('table');
        thresholdsTable.style.width = '100%';
        thresholdsTable.style.marginBottom = '10px';
        thresholdsTable.innerHTML = `
            <tr>
                <th style="text-align:left;">Threshold</th>
                <th style="text-align:left;">Value</th>
            </tr>
        `;

        [
            ['SEEDER_COUNT', 'Seeder Count Bonus'],
            ['SNATCH_RATIO', 'Snatch/Seeder Ratio'],
            ['EDITION_COUNT', 'Edition Count Bonus'],
            ['THEATRICAL_PENALTY', 'Theatrical Penalty'],
            ['DISC_PENALTY', 'Disc Format Penalty'],
            ['_HR1', ''],
            ['AGE_FACTOR', 'Torrent Age'],
            ['QUALITY_TORRENT', 'GP Torrents'],
            ['AGE_THRESHOLD', 'Age Penalty Threshold (days)'],
            ['FRESH_THRESHOLD', 'Fresh/Maturity Threshold (days)']
            ].forEach(([key, label]) => {
                if (key === '_HR1') {
                    const hr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 2;
                    td.style.padding = '0';
                    td.appendChild(document.createElement('hr'));
                    hr.appendChild(td);
                    weightsTable.appendChild(hr);
                    if (key === '_HR1') {
                        const infoTr = document.createElement('tr');
                        const infoTd = document.createElement('td');
                        infoTd.colSpan = 2;
                        infoTd.style.padding = '4px 0 8px 0';
                        infoTd.style.color = '#aaa';
                        infoTd.style.fontSize = '0.95em';
                        infoTd.textContent = 'Additonal penalties applied to Seeder Count and Snatch Ratio calculations:';
                        infoTr.appendChild(infoTd);
                        weightsTable.appendChild(infoTr);
                    }
                    return;
                }
                // Thresholds get their own input type and tooltip
                if (key === 'AGE_THRESHOLD' || key === 'FRESH_THRESHOLD') {
                    const tr = document.createElement('tr');
                    const tdLabel = document.createElement('td');
                    tdLabel.textContent = label;
                    tdLabel.title = thresholdTooltips[key] || "";
                    const tdInput = document.createElement('td');
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.min = '1';
                    input.max = '3650';
                    input.step = '1';
                    input.value = typeof THRESHOLDS[key] === 'number' ? THRESHOLDS[key] : 182;
                    input.style.width = '60px';
                    input.title = thresholdTooltips[key] || "";
                    input.addEventListener('change', () => {
                        THRESHOLDS[key] = Math.max(1, Math.min(3650, parseInt(input.value) || 182));
                        saveSettings();
                        refreshPanels();
                    });
                    tdInput.appendChild(input);
                    tr.appendChild(tdLabel);
                    tr.appendChild(tdInput);
                    weightsTable.appendChild(tr);
                    return;
                }
                // Normal weights
                const tr = document.createElement('tr');
                const tdLabel = document.createElement('td');
                tdLabel.textContent = label;
                tdLabel.title = weightTooltips[key] || "";
                const tdInput = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.max = '1';
                input.step = '0.01';
                input.value = typeof WEIGHTS[key] === 'number' ? WEIGHTS[key] : 0;
                input.style.width = '60px';
                input.title = weightTooltips[key] || "";
                input.addEventListener('change', () => {
                    WEIGHTS[key] = Math.max(0, Math.min(1, parseFloat(input.value) || 0));
                    saveSettings();
                    refreshPanels();
                });
                tdInput.appendChild(input);
                tr.appendChild(tdLabel);
                tr.appendChild(tdInput);
                weightsTable.appendChild(tr);
            });
            body.appendChild(weightsTable);

        // --- Add Seeder Factor Weighting Controls ---
        // --- Seeder Factor Weighting ---
        const seederWeightLabel = document.createElement('div');
        seederWeightLabel.textContent = 'Seeder Factor Weighting:';
        seederWeightLabel.style.margin = '10px 0 5px 0';
        body.appendChild(seederWeightLabel);

        const seederWeightTable = document.createElement('table');
        seederWeightTable.style.width = '100%';
        seederWeightTable.style.marginBottom = '10px';

        // Average seeders weight
        const avgRow = document.createElement('tr');
        const avgLabel = document.createElement('td');
        avgLabel.textContent = 'Average Seeders Weight:';
        avgLabel.title = 'Weight for average seeders per torrent (higher = favors editions with higher average seeders per torrent)';
        const avgInput = document.createElement('td');
        const avgSlider = document.createElement('input');
        avgSlider.type = 'range';
        avgSlider.min = '0';
        avgSlider.max = '1';
        avgSlider.step = '0.1';
        avgSlider.value = WEIGHTS.SEEDER_AVG_WEIGHT;
        avgSlider.style.width = '100px';
        avgSlider.title = 'Weight for average seeders per torrent';

        const avgValue = document.createElement('span');
        avgValue.textContent = ` ${(WEIGHTS.SEEDER_AVG_WEIGHT * 100).toFixed(0)}%`;
        avgValue.style.marginLeft = '10px';

        avgSlider.addEventListener('input', () => {
            const newValue = parseFloat(avgSlider.value);
            WEIGHTS.SEEDER_AVG_WEIGHT = newValue;
            WEIGHTS.SEEDER_TOTAL_WEIGHT = 1 - newValue;
            totalSlider.value = WEIGHTS.SEEDER_TOTAL_WEIGHT;
            avgValue.textContent = ` ${(newValue * 100).toFixed(0)}%`;
            totalValue.textContent = ` ${((1 - newValue) * 100).toFixed(0)}%`;
            saveSettings();
            debouncedRefresh();
        });

        avgInput.appendChild(avgSlider);
        avgInput.appendChild(avgValue);
        avgRow.appendChild(avgLabel);
        avgRow.appendChild(avgInput);
        seederWeightTable.appendChild(avgRow);

        // Total seeders weight
        const totalRow = document.createElement('tr');
        const totalLabel = document.createElement('td');
        totalLabel.textContent = 'Total Seeders Weight:';
        totalLabel.title = 'Weight for total seeders (higher = favors editions with more total seeders)';
        const totalInput = document.createElement('td');
        const totalSlider = document.createElement('input');
        totalSlider.type = 'range';
        totalSlider.min = '0';
        totalSlider.max = '1';
        totalSlider.step = '0.1';
        totalSlider.value = WEIGHTS.SEEDER_TOTAL_WEIGHT;
        totalSlider.style.width = '100px';
        totalSlider.title = 'Weight for total seeders';

        const totalValue = document.createElement('span');
        totalValue.textContent = ` ${(WEIGHTS.SEEDER_TOTAL_WEIGHT * 100).toFixed(0)}%`;
        totalValue.style.marginLeft = '10px';

        totalSlider.addEventListener('input', () => {
            const newValue = parseFloat(totalSlider.value);
            WEIGHTS.SEEDER_TOTAL_WEIGHT = newValue;
            WEIGHTS.SEEDER_AVG_WEIGHT = 1 - newValue;
            avgSlider.value = WEIGHTS.SEEDER_AVG_WEIGHT;
            totalValue.textContent = ` ${(newValue * 100).toFixed(0)}%`;
            avgValue.textContent = ` ${((1 - newValue) * 100).toFixed(0)}%`;
            saveSettings();
            debouncedRefresh();
        });

        totalInput.appendChild(totalSlider);
        totalInput.appendChild(totalValue);
        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalInput);
        seederWeightTable.appendChild(totalRow);
        body.appendChild(seederWeightTable);
        body.appendChild(document.createElement('hr'));

        // --- User Settings Controls ---
        // First row: Sort By and Sort Order
        const sortRowDiv = document.createElement('div');
        sortRowDiv.style.cssText = 'display: flex; gap: 15px; margin-bottom: 10px; align-items: center;';

        [sortByLabel, sortBySelect, sortOrderLabel, sortOrderSelect].forEach(el => {
            el.style.marginRight = '0'; // Remove individual margins
            sortRowDiv.appendChild(el);
        });
        body.appendChild(sortRowDiv);

        // Second row: Filter Mode
        const filterRowDiv = document.createElement('div');
        filterRowDiv.style.cssText = 'display: flex; gap: 15px; margin-bottom: 10px; align-items: center;';

        [filterModeLabel, filterModeSelect].forEach(el => {
            el.style.marginRight = '0';
            filterRowDiv.appendChild(el);
        });
        body.appendChild(filterRowDiv);

        // Third row: Show Stats
        const statsRowDiv = document.createElement('div');
        statsRowDiv.style.cssText = 'display: flex; gap: 15px; margin-bottom: 10px; align-items: center;';

        [showStatsLabel, showStatsSelect].forEach(el => {
            el.style.marginRight = '0';
            statsRowDiv.appendChild(el);
        });
        body.appendChild(statsRowDiv);

        // DVD inclusion checkbox
        const dvdCheckboxDiv = document.createElement('div');
        dvdCheckboxDiv.style.marginBottom = '10px';

        const dvdCheckbox = document.createElement('input');
        dvdCheckbox.type = 'checkbox';
        dvdCheckbox.checked = USER_SETTINGS.INCLUDE_DVD_FORMATS;
        dvdCheckbox.style.marginRight = '8px';

        const dvdLabel = document.createElement('label');
        dvdLabel.textContent = 'Include DVD formats in disc penalty';
        dvdLabel.style.cursor = 'pointer';
        dvdLabel.title = 'Also penalize DVD5 and DVD9 torrents';

        dvdCheckbox.addEventListener('change', () => {
            USER_SETTINGS.INCLUDE_DVD_FORMATS = dvdCheckbox.checked;
            saveSettings();
            debouncedRefresh();
        });

        dvdLabel.addEventListener('click', () => dvdCheckbox.click());

        dvdCheckboxDiv.appendChild(dvdCheckbox);
        dvdCheckboxDiv.appendChild(dvdLabel);
        body.appendChild(dvdCheckboxDiv);

        // --- Reset Button ---
        const resetButtonDiv = document.createElement('div');
        resetButtonDiv.style.cssText = 'text-align: center; margin: 15px 0;';

        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset Weights to Script Defaults';
        resetButton.style.cssText = `
            padding: 6px 10px;
            background: #d32f2f;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
            font-weight: bold;
        `;

        resetButton.addEventListener('click', resetWeightsToDefaults);

        resetButton.addEventListener('mouseenter', () => {
            resetButton.style.background = '#b71c1c';
        });

        resetButton.addEventListener('mouseleave', () => {
            resetButton.style.background = '#d32f2f';
        });

        resetButtonDiv.appendChild(resetButton);
        body.appendChild(resetButtonDiv);

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

        // --- Custom unignore tags management ---
        body.appendChild(document.createElement('hr'));
        const customUnignoreLabel = document.createElement('div');
        customUnignoreLabel.textContent = 'Custom unignore tags (never ignore these):';
        customUnignoreLabel.style.margin = '10px 0 5px 0';
        body.appendChild(customUnignoreLabel);

        const unignoreTagsList = document.createElement('div');
        unignoreTagsList.id = 'custom-unignore-tags-list';
        unignoreTagsList.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #444;
            background: #2a2a2a;
            border-radius: 3px;
            padding: 5px;
        `;
        customUnignoreTagsListElement = unignoreTagsList;
        body.appendChild(unignoreTagsList);

        // Add new unignore tag input
        const addUnignoreSection = document.createElement('div');
        addUnignoreSection.style.marginTop = '10px';
        const addUnignoreInput = document.createElement('input');
        addUnignoreInput.type = 'text';
        addUnignoreInput.placeholder = 'Enter tag to never ignore...';
        addUnignoreInput.style.cssText = `
            width: 60%;
            padding: 5px;
            border: 1px solid #444;
            background: #2a2a2a;
            color: white;
            border-radius: 3px;
            margin-right: 5px;
        `;
        const addUnignoreButton = document.createElement('button');
        addUnignoreButton.textContent = 'Add Unignore Tag';
        addUnignoreButton.style.cssText = `
            padding: 5px 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.9em;
        `;
        addUnignoreButton.addEventListener('click', () => {
            const tag = addUnignoreInput.value.trim();
            if (tag) {
                addCustomUnignoreTag(tag);
                addUnignoreInput.value = '';
                updateCustomUnignoreTagsList();
            }
        });
        addUnignoreInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addUnignoreButton.click();
        });
        addUnignoreSection.appendChild(addUnignoreInput);
        addUnignoreSection.appendChild(addUnignoreButton);
        body.appendChild(addUnignoreSection);

        panel.appendChild(heading);
        panel.appendChild(body);

        // Initialize the custom tags list
        customTagsListElement = tagsList;
        updateCustomTagsList();
        customUnignoreTagsListElement = unignoreTagsList;
        updateCustomUnignoreTagsList();

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

    function addUnignoreTagLink() {
        // Only add if there are no editions or only theatrical
        const editionList = document.querySelector('#edition-list');
        if (!editionList || editionList.children.length <= 1) {
            const linkbox = document.querySelector('.linkbox');
            if (linkbox && !document.querySelector('#unignore-tag-link')) {
                // Create the unignore tag link
                const unignoreLink = document.createElement('a');
                unignoreLink.id = 'unignore-tag-link';
                unignoreLink.className = 'linkbox__link';
                unignoreLink.href = '#';
                unignoreLink.textContent = ' [Add Edition Unignore Tag]';
                unignoreLink.title = 'Add a tag to never ignore for edition detection';

                unignoreLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    showUnignoreTagDialog();
                });

                // Add to linkbox
                linkbox.appendChild(unignoreLink);
            }
        }
    }

    function showUnignoreTagDialog() {
        const tag = prompt('Enter a tag to never ignore for edition detection:\n\nThis will help if valid edition tags are being ignored.');

        if (tag && tag.trim()) {
            const trimmedTag = tag.trim();

            // Add to unignore list
            if (!USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.includes(trimmedTag)) {
                USER_SETTINGS.CUSTOM_UNIGNORE_TAGS.push(trimmedTag);
                saveSettings();

                // Show confirmation
                alert(`"${trimmedTag}" added to unignore list.\n\nRefreshing page to apply changes...`);

                // Refresh page to reprocess with new unignore tag
                window.location.reload();
            } else {
                alert(`"${trimmedTag}" is already in the unignore list.`);
            }
        }
    }

    async function resetWeightsToDefaults() {
        if (confirm('Reset all weights to script defaults?')) {
            console.log('[DEBUG] Resetting weights to script defaults...');

            try {
                // Get the current settings
                const settingsJson = await GM.getValue('ptp-alternate-versions-settings', '{}');
                const settings = JSON.parse(settingsJson);

                //console.log('[DEBUG] Current settings:', settings);

                // Reset the WEIGHTS section to script defaults
                settings.WEIGHTS = {
                    SNATCH_RATIO: 0.4,
                    SEEDER_COUNT: 0.6,
                    AGE_FACTOR: 0.0,
                    EDITION_COUNT: 0.5,
                    QUALITY_TORRENT: 0.2,
                    THEATRICAL_PENALTY: 0.0,
                    DISC_PENALTY: 0.0,
                    SEEDER_AVG_WEIGHT: 0.5,
                    SEEDER_TOTAL_WEIGHT: 0.5
                };

                // Reset THRESHOLDS section to script defaults
                settings.THRESHOLDS = {
                    AGE_THRESHOLD: 712,
                    FRESH_THRESHOLD: 356
                };

                // Save the updated settings
                await GM.setValue('ptp-alternate-versions-settings', JSON.stringify(settings));

                // Update the in-memory WEIGHTS object
                WEIGHTS.SNATCH_RATIO = 0.4;
                WEIGHTS.SEEDER_COUNT = 0.6;
                WEIGHTS.AGE_FACTOR = 0.0;
                WEIGHTS.EDITION_COUNT = 0.5;
                WEIGHTS.QUALITY_TORRENT = 0.2;
                WEIGHTS.THEATRICAL_PENALTY = 0.0;
                WEIGHTS.DISC_PENALTY = 0.0;
                WEIGHTS.SEEDER_AVG_WEIGHT = 0.5;
                WEIGHTS.SEEDER_TOTAL_WEIGHT = 0.5;
                THRESHOLDS.AGE_THRESHOLD = 712;
                THRESHOLDS.FRESH_THRESHOLD = 356;

                //console.log('[DEBUG] Updated settings:', settings);
                //console.log('[DEBUG] Updated WEIGHTS:', WEIGHTS);

                // Update UI sliders
                //updateWeightSliders();

                // Refresh panels
                refreshPanels();

                //console.log('[DEBUG] Weights reset to script defaults');

            } catch (error) {
                console.error('[DEBUG] Error resetting weights:', error);
                alert('Error resetting weights. The page will reload.');
                window.location.reload();
            }
        }
    }

    async function main() {
        await loadSettings();
        if (add_unignore_link) {
            addUnignoreTagLink();
        }

        // Find the torrent table
        const torrentTable = document.querySelector('#torrent-table');
        if (!torrentTable) return;

        // Get all torrent rows
        const torrentRows = torrentTable.querySelectorAll('tr.group_torrent.group_torrent_header');
        if (torrentRows.length === 0) return;

        // --- Edition grouping with base normalization ---
        // 1. Collect all edition names and their base names
        const editionRows = [];
        torrentRows.forEach(row => {
            if (isOtherSubEdition(row)) return;
            const edition = extractEdition(row);
            if (edition) {
                editionRows.push({ row, edition });
            }
        });

        // 2. Build a map: base name -> [all edition names with that base]
        const baseToNames = {};
        editionRows.forEach(({ edition }) => {
            const base = getEditionBase(edition);
            if (!baseToNames[base]) baseToNames[base] = [];
            if (!baseToNames[base].includes(edition)) baseToNames[base].push(edition);
        });

        // 3. Group torrents by merged edition name
        const editionData = {};
        editionRows.forEach(({ row, edition }) => {
            const stats = extractTorrentStats(row);
            const age = extractTorrentAge(row);
            const isQuality = isQualityTorrent(row);

            // If this base has >1 edition, merge them under the base name (capitalized)
            const base = getEditionBase(edition);
            const groupName = (baseToNames[base].length > 1)
                ? baseToNames[base][0] // Use first edition name found for this base
                : edition;

            if (!editionData[groupName]) {
                editionData[groupName] = {
                    name: groupName,
                    count: 0,
                    snatches: 0,
                    seeders: 0,
                    qualityCount: 0,
                    totalAge: 0,
                    averageAge: 0,
                    torrents: []
                };
            }
            editionData[groupName].torrents.push({
                snatches: stats.snatches,
                seeders: stats.seeders,
                age: age,
                isQuality: isQuality
            });

            editionData[groupName].count++;
            editionData[groupName].snatches += stats.snatches;
            editionData[groupName].seeders += stats.seeders;
            editionData[groupName].qualityCount += isQuality ? 1 : 0;
            editionData[groupName].totalAge += age;
            editionData[groupName].averageAge = editionData[groupName].totalAge / editionData[groupName].count;
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