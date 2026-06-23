// ==UserScript==
// @name         PTP Sidebar Cover Image Path
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Rewrite sidebar cover image URLs from /p/ to /i/.
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const SELECTOR = 'img.sidebar-cover-image';
    const processedImages = new WeakSet();

    function getUpgradedUrl(url) {
        if (typeof url !== 'string' || !url.includes('/p/')) {
            return null;
        }

        return url.replace('/p/', '/i/');
    }

    function upgradeImage(image) {
        if (!(image instanceof HTMLImageElement) || processedImages.has(image)) {
            return;
        }

        const upgradedCurrentSrc = getUpgradedUrl(image.currentSrc);
        const upgradedSrc = getUpgradedUrl(image.getAttribute('src'));
        const nextUrl = upgradedCurrentSrc || upgradedSrc;

        if (!nextUrl) {
            processedImages.add(image);
            return;
        }

        image.src = nextUrl;
        processedImages.add(image);
    }

    function processNode(node) {
        if (!(node instanceof Element)) {
            return;
        }

        if (node.matches(SELECTOR)) {
            upgradeImage(node);
        }

        node.querySelectorAll(SELECTOR).forEach(upgradeImage);
    }

    function observeImages() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
                    processedImages.delete(mutation.target);
                    upgradeImage(mutation.target);
                    return;
                }

                mutation.addedNodes.forEach(processNode);
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });
    }

    document.querySelectorAll(SELECTOR).forEach(upgradeImage);
    observeImages();
})();