// ==UserScript==
// @name         PTP Seeding Highlighter
// @namespace    https://passthepopcorn.me/
// @version      1.3.5
// @description  Highlights movies that have seeding torrents
// @match        https://passthepopcorn.me/bookmarks.php*
// @match        https://passthepopcorn.me/top10.php*
// @match        https://passthepopcorn.me/collages.php?id=*
// @match        https://passthepopcorn.me/collages.php?page=*&id=*
// @grant        none
// ==/UserScript==


(function() {
    'use strict';

    // User Configuration
    const CONFIG = {
        // Set to false to disable the highlight around seeding movie covers
        enableHighlight: true,

        // Highlight color (only applies if enableHighlight is true)
        highlightColor: 'rgba(255, 165, 0, 0.5)', // Orange by default

        // Highlight intensity (0-30px recommended)
        // How thick the overlay is
        highlightIntensity: 10,

        // Show alternate highlight for non-matching seeding torrents
        // These are seeding torrent that do not match filtering below
        showNonMatchingOverlay: false,

        // Color for non-matching seeding torrents
        nonMatchingHighlightColor: 'rgba(0, 128, 0, 0.5)', // Green by default

        // Use torrent filename or torrent attributes in tooltip
        useFilenameInTooltip: false,

        // Display additional info in the tooltip
        showCheckbox: true,        // Show checkbox status (checked/unchecked/GP)
        showFileSize: true,        // Show file size info
        showSeeders: true,         // Show number of seeders

        // Set false to have the permalink at the beginning of the tooltip
        PLLast: true,

        // Whether to modify the "DVD Image" tooltip to show NTSC/PAL designation
        // ie: 'PAL DVD image' instead of just 'DVD image'
        showDVDRegionInTooltip: false,

        // Quality filtering - only highlight movies with these qualities
        // Set to [] (empty array) to show all qualities
        // Examples: ['1080p', '2160p', 'remux', 'x265', 'blu-ray']
        // Accepts more than one quality, but only one needs to match
        filterQualities: [],

        // Checkbox state filtering - only highlight movies with these checkbox states
        // Set to [] (empty array) to show all checkbox states
        // Available options: ['checked', 'unchecked', 'gp'] (case-insensitive)
        filterCheckboxState: [],

        // Debug mode - set to true for additional console logging
        debug: false
    };

function log(message, obj = null) {
    if (CONFIG.debug || message.startsWith('Error')) {
        if (obj) {
            console.log(message, obj);
        } else {
            console.log(message);
        }
    }
}

function injectGlobalStyle() {
    // Skip if highlighting is disabled in config
    if (!CONFIG.enableHighlight) {
        log("Highlighting disabled in configuration, skipping style injection");
        return;
    }

    const style = document.createElement('style');
    style.textContent = `
        /* Style the cover link directly */
        .cover-movie-list__movie__cover-link.seeding-movie-cover {
            box-shadow: 0 0 ${CONFIG.highlightIntensity}px 10px ${CONFIG.highlightColor} !important;
            border-radius: 8px !important;
            position: relative !important;
            z-index: 1 !important;
            display: block !important;
        }

        /* Style for non-matching seeding movies */
        .cover-movie-list__movie__cover-link.non-matching-seeding-movie-cover {
            box-shadow: 0 0 ${CONFIG.highlightIntensity}px 10px ${CONFIG.nonMatchingHighlightColor} !important;
            border-radius: 8px !important;
            position: relative !important;
            z-index: 1 !important;
            display: block !important;
        }
    `;
    document.head.appendChild(style);
    log("Global styles for seeding movies injected");
}

function waitForJsonData(attempts = 10, delay = 500) {
    return new Promise((resolve) => {
        function checkData(remainingAttempts) {
            //console.log("Checking for coverViewJsonData, attempts left:", remainingAttempts);
            const data = extractJsonData();
            if (data && data.length > 0) {
                //console.log("Successfully retrieved JSON data");
                resolve(data);
            } else if (remainingAttempts > 0) {
                setTimeout(() => checkData(remainingAttempts - 1), delay);
            } else {
                console.warn("Failed to retrieve JSON data after multiple attempts");
                resolve(null);
            }
        }
        checkData(attempts);
    });
}

function extractJsonData() {
    log("Extracting JSON data from window.coverViewJsonData");

    try {
        if (!window.coverViewJsonData || !Array.isArray(window.coverViewJsonData)) {
            console.warn("coverViewJsonData not available or not an array");
            return null;
        }

        // Get current page URL to determine the page type
        const currentUrl = window.location.href;
        const isTop10Page = currentUrl.includes('top10.php');

        // Store all found movies from all sections
        let allMovies = [];

        // Process each section in the coverViewJsonData array
        for (let i = 0; i < window.coverViewJsonData.length; i++) {
            const section = window.coverViewJsonData[i];

            // Skip empty sections
            if (!section || !section.Movies || !Array.isArray(section.Movies)) {
                continue;
            }

            // On top10 page, each array element contains a different time period's movies
            allMovies = allMovies.concat(section.Movies);
        }

        //log(`Successfully extracted JSON data: ${allMovies.length} movies found across all sections`);

        // Only log sample data in debug mode
        if (CONFIG.debug && allMovies.length > 0) {
            const sampleMovie = allMovies[0];
            log("Sample movie basic info:", {
                Title: sampleMovie.Title,
                GroupId: sampleMovie.GroupId,
                HasGroupingQualities: !!sampleMovie.GroupingQualities,
                NumQualities: sampleMovie.GroupingQualities ? sampleMovie.GroupingQualities.length : 0,
                FromSection: isTop10Page ? "Top 10" : "Bookmarks"
            });

            // If GroupingQualities exists, log the first one
            if (sampleMovie.GroupingQualities && sampleMovie.GroupingQualities.length > 0) {
                const sampleQuality = sampleMovie.GroupingQualities[0];
                //log("Sample quality keys:", Object.keys(sampleQuality));

                // If Torrents exists, log the first one
                if (sampleQuality.Torrents && sampleQuality.Torrents.length > 0) {
                    //log("Sample torrent keys:", Object.keys(sampleQuality.Torrents[0]));
                }
            }
        }

        return allMovies;
    } catch (error) {
        console.error("Error extracting JSON data:", error);
        return null;
    }
}

function extractFormatsFromTooltip(tooltipContent) {
    const formatInfo = {
        SD: '',
        HD: '',
        UHD: ''
    };

    // Find the torrents div
    const torrentsDiv = tooltipContent.querySelector('.movie-tooltip__torrents');
    if (!torrentsDiv) return formatInfo;

    // Extract formats from each quality category
    const divs = torrentsDiv.querySelectorAll('div');
    divs.forEach(div => {
        const text = div.textContent.trim();

        if (text.startsWith('SD:')) {
            formatInfo.SD = text.substring(3).trim();
        } else if (text.startsWith('HD:')) {
            formatInfo.HD = text.substring(3).trim();
        } else if (text.startsWith('UHD:')) {
            formatInfo.UHD = text.substring(4).trim();
        }
    });

    //console.log('Formats extracted from tooltip:', formatInfo);
    return formatInfo;
}

function extractSeedingTorrentsWithQualities(movies) {
    //console.log("Extracting seeding torrents with qualities from JSON data");
    const seedingMovies = new Map(); // Map of GroupId -> seeding torrent details

    movies.forEach(movie => {
        if (movie.GroupingQualities) {
            const seedingTorrents = [];

            movie.GroupingQualities.forEach(quality => {
                const qualityName = quality.QualityName || '';

                quality.Torrents.forEach(torrent => {
                    if (torrent.ColorType === "seeding") {
                        // Extract clean title text
                        const titleText = torrent.Title
                            ? torrent.Title.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, '').toLowerCase().trim()
                            : '';

                        // Extract checkbox status (checked, unchecked, or Golden Popcorn)
                        const isGoldenPopcorn = torrent.Title && torrent.Title.includes('quality.gif');
                        const isChecked = !isGoldenPopcorn && torrent.Title &&
                        (torrent.Title.includes('☑') ||
                         torrent.Title.includes('✓') ||
                         torrent.Title.includes('✅') ||
                         torrent.Title.includes('&#9745;') ||
                         /checked/i.test(torrent.Title));

                        // Get torrent name based on configuration
                        let fullTorrentName;
                        if (CONFIG.useFilenameInTooltip) {
                            // Get the actual title from the title attribute
                            fullTorrentName = extractTitleFromHTML(torrent.Title);
                        } else {
                            // Get format attributes directly from the displayed text
                            fullTorrentName = extractFormatAttributesFromHTML(torrent.Title).join(' ');
                        }

                        const formatAttributes = extractFormatAttributesFromHTML(torrent.Title);

                        // Extract additional information
                        const fileSize = torrent.Size || '';
                        const seedersCount = torrent.Seeders || '';

                        // Get resolution/quality info - improved detection with format attributes
                        let resolution = 'unknown';

                        // First check format attributes for resolution
                        const resFromAttr = formatAttributes.find(attr =>
                            attr.includes('2160p') || attr.includes('1080p') || attr.includes('720p') ||
                            attr.includes('576p') || attr.includes('480p'));

                        if (resFromAttr) {
                            if (resFromAttr.includes('2160p')) resolution = '2160p';
                            else if (resFromAttr.includes('1080p')) resolution = '1080p';
                            else if (resFromAttr.includes('720p')) resolution = '720p';
                            else if (resFromAttr.includes('576p')) resolution = '576p';
                            else if (resFromAttr.includes('480p')) resolution = '480p';
                        }
                        // Fall back to title text if no resolution found in attributes
                        else if (titleText.includes('2160p')) resolution = '2160p';
                        else if (titleText.includes('1080p')) resolution = '1080p';
                        else if (titleText.includes('720p')) resolution = '720p';
                        else if (titleText.includes('576p')) resolution = '576p';
                        else if (titleText.includes('480p')) resolution = '480p';
                        // Also check the title attribute for resolutions
                        else if (fullTorrentName) {
                            const fullTitleLower = fullTorrentName.toLowerCase();
                            if (fullTitleLower.includes('2160p')) resolution = '2160p';
                            else if (fullTitleLower.includes('1080p')) resolution = '1080p';
                            else if (fullTitleLower.includes('720p')) resolution = '720p';
                            else if (fullTitleLower.includes('576p')) resolution = '576p';
                            else if (fullTitleLower.includes('480p')) resolution = '480p';
                        }

                        // Get codec info - check format attributes first, then HTML and real title
                        let codec = 'unknown codec';

                        // Check format attributes for codec
                        const codecFromAttr = formatAttributes.find(attr =>
                            attr.toLowerCase().includes('x265') || attr.toLowerCase().includes('hevc') ||
                            attr.toLowerCase().includes('x264') || attr.toLowerCase().includes('xvid'));

                        if (codecFromAttr) {
                            if (codecFromAttr.toLowerCase().includes('x265') || codecFromAttr.toLowerCase().includes('hevc'))
                                codec = 'x265/hevc';
                            else if (codecFromAttr.toLowerCase().includes('x264'))
                                codec = 'x264';
                            else if (codecFromAttr.toLowerCase().includes('xvid'))
                                codec = 'xvid';
                        }
                        else if (titleText.includes('x265') || titleText.includes('hevc') ||
                            (fullTorrentName &&
                             (fullTorrentName.toLowerCase().includes('x265') ||
                              fullTorrentName.toLowerCase().includes('hevc')))) {
                            codec = 'x265/hevc';
                        } else if (titleText.includes('x264') ||
                                   (fullTorrentName && fullTorrentName.toLowerCase().includes('x264'))) {
                            codec = 'x264';
                        } else if (titleText.includes('xvid') ||
                                  (fullTorrentName && fullTorrentName.toLowerCase().includes('xvid'))) {
                            codec = 'xvid';
                        }

                        // Get source info - check format attributes first
                        let source = 'unknown source';

                        // Check format attributes for source
                        const sourceFromAttr = formatAttributes.find(attr =>
                            attr.toLowerCase().includes('blu-ray') || attr.toLowerCase().includes('bluray') ||
                            attr.toLowerCase().includes('dvd') || attr.toLowerCase().includes('web'));

                        if (sourceFromAttr) {
                            if (sourceFromAttr.toLowerCase().includes('blu-ray') || sourceFromAttr.toLowerCase().includes('bluray'))
                                source = 'blu-ray';
                            else if (sourceFromAttr.toLowerCase().includes('dvd'))
                                source = 'dvd';
                            else if (sourceFromAttr.toLowerCase().includes('web-dl') || sourceFromAttr.toLowerCase().includes('webrip'))
                                source = 'web-dl';
                        }
                        else if (titleText.includes('blu-ray') || titleText.includes('bluray')) {
                            source = 'blu-ray';
                        } else if (titleText.includes('dvd')) {
                            source = 'dvd';
                        } else if (titleText.includes('web-dl') || titleText.includes('webrip')) {
                            source = 'web-dl';
                        } else if (fullTorrentName) {
                            const fullTitleLower = fullTorrentName.toLowerCase();
                            if (fullTitleLower.includes('blu-ray') || fullTitleLower.includes('bluray')) {
                                source = 'blu-ray';
                            } else if (fullTitleLower.includes('dvd')) {
                                source = 'dvd';
                            } else if (fullTitleLower.includes('web-dl') || fullTitleLower.includes('webrip')) {
                                source = 'web-dl';
                            }
                        }

                        // Special features - check both format attributes and titles
                        const features = [];
                        const checkFeatures = (text) => {
                            if (text.includes('remux') || text.includes('REMUX')) features.push('remux');
                            if (text.includes('dolby vision') || text.includes('dovi')) features.push('dolby vision');
                            if (text.includes('hdr10')) features.push('hdr10');
                            if (text.includes('extended')) features.push('extended');
                            if (text.includes('with commentary') || text.includes('commentary')) features.push('commentary');
                        };

                        // Check format attributes for features
                        formatAttributes.forEach(attr => checkFeatures(attr.toLowerCase()));

                        checkFeatures(titleText);
                        if (fullTorrentName) {
                            checkFeatures(fullTorrentName.toLowerCase());
                        }

                        // Special format detection - use format attributes where available
                        const specialFormats = [];

                        // Check format attributes for container formats like MKV
                        const containerFromAttr = formatAttributes.find(attr =>
                            attr.toLowerCase() === 'mkv' || attr.toLowerCase() === 'mp4' ||
                            attr.toLowerCase() === 'avi');

                        if (containerFromAttr) {
                            specialFormats.push(containerFromAttr.toLowerCase());
                        }

                        const checkSpecialFormats = (text) => {
                            // Skip special format detection for DVDRip files (these are not disc images)
                            if (text.includes('dvdrip') || text.includes('dvd-rip') || text.includes('dvd rip')) {
                                return; // Don't add any special formats for DVD rips
                            }

                            // For Blu-ray image formats
                            if (text.includes('m2ts') || text.includes('.iso') ||
                               text.includes('bd25') || text.includes('bd50') || text.includes('bdmv')) {
                                specialFormats.push('m2ts');
                                source = 'blu-ray'; // Override source for image formats
                            }

                            // For DVD image formats with improved NTSC/PAL detection
                            // Only identify actual DVD images, not DVD rips
                            if ((text.includes('vob') || text.includes('img') || text.includes('iso') ||
                                text.includes('dvd5') || text.includes('dvd9') ||
                                text.includes('dvd-r') || text.includes('dvdr')) &&
                                !text.includes('dvdrip')) {

                                specialFormats.push('image');
                                source = 'dvd'; // Override source for DVD formats

                                // Also detect NTSC or PAL
                                if (text.toUpperCase().includes('NTSC')) {
                                    specialFormats.push('ntsc');
                                } else if (text.toUpperCase().includes('PAL')) {
                                    specialFormats.push('pal');
                                }
                            }
                        };

                        checkSpecialFormats(titleText);
                        if (fullTorrentName) {
                            checkSpecialFormats(fullTorrentName.toLowerCase());
                        }

                        // Store this seeding torrent with all detected info
                        seedingTorrents.push({
                            title: titleText,
                            fullTitle: fullTorrentName || titleText,
                            formatAttributes: formatAttributes,
                            qualityName: qualityName,
                            resolution: resolution,
                            codec: codec,
                            source: source,
                            features: features,
                            specialFormats: specialFormats,
                            torrentId: torrent.TorrentId,
                            rawTitle: torrent.Title,
                            isChecked: isChecked,
                            isGoldenPopcorn: isGoldenPopcorn,
                            fileSize: fileSize,
                            seedersCount: seedersCount
                        });
                    }
                });
            });

            // If any seeding torrents found for this movie, add to the map
            if (seedingTorrents.length > 0) {
                seedingMovies.set(movie.GroupId, {
                    title: movie.Title,
                    seedingTorrents: seedingTorrents
                });
            }
        }
    });

    //console.log(`Found ${seedingMovies.size} movies with seeding torrents`);
    return seedingMovies;
}

function matchSeedingTorrentsWithTooltip(tooltipFormats, seedingTorrents) {
    const matchingFormats = {
        SD: [],
        HD: [],
        UHD: []
    };

    // Track which torrents have found a match already (by torrentId)
    const matchedTorrents = new Set();

    // Step 1: Special case for remux files
    for (const torrent of seedingTorrents) {
        // Skip if already matched
        if (matchedTorrents.has(torrent.torrentId)) continue;

        // Check if this is a remux file (more robust check)
        const isRemux = torrent.features && torrent.features.includes('remux') ||
                       (torrent.fullTitle &&
                        (torrent.fullTitle.toLowerCase().includes('remux') ||
                         torrent.fullTitle.includes('REMUX')));

        if (isRemux) {
            if (torrent.resolution === '1080p') {
                // For 1080p remux, look for "remux" in HD category
                let foundRemuxMatch = false;

                if (tooltipFormats.HD) {
                    tooltipFormats.HD.split(',').map(f => f.trim()).forEach(format => {
                        const formatLower = format.toLowerCase();
                        if (formatLower.includes('remux')) {
                            if (!matchingFormats.HD.includes(format)) {
                                matchingFormats.HD.push(format);
                            }
                            foundRemuxMatch = true;
                            matchedTorrents.add(torrent.torrentId);
                        }
                    });
                }

                if (foundRemuxMatch) {
                    continue; // Skip to next torrent
                }
            }
            else if (torrent.resolution === '2160p') {
                // For 2160p remux, look for "remux" in UHD category
                let foundRemuxMatch = false;

                if (tooltipFormats.UHD) {
                    tooltipFormats.UHD.split(',').map(f => f.trim()).forEach(format => {
                        const formatLower = format.toLowerCase();
                        if (formatLower.includes('remux')) {
                            if (!matchingFormats.UHD.includes(format)) {
                                matchingFormats.UHD.push(format);
                            }
                            foundRemuxMatch = true;
                            matchedTorrents.add(torrent.torrentId);
                        }
                    });
                }

                // If no remux format found in UHD category, add "Remux" as a new format
                if (!foundRemuxMatch) {
                    matchingFormats.UHD.push("Remux");
                    matchedTorrents.add(torrent.torrentId);
                }

                continue; // Skip to next torrent
            }
        }
    }

    // Step 2: Special case for 1080p/1080i m2ts files - match as "Blu-ray Image"
    for (const torrent of seedingTorrents) {
        // Skip if already matched
        if (matchedTorrents.has(torrent.torrentId)) continue;

        const hasSpecialFormat = torrent.specialFormats && torrent.specialFormats.length > 0;
        const is1080 = torrent.resolution === '1080p' || torrent.title.toLowerCase().includes('1080i');

        // Check for m2ts format with 1080p/1080i resolution
        if (hasSpecialFormat && torrent.specialFormats.includes('m2ts') && is1080) {
            // For 1080p/1080i m2ts, we specifically want to find "Blu-ray Image"
            let foundBlurMatch = false;

            ['HD', 'UHD', 'SD'].forEach(category => { // Check HD first for Blu-ray
                if (foundBlurMatch || !tooltipFormats[category]) return;

                tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                    if (format.toLowerCase().includes('blu-ray image')) {
                        if (!matchingFormats[category].includes(format)) {
                            matchingFormats[category].push(format);
                        }
                        foundBlurMatch = true;
                        matchedTorrents.add(torrent.torrentId);
                    }
                });
            });

            if (foundBlurMatch) {
                continue; // Skip to next torrent
            }
        }
    }

    // Step 3: Look for standard resolution matches for all remaining torrents
    for (const torrent of seedingTorrents) {
        // Skip if already matched
        if (matchedTorrents.has(torrent.torrentId)) continue;

        // Skip remux files as they've already been handled
        const isRemux = torrent.features && torrent.features.includes('remux');
        if (isRemux && (torrent.resolution === '1080p' || torrent.resolution === '2160p')) {
            continue;
        }

        // Only check resolution if it's a standard one
        if (['720p', '1080p', '2160p'].includes(torrent.resolution)) {
            // Try to find the resolution match
            let foundResMatch = false;

            ['SD', 'HD', 'UHD'].forEach(category => {
                if (foundResMatch || !tooltipFormats[category]) return;

                tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                    const formatLower = format.toLowerCase();
                    if (formatLower.includes(torrent.resolution)) {
                        if (!matchingFormats[category].includes(format)) {
                            matchingFormats[category].push(format);
                        }
                        foundResMatch = true;
                        matchedTorrents.add(torrent.torrentId);
                    }
                });
            });

            if (foundResMatch) {
                continue; // Skip to next torrent
            }
        }
    }

    // Step 4: Look for special disc image formats for torrents that don't have a standard resolution match
    for (const torrent of seedingTorrents) {
        // Skip if already matched
        if (matchedTorrents.has(torrent.torrentId)) continue;

        // Skip 2160p files at this point (they should have been matched by resolution)
        if (torrent.resolution === '2160p') {
            continue;
        }

        const hasSpecialFormat = torrent.specialFormats && torrent.specialFormats.length > 0;

        // Only consider m2ts/iso if not matched by resolution
        if (hasSpecialFormat && (torrent.specialFormats.includes('m2ts'))) {
            // Scan all categories to find which one has "Blu-ray image"
            let foundMatch = false;

            ['HD', 'SD', 'UHD'].forEach(category => { // Check HD first as it's most common
                if (foundMatch || !tooltipFormats[category]) return;

                tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                    if (format.toLowerCase().includes('blu-ray image')) {
                        if (!matchingFormats[category].includes(format)) {
                            matchingFormats[category].push(format);
                        }
                        foundMatch = true;
                        matchedTorrents.add(torrent.torrentId);
                    }
                });
            });

            if (foundMatch) {
                continue; // Skip to next torrent
            }
        }

        function isDVDRip(torrent) {
            return torrent.fullTitle &&
                   (torrent.fullTitle.toLowerCase().includes('dvdrip') ||
                    torrent.fullTitle.toLowerCase().includes('dvd-rip') ||
                    torrent.fullTitle.toLowerCase().includes('dvd rip'));
        }

        // Add a specific check for x264 DVD rips before the DVD image check
        if (torrent.codec === 'x264' && isDVDRip(torrent)) {
            let foundCodecMatch = false;

            ['SD', 'HD', 'UHD'].forEach(category => {
                if (foundCodecMatch || !tooltipFormats[category]) return;

                tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                    const formatLower = format.toLowerCase();
                    if (formatLower.includes('x264')) {
                        if (!matchingFormats[category].includes(format)) {
                            matchingFormats[category].push(format);
                        }
                        foundCodecMatch = true;
                        matchedTorrents.add(torrent.torrentId);
                    }
                });
            });

            if (foundCodecMatch) {
                continue; // Skip to next torrent
            }
        }

        // In the Step 4 section for DVD images:
        if (hasSpecialFormat && torrent.specialFormats.includes('image') && !isDVDRip(torrent)) {
            // Scan all categories to find which one has "DVD image"
            let foundMatch = false;

            ['SD', 'HD', 'UHD'].forEach(category => { // Check SD first for DVD
                if (foundMatch || !tooltipFormats[category]) return;

                tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                    if (format.toLowerCase().includes('dvd image')) {
                        // Determine if this is NTSC or PAL
                        const isNTSC = torrent.fullTitle && torrent.fullTitle.toUpperCase().includes('NTSC');
                        const isPAL = torrent.fullTitle && torrent.fullTitle.toUpperCase().includes('PAL');

                        // Create a custom format name with NTSC/PAL designation
                        let formatName = format;
                        if (isNTSC) {
                            formatName = "NTSC DVD Image";
                        } else if (isPAL) {
                            formatName = "PAL DVD Image";
                        }

                        if (!matchingFormats[category].includes(formatName)) {
                            // Add the specific format name instead of the generic one
                            matchingFormats[category].push(formatName);
                        }

                        foundMatch = true;
                        matchedTorrents.add(torrent.torrentId);
                    }
                });
            });

            if (foundMatch) {
                continue; // Skip to next torrent
            }
        }
    }

    // Step 5: For x264 without standard resolution, only highlight x264
    for (const torrent of seedingTorrents) {
        // Skip if already matched
        if (matchedTorrents.has(torrent.torrentId)) continue;

        if (torrent.codec === 'x264' && !['720p', '1080p', '2160p'].includes(torrent.resolution)) {
            let foundCodecMatch = false;

            ['SD', 'HD', 'UHD'].forEach(category => {
                if (foundCodecMatch || !tooltipFormats[category]) return;

                tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                    const formatLower = format.toLowerCase();
                    // Only match x264 if it's not part of a resolution format
                    if (formatLower.includes('x264') &&
                        !(/720p|1080p|2160p/).test(formatLower)) {
                        if (!matchingFormats[category].includes(format)) {
                            matchingFormats[category].push(format);
                        }
                        foundCodecMatch = true;
                        matchedTorrents.add(torrent.torrentId);
                    }
                });
            });

            if (foundCodecMatch) {
                continue; // Skip to next torrent
            }
        }
    }

    // Step 6: Fallback for other quality matches only if no previous match
    for (const torrent of seedingTorrents) {
        // Skip if already matched
        if (matchedTorrents.has(torrent.torrentId)) continue;

        ['SD', 'HD', 'UHD'].forEach(category => {
            if (matchedTorrents.has(torrent.torrentId) || !tooltipFormats[category]) return;

            tooltipFormats[category].split(',').map(f => f.trim()).forEach(format => {
                const formatLower = format.toLowerCase();

                // Filter out formats with resolutions for codec matching
                const hasResolution = /\d+p|480|576|720|1080|2160|4k|uhd|hd|sd/.test(formatLower);

                if (!hasResolution) {
                    // For xvid/source/features
                    if ((torrent.codec === 'xvid' && formatLower.includes('xvid')) ||
                        formatLower.includes(torrent.source) ||
                        torrent.features.some(feature => formatLower.includes(feature))) {

                        if (!matchingFormats[category].includes(format)) {
                            matchingFormats[category].push(format);
                        }
                        matchedTorrents.add(torrent.torrentId);
                    }
                }
            });
        });
    }

    return matchingFormats;
}

