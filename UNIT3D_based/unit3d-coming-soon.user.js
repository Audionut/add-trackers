// ==UserScript==
// @name         UNIT3D - Coming Soon
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.3
// @description  Upcoming movie and TV releases in native UNIT3D cards, with an optional homepage sidebar for today's episodes.
// @author       Audionut
// @match        https://aither.cc/*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-coming-soon.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-coming-soon.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @run-at       document-start
// @connect      caching.graphql.imdb.com
// @connect      www.dvdsreleasedates.com
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  const isUpcomingPage =
    location.pathname === '/torrents' &&
    new URLSearchParams(location.search).get('upcoming') === '1';
  const initialStyle = isUpcomingPage ? document.createElement('style') : null;
  const initialLoading = isUpcomingPage ? document.createElement('div') : null;
  if (initialStyle) {
    initialStyle.textContent = `
      main { visibility: hidden !important; }
      #unit3d-upcoming-loading {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 1000; display: flex; align-items: center; gap: 12px;
        box-sizing: border-box; max-width: calc(100vw - 32px); padding: 18px 24px;
        border-radius: 8px; background: var(--panel-bg, #222); color: var(--panel-fg, #eee);
        font: 14px/1.5 system-ui, sans-serif;
      }
      #unit3d-upcoming-loading::before {
        content: ''; width: 20px; height: 20px; flex-shrink: 0;
        border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%;
        animation: unit3d-upcoming-loading-spin 0.8s linear infinite;
      }
      @keyframes unit3d-upcoming-loading-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        #unit3d-upcoming-loading::before { animation: none; }
      }
    `;
    (document.head || document.documentElement).append(initialStyle);
    initialLoading.id = 'unit3d-upcoming-loading';
    initialLoading.setAttribute('role', 'status');
    initialLoading.setAttribute('aria-live', 'polite');
    initialLoading.textContent = 'Loading upcoming releases…';
    document.documentElement.append(initialLoading);
  }

  const ROOT_ID = 'unit3d-upcoming';
  const CACHE_KEY = 'unit3d-upcoming-cache-v5';
  const SETTINGS_KEY = 'unit3d-upcoming-settings';
  const HIDDEN_SERIES_KEY = 'unit3d-upcoming-hidden-series';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const releaseRequests = new Map();
  const CARD_PAGE_SIZE = 24;
  const API_KEY_STORAGE = `unit3d-upcoming-api-key:${location.origin}`;
  const TORRENT_CACHE_KEY = `unit3d-upcoming-torrents-v1:${location.origin}`;
  const TORRENT_REQUEST_KEY = `unit3d-upcoming-last-api-request:${location.origin}`;
  const TORRENT_CACHE_TTL = 2 * 60 * 1000;
  const TORRENT_HISTORY_TTL = 14 * 24 * 60 * 60 * 1000;
  const TORRENT_REQUEST_INTERVAL = 2 * 1000;
  const ARR_SETTINGS_KEY = 'unit3d-upcoming-arr-servers-v1';
  const ARR_CACHE_PREFIX = 'unit3d-upcoming-arr-cache-v1:';
  const ARR_LIBRARY_TTL = 10 * 60 * 1000;
  const ARR_OPTIONS_TTL = 24 * 60 * 60 * 1000;
  const arrRequests = new Map();
  const arrAdds = new Map();
  const ARR_MONITORS = {
    future: 'Future episodes',
    all: 'All episodes',
    missing: 'Missing episodes',
    existing: 'Existing episodes',
    firstSeason: 'First season',
    lastSeason: 'Last season',
    pilot: 'Pilot',
    recent: 'Recent episodes',
    monitorSpecials: 'Specials',
    unmonitorSpecials: 'All except specials',
    none: 'None'
  };
  // UNIT3D's standard category IDs (also used by Aither).
  const TORRENT_CATEGORIES = { movies: [1], tv: [2], all: [1, 2] };
  const HOME_PANEL_ID = 'unit3d-upcoming-today';
  const HOME_RESOLUTIONS = ['720p', '1080p', '2160p'];
  const DVD_ORIGIN = 'https://www.dvdsreleasedates.com';
  const RELEASE_VIEWS = {
    theatrical: { label: 'Theatrical', modes: ['theatrical'] },
    digital: { label: 'Digital (US)', modes: ['digital'] },
    movies: { label: 'Theatrical + digital (US)', modes: ['theatrical', 'digital'] },
    tv: { label: 'TV', modes: ['tv'] },
    episodes: { label: 'Episodes (next 30 days)', modes: ['episodes'] },
    all: { label: 'Everything (US)', modes: ['theatrical', 'digital', 'tv'] }
  };
  const COUNTRIES = (
    'AF AL AS AI AR AM AU AT BD BB BY BE BJ BM BR KH CM CA CF CL CN CC CO CR HR CU CW CY CZ ' +
    'DK DM DO EC EG GQ EE FI FR GF GA GM GE DE GH GR GN GW HK HU IS IN ID IR IE IL IT JP ' +
    'KZ KW LV LB LR LY LT LU MO MY MV MH MX ME MM NP NL NZ NI NG NO PK PY PE PH PL PT ' +
    'PR QA RO RU SA RS SG SK SI ZA KR ES LK SE CH TW TH TR UA AE GB US UY VE VN'
  ).split(' ');
  const IMDB_LANGUAGES = {
    'en-US': 'English',
    'fr-CA': 'Français (Canada)',
    'fr-FR': 'Français (France)',
    'de-DE': 'Deutsch',
    'hi-IN': 'हिन्दी',
    'it-IT': 'Italiano',
    'pt-BR': 'Português (Brasil)',
    'es-MX': 'Español (México)',
    'es-ES': 'Español (España)'
  };

  const TITLE_FIELDS = `
    id
    titleText { text }
    primaryImage { url }
    plot { plotText { plainText } }
    genres { genres { text } }
    principalCredits {
      category { id }
      credits { name { id nameText { text } } }
    }
    ratingsSummary { aggregateRating voteCount }
  `;
  const RELEASE_FIELDS = `
    edges { node { year month day country { id } isWideRelease attributes { id text } } }
    pageInfo { endCursor hasNextPage }
  `;
  const COMING_SOON_QUERY = `
    query Unit3dUpcoming($type: ComingSoonType!, $after: ID, $region: String!, $countries: [ID!]!, $from: Date!, $to: Date!, $includeSeries: Boolean! = false) {
      comingSoon(
        comingSoonType: $type, first: 100, after: $after, regionOverride: $region,
        disablePopularityFilter: true, releasingOnOrAfter: $from, releasingOnOrBefore: $to,
        sort: [{ sortBy: RELEASE_DATE, sortOrder: ASC }]
      ) {
        edges { node {
          ${TITLE_FIELDS}
          series @include(if: $includeSeries) {
            displayableEpisodeNumber { displayableSeason { season } episodeNumber { episodeNumber } }
            series { id titleText { text } primaryImage { url } }
          }
          releaseDates(first: 100, filter: { countries: $countries }) { ${RELEASE_FIELDS} }
        } }
        pageInfo { endCursor hasNextPage }
      }
    }
  `;
  const RELEASE_DATES_QUERY = `
    query Unit3dUpcomingReleaseDates($id: ID!, $after: ID, $countries: [ID!]!) {
      title(id: $id) {
        releaseDates(first: 100, after: $after, filter: { countries: $countries }) { ${RELEASE_FIELDS} }
      }
    }
  `;
  const TITLES_QUERY = `
    query Unit3dUpcomingTitles($ids: [ID!]!) { titles(ids: $ids) { ${TITLE_FIELDS} } }
  `;

  function requestText(url, { method = 'GET', headers = {}, data, anonymous, redirect } = {}) {
    let request;
    let deadline;
    return new Promise((resolve, reject) => {
      // Tampermonkey's fetch mode can ignore its native timeout on Chromium.
      if (anonymous || redirect)
        deadline = setTimeout(() => {
          reject(new Error('Request timed out.'));
          request?.abort();
        }, 30000);
      request = GM_xmlhttpRequest({
        url,
        method,
        headers,
        data,
        ...(anonymous ? { anonymous } : {}),
        ...(redirect ? { redirect } : {}),
        timeout: 30000,
        onerror: () =>
          reject(
            new Error('Request failed. Check your connection and userscript host permissions.')
          ),
        ontimeout: () => reject(new Error('Request timed out.')),
        onabort: () => reject(new Error('Request was cancelled.')),
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(
              Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
            );
          } else if (new Blob([response.responseText || '']).size > 32 * 1024 * 1024) {
            reject(new Error('Response exceeds 32 MiB.'));
          } else {
            resolve(response.responseText);
          }
        }
      });
    }).finally(() => clearTimeout(deadline));
  }

  async function sha256(value) {
    return [
      ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
    ]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Use the same persisted-query GET / registration POST as unit3d-imdb-combined.
  async function imdbGraphqlRequest(query, variables = {}, country = 'US', language = 'en-US') {
    const endpoint = 'https://caching.graphql.imdb.com/';
    const operationName = query.match(/\bquery\s+([_A-Za-z][_0-9A-Za-z]*)\s*(?:\(|\{)/)?.[1];
    if (!operationName) throw new Error('IMDb GraphQL query requires a named operation');
    const hash = await sha256(query);
    const extensions = { persistedQuery: { sha256Hash: hash, version: 1 } };
    const headers = {
      Accept: 'application/graphql+json, application/json',
      'Content-Type': 'application/json',
      Origin: 'https://www.imdb.com',
      'X-Imdb-Client-Name': 'imdb-web-next-localized',
      // Resolves regional AKA titles; GraphQL region/country filters control release dates.
      'X-Imdb-User-Country': country,
      'X-Imdb-User-Language': language
    };
    const params = new URLSearchParams({
      extensions: JSON.stringify(extensions),
      operationName,
      variables: JSON.stringify(variables)
    });
    let response = JSON.parse(await requestText(`${endpoint}?${params}`, { headers }));
    if (
      response.errors?.some(
        (error) =>
          error.extensions?.code === 'PERSISTED_QUERY_NOT_FOUND' ||
          error.message === 'PersistedQueryNotFound'
      )
    ) {
      response = JSON.parse(
        await requestText(endpoint, {
          method: 'POST',
          headers,
          data: JSON.stringify({ extensions, operationName, query, variables })
        })
      );
    }
    if (response.errors?.length) {
      throw new Error(`IMDb: ${response.errors.map((error) => error.message).join('; ')}`);
    }
    if (!response.data) throw new Error('IMDb returned no release data.');
    return response.data;
  }

  function dateValue({ year, month, day } = {}) {
    if (![year, month, day].every(Number.isInteger)) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
      return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function monthRange(month) {
    const year = month.getFullYear();
    const number = month.getMonth() + 1;
    return {
      from: dateValue({ year, month: number, day: 1 }),
      to: dateValue({ year, month: number, day: new Date(year, number, 0).getDate() })
    };
  }

  function shiftMonth(month, offset) {
    const [year, number] = month.split('-').map(Number);
    return monthRange(new Date(year, number - 1 + offset, 1)).from.slice(0, 7);
  }

  function episodeRange(today = new Date()) {
    const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 29);
    return {
      from: dateValue({
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate()
      }),
      to: dateValue({ year: last.getFullYear(), month: last.getMonth() + 1, day: last.getDate() })
    };
  }

  function calendarMonths(selected, today = new Date()) {
    const current = monthRange(today).from.slice(0, 7);
    const first = [shiftMonth(current, -1), selected].sort()[0];
    const last = [shiftMonth(current, 6), selected].sort()[1];
    const months = [];
    for (let month = first; month <= last; month = shiftMonth(month, 1)) months.push(month);
    return months;
  }

  function releaseKind(release, television = false) {
    const attributes = (release.attributes || [])
      .map((attribute) => attribute.text || '')
      .join(' ');
    // A Digital Film Festival is not a consumer digital release.
    if (/\bfestival\b/i.test(attributes)) return null;
    if (/\b(internet|digital|streaming|vod)\b|video.on.demand/i.test(attributes))
      return television ? 'tv' : 'digital';
    if (/\b(video|dvd|blu[ -]?ray)\b/i.test(attributes)) return null;
    if (television) return 'tv';
    if (/\b(tv|television)\b/i.test(attributes)) return null;
    return release.isWideRelease ? 'theatrical' : null;
  }

  function normalizeTitle(node) {
    const credits = (category) =>
      (node.principalCredits || [])
        .filter((credit) => category.test(credit.category?.id || ''))
        .flatMap((credit) => credit.credits || [])
        .map((credit) => ({ id: credit.name?.id, name: credit.name?.nameText?.text }))
        .filter((credit) => credit.name);
    const series = node.series?.series;
    const numbering = node.series?.displayableEpisodeNumber;
    const season = numbering?.displayableSeason?.season;
    const episode = numbering?.episodeNumber?.episodeNumber;
    const number = `${season ? `S${season}` : ''}${episode ? `E${episode}` : ''}`;
    return {
      imdbId: node.id,
      title: [series?.titleText?.text, number, node.titleText?.text || node.id]
        .filter(Boolean)
        .join(' — '),
      seriesImdbId: /^tt\d+$/.test(series?.id || '') ? series.id : undefined,
      seriesTitle: series?.titleText?.text || series?.id,
      season: /^\d+$/.test(String(season ?? '')) ? Number(season) : undefined,
      episode: /^\d+$/.test(String(episode ?? '')) ? Number(episode) : undefined,
      image: node.primaryImage?.url || series?.primaryImage?.url || '',
      plot: node.plot?.plotText?.plainText || '',
      genres: (node.genres?.genres || []).map((genre) => genre.text),
      cast: credits(/^cast$/),
      directors: credits(/^directors?$/),
      rating: node.ratingsSummary?.aggregateRating,
      votes: node.ratingsSummary?.voteCount
    };
  }

  function collectReleases(node, dates, { mode, country, from, to }) {
    if (!/^tt\d+$/.test(node.id)) return [];
    const releases = dates.flatMap((release) => {
      const date = dateValue(release);
      let kind = releaseKind(release, mode === 'tv' || mode === 'episodes');
      if (mode === 'episodes' && kind === 'tv') kind = 'episodes';
      if (!date || release.country?.id !== country || !RELEASE_VIEWS[mode].modes.includes(kind))
        return [];
      return [{ ...normalizeTitle(node), date, mode: kind, country, source: 'IMDb' }];
    });
    // Choose the series or episode premiere before applying the requested window.
    return sortReleases(releases).filter((release) => release.date >= from && release.date <= to);
  }

  function nextCursor(connection, seen) {
    if (
      !Array.isArray(connection?.edges) ||
      typeof connection.pageInfo?.hasNextPage !== 'boolean'
    ) {
      throw new Error('IMDb returned an incomplete release page. Try Refresh.');
    }
    if (!connection.pageInfo.hasNextPage) return null;
    const cursor = connection.pageInfo.endCursor;
    if (!cursor || seen.has(cursor) || seen.size >= 200) {
      throw new Error('IMDb release pagination did not finish. Try Refresh.');
    }
    seen.add(cursor);
    return cursor;
  }

  async function fetchComingSoon(options, onProgress) {
    const releases = [];
    const seenTitles = new Set();
    const cursors = new Set();
    let after = null;
    do {
      const data = await imdbGraphqlRequest(
        COMING_SOON_QUERY,
        {
          type: options.mode === 'episodes' ? 'TV_EPISODE' : options.mode === 'tv' ? 'TV' : 'MOVIE',
          includeSeries: options.mode === 'episodes',
          after,
          region: options.country,
          countries: [options.country],
          from: options.from,
          to: options.to
        },
        options.titleCountry || options.country,
        options.language
      );
      const connection = data.comingSoon;
      after = nextCursor(connection, cursors);
      for (const { node } of connection.edges) {
        if (!node || seenTitles.has(node.id)) continue;
        seenTitles.add(node.id);
        let dates = node.releaseDates;
        const titleDates = [];
        const dateCursors = new Set();
        let dateCursor;
        do {
          dateCursor = nextCursor(dates, dateCursors);
          titleDates.push(...dates.edges.map((edge) => edge.node));
          if (dateCursor) {
            const result = await imdbGraphqlRequest(
              RELEASE_DATES_QUERY,
              {
                id: node.id,
                after: dateCursor,
                countries: [options.country]
              },
              options.titleCountry || options.country,
              options.language
            );
            dates = result.title?.releaseDates;
          }
        } while (dateCursor);
        releases.push(...collectReleases(node, titleDates, options));
      }
      onProgress(
        `Loading IMDb ${options.mode === 'episodes' ? 'episode' : options.mode === 'tv' ? 'TV' : 'movie'} releases… ${seenTitles.size} titles checked.`
      );
    } while (after);
    return { releases, notices: [] };
  }

  function parseDigitalSchedule(html, from, to) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc.querySelector('.fieldtable, .fieldtable-inner'))
      throw new Error('The digital release calendar could not be read.');
    const releases = [];
    for (const cell of doc.querySelectorAll('.dvdcell')) {
      const dateCell = cell.closest('.fieldtable-inner')?.querySelector('.reldate');
      const dateText = dateCell?.textContent.match(/\b([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\b/);
      if (!dateText) continue;
      const month =
        [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December'
        ].indexOf(dateText[1]) + 1;
      const date = dateValue({ year: Number(dateText[3]), month, day: Number(dateText[2]) });
      const imdbId = cell
        .querySelector('a[href*="imdb.com/title/tt"]')
        ?.getAttribute('href')
        ?.match(/\/title\/(tt\d+)(?:\/|\?|$)/)?.[1];
      const titleLink = [...cell.querySelectorAll('a[href^="/movies/"]')].find((link) =>
        link.textContent.trim()
      );
      if (!date || date < from || date > to || !imdbId || !titleLink) continue;
      releases.push({
        imdbId,
        date,
        title: titleLink.textContent.trim(),
        image: new URL(
          cell.querySelector('img')?.getAttribute('src') || '/images/no-poster.png',
          DVD_ORIGIN
        ).href,
        mode: 'digital',
        country: 'US',
        source: 'DVD Release Dates'
      });
    }
    return releases;
  }

  async function fetchDigitalSchedule(options, onProgress) {
    const [year, month] = options.from.split('-');
    onProgress(`Loading digital releases… ${year}-${month}.`);
    const html = await requestText(`${DVD_ORIGIN}/digital-releases/${year}/${Number(month)}/`);
    const releases = parseDigitalSchedule(html, options.from, options.to);
    const notices = [];
    const ids = [...new Set(releases.map((release) => release.imdbId))];
    const titles = new Map();
    try {
      for (let offset = 0; offset < ids.length; offset += 20) {
        onProgress(`Loading digital release details… ${offset}/${ids.length}.`);
        const data = await imdbGraphqlRequest(
          TITLES_QUERY,
          { ids: ids.slice(offset, offset + 20) },
          options.titleCountry || 'US',
          options.language
        );
        if (!Array.isArray(data.titles)) throw new Error('IMDb returned no title details.');
        data.titles.filter(Boolean).forEach((node) => titles.set(node.id, normalizeTitle(node)));
      }
    } catch (error) {
      notices.push(`Some IMDb details are unavailable: ${error.message}`);
    }
    return {
      // Enrich metadata only: the title's theatrical releaseDate must never replace the digital date.
      releases: releases.map((release) => {
        const title = titles.get(release.imdbId);
        return {
          ...title,
          ...release,
          title: title?.title || release.title,
          image: title?.image || release.image
        };
      }),
      notices
    };
  }

  function sortReleases(releases) {
    const unique = new Map();
    releases.forEach((release) => {
      // Each series or individual episode gets one card at its earliest regional release.
      const key =
        release.mode === 'tv' || release.mode === 'episodes'
          ? `${release.imdbId}:${release.country}:${release.mode}`
          : `${release.imdbId}:${release.date}:${release.mode}`;
      const existing = unique.get(key);
      if (!existing || release.date <= existing.date) unique.set(key, release);
    });
    return [...unique.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    );
  }

  function cleanOldCaches() {
    const version = Number(CACHE_KEY.match(/-v(\d+)$/)[1]);
    for (const key of GM_listValues()) {
      const match = key.match(/^unit3d-upcoming-cache(?:-v(\d+))?$/);
      // Older calendar schemas cannot be reused. Keep the v1 torrent cache for migration.
      if (match && Number(match[1] || 0) < version) GM_deleteValue(key);
    }
  }

  function readReleaseCache(language, titleCountry = '') {
    const stored = GM_getValue(CACHE_KEY, []);
    return (Array.isArray(stored) ? stored : []).filter(
      (entry) =>
        Date.now() >= entry.savedAt &&
        Date.now() - entry.savedAt < CACHE_TTL &&
        Array.isArray(entry.releases) &&
        // Entries saved before language selection contain English metadata.
        (!language ||
          ((entry.language || 'en-US') === language && (entry.titleCountry || '') === titleCountry))
    );
  }

  function readHiddenSeries() {
    const stored = GM_getValue(HIDDEN_SERIES_KEY, []);
    return (Array.isArray(stored) ? stored : []).filter(
      (entry) => /^tt\d+$/.test(entry?.imdbId || '') && typeof entry.title === 'string'
    );
  }

  function setSeriesHidden(series, hidden) {
    const entries = readHiddenSeries().filter((entry) => entry.imdbId !== series.imdbId);
    if (hidden) entries.push({ imdbId: series.imdbId, title: series.title });
    GM_setValue(HIDDEN_SERIES_KEY, entries);
  }

  function filterEpisodes(releases, today = new Date()) {
    const { from, to } = episodeRange(today);
    const hidden = new Set(readHiddenSeries().map((entry) => entry.imdbId));
    return releases.filter(
      (release) =>
        release.mode !== 'episodes' ||
        (release.date >= from && release.date <= to && !hidden.has(release.seriesImdbId))
    );
  }

  function todaysEpisodes(releases, today = new Date()) {
    const { from } = episodeRange(today);
    return sortReleases(filterEpisodes(releases, today)).filter(
      (release) => release.mode === 'episodes' && release.date === from
    );
  }

  function episodeResolutions(release, records) {
    const imdbId = imdbIdKey(release.seriesImdbId);
    const resolutions = new Map();
    if (!imdbId || !Number.isInteger(release.season) || !Number.isInteger(release.episode))
      return resolutions;
    for (const record of records) {
      if (
        record.categoryId !== 2 ||
        record.imdbId !== imdbId ||
        !record.episodeKeys?.includes(`${release.season}:${release.episode}`) ||
        !HOME_RESOLUTIONS.includes(record.resolution)
      )
        continue;
      const torrentId = /^[1-9]\d*$/.test(record.torrentId || '') ? record.torrentId : null;
      // A legacy match must not replace a known torrent link for the same resolution.
      if (!resolutions.has(record.resolution) || torrentId)
        resolutions.set(record.resolution, torrentId);
    }
    return resolutions;
  }

  function searchReleases(releases, filters, options = {}) {
    const terms = Object.fromEntries(
      Object.entries(filters).map(([field, value]) => [
        field,
        value
          .toLowerCase()
          .split(field === 'title' ? /\s+/ : ',')
          .map((term) => term.trim())
          .filter(Boolean)
      ])
    );
    return sortReleases(releases).filter((release) => {
      const fields = {
        title: [release.title || ''],
        name: [...(release.cast || []), ...(release.directors || [])].map((person) => person.name),
        genre: release.genres || []
      };
      return Object.entries(terms).every(([field, words]) => {
        if (!words.length) return true;
        const matches = (word) => fields[field].some((value) => value.toLowerCase().includes(word));
        const matched =
          options[field]?.match === 'any' ? words.some(matches) : words.every(matches);
        return options[field]?.exclude ? !matched : matched;
      });
    });
  }

  async function loadReleaseSource(sourceMode, fetchSource, options, onProgress, force) {
    const language = options.language || 'en-US';
    const titleCountry = options.titleCountry || '';
    const key = `${sourceMode}:${options.country}:${sourceMode === 'episodes' ? 'rolling' : options.from.slice(0, 7)}:${language}:${titleCountry || 'auto'}`;
    // A foreground view can share a background request, then fetch only any missing days.
    while (releaseRequests.has(key)) await releaseRequests.get(key).catch(() => {});
    const pending = (async () => {
      const entry =
        !force && readReleaseCache().find((item) => item.key === key && item.to >= options.to);
      if (entry && entry.from <= options.from)
        return { releases: entry.releases, notices: [], cached: true };
      const request = { ...options, mode: sourceMode };
      if (entry) {
        const previousDay = new Date(`${entry.from}T12:00:00`);
        previousDay.setDate(previousDay.getDate() - 1);
        request.to = dateValue({
          year: previousDay.getFullYear(),
          month: previousDay.getMonth() + 1,
          day: previousDay.getDate()
        });
      }
      let data;
      try {
        data = await fetchSource(request, onProgress);
      } catch (error) {
        if (!entry) throw error;
        return { releases: entry.releases, notices: [error.message] };
      }
      data.releases = sortReleases([...(entry ? entry.releases : []), ...data.releases]);
      if (!data.notices.length) {
        // Read again at commit time so another month's completed request cannot be overwritten.
        GM_setValue(CACHE_KEY, [
          ...readReleaseCache().filter((item) => item.key !== key),
          {
            key,
            language,
            titleCountry,
            from: options.from,
            to: options.to,
            savedAt: entry ? entry.savedAt : Date.now(),
            releases: data.releases
          }
        ]);
      }
      return data;
    })();
    releaseRequests.set(key, pending);
    try {
      return await pending;
    } finally {
      if (releaseRequests.get(key) === pending) releaseRequests.delete(key);
    }
  }

  async function loadReleases(options, onProgress, force = false) {
    if (options.mode === 'episodes') options = { ...options, ...episodeRange() };
    const modes = RELEASE_VIEWS[options.mode].modes;
    const sources = [];
    if (modes.includes('theatrical') || modes.includes('digital')) {
      sources.push([
        options.mode === 'digital' ? 'IMDb digital calendar' : 'IMDb movie calendar',
        'movies',
        fetchComingSoon
      ]);
    }
    if (modes.includes('digital')) {
      sources.push(['US digital schedule', 'digital', fetchDigitalSchedule]);
    }
    if (modes.includes('tv')) {
      sources.push(['IMDb TV calendar', 'tv', fetchComingSoon]);
    }
    if (modes.includes('episodes')) {
      sources.push(['IMDb episode calendar', 'episodes', fetchComingSoon]);
    }
    const results = await Promise.allSettled(
      sources.map(([, sourceMode, fetchSource]) =>
        loadReleaseSource(sourceMode, fetchSource, options, onProgress, force)
      )
    );
    const releases = [];
    const notices = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        notices.push(`${sources[index][0]} unavailable: ${result.reason.message}`);
      } else {
        releases.push(...result.value.releases);
        notices.push(...result.value.notices);
      }
    });
    if (results.every((result) => result.status === 'rejected')) throw new Error(notices.join(' '));
    return {
      releases: sortReleases(releases).filter(
        (release) =>
          release.date >= options.from && release.date <= options.to && modes.includes(release.mode)
      ),
      notices,
      cached: results.every((result) => result.status === 'fulfilled' && result.value.cached)
    };
  }

  function searchUrl(imdbId) {
    const url = new URL('/torrents', location.origin);
    url.searchParams.set('imdbId', imdbId.replace(/^tt/, ''));
    return url.href;
  }

  // Obfuscation for userscript storage, not encryption. Never put the saved key back in the DOM.
  function encodeStored(value) {
    let binary = '';
    for (const byte of new TextEncoder().encode(JSON.stringify(value)))
      binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function decodeStored(value, fallback) {
    try {
      return JSON.parse(
        new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)))
      );
    } catch {
      return fallback;
    }
  }

  function savedApiKey() {
    const value = decodeStored(GM_getValue(API_KEY_STORAGE, ''), '');
    return typeof value === 'string' ? value : '';
  }

  function normalizeArrUrl(value) {
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error(
        'Use an HTTP or HTTPS server URL without credentials, query parameters or a fragment.'
      );
    return url.href.replace(/\/+$/, '');
  }

  function readArrServers() {
    const servers = decodeStored(GM_getValue(ARR_SETTINGS_KEY, ''), []);
    return Array.isArray(servers)
      ? servers.filter(
          (server) =>
            server &&
            ['radarr', 'sonarr'].includes(server.type) &&
            typeof server.id === 'string' &&
            typeof server.revision === 'string' &&
            typeof server.name === 'string' &&
            typeof server.url === 'string' &&
            typeof server.apiKey === 'string'
        )
      : [];
  }

  function saveArrServer(server) {
    const servers = readArrServers();
    const previous = servers.find((item) => item.id === server.id);
    if (previous?.revision !== server.revision) GM_deleteValue(ARR_CACHE_PREFIX + server.id);
    GM_setValue(
      ARR_SETTINGS_KEY,
      encodeStored([...servers.filter((item) => item.id !== server.id), server])
    );
  }

  function removeArrServer(id) {
    GM_setValue(
      ARR_SETTINGS_KEY,
      encodeStored(readArrServers().filter((server) => server.id !== id))
    );
    GM_deleteValue(ARR_CACHE_PREFIX + id);
  }

  function readArrCache(server) {
    const cache = decodeStored(GM_getValue(ARR_CACHE_PREFIX + server.id, ''), null);
    return cache?.revision === server.revision ? cache : {};
  }

  function sonarrSeriesMembership() {
    const libraries = readArrServers()
      .filter((server) => server.enabled && server.type === 'sonarr')
      .map((server) => readArrCache(server).library);
    return {
      complete: libraries.every(
        (library) => library?.savedAt > 0 && Array.isArray(library.records)
      ),
      ids: new Set(
        libraries.flatMap((library) =>
          (library?.records || []).map((record) => imdbIdKey(record.imdbId)).filter(Boolean)
        )
      )
    };
  }

  function filterSonarrEpisodes(releases, filter, membership = sonarrSeriesMembership()) {
    if (!['in', 'out'].includes(filter)) return releases;
    const included = filter === 'in';
    return releases.filter((release) => {
      if (release.mode !== 'episodes') return true;
      const seriesId = imdbIdKey(release.seriesImdbId);
      return Boolean(seriesId && membership.complete && membership.ids.has(seriesId) === included);
    });
  }

  function writeArrCache(server, section, value) {
    if (
      !readArrServers().some((item) => item.id === server.id && item.revision === server.revision)
    )
      return;
    GM_setValue(
      ARR_CACHE_PREFIX + server.id,
      encodeStored({
        ...readArrCache(server),
        revision: server.revision,
        [section]: value
      })
    );
  }

  function arrFresh(entry, ttl) {
    return entry && Date.now() >= entry.savedAt && Date.now() - entry.savedAt < ttl;
  }

  function arrName(type) {
    return type === 'radarr' ? 'Radarr' : 'Sonarr';
  }

  async function arrRequest(server, path, method = 'GET', body) {
    try {
      return JSON.parse(
        await requestText(`${normalizeArrUrl(server.url)}/api/v3/${path}`, {
          method,
          anonymous: true,
          redirect: 'error',
          headers: {
            'X-Api-Key': server.apiKey,
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {})
          },
          data: body ? JSON.stringify(body) : undefined
        })
      );
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? 'Expected JSON. Check the server URL and reverse proxy.'
          : error.status === 401 || error.status === 403
            ? 'Access denied. Check the API key and server permissions.'
            : error.status === 400
              ? 'The server rejected the request. Check the selected profile, root folder and options.'
              : error.message;
      throw Object.assign(new Error(`${server.name}: ${message}`), { status: error.status });
    }
  }

  async function loadArrOptions(server, force = false) {
    const cached = readArrCache(server).options;
    if (!force && arrFresh(cached, ARR_OPTIONS_TTL)) return cached;
    const key = `${server.id}:${server.revision}:options`;
    if (arrRequests.has(key)) return arrRequests.get(key);
    const request = (async () => {
      const status = await arrRequest(server, 'system/status');
      if (status?.appName?.toLowerCase() !== server.type)
        throw new Error(
          `${server.name}: This URL did not identify itself as ${arrName(server.type)}.`
        );
      const [roots, profiles, tags] = await Promise.all(
        ['rootfolder', 'qualityprofile', 'tag'].map((path) => arrRequest(server, path))
      );
      if (
        !Array.isArray(roots) ||
        !Array.isArray(profiles) ||
        !Array.isArray(tags) ||
        roots.some((item) => !item || typeof item.path !== 'string') ||
        profiles.some((item) => !Number.isInteger(item?.id) || typeof item.name !== 'string') ||
        tags.some((item) => !Number.isInteger(item?.id) || typeof item.label !== 'string')
      )
        throw new Error(`${server.name}: Invalid server options response.`);
      const options = {
        savedAt: Date.now(),
        roots: roots.map(({ path }) => ({ path })),
        profiles: profiles.map(({ id, name }) => ({ id, name })),
        tags: tags.map(({ id, label }) => ({ id, label }))
      };
      writeArrCache(server, 'options', options);
      return options;
    })();
    arrRequests.set(key, request);
    try {
      return await request;
    } finally {
      arrRequests.delete(key);
    }
  }

  function arrRecord(server, item) {
    const externalId = item?.[server.type === 'radarr' ? 'tmdbId' : 'tvdbId'];
    if (
      !Number.isInteger(item?.id) ||
      item.id <= 0 ||
      !Number.isInteger(externalId) ||
      externalId <= 0
    )
      throw new Error(`${server.name}: Invalid library response.`);
    return {
      id: item.id,
      externalId,
      imdbId: imdbIdKey(item.imdbId),
      slug: typeof item.titleSlug === 'string' ? item.titleSlug : '',
      monitored: item.monitored === true
    };
  }

  function arrLockName(server) {
    return `unit3d-upcoming-arr:${server.id}:${server.revision}`;
  }

  function assertArrServer(server) {
    if (
      !readArrServers().some(
        (item) => item.id === server.id && item.revision === server.revision && item.enabled
      )
    )
      throw new Error('This server was changed or disabled. Reopen the add controls.');
  }

  async function loadArrLibrary(server, force = false) {
    const cached = readArrCache(server).library;
    if (!force && arrFresh(cached, ARR_LIBRARY_TTL)) return cached;
    const key = `${server.id}:${server.revision}:library`;
    if (arrRequests.has(key)) return arrRequests.get(key);
    const request = navigator.locks.request(arrLockName(server), async () => {
      assertArrServer(server);
      const current = readArrCache(server).library;
      if (!force && arrFresh(current, ARR_LIBRARY_TTL)) return current;
      const response = await arrRequest(server, server.type === 'radarr' ? 'movie' : 'series');
      if (!Array.isArray(response)) throw new Error(`${server.name}: Invalid library response.`);
      const library = {
        savedAt: Date.now(),
        records: response.map((item) => arrRecord(server, item))
      };
      writeArrCache(server, 'library', library);
      return library;
    });
    arrRequests.set(key, request);
    try {
      return await request;
    } finally {
      arrRequests.delete(key);
    }
  }

  function arrTarget(release) {
    const imdbId = release.mode === 'episodes' ? release.seriesImdbId : release.imdbId;
    if (!/^tt\d+$/.test(imdbId || '')) return null;
    return {
      imdbId,
      type: ['tv', 'episodes'].includes(release.mode) ? 'sonarr' : 'radarr',
      title: release.mode === 'episodes' ? release.seriesTitle : release.title
    };
  }

  function arrExisting(server, target) {
    return readArrCache(server).library?.records.find(
      (record) => record.imdbId === imdbIdKey(target.imdbId)
    );
  }

  function arrViewUrl(server, record) {
    return `${server.url}/${server.type === 'radarr' ? 'movie' : 'series'}/${encodeURIComponent(record.slug || record.externalId)}`;
  }

  function validateArrDefaults(server, options, values) {
    if (!options.profiles.some((profile) => profile.id === values.qualityProfileId))
      throw new Error('Choose a quality profile from this server.');
    if (!options.roots.some((root) => root.path === values.rootFolderPath))
      throw new Error('Choose a root folder from this server.');
    if (
      !Array.isArray(values.tags) ||
      values.tags.some((id) => !options.tags.some((tag) => tag.id === id))
    )
      throw new Error('Reload the server options and choose valid tags.');
    if (
      server.type === 'radarr' &&
      !['announced', 'inCinemas', 'released'].includes(values.minimumAvailability)
    )
      throw new Error('Choose a minimum availability.');
    if (
      server.type === 'sonarr' &&
      (!Object.hasOwn(ARR_MONITORS, values.monitor) ||
        !['auto', 'standard', 'daily', 'anime'].includes(values.seriesType))
    )
      throw new Error('Choose valid monitoring and series type options.');
  }

  function arrImmediate(servers, options) {
    if (servers.length !== 1 || servers[0].showAddDialog === true) return false;
    try {
      validateArrDefaults(servers[0], options, servers[0].defaults || {});
      return true;
    } catch {
      return false;
    }
  }

  async function addArrTitle(server, target, values) {
    if (target.type !== server.type || !/^tt\d+$/.test(target.imdbId))
      throw new Error('Invalid title for this server.');
    const key = `${server.id}:${server.revision}:${target.imdbId}`;
    if (arrAdds.has(key)) return arrAdds.get(key);
    const request = navigator.locks.request(arrLockName(server), async () => {
      assertArrServer(server);
      const options = await loadArrOptions(server);
      validateArrDefaults(server, options, values);
      assertArrServer(server);
      const movie = server.type === 'radarr';
      const resource = movie ? 'movie' : 'series';
      const idField = movie ? 'tmdbId' : 'tvdbId';
      const result = await arrRequest(
        server,
        movie
          ? `movie/lookup/imdb?imdbId=${target.imdbId}`
          : `series/lookup?${new URLSearchParams({ term: `imdb:${target.imdbId}` })}`
      );
      const matches = (movie ? [result] : Array.isArray(result) ? result : []).filter(
        (item) => item && imdbIdKey(item.imdbId) === imdbIdKey(target.imdbId)
      );
      if (
        matches.length !== 1 ||
        !Number.isInteger(matches[0][idField]) ||
        matches[0][idField] <= 0 ||
        !matches[0].title
      )
        throw new Error(`No unique IMDb match in ${arrName(server.type)} for ${target.title}.`);
      const found = matches[0];
      assertArrServer(server);
      const existing = async () => {
        const response = await arrRequest(server, `${resource}?${idField}=${found[idField]}`);
        if (!Array.isArray(response)) throw new Error(`${server.name}: Invalid library response.`);
        return response.find((item) => item[idField] === found[idField]);
      };
      let added = await existing();
      if (!added) {
        const body = {
          title: found.title,
          [idField]: found[idField],
          qualityProfileId: values.qualityProfileId,
          rootFolderPath: values.rootFolderPath,
          tags: values.tags,
          ...(movie
            ? {
                monitored: values.monitored !== false,
                minimumAvailability: values.minimumAvailability,
                addOptions: { searchForMovie: values.search === true }
              }
            : {
                monitored: values.monitor !== 'none',
                monitorNewItems: values.monitorNewItems !== false ? 'all' : 'none',
                seriesType:
                  values.seriesType === 'auto' ? found.seriesType || 'standard' : values.seriesType,
                seasonFolder: values.seasonFolder !== false,
                addOptions: {
                  monitor: values.monitor,
                  searchForMissingEpisodes: values.search === true,
                  searchForCutoffUnmetEpisodes: values.searchCutoff === true
                }
              })
        };
        assertArrServer(server);
        try {
          added = await arrRequest(server, resource, 'POST', body);
        } catch (error) {
          // A timed-out or duplicate POST may have succeeded. Verify, never retry the write.
          try {
            added = await existing();
          } catch {
            /* Keep the original add error. */
          }
          if (!added) throw error;
        }
      }
      const record = arrRecord(server, added);
      if (record.externalId !== found[idField])
        throw new Error(`${server.name}: The returned title did not match.`);
      record.imdbId = imdbIdKey(target.imdbId);
      const library = readArrCache(server).library || { savedAt: 0, records: [] };
      writeArrCache(server, 'library', {
        ...library,
        records: [
          ...library.records.filter((item) => item.externalId !== record.externalId),
          record
        ]
      });
      return record;
    });
    arrAdds.set(key, request);
    try {
      return await request;
    } finally {
      arrAdds.delete(key);
    }
  }

  function imdbIdKey(value) {
    const id = String(value ?? '')
      .replace(/^tt/, '')
      .replace(/^0+/, '');
    return /^[1-9]\d*$/.test(id) ? id : '';
  }

  function cachedTorrents(entries, scope, now = Date.now()) {
    const categories = TORRENT_CATEGORIES[scope];
    const selected = entries.filter(
      (entry) =>
        now >= entry.savedAt &&
        now - entry.savedAt < TORRENT_CACHE_TTL &&
        TORRENT_CATEGORIES[entry.scope].some((category) => categories.includes(category))
    );
    const covered = new Set(selected.flatMap((entry) => TORRENT_CATEGORIES[entry.scope]));
    if (!categories.every((category) => covered.has(category))) return null;
    return {
      savedAt: Math.min(...selected.map((entry) => entry.savedAt)),
      records: selected
        .flatMap((entry) => entry.records)
        .filter((record) => categories.includes(record.categoryId)),
      cached: true
    };
  }

  function torrentEpisodeKeys(attributes) {
    const parse = (name) => {
      const keys = [];
      const pattern =
        /(?:^|[^a-z0-9])S(\d{1,3})[ ._-]*E(\d{1,4})((?:E\d{1,4}|-E?\d{1,4})*)(?![a-z0-9])/gi;
      for (const match of String(name || '').matchAll(pattern)) {
        const season = Number(match[1]);
        let episode = Number(match[2]);
        keys.push(`${season}:${episode}`);
        for (const extra of match[3].matchAll(/(E|-E?)(\d{1,4})/gi)) {
          const end = Number(extra[2]);
          if (extra[1].startsWith('-')) {
            for (let next = episode + 1; next <= end; next++) keys.push(`${season}:${next}`);
          } else keys.push(`${season}:${end}`);
          episode = end;
        }
      }
      return keys;
    };
    const files = (attributes.files || [])
      .filter((file) => /\.(mkv|mp4|avi|m4v|ts|m2ts|mpg|mpeg|webm)$/i.test(file.name || ''))
      .flatMap((file) => parse(file.name.split(/[\\/]/).pop()));
    return [...new Set(files.length ? files : parse(attributes.name))].sort();
  }

  function mergeTorrentHistory(history, records, now = Date.now()) {
    const matches = new Map();
    for (const record of [...history, ...records.map((record) => ({ ...record, lastSeen: now }))]) {
      if (
        !Number.isFinite(record.lastSeen) ||
        record.lastSeen > now ||
        now - record.lastSeen >= TORRENT_HISTORY_TTL
      )
        continue;
      const key = `${record.categoryId}:${record.imdbId}:${(record.episodeKeys || []).join(',')}:${record.resolution || ''}`;
      const previous = matches.get(key);
      if (
        !previous ||
        record.lastSeen > previous.lastSeen ||
        (record.lastSeen === previous.lastSeen && !previous.torrentId && record.torrentId)
      )
        matches.set(key, record);
    }
    return [...matches.values()];
  }

  async function loadRecentTorrents(scope, apiKey, force = false, onProgress = () => {}) {
    // Web Locks make the persisted cooldown atomic across tabs on the same site.
    return navigator.locks.request('unit3d-upcoming-torrent-api', async () => {
      if (savedApiKey() !== apiKey) return { cancelled: true };
      const credential = await sha256(apiKey);
      const stored = decodeStored(GM_getValue(TORRENT_CACHE_KEY, ''), null);
      const now = Date.now();
      const previousEntries =
        stored?.credential === credential && Array.isArray(stored.entries) ? stored.entries : [];
      const entries = previousEntries.filter(
        (entry) => now >= entry.savedAt && now - entry.savedAt < TORRENT_HISTORY_TTL
      );
      let history = mergeTorrentHistory(
        stored?.credential === credential && Array.isArray(stored.history)
          ? stored.history
          : previousEntries.flatMap((entry) =>
              entry.records.map((record) => ({ ...record, lastSeen: entry.savedAt }))
            ),
        [],
        now
      );
      const matchingRecords = () =>
        history
          .filter((record) => TORRENT_CATEGORIES[scope].includes(record.categoryId))
          .map(({ imdbId, categoryId, episodeKeys, resolution, torrentId }) => ({
            imdbId,
            categoryId,
            ...(resolution ? { resolution } : {}),
            ...(torrentId ? { torrentId } : {}),
            ...(episodeKeys?.length ? { episodeKeys } : {})
          }));
      // Preserve existing v1 results during migration and prune expired history even on cache hits.
      if (stored?.credential === credential)
        GM_setValue(TORRENT_CACHE_KEY, encodeStored({ credential, entries, history }));
      const cached = cachedTorrents(entries, scope, now);
      if (cached && !force) return { ...cached, records: matchingRecords() };
      const lastRequest = GM_getValue(TORRENT_REQUEST_KEY, 0);
      const retryAfter = TORRENT_REQUEST_INTERVAL - (now - lastRequest);
      if (retryAfter > 0) return { ...cached, retryAfter, records: matchingRecords() };
      if (savedApiKey() !== apiKey) return { cancelled: true };
      const url = new URL('/api/torrents/filter', location.origin);
      url.searchParams.set('perPage', '100');
      url.searchParams.set('sortField', 'created_at');
      url.searchParams.set('sortDirection', 'desc');
      TORRENT_CATEGORIES[scope].forEach((id) => url.searchParams.append('categories[]', id));
      const knownIds = new Set(
        entries.filter((entry) => entry.scope === scope).flatMap((entry) => entry.torrentIds || [])
      );
      const torrentIds = [];
      const records = [];
      const visited = new Set();
      let pages = 0;
      try {
        for (let page = 1; page <= 3; page++) {
          const delay =
            TORRENT_REQUEST_INTERVAL - (Date.now() - GM_getValue(TORRENT_REQUEST_KEY, 0));
          if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
          if (savedApiKey() !== apiKey) return { cancelled: true };
          if (visited.has(url.href)) throw new Error('Torrent API pagination repeated a page.');
          visited.add(url.href);
          GM_setValue(TORRENT_REQUEST_KEY, Date.now());
          const response = await fetch(url.href, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
            credentials: 'same-origin',
            redirect: 'error',
            signal: AbortSignal.timeout(30000)
          });
          if (!response.ok) throw new Error(`Torrent API returned HTTP ${response.status}.`);
          const data = await response.json();
          if (!Array.isArray(data.data))
            throw new Error('Torrent API returned an invalid results page.');
          if (savedApiKey() !== apiKey) return { cancelled: true };
          // Keep matching fields and torrent IDs only; download/magnet URLs may contain secrets.
          const pageRecords = data.data.flatMap((torrent) => {
            const imdbId = imdbIdKey(torrent.attributes?.imdb_id);
            const categoryId = Number(torrent.attributes?.category_id);
            if (!imdbId || !TORRENT_CATEGORIES[scope].includes(categoryId)) return [];
            const episodeKeys = categoryId === 2 ? torrentEpisodeKeys(torrent.attributes) : [];
            // UNIT3D returns the resolution name as well as its site-specific ID.
            const resolution = torrent.attributes.resolution;
            const torrentId = String(torrent.id || '');
            return [
              {
                imdbId,
                categoryId,
                ...(HOME_RESOLUTIONS.includes(resolution) ? { resolution } : {}),
                ...(HOME_RESOLUTIONS.includes(resolution) && /^[1-9]\d*$/.test(torrentId)
                  ? { torrentId }
                  : {}),
                ...(episodeKeys.length ? { episodeKeys } : {})
              }
            ];
          });
          const pageIds = data.data.map((torrent) => String(torrent.id || ''));
          const knownPage = pageIds.length > 0 && pageIds.every((id) => knownIds.has(id));
          torrentIds.push(...pageIds.filter((id) => /^[1-9]\d*$/.test(id)));
          records.push(...pageRecords);
          pages = page;
          history = mergeTorrentHistory(history, pageRecords);
          GM_setValue(TORRENT_CACHE_KEY, encodeStored({ credential, entries, history }));
          onProgress({ records: matchingRecords(), pages });
          if (page === 3 || !data.data.length || knownPage || !data.links?.next) break;
          const next = new URL(data.links.next, url);
          if (next.origin !== location.origin || next.pathname !== url.pathname)
            throw new Error('Torrent API returned an invalid next-page URL.');
          const cursor = next.searchParams.get('cursor');
          const nextPage = next.searchParams.get('page');
          url.searchParams.delete('cursor');
          url.searchParams.delete('page');
          if (cursor) url.searchParams.set('cursor', cursor);
          else if (/^[1-9]\d*$/.test(nextPage || '')) url.searchParams.set('page', nextPage);
          else throw new Error('Torrent API returned no pagination cursor or page.');
        }
        const entry = {
          scope,
          savedAt: Date.now(),
          records,
          torrentIds: [...new Set(torrentIds)],
          pages
        };
        GM_setValue(
          TORRENT_CACHE_KEY,
          encodeStored({
            credential,
            entries: [...entries.filter((item) => item.scope !== scope), entry],
            history
          })
        );
        return { ...entry, records: matchingRecords(), cached: false };
      } catch (error) {
        if (savedApiKey() !== apiKey) return { cancelled: true };
        history = mergeTorrentHistory(history, [], Date.now());
        error.records = matchingRecords();
        throw error;
      }
    });
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function externalLink(text, href, className) {
    const link = element('a', className, text);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function createArrOptions(server, options, values = {}) {
    const fields = element('fieldset', 'unit3d-upcoming__arr-options');
    const controls = {};
    const select = (key, label, choices, fallback = '') => {
      const input = element('select', 'form__select');
      const wrapper = element('label', null, label);
      input.setAttribute('aria-label', label);
      choices.forEach(([value, text]) => input.append(new Option(text, value)));
      input.value = String(values[key] ?? fallback);
      wrapper.append(input);
      fields.append(wrapper);
      controls[key] = input;
      return input;
    };
    const checkbox = (key, label, fallback) => {
      const input = element('input');
      input.type = 'checkbox';
      input.checked = values[key] ?? fallback;
      const wrapper = element('label');
      wrapper.append(input, label);
      fields.append(wrapper);
      controls[key] = input;
    };
    select(
      'qualityProfileId',
      'Quality profile',
      [['', 'Choose a profile'], ...options.profiles.map(({ id, name }) => [id, name])],
      options.profiles.length === 1 ? options.profiles[0].id : ''
    );
    select(
      'rootFolderPath',
      'Root folder',
      [['', 'Choose a root folder'], ...options.roots.map(({ path }) => [path, path])],
      options.roots.length === 1 ? options.roots[0].path : ''
    );
    const tags = select(
      'tags',
      'Tags',
      options.tags.map(({ id, label }) => [id, label])
    );
    tags.multiple = true;
    tags.size = Math.max(1, Math.min(3, options.tags.length));
    [...tags.options].forEach((option) => {
      option.selected = (values.tags || []).includes(Number(option.value));
    });
    if (!options.tags.length) tags.append(new Option('No tags configured', ''));
    tags.disabled = !options.tags.length;
    if (server.type === 'radarr') {
      checkbox('monitored', 'Monitor movie', true);
      select(
        'minimumAvailability',
        'Minimum availability',
        [
          ['announced', 'Announced'],
          ['inCinemas', 'In cinemas'],
          ['released', 'Released']
        ],
        'released'
      );
      checkbox('search', 'Search on add', false);
    } else {
      select('monitor', 'Monitor', Object.entries(ARR_MONITORS), 'future');
      checkbox('monitorNewItems', 'Monitor new seasons', true);
      select(
        'seriesType',
        'Series type',
        [
          ['auto', 'From Sonarr'],
          ['standard', 'Standard'],
          ['daily', 'Daily'],
          ['anime', 'Anime']
        ],
        'auto'
      );
      checkbox('seasonFolder', 'Season folders', true);
      checkbox('search', 'Search missing episodes on add', false);
      checkbox('searchCutoff', 'Search cutoff-unmet episodes on add', false);
    }
    return {
      fields,
      read: () =>
        Object.fromEntries(
          Object.entries(controls).map(([key, input]) => [
            key,
            key === 'tags'
              ? [...input.selectedOptions]
                  .filter((option) => option.value)
                  .map((option) => Number(option.value))
              : key === 'qualityProfileId'
                ? Number(input.value)
                : input.type === 'checkbox'
                  ? input.checked
                  : input.value
          ])
        )
    };
  }

  function mountArrIntegration(settings, results, onLibraryChange = () => {}) {
    const container = element('div', 'unit3d-upcoming__arr-settings');
    settings.append(container);
    const attempts = new Map();
    const errors = new Map();
    const messages = new Map();
    const statusNodes = new Map();
    const targetKey = (target) => `${target.type}:${target.imdbId}`;

    function draw() {
      const servers = readArrServers();
      const libraries = new Map(servers.map((server) => [server.id, readArrCache(server).library]));
      const matches = new Map(
        [...libraries].map(([id, library]) => [
          id,
          new Map((library?.records || []).map((record) => [record.imdbId, record]))
        ])
      );
      for (const server of servers) {
        const status = statusNodes.get(server.id);
        if (!status) continue;
        const snapshot = libraries.get(server.id);
        const error = errors.get(`${server.id}:${server.revision}`);
        status.textContent = `${snapshot?.savedAt ? `Library checked ${new Date(snapshot.savedAt).toLocaleString()}. ${snapshot.records.length} titles. ` : 'Library has not been checked. '}${error ? `${error} Saved status may be stale.` : 'Cached for 10 minutes.'}`;
      }
      for (const row of results.querySelectorAll('.unit3d-upcoming__arr-actions')) {
        const target = {
          type: row.dataset.arrType,
          imdbId: row.dataset.arrId,
          title: row.dataset.arrTitle
        };
        const relevant = servers.filter((server) => server.enabled && server.type === target.type);
        row.replaceChildren();
        row.hidden = !relevant.length;
        if (!relevant.length) continue;
        let missing = false;
        for (const server of relevant) {
          const record = matches.get(server.id).get(imdbIdKey(target.imdbId));
          if (!record) {
            missing = true;
            continue;
          }
          const link = externalLink(
            relevant.length === 1 ? `View in ${arrName(server.type)}` : `View: ${server.name}`,
            arrViewUrl(server, record)
          );
          link.title = `${server.name}${record.monitored ? '' : ' · Unmonitored'}`;
          row.append(link);
        }
        const message = messages.get(targetKey(target));
        if (missing) {
          const button = element(
            'button',
            'unit3d-upcoming__arr-add',
            `Add to ${arrName(target.type)}`
          );
          button.type = 'button';
          button.disabled = message?.busy === true;
          button.addEventListener('click', () => void startAdd(target));
          row.append(button);
        }
        if (message?.text) {
          const feedback = element('span', 'unit3d-upcoming__arr-feedback', message.text);
          feedback.setAttribute('role', 'status');
          row.append(feedback);
        }
      }
    }

    async function sync(server, force = false) {
      const key = `${server.id}:${server.revision}`;
      if (!force && arrFresh(readArrCache(server).library, ARR_LIBRARY_TTL)) return;
      if (!force && Date.now() - (attempts.get(key) || 0) < ARR_LIBRARY_TTL) return;
      attempts.set(key, Date.now());
      errors.delete(key);
      try {
        await loadArrLibrary(server, force);
      } catch (error) {
        errors.set(key, error.message);
      }
      draw();
      onLibraryChange(server.type);
    }

    function update(force = false, requiredType) {
      draw();
      const types = new Set(
        [...results.querySelectorAll('.unit3d-upcoming__arr-actions')].map(
          (row) => row.dataset.arrType
        )
      );
      if (requiredType) types.add(requiredType);
      for (const server of readArrServers().filter((item) => item.enabled && types.has(item.type)))
        void sync(server, force);
    }

    function hasLibraryError(type) {
      return readArrServers().some((server) => {
        if (
          !server.enabled ||
          server.type !== type ||
          !errors.has(`${server.id}:${server.revision}`)
        )
          return false;
        const library = readArrCache(server).library;
        return !(library?.savedAt > 0 && Array.isArray(library.records));
      });
    }

    function renderSettings() {
      container.replaceChildren();
      statusNodes.clear();
      for (const type of ['radarr', 'sonarr']) {
        const section = element('details');
        section.append(element('summary', null, arrName(type)));
        const list = element('div');
        const add = element(
          'button',
          'form__button form__button--outlined',
          `Add ${arrName(type)} server`
        );
        add.type = 'button';
        add.addEventListener('click', () => {
          const editor = serverEditor(
            {
              id: crypto.randomUUID(),
              revision: crypto.randomUUID(),
              type,
              name: arrName(type),
              url: '',
              apiKey: '',
              enabled: true,
              defaults: {}
            },
            true
          );
          list.append(editor);
          editor.querySelector('input').focus();
        });
        for (const server of readArrServers().filter((item) => item.type === type))
          list.append(serverEditor(server));
        section.append(list, add);
        container.append(section);
      }
      draw();
    }

    function serverEditor(server, isNew = false) {
      let draft = server;
      let options = readArrCache(server).options;
      let optionsRevision = options ? server.revision : null;
      let optionInputs;
      const editor = element('details', 'unit3d-upcoming__arr-server');
      editor.open = isNew;
      const summary = element('summary', null, server.name);
      const form = element('form');
      const fields = element('fieldset');
      const inputs = {};
      for (const [key, label, type] of [
        ['name', 'Server name', 'text'],
        ['url', 'Server URL', 'url'],
        ['apiKey', 'API key', 'password']
      ]) {
        const input = element('input', 'form__text');
        input.type = type;
        input.autocomplete = 'off';
        input.required = key !== 'apiKey' || !server.apiKey;
        input.value = key === 'apiKey' ? '' : server[key];
        if (key === 'apiKey')
          input.placeholder = server.apiKey ? 'Saved · leave blank to keep' : 'API key';
        if (key === 'url')
          input.placeholder = `http://localhost:${server.type === 'radarr' ? 7878 : 8989}`;
        const wrapper = element('label', null, label);
        wrapper.append(input);
        fields.append(wrapper);
        inputs[key] = input;
      }
      const enabled = element('input');
      enabled.type = 'checkbox';
      enabled.checked = server.enabled;
      const enabledLabel = element('label');
      enabledLabel.append(enabled, 'Enabled');
      const showAddDialog = element('input');
      showAddDialog.type = 'checkbox';
      showAddDialog.checked = server.showAddDialog === true;
      const dialogLabel = element('label');
      dialogLabel.append(showAddDialog, 'Always show add dialog');
      dialogLabel.title =
        'When off, a single server adds immediately using its saved settings. Multiple servers still open the dialog.';
      const optionArea = element('div', 'unit3d-upcoming__arr-option-area');
      const showOptions = (values) => {
        optionInputs = createArrOptions(draft, options, values);
        optionArea.replaceChildren(optionInputs.fields);
      };
      if (options) showOptions(server.defaults);
      const test = element('button', 'form__button form__button--outlined', 'Test & load options');
      test.type = 'button';
      const save = element('button', 'form__button form__button--outlined', 'Save server');
      save.type = 'submit';
      const remove = element(
        'button',
        'form__button form__button--outlined',
        isNew ? 'Cancel' : 'Remove server'
      );
      remove.type = 'button';
      remove.addEventListener('click', () => {
        if (!isNew) removeArrServer(server.id);
        editor.remove();
        attempts.clear();
        messages.clear();
        update(false, server.type);
        onLibraryChange(server.type);
      });
      const refreshLibrary = element(
        'button',
        'form__button form__button--outlined',
        'Refresh library'
      );
      refreshLibrary.type = 'button';
      refreshLibrary.disabled = isNew || !server.enabled;
      refreshLibrary.addEventListener('click', () => void sync(server, true));
      const status = element('p');
      status.setAttribute('role', 'status');
      const libraryStatus = element('p');
      statusNodes.set(server.id, libraryStatus);
      fields.append(enabledLabel, dialogLabel, test, optionArea, save, remove, refreshLibrary);
      form.append(fields);
      editor.append(summary, form, status, libraryStatus);

      async function connect(saveServer) {
        if (!form.reportValidity()) return;
        fields.disabled = true;
        status.textContent = 'Connecting…';
        try {
          const url = normalizeArrUrl(inputs.url.value);
          const apiKey = inputs.apiKey.value.trim() || draft.apiKey;
          if (!apiKey || /\s/.test(apiKey)) throw new Error('Enter an API key without spaces.');
          const changed = url !== draft.url || apiKey !== draft.apiKey;
          const values = changed ? {} : optionInputs?.read() || draft.defaults;
          draft = {
            ...draft,
            name: inputs.name.value.trim() || arrName(server.type),
            url,
            apiKey,
            enabled: enabled.checked,
            showAddDialog: showAddDialog.checked,
            revision: changed ? crypto.randomUUID() : draft.revision
          };
          if (!saveServer || draft.enabled) {
            if (
              !saveServer ||
              optionsRevision !== draft.revision ||
              !arrFresh(options, ARR_OPTIONS_TTL)
            ) {
              options = await loadArrOptions(draft, !saveServer);
              optionsRevision = draft.revision;
            }
            showOptions(values);
            draft.defaults = optionInputs.read();
          } else {
            draft.defaults = values;
          }
          if (saveServer) {
            saveArrServer(draft);
            if (options && optionsRevision === draft.revision)
              writeArrCache(draft, 'options', options);
            inputs.apiKey.value = '';
            attempts.clear();
            messages.clear();
            const replacement = serverEditor(draft);
            replacement.open = true;
            editor.replaceWith(replacement);
            replacement.querySelector('[role="status"]').textContent =
              'Server saved. API key hidden.';
            update(false, draft.type);
            onLibraryChange(draft.type);
          } else
            status.textContent = `Connected to ${arrName(server.type)}. Choose defaults, then save.`;
        } catch (error) {
          status.textContent = error.message;
        } finally {
          fields.disabled = false;
        }
      }
      test.addEventListener('click', () => void connect(false));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        void connect(true);
      });
      return editor;
    }

    async function startAdd(target) {
      const key = targetKey(target);
      if (messages.get(key)?.busy) return;
      messages.set(key, { busy: true, text: 'Checking add options…' });
      draw();
      try {
        const servers = readArrServers().filter(
          (server) => server.enabled && server.type === target.type
        );
        if (!servers.length) throw new Error('Configure an enabled server in Settings.');
        const options = servers.length === 1 ? await loadArrOptions(servers[0]) : null;
        if (servers.length === 1 && arrImmediate(servers, options)) {
          messages.set(key, { busy: true, text: `Adding to ${servers[0].name}…` });
          draw();
          await addArrTitle(servers[0], target, servers[0].defaults);
          onLibraryChange(target.type);
        } else openAddDialog(target, servers);
        messages.delete(key);
      } catch (error) {
        messages.set(key, { text: error.message });
      }
      draw();
    }

    function openAddDialog(target, servers) {
      const dialog = element('dialog', 'unit3d-upcoming__arr-dialog');
      const title = element('h2', null, `Add ${target.title} to ${arrName(target.type)}`);
      title.id = 'unit3d-upcoming-arr-dialog-title';
      dialog.setAttribute('aria-labelledby', title.id);
      const form = element('form');
      const serverLabel = element('label', null, 'Server');
      const selection = element('select', 'form__select');
      selection.setAttribute('aria-label', 'Server');
      servers.forEach((server) => selection.append(new Option(server.name, server.id)));
      serverLabel.append(selection);
      const optionArea = element('div');
      const status = element('p');
      status.setAttribute('role', 'status');
      const submit = element('button', 'form__button form__button--outlined', 'Add');
      submit.type = 'submit';
      const reload = element('button', 'form__button form__button--outlined', 'Reload options');
      reload.type = 'button';
      const close = element('button', 'form__button form__button--outlined', 'Close');
      close.type = 'button';
      close.addEventListener('click', () => dialog.close());
      const buttons = element('div', 'unit3d-upcoming__arr-dialog-buttons');
      buttons.append(submit, reload, close);
      form.append(serverLabel, optionArea, status, buttons);
      dialog.append(title, form);
      let generation = 0;
      let selected;
      let optionInputs;
      let busy = false;

      async function chooseServer(force = false) {
        const token = ++generation;
        selected = servers.find((server) => server.id === selection.value);
        const server = selected;
        submit.disabled = true;
        optionInputs = undefined;
        optionArea.replaceChildren();
        status.textContent = 'Loading server options…';
        try {
          const options = await loadArrOptions(server, force);
          if (token !== generation || !dialog.open) return;
          optionInputs = createArrOptions(server, options, server.defaults);
          optionArea.append(optionInputs.fields);
          const record = arrExisting(server, target);
          status.replaceChildren();
          if (record)
            status.append(externalLink(`View in ${server.name}`, arrViewUrl(server, record)));
          else {
            status.textContent = !options.roots.length
              ? 'Configure a root folder in this server, then reload options.'
              : '';
            submit.disabled = !options.roots.length || !options.profiles.length;
          }
        } catch (error) {
          if (token === generation) status.textContent = error.message;
        }
      }
      selection.addEventListener('change', () => void chooseServer());
      reload.addEventListener('click', () => void chooseServer(true));
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy || !optionInputs || submit.disabled) return;
        busy = true;
        submit.disabled = selection.disabled = reload.disabled = true;
        optionInputs.fields.disabled = true;
        status.textContent = `Adding to ${selected.name}…`;
        try {
          const record = await addArrTitle(selected, target, optionInputs.read());
          status.replaceChildren(
            externalLink(`View in ${selected.name}`, arrViewUrl(selected, record))
          );
          draw();
          onLibraryChange(target.type);
        } catch (error) {
          status.textContent = error.message;
          submit.disabled = false;
        } finally {
          busy = false;
          selection.disabled = reload.disabled = optionInputs.fields.disabled = false;
        }
      });
      dialog.addEventListener(
        'close',
        () => {
          ++generation;
          dialog.remove();
        },
        { once: true }
      );
      document.body.append(dialog);
      dialog.showModal();
      void chooseServer();
    }

    renderSettings();
    return { update, refresh: (type) => update(true, type), hasLibraryError };
  }

  function createCredits(className, people = []) {
    const credits = element('div', className);
    credits.title = people.map((person) => person.name).join(', ');
    people.forEach((person, index) => {
      if (index) credits.append(', ');
      credits.append(
        /^nm\d+$/.test(person.id)
          ? externalLink(person.name, `https://www.imdb.com/name/${person.id}/`)
          : person.name
      );
    });
    return credits;
  }

  function displayDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function createPosterImage(src, title, height) {
    const image = element('img');
    image.alt = title;
    image.referrerPolicy = 'no-referrer';
    const placeholder = new URL('/img/poster-placeholder.svg', location.origin).href;
    const original = /^https?:\/\//i.test(src || '') ? src : placeholder;
    // IMDb's calendar serves resized renditions instead of the raw primaryImage URL.
    const resized = original.startsWith('https://m.media-amazon.com/images/M/')
      ? original.replace(/\._V1_[^/?#]*\.(jpe?g|png|webp)$/i, `._V1_QL75_UY${height}_.$1`)
      : original;
    let triedOriginal = resized === original;
    image.onerror = () => {
      if (!triedOriginal) {
        triedOriginal = true;
        image.src = original;
      } else {
        image.onerror = null;
        image.src = placeholder;
      }
    };
    image.src = resized;
    return image;
  }

  function openPosterLightbox(src, title) {
    const dialog = element('dialog', 'unit3d-upcoming__lightbox');
    dialog.setAttribute('aria-label', `${title} poster`);
    const image = createPosterImage(src, title, 1080);
    const close = element('button', 'unit3d-upcoming__lightbox-close', '×');
    close.type = 'button';
    close.autofocus = true;
    close.setAttribute('aria-label', 'Close poster');
    close.addEventListener('click', () => dialog.close());
    dialog.append(close, image);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
  }

  function createCard(release) {
    const card = element('article', 'torrent-card');
    const torrentImdbId = release.seriesImdbId || release.imdbId;
    card.dataset.imdbId = imdbIdKey(torrentImdbId);
    if (release.mode === 'episodes')
      card.dataset.episodeKey =
        Number.isInteger(release.season) && Number.isInteger(release.episode)
          ? `${release.season}:${release.episode}`
          : '';
    const imdbUrl = `https://www.imdb.com/title/${release.imdbId}/`;
    const header = element('header', 'torrent-card__header');
    const type = element('div', 'torrent-card__left-header');
    type.append(
      element(
        'span',
        `unit3d-upcoming__type unit3d-upcoming__type--${release.mode}`,
        release.mode === 'episodes'
          ? 'Episode'
          : release.mode === 'tv'
            ? 'TV'
            : release.mode === 'digital'
              ? 'Digital'
              : 'Theatrical'
      ),
      ` · ${release.country}`
    );
    header.append(type);
    if (release.rating != null) {
      const count = release.votes != null ? ` (${release.votes.toLocaleString()})` : '';
      const rating = element('span', 'torrent-card__rating', `★ ${release.rating}${count}`);
      rating.title = `${release.rating}/10${release.votes != null ? ` (${release.votes.toLocaleString()} votes)` : ''}`;
      header.append(rating);
    }
    header.append(createCredits('torrent-card__right-header', release.directors));
    const aside = element('aside', 'torrent-card__aside');
    const poster = element('button', 'unit3d-upcoming__poster');
    poster.type = 'button';
    poster.setAttribute('aria-label', `View poster for ${release.title}`);
    poster.setAttribute('aria-haspopup', 'dialog');
    const figure = element('figure', 'torrent-card__figure');
    const image = createPosterImage(release.image, release.title, 440);
    image.className = 'torrent-card__image';
    image.loading = 'lazy';
    image.width = 147;
    image.height = 220;
    poster.addEventListener('click', () => openPosterLightbox(release.image, release.title));
    poster.append(image);
    figure.append(poster);
    aside.append(figure);
    const body = element('div', 'torrent-card__body');
    const heading = element('h3', 'torrent-card__title');
    heading.append(externalLink(release.title, imdbUrl, 'torrent-card__link'));
    const meta = element('div', 'torrent-card__rating-and-genres');
    const genres = element('ul', 'torrent-card__genres');
    (release.genres || []).forEach((genre) => {
      const item = element('li', 'torrent-card__genre-item');
      item.append(element('span', 'torrent-card__genre', genre));
      genres.append(item);
    });
    meta.append(genres);
    const plot = element('p', 'torrent-card__plot', release.plot || 'No synopsis available.');
    body.append(heading, meta, plot);
    const target = arrTarget(release);
    if (target) {
      const actions = element('div', 'unit3d-upcoming__arr-actions');
      actions.dataset.arrType = target.type;
      actions.dataset.arrId = target.imdbId;
      actions.dataset.arrTitle = target.title;
      actions.hidden = true;
      body.append(actions);
    }
    const footer = element('footer', 'torrent-card__footer');
    const credits = createCredits('torrent-card__left-footer', release.cast);
    const search = externalLink(
      'Search torrents',
      searchUrl(torrentImdbId),
      'torrent-card__right-footer'
    );
    search.setAttribute('aria-label', `Search torrents for ${release.title}`);
    footer.append(credits);
    if (release.mode === 'episodes' && release.seriesImdbId) {
      const hide = element('button', 'unit3d-upcoming__hide-series', 'Hide series');
      hide.type = 'button';
      hide.dataset.hideSeries = release.seriesImdbId;
      hide.setAttribute('aria-label', `Hide series ${release.seriesTitle}`);
      footer.append(hide);
    }
    footer.append(search);
    card.append(header, aside, body, footer);
    return card;
  }

  function renderReleases(container, releases, append = false, lastDate) {
    const fragment = document.createDocumentFragment();
    for (const release of releases) {
      if (release.date !== lastDate) {
        const heading = element('h2', 'unit3d-upcoming__date');
        const time = element('time', null, displayDate(release.date));
        time.dateTime = release.date;
        heading.append(time);
        fragment.append(heading);
        lastDate = release.date;
      }
      fragment.append(createCard(release));
    }
    if (append) container.append(fragment);
    else container.replaceChildren(fragment);
  }

  function addNavigation() {
    if (document.getElementById('unit3d-upcoming-nav')) return;
    const dropdown = [...document.querySelectorAll('li.top-nav__dropdown')].find(
      (item) =>
        item.querySelector(':scope > a .top-nav--left__container')?.textContent.trim() ===
          'Other' ||
        [...item.querySelectorAll(':scope > ul > li > a[href]')].some(
          (link) => new URL(link.href).pathname === '/trending'
        )
    );
    const menu = dropdown?.querySelector(':scope > ul');
    if (!menu) return;
    const item = element('li');
    item.id = 'unit3d-upcoming-nav';
    const link = element('a');
    link.href = '/torrents?upcoming=1&view=card';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const icon = element('i', 'fas fa-calendar-alt');
    icon.setAttribute('aria-hidden', 'true');
    link.append(icon, ' Upcoming');
    item.append(link);
    menu.append(item);
  }

  function renderHomeEpisodes(container, releases, records, checked = false) {
    container.replaceChildren();
    for (const release of todaysEpisodes(releases)) {
      const row = element('li', 'unit3d-upcoming__today-row');
      const title = element(
        'a',
        'unit3d-upcoming__today-title',
        release.seriesTitle || 'Unknown series'
      );
      title.href = searchUrl(release.seriesImdbId || release.imdbId);
      const resolutions = element('span', 'unit3d-upcoming__resolutions');
      const available = episodeResolutions(release, records);
      for (const resolution of HOME_RESOLUTIONS) {
        const torrentId = available.get(resolution);
        const icon = element(torrentId ? 'a' : 'span', 'unit3d-upcoming__resolution', resolution);
        if (torrentId) icon.href = `${location.origin}/torrents/${torrentId}`;
        const found = available.has(resolution);
        icon.dataset.available = String(found);
        const status = found
          ? 'Available on site (saved match)'
          : checked
            ? 'Not found in recent site results'
            : 'Availability not checked';
        icon.title = `${resolution}: ${status}`;
        icon.setAttribute('aria-label', icon.title);
        resolutions.append(icon);
      }
      row.append(title, resolutions);
      container.append(row);
    }
  }

  function mountHomePanel() {
    const saved = GM_getValue(SETTINGS_KEY, {});
    if (
      location.hostname !== 'aither.cc' ||
      location.pathname !== '/' ||
      saved?.homePanel !== true ||
      document.getElementById(HOME_PANEL_ID)
    )
      return;
    const content = document.querySelector('main.page__home > article');
    if (!content) return;
    const page = content.parentElement;
    const style = element('style');
    style.textContent = `
      main.page__home.unit3d-upcoming__home-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
      main.page__home.unit3d-upcoming__home-layout > article { min-width: 0; }
      .unit3d-upcoming__home-sidebar { min-width: 0; }
      @media (min-width: 1100px) {
        main.page__home.unit3d-upcoming__home-layout { grid-template-columns: 320px minmax(0, 1fr); }
      }
      #${HOME_PANEL_ID} .panel__header { flex-wrap: nowrap; align-items: center; }
      #${HOME_PANEL_ID} .panel__actions { margin-inline-start: auto; flex-shrink: 0; }
      #${HOME_PANEL_ID} .unit3d-upcoming__today-list { list-style: none; margin: 0; padding: 0; }
      #${HOME_PANEL_ID} .unit3d-upcoming__today-row { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; padding: 6px 0; }
      #${HOME_PANEL_ID} .unit3d-upcoming__today-title { min-width: 0; overflow-wrap: anywhere; }
      #${HOME_PANEL_ID} .unit3d-upcoming__resolutions { display: flex; flex-shrink: 0; gap: 5px; }
      #${HOME_PANEL_ID} .unit3d-upcoming__resolution { display: inline-block; border: 1px solid currentColor; border-radius: 3px; padding: 1px 4px; font-size: 10px; font-weight: 700; line-height: 1.4; opacity: 0.5; }
      #${HOME_PANEL_ID} .unit3d-upcoming__resolution[data-available="true"] { color: #fff; background: #21743b; border-color: #21743b; opacity: 1; }
      #${HOME_PANEL_ID} .unit3d-upcoming__today-status { margin: 6px 0 0; }
      #${HOME_PANEL_ID} .unit3d-upcoming__today-status:empty { display: none; }
    `;
    document.head.append(style);
    const panel = element('section', 'panelV2');
    panel.id = HOME_PANEL_ID;
    const header = element('header', 'panel__header');
    header.append(element('h2', 'panel__heading', 'Today’s episodes'));
    const actions = element('div', 'panel__actions');
    const refreshButton = element('button', 'panel__action', 'Refresh');
    refreshButton.type = 'button';
    actions.append(refreshButton);
    header.append(actions);
    const body = element('div', 'panel__body');
    const list = element('ul', 'unit3d-upcoming__today-list');
    const status = element('p', 'unit3d-upcoming__today-status');
    status.setAttribute('role', 'status');
    body.append(list, status);
    panel.append(header, body);
    const sidebar = element('aside', 'unit3d-upcoming__home-sidebar');
    sidebar.setAttribute('aria-label', 'Today’s episodes');
    sidebar.append(panel);
    page.classList.add('unit3d-upcoming__home-layout');
    page.prepend(sidebar);
    let releases = [];
    let records = [];
    let checked = false;
    let busy = false;
    let timer;

    async function refresh(force = false) {
      if (busy) return;
      clearTimeout(timer);
      if (document.hidden) return;
      busy = true;
      refreshButton.disabled = true;
      const apiKey = savedApiKey();
      if (!apiKey) {
        records = [];
        checked = false;
      }
      renderHomeEpisodes(list, releases, records, checked);
      status.textContent = 'Loading today’s episodes…';
      let retryAfter;
      try {
        const [calendar, torrents] = await Promise.allSettled([
          loadReleases(
            {
              mode: 'episodes',
              country: COUNTRIES.includes(saved.country) ? saved.country : 'US',
              language: Object.hasOwn(IMDB_LANGUAGES, saved.language) ? saved.language : 'en-US',
              titleCountry: COUNTRIES.includes(saved.titleCountry) ? saved.titleCountry : ''
            },
            () => {},
            force
          ),
          apiKey ? loadRecentTorrents('tv', apiKey, force) : Promise.resolve(null)
        ]);
        const notices = [];
        if (calendar.status === 'fulfilled') {
          releases = calendar.value.releases;
          notices.push(...calendar.value.notices);
          if (!todaysEpisodes(releases).length) notices.push('No episodes scheduled for today.');
        } else notices.push('Could not load today’s episodes. Use Refresh to retry.');
        if (apiKey && savedApiKey() === apiKey) {
          if (torrents.status === 'fulfilled' && !torrents.value.cancelled) {
            records = torrents.value.records || [];
            checked = Boolean(torrents.value.savedAt);
            retryAfter = torrents.value.retryAfter;
          } else if (torrents.status === 'rejected') {
            records = torrents.reason.records || [];
            checked = false;
            notices.push('Site check failed. Saved matches are still shown; use Refresh to retry.');
          }
        } else {
          records = [];
          checked = false;
          notices.push('Save your Aither API key in Upcoming → Settings to check availability.');
        }
        renderHomeEpisodes(list, releases, records, checked);
        status.textContent = notices.join(' ');
      } finally {
        busy = false;
        refreshButton.disabled = false;
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        timer = setTimeout(
          () => void refresh(Boolean(retryAfter) && force),
          Math.min(retryAfter || TORRENT_CACHE_TTL, midnight - now)
        );
      }
    }
    refreshButton.addEventListener('click', () => void refresh(true));
    document.addEventListener('visibilitychange', () => void refresh());
    void refresh();
  }

  function mountPage() {
    const main = document.querySelector('main');
    if (!main || document.getElementById(ROOT_ID)) {
      initialStyle?.remove();
      initialLoading?.remove();
      return;
    }
    const style = element('style');
    style.textContent = `
      #${ROOT_ID} > .panel__body { margin-block: 0; }
      #${ROOT_ID} > .panel__body:not(.torrent-search--card__results) { padding-block: 6px; }
      #${ROOT_ID} > .torrent-search--card__results { padding-top: 10px; }
      #${ROOT_ID} > p.panel__body:empty { display: none; }
      #${ROOT_ID} > [hidden] { display: none; }
      #${ROOT_ID} .unit3d-upcoming__controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
      #${ROOT_ID} .unit3d-upcoming__controls label { display: flex; align-items: center; gap: 6px; }
      #${ROOT_ID} .unit3d-upcoming__controls [hidden] { display: none; }
      #${ROOT_ID} .unit3d-upcoming__month { display: inline-block; width: auto; min-width: 0; flex: 0 0 auto; }
      #${ROOT_ID} :is(.unit3d-upcoming__settings, .unit3d-upcoming__search) summary { cursor: pointer; width: fit-content; }
      #${ROOT_ID} :is(.unit3d-upcoming__settings, .unit3d-upcoming__search) form { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 8px; }
      #${ROOT_ID} :is(.unit3d-upcoming__settings, .unit3d-upcoming__search) label { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
      #${ROOT_ID} :is(.unit3d-upcoming__settings, .unit3d-upcoming__search) > p { margin: 6px 0; }
      #${ROOT_ID} .unit3d-upcoming__search input[type="search"] { width: 200px; max-width: 100%; }
      #${ROOT_ID} .unit3d-upcoming__search select { width: auto; }
      #${ROOT_ID} .unit3d-upcoming__search-field { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
      #${ROOT_ID} .unit3d-upcoming__hidden-series { margin-top: 8px; }
      #${ROOT_ID} .unit3d-upcoming__hidden-series ul { margin: 8px 0 0; padding: 0; list-style: none; }
      #${ROOT_ID} .unit3d-upcoming__hidden-series li { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
      #${ROOT_ID} .unit3d-upcoming__hidden-series a { min-width: 0; overflow-wrap: anywhere; }
      #${ROOT_ID} .unit3d-upcoming__hidden-series button { flex-shrink: 0; }
      #${ROOT_ID} .unit3d-upcoming__hide-series { border: 0; padding: 0; margin-left: 8px; background: none; color: inherit; font: inherit; cursor: pointer; flex-shrink: 0; }
      #${ROOT_ID} .unit3d-upcoming__more { text-align: center; }
      #${ROOT_ID} .unit3d-upcoming__settings input[type="password"] { width: 300px; max-width: 100%; }
      #${ROOT_ID} .unit3d-upcoming__width { margin-top: 8px; width: fit-content; }
      #${ROOT_ID} .unit3d-upcoming__recent { color: #49b78c; margin-right: 5px; }
      #${ROOT_ID} .torrent-card[data-recent="true"] { outline: 1px solid #49b78c; }
      #${ROOT_ID} .unit3d-upcoming__date { grid-column: 1 / -1; margin: 0; font-size: 1.4em; }
      #${ROOT_ID} .torrent-card { min-width: 0; grid-template-columns: 147px minmax(0, 1fr); }
      #${ROOT_ID} .torrent-card__header { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; }
      #${ROOT_ID} .torrent-card__left-header { overflow: hidden; text-overflow: ellipsis; }
      #${ROOT_ID} .torrent-card__rating { grid-column: 2; text-align: center; }
      #${ROOT_ID} .torrent-card__right-header { grid-column: 3; justify-self: end; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #${ROOT_ID}[data-combined="true"] .unit3d-upcoming__type--theatrical { color: color-mix(in srgb, var(--torrent-card-head-fg, currentColor) 35%, #dd9500); }
      #${ROOT_ID}[data-combined="true"] .unit3d-upcoming__type--digital { color: color-mix(in srgb, var(--torrent-card-head-fg, currentColor) 35%, #00aa77); }
      #${ROOT_ID}[data-combined="true"] .unit3d-upcoming__type--tv { color: color-mix(in srgb, var(--torrent-card-head-fg, currentColor) 35%, #508fef); }
      #${ROOT_ID}[data-combined="true"] .unit3d-upcoming__type--episodes { color: color-mix(in srgb, var(--torrent-card-head-fg, currentColor) 35%, #b777ed); }
      #${ROOT_ID} .torrent-card__figure { margin: 0; }
      #${ROOT_ID} .torrent-card__image { object-fit: cover; }
      #${ROOT_ID} .unit3d-upcoming__poster { display: block; border: 0; padding: 0; background: none; cursor: zoom-in; }
      #${ROOT_ID} .torrent-card__body { min-width: 0; min-height: 0; gap: 8px; }
      #${ROOT_ID} .torrent-card__title { max-height: 4.5em; overflow: auto; flex-shrink: 0; }
      #${ROOT_ID} .torrent-card__plot { margin: 0; }
      #${ROOT_ID} .torrent-card__body:has(.unit3d-upcoming__arr-actions:not([hidden])) .torrent-card__plot { flex: 1; min-height: 0; }
      #${ROOT_ID} .unit3d-upcoming__arr-actions { display: flex; flex-wrap: wrap; gap: 4px 10px; flex-shrink: 0; max-height: 56px; overflow: auto; font-size: 11px; }
      #${ROOT_ID} .unit3d-upcoming__arr-actions[hidden] { display: none; }
      #${ROOT_ID} .unit3d-upcoming__arr-actions a { color: #49b78c; }
      #${ROOT_ID} .unit3d-upcoming__arr-add { padding: 0; border: 0; background: none; color: #f1c40f; font: inherit; cursor: pointer; }
      #${ROOT_ID} .unit3d-upcoming__arr-feedback { flex-basis: 100%; overflow-wrap: anywhere; }
      #${ROOT_ID} .unit3d-upcoming__arr-settings { margin-top: 8px; }
      #${ROOT_ID} .unit3d-upcoming__arr-server { margin: 8px 0 8px 12px; }
      #${ROOT_ID} .unit3d-upcoming__arr-server p { margin: 6px 0; overflow-wrap: anywhere; }
      :is(#${ROOT_ID} .unit3d-upcoming__arr-server, .unit3d-upcoming__arr-dialog) fieldset { display: flex; flex-wrap: wrap; gap: 10px; min-width: 0; width: 100%; padding: 0; margin: 0; border: 0; }
      :is(#${ROOT_ID} .unit3d-upcoming__arr-server, .unit3d-upcoming__arr-dialog) label { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; max-width: 100%; }
      :is(#${ROOT_ID} .unit3d-upcoming__arr-server, .unit3d-upcoming__arr-dialog) :is(input:not([type="checkbox"]), select) { width: auto; min-width: 0; max-width: min(320px, 100%); }
      :is(#${ROOT_ID} .unit3d-upcoming__arr-server, .unit3d-upcoming__arr-dialog) input[type="checkbox"] { width: auto; }
      #${ROOT_ID} .unit3d-upcoming__arr-option-area { flex-basis: 100%; min-width: 0; }
      .unit3d-upcoming__arr-dialog { width: min(680px, calc(100vw - 32px)); box-sizing: border-box; max-height: 90vh; overflow: auto; padding: 20px; border: 1px solid #777; border-radius: 5px; background: var(--torrent-card-bg, #222); color: var(--torrent-card-fg, #eee); }
      .unit3d-upcoming__arr-dialog::backdrop { background: rgba(0, 0, 0, 0.65); }
      .unit3d-upcoming__arr-dialog h2 { margin: 0 0 15px; font-size: 18px; overflow-wrap: anywhere; }
      .unit3d-upcoming__arr-dialog form { display: flex; flex-direction: column; gap: 14px; }
      .unit3d-upcoming__arr-dialog p { margin: 0; overflow-wrap: anywhere; }
      .unit3d-upcoming__arr-dialog-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
      #${ROOT_ID} .torrent-card__left-footer { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #${ROOT_ID} .torrent-card__left-footer a, #${ROOT_ID} .torrent-card__right-header a { color: inherit; }
      #${ROOT_ID} .torrent-card__right-footer { margin: 0 0 0 8px; flex-shrink: 0; }
      #${ROOT_ID} :is(.unit3d-upcoming__status, .unit3d-upcoming__message) { white-space: pre-line; }
      .unit3d-upcoming__lightbox { background: transparent; border: 0; box-sizing: border-box; height: 100vh; width: 100vw; margin: 0; max-height: none; max-width: none; padding: 4vh 4vw; }
      .unit3d-upcoming__lightbox::backdrop { background: rgba(0, 0, 0, 0.88); }
      .unit3d-upcoming__lightbox > img { display: block; height: 92vh; max-width: 92vw; width: auto; margin: 0 auto; object-fit: contain; }
      .unit3d-upcoming__lightbox-close { position: fixed; top: 18px; right: 18px; width: 48px; height: 48px; padding: 0; border: 0; border-radius: 50%; background: rgba(0, 0, 0, 0.65); color: #fff; cursor: pointer; font-size: 36px; line-height: 1; }
    `;
    document.head.append(style);
    const saved = GM_getValue(SETTINGS_KEY, {});
    const panel = element('section', 'panelV2 torrent-search__results');
    panel.id = ROOT_ID;
    const header = element('header', 'panel__header');
    header.append(element('h1', 'panel__heading', 'Upcoming'));
    const controls = element('div', 'panel__body unit3d-upcoming__controls');
    const mode = element('select', 'form__select');
    Object.entries(RELEASE_VIEWS).forEach(([value, view]) =>
      mode.append(new Option(view.label, value))
    );
    mode.value = Object.hasOwn(RELEASE_VIEWS, saved?.mode) ? saved.mode : 'theatrical';
    const country = element('select', 'form__select');
    const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
    COUNTRIES.map((code) => [code, countryNames.of(code)])
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([code, name]) => country.append(new Option(name, code)));
    country.value = COUNTRIES.includes(saved?.country) ? saved.country : 'US';
    const countryLabel = element('label', null, 'Country');
    const modeLabel = element('label', null, 'Releases');
    countryLabel.append(country);
    modeLabel.append(mode);
    const previous = element('button', 'form__button form__button--outlined', '← Previous month');
    const current = element('button', 'form__button form__button--outlined', 'This month');
    const next = element('button', 'form__button form__button--outlined', 'Next month →');
    const refresh = element('button', 'form__button form__button--outlined', 'Refresh');
    const monthSelect = element('select', 'form__select unit3d-upcoming__month');
    monthSelect.setAttribute('aria-label', 'Month');
    const episodeWindow = element('span');
    episodeWindow.hidden = true;
    const episodeSonarrFilter = element('select', 'form__select');
    episodeSonarrFilter.append(
      new Option('All series', 'all'),
      new Option('In Sonarr', 'in'),
      new Option('Not in Sonarr', 'out')
    );
    episodeSonarrFilter.value = ['all', 'in', 'out'].includes(saved?.episodeSonarrFilter)
      ? saved.episodeSonarrFilter
      : 'all';
    const episodeSonarrLabel = element('label', null, 'Sonarr');
    episodeSonarrLabel.append(episodeSonarrFilter);
    episodeSonarrLabel.hidden = true;
    let month = monthRange(new Date()).from.slice(0, 7);
    let fromToday = true;
    controls.append(
      modeLabel,
      countryLabel,
      previous,
      monthSelect,
      next,
      current,
      episodeWindow,
      episodeSonarrLabel,
      refresh
    );
    const settings = element('details', 'panel__body unit3d-upcoming__settings');
    settings.append(element('summary', null, 'Settings'));
    const widthLabel = element('label', 'unit3d-upcoming__width');
    const fullWidth = element('input');
    fullWidth.type = 'checkbox';
    fullWidth.checked = saved?.fullWidth !== false;
    widthLabel.append(fullWidth, 'Full page width');
    settings.append(widthLabel);
    const homeLabel = element('label');
    const homePanel = element('input');
    homePanel.type = 'checkbox';
    homePanel.checked = saved?.homePanel === true;
    homeLabel.append(homePanel, 'Show today’s episodes in the left homepage sidebar');
    settings.append(homeLabel);
    homePanel.addEventListener('change', () => saveSettings());
    const languageLabel = element('label', null, 'IMDb language');
    const language = element('select', 'form__select');
    Object.entries(IMDB_LANGUAGES).forEach(([code, name]) =>
      language.append(new Option(name, code))
    );
    language.value = Object.hasOwn(IMDB_LANGUAGES, saved?.language) ? saved.language : 'en-US';
    languageLabel.append(language);
    const languageHint = element(
      'p',
      null,
      'IMDb plots, genres and other details use this language where available, with English fallback.'
    );
    languageHint.id = `${ROOT_ID}-language-hint`;
    language.setAttribute('aria-describedby', languageHint.id);
    settings.append(languageLabel, languageHint);
    const titleCountryLabel = element('label', null, 'Title country / region (AKA)');
    const titleCountry = element('select', 'form__select');
    titleCountry.append(new Option('Use release country', ''));
    for (const option of country.options)
      titleCountry.append(new Option(option.text, option.value));
    titleCountry.value = COUNTRIES.includes(saved?.titleCountry) ? saved.titleCountry : '';
    titleCountryLabel.append(titleCountry);
    const titleCountryHint = element(
      'p',
      null,
      'Regional titles (AKAs) are available for more countries than translated plots and details. This title preference does not change the release-country filter or IMDb language setting. IMDb uses your language preference where possible and falls back when no matching regional title exists.'
    );
    titleCountryHint.id = `${ROOT_ID}-title-country-hint`;
    titleCountry.setAttribute('aria-describedby', titleCountryHint.id);
    settings.append(titleCountryLabel, titleCountryHint);
    const settingsForm = element('form');
    const apiLabel = element('label', null, 'API KEY');
    const apiInput = element('input', 'form__text');
    apiInput.type = 'password';
    apiInput.autocomplete = 'off';
    apiInput.required = true;
    apiInput.setAttribute('aria-label', 'API KEY');
    apiLabel.append(apiInput);
    const saveKey = element('button', 'form__button form__button--outlined', 'Save');
    saveKey.type = 'submit';
    const removeKey = element('button', 'form__button form__button--outlined', 'Remove key');
    removeKey.type = 'button';
    const settingsStatus = element('span');
    settingsStatus.setAttribute('role', 'status');
    settingsForm.append(apiLabel, saveKey, removeKey, settingsStatus);
    settings.append(settingsForm);
    const hiddenSeries = element('details', 'unit3d-upcoming__hidden-series');
    const hiddenSummary = element('summary');
    const hiddenList = element('ul');
    hiddenSeries.append(hiddenSummary, hiddenList);
    settings.append(hiddenSeries);
    const searchPanel = element('details', 'panel__body unit3d-upcoming__search');
    searchPanel.append(element('summary', null, 'Search'));
    const searchForm = element('form');
    const searchInputs = {};
    const searchOptions = {};
    const searchHint = element(
      'p',
      null,
      'Separate names or genres with commas. All requires every entry; Any requires at least one. Exclude removes matching releases.'
    );
    searchHint.id = `${ROOT_ID}-search-hint`;
    for (const [field, label] of Object.entries({
      title: 'Title',
      name: 'Cast or director',
      genre: 'Genre'
    })) {
      const input = element('input', 'form__text');
      input.type = 'search';
      input.autocomplete = 'off';
      const fieldLabel = element('label', null, label);
      fieldLabel.append(input);
      const fieldGroup = element('div', 'unit3d-upcoming__search-field');
      fieldGroup.append(fieldLabel);
      if (field !== 'title') {
        input.setAttribute('aria-describedby', searchHint.id);
        const match = element('select', 'form__select');
        match.setAttribute('aria-label', `${label} matching`);
        match.append(new Option('All', 'all'), new Option('Any', 'any'));
        const exclude = element('input');
        exclude.type = 'checkbox';
        exclude.setAttribute('aria-label', `Exclude matching ${label.toLowerCase()}`);
        const excludeLabel = element('label');
        excludeLabel.append(exclude, 'Exclude');
        fieldGroup.append(match, excludeLabel);
        searchOptions[field] = { match, exclude };
      }
      searchForm.append(fieldGroup);
      searchInputs[field] = input;
    }
    const clearSearch = element('button', 'form__button form__button--outlined', 'Clear');
    clearSearch.type = 'button';
    searchForm.append(clearSearch);
    const searchStatus = element('p');
    searchStatus.setAttribute('role', 'status');
    searchPanel.append(searchForm, searchHint, searchStatus);
    function updateKeyField() {
      apiInput.value = '';
      apiInput.placeholder = savedApiKey() ? '•••••••• (saved)' : 'Enter this site’s API key';
      removeKey.disabled = !savedApiKey();
    }
    updateKeyField();
    const source = element('p', 'panel__body');
    const status = element('p', 'unit3d-upcoming__status');
    status.setAttribute('role', 'status');
    const apiStatus = element('p', 'unit3d-upcoming__api-status');
    apiStatus.setAttribute('role', 'status');
    const backgroundStatus = element('p', 'unit3d-upcoming__background-status');
    settings.append(status, apiStatus, backgroundStatus);
    const message = element('p', 'panel__body unit3d-upcoming__message');
    message.setAttribute('role', 'status');
    const results = element('div', 'panel__body torrent-search--card__results');
    const moreRow = element('div', 'panel__body unit3d-upcoming__more');
    const more = element('button', 'form__button form__button--outlined', 'Load more releases');
    more.type = 'button';
    moreRow.append(more);
    moreRow.hidden = true;
    panel.append(header, controls, settings, searchPanel, source, message, results, moreRow);
    // The native card wrapper expands past the standard main margins when enabled.
    const page = element('div', 'torrent-search__component');
    page.classList.toggle('page__torrents', fullWidth.checked);
    page.append(panel);
    const article = element('article');
    article.append(page);
    main.replaceChildren(article);
    document.title = `Upcoming — ${location.hostname}`;
    let generation = 0;
    let calendar;
    let torrentGeneration = 0;
    let torrentRetry;
    let torrentMatches = [];
    let searching = false;
    let searchTimer;
    let visibleReleases = [];
    let renderedCount = 0;
    let backgroundGeneration = 0;
    let backgroundTimer;
    const arr = mountArrIntegration(settings, results, (type) => {
      if (
        type === 'sonarr' &&
        (calendar || searching) &&
        mode.value === 'episodes' &&
        episodeSonarrFilter.value !== 'all'
      )
        updateVisibleReleases(true);
    });

    function renderHiddenSeries() {
      const entries = readHiddenSeries().sort((a, b) => a.title.localeCompare(b.title));
      hiddenSummary.textContent = `Hidden series (${entries.length})`;
      hiddenList.replaceChildren();
      if (!entries.length) hiddenList.append(element('li', null, 'No hidden series.'));
      for (const entry of entries) {
        const row = element('li');
        const restore = element('button', 'form__button form__button--outlined', 'Unhide');
        restore.type = 'button';
        restore.setAttribute('aria-label', `Unhide ${entry.title}`);
        restore.addEventListener('click', () => {
          setSeriesHidden(entry, false);
          renderHiddenSeries();
          updateVisibleReleases(true);
        });
        row.append(
          externalLink(
            `${entry.title} (${entry.imdbId})`,
            `https://www.imdb.com/title/${entry.imdbId}/`
          ),
          restore
        );
        hiddenList.append(row);
      }
    }
    renderHiddenSeries();
    results.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-hide-series]');
      if (!button) return;
      const release = visibleReleases.find(
        (item) => item.mode === 'episodes' && item.seriesImdbId === button.dataset.hideSeries
      );
      if (!release) return;
      setSeriesHidden({ imdbId: release.seriesImdbId, title: release.seriesTitle }, true);
      renderHiddenSeries();
      updateVisibleReleases(true);
    });

    function searchFilters() {
      return Object.fromEntries(
        Object.entries(searchInputs).map(([field, input]) => [field, input.value.trim()])
      );
    }

    function appendReleases(count = CARD_PAGE_SIZE) {
      const next = visibleReleases.slice(renderedCount, renderedCount + count);
      renderReleases(results, next, true, visibleReleases[renderedCount - 1]?.date);
      renderedCount += next.length;
      moreRow.hidden = renderedCount >= visibleReleases.length;
      markRecentTorrents(torrentMatches);
      arr.update();
    }

    function updateVisibleReleases(keepCount = false) {
      const previousCount = renderedCount;
      const region = RELEASE_VIEWS[mode.value].modes.includes('digital') ? 'US' : country.value;
      const releases = filterEpisodes(
        searching
          ? searchReleases(
              [
                ...readReleaseCache(language.value, titleCountry.value).flatMap(
                  (entry) => entry.releases
                ),
                ...(calendar?.releases || [])
              ].filter((release) => release.country === region),
              searchFilters(),
              Object.fromEntries(
                Object.entries(searchOptions).map(([field, controls]) => [
                  field,
                  { match: controls.match.value, exclude: controls.exclude.checked }
                ])
              )
            )
          : calendar?.releases || []
      );
      const sonarrFilter = mode.value === 'episodes' ? episodeSonarrFilter.value : 'all';
      const membership = sonarrFilter === 'all' ? null : sonarrSeriesMembership();
      visibleReleases = filterSonarrEpisodes(releases, sonarrFilter, membership || undefined);
      panel.dataset.combined = String(searching || RELEASE_VIEWS[mode.value].modes.length > 1);
      results.replaceChildren();
      renderedCount = 0;
      appendReleases(keepCount ? Math.max(CARD_PAGE_SIZE, previousCount) : CARD_PAGE_SIZE);
      searchStatus.textContent = `${searching ? `${visibleReleases.length} matching releases. ` : ''}Search all cached months and release types for the selected country and language. Results update as background months load.`;
      if (calendar) {
        const notices = [...calendar.notices];
        if (membership && !membership.complete)
          notices.push(
            arr.hasLibraryError('sonarr')
              ? 'Sonarr libraries could not be checked. Check the servers in Settings, then use Refresh to retry.'
              : 'Checking Sonarr libraries…'
          );
        if (!notices.length && !searching && !visibleReleases.length)
          notices.push(
            `No releases found for ${mode.value === 'episodes' ? 'the next 30 days' : 'this month'}.`
          );
        message.textContent = notices.join('\n');
      }
    }

    function updateSearch() {
      clearTimeout(searchTimer);
      const wasSearching = searching;
      searching = Object.values(searchFilters()).some(Boolean);
      updateVisibleReleases();
      if (searching !== wasSearching) void refreshTorrentMatches();
    }
    searchForm.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(updateSearch, 200);
    });
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      updateSearch();
    });
    clearSearch.addEventListener('click', () => {
      Object.values(searchInputs).forEach((input) => {
        input.value = '';
      });
      Object.values(searchOptions).forEach(({ match, exclude }) => {
        match.value = 'all';
        exclude.checked = false;
      });
      updateSearch();
    });
    more.addEventListener('click', () => appendReleases());
    const scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !moreRow.hidden) appendReleases();
      },
      { rootMargin: '400px' }
    );
    scrollObserver.observe(moreRow);

    async function prefetchMonths(region, token) {
      const selectedLanguage = language.value;
      const selectedTitleCountry = titleCountry.value;
      if (mode.value === 'episodes') {
        backgroundStatus.textContent = 'Episodes are limited to the current 30-day window.';
        return;
      }
      const currentMonth = monthRange(new Date()).from.slice(0, 7);
      const months = [...new Set([month, ...calendarMonths(currentMonth)])];
      const notices = [];
      for (const value of months) {
        for (const releaseMode of region === 'US' ? ['all'] : ['theatrical', 'tv']) {
          if (token !== backgroundGeneration) return;
          backgroundStatus.textContent = `Caching releases for ${value}…`;
          try {
            const data = await loadReleases(
              {
                ...monthRange(new Date(`${value}-01T12:00:00`)),
                mode: releaseMode,
                country: region,
                language: selectedLanguage,
                titleCountry: selectedTitleCountry
              },
              () => {}
            );
            if (token !== backgroundGeneration) return;
            notices.push(...data.notices);
            if (searching && !data.cached) updateVisibleReleases(true);
          } catch (error) {
            notices.push(error.message);
          }
        }
      }
      if (token !== backgroundGeneration) return;
      backgroundStatus.textContent = `Background caching finished for ${months.length} months.${notices.length ? ` Some sources could not be cached: ${[...new Set(notices)].join(' ')}` : ''}`;
    }

    function saveSettings() {
      GM_setValue(SETTINGS_KEY, {
        mode: mode.value,
        country: country.value,
        language: language.value,
        titleCountry: titleCountry.value,
        fullWidth: fullWidth.checked,
        homePanel: homePanel.checked,
        episodeSonarrFilter: episodeSonarrFilter.value
      });
    }

    fullWidth.addEventListener('change', () => {
      page.classList.toggle('page__torrents', fullWidth.checked);
      saveSettings();
    });

    function markRecentTorrents(records = []) {
      torrentMatches = records;
      const matches = new Set(records.map((record) => record.imdbId));
      const episodes = new Set(
        records
          .filter((record) => record.categoryId === 2)
          .flatMap((record) => (record.episodeKeys || []).map((key) => `${record.imdbId}:${key}`))
      );
      for (const card of results.querySelectorAll('.torrent-card')) {
        const isEpisode = card.dataset.episodeKey !== undefined;
        const found = isEpisode
          ? episodes.has(`${card.dataset.imdbId}:${card.dataset.episodeKey}`)
          : matches.has(card.dataset.imdbId);
        card.dataset.recent = String(found);
        const link = card.querySelector('.torrent-card__right-footer');
        const title = card.querySelector('.torrent-card__title').textContent;
        link.replaceChildren();
        if (found) {
          const marker = element('span', 'unit3d-upcoming__recent', '●');
          marker.setAttribute('aria-hidden', 'true');
          link.append(marker);
        }
        link.append(found ? 'View torrents' : 'Search torrents');
        link.title = found
          ? `Matching ${isEpisode ? 'series, season and episode' : 'IMDb ID'} in torrent results saved during the past 14 days.`
          : '';
        link.setAttribute(
          'aria-label',
          `${found ? 'View' : 'Search'} torrents for ${title}${found ? ' (saved match)' : ''}`
        );
      }
    }

    async function refreshTorrentMatches(force = false) {
      const requestGeneration = ++torrentGeneration;
      clearTimeout(torrentRetry);
      const apiKey = savedApiKey();
      if (!apiKey) {
        apiStatus.textContent = '';
        markRecentTorrents();
        return;
      }
      const scope =
        searching || mode.value === 'all'
          ? 'all'
          : mode.value === 'tv' || mode.value === 'episodes'
            ? 'tv'
            : 'movies';
      apiStatus.textContent = 'Checking recent torrents…';
      try {
        const data = await loadRecentTorrents(scope, apiKey, force, (progress) => {
          if (requestGeneration !== torrentGeneration || savedApiKey() !== apiKey) return;
          markRecentTorrents(progress.records);
          apiStatus.textContent = `Checking recent torrents… ${progress.pages} of up to 3 pages checked.`;
        });
        if (requestGeneration !== torrentGeneration || savedApiKey() !== apiKey || data.cancelled)
          return;
        markRecentTorrents(data.records);
        if (data.retryAfter) {
          apiStatus.textContent = `Checking recent torrents in ${Math.ceil(data.retryAfter / 1000)} seconds…`;
          torrentRetry = setTimeout(() => void refreshTorrentMatches(force), data.retryAfter);
        } else {
          const marker = element('span', 'unit3d-upcoming__recent', '●');
          marker.setAttribute('aria-hidden', 'true');
          apiStatus.replaceChildren(
            marker,
            `Saved torrent match · Latest ${scope === 'all' ? 'movie/TV' : scope === 'tv' ? 'TV' : 'movie'} results checked at ${new Date(data.savedAt).toLocaleTimeString()}.${data.cached ? ' Cached for up to 2 minutes.' : ''} Matches retained for 14 days.`
          );
        }
      } catch (error) {
        if (requestGeneration !== torrentGeneration) return;
        markRecentTorrents(error.records);
        apiStatus.textContent = `Recent torrents could not be checked.${error.records?.length ? ' Matches saved during the past 14 days are still shown.' : ''} Check the API key in Settings, then use Refresh to retry.`;
      }
    }

    settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const apiKey = apiInput.value.trim();
      if (!apiKey || /\s/.test(apiKey)) {
        settingsStatus.textContent = 'Enter an API key without spaces.';
        return;
      }
      if (apiKey !== savedApiKey()) GM_setValue(TORRENT_CACHE_KEY, encodeStored(null));
      GM_setValue(API_KEY_STORAGE, encodeStored(apiKey));
      updateKeyField();
      settingsStatus.textContent = `API key saved for ${location.hostname}.`;
      void refreshTorrentMatches();
    });
    removeKey.addEventListener('click', () => {
      GM_setValue(API_KEY_STORAGE, encodeStored(''));
      GM_setValue(TORRENT_CACHE_KEY, encodeStored(null));
      updateKeyField();
      settingsStatus.textContent = 'API key removed.';
      void refreshTorrentMatches();
    });

    function renderCalendar() {
      const visible = calendar.releases;
      updateVisibleReleases();
      status.textContent = `${visible.length ? `${visible.length} releases` : 'No releases found'} for ${mode.value === 'episodes' ? 'the next 30 days' : `this month${fromToday ? ' from today' : ''}`}.${calendar.cached ? ' Cached for up to 6 hours; Refresh checks for updates.' : ''}${calendar.notices.length ? `\n${calendar.notices.join('\n')}` : ''}`;

      const selectedModes = RELEASE_VIEWS[mode.value].modes;
      const includesDigital = selectedModes.includes('digital');
      const region = includesDigital ? 'US' : country.value;
      source.replaceChildren();
      if (selectedModes.includes('theatrical') || includesDigital) {
        source.append(
          externalLink('IMDb movies', `https://www.imdb.com/calendar/?region=${region}&type=MOVIE`)
        );
      }
      if (selectedModes.includes('tv')) {
        if (source.childNodes.length) source.append(' + ');
        source.append(
          externalLink('IMDb TV', `https://www.imdb.com/calendar/?region=${region}&type=TV`)
        );
      }
      if (selectedModes.includes('episodes')) {
        source.append(
          externalLink(
            'IMDb episodes',
            `https://www.imdb.com/calendar/?region=${region}&type=TV_EPISODE`
          )
        );
      }
      if (includesDigital) {
        source.append(
          ' + ',
          externalLink(
            'DVD Release Dates (US)',
            `${DVD_ORIGIN}/digital-releases/${month.slice(0, 4)}/${Number(month.slice(5))}/`
          )
        );
      }
      source.append(' · Only releases with a confirmed day are shown.');
    }

    async function refreshPage(force = false) {
      const requestGeneration = ++generation;
      calendar = undefined;
      const backgroundToken = ++backgroundGeneration;
      clearTimeout(backgroundTimer);
      ++torrentGeneration;
      clearTimeout(torrentRetry);
      apiStatus.textContent = '';
      const today = new Date();
      monthSelect.replaceChildren(
        ...calendarMonths(month, today).map(
          (value) =>
            new Option(
              new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric'
              }),
              value
            )
        )
      );
      monthSelect.value = month;
      const selectedModes = RELEASE_VIEWS[mode.value].modes;
      const includesDigital = selectedModes.includes('digital');
      const episodes = mode.value === 'episodes';
      const options = {
        ...(episodes ? episodeRange(today) : monthRange(new Date(`${month}-01T12:00:00`))),
        mode: mode.value,
        country: includesDigital ? 'US' : country.value,
        language: language.value,
        titleCountry: titleCountry.value
      };
      if (!episodes && fromToday && month === monthRange(today).from.slice(0, 7)) {
        options.from = dateValue({
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate()
        });
      }
      countryLabel.hidden = includesDigital;
      [monthSelect, previous, current, next].forEach((control) => {
        control.hidden = episodes;
      });
      episodeWindow.hidden = !episodes;
      episodeSonarrLabel.hidden = !episodes;
      episodeWindow.textContent = episodes
        ? `Next 30 days · ${[options.from, options.to].map((value) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })).join(' – ')}`
        : '';
      panel.dataset.combined = String(selectedModes.length > 1);
      status.textContent = 'Loading releases…';
      message.textContent = 'Loading releases…';
      source.replaceChildren();
      results.replaceChildren();
      moreRow.hidden = true;
      results.setAttribute('aria-busy', 'true');
      // Serialize UI requests; a generation check also protects against delayed callbacks.
      [
        mode,
        country,
        language,
        titleCountry,
        episodeSonarrFilter,
        monthSelect,
        previous,
        current,
        next,
        refresh
      ].forEach((control) => {
        control.disabled = true;
      });
      const onProgress = (text) => {
        if (requestGeneration === generation) {
          status.textContent = text;
          message.textContent = text;
          if (initialLoading) initialLoading.textContent = text;
        }
      };
      try {
        saveSettings();
        const data = await loadReleases(options, onProgress, force);
        if (requestGeneration !== generation) return;
        calendar = data;
        renderCalendar();
        if (episodes) arr.update(false, 'sonarr');
        void refreshTorrentMatches(force);
      } catch (error) {
        if (requestGeneration === generation) {
          status.textContent = `Could not load releases: ${error.message} Use Refresh to retry.`;
          message.textContent = status.textContent;
          if (searching) updateVisibleReleases();
        }
      } finally {
        if (requestGeneration === generation) {
          results.setAttribute('aria-busy', 'false');
          [
            mode,
            country,
            language,
            titleCountry,
            episodeSonarrFilter,
            monthSelect,
            previous,
            current,
            next,
            refresh
          ].forEach((control) => {
            control.disabled = false;
          });
          requestAnimationFrame(() => {
            initialStyle?.remove();
            initialLoading?.remove();
          });
          backgroundTimer = setTimeout(
            () => void prefetchMonths(options.country, backgroundToken),
            100
          );
        }
      }
    }

    function selectMonth(value) {
      month = value;
      fromToday = false;
      void refreshPage();
    }

    previous.addEventListener('click', () => selectMonth(shiftMonth(month, -1)));
    next.addEventListener('click', () => selectMonth(shiftMonth(month, 1)));
    current.addEventListener('click', () => selectMonth(monthRange(new Date()).from.slice(0, 7)));
    monthSelect.addEventListener('change', () => selectMonth(monthSelect.value));
    mode.addEventListener('change', () => {
      void refreshPage();
    });
    episodeSonarrFilter.addEventListener('change', () => {
      saveSettings();
      updateVisibleReleases();
      arr.update(false, 'sonarr');
    });
    country.addEventListener('change', () => {
      void refreshPage();
    });
    language.addEventListener('change', () => {
      void refreshPage();
    });
    titleCountry.addEventListener('change', () => {
      void refreshPage();
    });
    refresh.addEventListener('click', () => {
      arr.refresh(mode.value === 'episodes' ? 'sonarr' : undefined);
      void refreshPage(true);
    });
    void refreshPage();
  }

  function init() {
    cleanOldCaches();
    addNavigation();
    if (isUpcomingPage) mountPage();
    else mountHomePanel();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
