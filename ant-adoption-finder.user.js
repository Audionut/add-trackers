// ==UserScript==
// @name         ANT - Adoption cross-seed finder
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.2.1
// @description  Scan and filter ANT adoption torrents, then find filename and file-list matches on other trackers.
// @author       Audionut with additions from Surferosa
// @match        https://anthelion.me/torrents.php?type=adoption*
// @match        https://anthelion.me/torrents.php?id=*
// @icon         https://anthelion.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ant-adoption-finder.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ant-adoption-finder.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      anthelion.me
// @connect      passthepopcorn.me
// @connect      beyond-hd.me
// @connect      hdbits.org
// @connect      aura4k.net
// @connect      aither.cc
// @connect      blutopia.cc
// @connect      capybarabr.com
// @connect      darkpeers.org
// @connect      torrent.desi
// @connect      frikibar.com
// @connect      homiehelpdesk.net
// @connect      hawke.uno
// @connect      infinityhd.net
// @connect      itatorrents.xyz
// @connect      locadora.cc
// @connect      theldu.to
// @connect      lst.gg
// @connect      lat-team.com
// @connect      luminarr.me
// @connect      onlyencodes.cc
// @connect      oldtoons.world
// @connect      portugas.org
// @connect      polishtorrent.top
// @connect      rastastugan.org
// @connect      reelflix.cc
// @connect      retro-movies.club
// @connect      samaritano.cc
// @connect      shareisland.org
// @connect      seedpool.org
// @connect      skipthecommercials.xyz
// @connect      cinematik.net
// @connect      tlzdigital.com
// @connect      theoldschool.cc
// @connect      torrenteros.org
// @connect      upload.cx
// @connect      utp.to
// @connect      yoinked.org
// @connect      yu-scene.net
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js
// ==/UserScript==

/* global unsafeWindow */

