// ==UserScript==
// @name         PTP Widescreen Profile Controls
// @namespace    https://passthepopcorn.me/
// @version      1.0.1
// @description  Add a Widescreen tab to profile edit pages and control widescreen.css width variables.
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @updateURL    https://github.com/Audionut/add-trackers/raw/refs/heads/main/ptp-widescreen-profile-controls.user.js
// @downloadURL  https://github.com/Audionut/add-trackers/raw/refs/heads/main/ptp-widescreen-profile-controls.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SETTINGS_KEY = 'ptp_widescreen_profile_controls_v1';
  const SCRIPT_VERSION = '1.0.1';
  const TORRENTS_VIEW_MODE_KEY = 'ptp_widescreen_torrents_view_mode_v1';
  const TOP10_VIEW_MODE_KEY = 'ptp_widescreen_top10_view_mode_v1';
  const TORRENTS_SMALL_COVER_VIEW_MODE = 'SmallCover';
  const TOP10_SMALL_COVER_VIEW_INPUT_CLASS = 'widescreen-top10-view-settings-input';
  const CONTROLS_STYLE_ID = 'ptp-widescreen-profile-controls-style-v1';
  const DEFAULT_STATE = {
    linked: true,
    scale: 100,
    overrides: {},
    linkedVariables: {},
    logoImageUrl: '',
    backdropImageUrl: '',
    tileBackdropImage: false,
    useOriginalSidebarCoverPath: false
  };

  const WIDTH_VARS = [
    { name: 'layout-width', label: 'Layout Width', defaultValue: 2000, min: 1200, max: 3200 },
    { name: 'main-menu-width', label: 'Main Menu Width', defaultValue: 1500, min: 900, max: 2600 },
    { name: 'sidebar-width', label: 'Sidebar Width', defaultValue: 450, min: 260, max: 800 },
    { name: 'sidebar-gap', label: 'Sidebar Gap', defaultValue: 5, min: 0, max: 40 },
    { name: 'bbcode-image-default-width', label: 'BBCode Image Width', defaultValue: 1450, min: 800, max: 2800 },
    { name: 'search-bar-field-width', label: 'Search Field Width', defaultValue: 180, min: 120, max: 420 },
    { name: 'cover-movie-width', label: 'Cover View Poster Width', defaultValue: 372, min: 100, max: 720 },
    { name: 'cover-movie-narrow-width', label: 'Cover View Narrow Poster Width', defaultValue: 168, min: 96, max: 340 },
    { name: 'cover-movie-index-width', label: 'Cover View Index Poster Width', defaultValue: 370, min: 200, max: 620 },
    { name: 'cover-movie-index-narrow-width', label: 'Cover View Index Narrow Poster Width', defaultValue: 350, min: 190, max: 600 },
    { name: 'cover-movie-centered-width', label: 'Cover View Centered Poster Width', defaultValue: 330, min: 180, max: 560 },
    { name: 'basic-movie-cover-width', label: 'List/Compact View Poster Width', defaultValue: 250, min: 140, max: 480 },
    { name: 'small-cover-movie-width', label: 'Bookmarks Small Cover Poster Width', defaultValue: 140, min: 80, max: 260 },
    { name: 'torrents-small-cover-movie-width', label: 'Torrents Small Cover Poster Width', defaultValue: 184, min: 80, max: 320 },
    { name: 'top10-small-cover-movie-width', label: 'Top10 Small Cover Poster Width', defaultValue: 184, min: 80, max: 320 },
    { name: 'bookmarks-huge-movie-width', label: 'Bookmarks Huge Movie Width', defaultValue: 280, min: 160, max: 520 },
    { name: 'top10-huge-movie-width', label: 'Top10 Huge Movie Width', defaultValue: 256, min: 140, max: 480 },
    { name: 'torrents-huge-movie-width', label: 'Torrents Huge Movie Width', defaultValue: 256, min: 140, max: 480 }
  ];

  const HEIGHT_VARS = [
    { name: 'cover-movie-height', label: 'Cover View Poster Height', defaultValue: 575, min: 140, max: 1000 },
    { name: 'cover-movie-index-height', label: 'Cover View Index Poster Height', defaultValue: 580, min: 240, max: 1000 },
    { name: 'basic-movie-cover-height', label: 'List/Compact View Poster Height', defaultValue: 386, min: 160, max: 900 },
    { name: 'small-cover-movie-height', label: 'Bookmarks Small Cover Poster Height', defaultValue: 196, min: 112, max: 420 },
    { name: 'torrents-small-cover-movie-height', label: 'Torrents Small Cover Poster Height', defaultValue: 279, min: 112, max: 520 },
    { name: 'top10-small-cover-movie-height', label: 'Top10 Small Cover Poster Height', defaultValue: 279, min: 112, max: 520 },
    { name: 'top10-huge-movie-height', label: 'Top10 Huge Movie Height', defaultValue: 379, min: 220, max: 1000 },
    { name: 'torrents-huge-movie-height', label: 'Torrents Huge Movie Height', defaultValue: 379, min: 220, max: 1000 }
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
    },
    {
      name: 'page-title-font-size',
      label: 'Page Title Font Size',
      defaultValue: 2,
      min: 1,
      max: 4,
      step: 0.1,
      precision: 1,
      unit: 'em',
      linkedByDefault: false
    },
    {
      name: 'linkbox-font-size',
      label: 'Linkbox Font Size',
      defaultValue: 1,
      min: 0.7,
      max: 2,
      step: 0.1,
      precision: 1,
      unit: 'em',
      linkedByDefault: false
    }
  ];

  const SETTING_VARS = [...WIDTH_VARS, ...HEIGHT_VARS, ...FONT_SIZE_VARS];

  const HEIGHT_FROM_WIDTH = [
    {
      widthVar: 'cover-movie-width',
      widthDefault: 372,
      heightVar: 'cover-movie-height',
      heightDefault: 575
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
      widthVar: 'basic-movie-cover-width',
      widthDefault: 250,
      heightVar: 'basic-movie-cover-height',
      heightDefault: 386
    },
    {
      widthVar: 'small-cover-movie-width',
      widthDefault: 140,
      heightVar: 'small-cover-movie-height',
      heightDefault: 196
    },
    {
      widthVar: 'torrents-small-cover-movie-width',
      widthDefault: 184,
      heightVar: 'torrents-small-cover-movie-height',
      heightDefault: 279
    },
    {
      widthVar: 'top10-small-cover-movie-width',
      widthDefault: 184,
      heightVar: 'top10-small-cover-movie-height',
      heightDefault: 279
    },
    {
      widthVar: 'bookmarks-huge-movie-width',
      widthDefault: 280,
      heightVar: 'bookmarks-huge-movie-height',
      heightDefault: 440
    },
    {
      widthVar: 'top10-huge-movie-width',
      widthDefault: 256,
      heightVar: 'top10-huge-movie-height',
      heightDefault: 379
    },
    {
      widthVar: 'torrents-huge-movie-width',
      widthDefault: 256,
      heightVar: 'torrents-huge-movie-height',
      heightDefault: 379
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
      'torrents-small-cover-movie-width',
      'top10-small-cover-movie-width',
      'bookmarks-huge-movie-width'
    ],
    [
      'top10-huge-movie-width'
    ]
  ];

  const PREVIEW_LABELS = {
    'cover-movie-width': 'Cover view poster',
    'cover-movie-narrow-width': 'Cover view narrow poster',
    'cover-movie-index-width': 'Cover view index poster',
    'cover-movie-index-narrow-width': 'Cover view index narrow poster',
    'cover-movie-centered-width': 'Cover view centered poster',
    'small-cover-movie-width': 'Bookmarks small cover poster',
    'torrents-small-cover-movie-width': 'Torrents small cover poster',
    'top10-small-cover-movie-width': 'Top10 small cover poster',
    'bookmarks-huge-movie-width': 'Bookmarks huge movie poster',
    'top10-huge-movie-width': 'Top10 huge view poster',
    'torrents-huge-movie-width': 'Torrents huge view poster'
  };

  const TORRENTS_LAYOUT_PREVIEW_VARIABLE_NAMES = new Set([
    'sidebar-width',
    'sidebar-gap',
    'bbcode-image-default-width',
    'torrent-row-font-size',
    'page-title-font-size',
    'linkbox-font-size'
  ]);

  const TORRENTS_PHP_HUGE_PREVIEW_VARIABLE_NAMES = new Set([
    'torrents-huge-movie-width',
    'torrents-huge-movie-height'
  ]);
  const TORRENTS_PHP_LIST_PREVIEW_VARIABLE_NAMES = new Set([
    'basic-movie-cover-width',
    'basic-movie-cover-height',
    'torrent-row-font-size'
  ]);
  const TORRENTS_PHP_SMALL_COVER_PREVIEW_VARIABLE_NAMES = new Set([
    'torrents-small-cover-movie-width',
    'torrents-small-cover-movie-height'
  ]);
  const TORRENTS_PHP_PREVIEW_VARIABLE_NAMES = new Set([
    ...TORRENTS_PHP_HUGE_PREVIEW_VARIABLE_NAMES,
    ...TORRENTS_PHP_LIST_PREVIEW_VARIABLE_NAMES,
    ...TORRENTS_PHP_SMALL_COVER_PREVIEW_VARIABLE_NAMES
  ]);
  const COVER_VIEW_PREVIEW_VARIABLE_NAMES = new Set([
    'cover-movie-width',
    'cover-movie-height'
  ]);
  const TOP10_COVER_PREVIEW_VARIABLE_NAMES = new Set([
    'cover-movie-index-width',
    'cover-movie-index-height'
  ]);
  const TOP10_SMALL_COVER_PREVIEW_VARIABLE_NAMES = new Set([
    'top10-small-cover-movie-width',
    'top10-small-cover-movie-height'
  ]);
  const TOP10_LIST_PREVIEW_VARIABLE_NAMES = new Set([
    'basic-movie-cover-width',
    'basic-movie-cover-height',
    'torrent-row-font-size'
  ]);
  const TOP10_HUGE_PREVIEW_VARIABLE_NAMES = new Set([
    'top10-huge-movie-width',
    'top10-huge-movie-height'
  ]);
  const TOP10_PREVIEW_VARIABLE_NAMES = new Set([
    ...TOP10_COVER_PREVIEW_VARIABLE_NAMES,
    ...TOP10_SMALL_COVER_PREVIEW_VARIABLE_NAMES,
    ...TOP10_LIST_PREVIEW_VARIABLE_NAMES,
    ...TOP10_HUGE_PREVIEW_VARIABLE_NAMES
  ]);

  const HUGE_PREVIEW_COVER = {
    url: 'https://passthepopcorn.me/i/dcZDaynM5Hy.jpg',
    width: 608,
    height: 900
  };

  const LAYOUT_PREVIEW_COVER_URL = 'https://passthepopcorn.me/i/fqrm5ZKADdX.jpg';

  const HUGE_COVER_CONTAIN_CLASS = 'huge-movie-list__movie__cover__link--fit-inside';
  const hugeCoverFitCache = new Map();
  let hugeCoverFitObserver = null;
  let hugeCoverFitRefreshTimerId = 0;
  let sidebarCoverPathObserver = null;
  let torrentsSmallCoverViewObserver = null;
  let torrentsSmallCoverViewInitialized = false;
  let torrentsSmallCoverViewRenderTimerId = 0;
  let torrentsSmallCoverViewRendering = false;
  let top10SmallCoverViewInitialized = false;
  let top10SmallCoverViewRendering = false;
  let top10SmallCoverViewSyncTimerId = 0;
  let top10CoverImagePlaceholderObserver = null;

  if (new URL(location.href).pathname === '/top10.php') {
    document.documentElement.classList.add('widescreen-top10-page');
    setupTop10CoverImagePlaceholderBypass();
  }

  function isPreviewOptionVariable(variableName) {
    return (
      TORRENTS_LAYOUT_PREVIEW_VARIABLE_NAMES.has(variableName) ||
      TORRENTS_PHP_PREVIEW_VARIABLE_NAMES.has(variableName) ||
      COVER_VIEW_PREVIEW_VARIABLE_NAMES.has(variableName) ||
      TOP10_PREVIEW_VARIABLE_NAMES.has(variableName)
    );
  }

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
.tabs__panel.js-widescreen-controls-tab-panel,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel {
  width: var(--widescreen-preview-content-width, var(--layout-width));
  min-width: var(--widescreen-preview-content-width, var(--layout-width));
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

.widescreen-controls__preview-options-panel {
  width: 1040px;
  min-width: 1040px;
  margin: 10px auto 14px;
}

.widescreen-controls__preview-options-panel[hidden] {
  display: none !important;
}

.widescreen-controls__preview-options-title {
  margin: 0 0 10px;
}

.widescreen-controls__preview-options-description {
  margin: 0 0 12px;
  color: #b8b8b8;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-preview-panel {
  margin-bottom: 14px;
}

.js-widescreen-controls-panel .widescreen-controls__description {
  margin: 4px 0 12px;
  color: #b8b8b8;
}

.js-widescreen-controls-panel .widescreen-controls__version-status {
  border: 1px solid #3a3c3f;
  border-radius: 4px;
  margin: 0 0 12px;
  padding: 8px 10px;
}

.js-widescreen-controls-panel .widescreen-controls__version-status--ok {
  color: #bde7bd;
}

.js-widescreen-controls-panel .widescreen-controls__version-status--warning {
  color: #ffd27d;
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

.js-widescreen-controls-panel .widescreen-controls__row[hidden] {
  display: none !important;
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

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-tabs {
  margin-top: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-tabs-panel {
  margin-top: 14px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-tab-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-tab {
  border: 1px solid #4a4d50;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(34, 36, 38, 0.95), rgba(18, 19, 20, 0.95));
  color: #d7d7d7;
  font-size: 12px;
  line-height: 1.2;
  padding: 7px 12px;
  cursor: pointer;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-tab:hover {
  border-color: #6c7277;
  color: #f0f0f0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-tab--active {
  border-color: #83b6c8;
  color: #f4fbff;
  box-shadow: inset 0 0 0 1px rgba(131, 182, 200, 0.18);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__nested-layout {
  margin-top: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__nested-layout-tabs {
  border-bottom: 1px solid #383b3e;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__nested-layout-panel {
  width: 100%;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__nested-layout-panel[hidden] {
  display: none !important;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-row {
  display: grid;
  grid-template-columns: repeat(var(--preview-row-columns, 1), minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 1300px) {
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-row {
    grid-template-columns: 1fr;
  }
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-item {
  border: 1px solid #3a3c3f;
  border-radius: 6px;
  background: #1b1b1b;
  padding: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-label {
  color: #d9d9d9;
  font-size: 12px;
  text-transform: capitalize;
  margin-bottom: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-frame {
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

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-box {
  display: block;
  flex: 0 0 auto;
  border: 1px solid #83b6c8;
  background: linear-gradient(140deg, rgba(58, 84, 100, 0.55), rgba(39, 59, 74, 0.55));
  box-shadow: inset 0 0 0 1px rgba(173, 218, 238, 0.2);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-size {
  margin-top: 7px;
  color: #afafaf;
  font-size: 11px;
  text-align: center;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-preview {
  margin-top: 10px;
  overflow-x: auto;
  overflow-y: visible;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__container--centered {
  margin-left: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-preview .cover-movie-list {
  display: inline-block;
  width: calc(5 * (var(--cover-movie-width) + 20px));
  margin: 0 0 -10px -20px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-preview .cover-movie-list__movie {
  position: relative;
  float: left;
  width: var(--cover-movie-width);
  margin: 0 0 10px 20px;
  text-align: left;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__cover-link {
  display: block;
  height: var(--cover-movie-height);
  width: var(--cover-movie-width);
  background-color: #111111;
  background-position: center center !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__cover-link.widescreen-controls__cover-view-cover--cropped {
  outline: 2px solid #d8a85f;
  outline-offset: -2px;
  box-shadow: inset 0 0 0 2px rgba(216, 168, 95, 0.5);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__undercover {
  padding: 3px;
  background-image: linear-gradient(to bottom, #222222 0%, #050505 100%);
  border-radius: 0px 0px 6px 6px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__title {
  font-weight: bold;
  color: white;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__new {
  font-size: 10px;
  font-weight: bold;
  opacity: 0.4;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__rating-and-tags {
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list__movie__rating {
  background-color: #4d4d4d;
  padding: 1px 4px;
  margin-right: 4px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-preview
  .cover-movie-list::after {
  content: '';
  display: block;
  clear: both;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__small-cover-preview {
  margin-top: 10px;
  overflow-x: auto;
  overflow-y: visible;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__small-cover-preview
  .small-cover-movie-list__container {
  display: grid;
  grid-template-columns: repeat(10, var(--torrents-small-cover-movie-width));
  justify-content: center;
  gap: 12px;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__small-cover-preview
  .small-cover-movie-list__movie {
  float: none;
  position: relative;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__small-cover-preview
  .small-cover-movie-list__movie__link {
  background-color: #111111;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
  display: block;
  height: var(--torrents-small-cover-movie-height);
  width: var(--torrents-small-cover-movie-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__small-cover-preview
  .small-cover-movie-list__movie__link--seen::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  background-image: url('https://passthepopcorn.me/static/common/symbols/seen-overlay.png');
  background-size: cover;
  width: 32px;
  height: 32px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__top10-preview {
  margin-top: 10px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: visible;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__top10-preview h2 {
  color: #f0f0f0;
  font-size: 18px;
  margin: 0 0 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__top10-preview h2 small {
  color: #afafaf;
  font-size: 12px;
  font-weight: normal;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-cover-view-index-store {
  width: 100%;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .cover-movie-list__container,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-small-cover-movie-list__container,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-huge_view_container {
  margin-top: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .cover-movie-list {
  display: grid;
  grid-template-columns: repeat(5, var(--cover-movie-index-width));
  justify-content: center;
  gap: 12px 16px;
  margin: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .cover-movie-list__movie {
  float: none;
  margin: 0;
  width: var(--cover-movie-index-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .cover-movie-list__movie__cover-link {
  background-color: #111111;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
  display: block;
  height: var(--cover-movie-index-height);
  width: var(--cover-movie-index-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-small-cover-movie-list__container {
  display: grid;
  grid-template-columns: repeat(10, var(--top10-small-cover-movie-width));
  justify-content: center;
  gap: 12px;
  max-width: 100%;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-small-cover-movie-list__container[hidden],
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-small-cover-movie-list__container.hidden,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-huge_view_container[hidden],
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-huge_view_container.hidden,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-basic-movie-list[hidden],
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .js-basic-movie-list.hidden,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .widescreen-controls__cover-view-fit[hidden],
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .widescreen-controls__cover-view-fit.hidden {
  display: none;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .small-cover-movie-list__movie {
  float: none;
  position: relative;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .small-cover-movie-list__movie__link {
  background-color: #111111;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
  display: block;
  height: var(--top10-small-cover-movie-height);
  width: var(--top10-small-cover-movie-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .basic-movie-list__movie__cover {
  background-color: #111111;
  display: block;
  height: var(--basic-movie-cover-height);
  object-fit: contain;
  object-position: center center;
  width: var(--basic-movie-cover-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .basic-movie-list__torrent-row {
  font-size: var(--torrent-row-font-size);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .huge-movie-list__movie {
  background-color: #222222;
  border: var(--torrents-huge-movie-border-width, 8px) solid #222222;
  box-sizing: border-box;
  height: auto !important;
  min-height: calc(var(--top10-huge-movie-height) + (var(--torrents-huge-movie-border-width, 8px) * 2)) !important;
  overflow: visible;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .huge-movie-list__movie::after {
  content: '';
  clear: both;
  display: block;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .huge-movie-list__movie__cover {
  float: left;
  min-height: var(--top10-huge-movie-height);
  width: var(--top10-huge-movie-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__top10-preview
  .huge-movie-list__movie__cover__link {
  background-color: #111111;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
  display: block;
  height: var(--top10-huge-movie-height);
  width: var(--top10-huge-movie-width);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-fit {
  border: 1px solid #3a3c3f;
  border-radius: 6px;
  background: #1b1b1b;
  color: #cfcfcf;
  margin-top: 10px;
  padding: 8px 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-fit-summary {
  color: #d9d9d9;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-fit-grid {
  display: grid;
  grid-template-columns: minmax(160px, 1.4fr) minmax(96px, 0.8fr) minmax(120px, 1fr) minmax(160px, 1.2fr);
  gap: 6px 10px;
  align-items: baseline;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-fit-heading {
  color: #d9d9d9;
  font-size: 11px;
  font-weight: 600;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__cover-view-fit-cell {
  color: #afafaf;
  font-size: 11px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-fit-cell--cropped {
  color: #d8a85f;
  font-weight: 600;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-fit-cell--letterboxed {
  color: #d8a85f;
  font-weight: 600;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__cover-view-fit-cell--fits {
  color: #9dc284;
  font-weight: 600;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-page {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
  overflow-x: auto;
  overflow-y: visible;
  padding: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-page::after {
  content: '';
  display: block;
  clear: both;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-main,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-sidebar {
  box-sizing: border-box;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-page-title {
  margin: 0 0 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-page-title .artist-info-link {
  color: inherit;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-linkbox {
  margin-bottom: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-linkbox .linkbox__link {
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-main {
  margin-bottom: 0;
  margin-right: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  overflow: hidden;
  border-radius: 4px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  th,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  td {
  padding: 4px 6px;
  border: 1px solid #555555;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  thead
  > tr {
  background: linear-gradient(180deg, rgba(20, 22, 22, 0.95), rgba(8, 9, 9, 0.95));
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  tbody
  > tr {
  background: rgba(51, 51, 51, 0.78);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent-edition {
  font-size: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent-row {
  font-size: var(--torrent-row-font-size);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent__action {
  float: right;
  margin-left: 10px;
  color: #d0d0d0;
  font-size: 11px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .widescreen-controls__layout-torrent-cell--main {
  white-space: normal;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .widescreen-controls__layout-torrent-cell--main
  .torrent-info-link {
  color: #d8d8d8;
  text-decoration: none;
  line-height: 1.45;
  white-space: normal;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .basic-movie-list__torrent-edition__sub {
  color: #d0d0d0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .torrent-info-link:hover {
  text-decoration: none;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-torrent-table
  .tag-separator {
  opacity: 0.65;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__list-preview {
  overflow-x: auto;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__list-preview-table {
  width: 100%;
  margin-bottom: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__list-preview-table.table--bordered {
  border: solid thin #555555;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > thead
  > tr,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > tbody
  > tr {
  background-color: #333333;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > thead
  > tr
  > th,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > tbody
  > tr
  > th,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > tfoot
  > tr
  > th,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > thead
  > tr
  > td,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > tbody
  > tr
  > td,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > tfoot
  > tr
  > td {
  border-top: solid thin #555555;
  line-height: 1.42857;
  padding: 5px;
  vertical-align: top;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--bordered
  > thead
  > tr
  > th,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--bordered
  > tbody
  > tr
  > th,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--bordered
  > tfoot
  > tr
  > th,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--bordered
  > thead
  > tr
  > td,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--bordered
  > tbody
  > tr
  > td,
.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--bordered
  > tfoot
  > tr
  > td {
  border: solid thin #555555;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--panel-like
  > thead
  > tr {
  background:
    url('https://passthepopcorn.me/static/styles/dark/images/blackgrad.png') repeat-x scroll 0 0%,
    none repeat scroll 0 0 #080909;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table.table--panel-like
  > thead
  > tr
  > th {
  padding: 4px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  > tbody
  > tr.basic-movie-list__details-row {
  background-color: #222222;
  vertical-align: top;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__title-row {
  font-weight: bold;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__new {
  font-size: 10px;
  font-weight: bold;
  opacity: 0.4;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__bookmark {
  float: right;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__ratings-and-tags {
  padding-top: 2px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__rating-container {
  display: inline;
  padding: 1px 4px;
  margin-right: 4px;
  background-color: #4d4d4d;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__rating__title {
  font-weight: bold;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__tags {
  padding: 2px;
  font-style: italic;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__torrent-row {
  font-size: var(--torrent-row-font-size);
  height: 1em;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__cover {
  background-color: #111111;
  display: block;
  height: var(--basic-movie-cover-height);
  object-fit: contain;
  object-position: center center;
  width: var(--basic-movie-cover-width);
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__movie__cover-link {
  display: block;
  position: relative;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__torrent-edition__main {
  font-weight: bold;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__list-preview-table
  .basic-movie-list__torrent__action {
  float: right;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__list-preview-table .nobr {
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__list-preview-table .no-seeders {
  color: red;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__list-preview-table .torrent-info__trumpable {
  color: orange;
  font-weight: bold;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-sidebar {
  width: var(--preview-sidebar-width);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-sidebar .panel {
  margin-bottom: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-block-title {
  color: #f0f0f0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-block-size {
  margin-top: 4px;
  color: #c2c2c2;
  font-size: 11px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-main-meta,
.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-sidebar-meta {
  margin-bottom: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-bbcode-wrap {
  margin-top: 14px;
  padding: 10px;
  border: 1px dashed rgba(173, 218, 238, 0.35);
  border-radius: 4px;
  background: rgba(15, 18, 21, 0.26);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-bbcode {
  height: 70px;
  width: min(var(--bbcode-image-default-width), 100%);
  border: 1px solid #83b6c8;
  border-radius: 4px;
  background: linear-gradient(140deg, rgba(58, 84, 100, 0.55), rgba(39, 59, 74, 0.55));
  box-shadow: inset 0 0 0 1px rgba(173, 218, 238, 0.2);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-metric {
  border: 1px solid #3a3c3f;
  border-radius: 6px;
  background: #1b1b1b;
  padding: 8px 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-metric-label {
  color: #d9d9d9;
  font-size: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-metric-value {
  margin-top: 4px;
  color: #afafaf;
  font-size: 11px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview {
  overflow-x: auto;
  overflow-y: visible;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list {
  margin: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie {
  background-color: #222222;
  border: var(--torrents-huge-movie-border-width, 8px) solid #222222;
  box-sizing: border-box;
  height: auto !important;
  min-height: calc(var(--torrents-huge-movie-height) + (var(--torrents-huge-movie-border-width, 8px) * 2)) !important;
  overflow: visible;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie::after {
  content: '';
  display: block;
  clear: both;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__cover {
  float: left;
  min-height: var(--torrents-huge-movie-height);
  position: relative;
  width: var(--torrents-huge-movie-width);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__cover__link {
  background-color: #111111;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
  display: block;
  height: var(--torrents-huge-movie-height);
  width: var(--torrents-huge-movie-width);
  box-sizing: border-box;
  outline: 2px solid #83b6c8;
  outline-offset: 0;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview--cropped
  .huge-movie-list__movie__cover__link {
  outline-color: #d8a85f;
  box-shadow: inset 0 0 0 2px rgba(216, 168, 95, 0.5);
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__details {
  margin-left: var(--torrents-huge-movie-width);
  padding: 0 0 0 10px;
  position: relative;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__title-row {
  line-height: 1.15;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__title {
  color: #f2f2f2;
  font-size: 2.5em;
  font-weight: bold;
  line-height: 1.05;
  text-decoration: none;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__year {
  color: #cfcfcf;
  font-size: 2em;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__director-list {
  font-size: 1.5em;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__new {
  font-size: 10px;
  font-weight: bold;
  opacity: 0.4;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__tag-list {
  color: #cfcfcf;
  font-size: 1.5em;
  font-style: italic;
  margin-top: 2px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .cover-movie-list__movie__tag {
  color: inherit;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__ratings-and-synopsis {
  border-collapse: collapse;
  margin-top: 25px;
  width: 100%;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__ratings-and-synopsis
  > tbody
  > tr
  > td {
  background-color: #333333;
  border: solid thin #555555;
  padding: 5px;
  vertical-align: top;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__ratings-and-synopsis
  > tbody
  > tr
  > td:first-child {
  white-space: nowrap;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__ratings {
  margin: auto;
  width: 130px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__ratings__icon-column {
  padding: 1px 6px 1px 5px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__ratings__votes-column {
  padding: 1px 2px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__synopsis {
  font-size: 1.5em;
  padding: 5px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview .huge-movie-list__movie__action-row {
  font-size: 1.2em;
  margin-top: 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__torrent-summary {
  margin-top: 25px;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview
  .huge-movie-list__movie__torrent-summary__row__title {
  font-weight: bold;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview-fit {
  border: 1px solid #3a3c3f;
  border-radius: 6px;
  background: #1b1b1b;
  color: #cfcfcf;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 10px;
  padding: 8px 10px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview-fit-status {
  color: #9dc284;
  font-weight: 600;
}

.tabs__panel.js-widescreen-controls-tab-panel
  .widescreen-controls__huge-preview--cropped
  .widescreen-controls__huge-preview-fit-status {
  color: #d8a85f;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview-fit-label {
  color: #d9d9d9;
  font-size: 12px;
}

.tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview-fit-value {
  color: #afafaf;
  font-size: 11px;
  margin-top: 4px;
}

@media (max-width: 760px) {
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-legend {
    grid-template-columns: 1fr;
  }

  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__huge-preview-fit {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1000px) {
  .tabs__panels {
    overflow-x: auto;
  }

  .tabs__panel.js-widescreen-controls-tab-panel,
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__layout-page,
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__torrents-php-preview,
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__top10-preview,
  .tabs__panel.js-widescreen-controls-tab-panel .widescreen-controls__preview-grid {
    width: var(--widescreen-preview-content-width, var(--layout-width));
    min-width: var(--widescreen-preview-content-width, var(--layout-width));
  }

  .js-widescreen-controls-panel.widescreen-controls {
    width: 1040px;
    min-width: 1040px;
  }

  .widescreen-controls__preview-options-panel {
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

  function getPreferredSidebarCoverImageUrl(url, currentState) {
    const cleanUrl = normalizeUrlValue(url);
    if (!cleanUrl) return '';

    if (currentState && currentState.useOriginalSidebarCoverPath) {
      return cleanUrl.replace('/p/', '/i/');
    }

    return cleanUrl.replace('/i/', '/p/');
  }

  function applySidebarCoverPathToImage(image, currentState) {
    if (!(image instanceof HTMLImageElement) || !image.matches('.sidebar-cover-image')) {
      return;
    }

    const currentUrl = image.getAttribute('src') || image.currentSrc || '';
    const nextUrl = getPreferredSidebarCoverImageUrl(currentUrl, currentState);
    if (!nextUrl || nextUrl === currentUrl) {
      return;
    }

    image.src = nextUrl;
  }

  function refreshSidebarCoverImagePaths(root, currentState) {
    const scope = root && root.querySelectorAll ? root : document;

    if (scope instanceof Element && scope.matches('.sidebar-cover-image')) {
      applySidebarCoverPathToImage(scope, currentState);
    }

    const images = scope.querySelectorAll('.sidebar-cover-image');
    for (const image of images) {
      applySidebarCoverPathToImage(image, currentState);
    }
  }

  function ensureSidebarCoverPathObserver() {
    if (sidebarCoverPathObserver) {
      return;
    }

    sidebarCoverPathObserver = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
          applySidebarCoverPathToImage(mutation.target, state);
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          refreshSidebarCoverImagePaths(node, state);
        }
      }
    });

    sidebarCoverPathObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
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
    const useOriginalSidebarCoverPath = !!(parsed && parsed.useOriginalSidebarCoverPath);

    return {
      linked,
      scale,
      overrides,
      linkedVariables,
      logoImageUrl,
      backdropImageUrl,
      tileBackdropImage,
      useOriginalSidebarCoverPath
    };
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
    const overrides = currentState && currentState.overrides ? currentState.overrides : {};

    for (const variable of SETTING_VARS) {
      const fallbackValue = clampSettingValue(variable.defaultValue, variable, variable.defaultValue);
      const overrideValue = clampSettingValue(currentState.overrides[variable.name], variable, fallbackValue);
      const linkedValue = scaleSettingValue(variable, scale);
      const resolvedValue = isVariableLinked(currentState, variable.name) ? linkedValue : overrideValue;

      settings[variable.name] = resolvedValue;
      if (WIDTH_VARS.includes(variable)) {
        widths[variable.name] = resolvedValue;
      } else if (HEIGHT_VARS.includes(variable)) {
        heights[variable.name] = resolvedValue;
      }
    }

    for (const pair of HEIGHT_FROM_WIDTH) {
      const widthValue = widths[pair.widthVar];
      if (!Number.isFinite(widthValue) || pair.widthDefault <= 0) continue;

      const ratio = pair.heightDefault / pair.widthDefault;
      const derivedHeight = Math.max(1, Math.round(widthValue * ratio));
      const hasHeightControl = HEIGHT_VARS.some(function (variable) {
        return variable.name === pair.heightVar;
      });
      const heightDetached = hasHeightControl && !isVariableLinked(currentState, pair.heightVar);
      if (heightDetached) continue;

      // Keep height and width in sync unless this specific height was intentionally customized.
      const rawHeightOverride = Number(overrides[pair.heightVar]);
      const heightCustomized = Number.isFinite(rawHeightOverride) && Math.abs(rawHeightOverride - pair.heightDefault) > 0.01;

      if (!heightCustomized || !Number.isFinite(heights[pair.heightVar])) {
        heights[pair.heightVar] = derivedHeight;
        settings[pair.heightVar] = derivedHeight;
      }
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

  function extractFirstUrlFromCssValue(value) {
    const match = /url\((['"]?)(.*?)\1\)/.exec(String(value || ''));
    return match && match[2] ? match[2].trim() : '';
  }

  function getHugeCoverImageUrl(link) {
    if (!link) return '';
    const inlineBackgroundImage = link.style ? link.style.backgroundImage : '';
    const inlineStyle = link.getAttribute('style') || '';
    return extractFirstUrlFromCssValue(inlineBackgroundImage) || extractFirstUrlFromCssValue(inlineStyle);
  }

  function getHugeCoverSlotAspect(link) {
    if (!link) return 0;

    const styles = getComputedStyle(link);
    const width = Math.max(0, parsePixelValue(styles.width) || link.clientWidth || link.offsetWidth);
    const height = Math.max(0, parsePixelValue(styles.height) || link.clientHeight || link.offsetHeight);
    if (width <= 0 || height <= 0) return 0;

    return width / height;
  }

  function applyHugeCoverFitToLink(link) {
    if (!link) return;

    const url = getHugeCoverImageUrl(link);
    if (!url) {
      link.classList.remove(HUGE_COVER_CONTAIN_CLASS);
      return;
    }

    const slotAspect = getHugeCoverSlotAspect(link);
    if (slotAspect <= 0) return;

    if (hugeCoverFitCache.has(url)) {
      const fitInside = hugeCoverFitCache.get(url);
      link.classList.toggle(HUGE_COVER_CONTAIN_CLASS, !!fitInside);
      return;
    }

    const image = new Image();
    image.onload = function () {
      const imageAspect = image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 0;
      const fitInside = imageAspect > slotAspect + 0.02;
      hugeCoverFitCache.set(url, fitInside);
      if (link.isConnected) {
        link.classList.toggle(HUGE_COVER_CONTAIN_CLASS, fitInside);
      }
    };
    image.onerror = function () {
      hugeCoverFitCache.set(url, false);
      if (link.isConnected) {
        link.classList.remove(HUGE_COVER_CONTAIN_CLASS);
      }
    };
    image.src = url;
  }

  function refreshHugeCoverImageFit(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const links = scope.querySelectorAll('#torrents-movie-view .huge-movie-list__movie__cover__link');
    for (const link of links) {
      applyHugeCoverFitToLink(link);
    }
  }

  function scheduleHugeCoverImageFitRefresh() {
    if (hugeCoverFitRefreshTimerId) {
      globalThis.clearTimeout(hugeCoverFitRefreshTimerId);
    }

    hugeCoverFitRefreshTimerId = globalThis.setTimeout(function () {
      hugeCoverFitRefreshTimerId = 0;
      refreshHugeCoverImageFit(document);
    }, 0);
  }

  function ensureHugeCoverImageFitObserver() {
    const container = document.querySelector('#torrents-movie-view');
    if (!container) return;

    if (hugeCoverFitObserver) {
      return;
    }

    hugeCoverFitObserver = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches && node.matches('.huge-movie-list__movie__cover__link')) {
            applyHugeCoverFitToLink(node);
          } else {
            refreshHugeCoverImageFit(node);
          }
        }
      }
    });

    hugeCoverFitObserver.observe(container, {
      childList: true,
      subtree: true
    });
  }

  function isTorrentsBrowsePage() {
    const url = new URL(location.href);
    return (
      url.pathname === '/torrents.php' &&
      !url.searchParams.has('id') &&
      !url.searchParams.has('torrentid') &&
      !url.searchParams.has('action')
    );
  }

  function isTop10Page() {
    return new URL(location.href).pathname === '/top10.php';
  }

  function applyTop10CoverImagePlaceholder(image) {
    if (!(image instanceof HTMLImageElement)) return;
    const coverLink = image.parentElement;
    if (
      !coverLink ||
      !coverLink.classList.contains('cover-movie-list__movie__cover-link') ||
      !coverLink.closest('.js-cover-view-index-store')
    ) {
      return;
    }

    const style = image.dataset.style || image.getAttribute('data-style') || '';
    if (!style) return;

    coverLink.setAttribute('style', style);
    image.remove();
  }

  function applyTop10CoverImagePlaceholders(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (scope instanceof HTMLImageElement) {
      applyTop10CoverImagePlaceholder(scope);
    }

    scope.querySelectorAll(
      '.js-cover-view-index-store .cover-movie-list__movie__cover-link > img[data-style]'
    ).forEach(applyTop10CoverImagePlaceholder);
  }

  function setupTop10CoverImagePlaceholderBypass() {
    if (top10CoverImagePlaceholderObserver) return;

    applyTop10CoverImagePlaceholders(document);
    top10CoverImagePlaceholderObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!(node instanceof Element)) return;
          applyTop10CoverImagePlaceholders(node);
        });
      });
    });

    top10CoverImagePlaceholderObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    document.addEventListener('DOMContentLoaded', function () {
      applyTop10CoverImagePlaceholders(document);
    }, { once: true });
  }

  function injectTop10BaseNavigationLink(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const headers = [];
    if (
      scope instanceof Element &&
      scope.matches('h2[id^="top-header-"]')
    ) {
      headers.push(scope);
    }
    headers.push(...scope.querySelectorAll('h2[id^="top-header-"]'));

    headers.forEach(function (header) {
      const small = header.querySelector(':scope > small');
      if (!small || small.dataset.widescreenTop10BaseLinkAdded === 'true') return;

      const links = Array.from(small.querySelectorAll('a'));
      const hasTop100Link = links.some(function (link) {
        const href = link.getAttribute('href') || '';
        return href.indexOf('top10.php') !== -1 && href.indexOf('limit=100') !== -1;
      });
      const hasTop250Link = links.some(function (link) {
        const href = link.getAttribute('href') || '';
        return href.indexOf('top10.php') !== -1 && href.indexOf('limit=250') !== -1;
      });
      const hasTop10Link = links.some(function (link) {
        const href = link.getAttribute('href') || '';
        try {
          const url = new URL(href, location.href);
          return (
            url.pathname === '/top10.php' &&
            !url.searchParams.has('limit') &&
            !url.searchParams.has('details') &&
            !url.searchParams.has('type')
          );
        } catch (error) {
          return href === 'top10.php';
        }
      });

      if (!hasTop100Link || !hasTop250Link || hasTop10Link) return;

      const top10Link = document.createElement('a');
      top10Link.href = 'top10.php';
      top10Link.textContent = 'Top 10';
      small.insertBefore(document.createTextNode('- ['), small.firstChild);
      small.insertBefore(top10Link, small.childNodes[1] || null);
      small.insertBefore(document.createTextNode('] '), small.childNodes[2] || null);
      small.dataset.widescreenTop10BaseLinkAdded = 'true';
    });
  }

  function getStoredTop10ViewMode() {
    try {
      if (typeof GM_getValue === 'function') {
        return String(GM_getValue(TOP10_VIEW_MODE_KEY, '') || '');
      }
      return localStorage.getItem(TOP10_VIEW_MODE_KEY) || '';
    } catch (error) {
      console.debug('PTP Widescreen Controls: read top10 view mode failed', error);
      return '';
    }
  }

  function setStoredTop10ViewMode(viewMode) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(TOP10_VIEW_MODE_KEY, viewMode || '');
      } else if (viewMode) {
        localStorage.setItem(TOP10_VIEW_MODE_KEY, viewMode);
      } else {
        localStorage.removeItem(TOP10_VIEW_MODE_KEY);
      }
    } catch (error) {
      console.debug('PTP Widescreen Controls: write top10 view mode failed', error);
    }
  }

  function getStoredTorrentsViewMode() {
    try {
      if (typeof GM_getValue === 'function') {
        return String(GM_getValue(TORRENTS_VIEW_MODE_KEY, '') || '');
      }
      return localStorage.getItem(TORRENTS_VIEW_MODE_KEY) || '';
    } catch (error) {
      console.debug('PTP Widescreen Controls: read torrents view mode failed', error);
      return '';
    }
  }

  function setStoredTorrentsViewMode(viewMode) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(TORRENTS_VIEW_MODE_KEY, viewMode || '');
      } else if (viewMode) {
        localStorage.setItem(TORRENTS_VIEW_MODE_KEY, viewMode);
      } else {
        localStorage.removeItem(TORRENTS_VIEW_MODE_KEY);
      }
    } catch (error) {
      console.debug('PTP Widescreen Controls: write torrents view mode failed', error);
    }
  }

  function normalizeCssUrl(url) {
    let normalized = String(url || '')
      .replace(/&quot;|&#34;/g, '"')
      .replace(/&apos;|&#39;|&#x27;/g, "'")
      .trim()
      .replace(/^\\+|\\+$/g, '');
    let previousValue = '';
    while (normalized && normalized !== previousValue) {
      previousValue = normalized;
      normalized = normalized
        .trim()
        .replace(/^\\?['"]/, '')
        .replace(/\\?['"]$/, '')
        .trim();
    }
    return normalized;
  }

  function getCssUrl(value) {
    const match = String(value || '').match(/url\((.*?)\)/);
    return match ? normalizeCssUrl(match[1]) : '';
  }

  function getElementBackgroundUrl(element) {
    if (!element) return '';
    return (
      getCssUrl(element.style.backgroundImage) ||
      getCssUrl(element.style.background) ||
      getCssUrl(getComputedStyle(element).backgroundImage)
    );
  }

  function addTorrentsSmallCoverMovie(movies, seenKeys, movie) {
    if (!movie || !movie.href || !movie.coverUrl) return;
    const key = movie.href || movie.coverUrl;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    movies.push(movie);
  }

  function collectTorrentsSmallCoverMovies(container) {
    const movies = [];
    const seenKeys = new Set();

    container.querySelectorAll('.cover-movie-list__movie').forEach(function (item) {
      if (item.closest('.widescreen-torrents-small-cover-view')) return;
      const link = item.querySelector('.cover-movie-list__movie__cover-link');
      addTorrentsSmallCoverMovie(movies, seenKeys, {
        href: link ? link.getAttribute('href') || '' : '',
        coverUrl: getElementBackgroundUrl(link),
        title: (item.querySelector('.cover-movie-list__movie__title') || link || item).textContent.trim(),
        seen: !!(link && link.className.indexOf('--seen') !== -1)
      });
    });

    container.querySelectorAll('.huge-movie-list__movie').forEach(function (item) {
      if (item.closest('.widescreen-torrents-small-cover-view')) return;
      const link = item.querySelector('.huge-movie-list__movie__cover__link');
      addTorrentsSmallCoverMovie(movies, seenKeys, {
        href: link ? link.getAttribute('href') || '' : '',
        coverUrl: getElementBackgroundUrl(link),
        title: (item.querySelector('.huge-movie-list__movie__title') || link || item).textContent.trim(),
        seen: !!(link && link.className.indexOf('--seen') !== -1)
      });
    });

    container.querySelectorAll('.basic-movie-list__details-row').forEach(function (row) {
      if (row.closest('.widescreen-torrents-small-cover-view')) return;
      const link = row.querySelector('.basic-movie-list__movie__cover-link');
      const image = row.querySelector('.basic-movie-list__movie__cover');
      addTorrentsSmallCoverMovie(movies, seenKeys, {
        href: link ? link.getAttribute('href') || '' : '',
        coverUrl: image ? image.currentSrc || image.src || '' : getElementBackgroundUrl(link),
        title: (row.querySelector('.basic-movie-list__movie__title') || image || link || row).textContent.trim(),
        seen: !!(link && link.className.indexOf('--seen') !== -1)
      });
    });

    return movies;
  }

  function removeTorrentsSmallCoverView(container) {
    const movieView = container || document.querySelector('#torrents-movie-view');
    if (!movieView) return;

    movieView.querySelectorAll(':scope > .widescreen-torrents-small-cover-view').forEach(function (view) {
      view.remove();
    });

    Array.from(movieView.children).forEach(function (child) {
      if (!child.dataset || child.dataset.widescreenSmallCoverHidden !== 'true') return;
      child.style.display = child.dataset.widescreenSmallCoverPreviousDisplay || '';
      delete child.dataset.widescreenSmallCoverHidden;
      delete child.dataset.widescreenSmallCoverPreviousDisplay;
    });

    movieView.classList.remove('widescreen-torrents-small-cover-view-active');
  }

  function renderTorrentsSmallCoverView() {
    const movieView = document.querySelector('#torrents-movie-view');
    if (!movieView || torrentsSmallCoverViewRendering) return;

    torrentsSmallCoverViewRendering = true;
    removeTorrentsSmallCoverView(movieView);

    const movies = collectTorrentsSmallCoverMovies(movieView);
    if (!movies.length) {
      torrentsSmallCoverViewRendering = false;
      return;
    }

    const smallCoverView = document.createElement('div');
    smallCoverView.className =
      'small-cover-movie-list__container js-small-cover-movie-list__container clearfix widescreen-torrents-small-cover-view';

    movies.forEach(function (movie, index) {
      const item = document.createElement('div');
      item.className = 'small-cover-movie-list__movie js-movie-tooltip-triggerer';
      item.dataset.coverviewjsonindex = String(index);

      const link = document.createElement('a');
      link.className = movie.seen
        ? 'small-cover-movie-list__movie__link small-cover-movie-list__movie__link--seen'
        : 'small-cover-movie-list__movie__link';
      link.href = movie.href;
      link.title = movie.title;
      link.style.background = `url("${movie.coverUrl}") no-repeat top center scroll`;
      link.style.backgroundSize = 'cover';

      item.appendChild(link);
      smallCoverView.appendChild(item);
    });

    Array.from(movieView.children).forEach(function (child) {
      child.dataset.widescreenSmallCoverPreviousDisplay = child.style.display || '';
      child.dataset.widescreenSmallCoverHidden = 'true';
      child.style.display = 'none';
    });

    movieView.classList.add('widescreen-torrents-small-cover-view-active');
    movieView.insertBefore(smallCoverView, movieView.firstChild);
    torrentsSmallCoverViewRendering = false;
  }

  function scheduleTorrentsSmallCoverViewRender() {
    if (getStoredTorrentsViewMode() !== TORRENTS_SMALL_COVER_VIEW_MODE) return;
    if (torrentsSmallCoverViewRenderTimerId) {
      globalThis.clearTimeout(torrentsSmallCoverViewRenderTimerId);
    }
    torrentsSmallCoverViewRenderTimerId = globalThis.setTimeout(function () {
      torrentsSmallCoverViewRenderTimerId = 0;
      if (getStoredTorrentsViewMode() !== TORRENTS_SMALL_COVER_VIEW_MODE) return;
      renderTorrentsSmallCoverView();
    }, 0);
  }

  function cancelTorrentsSmallCoverViewRender() {
    if (!torrentsSmallCoverViewRenderTimerId) return;
    globalThis.clearTimeout(torrentsSmallCoverViewRenderTimerId);
    torrentsSmallCoverViewRenderTimerId = 0;
  }

  function syncTorrentsSmallCoverViewInputs(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const smallCoverActive = getStoredTorrentsViewMode() === TORRENTS_SMALL_COVER_VIEW_MODE;
    const inputs = scope.querySelectorAll('input[name="view_mode"].js-movie-view-settings-input');
    inputs.forEach(function (input) {
      if (input.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE) {
        input.checked = smallCoverActive;
      } else if (smallCoverActive) {
        input.checked = false;
      }
    });
  }

  function injectTorrentsSmallCoverViewSelector(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const inputs = Array.from(scope.querySelectorAll('input[name="view_mode"].js-movie-view-settings-input'));
    if (!inputs.length) return;
    if (inputs.some(function (input) {
      return input.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE;
    })) {
      syncTorrentsSmallCoverViewInputs(scope);
      return;
    }

    const coverInput = inputs.find(function (input) {
      return input.dataset.viewmode === 'Cover';
    }) || inputs[0];
    const coverLabel = coverInput.closest('label');
    if (!coverLabel) return;

    const smallCoverLabel = document.createElement('label');
    const smallCoverInput = document.createElement('input');
    smallCoverInput.type = 'radio';
    smallCoverInput.name = coverInput.name;
    smallCoverInput.dataset.viewmode = TORRENTS_SMALL_COVER_VIEW_MODE;
    smallCoverInput.className = coverInput.className;
    smallCoverLabel.appendChild(smallCoverInput);
    smallCoverLabel.appendChild(document.createTextNode(' Small cover view'));

    const smallCoverBreak = document.createElement('br');
    const coverBreak = coverLabel.nextSibling && coverLabel.nextSibling.nodeName === 'BR'
      ? coverLabel.nextSibling
      : null;
    if (coverBreak) {
      coverBreak.after(smallCoverLabel, smallCoverBreak);
    } else {
      coverLabel.after(document.createElement('br'), smallCoverLabel, smallCoverBreak);
    }

    syncTorrentsSmallCoverViewInputs(scope);
  }

  function setupTorrentsSmallCoverViewMode() {
    if (!isTorrentsBrowsePage() || torrentsSmallCoverViewInitialized) return;
    torrentsSmallCoverViewInitialized = true;

    injectTorrentsSmallCoverViewSelector(document);

    document.addEventListener(
      'click',
      function (event) {
        const target = event.target;
        if (
          target instanceof HTMLInputElement &&
          target.name === 'view_mode' &&
          target.classList.contains('js-movie-view-settings-input')
        ) {
          if (target.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE) {
            event.stopImmediatePropagation();
          } else {
            setStoredTorrentsViewMode('');
            cancelTorrentsSmallCoverViewRender();
            removeTorrentsSmallCoverView();
          }
        }
      },
      true
    );

    document.addEventListener(
      'change',
      function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.name !== 'view_mode') return;
        if (!target.classList.contains('js-movie-view-settings-input')) return;

        if (target.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setStoredTorrentsViewMode(TORRENTS_SMALL_COVER_VIEW_MODE);
          syncTorrentsSmallCoverViewInputs(document);
          renderTorrentsSmallCoverView();
          return;
        }

        setStoredTorrentsViewMode('');
        cancelTorrentsSmallCoverViewRender();
        removeTorrentsSmallCoverView();
      },
      true
    );

    torrentsSmallCoverViewObserver = new MutationObserver(function (mutations) {
      let shouldRenderSmallCoverView = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.matches('.widescreen-torrents-small-cover-view') ||
            node.closest('.widescreen-torrents-small-cover-view')
          ) {
            continue;
          }
          injectTorrentsSmallCoverViewSelector(node);
          if (
            node.matches('#torrents-movie-view') ||
            node.closest('#torrents-movie-view') ||
            node.querySelector('#torrents-movie-view')
          ) {
            shouldRenderSmallCoverView = true;
          }
        }
      }
      if (shouldRenderSmallCoverView) {
        scheduleTorrentsSmallCoverViewRender();
      }
    });

    torrentsSmallCoverViewObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    if (getStoredTorrentsViewMode() === TORRENTS_SMALL_COVER_VIEW_MODE) {
      scheduleTorrentsSmallCoverViewRender();
    }
  }

  function getTop10CoverUrlFromCoverLink(link) {
    if (!link) return '';
    const image = link.querySelector('img');
    return normalizeCssUrl(
      getElementBackgroundUrl(link) ||
        (image ? getCssUrl(image.dataset.style) || image.currentSrc || image.src || '' : '')
    );
  }

  function addTop10SmallCoverMovie(movies, seenKeys, movie) {
    if (!movie || !movie.href || !movie.coverUrl) return;
    const key = movie.href || movie.coverUrl;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    movies.push({
      href: movie.href,
      coverUrl: movie.coverUrl,
      title: movie.title || '',
      seen: !!movie.seen,
      index: movies.length
    });
  }

  function collectTop10SmallCoverMovies(store) {
    const movies = [];
    const seenKeys = new Set();

    store.querySelectorAll(':scope > .cover-movie-list__container .cover-movie-list__movie').forEach(function (
      coverItem
    ) {
      const coverLink = coverItem.querySelector('.cover-movie-list__movie__cover-link');
      const coverUrl = getTop10CoverUrlFromCoverLink(coverLink);
      addTop10SmallCoverMovie(movies, seenKeys, {
        href: coverLink ? coverLink.getAttribute('href') || '' : '',
        coverUrl,
        title: (coverItem.querySelector('.cover-movie-list__movie__title') || coverLink || coverItem).textContent.trim(),
        seen: !!(coverLink && coverLink.className.indexOf('--seen') !== -1)
      });
    });

    store.querySelectorAll(':scope > .js-huge_view_container .huge-movie-list__movie').forEach(function (hugeItem) {
      const coverLink = hugeItem.querySelector('.huge-movie-list__movie__cover__link');
      addTop10SmallCoverMovie(movies, seenKeys, {
        href: coverLink ? coverLink.getAttribute('href') || '' : '',
        coverUrl: getElementBackgroundUrl(coverLink),
        title: (hugeItem.querySelector('.huge-movie-list__movie__title') || coverLink || hugeItem).textContent.trim(),
        seen: !!(coverLink && coverLink.className.indexOf('--seen') !== -1)
      });
    });

    store.querySelectorAll(':scope > .js-basic-movie-list .basic-movie-list__details-row').forEach(function (row) {
      const coverLink = row.querySelector('.basic-movie-list__movie__cover-link');
      const image = row.querySelector('.basic-movie-list__movie__cover');
      addTop10SmallCoverMovie(movies, seenKeys, {
        href: coverLink ? coverLink.getAttribute('href') || '' : '',
        coverUrl: image ? image.currentSrc || image.src || '' : getElementBackgroundUrl(coverLink),
        title: (row.querySelector('.basic-movie-list__movie__title') || image || coverLink || row).textContent.trim(),
        seen: !!(coverLink && coverLink.className.indexOf('--seen') !== -1)
      });
    });

    return movies;
  }

  function removeTop10SmallCoverView(container) {
    const scope = container || document;
    const stores = [];
    if (scope instanceof Element && scope.matches('.js-cover-view-index-store')) {
      stores.push(scope);
    }
    stores.push(...scope.querySelectorAll('.js-cover-view-index-store'));

    stores.forEach(function (store) {
      store.querySelectorAll(':scope > .widescreen-top10-small-cover-view').forEach(function (view) {
        view.remove();
      });

      Array.from(store.children).forEach(function (child) {
        if (!child.dataset || child.dataset.widescreenTop10SmallCoverHidden !== 'true') return;
        child.style.display = child.dataset.widescreenTop10SmallCoverPreviousDisplay || '';
        delete child.dataset.widescreenTop10SmallCoverHidden;
        delete child.dataset.widescreenTop10SmallCoverPreviousDisplay;
      });

      store.classList.remove('widescreen-top10-small-cover-view-active');
    });
  }

  function renderTop10SmallCoverView() {
    if (top10SmallCoverViewRendering) return;

    top10SmallCoverViewRendering = true;
    try {
      document.querySelectorAll('.js-cover-view-index-store').forEach(function (store) {
        removeTop10SmallCoverView(store);

        const movies = collectTop10SmallCoverMovies(store);
        if (!movies.length) return;

        const smallCoverView = document.createElement('div');
        smallCoverView.className =
          'small-cover-movie-list__container js-small-cover-movie-list__container clearfix widescreen-top10-small-cover-view';

        movies.forEach(function (movie) {
          const item = document.createElement('div');
          item.className = 'small-cover-movie-list__movie js-movie-tooltip-triggerer';
          item.dataset.coverviewjsonindex = String(movie.index);

          const link = document.createElement('a');
          link.className = movie.seen
            ? 'small-cover-movie-list__movie__link small-cover-movie-list__movie__link--seen'
            : 'small-cover-movie-list__movie__link';
          link.href = movie.href;
          link.title = movie.title;
          link.style.background = `url("${movie.coverUrl}") no-repeat top center scroll`;
          link.style.backgroundSize = 'cover';

          item.appendChild(link);
          smallCoverView.appendChild(item);
        });

        Array.from(store.children).forEach(function (child) {
          child.dataset.widescreenTop10SmallCoverPreviousDisplay = child.style.display || '';
          child.dataset.widescreenTop10SmallCoverHidden = 'true';
          child.style.display = 'none';
        });

        store.classList.add('widescreen-top10-small-cover-view-active');
        store.insertBefore(smallCoverView, store.firstChild);
      });
    } finally {
      top10SmallCoverViewRendering = false;
    }
  }

  function setTop10SmallCoverActive(active) {
    if (active) {
      renderTop10SmallCoverView();
    } else {
      removeTop10SmallCoverView();
    }
  }

  function hideTop10SmallCoverView() {
    removeTop10SmallCoverView();
  }

  function scheduleTop10SmallCoverViewSync(delay) {
    if (getStoredTop10ViewMode() !== TORRENTS_SMALL_COVER_VIEW_MODE) return;
    if (top10SmallCoverViewSyncTimerId) {
      globalThis.clearTimeout(top10SmallCoverViewSyncTimerId);
    }
    top10SmallCoverViewSyncTimerId = globalThis.setTimeout(function () {
      top10SmallCoverViewSyncTimerId = 0;
      if (getStoredTop10ViewMode() !== TORRENTS_SMALL_COVER_VIEW_MODE) return;
      setTop10SmallCoverActive(true);
      syncTop10SmallCoverViewInputs(document);
    }, typeof delay === 'number' ? delay : 0);
  }

  function cancelTop10SmallCoverViewSync() {
    if (!top10SmallCoverViewSyncTimerId) return;
    globalThis.clearTimeout(top10SmallCoverViewSyncTimerId);
    top10SmallCoverViewSyncTimerId = 0;
  }

  function syncTop10SmallCoverViewInputs(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const smallCoverActive = getStoredTop10ViewMode() === TORRENTS_SMALL_COVER_VIEW_MODE;
    const inputs = scope.querySelectorAll('input[name="view_mode"]');
    inputs.forEach(function (input) {
      if (input.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE) {
        input.checked = smallCoverActive;
      } else if (smallCoverActive) {
        input.checked = false;
      }
    });
  }

  function injectTop10SmallCoverViewSelector(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const inputs = Array.from(scope.querySelectorAll('input[name="view_mode"].js-movie-view-settings-input'));
    if (!inputs.length) return;
    if (scope.querySelector('input[name="view_mode"][data-viewmode="' + TORRENTS_SMALL_COVER_VIEW_MODE + '"]')) {
      syncTop10SmallCoverViewInputs(scope);
      return;
    }
    if (inputs.some(function (input) {
      return input.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE;
    })) {
      syncTop10SmallCoverViewInputs(scope);
      return;
    }

    const coverInput = inputs.find(function (input) {
      return input.dataset.viewmode === 'Cover';
    }) || inputs[0];
    const coverLabel = coverInput.closest('label');
    if (!coverLabel) return;

    const smallCoverLabel = document.createElement('label');
    const smallCoverInput = document.createElement('input');
    smallCoverInput.type = 'radio';
    smallCoverInput.name = coverInput.name;
    smallCoverInput.dataset.viewmode = TORRENTS_SMALL_COVER_VIEW_MODE;
    smallCoverInput.className = TOP10_SMALL_COVER_VIEW_INPUT_CLASS;
    smallCoverLabel.appendChild(smallCoverInput);
    smallCoverLabel.appendChild(document.createTextNode(' Small cover view'));

    const smallCoverBreak = document.createElement('br');
    const coverBreak = coverLabel.nextSibling && coverLabel.nextSibling.nodeName === 'BR'
      ? coverLabel.nextSibling
      : null;
    if (coverBreak) {
      coverBreak.after(smallCoverLabel, smallCoverBreak);
    } else {
      coverLabel.after(document.createElement('br'), smallCoverLabel, smallCoverBreak);
    }

    syncTop10SmallCoverViewInputs(scope);
  }

  function isTop10ViewModeInput(target) {
    return (
      target instanceof HTMLInputElement &&
      target.name === 'view_mode' &&
      (
        target.classList.contains('js-movie-view-settings-input') ||
        target.classList.contains(TOP10_SMALL_COVER_VIEW_INPUT_CLASS)
      )
    );
  }

  function scheduleTop10SelectorInjection() {
    [0, 100, 300].forEach(function (delay) {
      globalThis.setTimeout(function () {
        injectTop10SmallCoverViewSelector(document);
        injectTop10BaseNavigationLink(document);
      }, delay);
    });
  }

  function setupTop10SmallCoverViewMode() {
    if (!isTop10Page() || top10SmallCoverViewInitialized) return;
    top10SmallCoverViewInitialized = true;

    injectTop10BaseNavigationLink(document);

    ['click', 'mouseover', 'focusin'].forEach(function (eventName) {
      document.addEventListener(
        eventName,
        function (event) {
          const target = event.target;
          if (!(target instanceof Element) || !target.closest('#browse_settings')) return;
          scheduleTop10SelectorInjection();
        },
        true
      );
    });

    document.addEventListener(
      'click',
      function (event) {
        const target = event.target;
        if (isTop10ViewModeInput(target)) {
          if (target.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE) {
            event.stopImmediatePropagation();
          } else if (getStoredTop10ViewMode() === TORRENTS_SMALL_COVER_VIEW_MODE) {
            setStoredTop10ViewMode('');
            cancelTop10SmallCoverViewSync();
            hideTop10SmallCoverView();
          }
        }
      },
      true
    );

    document.addEventListener(
      'change',
      function (event) {
        const target = event.target;
        if (!isTop10ViewModeInput(target)) return;

        if (target.dataset.viewmode === TORRENTS_SMALL_COVER_VIEW_MODE) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setStoredTop10ViewMode(TORRENTS_SMALL_COVER_VIEW_MODE);
          syncTop10SmallCoverViewInputs(document);
          setTop10SmallCoverActive(true);
          scheduleTop10SmallCoverViewSync(50);
          return;
        }

        if (getStoredTop10ViewMode() === TORRENTS_SMALL_COVER_VIEW_MODE) {
          setStoredTop10ViewMode('');
          cancelTop10SmallCoverViewSync();
          hideTop10SmallCoverView();
        }
      },
      true
    );

    if (getStoredTop10ViewMode() === TORRENTS_SMALL_COVER_VIEW_MODE) {
      setTop10SmallCoverActive(true);
      scheduleTop10SmallCoverViewSync(50);
      globalThis.addEventListener('load', function () {
        scheduleTop10SmallCoverViewSync();
      }, { once: true });
    }
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

  function computeCoverFitMetrics(slotWidth, slotHeight, imageWidth, imageHeight) {
    if (
      !Number.isFinite(slotWidth) ||
      !Number.isFinite(slotHeight) ||
      !Number.isFinite(imageWidth) ||
      !Number.isFinite(imageHeight) ||
      slotWidth <= 0 ||
      slotHeight <= 0 ||
      imageWidth <= 0 ||
      imageHeight <= 0
    ) {
      return null;
    }

    const scale = Math.max(slotWidth / imageWidth, slotHeight / imageHeight);
    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;
    const croppedWidth = Math.max(0, renderedWidth - slotWidth);
    const croppedHeight = Math.max(0, renderedHeight - slotHeight);
    const cropTolerance = 0.5;
    const isHorizontallyCropped = croppedWidth > cropTolerance;
    const isVerticallyCropped = croppedHeight > cropTolerance;

    return {
      slotAspect: slotWidth / slotHeight,
      imageAspect: imageWidth / imageHeight,
      renderedWidth,
      renderedHeight,
      croppedWidth,
      croppedHeight,
      fullImageHeightAtSlotWidth: (slotWidth * imageHeight) / imageWidth,
      fullImageWidthAtSlotHeight: (slotHeight * imageWidth) / imageHeight,
      isCropped: isHorizontallyCropped || isVerticallyCropped,
      status: isVerticallyCropped
        ? 'Crops vertically'
        : isHorizontallyCropped
          ? 'Crops horizontally'
          : 'Fits without crop'
    };
  }

  function computeContainFitMetrics(slotWidth, slotHeight, imageWidth, imageHeight) {
    if (
      !Number.isFinite(slotWidth) ||
      !Number.isFinite(slotHeight) ||
      !Number.isFinite(imageWidth) ||
      !Number.isFinite(imageHeight) ||
      slotWidth <= 0 ||
      slotHeight <= 0 ||
      imageWidth <= 0 ||
      imageHeight <= 0
    ) {
      return null;
    }

    const scale = Math.min(slotWidth / imageWidth, slotHeight / imageHeight);
    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;
    const emptyWidth = Math.max(0, slotWidth - renderedWidth);
    const emptyHeight = Math.max(0, slotHeight - renderedHeight);
    const fitTolerance = 0.5;
    const hasSideBars = emptyWidth > fitTolerance;
    const hasTopBottomBars = emptyHeight > fitTolerance;

    return {
      slotAspect: slotWidth / slotHeight,
      imageAspect: imageWidth / imageHeight,
      renderedWidth,
      renderedHeight,
      emptyWidth,
      emptyHeight,
      isLetterboxed: hasSideBars || hasTopBottomBars,
      status: hasSideBars
        ? 'Fits with side bars'
        : hasTopBottomBars
          ? 'Fits with top/bottom bars'
          : 'Fits exactly'
    };
  }

  function normalizeVersionValue(value) {
    return String(value || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  }

  function compareVersionValues(leftVersion, rightVersion) {
    const leftParts = normalizeVersionValue(leftVersion).split('.').map(function (part) {
      return clampInt(part, 0, 999999, 0);
    });
    const rightParts = normalizeVersionValue(rightVersion).split('.').map(function (part) {
      return clampInt(part, 0, 999999, 0);
    });
    const length = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < length; index += 1) {
      const left = leftParts[index] || 0;
      const right = rightParts[index] || 0;
      if (left > right) return 1;
      if (left < right) return -1;
    }

    return 0;
  }

  function getLoadedCssVersion() {
    return normalizeVersionValue(
      getComputedStyle(document.documentElement).getPropertyValue('--ptp-widescreen-css-version')
    );
  }

  function getVersionStatus() {
    const cssVersion = getLoadedCssVersion();
    if (!cssVersion) {
      return {
        ok: false,
        cssVersion: '',
        message: `Version check: userscript ${SCRIPT_VERSION}; widescreen.css version marker not found. Update widescreen.css.`
      };
    }

    const comparison = compareVersionValues(SCRIPT_VERSION, cssVersion);
    if (comparison < 0) {
      return {
        ok: false,
        cssVersion,
        message: `Version check: widescreen.css ${cssVersion} is newer than userscript ${SCRIPT_VERSION}. Update the userscript.`
      };
    }

    return {
      ok: true,
      cssVersion,
      message: `Version check: userscript ${SCRIPT_VERSION}; widescreen.css ${cssVersion}.`
    };
  }

  function updateVersionStatusElement(element) {
    if (!element) return;
    const status = getVersionStatus();
    element.textContent = status.message;
    element.classList.toggle('widescreen-controls__version-status--ok', status.ok);
    element.classList.toggle('widescreen-controls__version-status--warning', !status.ok);
    element.dataset.widescreenScriptVersion = SCRIPT_VERSION;
    element.dataset.widescreenCssVersion = status.cssVersion || '';
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
      const cssUnit = typeof variable.unit === 'string' ? variable.unit : 'px';
      root.style.setProperty(`--${variable.name}`, `${dimensions.settings[variable.name]}${cssUnit}`);
    }

    for (const pair of HEIGHT_FROM_WIDTH) {
      if (HEIGHT_VARS.some(function (variable) {
        return variable.name === pair.heightVar;
      })) {
        continue;
      }
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

    ensureHugeCoverImageFitObserver();
    scheduleHugeCoverImageFitRefresh();
    ensureSidebarCoverPathObserver();
    refreshSidebarCoverImagePaths(document, currentState);

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
    wrapper.dataset.widescreenScriptVersion = SCRIPT_VERSION;

    const body = document.createElement('div');
    body.className = 'panel__body';

    const title = document.createElement('h2');
    title.textContent = 'Widescreen Controls';

    const description = document.createElement('p');
    description.className = 'widescreen-controls__description';
    description.textContent = 'Adjust widescreen width and font-size variables. Keep linked scaling enabled to scale all linked settings together.';

    const versionStatus = document.createElement('p');
    versionStatus.className = 'widescreen-controls__version-status';
    updateVersionStatusElement(versionStatus);
    wrapper.dataset.widescreenCssVersion = versionStatus.dataset.widescreenCssVersion || '';

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
      const row = makeRangeRow(variable, controlsByName);
      if (!isPreviewOptionVariable(variable.name)) {
        controlsList.appendChild(row);
      }
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

    const originalSidebarCoverPathRow = makeCheckboxSettingRow({
      label: 'Use /i/ Sidebar Cover Images',
      checked: state.useOriginalSidebarCoverPath,
      onChange: function (checked) {
        state.useOriginalSidebarCoverPath = checked;
        coverImage.src = getPreferredSidebarCoverImageUrl(LAYOUT_PREVIEW_COVER_URL, state);
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
      originalSidebarCoverPathRow.input.checked = state.useOriginalSidebarCoverPath;
      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
      flashStatus('Defaults restored');
    });

    buttonRow.appendChild(saveButton);
    buttonRow.appendChild(resetButton);
    buttonRow.appendChild(status);

    const previewOptionsPanel = document.createElement('div');
    previewOptionsPanel.className = 'panel form--horizontal widescreen-controls__preview-options-panel';
    previewOptionsPanel.hidden = true;

    const previewOptionsBody = document.createElement('div');
    previewOptionsBody.className = 'panel__body';

    const previewOptionsTitle = document.createElement('h2');
    previewOptionsTitle.className = 'widescreen-controls__preview-options-title';
    previewOptionsTitle.textContent = 'Preview Options';

    const previewOptionsDescription = document.createElement('p');
    previewOptionsDescription.className = 'widescreen-controls__preview-options-description';
    previewOptionsDescription.textContent = 'Options specific to the active preview.';

    const previewOptionsList = document.createElement('div');
    previewOptionsList.className = 'widescreen-controls__list';

    const previewOptionsActions = document.createElement('div');
    previewOptionsActions.className = 'widescreen-controls__actions';

    const resetPreviewOptionsButton = document.createElement('button');
    resetPreviewOptionsButton.type = 'button';
    resetPreviewOptionsButton.textContent = 'Reset Preview Options';

    let activePreviewOptionVariableNames = null;

    resetPreviewOptionsButton.addEventListener('click', function () {
      if (!activePreviewOptionVariableNames && !originalSidebarCoverPathRow.row.hidden) return;
      for (const variable of SETTING_VARS) {
        if (!activePreviewOptionVariableNames.has(variable.name)) continue;
        state.overrides[variable.name] = variable.defaultValue;
        if (!state.linkedVariables) {
          state.linkedVariables = {};
        }
        if (variable.linkedByDefault === false) {
          state.linkedVariables[variable.name] = false;
        } else {
          delete state.linkedVariables[variable.name];
        }
      }
      if (!originalSidebarCoverPathRow.row.hidden) {
        state.useOriginalSidebarCoverPath = DEFAULT_STATE.useOriginalSidebarCoverPath;
        originalSidebarCoverPathRow.input.checked = state.useOriginalSidebarCoverPath;
      }
      applySettings(state);
      refreshIndividualControls(controlsByName, state);
      saveState(state);
      flashStatus('Preview options reset');
    });

    for (const variable of SETTING_VARS) {
      if (!isPreviewOptionVariable(variable.name)) continue;
      const controls = controlsByName[variable.name];
      if (!controls) continue;
      previewOptionsList.appendChild(controls.row);
    }

    previewOptionsList.appendChild(originalSidebarCoverPathRow.row);

    previewOptionsActions.appendChild(resetPreviewOptionsButton);
    previewOptionsBody.appendChild(previewOptionsTitle);
    previewOptionsBody.appendChild(previewOptionsDescription);
    previewOptionsBody.appendChild(previewOptionsList);
    previewOptionsBody.appendChild(previewOptionsActions);
    previewOptionsPanel.appendChild(previewOptionsBody);

    let previewTabsPanel = null;

    const layoutPage = document.createElement('div');
    layoutPage.className = 'thin widescreen-controls__layout-page';

    const pageTitle = document.createElement('h2');
    pageTitle.className = 'page__title widescreen-controls__layout-page-title';
    pageTitle.appendChild(document.createTextNode('Avatar: Fire and Ash [2025] by '));

    const artistInfoText = document.createElement('span');
    artistInfoText.className = 'artist-info-link';
    artistInfoText.textContent = 'James Cameron';
    pageTitle.appendChild(artistInfoText);

    const linkbox = document.createElement('div');
    linkbox.className = 'linkbox widescreen-controls__layout-linkbox';

    [
      '[Edit description]',
      '[View history]',
      '[Bookmark]',
      '[Profile Film]',
      '[Add format]',
      '[Request format]',
      '[I will encode this]',
      '[Refresh Data]',
      '[Subscribe]'
    ].forEach(function (labelText) {
      const linkText = document.createElement('span');
      linkText.className = 'linkbox__link';
      linkText.textContent = labelText;
      linkbox.appendChild(linkText);
    });

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
    coverImage.src = getPreferredSidebarCoverImageUrl(LAYOUT_PREVIEW_COVER_URL, state);

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

    layoutPage.appendChild(pageTitle);
    layoutPage.appendChild(linkbox);
    layoutPage.appendChild(sidebar);
    layoutPage.appendChild(mainColumn);

    const torrentsPhpPreview = document.createElement('div');
    torrentsPhpPreview.className = 'widescreen-controls__nested-layout widescreen-controls__torrents-php-preview';

    const torrentsPhpTabBar = document.createElement('div');
    torrentsPhpTabBar.className =
      'widescreen-controls__preview-tab-bar widescreen-controls__nested-layout-tabs';

    const hugeCoverLayoutPanel = document.createElement('div');
    hugeCoverLayoutPanel.className =
      'widescreen-controls__nested-layout-panel widescreen-controls__huge-preview';

    const hugeMovieList = document.createElement('div');
    hugeMovieList.className = 'huge-movie-list';

    const hugeMovie = document.createElement('div');
    hugeMovie.className = 'huge-movie-list__movie';

    const hugeCover = document.createElement('div');
    hugeCover.className = 'huge-movie-list__movie__cover';

    const hugeCoverLink = document.createElement('a');
    hugeCoverLink.className = 'huge-movie-list__movie__cover__link';
    hugeCoverLink.style.background = `url("${HUGE_PREVIEW_COVER.url}") center top / cover no-repeat`;

    const hugeDetails = document.createElement('div');
    hugeDetails.className = 'huge-movie-list__movie__details';

    function appendTextLink(parent, className, text) {
      const element = document.createElement('span');
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    }

    function appendAnchor(parent, className, text, href) {
      const element = document.createElement('a');
      element.href = href || '#';
      if (className) {
        element.className = className;
      }
      element.textContent = text;
      parent.appendChild(element);
      return element;
    }

    function appendRatingRow(parent, options) {
      const row = document.createElement('tr');
      const iconCell = document.createElement('td');
      const votesCell = document.createElement('td');
      const iconWrap = document.createElement(options.wrapIcon ? 'div' : 'span');
      const icon = document.createElement('img');
      const rating = document.createElement('span');

      iconCell.className = options.iconNobr
        ? 'nobr huge-movie-list__movie__ratings__icon-column'
        : 'huge-movie-list__movie__ratings__icon-column';
      iconCell.colSpan = 1;
      iconCell.width = '1%';
      votesCell.className = options.votesNobr
        ? 'nobr huge-movie-list__movie__ratings__votes-column'
        : 'huge-movie-list__movie__ratings__votes-column';
      if (options.votesColSpan) {
        votesCell.colSpan = options.votesColSpan;
      }
      votesCell.width = '99%';
      iconWrap.className = 'rating';
      icon.src = options.iconSrc;
      icon.title = options.iconTitle;
      icon.style.height = '32px';
      icon.style.width = '32px';
      rating.className = 'rating';
      rating.textContent = options.ratingText;

      iconWrap.appendChild(icon);
      iconCell.appendChild(iconWrap);
      votesCell.appendChild(rating);
      if (options.outOfText) {
        const mid = document.createElement('span');
        const outOf = document.createElement('span');
        mid.className = 'mid';
        mid.textContent = ' / ';
        outOf.className = 'outof';
        outOf.textContent = options.outOfText;
        votesCell.appendChild(document.createTextNode(' '));
        votesCell.appendChild(mid);
        votesCell.appendChild(outOf);
      }
      if (options.votesText) {
        votesCell.appendChild(document.createElement('br'));
        if (options.votesAsRating) {
          const votesRating = document.createElement('span');
          votesRating.className = 'rating';
          votesRating.textContent = options.votesText;
          votesCell.appendChild(votesRating);
        } else {
          votesCell.appendChild(document.createTextNode(options.votesText));
        }
      }
      row.appendChild(iconCell);
      row.appendChild(votesCell);
      parent.appendChild(row);
    }

    const listViewPanel = document.createElement('div');
    listViewPanel.className =
      'widescreen-controls__nested-layout-panel widescreen-controls__list-preview';

    const listViewTable = document.createElement('table');
    listViewTable.className =
      'torrent_table grouping table table--panel-like table--bordered basic-movie-list widescreen-controls__list-preview-table';

    const listViewHead = document.createElement('thead');
    const listViewHeaderRow = document.createElement('tr');

    const listViewEmptyHeader = document.createElement('th');
    listViewEmptyHeader.className = 'small';
    listViewHeaderRow.appendChild(listViewEmptyHeader);

    const listViewNameHeader = document.createElement('th');
    listViewNameHeader.width = '100%';
    appendAnchor(
      listViewNameHeader,
      '',
      'Name',
      'https://passthepopcorn.me/torrents.php?order_by=title&order_way=desc'
    );
    listViewNameHeader.appendChild(document.createTextNode(' / '));
    appendAnchor(
      listViewNameHeader,
      '',
      'Year',
      'https://passthepopcorn.me/torrents.php?order_by=year&order_way=desc'
    );
    listViewNameHeader.appendChild(document.createTextNode(' / '));
    appendAnchor(
      listViewNameHeader,
      '',
      'IMDb Rating',
      'https://passthepopcorn.me/torrents.php?order_by=imdb&order_way=desc'
    );
    listViewHeaderRow.appendChild(listViewNameHeader);

    function appendImageHeader(options) {
      const header = document.createElement('th');
      if (options.className) {
        header.className = options.className;
      }
      const link = appendAnchor(header, '', '', options.href);
      const image = document.createElement('img');
      image.src = options.src;
      image.alt = options.alt;
      image.title = options.title;
      if (options.height) {
        image.height = options.height;
      }
      if (options.width) {
        image.width = options.width;
      }
      link.appendChild(image);
      listViewHeaderRow.appendChild(header);
    }

    appendImageHeader({
      href: 'https://passthepopcorn.me/torrents.php?order_by=time&order_way=desc',
      src: 'static/common/time.png',
      alt: 'Time',
      title: 'Time',
      height: 12,
      width: 12
    });

    const listViewSizeHeader = document.createElement('th');
    appendAnchor(
      listViewSizeHeader,
      '',
      'Size',
      'https://passthepopcorn.me/torrents.php?order_by=size&order_way=desc'
    );
    listViewHeaderRow.appendChild(listViewSizeHeader);

    appendImageHeader({
      className: 'sign',
      href: 'https://passthepopcorn.me/torrents.php?order_by=snatched&order_way=desc',
      src: 'static/styles/dark/images/snatched.png',
      alt: 'Snatches',
      title: 'Snatches'
    });
    appendImageHeader({
      className: 'sign',
      href: 'https://passthepopcorn.me/torrents.php?order_by=seeders&order_way=desc',
      src: 'static/styles/dark/images/seeders.png',
      alt: 'Seeders',
      title: 'Seeders'
    });
    appendImageHeader({
      className: 'sign',
      href: 'https://passthepopcorn.me/torrents.php?order_by=leechers&order_way=desc',
      src: 'static/styles/dark/images/leechers.png',
      alt: 'Leechers',
      title: 'Leechers'
    });

    listViewHead.appendChild(listViewHeaderRow);
    listViewTable.appendChild(listViewHead);

    const listViewBody = document.createElement('tbody');

    const listDetailsRow = document.createElement('tr');
    listDetailsRow.className = 'basic-movie-list__details-row';

    const listCoverCell = document.createElement('td');
    listCoverCell.rowSpan = 5;

    const listCoverLink = document.createElement('a');
    listCoverLink.href = 'torrents.php?id=278335';
    listCoverLink.className = 'basic-movie-list__movie__cover-link';

    const listCoverImage = document.createElement('img');
    listCoverImage.src = 'https://passthepopcorn.me/p/RF1Jm8oizsz.jpg';
    listCoverImage.className = 'basic-movie-list__movie__cover';
    listCoverImage.alt = 'El Rey de la Fiesta cover preview';

    listCoverLink.appendChild(listCoverImage);
    listCoverCell.appendChild(listCoverLink);

    const listMovieDetailsCell = document.createElement('td');
    listMovieDetailsCell.colSpan = 1;

    const listTitleRow = document.createElement('span');
    listTitleRow.className = 'basic-movie-list__movie__title-row';

    appendAnchor(
      listTitleRow,
      'basic-movie-list__movie__title',
      'El Rey de la Fiesta',
      'torrents.php?id=278335'
    );
    listTitleRow.appendChild(document.createTextNode(' '));

    const listYear = document.createElement('span');
    listYear.className = 'basic-movie-list__movie__year';
    listYear.textContent = '[2021]';
    listTitleRow.appendChild(listYear);

    const listDirectorList = document.createElement('span');
    listDirectorList.className = 'basic-movie-list__movie__director-list';
    listDirectorList.appendChild(document.createTextNode(' by '));
    appendAnchor(
      listDirectorList,
      'artist-info-link',
      'Salomón Askenazi',
      'artist.php?id=1251612'
    );
    listTitleRow.appendChild(listDirectorList);
    listTitleRow.appendChild(document.createTextNode(' '));

    const listNewLink = appendAnchor(listTitleRow, 'basic-movie-list__movie__new', '(New)', '#');
    listNewLink.dataset.new = '1777853947';
    listNewLink.title = 'Remove the new mark from this and all older torrents.';

    const listBookmark = document.createElement('span');
    listBookmark.className = 'basic-movie-list__movie__bookmark';
    appendAnchor(listBookmark, '', 'Bookmark', '#');

    const listRatingsAndTags = document.createElement('div');
    listRatingsAndTags.className = 'basic-movie-list__movie__ratings-and-tags';

    const listRatingContainer = document.createElement('div');
    listRatingContainer.className = 'basic-movie-list__movie__rating-container';

    const listRatingTitle = document.createElement('span');
    listRatingTitle.className = 'basic-movie-list__movie__rating__title';
    const listImdbLink = appendAnchor(listRatingTitle, '', 'IMDb', 'https://www.imdb.com/title/tt11062632/');
    listImdbLink.target = '_blank';
    listImdbLink.rel = 'noreferrer';
    listRatingTitle.appendChild(document.createTextNode(': '));

    const listRatingValue = document.createElement('span');
    listRatingValue.className = 'basic-movie-list__movie__rating__rating';
    listRatingValue.textContent = '5.9';

    listRatingContainer.appendChild(listRatingTitle);
    listRatingContainer.appendChild(listRatingValue);

    const listTags = document.createElement('span');
    listTags.className = 'basic-movie-list__movie__tags';
    appendAnchor(
      listTags,
      'basic-movie-list__movie__tag',
      'drama',
      'torrents.php?taglist=drama&cover=1'
    );
    listTags.appendChild(document.createTextNode(', '));
    appendAnchor(
      listTags,
      'basic-movie-list__movie__tag',
      'thriller',
      'torrents.php?taglist=thriller&cover=1'
    );

    listRatingsAndTags.appendChild(listRatingContainer);
    listRatingsAndTags.appendChild(document.createTextNode(' '));
    listRatingsAndTags.appendChild(listTags);
    listMovieDetailsCell.appendChild(listTitleRow);
    listMovieDetailsCell.appendChild(listBookmark);
    listMovieDetailsCell.appendChild(listRatingsAndTags);

    const listAggregateTimeCell = document.createElement('td');
    listAggregateTimeCell.className = 'nobr';
    const listAggregateTime = document.createElement('span');
    listAggregateTime.className = 'time';
    listAggregateTime.title = 'May 04 2026, 00:19';
    listAggregateTime.textContent = '4 mins ago';
    listAggregateTimeCell.appendChild(listAggregateTime);

    const listAggregateSizeCell = document.createElement('td');
    listAggregateSizeCell.className = 'nobr';
    listAggregateSizeCell.textContent = '4.96 GiB (Max)';

    const listAggregateSnatchesCell = document.createElement('td');
    listAggregateSnatchesCell.textContent = '15';

    const listAggregateSeedersCell = document.createElement('td');
    listAggregateSeedersCell.className = 'no-seeders';
    listAggregateSeedersCell.textContent = '0';

    const listAggregateLeechersCell = document.createElement('td');
    listAggregateLeechersCell.textContent = '0';

    listDetailsRow.appendChild(listCoverCell);
    listDetailsRow.appendChild(listMovieDetailsCell);
    listDetailsRow.appendChild(listAggregateTimeCell);
    listDetailsRow.appendChild(listAggregateSizeCell);
    listDetailsRow.appendChild(listAggregateSnatchesCell);
    listDetailsRow.appendChild(listAggregateSeedersCell);
    listDetailsRow.appendChild(listAggregateLeechersCell);

    const listEditionRow = document.createElement('tr');
    listEditionRow.className = 'basic-movie-list__torrent-row';

    const listEditionCell = document.createElement('td');
    listEditionCell.colSpan = 7;
    listEditionCell.className = 'basic-movie-list__torrent-edition';

    const listEditionMain = document.createElement('span');
    listEditionMain.className = 'basic-movie-list__torrent-edition__main';
    listEditionMain.textContent = 'Feature Film';

    const listEditionSub = document.createElement('span');
    listEditionSub.className = 'basic-movie-list__torrent-edition__sub';
    listEditionSub.textContent = 'High Definition';

    listEditionCell.appendChild(listEditionMain);
    listEditionCell.appendChild(document.createTextNode(' - '));
    listEditionCell.appendChild(listEditionSub);
    listEditionRow.appendChild(listEditionCell);

    function appendListTorrentRow(options) {
      const row = document.createElement('tr');
      row.className = 'basic-movie-list__torrent-row';

      const mainCell = document.createElement('td');

      const action = document.createElement('span');
      action.className = 'basic-movie-list__torrent__action';
      action.appendChild(document.createTextNode('['));
      const downloadLink = appendAnchor(
        action,
        'basic-movie-list__torrent__action__link',
        'DL',
        options.downloadHref
      );
      downloadLink.title = 'Download';
      action.appendChild(document.createTextNode(']'));

      const infoWrap = document.createElement('span');
      infoWrap.appendChild(document.createTextNode(`${options.marker} `));

      const infoLink = appendAnchor(infoWrap, 'torrent-info-link', options.infoText, options.infoHref);
      infoLink.title = options.title;
      if (options.trumpable) {
        infoLink.appendChild(document.createTextNode(' / '));
        const trumpable = document.createElement('span');
        trumpable.className = 'torrent-info__trumpable';
        trumpable.textContent = 'Trumpable';
        infoLink.appendChild(trumpable);
      }

      mainCell.appendChild(action);
      mainCell.appendChild(infoWrap);

      const timeCell = document.createElement('td');
      timeCell.className = 'nobr';
      const time = document.createElement('span');
      time.className = 'time';
      time.title = options.timeTitle;
      time.textContent = options.time;
      timeCell.appendChild(time);

      const sizeCell = document.createElement('td');
      sizeCell.className = 'nobr';
      sizeCell.textContent = options.size;

      const snatchesCell = document.createElement('td');
      snatchesCell.textContent = options.snatches;

      const seedersCell = document.createElement('td');
      seedersCell.className = options.seeders === '0' ? 'no-seeders' : '';
      seedersCell.textContent = options.seeders;

      const leechersCell = document.createElement('td');
      leechersCell.textContent = options.leechers;

      row.appendChild(mainCell);
      row.appendChild(timeCell);
      row.appendChild(sizeCell);
      row.appendChild(snatchesCell);
      row.appendChild(seedersCell);
      row.appendChild(leechersCell);
      listViewBody.appendChild(row);
    }

    listViewBody.appendChild(listDetailsRow);
    listViewBody.appendChild(listEditionRow);
    [
      {
        marker: '☑',
        infoText: 'x264 / MKV / WEB / 720p',
        infoHref: 'torrents.php?id=278335&torrentid=1029526',
        title: 'El Rey de la Fiesta (2021)',
        downloadHref: 'torrents.php?action=download&id=1029526',
        time: '4 years ago',
        timeTitle: 'Apr 11 2022, 20:20',
        size: '2.59 GiB',
        snatches: '8',
        seeders: '0',
        leechers: '0',
        trumpable: true
      },
      {
        marker: '☐',
        infoText: 'H.264 / MKV / WEB / 1080p',
        infoHref: 'torrents.php?id=278335&torrentid=1514657',
        title: 'El.Rey.de.la.fiesta.2022.1080p.AMZN.WEB-DL DDP5.1.H.264-Tequila',
        downloadHref: 'torrents.php?action=download&id=1514657',
        time: '4 mins ago',
        timeTitle: 'May 04 2026, 00:19',
        size: '4.95 GiB',
        snatches: '0',
        seeders: '0',
        leechers: '0',
        trumpable: false
      },
      {
        marker: '☑',
        infoText: 'H.264 / MKV / WEB / 1080p',
        infoHref: 'torrents.php?id=278335&torrentid=1044358',
        title: 'El.Rey.de.la.Fiesta.2021.SPANISH.1080p.AMZN.WEB-DL.DDP5.1.H.264-THR',
        downloadHref: 'torrents.php?action=download&id=1044358',
        time: '3 years ago',
        timeTitle: 'Jun 02 2022, 12:23',
        size: '4.96 GiB',
        snatches: '7',
        seeders: '0',
        leechers: '0',
        trumpable: true
      }
    ].forEach(appendListTorrentRow);

    listViewTable.appendChild(listViewBody);
    listViewPanel.appendChild(listViewTable);

    const listViewFitItem = {
      title: 'El Rey de la Fiesta',
      naturalWidth: 0,
      naturalHeight: 0,
      loadState: 'loading',
      statusCell: null,
      aspectCell: null,
      fitCell: null
    };

    const listViewFitPanel = document.createElement('div');
    listViewFitPanel.className = 'widescreen-controls__cover-view-fit widescreen-controls__list-view-fit';

    const listViewFitSummary = document.createElement('div');
    listViewFitSummary.className = 'widescreen-controls__cover-view-fit-summary';

    const listViewFitGrid = document.createElement('div');
    listViewFitGrid.className = 'widescreen-controls__cover-view-fit-grid';

    ['Cover', 'Status', 'Aspect', 'Fit'].forEach(function (headingText) {
      const heading = document.createElement('div');
      heading.className = 'widescreen-controls__cover-view-fit-heading';
      heading.textContent = headingText;
      listViewFitGrid.appendChild(heading);
    });

    const listViewFitTitle = document.createElement('div');
    listViewFitTitle.className = 'widescreen-controls__cover-view-fit-cell';
    listViewFitTitle.textContent = listViewFitItem.title;
    listViewFitTitle.title = listViewFitItem.title;

    listViewFitItem.statusCell = document.createElement('div');
    listViewFitItem.statusCell.className = 'widescreen-controls__cover-view-fit-cell';

    listViewFitItem.aspectCell = document.createElement('div');
    listViewFitItem.aspectCell.className = 'widescreen-controls__cover-view-fit-cell';

    listViewFitItem.fitCell = document.createElement('div');
    listViewFitItem.fitCell.className = 'widescreen-controls__cover-view-fit-cell';

    listViewFitGrid.appendChild(listViewFitTitle);
    listViewFitGrid.appendChild(listViewFitItem.statusCell);
    listViewFitGrid.appendChild(listViewFitItem.aspectCell);
    listViewFitGrid.appendChild(listViewFitItem.fitCell);

    listViewFitPanel.appendChild(listViewFitSummary);
    listViewFitPanel.appendChild(listViewFitGrid);
    listViewPanel.appendChild(listViewFitPanel);

    function updateListViewFitPreview(dimensions) {
      const coverWidth = dimensions.widths['basic-movie-cover-width'];
      const coverHeight = dimensions.heights['basic-movie-cover-height'];
      if (!Number.isFinite(coverWidth) || !Number.isFinite(coverHeight)) return;

      listViewFitItem.statusCell.className = 'widescreen-controls__cover-view-fit-cell';
      listViewFitItem.aspectCell.textContent = '';
      listViewFitItem.fitCell.textContent = '';

      if (listViewFitItem.loadState === 'loading') {
        listViewFitSummary.textContent = `${coverWidth}px x ${coverHeight}px slot; loading cover; 0 cropped`;
        listViewFitItem.statusCell.textContent = 'Loading image';
        return;
      }

      if (listViewFitItem.loadState !== 'loaded') {
        listViewFitSummary.textContent = `${coverWidth}px x ${coverHeight}px slot; cover unavailable; 0 cropped`;
        listViewFitItem.statusCell.textContent = 'Image unavailable';
        return;
      }

      const fitMetrics = computeContainFitMetrics(
        coverWidth,
        coverHeight,
        listViewFitItem.naturalWidth,
        listViewFitItem.naturalHeight
      );
      if (!fitMetrics) return;

      listViewFitSummary.textContent = `${coverWidth}px x ${coverHeight}px slot; ${
        fitMetrics.isLetterboxed ? '1 cover letterboxed' : 'cover fits exactly'
      }; 0 cropped`;
      listViewFitItem.statusCell.textContent = fitMetrics.status;
      listViewFitItem.statusCell.classList.add(
        fitMetrics.isLetterboxed
          ? 'widescreen-controls__cover-view-fit-cell--letterboxed'
          : 'widescreen-controls__cover-view-fit-cell--fits'
      );
      listViewFitItem.aspectCell.textContent = `slot ${fitMetrics.slotAspect.toFixed(3)}; image ${fitMetrics.imageAspect.toFixed(3)}`;
      listViewFitItem.fitCell.textContent = fitMetrics.isLetterboxed
        ? `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px; empty ${Math.round(
            fitMetrics.emptyWidth
          )}px wide, ${Math.round(fitMetrics.emptyHeight)}px tall`
        : `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px`;
    }

    const listViewFitImage = new Image();
    listViewFitImage.onload = function () {
      listViewFitItem.naturalWidth = listViewFitImage.naturalWidth;
      listViewFitItem.naturalHeight = listViewFitImage.naturalHeight;
      listViewFitItem.loadState =
        listViewFitItem.naturalWidth > 0 && listViewFitItem.naturalHeight > 0 ? 'loaded' : 'error';
      updateListViewFitPreview(computeFinalDimensions(state));
    };
    listViewFitImage.onerror = function () {
      listViewFitItem.loadState = 'error';
      updateListViewFitPreview(computeFinalDimensions(state));
    };
    listViewFitImage.src = listCoverImage.src;

    registerPreviewListener(updateListViewFitPreview);

    const hugeTitleRow = document.createElement('div');
    hugeTitleRow.className = 'huge-movie-list__movie__title-row';

    const hugeTitle = document.createElement('span');
    hugeTitle.className = 'huge-movie-list__movie__title';
    hugeTitle.title = 'View Torrent';
    hugeTitle.textContent = 'Ebony & Ivory AKA Ebony and Ivory';

    const hugeYear = document.createElement('span');
    hugeYear.className = 'huge-movie-list__movie__year';
    hugeYear.textContent = ' (2024)';

    const hugeDirectorList = document.createElement('span');
    hugeDirectorList.className = 'huge-movie-list__movie__director-list';
    hugeDirectorList.appendChild(document.createTextNode(' by '));
    appendTextLink(hugeDirectorList, 'huge-movie-list__movie__director', 'Jim Hosking');

    const hugeNew = document.createElement('span');
    hugeNew.className = 'huge-movie-list__movie__new';
    hugeNew.dataset.new = '1776234587';
    hugeNew.title = 'Remove the new mark from this and all older torrents.';
    hugeNew.textContent = ' (New)';

    hugeTitleRow.appendChild(hugeTitle);
    hugeTitleRow.appendChild(document.createTextNode(' '));
    hugeTitleRow.appendChild(hugeYear);
    hugeTitleRow.appendChild(hugeDirectorList);
    hugeTitleRow.appendChild(hugeNew);

    const hugeTagList = document.createElement('div');
    hugeTagList.className = 'huge-movie-list__movie__tag-list';
    appendTextLink(hugeTagList, 'cover-movie-list__movie__tag', 'comedy');
    hugeTagList.appendChild(document.createTextNode(', '));
    appendTextLink(hugeTagList, 'cover-movie-list__movie__tag', 'musical');

    const hugeRatingsAndSynopsis = document.createElement('table');
    hugeRatingsAndSynopsis.className = 'huge-movie-list__movie__ratings-and-synopsis';

    const hugeRatingsBody = document.createElement('tbody');
    const hugeRatingsRow = document.createElement('tr');

    const hugeRatingsCell = document.createElement('td');
    hugeRatingsCell.width = '1%';

    const hugeRatings = document.createElement('table');
    hugeRatings.className = 'huge-movie-list__movie__ratings';
    const hugeRatingsInnerBody = document.createElement('tbody');
    appendRatingRow(hugeRatingsInnerBody, {
      iconSrc: 'static/common/ratings/x1_imdb.png',
      iconTitle: 'IMDb',
      iconNobr: true,
      votesNobr: true,
      ratingText: '5.0',
      outOfText: ' 10',
      votesText: '(299 votes)'
    });
    appendRatingRow(hugeRatingsInnerBody, {
      iconSrc: 'static/common/ratings/x2_metacritic.png',
      iconTitle: 'Metacritic',
      iconNobr: true,
      votesNobr: false,
      ratingText: '49',
      outOfText: ' 100',
      votesText: ''
    });
    appendRatingRow(hugeRatingsInnerBody, {
      iconSrc: 'static/common/ratings/x4_ptp.png',
      iconTitle: 'User Ratings',
      iconNobr: false,
      votesNobr: true,
      votesColSpan: 1,
      wrapIcon: true,
      ratingText: '71%',
      outOfText: '',
      votesText: ' (10 votes)',
      votesAsRating: true
    });
    hugeRatings.appendChild(hugeRatingsInnerBody);

    const hugeSynopsisCell = document.createElement('td');
    hugeSynopsisCell.width = '99%';

    const hugeSynopsis = document.createElement('div');
    hugeSynopsis.className = 'huge-movie-list__movie__synopsis';
    hugeSynopsis.textContent =
      'Two musical legends gather at a Scottish Cottage on The Mull Of Kintyre for a tense summit to discuss a potential collaboration that will ultimately result in a Global Number One smash hit single.';

    const hugeActionRow = document.createElement('div');
    hugeActionRow.className = 'huge-movie-list__movie__action-row';
    appendTextLink(hugeActionRow, 'huge-movie-list__movie__trailer', 'Trailer');
    hugeActionRow.appendChild(document.createTextNode('  |  '));
    appendTextLink(hugeActionRow, 'huge-movie-list__movie__bookmark', 'Bookmark');
    hugeActionRow.appendChild(document.createTextNode('  |  '));
    appendTextLink(hugeActionRow, 'huge-movie-list__movie__rate', 'Rate');

    const hugeTorrentSummary = document.createElement('div');
    hugeTorrentSummary.className = 'huge-movie-list__movie__torrent-summary';

    [
      ['SD:', 'x264, DVD image'],
      ['HD:', '720p, 1080p, Remux, Blu-ray image'],
      ['UHD:', '2160p'],
      ['Latest:', '☑ DVD5 / VOB IFO / DVD / NTSC']
    ].forEach(function ([titleText, valueText], index) {
      const row = document.createElement('div');
      const title = document.createElement('span');
      const value = document.createElement('span');

      row.className = 'huge-movie-list__movie__torrent-summary__row';
      if (index === 3) {
        row.className += ' huge-movie-list__movie__torrent-summary__latest-row';
      }
      title.className = 'huge-movie-list__movie__torrent-summary__row__title';
      title.textContent = titleText;
      value.textContent = ` ${valueText}`;
      row.appendChild(title);
      row.appendChild(value);
      hugeTorrentSummary.appendChild(row);
    });

    const hugeFitReadout = document.createElement('div');
    hugeFitReadout.className = 'widescreen-controls__huge-preview-fit';

    function buildHugeFitMetric(labelText) {
      const metric = document.createElement('div');
      const label = document.createElement('div');
      const value = document.createElement('div');

      label.className = 'widescreen-controls__huge-preview-fit-label';
      label.textContent = labelText;
      value.className = 'widescreen-controls__huge-preview-fit-value';

      metric.appendChild(label);
      metric.appendChild(value);
      hugeFitReadout.appendChild(metric);

      return value;
    }

    const hugeFitStatus = buildHugeFitMetric('Fit status');
    hugeFitStatus.classList.add('widescreen-controls__huge-preview-fit-status');
    const hugeSlotSize = buildHugeFitMetric('Slot');
    const hugeAspect = buildHugeFitMetric('Aspect');
    const hugeCropAmount = buildHugeFitMetric('Crop');

    hugeCover.appendChild(hugeCoverLink);
    hugeRatingsCell.appendChild(hugeRatings);
    hugeRatingsRow.appendChild(hugeRatingsCell);
    hugeSynopsisCell.appendChild(hugeSynopsis);
    hugeRatingsRow.appendChild(hugeSynopsisCell);
    hugeRatingsBody.appendChild(hugeRatingsRow);
    hugeRatingsAndSynopsis.appendChild(hugeRatingsBody);
    hugeDetails.appendChild(hugeTitleRow);
    hugeDetails.appendChild(hugeTagList);
    hugeDetails.appendChild(hugeRatingsAndSynopsis);
    hugeDetails.appendChild(hugeActionRow);
    hugeDetails.appendChild(hugeTorrentSummary);
    hugeMovie.appendChild(hugeCover);
    hugeMovie.appendChild(hugeDetails);
    hugeMovieList.appendChild(hugeMovie);
    hugeCoverLayoutPanel.appendChild(hugeMovieList);
    hugeCoverLayoutPanel.appendChild(hugeFitReadout);

    const torrentsPhpDefinitions = [
      {
        key: 'huge',
        label: 'Huge View',
        panel: hugeCoverLayoutPanel,
        optionVariableNames: TORRENTS_PHP_HUGE_PREVIEW_VARIABLE_NAMES,
        optionTitle: 'Huge View Preview Options',
        optionDescription: 'Options specific to the active torrents.php Huge View preview.'
      },
      {
        key: 'list',
        label: 'List View',
        panel: listViewPanel,
        optionVariableNames: TORRENTS_PHP_LIST_PREVIEW_VARIABLE_NAMES,
        optionTitle: 'List View Preview Options',
        optionDescription: 'Options specific to the active torrents.php List View preview.'
      }
    ];
    const torrentsPhpTabsByKey = {};
    let activeTorrentsPhpTabKey = 'huge';

    function getActiveTorrentsPhpDefinition() {
      return (
        torrentsPhpDefinitions.find(function (definition) {
          return definition.key === activeTorrentsPhpTabKey;
        }) || torrentsPhpDefinitions[0]
      );
    }

    function setActiveTorrentsPhpTab(key) {
      activeTorrentsPhpTabKey = key;
      for (const definition of torrentsPhpDefinitions) {
        const isActive = definition.key === key;
        const controls = torrentsPhpTabsByKey[definition.key];
        if (controls) {
          controls.button.classList.toggle('widescreen-controls__preview-tab--active', isActive);
        }
        definition.panel.hidden = !isActive;
      }
      if (activePreviewOptionVariableNames) {
        const activeDefinition = getActiveTorrentsPhpDefinition();
        activePreviewOptionVariableNames = activeDefinition.optionVariableNames;
        previewOptionsTitle.textContent = activeDefinition.optionTitle;
        previewOptionsDescription.textContent = activeDefinition.optionDescription;
        for (const variable of SETTING_VARS) {
          if (!isPreviewOptionVariable(variable.name)) continue;
          const controls = controlsByName[variable.name];
          if (!controls) continue;
          controls.row.hidden = !activePreviewOptionVariableNames.has(variable.name);
        }
      }
      schedulePreviewRefresh();
    }

    torrentsPhpDefinitions.forEach(function (definition) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'widescreen-controls__preview-tab';
      button.textContent = definition.label;
      button.addEventListener('mousedown', function (event) {
        event.preventDefault();
      });
      button.addEventListener('click', function () {
        setActiveTorrentsPhpTab(definition.key);
      });

      torrentsPhpTabBar.appendChild(button);
      torrentsPhpTabsByKey[definition.key] = { button };
    });

    torrentsPhpPreview.appendChild(torrentsPhpTabBar);
    torrentsPhpPreview.appendChild(hugeCoverLayoutPanel);
    torrentsPhpPreview.appendChild(listViewPanel);

    let top10Preview = null;

    function updateLayoutPreview(dimensions) {
      const wrapperWidth = dimensions.widths['layout-width'];
      const sidebarWidth = dimensions.widths['sidebar-width'];
      const bbcodeWidth = dimensions.widths['bbcode-image-default-width'];
      if (!Number.isFinite(wrapperWidth) || !Number.isFinite(sidebarWidth) || !Number.isFinite(bbcodeWidth)) return;

      const previewMetrics = getLayoutPreviewMetrics(dimensions);
      const contentInnerWidth = Math.max(0, wrapperWidth - previewMetrics.contentHorizontalInset);
      const mainColumnWidth = Math.max(0, contentInnerWidth - sidebarWidth - previewMetrics.sidebarGap);
      const clampedBbcodeWidth = Math.min(bbcodeWidth, mainColumnWidth);

      const availableWidth = Math.max(80, layoutPage.parentElement ? layoutPage.parentElement.clientWidth : layoutPage.clientWidth);
      const fitScale = Math.min(1, availableWidth / Math.max(wrapperWidth, 1));
      const scaledSidebarWidth = Math.max(20, Math.round(sidebarWidth * fitScale));
      const scaledGapWidth = Math.max(
        previewMetrics.sidebarGap > 0 ? 4 : 0,
        Math.round(previewMetrics.sidebarGap * fitScale)
      );
      document.documentElement.style.setProperty('--widescreen-preview-content-width', `${contentInnerWidth}px`);
      torrentsPhpPreview.style.width = `${contentInnerWidth}px`;
      if (top10Preview) {
        top10Preview.style.width = `${contentInnerWidth}px`;
      }
      layoutPage.style.width = `${contentInnerWidth}px`;
      if (previewTabsPanel) {
        previewTabsPanel.style.width = `${contentInnerWidth}px`;
      }
      sidebar.style.width = `${sidebarWidth}px`;
      mainColumn.style.marginRight = `${sidebarWidth + previewMetrics.sidebarGap}px`;

      mainSize.textContent = `Main column: ${mainColumnWidth}px`;
      bbcodeSize.textContent = `BBCode: ${clampedBbcodeWidth}px`;
      sidebarSize.textContent = `Sidebar: ${sidebarWidth}px`;
    }

    function updateHugeCoverPreview(dimensions) {
      const coverWidth = dimensions.widths['torrents-huge-movie-width'];
      const coverHeight = dimensions.heights['torrents-huge-movie-height'];
      if (!Number.isFinite(coverWidth) || !Number.isFinite(coverHeight)) return;

      const fitMetrics = computeContainFitMetrics(
        coverWidth,
        coverHeight,
        HUGE_PREVIEW_COVER.width,
        HUGE_PREVIEW_COVER.height
      );
      if (!fitMetrics) return;

      hugeCoverLayoutPanel.classList.remove('widescreen-controls__huge-preview--cropped');
      hugeSlotSize.textContent = `${coverWidth}px x ${coverHeight}px; image ${HUGE_PREVIEW_COVER.width}px x ${HUGE_PREVIEW_COVER.height}px`;
      hugeAspect.textContent = `slot ${fitMetrics.slotAspect.toFixed(3)}; image ${fitMetrics.imageAspect.toFixed(3)}`;
      hugeCropAmount.textContent = fitMetrics.isLetterboxed
        ? `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px; empty ${Math.round(
            fitMetrics.emptyWidth
          )}px wide, ${Math.round(fitMetrics.emptyHeight)}px tall`
        : `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px`;
      hugeFitStatus.textContent = fitMetrics.status;
    }

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

      coverImage.src = getPreferredSidebarCoverImageUrl(LAYOUT_PREVIEW_COVER_URL, state);

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
    registerPreviewListener(updateHugeCoverPreview);
    registerPreviewListener(updateCoverPreview);
    globalThis.addEventListener('resize', function () {
      const dimensions = computeFinalDimensions(state);
      updateLayoutPreview(dimensions);
      updateHugeCoverPreview(dimensions);
      updateCoverPreview(dimensions);
    });

    const coverViewPreview = document.createElement('div');
    coverViewPreview.className = 'widescreen-controls__cover-view-preview';

    const coverViewContainer = document.createElement('div');
    coverViewContainer.className = 'cover-movie-list__container cover-movie-list__container--centered';

    const coverMovieList = document.createElement('div');
    coverMovieList.className = 'cover-movie-list';
    const coverViewFitItems = [];

    function appendCoverTag(parent, tag) {
      appendAnchor(parent, 'cover-movie-list__movie__tag', tag, `torrents.php?taglist=${tag}&cover=1`);
    }

    function appendCoverMovie(movie) {
      const item = document.createElement('div');
      item.className = 'cover-movie-list__movie';

      const coverLink = document.createElement('a');
      coverLink.className = 'cover-movie-list__movie__cover-link';
      coverLink.href = `torrents.php?id=${movie.id}`;
      coverLink.style.background = `url("${movie.cover}") center top / cover no-repeat`;
      coverLink.title = movie.title;

      const undercover = document.createElement('div');
      undercover.className = 'cover-movie-list__movie__undercover';

      const titleRow = document.createElement('div');
      titleRow.className = 'cover-movie-list__movie__title-row';
      appendAnchor(titleRow, 'cover-movie-list__movie__title', movie.title, `torrents.php?id=${movie.id}`);
      titleRow.appendChild(document.createTextNode(' '));

      const year = document.createElement('span');
      year.className = 'cover-movie-list__movie__year';
      year.textContent = `[${movie.year}]`;
      titleRow.appendChild(year);
      titleRow.appendChild(document.createTextNode(' '));

      const newLink = appendAnchor(titleRow, 'cover-movie-list__movie__new', '(New)', '#');
      newLink.dataset.new = movie.newId;
      newLink.title = 'Remove the new mark from this and all older torrents.';

      const ratingAndTags = document.createElement('div');
      ratingAndTags.className = 'cover-movie-list__movie__rating-and-tags';

      const rating = appendAnchor(
        ratingAndTags,
        'cover-movie-list__movie__rating',
        movie.rating,
        `https://www.imdb.com/title/${movie.imdb}/`
      );
      rating.target = '_blank';
      rating.rel = 'noreferrer';

      const tags = document.createElement('span');
      tags.className = 'cover-movie-list__movie__tags';
      movie.tags.forEach(function (tag, index) {
        if (index > 0) {
          tags.appendChild(document.createTextNode(', '));
        }
        appendCoverTag(tags, tag);
      });

      ratingAndTags.appendChild(tags);
      undercover.appendChild(titleRow);
      undercover.appendChild(ratingAndTags);
      item.appendChild(coverLink);
      item.appendChild(undercover);
      coverMovieList.appendChild(item);

      coverViewFitItems.push({
        movie,
        coverLink,
        naturalWidth: 0,
        naturalHeight: 0,
        loadState: 'loading',
        statusCell: null,
        slotCell: null,
        aspectCell: null,
        cropCell: null
      });
    }

    [
      {
        id: '123969',
        title: 'Angels Fall',
        year: '2007',
        rating: '5.7',
        imdb: 'tt0869921',
        cover: 'https://passthepopcorn.me/p/UjsaDxssQ2M.jpg',
        newId: '1777857506',
        tags: ['drama', 'romance', 'thriller']
      },
      {
        id: '130995',
        title: 'Blue Smoke',
        year: '2007',
        rating: '5.5',
        imdb: 'tt0893397',
        cover: 'https://passthepopcorn.me/p/MMUeBE4KA7q.jpg',
        newId: '1777857466',
        tags: ['drama', 'romance', 'thriller']
      },
      {
        id: '411527',
        title: 'A Big Gay Hairy Hit! Where the Bears Are: The Documentary',
        year: '2023',
        rating: '7.0',
        imdb: 'tt28889813',
        cover: 'https://m.media-amazon.com/images/M/MV5BY2ZlYTdlYjctMmMyNy00MTU0LWFhYWMtYTc5NzZiNTU1Mzg5XkEyXkFqcGc@._V1_.jpg',
        newId: '1777857413',
        tags: ['documentary']
      },
      {
        id: '405942',
        title: 'Arco',
        year: '2025',
        rating: '7.3',
        imdb: 'tt14883538',
        cover: 'https://passthepopcorn.me/p/YrEBpP7fxKD.jpg',
        newId: '1777857390',
        tags: ['animation', 'adventure', 'fantasy', 'sci.fi']
      },
      {
        id: '33336',
        title: 'The Sixth Man AKA The 6th Man',
        year: '1997',
        rating: '5.6',
        imdb: 'tt0120142',
        cover: 'https://passthepopcorn.me/p/FFUXpn77NF5.jpg',
        newId: '1777857389',
        tags: ['comedy', 'drama', 'romance', 'fantasy', 'sport', 'basketball']
      }
    ].forEach(appendCoverMovie);

    coverViewContainer.appendChild(coverMovieList);
    coverViewPreview.appendChild(coverViewContainer);

    const coverViewFitPanel = document.createElement('div');
    coverViewFitPanel.className = 'widescreen-controls__cover-view-fit';

    const coverViewFitSummary = document.createElement('div');
    coverViewFitSummary.className = 'widescreen-controls__cover-view-fit-summary';

    const coverViewFitGrid = document.createElement('div');
    coverViewFitGrid.className = 'widescreen-controls__cover-view-fit-grid';

    ['Cover', 'Status', 'Aspect', 'Fit'].forEach(function (headingText) {
      const heading = document.createElement('div');
      heading.className = 'widescreen-controls__cover-view-fit-heading';
      heading.textContent = headingText;
      coverViewFitGrid.appendChild(heading);
    });

    coverViewFitItems.forEach(function (item) {
      const title = document.createElement('div');
      title.className = 'widescreen-controls__cover-view-fit-cell';
      title.textContent = item.movie.title;
      title.title = item.movie.title;

      item.statusCell = document.createElement('div');
      item.statusCell.className = 'widescreen-controls__cover-view-fit-cell';

      item.aspectCell = document.createElement('div');
      item.aspectCell.className = 'widescreen-controls__cover-view-fit-cell';

      item.cropCell = document.createElement('div');
      item.cropCell.className = 'widescreen-controls__cover-view-fit-cell';

      coverViewFitGrid.appendChild(title);
      coverViewFitGrid.appendChild(item.statusCell);
      coverViewFitGrid.appendChild(item.aspectCell);
      coverViewFitGrid.appendChild(item.cropCell);
    });

    coverViewFitPanel.appendChild(coverViewFitSummary);
    coverViewFitPanel.appendChild(coverViewFitGrid);
    coverViewPreview.appendChild(coverViewFitPanel);

    function updateCoverViewFitPreview(dimensions) {
      const coverWidth = dimensions.widths['cover-movie-width'];
      const coverHeight = dimensions.heights['cover-movie-height'];
      if (!Number.isFinite(coverWidth) || !Number.isFinite(coverHeight)) return;

      let letterboxedCount = 0;
      let loadedCount = 0;

      coverViewFitItems.forEach(function (item) {
        item.statusCell.className = 'widescreen-controls__cover-view-fit-cell';
        item.aspectCell.textContent = '';
        item.cropCell.textContent = '';

        if (item.loadState === 'loading') {
          item.statusCell.textContent = 'Loading image';
          return;
        }

        if (item.loadState !== 'loaded') {
          item.statusCell.textContent = 'Image unavailable';
          return;
        }

        loadedCount += 1;
        const fitMetrics = computeContainFitMetrics(coverWidth, coverHeight, item.naturalWidth, item.naturalHeight);
        if (!fitMetrics) return;

        item.coverLink.classList.remove('widescreen-controls__cover-view-cover--cropped');
        item.statusCell.textContent = fitMetrics.status;
        item.statusCell.classList.add(
          fitMetrics.isLetterboxed
            ? 'widescreen-controls__cover-view-fit-cell--letterboxed'
            : 'widescreen-controls__cover-view-fit-cell--fits'
        );
        item.aspectCell.textContent = `slot ${fitMetrics.slotAspect.toFixed(3)}; image ${fitMetrics.imageAspect.toFixed(3)}`;
        item.cropCell.textContent = fitMetrics.isLetterboxed
          ? `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px; empty ${Math.round(
              fitMetrics.emptyWidth
            )}px wide, ${Math.round(fitMetrics.emptyHeight)}px tall`
          : `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px`;

        if (fitMetrics.isLetterboxed) {
          letterboxedCount += 1;
        }
      });

      coverViewFitSummary.textContent = `${coverWidth}px x ${coverHeight}px slot; ${letterboxedCount} of ${loadedCount} loaded covers letterboxed; 0 cropped`;
    }

    coverViewFitItems.forEach(function (item) {
      const image = new Image();
      image.onload = function () {
        item.naturalWidth = image.naturalWidth;
        item.naturalHeight = image.naturalHeight;
        item.loadState = item.naturalWidth > 0 && item.naturalHeight > 0 ? 'loaded' : 'error';
        updateCoverViewFitPreview(computeFinalDimensions(state));
      };
      image.onerror = function () {
        item.loadState = 'error';
        updateCoverViewFitPreview(computeFinalDimensions(state));
      };
      image.src = item.movie.cover;
    });

    registerPreviewListener(updateCoverViewFitPreview);
    globalThis.addEventListener('resize', function () {
      updateCoverViewFitPreview(computeFinalDimensions(state));
    });

    const coverViewTorrentsPhpDefinition = {
      key: 'coverView',
      label: 'Cover View',
      panel: coverViewPreview,
      optionVariableNames: COVER_VIEW_PREVIEW_VARIABLE_NAMES,
      optionTitle: 'Cover View Preview Options',
      optionDescription: 'Options specific to the active torrents.php Cover View preview.'
    };
    torrentsPhpDefinitions.push(coverViewTorrentsPhpDefinition);

    const coverViewTorrentsPhpButton = document.createElement('button');
    coverViewTorrentsPhpButton.type = 'button';
    coverViewTorrentsPhpButton.className = 'widescreen-controls__preview-tab';
    coverViewTorrentsPhpButton.textContent = coverViewTorrentsPhpDefinition.label;
    coverViewTorrentsPhpButton.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    coverViewTorrentsPhpButton.addEventListener('click', function () {
      setActiveTorrentsPhpTab(coverViewTorrentsPhpDefinition.key);
    });

    torrentsPhpTabBar.appendChild(coverViewTorrentsPhpButton);
    torrentsPhpTabsByKey[coverViewTorrentsPhpDefinition.key] = { button: coverViewTorrentsPhpButton };
    torrentsPhpPreview.appendChild(coverViewPreview);

    const smallCoverPreview = document.createElement('div');
    smallCoverPreview.className = 'widescreen-controls__small-cover-preview';

    const smallCoverContainer = document.createElement('div');
    smallCoverContainer.className = 'small-cover-movie-list__container js-small-cover-movie-list__container clearfix';

    const smallCoverFitItems = [];

    function appendSmallCoverMovie(movie, index) {
      const item = document.createElement('div');
      item.className = 'small-cover-movie-list__movie js-movie-tooltip-triggerer';
      item.dataset.coverviewjsonindex = String(index);

      const link = document.createElement('a');
      link.className = movie.seen
        ? 'small-cover-movie-list__movie__link small-cover-movie-list__movie__link--seen'
        : 'small-cover-movie-list__movie__link';
      link.href = `torrents.php?id=${movie.id}`;
      link.title = movie.title;
      link.style.background = `url("${movie.cover}") no-repeat top center scroll`;
      link.style.backgroundSize = 'cover';

      item.appendChild(link);
      smallCoverContainer.appendChild(item);

      smallCoverFitItems.push({
        movie,
        link,
        naturalWidth: 0,
        naturalHeight: 0,
        loadState: 'loading',
        statusCell: null,
        aspectCell: null,
        fitCell: null
      });
    }

    [
      {
        id: '1621',
        title: 'Small cover 1',
        cover: 'https://passthepopcorn.me/p/JU5mM1JGYCV.jpg',
        seen: false
      },
      {
        id: '6549',
        title: 'Small cover 2',
        cover: 'https://passthepopcorn.me/p/GQNHn8dfjQV.jpg',
        seen: false
      },
      {
        id: '125',
        title: 'Small cover 3',
        cover: 'https://passthepopcorn.me/p/JXkVxuQQJqg.jpg',
        seen: true
      },
      {
        id: '21381',
        title: 'Small cover 4',
        cover: 'https://passthepopcorn.me/p/VLffZdDWoUj.jpg',
        seen: false
      },
      {
        id: '156238',
        title: 'Small cover 5',
        cover: 'https://passthepopcorn.me/p/j1Bsx7oK4Sm.jpg',
        seen: false
      },
      {
        id: '86564',
        title: 'Small cover 6',
        cover: 'https://passthepopcorn.me/p/XHrZWsqZ41t.jpg',
        seen: false
      },
      {
        id: '5486',
        title: 'Small cover 7',
        cover: 'https://passthepopcorn.me/p/N3SfEJYQWdW.jpg',
        seen: false
      },
      {
        id: '123969',
        title: 'Small cover 8',
        cover: 'https://passthepopcorn.me/p/UjsaDxssQ2M.jpg',
        seen: false
      },
      {
        id: '130995',
        title: 'Small cover 9',
        cover: 'https://passthepopcorn.me/p/MMUeBE4KA7q.jpg',
        seen: false
      },
      {
        id: '326510',
        title: 'Small cover 10',
        cover: 'https://passthepopcorn.me/p/7z9WpXDVguZ.jpg',
        seen: false
      }
    ].forEach(appendSmallCoverMovie);

    smallCoverPreview.appendChild(smallCoverContainer);

    const smallCoverFitPanel = document.createElement('div');
    smallCoverFitPanel.className = 'widescreen-controls__cover-view-fit widescreen-controls__small-cover-fit';

    const smallCoverFitSummary = document.createElement('div');
    smallCoverFitSummary.className = 'widescreen-controls__cover-view-fit-summary';

    const smallCoverFitGrid = document.createElement('div');
    smallCoverFitGrid.className = 'widescreen-controls__cover-view-fit-grid';

    ['Cover', 'Status', 'Aspect', 'Fit'].forEach(function (headingText) {
      const heading = document.createElement('div');
      heading.className = 'widescreen-controls__cover-view-fit-heading';
      heading.textContent = headingText;
      smallCoverFitGrid.appendChild(heading);
    });

    smallCoverFitItems.forEach(function (item) {
      const title = document.createElement('div');
      title.className = 'widescreen-controls__cover-view-fit-cell';
      title.textContent = item.movie.title;
      title.title = item.movie.title;

      item.statusCell = document.createElement('div');
      item.statusCell.className = 'widescreen-controls__cover-view-fit-cell';

      item.aspectCell = document.createElement('div');
      item.aspectCell.className = 'widescreen-controls__cover-view-fit-cell';

      item.fitCell = document.createElement('div');
      item.fitCell.className = 'widescreen-controls__cover-view-fit-cell';

      smallCoverFitGrid.appendChild(title);
      smallCoverFitGrid.appendChild(item.statusCell);
      smallCoverFitGrid.appendChild(item.aspectCell);
      smallCoverFitGrid.appendChild(item.fitCell);
    });

    smallCoverFitPanel.appendChild(smallCoverFitSummary);
    smallCoverFitPanel.appendChild(smallCoverFitGrid);
    smallCoverPreview.appendChild(smallCoverFitPanel);

    function updateSmallCoverFitPreview(dimensions) {
      const coverWidth = dimensions.widths['torrents-small-cover-movie-width'];
      const coverHeight = dimensions.heights['torrents-small-cover-movie-height'];
      if (!Number.isFinite(coverWidth) || !Number.isFinite(coverHeight)) return;

      let letterboxedCount = 0;
      let loadedCount = 0;

      smallCoverFitItems.forEach(function (item) {
        item.statusCell.className = 'widescreen-controls__cover-view-fit-cell';
        item.aspectCell.textContent = '';
        item.fitCell.textContent = '';

        if (item.loadState === 'loading') {
          item.statusCell.textContent = 'Loading image';
          return;
        }

        if (item.loadState !== 'loaded') {
          item.statusCell.textContent = 'Image unavailable';
          return;
        }

        loadedCount += 1;
        const fitMetrics = computeContainFitMetrics(coverWidth, coverHeight, item.naturalWidth, item.naturalHeight);
        if (!fitMetrics) return;

        item.statusCell.textContent = fitMetrics.status;
        item.statusCell.classList.add(
          fitMetrics.isLetterboxed
            ? 'widescreen-controls__cover-view-fit-cell--letterboxed'
            : 'widescreen-controls__cover-view-fit-cell--fits'
        );
        item.aspectCell.textContent = `slot ${fitMetrics.slotAspect.toFixed(3)}; image ${fitMetrics.imageAspect.toFixed(3)}`;
        item.fitCell.textContent = fitMetrics.isLetterboxed
          ? `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px; empty ${Math.round(
              fitMetrics.emptyWidth
            )}px wide, ${Math.round(fitMetrics.emptyHeight)}px tall`
          : `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px`;

        if (fitMetrics.isLetterboxed) {
          letterboxedCount += 1;
        }
      });

      smallCoverFitSummary.textContent = `${coverWidth}px x ${coverHeight}px slot; ${letterboxedCount} of ${loadedCount} loaded covers letterboxed; 0 cropped`;
    }

    smallCoverFitItems.forEach(function (item) {
      const image = new Image();
      image.onload = function () {
        item.naturalWidth = image.naturalWidth;
        item.naturalHeight = image.naturalHeight;
        item.loadState = item.naturalWidth > 0 && item.naturalHeight > 0 ? 'loaded' : 'error';
        updateSmallCoverFitPreview(computeFinalDimensions(state));
      };
      image.onerror = function () {
        item.loadState = 'error';
        updateSmallCoverFitPreview(computeFinalDimensions(state));
      };
      image.src = item.movie.cover;
    });

    registerPreviewListener(updateSmallCoverFitPreview);
    globalThis.addEventListener('resize', function () {
      updateSmallCoverFitPreview(computeFinalDimensions(state));
    });

    const smallCoverTorrentsPhpDefinition = {
      key: 'smallCover',
      label: 'Small Cover View',
      panel: smallCoverPreview,
      optionVariableNames: TORRENTS_PHP_SMALL_COVER_PREVIEW_VARIABLE_NAMES,
      optionTitle: 'Small Cover View Preview Options',
      optionDescription: 'Options specific to the active torrents.php Small Cover View preview.'
    };
    torrentsPhpDefinitions.push(smallCoverTorrentsPhpDefinition);

    const smallCoverTorrentsPhpButton = document.createElement('button');
    smallCoverTorrentsPhpButton.type = 'button';
    smallCoverTorrentsPhpButton.className = 'widescreen-controls__preview-tab';
    smallCoverTorrentsPhpButton.textContent = smallCoverTorrentsPhpDefinition.label;
    smallCoverTorrentsPhpButton.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    smallCoverTorrentsPhpButton.addEventListener('click', function () {
      setActiveTorrentsPhpTab(smallCoverTorrentsPhpDefinition.key);
    });

    torrentsPhpTabBar.appendChild(smallCoverTorrentsPhpButton);
    torrentsPhpTabsByKey[smallCoverTorrentsPhpDefinition.key] = { button: smallCoverTorrentsPhpButton };
    torrentsPhpPreview.appendChild(smallCoverPreview);

    top10Preview = document.createElement('div');
    top10Preview.className = 'thin widescreen-controls__top10-preview';

    const top10TabBar = document.createElement('div');
    top10TabBar.className = 'widescreen-controls__preview-tab-bar widescreen-controls__nested-layout-tabs';

    const top10Header = document.createElement('h2');
    top10Header.id = 'top-header-0';
    top10Header.textContent = 'Top 10 Most Active Movies Uploaded in the Past Day ';
    const top10HeaderSmall = document.createElement('small');
    top10HeaderSmall.appendChild(document.createTextNode('- ['));
    appendAnchor(top10HeaderSmall, '', 'Top 10', 'top10.php');
    top10HeaderSmall.appendChild(document.createTextNode('] - ['));
    appendAnchor(top10HeaderSmall, '', 'Top 100', 'top10.php?type=movies&limit=100&details=day');
    top10HeaderSmall.appendChild(document.createTextNode('] - ['));
    appendAnchor(top10HeaderSmall, '', 'Top 250', 'top10.php?type=movies&limit=250&details=day');
    top10HeaderSmall.appendChild(document.createTextNode(']'));
    top10Header.appendChild(top10HeaderSmall);

    const top10Store = document.createElement('div');
    top10Store.className = 'js-cover-view-index-store';
    top10Store.dataset.coverviewindex = '0';

    const top10Movies = [
      {
        id: '411487',
        title: 'Finding Satoshi',
        year: '2026',
        rating: '8.8',
        imdb: 'tt40548010',
        cover: 'https://m.media-amazon.com/images/M/MV5BYTczOTg5MDEtNmE2Mi00NDYyLTkwODUtYWQwN2M1ZGMxNmMzXkEyXkFqcGc@._V1_.jpg',
        tags: ['documentary']
      },
      {
        id: '411455',
        title: 'Jimmy O. Yang: Finally Home',
        year: '2026',
        rating: '8.4',
        imdb: 'tt40642070',
        cover: 'https://m.media-amazon.com/images/M/MV5BODgxYzRjNDItMTQ0YS00OTY0LTkyMzMtOWQ0YzQ0OGUwMTlkXkEyXkFqcGc@._V1_.jpg',
        tags: ['comedy']
      },
      {
        id: '411468',
        title: 'Othello',
        year: '2026',
        rating: '7.2',
        imdb: 'tt39092602',
        cover: 'https://image.tmdb.org/t/p/original/yd6lMPgh9qthx9up7sZkpZGkq5m.jpg',
        tags: ['performance']
      },
      {
        id: '75889',
        title: "Il mondo dell'orrore di Dario Argento",
        year: '1985',
        rating: '6.5',
        imdb: 'tt0088989',
        cover: 'https://passthepopcorn.me/p/dTV8JPs2oH1.jpg',
        tags: ['horror', 'biography', 'documentary']
      },
      {
        id: '405942',
        title: 'Arco',
        year: '2025',
        rating: '7.3',
        imdb: 'tt14883538',
        cover: 'https://passthepopcorn.me/p/YrEBpP7fxKD.jpg',
        tags: ['animation', 'adventure', 'fantasy', 'sci.fi']
      },
      {
        id: '411498',
        title: 'Caravaggio',
        year: '2025',
        rating: '7.7',
        imdb: 'tt38351366',
        cover: 'https://image.tmdb.org/t/p/original/dRfDBbdVFsiRAKC5dhKcsIlPJI5.jpg',
        tags: ['documentary']
      },
      {
        id: '112481',
        title: 'Koibumi AKA Love Letter',
        year: '1953',
        rating: '7.1',
        imdb: 'tt0407929',
        cover: 'https://img2.pixhost.to/images/7633/721983539_mv5bode3nmm4ndgtngu3oc00mjc5lwjjmjetmgm3oti5nmvkymjixkeyxkfqcgc-_v1_.jpg',
        tags: ['drama', 'romance']
      },
      {
        id: '406048',
        title: 'Clika',
        year: '2026',
        rating: '4.2',
        imdb: 'tt28334938',
        cover: 'https://passthepopcorn.me/p/AbRmFd9VEma.jpg',
        tags: ['drama', 'musical', 'music']
      },
      {
        id: '389436',
        title: 'What We Hide AKA Spider & Jessie',
        year: '2025',
        rating: '6.1',
        imdb: 'tt22475426',
        cover: 'https://passthepopcorn.me/p/QfxWNWYXP2j.jpg',
        tags: ['drama', 'thriller', 'mystery']
      },
      {
        id: '29007',
        title: 'Alice in Wonderland',
        year: '1951',
        rating: '7.3',
        imdb: 'tt0043274',
        cover: 'https://passthepopcorn.me/p/7YQknQdkCFn.jpg',
        tags: ['comedy', 'animation', 'adventure', 'fantasy', 'musical', 'family', 'disney']
      }
    ];

    function createTop10FitPanel(items, getDimensions, summaryLabel) {
      const fitPanel = document.createElement('div');
      fitPanel.className = 'widescreen-controls__cover-view-fit';

      const fitSummary = document.createElement('div');
      fitSummary.className = 'widescreen-controls__cover-view-fit-summary';

      const fitGrid = document.createElement('div');
      fitGrid.className = 'widescreen-controls__cover-view-fit-grid';

      ['Cover', 'Status', 'Aspect', 'Fit'].forEach(function (headingText) {
        const heading = document.createElement('div');
        heading.className = 'widescreen-controls__cover-view-fit-heading';
        heading.textContent = headingText;
        fitGrid.appendChild(heading);
      });

      items.forEach(function (item) {
        const title = document.createElement('div');
        title.className = 'widescreen-controls__cover-view-fit-cell';
        title.textContent = item.movie.title;
        title.title = item.movie.title;

        item.statusCell = document.createElement('div');
        item.statusCell.className = 'widescreen-controls__cover-view-fit-cell';

        item.aspectCell = document.createElement('div');
        item.aspectCell.className = 'widescreen-controls__cover-view-fit-cell';

        item.fitCell = document.createElement('div');
        item.fitCell.className = 'widescreen-controls__cover-view-fit-cell';

        fitGrid.appendChild(title);
        fitGrid.appendChild(item.statusCell);
        fitGrid.appendChild(item.aspectCell);
        fitGrid.appendChild(item.fitCell);
      });

      fitPanel.appendChild(fitSummary);
      fitPanel.appendChild(fitGrid);

      function updateFit(dimensions) {
        const slot = getDimensions(dimensions);
        if (!slot) return;

        let letterboxedCount = 0;
        let loadedCount = 0;

        items.forEach(function (item) {
          item.statusCell.className = 'widescreen-controls__cover-view-fit-cell';
          item.aspectCell.textContent = '';
          item.fitCell.textContent = '';

          if (item.loadState === 'loading') {
            item.statusCell.textContent = 'Loading image';
            return;
          }
          if (item.loadState !== 'loaded') {
            item.statusCell.textContent = 'Image unavailable';
            return;
          }

          loadedCount += 1;
          const fitMetrics = computeContainFitMetrics(slot.width, slot.height, item.naturalWidth, item.naturalHeight);
          if (!fitMetrics) return;

          item.statusCell.textContent = fitMetrics.status;
          item.statusCell.classList.add(
            fitMetrics.isLetterboxed
              ? 'widescreen-controls__cover-view-fit-cell--letterboxed'
              : 'widescreen-controls__cover-view-fit-cell--fits'
          );
          item.aspectCell.textContent = `slot ${fitMetrics.slotAspect.toFixed(3)}; image ${fitMetrics.imageAspect.toFixed(3)}`;
          item.fitCell.textContent = fitMetrics.isLetterboxed
            ? `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(
                fitMetrics.renderedHeight
              )}px; empty ${Math.round(fitMetrics.emptyWidth)}px wide, ${Math.round(fitMetrics.emptyHeight)}px tall`
            : `image ${Math.round(fitMetrics.renderedWidth)}px x ${Math.round(fitMetrics.renderedHeight)}px`;

          if (fitMetrics.isLetterboxed) {
            letterboxedCount += 1;
          }
        });

        fitSummary.textContent = `${slot.width}px x ${slot.height}px ${summaryLabel}; ${letterboxedCount} of ${loadedCount} loaded covers letterboxed; 0 cropped`;
      }

      items.forEach(function (item) {
        const image = new Image();
        image.onload = function () {
          item.naturalWidth = image.naturalWidth;
          item.naturalHeight = image.naturalHeight;
          item.loadState = item.naturalWidth > 0 && item.naturalHeight > 0 ? 'loaded' : 'error';
          updateFit(computeFinalDimensions(state));
        };
        image.onerror = function () {
          item.loadState = 'error';
          updateFit(computeFinalDimensions(state));
        };
        image.src = item.movie.cover;
      });

      registerPreviewListener(updateFit);
      return { panel: fitPanel, update: updateFit };
    }

    function createTop10CoverMovie(movie, index, fitItems) {
      const item = document.createElement('div');
      item.className = 'cover-movie-list__movie js-movie-tooltip-triggerer';
      item.dataset.coverviewjsonindex = String(index);

      const coverLink = document.createElement('a');
      coverLink.className = 'cover-movie-list__movie__cover-link';
      coverLink.href = `torrents.php?id=${movie.id}`;
      coverLink.style.background = `url("${movie.cover}") no-repeat top center scroll`;
      coverLink.style.backgroundSize = 'cover';

      const undercover = document.createElement('div');
      undercover.className = 'cover-movie-list__movie__undercover';

      const titleRow = document.createElement('div');
      titleRow.className = 'cover-movie-list__movie__title-row';
      appendAnchor(titleRow, 'cover-movie-list__movie__title', movie.title, `torrents.php?id=${movie.id}`);
      titleRow.appendChild(document.createTextNode(' '));
      const year = document.createElement('span');
      year.className = 'cover-movie-list__movie__year';
      year.textContent = `[${movie.year}]`;
      titleRow.appendChild(year);

      const ratingAndTags = document.createElement('div');
      ratingAndTags.className = 'cover-movie-list__movie__rating-and-tags';
      const rating = appendAnchor(ratingAndTags, 'cover-movie-list__movie__rating', movie.rating, `https://www.imdb.com/title/${movie.imdb}/`);
      rating.target = '_blank';
      rating.rel = 'noreferrer';
      const tags = document.createElement('span');
      tags.className = 'cover-movie-list__movie__tags';
      movie.tags.forEach(function (tag, tagIndex) {
        if (tagIndex > 0) tags.appendChild(document.createTextNode(', '));
        appendAnchor(tags, 'cover-movie-list__movie__tag', tag, `torrents.php?taglist=${tag}&cover=1`);
      });
      ratingAndTags.appendChild(tags);

      undercover.appendChild(titleRow);
      undercover.appendChild(ratingAndTags);
      item.appendChild(coverLink);
      item.appendChild(undercover);

      fitItems.push({
        movie,
        naturalWidth: 0,
        naturalHeight: 0,
        loadState: 'loading',
        statusCell: null,
        aspectCell: null,
        fitCell: null
      });

      return item;
    }

    function createTop10SmallCoverMovie(movie, index, fitItems) {
      const item = document.createElement('div');
      item.className = 'small-cover-movie-list__movie js-movie-tooltip-triggerer';
      item.dataset.coverviewjsonindex = String(index);

      const link = document.createElement('a');
      link.className = 'small-cover-movie-list__movie__link';
      link.href = `torrents.php?id=${movie.id}`;
      link.style.background = `url("${movie.cover}") no-repeat top center scroll`;
      link.style.backgroundSize = 'cover';
      item.appendChild(link);

      fitItems.push({
        movie,
        naturalWidth: 0,
        naturalHeight: 0,
        loadState: 'loading',
        statusCell: null,
        aspectCell: null,
        fitCell: null
      });

      return item;
    }

    function setTop10ActivePanel(activePanel) {
      top10Store.querySelectorAll(
        ':scope > .js-basic-movie-list, :scope > .cover-movie-list__container, :scope > .js-small-cover-movie-list__container, :scope > .js-huge_view_container'
      ).forEach(function (view) {
        view.hidden = view !== activePanel;
        view.classList.toggle('hidden', view !== activePanel);
      });
    }

    const top10ListTable = listViewTable.cloneNode(true);
    top10ListTable.classList.add('js-basic-movie-list');
    top10ListTable.hidden = true;
    top10ListTable.classList.add('hidden');
    const top10ListCoverImage = top10ListTable.querySelector('.basic-movie-list__movie__cover');
    if (top10ListCoverImage) {
      top10ListCoverImage.src = top10Movies[0].cover;
      top10ListCoverImage.alt = `${top10Movies[0].title} cover preview`;
    }
    const top10ListMovieTitle = top10ListTable.querySelector('.basic-movie-list__movie__title');
    if (top10ListMovieTitle) {
      top10ListMovieTitle.textContent = top10Movies[0].title;
    }
    const top10ListMovieYear = top10ListTable.querySelector('.basic-movie-list__movie__year');
    if (top10ListMovieYear) {
      top10ListMovieYear.textContent = `[${top10Movies[0].year}]`;
    }
    const top10ListFitItems = [{
      movie: top10Movies[0],
      naturalWidth: 0,
      naturalHeight: 0,
      loadState: 'loading',
      statusCell: null,
      aspectCell: null,
      fitCell: null
    }];

    const top10CoverFitItems = [];
    const top10CoverContainer = document.createElement('div');
    top10CoverContainer.className = 'cover-movie-list__container clearfix';
    const top10CoverList = document.createElement('div');
    top10CoverList.className = 'cover-movie-list js-cover-movie-list';
    top10Movies.forEach(function (movie, index) {
      top10CoverList.appendChild(createTop10CoverMovie(movie, index, top10CoverFitItems));
    });
    top10CoverContainer.appendChild(top10CoverList);

    const top10SmallFitItems = [];
    const top10SmallContainer = document.createElement('div');
    top10SmallContainer.className = 'small-cover-movie-list__container js-small-cover-movie-list__container clearfix hidden';
    top10SmallContainer.hidden = true;
    top10Movies.forEach(function (movie, index) {
      top10SmallContainer.appendChild(createTop10SmallCoverMovie(movie, index, top10SmallFitItems));
    });

    const top10HugeContainer = document.createElement('div');
    top10HugeContainer.className = 'js-huge_view_container hidden';
    top10HugeContainer.hidden = true;
    const top10HugeMovie = hugeMovie.cloneNode(true);
    const top10HugeCoverLink = top10HugeMovie.querySelector('.huge-movie-list__movie__cover__link');
    if (top10HugeCoverLink) {
      top10HugeCoverLink.style.background = `url("${top10Movies[0].cover}") center center / contain no-repeat`;
    }
    const top10HugeTitle = top10HugeMovie.querySelector('.huge-movie-list__movie__title');
    if (top10HugeTitle) {
      top10HugeTitle.textContent = top10Movies[0].title;
    }
    top10HugeContainer.appendChild(top10HugeMovie);
    const top10HugeFitItems = [{
      movie: top10Movies[0],
      naturalWidth: 0,
      naturalHeight: 0,
      loadState: 'loading',
      statusCell: null,
      aspectCell: null,
      fitCell: null
    }];

    const top10Break = document.createElement('br');
    top10Store.appendChild(top10ListTable);
    top10Store.appendChild(top10CoverContainer);
    top10Store.appendChild(top10SmallContainer);
    top10Store.appendChild(top10HugeContainer);
    top10Store.appendChild(top10Break);
    top10Preview.appendChild(top10TabBar);
    top10Preview.appendChild(top10Header);
    top10Preview.appendChild(top10Store);

    const top10CoverFit = createTop10FitPanel(
      top10CoverFitItems,
      function (dimensions) {
        const width = dimensions.widths['cover-movie-index-width'];
        const height = dimensions.heights['cover-movie-index-height'];
        return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
      },
      'slot'
    );
    const top10SmallFit = createTop10FitPanel(
      top10SmallFitItems,
      function (dimensions) {
        const width = dimensions.widths['top10-small-cover-movie-width'];
        const height = dimensions.heights['top10-small-cover-movie-height'];
        return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
      },
      'slot'
    );
    const top10ListFit = createTop10FitPanel(
      top10ListFitItems,
      function (dimensions) {
        const width = dimensions.widths['basic-movie-cover-width'];
        const height = dimensions.heights['basic-movie-cover-height'];
        return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
      },
      'slot'
    );
    const top10HugeFit = createTop10FitPanel(
      top10HugeFitItems,
      function (dimensions) {
        const width = dimensions.widths['top10-huge-movie-width'];
        const height = dimensions.heights['top10-huge-movie-height'];
        return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
      },
      'slot'
    );

    top10CoverContainer.appendChild(top10CoverFit.panel);
    top10SmallContainer.after(top10SmallFit.panel);
    top10ListTable.after(top10ListFit.panel);
    top10ListFit.panel.hidden = true;
    top10ListFit.panel.classList.add('hidden');
    top10HugeContainer.appendChild(top10HugeFit.panel);

    const top10Definitions = [
      {
        key: 'cover',
        label: 'Cover View',
        panel: top10CoverContainer,
        fitPanel: top10CoverFit.panel,
        optionVariableNames: TOP10_COVER_PREVIEW_VARIABLE_NAMES,
        optionTitle: 'Top10 Cover View Preview Options',
        optionDescription: 'Options specific to the active top10.php Cover View preview.'
      },
      {
        key: 'smallCover',
        label: 'Small Cover View',
        panel: top10SmallContainer,
        fitPanel: top10SmallFit.panel,
        optionVariableNames: TOP10_SMALL_COVER_PREVIEW_VARIABLE_NAMES,
        optionTitle: 'Top10 Small Cover View Preview Options',
        optionDescription: 'Options specific to the active top10.php Small Cover View preview.'
      },
      {
        key: 'list',
        label: 'List View',
        panel: top10ListTable,
        fitPanel: top10ListFit.panel,
        optionVariableNames: TOP10_LIST_PREVIEW_VARIABLE_NAMES,
        optionTitle: 'Top10 List View Preview Options',
        optionDescription: 'Options specific to the active top10.php List View preview.'
      },
      {
        key: 'huge',
        label: 'Huge View',
        panel: top10HugeContainer,
        fitPanel: top10HugeFit.panel,
        optionVariableNames: TOP10_HUGE_PREVIEW_VARIABLE_NAMES,
        optionTitle: 'Top10 Huge View Preview Options',
        optionDescription: 'Options specific to the active top10.php Huge View preview.'
      }
    ];
    const top10TabsByKey = {};
    let activeTop10TabKey = 'cover';

    function getActiveTop10Definition() {
      return (
        top10Definitions.find(function (definition) {
          return definition.key === activeTop10TabKey;
        }) || top10Definitions[0]
      );
    }

    function setActiveTop10Tab(key) {
      activeTop10TabKey = key;
      const activeDefinition = getActiveTop10Definition();
      for (const definition of top10Definitions) {
        const isActive = definition.key === activeDefinition.key;
        const controls = top10TabsByKey[definition.key];
        if (controls) {
          controls.button.classList.toggle('widescreen-controls__preview-tab--active', isActive);
        }
        definition.fitPanel.hidden = !isActive;
        definition.fitPanel.classList.toggle('hidden', !isActive);
      }
      setTop10ActivePanel(activeDefinition.panel);
      if (activePreviewOptionVariableNames) {
        activePreviewOptionVariableNames = activeDefinition.optionVariableNames;
        previewOptionsTitle.textContent = activeDefinition.optionTitle;
        previewOptionsDescription.textContent = activeDefinition.optionDescription;
        for (const variable of SETTING_VARS) {
          if (!isPreviewOptionVariable(variable.name)) continue;
          const controls = controlsByName[variable.name];
          if (!controls) continue;
          controls.row.hidden = !activePreviewOptionVariableNames.has(variable.name);
        }
      }
      schedulePreviewRefresh();
    }

    top10Definitions.forEach(function (definition) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'widescreen-controls__preview-tab';
      button.textContent = definition.label;
      button.addEventListener('mousedown', function (event) {
        event.preventDefault();
      });
      button.addEventListener('click', function () {
        setActiveTop10Tab(definition.key);
      });
      top10TabBar.appendChild(button);
      top10TabsByKey[definition.key] = { button };
    });
    setActiveTop10Tab(activeTop10TabKey);

    previewTabsPanel = document.createElement('div');
    previewTabsPanel.className = 'panel widescreen-controls__preview-tabs-panel';

    const previewTabsPanelBody = document.createElement('div');
    previewTabsPanelBody.className = 'panel__body widescreen-controls__preview-tabs';

    const previewTabBar = document.createElement('div');
    previewTabBar.className = 'widescreen-controls__preview-tab-bar';

    const previewTabDefinitions = [
      {
        key: 'layout',
        label: 'Torrents Layout Preview',
        panel: layoutPage,
        onActivate: function () {
          schedulePreviewRefresh();
        }
      },
      {
        key: 'torrentsPhp',
        label: 'Torrents.php Preview',
        panel: torrentsPhpPreview,
        onActivate: function () {
          schedulePreviewRefresh();
        }
      },
      {
        key: 'top10',
        label: 'Top10 Page Preview',
        panel: top10Preview,
        onActivate: function () {
          schedulePreviewRefresh();
        }
      },
      {
        key: 'posters',
        label: 'View Mode Poster Preview',
        panel: previewGrid,
        onActivate: function () {
          schedulePreviewRefresh();
        }
      }
    ];

    const previewTabsByKey = {};

    function setActivePreviewTab(key) {
      for (const definition of previewTabDefinitions) {
        const isActive = definition.key === key;
        const controls = previewTabsByKey[definition.key];
        if (!controls) continue;
        controls.button.classList.toggle('widescreen-controls__preview-tab--active', isActive);
      }

      const activeDefinition = previewTabDefinitions.find(function (definition) {
        return definition.key === key;
      });
      const currentPreview = panel.querySelector(
        '.thin.widescreen-controls__layout-page, .widescreen-controls__torrents-php-preview, .widescreen-controls__top10-preview, .widescreen-controls__preview-grid'
      );
      if (activeDefinition && currentPreview !== activeDefinition.panel) {
        if (currentPreview) {
          currentPreview.remove();
        }
        panel.appendChild(activeDefinition.panel);
      }
      if (key === 'layout') {
        activePreviewOptionVariableNames = TORRENTS_LAYOUT_PREVIEW_VARIABLE_NAMES;
        previewOptionsTitle.textContent = 'Torrents Layout Preview Options';
        previewOptionsDescription.textContent = 'Options specific to the torrents layout preview.';
      } else if (key === 'torrentsPhp') {
        const activeTorrentsPhpDefinition = getActiveTorrentsPhpDefinition();
        activePreviewOptionVariableNames = activeTorrentsPhpDefinition.optionVariableNames;
        previewOptionsTitle.textContent = activeTorrentsPhpDefinition.optionTitle;
        previewOptionsDescription.textContent = activeTorrentsPhpDefinition.optionDescription;
      } else if (key === 'top10') {
        const activeTop10Definition = getActiveTop10Definition();
        activePreviewOptionVariableNames = activeTop10Definition.optionVariableNames;
        previewOptionsTitle.textContent = activeTop10Definition.optionTitle;
        previewOptionsDescription.textContent = activeTop10Definition.optionDescription;
      } else {
        activePreviewOptionVariableNames = null;
        previewOptionsTitle.textContent = 'Preview Options';
        previewOptionsDescription.textContent = 'Options specific to the active preview.';
      }
      const hasPreviewOptions = !!activePreviewOptionVariableNames;
      previewOptionsPanel.hidden = !hasPreviewOptions;
      for (const variable of SETTING_VARS) {
        if (!isPreviewOptionVariable(variable.name)) continue;
        const controls = controlsByName[variable.name];
        if (!controls) continue;
        controls.row.hidden = !activePreviewOptionVariableNames || !activePreviewOptionVariableNames.has(variable.name);
      }
      originalSidebarCoverPathRow.row.hidden = key !== 'layout';
      if (activeDefinition && typeof activeDefinition.onActivate === 'function') {
        activeDefinition.onActivate();
      }
    }

    previewTabDefinitions.forEach(function (definition) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'widescreen-controls__preview-tab';
      button.textContent = definition.label;
      button.addEventListener('mousedown', function (event) {
        event.preventDefault();
      });
      button.addEventListener('click', function () {
        setActivePreviewTab(definition.key);
      });

      previewTabBar.appendChild(button);
      previewTabsByKey[definition.key] = { button };
    });

    previewTabsPanelBody.appendChild(previewTabBar);
    previewTabsPanel.appendChild(previewTabsPanelBody);

    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(versionStatus);
    body.appendChild(linkedRow);
    body.appendChild(scaleRow);
    body.appendChild(controlsList);
    body.appendChild(assetsList);
    body.appendChild(buttonRow);
    wrapper.appendChild(body);
    panel.appendChild(wrapper);
    panel.appendChild(previewTabsPanel);
    panel.appendChild(previewOptionsPanel);

    setActiveTorrentsPhpTab('huge');
    setActivePreviewTab('layout');

    refreshIndividualControls(controlsByName, state);
    schedulePreviewRefresh();

    return panel;
  }

  function setupWidescreenTabPanel(widescreenTab) {
    const tabsPanels = document.querySelector('.tabs__panels');
    if (!tabsPanels || !widescreenTab) return;
    const contentRoot = document.querySelector('#content.page__main-content');
    const savedProfileAlert = contentRoot
      ? Array.from(contentRoot.querySelectorAll(':scope > .alert.alert--warning')).find(function (alert) {
        return alert.textContent.trim() === 'Your profile has been saved.';
      })
      : null;

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
      if (savedProfileAlert) {
        savedProfileAlert.hidden = isWide;
      }

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
    unit.textContent =
      typeof variable.displayUnit === 'string' ? variable.displayUnit : variable.unit || 'px';

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

    setupTorrentsSmallCoverViewMode();
    setupTop10SmallCoverViewMode();

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
