// ==UserScript==
// @name         Cleanup unit3d chat in theLounge
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.2.0
// @description  Hides certain useless chat messages in theLounge when using unit3d, such as emoji-only messages and repeated quoted messages.
// @author       Audionut
// @match        http://localhost:9005/*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/unit3d-lounge-cleaner.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/unit3d-lounge-cleaner.user.js
// @grant        GM_getValue
// @grant        GM_setValue
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
    const INITIAL_READY_TIMEOUT_MS = 1500;

    const QUERY_ITEM_SELECTOR = '.channel-list-item[data-type="query"]';
    const CHANNEL_ITEM_SELECTOR = '.channel-list-item[data-type="channel"], .channel-list-item[data-type="query"]';
    const PM_TOGGLE_ID = 'pms-collapse-toggle';
    const PM_HIDDEN_CLASS = 'pms-hidden';
    const PM_EXPANDED_CLASS = 'pms-expanded';
    const PM_STYLE_ID = 'pms-collapse-style';
    const PM_NOTIFICATION_CLASSES = ['has-highlight'];
    const NOTIFIED_PROXY_NETWORK_ID = 'lounge-cleaner-notified-network';
    const NOTIFIED_HIDDEN_ORIGINAL_CLASS = 'lounge-cleaner-hidden-original-channel';
    const SETTINGS_STORAGE_KEY = 'unit3d_lounge_cleaner_settings_v1';
    const SETTINGS_STYLE_ID = 'unit3d-lounge-cleaner-settings-style';
    const SETTINGS_BUTTON_ID = 'unit3d-lounge-cleaner-settings-btn';
    const SETTINGS_PANEL_OVERLAY_ID = 'unit3d-lounge-cleaner-settings-overlay';
    const SETTINGS_PANEL_ID = 'unit3d-lounge-cleaner-settings-panel';
    const DEFAULT_SETTINGS = {
        hideEmojiOnly: true,
        hideGifLinksOnly: true,
        hideQuotedRepeats: true,
        recentMessagesWindow: 3,
        collapsePrivateMessages: true,
        pushNotifiedChannelsTop: false,
    };

    let settings = loadSettings();
    let pmSidebarObserver = null;
    let notifiedChannelsObserver = null;
    let logoContainerObserver = null;
    const networkSyncTimers = new Map();
    let notifiedChannelsSyncTimer = null;
    let notifiedChannelsSuppressUntil = 0;
    let notifiedChannelsSyncing = false;

    function normalizeSettings(candidate) {
        const safe = (candidate && typeof candidate === 'object') ? candidate : {};
        return {
            hideEmojiOnly: safe.hideEmojiOnly !== false,
            hideGifLinksOnly: safe.hideGifLinksOnly !== false,
            hideQuotedRepeats: safe.hideQuotedRepeats !== false,
            recentMessagesWindow: (Number.isInteger(safe.recentMessagesWindow) && safe.recentMessagesWindow >= 1)
                ? safe.recentMessagesWindow : 3,
            collapsePrivateMessages: safe.collapsePrivateMessages !== false,
            pushNotifiedChannelsTop: safe.pushNotifiedChannelsTop === true,
        };
    }

    function loadSettings() {
        try {
            const raw = GM_getValue(SETTINGS_STORAGE_KEY, '');
            if (!raw) return { ...DEFAULT_SETTINGS };
            return normalizeSettings(JSON.parse(raw));
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings(nextSettings) {
        settings = normalizeSettings(nextSettings);
        try {
            GM_setValue(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Keep in-memory settings if userscript storage is unavailable.
        }
    }

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
        return (text || '').replaceAll('\u00A0', ' ').trim();
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
            (settings.hideEmojiOnly && isEmojiOnlyMessage(contentEl)) ||
            (settings.hideGifLinksOnly && isGifLinkOnlyMessage(contentEl)) ||
            (settings.hideQuotedRepeats && isQuotedRepeatMessage(msgEl, contentEl))
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
            .replaceAll(/(?:\u{27BF}\u{FE0F}|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BE}\u{200D}])/gu, ' ')
            .replaceAll(/\s+/g, ' ')
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

        const start = Math.max(0, idx - settings.recentMessagesWindow);
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

    // --- Sidebar: collapse private message queries (per-network) ---

    // networkId -> { expanded: bool, observer: MutationObserver }
    const pmNetworkState = new Map();

    function ensurePmStyles() {
        if (document.getElementById(PM_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = PM_STYLE_ID;
        style.textContent = `
            .${PM_TOGGLE_ID} {
                display: flex;
                align-items: center;
                padding: 6px 10px;
                cursor: pointer;
                font-size: 0.8em;
                opacity: 0.65;
                user-select: none;
            }
            .${PM_TOGGLE_ID}:hover { opacity: 1; }
            .${PM_TOGGLE_ID} .pms-arrow {
                display: inline-block;
                margin-right: 6px;
                transition: transform 0.15s ease;
                font-style: normal;
            }
            .${PM_TOGGLE_ID}.${PM_EXPANDED_CLASS} .pms-arrow {
                transform: rotate(90deg);
            }
            .${PM_HIDDEN_CLASS} { display: none !important; }
            .${NOTIFIED_HIDDEN_ORIGINAL_CLASS} { display: none !important; }
            #${NOTIFIED_PROXY_NETWORK_ID} .channel-list-item[data-type="lobby"] {
                cursor: default;
            }
            #${NOTIFIED_PROXY_NETWORK_ID} .lounge-cleaner-notified-proxy-item {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    function ensureSettingsStyles() {
        if (document.getElementById(SETTINGS_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = SETTINGS_STYLE_ID;
        style.textContent = `
            #${SETTINGS_BUTTON_ID} {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 30px;
                height: 30px;
                border: 0;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.12);
                color: #fff;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                display: grid;
                place-items: center;
                z-index: 2;
            }
            #${SETTINGS_BUTTON_ID}:hover {
                background: rgba(255, 255, 255, 0.22);
            }
            #${SETTINGS_PANEL_OVERLAY_ID} {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.55);
                display: grid;
                place-items: center;
                z-index: 2147483647;
            }
            #${SETTINGS_PANEL_ID} {
                width: min(420px, calc(100vw - 24px));
                background: #1a1d24;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
                color: #f6f7f9;
                padding: 14px;
                font-family: inherit;
            }
            #${SETTINGS_PANEL_ID} h3 {
                margin: 0 0 12px;
                font-size: 16px;
                font-weight: 600;
            }
            #${SETTINGS_PANEL_ID} .setting-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 9px 0;
                font-size: 13px;
            }
            #${SETTINGS_PANEL_ID} .setting-row input[type="checkbox"] {
                width: 15px;
                height: 15px;
                accent-color: #5ea4ff;
            }
            #${SETTINGS_PANEL_ID} .settings-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 14px;
            }
            #${SETTINGS_PANEL_ID} button {
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.08);
                color: inherit;
                border-radius: 6px;
                padding: 7px 12px;
                font-size: 12px;
                cursor: pointer;
            }
            #${SETTINGS_PANEL_ID} button:hover {
                background: rgba(255, 255, 255, 0.16);
            }
        `;
        document.head.appendChild(style);
    }

    function ensureLogoSettingsButton() {
        const logoContainer = document.querySelector('.logo-container');
        if (!(logoContainer instanceof HTMLElement)) return;

        if (logoContainer.querySelector(`#${SETTINGS_BUTTON_ID}`)) return;

        if (getComputedStyle(logoContainer).position === 'static') {
            logoContainer.style.position = 'relative';
        }

        const button = document.createElement('button');
        button.id = SETTINGS_BUTTON_ID;
        button.type = 'button';
        button.title = 'Lounge Cleaner settings';
        button.setAttribute('aria-label', 'Open Lounge Cleaner settings');
        button.textContent = '⚙';
        button.addEventListener('click', openSettingsPanel);
        logoContainer.appendChild(button);
    }

    function startLogoSettingsObserver() {
        ensureLogoSettingsButton();
        if (logoContainerObserver) return;

        logoContainerObserver = new MutationObserver(() => {
            ensureLogoSettingsButton();
        });
        logoContainerObserver.observe(document.body, { childList: true, subtree: true });
    }

    function closeSettingsPanel() {
        const overlay = document.getElementById(SETTINGS_PANEL_OVERLAY_ID);
        if (overlay) overlay.remove();
        document.removeEventListener('keydown', onSettingsEscClose);
    }

    function onSettingsEscClose(event) {
        if (event.key === 'Escape') closeSettingsPanel();
    }

    function openSettingsPanel() {
        closeSettingsPanel();

        const overlay = document.createElement('div');
        overlay.id = SETTINGS_PANEL_OVERLAY_ID;

        const panel = document.createElement('div');
        panel.id = SETTINGS_PANEL_ID;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Lounge Cleaner settings');
        panel.innerHTML = `
            <h3>Lounge Cleaner</h3>
            <label class="setting-row">
                <input type="checkbox" name="hideEmojiOnly" ${settings.hideEmojiOnly ? 'checked' : ''}>
                <span>Hide emoji-only messages</span>
            </label>
            <label class="setting-row">
                <input type="checkbox" name="hideGifLinksOnly" ${settings.hideGifLinksOnly ? 'checked' : ''}>
                <span>Hide GIF-link-only messages</span>
            </label>
            <label class="setting-row">
                <input type="checkbox" name="hideQuotedRepeats" ${settings.hideQuotedRepeats ? 'checked' : ''}>
                <span>Hide repeated quote lines</span>
            </label>
            <label class="setting-row">
                <input type="number" name="recentMessagesWindow" value="${settings.recentMessagesWindow}" min="1" max="50" style="width:50px;background:#2a2d36;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:inherit;padding:2px 4px;">
                <span>Recent messages window for quote-repeat detection</span>
            </label>
            <label class="setting-row">
                <input type="checkbox" name="collapsePrivateMessages" ${settings.collapsePrivateMessages ? 'checked' : ''}>
                <span>Enable hidden/collapsible private messages</span>
            </label>
            <label class="setting-row">
                <input type="checkbox" name="pushNotifiedChannelsTop" ${settings.pushNotifiedChannelsTop ? 'checked' : ''}>
                <span>Push notified channels to top</span>
            </label>
            <div class="settings-actions">
                <button type="button" data-action="cancel">Cancel</button>
                <button type="button" data-action="save">Save</button>
            </div>
        `;

        overlay.appendChild(panel);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeSettingsPanel();
        });

        panel.querySelector('[data-action="cancel"]')?.addEventListener('click', closeSettingsPanel);
        panel.querySelector('[data-action="save"]')?.addEventListener('click', () => {
            const windowInput = panel.querySelector('input[name="recentMessagesWindow"]');
            const windowVal = windowInput ? Number.parseInt(windowInput.value, 10) : 3;
            const next = {
                hideEmojiOnly: Boolean(panel.querySelector('input[name="hideEmojiOnly"]:checked')),
                hideGifLinksOnly: Boolean(panel.querySelector('input[name="hideGifLinksOnly"]:checked')),
                hideQuotedRepeats: Boolean(panel.querySelector('input[name="hideQuotedRepeats"]:checked')),
                recentMessagesWindow: (Number.isFinite(windowVal) && windowVal >= 1) ? windowVal : 3,
                collapsePrivateMessages: Boolean(panel.querySelector('input[name="collapsePrivateMessages"]:checked')),
                pushNotifiedChannelsTop: Boolean(panel.querySelector('input[name="pushNotifiedChannelsTop"]:checked')),
            };
            saveSettings(next);
            applySettings();
            closeSettingsPanel();
        });

        document.body.appendChild(overlay);
        document.addEventListener('keydown', onSettingsEscClose);
    }

    function getNetworkId(networkEl) {
        return networkEl.id || networkEl.dataset.id || null;
    }

    function getQueryItemsInNetwork(networkEl) {
        return Array.from(networkEl.querySelectorAll(QUERY_ITEM_SELECTOR));
    }

    function anyNetworkQueryHasNotification(networkEl) {
        return getQueryItemsInNetwork(networkEl).some((el) =>
            PM_NOTIFICATION_CLASSES.some((cls) => el.classList.contains(cls))
        );
    }

    function scheduleNetworkSync(networkEl) {
        if (!(networkEl instanceof Element)) return;

        const existingTimer = networkSyncTimers.get(networkEl);
        if (existingTimer) return;

        const timerId = setTimeout(() => {
            networkSyncTimers.delete(networkEl);
            syncNetworkPmState(networkEl);
        }, 50);
        networkSyncTimers.set(networkEl, timerId);
    }

    function isChannelItemNotified(channelEl) {
        return PM_NOTIFICATION_CLASSES.some((cls) => channelEl.classList.contains(cls));
    }

    function ensureNotifiedProxyNetwork(networksEl) {
        let networkEl = networksEl.querySelector(`#${NOTIFIED_PROXY_NETWORK_ID}`);
        if (!networkEl) {
            networkEl = document.createElement('div');
            networkEl.id = NOTIFIED_PROXY_NETWORK_ID;
            networkEl.className = 'network';
            networkEl.setAttribute('role', 'region');
            networkEl.setAttribute('aria-live', 'polite');
            networkEl.innerHTML = `
                <div class="channel-list-item" data-name="Notified" data-type="lobby" aria-label="lobby: Notified" title="lobby: Notified" role="tab" aria-controls="#chan-notified" aria-selected="false" isjoinchannelshown="false">
                    <button aria-controls="${NOTIFIED_PROXY_NETWORK_ID}" aria-label="Collapse" aria-expanded="true" class="collapse-network">
                        <span class="collapse-network-icon"></span>
                    </button>
                    <div class="lobby-wrap"><span class="name">Notified</span><!----></div>
                    <span class="highlight badge lounge-cleaner-notified-count">0</span>
                </div>
                <div class="channels"></div>
            `;
            networksEl.insertBefore(networkEl, networksEl.firstChild);
        }

        const channelsEl = networkEl.querySelector('.channels');
        const countEl = networkEl.querySelector('.lounge-cleaner-notified-count');
        return { networkEl, channelsEl, countEl };
    }

    function teardownNotifiedChannelsProxy() {
        if (notifiedChannelsSyncTimer) {
            clearTimeout(notifiedChannelsSyncTimer);
            notifiedChannelsSyncTimer = null;
        }

        notifiedChannelsSyncing = false;

        document.querySelectorAll(`.${NOTIFIED_HIDDEN_ORIGINAL_CLASS}`).forEach((el) => {
            el.classList.remove(NOTIFIED_HIDDEN_ORIGINAL_CLASS);
        });

        document.querySelectorAll(`#${NOTIFIED_PROXY_NETWORK_ID}`).forEach((el) => el.remove());
    }

    function createNotifiedProxyItem(originalEl) {
        const proxy = originalEl.cloneNode(true);
        if (!(proxy instanceof Element)) return null;

        proxy.classList.remove(NOTIFIED_HIDDEN_ORIGINAL_CLASS, PM_HIDDEN_CLASS);
        proxy.classList.add('lounge-cleaner-notified-proxy-item');
        proxy.removeAttribute('aria-selected');

        proxy.querySelectorAll('.close-tooltip, .add-channel-tooltip').forEach((el) => el.remove());
        proxy.querySelectorAll('button.close, button.add-channel').forEach((el) => el.remove());

        const removeProxyFromPinnedList = () => {
            const notifiedNetwork = proxy.closest(`#${NOTIFIED_PROXY_NETWORK_ID}`);
            proxy.remove();

            if (!(notifiedNetwork instanceof Element)) return;

            const countEl = notifiedNetwork.querySelector('.lounge-cleaner-notified-count');
            const remaining = notifiedNetwork.querySelectorAll('.lounge-cleaner-notified-proxy-item').length;

            if (countEl) {
                countEl.textContent = String(remaining);
            }

            if (remaining === 0) {
                notifiedNetwork.remove();
            }
        };

        proxy.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Remove the clicked item from the pinned list immediately for instant feedback.
            removeProxyFromPinnedList();

            // Remove the highlight notification from original element
            PM_NOTIFICATION_CLASSES.forEach((cls) => originalEl.classList.remove(cls));

            // Temporarily unhide original element so click handlers work
            const wasHidden = originalEl.classList.contains(NOTIFIED_HIDDEN_ORIGINAL_CLASS);
            if (wasHidden) {
                originalEl.classList.remove(NOTIFIED_HIDDEN_ORIGINAL_CLASS);
            }

            // Trigger click on original element
            originalEl.click();

            // Re-hide original element
            if (wasHidden) {
                originalEl.classList.add(NOTIFIED_HIDDEN_ORIGINAL_CLASS);
            }

            // Trigger sync to update/remove from notified proxy network
            scheduleNotifiedChannelsSync();
        });

        return proxy;
    }

    function syncNotifiedChannelsProxy() {
        if (!settings.pushNotifiedChannelsTop) {
            teardownNotifiedChannelsProxy();
            notifiedChannelsSyncing = false;
            return;
        }

        if (Date.now() < notifiedChannelsSuppressUntil || notifiedChannelsSyncing) {
            return;
        }

        notifiedChannelsSyncing = true;

        try {
            const networksEl = document.querySelector('.networks');
            if (!(networksEl instanceof Element)) return;

            const allChannelItems = Array.from(
                networksEl.querySelectorAll(`.network:not(#${NOTIFIED_PROXY_NETWORK_ID}) ${CHANNEL_ITEM_SELECTOR}`)
            );

            allChannelItems.forEach((el) => el.classList.remove(NOTIFIED_HIDDEN_ORIGINAL_CLASS));

            const notifiedItems = allChannelItems.filter(isChannelItemNotified);
            if (notifiedItems.length === 0) {
                networksEl.querySelector(`#${NOTIFIED_PROXY_NETWORK_ID}`)?.remove();
                return;
            }

            notifiedChannelsSuppressUntil = Date.now() + 120;

            const { channelsEl, countEl } = ensureNotifiedProxyNetwork(networksEl);
            if (!(channelsEl instanceof Element)) return;

            // Deduplicate by data-item attribute
            const seenItems = new Set();
            const uniqueNotifiedItems = notifiedItems.filter((originalEl) => {
                const itemId = originalEl.dataset.item;
                if (!itemId || seenItems.has(itemId)) {
                    return false;
                }
                seenItems.add(itemId);
                return true;
            });

            channelsEl.innerHTML = '';
            uniqueNotifiedItems.forEach((originalEl) => {
                originalEl.classList.add(NOTIFIED_HIDDEN_ORIGINAL_CLASS);
                const proxy = createNotifiedProxyItem(originalEl);
                if (proxy) channelsEl.appendChild(proxy);
            });

            if (countEl) countEl.textContent = String(uniqueNotifiedItems.length);
        } finally {
            notifiedChannelsSyncing = false;
        }
    }

    function scheduleNotifiedChannelsSync() {
        if (notifiedChannelsSyncTimer) return;

        notifiedChannelsSyncTimer = setTimeout(() => {
            notifiedChannelsSyncTimer = null;
            syncNotifiedChannelsProxy();
        }, 70);
    }

    function startNotifiedChannelsObserver() {
        if (notifiedChannelsObserver) return;

        scheduleNotifiedChannelsSync();
        notifiedChannelsObserver = new MutationObserver((mutations) => {
            if (!settings.pushNotifiedChannelsTop) return;
            if (Date.now() < notifiedChannelsSuppressUntil) return;

            let shouldSync = false;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    if (mutation.target instanceof Element && mutation.target.matches('.channel-list-item')) {
                        shouldSync = true;
                        break;
                    }
                    continue;
                }

                if (mutation.type !== 'childList') continue;
                if (mutation.addedNodes.length === 0 && mutation.removedNodes.length === 0) continue;

                const allNodes = [...mutation.addedNodes, ...mutation.removedNodes];
                for (const node of allNodes) {
                    if (!(node instanceof Element)) continue;
                    if (
                        node.matches('.network, .channel-list-item') ||
                        node.querySelector('.network, .channel-list-item')
                    ) {
                        shouldSync = true;
                        break;
                    }
                }
                if (shouldSync) break;
            }

            if (shouldSync) scheduleNotifiedChannelsSync();
        });

        notifiedChannelsObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    function stopNotifiedChannelsObserver() {
        if (!notifiedChannelsObserver) return;
        notifiedChannelsObserver.disconnect();
        notifiedChannelsObserver = null;
    }

    function setNetworkPmExpanded(networkEl, expanded) {
        const networkId = getNetworkId(networkEl);
        if (!networkId) return;
        const state = pmNetworkState.get(networkId);
        if (state) state.expanded = expanded;

        const toggle = networkEl.querySelector(`.${PM_TOGGLE_ID}`);
        if (toggle) toggle.classList.toggle(PM_EXPANDED_CLASS, expanded);
        getQueryItemsInNetwork(networkEl).forEach((el) =>
            el.classList.toggle(PM_HIDDEN_CLASS, !expanded)
        );
    }

    function unhideNetworkPmItems(networkEl) {
        getQueryItemsInNetwork(networkEl).forEach((el) => el.classList.remove(PM_HIDDEN_CLASS));
    }

    function updateNetworkPmLabel(networkEl) {
        const label = networkEl.querySelector(`.${PM_TOGGLE_ID} .pms-label`);
        if (label) {
            const count = getQueryItemsInNetwork(networkEl).length;
            label.textContent = `Private Messages (${count})`;
        }
    }

    function syncNetworkPmState(networkEl) {
        const networkId = getNetworkId(networkEl);
        if (!networkId) return;
        const state = pmNetworkState.get(networkId);
        if (!state) return;

        // Auto-expand when a notification arrives while collapsed.
        if (anyNetworkQueryHasNotification(networkEl) && !state.expanded) {
            setNetworkPmExpanded(networkEl, true);
        }
        // Ensure newly added query items respect current state.
        if (!state.expanded) {
            getQueryItemsInNetwork(networkEl).forEach((el) =>
                el.classList.add(PM_HIDDEN_CLASS)
            );
        }
        updateNetworkPmLabel(networkEl);
    }

    function injectPmToggleForNetwork(networkEl) {
        if (!settings.collapsePrivateMessages) {
            networkEl.querySelectorAll(`.${PM_TOGGLE_ID}`).forEach((el) => el.remove());
            unhideNetworkPmItems(networkEl);
            return;
        }

        const networkId = getNetworkId(networkEl);
        if (!networkId) return;

        // Already injected for this network.
        if (networkEl.querySelector(`.${PM_TOGGLE_ID}`)) {
            syncNetworkPmState(networkEl);
            return;
        }

        const items = getQueryItemsInNetwork(networkEl);
        if (items.length === 0) return;

        const container = items[0].parentElement;
        if (!container) return;

        const shouldExpand = anyNetworkQueryHasNotification(networkEl);
        pmNetworkState.set(networkId, { expanded: shouldExpand, observer: null });

        const toggle = document.createElement('div');
        toggle.className = PM_TOGGLE_ID;
        toggle.innerHTML = `<span class="pms-arrow">&#9654;</span><span class="pms-label">Private Messages (${items.length})</span>`;
        toggle.addEventListener('click', () => {
            const state = pmNetworkState.get(networkId);
            setNetworkPmExpanded(networkEl, !state.expanded);
        });
        container.insertBefore(toggle, items[0]);

        setNetworkPmExpanded(networkEl, shouldExpand);

        // Observe this network's channel container for new items and class changes.
        const obs = new MutationObserver((mutations) => {
            let shouldSync = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length || mutation.removedNodes.length) {
                        shouldSync = true;
                        break;
                    }
                    continue;
                }

                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.matches(QUERY_ITEM_SELECTOR)) {
                        shouldSync = true;
                        break;
                    }
                }
            }

            if (shouldSync) scheduleNetworkSync(networkEl);
        });
        obs.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });
        pmNetworkState.get(networkId).observer = obs;
    }

    function initPmCollapserForAllNetworks() {
        document.querySelectorAll('.network').forEach(injectPmToggleForNetwork);
    }

    function clearPmCollapserState() {
        networkSyncTimers.forEach((timerId) => clearTimeout(timerId));
        networkSyncTimers.clear();
        pmNetworkState.forEach((state) => {
            if (state?.observer) state.observer.disconnect();
        });
        pmNetworkState.clear();
        document.querySelectorAll(`.${PM_TOGGLE_ID}`).forEach((el) => el.remove());
        document.querySelectorAll(QUERY_ITEM_SELECTOR).forEach((el) => el.classList.remove(PM_HIDDEN_CLASS));
    }

    function startPmSidebarObserver() {
        if (pmSidebarObserver) return;

        pmSidebarObserver = new MutationObserver((mutations) => {
            if (!settings.collapsePrivateMessages && !settings.pushNotifiedChannelsTop) return;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) continue;
                    if (node.classList.contains('network')) {
                        injectPmToggleForNetwork(node);
                    }
                    node.querySelectorAll('.network').forEach(injectPmToggleForNetwork);
                }
            }
        });
        pmSidebarObserver.observe(document.body, { childList: true, subtree: true });
    }

    function stopPmSidebarObserver() {
        if (!pmSidebarObserver) return;
        pmSidebarObserver.disconnect();
        pmSidebarObserver = null;
    }

    function applySettings() {
        processAllMessages();

        if (settings.pushNotifiedChannelsTop) {
            startNotifiedChannelsObserver();
            scheduleNotifiedChannelsSync();
        } else {
            stopNotifiedChannelsObserver();
            teardownNotifiedChannelsProxy();
        }

        if (!settings.collapsePrivateMessages && !settings.pushNotifiedChannelsTop) {
            stopPmSidebarObserver();
            clearPmCollapserState();
        } else if (!settings.collapsePrivateMessages) {
            stopPmSidebarObserver();
            clearPmCollapserState();
            initPmCollapserForAllNetworks();
            startPmSidebarObserver();
        } else if (settings.collapsePrivateMessages) {
            ensurePmStyles();
            initPmCollapserForAllNetworks();
            startPmSidebarObserver();
        }
    }

    function initPmCollapser() {
        ensureSettingsStyles();
        startLogoSettingsObserver();
        applySettings();
    }

    // --- End sidebar PM collapser ---

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
    initPmCollapser();
})();