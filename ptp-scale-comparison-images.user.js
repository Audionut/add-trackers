// ==UserScript==
// @name         PTP Scale Comparison Images
// @version      1.9.4
// @description  Scales screenshot comparison images to fit within the browser window
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/refs/heads/main/ptp-scale-comparison-images.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/refs/heads/main/ptp-scale-comparison-images.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Options
    const SHOW_SCALE_CONTROL = true; // Set to false to hide the toggle box entirely
    const DEFAULT_SCALE_ENABLED = true;
    const DEFAULT_RESOLUTION = 'match-largest'; // 'auto' or one of the values in RESOLUTION_PRESETS
    const DEFAULT_LAZY_LOADING = true; // Set to true to enable lazy loading by default
    const DEBUGGING = false; // Set to true to enable debug logging for lazy loading
    const RESOLUTION_PRESETS = [
        { label: 'Auto (fit window)', value: 'auto' },
        { label: 'Match Largest (original)', value: 'match-largest' },
        { label: '1280 x 720', value: '1280x720' },
        { label: '1920 x 1080', value: '1920x1080' },
        { label: '2560 x 1440', value: '2560x1440' },
        { label: '3840 x 2160', value: '3840x2160' }
    ];

    let scaleEnabled = DEFAULT_SCALE_ENABLED;
    let selectedPreset = DEFAULT_RESOLUTION;
    let lazyLoadingEnabled = DEFAULT_LAZY_LOADING;

    const SETTINGS_PREFIX = 'ptpScaleComparisonImages.';
    const SETTINGS_KEYS = {
        scaleEnabled: SETTINGS_PREFIX + 'scaleEnabled',
        selectedPreset: SETTINGS_PREFIX + 'selectedPreset',
        lazyLoadingEnabled: SETTINGS_PREFIX + 'lazyLoadingEnabled'
    };

    let originalScreenshotComparisonToggleShow = null;
    let lastComparisonArgs = null;

    function gmStorageAvailable() {
        return (typeof GM_getValue === 'function' && typeof GM_setValue === 'function');
    }

    function getStoredValue(key, defaultValue) {
        try {
            if (gmStorageAvailable()) {
                return GM_getValue(key, defaultValue);
            }
            const raw = localStorage.getItem(key);
            if (raw == null) return defaultValue;
            return JSON.parse(raw);
        } catch (_) {
            return defaultValue;
        }
    }

    function setStoredValue(key, value) {
        try {
            if (gmStorageAvailable()) {
                GM_setValue(key, value);
                return;
            }
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            // ignore
        }
    }

    function normalizeSelectedPreset(value) {
        if (!value) return DEFAULT_RESOLUTION;
        const allowed = new Set(RESOLUTION_PRESETS.map(p => p.value));
        return allowed.has(value) ? value : DEFAULT_RESOLUTION;
    }

    function loadSettingsFromStorage() {
        scaleEnabled = !!getStoredValue(SETTINGS_KEYS.scaleEnabled, DEFAULT_SCALE_ENABLED);
        selectedPreset = normalizeSelectedPreset(getStoredValue(SETTINGS_KEYS.selectedPreset, DEFAULT_RESOLUTION));
        lazyLoadingEnabled = !!getStoredValue(SETTINGS_KEYS.lazyLoadingEnabled, DEFAULT_LAZY_LOADING);
    }

    function persistSettingsToStorage() {
        setStoredValue(SETTINGS_KEYS.scaleEnabled, !!scaleEnabled);
        setStoredValue(SETTINGS_KEYS.selectedPreset, selectedPreset);
        setStoredValue(SETTINGS_KEYS.lazyLoadingEnabled, !!lazyLoadingEnabled);
    }

    loadSettingsFromStorage();

    // Inject CSS to override PTP's styles
    function injectCSS() {
        if (!document.head) {
            setTimeout(injectCSS, 10);
            return;
        }

        const style = document.createElement('style');
        style.textContent = `
            .screenshot-comparison__container {
                overflow-y: auto !important;
                overflow-x: auto !important;
            }
            .screenshot-comparison__image-container {
                display: block !important;
                text-align: center !important;
                min-width: min-content !important;
            }
            .screenshot-comparison__image,
            .screenshot-comparison__row img {
                display: inline-block !important;
                margin-left: 3px !important;
            }
            .ptp-scale-control {
                position: fixed !important;
                top: 10px !important;
                right: 10px !important;
                z-index: 9999 !important;
                background: rgba(0, 0, 0, 0.75) !important;
                color: #fff !important;
                padding: 8px 10px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 10px !important;
                align-items: center !important;
                pointer-events: auto !important;
            }
            .ptp-scale-control label {
                display: flex !important;
                gap: 4px !important;
                align-items: center !important;
                cursor: pointer !important;
                white-space: nowrap !important;
            }
            .ptp-scale-control select {
                background: #111 !important;
                color: #fff !important;
                border: 1px solid #333 !important;
                border-radius: 4px !important;
                padding: 2px 4px !important;
            }
            .ptp-scale-control button {
                background: #111 !important;
                color: #fff !important;
                border: 1px solid #333 !important;
                border-radius: 4px !important;
                padding: 2px 6px !important;
                cursor: pointer !important;
            }
        `;
        document.head.appendChild(style);
    }

    injectCSS();

    // Helper function for debug logging
    function debugLog(...args) {
        if (DEBUGGING) {
            console.log('[PTP Scale Images - Lazy Loading]', ...args);
        }
    }

    function parsePreset(value) {
        if (!value || value === 'auto') return { width: Infinity, height: Infinity, mode: 'auto' };
        if (value === 'match-largest') return { width: Infinity, height: Infinity, mode: 'match-largest' };
        const parts = value.split('x').map(Number);
        if (parts.length === 2 && parts.every(n => Number.isFinite(n) && n > 0)) {
            return { width: parts[0], height: parts[1], mode: 'fixed' };
        }
        return { width: Infinity, height: Infinity, mode: 'auto' };
    }

    function ensureControlBox(container) {
        if (!SHOW_SCALE_CONTROL) return null;

        let box = container.querySelector('.ptp-scale-control');
        if (box) {
            const checkbox = box.querySelector('input[type="checkbox"][data-control="scale"]');
            const lazyCheckbox = box.querySelector('input[type="checkbox"][data-control="lazy"]');
            const select = box.querySelector('select');
            const refreshButton = box.querySelector('button[data-control="refresh"]');
            if (checkbox) checkbox.checked = scaleEnabled;
            if (lazyCheckbox) lazyCheckbox.checked = lazyLoadingEnabled;
            if (select && select.value !== selectedPreset) select.value = selectedPreset;
            if (refreshButton) refreshButton.disabled = !lastComparisonArgs;
            return box;
        }

        box = document.createElement('div');
        box.className = 'ptp-scale-control js-ignore-close-click';

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = scaleEnabled;
        checkbox.dataset.control = 'scale';
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode('Scale images'));

        const lazyLabel = document.createElement('label');
        const lazyCheckbox = document.createElement('input');
        lazyCheckbox.type = 'checkbox';
        lazyCheckbox.checked = lazyLoadingEnabled;
        lazyCheckbox.dataset.control = 'lazy';
        lazyLabel.appendChild(lazyCheckbox);
        lazyLabel.appendChild(document.createTextNode('Lazy load'));

        const select = document.createElement('select');
        RESOLUTION_PRESETS.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.value;
            option.textContent = preset.label;
            if (preset.value === selectedPreset) option.selected = true;
            select.appendChild(option);
        });

        const refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.textContent = 'Refresh';
        refreshButton.dataset.control = 'refresh';
        refreshButton.disabled = !lastComparisonArgs;

        box.appendChild(label);
        box.appendChild(lazyLabel);
        box.appendChild(select);
        box.appendChild(refreshButton);

        // Stop overlay-close handlers from firing when interacting with the controls
        ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(evt => {
            box.addEventListener(evt, (e) => {
                e.stopPropagation();
            });
        });

        checkbox.addEventListener('change', () => {
            scaleEnabled = checkbox.checked;
            setStoredValue(SETTINGS_KEYS.scaleEnabled, !!scaleEnabled);
            if (scaleEnabled) {
                // Reset lazy load flags so images can be re-processed
                delete container.dataset.lazyLoadComplete;
                delete container.dataset.lazyLoadingInProgress;
                scaleComparisonImages();
            } else {
                unscaleComparisonImages(container);
            }
        });

        lazyCheckbox.addEventListener('change', () => {
            lazyLoadingEnabled = lazyCheckbox.checked;
            setStoredValue(SETTINGS_KEYS.lazyLoadingEnabled, !!lazyLoadingEnabled);
            // Reset lazy load flags so new setting can take effect
            delete container.dataset.lazyLoadComplete;
            delete container.dataset.lazyLoadingInProgress;
            // Note: User needs to close and reopen comparison for lazy loading to take effect
        });

        select.addEventListener('change', () => {
            selectedPreset = normalizeSelectedPreset(select.value);
            setStoredValue(SETTINGS_KEYS.selectedPreset, selectedPreset);
            if (scaleEnabled) {
                // Reset lazy load flags so images can be re-processed with new preset
                delete container.dataset.lazyLoadComplete;
                delete container.dataset.lazyLoadingInProgress;
                scaleComparisonImages();
            }
        });

        refreshButton.addEventListener('click', () => {
            refreshComparison(container, box);
        });

        container.appendChild(box);
        return box;
    }

    function refreshComparison(container, controlBox) {
        loadSettingsFromStorage();
        persistSettingsToStorage();

        if (controlBox) {
            const checkbox = controlBox.querySelector('input[type="checkbox"][data-control="scale"]');
            const lazyCheckbox = controlBox.querySelector('input[type="checkbox"][data-control="lazy"]');
            const select = controlBox.querySelector('select');
            if (checkbox) checkbox.checked = scaleEnabled;
            if (lazyCheckbox) lazyCheckbox.checked = lazyLoadingEnabled;
            if (select) select.value = selectedPreset;
        }

        delete container.dataset.lazyLoadComplete;
        delete container.dataset.lazyLoadingInProgress;

        const args = lastComparisonArgs;
        if (!args || typeof originalScreenshotComparisonToggleShow !== 'function') {
            scaleComparisonImages();
            return;
        }

        const isOpen = !!document.querySelector('.screenshot-comparison__container');
        if (isOpen) {
            // Close, then re-open to force the comparison to rebuild (important for lazy load setting).
            originalScreenshotComparisonToggleShow.call(BBCode, args.element, args.labels, args.urls);
            setTimeout(() => {
                originalScreenshotComparisonToggleShow.call(BBCode, args.element, args.labels, args.urls);
            }, 50);
            return;
        }

        originalScreenshotComparisonToggleShow.call(BBCode, args.element, args.labels, args.urls);
    }

    function unscaleComparisonImages(container) {
        const images = container.querySelectorAll('.screenshot-comparison__image, .screenshot-comparison__row img');
        images.forEach(img => {
            img.style.removeProperty('width');
            img.style.removeProperty('height');
            img.style.removeProperty('object-fit');
            delete img.dataset.scaled;
        });

        const rows = container.querySelectorAll('.screenshot-comparison__row');
        rows.forEach(row => {
            row.style.removeProperty('max-width');
            row.style.removeProperty('max-height');
        });

        const imageContainers = container.querySelectorAll('.screenshot-comparison__image-container');
        imageContainers.forEach(imgContainer => {
            imgContainer.style.removeProperty('max-width');
            imgContainer.style.removeProperty('max-height');
        });
    }

    function loadImagesLazy(container) {
        // Check if already lazy loaded (completed)
        if (container.dataset.lazyLoadComplete === 'true') {
            debugLog('Container already lazy loaded, skipping');
            return;
        }
        
        // Check if already lazy loading this container
        if (container.dataset.lazyLoadingInProgress === 'true') {
            debugLog('Lazy loading already in progress for this container, skipping');
            return;
        }
        
        const rows = container.querySelectorAll('.screenshot-comparison__row');
        debugLog('loadImagesLazy called, found', rows.length, 'rows');
        if (rows.length === 0) {
            debugLog('No rows found, exiting');
            return;
        }
        
        // Mark container as being lazy loaded
        container.dataset.lazyLoadingInProgress = 'true';
        debugLog('Marked container as lazy loading in progress');

        // First, prepare all images for lazy loading by moving src to data-lazy-src
        let totalImages = 0;
        rows.forEach((row, rowIndex) => {
            const images = row.querySelectorAll('.screenshot-comparison__image, img');
            totalImages += images.length;
            images.forEach(img => {
                if (!img.dataset.lazySrc && img.src) {
                    debugLog(`Row ${rowIndex}: Preparing image for lazy loading:`, img.src);
                    img.dataset.lazySrc = img.src;
                    img.removeAttribute('src');
                    img.style.setProperty('visibility', 'hidden', 'important');
                }
            });
            // Hide rows initially
            if (rowIndex > 0) {
                row.style.setProperty('display', 'none', 'important');
                debugLog(`Row ${rowIndex}: Hidden initially`);
            }
        });
        debugLog('Prepared', totalImages, 'images for lazy loading');

        // Calculate dimensions from first row to establish target size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const presetDims = parsePreset(selectedPreset);
        debugLog('Viewport:', viewportWidth, 'x', viewportHeight);
        debugLog('Selected preset:', selectedPreset, '- Parsed dims:', presetDims);

        // In match-largest mode, avoid applying explicit width+height.
        // Firefox can show subtle resampling/rounding when both dimensions are forced.
        const isOriginalMode = presetDims.mode === 'match-largest';
        
        let maxWidth, maxHeight;
        if (presetDims.mode === 'auto') {
            // Auto mode: fit to browser window with margins
            const availableWidth = viewportWidth * 0.90;
            const availableHeight = viewportHeight - 250;
            maxWidth = availableWidth;
            maxHeight = availableHeight;
            debugLog('Auto mode - Available dimensions:', availableWidth, 'x', availableHeight);
        } else if (presetDims.mode === 'match-largest') {
            // Match largest: no constraints
            maxWidth = Infinity;
            maxHeight = Infinity;
            debugLog('Match-largest mode - No constraints');
        } else {
            // Fixed preset: use exact dimensions from preset, ignore viewport
            maxWidth = presetDims.width;
            maxHeight = presetDims.height;
            debugLog('Fixed preset mode - Dimensions:', maxWidth, 'x', maxHeight);
        }
        debugLog('Max dimensions:', maxWidth, 'x', maxHeight);

        let baselineReady = false;
        let baselineMaxNaturalHeight = 0;
        let baselineMaxNaturalWidth = 0;
        let baselineTargetWidth = null;
        let baselineTargetHeight = null;

        // Load and process rows sequentially
        function loadRow(rowIndex) {
            if (rowIndex >= rows.length) {
                debugLog('All rows loaded');
                // Clear the lazy loading flag and mark as complete
                delete container.dataset.lazyLoadingInProgress;
                container.dataset.lazyLoadComplete = 'true';
                debugLog('Cleared lazy loading flag and marked as complete');
                return;
            }
            
            debugLog(`Loading row ${rowIndex} of ${rows.length}`);
            const row = rows[rowIndex];
            const images = row.querySelectorAll('img[data-lazy-src]');
            debugLog(`Row ${rowIndex}: Found`, images.length, 'images');
            
            // Show the row
            row.style.removeProperty('display');
            debugLog(`Row ${rowIndex}: Displayed`);
            
            // Wait for all images in this row to load
            const imageLoadPromises = Array.from(images).map((img, imgIndex) => {
                return new Promise(resolve => {
                    if (img.complete && img.naturalWidth > 0) {
                        resolve();
                    } else {
                        img.addEventListener('load', resolve, { once: true });
                        img.addEventListener('error', resolve, { once: true });
                        setTimeout(resolve, 5000); // Timeout fallback
                        
                        // Set src AFTER attaching listeners to avoid race condition
                        debugLog(`Row ${rowIndex}, Image ${imgIndex}: Loading`, img.dataset.lazySrc);
                        img.src = img.dataset.lazySrc;
                    }
                });
            });
            
            Promise.all(imageLoadPromises).then(() => {
                debugLog(`Row ${rowIndex}: All images loaded`);

                // Establish baseline sizing from the first row only.
                // Once a row has been loaded and sized, do not re-style it again while later rows load.
                if (!baselineReady) {
                    images.forEach((img, imgIndex) => {
                        debugLog(`Row ${rowIndex}, Image ${imgIndex}: Natural size`, img.naturalWidth, 'x', img.naturalHeight);
                        if (img.naturalHeight > baselineMaxNaturalHeight) baselineMaxNaturalHeight = img.naturalHeight;
                        if (img.naturalWidth > baselineMaxNaturalWidth) baselineMaxNaturalWidth = img.naturalWidth;
                    });

                    if (!isOriginalMode) {
                        const widthScale = maxWidth / baselineMaxNaturalWidth;
                        const heightScale = maxHeight / baselineMaxNaturalHeight;
                        const scaleFactor = Math.min(widthScale, heightScale);
                        debugLog('Baseline scale factors - Width:', widthScale.toFixed(3), 'Height:', heightScale.toFixed(3), 'Using:', scaleFactor.toFixed(3));
                        baselineTargetWidth = Math.floor(baselineMaxNaturalWidth * scaleFactor);
                        baselineTargetHeight = Math.floor(baselineMaxNaturalHeight * scaleFactor);
                        debugLog('Baseline target dimensions:', baselineTargetWidth, 'x', baselineTargetHeight);
                    } else {
                        debugLog('Baseline established for match-largest; first-row max height:', baselineMaxNaturalHeight);
                    }

                    baselineReady = true;
                }

                // Apply scaling ONLY to the row that just finished loading.
                const rowImages = rows[rowIndex].querySelectorAll('img');

                // For match-largest: scale smaller images up to the first row's max height.
                // Use height + width:auto to avoid the subtle FF “forced width/height” adjustment.
                rowImages.forEach((img, imgIndex) => {
                    img.style.removeProperty('max-width');
                    img.style.removeProperty('max-height');

                    if (isOriginalMode) {
                        if (baselineMaxNaturalHeight > 0 && img.naturalHeight > 0 && img.naturalHeight < baselineMaxNaturalHeight) {
                            img.dataset.scaled = 'true';
                            img.style.setProperty('height', baselineMaxNaturalHeight + 'px', 'important');
                            img.style.setProperty('width', 'auto', 'important');
                            img.style.removeProperty('object-fit');
                        } else {
                            img.style.removeProperty('width');
                            img.style.removeProperty('height');
                            img.style.removeProperty('object-fit');
                            delete img.dataset.scaled;
                        }
                    } else {
                        img.dataset.scaled = 'true';
                        img.style.setProperty('width', baselineTargetWidth + 'px', 'important');
                        img.style.setProperty('height', baselineTargetHeight + 'px', 'important');
                        img.style.setProperty('object-fit', 'contain', 'important');
                    }

                    img.style.setProperty('visibility', 'visible', 'important');
                    debugLog(`Row ${rowIndex}, Image ${imgIndex}: Scaled and made visible`);
                });
                
                // Load next row after delay
                debugLog(`Scheduling row ${rowIndex + 1} load in 200ms`);
                setTimeout(() => loadRow(rowIndex + 1), 200);
            });
        }
        
        // Start loading from first row
        debugLog('Starting lazy load sequence');
        loadRow(0);
    }

    // Wait for the page to load and BBCode object to be available
    function init() {
        if (typeof BBCode === 'undefined' || !BBCode.ScreenshotComparisonToggleShow) {
            setTimeout(init, 100);
            return;
        }

        // Store the original function
        const originalToggleShow = BBCode.ScreenshotComparisonToggleShow;
        originalScreenshotComparisonToggleShow = originalToggleShow;

        // Override the function
        BBCode.ScreenshotComparisonToggleShow = function(element, labels, urls) {

            lastComparisonArgs = { element, labels, urls };

            // If lazy loading is enabled, we need to intercept before original function runs
            if (lazyLoadingEnabled && scaleEnabled) {
                // Call original function
                originalToggleShow.call(this, element, labels, urls);
                
                // Immediately find the container and prepare for lazy loading
                setTimeout(() => {
                    const container = document.querySelector('.screenshot-comparison__container');
                    if (container) {
                        ensureControlBox(container);
                        loadImagesLazy(container);
                    }
                }, 10);
            } else {
                // Call the original function
                originalToggleShow.call(this, element, labels, urls);

                // Wait for the DOM to update, then scale images
                setTimeout(() => {
                    scaleComparisonImages();
                }, 500);

                setTimeout(() => {
                    scaleComparisonImages();
                }, 1000);
            }
        };
    }

    function scaleComparisonImages() {
        // Find all comparison containers
        const comparisonContainers = document.querySelectorAll('.screenshot-comparison__container');

        comparisonContainers.forEach((container, index) => {
            ensureControlBox(container);

            if (!scaleEnabled) {
                unscaleComparisonImages(container);
                return;
            }

            // If lazy loading is enabled, load images row by row
            if (lazyLoadingEnabled) {
                // Skip if lazy loading is in progress or already complete for this container
                if (container.dataset.lazyLoadingInProgress === 'true' || container.dataset.lazyLoadComplete === 'true') {
                    return;
                }
                loadImagesLazy(container);
                return;
            }

            // Target all images within the comparison
            const images = container.querySelectorAll('.screenshot-comparison__image, .screenshot-comparison__row img');

            // Calculate the optimal scale for all images
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const presetDims = parsePreset(selectedPreset);

            let maxWidth, maxHeight;
            if (presetDims.mode === 'auto') {
                // Auto mode: fit to browser window with margins
                const availableWidth = viewportWidth * 0.90;
                const availableHeight = viewportHeight - 250;
                maxWidth = availableWidth;
                maxHeight = availableHeight;
            } else if (presetDims.mode === 'match-largest') {
                // Match largest: no constraints
                maxWidth = Infinity;
                maxHeight = Infinity;
            } else {
                // Fixed preset: use exact dimensions from preset, ignore viewport
                maxWidth = presetDims.width;
                maxHeight = presetDims.height;
            }

            let maxNaturalHeight = 0;
            let maxNaturalWidth = 0;

            // Wait for all images to load first
            const imageLoadPromises = Array.from(images).map(img => {
                if (img.complete) {
                    return Promise.resolve();
                } else {
                    return new Promise(resolve => {
                        img.addEventListener('load', resolve, { once: true });
                        setTimeout(resolve, 5000); // Timeout after 5s
                    });
                }
            });

            Promise.all(imageLoadPromises).then(() => {
                // Match-largest mode: scale up only the smaller images within each row.
                // Do not force both width and height on all images, to avoid subtle FF adjustments.
                if (presetDims.mode === 'match-largest') {
                    const rows = container.querySelectorAll('.screenshot-comparison__row');
                    if (rows.length === 0) {
                        // Fallback: no rows detected; just ensure we aren't forcing dimensions.
                        unscaleComparisonImages(container);
                        return;
                    }

                    rows.forEach(row => {
                        const rowImages = row.querySelectorAll('.screenshot-comparison__image, img');
                        let rowMaxNaturalHeight = 0;
                        rowImages.forEach(img => {
                            if (img.naturalHeight > rowMaxNaturalHeight) {
                                rowMaxNaturalHeight = img.naturalHeight;
                            }
                        });

                        rowImages.forEach(img => {
                            img.style.removeProperty('max-width');
                            img.style.removeProperty('max-height');

                            if (rowMaxNaturalHeight > 0 && img.naturalHeight > 0 && img.naturalHeight < rowMaxNaturalHeight) {
                                img.dataset.scaled = 'true';
                                img.style.setProperty('height', rowMaxNaturalHeight + 'px', 'important');
                                img.style.setProperty('width', 'auto', 'important');
                                img.style.removeProperty('object-fit');
                            } else {
                                img.style.removeProperty('width');
                                img.style.removeProperty('height');
                                img.style.removeProperty('object-fit');
                                delete img.dataset.scaled;
                            }
                        });
                    });
                    return;
                }

                // Find the largest dimensions
                images.forEach(img => {
                    if (img.naturalHeight > maxNaturalHeight) {
                        maxNaturalHeight = img.naturalHeight;
                    }
                    if (img.naturalWidth > maxNaturalWidth) {
                        maxNaturalWidth = img.naturalWidth;
                    }
                });

                // Calculate scale factor and target dimensions
                const widthScale = maxWidth / maxNaturalWidth;
                const heightScale = maxHeight / maxNaturalHeight;
                const scaleFactor = Math.min(widthScale, heightScale);
                const targetWidth = Math.floor(maxNaturalWidth * scaleFactor);
                const targetHeight = Math.floor(maxNaturalHeight * scaleFactor);

                // Apply the same dimensions to ALL images
                images.forEach((img, imgIndex) => {
                    img.dataset.scaled = 'true';

                    // Remove any existing constraints
                    img.style.removeProperty('max-width');
                    img.style.removeProperty('max-height');

                    // Set exact dimensions - same for all images
                    img.style.setProperty('width', targetWidth + 'px', 'important');
                    img.style.setProperty('height', targetHeight + 'px', 'important');
                    img.style.setProperty('object-fit', 'contain', 'important');
                });
            });
        });
    }

    // Also monitor for dynamically added images
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    if (node.classList && node.classList.contains('screenshot-comparison__container')) {
                        setTimeout(() => scaleComparisonImages(), 50);
                        setTimeout(() => scaleComparisonImages(), 200);
                    } else if (node.querySelector && node.querySelector('.screenshot-comparison__container')) {
                        setTimeout(() => scaleComparisonImages(), 50);
                        setTimeout(() => scaleComparisonImages(), 200);
                    }
                }
            });
        });
    });

    // Start observing when DOM is ready
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Continuous monitor to fight PTP's style changes
    function continuousMonitor() {
        const containers = document.querySelectorAll('.screenshot-comparison__container');
        if (containers.length > 0) {
            // Check if there's horizontal scrolling
            if (document.documentElement.scrollWidth > window.innerWidth) {
                // Re-run the scaling to maintain our dimensions
                scaleComparisonImages();
            }
        }
    }

    // Run monitor every 100ms when comparison is open
    let monitorInterval = null;

    // Start monitor when comparison opens
    document.addEventListener('click', (e) => {
        if (e.target.closest('a[onclick*="ScreenshotComparisonToggleShow"]')) {
            if (monitorInterval) clearInterval(monitorInterval);
            monitorInterval = setInterval(continuousMonitor, 100);

            // Stop after 10 seconds
            setTimeout(() => {
                if (monitorInterval) {
                    clearInterval(monitorInterval);
                    monitorInterval = null;
                }
            }, 10000);
        }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Remove scaled markers and re-scale all images
            const images = document.querySelectorAll('.screenshot-comparison__container img[data-scaled]');
            images.forEach(img => {
                delete img.dataset.scaled;
            });
            scaleComparisonImages();
        }, 250);
    });

})();