(function () {
  'use strict';

  const SCRIPT_PREFIX = 'ant-adoption-filename-cross-seed';
  const CACHE_STORAGE_PREFIX = `${SCRIPT_PREFIX}:c:`;
  const CACHE_COMPRESSION_PREFIX = 'lz-json-v3:';
  const ACTION_STORAGE_PREFIX = `${SCRIPT_PREFIX}:action:`;
  const ROW_PROCESSING_MIGRATION_VERSION = 1;
  const ROW_PROCESSING_MIGRATION_STORAGE_KEY = `${SCRIPT_PREFIX}:row-processing-migration-v${ROW_PROCESSING_MIGRATION_VERSION}`;
  const ACTION_RECOVERY_SUPPRESS_STORAGE_KEY = `${SCRIPT_PREFIX}:suppress-completed-action-recovery`;
  const FILTERED_SCAN_VERSION = 2;
  const FILTERED_SCAN_STORAGE_KEY = `${SCRIPT_PREFIX}:filtered-scan-v2`;
  const FILTERED_SCAN_STORAGE_PREFIX = `${SCRIPT_PREFIX}:filtered-scan`;
  const LEGACY_FILTERED_SCAN_STORAGE_KEYS = [`${SCRIPT_PREFIX}:filtered-scan-v1`];
  const FILTERED_VIEW_PARAM = 'ant_adoption_filtered';
  const ADOPTION_READY_PARAM = 'ant_adoption_ready';
  const ADOPTION_READY_TOKEN_PARAM = 'ant_adoption_token';
  const ADOPTION_READY_DISPATCHED_PARAM = 'ant_adoption_dispatched';
  const ADOPTION_READY_TOKEN_STORAGE_PREFIX = `${SCRIPT_PREFIX}:adoption-ready-token:`;
  const ADOPTION_READY_TOKEN_TTL_MS = 15 * 60 * 1000;
  const ADOPTION_READY_FLOW_STORAGE_KEY = `${SCRIPT_PREFIX}:adoption-ready-flow-v1`;
  const ADOPTION_READY_FLOW_LOCK_NAME = `${SCRIPT_PREFIX}:adoption-ready-flow-lock-v1`;
  const BOUNTY_GIB_COLUMN_CLASS = 'ant-adoption-bounty-gib';
  const ACTION_COLUMN_CLASS = 'ant-adoption-action';
  const FILTERABLE_ROW_SELECTOR = 'tr.torrent.torrent_row';
  const GRABBED_HIGHLIGHT_COLOR = 'rgba(46, 160, 67, 0.35)';
  const IGNORED_HIGHLIGHT_COLOR = 'rgba(140, 140, 140, 0.35)';
  const MAX_SCAN_PAGES = 30;
  const ROW_DELAY_MIN_SECONDS = 30;
  const ADOPTION_READY_QUI_POLL_INTERVAL_MS = 10000;
  const ADOPTION_READY_QUI_POLL_DURATION_MS = 60000;
  const ADOPTION_READY_HANDLING_TIMEOUT_MS = 2 * 60 * 1000;
  const ADOPTION_READY_FLOW_LEASE_MS = 5 * 60 * 1000;
  const ADOPTION_READY_FLOW_HEARTBEAT_MS = 60000;
  const ADOPTION_READY_FLOW_RETRY_MS = 10000;
  const qui_SEEDING_STATES = new Set(['uploading', 'stalledup', 'forcedup', 'seeding', 'seed']);
  const VIDEO_EXTENSIONS = new Set([
    'mkv',
    'mp4',
    'avi',
    'm2ts',
    'mpg',
    'mpeg',
    'ts',
    'vob',
    'iso'
  ]);

  const EXCLUSION_OPTIONS = {
    Source: ['BluRay', 'WEB', 'DVD', 'HDDVD', 'LaserDisc', 'HDTV', 'TV', 'VHS', 'Unknown', 'Other'],
    Codec: ['H264', 'H265', 'VC1', 'MPEG2', 'MPEG1', 'AV1', 'Xvid', 'Other'],
    Audio: [
      'EAC3',
      'AC3',
      'DTSMA',
      'DTS',
      'TrueHD',
      'FLAC',
      'PCM',
      'Opus',
      'AAC',
      'MP3',
      'MP2',
      'MP1',
      'NoAudio',
      'Other'
    ],
    Subtitles: ['Subs'],
    Resolution: ['SD', '720p', '1080i', '1080p', '2160p'],
    Language: [
      'Abkhazian',
      'Afrikaans',
      'Akan',
      'Albanian',
      'Amharic',
      'Arabic',
      'Aramaic',
      'Armenian',
      'Basque',
      'Belarusian',
      'Bengali',
      'Bosnian',
      'Bulgarian',
      'Cantonese',
      'Catalan',
      'Chinese',
      'Croatian',
      'Czech',
      'Danish',
      'Dutch',
      'Dzongkha',
      'Estonian',
      'Filipino',
      'Finnish',
      'French',
      'Georgian',
      'German',
      'Greek',
      'Gujarati',
      'Hebrew',
      'Hindi',
      'Hungarian',
      'Icelandic',
      'Indonesian',
      'Irish',
      'Italian',
      'Japanese',
      'Kannada',
      'Kazakh',
      'Kongo',
      'Korean',
      'Kurdish',
      'Lao',
      'Latin',
      'Latvian',
      'Lithuanian',
      'Malay',
      'Malayalam',
      'Mandarin',
      'Marathi',
      'Macedonian',
      'Mongolian',
      'Multiple languages',
      'Nepali',
      'Norwegian',
      'Norwegian Bokmal',
      'Panjabi',
      'Persian',
      'Polish',
      'Portuguese',
      'Romanian',
      'Russian',
      'Sami',
      'Serbian',
      'Sinhala',
      'Slovak',
      'Slovenian',
      'Somali',
      'Spanish',
      'Swahili',
      'Swedish',
      'Tagalog',
      'Tamil',
      'Telugu',
      'Thai',
      'Turkish',
      'Ukrainian',
      'Urdu',
      'Vietnamese',
      'Welsh',
      'Wolof',
      'Yoruba',
      'Yiddish',
      'Zulu',
      'Zxx',
      'NoAudio',
      'Other'
    ]
  };
  const EXCLUSION_CONTROL_CSS = `
    .ant-exclusion-group { margin: 12px 0; padding: 10px; border: 1px solid #666; }
    .ant-exclusion-group > button { margin-top: 8px; }
    .ant-media-filters { display: flex; flex-wrap: wrap; gap: 8px; }
    .ant-exclusion-select { position: relative; min-width: 180px; }
    .ant-exclusion-select summary { cursor: pointer; padding: 6px; border: 1px solid #777; border-radius: 4px; }
    .ant-exclusion-options { background: #333; color: #eee; border: 1px solid #777; padding: 8px; max-height: 280px; overflow-y: auto; }
    .ant-exclusion-options label { display: flex !important; align-items: center; gap: 6px; padding: 3px; }
    #ant-adoption-filter-toolbar .ant-exclusion-options { position: absolute; z-index: 10; min-width: 220px; }
  `;

  const fields = {
    scan_page_count: {
      label: 'Adoption pages to scan',
      type: 'unsigned int',
      default: 10,
      max: MAX_SCAN_PAGES
    },
    scan_delay_seconds: {
      label: 'Delay between scanned pages',
      type: 'unsigned int',
      default: 3
    },
    minimum_bounty_per_gib: {
      label: 'Minimum bounty per GiB',
      type: 'unsigned int',
      default: 200000
    },
    minimum_bounty: {
      label: 'Minimum bounty',
      type: 'unsigned int',
      default: 0,
      tooltip: 'Use 0 for no minimum bounty.'
    },
    maximum_size_gib: {
      label: 'Maximum size in GiB',
      type: 'unsigned float',
      default: 0,
      tooltip: 'Enter GiB, not bytes. Use 0 for no maximum size.'
    },
    excluded_formats: {
      label: 'Media filters',
      type: 'exclusions',
      default: {},
      tooltip:
        'Choose Ignore selected or Only show selected for each category. Empty categories do not filter rows.'
    },
    exclusion_groups: {
      label: 'Exclusion groups',
      type: 'exclusionGroups',
      default: [],
      tooltip:
        'Exclude when any group matches all its selected categories. Empty groups are inactive. Apply media filters must be enabled.'
    },
    hide_below_bounty_threshold: {
      label: 'Hide rows below the bounty/GiB minimum',
      type: 'checkbox',
      default: true
    },
    hide_below_minimum_bounty: {
      label: 'Hide rows below the minimum bounty',
      type: 'checkbox',
      default: true
    },
    hide_above_maximum_size: {
      label: 'Hide rows above the maximum size',
      type: 'checkbox',
      default: true
    },
    hide_excluded_formats: {
      label: 'Apply media filters',
      type: 'checkbox',
      default: false
    },
    combine_media_filters: {
      label: 'Combine media filters',
      type: 'checkbox',
      default: false,
      tooltip:
        'Exclude only when all active Ignore categories match. All Only show categories must still match. Empty categories are inactive.'
    },
    hide_ignored_rows: {
      label: 'Hide Ignored rows',
      type: 'checkbox',
      default: false
    },
    hide_grabbed_rows: {
      label: 'Hide Grabbed rows',
      type: 'checkbox',
      default: false
    },
    show_only_grabbed_rows: {
      label: 'Show only Grabbed rows',
      type: 'checkbox',
      default: false
    },
    default_sort_field: {
      label: 'Default sort field',
      type: 'select',
      default: 'Bounty / GiB',
      options: ['Bounty / GiB', 'Bounty', 'Size', 'Torrent', 'Listing Time', 'Scan order']
    },
    default_sort_direction: {
      label: 'Default sort direction',
      type: 'select',
      default: 'Descending',
      options: ['Descending', 'Ascending']
    },
    seeding_filter: {
      label: 'Seeding filter',
      type: 'select',
      default: 'All rows',
      options: ['All rows', 'Seeding only', 'Not seeding only']
    },
    clear_adoption_actions: {
      label: 'Clear Grabbed/Ignored/Broken actions',
      type: 'button',
      click: clearAdoptionActions
    },
    clear_filtered_scan: {
      label: 'Clear saved filtered scan',
      type: 'button',
      click: clearFilteredScan
    },
    skip_trumpable: {
      label: 'Skip Trumpable rows',
      type: 'checkbox',
      default: true
    },
    row_delay_seconds: {
      label: 'Delay between rows in seconds',
      type: 'unsigned int',
      default: 60,
      min: ROW_DELAY_MIN_SECONDS
    },
    row_limit: {
      label: 'Rows per button press',
      type: 'unsigned int',
      default: 0,
      tooltip: '0 means process every uncached eligible row on the page.'
    },
    use_cache: {
      label: 'Cache all lookup results',
      type: 'checkbox',
      default: true
    },
    load_cache_status_on_page_load: {
      label: 'Load cache status on page load',
      type: 'checkbox',
      default: false,
      tooltip:
        'Render cached row status, qui results, and tracker links as soon as the page opens. Grabbed, Ignored, and Broken rows are always restored.'
    },
    clean_site_lookup_cache: {
      label: 'Clean site lookup cache',
      type: 'button',
      click: cleanSiteLookupCache
    },
    clean_ant_cache: {
      label: 'Clean ANT cache',
      type: 'button',
      click: cleanAntCache
    },
    debug_logging: {
      label: 'Debug logging',
      type: 'checkbox',
      default: false,
      tooltip:
        'Log capped row, cache, qui, ANT, and tracker lookup details. Lifecycle timings are always logged separately.'
    },
    tracker_scope: {
      label: 'Tracker processing scope',
      type: 'select',
      default: 'All enabled trackers',
      options: [
        'All enabled trackers',
        'PTP',
        'BHD',
        'HDB',
        'A4K',
        'Aither',
        'BLU',
        'CBR',
        'DP',
        'DT',
        'FRIKI',
        'HHD',
        'HUNO',
        'IHD',
        'ITT',
        'LCD',
        'LDU',
        'LST',
        'LT',
        'LUME',
        'OE',
        'OTW',
        'PT',
        'PTT',
        'RAS',
        'RF',
        'RMC',
        'SAM',
        'SHRI',
        'SP',
        'STC',
        'TIK',
        'TLZ',
        'TOS',
        'TTR',
        'ULCX',
        'UTP',
        'YOINK',
        'YUS'
      ],
      tooltip:
        'Limit processing to one tracker so newly added trackers can be filled without rechecking every site.'
    },
    refresh_tracker_cache: {
      label: 'Refresh scoped tracker cache',
      type: 'checkbox',
      default: false,
      tooltip:
        'Ignore cached tracker results for the current tracker scope during this page session.'
    },
    qui_base_url: {
      label: 'qui Base URL',
      type: 'text',
      default: '',
      tooltip: 'Supports direct /api/v2, /proxy/<token>, or the base qui URL used by the qui proxy.'
    },
    qui_token: { label: 'qui Token', type: 'text', default: '' },
    qui_save_path: {
      label: 'Default qui save path',
      type: 'text',
      default: ''
    },
    qui_categories: {
      label: 'Site qui categories',
      type: 'text',
      default: '',
      tooltip: 'Comma separated categories to pass when adding other-site torrents.'
    },
    qui_tags: {
      label: 'Site qui tags',
      type: 'text',
      default: '',
      tooltip: 'Comma separated tags to pass when adding other-site torrents.'
    },
    qui_instance_id: { label: 'qui instance_id', type: 'text', default: '' },
    qui_limit: {
      label: 'qui search result limit',
      type: 'unsigned int',
      default: 300
    },
    qui_ant_categories: {
      label: 'ANT qui categories',
      type: 'text',
      default: '',
      tooltip:
        'Comma separated categories to pass when adding ANT torrents. Falls back to Site qui categories when empty.'
    },
    qui_ant_tags: {
      label: 'ANT qui tags',
      type: 'text',
      default: '',
      tooltip:
        'Comma separated tags to pass when adding ANT torrents. Falls back to Site qui tags when empty.'
    },
    qui_skip_recheck: {
      label: 'ANT qui skip checking',
      type: 'checkbox',
      default: true
    },
    qui_cross_seed_followup_delay_seconds: {
      label: 'qui cross-seed follow-up delay seconds',
      type: 'unsigned int',
      default: 60,
      tooltip:
        'In automatic-adoption mode, wait this long before checking whether qui cross-seeded the ANT torrent.'
    },
    qui_auto_add_site_torrent: {
      label: 'Auto add best site torrent to qui',
      type: 'checkbox',
      default: false,
      tooltip:
        'Automatically add the highest-seeded matching site torrent to qui when it meets the minimum seeder threshold.'
    },
    qui_auto_add_min_seeders: {
      label: 'Auto qui minimum seeders',
      type: 'unsigned int',
      default: 1,
      tooltip: 'Only auto-add a site torrent when its seeder count is at least this value.'
    },
    qui_auto_ignore_ungrabbed: {
      label: 'Auto-ignore rows with no eligible auto-qui match',
      type: 'checkbox',
      default: false,
      tooltip:
        'When auto-add is enabled and every tracker lookup succeeds, mark rows Ignored if there is no match or no match meets the auto-add requirements.'
    },
    qui_auto_trigger_adoption: {
      label: 'Automatically trigger ANT adoption',
      type: 'checkbox',
      default: false,
      tooltip:
        "When enabled, wait the positive qui cross-seed follow-up delay plus 10 seconds, or 5 seconds when it is zero, serialize ready pages, poll qui for up to 60 seconds, and release each page's queue slot after at most two minutes. When disabled, open completed torrents immediately for manual handling without further qui polling."
    },
    ptp: { label: 'PassThePopcorn', type: 'checkbox', default: false },
    ptp_api_user: { label: 'PassThePopcorn API USER', type: 'text', default: '' },
    ptp_api_key: { label: 'PassThePopcorn API KEY', type: 'text', default: '' },
    bhd: { label: 'Beyond HD', type: 'checkbox', default: false },
    bhd_api: { label: 'Beyond HD API TOKEN', type: 'text', default: '' },
    bhd_rss: { label: 'Beyond HD RSS KEY', type: 'text', default: '' },
    hdb: { label: 'HDBits', type: 'checkbox', default: false },
    hdb_user: { label: 'HDBits USER NAME', type: 'text', default: '' },
    hdb_pass: { label: 'HDBits PASS KEY', type: 'text', default: '' },
    a4k: { label: 'Aura4K', type: 'checkbox', default: false },
    a4k_api: { label: 'Aura4K API TOKEN', type: 'text', default: '' },
    aither: { label: 'Aither', type: 'checkbox', default: false },
    aither_api: { label: 'Aither API TOKEN', type: 'text', default: '' },
    blu: { label: 'Blutopia', type: 'checkbox', default: false },
    blu_api: { label: 'Blutopia API TOKEN', type: 'text', default: '' },
    cbr: { label: 'CapybaraBR', type: 'checkbox', default: false },
    cbr_api: { label: 'CapybaraBR API TOKEN', type: 'text', default: '' },
    dp: { label: 'DarkPeers', type: 'checkbox', default: false },
    dp_api: { label: 'DarkPeers API TOKEN', type: 'text', default: '' },
    dt: { label: 'Torrent Desi', type: 'checkbox', default: false },
    dt_api: { label: 'Torrent Desi API TOKEN', type: 'text', default: '' },
    friki: { label: 'Frikibar', type: 'checkbox', default: false },
    friki_api: { label: 'Frikibar API TOKEN', type: 'text', default: '' },
    hhd: { label: 'HomieHelpDesk', type: 'checkbox', default: false },
    hhd_api: { label: 'HomieHelpDesk API TOKEN', type: 'text', default: '' },
    huno: { label: 'Hawke Uno', type: 'checkbox', default: false },
    huno_api: { label: 'Hawke Uno API TOKEN', type: 'text', default: '' },
    ihd: { label: 'InfinityHD', type: 'checkbox', default: false },
    ihd_api: { label: 'InfinityHD API TOKEN', type: 'text', default: '' },
    itt: { label: 'ItaTorrents', type: 'checkbox', default: false },
    itt_api: { label: 'ItaTorrents API TOKEN', type: 'text', default: '' },
    lcd: { label: 'Locadora', type: 'checkbox', default: false },
    lcd_api: { label: 'Locadora API TOKEN', type: 'text', default: '' },
    ldu: { label: 'TheLDU', type: 'checkbox', default: false },
    ldu_api: { label: 'TheLDU API TOKEN', type: 'text', default: '' },
    lst: { label: 'LST', type: 'checkbox', default: false },
    lst_api: { label: 'LST API TOKEN', type: 'text', default: '' },
    lt: { label: 'Lat Team', type: 'checkbox', default: false },
    lt_api: { label: 'Lat Team API TOKEN', type: 'text', default: '' },
    lume: { label: 'Luminarr', type: 'checkbox', default: false },
    lume_api: { label: 'Luminarr API TOKEN', type: 'text', default: '' },
    oe: { label: 'OnlyEncodes', type: 'checkbox', default: false },
    oe_api: { label: 'OnlyEncodes API TOKEN', type: 'text', default: '' },
    otw: { label: 'OldToons', type: 'checkbox', default: false },
    otw_api: { label: 'OldToons API TOKEN', type: 'text', default: '' },
    pt: { label: 'Portugas', type: 'checkbox', default: false },
    pt_api: { label: 'Portugas API TOKEN', type: 'text', default: '' },
    ptt: { label: 'PolishTorrent', type: 'checkbox', default: false },
    ptt_api: { label: 'PolishTorrent API TOKEN', type: 'text', default: '' },
    ras: { label: 'Rastastugan', type: 'checkbox', default: false },
    ras_api: { label: 'Rastastugan API TOKEN', type: 'text', default: '' },
    rf: { label: 'ReelFliX', type: 'checkbox', default: false },
    rf_api: { label: 'ReelFliX API TOKEN', type: 'text', default: '' },
    rmc: { label: 'Retro Movies', type: 'checkbox', default: false },
    rmc_api: { label: 'Retro Movies API TOKEN', type: 'text', default: '' },
    sam: { label: 'Samaritano', type: 'checkbox', default: false },
    sam_api: { label: 'Samaritano API TOKEN', type: 'text', default: '' },
    shri: { label: 'ShareIsland', type: 'checkbox', default: false },
    shri_api: { label: 'ShareIsland API TOKEN', type: 'text', default: '' },
    sp: { label: 'SeedPool', type: 'checkbox', default: false },
    sp_api: { label: 'SeedPool API TOKEN', type: 'text', default: '' },
    stc: { label: 'SkipTheCommercials', type: 'checkbox', default: false },
    stc_api: { label: 'SkipTheCommercials API TOKEN', type: 'text', default: '' },
    tik: { label: 'Cinematik', type: 'checkbox', default: false },
    tik_api: { label: 'Cinematik API TOKEN', type: 'text', default: '' },
    tlz: { label: 'TLZDigital', type: 'checkbox', default: false },
    tlz_api: { label: 'TLZDigital API TOKEN', type: 'text', default: '' },
    tos: { label: 'TheOldSchool', type: 'checkbox', default: false },
    tos_api: { label: 'TheOldSchool API TOKEN', type: 'text', default: '' },
    ttr: { label: 'Torrenteros', type: 'checkbox', default: false },
    ttr_api: { label: 'Torrenteros API TOKEN', type: 'text', default: '' },
    ulcx: { label: 'Upload CX', type: 'checkbox', default: false },
    ulcx_api: { label: 'Upload CX API TOKEN', type: 'text', default: '' },
    utp: { label: 'UTP', type: 'checkbox', default: false },
    utp_api: { label: 'UTP API TOKEN', type: 'text', default: '' },
    yoink: { label: 'Yoinked', type: 'checkbox', default: false },
    yoink_api: { label: 'Yoinked API TOKEN', type: 'text', default: '' },
    yus: { label: 'Yu Scene', type: 'checkbox', default: false },
    yus_api: { label: 'Yu Scene API TOKEN', type: 'text', default: '' }
  };

  const SENSITIVE_CONFIG_FIELDS = new Set(
    Object.keys(fields).filter((field) => /(^|_)(api|key|token|pass|rss|user)(_|$)/i.test(field))
  );
  SENSITIVE_CONFIG_FIELDS.add('qui_base_url');
  const TRACKER_CONFIG_FIELDS = new Set([
    'ptp',
    'ptp_api_user',
    'ptp_api_key',
    'bhd',
    'bhd_api',
    'bhd_rss',
    'hdb',
    'hdb_user',
    'hdb_pass',
    'a4k',
    'a4k_api',
    'aither',
    'aither_api',
    'blu',
    'blu_api',
    'cbr',
    'cbr_api',
    'dp',
    'dp_api',
    'dt',
    'dt_api',
    'friki',
    'friki_api',
    'hhd',
    'hhd_api',
    'huno',
    'huno_api',
    'ihd',
    'ihd_api',
    'itt',
    'itt_api',
    'lcd',
    'lcd_api',
    'ldu',
    'ldu_api',
    'lst',
    'lst_api',
    'lt',
    'lt_api',
    'lume',
    'lume_api',
    'oe',
    'oe_api',
    'otw',
    'otw_api',
    'pt',
    'pt_api',
    'ptt',
    'ptt_api',
    'ras',
    'ras_api',
    'rf',
    'rf_api',
    'rmc',
    'rmc_api',
    'sam',
    'sam_api',
    'shri',
    'shri_api',
    'sp',
    'sp_api',
    'stc',
    'stc_api',
    'tik',
    'tik_api',
    'tlz',
    'tlz_api',
    'tos',
    'tos_api',
    'ttr',
    'ttr_api',
    'ulcx',
    'ulcx_api',
    'utp',
    'utp_api',
    'yoink',
    'yoink_api',
    'yus',
    'yus_api'
  ]);
  const ANT_qui_CONFIG_FIELDS = new Set(['qui_ant_categories', 'qui_ant_tags', 'qui_skip_recheck']);
  const ADOPTION_FILTER_CONFIG_FIELDS = new Set([
    'scan_page_count',
    'scan_delay_seconds',
    'minimum_bounty_per_gib',
    'minimum_bounty',
    'maximum_size_gib',
    'excluded_formats',
    'exclusion_groups',
    'hide_below_bounty_threshold',
    'hide_below_minimum_bounty',
    'hide_above_maximum_size',
    'hide_excluded_formats',
    'combine_media_filters',
    'hide_ignored_rows',
    'hide_grabbed_rows',
    'show_only_grabbed_rows',
    'default_sort_field',
    'default_sort_direction',
    'skip_trumpable',
    'seeding_filter',
    'clear_adoption_actions',
    'clear_filtered_scan'
  ]);
  const ADOPTION_FILTER_STATE_FIELDS = {
    minimumBountyPerGib: 'minimum_bounty_per_gib',
    minimumBounty: 'minimum_bounty',
    maximumSizeGib: 'maximum_size_gib',
    excludedFormats: 'excluded_formats',
    exclusionGroups: 'exclusion_groups',
    hideBelowBountyThreshold: 'hide_below_bounty_threshold',
    hideBelowMinimumBounty: 'hide_below_minimum_bounty',
    hideAboveMaximumSize: 'hide_above_maximum_size',
    hideExcludedFormats: 'hide_excluded_formats',
    combineMediaFilters: 'combine_media_filters',
    hideIgnoredRows: 'hide_ignored_rows',
    hideGrabbedRows: 'hide_grabbed_rows',
    showOnlyGrabbedRows: 'show_only_grabbed_rows',
    sortField: 'default_sort_field',
    sortDirection: 'default_sort_direction',
    skipTrumpable: 'skip_trumpable',
    seedingFilter: 'seeding_filter'
  };
  const CONFIG_HELP_TEXT = {
    scan_page_count: `Fetch this many ANT adoption pages, starting at page 1. The hard limit is ${MAX_SCAN_PAGES}.`,
    scan_delay_seconds: 'Pause between adoption-page requests to reduce load on ANT.',
    minimum_bounty_per_gib: 'Rows at or below this bounty/GiB value can be hidden.',
    minimum_bounty: 'Minimum total bounty. Zero disables this threshold.',
    maximum_size_gib:
      'Maximum torrent size in GiB, not bytes. Rows larger than this can be hidden; zero disables the limit.',
    excluded_formats:
      'Each category can ignore selected values or show only selected values. Empty categories are inactive. Enable Apply media filters to hide nonmatching rows. Values match row metadata, including shared values such as Other.',
    hide_below_bounty_threshold: 'Default state for the minimum bounty/GiB filter.',
    hide_below_minimum_bounty: 'Default state for the minimum total-bounty filter.',
    hide_above_maximum_size: 'Default state for the maximum-size filter.',
    hide_excluded_formats: 'Apply the configured media filters by default.',
    combine_media_filters:
      'Combine each mode separately: exclude only when every active Ignore category matches; require every Only show category to match. Empty categories are inactive.',
    hide_ignored_rows: 'Hide rows marked Ignored by default.',
    hide_grabbed_rows: 'Hide rows marked Grabbed by default.',
    show_only_grabbed_rows:
      'Show only Grabbed rows by default, overriding every other row filter. This takes precedence over Hide Grabbed.',
    default_sort_field: 'Choose the field used to order a filtered scan when it opens.',
    default_sort_direction:
      'Choose the initial direction. Scan order always uses the original scanned order.',
    seeding_filter:
      'Choose whether the filtered view starts with all, seeding, or non-seeding rows.',
    clear_adoption_actions:
      'Deletes every per-torrent Grabbed/Ignored/Broken marker for this script.',
    clear_filtered_scan: 'Deletes the saved multi-page result used by Open last scan.',
    skip_trumpable: 'Ignore ANT rows flagged as Trumpable before spending qui or tracker requests.',
    row_delay_seconds:
      'Pause between processed ANT rows to avoid hammering tracker APIs. Minimum 30 seconds.',
    row_limit: 'Limit how many uncached eligible rows one button press processes.',
    use_cache:
      'Store ANT metadata, tracker results, qui results, and row completion state locally.',
    load_cache_status_on_page_load:
      'On page load, restore cached processing details for every row without repeating tracker or qui searches. Grabbed, Ignored, and Broken rows are always restored.',
    clean_site_lookup_cache: 'Clears tracker/qui lookup results and row-complete markers.',
    clean_ant_cache: 'Clears cached ANT detail-page metadata and legacy filename cache.',
    debug_logging:
      'Prints capped request, cache, qui, and matching details. Lifecycle timings are always logged separately.',
    tracker_scope: 'Restrict this run to one tracker, or use every enabled tracker.',
    refresh_tracker_cache:
      'Re-query the current tracker scope even when cached results already exist.',
    qui_base_url: 'Base qui/proxy endpoint used for search and add requests.',
    qui_token: 'qui proxy token. Saved values are hidden when the settings panel opens.',
    qui_save_path: 'Default save path used for site torrents and as a fallback for ANT torrents.',
    qui_categories: 'Categories applied when adding other-site torrents to qui.',
    qui_tags: 'Tags applied when adding other-site torrents to qui.',
    qui_instance_id: 'Optional qui instance id when your proxy targets multiple clients.',
    qui_limit: 'Maximum qui search results to inspect during filename and monitor lookups.',
    qui_ant_categories:
      'Categories applied when adding ANT torrents. Falls back to site qui categories when empty.',
    qui_ant_tags: 'Tags applied when adding ANT torrents. Falls back to site qui tags when empty.',
    qui_skip_recheck: 'Only applies when adding ANT torrents, not other-site torrents.',
    qui_cross_seed_followup_delay_seconds:
      'In automatic-adoption mode, wait this long before adding/checking the ANT torrent.',
    qui_auto_add_site_torrent:
      'Automatically add the highest-seeded matching site torrent after row processing.',
    qui_auto_add_min_seeders: 'Minimum seeder count required before auto-adding a site torrent.',
    qui_auto_ignore_ungrabbed:
      'Only with auto-add enabled: mark a row Ignored when all tracker lookups succeed but find no eligible torrent. Lookup or qui submission failures remain retryable.',
    qui_auto_trigger_adoption:
      'Disabled by default. Disabled opens completed torrents immediately for manual handling with no further qui polling. Enabled waits the positive qui cross-seed follow-up delay plus 10 seconds, or 5 seconds when it is zero, processes one ready page at a time, polls for 60 seconds, and enforces a two-minute handling cap.'
  };
  const TRACKER_CREDENTIAL_FIELDS = {
    ptp: ['ptp_api_user', 'ptp_api_key'],
    bhd: ['bhd_api', 'bhd_rss'],
    hdb: ['hdb_user', 'hdb_pass'],
    a4k: ['a4k_api'],
    aither: ['aither_api'],
    blu: ['blu_api'],
    cbr: ['cbr_api'],
    dp: ['dp_api'],
    dt: ['dt_api'],
    friki: ['friki_api'],
    hhd: ['hhd_api'],
    huno: ['huno_api'],
    ihd: ['ihd_api'],
    itt: ['itt_api'],
    lcd: ['lcd_api'],
    ldu: ['ldu_api'],
    lst: ['lst_api'],
    lt: ['lt_api'],
    lume: ['lume_api'],
    oe: ['oe_api'],
    otw: ['otw_api'],
    pt: ['pt_api'],
    ptt: ['ptt_api'],
    ras: ['ras_api'],
    rf: ['rf_api'],
    rmc: ['rmc_api'],
    sam: ['sam_api'],
    shri: ['shri_api'],
    sp: ['sp_api'],
    stc: ['stc_api'],
    tik: ['tik_api'],
    tlz: ['tlz_api'],
    tos: ['tos_api'],
    ttr: ['ttr_api'],
    ulcx: ['ulcx_api'],
    utp: ['utp_api'],
    yoink: ['yoink_api'],
    yus: ['yus_api']
  };
  const SECRET_MASK_VALUE = '[saved value hidden]';

  function styleSettingsFrame(frame) {
    if (!frame?.style) return;
    const { style } = frame;
    style.width = '1280px';
    style.maxWidth = '94vw';
    style.height = '82vh';
    style.maxHeight = '88vh';
    style.inset = '';
    style.top = '6vh';
    style.right = '6vw';
    style.border = '1px solid #555';
    style.borderRadius = '6px';
    style.boxShadow = '0 18px 60px rgba(0, 0, 0, 0.45)';
  }

  function createSettingsColumn(doc, className, title) {
    const column = doc.createElement('div');
    column.className = `ant-config-column ${className}`;

    const heading = doc.createElement('div');
    heading.className = 'ant-config-column-heading';
    heading.textContent = title;
    column.appendChild(heading);
    return column;
  }

  function arrangeSettingsPanel(doc) {
    const root = doc?.querySelector('#ANTAdoptionFilenameCrossSeedConfig');
    if (!root || root.querySelector('.ant-config-columns')) return;

    const buttons = doc.querySelector('#ANTAdoptionFilenameCrossSeedConfig_buttons_holder');
    const columns = doc.createElement('div');
    columns.className = 'ant-config-columns';
    const mainColumn = createSettingsColumn(doc, 'ant-config-main-column', 'General');
    const filterColumn = createSettingsColumn(
      doc,
      'ant-config-filter-column',
      'Adoption scanning and filters'
    );
    const quiColumn = createSettingsColumn(doc, 'ant-config-qui-column', 'Base qui settings');
    const antquiColumn = createSettingsColumn(doc, 'ant-config-ant-qui-column', 'ANT qui');
    const trackerColumn = createSettingsColumn(doc, 'ant-config-tracker-column', 'Trackers');
    columns.append(filterColumn, mainColumn, trackerColumn);

    if (buttons?.parentNode === root) {
      buttons.before(columns);
    } else {
      root.appendChild(columns);
    }

    for (const field of Object.keys(fields)) {
      const wrapper = GM_config.fields[field]?.wrapper;
      if (!wrapper) continue;
      wrapper.dataset.configField = field;
      wrapper.classList.toggle('ant-config-checkbox-field', fields[field]?.type === 'checkbox');
      if (TRACKER_CONFIG_FIELDS.has(field)) {
        trackerColumn.appendChild(wrapper);
      } else if (ADOPTION_FILTER_CONFIG_FIELDS.has(field)) {
        filterColumn.appendChild(wrapper);
      } else if (ANT_qui_CONFIG_FIELDS.has(field)) {
        antquiColumn.appendChild(wrapper);
      } else if (field.startsWith('qui_')) {
        quiColumn.appendChild(wrapper);
      } else {
        mainColumn.appendChild(wrapper);
      }
    }
    mainColumn.append(quiColumn, antquiColumn);
  }

  function addSettingsHelperText() {
    for (const [field, text] of Object.entries(CONFIG_HELP_TEXT)) {
      const wrapper = GM_config.fields[field]?.wrapper;
      if (!wrapper || wrapper.querySelector('.ant-config-helper')) continue;

      const helper = document.createElement('div');
      helper.className = 'ant-config-helper';
      helper.textContent = text;
      wrapper.appendChild(helper);
    }
  }

  function syncTrackerCredentialVisibility() {
    for (const [trackerField, credentialFields] of Object.entries(TRACKER_CREDENTIAL_FIELDS)) {
      const trackerNode = GM_config.fields[trackerField]?.node;
      const trackerWrapper = GM_config.fields[trackerField]?.wrapper;
      const enabled = Boolean(trackerNode?.checked);
      let separatorWrapper = trackerWrapper;
      trackerWrapper?.classList.remove('ant-config-tracker-separator');
      credentialFields.forEach((field) => {
        const wrapper = GM_config.fields[field]?.wrapper;
        if (!wrapper) return;
        wrapper.classList.remove('ant-config-tracker-separator');
        wrapper.hidden = !enabled;
        if (enabled) separatorWrapper = wrapper;
      });
      separatorWrapper?.classList.add('ant-config-tracker-separator');
    }
  }

  function setupTrackerCredentialVisibility() {
    for (const trackerField of Object.keys(TRACKER_CREDENTIAL_FIELDS)) {
      const trackerNode = GM_config.fields[trackerField]?.node;
      if (!trackerNode || trackerNode.dataset.antVisibilityBound === '1') continue;
      trackerNode.dataset.antVisibilityBound = '1';
      trackerNode.addEventListener('change', syncTrackerCredentialVisibility);
    }
    syncTrackerCredentialVisibility();
  }

  function setupRowDelayMinimum() {
    const node = GM_config.fields.row_delay_seconds?.node;
    if (!node) return;

    node.min = String(ROW_DELAY_MIN_SECONDS);
    if (node.dataset.antMinimumBound === '1') return;
    node.dataset.antMinimumBound = '1';

    const clampValue = () => {
      const value = Number.parseInt(node.value, 10);
      if (Number.isFinite(value) && value < ROW_DELAY_MIN_SECONDS) {
        node.value = String(ROW_DELAY_MIN_SECONDS);
      }
    };

    clampValue();
    node.addEventListener('blur', clampValue);
    node.addEventListener('change', clampValue);
  }

  function getSensitiveConfigNode(field) {
    return GM_config.fields[field]?.node || null;
  }

  function isMaskedSensitiveNode(node) {
    return node?.dataset?.antSecretMasked === '1' && node.dataset.antSecretEdited !== '1';
  }

  function shouldMaskSensitiveConfigValue(field, value) {
    return field !== 'qui_base_url' || /\/(?:api\/)?proxy\/[^/?#]+/i.test(value);
  }

  function restoreMaskedSensitiveFieldsForSave() {
    for (const field of SENSITIVE_CONFIG_FIELDS) {
      const node = getSensitiveConfigNode(field);
      if (!isMaskedSensitiveNode(node)) continue;
      node.value = String(GM_config.get(field) || '');
      node.dataset.antSecretMasked = '0';
    }
  }

  function maskSensitiveConfigFields(doc) {
    for (const field of SENSITIVE_CONFIG_FIELDS) {
      const node = getSensitiveConfigNode(field);
      const saved = String(GM_config.get(field) || '');
      if (!node || !saved) continue;
      if (!shouldMaskSensitiveConfigValue(field, saved)) {
        node.value = saved;
        node.type = 'text';
        node.dataset.antSecretMasked = '0';
        node.dataset.antSecretEdited = '0';
        node.autocomplete = '';
        node.title = '';
        continue;
      }

      node.value = SECRET_MASK_VALUE;
      node.type = 'password';
      node.dataset.antSecretMasked = '1';
      node.dataset.antSecretEdited = '0';
      node.autocomplete = 'off';
      node.title = 'Saved value hidden. Focus and type a replacement value to change it.';

      node.addEventListener(
        'focus',
        () => {
          if (!isMaskedSensitiveNode(node)) return;
          node.value = '';
        },
        { once: true }
      );
      node.addEventListener('input', () => {
        node.dataset.antSecretMasked = '0';
        node.dataset.antSecretEdited = '1';
      });
    }

    const saveButton =
      doc?.querySelector('#ANTAdoptionFilenameCrossSeedConfig_saveBtn') ||
      doc?.querySelector('input[type="submit"], button[type="submit"]');
    saveButton?.addEventListener('click', restoreMaskedSensitiveFieldsForSave, true);
  }

  GM_config.init({
    id: 'ANTAdoptionFilenameCrossSeedConfig',
    title: 'ANT adoption finder plus',
    fields,
    types: {
      exclusionGroups: {
        toNode() {
          const wrapper = document.createElement('div');
          wrapper.className = 'config_var';
          wrapper.id = `${this.configId}_${this.id}_var`;
          this.node = createExclusionGroupsControl(document, this.value);
          wrapper.appendChild(this.node);
          return wrapper;
        },
        toValue() {
          return this.node
            ? readExclusionGroupsControl(this.node)
            : normalizeExclusionGroups(this.value);
        },
        reset() {
          if (!this.node) return;
          const replacement = createExclusionGroupsControl(document, this.default);
          this.node.replaceWith(replacement);
          this.node = replacement;
        }
      },
      exclusions: {
        toNode() {
          const wrapper = document.createElement('div');
          wrapper.className = 'config_var';
          wrapper.id = `${this.configId}_${this.id}_var`;
          this.node = createMediaFilterControl(document, this.value);
          wrapper.appendChild(this.node);
          return wrapper;
        },
        toValue() {
          return this.node ? readMediaFilterControl(this.node) : normalizeMediaFilters(this.value);
        },
        reset() {
          if (!this.node) return;
          const replacement = createMediaFilterControl(document, this.default);
          this.node.replaceWith(replacement);
          this.node = replacement;
        }
      }
    },
    css: `
      ${EXCLUSION_CONTROL_CSS}
      #ANTAdoptionFilenameCrossSeedConfig {
        background: #333;
        color: #f5f5f5;
        margin: 0;
        padding: 22px 24px;
        font-family: Arial, Helvetica, sans-serif;
      }

      #ANTAdoptionFilenameCrossSeedConfig .config_header {
        color: #f2db83;
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 8px;
        padding-bottom: 0;
        text-align: left;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-columns {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-column {
        background: #383838;
        border: 1px solid #555;
        border-radius: 6px;
        min-width: 0;
        padding: 12px;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-main-column > .ant-config-column {
        margin-top: 12px;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-column-heading {
        color: #f2db83;
        font-size: 15px;
        font-weight: 700;
        margin: 0 0 8px;
      }

      #ANTAdoptionFilenameCrossSeedConfig .config_var {
        align-items: start;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        display: grid;
        gap: 5px;
        grid-template-columns: minmax(0, 1fr);
        margin: 0;
        padding: 6px 0;
        text-align: left;
      }

      #ANTAdoptionFilenameCrossSeedConfig .config_var[hidden] {
        display: none !important;
      }

      #ANTAdoptionFilenameCrossSeedConfig .config_var.ant-config-checkbox-field {
        align-items: center;
        column-gap: 8px;
        grid-template-columns: auto minmax(0, 1fr);
        row-gap: 3px;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-checkbox-field input[type="checkbox"] {
        grid-column: 1;
        grid-row: 1;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-checkbox-field .field_label {
        grid-column: 2;
        grid-row: 1;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-checkbox-field .ant-config-helper {
        grid-column: 1 / -1;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-tracker-column .config_var {
        border-bottom: 0;
      }

      #ANTAdoptionFilenameCrossSeedConfig
        .ant-config-tracker-column
        .config_var.ant-config-tracker-separator {
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        margin-bottom: 2px;
        padding-bottom: 8px;
      }

      #ANTAdoptionFilenameCrossSeedConfig .field_label {
        color: #eee;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.25;
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-helper {
        color: #b8b8b8;
        font-size: 11px;
        line-height: 1.3;
        margin-top: -1px;
      }

      #ANTAdoptionFilenameCrossSeedConfig input[type="text"],
      #ANTAdoptionFilenameCrossSeedConfig input[type="number"],
      #ANTAdoptionFilenameCrossSeedConfig input[type="unsigned int"],
      #ANTAdoptionFilenameCrossSeedConfig select {
        background: #444;
        border: 1px solid #666;
        border-radius: 4px;
        box-sizing: border-box;
        color: #fff;
        font-size: 12px;
        min-height: 28px;
        padding: 4px 7px;
        width: 100%;
      }

      #ANTAdoptionFilenameCrossSeedConfig input[type="checkbox"] {
        cursor: pointer;
        height: 16px;
        width: 16px;
      }

      #ANTAdoptionFilenameCrossSeedConfig button,
      #ANTAdoptionFilenameCrossSeedConfig input[type="button"],
      #ANTAdoptionFilenameCrossSeedConfig input[type="submit"] {
        background: #444;
        border: 1px solid #666;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        padding: 7px 12px;
      }

      #ANTAdoptionFilenameCrossSeedConfig button:hover,
      #ANTAdoptionFilenameCrossSeedConfig input[type="button"]:hover,
      #ANTAdoptionFilenameCrossSeedConfig input[type="submit"]:hover {
        background: #555;
      }

      #ANTAdoptionFilenameCrossSeedConfig_saveBtn {
        background: #2f7d45 !important;
        border-color: #2f7d45 !important;
        font-weight: 700;
      }

      #ANTAdoptionFilenameCrossSeedConfig_closeBtn {
        background: #666 !important;
      }

      #ANTAdoptionFilenameCrossSeedConfig .reset {
        color: #f2db83;
      }

      #ANTAdoptionFilenameCrossSeedConfig_buttons_holder {
        border-top: 1px solid #555;
        margin-top: 18px;
        padding-top: 16px;
        text-align: center;
      }

      @media (max-width: 760px) {
        #ANTAdoptionFilenameCrossSeedConfig .ant-config-columns {
          grid-template-columns: 1fr;
        }
      }
    `,
    events: {
      open: function (doc) {
        styleSettingsFrame(this.frame);
        arrangeSettingsPanel(doc);
        addSettingsHelperText();
        for (const field in fields) {
          if (Object.hasOwn(fields, field) && fields[field].tooltip && GM_config.fields[field]) {
            const label = GM_config.fields[field].wrapper?.querySelector('label');
            if (label) label.title = fields[field].tooltip;
          }
        }
        maskSensitiveConfigFields(doc);
        setupRowDelayMinimum();
        setupTrackerCredentialVisibility();
      },
      save: function () {
        setTimeout(() => {
          maskSensitiveConfigFields(this.frame?.ownerDocument || document);
          refreshAdoptionViewFromSettings();
        }, 0);
      }
    }
  });
  normalizeMaximumSizeGiBSetting();
  normalizeMediaFilterSetting();

  GM_registerMenuCommand('ANT adoption finder plus settings', () => GM_config.open());

  const unit3dTrackers = [
    { key: 'a4k', site: 'A4K', baseUrl: 'https://aura4k.net' },
    { key: 'aither', site: 'Aither', baseUrl: 'https://aither.cc' },
    { key: 'blu', site: 'BLU', baseUrl: 'https://blutopia.cc' },
    { key: 'cbr', site: 'CBR', baseUrl: 'https://capybarabr.com' },
    { key: 'dp', site: 'DP', baseUrl: 'https://darkpeers.org' },
    {
      key: 'dt',
      site: 'DT',
      baseUrl: 'https://torrent.desi',
      searchPath: '/api/v1/torrents/filter'
    },
    { key: 'friki', site: 'FRIKI', baseUrl: 'https://frikibar.com' },
    { key: 'hhd', site: 'HHD', baseUrl: 'https://homiehelpdesk.net' },
    { key: 'huno', site: 'HUNO', baseUrl: 'https://hawke.uno' },
    { key: 'ihd', site: 'IHD', baseUrl: 'https://infinityhd.net' },
    { key: 'itt', site: 'ITT', baseUrl: 'https://itatorrents.xyz' },
    { key: 'lcd', site: 'LCD', baseUrl: 'https://locadora.cc' },
    { key: 'ldu', site: 'LDU', baseUrl: 'https://theldu.to' },
    { key: 'lst', site: 'LST', baseUrl: 'https://lst.gg' },
    { key: 'lt', site: 'LT', baseUrl: 'https://lat-team.com' },
    { key: 'lume', site: 'LUME', baseUrl: 'https://luminarr.me' },
    { key: 'oe', site: 'OE', baseUrl: 'https://onlyencodes.cc' },
    { key: 'otw', site: 'OTW', baseUrl: 'https://oldtoons.world' },
    { key: 'pt', site: 'PT', baseUrl: 'https://portugas.org' },
    { key: 'ptt', site: 'PTT', baseUrl: 'https://polishtorrent.top' },
    { key: 'ras', site: 'RAS', baseUrl: 'https://rastastugan.org' },
    { key: 'rf', site: 'RF', baseUrl: 'https://reelflix.cc' },
    { key: 'rmc', site: 'RMC', baseUrl: 'https://retro-movies.club' },
    { key: 'sam', site: 'SAM', baseUrl: 'https://samaritano.cc' },
    { key: 'shri', site: 'SHRI', baseUrl: 'https://shareisland.org' },
    { key: 'sp', site: 'SP', baseUrl: 'https://seedpool.org' },
    { key: 'stc', site: 'STC', baseUrl: 'https://skipthecommercials.xyz' },
    { key: 'tik', site: 'TIK', baseUrl: 'https://cinematik.net' },
    { key: 'tlz', site: 'TLZ', baseUrl: 'https://tlzdigital.com' },
    { key: 'tos', site: 'TOS', baseUrl: 'https://theoldschool.cc' },
    { key: 'ttr', site: 'TTR', baseUrl: 'https://torrenteros.org' },
    { key: 'ulcx', site: 'ULCX', baseUrl: 'https://upload.cx' },
    { key: 'utp', site: 'UTP', baseUrl: 'https://utp.to' },
    { key: 'yoink', site: 'YOINK', baseUrl: 'https://yoinked.org' },
    { key: 'yus', site: 'YUS', baseUrl: 'https://yu-scene.net' }
  ];

  const siteIcons = {
    PTP: 'https://passthepopcorn.me/favicon.ico',
    BHD: 'https://beyond-hd.me/favicon.ico',
    HDB: 'https://hdbits.org/favicon.ico',
    A4K: 'https://aura4k.net/favicon.ico',
    Aither: 'https://aither.cc/favicon.ico',
    BLU: 'https://blutopia.cc/favicon.ico',
    CBR: 'https://capybarabr.com/favicon.ico',
    DP: 'https://darkpeers.org/favicon.ico',
    DT: 'https://torrent.desi/favicon.ico',
    FRIKI: 'https://frikibar.com/favicon.ico',
    HHD: 'https://homiehelpdesk.net/favicon.ico',
    HUNO: 'https://hawke.uno/favicon.ico',
    IHD: 'https://infinityhd.net/favicon.ico',
    ITT: 'https://itatorrents.xyz/favicon.ico',
    LCD: 'https://locadora.cc/favicon.ico',
    LDU: 'https://theldu.to/favicon.ico',
    LST: 'https://lst.gg/favicon.ico',
    LT: 'https://lat-team.com/favicon.ico',
    LUME: 'https://luminarr.me/favicon.ico',
    OE: 'https://onlyencodes.cc/favicon.ico',
    OTW: 'https://oldtoons.world/favicon.ico',
    PT: 'https://portugas.org/favicon.ico',
    PTT: 'https://polishtorrent.top/favicon.ico',
    RAS: 'https://rastastugan.org/favicon.ico',
    RF: 'https://reelflix.cc/favicon.ico',
    RMC: 'https://retro-movies.club/favicon.ico',
    SAM: 'https://samaritano.cc/favicon.ico',
    SHRI: 'https://shareisland.org/favicon.ico',
    SP: 'https://seedpool.org/favicon.ico',
    STC: 'https://skipthecommercials.xyz/favicon.ico',
    TIK: 'https://cinematik.net/favicon.ico',
    TLZ: 'https://tlzdigital.com/favicon.ico',
    TOS: 'https://theoldschool.cc/favicon.ico',
    TTR: 'https://torrenteros.org/favicon.ico',
    ULCX: 'https://upload.cx/favicon.ico',
    UTP: 'https://utp.to/favicon.ico',
    YOINK: 'https://yoinked.org/favicon.ico',
    YUS: 'https://yu-scene.net/favicon.ico'
  };

  const quiAddJobs = new Map();
  const adoptionReadyFlowStops = new Map();
  let quiAddPollTimer = null;
  let quiAddPollInFlight = false;
  let adoptionScanRunning = false;
  let rowProcessingRunning = false;
  let filteredScanCachedRaw;
  let filteredScanCachedValue = null;
  let filteredScanLegacyCacheChecked = false;
  let deferredFilteredScanRows = [];
  let filteredScanRowData = new WeakMap();
  let filteredScanActions = new Map();
  let cachedRowStatusRestoreQueue = Promise.resolve();
  let cachedRowStatusRestoreRequested = false;
  let cachedRowStatusRestoreRunning = false;
  let rowProcessingCancelRequested = false;
  const qui_ADD_POLL_INTERVAL_MS = 5000;
  const qui_ADD_MAX_POLL_INTERVAL_MS = 60000;
  const qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS = 10000;
  const qui_PENDING_STATES = new Set(['checkingresumedata', 'queuedup']);
  const refreshedRowKeys = new Set();
  const iconDataUrlPromises = new Map();
  const debugLogCounts = new Map();
  let lifecycleLogStartedAt = null;
  let lifecycleLastLogAt = null;
  let lifecycleLogSequence = 0;
  let adoptionFilterPresentationSequence = 0;
  const DEBUG_LOG_LIMIT_PER_MESSAGE = 10;
  const DEBUG_LOG_MAX_ARRAY_ITEMS = 12;
  const DEBUG_LOG_MAX_OBJECT_ENTRIES = 20;
  const DEBUG_LOG_MAX_STRING_CHARACTERS = 500;
  const DEBUG_LOG_MAX_DEPTH = 4;

  function cleanBaseUrl(value) {
    return String(value || '')
      .trim()
      .replace(/\/+$/, '');
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function sleepWithButtonCountdown(ms, button, progressText, shouldContinue = () => true) {
    const seconds = Math.ceil(ms / 1000);
    for (let remaining = seconds; remaining > 0; remaining -= 1) {
      if (!shouldContinue()) return false;
      if (button) button.textContent = `Waiting ${remaining}s ${progressText}...`;
      await sleep(Math.min(1000, ms));
      ms -= 1000;
    }
    return shouldContinue();
  }

  async function retryRowAfterError(error, entry, index, total, trackers, refreshCache, button) {
    debugLog('row processing retry scheduled', { index, total, error });
    console.warn('ANT adoption row processing failed; retrying once:', error);
    setRowState(entry.row, `retrying after error: ${error.message || error}`, 'working');
    const shouldRetry = await sleepWithButtonCountdown(
      5000,
      button,
      `before retry (${index}/${total})`,
      () => !rowProcessingCancelRequested
    );
    if (!shouldRetry) return false;
    if (button) button.textContent = `Retrying ${index}/${total} eligible rows...`;
    await processRow(entry.row, index, total, trackers, entry, refreshCache);
    return true;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function splitCsv(value) {
    return String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function pushUniqueUrl(urls, url) {
    if (!url || urls.includes(url)) return;
    urls.push(url);
  }

  function sanitizeUrlToken(value) {
    return encodeURIComponent(String(value || '').trim());
  }

  function isDebugEnabled() {
    return Boolean(GM_config.get('debug_logging'));
  }

  function performanceNow() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  function elapsedMilliseconds(startedAt) {
    return Math.round((performanceNow() - startedAt) * 10) / 10;
  }

  function lifecycleLog(message, details = null) {
    const now = performanceNow();
    lifecycleLogStartedAt ??= now;
    lifecycleLastLogAt ??= now;
    lifecycleLogSequence += 1;
    const prefix = `[${SCRIPT_PREFIX}] ${message}`;
    console.info(prefix, {
      timestamp: new Date().toISOString(),
      lifecycleElapsedMs: Math.round((now - lifecycleLogStartedAt) * 10) / 10,
      sincePreviousLogMs: Math.round((now - lifecycleLastLogAt) * 10) / 10,
      sequence: lifecycleLogSequence,
      ...(details || {})
    });
    lifecycleLastLogAt = now;
  }

  function scheduleAdoptionFilterPresentationLog(startedAt, details) {
    if (typeof globalThis.requestAnimationFrame !== 'function') return;
    adoptionFilterPresentationSequence += 1;
    const updateId = adoptionFilterPresentationSequence;
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        lifecycleLog('adoption filter update presented', {
          durationMs: elapsedMilliseconds(startedAt),
          updateId,
          ...details
        });
      });
    });
  }

  function redactDebugUrl(value) {
    return String(value || '')
      .replace(/([?&](?:apikey|api_token|passkey|authkey|torrent_pass)=)[^&#]*/gi, '$1[redacted]')
      .replace(/(\/proxy\/)[^/?#]+/gi, '$1[redacted]')
      .replace(/(\/api\/proxy\/)[^/?#]+/gi, '$1[redacted]')
      .replace(/(\/api\/torrents\/)([^/?#]+)/gi, (match, prefix, segment) =>
        segment.toLowerCase() === 'filter' ? match : `${prefix}[redacted]`
      );
  }

  function truncateDebugString(value) {
    const text = redactDebugUrl(value);
    return text.length > DEBUG_LOG_MAX_STRING_CHARACTERS
      ? `${text.slice(0, DEBUG_LOG_MAX_STRING_CHARACTERS)}… [${text.length - DEBUG_LOG_MAX_STRING_CHARACTERS} characters omitted]`
      : text;
  }

  function sanitizeDebugValue(value, key = '', depth = 0) {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: truncateDebugString(value.message),
        stack: truncateDebugString(value.stack)
      };
    }
    if (value === null || value === undefined) return value;
    if (
      typeof value === 'string' &&
      /api(?:Key|Token)?|api_key|apikey|token|pass|rss|auth/i.test(key)
    ) {
      return value ? '[redacted]' : value;
    }
    if (typeof value === 'string') {
      return truncateDebugString(value);
    }
    if (Array.isArray(value)) {
      if (depth >= DEBUG_LOG_MAX_DEPTH) return `[array with ${value.length} items]`;
      const items = value
        .slice(0, DEBUG_LOG_MAX_ARRAY_ITEMS)
        .map((item) => sanitizeDebugValue(item, '', depth + 1));
      if (value.length > DEBUG_LOG_MAX_ARRAY_ITEMS) {
        items.push(`[${value.length - DEBUG_LOG_MAX_ARRAY_ITEMS} more items omitted]`);
      }
      return items;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (depth >= DEBUG_LOG_MAX_DEPTH) return `[object with ${entries.length} entries]`;
      const sanitized = Object.fromEntries(
        entries
          .slice(0, DEBUG_LOG_MAX_OBJECT_ENTRIES)
          .map(([entryKey, entryValue]) => [
            entryKey,
            sanitizeDebugValue(entryValue, entryKey, depth + 1)
          ])
      );
      if (entries.length > DEBUG_LOG_MAX_OBJECT_ENTRIES) {
        sanitized.__omittedEntries = entries.length - DEBUG_LOG_MAX_OBJECT_ENTRIES;
      }
      return sanitized;
    }
    return value;
  }

  function debugLog(message, details = null) {
    if (!isDebugEnabled()) return;
    const prefix = `[${SCRIPT_PREFIX}] ${message}`;
    const count = (debugLogCounts.get(message) || 0) + 1;
    debugLogCounts.set(message, count);
    if (count > DEBUG_LOG_LIMIT_PER_MESSAGE) return;
    if (count === DEBUG_LOG_LIMIT_PER_MESSAGE) {
      console.log(`${prefix} (further messages of this type will be suppressed)`);
      return;
    }
    if (details === null || details === undefined) {
      console.log(prefix);
      return;
    }
    console.log(prefix, sanitizeDebugValue(details));
  }

  function getquiConfig() {
    const limitValue = Number.parseInt(GM_config.get('qui_limit'), 10);
    return {
      baseUrl: cleanBaseUrl(GM_config.get('qui_base_url')),
      token: String(GM_config.get('qui_token') || '').trim(),
      savePath: String(GM_config.get('qui_save_path') || '').trim(),
      categories: String(GM_config.get('qui_categories') || '').trim(),
      tags: String(GM_config.get('qui_tags') || '').trim(),
      instanceId: String(GM_config.get('qui_instance_id') || '').trim(),
      limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 2000) : 300
    };
  }

  function getAntquiConfig(savePath = '') {
    const config = getquiConfig();
    config.savePath = String(savePath || config.savePath || '').trim();
    config.categories = String(
      GM_config.get('qui_ant_categories') || config.categories || ''
    ).trim();
    config.tags = String(GM_config.get('qui_ant_tags') || config.tags || '').trim();
    config.skipRecheck = Boolean(GM_config.get('qui_skip_recheck'));
    return config;
  }

  function getRowLimit() {
    const value = Number.parseInt(GM_config.get('row_limit'), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function getRowDelaySeconds() {
    const value = Number.parseInt(GM_config.get('row_delay_seconds'), 10);
    return Number.isFinite(value) ? Math.max(value, ROW_DELAY_MIN_SECONDS) : 60;
  }

  function getTrackerScope() {
    const value = String(GM_config.get('tracker_scope') || '').trim();
    return value && value !== 'All enabled trackers' ? value : '';
  }

  function shouldRefreshTrackerCache() {
    return Boolean(GM_config.get('refresh_tracker_cache'));
  }

  function getquiCrossSeedFollowupDelayMs() {
    const value = Number.parseInt(GM_config.get('qui_cross_seed_followup_delay_seconds'), 10);
    const seconds = Number.isFinite(value) && value >= 0 ? value : 60;
    return seconds * 1000;
  }

  function getquiAutoAddMinSeeders() {
    const value = Number.parseInt(GM_config.get('qui_auto_add_min_seeders'), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function getConfiguredNumber(field, fallback = 0) {
    const value = Number.parseFloat(String(GM_config.get(field) ?? '').replaceAll(',', ''));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function normalizeMaximumSizeGiBSetting() {
    const value = getConfiguredNumber('maximum_size_gib', 0);
    if (value < 1024 ** 3) return value;
    const gibibytes = value / 1024 ** 3;
    GM_config.set('maximum_size_gib', gibibytes);
    GM_config.write();
    return gibibytes;
  }

  function getScanPageCount() {
    const value = Number.parseInt(GM_config.get('scan_page_count'), 10);
    return Math.min(MAX_SCAN_PAGES, Number.isFinite(value) && value > 0 ? value : 10);
  }

  function getMinimumBounty() {
    return getConfiguredNumber('minimum_bounty', 0);
  }

  function getBountyScanButtonText() {
    const minimumBounty = getMinimumBounty();
    return minimumBounty > 0 ? `Scan until bounty < ${minimumBounty}` : 'Scan until minimum bounty';
  }

  function getScanDelayMs() {
    const value = Number.parseInt(GM_config.get('scan_delay_seconds'), 10);
    return (Number.isFinite(value) && value >= 0 ? value : 3) * 1000;
  }

  function getDefaultAdoptionFilterState() {
    const seedingFilter = String(GM_config.get('seeding_filter') || 'All rows');
    const sortField = String(GM_config.get('default_sort_field') || 'Bounty / GiB');
    const sortDirection = String(GM_config.get('default_sort_direction') || 'Descending');
    return {
      minimumBountyPerGib: getConfiguredNumber('minimum_bounty_per_gib', 200000),
      minimumBounty: getMinimumBounty(),
      maximumSizeGib: getConfiguredNumber('maximum_size_gib', 0),
      excludedFormats: normalizeMediaFilters(GM_config.get('excluded_formats')),
      exclusionGroups: normalizeExclusionGroups(GM_config.get('exclusion_groups')),
      hideBelowBountyThreshold: Boolean(GM_config.get('hide_below_bounty_threshold')),
      hideBelowMinimumBounty: Boolean(GM_config.get('hide_below_minimum_bounty')),
      hideAboveMaximumSize: Boolean(GM_config.get('hide_above_maximum_size')),
      hideExcludedFormats: Boolean(GM_config.get('hide_excluded_formats')),
      combineMediaFilters: Boolean(GM_config.get('combine_media_filters')),
      hideIgnoredRows: Boolean(GM_config.get('hide_ignored_rows')),
      hideGrabbedRows: Boolean(GM_config.get('hide_grabbed_rows')),
      showOnlyGrabbedRows: Boolean(GM_config.get('show_only_grabbed_rows')),
      sortField: [
        'Bounty / GiB',
        'Bounty',
        'Size',
        'Torrent',
        'Listing Time',
        'Scan order'
      ].includes(sortField)
        ? sortField
        : 'Bounty / GiB',
      sortDirection: ['Descending', 'Ascending'].includes(sortDirection)
        ? sortDirection
        : 'Descending',
      skipTrumpable: Boolean(GM_config.get('skip_trumpable')),
      seedingFilter: ['All rows', 'Seeding only', 'Not seeding only'].includes(seedingFilter)
        ? seedingFilter
        : 'All rows'
    };
  }

  let adoptionFilterState = null;

  function persistAdoptionFilterSettings(stateKeys) {
    for (const stateKey of stateKeys) {
      const field = ADOPTION_FILTER_STATE_FIELDS[stateKey];
      if (field) GM_config.set(field, adoptionFilterState[stateKey]);
    }
    GM_config.write();
  }

  function saveAdoptionFilterSettings() {
    persistAdoptionFilterSettings(Object.keys(ADOPTION_FILTER_STATE_FIELDS));
  }

  function parseSizeToGiB(text) {
    if (!text) return null;
    const match = String(text)
      .replaceAll('\u00a0', ' ')
      .trim()
      .match(/([\d.,]+)\s*([KMGTP]?i?B)/i);
    if (!match) return null;

    const value = Number.parseFloat(match[1].replaceAll(',', ''));
    const unit = match[2].toUpperCase();
    const multipliers = {
      B: 1 / 1024 ** 3,
      KB: 1 / 1024 ** 2,
      KIB: 1 / 1024 ** 2,
      MB: 1 / 1024,
      MIB: 1 / 1024,
      GB: 1,
      GIB: 1,
      TB: 1024,
      TIB: 1024,
      PB: 1024 ** 2,
      PIB: 1024 ** 2
    };
    return Number.isFinite(value) && multipliers[unit] !== undefined
      ? value * multipliers[unit]
      : null;
  }

  function parseBounty(text) {
    const value = Number.parseFloat(
      String(text || '')
        .replaceAll('\u00a0', ' ')
        .replaceAll(',', '')
    );
    return Number.isFinite(value) ? value : null;
  }

  function getTableHeaderRow(table) {
    return table?.querySelector('tr.colhead_dark, thead tr, tr') || null;
  }

  function findAdoptionColumnIndex(table, label) {
    const header = getTableHeaderRow(table);
    if (!header) return -1;
    return [...header.children].findIndex(
      (cell) =>
        !cell.classList.contains(BOUNTY_GIB_COLUMN_CLASS) &&
        !cell.classList.contains(ACTION_COLUMN_CLASS) &&
        cell.textContent.trim().toLowerCase().includes(label)
    );
  }

  function findAdoptionTable(root = document) {
    const row = root.querySelector?.(FILTERABLE_ROW_SELECTOR);
    if (row) return row.closest('table');
    return (
      [...(root.querySelectorAll?.('table') || [])].find((table) => {
        const text = getTableHeaderRow(table)?.textContent.toLowerCase() || '';
        return text.includes('size') && text.includes('bounty');
      }) || null
    );
  }

  function getAdoptionRowSizeGiB(row, table = row.closest('table')) {
    const index = findAdoptionColumnIndex(table, 'size');
    return index >= 0 && row.children[index]
      ? parseSizeToGiB(row.children[index].textContent)
      : null;
  }

  function getAdoptionRowBounty(row, table = row.closest('table')) {
    const index = findAdoptionColumnIndex(table, 'bounty');
    return index >= 0 && row.children[index] ? parseBounty(row.children[index].textContent) : null;
  }

  function getAdoptionRowMetadata(row) {
    const excludedSelector = `.${BOUNTY_GIB_COLUMN_CLASS}, .${ACTION_COLUMN_CLASS}, .ant-cross-seed-inline, .ant-cross-seed-qui, .ant-cross-seed-qui-monitor, a[data-title]`;
    const text = [];
    const collectText = (node) => {
      for (const child of node.childNodes || []) {
        if (child.nodeType === 3) {
          text.push(child.nodeValue || '');
        } else if (child.nodeType === 1 && !child.matches?.(excludedSelector)) {
          collectText(child);
        }
      }
    };
    collectText(row);
    return text.join('');
  }

  function normalizeMediaFilters(value) {
    return Object.fromEntries(
      Object.entries(EXCLUSION_OPTIONS).map(([name, options]) => {
        const group = value?.[name];
        return [
          name,
          {
            mode: group?.mode === 'only' ? 'only' : 'ignore',
            values: Array.isArray(group?.values)
              ? options.filter((option) => group.values.includes(option))
              : []
          }
        ];
      })
    );
  }

  function normalizeMediaFilterSetting() {
    const saved = GM_config.get('excluded_formats');
    const normalized = normalizeMediaFilters(saved);
    if (JSON.stringify(saved) === JSON.stringify(normalized)) return;
    GM_config.set('excluded_formats', normalized);
    GM_config.write();
  }

  function readMediaFilterControl(control) {
    return Object.fromEntries(
      [...control.children].map((group) => [
        group.dataset.mediaCategory,
        {
          mode: group.querySelector('select').value,
          values: [...group.querySelectorAll('input:checked')]
            .filter((input) => input.dataset.mediaValue === '1')
            .map((input) => input.value)
        }
      ])
    );
  }

  function createMediaFilterControl(doc, value, onChange, exclusionGroup = false) {
    const filters = normalizeMediaFilters(value);
    const control = doc.createElement('div');
    control.className = 'ant-media-filters';
    for (const [name, filter] of Object.entries(filters)) {
      const group = doc.createElement('details');
      group.className = 'ant-exclusion-select';
      group.dataset.mediaCategory = name;
      const summary = doc.createElement('summary');
      const options = doc.createElement('div');
      options.className = 'ant-exclusion-options';
      const mode = doc.createElement('select');
      mode.setAttribute('aria-label', `${name} filter mode`);
      for (const [value, text] of [
        ['ignore', 'Ignore selected'],
        ['only', 'Only show selected']
      ]) {
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = text;
        mode.appendChild(option);
      }
      mode.value = exclusionGroup ? 'ignore' : filter.mode;
      mode.hidden = exclusionGroup;
      const inputs = [];
      let ignoreAll;
      const update = () => {
        const count = inputs.filter((input) => input.checked).length;
        mode.disabled = count === 0;
        summary.textContent = count
          ? `${name}: ${exclusionGroup ? 'Match' : mode.value === 'only' ? 'Only show' : 'Ignore'} (${count})`
          : `${name}: Off`;
        if (ignoreAll) ignoreAll.checked = mode.value === 'ignore' && count === inputs.length;
      };
      const changed = () => {
        update();
        onChange?.(readMediaFilterControl(control));
      };
      if (name === 'Language') {
        const label = doc.createElement('label');
        ignoreAll = doc.createElement('input');
        ignoreAll.type = 'checkbox';
        const text = doc.createElement('span');
        text.textContent = exclusionGroup
          ? 'Match all listed languages'
          : 'Ignore all listed languages';
        ignoreAll.addEventListener('change', () => {
          for (const input of inputs) input.checked = ignoreAll.checked;
          mode.value = 'ignore';
          changed();
        });
        label.append(ignoreAll, text);
        options.appendChild(label);
      }
      options.appendChild(mode);
      for (const value of EXCLUSION_OPTIONS[name]) {
        const label = doc.createElement('label');
        const input = doc.createElement('input');
        input.type = 'checkbox';
        input.dataset.mediaValue = '1';
        input.value = value;
        input.checked = filter.values.includes(value);
        input.addEventListener('change', changed);
        inputs.push(input);
        const text = doc.createElement('span');
        text.textContent = value;
        label.append(input, text);
        options.appendChild(label);
      }
      mode.addEventListener('change', changed);
      update();
      group.append(summary, options);
      control.appendChild(group);
    }
    return control;
  }

  function normalizeExclusionGroups(value) {
    return (Array.isArray(value) ? value : []).map((group) =>
      Object.fromEntries(
        Object.entries(normalizeMediaFilters(group)).map(([name, filter]) => [
          name,
          { mode: 'ignore', values: filter.values }
        ])
      )
    );
  }

  function readExclusionGroupsControl(control) {
    return normalizeExclusionGroups(
      [...control.querySelectorAll('.ant-exclusion-group')].map((group) =>
        readMediaFilterControl(group.querySelector('.ant-media-filters'))
      )
    );
  }

  function createExclusionGroupsControl(doc, value, onChange) {
    const control = doc.createElement('div');
    control.className = 'ant-exclusion-groups';
    const description = doc.createElement('p');
    description.textContent =
      'Exclusion groups: match ALL selected categories in ANY group. Empty groups are inactive. Existing category filters still apply. These groups are independent of Combine media filters.';
    const groups = doc.createElement('div');
    const changed = () => onChange?.(readExclusionGroupsControl(control));
    const addGroup = (value) => {
      const group = doc.createElement('fieldset');
      group.className = 'ant-exclusion-group';
      const legend = doc.createElement('legend');
      legend.textContent = 'Exclude when all selected categories match';
      const filters = createMediaFilterControl(doc, value, changed, true);
      const remove = doc.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove group';
      remove.addEventListener('click', () => {
        group.remove();
        changed();
      });
      group.append(legend, filters, remove);
      groups.appendChild(group);
    };
    const add = doc.createElement('button');
    add.type = 'button';
    add.textContent = 'Add exclusion group';
    add.addEventListener('click', () => {
      addGroup({});
      changed();
    });
    control.append(description, groups, add);
    for (const group of normalizeExclusionGroups(value)) addGroup(group);
    return control;
  }

  function buildMediaFilterMatchers(value, groups = []) {
    const filters = Object.values(normalizeMediaFilters(value))
      .filter((filter) => filter.values.length > 0)
      .map((filter) => ({ mode: filter.mode, regexes: buildExcludeRegexes(filter.values) }));
    for (const group of normalizeExclusionGroups(groups)) {
      const categories = Object.values(group).filter((filter) => filter.values.length > 0);
      if (categories.length)
        filters.push({
          mode: 'group',
          categories: categories.map((filter) => buildExcludeRegexes(filter.values))
        });
    }
    return filters;
  }

  function buildExcludeRegexes(patterns) {
    return patterns.map((pattern) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
      const leadingBoundary = /^\w/.test(pattern) ? '\\b' : '';
      const trailingBoundary = /\w$/.test(pattern) ? '\\b' : '';
      return new RegExp(`${leadingBoundary}${escaped}${trailingBoundary}`, 'i');
    });
  }

  function isAdoptionRowSeeding(row) {
    return Boolean(row.querySelector('.tl_seeding, strong.torrent_label.tl_seeding'));
  }

  function actionStorageKey(torrentId) {
    return `${ACTION_STORAGE_PREFIX}${torrentId}`;
  }

  function getTorrentAction(torrentId) {
    const value = String(GM_getValue(actionStorageKey(torrentId), '') || '');
    return ['grabbed', 'ignored', 'broken'].includes(value) ? value : '';
  }

  function setTorrentAction(torrentId, action) {
    if (['grabbed', 'ignored', 'broken'].includes(action)) {
      GM_setValue(actionStorageKey(torrentId), action);
      filteredScanActions.set(String(torrentId), action);
    } else {
      GM_deleteValue(actionStorageKey(torrentId));
      filteredScanActions.delete(String(torrentId));
    }
  }

  function clearAdoptionActions() {
    if (!confirm('Delete every Grabbed/Ignored/Broken action saved by ANT Adoption Finder Plus?'))
      return;
    const keys = GM_listValues().filter((key) => String(key).startsWith(ACTION_STORAGE_PREFIX));
    keys.forEach((key) => GM_deleteValue(key));
    GM_setValue(ACTION_RECOVERY_SUPPRESS_STORAGE_KEY, true);
    filteredScanActions.clear();
    document.querySelectorAll(FILTERABLE_ROW_SELECTOR).forEach((row) => {
      if (row.dataset.antAdoptionAction === 'broken') {
        setRowState(row, 'ready to retry metadata', '');
      }
      row.dataset.antAdoptionAction = '';
      const select = row.querySelector(`.${ACTION_COLUMN_CLASS} select`);
      if (select) select.value = '';
      const rescan = row.querySelector('.ant-cross-seed-rescan-metadata');
      if (rescan) rescan.hidden = true;
    });
    applyAdoptionFilters();
    alert(`Cleared ${keys.length} adoption action${keys.length === 1 ? '' : 's'}.`);
  }

  function clearFilteredScan() {
    if (!confirm('Delete the saved multi-page adoption scan?')) return;
    GM_deleteValue(FILTERED_SCAN_STORAGE_KEY);
    getIncompatibleFilteredScanStorageKeys().forEach((key) => GM_deleteValue(key));
    filteredScanCachedRaw = null;
    filteredScanCachedValue = null;
    deferredFilteredScanRows = [];
    filteredScanRowData = new WeakMap();
    filteredScanActions = new Map();
    updateOpenLastScanButton();
    alert('Saved adoption scan cleared.');
  }

  function getIncompatibleFilteredScanStorageKeys() {
    const keys = new Set(LEGACY_FILTERED_SCAN_STORAGE_KEYS);
    for (const key of GM_listValues()) {
      const value = String(key);
      if (
        value !== FILTERED_SCAN_STORAGE_KEY &&
        (value === FILTERED_SCAN_STORAGE_PREFIX ||
          value.startsWith(`${FILTERED_SCAN_STORAGE_PREFIX}-`))
      ) {
        keys.add(value);
      }
    }
    return keys;
  }

  function removeLegacyFilteredScanCache() {
    if (filteredScanLegacyCacheChecked) return;
    filteredScanLegacyCacheChecked = true;
    let removed = 0;
    for (const key of getIncompatibleFilteredScanStorageKeys()) {
      if (GM_getValue(key, null) === null) continue;
      GM_deleteValue(key);
      removed += 1;
    }
    if (removed > 0) {
      lifecycleLog('removed incompatible saved scan cache', {
        expectedVersion: FILTERED_SCAN_VERSION,
        removedEntries: removed
      });
    }
  }

  function isValidFilteredScan(scan) {
    const isNullableNumber = (value) =>
      value === null || (typeof value === 'number' && Number.isFinite(value));
    return Boolean(
      scan?.version === FILTERED_SCAN_VERSION &&
      Number.isInteger(scan.pageCount) &&
      scan.pageCount > 0 &&
      Array.isArray(scan.rows) &&
      Array.isArray(scan.rowData) &&
      scan.rowData.length === scan.rows.length &&
      scan.rows.every((html) => typeof html === 'string' && html.trim() !== '') &&
      scan.rowData.every(
        (data) =>
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          isNullableNumber(data.bounty) &&
          isNullableNumber(data.bountyPerGib) &&
          typeof data.metadata === 'string' &&
          Number.isInteger(data.originalIndex) &&
          data.originalIndex >= 0 &&
          typeof data.seeding === 'boolean' &&
          isNullableNumber(data.sizeGiB) &&
          typeof data.torrentId === 'string' &&
          /^\d+$/.test(data.torrentId) &&
          typeof data.trumpable === 'boolean' &&
          typeof data.zeroSeed === 'boolean'
      )
    );
  }

  function discardFilteredScanCache(reason, details = {}) {
    GM_deleteValue(FILTERED_SCAN_STORAGE_KEY);
    filteredScanCachedRaw = null;
    filteredScanCachedValue = null;
    lifecycleLog('removed incompatible saved scan cache', {
      expectedVersion: FILTERED_SCAN_VERSION,
      reason,
      ...details
    });
  }

  function loadFilteredScan() {
    removeLegacyFilteredScanCache();
    const raw = GM_getValue(FILTERED_SCAN_STORAGE_KEY, null);
    if (raw === filteredScanCachedRaw) return filteredScanCachedValue;
    if (!raw) {
      filteredScanCachedRaw = raw;
      filteredScanCachedValue = null;
      return null;
    }
    const startedAt = performanceNow();
    try {
      const scan = decodeCacheValue(raw);
      if (!isValidFilteredScan(scan)) {
        discardFilteredScanCache(
          scan?.version === FILTERED_SCAN_VERSION ? 'schema mismatch' : 'version mismatch',
          { foundVersion: scan?.version ?? null }
        );
        return null;
      }
      filteredScanCachedRaw = raw;
      filteredScanCachedValue = scan;
      lifecycleLog('saved scan decoded', {
        durationMs: elapsedMilliseconds(startedAt),
        encodedCharacters: typeof raw === 'string' ? raw.length : 0,
        rows: scan.rows.length,
        version: scan.version
      });
      return filteredScanCachedValue;
    } catch (error) {
      GM_deleteValue(FILTERED_SCAN_STORAGE_KEY);
      filteredScanCachedRaw = null;
      filteredScanCachedValue = null;
      console.warn(`[${SCRIPT_PREFIX}] removed unreadable saved scan cache`, error);
      return null;
    }
  }

  function saveFilteredScan(scan) {
    if (!isValidFilteredScan(scan)) {
      throw new TypeError(`Filtered adoption scans must use version ${FILTERED_SCAN_VERSION}.`);
    }
    const startedAt = performanceNow();
    const encoded = encodeCacheValue(scan);
    const previous = GM_getValue(FILTERED_SCAN_STORAGE_KEY, null);
    try {
      GM_setValue(FILTERED_SCAN_STORAGE_KEY, encoded);
      if (GM_getValue(FILTERED_SCAN_STORAGE_KEY, null) !== encoded) {
        throw new Error('The filtered adoption scan could not be verified after saving.');
      }
      filteredScanCachedRaw = encoded;
      filteredScanCachedValue = scan;
      lifecycleLog('saved scan persisted', {
        durationMs: elapsedMilliseconds(startedAt),
        encodedCharacters: encoded.length,
        rows: scan.rows.length,
        version: scan.version
      });
    } catch (error) {
      if (previous === null) {
        GM_deleteValue(FILTERED_SCAN_STORAGE_KEY);
      } else {
        GM_setValue(FILTERED_SCAN_STORAGE_KEY, previous);
      }
      filteredScanCachedRaw = undefined;
      filteredScanCachedValue = null;
      throw error;
    }
  }

  function isFilteredAdoptionView() {
    return new URL(location.href).searchParams.get(FILTERED_VIEW_PARAM) === '1';
  }

  function exitFilteredAdoptionView() {
    const url = new URL(location.href);
    url.searchParams.delete(FILTERED_VIEW_PARAM);
    history.replaceState(history.state, '', url);
    lifecycleLog('filtered page initialization aborted', {
      reason: 'saved scan unavailable or invalid'
    });
  }

  function isAdoptionListingView() {
    return new URL(location.href).searchParams.get('type') === 'adoption';
  }

  function isAdoptionReadyView() {
    return new URL(location.href).searchParams.get(ADOPTION_READY_PARAM) === '1';
  }

  function createAdoptionReadyMarker(job) {
    const torrentId = String(job?.torrentId || '');
    const groupId = String(job?.groupId || '');
    const filename = String(job?.filename || '').trim();
    if (!/^\d+$/.test(torrentId) || !/^\d+$/.test(groupId) || !filename) return '';
    const token = String(job?.adoptionReadyToken || '') || globalThis.crypto?.randomUUID?.();
    if (!token) return '';
    const createdAt = Date.now();
    GM_setValue(
      `${ADOPTION_READY_TOKEN_STORAGE_PREFIX}${token}`,
      JSON.stringify({
        version: 1,
        token,
        torrentId,
        groupId,
        filename,
        createdAt,
        expiresAt: createdAt + ADOPTION_READY_TOKEN_TTL_MS
      })
    );
    job.adoptionReadyToken = token;
    return token;
  }

  function readAdoptionReadyMarker(consumePending = false) {
    const url = new URL(location.href);
    const token = url.searchParams.get(ADOPTION_READY_TOKEN_PARAM) || '';
    const torrentId = url.searchParams.get('torrentid') || '';
    const groupId = url.searchParams.get('id') || '';
    if (!token || !/^\d+$/.test(torrentId) || !/^\d+$/.test(groupId)) {
      return { ok: true, marker: null };
    }
    const key = `${ADOPTION_READY_TOKEN_STORAGE_PREFIX}${token}`;
    let raw;
    try {
      raw = GM_getValue(key, null);
    } catch (error) {
      debugLog('auto qui adoption-ready marker read failed', { token, error });
      return { ok: false, marker: null };
    }
    if (!raw) return { ok: true, marker: null };
    let marker;
    try {
      marker = JSON.parse(raw);
    } catch (error) {
      debugLog('auto qui adoption-ready marker parse failed', { token, error });
      return { ok: true, marker: null };
    }
    const valid =
      marker?.version === 1 &&
      marker.token === token &&
      marker.torrentId === torrentId &&
      marker.groupId === groupId &&
      typeof marker.filename === 'string' &&
      marker.filename.trim() &&
      (marker.state === undefined ||
        (marker.state === 'adopted' && isAdoptionReadyDispatchConfirmed())) &&
      Number(marker.expiresAt) >= Date.now();
    if (!valid) {
      if (Number(marker?.expiresAt) < Date.now()) {
        try {
          GM_deleteValue(key);
        } catch (error) {
          debugLog('expired auto qui adoption-ready marker cleanup failed', { token, error });
        }
      }
      return { ok: true, marker: null };
    }
    if (marker.state === 'adopted' || !consumePending) return { ok: true, marker };
    try {
      GM_deleteValue(key);
    } catch (error) {
      debugLog('auto qui adoption-ready marker consumption failed', { token, error });
      return { ok: false, marker: null };
    }
    return { ok: true, marker };
  }

  function consumeAdoptionReadyMarker() {
    const read = readAdoptionReadyMarker(true);
    return read.ok ? read.marker : null;
  }

  function persistAdoptedReadyMarker(readyMarker) {
    const url = new URL(location.href);
    const token = String(readyMarker?.token || '');
    const torrentId = String(readyMarker?.torrentId || url.searchParams.get('torrentid') || '');
    const groupId = String(readyMarker?.groupId || url.searchParams.get('id') || '');
    const filename = String(readyMarker?.filename || '').trim();
    if (!token || !/^\d+$/.test(torrentId) || !/^\d+$/.test(groupId) || !filename) return false;

    const adoptedAt = Date.now();
    try {
      GM_setValue(
        `${ADOPTION_READY_TOKEN_STORAGE_PREFIX}${token}`,
        JSON.stringify({
          version: 1,
          token,
          torrentId,
          groupId,
          filename,
          state: 'adopted',
          adoptedAt,
          createdAt: Number(readyMarker?.createdAt) || adoptedAt,
          expiresAt: adoptedAt + ADOPTION_READY_TOKEN_TTL_MS
        })
      );
      return true;
    } catch (error) {
      debugLog('adopted marker persistence failed', { token, torrentId, groupId, error });
      return false;
    }
  }

  function deleteAdoptionReadyMarker(token, context) {
    if (!token) return false;
    try {
      GM_deleteValue(`${ADOPTION_READY_TOKEN_STORAGE_PREFIX}${token}`);
      return true;
    } catch (error) {
      debugLog(`${context} marker cleanup failed`, { token, error });
      return false;
    }
  }

  function rollbackAdoptedReadyMarker(readyMarker, context) {
    const token = String(readyMarker?.token || '');
    if (deleteAdoptionReadyMarker(token, context)) return true;
    try {
      GM_setValue(
        `${ADOPTION_READY_TOKEN_STORAGE_PREFIX}${token}`,
        JSON.stringify({
          version: 1,
          token,
          state: 'failed',
          expiresAt: Date.now() + ADOPTION_READY_TOKEN_TTL_MS
        })
      );
      return true;
    } catch (error) {
      debugLog(`${context} marker invalidation failed`, { token, error });
      return false;
    }
  }

  function clearAdoptionReadyUrlParams() {
    if (typeof globalThis.history?.replaceState !== 'function') return false;
    const url = new URL(location.href);
    url.searchParams.delete(ADOPTION_READY_PARAM);
    url.searchParams.delete(ADOPTION_READY_TOKEN_PARAM);
    url.searchParams.delete(ADOPTION_READY_DISPATCHED_PARAM);
    url.searchParams.delete('ant_adoption_source');
    try {
      globalThis.history.replaceState(globalThis.history.state, '', url.toString());
      return true;
    } catch (error) {
      debugLog('adoption-ready URL cleanup failed', { error });
      return false;
    }
  }

  function setAdoptionReadyDispatchConfirmed(confirmed) {
    if (typeof globalThis.history?.replaceState !== 'function') return false;
    const url = new URL(location.href);
    if (confirmed) {
      url.searchParams.set(ADOPTION_READY_DISPATCHED_PARAM, '1');
    } else {
      url.searchParams.delete(ADOPTION_READY_DISPATCHED_PARAM);
    }
    try {
      globalThis.history.replaceState(globalThis.history.state, '', url.toString());
      return true;
    } catch (error) {
      debugLog('adoption-ready dispatch URL update failed', { confirmed, error });
      return false;
    }
  }

  function isAdoptionReadyDispatchConfirmed() {
    return new URL(location.href).searchParams.get(ADOPTION_READY_DISPATCHED_PARAM) === '1';
  }

  function readAdoptionReadyFlowRecord() {
    try {
      const raw = GM_getValue(ADOPTION_READY_FLOW_STORAGE_KEY, null);
      if (!raw) return { ok: true, flow: null };
      const flow = JSON.parse(raw);
      const valid =
        flow?.version === 1 &&
        typeof flow.token === 'string' &&
        flow.token &&
        Number.isFinite(Number(flow.expiresAt)) &&
        (flow.handlingDeadlineAt === undefined || Number.isFinite(Number(flow.handlingDeadlineAt)));
      if (!valid) {
        debugLog('adoption-ready flow record is invalid');
        return { ok: false, flow: null };
      }
      return { ok: true, flow };
    } catch (error) {
      debugLog('adoption-ready flow read failed', { error });
      return { ok: false, flow: null };
    }
  }

  function getAdoptionReadyFlowDeadline(flow) {
    const explicitDeadline = Number(flow?.handlingDeadlineAt);
    if (Number.isFinite(explicitDeadline)) return explicitDeadline;
    const claimedAt = Number(flow?.claimedAt);
    if (Number.isFinite(claimedAt)) return claimedAt + ADOPTION_READY_HANDLING_TIMEOUT_MS;
    return Number(flow?.expiresAt);
  }

  function isAdoptionReadyFlowActive(flow, now = Date.now()) {
    return Number(flow?.expiresAt) > now && Number(getAdoptionReadyFlowDeadline(flow)) > now;
  }

  function getActiveAdoptionReadyFlow() {
    const result = readAdoptionReadyFlowRecord();
    if (!result.ok || !isAdoptionReadyFlowActive(result.flow)) return null;
    return result.flow;
  }

  function readAdoptionReadyFlowOwnership(token) {
    const read = readAdoptionReadyFlowRecord();
    if (!read.ok) return { ok: false, owns: false, flow: null };
    const flow = isAdoptionReadyFlowActive(read.flow) ? read.flow : null;
    return {
      ok: true,
      owns: Boolean(token) && flow?.token === token,
      flow
    };
  }

  function ownsAdoptionReadyFlow(token) {
    const ownership = readAdoptionReadyFlowOwnership(token);
    return ownership.ok && ownership.owns;
  }

  async function withAdoptionReadyFlowLock(callback) {
    const locks = globalThis.navigator?.locks;
    if (typeof locks?.request !== 'function') {
      debugLog('adoption-ready flow lock unavailable');
      return false;
    }
    try {
      return await locks.request(ADOPTION_READY_FLOW_LOCK_NAME, { mode: 'exclusive' }, callback);
    } catch (error) {
      debugLog('adoption-ready flow lock failed', { error });
      return false;
    }
  }

  async function claimAdoptionReadyFlow(job) {
    const token = String(job?.adoptionReadyToken || '');
    if (!token) return false;
    return withAdoptionReadyFlowLock(() => {
      const read = readAdoptionReadyFlowRecord();
      if (!read.ok) return false;
      const now = Date.now();
      const active = isAdoptionReadyFlowActive(read.flow, now) ? read.flow : null;
      if (active && active.token !== token) return false;
      if (
        read.flow?.token === token &&
        Number.isFinite(Number(read.flow.handlingDeadlineAt)) &&
        Number(read.flow.handlingDeadlineAt) <= now
      ) {
        return false;
      }
      const claimedAt = Number(active?.claimedAt) || now;
      const handlingDeadlineAt =
        Number(active?.handlingDeadlineAt) || claimedAt + ADOPTION_READY_HANDLING_TIMEOUT_MS;
      const flow = {
        version: 1,
        token,
        torrentId: String(job.torrentId || ''),
        filename: String(job.filename || ''),
        claimedAt,
        handlingDeadlineAt,
        expiresAt: Math.min(now + ADOPTION_READY_FLOW_LEASE_MS, handlingDeadlineAt)
      };
      try {
        GM_setValue(ADOPTION_READY_FLOW_STORAGE_KEY, JSON.stringify(flow));
      } catch (error) {
        debugLog('adoption-ready flow claim write failed', { token, error });
        return false;
      }
      const stored = readAdoptionReadyFlowRecord();
      return stored.ok && stored.flow?.token === token && isAdoptionReadyFlowActive(stored.flow);
    });
  }

  async function releaseAdoptionReadyFlow(token) {
    if (!token) return false;
    return withAdoptionReadyFlowLock(() => {
      const read = readAdoptionReadyFlowRecord();
      if (!read.ok) return false;
      if (!read.flow) return true;
      if (read.flow.token !== token) return false;
      try {
        GM_deleteValue(ADOPTION_READY_FLOW_STORAGE_KEY);
        return true;
      } catch (error) {
        debugLog('adoption-ready flow release failed', { token, error });
        return false;
      }
    });
  }

  async function releaseAdoptionReadyFlowWithRetry(token) {
    if (await releaseAdoptionReadyFlow(token)) return true;
    const read = readAdoptionReadyFlowRecord();
    if (!read.ok || (read.flow?.token === token && isAdoptionReadyFlowActive(read.flow))) {
      setTimeout(() => releaseAdoptionReadyFlowWithRetry(token), ADOPTION_READY_FLOW_RETRY_MS);
    }
    return false;
  }

  function addAdoptionReadyNotice() {
    if (!isAdoptionReadyView()) return null;
    const existing = document.querySelector('#ant-adoption-ready-notice');
    if (existing) return existing;
    const source = new URL(location.href).searchParams.get('ant_adoption_source');
    const notice = document.createElement('div');
    notice.id = 'ant-adoption-ready-notice';
    notice.dataset.state = 'ready';
    notice.textContent = source
      ? `READY FOR ADOPTION — the automatically grabbed ${source} torrent has completed in qui.`
      : 'READY FOR ADOPTION — the automatically grabbed matching torrent has completed in qui.';
    const target =
      document.querySelector('.thin > h2, #content > h2, h2') ||
      document.querySelector('.thin, #content, body');
    target?.parentNode?.insertBefore(notice, target.nextSibling);
    document.title = `READY FOR ADOPTION - ${document.title}`;
    return notice;
  }

  function isquiItemSeeding(item) {
    return qui_SEEDING_STATES.has(normalizeTorrentState(item?.state));
  }

  function isquiItemReadyForAdoption(item) {
    const progress = toPercent(item?.progress);
    return isquiItemSeeding(item) && progress !== null && progress >= 100;
  }

  function isMatchingSeedingAntquiItem(item, readyMarker) {
    return (
      Boolean(readyMarker?.filename) &&
      isAntquiItem(item) &&
      quiItemMatchesFilename(item, readyMarker.filename) &&
      isquiItemReadyForAdoption(item)
    );
  }

  async function findVerifiedAntquiItem(
    items,
    filename,
    predicate = () => true,
    shouldContinue = () => true
  ) {
    const config = getquiConfig();
    for (const item of items) {
      if (!shouldContinue()) return null;
      if (!isAntquiItem(item) || !item.hash || !predicate(item)) continue;
      try {
        const files = await queryquiFiles(config, item.hash, shouldContinue);
        if (!shouldContinue()) return null;
        const verified = { ...item, raw: { ...item.raw, files } };
        if (quiItemMatchesFilename(verified, filename)) return verified;
      } catch (error) {
        debugLog('qui ANT file verification failed', { hash: item.hash, error });
      }
    }
    return null;
  }

  function findVerifiedSeedingAntquiItem(items, readyMarker, shouldContinue) {
    return findVerifiedAntquiItem(
      items,
      readyMarker?.filename,
      isquiItemReadyForAdoption,
      shouldContinue
    );
  }

  function findAdoptionButton(torrentId) {
    const detailsRow = document.getElementById(`torrent_${torrentId}`);
    const adoptHandlerPattern = new RegExp(
      `^\\s*return\\s+adopt\\(\\s*(?:'${torrentId}'|"${torrentId}")\\s*\\)\\s*;?\\s*$`
    );
    return [...(detailsRow?.querySelectorAll('button') || [])].find((candidate) => {
      const handler = candidate.getAttribute('onclick') || '';
      return adoptHandlerPattern.test(handler);
    });
  }

  function watchAdoptionReadyPageHandling(
    token,
    handlingDeadlineAt = Date.now() + ADOPTION_READY_HANDLING_TIMEOUT_MS
  ) {
    if (!token) return;
    adoptionReadyFlowStops.get(token)?.();
    let stopped = false;
    const stop = () => {
      stopped = true;
      if (adoptionReadyFlowStops.get(token) === stop) adoptionReadyFlowStops.delete(token);
    };
    adoptionReadyFlowStops.set(token, stop);
    const scheduleRenewal = (delay) => {
      if (!stopped) setTimeout(() => renewFlow(), delay);
    };
    const renewFlow = async () => {
      if (stopped) return;
      const read = readAdoptionReadyFlowRecord();
      if (!read.ok) {
        scheduleRenewal(ADOPTION_READY_FLOW_RETRY_MS);
        return;
      }
      if (!read.flow || read.flow.token !== token) return;
      const renewed = await claimAdoptionReadyFlow({
        adoptionReadyToken: token,
        filename: read.flow.filename,
        torrentId: read.flow.torrentId
      });
      if (stopped) return;
      if (renewed) {
        scheduleRenewal(ADOPTION_READY_FLOW_HEARTBEAT_MS);
        return;
      }
      const afterFailure = readAdoptionReadyFlowRecord();
      if (
        !afterFailure.ok ||
        (afterFailure.flow?.token === token && isAdoptionReadyFlowActive(afterFailure.flow))
      ) {
        scheduleRenewal(ADOPTION_READY_FLOW_RETRY_MS);
      }
    };
    setTimeout(
      () => {
        if (stopped) return false;
        stop();
        return releaseAdoptionReadyFlowWithRetry(token);
      },
      Math.max(0, handlingDeadlineAt - Date.now())
    );
    scheduleRenewal(ADOPTION_READY_FLOW_HEARTBEAT_MS);
    globalThis.addEventListener?.(
      'pagehide',
      () => {
        stop();
        void releaseAdoptionReadyFlowWithRetry(token);
      },
      { once: true }
    );
  }

  function stopAdoptionReadyPageHandling(token) {
    const stop = adoptionReadyFlowStops.get(token);
    if (!stop) return false;
    stop();
    return true;
  }

  async function finishAdoptionReadyPageHandling(token) {
    stopAdoptionReadyPageHandling(token);
    return releaseAdoptionReadyFlowWithRetry(token);
  }

  function clickAdoptionButtonAndConfirm(button) {
    const pageWindow = typeof unsafeWindow === 'undefined' ? globalThis : unsafeWindow;
    const originalConfirm = pageWindow.confirm;
    if (button.disabled || typeof originalConfirm !== 'function') return false;
    let confirmReplaced = false;
    try {
      pageWindow.confirm = () => true;
      confirmReplaced = pageWindow.confirm !== originalConfirm;
      if (!confirmReplaced) return false;
      button.click();
      return true;
    } finally {
      if (confirmReplaced) pageWindow.confirm = originalConfirm;
    }
  }

  function maybeAutoTriggerAdoption(readyMarker, quiItem) {
    if (!GM_config.get('qui_auto_trigger_adoption')) return { state: 'disabled' };
    if (readyMarker?.state === 'adopted') {
      return isAdoptionReadyDispatchConfirmed()
        ? { state: 'adopted' }
        : {
            state: 'not-triggered',
            message: 'Auto-adoption stopped: the adoption click was not confirmed as dispatched.'
          };
    }
    const torrentId = new URL(location.href).searchParams.get('torrentid') || '';
    if (!readyMarker || readyMarker.torrentId !== torrentId) {
      return {
        state: 'not-triggered',
        message: 'Auto-adoption skipped: no valid completion marker.'
      };
    }
    if (!/^\d+$/.test(torrentId)) {
      return { state: 'not-triggered', message: 'Auto-adoption skipped: missing torrent id.' };
    }
    if (!readyMarker.token) {
      return {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
    }
    const initialOwnership = readAdoptionReadyFlowOwnership(readyMarker.token);
    if (!initialOwnership.ok) {
      return {
        state: 'waiting',
        message: 'Waiting for the active adoption flow state to become available.'
      };
    }
    if (!initialOwnership.owns) {
      return {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
    }
    if (!isMatchingSeedingAntquiItem(quiItem, readyMarker)) {
      return {
        state: 'not-triggered',
        message:
          'Auto-adoption skipped: the matching ANT torrent is not both 100% complete and seeding in qui.'
      };
    }

    const button = findAdoptionButton(torrentId);
    if (!button) {
      return {
        state: 'not-triggered',
        message: 'Auto-adoption skipped: Reserve for adoption control not found.'
      };
    }
    const finalOwnership = readAdoptionReadyFlowOwnership(readyMarker.token);
    if (!finalOwnership.ok) {
      return {
        state: 'waiting',
        message: 'Waiting for the active adoption flow state to become available.'
      };
    }
    if (!finalOwnership.owns) {
      return {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
    }

    if (!persistAdoptedReadyMarker(readyMarker)) {
      return {
        state: 'not-triggered',
        message:
          'Auto-adoption skipped: the adopted result could not be preserved across the ANT refresh.'
      };
    }
    if (!setAdoptionReadyDispatchConfirmed(true)) {
      rollbackAdoptedReadyMarker(readyMarker, 'undispatched adopted');
      return {
        state: 'not-triggered',
        message: 'Auto-adoption skipped: the click dispatch could not be recorded safely.'
      };
    }

    try {
      if (!clickAdoptionButtonAndConfirm(button)) {
        const rolledBack = rollbackAdoptedReadyMarker(readyMarker, 'unconfirmed adopted');
        const dispatchCleared = setAdoptionReadyDispatchConfirmed(false);
        if (!rolledBack && !dispatchCleared) clearAdoptionReadyUrlParams();
        return {
          state: 'not-triggered',
          message: 'Auto-adoption skipped: the confirmation prompt could not be accepted.'
        };
      }
      return { state: 'adopted' };
    } catch (error) {
      const rolledBack = rollbackAdoptedReadyMarker(readyMarker, 'failed adopted');
      const dispatchCleared = setAdoptionReadyDispatchConfirmed(false);
      if (!rolledBack && !dispatchCleared) clearAdoptionReadyUrlParams();
      debugLog('automatic ANT adoption failed', { torrentId, error });
      return {
        state: 'not-triggered',
        message: 'Automatic adoption failed; use the button below.'
      };
    }
  }

  async function finishAdoptionReadyForManualMode(readyMarker, notice) {
    if (GM_config.get('qui_auto_trigger_adoption')) return null;
    const result = {
      state: 'not-triggered',
      message: 'Automatic adoption was disabled; use the adoption control below.'
    };
    updateAdoptionReadyNotice(notice, result);
    if (readyMarker?.token) await finishAdoptionReadyPageHandling(readyMarker.token);
    return result;
  }

  async function scheduleAdoptionReadyquiPoll(readyMarker, notice, startedAt, deadlineAt, message) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) {
      const result = {
        state: 'not-triggered',
        message:
          'Timed out waiting for the matching ANT torrent to reach 100% and seed in qui; this page remains open for manual handling.'
      };
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker?.token);
      return result;
    }

    const result = {
      state: 'waiting',
      message:
        message ||
        `Waiting for the matching ANT torrent to reach 100% and seed in qui (${Math.ceil(remainingMs / 1000)} seconds remaining).`
    };
    updateAdoptionReadyNotice(notice, result);
    const completedAt = Date.now();
    const elapsedMs = Math.max(0, completedAt - startedAt);
    const nextPollAt = Math.min(
      startedAt +
        (Math.floor(elapsedMs / ADOPTION_READY_QUI_POLL_INTERVAL_MS) + 1) *
          ADOPTION_READY_QUI_POLL_INTERVAL_MS,
      deadlineAt
    );
    setTimeout(
      () => pollAdoptionReadyForqui(readyMarker, notice, startedAt, deadlineAt),
      Math.max(0, nextPollAt - completedAt)
    );
    return result;
  }

  async function pollAdoptionReadyForqui(readyMarker, notice, startedAt, deadlineAt) {
    const manualResult = await finishAdoptionReadyForManualMode(readyMarker, notice);
    if (manualResult) return manualResult;
    if (!readyMarker?.filename) {
      const result = {
        state: 'not-triggered',
        message: 'Auto-adoption skipped: no valid completion marker or ANT filename.'
      };
      updateAdoptionReadyNotice(notice, result);
      if (readyMarker?.token) await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }
    if (!readyMarker.token) {
      const result = {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }
    const initialOwnership = readAdoptionReadyFlowOwnership(readyMarker.token);
    if (!initialOwnership.ok) {
      return scheduleAdoptionReadyquiPoll(
        readyMarker,
        notice,
        startedAt,
        deadlineAt,
        'Waiting for the active adoption flow state to become available.'
      );
    }
    if (!initialOwnership.owns) {
      const result = {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }
    const pollStartedAt = Date.now();
    if (pollStartedAt > deadlineAt) {
      const result = {
        state: 'not-triggered',
        message:
          'Timed out waiting for the matching ANT torrent to reach 100% and seed in qui; this page remains open for manual handling.'
      };
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }

    let candidates = [];
    const shouldContinue = () => {
      if (!GM_config.get('qui_auto_trigger_adoption')) return false;
      const ownership = readAdoptionReadyFlowOwnership(readyMarker.token);
      return !ownership.ok || ownership.owns;
    };
    try {
      candidates = await searchAntquiCandidates('', shouldContinue);
    } catch (error) {
      debugLog('adoption-ready qui poll failed', {
        filename: readyMarker.filename,
        error
      });
    }

    const disabledAfterSearch = await finishAdoptionReadyForManualMode(readyMarker, notice);
    if (disabledAfterSearch) return disabledAfterSearch;
    const ownershipAfterSearch = readAdoptionReadyFlowOwnership(readyMarker.token);
    if (!ownershipAfterSearch.ok) {
      return scheduleAdoptionReadyquiPoll(
        readyMarker,
        notice,
        startedAt,
        deadlineAt,
        'Waiting for the active adoption flow state to become available.'
      );
    }
    if (!ownershipAfterSearch.owns) {
      const result = {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }
    const quiItem = await findVerifiedSeedingAntquiItem(candidates, readyMarker, shouldContinue);
    const disabledAfterVerification = await finishAdoptionReadyForManualMode(readyMarker, notice);
    if (disabledAfterVerification) return disabledAfterVerification;
    const ownershipAfterVerification = readAdoptionReadyFlowOwnership(readyMarker.token);
    if (!ownershipAfterVerification.ok) {
      return scheduleAdoptionReadyquiPoll(
        readyMarker,
        notice,
        startedAt,
        deadlineAt,
        'Waiting for the active adoption flow state to become available.'
      );
    }
    if (!ownershipAfterVerification.owns) {
      const result = {
        state: 'not-triggered',
        message: 'Auto-adoption stopped: this page no longer owns the active adoption flow.'
      };
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }
    if (quiItem) {
      const result = maybeAutoTriggerAdoption(readyMarker, quiItem);
      if (result.state === 'waiting') {
        return scheduleAdoptionReadyquiPoll(
          readyMarker,
          notice,
          startedAt,
          deadlineAt,
          result.message
        );
      }
      updateAdoptionReadyNotice(notice, result);
      await finishAdoptionReadyPageHandling(readyMarker.token);
      return result;
    }
    return scheduleAdoptionReadyquiPoll(readyMarker, notice, startedAt, deadlineAt);
  }

  function startAdoptionReadyquiPolling(readyMarker, notice, startedAt = Date.now()) {
    const activeFlow = getActiveAdoptionReadyFlow();
    const flowDeadlineAt =
      activeFlow?.token === readyMarker?.token
        ? getAdoptionReadyFlowDeadline(activeFlow)
        : Number.POSITIVE_INFINITY;
    return pollAdoptionReadyForqui(
      readyMarker,
      notice,
      startedAt,
      Math.min(startedAt + ADOPTION_READY_QUI_POLL_DURATION_MS, flowDeadlineAt)
    );
  }

  function retryAdoptionReadyInitialization(flowToken, notice, startedAt) {
    const deadlineAt = startedAt + ADOPTION_READY_HANDLING_TIMEOUT_MS;
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) {
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message:
          'Timed out waiting for the active adoption flow state; this page remains open for manual handling.'
      });
      void finishAdoptionReadyPageHandling(flowToken);
      return false;
    }
    updateAdoptionReadyNotice(notice, {
      state: 'waiting',
      message: 'Waiting for the active adoption flow state to become available.'
    });
    setTimeout(
      () => initializeAdoptionReadyView(startedAt),
      Math.min(ADOPTION_READY_FLOW_RETRY_MS, remainingMs)
    );
    return true;
  }

  function initializeAdoptionReadyView(initializationStartedAt = Date.now()) {
    const flowToken = new URL(location.href).searchParams.get(ADOPTION_READY_TOKEN_PARAM) || '';
    const markerRead = readAdoptionReadyMarker(false);
    const readyMarker = markerRead.marker;
    const notice = addAdoptionReadyNotice();
    if (!markerRead.ok) {
      if (!GM_config.get('qui_auto_trigger_adoption')) {
        void finishAdoptionReadyPageHandling(flowToken);
        updateAdoptionReadyNotice(notice, {
          state: 'not-triggered',
          message: 'Manual adoption mode is active; use the adoption control below.'
        });
        return true;
      }
      return retryAdoptionReadyInitialization(flowToken, notice, initializationStartedAt);
    }
    if (readyMarker?.state === 'adopted') {
      if (readyMarker.token === flowToken && isAdoptionReadyDispatchConfirmed()) {
        updateAdoptionReadyNotice(notice, { state: 'adopted' });
        if (clearAdoptionReadyUrlParams()) {
          deleteAdoptionReadyMarker(readyMarker.token, 'adopted');
        }
        void finishAdoptionReadyPageHandling(flowToken);
        return true;
      }
      deleteAdoptionReadyMarker(flowToken, 'undispatched adopted');
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message: 'Automatic adoption stopped: the adoption click was not confirmed as dispatched.'
      });
      void finishAdoptionReadyPageHandling(flowToken);
      return false;
    }
    if (!GM_config.get('qui_auto_trigger_adoption')) {
      if (readyMarker?.token && readyMarker.token === flowToken) {
        deleteAdoptionReadyMarker(flowToken, 'manual adoption-ready');
        void finishAdoptionReadyPageHandling(flowToken);
      }
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message: 'Manual adoption mode is active; use the adoption control below.'
      });
      return true;
    }
    if (!readyMarker || readyMarker.token !== flowToken) {
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message: 'Automatic adoption stopped: this page has no valid completion marker.'
      });
      return false;
    }
    const ownership = readAdoptionReadyFlowOwnership(flowToken);
    if (!ownership.ok) {
      return retryAdoptionReadyInitialization(flowToken, notice, initializationStartedAt);
    }
    if (!ownership.owns) {
      deleteAdoptionReadyMarker(flowToken, 'unowned adoption-ready');
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message: 'Automatic adoption stopped: this page does not own the active adoption flow.'
      });
      return false;
    }
    if (!deleteAdoptionReadyMarker(flowToken, 'pending adoption-ready')) {
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message: 'Automatic adoption stopped: the completion marker could not be consumed.'
      });
      void finishAdoptionReadyPageHandling(flowToken);
      return false;
    }
    const activeFlow = ownership.flow;
    const startedAt = Date.now();
    watchAdoptionReadyPageHandling(
      readyMarker.token,
      Math.min(
        startedAt + ADOPTION_READY_HANDLING_TIMEOUT_MS,
        getAdoptionReadyFlowDeadline(activeFlow)
      )
    );
    startAdoptionReadyquiPolling(readyMarker, notice, startedAt).catch(async (error) => {
      debugLog('adoption-ready qui polling failed', { error });
      updateAdoptionReadyNotice(notice, {
        state: 'not-triggered',
        message: 'Automatic adoption failed while checking qui; use the button below.'
      });
      await finishAdoptionReadyPageHandling(readyMarker.token);
    });
    return true;
  }

  function updateAdoptionReadyNotice(notice, result) {
    if (!notice || !result || result.state === 'disabled') return;
    if (result.state === 'adopted') {
      notice.dataset.state = 'adopted';
      notice.textContent =
        'ADOPTED — the matching torrent completed in qui and adoption was triggered.';
      document.title = document.title.replace(/^READY FOR ADOPTION - /, 'ADOPTED - ');
      return;
    }
    notice.dataset.state = 'ready';
    notice.textContent = `READY FOR ADOPTION — ${result.message}`;
  }

  function buildAdoptionPageUrl(pageNumber, filteredView = false) {
    const url = new URL(location.href);
    url.searchParams.set('page', String(pageNumber));
    if (filteredView) {
      url.searchParams.set(FILTERED_VIEW_PARAM, '1');
    } else {
      url.searchParams.delete(FILTERED_VIEW_PARAM);
    }
    return url.toString();
  }

  function buildAdoptionScanPageUrl(pageNumber) {
    const url = new URL(buildAdoptionPageUrl(pageNumber));
    url.searchParams.set('order', 'Bounty');
    url.searchParams.set('way', 'DESC');
    return url.toString();
  }

  function parseScannedAdoptionPage(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = findAdoptionTable(doc);
    if (!table) throw new Error('ANT response did not contain an adoption table.');
    const sizeIndex = findAdoptionColumnIndex(table, 'size');
    const bountyIndex = findAdoptionColumnIndex(table, 'bounty');
    return [...table.querySelectorAll(FILTERABLE_ROW_SELECTOR)].map((row) => {
      const torrentId = getRowTorrentId(row);
      if (!torrentId) throw new Error('ANT adoption row did not contain a torrent download ID.');
      const sizeGiB =
        sizeIndex >= 0 && row.children[sizeIndex]
          ? parseSizeToGiB(row.children[sizeIndex].textContent)
          : null;
      const bounty =
        bountyIndex >= 0 && row.children[bountyIndex]
          ? parseBounty(row.children[bountyIndex].textContent)
          : null;
      return {
        bounty,
        html: row.outerHTML,
        metadata: getAdoptionRowMetadata(row),
        seeding: isAdoptionRowSeeding(row),
        sizeGiB,
        torrentId,
        trumpable: isTrumpableRow(row),
        zeroSeed: row.classList?.contains('zeroseed') === true
      };
    });
  }

  async function scanAdoptionPages(button, untilMinimumBounty = false) {
    const minimumBounty = getMinimumBounty();
    if (untilMinimumBounty && minimumBounty <= 0) {
      throw new Error('Set Minimum bounty above zero before starting a bounty-limited scan.');
    }
    const pageLimit = untilMinimumBounty ? MAX_SCAN_PAGES : getScanPageCount();
    const delayMs = getScanDelayMs();
    const rows = [];
    let pageCount = 0;
    let previousBounty = Number.POSITIVE_INFINITY;

    try {
      for (let index = 1; index <= pageLimit; index += 1) {
        const progress = untilMinimumBounty
          ? `Scanning bounty-sorted adoption page ${index}/${pageLimit}; stopping below ${minimumBounty}...`
          : `Scanning adoption page ${index}/${pageLimit}...`;
        if (button) button.textContent = progress;

        const url = buildAdoptionScanPageUrl(index);
        const html = await requestAntPage(url, `ANT page ${index}`);
        const pageRows = parseScannedAdoptionPage(html);
        pageCount = index;

        if (untilMinimumBounty) {
          if (pageRows.some((entry) => entry.bounty === null)) {
            throw new Error(`ANT page ${index} contained a row without a readable bounty.`);
          }
          for (const entry of pageRows) {
            if (entry.bounty > previousBounty) {
              throw new Error('ANT adoption results were not sorted by bounty descending.');
            }
            previousBounty = entry.bounty;
          }
          const boundary = pageRows.findIndex((entry) => entry.bounty < minimumBounty);
          rows.push(...(boundary >= 0 ? pageRows.slice(0, boundary) : pageRows));
          if (boundary >= 0 || pageRows.length === 0) break;
        } else {
          rows.push(...pageRows);
        }

        if (index < pageLimit && delayMs > 0) await sleep(delayMs);
      }

      const seen = new Set();
      const deduplicatedRows = rows.filter((entry) => {
        const key = entry.torrentId || entry.html;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const scan = {
        version: FILTERED_SCAN_VERSION,
        scannedAt: new Date().toISOString(),
        pageCount,
        scanMode: untilMinimumBounty ? 'minimum-bounty' : 'page-count',
        minimumBounty: untilMinimumBounty ? minimumBounty : 0,
        sourceUrl: buildAdoptionScanPageUrl(1),
        rows: deduplicatedRows.map((entry) => entry.html),
        rowData: deduplicatedRows.map((entry, originalIndex) => ({
          bounty: entry.bounty,
          bountyPerGib:
            entry.sizeGiB && entry.bounty !== null ? entry.bounty / entry.sizeGiB : null,
          metadata: entry.metadata,
          originalIndex,
          seeding: entry.seeding,
          sizeGiB: entry.sizeGiB,
          torrentId: entry.torrentId,
          trumpable: entry.trumpable,
          zeroSeed: entry.zeroSeed
        }))
      };
      saveFilteredScan(scan);
      updateOpenLastScanButton();
    } finally {
      if (button) {
        button.textContent = untilMinimumBounty
          ? getBountyScanButtonText()
          : `Scan ${getScanPageCount()} adoption pages`;
      }
    }
  }

  function startAdoptionScan(button, untilMinimumBounty = false) {
    if (adoptionScanRunning) return;
    if (untilMinimumBounty && getMinimumBounty() <= 0) {
      alert('Set Minimum bounty above zero in Settings before starting this scan.');
      return;
    }

    adoptionScanRunning = true;
    updateAdoptionScanButtons();
    return scanAdoptionPages(button, untilMinimumBounty)
      .catch((error) => {
        console.error('ANT adoption scan failed:', error);
        alert(`Adoption scan failed: ${error.message || error}`);
      })
      .finally(() => {
        adoptionScanRunning = false;
        updateAdoptionScanButtons();
      });
  }

  function openLastFilteredScan() {
    if (adoptionScanRunning) return;
    if (!loadFilteredScan()) {
      alert('No saved adoption scan is available.');
      return;
    }
    window.open(buildAdoptionPageUrl(1, true), '_blank');
  }

  function updateRunProgress(completed, total, message, state = 'running') {
    const display = document.querySelector('#ant-cross-seed-progress');
    if (!display) return;
    const bar = display.querySelector('progress');
    const text = display.querySelector('.ant-cross-seed-progress-text');
    const safeTotal = Math.max(0, Number(total) || 0);
    const safeCompleted = Math.min(safeTotal, Math.max(0, Number(completed) || 0));
    display.dataset.state = state;
    if (bar) {
      bar.max = Math.max(1, safeTotal);
      bar.value = safeCompleted;
    }
    if (text) text.textContent = message;
  }

  function updateRunProgressReadyState(visibleRows = getRows().length) {
    const display = document.querySelector('#ant-cross-seed-progress');
    if (!display || display.dataset.state !== 'idle') return;
    updateRunProgress(
      0,
      visibleRows,
      `Ready to process ${visibleRows} visible zero-seed row${visibleRows === 1 ? '' : 's'}.`,
      'idle'
    );
  }

  function addRunProgressDisplay() {
    if (!isFilteredAdoptionView() || document.querySelector('#ant-cross-seed-progress')) return;
    const toolbar = document.querySelector('#ant-cross-seed-toolbar');
    if (!toolbar?.parentNode) return;

    const display = document.createElement('div');
    display.id = 'ant-cross-seed-progress';
    display.dataset.state = 'idle';
    display.setAttribute('role', 'status');
    display.setAttribute('aria-live', 'polite');

    const bar = document.createElement('progress');
    bar.max = 1;
    bar.value = 0;
    bar.setAttribute('aria-label', 'Cross-seed processing progress');
    const text = document.createElement('span');
    text.className = 'ant-cross-seed-progress-text';
    display.append(bar, text);
    toolbar.insertAdjacentElement('afterend', display);
  }

  function getAdoptionFilterResult(data, action, regexes, state = adoptionFilterState) {
    const bountyPerGib = Number.parseFloat(data?.bountyPerGib);
    const bounty = Number.parseFloat(data?.bounty);
    const sizeGiB = Number.parseFloat(data?.sizeGiB);
    const seeding = data?.seeding === true || data?.seeding === 'true';
    const trumpable = data?.trumpable === true || data?.trumpable === 'true';
    const mediaMatches = regexes.map((filter) => ({
      mode: filter.mode,
      matches:
        filter.mode === 'group'
          ? filter.categories.every((regexes) =>
              regexes.some((regex) => regex.test(data?.metadata || ''))
            )
          : filter.regexes.some((regex) => regex.test(data?.metadata || ''))
    }));
    const ignoreMatches = mediaMatches.filter((filter) => filter.mode === 'ignore');
    const excluded =
      mediaMatches.some((filter) => filter.mode === 'group' && filter.matches) ||
      mediaMatches.some((filter) => filter.mode === 'only' && !filter.matches) ||
      (ignoreMatches.length > 0 &&
        (state.combineMediaFilters
          ? ignoreMatches.every((filter) => filter.matches)
          : ignoreMatches.some((filter) => filter.matches)));
    const belowThreshold =
      !Number.isFinite(bountyPerGib) || bountyPerGib <= state.minimumBountyPerGib;
    const belowMinimumBounty =
      state.minimumBounty > 0 && (!Number.isFinite(bounty) || bounty < state.minimumBounty);
    const aboveMaximum =
      state.maximumSizeGib > 0 && Number.isFinite(sizeGiB) && sizeGiB > state.maximumSizeGib;
    const wrongSeedingState =
      (state.seedingFilter === 'Seeding only' && !seeding) ||
      (state.seedingFilter === 'Not seeding only' && seeding);
    const hidden = state.showOnlyGrabbedRows
      ? action !== 'grabbed'
      : (state.hideBelowBountyThreshold && belowThreshold) ||
        (state.hideBelowMinimumBounty && belowMinimumBounty) ||
        (state.hideAboveMaximumSize && aboveMaximum) ||
        (state.hideExcludedFormats && excluded) ||
        (state.hideIgnoredRows && action === 'ignored') ||
        (state.hideGrabbedRows && action === 'grabbed') ||
        (state.skipTrumpable && trumpable) ||
        wrongSeedingState;
    return { excluded, hidden };
  }

  function partitionFilteredScanEntries(entries, actions, regexes, state = adoptionFilterState) {
    const visibleEntries = [];
    const hiddenEntries = [];
    for (const entry of entries) {
      const action = actions.get(String(entry.data.torrentId)) || '';
      const result = getAdoptionFilterResult(entry.data, action, regexes, state);
      (result.hidden ? hiddenEntries : visibleEntries).push(entry);
    }
    return { hiddenEntries, visibleEntries };
  }

  function readFilteredScanActions(rowData) {
    const startedAt = performanceNow();
    const actionKeys = new Set(
      GM_listValues().filter((key) => String(key).startsWith(ACTION_STORAGE_PREFIX))
    );
    const actions = new Map();
    let grabbed = 0;
    let ignored = 0;
    for (const data of rowData) {
      if (!data?.torrentId || !actionKeys.has(actionStorageKey(data.torrentId))) continue;
      const action = getTorrentAction(data.torrentId);
      if (!action) continue;
      actions.set(String(data.torrentId), action);
      if (action === 'grabbed') grabbed += 1;
      if (action === 'ignored') ignored += 1;
    }
    lifecycleLog('saved scan actions restored', {
      durationMs: elapsedMilliseconds(startedAt),
      grabbed,
      ignored,
      matchedActions: actions.size,
      storedActionKeys: actionKeys.size
    });
    return actions;
  }

  function getSavedScanHtmlTorrentId(html) {
    const value = String(html).trim();
    if (!/^<tr\b[\s\S]*<\/tr>$/i.test(value)) return null;
    if ((value.match(/<tr\b/gi) || []).length !== 1) return null;
    if ((value.match(/<\/tr\s*>/gi) || []).length !== 1) return null;
    const openingTag = value.match(/^<tr\b[^>]*>/i)?.[0] || '';
    const className = openingTag.match(/\bclass\s*=\s*(['"])(.*?)\1/i)?.[2] || '';
    const classes = new Set(className.split(/\s+/).filter(Boolean));
    if (!classes.has('torrent') || !classes.has('torrent_row')) return null;

    const torrentIds = [];
    for (const match of value.matchAll(/<a\b[^>]*>/gi)) {
      const href = match[0].match(/\bhref\s*=\s*(['"])(.*?)\1/i)?.[2]?.replaceAll('&amp;', '&');
      if (!href?.includes('torrents.php?action=download')) continue;
      const torrentId = href.match(/[?&]id=(\d+)/)?.[1];
      if (torrentId) torrentIds.push(torrentId);
    }
    return torrentIds.length > 0 && new Set(torrentIds).size === 1 ? torrentIds[0] : null;
  }

  function stageFilteredScanEntries(scan) {
    const startedAt = performanceNow();
    const valid = scan.rows.every(
      (html, index) => getSavedScanHtmlTorrentId(html) === String(scan.rowData[index].torrentId)
    );
    if (!valid) {
      discardFilteredScanCache('row HTML mismatch', {
        durationMs: elapsedMilliseconds(startedAt),
        storedRows: scan.rows.length
      });
      return null;
    }
    lifecycleLog('saved scan rows validated', {
      durationMs: elapsedMilliseconds(startedAt),
      rows: scan.rows.length
    });
    return scan.rows.map((html, index) => ({ data: scan.rowData[index], html }));
  }

  function parseSavedScanRows(entries) {
    if (entries.length === 0) return [];
    const stagingBody = document.createElement('tbody');
    stagingBody.insertAdjacentHTML('beforeend', entries.map((entry) => entry.html).join(''));
    const rows = [...stagingBody.children];
    const valid =
      rows.length === entries.length &&
      rows.every(
        (row, index) =>
          row.matches?.(FILTERABLE_ROW_SELECTOR) &&
          getRowTorrentId(row) === String(entries[index].data.torrentId)
      );
    return valid ? rows : null;
  }

  function appendSavedScanRows(body, entries, rows) {
    rows.forEach((row, index) => {
      filteredScanRowData.set(row, entries[index].data);
    });
    body.append(...rows);
    return rows;
  }

  function restoreFilteredScanRows() {
    if (!isFilteredAdoptionView()) return false;
    const startedAt = performanceNow();
    const scan = loadFilteredScan();
    if (!scan) {
      alert('The saved adoption scan is missing or invalid.');
      return false;
    }

    const table = findAdoptionTable();
    if (!table) {
      alert('Could not find the ANT adoption table for the saved scan.');
      return false;
    }

    const header = getTableHeaderRow(table);
    let body = table.tBodies[0];
    if (!body) body = table.createTBody();
    adoptionFilterState ||= getDefaultAdoptionFilterState();
    const entries = stageFilteredScanEntries(scan);
    if (!entries) {
      alert('The saved adoption scan contained invalid or mismatched torrent rows.');
      return false;
    }
    migrateLegacyRowProcessingCache();
    filteredScanActions = readFilteredScanActions(scan.rowData);
    filteredScanRowData = new WeakMap();
    const regexes = buildMediaFilterMatchers(
      adoptionFilterState.excludedFormats,
      adoptionFilterState.exclusionGroups
    );
    const { hiddenEntries, visibleEntries: renderEntries } = partitionFilteredScanEntries(
      entries,
      filteredScanActions,
      regexes
    );
    deferredFilteredScanRows = hiddenEntries;
    const visibleRowsStartedAt = performanceNow();
    const renderedRows = parseSavedScanRows(renderEntries);
    if (!renderedRows) {
      discardFilteredScanCache('visible row HTML parse mismatch', {
        durationMs: elapsedMilliseconds(visibleRowsStartedAt),
        renderedRows: renderEntries.length,
        storedRows: scan.rows.length
      });
      alert('The saved adoption scan contained invalid or mismatched torrent rows.');
      return false;
    }
    lifecycleLog('visible saved scan rows parsed', {
      durationMs: elapsedMilliseconds(visibleRowsStartedAt),
      rows: renderedRows.length
    });

    const parent = body.parentNode;
    const nextSibling = body.nextSibling;
    body.remove();
    for (const tableBody of [...table.tBodies]) {
      for (const row of [...tableBody.rows]) {
        if (row !== header) row.remove();
      }
      if (tableBody !== body) tableBody.remove();
    }
    for (const row of [...body.rows]) {
      if (row !== header) row.remove();
    }
    appendSavedScanRows(body, renderEntries, renderedRows);
    parent?.insertBefore(body, nextSibling?.parentNode === parent ? nextSibling : null);
    document.title = `Filtered ANT adoptions - ${document.title}`;
    document.documentElement.dataset.antAdoptionFilteredView = '1';
    lifecycleLog('saved scan rows restored', {
      deferredRows: deferredFilteredScanRows.length,
      durationMs: elapsedMilliseconds(startedAt),
      renderedRows: renderEntries.length,
      scannedRows: scan.rows.length
    });
    return true;
  }

  function hydrateDeferredFilteredScanRows() {
    if (deferredFilteredScanRows.length === 0) return 0;
    const startedAt = performanceNow();
    const table = findAdoptionTable();
    const body = table?.tBodies[0];
    if (!table || !body) return 0;
    const regexes = buildMediaFilterMatchers(
      adoptionFilterState.excludedFormats,
      adoptionFilterState.exclusionGroups
    );
    const { hiddenEntries, visibleEntries: entries } = partitionFilteredScanEntries(
      deferredFilteredScanRows,
      filteredScanActions,
      regexes
    );
    deferredFilteredScanRows = hiddenEntries;
    if (entries.length === 0) return 0;
    const rows = parseSavedScanRows(entries);
    if (!rows) {
      discardFilteredScanCache('deferred row HTML parse mismatch', {
        storedRows: entries.length
      });
      deferredFilteredScanRows = [];
      return 0;
    }
    const parent = body.parentNode;
    const nextSibling = body.nextSibling;
    body.remove();
    appendSavedScanRows(body, entries, rows);
    parent?.insertBefore(body, nextSibling);
    decorateAdoptionRows();
    sortAdoptionRows(table, adoptionFilterState.sortField, adoptionFilterState.sortDirection);
    lifecycleLog('deferred saved scan rows rendered', {
      addedRows: entries.length,
      durationMs: elapsedMilliseconds(startedAt),
      remainingDeferredRows: deferredFilteredScanRows.length
    });
    return entries.length;
  }

  function ensureAdoptionColumns(table) {
    const header = getTableHeaderRow(table);
    if (!header) return;

    if (!header.querySelector(`.${BOUNTY_GIB_COLUMN_CLASS}`)) {
      const cell = document.createElement('td');
      cell.className = `sign ${BOUNTY_GIB_COLUMN_CLASS}`;
      const link = document.createElement('a');
      link.href = 'javascript:void(0)';
      link.textContent = 'Bounty / GiB';
      cell.appendChild(link);
      header.appendChild(cell);
    }

    if (isFilteredAdoptionView()) {
      for (const link of header.querySelectorAll('a')) {
        const order = new URL(link.href, location.href).searchParams.get('order');
        const field =
          { Name: 'Torrent', Size: 'Size', Bounty: 'Bounty', Time: 'Listing Time' }[order] ||
          (link.textContent === 'Bounty / GiB' ? 'Bounty / GiB' : null);
        if (!field || link.dataset.antAdoptionSort) continue;
        link.dataset.antAdoptionSort = field;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          adoptionFilterState ||= getDefaultAdoptionFilterState();
          adoptionFilterState.sortDirection =
            adoptionFilterState.sortField === field
              ? adoptionFilterState.sortDirection === 'Descending'
                ? 'Ascending'
                : 'Descending'
              : field === 'Torrent'
                ? 'Ascending'
                : 'Descending';
          adoptionFilterState.sortField = field;
          const fieldSelect = document.querySelector('#ant-adoption-sort-field');
          const directionSelect = document.querySelector('#ant-adoption-sort-direction');
          if (fieldSelect) fieldSelect.value = field;
          if (directionSelect) directionSelect.value = adoptionFilterState.sortDirection;
          sortAdoptionRows(table, field, adoptionFilterState.sortDirection);
        });
      }
    }

    if (!header.querySelector(`.${ACTION_COLUMN_CLASS}`)) {
      const cell = document.createElement('td');
      cell.className = ACTION_COLUMN_CLASS;
      cell.textContent = 'Action';
      header.appendChild(cell);
    }
  }

  function createActionCell(row, torrentId, action) {
    const cell = document.createElement('td');
    cell.className = ACTION_COLUMN_CLASS;
    const select = document.createElement('select');
    [
      ['', '—'],
      ['grabbed', 'Grabbed'],
      ['ignored', 'Ignored'],
      ['broken', 'Broken']
    ].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = action;
    select.addEventListener('change', () => {
      if (row.dataset.antAdoptionAction === 'broken' && select.value !== 'broken') {
        setRowState(row, 'action updated: ready to process', '');
      }
      setTorrentAction(torrentId, select.value);
      row.dataset.antAdoptionAction = select.value;
      rescan.hidden = select.value !== 'broken';
      applyAdoptionFilters(false);
    });
    cell.addEventListener('click', (event) => event.stopPropagation());
    const rescan = document.createElement('button');
    rescan.type = 'button';
    rescan.className = 'ant-cross-seed-rescan-metadata';
    rescan.textContent = 'Rescan metadata';
    rescan.hidden = action !== 'broken';
    rescan.addEventListener('click', () => rescanBrokenRow(row, torrentId));
    cell.append(select, rescan);
    return cell;
  }

  function decorateAdoptionRows() {
    const startedAt = performanceNow();
    let decoratedCount = 0;
    let savedActionKeys = null;
    document.querySelectorAll('table').forEach((table) => {
      const headerText = getTableHeaderRow(table)?.textContent.toLowerCase() || '';
      if (!headerText.includes('size') || !headerText.includes('bounty')) return;
      const sizeIndex = findAdoptionColumnIndex(table, 'size');
      const bountyIndex = findAdoptionColumnIndex(table, 'bounty');
      const timeIndex = findAdoptionColumnIndex(table, 'listing time');
      ensureAdoptionColumns(table);
      table.querySelectorAll(FILTERABLE_ROW_SELECTOR).forEach((row, index) => {
        if (row.dataset.antAdoptionDecorated === 'true') return;
        const scanData = filteredScanRowData.get(row);
        const torrentId = scanData?.torrentId || getRowTorrentId(row);
        if (!torrentId) return;
        const sizeGiB = scanData
          ? scanData.sizeGiB
          : sizeIndex >= 0 && row.children[sizeIndex]
            ? parseSizeToGiB(row.children[sizeIndex].textContent)
            : null;
        const bounty = scanData
          ? scanData.bounty
          : bountyIndex >= 0 && row.children[bountyIndex]
            ? parseBounty(row.children[bountyIndex].textContent)
            : null;
        const bountyPerGib = scanData
          ? scanData.bountyPerGib
          : sizeGiB && bounty !== null
            ? bounty / sizeGiB
            : null;
        if (!scanData) {
          savedActionKeys ||= new Set(
            GM_listValues().filter((key) => String(key).startsWith(ACTION_STORAGE_PREFIX))
          );
        }
        const action = scanData
          ? filteredScanActions.get(String(torrentId)) || ''
          : savedActionKeys.has(actionStorageKey(torrentId))
            ? getTorrentAction(torrentId)
            : '';
        row.dataset.antAdoptionTorrentId = torrentId;
        row.dataset.antAdoptionSizeGib = sizeGiB === null ? '' : String(sizeGiB);
        row.dataset.antAdoptionBounty = bounty === null ? '' : String(bounty);
        row.dataset.antAdoptionBountyGib = bountyPerGib === null ? '' : String(bountyPerGib);
        row.dataset.antAdoptionOriginalIndex ||= String(scanData?.originalIndex ?? index);
        row.dataset.antAdoptionMetadata = scanData?.metadata ?? getAdoptionRowMetadata(row);
        row.dataset.antAdoptionSeeding = String(scanData?.seeding ?? isAdoptionRowSeeding(row));
        row.dataset.antAdoptionTrumpable = String(scanData?.trumpable ?? isTrumpableRow(row));
        row.dataset.antAdoptionAction = action;
        row.dataset.antAdoptionName =
          row
            .querySelector('a[href*="torrents.php?id="][href*="torrentid="]')
            ?.textContent?.trim() || '';
        const timeCell = timeIndex >= 0 ? row.children[timeIndex] : null;
        const timeNode = timeCell?.querySelector('time, [title]');
        const listingTime = Date.parse(
          timeNode?.getAttribute('datetime') ||
            timeNode?.getAttribute('title') ||
            timeCell?.textContent ||
            ''
        );
        row.dataset.antAdoptionListingTime = Number.isFinite(listingTime)
          ? String(listingTime)
          : '';

        if (!row.querySelector(`.${BOUNTY_GIB_COLUMN_CLASS}`)) {
          const cell = document.createElement('td');
          cell.className = `right ${BOUNTY_GIB_COLUMN_CLASS}`;
          cell.dataset.sortValue = bountyPerGib === null ? '' : String(bountyPerGib);
          cell.textContent =
            bountyPerGib === null
              ? '—'
              : bountyPerGib.toLocaleString(undefined, { maximumFractionDigits: 0 });
          row.appendChild(cell);
        }
        if (!row.querySelector(`.${ACTION_COLUMN_CLASS}`)) {
          row.appendChild(createActionCell(row, torrentId, action));
        }
        row.dataset.antAdoptionDecorated = 'true';
        decoratedCount += 1;
      });
    });
    if (isFilteredAdoptionView() && decoratedCount > 0) {
      lifecycleLog('adoption rows decorated', {
        durationMs: elapsedMilliseconds(startedAt),
        rows: decoratedCount
      });
    }
  }

  function sortAdoptionRows(table, field, direction) {
    const startedAt = performanceNow();
    const datasetField = {
      'Bounty / GiB': 'antAdoptionBountyGib',
      Bounty: 'antAdoptionBounty',
      Size: 'antAdoptionSizeGib',
      Torrent: 'antAdoptionName',
      'Listing Time': 'antAdoptionListingTime',
      'Scan order': 'antAdoptionOriginalIndex'
    }[field];
    if (!datasetField) return;

    const rows = [...table.querySelectorAll(FILTERABLE_ROW_SELECTOR)].map((row, index) => ({
      row,
      index,
      value:
        field === 'Torrent'
          ? row.dataset[datasetField] || ''
          : Number.parseFloat(row.dataset[datasetField])
    }));
    const descending = field !== 'Scan order' && ['DESC', 'Descending'].includes(direction);
    rows.sort((left, right) => {
      const leftValid = field === 'Torrent' ? Boolean(left.value) : Number.isFinite(left.value);
      const rightValid = field === 'Torrent' ? Boolean(right.value) : Number.isFinite(right.value);
      if (leftValid !== rightValid) return leftValid ? -1 : 1;
      if (!leftValid) return left.index - right.index;
      const ascendingComparison =
        field === 'Torrent'
          ? left.value.localeCompare(right.value, undefined, { numeric: true, sensitivity: 'base' })
          : left.value - right.value;
      const comparison = descending ? -ascendingComparison : ascendingComparison;
      return comparison || left.index - right.index;
    });
    const body = table.tBodies[0] || table;
    body.append(...rows.map((entry) => entry.row));
    for (const link of table.querySelectorAll('a[data-ant-adoption-sort]')) {
      const label = link.dataset.antAdoptionSort;
      link.textContent = label === field ? `${label} ${descending ? '↓' : '↑'}` : label;
    }
    if (isFilteredAdoptionView()) {
      lifecycleLog('adoption rows sorted', {
        direction,
        durationMs: elapsedMilliseconds(startedAt),
        field,
        rows: rows.length
      });
    }
  }

  function sortAdoptionRowsByBounty(table, direction) {
    sortAdoptionRows(table, 'Bounty / GiB', direction);
  }

  function applyDefaultAdoptionSort() {
    adoptionFilterState ||= getDefaultAdoptionFilterState();
    const table = findAdoptionTable();
    if (table) {
      sortAdoptionRows(table, adoptionFilterState.sortField, adoptionFilterState.sortDirection);
    }
  }

  function applyAdoptionActionHighlight(row) {
    row.classList.remove(
      'ant-adoption-highlight',
      'ant-adoption-highlight-excluded',
      'ant-adoption-highlight-grabbed',
      'ant-adoption-highlight-ignored'
    );
    const action = row.dataset.antAdoptionAction;
    if (action === 'grabbed') {
      row.classList.add('ant-adoption-highlight-grabbed');
      return;
    }
    if (action === 'ignored') {
      row.classList.add('ant-adoption-highlight-ignored');
      return;
    }
  }

  function applyAdoptionFilters(includeDeferredRows = true) {
    const startedAt = performanceNow();
    if (!adoptionFilterState) adoptionFilterState = getDefaultAdoptionFilterState();
    const hydratedRows = includeDeferredRows ? hydrateDeferredFilteredScanRows() : 0;
    const regexes = buildMediaFilterMatchers(
      adoptionFilterState.excludedFormats,
      adoptionFilterState.exclusionGroups
    );
    let visible = 0;
    let visibleZeroSeed = 0;
    const rows = [...document.querySelectorAll(FILTERABLE_ROW_SELECTOR)];

    rows.forEach((row) => {
      const bountyPerGib = Number.parseFloat(row.dataset.antAdoptionBountyGib);
      const bounty = Number.parseFloat(row.dataset.antAdoptionBounty);
      const sizeGiB = Number.parseFloat(row.dataset.antAdoptionSizeGib);
      const action = row.dataset.antAdoptionAction || '';
      const { excluded, hidden } = getAdoptionFilterResult(
        {
          bounty,
          bountyPerGib,
          metadata: row.dataset.antAdoptionMetadata || '',
          seeding: row.dataset.antAdoptionSeeding,
          sizeGiB,
          trumpable: row.dataset.antAdoptionTrumpable
        },
        action,
        regexes
      );

      row.hidden = hidden;
      row.dataset.antAdoptionExcluded = String(excluded);
      applyAdoptionActionHighlight(row);
      if (!hidden) {
        visible += 1;
        if (row.classList.contains('zeroseed')) visibleZeroSeed += 1;
      }
    });

    const status = document.querySelector('#ant-adoption-filter-status');
    const scannedRowCount = loadFilteredScan()?.rows.length || rows.length;
    if (status)
      status.textContent = `Showing ${visible} of ${scannedRowCount} adoption rows (${visibleZeroSeed} with zero seeders)`;
    updateRunProgressReadyState(visibleZeroSeed);
    if (isFilteredAdoptionView()) {
      lifecycleLog('adoption filters applied', {
        durationMs: elapsedMilliseconds(startedAt),
        evaluatedRows: rows.length,
        hydratedRows,
        remainingDeferredRows: deferredFilteredScanRows.length,
        scannedRows: scannedRowCount,
        visibleRows: visible,
        visibleZeroSeedRows: visibleZeroSeed
      });
    }
    const loadAllCachedStatuses = Boolean(GM_config.get('load_cache_status_on_page_load'));
    if (
      GM_config.get('use_cache') &&
      rows.some((row) => isRowEligibleForCachedDataRestore(row, loadAllCachedStatuses))
    ) {
      queueCachedRowStatusesOnPageLoad().catch((error) => {
        console.warn(`[${SCRIPT_PREFIX}] visible row cache restoration failed`, error);
      });
    }
    if (isFilteredAdoptionView()) {
      scheduleAdoptionFilterPresentationLog(startedAt, {
        evaluatedRows: rows.length,
        hydratedRows,
        remainingDeferredRows: deferredFilteredScanRows.length,
        visibleRows: visible,
        visibleZeroSeedRows: visibleZeroSeed
      });
    }
    return {
      evaluatedRows: rows.length,
      visibleRows: visible,
      visibleZeroSeedRows: visibleZeroSeed
    };
  }

  function createFilterCheckbox(container, label, stateKey) {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.filterState = stateKey;
    input.checked = Boolean(adoptionFilterState[stateKey]);
    input.addEventListener('change', () => {
      adoptionFilterState[stateKey] = input.checked;
      applyAdoptionFilters();
    });
    wrapper.append(input, document.createTextNode(` ${label}`));
    container.appendChild(wrapper);
    return input;
  }

  function addAdoptionFilterControls() {
    if (document.querySelector('#ant-adoption-filter-toolbar')) return;
    adoptionFilterState ||= getDefaultAdoptionFilterState();

    const toolbar = document.createElement('details');
    toolbar.id = 'ant-adoption-filter-toolbar';
    toolbar.open = false;
    const heading = document.createElement('summary');
    heading.className = 'ant-filter-heading';
    const title = document.createElement('span');
    title.textContent = 'Adoption filters';
    const status = document.createElement('span');
    status.id = 'ant-adoption-filter-status';
    heading.append(title, status);
    const body = document.createElement('div');
    body.className = 'ant-filter-body';
    const sections = {};
    for (const [key, title] of [
      ['limits', 'Bounty and size'],
      ['visibility', 'Row visibility'],
      ['sort', 'Sorting'],
      ['media', 'Media filters']
    ]) {
      const section = document.createElement('fieldset');
      section.className = `ant-filter-section ant-filter-${key}`;
      const legend = document.createElement('legend');
      legend.textContent = title;
      section.appendChild(legend);
      sections[key] = section;
      body.appendChild(section);
    }
    toolbar.append(heading, body);

    const minimumPerGibLabel = document.createElement('label');
    minimumPerGibLabel.textContent = 'Min bounty/GiB ';
    const minimumPerGibInput = document.createElement('input');
    minimumPerGibInput.type = 'number';
    minimumPerGibInput.min = '0';
    minimumPerGibInput.value = String(adoptionFilterState.minimumBountyPerGib);
    minimumPerGibInput.addEventListener('change', () => {
      adoptionFilterState.minimumBountyPerGib = Math.max(0, Number(minimumPerGibInput.value) || 0);
      applyAdoptionFilters();
    });
    minimumPerGibLabel.appendChild(minimumPerGibInput);

    const minimumBountyLabel = document.createElement('label');
    minimumBountyLabel.textContent = 'Min bounty ';
    const minimumBountyInput = document.createElement('input');
    minimumBountyInput.type = 'number';
    minimumBountyInput.min = '0';
    minimumBountyInput.value = String(adoptionFilterState.minimumBounty);
    minimumBountyInput.addEventListener('change', () => {
      adoptionFilterState.minimumBounty = Math.max(0, Number(minimumBountyInput.value) || 0);
      applyAdoptionFilters();
    });
    minimumBountyLabel.appendChild(minimumBountyInput);

    const maximumLabel = document.createElement('label');
    maximumLabel.textContent = 'Max GiB ';
    const maximumInput = document.createElement('input');
    maximumInput.type = 'number';
    maximumInput.min = '0';
    maximumInput.step = 'any';
    maximumInput.value = String(adoptionFilterState.maximumSizeGib);
    maximumInput.addEventListener('change', () => {
      adoptionFilterState.maximumSizeGib = Math.max(0, Number(maximumInput.value) || 0);
      applyAdoptionFilters();
    });
    maximumLabel.appendChild(maximumInput);

    const excludedLabel = createMediaFilterControl(
      document,
      adoptionFilterState.excludedFormats,
      (values) => {
        adoptionFilterState.excludedFormats = values;
        applyAdoptionFilters();
      }
    );

    const seedingSelect = document.createElement('select');
    ['All rows', 'Seeding only', 'Not seeding only'].forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      seedingSelect.appendChild(option);
    });
    seedingSelect.value = adoptionFilterState.seedingFilter;
    seedingSelect.addEventListener('change', () => {
      adoptionFilterState.seedingFilter = seedingSelect.value;
      applyAdoptionFilters();
    });

    const grabbedSelect = document.createElement('select');
    ['All grabbed states', 'Hide Grabbed', 'Show only Grabbed'].forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      grabbedSelect.appendChild(option);
    });
    grabbedSelect.value = adoptionFilterState.showOnlyGrabbedRows
      ? 'Show only Grabbed'
      : adoptionFilterState.hideGrabbedRows
        ? 'Hide Grabbed'
        : 'All grabbed states';
    grabbedSelect.addEventListener('change', () => {
      adoptionFilterState.hideGrabbedRows = grabbedSelect.value === 'Hide Grabbed';
      adoptionFilterState.showOnlyGrabbedRows = grabbedSelect.value === 'Show only Grabbed';
      applyAdoptionFilters();
    });

    const sortFieldLabel = document.createElement('label');
    sortFieldLabel.textContent = 'Sort by ';
    const sortFieldSelect = document.createElement('select');
    sortFieldSelect.id = 'ant-adoption-sort-field';
    ['Bounty / GiB', 'Bounty', 'Size', 'Torrent', 'Listing Time', 'Scan order'].forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      sortFieldSelect.appendChild(option);
    });
    sortFieldSelect.value = adoptionFilterState.sortField;
    sortFieldSelect.addEventListener('change', () => {
      adoptionFilterState.sortField = sortFieldSelect.value;
      applyDefaultAdoptionSort();
    });
    sortFieldLabel.appendChild(sortFieldSelect);

    const sortDirectionLabel = document.createElement('label');
    sortDirectionLabel.textContent = 'Direction ';
    const sortDirectionSelect = document.createElement('select');
    sortDirectionSelect.id = 'ant-adoption-sort-direction';
    ['Descending', 'Ascending'].forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      sortDirectionSelect.appendChild(option);
    });
    sortDirectionSelect.value = adoptionFilterState.sortDirection;
    sortDirectionSelect.addEventListener('change', () => {
      adoptionFilterState.sortDirection = sortDirectionSelect.value;
      applyDefaultAdoptionSort();
    });
    sortDirectionLabel.appendChild(sortDirectionSelect);

    sections.limits.appendChild(minimumPerGibLabel);
    createFilterCheckbox(
      sections.limits,
      'Hide below minimum bounty/GiB',
      'hideBelowBountyThreshold'
    );
    sections.limits.appendChild(minimumBountyLabel);
    createFilterCheckbox(sections.limits, 'Hide below minimum bounty', 'hideBelowMinimumBounty');
    sections.limits.appendChild(maximumLabel);
    createFilterCheckbox(sections.limits, 'Hide above maximum size', 'hideAboveMaximumSize');
    createFilterCheckbox(sections.media, 'Apply media filters', 'hideExcludedFormats');
    createFilterCheckbox(sections.media, 'Combine media filters', 'combineMediaFilters');
    sections.media.appendChild(excludedLabel);
    sections.media.appendChild(
      createExclusionGroupsControl(document, adoptionFilterState.exclusionGroups, (groups) => {
        adoptionFilterState.exclusionGroups = groups;
        applyAdoptionFilters();
      })
    );
    for (const [text, select] of [
      ['Grabbed status', grabbedSelect],
      ['Seeding status', seedingSelect]
    ]) {
      const label = document.createElement('label');
      label.textContent = text;
      label.appendChild(select);
      sections.visibility.appendChild(label);
    }
    createFilterCheckbox(sections.visibility, 'Hide ignored rows', 'hideIgnoredRows');
    createFilterCheckbox(sections.visibility, 'Hide trumpable rows', 'skipTrumpable');
    sections.sort.append(sortFieldLabel, sortDirectionLabel);

    const showAll = document.createElement('button');
    showAll.type = 'button';
    showAll.textContent = 'Show all';
    showAll.addEventListener('click', () => {
      adoptionFilterState.hideBelowBountyThreshold = false;
      adoptionFilterState.hideBelowMinimumBounty = false;
      adoptionFilterState.hideAboveMaximumSize = false;
      adoptionFilterState.hideExcludedFormats = false;
      adoptionFilterState.hideIgnoredRows = false;
      adoptionFilterState.hideGrabbedRows = false;
      adoptionFilterState.showOnlyGrabbedRows = false;
      adoptionFilterState.skipTrumpable = false;
      adoptionFilterState.seedingFilter = 'All rows';
      toolbar.querySelectorAll('input[data-filter-state]').forEach((input) => {
        input.checked = Boolean(adoptionFilterState[input.dataset.filterState]);
      });
      grabbedSelect.value = 'All grabbed states';
      seedingSelect.value = 'All rows';
      applyAdoptionFilters();
    });

    const saveSettings = document.createElement('button');
    saveSettings.type = 'button';
    saveSettings.textContent = 'Save page settings globally';
    saveSettings.addEventListener('click', () => {
      saveAdoptionFilterSettings();
      saveSettings.textContent = 'Page settings saved';
      setTimeout(() => {
        saveSettings.textContent = 'Save page settings globally';
      }, 1500);
    });

    const actions = document.createElement('div');
    actions.className = 'ant-filter-actions';
    actions.append(showAll, saveSettings);
    body.appendChild(actions);

    const mainToolbar = document.querySelector('#ant-cross-seed-toolbar');
    if (mainToolbar?.parentNode) {
      mainToolbar.insertAdjacentElement('afterend', toolbar);
    } else {
      document.querySelector('.thin, #content, body')?.prepend(toolbar);
    }
  }

  function refreshAdoptionViewFromSettings() {
    adoptionFilterState = getDefaultAdoptionFilterState();
    updateAdoptionScanButtons();
    if (!isFilteredAdoptionView()) return;
    document.querySelector('#ant-adoption-filter-toolbar')?.remove();
    decorateAdoptionRows();
    applyDefaultAdoptionSort();
    addAdoptionFilterControls();
    applyAdoptionFilters();
  }

  function updateAdoptionScanButtons() {
    const scanButton = document.querySelector('#ant-adoption-scan');
    if (scanButton) {
      if (!adoptionScanRunning) {
        scanButton.textContent = `Scan ${getScanPageCount()} adoption pages`;
      }
      scanButton.disabled = adoptionScanRunning;
    }
    const bountyScanButton = document.querySelector('#ant-adoption-scan-bounty');
    if (bountyScanButton) {
      const minimumBounty = getMinimumBounty();
      if (!adoptionScanRunning) bountyScanButton.textContent = getBountyScanButtonText();
      bountyScanButton.disabled = adoptionScanRunning || minimumBounty <= 0;
      bountyScanButton.title =
        minimumBounty > 0
          ? `Scans bounty-descending pages until the first bounty below ${minimumBounty}, up to ${MAX_SCAN_PAGES} pages.`
          : 'Set Minimum bounty above zero in Settings to enable this scan.';
    }
    updateOpenLastScanButton();
  }

  function markAdoptionRowAction(row, action, torrentId = '', refreshFilters = true) {
    const id = torrentId || row?.dataset?.antAdoptionTorrentId || getRowTorrentId(row);
    if (!row || !id) return false;
    setTorrentAction(id, action);
    row.dataset.antAdoptionAction = action;
    const select = row.querySelector(`.${ACTION_COLUMN_CLASS} select`);
    if (select) select.value = action;
    const rescan = row.querySelector('.ant-cross-seed-rescan-metadata');
    if (rescan) rescan.hidden = action !== 'broken';
    if (refreshFilters) applyAdoptionFilters(false);
    return true;
  }

  function markAdoptionRowGrabbed(row, torrentId = '') {
    return markAdoptionRowAction(row, 'grabbed', torrentId);
  }

  function markAdoptionRowIgnored(row, torrentId = '', refreshFilters = true) {
    const id = torrentId || row?.dataset?.antAdoptionTorrentId || getRowTorrentId(row);
    if (
      row?.dataset?.antAdoptionAction === 'grabbed' ||
      (id && getTorrentAction(id) === 'grabbed')
    ) {
      return false;
    }
    return markAdoptionRowAction(row, 'ignored', id, refreshFilters);
  }

  function updateOpenLastScanButton() {
    const button = document.querySelector('#ant-adoption-open-last-scan');
    if (!button) return;
    const hasSavedScan = Boolean(loadFilteredScan());
    button.hidden = false;
    button.disabled = adoptionScanRunning || !hasSavedScan;
    button.title = adoptionScanRunning
      ? 'Wait for the current scan to finish'
      : hasSavedScan
        ? 'Open the most recent filtered scan'
        : 'No saved scan is available';
  }

  function encodeCacheValue(value) {
    const json = JSON.stringify(value) ?? 'null';
    const compressed = `${CACHE_COMPRESSION_PREFIX}${LZString.compressToUTF16(json)}`;
    return compressed.length < json.length ? compressed : json;
  }

  function decodeCacheValue(raw) {
    if (typeof raw !== 'string') return raw;
    let json = raw;
    if (raw.startsWith(CACHE_COMPRESSION_PREFIX)) {
      json = LZString.decompressFromUTF16(raw.slice(CACHE_COMPRESSION_PREFIX.length));
      if (json === null) throw new TypeError('Invalid compressed cache payload.');
    }
    return JSON.parse(json);
  }

  function hashCacheKey(key) {
    let hash = 2166136261;
    const value = String(key || '');
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.codePointAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${(hash >>> 0).toString(36)}-${value.length.toString(36)}`;
  }

  function cacheStorageKey(key) {
    return `${CACHE_STORAGE_PREFIX}${hashCacheKey(key)}`;
  }

  function encodeCacheEntry(key, value) {
    return encodeCacheValue({ k: key, v: value });
  }

  function decodeCacheEntry(raw, fallbackKey = null) {
    const decoded = decodeCacheValue(raw);
    if (
      decoded &&
      typeof decoded === 'object' &&
      !Array.isArray(decoded) &&
      typeof decoded.k === 'string' &&
      Object.hasOwn(decoded, 'v')
    ) {
      return decoded;
    }
    return { k: fallbackKey, v: decoded };
  }

  function readCacheEntry(key) {
    const storedKey = cacheStorageKey(key);
    const raw = GM_getValue(storedKey, null);
    if (raw) {
      const entry = decodeCacheEntry(raw);
      if (entry.k === key) return entry;
      debugLog('cache hash collision ignored', { key, storedKey, storedEntryKey: entry.k });
    }

    return null;
  }

  function storedCacheEntryMatchesAnyPrefix(storedKey, prefixes) {
    const raw = GM_getValue(storedKey, null);
    if (typeof raw !== 'string') return false;
    try {
      const entry = decodeCacheEntry(raw);
      return prefixes.some((prefix) => String(entry.k || '').startsWith(prefix));
    } catch (error) {
      debugLog('cache prefix check failed', { storedKey, error });
      return false;
    }
  }

  function cacheGet(key, fallback = null) {
    if (!GM_config.get('use_cache')) {
      debugLog('cache disabled', { key });
      return fallback;
    }
    try {
      const entry = readCacheEntry(key);
      if (!entry || entry.k !== key) {
        debugLog('cache miss', { key });
        return fallback;
      }

      debugLog('cache hit', { key });
      return entry.v;
    } catch (error) {
      debugLog('cache parse failed', { key, error });
      return fallback;
    }
  }

  function cacheSet(key, value) {
    if (!GM_config.get('use_cache')) return;
    GM_setValue(cacheStorageKey(key), encodeCacheEntry(key, value));
    debugLog('cache write', { key });
  }

  function cacheDelete(key) {
    try {
      GM_deleteValue(cacheStorageKey(key));
      debugLog('cache delete', { key });
      return true;
    } catch (error) {
      debugLog('cache delete failed', { key, error });
      return false;
    }
  }

  function deleteCacheByPrefixes(prefixes) {
    const keys = GM_listValues().filter((storedKey) =>
      String(storedKey).startsWith(CACHE_STORAGE_PREFIX)
        ? storedCacheEntryMatchesAnyPrefix(storedKey, prefixes)
        : false
    );
    keys.forEach((storedKey) => GM_deleteValue(storedKey));
    debugLog('cache prefixes deleted', { prefixes, count: keys.length });
    return keys.length;
  }

  function cleanSiteLookupCache() {
    const count = deleteCacheByPrefixes([
      'tracker-results-v6:',
      'tracker-results-v5:',
      'tracker-results-v4:',
      'row-processing-v1:',
      'row-fully-completed-v1:',
      'row-complete-v3:',
      'tracker-result-v2:',
      'row-complete-v2:',
      'tracker-result:',
      'row-complete:',
      'matches:',
      'qui-result:'
    ]);
    alert(`Cleaned ${count} site lookup cache entr${count === 1 ? 'y' : 'ies'}.`);
  }

  function cleanAntCache() {
    const count = deleteCacheByPrefixes(['ant-metadata-v2:', 'ant-metadata:', 'ant-filename:']);
    alert(`Cleaned ${count} ANT cache entr${count === 1 ? 'y' : 'ies'}.`);
  }

  function cacheHas(key) {
    if (!GM_config.get('use_cache')) return false;
    try {
      return readCacheEntry(key)?.k === key;
    } catch {
      return false;
    }
  }

  async function cachedLookup(key, resolver) {
    if (cacheHas(key)) {
      debugLog('cached lookup hit', { key });
      return cacheGet(key);
    }
    debugLog('cached lookup miss', { key });
    const value = await resolver();
    cacheSet(key, value);
    return value;
  }

  async function requestAntPage(url, pageDescription) {
    const pageWindow = typeof unsafeWindow === 'undefined' ? globalThis : unsafeWindow;
    debugLog('ANT page request', { url });
    const response = await pageWindow.fetch(url, {
      mode: 'same-origin',
      credentials: 'same-origin',
      signal: pageWindow.AbortSignal.timeout(30000)
    });
    const html = await response.text();
    debugLog('ANT page response', {
      url,
      finalUrl: response.url,
      status: response.status,
      responseLength: html.length
    });
    if (!response.ok) {
      const advice = [401, 403].includes(response.status)
        ? ' Open ANT in this browser, sign in or complete any security check, then retry.'
        : '';
      throw new Error(`${pageDescription} returned HTTP ${response.status}.${advice}`);
    }
    return html;
  }

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      debugLog('HTTP request', {
        method: options.method || 'GET',
        url: options.url,
        headers: options.headers,
        hasData: options.data !== undefined
      });
      GM_xmlhttpRequest({
        timeout: 30000,
        ...options,
        onload: (response) => {
          debugLog('HTTP response', {
            method: options.method || 'GET',
            url: options.url,
            status: response.status,
            responseLength: response.responseText?.length || 0
          });
          resolve(response);
        },
        ontimeout: (error) => {
          debugLog('HTTP timeout', { method: options.method || 'GET', url: options.url, error });
          reject(error);
        },
        onerror: (error) => {
          debugLog('HTTP error', { method: options.method || 'GET', url: options.url, error });
          reject(error);
        }
      });
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new TypeError('Icon FileReader returned a non-string result.'));
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read icon blob.'));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchIconDataUrl(site, iconUrl) {
    const response = await gmRequest({
      method: 'GET',
      url: iconUrl,
      responseType: 'blob',
      overrideMimeType: 'text/plain; charset=x-user-defined'
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} fetching ${iconUrl}`);
    }
    const blob = response.response;
    if (!(blob instanceof Blob)) {
      throw new TypeError(`No icon blob returned for ${site}.`);
    }
    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl.startsWith('data:')) {
      throw new Error(`Invalid data URL generated for ${site}.`);
    }
    return dataUrl;
  }

  function iconCacheKey(site, iconUrl) {
    return `site-icon:${site}:${iconUrl}`;
  }

  function getTrackerIconUrl(site) {
    return siteIcons[site] || '';
  }

  function getCachedIconDataUrl(site, iconUrl = getTrackerIconUrl(site)) {
    if (!site || !iconUrl) return '';
    return cacheGet(iconCacheKey(site, iconUrl), '');
  }

  function ensureIconDataUrl(site, iconUrl = getTrackerIconUrl(site)) {
    if (!site || !iconUrl) return Promise.resolve('');

    const key = iconCacheKey(site, iconUrl);
    const cached = cacheGet(key, '');
    if (cached) {
      debugLog('icon cache hit', { site, iconUrl });
      return Promise.resolve(cached);
    }

    if (iconDataUrlPromises.has(key)) return iconDataUrlPromises.get(key);

    debugLog('icon cache miss', { site, iconUrl });
    const promise = fetchIconDataUrl(site, iconUrl)
      .then((dataUrl) => {
        cacheSet(key, dataUrl);
        debugLog('icon cached as data URL', {
          site,
          iconUrl,
          dataUrlLength: dataUrl.length
        });
        return dataUrl;
      })
      .catch((error) => {
        debugLog('icon data URL fetch failed', { site, iconUrl, error });
        console.warn('Tracker icon cache failed:', site, error);
        return '';
      });
    iconDataUrlPromises.set(key, promise);
    return promise;
  }

  async function requestJson(options) {
    const response = await gmRequest(options);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} from ${redactDebugUrl(options.url)}`);
    }
    try {
      return JSON.parse(response.responseText);
    } catch (error) {
      const preview = String(response.responseText || '')
        .slice(0, 160)
        .replaceAll(/\s+/g, ' ')
        .trim();
      throw new SyntaxError(
        `Invalid JSON from ${redactDebugUrl(options.url)}: ${error.message || error}. Response preview: ${preview}`
      );
    }
  }

  function getRows() {
    return [...document.querySelectorAll('tr.torrent.torrent_row.zeroseed')].filter(
      (row) => !row.hidden
    );
  }

  function getRowTorrentId(row) {
    const download = row.querySelector('a[href*="torrents.php?action=download"][href*="id="]');
    const href = download?.getAttribute('href') || '';
    return href.match(/[?&]id=(\d+)/)?.[1] || null;
  }

  function getRowGroupId(row) {
    const details = row.querySelector('a[href*="torrents.php?id="][href*="torrentid="]');
    const href = details?.getAttribute('href') || '';
    return href.match(/[?&]id=(\d+)/)?.[1] || null;
  }

  function getRowDownloadUrl(row) {
    const download = row.querySelector('a[href*="torrents.php?action=download"][href*="id="]');
    if (!download) return '';
    return new URL(download.getAttribute('href'), globalThis.location.origin).href;
  }

  function isTrumpableRow(row) {
    return !!row.querySelector('.tl_trumpable') || /\bTrumpable\b/i.test(row.textContent || '');
  }

  function shouldSkipTrumpableRows() {
    return adoptionFilterState
      ? Boolean(adoptionFilterState.skipTrumpable)
      : Boolean(GM_config.get('skip_trumpable'));
  }

  function isM2tsRow(row) {
    return /\bm2ts\b/i.test(row.textContent || '');
  }

  function getRowTags(row) {
    let tags = row.querySelector('.tags');
    if (!tags) {
      const info = row.querySelector('.group_info');
      tags = document.createElement('div');
      tags.className = 'tags';
      if (info) info.appendChild(tags);
    }
    return tags;
  }

  function getRowTagNames(row) {
    const tags = row.querySelector('.tags');
    if (!tags) return [];
    return [...tags.querySelectorAll('a')]
      .map((tag) => tag.textContent.trim().toLowerCase())
      .filter(Boolean);
  }

  function shouldSearchOtwForRow(row) {
    const tagNames = getRowTagNames(row);
    return tagNames.includes('animation') || tagNames.includes('family');
  }

  function getRowYear(row) {
    const match = /\[(\d{4})\]/.exec(row?.textContent || '');
    return match ? Number.parseInt(match[1], 10) : null;
  }

  function shouldSearchRmcForRow(row) {
    const year = getRowYear(row);
    return Number.isFinite(year) && year <= 2000;
  }

  function getTrackersForRow(row, trackers) {
    const allowOtw = shouldSearchOtwForRow(row);
    const allowRmc = shouldSearchRmcForRow(row);
    const filtered = trackers.filter((tracker) => {
      if (tracker.site === 'OTW') return allowOtw;
      if (tracker.site === 'RMC') return allowRmc;
      return true;
    });
    if (filtered.length !== trackers.length) {
      debugLog('row-specific tracker filters applied', {
        tags: getRowTagNames(row),
        year: getRowYear(row),
        skipped: trackers
          .filter((tracker) => !filtered.some((candidate) => candidate.site === tracker.site))
          .map((tracker) => tracker.site)
      });
    }
    return filtered;
  }

  function getRowInlineMount(row) {
    let mount = row.querySelector('.ant-cross-seed-inline');
    if (mount) return mount;

    mount = document.createElement('div');
    mount.className = 'ant-cross-seed-inline';
    const tags = getRowTags(row);
    if (tags?.parentNode) {
      tags.parentNode.insertBefore(mount, tags.nextSibling);
    } else {
      getRowInfo(row).appendChild(mount);
    }
    return mount;
  }

  function getRowTitleLink(row) {
    return (
      row.querySelector(
        'td.big_info .group_info > a[href*="torrents.php?id="][href*="torrentid="]'
      ) || row.querySelector('td.big_info a[href*="torrents.php?id="][href*="torrentid="]')
    );
  }

  function snapshotRowTitleLink(row) {
    const link = getRowTitleLink(row);
    if (!link) return null;
    return {
      href: link.getAttribute('href') || '',
      clone: link.cloneNode(true)
    };
  }

  function restoreRowTitleLink(row, snapshot) {
    if (!snapshot?.href || getRowTitleLink(row)) return;
    const info = getRowInfo(row);
    const tags = row.querySelector('.tags');
    const restored = snapshot.clone.cloneNode(true);
    if (tags?.parentNode === info) {
      tags.before(restored);
    } else {
      info.appendChild(restored);
    }
    debugLog('restored missing ANT title link', { href: snapshot.href });
  }

  function getRowInfo(row) {
    return row.querySelector('.group_info') || row.querySelector('.big_info') || row;
  }

  function setRowState(row, text, state = '') {
    let marker = row.querySelector('.ant-cross-seed-state');
    if (!marker) {
      marker = document.createElement('span');
      marker.className = 'ant-cross-seed-state';
      getRowInlineMount(row).appendChild(marker);
    }
    marker.textContent = text;
    marker.dataset.state = state;
  }

  function normalizeFilename(value) {
    return basename(value).trim().toLowerCase();
  }

  function basename(value) {
    return String(value || '')
      .split(/[\\/]/)
      .pop();
  }

  function dirname(value) {
    const path = String(value || '').replace(/[\\/]+$/, '');
    const separatorIndex = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
    if (separatorIndex < 0) return '';
    const parent = path.slice(0, separatorIndex);
    if (/^[A-Za-z]:$/.test(parent)) return `${parent}${path[separatorIndex]}`;
    return parent || path[separatorIndex];
  }

  function stripExtension(value) {
    return String(value || '').replace(/\.[^.]+$/, '');
  }

  function stripTorrentExtension(value) {
    return String(value || '').replace(/\.torrent$/i, '');
  }

  function isVideoFile(value) {
    const extension = String(value || '')
      .split('.')
      .pop()
      ?.toLowerCase();
    return VIDEO_EXTENSIONS.has(extension || '');
  }

  function filenameMatches(candidate, targetFilename) {
    const target = normalizeFilename(targetFilename);
    const candidateName = normalizeFilename(candidate);
    if (!target || !candidateName) return false;
    if (candidateName === target) return true;

    const targetBase = stripExtension(target);
    const candidateBase = stripExtension(candidateName);
    return !!targetBase && candidateBase === targetBase;
  }

  function exactFilenameMatches(candidate, targetFilename) {
    const target = normalizeFilename(targetFilename);
    const candidateName = normalizeFilename(candidate);
    return !!target && !!candidateName && candidateName === target;
  }

  function videoFilesForMatch(files) {
    return normalizeFileList(files).filter((file) => isVideoFile(file.name));
  }

  function candidateMatchesAntFiles(candidateFiles, antMetadata, releaseFallback = '') {
    const antFiles = videoFilesForMatch(antMetadata?.files || []);
    const trackerFiles = videoFilesForMatch(candidateFiles);
    const antFilename = antMetadata?.filename || '';

    if (antFiles.length > 0 && trackerFiles.length > 0) {
      const trackerFileNames = new Set(trackerFiles.map((file) => normalizeFilename(file.name)));
      return antFiles.every((file) => trackerFileNames.has(normalizeFilename(file.name)));
    }

    if (antFiles.length > 1) return false;
    const fallback = stripTorrentExtension(releaseFallback);
    return (
      exactFilenameMatches(fallback, antFilename) ||
      (antFiles.length === 1 && exactFilenameMatches(fallback, antFiles[0].name))
    );
  }

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll(/[._-]+/g, ' ')
      .replaceAll(/\s+/g, ' ');
  }

  function normalizeHost(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split(':')[0];
  }

  function safeHostFromUrl(value) {
    try {
      return normalizeHost(new URL(String(value || '')).hostname);
    } catch {
      return '';
    }
  }

  function extractUrls(value) {
    return String(value || '').match(/https?:\/\/[^\s"'<>]+/g) || [];
  }

  function normalizeFileEntry(file) {
    const name =
      typeof file === 'string'
        ? file
        : file?.name ||
          file?.Name ||
          file?.filename ||
          file?.Filename ||
          file?.fileName ||
          file?.FileName ||
          file?.path ||
          file?.Path ||
          '';
    return {
      name: basename(name),
      path: String(name || ''),
      size: Number.parseInt(file?.size || file?.Size || file?.bytes || file?.Bytes || '0', 10) || 0
    };
  }

  function normalizeFileList(files) {
    return (Array.isArray(files) ? files : []).map(normalizeFileEntry).filter((file) => file.name);
  }

  function getObjectFileList(item) {
    const attributes = item?.attributes || {};
    const candidates = [
      item?.files,
      item?.Files,
      item?.fileList,
      item?.FileList,
      item?.file_list,
      item?.filelist,
      attributes.files,
      attributes.Files,
      attributes.fileList,
      attributes.FileList
    ];
    const files = candidates.find((candidate) => Array.isArray(candidate));
    return normalizeFileList(files);
  }

  function findLargestVideoFile(files) {
    const normalized = normalizeFileList(files).filter((file) => isVideoFile(file.name));

    normalized.sort((a, b) => b.size - a.size);
    return normalized[0]?.name || null;
  }

  function normalizeImdbId(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const prefixed = /tt\d{5,}/i.exec(text)?.[0];
    if (prefixed) return prefixed.toLowerCase();
    const numeric = /\b\d{5,}\b/.exec(text)?.[0];
    return numeric ? `tt${numeric}` : '';
  }

  function imdbIdNumber(imdbId) {
    return normalizeImdbId(imdbId).replace(/^tt/i, '');
  }

  function antMetadataCacheKey(torrentId) {
    return `ant-metadata-v2:${torrentId}`;
  }

  function extractImdbIdFromAntRatings(doc) {
    const ratings = doc.querySelector('div.box.torrent_ratings');
    if (!ratings) return '';

    const imdbLink = [...ratings.querySelectorAll('a[href]')]
      .map((link) => link.getAttribute('href') || '')
      .find((href) => /imdb\.com\/title\/tt\d+/i.test(href) || /tt\d{5,}/i.test(href));
    return normalizeImdbId(imdbLink || ratings.textContent);
  }

  async function getAntMetadata(torrentId, groupId, refreshCache = false) {
    debugLog('ANT HTML metadata lookup start', { torrentId, groupId });
    const cacheKey = antMetadataCacheKey(torrentId);
    const cached = cacheGet(cacheKey);
    if (!refreshCache && cached?.filename) {
      debugLog('ANT metadata lookup cache result', { torrentId, metadata: cached });
      return cached;
    }

    const metadata = await getAntMetadataFromHtml(torrentId, groupId);
    debugLog('ANT HTML metadata result', { torrentId, groupId, metadata });
    if (metadata?.filename) {
      cacheSet(cacheKey, metadata);
      return metadata;
    }

    throw new Error(`Could not resolve ANT metadata for torrent ${torrentId}.`);
  }

  async function getAntMetadataFromHtml(torrentId, groupId) {
    if (!groupId) return null;
    const url = `https://anthelion.me/torrents.php?id=${encodeURIComponent(groupId)}&torrentid=${encodeURIComponent(torrentId)}`;
    const html = await requestAntPage(url, `ANT torrent ${torrentId}`);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const files = [
      ...doc.querySelectorAll(
        `#files_${CSS.escape(torrentId)} td:first-child, tr[id="torrent_${CSS.escape(torrentId)}"] td:first-child`
      )
    ]
      .map((cell) => cell.textContent.trim())
      .filter(Boolean);
    debugLog('ANT HTML filename candidates', { torrentId, groupId, files });
    const normalizedFiles = normalizeFileList(files).filter((file) => isVideoFile(file.name));
    const filename = findLargestVideoFile(normalizedFiles);
    const imdbId = extractImdbIdFromAntRatings(doc);
    debugLog('ANT HTML IMDb candidate', { torrentId, groupId, imdbId });
    if (!filename) return null;
    return {
      filename,
      files: normalizedFiles,
      imdbId
    };
  }

  function getUnit3dConfig(tracker) {
    const enabled = GM_config.get(tracker.key);
    const apiToken = String(GM_config.get(`${tracker.key}_api`) || '').trim();
    const baseUrl =
      typeof tracker.baseUrl === 'function'
        ? cleanBaseUrl(tracker.baseUrl())
        : cleanBaseUrl(tracker.baseUrl);
    return { enabled, apiToken, baseUrl };
  }

  function parseRequiredTrackerSeeders(value, site) {
    const normalized = String(value ?? '')
      .replaceAll(',', '')
      .trim();
    if (!/^\d+$/.test(normalized)) {
      throw new TypeError(`${site} returned an invalid torrent entry.`);
    }
    return Number.parseInt(normalized, 10);
  }

  function isNonemptyString(value) {
    return typeof value === 'string' && Boolean(value.trim());
  }

  function isValidTrackerId(value) {
    return (
      (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) &&
      Boolean(String(value).trim())
    );
  }

  async function searchUnit3dTracker(tracker, antMetadata) {
    const { enabled, apiToken, baseUrl } = getUnit3dConfig(tracker);
    const imdbNumber = imdbIdNumber(antMetadata?.imdbId);
    debugLog('Unit3D tracker config', {
      site: tracker.site,
      enabled,
      hasApiToken: Boolean(apiToken),
      baseUrl,
      imdbId: antMetadata?.imdbId,
      filename: antMetadata?.filename
    });
    if (!enabled || !apiToken || !baseUrl || !imdbNumber) {
      debugLog('Unit3D tracker skipped', {
        site: tracker.site,
        enabled,
        hasApiToken: Boolean(apiToken),
        hasBaseUrl: Boolean(baseUrl),
        hasImdbId: Boolean(imdbNumber)
      });
      return null;
    }

    const params = new URLSearchParams();
    params.set('imdbId', imdbNumber);
    params.set('perPage', '100');

    const json = await requestJson({
      method: 'GET',
      url: `${baseUrl}${tracker.searchPath || '/api/torrents/filter'}?${params.toString()}`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json'
      }
    });
    if (!Array.isArray(json?.data)) {
      throw new TypeError(`${tracker.site} returned an invalid search response.`);
    }
    const data = json.data;
    const matches = data
      .map((entry) => unit3dMatchToResult(tracker.site, baseUrl, entry, antMetadata))
      .filter(Boolean);
    debugLog('Unit3D tracker search result', {
      site: tracker.site,
      imdbId: antMetadata?.imdbId,
      filename: antMetadata?.filename,
      rawCount: data.length,
      strictMatchCount: matches.length,
      best: pickBestMatch(matches)
    });

    return pickBestMatch(matches);
  }

  function unit3dMatchToResult(site, baseUrl, entry, antMetadata) {
    const attributes = entry?.attributes;
    const id = entry?.id || attributes?.id || attributes?.torrent_id;
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      !attributes ||
      typeof attributes !== 'object' ||
      Array.isArray(attributes) ||
      !isNonemptyString(attributes.name) ||
      (!isValidTrackerId(id) && !isNonemptyString(attributes.download_link))
    ) {
      throw new TypeError(`${site} returned an invalid torrent entry.`);
    }
    const seeders = parseRequiredTrackerSeeders(attributes.seeders ?? attributes.seed, site);
    const files = getObjectFileList(entry);
    if (!candidateMatchesAntFiles(files, antMetadata, attributes.name)) return null;

    return {
      site,
      seeders,
      downloadUrl: attributes.download_link || (id ? `${baseUrl}/torrents/download/${id}` : ''),
      detailsUrl: attributes.details_link || (id ? `${baseUrl}/torrents/${id}` : ''),
      title: attributes.name || antMetadata.filename
    };
  }

  async function searchBhd(antMetadata) {
    const filename = antMetadata?.filename || '';
    if (!GM_config.get('bhd')) {
      debugLog('BHD skipped', { reason: 'disabled', filename });
      return null;
    }
    const apiKey = String(GM_config.get('bhd_api') || '').trim();
    const rssKey = String(GM_config.get('bhd_rss') || '').trim();
    if (!apiKey || !rssKey) {
      debugLog('BHD skipped', {
        reason: 'missing credentials',
        hasApiKey: Boolean(apiKey),
        hasRssKey: Boolean(rssKey),
        filename
      });
      return null;
    }
    if (!filename) {
      debugLog('BHD skipped', { reason: 'missing ANT filename' });
      return null;
    }

    const json = await requestJson({
      method: 'POST',
      url: `https://beyond-hd.me/api/torrents/${encodeURIComponent(apiKey)}`,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: JSON.stringify({
        action: 'search',
        rsskey: rssKey,
        file_name: filename
      })
    });

    if (!Array.isArray(json?.results)) {
      throw new TypeError('BHD returned an invalid search response.');
    }
    const matches = json.results.map((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        !isNonemptyString(item.name) ||
        !isNonemptyString(item.download_url)
      ) {
        throw new TypeError('BHD returned an invalid torrent entry.');
      }
      return {
        site: 'BHD',
        seeders: parseRequiredTrackerSeeders(item.seeders ?? item.seed, 'BHD'),
        downloadUrl: item.download_url,
        detailsUrl: item.url || '',
        title: item.name
      };
    });
    debugLog('BHD search result', {
      imdbId: antMetadata?.imdbId,
      filename,
      rawCount: json?.results?.length || 0,
      strictMatchCount: matches.length,
      best: pickBestMatch(matches)
    });

    return pickBestMatch(matches);
  }

  async function searchHdb(antMetadata) {
    const filename = antMetadata?.filename || '';
    if (!GM_config.get('hdb')) {
      debugLog('HDB skipped', { reason: 'disabled', filename });
      return null;
    }
    const username = String(GM_config.get('hdb_user') || '').trim();
    const passkey = String(GM_config.get('hdb_pass') || '').trim();
    if (!username || !passkey) {
      debugLog('HDB skipped', {
        reason: 'missing credentials',
        hasUsername: Boolean(username),
        hasPasskey: Boolean(passkey),
        filename
      });
      return null;
    }
    if (!filename) {
      debugLog('HDB skipped', { reason: 'missing ANT filename' });
      return null;
    }
    const json = await requestJson({
      method: 'POST',
      url: 'https://hdbits.org/api/torrents',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: JSON.stringify({
        username,
        passkey,
        limit: 100,
        file_in_torrent: filename
      })
    });

    if (!Array.isArray(json?.data)) {
      throw new TypeError('HDB returned an invalid search response.');
    }
    const matches = json.data.map((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        !isValidTrackerId(item.id) ||
        !isNonemptyString(item.filename)
      ) {
        throw new TypeError('HDB returned an invalid torrent entry.');
      }
      return {
        site: 'HDB',
        seeders: parseRequiredTrackerSeeders(item.seeders, 'HDB'),
        downloadUrl: `https://hdbits.org/download.php/${encodeURIComponent(item.filename)}?id=${encodeURIComponent(item.id)}&passkey=${encodeURIComponent(passkey)}`,
        detailsUrl: `https://hdbits.org/details.php?id=${encodeURIComponent(item.id)}`,
        title: item.name || stripTorrentExtension(item.filename) || filename
      };
    });
    debugLog('HDB search result', {
      filename,
      rawCount: json?.data?.length || 0,
      strictMatchCount: matches.length,
      best: pickBestMatch(matches)
    });

    return pickBestMatch(matches);
  }

  async function searchPtp(antMetadata) {
    const filename = antMetadata?.filename || '';
    if (!GM_config.get('ptp')) {
      debugLog('PTP skipped', { reason: 'disabled', filename });
      return null;
    }
    if (antMetadata?.isM2tsRow) {
      debugLog('PTP skipped', { reason: 'm2ts row', filename });
      return null;
    }
    const apiUser = String(GM_config.get('ptp_api_user') || '').trim();
    const apiKey = String(GM_config.get('ptp_api_key') || '').trim();
    if (!apiUser || !apiKey) {
      debugLog('PTP skipped', {
        reason: 'missing credentials',
        hasApiUser: Boolean(apiUser),
        hasApiKey: Boolean(apiKey),
        filename
      });
      return null;
    }

    const userAgent =
      globalThis.navigator?.userAgent || 'ANT Adoption Filename Cross-Seed Userscript';
    const searchUrl = `https://passthepopcorn.me/torrents.php?filelist=${encodeURIComponent(filename)}&json=noredirect&grouping=0`;
    const searchJson = await requestJson({
      method: 'GET',
      url: searchUrl,
      headers: {
        ApiUser: apiUser,
        ApiKey: apiKey,
        'User-Agent': userAgent,
        Accept: 'application/json'
      }
    });
    let movies;
    if (Array.isArray(searchJson?.Movies)) {
      movies = searchJson.Movies;
    } else if (searchJson?.GroupId && Array.isArray(searchJson?.Torrents)) {
      movies = [searchJson];
    } else {
      throw new TypeError('PTP returned an invalid search response.');
    }
    const authKey = isNonemptyString(searchJson?.AuthKey) ? searchJson.AuthKey.trim() : '';
    const passKey = isNonemptyString(searchJson?.PassKey) ? searchJson.PassKey.trim() : '';
    if (
      movies.some(
        (movie) =>
          !movie ||
          typeof movie !== 'object' ||
          Array.isArray(movie) ||
          !isValidTrackerId(movie.GroupId) ||
          !Array.isArray(movie.Torrents)
      )
    ) {
      throw new TypeError('PTP returned an invalid movie entry.');
    }
    const torrents = movies.flatMap((movie) => movie.Torrents);
    if (
      torrents.some(
        (torrent) =>
          !torrent ||
          typeof torrent !== 'object' ||
          Array.isArray(torrent) ||
          !isValidTrackerId(torrent.Id) ||
          !isNonemptyString(torrent.ReleaseName) ||
          !/^\d+$/.test(
            String(torrent.Seeders ?? '')
              .replaceAll(',', '')
              .trim()
          )
      ) ||
      (torrents.length > 0 && (!authKey || !passKey))
    ) {
      throw new TypeError('PTP returned an invalid torrent entry.');
    }
    const matches = movies.flatMap((movie) =>
      movie.Torrents.filter((torrent) => ptpTorrentMatches(torrent, antMetadata)).map((torrent) => {
        const torrentId = String(torrent.Id || '').trim();
        const groupId = String(movie.GroupId || '').trim();
        const seeders = parseRequiredTrackerSeeders(torrent.Seeders, 'PTP');
        const detailsUrl = `https://passthepopcorn.me/torrents.php?id=${encodeURIComponent(groupId)}&torrentid=${encodeURIComponent(torrentId)}#torrent${encodeURIComponent(torrentId)}`;
        return {
          site: 'PTP',
          seeders,
          downloadUrl: `https://passthepopcorn.me/torrents.php?action=download&id=${encodeURIComponent(torrentId)}&authkey=${encodeURIComponent(authKey)}&torrent_pass=${encodeURIComponent(passKey)}`,
          detailsUrl,
          title: torrent.ReleaseName || filename
        };
      })
    );
    debugLog('PTP filelist search result', {
      filename,
      movieCount: movies.length,
      rawTorrentCount: movies.reduce(
        (count, movie) => count + (Array.isArray(movie.Torrents) ? movie.Torrents.length : 0),
        0
      ),
      strictMatchCount: matches.length,
      best: pickBestMatch(matches)
    });

    return pickBestMatch(matches);
  }

  function ptpTorrentMatches(torrent, antMetadata) {
    return candidateMatchesAntFiles(getObjectFileList(torrent), antMetadata, torrent?.ReleaseName);
  }

  function buildProxySearchCandidateUrls(baseUrl, tokenValue) {
    const normalizedBaseUrl = cleanBaseUrl(baseUrl);
    const token = sanitizeUrlToken(tokenValue);
    if (!normalizedBaseUrl || !token) return [];

    const urls = [];
    if (/\/proxy\/[^/]+\/api\/v2\/torrents\/search$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, normalizedBaseUrl);
      return urls;
    }
    if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/search`);
      return urls;
    }
    if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, `${normalizedBaseUrl}/torrents/search`);
      return urls;
    }
    if (/\/api\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/search`);
      return urls;
    }

    pushUniqueUrl(urls, `${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/search`);
    return urls;
  }

  function buildProxyAddCandidateUrls(baseUrl, tokenValue) {
    const normalizedBaseUrl = cleanBaseUrl(baseUrl);
    const token = sanitizeUrlToken(tokenValue);
    if (!normalizedBaseUrl || !token) return [];

    const urls = [];
    if (/\/proxy\/[^/]+\/api\/v2\/torrents\/add$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, normalizedBaseUrl);
      return urls;
    }
    if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/add`);
      return urls;
    }
    if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, `${normalizedBaseUrl}/torrents/add`);
      return urls;
    }
    if (/\/api\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
      pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/add`);
      return urls;
    }

    pushUniqueUrl(urls, `${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/add`);
    pushUniqueUrl(urls, `${normalizedBaseUrl}/api/proxy/${token}/api/v2/torrents/add`);
    return urls;
  }

  function buildProxyFilesCandidateUrls(baseUrl, tokenValue) {
    return buildProxySearchCandidateUrls(baseUrl, tokenValue).map((url) =>
      url.replace(/\/search$/i, '/files')
    );
  }

  function buildProxySearchUrl(searchBaseUrl, config, searchTerm = '') {
    const queryParts = [
      ...(searchTerm ? [`search=${encodeURIComponent(searchTerm)}`] : []),
      'sort=added_on',
      'reverse=true',
      `limit=${encodeURIComponent(String(config.limit))}`
    ];
    return `${searchBaseUrl}?${queryParts.join('&')}`;
  }

  function parsequiResults(responseText) {
    let parsed;
    try {
      parsed = JSON.parse(responseText || '');
    } catch {
      throw new TypeError('Invalid qui JSON response.');
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.torrents)) return parsed.torrents;
    if (parsed?.torrents === null && parsed.total === 0) return [];
    throw new TypeError('Invalid qui response shape.');
  }

  function validatequiTorrentResults(results) {
    if (
      !Array.isArray(results) ||
      results.some(
        (item) =>
          !item || typeof item !== 'object' || Array.isArray(item) || !isNonemptyString(item.name)
      )
    ) {
      throw new TypeError('Invalid qui torrent entry.');
    }
    return results;
  }

  async function queryqui(config, searchTerm = '', shouldContinue = () => true) {
    const candidateUrls = buildProxySearchCandidateUrls(config.baseUrl, config.token);
    if (candidateUrls.length === 0) {
      throw new Error('Missing qui base URL or token.');
    }

    debugLog('qui search start', {
      searchTerm,
      baseUrl: config.baseUrl,
      hasToken: Boolean(config.token),
      limit: config.limit,
      candidateUrls
    });
    const attempted = [];
    for (const baseUrl of candidateUrls) {
      if (!shouldContinue()) return [];
      const url = buildProxySearchUrl(baseUrl, config, searchTerm);
      attempted.push(url);
      try {
        const response = await gmRequest({ method: 'GET', url });
        if (!shouldContinue()) return [];
        if (response.status >= 200 && response.status < 300) {
          const results = validatequiTorrentResults(parsequiResults(response.responseText));
          debugLog('qui search candidate succeeded', {
            searchTerm,
            url,
            rawCount: results.length
          });
          return results;
        }
        debugLog('qui search candidate rejected', { searchTerm, url, status: response.status });
        if (![401, 403, 404].includes(response.status)) {
          throw new Error(`Search failed with ${response.status}`);
        }
      } catch (error) {
        debugLog('qui search candidate failed', { searchTerm, url, error });
        if (baseUrl === candidateUrls.at(-1)) {
          throw new Error(
            `qui search failed: ${redactDebugUrl(error?.message || error)} (${attempted.map(redactDebugUrl).join(' | ')})`
          );
        }
      }
    }

    throw new Error(`qui search failed (${attempted.map(redactDebugUrl).join(' | ')})`);
  }

  async function queryquiFiles(config, hash, shouldContinue = () => true) {
    const candidateUrls = buildProxyFilesCandidateUrls(config.baseUrl, config.token);
    if (candidateUrls.length === 0 || !hash) {
      throw new Error('Missing qui base URL, token, or torrent hash.');
    }

    const attempted = [];
    for (const baseUrl of candidateUrls) {
      if (!shouldContinue()) return [];
      const url = `${baseUrl}?hash=${encodeURIComponent(hash)}`;
      attempted.push(url);
      try {
        const response = await gmRequest({ method: 'GET', url });
        if (!shouldContinue()) return [];
        if (response.status >= 200 && response.status < 300) {
          return parsequiResults(response.responseText);
        }
        if (![401, 403, 404].includes(response.status)) {
          throw new Error(`File lookup failed with ${response.status}`);
        }
      } catch (error) {
        debugLog('qui file candidate failed', { hash, url, error });
        if (baseUrl === candidateUrls.at(-1)) {
          throw new Error(
            `qui file lookup failed: ${redactDebugUrl(error?.message || error)} (${attempted.map(redactDebugUrl).join(' | ')})`
          );
        }
      }
    }

    throw new Error(`qui file lookup failed (${attempted.map(redactDebugUrl).join(' | ')})`);
  }

  async function postToqui(config, urls, shouldContinue = () => true) {
    const candidateUrls = buildProxyAddCandidateUrls(config.baseUrl, config.token);
    if (candidateUrls.length === 0) {
      throw new Error('Missing qui base URL or token.');
    }

    debugLog('qui add start', {
      urls,
      baseUrl: config.baseUrl,
      hasToken: Boolean(config.token),
      savePath: config.savePath,
      categories: config.categories,
      tags: config.tags,
      instanceId: config.instanceId,
      skipRecheck: config.skipRecheck,
      candidateUrls
    });
    const formData = new FormData();
    formData.append('urls', urls.join('\n'));
    if (config.savePath) formData.append('savepath', config.savePath);
    if (config.categories) formData.append('category', splitCsv(config.categories).join(','));
    if (config.tags) formData.append('tags', splitCsv(config.tags).join(','));
    if (config.instanceId) formData.append('instance_id', config.instanceId);
    if (config.skipRecheck) formData.append('skip_checking', 'true');
    formData.append('paused', 'false');
    formData.append('stopped', 'false');

    const attempted = [];
    for (const url of candidateUrls) {
      if (!shouldContinue()) return null;
      attempted.push(url);
      try {
        const response = await gmRequest({ method: 'POST', url, data: formData });
        if (!shouldContinue()) return null;
        if (response.status >= 200 && response.status < 300) {
          debugLog('qui add candidate succeeded', { url, status: response.status });
          return response;
        }
        debugLog('qui add candidate rejected', { url, status: response.status });
        if (![401, 403, 404].includes(response.status)) {
          throw new Error(`Add failed with ${response.status}`);
        }
      } catch (error) {
        debugLog('qui add candidate failed', { url, error });
        if (url === candidateUrls.at(-1)) {
          throw new Error(
            `qui add failed: ${redactDebugUrl(error?.message || error)} (${attempted.map(redactDebugUrl).join(' | ')})`
          );
        }
      }
    }

    throw new Error(`qui add failed (${attempted.map(redactDebugUrl).join(' | ')})`);
  }

  function normalizequiItem(item) {
    const name = String(item?.name || '').trim();
    const savePath = String(item?.save_path || item?.savepath || '').trim();
    const contentPath = String(item?.content_path || '').trim();
    const tracker = String(item?.tracker || item?.site || '').trim();
    const comment = String(item?.comment || '').trim();
    const magnetUri = String(item?.magnet_uri || '').trim();
    const urls = [
      ...extractUrls(comment),
      ...extractUrls(tracker),
      ...extractUrls(contentPath),
      ...extractUrls(savePath),
      ...extractUrls(magnetUri)
    ];
    const hosts = new Set();
    const trackerHost = safeHostFromUrl(tracker) || normalizeHost(tracker);
    if (trackerHost) hosts.add(trackerHost);
    urls.forEach((url) => {
      const host = safeHostFromUrl(url);
      if (host) hosts.add(host);
    });

    return {
      raw: item,
      name,
      savePath,
      contentPath,
      hosts: Array.from(hosts),
      trackerHost,
      hash: String(item?.hash || item?.infohash_v1 || item?.infohash || '')
        .trim()
        .toLowerCase(),
      state: String(item?.state || '').trim(),
      progress: Number(item?.progress),
      addedOn: Number(item?.added_on || item?.addedOn || 0) || 0
    };
  }

  function quiItemMatchesFilename(item, filename) {
    const target = normalizeFilename(filename);
    const targetBase = normalizeFilename(stripExtension(filename));
    if (!target) return false;
    const hasFileList = Array.isArray(item?.raw?.files);
    const files = hasFileList ? item.raw.files : [];
    if (hasFileList) {
      return files.some((file) => exactFilenameMatches(file?.name || file?.path || file, filename));
    }
    const torrentNames = [item?.name, basename(item?.contentPath)].map(normalizeFilename);
    return torrentNames.some((candidate) => candidate === target || candidate === targetBase);
  }

  function getAntCrossSeedSavePath(sourceItem, filename, fallback = '') {
    const savePath = String(sourceItem?.savePath || fallback || '').trim();
    const contentPath = String(sourceItem?.contentPath || '').trim();
    if (!contentPath) return savePath;

    if (exactFilenameMatches(basename(contentPath), filename)) {
      return dirname(contentPath) || savePath;
    }

    const files = Array.isArray(sourceItem?.raw?.files) ? sourceItem.raw.files : [];
    if (files.some((file) => exactFilenameMatches(file?.name || file?.path || file, filename))) {
      return contentPath;
    }
    return savePath;
  }

  async function searchqui(filename) {
    const config = getquiConfig();
    if (!config.baseUrl || !config.token) {
      debugLog('qui skipped', {
        filename,
        hasBaseUrl: Boolean(config.baseUrl),
        hasToken: Boolean(config.token)
      });
      return [];
    }

    const cacheKey = `qui-result:${filename}`;
    let raw;
    try {
      raw = validatequiTorrentResults(
        await cachedLookup(cacheKey, () => queryqui(config, filename))
      );
    } catch (error) {
      cacheDelete(cacheKey);
      throw error;
    }
    const normalized = raw.map(normalizequiItem);
    const matches = normalized.filter((item) => quiItemMatchesFilename(item, filename));
    debugLog('qui strict filename match result', {
      filename,
      rawCount: raw.length,
      normalizedCount: normalized.length,
      strictMatchCount: matches.length,
      matches: matches.map((match) => ({
        name: match.name,
        savePath: match.savePath,
        contentPath: match.contentPath,
        hosts: match.hosts,
        state: match.state,
        progress: match.progress
      }))
    });
    return matches;
  }

  async function searchAntquiCandidates(searchTerm = '', shouldContinue = () => true) {
    const config = getquiConfig();
    if (!config.baseUrl || !config.token) return [];

    const terms = [searchTerm, '']
      .map((term) => String(term || '').trim())
      .filter((term, index, list) => list.indexOf(term) === index);
    const candidates = [];
    const seen = new Set();
    for (const term of terms) {
      if (!shouldContinue()) break;
      const raw = await queryqui(config, term, shouldContinue);
      if (!shouldContinue()) break;
      for (const item of raw.map(normalizequiItem)) {
        if (!isAntquiItem(item) || !item.hash || seen.has(item.hash)) continue;
        seen.add(item.hash);
        candidates.push(item);
      }
    }
    return candidates;
  }

  async function searchquiJobCandidates(job) {
    const config = getquiConfig();
    if (!config.baseUrl || !config.token) return [];

    const terms = [
      job.title,
      job.filename,
      stripExtension(job.title),
      stripExtension(job.filename),
      ''
    ]
      .map((term) => String(term || '').trim())
      .filter((term, index, list) => list.indexOf(term) === index);

    const items = [];
    for (const term of terms) {
      const raw = await queryqui(config, term);
      items.push(...raw.map(normalizequiItem));
    }

    const seen = new Set();
    return items.filter((item) => {
      const key = item.hash || `${item.name}:${item.contentPath}:${item.savePath}:${item.addedOn}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function toPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (numeric <= 1) return Math.max(0, Math.min(100, numeric * 100));
    return Math.max(0, Math.min(100, numeric));
  }

  function formatPercent(value) {
    const percent = toPercent(value);
    if (percent === null) return '-';
    return `${percent.toFixed(1)}%`;
  }

  function normalizeTorrentState(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function isPendingTorrentState(value) {
    const normalized = normalizeTorrentState(value);
    if (!normalized) return false;
    return qui_PENDING_STATES.has(normalized);
  }

  function isquiAddJobPending(job) {
    if (!job || job.error) return false;
    if (isPendingTorrentState(job.state)) return true;
    const percent = toPercent(job.progress);
    return percent === null || percent < 100;
  }

  function shouldPollquiAddJob(job) {
    return !!job && !job.error && isquiAddJobPending(job);
  }

  function hasPollablequiAddJobs() {
    return Array.from(quiAddJobs.values()).some((job) => shouldPollquiAddJob(job));
  }

  function getMatchHost(match) {
    return safeHostFromUrl(match?.detailsUrl) || safeHostFromUrl(match?.downloadUrl) || '';
  }

  function isAntquiItem(item) {
    const host = String(item?.trackerHost || '').toLowerCase();
    return host === 'anthelion.me' || host.endsWith('.anthelion.me');
  }

  function namesExactlyMatch(left, right) {
    const leftName = normalizeText(left);
    const rightName = normalizeText(right);
    return !!leftName && !!rightName && leftName === rightName;
  }

  function quiItemHasExactFilenameEvidence(item, filename) {
    const target = normalizeFilename(filename);
    if (!target) return false;
    if (Array.isArray(item?.raw?.files)) {
      return item.raw.files.some((file) =>
        exactFilenameMatches(file?.name || file?.path || file, filename)
      );
    }
    return [item?.name, basename(item?.contentPath)]
      .map(normalizeFilename)
      .some((candidate) => candidate === target);
  }

  function findBestquiAddJobMatch(items, job) {
    const candidates = (Array.isArray(items) ? items : []).map((item) => {
      const hashMatched = !!job.hash && !!item.hash && item.hash === job.hash;
      const hostMatched = job.trackerHost
        ? item.hosts.some(
            (host) => host === job.trackerHost || host.endsWith(`.${job.trackerHost}`)
          )
        : false;
      const filenameMatched = quiItemHasExactFilenameEvidence(item, job.filename);
      const titleMatched = namesExactlyMatch(item.name, job.title);
      const savePathMatched =
        !!job.savePath &&
        !!item.savePath &&
        normalizeText(item.savePath) === normalizeText(job.savePath);
      const afterSubmit =
        Number(job.submittedAtSec) > 0 &&
        Number(item.addedOn) > 0 &&
        Number(item.addedOn) >= Number(job.submittedAtSec);
      const score =
        (hashMatched ? 20 : 0) +
        (filenameMatched ? 8 : 0) +
        (hostMatched ? 4 : 0) +
        (titleMatched ? 2 : 0) +
        (savePathMatched ? 2 : 0) +
        (afterSubmit ? 2 : 0);
      return {
        item,
        score,
        hashMatched,
        filenameMatched,
        hostMatched,
        titleMatched,
        savePathMatched,
        afterSubmit
      };
    });

    const viable = candidates.filter(
      (candidate) =>
        candidate.hashMatched ||
        (candidate.afterSubmit &&
          candidate.filenameMatched &&
          (candidate.hostMatched || candidate.titleMatched || candidate.savePathMatched))
    );
    viable.sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return Number(right.item.addedOn) - Number(left.item.addedOn);
    });
    return viable[0]?.item || null;
  }

  async function findVerifiedquiAddJobMatch(items, job) {
    const directMatch = findBestquiAddJobMatch(items, job);
    if (directMatch) return directMatch;

    const submittedAtSec = Number(job?.submittedAtSec) || 0;
    const candidates = (Array.isArray(items) ? items : [])
      .filter((item) => {
        if (!item?.hash || submittedAtSec <= 0 || Number(item.addedOn) < submittedAtSec) {
          return false;
        }
        const hostMatched = job.trackerHost
          ? item.hosts.some(
              (host) => host === job.trackerHost || host.endsWith(`.${job.trackerHost}`)
            )
          : false;
        const titleMatched = namesExactlyMatch(item.name, job.title);
        const savePathMatched =
          !!job.savePath &&
          !!item.savePath &&
          normalizeText(item.savePath) === normalizeText(job.savePath);
        return hostMatched || titleMatched || savePathMatched;
      })
      .toSorted((left, right) => Number(right.addedOn) - Number(left.addedOn));
    const config = getquiConfig();
    for (const item of candidates) {
      try {
        const files = await queryquiFiles(config, item.hash);
        const verified = {
          ...item,
          raw: {
            ...(item.raw || {}),
            files
          }
        };
        if (!quiItemHasExactFilenameEvidence(verified, job.filename)) continue;
        debugLog('qui add monitor matched torrent by exact internal filename', {
          filename: job.filename,
          hash: item.hash,
          site: job.site,
          torrentName: item.name
        });
        return verified;
      } catch (error) {
        debugLog('qui add monitor file verification failed', {
          filename: job.filename,
          hash: item.hash,
          site: job.site,
          error
        });
      }
    }
    return null;
  }

  function schedulequiCrossSeedFollowupPoll(jobKey, delayMs = qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS) {
    setTimeout(
      () => {
        runquiCrossSeedFollowup(jobKey).catch((error) => {
          debugLog('qui cross-seed follow-up poll failed', { jobKey, error });
        });
      },
      Math.max(0, delayMs)
    );
  }

  function cancelquiCrossSeedFollowup(jobKey, job) {
    job.followUpScheduled = false;
    job.followUpStatus = '';
    job.followUpRunAt = 0;
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    renderquiAddMonitor(job.row);
    debugLog('qui cross-seed follow-up cancelled because manual adoption mode is active', {
      filename: job.filename,
      site: job.site
    });
  }

  async function addAntTorrentForquiFollowup(jobKey, job, antMatch, reason) {
    const shouldContinue = () => Boolean(GM_config.get('qui_auto_trigger_adoption'));
    if (!shouldContinue()) {
      cancelquiCrossSeedFollowup(jobKey, job);
      return false;
    }
    const antDownloadUrl = getRowDownloadUrl(job.row);
    if (!antDownloadUrl) {
      throw new Error('Missing ANT download URL for follow-up add.');
    }

    let savePath = String(antMatch?.savePath || '').trim();
    if (!savePath) {
      const sourceSavePath = String(job.sourceSavePath || job.savePath || '').trim();
      const sourceFiles =
        job.hash && job.sourceContentPath
          ? await queryquiFiles(getquiConfig(), job.hash, shouldContinue)
          : [];
      if (!shouldContinue()) {
        cancelquiCrossSeedFollowup(jobKey, job);
        return false;
      }
      savePath = getAntCrossSeedSavePath(
        {
          contentPath: job.sourceContentPath,
          raw: { files: sourceFiles },
          savePath: sourceSavePath
        },
        job.filename,
        sourceSavePath
      );
    }

    const config = getAntquiConfig(savePath);
    job.followUpStatus = 'adding';
    job.followUpSavePath = config.savePath;
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    renderquiAddMonitor(job.row);

    const submitted = await postToqui(config, [antDownloadUrl], shouldContinue);
    if (!submitted || !shouldContinue()) {
      cancelquiCrossSeedFollowup(jobKey, job);
      return false;
    }
    cacheDelete(`qui-result:${job.filename}`);
    job.followUpStatus = 'added';
    job.followUpHash = antMatch?.hash || '';
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    markRowProcessingComplete(job.row, job.filename, reason);
    renderquiAddMonitor(job.row);
    debugLog('qui cross-seed follow-up added ANT torrent', {
      filename: job.filename,
      site: job.site,
      savePath: config.savePath,
      antDownloadUrl,
      reason,
      matchedInqui: Boolean(antMatch)
    });
    return true;
  }

  async function runquiCrossSeedFollowup(jobKey) {
    const job = quiAddJobs.get(jobKey);
    if (!job || job.error || !['pending', 'checking'].includes(job.followUpStatus)) return;
    if (!GM_config.get('qui_auto_trigger_adoption')) {
      cancelquiCrossSeedFollowup(jobKey, job);
      return;
    }
    if (isquiAddJobPending(job)) {
      job.followUpScheduled = false;
      job.followUpStatus = '';
      job.followUpRunAt = 0;
      job.updatedAt = Date.now();
      quiAddJobs.set(jobKey, job);
      renderquiAddMonitor(job.row);
      debugLog('qui cross-seed follow-up deferred because site torrent is still active', {
        filename: job.filename,
        site: job.site,
        state: job.state,
        progress: job.progress
      });
      return;
    }

    job.followUpStatus = 'checking';
    job.followUpLastCheckedAt = Date.now();
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    renderquiAddMonitor(job.row);

    try {
      debugLog('qui cross-seed follow-up search start', {
        filename: job.filename,
        site: job.site,
        savePath: job.savePath,
        fallbackRunAt: job.followUpRunAt
      });
      const shouldContinue = () => Boolean(GM_config.get('qui_auto_trigger_adoption'));
      const quiCandidates = await searchAntquiCandidates(job.filename, shouldContinue);
      if (!shouldContinue()) {
        cancelquiCrossSeedFollowup(jobKey, job);
        return;
      }
      const antMatch = await findVerifiedAntquiItem(
        quiCandidates,
        job.filename,
        (item) => Boolean(String(item.savePath || '').trim()),
        shouldContinue
      );
      if (!shouldContinue()) {
        cancelquiCrossSeedFollowup(jobKey, job);
        return;
      }

      if (antMatch) {
        await addAntTorrentForquiFollowup(jobKey, job, antMatch, 'qui-follow-up-ant-added');
        return;
      }

      if (Date.now() >= Number(job.followUpRunAt || 0)) {
        await addAntTorrentForquiFollowup(jobKey, job, null, 'qui-follow-up-ant-added-fallback');
        return;
      }

      job.followUpStatus = 'pending';
      job.updatedAt = Date.now();
      quiAddJobs.set(jobKey, job);
      renderquiAddMonitor(job.row);
      debugLog('qui cross-seed follow-up ANT not found yet; polling again', {
        filename: job.filename,
        site: job.site,
        matchCount: quiCandidates.length,
        nextPollMs: qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS,
        fallbackRunAt: job.followUpRunAt
      });
      schedulequiCrossSeedFollowupPoll(
        jobKey,
        Math.min(qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS, Math.max(0, job.followUpRunAt - Date.now()))
      );
    } catch (error) {
      if (!GM_config.get('qui_auto_trigger_adoption')) {
        cancelquiCrossSeedFollowup(jobKey, job);
        return;
      }
      job.followUpStatus = 'failed';
      job.followUpError = String(error.message || error);
      job.updatedAt = Date.now();
      quiAddJobs.set(jobKey, job);
      renderquiAddMonitor(job.row);
      debugLog('qui cross-seed follow-up failed', {
        filename: job.filename,
        site: job.site,
        error
      });
    }
  }

  function schedulequiCrossSeedFollowup(jobKey) {
    const job = quiAddJobs.get(jobKey);
    if (!job || job.followUpScheduled || job.followUpStatus) return;

    const delayMs = getquiCrossSeedFollowupDelayMs();
    job.followUpScheduled = true;
    job.followUpStatus = 'pending';
    job.followUpRunAt = Date.now() + delayMs;
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    renderquiAddMonitor(job.row);
    debugLog('qui cross-seed follow-up scheduled', {
      filename: job.filename,
      site: job.site,
      delayMs,
      pollIntervalMs: qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS,
      savePath: job.savePath
    });

    schedulequiCrossSeedFollowupPoll(jobKey, Math.min(qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS, delayMs));
  }

  function getquiSavePathForRow(row) {
    const selected = row.querySelector('.ant-cross-seed-qui-save-path')?.value;
    return String(selected || GM_config.get('qui_save_path') || '').trim();
  }

  function getquiAddJobMonitorStatus(job) {
    if (
      isquiAddJobPending(job) &&
      ['pending', 'checking', 'missing'].includes(job?.followUpStatus || '')
    ) {
      return job?.error ? `${job.status}: ${job.error}` : job?.status || 'Queued';
    }

    if (!job?.followUpStatus || job.followUpStatus === 'idle') {
      return job?.error ? `${job.status}: ${job.error}` : job?.status || 'Queued';
    }

    const statusLabels = {
      pending: 'Polling for ANT cross-seed...',
      checking: 'Checking for ANT cross-seed...',
      adding: 'Adding ANT torrent...',
      added: 'ANT submitted to qui',
      missing: 'ANT not found in qui',
      failed: `ANT follow-up failed: ${job.followUpError || 'unknown error'}`
    };
    return statusLabels[job.followUpStatus] || job.status || 'Queued';
  }

  function getquiMonitorContainer(row) {
    let container = row.querySelector('.ant-cross-seed-qui-monitor');
    if (container) return container;

    container = document.createElement('div');
    container.className = 'ant-cross-seed-qui-monitor';
    const info = getRowInfo(row);
    const quiBlock = row.querySelector('.ant-cross-seed-qui');
    if (quiBlock?.parentNode) {
      quiBlock.parentNode.insertBefore(container, quiBlock.nextSibling);
    } else {
      info.appendChild(container);
    }
    return container;
  }

  function renderquiAddMonitor(row) {
    const container = getquiMonitorContainer(row);
    const rowJobs = Array.from(quiAddJobs.values()).filter((job) => job.row === row);
    if (rowJobs.length === 0) {
      container.textContent = '';
      return;
    }

    container.textContent = '';
    const title = document.createElement('div');
    title.className = 'ant-cross-seed-qui-monitor-title';
    title.textContent = 'qui add monitor';

    const table = document.createElement('table');
    table.className = 'ant-cross-seed-qui-monitor-table';
    const header = document.createElement('tr');
    ['Site', 'Status', 'Progress', 'State', 'Hash'].forEach((label) => {
      const cell = document.createElement('th');
      cell.textContent = label;
      header.appendChild(cell);
    });
    table.appendChild(header);

    for (const job of rowJobs) {
      const rowElement = document.createElement('tr');
      rowElement.dataset.state = job.error ? 'error' : isquiAddJobPending(job) ? 'working' : 'done';
      [
        job.site,
        getquiAddJobMonitorStatus(job),
        formatPercent(job.progress),
        job.state || '-',
        job.hash || '-'
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = String(value || '-');
        rowElement.appendChild(cell);
      });
      table.appendChild(rowElement);
    }

    container.append(title, table);
  }

  function renderAllquiAddMonitors() {
    const rows = new Set(
      Array.from(quiAddJobs.values())
        .map((job) => job.row)
        .filter(Boolean)
    );
    rows.forEach((row) => renderquiAddMonitor(row));
  }

  function buildAdoptionReadyUrl(job) {
    const groupId = job?.groupId || getRowGroupId(job?.row);
    const torrentId = job?.torrentId || getRowTorrentId(job?.row);
    if (!groupId) return '';
    const url = new URL('/torrents.php', location.href);
    url.searchParams.set('id', String(groupId));
    if (torrentId) url.searchParams.set('torrentid', String(torrentId));
    url.searchParams.set(ADOPTION_READY_PARAM, '1');
    if (job?.adoptionReadyToken) {
      url.searchParams.set(ADOPTION_READY_TOKEN_PARAM, String(job.adoptionReadyToken));
    }
    if (job?.site) url.searchParams.set('ant_adoption_source', String(job.site));
    return url.toString();
  }

  function scheduleAdoptionReadyPageOpenRetry(jobKey) {
    setTimeout(() => {
      const currentJob = quiAddJobs.get(jobKey);
      if (currentJob && !currentJob.adoptionPageOpened) {
        return openAdoptionReadyPage(jobKey, currentJob);
      }
      return false;
    }, ADOPTION_READY_QUI_POLL_INTERVAL_MS);
  }

  async function openAdoptionReadyPage(jobKey, job) {
    if (!job?.autoAdded || job.adoptionPageOpened) return false;
    let automatic = Boolean(GM_config.get('qui_auto_trigger_adoption'));
    if (!job.adoptionReadyToken) {
      try {
        createAdoptionReadyMarker(job);
      } catch (error) {
        debugLog('auto qui adoption-ready marker retry failed', {
          filename: job.filename,
          torrentId: job.torrentId,
          error
        });
      }
    }
    if (automatic) {
      const claimed = await claimAdoptionReadyFlow(job);
      if (!GM_config.get('qui_auto_trigger_adoption')) {
        if (claimed) await releaseAdoptionReadyFlowWithRetry(job.adoptionReadyToken);
        automatic = false;
      } else if (!claimed) {
        scheduleAdoptionReadyPageOpenRetry(jobKey);
        debugLog('auto qui adoption page waiting for active ready page', {
          filename: job.filename,
          torrentId: job.torrentId
        });
        return false;
      }
    }
    try {
      createAdoptionReadyMarker(job);
    } catch (error) {
      if (automatic) {
        await releaseAdoptionReadyFlowWithRetry(job.adoptionReadyToken);
        scheduleAdoptionReadyPageOpenRetry(jobKey);
      }
      debugLog('qui adoption-ready marker refresh failed', {
        filename: job.filename,
        torrentId: job.torrentId,
        automatic,
        error
      });
      if (automatic) return false;
    }
    const url = buildAdoptionReadyUrl(job);
    if (!url) {
      if (automatic) await releaseAdoptionReadyFlowWithRetry(job.adoptionReadyToken);
      debugLog('auto qui adoption page not opened: missing ANT group id', {
        filename: job.filename,
        torrentId: job.torrentId
      });
      return false;
    }
    try {
      GM_openInTab(url, { active: true, insert: true, setParent: true });
    } catch (error) {
      if (automatic) await releaseAdoptionReadyFlowWithRetry(job.adoptionReadyToken);
      debugLog('auto qui adoption page open failed', {
        filename: job.filename,
        torrentId: job.torrentId,
        url,
        error
      });
      return false;
    }
    job.adoptionPageOpened = true;
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    debugLog('auto qui adoption page opened', {
      filename: job.filename,
      torrentId: job.torrentId,
      groupId: job.groupId,
      site: job.site,
      url
    });
    return true;
  }

  function scheduleAdoptionReadyPage(jobKey, job) {
    if (!job?.autoAdded || job.adoptionPageScheduled || job.adoptionPageOpened) return false;
    try {
      createAdoptionReadyMarker(job);
    } catch (error) {
      debugLog('auto qui adoption-ready marker creation failed', {
        filename: job.filename,
        torrentId: job.torrentId,
        error
      });
    }
    const automatic = Boolean(GM_config.get('qui_auto_trigger_adoption'));
    const followupDelayMs = getquiCrossSeedFollowupDelayMs();
    const delayMs = automatic ? (followupDelayMs > 0 ? followupDelayMs + 10000 : 5000) : 0;
    job.adoptionPageScheduled = true;
    job.adoptionPageOpenAt = Date.now() + delayMs;
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    if (automatic) {
      setTimeout(() => {
        const currentJob = quiAddJobs.get(jobKey);
        if (currentJob) return openAdoptionReadyPage(jobKey, currentJob);
        return false;
      }, delayMs);
    } else {
      void openAdoptionReadyPage(jobKey, job);
    }
    debugLog('auto qui adoption page scheduled', {
      filename: job.filename,
      torrentId: job.torrentId,
      delayMs,
      automatic
    });
    return true;
  }

  function handleCompletedquiAddJob(jobKey, job) {
    try {
      markAdoptionRowGrabbed(job.row, job.torrentId);
    } catch (error) {
      debugLog('qui completion Grabbed persistence failed', {
        filename: job.filename,
        torrentId: job.torrentId,
        error
      });
    }
    try {
      scheduleAdoptionReadyPage(jobKey, job);
    } catch (error) {
      debugLog('qui completion adoption-ready scheduling failed', {
        filename: job.filename,
        torrentId: job.torrentId,
        error
      });
    }
    if (GM_config.get('qui_auto_trigger_adoption')) schedulequiCrossSeedFollowup(jobKey);
  }

  async function pollquiAddJobs() {
    if (quiAddPollInFlight || quiAddJobs.size === 0) return;

    quiAddPollInFlight = true;
    try {
      const activeJobs = Array.from(quiAddJobs.entries()).filter(([, job]) =>
        shouldPollquiAddJob(job)
      );
      if (activeJobs.length === 0) {
        stopquiAddPolling('no pollable jobs');
        return;
      }

      for (const [key, job] of activeJobs) {
        try {
          const quiItems = await searchquiJobCandidates(job);
          debugLog('qui add monitor poll result', {
            filename: job.filename,
            resultCount: quiItems.length,
            site: job.site,
            title: job.title,
            savePath: job.savePath,
            trackerHost: job.trackerHost
          });

          const matched = await findVerifiedquiAddJobMatch(quiItems, job);
          if (!matched) {
            job.status = 'Submitted. Waiting for qui match...';
            job.updatedAt = Date.now();
            quiAddJobs.set(key, job);
            continue;
          }

          job.progress = toPercent(matched.progress);
          job.state = matched.state;
          job.hash = matched.hash;
          job.sourceContentPath = matched.contentPath;
          job.sourceSavePath = matched.savePath;
          job.status = isquiAddJobPending(job) ? 'Added' : 'Complete';
          if (
            isquiAddJobPending(job) &&
            ['pending', 'checking', 'missing'].includes(job.followUpStatus)
          ) {
            job.followUpScheduled = false;
            job.followUpStatus = '';
            job.followUpRunAt = 0;
            job.followUpError = '';
          }
          job.updatedAt = Date.now();
          quiAddJobs.set(key, job);
          if (!isquiAddJobPending(job)) {
            handleCompletedquiAddJob(key, job);
          }
        } catch (error) {
          debugLog('qui add monitor poll failed', {
            filename: job.filename,
            site: job.site,
            error
          });
          console.warn('qui add monitor poll failed:', error);
        }
      }
    } finally {
      quiAddPollInFlight = false;
      renderAllquiAddMonitors();
      if (!hasPollablequiAddJobs()) stopquiAddPolling('all site torrents complete');
    }
  }

  function startquiAddPolling(reset = false) {
    if (reset) stopquiAddPolling('new other-site torrent submitted');
    if (quiAddPollTimer) return;
    schedulequiAddPolling(Date.now());
    pollquiAddJobs().catch((error) => {
      debugLog('qui add initial poll failed', { error });
    });
  }

  function schedulequiAddPolling(startedAt) {
    const elapsedMinutes = Math.floor(Math.max(0, Date.now() - startedAt) / 60000);
    const delayMs = Math.min(
      qui_ADD_POLL_INTERVAL_MS * (elapsedMinutes + 1),
      qui_ADD_MAX_POLL_INTERVAL_MS
    );
    const timer = setTimeout(async () => {
      if (quiAddPollTimer !== timer) return;
      try {
        await pollquiAddJobs();
      } catch (error) {
        debugLog('qui add monitor poll failed', { error });
      } finally {
        if (quiAddPollTimer === timer) {
          quiAddPollTimer = null;
          if (hasPollablequiAddJobs()) {
            schedulequiAddPolling(startedAt);
          }
        }
      }
    }, delayMs);
    quiAddPollTimer = timer;
  }

  function stopquiAddPolling(reason = '') {
    if (quiAddPollTimer) {
      clearTimeout(quiAddPollTimer);
      quiAddPollTimer = null;
    }
    debugLog('qui add polling stopped', { reason });
  }

  function pickBestMatch(matches) {
    if (!Array.isArray(matches) || matches.length === 0) return null;
    return matches.toSorted((a, b) => (b.seeders || 0) - (a.seeders || 0))[0];
  }

  function getTrackerDefinitions() {
    return [
      {
        site: 'PTP',
        enabled: () => Boolean(GM_config.get('ptp')),
        ready: (antMetadata) =>
          Boolean(
            GM_config.get('ptp') &&
            String(GM_config.get('ptp_api_user') || '').trim() &&
            String(GM_config.get('ptp_api_key') || '').trim() &&
            !antMetadata?.isM2tsRow
          ),
        search: (antMetadata) => searchPtp(antMetadata)
      },
      {
        site: 'BHD',
        enabled: () => Boolean(GM_config.get('bhd')),
        ready: (antMetadata) =>
          Boolean(
            GM_config.get('bhd') &&
            String(GM_config.get('bhd_api') || '').trim() &&
            String(GM_config.get('bhd_rss') || '').trim() &&
            antMetadata?.filename
          ),
        search: (antMetadata) => searchBhd(antMetadata)
      },
      {
        site: 'HDB',
        enabled: () => Boolean(GM_config.get('hdb')),
        ready: (antMetadata) =>
          Boolean(
            GM_config.get('hdb') &&
            String(GM_config.get('hdb_user') || '').trim() &&
            String(GM_config.get('hdb_pass') || '').trim() &&
            antMetadata?.filename
          ),
        search: (antMetadata) => searchHdb(antMetadata)
      },
      ...unit3dTrackers.map((tracker) => ({
        site: tracker.site,
        enabled: () => Boolean(getUnit3dConfig(tracker).enabled),
        ready: (antMetadata) => {
          const config = getUnit3dConfig(tracker);
          return Boolean(
            config.enabled && config.apiToken && config.baseUrl && imdbIdNumber(antMetadata?.imdbId)
          );
        },
        search: (antMetadata) => searchUnit3dTracker(tracker, antMetadata)
      }))
    ];
  }

  function getScopedTrackers() {
    const scope = getTrackerScope();
    const definitions = getTrackerDefinitions();
    const scoped = scope
      ? definitions.filter((tracker) => tracker.site === scope)
      : definitions.filter((tracker) => tracker.enabled());
    debugLog('tracker scope resolved', {
      scope: scope || 'All enabled trackers',
      trackers: scoped.map((tracker) => tracker.site)
    });
    return scoped;
  }

  function trackerNullResultsCacheKey() {
    return 'tracker-results-v6:nulls';
  }

  function trackerMatchResultsCacheKey() {
    return 'tracker-results-v6:matches';
  }

  function migrateLegacyRowProcessingCache() {
    if (!GM_config.get('use_cache')) return false;
    if (
      Number(GM_getValue(ROW_PROCESSING_MIGRATION_STORAGE_KEY, 0)) >=
      ROW_PROCESSING_MIGRATION_VERSION
    ) {
      return false;
    }

    const startedAt = performanceNow();
    const obsoletePrefixes = [
      'tracker-results-v5:',
      'tracker-results-v4:',
      'row-complete-v2:',
      'tracker-result-v2:',
      'row-complete:',
      'tracker-result:',
      'matches:'
    ];
    const completionPrefixes = [
      'row-fully-completed-v1:',
      'row-complete-v3:',
      'row-complete-v2:',
      'row-complete:'
    ];

    try {
      const storedKeys = GM_listValues();
      const cacheEntries = [];
      const cacheByLogicalKey = new Map();
      const obsoleteStoredKeys = [];
      for (const storedKey of storedKeys) {
        if (!String(storedKey).startsWith(CACHE_STORAGE_PREFIX)) continue;
        const raw = GM_getValue(storedKey, null);
        if (typeof raw !== 'string') continue;
        try {
          const entry = decodeCacheEntry(raw);
          if (!entry.k) continue;
          const stored = { storedKey, key: entry.k, value: entry.v };
          cacheEntries.push(stored);
          cacheByLogicalKey.set(entry.k, stored);
          if (obsoletePrefixes.some((prefix) => entry.k.startsWith(prefix))) {
            obsoleteStoredKeys.push(storedKey);
          }
        } catch (error) {
          debugLog('row processing migration cache parse failed', { storedKey, error });
        }
      }

      const candidates = new Map();
      const getCandidate = (torrentId) => {
        const id = String(torrentId || '');
        if (!/^\d+$/.test(id)) return null;
        if (!candidates.has(id)) candidates.set(id, { action: '', completions: [], torrentId: id });
        return candidates.get(id);
      };

      for (const storedKey of storedKeys) {
        const key = String(storedKey);
        if (!key.startsWith(ACTION_STORAGE_PREFIX)) continue;
        const candidate = getCandidate(key.slice(ACTION_STORAGE_PREFIX.length));
        if (candidate) candidate.action = getTorrentAction(candidate.torrentId);
      }

      for (const entry of cacheEntries) {
        if (!completionPrefixes.some((prefix) => entry.key.startsWith(prefix))) continue;
        const candidate = getCandidate(entry.value?.torrentId);
        if (!candidate || !entry.value?.filename) continue;
        candidate.completions.push(entry.value);
      }

      const matchIndex = normalizeTrackerResultIndex(
        cacheByLogicalKey.get(trackerMatchResultsCacheKey())?.value
      );
      const nullIndex = normalizeTrackerResultIndex(
        cacheByLogicalKey.get(trackerNullResultsCacheKey())?.value
      );
      const suppressActionRecovery = Boolean(
        GM_getValue(ACTION_RECOVERY_SUPPRESS_STORAGE_KEY, false)
      );
      let alreadyModern = 0;
      let migratedRows = 0;
      let recoveredGrabbedActions = 0;
      let verifiedRows = 0;

      for (const candidate of candidates.values()) {
        const existing = cacheByLogicalKey.get(rowProcessingCacheKey(candidate.torrentId))?.value;
        const completions = candidate.completions.toSorted((left, right) => {
          const fullyCompletedDifference =
            Number(isFullyCompletedRowCompletion(right)) -
            Number(isFullyCompletedRowCompletion(left));
          return (
            fullyCompletedDifference ||
            (Number(right?.completedAt || 0) || 0) - (Number(left?.completedAt || 0) || 0)
          );
        });
        const completion = completions[0] || null;
        const fullyCompleted = completions.find(isFullyCompletedRowCompletion) || null;
        const metadata = cacheByLogicalKey.get(antMetadataCacheKey(candidate.torrentId))?.value;
        const legacyFilename = cacheByLogicalKey.get(`ant-filename:${candidate.torrentId}`)?.value;
        const filename = String(
          existing?.filename || completion?.filename || metadata?.filename || legacyFilename || ''
        ).trim();

        if (fullyCompleted) {
          const sharedCompletion = {
            ...fullyCompleted,
            torrentId: candidate.torrentId,
            filename,
            status: 'fully-completed'
          };
          if (!filename) throw new Error(`Completed row ${candidate.torrentId} has no filename.`);
          cacheSet(rowFullyCompletedCacheKey(candidate.torrentId, filename), sharedCompletion);
          if (
            !isFullyCompletedRowCompletion(
              cacheGet(rowFullyCompletedCacheKey(candidate.torrentId, filename), null)
            )
          ) {
            throw new Error(`Could not verify completed row ${candidate.torrentId}.`);
          }
          if (!candidate.action && !suppressActionRecovery) {
            GM_setValue(actionStorageKey(candidate.torrentId), 'grabbed');
            if (getTorrentAction(candidate.torrentId) !== 'grabbed') {
              throw new Error(`Could not verify Grabbed action ${candidate.torrentId}.`);
            }
            candidate.action = 'grabbed';
            recoveredGrabbedActions += 1;
          }
        }

        if (existing?.version === 1 && existing.filename) {
          alreadyModern += 1;
          verifiedRows += 1;
          continue;
        }
        if (!filename || (!candidate.action && !completion)) continue;

        const trackerSites = new Set(
          completions.flatMap((value) =>
            Array.isArray(value?.trackers) ? value.trackers.map(String) : []
          )
        );
        const trackerMatches = [];
        for (const [site, results] of Object.entries(matchIndex.sites || {})) {
          const match = results?.[filename];
          if (match === undefined) continue;
          trackerSites.add(site);
          if (isValidTrackerMatch(site, match)) trackerMatches.push(match);
        }
        for (const [site, results] of Object.entries(nullIndex.sites || {})) {
          if (results?.[filename] === true) trackerSites.add(site);
        }
        const quiEntry = cacheByLogicalKey.get(`qui-result:${filename}`);
        const quiMatches = Array.isArray(quiEntry?.value) ? quiEntry.value : [];
        const statusText = fullyCompleted
          ? getRowCompletionText(fullyCompleted)
          : candidate.action === 'ignored'
            ? trackerMatches.length > 0
              ? 'ignored: no match met auto-qui requirements'
              : 'ignored: no tracker matches'
            : trackerMatches.length > 0
              ? `${trackerMatches.length} cached match${trackerMatches.length === 1 ? '' : 'es'}`
              : 'cached no matches';
        const statusState = fullyCompleted
          ? 'done'
          : candidate.action === 'ignored'
            ? 'skipped'
            : trackerMatches.length > 0
              ? 'done'
              : 'none';

        cacheRowProcessingData(
          candidate.torrentId,
          filename,
          [...trackerSites].map((site) => ({ site })),
          quiMatches,
          trackerMatches,
          statusText,
          statusState,
          Boolean(quiEntry)
        );
        const migrated = getCachedRowProcessingData(candidate.torrentId);
        if (!migrated || migrated.filename !== filename) {
          throw new Error(`Could not verify migrated row ${candidate.torrentId}.`);
        }
        migratedRows += 1;
        verifiedRows += 1;
      }

      obsoleteStoredKeys.forEach((storedKey) => GM_deleteValue(storedKey));
      if (obsoleteStoredKeys.some((storedKey) => GM_getValue(storedKey, null) !== null)) {
        throw new Error('Could not verify stale cache cleanup.');
      }
      GM_setValue(ROW_PROCESSING_MIGRATION_STORAGE_KEY, ROW_PROCESSING_MIGRATION_VERSION);
      if (
        Number(GM_getValue(ROW_PROCESSING_MIGRATION_STORAGE_KEY, 0)) !==
        ROW_PROCESSING_MIGRATION_VERSION
      ) {
        throw new Error('Could not verify the row processing migration marker.');
      }
      lifecycleLog('legacy row processing cache migration completed', {
        alreadyModern,
        cacheEntries: cacheEntries.length,
        durationMs: elapsedMilliseconds(startedAt),
        migratedRows,
        recoveredGrabbedActions,
        removedStaleEntries: obsoleteStoredKeys.length,
        verifiedRows
      });
      return true;
    } catch (error) {
      console.warn(`[${SCRIPT_PREFIX}] legacy row processing cache migration failed`, error);
      lifecycleLog('legacy row processing cache migration failed', {
        durationMs: elapsedMilliseconds(startedAt),
        error: String(error?.message || error)
      });
      return false;
    }
  }

  function createTrackerResultIndex() {
    return {
      version: 6,
      updatedAt: Date.now(),
      sites: {}
    };
  }

  function normalizeTrackerResultIndex(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return createTrackerResultIndex();
    }
    return {
      version: 6,
      updatedAt: Number(value.updatedAt || 0) || Date.now(),
      sites: value.sites && typeof value.sites === 'object' ? value.sites : {}
    };
  }

  function getTrackerResultIndex(key) {
    return normalizeTrackerResultIndex(cacheGet(key, null));
  }

  function isValidTrackerMatch(site, match) {
    const seeders = String(match?.seeders ?? '')
      .replaceAll(',', '')
      .trim();
    return Boolean(
      match &&
      typeof match === 'object' &&
      !Array.isArray(match) &&
      match.site === site &&
      isNonemptyString(match.downloadUrl) &&
      isNonemptyString(match.title) &&
      /^\d+$/.test(seeders)
    );
  }

  function getTrackerResultFromIndex(site, filename) {
    if (!GM_config.get('use_cache')) return { cached: false, value: null };

    const matchIndex = getTrackerResultIndex(trackerMatchResultsCacheKey());
    const matchValue = matchIndex.sites?.[site]?.[filename];
    if (matchValue !== undefined) {
      if (isValidTrackerMatch(site, matchValue)) return { cached: true, value: matchValue };
      deleteTrackerResultFromIndexes(site, filename);
      return { cached: false, value: null };
    }

    const nullIndex = getTrackerResultIndex(trackerNullResultsCacheKey());
    const nullValue = nullIndex.sites?.[site]?.[filename];
    if (nullValue !== undefined) {
      if (nullValue === true) return { cached: true, value: null };
      deleteTrackerResultFromIndexes(site, filename);
    }

    return { cached: false, value: null };
  }

  function deleteTrackerResultFromIndexes(site, filename) {
    if (!GM_config.get('use_cache')) return;

    for (const key of [trackerNullResultsCacheKey(), trackerMatchResultsCacheKey()]) {
      const index = getTrackerResultIndex(key);
      if (!Object.hasOwn(index.sites?.[site] || {}, filename)) continue;
      delete index.sites[site][filename];
      if (Object.keys(index.sites[site]).length === 0) delete index.sites[site];
      index.updatedAt = Date.now();
      cacheSet(key, index);
    }
  }

  function setTrackerResultInIndexes(site, filename, result) {
    if (!GM_config.get('use_cache')) return;
    if (result && !isValidTrackerMatch(site, result)) {
      throw new TypeError(`${site} returned an invalid normalized torrent match.`);
    }

    const nullIndex = getTrackerResultIndex(trackerNullResultsCacheKey());
    const matchIndex = getTrackerResultIndex(trackerMatchResultsCacheKey());
    nullIndex.sites[site] ||= {};
    matchIndex.sites[site] ||= {};

    if (result) {
      matchIndex.sites[site][filename] = result;
      delete nullIndex.sites[site][filename];
    } else {
      nullIndex.sites[site][filename] = true;
      delete matchIndex.sites[site][filename];
    }

    nullIndex.updatedAt = Date.now();
    matchIndex.updatedAt = Date.now();
    cacheSet(trackerNullResultsCacheKey(), nullIndex);
    cacheSet(trackerMatchResultsCacheKey(), matchIndex);
  }

  function rowCompleteCacheKey(torrentId, filename, trackers) {
    const signature = trackers
      .map((tracker) => tracker.site)
      .toSorted()
      .join(',');
    return `row-complete-v3:${torrentId}:${filename}:${signature}`;
  }

  function rowFullyCompletedCacheKey(torrentId, filename) {
    return `row-fully-completed-v1:${torrentId}:${filename}`;
  }

  function findLegacyFullyCompletedRowCompletion(torrentId, filename) {
    if (
      Number(GM_getValue(ROW_PROCESSING_MIGRATION_STORAGE_KEY, 0)) >=
      ROW_PROCESSING_MIGRATION_VERSION
    ) {
      return null;
    }
    const prefix = `row-complete-v3:${torrentId}:${filename}:`;
    for (const storedKey of GM_listValues()) {
      if (!String(storedKey).startsWith(CACHE_STORAGE_PREFIX)) continue;
      try {
        const entry = decodeCacheEntry(GM_getValue(storedKey, null));
        if (String(entry.k || '').startsWith(prefix) && isFullyCompletedRowCompletion(entry.v)) {
          return entry.v;
        }
      } catch (error) {
        debugLog('legacy row completion parse failed', { storedKey, error });
      }
    }
    return null;
  }

  function refreshRowKey(torrentId, filename, trackers) {
    const signature = trackers
      .map((tracker) => tracker.site)
      .toSorted()
      .join(',');
    return `${torrentId}:${filename || 'unresolved'}:${signature}`;
  }

  function getCachedTrackerMatches(filename, trackers) {
    return trackers
      .map((tracker) => getTrackerResultFromIndex(tracker.site, filename).value)
      .filter(Boolean);
  }

  function areTrackerResultsCached(filename, trackers) {
    return trackers.every((tracker) => getTrackerResultFromIndex(tracker.site, filename).cached);
  }

  function getRowCompletion(torrentId, filename, trackers) {
    if (!GM_config.get('use_cache')) return null;
    const scoped = cacheGet(rowCompleteCacheKey(torrentId, filename, trackers), null);
    if (isFullyCompletedRowCompletion(scoped)) return scoped;

    const sharedKey = rowFullyCompletedCacheKey(torrentId, filename);
    const shared = cacheGet(sharedKey, null);
    if (isFullyCompletedRowCompletion(shared)) return shared;

    const legacy = findLegacyFullyCompletedRowCompletion(torrentId, filename);
    if (legacy) {
      cacheSet(sharedKey, legacy);
      return legacy;
    }
    return scoped;
  }

  function isFullyCompletedRowCompletion(completion) {
    return completion?.status === 'fully-completed';
  }

  function getRowCompletionText(completion) {
    const reasonLabels = {
      'manual-ant-added': 'completed: ANT submitted to qui',
      'qui-follow-up-ant-added': 'completed: ANT cross-seed found and submitted',
      'qui-follow-up-ant-added-fallback': 'completed: ANT fallback submitted',
      'qui-follow-up-ant-added-without-match': 'completed: ANT fallback submitted'
    };
    return reasonLabels[completion?.reason] || 'completed: ANT submitted to qui';
  }

  function markRowTrackerComplete(torrentId, filename, trackers) {
    if (trackers.length === 0) return;
    const existing = getRowCompletion(torrentId, filename, trackers);
    if (isFullyCompletedRowCompletion(existing)) return;
    cacheSet(rowCompleteCacheKey(torrentId, filename, trackers), {
      torrentId,
      filename,
      trackers: trackers.map((tracker) => tracker.site),
      status: 'tracker-complete',
      completedAt: Date.now()
    });
  }

  function getRowProcessingContext(row, filename = '') {
    const torrentId = row?.dataset?.antCrossSeedTorrentId || getRowTorrentId(row);
    const trackerSites = String(row?.dataset?.antCrossSeedTrackerSites || '')
      .split(',')
      .map((site) => site.trim())
      .filter(Boolean);
    return {
      torrentId,
      filename: row?.dataset?.antCrossSeedFilename || filename,
      trackers: trackerSites.map((site) => ({ site }))
    };
  }

  function markRowProcessingComplete(row, filename, reason = '') {
    const context = getRowProcessingContext(row, filename);
    if (!context.torrentId || !context.filename) {
      debugLog('row complete cache skipped', { filename, reason, context });
      return;
    }

    try {
      const completion = {
        torrentId: context.torrentId,
        filename: context.filename,
        status: 'fully-completed',
        reason,
        completedAt: Date.now()
      };
      cacheSet(rowFullyCompletedCacheKey(context.torrentId, context.filename), completion);
      if (context.trackers.length > 0) {
        cacheSet(rowCompleteCacheKey(context.torrentId, context.filename, context.trackers), {
          ...completion,
          trackers: context.trackers.map((tracker) => tracker.site)
        });
      }
      setRowState(row, getRowCompletionText({ reason }), 'done');
      debugLog('row complete cache marked', { reason, context });
      return true;
    } catch (error) {
      debugLog('row complete persistence failed after qui accepted the torrent', {
        reason,
        context,
        error
      });
      return false;
    }
  }

  async function searchScopedTrackers(antMetadata, antTorrentId, trackers, refreshCache = false) {
    const filename = antMetadata?.filename || '';
    debugLog('scoped tracker searches start', {
      filename,
      imdbId: antMetadata?.imdbId,
      antTorrentId,
      trackers: trackers.map((tracker) => tracker.site),
      refreshCache
    });

    const searches = trackers.map(async (tracker) => {
      if (refreshCache) deleteTrackerResultFromIndexes(tracker.site, filename);
      if (!tracker.ready?.(antMetadata)) {
        debugLog('tracker lookup unavailable', {
          filename,
          site: tracker.site,
          reason: 'disabled, missing credentials, or missing required metadata'
        });
        return {
          complete: false,
          match: refreshCache ? null : getTrackerResultFromIndex(tracker.site, filename).value
        };
      }

      if (!refreshCache) {
        const cached = getTrackerResultFromIndex(tracker.site, filename);
        if (cached.cached) {
          debugLog('tracker aggregate cache hit', {
            filename,
            site: tracker.site,
            hasMatch: Boolean(cached.value)
          });
          return { complete: true, match: cached.value };
        }
      }

      debugLog('tracker aggregate cache miss', { filename, site: tracker.site, refreshCache });
      const result = await tracker.search(antMetadata);
      setTrackerResultInIndexes(tracker.site, filename, result);
      return { complete: true, match: result };
    });

    const settled = await Promise.allSettled(searches);
    const matches = settled
      .map((result, index) => {
        if (result.status === 'fulfilled') return result.value.match;
        debugLog('tracker filename lookup failed', {
          filename,
          site: trackers[index]?.site,
          reason: result.reason
        });
        console.warn('Tracker filename lookup failed:', result.reason);
        return null;
      })
      .filter(Boolean);
    const complete = settled.every(
      (result) => result.status === 'fulfilled' && result.value.complete
    );

    debugLog('scoped tracker searches complete', {
      filename,
      antTorrentId,
      matches,
      complete,
      trackers: trackers.map((tracker) => tracker.site)
    });
    return { matches, complete, trackerCount: trackers.length };
  }

  function shouldAutoIgnoreTrackerSearch(searchResult, autoquiState, fullyCompleted = false) {
    const quiConfig = getquiConfig();
    return (
      !fullyCompleted &&
      Boolean(GM_config.get('qui_auto_add_site_torrent')) &&
      Boolean(GM_config.get('qui_auto_ignore_ungrabbed')) &&
      Boolean(quiConfig.baseUrl && quiConfig.token) &&
      searchResult?.complete === true &&
      Number(searchResult?.trackerCount) > 0 &&
      (autoquiState === 'no-match' || autoquiState === 'ineligible')
    );
  }

  async function addTrackerMatchToqui(row, filename, match, button, autoAdded = false) {
    if (!match?.downloadUrl) return false;

    const jobKey = `${filename}:${match.site}:${match.downloadUrl}`;
    const existingJob = quiAddJobs.get(jobKey);
    if (existingJob && !existingJob.error) {
      renderquiAddMonitor(row);
      getquiMonitorContainer(row).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (shouldPollquiAddJob(existingJob)) startquiAddPolling();
      return true;
    }

    const config = getquiConfig();
    config.savePath = getquiSavePathForRow(row);
    config.skipRecheck = false;

    if (!config.baseUrl || !config.token) {
      button.textContent = 'qui config missing';
      button.dataset.state = 'error';
      return false;
    }

    const job = {
      key: jobKey,
      row,
      filename,
      torrentId: getRowProcessingContext(row, filename).torrentId,
      groupId: getRowGroupId(row),
      site: match.site,
      title: match.title || filename,
      trackerHost: getMatchHost(match),
      downloadUrl: match.downloadUrl,
      detailsUrl: match.detailsUrl || '',
      savePath: config.savePath,
      status: 'Submitting',
      progress: null,
      state: '',
      hash: '',
      sourceContentPath: '',
      sourceSavePath: '',
      error: '',
      followUpScheduled: false,
      followUpStatus: '',
      followUpError: '',
      followUpSavePath: '',
      followUpHash: '',
      followUpRunAt: 0,
      autoAdded: Boolean(autoAdded),
      adoptionPageScheduled: false,
      adoptionPageOpenAt: 0,
      adoptionPageOpened: false,
      submittedAtSec: Math.floor(Date.now() / 1000),
      updatedAt: Date.now()
    };
    quiAddJobs.set(jobKey, job);
    renderquiAddMonitor(row);

    button.disabled = true;
    button.dataset.state = 'working';
    button.textContent = 'Adding...';
    debugLog('tracker qui add start', { filename, match, savePath: config.savePath });

    try {
      await postToqui(config, [match.downloadUrl]);
      cacheDelete(`qui-result:${filename}`);
      job.status = 'Submitted';
      job.updatedAt = Date.now();
      quiAddJobs.set(jobKey, job);
      button.textContent = 'Monitor';
      button.dataset.state = 'done';
      debugLog('tracker qui add submitted', {
        filename,
        site: match.site,
        downloadUrl: match.downloadUrl,
        savePath: config.savePath
      });
      renderquiAddMonitor(row);
      startquiAddPolling(true);
      return true;
    } catch (error) {
      job.status = 'Failed';
      job.error = String(error.message || error);
      job.updatedAt = Date.now();
      quiAddJobs.set(jobKey, job);
      button.textContent = 'qui failed';
      button.dataset.state = 'error';
      debugLog('tracker qui add failed', { filename, match, savePath: config.savePath, error });
      renderquiAddMonitor(row);
      return false;
    } finally {
      button.disabled = false;
    }
  }

  function getBestAutoquiMatch(matches) {
    const minSeeders = getquiAutoAddMinSeeders();
    return (Array.isArray(matches) ? matches : [])
      .filter(
        (match) => match?.downloadUrl && (Number.parseInt(match.seeders, 10) || 0) >= minSeeders
      )
      .toSorted((left, right) => {
        const leftSeeders = Number.parseInt(left.seeders, 10) || 0;
        const rightSeeders = Number.parseInt(right.seeders, 10) || 0;
        return rightSeeders - leftSeeders;
      })[0];
  }

  function getAutoquiMatchDisposition(matches) {
    if (!GM_config.get('qui_auto_add_site_torrent')) {
      return { state: 'disabled', match: null };
    }
    const candidates = Array.isArray(matches) ? matches : [];
    const match = getBestAutoquiMatch(candidates);
    if (match) return { state: 'eligible', match };
    return { state: candidates.length > 0 ? 'ineligible' : 'no-match', match: null };
  }

  async function maybeAutoAddTrackerMatchToqui(row, filename, matches) {
    const disposition = getAutoquiMatchDisposition(matches);
    if (!disposition.match) return disposition.state;
    const { match } = disposition;

    const autoKey = `${filename}:${match.site}:${match.downloadUrl}`;
    if (row.dataset.antCrossSeedAutoquiKey === autoKey) {
      const existingJob = quiAddJobs.get(autoKey);
      if (existingJob && !existingJob.error) return 'accepted';
    }
    row.dataset.antCrossSeedAutoquiKey = autoKey;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ant-cross-seed-match-add ant-cross-seed-auto-add';
    button.textContent = 'Auto qui';
    button.title = `Auto adding ${match.site} torrent to qui`;
    button.hidden = true;
    row.appendChild(button);

    debugLog('auto qui add selected', {
      filename,
      site: match.site,
      seeders: match.seeders,
      minSeeders: getquiAutoAddMinSeeders(),
      title: match.title
    });
    const accepted = await addTrackerMatchToqui(row, filename, match, button, true);
    button.remove();
    return accepted ? 'accepted' : 'failed';
  }

  function appendMatches(row, matches, filename) {
    const mount = getRowInlineMount(row);

    let container = row.querySelector('.ant-cross-seed-matches');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ant-cross-seed-matches';
      mount.appendChild(container);
    }
    container.textContent = '';

    for (const match of matches) {
      const link = document.createElement('a');
      link.className = 'ant-cross-seed-match';
      link.href = match.detailsUrl || match.downloadUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.title = `${match.site}: ${match.title || 'match'} (${match.seeders || 0} seeders) - open torrent page`;

      const configuredIconUrl = getTrackerIconUrl(match.site);
      const iconUrl =
        configuredIconUrl || `${new URL(match.detailsUrl || match.downloadUrl).origin}/favicon.ico`;
      const icon = document.createElement('img');
      icon.alt = match.site;
      icon.className = 'ant-cross-seed-icon';
      const cachedIcon = getCachedIconDataUrl(match.site, iconUrl);
      if (cachedIcon) {
        icon.src = cachedIcon;
      } else if (configuredIconUrl) {
        icon.hidden = true;
        ensureIconDataUrl(match.site, iconUrl).then((dataUrl) => {
          if (!dataUrl) return;
          icon.src = dataUrl;
          icon.hidden = false;
        });
      } else {
        icon.hidden = true;
      }

      const seeders = document.createElement('span');
      seeders.className = 'ant-cross-seed-seeders';
      seeders.textContent = String(match.seeders ?? '?');

      link.append(icon, seeders);
      container.appendChild(link);

      if (match.downloadUrl) {
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'ant-cross-seed-match-add';
        addButton.textContent = '+qui';
        addButton.title = `Add ${match.site} torrent to qui`;
        addButton.addEventListener('click', async () => {
          await addTrackerMatchToqui(row, filename, match, addButton);
        });
        container.appendChild(addButton);
      }
    }
  }

  function collectquiSavePaths(quiMatches) {
    const paths = [];
    const seen = new Set();
    const defaultPath = String(GM_config.get('qui_save_path') || '').trim();
    if (defaultPath) {
      seen.add(defaultPath.toLowerCase());
      paths.push(defaultPath);
    }

    for (const match of quiMatches) {
      const path = String(match?.savePath || '').trim();
      if (!path) continue;
      const key = path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      paths.push(path);
    }

    return paths;
  }

  function renderquiMatches(row, filename, quiMatches) {
    const info = getRowInfo(row);
    let container = row.querySelector('.ant-cross-seed-qui');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ant-cross-seed-qui';
      const inlineMount = row.querySelector('.ant-cross-seed-inline') || getRowInlineMount(row);
      if (inlineMount?.parentNode) {
        inlineMount.parentNode.insertBefore(container, inlineMount.nextSibling);
      } else {
        info.appendChild(container);
      }
    }

    if (!quiMatches.length) {
      container.innerHTML = '';
      debugLog('qui render no matches', { filename });
      return;
    }

    const title = document.createElement('div');
    title.className = 'ant-cross-seed-qui-title';
    title.textContent = `qui strict filename matches for ${filename}`;

    const list = document.createElement('ul');
    list.className = 'ant-cross-seed-qui-list';
    for (const match of quiMatches) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'ant-cross-seed-qui-name';
      name.textContent = match.name || filename;

      const path = document.createElement('span');
      path.className = 'ant-cross-seed-qui-path';
      path.textContent = ` save path: ${match.savePath || '(no save path)'}`;

      item.append(name, path);
      list.appendChild(item);
    }

    const controls = document.createElement('div');
    controls.className = 'ant-cross-seed-qui-controls';

    const selectLabel = document.createElement('label');
    selectLabel.textContent = 'Add ANT to qui at ';

    const select = document.createElement('select');
    select.className = 'ant-cross-seed-qui-save-path';
    for (const path of collectquiSavePaths(quiMatches)) {
      const option = document.createElement('option');
      option.value = path;
      option.textContent = path;
      select.appendChild(option);
    }
    if (select.options.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '(qui default save path)';
      select.appendChild(option);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ant-cross-seed-qui-add';
    button.textContent = 'Add ANT torrent file';
    button.addEventListener('click', async () => {
      await addAntTorrentToqui(row, filename, select.value, button);
    });

    const status = document.createElement('span');
    status.className = 'ant-cross-seed-qui-add-status';

    selectLabel.appendChild(select);
    controls.append(selectLabel, button, status);

    container.textContent = '';
    container.append(title, list, controls);
    debugLog('qui matches rendered', {
      filename,
      matchCount: quiMatches.length,
      savePaths: collectquiSavePaths(quiMatches)
    });
  }

  function renderquiError(row, error) {
    let container = row.querySelector('.ant-cross-seed-qui');
    if (!container) {
      container = document.createElement('div');
      container.className = 'ant-cross-seed-qui';
      getRowInfo(row).appendChild(container);
    }
    container.innerHTML = `<span class="ant-cross-seed-qui-error">qui lookup failed: ${escapeHtml(error.message || error)}</span>`;
  }

  async function addAntTorrentToqui(row, filename, savePath, button) {
    const downloadUrl = getRowDownloadUrl(row);
    const status = row.querySelector('.ant-cross-seed-qui-add-status');
    if (!downloadUrl) {
      debugLog('qui add aborted', { filename, reason: 'missing ANT download URL' });
      if (status) status.textContent = 'Missing ANT download URL.';
      return;
    }

    const config = getAntquiConfig(savePath);

    button.disabled = true;
    if (status) {
      status.textContent = 'Submitting...';
      status.dataset.state = 'working';
    }

    try {
      await postToqui(config, [downloadUrl]);
      cacheDelete(`qui-result:${filename}`);
      debugLog('qui add complete', { filename, downloadUrl, savePath: config.savePath });
      markRowProcessingComplete(row, filename, 'manual-ant-added');
      if (status) {
        status.textContent = 'Submitted to qui.';
        status.dataset.state = 'done';
      }
    } catch (error) {
      debugLog('qui add failed', { filename, downloadUrl, savePath: config.savePath, error });
      if (status) {
        status.textContent = `qui add failed: ${error.message || error}`;
        status.dataset.state = 'error';
      }
    } finally {
      button.disabled = false;
    }
  }

  function renderCachedTrackerRow(
    row,
    torrentId,
    filename,
    trackers,
    titleSnapshot = null,
    allowAutoIgnore = true,
    antMetadata = null
  ) {
    const matches = getCachedTrackerMatches(filename, trackers);
    const completion = getRowCompletion(torrentId, filename, trackers);
    const cachedProcessing = getCachedRowProcessingData(torrentId);
    const fullyCompleted = isFullyCompletedRowCompletion(completion);
    const autoquiState = getAutoquiMatchDisposition(matches).state;
    const cachedAntMetadata = { ...(antMetadata || {}), filename };
    const trackerLookupsAvailable = trackers.every(
      (tracker) => tracker.ready?.(cachedAntMetadata) === true
    );
    const autoIgnored =
      allowAutoIgnore &&
      cachedProcessing?.quiLookupComplete === true &&
      cachedProcessing.filename === filename &&
      trackerLookupsAvailable &&
      shouldAutoIgnoreTrackerSearch(
        {
          complete: areTrackerResultsCached(filename, trackers),
          trackerCount: trackers.length
        },
        autoquiState,
        fullyCompleted
      ) &&
      markAdoptionRowIgnored(row, torrentId, false);
    const autoIgnoreStatusText = autoIgnored
      ? autoquiState === 'no-match'
        ? 'ignored: no tracker matches'
        : 'ignored: no match met auto-qui requirements'
      : '';
    appendMatches(row, matches, filename);
    restoreRowTitleLink(row, titleSnapshot);
    if (fullyCompleted) {
      setRowState(row, getRowCompletionText(completion), 'done');
    } else if (autoIgnored) {
      setRowState(row, autoIgnoreStatusText, 'skipped');
      cacheRowProcessingData(
        torrentId,
        filename,
        trackers,
        cachedProcessing?.quiMatches || [],
        matches,
        autoIgnoreStatusText,
        'skipped'
      );
    } else {
      setRowState(
        row,
        matches.length
          ? `cached ${matches.length} match${matches.length === 1 ? '' : 'es'}`
          : 'cached no matches',
        matches.length ? 'done' : 'none'
      );
    }
    if (areTrackerResultsCached(filename, trackers)) {
      markRowTrackerComplete(torrentId, filename, trackers);
    }
    debugLog('cached row skipped from batch', {
      torrentId,
      filename,
      trackers: trackers.map((tracker) => tracker.site),
      complete: fullyCompleted,
      matchCount: matches.length,
      autoquiState,
      trackerLookupsAvailable,
      autoIgnored
    });
  }

  function collectBatchRows(rows, trackers, limit, refreshCache = false) {
    const batch = [];
    const stats = {
      rowCount: rows.length,
      eligibleTotal: 0,
      skippedTrumpable: 0,
      skippedM2ts: 0,
      skippedMissingTitleLink: 0,
      skippedMissingId: 0,
      skippedCached: 0,
      skippedBroken: 0,
      skippedRefreshed: 0
    };

    for (const row of rows) {
      if (getTorrentAction(getRowTorrentId(row)) === 'broken') {
        stats.skippedBroken += 1;
        setRowState(row, 'broken: rescan metadata to retry', 'error');
        continue;
      }
      const titleSnapshot = snapshotRowTitleLink(row);
      if (shouldSkipTrumpableRows() && isTrumpableRow(row)) {
        stats.skippedTrumpable += 1;
        setRowState(row, 'skipped trumpable', 'skipped');
        restoreRowTitleLink(row, titleSnapshot);
        continue;
      }

      if (isM2tsRow(row)) {
        stats.skippedM2ts += 1;
        setRowState(row, 'skipped m2ts', 'skipped');
        restoreRowTitleLink(row, titleSnapshot);
        continue;
      }

      if (!titleSnapshot) {
        stats.skippedMissingTitleLink += 1;
        const torrentId = getRowTorrentId(row);
        if (torrentId) markAdoptionRowAction(row, 'broken', torrentId, false);
        setRowState(
          row,
          torrentId ? 'broken: missing ANT title link' : 'missing ANT torrent id and title link',
          'error'
        );
        continue;
      }

      const torrentId = getRowTorrentId(row);
      const groupId = getRowGroupId(row);
      const rowTrackers = getTrackersForRow(row, trackers);
      if (!torrentId) {
        stats.skippedMissingId += 1;
        setRowState(row, 'missing ANT torrent id', 'error');
        restoreRowTitleLink(row, titleSnapshot);
        continue;
      }

      const cachedMetadata = cacheGet(antMetadataCacheKey(torrentId), null);
      const cachedFilename = cachedMetadata?.filename || cacheGet(`ant-filename:${torrentId}`);
      const completion = cachedFilename
        ? getRowCompletion(torrentId, cachedFilename, rowTrackers)
        : null;
      const cachedProcessing = getCachedRowProcessingData(torrentId);
      const quiConfig = getquiConfig();
      const quiLookupRequired = Boolean(quiConfig.baseUrl && quiConfig.token);
      const availableTrackers = rowTrackers.filter((tracker) =>
        tracker.ready?.({ ...cachedMetadata, filename: cachedFilename })
      );
      if (cachedFilename && isFullyCompletedRowCompletion(completion)) {
        stats.skippedCached += 1;
        renderCachedTrackerRow(
          row,
          torrentId,
          cachedFilename,
          rowTrackers,
          titleSnapshot,
          true,
          cachedMetadata
        );
        continue;
      }
      if (refreshCache) {
        const key = refreshRowKey(torrentId, cachedFilename, rowTrackers);
        if (refreshedRowKeys.has(key)) {
          stats.skippedRefreshed += 1;
          if (cachedFilename) {
            renderCachedTrackerRow(
              row,
              torrentId,
              cachedFilename,
              rowTrackers,
              titleSnapshot,
              false,
              cachedMetadata
            );
          }
          continue;
        }
      } else if (
        cachedFilename &&
        (cachedMetadata?.filename || availableTrackers.length === rowTrackers.length) &&
        (!quiLookupRequired ||
          (cachedProcessing?.quiLookupComplete === true &&
            cachedProcessing.filename === cachedFilename)) &&
        areTrackerResultsCached(cachedFilename, availableTrackers)
      ) {
        stats.skippedCached += 1;
        renderCachedTrackerRow(
          row,
          torrentId,
          cachedFilename,
          rowTrackers,
          titleSnapshot,
          true,
          cachedMetadata
        );
        continue;
      }

      stats.eligibleTotal += 1;
      if (limit === 0 || batch.length < limit) {
        batch.push({
          row,
          torrentId,
          groupId,
          cachedFilename,
          cachedMetadata,
          trackers: rowTrackers
        });
      }
    }

    debugLog('batch rows collected', {
      limit,
      refreshCache,
      trackers: trackers.map((tracker) => tracker.site),
      batchCount: batch.length,
      ...stats
    });
    return { batch, stats };
  }

  function getRunButtonIdleText(limit, hasRemaining) {
    if (!hasRemaining) return 'No uncached rows remaining';
    if (limit > 0) return `Process next ${limit} adoption rows`;
    return 'Search adoption rows';
  }

  function setRowProcessingControls(running) {
    rowProcessingRunning = running;
    document.querySelectorAll('.ant-cross-seed-rescan-metadata').forEach((button) => {
      button.disabled = running;
    });
    const cancelButton = document.querySelector('#ant-cross-seed-cancel');
    if (!cancelButton) return;
    cancelButton.disabled = !running || rowProcessingCancelRequested;
    cancelButton.textContent = rowProcessingCancelRequested
      ? 'Cancelling...'
      : 'Cancel row processing';
  }

  function requestRowProcessingCancellation() {
    if (!rowProcessingRunning || rowProcessingCancelRequested) return false;
    rowProcessingCancelRequested = true;
    setRowProcessingControls(true);
    const display = document.querySelector('#ant-cross-seed-progress');
    const bar = display?.querySelector('progress');
    updateRunProgress(
      Number(bar?.value) || 0,
      Number(bar?.max) || 0,
      'Cancellation requested; finishing the current request...',
      'running'
    );
    return true;
  }

  function rowProcessingCacheKey(torrentId) {
    return `row-processing-v1:${torrentId}`;
  }

  function cacheRowProcessingData(
    torrentId,
    filename,
    trackers,
    quiMatches,
    trackerMatches,
    statusText,
    statusState,
    quiLookupComplete = true
  ) {
    if (!torrentId || !filename) return;
    cacheSet(rowProcessingCacheKey(torrentId), {
      version: 1,
      torrentId: String(torrentId),
      filename,
      trackerSites: trackers.map((tracker) => tracker.site),
      quiMatches: quiMatches.map((match) => ({
        name: match.name || '',
        savePath: match.savePath || ''
      })),
      trackerMatches,
      statusText,
      statusState,
      quiLookupComplete,
      processedAt: Date.now()
    });
  }

  function getCachedRowProcessingData(torrentId) {
    const cached = cacheGet(rowProcessingCacheKey(torrentId), null);
    return cached?.version === 1 && cached.filename ? cached : null;
  }

  function restoreCachedRowProcessingData(row) {
    const torrentId = getRowTorrentId(row);
    if (getTorrentAction(torrentId) === 'broken') {
      setRowState(row, 'broken: rescan metadata to retry', 'error');
      return true;
    }
    const cached = getCachedRowProcessingData(torrentId);
    if (!cached) {
      const metadata = cacheGet(antMetadataCacheKey(torrentId), null);
      const filename = metadata?.filename || cacheGet(`ant-filename:${torrentId}`);
      if (!filename) return false;
      const trackers = getTrackersForRow(row, getScopedTrackers());
      const matches = getCachedTrackerMatches(filename, trackers);
      if (!matches.length) return false;
      row.dataset.antCrossSeedTorrentId = String(torrentId);
      row.dataset.antCrossSeedFilename = filename;
      row.dataset.antCrossSeedTrackerSites = trackers.map((tracker) => tracker.site).join(',');
      appendMatches(row, matches, filename);
      setRowState(row, `cached ${matches.length} match${matches.length === 1 ? '' : 'es'}`, 'done');
      return true;
    }

    row.dataset.antCrossSeedTorrentId = String(torrentId);
    row.dataset.antCrossSeedFilename = cached.filename;
    row.dataset.antCrossSeedTrackerSites = (cached.trackerSites || []).join(',');
    renderquiMatches(row, cached.filename, cached.quiMatches || []);
    appendMatches(row, cached.trackerMatches || [], cached.filename);
    setRowState(row, cached.statusText || 'cached processing data', cached.statusState || 'done');
    return true;
  }

  function isRowEligibleForCachedDataRestore(row, loadAll) {
    return Boolean(
      row?.classList?.contains('zeroseed') &&
      !row.hidden &&
      row.dataset.antCrossSeedPageCacheChecked !== 'true' &&
      (loadAll || ['grabbed', 'ignored', 'broken'].includes(row.dataset.antAdoptionAction))
    );
  }

  function getRowsForCachedDataRestore(loadAll) {
    return [...document.querySelectorAll('tr.torrent.torrent_row.zeroseed')].filter((row) =>
      isRowEligibleForCachedDataRestore(row, loadAll)
    );
  }

  function restoreCachedRowStatuses(rows) {
    const rowsWithoutSnapshots = rows.filter((row) => !restoreCachedRowProcessingData(row));
    rows.forEach((row) => {
      row.dataset.antCrossSeedPageCacheChecked = 'true';
    });
    return rows.length - rowsWithoutSnapshots.length;
  }

  function loadCachedRowStatusesOnPageLoad() {
    if (!GM_config.get('use_cache')) return 0;
    const startedAt = performanceNow();
    const loadAll = Boolean(GM_config.get('load_cache_status_on_page_load'));
    const rows = getRowsForCachedDataRestore(loadAll);
    const snapshotCount = restoreCachedRowStatuses(rows);
    debugLog('page-load cache status loaded', {
      rowCount: rows.length,
      snapshotCount
    });
    lifecycleLog('cached row status restoration completed', {
      durationMs: elapsedMilliseconds(startedAt),
      rows: rows.length,
      snapshots: snapshotCount
    });
    return rows.length;
  }

  async function scheduleCachedRowStatusesOnPageLoad() {
    if (!GM_config.get('use_cache')) {
      lifecycleLog('deferred cached row status restoration skipped', { reason: 'cache disabled' });
      return;
    }
    const startedAt = performanceNow();
    const loadAll = Boolean(GM_config.get('load_cache_status_on_page_load'));
    const rows = getRowsForCachedDataRestore(loadAll);
    const snapshotCount = restoreCachedRowStatuses(rows);
    lifecycleLog('deferred cached row status restoration completed', {
      durationMs: elapsedMilliseconds(startedAt),
      passes: rows.length > 0 ? 1 : 0,
      rows: rows.length,
      snapshots: snapshotCount
    });
  }

  function queueCachedRowStatusesOnPageLoad() {
    cachedRowStatusRestoreRequested = true;
    if (cachedRowStatusRestoreRunning) return cachedRowStatusRestoreQueue;
    cachedRowStatusRestoreRunning = true;
    cachedRowStatusRestoreQueue = cachedRowStatusRestoreQueue
      .catch(() => undefined)
      .then(async () => {
        while (cachedRowStatusRestoreRequested) {
          cachedRowStatusRestoreRequested = false;
          await scheduleCachedRowStatusesOnPageLoad();
        }
      })
      .finally(() => {
        cachedRowStatusRestoreRunning = false;
      });
    return cachedRowStatusRestoreQueue;
  }

  async function resolveRowAntMetadata(
    row,
    torrentId,
    groupId,
    cachedMetadata = null,
    refreshCache = false
  ) {
    try {
      const metadata =
        !refreshCache && cachedMetadata?.filename && cachedMetadata?.imdbId
          ? cachedMetadata
          : await getAntMetadata(torrentId, groupId, refreshCache);
      if (!isNonemptyString(metadata?.filename)) throw new Error('No usable ANT filename found.');
      return metadata;
    } catch (error) {
      markAdoptionRowAction(row, 'broken', torrentId, false);
      setRowState(row, `broken: ${error.message || error}`, 'error');
      debugLog('ANT metadata lookup failed', { torrentId, error });
      return null;
    }
  }

  async function rescanBrokenRow(row, torrentId) {
    if (rowProcessingRunning || getTorrentAction(torrentId) !== 'broken') return;
    rowProcessingCancelRequested = false;
    setRowProcessingControls(true);
    try {
      setRowState(row, 'rescanning ANT metadata', 'working');
      const metadata = await resolveRowAntMetadata(row, torrentId, getRowGroupId(row), null, true);
      if (metadata) {
        markAdoptionRowAction(row, '', torrentId, false);
        setRowState(row, 'metadata resolved: ready to process', 'done');
      }
    } catch (error) {
      setRowState(row, `rescan failed: ${error.message || error}`, 'error');
    } finally {
      setRowProcessingControls(false);
    }
  }

  async function processRow(row, index, total, trackers, rowMeta = {}, refreshCache = false) {
    if (getTorrentAction(rowMeta.torrentId || getRowTorrentId(row)) === 'broken') return;
    const rowTrackers = rowMeta.trackers || getTrackersForRow(row, trackers);
    const titleSnapshot = snapshotRowTitleLink(row);
    if (!titleSnapshot) {
      debugLog('row skipped', { index, total, reason: 'missing ANT title link' });
      const torrentId = rowMeta.torrentId || getRowTorrentId(row);
      if (torrentId) markAdoptionRowAction(row, 'broken', torrentId, false);
      setRowState(
        row,
        torrentId ? 'broken: missing ANT title link' : 'missing ANT torrent id and title link',
        'error'
      );
      return;
    }

    if (shouldSkipTrumpableRows() && isTrumpableRow(row)) {
      debugLog('row skipped', { index, total, reason: 'trumpable' });
      setRowState(row, `skipped trumpable (${index}/${total})`, 'skipped');
      restoreRowTitleLink(row, titleSnapshot);
      return;
    }

    if (isM2tsRow(row)) {
      debugLog('row skipped', { index, total, reason: 'm2ts' });
      setRowState(row, `skipped m2ts (${index}/${total})`, 'skipped');
      restoreRowTitleLink(row, titleSnapshot);
      return;
    }

    const torrentId = rowMeta.torrentId || getRowTorrentId(row);
    const groupId = rowMeta.groupId || getRowGroupId(row);
    if (!torrentId) {
      debugLog('row skipped', { index, total, reason: 'missing ANT torrent id', groupId });
      setRowState(row, `missing ANT torrent id (${index}/${total})`, 'error');
      restoreRowTitleLink(row, titleSnapshot);
      return;
    }

    debugLog('row processing start', { index, total, torrentId, groupId });
    setRowState(row, `resolving metadata (${index}/${total})`, 'working');
    const antMetadata = await resolveRowAntMetadata(
      row,
      torrentId,
      groupId,
      rowMeta.cachedMetadata
    );
    if (!antMetadata) {
      restoreRowTitleLink(row, titleSnapshot);
      return;
    }
    antMetadata.isM2tsRow = isM2tsRow(row);
    const filename = antMetadata.filename;
    debugLog('row metadata resolved', { index, total, torrentId, groupId, antMetadata });
    row.dataset.antCrossSeedTorrentId = String(torrentId);
    row.dataset.antCrossSeedFilename = filename;
    row.dataset.antCrossSeedTrackerSites = rowTrackers.map((tracker) => tracker.site).join(',');

    setRowState(row, `searching qui for ${filename} (${index}/${total})`, 'working');
    let quiMatches = [];
    let quiLookupComplete = false;
    const quiConfig = getquiConfig();
    try {
      quiMatches = await searchqui(filename);
      quiLookupComplete = Boolean(quiConfig.baseUrl && quiConfig.token);
      renderquiMatches(row, filename, quiMatches);
    } catch (error) {
      debugLog('qui filename lookup failed', { filename, error });
      console.warn('qui filename lookup failed:', error);
      renderquiError(row, error);
    }

    setRowState(row, `searching ${filename} (${index}/${total})`, 'working');

    const trackerSearch = await searchScopedTrackers(
      antMetadata,
      torrentId,
      rowTrackers,
      refreshCache
    );
    const { matches } = trackerSearch;
    appendMatches(row, matches, filename);
    const autoquiState = await maybeAutoAddTrackerMatchToqui(row, filename, matches);
    const fullyCompleted = isFullyCompletedRowCompletion(
      getRowCompletion(torrentId, filename, rowTrackers)
    );
    const autoIgnored =
      quiLookupComplete &&
      shouldAutoIgnoreTrackerSearch(trackerSearch, autoquiState, fullyCompleted) &&
      markAdoptionRowIgnored(row, torrentId);
    restoreRowTitleLink(row, titleSnapshot);
    if (areTrackerResultsCached(filename, rowTrackers)) {
      markRowTrackerComplete(torrentId, filename, rowTrackers);
    }
    if (refreshCache) {
      refreshedRowKeys.add(refreshRowKey(torrentId, filename, rowTrackers));
      refreshedRowKeys.add(refreshRowKey(torrentId, rowMeta.cachedFilename, rowTrackers));
    }
    debugLog('row processing complete', {
      index,
      total,
      torrentId,
      groupId,
      filename,
      matches,
      trackerSearchComplete: trackerSearch.complete,
      quiLookupComplete,
      autoquiState,
      autoIgnored
    });
    const statusText = autoIgnored
      ? autoquiState === 'no-match'
        ? 'ignored: no tracker matches'
        : 'ignored: no match met auto-qui requirements'
      : matches.length
        ? `${matches.length} match${matches.length === 1 ? '' : 'es'}`
        : 'no matches';
    const statusState = autoIgnored ? 'skipped' : matches.length ? 'done' : 'none';
    cacheRowProcessingData(
      torrentId,
      filename,
      rowTrackers,
      quiMatches,
      matches,
      statusText,
      statusState,
      quiLookupComplete
    );
    setRowState(row, statusText, statusState);
  }

  async function run() {
    if (rowProcessingRunning) return;
    const button = document.querySelector('#ant-cross-seed-run');
    const rows = getRows();
    const limit = getRowLimit();
    const trackers = getScopedTrackers();
    const refreshCache = shouldRefreshTrackerCache();
    const { batch, stats } = collectBatchRows(rows, trackers, limit, refreshCache);
    applyAdoptionFilters(false);
    const hasRemaining = stats.eligibleTotal > batch.length;
    rowProcessingCancelRequested = false;
    setRowProcessingControls(true);
    debugLog('run start', {
      rowCount: rows.length,
      batchCount: batch.length,
      eligibleTotal: stats.eligibleTotal,
      trackers: trackers.map((tracker) => tracker.site),
      limit,
      refreshCache,
      skipTrumpable: shouldSkipTrumpableRows(),
      rowDelaySeconds: getRowDelaySeconds(),
      useCache: GM_config.get('use_cache'),
      trackerScope: getTrackerScope() || 'All enabled trackers',
      qui: {
        ...getquiConfig(),
        hasToken: Boolean(getquiConfig().token)
      }
    });
    if (button) {
      button.disabled = true;
      button.textContent =
        batch.length > 0
          ? `Processing 0/${batch.length} eligible rows...`
          : 'No uncached rows remaining';
    }
    updateRunProgress(
      0,
      batch.length,
      batch.length > 0
        ? `Processing 0 of ${batch.length} eligible rows.`
        : 'No uncached eligible rows remain.',
      batch.length > 0 ? 'running' : 'complete'
    );

    if (batch.length === 0) {
      if (button) {
        button.disabled = false;
        button.textContent = getRunButtonIdleText(limit, false);
      }
      setRowProcessingControls(false);
      debugLog('run complete: no eligible rows', { stats });
      return;
    }

    const delayMs = getRowDelaySeconds() * 1000;
    let failedRows = 0;
    let handledRows = 0;
    let cancelled = false;
    for (let i = 0; i < batch.length; i += 1) {
      if (rowProcessingCancelRequested) {
        cancelled = true;
        break;
      }
      const entry = batch[i];
      try {
        if (button) button.textContent = `Processing ${i + 1}/${batch.length} eligible rows...`;
        updateRunProgress(
          i,
          batch.length,
          `Processing row ${i + 1} of ${batch.length}...`,
          'running'
        );
        await processRow(entry.row, i + 1, batch.length, trackers, entry, refreshCache);
      } catch (error) {
        if (rowProcessingCancelRequested) {
          cancelled = true;
          break;
        }
        try {
          const retried = await retryRowAfterError(
            error,
            entry,
            i + 1,
            batch.length,
            trackers,
            refreshCache,
            button
          );
          if (!retried) {
            cancelled = true;
            break;
          }
        } catch (retryError) {
          debugLog('row processing failed after retry', {
            index: i + 1,
            total: batch.length,
            error: retryError
          });
          console.error('ANT adoption row processing failed after retry:', retryError);
          setRowState(entry.row, `error: ${retryError.message || retryError}`, 'error');
          failedRows += 1;
        }
      }
      handledRows = i + 1;
      updateRunProgress(
        handledRows,
        batch.length,
        `Handled ${handledRows} of ${batch.length} rows${failedRows ? `; ${failedRows} failed` : ''}.`,
        failedRows ? 'error' : 'running'
      );
      if (rowProcessingCancelRequested) {
        cancelled = true;
        break;
      }
      if (i < batch.length - 1 && delayMs > 0) {
        debugLog('row delay start', { delayMs, nextIndex: i + 2, total: batch.length });
        updateRunProgress(
          i + 1,
          batch.length,
          `Handled ${i + 1} of ${batch.length}${failedRows ? `; ${failedRows} failed` : ''}; waiting before the next row...`,
          failedRows ? 'error' : 'running'
        );
        const completedDelay = await sleepWithButtonCountdown(
          delayMs,
          button,
          `(${i + 1}/${batch.length})`,
          () => !rowProcessingCancelRequested
        );
        if (!completedDelay) {
          cancelled = true;
          break;
        }
      }
    }

    if (button) {
      button.disabled = false;
      button.textContent = getRunButtonIdleText(
        limit,
        hasRemaining || cancelled || handledRows < batch.length
      );
    }
    if (cancelled) {
      updateRunProgress(
        handledRows,
        batch.length,
        `Cancelled after ${handledRows} of ${batch.length} rows${failedRows ? `; ${failedRows} failed` : ''}.`,
        'cancelled'
      );
      debugLog('run cancelled', {
        rowCount: rows.length,
        batchCount: batch.length,
        handledRows,
        failedRows,
        stats
      });
      rowProcessingCancelRequested = false;
      setRowProcessingControls(false);
      return;
    }
    updateRunProgress(
      batch.length,
      batch.length,
      failedRows
        ? `Finished with errors: ${batch.length} rows handled; ${failedRows} failed.`
        : hasRemaining
          ? `Finished this batch: ${batch.length} rows handled. More eligible rows remain.`
          : `Finished: ${batch.length} of ${batch.length} eligible rows handled.`,
      failedRows ? 'error' : 'complete'
    );
    debugLog('run complete', {
      rowCount: rows.length,
      batchCount: batch.length,
      failedRows,
      stats
    });
    rowProcessingCancelRequested = false;
    setRowProcessingControls(false);
  }

  function addControls() {
    if (document.querySelector('#ant-cross-seed-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'ant-cross-seed-toolbar';

    const scanButton = document.createElement('button');
    scanButton.id = 'ant-adoption-scan';
    scanButton.type = 'button';
    scanButton.textContent = `Scan ${getScanPageCount()} adoption pages`;
    scanButton.addEventListener('click', () => startAdoptionScan(scanButton));

    const bountyScanButton = document.createElement('button');
    bountyScanButton.id = 'ant-adoption-scan-bounty';
    bountyScanButton.type = 'button';
    bountyScanButton.textContent = getBountyScanButtonText();
    bountyScanButton.disabled = getMinimumBounty() <= 0;
    bountyScanButton.title =
      getMinimumBounty() > 0
        ? `Scans bounty-descending pages until the first bounty below ${getMinimumBounty()}, up to ${MAX_SCAN_PAGES} pages.`
        : 'Set Minimum bounty above zero in Settings to enable this scan.';
    bountyScanButton.addEventListener('click', () => startAdoptionScan(bountyScanButton, true));

    const openLastScanButton = document.createElement('button');
    openLastScanButton.id = 'ant-adoption-open-last-scan';
    openLastScanButton.type = 'button';
    openLastScanButton.textContent = 'Open last scan';
    openLastScanButton.addEventListener('click', openLastFilteredScan);

    const settings = document.createElement('button');
    settings.type = 'button';
    settings.textContent = 'Settings';
    settings.addEventListener('click', () => GM_config.open());

    toolbar.append(scanButton, bountyScanButton, openLastScanButton);
    if (isFilteredAdoptionView()) {
      const button = document.createElement('button');
      button.id = 'ant-cross-seed-run';
      button.type = 'button';
      button.textContent = getRunButtonIdleText(getRowLimit(), true);
      button.addEventListener('click', () => {
        run().catch((error) => {
          console.error('ANT adoption row processing failed:', error);
          button.disabled = false;
          button.textContent = getRunButtonIdleText(getRowLimit(), true);
          rowProcessingCancelRequested = false;
          setRowProcessingControls(false);
          const bar = document.querySelector('#ant-cross-seed-progress progress');
          updateRunProgress(
            Number(bar?.value) || 0,
            Number(bar?.max) || 0,
            `Processing failed: ${error.message || error}`,
            'error'
          );
        });
      });

      const cancelButton = document.createElement('button');
      cancelButton.id = 'ant-cross-seed-cancel';
      cancelButton.type = 'button';
      cancelButton.disabled = true;
      cancelButton.textContent = 'Cancel row processing';
      cancelButton.addEventListener('click', requestRowProcessingCancellation);
      toolbar.append(button, cancelButton);
    }
    toolbar.appendChild(settings);

    const target =
      document.querySelector('.thin > h2, #content > h2, h2') ||
      document.querySelector('.thin, #content, body');
    target.parentNode.insertBefore(toolbar, target.nextSibling);
    if (isFilteredAdoptionView()) addRunProgressDisplay();
    updateOpenLastScanButton();
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      ${EXCLUSION_CONTROL_CSS}
      #ant-adoption-ready-notice {
        background: #b00020;
        border: 4px solid #ff5252;
        box-shadow: 0 0 18px rgba(255, 0, 0, 0.65);
        color: #fff;
        font-size: 24px;
        font-weight: 800;
        line-height: 1.3;
        margin: 12px 0;
        padding: 16px 20px;
        text-align: center;
        text-transform: uppercase;
      }

      #ant-adoption-ready-notice[data-state="adopted"] {
        background: #147a35;
        border-color: #48d978;
        box-shadow: 0 0 18px rgba(46, 204, 113, 0.65);
      }

      #ant-cross-seed-toolbar {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 8px 0 12px;
      }

      #ant-cross-seed-toolbar button {
        cursor: pointer;
        padding: 4px 9px;
      }

      #ant-cross-seed-progress {
        align-items: center;
        background: rgba(0, 0, 0, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.15);
        display: grid;
        gap: 6px;
        grid-template-columns: minmax(180px, 1fr) minmax(260px, 2fr);
        margin: 0 0 12px;
        padding: 8px;
      }

      #ant-cross-seed-progress progress {
        accent-color: #d0ae3d;
        width: 100%;
      }

      #ant-cross-seed-progress[data-state="complete"] progress {
        accent-color: #4aa564;
      }

      #ant-cross-seed-progress[data-state="error"] progress {
        accent-color: #c94f4f;
      }

      #ant-cross-seed-progress[data-state="cancelled"] progress {
        accent-color: #aaa;
      }

      .ant-cross-seed-progress-text {
        color: #c8c8c8;
      }

      #ant-adoption-filter-toolbar {
        background: #292c30;
        border: 1px solid #484c52;
        border-radius: 8px;
        color: #e5e7eb;
        margin: 12px 0 18px;
        width: 100%;
        box-sizing: border-box;
      }

      #ant-adoption-filter-toolbar > summary {
        cursor: pointer;
        padding: 16px 20px;
        font-size: 15px;
        font-weight: 600;
        color: #f2db83;
      }

      #ant-adoption-filter-toolbar[open] > summary {
        border-bottom: 1px solid #484c52;
      }

      #ant-adoption-filter-toolbar .ant-filter-body {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
        padding: 20px;
      }

      #ant-adoption-filter-toolbar .ant-filter-section {
        border: 1px solid #484c52;
        border-radius: 6px;
        padding: 14px;
        margin: 0;
        min-width: 0;
      }

      #ant-adoption-filter-toolbar legend {
        color: #d8dce2;
        font-size: 13px;
        font-weight: 600;
        padding: 0 6px;
      }

      #ant-adoption-filter-toolbar .ant-filter-section > label {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px;
        font-size: 12px;
      }

      #ant-adoption-filter-toolbar select,
      #ant-adoption-filter-toolbar input[type="number"] {
        background: #202327;
        border: 1px solid #585e67;
        border-radius: 4px;
        color: #f1f3f5;
        padding: 7px 9px;
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
      }

      #ant-adoption-filter-toolbar .ant-filter-section > label > select {
        width: 100%;
      }

      #ant-adoption-filter-toolbar input[type="number"] {
        width: 130px;
        margin-left: auto;
      }

      #ant-adoption-filter-toolbar input[type="checkbox"] {
        accent-color: #d0ae3d;
        margin: 0;
      }

      #ant-adoption-filter-toolbar .ant-filter-media,
      #ant-adoption-filter-toolbar .ant-filter-actions {
        grid-column: 1 / -1;
      }

      #ant-adoption-filter-toolbar .ant-media-filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        align-items: start;
        gap: 10px;
      }

      #ant-adoption-filter-toolbar .ant-exclusion-select { min-width: 0; }
      #ant-adoption-filter-toolbar .ant-exclusion-select summary { padding: 10px; background: #33373d; }
      #ant-adoption-filter-toolbar .ant-exclusion-options {
        position: static;
        min-width: 0;
        margin-top: 5px;
        border-radius: 4px;
        background: #202327;
        max-height: 320px;
      }

      #ant-adoption-filter-toolbar .ant-exclusion-options select { width: 100%; margin-bottom: 8px; }
      #ant-adoption-filter-toolbar select:disabled { opacity: 0.5; }
      #ant-adoption-filter-toolbar .ant-filter-actions { display: flex; flex-wrap: wrap; gap: 10px; }
      #ant-adoption-filter-toolbar .ant-filter-actions button {
        background: #3d434b;
        border: 1px solid #626a75;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        padding: 9px 14px;
      }
      #ant-adoption-filter-toolbar .ant-filter-actions button:last-child { background: #326044; border-color: #4b8562; }
      #ant-adoption-filter-toolbar :is(button, input, select, summary):focus-visible { outline: 2px solid #f2db83; outline-offset: 3px; }

      @media (max-width: 800px) {
        #ant-adoption-filter-toolbar .ant-filter-body { grid-template-columns: 1fr; padding: 12px; }
        #ant-adoption-filter-status { display: block; margin-top: 6px; }
      }

      #ant-adoption-filter-status {
        color: #b7bec8;
        font-size: 12px;
        font-weight: normal;
        margin-left: 16px;
      }

      ${FILTERABLE_ROW_SELECTOR}[hidden] {
        display: none !important;
      }

      .${BOUNTY_GIB_COLUMN_CLASS},
      .${ACTION_COLUMN_CLASS} {
        text-align: center;
        white-space: nowrap;
      }

      .ant-adoption-highlight-grabbed {
        background-image: linear-gradient(${GRABBED_HIGHLIGHT_COLOR}, ${GRABBED_HIGHLIGHT_COLOR}) !important;
      }

      .ant-adoption-highlight-ignored {
        background-image: linear-gradient(${IGNORED_HIGHLIGHT_COLOR}, ${IGNORED_HIGHLIGHT_COLOR}) !important;
      }

      .ant-cross-seed-inline {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-start;
        margin-top: 4px;
        width: 100%;
      }

      .ant-cross-seed-state {
        color: #c8c8c8;
        display: inline-block;
      }

      .ant-cross-seed-state[data-state="working"] {
        color: #e2c15a;
      }

      .ant-cross-seed-state[data-state="done"] {
        color: #72c472;
      }

      .ant-cross-seed-state[data-state="error"] {
        color: #df6b6b;
      }

      .ant-cross-seed-state[data-state="none"] {
        color: #e2c15a;
      }

      .ant-cross-seed-state[data-state="skipped"] {
        color: #999;
      }

      .ant-cross-seed-matches {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        vertical-align: middle;
      }

      .ant-cross-seed-match {
        align-items: center;
        display: inline-flex;
        gap: 2px;
        text-decoration: none;
      }

      .ant-cross-seed-match-add {
        cursor: pointer;
        font-size: 10px;
        line-height: 1.2;
        margin-left: -2px;
        padding: 1px 4px;
      }

      .ant-cross-seed-match-add[data-state="working"] {
        color: #e2c15a;
      }

      .ant-cross-seed-match-add[data-state="done"] {
        color: #72c472;
      }

      .ant-cross-seed-match-add[data-state="error"] {
        color: #df6b6b;
      }

      .ant-cross-seed-icon {
        height: 14px;
        object-fit: contain;
        width: 14px;
      }

      .ant-cross-seed-seeders {
        color: #8bd18b;
        font-size: 11px;
        line-height: 1;
      }

      .ant-cross-seed-qui {
        border-left: 2px solid rgba(139, 209, 139, 0.45);
        margin-top: 5px;
        padding-left: 8px;
      }

      .ant-cross-seed-qui:empty {
        display: none;
      }

      .ant-cross-seed-qui-title {
        color: #8bd18b;
        font-weight: 600;
        margin-bottom: 3px;
      }

      .ant-cross-seed-qui-list {
        margin: 3px 0 5px 18px;
        padding: 0;
      }

      .ant-cross-seed-qui-path {
        color: #c8c8c8;
      }

      .ant-cross-seed-qui-controls {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }

      .ant-cross-seed-qui-save-path {
        min-width: 280px;
      }

      .ant-cross-seed-qui-add-status[data-state="working"] {
        color: #e2c15a;
      }

      .ant-cross-seed-qui-add-status[data-state="done"] {
        color: #72c472;
      }

      .ant-cross-seed-qui-add-status[data-state="error"],
      .ant-cross-seed-qui-error {
        color: #df6b6b;
      }

      .ant-cross-seed-qui-monitor {
        border-left: 2px solid rgba(226, 193, 90, 0.45);
        margin-top: 5px;
        padding-left: 8px;
      }

      .ant-cross-seed-qui-monitor:empty {
        display: none;
      }

      .ant-cross-seed-qui-monitor-title {
        color: #e2c15a;
        font-weight: 600;
        margin-bottom: 3px;
      }

      .ant-cross-seed-qui-monitor-table {
        border-collapse: collapse;
        margin-top: 3px;
        max-width: 100%;
      }

      .ant-cross-seed-qui-monitor-table th,
      .ant-cross-seed-qui-monitor-table td {
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        padding: 2px 7px 2px 0;
        text-align: left;
      }

      .ant-cross-seed-qui-monitor-table tr[data-state="working"] td {
        color: #e2c15a;
      }

      .ant-cross-seed-qui-monitor-table tr[data-state="done"] td {
        color: #72c472;
      }

      .ant-cross-seed-qui-monitor-table tr[data-state="error"] td {
        color: #df6b6b;
      }
    `;
    document.head.appendChild(style);
  }

  if (isAdoptionReadyView()) {
    addStyles();
    initializeAdoptionReadyView();
    return;
  }
  if (!isAdoptionListingView()) return;

  let filteredAdoptionView = isFilteredAdoptionView();
  const filteredViewStartedAt = filteredAdoptionView ? performanceNow() : null;
  if (filteredAdoptionView) lifecycleLog('filtered page initialization started');
  if (filteredAdoptionView && !restoreFilteredScanRows()) {
    exitFilteredAdoptionView();
    filteredAdoptionView = false;
  }
  addStyles();
  addControls();
  if (!filteredAdoptionView) return;
  decorateAdoptionRows();
  applyDefaultAdoptionSort();
  addAdoptionFilterControls();
  const initialFilterResult = applyAdoptionFilters(false);
  lifecycleLog('filtered page initial render completed', {
    deferredRows: deferredFilteredScanRows.length,
    durationMs: elapsedMilliseconds(filteredViewStartedAt),
    renderedRows: initialFilterResult.evaluatedRows
  });
})();
