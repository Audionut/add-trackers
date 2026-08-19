// ==UserScript==
// @name         UNIT3D - Covers & Posters
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.1.2
// @description  Fetch and display Blu-ray.com covers and TMDB posters on UNIT3D similar torrent pages.
// @author       Audionut
// @match        https://aither.cc/torrents/similar/1*
// @match        https://aither.cc/torrents/similar/2*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-covers-posters.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-covers-posters.user.js
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM.xmlHttpRequest
// @connect      api.themoviedb.org
// @connect      blu-ray.com
// @connect      www.blu-ray.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'unit3d-covers-posters';
  const PANEL_BODY_ID = `${PANEL_ID}-body`;
  const STYLE_ID = `${PANEL_ID}-style`;
  const LIGHTBOX_ID = `${PANEL_ID}-lightbox`;
  const TMDB_API_KEY_STORAGE = 'unit3dCoversPostersTmdbApiKey';
  const PANEL_PLACEMENT_STORAGE = 'unit3dCoversPostersPanelPlacement';
  const PANEL_READY_EVENT = 'unit3d:covers-posters-ready';
  const DEFAULT_TMDB_API_KEY = '';
  const REQUEST_TIMEOUT_MS = 20000;

  let currentImdbId = '';
  let panelAnchor = null;
  let panelPlacement = 'below';
  let placementFrame = 0;

  initialize();

  async function initialize() {
    panelPlacement = normalizePanelPlacement(
      await GM.getValue(PANEL_PLACEMENT_STORAGE, panelPlacement)
    );
    installStyles();
    registerMenuCommands();
    document.addEventListener('unit3d:ptp-dom-ready', queuePanelSync);

    const pageObserver = new MutationObserver(queuePanelSync);
    pageObserver.observe(document.documentElement, { childList: true, subtree: true });
    syncPanel();
  }

  function queuePanelSync() {
    if (placementFrame) return;
    placementFrame = requestAnimationFrame(() => {
      placementFrame = 0;
      syncPanel();
    });
  }

  function findPanelAnchor(root = document) {
    return (
      root.querySelector('.unit3d-ptp-synopsis-panel') ||
      root.querySelector('.unit3d-ptp-page .unit3d-ptp-table-scroll') ||
      root.querySelector('section.meta')
    );
  }

  function placePanelAtAnchor(panel, anchor, previousAnchor, placement) {
    if (!panel || !anchor) return previousAnchor;
    if (
      !panel.isConnected ||
      previousAnchor !== anchor ||
      panel.parentElement !== anchor.parentElement
    ) {
      const supportsAbove = anchor.matches?.('.unit3d-ptp-synopsis-panel, section.meta');
      if (placement === 'above' && supportsAbove) anchor.before(panel);
      else anchor.after(panel);
    }
    return anchor;
  }

  function syncPanel() {
    const imdbId = findImdbId();
    if (!imdbId) return;

    let panel = document.getElementById(PANEL_ID);
    let created = false;
    if (!panel || currentImdbId !== imdbId) {
      panel?.remove();
      panel = createPanel(imdbId);
      currentImdbId = imdbId;
      panelAnchor = null;
      created = true;
    }

    panel.dataset.unit3dCoversPostersPlacement = panelPlacement;
    if (panel.dataset.unit3dImdbPlacement === 'sidebar') {
      panelAnchor = null;
      if (created) publishPanelReady();
      return;
    }
    panelAnchor = placePanelAtAnchor(panel, findPanelAnchor(), panelAnchor, panelPlacement);
    if (created) publishPanelReady();
  }

  function normalizePanelPlacement(value) {
    return value === 'above' ? 'above' : 'below';
  }

  function publishPanelReady() {
    document.dispatchEvent(new CustomEvent(PANEL_READY_EVENT));
  }

  function findImdbId(root = document) {
    for (const link of root.querySelectorAll('a[href*="imdb.com/title/tt"]')) {
      const imdbId = extractImdbId(link.href);
      if (imdbId) return imdbId;
    }
    return '';
  }

  function extractImdbId(value) {
    return (
      String(value || '')
        .match(/\btt\d{5,}\b/i)?.[0]
        .toLowerCase() || ''
    );
  }

  function findTmdbTarget(root = document) {
    for (const link of root.querySelectorAll('a[href*="themoviedb.org/"]')) {
      const target = extractTmdbTarget(link.href);
      if (target) return target;
    }
    return null;
  }

  function extractTmdbTarget(value) {
    const match = String(value || '').match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
    return match ? { mediaType: match[1].toLowerCase(), id: match[2] } : null;
  }

  function createPanel(imdbId) {
    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'panelV2 unit3d-covers-posters-panel';
    panel.dataset.imdbId = imdbId;

    const header = document.createElement('header');
    header.className = 'panel__header';

    const heading = document.createElement('h2');
    heading.className = 'panel__heading unit3d-covers-posters-heading';
    heading.textContent = 'Covers & Posters';
    heading.tabIndex = 0;
    heading.setAttribute('role', 'button');
    heading.setAttribute('aria-controls', PANEL_BODY_ID);
    heading.setAttribute('aria-expanded', 'false');

    const body = document.createElement('div');
    body.id = PANEL_BODY_ID;
    body.className = 'panel__body';
    body.hidden = true;

    const toggle = () => {
      const expanded = body.hidden;
      body.hidden = !expanded;
      heading.setAttribute('aria-expanded', String(expanded));
      if (expanded) loadPanel(panel, imdbId);
    };

    heading.addEventListener('click', toggle);
    heading.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });

    header.appendChild(heading);
    panel.append(header, body);
    return panel;
  }

  async function loadPanel(panel, imdbId) {
    if (panel.dataset.loadState === 'loading' || panel.dataset.loadState === 'loaded') return;

    const body = panel.querySelector('.panel__body');
    if (!body) return;

    panel.dataset.loadState = 'loading';
    body.replaceChildren(createStatus('Loading covers and posters...'));

    try {
      const apiKey = await getTmdbApiKey();
      const tmdbTarget = findTmdbTarget();
      const [bluRayResult, tmdbResult] = await Promise.allSettled([
        fetchBluRayData(imdbId),
        apiKey ? fetchTmdbPosters(imdbId, tmdbTarget, apiKey) : Promise.resolve([])
      ]);

      if (!panel.isConnected || panel.dataset.imdbId !== imdbId) return;
      body.replaceChildren();

      let imageCount = 0;
      if (bluRayResult.status === 'fulfilled') {
        imageCount += renderBluRayData(body, bluRayResult.value);
      } else {
        console.warn('[UNIT3D Covers & Posters] Blu-ray.com lookup failed', bluRayResult.reason);
        body.appendChild(createStatus('Blu-ray.com lookup failed.', true));
      }

      if (tmdbResult.status === 'fulfilled') {
        if (tmdbResult.value.length > 0) {
          appendImageSection(body, 'TMDB Posters', tmdbResult.value, false);
          imageCount += tmdbResult.value.length;
        }
      } else {
        console.warn('[UNIT3D Covers & Posters] TMDB lookup failed', tmdbResult.reason);
        body.appendChild(createStatus('TMDB lookup failed.', true));
      }

      if (!apiKey) {
        body.appendChild(
          createStatus('TMDB posters require an API key set from the userscript menu.')
        );
      }
      if (imageCount === 0) body.appendChild(createStatus('No covers or posters found.'));

      panel.dataset.loadState = 'loaded';
    } catch (error) {
      console.warn('[UNIT3D Covers & Posters] loading failed', error);
      body.replaceChildren(
        createStatus('Could not load covers and posters. Click the panel to retry.', true)
      );
      delete panel.dataset.loadState;
    }
  }

  async function fetchBluRayData(imdbId) {
    const searchUrl = new URL('https://www.blu-ray.com/search/');
    searchUrl.search = new URLSearchParams({
      quicksearch: '1',
      quicksearch_country: 'all',
      quicksearch_keyword: imdbId,
      section: 'theatrical'
    });

    const searchDocument = await requestDocument(searchUrl.toString());
    const resultLink = searchDocument.querySelector('a.alphaborder[href]');
    const productUrl = toHttpUrl(resultLink?.getAttribute('href'), searchUrl);
    if (!productUrl) return { covers: [], releases: [] };

    const productId = extractBluRayProductId(productUrl);
    const [coversResult, releasesResult] = await Promise.allSettled([
      fetchBluRayCovers(productUrl),
      productId ? fetchBluRayReleases(productId) : Promise.resolve([])
    ]);

    return {
      covers: coversResult.status === 'fulfilled' ? coversResult.value : [],
      releases: releasesResult.status === 'fulfilled' ? releasesResult.value : []
    };
  }

  async function fetchBluRayCovers(productUrl) {
    const document = await requestDocument(productUrl);
    const urls = [...document.querySelectorAll('img[src*="_mini.jpg"]')]
      .map((image) => toHttpUrl(image.getAttribute('src'), productUrl))
      .filter(Boolean)
      .map((url) => url.replace('_mini.jpg', '_large.jpg'));

    return [...new Set(urls)].map((url) => ({
      alt: 'Blu-ray.com artwork',
      fullUrls: [url],
      previewUrl: url
    }));
  }

  async function fetchBluRayReleases(productId) {
    const ajaxUrl = new URL('https://www.blu-ray.com/products/menu_ajax.php');
    ajaxUrl.search = new URLSearchParams({
      p: productId,
      c: '20',
      action: 'showreleases'
    });

    const document = await requestDocument(ajaxUrl.toString());
    return [...document.querySelectorAll('h2.oswaldcollection')]
      .map((header) => mapBluRayReleaseGroup(header, ajaxUrl))
      .filter((group) => group.images.length > 0);
  }

  function mapBluRayReleaseGroup(header, baseUrl) {
    const images = [];
    const seenIds = new Set();
    let current = header.nextElementSibling;

    while (current && current.tagName !== 'H2') {
      const releaseNodes = current.matches?.('div[style*="inline-block"]')
        ? [current, ...current.querySelectorAll('div[style*="inline-block"]')]
        : [...current.querySelectorAll('div[style*="inline-block"]')];

      releaseNodes.forEach((releaseNode) => {
        const image = releaseNode.querySelector('img[src]');
        const link = releaseNode.querySelector('a.hoverlink[href]');
        const href = toHttpUrl(link?.getAttribute('href'), baseUrl);
        const previewUrl = toHttpUrl(image?.getAttribute('src'), baseUrl);
        const id = extractBluRayProductId(href);
        if (!href || !previewUrl || /thumb/i.test(previewUrl) || !id || seenIds.has(id)) return;

        seenIds.add(id);
        images.push({
          alt: `Blu-ray release ${id}`,
          fullUrls: [...new Set([toFrontImage(previewUrl), toBackImage(previewUrl)])],
          href,
          label: id,
          previewUrl
        });
      });
      current = current.nextElementSibling;
    }

    return {
      category: normalizeText(header.textContent) || 'Blu-ray Releases',
      images
    };
  }

  function extractBluRayProductId(value) {
    if (!value) return '';
    try {
      return new URL(value).pathname.match(/\/(\d+)\/?$/)?.[1] || '';
    } catch {
      return '';
    }
  }

  function toFrontImage(value) {
    return value.includes('_medium.jpg') ? value.replace('_medium.jpg', '_front.jpg') : value;
  }

  function toBackImage(value) {
    return value.includes('_medium.jpg') ? value.replace('_medium.jpg', '_back.jpg') : value;
  }

  async function fetchTmdbPosters(imdbId, target, apiKey) {
    const resolvedTarget = target || (await findTmdbTargetByImdbId(imdbId, apiKey));
    if (!resolvedTarget) return [];

    const imagesUrl = new URL(
      `https://api.themoviedb.org/3/${resolvedTarget.mediaType}/${resolvedTarget.id}/images`
    );
    imagesUrl.searchParams.set('api_key', apiKey);
    const data = await requestJson(imagesUrl.toString());
    const paths = [
      ...new Set((data.posters || []).map((poster) => poster.file_path).filter(Boolean))
    ];

    return paths.map((path) => ({
      alt: 'TMDB poster',
      fullUrls: [`https://image.tmdb.org/t/p/original${path}`],
      previewUrl: `https://image.tmdb.org/t/p/w342${path}`
    }));
  }

  async function findTmdbTargetByImdbId(imdbId, apiKey) {
    const findUrl = new URL(`https://api.themoviedb.org/3/find/${imdbId}`);
    findUrl.searchParams.set('api_key', apiKey);
    findUrl.searchParams.set('external_source', 'imdb_id');
    const data = await requestJson(findUrl.toString());
    const movie = data.movie_results?.[0];
    if (movie?.id) return { mediaType: 'movie', id: String(movie.id) };
    const show = data.tv_results?.[0];
    return show?.id ? { mediaType: 'tv', id: String(show.id) } : null;
  }

  function renderBluRayData(body, data) {
    let count = 0;
    if (data.covers.length > 0) {
      appendImageSection(body, 'Blu-ray.com Artwork', data.covers, true);
      count += data.covers.length;
    }
    data.releases.forEach(({ category, images }) => {
      appendImageSection(body, category, images, false);
      count += images.length;
    });
    return count;
  }

  function appendImageSection(body, title, images, expanded) {
    const details = document.createElement('details');
    details.className = 'unit3d-covers-posters-section';
    details.open = expanded;

    const summary = document.createElement('summary');
    summary.textContent = `${title} (${images.length})`;

    const grid = document.createElement('div');
    grid.className = 'unit3d-covers-posters-grid';
    images.forEach((image) => grid.appendChild(createImageCard(image)));

    details.append(summary, grid);
    body.appendChild(details);
  }

  function createImageCard({ alt, fullUrls, href, label, previewUrl }) {
    const card = document.createElement('figure');
    card.className = 'unit3d-covers-posters-card';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'unit3d-covers-posters-image-button';
    button.setAttribute('aria-label', `Open ${alt}`);
    button.addEventListener('click', () => openLightbox(fullUrls, alt));

    const image = document.createElement('img');
    image.src = previewUrl;
    image.alt = alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    button.appendChild(image);
    card.appendChild(button);

    if (href && label) {
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = label;
      card.appendChild(link);
    }
    return card;
  }

  function openLightbox(imageUrls, alt) {
    const urls = [...new Set(imageUrls.filter(Boolean))];
    if (urls.length === 0) return;

    document.getElementById(LIGHTBOX_ID)?.remove();

    const dialog = document.createElement('dialog');
    dialog.id = LIGHTBOX_ID;
    dialog.className = 'unit3d-covers-posters-lightbox';

    const image = document.createElement('img');
    image.alt = alt;
    image.referrerPolicy = 'no-referrer';

    let index = 0;
    const showImage = () => {
      image.src = urls[index];
    };

    const closeButton = createLightboxButton('×', 'Close');
    closeButton.classList.add('unit3d-covers-posters-lightbox-close');
    closeButton.addEventListener('click', () => dialog.close());
    dialog.append(closeButton, image);

    if (urls.length > 1) {
      const previousButton = createLightboxButton('‹', 'Previous image');
      const nextButton = createLightboxButton('›', 'Next image');
      previousButton.classList.add('unit3d-covers-posters-lightbox-previous');
      nextButton.classList.add('unit3d-covers-posters-lightbox-next');

      const move = (offset) => {
        index = (index + offset + urls.length) % urls.length;
        showImage();
      };
      previousButton.addEventListener('click', () => move(-1));
      nextButton.addEventListener('click', () => move(1));
      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      });
      dialog.append(previousButton, nextButton);
    }

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.appendChild(dialog);
    showImage();
    dialog.showModal();
  }

  function createLightboxButton(text, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'unit3d-covers-posters-lightbox-button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
  }

  function createStatus(text, isError = false) {
    const status = document.createElement('p');
    status.className = `unit3d-covers-posters-status${isError ? ' is-error' : ''}`;
    status.textContent = text;
    return status;
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toHttpUrl(value, baseUrl) {
    if (!value) return '';
    try {
      const url = new URL(value, baseUrl);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
    } catch {
      return '';
    }
  }

  async function requestDocument(url) {
    const text = await requestText(url);
    return new DOMParser().parseFromString(text, 'text/html');
  }

  async function requestJson(url) {
    return JSON.parse(await requestText(url));
  }

  function requestText(url) {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: 'GET',
        url,
        timeout: REQUEST_TIMEOUT_MS,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.responseText);
          } else {
            reject(new Error(`HTTP ${response.status}`));
          }
        },
        onerror: () => reject(new Error('Network request failed')),
        ontimeout: () => reject(new Error('Network request timed out'))
      });
    });
  }

  async function getTmdbApiKey() {
    return String(await GM.getValue(TMDB_API_KEY_STORAGE, DEFAULT_TMDB_API_KEY)).trim();
  }

  function registerMenuCommands() {
    GM.registerMenuCommand(
      'UNIT3D Covers & Posters: toggle panel above/below synopsis',
      async () => {
        panelPlacement = panelPlacement === 'above' ? 'below' : 'above';
        await GM.setValue(PANEL_PLACEMENT_STORAGE, panelPlacement);
        panelAnchor = null;
        syncPanel();
        publishPanelReady();
      }
    );

    GM.registerMenuCommand('UNIT3D Covers & Posters: set TMDB API key', async () => {
      const value = prompt(
        'Enter a TMDB API key. Leave blank to disable TMDB posters. Cancel keeps the current key.'
      );
      if (value === null) return;

      await GM.setValue(TMDB_API_KEY_STORAGE, value.trim());
      const panel = document.getElementById(PANEL_ID);
      if (!panel) return;

      delete panel.dataset.loadState;
      const body = panel.querySelector('.panel__body');
      if (body && !body.hidden) loadPanel(panel, panel.dataset.imdbId);
    });
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID} {
  margin-top: 12px;
  overflow: hidden;
}

