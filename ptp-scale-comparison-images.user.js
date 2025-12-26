// ==UserScript==
// @name         PTP Scale Comparison Images
// @version      1.1
// @description  Scales screenshot comparison images to fit within the browser window
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Options
    const SHOW_SCALE_CONTROL = true; // Set to false to hide the toggle box entirely
    const DEFAULT_SCALE_ENABLED = true;
    const DEFAULT_RESOLUTION = 'auto'; // 'auto' or one of the values in RESOLUTION_PRESETS
    const RESOLUTION_PRESETS = [
        { label: 'Auto (fit window)', value: 'auto' },
        { label: '1280 x 720', value: '1280x720' },
        { label: '1920 x 1080', value: '1920x1080' },
        { label: '2560 x 1440', value: '2560x1440' },
        { label: '3840 x 2160', value: '3840x2160' }
    ];

    let scaleEnabled = DEFAULT_SCALE_ENABLED;
    let selectedPreset = DEFAULT_RESOLUTION;

    // Inject CSS to override PTP's styles
    function injectCSS() {
        if (!document.head) {
            setTimeout(injectCSS, 10);
            return;
        }

        const style = document.createElement('style');
        style.textContent = `
            .screenshot-comparison__container {
                max-width: 100vw !important;
                max-height: 100vh !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }
            .screenshot-comparison__row {
                max-width: 95vw !important;
                max-height: calc(100vh - 200px) !important;
                width: auto !important;
                height: auto !important;
            }
            .screenshot-comparison__row > div {
                max-width: 95vw !important;
                max-height: calc(100vh - 200px) !important;
            }
            .screenshot-comparison__row img {
                max-width: 95vw !important;
                max-height: calc(100vh - 200px) !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
            }
            .screenshot-comparison__image-container {
                max-width: 95vw !important;
                max-height: calc(100vh - 200px) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .screenshot-comparison__image {
                max-width: 95vw !important;
                max-height: calc(100vh - 200px) !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
                flex-shrink: 1 !important;
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
        `;
        document.head.appendChild(style);
    }

    injectCSS();

    function parsePreset(value) {
        if (!value || value === 'auto') return { width: Infinity, height: Infinity };
        const parts = value.split('x').map(Number);
        if (parts.length === 2 && parts.every(n => Number.isFinite(n) && n > 0)) {
            return { width: parts[0], height: parts[1] };
        }
        return { width: Infinity, height: Infinity };
    }

    function ensureControlBox(container) {
        if (!SHOW_SCALE_CONTROL) return null;

        let box = container.querySelector('.ptp-scale-control');
        if (box) {
            const checkbox = box.querySelector('input[type="checkbox"]');
            const select = box.querySelector('select');
            if (checkbox) checkbox.checked = scaleEnabled;
            if (select && select.value !== selectedPreset) select.value = selectedPreset;
            return box;
        }

        box = document.createElement('div');
        box.className = 'ptp-scale-control js-ignore-close-click';

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = scaleEnabled;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode('Scale images'));

        const select = document.createElement('select');
        RESOLUTION_PRESETS.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.value;
            option.textContent = preset.label;
            if (preset.value === selectedPreset) option.selected = true;
            select.appendChild(option);
        });

        box.appendChild(label);
        box.appendChild(select);

        // Stop overlay-close handlers from firing when interacting with the controls
        ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(evt => {
            box.addEventListener(evt, (e) => {
                e.stopPropagation();
            });
        });

        checkbox.addEventListener('change', () => {
            scaleEnabled = checkbox.checked;
            if (scaleEnabled) {
                scaleComparisonImages();
            } else {
                unscaleComparisonImages(container);
            }
        });

        select.addEventListener('change', () => {
            selectedPreset = select.value;
            if (scaleEnabled) {
                scaleComparisonImages();
            }
        });

        container.appendChild(box);
        return box;
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

    // Wait for the page to load and BBCode object to be available
    function init() {
        if (typeof BBCode === 'undefined' || !BBCode.ScreenshotComparisonToggleShow) {
            setTimeout(init, 100);
            return;
        }

        // Store the original function
        const originalToggleShow = BBCode.ScreenshotComparisonToggleShow;

        // Override the function
        BBCode.ScreenshotComparisonToggleShow = function(element, labels, urls) {

            // Call the original function
            originalToggleShow.call(this, element, labels, urls);

            // Wait for the DOM to update, then scale images
            // Use longer timeouts to ensure images are loaded
            setTimeout(() => {
                scaleComparisonImages();
            }, 500);

            setTimeout(() => {
                scaleComparisonImages();
            }, 1000);
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

            // Target all images within the comparison
            const images = container.querySelectorAll('.screenshot-comparison__image, .screenshot-comparison__row img');

            // Calculate the optimal scale for all images
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const presetDims = parsePreset(selectedPreset);

            // Allow tighter fit when a preset is chosen; keep roomy margins for auto
            const availableWidth = selectedPreset === 'auto' ? viewportWidth * 0.90 : viewportWidth * 0.98;
            const availableHeight = selectedPreset === 'auto' ? viewportHeight - 250 : viewportHeight * 0.98;

            const maxWidth = Number.isFinite(presetDims.width) ? Math.min(presetDims.width, availableWidth) : availableWidth;
            const maxHeight = Number.isFinite(presetDims.height) ? Math.min(presetDims.height, availableHeight) : availableHeight;

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
                // Find the largest dimensions
                images.forEach(img => {
                    if (img.naturalHeight > maxNaturalHeight) {
                        maxNaturalHeight = img.naturalHeight;
                    }
                    if (img.naturalWidth > maxNaturalWidth) {
                        maxNaturalWidth = img.naturalWidth;
                    }
                });

                // Calculate scale factor to fit the largest image and optional preset
                const widthScale = maxWidth / maxNaturalWidth;
                const heightScale = maxHeight / maxNaturalHeight;
                const scaleFactor = Math.min(widthScale, heightScale);

                // Calculate target dimensions (all images will be this size)
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

            // Also scale the row and image containers
            const rows = container.querySelectorAll('.screenshot-comparison__row');
            rows.forEach(row => {
                row.style.setProperty('max-width', '100vw', 'important');
                row.style.setProperty('max-height', 'calc(100vh - 200px)', 'important');
            });

            const imageContainers = container.querySelectorAll('.screenshot-comparison__image-container');
            imageContainers.forEach(imgContainer => {
                imgContainer.style.setProperty('max-width', 'none', 'important');
                imgContainer.style.setProperty('max-height', 'calc(100vh - 200px)', 'important');
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