function setupFormatInfoCapture() {
    //console.log("Setting up format info capture from tooltips");

    // Store format information for movies (define at the function scope)
    const movieFormats = new Map();

    // Create a mutation observer to watch for tooltip creation and changes
    const observer = new MutationObserver((mutations) => {
        // First, check for new tooltips being added
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.classList && node.classList.contains('qtip-ptp')) {
                        processTooltip(node, movieFormats); // Pass movieFormats as parameter
                    }
                }
            }
        }

        // Then check for changes to existing tooltips
        const tooltips = document.querySelectorAll('.qtip-ptp');
        tooltips.forEach(tooltip => {
            // Check if this tooltip has been processed recently
            const lastProcessed = tooltip.getAttribute('data-last-processed');
            const now = Date.now();

            // Only process tooltips that haven't been processed in the last 100ms
            // to avoid unnecessary reprocessing during animations
            if (!lastProcessed || now - parseInt(lastProcessed, 10) > 100) {
                processTooltip(tooltip, movieFormats); // Pass movieFormats as parameter
                tooltip.setAttribute('data-last-processed', now.toString());
            }
        });
    });

    // Start observing the body for added tooltip nodes and changes to existing ones
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style'] // To detect when tooltips are shown/hidden
    });

    return {
        observer,
        movieFormats
    };
}