#unit3d-imdb-sidebar-panels > #${PANEL_ID} {
  margin-top: 0;
}

#${PANEL_ID} > .panel__header {
  cursor: pointer;
  user-select: none;
}

#${PANEL_ID} .unit3d-covers-posters-heading {
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

#${PANEL_ID} .unit3d-covers-posters-heading::after {
  content: '+';
  font-size: 1.2em;
}

#${PANEL_ID} .unit3d-covers-posters-heading[aria-expanded='true']::after {
  content: '−';
}

#${PANEL_ID} .panel__body[hidden] {
  display: none !important;
}

#${PANEL_ID} .unit3d-covers-posters-section + .unit3d-covers-posters-section {
  margin-top: 12px;
}

#${PANEL_ID} .unit3d-covers-posters-section > summary {
  cursor: pointer;
  font-size: 1.05em;
  font-weight: 700;
  padding: 4px 0;
}

#${PANEL_ID} .unit3d-covers-posters-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  padding-top: 12px;
}

#${PANEL_ID} .unit3d-covers-posters-card {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  min-width: 0;
}

#${PANEL_ID} .unit3d-covers-posters-image-button {
  background: transparent;
  border: 0;
  cursor: zoom-in;
  display: block;
  padding: 0;
  width: 100%;
}

#${PANEL_ID} .unit3d-covers-posters-image-button img {
  display: block;
  height: auto;
  margin: 0 auto;
  max-height: 360px;
  max-width: 100%;
  object-fit: contain;
}

