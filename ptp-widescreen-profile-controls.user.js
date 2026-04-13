// ==UserScript==
// @name         PTP Widescreen Profile Controls
// @namespace    https://passthepopcorn.me/
// @version      1.0.0
// @description  Add a Widescreen tab to profile edit pages and control widescreen.css width variables.
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SETTINGS_KEY = 'ptp_widescreen_profile_controls_v1';
  const CONTROLS_STYLE_ID = 'ptp-widescreen-profile-controls-style-v1';
  const DEFAULT_STATE = {
    linked: true,
    scale: 100,
    overrides: {},
    linkedVariables: {},
    logoImageUrl: '',
    backdropImageUrl: '',
    tileBackdropImage: false
  };

  const WIDTH_VARS = [
    { name: 'layout-width', label: 'Layout Width', defaultValue: 2000, min: 1200, max: 3200 },
    { name: 'main-menu-width', label: 'Main Menu Width', defaultValue: 1500, min: 900, max: 2600 },
    { name: 'sidebar-width', label: 'Sidebar Width', defaultValue: 450, min: 260, max: 800 },
    { name: 'sidebar-gap', label: 'Sidebar Gap', defaultValue: 5, min: 0, max: 40 },
    { name: 'bbcode-image-default-width', label: 'BBCode Image Width', defaultValue: 1450, min: 800, max: 2800 },
    { name: 'search-bar-field-width', label: 'Search Field Width', defaultValue: 180, min: 120, max: 420 },
    { name: 'cover-movie-width', label: 'Cover View Poster Width', defaultValue: 176, min: 100, max: 360 },
    { name: 'cover-movie-narrow-width', label: 'Cover View Narrow Poster Width', defaultValue: 168, min: 96, max: 340 },
    { name: 'cover-movie-index-width', label: 'Cover View Index Poster Width', defaultValue: 370, min: 200, max: 620 },
    { name: 'cover-movie-index-narrow-width', label: 'Cover View Index Narrow Poster Width', defaultValue: 350, min: 190, max: 600 },
    { name: 'cover-movie-centered-width', label: 'Cover View Centered Poster Width', defaultValue: 330, min: 180, max: 560 },
    { name: 'basic-movie-cover-width', label: 'List/Compact View Poster Width', defaultValue: 250, min: 140, max: 480 },
    { name: 'small-cover-movie-width', label: 'Small Cover View Poster Width', defaultValue: 140, min: 80, max: 260 },
    { name: 'bookmarks-huge-movie-width', label: 'Bookmarks Huge Movie Width', defaultValue: 280, min: 160, max: 520 },
    { name: 'torrents-huge-movie-width', label: 'Torrents Huge Movie Width', defaultValue: 256, min: 140, max: 480 }
  ];

  const FONT_SIZE_VARS = [
    {
      name: 'user-info-bar-font-size',
      label: 'User Info Bar Font Size',
      defaultValue: 13,
      min: 8,
      max: 24,
      unit: 'pt',
      linkedByDefault: false
    },
    {
      name: 'main-menu-font-size',
      label: 'Main Menu Font Size',
      defaultValue: 20,
      min: 10,
      max: 40,
      unit: 'px',
      linkedByDefault: false
    },
    {
      name: 'search-bar-font-size',
      label: 'Search Bar Font Size',
      defaultValue: 1.1,
      min: 0.7,
      max: 2,
      step: 0.1,
      precision: 1,
      unit: 'em',
      linkedByDefault: false
    },
    {
      name: 'torrent-row-font-size',
      label: 'Torrent Row Font Size',
      defaultValue: 1,
      min: 0.7,
      max: 2,
      step: 0.05,
      precision: 2,
      unit: 'em',
      linkedByDefault: false
    }
  ];

  const SETTING_VARS = [...WIDTH_VARS, ...FONT_SIZE_VARS];

  const HEIGHT_FROM_WIDTH = [
    {
      widthVar: 'cover-movie-width',
      widthDefault: 176,
      heightVar: 'cover-movie-height',
      heightDefault: 246
    },
    {
      widthVar: 'cover-movie-narrow-width',
      widthDefault: 168,
      heightVar: 'cover-movie-narrow-height',
      heightDefault: 234
    },
    {
      widthVar: 'cover-movie-index-width',
      widthDefault: 370,
      heightVar: 'cover-movie-index-height',
      heightDefault: 580
    },
    {
      widthVar: 'cover-movie-index-narrow-width',
      widthDefault: 350,
      heightVar: 'cover-movie-index-narrow-height',
      heightDefault: 540
    },
    {
      widthVar: 'cover-movie-centered-width',
      widthDefault: 330,
      heightVar: 'cover-movie-centered-height',
      heightDefault: 490
    },
    {
      widthVar: 'small-cover-movie-width',
      widthDefault: 140,
      heightVar: 'small-cover-movie-height',
      heightDefault: 196
    },
    {
      widthVar: 'bookmarks-huge-movie-width',
      widthDefault: 280,
      heightVar: 'bookmarks-huge-movie-height',
      heightDefault: 440
    },
    {
      widthVar: 'torrents-huge-movie-width',
      widthDefault: 256,
      heightVar: 'torrents-huge-movie-height',
      heightDefault: 400
    }
  ];

  const PREVIEW_ROW_GROUPS = [
    [
      'cover-movie-width',
      'cover-movie-narrow-width',
      'cover-movie-centered-width'
    ],
    [
      'cover-movie-index-width',
      'cover-movie-index-narrow-width',
      'torrents-huge-movie-width'
    ],
    [
      'small-cover-movie-width',
      'bookmarks-huge-movie-width'
    ]
  ];

  const PREVIEW_LABELS = {
    'cover-movie-width': 'Cover view poster',
    'cover-movie-narrow-width': 'Cover view narrow poster',
    'cover-movie-index-width': 'Cover view index poster',
    'cover-movie-index-narrow-width': 'Cover view index narrow poster',
    'cover-movie-centered-width': 'Cover view centered poster',
    'small-cover-movie-width': 'Small cover view poster',
    'bookmarks-huge-movie-width': 'Bookmarks huge movie poster',
    'torrents-huge-movie-width': 'Torrents huge view poster'
  };

  const DIRECT_WIDTH_BINDINGS = [
    {
      variableName: 'main-menu-width',
      selector: '.main-menu',
      cssProperty: 'width'
    }
  ];

  function ensureControlsStyles() {
    if (document.getElementById(CONTROLS_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = CONTROLS_STYLE_ID;
    style.textContent = `
#content.page__main-content.js-widescreen-controls-active > .thin,
#content.page__main-content.js-widescreen-controls-active > .thin > .tabs,
#content.page__main-content.js-widescreen-controls-active > .thin > .tabs > .tabs__panels,
#content.page__main-content.js-widescreen-controls-active > .thin > .tabs > .tabs__bar {
  width: var(--layout-width) !important;
  min-width: var(--layout-width) !important;
  max-width: none !important;
  margin-left: auto;
  margin-right: auto;
}

#content.page__main-content.js-widescreen-controls-active {
  width: auto !important;
  min-width: 1140px !important;
  max-width: none !important;
}

body.js-widescreen-controls-active #content.page__main-content,
html.js-widescreen-controls-active #content.page__main-content {
  width: auto !important;
  min-width: 1140px !important;
  max-width: none !important;
}

.tabs__panel.js-widescreen-controls-tab-panel,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel {
  width: var(--layout-width);
  min-width: var(--layout-width);
  margin-left: auto;
  margin-right: auto;
}

.js-widescreen-controls-panel.widescreen-controls {
  width: 1040px;
  min-width: 1040px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 14px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel {
  margin-bottom: 14px;
}

.js-widescreen-controls-panel .widescreen-controls__description {
  margin: 4px 0 12px;
  color: #b8b8b8;
}

.js-widescreen-controls-panel .widescreen-controls__list,
.js-widescreen-controls-panel .widescreen-controls__asset-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.js-widescreen-controls-panel .widescreen-controls__asset-list {
  margin-top: 12px;
}

.js-widescreen-controls-panel .widescreen-controls__row {
  display: grid;
  grid-template-columns: 24px minmax(220px, 1fr) minmax(220px, 2fr) 90px 32px;
  gap: 8px;
  align-items: center;
}

.js-widescreen-controls-panel .widescreen-controls__row--text {
  grid-template-columns: 24px minmax(220px, 1fr) minmax(0, 1fr);
}

.js-widescreen-controls-panel .widescreen-controls__row--toggle {
  grid-template-columns: 24px minmax(220px, 1fr) auto;
  justify-content: start;
}

.js-widescreen-controls-panel .widescreen-controls__row-link-toggle {
  width: 16px;
  height: 16px;
  margin: 0;
}

.js-widescreen-controls-panel .widescreen-controls__row-spacer {
  display: block;
  width: 16px;
  height: 16px;
}

.js-widescreen-controls-panel .widescreen-controls__row--detached .widescreen-controls__label {
  color: #ffffff;
}

.js-widescreen-controls-panel .widescreen-controls__row--linked {
  grid-template-columns: minmax(220px, 1fr) auto;
  margin-bottom: 8px;
}

.js-widescreen-controls-panel .widescreen-controls__row--linked input[type='checkbox'] {
  width: 18px;
  height: 18px;
}

.js-widescreen-controls-panel .widescreen-controls__label {
  color: #d3d3d3;
}

.js-widescreen-controls-panel .widescreen-controls__range {
  width: 100%;
}

.js-widescreen-controls-panel .widescreen-controls__number {
  width: 90px;
}

.js-widescreen-controls-panel .widescreen-controls__text {
  width: 100%;
  min-width: 0;
}

.js-widescreen-controls-panel .widescreen-controls__unit {
  color: #a6a6a6;
  font-size: 12px;
}

.js-widescreen-controls-panel .widescreen-controls__actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.js-widescreen-controls-panel .widescreen-controls__status {
  color: #9dc284;
  font-size: 12px;
  min-height: 18px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview {
  padding-top: 2px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-title {
  margin: 0 0 6px;
  font-size: 16px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-subtitle {
  margin: 0 0 10px;
  color: #a8a8a8;
  font-size: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-row {
  display: grid;
  grid-template-columns: repeat(var(--preview-row-columns, 1), minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 1300px) {
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-row {
    grid-template-columns: 1fr;
  }
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-item {
  border: 1px solid #3a3c3f;
  border-radius: 6px;
  background: #1b1b1b;
  padding: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-label {
  color: #d9d9d9;
  font-size: 12px;
  text-transform: capitalize;
  margin-bottom: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-frame {
  min-height: 96px;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  border: 1px dashed #5a5a5a;
  border-radius: 4px;
  background: radial-gradient(circle at 50% 40%, #2b2b2b, #181818);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-box {
  display: block;
  flex: 0 0 auto;
  border: 1px solid #83b6c8;
  background: linear-gradient(140deg, rgba(58, 84, 100, 0.55), rgba(39, 59, 74, 0.55));
  box-shadow: inset 0 0 0 1px rgba(173, 218, 238, 0.2);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__preview-size {
  margin-top: 7px;
  color: #afafaf;
  font-size: 11px;
  text-align: center;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-frame {
  min-height: 180px;
  width: 100%;
  box-sizing: border-box;
  overflow: auto;
  padding: 15px 19px;
  border: 1px dashed #5a5a5a;
  border-radius: 4px;
  background: black;
  --preview-sidebar-width: var(--sidebar-width);
  --preview-sidebar-gap: var(--sidebar-gap);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-frame::after {
  content: '';
  display: block;
  clear: both;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-main,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-sidebar {
  box-sizing: border-box;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-main {
  margin-bottom: 0;
  margin-right: calc(var(--preview-sidebar-width) + var(--preview-sidebar-gap));
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  overflow: hidden;
  border-radius: 4px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  th,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  td {
  padding: 4px 6px;
  border: 1px solid #555555;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  thead
  > tr {
  background: linear-gradient(180deg, rgba(20, 22, 22, 0.95), rgba(8, 9, 9, 0.95));
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  tbody
  > tr {
  background: rgba(51, 51, 51, 0.78);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent-edition {
  font-size: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent-row {
  font-size: var(--torrent-row-font-size);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent__action {
  float: right;
  margin-left: 10px;
  color: #d0d0d0;
  font-size: 11px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .widescreen-controls__layout-torrent-cell--main {
  white-space: normal;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .widescreen-controls__layout-torrent-cell--main
  .torrent-info-link {
  color: #d8d8d8;
  text-decoration: none;
  line-height: 1.45;
  white-space: normal;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent-edition__sub {
  color: #d0d0d0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .torrent-info-link:hover {
  text-decoration: none;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-torrent-table
  .tag-separator {
  opacity: 0.65;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-sidebar {
  width: var(--preview-sidebar-width);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-sidebar .panel {
  margin-bottom: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-block-title {
  color: #f0f0f0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-block-size {
  margin-top: 4px;
  color: #c2c2c2;
  font-size: 11px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-main-meta,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-sidebar-meta {
  margin-bottom: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-bbcode-wrap {
  margin-top: 14px;
  padding: 10px;
  border: 1px dashed rgba(173, 218, 238, 0.35);
  border-radius: 4px;
  background: rgba(15, 18, 21, 0.26);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-bbcode {
  height: 70px;
  width: min(var(--bbcode-image-default-width), 100%);
  border: 1px solid #83b6c8;
  border-radius: 4px;
  background: linear-gradient(140deg, rgba(58, 84, 100, 0.55), rgba(39, 59, 74, 0.55));
  box-shadow: inset 0 0 0 1px rgba(173, 218, 238, 0.2);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-metric {
  border: 1px solid #3a3c3f;
  border-radius: 6px;
  background: #1b1b1b;
  padding: 8px 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-metric-label {
  color: #d9d9d9;
  font-size: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-metric-value {
  margin-top: 4px;
  color: #afafaf;
  font-size: 11px;
}

@media (max-width: 760px) {
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel .widescreen-controls__layout-legend {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1000px) {
  #content.page__main-content.js-widescreen-controls-active > .thin,
  #content.page__main-content.js-widescreen-controls-active > .thin > .tabs,
  #content.page__main-content.js-widescreen-controls-active > .thin > .tabs > .tabs__panels,
  #content.page__main-content.js-widescreen-controls-active > .thin > .tabs > .tabs__bar {
    width: var(--layout-width) !important;
    min-width: var(--layout-width) !important;
  }

  .tabs__panels {
    overflow-x: auto;
  }

  .tabs__panel.js-widescreen-controls-tab-panel,
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel {
    width: var(--layout-width);
    min-width: var(--layout-width);
  }

  .js-widescreen-controls-panel.widescreen-controls {
    width: 1040px;
    min-width: 1040px;
  }

  .js-widescreen-controls-panel .widescreen-controls__row,
  .js-widescreen-controls-panel .widescreen-controls__row--text,
  .js-widescreen-controls-panel .widescreen-controls__row--toggle {
    grid-template-columns: 1fr;
  }

  .js-widescreen-controls-panel .widescreen-controls__row--linked {
    grid-template-columns: 1fr auto;
  }

  .js-widescreen-controls-panel .widescreen-controls__number {
    width: 100%;
  }
}
`;

    document.head.appendChild(style);
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function clampSettingValue(value, variable, fallback) {
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return fallback;
    let clean = n;
    if (clean < variable.min) clean = variable.min;
    if (clean > variable.max) clean = variable.max;
    if (typeof variable.precision === 'number') {
      return Number(clean.toFixed(variable.precision));
    }
    return Math.round(clean);
  }

  function scaleSettingValue(variable, scale) {
    const scaled = (Number(variable.defaultValue) * scale) / 100;
    return clampSettingValue(scaled, variable, variable.defaultValue);
  }

  function formatSettingValue(value, variable) {
    if (typeof variable.precision === 'number') {
      return value.toFixed(variable.precision);
    }
    return String(value);
  }

  function normalizeUrlValue(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function setBackgroundImage(element, imageUrl) {
    if (!element) return;

    const cleanUrl = normalizeUrlValue(imageUrl);
    if (!cleanUrl) {
      element.style.removeProperty('background-image');
      return;
    }

    element.style.backgroundImage = `url(${JSON.stringify(cleanUrl)})`;
  }

  function readRawSettings() {
    try {
      if (typeof GM_getValue === 'function') {
        return GM_getValue(SETTINGS_KEY, null);
      }
      return localStorage.getItem(SETTINGS_KEY);
    } catch (error) {
      console.debug('PTP Widescreen Controls: read settings failed', error);
      return null;
    }
  }

  function writeRawSettings(raw) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(SETTINGS_KEY, raw);
        return;
      }
      localStorage.setItem(SETTINGS_KEY, raw);
    } catch (error) {
      console.debug('PTP Widescreen Controls: write settings failed', error);
    }
  }

  function normalizeState(parsed) {
    const linked = parsed && typeof parsed.linked === 'boolean' ? parsed.linked : DEFAULT_STATE.linked;
    const scale = clampInt(parsed && parsed.scale, 50, 200, DEFAULT_STATE.scale);
    const overrides = {};
    const linkedVariables = {};

    for (const variable of SETTING_VARS) {
      const rawValue = parsed && parsed.overrides ? parsed.overrides[variable.name] : undefined;
      overrides[variable.name] = clampSettingValue(rawValue, variable, variable.defaultValue);

      const rawLinked = parsed && parsed.linkedVariables ? parsed.linkedVariables[variable.name] : undefined;
      linkedVariables[variable.name] =
        typeof rawLinked === 'boolean' ? rawLinked : variable.linkedByDefault !== false;
    }

    const logoImageUrl = normalizeUrlValue(parsed && parsed.logoImageUrl);
    const backdropImageUrl = normalizeUrlValue(parsed && parsed.backdropImageUrl);
    const tileBackdropImage = !!(parsed && parsed.tileBackdropImage);

    return { linked, scale, overrides, linkedVariables, logoImageUrl, backdropImageUrl, tileBackdropImage };
  }

  function loadState() {
    const raw = readRawSettings();
    if (!raw) return normalizeState(DEFAULT_STATE);

    try {
      if (typeof raw === 'string') {
        return normalizeState(JSON.parse(raw));
      }
      return normalizeState(raw);
    } catch (error) {
      console.debug('PTP Widescreen Controls: parse settings failed', error);
      return normalizeState(DEFAULT_STATE);
    }
  }

  function saveState(state) {
    writeRawSettings(JSON.stringify(state));
  }

  let state = loadState();
  const previewListeners = new Set();
  let previewRefreshTimerId = 0;

  function isVariableLinked(currentState, variableName) {
    const variableLinked = currentState.linkedVariables && currentState.linkedVariables[variableName] !== false;
    return currentState.linked && variableLinked;
  }

  function computeFinalDimensions(currentState) {
    const scale = clampInt(currentState.scale, 50, 200, 100);
    const settings = {};
    const widths = {};
    const heights = {};

    for (const variable of SETTING_VARS) {
      const fallbackValue = clampSettingValue(variable.defaultValue, variable, variable.defaultValue);
      const overrideValue = clampSettingValue(currentState.overrides[variable.name], variable, fallbackValue);
      const linkedValue = scaleSettingValue(variable, scale);
      const resolvedValue = isVariableLinked(currentState, variable.name) ? linkedValue : overrideValue;

      settings[variable.name] = resolvedValue;
      if (WIDTH_VARS.includes(variable)) {
        widths[variable.name] = resolvedValue;
      }
    }

    for (const pair of HEIGHT_FROM_WIDTH) {
      const widthValue = widths[pair.widthVar];
      if (!Number.isFinite(widthValue) || pair.widthDefault <= 0) continue;

      const ratio = pair.heightDefault / pair.widthDefault;
      heights[pair.heightVar] = Math.max(1, Math.round(widthValue * ratio));
    }

    return { settings, widths, heights };
  }

  function emitPreviewUpdate(dimensions) {
    for (const listener of previewListeners) {
      try {
        listener(dimensions);
      } catch (error) {
        console.debug('PTP Widescreen Controls: preview update failed', error);
      }
    }
  }

  function registerPreviewListener(listener) {
    if (typeof listener !== 'function') return;
    previewListeners.add(listener);
    listener(computeFinalDimensions(state));
  }

  function schedulePreviewRefresh() {
    if (previewRefreshTimerId) {
      globalThis.clearTimeout(previewRefreshTimerId);
    }

    previewRefreshTimerId = globalThis.setTimeout(function () {
      previewRefreshTimerId = 0;
      emitPreviewUpdate(computeFinalDimensions(state));
    }, 0);
  }

  function getComputedSettingValue(variable, fallbackValue) {
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue(`--${variable.name}`).trim();
    const match = /^(-?\d+(?:\.\d+)?)/.exec(cssValue);
    if (!match) return fallbackValue;
    return clampSettingValue(match[1], variable, fallbackValue);
  }

  function parsePixelValue(value) {
    const numeric = Number.parseFloat(String(value || '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function getLayoutPreviewMetrics(dimensions) {
    const contentElement = document.querySelector('#content.page__main-content');
    const contentStyles = contentElement ? getComputedStyle(contentElement) : null;
    const rootStyles = getComputedStyle(document.documentElement);
    const sidebarGap = Number.isFinite(dimensions && dimensions.widths && dimensions.widths['sidebar-gap'])
      ? dimensions.widths['sidebar-gap']
      : parsePixelValue(rootStyles.getPropertyValue('--sidebar-gap'));
    const contentHorizontalInset = contentStyles
      ? parsePixelValue(contentStyles.paddingLeft) +
        parsePixelValue(contentStyles.paddingRight) +
        parsePixelValue(contentStyles.borderLeftWidth) +
        parsePixelValue(contentStyles.borderRightWidth)
      : 0;

    return {
      sidebarGap: Math.max(0, Math.round(sidebarGap)),
      contentHorizontalInset: Math.max(0, Math.round(contentHorizontalInset))
    };
  }

  function initDefaultsFromCss() {
    const overrides = { ...state.overrides };
    let changed = false;

    for (const variable of SETTING_VARS) {
      const valueFromCss = getComputedSettingValue(variable, variable.defaultValue);
      if (overrides[variable.name] === variable.defaultValue && valueFromCss !== variable.defaultValue) {
        overrides[variable.name] = clampSettingValue(valueFromCss, variable, variable.defaultValue);
        changed = true;
      }
    }

    if (changed) {
      state = { ...state, overrides };
      saveState(state);
    }
  }

  function applySettings(currentState) {
    const root = document.documentElement;
    const dimensions = computeFinalDimensions(currentState);

    for (const variable of SETTING_VARS) {
      root.style.setProperty(`--${variable.name}`, `${dimensions.settings[variable.name]}${variable.unit || 'px'}`);
    }

    for (const pair of HEIGHT_FROM_WIDTH) {
      const heightValue = dimensions.heights[pair.heightVar];
      if (!Number.isFinite(heightValue)) continue;
      root.style.setProperty(`--${pair.heightVar}`, `${heightValue}px`);
    }

    for (const binding of DIRECT_WIDTH_BINDINGS) {
      const widthValue = dimensions.widths[binding.variableName];
      if (!Number.isFinite(widthValue)) continue;

      const elements = document.querySelectorAll(binding.selector);
      for (const element of elements) {
        element.style.setProperty(binding.cssProperty, `${widthValue}px`, 'important');
        if (binding.cssProperty === 'width') {
          element.style.setProperty('max-width', 'none', 'important');
        }
      }
    }

    const logo = document.querySelector('.site-logo');
    setBackgroundImage(logo, currentState.logoImageUrl);
    if (logo) {
      if (normalizeUrlValue(currentState.logoImageUrl)) {
        logo.style.setProperty('background-position', 'center center');
        logo.style.setProperty('background-repeat', 'no-repeat');
        logo.style.setProperty('background-size', 'contain');
      } else {
        logo.style.removeProperty('background-position');
        logo.style.removeProperty('background-repeat');
        logo.style.removeProperty('background-size');
      }
    }

    const cleanBackdropUrl = normalizeUrlValue(currentState.backdropImageUrl);
    const backdropTargets = [document.documentElement, document.body];
    for (const backdropTarget of backdropTargets) {
      if (!backdropTarget) continue;

      setBackgroundImage(backdropTarget, cleanBackdropUrl);
      if (cleanBackdropUrl) {
        backdropTarget.style.setProperty('background-position', 'center top');
        backdropTarget.style.setProperty('background-repeat', currentState.tileBackdropImage ? 'repeat' : 'no-repeat');
        backdropTarget.style.setProperty('background-size', currentState.tileBackdropImage ? 'auto' : 'cover');
      } else {
        backdropTarget.style.removeProperty('background-position');
        backdropTarget.style.removeProperty('background-repeat');
        backdropTarget.style.removeProperty('background-size');
      }
    }

    if (document.body) {
      if (cleanBackdropUrl) {
        document.body.style.setProperty('background-color', 'transparent');
      } else {
        document.body.style.removeProperty('background-color');
      }
    }

    emitPreviewUpdate(dimensions);
  }

  function getStylesheetEditUrl() {
    const url = new URL(location.href);
    const userId = url.searchParams.get('userid');
    if (!userId) return null;

    const target = new URL('/user.php', location.origin);
    target.searchParams.set('action', 'edit_stylesheet');
    target.searchParams.set('userid', userId);
    target.hash = 'widescreen-controls';
    return target.toString();
  }

  function injectWidescreenTab() {
    const tabsList = document.querySelector('.tabs__bar__list');
    if (!tabsList) return null;

    const existing = tabsList.querySelector('.js-widescreen-tab');
    if (existing) {
      return {
        tabsList,
        item: existing,
        link: existing.querySelector('.tabs__bar__link')
      };
    }

    const targetUrl = getStylesheetEditUrl();
    if (!targetUrl) return null;

    const item = document.createElement('li');
    item.className = 'tabs__bar__item js-widescreen-tab';

    const link = document.createElement('a');
    link.className = 'tabs__bar__link';
    link.href = targetUrl;
    link.textContent = 'Widescreen';

    item.appendChild(link);
    tabsList.appendChild(item);

    return { tabsList, item, link };
  }

  function findStylesheetTabItem(tabsList) {
    if (!tabsList) return null;
    const links = tabsList.querySelectorAll('.tabs__bar__link');
    const currentUserId = new URL(location.href).searchParams.get('userid');

    for (const link of links) {
      if (link.closest('.js-widescreen-tab')) continue;
      let hrefUrl = null;
      try {
        hrefUrl = new URL(link.getAttribute('href') || '', location.origin);
      } catch (error) {
        console.debug('PTP Widescreen Controls: invalid tab href', error);
        continue;
      }

      if (hrefUrl.pathname !== '/user.php') continue;
      if (hrefUrl.searchParams.get('action') !== 'edit_stylesheet') continue;
      if (currentUserId && hrefUrl.searchParams.get('userid') !== currentUserId) continue;

      return link.closest('.tabs__bar__item');
    }

    return null;
  }

  function buildWidescreenPanel() {
    const panel = document.createElement('div');
    panel.className = 'tabs__panel js-widescreen-controls-tab-panel';

    const wrapper = document.createElement('div');
    wrapper.className = 'panel form--horizontal js-widescreen-controls-panel widescreen-controls';
    wrapper.id = 'widescreen-controls';

    const body = document.createElement('div');
    body.className = 'panel__body';

    const title = document.createElement('h2');
    title.textContent = 'Widescreen Controls';

    const description = document.createElement('p');
    description.className = 'widescreen-controls__description';
    description.textContent = 'Adjust widescreen width and font-size variables. Keep linked scaling enabled to scale all linked settings together.';

    const linkedRow = document.createElement('div');
    linkedRow.className = 'widescreen-controls__row widescreen-controls__row--linked';

    const linkedLabel = document.createElement('label');
    linkedLabel.className = 'widescreen-controls__label';
    linkedLabel.textContent = 'Scale Widths Together';

    const linkedToggle = document.createElement('input');
    linkedToggle.type = 'checkbox';
    linkedToggle.checked = !!state.linked;

    linkedRow.appendChild(linkedLabel);
    linkedRow.appendChild(linkedToggle);

    const scaleRow = document.createElement('div');
    scaleRow.className = 'widescreen-controls__row widescreen-controls__row--global';

    const scaleSpacer = document.createElement('span');
    scaleSpacer.className = 'widescreen-controls__row-spacer';
    scaleSpacer.setAttribute('aria-hidden', 'true');

    const scaleLabel = document.createElement('label');
    scaleLabel.className = 'widescreen-controls__label';
    scaleLabel.textContent = 'Global Scale';

    const scaleRange = document.createElement('input');
    scaleRange.className = 'widescreen-controls__range';
    scaleRange.type = 'range';
    scaleRange.min = '50';
    scaleRange.max = '200';
    scaleRange.step = '1';
    scaleRange.value = String(state.scale);

    const scaleNumber = document.createElement('input');
    scaleNumber.className = 'widescreen-controls__number';
    scaleNumber.type = 'number';
    scaleNumber.min = '50';
    scaleNumber.max = '200';
    scaleNumber.step = '1';
    scaleNumber.value = String(state.scale);

    const scaleUnit = document.createElement('span');
    scaleUnit.className = 'widescreen-controls__unit';
    scaleUnit.textContent = '%';

    scaleRow.appendChild(scaleSpacer);
    scaleRow.appendChild(scaleLabel);
    scaleRow.appendChild(scaleRange);
    scaleRow.appendChild(scaleNumber);
    scaleRow.appendChild(scaleUnit);

    const controlsList = document.createElement('div');
    controlsList.className = 'widescreen-controls__list';

    const controlsByName = {};
    for (const variable of SETTING_VARS) {
      controlsList.appendChild(makeRangeRow(variable, controlsByName));
    }

    const assetsList = document.createElement('div');
    assetsList.className = 'widescreen-controls__asset-list';

    const logoImageRow = makeTextSettingRow({
      label: 'Site Logo Image',
      value: state.logoImageUrl,
      placeholder: 'https://example.com/logo.png',
      onChange: function (value) {
        state.logoImageUrl = value;
        applySettings(state);
        saveState(state);
      }
    });

    const backdropImageRow = makeTextSettingRow({
      label: 'Page Backdrop Image',
      value: state.backdropImageUrl,
      placeholder: 'https://example.com/backdrop.jpg',
      onChange: function (value) {
        state.backdropImageUrl = value;
        applySettings(state);
        saveState(state);
      }
    });

    const tileBackdropRow = makeCheckboxSettingRow({
      label: 'Tile Backdrop Image',
      checked: state.tileBackdropImage,
      onChange: function (checked) {
        state.tileBackdropImage = checked;
        applySettings(state);
        saveState(state);
      }
    });

    assetsList.appendChild(logoImageRow.row);
    assetsList.appendChild(backdropImageRow.row);
    assetsList.appendChild(tileBackdropRow.row);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'widescreen-controls__actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset Defaults';

    const status = document.createElement('span');
    status.className = 'widescreen-controls__status';

    function flashStatus(message) {
      status.textContent = message;
      globalThis.clearTimeout(flashStatus.timerId);
      flashStatus.timerId = globalThis.setTimeout(function () {
        status.textContent = '';
      }, 2000);
    }

    function setScaleValue(rawValue) {
      const clean = clampInt(rawValue, 50, 200, 100);
      scaleRange.value = String(clean);
      scaleNumber.value = String(clean);
      state.scale = clean;
      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
    }

    linkedToggle.addEventListener('change', function () {
      state.linked = linkedToggle.checked;
      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
    });

    scaleRange.addEventListener('input', function () {
      setScaleValue(scaleRange.value);
    });

    scaleNumber.addEventListener('change', function () {
      setScaleValue(scaleNumber.value);
    });

    saveButton.addEventListener('click', function () {
      saveState(state);
      flashStatus('Saved');
    });

    resetButton.addEventListener('click', function () {
      state = normalizeState(DEFAULT_STATE);
      linkedToggle.checked = state.linked;
      scaleRange.value = String(state.scale);
      scaleNumber.value = String(state.scale);
      logoImageRow.input.value = state.logoImageUrl;
      backdropImageRow.input.value = state.backdropImageUrl;
      tileBackdropRow.input.checked = state.tileBackdropImage;
      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
      flashStatus('Defaults restored');
    });

    buttonRow.appendChild(saveButton);
    buttonRow.appendChild(resetButton);
    buttonRow.appendChild(status);

    function createPreviewPanel(titleText, subtitleText) {
      const previewPanel = document.createElement('div');
      previewPanel.className = 'panel widescreen-preview-panel';

      const preview = document.createElement('div');
      preview.className = 'panel__body widescreen-controls__preview';

      const previewTitle = document.createElement('h3');
      previewTitle.className = 'widescreen-controls__preview-title';
      previewTitle.textContent = titleText;

      const previewSubtitle = document.createElement('p');
      previewSubtitle.className = 'widescreen-controls__preview-subtitle';
      previewSubtitle.textContent = subtitleText;

      preview.appendChild(previewTitle);
      preview.appendChild(previewSubtitle);
      previewPanel.appendChild(preview);

      return { previewPanel, preview };
    }

    const torrentsPreviewPanel = createPreviewPanel(
      'Torrents Layout Preview',
      'Scaled mock of layout width, main column, BBCode area, and sidebar from a torrents page.'
    );

    const layoutFrame = document.createElement('div');
    layoutFrame.className = 'widescreen-controls__layout-frame';

    const wrapperHeading = document.createElement('h3');
    wrapperHeading.className = 'widescreen-controls__layout-block-title';
    wrapperHeading.textContent = 'Layout Width';

    const wrapperSize = document.createElement('p');
    wrapperSize.className = 'widescreen-controls__layout-block-size';

    torrentsPreviewPanel.preview.appendChild(wrapperHeading);
    torrentsPreviewPanel.preview.appendChild(wrapperSize);

    const mainColumn = document.createElement('div');
    mainColumn.className = 'main-column widescreen-controls__layout-main';

    const mainMeta = document.createElement('div');
    mainMeta.className = 'widescreen-controls__layout-main-meta';

    const mainHeading = document.createElement('div');
    mainHeading.className = 'widescreen-controls__layout-block-title';
    mainHeading.textContent = 'Main column';

    const mainSize = document.createElement('div');
    mainSize.className = 'widescreen-controls__layout-block-size';

    mainMeta.appendChild(mainHeading);
    mainMeta.appendChild(mainSize);

    const torrentTablePreview = document.createElement('table');
    torrentTablePreview.className =
      'widescreen-controls__layout-torrent-table table table--panel-like table--bordered movie-page__torrent-table';

    const torrentTableHead = document.createElement('thead');
    const torrentHeaderRow = document.createElement('tr');
    const torrentHeaderCells = [
      { text: 'Torrents (7)', width: '70%' },
      { text: 'Time' },
      { text: 'Size' },
      { text: 'Sn' },
      { text: 'Sd' },
      { text: 'Le' }
    ];
    torrentHeaderCells.forEach(function (cell) {
      const th = document.createElement('th');
      th.textContent = cell.text;
      if (cell.width) {
        th.style.width = cell.width;
      }
      torrentHeaderRow.appendChild(th);
    });
    torrentTableHead.appendChild(torrentHeaderRow);

    const torrentTableBody = document.createElement('tbody');
    const torrentEditionRow = document.createElement('tr');
    torrentEditionRow.className = 'group_torrent';

    const torrentEditionCell = document.createElement('td');
    torrentEditionCell.className = 'basic-movie-list__torrent-edition';
    torrentEditionCell.colSpan = 6;

    const editionMain = document.createElement('span');
    editionMain.className = 'basic-movie-list__torrent-edition__main';
    editionMain.textContent = 'Feature Film';

    const editionSub = document.createElement('span');
    editionSub.className = 'basic-movie-list__torrent-edition__sub';
    editionSub.textContent = 'High Definition';

    torrentEditionCell.appendChild(editionMain);
    torrentEditionCell.appendChild(document.createTextNode(' - '));
    torrentEditionCell.appendChild(editionSub);
    torrentEditionRow.appendChild(torrentEditionCell);

    const torrentDataRow = document.createElement('tr');
    torrentDataRow.className = 'group_torrent group_torrent_header basic-movie-list__torrent-row';

    const torrentMainCell = document.createElement('td');
    torrentMainCell.className = 'widescreen-controls__layout-torrent-cell--main';

    const torrentAction = document.createElement('span');
    torrentAction.className = 'basic-movie-list__torrent__action';
    torrentAction.textContent = '[DL | RP | PL]';

    const torrentApproved = document.createElement('span');
    torrentApproved.textContent = ' ☑ ';
    torrentApproved.style.color = '#c8d36a';

    torrentMainCell.appendChild(torrentAction);
    torrentMainCell.appendChild(torrentApproved);

    const torrentInfoLink = document.createElement('a');
    torrentInfoLink.href = '#';
    torrentInfoLink.className = 'torrent-info-link ptp-improved-tags';

    const torrentTokens = [
      { text: '720p', attr: '720p' },
      { text: 'WEB-DL (Movies Anywhere)', attr: 'WEB' },
      { text: 'Atmos', attr: 'Dolby Atmos', style: { color: 'rgb(25, 118, 210)' } },
      { text: 'x264', attr: 'x264' },
      { text: 'MKV', attr: 'MKV' },
      { text: 'BYNDR', attr: 'Release Group', style: { color: 'rgb(171, 71, 188)' } }
    ];

    torrentTokens.forEach(function (token, index) {
      const span = document.createElement('span');
      span.textContent = token.text;
      span.dataset.attr = token.attr;
      if (token.style) {
        for (const [propertyName, propertyValue] of Object.entries(token.style)) {
          span.style.setProperty(propertyName, propertyValue);
        }
      }
      torrentInfoLink.appendChild(span);

      if (index < torrentTokens.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'tag-separator';
        separator.textContent = ' / ';
        torrentInfoLink.appendChild(separator);
      }
    });

    torrentMainCell.appendChild(torrentInfoLink);

    const torrentTimeCell = document.createElement('td');
    torrentTimeCell.className = 'time-cell';
    torrentTimeCell.textContent = '8 days ago';

    const torrentSizeCell = document.createElement('td');
    torrentSizeCell.textContent = '6.52 GiB';

    const torrentSnatchesCell = document.createElement('td');
    torrentSnatchesCell.textContent = '213';

    const torrentSeedersCell = document.createElement('td');
    torrentSeedersCell.textContent = '192';

    const torrentLeechersCell = document.createElement('td');
    torrentLeechersCell.textContent = '9';

    torrentDataRow.appendChild(torrentMainCell);
    torrentDataRow.appendChild(torrentTimeCell);
    torrentDataRow.appendChild(torrentSizeCell);
    torrentDataRow.appendChild(torrentSnatchesCell);
    torrentDataRow.appendChild(torrentSeedersCell);
    torrentDataRow.appendChild(torrentLeechersCell);

    torrentTableBody.appendChild(torrentEditionRow);
    torrentTableBody.appendChild(torrentDataRow);
    torrentTablePreview.appendChild(torrentTableHead);
    torrentTablePreview.appendChild(torrentTableBody);

    const bbcodeWrap = document.createElement('div');
    bbcodeWrap.className = 'widescreen-controls__layout-bbcode-wrap';

    const bbcodeHeading = document.createElement('div');
    bbcodeHeading.className = 'widescreen-controls__layout-block-title';
    bbcodeHeading.textContent = 'BBCode';

    const bbcodeSize = document.createElement('div');
    bbcodeSize.className = 'widescreen-controls__layout-block-size';

    const bbcodeBox = document.createElement('div');
    bbcodeBox.className = 'widescreen-controls__layout-bbcode';

    bbcodeWrap.appendChild(bbcodeHeading);
    bbcodeWrap.appendChild(bbcodeSize);
    bbcodeWrap.appendChild(bbcodeBox);
    mainColumn.appendChild(mainMeta);
    mainColumn.appendChild(torrentTablePreview);
    mainColumn.appendChild(bbcodeWrap);

    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar widescreen-controls__layout-sidebar';

    const sidebarMeta = document.createElement('div');
    sidebarMeta.className = 'widescreen-controls__layout-sidebar-meta';

    const sidebarHeading = document.createElement('div');
    sidebarHeading.className = 'widescreen-controls__layout-block-title';
    sidebarHeading.textContent = 'Sidebar';

    const sidebarSize = document.createElement('div');
    sidebarSize.className = 'widescreen-controls__layout-block-size';

    sidebarMeta.appendChild(sidebarHeading);
    sidebarMeta.appendChild(sidebarSize);

    const coverPanel = document.createElement('div');
    coverPanel.className = 'box_albumart panel';

    const coverHeading = document.createElement('div');
    coverHeading.className = 'panel__heading';

    const coverHeadingTitle = document.createElement('span');
    coverHeadingTitle.className = 'panel__heading__title';
    coverHeadingTitle.textContent = 'Cover';

    coverHeading.appendChild(coverHeadingTitle);

    const coverBody = document.createElement('div');
    coverBody.className = 'panel__body';

    const coverImage = document.createElement('img');
    coverImage.className = 'sidebar-cover-image';
    coverImage.alt = 'Cover preview';
    coverImage.src = 'https://ptpimg.me/67h402.jpg';

    coverBody.appendChild(coverImage);
    coverPanel.appendChild(coverHeading);
    coverPanel.appendChild(coverBody);

    const movieInfoPanel = document.createElement('div');
    movieInfoPanel.className = 'panel';
    movieInfoPanel.id = 'movieinfo-preview';

    const movieInfoHeading = document.createElement('div');
    movieInfoHeading.className = 'panel__heading';

    const movieInfoHeadingTitle = document.createElement('span');
    movieInfoHeadingTitle.className = 'panel__heading__title';
    movieInfoHeadingTitle.textContent = 'Movie Info';

    movieInfoHeading.appendChild(movieInfoHeadingTitle);

    const movieInfoBody = document.createElement('div');
    movieInfoBody.className = 'panel__body';

    const movieInfoLines = [
      ['Directors:', 'James Cameron'],
      ['Writers:', 'Rick Jaffa, Amanda Silver, Josh Friedman'],
      ['Producers:', 'Richard Baneham, Maria Battle-Campbell'],
      ['Composers:', 'Simon Franglen'],
      ['Cinematographers:', 'Russell Carpenter'],
      ['Runtime:', '3h 17mn']
    ];

    movieInfoLines.forEach(function ([labelText, valueText]) {
      const line = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = labelText;
      line.appendChild(strong);
      line.appendChild(document.createTextNode(` ${valueText}`));
      movieInfoBody.appendChild(line);
    });

    movieInfoPanel.appendChild(movieInfoHeading);
    movieInfoPanel.appendChild(movieInfoBody);

    sidebar.appendChild(sidebarMeta);
    sidebar.appendChild(coverPanel);
    sidebar.appendChild(movieInfoPanel);

    layoutFrame.appendChild(sidebar);
    layoutFrame.appendChild(mainColumn);
    torrentsPreviewPanel.previewPanel.appendChild(layoutFrame);

    function updateLayoutPreview(dimensions) {
      const wrapperWidth = dimensions.widths['layout-width'];
      const sidebarWidth = dimensions.widths['sidebar-width'];
      const bbcodeWidth = dimensions.widths['bbcode-image-default-width'];
      if (!Number.isFinite(wrapperWidth) || !Number.isFinite(sidebarWidth) || !Number.isFinite(bbcodeWidth)) return;

      const previewMetrics = getLayoutPreviewMetrics(dimensions);
      const contentInnerWidth = Math.max(0, wrapperWidth - previewMetrics.contentHorizontalInset);
      const mainColumnWidth = Math.max(0, contentInnerWidth - sidebarWidth - previewMetrics.sidebarGap);
      const clampedBbcodeWidth = Math.min(bbcodeWidth, mainColumnWidth);

      const availableWidth = Math.max(80, layoutFrame.clientWidth - 24);
      const fitScale = Math.min(1, availableWidth / Math.max(wrapperWidth, 1));
      const scaledWrapperWidth = Math.max(40, Math.round(wrapperWidth * fitScale));
      const scaledContentWidth = Math.max(24, Math.round(contentInnerWidth * fitScale));
      const scaledSidebarWidth = Math.max(20, Math.round(sidebarWidth * fitScale));
        const scaledGapWidth = Math.max(
          previewMetrics.sidebarGap > 0 ? 4 : 0,
          Math.round(previewMetrics.sidebarGap * fitScale)
        );
        layoutFrame.style.setProperty('--preview-sidebar-width', `${scaledSidebarWidth}px`);
        layoutFrame.style.setProperty('--preview-sidebar-gap', `${scaledGapWidth}px`);

        wrapperSize.textContent = `Layout Width: ${wrapperWidth}px`;
      mainSize.textContent = `Main column: ${mainColumnWidth}px`;
      bbcodeSize.textContent = `BBCode: ${clampedBbcodeWidth}px`;
      sidebarSize.textContent = `Sidebar: ${sidebarWidth}px`;
    }

    const coverPreviewPanel = createPreviewPanel(
      'View Mode Poster Preview',
      'Live size preview grouped by the site view mode selector (Cover, Small cover, Huge, List, Compact list).'
    );

    const previewGrid = document.createElement('div');
    previewGrid.className = 'widescreen-controls__preview-grid';

    const previewRows = PREVIEW_ROW_GROUPS.map(function (group) {
      const row = document.createElement('div');
      row.className = 'widescreen-controls__preview-row';
      row.style.setProperty('--preview-row-columns', String(group.length));
      previewGrid.appendChild(row);
      return { group, row };
    });

    const previewItems = [];

    for (const pair of HEIGHT_FROM_WIDTH) {
      const item = document.createElement('div');
      item.className = 'widescreen-controls__preview-item';

      const label = document.createElement('div');
      label.className = 'widescreen-controls__preview-label';
      label.textContent = PREVIEW_LABELS[pair.widthVar] || pair.widthVar.replace(/-width$/, '').replaceAll('-', ' ');

      const frame = document.createElement('div');
      frame.className = 'widescreen-controls__preview-frame';

      const box = document.createElement('div');
      box.className = 'widescreen-controls__preview-box';

      const sizeText = document.createElement('div');
      sizeText.className = 'widescreen-controls__preview-size';

      frame.appendChild(box);
      item.appendChild(label);
      item.appendChild(frame);
      item.appendChild(sizeText);

      const targetRow = previewRows.find(function (row) {
        return row.group.includes(pair.widthVar);
      });

      (targetRow ? targetRow.row : previewGrid).appendChild(item);

      previewItems.push({ pair, frame, box, sizeText });
    }

    function updateCoverPreview(dimensions) {
      if (previewItems.length === 0) return;

      for (const previewItem of previewItems) {
        const widthValue = dimensions.widths[previewItem.pair.widthVar];
        const heightValue = dimensions.heights[previewItem.pair.heightVar];
        if (!Number.isFinite(widthValue) || !Number.isFinite(heightValue)) continue;

        const availableWidth = Math.max(24, previewItem.frame.clientWidth - 12);
        const fitScale = Math.min(1, (availableWidth / widthValue) * 0.95);
        const previewWidth = Math.max(10, Math.round(widthValue * fitScale));
        const previewHeight = Math.max(10, Math.round(heightValue * fitScale));

        previewItem.box.style.width = `${previewWidth}px`;
        previewItem.box.style.height = `${previewHeight}px`;
        previewItem.sizeText.textContent = `${widthValue}px x ${heightValue}px`;
      }
    }

    registerPreviewListener(updateLayoutPreview);
    registerPreviewListener(updateCoverPreview);
    globalThis.addEventListener('resize', function () {
      const dimensions = computeFinalDimensions(state);
      updateLayoutPreview(dimensions);
      updateCoverPreview(dimensions);
    });

    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(linkedRow);
    body.appendChild(scaleRow);
    body.appendChild(controlsList);
    body.appendChild(assetsList);
    body.appendChild(buttonRow);
    coverPreviewPanel.preview.appendChild(previewGrid);
    wrapper.appendChild(body);
    panel.appendChild(wrapper);
    panel.appendChild(torrentsPreviewPanel.previewPanel);
    panel.appendChild(coverPreviewPanel.previewPanel);

    refreshIndividualControls(controlsByName, state);
    schedulePreviewRefresh();

    return panel;
  }

  function setupWidescreenTabPanel(widescreenTab) {
    const tabsPanels = document.querySelector('.tabs__panels');
    if (!tabsPanels || !widescreenTab) return;
    const contentRoot = document.querySelector('#content.page__main-content');

    const stylesheetPanel = tabsPanels.querySelector('.tabs__panel.tabs__panel--active') || tabsPanels.querySelector('.tabs__panel');
    if (!stylesheetPanel) return;

    const stylesheetTabItem = findStylesheetTabItem(widescreenTab.tabsList);
    if (!stylesheetTabItem) return;

    let widescreenPanel = tabsPanels.querySelector('.js-widescreen-controls-tab-panel');
    if (!widescreenPanel) {
      widescreenPanel = buildWidescreenPanel();
      tabsPanels.appendChild(widescreenPanel);
    }

    function setMode(mode, updateHash) {
      const isWide = mode === 'widescreen';

      stylesheetTabItem.classList.toggle('tabs__bar__item--active', !isWide);
      widescreenTab.item.classList.toggle('tabs__bar__item--active', isWide);

      stylesheetPanel.classList.toggle('tabs__panel--active', !isWide);
      widescreenPanel.classList.toggle('tabs__panel--active', isWide);

      if (contentRoot) {
        contentRoot.classList.toggle('js-widescreen-controls-active', isWide);
      }
      if (document.body) {
        document.body.classList.toggle('js-widescreen-controls-active', isWide);
      }
      document.documentElement.classList.toggle('js-widescreen-controls-active', isWide);

      if (isWide) {
        schedulePreviewRefresh();
      }

      if (updateHash) {
        const newUrl = new URL(location.href);
        newUrl.hash = isWide ? 'widescreen-controls' : '';
        history.replaceState(null, '', newUrl.toString());
      }
    }

    widescreenTab.link.addEventListener('click', function (event) {
      event.preventDefault();
      setMode('widescreen', true);
    });

    const stylesheetLink = stylesheetTabItem.querySelector('.tabs__bar__link');
    if (stylesheetLink) {
      stylesheetLink.addEventListener('click', function (event) {
        event.preventDefault();
        setMode('stylesheet', true);
      });
    }

    globalThis.addEventListener('hashchange', function () {
      if (location.hash === '#widescreen-controls') {
        setMode('widescreen', false);
      } else {
        setMode('stylesheet', false);
      }
    });

    if (location.hash === '#widescreen-controls') {
      setMode('widescreen', false);
    } else {
      setMode('stylesheet', false);
    }
  }

  function makeRangeRow(variable, controlsByName) {
    const row = document.createElement('div');
    row.className = 'widescreen-controls__row';

    const rowLinkToggle = document.createElement('input');
    rowLinkToggle.className = 'widescreen-controls__row-link-toggle';
    rowLinkToggle.type = 'checkbox';
    rowLinkToggle.checked = state.linkedVariables[variable.name] !== false;
    rowLinkToggle.title = 'Use global scale for this setting';

    const label = document.createElement('label');
    label.className = 'widescreen-controls__label';
    label.textContent = variable.label;

    const range = document.createElement('input');
    range.className = 'widescreen-controls__range';
    range.type = 'range';
    range.min = String(variable.min);
    range.max = String(variable.max);
    range.step = String(variable.step || 1);
    range.value = formatSettingValue(state.overrides[variable.name], variable);

    const number = document.createElement('input');
    number.className = 'widescreen-controls__number';
    number.type = 'number';
    number.min = String(variable.min);
    number.max = String(variable.max);
    number.step = String(variable.step || 1);
    number.value = formatSettingValue(state.overrides[variable.name], variable);

    const unit = document.createElement('span');
    unit.className = 'widescreen-controls__unit';
    unit.textContent = variable.unit || 'px';

    function updateValue(rawValue) {
      const clean = clampSettingValue(rawValue, variable, variable.defaultValue);
      const formatted = formatSettingValue(clean, variable);
      range.value = formatted;
      number.value = formatted;
      state.overrides[variable.name] = clean;
      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
    }

    rowLinkToggle.addEventListener('change', function () {
      const dimensions = computeFinalDimensions(state);

      if (!state.linkedVariables) {
        state.linkedVariables = {};
      }

      state.linkedVariables[variable.name] = rowLinkToggle.checked;

      // Preserve the current visual value when detaching from global scaling.
      if (!rowLinkToggle.checked) {
        const currentValue = dimensions.settings[variable.name];
        state.overrides[variable.name] = clampSettingValue(currentValue, variable, variable.defaultValue);
      }

      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
    });

    range.addEventListener('input', function () {
      updateValue(range.value);
    });

    number.addEventListener('change', function () {
      updateValue(number.value);
    });

    row.appendChild(rowLinkToggle);
    row.appendChild(label);
    row.appendChild(range);
    row.appendChild(number);
    row.appendChild(unit);

    controlsByName[variable.name] = { row, rowLinkToggle, range, number, variable };
    return row;
  }

  function makeTextSettingRow(options) {
    const row = document.createElement('div');
    row.className = 'widescreen-controls__row widescreen-controls__row--text';

    const spacer = document.createElement('span');
    spacer.className = 'widescreen-controls__row-spacer';
    spacer.setAttribute('aria-hidden', 'true');

    const label = document.createElement('label');
    label.className = 'widescreen-controls__label';
    label.textContent = options.label;

    const input = document.createElement('input');
    input.className = 'widescreen-controls__text';
    input.type = 'url';
    input.placeholder = options.placeholder || '';
    input.value = options.value || '';

    function updateValue(rawValue) {
      const clean = normalizeUrlValue(rawValue);
      input.value = clean;
      options.onChange(clean);
    }

    input.addEventListener('input', function () {
      options.onChange(normalizeUrlValue(input.value));
    });

    input.addEventListener('change', function () {
      updateValue(input.value);
    });

    row.appendChild(spacer);
    row.appendChild(label);
    row.appendChild(input);

    return { row, input };
  }

  function makeCheckboxSettingRow(options) {
    const row = document.createElement('div');
    row.className = 'widescreen-controls__row widescreen-controls__row--toggle';

    const spacer = document.createElement('span');
    spacer.className = 'widescreen-controls__row-spacer';
    spacer.setAttribute('aria-hidden', 'true');

    const label = document.createElement('label');
    label.className = 'widescreen-controls__label';
    label.textContent = options.label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!options.checked;

    input.addEventListener('change', function () {
      options.onChange(input.checked);
    });

    row.appendChild(spacer);
    row.appendChild(label);
    row.appendChild(input);

    return { row, input };
  }

  function refreshIndividualControls(controlsByName, currentState) {
    const dimensions = computeFinalDimensions(currentState);

    for (const variable of SETTING_VARS) {
      const controls = controlsByName[variable.name];
      if (!controls) continue;

      const linkedForVariable = currentState.linkedVariables && currentState.linkedVariables[variable.name] !== false;
      const usingGlobal = isVariableLinked(currentState, variable.name);
      const value = clampSettingValue(dimensions.settings[variable.name], variable, variable.defaultValue);
      const formatted = formatSettingValue(value, variable);

      controls.range.value = formatted;
      controls.number.value = formatted;

      controls.rowLinkToggle.checked = linkedForVariable;
      controls.rowLinkToggle.disabled = !currentState.linked;

      controls.range.disabled = usingGlobal;
      controls.number.disabled = usingGlobal;

      controls.row.classList.toggle('widescreen-controls__row--detached', !usingGlobal);
    }
  }


  function isUserEditPage() {
    const url = new URL(location.href);
    if (url.pathname !== '/user.php') return false;
    const action = url.searchParams.get('action') || '';
    return action.startsWith('edit') && url.searchParams.has('userid');
  }

  function isStylesheetEditPage() {
    const url = new URL(location.href);
    return url.pathname === '/user.php' && url.searchParams.get('action') === 'edit_stylesheet' && url.searchParams.has('userid');
  }

  function onReady() {
    initDefaultsFromCss();
    applySettings(state);

    if (!isUserEditPage()) return;

    ensureControlsStyles();

    const widescreenTab = injectWidescreenTab();

    if (isStylesheetEditPage()) {
      setupWidescreenTabPanel(widescreenTab);
    }
  }

  applySettings(state);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();
