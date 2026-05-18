// ==UserScript==
// @name         ANT - Adoption cross-seed finder
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.1.1
// @description  Search other trackers for ANT adoption torrents by IMDb id and strict filelist match.
// @author       Audionut
// @match        https://anthelion.me/torrents.php?type=adoption*
// @icon         https://anthelion.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ant-adoption-finder.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ant-adoption-finder.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
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

(function () {
  'use strict';

  const SCRIPT_PREFIX = 'ant-adoption-filename-cross-seed';
  const CACHE_STORAGE_PREFIX = `${SCRIPT_PREFIX}:c:`;
  const CACHE_COMPRESSION_PREFIX = 'lz-json-v3:';
  const ROW_DELAY_MIN_SECONDS = 30;
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

  const fields = {
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
      tooltip: 'Render cached row status and cached tracker links as soon as the page opens.'
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
      tooltip: 'Log row parsing, cache, qui, ANT, and tracker lookup details to console.log.'
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
        'After a site torrent completes in qui, wait this long before checking whether qui cross-seeded the ANT torrent.'
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
  const CONFIG_HELP_TEXT = {
    skip_trumpable: 'Ignore ANT rows flagged as Trumpable before spending qui or tracker requests.',
    row_delay_seconds:
      'Pause between processed ANT rows to avoid hammering tracker APIs. Minimum 30 seconds.',
    row_limit: 'Limit how many uncached eligible rows one button press processes.',
    use_cache:
      'Store ANT metadata, tracker results, qui results, and row completion state locally.',
    load_cache_status_on_page_load:
      'On page load, restore cached completed/cached row states without making new requests.',
    clean_site_lookup_cache: 'Clears tracker/qui lookup results and row-complete markers.',
    clean_ant_cache: 'Clears cached ANT detail-page metadata and legacy filename cache.',
    debug_logging: 'Prints request, cache, qui, and matching details to the browser console.',
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
      'After a site torrent completes, wait this long before adding/checking the ANT torrent.',
    qui_auto_add_site_torrent:
      'Automatically add the highest-seeded matching site torrent after row processing.',
    qui_auto_add_min_seeders: 'Minimum seeder count required before auto-adding a site torrent.'
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
    style.width = '880px';
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
    const mainColumn = createSettingsColumn(doc, 'ant-config-main-column', 'General and site qui');
    const antquiColumn = createSettingsColumn(doc, 'ant-config-ant-qui-column', 'ANT qui');
    const trackerColumn = createSettingsColumn(doc, 'ant-config-tracker-column', 'Trackers');
    columns.append(mainColumn, trackerColumn);

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
      } else if (ANT_qui_CONFIG_FIELDS.has(field)) {
        antquiColumn.appendChild(wrapper);
      } else {
        mainColumn.appendChild(wrapper);
      }
    }
    mainColumn.appendChild(antquiColumn);
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
    title: 'ANT adoption cross-seed finder',
    fields,
    css: `
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
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      #ANTAdoptionFilenameCrossSeedConfig .ant-config-column {
        background: #383838;
        border: 1px solid #555;
        border-radius: 6px;
        min-width: 0;
        padding: 12px;
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
        }, 0);
      }
    }
  });

  GM_registerMenuCommand('ANT adoption IMDb cross-seed settings', () => GM_config.open());

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
  let quiAddPollTimer = null;
  let quiAddPollInFlight = false;
  const qui_ADD_POLL_INTERVAL_MS = 5000;
  const qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS = 10000;
  const qui_PENDING_STATES = new Set(['checkingresumedata', 'queuedup']);
  const refreshedRowKeys = new Set();
  const iconDataUrlPromises = new Map();

  function cleanBaseUrl(value) {
    return String(value || '')
      .trim()
      .replace(/\/+$/, '');
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function sleepWithButtonCountdown(ms, button, progressText) {
    const seconds = Math.ceil(ms / 1000);
    for (let remaining = seconds; remaining > 0; remaining -= 1) {
      if (button) button.textContent = `Waiting ${remaining}s ${progressText}...`;
      await sleep(Math.min(1000, ms));
      ms -= 1000;
    }
  }

  async function retryRowAfterError(error, entry, index, total, trackers, refreshCache, button) {
    debugLog('row processing retry scheduled', { index, total, error });
    console.warn('ANT adoption row processing failed; retrying once:', error);
    setRowState(entry.row, `retrying after error: ${error.message || error}`, 'working');
    await sleepWithButtonCountdown(5000, button, `before retry (${index}/${total})`);
    if (button) button.textContent = `Retrying ${index}/${total} eligible rows...`;
    await processRow(entry.row, index, total, trackers, entry, refreshCache);
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

  function redactDebugUrl(value) {
    return String(value || '')
      .replace(/([?&](?:apikey|api_token|passkey|authkey|torrent_pass)=)[^&#]*/gi, '$1[redacted]')
      .replace(/(\/proxy\/)[^/?#]+/gi, '$1[redacted]')
      .replace(/(\/api\/proxy\/)[^/?#]+/gi, '$1[redacted]')
      .replace(/(\/api\/torrents\/)([^/?#]+)/gi, (match, prefix, segment) =>
        segment.toLowerCase() === 'filter' ? match : `${prefix}[redacted]`
      );
  }

  function sanitizeDebugValue(value, key = '') {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
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
      return /^https?:\/\//i.test(value) ? redactDebugUrl(value) : value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeDebugValue(item));
    }
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeDebugValue(entryValue, entryKey)
        ])
      );
    }
    return value;
  }

  function debugLog(message, details = null) {
    if (!isDebugEnabled()) return;
    const prefix = `[${SCRIPT_PREFIX}] ${message}`;
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
    debugLog('cache write', { key, value });
  }

  function cacheDelete(key) {
    GM_deleteValue(cacheStorageKey(key));
    debugLog('cache delete', { key });
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
      'tracker-results-v4:',
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
    return [...document.querySelectorAll('tr.torrent.torrent_row.zeroseed')];
  }

  function getRowTorrentId(row) {
    const download = row.querySelector('a[href*="torrents.php?action=download"][href*="id="]');
    const href = download?.getAttribute('href') || '';
    const torrentId = href.match(/[?&]id=(\d+)/)?.[1] || null;
    debugLog('parsed ANT torrent id', { torrentId, href });
    return torrentId;
  }

  function getRowGroupId(row) {
    const details = row.querySelector('a[href*="torrents.php?id="][href*="torrentid="]');
    const href = details?.getAttribute('href') || '';
    const groupId = href.match(/[?&]id=(\d+)/)?.[1] || null;
    debugLog('parsed ANT group id', { groupId, href });
    return groupId;
  }

  function getRowDownloadUrl(row) {
    const download = row.querySelector('a[href*="torrents.php?action=download"][href*="id="]');
    if (!download) return '';
    return new URL(download.getAttribute('href'), globalThis.location.origin).href;
  }

  function isTrumpableRow(row) {
    return !!row.querySelector('.tl_trumpable') || /\bTrumpable\b/i.test(row.textContent || '');
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

  async function getAntMetadata(torrentId, groupId) {
    debugLog('ANT HTML metadata lookup start', { torrentId, groupId });
    const cacheKey = antMetadataCacheKey(torrentId);
    const cached = cacheGet(cacheKey);
    if (cached?.filename) {
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
    const response = await gmRequest({ method: 'GET', url });
    const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
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
    const data = Array.isArray(json?.data) ? json.data : [];
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
    const attributes = entry?.attributes || {};
    const files = getObjectFileList(entry);
    if (!candidateMatchesAntFiles(files, antMetadata, attributes.name)) return null;

    const id = entry?.id || attributes.id || attributes.torrent_id;
    const seeders = Number.parseInt(attributes.seeders ?? attributes.seed ?? '0', 10) || 0;
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
    const imdbNumber = imdbIdNumber(antMetadata?.imdbId);
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
    if (!imdbNumber) {
      debugLog('BHD skipped', { reason: 'missing IMDb id', filename, imdbId: antMetadata?.imdbId });
      return null;
    }

    const json = await requestJson({
      method: 'POST',
      url: `https://beyond-hd.me/api/torrents/${encodeURIComponent(apiKey)}`,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: JSON.stringify({
        action: 'search',
        rsskey: rssKey,
        imdb_id: imdbNumber
      })
    });

    const matches = (Array.isArray(json?.results) ? json.results : [])
      .filter((item) => candidateMatchesAntFiles(getObjectFileList(item), antMetadata, item.name))
      .map((item) => ({
        site: 'BHD',
        seeders: Number.parseInt(item.seeders ?? item.seed ?? '0', 10) || 0,
        downloadUrl: item.download_url || '',
        detailsUrl: item.url || '',
        title: item.name || filename
      }));
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
    const imdbNumber = imdbIdNumber(antMetadata?.imdbId);
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
    if (!imdbNumber) {
      debugLog('HDB skipped', { reason: 'missing IMDb id', filename, imdbId: antMetadata?.imdbId });
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
        imdb: { id: imdbNumber }
      })
    });

    const matches = (Array.isArray(json?.data) ? json.data : [])
      .filter((item) =>
        candidateMatchesAntFiles(getObjectFileList(item), antMetadata, item.filename || item.name)
      )
      .map((item) => ({
        site: 'HDB',
        seeders: Number.parseInt(item.seeders ?? '0', 10) || 0,
        downloadUrl: item.filename
          ? `https://hdbits.org/download.php/${encodeURIComponent(item.filename)}?id=${encodeURIComponent(item.id)}&passkey=${encodeURIComponent(passkey)}`
          : '',
        detailsUrl: item.id
          ? `https://hdbits.org/details.php?id=${encodeURIComponent(item.id)}`
          : '',
        title: item.name || filename
      }));
    debugLog('HDB search result', {
      imdbId: antMetadata?.imdbId,
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
    const movies = Array.isArray(searchJson?.Movies)
      ? searchJson.Movies
      : searchJson?.GroupId
        ? [searchJson]
        : [];
    const authKey = String(searchJson?.AuthKey || '').trim();
    const passKey = String(searchJson?.PassKey || '').trim();
    const matches = movies.flatMap((movie) =>
      (Array.isArray(movie.Torrents) ? movie.Torrents : [])
        .filter((torrent) => ptpTorrentMatches(torrent, antMetadata))
        .map((torrent) => {
          const torrentId = String(torrent.Id || '').trim();
          const groupId = String(movie.GroupId || '').trim();
          const detailsUrl = `https://passthepopcorn.me/torrents.php?id=${encodeURIComponent(groupId)}&torrentid=${encodeURIComponent(torrentId)}#torrent${encodeURIComponent(torrentId)}`;
          return {
            site: 'PTP',
            seeders: Number.parseInt(String(torrent.Seeders || '0').replaceAll(',', ''), 10) || 0,
            downloadUrl:
              authKey && passKey && torrentId
                ? `https://passthepopcorn.me/torrents.php?action=download&id=${encodeURIComponent(torrentId)}&authkey=${encodeURIComponent(authKey)}&torrent_pass=${encodeURIComponent(passKey)}`
                : detailsUrl,
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
    try {
      const parsed = JSON.parse(responseText || '[]');
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.torrents)) return parsed.torrents;
      return [];
    } catch {
      return [];
    }
  }

  async function queryqui(config, searchTerm = '') {
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
      const url = buildProxySearchUrl(baseUrl, config, searchTerm);
      attempted.push(url);
      try {
        const response = await gmRequest({ method: 'GET', url });
        if (response.status >= 200 && response.status < 300) {
          const results = parsequiResults(response.responseText);
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
            `qui search failed: ${error.message || error} (${attempted.join(' | ')})`
          );
        }
      }
    }

    throw new Error(`qui search failed (${attempted.join(' | ')})`);
  }

  async function postToqui(config, urls) {
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
      attempted.push(url);
      try {
        const response = await gmRequest({ method: 'POST', url, data: formData });
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
          throw new Error(`qui add failed: ${error.message || error} (${attempted.join(' | ')})`);
        }
      }
    }

    throw new Error(`qui add failed (${attempted.join(' | ')})`);
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
      hash: String(item?.hash || item?.infohash_v1 || item?.infohash || '')
        .trim()
        .toLowerCase(),
      state: String(item?.state || '').trim(),
      progress: Number(item?.progress),
      addedOn: Number(item?.added_on || item?.addedOn || 0) || 0
    };
  }

  function quiItemMatchesFilename(item, filename) {
    const candidates = [
      item?.name,
      item?.contentPath,
      basename(item?.contentPath),
      ...(Array.isArray(item?.raw?.files)
        ? item.raw.files.map((file) => file?.name || file?.path || file)
        : [])
    ];
    return candidates.some((candidate) => filenameMatches(candidate, filename));
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

    const raw = await cachedLookup(`qui-result:${filename}`, () => queryqui(config, filename));
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

  async function searchquiFresh(filename) {
    const config = getquiConfig();
    if (!config.baseUrl || !config.token) return [];

    const raw = await queryqui(config, filename);
    return raw.map(normalizequiItem).filter((item) => quiItemMatchesFilename(item, filename));
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
    return (Array.isArray(item?.hosts) ? item.hosts : []).some(
      (host) => host === 'anthelion.me' || host.endsWith('.anthelion.me')
    );
  }

  function namesLikelyMatch(left, right) {
    const leftName = normalizeText(left);
    const rightName = normalizeText(right);
    return (
      !!leftName &&
      !!rightName &&
      (leftName === rightName || leftName.includes(rightName) || rightName.includes(leftName))
    );
  }

  function findBestquiAddJobMatch(items, job) {
    const candidates = (Array.isArray(items) ? items : []).map((item) => {
      const hashMatched = !!job.hash && !!item.hash && item.hash === job.hash;
      const hostMatched = job.trackerHost
        ? item.hosts.some(
            (host) => host === job.trackerHost || host.endsWith(`.${job.trackerHost}`)
          )
        : false;
      const filenameMatched = quiItemMatchesFilename(item, job.filename);
      const titleMatched = namesLikelyMatch(item.name, job.title);
      const savePathMatched =
        !!job.savePath &&
        !!item.savePath &&
        normalizeText(item.savePath) === normalizeText(job.savePath);
      const afterSubmit =
        Number(job.submittedAtSec) > 0 &&
        Number(item.addedOn) > 0 &&
        Number(item.addedOn) >= Number(job.submittedAtSec) - 5;
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
        candidate.filenameMatched ||
        (candidate.afterSubmit &&
          (candidate.hostMatched || candidate.titleMatched || candidate.savePathMatched))
    );
    viable.sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return Number(right.item.addedOn) - Number(left.item.addedOn);
    });
    return viable[0]?.item || null;
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

  async function addAntTorrentForquiFollowup(jobKey, job, antMatch, reason) {
    const antDownloadUrl = getRowDownloadUrl(job.row);
    if (!antDownloadUrl) {
      throw new Error('Missing ANT download URL for follow-up add.');
    }

    const config = getAntquiConfig(antMatch?.savePath || job.savePath);
    job.followUpStatus = 'adding';
    job.followUpSavePath = config.savePath;
    job.updatedAt = Date.now();
    quiAddJobs.set(jobKey, job);
    renderquiAddMonitor(job.row);

    await postToqui(config, [antDownloadUrl]);
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
  }

  async function runquiCrossSeedFollowup(jobKey) {
    const job = quiAddJobs.get(jobKey);
    if (!job || job.error || !['pending', 'checking'].includes(job.followUpStatus)) return;
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
      const quiMatches = await searchquiFresh(job.filename);
      const antMatch = quiMatches.find(
        (item) => isAntquiItem(item) && String(item.savePath || '').trim()
      );

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
        matchCount: quiMatches.length,
        nextPollMs: qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS,
        fallbackRunAt: job.followUpRunAt
      });
      schedulequiCrossSeedFollowupPoll(
        jobKey,
        Math.min(qui_ANT_FOLLOW_UP_POLL_INTERVAL_MS, Math.max(0, job.followUpRunAt - Date.now()))
      );
    } catch (error) {
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
        const quiItems = await searchquiJobCandidates(job);
        debugLog('qui add monitor poll result', {
          filename: job.filename,
          resultCount: quiItems.length,
          site: job.site,
          title: job.title,
          savePath: job.savePath,
          trackerHost: job.trackerHost
        });

        const matched = findBestquiAddJobMatch(quiItems, job);
        if (!matched) {
          job.status = 'Submitted. Waiting for qui match...';
          job.updatedAt = Date.now();
          quiAddJobs.set(key, job);
          continue;
        }

        job.progress = toPercent(matched.progress);
        job.state = matched.state;
        job.hash = matched.hash;
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
          schedulequiCrossSeedFollowup(key);
        }
      }
    } catch (error) {
      debugLog('qui add monitor poll failed', { error });
      console.warn('qui add monitor poll failed:', error);
    } finally {
      quiAddPollInFlight = false;
      renderAllquiAddMonitors();
      if (!hasPollablequiAddJobs()) stopquiAddPolling('all site torrents complete');
    }
  }

  function startquiAddPolling() {
    if (quiAddPollTimer) return;
    quiAddPollTimer = setInterval(() => {
      pollquiAddJobs();
    }, qui_ADD_POLL_INTERVAL_MS);
    pollquiAddJobs().catch((error) => {
      debugLog('qui add initial poll failed', { error });
    });
  }

  function stopquiAddPolling(reason = '') {
    if (quiAddPollTimer) {
      clearInterval(quiAddPollTimer);
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
        search: (antMetadata) => searchPtp(antMetadata)
      },
      {
        site: 'BHD',
        enabled: () => Boolean(GM_config.get('bhd')),
        search: (antMetadata) => searchBhd(antMetadata)
      },
      {
        site: 'HDB',
        enabled: () => Boolean(GM_config.get('hdb')),
        search: (antMetadata) => searchHdb(antMetadata)
      },
      ...unit3dTrackers.map((tracker) => ({
        site: tracker.site,
        enabled: () => Boolean(getUnit3dConfig(tracker).enabled),
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

  function preloadEnabledTrackerIcons() {
    const enabledSites = getTrackerDefinitions()
      .filter((tracker) => tracker.enabled())
      .map((tracker) => tracker.site)
      .filter((site) => getTrackerIconUrl(site));
    debugLog('preloading enabled tracker icons', { sites: enabledSites });
    enabledSites.forEach((site) => {
      ensureIconDataUrl(site).catch((error) => {
        debugLog('enabled tracker icon preload failed', { site, error });
      });
    });
  }

  function trackerNullResultsCacheKey() {
    return 'tracker-results-v4:nulls';
  }

  function trackerMatchResultsCacheKey() {
    return 'tracker-results-v4:matches';
  }

  function createTrackerResultIndex() {
    return {
      version: 4,
      updatedAt: Date.now(),
      sites: {}
    };
  }

  function normalizeTrackerResultIndex(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return createTrackerResultIndex();
    }
    return {
      version: 4,
      updatedAt: Number(value.updatedAt || 0) || Date.now(),
      sites: value.sites && typeof value.sites === 'object' ? value.sites : {}
    };
  }

  function getTrackerResultIndex(key) {
    return normalizeTrackerResultIndex(cacheGet(key, null));
  }

  function getTrackerResultFromIndex(site, filename) {
    if (!GM_config.get('use_cache')) return { cached: false, value: null };

    const matchIndex = getTrackerResultIndex(trackerMatchResultsCacheKey());
    const matchValue = matchIndex.sites?.[site]?.[filename];
    if (matchValue !== undefined) return { cached: true, value: matchValue };

    const nullIndex = getTrackerResultIndex(trackerNullResultsCacheKey());
    if (nullIndex.sites?.[site]?.[filename]) return { cached: true, value: null };

    return { cached: false, value: null };
  }

  function setTrackerResultInIndexes(site, filename, result) {
    if (!GM_config.get('use_cache')) return;

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
    return cacheGet(rowCompleteCacheKey(torrentId, filename, trackers), null);
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

  function isRowTrackerComplete(torrentId, filename, trackers) {
    if (trackers.length === 0) return true;
    const completion = getRowCompletion(torrentId, filename, trackers);
    if (isFullyCompletedRowCompletion(completion)) return true;
    if (!areTrackerResultsCached(filename, trackers)) return false;
    const completeKey = rowCompleteCacheKey(torrentId, filename, trackers);
    if (!cacheHas(completeKey)) {
      cacheSet(completeKey, {
        torrentId,
        filename,
        trackers: trackers.map((tracker) => tracker.site),
        completedAt: Date.now()
      });
    }
    return true;
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
    if (!context.torrentId || !context.filename || context.trackers.length === 0) {
      debugLog('row complete cache skipped', { filename, reason, context });
      return;
    }

    cacheSet(rowCompleteCacheKey(context.torrentId, context.filename, context.trackers), {
      torrentId: context.torrentId,
      filename: context.filename,
      trackers: context.trackers.map((tracker) => tracker.site),
      status: 'fully-completed',
      reason,
      completedAt: Date.now()
    });
    setRowState(row, getRowCompletionText({ reason }), 'done');
    debugLog('row complete cache marked', { reason, context });
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
      if (!refreshCache) {
        const cached = getTrackerResultFromIndex(tracker.site, filename);
        if (cached.cached) {
          debugLog('tracker aggregate cache hit', {
            filename,
            site: tracker.site,
            hasMatch: Boolean(cached.value)
          });
          return cached.value;
        }
      }

      debugLog('tracker aggregate cache miss', { filename, site: tracker.site, refreshCache });
      const result = await tracker.search(antMetadata);
      setTrackerResultInIndexes(tracker.site, filename, result);
      return result;
    });

    const settled = await Promise.allSettled(searches);
    const matches = settled
      .map((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        debugLog('tracker filename lookup failed', {
          filename,
          site: trackers[index]?.site,
          reason: result.reason
        });
        console.warn('Tracker filename lookup failed:', result.reason);
        return null;
      })
      .filter(Boolean);

    debugLog('scoped tracker searches complete', {
      filename,
      antTorrentId,
      matches,
      trackers: trackers.map((tracker) => tracker.site)
    });
    return matches;
  }

  async function addTrackerMatchToqui(row, filename, match, button) {
    if (!match?.downloadUrl) return;

    const jobKey = `${filename}:${match.site}:${match.downloadUrl}`;
    const existingJob = quiAddJobs.get(jobKey);
    if (existingJob && !existingJob.error) {
      renderquiAddMonitor(row);
      getquiMonitorContainer(row).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (shouldPollquiAddJob(existingJob)) startquiAddPolling();
      return;
    }

    const config = getquiConfig();
    config.savePath = getquiSavePathForRow(row);
    config.skipRecheck = false;

    if (!config.baseUrl || !config.token) {
      button.textContent = 'qui config missing';
      button.dataset.state = 'error';
      return;
    }

    const job = {
      key: jobKey,
      row,
      filename,
      torrentId: getRowProcessingContext(row, filename).torrentId,
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
      error: '',
      followUpScheduled: false,
      followUpStatus: '',
      followUpError: '',
      followUpSavePath: '',
      followUpHash: '',
      followUpRunAt: 0,
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
      job.submittedAtSec = Math.floor(Date.now() / 1000);
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
      startquiAddPolling();
    } catch (error) {
      job.status = 'Failed';
      job.error = String(error.message || error);
      job.updatedAt = Date.now();
      quiAddJobs.set(jobKey, job);
      button.textContent = 'qui failed';
      button.dataset.state = 'error';
      debugLog('tracker qui add failed', { filename, match, savePath: config.savePath, error });
      renderquiAddMonitor(row);
    } finally {
      button.disabled = false;
    }
  }

  function getBestAutoquiMatch(matches) {
    if (!GM_config.get('qui_auto_add_site_torrent')) return null;
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

  async function maybeAutoAddTrackerMatchToqui(row, filename, matches) {
    const match = getBestAutoquiMatch(matches);
    if (!match) return;

    const autoKey = `${filename}:${match.site}:${match.downloadUrl}`;
    if (row.dataset.antCrossSeedAutoquiKey === autoKey) return;
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
    await addTrackerMatchToqui(row, filename, match, button);
    button.remove();
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

      const iconUrl =
        getTrackerIconUrl(match.site) ||
        `${new URL(match.detailsUrl || match.downloadUrl).origin}/favicon.ico`;
      const icon = document.createElement('img');
      icon.src = getCachedIconDataUrl(match.site, iconUrl) || iconUrl;
      icon.alt = match.site;
      icon.className = 'ant-cross-seed-icon';
      if (getTrackerIconUrl(match.site)) {
        ensureIconDataUrl(match.site, iconUrl).then((dataUrl) => {
          if (dataUrl) icon.src = dataUrl;
        });
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

  function renderCachedTrackerRow(row, torrentId, filename, trackers, titleSnapshot = null) {
    const matches = getCachedTrackerMatches(filename, trackers);
    const completion = getRowCompletion(torrentId, filename, trackers);
    appendMatches(row, matches, filename);
    restoreRowTitleLink(row, titleSnapshot);
    if (isFullyCompletedRowCompletion(completion)) {
      setRowState(row, getRowCompletionText(completion), 'done');
    } else {
      setRowState(
        row,
        matches.length
          ? `cached ${matches.length} match${matches.length === 1 ? '' : 'es'}`
          : 'cached no matches',
        matches.length ? 'done' : 'none'
      );
    }
    markRowTrackerComplete(torrentId, filename, trackers);
    debugLog('cached row skipped from batch', {
      torrentId,
      filename,
      trackers: trackers.map((tracker) => tracker.site),
      completion,
      matches
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
      skippedRefreshed: 0
    };

    for (const row of rows) {
      const titleSnapshot = snapshotRowTitleLink(row);
      if (GM_config.get('skip_trumpable') && isTrumpableRow(row)) {
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
        setRowState(row, 'missing ANT title link', 'skipped');
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
      if (refreshCache) {
        const key = refreshRowKey(torrentId, cachedFilename, rowTrackers);
        if (refreshedRowKeys.has(key)) {
          stats.skippedRefreshed += 1;
          if (cachedFilename) {
            renderCachedTrackerRow(row, torrentId, cachedFilename, rowTrackers, titleSnapshot);
          }
          continue;
        }
      } else if (cachedFilename && isFullyCompletedRowCompletion(completion)) {
        stats.skippedCached += 1;
        renderCachedTrackerRow(row, torrentId, cachedFilename, rowTrackers, titleSnapshot);
        continue;
      } else if (cachedFilename && isRowTrackerComplete(torrentId, cachedFilename, rowTrackers)) {
        stats.skippedCached += 1;
        renderCachedTrackerRow(row, torrentId, cachedFilename, rowTrackers, titleSnapshot);
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
    if (limit > 0) return `Process next ${limit} rows by IMDb`;
    return 'Search adoption rows by IMDb';
  }

  function loadCachedRowStatusesOnPageLoad() {
    if (!GM_config.get('load_cache_status_on_page_load') || !GM_config.get('use_cache')) return;

    const rows = getRows();
    const trackers = getScopedTrackers();
    if (trackers.length === 0) {
      debugLog('page-load cache status skipped: no scoped trackers');
      return;
    }

    const { stats } = collectBatchRows(rows, trackers, 0, false);
    debugLog('page-load cache status loaded', {
      rowCount: rows.length,
      trackers: trackers.map((tracker) => tracker.site),
      stats
    });
  }

  async function processRow(row, index, total, trackers, rowMeta = {}, refreshCache = false) {
    const rowTrackers = rowMeta.trackers || getTrackersForRow(row, trackers);
    const titleSnapshot = snapshotRowTitleLink(row);
    if (!titleSnapshot) {
      debugLog('row skipped', { index, total, reason: 'missing ANT title link' });
      setRowState(row, `missing ANT title link (${index}/${total})`, 'skipped');
      return;
    }

    if (GM_config.get('skip_trumpable') && isTrumpableRow(row)) {
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
    const antMetadata =
      rowMeta.cachedMetadata?.filename && rowMeta.cachedMetadata?.imdbId
        ? rowMeta.cachedMetadata
        : await getAntMetadata(torrentId, groupId);
    antMetadata.isM2tsRow = isM2tsRow(row);
    const filename = antMetadata.filename;
    debugLog('row metadata resolved', { index, total, torrentId, groupId, antMetadata });
    row.dataset.antCrossSeedTorrentId = String(torrentId);
    row.dataset.antCrossSeedFilename = filename;
    row.dataset.antCrossSeedTrackerSites = rowTrackers.map((tracker) => tracker.site).join(',');

    setRowState(row, `searching qui for ${filename} (${index}/${total})`, 'working');
    try {
      const quiMatches = await searchqui(filename);
      renderquiMatches(row, filename, quiMatches);
    } catch (error) {
      debugLog('qui filename lookup failed', { filename, error });
      console.warn('qui filename lookup failed:', error);
      renderquiError(row, error);
    }

    setRowState(row, `searching ${filename} (${index}/${total})`, 'working');

    const matches = await searchScopedTrackers(antMetadata, torrentId, rowTrackers, refreshCache);
    appendMatches(row, matches, filename);
    await maybeAutoAddTrackerMatchToqui(row, filename, matches);
    restoreRowTitleLink(row, titleSnapshot);
    if (areTrackerResultsCached(filename, rowTrackers)) {
      markRowTrackerComplete(torrentId, filename, rowTrackers);
    }
    if (refreshCache) {
      refreshedRowKeys.add(refreshRowKey(torrentId, filename, rowTrackers));
      refreshedRowKeys.add(refreshRowKey(torrentId, rowMeta.cachedFilename, rowTrackers));
    }
    debugLog('row processing complete', { index, total, torrentId, groupId, filename, matches });
    setRowState(
      row,
      matches.length ? `${matches.length} match${matches.length === 1 ? '' : 'es'}` : 'no matches',
      matches.length ? 'done' : 'none'
    );
  }

  async function run() {
    const button = document.querySelector('#ant-cross-seed-run');
    const rows = getRows();
    const limit = getRowLimit();
    const trackers = getScopedTrackers();
    const refreshCache = shouldRefreshTrackerCache();
    const { batch, stats } = collectBatchRows(rows, trackers, limit, refreshCache);
    const hasRemaining = stats.eligibleTotal > batch.length;
    debugLog('run start', {
      rowCount: rows.length,
      batchCount: batch.length,
      eligibleTotal: stats.eligibleTotal,
      trackers: trackers.map((tracker) => tracker.site),
      limit,
      refreshCache,
      skipTrumpable: GM_config.get('skip_trumpable'),
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

    if (batch.length === 0) {
      if (button) {
        button.disabled = false;
        button.textContent = getRunButtonIdleText(limit, false);
      }
      debugLog('run complete: no eligible rows', { stats });
      return;
    }

    const delayMs = getRowDelaySeconds() * 1000;
    for (let i = 0; i < batch.length; i += 1) {
      const entry = batch[i];
      try {
        if (button) button.textContent = `Processing ${i + 1}/${batch.length} eligible rows...`;
        await processRow(entry.row, i + 1, batch.length, trackers, entry, refreshCache);
      } catch (error) {
        try {
          await retryRowAfterError(
            error,
            entry,
            i + 1,
            batch.length,
            trackers,
            refreshCache,
            button
          );
        } catch (retryError) {
          debugLog('row processing failed after retry', {
            index: i + 1,
            total: batch.length,
            error: retryError
          });
          console.error('ANT adoption row processing failed after retry:', retryError);
          setRowState(entry.row, `error: ${retryError.message || retryError}`, 'error');
        }
      }
      if (i < batch.length - 1 && delayMs > 0) {
        debugLog('row delay start', { delayMs, nextIndex: i + 2, total: batch.length });
        await sleepWithButtonCountdown(delayMs, button, `(${i + 1}/${batch.length})`);
      }
    }

    if (button) {
      button.disabled = false;
      button.textContent = getRunButtonIdleText(limit, hasRemaining);
    }
    debugLog('run complete', { rowCount: rows.length, batchCount: batch.length, stats });
  }

  function addControls() {
    if (document.querySelector('#ant-cross-seed-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'ant-cross-seed-toolbar';

    const button = document.createElement('button');
    button.id = 'ant-cross-seed-run';
    button.type = 'button';
    button.textContent = getRunButtonIdleText(getRowLimit(), true);
    button.addEventListener('click', () => {
      run().catch((error) => {
        console.error('ANT adoption IMDb search failed:', error);
        button.disabled = false;
        button.textContent = getRunButtonIdleText(getRowLimit(), true);
      });
    });

    const settings = document.createElement('button');
    settings.type = 'button';
    settings.textContent = 'Settings';
    settings.addEventListener('click', () => GM_config.open());

    toolbar.append(button, settings);

    const target =
      document.querySelector('.thin > h2, #content > h2, h2') ||
      document.querySelector('.thin, #content, body');
    target.parentNode.insertBefore(toolbar, target.nextSibling);
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #ant-cross-seed-toolbar {
        align-items: center;
        display: flex;
        gap: 8px;
        margin: 8px 0 12px;
      }

      #ant-cross-seed-toolbar button {
        cursor: pointer;
        padding: 4px 9px;
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

  addStyles();
  addControls();
  loadCachedRowStatusesOnPageLoad();
  preloadEnabledTrackerIcons();
})();
