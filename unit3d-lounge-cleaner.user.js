// ==UserScript==
// @name         Cleanup unit3d chat in theLounge
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Hides certain useless chat messages in theLounge when using unit3d, such as emoji-only messages and repeated quoted messages.
// @author       Audionut
// @match        http://localhost:9005/*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/unit3d-lounge-cleaner.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/unit3d-lounge-cleaner.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const MSG_SELECTOR = '.msg[data-type="message"]';
    const CONTENT_SELECTOR = '.content';
    const FILTERED_MARKER = 'emojiGifFiltered';
    const FILTERED_ATTRIBUTE = 'data-emoji-gif-filtered';
    const STYLE_ID = 'emoji-gif-chat-cleaner-style';
    const QUOTE_PREFIX_RE = /^\s*(?:\[[^\]]+\]\s*)?/;
    const RECENT_MESSAGES_WINDOW = 3;
    const INITIAL_READY_TIMEOUT_MS = 1500;

    function ensureFilterStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            [${FILTERED_ATTRIBUTE}="1"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function isGifUrl(url) {
        try {
            const u = new URL(url, location.href);
            return /\.gif($|\?)/i.test(u.pathname + u.search);
        } catch {
            return false;
        }
    }

    function normalizeText(text) {
        return (text || '').replace(/\u00A0/g, ' ').trim();
    }

    function stripBoilerplateText(text) {
        return normalizeText(text)
            .replace(/^\[[^\]]+\]\s*/, '')
            .replace(/\s*bbs\s*$/i, '')
            .trim();
    }

    function isIgnorableGifText(text) {
        return stripBoilerplateText(text) === '';
    }

    function getHideTargets(msgEl) {
        const targets = [];
        let current = msgEl;

        while (current instanceof HTMLElement) {
            if (!targets.includes(current)) {
                targets.push(current);
            }

            const parent = current.parentElement;
            if (!(parent instanceof HTMLElement)) break;

            const parentLooksLikeRow =
                parent.dataset.messageId !== undefined ||
                parent.id.startsWith('msg-') ||
                parent.querySelector(':scope > .msg') === current;

            if (!parentLooksLikeRow) break;

            current = parent;
        }

        return targets;
    }

    function setMessageHidden(msgEl, hidden) {
        for (const target of getHideTargets(msgEl)) {
            if (!(target instanceof HTMLElement)) continue;

            if (hidden) {
                target.dataset[FILTERED_MARKER] = '1';
                target.setAttribute('aria-hidden', 'true');
                continue;
            }

            delete target.dataset[FILTERED_MARKER];
            target.removeAttribute('aria-hidden');
        }
    }

    function getRelevantChildren(contentEl) {
        return Array.from(contentEl.childNodes).filter((n) => {
            if (n.nodeType === Node.COMMENT_NODE) return false;
            if (n.nodeType === Node.TEXT_NODE) return normalizeText(n.textContent) !== '';
            if (n.nodeType === Node.ELEMENT_NODE) {
                const el = /** @type {Element} */ (n);
                if (el.classList.contains('preview-size')) return false;
                if (el.classList.contains('preview')) return false;
                return true;
            }
            return false;
        });
    }

    function isEmojiOnlyMessage(contentEl) {
        const children = getRelevantChildren(contentEl);

        if (children.length === 0) return false;

        // Allow only emoji nodes and optional whitespace text nodes.
        const allEmoji = children.every((n) => {
            if (n.nodeType === Node.TEXT_NODE) {
                return stripBoilerplateText(n.textContent || '') === '';
            }
            if (n.nodeType === Node.ELEMENT_NODE) {
                const el = /** @type {Element} */ (n);
                if (el.classList.contains('emoji')) return true;
                if (el.querySelector('.emoji')) {
                    const text = stripBoilerplateText(el.textContent || '');
                    return text === '';
                }
                return false;
            }
            return false;
        });

        return allEmoji;
    }

    function isGifLinkOnlyMessage(contentEl) {
        const directNodes = Array.from(contentEl.childNodes).filter((node) => {
            if (node.nodeType === Node.COMMENT_NODE) return false;
            if (node.nodeType === Node.TEXT_NODE) {
                return normalizeText(node.textContent) !== '';
            }
            return node.nodeType === Node.ELEMENT_NODE;
        });

        let gifLinkCount = 0;

        for (const node of directNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (!isIgnorableGifText(node.textContent || '')) return false;
                continue;
            }

            const el = /** @type {Element} */ (node);

            if (el.classList.contains('preview')) continue;
            if (el.classList.contains('preview-size')) continue;
            if (el.classList.contains('toggle-button')) continue;

            if (el.matches('a[href]')) {
                if (!isGifUrl(el.getAttribute('href') || '')) return false;
                gifLinkCount += 1;
                continue;
            }

            const gifLinks = Array.from(el.querySelectorAll('a[href]')).filter((link) => {
                return isGifUrl(link.getAttribute('href') || '');
            });

            if (gifLinks.length === 0) {
                if (!isIgnorableGifText(el.textContent || '')) return false;
                continue;
            }

            gifLinkCount += gifLinks.length;

            const clone = el.cloneNode(true);
            if (!(clone instanceof Element)) return false;

            clone.querySelectorAll('.preview-size, .preview, .toggle-button, .toggle-thumbnail, img, a[href]').forEach((child) => child.remove());

            if (!isIgnorableGifText(clone.textContent || '')) return false;
        }

        return gifLinkCount >= 1;
    }

    function shouldHideMessage(msgEl) {
        const contentEl = msgEl.querySelector(CONTENT_SELECTOR);
        if (!contentEl) return false;

        return (
            isEmojiOnlyMessage(contentEl) ||
            isGifLinkOnlyMessage(contentEl) ||
            isQuotedRepeatMessage(msgEl, contentEl)
        );
    }

    function getMessageText(msgEl) {
        const contentEl = msgEl.querySelector(CONTENT_SELECTOR);
        if (!contentEl) return '';
        return normalizeText(contentEl.textContent || '');
    }

    function stripLeadingQuotedSpeaker(text) {
        return normalizeText(text).replace(QUOTE_PREFIX_RE, '');
    }

    function stripEmojiLikeChars(text) {
        // Remove most pictographic/symbol emoji code points and collapse spacing.
        return normalizeText(text)
            .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractQuotedPayload(contentEl) {
        const clone = contentEl.cloneNode(true);
        if (!(clone instanceof Element)) return null;

        // Quote usernames can be wrapped in markup; flatten those wrappers first.
        clone.querySelectorAll('.user').forEach((el) => {
            el.replaceWith(document.createTextNode(el.textContent || ''));
        });

        const normalized = normalizeText(clone.textContent || '');
        const cleaned = normalized.replace(QUOTE_PREFIX_RE, '');
        const match = cleaned.match(/^.{1,64}?\s*:\s*"([^"]+)"\s*$/);
        if (!match) return null;

        const quotedText = normalizeText(match[1] || '');
        return quotedText || null;
    }

    function isQuotedRepeatMessage(msgEl, contentEl) {
        const quotedPayload = extractQuotedPayload(contentEl);
        if (!quotedPayload) return false;

        const normalizedQuotedPayload = normalizeText(quotedPayload);
        const emojiStrippedQuotedPayload = stripEmojiLikeChars(quotedPayload);

        const allMessages = Array.from(document.querySelectorAll(MSG_SELECTOR));
        const idx = allMessages.indexOf(msgEl);
        if (idx <= 0) return false;

        const start = Math.max(0, idx - RECENT_MESSAGES_WINDOW);
        for (let i = idx - 1; i >= start; i--) {
            const previous = allMessages[i];
            const previousText = getMessageText(previous);

            if (!previousText) continue;

            const normalizedPrevious = normalizeText(previousText);
            const strippedPrevious = stripLeadingQuotedSpeaker(previousText);
            const emojiStrippedPrevious = stripEmojiLikeChars(previousText);
            const emojiStrippedStrippedPrevious = stripEmojiLikeChars(strippedPrevious);

            if (
                normalizedPrevious === normalizedQuotedPayload ||
                strippedPrevious === normalizedQuotedPayload ||
                (emojiStrippedQuotedPayload !== '' && (
                    emojiStrippedPrevious === emojiStrippedQuotedPayload ||
                    emojiStrippedStrippedPrevious === emojiStrippedQuotedPayload
                ))
            ) {
                return true;
            }
        }

        return false;
    }

    function processMessage(msgEl) {
        if (!(msgEl instanceof HTMLElement)) return;

        setMessageHidden(msgEl, shouldHideMessage(msgEl));
    }

    function processAllMessages(root = document) {
        root.querySelectorAll(MSG_SELECTOR).forEach(processMessage);
    }

    function hasAnyVisibleUnfilteredMessage() {
        return Array.from(document.querySelectorAll(MSG_SELECTOR)).some((msgEl) => {
            if (!(msgEl instanceof HTMLElement)) return false;
            return msgEl.dataset[FILTERED_MARKER] !== '1';
        });
    }

    function runInitialPassWhenReady() {
        const runPass = () => {
            processAllMessages();
            // Re-check once after framework hydration/async chat updates settle.
            setTimeout(processAllMessages, 120);
        };

        if (hasAnyVisibleUnfilteredMessage()) {
            runPass();
            return;
        }

        const startedAt = Date.now();
        const timer = setInterval(() => {
            const timedOut = Date.now() - startedAt >= INITIAL_READY_TIMEOUT_MS;
            if (!timedOut && !hasAnyVisibleUnfilteredMessage()) return;

            clearInterval(timer);
            runPass();
        }, 100);
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'characterData') {
                const parent = mutation.target.parentElement;
                const msgEl = parent?.closest(MSG_SELECTOR);
                if (msgEl) processMessage(msgEl);
                continue;
            }

            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                if (node.matches?.(MSG_SELECTOR)) {
                    processMessage(node);
                } else {
                    processAllMessages(node);
                }
            }
        }
    });

    ensureFilterStyles();
    runInitialPassWhenReady();
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
})();