function extractTitleFromHTML(htmlString) {
    // Create a temporary element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Find the a tag with the title attribute
    const link = tempDiv.querySelector('a[title]');
    if (link) {
        // Get the title attribute which contains the actual torrent name
        const titleAttr = link.getAttribute('title');
        // The title attribute might contain 'Seeding\n' or 'Snatched\n' prefix, so we split and get the last part
        const parts = titleAttr.split('\n');
        return parts[parts.length - 1];
    }
    return null;
}

function extractFormatAttributesFromHTML(htmlString) {
    // Create a temporary element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Find the a tag with content
    const link = tempDiv.querySelector('a');
    if (link) {
        // Get the inner text which contains format attributes
        // Example: "x264 / MKV / Blu-ray / 720p / With Commentary"
        const formatText = link.textContent.trim();

        if (formatText) {
            // Split by / and clean up each attribute
            return formatText.split('/')
                .map(attr => attr.trim().replace(/\\\//, ''))  // Remove escaped slashes
                .filter(attr => attr !== '');  // Remove empty entries
        }
    }
    return [];
}

function checkMovieMatchesFilters(groupId) {
    const seedingMovie = window.seedingMoviesMap.get(groupId);
    if (!seedingMovie || !seedingMovie.seedingTorrents) {
        return false;
    }

    // Check if we should filter by checkbox state
    if (CONFIG.filterCheckboxState && CONFIG.filterCheckboxState.length > 0) {
        const filterStates = CONFIG.filterCheckboxState.map(s => s.toLowerCase());

        // Check if any seeding torrent matches the checkbox filter
        const matchesCheckboxFilter = seedingMovie.seedingTorrents.some(torrent => {
            // Check for Golden Popcorn status
            if (torrent.isGoldenPopcorn && filterStates.includes('gp')) {
                return true;
            }

            // Check for checked status (not GP)
            if (!torrent.isGoldenPopcorn && torrent.isChecked && filterStates.includes('checked')) {
                return true;
            }

            // Check for unchecked status (not GP and not checked)
            if (!torrent.isGoldenPopcorn && !torrent.isChecked && filterStates.includes('unchecked')) {
                return true;
            }

            return false;
        });

        if (!matchesCheckboxFilter) {
            return false;
        }
    }

    // Check if we should filter by quality
    if (CONFIG.filterQualities && CONFIG.filterQualities.length > 0) {
        // Convert filter qualities to lowercase for case-insensitive matching
        const filterLower = CONFIG.filterQualities.map(q => q.toLowerCase());

        // Check if any seeding torrent matches the filter qualities
        const matchesFilter = seedingMovie.seedingTorrents.some(torrent => {
            return filterLower.some(filter => {
                // Check resolution directly
                if (torrent.resolution && torrent.resolution.toLowerCase() === filter) {
                    return true;
                }

                // Check codec
                if (torrent.codec && torrent.codec.toLowerCase().includes(filter)) {
                    return true;
                }

                // Check source
                if (torrent.source && torrent.source.toLowerCase().includes(filter)) {
                    return true;
                }

                // Check features (remux, HDR, etc.)
                if (torrent.features && torrent.features.some(f => f.toLowerCase().includes(filter))) {
                    return true;
                }

                // Check special formats
                if (torrent.specialFormats && torrent.specialFormats.some(f => f.toLowerCase().includes(filter))) {
                    return true;
                }

                // Check title as a fallback
                if (torrent.fullTitle && torrent.fullTitle.toLowerCase().includes(filter)) {
                    return true;
                }

                return false;
            });
        });

        if (!matchesFilter) {
            return false;
        }
    }

    return true;
}

function processTooltip(tooltip, movieFormats) {  // Accept movieFormats as parameter
    const tooltipContent = tooltip.querySelector('.qtip-content');
    if (!tooltipContent) return;

    // Try to extract the movie ID from the tooltip
    const movieLink = tooltipContent.querySelector('.movie-tooltip__title');
    if (!movieLink) return;

    const href = movieLink.getAttribute('href');
    if (!href) return;

    // Extract GroupId from href
    const match = href.match(/id=(\d+)/);
    if (!match) return;

    const groupId = match[1];
    //console.log(`Tooltip detected for GroupId: ${groupId}`);

    // Extract format info from the tooltip
    const formatInfo = extractFormatsFromTooltip(tooltipContent);
    //console.log(`Formats extracted from tooltip:`, formatInfo);

    // Store the format info
    if (movieFormats) {
        movieFormats.set(groupId, formatInfo);
    }

    // Check if this is a seeding movie and highlight matching qualities
    const seedingTorrents = window.seedingMoviesMap ? window.seedingMoviesMap.get(groupId) : null;
    if (seedingTorrents && seedingTorrents.seedingTorrents) {
        // Match seeding torrents with tooltip formats
        const matchingFormats = matchSeedingTorrentsWithTooltip(formatInfo, seedingTorrents.seedingTorrents);

        // Highlight the matching qualities in the tooltip
        highlightMatchingQualities(tooltipContent, matchingFormats);

        // Find the torrents div and action row to add our seeding torrents list between them
        const torrentsDiv = tooltipContent.querySelector('.movie-tooltip__torrents');
        const actionRow = tooltipContent.querySelector('.movie-tooltip__action-row');

        if (torrentsDiv && actionRow) {
            // Check if we've already added the seeding torrents section
            const existingSeedingSection = tooltipContent.querySelector('.movie-tooltip__seeding-torrents');
            if (existingSeedingSection) {
                existingSeedingSection.remove(); // Remove old section if it exists
            }

            // Create a new section for seeding torrents
            const seedingTorrentsSection = document.createElement('div');
            seedingTorrentsSection.className = 'movie-tooltip__seeding-torrents';
            seedingTorrentsSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
            seedingTorrentsSection.style.padding = '8px 0';
            seedingTorrentsSection.style.marginTop = '4px';

            // Add a heading
            const heading = document.createElement('div');
            heading.textContent = '🌱 Your Seeding Torrents:';
            heading.style.fontWeight = 'bold';
            heading.style.marginBottom = '4px';
            seedingTorrentsSection.appendChild(heading);

            // Add each seeding torrent
            seedingTorrents.seedingTorrents.forEach(torrent => {
                const torrentEl = document.createElement('div');
                torrentEl.style.fontSize = '0.9em';
                torrentEl.style.marginLeft = '10px';
                torrentEl.style.marginBottom = '2px';

                // Try to find the exact title from JSON data (already done in extraction)
                const fullTitle = torrent.fullTitle || null;

                console.log(`Torrent checkbox state for ${torrent.torrentId}:`, {
                    isGoldenPopcorn: torrent.isGoldenPopcorn,
                    isChecked: torrent.isChecked,
                    fullTitle: torrent.fullTitle
                });

                // Create checkbox indicator if enabled in config
                let checkboxIndicator = '';
                if (CONFIG.showCheckbox) {
                    if (torrent.isGoldenPopcorn) {
                        checkboxIndicator = '<span style="color: #FFD700;">✿</span> '; // Golden color for the flower
                    } else if (torrent.isChecked) {
                        checkboxIndicator = '✅ '; // Checked box
                    } else {
                        checkboxIndicator = '☐ '; // Unchecked box
                    }
                }

                // Create info suffix if enabled in config
                let infoSuffix = '';
                if (CONFIG.showFileSize && torrent.fileSize) {
                    infoSuffix += ` [${torrent.fileSize}]`;
                }
                if (CONFIG.showSeeders && torrent.seedersCount) {
                    infoSuffix += ` [${torrent.seedersCount} seeders]`;
                }

                const linkPrefix = `<a href="torrents.php?id=${groupId}&torrentid=${torrent.torrentId}" style="margin-right: 5px; color: #6699cc; font-weight: bold;">[PL]</a>`;

                // Use the extracted title or fallback to the summary
                if (CONFIG.PLLast) {
                  if (fullTitle) {
                      torrentEl.innerHTML = `• ${checkboxIndicator}${fullTitle}${infoSuffix} ${linkPrefix}`;
                  } else {
                      // Create a summary description if we couldn't find the exact title
                      const desc = `${torrent.resolution} ${torrent.codec} ${torrent.source} ${torrent.features.join(' ')}`.trim();
                      torrentEl.innerHTML = `• ${checkboxIndicator}${desc}${infoSuffix} ${linkPrefix}`;
                  }
                } else {
                  if (fullTitle) {
                      torrentEl.innerHTML = `• ${linkPrefix}${checkboxIndicator}${fullTitle}${infoSuffix}`;
                  } else {
                      // Create a summary description if we couldn't find the exact title
                      const desc = `${torrent.resolution} ${torrent.codec} ${torrent.source} ${torrent.features.join(' ')}`.trim();
                      torrentEl.innerHTML = `• ${linkPrefix}${checkboxIndicator}${desc}${infoSuffix}`;
                  }
                }

                // Add special format indicator if applicable
                if (torrent.specialFormats && torrent.specialFormats.length > 0) {
                    const specialFormat = torrent.specialFormats.join(', ');
                    const specialFormatSpan = document.createElement('span');
                    specialFormatSpan.style.color = '#66ccff';
                    specialFormatSpan.style.fontSize = '0.85em';
                    specialFormatSpan.style.marginLeft = '5px';
                    specialFormatSpan.textContent = `(${specialFormat})`;
                    seedingTorrentsSection.appendChild(torrentEl);
                    //torrentEl.appendChild(specialFormatSpan);
                }

                // Add the matching category labels if any
                const matchesList = [];
                ['SD', 'HD', 'UHD'].forEach(category => {
                    const matches = [];

                    // Check formats for this category
                    if (formatInfo[category]) {
                        formatInfo[category].split(',').map(f => f.trim()).forEach(format => {
                            const formatLower = format.toLowerCase();

                            // Special case 1: 1080p remux should match remux in HD category
                            if (torrent.features.includes('remux') && torrent.resolution === '1080p' &&
                                category === 'HD' && formatLower.includes('remux')) {
                                matches.push(format);
                            }
                            // Special case 2: 2160p remux should match remux in UHD category
                            else if (torrent.features.includes('remux') && torrent.resolution === '2160p' &&
                                    category === 'UHD') {
                                if (formatLower.includes('remux')) {
                                    matches.push(format);
                                } else if (!matches.length) {
                                    // If no remux found in existing formats, add it
                                    matches.push("Remux");
                                }
                            }
                            // Special case 3: 1080p/1080i m2ts should match Blu-ray Image
                            else if (torrent.specialFormats &&
                                torrent.specialFormats.includes('m2ts') &&
                                (torrent.resolution === '1080p' || torrent.title.toLowerCase().includes('1080i')) &&
                                formatLower.includes('blu-ray image')) {
                                matches.push(format);
                            }
                            // Standard resolution match (for non-remux files or resolutions other than 1080p/2160p)
                            else if ((['720p', '1080p', '2160p'].includes(torrent.resolution)) &&
                                    formatLower.includes(torrent.resolution) &&
                                    !(torrent.features.includes('remux') &&
                                      (torrent.resolution === '1080p' || torrent.resolution === '2160p'))) {
                                matches.push(format);
                            }
                            // Special formats for non-2160p files that weren't matched by resolution
                            else if (torrent.resolution !== '2160p' &&
                                !matches.length &&
                                torrent.specialFormats &&
                                torrent.specialFormats.length > 0) {
                            if (torrent.specialFormats.includes('m2ts') && formatLower.includes('blu-ray image')) {
                                matches.push(format);
                            }
                            // For DVD content, prioritize x264/xvid detection over DVD Image for DVDRip files
                            function isDVDRip(torrent) {
                                return torrent.fullTitle &&
                                    (torrent.fullTitle.toLowerCase().includes('dvdrip') ||
                                    torrent.fullTitle.toLowerCase().includes('dvd-rip') ||
                                    torrent.fullTitle.toLowerCase().includes('dvd rip'));
                            }

                            // Then in the matching logic:
                            // Check if this is a DVD rip with codec
                            if ((torrent.source === 'dvd' && (torrent.codec === 'x264' || torrent.codec === 'xvid')) &&
                                isDVDRip(torrent) &&
                                formatLower.includes(torrent.codec)) {
                                matches.push(format);
                            }
                            // For DVD image formats (only if not a rip)
                            else if (torrent.specialFormats &&
                                torrent.specialFormats.includes('image') &&
                                !isDVDRip(torrent) &&
                                formatLower.includes('dvd image')) {

                                // Create a custom format name with NTSC/PAL designation if enabled
                                let formatName = format;
                                if (CONFIG.showDVDRegionInTooltip) {
                                    if (torrent.specialFormats.includes('ntsc')) {
                                        formatName = "NTSC DVD Image";
                                    } else if (torrent.specialFormats.includes('pal')) {
                                        formatName = "PAL DVD Image";
                                    }
                                } else {
                                    // When DVDRegionInTooltip is false, use the original format for matching
                                    formatName = "DVD Image";
                                }
                                matches.push(formatName);
                            }
                        }
                            // x264 without standard resolution
                            else if (torrent.codec === 'x264' &&
                                    !['720p', '1080p', '2160p'].includes(torrent.resolution) &&
                                    formatLower.includes('x264') &&
                                    !(/720p|1080p|2160p/).test(formatLower)) {
                                matches.push(format);
                            }
                            // Other non-resolution matches
                            else if (!/\d+p|480|576|720|1080|2160|4k|uhd|hd|sd/.test(formatLower)) {
                                if ((torrent.codec === 'xvid' && formatLower.includes('xvid')) ||
                                    formatLower.includes(torrent.source) ||
                                    torrent.features.some(feature => formatLower.includes(feature) &&
                                                         !(feature === 'remux' && (torrent.resolution === '1080p' || torrent.resolution === '2160p')))) {
                                    matches.push(format);
                                }
                            }
                        });
                    }

                    // Special case: If this is a 2160p remux and we didn't find any matching format in UHD
                    if (category === 'UHD' && torrent.resolution === '2160p' &&
                        torrent.features.includes('remux') && matches.length === 0) {
                        matches.push("Remux");
                    }

                    if (matches.length > 0) {
                        matchesList.push(`${category}: ${matches.join(', ')}`);
                    }
                });

                // Add match info if available
                if (matchesList.length > 0) {
                    const matchSpan = document.createElement('span');
                    matchSpan.style.color = 'orange';
                    matchSpan.style.fontSize = '0.85em';
                    matchSpan.style.marginLeft = '8px';
                    matchSpan.textContent = `(Matches: ${matchesList.join('; ')})`;
                    //torrentEl.appendChild(matchSpan);
                }

                seedingTorrentsSection.appendChild(torrentEl);
            });

            // Insert the section between torrents div and action row
            torrentsDiv.parentNode.insertBefore(seedingTorrentsSection, actionRow);
        }

        // Update overlay if this movie is being seeded
        updateOverlayIfSeeding(groupId, formatInfo);
    }
}

function highlightMatchingQualities(tooltipContent, matchingFormats) {
    // Find the torrents div
    const torrentsDiv = tooltipContent.querySelector('.movie-tooltip__torrents');
    if (!torrentsDiv) return;

    // Reset any previous highlighting by removing all spans
    const existingHighlights = tooltipContent.querySelectorAll('span.seeding-highlight');
    existingHighlights.forEach(el => {
        // Replace with the original text content
        el.outerHTML = el.textContent;
    });

    // Check if we need to add "Remux" to UHD section
    const hasUHDRemux = matchingFormats.UHD && matchingFormats.UHD.includes("Remux");

    // Check for custom DVD image formats (NTSC/PAL)
    const hasDVDImageFormat = (category) => {
        if (!matchingFormats[category]) return null;
        const ntscFormat = matchingFormats[category].find(f => f === 'NTSC DVD Image');
        const palFormat = matchingFormats[category].find(f => f === 'PAL DVD Image');
        return CONFIG.showDVDRegionInTooltip ? (ntscFormat || palFormat) : null;
    };

    const dvdFormatSD = hasDVDImageFormat('SD');

    // Get all the format divs
    const formatDivs = torrentsDiv.querySelectorAll('div');

    formatDivs.forEach(div => {
        const text = div.textContent.trim();

        // Check if this is an SD, HD, or UHD div
        if (text.startsWith('SD:')) {
            // Special handling for DVD Image with NTSC/PAL if enabled
            if (dvdFormatSD && text.toLowerCase().includes('dvd image') && CONFIG.showDVDRegionInTooltip) {
                // Replace "DVD Image" with custom format but don't modify other formats
                const formatText = text.substring(3).trim();
                let newFormatText = formatText;

                // Split formats by comma
                const formats = formatText.split(',').map(f => f.trim());

                // Find and replace just the DVD Image format, not others
                const updatedFormats = formats.map(format => {
                    if (format.toLowerCase() === 'dvd image') {
                        return `<span class="seeding-highlight" style="color: orange; font-weight: bold;">${dvdFormatSD}</span>`;
                    }
                    // For other formats that might match
                    if (matchingFormats.SD && matchingFormats.SD.includes(format)) {
                        return `<span class="seeding-highlight" style="color: orange; font-weight: bold;">${format}</span>`;
                    }
                    return format;
                });

                div.innerHTML = `SD: ${updatedFormats.join(', ')}`;
            } else {
                // Check if we have a DVD match but showDVDRegionInTooltip is false
                const hasDVDMatch = !CONFIG.showDVDRegionInTooltip &&
                                    matchingFormats.SD &&
                                    matchingFormats.SD.some(f =>
                                        f === 'NTSC DVD Image' ||
                                        f === 'PAL DVD Image' ||
                                        f === 'DVD Image');

                // If there's a DVD match but we shouldn't show region, convert to generic DVD Image for highlighting
                if (hasDVDMatch) {
                    // For highlighting purposes, convert NTSC/PAL DVD Image to just "DVD Image"
                    const modifiedFormats = [...(matchingFormats.SD || [])];

                    // Replace any NTSC/PAL DVD Image with generic DVD Image
                    for (let i = 0; i < modifiedFormats.length; i++) {
                        if (modifiedFormats[i] === 'NTSC DVD Image' || modifiedFormats[i] === 'PAL DVD Image') {
                            modifiedFormats[i] = 'DVD Image';
                        }
                    }

                    highlightMatchingFormatsInDiv(div, modifiedFormats);
                } else {
                    // Normal highlighting for non-DVD formats or when no DVD matches
                    highlightMatchingFormatsInDiv(div, matchingFormats.SD);
                }
            }
        } else if (text.startsWith('HD:')) {
            highlightMatchingFormatsInDiv(div, matchingFormats.HD);
        } else if (text.startsWith('UHD:')) {
            // Special handling for UHD with Remux
            if (hasUHDRemux) {
                // First check if "Remux" is already in the text
                if (!text.toLowerCase().includes('remux')) {
                    // Add "Remux" to the UHD formats list
                    const formatText = text.substring(4).trim();
                    div.innerHTML = `UHD: ${formatText}, <span class="seeding-highlight" style="color: orange; font-weight: bold;">Remux</span>`;

                    // Filter out "Remux" from the matching formats to avoid duplicating it
                    const filteredFormats = matchingFormats.UHD.filter(format => format !== "Remux");
                    highlightMatchingFormatsInDiv(div, filteredFormats);
                } else {
                    // If "Remux" is already in the text, just highlight normally
                    highlightMatchingFormatsInDiv(div, matchingFormats.UHD);
                }
            } else {
                // Standard highlighting
                highlightMatchingFormatsInDiv(div, matchingFormats.UHD);
            }
        }
    });
}

function highlightMatchingFormatsInDiv(div, matchingFormatsList) {
    if (!matchingFormatsList || matchingFormatsList.length === 0) return;

    // Get the text content
    let htmlContent = div.innerHTML;

    // For each matching format, wrap it in a colored span
    matchingFormatsList.forEach(format => {
        // Make the format safe for regex
        const safeFormat = format.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

        // Create a regex that matches the format but not inside HTML tags
        // Use word boundaries to avoid matching parts of larger words
        const regex = new RegExp(`(\\b${safeFormat}\\b)(?![^<]*>|[^<>]*</)`, 'gi');
        htmlContent = htmlContent.replace(regex, '<span class="seeding-highlight" style="color: orange; font-weight: bold;">$1</span>');
    });

    // Update the div's HTML content
    div.innerHTML = htmlContent;
}

function updateOverlayIfSeeding(groupId, formatInfo) {
    // Check if this movie has a seeding overlay
    const selectors = [
        `a[href*='torrents.php?id=${groupId}']`,
        `*[data-group-id='${groupId}']`,
        `a[href*='id=${groupId}']`
    ];

    let movieElement = null;
    for (const selector of selectors) {
        movieElement = document.querySelector(selector);
        if (movieElement) break;
    }

    if (!movieElement) return;

    // Try to get the container
    const movieContainer =
        movieElement.closest('.cover-movie-list__movie') ||
        movieElement.closest('.js-movie-tooltip-triggerer');

    if (!movieContainer) return;

    // Find the cover link
    const coverLink = movieContainer.querySelector('.cover-movie-list__movie__cover-link');
    if (!coverLink || !coverLink.classList.contains('seeding-movie-cover')) {
        // Not a seeding movie or overlay not applied
        return;
    }

    // This is a seeding movie with an overlay, get matching format info
    const seedingTorrents = window.seedingMoviesMap ? window.seedingMoviesMap.get(groupId) : null;

    if (seedingTorrents && seedingTorrents.seedingTorrents) {
        // Get movie title for better logging
        const movieTitle = seedingTorrents.title || `Movie ${groupId}`;

        // Format log output - focus on which seeding torrent matches which format
        const seedingMatches = [];

        // For each seeding torrent, find what tooltip format it matches
        seedingTorrents.seedingTorrents.forEach(torrent => {
            const matches = {
                SD: [],
                HD: [],
                UHD: []
            };

            // Check for resolution matches only first
            function checkResolutionMatch(category, formats) {
                if (!formats) return false;

                let hasResolutionMatch = false;
                formats.split(',').map(f => f.trim()).forEach(format => {
                    if (format.toLowerCase().includes(torrent.resolution)) {
                        matches[category].push(format);
                        hasResolutionMatch = true;
                    }
                });
                return hasResolutionMatch;
            }

            // Check for fallback matches only if no resolution match was found
            function checkFallbackMatches(category, formats) {
                if (!formats || matches[category].length > 0) return; // Skip if we already have matches or no formats

                formats.split(',').map(f => f.trim()).forEach(format => {
                    const formatLower = format.toLowerCase();
                    const hasResolution = /\d+p|480|576|720|1080|2160|4k|uhd|hd|sd/.test(formatLower);

                    if (!hasResolution && (
                        formatLower.includes(torrent.codec) ||
                        formatLower.includes(torrent.source) ||
                        torrent.features.some(feature => formatLower.includes(feature))
                    )) {
                        matches[category].push(format);
                    }
                });
            }

            // First try resolution matches for all categories
            const hasSDResMatch = checkResolutionMatch('SD', formatInfo.SD);
            const hasHDResMatch = checkResolutionMatch('HD', formatInfo.HD);
            const hasUHDResMatch = checkResolutionMatch('UHD', formatInfo.UHD);

            // If no resolution match in any category, try fallback matches
            if (!hasSDResMatch && !hasHDResMatch && !hasUHDResMatch) {
                checkFallbackMatches('SD', formatInfo.SD);
                checkFallbackMatches('HD', formatInfo.HD);
                checkFallbackMatches('UHD', formatInfo.UHD);
            }

            // Create a summary for this torrent
            const torrentDescription = `${torrent.resolution} ${torrent.codec} ${torrent.source} ${torrent.features.join(' ')}`;

            const matchesList = [];
            if (matches.SD.length > 0) matchesList.push(`SD: ${matches.SD.join(', ')}`);
            if (matches.HD.length > 0) matchesList.push(`HD: ${matches.HD.join(', ')}`);
            if (matches.UHD.length > 0) matchesList.push(`UHD: ${matches.UHD.join(', ')}`);

            seedingMatches.push(`   ▶ ${torrentDescription.trim()} → ${matchesList.length > 0 ? matchesList.join('; ') : 'No matches'}`);
        });

        // Log detailed matching information
        //if (seedingMatches.length > 0) {
        //    console.log(`🎬 ${movieTitle} (ID: ${groupId}) - Seeding torrents match:`);
        //    console.log(seedingMatches.join('\n'));
        //    console.log(`   Available formats: SD: ${formatInfo.SD || 'none'}, HD: ${formatInfo.HD || 'none'}, UHD: ${formatInfo.UHD || 'none'}`);
        //} else {
        //    console.log(`🎬 ${movieTitle} (ID: ${groupId}) - No tooltip format matches found for seeding torrents`);
        //}
    }
}

function setupPageChangeDetection() {
    //console.log("Setting up page change detection");

    // Keep track of the current page URL to detect changes
    let currentPageUrl = window.location.href;

    // Create a function to check if we need to reinitialize
    const checkForPageChange = () => {
        // Check if URL has changed (includes pagination changes)
        if (window.location.href !== currentPageUrl) {
            //console.log(`Page changed: ${currentPageUrl} -> ${window.location.href}`);
            currentPageUrl = window.location.href;

            // Reset and reinitialize
            window.seedingMoviesMap = null;
            window.movieFormats = null;

            // Wait a moment for the DOM to update with new content
            setTimeout(() => {
                console.log("Reinitializing after page change");
                init();
            }, 500);
        }
    };

    // Check for URL changes regularly (especially for SPA-like behavior)
    setInterval(checkForPageChange, 1000);

    // Create a mutation observer to watch for DOM changes that might indicate page content changes
    const observer = new MutationObserver((mutations) => {
        // Look for significant DOM changes that suggest page content refreshed
        const significantChange = mutations.some(mutation => {
            // Check if movie containers were added or removed
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        (node.classList && node.classList.contains('cover-movie-list__movie') ||
                         node.querySelector && node.querySelector('.cover-movie-list__movie'))) {
                        return true;
                    }
                }
            }

            // Check if the movie container's parent was modified
            const movieContainer = document.querySelector('.cover-movie-lists');
            if (movieContainer && (mutation.target === movieContainer || movieContainer.contains(mutation.target))) {
                // Check if this is a significant change (many children added/removed)
                if (mutation.addedNodes.length > 3 || mutation.removedNodes.length > 3) {
                    return true;
                }
            }

            return false;
        });

        if (significantChange) {
            //console.log("Detected significant DOM changes, reinitializing...");
            // Reset and reinitialize
            window.seedingMoviesMap = null;
            window.movieFormats = null;

            // Wait a moment for the DOM to update completely
            setTimeout(() => {
                //console.log("Reinitializing after DOM changes");
                init();
            }, 500);
        }
    });

    // Monitor the movie container or the entire body if not found
    const movieContainer = document.querySelector('.cover-movie-lists') || document.body;
    observer.observe(movieContainer, {
        childList: true,
        subtree: true
    });

    return observer;
}

