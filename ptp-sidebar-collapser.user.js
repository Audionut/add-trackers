// ==UserScript==
// @name         PTP Sidebar Section Collapser
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Collapse/expand sidebar sections on passthepopcorn.me torrents pages, with per-section and global defaults.
// @author       YourName
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // Utility: Get/set config
    const CONFIG_KEY = 'ptp_sidebar_collapser_config';
    function getConfig() {
        return GM_getValue(CONFIG_KEY, {
            globalDefault: 'expanded', // 'expanded' or 'collapsed'
            perSection: {} // { sectionId: 'collapsed' | 'expanded' }
        });
    }
    function setConfig(cfg) {
        GM_setValue(CONFIG_KEY, cfg);
    }

    // Utility: Save config via prompt
    function showConfigMenu() {
        // Build per-section display preferring live DOM-derived states for panels
        // currently present, and include saved keys only when not present in DOM.
        const cfg = getConfig();
        const displayPerSection = {};
        const sections = getSidebarSections();
        // First, add DOM-detected panels (these reflect the actual page state)
        sections.forEach(s => {
            const info = computeSectionKey(s);
            displayPerSection[info.key] = detectSectionState(s);
        });
        // Then add any saved keys that aren't present in the DOM (preserve user overrides)
        if (cfg.perSection) {
            for (const [k, v] of Object.entries(cfg.perSection)) {
                if (typeof displayPerSection[k] === 'undefined') displayPerSection[k] = v;
            }
        }

        let msg = 'Sidebar Collapser Settings\n';
        msg += 'Global default (expanded/collapsed): ' + cfg.globalDefault + '\n';
        msg += 'Per-section overrides (sectionId: state):\n';
        // Prefer to show DOM-derived states here so the user sees real current state
        for (const [k, v] of Object.entries(displayPerSection)) {
            msg += `  ${k}: ${v}\n`;
        }
        msg += '\nChange global default? (current: ' + cfg.globalDefault + ')';
        const newGlobal = prompt(msg, cfg.globalDefault);
        if (newGlobal && (newGlobal === 'expanded' || newGlobal === 'collapsed')) {
            cfg.globalDefault = newGlobal;
        }
        // Per-section prompt (seed with the DOM-derived values)
        const perSectionSeed = Object.entries(displayPerSection).map(([k,v]) => `${k}:${v}`).join(',');
        const perSectionStr = prompt('Enter comma-separated sectionId:state pairs (e.g. box_albumart:collapsed,movieinfo:expanded):', perSectionSeed);
        if (perSectionStr) {
            cfg.perSection = {};
            perSectionStr.split(',').forEach(pair => {
                const [k, v] = pair.split(':');
                if (k && (v === 'collapsed' || v === 'expanded')) {
                    cfg.perSection[k] = v;
                }
            });
        }
        setConfig(cfg);
        location.reload();
    }

    // Register menu
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('Sidebar Collapser Settings', showConfigMenu);
    }

    // Find sidebar sections
    function getSidebarSections() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return [];
        // Each direct child div is a section
        return Array.from(sidebar.children).filter(el => el.classList.contains('panel'));
    }

    // Detect collapsed/expanded state for a section DOM element
    function detectSectionState(section) {
        try {
            const body = section.querySelector('.panel__body, .panel-body');
            if (!body) return 'expanded';
            if (body.classList && body.classList.contains('hidden')) return 'collapsed';
            if (body.hasAttribute && body.hasAttribute('hidden')) return 'collapsed';
            if (body.style && body.style.display === 'none') return 'collapsed';
            const cs = window.getComputedStyle && window.getComputedStyle(body);
            if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.height) === 0)) return 'collapsed';
        } catch (e) {
            console.debug('[SidebarCollapser] detectSectionState failed', e);
        }
        return 'expanded';
    }

    // Track processed sections to avoid re-attaching observers/listeners
    const processedSections = new WeakSet();
    // Track which baseKeys we've mapped to saved (unsuffixed) settings already
    const assignedBase = {};

    // Compute a stable section key info based on DOM order (baseKey + occurrence index)
    // Returns { baseKey, index, key }
    function computeSectionKey(section) {
        const baseKey = section.id || section.className.split(' ').join('_') || 'panel';
        const parent = section.parentNode || document.querySelector('.sidebar');
        const siblings = parent ? Array.from(parent.children).filter(el => el.classList && el.classList.contains('panel')) : Array.from(document.querySelectorAll('.sidebar > .panel'));
        const same = siblings.filter(s => {
            const b = s.id || s.className.split(' ').join('_') || 'panel';
            return b === baseKey;
        });
        const idx = same.indexOf(section);
        const index = idx <= 0 ? 1 : idx + 1;
        const key = index === 1 ? baseKey : `${baseKey}_${index}`;
        return { baseKey, index, key };
    }

    // Add collapse/expand buttons
    function addCollapser(section) {
        const heading = section.querySelector('.panel__heading, .panel-heading');
        if (!heading) return;
        // If we've already fully processed this section, skip re-processing
        if (processedSections.has(section)) {
            // But if the body exists and doesn't have our content observer mark, fall through
            const existingBody = section.querySelector('.panel__body, .panel-body');
            if (existingBody && existingBody.dataset && existingBody.dataset.ptpSidebarObserved) {
                return;
            }
            // otherwise continue to attach content observers
        }
        // Determine a stable sectionId based on DOM order
        const { baseKey: sectionBaseKey, index: sectionIndex, key: sectionId } = computeSectionKey(section);
        // Find the panel body and helpers first (must be before using them)
        let body = section.querySelector('.panel__body, .panel-body');
        // If body is not yet present, wait for it to be added then re-run setup
        if (!body) {
            try {
                const secObs = new MutationObserver((mutations, obs) => {
                    for (const m of mutations) {
                        if (m.type === 'childList') {
                            for (const node of m.addedNodes) {
                                if (node.nodeType === 1) {
                                    const found = node.matches && node.matches('.panel__body, .panel-body') ? node : (node.querySelector && node.querySelector('.panel__body, .panel-body'));
                                    if (found) {
                                        obs.disconnect();
                                        // Re-run addCollapser now that body exists
                                        try { addCollapser(section); } catch (e) { console.warn('[SidebarCollapser] re-addCollapser failed', sectionId, e); }
                                        return;
                                    }
                                }
                            }
                        }
                    }
                });
                secObs.observe(section, { childList: true, subtree: true });
                // Return early; we'll be invoked again when body is added
                return;
            } catch (e) {
                console.debug('[SidebarCollapser] failed to observe section for body', sectionId, e);
            }
        }
        // Check for Radarr button
        const hasRadarr = body && body.querySelector('button[id^="ptptoradarr"]');
        // Debug: log initial Radarr detection and a small body snapshot
        try {
            console.debug('[SidebarCollapser] initial hasRadarr', sectionId, !!hasRadarr, {
                hasRadarr: hasRadarr ? (hasRadarr.outerHTML || String(hasRadarr)).slice(0,200) : null,
                bodySnapshot: body ? (body.innerText || body.textContent || '').slice(0,200) : null
            });
        } catch (e) {
            console.debug('[SidebarCollapser] initial hasRadarr (logging failed)', sectionId, e);
        }
        // Find the panel title span
        const titleSpan = heading.querySelector('.panel__heading__title') || heading.querySelector('span');
        // Prefer to reuse any existing toggler to avoid breaking other scripts that reference it.
        let toggler = null;
        let togglerCreated = false;
        try {
            const existing = heading.querySelector('.panel__heading__toggler');
            if (existing) {
                toggler = existing;
                togglerCreated = false;
            } else {
                toggler = document.createElement('a');
                togglerCreated = true;
                toggler.className = 'panel__heading__toggler';
                toggler.title = 'Toggle';
                toggler.href = '#';
                toggler.style.marginLeft = '5px';
                toggler.style.cursor = 'pointer';
                toggler.textContent = 'toggle';
                // Attach immediately so positioning logic can operate
                heading.appendChild(toggler);
            }
        } catch (e) {
            // Fallback: create our own toggler if querySelector fails
            try {
                toggler = document.createElement('a');
                togglerCreated = true;
                toggler.className = 'panel__heading__toggler';
                toggler.title = 'Toggle';
                toggler.href = '#';
                toggler.style.marginLeft = '5px';
                toggler.style.cursor = 'pointer';
                toggler.textContent = 'toggle';
                heading.appendChild(toggler);
            } catch (ee) {}
        }
        // Helper: robustly detect whether the panel body is currently collapsed
        function isCollapsed() {
            try {
                if (!body) return false;
                if (body.classList && body.classList.contains('hidden')) return true;
                if (body.hasAttribute && body.hasAttribute('hidden')) return true;
                const cs = window.getComputedStyle ? window.getComputedStyle(body) : null;
                if (cs) {
                    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.height) === 0) return true;
                }
                // Some existing toggles may set inline style display
                if (body.style && body.style.display === 'none') return true;
            } catch (e) {
                console.debug('[SidebarCollapser] isCollapsed check failed', sectionId, e);
            }
            return false;
        }
        // If the toggle already existed, persist the current DOM state as the per-section default
        try {
            const cfg = getConfig();
            const domState = isCollapsed() ? 'collapsed' : 'expanded';
            if (cfg.perSection[sectionId] === undefined) {
                cfg.perSection[sectionId] = domState;
                setConfig(cfg);
                console.debug('[SidebarCollapser] persisted DOM-derived default state for', sectionId, domState);
            }
        } catch (e) {
            console.debug('[SidebarCollapser] failed to persist DOM-derived default', sectionId, e);
        }

        // Observe the body for attribute/style changes so we persist user toggles
        if (body) {
            try {
                const bodyAttrObserver = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        if (m.type === 'attributes') {
                            const newState = isCollapsed() ? 'collapsed' : 'expanded';
                            // Only overwrite if different from stored value
                            const cfg = getConfig();
                            if (cfg.perSection[sectionId] !== newState) {
                                cfg.perSection[sectionId] = newState;
                                setConfig(cfg);
                                console.debug('[SidebarCollapser] updated perSection from DOM change', sectionId, newState);
                            }
                        }
                    }
                });
                bodyAttrObserver.observe(body, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
            } catch (e) {
                console.debug('[SidebarCollapser] failed to observe body attributes for', sectionId, e);
            }
            // Observe body subtree for content changes (images, nodes) so counts and state stay accurate
            try {
                const bodyContentObserver = new MutationObserver((mutations) => {
                    let needsUpdate = false;
                    for (const m of mutations) {
                        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
                            needsUpdate = true;
                            // Attach image load/error handlers for newly added images to trigger update after load
                            for (const node of m.addedNodes) {
                                try {
                                    if (node.nodeType === 1) {
                                        if (node.tagName === 'IMG') {
                                            node.addEventListener('load', update);
                                            node.addEventListener('error', update);
                                        } else {
                                            const imgs = node.querySelectorAll && node.querySelectorAll('img');
                                            if (imgs && imgs.length) {
                                                imgs.forEach(img => { try { img.addEventListener('load', update); img.addEventListener('error', update); } catch (e) {} });
                                            }
                                        }
                                    }
                                } catch (e) {}
                            }
                        }
                        if (m.type === 'attributes') {
                            needsUpdate = true;
                        }
                    }
                    if (needsUpdate) {
                        try { update(); } catch (e) {}
                    }
                });
                bodyContentObserver.observe(body, { childList: true, subtree: true });
                // Mark the body so we know we've attached observers
                try { if (body.dataset) body.dataset.ptpSidebarObserved = '1'; } catch (e) {}
                // Attach load handlers to existing images as well
                try {
                    const existingImgs = body.querySelectorAll && body.querySelectorAll('img');
                    if (existingImgs && existingImgs.length) existingImgs.forEach(img => { try { img.addEventListener('load', update); img.addEventListener('error', update); } catch (e) {} });
                } catch (e) {}
            } catch (e) {
                console.debug('[SidebarCollapser] failed to observe body content for', sectionId, e);
            }
        }
        // Helper to (re)position the toggler relative to Radarr button or title
        function positionToggler() {
            const hasRadarrNow = body && body.querySelector('button[id^="ptptoradarr"]');
            console.debug('[SidebarCollapser] positionToggler start', sectionId, { hasRadarrNow: !!hasRadarrNow });
            // Extra debug: list heading children and indices for toggler/title
            try {
                const childElems = Array.from(heading.children);
                const childrenSummary = childElems.map((n, i) => ({ i, tag: n.tagName, cls: n.className || null, text: (n.textContent||'').trim().slice(0,40) }));
                const togglerIndex = childElems.indexOf(toggler);
                const titleIndex = childElems.indexOf(titleSpan);
                console.debug('[SidebarCollapser] heading children', sectionId, childrenSummary);
                console.debug('[SidebarCollapser] indices', sectionId, { togglerIndex, titleIndex });
            } catch (e) {
                console.debug('[SidebarCollapser] heading children debug failed', sectionId, e);
            }
            try {
                if (hasRadarrNow && titleSpan) {
                    try {
                        console.debug('[SidebarCollapser] positionToggler found Radarr button', sectionId, hasRadarrNow ? (hasRadarrNow.outerHTML || '').slice(0,200) : null);
                    } catch (e) { /* ignore */ }
                    // Move the Radarr button into the heading so placement is predictable
                    try {
                        const radarrBtn = body.querySelector('button[id^="ptptoradarr"]');
                        if (radarrBtn) {
                            console.debug('[SidebarCollapser] moving Radarr button into heading (preserving styles)', sectionId, (radarrBtn.outerHTML||'').slice(0,200));
                            // Move the existing element into the heading without modifying its inline styles.
                            // Insert the button into the heading after the title
                            if (titleSpan && titleSpan.nextSibling) {
                                heading.insertBefore(radarrBtn, titleSpan.nextSibling);
                            } else {
                                heading.appendChild(radarrBtn);
                            }
                        }
                    } catch (e) {
                        console.warn('[SidebarCollapser] failed to move Radarr button', sectionId, e);
                    }
                    // Now place toggler after titleSpan for consistent ordering
                    try {
                        toggler.style.cssFloat = '';
                        toggler.style.float = '';
                        toggler.style.marginLeft = '5px';
                    } catch (e) {}
                    if (titleSpan) {
                        if (titleSpan.nextSibling) {
                            heading.insertBefore(toggler, titleSpan.nextSibling);
                        } else {
                            heading.appendChild(toggler);
                        }
                    } else if (toggler.parentNode !== heading) {
                        heading.appendChild(toggler);
                    }
                    console.debug('[SidebarCollapser] positioned toggler after titleSpan for Radarr panel', sectionId);
                } else {
                    // Ensure toggler is appended to heading if no Radarr button
                    if (toggler.parentNode !== heading) heading.appendChild(toggler);
                }
                console.debug('[SidebarCollapser] positionToggler done', sectionId, { parent: toggler.parentNode === heading, nextSiblingIsTitle: toggler.nextSibling === titleSpan });
            } catch (e) {
                // Defensive: if DOM changed, ignore and retry later
                console.warn('[SidebarCollapser] positionToggler failed', e);
            }
        }
        // Position now if possible
        positionToggler();
        // If Radarr button may be added asynchronously by another script, observe the body
        if (body) {
            const radarrObserver = new MutationObserver((mutations, obs) => {
                console.debug('[SidebarCollapser] radarrObserver mutations', sectionId, mutations.map(m => ({type: m.type, added: m.addedNodes.length}))); 
                for (const m of mutations) {
                    if (m.type === 'childList') {
                        for (const node of m.addedNodes) {
                            if (node.nodeType === 1) {
                                try {
                                    const isBtn = (node.matches && node.matches('button[id^="ptptoradarr"]')) ||
                                        (node.querySelector && node.querySelector('button[id^="ptptoradarr"]'));
                                    console.debug('[SidebarCollapser] radarrObserver added node', sectionId, { nodeTag: node.tagName, isBtn });
                                    if (isBtn) {
                                        console.debug('[SidebarCollapser] radarrObserver found button, repositioning', sectionId);
                                        positionToggler();
                                        obs.disconnect();
                                        return;
                                    }
                                } catch (e) {
                                    console.debug('[SidebarCollapser] radarrObserver node check failed', sectionId, e);
                                }
                            }
                        }
                    }
                }
            });
            radarrObserver.observe(body, { childList: true, subtree: true });
        }
        // Polling fallback: some scripts may inject very late or in ways
        // that MutationObserver doesn't catch; poll briefly as a last resort.
        if (body) {
            let attempts = 0;
            const maxAttempts = 3; // give up early (~600ms at 200ms)
            const pollInterval = 200;
            const poller = setInterval(() => {
                attempts++;
                const found = body.querySelector('button[id^="ptptoradarr"]');
                console.debug('[SidebarCollapser] poll attempt', sectionId, attempts, 'found', !!found);
                if (found) {
                    try { console.debug('[SidebarCollapser] poll found button', sectionId, (found.outerHTML || '').slice(0,200)); } catch (e) {}
                    positionToggler();
                    clearInterval(poller);
                    return;
                }
                if (attempts >= maxAttempts) {
                    console.debug('[SidebarCollapser] poll giving up', sectionId, attempts);
                    clearInterval(poller);
                }
            }, pollInterval);
        }
        // State
        function getState() {
            const cfg = getConfig();
            // If there's an explicit saved setting for this exact key, use it
            if (cfg.perSection && typeof cfg.perSection[sectionId] !== 'undefined') return cfg.perSection[sectionId];
            // Otherwise prefer the current DOM-derived state so we match what the user currently sees
            try {
                if (body) return isCollapsed() ? 'collapsed' : 'expanded';
            } catch (e) {}
            // Fall back to global default if no body to inspect
            return cfg.globalDefault;
        }
        function setState(state) {
            const cfg = getConfig();
            cfg.perSection[sectionId] = state;
            setConfig(cfg);
        }
        // Count items in the panel body
        function getItemCount() {
            if (!body) return 0;
            // For collages/collections, look for .list > li
            try {
                const list = body.querySelector('ul.list, ol.list');
                if (list) {
                    const liCount = list.querySelectorAll('li').length;
                    return liCount;
                }
                // Some panels use thumbnails or images directly; count meaningful items
                const itemCandidates = body.querySelectorAll && (body.querySelectorAll('.thumb, .thumbs li, .similar-movie, img') || []);
                if (itemCandidates && itemCandidates.length) return itemCandidates.length;
            } catch (e) {
                console.debug('[SidebarCollapser] getItemCount query failed', sectionId, e);
            }
            // Fallback: count direct element children
            try { return body.children.length; } catch (e) { return 0; }
        }
        // Add/remove item count next to title
        let countSpan = null;
        function updateCountDisplay(show, count) {
            if (!titleSpan) return;
            if (show) {
                if (!countSpan) {
                    countSpan = document.createElement('span');
                    countSpan.style.color = '#f2db83';
                    countSpan.style.fontSize = '0.9em';
                    countSpan.style.marginLeft = '6px';
                    // Always insert after the titleSpan
                    if (titleSpan.nextSibling) {
                        titleSpan.parentNode.insertBefore(countSpan, titleSpan.nextSibling);
                    } else {
                        titleSpan.parentNode.appendChild(countSpan);
                    }
                }
                countSpan.textContent = `(${count})`;
            } else {
                if (countSpan && countSpan.parentNode) {
                    countSpan.parentNode.removeChild(countSpan);
                    countSpan = null;
                }
            }
        }
        function update() {
            const state = getState();
            if (body) {
                if (state === 'collapsed') {
                    try { body.classList.add('hidden'); } catch (e) {}
                    try { body.setAttribute('hidden', ''); } catch (e) {}
                    try { body.style.display = 'none'; } catch (e) {}
                } else {
                    try { body.classList.remove('hidden'); } catch (e) {}
                    try { body.removeAttribute('hidden'); } catch (e) {}
                    try { body.style.display = ''; } catch (e) {}
                }
            }
            // Always recalculate count for accuracy
            if (state === 'collapsed') {
                const count = getItemCount();
                updateCountDisplay(true, count);
            } else {
                updateCountDisplay(false);
            }
        }
        // Always attach update logic, even if toggle already existed
        if (togglerCreated) {
            toggler.addEventListener('click', function(e) {
                e.preventDefault();
                const state = getState() === 'collapsed' ? 'expanded' : 'collapsed';
                setState(state);
                update();
            });
        } else {
            // If toggle already existed, also attach our update logic to it
            toggler.addEventListener('click', function(e) {
                // Don't preventDefault or interfere with existing onclick
                setTimeout(() => {
                    // After the onclick has toggled the class, update state in config
                    let newState = 'expanded';
                    try {
                        if (body && body.classList && body.classList.contains('hidden')) newState = 'collapsed';
                        else if (body && body.hasAttribute && body.hasAttribute('hidden')) newState = 'collapsed';
                        else if (body && body.style && body.style.display === 'none') newState = 'collapsed';
                        else if (body && window.getComputedStyle) {
                            const cs = window.getComputedStyle(body);
                            if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.height) === 0)) newState = 'collapsed';
                        }
                    } catch (e) {
                        console.debug('[SidebarCollapser] click handler state detection failed', sectionId, e);
                    }
                    setState(newState);
                    update();
                }, 0);
            });
        }
        // Initial update
        update();

        // Observe for changes to the heading in case other scripts add toggles
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('panel__heading__toggler')) {
                            // If a new toggler is added, perhaps adjust our logic if needed
                            // For now, just ensure our update is called
                            setTimeout(update, 0);
                        }
                    });
                }
            });
        });
        observer.observe(heading, { childList: true });
        // Mark this section as processed so we don't reattach observers/listeners
        try { processedSections.add(section); } catch (e) {}
    }

    // Main - attach to existing panels
    const initialSections = getSidebarSections();
    // Map saved unsuffixed keys (legacy) to the first matching DOM instance so user
    // settings follow the visible panels. This mutates and persists cfg.perSection.
    function mapSavedKeysToDOM() {
        try {
            const cfg = getConfig();
            if (!cfg.perSection) return;
            // Build DOM map: baseKey -> first computed key
            const domMap = {};
            initialSections.forEach(s => {
                const info = computeSectionKey(s);
                if (!domMap[info.baseKey]) domMap[info.baseKey] = info.key;
            });
            let changed = false;
            for (const savedKey of Object.keys(cfg.perSection)) {
                // If savedKey exactly matches a baseKey present in DOM (legacy), map it
                if (domMap[savedKey]) {
                    const domKey = domMap[savedKey];
                    if (domKey !== savedKey) {
                        // Only move if the target key doesn't already have a user override
                        if (typeof cfg.perSection[domKey] === 'undefined') {
                            cfg.perSection[domKey] = cfg.perSection[savedKey];
                            delete cfg.perSection[savedKey];
                            assignedBase[savedKey] = domKey;
                            changed = true;
                            console.debug('[SidebarCollapser] migrated saved key', savedKey, '->', domKey);
                        }
                    }
                }
            }
            if (changed) setConfig(cfg);
        } catch (e) { console.debug('[SidebarCollapser] mapSavedKeysToDOM failed', e); }
    }
    mapSavedKeysToDOM();
    console.debug('[SidebarCollapser] initial panels found', initialSections.map(s => ({ id: s.id, cls: s.className, title: (s.querySelector('.panel__heading__title')||{textContent:''}).textContent.trim().slice(0,80) }))); 
    initialSections.forEach(addCollapser);

    // Observe the sidebar for newly added panels (some panels are injected asynchronously)
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) {
        const sidebarObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    for (const node of m.addedNodes) {
                        if (node.nodeType !== 1) continue;
                        // If the added node is a panel, add collapser
                        if (node.classList && node.classList.contains('panel')) {
                            console.debug('[SidebarCollapser] new panel added', { id: node.id, cls: node.className });
                            try { addCollapser(node); } catch (e) { console.warn('[SidebarCollapser] addCollapser failed on new panel', node, e); }
                        } else {
                            // If the added node contains panels deeper, find them
                            const panels = node.querySelectorAll && node.querySelectorAll('.panel');
                            if (panels && panels.length) {
                                panels.forEach(p => {
                                    console.debug('[SidebarCollapser] new nested panel added', { id: p.id, cls: p.className });
                                    try { addCollapser(p); } catch (e) { console.warn('[SidebarCollapser] addCollapser failed on nested panel', p, e); }
                                });
                            }
                            // If the added node is inside an existing panel (e.g., a button injected), ensure that panel is processed
                            try {
                                const parentPanel = node.closest && node.closest('.panel');
                                if (parentPanel) {
                                    console.debug('[SidebarCollapser] node added inside existing panel, ensuring collapser', { id: parentPanel.id, cls: parentPanel.className });
                                    try { addCollapser(parentPanel); } catch (e) { console.warn('[SidebarCollapser] addCollapser failed on parentPanel', parentPanel, e); }
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
        });
        sidebarObserver.observe(sidebarEl, { childList: true, subtree: true });
    }

})();
