// ==UserScript==
// @name         iMDB title video introspection
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1.0
// @description  Introspect IMDb GraphQL schema and probe title video fields
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// @connect      imdb-video.media-imdb.com
// @connect      www.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://api.graphql.imdb.com/';
    const VIDEO_WORDS = /(video|videos|trailer|trailers|clip|preview|promo|teaser)/i;
    const URL_WORDS = /(url|uri|src|source|stream|playback|manifest|mp4|file|media)/i;
    const TITLE_WORDS = /(title|name|headline|label)/i;
    const TEXT_WORDS = /(text|title|name|headline|label|description|caption)/i;
    const MEDIA_FIELD_WORDS = /(playback|stream|encoding|rendition|caption|subtitle|audio|video|source|media|resource)/i;
    const VIDEO_MEDIA_WORDS = /(playback|stream|encoding|rendition|transcod|asset|source|manifest|url|preview|media|mp4|hls)/i;
    const DIRECT_MEDIA_URL_WORDS = /(imdb-video\.media-imdb\.com|\.mp4(?:\?|$)|\.m3u8(?:\?|$))/i;
    const DIRECT_IMDB_MEDIA_URL_WORDS = /(imdb-video\.media-imdb\.com\/vi\d+\/)/i;
    const LOG_RAW_API_RESPONSES = true;
    const SCALAR_EXCLUDE_BY_TYPE = {
        VideoConnection: new Set(['total'])
    };

    function logRawApiResponse(label, payload) {
        if (!LOG_RAW_API_RESPONSES) {
            return;
        }

        try {
            const clone = JSON.parse(JSON.stringify(payload));
            console.log(label, clone);
        } catch {
            console.log(label, payload);
        }
    }

    function getNestedTypeInfo(depth = 6) {
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
                        const data = JSON.parse(response.responseText);

                        if (response.status >= 200 && response.status < 300) {
                            resolve(data);
                            return;
                        }

                        if (data && (data.errors || data.data)) {
                            resolve(data);
                            return;
                        }

                        reject(new Error(`HTTP ${response.status}: ${response.responseText}`));
                        return;
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: (response) => {
                    reject(new Error(`Request error: ${response.statusText || 'unknown error'}`));
                }
            });
        });
    }

    function textRequest(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: (response) => {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(`HTTP ${response.status}: ${url}`));
                        return;
                    }
                    resolve(response.responseText || '');
                },
                onerror: () => {
                    reject(new Error(`Request error: ${url}`));
                }
            });
        });
    }

    function headRequest(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url,
                onload: (response) => {
                    if (response.status < 200 || response.status >= 400) {
                        reject(new Error(`HTTP ${response.status}: ${url}`));
                        return;
                    }
                    resolve(response.responseHeaders || '');
                },
                onerror: () => {
                    reject(new Error(`HEAD request error: ${url}`));
                }
            });
        });
    }

    function getImdbIdFromPage() {
        const imdbLinkElement = document.getElementById('imdb-title-link');
        if (!imdbLinkElement || !imdbLinkElement.href) {
            return null;
        }

        const match = imdbLinkElement.href.match(/title\/(tt\d+)\//);
        return match ? match[1] : null;
    }

    function getVideoIdFromUrl(url) {
        const match = url.match(/\/((vi\d+))\//);
        return match ? match[1] : null;
    }

    function normalizeUrl(url) {
        try {
            const parsed = new URL(url);
            return `${parsed.origin}${parsed.pathname}`;
        } catch {
            return url;
        }
    }

    function classifyMediaUrl(url) {
        const normalized = normalizeUrl(url).toLowerCase();
        if (normalized.endsWith('.m3u8')) {
            if (normalized.includes('master.m3u8')) {
                return 'hls-master';
            }
            if (normalized.includes('preview')) {
                return 'hls-preview';
            }
            return 'hls';
        }
        if (normalized.endsWith('.mp4')) {
            return 'mp4';
        }
        return 'other';
    }

    function parseHeaderValue(headers, headerName) {
        const lower = headerName.toLowerCase();
        const lines = (headers || '').split(/\r?\n/);
        for (const line of lines) {
            const index = line.indexOf(':');
            if (index === -1) {
                continue;
            }
            const name = line.slice(0, index).trim().toLowerCase();
            if (name === lower) {
                return line.slice(index + 1).trim();
            }
        }
        return '';
    }

    function parseMasterPlaylist(masterText, masterUrl) {
        const lines = (masterText || '').split(/\r?\n/);
        const variants = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('#EXT-X-STREAM-INF')) {
                continue;
            }

            const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/i);
            const width = resolutionMatch ? Number.parseInt(resolutionMatch[1], 10) : 0;
            const height = resolutionMatch ? Number.parseInt(resolutionMatch[2], 10) : 0;
            const bandwidth = bandwidthMatch ? Number.parseInt(bandwidthMatch[1], 10) : 0;

            let nextUrl = '';
            for (let j = i + 1; j < lines.length; j++) {
                const candidate = lines[j].trim();
                if (!candidate || candidate.startsWith('#')) {
                    continue;
                }
                nextUrl = new URL(candidate, masterUrl).toString();
                break;
            }

            if (nextUrl) {
                variants.push({
                    url: nextUrl,
                    width,
                    height,
                    bandwidth,
                    pixels: width * height
                });
            }
        }

        return variants;
    }

    async function getBestHlsVariant(masterUrl) {
        try {
            const masterText = await textRequest(masterUrl);
            const variants = parseMasterPlaylist(masterText, masterUrl);
            if (variants.length === 0) {
                return null;
            }

            variants.sort((a, b) => {
                if (b.pixels !== a.pixels) {
                    return b.pixels - a.pixels;
                }
                return b.bandwidth - a.bandwidth;
            });

            return variants[0];
        } catch {
            return null;
        }
    }

    async function getMp4ContentLength(url) {
        try {
            const headers = await headRequest(url);
            const contentLength = parseHeaderValue(headers, 'Content-Length');
            const length = Number.parseInt(contentLength, 10);
            if (Number.isFinite(length) && length > 0) {
                return length;
            }
            return 0;
        } catch {
            return 0;
        }
    }

    async function buildBestLinkSummaryByVideo(directUrls, videoTitleById = new Map()) {
        const perVideo = new Map();

        for (const url of directUrls) {
            if (!DIRECT_IMDB_MEDIA_URL_WORDS.test(url)) {
                continue;
            }

            const videoId = getVideoIdFromUrl(url);
            if (!videoId) {
                continue;
            }

            const classification = classifyMediaUrl(url);
            if (!perVideo.has(videoId)) {
                perVideo.set(videoId, {
                    videoId,
                    hlsMasters: new Map(),
                    hlsPreviews: new Map(),
                    hlsOthers: new Map(),
                    mp4s: new Map()
                });
            }

            const bucket = perVideo.get(videoId);
            const normalized = normalizeUrl(url);
            if (classification === 'hls-master') {
                if (!bucket.hlsMasters.has(normalized)) {
                    bucket.hlsMasters.set(normalized, url);
                }
            } else if (classification === 'hls-preview') {
                if (!bucket.hlsPreviews.has(normalized)) {
                    bucket.hlsPreviews.set(normalized, url);
                }
            } else if (classification === 'hls') {
                if (!bucket.hlsOthers.has(normalized)) {
                    bucket.hlsOthers.set(normalized, url);
                }
            } else if (classification === 'mp4') {
                if (!bucket.mp4s.has(normalized)) {
                    bucket.mp4s.set(normalized, url);
                }
            }
        }

        const summary = [];
        for (const [, bucket] of perVideo) {
            let bestHls = null;
            for (const masterUrl of bucket.hlsMasters.values()) {
                const candidate = await getBestHlsVariant(masterUrl);
                if (!candidate) {
                    continue;
                }

                if (!bestHls || candidate.pixels > bestHls.pixels || (candidate.pixels === bestHls.pixels && candidate.bandwidth > bestHls.bandwidth)) {
                    bestHls = {
                        masterUrl,
                        variantUrl: candidate.url,
                        width: candidate.width,
                        height: candidate.height,
                        bandwidth: candidate.bandwidth,
                        pixels: candidate.pixels
                    };
                }
            }

            let bestMp4 = null;
            for (const mp4Url of bucket.mp4s.values()) {
                const contentLength = await getMp4ContentLength(mp4Url);
                if (!bestMp4 || contentLength > bestMp4.contentLength) {
                    bestMp4 = {
                        url: mp4Url,
                        contentLength
                    };
                }
            }

            summary.push({
                videoId: bucket.videoId,
                videoTitle: videoTitleById.get(bucket.videoId) || '',
                bestHls,
                bestMp4,
                bestOverall: bestHls
                    ? bestHls.variantUrl
                    : (bestMp4
                        ? bestMp4.url
                        : (bucket.hlsOthers.values().next().value || bucket.hlsPreviews.values().next().value || null))
            });
        }

        summary.sort((a, b) => a.videoId.localeCompare(b.videoId));
        return summary;
    }

    function unwrapNamedType(typeNode) {
        let cursor = typeNode;
        while (cursor && cursor.ofType) {
            cursor = cursor.ofType;
        }
        return cursor || { name: null, kind: null };
    }

    function hasRequiredArgs(field) {
        const args = field.args || [];
        return args.some(arg => {
            let t = arg.type;
            while (t && t.ofType) {
                if (t.kind === 'NON_NULL') {
                    return true;
                }
                t = t.ofType;
            }
            return t && t.kind === 'NON_NULL';
        });
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

    async function introspectQueryFields() {
        const query = `
            query QueryIntrospection {
                __type(name: "Query") {
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
            throw new Error(`Query introspection failed: ${JSON.stringify(payload.errors)}`);
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

    function pickScalarFields(typeInfo, maxFields = 8) {
        const fields = typeInfo?.fields || [];
        const picked = [];
        const excluded = SCALAR_EXCLUDE_BY_TYPE[typeInfo?.name] || new Set();

        for (const field of fields) {
            if ((field.args || []).length > 0) {
                continue;
            }

            if (hasRequiredArgs(field)) {
                continue;
            }

            if (excluded.has(field.name)) {
                continue;
            }

            const named = unwrapNamedType(field.type);
            if (named.kind === 'SCALAR' || named.kind === 'ENUM') {
                picked.push(field.name);
            }

            if (picked.length >= maxFields) {
                break;
            }
        }

        return picked;
    }

    function buildConnectionSelection() {
        return '__typename edges { __typename node { __typename id } }';
    }

    function isScalarOrEnum(fieldType) {
        return fieldType.kind === 'SCALAR' || fieldType.kind === 'ENUM';
    }

    function buildSafeFieldArgumentClause(field) {
        const args = field.args || [];
        if (args.length === 0) {
            return '';
        }

        return null;
    }

    function getSafeVideoFieldArgumentClause(field) {
        const args = field.args || [];
        if (args.length === 0) {
            return '';
        }

        const lowerNames = args.map(arg => (arg.name || '').toLowerCase());
        const hasFirst = lowerNames.includes('first');
        const hasLast = lowerNames.includes('last');

        const requiredArgs = args.filter(arg => arg.type?.kind === 'NON_NULL').map(arg => (arg.name || '').toLowerCase());
        const disallowedRequired = requiredArgs.filter(name => name !== 'first' && name !== 'last');
        if (disallowedRequired.length > 0) {
            return null;
        }

        if (hasFirst) {
            return '(first: 20)';
        }
        if (hasLast) {
            return '(last: 20)';
        }

        if (requiredArgs.length > 0) {
            return null;
        }

        return '';
    }

    function getVideoMediaScalarFieldsForType(typeInfo) {
        if (!typeInfo?.fields) {
            return [];
        }

        const names = [];
        for (const field of typeInfo.fields) {
            if ((field.args || []).length > 0) {
                continue;
            }

            const named = unwrapNamedType(field.type);
            if (named.kind !== 'SCALAR' && named.kind !== 'ENUM') {
                continue;
            }

            if (
                field.name === 'id' ||
                field.name === 'mimeType' ||
                field.name === 'width' ||
                field.name === 'height' ||
                field.name === 'bitrate' ||
                field.name === 'value' ||
                field.name === 'url' ||
                URL_WORDS.test(field.name) ||
                VIDEO_MEDIA_WORDS.test(field.name)
            ) {
                names.push(field.name);
            }
        }

        return Array.from(new Set(names)).slice(0, 20);
    }

    async function buildVideoMediaFieldSelection(field, depth = 1) {
        const argClause = getSafeVideoFieldArgumentClause(field);
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

        const childTypeInfo = await introspectType(named.name);
        const scalarFields = getVideoMediaScalarFieldsForType(childTypeInfo);
        const pieces = ['__typename', ...scalarFields];

        if (depth > 0 && childTypeInfo?.fields) {
            for (const childField of childTypeInfo.fields) {
                const childNamed = unwrapNamedType(childField.type);
                if (!childNamed.name || childNamed.kind === 'SCALAR' || childNamed.kind === 'ENUM') {
                    continue;
                }

                if (!VIDEO_MEDIA_WORDS.test(childField.name) && !VIDEO_MEDIA_WORDS.test(childNamed.name)) {
                    continue;
                }

                const childArgClause = getSafeVideoFieldArgumentClause(childField);
                if (childArgClause === null) {
                    continue;
                }

                const grandTypeInfo = await introspectType(childNamed.name);
                const grandScalars = getVideoMediaScalarFieldsForType(grandTypeInfo);
                const grandPieces = ['__typename', ...grandScalars];
                pieces.push(`${childField.name}${childArgClause} { ${grandPieces.join(' ')} }`);
            }
        }

        return `${field.name}${argClause} { ${pieces.join(' ')} }`;
    }

    async function enrichDirectUrlsFromVideoApiFields(videoIds, directUrls) {
        const videoTypeInfo = await introspectType('Video');
        const videoFields = videoTypeInfo?.fields || [];

        const candidateFields = videoFields.filter(field => {
            const named = unwrapNamedType(field.type);
            return VIDEO_MEDIA_WORDS.test(field.name) || VIDEO_MEDIA_WORDS.test(named.name || '');
        });

        for (const videoId of videoIds) {
            for (const field of candidateFields) {
                try {
                    const fieldSelection = await buildVideoMediaFieldSelection(field, 1);
                    if (!fieldSelection) {
                        continue;
                    }

                    const query = `
                        query VideoMediaField($id: ID!) {
                            video(id: $id) {
                                id
                                ${fieldSelection}
                            }
                        }
                    `;

                    const payload = await imdbRequest(query, { id: videoId });
                    if (payload?.errors?.length) {
                        continue;
                    }

                    extractDirectMediaUrls(payload?.data?.video, directUrls);
                } catch {
                    continue;
                }
            }
        }
    }

    function shouldTraverseType(typeName) {
        if (!typeName) {
            return false;
        }

        const lower = typeName.toLowerCase();
        if (lower === 'title' || lower === 'name') {
            return false;
        }

        return (
            lower.includes('video') ||
            lower.includes('playback') ||
            lower.includes('stream') ||
            lower.includes('encoding') ||
            lower.includes('rendition') ||
            lower.includes('caption') ||
            lower.includes('subtitle') ||
            lower.includes('audio') ||
            lower.includes('resource') ||
            lower.includes('source') ||
            lower.includes('name') ||
            lower.includes('description') ||
            lower.includes('display') ||
            lower.includes('text') ||
            lower.includes('titletext') ||
            lower.includes('translatabletext')
        );
    }

    async function buildTypeSelection(typeName, depth = 2, visited = new Set()) {
        if (!typeName || visited.has(typeName) || depth < 0) {
            return '__typename';
        }

        visited.add(typeName);

        const typeInfo = await introspectType(typeName);
        if (!typeInfo || !typeInfo.fields) {
            return '__typename';
        }

        const scalars = [];
        const objects = [];
        const includeAllScalarsForType = /(text|name|description|display|label)/i.test(typeInfo.name || '');
        const alwaysUsefulScalarNames = new Set([
            'id',
            'text',
            'plainText',
            'displayName',
            'value',
            'title',
            'name',
            'description',
            'canonicalUrl'
        ]);

        for (const field of typeInfo.fields) {
            const argumentClause = buildSafeFieldArgumentClause(field);
            if (argumentClause === null) {
                continue;
            }

            const named = unwrapNamedType(field.type);
            if (!named.name) {
                continue;
            }

            if (isScalarOrEnum(named)) {
                if ((field.args || []).length > 0) {
                    continue;
                }
                if (
                    includeAllScalarsForType ||
                    alwaysUsefulScalarNames.has(field.name) ||
                    URL_WORDS.test(field.name) ||
                    TITLE_WORDS.test(field.name) ||
                    TEXT_WORDS.test(field.name) ||
                    field.name === 'mimeType'
                ) {
                    scalars.push(field.name);
                }
                continue;
            }

            if (depth === 0) {
                continue;
            }

            if (
                shouldTraverseType(named.name) ||
                MEDIA_FIELD_WORDS.test(field.name) ||
                TITLE_WORDS.test(field.name) ||
                TEXT_WORDS.test(field.name)
            ) {
                const subSelection = await buildTypeSelection(named.name, depth - 1, new Set(visited));
                objects.push(`${field.name}${argumentClause} { ${subSelection} }`);
            }
        }

        const scalarPart = Array.from(new Set(['__typename', ...scalars.slice(0, 20)])).join(' ');
        const objectPart = objects.slice(0, 20).join(' ');
        if (!objectPart) {
            return scalarPart;
        }
        return scalarPart + ' ' + objectPart;
    }

    function extractDirectMediaUrls(value, out = new Set()) {
        if (value == null) {
            return out;
        }

        if (typeof value === 'string') {
            if (DIRECT_MEDIA_URL_WORDS.test(value)) {
                out.add(value);
            }
            return out;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                extractDirectMediaUrls(item, out);
            }
            return out;
        }

        if (typeof value === 'object') {
            for (const key of Object.keys(value)) {
                extractDirectMediaUrls(value[key], out);
            }
            return out;
        }

        return out;
    }

    function pickBestVideoTitle(videoPayload) {
        if (!videoPayload || typeof videoPayload !== 'object') {
            return '';
        }

        if (typeof videoPayload?.name?.value === 'string' && videoPayload.name.value.trim()) {
            return videoPayload.name.value.trim();
        }

        if (typeof videoPayload?.title?.value === 'string' && videoPayload.title.value.trim()) {
            return videoPayload.title.value.trim();
        }

        if (typeof videoPayload?.headline?.value === 'string' && videoPayload.headline.value.trim()) {
            return videoPayload.headline.value.trim();
        }

        if (typeof videoPayload?.displayName?.value === 'string' && videoPayload.displayName.value.trim()) {
            return videoPayload.displayName.value.trim();
        }

        const preferredFields = [
            videoPayload.title,
            videoPayload.name,
            videoPayload.primaryTitle,
            videoPayload.videoTitle,
            videoPayload.titleText,
            videoPayload.nameText,
            videoPayload.primaryTitleText,
            videoPayload.displayTitle,
            videoPayload.headline
        ];

        for (const value of preferredFields) {
            if (typeof value === 'string' && value.trim() && value.trim() !== 'Video') {
                return value.trim();
            }
            if (value && typeof value === 'object') {
                const asText = value.value || value.text || value.plainText || value.primaryText;
                if (typeof asText === 'string' && asText.trim() && asText.trim() !== 'Video') {
                    return asText.trim();
                }
            }
        }

        const scored = [];
        const seen = new Set();

        function walk(value, path = []) {
            if (value == null) {
                return;
            }

            if (typeof value === 'string') {
                const text = value.trim();
                if (!text || seen.has(text)) {
                    return;
                }
                if (/^https?:\/\//i.test(text) || text.includes('imdb-video.media-imdb.com')) {
                    return;
                }
                if (text.length < 3 || text.length > 220) {
                    return;
                }

                const pathString = path.join('.').toLowerCase();
                let score = 0;
                if (pathString.includes('title')) score += 80;
                if (pathString.includes('name')) score += 60;
                if (pathString.includes('headline')) score += 55;
                if (pathString.includes('primarytext')) score += 70;
                if (pathString.endsWith('text')) score += 50;
                if (pathString.includes('description')) score += 25;
                if (pathString.includes('primarytitle')) score -= 140;
                if (pathString.includes('titletext')) score -= 40;
                if (pathString.includes('caption') || pathString.includes('subtitle') || pathString.includes('language')) score -= 35;
                if (!TEXT_WORDS.test(pathString)) score -= 15;

                seen.add(text);
                scored.push({ text, score, path: pathString });
                return;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    walk(item, path);
                }
                return;
            }

            if (typeof value === 'object') {
                for (const [key, val] of Object.entries(value)) {
                    if (key === '__typename') {
                        continue;
                    }
                    walk(val, path.concat(key));
                }
            }
        }

        walk(videoPayload, []);
        scored.sort((a, b) => b.score - a.score);
        if (scored.length > 0 && scored[0].score >= 0) {
            return scored[0].text;
        }

        return '';
    }

    function findVideoRootFieldCandidates(queryFields) {
        const candidates = queryFields.filter(field => {
            const named = unwrapNamedType(field.type);
            if (!named.name || !named.name.toLowerCase().includes('video')) {
                return false;
            }

            const args = field.args || [];
            const hasIdLikeArg = args.some(arg => /(id|videoid)/i.test(arg.name || ''));
            return VIDEO_WORDS.test(field.name) || hasIdLikeArg;
        }).map(field => {
            const named = unwrapNamedType(field.type);
            const args = field.args || [];
            const hasIdArg = args.some(arg => /^id$/i.test(arg.name || ''));
            const hasVideoIdArg = args.some(arg => /videoid/i.test(arg.name || ''));

            let score = 0;
            if (field.name.toLowerCase() === 'video') score += 100;
            if (named.name === 'Video') score += 80;
            if (hasIdArg) score += 50;
            if (hasVideoIdArg) score += 40;
            if (VIDEO_WORDS.test(field.name)) score += 20;

            return { field, score, returnType: named.name, argNames: args.map(a => a.name) };
        });

        candidates.sort((a, b) => b.score - a.score);
        return candidates;
    }

    function graphQLTypeToString(typeNode) {
        if (!typeNode) {
            return 'String';
        }
        if (typeNode.kind === 'NON_NULL') {
            return `${graphQLTypeToString(typeNode.ofType)}!`;
        }
        if (typeNode.kind === 'LIST') {
            return `[${graphQLTypeToString(typeNode.ofType)}]`;
        }
        return typeNode.name || 'String';
    }

    function getBestArgForField(field, preferredNames = []) {
        const args = field.args || [];
        if (args.length === 0) {
            return null;
        }

        for (const preferredName of preferredNames) {
            const match = args.find(arg => (arg.name || '').toLowerCase() === preferredName.toLowerCase());
            if (match) {
                return match;
            }
        }

        return args[0] || null;
    }

    async function fetchVideoByFieldArg(field, argName, argValue, videoSelection) {
        const arg = getBestArgForField(field, [argName]);
        if (!arg) {
            return { data: null, errors: [{ message: `No usable arg found for ${field.name}` }] };
        }

        const variableType = graphQLTypeToString(arg.type);
        const query = `
            query VideoByDynamicArg($value: ${variableType}) {
                ${field.name}(${arg.name}: $value) {
                    ${videoSelection}
                }
            }
        `;

        const payload = await imdbRequest(query, { value: argValue });
        return {
            data: payload.data?.[field.name] ?? null,
            errors: payload.errors || []
        };
    }

    async function fetchVideosByFieldArg(field, argName, argValue, videoSelection) {
        const arg = getBestArgForField(field, [argName]);
        if (!arg) {
            return { data: [], errors: [{ message: `No usable arg found for ${field.name}` }] };
        }

        const variableType = graphQLTypeToString(arg.type);
        const query = `
            query VideosByDynamicArg($value: ${variableType}) {
                ${field.name}(${arg.name}: $value) {
                    ${videoSelection}
                }
            }
        `;

        const payload = await imdbRequest(query, { value: argValue });
        const raw = payload.data?.[field.name];
        let list = [];
        if (Array.isArray(raw)) {
            list = raw;
        } else if (raw) {
            list = [raw];
        }

        return {
            data: list,
            errors: payload.errors || []
        };
    }

    async function fetchLatestTrailerRich(imdbId, videoSelection) {
        const query = `
            query LatestTrailerRich($id: ID!) {
                title(id: $id) {
                    id
                    latestTrailer {
                        ${videoSelection}
                    }
                }
            }
        `;

        const payload = await imdbRequest(query, { id: imdbId });
        return {
            data: payload.data?.title?.latestTrailer ?? null,
            errors: payload.errors || []
        };
    }

    async function fetchVideoById(videoRootFieldName, videoId, videoSelection) {
        const query = `
            query VideoById($id: ID!) {
                ${videoRootFieldName}(id: $id) {
                    ${videoSelection}
                }
            }
        `;

        const payload = await imdbRequest(query, { id: videoId });
        return {
            data: payload.data?.[videoRootFieldName] ?? null,
            errors: payload.errors || []
        };
    }

    async function probeCandidateTitleField(imdbId, field) {
        const named = unwrapNamedType(field.type);
        const typeName = named.name;

        if (!typeName) {
            return { field: field.name, ok: false, reason: 'No named type resolved' };
        }

        if (hasRequiredArgs(field)) {
            return { field: field.name, ok: false, reason: 'Field has required args' };
        }

        let selection = '__typename';
        if (named.kind === 'SCALAR' || named.kind === 'ENUM') {
            selection = '';
        } else if (typeName === 'VideoConnection') {
            selection = buildConnectionSelection();
        } else {
            const typeInfo = await introspectType(typeName);
            const scalarFields = pickScalarFields(typeInfo, 10);
            if (scalarFields.length > 0) {
                selection = ['__typename', ...scalarFields].join(' ');
            }
        }

        const fieldQuery = selection
            ? `${field.name} { ${selection} }`
            : field.name;

        const query = `
            query ProbeTitleField($id: ID!) {
                title(id: $id) {
                    id
                    ${fieldQuery}
                }
            }
        `;

        const payload = await imdbRequest(query, { id: imdbId });
        if (payload.errors) {
            return {
                field: field.name,
                ok: false,
                reason: payload.errors.map(e => e.message).join(' | ')
            };
        }

        return {
            field: field.name,
            ok: true,
            data: payload.data?.title?.[field.name] ?? null
        };
    }

    async function run() {
        const imdbId = getImdbIdFromPage();
        if (!imdbId) {
            console.warn('[IMDb Video Introspection] IMDb ID not found on page.');
            return;
        }

        console.log(`[IMDb Video Introspection] Starting for ${imdbId}`);

        const titleFields = await introspectTitleFields();
        const candidates = titleFields.filter(field => {
            const named = unwrapNamedType(field.type);
            return VIDEO_WORDS.test(field.name) || VIDEO_WORDS.test(named.name || '');
        });

        console.log('[IMDb Video Introspection] Candidate Title fields:', candidates.map(c => ({
            name: c.name,
            type: unwrapNamedType(c.type),
            argCount: (c.args || []).length
        })));

        if (candidates.length === 0) {
            console.warn('[IMDb Video Introspection] No video-like fields found on Title.');
            return;
        }

        const probes = [];
        for (const field of candidates.slice(0, 12)) {
            try {
                const result = await probeCandidateTitleField(imdbId, field);
                probes.push(result);
            } catch (err) {
                probes.push({ field: field.name, ok: false, reason: String(err) });
            }
        }

        console.log('[IMDb Video Introspection] Probe results:', probes);

        const successful = probes.filter(p => p.ok && p.data);
        if (successful.length > 0) {
            console.log('[IMDb Video Introspection] Fields with data:', successful);

            const videoIds = new Set();
            const webviewUrls = new Set();

            for (const item of successful) {
                if (item.field === 'latestTrailer' && item.data?.id) {
                    videoIds.add(item.data.id);
                }

                if (item.field === 'latestTrailerWebviewPlayer' && item.data?.webviewUrl) {
                    webviewUrls.add(item.data.webviewUrl);
                }

                if ((item.field === 'primaryVideos' || item.field === 'videoStrip') && item.data?.edges) {
                    for (const edge of item.data.edges) {
                        const id = edge?.node?.id;
                        if (id) {
                            videoIds.add(id);
                        }
                    }
                }
            }

            console.log('[IMDb Video Introspection] Discovered IMDb video IDs:', Array.from(videoIds));
            console.log('[IMDb Video Introspection] Discovered webview URLs:', Array.from(webviewUrls));

            const directUrls = new Set();
            const videoTitleById = new Map();
            for (const webviewUrl of webviewUrls) {
                directUrls.add(webviewUrl);
            }

            const videoSelection = await buildTypeSelection('Video', 3);
            console.log('[IMDb Video Introspection] Video selection used for direct-link probing:', videoSelection);

            const latestTrailerRich = await fetchLatestTrailerRich(imdbId, videoSelection);
            logRawApiResponse('[IMDb Video Introspection] RAW latestTrailer response:', latestTrailerRich);
            if (latestTrailerRich.errors.length > 0) {
                console.warn('[IMDb Video Introspection] latestTrailer rich query errors:', latestTrailerRich.errors);
            }
            extractDirectMediaUrls(latestTrailerRich.data, directUrls);
            if (latestTrailerRich.data?.id) {
                const latestTrailerTitle = pickBestVideoTitle(latestTrailerRich.data);
                if (latestTrailerTitle) {
                    videoTitleById.set(latestTrailerRich.data.id, latestTrailerTitle);
                }
            }

            const queryFields = await introspectQueryFields();
            const videoRootCandidates = findVideoRootFieldCandidates(queryFields);
            console.log('[IMDb Video Introspection] Query video field candidates:', videoRootCandidates.map(c => ({
                name: c.field.name,
                score: c.score,
                returnType: c.returnType,
                args: c.argNames
            })));

            const videoByIdFieldCandidate = videoRootCandidates.find(c =>
                c.field.name.toLowerCase() === 'video' &&
                c.argNames.some(a => (a || '').toLowerCase() === 'id')
            ) || null;

            const videosByIdsFieldCandidate = videoRootCandidates.find(c =>
                c.field.name.toLowerCase() === 'videos' &&
                c.argNames.some(a => (a || '').toLowerCase() === 'ids')
            ) || null;

            const idsList = Array.from(videoIds);
            if (videosByIdsFieldCandidate && idsList.length > 0) {
                console.log('[IMDb Video Introspection] Using Query root field for batch fetch:', videosByIdsFieldCandidate.field.name);
                try {
                    const batchPayload = await fetchVideosByFieldArg(videosByIdsFieldCandidate.field, 'ids', idsList, videoSelection);
                    logRawApiResponse(`[IMDb Video Introspection] RAW ${videosByIdsFieldCandidate.field.name}(ids) response:`, batchPayload);
                    if (batchPayload.errors.length > 0) {
                        console.warn(`[IMDb Video Introspection] ${videosByIdsFieldCandidate.field.name}(ids) errors:`, batchPayload.errors);
                    }

                    for (const videoPayload of batchPayload.data) {
                        if (!videoPayload || !videoPayload.id) {
                            continue;
                        }
                        extractDirectMediaUrls(videoPayload, directUrls);
                        const resolvedVideoTitle = pickBestVideoTitle(videoPayload);
                        if (resolvedVideoTitle) {
                            videoTitleById.set(videoPayload.id, resolvedVideoTitle);
                        }
                    }
                } catch (err) {
                    console.warn(`[IMDb Video Introspection] ${videosByIdsFieldCandidate.field.name}(ids) request failed:`, err);
                }
            }

            if (videoByIdFieldCandidate) {
                console.log('[IMDb Video Introspection] Using Query root field for per-video fallback:', videoByIdFieldCandidate.field.name);
                for (const videoId of idsList) {
                    if (videoTitleById.has(videoId)) {
                        continue;
                    }

                    try {
                        const videoPayload = await fetchVideoByFieldArg(videoByIdFieldCandidate.field, 'id', videoId, videoSelection);
                        logRawApiResponse(`[IMDb Video Introspection] RAW ${videoByIdFieldCandidate.field.name}(${videoId}) response:`, videoPayload);
                        if (videoPayload.errors.length > 0) {
                            console.warn(`[IMDb Video Introspection] ${videoByIdFieldCandidate.field.name}(${videoId}) errors:`, videoPayload.errors);
                            continue;
                        }
                        extractDirectMediaUrls(videoPayload.data, directUrls);
                        const resolvedVideoTitle = pickBestVideoTitle(videoPayload.data);
                        if (resolvedVideoTitle) {
                            videoTitleById.set(videoId, resolvedVideoTitle);
                        }
                    } catch (err) {
                        console.warn(`[IMDb Video Introspection] ${videoByIdFieldCandidate.field.name}(${videoId}) request failed:`, err);
                    }
                }
            }

            if (!videoByIdFieldCandidate && !videosByIdsFieldCandidate) {
                console.warn('[IMDb Video Introspection] No Query root video(id: ...) field discovered.');
            }

            await enrichDirectUrlsFromVideoApiFields(idsList, directUrls);

            const directUrlList = Array.from(directUrls);
            if (directUrlList.length > 0) {
                console.log('[IMDb Video Introspection] Direct media links:', directUrlList);

                const bestByVideo = await buildBestLinkSummaryByVideo(directUrlList, videoTitleById);
                console.log('[IMDb Video Introspection] Best quality by video:', bestByVideo);
            } else {
                console.warn('[IMDb Video Introspection] No direct media links discovered in current payloads.');
            }
        } else {
            console.warn('[IMDb Video Introspection] No candidate field returned video data for this title.');
        }
    }

    run().catch(err => {
        console.error('[IMDb Video Introspection] Fatal error:', err);
    });
})();