function init() {
    console.log("Initializing PTP Bookmarks Seeding Highlighter");

    // Log the active quality filters if any
    if (CONFIG.filterQualities && CONFIG.filterQualities.length > 0) {
        console.log(`Quality filtering enabled. Only showing: ${CONFIG.filterQualities.join(', ')}`);
    } else {
        console.log("Quality filtering disabled. Showing all seeding torrents.");
    }

    // Log the active checkbox state filters if any
    if (CONFIG.filterCheckboxState && CONFIG.filterCheckboxState.length > 0) {
        console.log(`Checkbox state filtering enabled. Only showing: ${CONFIG.filterCheckboxState.join(', ')}`);
    }

    // Log non-matching overlay settings
    if (CONFIG.showNonMatchingOverlay) {
        console.log(`Non-matching seeding torrents will be highlighted in ${CONFIG.nonMatchingHighlightColor}`);
    }

    injectGlobalStyle();

    // Set up page change detection if not already done
    if (!window.pageChangeObserver) {
        window.pageChangeObserver = setupPageChangeDetection();
    }

    // Add monitor for highlighted covers
    if (!window.highlightMonitor) {
        window.highlightMonitor = monitorHighlightedCovers();
    }

    // Try to highlight immediately, then set up retries if needed
    highlightSeedingMovies().then(success => {
        if (!success) {
            console.log("Initial attempt failed, setting up retries");
            // Set up retries with increasing delays
            setTimeout(() => retryHighlighting(1), 1000);
        }
    });
}

