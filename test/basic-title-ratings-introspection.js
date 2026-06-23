// ==UserScript==
// @name         IMDb title ratings introspection
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Introspect IMDb GraphQL title rating fields and show the best rating summary on PTP
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://api.graphql.imdb.com/';
    const RATING_WORDS = /(rating|ratings|vote|votes|score|metacritic|meter|rank|breakdown|distribution|histogram|demographic|bucket)/i;
    const BREAKDOWN_CONTEXT_WORDS = /(breakdown|distribution|histogram|demographic|bucket|bar|summary|label|name|title|value|count|vote|rating|score|rank|total)/i;
    const PREFERRED_FIELDS = ['ratingsSummary', 'meterRanking', 'metacritic'];
    const MAX_CANDIDATES = 12;

    function getNestedTypeInfo(depth = 5) {
        if (depth <= 0) {
            return 'name kind';
        }
        return `name kind ofType { ${getNestedTypeInfo(depth - 1)} }`;
    }

    function imdbRequest(query, variables = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: API_URL,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ query, variables }),
                onload: (response) => {
                    try {
                        const payload = JSON.parse(response.responseText);

                        if (response.status >= 200 && response.status < 300) {
                            resolve(payload);
                            return;
                        }

                        if (payload && (payload.data || payload.errors)) {
                            resolve(payload);
                            return;
                        }

                        reject(new Error(`HTTP ${response.status}: ${response.responseText}`));
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (response) => {
                    reject(new Error(`Request error: ${response.statusText || 'unknown error'}`));
                }
            });
        });
    }

    function getImdbIdFromPage() {
        const imdbLink = document.getElementById('imdb-title-link');
        if (!imdbLink || !imdbLink.href) {
            return null;
        }

        const match = imdbLink.href.match(/title\/(tt\d+)\//i);
        return match ? match[1] : null;
    }

    function unwrapNamedType(typeNode) {
        let cursor = typeNode;
        while (cursor && cursor.ofType) {
            cursor = cursor.ofType;
        }
        return cursor || { name: null, kind: null };
    }

    function hasRequiredArgs(field) {
        return (field.args || []).some((arg) => {
            let cursor = arg.type;
            while (cursor) {
                if (cursor.kind === 'NON_NULL') {
                    return true;
                }
                cursor = cursor.ofType || null;
            }
            return false;
        });
    }

    function isNonNullType(typeNode) {
        let cursor = typeNode;
        while (cursor) {
            if (cursor.kind === 'NON_NULL') {
                return true;
            }
            cursor = cursor.ofType || null;
        }
        return false;
    }

    async function introspectTitleFields() {
        const query = `
            query TitleIntrospection {
                __type(name: "Title") {
                    name
                    fields {
                        name
                        args {
                            name
                            type { ${getNestedTypeInfo()} }
                        }
                        type { ${getNestedTypeInfo()} }
                    }
                }
            }
        `;
        const payload = await imdbRequest(query);
        if (payload.errors) {
            throw new Error(`Title introspection failed: ${JSON.stringify(payload.errors)}`);
        }
        return payload.data?.__type?.fields || [];
    }

    async function introspectType(typeName) {
        const query = `
            query TypeIntrospection($typeName: String!) {
                __type(name: $typeName) {
                    name
                    kind
                    fields {
                        name
                        args {
                            name
                            type { ${getNestedTypeInfo()} }
                        }
                        type { ${getNestedTypeInfo()} }
                    }
                }
            }
        `;
        const payload = await imdbRequest(query, { typeName });
        if (payload.errors) {
            return null;
        }
        return payload.data?.__type || null;
    }

    function pickScalarFields(typeInfo, maxFields = 10) {
        const selected = [];
        for (const field of typeInfo?.fields || []) {
            if ((field.args || []).length > 0) {
                continue;
            }

            const named = unwrapNamedType(field.type);
            if (named.kind === 'SCALAR' || named.kind === 'ENUM') {
                selected.push(field.name);
            }

            if (selected.length >= maxFields) {
                break;
            }
        }
        return selected;
    }

    function getSafeArgumentClause(field) {
        const args = field.args || [];
        if (args.length === 0) {
            return '';
        }

        const lowerArgNames = args.map((arg) => String(arg.name || '').toLowerCase());
        const requiredArgs = args
            .filter((arg) => isNonNullType(arg.type))
            .map((arg) => String(arg.name || '').toLowerCase());
        const disallowedRequiredArgs = requiredArgs.filter((name) => name !== 'first' && name !== 'last');

        if (disallowedRequiredArgs.length > 0) {
            return null;
        }

        if (lowerArgNames.includes('first')) {
            return '(first: 10)';
        }

        if (lowerArgNames.includes('last')) {
            return '(last: 10)';
        }

        if (requiredArgs.length > 0) {
            return null;
        }

        return '';
    }

    function isRelevantNestedField(field) {
        const named = unwrapNamedType(field.type);
        return BREAKDOWN_CONTEXT_WORDS.test(field.name) || BREAKDOWN_CONTEXT_WORDS.test(named.name || '');
    }

    async function buildNestedFieldSelection(field, depth, visitedTypes) {
        const argClause = getSafeArgumentClause(field);
        if (argClause === null) {
            return null;
        }

        const named = unwrapNamedType(field.type);
        if (!named.name) {
            return null;
        }

        if (named.kind === 'SCALAR' || named.kind === 'ENUM') {
            return `${field.name}${argClause}`;
        }

        if (depth <= 0) {
            return `${field.name}${argClause} { __typename }`;
        }

        if (visitedTypes.has(named.name)) {
            return `${field.name}${argClause} { __typename }`;
        }

        const nextVisitedTypes = new Set(visitedTypes);
        nextVisitedTypes.add(named.name);

        const typeInfo = await introspectType(named.name);
        if (!typeInfo?.fields) {
            return `${field.name}${argClause} { __typename }`;
        }

        const parts = ['__typename', ...pickScalarFields(typeInfo, 12)];

        for (const childField of typeInfo.fields) {
            if (!isRelevantNestedField(childField)) {
                continue;
            }

            const nestedSelection = await buildNestedFieldSelection(childField, depth - 1, nextVisitedTypes);
            if (nestedSelection) {
                parts.push(nestedSelection);
            }
        }

        return `${field.name}${argClause} { ${Array.from(new Set(parts)).join(' ')} }`;
    }

    async function buildFieldSelection(field) {
        return buildNestedFieldSelection(field, 4, new Set());
    }

    function scoreCandidate(field) {
        const named = unwrapNamedType(field.type);
        let score = 0;

        if (PREFERRED_FIELDS.includes(field.name)) {
            score += 100;
        }
        if (field.name.toLowerCase() === 'ratingssummary') {
            score += 80;
        }
        if (RATING_WORDS.test(field.name)) {
            score += 30;
        }
        if (RATING_WORDS.test(named.name || '')) {
            score += 10;
        }
        if ((field.args || []).length === 0) {
            score += 5;
        }
        if (!hasRequiredArgs(field)) {
            score += 5;
        }

        return score;
    }

    async function probeField(imdbId, field) {
        const selection = await buildFieldSelection(field);
        if (!selection) {
            return {
                field: field.name,
                ok: false,
                reason: 'Field requires unsupported arguments'
            };
        }

        const query = `
            query ProbeTitleRatingField($id: ID!) {
                title(id: $id) {
                    id
                    ${selection}
                }
            }
        `;

        const payload = await imdbRequest(query, { id: imdbId });
        if (payload.errors) {
            return {
                field: field.name,
                ok: false,
                reason: payload.errors.map((error) => error.message).join(' | ')
            };
        }

        return {
            field: field.name,
            ok: true,
            data: payload.data?.title?.[field.name] ?? null
        };
    }

    function collectNumericMatches(value, patterns, path = [], out = []) {
        if (value == null) {
            return out;
        }

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                collectNumericMatches(item, patterns, path.concat(String(index)), out);
            });
            return out;
        }

        if (typeof value === 'object') {
            for (const [key, child] of Object.entries(value)) {
                const nextPath = path.concat(key);
                const keyMatches = patterns.some((pattern) => pattern.test(key));

                if (keyMatches) {
                    if (typeof child === 'number' && Number.isFinite(child)) {
                        out.push({ path: nextPath.join('.'), value: child });
                    } else if (typeof child === 'string' && /^-?\d+(?:\.\d+)?$/.test(child.trim())) {
                        out.push({ path: nextPath.join('.'), value: Number.parseFloat(child.trim()) });
                    }
                }

                collectNumericMatches(child, patterns, nextPath, out);
            }
        }

        return out;
    }

    function pickBestMatch(matches, exactNames = []) {
        if (!matches.length) {
            return null;
        }

        const ranked = matches.slice().sort((a, b) => {
            const aDepth = a.path.split('.').length;
            const bDepth = b.path.split('.').length;
            const aExact = exactNames.some((name) => a.path.toLowerCase().endsWith(name.toLowerCase())) ? 1 : 0;
            const bExact = exactNames.some((name) => b.path.toLowerCase().endsWith(name.toLowerCase())) ? 1 : 0;

            if (bExact !== aExact) {
                return bExact - aExact;
            }
            return aDepth - bDepth;
        });

        return ranked[0];
    }

    function coerceFiniteNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
            const parsed = Number.parseFloat(value.trim());
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    function extractRatingSummary(fieldName, payload) {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const ratingMatch = pickBestMatch(
            collectNumericMatches(payload, [/aggregateRating/i, /ratingValue/i, /^rating$/i, /score/i]),
            ['aggregateRating', 'ratingValue', 'rating', 'score']
        );
        const voteMatch = pickBestMatch(
            collectNumericMatches(payload, [/voteCount/i, /^votes$/i, /ratingCount/i, /count/i]),
            ['voteCount', 'votes', 'ratingCount', 'count']
        );

        if (!ratingMatch && !voteMatch) {
            return null;
        }

        return {
            sourceField: fieldName,
            aggregateRating: ratingMatch ? ratingMatch.value : null,
            aggregateRatingPath: ratingMatch ? ratingMatch.path : '',
            voteCount: voteMatch ? voteMatch.value : null,
            voteCountPath: voteMatch ? voteMatch.path : ''
        };
    }

    function extractHistogramBucketsFromArray(items) {
        if (!Array.isArray(items) || items.length < 3) {
            return null;
        }

        const buckets = [];

        for (const item of items) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return null;
            }

            const scoreMatch = pickBestMatch(
                collectNumericMatches(item, [/^score$/i, /^rating$/i, /^value$/i, /^rank$/i, /ratingValue/i]),
                ['score', 'rating', 'value', 'rank', 'ratingValue']
            );
            const countMatch = pickBestMatch(
                collectNumericMatches(item, [/^count$/i, /^votes$/i, /voteCount/i, /ratingCount/i, /^total$/i]),
                ['count', 'votes', 'voteCount', 'ratingCount', 'total']
            );

            if (!scoreMatch || !countMatch) {
                return null;
            }

            const score = coerceFiniteNumber(scoreMatch.value);
            const count = coerceFiniteNumber(countMatch.value);
            if (!Number.isFinite(score) || !Number.isFinite(count)) {
                return null;
            }

            buckets.push({ score, count });
        }

        const plausibleBuckets = buckets.filter((bucket) =>
            bucket.score >= 0 &&
            bucket.score <= 10 &&
            bucket.count >= 0
        );

        if (plausibleBuckets.length < Math.max(3, Math.ceil(items.length * 0.7))) {
            return null;
        }

        return plausibleBuckets;
    }

    function collectHistogramCandidates(value, path = [], out = []) {
        if (value == null) {
            return out;
        }

        if (Array.isArray(value)) {
            const buckets = extractHistogramBucketsFromArray(value);
            if (buckets) {
                out.push({
                    path: path.join('.'),
                    buckets
                });
            }

            value.forEach((item, index) => {
                collectHistogramCandidates(item, path.concat(String(index)), out);
            });
            return out;
        }

        if (typeof value === 'object') {
            for (const [key, child] of Object.entries(value)) {
                collectHistogramCandidates(child, path.concat(key), out);
            }
        }

        return out;
    }

    function normalizeHistogramBuckets(buckets) {
        const merged = new Map();

        for (const bucket of buckets || []) {
            const roundedScore = Math.round(bucket.score);
            if (!Number.isFinite(roundedScore) || roundedScore < 0 || roundedScore > 10) {
                continue;
            }

            const current = merged.get(roundedScore) || 0;
            merged.set(roundedScore, current + Math.round(bucket.count));
        }

        return Array.from(merged.entries())
            .map(([score, count]) => ({ score, count }))
            .sort((a, b) => b.score - a.score);
    }

    function extractRatingBreakdown(successfulResults, bestSummary) {
        const candidates = [];

        for (const result of successfulResults) {
            const histogramCandidates = collectHistogramCandidates(result.data);
            for (const candidate of histogramCandidates) {
                const normalizedBuckets = normalizeHistogramBuckets(candidate.buckets);
                const totalCount = normalizedBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
                candidates.push({
                    sourceField: result.field,
                    path: candidate.path,
                    buckets: normalizedBuckets,
                    totalCount
                });
            }
        }

        const filtered = candidates.filter((candidate) => candidate.buckets.length >= 5);
        if (filtered.length === 0) {
            return null;
        }

        filtered.sort((a, b) => {
            const aPreferred = a.sourceField === 'aggregateRatingsBreakdown' ? 1 : 0;
            const bPreferred = b.sourceField === 'aggregateRatingsBreakdown' ? 1 : 0;
            if (bPreferred !== aPreferred) {
                return bPreferred - aPreferred;
            }

            if (Number.isFinite(bestSummary?.voteCount)) {
                const aDistance = Math.abs(a.totalCount - bestSummary.voteCount);
                const bDistance = Math.abs(b.totalCount - bestSummary.voteCount);
                if (aDistance !== bDistance) {
                    return aDistance - bDistance;
                }
            }

            if (b.buckets.length !== a.buckets.length) {
                return b.buckets.length - a.buckets.length;
            }

            return b.totalCount - a.totalCount;
        });

        return filtered[0];
    }

    function formatVoteCount(value) {
        if (!Number.isFinite(value)) {
            return 'Unknown';
        }
        return Math.round(value).toLocaleString();
    }

    function formatRatingValue(value) {
        if (!Number.isFinite(value)) {
            return 'Unknown';
        }
        return `${value.toFixed(1)}/10`;
    }

    function buildBreakdownHtml(breakdown) {
        if (!breakdown || !Array.isArray(breakdown.buckets) || breakdown.buckets.length === 0) {
            return '';
        }

        const maxCount = breakdown.buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
        const rows = breakdown.buckets.map((bucket) => {
            const widthPercent = maxCount > 0 ? Math.max(3, Math.round((bucket.count / maxCount) * 100)) : 0;
            return `
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                    <span style="display: inline-block; width: 18px; text-align: right;"><strong>${bucket.score}</strong></span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden;">
                        <div style="width: ${widthPercent}%; height: 100%; background: #F2DB83;"></div>
                    </div>
                    <span style="display: inline-block; min-width: 72px; text-align: right;">${formatVoteCount(bucket.count)}</span>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-top: 10px;">
                <div><strong>Breakdown:</strong> <code>${breakdown.sourceField}</code></div>
                <div><strong>Histogram path:</strong> <code>${breakdown.path || 'n/a'}</code></div>
                <div><strong>Histogram total:</strong> ${formatVoteCount(breakdown.totalCount)}</div>
                <div style="margin-top: 6px;">${rows}</div>
            </div>
        `;
    }

    function ensurePanel() {
        let panel = document.getElementById('imdb-ratings-introspection-panel');
        if (panel) {
            return panel;
        }

        panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'imdb-ratings-introspection-panel';
        panel.innerHTML = `
            <div class="panel__heading">
                <span class="panel__heading__title"><span style="color: #F2DB83;">IMDb</span> Ratings Probe</span>
            </div>
            <div class="panel__body">
                <div id="imdb-ratings-introspection-status">Loading...</div>
            </div>
        `;

        const sidebar = document.querySelector('div.sidebar');
        if (sidebar) {
            sidebar.appendChild(panel);
        }

        return panel;
    }

    function renderPanelState(html) {
        const panel = ensurePanel();
        if (!panel) {
            return;
        }

        const target = panel.querySelector('#imdb-ratings-introspection-status');
        if (target) {
            target.innerHTML = html;
        }
    }

    async function run() {
        const imdbId = getImdbIdFromPage();
        if (!imdbId) {
            console.warn('[IMDb Ratings Introspection] IMDb ID not found on page.');
            return;
        }

        renderPanelState(`Looking up rating fields for <strong>${imdbId}</strong>...`);
        console.log(`[IMDb Ratings Introspection] Starting for ${imdbId}`);

        const titleFields = await introspectTitleFields();
        const candidates = titleFields
            .filter((field) => {
                const named = unwrapNamedType(field.type);
                return RATING_WORDS.test(field.name) || RATING_WORDS.test(named.name || '');
            })
            .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
            .slice(0, MAX_CANDIDATES);

        console.log('[IMDb Ratings Introspection] Candidate Title fields:', candidates.map((field) => ({
            name: field.name,
            type: unwrapNamedType(field.type),
            args: (field.args || []).map((arg) => arg.name),
            score: scoreCandidate(field)
        })));

        if (candidates.length === 0) {
            renderPanelState('No rating-like `Title` fields were discovered. See console for details.');
            console.warn('[IMDb Ratings Introspection] No rating-like fields found on Title.');
            return;
        }

        const probeResults = [];
        for (const field of candidates) {
            try {
                const result = await probeField(imdbId, field);
                probeResults.push(result);
            } catch (error) {
                probeResults.push({
                    field: field.name,
                    ok: false,
                    reason: String(error)
                });
            }
        }

        console.log('[IMDb Ratings Introspection] Probe results:', probeResults);

        const successful = probeResults.filter((result) => result.ok && result.data);
        const summaries = successful
            .map((result) => extractRatingSummary(result.field, result.data))
            .filter(Boolean)
            .sort((a, b) => {
                const aPreferred = PREFERRED_FIELDS.includes(a.sourceField) ? 1 : 0;
                const bPreferred = PREFERRED_FIELDS.includes(b.sourceField) ? 1 : 0;
                if (bPreferred !== aPreferred) {
                    return bPreferred - aPreferred;
                }
                const aVotes = Number.isFinite(a.voteCount) ? a.voteCount : -1;
                const bVotes = Number.isFinite(b.voteCount) ? b.voteCount : -1;
                return bVotes - aVotes;
            });

        console.log('[IMDb Ratings Introspection] Extracted rating summaries:', summaries);

        const best = summaries[0] || null;
        if (!best) {
            renderPanelState('Found rating-like fields, but none exposed a clear aggregate rating and vote count. Check the console payloads.');
            return;
        }

        const breakdown = extractRatingBreakdown(successful, best);
        console.log('[IMDb Ratings Introspection] Extracted rating breakdown:', breakdown);

        renderPanelState(`
            <div><strong>Rating:</strong> ${formatRatingValue(best.aggregateRating)}</div>
            <div><strong>Votes:</strong> ${formatVoteCount(best.voteCount)}</div>
            <div><strong>Field:</strong> <code>${best.sourceField}</code></div>
            <div><strong>Rating path:</strong> <code>${best.aggregateRatingPath || 'n/a'}</code></div>
            <div><strong>Vote path:</strong> <code>${best.voteCountPath || 'n/a'}</code></div>
            ${buildBreakdownHtml(breakdown)}
        `);
    }

    run().catch((error) => {
        console.error('[IMDb Ratings Introspection] Fatal error:', error);
        renderPanelState(`Request failed: <code>${String(error.message || error)}</code>`);
    });
})();