#${PANEL_ID} .unit3d-covers-posters-status {
  margin: 8px 0;
}

#${PANEL_ID} .unit3d-covers-posters-status.is-error {
  color: var(--alert-danger-fg, #d9534f);
}

.unit3d-covers-posters-lightbox {
  background: transparent;
  border: 0;
  box-sizing: border-box;
  height: 100vh;
  margin: 0;
  max-height: none;
  max-width: none;
  padding: 4vh 4vw;
  width: 100vw;
}

.unit3d-covers-posters-lightbox::backdrop {
  background: rgba(0, 0, 0, 0.88);
}

.unit3d-covers-posters-lightbox > img {
  display: block;
  height: 92vh;
  margin: 0 auto;
  max-width: 92vw;
  object-fit: contain;
  width: auto;
}

.unit3d-covers-posters-lightbox-button {
  background: rgba(0, 0, 0, 0.62);
  border: 0;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  font-size: 40px;
  height: 56px;
  line-height: 1;
  padding: 0;
  position: fixed;
  width: 56px;
  z-index: 1;
}

.unit3d-covers-posters-lightbox-close {
  right: 18px;
  top: 18px;
}

.unit3d-covers-posters-lightbox-previous,
.unit3d-covers-posters-lightbox-next {
  top: calc(50% - 28px);
}

.unit3d-covers-posters-lightbox-previous {
  left: 18px;
}

.unit3d-covers-posters-lightbox-next {
  right: 18px;
}
`;
    (document.head || document.documentElement).appendChild(style);
  }
})();