function retryHighlighting(attempt) {
    const maxAttempts = 5;
    if (attempt > maxAttempts) {
        console.warn(`Failed to highlight seeding movies after ${maxAttempts} attempts`);
        return;
    }

    //console.log(`Retry attempt ${attempt} of ${maxAttempts}`);
    highlightSeedingMovies().then(success => {
        if (!success && attempt < maxAttempts) {
            // Exponential backoff with jitter
            const delay = Math.min(2000 * Math.pow(1.5, attempt) + Math.random() * 1000, 10000);
            setTimeout(() => retryHighlighting(attempt + 1), delay);
        }
    });
}

async function highlightSeedingMovies() {
    //log("Running highlightSeedingMovies");
    try {
        // Set up format capture for when users naturally hover
        const formatCapture = setupFormatInfoCapture();

        // Store the movieFormats map in the window object for global access
        window.movieFormats = formatCapture.movieFormats;

        const movies = await waitForJsonData();
        if (!movies || movies.length === 0) {
            console.warn("No movies found in extracted JSON");
            return false;
        }

        // Extract seeding torrents with their quality information
        const seedingMoviesMap = extractSeedingTorrentsWithQualities(movies);
        if (seedingMoviesMap.size === 0) {
            console.warn("No seeding movies found");
            return true; // This is still a valid result, just no seeding movies
        }

        // Store for later use when tooltips appear naturally
        window.seedingMoviesMap = seedingMoviesMap;

        // Track non-matching movies for alternate highlight
        const nonMatchingMovies = new Map();

        // Apply overlays to all seeding movies immediately
        if (CONFIG.enableHighlight) {
            //log(`Applying overlays to ${seedingMoviesMap.size} seeding movies`);

            // First determine which movies match/don't match filters
            for (const [groupId, movieData] of seedingMoviesMap.entries()) {
                try {
                    const matchesFilter = checkMovieMatchesFilters(groupId);
                    if (!matchesFilter && CONFIG.showNonMatchingOverlay) {
                        nonMatchingMovies.set(groupId, movieData);
                    }
                } catch (error) {
                    console.error(`Error checking filters for ${movieData.title}:`, error);
                }
            }

            // Apply primary highlight to matching movies
            for (const [groupId, movieData] of seedingMoviesMap.entries()) {
                try {
                    if (!nonMatchingMovies.has(groupId)) {
                        //log(`Applying primary overlay for matching movie: ${movieData.title}`);
                        applyOverlay(groupId, false);
                    }
                } catch (error) {
                    console.error(`Error applying overlay for ${movieData.title}:`, error);
                }
            }

            // Apply alternate highlight to non-matching movies
            if (CONFIG.showNonMatchingOverlay) {
                log(`Applying alternate overlays to ${nonMatchingMovies.size} non-matching seeding movies`);
                for (const [groupId, movieData] of nonMatchingMovies.entries()) {
                    try {
                        //log(`Applying alternate overlay for non-matching movie: ${movieData.title}`);
                        applyOverlay(groupId, true);
                    } catch (error) {
                        console.error(`Error applying non-matching overlay for ${movieData.title}:`, error);
                    }
                }
            }

            //log("Overlays applied. Waiting for user hover to update with format details.");
        } else {
            //log("Overlays disabled in configuration. Only tooltip highlighting will be active.");
        }
        return true;
    } catch (error) {
        console.error("Error in highlightSeedingMovies:", error);
        return false;
    }
}

