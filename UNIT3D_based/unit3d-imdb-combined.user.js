// ==UserScript==
// @name         UNIT3D - IMDb Combined
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.1.0
// @description  Add IMDb-derived panels and shared IMDb cache/events to UNIT3D similar torrent pages using the UNIT3D layout change userscript.
// @author       Audionut
// @match        https://aither.cc/torrents/similar/1*
// @match        https://aither.cc/torrents/similar/2*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-imdb-combined.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-imdb-combined.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.listValues
// @grant        GM.deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @connect      api.graphql.imdb.com
// @connect      metacritic.com
// @connect      www.metacritic.com
// @connect      query.wikidata.org
// @connect      rottentomatoes.com
// @connect      www.rottentomatoes.com
// @connect      www.themoviedb.org
// @connect      letterboxd.com
// @connect      www.letterboxd.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_SOURCE = 'unit3d-imdb-combined';
  const STYLE_ID = 'unit3d-imdb-combined-style';
  const SETTINGS_PANEL_ID = 'unit3d-imdb-settings-panel';
  const PANEL_ROOT_ID = 'unit3d-imdb-panels';
  const SIDEBAR_ROOT_ID = 'unit3d-imdb-sidebar-panels';
  const CACHE_PREFIX = 'iMDB_data_';
  const NAME_CACHE_PREFIX = 'unit3d_imdb_names_';
  const VIDEO_CACHE_PREFIX = 'unit3d_imdb_video_';
  const VIDEO_CACHE_VERSION = 4;
  const SUPPLEMENTAL_CACHE_PREFIX = 'unit3d_imdb_supplemental_';
  const METACRITIC_MUST_SEE_BADGE_URL =
    'https://www.metacritic.com/a/neutron/nodev4/images/logos/badge/must-see.svg';
  const UNIT3D_GENRE_IDS = {
    action: 28,
    'action & adventure': 10759,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    kids: 10762,
    music: 10402,
    musical: 22,
    mystery: 9648,
    news: 10763,
    reality: 10764,
    romance: 10749,
    'sci-fi & fantasy': 10765,
    'science fiction': 878,
    soap: 10766,
    talk: 10767,
    thriller: 53,
    'tv movie': 10770,
    war: 10752,
    'war & politics': 10768,
    western: 37
  };
  const UNIT3D_GENRE_ALIASES = {
    'action adventure': 'action & adventure',
    'action-adventure': 'action & adventure',
    'game show': 'reality',
    'game-show': 'reality',
    'reality tv': 'reality',
    'reality-tv': 'reality',
    scifi: 'science fiction',
    'sci fi': 'science fiction',
    'sci fi & fantasy': 'sci-fi & fantasy',
    'sci-fi & fantasy': 'sci-fi & fantasy',
    'sci-fi': 'science fiction',
    'science fiction & fantasy': 'sci-fi & fantasy',
    'science-fiction': 'science fiction',
    'talk show': 'talk',
    'talk-show': 'talk',
    'television movie': 'tv movie',
    'tv-movie': 'tv movie',
    'war and politics': 'war & politics',
    'war politics': 'war & politics',
    'war-politics': 'war & politics'
  };
  const ACCENT_COLOR = '#f2db83';
  const CAST_PLACEHOLDER_IMAGE = 'https://ptpimg.me/9wv452.png';
  const IMDB_TRAILER_FALLBACK_ASPECT_RATIO = 16 / 9;
  const IMDB_TRAILER_PREVIEW_HEIGHT = 200;
  const MAX_KEYWORDS = 60;
  const MAX_SIMILAR_TITLES = 12;

  const DEFAULT_SETTINGS = {
    cacheExpiryDays: 7,
    castDefaultRows: 2,
    castFilterType: 'actors',
    castImageHeight: 300,
    castImagesPerRow: 8,
    castMaxDisplay: 64,
    disableCustomColors: false,
    enableRatingsExport: false,
    newTitleTtlDays: 3,
    showAlternateVersions: true,
    showAwards: true,
    showBoxOffice: true,
    showCastPhotos: true,
    showImdbCountryAverages: false,
    showImdbDemographics: false,
    showImdbHistogram: true,
    showImdbMeter: true,
    showImdbWeightedScore: false,
    showImdbDemographicScoreOverride: false,
    showKeywords: true,
    showMovieInfo: true,
    showMetacritic: true,
    showMetacriticBreakdown: true,
    showMetacriticUserScore: true,
    showParentsGuide: true,
    showRatingsAggregate: false,
    showRatingsAggregateTileDetails: true,
    showRatingsPanel: true,
    showRottenTomatoes: false,
    showSimilarTitles: true,
    similarTitlesPlacement: 'sidebar',
    showSoundtracks: true,
    showTechnicalSpecs: true,
    showTmdb: false,
    showTrailerPanel: true,
    showLetterboxd: false,
    showLetterboxdHistogram: false,
    showLetterboxdWeightedScore: false,
    showReviews: false,
    hideReviewSpoilers: true,
    reviewDisplayMode: 'inline',
    discardHistogramExtremeBins: false,
    imdbDemographicScoreOverrideKey: 'gender:FEMALE',
    imdbWeightedScoreType: 'trimmed5',
    ratingsAggregateDropExtremes: false,
    ratingsAggregateKeepRottenTomatoes: false,
    ratingsAggregateMethod: 'mean',
    ratingsAggregateSources: {
      imdb: { enabled: true, option: 'displayed', weight: 1 },
      metacritic: { enabled: true, option: 'critic', weight: 1 },
      rottenTomatoes: { enabled: false, option: 'critic', weight: 1 },
      tmdb: { enabled: false, option: 'default', weight: 1 },
      letterboxd: { enabled: false, option: 'user', weight: 1 }
    },
    ratingsAggregateUseVoteCountWeighting: false
  };

  const IMDB_WEIGHTED_SCORE_TYPE_LABELS = {
    bayesian: 'Weighted Bayesian blend',
    mean: 'Weighted mean',
    median: 'Weighted median',
    trimmed5: 'Weighted trimmed mean 5%',
    trimmed10: 'Weighted trimmed mean 10%'
  };

  const RATINGS_AGGREGATE_METHOD_LABELS = {
    average: 'Average',
    mean: 'Mean',
    median: 'Median'
  };

  const RATINGS_AGGREGATE_SOURCE_LABELS = {
    imdb: 'IMDb',
    metacritic: 'Metacritic',
    rottenTomatoes: 'Rotten Tomatoes',
    tmdb: 'TMDB',
    letterboxd: 'Letterboxd'
  };

  const RATINGS_AGGREGATE_SOURCE_OPTION_DEFINITIONS = {
    imdb: [
      ['displayed', 'Displayed users score'],
      ['overall', 'Overall users score'],
      ['weighted_trimmed5', 'Weighted trimmed mean 5%'],
      ['weighted_trimmed10', 'Weighted trimmed mean 10%'],
      ['weighted_median', 'Weighted median'],
      ['weighted_mean', 'Weighted mean'],
      ['weighted_bayesian', 'Weighted Bayesian blend']
    ],
    metacritic: [
      ['critic', 'Critic score'],
      ['user', 'User score']
    ],
    rottenTomatoes: [
      ['critic', 'Critic score'],
      ['user', 'User score']
    ],
    tmdb: [['default', 'Vote average']],
    letterboxd: [
      ['user', 'User score'],
      ['weighted_trimmed5', 'Weighted trimmed mean 5%'],
      ['weighted_trimmed10', 'Weighted trimmed mean 10%'],
      ['weighted_median', 'Weighted median'],
      ['weighted_mean', 'Weighted mean'],
      ['weighted_bayesian', 'Weighted Bayesian blend']
    ]
  };

  const RATINGS_AGGREGATE_VOTE_COUNT_WEIGHT_RULES = [
    { label: '<100 votes', maxVotesExclusive: 100, multiplier: 0.5 },
    { label: '100-499 votes', maxVotesExclusive: 500, multiplier: 0.85 },
    { label: '500-999 votes', maxVotesExclusive: 1000, multiplier: 0.95 }
  ];

  const IMDB_SCORE_OVERRIDE_OPTIONS = [
    ['gender:FEMALE', 'IMDb Female voters'],
    ['gender:MALE', 'IMDb Male voters'],
    ['age:AGE_18_29', 'IMDb age 18-29'],
    ['age:AGE_30_44', 'IMDb age 30-44'],
    ['age:AGE_45_PLUS', 'IMDb age 45+'],
    ['userCategory:TOP_1000_VOTERS', 'IMDb top 1000 voters']
  ];

  const SETTING_DEFINITIONS = [
    ['showRatingsPanel', 'Show ratings panel', 'Display IMDb ratings in the main column.'],
    [
      'enableRatingsExport',
      'Enable ratings export',
      'Answer ratings export events for other scripts.'
    ],
    [
      'showTrailerPanel',
      'Show trailer panel',
      'Display IMDb trailer/video panel in the main column.'
    ],
    ['showCastPhotos', 'Show IMDb cast', 'Replace UNIT3D cast with IMDb cast/credits.'],
    ['showSimilarTitles', 'Show similar titles', 'Display IMDb More Like This.'],
    ['showTechnicalSpecs', 'Show technical specs', 'Display IMDb technical specs in the sidebar.'],
    ['showBoxOffice', 'Show box office', 'Display IMDb box office in the sidebar.'],
    ['showAwards', 'Show awards', 'Display IMDb awards in the sidebar.'],
    ['showSoundtracks', 'Show soundtracks', 'Display IMDb soundtrack in the main column.'],
    ['showAlternateVersions', 'Show alternate versions', 'Display IMDb alternate versions.'],
    ['showKeywords', 'Show keywords', 'Display IMDb keywords in the sidebar.'],
    ['showMovieInfo', 'Show movie info', 'Display IMDb movie info under the poster.'],
    ['showParentsGuide', 'Show parents guide', 'Display IMDb parents guide.'],
    ['showMetacritic', 'Show Metacritic', 'Include Metacritic in ratings.'],
    ['showMetacriticUserScore', 'Show Metacritic users', 'Display user score when available.'],
    ['showMetacriticBreakdown', 'Show Metacritic split', 'Display critic/user counts.'],
    ['showRottenTomatoes', 'Show Rotten Tomatoes', 'Fetch Rotten Tomatoes scores via Wikidata.'],
    ['showTmdb', 'Show TMDB', 'Fetch TMDB score from the linked TMDB page.'],
    ['showLetterboxd', 'Show Letterboxd', 'Fetch Letterboxd score from the IMDb redirect page.'],
    [
      'showLetterboxdHistogram',
      'Show Letterboxd histogram',
      'Display Letterboxd rating distribution.'
    ],
    [
      'showLetterboxdWeightedScore',
      'Show Letterboxd weighted score',
      'Display a weighted Letterboxd score badge.'
    ],
    [
      'showRatingsAggregate',
      'Show aggregate score',
      'Show aggregate score from enabled non-PTP sources.'
    ],
    [
      'showRatingsAggregateTileDetails',
      'Show aggregate details',
      'Display method/source details under the aggregate score.'
    ],
    ['showImdbMeter', 'Show IMDb meter', 'Display IMDb popularity meter.'],
    ['showImdbHistogram', 'Show IMDb histogram', 'Display IMDb vote histogram.'],
    ['showImdbWeightedScore', 'Show weighted IMDb score', 'Calculate trimmed IMDb score.'],
    [
      'showImdbDemographicScoreOverride',
      'Use demographic IMDb score',
      'Reserved for the selected IMDb demographic override.'
    ],
    ['showImdbDemographics', 'Show IMDb demographics', 'Display demographic rating rows.'],
    ['showImdbCountryAverages', 'Show country averages', 'Display country rating rows.'],
    [
      'discardHistogramExtremeBins',
      'Discard histogram extremes',
      'Ignore 1/10 and 10/10 bins for histogram-derived scores.'
    ],
    [
      'ratingsAggregateDropExtremes',
      'Drop aggregate extremes',
      'Drop lowest/highest source before aggregating when enough sources exist.'
    ],
    [
      'ratingsAggregateKeepRottenTomatoes',
      'Protect RT extremes',
      'Do not drop Rotten Tomatoes as an aggregate extreme unless it is an outlier.'
    ],
    [
      'ratingsAggregateUseVoteCountWeighting',
      'Vote-count aggregate weighting',
      'Reduce aggregate weight for very small vote counts.'
    ],
    ['showReviews', 'Show IMDb reviews', 'Reserved for review panel port.'],
    ['hideReviewSpoilers', 'Hide review spoilers', 'Reserved for review panel port.'],
    ['disableCustomColors', 'Disable custom colors', 'Use inherited colors only.']
  ];

  const RATINGS_EXPORT_REQUEST_EVENT = 'requestIMDbRatingsData';
  const RATINGS_EXPORT_RESPONSE_EVENT = 'imdbRatingsDataResponse';
  const RATINGS_EXPORT_UPDATE_EVENT = 'imdbRatingsDataUpdate';
  const TAG_HIDDEN_DATA_REQUEST_EVENT = 'requestIMDbTagHiddenData';
  const TAG_HIDDEN_DATA_RESPONSE_EVENT = 'imdbTagHiddenDataResponse';
  const TAG_HIDDEN_DATA_READY_EVENT = 'imdbTagHiddenDataReady';

  let currentImdbId = null;
  let currentTitleData = null;
  let currentNamesData = [];
  let currentSoundtracks = [];
  let currentTrailerData = null;
  let currentSupplementalRatings = {};
  let currentRenderToken = '';
  let renderTimer = null;
  let settings = { ...DEFAULT_SETTINGS };

  GM_registerMenuCommand('UNIT3D IMDb Script Settings', showSettingsPanel);
  GM_registerMenuCommand('UNIT3D IMDb Combined: flush cache', flushCache);

  installEventBridge();
  bootstrap();

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
html.unit3d-ptp-adapter-enabled .unit3d-imdb-panel-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-panel,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-panel.panelV2 {
  border-radius: 4px;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-panel .panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-heading-link {
  color: inherit;
  text-decoration: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-label {
  color: ${ACCENT_COLOR};
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-muted {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-kv {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 6px 10px;
  margin: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-kv dt {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-kv dd {
  margin: 0;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-chip {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 4px;
  color: inherit;
  padding: 3px 7px;
  text-decoration: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(116px, 1fr));
  gap: 10px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-card {
  color: inherit;
  min-width: 0;
  text-align: center;
  text-decoration: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-card a {
  color: inherit;
  text-decoration: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-card img {
  aspect-ratio: 2 / 3;
  background: rgba(255, 255, 255, 0.06);
  display: block;
  height: auto;
  object-fit: cover;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-card-title {
  display: block;
  font-size: 0.92em;
  line-height: 1.25;
  margin-top: 5px;
  overflow-wrap: anywhere;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-cast {
  display: grid;
  grid-template-columns: repeat(var(--unit3d-imdb-cast-columns, 8), minmax(0, 1fr));
  gap: 10px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-cast-card {
  min-width: 0;
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-cast-card img {
  background: rgba(255, 255, 255, 0.06);
  display: block;
  height: var(--unit3d-imdb-cast-image-height, 300px);
  object-fit: cover;
  object-position: center top;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-cast-name,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-cast-role {
  display: block;
  line-height: 1.2;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-cast-role {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  font-size: 0.88em;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-list {
  margin: 0;
  padding-left: 1.25rem;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-list li + li {
  margin-top: 5px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-table {
  border-collapse: collapse;
  font-size: 1em;
  text-align: left;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-table th,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  padding: 10px 8px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-table th:not(:first-child),
html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-table td:not(:first-child) {
  text-align: center;
  width: 34%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-highlight {
  color: ${ACCENT_COLOR};
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-count-button {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: inherit;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-count-button:hover,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-awards-count-button:focus-visible {
  color: ${ACCENT_COLOR};
}

.unit3d-imdb-awards-overlay {
  align-items: center;
  background: rgba(0, 0, 0, 0.76);
  box-sizing: border-box;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: fixed;
  z-index: 100000;
}

.unit3d-imdb-awards-dialog {
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
  color: #e8e8e8;
  max-height: min(86vh, 900px);
  max-width: min(920px, 94vw);
  overflow: auto;
  padding: 16px;
  width: 840px;
}

.unit3d-imdb-awards-dialog__header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.unit3d-imdb-awards-dialog__header h3 {
  color: ${ACCENT_COLOR};
  font-size: 1.1rem;
  margin: 0;
}

.unit3d-imdb-awards-dialog__close {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  display: flex;
  font-size: 24px;
  height: 34px;
  justify-content: center;
  line-height: 1;
  width: 34px;
}

.unit3d-imdb-awards-detail-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
}

.unit3d-imdb-awards-detail-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: grid;
  gap: 3px;
  list-style: none;
  padding: 9px 10px;
}

.unit3d-imdb-awards-detail-title {
  font-weight: 700;
}

.unit3d-imdb-awards-detail-meta {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.92em;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-spoiler {
  color: #ffb86c;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-ratings-grid {
  align-items: stretch;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-card {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
  color: inherit;
  display: grid;
  flex: 1 1 150px;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  text-align: center;
  text-decoration: none;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-card a {
  color: inherit;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-heading {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  font-size: 0.9em;
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-provider-heading {
  align-items: center;
  display: inline-flex;
  gap: 5px;
  justify-content: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-provider-heading img {
  max-height: 16px;
  width: auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-label,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-meta {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  font-size: 0.9em;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-value {
  color: ${settings.disableCustomColors ? 'inherit' : ACCENT_COLOR};
  font-size: 1.7em;
  line-height: 1;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-value-line {
  align-items: center;
  display: inline-flex;
  gap: 6px;
  justify-content: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-weighted-score-badge {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: ${settings.disableCustomColors ? 'inherit' : ACCENT_COLOR};
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  padding: 3px 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-provider-split {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-provider-split-value {
  align-items: center;
  color: ${settings.disableCustomColors ? 'inherit' : ACCENT_COLOR};
  display: inline-flex;
  font-size: 1.45em;
  font-weight: 700;
  gap: 5px;
  justify-content: center;
  line-height: 1;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-provider-split-value img {
  height: 22px;
  width: auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-provider-split-label {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  font-size: 0.82em;
  font-weight: 700;
  margin-top: 3px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-consensus {
  color: var(--text-muted, rgba(255, 255, 255, 0.72));
  flex: 1 0 100%;
  min-width: 0;
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-wide {
  flex: 1 0 100%;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-rating-wide h3 {
  font-size: 1em;
  margin: 4px 0 8px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-histogram-rowset {
  align-items: stretch;
  display: flex;
  flex: 1 0 100%;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-histogram-rowset > .unit3d-imdb-rating-wide {
  flex: 1 1 300px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-histogram-row {
  align-items: center;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 76px;
  gap: 8px;
  margin: 4px 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-histogram-bar {
  background:
    linear-gradient(90deg, ${settings.disableCustomColors ? 'currentColor' : ACCENT_COLOR} var(--unit3d-imdb-bar-width), rgba(255, 255, 255, 0.12) var(--unit3d-imdb-bar-width));
  border-radius: 2px;
  height: 10px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-heading-action {
  font-size: 0.85em;
  margin-left: auto;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: -10px;
  min-width: 0;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-column:first-child {
  border-right: 1px solid rgba(255, 255, 255, 0.14);
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-row {
  align-items: center;
  display: flex;
  gap: 8px;
  min-height: 31px;
  min-width: 0;
  overflow: hidden;
  padding: 6px 14px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.035);
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-row:nth-child(even) {
  background: rgba(0, 0, 0, 0.08);
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-artist,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-artist {
  flex: 0 1 38%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-title {
  flex: 1 1 auto;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-empty {
  padding: 11px;
  text-align: center;
}

@media (max-width: 760px) {
  html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-grid {
    grid-template-columns: 1fr;
  }

  html.unit3d-ptp-adapter-enabled .unit3d-imdb-soundtrack-column:first-child {
    border-right: 0;
  }
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer {
  display: grid;
  gap: 10px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-synopsis-trailer {
  margin-bottom: 12px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-video iframe,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-video video {
  background: #000;
  border: 0;
  display: block;
  height: 100%;
  object-fit: contain;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-poster {
  align-items: center;
  background:
    linear-gradient(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.34)),
    var(--unit3d-imdb-trailer-poster, #000);
  background-position: center;
  background-size: cover;
  border: 0;
  color: #fff;
  cursor: pointer;
  display: flex;
  height: ${IMDB_TRAILER_PREVIEW_HEIGHT}px;
  justify-content: center;
  padding: 0;
  position: relative;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-play {
  align-items: center;
  background: rgba(0, 0, 0, 0.62);
  border: 2px solid rgba(255, 255, 255, 0.86);
  border-radius: 999px;
  display: flex;
  height: 76px;
  justify-content: center;
  transition:
    background 120ms ease,
    transform 120ms ease;
  width: 76px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-poster:hover .unit3d-imdb-trailer-play,
html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-poster:focus-visible .unit3d-imdb-trailer-play {
  background: rgba(0, 0, 0, 0.78);
  transform: scale(1.04);
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-play::before {
  border-bottom: 17px solid transparent;
  border-left: 27px solid currentColor;
  border-top: 17px solid transparent;
  content: '';
  margin-left: 6px;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-title {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.76));
  bottom: 0;
  box-sizing: border-box;
  font-weight: 700;
  left: 0;
  overflow: hidden;
  padding: 24px 12px 10px;
  position: absolute;
  right: 0;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-video-wrapper {
  background: #000;
  height: ${IMDB_TRAILER_PREVIEW_HEIGHT}px;
  overflow: hidden;
  position: relative;
  transition: height 180ms ease;
  width: 100%;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-video-error::after {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  content: 'IMDb video source unavailable.';
  display: block;
  padding: 8px 0;
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-external {
  align-items: center;
  color: var(--text-color, rgba(255, 255, 255, 0.88));
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: ${IMDB_TRAILER_PREVIEW_HEIGHT}px;
  justify-content: center;
  padding: 12px;
  text-align: center;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-external a {
  color: ${settings.disableCustomColors ? 'inherit' : ACCENT_COLOR};
  font-weight: 700;
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-external small {
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
}

html.unit3d-ptp-adapter-enabled .unit3d-imdb-trailer-video-loading::after {
  align-items: center;
  background: #000;
  color: var(--text-muted, rgba(255, 255, 255, 0.68));
  content: 'Refreshing trailer source...';
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
  text-align: center;
  z-index: 1;
}

.unit3d-imdb-poster-lightbox {
  align-items: center;
  background: rgba(0, 0, 0, 0.86);
  box-sizing: border-box;
  cursor: zoom-out;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: fixed;
  z-index: 100000;
}

.unit3d-imdb-poster-lightbox__image {
  background: #111;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
  cursor: default;
  max-height: calc(100vh - 48px);
  max-width: calc(100vw - 48px);
  object-fit: contain;
}

.unit3d-imdb-poster-lightbox__close {
  align-items: center;
  background: rgba(20, 20, 20, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  color: #f2f2f2;
  cursor: pointer;
  display: flex;
  font-size: 28px;
  height: 40px;
  justify-content: center;
  line-height: 1;
  position: fixed;
  right: 18px;
  top: 18px;
  width: 40px;
}

.unit3d-imdb-settings-overlay {
  align-items: center;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  inset: 0;
  justify-content: center;
  position: fixed;
  z-index: 99999;
}

.unit3d-imdb-settings-dialog {
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.45);
  color: #e8e8e8;
  max-height: 86vh;
  max-width: min(980px, 94vw);
  overflow: auto;
  padding: 18px;
  width: 860px;
}

.unit3d-imdb-settings-header,
.unit3d-imdb-settings-actions {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.unit3d-imdb-settings-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin: 16px 0;
}

.unit3d-imdb-settings-group {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 10px;
}

.unit3d-imdb-settings-group h3 {
  color: ${settings.disableCustomColors ? 'inherit' : ACCENT_COLOR};
  font-size: 1em;
  margin: 0 0 8px;
}

.unit3d-imdb-setting-row {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin: 7px 0;
}

.unit3d-imdb-setting-row span {
  min-width: 0;
}

.unit3d-imdb-setting-row input[type='number'],
.unit3d-imdb-setting-row select {
  max-width: 120px;
}
`;
    (document.head || document.documentElement).appendChild(style);
  }

  async function bootstrap() {
    await waitForDocument();
    await loadSettings();
    installStyles();
    const imdbId = await findImdbIdWithRetry();
    if (!imdbId) return;

    currentImdbId = imdbId;

    try {
      const result = await getTitleBundle(imdbId);
      currentTitleData = result.titleData;
      currentNamesData = result.namesData;
      currentSoundtracks = result.soundtracks;
      currentTrailerData = result.trailerData;
      currentSupplementalRatings = createInitialSupplementalState();

      publishTagHiddenTitleData(imdbId, currentTitleData, result.source);
      publishRatingsSnapshot(imdbId, currentTitleData, true);
      scheduleRender();
      fetchSupplementalRatings(imdbId, currentTitleData);

      document.dispatchEvent(
        new CustomEvent('imdbProcessingComplete', {
          detail: {
            imdbId,
            timestamp: Date.now(),
            source: SCRIPT_SOURCE,
            success: true,
            titleData: currentTitleData,
            processedSoundtracks: currentSoundtracks,
            namesData: currentNamesData
          }
        })
      );
    } catch (error) {
      console.error('[UNIT3D IMDb Combined] processing failed', error);
      document.dispatchEvent(
        new CustomEvent('imdbProcessingComplete', {
          detail: {
            imdbId,
            timestamp: Date.now(),
            source: SCRIPT_SOURCE,
            success: false,
            error: error.message || String(error)
          }
        })
      );
    }
  }

  function installEventBridge() {
    document.addEventListener('unit3d:ptp-dom-ready', scheduleRender);

    document.addEventListener('imdbScriptPing', (event) => {
      const { pingId } = event.detail || {};
      document.dispatchEvent(new CustomEvent('imdbScriptPong', { detail: { pingId } }));
    });

    document.addEventListener('requestIMDbData', async (event) => {
      const { imdbId, requestId } = event.detail || {};
      const response = await buildCacheResponse(imdbId, requestId);
      document.dispatchEvent(new CustomEvent('imdbDataResponse', { detail: response }));
    });

    document.addEventListener(TAG_HIDDEN_DATA_REQUEST_EVENT, async (event) => {
      const { imdbId, requestId } = event.detail || {};
      const titleData =
        imdbId === currentImdbId && currentTitleData
          ? currentTitleData
          : (await getCachedTitleData(imdbId))?.data?.title;
      const payload = extractTagHiddenTitlePayload(titleData);
      document.dispatchEvent(
        new CustomEvent(TAG_HIDDEN_DATA_RESPONSE_EVENT, {
          detail: {
            found: !!payload,
            imdbId,
            requestId,
            source: SCRIPT_SOURCE,
            success: !!payload,
            titleData: payload
          }
        })
      );
    });

    document.addEventListener(RATINGS_EXPORT_REQUEST_EVENT, async (event) => {
      const { imdbId, requestId } = event.detail || {};
      const titleData =
        imdbId === currentImdbId && currentTitleData
          ? currentTitleData
          : (await getCachedTitleData(imdbId))?.data?.title;
      document.dispatchEvent(
        new CustomEvent(RATINGS_EXPORT_RESPONSE_EVENT, {
          detail: buildRatingsSnapshot(imdbId, titleData, requestId)
        })
      );
    });
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPanels, 80);
  }

  function renderPanels() {
    if (!currentImdbId || !currentTitleData) return;

    const mainColumn = document.querySelector('.unit3d-ptp-page .main-column');
    const sidebar = document.querySelector('.unit3d-ptp-sidebar');
    if (!mainColumn && !sidebar) return;

    cleanupDuplicateSidebarPanels(sidebar);

    const token = [
      currentImdbId,
      document.querySelector('.unit3d-ptp-page')?.isConnected ? 'layout' : 'no-layout',
      currentTitleData.titleText?.text || '',
      currentTitleData.primaryImage?.url || '',
      JSON.stringify(settings),
      JSON.stringify(currentSupplementalRatings)
    ].join('|');
    if (token === currentRenderToken && document.getElementById(PANEL_ROOT_ID)) {
      syncSynopsisTrailer(mainColumn);
      ensureMainPanelOrder(mainColumn);
      return;
    }
    currentRenderToken = token;

    document.getElementById(PANEL_ROOT_ID)?.remove();
    document.getElementById(SIDEBAR_ROOT_ID)?.remove();

    if (mainColumn) {
      const root = document.createElement('div');
      root.id = PANEL_ROOT_ID;
      root.className = 'unit3d-imdb-panel-root';
      appendMainPanels(root);
      if (root.childElementCount > 0) {
        const synopsisPanel = mainColumn.querySelector('.unit3d-ptp-synopsis-panel');
        const anchor = synopsisPanel || mainColumn.querySelector('.unit3d-ptp-table-scroll');
        if (anchor) anchor.after(root);
        else mainColumn.appendChild(root);
      }
      syncSynopsisTrailer(mainColumn);
      replaceCastPanel(mainColumn);
      ensureMainPanelOrder(mainColumn);
    }

    if (sidebar) {
      replacePosterWithIMDb(sidebar, currentTitleData);
      const root = document.createElement('div');
      root.id = SIDEBAR_ROOT_ID;
      root.className = 'unit3d-imdb-panel-root';
      appendSidebarPanels(root);
      if (root.childElementCount > 0) {
        const posterPanel = sidebar.querySelector('.unit3d-ptp-poster-panel');
        if (posterPanel) posterPanel.after(root);
        else sidebar.appendChild(root);
      }
    }
  }

  function appendMainPanels(root) {
    const ratings = settings.showRatingsPanel ? buildRatingsPanel(currentTitleData) : null;
    const alternateVersions = settings.showAlternateVersions
      ? buildAlternateVersionsPanel(currentTitleData)
      : null;
    const soundtracks = settings.showSoundtracks
      ? buildSoundtracksPanel(currentSoundtracks, currentTitleData)
      : null;
    const similar =
      settings.showSimilarTitles && settings.similarTitlesPlacement === 'main'
        ? buildSimilarTitlesPanel(currentTitleData)
        : null;

    [ratings, alternateVersions, soundtracks, similar].filter(Boolean).forEach((panel) => {
      root.appendChild(panel);
    });
  }

  function getOriginalIMDbImageUrl(imageUrl) {
    return String(imageUrl || '').replace(/\._V1(?:_[^./]+)*\.(jpe?g|png|webp)$/i, '._V1_.$1');
  }

  function replacePosterWithIMDb(sidebar, titleData) {
    const posterUrl = titleData?.primaryImage?.url;
    if (!sidebar || !posterUrl) return;

    const posterPanel = sidebar.querySelector('.unit3d-ptp-poster-panel');
    const body = posterPanel?.querySelector('.panel__body');
    if (!body) return;

    let image = body.querySelector('img.unit3d-ptp-poster-image, img.meta__poster, img[src]');
    let link = image?.closest('a[href]');
    if (!image) {
      image = document.createElement('img');
      image.className = 'unit3d-ptp-poster-image';
      body.prepend(image);
    }
    if (!link) {
      link = document.createElement('a');
      link.className = 'meta__poster-link';
      image.replaceWith(link);
      link.appendChild(image);
    }

    const absolutePosterUrl = new URL(posterUrl, location.href).toString();
    const originalPosterUrl = getOriginalIMDbImageUrl(absolutePosterUrl);
    const posterTitle = titleData.titleText?.text || 'IMDb poster';
    image.src = absolutePosterUrl;
    image.alt = posterTitle;
    image.classList.add('unit3d-ptp-poster-image');
    link.href = originalPosterUrl;
    link.title = 'Open original IMDb poster';
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.onclick = (event) => {
      event.preventDefault();
      showPosterLightbox(originalPosterUrl, posterTitle);
    };
  }

  function showPosterLightbox(imageUrl, title) {
    closePosterLightbox();

    const overlay = document.createElement('div');
    overlay.className = 'unit3d-imdb-poster-lightbox';
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const image = document.createElement('img');
    image.className = 'unit3d-imdb-poster-lightbox__image';
    image.src = imageUrl;
    image.alt = title;

    const close = document.createElement('button');
    close.className = 'unit3d-imdb-poster-lightbox__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close poster');
    close.textContent = '×';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closePosterLightbox();
    };
    overlay.unit3dImdbCleanup = () => document.removeEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target === close) closePosterLightbox();
    });

    document.addEventListener('keydown', onKeyDown);
    overlay.append(image, close);
    document.body.appendChild(overlay);
    overlay.focus();
  }

  function closePosterLightbox() {
    const existing = document.querySelector('.unit3d-imdb-poster-lightbox');
    existing?.unit3dImdbCleanup?.();
    existing?.remove();
  }

  function syncSynopsisTrailer(mainColumn) {
    const synopsisBody = mainColumn?.querySelector('.unit3d-ptp-synopsis-panel .panel__body');
    document.getElementById('unit3d-imdb-trailer')?.remove();
    if (!synopsisBody || !settings.showTrailerPanel) {
      document.getElementById('unit3d-imdb-synopsis-trailer')?.remove();
      return;
    }

    const trailerKey = buildTrailerKey(currentTrailerData);
    const existing = document.getElementById('unit3d-imdb-synopsis-trailer');
    if (existing?.dataset.trailerKey === trailerKey && existing.parentElement === synopsisBody) {
      return;
    }
    existing?.remove();

    const trailer = buildTrailerEmbed(currentTrailerData);
    if (!trailer) return;
    trailer.id = 'unit3d-imdb-synopsis-trailer';
    trailer.dataset.trailerKey = trailerKey;
    trailer.classList.add('unit3d-imdb-synopsis-trailer');
    synopsisBody.prepend(trailer);
  }

  function buildTrailerKey(trailerData) {
    if (!trailerData?.videos?.length) return '';
    return [
      trailerData.defaultVideoId || '',
      ...trailerData.videos.map(
        (video) =>
          `${video.id}:${video.youtubeKey || video.embedUrl || video.primarySource?.url || ''}`
      )
    ].join('|');
  }

  function appendSidebarPanels(root) {
    const movieInfo = settings.showMovieInfo ? buildMovieInfoPanel(currentTitleData) : null;
    const specs = settings.showTechnicalSpecs ? buildTechnicalSpecsPanel(currentTitleData) : null;
    const boxOffice = settings.showBoxOffice ? buildBoxOfficePanel(currentTitleData) : null;
    const awards = settings.showAwards ? buildAwardsPanel(currentTitleData) : null;
    const parentalGuide = settings.showParentsGuide
      ? buildParentsGuidePanel(currentTitleData)
      : null;
    const similar =
      settings.showSimilarTitles && settings.similarTitlesPlacement === 'sidebar'
        ? buildSimilarTitlesPanel(currentTitleData)
        : null;
    const keywords = settings.showKeywords ? buildKeywordsPanel(currentTitleData) : null;

    [movieInfo, specs, boxOffice, awards, parentalGuide, similar, keywords]
      .filter(Boolean)
      .forEach((panel) => {
        root.appendChild(panel);
      });
  }

  function ensureMainPanelOrder(mainColumn) {
    if (!mainColumn) return;

    const table = mainColumn.querySelector('.unit3d-ptp-table-scroll');
    const synopsisPanel = mainColumn.querySelector('.unit3d-ptp-synopsis-panel');
    const root = document.getElementById(PANEL_ROOT_ID);
    if (table && synopsisPanel && synopsisPanel.previousElementSibling !== table) {
      table.after(synopsisPanel);
    }
    if (root) {
      const anchor = synopsisPanel || table;
      if (anchor && root.previousElementSibling !== anchor) anchor.after(root);
    }

    const castPanel =
      root?.querySelector('#unit3d-imdb-cast') || mainColumn.querySelector('#unit3d-imdb-cast');
    if (!root || !castPanel) return;

    const ratingsPanel = root.querySelector('#unit3d-imdb-ratings');
    if (ratingsPanel) {
      if (ratingsPanel.nextElementSibling !== castPanel) ratingsPanel.after(castPanel);
    } else if (root.firstElementChild !== castPanel) {
      root.prepend(castPanel);
    }
  }

  function cleanupDuplicateSidebarPanels(sidebar) {
    if (!sidebar) return;

    sidebar.querySelectorAll('.unit3d-ptp-ids-panel').forEach((panel) => panel.remove());
    sidebar.querySelectorAll('.unit3d-ptp-meta-sidebar-panel').forEach((panel) => {
      const heading = normalizeText(panel.querySelector('.panel__heading')?.textContent);
      if (/^(ids?|tags?|chips)$/i.test(heading)) {
        panel.remove();
      }
    });
  }

  function replaceCastPanel(mainColumn) {
    if (!mainColumn) return;

    const existingCastPanels = [...mainColumn.querySelectorAll('.unit3d-ptp-cast-panel')];
    const target = existingCastPanels.shift() || createCastShell(mainColumn);
    existingCastPanels.forEach((panel) => panel.remove());

    if (!settings.showCastPhotos) {
      target.remove();
      return;
    }

    const nextCastPanel = buildCastPanel(currentTitleData, currentNamesData);
    if (!nextCastPanel) {
      target.remove();
      return;
    }

    target.replaceChildren(...nextCastPanel.childNodes);
    target.className = 'panelV2 unit3d-ptp-cast-panel unit3d-imdb-panel';
    target.id = 'unit3d-imdb-cast';
  }

  function createCastShell(mainColumn) {
    const panel = document.createElement('section');
    panel.className = 'panelV2 unit3d-ptp-cast-panel unit3d-imdb-panel';

    const synopsisPanel = mainColumn.querySelector('.unit3d-ptp-synopsis-panel');
    if (synopsisPanel) {
      synopsisPanel.after(panel);
      return panel;
    }

    const imdbRoot = document.getElementById(PANEL_ROOT_ID);
    if (imdbRoot) {
      imdbRoot.after(panel);
      return panel;
    }

    mainColumn.appendChild(panel);
    return panel;
  }

  function buildRatingsPanel(titleData) {
    const body = document.createElement('div');
    body.className = 'unit3d-imdb-ratings-grid';

    const cards = buildRatingCards(titleData);
    cards.forEach((card) => body.appendChild(card));

    const consensus = currentSupplementalRatings.rottenTomatoes?.data?.consensus;
    if (settings.showRottenTomatoes && consensus) {
      const consensusElement = document.createElement('div');
      consensusElement.className = 'unit3d-imdb-rating-consensus';
      const text = document.createElement('em');
      text.textContent = consensus;
      consensusElement.appendChild(text);
      body.appendChild(consensusElement);
    }

    const histogram = settings.showImdbHistogram ? buildHistogram(titleData) : null;
    const letterboxdHistogram =
      shouldShowLetterboxdPanels() && settings.showLetterboxdHistogram
        ? buildLetterboxdHistogram(currentSupplementalRatings.letterboxd)
        : null;
    const histogramRow = buildHistogramRow([histogram, letterboxdHistogram]);
    if (histogramRow) body.appendChild(histogramRow);

    const demographics = settings.showImdbDemographics ? buildDemographics(titleData) : null;
    if (demographics) body.appendChild(demographics);

    const countries = settings.showImdbCountryAverages ? buildCountryAverages(titleData) : null;
    if (countries) body.appendChild(countries);

    if (!body.childElementCount) return null;

    return createPanel('IMDb Ratings', body, {
      id: 'unit3d-imdb-ratings',
      url: `${imdbTitleUrl(titleData.id)}ratings/`
    });
  }

  function buildHistogramRow(histograms) {
    const usable = histograms.filter(Boolean);
    if (usable.length === 0) return null;

    const row = document.createElement('div');
    row.className = 'unit3d-imdb-histogram-rowset';
    row.append(...usable);
    return row;
  }

  function buildRatingCards(titleData) {
    const cards = [];
    const rating = titleData.ratingsSummary?.aggregateRating;
    const votes = titleData.ratingsSummary?.voteCount;
    const demographicOverride = getDemographicScoreOverrideSummary(titleData);
    const primaryRating = demographicOverride?.score ?? rating;
    const primaryVotes = demographicOverride?.votes ?? votes;
    const metascore = titleData.metacritic?.metascore?.score;
    const meterRank = titleData.meterRank?.currentRank;
    const weighted = getWeightedScoreSummary(getTitleHistogramValues(titleData), {
      enabled: settings.showImdbWeightedScore,
      sourceLabel: 'IMDb'
    });
    const imdbMetaPrefix =
      demographicOverride?.label ||
      (isHistogramExtremeTrimActive(getTitleHistogramValues(titleData)) ? 'Trimmed extremes' : '');

    if (Number.isFinite(primaryRating) || Number.isFinite(primaryVotes)) {
      cards.push(
        buildRatingCard(
          'IMDb Users',
          Number.isFinite(primaryRating) ? `${primaryRating.toFixed(1)}` : '-',
          Number.isFinite(primaryVotes) ? `${formatCount(primaryVotes)} votes` : '',
          `${imdbTitleUrl(titleData.id)}ratings/`,
          {
            badge: weighted ? weighted.score.toFixed(1) : '',
            badgeTitle: weighted?.tooltip || '',
            metaPrefix: imdbMetaPrefix
          }
        )
      );
    }

    if (settings.showImdbMeter && Number.isFinite(meterRank)) {
      const change = titleData.meterRank?.rankChange;
      const meta = change?.difference
        ? `${change.changeDirection || 'changed'} ${formatCount(change.difference)}`
        : '';
      cards.push(
        buildRatingCard(
          'IMDb Meter',
          `#${formatCount(meterRank)}`,
          meta,
          imdbTitleUrl(titleData.id)
        )
      );
    }

    if (settings.showMetacritic && Number.isFinite(metascore)) {
      const reviews = titleData.metacritic?.metascore?.reviewCount;
      const meta = currentSupplementalRatings.metacritic?.data;
      const metaPending = currentSupplementalRatings.metacritic?.status === 'pending';
      const metaCritic = meta?.critic || {};
      const metaUser = meta?.user || {};
      const metaCriticScore = Number.isFinite(metaCritic.score) ? metaCritic.score : metascore;
      const metaCriticCount = Number.isFinite(metaCritic.count) ? metaCritic.count : reviews;
      const metaUserScore = Number.isFinite(metaUser.score) ? metaUser.score : null;
      const metaUserCount = Number.isFinite(metaUser.count) ? metaUser.count : null;
      const metaCriticBreakdown = formatMetacriticBreakdown(metaCritic);
      const metaUserBreakdown = formatMetacriticBreakdown(metaUser);
      const metaUserVisible = settings.showMetacriticUserScore || settings.showMetacriticBreakdown;
      if (metaUserVisible) {
        cards.push(
          buildSplitRatingCard(
            'Metacritic',
            meta?.url || titleData.metacritic?.url || imdbTitleUrl(titleData.id),
            [
              {
                label: 'Critics',
                meta: metaPending
                  ? 'Loading Metacritic...'
                  : `${Number.isFinite(metaCriticCount) ? `${formatCount(metaCriticCount)} critic reviews` : 'No critics'}${
                      settings.showMetacriticBreakdown && metaCriticBreakdown
                        ? ` - ${metaCriticBreakdown}`
                        : ''
                    }`,
                value: Number.isFinite(metaCriticScore) ? `${metaCriticScore}` : 'None'
              },
              {
                label: 'Users',
                meta: metaPending
                  ? 'Loading Metacritic users...'
                  : `${Number.isFinite(metaUserCount) ? `${formatCount(metaUserCount)} user ratings` : 'No user ratings'}${
                      settings.showMetacriticBreakdown && metaUserBreakdown
                        ? ` - ${metaUserBreakdown}`
                        : ''
                    }`,
                value: settings.showMetacriticUserScore
                  ? Number.isFinite(metaUserScore)
                    ? metaUserScore.toFixed(1)
                    : 'None'
                  : ''
              }
            ],
            { iconUrl: meta?.critic?.badgeUrl || meta?.badgeUrl || '' }
          )
        );
      } else {
        cards.push(
          buildRatingCard(
            'Metacritic',
            `${metascore}`,
            Number.isFinite(reviews) ? `${formatCount(reviews)} critic reviews` : '',
            titleData.metacritic?.url || imdbTitleUrl(titleData.id),
            { iconUrl: meta?.critic?.badgeUrl || meta?.badgeUrl || '' }
          )
        );
      }
    }

    appendSupplementalProviderCards(cards);

    if (settings.showRatingsAggregate) {
      const aggregate = calculateAggregateScore(titleData);
      if (aggregate) {
        cards.push(
          buildRatingCard(
            'Aggregate',
            Number.isFinite(aggregate.score) ? aggregate.score.toFixed(1) : '-',
            `${aggregate.usedSources.length} source${aggregate.usedSources.length === 1 ? '' : 's'} used`,
            imdbTitleUrl(titleData.id),
            { title: aggregate.tooltip }
          )
        );
      }
    }
    return cards;
  }

  function buildRatingCard(label, value, meta, url, options = {}) {
    const card = document.createElement('div');
    card.className = 'unit3d-imdb-rating-card';
    if (options.title) card.title = options.title;

    const labelElement = buildRatingHeading(label, url, options.iconUrl || '');

    const valueLine = document.createElement('div');
    valueLine.className = 'unit3d-imdb-rating-value-line';

    const valueElement = document.createElement('strong');
    valueElement.className = 'unit3d-imdb-rating-value';
    valueElement.textContent = value;
    valueLine.appendChild(valueElement);

    if (options.badge) {
      const badge = document.createElement('span');
      badge.className = 'unit3d-imdb-weighted-score-badge';
      badge.textContent = options.badge;
      if (options.badgeTitle) badge.title = options.badgeTitle;
      valueLine.appendChild(badge);
    }

    const metaElement = document.createElement('span');
    metaElement.className = 'unit3d-imdb-rating-meta';
    metaElement.textContent = [options.metaPrefix, meta].filter(Boolean).join(' - ');

    card.append(labelElement, valueLine, metaElement);
    return card;
  }

  function buildRatingHeading(label, url, iconUrl = '') {
    const heading = document.createElement('span');
    heading.className = 'unit3d-imdb-rating-heading';

    const target = url ? document.createElement('a') : document.createElement('span');
    target.className = iconUrl ? 'unit3d-imdb-provider-heading' : '';
    if (url) {
      target.href = url;
      openInNewTab(target);
    }
    if (iconUrl) {
      const icon = document.createElement('img');
      icon.alt = '';
      icon.src = iconUrl;
      target.appendChild(icon);
    }
    const text = document.createElement('span');
    text.textContent = label;
    target.appendChild(text);
    heading.appendChild(target);
    return heading;
  }

  function buildSplitRatingCard(label, url, parts, options = {}) {
    const card = document.createElement('div');
    card.className = 'unit3d-imdb-rating-card';
    card.appendChild(buildRatingHeading(label, url, options.iconUrl));

    const split = document.createElement('div');
    split.className = 'unit3d-imdb-provider-split';
    parts.forEach((part) => {
      const item = document.createElement('div');
      const value = document.createElement('div');
      value.className = 'unit3d-imdb-provider-split-value';
      if (part.iconUrl) {
        const icon = document.createElement('img');
        icon.alt = part.iconAlt || '';
        icon.src = part.iconUrl;
        value.appendChild(icon);
      }
      const valueText = document.createElement('span');
      valueText.textContent = part.value || '-';
      value.appendChild(valueText);
      const itemLabel = document.createElement('div');
      itemLabel.className = 'unit3d-imdb-provider-split-label';
      itemLabel.textContent = part.label;
      const meta = document.createElement('div');
      meta.className = 'unit3d-imdb-rating-meta';
      if (part.metaUrl && part.meta) {
        const metaLink = document.createElement('a');
        metaLink.href = part.metaUrl;
        metaLink.textContent = part.meta;
        if (part.metaTitle) metaLink.title = part.metaTitle;
        openInNewTab(metaLink);
        meta.appendChild(metaLink);
      } else {
        meta.textContent = part.meta || '';
      }
      item.append(value, itemLabel, meta);
      split.appendChild(item);
    });
    card.appendChild(split);
    return card;
  }

  function appendSupplementalProviderCards(cards) {
    if (settings.showRottenTomatoes) {
      const rt = currentSupplementalRatings.rottenTomatoes;
      const data = rt?.data;
      if (rt?.status === 'pending' || rt?.status === 'error' || data) {
        cards.push(
          buildSplitRatingCard('Rotten Tomatoes', data?.url || imdbTitleUrl(currentImdbId), [
            {
              iconAlt: data?.critic?.iconLabel || 'Rotten Tomatoes critic status',
              iconUrl: data?.critic?.icon || '',
              label: 'Critics',
              meta: formatRtCount(data?.critic, rt),
              metaTitle: Number.isFinite(data?.critic?.percent)
                ? `${data.critic.percent}% of critics have given this movie a positive review.`
                : '',
              metaUrl: data?.critic?.url || '',
              value: formatRtPercent(data?.critic, rt)
            },
            {
              iconAlt: data?.user?.iconLabel || 'Rotten Tomatoes audience status',
              iconUrl: data?.user?.icon || '',
              label: 'Users',
              meta: formatRtCount(data?.user, rt),
              metaTitle: Number.isFinite(data?.user?.percent)
                ? `${data.user.percent}% of users have rated this movie 3.5 stars or higher.`
                : '',
              metaUrl: data?.user?.url || '',
              value: formatRtPercent(data?.user, rt)
            }
          ])
        );
      }
    }

    if (settings.showTmdb) {
      const tmdb = currentSupplementalRatings.tmdb;
      cards.push(
        buildRatingCard(
          'TMDB',
          formatProviderScore(tmdb, 'tmdb'),
          formatProviderMeta(tmdb, 'tmdb'),
          tmdb?.data?.url || findTmdbUrl() || imdbTitleUrl(currentImdbId)
        )
      );
    }

    if (shouldShowLetterboxdPanels() && settings.showLetterboxd) {
      const lb = currentSupplementalRatings.letterboxd;
      const weighted = getWeightedScoreSummary(lb?.data?.histogram || [], {
        displayScoreMultiplier: 2,
        enabled: settings.showLetterboxdWeightedScore,
        sourceLabel: 'Letterboxd'
      });
      cards.push(
        buildRatingCard(
          'Letterboxd',
          formatProviderScore(lb, 'letterboxd'),
          formatProviderMeta(lb, 'letterboxd'),
          lb?.data?.url || `https://letterboxd.com/imdb/${currentImdbId}/`,
          weighted
            ? {
                badge: weighted.displayScore.toFixed(1),
                badgeTitle: weighted.tooltip,
                metaPrefix: isHistogramExtremeTrimActive(lb?.data?.histogram || [])
                  ? 'Trimmed extremes'
                  : ''
              }
            : {}
        )
      );
    }
  }

  function formatRtPercent(part, provider) {
    if (!provider || provider.status === 'pending') return '...';
    if (provider.status === 'error') return 'Error';
    return Number.isFinite(part?.percent) ? `${part.percent}%` : 'None';
  }

  function formatRtCount(part, provider) {
    if (!provider || provider.status === 'pending') return 'Loading Rotten Tomatoes...';
    if (provider.status === 'error') return provider.error || 'fetch failed';
    if (typeof part?.countDisplay === 'string' && part.countDisplay.trim()) {
      return part.countDisplay
        .trim()
        .replace(/\s*Ratings?\b/gi, '')
        .trim();
    }
    return Number.isFinite(part?.count) ? `${formatCount(part.count)} votes` : 'Unknown';
  }

  function formatProviderScore(provider, key) {
    if (!provider || provider.status === 'pending') return '...';
    if (provider.status === 'error') return 'Error';
    if (!provider.data) return '-';

    if (key === 'rottenTomatoes') {
      const critic = provider.data.critic;
      const audience = provider.data.user;
      if (Number.isFinite(critic?.percent)) return `${critic.percent}%`;
      if (Number.isFinite(audience?.percent)) return `${audience.percent}%`;
      return '-';
    }

    if (key === 'tmdb') {
      return Number.isFinite(provider.data.score) ? provider.data.score.toFixed(1) : '-';
    }

    if (key === 'letterboxd') {
      return Number.isFinite(provider.data.user?.score)
        ? (provider.data.user.score / 10).toFixed(1)
        : '-';
    }

    return '-';
  }

  function formatProviderMeta(provider, key) {
    if (!provider || provider.status === 'pending') return 'loading';
    if (provider.status === 'error') return provider.error || 'fetch failed';
    if (!provider.data) return 'not found';

    if (key === 'rottenTomatoes') {
      const critic = provider.data.critic;
      const audience = provider.data.user;
      const parts = [];
      if (Number.isFinite(critic?.count)) parts.push(`${formatCount(critic.count)} critics`);
      if (Number.isFinite(audience?.count)) parts.push(`${formatCount(audience.count)} audience`);
      return parts.join(' / ') || 'available';
    }

    if (key === 'tmdb') {
      return Number.isFinite(provider.data.count)
        ? `${formatCount(provider.data.count)} votes`
        : 'available';
    }

    if (key === 'letterboxd') {
      const count = provider.data.user?.count;
      const likes = provider.data.likes;
      const parts = [];
      if (Number.isFinite(count)) parts.push(`${formatCount(count)} ratings`);
      if (Number.isFinite(likes)) parts.push(`${formatCount(likes)} likes`);
      return parts.join(' / ') || 'available';
    }

    return '';
  }

  function buildHistogram(titleData) {
    const values = getAdjustedHistogramValues(getTitleHistogramValues(titleData));
    if (values.length === 0) return null;

    const maxVotes = Math.max(...values.map((item) => item.voteCount || 0), 0);
    if (maxVotes <= 0) return null;

    const container = document.createElement('div');
    container.className = 'unit3d-imdb-rating-wide unit3d-imdb-histogram';

    const heading = document.createElement('h3');
    heading.textContent = 'IMDb vote histogram';
    container.appendChild(heading);

    values
      .slice()
      .sort((left, right) => right.rating - left.rating)
      .forEach((item) => {
        const row = document.createElement('div');
        row.className = 'unit3d-imdb-histogram-row';

        const label = document.createElement('span');
        label.textContent = `${item.rating}`;

        const bar = document.createElement('span');
        bar.className = 'unit3d-imdb-histogram-bar';
        bar.style.setProperty(
          '--unit3d-imdb-bar-width',
          `${((item.voteCount || 0) / maxVotes) * 100}%`
        );

        const count = document.createElement('span');
        count.textContent = formatCount(item.voteCount || 0);

        row.append(label, bar, count);
        container.appendChild(row);
      });

    return container;
  }

  function buildLetterboxdHistogram(provider) {
    if (!provider) {
      return buildWideKeyValue('Letterboxd histogram', [['Status', 'Not requested']]);
    }
    if (provider?.status === 'pending')
      return buildWideKeyValue('Letterboxd histogram', [['Status', 'Loading']]);
    if (provider?.status === 'error')
      return buildWideKeyValue('Letterboxd histogram', [
        ['Error', provider.error || 'Fetch failed']
      ]);
    if (provider?.status === 'unavailable' || !provider.data) {
      return buildWideKeyValue('Letterboxd histogram', [['Status', 'No Letterboxd data found']]);
    }

    const values = getAdjustedHistogramValues(provider.data.histogram || []);
    if (values.length === 0) {
      return buildWideKeyValue('Letterboxd histogram', [['Status', 'No histogram bins found']]);
    }

    const maxVotes = Math.max(...values.map((item) => item.voteCount || 0), 0);
    if (maxVotes <= 0) return null;

    const container = document.createElement('div');
    container.className = 'unit3d-imdb-rating-wide unit3d-imdb-histogram';

    const heading = document.createElement('h3');
    heading.textContent = 'Letterboxd histogram';
    container.appendChild(heading);

    values
      .slice()
      .sort((left, right) => right.rating - left.rating)
      .forEach((item) => {
        const row = document.createElement('div');
        row.className = 'unit3d-imdb-histogram-row';

        const label = document.createElement('span');
        label.textContent = `${(item.rating / 2).toFixed(1)}`;

        const bar = document.createElement('span');
        bar.className = 'unit3d-imdb-histogram-bar';
        bar.style.setProperty(
          '--unit3d-imdb-bar-width',
          `${((item.voteCount || 0) / maxVotes) * 100}%`
        );

        const count = document.createElement('span');
        count.textContent = formatCount(item.voteCount || 0);

        row.append(label, bar, count);
        container.appendChild(row);
      });

    return container;
  }

  function buildDemographics(titleData) {
    const entries = titleData.aggregateRatingsBreakdown?.ratingsSummaryByDemographics || [];
    const usable = entries.filter(
      (entry) => Number.isFinite(entry.aggregate) && entry.voteCount > 0
    );
    if (usable.length === 0) return null;

    const rows = usable
      .slice(0, 16)
      .map((entry) => [
        formatDemographicLabel(entry.demographic),
        `${entry.aggregate.toFixed(1)} (${formatCount(entry.voteCount)})`
      ]);
    return buildWideKeyValue('IMDb demographics', rows);
  }

  function buildCountryAverages(titleData) {
    const entries = titleData.aggregateRatingsBreakdown?.ratingsSummaryByCountry || [];
    const usable = entries.filter((entry) => Number.isFinite(entry.aggregate));
    if (usable.length === 0) return null;

    const rows = usable
      .slice(0, 16)
      .map((entry) => [entry.country || 'Country', entry.aggregate.toFixed(1)]);
    return buildWideKeyValue('IMDb country averages', rows);
  }

  function buildWideKeyValue(title, rows) {
    const container = document.createElement('div');
    container.className = 'unit3d-imdb-rating-wide';

    const heading = document.createElement('h3');
    heading.textContent = title;
    container.append(heading, buildKeyValue(rows));
    return container;
  }

  function calculateAggregateScore(titleData) {
    const sources = [];
    const sourceSettings = normalizeAggregateSourceSettings(settings.ratingsAggregateSources);
    const addSource = (
      sourceKey,
      option,
      score,
      detailLabel = '',
      voteCount = null,
      weight = 1
    ) => {
      const normalizedScore = normalizeAggregateScore(sourceKey, option, score);
      if (!Number.isFinite(normalizedScore)) return;
      const voteCountWeightRule = getAggregateVoteCountWeightRule(voteCount);
      const voteCountWeightMultiplier = settings.ratingsAggregateUseVoteCountWeighting
        ? voteCountWeightRule?.multiplier || 1
        : 1;
      sources.push({
        label: getAggregateSourceLabel(sourceKey, option, detailLabel),
        score: normalizedScore,
        sourceKey,
        voteCount,
        voteCountWeightMultiplier,
        weight
      });
    };

    Object.entries(sourceSettings)
      .filter(([, item]) => item.enabled)
      .forEach(([sourceKey, item]) => {
        switch (sourceKey) {
          case 'imdb': {
            const values = getAdjustedHistogramValues(getTitleHistogramValues(titleData));
            const summary = getHistogramMeanSummary(values);
            if (item.option === 'displayed' || item.option === 'overall') {
              const demographicScore = getDemographicScoreOverrideSummary(titleData);
              addSource(
                sourceKey,
                item.option,
                item.option === 'overall'
                  ? (summary?.score ?? titleData.ratingsSummary?.aggregateRating)
                  : (demographicScore?.score ?? titleData.ratingsSummary?.aggregateRating),
                item.option === 'displayed' && demographicScore ? demographicScore.label : 'Users',
                item.option === 'displayed' && demographicScore
                  ? demographicScore.votes
                  : (summary?.votes ?? titleData.ratingsSummary?.voteCount),
                item.weight
              );
              return;
            }
            const weightedType = getAggregateWeightedScoreType(item.option);
            if (weightedType) {
              addSource(
                sourceKey,
                item.option,
                calculateWeightedScoreFromHistogram(values, weightedType),
                IMDB_WEIGHTED_SCORE_TYPE_LABELS[weightedType],
                summary?.votes ?? titleData.ratingsSummary?.voteCount,
                item.weight
              );
            }
            return;
          }
          case 'metacritic':
            if (item.option === 'critic') {
              const metaCritic = currentSupplementalRatings.metacritic?.data?.critic;
              addSource(
                sourceKey,
                item.option,
                hasFiniteScore(metaCritic?.score)
                  ? metaCritic.score
                  : Number.isFinite(titleData.metacritic?.metascore?.score)
                    ? titleData.metacritic.metascore.score
                    : null,
                'Critics',
                metaCritic?.count ?? titleData.metacritic?.metascore?.reviewCount,
                item.weight
              );
              return;
            }
            if (item.option === 'user') {
              const metaUser = currentSupplementalRatings.metacritic?.data?.user;
              addSource(
                sourceKey,
                item.option,
                Number.isFinite(metaUser?.score) ? metaUser.score : null,
                'Users',
                metaUser?.count,
                item.weight
              );
            }
            return;
          case 'rottenTomatoes': {
            const rt = currentSupplementalRatings.rottenTomatoes?.data;
            const target = item.option === 'user' ? rt?.user : rt?.critic;
            addSource(
              sourceKey,
              item.option,
              getFirstFiniteScore(target?.percent, target?.score, target?.average),
              item.option === 'user' ? 'Users' : 'Critics',
              target?.count,
              item.weight
            );
            return;
          }
          case 'tmdb': {
            const tmdb = currentSupplementalRatings.tmdb?.data;
            addSource(sourceKey, item.option, tmdb?.score, '', tmdb?.count, item.weight);
            return;
          }
          case 'letterboxd': {
            const lb = currentSupplementalRatings.letterboxd?.data;
            if (item.option === 'user') {
              addSource(
                sourceKey,
                item.option,
                Number.isFinite(lb?.user?.score) ? lb.user.score / 10 : null,
                'Users',
                lb?.user?.count,
                item.weight
              );
              return;
            }
            const weightedType = getAggregateWeightedScoreType(item.option);
            const weightedScore = weightedType
              ? calculateWeightedScoreFromHistogram(
                  getAdjustedHistogramValues(lb?.histogram || []),
                  weightedType
                )
              : null;
            addSource(
              sourceKey,
              item.option,
              Number.isFinite(weightedScore) ? weightedScore * 2 : null,
              weightedType ? IMDB_WEIGHTED_SCORE_TYPE_LABELS[weightedType] : '',
              getHistogramVoteCount(lb?.histogram || []),
              item.weight
            );
            return;
          }
          default:
        }
      });

    if (!sources.length) return null;

    let usedSources = sources.slice();
    let discardedSources = [];
    if (settings.ratingsAggregateDropExtremes && usedSources.length >= 4) {
      const sorted = usedSources.slice().sort((left, right) => left.score - right.score);
      const lowest = sorted[0];
      const highest = sorted[sorted.length - 1];
      discardedSources = [lowest, highest].filter((source) => {
        if (!settings.ratingsAggregateKeepRottenTomatoes) return true;
        return source.sourceKey !== 'rottenTomatoes';
      });
      const discardedSet = new Set(discardedSources);
      usedSources = usedSources.filter((source) => !discardedSet.has(source));
    }

    const score =
      settings.ratingsAggregateMethod === 'median'
        ? calculateAggregateMedian(usedSources)
        : calculateAggregateMean(usedSources, settings.ratingsAggregateMethod);
    const methodLabel =
      RATINGS_AGGREGATE_METHOD_LABELS[settings.ratingsAggregateMethod] ||
      RATINGS_AGGREGATE_METHOD_LABELS.mean;
    const tooltip = `Aggregate ${Number.isFinite(score) ? score.toFixed(1) : '-'}/10 from ${
      usedSources.length
    } source${usedSources.length === 1 ? '' : 's'} using ${methodLabel}.`;

    return {
      discardedSources,
      methodLabel,
      score,
      tooltip,
      usedSources,
      usesVoteCountWeighting:
        settings.ratingsAggregateUseVoteCountWeighting &&
        usedSources.some((source) => source.voteCountWeightMultiplier !== 1)
    };
  }

  function getTitleHistogramValues(titleData) {
    return titleData.aggregateRatingsBreakdown?.histogram?.histogramValues || [];
  }

  function getDemographicScoreOverrideSummary(titleData) {
    if (!settings.showImdbDemographicScoreOverride) return null;
    const entries = titleData.aggregateRatingsBreakdown?.ratingsSummaryByDemographics || [];
    const selected = entries.find(
      (entry) =>
        buildDemographicSelectionKey(entry.demographic) === settings.imdbDemographicScoreOverrideKey
    );
    if (!selected || !Number.isFinite(selected.aggregate) || !Number.isFinite(selected.voteCount)) {
      return null;
    }
    const label =
      IMDB_SCORE_OVERRIDE_OPTIONS.find(
        ([key]) => key === settings.imdbDemographicScoreOverrideKey
      )?.[1] || formatDemographicLabel(selected.demographic);
    return { label, score: selected.aggregate, votes: selected.voteCount };
  }

  function buildDemographicSelectionKey(demographic = {}) {
    if (
      demographic.gender &&
      !demographic.age &&
      !demographic.country &&
      !demographic.userCategory
    ) {
      return `gender:${demographic.gender}`;
    }
    if (
      demographic.age &&
      !demographic.gender &&
      !demographic.country &&
      !demographic.userCategory
    ) {
      return `age:${demographic.age}`;
    }
    if (
      demographic.userCategory &&
      !demographic.gender &&
      !demographic.age &&
      !demographic.country
    ) {
      return `userCategory:${demographic.userCategory}`;
    }
    return '';
  }

  function normalizeHistogramValues(values) {
    return (values || [])
      .map((item) => ({
        rating: Number(item.rating),
        voteCount: Number(item.voteCount)
      }))
      .filter(
        (item) =>
          Number.isFinite(item.rating) && Number.isFinite(item.voteCount) && item.voteCount > 0
      )
      .sort((left, right) => left.rating - right.rating);
  }

  function getAdjustedHistogramValues(values) {
    const normalized = normalizeHistogramValues(values);
    if (!settings.discardHistogramExtremeBins) return normalized;
    const adjusted = normalized.filter((item) => item.rating > 1 && item.rating < 10);
    return adjusted.length ? adjusted : normalized;
  }

  function isHistogramExtremeTrimActive(values) {
    if (!settings.discardHistogramExtremeBins) return false;
    const normalized = normalizeHistogramValues(values);
    return normalized.some((item) => item.rating <= 1 || item.rating >= 10);
  }

  function getHistogramVoteCount(values) {
    return normalizeHistogramValues(values).reduce((sum, item) => sum + item.voteCount, 0);
  }

  function getHistogramMeanSummary(values) {
    const normalized = normalizeHistogramValues(values);
    const votes = getHistogramVoteCount(normalized);
    if (votes <= 0) return null;
    const score = normalized.reduce((sum, item) => sum + item.rating * item.voteCount, 0) / votes;
    return { score, votes };
  }

  function calculateHistogramMean(values) {
    return getHistogramMeanSummary(values)?.score ?? null;
  }

  function calculateTrimmedHistogramMean(values, trimFraction) {
    const ordered = normalizeHistogramValues(values);
    const totalVotes = getHistogramVoteCount(ordered);
    if (totalVotes <= 0) return null;

    let trimRemaining = Math.floor(totalVotes * trimFraction);
    const adjusted = ordered.map((item) => ({ ...item }));
    for (const item of adjusted) {
      const removed = Math.min(item.voteCount, trimRemaining);
      item.voteCount -= removed;
      trimRemaining -= removed;
      if (trimRemaining <= 0) break;
    }

    trimRemaining = Math.floor(totalVotes * trimFraction);
    for (const item of adjusted.slice().reverse()) {
      const removed = Math.min(item.voteCount, trimRemaining);
      item.voteCount -= removed;
      trimRemaining -= removed;
      if (trimRemaining <= 0) break;
    }

    return calculateHistogramMean(adjusted);
  }

  function calculateWeightedMedian(values) {
    const ordered = normalizeHistogramValues(values);
    const totalVotes = getHistogramVoteCount(ordered);
    if (totalVotes <= 0) return null;
    const midpoint = totalVotes / 2;
    let runningVotes = 0;
    for (const item of ordered) {
      runningVotes += item.voteCount;
      if (runningVotes >= midpoint) return item.rating;
    }
    return ordered.at(-1)?.rating ?? null;
  }

  function calculateBayesianHistogramMean(values, priorMean = 6.5, priorVotes = 10000) {
    const mean = calculateHistogramMean(values);
    const totalVotes = getHistogramVoteCount(values);
    if (!Number.isFinite(mean) || totalVotes <= 0) return null;
    return (mean * totalVotes + priorMean * priorVotes) / (totalVotes + priorVotes);
  }

  function calculateWeightedScoreFromHistogram(values, weightingType) {
    switch (weightingType) {
      case 'mean':
        return calculateHistogramMean(values);
      case 'trimmed5':
        return calculateTrimmedHistogramMean(values, 0.05);
      case 'trimmed10':
        return calculateTrimmedHistogramMean(values, 0.1);
      case 'median':
        return calculateWeightedMedian(values);
      case 'bayesian':
        return calculateBayesianHistogramMean(values);
      default:
        return null;
    }
  }

  function getWeightedScoreSummary(values, options = {}) {
    const enabled = Object.prototype.hasOwnProperty.call(options, 'enabled')
      ? options.enabled
      : settings.showImdbWeightedScore;
    const activeType = settings.imdbWeightedScoreType;
    if (!enabled || !(activeType in IMDB_WEIGHTED_SCORE_TYPE_LABELS)) return null;

    const adjusted = getAdjustedHistogramValues(values);
    const score = calculateWeightedScoreFromHistogram(adjusted, activeType);
    if (!Number.isFinite(score)) return null;

    const displayScoreMultiplier = Number.isFinite(options.displayScoreMultiplier)
      ? options.displayScoreMultiplier
      : 1;
    const sourceLabel = options.sourceLabel || 'IMDb';
    return {
      displayScore: score * displayScoreMultiplier,
      score,
      tooltip: `${IMDB_WEIGHTED_SCORE_TYPE_LABELS[activeType]} derived from the ${sourceLabel} vote histogram.`,
      type: activeType
    };
  }

  function hasFiniteScore(value) {
    return Number.isFinite(parseScoreNumber(value));
  }

  function getFirstFiniteScore(...values) {
    for (const value of values) {
      const parsed = parseScoreNumber(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  function parseScoreNumber(value) {
    if (Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const parsed = Number.parseFloat(value.replace(/,/g, '').replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeAggregateScore(sourceKey, option, rawScore) {
    const score = parseScoreNumber(rawScore);
    if (!Number.isFinite(score) || score < 0) return null;

    if (sourceKey === 'metacritic') {
      return option === 'critic'
        ? normalizePercentScoreToTen(score)
        : normalizeTenPointScore(score);
    }

    if (sourceKey === 'rottenTomatoes') {
      return normalizePercentScoreToTen(score);
    }

    if (sourceKey === 'tmdb') {
      return score > 10 && score <= 100
        ? normalizePercentScoreToTen(score)
        : normalizeTenPointScore(score);
    }

    if (sourceKey === 'letterboxd') {
      return score > 10 ? normalizePercentScoreToTen(score) : normalizeTenPointScore(score);
    }

    return normalizeTenPointScore(score);
  }

  function normalizePercentScoreToTen(score) {
    if (!Number.isFinite(score)) return null;
    return clampNumber(score / 10, 0, 10, null);
  }

  function normalizeTenPointScore(score) {
    if (!Number.isFinite(score)) return null;
    return clampNumber(score, 0, 10, null);
  }

  function normalizeAggregateSourceSettings(value) {
    const defaults = DEFAULT_SETTINGS.ratingsAggregateSources;
    const stored = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(
      Object.entries(defaults).map(([sourceKey, defaultValue]) => {
        const candidate = stored[sourceKey] || {};
        const allowedOptions = (RATINGS_AGGREGATE_SOURCE_OPTION_DEFINITIONS[sourceKey] || []).map(
          ([option]) => option
        );
        const option = allowedOptions.includes(candidate.option)
          ? candidate.option
          : defaultValue.option;
        return [
          sourceKey,
          {
            enabled:
              typeof candidate.enabled === 'boolean' ? candidate.enabled : defaultValue.enabled,
            option,
            weight: clampNumber(candidate.weight, 0, 20, defaultValue.weight)
          }
        ];
      })
    );
  }

  function getAggregateWeightedScoreType(option) {
    const match = String(option || '').match(
      /^weighted_(trimmed5|trimmed10|median|mean|bayesian)$/
    );
    return match?.[1] || null;
  }

  function getAggregateSourceLabel(sourceKey, option, detailLabel = '') {
    const sourceLabel = RATINGS_AGGREGATE_SOURCE_LABELS[sourceKey] || sourceKey;
    return detailLabel ? `${sourceLabel} ${detailLabel}` : sourceLabel;
  }

  function getAggregateVoteCountWeightRule(voteCount) {
    if (!Number.isFinite(voteCount)) return null;
    return (
      RATINGS_AGGREGATE_VOTE_COUNT_WEIGHT_RULES.find(
        (rule) => voteCount < rule.maxVotesExclusive
      ) || null
    );
  }

  function getAggregateSourceEffectiveWeight(source) {
    return Math.max(0, Number(source.weight) || 0) * (source.voteCountWeightMultiplier || 1);
  }

  function calculateAggregateMean(sources, method) {
    if (!sources.length) return null;
    if (method === 'average' && !settings.ratingsAggregateUseVoteCountWeighting) {
      return sources.reduce((sum, source) => sum + source.score, 0) / sources.length;
    }
    const totalWeight = sources.reduce(
      (sum, source) => sum + getAggregateSourceEffectiveWeight(source),
      0
    );
    if (totalWeight <= 0) return null;
    return (
      sources.reduce(
        (sum, source) => sum + source.score * getAggregateSourceEffectiveWeight(source),
        0
      ) / totalWeight
    );
  }

  function calculateAggregateMedian(sources) {
    const sorted = sources
      .filter(
        (source) => Number.isFinite(source.score) && getAggregateSourceEffectiveWeight(source) > 0
      )
      .sort((left, right) => left.score - right.score);
    const totalWeight = sorted.reduce(
      (sum, source) => sum + getAggregateSourceEffectiveWeight(source),
      0
    );
    if (totalWeight <= 0) return null;
    let running = 0;
    for (const source of sorted) {
      running += getAggregateSourceEffectiveWeight(source);
      if (running >= totalWeight / 2) return source.score;
    }
    return sorted.at(-1)?.score ?? null;
  }

  function formatDemographicLabel(demographic = {}) {
    return (
      [demographic.gender, demographic.age, demographic.country, demographic.userCategory]
        .filter(Boolean)
        .map((value) => String(value).replace(/^AGE_/, '').replaceAll('_', ' '))
        .join(' / ') || 'All users'
    );
  }

  function buildTrailerPanel(titleData, trailerData) {
    const body = buildTrailerEmbed(trailerData);
    if (!body) return null;

    return createPanel('IMDb Trailer', body, {
      id: 'unit3d-imdb-trailer',
      url: imdbTitleUrl(titleData.id)
    });
  }

  function buildTrailerEmbed(trailerData) {
    if (!trailerData?.videos?.length || !trailerData.defaultVideoId) return null;

    let activeTrailerData = trailerData;
    let refetchAttempted = false;
    let selectedVideo =
      activeTrailerData.videos.find((video) => video.id === activeTrailerData.defaultVideoId) ||
      activeTrailerData.videos[0];
    if (!selectedVideo) return null;

    const body = document.createElement('div');
    body.className = 'unit3d-imdb-trailer';

    const playerContainer = document.createElement('div');
    playerContainer.className = 'unit3d-imdb-trailer-video';

    const posterButton = document.createElement('button');
    posterButton.className = 'unit3d-imdb-trailer-poster';
    posterButton.type = 'button';
    const posterUrl = getTrailerPosterUrl();
    if (posterUrl)
      posterButton.style.setProperty('--unit3d-imdb-trailer-poster', `url("${posterUrl}")`);

    const playIcon = document.createElement('span');
    playIcon.className = 'unit3d-imdb-trailer-play';
    playIcon.setAttribute('aria-hidden', 'true');
    const title = document.createElement('span');
    title.className = 'unit3d-imdb-trailer-title';
    const updatePosterTitle = () => {
      const label = `${selectedVideo.contentTypeLabel || 'IMDb Video'}: ${selectedVideo.title || 'Trailer'}`;
      title.textContent = label;
      posterButton.setAttribute('aria-label', `Play ${label}`);
    };
    updatePosterTitle();
    posterButton.append(playIcon, title);
    const retryWithFreshVideoData = async () => {
      if (refetchAttempted || !activeTrailerData.imdbId) return false;
      refetchAttempted = true;
      playerContainer.replaceChildren();
      const loading = document.createElement('div');
      loading.className = 'unit3d-imdb-trailer-video-wrapper unit3d-imdb-trailer-video-loading';
      playerContainer.appendChild(loading);

      await GM.deleteValue(`${VIDEO_CACHE_PREFIX}${activeTrailerData.imdbId}`);
      const freshTrailerData = await fetchIMDbTrailerData(
        activeTrailerData.imdbId,
        currentTitleData,
        {
          forceRefresh: true
        }
      );
      if (!freshTrailerData?.videos?.length || !freshTrailerData.defaultVideoId) return false;

      activeTrailerData = freshTrailerData;
      currentTrailerData = freshTrailerData;
      selectedVideo =
        freshTrailerData.videos.find((video) => video.id === selectedVideo.id) ||
        freshTrailerData.videos.find((video) => video.id === freshTrailerData.defaultVideoId) ||
        freshTrailerData.videos[0];
      if (!selectedVideo) return false;

      updatePosterTitle();
      renderTrailerVideo(playerContainer, selectedVideo, {
        autoplay: true,
        onSourcesFailed: null
      });
      return true;
    };
    posterButton.addEventListener('click', () => {
      posterButton.remove();
      renderTrailerVideo(playerContainer, selectedVideo, {
        autoplay: true,
        onSourcesFailed: retryWithFreshVideoData
      });
    });

    if (activeTrailerData.videos.length > 1) {
      const select = document.createElement('select');
      select.className = 'form__select unit3d-imdb-trailer-select';
      activeTrailerData.videos.forEach((video) => {
        const option = document.createElement('option');
        option.value = video.id;
        option.textContent = `${video.contentTypeLabel}: ${video.title}`;
        option.selected = video.id === selectedVideo.id;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        const selected = activeTrailerData.videos.find((video) => video.id === select.value);
        if (selected) {
          selectedVideo = selected;
          updatePosterTitle();
          if (playerContainer.childElementCount > 0) {
            renderTrailerVideo(playerContainer, selectedVideo, {
              autoplay: true,
              onSourcesFailed: retryWithFreshVideoData
            });
          }
        }
      });
      body.appendChild(select);
    }

    body.appendChild(posterButton);
    body.appendChild(playerContainer);

    return body;
  }

  async function renderTrailerVideo(container, video, options = {}) {
    if (typeof container._unit3dImdbTrailerCleanup === 'function') {
      container._unit3dImdbTrailerCleanup();
      container._unit3dImdbTrailerCleanup = null;
    }
    container.replaceChildren();

    if (video.youtubeKey || video.embedUrl) {
      renderYouTubeTrailer(container, video, options);
      return;
    }

    if (video.videoPageUrl) {
      renderExternalIMDbTrailer(container, video);
      return;
    }

    renderUnavailableTrailer(container);
  }

  function renderYouTubeTrailer(container, video, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'unit3d-imdb-trailer-video-wrapper';
    wrapper.style.height = `${IMDB_TRAILER_PREVIEW_HEIGHT}px`;

    const iframe = document.createElement('iframe');
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = buildYouTubeEmbedUrl(video, options);
    iframe.title = video.title || 'Trailer';

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    if (options.autoplay) {
      requestAnimationFrame(() =>
        setTrailerWrapperHeight(wrapper, IMDB_TRAILER_FALLBACK_ASPECT_RATIO)
      );
      wrapper.dataset.mode = 'expanded';
      wrapper.dataset.aspectRatio = String(IMDB_TRAILER_FALLBACK_ASPECT_RATIO);
    }
  }

  function buildYouTubeEmbedUrl(video, options = {}) {
    const embedUrl = video.embedUrl || `https://www.youtube-nocookie.com/embed/${video.youtubeKey}`;
    const url = new URL(embedUrl);
    url.hostname = 'www.youtube-nocookie.com';
    url.searchParams.set('rel', '0');
    if (options.autoplay) url.searchParams.set('autoplay', '1');
    return url.toString();
  }

  function renderUnavailableTrailer(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'unit3d-imdb-trailer-video-wrapper unit3d-imdb-trailer-video-error';
    wrapper.style.height = `${IMDB_TRAILER_PREVIEW_HEIGHT}px`;
    container.appendChild(wrapper);
  }

  function renderExternalIMDbTrailer(container, video) {
    const wrapper = document.createElement('div');
    wrapper.className = 'unit3d-imdb-trailer-video-wrapper';
    wrapper.style.height = `${IMDB_TRAILER_PREVIEW_HEIGHT}px`;

    const external = document.createElement('div');
    external.className = 'unit3d-imdb-trailer-external';
    const title = document.createElement('strong');
    title.textContent = video.title || 'IMDb Video';
    const note = document.createElement('small');
    note.textContent = 'UNIT3D CSP blocks IMDb MP4 playback inline.';
    const link = document.createElement('a');
    link.href = video.videoPageUrl;
    link.textContent = 'Open on IMDb';
    openInNewTab(link);

    external.append(title, note, link);
    wrapper.appendChild(external);
    container.appendChild(wrapper);
  }

  function expandTrailerWrapper(wrapper, videoElement) {
    if (wrapper.dataset.mode === 'expanded') return;
    const aspectRatio =
      videoElement.videoWidth > 0 && videoElement.videoHeight > 0
        ? normalizeAspectRatio(videoElement.videoWidth / videoElement.videoHeight)
        : IMDB_TRAILER_FALLBACK_ASPECT_RATIO;
    wrapper.dataset.mode = 'expanded';
    wrapper.dataset.aspectRatio = String(aspectRatio);
    setTrailerWrapperHeight(wrapper, aspectRatio);
  }

  function setTrailerWrapperHeight(wrapper, aspectRatio) {
    const width = wrapper.getBoundingClientRect().width || wrapper.parentElement?.clientWidth || 0;
    const safeAspectRatio = normalizeAspectRatio(aspectRatio);
    const targetHeight = Math.max(120, Math.round(width / safeAspectRatio));
    wrapper.style.height = `${targetHeight}px`;
  }

  function normalizeAspectRatio(value) {
    return Number.isFinite(value) && value >= 0.6 && value <= 3
      ? value
      : IMDB_TRAILER_FALLBACK_ASPECT_RATIO;
  }

  function getTrailerPosterUrl() {
    const source =
      document.querySelector('.meta__backdrop[src]')?.getAttribute('src') ||
      document
        .querySelector('.meta__poster[src], .unit3d-ptp-poster-image[src]')
        ?.getAttribute('src') ||
      '';
    return source ? new URL(source, location.href).toString() : '';
  }

  function buildMovieInfoPanel(titleData) {
    const rows = [];
    appendRow(rows, 'Directors', formatCreditNames(titleData, /director/i));
    appendRow(rows, 'Writers', formatCreditNames(titleData, /writer|writing/i));
    appendRow(rows, 'Producers', formatCreditNames(titleData, /producer/i));
    appendRow(rows, 'Composers', formatCreditNames(titleData, /composer|music/i));
    appendRow(rows, 'Cinematographers', formatCreditNames(titleData, /cinematographer|camera/i));
    appendRow(rows, 'Runtime', formatPrimaryRuntime(titleData));
    appendRow(rows, 'Genres', buildGenresValue(titleData));
    appendRow(rows, 'Country', formatListText(titleData.countriesOfOrigin?.countries, 'text'));
    appendRow(rows, 'Language', formatListText(titleData.spokenLanguages?.spokenLanguages, 'text'));
    appendRow(rows, 'Certification', formatCertificates(titleData));
    appendRow(rows, 'AKAs', formatAkas(titleData));

    if (rows.length === 0) return null;
    return createPanel(
      isUnit3dTvSimilarPage() ? 'IMDb TV Info' : 'IMDb Movie Info',
      buildKeyValue(rows),
      {
        id: 'unit3d-imdb-movie-info',
        url: imdbTitleUrl(titleData.id)
      }
    );
  }

  function buildGenresValue(titleData) {
    const genres = extractTitleGenres(titleData);
    if (!genres.length) return '';

    const fragment = document.createDocumentFragment();
    genres.forEach((genre, index) => {
      if (index > 0) fragment.appendChild(document.createTextNode(', '));
      const unit3dGenreId = UNIT3D_GENRE_IDS[normalizeGenreName(genre.text)];
      if (!unit3dGenreId) {
        fragment.appendChild(document.createTextNode(genre.text));
        return;
      }

      const link = document.createElement('a');
      link.href = buildUnit3dGenreUrl(unit3dGenreId);
      link.textContent = genre.text;
      openInNewTab(link);
      fragment.appendChild(link);
    });
    return fragment;
  }

  function extractTitleGenres(titleData) {
    return (titleData.genres?.genres || titleData.titleGenres?.genres || [])
      .map((genre) => ({
        id: genre?.id || '',
        text:
          genre?.text ||
          genre?.genreText?.text ||
          genre?.displayableProperty?.value?.plainText ||
          ''
      }))
      .filter((genre) => genre.text);
  }

  function normalizeGenreName(value) {
    const normalized = String(value || '')
      .replace(/\band\b/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return UNIT3D_GENRE_ALIASES[normalized] || normalized;
  }

  function buildUnit3dGenreUrl(genreId) {
    const url = new URL('/torrents', location.origin);
    url.searchParams.set('genreIds[0]', String(genreId));
    return url.toString();
  }

  function formatCreditNames(titleData, categoryPattern) {
    const names = [];
    (titleData.credits?.edges || []).forEach((edge) => {
      const node = edge.node || {};
      const category = `${node.category?.id || ''} ${node.category?.text || ''}`;
      const name = node.name?.nameText?.text || '';
      if (!name || !categoryPattern.test(category)) return;
      if (!names.includes(name)) names.push(name);
    });
    return names.join(', ');
  }

  function formatPrimaryRuntime(titleData) {
    const runtime = (titleData.runtimes?.edges || [])[0]?.node;
    const seconds = runtime?.seconds;
    if (!Number.isFinite(seconds)) return '';
    return formatRuntimeSeconds(seconds);
  }

  function formatRuntimeSeconds(seconds) {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}mn` : `${remainingMinutes}mn`;
  }

  function formatListText(items, valueKey) {
    return (items || [])
      .map((item) => item?.[valueKey] || item?.text || item?.id || '')
      .filter(Boolean)
      .join(', ');
  }

  function formatCertificates(titleData) {
    const primary = titleData.certificate ? [titleData.certificate] : [];
    const certificates = [
      ...primary,
      ...(titleData.certificates?.edges || []).map((edge) => edge.node)
    ];
    const preferredCountries = ['AU', 'US', 'GB', 'CA'];
    const uniqueCertificates = [];
    certificates
      .map((edge) => {
        const node = edge?.node || edge;
        return [
          node.country?.id || '',
          node.country?.text || node.country?.id || node.countryCode || '',
          node.rating ||
            node.certificate ||
            node.certification ||
            node.displayableProperty?.value?.plainText ||
            ''
        ];
      })
      .filter(([, country, rating]) => country && rating)
      .sort((left, right) => {
        const leftIndex = preferredCountries.indexOf(left[0]);
        const rightIndex = preferredCountries.indexOf(right[0]);
        const leftRank = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const rightRank = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
        return leftRank - rightRank;
      })
      .forEach(([, country, rating]) => {
        const display = [country, rating].filter(Boolean).join(':');
        if (display && !uniqueCertificates.includes(display)) uniqueCertificates.push(display);
      });
    return uniqueCertificates.slice(0, 4).join(', ');
  }

  function formatAkas(titleData) {
    const primaryTitle = normalizeText(titleData.titleText?.text || '').toLowerCase();
    const seen = new Set();
    return (titleData.akas?.edges || titleData.alternateTitles?.edges || [])
      .map(
        (edge) =>
          edge.node?.text ||
          edge.node?.titleText?.text ||
          edge.node?.displayableProperty?.value?.plainText ||
          ''
      )
      .filter((text) => {
        const normalized = normalizeText(text).toLowerCase();
        if (!normalized || normalized === primaryTitle || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, 8)
      .join(', ');
  }

  function buildTechnicalSpecsPanel(titleData) {
    const specs = titleData.technicalSpecifications || {};
    const rows = [];
    const runtimes = (titleData.runtimes?.edges || [])
      .map((edge) => {
        const node = edge.node || {};
        return [
          node.displayableProperty?.value?.plainText || '',
          joinText(node.attributes, 'text', ', ', '(', ')'),
          node.country?.text ? `[${node.country.text}]` : ''
        ]
          .filter(Boolean)
          .join(' ');
      })
      .filter(Boolean);

    appendRow(rows, 'Runtime', runtimes.join(', '));
    appendRow(rows, 'Sound mix', formatSpecItems(specs.soundMixes?.items, 'text'));
    appendRow(rows, 'Color', formatSpecItems(specs.colorations?.items, 'text'));
    appendRow(rows, 'Aspect ratio', formatSpecItems(specs.aspectRatios?.items, 'aspectRatio'));
    appendRow(rows, 'Camera', formatSpecItems(specs.cameras?.items, 'camera'));
    appendRow(rows, 'Laboratory', formatSpecItems(specs.laboratories?.items, 'laboratory'));
    appendRow(rows, 'Film length', formatFilmLengths(specs.filmLengths?.items));
    appendRow(
      rows,
      'Negative format',
      formatSpecItems(specs.negativeFormats?.items, 'negativeFormat')
    );
    appendRow(rows, 'Process', formatSpecItems(specs.processes?.items, 'process'));
    appendRow(
      rows,
      'Printed format',
      formatSpecItems(specs.printedFormats?.items, 'printedFormat')
    );

    if (rows.length === 0) return null;
    return createPanel('IMDb Technical Specs', buildKeyValue(rows), {
      id: 'unit3d-imdb-technical-specs',
      url: `${imdbTitleUrl(titleData.id)}technical/`
    });
  }

  function buildBoxOfficePanel(titleData) {
    const rows = [];
    appendRow(rows, 'Budget', formatBudget(titleData.productionBudget?.budget));
    appendRow(rows, 'Worldwide', formatRankedGross(titleData.worldwideGross));
    appendRow(rows, 'Domestic', formatRankedGross(titleData.domesticGross));
    appendRow(rows, 'International', formatRankedGross(titleData.internationalGross));
    appendRow(rows, 'Domestic opening', formatOpeningWeekend(titleData.domesticOpeningWeekend));
    appendRow(
      rows,
      'International opening',
      formatOpeningWeekend(titleData.internationalOpeningWeekend)
    );

    if (rows.length === 0) return null;
    return createPanel('IMDb Box Office', buildKeyValue(rows), {
      id: 'unit3d-imdb-box-office',
      url: `${imdbTitleUrl(titleData.id)}business/`
    });
  }

  function buildAwardsPanel(titleData) {
    const oscarWins = titleData.prestigiousAwardSummary?.wins ?? 0;
    const oscarNominations = titleData.prestigiousAwardSummary?.nominations ?? 0;
    const awardNodes = getAwardNominationNodes(titleData);
    const totalWinAwards = awardNodes.filter((award) => award?.isWinner);
    const totalNominationAwards = awardNodes.filter((award) => award && !award.isWinner);
    const oscarWinAwards = awardNodes.filter((award) => isOscarAward(award) && award.isWinner);
    const oscarNominationAwards = awardNodes.filter(
      (award) => isOscarAward(award) && !award.isWinner
    );
    const displayOscarWins = oscarWinAwards.length || oscarWins;
    const displayOscarNominations = oscarNominationAwards.length || oscarNominations;

    if (
      displayOscarWins <= 0 &&
      displayOscarNominations <= 0 &&
      totalWinAwards.length <= 0 &&
      totalNominationAwards.length <= 0
    ) {
      return null;
    }

    return createPanel(
      'IMDb Awards',
      buildAwardsTable({
        oscarNominations: {
          awards: oscarNominationAwards,
          count: displayOscarNominations,
          title: 'Oscar Nominations'
        },
        oscarWins: {
          awards: oscarWinAwards,
          count: displayOscarWins,
          title: 'Oscar Wins'
        },
        totalNominations: {
          awards: totalNominationAwards,
          count: totalNominationAwards.length,
          title: 'Total Award Nominations'
        },
        totalWins: {
          awards: totalWinAwards,
          count: totalWinAwards.length,
          title: 'Total Award Wins'
        }
      }),
      {
        id: 'unit3d-imdb-awards',
        url: `${imdbTitleUrl(titleData.id)}awards/`
      }
    );
  }

  function getAwardNominationNodes(titleData) {
    if (Array.isArray(titleData.awardNominationsCombined))
      return titleData.awardNominationsCombined;
    return (titleData.awardNominations?.edges || []).map((edge) => edge.node).filter(Boolean);
  }

  function isOscarAward(award) {
    const text = `${award?.award?.id || ''} ${award?.award?.text || ''} ${award?.category?.text || ''}`;
    return /\b(oscars?|academy awards?)\b/i.test(text);
  }

  function buildAwardsTable(summary) {
    const table = document.createElement('table');
    table.className = 'unit3d-imdb-awards-table';

    const rows = [
      ['OSCARS', 'Wins', 'Nominations', true],
      ['', summary.oscarWins, summary.oscarNominations, true],
      ['Total Awards', 'Wins', 'Nominations', false],
      ['', summary.totalWins, summary.totalNominations, true]
    ];

    rows.forEach(([label, wins, nominations, highlight]) => {
      const row = document.createElement('tr');
      const labelCell = document.createElement(label ? 'th' : 'td');
      labelCell.textContent = label;
      if (highlight && label) labelCell.className = 'unit3d-imdb-awards-highlight';
      row.appendChild(labelCell);

      [wins, nominations].forEach((value) => {
        const cell = document.createElement(label ? 'th' : 'td');
        appendAwardsCount(cell, value);
        if (highlight) cell.className = 'unit3d-imdb-awards-highlight';
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    return table;
  }

  function appendAwardsCount(cell, value) {
    const count = typeof value === 'object' ? value.count : value;
    const awards = Array.isArray(value?.awards) ? value.awards : [];
    if (!awards.length) {
      cell.textContent = String(count ?? 0);
      return;
    }

    const button = document.createElement('button');
    button.className = 'unit3d-imdb-awards-count-button';
    button.type = 'button';
    button.textContent = String(count ?? awards.length);
    button.title = `Show ${value.title}`;
    button.addEventListener('click', () => showAwardsOverlay(value.title, awards));
    cell.appendChild(button);
  }

  function showAwardsOverlay(title, awards) {
    closeAwardsOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'unit3d-imdb-awards-overlay';
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const dialog = document.createElement('section');
    dialog.className = 'unit3d-imdb-awards-dialog';

    const header = document.createElement('header');
    header.className = 'unit3d-imdb-awards-dialog__header';

    const heading = document.createElement('h3');
    heading.textContent = `${title} (${awards.length})`;

    const close = document.createElement('button');
    close.className = 'unit3d-imdb-awards-dialog__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close awards');
    close.textContent = '×';

    header.append(heading, close);
    dialog.append(header, buildAwardsDetailList(awards));

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeAwardsOverlay();
    };
    overlay.unit3dImdbCleanup = () => document.removeEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target === close) closeAwardsOverlay();
    });

    document.addEventListener('keydown', onKeyDown);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    overlay.focus();
  }

  function buildAwardsDetailList(awards) {
    const list = document.createElement('ul');
    list.className = 'unit3d-imdb-awards-detail-list';

    awards.forEach((award) => {
      const item = document.createElement('li');
      item.className = 'unit3d-imdb-awards-detail-item';

      const title = document.createElement('div');
      title.className = 'unit3d-imdb-awards-detail-title';
      title.textContent = [award.award?.text, award.category?.text].filter(Boolean).join(' - ');
      item.appendChild(title);

      const details = [
        award.isWinner ? 'Winner' : 'Nominee',
        normalizeText(award.notes?.plainText),
        normalizeText(extractAwardedEntityText(award, 'names')),
        normalizeText(extractAwardedEntityText(award, 'titles')),
        normalizeText(
          (award.forEpisodes || []).map((episode) => episode.titleText?.text).join(', ')
        ),
        normalizeText((award.forSongTitles || []).join(', '))
      ].filter(Boolean);

      if (details.length) {
        const meta = document.createElement('div');
        meta.className = 'unit3d-imdb-awards-detail-meta';
        meta.textContent = details.join(' - ');
        item.appendChild(meta);
      }

      list.appendChild(item);
    });

    return list;
  }

  function extractAwardedEntityText(award, key) {
    const entities = Array.isArray(award?.awardedEntities)
      ? award.awardedEntities
      : award?.awardedEntities
        ? [award.awardedEntities]
        : [];
    return entities
      .flatMap((entity) => entity?.[key] || [])
      .map((item) => item?.nameText?.text || item?.titleText?.text || '')
      .filter(Boolean)
      .join(', ');
  }

  function closeAwardsOverlay() {
    const existing = document.querySelector('.unit3d-imdb-awards-overlay');
    existing?.unit3dImdbCleanup?.();
    existing?.remove();
  }

  function buildKeywordsPanel(titleData) {
    const keywords = extractKeywords(titleData).slice(0, MAX_KEYWORDS);
    if (keywords.length === 0) return null;

    const list = document.createElement('div');
    list.className = 'unit3d-imdb-chip-list';
    keywords.forEach((keyword) => {
      const link = document.createElement('a');
      link.className = 'unit3d-imdb-chip';
      link.href = `https://www.imdb.com/search/title/?keywords=${encodeURIComponent(
        keyword.replace(/\s+/g, '-')
      )}&explore=keywords`;
      link.textContent = keyword;
      openInNewTab(link);
      list.appendChild(link);
    });

    return createPanel('IMDb Keywords', list, {
      id: 'unit3d-imdb-keywords',
      url: `${imdbTitleUrl(titleData.id)}keywords/`
    });
  }

  function buildAlternateVersionsPanel(titleData) {
    const versions = titleData.alternateVersions?.edges || [];
    if (versions.length === 0) return null;

    const list = document.createElement('ul');
    list.className = 'unit3d-imdb-list';
    versions.forEach((edge) => {
      const text = normalizeText(edge.node?.text?.plainText);
      if (!text) return;
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });

    if (!list.childElementCount) return null;
    return createPanel('IMDb Alternate Versions', list, {
      id: 'unit3d-imdb-alternate-versions',
      url: `${imdbTitleUrl(titleData.id)}alternateversions/`
    });
  }

  function buildParentsGuidePanel(titleData) {
    const categories = titleData.parentsGuide?.categories || [];
    if (categories.length === 0) return null;

    const fragment = document.createDocumentFragment();
    categories.forEach((category) => {
      const items = category.guideItems?.edges || [];
      if (items.length === 0) return;

      const details = document.createElement('details');
      details.open = false;

      const summary = document.createElement('summary');
      const severity = category.severity?.text ? ` - ${category.severity.text}` : '';
      summary.textContent = `${category.category?.text || 'Category'}${severity}`;
      details.appendChild(summary);

      const list = document.createElement('ul');
      list.className = 'unit3d-imdb-list';
      items.forEach((edge) => {
        const node = edge.node || {};
        const text = normalizeText(node.text?.plainText);
        if (!text) return;
        const item = document.createElement('li');
        if (node.isSpoiler) {
          const marker = document.createElement('span');
          marker.className = 'unit3d-imdb-spoiler';
          marker.textContent = 'Spoiler: ';
          item.appendChild(marker);
        }
        item.appendChild(document.createTextNode(text));
        list.appendChild(item);
      });
      details.appendChild(list);
      fragment.appendChild(details);
    });

    if (!fragment.childNodes.length) return null;
    return createPanel('IMDb Parents Guide', fragment, {
      id: 'unit3d-imdb-parents-guide',
      url: `${imdbTitleUrl(titleData.id)}parentalguide/`
    });
  }

  function buildSoundtracksPanel(soundtracks, titleData) {
    const movieTitle = getMovieTitleForSearch(titleData);
    const tracks = Array.isArray(soundtracks) ? soundtracks.filter((track) => track?.title) : [];
    if (tracks.length === 0) return null;

    const body = document.createElement('div');
    body.className = 'unit3d-imdb-soundtrack-grid';
    const midpoint = Math.ceil(Math.min(tracks.length, 40) / 2);
    const columns = [tracks.slice(0, midpoint), tracks.slice(midpoint, 40)];
    columns.forEach((columnTracks, columnIndex) => {
      const column = document.createElement('div');
      column.className = 'unit3d-imdb-soundtrack-column';
      columnTracks.forEach((track, index) => {
        column.appendChild(buildSoundtrackRow(track, movieTitle, columnIndex * midpoint + index));
      });
      body.appendChild(column);
    });

    const panel = createPanel('IMDb Soundtrack', body, {
      id: 'unit3d-imdb-soundtrack',
      url: `${imdbTitleUrl(currentImdbId)}soundtrack/`
    });

    const youtubeSearch = document.createElement('a');
    youtubeSearch.className = 'unit3d-imdb-soundtrack-heading-action';
    youtubeSearch.href = buildYouTubeSearchUrl(`${movieTitle} soundtrack`);
    youtubeSearch.textContent = '(YouTube search)';
    openInNewTab(youtubeSearch);
    panel.querySelector('.panel__heading')?.appendChild(youtubeSearch);
    return panel;
  }

  function buildSoundtrackRow(track, movieTitle) {
    const row = document.createElement('div');
    row.className = 'unit3d-imdb-soundtrack-row';

    const artist = document.createElement(track.link ? 'a' : 'span');
    artist.className = 'unit3d-imdb-soundtrack-artist';
    artist.textContent = track.artist || 'Unknown';
    artist.title = track.artist || '';
    if (track.link) {
      artist.href = track.link;
      openInNewTab(artist);
    }

    const separator = document.createElement('span');
    separator.textContent = '-';

    const title = document.createElement('a');
    title.className = 'unit3d-imdb-soundtrack-title';
    title.href = buildYouTubeSearchUrl(`${movieTitle} ${track.title}`);
    title.textContent = track.title;
    title.title = track.title;
    openInNewTab(title);

    row.append(artist, separator, title);
    return row;
  }

  function getMovieTitleForSearch(titleData) {
    const title =
      titleData?.titleText?.text || document.querySelector('.meta__title')?.textContent || '';
    const year = titleData?.releaseYear?.year;
    return normalizeText(`${title}${year ? ` ${year}` : ''}`);
  }

  function buildYouTubeSearchUrl(query) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(
      String(query || '').replace(/&/g, ' and ')
    )}`;
  }

  function buildCastPanel(titleData, namesData) {
    const namesById = new Map((namesData || []).map((name) => [name.id, name]));
    const castDisplayLimit = Math.min(
      settings.castMaxDisplay,
      settings.castImagesPerRow * settings.castDefaultRows
    );
    const credits = filterCreditsForCast(titleData.credits?.edges || [])
      .sort((left, right) => {
        const leftHasPhoto =
          namesById.has(left.node?.name?.id) &&
          !!namesById.get(left.node?.name?.id)?.primaryImage?.url;
        const rightHasPhoto =
          namesById.has(right.node?.name?.id) &&
          !!namesById.get(right.node?.name?.id)?.primaryImage?.url;
        if (leftHasPhoto !== rightHasPhoto) return leftHasPhoto ? -1 : 1;
        return 0;
      })
      .slice(0, castDisplayLimit);
    if (credits.length === 0) return null;

    const grid = document.createElement('div');
    grid.className = 'unit3d-imdb-cast';
    grid.style.setProperty('--unit3d-imdb-cast-columns', String(settings.castImagesPerRow));
    grid.style.setProperty('--unit3d-imdb-cast-image-height', `${settings.castImageHeight}px`);

    credits.forEach((edge) => {
      const credit = edge.node || {};
      const personId = credit.name?.id;
      const nameData = namesById.get(personId);
      const name = credit.name?.nameText?.text || nameData?.nameText?.text || personId;
      if (!name) return;

      const card = document.createElement('a');
      card.className = 'unit3d-imdb-cast-card';
      card.href = personId ? `https://www.imdb.com/name/${personId}/` : imdbTitleUrl(titleData.id);
      openInNewTab(card);

      const image = document.createElement('img');
      image.loading = 'lazy';
      image.src = nameData?.primaryImage?.url || CAST_PLACEHOLDER_IMAGE;
      image.alt = '';
      card.appendChild(image);

      const nameElement = document.createElement('span');
      nameElement.className = 'unit3d-imdb-cast-name';
      nameElement.textContent = name;
      card.appendChild(nameElement);

      const roleText = credit.category?.text || '';
      if (roleText) {
        const role = document.createElement('span');
        role.className = 'unit3d-imdb-cast-role';
        role.textContent = roleText;
        card.appendChild(role);
      }

      grid.appendChild(card);
    });

    if (!grid.childElementCount) return null;
    return createPanel('IMDb Cast', grid, {
      id: 'unit3d-imdb-cast',
      url: `${imdbTitleUrl(titleData.id)}fullcredits/`
    });
  }

  function filterCreditsForCast(edges) {
    if (settings.castFilterType === 'all') return [...edges];
    return edges.filter((edge) => {
      const category = `${edge.node?.category?.id || ''} ${edge.node?.category?.text || ''}`;
      return /\b(actor|actress|cast|self)\b/i.test(category);
    });
  }

  function buildSimilarTitlesPanel(titleData) {
    const titles = (titleData.moreLikeThisTitles?.edges || []).slice(0, MAX_SIMILAR_TITLES);
    if (titles.length === 0) return null;

    const grid = document.createElement('div');
    grid.className = 'unit3d-imdb-cards';
    titles.forEach((edge) => {
      const title = edge.node || {};
      if (!title.id || !title.titleText?.text) return;

      const card = document.createElement('article');
      card.className = 'unit3d-imdb-card';

      if (title.primaryImage?.url) {
        const imageLink = document.createElement('a');
        imageLink.href = imdbTitleUrl(title.id);
        openInNewTab(imageLink);
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.src = title.primaryImage.url;
        image.alt = '';
        imageLink.appendChild(image);
        card.appendChild(imageLink);
      }

      const label = document.createElement('a');
      label.className = 'unit3d-imdb-card-title';
      label.href = unit3dTorrentSearchByImdbUrl(title.id);
      label.textContent = title.titleText.text;
      openInNewTab(label);
      card.appendChild(label);
      grid.appendChild(card);
    });

    if (!grid.childElementCount) return null;
    return createPanel('IMDb More Like This', grid, {
      id: 'unit3d-imdb-more-like-this',
      url: `${imdbTitleUrl(titleData.id)}`
    });
  }

  function createPanel(title, bodyContent, options = {}) {
    const panel = document.createElement('section');
    panel.className = 'panelV2 unit3d-imdb-panel';
    if (options.id) panel.id = options.id;

    const heading = document.createElement('h2');
    heading.className = 'panel__heading';

    const titleElement = document.createElement(options.url ? 'a' : 'span');
    titleElement.className = options.url ? 'unit3d-imdb-heading-link' : '';
    if (options.url) {
      titleElement.href = options.url;
      openInNewTab(titleElement);
    }
    const imdb = document.createElement('span');
    imdb.className = 'unit3d-imdb-label';
    imdb.textContent = 'IMDb';
    titleElement.append(imdb, document.createTextNode(title.replace(/^IMDb\s*/i, ' ')));
    heading.appendChild(titleElement);

    const body = document.createElement('div');
    body.className = 'panel__body';
    body.appendChild(bodyContent);

    panel.append(heading, body);
    return panel;
  }

  async function getTitleBundle(imdbId) {
    const cached = await getCachedTitleData(imdbId);
    if (cached?.data?.title && hasRequiredTitleData(cached.data.title)) {
      const titleData = cached.data.title;
      const namesData = await fetchNames(getNameIds(titleData));
      const trailerData = settings.showTrailerPanel
        ? await fetchIMDbTrailerData(imdbId, titleData)
        : null;
      return {
        namesData,
        soundtracks: processSoundtracks(titleData, namesData),
        source: 'cache-hit',
        trailerData,
        titleData
      };
    }

    const titleData = await fetchTitleData(imdbId);
    const namesData = await fetchNames(getNameIds(titleData));
    const trailerData = settings.showTrailerPanel
      ? await fetchIMDbTrailerData(imdbId, titleData)
      : null;
    await setCache(`${CACHE_PREFIX}${imdbId}`, { data: { title: titleData } });
    return {
      namesData,
      soundtracks: processSoundtracks(titleData, namesData),
      source: 'api-fetch',
      trailerData,
      titleData
    };
  }

  function hasRequiredTitleData(titleData) {
    if (!titleData) return false;
    if (!titleData.ratingsSummary || !titleData.meterRank) return false;
    if (!titleData.primaryImage) return false;
    if (
      settings.showTrailerPanel &&
      !titleData.latestTrailer &&
      !titleData.primaryVideos &&
      !titleData.videoStrip
    ) {
      return false;
    }
    if (
      (settings.showImdbHistogram ||
        settings.showImdbWeightedScore ||
        settings.showRatingsAggregate ||
        settings.enableRatingsExport) &&
      !titleData.aggregateRatingsBreakdown?.histogram
    ) {
      return false;
    }
    if (
      (settings.showImdbDemographics ||
        settings.showImdbDemographicScoreOverride ||
        settings.enableRatingsExport) &&
      !Array.isArray(titleData.aggregateRatingsBreakdown?.ratingsSummaryByDemographics)
    ) {
      return false;
    }
    if (
      (settings.showImdbCountryAverages || settings.enableRatingsExport) &&
      !Array.isArray(titleData.aggregateRatingsBreakdown?.ratingsSummaryByCountry)
    ) {
      return false;
    }
    if (
      settings.showMovieInfo &&
      !(
        titleData.countriesOfOrigin ||
        titleData.spokenLanguages ||
        titleData.certificate ||
        titleData.certificates ||
        titleData.akas
      )
    ) {
      return false;
    }
    return true;
  }

  async function loadSettings() {
    const loaded = {};
    await Promise.all(
      Object.keys(DEFAULT_SETTINGS).map(async (key) => {
        loaded[key] = await GM.getValue(settingKey(key), DEFAULT_SETTINGS[key]);
      })
    );
    settings = normalizeSettings(loaded);
  }

  async function saveSettings(nextSettings) {
    settings = normalizeSettings(nextSettings);
    await Promise.all(
      Object.entries(settings).map(([key, value]) => GM.setValue(settingKey(key), value))
    );
  }

  function normalizeSettings(value) {
    const normalized = { ...DEFAULT_SETTINGS, ...(value || {}) };
    normalized.castFilterType = ['actors', 'all'].includes(normalized.castFilterType)
      ? normalized.castFilterType
      : DEFAULT_SETTINGS.castFilterType;
    normalized.reviewDisplayMode = ['inline', 'tab'].includes(normalized.reviewDisplayMode)
      ? normalized.reviewDisplayMode
      : DEFAULT_SETTINGS.reviewDisplayMode;
    normalized.similarTitlesPlacement = ['sidebar', 'main'].includes(
      normalized.similarTitlesPlacement
    )
      ? normalized.similarTitlesPlacement
      : DEFAULT_SETTINGS.similarTitlesPlacement;
    normalized.imdbWeightedScoreType =
      normalized.imdbWeightedScoreType in IMDB_WEIGHTED_SCORE_TYPE_LABELS
        ? normalized.imdbWeightedScoreType
        : DEFAULT_SETTINGS.imdbWeightedScoreType;
    normalized.ratingsAggregateMethod =
      normalized.ratingsAggregateMethod in RATINGS_AGGREGATE_METHOD_LABELS
        ? normalized.ratingsAggregateMethod
        : DEFAULT_SETTINGS.ratingsAggregateMethod;
    normalized.imdbDemographicScoreOverrideKey = IMDB_SCORE_OVERRIDE_OPTIONS.some(
      ([key]) => key === normalized.imdbDemographicScoreOverrideKey
    )
      ? normalized.imdbDemographicScoreOverrideKey
      : DEFAULT_SETTINGS.imdbDemographicScoreOverrideKey;
    normalized.ratingsAggregateSources = normalizeAggregateSourceSettings(
      normalized.ratingsAggregateSources
    );
    normalized.castMaxDisplay = clampInteger(
      normalized.castMaxDisplay,
      1,
      256,
      DEFAULT_SETTINGS.castMaxDisplay
    );
    normalized.castImageHeight = clampInteger(
      normalized.castImageHeight,
      100,
      800,
      DEFAULT_SETTINGS.castImageHeight
    );
    normalized.castImagesPerRow = clampInteger(
      normalized.castImagesPerRow,
      1,
      12,
      DEFAULT_SETTINGS.castImagesPerRow
    );
    normalized.castDefaultRows = clampInteger(
      normalized.castDefaultRows,
      1,
      12,
      DEFAULT_SETTINGS.castDefaultRows
    );
    normalized.cacheExpiryDays = clampInteger(
      normalized.cacheExpiryDays,
      1,
      365,
      DEFAULT_SETTINGS.cacheExpiryDays
    );
    normalized.newTitleTtlDays = clampInteger(
      normalized.newTitleTtlDays,
      1,
      60,
      DEFAULT_SETTINGS.newTitleTtlDays
    );
    return normalized;
  }

  function settingKey(key) {
    return `UNIT3D_IMDB_${key}`;
  }

  function showSettingsPanel() {
    document.getElementById(SETTINGS_PANEL_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = SETTINGS_PANEL_ID;
    overlay.className = 'unit3d-imdb-settings-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'unit3d-imdb-settings-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'unit3d-imdb-settings-header';
    const title = document.createElement('h2');
    title.textContent = 'UNIT3D IMDb Script Settings';
    const close = document.createElement('button');
    close.className = 'form__button form__button--text';
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', closeSettingsPanel);
    header.append(title, close);

    const form = document.createElement('form');
    form.className = 'unit3d-imdb-settings-form';
    form.appendChild(buildSettingsGrid());

    const actions = document.createElement('div');
    actions.className = 'unit3d-imdb-settings-actions';
    const reset = document.createElement('button');
    reset.className = 'form__button form__button--outlined';
    reset.type = 'button';
    reset.textContent = 'Reset + flush cache';
    reset.addEventListener('click', async () => {
      if (!confirm('Reset UNIT3D IMDb settings and flush IMDb cache?')) return;
      await saveSettings(DEFAULT_SETTINGS);
      await flushCache();
      location.reload();
    });

    const actionButtons = document.createElement('div');
    actionButtons.className = 'form__group form__group--short-horizontal';
    const flush = document.createElement('button');
    flush.className = 'form__button form__button--outlined';
    flush.type = 'button';
    flush.textContent = 'Flush cache';
    flush.addEventListener('click', flushCache);
    const save = document.createElement('button');
    save.className = 'form__button form__button--filled';
    save.type = 'submit';
    save.textContent = 'Save';
    actionButtons.append(flush, save);
    actions.append(reset, actionButtons);

    form.appendChild(actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveSettings(readSettingsForm(form));
      closeSettingsPanel();
      location.reload();
    });

    dialog.append(header, form);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeSettingsPanel();
    });
    document.body.appendChild(overlay);
  }

  function buildSettingsGrid() {
    const grid = document.createElement('div');
    grid.className = 'unit3d-imdb-settings-grid';

    grid.append(
      buildSettingsGroup('Panels', [
        'showRatingsPanel',
        'showTrailerPanel',
        'showCastPhotos',
        'showSimilarTitles',
        'showTechnicalSpecs',
        'showBoxOffice',
        'showAwards',
        'showSoundtracks',
        'showAlternateVersions',
        'showKeywords',
        'showParentsGuide'
      ]),
      buildPlacementSettingsGroup(),
      buildSettingsGroup('Ratings', [
        'enableRatingsExport',
        'showMetacritic',
        'showMetacriticUserScore',
        'showMetacriticBreakdown',
        'showRottenTomatoes',
        'showTmdb',
        'showLetterboxd',
        'showLetterboxdHistogram',
        'showLetterboxdWeightedScore',
        'showRatingsAggregate',
        'showRatingsAggregateTileDetails',
        'showImdbMeter',
        'showImdbHistogram',
        'showImdbWeightedScore',
        'showImdbDemographicScoreOverride',
        'showImdbDemographics',
        'showImdbCountryAverages',
        'discardHistogramExtremeBins'
      ]),
      buildRatingsAdvancedSettingsGroup(),
      buildSettingsGroup('Reviews', ['showReviews', 'hideReviewSpoilers']),
      buildAdvancedSettingsGroup()
    );

    return grid;
  }

  function buildSettingsGroup(title, keys) {
    const group = document.createElement('section');
    group.className = 'unit3d-imdb-settings-group';
    const heading = document.createElement('h3');
    heading.textContent = title;
    group.appendChild(heading);
    keys.forEach((key) => group.appendChild(buildCheckboxSetting(key)));
    return group;
  }

  function buildPlacementSettingsGroup() {
    const group = document.createElement('section');
    group.className = 'unit3d-imdb-settings-group';
    const heading = document.createElement('h3');
    heading.textContent = 'Placement';
    group.appendChild(heading);
    group.appendChild(
      buildSelectSetting('similarTitlesPlacement', [
        ['sidebar', 'More Like This in sidebar'],
        ['main', 'More Like This in main']
      ])
    );
    return group;
  }

  function buildRatingsAdvancedSettingsGroup() {
    const group = document.createElement('section');
    group.className = 'unit3d-imdb-settings-group';
    const heading = document.createElement('h3');
    heading.textContent = 'Ratings Advanced';
    group.appendChild(heading);

    group.append(
      buildSelectSetting('imdbWeightedScoreType', Object.entries(IMDB_WEIGHTED_SCORE_TYPE_LABELS)),
      buildSelectSetting('imdbDemographicScoreOverrideKey', IMDB_SCORE_OVERRIDE_OPTIONS),
      buildSelectSetting('ratingsAggregateMethod', Object.entries(RATINGS_AGGREGATE_METHOD_LABELS)),
      buildCheckboxSetting('ratingsAggregateDropExtremes'),
      buildCheckboxSetting('ratingsAggregateKeepRottenTomatoes'),
      buildCheckboxSetting('ratingsAggregateUseVoteCountWeighting')
    );

    const sourceSettings = normalizeAggregateSourceSettings(settings.ratingsAggregateSources);
    Object.entries(sourceSettings).forEach(([sourceKey, sourceSetting]) => {
      const sourceRow = document.createElement('div');
      sourceRow.className = 'unit3d-imdb-setting-row';

      const enabled = document.createElement('label');
      const enabledInput = document.createElement('input');
      enabledInput.type = 'checkbox';
      enabledInput.name = `ratingsAggregateSourceEnabled:${sourceKey}`;
      enabledInput.checked = !!sourceSetting.enabled;
      enabled.append(
        enabledInput,
        document.createTextNode(` ${RATINGS_AGGREGATE_SOURCE_LABELS[sourceKey]}`)
      );

      const option = document.createElement('select');
      option.name = `ratingsAggregateSourceOption:${sourceKey}`;
      (RATINGS_AGGREGATE_SOURCE_OPTION_DEFINITIONS[sourceKey] || []).forEach(([value, label]) => {
        const item = document.createElement('option');
        item.value = value;
        item.textContent = label;
        item.selected = sourceSetting.option === value;
        option.appendChild(item);
      });

      const weight = document.createElement('input');
      weight.type = 'number';
      weight.name = `ratingsAggregateSourceWeight:${sourceKey}`;
      weight.min = '0';
      weight.max = '20';
      weight.step = '0.25';
      weight.value = String(sourceSetting.weight);

      sourceRow.append(enabled, option, weight);
      group.appendChild(sourceRow);
    });

    return group;
  }

  function buildAdvancedSettingsGroup() {
    const group = document.createElement('section');
    group.className = 'unit3d-imdb-settings-group';
    const heading = document.createElement('h3');
    heading.textContent = 'Cast / Cache';
    group.appendChild(heading);

    group.append(
      buildSelectSetting('castFilterType', [
        ['actors', 'Actors only'],
        ['all', 'All credits']
      ]),
      buildNumberSetting('castMaxDisplay', 1, 256),
      buildNumberSetting('castImagesPerRow', 1, 12),
      buildNumberSetting('castDefaultRows', 1, 12),
      buildNumberSetting('castImageHeight', 100, 800),
      buildNumberSetting('cacheExpiryDays', 1, 365),
      buildNumberSetting('newTitleTtlDays', 1, 60),
      buildCheckboxSetting('disableCustomColors')
    );
    return group;
  }

  function buildCheckboxSetting(key) {
    const definition = SETTING_DEFINITIONS.find(([settingKeyName]) => settingKeyName === key);
    const label = document.createElement('label');
    label.className = 'unit3d-imdb-setting-row';
    label.title = definition?.[2] || '';
    const text = document.createElement('span');
    text.textContent = definition?.[1] || humanizeSettingKey(key);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = key;
    input.checked = !!settings[key];
    label.append(text, input);
    return label;
  }

  function buildNumberSetting(key, min, max) {
    const label = document.createElement('label');
    label.className = 'unit3d-imdb-setting-row';
    const text = document.createElement('span');
    text.textContent = humanizeSettingKey(key);
    const input = document.createElement('input');
    input.type = 'number';
    input.name = key;
    input.min = String(min);
    input.max = String(max);
    input.value = String(settings[key]);
    label.append(text, input);
    return label;
  }

  function buildSelectSetting(key, options) {
    const label = document.createElement('label');
    label.className = 'unit3d-imdb-setting-row';
    const text = document.createElement('span');
    text.textContent = humanizeSettingKey(key);
    const select = document.createElement('select');
    select.name = key;
    options.forEach(([value, optionLabel]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = optionLabel;
      option.selected = settings[key] === value;
      select.appendChild(option);
    });
    label.append(text, select);
    return label;
  }

  function readSettingsForm(form) {
    const next = { ...settings };
    SETTING_DEFINITIONS.forEach(([key]) => {
      const input = form.elements.namedItem(key);
      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        next[key] = input.checked;
      }
    });
    [
      'castMaxDisplay',
      'castImagesPerRow',
      'castDefaultRows',
      'castImageHeight',
      'cacheExpiryDays',
      'newTitleTtlDays'
    ].forEach((key) => {
      next[key] = Number.parseInt(form.elements.namedItem(key)?.value || '', 10);
    });
    ['castFilterType'].forEach((key) => {
      next[key] = form.elements.namedItem(key)?.value || DEFAULT_SETTINGS[key];
    });
    ['imdbWeightedScoreType', 'ratingsAggregateMethod'].forEach((key) => {
      next[key] = form.elements.namedItem(key)?.value || DEFAULT_SETTINGS[key];
    });
    next.similarTitlesPlacement =
      form.elements.namedItem('similarTitlesPlacement')?.value ||
      DEFAULT_SETTINGS.similarTitlesPlacement;
    next.imdbDemographicScoreOverrideKey =
      form.elements.namedItem('imdbDemographicScoreOverrideKey')?.value ||
      DEFAULT_SETTINGS.imdbDemographicScoreOverrideKey;
    next.ratingsAggregateSources = Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS.ratingsAggregateSources).map((sourceKey) => [
        sourceKey,
        {
          enabled: !!form.elements.namedItem(`ratingsAggregateSourceEnabled:${sourceKey}`)?.checked,
          option:
            form.elements.namedItem(`ratingsAggregateSourceOption:${sourceKey}`)?.value ||
            DEFAULT_SETTINGS.ratingsAggregateSources[sourceKey].option,
          weight: Number.parseFloat(
            form.elements.namedItem(`ratingsAggregateSourceWeight:${sourceKey}`)?.value || ''
          )
        }
      ])
    );
    return normalizeSettings(next);
  }

  function closeSettingsPanel() {
    document.getElementById(SETTINGS_PANEL_ID)?.remove();
  }

  function humanizeSettingKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
  }

  function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  async function fetchTitleData(imdbId) {
    const query = `
query Unit3dImdbCombined($id: ID!) {
  title(id: $id) {
    id
    titleText { text }
    primaryImage { url }
    releaseYear { year }
    genres { genres { id text } }
    countriesOfOrigin { countries { id text } }
    spokenLanguages { spokenLanguages { id text } }
    certificate { rating country { id text } }
    certificates(first: 20) {
      edges {
        node {
          rating
          country { id text }
        }
      }
    }
    akas(first: 20) {
      edges {
        node {
          text
          country { id text }
          language { id text }
        }
      }
    }
    latestTrailer { id }
    primaryVideos(first: 20) { edges { node { id } } }
    videoStrip(first: 20) { edges { node { id } } }
    soundtrack(first: 40) {
      edges {
        node {
          id
          text
          comments { markdown }
          amazonMusicProducts {
            artists { artistName { text } }
            productTitle { text }
          }
        }
      }
    }
    ratingsSummary {
      aggregateRating
      voteCount
      topRanking { id rank }
    }
    metacritic {
      url
      metascore { reviewCount score }
    }
    meterRank {
      currentRank
      meterType
      rankChange { changeDirection difference }
    }
    aggregateRatingsBreakdown {
      histogram {
        demographic { age country gender userCategory }
        histogramValues { rating voteCount }
      }
      ratingsSummaryByCountry {
        country
        aggregate
      }
      ratingsSummaryByDemographics {
        aggregate
        voteCount
        demographic { age country gender userCategory }
      }
    }
    alternateVersions(first: 50) {
      edges { node { text { plainText } } }
    }
    keywords(first: 150) {
      edges {
        node {
          interestScore { usersInterested usersVoted }
          keyword { id text { text } }
          legacyId
        }
      }
    }
    runtimes(first: 15) {
      edges {
        node {
          id
          seconds
          displayableProperty { value { plainText } }
          attributes { text }
          country { text }
        }
      }
    }
    technicalSpecifications {
      aspectRatios { items { aspectRatio attributes { text } } }
      cameras { items { camera attributes { text } } }
      colorations { items { text attributes { text } } }
      laboratories { items { laboratory attributes { text } } }
      negativeFormats { items { negativeFormat attributes { text } } }
      printedFormats { items { printedFormat attributes { text } } }
      processes { items { process attributes { text } } }
      soundMixes { items { text attributes { text } } }
      filmLengths { items { filmLength countries { text } numReels } }
    }
    moreLikeThisTitles(first: 12) {
      edges {
        node {
          id
          titleText { text }
          primaryImage { url }
        }
      }
    }
    worldwideGross: rankedLifetimeGross(boxOfficeArea: WORLDWIDE) { total { amount } rank }
    domesticGross: rankedLifetimeGross(boxOfficeArea: DOMESTIC) { total { amount } rank }
    internationalGross: rankedLifetimeGross(boxOfficeArea: INTERNATIONAL) { total { amount } rank }
    domesticOpeningWeekend: openingWeekendGross(boxOfficeArea: DOMESTIC) {
      gross { total { amount } }
      theaterCount
      weekendEndDate
      weekendStartDate
    }
    internationalOpeningWeekend: openingWeekendGross(boxOfficeArea: INTERNATIONAL) {
      gross { total { amount } }
    }
    productionBudget { budget { amount } }
    prestigiousAwardSummary {
      wins
      nominations
      award { year category { text } }
    }
    awardNominations(first: 250) {
      edges {
        node {
          id
          award { id text }
          awardedEntities {
            ... on AwardedNames {
              names { id nameText { text } }
            }
            ... on AwardedTitles {
              titles { id titleText { text } }
            }
          }
          category { text }
          forEpisodes { id titleText { text } }
          forSongTitles
          isWinner
          notes { plainText }
          winAnnouncementDate { date }
          winningRank
        }
      }
    }
    parentsGuide {
      categories {
        category { text }
        guideItems(first: 100) {
          edges {
            node {
              ... on ParentsGuideItem {
                isSpoiler
                text { plainText }
              }
            }
          }
        }
        severity { text }
      }
    }
    credits(first: 130) {
      edges {
        node {
          name { id nameText { text } }
          category { id text }
          title { id titleText { text } }
        }
      }
    }
  }
}`;
    const response = await imdbGraphqlRequest(query, { id: imdbId });
    if (response.errors?.length) {
      throw new Error(response.errors.map((error) => error.message).join('; '));
    }
    if (!response.data?.title) {
      throw new Error(`IMDb title not found: ${imdbId}`);
    }
    return response.data.title;
  }

  function createInitialSupplementalState() {
    const state = {};
    if (shouldFetchMetacriticData()) state.metacritic = { status: 'pending', data: null };
    if (shouldFetchRottenTomatoesData()) state.rottenTomatoes = { status: 'pending', data: null };
    if (shouldFetchTmdbData()) state.tmdb = { status: 'pending', data: null };
    if (shouldFetchLetterboxdData()) state.letterboxd = { status: 'pending', data: null };
    return state;
  }

  async function fetchSupplementalRatings(imdbId, titleData) {
    const tasks = [];
    if (shouldFetchMetacriticData()) {
      tasks.push(
        updateSupplementalProvider('metacritic', () =>
          fetchMetacriticWithCache(imdbId, titleData.metacritic?.url || '')
        )
      );
    }
    if (shouldFetchRottenTomatoesData()) {
      tasks.push(
        updateSupplementalProvider('rottenTomatoes', () => fetchRottenTomatoesWithCache(imdbId))
      );
    }
    if (shouldFetchTmdbData()) {
      tasks.push(updateSupplementalProvider('tmdb', () => fetchTmdbWithCache(imdbId, titleData)));
    }
    if (shouldFetchLetterboxdData()) {
      tasks.push(updateSupplementalProvider('letterboxd', () => fetchLetterboxdWithCache(imdbId)));
    }
    await Promise.allSettled(tasks);
    publishRatingsSnapshot(imdbId, currentTitleData, true);
  }

  function shouldFetchMetacriticData() {
    const aggregateMetacritic = normalizeAggregateSourceSettings(
      settings.ratingsAggregateSources
    ).metacritic;
    return (
      settings.showMetacritic ||
      (settings.showRatingsAggregate &&
        aggregateMetacritic.enabled &&
        aggregateMetacritic.option === 'user')
    );
  }

  function shouldFetchRottenTomatoesData() {
    return (
      settings.showRottenTomatoes ||
      (settings.showRatingsAggregate &&
        normalizeAggregateSourceSettings(settings.ratingsAggregateSources).rottenTomatoes.enabled)
    );
  }

  function shouldFetchTmdbData() {
    return (
      settings.showTmdb ||
      (settings.showRatingsAggregate &&
        normalizeAggregateSourceSettings(settings.ratingsAggregateSources).tmdb.enabled)
    );
  }

  function shouldFetchLetterboxdData() {
    if (!shouldShowLetterboxdPanels()) return false;
    return (
      settings.showLetterboxd ||
      settings.showLetterboxdHistogram ||
      settings.showLetterboxdWeightedScore ||
      (settings.showRatingsAggregate &&
        normalizeAggregateSourceSettings(settings.ratingsAggregateSources).letterboxd.enabled)
    );
  }

  async function updateSupplementalProvider(key, loader) {
    try {
      const data = await loader();
      currentSupplementalRatings[key] = {
        data,
        status: data ? 'ready' : 'unavailable',
        updatedAt: Date.now()
      };
    } catch (error) {
      currentSupplementalRatings[key] = {
        data: null,
        error: error.message || String(error),
        status: 'error',
        updatedAt: Date.now()
      };
      console.warn(`[UNIT3D IMDb Combined] ${key} fetch failed`, error);
    }
    scheduleRender();
  }

  async function getSupplementalRatingsCache(imdbId) {
    return (await getCache(`${SUPPLEMENTAL_CACHE_PREFIX}${imdbId}`)) || {};
  }

  async function mergeSupplementalRatingsCache(imdbId, partial) {
    const cached = await getSupplementalRatingsCache(imdbId);
    const next = { ...(cached || {}), ...partial };
    await setCache(`${SUPPLEMENTAL_CACHE_PREFIX}${imdbId}`, next);
    return next;
  }

  async function fetchMetacriticWithCache(imdbId, url) {
    const cached = await getSupplementalRatingsCache(imdbId);
    if (cached && Object.prototype.hasOwnProperty.call(cached, 'metacritic')) {
      const metacritic = normalizeMetacriticPayload(cached.metacritic);
      if (hasMetacriticUserData(metacritic) && hasRequiredMetacriticDetails(metacritic)) {
        return metacritic;
      }
    }

    const metacritic = normalizeMetacriticPayload(
      await fetchMetacriticData(url, {
        requireCriticBreakdown: settings.showMetacriticBreakdown,
        requireUserData: settings.showMetacriticUserScore || settings.showMetacriticBreakdown,
        requireUserBreakdown: settings.showMetacriticBreakdown
      })
    );
    await mergeSupplementalRatingsCache(imdbId, { metacritic });
    return metacritic;
  }

  async function fetchMetacriticData(url, options = {}) {
    if (!url) return null;

    try {
      const includeUserData = !!options.requireUserData || !!options.requireUserBreakdown;
      const includeCriticBreakdown = !!options.requireCriticBreakdown;
      const requestHeaders = {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0'
      };
      const mainUrlObject = new URL(url);
      const normalizedPath = `${mainUrlObject.pathname.replace(/\/+$/, '')}/`;
      const mainUrl = new URL(normalizedPath, mainUrlObject.origin).toString();
      const criticUrl = new URL(
        `${normalizedPath}critic-reviews/`,
        mainUrlObject.origin
      ).toString();
      const userUrl = new URL(`${normalizedPath}user-reviews/`, mainUrlObject.origin).toString();
      const requests = [textRequest(mainUrl, requestHeaders)];
      if (includeCriticBreakdown) requests.push(textRequest(criticUrl, requestHeaders));
      if (includeUserData) requests.push(textRequest(userUrl, requestHeaders));

      const responses = await Promise.all(requests);
      const [mainHtml] = responses;
      const criticHtml = includeCriticBreakdown ? responses[1] : null;
      const userHtml = includeUserData ? responses[responses.length - 1] : null;
      const mainDoc = parseHtmlDocument(mainHtml);
      const critic = includeCriticBreakdown
        ? parseMetacriticReviewPage(criticHtml, 'critic', criticUrl)
        : {};
      const user = includeUserData ? parseMetacriticReviewPage(userHtml, 'user', userUrl) : null;
      const mainUserCount = parseMetacriticCountText(mainHtml, 'User Ratings');
      const mainCriticCount = parseMetacriticCountText(mainHtml, 'Critic Reviews');
      const badgeUrl = parseMetacriticBadgeUrl(mainDoc, mainHtml);

      return {
        badgeUrl,
        critic: {
          ...critic,
          badgeUrl: critic.badgeUrl || badgeUrl,
          count: Number.isFinite(critic.count) ? critic.count : mainCriticCount
        },
        title: mainDoc.querySelector('title')?.textContent?.trim() || null,
        url: mainUrl,
        user: user
          ? {
              ...user,
              count: Number.isFinite(user.count) ? user.count : mainUserCount
            }
          : null
      };
    } catch {
      return null;
    }
  }

  function parseMetacriticReviewPage(html, type, pageUrl) {
    const doc = parseHtmlDocument(html || '');
    const distribution = parseMetacriticDistribution(doc, html || '') || {};
    const countLabel = type === 'critic' ? 'Critic Reviews' : 'User Ratings';
    const scoreValue = extractMetacriticScoreValue(doc, html || '', type);
    return {
      ...distribution,
      badgeUrl: parseMetacriticBadgeUrl(doc, html || ''),
      count: parseMetacriticCountText(html || '', countLabel),
      score: Number.isFinite(scoreValue) ? scoreValue : null,
      sentiment:
        doc
          .querySelector('.score-card-left__score-sentiment .score-sentiment__texts > div')
          ?.textContent?.trim() || null,
      url: pageUrl
    };
  }

  function parseMetacriticCountText(text, label) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const match = text.match(new RegExp(`Based on\\s+([\\d,]+)\\s+${label}`, 'i'));
    if (!match) return null;
    const parsed = Number.parseInt(match[1].replace(/,/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseMetacriticDistribution(doc, html = '') {
    const container = doc.querySelector('.score-count__container');
    const summary = {};
    if (container) {
      const rows = [...container.children];
      for (let index = 0; index < rows.length; index += 3) {
        const label = rows[index]?.textContent?.trim()?.toLowerCase();
        const countNode = rows[index + 2];
        if (!['positive', 'mixed', 'negative'].includes(label) || !countNode) continue;

        const spans = countNode.querySelectorAll('span');
        const count = Number.parseInt((spans[0]?.textContent || '').replace(/[^\d]/g, ''), 10);
        const percent = Number.parseFloat((spans[1]?.textContent || '').replace(/[^\d.]/g, ''));
        summary[`${label}Count`] = Number.isFinite(count) ? count : null;
        summary[`${label}Percent`] = Number.isFinite(percent) ? percent : null;
      }
    }
    const textSummary = parseMetacriticDistributionText(doc.body?.textContent || html);
    Object.entries(textSummary || {}).forEach(([key, value]) => {
      if (!Number.isFinite(summary[key])) summary[key] = value;
    });
    return Object.keys(summary).length ? summary : null;
  }

  function parseMetacriticDistributionText(text) {
    const normalized = normalizeText(text || '');
    const summary = {};
    const pattern =
      /(\d+(?:\.\d+)?)%\s+(Positive|Mixed|Negative)\s+([\d,]+)\s+(Reviews?|Ratings?)/gi;
    let match = pattern.exec(normalized);
    while (match) {
      const label = match[2].toLowerCase();
      const percent = Number.parseFloat(match[1]);
      const count = Number.parseInt(match[3].replace(/,/g, ''), 10);
      summary[`${label}Percent`] = Number.isFinite(percent) ? percent : null;
      summary[`${label}Count`] = Number.isFinite(count) ? count : null;
      match = pattern.exec(normalized);
    }
    return summary;
  }

  function parseMetacriticBadgeUrl(doc, html = '') {
    const image = doc.querySelector(
      'img[src*="/logos/badge/"], img[src*="must-see.svg"], img[alt*="must" i]'
    );
    const source = image?.getAttribute('src') || '';
    if (/must-see\.svg/i.test(source) || /must-see\.svg/i.test(html)) {
      return source
        ? new URL(source, 'https://www.metacritic.com/').toString()
        : METACRITIC_MUST_SEE_BADGE_URL;
    }
    return '';
  }

  function extractMetacriticScoreValue(doc, html, type) {
    const label = type === 'critic' ? 'Metascore' : 'User score';
    if (type === 'user') {
      const summaryHtmlMatch = html.match(
        /aria-label="User score\s+([\d.]+)\s+out of 10"[^>]*>\s*<span[^>]*>\s*([\d.]+)\s*<\/span>/i
      );
      const summaryHtmlScore = normalizeMetacriticParsedScore(
        normalizeMetacriticScoreToken(summaryHtmlMatch?.[2] || summaryHtmlMatch?.[1] || '', type),
        type
      );
      if (Number.isFinite(summaryHtmlScore)) return summaryHtmlScore;
    }

    const normalizedText = doc.body?.textContent?.replace(/\s+/g, ' ') || '';
    const textMatch = normalizedText.match(
      new RegExp(
        `${label}\\s+([\\d]+(?:\\s*\\.\\s*\\d+)?|\\.\\s*\\d+)\\s+out of\\s+${type === 'critic' ? '100' : '10'}`,
        'i'
      )
    );
    const textScore = normalizeMetacriticParsedScore(
      normalizeMetacriticScoreToken(textMatch?.[1] || '', type),
      type
    );
    if (Number.isFinite(textScore)) return textScore;

    const htmlMatch = html.match(
      new RegExp(`${label}\\s+([\\d.]+)\\s+out of\\s+${type === 'critic' ? '100' : '10'}`, 'i')
    );
    return normalizeMetacriticParsedScore(
      normalizeMetacriticScoreToken(htmlMatch?.[1] || '', type),
      type
    );
  }

  function normalizeMetacriticScoreToken(token, type = null) {
    if (typeof token !== 'string') return null;
    const compactToken = token.replace(/\s+/g, '');
    if (!compactToken) return null;
    const normalizedToken = compactToken.startsWith('.')
      ? `0${compactToken}`
      : type === 'critic' && /^\d$/.test(compactToken)
        ? `0.${compactToken}`
        : compactToken;
    const parsed = Number.parseFloat(normalizedToken);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeMetacriticParsedScore(value, type = null) {
    if (!Number.isFinite(value)) return null;
    if (type === 'user' && value > 0 && value < 1) return value * 10;
    return value;
  }

  function normalizeMetacriticPayload(metacritic) {
    if (!metacritic || typeof metacritic !== 'object') return metacritic;
    const nextValue = {
      ...metacritic,
      critic:
        metacritic.critic && typeof metacritic.critic === 'object'
          ? { ...metacritic.critic }
          : metacritic.critic,
      user:
        metacritic.user && typeof metacritic.user === 'object'
          ? { ...metacritic.user }
          : metacritic.user
    };
    if (nextValue.critic && typeof nextValue.critic === 'object') {
      nextValue.critic.score = normalizeMetacriticParsedScore(nextValue.critic.score, 'critic');
    }
    if (nextValue.user && typeof nextValue.user === 'object') {
      nextValue.user.score = normalizeMetacriticParsedScore(nextValue.user.score, 'user');
    }
    return nextValue;
  }

  function hasMetacriticUserData(metacritic) {
    return Number.isFinite(metacritic?.user?.score) || Number.isFinite(metacritic?.user?.count);
  }

  function hasRequiredMetacriticDetails(metacritic) {
    const hasBreakdown =
      !settings.showMetacriticBreakdown ||
      Number.isFinite(metacritic?.critic?.positivePercent) ||
      Number.isFinite(metacritic?.critic?.mixedPercent) ||
      Number.isFinite(metacritic?.critic?.negativePercent) ||
      Number.isFinite(metacritic?.user?.positivePercent) ||
      Number.isFinite(metacritic?.user?.mixedPercent) ||
      Number.isFinite(metacritic?.user?.negativePercent);
    const hasBadgeField =
      Object.prototype.hasOwnProperty.call(metacritic || {}, 'badgeUrl') ||
      Object.prototype.hasOwnProperty.call(metacritic?.critic || {}, 'badgeUrl');
    return hasBreakdown && hasBadgeField;
  }

  function formatMetacriticBreakdown(summary) {
    if (!summary) return '';
    return [
      ['positive', 'Pos'],
      ['mixed', 'Mix'],
      ['negative', 'Neg']
    ]
      .map(([key, label]) => {
        const percent = summary[`${key}Percent`];
        const count = summary[`${key}Count`];
        if (!Number.isFinite(percent) || !Number.isFinite(count)) return null;
        return `${label} ${Math.round(percent)}% (${formatCount(count)})`;
      })
      .filter(Boolean)
      .join(' / ');
  }

  async function fetchRottenTomatoesWithCache(imdbId) {
    const cached = await getSupplementalRatingsCache(imdbId);
    if (cached && Object.prototype.hasOwnProperty.call(cached, 'rottenTomatoes')) {
      if (hasRequiredRottenTomatoesIconData(cached.rottenTomatoes)) return cached.rottenTomatoes;
    }

    const rottenTomatoes = await fetchRottenTomatoesData(imdbId);
    await mergeSupplementalRatingsCache(imdbId, { rottenTomatoes });
    return rottenTomatoes;
  }

  async function fetchRottenTomatoesData(imdbId) {
    const url = findRottenTomatoesUrl() || (await fetchRottenTomatoesUrlFromWikidata(imdbId));
    if (!url) return null;

    const doc = parseHtmlDocument(await textRequest(url));
    const jsonText = doc.getElementById('media-scorecard-json')?.textContent || '';
    if (!jsonText) return null;

    const payload = JSON.parse(jsonText);
    const criticsScore = payload?.criticsScore || {};
    const audienceScore = payload?.audienceScore || {};
    const criticPercent = parsePercent(
      getFirstValue(criticsScore.score, criticsScore.tomatometer, criticsScore.value)
    );
    const criticAverage = parsePercent(
      getFirstValue(criticsScore.averageRating, criticsScore.averageScore)
    );
    const criticCountDisplay = getFirstValue(
      criticsScore.ratingCount,
      criticsScore.reviewCount,
      criticsScore.count
    );
    const userPercent = parsePercent(
      getFirstValue(audienceScore.score, audienceScore.popcornScore, audienceScore.value)
    );
    const userAverage = parsePercent(
      getFirstValue(audienceScore.averageRating, audienceScore.averageScore)
    );
    const userCountDisplay = getFirstValue(
      audienceScore.bandedRatingCount,
      audienceScore.ratingCount,
      audienceScore.count
    );
    const criticCertified = isRottenTomatoesCertified(criticsScore);
    const criticStatus = getRottenTomatoesCriticStatus(criticPercent, criticCertified);
    const audienceStatus = getRottenTomatoesAudienceStatus(userPercent);

    return {
      consensus: doc.querySelector('#critics-consensus p')?.textContent?.trim() || '',
      critic: {
        certified: criticCertified,
        count: parseCompactCount(criticCountDisplay),
        countDisplay: criticCountDisplay || '',
        icon: getRottenTomatoesCriticIcon(criticPercent, criticCertified),
        iconLabel: formatRottenTomatoesStatusLabel(criticStatus),
        percent: Number.isFinite(criticPercent) ? Math.trunc(criticPercent) : null,
        score: Number.isFinite(criticAverage) ? Math.trunc(criticAverage * 10) : null,
        type: getRottenTomatoesCriticType(criticsScore) || null,
        url: `${url.replace(/\/+$/, '')}/reviews`
      },
      url,
      user: {
        count: parseCompactCount(userCountDisplay),
        countDisplay: userCountDisplay || '',
        icon: getRottenTomatoesAudienceIcon(audienceStatus),
        iconLabel: formatRottenTomatoesStatusLabel(audienceStatus),
        percent: Number.isFinite(userPercent) ? Math.trunc(userPercent) : null,
        score: Number.isFinite(userAverage) ? Math.trunc(userAverage * 20) : null,
        url: `${url.replace(/\/+$/, '')}/reviews?type=user`
      }
    };
  }

  function getRottenTomatoesCriticType(criticsScore) {
    const rawType = getFirstValue(
      criticsScore?.scoreType,
      criticsScore?.ratingState,
      criticsScore?.tomatometerState,
      criticsScore?.iconName,
      criticsScore?.scoreIcon?.name,
      criticsScore?.scoreIcon?.type,
      criticsScore?.scoreIcon?.tomatometer,
      criticsScore?.scoreSentiment,
      criticsScore?.classification?.type,
      criticsScore?.classification
    );
    return rawType ? String(rawType).trim().toLowerCase() : '';
  }

  function isRottenTomatoesCertified(criticsScore) {
    return (
      criticsScore?.certified === true ||
      criticsScore?.isCertified === true ||
      getRottenTomatoesCriticType(criticsScore).includes('certified')
    );
  }

  function getRottenTomatoesCriticStatus(percent, certified) {
    if (!Number.isFinite(percent)) return 'unknown';
    if (percent < 60) return 'rotten';
    return certified ? 'certified-fresh' : 'fresh';
  }

  function getRottenTomatoesAudienceStatus(percent) {
    if (!Number.isFinite(percent)) return 'unknown';
    return percent >= 60 ? 'upright-popcorn' : 'spilled-popcorn';
  }

  function formatRottenTomatoesStatusLabel(status) {
    return status
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function hasRequiredRottenTomatoesIconData(data) {
    if (!data) return true;
    return (
      /^data:image\/png;base64,/i.test(data?.critic?.icon || '') &&
      /^data:image\/svg\+xml;base64,/i.test(data?.user?.icon || '')
    );
  }

  function getRottenTomatoesCriticIcon(percent, certified) {
    if (!Number.isFinite(percent)) return ROTTEN_TOMATOES_CRITIC_ICONS.unknown;
    if (percent < 60) return ROTTEN_TOMATOES_CRITIC_ICONS.rotten;
    return certified
      ? ROTTEN_TOMATOES_CRITIC_ICONS.certifiedFresh
      : ROTTEN_TOMATOES_CRITIC_ICONS.fresh;
  }

  function getRottenTomatoesAudienceIcon(status) {
    return status === 'spilled-popcorn'
      ? rottenTomatoesAudienceSvgIcon(false)
      : rottenTomatoesAudienceSvgIcon(true);
  }

  function rottenTomatoesAudienceSvgIcon(isUpright) {
    const svg = isUpright
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#d82027" d="M16 23h32l-4 34H20z"/><path fill="#fff" d="M23 26h5l1 28h-7zm13 0h5l-2 28h-7z"/><path fill="#f6d354" d="M16 23c0-5 4-9 9-9 2-5 12-5 14 0 5 0 9 4 9 9z"/><path fill="#d82027" d="M20 28h24v5H20z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="rotate(-18 32 32)"><path fill="#d82027" d="M14 28h32l-4 28H18z"/><path fill="#fff" d="M21 31h5l1 22h-7zm13 0h5l-2 22h-7z"/><path fill="#f6d354" d="M10 25c4-7 12-5 16-1 4-5 12-4 16 2-10 1-21 1-32-1z"/><circle cx="50" cy="45" r="4" fill="#f6d354"/><circle cx="44" cy="53" r="3" fill="#f6d354"/></g></svg>';
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  const ROTTEN_TOMATOES_CRITIC_ICONS = {
    certifiedFresh:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEUAAAD/RTP/3ylG/3T//v7/7zb/nSz/1VP/3zH/aDhB/3tZ/33/5eHW/1z/hHv/wLpmoPHOAAAAEHRSTlMA0+6K+7S0N6XAdqzCUL21ms6D8QAAAutJREFUOMtlk09IFFEcx9cgtUBohMQBw/otb5xF7LCPJVnxELxLsLj5hvUPXnbn4NohWA1dPQg5S2JFoFLZXiIYjBjpMt526SDM2WyXVJIOhpdAiGCPQf3e223V2S8Db3if+X2/v5nfm0BdLQv5B/mNTKBBC5NTCZ5YntzwA3UKtIe6lYDllA9Y+v5Iq1Y6mActfR7MmZBO81mttGiNgpY8F/6KzN7cAyTNpX3NWj5rowOSL3oOSof6kxm4fH+R1KOaTBhtXSnxMQDQStlJCGX+p5A5LTsDYHCCqPVrD6RrKWafSeZBX8k9o5sA6UR2ZqRa1Mz7zH0gNqU2tQDIY3OWrEryGkgLeumU0mh0BaBn6lLNzgRA/zE7SlH2eyAHHDQBrpiAenrDdsrRsqMoKgc0uCZiBFhSUI8GFaEOQJOk6BlvQnLL+aJIXQeQQWJVLoqje7WBkI+04xa+J5I1H8EkTRKi+IVtZwJNFoRUVVHW8MJFlWRdkBYLhj3GPBbrZix2yoZO7nXF2kGXNSlJ2GckuAjSKUibIDuKt1OJM1Vhu7svh05jHfgRRE3ei8W8uBdnLO6x+AmWqrUcxZM2vxgb6mKsUicmqN7OcSXGutHtz09WudslifgGisjZZX/xYYY1Q10xRY5hHclvhCJHdi1rxpG8gZTiVwek5BQaSSek5QEZbiDtJCmnfauBmNgaytTxPn9hEjxUO1UYKaan/3hL5AOqjEE7vqSot0lCAw6cwzHG6KuStKyHpg+h10gQN5xw+eD3aWu8duQdm9q9upGDsIHQoJQ6garsCASN55Hc5gfDiPRTVLRGypQnSJi7A8QN8omw4fYP1v4Sm7ph1+Wcu6QXegkhNJqRYKtArTDnYWQTQSBg8OBWQZCjYoFGKIlEIjlijIWNSJDTgeInLKHFIvUJSUH4XS1i16Ihx3HkSqPFd7gvSfRjVmaK2Ow354xsbwfOa2CgTu4ELqpcI23Yh09He1XnjB/IrX92kRYQCwoChgAAAABJRU5ErkJggg==',
    fresh:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEX/NAsAAAAC/1D/OQz/NAsJ/0//Nwz/MwsU/1Eo/04G/1EJ/1UD/1H/sTL/XhfJ/0x2piOmAAAAEHRSTlP7AJDOoXcqWj9mLB5PZaZRPI8p8gAAAX5JREFUOMt90jFLAzEUB/BXc9DVSGmhdXpyi4KkVropFv0CdnJSDwRXb6lzB8HBRcXBwUFBJ10EQd100sGP4OYHED+AmOTy+tK7nP+W4y4/8vJyF5AuhzIXkgcskz4OZfNoGJApXG/1UXNBWjh7hYjHeWm+v73GGuby1abR5SUnZgFKvHHpyT2DsaE35/n2xCe/gwNv/OPuxglDrP8XSoEYkFyjjq43v/TZAZPIyZOBzQnEGaB0M3k8Q9xSWr5HEiVWarD8BbCAsSJQ0LOyByY/eGrHMq4aqdt7cf6rwEuipQah9LRsB6WrZQWEqc8RtjstEIyQ0ADu1U8CwQYUQDomwvyoOZgs1GIREErFzmHkh7aV8jnlUuxB/VOtZ/YjxtZWLCakYnRNoQHhuHetChDZ7xNKtfBNqUK79BykWuqhnUbuvPG4cjcVKzXeKEUkVqQCUejMSqCHxIm/JZEdQ5JGfv8kVI+XZ5E7DFEqfZG7tNZiIkko+6sKOmsDSfkD2vBSWgDW61wAAAAASUVORK5ErkJggg==',
    rotten:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAMFBMVEUAAAAO/2wM/20N/3MN/20N/24N/20R/2wP/2wQ/3AN/24O/24P/20P/24M/20M/24BuYFjAAAAEHRSTlMAybgUrTqFLXggYUhUnpNr9KbLSQAAAdNJREFUOMuFlL8vBEEUx5dzOIR8xzoch0kkGhGiQETiKiVKnYtORUOhOfwDiD/gLlGLnwmJCIXeNgqVq7SXSERp3ns7e7syiW+xs7OfnX3vzfvOev/rUftfTrAAwD9ygFRBGbToIF0gDTpII5MhB1llohzkmYnvJAoqJJmH6xg5BqmPblsCqMM6aa7ndgWNfGxRQKSfloBUqpNWmo+Ym04m3fzd703alUszXzfjNmXP301VgawZ0xoom7ES5dIEBXxIsU82ILJhjXqY0uO4GZrKmipIJlI7Z9AJbfMvMHk1gaDyk6l9SG52jcpJI0YDiEocmPU5XdGIlJd9iUvJtcbVF5HU8u3upMdKBwkQ73jmriBFaLqUks45Q6QVL4mKDiKainKr/SENFIWViz2dWzuaKdJzzXR5y4Idtk1M6u2FQTsSko9OUB4niWdWvkH7cGrc9gdD57yd71SYkrokJbXCi7NeB83FYTKOiYF7rHcUBsImbAnpFSeKR7bB70pzc3QuEfqqjYYL6aD22aTWizfAEpWslbySrndw796LzsAiO1x8ZdUBGzDN6Zbj516FPZg1aDgCnIntzvwPHRwRB+aCHArE3w6dyj/JodQBsOECxBKzXw1bZfpNbnldAAAAAElFTkSuQmCC',
    unknown:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAzBAMAAAAnTUYnAAAAMFBMVEX///8AAAD8/P/+/v/8/v/9/f/////9///8/P/////9/f/9/f/9///6///////7//9jXvJiAAAAEHRSTlPfAL/NsJUWol0ihXlpMk9AUJO7fgAAAZRJREFUOMt10j1Iw0AUwPGnEfxEfFVDq4j12S6CEDs4a7EUtxoo4ljQKohgq+jiUnFwcCmis3VwcHMRRBCKu1DQyUFEcBJpBxcnL9ckd6Z3f8iQ9yPkHQmg2zcG8uQlphObGhg5/lTIKhVMm2LvrTKWnH4moqugjJ08HcaTRIsYkDAbJolVDQh7gdsupR7KkqyTXLwhZOvt61KiKXmDXzGPXd9Xhfy4Q3Zl5wCMkidnxLKZpLI74NTjyqYDCwmiSfDaa8prkSgV7SDK+NLZlLCR3rcgQbEo+C1xqYOTTUUQ9TtiWsAy0suWJEaOyQjw+FxUYXIKqmaZXCilj4mllHaEcVCXg1GNlGBIIxUY1EgBBjQyoREL2rTPzDhiqIQ/o7QJ7W7zEIJghnueYWliSFaCcMu+zcpg8ruWHToQcFv7ferqgzIJyecxvJsqk3H1J2WCGX9nsUY3l5DinCUuEQuC9SIXxR9340okGoAudAXXAovVfMGPf3KLQsxHCVZQCOvI3/oOhfA2bD4/qKEQLzN/nkfRH1D6W+4DJAr9AAAAAElFTkSuQmCC'
  };

  function findRottenTomatoesUrl() {
    return (
      document.querySelector(
        '.meta__rotten a[href*="rottentomatoes.com/"], a.meta-id-tag[href*="rottentomatoes.com/"], a[href*="rottentomatoes.com/m/"], a[href*="rottentomatoes.com/tv/"]'
      )?.href || ''
    );
  }

  async function fetchRottenTomatoesUrlFromWikidata(imdbId) {
    const query = `SELECT * WHERE {?s wdt:P345 "${imdbId}". OPTIONAL { ?s wdt:P1258 ?Rotten_Tomatoes_ID. }}`;
    const payload = await jsonRequest(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`
    );
    const rtId = payload?.results?.bindings?.[0]?.Rotten_Tomatoes_ID?.value;
    return rtId ? `https://www.rottentomatoes.com/${rtId}` : null;
  }

  async function fetchTmdbWithCache(imdbId, titleData) {
    const cached = await getSupplementalRatingsCache(imdbId);
    if (cached && Object.prototype.hasOwnProperty.call(cached, 'tmdb')) return cached.tmdb;

    const tmdb = await fetchTmdbData(titleData);
    await mergeSupplementalRatingsCache(imdbId, { tmdb });
    return tmdb;
  }

  async function fetchTmdbData(titleData) {
    const url = findTmdbUrl();
    if (!url) return null;

    const embedded = extractEmbeddedTmdbRating(url, titleData);
    if (embedded) return embedded;

    const doc = parseHtmlDocument(await textRequest(url));
    const jsonScripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
    for (const script of jsonScripts) {
      const payload = safeJsonParse(script.textContent || '');
      const entries = Array.isArray(payload) ? payload : [payload];
      const entry = entries.find((candidate) => candidate?.aggregateRating);
      const rating = entry?.aggregateRating;
      const score = Number.parseFloat(rating?.ratingValue);
      const count = Number.parseInt(String(rating?.ratingCount || '').replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(score)) {
        return {
          count: Number.isFinite(count) ? count : null,
          score,
          title: entry.name || titleData?.titleText?.text || '',
          url
        };
      }
    }

    const text = normalizeText(doc.body?.textContent || '');
    const match = text.match(/User Score\s+(\d+)%/i) || text.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    const score = match ? Number.parseFloat(match[1]) : Number.NaN;
    return Number.isFinite(score)
      ? {
          count: null,
          score: score > 10 ? score / 10 : score,
          title: titleData?.titleText?.text || '',
          url
        }
      : null;
  }

  function findTmdbUrl() {
    const link = document.querySelector(
      'a[href*="themoviedb.org/movie/"], a[href*="themoviedb.org/tv/"]'
    );
    return link?.href || '';
  }

  function extractEmbeddedTmdbRating(url, titleData) {
    const rating = document.querySelector('.work__rating-text');
    if (!rating) return null;

    const percent = Number.parseFloat((rating.textContent || '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(percent)) return null;

    const countMatch = (rating.getAttribute('title') || '').match(/([\d,]+)/);
    const count = countMatch ? Number.parseInt(countMatch[1].replace(/,/g, ''), 10) : null;
    return {
      count: Number.isFinite(count) ? count : null,
      score: percent / 10,
      title: titleData?.titleText?.text || '',
      url
    };
  }

  async function fetchLetterboxdWithCache(imdbId) {
    const cached = await getSupplementalRatingsCache(imdbId);
    if (cached && Object.prototype.hasOwnProperty.call(cached, 'letterboxd')) {
      const letterboxd = cached.letterboxd;
      const needsHistogram = shouldFetchLetterboxdHistogramData();
      if (!needsHistogram || hasLetterboxdHistogramBins(letterboxd)) return letterboxd;
    }

    const response = await fetchLetterboxdData(imdbId);
    const letterboxd = response.status === 'ok' ? response.data : null;
    await mergeSupplementalRatingsCache(imdbId, { letterboxd });
    return letterboxd;
  }

  function shouldFetchLetterboxdHistogramData() {
    if (!shouldShowLetterboxdPanels()) return false;
    const letterboxdAggregate = normalizeAggregateSourceSettings(
      settings.ratingsAggregateSources
    ).letterboxd;
    return (
      settings.showLetterboxdHistogram ||
      settings.showLetterboxdWeightedScore ||
      (settings.showRatingsAggregate &&
        letterboxdAggregate.enabled &&
        /^weighted_/.test(letterboxdAggregate.option))
    );
  }

  function shouldShowLetterboxdPanels() {
    return !isUnit3dTvSimilarPage();
  }

  function isUnit3dTvSimilarPage() {
    return /^\/torrents\/similar\/2(?:[./?#]|$)/i.test(location.pathname + location.search);
  }

  async function fetchLetterboxdData(imdbId) {
    try {
      const baseUrl = findLetterboxdUrl() || `https://letterboxd.com/imdb/${imdbId}/`;
      const pageResponse = await textRequestDetailed(baseUrl);
      const finalUrl = pageResponse.finalUrl || baseUrl;
      let pageHtml = pageResponse.text;
      let page = parseHtmlDocument(pageHtml);
      const imdbLink = page.querySelector('[data-track-action="IMDb"]')?.href || '';
      if (imdbLink && !imdbLink.includes(imdbId)) {
        return { data: null, status: 'not_found' };
      }

      const membersPage = await fetchOptionalHtmlDocument(new URL('members', finalUrl).toString());
      const jsonText =
        page
          .querySelector('script[type="application/ld+json"]')
          ?.textContent?.replace(/\/\*.*?\*\//g, '')
          .trim() || '';
      const payload = safeJsonParse(jsonText);
      const ratingValue = Number.parseFloat(payload?.aggregateRating?.ratingValue);
      const ratingCount = Number.parseInt(payload?.aggregateRating?.ratingCount, 10);
      let histogram = parseLetterboxdHistogramFromHtml(pageHtml);
      if (!histogram.length && finalUrl && finalUrl !== baseUrl) {
        try {
          pageHtml = await textRequest(finalUrl);
          page = parseHtmlDocument(pageHtml);
          histogram = parseLetterboxdHistogramFromHtml(pageHtml);
        } catch {
          // Keep the redirect response if the explicit film page fails.
        }
      }

      const histogramCsiUrl = getLetterboxdHistogramCsiUrl(page, finalUrl);
      if (!histogram.length && histogramCsiUrl) {
        try {
          histogram = parseLetterboxdHistogramFromHtml(await textRequest(histogramCsiUrl));
        } catch {
          histogram = [];
        }
      }

      const histogramVotes = histogram.reduce((sum, item) => sum + item.voteCount, 0);
      const likes =
        parseLetterboxdAccessoryCount(page, '/likes/', /([\d.,]+\s*[KMB]?)\s+likes?/i) ||
        parseLetterboxdAccessoryCount(membersPage, '/likes/', /([\d.,]+\s*[KMB]?)\s+likes?/i);
      const fans =
        parseLetterboxdAccessoryCount(page, '/fans/', /([\d.,]+\s*[KMB]?)\s+fans?/i) ||
        parseLetterboxdAccessoryCount(membersPage, '/fans/', /([\d.,]+\s*[KMB]?)\s+fans?/i);

      if (!Number.isFinite(ratingValue) && histogramVotes <= 0) {
        return { data: null, status: 'not_found' };
      }

      return {
        data: {
          fans,
          fansUrl: new URL('fans', finalUrl).toString(),
          histogram,
          likes,
          likesUrl: new URL('likes', finalUrl).toString(),
          url: finalUrl,
          user: {
            count: Number.isFinite(ratingCount) ? ratingCount : histogramVotes,
            score: Number.isFinite(ratingValue) ? normalizeLetterboxdUserScore(ratingValue) : null,
            url: new URL('ratings', finalUrl).toString()
          }
        },
        status: 'ok'
      };
    } catch {
      return { data: null, status: 'error' };
    }
  }

  async function fetchOptionalHtmlDocument(url) {
    try {
      return parseHtmlDocument(await textRequest(url));
    } catch {
      return null;
    }
  }

  function hasLetterboxdHistogramBins(letterboxd) {
    return (
      Array.isArray(letterboxd?.histogram) &&
      letterboxd.histogram.some((entry) => Number.isFinite(entry?.voteCount) && entry.voteCount > 0)
    );
  }

  function normalizeLetterboxdUserScore(scoreOutOfFive) {
    const numericScore = Number.parseFloat(scoreOutOfFive);
    if (!Number.isFinite(numericScore) || numericScore < 0) return null;

    const scaledScore = numericScore * 20;
    const floorValue = Math.floor(scaledScore);
    const fractional = scaledScore - floorValue;
    if (fractional > 0.5) return floorValue + 1;
    return floorValue;
  }

  function findLetterboxdUrl() {
    return (
      document.querySelector(
        '.meta__letterboxd a[href*="letterboxd.com/"], a.meta-id-tag[href*="letterboxd.com/"], a[href*="letterboxd.com/imdb/"]'
      )?.href || ''
    );
  }

  function getLetterboxdHistogramCsiUrl(page, baseUrl) {
    if (!page) return null;
    const relativeUrl =
      page.querySelector('.js-csi[data-on-load="rating-histogram"]')?.getAttribute('data-src') ||
      page.querySelector('.js-csi[data-src*="/rating-histogram/"]')?.getAttribute('data-src') ||
      null;
    if (!relativeUrl) return null;

    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return null;
    }
  }

  async function fetchIMDbTrailerData(imdbId, titleData = null, options = {}) {
    const cacheKey = `${VIDEO_CACHE_PREFIX}${imdbId}`;
    if (!options.forceRefresh) {
      const cached = await getCache(cacheKey);
      if (isUsableTrailerCache(cached)) return cached;
    }

    const youtubeVideos = findUnit3dYouTubeTrailerVideos(titleData);

    let { latestTrailerId, uniqueVideoIds } = extractIMDbTrailerVideoIds(titleData);
    if (uniqueVideoIds.length === 0) {
      const titleResponse = await imdbGraphqlRequest(
        `
query Unit3dImdbTrailerIds($id: ID!) {
  title(id: $id) {
    id
    latestTrailer { id }
    primaryVideos(first: 20) { edges { node { id } } }
    videoStrip(first: 20) { edges { node { id } } }
  }
}`,
        { id: imdbId }
      );
      ({ latestTrailerId, uniqueVideoIds } = extractIMDbTrailerVideoIds(titleResponse.data?.title));
    }
    if (uniqueVideoIds.length === 0 && youtubeVideos.length === 0) return null;
    if (uniqueVideoIds.length === 0) {
      const trailerData = {
        cacheVersion: VIDEO_CACHE_VERSION,
        defaultVideoId: youtubeVideos[0].id,
        imdbId,
        latestTrailerId,
        videos: youtubeVideos
      };
      await setCache(cacheKey, trailerData);
      return trailerData;
    }

    const videoQueries = [
      `
query Unit3dImdbVideos($ids: [ID!]!) {
  videos(ids: $ids) {
    id
    name { value }
    contentType { id displayName { value } }
    runtime { value }
    playbackURLs { url }
    previewURLs { url }
  }
}`,
      `
query Unit3dImdbVideos($ids: [ID!]!) {
  videos(ids: $ids) {
    id
    name { value }
    contentType { id displayName { value } }
    runtime { value }
    previewURLs { url }
    playbackURLs { url }
  }
}`,
      `
query Unit3dImdbVideos($ids: [ID!]!) {
  videos(ids: $ids) {
    id
    name { value }
    playbackURLs { url }
  }
}`
    ];

    let response = null;
    for (const query of videoQueries) {
      try {
        const candidate = await imdbGraphqlRequest(query, { ids: uniqueVideoIds });
        if (Array.isArray(candidate.data?.videos)) {
          response = candidate;
          break;
        }
      } catch {
        // Try the next IMDb video query shape.
      }
    }
    if (!response) {
      if (youtubeVideos.length) {
        const trailerData = {
          cacheVersion: VIDEO_CACHE_VERSION,
          defaultVideoId: youtubeVideos[0].id,
          imdbId,
          latestTrailerId,
          videos: youtubeVideos
        };
        await setCache(cacheKey, trailerData);
        return trailerData;
      }
      return null;
    }

    const videos = (response.data?.videos || []).map(normalizeIMDbVideo).filter(Boolean);
    if (videos.length === 0 && youtubeVideos.length === 0) return null;

    const latestTrailer = latestTrailerId
      ? videos.find((video) => video.id === latestTrailerId)
      : null;
    const defaultVideo =
      youtubeVideos[0] || latestTrailer || videos.slice().sort(compareVideoQuality)[0];
    if (!defaultVideo) return null;
    const allVideos = [...youtubeVideos, ...videos];

    const trailerData = {
      cacheVersion: VIDEO_CACHE_VERSION,
      defaultVideoId: defaultVideo.id,
      imdbId,
      latestTrailerId,
      videos: allVideos.sort((left, right) => {
        if (left.id === defaultVideo.id) return -1;
        if (right.id === defaultVideo.id) return 1;
        if (!!left.youtubeKey !== !!right.youtubeKey) return left.youtubeKey ? -1 : 1;
        return `${left.contentTypeLabel} ${left.title}`.localeCompare(
          `${right.contentTypeLabel} ${right.title}`
        );
      })
    };
    await setCache(cacheKey, trailerData);
    return trailerData;
  }

  function isUsableTrailerCache(data) {
    return (
      data?.cacheVersion === VIDEO_CACHE_VERSION &&
      Array.isArray(data.videos) &&
      data.videos.length > 0 &&
      !!data.defaultVideoId &&
      (data.videos.some((video) => video.youtubeKey || video.embedUrl) ||
        getTrailerPlaybackUrls(data).length > 0)
    );
  }

  function extractIMDbTrailerVideoIds(titleData) {
    const ids = [];
    const latestTrailerId = titleData?.latestTrailer?.id || null;
    if (latestTrailerId) ids.push(latestTrailerId);

    [titleData?.primaryVideos?.edges, titleData?.videoStrip?.edges].forEach((edges) => {
      (edges || []).forEach((edge) => {
        if (edge.node?.id) ids.push(edge.node.id);
      });
    });

    return { latestTrailerId, uniqueVideoIds: [...new Set(ids)] };
  }

  function findUnit3dYouTubeTrailerVideos(titleData = null) {
    const ids = extractYouTubeIdsFromText(document.documentElement?.innerHTML || '');
    const title =
      titleData?.titleText?.text || document.querySelector('.meta__title')?.textContent || '';
    return ids.slice(0, 8).map((youtubeKey, index) => ({
      contentTypeLabel: 'Trailer',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeKey}`,
      id: `youtube:${youtubeKey}`,
      playbackSources: [],
      primarySource: null,
      runtimeSeconds: null,
      title:
        index === 0
          ? `${normalizeText(title) || 'UNIT3D'} Trailer`
          : `YouTube Trailer ${index + 1}`,
      youtubeKey
    }));
  }

  function extractYouTubeIdsFromText(text) {
    const normalized = String(text || '')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&');
    const ids = [];
    const patterns = [
      /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/gi,
      /youtube(?:-nocookie)?\.com\/watch\?[^"'<>]*\bv=([A-Za-z0-9_-]{11})/gi,
      /youtu\.be\/([A-Za-z0-9_-]{11})/gi,
      /(?:youtube|trailer|youtubeKey|youtube_key|videoKey|video_key)["']?\s*[:=]\s*["']([A-Za-z0-9_-]{11})["']/gi
    ];

    patterns.forEach((pattern) => {
      let match = pattern.exec(normalized);
      while (match) {
        if (!ids.includes(match[1])) ids.push(match[1]);
        match = pattern.exec(normalized);
      }
    });
    return ids;
  }

  function normalizeIMDbVideo(video) {
    const playbackSources = selectPlaybackSources(video);
    if (playbackSources.length === 0) return null;

    const bestMp4 = playbackSources.find((source) => source.mimeType === 'video/mp4') || null;
    return {
      bestMp4,
      contentTypeLabel: video.contentType?.displayName?.value || 'Video',
      id: video.id,
      playbackSources,
      primarySource: bestMp4 || playbackSources[0],
      runtimeSeconds: Number.isFinite(video.runtime?.value) ? video.runtime.value : null,
      title: video.name?.value || 'IMDb Video',
      videoPageUrl: imdbVideoUrl(video.id)
    };
  }

  function imdbVideoUrl(videoId) {
    return `https://www.imdb.com/video/${encodeURIComponent(videoId)}/`;
  }

  function selectPlaybackSources(video) {
    const candidates = [];
    [video.playbackURLs, video.previewURLs].forEach((items) => {
      (items || []).forEach((item) => {
        const url = typeof item === 'string' ? item : item?.url;
        if (!/^https?:\/\//i.test(url || '')) return;
        const mimeType =
          typeof item === 'object' && typeof item?.mimeType === 'string' && item.mimeType
            ? item.mimeType
            : inferVideoMimeType(url);
        candidates.push({
          bitrate: typeof item === 'object' && Number.isFinite(item.bitrate) ? item.bitrate : 0,
          height: typeof item === 'object' && Number.isFinite(item.height) ? item.height : 0,
          mimeType,
          url,
          width: typeof item === 'object' && Number.isFinite(item.width) ? item.width : 0
        });
      });
    });

    const seen = new Set();
    return candidates
      .sort((left, right) => {
        const leftRank = left.mimeType === 'video/mp4' ? 0 : 1;
        const rightRank = right.mimeType === 'video/mp4' ? 0 : 1;
        if (leftRank !== rightRank) return leftRank - rightRank;
        const leftArea = (left.width || 0) * (left.height || 0);
        const rightArea = (right.width || 0) * (right.height || 0);
        if (rightArea !== leftArea) return rightArea - leftArea;
        return (right.bitrate || 0) - (left.bitrate || 0);
      })
      .filter((source) => {
        if (seen.has(source.url)) return false;
        seen.add(source.url);
        return true;
      });
  }

  function compareVideoQuality(left, right) {
    const leftSource = left.primarySource || left.bestMp4 || null;
    const rightSource = right.primarySource || right.bestMp4 || null;
    const leftArea = leftSource ? (leftSource.width || 0) * (leftSource.height || 0) : 0;
    const rightArea = rightSource ? (rightSource.width || 0) * (rightSource.height || 0) : 0;
    if (rightArea !== leftArea) return rightArea - leftArea;
    const leftBitrate = leftSource?.bitrate || 0;
    const rightBitrate = rightSource?.bitrate || 0;
    if (rightBitrate !== leftBitrate) return rightBitrate - leftBitrate;
    return (left.title || '').localeCompare(right.title || '');
  }

  function inferVideoMimeType(url) {
    const clean = String(url || '')
      .split('?')[0]
      .toLowerCase();
    if (clean.endsWith('.mp4')) return 'video/mp4';
    if (clean.endsWith('.webm')) return 'video/webm';
    if (clean.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    return '';
  }

  async function fetchNames(ids) {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const cacheKey = `${NAME_CACHE_PREFIX}${uniqueIds.sort().join('_')}`;
    const cached = await getCache(cacheKey);
    if (Array.isArray(cached)) return cached;

    const query = `
query Unit3dImdbNames($ids: [ID!]!) {
  names(ids: $ids) {
    id
    nameText { text }
    primaryImage { url }
  }
}`;
    const response = await imdbGraphqlRequest(query, { ids: uniqueIds });
    if (response.errors?.length) {
      console.warn('[UNIT3D IMDb Combined] name lookup failed', response.errors);
      return [];
    }
    const names = Array.isArray(response.data?.names) ? response.data.names : [];
    await setCache(cacheKey, names);
    return names;
  }

  function imdbGraphqlRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        data: JSON.stringify({ query, variables }),
        headers: {
          'Content-Type': 'application/json',
          'x-imdb-user-country': 'US',
          'x-imdb-user-language': 'en-US'
        },
        method: 'POST',
        onerror: () => reject(new Error('IMDb GraphQL request error')),
        onload: (response) => {
          if (response.status < 200 || response.status >= 300) {
            reject(
              new Error(
                `IMDb GraphQL HTTP ${response.status}: ${(response.responseText || '').slice(0, 300)}`
              )
            );
            return;
          }

          try {
            resolve(JSON.parse(response.responseText));
          } catch (error) {
            reject(error);
          }
        },
        url: 'https://api.graphql.imdb.com/'
      });
    });
  }

  function textRequest(url, headers = {}) {
    return textRequestDetailed(url, headers).then((response) => response.text);
  }

  function jsonRequest(url, headers = {}) {
    return textRequest(url, headers).then((text) => JSON.parse(text));
  }

  function textRequestDetailed(url, headers = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        headers,
        method: 'GET',
        onerror: () => reject(new Error(`Request failed: ${url}`)),
        onload: (response) => {
          if (response.status < 200 || response.status >= 400) {
            reject(new Error(`HTTP ${response.status}: ${url}`));
            return;
          }
          resolve({
            finalUrl: response.finalUrl || url,
            text: response.responseText || ''
          });
        },
        url
      });
    });
  }

  function parseHtmlDocument(html) {
    return new DOMParser().parseFromString(html || '', 'text/html');
  }

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function getFirstValue(...values) {
    return values.find(
      (value) => value !== null && value !== undefined && String(value).trim() !== ''
    );
  }

  function parsePercent(value) {
    const parsed = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function parseCompactCount(value) {
    if (value === null || value === undefined) return 0;
    const text = String(value).replace(/,/g, '').trim();
    const match = text.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
    if (!match) return 0;

    const number = Number.parseFloat(match[1]);
    if (!Number.isFinite(number)) return 0;
    const suffix = (match[2] || '').toUpperCase();
    const multiplier =
      suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1;
    return Math.round(number * multiplier);
  }

  function parseLetterboxdHistogramFromHtml(html) {
    if (typeof html !== 'string' || !html.trim()) return [];

    const doc = parseHtmlDocument(html);
    const plotRows = [
      ...doc.querySelectorAll('.rating-histogram .plot tr.column, .rating-histogram .plot .column')
    ];
    if (plotRows.length) {
      return plotRows
        .map((row, index) => {
          const tooltip =
            row.querySelector('[data-original-title]')?.getAttribute('data-original-title') || '';
          const srOnlyText = row.querySelector('.cell ._sr-only')?.textContent || '';
          return {
            rating: index + 1,
            voteCount: parseCompactCount(tooltip) || parseCompactCount(srOnlyText)
          };
        })
        .filter((entry) => entry.voteCount > 0);
    }

    const dataRows = [
      ...doc.querySelectorAll(
        '.rating-histogram .histogram-bar, .rating-histogram .bar, [data-rating]'
      )
    ];
    const dataHistogram = dataRows
      .map((row) => {
        const ratingRaw =
          row.getAttribute('data-rating') ||
          row.getAttribute('data-original-title') ||
          row.getAttribute('title') ||
          row.textContent ||
          '';
        const countRaw =
          row.getAttribute('data-count') ||
          row.getAttribute('title') ||
          row.getAttribute('data-original-title') ||
          row.textContent ||
          '';
        const ratingMatch = String(ratingRaw).match(/([0-5](?:\.\d)?)/);
        const countMatch = String(countRaw).match(/([\d,.]+\s*[KMB]?)\s+(?:ratings?|members?)/i);
        const rating = ratingMatch ? Number.parseFloat(ratingMatch[1]) * 2 : Number.NaN;
        const voteCount = countMatch
          ? parseCompactCount(countMatch[1])
          : parseCompactCount(row.getAttribute('data-count'));
        return { rating, voteCount };
      })
      .filter((entry) => Number.isFinite(entry.rating) && entry.voteCount > 0);
    if (dataHistogram.length > 0) return dataHistogram;

    const segments = String(html || '').split('rating-histogram-bar');
    if (segments.length <= 1) return [];

    const histogram = [];
    for (let index = 1; index < segments.length; index += 1) {
      const segment = segments[index];
      const titleMatch = segment.match(/title="([^"]+)"/i);
      const countMatch =
        segment.match(/data-count="(\d+)"/i) || segment.match(/([\d,]+)\s+ratings?/i);
      let voteCount = countMatch ? Number.parseInt(countMatch[1].replace(/,/g, ''), 10) : 0;
      if (!Number.isFinite(voteCount) || voteCount <= 0) {
        const titleText = titleMatch?.[1] || '';
        const numericTokens = titleText.match(/\d[\d,]*/g) || [];
        voteCount = numericTokens.reduce((max, token) => {
          const parsed = Number.parseInt(token.replace(/,/g, ''), 10) || 0;
          return Math.max(max, parsed);
        }, 0);
      }
      const rating = index;
      if (Number.isFinite(rating) && voteCount > 0) histogram.push({ rating, voteCount });
    }

    return histogram;
  }

  function parseLetterboxdAccessoryCount(page, pathFragment, labelPattern) {
    const selector = `a[href*="${pathFragment}"]`;
    const text =
      page.querySelector(selector)?.getAttribute('title') ||
      page.querySelector(selector)?.textContent ||
      '';
    const match = text.match(labelPattern);
    return match ? parseCompactCount(match[1]) : 0;
  }

  function processSoundtracks(titleData, namesData) {
    const namesById = new Map((namesData || []).map((name) => [name.id, name]));
    return (titleData.soundtrack?.edges || []).map((edge) => {
      const soundtrack = edge.node || {};
      const comments = soundtrack.comments || [];
      const performedBy = comments
        .map((comment) => /Performed by \[link=(nm\d+)\]/i.exec(comment.markdown || ''))
        .find(Boolean);
      const anyName = comments
        .map((comment) => /\[link=(nm\d+)\]/i.exec(comment.markdown || ''))
        .find(Boolean);
      const textArtist = comments
        .map((comment) => /Performed by\s+(.+)/i.exec(comment.markdown || ''))
        .find(Boolean);
      const artistId = performedBy?.[1] || anyName?.[1] || null;
      const product = soundtrack.amazonMusicProducts?.[0];
      const artist =
        (artistId && namesById.get(artistId)?.nameText?.text) ||
        textArtist?.[1] ||
        product?.artists?.[0]?.artistName?.text ||
        product?.productTitle?.text ||
        '';

      return {
        artist,
        artistId,
        link: artistId
          ? `https://www.imdb.com/name/${artistId}/`
          : artist
            ? `https://duckduckgo.com/?q=${encodeURIComponent(artist)}`
            : '',
        title: soundtrack.text || 'Soundtrack'
      };
    });
  }

  function getNameIds(titleData) {
    const ids = [];
    (titleData.credits?.edges || []).forEach((edge) => {
      if (edge.node?.name?.id) ids.push(edge.node.name.id);
    });
    (titleData.soundtrack?.edges || []).forEach((edge) => {
      (edge.node?.comments || []).forEach((comment) => {
        const match = /\[link=(nm\d+)\]/i.exec(comment.markdown || '');
        if (match) ids.push(match[1]);
      });
    });
    return ids;
  }

  async function findImdbIdWithRetry(maxRetries = 16, retryDelay = 500) {
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const imdbId = findImdbId();
      if (imdbId) return imdbId;
      await sleep(retryDelay);
    }
    console.warn('[UNIT3D IMDb Combined] IMDb ID not found');
    return '';
  }

  function findImdbId() {
    const selectors = [
      'a[href*="imdb.com/title/tt"]',
      '.meta__ids a[href*="tt"]',
      '.unit3d-ptp-ids-panel a[href*="tt"]'
    ];
    for (const selector of selectors) {
      const link = document.querySelector(selector);
      const imdbId = extractImdbId(link?.href || link?.textContent || '');
      if (imdbId) return imdbId;
    }

    return extractImdbId(document.body?.textContent || '');
  }

  function extractImdbId(value) {
    const match = String(value || '').match(/\btt\d{5,}\b/i);
    return match ? match[0].toLowerCase() : '';
  }

  async function getCachedTitleData(imdbId) {
    if (!imdbId) return null;
    return getCache(`${CACHE_PREFIX}${imdbId}`);
  }

  async function buildCacheResponse(imdbId, requestId) {
    try {
      const data =
        imdbId === currentImdbId && currentTitleData
          ? { data: { title: currentTitleData } }
          : await getCachedTitleData(imdbId);

      return {
        data: data || null,
        found: !!data,
        imdbId,
        requestId,
        source: SCRIPT_SOURCE,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        data: null,
        error: error.message || String(error),
        found: false,
        imdbId,
        requestId,
        source: SCRIPT_SOURCE
      };
    }
  }

  function publishTagHiddenTitleData(imdbId, titleData, sourceDetail) {
    const payload = extractTagHiddenTitlePayload(titleData);
    if (!payload) return;

    document.dispatchEvent(
      new CustomEvent(TAG_HIDDEN_DATA_READY_EVENT, {
        detail: {
          found: true,
          imdbId,
          source: SCRIPT_SOURCE,
          sourceDetail,
          success: true,
          timestamp: Date.now(),
          titleData: payload
        }
      })
    );
  }

  function extractTagHiddenTitlePayload(titleData) {
    if (!titleData) return null;
    return {
      id: titleData.id,
      keywords: {
        edges: (titleData.keywords?.edges || []).map((edge) => ({
          node: {
            keyword: {
              id: edge.node?.keyword?.id || null,
              text: { text: edge.node?.keyword?.text?.text || '' }
            },
            legacyId: edge.node?.legacyId || null
          }
        }))
      },
      parentsGuide: {
        categories: (titleData.parentsGuide?.categories || []).map((category) => ({
          category: { text: category.category?.text || '' },
          guideItems: {
            edges: (category.guideItems?.edges || []).map((edge) => ({
              node: {
                isSpoiler: !!edge.node?.isSpoiler,
                text: { plainText: edge.node?.text?.plainText || '' }
              }
            }))
          },
          severity: { text: category.severity?.text || '' }
        }))
      },
      titleText: titleData.titleText,
      releaseYear: titleData.releaseYear
    };
  }

  function publishRatingsSnapshot(imdbId, titleData, complete) {
    document.dispatchEvent(
      new CustomEvent(RATINGS_EXPORT_UPDATE_EVENT, {
        detail: buildRatingsSnapshot(imdbId, titleData, null, complete)
      })
    );
  }

  function buildRatingsSnapshot(imdbId, titleData, requestId = null, complete = true) {
    const imdbData = titleData ? extractImdbRatingsPayload(titleData) : null;
    const providers = {
      imdb: imdbData
        ? { data: imdbData, error: null, status: 'ready', updatedAt: Date.now() }
        : { data: null, error: null, status: 'unavailable', updatedAt: Date.now() }
    };

    ['metacritic', 'rottenTomatoes', 'tmdb', 'letterboxd'].forEach((key) => {
      const provider = currentSupplementalRatings[key];
      if (!provider) return;
      providers[key] = {
        data: provider.data || null,
        error: provider.error || null,
        status: provider.status || (provider.data ? 'ready' : 'unavailable'),
        updatedAt: provider.updatedAt || Date.now()
      };
    });

    return {
      complete,
      found: !!titleData,
      imdbId,
      providers,
      ptpId: null,
      requestId,
      source: SCRIPT_SOURCE,
      timestamp: Date.now()
    };
  }

  function extractImdbRatingsPayload(titleData) {
    return {
      aggregateRating: titleData.ratingsSummary?.aggregateRating ?? null,
      aggregateRatingsBreakdown: titleData.aggregateRatingsBreakdown || null,
      metacritic: titleData.metacritic || null,
      meterRank: titleData.meterRank || null,
      topRanking: titleData.ratingsSummary?.topRanking || null,
      voteCount: titleData.ratingsSummary?.voteCount ?? null
    };
  }

  async function setCache(key, data) {
    const serialized = JSON.stringify({
      data: LZString.compress(JSON.stringify(data)),
      timestamp: Date.now()
    });
    await GM.setValue(key, serialized);
  }

  async function getCache(key) {
    const cached = await GM.getValue(key, null);
    if (!cached) return null;

    try {
      const cacheData = JSON.parse(cached);
      const parsed = JSON.parse(LZString.decompress(cacheData.data));
      const ttl = getCacheDuration(key, parsed);
      if (Date.now() - cacheData.timestamp < ttl) return parsed;
    } catch (error) {
      console.warn('[UNIT3D IMDb Combined] cache parse failed', key, error);
    }
    return null;
  }

  function getCacheDuration(key, data) {
    if (key.startsWith(VIDEO_CACHE_PREFIX)) {
      return getVideoCacheDuration(data);
    }

    const releaseYear = data?.data?.title?.releaseYear?.year;
    const currentYear = new Date().getFullYear();
    if (
      key.startsWith(CACHE_PREFIX) &&
      Number.isFinite(releaseYear) &&
      releaseYear >= currentYear
    ) {
      return settings.newTitleTtlDays * 24 * 60 * 60 * 1000;
    }
    return settings.cacheExpiryDays * 24 * 60 * 60 * 1000;
  }

  function getVideoCacheDuration(data) {
    const now = Date.now();
    const expirations = getTrailerPlaybackUrls(data)
      .map((url) => {
        try {
          const expires = Number.parseInt(new URL(url).searchParams.get('Expires') || '', 10);
          return Number.isFinite(expires) ? expires * 1000 : null;
        } catch {
          return null;
        }
      })
      .filter((expires) => Number.isFinite(expires));

    if (expirations.length === 0) {
      return Math.min(settings.cacheExpiryDays * 24 * 60 * 60 * 1000, 6 * 60 * 60 * 1000);
    }

    const earliestExpiration = Math.min(...expirations);
    return Math.max(0, earliestExpiration - now - 5 * 60 * 1000);
  }

  function getTrailerPlaybackUrls(data) {
    return (data?.videos || []).flatMap((video) =>
      (video.playbackSources || [])
        .map((source) => source?.url)
        .filter((url) => typeof url === 'string' && url)
    );
  }

  async function flushCache() {
    const keys = await GM.listValues();
    const targetKeys = keys.filter(
      (key) =>
        key.startsWith(CACHE_PREFIX) ||
        key.startsWith(NAME_CACHE_PREFIX) ||
        key.startsWith(VIDEO_CACHE_PREFIX) ||
        key.startsWith(SUPPLEMENTAL_CACHE_PREFIX)
    );
    await Promise.all(targetKeys.map((key) => GM.deleteValue(key)));
    console.info(`[UNIT3D IMDb Combined] removed ${targetKeys.length} cache entries`);
  }

  function buildKeyValue(rows) {
    const list = document.createElement('dl');
    list.className = 'unit3d-imdb-kv';
    rows.forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      const term = document.createElement('dt');
      term.textContent = key;
      const description = document.createElement('dd');
      if (value instanceof Node) {
        description.appendChild(value);
      } else {
        description.textContent = String(value);
      }
      list.append(term, description);
    });
    return list;
  }

  function appendRow(rows, label, value) {
    if (value === null || value === undefined || value === '') return;
    rows.push([label, value]);
  }

  function formatSpecItems(items, valueKey) {
    return (items || [])
      .map((item) => {
        const value = item?.[valueKey];
        if (!value) return '';
        return `${value}${joinText(item.attributes, 'text', ', ', ' (', ')')}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  function formatFilmLengths(items) {
    return (items || [])
      .map((item) => {
        if (!item.filmLength) return '';
        return [
          `${item.filmLength} m`,
          joinText(item.countries, 'text', ', ', '(', ')'),
          item.numReels ? `${item.numReels} reels` : ''
        ]
          .filter(Boolean)
          .join(' ');
      })
      .filter(Boolean)
      .join(', ');
  }

  function formatBudget(value) {
    return Number.isFinite(value?.amount) ? formatCurrency(value.amount) : '';
  }

  function formatRankedGross(value) {
    if (!Number.isFinite(value?.total?.amount)) return '';
    const rank = Number.isFinite(value.rank) ? ` (Rank: ${formatCount(value.rank)})` : '';
    return `${formatCurrency(value.total.amount)}${rank}`;
  }

  function formatOpeningWeekend(value) {
    if (!Number.isFinite(value?.gross?.total?.amount)) return '';
    const suffix = [
      value.theaterCount ? `${formatCount(value.theaterCount)} theaters` : '',
      value.weekendStartDate && value.weekendEndDate
        ? `${value.weekendStartDate} to ${value.weekendEndDate}`
        : ''
    ]
      .filter(Boolean)
      .join(', ');
    return `${formatCurrency(value.gross.total.amount)}${suffix ? ` (${suffix})` : ''}`;
  }

  function extractKeywords(titleData) {
    return (titleData.keywords?.edges || [])
      .map((edge) => normalizeText(edge.node?.keyword?.text?.text || edge.node?.legacyId || ''))
      .filter(Boolean);
  }

  function joinText(items, key, separator, prefix = '', suffix = '') {
    const values = (items || []).map((item) => item?.[key]).filter(Boolean);
    return values.length ? `${prefix}${values.join(separator)}${suffix}` : '';
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      currency: 'USD',
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(amount);
  }

  function formatCount(value) {
    if (!Number.isFinite(value)) return '';
    return new Intl.NumberFormat('en-US').format(value);
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function imdbTitleUrl(imdbId) {
    return `https://www.imdb.com/title/${imdbId}/`;
  }

  function unit3dTorrentSearchByImdbUrl(imdbId) {
    const numericId = String(imdbId || '').replace(/^tt/i, '');
    const url = new URL('/torrents', location.origin);
    if (numericId) url.searchParams.set('imdbId', numericId);
    return url.toString();
  }

  function openInNewTab(link) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  function waitForDocument() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
