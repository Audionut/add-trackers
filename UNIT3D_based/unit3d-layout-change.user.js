// ==UserScript==
// @name         UNIT3D - Layout Change
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.1.3
// @description  Change UNIT3D similar torrents layout with additional details and sorting options.
// @author       Audionut
// @match        https://aither.cc/torrents/similar/1*
// @match        https://aither.cc/torrents/similar/2*
// @match        https://aither.cc/torrents*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-layout-change.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-layout-change.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    detailLoading: 'lazy',
    fetchTimeoutMs: 15000,
    externalDetailTimeoutMs: 20000,
    initialDomTimeoutMs: 20000,
    maxConcurrentDetailFetches: 2,
    observeDebounceMs: 150,
    prefetch: 'none'
  };

  const ADAPTER_STYLE_ID = 'unit3d-ptp-widescreen-adapter-style';
  const SCRIPT_ID = 'UNIT3DLayoutChange';
  const SETTINGS_PANEL_ID = 'unit3d-layout-change-settings-panel';
  const SETTINGS_STYLE_ID = 'unit3d-layout-change-settings-style';
  const SINGLE_TORRENT_VIEW_BYPASS_STORAGE_KEY = `${SCRIPT_ID}_singleTorrentViewBypass`;
  const SINGLE_TORRENT_VIEW_BYPASS_TTL_MS = 2 * 60 * 1000;
  const EXTERNAL_DETAIL_EVENT_TARGET_ID = 'unit3d-add-releases-private-detail-event-target';
  const EXTERNAL_DETAIL_REQUEST_EVENT = 'unit3d-add-releases-private-detail-request';
  const EXTERNAL_DETAIL_RESPONSE_EVENT = 'unit3d-add-releases-private-detail-response';
  const AITHER_TRACKER_ICON =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACYElEQVQokT2RS2sUQRSFb9169MOZScc8TBQN0Wg2URBB3Sj+ZHe6VhQloAgu1GjMQxMhycx093RXdVfVvS5G3BzO4izOxye2nzwbLq8MlleK9atSaQAAgLacMpFAzEYjW1XT0999284uzl1dqeTSYHRlrVi/lheFSdLOWSYKfddMxgtX1vPFRZ1mKGVvW52mtiyVybLhyuqtra0+hEjUObuytLRzc3PStABwXs/IBJPnebGYF4tn+98VKpWNFs6qmmK8u3H94damkVIiaim7EGrrPh4ej38dp0Mo1q424wsVuq48PTktp6u3bi/kd3Z/HJwcHTWTsdR6YW19e+PG/Y3rddOc7f8wWc5EqmubP3tfB5eXtm5uPn/x8uDDbvReIAKAMubbYHht597Tx4/eVdWfb19cXSlvbfR+4/6Dz58+7b19TSH4zqGUiLKbzVxdt+UUmKU2s4tz7xwyEYWQDoZ7b15F70PfRe+7pumd7W3bNTNblj9339uq9NZSDDIbjRBRJcnF4UHoXOh7jhEA5gkARJFiTIfD6emJrUqpkwQAlEnGx0eh7ykEZgZmgQjMTDTvJs3q87N2MlFM5J2z5TQGP7crBDIAMwMAMIMQKGVbTr1zIIRMB0MhQCDG3kfvmQgAQMC/NQDFIJWS2ri6jsHLvCjm3DpNo/f/rwMzMzETCGGyvG+a3lkAkCbLmTkGj1JKpVFKZmYiZhaIKJVOUiayVUkhUIxKIEqtmYiJAFGnqeJkji6VQqWEELauhBDSmBiCEkJIpaPv575i8EobVCp6j0r1bUsUo/fALLQWQvwFLByUKNhkQJ4AAAAASUVORK5CYII=';

  const QUALITY_SECTIONS = [
    { id: 'sd', label: 'SD', rank: 0 },
    { id: 'hd', label: 'HD', rank: 1 },
    { id: 'uhd', label: 'UHD', rank: 2 }
  ];

  const QUALITY_SECTION_BY_ID = new Map(QUALITY_SECTIONS.map((section) => [section.id, section]));

  const LAYOUT_SETTINGS = {
    forceRedirectSingleTorrentLinks: {
      default: true,
      label: 'Force single torrent links to similar pages',
      tooltip:
        'Redirect /torrents/<id> links and direct torrent pages to /torrents/similar/<category>.<tmdb>.'
    },
    metaIdsPlacement: {
      default: 'sidebar',
      label: 'Meta IDs placement',
      options: [
        { label: 'Sidebar', value: 'sidebar' },
        { label: 'Below title', value: 'inline' }
      ],
      tooltip: 'Move IMDb/TMDB/TVDB IDs into the sidebar or keep them as one icon line below title.'
    }
  };

  const SORT_COLUMNS = [
    { defaultDirection: 'asc', key: 'releaseName', label: 'Release', type: 'text' },
    { defaultDirection: 'asc', key: 'sizeBytes', label: 'Size', type: 'number' },
    { defaultDirection: 'desc', key: 'seeders', label: 'S', type: 'number' },
    { defaultDirection: 'desc', key: 'leechers', label: 'L', type: 'number' },
    { defaultDirection: 'desc', key: 'completed', label: 'C', type: 'number' }
  ];

  const SORT_COLUMN_BY_KEY = new Map(SORT_COLUMNS.map((column) => [column.key, column]));

  const TORRENT_TABLE_COLUMN_COUNT = SORT_COLUMNS.length + 1;

  const RELEASE_TYPES = ['Full Disc', 'Remux', 'Encode', 'WEB-DL', 'WEBRip', 'HDTV', 'Other'];

  const HDR_TEXT_PATTERN =
    /(^|[^A-Za-z0-9+])(?:DV\s+HDR10\+|DV\s+HDR|HDR10\+\s+DV|HDR\s+DV|HDR10\+|HDR10|HDR|DV|HLG)(?=$|[^A-Za-z0-9+])/gi;

  const AUDIO_CODEC_TOKENS = [
    'DTS-HD MA',
    'DTS-HD HRA',
    'DTS-ES',
    'DTS:X',
    'TrueHD',
    'DD+',
    'DTS',
    'LPCM',
    'FLAC',
    'Opus',
    'AAC',
    'DD'
  ];

  const METADATA_TOKENS = ['Atmos', 'Auro3D'];

  const SELECTORS = {
    adapterRoot: '.unit3d-ptp-page',
    nameLink: '.torrent-search--grouped__name a[href*="/torrents/"]',
    nativeList: '.similar-torrents-list',
    nativeTable: '.similar-torrents__torrents',
    rowAge: '.torrent-search--grouped__age',
    rowCompleted: '.torrent-search--grouped__completed',
    rowDownload: '.torrent-search--grouped__download a[href]',
    rowIcons: '.torrent-icons',
    rowLeechers: '.torrent-search--grouped__leechers',
    rowOverview: '.torrent-search--grouped__overview',
    rowSeeders: '.torrent-search--grouped__seeders',
    rowSize: '.torrent-search--grouped__size',
    rowType: '.similar-torrents__type'
  };

  const ADAPTER_CSS = `
html.unit3d-ptp-adapter-enabled .unit3d-ptp-page {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin-left: 0;
  transform: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-page--with-sidebar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 420px);
  gap: 16px;
  align-items: start;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-page .main-column {
  width: 100%;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-sidebar .panelV2 {
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-sidebar .panel__body {
  min-width: 0;
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-sidebar img {
  max-width: 100%;
  height: auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-panel .panel__body {
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-panel > .panel__body > .meta__poster-link,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-panel > .panel__body > .unit3d-ptp-meta-sidebar-item.meta__poster-link {
  display: block;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-panel > .panel__body > img,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-panel > .panel__body > .meta__poster-link > img,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-panel > .panel__body > .unit3d-ptp-meta-sidebar-item.meta__poster-link > img,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-poster-image {
  display: block;
  width: 100% !important;
  max-width: 100%;
  max-height: none !important;
  height: auto !important;
  margin: 0 auto;
  object-fit: contain;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-meta-sidebar-item {
  max-width: 100%;
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-meta-sidebar-hidden {
  display: none !important;
}

html.unit3d-ptp-adapter-enabled section.meta {
  min-height: 0 !important;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  margin-bottom: 8px !important;
  row-gap: 4px !important;
  gap: 4px !important;
  align-content: start !important;
}

html.unit3d-ptp-adapter-enabled section.meta > * {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

html.unit3d-ptp-adapter-enabled section.meta .meta__title-link {
  display: block;
  text-align: center;
  font-size: 1.08em;
  line-height: 1.15;
  margin-block: 0 !important;
}

html.unit3d-ptp-adapter-enabled section.meta .meta__title-link .meta__title {
  display: inline;
}

html.unit3d-ptp-adapter-enabled section.meta .meta__actions,
html.unit3d-ptp-adapter-enabled section.meta .meta__action,
html.unit3d-ptp-adapter-enabled section.meta .meta__tags,
html.unit3d-ptp-adapter-enabled section.meta .torrent__tags {
  margin-block: 0 !important;
}

html.unit3d-ptp-adapter-enabled section.meta .meta__dropdown {
  background: var(--panel-bg, rgba(20, 24, 28, 0.96)) !important;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-title-director {
  display: inline;
  margin-left: 0.35em;
  font-size: 1em;
  font-weight: 500;
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-id-icon,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-meta-sidebar-panel svg {
  max-height: 18px !important;
  width: auto !important;
  vertical-align: text-bottom;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-ids-panel .panel__body {
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-ids-panel .meta__ids,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-ids-panel .unit3d-ptp-meta-sidebar-item.meta__ids {
  display: flex !important;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-ids-panel .meta-id-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  min-height: 34px;
  padding: 4px 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-ids-panel .meta-id-tag img,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-ids-panel .meta-id-tag svg {
  display: block;
  height: 28px !important;
  max-height: 28px !important;
  width: auto !important;
  max-width: 76px !important;
}

html.unit3d-ptp-adapter-enabled section.meta .unit3d-ptp-inline-ids {
  display: flex !important;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin: 4px 0 2px !important;
  padding: 0;
  list-style: none;
}

html.unit3d-ptp-adapter-enabled section.meta .unit3d-ptp-inline-ids li {
  display: inline-flex;
  margin: 0 !important;
}

html.unit3d-ptp-adapter-enabled section.meta .unit3d-ptp-inline-ids .meta-id-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

html.unit3d-ptp-adapter-enabled section.meta .unit3d-ptp-inline-ids img,
html.unit3d-ptp-adapter-enabled section.meta .unit3d-ptp-inline-ids svg {
  max-height: 28px !important;
  width: auto !important;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-meta-sidebar-panel [class*="cast"] img:not(.unit3d-ptp-id-icon):not(.unit3d-ptp-poster-image),
html.unit3d-ptp-adapter-enabled .unit3d-ptp-meta-sidebar-panel [class*="credit"] img:not(.unit3d-ptp-id-icon):not(.unit3d-ptp-poster-image),
html.unit3d-ptp-adapter-enabled .unit3d-ptp-meta-sidebar-panel [class*="person"] img:not(.unit3d-ptp-id-icon):not(.unit3d-ptp-poster-image) {
  max-height: 96px !important;
  width: auto !important;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-table-scroll {
  box-sizing: border-box;
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.14));
  border-radius: 8px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-synopsis-panel {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-synopsis-panel .panel__body {
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-panel {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-card {
  min-width: 0;
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-image-link {
  display: block;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-card img {
  display: block;
  width: 100% !important;
  height: auto !important;
  border-radius: 3px !important;
  object-fit: contain;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-text {
  display: block;
  margin-top: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.88em;
  line-height: 1.2;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-name,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-character {
  display: block;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-cast-character {
  margin-top: 2px;
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
}

html.unit3d-ptp-adapter-enabled #torrent-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  table-layout: auto;
  background: var(--torrent-group-bg, var(--panel-bg, rgba(20, 24, 28, 0.96)));
  color: var(--torrent-group-text, inherit);
  font-size: 14px;
}

html.unit3d-ptp-adapter-enabled #torrent-table th,
html.unit3d-ptp-adapter-enabled #torrent-table td {
  padding: 6px 8px;
  vertical-align: middle;
  border-bottom: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.08));
}

html.unit3d-ptp-adapter-enabled #torrent-table th {
  text-align: left;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled #torrent-table th[data-unit3d-sort-key] {
  cursor: pointer;
  user-select: none;
}

html.unit3d-ptp-adapter-enabled #torrent-table th:not([data-unit3d-sort-key]) {
  user-select: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-sort-indicator {
  display: inline-block;
  min-width: 1em;
  margin-left: 4px;
  color: var(--text-muted, rgba(255, 255, 255, 0.58));
  text-align: left;
}

html.unit3d-ptp-adapter-enabled #torrent-table th:not(:first-child),
html.unit3d-ptp-adapter-enabled #torrent-table td:not(:first-child) {
  text-align: right;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled #torrent-table .unit3d-ptp-section-row th {
  padding: 8px 10px;
  text-align: left !important;
  background: var(--torrent-group-header-bg, rgba(255, 255, 255, 0.1));
  border-top: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.14));
  border-bottom: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.14));
  color: var(--torrent-group-text, inherit);
  letter-spacing: 0;
}

html.unit3d-ptp-adapter-enabled #torrent-table .unit3d-ptp-tv-group-row th {
  padding: 10px 12px;
  text-align: left !important;
  background: rgba(255, 255, 255, 0.14);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  color: var(--torrent-group-text, inherit);
  font-size: 1.04em;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-tv-group-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-tv-group-toggle::before {
  content: "+";
  display: inline-block;
  width: 1em;
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
}

html.unit3d-ptp-adapter-enabled
  .unit3d-ptp-tv-group-toggle[aria-expanded="true"]::before {
  content: "-";
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-section-count {
  margin-left: 8px;
  color: var(--text-muted, rgba(255, 255, 255, 0.58));
  font-weight: 400;
}

html.unit3d-ptp-adapter-enabled #torrent-table .unit3d-ptp-row-odd {
  background: var(--torrent-group-table-stripe-odd, rgba(255, 255, 255, 0.03));
}

html.unit3d-ptp-adapter-enabled #torrent-table .unit3d-ptp-row-even {
  background: var(--torrent-group-table-stripe-even, rgba(0, 0, 0, 0.1));
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-overview-cell {
  min-width: 420px;
}

html.unit3d-ptp-adapter-enabled .basic-movie-list__torrent__action {
  display: inline-flex;
  gap: 6px;
  margin-right: 8px;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-tracker-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin: 0 6px 0 2px;
  object-fit: contain;
  vertical-align: text-bottom;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-row-meta {
  margin-left: 8px;
  color: var(--text-muted, rgba(255, 255, 255, 0.58));
  font-size: 12px;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .torrent-info-link {
  color: #f2f2f2;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-full-disc {
  color: #ffd166;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-remux {
  color: #4cc9f0;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-encode {
  color: #80ed99;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-web-dl {
  color: #f8961e;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-webrip {
  color: #ff6b6b;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-hdtv {
  color: #c77dff;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--type-other {
  color: #9aa4b2;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dd {
  color: #90e0ef;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dd-plus {
  color: #00b4d8;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-truehd {
  color: #00f5d4;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dts {
  color: #f15bb5;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dts-hd-ma {
  color: #fee440;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dts-hd-hra {
  color: #f4a261;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dts-es {
  color: #e76f51;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-dts-x {
  color: #ff99c8;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-lpcm {
  color: #cdb4db;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-flac {
  color: #b8f2e6;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-aac {
  color: #a9def9;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--audio-opus {
  color: #d0f4de;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-release-token--metadata {
  color: #f72585;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-badges {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  vertical-align: middle;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-status-badges-cell {
  width: 1%;
  text-align: right;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-status-badges {
  justify-content: flex-end;
  margin-left: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-badges .torrent-icons,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-badges .torrent-icon {
  display: inline-flex;
  align-items: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-badges .torrent-icons__vision img {
  display: block !important;
  width: auto !important;
  max-height: 22px !important;
  filter: invert(1) brightness(0.82) saturate(1.15) !important;
  object-fit: contain;
}

html.unit3d-ptp-adapter-enabled .torrent_info_row > td {
  width: 100%;
  max-width: 0;
  overflow: hidden;
  padding: 0;
  text-align: left;
  white-space: normal;
}

html.unit3d-ptp-adapter-enabled .movie-page__torrent__panel {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 12px;
  background: var(--panel-bg, rgba(0, 0, 0, 0.18));
}

html.unit3d-ptp-adapter-enabled .movie-page__torrent__panel .panel {
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .movie-page__torrent__panel .panel__heading {
  padding: 8px 10px;
  background: var(--torrent-group-header-bg, rgba(255, 255, 255, 0.08));
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .movie-page__torrent__panel .panel__body {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 12px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body img {
  max-width: 100%;
  height: auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-description-lightbox-trigger {
  cursor: zoom-in;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.86);
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox[hidden] {
  display: none !important;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox__bar {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox__link {
  overflow: hidden;
  color: #f2f2f2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox__close {
  margin-left: auto;
  cursor: pointer;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox__viewport {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-lightbox__image {
  display: inline-block;
  max-width: none;
  max-height: none;
  width: auto;
  height: auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body pre,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body blockquote,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode-code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode__code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode-quote,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode__quote,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .quote,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .quote-box,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .codebox {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-gutter: stable;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body pre,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode-code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode__code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .codebox {
  white-space: pre;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body pre > code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode-code code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .bbcode__code code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .code code,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .codebox code {
  display: block;
  width: max-content;
  min-width: 100%;
  overflow-wrap: normal;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .torrent-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .torrent-icon > i {
  font-size: 16px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .unit3d-ptp-vision-row {
  display: flex;
  flex-basis: 100%;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body .torrent-icons__vision img {
  width: auto !important;
  max-width: 136px !important;
  max-height: 38px !important;
  filter: invert(1) brightness(0.82) saturate(1.15) !important;
  object-fit: contain;
  vertical-align: middle;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-mediainfo-panel .panel__header,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-mediainfo-panel .panel__heading {
  cursor: pointer;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-mediainfo-panel .torrent-mediainfo-dump[hidden] {
  display: none !important;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-body pre {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  overflow-x: auto;
  padding-bottom: 4px;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-actions > li {
  width: auto !important;
  flex: 0 0 auto;
  margin: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-actions .form__button {
  width: auto !important;
  min-width: max-content;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-actions .form__group {
  width: auto !important;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-internal-message {
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-detail-error {
  color: var(--danger, #ff6b6b);
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-comparison .comparison__screenshots[hidden] {
  display: none !important;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-comparison-block,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-image-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-comparison-title {
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-comparison .comparison__button {
  cursor: pointer;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-comparison-link,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-image-link {
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-rendered-bbcode img,
html.unit3d-ptp-adapter-enabled .unit3d-ptp-rendered-bbcode-image {
  max-width: 100%;
  height: auto;
  vertical-align: top;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-rendered-bbcode {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-rendered-bbcode-image-link {
  display: inline-block;
  margin: 4px;
  max-width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-hide {
  margin: 8px 0;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-hide > summary {
  cursor: pointer;
  padding: 8px 10px;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-hide[open] > summary {
  border-bottom: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.12));
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-hide__body {
  padding: 10px;
  max-width: 100%;
  overflow-x: auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-table {
  display: table;
  width: 100%;
  max-width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-table-row {
  display: table-row;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-bbcode-table-cell {
  display: table-cell;
  padding: 6px 8px;
  border: 1px solid var(--torrent-group-header-bg, rgba(255, 255, 255, 0.12));
  vertical-align: top;
}

html.unit3d-ptp-adapter-enabled .unit3d-ptp-image-marker {
  display: none;
}

@media (max-width: 760px) {
  html.unit3d-ptp-adapter-enabled .unit3d-ptp-page {
    display: block;
    width: 100%;
  }

  html.unit3d-ptp-adapter-enabled .unit3d-ptp-table-scroll {
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }
}`;

  const detailCache = new Map();
  const detailFetchQueue = [];
  const torrentSimilarResolvePromises = new Map();
  const torrentSimilarUrlCache = new Map();

  let activeDetailFetches = 0;
  let aitherIconObserver = null;
  let aitherIconTimer = null;
  let alsoDownloadedObserver = null;
  let adapterRoot = null;
  let cookieConsentObserver = null;
  let compactSearchObserver = null;
  let isPairingRows = false;
  let lastSignature = '';
  let metaObserver = null;
  let nativeObserver = null;
  let pairingObserver = null;
  let rebuildTimer = null;
  let actionMenuCounter = 0;
  let currentSort = { direction: 'asc', key: 'sizeBytes' };

  GM_registerMenuCommand('UNIT3D - Layout Change Settings', showSettingsPanel);

  if (isSimilarTorrentPage()) {
    addReadyClass();
    installAdapterStyles();
    initAitherTrackerIconDecorator();
    waitForElement(SELECTORS.nativeTable, CONFIG.initialDomTimeoutMs).then((table) => {
      if (!table) return;
      initAdapter();
    });
  } else if (getLayoutSetting('forceRedirectSingleTorrentLinks') && isTorrentIndexPage()) {
    initTorrentIndexLinkRedirector();
  } else if (getLayoutSetting('forceRedirectSingleTorrentLinks') && isTorrentShowPage()) {
    initSingleTorrentPageRedirector();
  }

  function getLayoutSetting(key) {
    const setting = LAYOUT_SETTINGS[key];
    return GM_getValue(layoutSettingStorageKey(key), setting?.default);
  }

  function setLayoutSetting(key, value) {
    GM_setValue(layoutSettingStorageKey(key), value);
  }

  function layoutSettingStorageKey(key) {
    return `${SCRIPT_ID}_${key}`;
  }

  function showSettingsPanel() {
    installSettingsStyles();
    document.getElementById(SETTINGS_PANEL_ID)?.remove();

    const mountPanel = () => {
      const overlay = document.createElement('div');
      overlay.id = SETTINGS_PANEL_ID;
      overlay.className = 'unit3d-layout-settings-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'unit3d-layout-settings-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const header = document.createElement('div');
      header.className = 'unit3d-layout-settings-header';
      const title = document.createElement('h2');
      title.textContent = 'UNIT3D Layout Change Settings';
      const close = document.createElement('button');
      close.className = 'form__button form__button--text';
      close.type = 'button';
      close.textContent = 'Close';
      close.addEventListener('click', closeSettingsPanel);
      header.append(title, close);

      const form = document.createElement('form');
      form.className = 'unit3d-layout-settings-form';
      form.appendChild(buildSettingsGrid());

      const actions = document.createElement('div');
      actions.className = 'unit3d-layout-settings-actions';
      const reset = document.createElement('button');
      reset.className = 'form__button form__button--outlined';
      reset.type = 'button';
      reset.textContent = 'Reset';
      reset.addEventListener('click', () => {
        if (!confirm('Reset UNIT3D Layout Change settings?')) return;
        Object.keys(LAYOUT_SETTINGS).forEach((key) =>
          setLayoutSetting(key, LAYOUT_SETTINGS[key].default)
        );
        location.reload();
      });

      const save = document.createElement('button');
      save.className = 'form__button form__button--filled';
      save.type = 'submit';
      save.textContent = 'Save';
      actions.append(reset, save);
      form.appendChild(actions);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        saveSettingsForm(form);
        closeSettingsPanel();
        location.reload();
      });

      dialog.append(header, form);
      overlay.appendChild(dialog);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeSettingsPanel();
      });
      document.body.appendChild(overlay);
    };

    if (document.body) {
      mountPanel();
    } else {
      document.addEventListener('DOMContentLoaded', mountPanel, { once: true });
    }
  }

  function buildSettingsGrid() {
    const grid = document.createElement('div');
    grid.className = 'unit3d-layout-settings-grid';
    const group = document.createElement('section');
    group.className = 'unit3d-layout-settings-group';
    const heading = document.createElement('h3');
    heading.textContent = 'Navigation';
    group.appendChild(heading);

    Object.entries(LAYOUT_SETTINGS).forEach(([key, setting]) => {
      const label = document.createElement('label');
      label.className = 'unit3d-layout-setting-row';
      label.title = setting.tooltip || '';
      const text = document.createElement('span');
      text.textContent = setting.label;
      const input = setting.options
        ? document.createElement('select')
        : document.createElement('input');
      input.name = key;
      if (setting.options) {
        const currentValue = getLayoutSetting(key);
        setting.options.forEach((optionValue) => {
          const option = document.createElement('option');
          const value = typeof optionValue === 'string' ? optionValue : optionValue.value;
          option.value = value;
          option.textContent = typeof optionValue === 'string' ? optionValue : optionValue.label;
          option.selected = value === currentValue;
          input.appendChild(option);
        });
      } else {
        input.type = 'checkbox';
        input.checked = !!getLayoutSetting(key);
      }
      label.append(text, input);
      group.appendChild(label);
    });

    grid.appendChild(group);
    return grid;
  }

  function saveSettingsForm(form) {
    Object.keys(LAYOUT_SETTINGS).forEach((key) => {
      const input = form.elements.namedItem(key);
      if (input instanceof HTMLInputElement) {
        setLayoutSetting(key, input.checked);
      } else if (input instanceof HTMLSelectElement) {
        setLayoutSetting(key, input.value);
      }
    });
  }

  function closeSettingsPanel() {
    document.getElementById(SETTINGS_PANEL_ID)?.remove();
  }

  function installSettingsStyles() {
    if (document.getElementById(SETTINGS_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = SETTINGS_STYLE_ID;
    style.textContent = `
.unit3d-layout-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.42);
}
.unit3d-layout-settings-dialog {
  width: min(760px, 94vw);
  max-height: 92vh;
  margin: 4vh 4vw;
  overflow: auto;
  background: var(--panel-bg, #202428);
  color: var(--text-color, inherit);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}
.unit3d-layout-settings-header,
.unit3d-layout-settings-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.unit3d-layout-settings-header h2 {
  margin: 0;
}
.unit3d-layout-settings-grid {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}
.unit3d-layout-settings-group {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 12px;
}
.unit3d-layout-settings-group h3 {
  margin: 0 0 10px;
}
.unit3d-layout-setting-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0;
}
.unit3d-layout-setting-row span {
  min-width: 0;
}
.unit3d-layout-setting-row select {
  max-width: 180px;
}
`;
    (document.head || document.documentElement).appendChild(style);
  }

  function addReadyClass() {
    document.documentElement.classList.add('unit3d-ptp-adapter-enabled');
  }

  function installAdapterStyles() {
    if (document.getElementById(ADAPTER_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = ADAPTER_STYLE_ID;
    style.textContent = ADAPTER_CSS;

    const appendStyle = () => {
      if (document.getElementById(ADAPTER_STYLE_ID)) return;
      (document.head || document.documentElement).appendChild(style);
    };

    if (document.head) {
      appendStyle();
    } else {
      document.addEventListener('DOMContentLoaded', appendStyle, { once: true });
      (document.documentElement || document).appendChild(style);
    }
  }

  function waitForElement(selector, timeoutMs) {
    const existing = document.querySelector(selector);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      let observer = null;
      const timeout = globalThis.setTimeout(() => {
        if (observer) observer.disconnect();
        resolve(null);
      }, timeoutMs);

      const root = document.documentElement || document;
      observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (!found) return;
        globalThis.clearTimeout(timeout);
        observer.disconnect();
        resolve(found);
      });
      observer.observe(root, { childList: true, subtree: true });
    });
  }

  function isSimilarTorrentPage() {
    return /^\/torrents\/similar\/[12]\.\d+(?:\/)?$/i.test(location.pathname);
  }

  function isTorrentIndexPage() {
    return /^\/torrents\/?$/i.test(location.pathname);
  }

  function isTorrentShowPage() {
    return isTorrentShowUrl(location.href);
  }

  function initSingleTorrentPageRedirector() {
    if (consumeSingleTorrentViewBypass(location.href)) return;

    waitForElement(
      '.meta__title-link[href*="/torrents/similar/"], a[href*="/torrents/similar/"]',
      CONFIG.initialDomTimeoutMs
    ).then((link) => {
      const similarUrl = link ? absolutizeUrl(link.getAttribute('href')) : '';
      if (!isSupportedSimilarTorrentUrl(similarUrl)) return;
      if (new URL(similarUrl, location.href).href === location.href) return;
      location.replace(similarUrl);
    });
  }

  function initTorrentIndexLinkRedirector() {
    document.addEventListener('click', handleTorrentIndexLinkClick, true);
    document.addEventListener('auxclick', handleTorrentIndexLinkClick, true);
  }

  function handleTorrentIndexLinkClick(event) {
    if (event.defaultPrevented) return;
    if (event.type === 'click' && event.button !== 0) return;
    if (event.type === 'auxclick' && event.button !== 1) return;

    const link = getTorrentIndexShowLink(event.target);
    if (!link) return;

    const cachedUrl = getCachedSimilarUrlForTorrentLink(link);
    if (cachedUrl) {
      rewriteTorrentIndexLink(link, cachedUrl);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const pendingWindow = shouldOpenLinkInNewContext(link, event)
      ? globalThis.open('', '_blank', 'noopener')
      : null;

    prepareTorrentIndexSimilarLink(link, { priority: true })
      .then((similarUrl) => {
        navigateResolvedTorrentLink(
          similarUrl || getOriginalTorrentLinkHref(link),
          link,
          event,
          pendingWindow
        );
      })
      .catch(() => {
        navigateResolvedTorrentLink(getOriginalTorrentLinkHref(link), link, event, pendingWindow);
      });
  }

  function getTorrentIndexShowLink(target) {
    const link = target?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement)) return null;
    if (!isTorrentShowUrl(getOriginalTorrentLinkHref(link))) return null;
    if (link.closest('.unit3d-ptp-page, .unit3d-ptp-detail-actions')) return null;
    return link;
  }

  function prepareTorrentIndexSimilarLink(link, options = {}) {
    const originalHref = getOriginalTorrentLinkHref(link);
    const id = extractTorrentId(originalHref);
    if (!id) return Promise.resolve('');

    const cached = torrentSimilarUrlCache.get(id);
    if (cached) {
      rewriteTorrentIndexLink(link, cached);
      return Promise.resolve(cached);
    }

    const nearbySimilarUrl = findNearbySimilarTorrentUrl(link);
    if (nearbySimilarUrl) {
      cacheSimilarTorrentUrl(id, nearbySimilarUrl);
      rewriteTorrentIndexLink(link, nearbySimilarUrl);
      return Promise.resolve(nearbySimilarUrl);
    }

    if (!options.priority && torrentSimilarResolvePromises.has(id)) {
      return torrentSimilarResolvePromises.get(id).then((similarUrl) => {
        if (similarUrl) rewriteTorrentIndexLink(link, similarUrl);
        return similarUrl;
      });
    }

    const detailFetch = () => fetchTorrentDetail(originalHref);
    const promise = (options.priority ? detailFetch() : enqueueDetailFetch(detailFetch))
      .then((html) => extractSimilarUrlFromTorrentDetail(html, originalHref))
      .then((similarUrl) => {
        if (similarUrl) {
          cacheSimilarTorrentUrl(id, similarUrl);
          rewriteTorrentIndexLink(link, similarUrl);
        }
        return similarUrl;
      })
      .finally(() => {
        torrentSimilarResolvePromises.delete(id);
      });

    torrentSimilarResolvePromises.set(id, promise);
    return promise;
  }

  function getCachedSimilarUrlForTorrentLink(link) {
    const id = extractTorrentId(getOriginalTorrentLinkHref(link));
    const cached = id ? torrentSimilarUrlCache.get(id) : '';
    return cached || link.dataset.unit3dPtpSimilarUrl || '';
  }

  function rewriteTorrentIndexLink(link, similarUrl) {
    if (!similarUrl || !isSupportedSimilarTorrentUrl(similarUrl)) return;

    link.dataset.unit3dPtpOriginalHref = getOriginalTorrentLinkHref(link);
    link.dataset.unit3dPtpSimilarUrl = similarUrl;
    link.href = similarUrl;
  }

  function getOriginalTorrentLinkHref(link) {
    return link?.dataset?.unit3dPtpOriginalHref || link?.href || link?.getAttribute?.('href') || '';
  }

  function findNearbySimilarTorrentUrl(link) {
    const container = link.closest(
      [
        'tr',
        'article',
        'li',
        '.torrent-search--card',
        '.torrent-search--grouped',
        '.torrent-search--list',
        '.panelV2'
      ].join(',')
    );
    const similarLink = container?.querySelector?.('a[href*="/torrents/similar/"]');
    const url = similarLink ? absolutizeUrl(similarLink.getAttribute('href')) : '';
    return isSupportedSimilarTorrentUrl(url) ? url : '';
  }

  function extractSimilarUrlFromTorrentDetail(html, torrentUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const candidates = [
      ...doc.querySelectorAll(
        '.meta__title-link[href*="/torrents/similar/"], a[href*="/torrents/similar/"]'
      )
    ];

    const link = candidates.find((candidate) =>
      isSupportedSimilarTorrentUrl(new URL(candidate.getAttribute('href'), torrentUrl).href)
    );

    return link ? new URL(link.getAttribute('href'), torrentUrl).href : '';
  }

  function cacheSimilarTorrentUrl(torrentId, similarUrl) {
    if (!torrentId || !similarUrl) return;
    torrentSimilarUrlCache.set(torrentId, similarUrl);
  }

  function isTorrentShowUrl(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return false;
      return /^\/torrents\/\d+[A-Za-z0-9_-]*\/?$/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  function isSupportedSimilarTorrentUrl(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return false;
      return /^\/torrents\/similar\/[12]\.\d+\/?$/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  function shouldOpenLinkInNewContext(link, event) {
    return (
      event.button === 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (link.target && link.target.toLowerCase() !== '_self')
    );
  }

  function navigateResolvedTorrentLink(url, link, event, pendingWindow) {
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.opener = null;
      pendingWindow.location.href = url;
      return;
    }

    if (shouldOpenLinkInNewContext(link, event)) {
      globalThis.open(url, '_blank', 'noopener');
      return;
    }

    location.assign(url);
  }

  function initAdapter() {
    decorateAitherTrackerIcons();
    removeAlsoDownloadedPanels();
    removeCompactSearchFilters();
    removeCookieConsentAlerts();
    rebuildAdapter();
    watchNativeList();
    watchMetaSection();
    waitForElement('section.meta', CONFIG.initialDomTimeoutMs).then(() => watchMetaSection());
    watchAlsoDownloadedPanels();
    watchCompactSearchFilters();
    watchCookieConsentAlerts();
    document.addEventListener('click', handleTorrentInfoClick);
    document.addEventListener('click', handleTvGroupToggleClick);
    document.addEventListener('click', handleTorrentTableSortClick, true);
    document.addEventListener('keydown', handleTorrentTableSortKeydown, true);
    document.addEventListener('keydown', handleTvGroupToggleKeydown);
    document.addEventListener('click', handleComparisonClick);
    document.addEventListener('click', handleMediaInfoToggleClick);
    document.addEventListener('click', handleDescriptionLightboxClick);
    document.addEventListener('click', handleInlineCopyClick, true);
    initSimilarPageSingleTorrentViewBypass();
    document.addEventListener('keydown', handleComparisonKeydown);
    document.addEventListener('keydown', handleDescriptionLightboxKeydown);
    document.addEventListener('mousemove', handleComparisonMousemove);
  }

  function initSimilarPageSingleTorrentViewBypass() {
    document.addEventListener('click', handleSimilarPageSingleTorrentViewIntent, true);
    document.addEventListener('auxclick', handleSimilarPageSingleTorrentViewIntent, true);
    document.addEventListener('pointerdown', handleSimilarPageSingleTorrentViewIntent, true);
  }

  function handleSimilarPageSingleTorrentViewIntent(event) {
    const link = getSimilarPageSingleTorrentViewLink(event.target);
    if (!link) return;

    rememberSingleTorrentViewBypass(link.href);
  }

  function getSimilarPageSingleTorrentViewLink(target) {
    const link = target?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement)) return null;
    if (!isTorrentShowUrl(link.href)) return null;
    if (link.closest('.unit3d-ptp-detail-actions')) return null;
    if (!link.closest('.unit3d-ptp-overview-cell, .torrent-search--grouped__overview')) return null;

    const isViewAction =
      link.classList.contains('link_1') ||
      normalizeWhitespace(link.textContent).toLowerCase() === 'view' ||
      link.getAttribute('title') === 'View torrent page';
    return isViewAction ? link : null;
  }

  function rememberSingleTorrentViewBypass(torrentUrl) {
    const key = normalizeSingleTorrentViewBypassKey(torrentUrl);
    if (!key) return;

    const entries = readSingleTorrentViewBypassEntries();
    const now = Date.now();
    pruneSingleTorrentViewBypassEntries(entries, now);
    entries[key] = now + SINGLE_TORRENT_VIEW_BYPASS_TTL_MS;
    writeSingleTorrentViewBypassEntries(entries);
  }

  function consumeSingleTorrentViewBypass(torrentUrl) {
    const key = normalizeSingleTorrentViewBypassKey(torrentUrl);
    if (!key) return false;

    const entries = readSingleTorrentViewBypassEntries();
    const now = Date.now();
    const expiresAt = Number(entries[key] || 0);
    const matched = expiresAt > now;
    delete entries[key];
    pruneSingleTorrentViewBypassEntries(entries, now);
    writeSingleTorrentViewBypassEntries(entries);
    return matched;
  }

  function readSingleTorrentViewBypassEntries() {
    const raw = GM_getValue(SINGLE_TORRENT_VIEW_BYPASS_STORAGE_KEY, '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
    if (typeof raw !== 'string') return {};

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeSingleTorrentViewBypassEntries(entries) {
    GM_setValue(SINGLE_TORRENT_VIEW_BYPASS_STORAGE_KEY, JSON.stringify(entries));
  }

  function pruneSingleTorrentViewBypassEntries(entries, now) {
    Object.keys(entries).forEach((key) => {
      if (Number(entries[key] || 0) <= now) delete entries[key];
    });
  }

  function normalizeSingleTorrentViewBypassKey(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return '';
      if (!isTorrentShowUrl(url.href)) return '';
      return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
    } catch {
      return '';
    }
  }

  function watchNativeList() {
    const nativeList = document.querySelector(SELECTORS.nativeList);
    if (!nativeList) return;

    if (nativeObserver) nativeObserver.disconnect();
    nativeObserver = new MutationObserver(scheduleRebuild);
    nativeObserver.observe(nativeList, { childList: true, subtree: true });
  }

  function watchMetaSection() {
    const meta = document.querySelector('section.meta');
    if (!meta) return;

    if (metaObserver) metaObserver.disconnect();
    metaObserver = new MutationObserver(scheduleRebuild);
    metaObserver.observe(meta, { childList: true, subtree: true });
  }

  function watchAlsoDownloadedPanels() {
    if (alsoDownloadedObserver) alsoDownloadedObserver.disconnect();
    alsoDownloadedObserver = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) =>
          [...mutation.addedNodes].some(
            (node) => node.nodeType === Node.ELEMENT_NODE && containsAlsoDownloadedPanel(node)
          )
        )
      ) {
        removeAlsoDownloadedPanels();
      }
    });
    alsoDownloadedObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function removeAlsoDownloadedPanels(root = document) {
    root.querySelectorAll('section.panelV2').forEach((panel) => {
      if (isAlsoDownloadedPanel(panel)) panel.remove();
    });
  }

  function containsAlsoDownloadedPanel(node) {
    return node.matches?.('section.panelV2') || node.querySelector?.('section.panelV2') || false;
  }

  function isAlsoDownloadedPanel(panel) {
    const snapshot = panel.getAttribute('wire:snapshot') || '';
    if (snapshot.includes('also-downloaded-works')) return true;

    return (
      normalizeWhitespace(panel.querySelector('.panel__heading')?.textContent) === 'Also downloaded'
    );
  }

  function watchCompactSearchFilters() {
    if (compactSearchObserver) compactSearchObserver.disconnect();
    compactSearchObserver = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) =>
          [...mutation.addedNodes].some(
            (node) => node.nodeType === Node.ELEMENT_NODE && containsCompactSearchFilter(node)
          )
        )
      ) {
        removeCompactSearchFilters();
      }
    });
    compactSearchObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function removeCompactSearchFilters(root = document) {
    root.querySelectorAll('search.compact-search.similar-torrents__filters').forEach((filter) => {
      filter.remove();
    });
  }

  function containsCompactSearchFilter(node) {
    return (
      node.matches?.('search.compact-search.similar-torrents__filters') ||
      node.querySelector?.('search.compact-search.similar-torrents__filters') ||
      false
    );
  }

  function watchCookieConsentAlerts() {
    if (cookieConsentObserver) cookieConsentObserver.disconnect();
    cookieConsentObserver = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) =>
          [...mutation.addedNodes].some(
            (node) => node.nodeType === Node.ELEMENT_NODE && containsCookieConsentAlert(node)
          )
        )
      ) {
        removeCookieConsentAlerts();
      }
    });
    cookieConsentObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function removeCookieConsentAlerts(root = document) {
    root.querySelectorAll('.alerts').forEach((alerts) => {
      if (alerts.querySelector('.js-cookie-consent, .cookie-consent')) alerts.remove();
    });

    root.querySelectorAll('.js-cookie-consent, .cookie-consent').forEach((alert) => {
      alert.remove();
    });
  }

  function containsCookieConsentAlert(node) {
    return (
      node.matches?.('.alerts, .js-cookie-consent, .cookie-consent') ||
      node.querySelector?.('.js-cookie-consent, .cookie-consent') ||
      false
    );
  }

  function scheduleRebuild() {
    globalThis.clearTimeout(rebuildTimer);
    rebuildTimer = globalThis.setTimeout(rebuildAdapter, CONFIG.observeDebounceMs);
  }

  function rebuildAdapter() {
    const nativeTables = collectNativeTorrentTables();
    const nativeTable = nativeTables[0];
    if (!nativeTable) return;

    enhanceMetaTitleLink();

    const torrents = extractTorrentRowsFromTables(nativeTables);
    const metaItems = collectMetaItems();
    const signature = [
      torrents.map(getTorrentSignature).join('\n'),
      metaItems.map(getMetaItemSignature).join('\n')
    ].join('\n---meta---\n');
    if (adapterRoot && signature === lastSignature) {
      decorateAitherTrackerIcons(adapterRoot);
      dispatchReady();
      return;
    }

    lastSignature = signature;

    if (torrents.length === 0) {
      setNativeTorrentTablesHidden(nativeTables, false);
      if (adapterRoot) adapterRoot.remove();
      adapterRoot = null;
      return;
    }

    setNativeTorrentTablesHidden(nativeTables, true);

    adapterRoot = ensureAdapterRoot(nativeTable);
    const sidebar = buildSidebar(metaItems);
    adapterRoot.classList.toggle('unit3d-ptp-page--with-sidebar', !sidebar.hidden);
    adapterRoot.replaceChildren(buildMainColumn(torrents, metaItems), sidebar);
    ensureCompatibilityShims(adapterRoot);
    decorateAitherTrackerIcons(adapterRoot);
    watchGeneratedTable();
    dispatchReady();
    maybePrefetchVisibleDetails(torrents);
  }

  function collectNativeTorrentTables() {
    const root = document.querySelector(SELECTORS.nativeList) || document;
    return [...root.querySelectorAll(SELECTORS.nativeTable)].filter(
      (table) => !table.closest(SELECTORS.adapterRoot)
    );
  }

  function extractTorrentRowsFromTables(nativeTables) {
    return nativeTables
      .flatMap((table) => {
        const context = getTorrentTableContext(table);
        return [...table.querySelectorAll(':scope > tbody > tr')].map((row) =>
          extractTorrentRow(row, context)
        );
      })
      .filter(Boolean);
  }

  function extractTorrentRow(row, context = createMovieTorrentContext()) {
    const nameLink = row.querySelector(SELECTORS.nameLink);
    if (!nameLink) return null;

    const torrentUrl = absolutizeUrl(nameLink.getAttribute('href'));
    const id = extractTorrentId(torrentUrl);
    if (!id) return null;

    const releaseName = normalizeWhitespace(nameLink.textContent);
    const sizeElement = row.querySelector(`${SELECTORS.rowSize} span`);
    const sizeText = normalizeWhitespace(sizeElement ? sizeElement.textContent : '');
    const sizeBytes = parseSizeBytes(
      sizeElement ? sizeElement.getAttribute('title') || sizeElement.textContent : ''
    );
    const quality = classifyReleaseQuality(releaseName);

    return {
      age: getCellText(row, SELECTORS.rowAge),
      completed: parseInteger(getCellText(row, SELECTORS.rowCompleted)),
      downloadUrl: findDownloadUrl(row),
      icons: cloneOptional(row.querySelector(SELECTORS.rowIcons)),
      id,
      leechers: parseInteger(getCellText(row, SELECTORS.rowLeechers)),
      quality,
      releaseGroup: extractReleaseGroup(releaseName),
      releaseName,
      seeders: parseInteger(getCellText(row, SELECTORS.rowSeeders)),
      sortEpisode: context.sortEpisode,
      sortSeason: context.sortSeason,
      sortTvScope: context.sortTvScope,
      sizeBytes,
      sizeText,
      torrentUrl,
      tvGroupKey: context.groupKey,
      tvGroupLabel: context.groupLabel,
      tvScope: context.tvScope,
      type: findTorrentType(row)
    };
  }

  function getCellText(row, selector) {
    const cell = row.querySelector(selector);
    return normalizeWhitespace(cell ? cell.textContent : '');
  }

  function findDownloadUrl(row) {
    const links = [...row.querySelectorAll(SELECTORS.rowDownload)];
    const downloadLink = links.find((link) => {
      const href = link.getAttribute('href') || '';
      return href && !href.startsWith('magnet:');
    });
    const fallback = links.find((link) => link.getAttribute('href'));
    return absolutizeUrl((downloadLink || fallback || {}).href || '');
  }

  function findTorrentType(row) {
    let current = row;
    while (current) {
      const directType = current.querySelector(`:scope > ${SELECTORS.rowType}`);
      if (directType) return normalizeWhitespace(directType.textContent);
      current = current.previousElementSibling;
    }

    const tbodyType = row.closest('tbody')?.querySelector(SELECTORS.rowType);
    return normalizeWhitespace(tbodyType ? tbodyType.textContent : '');
  }

  function getTorrentSignature(torrent) {
    return [
      torrent.id,
      torrent.releaseName,
      torrent.releaseGroup,
      torrent.quality,
      torrent.sizeBytes,
      torrent.seeders,
      torrent.leechers,
      torrent.completed,
      torrent.downloadUrl,
      torrent.type,
      torrent.age,
      torrent.tvGroupKey,
      torrent.tvGroupLabel,
      torrent.tvScope
    ].join('|');
  }

  function getMetaItemSignature(item) {
    if (!item) return '';
    const images = [...item.body.querySelectorAll('img[src]')]
      .map((image) => image.getAttribute('src') || '')
      .join('|');
    return [
      item.title,
      normalizeWhitespace(item.body.textContent).slice(0, 500),
      images,
      isCastMetaItem(item) ? 'cast' : ''
    ].join('|');
  }

  function ensureAdapterRoot(nativeTable) {
    const insertionAnchor = getNativeTorrentPanel(nativeTable) || nativeTable;
    const existing = document.querySelector(SELECTORS.adapterRoot);
    if (existing && existing.isConnected) {
      if (existing.previousElementSibling !== insertionAnchor) {
        insertionAnchor.after(existing);
      }
      return existing;
    }

    const root = document.createElement('div');
    root.className = 'page__main-content unit3d-ptp-page';
    if (!document.getElementById('content')) root.id = 'content';
    insertionAnchor.after(root);
    return root;
  }

  function getNativeTorrentPanel(nativeTable) {
    return nativeTable.closest('section.panelV2');
  }

  function setNativeTorrentTablesHidden(nativeTables, hidden) {
    nativeTables.forEach((table) => {
      table.classList.toggle('unit3d-ptp-native-source', hidden);
      table.hidden = hidden;
    });

    const panels = new Set(nativeTables.map(getNativeTorrentPanel).filter(Boolean));
    panels.forEach((panel) => {
      panel.classList.toggle('unit3d-ptp-native-source-panel', hidden);
      panel.hidden = hidden;
    });
  }

  function getTorrentTableContext(table) {
    const summaries = getTorrentDropdownSummaries(table);
    const season = summaries.find((summary) => isTorrentContextSummary(summary, 'season'));
    const episode = summaries.find((summary) => isTorrentContextSummary(summary, 'episode'));
    if (!season && !episode) return createMovieTorrentContext();

    const seasonLabel = season ? normalizeWhitespace(season.textContent) : '';
    const episodeLabel = episode ? normalizeWhitespace(episode.textContent) : '';
    const sortSeason = parseContextNumber(seasonLabel);
    const sortEpisode = parseContextNumber(episodeLabel);
    const tvScope = episode ? 'episode' : 'season';
    const groupLabel =
      tvScope === 'episode'
        ? normalizeWhitespace([seasonLabel, episodeLabel].filter(Boolean).join(' / '))
        : normalizeWhitespace([seasonLabel, 'Season Packs'].filter(Boolean).join(' / '));

    return {
      groupKey: [
        Number.isFinite(sortSeason) ? `s${String(sortSeason).padStart(3, '0')}` : 's999',
        tvScope === 'episode'
          ? Number.isFinite(sortEpisode)
            ? `e${String(sortEpisode).padStart(4, '0')}`
            : 'e9999'
          : 'season'
      ].join(':'),
      groupLabel: groupLabel || 'TV',
      sortEpisode,
      sortSeason,
      sortTvScope: tvScope === 'season' ? 0 : 1,
      tvScope
    };
  }

  function createMovieTorrentContext() {
    return {
      groupKey: 'movie',
      groupLabel: '',
      sortEpisode: Number.POSITIVE_INFINITY,
      sortSeason: Number.POSITIVE_INFINITY,
      sortTvScope: 0,
      tvScope: 'movie'
    };
  }

  function getTorrentDropdownSummaries(table) {
    const summaries = [];
    let dropdown = table.closest('details.torrent-search--grouped__dropdown');
    while (dropdown) {
      const summary = dropdown.querySelector(':scope > summary');
      if (summary) summaries.push(summary);
      dropdown = dropdown.parentElement?.closest('details.torrent-search--grouped__dropdown');
    }
    return summaries;
  }

  function isTorrentContextSummary(summary, kind) {
    if (!summary) return false;
    const binding = summary.getAttribute('x-bind') || '';
    const text = normalizeWhitespace(summary.textContent);
    if (binding.toLowerCase() === kind) return true;
    return kind === 'season' ? /^season\b/i.test(text) : /^episode\b/i.test(text);
  }

  function parseContextNumber(text) {
    const match = /\b(\d+)\b/.exec(normalizeWhitespace(text));
    return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
  }

  function buildMainColumn(torrents, metaItems = []) {
    const mainColumn = document.createElement('div');
    mainColumn.className = 'main-column';

    const linkbox = document.createElement('div');
    linkbox.className = 'linkbox unit3d-ptp-linkbox';

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'unit3d-ptp-table-scroll';
    tableWrapper.appendChild(buildTorrentTable(torrents));

    mainColumn.append(linkbox, tableWrapper);
    const synopsisPanel = buildSynopsisPanel(metaItems);
    if (synopsisPanel) mainColumn.appendChild(synopsisPanel);
    const castPanel = buildCastPanel(metaItems);
    if (castPanel) mainColumn.appendChild(castPanel);
    return mainColumn;
  }

  function buildSidebar(metaItems = []) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar unit3d-ptp-sidebar';
    const metaPanels = buildMetaSidebarPanels(metaItems);
    if (metaPanels.length > 0) {
      sidebar.append(...metaPanels);
    } else {
      sidebar.hidden = true;
    }
    return sidebar;
  }

  function buildMetaSidebarPanels(items = []) {
    items = items.filter((item) => !isSynopsisTitle(item.title) && !isCastMetaItem(item));
    if (items.length === 0) return [];

    const titleCounts = new Map();
    return items.map(({ body, title }) => {
      const uniqueTitle = getUniquePanelTitle(title, titleCounts);
      const isPosterPanel = isPosterSidebarTitle(uniqueTitle);
      const isIdsPanel = isIdsSidebarTitle(uniqueTitle);
      const panel = document.createElement('section');
      panel.className = 'panelV2 unit3d-ptp-meta-sidebar-panel';
      panel.classList.toggle('unit3d-ptp-poster-panel', isPosterPanel);
      panel.classList.toggle('unit3d-ptp-ids-panel', isIdsPanel);

      const panelBody = document.createElement('div');
      panelBody.className = 'panel__body';
      if (isPosterPanel) markPosterPanelBody(body);
      panelBody.appendChild(body);

      if (isPosterPanel) {
        panel.appendChild(panelBody);
      } else {
        const heading = document.createElement('h2');
        heading.className = 'panel__heading';
        heading.textContent = uniqueTitle;
        panel.append(heading, panelBody);
      }
      return panel;
    });
  }

  function buildSynopsisPanel(metaItems = []) {
    const item = metaItems.find((candidate) => isSynopsisTitle(candidate.title));
    if (!item) return null;

    const panel = document.createElement('section');
    panel.className = 'panelV2 unit3d-ptp-synopsis-panel';

    const heading = document.createElement('h2');
    heading.className = 'panel__heading';
    heading.textContent = item.title;

    const body = document.createElement('div');
    body.className = 'panel__body';
    body.appendChild(item.body);

    panel.append(heading, body);
    return panel;
  }

  function buildCastPanel(metaItems = []) {
    const castCards = metaItems.filter(isCastMetaItem).flatMap((item) => getCastCards(item.body));
    if (castCards.length === 0) return null;

    const panel = document.createElement('section');
    panel.className = 'panelV2 unit3d-ptp-cast-panel';

    const heading = document.createElement('h2');
    heading.className = 'panel__heading';
    heading.textContent = 'Cast';

    const body = document.createElement('div');
    body.className = 'panel__body';

    const grid = document.createElement('div');
    grid.className = 'unit3d-ptp-cast-grid';
    grid.append(...castCards.slice(0, 16));

    body.appendChild(grid);
    panel.append(heading, body);
    return panel;
  }

  function collectMetaItems() {
    const meta = document.querySelector('section.meta');
    if (!meta) return [];

    return [...meta.children]
      .filter((child) => child instanceof HTMLElement)
      .filter((child) => !shouldRemoveMetaChild(child))
      .filter((child) => {
        const keep = shouldKeepMetaChildInHeader(child);
        child.classList.toggle('unit3d-ptp-meta-sidebar-hidden', !keep);
        return !keep;
      })
      .map((child) => ({
        body: cloneMetaSidebarItem(child),
        title: getMetaSidebarPanelTitle(child)
      }))
      .filter(Boolean);
  }

  function shouldKeepMetaChildInHeader(child) {
    return Boolean(
      (isMetaIdsInlinePlacement() && child.matches('.meta__ids')) ||
      child.matches(
        '.meta__title-link, .meta__actions, .meta__action, .meta__tags, .torrent__tags, [class*="__actions"]'
      )
    );
  }

  function shouldRemoveMetaChild(child) {
    const remove = child.matches('.meta__backdrop');
    if (remove) child.remove();
    return remove;
  }

  function enhanceMetaTitleLink() {
    const meta = document.querySelector('section.meta');
    const titleLink = meta?.querySelector('.meta__title-link');
    if (!meta || !titleLink) return;

    placeMetaIdsInline(meta, titleLink);

    if (titleLink.querySelector('.unit3d-ptp-title-director')) return;

    const director = getFirstDirectorName(meta);
    if (!director) return;

    const directorElement = document.createElement('span');
    directorElement.className = 'unit3d-ptp-title-director';
    directorElement.textContent = `(${director})`;
    titleLink.appendChild(directorElement);
  }

  function placeMetaIdsInline(meta, titleLink) {
    const ids = meta.querySelector(':scope > .meta__ids');
    if (!ids) return;

    ids.classList.toggle('unit3d-ptp-inline-ids', isMetaIdsInlinePlacement());
    if (isMetaIdsInlinePlacement() && ids.previousElementSibling !== titleLink) {
      titleLink.after(ids);
    }
  }

  function isMetaIdsInlinePlacement() {
    return getLayoutSetting('metaIdsPlacement') === 'inline';
  }

  function getFirstDirectorName(meta) {
    const keyValueDirector = findDirectorInKeyValue(meta);
    if (keyValueDirector) return keyValueDirector;

    const labelledDirector = findDirectorNearLabel(meta);
    if (labelledDirector) return labelledDirector;

    return '';
  }

  function findDirectorInKeyValue(root) {
    for (const group of root.querySelectorAll('.key-value__group, tr')) {
      const label = normalizeWhitespace(group.querySelector('dt, th, strong')?.textContent);
      if (!/^directors?:?$/i.test(label)) continue;

      const value = group.querySelector('dd, td:last-child');
      const name = getFirstNameFromElement(value);
      if (name) return name;
    }

    return '';
  }

  function findDirectorNearLabel(root) {
    const labels = [...root.querySelectorAll('h2, h3, h4, dt, th, strong, span, div')].filter(
      (element) => /^directors?:?$/i.test(normalizeWhitespace(element.textContent))
    );

    for (const label of labels) {
      const container = label.closest('section, .meta__section, .key-value__group, tr, li, div');
      const name = getFirstNameFromElement(container, label);
      if (name) return name;

      const nextName = getFirstNameFromElement(label.nextElementSibling);
      if (nextName) return nextName;
    }

    return '';
  }

  function getFirstNameFromElement(element, excludedElement = null) {
    if (!element) return '';

    const link = [...element.querySelectorAll('a')].find(
      (candidate) => candidate !== excludedElement && normalizeWhitespace(candidate.textContent)
    );
    if (link) return normalizeWhitespace(link.textContent);

    const text = normalizeWhitespace(element.textContent).replace(/^directors?:?\s*/i, '');
    return (
      text
        .split(/\s{2,}|\s*[|,]\s*/)
        .map(normalizeWhitespace)
        .find(Boolean) || ''
    );
  }

  function getUniquePanelTitle(title, counts) {
    const baseTitle = title || 'Info';
    const count = (counts.get(baseTitle) || 0) + 1;
    counts.set(baseTitle, count);
    return count === 1 ? baseTitle : `${baseTitle} ${count}`;
  }

  function getMetaSidebarPanelTitle(child) {
    const heading = normalizeWhitespace(
      child.querySelector(
        ':scope > .panel__heading, :scope > header .panel__heading, :scope > h2, :scope > h3'
      )?.textContent
    );
    if (heading) return normalizeMetaSidebarTitle(heading);

    const classTitle = [...child.classList]
      .filter((className) => !className.startsWith('unit3d-ptp-'))
      .map((className) => className.replace(/^meta__|^work__|^torrent__/, ''))
      .map(humanizeIdentifier)
      .find(Boolean);

    return normalizeMetaSidebarTitle(classTitle || child.tagName.toLowerCase());
  }

  function normalizeMetaSidebarTitle(title) {
    if (/^ids?$/i.test(title)) return 'IDs';
    return /^description$/i.test(title) ? 'Sypnosis' : title;
  }

  function isSynopsisTitle(title) {
    return /^sypnosis$/i.test(title) || /^synopsis$/i.test(title) || /^description$/i.test(title);
  }

  function isCastMetaItem(item) {
    if (!item) return false;
    if (isPosterSidebarTitle(item.title)) return false;
    if (isChipsTitle(item.title)) return getCastImages(item.body).length > 0;
    if (isCastTitle(item.title)) return true;
    return hasCastMarkers(item.body) || hasCastImageSet(item.body);
  }

  function isCastTitle(title) {
    return /\b(cast|actors?|actresses|credits|crew|stars?)\b/i.test(normalizeWhitespace(title));
  }

  function isChipsTitle(title) {
    return /^chips$/i.test(normalizeWhitespace(title));
  }

  function hasCastMarkers(body) {
    if (!body) return false;
    return [body, ...body.querySelectorAll('*')].some((element) =>
      [...element.classList].some((className) => /(cast|credit|person|actor|crew)/i.test(className))
    );
  }

  function hasCastImageSet(body) {
    const images = getCastImages(body);
    if (images.length < 2) return false;
    return images.some((image) => image.closest('a[href*="/people/"], a[href*="/person/"]'));
  }

  function isPosterSidebarTitle(title) {
    return /^poster(?: link)?$/i.test(title);
  }

  function isIdsSidebarTitle(title) {
    return /^ids?$/i.test(title);
  }

  function cloneMetaSidebarItem(child) {
    const clone = child.cloneNode(true);
    clone.classList.remove('unit3d-ptp-meta-sidebar-hidden');
    clone.classList.add('unit3d-ptp-meta-sidebar-item');
    clone.querySelectorAll('script').forEach((script) => script.remove());
    clone.querySelectorAll('a[href]').forEach((link) => {
      link.setAttribute('href', absolutizeUrl(link.getAttribute('href')));
      if (link instanceof HTMLAnchorElement) openLinkInNewTab(link);
    });
    clone.querySelectorAll('img[src]').forEach((image) => {
      image.setAttribute('src', absolutizeUrl(image.getAttribute('src')));
      if (isIdIconImage(image) || image.closest('.meta__ids, .meta-id-tag')) {
        image.classList.add('unit3d-ptp-id-icon');
      }
    });
    return clone;
  }

  function isIdIconImage(image) {
    const sourceName = image.src ? image.src.split('/').pop() || '' : '';
    const text = `${sourceName} ${image.alt || ''} ${image.title || ''} ${image.className || ''}`;
    return /\b(imdb|tmdb|tvdb|mal)\b/i.test(text);
  }

  function markPosterPanelBody(body) {
    body.querySelectorAll('img').forEach((image) => {
      image.classList.remove('unit3d-ptp-id-icon');
      image.classList.add('unit3d-ptp-poster-image');
    });
  }

  function getCastCards(body) {
    return getCastImages(body).map((image) => buildCastCard(image, body));
  }

  function getCastImages(body) {
    if (!body) return [];
    return [...body.querySelectorAll('img[src]')].filter(isCastImage);
  }

  function isCastImage(image) {
    if (image.classList.contains('unit3d-ptp-id-icon') || isIdIconImage(image)) return false;

    const src = image.getAttribute('src') || image.src || '';
    const text = `${src} ${image.alt || ''} ${image.title || ''} ${image.className || ''}`;
    return !/(\/img\/icon_|torrent-icons|hdr10?\+?|dolby|vision|user-icons|avatar|badge|flag)/i.test(
      text
    );
  }

  function buildCastCard(image, body) {
    const source = getCastCardSource(image, body);
    const link = image.closest('a[href]') || source.querySelector?.('a[href]');
    const { character, name } = getCastCardTextParts(source, image, link);

    const card = document.createElement('div');
    card.className = 'unit3d-ptp-cast-card';

    const imageClone = image.cloneNode(true);
    imageClone.removeAttribute('width');
    imageClone.removeAttribute('height');
    imageClone.removeAttribute('style');
    imageClone.setAttribute('src', absolutizeUrl(imageClone.getAttribute('src')));

    if (link) {
      const imageLink = document.createElement('a');
      imageLink.className = 'unit3d-ptp-cast-image-link';
      imageLink.setAttribute('href', absolutizeUrl(link.getAttribute('href')));
      openLinkInNewTab(imageLink);
      imageLink.appendChild(imageClone);
      card.appendChild(imageLink);
    } else {
      card.appendChild(imageClone);
    }

    if (name || character) {
      const textElement = document.createElement(link ? 'a' : 'span');
      textElement.className = 'unit3d-ptp-cast-text';
      if (link) {
        textElement.setAttribute('href', absolutizeUrl(link.getAttribute('href')));
        openLinkInNewTab(textElement);
      }
      if (name) {
        const nameElement = document.createElement('span');
        nameElement.className = 'unit3d-ptp-cast-name';
        nameElement.textContent = name;
        textElement.appendChild(nameElement);
      }
      if (character) {
        const characterElement = document.createElement('span');
        characterElement.className = 'unit3d-ptp-cast-character';
        characterElement.textContent = character;
        textElement.appendChild(characterElement);
      }
      card.appendChild(textElement);
    }

    return card;
  }

  function getCastCardSource(image, body) {
    let candidate = image.parentElement;
    let fallback = image.parentElement || image;

    while (candidate && candidate !== body) {
      const imageCount = candidate.querySelectorAll('img[src]').length;
      const hasText = Boolean(normalizeWhitespace(candidate.textContent));
      if (candidate.matches('li, article, figure')) return candidate;
      if (imageCount === 1 && hasText) fallback = candidate;
      candidate = candidate.parentElement;
    }

    return fallback;
  }

  function getCastCardTextParts(source, image, link) {
    const chipName = normalizeWhitespace(source.querySelector?.('.meta-chip__name')?.textContent);
    const chipValue = normalizeWhitespace(source.querySelector?.('.meta-chip__value')?.textContent);
    if (chipName || chipValue) return { character: chipValue, name: chipName };

    const clone = source.cloneNode(true);
    clone.querySelectorAll('img, svg, script').forEach((element) => element.remove());
    const linkText = normalizeWhitespace(link?.textContent);
    const fullText = normalizeWhitespace(clone.textContent);
    const name = normalizeWhitespace(image.alt || image.title || linkText || fullText);
    let character = fullText;

    if (name && character) {
      character = normalizeWhitespace(
        character
          .replace(new RegExp(escapeRegExp(name), 'i'), '')
          .replace(/^[-–—|:/\s]+|[-–—|:/\s]+$/g, '')
      );
    }

    if (character && name && character.toLowerCase() === name.toLowerCase()) character = '';
    return { character, name };
  }

  function getSectionedTorrents(torrents) {
    return QUALITY_SECTIONS.map((section) => ({
      section,
      torrents: torrents
        .filter((torrent) => normalizeQualityId(torrent.quality) === section.id)
        .sort((left, right) => compareTorrents(left, right, currentSort))
    })).filter(({ torrents: sectionTorrents }) => sectionTorrents.length > 0);
  }

  function getGroupedTorrents(torrents) {
    const hasTvGroups = torrents.some((torrent) => torrent.tvScope !== 'movie');
    if (!hasTvGroups) return [{ group: null, sections: getSectionedTorrents(torrents) }];

    const groups = new Map();
    torrents.forEach((torrent, index) => {
      const key = torrent.tvGroupKey || 'movie';
      if (!groups.has(key)) {
        groups.set(key, {
          index,
          key,
          label: torrent.tvGroupLabel || 'TV',
          sections: [],
          sortEpisode: torrent.sortEpisode,
          sortSeason: torrent.sortSeason,
          sortTvScope: torrent.sortTvScope
        });
      }
      const group = groups.get(key);
      if (!group.torrents) group.torrents = [];
      group.torrents.push(torrent);
    });

    const sortedGroups = [...groups.values()].sort(compareTorrentGroups);
    if (sortedGroups.length === 1) {
      const [group] = sortedGroups;
      return [{ group: null, sections: getSectionedTorrents(group.torrents) }];
    }

    return sortedGroups.map((group) => ({
      group,
      sections: getSectionedTorrents(group.torrents)
    }));
  }

  function compareTorrentGroups(left, right) {
    return (
      compareGroupNumberDesc(left.sortSeason, right.sortSeason) ||
      compareGroupNumberDesc(left.sortTvScope, right.sortTvScope) ||
      compareGroupNumberDesc(left.sortEpisode, right.sortEpisode) ||
      left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' }) ||
      left.index - right.index
    );
  }

  function compareGroupNumberDesc(left, right) {
    const leftFinite = Number.isFinite(left);
    const rightFinite = Number.isFinite(right);
    if (leftFinite && !rightFinite) return -1;
    if (!leftFinite && rightFinite) return 1;
    if (!leftFinite && !rightFinite) return 0;
    return right - left;
  }

  function buildTorrentTable(torrents) {
    const table = document.createElement('table');
    table.id = 'torrent-table';
    table.className = 'torrent_table table table--panel-like';

    table.appendChild(buildTableHead());

    const tbody = document.createElement('tbody');
    let stripeIndex = 0;
    getGroupedTorrents(torrents).forEach(({ group, sections }, groupIndex) => {
      const collapsed = Boolean(group && groupIndex > 0);
      if (group) tbody.appendChild(buildTvGroupRow(group, collapsed));
      sections.forEach(({ section, torrents: sectionTorrents }) => {
        tbody.appendChild(
          buildQualitySectionRow(section, sectionTorrents.length, group?.key, collapsed)
        );
        sectionTorrents.forEach((torrent) => {
          stripeIndex += 1;
          tbody.append(
            applyTorrentRowStripe(buildTorrentHeaderRow(torrent, collapsed), stripeIndex),
            applyTorrentRowStripe(buildTorrentDetailRow(torrent), stripeIndex)
          );
        });
      });
    });
    table.appendChild(tbody);

    return table;
  }

  function buildTableHead() {
    const thead = document.createElement('thead');
    const row = document.createElement('tr');
    SORT_COLUMNS.forEach((column) => {
      if (column.key === 'sizeBytes') row.appendChild(buildStaticHeaderCell(''));

      const th = document.createElement('th');
      th.dataset.unit3dSortKey = column.key;
      th.scope = 'col';
      th.tabIndex = 0;
      th.append(document.createTextNode(column.label), buildSortIndicator(column.key));
      row.appendChild(th);
    });
    updateSortHeaderState(row);
    thead.appendChild(row);
    return thead;
  }

  function buildStaticHeaderCell(label) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    return th;
  }

  function buildSortIndicator(key) {
    const indicator = document.createElement('span');
    indicator.className = 'unit3d-ptp-sort-indicator';
    indicator.dataset.unit3dSortIndicator = key;
    indicator.setAttribute('aria-hidden', 'true');
    return indicator;
  }

  function buildQualitySectionRow(section, count, tvGroupKey = '', collapsed = false) {
    const row = document.createElement('tr');
    row.className = `unit3d-ptp-section-row unit3d-ptp-section-${section.id}`;
    row.dataset.unit3dQualitySection = section.id;
    if (tvGroupKey) row.dataset.unit3dTvGroupKey = tvGroupKey;
    row.hidden = collapsed;

    const cell = document.createElement('th');
    cell.colSpan = TORRENT_TABLE_COLUMN_COUNT;
    cell.scope = 'rowgroup';

    const title = document.createElement('span');
    title.className = 'unit3d-ptp-section-title';
    title.textContent = section.label;

    const countElement = document.createElement('span');
    countElement.className = 'unit3d-ptp-section-count';
    countElement.textContent = `(${count})`;

    cell.append(title, countElement);
    row.appendChild(cell);
    return row;
  }

  function buildTvGroupRow(group, collapsed = false) {
    const row = document.createElement('tr');
    row.className = 'unit3d-ptp-tv-group-row';
    row.dataset.unit3dTvGroupKey = group.key;

    const cell = document.createElement('th');
    cell.colSpan = TORRENT_TABLE_COLUMN_COUNT;
    cell.scope = 'rowgroup';
    const button = document.createElement('button');
    button.className = 'unit3d-ptp-tv-group-toggle';
    button.type = 'button';
    button.dataset.unit3dTvGroupToggle = group.key;
    button.setAttribute('aria-expanded', String(!collapsed));
    button.textContent = group.label;
    cell.appendChild(button);
    row.appendChild(cell);
    return row;
  }

  function buildTorrentHeaderRow(torrent, collapsed = false) {
    const row = document.createElement('tr');
    row.className = 'group_torrent group_torrent_header';
    row.id = `group_torrent_header_${torrent.id}`;
    row.dataset.unit3dTorrentId = torrent.id;
    row.dataset.unit3dQuality = torrent.quality;
    row.dataset.releasename = torrent.releaseName;
    row.dataset.releasegroup = torrent.releaseGroup;
    row.dataset.sizeBytes = String(torrent.sizeBytes || 0);
    row.dataset.seeders = String(torrent.seeders || 0);
    row.dataset.leechers = String(torrent.leechers || 0);
    row.dataset.completed = String(torrent.completed || 0);
    row.dataset.unit3dTvEpisodeSort = String(torrent.sortEpisode);
    row.dataset.unit3dTvGroupKey = torrent.tvGroupKey || 'movie';
    row.dataset.unit3dTvGroupLabel = torrent.tvGroupLabel || '';
    row.dataset.unit3dTvScope = torrent.tvScope || 'movie';
    row.dataset.unit3dTvScopeSort = String(torrent.sortTvScope);
    row.dataset.unit3dTvSeasonSort = String(torrent.sortSeason);
    row.hidden = collapsed;

    row.append(
      buildOverviewCell(torrent),
      buildStatusBadgesCell(torrent),
      buildSizeCell(torrent),
      buildNumericCell(torrent.seeders, 'seeders'),
      buildNumericCell(torrent.leechers, 'leechers'),
      buildNumericCell(torrent.completed, 'completed')
    );

    return row;
  }

  function buildOverviewCell(torrent) {
    const cell = document.createElement('td');
    cell.className = 'unit3d-ptp-overview-cell';

    const actionSpan = document.createElement('span');
    actionSpan.className = 'basic-movie-list__torrent__action';
    actionSpan.append(
      buildActionLink('link_1', torrent.torrentUrl, 'View', 'View torrent page'),
      document.createTextNode(' '),
      buildActionLink('link_2', torrent.downloadUrl || torrent.torrentUrl, 'DL', 'Download torrent')
    );

    const infoLink = buildReleaseInfoLink(torrent);
    infoLink.dataset.unit3dTorrentId = torrent.id;

    cell.append(
      actionSpan,
      document.createTextNode(' '),
      buildAitherTrackerIcon(),
      document.createTextNode(' '),
      infoLink
    );
    const visionIcons = cloneVisionBadges(torrent.icons);
    if (visionIcons) {
      const badges = document.createElement('span');
      badges.className = 'unit3d-ptp-badges';
      badges.appendChild(visionIcons);
      cell.append(document.createTextNode(' '), badges);
    }

    return cell;
  }

  function buildAitherTrackerIcon() {
    const img = document.createElement('img');
    img.className = 'unit3d-ptp-tracker-icon unit3d-ptp-aither-tracker-icon';
    img.src = AITHER_TRACKER_ICON;
    img.alt = 'Aither';
    img.title = 'Aither';
    img.width = 16;
    img.height = 16;
    return img;
  }

  function decorateAitherTrackerIcons(root = document) {
    root
      .querySelectorAll('.unit3d-ptp-overview-cell, .torrent-search--grouped__overview')
      .forEach((cell) => {
        decorateAitherTrackerIconCell(cell);
      });
  }

  function decorateAitherTrackerIconCell(cell) {
    if (!cell || cell.closest?.('tr.unit3d-external-release')) return;
    if (cell.querySelector('.unit3d-ptp-aither-tracker-icon')) return;

    const infoLink =
      cell.querySelector('a.torrent-info-link[href*="/torrents/"]') ||
      cell.querySelector('.torrent-search--grouped__name a[href*="/torrents/"]');
    if (!infoLink || infoLink.dataset.unit3dAddReleasesExternal === 'true') return;

    infoLink.before(buildAitherTrackerIcon(), document.createTextNode(' '));
  }

  function initAitherTrackerIconDecorator() {
    decorateAitherTrackerIcons();

    const startObserver = () => {
      if (aitherIconObserver || !document.body) return;
      aitherIconObserver = new MutationObserver(scheduleAitherTrackerIconDecorate);
      aitherIconObserver.observe(document.body, { childList: true, subtree: true });
      decorateAitherTrackerIcons();
    };

    if (document.body) {
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    }
  }

  function scheduleAitherTrackerIconDecorate() {
    globalThis.clearTimeout(aitherIconTimer);
    aitherIconTimer = globalThis.setTimeout(() => {
      decorateAitherTrackerIcons();
    }, CONFIG.observeDebounceMs);
  }

  function buildReleaseInfoLink(torrent) {
    const link = document.createElement('a');
    link.className = 'torrent-info-link link_3';
    link.href = torrent.torrentUrl || '#';
    link.title = 'Toggle torrent details';
    link.append(...buildReleaseNameNodes(torrent));
    openLinkInNewTab(link);
    return link;
  }

  function buildStatusBadgesCell(torrent) {
    const cell = document.createElement('td');
    cell.className = 'unit3d-ptp-status-badges-cell';

    const statusIcons = cloneStatusBadges(torrent.icons);
    if (statusIcons) {
      const badges = document.createElement('span');
      badges.className = 'unit3d-ptp-badges unit3d-ptp-status-badges';
      badges.appendChild(statusIcons);
      cell.appendChild(badges);
    }

    return cell;
  }

  function buildActionLink(className, href, text, title) {
    const link = document.createElement('a');
    link.className = className;
    link.href = href || '#';
    link.textContent = text;
    if (title) link.title = title;
    openLinkInNewTab(link);
    return link;
  }

  function buildSizeCell(torrent) {
    const cell = document.createElement('td');
    cell.className = 'nobr';

    const span = document.createElement('span');
    span.className = 'size-span';
    span.title = String(torrent.sizeBytes || 0);
    span.textContent = torrent.sizeText || formatBytes(torrent.sizeBytes);
    cell.appendChild(span);

    return cell;
  }

  function buildNumericCell(value, type) {
    const cell = document.createElement('td');
    cell.className = `unit3d-ptp-${type}`;
    cell.textContent = String(value || 0);
    return cell;
  }

  function buildTorrentDetailRow(torrent) {
    const row = document.createElement('tr');
    row.className = 'torrent_info_row unit3d-ptp-detail-row';
    row.dataset.unit3dTorrentId = torrent.id;
    row.dataset.unit3dTvGroupKey = torrent.tvGroupKey || 'movie';
    row.hidden = true;

    const cell = document.createElement('td');
    cell.colSpan = TORRENT_TABLE_COLUMN_COUNT;
    row.appendChild(cell);

    return row;
  }

  function ensureCompatibilityShims(root) {
    const title = document.querySelector('h1:not(.page__title), .torrent__name');
    if (title && !document.querySelector('.page__title')) title.classList.add('page__title');

    if (!root.querySelector('.linkbox')) {
      const linkbox = document.createElement('div');
      linkbox.className = 'linkbox';
      root.prepend(linkbox);
    }
  }

  function watchGeneratedTable() {
    const tbody = document.querySelector('#torrent-table > tbody');
    if (!tbody) return;

    if (pairingObserver) pairingObserver.disconnect();
    pairingObserver = new MutationObserver(() => {
      if (isPairingRows) return;
      normalizeSectionedTable(tbody);
    });
    pairingObserver.observe(tbody, { childList: true });
  }

  function handleTorrentTableSortClick(event) {
    const header = event.target.closest?.('#torrent-table th[data-unit3d-sort-key]');
    if (!header || !adapterRoot || !adapterRoot.contains(header)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    sortTableByColumn(header.dataset.unit3dSortKey);
  }

  function handleTorrentTableSortKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const header = event.target.closest?.('#torrent-table th[data-unit3d-sort-key]');
    if (!header || !adapterRoot || !adapterRoot.contains(header)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    sortTableByColumn(header.dataset.unit3dSortKey);
  }

  function handleTvGroupToggleClick(event) {
    const button = event.target.closest?.('.unit3d-ptp-tv-group-toggle');
    if (!button || !adapterRoot || !adapterRoot.contains(button)) return;

    event.preventDefault();
    toggleTvGroup(
      button.dataset.unit3dTvGroupToggle,
      button.getAttribute('aria-expanded') !== 'true'
    );
  }

  function handleTvGroupToggleKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const button = event.target.closest?.('.unit3d-ptp-tv-group-toggle');
    if (!button || !adapterRoot || !adapterRoot.contains(button)) return;

    event.preventDefault();
    toggleTvGroup(
      button.dataset.unit3dTvGroupToggle,
      button.getAttribute('aria-expanded') !== 'true'
    );
  }

  function toggleTvGroup(groupKey, expanded) {
    if (!groupKey) return;
    const table = document.querySelector('#torrent-table');
    const tbody = table?.tBodies?.[0];
    if (!tbody) return;

    const button = tbody.querySelector(
      `.unit3d-ptp-tv-group-toggle[data-unit3d-tv-group-toggle="${cssEscape(groupKey)}"]`
    );
    if (button) button.setAttribute('aria-expanded', String(expanded));

    tbody
      .querySelectorAll(`tr[data-unit3d-tv-group-key="${cssEscape(groupKey)}"]`)
      .forEach((row) => {
        if (row.matches('.unit3d-ptp-tv-group-row')) return;
        if (!expanded) {
          row.hidden = true;
          return;
        }

        if (row.matches('.torrent_info_row')) {
          const header = tbody.querySelector(
            `tr.group_torrent_header[data-unit3d-torrent-id="${cssEscape(row.dataset.unit3dTorrentId)}"]`
          );
          row.hidden =
            header?.querySelector('a.torrent-info-link')?.getAttribute('aria-expanded') !== 'true';
          return;
        }

        row.hidden = false;
      });
  }

  function sortTableByColumn(key) {
    const column = SORT_COLUMN_BY_KEY.get(key);
    if (!column) return;

    const direction =
      currentSort.key === key
        ? currentSort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : column.defaultDirection;

    currentSort = { direction, key };

    const table = document.querySelector('#torrent-table');
    const tbody = table?.tBodies?.[0];
    if (!tbody) return;

    updateSortHeaderState(table.tHead);
    normalizeSectionedTable(tbody, { force: true });
  }

  function updateSortHeaderState(root) {
    if (!root) return;

    root.querySelectorAll('th[data-unit3d-sort-key]').forEach((header) => {
      const key = header.dataset.unit3dSortKey;
      const active = key === currentSort.key;
      header.setAttribute(
        'aria-sort',
        active ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
      );

      const indicator = header.querySelector('.unit3d-ptp-sort-indicator');
      if (indicator)
        indicator.textContent = active ? (currentSort.direction === 'asc' ? '^' : 'v') : '';
    });
  }

  function normalizeSectionedTable(tbody, options = {}) {
    const pairs = collectTorrentRowPairs(tbody);
    if (pairs.length === 0) return;

    const nextRows = [];
    let stripeIndex = 0;
    const collapsedGroups = getCollapsedTvGroups(tbody);
    const groups = getRowPairGroups(pairs);
    groups.forEach((group) => {
      const collapsed = collapsedGroups.has(group.key);
      if (group.key !== 'movie') nextRows.push(buildTvGroupRow(group, collapsed));

      QUALITY_SECTIONS.forEach((section) => {
        const sectionPairs = group.pairs
          .filter((pair) => pair.quality === section.id)
          .sort((left, right) => compareRowPairs(left, right, currentSort));

        if (sectionPairs.length === 0) return;

        nextRows.push(buildQualitySectionRow(section, sectionPairs.length, group.key, collapsed));
        sectionPairs.forEach((pair) => {
          stripeIndex += 1;
          pair.header.hidden = collapsed;
          nextRows.push(applyTorrentRowStripe(pair.header, stripeIndex));
          if (pair.detail) {
            pair.detail.hidden =
              collapsed ||
              pair.header.querySelector('a.torrent-info-link')?.getAttribute('aria-expanded') !==
                'true';
            nextRows.push(applyTorrentRowStripe(pair.detail, stripeIndex));
          }
        });
      });
    });

    if (!options.force && hasSameChildOrder(tbody, nextRows)) return;

    pauseGeneratedTableObserver(tbody, () => {
      tbody.replaceChildren(...nextRows);
    });
  }

  function applyTorrentRowStripe(row, index) {
    if (!row) return row;

    row.classList.toggle('unit3d-ptp-row-odd', index % 2 === 1);
    row.classList.toggle('unit3d-ptp-row-even', index % 2 === 0);
    return row;
  }

  function collectTorrentRowPairs(tbody) {
    const detailRows = new Map(
      [...tbody.querySelectorAll('tr.torrent_info_row[data-unit3d-torrent-id]')].map((row) => [
        row.dataset.unit3dTorrentId,
        row
      ])
    );

    return [...tbody.querySelectorAll('tr.group_torrent.group_torrent_header')].map(
      (header, index) => {
        const quality = normalizeQualityId(header.dataset.unit3dQuality);
        header.dataset.unit3dQuality = quality;

        return {
          detail: detailRows.get(header.dataset.unit3dTorrentId) || null,
          groupKey: header.dataset.unit3dTvGroupKey || 'movie',
          groupLabel: header.dataset.unit3dTvGroupLabel || '',
          header,
          index,
          quality,
          sortEpisode: parseSortDatasetNumber(header.dataset.unit3dTvEpisodeSort),
          sortSeason: parseSortDatasetNumber(header.dataset.unit3dTvSeasonSort),
          sortTvScope: parseSortDatasetNumber(header.dataset.unit3dTvScopeSort)
        };
      }
    );
  }

  function getCollapsedTvGroups(tbody) {
    return new Set(
      [...tbody.querySelectorAll('.unit3d-ptp-tv-group-toggle[aria-expanded="false"]')].map(
        (button) => button.dataset.unit3dTvGroupToggle
      )
    );
  }

  function getRowPairGroups(pairs) {
    const hasTvGroups = pairs.some((pair) => pair.groupKey !== 'movie');
    if (!hasTvGroups) return [{ key: 'movie', pairs }];

    const groups = new Map();
    pairs.forEach((pair) => {
      const key = pair.groupKey || 'movie';
      if (!groups.has(key)) {
        groups.set(key, {
          index: pair.index,
          key,
          label: pair.groupLabel || 'TV',
          pairs: [],
          sortEpisode: pair.sortEpisode,
          sortSeason: pair.sortSeason,
          sortTvScope: pair.sortTvScope
        });
      }
      groups.get(key).pairs.push(pair);
    });

    const sortedGroups = [...groups.values()].sort(compareTorrentGroups);
    if (sortedGroups.length === 1) return [{ key: 'movie', pairs: sortedGroups[0].pairs }];
    return sortedGroups;
  }

  function parseSortDatasetNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
  }

  function hasSameChildOrder(tbody, rows) {
    const currentRows = [...tbody.children];
    return (
      currentRows.length === rows.length &&
      currentRows.every((row, index) => isSameGeneratedTableRow(row, rows[index]))
    );
  }

  function isSameGeneratedTableRow(current, expected) {
    if (expected.matches('.unit3d-ptp-section-row')) {
      return (
        current.matches('.unit3d-ptp-section-row') &&
        current.dataset.unit3dQualitySection === expected.dataset.unit3dQualitySection &&
        normalizeWhitespace(current.textContent) === normalizeWhitespace(expected.textContent)
      );
    }

    if (expected.matches('.unit3d-ptp-tv-group-row')) {
      return (
        current.matches('.unit3d-ptp-tv-group-row') &&
        current.dataset.unit3dTvGroupKey === expected.dataset.unit3dTvGroupKey &&
        normalizeWhitespace(current.textContent) === normalizeWhitespace(expected.textContent)
      );
    }

    return current === expected;
  }

  function pauseGeneratedTableObserver(tbody, callback) {
    if (pairingObserver) pairingObserver.disconnect();
    isPairingRows = true;
    try {
      callback();
    } finally {
      isPairingRows = false;
      if (pairingObserver && tbody.isConnected) {
        pairingObserver.observe(tbody, { childList: true });
      }
    }
  }

  function handleTorrentInfoClick(event) {
    const link = event.target.closest('a.torrent-info-link');
    if (!link || !adapterRoot || !adapterRoot.contains(link)) return;
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;

    event.preventDefault();

    const headerRow = link.closest('tr.group_torrent.group_torrent_header');
    const detailRow = findDetailRow(headerRow);
    if (!headerRow || !detailRow) return;

    if (!detailRow.hidden) {
      detailRow.hidden = true;
      link.setAttribute('aria-expanded', 'false');
      return;
    }

    detailRow.hidden = false;
    link.setAttribute('aria-expanded', 'true');
    loadDetailRow(detailRow, link.href);
  }

  function findDetailRow(headerRow) {
    if (!headerRow) return null;
    const id = headerRow.dataset.unit3dTorrentId;
    const next = headerRow.nextElementSibling;
    if (next?.matches(`tr.torrent_info_row[data-unit3d-torrent-id="${cssEscape(id)}"]`)) {
      return next;
    }
    return headerRow
      .closest('tbody')
      ?.querySelector(`tr.torrent_info_row[data-unit3d-torrent-id="${cssEscape(id)}"]`);
  }

  function loadDetailRow(detailRow, torrentUrl) {
    if (detailRow.dataset.loaded === 'true' || detailRow.dataset.loading === 'true') return;

    const cached = detailCache.get(torrentUrl);
    if (cached) {
      setDetailContent(detailRow, cached.cloneNode(true));
      return;
    }

    detailRow.dataset.loading = 'true';
    setDetailState(detailRow, 'Loading torrent details...');

    const headerRow = detailRow.previousElementSibling;
    const isExternal = headerRow?.classList.contains('unit3d-add-releases-external');
    const detailTask = isExternal
      ? () => requestExternalTorrentDetail(headerRow, torrentUrl)
      : () =>
          fetchTorrentDetail(torrentUrl).then((html) => parseTorrentDetailPage(html, torrentUrl));

    enqueueDetailFetch(detailTask)
      .then((detail) => {
        detailCache.set(torrentUrl, detail.cloneNode(true));
        setDetailContent(detailRow, detail);
      })
      .catch((error) => {
        setDetailState(detailRow, `Could not load torrent details: ${error.message}`, true);
      })
      .finally(() => {
        delete detailRow.dataset.loading;
      });
  }

  function requestExternalTorrentDetail(headerRow, torrentUrl) {
    return new Promise((resolve, reject) => {
      const eventTarget = getExternalDetailEventTarget();
      const requestId = `unit3d-detail-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = globalThis.setTimeout(() => {
        eventTarget.removeEventListener(EXTERNAL_DETAIL_RESPONSE_EVENT, handleResponse);
        reject(new Error('external detail provider timed out'));
      }, CONFIG.externalDetailTimeoutMs);

      function handleResponse(event) {
        const detail = event.detail || {};
        if (detail.requestId !== requestId) return;

        globalThis.clearTimeout(timeout);
        eventTarget.removeEventListener(EXTERNAL_DETAIL_RESPONSE_EVENT, handleResponse);

        if (!detail.ok) {
          reject(new Error(detail.error || 'external detail unavailable'));
          return;
        }

        resolve(parseExternalTrackerDetail(detail.payload || {}, torrentUrl));
      }

      eventTarget.addEventListener(EXTERNAL_DETAIL_RESPONSE_EVENT, handleResponse);
      eventTarget.dispatchEvent(
        new CustomEvent(EXTERNAL_DETAIL_REQUEST_EVENT, {
          bubbles: false,
          cancelable: false,
          composed: false,
          detail: {
            requestId,
            torrentId: headerRow?.dataset.unit3dTorrentId || '',
            torrentUrl
          }
        })
      );
    });
  }

  function getExternalDetailEventTarget() {
    let target = document.getElementById(EXTERNAL_DETAIL_EVENT_TARGET_ID);
    if (target) return target;

    target = document.createElement('span');
    target.id = EXTERNAL_DETAIL_EVENT_TARGET_ID;
    target.hidden = true;
    target.style.display = 'none';
    (document.documentElement || document.body || document).appendChild(target);
    return target;
  }

  function enqueueDetailFetch(task) {
    return new Promise((resolve, reject) => {
      detailFetchQueue.push({ reject, resolve, task });
      runNextDetailFetch();
    });
  }

  function runNextDetailFetch() {
    if (activeDetailFetches >= CONFIG.maxConcurrentDetailFetches) return;

    const queued = detailFetchQueue.shift();
    if (!queued) return;

    activeDetailFetches += 1;
    queued
      .task()
      .then(queued.resolve, queued.reject)
      .finally(() => {
        activeDetailFetches -= 1;
        runNextDetailFetch();
      });
  }

  function fetchTorrentDetail(torrentUrl) {
    const url = new URL(torrentUrl, location.href);
    if (url.origin !== location.origin) {
      throw new Error('cross-origin detail fetch blocked');
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), CONFIG.fetchTimeoutMs);

    return fetch(url.href, {
      credentials: 'same-origin',
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .finally(() => globalThis.clearTimeout(timeout));
  }

  function parseTorrentDetailPage(html, torrentUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = document.createElement('div');
    body.className = 'unit3d-ptp-detail-body';

    const title = cloneOptional(doc.querySelector('.torrent__name'));
    if (title) body.appendChild(title);

    const tags = cloneOptional(doc.querySelector('.torrent__tags'));
    if (tags) {
      normalizeTorrentTags(tags);
      body.appendChild(tags);
    }

    const actionMenu = extractDetailActionMenu(doc);
    if (actionMenu) body.appendChild(actionMenu);

    getDetailPanels(doc).forEach((panel) => body.appendChild(panel));

    const filesPanel = extractFilesPanel(doc);
    if (filesPanel) body.appendChild(filesPanel);

    if (!body.childElementCount) {
      const fallback = document.createElement('p');
      fallback.textContent = 'No extractable torrent detail blocks found.';
      body.appendChild(fallback);
    }

    sanitizeTree(body, torrentUrl);
    return wrapDetailBody(body);
  }

  function parseExternalTrackerDetail(detail, torrentUrl) {
    const body = document.createElement('div');
    body.className = 'unit3d-ptp-detail-body';

    if (detail.title) {
      const title = document.createElement('p');
      title.textContent = detail.title;
      body.appendChild(title);
    }

    if (isUsableExternalDetailText(detail.mediainfo)) {
      body.appendChild(buildExternalPrePanel('MediaInfo', detail.mediainfo, true));
    } else if (detail.mediainfoLazy) {
      body.appendChild(buildExternalLazyMediaInfoPanel(detail, torrentUrl));
    }

    if (isUsableExternalDetailText(detail.bdinfo)) {
      body.appendChild(buildExternalPrePanel('BDInfo', detail.bdinfo, true));
    }

    const descriptionParts = extractExternalDescriptionMediaInfo(detail.description);
    descriptionParts.mediaInfoBlocks.forEach((block, index) => {
      body.appendChild(
        buildExternalPrePanel(
          descriptionParts.mediaInfoBlocks.length > 1 ? `MediaInfo ${index + 1}` : 'MediaInfo',
          block,
          true
        )
      );
    });

    if (isUsableExternalDetailText(descriptionParts.description)) {
      body.appendChild(
        buildExternalTextPanel('Description', descriptionParts.description, {
          preserveTitle: true,
          sourceClass: 'unit3d-ptp-description-source'
        })
      );
    }

    if (!body.childElementCount) {
      const fallback = document.createElement('p');
      fallback.textContent = 'No external description available.';
      body.appendChild(fallback);
    }

    sanitizeTree(body, torrentUrl);
    return wrapDetailBody(body);
  }

  function extractExternalDescriptionMediaInfo(value) {
    const text = stringifyBbcodeText(value);
    if (!text) return { description: '', mediaInfoBlocks: [] };

    const tagRe = /\[(\/?)(mediainfo|mi)(?:=[^\]]*)?\]/gi;
    const mediaInfoBlocks = [];
    const descriptionParts = [];
    let cursor = 0;
    let active = null;
    let match = tagRe.exec(text);

    while (match) {
      const fullTag = match[0];
      const closing = match[1] === '/';
      const tagStart = match.index;
      const tagEnd = tagStart + fullTag.length;

      if (!closing) {
        if (active) {
          addMediaInfoBlock(mediaInfoBlocks, text.slice(active.contentStart, tagStart));
        } else {
          descriptionParts.push(text.slice(cursor, tagStart));
        }
        active = { contentStart: tagEnd };
        cursor = tagEnd;
      } else if (active) {
        addMediaInfoBlock(mediaInfoBlocks, text.slice(active.contentStart, tagStart));
        active = null;
        cursor = tagEnd;
      } else {
        descriptionParts.push(text.slice(cursor, tagEnd));
        cursor = tagEnd;
      }

      match = tagRe.exec(text);
    }

    if (active) {
      addMediaInfoBlock(mediaInfoBlocks, text.slice(active.contentStart));
      cursor = text.length;
    }

    descriptionParts.push(text.slice(cursor));
    return {
      description: descriptionParts
        .join('')
        .replaceAll(/\n{3,}/g, '\n\n')
        .trim(),
      mediaInfoBlocks
    };
  }

  function addMediaInfoBlock(blocks, value) {
    const text = decodeBbcodeTextEntities(String(value || '').trim());
    if (text) blocks.push(text);
  }

  function decodeBbcodeTextEntities(value) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value || '');
    return textarea.value;
  }

  function buildExternalTextPanel(title, text, options = {}) {
    const panel = buildExternalPanelShell(title, options);
    const body = panel.querySelector('.panel__body');
    const content = document.createElement('div');
    content.className = 'unit3d-ptp-rendered-bbcode';
    content.appendChild(renderBbcodeFragment(text));
    body.appendChild(content);

    if (options.sourceClass) {
      const source = document.createElement('textarea');
      source.className = options.sourceClass;
      source.hidden = true;
      source.value = text;
      panel.appendChild(source);
    }

    normalizeRawBbcode(panel);
    normalizeRenderedComparisons(panel);
    normalizePanelCopyButtons(panel);
    deferHiddenBbcodeImages(panel);
    normalizeDescriptionLightboxImages(panel);
    return panel;
  }

  function renderBbcodeFragment(text) {
    text = stringifyBbcodeText(text);
    const fragment = document.createDocumentFragment();
    const stack = [{ tag: 'root', node: fragment }];
    const tagRe = /\[(\/?)([a-z]+)(?:=([^\]]+))?\]/gi;
    let cursor = 0;
    let match = tagRe.exec(text);

    while (match) {
      const rawTag = match[0];
      const closing = match[1] === '/';
      const tag = match[2].toLowerCase();
      const param = match[3] || '';
      const tagEnd = match.index + rawTag.length;

      if (!closing && tag === 'img') {
        appendTextWithBreaks(getBbcodeParent(stack), text.slice(cursor, match.index));
        const close = /\[\/img\]/i.exec(text.slice(tagEnd));
        if (!close) {
          appendTextWithBreaks(getBbcodeParent(stack), rawTag);
          cursor = tagEnd;
          match = tagRe.exec(text);
          continue;
        }

        const src = normalizeBbcodeUrl(text.slice(tagEnd, tagEnd + close.index));
        const parent = getBbcodeParent(stack);
        if (src) {
          parent.appendChild(
            parent instanceof HTMLAnchorElement
              ? buildRenderedBbcodeImageElement(src, param)
              : buildRenderedBbcodeImage(getOpenBbcodeUrl(stack) || src, src, param)
          );
        }
        cursor = tagEnd + close.index + close[0].length;
        tagRe.lastIndex = cursor;
        match = tagRe.exec(text);
        continue;
      }

      if (!closing && tag === 'comparison') {
        appendTextWithBreaks(getBbcodeParent(stack), text.slice(cursor, match.index));
        const close = /\[\/comparison\]/i.exec(text.slice(tagEnd));
        if (!close) {
          appendTextWithBreaks(getBbcodeParent(stack), rawTag);
          cursor = tagEnd;
          match = tagRe.exec(text);
          continue;
        }

        const comparisonText = text.slice(tagEnd, tagEnd + close.index);
        getBbcodeParent(stack).appendChild(
          buildRawComparisonComponent(param, extractUrls(comparisonText))
        );
        cursor = tagEnd + close.index + close[0].length;
        tagRe.lastIndex = cursor;
        match = tagRe.exec(text);
        continue;
      }

      if (!closing && (tag === 'code' || tag === 'pre' || tag === 'quote')) {
        appendTextWithBreaks(getBbcodeParent(stack), text.slice(cursor, match.index));
        const close = new RegExp(String.raw`\[\/${tag}\]`, 'i').exec(text.slice(tagEnd));
        if (!close) {
          appendTextWithBreaks(getBbcodeParent(stack), rawTag);
          cursor = tagEnd;
          match = tagRe.exec(text);
          continue;
        }

        const rawContent = text.slice(tagEnd, tagEnd + close.index);
        getBbcodeParent(stack).appendChild(
          tag === 'quote'
            ? buildBbcodeQuoteBlock(rawContent)
            : tag === 'pre'
              ? buildBbcodePreBlock(rawContent)
              : buildBbcodeCodeBlock(rawContent)
        );
        cursor = tagEnd + close.index + close[0].length;
        tagRe.lastIndex = cursor;
        match = tagRe.exec(text);
        continue;
      }

      appendTextWithBreaks(getBbcodeParent(stack), text.slice(cursor, match.index));

      if (closing) {
        closeBbcodeElement(stack, tag, rawTag);
      } else {
        const created = createBbcodeElement(tag, param);
        if (created) {
          const element = created.element || created;
          const node = created.node || element;
          getBbcodeParent(stack).appendChild(element);
          stack.push({ tag, node, element, param });
        } else {
          appendTextWithBreaks(getBbcodeParent(stack), rawTag);
        }
      }

      cursor = tagEnd;
      match = tagRe.exec(text);
    }

    appendTextWithBreaks(getBbcodeParent(stack), text.slice(cursor));
    return fragment;
  }

  function stringifyBbcodeText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value === 0 ? '' : String(value);
    if (typeof value === 'boolean') return '';
    if (Array.isArray(value)) return value.map(stringifyBbcodeText).filter(Boolean).join('\n');
    if (typeof value === 'object') {
      for (const key of [
        'description',
        'descr',
        'bbcode_description',
        'release_description',
        'text',
        'body',
        'message',
        'value',
        'data',
        'result',
        'results'
      ]) {
        if (value[key] === undefined || value[key] === value) continue;
        const text = stringifyBbcodeText(value[key]);
        if (text.trim()) return text;
      }
    }
    return String(value);
  }

  function isUsableExternalDetailText(value) {
    const text = stringifyBbcodeText(value).trim();
    return !!text && text !== '0';
  }

  function getBbcodeParent(stack) {
    return stack[stack.length - 1].node;
  }

  function createBbcodeElement(tag, param) {
    if (tag === 'center' || tag === 'right' || tag === 'left') {
      const element = document.createElement('div');
      element.style.textAlign = tag === 'center' ? 'center' : tag;
      return element;
    }
    if (tag === 'b') return document.createElement('strong');
    if (tag === 'i') return document.createElement('em');
    if (tag === 'u') {
      const element = document.createElement('span');
      element.style.textDecoration = 'underline';
      return element;
    }
    if (tag === 'color') {
      const color = sanitizeBbcodeColor(param);
      const element = document.createElement('span');
      if (color) element.style.color = color;
      return element;
    }
    if (tag === 'size') {
      const size = sanitizeBbcodeSize(param);
      const element = document.createElement('span');
      if (size) element.style.fontSize = `${size}px`;
      return element;
    }
    if (tag === 'font') {
      const element = document.createElement('span');
      const font = sanitizeBbcodeFont(param);
      if (font) element.style.fontFamily = font;
      if (font === 'monospace') element.style.whiteSpace = 'pre-wrap';
      return element;
    }
    if (tag === 'hide' || tag === 'spoiler') {
      const details = document.createElement('details');
      details.className = 'unit3d-ptp-bbcode-hide';
      const summary = document.createElement('summary');
      summary.textContent = normalizeWhitespace(param) || 'Hidden';
      const body = document.createElement('div');
      body.className = 'unit3d-ptp-bbcode-hide__body';
      details.append(summary, body);
      return { element: details, node: body };
    }
    if (tag === 'table') {
      const table = document.createElement('table');
      table.className = 'unit3d-ptp-bbcode-table';
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      return { element: table, node: tbody };
    }
    if (tag === 'tr') {
      const row = document.createElement('tr');
      row.className = 'unit3d-ptp-bbcode-table-row';
      return row;
    }
    if (tag === 'td' || tag === 'th') {
      const cell = document.createElement(tag);
      cell.className = 'unit3d-ptp-bbcode-table-cell';
      return cell;
    }
    if (tag === 'url') {
      const element = document.createElement('a');
      const href = normalizeBbcodeUrl(param);
      if (href) element.href = href;
      openLinkInNewTab(element);
      return element;
    }
    return null;
  }

  function closeBbcodeElement(stack, tag, rawTag) {
    for (let index = stack.length - 1; index > 0; index -= 1) {
      if (stack[index].tag !== tag) continue;

      if (
        tag === 'url' &&
        stack[index].node instanceof HTMLAnchorElement &&
        !stack[index].node.href
      ) {
        stack[index].node.href = normalizeBbcodeUrl(stack[index].node.textContent || '');
      }
      stack.length = index;
      return;
    }

    if (!isKnownBbcodeTag(tag)) appendTextWithBreaks(getBbcodeParent(stack), rawTag);
  }

  function isKnownBbcodeTag(tag) {
    return [
      'b',
      'center',
      'code',
      'color',
      'font',
      'hide',
      'i',
      'img',
      'left',
      'pre',
      'quote',
      'right',
      'size',
      'spoiler',
      'table',
      'td',
      'th',
      'tr',
      'u',
      'url'
    ].includes(tag);
  }

  function getOpenBbcodeUrl(stack) {
    for (let index = stack.length - 1; index > 0; index -= 1) {
      const item = stack[index];
      if (item.tag === 'url' && item.node instanceof HTMLAnchorElement) {
        return normalizeBbcodeUrl(item.node.getAttribute('href') || item.param || '');
      }
    }
    return '';
  }

  function appendTextWithBreaks(parent, text) {
    if (!text) return;
    if (
      /^[\s\r\n]*$/.test(text) &&
      parent instanceof HTMLElement &&
      /^(table|tbody|thead|tfoot|tr)$/i.test(parent.tagName)
    ) {
      return;
    }

    const parts = String(text)
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n');
    parts.forEach((part, index) => {
      if (index > 0) parent.appendChild(document.createElement('br'));
      if (part) appendHtmlAndLinkedText(parent, decodeBbcodeTextEntities(part));
    });
  }

  function appendHtmlAndLinkedText(parent, text) {
    if (!/<\/?[a-z][\s\S]*>/i.test(text)) {
      appendLinkedText(parent, text);
      return;
    }

    const template = document.createElement('template');
    template.innerHTML = text;
    if (!template.content.childNodes.length) {
      appendLinkedText(parent, text);
      return;
    }

    template.content.childNodes.forEach((node) => appendSafeHtmlNode(parent, node));
  }

  function appendSafeHtmlNode(parent, node) {
    if (node.nodeType === Node.TEXT_NODE) {
      appendLinkedText(parent, node.nodeValue || '');
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') {
      parent.appendChild(document.createElement('br'));
      return;
    }

    const element = createSafeHtmlElement(node);
    if (!element) {
      appendLinkedText(parent, node.textContent || '');
      return;
    }

    node.childNodes.forEach((child) => appendSafeHtmlNode(element, child));
    parent.appendChild(element);
  }

  function createSafeHtmlElement(source) {
    const tag = source.tagName.toLowerCase();
    if (tag === 'a') {
      const href = normalizeBbcodeUrl(source.getAttribute('href') || '');
      const link = document.createElement('a');
      if (href) link.href = href;
      openLinkInNewTab(link);
      return link;
    }
    if (tag === 'img') {
      const src = normalizeBbcodeUrl(source.getAttribute('src') || '');
      if (!src) return null;
      return buildRenderedBbcodeImageElement(src, source.getAttribute('width') || '');
    }
    if (tag === 'b' || tag === 'strong') return document.createElement('strong');
    if (tag === 'i' || tag === 'em') return document.createElement('em');
    if (tag === 'u') {
      const element = document.createElement('span');
      element.style.textDecoration = 'underline';
      return element;
    }
    if (tag === 'span' || tag === 'p' || tag === 'div') {
      return document.createElement(tag === 'span' ? 'span' : 'div');
    }
    if (tag === 'font') {
      const element = document.createElement('span');
      const color = sanitizeBbcodeColor(source.getAttribute('color') || '');
      const font = sanitizeBbcodeFont(source.getAttribute('face') || '');
      if (color) element.style.color = color;
      if (font) element.style.fontFamily = font;
      if (font === 'monospace') element.style.whiteSpace = 'pre-wrap';
      return element;
    }
    return null;
  }

  function appendLinkedText(parent, text) {
    const urlRe = /https?:\/\/[^\s<>"\]]+/gi;
    let cursor = 0;
    let match = urlRe.exec(text);

    while (match) {
      if (match.index > cursor) {
        parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }

      const rawUrl = match[0];
      const url = normalizeBbcodeUrl(rawUrl);
      const trailing = rawUrl.slice(url.length);
      if (isPtpDirectImageUrl(url)) {
        parent.appendChild(buildRenderedBbcodeImage(url, url, ''));
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        openLinkInNewTab(link);
        parent.appendChild(link);
      }
      if (trailing) parent.appendChild(document.createTextNode(trailing));
      cursor = match.index + rawUrl.length;
      match = urlRe.exec(text);
    }

    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  function isPtpDirectImageUrl(value) {
    try {
      const url = new URL(value);
      return (
        url.hostname === 'passthepopcorn.me' &&
        /^\/i\/[^/?#]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function buildRenderedBbcodeImage(href, src, widthValue) {
    const image = buildRenderedBbcodeImageElement(src, widthValue);
    const link = document.createElement('a');
    link.className = 'unit3d-ptp-rendered-bbcode-image-link';
    link.href = normalizeThumbnailDirectImageUrl(normalizeBbcodeUrl(href || src));
    openLinkInNewTab(link);
    link.appendChild(image);
    return link;
  }

  function buildRenderedBbcodeImageElement(src, widthValue) {
    const image = document.createElement('img');
    image.className = 'unit3d-ptp-rendered-bbcode-image';
    image.src = src;
    image.loading = 'lazy';
    image.alt = '';

    const width = parseInteger(widthValue);
    if (width) {
      image.width = Math.min(Math.max(width, 40), 1200);
    }

    return image;
  }

  function buildBbcodeCodeBlock(text) {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = text;
    pre.appendChild(code);
    return pre;
  }

  function buildBbcodePreBlock(text) {
    const pre = document.createElement('pre');
    pre.className = 'unit3d-ptp-bbcode-pre';
    pre.appendChild(renderBbcodeFragment(text));
    return pre;
  }

  function buildBbcodeQuoteBlock(text) {
    const quote = document.createElement('blockquote');
    appendTextWithBreaks(quote, text);
    return quote;
  }

  function deferHiddenBbcodeImages(root) {
    root.querySelectorAll('details.unit3d-ptp-bbcode-hide').forEach((details) => {
      if (!details.dataset.unit3dPtpHideToggleAttached) {
        details.dataset.unit3dPtpHideToggleAttached = 'true';
        details.addEventListener('toggle', handleBbcodeHideToggle);
      }

      if (details.open) return;
      details.querySelectorAll('img[src]').forEach((image) => {
        if (image.dataset.unit3dPtpDeferredSrc) return;

        image.dataset.unit3dPtpDeferredSrc = image.getAttribute('src') || '';
        image.removeAttribute('src');
        image.loading = 'lazy';
      });
    });
  }

  function handleBbcodeHideToggle(event) {
    const details = event.currentTarget;
    if (!(details instanceof HTMLDetailsElement) || !details.open) return;

    details.querySelectorAll('img[data-unit3d-ptp-deferred-src]').forEach((image) => {
      image.setAttribute('src', image.dataset.unit3dPtpDeferredSrc || '');
      delete image.dataset.unit3dPtpDeferredSrc;
      image.loading = 'lazy';
    });

    const panel = details.closest('.panelV2');
    if (panel) normalizeDescriptionLightboxImages(panel);
  }

  function sanitizeBbcodeColor(value) {
    const color = String(value || '').trim();
    if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)) return color;
    if (/^transparent$/i.test(color)) return 'transparent';
    if (/^[a-z]+$/i.test(color)) return color.toLowerCase();
    return '';
  }

  function sanitizeBbcodeSize(value) {
    const size = Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(size)) return 0;
    return Math.min(Math.max(size, 8), 32);
  }

  function sanitizeBbcodeFont(value) {
    const font = String(value || '')
      .trim()
      .toLowerCase();
    if (!font) return '';
    if (/^(monospace|serif|sans-serif|cursive|fantasy)$/.test(font)) return font;
    if (/^(courier|courier new|consolas|monaco|menlo)$/.test(font)) return 'monospace';
    return '';
  }

  function buildExternalPrePanel(title, text, mediaInfo = false) {
    const panel = buildExternalPanelShell(title, {
      collapsible: mediaInfo,
      preserveTitle: true
    });
    const body = panel.querySelector('.panel__body');
    const dump = document.createElement('div');
    if (mediaInfo) dump.className = 'torrent-mediainfo-dump';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = text;
    pre.appendChild(code);
    dump.appendChild(pre);
    body.appendChild(dump);
    normalizeMediaInfoPanel(panel);
    normalizePanelCopyButtons(panel);
    return panel;
  }

  function buildExternalLazyMediaInfoPanel(detail, torrentUrl) {
    const panel = buildExternalPrePanel('MediaInfo', 'Expand to load MediaInfo.', true);
    panel.dataset.unit3dPtpLazyMediainfo = 'true';
    panel.dataset.unit3dPtpExternalTorrentId = detail.externalDetailId || '';
    panel.dataset.unit3dPtpExternalTorrentUrl = detail.torrentPage || torrentUrl || '';
    return panel;
  }

  function buildExternalPanelShell(title, options = {}) {
    const panel = document.createElement('section');
    panel.className = 'panelV2 unit3d-ptp-source-panel';
    const header = document.createElement('header');
    header.className = 'panel__header';
    const heading = document.createElement('h2');
    heading.className = 'panel__heading';
    if (options.collapsible) {
      const plus = document.createElement('i');
      plus.className = 'fas fa-plus-circle fa-pull-right';
      const minus = document.createElement('i');
      minus.className = 'fas fa-minus-circle fa-pull-right';
      heading.append(plus, minus, document.createTextNode(' '));
    }
    heading.appendChild(
      document.createTextNode(options.preserveTitle ? title : normalizeMetaSidebarTitle(title))
    );
    const actions = document.createElement('div');
    actions.className = 'panel__actions';
    const action = document.createElement('div');
    action.className = 'panel__action';
    const copy = document.createElement('button');
    copy.className = 'form__button form__button--text unit3d-ptp-copy-button';
    copy.type = 'button';
    copy.textContent = 'Copy';
    action.appendChild(copy);
    actions.appendChild(action);
    header.append(heading, actions);
    const body = document.createElement('div');
    body.className = 'panel__body';
    panel.append(header, body);
    return panel;
  }

  function extractDetailActionMenu(doc) {
    const menu = doc.querySelector('menu.torrent__buttons');
    if (!menu) return null;

    const clone = menu.cloneNode(true);
    clone.classList.add('unit3d-ptp-detail-actions');
    normalizeActionMenu(clone);
    return clone;
  }

  function normalizeActionMenu(menu) {
    const uniquePrefix = `unit3d-ptp-action-${++actionMenuCounter}`;
    menu.querySelectorAll('script').forEach((element) => element.remove());
    rewriteActionMenuIds(menu, uniquePrefix);
    menu.querySelectorAll('[href]').forEach((element) => {
      element.setAttribute('href', absolutizeUrl(element.getAttribute('href')));
      if (element instanceof HTMLAnchorElement) openLinkInNewTab(element);
    });
    menu.querySelectorAll('form[action]').forEach((form) => {
      form.setAttribute('action', absolutizeUrl(form.getAttribute('action')));
    });
  }

  function rewriteActionMenuIds(menu, uniquePrefix) {
    const idMap = new Map();
    menu.querySelectorAll('[id]').forEach((element) => {
      const oldId = element.id;
      const newId = `${uniquePrefix}-${oldId}`;
      idMap.set(oldId, newId);
      element.id = newId;
    });

    idMap.forEach((newId, oldId) => {
      menu.querySelectorAll(`[for="${cssEscape(oldId)}"]`).forEach((element) => {
        element.setAttribute('for', newId);
      });
      menu.querySelectorAll(`[list="${cssEscape(oldId)}"]`).forEach((element) => {
        element.setAttribute('list', newId);
      });
      menu.querySelectorAll(`[popovertarget="${cssEscape(oldId)}"]`).forEach((element) => {
        element.setAttribute('popovertarget', newId);
      });
    });
  }

  function initializeDynamicActionMenu(root) {
    const actionMenu = root.querySelector('.unit3d-ptp-detail-actions');
    if (!actionMenu) return;

    requestAnimationFrame(() => {
      try {
        if (globalThis.Alpine && typeof globalThis.Alpine.initTree === 'function') {
          globalThis.Alpine.initTree(actionMenu);
        }

        if (globalThis.Livewire && typeof globalThis.Livewire.initTree === 'function') {
          globalThis.Livewire.initTree(actionMenu);
        } else if (globalThis.Livewire && typeof globalThis.Livewire.rescan === 'function') {
          globalThis.Livewire.rescan(actionMenu);
        }
      } catch (error) {
        console.warn('[UNIT3D PTP Adapter] Could not initialize inline action menu', error);
      }
    });
  }

  function getDetailPanels(doc) {
    return [...doc.querySelectorAll('.panelV2')]
      .filter((panel) => isExtractableDetailPanel(panel))
      .map((panel) => {
        const clone = cloneDetailPanel(panel);
        clone.classList.add('unit3d-ptp-source-panel');
        if (isCommentsPanel(clone)) {
          normalizeCommentsPanel(clone);
        } else {
          normalizeMediaInfoPanel(clone);
          normalizeVisionIcons(clone);
          normalizeRenderedComparisons(clone);
          normalizeRawBbcode(clone);
          normalizePanelCopyButtons(clone);
          normalizeDescriptionCopySource(clone);
          normalizeDescriptionLightboxImages(clone);
        }
        return clone;
      });
  }

  function isExtractableDetailPanel(panel) {
    const heading = normalizeWhitespace(panel.querySelector('.panel__heading')?.textContent || '');
    return /description|mediainfo|bdinfo|subtitles|internal|comments/i.test(heading);
  }

  function isCommentsPanel(panel) {
    const heading = normalizeWhitespace(panel.querySelector('.panel__heading')?.textContent || '');
    return panel.id === 'comments' || /\bcomments?\b/i.test(heading);
  }

  function normalizeCommentsPanel(panel) {
    panel.classList.add('unit3d-ptp-comments-panel');
    panel
      .querySelectorAll(
        ['form.new-comment', 'form[wire\\:submit]', '.new-comment', '#new-comment__textarea'].join(
          ','
        )
      )
      .forEach((element) => {
        const form = element.closest('form');
        (form || element).remove();
      });
    panel.querySelectorAll('form').forEach((form) => {
      if (form.querySelector('textarea[name="comment"]')) form.remove();
    });
  }

  function cloneDetailPanel(panel) {
    const heading = normalizeWhitespace(panel.querySelector('.panel__heading')?.textContent || '');
    if (!/internal/i.test(heading)) return panel.cloneNode(true);

    return cloneInternalPanelMessage(panel);
  }

  function cloneInternalPanelMessage(panel) {
    const message = panel.querySelector('.panel__body h3') || panel.querySelector('h3');
    if (message) {
      const clone = message.cloneNode(true);
      clone.classList.add('unit3d-ptp-internal-message');
      return clone;
    }

    const fallback = document.createElement('h3');
    fallback.className = 'text-bold text-info unit3d-ptp-internal-message';
    fallback.textContent = 'This is an internal Torrent';
    return fallback;
  }

  function normalizeDescriptionLightboxImages(panel) {
    const heading = normalizeWhitespace(panel.querySelector('.panel__heading')?.textContent || '');
    if (!/description|sypnosis|synopsis/i.test(heading)) return;

    panel.querySelectorAll('img[src]').forEach((image) => {
      if (image.closest('.unit3d-ptp-comparison')) return;

      const imageUrl = getDescriptionImageLightboxUrl(image);
      if (!imageUrl) return;

      image.classList.add('unit3d-ptp-description-lightbox-trigger');
      image.dataset.unit3dPtpLightboxUrl = imageUrl;
      image.title = image.title || 'Open full-size image';

      const link = image.closest('a[href]');
      if (link) {
        link.classList.add('unit3d-ptp-description-lightbox-link');
        link.dataset.unit3dPtpLightboxUrl = imageUrl;
      }
    });
  }

  function normalizeDescriptionCopySource(panel) {
    if (!isDescriptionPanel(panel)) return;

    const source = extractDescriptionSourceFromPanel(panel);
    if (!source) return;

    const textarea = document.createElement('textarea');
    textarea.className = 'unit3d-ptp-description-source';
    textarea.hidden = true;
    textarea.value = source;
    panel.appendChild(textarea);
  }

  function extractDescriptionSourceFromPanel(panel) {
    for (const script of panel.querySelectorAll('script')) {
      const source = extractDescriptionSourceFromScript(script.textContent || '');
      if (source) return source;
    }

    return '';
  }

  function extractDescriptionSourceFromScript(text) {
    const match = /atob\(\s*(['"])([A-Za-z0-9+/=]+)\1\s*\)/.exec(text);
    if (!match) return '';

    return decodeBase64Utf8(match[2]);
  }

  function decodeBase64Utf8(value) {
    try {
      const binary = globalThis.atob(value);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      try {
        return decodeURIComponent(escape(globalThis.atob(value)));
      } catch {
        return '';
      }
    }
  }

  function getDescriptionImageLightboxUrl(image) {
    const linkedUrl = image.closest('a[href]')?.getAttribute('href') || '';
    const srcUrl = image.getAttribute('src') || '';

    const directLinkedUrl = getDirectImageUrl(linkedUrl);
    if (directLinkedUrl) return directLinkedUrl;

    return getDirectImageUrl(srcUrl);
  }

  function getDirectImageUrl(value) {
    if (!value) return '';

    const absolute = absolutizeUrl(value);
    if (!isSafeUrl(absolute, location.href, 'href')) return '';
    const normalized = normalizeThumbnailDirectImageUrl(absolute);
    return isDirectImageUrl(normalized) ? normalized : '';
  }

  function normalizeThumbnailDirectImageUrl(value) {
    try {
      const url = new URL(value, location.href);
      if (/(^|\.)imgbox\.com$/i.test(url.hostname)) {
        url.hostname = url.hostname.replace(/^thumbs(\d*)\./i, 'images$1.');
        url.pathname = url.pathname.replace(/_t(\.(?:png|jpe?g|gif|webp|avif|bmp))$/i, '_o$1');
        return url.href;
      }

      if (!/(^|\.)(?:beyondhd\.co|ptscreens\.com)$/i.test(url.hostname)) return value;

      url.pathname = url.pathname.replace(
        /(.+)\.[^.\/]+(\.(?:png|jpe?g|gif|webp|avif|bmp))$/i,
        '$1$2'
      );
      return url.href;
    } catch {
      return value;
    }
  }

  function isDirectImageUrl(value) {
    try {
      const url = new URL(value, location.href);
      return /\.(?:png|jpe?g|gif|webp|avif|bmp)(?:$|[?#])/i.test(url.href);
    } catch {
      return false;
    }
  }

  function extractFilesPanel(doc) {
    const files = doc.querySelector('#torrent-files .data-table-wrapper');
    if (!files) return null;

    const panel = document.createElement('section');
    panel.className = 'panelV2 unit3d-ptp-files-panel';

    const header = document.createElement('header');
    header.className = 'panel__header';

    const heading = document.createElement('h2');
    heading.className = 'panel__heading';
    heading.textContent = 'Files';

    const body = document.createElement('div');
    body.className = 'panel__body';
    body.appendChild(files.cloneNode(true));

    header.appendChild(heading);
    panel.append(header, body);
    return panel;
  }

  function wrapDetailBody(body) {
    const section = document.createElement('section');
    section.className = 'movie-page__torrent__panel unit3d-ptp-detail';

    const panel = document.createElement('div');
    panel.className = 'panel';

    const heading = document.createElement('div');
    heading.className = 'panel__heading';

    const title = document.createElement('span');
    title.className = 'panel__heading__title';
    title.textContent = 'Torrent details';
    heading.appendChild(title);

    const panelBody = document.createElement('div');
    panelBody.className = 'panel__body';
    panelBody.appendChild(body);

    panel.append(heading, panelBody);
    section.appendChild(panel);
    return section;
  }

  function setDetailState(detailRow, message, isError = false) {
    const body = document.createElement('div');
    body.className = isError ? 'unit3d-ptp-detail-error' : 'unit3d-ptp-detail-loading';
    body.textContent = message;
    setDetailContent(detailRow, wrapDetailBody(body), false);
  }

  function setDetailContent(detailRow, content, markLoaded = true) {
    const cell = detailRow.querySelector('td');
    if (!cell) return;
    syncImageMarkersToHeader(detailRow, content);
    cell.replaceChildren(content);
    initializeDynamicActionMenu(cell);
    if (markLoaded) {
      detailRow.dataset.loaded = 'true';
    } else {
      delete detailRow.dataset.loaded;
    }
  }

  function normalizeMediaInfoPanel(root) {
    root.querySelectorAll('.torrent-mediainfo-dump').forEach((dump) => {
      const panel = dump.closest('.panelV2') || root;
      panel.classList.add('unit3d-ptp-mediainfo-panel');
      dump.removeAttribute('x-cloak');
      dump.removeAttribute('x-show');
      dump.style.removeProperty('display');
      setMediaInfoExpanded(panel, false);
    });
  }

  function handleMediaInfoToggleClick(event) {
    const panel = event.target.closest?.('.unit3d-ptp-mediainfo-panel');
    if (!panel || !panel.closest('.unit3d-ptp-detail')) return;
    if (event.target.closest('a, button, input, select, textarea')) return;

    const header = event.target.closest('.panel__header, .panel__heading');
    if (!header || !panel.contains(header)) return;

    const expanded = panel.querySelector('.torrent-mediainfo-dump')?.hidden === true;
    setMediaInfoExpanded(panel, expanded);
    if (expanded) loadLazyExternalMediaInfo(panel);
  }

  function setMediaInfoExpanded(panel, expanded) {
    const dump = panel.querySelector('.torrent-mediainfo-dump');
    if (dump) dump.hidden = !expanded;

    const plusIcon = panel.querySelector('.panel__heading .fa-plus-circle');
    if (plusIcon) plusIcon.hidden = expanded;

    const minusIcon = panel.querySelector('.panel__heading .fa-minus-circle');
    if (minusIcon) minusIcon.hidden = !expanded;
  }

  function loadLazyExternalMediaInfo(panel) {
    if (panel.dataset.unit3dPtpLazyMediainfo !== 'true') return;
    if (
      panel.dataset.unit3dPtpLazyLoading === 'true' ||
      panel.dataset.unit3dPtpLazyLoaded === 'true'
    ) {
      return;
    }

    const dump = panel.querySelector('.torrent-mediainfo-dump');
    if (!dump) return;

    panel.dataset.unit3dPtpLazyLoading = 'true';
    setExternalPrePanelText(panel, 'Loading MediaInfo...');

    requestExternalMediaInfo(
      panel.dataset.unit3dPtpExternalTorrentId || '',
      panel.dataset.unit3dPtpExternalTorrentUrl || ''
    )
      .then((text) => {
        setExternalPrePanelText(panel, text || 'No MediaInfo available.');
        panel.dataset.unit3dPtpLazyLoaded = 'true';
        normalizePanelCopyButtons(panel);
      })
      .catch((error) => {
        setExternalPrePanelText(panel, `Could not load MediaInfo: ${error.message}`);
      })
      .finally(() => {
        delete panel.dataset.unit3dPtpLazyLoading;
      });
  }

  function setExternalPrePanelText(panel, text) {
    const code = panel.querySelector('.torrent-mediainfo-dump pre code');
    if (code) code.textContent = text;
  }

  function requestExternalMediaInfo(torrentId, torrentUrl) {
    return new Promise((resolve, reject) => {
      const eventTarget = getExternalDetailEventTarget();
      const requestId = `unit3d-mediainfo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = globalThis.setTimeout(() => {
        eventTarget.removeEventListener(EXTERNAL_DETAIL_RESPONSE_EVENT, handleResponse);
        reject(new Error('external MediaInfo provider timed out'));
      }, CONFIG.externalDetailTimeoutMs);

      function handleResponse(event) {
        const detail = event.detail || {};
        if (detail.requestId !== requestId) return;

        globalThis.clearTimeout(timeout);
        eventTarget.removeEventListener(EXTERNAL_DETAIL_RESPONSE_EVENT, handleResponse);

        if (!detail.ok) {
          reject(new Error(detail.error || 'external MediaInfo unavailable'));
          return;
        }

        resolve(stringifyBbcodeText(detail.payload?.mediainfo || ''));
      }

      eventTarget.addEventListener(EXTERNAL_DETAIL_RESPONSE_EVENT, handleResponse);
      eventTarget.dispatchEvent(
        new CustomEvent(EXTERNAL_DETAIL_REQUEST_EVENT, {
          bubbles: false,
          cancelable: false,
          composed: false,
          detail: {
            field: 'mediainfo',
            requestId,
            torrentId,
            torrentUrl
          }
        })
      );
    });
  }

  function normalizePanelCopyButtons(panel) {
    panel
      .querySelectorAll(
        '.panel__actions button, .panel__actions a, button.form__button, a.form__button'
      )
      .forEach((control) => {
        if (!/^copy$/i.test(normalizeWhitespace(control.textContent))) return;

        control.classList.add('unit3d-ptp-copy-button');
        control.setAttribute('data-unit3d-ptp-copy', 'panel');
        if (control instanceof HTMLButtonElement) control.type = 'button';
      });
  }

  function handleInlineCopyClick(event) {
    const control = event.target.closest?.('.unit3d-ptp-copy-button[data-unit3d-ptp-copy]');
    if (!control || !control.closest('.unit3d-ptp-detail')) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const text = getInlinePanelCopyText(control);
    if (!text) {
      setCopyButtonStatus(control, 'No data');
      return;
    }

    copyTextToClipboard(text)
      .then(() => setCopyButtonStatus(control, 'Copied'))
      .catch((error) => {
        console.warn('[UNIT3D PTP Adapter] Could not copy inline panel text', error);
        setCopyButtonStatus(control, 'Copy failed');
      });
  }

  function getInlinePanelCopyText(control) {
    const panel = control.closest('.unit3d-ptp-source-panel, .panelV2, .unit3d-ptp-detail');
    if (!panel) return '';

    if (isDescriptionPanel(panel)) {
      const sourceText = getElementCopyText(
        panel.querySelector('.unit3d-ptp-description-source'),
        true
      );
      if (sourceText) return sourceText;
    }

    if (isRawCopyPanel(panel)) {
      const rawText = getRawPanelCopyText(panel);
      if (rawText) return rawText;
    }

    const body = panel.querySelector('.panel__body') || panel;
    return getSanitizedCopyText(body);
  }

  function isRawCopyPanel(panel) {
    if (panel.querySelector('.torrent-mediainfo-dump')) return true;

    const heading = normalizeWhitespace(panel.querySelector('.panel__heading')?.textContent || '');
    return /\b(?:media\s*info|bd\s*info|bdinfo)\b/i.test(heading);
  }

  function isDescriptionPanel(panel) {
    const heading = normalizeWhitespace(
      panel?.querySelector?.('.panel__heading')?.textContent || ''
    );
    return /\b(?:description|sypnosis|synopsis)\b/i.test(heading);
  }

  function getRawPanelCopyText(panel) {
    const rawCandidates = [
      '.torrent-mediainfo-dump pre code',
      '.torrent-mediainfo-dump pre',
      '.torrent-mediainfo-dump code',
      '.torrent-mediainfo-dump',
      '.bdinfo pre code',
      '.bdinfo pre',
      '.bdinfo code',
      'pre code',
      'pre',
      'textarea'
    ];

    for (const selector of rawCandidates) {
      const element = panel.querySelector(selector);
      const text = getElementCopyText(element, true);
      if (text) return text;
    }

    return '';
  }

  function getSanitizedCopyText(element) {
    if (!element) return '';

    const clone = element.cloneNode(true);
    clone
      .querySelectorAll(
        [
          'script',
          'style',
          'noscript',
          'template',
          '.panel__header',
          '.panel__actions',
          '.unit3d-ptp-copy-button',
          'button',
          'input',
          'select'
        ].join(',')
      )
      .forEach((node) => node.remove());

    return normalizeCopyText(clone.innerText || clone.textContent || '');
  }

  function getElementCopyText(element, preserveHidden = false) {
    if (!element) return '';
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return normalizeCopyText(element.value);
    }

    return normalizeCopyText(
      preserveHidden ? element.textContent || '' : element.innerText || element.textContent || ''
    );
  }

  function normalizeCopyText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && globalThis.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('document.execCommand("copy") returned false');
  }

  function setCopyButtonStatus(control, status) {
    const original = control.dataset.unit3dPtpCopyLabel || normalizeWhitespace(control.textContent);
    control.dataset.unit3dPtpCopyLabel = original;
    control.textContent = status;

    globalThis.setTimeout(() => {
      if (control.isConnected) control.textContent = control.dataset.unit3dPtpCopyLabel || 'Copy';
    }, 1200);
  }

  function normalizeTorrentTags(tags) {
    tags.querySelectorAll(':scope > li').forEach((item) => {
      if (
        !item.matches('.torrent__uploader, .torrent__uploaded-at') &&
        !item.querySelector(':scope > .torrent-icons')
      ) {
        item.remove();
      }
    });
  }

  function normalizeVisionIcons(root) {
    root.querySelectorAll('.torrent-icons').forEach((icons) => {
      const visionIcons = [...icons.querySelectorAll(':scope > .torrent-icons__vision')];
      if (visionIcons.length === 0) return;

      const row = document.createElement('span');
      row.className = 'unit3d-ptp-vision-row';
      visionIcons.forEach((icon) => row.appendChild(icon));
      icons.appendChild(row);
    });
  }

  function normalizeRenderedComparisons(root) {
    root.querySelectorAll('.comparison').forEach((comparison) => {
      const label = extractRenderedComparisonLabel(comparison);
      const rows = extractRenderedComparisonRows(comparison);
      comparison.replaceWith(buildComparisonComponent(label, rows));
    });
  }

  function extractRenderedComparisonLabel(comparison) {
    const text = comparison.querySelector('.comparison__text')?.cloneNode(true);
    if (!text) return '';

    text.querySelectorAll('button').forEach((button) => button.remove());
    return normalizeWhitespace(text.textContent).replace(/\s+vs\s+/gi, ' vs ');
  }

  function extractRenderedComparisonRows(comparison) {
    return [...comparison.querySelectorAll('.comparison__row')]
      .map((row) =>
        [...row.querySelectorAll('.comparison__image[src]')]
          .map((image) => ({
            label:
              normalizeWhitespace(
                image.closest('figure')?.querySelector('.comparison__figcaption')?.textContent || ''
              ) || '',
            url: absolutizeUrl(image.getAttribute('src'))
          }))
          .filter((item) => item.url)
      )
      .filter((row) => row.length > 0);
  }

  function normalizeRawBbcode(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!hasRenderableRawBbcode(node.nodeValue || '')) {
          return NodeFilter.FILTER_REJECT;
        }

        if (node.parentElement?.closest('pre, code, textarea, script, style')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(replaceRawBbcodeTextNode);
  }

  function hasRenderableRawBbcode(text) {
    return /\[(?:\/?(?:b|center|color|font|i|left|right|size|u)|comparison(?:=|\])|url(?:=|\])|img(?:=|\]))/i.test(
      text
    );
  }

  function replaceRawBbcodeTextNode(textNode) {
    const text = textNode.nodeValue || '';
    if (/\[(?:\/?(?:b|center|color|font|i|left|right|size|u)|url\])/i.test(text)) {
      textNode.replaceWith(renderBbcodeFragment(text));
      return;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let changed = false;
    const comparisonRe = /\[comparison=([^\]]*)\]([\s\S]*?)\[\/comparison\]/gi;
    let match = comparisonRe.exec(text);

    while (match) {
      changed = appendInlineBbcodeFragment(fragment, text.slice(cursor, match.index)) || changed;
      fragment.appendChild(buildRawComparisonComponent(match[1], extractUrls(match[2])));
      cursor = match.index + match[0].length;
      changed = true;
      match = comparisonRe.exec(text);
    }

    changed = appendInlineBbcodeFragment(fragment, text.slice(cursor)) || changed;

    if (changed) textNode.replaceWith(fragment);
  }

  function appendInlineBbcodeFragment(fragment, text) {
    if (!text) return false;

    const imageRe =
      /\[url=([^\]]+)\]\s*\[img(?:=\d+)?\]([^\[]+)\[\/img\]\s*\[\/url\]|\[img(?:=\d+)?\]([^\[]+)\[\/img\]/gi;
    let cursor = 0;
    let changed = false;
    let match = imageRe.exec(text);

    while (match) {
      appendText(fragment, text.slice(cursor, match.index));
      const href = normalizeBbcodeUrl(match[1] || match[3]);
      const src = normalizeBbcodeUrl(match[2] || match[3]);
      if (src) {
        fragment.appendChild(buildImageLink(href || src, src));
      } else {
        appendText(fragment, match[0]);
      }
      cursor = match.index + match[0].length;
      changed = true;
      match = imageRe.exec(text);
    }

    appendText(fragment, text.slice(cursor));
    return changed;
  }

  function appendText(fragment, text) {
    if (text) fragment.appendChild(document.createTextNode(text));
  }

  function buildRawComparisonComponent(label, urls) {
    const labels = normalizeComparisonLabels(label);
    const columnCount = Math.max(labels.length, 1);
    const rows = [];

    for (let index = 0; index < urls.length; index += columnCount) {
      rows.push(
        urls.slice(index, index + columnCount).map((url, columnIndex) => ({
          label: labels[columnIndex] || '',
          url
        }))
      );
    }

    return buildComparisonComponent(label, rows);
  }

  function buildComparisonComponent(label, rows) {
    const labels = getComparisonLabels(label, rows);
    const comparison = document.createElement('div');
    comparison.className = 'comparison unit3d-ptp-comparison';
    comparison.dataset.columnCount = String(Math.max(labels.length, rows[0]?.length || 1));
    comparison.dataset.column = '1';

    const text = document.createElement('div');
    text.className = 'comparison__text';
    appendComparisonLabelText(text, labels, label);

    const button = document.createElement('button');
    button.className = 'comparison__button';
    button.type = 'button';
    button.textContent = 'Show';
    text.append(document.createTextNode(' '), button);
    comparison.appendChild(text);

    const screenshots = document.createElement('ul');
    screenshots.className = 'comparison__screenshots';
    screenshots.tabIndex = -1;
    screenshots.hidden = true;

    rows.forEach((row) => {
      const outerItem = document.createElement('li');
      const rowList = document.createElement('ul');
      rowList.className = 'comparison__row';

      row.forEach((item, index) => {
        const column = index + 1;
        const imageContainer = document.createElement('li');
        imageContainer.className = 'comparison__image-container';
        imageContainer.dataset.index = String(column);

        const figure = document.createElement('figure');
        figure.className = 'comparison__figure';

        if (labels[index]) {
          const caption = document.createElement('figcaption');
          caption.className = 'comparison__figcaption';
          caption.textContent = labels[index];
          figure.appendChild(caption);
        }

        figure.appendChild(buildComparisonImageLink(item.url, column));
        imageContainer.appendChild(figure);
        rowList.appendChild(imageContainer);
      });

      outerItem.appendChild(rowList);
      screenshots.appendChild(outerItem);
    });

    comparison.appendChild(screenshots);
    setComparisonColumn(comparison, 1);
    return comparison;
  }

  function buildComparisonImageLink(url, column) {
    const container = document.createElement('span');
    container.className = 'unit3d-ptp-comparison-image-wrap';

    const image = document.createElement('img');
    image.className = 'comparison__image';
    image.src = url;
    image.loading = 'lazy';
    image.dataset.index = String(column);
    image.alt = '';
    container.appendChild(image);

    const marker = document.createElement('a');
    marker.className = 'UNIT3D images unit3d-ptp-image-marker';
    marker.href = url;
    marker.title = url;
    marker.textContent = url;
    openLinkInNewTab(marker);
    container.appendChild(marker);

    return container;
  }

  function appendComparisonLabelText(container, labels, fallback) {
    if (labels.length === 0) {
      container.appendChild(document.createTextNode(normalizeWhitespace(fallback) || 'Comparison'));
      return;
    }

    labels.forEach((label, index) => {
      if (index > 0) {
        container.appendChild(document.createTextNode(' '));
        const divider = document.createElement('span');
        divider.className = 'comparison__divider';
        divider.textContent = 'vs';
        container.appendChild(divider);
        container.appendChild(document.createTextNode(' '));
      }
      container.appendChild(document.createTextNode(label));
    });
  }

  function getComparisonLabels(label, rows) {
    const fromLabel = normalizeComparisonLabels(label);
    if (fromLabel.length > 0) return fromLabel;

    return (rows[0] || []).map((item) => normalizeWhitespace(item.label)).filter(Boolean);
  }

  function handleComparisonClick(event) {
    const button = event.target.closest?.('.unit3d-ptp-comparison .comparison__button');
    if (button) {
      event.preventDefault();
      openComparison(button.closest('.unit3d-ptp-comparison'));
      return;
    }

    const screenshots = event.target.closest?.(
      '.unit3d-ptp-comparison .comparison__screenshots:not([hidden])'
    );
    if (screenshots) {
      event.preventDefault();
      closeComparison(screenshots.closest('.unit3d-ptp-comparison'));
    }
  }

  function handleDescriptionLightboxClick(event) {
    const trigger = event.target.closest?.(
      '.unit3d-ptp-description-lightbox-trigger, .unit3d-ptp-description-lightbox-link'
    );
    if (trigger && trigger.closest('.unit3d-ptp-detail')) {
      const url = trigger.dataset.unit3dPtpLightboxUrl;
      if (!url) return;

      event.preventDefault();
      showDescriptionImageLightbox(url);
      return;
    }

    const lightbox = event.target.closest?.('.unit3d-ptp-lightbox');
    if (!lightbox) return;

    if (event.target === lightbox || event.target.closest('.unit3d-ptp-lightbox__close')) {
      event.preventDefault();
      closeDescriptionImageLightbox();
    }
  }

  function handleDescriptionLightboxKeydown(event) {
    if (event.key !== 'Escape') return;
    const lightbox = document.querySelector('.unit3d-ptp-lightbox:not([hidden])');
    if (!lightbox) return;

    event.preventDefault();
    closeDescriptionImageLightbox();
  }

  function showDescriptionImageLightbox(url) {
    const lightbox = ensureDescriptionImageLightbox();
    const link = lightbox.querySelector('.unit3d-ptp-lightbox__link');
    const image = lightbox.querySelector('.unit3d-ptp-lightbox__image');

    link.href = url;
    link.textContent = url;
    image.src = url;
    image.alt = '';
    lightbox.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function closeDescriptionImageLightbox() {
    const lightbox = document.querySelector('.unit3d-ptp-lightbox');
    if (!lightbox) return;

    lightbox.hidden = true;
    const image = lightbox.querySelector('.unit3d-ptp-lightbox__image');
    if (image) image.removeAttribute('src');
    document.documentElement.style.removeProperty('overflow');
  }

  function ensureDescriptionImageLightbox() {
    const existing = document.querySelector('.unit3d-ptp-lightbox');
    if (existing) return existing;

    const lightbox = document.createElement('div');
    lightbox.className = 'unit3d-ptp-lightbox';
    lightbox.hidden = true;

    const bar = document.createElement('div');
    bar.className = 'unit3d-ptp-lightbox__bar';

    const link = document.createElement('a');
    link.className = 'unit3d-ptp-lightbox__link';
    openLinkInNewTab(link);

    const closeButton = document.createElement('button');
    closeButton.className = 'form__button form__button--outlined unit3d-ptp-lightbox__close';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';

    const viewport = document.createElement('div');
    viewport.className = 'unit3d-ptp-lightbox__viewport';

    const image = document.createElement('img');
    image.className = 'unit3d-ptp-lightbox__image';
    image.alt = '';

    bar.append(link, closeButton);
    viewport.appendChild(image);
    lightbox.append(bar, viewport);
    document.body.appendChild(lightbox);
    return lightbox;
  }

  function handleComparisonKeydown(event) {
    const comparison = document
      .querySelector('.unit3d-ptp-comparison .comparison__screenshots:not([hidden])')
      ?.closest('.unit3d-ptp-comparison');
    if (!comparison) return;

    if (event.key === 'Escape') {
      closeComparison(comparison);
      return;
    }

    const columnCount = parseInteger(comparison.dataset.columnCount);
    const currentColumn = parseInteger(comparison.dataset.column) || 1;
    if (/^[1-9]$/.test(event.key) && Number(event.key) <= columnCount) {
      setComparisonColumn(comparison, Number(event.key));
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -1 : 1;
      const nextColumn = ((currentColumn - 1 + delta + columnCount) % columnCount) + 1;
      setComparisonColumn(comparison, nextColumn);
    }
  }

  function handleComparisonMousemove(event) {
    const comparison = event.target
      .closest?.('.unit3d-ptp-comparison .comparison__screenshots:not([hidden])')
      ?.closest('.unit3d-ptp-comparison');
    if (!comparison) return;

    const columnCount = parseInteger(comparison.dataset.columnCount);
    if (columnCount <= 1) return;

    const nextColumn = Math.min(
      columnCount,
      Math.max(1, Math.ceil((event.clientX * columnCount) / globalThis.innerWidth))
    );
    setComparisonColumn(comparison, nextColumn);
  }

  function openComparison(comparison) {
    if (!comparison) return;
    closeOpenComparisons(comparison);

    const screenshots = comparison.querySelector('.comparison__screenshots');
    if (!screenshots) return;

    screenshots.hidden = false;
    setComparisonColumn(comparison, parseInteger(comparison.dataset.column) || 1);
    requestAnimationFrame(() => screenshots.focus());
  }

  function closeComparison(comparison) {
    if (!comparison) return;
    const screenshots = comparison.querySelector('.comparison__screenshots');
    if (screenshots) screenshots.hidden = true;
  }

  function closeOpenComparisons(except = null) {
    document
      .querySelectorAll('.unit3d-ptp-comparison .comparison__screenshots:not([hidden])')
      .forEach((screenshots) => {
        const comparison = screenshots.closest('.unit3d-ptp-comparison');
        if (comparison !== except) closeComparison(comparison);
      });
  }

  function setComparisonColumn(comparison, column) {
    const columnCount = parseInteger(comparison.dataset.columnCount) || 1;
    const selectedColumn = Math.min(columnCount, Math.max(1, column || 1));
    comparison.dataset.column = String(selectedColumn);

    comparison.querySelectorAll('.comparison__image-container').forEach((container) => {
      container.classList.toggle(
        'comparison__image-container--hidden',
        parseInteger(container.dataset.index) !== selectedColumn
      );
    });

    comparison.querySelectorAll('.comparison__image').forEach((image) => {
      image.classList.toggle(
        'comparison__image--hidden',
        parseInteger(image.dataset.index) !== selectedColumn
      );
    });
  }

  function normalizeComparisonLabels(label) {
    return normalizeWhitespace(label)
      .split(/\s*,\s*/)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean);
  }

  function buildImageLink(href, src) {
    const container = document.createElement('span');
    container.className = 'unit3d-ptp-bbcode-image-strip';

    const link = document.createElement('a');
    link.className = 'UNIT3D images unit3d-ptp-bbcode-image-link';
    link.href = href;
    link.title = src;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = src;
    container.appendChild(link);

    return container;
  }

  function extractUrls(text) {
    return [
      ...new Set((text.match(/https?:\/\/[^\s\[\]]+/gi) || []).map(normalizeBbcodeUrl))
    ].filter(Boolean);
  }

  function normalizeBbcodeUrl(value) {
    return String(value || '')
      .trim()
      .replace(/["')]+$/g, '');
  }

  function syncImageMarkersToHeader(detailRow, content) {
    const headerRow = detailRow.previousElementSibling;
    if (!headerRow?.classList.contains('group_torrent_header')) return;

    headerRow.querySelectorAll('.unit3d-ptp-image-marker').forEach((marker) => marker.remove());

    const urls = [
      ...new Set(
        [...content.querySelectorAll('.UNIT3D.images[title]')]
          .map((link) => link.getAttribute('title'))
          .filter(Boolean)
      )
    ];

    urls.forEach((url) => {
      const marker = document.createElement('a');
      marker.className = 'UNIT3D images unit3d-ptp-image-marker';
      marker.href = url;
      marker.title = url;
      marker.textContent = url;
      openLinkInNewTab(marker);
      headerRow.appendChild(marker);
    });
  }

  function sanitizeTree(root, baseUrl) {
    const blockedSelector = [
      'script',
      'style',
      'link',
      'iframe',
      'object',
      'embed',
      'noscript',
      'template'
    ].join(',');
    root.querySelectorAll(blockedSelector).forEach((node) => node.remove());

    root.querySelectorAll('*').forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (shouldRemoveAttribute(element, name)) {
          element.removeAttribute(attribute.name);
          return;
        }

        if ((name === 'href' || name === 'src') && !isSafeUrl(attribute.value, baseUrl, name)) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element instanceof HTMLAnchorElement && element.href) {
        openLinkInNewTab(element);
      }
    });
  }

  function openLinkInNewTab(link) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  function shouldRemoveAttribute(element, name) {
    if (name.startsWith('on')) return true;
    if (isDynamicActionMenuAttribute(element, name)) return false;

    return (
      name === 'id' ||
      name.startsWith('x-') ||
      name.startsWith('wire:') ||
      name === 'wire:id' ||
      name.startsWith('@') ||
      name.startsWith(':')
    );
  }

  function isDynamicActionMenuAttribute(element, name) {
    if (!element.closest('.unit3d-ptp-detail-actions')) return false;

    return (
      name === 'id' ||
      name.startsWith('x-') ||
      name.startsWith('wire:') ||
      name === 'wire:id' ||
      name.startsWith('@') ||
      name.startsWith(':')
    );
  }

  function isSafeUrl(value, baseUrl, attributeName) {
    if (!value || value.startsWith('#')) return true;

    try {
      const url = new URL(value, baseUrl || location.href);
      if (url.protocol === 'javascript:' || url.protocol === 'vbscript:') return false;
      if (attributeName === 'src' && url.protocol === 'data:') {
        return /^data:image\//i.test(value);
      }
      return ['http:', 'https:', 'magnet:', 'data:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function maybePrefetchVisibleDetails(torrents) {
    if (CONFIG.prefetch !== 'visible' || CONFIG.detailLoading !== 'lazy') return;

    const visibleIds = new Set(
      [...document.querySelectorAll('tr.group_torrent.group_torrent_header')]
        .filter((row) => row.getBoundingClientRect().top < globalThis.innerHeight)
        .map((row) => row.dataset.unit3dTorrentId)
    );

    torrents
      .filter((torrent) => visibleIds.has(torrent.id))
      .forEach((torrent) => {
        if (detailCache.has(torrent.torrentUrl)) return;
        enqueueDetailFetch(() => fetchTorrentDetail(torrent.torrentUrl))
          .then((html) => parseTorrentDetailPage(html, torrent.torrentUrl))
          .then((detail) => detailCache.set(torrent.torrentUrl, detail))
          .catch(() => {});
      });
  }

  function dispatchReady() {
    document.dispatchEvent(
      new CustomEvent('unit3d:ptp-dom-ready', {
        detail: { table: document.getElementById('torrent-table') }
      })
    );
  }

  function cloneOptional(element) {
    return element ? element.cloneNode(true) : null;
  }

  function absolutizeUrl(value) {
    if (!value) return '';
    try {
      return new URL(value, location.href).href;
    } catch {
      return value;
    }
  }

  function extractTorrentId(url) {
    const match = /\/torrents\/(\d+)(?:[/?#]|$)/.exec(String(url));
    return match ? match[1] : '';
  }

  function extractReleaseGroup(name) {
    const trimmed = normalizeWhitespace(name);
    const match = /-([A-Za-z0-9][A-Za-z0-9._-]{1,31})$/.exec(trimmed);
    return match ? match[1] : '';
  }

  function formatDisplayReleaseName(name) {
    const text = normalizeWhitespace(name);
    const match = /^(.+?)\s+((?:480|576|720|1080|2160|4320)[pi]\b|4k\b|uhd\b)(.*)$/i.exec(text);
    if (!match) return text;

    const prefix = normalizeWhitespace(match[1]);
    const resolution = match[2];
    const suffix = normalizeWhitespace(match[3]);
    if (!prefix) return text;

    return normalizeWhitespace([resolution, prefix, suffix].filter(Boolean).join(' '));
  }

  function buildReleaseNameNodes(torrent) {
    const text = formatReleaseDisplayText(torrent.releaseName, torrent.type, torrent.quality);
    const ranges = getReleaseTokenRanges(text, torrent.type);
    if (ranges.length === 0) return [document.createTextNode(text)];

    const nodes = [];
    let cursor = 0;
    ranges.forEach((range) => {
      if (range.start > cursor)
        nodes.push(document.createTextNode(text.slice(cursor, range.start)));

      const span = document.createElement('span');
      span.className = `unit3d-ptp-release-token ${range.className}`;
      span.textContent = text.slice(range.start, range.end);
      nodes.push(span);
      cursor = range.end;
    });

    if (cursor < text.length) nodes.push(document.createTextNode(text.slice(cursor)));
    return nodes;
  }

  function formatReleaseDisplayText(name, type, quality) {
    let text = formatDisplayReleaseName(name)
      .replace(HDR_TEXT_PATTERN, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalizeQualityId(quality) === 'uhd') {
      text = normalizeWhitespace(text.replace(/\b(?:UHD|Ultra\s*HD)\b/gi, ' '));
    }
    const releaseType = normalizeReleaseType(type);

    if (releaseType) {
      text = removeReleaseTypeTokens(text, releaseType);
      text = injectReleaseTypeAfterResolution(text, releaseType);
    }

    return normalizeWhitespace(text);
  }

  function normalizeReleaseType(type) {
    const normalized = normalizeWhitespace(type);
    return (
      RELEASE_TYPES.find((releaseType) => releaseType.toLowerCase() === normalized.toLowerCase()) ||
      ''
    );
  }

  function removeReleaseTypeTokens(text, type) {
    if (!type) return text;
    return normalizeWhitespace(
      text.replace(new RegExp(String.raw`\b${escapeRegExp(type)}\b`, 'gi'), ' ')
    );
  }

  function injectReleaseTypeAfterResolution(text, type) {
    const match = /\b((?:480|576|720|1080|2160|4320)[pi]|4k|uhd)\b/i.exec(text);
    if (!match) return normalizeWhitespace([type, text].filter(Boolean).join(' '));

    const before = text.slice(0, match.index + match[0].length);
    const after = text.slice(match.index + match[0].length);
    return normalizeWhitespace(`${before} ${type} ${after}`);
  }

  function getReleaseTokenRanges(text, type) {
    const ranges = [];
    const releaseType = normalizeReleaseType(type);
    if (releaseType) {
      addReleaseTokenRanges(
        ranges,
        text,
        releaseType,
        `unit3d-ptp-release-token--type-${slugify(releaseType)}`
      );
    }

    AUDIO_CODEC_TOKENS.forEach((token) => {
      addAudioTokenRanges(
        ranges,
        text,
        token,
        `unit3d-ptp-release-token--audio-${audioTokenSlug(token)}`
      );
    });

    METADATA_TOKENS.forEach((token) => {
      addReleaseTokenRanges(ranges, text, token, 'unit3d-ptp-release-token--metadata');
    });

    return ranges.sort((left, right) => left.start - right.start || right.end - left.end);
  }

  function addReleaseTokenRanges(ranges, text, token, className) {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9+:-])(${escapeRegExp(token)})(?=$|[^A-Za-z0-9+:])`,
      'gi'
    );
    let match = pattern.exec(text);
    while (match) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;
      if (!ranges.some((range) => start < range.end && end > range.start)) {
        ranges.push({ className, end, start });
      }
      match = pattern.exec(text);
    }
  }

  function addAudioTokenRanges(ranges, text, token, className) {
    const channelPattern = String.raw`(?:[\s-]+(?:1|2|3|4|5|6|7)\.(?:0|1|2))?`;
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9+:-])(${escapeRegExp(token)}${channelPattern})(?=$|[^A-Za-z0-9+:])`,
      'gi'
    );
    let match = pattern.exec(text);
    while (match) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;
      if (!ranges.some((range) => start < range.end && end > range.start)) {
        ranges.push({ className, end, start });
      }
      match = pattern.exec(text);
    }
  }

  function cloneVisionBadges(iconRoot) {
    return cloneFilteredBadges(iconRoot, true);
  }

  function cloneStatusBadges(iconRoot) {
    return cloneFilteredBadges(iconRoot, false);
  }

  function cloneFilteredBadges(iconRoot, includeVision) {
    const source = iconRoot?.matches?.('.torrent-icons')
      ? iconRoot
      : iconRoot?.querySelector?.('.torrent-icons');
    if (!source) return null;

    const clone = source.cloneNode(true);
    clone.querySelectorAll('.torrent-icon').forEach((icon) => {
      const isVision = icon.classList.contains('torrent-icons__vision');
      if (isVision !== includeVision) removeBadgeWrapper(icon);
    });

    return clone.querySelector('.torrent-icon') ? clone : null;
  }

  function removeBadgeWrapper(icon) {
    const link = icon.closest('a');
    if (link && link.parentElement?.matches('.torrent-icons')) {
      link.remove();
      return;
    }

    icon.remove();
  }

  function audioTokenSlug(token) {
    return slugify(token);
  }

  function slugify(value) {
    return normalizeWhitespace(value)
      .toLowerCase()
      .replace(/\+/g, ' plus')
      .replace(/:/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function humanizeIdentifier(value) {
    return normalizeWhitespace(value.replace(/[_-]+/g, ' ')).replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }

  function classifyReleaseQuality(name) {
    const text = normalizeWhitespace(name).toLowerCase();

    if (/\b(2160p|4320p|4k|uhd|ultra\s*hd)\b/.test(text)) return 'uhd';
    if (/\b(720p|1080p|1080i|hd|blu-?ray|bdrip|web-?dl|webrip)\b/.test(text)) {
      return 'hd';
    }
    if (/\b(480p|480i|576p|576i|sd|dvd|dvdrip|ntsc|pal|xvid|divx)\b/.test(text)) {
      return 'sd';
    }

    return 'sd';
  }

  function normalizeQualityId(value) {
    const id = String(value || '').toLowerCase();
    return QUALITY_SECTION_BY_ID.has(id) ? id : 'sd';
  }

  function compareTorrents(left, right, sort) {
    const column = SORT_COLUMN_BY_KEY.get(sort.key) || SORT_COLUMN_BY_KEY.get('sizeBytes');
    const direction = sort.direction === 'desc' ? -1 : 1;
    const primary = compareValues(left[column.key], right[column.key], column.type);
    if (primary !== 0) return primary * direction;

    const sizeTie = compareValues(left.sizeBytes, right.sizeBytes, 'number');
    if (sizeTie !== 0) return sizeTie;

    return compareValues(left.releaseName, right.releaseName, 'text');
  }

  function compareRowPairs(left, right, sort) {
    const crossSeedGroupTie = compareCrossSeedRowPairOrder(left.header, right.header);
    if (crossSeedGroupTie !== null) return crossSeedGroupTie;

    const column = SORT_COLUMN_BY_KEY.get(sort.key) || SORT_COLUMN_BY_KEY.get('sizeBytes');
    const direction = sort.direction === 'desc' ? -1 : 1;
    const leftSortHeader = getCrossSeedSortHeader(left.header);
    const rightSortHeader = getCrossSeedSortHeader(right.header);
    const primary = compareValues(
      getRowSortValue(leftSortHeader, column.key),
      getRowSortValue(rightSortHeader, column.key),
      column.type
    );
    if (primary !== 0) return primary * direction;

    const sizeTie = compareValues(
      getRowSortValue(leftSortHeader, 'sizeBytes'),
      getRowSortValue(rightSortHeader, 'sizeBytes'),
      'number'
    );
    if (sizeTie !== 0) return sizeTie;

    const nameTie = compareValues(
      getRowSortValue(leftSortHeader, 'releaseName'),
      getRowSortValue(rightSortHeader, 'releaseName'),
      'text'
    );
    if (nameTie !== 0) return nameTie;

    const crossSeedIndexTie = compareValues(
      getCrossSeedGroupSortIndex(left.header, left.index),
      getCrossSeedGroupSortIndex(right.header, right.index),
      'number'
    );
    if (crossSeedIndexTie !== 0) return crossSeedIndexTie;

    return left.index - right.index;
  }

  function compareCrossSeedRowPairOrder(left, right) {
    const leftGroup = left.dataset.unit3dCrossSeedGroup || '';
    const rightGroup = right.dataset.unit3dCrossSeedGroup || '';
    if (!leftGroup || leftGroup !== rightGroup) return null;

    const leftOrder = Number.parseInt(left.dataset.unit3dCrossSeedOrder || '', 10);
    const rightOrder = Number.parseInt(right.dataset.unit3dCrossSeedOrder || '', 10);
    if (!Number.isFinite(leftOrder) || !Number.isFinite(rightOrder)) return null;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return null;
  }

  function getCrossSeedSortHeader(row) {
    const group = row.dataset.unit3dCrossSeedGroup || '';
    if (!group) return row;
    if (row.dataset.unit3dCrossSeedOrder === '0') return row;

    return (
      row
        .closest('tbody')
        ?.querySelector(
          `tr.group_torrent_header[data-unit3d-cross-seed-group="${cssEscape(
            group
          )}"][data-unit3d-cross-seed-order="0"]`
        ) || row
    );
  }

  function getCrossSeedGroupSortIndex(row, fallbackIndex) {
    const groupIndex = Number.parseInt(row.dataset.unit3dCrossSeedGroupIndex || '', 10);
    return Number.isFinite(groupIndex) ? groupIndex : fallbackIndex;
  }

  function getRowSortValue(row, key) {
    if (key === 'releaseName') return row.dataset.releasename || '';
    if (key === 'sizeBytes') {
      return parseInteger(row.dataset.sizeBytes || row.querySelector('.size-span')?.title || '');
    }
    if (key === 'seeders') return parseInteger(row.dataset.seeders || '');
    if (key === 'leechers') return parseInteger(row.dataset.leechers || '');
    if (key === 'completed') return parseInteger(row.dataset.completed || '');
    return '';
  }

  function compareValues(left, right, type) {
    if (type === 'number') return (Number(left) || 0) - (Number(right) || 0);

    return String(left || '').localeCompare(String(right || ''), undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  function normalizeWhitespace(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseInteger(value) {
    const match = /[\d,]+/.exec(String(value || ''));
    return match ? Number.parseInt(match[0].replace(/,/g, ''), 10) || 0 : 0;
  }

  function parseSizeBytes(value) {
    const text = normalizeWhitespace(value).replace(/\u202f/g, ' ');
    const directBytes = /^([\d,]+)\s*B$/i.exec(text);
    if (directBytes) return Number.parseInt(directBytes[1].replace(/,/g, ''), 10) || 0;

    const match = /([\d,.]+)\s*(B|KB|KiB|MB|MiB|GB|GiB|TB|TiB)/i.exec(text);
    if (!match) return parseInteger(text);

    const amount = Number.parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toLowerCase();
    const multipliers = {
      b: 1,
      gb: 1000000000,
      gib: 1073741824,
      kb: 1000,
      kib: 1024,
      mb: 1000000,
      mib: 1048576,
      tb: 1000000000000,
      tib: 1099511627776
    };

    return Number.isFinite(amount) ? Math.round(amount * (multipliers[unit] || 1)) : 0;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 B';

    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  }

  function cssEscape(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function')
      return globalThis.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }
})();