function applyOverlay(groupId, isNonMatching = false) {
    // Skip if highlighting is disabled in config
    if (!CONFIG.enableHighlight) {
        log(`Highlighting disabled, skipping overlay for ID: ${groupId}`);
        return;
    }

    // Skip non-matching movies if their overlay is disabled
    if (isNonMatching && !CONFIG.showNonMatchingOverlay) {
        return;
    }

    const seedingMovie = window.seedingMoviesMap.get(groupId);
    if (!seedingMovie || !seedingMovie.seedingTorrents) {
        log(`No seeding torrents found for ID: ${groupId}, skipping overlay`);
        return;
    }

    // If this is a regular matching overlay, check filters
    // We can skip this check for non-matching overlays since they've already been filtered
    if (!isNonMatching) {
        // Check if movie matches the filters (reusing logic from checkMovieMatchesFilters)
        if (!checkMovieMatchesFilters(groupId)) {
            return;
        }
    }

    // Try multiple selector strategies to find the movie element
    const selectors = [
        `a[href*='torrents.php?id=${groupId}']`,
        `*[data-group-id='${groupId}']`,
        `div[data-coverviewjsonindex] a[href*='id=${groupId}']`,
        `.js-movie-tooltip-triggerer a[href*='id=${groupId}']`,
        // Add selector for collage pages
        `a.cover-movie-list__movie__cover-link[href*='id=${groupId}']`,
        // More generic selector as fallback
        `a[href*='id=${groupId}']`
    ];

    let movieElement = null;
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        // Use the first element that has a valid parent container
        for (const element of elements) {
            const container = findMovieContainer(element);
            if (container) {
                movieElement = element;
                break;
            }
        }
        if (movieElement) break;
    }

    if (!movieElement) {
        log(`Could not find movie element for ID: ${groupId}`);
        return;
    }

    // Use the improved container finder function
    const movieContainer = findMovieContainer(movieElement);

    if (!movieContainer) {
        log(`Could not find movie container for ID: ${groupId}`);
        return;
    }

    //log(`Found container for ${groupId}:`, movieContainer);

    // Find the cover link (the image)
    // First try to use the element itself if it's already a cover link
    let coverLink = null;
    if (movieElement.classList && movieElement.classList.contains('cover-movie-list__movie__cover-link')) {
        coverLink = movieElement;
    } else {
        // Otherwise look for the cover link inside the container
        coverLink = movieContainer.querySelector('.cover-movie-list__movie__cover-link');
    }

    if (!coverLink) {
        log(`Could not find cover link for ID: ${groupId}`);
        return;
    }

    // First, remove any existing highlight classes to avoid conflicts
    coverLink.classList.remove('seeding-movie-cover', 'non-matching-seeding-movie-cover');

    // Add appropriate class for CSS styling
    if (isNonMatching) {
        coverLink.classList.add('non-matching-seeding-movie-cover');
    } else {
        coverLink.classList.add('seeding-movie-cover');
    }

    // Choose highlight color based on whether this is a non-matching movie
    const highlightColor = isNonMatching ?
        CONFIG.nonMatchingHighlightColor :
        CONFIG.highlightColor;

    // Apply the inline style as a backup to the CSS class
    // This provides redundancy to ensure the highlight persists
    coverLink.style.boxShadow = `0 0 ${CONFIG.highlightIntensity}px 10px ${highlightColor} !important`;
    coverLink.style.borderRadius = '8px';
    coverLink.style.position = 'relative';
    coverLink.style.zIndex = '1';

    // Force a repaint to ensure changes are applied
    void coverLink.offsetWidth;

    // Store a data attribute to track which type of overlay is applied
    coverLink.setAttribute('data-highlight-type', isNonMatching ? 'non-matching' : 'matching');

    // Log the application
    //log(`Applied ${isNonMatching ? 'non-matching' : 'matching'} overlay to movie ${groupId}`);
}

function monitorHighlightedCovers() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            // If the mutation is on a cover link element
            if (mutation.target.classList &&
                mutation.target.classList.contains('cover-movie-list__movie__cover-link')) {

                // Check if this is a cover that should have a highlight
                const highlightType = mutation.target.getAttribute('data-highlight-type');
                if (highlightType) {
                    const isNonMatching = highlightType === 'non-matching';

                    // If the highlight class was removed, reapply it
                    if (!mutation.target.classList.contains(isNonMatching ?
                        'non-matching-seeding-movie-cover' : 'seeding-movie-cover')) {

                        //log(`Detected highlight removal, reapplying ${highlightType} highlight`);

                        // Reapply the class
                        if (isNonMatching) {
                            mutation.target.classList.add('non-matching-seeding-movie-cover');
                            mutation.target.style.boxShadow =
                                `0 0 ${CONFIG.highlightIntensity}px 10px ${CONFIG.nonMatchingHighlightColor} !important`;
                        } else {
                            mutation.target.classList.add('seeding-movie-cover');
                            mutation.target.style.boxShadow =
                                `0 0 ${CONFIG.highlightIntensity}px 10px ${CONFIG.highlightColor} !important`;
                        }
                    }
                }
            }
        });
    });

    observer.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });

    return observer;
}

// Helper function to find the movie container from any movie-related element
function findMovieContainer(element) {
    if (!element) return null;

    // If the element itself is a container, return it
    if (element.classList && (
        element.classList.contains('cover-movie-list__movie') ||
        element.classList.contains('js-movie-tooltip-triggerer')
    )) {
        return element;
    }

    // If this is a cover link, return its parent
    if (element.classList && element.classList.contains('cover-movie-list__movie__cover-link')) {
        return element.parentNode;
    }

    // Try to find the closest container
    const container = element.closest('.cover-movie-list__movie') ||
                     element.closest('.js-movie-tooltip-triggerer');

    if (container) return container;

    // If no container found, check parent relationships (for collage and top10 pages)
    let parent = element.parentNode;
    if (!parent) return null;

    // Check if the parent is a container
    if (parent.classList && (
        parent.classList.contains('cover-movie-list__movie') ||
        parent.classList.contains('js-movie-tooltip-triggerer')
    )) {
        return parent;
    }

    // Check one level up (grandparent)
    const grandparent = parent.parentNode;
    if (!grandparent) return null;

    if (grandparent.classList && (
        grandparent.classList.contains('cover-movie-list__movie') ||
        grandparent.classList.contains('js-movie-tooltip-triggerer')
    )) {
        return grandparent;
    }

    // For collage pages, find a parent with a child that has cover-movie-list__movie__title
    let currentElement = element;
    for (let i = 0; i < 4; i++) { // Check up to 4 levels up
        if (!currentElement || !currentElement.parentNode) break;

        currentElement = currentElement.parentNode;

        // Check if this element contains a movie title element
        if (currentElement.querySelector &&
            currentElement.querySelector('.cover-movie-list__movie__title, .cover-movie-list__movie__cover-link')) {
            return currentElement;
        }
    }

    return null;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOMContentLoaded has already fired
    init();
}

// Also listen for load event as backup
window.addEventListener('load', () => {
    // Check if we've already initialized successfully
    if (!window.seedingMoviesMap) {
        //console.log("Window load event - trying to initialize if not already done");
        init();
    }
});
})();