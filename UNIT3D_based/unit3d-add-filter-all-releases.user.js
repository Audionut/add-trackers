// ==UserScript==
// @name         UNIT3D - Add releases from other trackers
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.1.0
// @description  Add releases from other trackers to UNIT3D similar torrent pages.
// @author       passthepopcorn_cc (edited by Perilune + Audionut)
// @match        https://aither.cc/torrents/similar/1*
// @match        https://aither.cc/torrents/similar/2*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-add-filter-all-releases.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-add-filter-all-releases.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @require      https://github.com/Audionut/add-trackers/raw/main/scene_groups.js
// @run-at       document-idle
// @connect      passthepopcorn.me
// ==/UserScript==

(function () {
  'use strict';

  const EXTERNAL_DETAIL_EVENT_TARGET_ID = 'unit3d-add-releases-private-detail-event-target';
  const EXTERNAL_DETAIL_REQUEST_EVENT = 'unit3d-add-releases-private-detail-request';
  const EXTERNAL_DETAIL_RESPONSE_EVENT = 'unit3d-add-releases-private-detail-response';
  const STATUS_PANEL_ID = 'unit3d-add-releases-status-panel';
  const STATUS_STYLE_ID = 'unit3d-add-releases-status-style';

  const fields = {
    aither: {
      label: 'aither.cc',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    aither_api: { label: 'aither.cc API token', type: 'text', default: '' },
    avistaz: {
      label: 'avistaz.to',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter needed details below. PID can be found on your profile page'
    },
    avistaz_user: { label: 'avistaz.to username', type: 'text', default: '' },
    avistaz_pass: { label: 'avistaz.to password', type: 'text', default: '' },
    avistaz_pid: { label: 'avistaz.to PID', type: 'text', default: '' },
    ant: {
      label: 'anthelion.me',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    ant_api: { label: 'anthelion.me API token', type: 'text', default: '' },
    ar: {
      label: 'alpharatio.cc',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter authkey and torrent pass below, get from download link'
    },
    ar_auth: { label: 'alpharatio.cc auth key', type: 'text', default: '' },
    ar_pass: { label: 'alpharatio.cc torrent pass', type: 'text', default: '' },
    bhd: {
      label: 'beyond-hd.me',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API and RSS key below'
    },
    bhd_api: { label: 'beyond-hd.me API token', type: 'text', default: '' },
    bhd_rss: { label: 'beyond-hd.me RSS key', type: 'text', default: '' },
    bhd_seeding: {
      label: 'beyond-hd.me seeding status',
      type: 'checkbox',
      default: true,
      tooltip:
        'This will show seeding status at BHD, but requires an additional API call for every BHD torrent'
    },
    blu: { label: 'blutopia.cc', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    blu_api: { label: 'blutopia.cc API token', type: 'text', default: '' },
    btn: {
      label: 'broadcasthe.net',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    btn_api: { label: 'broadcasthe.net API token', type: 'text', default: '' },
    cg: { label: 'cinemageddon.net', type: 'checkbox', default: false },
    cinemaz: {
      label: 'cinemaz.to',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter needed details below. PID can be found on your profile page'
    },
    cinemaz_user: { label: 'cinemaz.to username', type: 'text', default: '' },
    cinemaz_pass: { label: 'cinemaz.to password', type: 'text', default: '' },
    cinemaz_pid: { label: 'cinemaz.to PID', type: 'text', default: '' },
    dp: {
      label: 'darkpeers.org',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    dp_api: { label: 'darkpeers.org API token', type: 'text', default: '' },
    fl: { label: 'filelist.io', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    fl_user: { label: 'filelist.io username', type: 'text', default: '' },
    fl_pass: {
      label: 'filelist.io passkey',
      type: 'text',
      default: '',
      tooltip: 'Passkey from your user settings page, the upload form or a torrent in your client'
    },
    hdb: {
      label: 'hdbits.org',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter username and passkey below'
    },
    hdb_user: {
      label: 'hdbits.org username',
      type: 'text',
      default: '',
      tooltip: 'Requires 2fa enabled at HDB'
    },
    hdb_pass: {
      label: 'hdbits.org passkey',
      type: 'text',
      default: '',
      tooltip: 'Passkey from your HDB profile page'
    },
    hhd: {
      label: 'homiehelpdesk.net',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    hhd_api: { label: 'homiehelpdesk.net API token', type: 'text', default: '' },
    huno: { label: 'hawke.uno', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    huno_api: { label: 'hawke.uno API token', type: 'text', default: '' },
    ifl: {
      label: 'infinitylibrary.net',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    ifl_api: { label: 'infinitylibrary.net API token', type: 'text', default: '' },
    kg: { label: 'karagarga.in', type: 'checkbox', default: false },
    ldu: { label: 'theldu.to', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    ldu_api: { label: 'theldu.to API token', type: 'text', default: '' },
    lst: { label: 'lst.gg', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    lst_api: { label: 'lst.gg API token', type: 'text', default: '' },
    lume: {
      label: 'luminarr.me',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    lume_api: { label: 'luminarr.me API token', type: 'text', default: '' },
    MTeam: { label: 'm-team.cc', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    MTeam_api: { label: 'm-team.cc API token', type: 'text', default: '' },
    mtv: {
      label: 'morethantv.me',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    mtv_api: { label: 'morethantv.me API token', type: 'text', default: '' },
    nbl: {
      label: 'nebulance.io',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    nbl_api: { label: 'nebulance.io API token', type: 'text', default: '' },
    oe: {
      label: 'onlyencodes.cc',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    oe_api: { label: 'onlyencodes.cc API token', type: 'text', default: '' },
    otw: {
      label: 'oldtoons.world',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    otw_api: { label: 'oldtoons.world API token', type: 'text', default: '' },
    ops: {
      label: 'orpheus.network',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below. Additional filtering options below'
    },
    ops_api: { label: 'orpheus.network API token', type: 'text', default: '' },
    phd: {
      label: 'privatehd.to',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter needed details below. PID can be found on your profile page'
    },
    phd_user: { label: 'privatehd.to username', type: 'text', default: '' },
    phd_pass: { label: 'privatehd.to password', type: 'text', default: '' },
    phd_pid: { label: 'privatehd.to PID', type: 'text', default: '' },
    ptp: {
      label: 'passthepopcorn.me',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API user and key below'
    },
    ptp_api_user: { label: 'passthepopcorn.me API user', type: 'text', default: '' },
    ptp_api_key: { label: 'passthepopcorn.me API key', type: 'text', default: '' },
    pxhd: { label: 'pixelhd.me', type: 'checkbox', default: false },
    red: {
      label: 'redacted.sh',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below. Additional filtering options below'
    },
    red_api: { label: 'redacted.sh API token', type: 'text', default: '' },
    ras: {
      label: 'rastastugan.org',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    ras_api: { label: 'rastastugan.org API token', type: 'text', default: '' },
    rmc: {
      label: 'retro-movies.club',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    rmc_api: { label: 'retro-movies.club API token', type: 'text', default: '' },
    rfx: { label: 'reelflix.cc', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    rfx_api: { label: 'reelflix.cc API token', type: 'text', default: '' },
    rtf: {
      label: 'retroflix.club',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter RTF username and password below'
    },
    rtf_user: { label: 'retroflix.club username', type: 'text', default: '' },
    rtf_pass: { label: 'retroflix.club password', type: 'text', default: '' },
    sp: { label: 'seedpool.org', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    sp_api: { label: 'seedpool.org API token', type: 'text', default: '' },
    tik: {
      label: 'cinematik.net',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    tik_api: { label: 'cinematik.net API token', type: 'text', default: '' },
    tl: { label: 'torrentleech.cc', type: 'checkbox', default: false },
    tvv: {
      label: 'tv-vault.me',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter auth key & torrent pass below'
    },
    tvv_auth: {
      label: 'tv-vault.me auth key',
      type: 'text',
      default: '',
      tooltip: 'Find from a torrent download link at TVV'
    },
    tvv_torr: {
      label: 'tv-vault.me torrent pass',
      type: 'text',
      default: '',
      tooltip: 'Needed to access TVV xml output'
    },
    easysearch: {
      label: 'tv-vault.me easy searching',
      type: 'checkbox',
      default: true,
      tooltip:
        "TVV has strict searching limits, especially for lower user groups. Disable this to search with more expensive options, better feedback including seeding status, but you're more likely to hit searching to soon error."
    },
    ulcx: { label: 'upload.cx', type: 'checkbox', default: false, tooltip: 'Enter API key below' },
    ulcx_api: { label: 'upload.cx API token', type: 'text', default: '' },
    yus: {
      label: 'yu-scene.net',
      type: 'checkbox',
      default: false,
      tooltip: 'Enter API key below'
    },
    yus_api: { label: 'yu-scene.net API token', type: 'text', default: '' },
    media: {
      label: 'RED/OPS media filtering',
      type: 'text',
      default: '',
      tooltip: 'Filter torrents from RED/OPS by media. CD, WEB, Vinyl'
    },
    format: {
      label: 'RED/OPS format filtering',
      type: 'text',
      default: '',
      tooltip: 'Filter torrents from RED/OPS by format. FLAC, MP3'
    },
    show_icon: {
      label: 'Show Tracker Icon',
      type: 'checkbox',
      default: true,
      tooltip: 'Display the tracker icon next to releases'
    },
    hide_filters: {
      label: 'Hide filter releases box',
      type: 'checkbox',
      default: false,
      tooltip: 'Hide the filter releases box in the UI'
    },
    filterhidden: {
      label: 'Minimize the filter box by default',
      type: 'checkbox',
      default: false,
      tooltip: 'Toggle visibility by clicking header'
    },
    filterboxlocation: {
      label: 'Where to display the filter box',
      type: 'select',
      options: ['Torrents', 'Sidebar'],
      default: 'Torrents',
      tooltip: 'Choose where to display the filter box. Sidebar places it underneath the poster.'
    },
    simplediscounts: {
      label: 'Show simple discounts',
      type: 'checkbox',
      default: false,
      tooltip: 'Change 75% Freeleech > 75%'
    },
    hidesamesize: {
      label: 'Hide torrents with same size',
      type: 'checkbox',
      default: false,
      tooltip: 'Hide torrents that have the same file size as existing ones'
    },
    logsamesize: {
      label: 'Log torrents with same size',
      type: 'checkbox',
      default: false,
      tooltip: 'Log torrents that have the same file size as existing ones'
    },
    fuzzyMatching: {
      label: 'Fuzzy size matching',
      type: 'checkbox',
      default: false,
      tooltip:
        'Useful to catch torrents with or without additional nfo files or whatnot, or for non API sites'
    },
    valueinMIB: {
      label: 'Fuzzy size threshold (MiB)',
      type: 'int',
      default: 6,
      tooltip:
        'Set the threshold in MiB for the fuzzy size matching. 6 MiB will catch non API sites'
    },
    hide_dead: {
      label: 'Hide dead external torrents',
      type: 'checkbox',
      default: false,
      tooltip: 'Hide torrents that have no seeders'
    },
    new_tab: {
      label: 'Open in new tab',
      type: 'checkbox',
      default: true,
      tooltip: 'Open links in a new browser tab'
    },
    hide_tags: {
      label: 'Hide tags',
      type: 'checkbox',
      default: false,
      tooltip: 'Hide tags such as Featured, DU, reported, etc.'
    },
    run_default: {
      label: 'Run by default?',
      type: 'checkbox',
      default: false,
      tooltip:
        'Run this script by default on page load, else click Other Trackers under title to run the script'
    },
    ptp_name: {
      label: 'Show release name',
      type: 'checkbox',
      default: true,
      tooltip: 'Display the PTP release (file) name instead of the default display'
    },
    funky_tags: {
      label: 'Improved Tags',
      type: 'checkbox',
      default: false,
      tooltip: "Work with jmxd' PTP Improved Tags script"
    },
    btntimer: {
      label: 'Timer for BTN TVDB ID searches via Sonarr (ms)',
      type: 'int',
      default: 800,
      tooltip:
        "If you don't use Sonarr you can set this very low, but the main script delay is overall site response, not this response"
    },
    tracker_by_default: {
      label: 'Only these sites by default',
      type: 'text',
      default: '',
      tooltip: 'Show only these sites by default. Comma separated. BHD, ANT, etc'
    },
    res_by_default: {
      label: 'Only these resolutions by default',
      type: 'text',
      default: '',
      tooltip:
        'Show only these resolutions by default. Comma separated, with valued values. SD, 720p, 1080p, 2160p'
    },
    timer: {
      label: 'Error timeout (seconds)',
      type: 'int',
      default: 4,
      tooltip: 'Set the error timeout duration in seconds to skip slow/dead trackers'
    },
    timerDuration: {
      label: 'Error display duration (seconds)',
      type: 'int',
      default: 2,
      tooltip: 'Set the duration for displaying errors in seconds'
    },
    debugging: {
      label: 'Enable debugging',
      type: 'checkbox',
      default: false,
      tooltip:
        'Enable this to help track down issues, then browse a torrent page and look in browser console'
    },
    avistaz_token: {
      label: 'avistaz.to API token',
      type: 'text',
      default: '',
      tooltip: 'This is set automatically. Clear token to force auth login'
    },
    cinemaz_token: {
      label: 'cinemaz.to API token',
      type: 'text',
      default: '',
      tooltip: 'This is set automatically. Clear token to force auth login'
    },
    phd_token: {
      label: 'privatehd.to API token',
      type: 'text',
      default: '',
      tooltip: 'This is set automatically. Clear token to force auth login'
    },
    rtf_token: {
      label: 'retroflix.club API token',
      type: 'text',
      default: '',
      tooltip: 'This is set automatically. Clear token to force auth login'
    }
  };

  const SCRIPT_ID = 'UNIT3DAddReleases';
  const SETTINGS_PANEL_ID = 'unit3d-add-releases-settings-panel';
  const SETTINGS_STYLE_ID = 'unit3d-add-releases-settings-style';
  const LAUNCHER_STYLE_ID = 'unit3d-add-releases-launcher-style';
  const LAUNCHER_ID = 'other-trackers';
  const EXTERNAL_ROW_CLASS = 'unit3d-add-releases-external';
  const FILTER_PANEL_ID = 'unit3d-add-releases-filter-panel';
  const CURRENT_HOST = location.hostname.replace(/^www\./i, '').toLowerCase();
  const IS_AITHER_HOST = CURRENT_HOST === 'aither.cc';
  const UNIT3D_RELEASE_TYPES = [
    'Full Disc',
    'Remux',
    'Encode',
    'WEB-DL',
    'WEBRip',
    'HDTV',
    'Other'
  ];
  const UNIT3D_HDR_TEXT_PATTERN =
    /(^|[^A-Za-z0-9+])(?:DV\s+HDR10\+|DV\s+HDR|HDR10\+\s+DV|HDR\s+DV|HDR10\+|HDR10|HDR|DV|HLG)(?=$|[^A-Za-z0-9+])/gi;
  const UNIT3D_AUDIO_CODEC_TOKENS = [
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
  const UNIT3D_METADATA_TOKENS = ['Atmos', 'Auro3D'];
  const TRACKER_SETTING_KEYS = [
    'aither',
    'ant',
    'ar',
    'avistaz',
    'bhd',
    'blu',
    'btn',
    'cg',
    'cinemaz',
    'dp',
    'fl',
    'hdb',
    'hhd',
    'huno',
    'ifl',
    'kg',
    'ldu',
    'lst',
    'lume',
    'MTeam',
    'mtv',
    'nbl',
    'oe',
    'otw',
    'ops',
    'phd',
    'ptp',
    'pxhd',
    'red',
    'ras',
    'rmc',
    'rfx',
    'rtf',
    'sp',
    'tik',
    'tl',
    'tvv',
    'ulcx',
    'yus'
  ];
  const TRACKER_CREDENTIAL_OVERRIDES = {
    aither: ['aither_api'],
    ar: ['ar_auth', 'ar_pass'],
    avistaz: ['avistaz_user', 'avistaz_pass', 'avistaz_pid', 'avistaz_token'],
    bhd: ['bhd_api', 'bhd_rss', 'bhd_seeding'],
    cinemaz: ['cinemaz_user', 'cinemaz_pass', 'cinemaz_pid', 'cinemaz_token'],
    fl: ['fl_user', 'fl_pass'],
    hdb: ['hdb_user', 'hdb_pass'],
    phd: ['phd_user', 'phd_pass', 'phd_pid', 'phd_token'],
    ptp: ['ptp_api_user', 'ptp_api_key'],
    rtf: ['rtf_user', 'rtf_pass', 'rtf_token'],
    tvv: ['tvv_auth', 'tvv_torr', 'easysearch']
  };
  const DISPLAY_SETTING_KEYS = [
    'media',
    'format',
    'show_icon',
    'hide_filters',
    'filterhidden',
    'filterboxlocation',
    'simplediscounts',
    'hidesamesize',
    'logsamesize',
    'fuzzyMatching',
    'valueinMIB',
    'hide_dead',
    'new_tab',
    'hide_tags',
    'run_default',
    'btntimer',
    'tracker_by_default',
    'res_by_default',
    'timer',
    'timerDuration',
    'debugging'
  ];
  const DEFAULT_SETTINGS = Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => !['ptp_name', 'funky_tags'].includes(key))
      .map(([key, field]) => [key, field.default])
  );
  const GM_config = {
    config: null,
    fields: {},
    get(key) {
      if (['ptp_name', 'funky_tags'].includes(key)) return false;
      return GM_getValue(settingStorageKey(key), DEFAULT_SETTINGS[key]);
    },
    init(config) {
      this.config = config;
      this.fields = Object.fromEntries(
        Object.keys(fields).map((key) => [
          key,
          {
            node: { checked: !!this.get(key), addEventListener() {} },
            wrapper: { style: {} }
          }
        ])
      );
    },
    open() {
      showSettingsPanel();
    },
    save() {
      return Promise.resolve();
    },
    set(key, value) {
      if (!['ptp_name', 'funky_tags'].includes(key)) {
        GM_setValue(settingStorageKey(key), value);
      }
    }
  };

  function settingStorageKey(key) {
    return `${SCRIPT_ID}_${key}`;
  }

  function isUnit3dSimilarPage() {
    return /^\/torrents\/similar\/[12]\./i.test(location.pathname);
  }

  function isUnit3dTvPage() {
    return /^\/torrents\/similar\/2\./i.test(location.pathname);
  }

  function showSettingsPanel() {
    installSettingsStyle();
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
    title.textContent = 'UNIT3D Add Releases Settings';
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
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      if (!confirm('Reset UNIT3D Add Releases settings?')) return;
      Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => GM_config.set(key, value));
      location.reload();
    });

    const buttons = document.createElement('div');
    buttons.className = 'form__group form__group--short-horizontal';
    const save = document.createElement('button');
    save.className = 'form__button form__button--filled';
    save.type = 'submit';
    save.textContent = 'Save';
    buttons.appendChild(save);
    actions.append(reset, buttons);
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
  }

  function buildSettingsGrid() {
    const used = new Set();
    const grid = document.createElement('div');
    grid.className = 'unit3d-imdb-settings-grid';
    const appendGroup = (title, keys) => {
      const filtered = keys.filter(
        (key) => key in DEFAULT_SETTINGS && !isSuppressedSettingKey(key)
      );
      filtered.forEach((key) => used.add(key));
      grid.appendChild(buildSettingsGroup(title, filtered));
    };

    appendGroup('Trackers', getSelectableTrackerSettingKeys());
    appendGroup(
      'Credentials',
      Object.keys(DEFAULT_SETTINGS).filter(
        (key) =>
          !isSuppressedSettingKey(key) &&
          !TRACKER_SETTING_KEYS.includes(key) &&
          !DISPLAY_SETTING_KEYS.includes(key) &&
          !/_token$/i.test(key)
      )
    );
    appendGroup('Display / Filtering', DISPLAY_SETTING_KEYS);
    appendGroup(
      'Stored Tokens',
      Object.keys(DEFAULT_SETTINGS).filter(
        (key) => !isSuppressedSettingKey(key) && /_token$/i.test(key)
      )
    );
    appendGroup(
      'Other',
      Object.keys(DEFAULT_SETTINGS).filter((key) => !used.has(key) && !isSuppressedSettingKey(key))
    );
    initTrackerCredentialVisibility(grid);

    return grid;
  }

  function buildSettingsGroup(title, keys) {
    const group = document.createElement('section');
    group.className = 'unit3d-imdb-settings-group';
    const heading = document.createElement('h3');
    heading.textContent = title;
    group.appendChild(heading);
    keys.forEach((key) => group.appendChild(buildSettingRow(key)));
    return group;
  }

  function buildSettingRow(key) {
    const field = fields[key];
    const label = document.createElement('label');
    label.className = 'unit3d-imdb-setting-row';
    label.dataset.settingKey = key;
    label.title = field.tooltip || '';
    const text = document.createElement('span');
    text.textContent = field.label || key;
    let input;

    if (field.type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!GM_config.get(key);
    } else if (field.type === 'select') {
      input = document.createElement('select');
      (field.options || []).forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = GM_config.get(key) === value;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type === 'int' ? 'number' : 'text';
      input.value = String(GM_config.get(key) ?? '');
    }

    input.name = key;
    if (TRACKER_SETTING_KEYS.includes(key) && input instanceof HTMLInputElement) {
      input.addEventListener('change', () =>
        updateTrackerCredentialVisibility(label.closest('form'))
      );
    }
    label.append(text, input);
    return label;
  }

  function initTrackerCredentialVisibility(root) {
    root
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) =>
        input.addEventListener('change', () => updateTrackerCredentialVisibility(root))
      );
    updateTrackerCredentialVisibility(root);
  }

  function updateTrackerCredentialVisibility(root) {
    if (!root) return;
    getSelectableTrackerSettingKeys().forEach((trackerKey) => {
      const trackerInput = root.querySelector(`[name="${cssEscape(trackerKey)}"]`);
      const showCredentials = !!trackerInput?.checked;
      getTrackerCredentialKeys(trackerKey).forEach((credentialKey) => {
        const row = root.querySelector(`[data-setting-key="${cssEscape(credentialKey)}"]`);
        if (row) setSettingElementVisible(row, showCredentials);
      });
    });
    root.querySelectorAll('.unit3d-imdb-settings-group').forEach((group) => {
      const rows = Array.from(group.querySelectorAll('.unit3d-imdb-setting-row'));
      setSettingElementVisible(
        group,
        rows.length === 0 || rows.some((row) => !isSettingElementHidden(row))
      );
    });
  }

  function getSelectableTrackerSettingKeys() {
    return TRACKER_SETTING_KEYS.filter((key) => !isSuppressedTrackerKey(key));
  }

  function isSuppressedTrackerKey(key) {
    return IS_AITHER_HOST && key === 'aither';
  }

  function isSuppressedSettingKey(key) {
    if (isSuppressedTrackerKey(key)) return true;
    return getSuppressedTrackerCredentialKeys().includes(key);
  }

  function getSuppressedTrackerCredentialKeys() {
    return TRACKER_SETTING_KEYS.filter(isSuppressedTrackerKey).flatMap(getTrackerCredentialKeys);
  }

  function setSettingElementVisible(element, visible) {
    element.hidden = !visible;
    element.style.display = visible ? '' : 'none';
  }

  function isSettingElementHidden(element) {
    return element.hidden || element.style.display === 'none';
  }

  function getTrackerCredentialKeys(trackerKey) {
    if (Object.hasOwn(TRACKER_CREDENTIAL_OVERRIDES, trackerKey)) {
      return TRACKER_CREDENTIAL_OVERRIDES[trackerKey].filter((key) => key in DEFAULT_SETTINGS);
    }
    const apiKey = `${trackerKey}_api`;
    return apiKey in DEFAULT_SETTINGS ? [apiKey] : [];
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replaceAll(/["\\]/g, '\\$&');
  }

  function saveSettingsForm(form) {
    Object.entries(DEFAULT_SETTINGS).forEach(([key, defaultValue]) => {
      const input = form.elements.namedItem(key);
      if (!input) return;
      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        GM_config.set(key, input.checked);
      } else if (fields[key]?.type === 'int') {
        const parsed = Number.parseInt(input.value, 10);
        GM_config.set(key, Number.isFinite(parsed) ? parsed : defaultValue);
      } else {
        GM_config.set(key, input.value);
      }
    });
  }

  function closeSettingsPanel() {
    document.getElementById(SETTINGS_PANEL_ID)?.remove();
  }

  function installSettingsStyle() {
    if (document.getElementById(SETTINGS_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SETTINGS_STYLE_ID;
    style.textContent = `
.unit3d-imdb-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.42);
}
.unit3d-imdb-settings-dialog {
  width: min(960px, 94vw);
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
.unit3d-imdb-settings-header,
.unit3d-imdb-settings-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.unit3d-imdb-settings-header h2 {
  margin: 0;
  font-size: 1.3em;
}
.unit3d-imdb-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin: 16px 0;
}
.unit3d-imdb-settings-group {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 12px;
}
.unit3d-imdb-settings-group h3 {
  margin: 0 0 8px;
  color: #f2db83;
  font-size: 1em;
}
.unit3d-imdb-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin: 7px 0;
}
.unit3d-imdb-setting-row span {
  min-width: 0;
}
.unit3d-imdb-setting-row input[type='text'],
.unit3d-imdb-setting-row input[type='number'],
.unit3d-imdb-setting-row select {
  width: min(150px, 48%);
}
`;
    (document.head || document.documentElement).appendChild(style);
  }

  // Toggle the visibility of api fields if they've been enabled or disabled
  function toggleAuthFields(key, isAuthEnabled) {
    const multi_auth = {
      bhd: ['bhd_api', 'bhd_rss', 'bhd_seeding'],
      ar: ['ar_auth', 'ar_pass'],
      fl: ['fl_user', 'fl_pass'],
      hdb: ['hdb_user', 'hdb_pass'],
      ptp: ['ptp_api_user', 'ptp_api_key'],
      tvv: ['tvv_auth', 'tvv_torr', 'easysearch'],
      rtf: ['rtf_user', 'rtf_pass', 'rtf_token'],
      avistaz: ['avistaz_user', 'avistaz_pass', 'avistaz_pid', 'avistaz_token'],
      cinemaz: ['cinemaz_user', 'cinemaz_pass', 'cinemaz_pid', 'cinemaz_token'],
      phd: ['phd_user', 'phd_pass', 'phd_pid', 'phd_token'],
      hidesamesize: ['logsamesize', 'fuzzyMatching', 'valueinMIB']
    };

    if (key in multi_auth) {
      multi_auth[key].forEach((subKey) => toggleAuthFields(subKey, isAuthEnabled));
      return;
    }

    const allKeys = Object.values(multi_auth).flat();
    const fieldName = allKeys.includes(key) ? key : `${key}_api`;

    if (GM_config.fields[fieldName]) {
      GM_config.fields[fieldName].wrapper.style.display = isAuthEnabled ? '' : 'none';
    } else {
      console.error(`Field ${fieldName} does not exist in GM_config.fields`);
    }
  }

  GM_config.init({
    id: 'UNIT3DAddReleases',
    title: `
            <div>
                Add releases from other trackers<br>
                <small style='font-weight:normal; font-size:16px;'>Select only trackers you have access to</small>
                <br><br>
                <small style='font-weight:lighter; font-size:12px;'>Hover over names for tooltip help</small>
            </div>
        `,
    fields: fields,
    css: `
            #UNIT3DAddReleases {background: #333333; margin: 0; padding: 20px 20px}
            #UNIT3DAddReleases .field_label {color: #fff; width: 100%;}
            #UNIT3DAddReleases .config_header {color: #fff; padding-bottom: 10px; font-weight: 100;}
            #UNIT3DAddReleases .reset {color: #e8d3d3; text-decoration: none;}
            #UNIT3DAddReleases .config_var {display: flex; flex-direction: row; text-align: left; justify-content: center; align-items: center; width: 85%; margin: 4px auto; padding: 4px 0; border-bottom: 1px solid #7470703d;}
            #UNIT3DAddReleases_buttons_holder {display: grid; gap: 10px; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; width:85%; height: 100px; margin: 0 auto; text-align: center; align-items: center;}
            #UNIT3DAddReleases_saveBtn {grid-column:1; grid-row:1; cursor: pointer;}
            #UNIT3DAddReleases_closeBtn {grid-column:3; grid-row:1; cursor: pointer;}
            #UNIT3DAddReleases .reset_holder {grid-column:2; grid-row:2}
            #UNIT3DAddReleases .config_var input[type="checkbox"] {cursor: pointer;}
        `,
    events: {
      open: function (doc) {
        let style = this.frame.style;
        style.width = '500px';
        style.height = '800px';
        style.inset = '';
        style.top = '6%';
        style.right = '6%';
        style.borderRadius = '5px';
        console.log('Config window opened');

        // Add tooltips
        for (const field in fields) {
          if (Object.hasOwn(fields, field) && fields[field].tooltip) {
            let label = doc.querySelector(`label[for="UNIT3DAddReleases_field_${field}"]`);
            if (label) {
              label.title = fields[field].tooltip;
            }
          }
        }
        // Nodes that require API keys
        const api_based_nodes = {
          aither: GM_config.fields.aither.node,
          ant: GM_config.fields.ant.node,
          ar: GM_config.fields.ar.node,
          avistaz: GM_config.fields.avistaz.node,
          bhd: GM_config.fields.bhd.node,
          blu: GM_config.fields.blu.node,
          btn: GM_config.fields.btn.node,
          cinemaz: GM_config.fields.cinemaz.node,
          dp: GM_config.fields.dp.node,
          fl: GM_config.fields.fl.node,
          hdb: GM_config.fields.hdb.node,
          hhd: GM_config.fields.hhd.node,
          ifl: GM_config.fields.ifl.node,
          lst: GM_config.fields.lst.node,
          ldu: GM_config.fields.ldu.node,
          lume: GM_config.fields.lume.node,
          MTeam: GM_config.fields.MTeam.node,
          mtv: GM_config.fields.mtv.node,
          nbl: GM_config.fields.nbl.node,
          huno: GM_config.fields.huno.node,
          oe: GM_config.fields.oe.node,
          otw: GM_config.fields.otw.node,
          ops: GM_config.fields.ops.node,
          phd: GM_config.fields.phd.node,
          ptp: GM_config.fields.ptp.node,
          red: GM_config.fields.red.node,
          ras: GM_config.fields.ras.node,
          rmc: GM_config.fields.rmc.node,
          rfx: GM_config.fields.rfx.node,
          rtf: GM_config.fields.rtf.node,
          sp: GM_config.fields.sp.node,
          tik: GM_config.fields.tik.node,
          tvv: GM_config.fields.tvv.node,
          ulcx: GM_config.fields.ulcx.node,
          yus: GM_config.fields.yus.node,
          hidesamesize: GM_config.fields.hidesamesize.node
        };

        // Add event listeners for trackers with auth
        for (const [key, value] of Object.entries(api_based_nodes)) {
          toggleAuthFields(key, value.checked);
          value.addEventListener('change', function () {
            toggleAuthFields(key, value.checked);
          });
        }
      },
      save: function () {
        const filterBox = document.querySelector('.panel__body');
        if (GM_config.get('filterhidden')) {
          filterBox.style.display = 'none';
        } else {
          filterBox.style.display = 'block';
        }
        console.log('Settings saved');
      },
      close: function () {
        console.log('Config window closed, reloading page');
        if (this.frame) {
          globalThis.location.reload();
        } else {
          setTimeout(() => {
            globalThis.location.reload();
          }, 250);
        }
      }
    }
  });

  // Register menu command
  GM_registerMenuCommand('UNIT3D - Add releases from other trackers', () => {
    console.log('Menu command clicked');
    GM_config.open();
  });

  if (isUnit3dSimilarPage()) {
    const show_only_by_default = GM_config.get('tracker_by_default')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean); // Ensure it's an array and remove empty values
    const show_resolution_by_default = GM_config.get('res_by_default')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean); // Ensure it's an array and remove empty values

    // Function to get trackers from the configuration
    function getTrackersFromConfig() {
      const movie_dict = {
        BHD: GM_config.get('bhd'),
        FL: GM_config.get('fl'),
        HDB: GM_config.get('hdb'),
        KG: GM_config.get('kg'),
        PxHD: GM_config.get('pxhd'),
        MTV: GM_config.get('mtv'),
        BLU: GM_config.get('blu'),
        HUNO: GM_config.get('huno'),
        TIK: GM_config.get('tik'),
        Aither: !IS_AITHER_HOST && GM_config.get('aither'),
        OE: GM_config.get('oe'),
        AvistaZ: GM_config.get('avistaz'),
        CinemaZ: GM_config.get('cinemaz'),
        PHD: GM_config.get('phd'),
        RTF: GM_config.get('rtf'),
        LST: GM_config.get('lst'),
        ANT: GM_config.get('ant'),
        CG: GM_config.get('cg'),
        TL: GM_config.get('tl'),
        MTeam: GM_config.get('MTeam'),
        IFL: GM_config.get('ifl'),
        RED: GM_config.get('red'),
        OPS: GM_config.get('ops'),
        ULCX: GM_config.get('ulcx'),
        AR: GM_config.get('ar'),
        OTW: GM_config.get('otw'),
        DP: GM_config.get('dp'),
        LDU: GM_config.get('ldu'),
        YUS: GM_config.get('yus'),
        RAS: GM_config.get('ras'),
        SP: GM_config.get('sp'),
        HHD: GM_config.get('hhd'),
        LUME: GM_config.get('lume'),
        RMC: GM_config.get('rmc')
      };

      const movie_only_dict = {
        PTP: GM_config.get('ptp'),
        RFX: GM_config.get('rfx')
      };

      const tv_dict = {
        BTN: GM_config.get('btn'),
        NBL: GM_config.get('nbl'),
        TVV: GM_config.get('tvv')
      };

      const old_dict = {
        TVV: GM_config.get('tvv')
      };

      const pre_2001_dict = {
        RMC: GM_config.get('rmc')
      };

      const very_old_dict = {
        RTF: GM_config.get('rtf')
      };

      return {
        movie_dict,
        movie_only_dict,
        tv_dict,
        old_dict,
        pre_2001_dict,
        very_old_dict
      };
    }

    // Fill trackers arrays with enabled trackers
    function fillTrackers(dict, trackerArray) {
      for (const [key, value] of Object.entries(dict)) {
        if (value) {
          trackerArray.push(key);
        }
      }
    }

    // Get trackers from the configuration
    const { movie_dict, movie_only_dict, tv_dict, old_dict, pre_2001_dict, very_old_dict } =
      getTrackersFromConfig();

    const movie_trackers = [];
    const movie_only_trackers = [];
    const tv_trackers = [];
    const old_trackers = [];
    const pre_2001_trackers = [];
    const very_old_trackers = [];

    // Fill trackers arrays
    fillTrackers(movie_dict, movie_trackers);
    fillTrackers(movie_only_dict, movie_only_trackers);
    fillTrackers(tv_dict, tv_trackers);
    fillTrackers(old_dict, old_trackers);
    fillTrackers(pre_2001_dict, pre_2001_trackers);
    fillTrackers(very_old_dict, very_old_trackers);

    const BLU_API_TOKEN = GM_config.get('blu_api'); // if you want to use BLU - find your api key here: https://blutopia.cc/users/YOUR_USERNAME_HERE/apikeys
    const TIK_API_TOKEN = GM_config.get('tik_api'); // if you want to use TIK - find your api key here: https://cinematik.net/users/YOUR_USERNAME_HERE/apikeys
    const AITHER_API_TOKEN = GM_config.get('aither_api'); // if you want to use Aither - find your api key here: https:/aither.cc/users/YOUR_USERNAME_HERE/apikeys
    const HUNO_API_TOKEN = GM_config.get('huno_api'); // if you want to use HUNO - find your api key here: https://hawke.uno/users/YOUR_USERNAME_HERE/settings/security#api
    const RFX_API_TOKEN = GM_config.get('rfx_api'); // if you want to use RFX - find your api key here: https:/reelflix.xyz/users/YOUR_USERNAME_HERE/apikeys
    const OE_API_TOKEN = GM_config.get('oe_api'); /// if you want to use OE - find your api key here: https:/onlyencodes.cc/users/YOUR_USERNAME_HERE/apikeys
    const BHD_API_TOKEN = GM_config.get('bhd_api');
    const BHD_RSS_KEY = GM_config.get('bhd_rss');
    const HDB_USER_NAME = GM_config.get('hdb_user');
    const HDB_PASS_KEY = GM_config.get('hdb_pass');
    const NBL_API_TOKEN = GM_config.get('nbl_api');
    const BTN_API_TOKEN = GM_config.get('btn_api');
    const MTV_API_TOKEN = GM_config.get('mtv_api');
    const LST_API_TOKEN = GM_config.get('lst_api');
    const ANT_API_TOKEN = GM_config.get('ant_api');
    const RTF_USER = GM_config.get('rtf_user');
    const RTF_PASS = GM_config.get('rtf_pass');
    const AVISTAZ_USER = GM_config.get('avistaz_user');
    const AVISTAZ_PASS = GM_config.get('avistaz_pass');
    const AVISTAZ_PID = GM_config.get('avistaz_pid');
    const CINEMAZ_USER = GM_config.get('cinemaz_user');
    const CINEMAZ_PASS = GM_config.get('cinemaz_pass');
    const CINEMAZ_PID = GM_config.get('cinemaz_pid');
    const PHD_USER = GM_config.get('phd_user');
    const PHD_PASS = GM_config.get('phd_pass');
    const PHD_PID = GM_config.get('phd_pid');
    const FL_USER_NAME = GM_config.get('fl_user');
    const FL_PASS_KEY = GM_config.get('fl_pass');
    const PTP_API_USER = GM_config.get('ptp_api_user');
    const PTP_API_KEY = GM_config.get('ptp_api_key');
    const IFL_API_TOKEN = GM_config.get('ifl_api');
    const ULCX_API_TOKEN = GM_config.get('ulcx_api');
    const AR_AUTH = GM_config.get('ar_auth');
    const AR_PASS = GM_config.get('ar_pass');
    const OTW_API_TOKEN = GM_config.get('otw_api');
    const DP_API_TOKEN = GM_config.get('dp_api');
    const YUS_API_TOKEN = GM_config.get('yus_api');
    const LDU_API_TOKEN = GM_config.get('ldu_api');
    const RAS_API_TOKEN = GM_config.get('ras_api');
    const SP_API_TOKEN = GM_config.get('sp_api');
    const HHD_API_TOKEN = GM_config.get('hhd_api');
    const LUME_API_TOKEN = GM_config.get('lume_api');
    const RMC_API_TOKEN = GM_config.get('rmc_api');

    // We need to use XML response with TVV and have to define some parameters for it to work correctly.
    const TVV_AUTH_KEY = GM_config.get('tvv_auth'); // If you want to use TVV - find your authkey from a torrent download link
    const TVV_TORR_PASS = GM_config.get('tvv_torr'); // We also need the torrent pass - find your torrent_pass from a torrent download link

    const hideBlankLinks = 'DL';
    const filterboxlocation = GM_config.get('filterboxlocation');
    const show_tracker_icon = GM_config.get('show_icon'); // false = will show default green checked icon ||| true = will show tracker logo instead of checked icon
    const hide_if_torrent_with_same_size_exists = GM_config.get('hidesamesize'); // true = will hide torrents with the same file size as existing PTP ones
    const log_torrents_with_same_size = GM_config.get('logsamesize'); // true = will log torrents with the same file size as existing PTP ones in console (F12)
    const hide_filters_div = GM_config.get('hide_filters'); // false = will show filters box ||| true = will hide filters box
    const hide_dead_external_torrents = GM_config.get('hide_dead'); // true = won't display dead external torrents
    const open_in_new_tab = GM_config.get('new_tab'); // false : when you click external torrent, it will open the page in new tab. ||| true : it will replace current tab.
    let hide_tags = GM_config.get('hide_tags'); // true = will hide all of the tags. Featured, DU, reported, etc.
    const run_by_default = GM_config.get('run_default'); // false = won't run the script by default, but will add an "Other Trackers" link under the page title, which when clicked will run the script.
    const timer = GM_config.get('timer') * 1000; // Convert to milliseconds
    const timerDuration = GM_config.get('timerDuration') * 1000; // Convert to milliseconds
    let ptp_release_name = GM_config.get('ptp_name'); // true = show release name - false = original PTP release style. Ignored if Improved Tags  = true
    let improved_tags = GM_config.get('funky_tags'); // true = Change display to work fully with PTP Improved Tags from jmxd.
    const debug = GM_config.get('debugging');
    const easysearching = GM_config.get('easysearch');
    const valueinMIB = GM_config.get('valueinMIB');
    const fuzzyMatching = GM_config.get('fuzzyMatching');
    const simplediscounts = GM_config.get('simplediscounts');
    const bhdSeeding = GM_config.get('bhd_seeding');
    const media = GM_config.get('media');
    const format = GM_config.get('format');

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // UNIT3D similar pages encode media type in the route: similar/1 = movies, similar/2 = TV.
    const isMiniSeriesFromSpan = isUnit3dTvPage();
    const isMiniSeries = isMiniSeriesFromSpan;
    // Find the year of the content.
    const pageTitleElement = document.querySelector(
      '.meta__title, .torrent__name, h1:not(.page__title), .page__title'
    );
    const pageTitleText = pageTitleElement ? pageTitleElement.textContent : '';
    const matches = /(?:\(|\[)\s*(\d{4})\s*(?:\)|\])/.exec(pageTitleText);
    const year = matches ? Number.parseInt(matches[1], 10) : null;
    const genreTags = getUnit3dGenreTags();
    const otwGenreAllowed = genreTags.some(isOtwAllowedGenre);
    // Start the array with the list of movie trackers.
    let trackers = movie_trackers.slice();
    let excludedTrackers = [];

    // Add movie-only trackers when not at a PTP miniseries page.
    if (isMiniSeriesFromSpan) {
      movie_only_trackers.forEach((tracker) => {
        // exclude the movie only trackers from the array with reason.
        excludedTrackers.push({ tracker: tracker, reason: 'Not classified as a Feature Film' });
      });
    } else {
      trackers = trackers.concat(movie_only_trackers);
    }
    const selectedTVTrackers = ['TVV', 'BTN']; // Trackers defined here also contain TV movies and the like.

    // Add TV trackers if it is a PTP miniseries page, but skip selected TV Trackers handling for now.
    if (isMiniSeriesFromSpan) {
      trackers = trackers.concat(
        tv_trackers.filter((tracker) => !selectedTVTrackers.includes(tracker))
      );
    } else {
      tv_trackers.forEach((tracker) => {
        if (!selectedTVTrackers.includes(tracker)) {
          excludedTrackers.push({ tracker: tracker, reason: 'Not classified as a Miniseries' });
        }
      });
    }

    // This also captures TV movies and the like from Collections. Add selected TV Trackers.
    if (isMiniSeries) {
      // Filter selectedTVTrackers to only include those that are also in tv_trackers
      const validSelectedTVTrackers = selectedTVTrackers.filter((tracker) =>
        tv_trackers.includes(tracker)
      );

      // Only add trackers from validSelectedTVTrackers if they are not already in the trackers array
      validSelectedTVTrackers.forEach((tracker) => {
        if (!trackers.includes(tracker)) {
          trackers.push(tracker);
        }
      });
    } else {
      selectedTVTrackers.forEach((tracker) => {
        if (tv_trackers.includes(tracker)) {
          excludedTrackers.push({ tracker: tracker, reason: 'Not classified as a Miniseries' });
        }
      });
    }

    if (trackers.includes('OTW') && !otwGenreAllowed) {
      trackers = trackers.filter((tracker) => tracker !== 'OTW');
      excludedTrackers.push({
        tracker: 'OTW',
        reason:
          genreTags.length > 0
            ? `Excluded by OTW genre check (requires animation/family; genres: ${genreTags.join(', ')})`
            : 'Excluded by OTW genre check (requires animation/family; genres unavailable)'
      });
    }

    const tenYearsAgoYear = new Date().getFullYear() - 10;

    if (year && (year < 2001 || year > 2100)) {
      pre_2001_trackers.forEach((tracker) => {
        if (!trackers.includes(tracker)) {
          trackers.push(tracker);
        }
      });
    } else {
      const initialTrackers = [...trackers]; // Make a copy to compare later
      trackers = trackers.filter((tracker) => !pre_2001_trackers.includes(tracker));

      initialTrackers.forEach((tracker) => {
        if (!trackers.includes(tracker)) {
          excludedTrackers.push({
            tracker,
            reason: `Excluded by year range check (Year: ${year})`
          });
        }
      });
    }

    if (year && (year < tenYearsAgoYear || year > 2100)) {
      very_old_trackers.forEach((tracker) => {
        if (!trackers.includes(tracker)) {
          trackers.push(tracker);
        }
      });
    } else {
      const initialTrackers = [...trackers]; // Make a copy to compare later
      trackers = trackers.filter((tracker) => !very_old_trackers.includes(tracker));

      initialTrackers.forEach((tracker) => {
        if (!trackers.includes(tracker)) {
          excludedTrackers.push({
            tracker,
            reason: `Excluded by year range check (Year: ${year})`
          });
        }
      });
    }

    // Remove old trackers from the included trackers array if the content matches the year range.
    if (year && (year < 2022 || year > 2100)) {
      if (isMiniSeries) {
        old_trackers.forEach((tracker) => {
          if (!trackers.includes(tracker)) {
            trackers.push(tracker);
          }
        });
      }
    } else {
      const initialTrackers = [...trackers]; // Make a copy to compare later
      trackers = trackers.filter((tracker) => !old_trackers.includes(tracker));

      initialTrackers.forEach((tracker) => {
        if (!trackers.includes(tracker)) {
          excludedTrackers.push({
            tracker,
            reason: `Excluded by year range check (Year: ${year})`
          });
        }
      });
    }
    console.log('Active trackers:', trackers);
    const active_trackers = trackers;
    console.log(
      'Excluded trackers:',
      excludedTrackers.map((e) => `${e.tracker} - ${e.reason}`)
    );

    function toUnixTime(dateString) {
      // Check if the date string is in the format "DD/MM/YYYY HH:MM:SS"
      const regexDDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
      const matchDDMMYYYY = dateString.match(regexDDMMYYYY);
      if (matchDDMMYYYY) {
        const day = Number.parseInt(matchDDMMYYYY[1], 10);
        const month = Number.parseInt(matchDDMMYYYY[2], 10) - 1;
        const year = Number.parseInt(matchDDMMYYYY[3], 10);
        const hours = Number.parseInt(matchDDMMYYYY[4], 10);
        const minutes = Number.parseInt(matchDDMMYYYY[5], 10);
        const seconds = Number.parseInt(matchDDMMYYYY[6], 10);

        const date = new Date(year, month, day, hours, minutes, seconds);
        return Math.floor(date.getTime() / 1000); // Convert to Unix timestamp in seconds
      }

      // Check if the date string is in 'YYYY-MM-DD HH:MM:SS' format
      const regexYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
      const matchYYYYMMDD = dateString.match(regexYYYYMMDD);
      if (matchYYYYMMDD) {
        const year = Number.parseInt(matchYYYYMMDD[1], 10);
        const month = Number.parseInt(matchYYYYMMDD[2], 10) - 1;
        const day = Number.parseInt(matchYYYYMMDD[3], 10);
        const hours = Number.parseInt(matchYYYYMMDD[4], 10);
        const minutes = Number.parseInt(matchYYYYMMDD[5], 10);
        const seconds = Number.parseInt(matchYYYYMMDD[6], 10);

        const date = new Date(year, month, day, hours, minutes, seconds);
        return Math.floor(date.getTime() / 1000); // Convert to Unix timestamp in seconds
      }

      // Check if the date string is in the ISO 8601 format (ends with 'Z' or includes time zone offset)
      if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-')) {
        return Math.floor(new Date(dateString).getTime() / 1000);
      }

      // Check if the date string is in the format "Sat, 20 Jun 2015 01:58:58 +0000"
      const parsedDate = Date.parse(dateString);
      if (!Number.isNaN(parsedDate)) {
        return Math.floor(new Date(parsedDate).getTime() / 1000);
      }

      // Parse relative time strings
      const now = new Date();
      const regexRelative = /(\d+)\s*([a-z]+)\b/gi;
      let match;
      while ((match = regexRelative.exec(dateString)) !== null) {
        const value = Number.parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        switch (unit) {
          case 'year':
          case 'years':
            now.setFullYear(now.getFullYear() - value);
            break;
          case 'month':
          case 'months':
            now.setMonth(now.getMonth() - value);
            break;
          case 'week':
          case 'weeks':
            now.setDate(now.getDate() - value * 7);
            break;
          case 'day':
          case 'days':
            now.setDate(now.getDate() - value);
            break;
          case 'hour':
          case 'hours':
            now.setHours(now.getHours() - value);
            break;
          case 'min':
          case 'mins':
          case 'minute':
          case 'minutes':
            now.setMinutes(now.getMinutes() - value);
            break;
          case 'sec':
          case 'secs':
          case 'second':
          case 'seconds':
            now.setSeconds(now.getSeconds() - value);
            break;
          default:
            break;
        }
      }

      return Math.floor(now.getTime() / 1000);
    }

    let discounts;
    if (simplediscounts) {
      discounts = [
        'FL',
        '75%',
        '50%',
        '40%',
        '30%',
        '25%',
        'Refund',
        'Rewind',
        'Rescue',
        'Pollin',
        'None'
      ];
    } else {
      discounts = [
        'Freeleech',
        '75% Freeleech',
        '50% Freeleech',
        '40% Bonus',
        '30% Bonus',
        '25% Freeleech',
        'Copper',
        'Bronze',
        'Silver',
        'Golden',
        'Refundable',
        'Rewind',
        'Rescuable',
        'Pollination',
        'None'
      ];
    }

    let qualities = ['SD', '720p', '1080p', '2160p', 'Soundtrack'];
    let filters = {
      trackers: trackers.map((e) => {
        return { name: e, status: 'default' };
      }),

      discounts: discounts.map((e) => {
        return { name: e, status: 'default' };
      }),

      qualities: qualities.map((e) => {
        return { name: e, status: 'default' };
      })
    };
    let doms = [];
    let latestUnit3dExternalTorrents = null;
    const unit3dExternalDetailTorrents = new Map();
    const unit3dExternalDetailCache = new Map();
    let isRenderingUnit3dExternalTorrents = false;

    const dom_get_quality = (text) => {
      if (text.includes('720p')) return '720p';
      else if (text.includes('1080p') || text.includes('1080i')) return '1080p';
      else if (text.includes('2160p')) return '2160p';
      else return 'SD';
    };

    const get_default_doms = () => {
      [...document.querySelectorAll('tr.group_torrent_header')].forEach((d, i) => {
        let tracker = 'PTP';
        let dom_path = d;
        let quality = dom_get_quality(d.textContent);
        let discount = 'None';
        const modifiers = d.querySelectorAll('.torrent-info__download-modifier');
        modifiers.forEach((modifier) => {
          const text = modifier.textContent.trim().toLowerCase();
          if (text.includes('freeleech') || text.includes('freeleech!')) {
            if (simplediscounts) {
              discount = 'FL';
            } else {
              discount = 'Freeleech';
            }
          } else if (text.includes('half-leech') || text.includes('half-leech!')) {
            if (simplediscounts) {
              discount = '50%';
            } else {
              discount = '50% Freeleech';
            }
          }
        });
        let releaseName = d.closest('tr.group_torrent_header');
        let groupName = d.closest('tr.group_torrent_header');
        let info_text = releaseName.dataset.releasename;
        let group_id = groupName.dataset.releasegroup;
        let seeders = Number.parseInt(
          d.querySelector('td:nth-child(4)').textContent.replace(',', '')
        );
        let leechers = Number.parseInt(
          d.querySelector('td:nth-child(5)').textContent.replace(',', '')
        );
        let snatchers = Number.parseInt(
          d.querySelector('td:nth-child(3)').textContent.replace(',', '')
        );
        let size = d.querySelector('td:nth-child(2)').textContent.trim();

        if (size.includes('TiB')) {
          size = (Number.parseFloat(size.split(' ')[0]) * 1048576).toFixed(2); // Convert TiB to MiB
        } else if (size.includes('GiB')) {
          size = (Number.parseFloat(size.split(' ')[0]) * 1024).toFixed(2); // Convert GiB to MiB
        } else if (size.includes('MiB')) {
          size = Number.parseFloat(size.split(' ')[0]).toFixed(2); // Directly use the MiB value
        } else {
          size = 1; // Default case when no size unit is provided
        }

        let dom_id = 'ptp_' + i;

        d.className += ' ' + dom_id;

        doms.push({
          tracker,
          dom_path,
          quality,
          discount,
          group_id,
          info_text,
          seeders,
          leechers,
          snatchers,
          dom_id,
          size
        });
      });
    };

    get_default_doms();

    const trackerIcons = {
      BHD: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABm1BMVEUAAAAZS9cgXc8jYswjY8siYMwgXM8cStogXM8eWNAAAP8hXc8gXM4gWs4laMkfWNAbR9kZStghW8sgW88jYMkhYMsjYssjY8sjY8shYcsiX8sgW8wgWc0ZRtckZ8kjZ8kfWdInacomacoeWtAAAP8hW8shXMwgWM8gWs4XRNYgWcwjY8siYMshXM0ZTNYladEob9Uma80lackma8wnb9QmatQqd+UmbM4laMkmackbYsYeZMcqd+Qqd+YmacodY8ZGe9c4ctMfZcYlacoladInbM4jZ8gfZMcMVsTN1/ijt/IJVMIgZcclaMgmatUob9YSW8UHUsNLftf////8+f8sZdQNV8UUXMYnb9U4b9WzxPTJ1fb19v/s7v/Q2vm6yPc3cNMhZsceYcqtwPH9/v/+/v+ct+obYcciZsgmasomaMkgZscJVMSSreuHp+cHU8IiZscOWcNpk95ok94PWcMPWcSyx/CVru2SrOyyxvEQWcQfZMh0leZIedkMVsMLVsM/dNZzluYhZcgYX8YXX8UkaMgZYMUnbM8ladQQmoZOAAAAL3RSTlMAM6Xn+u+qN5afAsPMkf6dLzSjqefs+fv87OumpzP+/p3+/pcBxsKZlzim+eakMhtflnAAAAD5SURBVHicYwABRiZmFhZWNnYwBwg49A0MjYyMTUw5ucB8bjNzC0sra0sLcxsekAivrR2fhb2Do5OFhbMZPwODgIsrn5u7h6eXt4+br7mfIIOQv6VbQGBQcEhoWLibZYQwg4ihfWRUdExwcGxcfIK9sSiDmHNiUnJwcEpqcHBaeoaROINYZlZ2Tm4wEOTlF2QZSTBIGltYFBaBBIpLLCyMpRikIyzcSsuCyyuCK6vcLAxkGGRNzeWqa2rr6hsam+TNTWUZGBTM7BSbW1ot2lqUMs2UgS5VUTUzb7UAgtZ2MzWI59Q7IoyNnA0N9DVg3tXUkpLQ1tHVA7EB7Jc4ygIVY/MAAAAASUVORK5CYII=',
      BLU: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACGVBMVEUAAAAAdeIAduMAcdwAZ8UAacQAbMkAefIAdOMAc98AdN4AZsMAZsUAY8MAcdUAc+EAdd8AdN4AZsMAasUAasoAduIAasUAdN8AbMcAeOMAdN4AZ8MAaMcAgOoAct0AaMQAccYAcN0AacQAb90AaMUAcd8AacQAdN8AacUAdeEAasUAdeQAdN8AacQAbMYAceM3keY9i9AAacUAbdsAceMAdOAAacUAcMwAduYActwAacYAa8IAeusAbd8AYsUAbM0Af/MAfO4AdeMAZtuNwPGRvOMAXb8WeM4QedYAatMAgvoAeOcAdN8AcdwAZ9o6keT///9EjtIlbsUzhM7G3PIkgdUAb9kAduMAdeEAcNwIdd0eft/H4PifyO+aw+rD2/AAVrwAYMBtp9wqgtAAZcUAc+IQet8vi+MJdN3d7Pvl7/kAZcIAX78Wc8gQdMwHeuYCb9wAbtzk8Pvq8voIasQlfMsAasouku8VfuAAa9vc6/rg7PgAY8EbdsgCaMMAbc48m/QKeN4AZNlfpulvqNwAXL4AZsIAcNEUhfIsieM2juMyhM4AXr8AcdQAe/ECbtwghOGkyfKjxej8/f4fesoActUAhP0AcN4Aatra6vqJvvB1r+t6rN6EtuHg7PcAZsQAd+AAgfcAduUSfN8CbNuUxPGdxOYDYcAScccAdNoAduEAefMAbeEAYMMAbNUAasYAd+QAc+UAaMt/Lf+4AAAAPHRSTlMAI3/m5H4hE2O+/Pu8YhIzsf79sDBqZUA7JPv5IAzt6gnZ1cG8paGIg29qMPTyLQn+/oUHG56bGTTT0TI1uk9cAAAA+ElEQVR4nGMAA0YmZhZWNgibgYGdg5PLxtbOnpuHlw/I5RcQdHB0cnZxdXP38BQSFmEQ9fL28fXzDwgIDAoOCQ0TYxAPj4iMio6JjYtPSExKTpFgkJRKTUvPyAwIyMrOyc2TlmGQlcv3LygsCggozi4pLZNXYGBQLK+o9KsKCKiuqa2rVwJao9zQ2NQcAAQtrW3tKkAB1Y7OLhA/IKC7p1cNKKDe1z8hIGDipMkBUxKnagAFNKdNnzFz1uw5c+clzl+gBRTQ1lm4aPGSpcuWryhbqasH8ou++qrVawwM165bb2QM9Z6J6YaNm9abmcO8CwQWllbWEBYAex5Hkh1GjloAAAAASUVORK5CYII=',
      Aither:
        ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACYElEQVQokT2RS2sUQRSFb9169MOZScc8TBQN0Wg2URBB3Sj+ZHe6VhQloAgu1GjMQxMhycx093RXdVfVvS5G3BzO4izOxye2nzwbLq8MlleK9atSaQAAgLacMpFAzEYjW1XT0999284uzl1dqeTSYHRlrVi/lheFSdLOWSYKfddMxgtX1vPFRZ1mKGVvW52mtiyVybLhyuqtra0+hEjUObuytLRzc3PStABwXs/IBJPnebGYF4tn+98VKpWNFs6qmmK8u3H94damkVIiaim7EGrrPh4ej38dp0Mo1q424wsVuq48PTktp6u3bi/kd3Z/HJwcHTWTsdR6YW19e+PG/Y3rddOc7f8wWc5EqmubP3tfB5eXtm5uPn/x8uDDbvReIAKAMubbYHht597Tx4/eVdWfb19cXSlvbfR+4/6Dz58+7b19TSH4zqGUiLKbzVxdt+UUmKU2s4tz7xwyEYWQDoZ7b15F70PfRe+7pumd7W3bNTNblj9339uq9NZSDDIbjRBRJcnF4UHoXOh7jhEA5gkARJFiTIfD6emJrUqpkwQAlEnGx0eh7ykEZgZmgQjMTDTvJs3q87N2MlFM5J2z5TQGP7crBDIAMwMAMIMQKGVbTr1zIIRMB0MhQCDG3kfvmQgAQMC/NQDFIJWS2ri6jsHLvCjm3DpNo/f/rwMzMzETCGGyvG+a3lkAkCbLmTkGj1JKpVFKZmYiZhaIKJVOUiayVUkhUIxKIEqtmYiJAFGnqeJkji6VQqWEELauhBDSmBiCEkJIpaPv575i8EobVCp6j0r1bUsUo/fALLQWQvwFLByUKNhkQJ4AAAAASUVORK5CYII=',
      RFX: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABm1BMVEUAAAAAAAAAAAAGBgYICAgAAAAAAAAAAAAAAABjY2NpaWkGBgYAAAAAAAA7Ozs/RUQAAAAAAAA8PDxASEcAAAARERHmSlsPGhh4eHgAAAAAAAAAAAAAAAACAgIAAAACAgIAAAAAAAB9fX0AAAAVFRVOTk4eHh4AAABFRUX///9GRkYAAAAMDAwSEhIAAAAVFRUYGBgAAAAAAADCwsLMzMzLy8vGxsbw8PD////Q0NAfHx8cHBzDwsLx+fgmJiYAAAAVFxbb29tSUlIPDw+KiopjY2NIU1Lxi5jFEBTu4+ShoaHR0dGIiIh6g4LqzNDGAAe/AAW7AAD+kp9zhoTIyMi4uLjk5OT+///w3uDHABK/AAD4n6rH2dbW1tafn59sbGzOzs729vYrKyseHh7l8vD9wsrnXV/0iZXh5OTX19cRERHx8fHAzs1camqPn57k4+O3t7fj4+Pg4OAAAQG1tbXa2tqampqVlZWioqKNjY1QUFBtbW1dXV0QEBAjIyMUFBRRUVH9/f0TExOzs7NycnLS0tLPz8/Nzc15eXl4m6f0AAAAM3RSTlMAFliDhVwaDZv5/KMTJfD5MAzv+hSW/qf5Hldpg5WEl1tt/COf/rAR+P77PKu0apWXbihYkh2SAAAA6UlEQVR4nGMAA0YmZhZWNggbCNg5OI1NTM24uHkgfF4+cwtLK2sbC1t+ARBfUMjCwsLO3t4BSAmLAAVEHZ2cXVzt7d3cPcQ8xRkYeCS87O3tvX18/fwDAoOCJRmkQkKBAmEW4RGRUYHRMdIMMrEWcfEJiUnJKalp6RYZsgxymWCB5KzsnNw8i3x5BgXTAqCWQguLomJ7+5JSRQZGJZChsWXl3kCqolKZgUElrMrZpdrevsanVtVcDegOdQ0LTYs6e/t6INUA9o+AVqOFcVNts4VFgzbUrzotrW3tsR26knD/KuvpGxgagZkAsF41tDjKE9wAAAAASUVORK5CYII=',
      OE: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD+rDOnX3XmAAAAAXRSTlMAQObYZgAAADZJREFUCNdjYBBgYDBgYEhgYDzAwHyAgb2Bgb+BQf4Pg/0PBsYPDIwPQILMDQxsDAw8DAwcDADWOQi/lM68WwAAAABJRU5ErkJggg==',
      CG: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAMFBMVEX7ngALCQY8NjYcFg4pKChlRhI+KAH8wmGIWQmwcAX6pxr9sTLvs07XhwC1jUjmkQA+ssdvAAAAhklEQVQI12MoNVJSMZ7AwMCwPVhJRRjE4C41UhEDMkBCKmK9DGAhEcFUsNAewVDhSF4gY6nt9sOpbUDG5liGc8KCQMbhSIY1wi4MDPzLMi5wiigx8E5NFItoTFZiaBMUFhSUqDBhEDRxMZ63YPlDBhclFbFfDFx1DEpKKqIfGBjWgBgSIPMB2dsf/uqGtKUAAAAASUVORK5CYII=',
      FL: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAElBMVEUfotUje54mZHwpTFssLS8shKW30acsAAAANElEQVQI12MIhQKGEBcwcMXLcGZgMIAwWFzgDAUww4mBGcJwZHERgOhicXFgYHElymSYMwA+oyC+xS3dSAAAAABJRU5ErkJggg==',
      AvistaZ:
        ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABy1BMVEUAAAAAAACAAAAAAAAAAAAAAAAAAAAAAADWEADrGQTyGQT8GgT/HwONEQMAAAAAAAAAAAAAAAAAAADoPiVSEAEAAAAAAAAAAAAAAAAAAADoMgAAAAAAAAAAAAAAAADPQQP9c0kZCAAAAADqWQP9YgIAAADxbQL/ewHzggPykAHqjQLomgLelgDCkgD/wDwoHQD/tgEzZgDdoQD/4AD6yD+4hgEAAAAkGAACAgAKBwAfGAAAAABXRAD//wAHAAAAAAD/SzH/JwL/KgP0JgO+HAPRIQPJJAP/UB//VjP/OAH/PQKcLQITDwAABQA0DAFiFgH/SwD/ZC3bQgD/UgL/NgTyHQSbGgJeIgGSMwJHGAH/YgH/Zw/dXxPXWAHmJgPTAAT/AAR/AAKJEgKQOAJxLQH/cgL/dgrDaAz/VwOLAAL/BAT/AwR1DQK3XQH0gQH/gQDnjTLmp0z/XgGSAAE8AQHqBAT4AAQfDwD/lAL/ngKbXQCVWABnNQECAAA8AAGmXAH/rwL/rwDQkx8jJicjHQBxSAElAAFqAAIACADGfwH/vQH7rgD/wizyqQFJMwCXTwHSlgH/2zb/3VQxJAGJbAB7WgCAXwDXpB2kdgFzYhVqAAAAPnRSTlMAAwwyaZ6uNVC/7/jfw/2qjj8frrJrje7QhqTmznYiS/6HGcN4Bfewxu6qqVwq/v7qBW86au0+FXOtvKReA5ghf0AAAADQSURBVHicY8AOGJkYGJhZWNnYIVwOTi5uHl47ez5+AUEhIF/YwdHJ2cXVTURUTFxCkoFByt3D08vbx9fPX1pGVo6BQT4gUCEoOCQ0LDwiUlEJqEE5KjomNi4+ITEpOUVFFSiglpqWnpFpl5WdkJOrDrIiL7+gsKjYvqS0rLxCAySgWVlVXWNvb19bV9+gBRLQbmxqbmm1b2vv6OzSAQnodvfo9fbZ1/brTzAwBLvTaOKkyUAtU6ZOM4Z6xGQ6kG8/w9QM7jVzC0sraxtbHB4HAPCqMbtCnXGjAAAAAElFTkSuQmCC',
      PHD: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABI1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALCghBPCYFBAMEBAI/OiQTEg0+OSRHQShGQCdGQCgMCwiJeTz53G8JCAQHBgTu02qumkzexWP63W712Wv02Gr22mv/5HOMfD2kiyzqxj3evDrIqjbhvjuEbyMtJgzRsDewlS+SeRzowSyihh2fgxzdtyqzlCLduCpgTxHCoCSqjSCTdxPqvh6tjhiqixjetRyzkhdgTg3CnxmrixamhQvsvRDgtBDLog7jthCEagkrIwMsIwPTqQ+yjgyNbwT/ygYIBgAGBQDzwAayjQTjtAX/ygf7xgf6xgf8xwf/0QaQcgQMCQBENQAFBAAEAwBBMwAUEABKOgBJOgBJOQBLOwAMCgDCzKFuAAAACnRSTlMAhusBtLV/gejqQo021gAAAKxJREFUeJxlz9UOwmAMBeAfh+LursPdXYa7Dxi8/1NQEkiA9arnSy96CCE8PryHz8MoEH7ia0QCIv7OABIi/QUZAblCCSq1RqvT63UGIxAwmS1gtdkdTpfb4/Uh+AN4GQyFIxRFRWMI8UQylUxnsjn0fAGhWCpXytVatY7QaCK02rh1ur3+gKaHI4TxZAqz+WK5Wm+2uz3C4XiCM3Nhrjf2zj6A+xjndU65//pPDbIZdRRxnBgAAAAASUVORK5CYII=',
      PTP: 'data:image/x-icon;base64,AAABAAEAEBAAAAAAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAAAAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAABmfP9mtP9m6/9o/fMAAAB3342I0mep2mbW7WYAAADmtGbLhma8aGbBZpEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAAAAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAD///////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJ6cAAD//wAA//8AAI/mAAD//wAA//8AAP8/AACcngAA/z8AAP//AAD/PwAA//8AANtfAACWlwAAuLwAAP8/',
      CinemaZ:
        ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA4VBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzthe/AAAASnRSTlMAGIWkVoRXQq5OwAQV6ygNauEpDJx3I6WoCJQBfnsQSXLgb+7qt53a+p983kgCrc+TSj3+1yTLm9uGr0+mUNyAsFHmH72QHZeidXmPBZoAAACmSURBVHicTY7lEsJADIQDRYsVKNri7k5x133/ByJ3UKb7Y+f2u0w2RORyKx52r+LjwPKDFQgKV0Ocw4hEYxoQTyQ16AxSSLNnpGeRI8rD4KcpvYAiUQllIqOCKnutLnADTbPVVtHp9tAXLYMh7x+NRcvk2zsFZiJiToulxUCeILRaAxsG21+WYzsHkHKC/8Te/j0cgRODsw0udL3dGTx06yn0eosjPmC4Kqzfa+9cAAAAAElFTkSuQmCC',
      HDB: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAGFBMVEVPZHWjt8exxNNfdIV1ipuNorP+/v7Y3+RqcToTAAAA4ElEQVQoz6XITW6DMBCG4ZF8AkjcrkEh2RpNLgA22RvhsEZqZy6QmOt3DKpUWVlUyuufT3qgzvoHVFlQVOmU6W4fFFmvoJYpZep6Az+z9z5WMxFx4T3okrXW8VnS5UKLQJg5BB+fMvqTdIAwsg4hNmNyajYIvxDO3xncBaaR1nWl08jTNN2XAYaeUk3PgxtuAq5n51w8yQzutrg/IPPxlcH5IdDtsA0dHdiOr2jjoWNrZ3mAHaO9xmNLa6QHCrRsEeOhJeIGEQGzXoAyZn8qLYJSYIxRW2AUSOkzkNrl/X4ALOVfoodI6RkAAAAASUVORK5CYII=',
      PxHD: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABbElEQVQoz72QMUtcQRSFzzn3vnm7rUVYWASDIoIoKQKSThD8A9qkEGIhBgSDbbAWRLKLGzeLLoggCBYiBEmakCIp3CIhCC4SJSAoFv6KFDNPlNTmMgwDM2f4vgM89hDAy7kKmYlO+W7r4tXCqOikid5uHL9+M046aaQ1a58I4OjHmFnZVDKVJ0YOv5/Nmkqm3JQ/7189uVwxBSkXw1B1XgCk3NIKAEzBFMQgBgBSJgYxEzMADmBv61p00kUHsL3xizTSBQfQqn+JSIKlgJjF16QDuDuTBkCFAGFJ+uvplKlsyk2lF4PNn3/emvLIOdy79PumLQYpiNnTJ9MCYMyNIe4ApHgdInSkVwHsAHY+dAsGB7C5/o00ISG9f/eREGmk/nW4B10ESEsBKDl0zhejgJQ/61vuXq2nWhUGKjOXtwdS+rHaM6lYvBSkzB5AZ4WDEy4472ptNzqkixYdmrXPqUcKQH1tnxAogvgf8xcdATfXQQipLQAAAABJRU5ErkJggg==',
      KG: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwBAMAAAClLOS0AAAAGFBMVEX///8eHiNTU1V+fX+ioqPExMXv7+/c29wWX3E8AAAA9UlEQVQ4y+2QQW+CMBiGmwnl/KJkV0u77boK8VyNZteFRbySbW7XDcXfr0Waz2D1F/gcaPievLz9YHdu8730zwNAvvuEBjD0zAcARvsrAeNvQFx5xD+uVAhYphfzEC3xX1884MQjc3y8tccMXYQ5onleMsYFOtzufFUjVusCjhdXutAgznaJ9k3PjLtI0ywyELTkz7FngnOemYPudLFkgRjElEQwMvpUYB+KRJibUNivyBmQpob+S/3KAg1ovVNimOaVE9vAHGNCTOR4+ZnOM0PCFg6yp0TxqMhk6UQtEnvrJpFfFeOKEpvVuj3LDbdvvxW70+cAaUsosH/Pi/MAAAAASUVORK5CYII=',
      TIK: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAGFBMVEUAAABuOCWDTzybdmi0mZD28/LOvbbj2ta1/lziAAAAAXRSTlMAQObYZgAAAyxJREFUSMeVlU9z2jAQxT0Fm/OTVHOt1sZcsdKGq+2U5uoaiq82DO2VQGi/frWi7UQEMtM9MML7G3v/vDcK/ifWD49v5lcamL+Zl9pgcTMfabFfJhC7G/mwlPlHDUB014Gj2A8h2hyQV4kVzGNla4y0Jfav8yMzj8DxkUyqXxNhpYsVXExDo5G9ytN30pwWD+IBIOwv85MwB8eHoOTffOYBvfhyVwnOJ3LLL4qbiQeUMugxOwAqKM9f0mMfAHFvuVBryhqbH/fxBcAhkl1PtsPK1jC4BkB96yneyFMJ1YyvAPMNRD4bQLa50H6R5w4XKyzyaQ+k7c5vM9Q4x3Qo3DELysIDAMhTDlU/TZZwRN55SuHGrBzqwBQNmNaifgnYun5UvMGIMlfO+6X0anySWVuyjg6p0QzM/DGEuuiJWImma4gJ2XtdDvGAZMcH2lsSECU6fwri3tW0SVLAEuPIr/Huy+n8KepKMDEZKPu3dU+9ZhI3c0GU2xK2Wlxa6ECfwaE21AVL4NJCodmSAybDpB7ldmUXFhqq4OiIT83UTmTLDvHk30yiHb9DkilGlLY0X/tEPmuSU6UxGVB9yI4aYr4C0vqftSByMFE0WWhmERe5WL4ghvER9u8vk5rZgLIeNmhX2pL+buzDEEysDdWb+9L12xI+VuqvLqcNOLomG9H+Kx/NDz0PIvF3pVo7rdTVbEkLloUKTcYL+KMqyV/gp7SviJxsQs2D+vVnEXHkAKIkom+V5mOlXo5JbB1wMpPDNGiNthJH8VJ2ictLK3gzjVRrUETSM1dROuCEFaCh1iYtxz5QMSCE6sd8ytZEvu4SIt5kn+nuHbl5JL49nzXbrnsi3BvLinpz4d/9CpbISmjuVYtv1PlA+niEoByyPRNJEnhR3uHTEfEQ8UizcJ9p6gNPMy12RxUJGNiIQyp8YBmXVsUbE593Krey9oER+M2ncnxw49Dwe2DfuQW+EyC2d4Pu9X3ibC01E12jrlwIOZDqeAWQVnoRXCXGDTerWq2u32q5eLZaP8atLm7de5LXdNDqjZv1/jmt2LQ3ifSnZq/cDLbXPHgrtnePwX/Gb1nmqAuqwCqnAAAAAElFTkSuQmCC',
      MTV: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABrVBMVEUAAAC5AAC/AAC8AADDAADBAAD/AADVAADRAADNAADMAADJAADCAAC9AADGAADEAADDAADEAADIAAD/AADUAADIAADFAAC9AAC1AACwAACoAACZAADhAADRAADIAADPAADeAADQAAD/AADZAADOAADMAADGAADHAADNAADVAAChAAC4AACnAACcAAC5AAC3AAD/AAC4AACNAACqAAC2AAC/AACoAADMAACxAAC2AAD/AACjAACPAAChAAD/AACxAAC8AACTAACiAACJAACLAACyAADIAACHAADaAACeAACPAACvAADKAACLAACtAACfAACPAACwAACmAACUAACSAAC5AACYAACTAAC4AADYAADKAADKAADoAADtAAD/AAD/AAD/AAD/AADtAAD/AACmAAC3AADMAADJAADEAAC9AAC3AACwAACpAACiAACVAADWAADjAADOAADAAAC9AAC4AAC4AACyAACzAACxAAC3AAD2AAChAACfAACaAACbAACdAACeAACzAACcAACOAACVAACrAACkAACsAACtAACUAACwAACvAACYAACZAACgAABF3XSeAAAAe3RSTlMAFhgiIi0EEhwkKD1cZUg4PD04DAxFcpO71uXbIgsqJRcbEC8vMjY3Mze9XZeDYlwBc8BCFShJBWVbBf2g+QNiXKDT7IJqPHc+3BBsOv1t8KZqh9RlTa4aYQ0rHQsODw4GFh0gq18PS3SQuNTl9/AsCSpBSU9TVldYUhyfbGMXAAAA1klEQVR4nGMAA0YmBgZmIEYAFgYGVhibjZ2Dk4ubh5ePX0BQSJiBQURUTFxCUqq6praurr5BWoZBVk5eQVFJWUVVTV1DU6teG6JNRxdC69XrgygDw0YjYxMGUzNziyZLkICVdXNLqw2DbYudPUTAwKHN0clZs92FwRUiwODW4e7R4NnpxeANFfDp8vXz7w5gYAiECjAEBYeEhoUzMEQAbYmMio6JZbCKi09ITEpOqU9lSEvPyMzKzslt6untrevLy2dgKOAoVC8qLiktKy+vqKxC9jEEAAAB8zELYV8noAAAAABJRU5ErkJggg==',
      ANT: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAQCAMAAAD6fQULAAABblBMVEUAAABirNpkrdtfrthgrtpesNpisdxgrtlgrdg2irBAkLdYp9Njs9xfrdhfrtmAgIA5irA4ia44ia82h60tgKUAbZKAxv9frtlesdw5h7E4ia8ziKo4ia83iK4gdZVhsN1ertpesNtJtts9hqo5ia84iK45ia44h644iq80hqtdrto6i646iq83ia83iK5Vqv9hrtpfrthesds3h685ia84iq84ibA4ibE3ia87ibE3iq83h69frdlfrtlgrNlAgJ83iK44ia82h643irM5ibEwgKR5zv9dst1AgIA5iq84ia84iK40hqthr9terdk7ibE4i7A4ia02h60sfKBisd1gr9t2xPVltN5frtpertlgr9ter9lfrtpfrtpertlhsNtgn99qw/Nis99z0v9gr9tz0/9Gq9tEptRgr9psxvc5jLM9lb86jbQ+mcNDpdJsxfZmu+o4ia9wzv9rxPVrxPRsx/huyft21/9vzP5mu+mzOFNqAAAAYXRSTlMAIhzGaESxhZg9PB18g6ECXl+ctT4HEvhBJPUP+vwYfop3BxV5ctRozKYpOSNd9wOuwzEzwnzEaI8aRoKTpygIPOxCJWxaFR4EWenSdp3FJzec4kZ/QBpt2oe6f6TumioI4ywrxgAAAKlJREFUeJxjAANGJggNAcyJLKwIHlsSezIHjMPJxc2TwsvHD2ILCAoJi4iKiadKADmSaVIM0jKycvIKikoMyiqqAmrqGumaDBmZWgzaWQw62Tm6uXr6BoZGDMYmpmbmFpZW1gw2tnYM9g6OeTJOzi6ubvkF7gwMHoVZnl7ePgy+RX4gG/wDAoOCGUKKS0Kh1oeFR5SWRcIcE1VeURkNd2dMbFw8wtUJUBoAzXQdbDqMcq4AAAAASUVORK5CYII=',
      HUNO: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABRFBMVEUAAAAAs/cAtfgAtPcAtPYAtPMA////gE3gdHridHrkdHrkdHrjdHwAtPUCquvAanPjc3kAtPbhdXsAtPYAtPYAtvkAx/8Als+JZnj/enrnc3njdHrjdHoAtPYASGoAT3fjdHoAtPYATGwATnbjdHoAtPYAtfUAtPkAyf8Al9CLZ3n/enrodHridXrjdHoAtPbjc3kAtfcCquvCanPic3kAtfcAtPgAtPUAtfYAtPUA////n0DhdXvjdHrjdHrkdHric3sAx/8Axf8AxP8Azf//gYT4f4X7gIcAwv8Au/8AwP8Auf0Awf8Aa5okVHPueX75fIHqd37yfILseH/1fYQAvP8Av/8ATnEAUXjxe4HueYAAuPsAWoIAW4LseX/odn3od30Avf8Auv4AbJslVHPweX75fILreH7zfIIAxv//gYX6gIYT1O0uAAAAQXRSTlMAQK3WzYQKCoTN1q1AfuXlflVV260qSfPzSSqt2/NnZ/P0aGj02q8sS/PzSyyv2lJSfOPifD6r1cqBCAiBytWrPsjENTgAAACmSURBVHicYyALMDIxs7CysXNwcnHzgPi8jo5Ozi58/K5ubu7uAgwMgh6eXt4+Xr5+/gGBQcEhQgzCoWEiomLi4RESklLSkVEyDNGeskB9cjGx8kBKIS4eKKAIZCnFxCgDKZW4BAbVxDA1dQ3N8AgtbR3dyCg9Bn2goUkeXskpqWnpGXEhBgwMhpmOTk4uRsZZQGuzTUAOMTUzt7C0sraxtbN3IMtnAHcwH2Ecu0oMAAAAAElFTkSuQmCC',
      BTN: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwBAMAAAClLOS0AAAAJFBMVEUAAAAKfKcLodkJcJcKnNEKlMoKd6AKirsKc5wKhbQJkMQKga5GWjbDAAAAAXRSTlMAQObYZgAAAWJJREFUOMul0D1PwzAQBmCn0JSPJadKUImlsmCnyh9AkbsjlAjBVBbPZcrAAgvK2DVi6YIQmdj957DfxrGtBJbekNzdYzsXs72C8+H+iPP5X3AzCIdCDMP4H7jtH68fJ0VhIJhAzwPYYoRgHq6haTRwf2gOmJQlwG0ZdbBm7LLbYvIs0589LsuNXpXpsCDEcq6hrje7SnTzC7PmVCkDI13OLSCLiH4A9gZyfRIzoFTSnpy1kN+Zd0wEuBL5ElDgKgArHI2Ge7MjKUNomk8LrzjisWla+EJ9UFUdbBnu7tvCtQNc0QvqOE1XSO5xaQ6YlGwYEA6iuv4I4cHcJqBeh4BGH8a2oZQKYGIbF0qVPkQadgkR+fBMdI4k1pB40JURBVsigF1y5sCrYindlkhK+eTlMgnyNmZmFaH/3m1AWZlYEE2ReCPOKsQb4en/bOpFwoYFfRdT21+g7O9JWD8oTYntEb/z/32K0Kt3+AAAAABJRU5ErkJggg==',
      TVV: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAhFBMVEUzMzP////SHALQHQPWGwA6OjpZWVlDQ0P7+/vu7u7ExMSmpqaNjY10dHTNIQj09PTm5uba2tq/v7+zs7OBgYHWfG9tbW1WVlZRUVFISEg9PT3RTDg3Nzfe3t7IyMi3t7eurq6lpaWZmZmQkJB6enppaWnNdWhdXV1cXFw+Pj7OSDTLQy7+dzxoAAAAdklEQVQY063MtxKDQAxFUS3SZlhMMrbBOcP//x8LMxRAQcMp3oxuIdgEt3IaXvq5j05wGObnw12ZcBdy8/CT5j4clZA2Eaq0SallH2Ihv+x6+QuWZcPT8y3nJo7qOtVvf1PQFpWrCofYfBwSECFiMCKCBTYDqzog9gX7o4WyJQAAAABJRU5ErkJggg==',
      NBL: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACVVBMVEUAAABZd6xlhMNLY5JxldtFWoRKY4xAUnwbIjZzmuRwld1zmuRIXotdeLJulNpRbaIfLD95nvNUcalGXY4YHy9ObKdaerlNaZ4mM015oe4xPlpfg8ZDW4phhstEXoxdgMBpj9dvmectP2FcfL8kKDBMaqcsPl9JW5I3SXZVdbRBWohObqg9U4QYJDVqkd9HY5htluk/VYBjjNoAAAB2qf9Ob603S3ZgiNQLDhY4UH8gLED///9rludPZ5dbhNEABQVfgtAwRm5bgs80S3ZVesM5VIUAAAAjHAdUfMobJz8uRXAgME1VgM86VotLb7QZJ0M3TXgzAABOeMgfLk0lOV5QecgvRnVPecgpPGI4WJVHTFdLeNJCaLAfMVNSgdoECBNOes88XZ0MGCpAY6g0UYhDZ61ARFRJdM0tSX4FDhhHc8YvTIQXJkQoPGkqQnExTo01VpMVJkBDbLtgWFA1Wp8SITtSh+gsR30yVJcsSH45YKwtSX4nQHYkPnAIECEvTHs2Xqg0WqAkP3EHBxUtS4chMU4hN2QwVp8kQXkhPHImQ4AnRoMZLFIxUpwdOGgzVaouVaAvV6MqT5UlQ3wnTokXLldyl9yGsf+Nu/98pPKNvf9wlt9xmeV9qf1rkdp4pPlwmeh7qP9YerttmOp1pf9TdrdqlupMa6hVe8Njj+JZgMtags5kkOVGaKhXgNBReMNZhNZJa61Ha7JOd8VWg9lOdsNWgthJbrc/Y6dJcsFIcb8+Yac1WJo3XaU/ablFddE+bMM0Xao6aMAvVZ0wVZ4yXK4wWKYPzCWWAAAAlnRSTlMATczfk1UfRCZ8yGguQrLjURV6TUEamZ5QTHdjgVSxfqHnnUBAf4QcHLtHlpM/jq+N0twmQepB9EeVQAFfn/oyK4SpxGblFyTmQYZQyOJHSKwFilOdcI50ROQyEf2TgkKWryqww1RAQvE2qf5lMzZO5jzSIDBjImjhf4rHNI8+G5uXTSQzPhfh1JSbxF0faR6c8tJMDSzXipEGAAAA/ElEQVR4nGMAA0amacwQFgSwTJ8xk5WNnQPG55zFxc3DwMs3m18AzBecIyQsIiomLiE5d54USEBaRna+nLyC4gIl5YWLVBhU1dQ1Fmtqaevo6ukzGCwxZDBaamxiama+bNlyC0sraxtbBrsV9g6OTitXrV7j7OLq5s7A4LHW08vbZ9369Rt8/Tb6BwQyBG0K3hwSumXr5m1h4dsjIqMYomNi43bEJ+zclZiUnJK6O42BIT0jMys7Jzcvv6CQoWhPMdAdJaUMZeUVe/dVMlTtrwY7taa2rr6hsam55cDBVhC/rf3Q4Y7Oru6e3iN9EM/1T5h49NikyQxTpgI5ANTtTv63v9AJAAAAAElFTkSuQmCC',
      RTF: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAC5VBMVEUAAAAAAAAAAAAAAAAAAAAAAABaWlqurq4AAADy8vIAAAD39/eTk5MAAAD+/v5tbW0AAAAAAAD29vYBAQEAAADPz88AAAAAAAD6+voAAAAAAAAAAAD4+Pj9/f3n5+fQ0NAQEBACAgIBAQEAAAAEBAQCAgLe3t719fUkJCQcHBwAAAAAAAAFBQUAAAD6+vr7+/vp6enr6+sUFBQCAgIAAAAAAACFhYUAAAB/f39QUFArKysiIiIVFRUAAAAAAADy8vLx8fH8/Pzr6+vb29vt7e2YmJhzc3OgoKBAQEA0NDQpKSkMDAzDw8O0tLSurq6bm5sAAAABAQFmZmYAAAAAAAAAAABEREQvLy8AAADx8fHw8PDv7+/i4uLExMS/v7+7u7uqqqqjo6Pg4OCKioqGhobm5uZ9fX1ra2uWlpbi4uLh4eFQUFBHR0fe3t7b29vW1takpKRISEjS0tJKSkoAAACtra0MDAzLy8vGxsYICAhsbGyrq6sAAACampqSkpIoKChRUVFLS0sAAAAEBAQ1NTUHBwcrKysAAAAgICACAgLl5eX4+PjZ2dnq6uru7u7R0dHIyMjy8vKzs7OwsLDv7++dnZ2cnJyampqVlZV9fX3p6eno6Oh2dnampqa0tLRtbW1dXV1YWFh/f38zMzNwcHCYmJiCgoJeXl4rKyt5eXlNTU0iIiIZGRm9vb1TU1NSUlK8vLy6uro9PT1ZWVlra2uoqKhiYmIAAABBQUGWlpZsbGyMjIwMDAx2dnYAAABqamp6enpbW1seHh4AAAA/Pz83NzcAAAD////u7u709PRqampkZGRoaGjs7Ozp6elwcHBtbW319fWrq6vi4uLKysrDw8O6urphYWHk5OTc29uKioqBgYFxcXFLS0vf39/S0tLOzs7CwsK+vr63t7ewsLChoaGbm5t1dXVdXV1TU1P7+/vHx8fFxcWGhoZQUFDg4ODX19enp6elpaWjo6ONjY13d3dYWFjzTMCPAAAAx3RSTlMAmZsFJhLLjwz6q/x2bP7QFqT7ngjtkg71hnIw/fv27remoYIjIPPsuLh+QSwQ/vj317OplY9yaWhQNTIoGxn+/vr38tzc0tHDvLyypJWTfnliX1xZVUVBNvr59/Lq6Ofi4NzZ19DQz8vKyMjGxMG+vri2s7Gwr62rq6CPi4N7b1pVT0tJRjszLhz18/Dv7u7s5OTj4N7e3dzV1NPRz83NzMrCwL26uLSura2tqaShn56bl5WUi4eEf357d3dxbWhlY2FUT0g9zXylugAABBhJREFUSMftk1VUG0EUhmeypGxJu43QEEKBQgJEsbbQInV3d3d3d3d3d3d3t0mTbBJiWKkL1P25s0k2PZyUnvScPvZ7Sc7O/fbO/HcW/AcEk9VjtMGEv9Xy9inNJ044Oa11GtePciLj5uhVFGKQbJnSQQtKhORiSLLDBAlC4V1XdovsjH/rTpe7mnKLEQIwCy8FYlrcSkJo+cDG4ydVmtRk6BohShjXgQAZ0wOLcW4WAYjWCRRtomvFoYTtRwTQBadSw0hENZhHzJJQOpPJFI8Y8N/4Y5kAVOsneVpkrImEuwUcXCxWSVOvqyond0fx9dvOHSSx//iQnRMRGxu7mPf4++MGoQCEpE3u8jLPkdUnCpdXaRsTzGw9c/bRblSEol3a2cTPr/Lo+snJyYohPXR0PQHAtOplsr/NKoXfr4oBLJmnE6l6Ik27DabnObpyTG+Rsg5yC5mH6Pe5D7AgJcEvYsah2kqVfPKD/KeMMFUmE/dfulPkmkCZ0vpXjBBQbC7V4qgB0fOq8vQvGCEMPwprKYAewfDeRwABg1FPgewaz/yaFQB/Kivo9b4CvymKDILneUYLI6jDAvCG1VKPkP3wN0JzFDEWHueZDVjgXNw8PJ2pZTtYShLGCI1GXTlR1D6UcDsAR86ewZz1uy2tCIKjhBajbuuevp0fVagIW3kFo6WEQ2NBb9AlCnNe5WPhAuntYPHtgGPdEQ3HYMGEqOeG11gIDfEKvoeufgp1UUJ4mGcx1Fy/sY7OWUww+sQa3DoObcPX64wr1qgmq9GfOxD3BqG4gxwovuyOVTS0dNcmXsF3cOTcYSh8fzSEqVV5Rj0W4NUTjQQewXdwpCYlCYWPxPViTVV3BxhGSiGUkb4dtBnpd1sMl6BaI0UQwjYE2yEMdBRXbuM5XwtdodkjhKQMq7ukRlaFZXuZ76klGZwiNBro+iIsAG514GZR00cF7OC4UySP8g2O8P5BuF7FBfxmdEGhrVcUFrzwq619+cF7NTICed+Ksp/xBgiglA+47ZOsBWZHhCJ6gbc+rVldW3ZBnvfQmgb0l4+OJ7UbS0mwMDCJLizKe2yK7TvDG/iNcOqZ1foufheb0ozazk81XtTsw9EQM2tRT61Wp/3JmzcHFrFG+xG9I8uXL99dCT2CfMTbF7kPHJFBMnL+aLzmooeiSjvCE7pcGoSpJGIFbrMcvS33SaICdiTlZfGSZ7lyDPAwB7qp4o6NuNLJ6KTtnRpx8PVXQy9iPito25ZlSO0I3MyUvH5peyZsyAklAHmnrIdUNSiJ9H7OfNs7LIhJ4Bch03hfc63UEBHehH+kT6xhf05vivZbAPMHljbpYpU4F3+Z02hdnYjGcAHwm9mC8RUFsCXhv3E/lJkMH/iPVi2VtQF/Bwn+AT8BNTB1nhacDhAAAAAASUVORK5CYII=',
      LST: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAgMAAAAqbBEUAAAACVBMVEUAAAAAAAD///+D3c/SAAAAAXRSTlMAQObYZgAAAKlJREFUKM990rERgzAMBVCnYISk8DQZgQJR0KfxPmwQF9aUkZSzv/8dBwXwsCRzlpJfD5G3Pfo79HRsYwFLyx8roiwOUR6HKItjRAqSZFzI9wqMBVg9HxVyFdm1iap+U24iRZVwDmjH4TglbhdogBWoMxTYrdqAlBliSUABPn0lx69EzuaoBN8n8LKvh/rOhvkMCDfnlgA6+Nv+oI3cYG49hoLHhQeJRuwHxie7qwtJseAAAAAASUVORK5CYII=',
      TL: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABj1BMVEUUJg4TJgwUJw4UHg8TMQ0UHA4JHQJgbVyxt69OXEoIHAMTJg0UJQ4UIw4RZQgPhwYSRgsVIA8HHAI2RzH////z9PMeMBgJHQMVGw8RWwkMygAMzgANsgETLA0VIg8VKA8ADABMW0gsPScABwATFg4RdgcNwQANwgATPQwUHw8UJw4KHgYnOCO2vLS3vbVibl4MEAYOcAQMywANvQATOwwLHwXKzsj+/v5SUE4AYgAMHwbQ1M5WVFMAYQAJHQUuPyq+w73Bxr9uemsNEQcNbwRJWEUsPSYACAASFg0RcgcDFwBWZFIFGQAUGA8QcgcTJw0DGABYZlQ5SjUHGgA1RjAVGA9baFcvQCoACQATFw4RcwcTLw0VGg8UKA5JWETP085mcmIKDgUOcgQMzAANvwANwAAPewYUIg8NIAYTJg7r7Oo6PTUDTAAMzQAM1AAPjQQVHw8EGABHVkPy8/IuPCkIGAMOjQQMxwANxgAMzwAPigUBFgAmOCCCjH+or6ZTYE4UIQ0UIg4RWgkPgQYQdwaTMbSlAAAABnRSTlN+/f39/X4wlRL+AAAA3ElEQVR4nGNgYGRj5+Dk4ubh5eMXEGRiYGASEhYRERUTl5CUkpaRlWNikFdQFBERUVJWUZVWU9fQ1GLQ1tEFCujpGxgaqRmbAAVMzUREzIFCFpZQAStrEXOQgI0tVMDO3gHIdXRydoEKyCu4AgXc3D08oQJaXt5AAWEfXz+ogH9AIFAgKBhNIMQnFCbA7RUGFAiPiIwyUjeOjoll0PKJAwrEJyQmJaekpsmmM8RmZGYBRUSyc3LVjPPyCxiYtAqLioGOLSktK6+orGIGeje2uqa2rp6robGpuYWFFQA5mzPC0wEkIAAAAABJRU5ErkJggg==',
      MTeam:
        ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKHSURBVEhLY5QU4cxnY2XKZmFmZGOgIvj5+983ZibGZkY9dcGPxxb68gHF/jMxMTKCJP/9+0+QDQLY5GD07z//GDT911xl4uZgYQcKgDVQE7CyMDEAQ4WdCcQB2QqjiWXjkkMXA1sA8yaIJpaNSw5DDERgs5kQG5ccuhh9fEBLgDeIPn7+9f/T198Y4sj8P3/+ocjBaBgbaxB9//mXIaXh8F8N/zU7gGl5W2Ldob9AMRQ1959+ZvTP2/1DyWvlCeu4Le8OnnlBfBB1zL3IsP/k8+iPX357AbHPrmPPQptnnge7CARAmSi0eN+rS/ff6b758Mvq0et3ylHl+48/fPYFqgIBsFqw68SzNy/f/1gD5TJ8/PJrw+4TT19CuQxX7rwHiS16/frnXRD/PZDLzMLYt+PoE7A8MsAaBxJC7LxK4twiIDEQkOLlFZYQ4uQHsUHy3Jws///+/S8IloSC/wyMgtxcrMTFQXmSAfuH77/Xyohx60qKcBl/Z/i5tjJFnxOmRlWOj9FcVzRGSpQr3hhYKkiIcNgL8bI3+jvIERcHFnqiDLtnedrwcLOeM9QUOr1rloe9jZEEVJaBgRGod2GbPXtqsPr8i8yMb4OcFQ7snuUhycvNClWBAFiDCMRWV+D/ryLLy+xlK8ugqSiAkhRBmI2F6X9mmAawQGPiqUox+C8mxIHVHKxBhCSGVRyZDwQgDyHrQVUPImgJcAYRlMYqjswHgv9AFrIeFPWjQQQC+IPo18+/v5G9iOxNIIVVHJkPBFiDCGg6sAHA8JtRgI+tXl6Kp5CTnZkdJIkMbj/8+ESAh01EVJiTAyqEAv7++f//4s1394AtEyUWFtSWw5cvf76+/fizEgAAzycMc0THjAAAAABJRU5ErkJggg==',
      IFL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAQCAYAAADu+KTsAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAE1UlEQVQ4jYWVW2xUZRDHf3PO6dlz2m2XUqDlLndCC0EUBASjMYQAESWhfTAKkURIjCZogjceODwY1IgkRmM0IUBiNK4mXhA0NHLRoEAwhksBKbe2W0opvW23u93bGR92C62gfsl5OZnfzHzf/GcG/ucoGApy+8chtf7DWvKM5LnBrHrGQGtBVRDRijd0eEIZZxSTFBeVYvzJLs2nfudN38UMhPi1LMgv116Wrn6m38l9njolRZinNkm8bIfO7w0yW0OEZChxo5xIUQVn24ZLvYAOZC22UgCketIsSZi8qz7NQMI0SEens8Y/zsi0wZNpn9Vx5UzJHv24W+QnURW2YuJJpi3G6uY+nnO26amUsAiTuGETIUCvWlQlXRYG9WZdJcnv6kQ6+hOwAB8gGORYn0+Db9FNANtx+PTcg3Jj4lv6aleW95IuC5MBVvSYbAzt01IV+UIOKQpiG8xNm4xCsAscfhsSZPcIh0YjhLYPp7yzKDunl9jsSzSVzdQfdp4R6UQ9w2IGqiBOihezAVwC4DjU9jwtX0u9CpulFWgFzowP64HrwktRl5Wh09rFLNlf9ZEG/QjTsOnARiXAkMq5XDg8QfryVelUuBjSs+1RYssv075KVXcJWzGokewwT6elDJYX2JwuLGL/UJcPRVC2oKCCpwaeWg01cnV8OdvsQq7EClk2Ti9ObDpFpVpMNx1uuQ57XZcPIudRPDVQFVQNUdVuqap16K3ro2POKLaPQzzfAujNMg8bp7CIz7s2SK2Q11K/qDwU8AmreekRaRtbrzubS3i+hbInRizmsN/I62MqqD2/VjoEtLtfiV6+YdQzBPwR9By/Sd/cOP5UoMFQkIzFSArotm2uiqdCNYNa4vapkSyqRtMUuVwynB/TpMZGnzkysWezfHlhrbRLWA08vQe7RQFcojcNMskY6RCQD2KRwSZNIH/LSvRuB3e6FWAjHA3QfamXzKIKra0C0Brx8cT/N9AnJZCV3BgAQ0ALHK7hYCRtJoIoMwYMhkFhPQMRXarhoZ5IpozoPoj67VxeWqbvPF6qb69UEPSffI0BEMcf7YNTjNVx++alpZzA5mbCZsn6k1rQ/7x5wQjqGbnAnj9G351ylobZj+oup1nmRUpI7PeJVnSSWBEjveB+3RFCcnXOsWET+Sob1rAZI7vYgHgx1l+54GE1m9dJxC3i+3SAqZ9leHZZvQYQ8RHR3Of5Kp6O1u1TbxBf00ZiSYSuGaJKIR0t0Gf6EMvg2w0kqwAQL8/XZNfryYJ1XKlOkpnuEjjWKK+1oNWmxTlUVHngD3bXRQnFAyw+WExwmKaOutxoMbimSTpKi2mYFafzIRCziMDeS2z8ExFN6ftBC6PVxw9lUKeX1ML1+snxg6wc0sdVO8HV0Xs4sjBJ3wwX69wkRn+bq3hlbhH0j7sFTeqeTvFUopyZFN0KQCQL101ocaHVtMhcK6Vw7w3ZVCdKrrqAep4xZos7KkZmWoZs+QRW/XwRfSFDUwgiDtxKuXDiYcZ+c0DW9KIIkt9CAxNQkAkaK++mfVKSyLAMLVYBbbESoo0bmFfvyWOZQYsl72igvCZr/Zhm2udDY9aktXMI6fomeeV6brHcbX8nAb3Tp/nVOFi5Gjbv5hC02kQ9C60278n2C3DA+RutY1ISHJBJiwAAAABJRU5ErkJggg==',
      ULCX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7EAAAOxAGVKw4bAAADRklEQVQ4jV3TTUwcdRiA8ef9z+zODizfXxVKoRhslVRTIkbKpVaNTSs1euhFYzxoPGjqwRhOJmsMBxMRDqYX0oOJ9VATE5uoMW3l0JaC2opiWWJTdGm1UFhYdmfZZXZnXg/Ixef8XH/CfyUSahIJCQE+uqW7/RL7GyLsUtAwZM2NMPd6l6T+/woAqoKInruv8T/SPFofpbPZpfrSOlkXTJOFAr4lLO2rZ+aFJsmpqoiImkRCDSI6tqAtqQwnXEOPV8b+vYB/+sJo78iF0d7FAGmIUWUM++ZWeX58QVtERBMJNYKqnFuhMrnK8c5qagfbyh1vz9o3z14cOciV86+CwMDxz9498V6yQykWFNsSyhW1nH+ribxBRP9e47GIIb6ySfaDpD1/9s7lCNcvvcjwme8YHv+GGxMvjUx/XZwrYYa61wbb4zSl0xxARGX8ru5OexwKAqK2hd4LYFTm3iS/YY3V92uuzMb72akKLKtwyu77ZKCeB+8W2CwGFFttpmwvzwELonEH616BYn8NjYW2R3qNYf1QmokwJCh2P9mvUH1sCevbJeY74+yNCbEM9NhlQ0PBJ3Rs7EAoNzk0uBoEhFLxRL0+A2yiYgFho2va1ktcP1ZHcaNEzWyaGjtdpNTXTG00xL6RIbNlEEQkNCY0pZKNhlYYcdRoYLIhJmbjzqyyVA7ZrIlSazIey60ulY/vCttf66Dp6FenH8bfIq9UMTmxxeUfSh7E8f3wyBcfP30whh2J4Lo2pZghZY50sPB9ir8+nDGzXT4eUxd72Srky2Dj5UK8nJaUCIV8kZnJvpfjOL6FE7MR12LenGyVxeYoKw0O7k0fxct5/Hg1GhMs6hoqaGx0VKhk+opLNpdNKtG0h1G4/0aXLNuoSuMKv2QztM/5RI9WVCi/zZ5JHR6s3R+viaMaLvtsNt7+M4sTe+rnEpG6CMFDlSRBRXZgjC1oCz7PvpO66gy1DvyaDjDPVRENQuzJAlpliA0v/7Tn0z19ywrXTnXLiqqKbFvahvH5La2+VqZnr0VEBeOHWGGI5RjsEHQRVg/XkTzZLN4OQBtgB8Yr3ZJVmP7yjj6QLtGWL1MnBssRvCqX20Pt8o+AJhJqErLN+V9lAIdSSyRDdQAAAABJRU5ErkJggg==',
      RED: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAABYlAAAWJQFJUiTwAAACF0lEQVQ4jZWSzUtUYRTGf+d+6TDKRDnUItq0aNEqWrRoo4sWbUKFEdxHQf9ArWoWbtq60vZFCSG0CwOToIwUEWQoUYQoaZww547OOOq9T4t7ZxoMiZ7N+573POfjec+BDkhy+AeOc7wOh5lZDLC9rVHgpudx3gwdHPDVjJnxcZ6bWZxyBWAAxaKcYtHicllnPY9pM7JHRzwLApYAHR5y2YxRM5AY7uuz75IcM4uRZJJsY0PdW1t6V6lo8qT2KxU9Lpc1v7ysbCvOAVwzk8TtRoNmPm93U6enQiFQoRBIciU5+bzdbzb5kTvNvVSC2+5gfV2vSyXdkGSzs/KOV5+akivJVj7r+uqa3rRsx8z09gMXd2pkymWWAKe/nwhAMCgYBBgZIQac/V1WajX8cxe4ZGZppSZe02ViYMB+tqeSBL4EJBg27JUZEVB9/1ETLZ4DMDfHmhm1zU2NKdQtAIKgNW8jyLgACo+GGg2N9fay//ABq219M3O6srikb2EoVXf0FKAoeYIhweCdBfkA9bpeSFLpi37Nz+tqe5G6AwIz9vb2CDMZqgCPkiWZBlgA/0mipVqtcugYu76P35YgIQlHwgfcjn9w1WGnPj/lqp0gJcdARHKm4okseWvhL44DEMU4QK6rix6JHk6AGT25HK7gVBQlsR5AI6SU7Way2eRaNsvCn6YS1GrJPY75VK9zRjGLYUjppEL/hd9J+SWd+NGkdgAAAABJRU5ErkJggg==',
      OPS: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAACXBIWXMAABYlAAAWJQFJUiTwAAAA60lEQVQokY3Qu06bURCF0bXNb6xgJbiwokQJFZEoUuYteGBqHgCqVPQE5AKEAHGxSSbNGOhgyjlzvn3hnVNVgbxajLCFOb5hG39xhpMky6pK+niCr/iOn5hi2awxFjhIcpWq2sBOk3+gcIyrVpr3+xkOh15+auoDjpKctvJTA57wEXsDvrzKssD5OiBu29IK15gNHTS4a4XnIpr+AQNuYITLlpu09DRJJaku4nN/vMdiwEnb2sUGUlVjzPCrFa/b3vm61hn2m7ZqO5tt8zdOsUjymKpKkqqqTey1jVFT/+ACd0n+vSR7aeXN+Q8e8lc4WzpijAAAAABJRU5ErkJggg==',
      AR: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wDGua9Vp2Mm3b1kJd29diTdu3Yk3aRqJd2bc0a8////AOTf2iakbCzXt3Ql3b52Jd25ViXdoVAq1+bj4B////8A9fX1CcXAwEHSSA/y/XQA//mHAP+ikH2G4ODhH////wD9/f0Bzs3NMrl0I97+dgD/zVsn3M3KyDj///8A////AP///wD///8AuIZ2jv5iAP/1hgD/tKmdZf///wD///8A////AN7Z1CvgeQH/+1cA/8GekXH///8A////AP///wD///8A////AODe4iLTXg7384UA/8/Fukj///8A////AP///wC+mW2T/nYA/89LFu7s6+oV////AP///wD///8A////AP///wD///8AwYE9xvOFAf/Sx7xG18i3ScCLSrm4gkS/43sF+v1YAP/FinWR////AP///wD///8A////AP///wD///8A////AMGHQsD0hgD/yb6zUO7r6BfNv65VrI1pm8ttBP/+egD/xayRdP///wD///8A////AP///wD///8A////AP///wDBh0LA8oUB/4dpaK7///8A////AMGTioG8PQT/5IAC/9t8DfLq6OYZ////AP///wD///8A////AP///wD///8AwYdDwPCEAf+YRBP25uTpHPPz9ArIVCjd5UcD/7lnBv/yhAH/urWwVP///wD///8A////AP///wD///8A////AMKJRMHyhQH/qT4K/8idkXfLt7JU8kgB/6U0Cv/IbwX/8IIB/8O/uUr///8A////AP///wD///8A////AP///wDHhzvJ94cA/1UnFf+/UCngt2RKwvpIAf9kLhH/84UB/9l9E+7v7ewT////AP///wD///8A////AOXh3SO0g0TCz3cM9uJ8A/+2Zgj/1WwF/9VtBf/jcQP/1HYE/8l7H+Pby7lI////AP///wD///8A////AP///wD7+/sD4NzYKuPg3CXk4d4j4+DcJrGMgo3GRgj/o3xwoOTh3ST29vUK////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wDm4+cd+7WZZevl5R7///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AADAwQAA4eMAAOPnAADzxwAA8wcAAPOPAADxhwAA8YcAAPGHAADwBwAA4A8AAP4/AAD//wAA//8AAA==',
      OTW: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7EAAAOxAGVKw4bAAACTUlEQVQ4jZ2Tz0tUURTHv+fe994wmqOlY2G2EUMmiUrGTEPKhUG1auOmNhmEi1b9A43bSAiCalO0ajEI0SJL+uEsWpSoBDUbQZRGpHJqbBpnnPfm3W+LGQcjDOm7OnDP+d7zuXwvsEWcmbGrNeMa/yOSVnaZjTvtt0iKiJALC/WoC/bmimir218Kk+k40DgPQESktJ2BqlaJcYPMyjXXR7SIbK0LXICLyOYl224gIqxs8YuZ9LiyMBBYLTVjOfVDupo+VbC2NagekJREAjp6An27xL+EwnqzaQi91SK3ygajglEANyqDEjN/OJEUkpL3eH3N5V3P8DtJFlxe/ucjVoaViBiX7BaiwwE+CjAP4LijESIgmH5xCKWkg40lg+AxLb3Dc4zHtdrqZgMpJUg5FoZ8gzQApbzsMwEIvhqG9/wOVPA1nMgIAKA7bKsyjxiSTQC+Ov7Px75BSoAakEkEQp85cTGEvT151LStAO4crNYHAIAllDYRIsbgnOehCFXveQbftCCojIxZlriMx32sJgvI5oIoJG7K6dvvGYOSgYHSJsIXrWUskMUjQ6wJ0eQbfNB69iWnpiwUr/TAXu9HS+dBbKSHOHmmDzGShFKVDGRI7kEYlqORI2DbCu9Eoh7qcg5q9lloHxnDgfMdqD8cxrpDTCU0RgEkmXRICn3/HskiyUVjOE5jZmnMG2YWGwCATyODnL76kJNd9/mk82gZHaqaMpK76TLKfL6VZC3JFpJHSNqMxRQn+k/xLAKcaA9w8uQgSeGWIO5Q/OuL/wY6nDtmJZCTKgAAAABJRU5ErkJggg==',
      DP: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAEzklEQVQ4jSXRS29cVwHA8f953HPvnbkezzghbghpQpSI1qVEUUElZGMJlAipbLpBfIGKTRdISGz7HVC7QIgNC4TyEUCqKioKQqZ5KA+nqeO4duz4Mc6MZ+4999zzYMHvK/zEX1L3E4+2MzpdIV8bwrJAFDPCZEhacXDSIl70EMsLyDc0SZ6QXhaIMxUMQQLIRPQR4SIk3ZLaDOKALCS8jYiTHPIcGT1iK0HMCMZAZSAKIgIlSkQlcSogEkgvETGSEohOJrLM05m6gwKdB8hrwrSFWkOm8cOMOAC8JGUJaTLkNzaIP+8c5HcIZqJIFaRMk7KCONSOLhVAkZE8wQvCrEAVmrggScsCOW8JFlAO4jyov96/w78+NYQfH/JocZneW1eyd09l3FQEE6CTfbJYktFCSqimRBmIo46gPHKWkFKi8gBxf6b+dOsT/maHlLeW6O+fZzc/y9E/7/PZ5jZ/tEHtBEKhpafXaqID2wOZwCSICUKC6CHvnH46fsHGfzdZ/81P6TfPibMBeTvAfHGX/V+v8quEvxTRrwRqSSuN9HiC0wmDcQRvUAc5DDx6d/KC8fgr9vI+5uKQK53nORWmcSzrTdKbb9P3dDc0YpDobACvwaNAdgYiQSRILX4kyJ9sfcmTMCa0I76bGt7UlokrGacCnec8v7/D9OZZbnTEDvR+JElJ6mkPRPAlJIESEHDkXz/8B+sjRXBDVLQcILnXWEpXkIzl8GBOWl0F8O9GpPXEmEAKVNQtxICuNciAn7czs7n7JcfnElpKcj9HzCLiKGN7r087KtC6RczvMF25zg1HGkhS3f3/IWWkTIO2DXiH8wuH5snhXeLiAn5LUR8fwyXg4RnyMKQ7rgiLY+RWj+5n73Pa0f4wIMYKjADRgZ1ALVtwAtrdXbP/2b+xn1c0245Ye9LaBt1t4O4PmD/bwY52UHVBuL2Off001yJCR0TtSfMIrSU5R7Ba4hqLadV/aAtg+gC+vkR3sAt8GyYXsT9/CnuGonLEP3xB88lNvuPozgnUHqAElAoaSaIDp7/Bhllt7AZw/jVM2cMfQNi+RmcLJCDXx8j5BeLtT2k/fo/lpTK805BeTfGzBMEgqiXoCaS0JK8n40Hz6Bn142/hNwvivSM8mnDxMjruIuQm6eg6CbAfXaM8U4arJwSnSM7hnQfZoU8qhDrBTccQ5fxzJtk+9vr12+7eVZq3LpB+u0q+uUbozQlvf4/sEqTfgXj9cnfZ4luBHEvUrCSvDcoOUMGR5pCfLJJb8dGDZB6sEDbWkL98g1Nn+vRbXOZqM/1wk8Pfr9hzAwrXQSOwK5KiLUBO6IIgi4JOZWQq0MUMOgFKfJBSxhrceGdnYMmGBicTCwGaYp98drYZhbx8dvolw+MRDCSqhMa2CJmTxROErslijxQExI5OiY/TfiXYyypSlrCh4thMEBoKloDA91PHOK85dln9I1/1nvZyJkicaNmm4YJsySkRoqUfJE7oAzYknAqPOApXifoY2gGTtiJ4xWHYZJr+vv1eKh4ilSF8sFq8kpCNeGw8aE+tBdJEnrWW3BtGUXyYvhqcQsstqnCFXf2KfvwFXYR1jnhMy54vWRRrXIgrPNc5pVihFNuclyW3qoDLAwfTwKJqmIQBL+3/ALtjmey2suzAAAAAAElFTkSuQmCC',
      YUS: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAMFBMVEUAAAAKCxnyBwhxBhSwBxJd+PsWLUo/zuYIiN46obvq9PQHU5g2XnLtLETle4iRnaRqUG26AAAAAXRSTlMAQObYZgAAA0RJREFUSMfd1M1r1EAYBvABLVX08polohas0z15ELIJIohgk7lWvIxxqyDxY61WlD3UtSCeFEfw4Iq1rngR/IAB9SK2ZU+rtkqpCm1PYgpST4VWvHgo0vWdJNvOLvkH9DkNmd/O+2wSQv6RbKyo3InWJS2rF3kcbcn9xAxGIF9QGVfL44W1AKZCoqsmLs2zhwlpKwImgNV8TkC9Xv/VoUBtZ72+YsGFSpTf0JOAOSmfwQAhPkxKOQ9feJTeeXATkPsqX8E4rmBZvrAuyRicyCbAN0/SBRlsPdxWNKWcMXtl/C/uNQCvnaa7JZbACnjAefn0gVB53QBtZaB7VAkfzssf5rK8IqJcb4D2I+BSVUJVmNkmn4sWQPKQi0oUQb7sPoMH3GYq4SrgQSYqUe7ACkNcCJdmXUqpAkkJA0s8Btgun2ATcZ1mPQePWANYgr38CTC5NGPyo+JtFpIgSEo4bGEpgJUlrwPBdHcrGIAMO7RU61gMY2AZLmOebVsN0FYzWM/i953hLIIrYhpyZL1LVRqgCIwtfrsYASHuImjJcSwRzn0KWZfpi9I1MGxGD+rAB5wRhiH+9QeixGsAYLidGsAS3oEwnKZd0CeGeH5qIkChgzLYjgK7YJ+4xTH+BBjaEe2XwbZ7QkotsEV1iKvUmqrmsdcBBDi7r1qtVEqc5yGjHVEKDNvBCgj2VlXGOC8C1WbUcIaqgDNiMcLz+oyNZQQuVvBw1t5+JQZ4sEWbcRUMBJDJAkpbnXKDlw0NVGKQ67RQOMzbXx3xL0NWKxHEgKxXAjM6hoCmAOJZgHE+Cv8quPrNbgDC7BiUUoFnk3WMeZD5IIbv6aA9BoZtq8e8rtsYHhxVoLUDgOGod8kyS4Oj71PAhQlQyIJt/Fh1NgWc6/0TKGIO8fv9aaDv4dP8o6mpqWHuFwpdKfdhx02e5FjhdBd0ak8rASLZx09fbpeRAkbx4zWM39A3hQK1MmkAd+KczDa9cxti0F+Ngvun8O1x00Dye4dSfK1TwCl80g5TN7Mbci2AISiobcZw3wODkiaQwesAdhILwO1sBgZeBi04QM+mAJpiuJSkAYdh8ChsQZqz+V20Rz0sSTEHSWsUcGmW/J/5C0x5gAjJEKFdAAAAAElFTkSuQmCC',
      LDU: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAfAgMAAAD7OCcfAAAADFBMVEUOFQiu2Bk5SQx8nBS983KFAAAAT0lEQVQY02MgE2gxMK1qADGmNnCGHlgAY9yAMOIb7kAYEQzXMBjXqc0IAzJMEzgjuEEM1fif4V9jgAze0MrQ0AoggxnEeAB29KJVq4jzHgDikTAb4Q/EagAAAABJRU5ErkJggg==',
      RAS: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAA+CAMAAABEH1h2AAAC91BMVEUAAADz9//y9P////j6/f/M1///wJfl6//Z4f8JEP8NDv/5+//8/v/09v/s8f+Fof8DHf////nv9P/Ezv/4+//09v/o7//f6P8JFv////n+//rl6//X4P+twf+XrP9upv////r+//77/f/V3f+0wP/S2PjZ4P9Uef////v///j+//78/v/3+v/7+/7w9P/Ez/+1xf/+//3///r+/v/9//7u8v/d5P/n7f+8zf+1wf/4/P/+//7y9f/s7//i6v/r7//l6f/Q2v+1v/+frf8oV/////z3+f/z9v/s8P/c4//S3v9oiv9Qd/9jlP////f///r+//77/f/j6v/L1f/b4P+Nn/99mf9qi//y9//8/f/v9f/s8P/m7f/3+P/s7//m6f+etv9jhP++yv6Sz//7/P7L1v/O1v/+//v+//v/KzL9/v/S3P+90f/Z3v8tW////vT//vz/EBb+/vzh5//3+f/f5f9EaP////f5+P7W4//Y4f/y9v/u8f/H0f9+pf9Wgf8HK/+Szf8Klv/q7f/E2f++zf////0Flf/9/v7L2f+xyP8IKf+nrv//zRPp6/9Bkv/wo/7/cif9//+u3v9tu///6+UEjf/o8//i6v75+Pb/hYP/3M//Z2T/1Sb/WFLq9P+53v/9/Pr7/P307f7N0f+in///mJb/gyX/c33/VVf/HCD/QzL/HSIAgf/26/8Vn//A/7rV6f/P4f/V6P8SiP9xhP/z9/H/tbL/bWz/jov/biT/tbao2v//Fxz/IC1Kp//M6P//8Cz/5Tr++fzy/1dXo//88vv/ecPYhf/3/v//dRr/6Nz/jIz/NDccnf/v9v8Ql///Lk3/srTx9vv/3tP/3l7/7On/iiX/3tn/oaL/74x1yv/U6f//3tb/dHz/y8nY/7f/t7zT/5oKlP//+TuTqv//GmnG7f//7Kj/6On/z9f/4lE1oP//8BNatf//zdH/+SL/iZ7/7EiVwf//8Ej/ydz//4T///////r/zQD/wQD/ysP/2ABdL+dsAAAA93RSTlMAf2zenkkFXVkLB6Wrg2UqEvJzPJyMdFUP9tFrRz4uBr+vlkMxB04g7OTHtZOJekY45svCp2hcUT4lsZ+TeGdeWEwsKRjfhnVwUlEjGgz81c6+Yk9KJCAcm42IhXBjYU41Ewu6dEA3xLi3gFhNPx/z2MGlcW9kFul7aGFcVjQxKBmynoBWQvqrkmBGIx/nRjAn69LSs5eVkDci5eTk07+oqJpWSCsa6+Xh19LRx768pI+Dem5ULxj08urQyLm5n42MZV5NQj47Ox7+8uLGxL27fGolEfPw4N3b2NXSxcS6t6qmnGpLRDHvzMizrZ6dm4qHhnx4Y186/qwOTgAAC6ZJREFUSMell2VwHGUYgHdPeu6uOcu5u7vH3ZUYceKetJEmIRQolLa4u7u7u7u7O+whP0iBXBtgmGF4fu3OzrOv7Dfffi/wf8ltLcgB/o0dwD+SU9D6h98Sbcn5R+c5IOwCcv7xFQVj0ZbcreuosOVv7o3nWku1MBB06O57DvgrEWG0AMgSpcE2gCNova9bpBKDtCIJXtQBik34kQPb7A6q7Mh4BZEJLzZ792CNCGGxNAZQBphfT+0jNhG7cFpr20Fgiw16Q+TIcnPyGmKlfxZ4cBVX6gL1Qdgkr7kkxcSXl4BEebzBxbR6HvyzNK1ZXrmtixXTg3DX7363StfRgSCgWHw3PqyMmTpplOIEMUUnzEo9K/gbD9l8iqh8Y8eROsmxChe5gOfu6+LAYDh90uEUeDlDYVyipibF4bhtLDmT4JmOm5TnAkAf3Nwmrcg9Up+TTg8ViRr64hoYsbadWSkzjtDV+w4kUzxYuYXrRqCa55iuuhSIazuYMBfrzpVGgCNpRjY1eGKZLkJpu/t8/DWVLBtTP9EmU/Nquw7ULdbFa1B57im7W8iLWzLjkmm5NLxNd5XxWQ1WNbywqFTfqxEuEddgMD2RpFRROmX6Rb2PBxomq6U1oxQOt9Pa4JDKL9i+iHqQcvkMwWquIUhKta7SIM8ecETmcfoaCTmEorZVUwMC3B71KE40NDHtkKZCwHbC1xmQ5SiYnt9dQy2l2cucQkMquZZc8sN6eCm+SxpobK6zWUtnCPWoJnnIf8Ff9Nbe65Ch3nJHRyNpVBAJsXRmOEPj61ysFjMQ2pha7+CTp6QG1AFWiF8+kzwf+AsHR5zMYAjZHpncgzTGh6jdA0UCKtHcOdjlQzs4KlgNXGIwoKZcUmk5kdp+I/BXRJLlUl5PiNRznlEOImgjcDjYHUgkahLDBLoSzg8OSELLe9JhB6q+VO75i54LHPT48DB5Ck1jIQUdSVGDo8MVVUSvRaKZ2Mp8Fz+4OhA0GsrL+2YcTVR8Ses2ubIqPyKNChmIbpgRJV1vTIQ7/F51nbVbsDZJq0F4S/aPug7EWTTanvbrwLMmHj7h4Qse3qjcsdU2hYLNUDrYbCFrEd8esJPIZDnd4nZ7VHaak6dCWDXFq31ktjEUWHrjppNOfuWOow9xQs6WXlWFoUMOdmWUjCV4z5slLYfzK9gV4abgTKjUjt4TqRyryO8wRmbPpT9xyVEnX3jM5cdsktVzqyox2kN6VVXV2AwelQr0oXwuYj2GXWHuUmDGwJDLG6ARZXrvbRffdPvJv5x6y6mbnABsgTYNjnNU8E2KTBMjNurIHgJc5GWWdqQ547T2teHqIngbnwiD2b47auddd+086hA7SVm9dIVC4VD+IKaHwTwRryqjNBU3IU3c2eSgkpPh6mSIxkbd2TsP63PZzleEL9BCqJZKUqTKiECfK9azqXsLM6aRhuJCjiWgU2Y4ahiWrh1FvnjL78lfeMstF16YTb5Vkb9Ze7oxNYaZRfgDE27+bAW1JIYIayxQphhH0wy6bZWzTeJhh//xm486+eWjj9nWuhxFFaYuJm3qSkww0EifZjY5M9YxkuBXVGBq6wFZZVOCaKyaJrZrhpd7zznr7rPO3P7hcuePP/7gwWP77wY7ymYY1lmhtUFWQXMumukoNtmOs/BmaXkdIwgFf2i0L3xg3w8V8zfccMN8Xu7WX+H63Vcdd8bJu3ef/DrMEAhjmPhgGZs1qKJwxH1SMcdkUjvJTUQxa0yGCicfufni1z7ftWvXKcfv2Ka/fvbOs/fXBc5rMlq7m2iowoFOq07qOp9fg7NQlCGDXMugjZaPwM667banjjrlqm36FbuPO+PJs8sE6D3TbaipoT4XjNvp0TW0ay2WuAGm86gtUxXBs2ZsvNB5fQ9Mnr171+7du7J6zoF33z3uuKvffvXjmnarPGILCoc1eF23o0ouITAktMpgYsKKs8smRyONeKPmtpsGrzxEM/AnmHt//ennn3/66ecXfJKavqkeQX01gkHtmyVV5OePjSkqZU4/QeKd/KCHyFqtBm++/PSbT9/k8IdzXn31ZvSr3963v22EJiXU1YJJfnl8Bt1WSgAD/rKZWiffNqHbt68dmWTc/c6FH510iGbgcO1XnHHGFVfsjNuEVFZDWGY0yho1YpaGQe9UM3D4lBrRQ2qWCWXEYL3Ly3v5tVN2nXLKka178lDrbm+jomBErQcVSfGZQyodSmktGigUaeD8IZXEb0CSGq2E+oZGkHDSrl1XXXW4dbkPPP30Zy+cfR/K654GS2BOYgBN53YG6gfHVQMDgzGuncrt9Pb40+sJdTKpWSy13f7l0++9N5/dbRaazrlmsol69856lnoCybI5vfDxVWmTOoYb4Io5HmRKYhpcNFDXDfQSad01dfbzYN3nhBW5W/r8PLqhwYfuvxZZjUvbg8JJEyTmo1Z5DLBIvErgxe0hM7S3F2lPL+31E5Hn25j1TGl+dtEWPHT0naI37rzzjsfXzUYU38ATF4nKqQ5GbeMEoZsxSvChmWXFg4ipZbSAiu+9+Nb3F6rIZMUR+qVPZJ6//LJL37yOnj8tnNKaxdNGdwleUM5AEcC0vKTEK6wXWRaXZawI/tqLH/3+2EMoDuuXH0057Y47jnnzGtAXEhg9EhtJ4C6ODS+nuuIspERpoefJknitcA+xlrn/4ke//vH+TTayp5vzTjttZeC00057DDb8mHwJOUIVoFmIve61Sk0wgahKFFsYqXKnnroeaty3Vnf6ZS9dtMlLzwJbnPvII9DvtJVD56yjicgeSRAsRnwQIeIR5c1lIpFvlN7e00OU6b7q3XfZZSf+zpbe2vLQJWdmHjtzk7ceeOvx/cggCTnECnTFj7UzWG1g4/wQfopJlwmWGrsTugdevfWiL+6955577m3581SZq1B8+EzR85deevkxlyxee8krS80eNJgWeAjCOPqs2kDN/DmrzUxUQkvywWRt135766P3HnvsAplMatlqXd01zVUPPnPnE5ddesmnL74zVw/WptHzPi8t7psjeahICWrOLteBa80Mt+6Ge0689X32WFWwhAVsMQxBxXMLcw9/+Mw3n0hYIBXDrOsVOKvLUNWGNm27Xy/gI3W0sbh/GnGO4sZn8/p9lrAfqtiyscOUelMnFr23+vgFAdreiyFjeMOC5uU6Qc9S2XpZ7RxNqudjydF0ykmKTj5FyMFBLCSFlI3OK8TWjrORECWvim6qzlvk8YVyY3Shd3JOQUqj+xcUNKeizB5FP0WvwAxBDACEEHLOYV1fiAVV2CRHKURCuJUhNZTJyHDFdowzbZD3eTV7EfTiDYokDakhEBCviIE4FCNShFm9FsIVwwEP11RWtoIlcDcQXJ5RAxEAT0yr6nYXlvjoRViVTcsFumBs7t4iAKEyIVRz2dpHOTEo6DKBZr0RqsUYMbhiLKlIiQdEeAzchlHyAJyZrUwyuFhMfjO8jtMu6sIr4cKsXj/ez9XlcySWIrIfEkcxOC5GoMLDAU0sTM7rV/oAHJetZNLNjhJYYoAHpRkaGwQnZXX/ABnfpRjPQGIFhqa0AmI4VgvvWUF2xFaI5DwKE6s2s8epdLUMsqGhQijEKBFyVId1XGHUjaMNCLTqMjEg4W4GA/avlGTQ2P5qCL3AYQLVXPZ4/X41ALeBxQ/CmYQirNnk3Nrq8tO1ETwOLGSjC+0QWswF6GYAYbIU9jKXyZThBWUSqO4EVEyv+fxCmAgBFIkQ4jyDML9ga58HMBi36PwpUroEhchkdICGi4WDAJzXJRIWXkce9wN0igRC+6GMGWnR500tk8j5mO2TVzp2AcBmkxX9hqX+vGpc76CvBW7lFXIozuYMAePsjDGi0aW1PEWUPIb9p8lwtHajoLUVyAWwLfnshRvySPOGsv7e4XWyYG29f6G/n5y/GbEgN2v+lQs2Wlq3ktkB5OQUYLEtm/m0YLDYgs05NRf475Pqjtwd2Sf/yG9ttZDzYm+z/gAAAABJRU5ErkJggg==',
      SP: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAw1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQ+P/M8f/L7/+73f4aHyUOFBvW/v/X/P/U+//C5/+/5v/A4/+32/+20/GmyvCsyumTsdNre4pdboA/T2E0OTwsMTcgKTQsLzIcJjEWFhTS+f/O8//H7f/J7P/E6f+84P+11vi01fWrz/Ww0O+jxOeXttiGpsqBoMGSqLx9m7yLorl5kq1vg5ljfJlvf49AVGpWYGg3R1lAR04nMT0vMzcLDxQEBwsMCwoHCAnmygrtAAAAB3RSTlMA5bJ+ciy5LvMwCgAAAK9JREFUGNNlT9UOw0AMO2ibK4zKvHbMzPz/X7XrdZsqzQ+RE8uKjQrIlGBMqIw+kECgZkjlrpT72VQPSkW/u1qrn0vcD/ACuG5b3VHPeYKMaDYb7/w620S2lwBQRJYdS50GBtTYiTsJwuvmQGtzGtVjPjHCxtzTdX7Zq7k4ED7TYeMCCweEhYpMbiOcrApG+dsCD59Z+o0T+RvsyGwWAEi/6JnZ1GJQKuXSMBH6X/03UswNMDkCCoYAAAAASUVORK5CYII=',
      HHD: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAALVBMVEUAAACBIbd6fGrtFIPRH4iuHKHu8+5eYIkaPx1uOKuhXGvDPHOPPpHI1MmhoaHlI8cQAAAAAXRSTlMAQObYZgAAAvhJREFUSMfNkb9P20AUxx9X6qgBKpwl8naYRPxou3CZyBJhT7BUqFaXDBVDygJKMhSxWR0qj2FC2SKgCywVYSJLKsHWAXVAWSpVHSqW9m/gvfP5zk7+AZ4c5967z33f953hiUSuewyTsaSrzLbtzsT+C6wW4uWU024VJ4Ajp31oc7lsdSBnT7S1mwjNxywu7W53rEORtIsxwPGXtXFw0CqQjBMDHfTZbjkZg868ARaKsOJQUw20nO6RBoh3bExJ1Bg0HuiA7UguARYcgriagsKVb5JhaoGbRffQdFUXdmijuyZKqZs018easqSiIAsrtK+7FuT+MfZdOiJgygydtGe2wxPPHTW06W5TmSfpd9sMTUEZHhkaR9hkFiFTQL3Z92OKqQMwWweY8FTe1plem3hez5y6HcKPLMACjo9OcRnoRJ/BR0UOxdh4j20ov1Xr7ABwp3wjo2mFWr/p/VGZAKY9oNatBJbpvat96fg6pPQDWBz2ELhvNBrSpXHcYwGdtJqwH8KIfXpo30M5DXBWl0AIOwiAFaEdMwO1yyMwioG5B/xXwKo7CYAVA00cLR8EPQm8hhi4vyNgj4C9EIFyPUiugtWtBsZ/ev0MrdDaDctBEAz1B8Mp3oyif5//7ERfllGhEQEBPK8BH9DcrxB2Q5zV+jsK4ezSvdkub4KKdxzN7SMgHe5HVIFp368lwM0wBcxFpMmBXW1BEqUaAjkCXoYA+OTlnonpTYjo/0EXNrJA3odsnNXGCv63TMr83hhQ2sy29HUL3YOn0ytf5SYyR2Y8V+e6qddLJWtQSkuwc77o96u6cupxYGmJvqj4tbxIiJLYoHeFa8tiy/OpXj3BzL0S61JWrGnFNZipyJOo5ItEabFyca069BCn4qonkLnE1YAkMIvv0+Pxj/Rdl5OmkMrrp7IZ0ICosGWmoPakPFPVHgR2qZzEKn2hDibAM3HtYekV9r8+v+gLtQ+n1X68YmitpzxSXOrxhfrG+YGqrQ4GgxNzxTjm04hH8MDJxzSNwlIAAAAASUVORK5CYII=',
      LUME: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAALVBMVEUAAACMoL5GUF9qeI4NDxEjKC8xOEN3iaKEl7NdaX0ZHiOKpsA8RVJRXGyYqMIaQNTeAAAAAXRSTlMAQObYZgAAAdRJREFUSMe9lLFKA0EQhldzRgwRHM8zxkBQsbBMiK1wwVKQCB5iqhxYi7EQ7AzYKAjxDSxtr04TO9PFwgcI+CDC7t7O7sydlWSaY2a/3f33n90T/xxe1I3O/xieAPgA91c54+U+SADgLm9cAnlEqQ8IwCEHDsAGtnpsAVBR0d81CkzAjVuyxCokhNh0gWtgxJtj0QBYPNrACgDUZbnVT4F1G2jr4ktPeJegTxpawKuqPcnasSZ2LAl6zlilHyp9sNqgKts6LbKDLhN7P2VeRWBBuWzyU5KLd1nYEMLZo47HiGWhgTOUGR2T78rcas8XBaj5cSYgMM6ygBpfgWw5ztaA3t4gMFAA2TIgPkBInKyi9dTJApkR6wl0yWGaN1Vz2ZUMkFei6bGquCOxXpyYm44SKqFgKhuml3ir8VImqYii8y5Q9wzANy6MAKYO0K7LW9lJJYwS/SzwaUlgaCQkWgLpV2Ak1HSnyJ3xTSOAAm1TjvFlEhHKXo+4gE5oEWXqgtvBZ7GogCkDvD079gWLJbAj4IA3Iz+oHBH078KdIC5wJ9AFJoIcgkehlcYRG8Pno3uWvQKRwKJkgB86hP9b3gjuBLrA2xFFTYDvqCvy4wL8UMw7fgFb2GyDX2EY5AAAAABJRU5ErkJggg==',
      RMC: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAAApCAMAAABk6QUbAAAC8VBMVEUAAAADAgMHBQogBDocCDkjCTsRDxkqOGEkIE0QCBYNCBFcPo0nLVomBkAZCR5COXpJDVYqCEYeDz4b58kx3sd2PaxJQp5FInxIEnIsQWdSDGIUBx48QYw6PXo6THJFD2orIVU6JlE6CVAiF0QrFD0eCScsJiXmCepzMdhVQrNtQKRIPn91DnxcH3toE3FeDmwyNWlGFGI8C1wfBzbXF+jcCd91HtgmxbiAPriODrY/oJ9VXZxVU49OQIxuWnxlDHFVIHBHT21fDmI9LVUwDFEuFEYzH0QwCjkhGDImCC4iEyuJEOLNE+GBOdxpQdGKfckj4MZjQsaYOMRdUbeKPbZ6frMvuLJxLZlKj5g+iJSIdJR2YIU4RH84UnxpC3tNEHg7L3dnT3ZHKnMsVG8uO21SEGcvLWQ9EEHuBO/EguiqROOSL+J8DdzECNS1DdJqMckX3sEY07zLZK5rYqyGDqccqJ0+gIw4V4x+aok/doh/EYZBb4NJUYKHNoGgjX5wK347OXE6K2sdYWo8MF0aUFpHM1YpKU0cM0gcJz0XJTHzAvHll/CsWOizbOfKKOSyHde5TM1xUsrOD8mdEMWoV8NJzsE50L+QLr2aV7mCV7h7H7ajC7Y9sLVqU7V0Mq+FKKh+SKd3EZ9iSZqJPJpaPJqUDJmHC5Ecl4+0oIt4UYJDYnkmYXdWC3VvXmlTOWlFIWJqXFkfPkfUhOzBZ+vOleWweOXIcOGVUOHCM+GbZd6kitnHhdm0NNmwLNWrNdS8b9Ceh88y5s6eP86eYsuUMch5a8YvqMBVocBOsLg8mrQsp6zNiKy/f6ldSqe9daOmOKE6cJ5gbZ2aTZutYpqUIpNThJJpDpLGtZFWD4xlJodBP4YgfIRYaYJQMH1bQW9aTWE9PmAfXV68meO+scJBiMLHCru3KLVsGa/QWK7Mo60TsatJUahSgabDNKWTep68PZerh5VENZDBr4xwFISwnIB8NnFmN2VbUEkpJD88NTQaFiBg6ReBAAAAAXRSTlMAQObYZgAABT5JREFUSMftlVOQHUEUhofXtvZyvXu9m7XNrLK2YmOtLGPbtm3btm3zKXODquAlEzykKn/VdM1MVX/ndJ/u/wD/9V8/Cvr2kwz+Ho7yHX1Zv2/xBS2/FQBsC34bbk4D9PH/ldJG7AVqmpjc/IsBbG0xjM2sMPDrdG0IEEOv17Ou+GbkLQLAyKw9+97i5r9b+oWPEbEgFJswlqSoqMiYz3Ty1/kLunY9PyMj3be0pbm+TWUThD/zN9jKKdg8G7XJaDSKhMzMQpnAIf6ofatW8crEGMGwNfk1pZcvdl8wtnU92VJy3CJUn6m2pQhlMoFM8QDDHo2NiRGUdCjJGlTR3guWr5YfV2WUXahJoYZj+AYC7rIuejl37mu60N4+tmPmpF0FBRqk9VZEvNrLcUdBgg/iM6JYt4S4IHjojEgQIMzp3g8XXKp2nl319Mm9k9OEq46J23v3HLqjNQnhT0YMXdyH8Dnu0Rujp0vUxGRt+e1QCGx2292V/fOJg9gTNlyv7tHjQBVbuH3niPEkR3dxIQ1O2InUulpRO4g1VEemerbknFab7cwAG/Y5nA0m//ztDAexgTWBXnOgx3G2cIj7mE2kJJfB0T7IuEmI0kfJIXEQhES0WqIVxNo71AU2Z7KleMq7bA7LEkAyi3XwyDy2sMP04jFWTlSmgQQjsMZAK35WTIu3b9WpE1EQZd81hqYjW9aL4wL0Oz/B+WOA2SEoXZTDgWFOYSYNLnGwgmFZJ5lDVG5hxxgHgYy0biARoalZlisYxsDhXmiOhx6ERCJhDqzIFZTAyvhOUa0yZVHDEGTYGlrPgU7iFevFcjmydcDK9V7+bbEpYa6BFDxHE4qwsc6Nja1bKHKISkQndUxMHLhOvGoQkdi+NdJmgLd4w5aRI3uqa2dO9hjhowMxh3K2AfBpWYhVxw5ep3MHrdiFQTkYVd5mi3fl2ErUu1cd0WO8ML9YzWzieLvyJZEA+B6EcPkxROirslq+/Lry2MoNbeQjK2E4f1otsddkvgcNdeycb+i8Gas4cZPLRhc7Jz8C1PcaLntoq2MAkLXVWMcpWTMPTZtZ6OEDwyldDJyEztEJCN3dTmuws2vXvx3TcbDLWipdB4AN1/D4J9l5eBgAWDN7HfIYM8GrC5/WZYgT1WWzBk6xa0dlY/xLxO0JfKoTSRJC4rBehFJAEMRnbBEgiPE7p/Bdo7Nckuj8dv37D65jo7QkvpIOk5QcNNRa4pftx9JOndpzT1pTCwEfH6Nb8nedYrBLoq0dZxIxHakkmA7DcFAAGuCpGrWNy6OyzCrfDJXy4d6JF3r3bcFtngRxbtIldi0pWIMoTisC+sxH96bCsCcP7cOt5566yJXrG2+EpvuqNFkLkrt1w2eeluOzP1HEDj6bk6MViUyKVG5cXADP8xM/Lqj7xGS3xUW+jemlQRmwRlPQuze+7kLu3e3mHZQSvmTquEVnni9lT+dWmFWoWxoM99mPlrkFuZ0KiCvzS89Lfxzka4YZlPBwnI1rd/x4OnZCa4bOqJ5bXRXsdb/ebEaT08whad0q3EaHcnk8rlyXF5K3+PJislQK4m2OEGoyg6B1+ckj/lWH756I9O7uOX/UVV7ctlGq0dzRV42pZfOD/CIIefMa54UDvyqCs+vwImnbg48Ok42pPJ5nSGpaRUC23l/iF8gKDAxkYGlERkJSyi8HiLjlzADAVz1OMCCFKVihMC3stdBET/H/vBm2BOA3xYiwDKFkbJTaYFSoPBs2nvuy10ttgT8t6azsKQzgL0paHgH8VVFA4L/+IX0A/DNryEq5ruwAAAAASUVORK5CYII='
    };

    const get_tracker_icon = (tracker) => {
      return trackerIcons[tracker] || 'https://default-favicon.ico'; // Provide a default favicon URL
    };

    const use_api_instead = (tracker) => {
      return (
        tracker === 'BLU' ||
        tracker === 'Aither' ||
        tracker === 'RFX' ||
        tracker === 'OE' ||
        tracker === 'HUNO' ||
        tracker === 'TIK' ||
        tracker === 'LST' ||
        tracker === 'IFL' ||
        tracker === 'ULCX' ||
        tracker === 'DP' ||
        tracker === 'LDU' ||
        tracker === 'RAS' ||
        tracker === 'SP' ||
        tracker === 'LUME' ||
        tracker === 'RMC'
      );
    };

    const use_post_instead = (tracker) => {
      return (
        tracker === 'BHD' ||
        tracker === 'HDB' ||
        tracker === 'NBL' ||
        tracker === 'BTN' ||
        tracker === 'ANT' ||
        tracker === 'RTF' ||
        tracker === 'AvistaZ' ||
        tracker === 'CinemaZ' ||
        tracker === 'PHD' ||
        tracker === 'TL' ||
        tracker === 'FL' ||
        tracker === 'MTeam' ||
        tracker === 'RED' ||
        tracker === 'OPS' ||
        tracker === 'AR' ||
        tracker === 'PTP' ||
        tracker === 'YUS' ||
        tracker === 'OTW' ||
        tracker === 'HHD'
      );
    };

    const goodGroups = () => {
      return [
        'D-Z0N3',
        'Tigole QxR',
        'FraMeSToR',
        'HONE',
        'TAoE',
        'Silence QxR',
        '0xC0',
        'r00t QxR',
        'AI-Raws',
        '3L',
        '3DAccess',
        'CultFilms',
        'BluDragon',
        'AdBlue',
        'EML HDTeam',
        'FTW-HD',
        'de[42]'
        //"ExampleText3"
      ];
    };

    const badGroups = () => {
      return [
        'NOGRP',
        'NoGrp',
        'nogroup',
        'NOGROUP',
        'VC-1',
        'MIXED',
        'Mixed',
        'MiXED',
        'BTN',
        'Unknown',
        '-UNK-'
        //"ExampleText2",
        //"ExampleText3"
      ];
    };

    const get_torrent_objs = async (tracker, html) => {
      const get_dvd_type = (size) => {
        const sizeInGB = size / 1024; // Convert size from MiB to GB
        if (sizeInGB <= 4.7) {
          return 'DVD5';
        } else if (sizeInGB <= 8.5) {
          return 'DVD9';
        } else {
          return 'DVDSET';
        }
      };

      const get_bd_type = (size) => {
        const sizeInGB = size / 1024; // Convert size from MiB to GB
        if (sizeInGB <= 25) {
          return 'BD25';
        } else if (sizeInGB <= 50) {
          return 'BD50';
          //} else if (sizeInGB <= 66) {
          //    return "BD66";
          //} else if (sizeInGB <= 100) {
          //    return "BD100";
        } else {
          return 'BDSET';
        }
      };
      let torrent_objs = [];
      if (tracker === 'TVV') {
        try {
          // Process the XML document
          const torrents = html.querySelectorAll('torrent');
          torrents.forEach((torrent) => {
            let torrent_obj = {};

            const documentTitle = torrent.querySelector('title').textContent;
            if (documentTitle.includes('Extras') || documentTitle.includes('Episode')) {
              return; // Skip further processing for this torrent
            }

            const sizeElement = torrent.querySelector('size[type="formatted"]');
            if (sizeElement) {
              const sizeText = sizeElement.textContent;
              let sizeInMiB;

              if (sizeText.includes(' TB')) {
                sizeInMiB = Number.parseFloat(sizeText.split(' TB')[0]) * 1024 * 1024; // Convert TB to MiB
              } else if (sizeText.includes(' GB')) {
                sizeInMiB = Number.parseFloat(sizeText.split(' GB')[0]) * 1024; // Convert GB to MiB
              } else if (sizeText.includes(' MB')) {
                sizeInMiB = Number.parseFloat(sizeText.split(' MB')[0]); // MB is already in MiB
              } else {
                console.error('Unknown size unit.');
                return;
              }

              torrent_obj.size = Number.parseInt(sizeInMiB);
            } else {
              console.error('Missing size information.');
              return;
            }
            const bytesElement = torrent.querySelector('size[type="bytes"]');
            if (bytesElement) {
              torrent_obj.api_size = Number.parseInt(bytesElement.textContent);
            } else {
              console.error('Missing TVV bytes information');
              return;
            }

            const combinedInfo = torrent.querySelector('torrentinfo[type="combined"]');
            if (combinedInfo) {
              let infoText = combinedInfo.textContent
                .replaceAll(/\/?Freeleech\/?/g, '')
                .replaceAll('/', ' ');
              infoText = infoText.replaceAll(' &#x25a2;&#8;&#xfe4d; ', ' Subs ');
              infoText = infoText.replaceAll(' &#x1f4ac;&#xfe0e; ', ' Commentary ');

              if (improved_tags) {
                infoText = infoText.replace('VOB IFO', 'VOB');
                if (documentTitle.includes('(720p)')) {
                  infoText += ' 720p';
                }
                if (documentTitle.includes('(1080p)')) {
                  infoText += ' 1080p';
                }
                if (documentTitle.includes('(1080i)')) {
                  infoText += ' 1080i';
                }
                if (documentTitle.includes('(2160p)')) {
                  infoText += ' 2160p';
                }
                // Always append "Special Edition" if present
                if (documentTitle.includes('(Special Edition)')) {
                  infoText += ' (Special Edition)';
                }
                infoText = infoText.replace('HDRdovi', ' HDR DoVi');
                if (infoText.includes('VOB') && torrent_obj.size) {
                  const dvdType = get_dvd_type(torrent_obj.size);
                  infoText = `${dvdType} ${infoText}`;
                } else if (infoText.includes('m2ts') && torrent_obj.size) {
                  const bdType = get_bd_type(torrent_obj.size);
                  infoText = `${bdType} ${infoText}`;
                }
              } else {
                // Remove "Freeleech" and any surrounding forward slashes
                //infoText = combinedInfo.textContent.replaceAll(/\/?Freeleech\/?/g, "").replaceAll(/\//g, " / ");
                // Append resolution tags if necessary
                if (documentTitle.includes('(720p)')) {
                  infoText += ' / 720p';
                }
                if (documentTitle.includes('(1080p)')) {
                  infoText += ' / 1080p';
                }
                if (documentTitle.includes('(2160p)')) {
                  infoText += ' / 2160p';
                }
                if (documentTitle.includes('(Special Edition)')) {
                  infoText += ' / (Special Edition)';
                }
              }

              torrent_obj.info_text = infoText;
              torrent_obj.datasetRelease = infoText;
            } else {
              console.error('Missing combined torrent info.');
              return; // Skip this torrent if critical information is missing
            }

            const base_url = 'https://tv-vault.me/torrents.php?action=download&id=';
            let id = torrent.getAttribute('id'); // Extract the id attribute
            if (id) {
              const downloadUrl = `${base_url}${id}&authkey=${TVV_AUTH_KEY}&torrent_pass=${TVV_TORR_PASS}`;
              torrent_obj.download_link = downloadUrl;
            } else {
              console.error('Missing torrent ID.');
              return; // Skip this torrent if ID is missing
            }

            torrent_obj.snatch = Number.parseInt(
              torrent.querySelector('snatches')?.textContent || '0'
            );
            torrent_obj.seed = Number.parseInt(
              torrent.querySelector('seeders')?.textContent || '0'
            );
            torrent_obj.leech = Number.parseInt(
              torrent.querySelector('leechers')?.textContent || '0'
            );

            const linkElement = torrent.querySelector('link');
            if (linkElement) {
              torrent_obj.torrent_page = linkElement.textContent;
            } else {
              console.error('Missing link information.');
              return; // Skip this torrent if link is missing
            }

            torrent_obj.site = 'TVV';
            const discountTVVElement = torrent.querySelector('torrentinfo[type="freeleech"]');
            let discountType = 'None';
            if (discountTVVElement) {
              const isFreeLeech = discountTVVElement.textContent.includes('Freeleech');
              discountType = isFreeLeech ? (simplediscounts ? 'FL' : 'Freeleech') : 'None';
            }
            torrent_obj.discount = discountType;
            const statusFind = torrent.querySelector('seeders[currentseed="true"]');
            if (statusFind) {
              torrent_obj.status = 'seeding';
            } else {
              torrent_obj.status = 'default';
            }
            const inputTimeElement = Number.parseInt(
              torrent.querySelector('date[type="UNIX"]').textContent
            );
            if (inputTimeElement) {
              let time = inputTimeElement;
              if (Number.isNaN(time)) {
                return null;
              }
              torrent_obj.time = time;
            }
            torrent_obj.groupId = '';
            torrent_objs.push(torrent_obj);
          });
        } catch (error) {
          console.error('Error processing XML from TVV:', error);
        }
      } else if (tracker === 'MTV') {
        try {
          const torrents = html.querySelectorAll('item');

          torrents.forEach((torrent) => {
            let torrent_obj = {};

            const documentTitle = torrent.querySelector('title')?.textContent;
            if (!documentTitle) {
              console.error('Missing title information.');
              return; // Skip this torrent if title information is missing
            }
            let infoText = documentTitle;
            if (/S\d{1,2}E\d{1,2}/.test(infoText) === false) {
              torrent_obj.datasetRelease = documentTitle;
              const isInternal =
                infoText.includes('-hallowed') ||
                infoText.includes('-TEPES') ||
                infoText.includes('-E.N.D') ||
                infoText.includes('-WDYM');
              torrent_obj.internal = isInternal;

              const sizeElement = torrent.querySelector('size');
              if (sizeElement) {
                const sizeValue = sizeElement.textContent;
                torrent_obj.size = Number.parseInt(Number.parseFloat(sizeValue) / (1024 * 1024)); // Convert size from bytes to MB
                torrent_obj.api_size = Number.parseInt(sizeValue);
              } else {
                console.error('Missing size information.');
                return; // Skip this torrent if size information is missing
              }
              let groupText = '';
              const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
              const badGroupsList = badGroups(); // Get the list of bad group names
              let matchedGroup = null;
              let badGroupFound = false;

              // Check for bad groups
              for (const badGroup of badGroupsList) {
                if (infoText.includes(badGroup)) {
                  badGroupFound = true;
                  infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                  break;
                }
              }

              if (!badGroupFound) {
                // Check for good groups if no bad group was found
                for (const group of groups) {
                  if (infoText.includes(group)) {
                    matchedGroup = group;
                    break;
                  }
                }

                if (matchedGroup) {
                  groupText = matchedGroup;
                  if (improved_tags) {
                    infoText = infoText.replace(groupText, '').trim();
                  }
                } else {
                  const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                  if (match) {
                    groupText = match[1]; // Use match[1] to get the capturing group
                    groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                    if (improved_tags) {
                      infoText = infoText.replace(`-${match[1]}`, '').trim();
                    }
                  }
                }
              }
              torrent_obj.groupId = groupText;
              let cleanTheText = infoText;
              const replaceFullStops = (text) => {
                const placeholders = new Map();
                let tempText = text;

                const keepPatterns = [
                  /\b\d\.\d\b/g,
                  /\bDD\d\.\d\b/g,
                  /\bDDP\d\.\d\b/g,
                  /\bDD\+\d\.\d\b/g,
                  /\bTrueHD \d\.\d\b/g,
                  /\bDTS\d\.\d\b/g,
                  /\bAC3\d\.\d\b/g,
                  /\bAAC\d\.\d\b/g,
                  /\bOPUS\d\.\d\b/g,
                  /\bMP3\d\.\d\b/g,
                  /\bFLAC\d\.\d\b/g,
                  /\bLPCM\d\.\d\b/g,
                  /\bH\.264\b/g,
                  /\bH\.265\b/g,
                  /\bDTS-HD MA \d\.\d\b/g,
                  /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                ];

                keepPatterns.forEach((pattern, index) => {
                  tempText = tempText.replace(pattern, (match) => {
                    const placeholder = `__PLACEHOLDER${index}__`;
                    placeholders.set(placeholder, match);
                    return placeholder;
                  });
                });

                // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                tempText = tempText.replaceAll(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                tempText = tempText.replaceAll(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                tempText = tempText.replaceAll(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                tempText = tempText.replaceAll(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                placeholders.forEach((original, placeholder) => {
                  tempText = tempText.replaceAll(placeholder, original);
                });

                tempText = tempText
                  .replaceAll('DD+', 'DD+ ')
                  .replaceAll('DDP', 'DD+ ')
                  .replaceAll('DoVi', 'DV')
                  .replaceAll('(', '')
                  .replaceAll(')', '')
                  .replaceAll(/\bhdr\b/g, 'HDR')
                  .replaceAll(/\bweb\b/g, 'WEB')
                  .replaceAll(/\bbluray\b/g, 'BluRay')
                  .replaceAll(/\bh254\b/g, 'H.264')
                  .replaceAll(/\bh265\b/g, 'H.265')
                  .replaceAll(/\b\w/g, (char) => char.toUpperCase())
                  .replaceAll(/\bX264\b/g, 'x264')
                  .replaceAll(/\bX265\b/g, 'x265')
                  .replaceAll(/\b - \b/g, ' ');

                return tempText;
              };
              let formatted = '';
              const filesValueRaw =
                torrent.querySelector('files')?.textContent ||
                torrent.querySelector('attr[name="files"]')?.getAttribute('value') ||
                torrent
                  .querySelector(String.raw`torznab\:attr[name="files"]`)
                  ?.getAttribute('value') ||
                '';
              const mtvFilecount = Number.parseInt(filesValueRaw, 10);
              if (improved_tags) {
                formatted = replaceFullStops(cleanTheText);
                if (groupText && groupText.includes('FraMeSToR')) {
                  if (formatted.includes('DV')) {
                    formatted = formatted.replace('DV', 'DV HDR');
                  }
                }
                const files = Number.isFinite(mtvFilecount) ? mtvFilecount : 0;

                if (
                  formatted.includes('BluRay') &&
                  !isMiniSeriesFromSpan &&
                  torrent_obj.size &&
                  files > 10
                ) {
                  const bdType = get_bd_type(torrent_obj.size);
                  formatted = `${bdType} ${formatted}`;
                }
              } else {
                formatted = infoText;
              }
              if (improved_tags) {
                torrent_obj.info_text = formatted;
              } else torrent_obj.info_text = documentTitle;

              const linkElement = torrent.querySelector('link');
              if (linkElement) {
                torrent_obj.download_link = linkElement.textContent;
              } else {
                console.error('Missing download link.');
                return;
              }

              torrent_obj.snatch = Number.parseInt(
                torrent.querySelector('attr[name="grabs"]')?.getAttribute('value') || '0'
              );
              torrent_obj.seed = Number.parseInt(
                torrent.querySelector('attr[name="seeders"]')?.getAttribute('value') || '0'
              );
              torrent_obj.leech = Number.parseInt(
                torrent.querySelector('attr[name="leechers"]')?.getAttribute('value') || '0'
              );

              const commentsElement = torrent.querySelector('comments');
              if (commentsElement) {
                torrent_obj.torrent_page = commentsElement.textContent;
              } else {
                console.error('Missing comments link.');
                return;
              }

              torrent_obj.site = 'MTV';
              const discountMTVElement = torrent.querySelector(
                String.raw`torznab\:attr[name="downloadvolumefactor"]`
              );
              let discountType = 'None';
              if (discountMTVElement) {
                const discountValue = discountMTVElement.getAttribute('value');
                const isFreeLeech = discountValue === '0';
                if (simplediscounts) {
                  discountType = isFreeLeech ? 'FL' : 'None';
                } else {
                  discountType = isFreeLeech ? 'Freeleech' : 'None';
                }
              }
              torrent_obj.discount = discountType;
              const inputTimeElement = torrent.querySelector('pubDate');
              if (inputTimeElement) {
                const inputTime = inputTimeElement.textContent.trim();
                let time = toUnixTime(inputTime);
                if (Number.isNaN(time)) {
                  return null;
                }
                torrent_obj.time = time;
              }

              if (Number.isFinite(mtvFilecount)) {
                torrent_obj.filecount = mtvFilecount;
              }

              torrent_objs.push(torrent_obj);
            }
          });
        } catch (error) {
          console.error('Error processing XML from MTV:', error);
        }
      } else if (tracker === 'CG') {
        let ar1 = [...html.querySelectorAll('tr.prim')];
        let ar2 = [...html.querySelectorAll('tr.sec')];
        let ar3 = [...html.querySelectorAll('tr.torrenttable_usersnatched')];
        let ar4 = [...html.querySelectorAll('tr.torrenttable_bumped')];

        let combined_arr = ar1.concat(ar2).concat(ar3).concat(ar4);

        combined_arr.forEach((d) => {
          let torrent_obj = {};

          let size = d.querySelector('td:nth-child(5)').textContent;

          if (size.includes('TB')) {
            size = Number.parseInt(Number.parseFloat(size.split('TB')[0]) * 1024 * 1024);
          } else if (size.includes('GB')) {
            size = Number.parseInt(Number.parseFloat(size.split('GB')[0]) * 1024);
          } else if (size.includes('MB')) {
            size = Number.parseInt(Number.parseFloat(size.split('MB')[0]));
          } else {
            size = 1;
          }

          torrent_obj.size = size;
          let releaseName = d.querySelectorAll('td')[1].querySelector('b').textContent.trim();
          torrent_obj.datasetRelease = releaseName;
          let groupText = '';
          const groups = goodGroups();
          const badGroupsList = badGroups();
          let matchedGroup = null;
          let badGroupFound = false;

          for (const badGroup of badGroupsList) {
            if (releaseName.includes(badGroup)) {
              badGroupFound = true;
              releaseName = releaseName.replace(badGroup, '').trim();
              break;
            }
          }

          if (!badGroupFound) {
            for (const group of groups) {
              if (releaseName.includes(group)) {
                matchedGroup = group;
                break;
              }
            }

            if (matchedGroup) {
              groupText = matchedGroup;
              if (improved_tags) {
                releaseName = releaseName.replace(groupText, '').trim();
              }
            } else {
              const match = releaseName.match(
                /-(?![^(]*[()[]])[a-zA-Z]([a-zA-Z0-9]*$|[^-]*\([^()]*\)[^-]*)/
              );
              if (match) {
                groupText = match[1];
                groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                if (improved_tags) {
                  releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                }
              }
            }
          }

          const inputTimeElement = d.querySelector('.torrenttable > tbody > tr > td:nth-child(4)');
          if (inputTimeElement) {
            let inputTime = inputTimeElement.innerHTML.trim();
            inputTime = inputTime.replace('<br>', ' ');
            inputTime = inputTime.replaceAll(/<\/?nobr>/g, '');
            let time = toUnixTime(inputTime);
            if (Number.isNaN(time)) {
              return null;
            }
            torrent_obj.time = time;
          }
          torrent_obj.info_text = releaseName;
          torrent_obj.groupId = groupText;
          torrent_obj.site = 'CG';
          torrent_obj.snatch = Number.parseInt(d.querySelector('td:nth-child(6)').textContent);
          torrent_obj.seed = Number.parseInt(d.querySelector('td:nth-child(7)').textContent);
          torrent_obj.leech = Number.parseInt(d.querySelector('td:nth-child(8)').textContent);
          torrent_obj.download_link = [...d.querySelectorAll('a')]
            .find((a) => a.href.includes('download.php?id='))
            .href.replace('passthepopcorn.me', 'cinemageddon.net');
          torrent_obj.torrent_page = [...d.querySelectorAll('a')]
            .find((a) => a.href.includes('/details.php?id='))
            .href.replace('passthepopcorn.me', 'cinemageddon.net');
          torrent_obj.status = d.className.includes('torrenttable_usersnatched')
            ? 'seeding'
            : 'default';

          const discountImg = [...document.querySelectorAll('img')].find((e) =>
            e.alt.includes('bonus')
          );
          let discountType = 'None';
          if (discountImg) {
            const altText = discountImg.alt;
            if (simplediscounts) {
              if (altText === '100% bonus') {
                discountType = 'FL';
              } else if (altText === '30% bonus') {
                discountType = '30%';
              } else if (altText === '40% bonus') {
                discountType = '40%';
              }
            } else if (altText === '100% bonus') {
              discountType = 'FreeLeech';
            } else if (altText === '30% bonus') {
              discountType = '30% Bonus';
            } else if (altText === '40% bonus') {
              discountType = '40% Bonus';
            }
          }
          torrent_obj.discount = discountType;
          torrent_objs.push(torrent_obj);
        });
      } else if (tracker === 'KG') {
        let rows = Array.from(html.querySelector('#browse > tbody').querySelectorAll('tr')).filter(
          (row, index) => index & 1
        ); // Only odd rows contain titles
        rows.forEach((d) => {
          try {
            let torrent_obj = {};
            let size = d.querySelector('td:nth-child(11)').textContent.replace(',', '');

            if (size.includes('TB')) {
              size = Number.parseInt(Number.parseFloat(size.split('TB')[0]) * 1024 * 1024); // Convert TiB to MiB
            } else if (size.includes('GB')) {
              size = Number.parseInt(Number.parseFloat(size.split('GB')[0]) * 1024); // Convert GB to MiB
            } else if (size.includes('MB')) {
              size = Number.parseInt(Number.parseFloat(size.split('MB')[0]));
            } else size = 1; // must be kiloBytes, so lets assume 1mb.
            let downloadLink = [...d.querySelectorAll('a')]
              .find((a) => a.href.includes('/down.php/'))
              .href.replace('passthepopcorn.me', 'karagarga.in');
            let releaseName = decodeURI(downloadLink).split('.torrent?')[0].split('/').pop();
            if (releaseName.includes('.mkv')) {
              releaseName = releaseName.replace('.mkv', '');
              torrent_obj.info_text = releaseName;
              torrent_obj.info_text += ' / MKV';
            } else {
              torrent_obj.info_text = releaseName;
            }

            const images = d.querySelectorAll(
              "[style='position:absolute;top:0px; left:0px'] > img"
            );
            Array.from(images).forEach((img) => {
              if (img.src.includes('720')) {
                torrent_obj.info_text += ' / 720p';
                torrent_obj.quality = 'HD';
              } else if (img.src.includes('1080')) {
                torrent_obj.info_text += ' / 1080p';
                torrent_obj.quality = 'HD';
              } else if (img.src.includes('bluray')) {
                torrent_obj.info_text = `Blu-ray / ${torrent_obj.info_text} 1080p`;
                torrent_obj.quality = 'HD';
              } else if (img.src.includes('dvd')) {
                torrent_obj.info_text = `DVD / ${torrent_obj.info_text}`;
                torrent_obj.quality = 'SD';
              } else {
                torrent_obj.quality = 'SD';
              }
            });
            torrent_obj.size = size;
            torrent_obj.datasetRelease = releaseName;
            let groupText = '';
            let needs_group =
              releaseName.includes('.mkv') ||
              releaseName.includes('.avi') ||
              releaseName.includes('.mp4') ||
              releaseName.includes('.ts');
            if (improved_tags) {
              const match = /-([^- ]+)$/.exec(releaseName);
              if (match && needs_group) {
                groupText = match[0].substring(1);
                groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                releaseName = releaseName.replace(groupText, '');
              }
              if (releaseName.includes('.iso')) {
                if (torrent_obj.info_text.includes('DVD /')) {
                  torrent_obj.info_text = torrent_obj.info_text.replace('DVD /', 'ISO / DVD /');
                } else if (torrent_obj.info_text.includes('Blu-ray /')) {
                  torrent_obj.info_text = torrent_obj.info_text.replace(
                    'Blu-ray /',
                    'ISO / Blu-ray'
                  );
                }
              } else if (torrent_obj.info_text.includes('DVD /')) {
                torrent_obj.info_text = torrent_obj.info_text.replace('DVD /', 'vob');
              } else if (torrent_obj.info_text.includes('Blu-ray /')) {
                torrent_obj.info_text = torrent_obj.info_text.replace('Blu-ray /', 'm2ts Blu-ray');
              }
              if (torrent_obj.info_text.includes('vob') && torrent_obj.size) {
                const dvdType = get_dvd_type(torrent_obj.size);
                torrent_obj.info_text = `${dvdType} ${torrent_obj.info_text}`;
              } else if (torrent_obj.info_text.includes('m2ts') && torrent_obj.size) {
                const bdType = get_bd_type(torrent_obj.size);
                torrent_obj.info_text = `${bdType} ${torrent_obj.info_text}`;
              }
              const distributor = d
                .querySelectorAll('td')[1]
                .querySelector('a')
                .textContent.trim()
                .match(/\[(.*?)\]/);
              if (distributor) {
                torrent_obj.distributor = distributor[1];
                torrent_obj.info_text = torrent_obj.info_text.replace(distributor[0], '');
              }
            }
            torrent_obj.groupId = groupText;
            let time = d.querySelector('td:nth-child(9)').textContent;
            if (time) {
              const match = time.match(/^([A-Za-z]{3})\s(\d{1,2})\s'(\d{2})$/);

              if (match) {
                const [, monthStr, day, year] = match;
                const months = {
                  Jan: 0,
                  Feb: 1,
                  Mar: 2,
                  Apr: 3,
                  May: 4,
                  Jun: 5,
                  Jul: 6,
                  Aug: 7,
                  Sep: 8,
                  Oct: 9,
                  Nov: 10,
                  Dec: 11
                };
                const month = months[monthStr];
                const fullYear = Number.parseInt(year, 10) + 2000; // Adjust the year
                const parsedDay = Number.parseInt(day, 10); // Make sure it's an integer

                const uploadDate = new Date(fullYear, month, parsedDay);

                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                // Calculate torrent_obj.time as the difference from midnight to now - everything uploaded on the day will show as just now
                torrent_obj.time = Math.floor(
                  (uploadDate.getTime() + (Date.now() - currentDate.getTime())) / 1000
                );
              } else {
                console.log('KG time format did not match.');
              }
            }
            torrent_obj.site = 'KG';
            torrent_obj.snatch = Number.parseInt(d.querySelector('td:nth-child(12)').textContent);
            torrent_obj.seed = Number.parseInt(d.querySelector('td:nth-child(13)').textContent);
            torrent_obj.leech = Number.parseInt(d.querySelector('td:nth-child(14)').textContent);
            torrent_obj.download_link = downloadLink;
            torrent_obj.torrent_page = [...d.querySelectorAll('a')]
              .find((a) => a.href.includes('/details.php?id='))
              .href.replace('passthepopcorn.me', 'karagarga.in');
            torrent_obj.status = d.className.includes('snatchedrow') ? 'seeding' : 'default';
            torrent_obj.discount = 'None';
            torrent_objs.push(torrent_obj);
          } catch (e) {
            console.error('An error has occurred: ', e);
          }
        });
      } else if (tracker === 'PxHD') {
        let currentEdition = null;

        html.querySelectorAll('tr.group_torrent').forEach((item) => {
          // Get the edition info for the current item
          let editionInfoElement = item.querySelector('.edition_info');
          let edition = editionInfoElement
            ? editionInfoElement.textContent.replaceAll('\n', '')
            : null;

          // If edition is present, store it for following rows.
          if (edition) {
            currentEdition = edition;
          } else {
            edition = currentEdition;

            let sizeText = item.querySelector('td:nth-child(4)').textContent.trim();
            let size = 0;
            if (sizeText.includes('TB')) {
              size = Number.parseInt(Number.parseFloat(sizeText.split('TB')[0]) * 1024 * 1024); // Convert TB to MB
            } else if (sizeText.includes('GB')) {
              size = Number.parseInt(Number.parseFloat(sizeText.split('GB')[0]) * 1024); // Convert GB to MB
            } else if (sizeText.includes('MB')) {
              size = Number.parseInt(Number.parseFloat(sizeText.split('MB')[0]));
            }

            let releaseNameElement = item.querySelector('td:nth-child(1) > a');
            let releaseName = releaseNameElement ? releaseNameElement.textContent.trim() : '';
            let groupText = '';
            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
            const badGroupsList = badGroups(); // Get the list of bad group names
            let matchedGroup = null;
            let badGroupFound = false;

            // Check for bad groups
            for (const badGroup of badGroupsList) {
              if (releaseName.includes(badGroup)) {
                badGroupFound = true;
                releaseName = releaseName.replace(badGroup, '').trim(); // Remove the bad group text
                break;
              }
            }

            if (!badGroupFound) {
              // Check for good groups if no bad group was found
              for (const group of groups) {
                if (releaseName.includes(group)) {
                  matchedGroup = group;
                  break;
                }
              }

              if (matchedGroup) {
                groupText = matchedGroup;
                if (improved_tags) {
                  releaseName = releaseName.replace(groupText, '').trim();
                }
              } else {
                const match = releaseName.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                if (match) {
                  groupText = match[1]; // Use match[1] to get the capturing group
                  groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                  if (improved_tags) {
                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                  }
                }
              }
            }

            let downloadLinkElement = item.querySelector('td:nth-child(1) > span > a');
            let torrentPageElement = item.querySelector('td:nth-child(1) > a');
            let torrent_obj = {
              edition: currentEdition,
              size: size,
              datasetRelease: releaseName,
              info_text: `${releaseName.replaceAll('\n', '')} / ${edition}`,
              groupId: groupText,
              site: 'PxHD',
              download_link: downloadLinkElement
                ? downloadLinkElement.href.replace('passthepopcorn.me', 'pixelhd.me')
                : '',
              snatch: Number.parseInt(item.querySelector('td:nth-child(6)').textContent),
              seed: Number.parseInt(item.querySelector('td:nth-child(7)').textContent),
              leech: Number.parseInt(item.querySelector('td:nth-child(8)').textContent),
              torrent_page: torrentPageElement
                ? torrentPageElement.href.replace('passthepopcorn.me', 'pixelhd.me')
                : '',
              status: item.querySelectorAll('span.tag_seeding').length > 0 ? 'seeding' : 'default',
              discount: 'None',
              internal: false,
              exclusive: false
            };
            torrent_objs.push(torrent_obj);
          }
        });
      }
      torrent_objs = torrent_objs.map((e) => {
        return { ...e, quality: get_torrent_quality(e) };
      });
      if (debug) {
        console.log(`${tracker} processed torrent objects`, torrent_objs);
      }
      return torrent_objs;
    };

    const is_movie_exist = (tracker, html) => {
      // true or false
      if (tracker === 'TVV') {
        if (html.querySelector('NoResults') !== null) {
          return false;
        } else if (html.querySelector('SearchError[value="1"]') !== null) {
          console.warn('TVV authorization missing');
          return false;
        } else if (html.querySelector('SearchError[value="2"]') !== null) {
          console.warn('TVV authorization invalid or account disabled');
          return false;
        } else if (html.querySelector('SearchError[value="3"]') !== null) {
          console.warn('Not enough privileges for this TVV search');
          return false;
        } else if (html.querySelector('SearchError[value="100"]') !== null) {
          console.warn('Searching TVV too soon');
          displayAlert('Searching TVV too soon');
          return false;
        } else if (html.querySelector('SearchError[value="101"]') !== null) {
          let timeValue = html.querySelector('SearchError[value="101"]').textContent;
          console.warn(`TVV: ${timeValue}`);
          displayAlert(`TVV: ${timeValue}`);
          return false;
        } else if (html.querySelector('SearchError') === null) {
          return true;
        } else {
          console.warn('Some issue with TVV searching');
          return false;
        }
      } else if (tracker === 'MTV') {
        return html.querySelector('item') !== null;
      } else if (
        tracker === 'BLU' ||
        tracker === 'Aither' ||
        tracker === 'RFX' ||
        tracker === 'OE' ||
        tracker === 'HUNO' ||
        tracker === 'TIK' ||
        tracker === 'LST' ||
        tracker === 'IFL' ||
        tracker === 'ULCX' ||
        tracker === 'OTW' ||
        tracker === 'DP'
      ) {
        return html.querySelector('.torrent-search--list__no-result') === null;
      } else if (tracker === 'CG') {
        let ar1 = [...html.querySelectorAll('tr.prim')];
        let ar2 = [...html.querySelectorAll('tr.even')];
        let ar3 = [...html.querySelectorAll('tr.torrenttable_usersnatched')];
        let ar4 = [...html.querySelectorAll('tr.torrenttable_bumped')];

        let combined_arr = ar1.concat(ar2).concat(ar3).concat(ar4);

        return combined_arr.length > 0; // it's different, pay attention !
      } else if (tracker === 'KG') {
        return html.querySelector('tr.oddrow') !== null; // it's different, pay attention !
      } else if (tracker === 'PxHD') {
        const element = html.querySelector('div.box.pad > h2');

        // If the page explicitly reports no matches, treat it as no result.
        return !element?.textContent?.includes('did not match anything');
      } else if (tracker === 'PTP') {
        return html.querySelector('#no_results_message > div') === null;
      }
    };

    const isTrackerSelected = (tracker) => {
      return GM_config.get(tracker.toLowerCase());
    };

    const login_json = async (login_url, tracker, loginData) => {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };

      const response = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          url: login_url,
          method: 'POST',
          data: JSON.stringify(loginData),
          headers: headers,
          onload: (res) => {
            resolve(res);
          },
          onerror: (err) => {
            reject(err);
          },
          onabort: (err) => {
            reject(err);
          },
          ontimeout: (err) => {
            reject(err);
          }
        });
      });

      if (response.status === 201 || response.status === 200) {
        if (debug) {
          console.log(`Login response from ${tracker}`, response.responseText);
        }
        return JSON.parse(response.responseText);
      } else if (response.status === 422) {
        const jsonResponse = JSON.parse(response.responseText);
        console.warn(`Auth details not correct for ${tracker} auth login`);
        console.log(`Login response from ${tracker}`, response.responseText);
        displayAlert(`Auth details not correct for ${tracker} auth login`);
        return jsonResponse;
      } else {
        if (debug) {
          console.log(`Login response from ${tracker}`, response.responseText);
        }
        console.warn(`Error: ${tracker} HTTP ${response.status} Error.`);
        displayAlert(`${tracker} returned not ok`);
        return null;
      }
    };

    const fetch_login = async (login_url, tracker, loginData) => {
      try {
        const result = await login_json(login_url, tracker, loginData);
        if (result && result.token) {
          return result;
        } else {
          console.log(`${tracker} response`, result);
          console.log(`${tracker} data`, loginData);
          return null;
        }
      } catch (error) {
        console.error(`Error in fetch_login for ${tracker}`, error);
        displayAlert(`Error in fetch_login for ${tracker}`);
        return null;
      }
    };

    const rtf_login = async () => {
      const login_url = 'https://retroflix.club/api/login';
      const loginData = {
        username: RTF_USER,
        password: RTF_PASS
      };
      const result = await fetch_login(login_url, 'rtf', loginData);
      if (result) {
        console.log('RTF login successful:', result);
      } else {
        console.warn('RTF login failed.');
      }
      return result;
    };

    const avistaz_login = async () => {
      const login_url = 'https://avistaz.to/api/v1/jackett/auth';
      const loginData = {
        username: AVISTAZ_USER,
        password: AVISTAZ_PASS,
        pid: AVISTAZ_PID
      };
      return await fetch_login(login_url, 'avistaz', loginData);
    };

    const cinemaz_login = async () => {
      const login_url = 'https://cinemaz.to/api/v1/jackett/auth';
      const loginData = {
        username: CINEMAZ_USER,
        password: CINEMAZ_PASS,
        pid: CINEMAZ_PID
      };
      return await fetch_login(login_url, 'cinemaz', loginData);
    };

    const phd_login = async () => {
      const login_url = 'https://privatehd.to/api/v1/jackett/auth';
      const loginData = {
        username: PHD_USER,
        password: PHD_PASS,
        pid: PHD_PID
      };
      return await fetch_login(login_url, 'phd', loginData);
    };

    (async () => {
      const updateTrackerLogin = async (tracker, loginFunction, loginData) => {
        const token = GM_config.get(`${tracker.toLowerCase()}_token`);

        // Check if token is not found or empty
        if (isTrackerSelected(tracker) && (!token || token === '')) {
          console.log(`Running ${tracker} login function...`);
          const result = await loginFunction(loginData);
          if (result) {
            const token = result.token;
            if (debug) {
              console.log(`${tracker} Login successful`, result);
              console.log('Extracted token:', token);
            }
            GM_config.set(`${tracker.toLowerCase()}_token`, token);
            GM_config.save();
            console.log(`${tracker} token found and set`);
          } else {
            console.warn(`${tracker} Auth Login failed`);
          }
        } else if (debug) {
          console.log(
            `${tracker} Auth login skipped: valid token exists or the tracker is not selected.`
          );
        }
      };

      await updateTrackerLogin('rtf', rtf_login, {});
      await updateTrackerLogin('avistaz', avistaz_login, {});
      await updateTrackerLogin('cinemaz', cinemaz_login, {});
      await updateTrackerLogin('phd', phd_login, {});
    })();

    function clearToken(tracker) {
      const key = `${tracker.toLowerCase()}_token`;
      GM_config.set(key, ''); // Set the token value to an empty string
      GM_config.save(); // Save the changes
    }

    const parseJsonResponse = (response, tracker) => {
      const rawText = response?.responseText ?? '';
      const contentTypeMatch = (response?.responseHeaders || '').match(/content-type: ?([^;]+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase() : '';

      if (contentType && !contentType.includes('json')) {
        if (debug) {
          console.warn(`Non-JSON response from ${tracker} (${contentType})`, rawText.slice(0, 200));
        }
      }

      try {
        return JSON.parse(rawText);
      } catch (error) {
        const startsWithHtml = rawText.trim().startsWith('<');
        if (startsWithHtml) {
          console.warn(`HTML response received from ${tracker}. Login or access may be required.`);
        }
        if (debug) {
          console.warn(`Failed to parse JSON from ${tracker}`, rawText.slice(0, 200), error);
        }
        return null;
      }
    };

    const getFileListErrorMessage = (response) => {
      const responseText = response?.responseText?.trim();

      if (responseText) {
        return responseText;
      }

      const errorMessages = {
        400: 'Invalid search/filter',
        401: 'Username and passkey cannot be empty',
        403: 'Too many failed authentications or invalid passkey/username',
        429: 'Rate limit reached',
        503: 'Service unavailable'
      };

      return errorMessages[response.status] || `HTTP ${response.status} Error`;
    };

    const post_json = async (post_query_url, tracker, postData, timeout = timer) => {
      const headersMapping = {
        ANT: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          Host: 'anthelion.me'
        },
        RTF: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: GM_config.get('rtf_token')
        },
        AvistaZ: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${GM_config.get('avistaz_token')}`
        },
        CinemaZ: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${GM_config.get('cinemaz_token')}`
        },
        PHD: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${GM_config.get('phd_token')}`
        },
        MTeam: {
          'x-api-key': GM_config.get('MTeam_api'),
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        RED: {
          'Content-Type': 'application/json',
          Authorization: GM_config.get('red_api')
        },
        OPS: {
          'Content-Type': 'application/json',
          Authorization: GM_config.get('ops_api')
        },
        YUS: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Bearer ${YUS_API_TOKEN}`
        },
        OTW: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Bearer ${OTW_API_TOKEN}`
        },
        HHD: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Bearer ${HHD_API_TOKEN}`
        },
        FL: {
          Accept: 'application/json',
          Authorization: `Basic ${btoa(`${FL_USER_NAME}:${FL_PASS_KEY}`)}`
        },
        NBL: {
          Accept: 'application/json'
        },
        PTP: {
          Accept: 'application/json',
          ApiUser: PTP_API_USER,
          ApiKey: PTP_API_KEY
        }
        // Add more trackers and their headers as needed
      };

      const headers = headersMapping[tracker] || {
        'Content-Type': 'application/json'
      };

      if (debug) {
        console.log(`Headers for ${tracker}`, headers);
      }

      const methodMapping = {
        RTF: 'GET',
        AvistaZ: 'GET',
        CinemaZ: 'GET',
        PHD: 'GET',
        TL: 'GET',
        FL: 'GET',
        NBL: 'GET',
        RED: 'GET',
        OPS: 'GET',
        AR: 'GET',
        PTP: 'GET',
        YUS: 'GET',
        OTW: 'GET',
        HHD: 'GET'
      };
      const method = methodMapping[tracker] || 'POST';

      // Return a Promise that resolves with the response or rejects on timeout
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);

        const request = {
          url: post_query_url,
          method: method,
          headers: headers,
          onload: (res) => {
            clearTimeout(timer);
            resolve(res);
          },
          onerror: (err) => {
            clearTimeout(timer);
            reject(err);
          },
          onabort: (err) => {
            clearTimeout(timer);
            reject(err);
          },
          ontimeout: (err) => {
            clearTimeout(timer);
            reject(err);
          }
        };

        if (method !== 'GET' && method !== 'HEAD') {
          request.data =
            tracker === 'YUS' || tracker === 'OTW' || tracker === 'HHD'
              ? new URLSearchParams(postData).toString()
              : JSON.stringify(postData);
        }

        GM_xmlhttpRequest(request);
      })
        .then((response) => {
          if (response.status === 200) {
            const parsed = parseJsonResponse(response, tracker);
            if (!parsed && tracker === 'TL') {
              displayAlert('TL returned a non-JSON response. Check login or rate limits.');
            }
            return parsed;
          } else if (tracker === 'FL' && [400, 401, 403, 429, 503].includes(response.status)) {
            const errorMessage = getFileListErrorMessage(response);
            if (debug) {
              console.log(`Raw response from ${tracker}`, response.responseText);
            }
            console.warn(`${tracker} returned ${response.status}: ${errorMessage}`);
            displayAlert(`${tracker} returned ${response.status}: ${errorMessage}`);
            return null;
          } else if (response.status === 401) {
            const jsonResponse = parseJsonResponse(response, tracker);
            console.log(`raw response from ${tracker}`, response.responseText);
            if (
              tracker === 'RTF' &&
              jsonResponse &&
              jsonResponse.error &&
              jsonResponse.message === 'Invalid API token'
            ) {
              displayAlert('Something went wrong with RTF API token');
            }
            return { status: 'REAUTH_NEEDED' };
          } else if (response.status === 404) {
            const jsonResponse = parseJsonResponse(response, tracker);
            if (debug) {
              console.log(`raw response from ${tracker}`, response.responseText);
            }
            if (tracker === 'AvistaZ' || tracker === 'CinemaZ' || tracker === 'PHD') {
              console.log(`${tracker} reached successfully but no results were returned`);
            }
            return jsonResponse;
          } else if (
            (response.status === 412 &&
              (tracker === 'AvistaZ' || tracker === 'CinemaZ' || tracker === 'PHD')) ||
            (response.status === 500 && tracker === 'RTF')
          ) {
            console.log(`raw response from ${tracker}`, response.responseText);
            return { status: 'REAUTH_NEEDED' };
          } else if (response.status === 422) {
            console.log(`Confirmed Auth details incorrect for ${tracker}`);
            return null;
          } else if (response.status === 502) {
            console.warn(`502 bad gateway for ${tracker}`);
            displayAlert(`502 bad gateway for ${tracker}`);
            return null;
          } else {
            if (debug) {
              console.log(`Raw response from ${tracker}`, response.responseText);
            }
            console.warn(`Error: ${tracker} HTTP ${response.status} Error.`);
            displayAlert(`${tracker} returned not ok`);
            return null;
          }
        })
        .catch((error) => {
          console.error(`Error with request to ${tracker}:`, error);
          return null;
        });
    };

    const fetch_url = async (query_url, tracker) => {
      const response = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          url: query_url,
          method: 'GET',
          onload: (res) => {
            resolve(res);
          },
          onerror: (err) => {
            reject(err);
          },
          onabort: (err) => {
            reject(err);
          },
          ontimeout: (err) => {
            reject(err);
          }
        });
      });

      if (response.status === 200) {
        const contentType = response.responseHeaders
          .match(/content-type: ?([^;]+)/i)[1]
          .toLowerCase();
        const parser = new DOMParser();
        let result;

        if (contentType.includes('xml')) {
          const xmlDoc = parser.parseFromString(response.responseText, 'text/xml');

          if (tracker === 'MTV') {
            if (debug) {
              const items = parseMTVItems(xmlDoc);
              if (items.length === 0) {
                console.log(`No response XML from ${tracker}`, response.responseText);
              }
              console.log(`XML array from ${tracker}`, items);
            }
            result = xmlDoc;
          } else if (tracker === 'TVV') {
            if (debug) {
              const items = parseTVVItems(xmlDoc);
              if (items.length === 0) {
                console.log(`No response XML from ${tracker}`, response.responseText);
              }
              console.log(`XML array from ${tracker}`, items);
            }
            result = xmlDoc;
          }
        } else {
          result = parser.parseFromString(response.responseText, 'text/html').body;
        }

        return result;
      } else {
        console.warn(`${tracker} Error: HTTP ${response.status} Error.`);
        console.warn(`${tracker} Error: HTTP ${response.responseHeaders} Error.`);
        console.warn(`${tracker} Error: HTTP ${response.responseText} Error.`);
        displayAlert(`${tracker} returned not ok`);
        return null;
      }
    };

    const parseMTVItems = (xmlDoc) => {
      const parseItem = (item) => {
        const getTextContent = (tagName) =>
          item.getElementsByTagName(tagName)[0]?.textContent || '';
        const attributes = Array.from(item.getElementsByTagName('torznab:attr')).reduce(
          (acc, attr) => {
            acc[attr.getAttribute('name')] = attr.getAttribute('value');
            return acc;
          },
          {}
        );

        return {
          title: getTextContent('title'),
          guid: getTextContent('guid'),
          link: getTextContent('link'),
          comments: getTextContent('comments'),
          pubDate: getTextContent('pubDate'),
          size: getTextContent('size'),
          files: getTextContent('files'),
          grabs: getTextContent('grabs'),
          categories: Array.from(item.getElementsByTagName('category')).map(
            (cat) => cat.textContent
          ),
          description: getTextContent('description'),
          enclosure: {
            url: item.getElementsByTagName('enclosure')[0]?.getAttribute('url') || '',
            length: item.getElementsByTagName('enclosure')[0]?.getAttribute('length') || '',
            type: item.getElementsByTagName('enclosure')[0]?.getAttribute('type') || ''
          },
          torznabAttributes: attributes
        };
      };

      return Array.from(xmlDoc.getElementsByTagName('item')).map(parseItem);
    };

    const parseTVVItems = (xmlDoc) => {
      const parseShow = (show) => {
        const getTextContent = (tagName) =>
          show.getElementsByTagName(tagName)[0]?.textContent || '';
        const torrents = Array.from(show.getElementsByTagName('torrent')).map((torrent) => ({
          title: getTextContent('title'),
          year: getTextContent('year'),
          torrentInfo: Array.from(torrent.getElementsByTagName('torrentinfo')).map((info) => ({
            type: info.getAttribute('type'),
            value: info.textContent
          })),
          link: getTextContent('link'),
          fileCount: getTextContent('filecount'),
          dateRelative: getTextContent('date[type="relative"]'),
          dateUnix: getTextContent('date[type="UNIX"]'),
          sizeFormatted: getTextContent('size[type="formatted"]'),
          sizeBytes: getTextContent('size[type="bytes"]'),
          snatches: getTextContent('snatches'),
          seeders: getTextContent('seeders'),
          leechers: getTextContent('leechers')
        }));

        return {
          title: getTextContent('title'),
          year: getTextContent('year'),
          imdb: getTextContent('imdb'),
          link: getTextContent('link'),
          category: getTextContent('category'),
          tags: getTextContent('tags'),
          dateRelative: getTextContent('date[type="relative"]'),
          dateUnix: getTextContent('date[type="UNIX"]'),
          sizeFormatted: getTextContent('size[type="formatted"]'),
          sizeBytes: getTextContent('size[type="bytes"]'),
          comments: getTextContent('comments'),
          snatches: getTextContent('snatches'),
          seeders: getTextContent('seeders'),
          leechers: getTextContent('leechers'),
          torrents: torrents
        };
      };

      return Array.from(xmlDoc.getElementsByTagName('show')).map(parseShow);
    };

    const generateGUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(/[xy]/g, function (c) {
        const r = Math.trunc(Math.random() * 16),
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const pageTitle = getUnit3dTitleMeta();
    let pageYear = pageTitle.year;

    // Check if a valid year was extracted from the page
    if (!pageYear) {
      console.error('No valid year found in page title');
      return [];
    }

    const fetch_tracker = async (...args) => {
      const [
        tracker,
        imdb_id,
        show_name,
        show_nbl_name,
        red_name,
        tvdbId,
        tvmazeId,
        year,
        timeout = timer,
        retryCount = 0
      ] = args;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          console.warn(`${tracker} is timing out`);
          displayAlert(`${tracker} is timing out`);
          resolve([]);
        }, timeout);
        let query_url = '';
        let api_query_url = '';
        let post_query_url = '';
        let postData = {};

        if (tracker === 'HDB') {
          post_query_url = 'https://hdbits.org/api/torrents';
          postData = {
            username: HDB_USER_NAME,
            passkey: HDB_PASS_KEY,
            imdb: { id: imdb_id.split('tt')[1] }
          };
        } else if (tracker === 'BTN') {
          post_query_url = 'https://api.broadcasthe.net/';
          if (tvdbId) {
            postData = {
              jsonrpc: '2.0',
              id: generateGUID().substring(0, 8),
              method: 'getTorrentsSearch',
              params: [
                BTN_API_TOKEN,
                {
                  tvdb: tvdbId
                },
                50 // Results per page
              ]
            };
          } else {
            // Fallback to search method if TVDB ID is not available
            postData = {
              jsonrpc: '2.0',
              id: generateGUID().substring(0, 8),
              method: 'getTorrentsSearch',
              params: [
                BTN_API_TOKEN,
                {
                  search: show_name
                },
                6
              ]
            };
          }
        } else if (tracker === 'MTV') {
          query_url =
            'https://www.morethantv.me/api/torznab?t=search&apikey=' +
            MTV_API_TOKEN +
            '&imdbid=' +
            imdb_id;
        } else if (tracker === 'ANT') {
          post_query_url =
            'https://anthelion.me/api.php?apikey=' +
            ANT_API_TOKEN +
            '&t=movie&imdbid=' +
            imdb_id +
            '&o=json';
        } else if (tracker === 'BHD') {
          post_query_url = 'https://beyond-hd.me/api/torrents/' + BHD_API_TOKEN;
          postData = {
            action: 'search',
            rsskey: BHD_RSS_KEY,
            imdb_id: imdb_id.split('tt')[1]
          };
        } else if (tracker === 'BLU') {
          api_query_url = 'https://blutopia.cc/api/torrents/filter';
        } else if (tracker === 'TIK') {
          api_query_url = 'https://cinematik.net/api/torrents/filter';
        } else if (tracker === 'Aither') {
          api_query_url = 'https://aither.cc/api/torrents/filter';
        } else if (tracker === 'RFX') {
          api_query_url = 'https://reelflix.cc/api/torrents/filter';
        } else if (tracker === 'OE') {
          api_query_url = 'https://onlyencodes.cc/api/torrents/filter';
        } else if (tracker === 'HUNO') {
          api_query_url = 'https://hawke.uno/api/torrents/filter';
        } else if (tracker === 'IFL') {
          api_query_url = 'https://infinitylibrary.net/api/torrents/filter';
        } else if (tracker === 'LST') {
          api_query_url = 'https://lst.gg/api/torrents/filter';
        } else if (tracker === 'LDU') {
          api_query_url = 'https://theldu.to/api/torrents/filter';
        } else if (tracker === 'ULCX') {
          api_query_url = 'https://upload.cx/api/torrents/filter';
        } else if (tracker === 'DP') {
          api_query_url = 'https://darkpeers.org/api/torrents/filter';
        } else if (tracker === 'SP') {
          api_query_url = 'https://seedpool.org/api/torrents/filter';
        } else if (tracker === 'RAS') {
          api_query_url = 'https://rastastugan.org/api/torrents/filter';
        } else if (tracker === 'LUME') {
          api_query_url = 'https://luminarr.me/api/torrents/filter';
        } else if (tracker === 'RMC') {
          api_query_url = 'https://retro-movies.club/api/torrents/filter';
        } else if (tracker === 'TVV') {
          if (easysearching) {
            query_url =
              'https://tv-vault.me/xmlsearch.php?query=get&torrent_pass=' +
              TVV_TORR_PASS +
              '&imdbid=' +
              imdb_id;
          } else {
            query_url =
              'https://tv-vault.me/xmlsearch.php?query=get&torrent_pass=' +
              TVV_TORR_PASS +
              '&imdbid=' +
              imdb_id +
              '&xmladd-x-currentseed=1';
          }
        } else if (tracker === 'RTF') {
          post_query_url =
            'https://retroflix.club/api/torrent?imdbId=' +
            imdb_id +
            '&page=1&itemsPerPage=50&sort=torrent.createdAt&direction=desc';
        } else if (tracker === 'NBL') {
          const nblBase =
            'https://nebulance.io/api.php?action=search&api_key=' +
            encodeURIComponent(NBL_API_TOKEN) +
            '&per_page=100&page=0';

          if (tvmazeId) {
            post_query_url = `${nblBase}&tvmaze=${encodeURIComponent(tvmazeId)}`;
          } else if (imdb_id) {
            post_query_url = `${nblBase}&imdb=${encodeURIComponent(imdb_id)}`;
          } else {
            const fallbackSeries = String(show_nbl_name || show_name || '').trim();
            if (fallbackSeries.length >= 3) {
              post_query_url = `${nblBase}&series=${encodeURIComponent(fallbackSeries)}`;
            } else {
              console.warn('NBL skipped: no valid tvmaze/imdb/series search term');
              clearTimeout(timer);
              resolve([]);
              return;
            }
          }
        } else if (tracker === 'AvistaZ') {
          post_query_url = 'https://avistaz.to/api/v1/jackett/torrents?imdb=' + imdb_id;
        } else if (tracker === 'CinemaZ') {
          post_query_url = 'https://cinemaz.to/api/v1/jackett/torrents?imdb=' + imdb_id;
        } else if (tracker === 'PHD') {
          post_query_url = 'https://privatehd.to/api/v1/jackett/torrents?imdb=' + imdb_id;
        } else if (tracker === 'FL') {
          post_query_url =
            'https://filelist.io/api.php?action=search-torrents&type=imdb&query=' +
            encodeURIComponent(imdb_id);
        } else if (tracker === 'CG') {
          query_url =
            'https://cinemageddon.net/browse.php?search=' + imdb_id + '&orderby=size&dir=DESC';
        } else if (tracker === 'KG') {
          query_url =
            'https://karagarga.in/browse.php?sort=size&search=' +
            imdb_id +
            '&search_type=imdb&d=DESC';
        } else if (tracker === 'PxHD') {
          query_url =
            'https://pixelhd.me/torrents.php?groupname=&year=&tmdbover=&tmdbunder=&tmdbid=&imdbover=&imdbunder=&imdbid=' +
            imdb_id +
            '&order_by=time&order_way=desc&taglist=&tags_type=1&filter_cat%5B1%5D=1&filterTorrentsButton=Filter+Torrents';
        } else if (tracker === 'TL') {
          post_query_url = 'https://www.torrentleech.cc/torrents/browse/list/imdbID/' + imdb_id;
        } else if (tracker === 'MTeam') {
          post_query_url = 'https://api.m-team.cc/api/torrent/search';
          postData = {
            imdb: imdb_id,
            pageSize: '100'
            //"mode": "adult"
          };
        } else if (tracker === 'RED') {
          const releasetype = 'Soundtrack';
          const page = 1;
          post_query_url = `https://redacted.sh/ajax.php?action=browse&searchstr=${encodeURIComponent(red_name)}&releasetype=${releasetype}&year=${pageYear}&page=${page}`;
        } else if (tracker === 'OPS') {
          const releasetype = 'Soundtrack';
          post_query_url = `https://orpheus.network/ajax.php?action=browse&searchstr=${encodeURIComponent(red_name)}&releasetype=${releasetype}&year=${pageYear}`;
        } else if (tracker === 'AR') {
          post_query_url =
            'https://alpharatio.cc/ajax.php?action=browse&searchstr=' +
            show_nbl_name +
            ' ' +
            year +
            '&taglist=&tags_type=1&order_by=time&order_way=desc&scene=&freetorrent=&uploader=&archive=&filter_cat[1]=1&filter_cat[2]=1&filter_cat[3]=1&filter_cat[4]=1&filter_cat[5]=1&filter_cat[6]=1&filter_cat[7]=1&filter_cat[8]=1&filter_cat[9]=1&filter_cat[10]=1&filter_cat[11]=1&filter_cat[12]=1&filter_cat[13]=1&filter_cat[14]=1&filter_cat[15]=1&filter_cat[16]=1&filter_cat[17]=1';
        } else if (tracker === 'YUS') {
          post_query_url = `https://yu-scene.net/api/torrents/filter?imdbId=${imdb_id.split('tt')[1]}&perPage=100`;
          postData = {
            api_token: YUS_API_TOKEN
          };
        } else if (tracker === 'OTW') {
          post_query_url = `https://oldtoons.world/api/torrents/filter?imdbId=${imdb_id.split('tt')[1]}&perPage=100`;
          postData = {
            api_token: OTW_API_TOKEN
          };
        } else if (tracker === 'HHD') {
          post_query_url = `https://homiehelpdesk.net/api/torrents/filter?imdbId=${imdb_id.split('tt')[1]}&perPage=100`;
          postData = {
            api_token: HHD_API_TOKEN
          };
        } else if (tracker === 'PTP') {
          if (!PTP_API_USER || !PTP_API_KEY) {
            console.warn('PTP skipped: API user/key missing');
            displayAlert('PTP skipped: API user/key missing');
            clearTimeout(timer);
            resolve([]);
            return;
          }
          const imdbNumeric = String(imdb_id || '').replace(/^tt/i, '');
          post_query_url =
            'https://passthepopcorn.me/torrents.php?json=1&imdb=' + encodeURIComponent(imdbNumeric);
        }
        const performRequest = async () => {
          if (use_post_instead(tracker) === true) {
            try {
              const result = await post_json(post_query_url, tracker, postData, timeout);

              if (debug) {
                console.log(`URL for ${tracker}`, post_query_url);
                console.log(`Post data for ${tracker}`, postData);
                console.log(`Result from ${tracker}`, result);
              }

              clearTimeout(timer); // Clear the timer on successful fetch

              if (result) {
                try {
                  if (
                    tracker !== 'MTeam' &&
                    isTrackerSelected(tracker) &&
                    result.status === 'REAUTH_NEEDED'
                  ) {
                    if (retryCount < 2) {
                      console.warn(
                        `Re-authentication needed for ${tracker}. Will attempt to re-authenticate and retry...`
                      );
                      clearToken(tracker);
                      const loginFunction = eval(`${tracker.toLowerCase()}_login`);
                      const loginResult = await loginFunction();

                      if (loginResult && loginResult.token) {
                        GM_config.set(`${tracker.toLowerCase()}_token`, loginResult.token);
                        await GM_config.save();

                        console.log(
                          `Re-authentication successful for ${tracker}. Fetching data...`
                        );
                        resolve(
                          await fetch_tracker(
                            tracker,
                            imdb_id,
                            show_name,
                            show_nbl_name,
                            tvdbId,
                            tvmazeId,
                            timeout,
                            retryCount + 1
                          )
                        );
                      } else {
                        console.warn(`Re-authentication failed for ${tracker}.`);
                        resolve([]);
                      }
                    } else {
                      console.error(
                        `Max retries reached for ${tracker}. Aborting re-authentication attempts.`
                      );
                      displayAlert(`Re-authentication attempts have failed for ${tracker}.`);
                      resolve([]);
                    }
                    clearTimeout(timer);
                  } else if (result?.results && tracker === 'BHD') {
                    if (result.status_code !== 1) {
                      console.warn('BHD returned a failed status code');
                      resolve([]);
                    }
                    if (result.total_results === 0) {
                      console.log('BHD reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from BHD');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (result?.data && tracker === 'HDB') {
                    switch (result.status) {
                      case 1:
                        console.warn('HDB: Failure (something bad happened)');
                        resolve([]);
                        break;
                      case 4:
                        console.warn('HDB: Auth data missing');
                        resolve([]);
                        break;
                      case 5:
                        console.warn('HDB: Auth failed (incorrect username / password)');
                        resolve([]);
                        break;
                      default:
                        if (result.data.length === 0) {
                          console.log('HDB reached successfully but no results were returned');
                          resolve([]);
                        } else {
                          console.log('Data fetched successfully from HDB');
                          resolve(get_post_torrent_objects(tracker, result));
                        }
                    }
                  } else if (tracker === 'NBL' && result?.error) {
                    const nblMessage = result.error?.message || 'Unknown NBL API error';
                    console.warn(`NBL API error: ${nblMessage}`);
                    displayAlert(`NBL API error: ${nblMessage}`);
                    resolve([]);
                  } else if (tracker === 'NBL' && (Array.isArray(result?.items) || result?.count)) {
                    const nblCount = Number.isFinite(Number(result?.count))
                      ? Number(result.count)
                      : Array.isArray(result?.items)
                        ? result.items.length
                        : 0;
                    if (nblCount === 0) {
                      console.log('NBL reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from NBL');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'BTN' && result?.result) {
                    if (result.result.results === '0') {
                      console.log('BTN reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from BTN');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (result?.item && tracker === 'ANT') {
                    if (result.item.length === 0) {
                      console.log('ANT reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from ANT');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'RTF' && Array.isArray(result)) {
                    if (result.length === 0) {
                      console.log('RTF reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from RTF');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (
                    result?.data &&
                    (tracker === 'AvistaZ' || tracker === 'CinemaZ' || tracker === 'PHD')
                  ) {
                    console.log(`Data fetched successfully from ${tracker}`);
                    resolve(get_post_torrent_objects(tracker, result));
                  } else if (result?.torrentList && tracker === 'TL') {
                    if (result.numFound === '0') {
                      console.log('TL reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from TL');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'FL') {
                    if (result.length === 0) {
                      console.log('FL reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log(`Data fetched successfully from ${tracker}`);
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'MTeam') {
                    if (result.code !== '0') {
                      console.warn('M-Team returned a failed status code');
                      displayAlert(`Too many requests to ${tracker}`);
                      resolve([]);
                    } else if (!result.data || !result.data.data || result.data.data.length === 0) {
                      console.log('M-Team reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from M-Team');
                      resolve(get_post_torrent_objects(tracker, result.data.data, null));
                    }
                  } else if (tracker === 'RED') {
                    if (result.response.results.length === 0) {
                      console.log('RED reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log(`Data fetched successfully from ${tracker}`);
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'OPS') {
                    if (result.response.results.length === 0) {
                      console.log('OPS reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log(`Data fetched successfully from ${tracker}`);
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'AR') {
                    if (result.response.results.length === 0) {
                      console.log('AR reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log(`Data fetched successfully from ${tracker}`);
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'PTP') {
                    const torrents = Array.isArray(result?.Torrents)
                      ? result.Torrents
                      : Array.isArray(result?.torrents)
                        ? result.torrents
                        : [];
                    const movies = Array.isArray(result?.Movies)
                      ? result.Movies
                      : Array.isArray(result?.movies)
                        ? result.movies
                        : [];
                    if (torrents.length === 0 && movies.length === 0) {
                      console.log('PTP reached successfully but no results were returned');
                      resolve([]);
                    } else {
                      console.log('Data fetched successfully from PTP');
                      resolve(get_post_torrent_objects(tracker, result));
                    }
                  } else if (tracker === 'YUS' || tracker === 'OTW' || tracker === 'HHD') {
                    if (!result.data || result.data.length === 0) {
                      console.log(`${tracker} reached successfully but no results were returned`);
                      resolve([]);
                    } else {
                      console.log(`Data fetched successfully from ${tracker}`);
                      // YUS and OTW have the same structure as other API trackers, just pass the result directly
                      resolve(get_api_torrent_objects(tracker, result));
                    }
                  } else {
                    console.warn(`Unhandled tracker or response format for ${tracker}`);
                    resolve([]);
                  }
                } catch (processingError) {
                  console.error(`Error processing result from ${tracker}:`, processingError);
                  resolve([]);
                }
              } else {
                console.log(`{tracker} returned a NULL result from post_json`);
                resolve([]);
              }
            } catch (error) {
              clearTimeout(timer);
              console.warn(`Error fetching data from ${tracker}:`, error);
              resolve([]);
            }
          } else if (use_api_instead(tracker) === false) {
            fetch_url(query_url, tracker)
              .then((result) => {
                if (debug) {
                  console.log(`URL for ${tracker}`, query_url);
                }
                clearTimeout(timer); // Clear the timer on successful fetch
                let movie_exist = is_movie_exist(tracker, result);
                if (movie_exist === false) {
                  console.log(`${tracker} reached successfully but no results were returned`);
                  resolve([]);
                } else {
                  if (debug) {
                    console.log(`Result from ${tracker}`, result);
                  }
                  console.log(`Data fetched successfully from ${tracker}`);
                  resolve(get_torrent_objs(tracker, result));
                }
              })
              .catch((error) => {
                console.warn(`Error fetching data from ${tracker}:`);
                resolve([]); // Resolve with an empty array if there's an error
              });
          } else {
            // Create query parameters for GET request
            const queryParams = new URLSearchParams();
            queryParams.append('imdbId', imdb_id.split('tt')[1]);
            queryParams.append('perPage', '100');

            const fullApiUrl = `${api_query_url}?${queryParams.toString()}`;

            // Create API token mapping for headers
            const apiHeadersMapping = {
              BLU: { Authorization: `Bearer ${BLU_API_TOKEN}`, Accept: 'application/json' },
              TIK: { Authorization: `Bearer ${TIK_API_TOKEN}`, Accept: 'application/json' },
              Aither: { Authorization: `Bearer ${AITHER_API_TOKEN}`, Accept: 'application/json' },
              RFX: { Authorization: `Bearer ${RFX_API_TOKEN}`, Accept: 'application/json' },
              OE: { Authorization: `Bearer ${OE_API_TOKEN}`, Accept: 'application/json' },
              HUNO: { Authorization: `Bearer ${HUNO_API_TOKEN}`, Accept: 'application/json' },
              IFL: { Authorization: `Bearer ${IFL_API_TOKEN}`, Accept: 'application/json' },
              LST: { Authorization: `Bearer ${LST_API_TOKEN}`, Accept: 'application/json' },
              YUS: { Authorization: `Bearer ${YUS_API_TOKEN}`, Accept: 'application/json' },
              LDU: { Authorization: `Bearer ${LDU_API_TOKEN}`, Accept: 'application/json' },
              ULCX: { Authorization: `Bearer ${ULCX_API_TOKEN}`, Accept: 'application/json' },
              OTW: { Authorization: `Bearer ${OTW_API_TOKEN}`, Accept: 'application/json' },
              DP: { Authorization: `Bearer ${DP_API_TOKEN}`, Accept: 'application/json' },
              SP: { Authorization: `Bearer ${SP_API_TOKEN}`, Accept: 'application/json' },
              RAS: { Authorization: `Bearer ${RAS_API_TOKEN}`, Accept: 'application/json' },
              HHD: { Authorization: `Bearer ${HHD_API_TOKEN}`, Accept: 'application/json' },
              LUME: { Authorization: `Bearer ${LUME_API_TOKEN}`, Accept: 'application/json' },
              RMC: { Authorization: `Bearer ${RMC_API_TOKEN}`, Accept: 'application/json' }
            };

            const headers = apiHeadersMapping[tracker] || { Accept: 'application/json' };

            new Promise((resolveRequest, rejectRequest) => {
              GM_xmlhttpRequest({
                url: fullApiUrl,
                method: 'GET',
                headers: headers,
                onload: (res) => {
                  resolveRequest(res);
                },
                onerror: (err) => {
                  rejectRequest(err);
                }
              });
            })
              .then((response) => {
                clearTimeout(timer); // Clear the timer on successful fetch
                if (response.status < 200 || response.status >= 300) {
                  throw new Error('Failed to fetch data');
                }
                if (debug) {
                  console.log(`HTML response from ${tracker}`, response);
                }
                return JSON.parse(response.responseText);
              })
              .then((data) => {
                if (data.data.length === 0 || data.data === '404') {
                  if (debug) {
                    console.log(`Data array from ${tracker}`, data);
                  }
                  console.log(`${tracker} reached successfully but no results were returned`);
                } else {
                  if (debug) {
                    console.log(`Data array from ${tracker}`, data.data);
                  }
                  console.log(`Data fetched successfully from ${tracker}`);
                }
                resolve(get_api_torrent_objects(tracker, data));
              })
              .catch((error) => {
                console.warn(`Error fetching data from ${tracker}:`, error);
                resolve([]);
              });
          }
        };

        performRequest().catch(reject);
      });
    };

    let queue = [];
    let isProcessing = false;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const processQueue = async () => {
      if (isProcessing) return;
      isProcessing = true;

      while (queue.length > 0) {
        const { tracker, info_hash, resolve, reject } = queue.shift();
        try {
          const seeding_status = await fetch_seeding_status(tracker, info_hash);
          resolve(seeding_status);
        } catch (error) {
          reject(error);
        }
        await delay(100);
      }

      isProcessing = false;
    };

    // This function will add API calls to the queue
    const enqueueSeedingStatus = (tracker, info_hash) => {
      return new Promise((resolve, reject) => {
        queue.push({ tracker, info_hash, resolve, reject });
        processQueue();
      });
    };

    // Original fetch_seeding_status with slight modifications to be used in the queue
    const fetch_seeding_status = async (tracker, info_hash) => {
      const post_query_url = 'https://beyond-hd.me/api/torrents/' + BHD_API_TOKEN;
      const postData = {
        action: 'search',
        rsskey: BHD_RSS_KEY,
        info_hash: info_hash,
        seeding: 1
      };

      const result = await post_json(post_query_url, tracker, postData);

      if (debug) {
        console.log(`Seeding result from ${tracker}`, result);
      }

      if (result && result.status_code === 1 && result.total_results === 1) {
        return 'seeding'; // Return 'seeding' status if valid
      } else {
        return 'default'; // Return 'default' if no valid seeding status is found
      }
    };

    function normalizePtpBoolean(value) {
      return value === true || value === 1 || /^(?:1|true|yes)$/i.test(String(value || '').trim());
    }

    function normalizePtpSizeBytes(value) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Number.parseInt(String(value || '').replaceAll(/[^\d]/g, ''), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function normalizePtpTime(value) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 100000000000 ? Math.floor(value / 1000) : Math.floor(value);
      }
      const text = String(value || '').trim();
      if (!text) return 0;
      const parsed = toUnixTime(text);
      return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : 0;
    }

    function getPtpTorrentId(torrent) {
      return firstNonEmpty(
        torrent?.Id,
        torrent?.ID,
        torrent?.TorrentId,
        torrent?.TorrentID,
        torrent?.torrentid,
        torrent?.torrent_id
      );
    }

    function getPtpGroupId(movie, torrent) {
      return firstNonEmpty(
        torrent?.GroupId,
        torrent?.GroupID,
        torrent?.groupid,
        torrent?.group_id,
        movie?.GroupId,
        movie?.GroupID,
        movie?.id
      );
    }

    function getPtpReleaseName(movie, torrent) {
      const direct = firstNonEmpty(
        torrent?.ReleaseName,
        torrent?.releaseName,
        torrent?.FileName,
        torrent?.fileName,
        torrent?.Name,
        torrent?.name
      );
      if (direct)
        return String(direct)
          .replace(/\.torrent$/i, '')
          .trim();

      return [
        movie?.Title,
        movie?.Year ? `(${movie.Year})` : '',
        torrent?.Resolution,
        torrent?.Quality,
        torrent?.Source,
        torrent?.Codec,
        torrent?.Container,
        torrent?.ReleaseGroup ? `-${torrent.ReleaseGroup}` : ''
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    function getPtpReleaseType(torrent, releaseName) {
      const source = `${torrent?.ReleaseType || ''} ${torrent?.RemasterTitle || ''} ${
        torrent?.Source || ''
      } ${torrent?.Container || ''} ${torrent?.Codec || ''} ${releaseName || ''}`;
      if (/\b(?:bdmv|dvd[59]|full\s*disc|complete\s*(?:uhd\s*)?blu-?ray)\b/i.test(source)) {
        return 'Full Disc';
      }
      if (/\bremux\b/i.test(source)) return 'Remux';
      if (/\bweb[ ._-]?dl\b/i.test(source)) return 'WEB-DL';
      if (/\bweb[ ._-]?rip\b/i.test(source)) return 'WEBRip';
      if (/\bhdtv\b/i.test(source)) return 'HDTV';
      if (/\b(?:x264|x265|h\.?264|h\.?265|hevc|avc)\b/i.test(source)) return 'Encode';
      return '';
    }

    function getPtpDiscount(torrent) {
      return normalizePtpBoolean(
        firstNonEmpty(
          torrent?.FreeTorrent,
          torrent?.Freeleech,
          torrent?.PersonalFL,
          torrent?.NeutralLeech
        )
      )
        ? simplediscounts
          ? 'FL'
          : 'Freeleech'
        : 'None';
    }

    function getPtpPageUrl(groupId, torrentId) {
      const base = 'https://passthepopcorn.me/torrents.php';
      if (groupId && torrentId)
        return `${base}?id=${groupId}&torrentid=${torrentId}#torrent${torrentId}`;
      if (groupId) return `${base}?id=${groupId}`;
      return `${base}?torrentid=${torrentId}`;
    }

    const get_post_torrent_objects = async (tracker, postData, isMiniSeries) => {
      let torrent_objs = [];

      if (tracker === 'PTP') {
        try {
          const movies = Array.isArray(postData?.Movies)
            ? postData.Movies
            : Array.isArray(postData?.movies)
              ? postData.movies
              : Array.isArray(postData?.Torrents) || Array.isArray(postData?.torrents)
                ? [postData]
                : [];

          torrent_objs = movies
            .flatMap((movie) => {
              const torrents = Array.isArray(movie?.Torrents)
                ? movie.Torrents
                : Array.isArray(movie?.torrents)
                  ? movie.torrents
                  : [];

              return torrents.map((torrent) => {
                const torrentId = getPtpTorrentId(torrent);
                if (!torrentId) return null;

                const groupId = getPtpGroupId(movie, torrent);
                const releaseName = getPtpReleaseName(movie, torrent);
                const sizeBytes = normalizePtpSizeBytes(
                  firstNonEmpty(torrent?.Size, torrent?.size, torrent?.Bytes, torrent?.bytes)
                );
                const time = normalizePtpTime(
                  firstNonEmpty(
                    torrent?.UploadTime,
                    torrent?.Uploaded,
                    torrent?.Time,
                    torrent?.AddedTime,
                    torrent?.created_at
                  )
                );
                const groupText = firstNonEmpty(
                  torrent?.ReleaseGroup,
                  torrent?.Group,
                  extractExternalReleaseGroup({ groupId: '' }, releaseName)
                );
                const type = getPtpReleaseType(torrent, releaseName);

                const torrentObj = {
                  api_size: sizeBytes,
                  datasetRelease: releaseName,
                  size: sizeBytes > 0 ? Math.round(sizeBytes / 1024 / 1024) : 0,
                  info_text: releaseName,
                  tracker,
                  site: tracker,
                  snatch: firstNonEmpty(torrent?.Snatched, torrent?.Snatches, torrent?.snatched, 0),
                  seed: firstNonEmpty(torrent?.Seeders, torrent?.seeders, 0),
                  leech: firstNonEmpty(torrent?.Leechers, torrent?.leechers, 0),
                  download_link: `https://passthepopcorn.me/torrents.php?action=download&id=${encodeURIComponent(
                    torrentId
                  )}`,
                  torrent_page: getPtpPageUrl(groupId, torrentId),
                  externalId: torrentId,
                  discount: getPtpDiscount(torrent),
                  internal: normalizePtpBoolean(
                    firstNonEmpty(torrent?.Internal, torrent?.internal)
                  ),
                  scene: normalizePtpBoolean(firstNonEmpty(torrent?.Scene, torrent?.scene)),
                  checked: normalizePtpBoolean(firstNonEmpty(torrent?.Checked, torrent?.checked)),
                  goldenPopcorn: normalizePtpBoolean(
                    firstNonEmpty(torrent?.GoldenPopcorn, torrent?.goldenPopcorn)
                  ),
                  status: 'default',
                  groupId: groupText,
                  type,
                  time,
                  year: firstNonEmpty(movie?.Year, torrent?.Year),
                  filecount: Number.parseInt(
                    firstNonEmpty(torrent?.FileCount, torrent?.NumFiles, torrent?.Files, ''),
                    10
                  )
                };

                return {
                  ...torrentObj,
                  quality: get_torrent_quality(torrentObj)
                };
              });
            })
            .filter(Boolean);
        } catch (error) {
          console.error('An error occurred while processing PTP tracker:', error);
        }
      } else if (tracker === 'BHD') {
        // Process for BHD tracker
        try {
          // Await the resolved promise from Promise.all, then filter
          const results = await Promise.all(
            postData.results.map(async (d) => {
              const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
              const api_size = Number.parseInt(d.size); // Original size
              const info_hash = d.info_hash;

              const originalInfoText = d.name;
              let infoText = originalInfoText;
              let groupText = '';

              // Custom processing logic for BHD
              if (/S\d{1,2}E\d{1,2}/.test(infoText) === false) {
                const groups = goodGroups(); // Array of good group names
                const badGroupsList = badGroups(); // Array of bad group names
                let matchedGroup = null;
                let badGroupFound = false;

                // Remove bad groups if found
                for (const badGroup of badGroupsList) {
                  if (infoText.includes(badGroup)) {
                    badGroupFound = true;
                    infoText = infoText.replace(badGroup, '').trim();
                    break;
                  }
                }

                if (!badGroupFound) {
                  // Check for good groups if no bad group was found
                  for (const group of groups) {
                    if (infoText.includes(group)) {
                      matchedGroup = group;
                      break;
                    }
                  }
                }

                if (matchedGroup) {
                  groupText = matchedGroup;
                  if (improved_tags) {
                    infoText = infoText.replace(groupText, '').trim();
                  }
                }

                // Further processing of the infoText
                const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                if (match) {
                  groupText = match[1].replaceAll(/[^a-z0-9]/gi, '');
                  if (improved_tags) {
                    infoText = infoText.replace(`-${match[1]}`, '').trim();
                  }
                }

                // Handle HDR, DV, and resolution tags
                const dv = d.dv === 1;
                const hdr10 = d.hdr10 === 1;
                const hdr10Plus = d['hdr10+'] === 1;

                if (hdr10Plus) {
                  if (infoText.includes('HDR')) {
                    infoText = infoText.replace('HDR', 'HDR10+');
                  } else if (!infoText.includes('HDR10+')) {
                    infoText += ' HDR10+';
                  }
                } else if (hdr10) {
                  if (infoText.includes('HDR')) {
                    infoText = infoText.replace('HDR', 'HDR10');
                  } else if (!infoText.includes('HDR10')) {
                    infoText += ' HDR10';
                  }
                }

                // Append DV tag if necessary
                if (dv) {
                  if (hdr10Plus && !infoText.includes('DV HDR10+')) {
                    infoText =
                      'DV HDR10+ ' +
                      infoText.replace('HDR10+', '').replace('HDR10', '').replace('DV', '').trim();
                  } else if (hdr10 && !infoText.includes('DV HDR10')) {
                    infoText =
                      'DV HDR10 ' +
                      infoText.replace('HDR10+', '').replace('HDR10', '').replace('DV', '').trim();
                  } else if (!infoText.includes('DV')) {
                    infoText = 'DV ' + infoText;
                  }
                }

                if (d.commentary === 1) {
                  infoText = 'Commentary ' + infoText;
                }

                const resolution = d.type;
                if (resolution) {
                  let resText = resolution;
                  const originalResText = resText;

                  resText = resText.replaceAll(/UHD\s?.{0,3}/g, '2160p');
                  resText = resText.replaceAll(/BD\s?.{0,3}/g, '1080p');

                  if (!infoText.includes(resText)) {
                    infoText = `${resText} ${infoText}`;
                  }

                  if (!infoText.includes(originalResText)) {
                    infoText = `${originalResText} ${infoText}`;
                  }
                  if (
                    !infoText.toLowerCase().includes('remux') &&
                    (originalResText.includes('UHD') || originalResText.includes('BD'))
                  ) {
                    infoText = 'm2ts ' + infoText;
                  }
                }
              }

              // Additional processing for discounts and time
              const discounted = d.freeleech === 1 ? 'FL' : 'None';
              const time = toUnixTime(d.created_at);
              const folderName = String(d.folder_name ?? '').trim();
              const hasFolderName = folderName && folderName !== '/' && folderName !== '\\';
              const parsedFilesAsCount = Number.parseInt(
                typeof d.files === 'number' || typeof d.files === 'string' ? d.files : '',
                10
              );
              const parsedBhdFilecount = Number.parseInt(
                d.file_count ?? d.filecount ?? d.numfiles ?? d.num_files ?? '',
                10
              );

              const bhdFiles = hasFolderName
                ? [{ name: folderName, size: Number.parseInt(d.size, 10) || null }]
                : [];

              const bhdFilecount = Number.isFinite(parsedBhdFilecount)
                ? parsedBhdFilecount
                : Number.isFinite(parsedFilesAsCount)
                  ? parsedFilesAsCount
                  : hasFolderName
                    ? 2
                    : 1;

              if (Number.isNaN(time)) {
                return null;
              }

              const torrentObj = {
                api_size: api_size,
                datasetRelease: d.name
                  .replaceAll(/DDP \d\.\d/g, (match) => {
                    return match.replace(' ', '');
                  })
                  .replaceAll(' ', '.'),
                size: size,
                info_text: infoText,
                tracker: tracker,
                site: tracker,
                snatch: d.times_completed || 0,
                seed: d.seeders || 0,
                leech: d.leechers || 0,
                download_link: d.download_url || '',
                torrent_page: d.url || '',
                externalId: resolveBhdTorrentId(d),
                description: firstNonEmpty(
                  d.description,
                  d.descr,
                  d.bbcode_description,
                  d.release_description
                ),
                mediainfo: firstNonEmpty(d.mediainfo, d.media_info, d.mediaInfo),
                bdinfo: firstNonEmpty(d.bdinfo, d.bd_info, d.bdInfo),
                discount: discounted,
                internal: d.internal === 1,
                status: 'default',
                groupId: groupText,
                bhd_rating: d.bhd_rating,
                tmdb_rating: d.tmdb_rating,
                imdb_rating: d.imdb_rating,
                year: d.year,
                type: d.type,
                time: time,
                files: bhdFiles,
                filecount: bhdFilecount
              };

              // Call the second API to check the seeding status using info_hash
              if (bhdSeeding) {
                if (info_hash) {
                  console.log('Processing seeding status from BHD, this might take a moment');
                  const seeding_status = await enqueueSeedingStatus(tracker, info_hash);
                  torrentObj.status = seeding_status; // Update the status based on the second API call
                }
              }

              // Map additional properties if necessary
              const mappedObj = {
                ...torrentObj,
                quality: get_torrent_quality(torrentObj)
              };

              return mappedObj;
            })
          );

          // After awaiting Promise.all, filter the results to remove any null objects
          torrent_objs = results.filter((obj) => obj !== null);
        } catch (error) {
          console.error('An error occurred while processing BHD tracker:', error);
        }
      } else if (tracker === 'HDB') {
        try {
          torrent_objs = postData.data
            .map((d) => {
              const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
              const api_size = Number.parseInt(d.size); // Original size

              const originalInfoText = d.name;
              let infoText = originalInfoText;
              if (/S\d{1,2}E\d{1,2}/.test(infoText) === false) {
                let groupText = '';
                const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                const badGroupsList = badGroups(); // Get the list of bad group names
                let matchedGroup = null;
                let badGroupFound = false;

                // Check for bad groups
                for (const badGroup of badGroupsList) {
                  if (infoText.includes(badGroup)) {
                    badGroupFound = true;
                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                    break;
                  }
                }

                if (!badGroupFound) {
                  // Check for good groups if no bad group was found
                  for (const group of groups) {
                    if (infoText.includes(group)) {
                      matchedGroup = group;
                      break;
                    }
                  }

                  if (matchedGroup) {
                    groupText = matchedGroup;
                    if (improved_tags) {
                      infoText = infoText.replace(groupText, '').trim();
                    }
                  } else {
                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                    if (match) {
                      groupText = match[1]; // Use match[1] to get the capturing group
                      groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                      if (improved_tags) {
                        infoText = infoText.replace(`-${match[1]}`, '').trim();
                      }
                    }
                  }
                }

                const id = d.id;
                const baseURL = 'https://hdbits.org/download.php/';
                const pageURL = 'https://hdbits.org/details.php?id=';
                const torrent = d.filename;
                const normalizedFilename = String(d.filename || '')
                  .replaceAll(/\.torrent$/g, '')
                  .trim();
                const parsedNumfiles = Number.parseInt(d.numfiles, 10);
                const hdbFilecount = Number.isFinite(parsedNumfiles) ? parsedNumfiles : null;
                const hdbFiles = normalizedFilename
                  ? [{ name: normalizedFilename, size: Number.parseInt(d.size, 10) || null }]
                  : [];
                let releaseName = d.filename.replaceAll(/\.torrent$/g, '');

                if (releaseName.length > 20) {
                  const pattern = /-\w+\.\w{3}$/;
                  const match = releaseName.match(pattern);
                  if (match) {
                    releaseName = releaseName.substring(0, releaseName.length - match[0].length);
                  }
                } else {
                  releaseName = d.name;
                }

                const pullExtention = releaseName.match(/[^.]+$/);
                const extention = pullExtention ? pullExtention[0] : null;

                // Check if web.dl, web-dl, or webdl is present in the infoText
                const isWebDL = /web.dl|web-dl|webdl/i.test(infoText);
                let webtags = '';
                if (isWebDL) {
                  const tagsArray = d.tags.filter((tag) => !infoText.includes(tag));

                  // Create webTagsArray only if web.dl, web-dl, or webdl is present
                  const webTagsArray = tagsArray.map((tag) => `${tag.toLowerCase()}.web.dl`);
                  const tags = webTagsArray.join(' ');
                  webtags = tags;

                  if (tags && improved_tags) {
                    infoText += ` ${tags}`;
                  }
                } else {
                  const tagsArray = d.tags.filter((tag) => !infoText.includes(tag));
                  const tags = tagsArray.join(' ');

                  if (tags && improved_tags) {
                    infoText += ` ${tags}`;
                  }
                }
                if (improved_tags) {
                  const bdType = get_blu_ray_disc_type(d.size);
                  if (
                    improved_tags &&
                    infoText.includes('Blu-ray') &&
                    (infoText.includes('1080p') || infoText.includes('2160p'))
                  ) {
                    infoText = `${bdType} ${infoText}`;
                  }
                  const isAudioOnly = d.type_category === 6;
                  if (isAudioOnly) {
                    infoText = infoText += 'Audio Only Track';
                  }
                  if (extention) {
                    infoText = `${infoText} ${extention}`;
                  }
                  if (
                    (!extention && releaseName.includes('Blu-ray')) ||
                    releaseName.includes('BluRay') ||
                    releaseName.includes('BLURAY')
                  ) {
                    let lower = releaseName.toLowerCase();
                    if (!lower.includes('remux')) {
                      infoText = 'm2ts ' + infoText;
                    }
                  }
                  if (
                    (releaseName && releaseName.includes('Blu-ray')) ||
                    releaseName.includes('BluRay') ||
                    (releaseName.includes('BLURAY') && !infoText.includes('Blu-ray'))
                  ) {
                    infoText = infoText += ' Blu-ray';
                  }
                }
                const isRemux = d.type_medium === 5;
                const isDisc = d.type_medium === 1;
                const isCapture = d.type_medium === 4;
                const isInternal = d.type_origin === 1;
                const isDoco = d.type_category === 3;
                const isTv = d.type_category === 2;
                const get_hdb_discount = () => {
                  let discountText = 'None';

                  if (d.freeleech === 'yes') {
                    discountText = simplediscounts ? 'FL' : 'Freeleech';
                  } else if (isInternal || isRemux || isDisc || isCapture || isTv || isDoco) {
                    discountText = simplediscounts ? '50%' : '50% Freeleech';
                  }

                  return discountText;
                };
                const status = d.torrent_status || 'default';

                const time = Number.parseInt(d.utadded);
                if (Number.isNaN(time)) {
                  return null;
                }

                const torrentObj = {
                  api_size: api_size,
                  datasetRelease: releaseName,
                  size: size,
                  info_text: infoText,
                  tracker: tracker,
                  site: tracker,
                  snatch: d.times_completed || 0,
                  seed: d.seeders || 0,
                  leech: d.leechers || 0,
                  download_link: `${baseURL}${torrent}?id=${id}&passkey=${HDB_PASS_KEY}`,
                  torrent_page: `${pageURL}${id}`,
                  externalId: id,
                  description: firstNonEmpty(d.descr, d.description),
                  mediainfo: firstNonEmpty(d.mediainfo, d.media_info),
                  bdinfo: firstNonEmpty(d.bdinfo, d.bd_info),
                  discount: d.freeleech === 'yes' ? 'Freeleech' : 'None',
                  internal: isInternal,
                  exclusive: d.type_exclusive === 1,
                  status: status,
                  groupId: groupText,
                  time: time,
                  tags: webtags,
                  files: hdbFiles,
                  filecount: hdbFilecount
                };

                const mappedObj = {
                  ...torrentObj,
                  quality: get_torrent_quality(torrentObj),
                  discount: get_hdb_discount()
                };

                return mappedObj;
              } else {
                return null;
              }
            })
            .filter((obj) => obj !== null); // Filter out any null objects
        } catch (error) {
          console.error('An error occurred while processing HDB tracker:', error);
        }
      } else if (tracker === 'NBL') {
        try {
          const nblItems = Array.isArray(postData?.items)
            ? postData.items
            : Array.isArray(postData?.result?.items)
              ? postData.result.items
              : [];

          if (nblItems.length > 0) {
            torrent_objs = nblItems
              .map((d) => {
                const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                const api_size = Number.parseInt(d.size); // Original size

                const originalInfoText = d.rls_name;
                let infoText = originalInfoText;
                if (/S\d{1,2}E\d{1,2}/.test(infoText) === false) {
                  let groupText = '';
                  const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                  const badGroupsList = badGroups(); // Get the list of bad group names
                  let matchedGroup = null;
                  let badGroupFound = false;

                  // Check for bad groups
                  for (const badGroup of badGroupsList) {
                    if (infoText.includes(badGroup)) {
                      badGroupFound = true;
                      infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                      break;
                    }
                  }

                  if (!badGroupFound) {
                    // Check for good groups if no bad group was found
                    for (const group of groups) {
                      if (infoText.includes(group)) {
                        matchedGroup = group;
                        break;
                      }
                    }

                    if (matchedGroup) {
                      groupText = matchedGroup;
                      if (improved_tags) {
                        infoText = infoText.replace(groupText, '').trim();
                      }
                    } else {
                      const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                      if (match) {
                        groupText = match[1]; // Use match[1] to get the capturing group
                        groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                        if (improved_tags) {
                          infoText = infoText.replace(`-${match[1]}`, '').trim();
                        }
                      }
                    }
                  }
                  let cleanTheText = infoText;
                  const replaceFullStops = (text) => {
                    const placeholders = [];
                    let placeholderIndex = 0;
                    let tempText = String(text);

                    const keepPatterns = [
                      /\b\d\.\d\b/g,
                      /\bDD\d\.\d\b/g,
                      /\bDDP\d\.\d\b/g,
                      /\bDD\+\d\.\d\b/g,
                      /\bTrueHD \d\.\d\b/g,
                      /\bDTS\d\.\d\b/g,
                      /\bAC3\d\.\d\b/g,
                      /\bAAC\d\.\d\b/g,
                      /\bOPUS\d\.\d\b/g,
                      /\bMP3\d\.\d\b/g,
                      /\bFLAC\d\.\d\b/g,
                      /\bLPCM\d\.\d\b/g,
                      /\bH\.264\b/g,
                      /\bH\.265\b/g,
                      /\bDTS-HD MA \d\.\d\b/g,
                      /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                    ];

                    keepPatterns.forEach((pattern) => {
                      tempText = tempText.replace(pattern, (match) => {
                        const placeholder = `__PLACEHOLDER_${placeholderIndex}__`;
                        placeholderIndex += 1;
                        placeholders.push([placeholder, match]);
                        return placeholder;
                      });
                    });

                    // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                    tempText = tempText.replaceAll(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                    tempText = tempText.replaceAll(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                    tempText = tempText.replaceAll(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                    tempText = tempText.replaceAll(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                    placeholders.forEach(([placeholder, original]) => {
                      tempText = tempText.replaceAll(placeholder, original);
                    });

                    tempText = tempText
                      .replaceAll('DD+', 'DD+ ')
                      .replaceAll('DDP', 'DD+ ')
                      .replaceAll('DoVi', 'DV')
                      .replaceAll('(', '')
                      .replaceAll(')', '')
                      .replaceAll(/\bhdr\b/g, 'HDR')
                      .replaceAll(/\bweb\b/g, 'WEB')
                      .replaceAll(/\bbluray\b/g, 'BluRay')
                      .replaceAll(/\bh254\b/g, 'H.264')
                      .replaceAll(/\bh265\b/g, 'H.265')
                      .replaceAll(/\b\w/g, (char) => char.toUpperCase())
                      .replaceAll(/\bX264\b/g, 'x264')
                      .replaceAll(/\bX265\b/g, 'x265')
                      .replaceAll(/\b - \b/g, ' ');

                    return tempText;
                  };

                  const id = d.torrent_id || d.group_id;
                  const pageURL = 'https://nebulance.io/details.php?id=';

                  const inputTime = d.rls_utc;
                  let time = toUnixTime(inputTime);
                  if (Number.isNaN(time)) {
                    return null;
                  }

                  const nblFilesFromList = Array.isArray(d.file_list)
                    ? d.file_list
                        .map((entry) => {
                          const name = String(entry || '').trim();
                          if (!name) return null;
                          return { name, size: null };
                        })
                        .filter(Boolean)
                    : [];

                  const nblFilesFromEncoded =
                    nblFilesFromList.length === 0
                      ? String(d.files || '')
                          .split('|||')
                          .map((entry) => {
                            const trimmed = String(entry || '').trim();
                            if (!trimmed) return null;
                            const match = /^(.*?)\{\{\{(\d+)\}\}\}$/.exec(trimmed);
                            if (match) {
                              return {
                                name: String(match[1] || '').trim(),
                                size: Number.parseInt(match[2], 10) || null
                              };
                            }
                            return { name: trimmed, size: null };
                          })
                          .filter((file) => file && file.name)
                      : [];

                  const nblFiles =
                    nblFilesFromList.length > 0 ? nblFilesFromList : nblFilesFromEncoded;
                  const parsedNblFilecount = Number.parseInt(d.filecount ?? d.fileCount, 10);
                  const nblFilecount = Number.isFinite(parsedNblFilecount)
                    ? parsedNblFilecount
                    : nblFiles.length > 0
                      ? nblFiles.length
                      : null;

                  const torrentObj = {
                    api_size: api_size,
                    datasetRelease: originalInfoText,
                    size: size,
                    info_text: replaceFullStops(cleanTheText),
                    tracker: tracker,
                    site: tracker,
                    snatch: d.snatch || 0,
                    seed: d.seed || 0,
                    leech: d.leech || 0,
                    download_link: d.download,
                    torrent_page: `${pageURL}${id}`,
                    discount: 'None',
                    status: 'default',
                    groupId: groupText,
                    time: time,
                    files: nblFiles,
                    filecount: nblFilecount
                  };

                  // Map additional properties if necessary
                  const mappedObj = {
                    ...torrentObj,
                    quality: get_torrent_quality(torrentObj)
                  };

                  return mappedObj;
                } else {
                  return null;
                }
              })
              .filter((obj) => obj !== null); // Filter out any null objects
          }
        } catch (error) {
          console.error('An error occurred while processing NBL tracker:', error);
        }
      } else if (tracker === 'BTN') {
        try {
          let season2 = false;
          if (postData.result && postData.result.torrents) {
            torrent_objs = Object.values(postData.result.torrents)
              .map((d) => {
                const size = Number.parseInt(d.Size / (1024 * 1024)); // Convert size to MiB
                const api_size = Number.parseInt(d.Size); // Original size

                const originalInfoText = d.ReleaseName;
                let infoText = originalInfoText;
                if (
                  /S\d{1,2}E\d{1,2}/.test(infoText) ||
                  (!isMiniSeriesFromSpan && /S\d{2}/.test(infoText))
                ) {
                  return null;
                } else {
                  let groupText = '';
                  const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                  const badGroupsList = badGroups(); // Get the list of bad group names
                  let matchedGroup = null;
                  let badGroupFound = false;

                  // Check for bad groups
                  for (const badGroup of badGroupsList) {
                    if (infoText.includes(badGroup)) {
                      badGroupFound = true;
                      infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                      break;
                    }
                  }

                  if (!badGroupFound) {
                    // Check for good groups if no bad group was found
                    for (const group of groups) {
                      if (infoText.includes(group)) {
                        matchedGroup = group;
                        break;
                      }
                    }

                    if (matchedGroup) {
                      groupText = matchedGroup;
                      if (improved_tags) {
                        infoText = infoText.replace(groupText, '').trim();
                      }
                    } else {
                      const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                      if (match) {
                        groupText = match[1]; // Use match[1] to get the capturing group
                        groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                        groupText = groupText.replace('Z0N3', 'D-Z0N3');
                        if (improved_tags) {
                          infoText = infoText.replace(`-${match[1]}`, '').trim();
                        }
                      }
                    }
                  }
                  let cleanTheText = infoText;
                  const replaceFullStops = (text) => {
                    const protectedChunks = [];
                    let tempText = String(text);

                    const keepPatterns = [
                      /\b\d\.\d\b/g,
                      /\bDD\d\.\d\b/g,
                      /\bDDP\d\.\d\b/g,
                      /\bDD\+\d\.\d\b/g,
                      /\bTrueHD \d\.\d\b/g,
                      /\bDTS\d\.\d\b/g,
                      /\bAC3\d\.\d\b/g,
                      /\bAAC\d\.\d\b/g,
                      /\bOPUS\d\.\d\b/g,
                      /\bMP3\d\.\d\b/g,
                      /\bFLAC\d\.\d\b/g,
                      /\bLPCM\d\.\d\b/g,
                      /\bH\.264\b/g,
                      /\bH\.265\b/g,
                      /\bDTS-HD MA \d\.\d\b/g,
                      /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                    ];

                    keepPatterns.forEach((pattern) => {
                      tempText = tempText.replace(pattern, (match) => {
                        const token = `__KEEP_DOT_${protectedChunks.length}__`;
                        protectedChunks.push({ token, value: match });
                        return token;
                      });
                    });

                    // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                    tempText = tempText.replaceAll(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                    tempText = tempText.replaceAll(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                    tempText = tempText.replaceAll(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                    tempText = tempText.replaceAll(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                    protectedChunks.forEach(({ token, value }) => {
                      tempText = tempText.replaceAll(token, value);
                    });

                    tempText = tempText
                      .replaceAll('DD+', 'DD+ ')
                      .replaceAll('DDP', 'DD+ ')
                      .replaceAll('DoVi', 'DV')
                      .replaceAll('(', '')
                      .replaceAll(')', '')
                      .replaceAll(/\bhdr\b/g, 'HDR')
                      .replaceAll(/\bweb\b/g, 'WEB')
                      .replaceAll(/\bbluray\b/g, 'BluRay')
                      .replaceAll(/\bh254\b/g, 'H.264')
                      .replaceAll(/\bh265\b/g, 'H.265')
                      .replaceAll(/\b\w/g, (char) => char.toUpperCase())
                      .replaceAll(/\bX264\b/g, 'x264')
                      .replaceAll(/\bX265\b/g, 'x265')
                      .replaceAll(/\b - \b/g, ' ');

                    return tempText;
                  };
                  let updatedText = replaceFullStops(cleanTheText);
                  if (updatedText.includes('S02')) {
                    season2 = true;
                  }
                  const extension = d.Container;
                  if (improved_tags) {
                    if (extension) {
                      updatedText = `${updatedText} ${extension}`;
                    }
                  }
                  const id = d.GroupID;
                  const tid = d.TorrentID;
                  const pageURL = 'https://broadcasthe.net/torrents.php?id=';

                  const time = Number.parseInt(d.Time);
                  if (Number.isNaN(time)) {
                    return null;
                  }

                  const torrentObj = {
                    api_size: api_size,
                    datasetRelease: originalInfoText,
                    size: size,
                    info_text: updatedText,
                    tracker: tracker,
                    site: tracker,
                    snatch: Number.parseInt(d.Snatched) || 0,
                    seed: Number.parseInt(d.Seeders) || 0,
                    leech: Number.parseInt(d.Leechers) || 0,
                    download_link: d.DownloadURL,
                    torrent_page: `${pageURL}${id}&torrentid=${tid}`,
                    discount: 'None',
                    status: 'default',
                    groupId: groupText,
                    time: time,
                    season2: season2
                  };

                  const mappedObj = {
                    ...torrentObj,
                    quality: get_torrent_quality(torrentObj)
                  };

                  return mappedObj;
                }
              })
              .filter((obj) => obj !== null); // Filter out any null objects
          }
        } catch (error) {
          console.error('An error occurred while processing BTN tracker:', error);
        }
      } else if (tracker === 'ANT') {
        try {
          torrent_objs = postData.item
            .map((d) => {
              const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
              const api_size = Number.parseInt(d.size); // Original size

              let infoText = '';
              const filesCount = d.fileCount;
              const parsedFilecount = Number.parseInt(filesCount, 10);
              const antFilecount = Number.isFinite(parsedFilecount) ? parsedFilecount : null;
              const antFiles = Array.isArray(d.files)
                ? d.files
                    .map((file) => {
                      const name = String(file?.name || '').trim();
                      if (!name) return null;
                      const parsedSize = Number.parseInt(file?.size, 10);
                      return {
                        name,
                        size: Number.isFinite(parsedSize) ? parsedSize : null
                      };
                    })
                    .filter(Boolean)
                : [];

              if (antFiles.length === 1) {
                infoText = antFiles[0].name;
                const lastDotIndex = infoText.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                  infoText = infoText.substring(0, lastDotIndex);
                }
              } else if (d.fileName) {
                infoText = d.fileName
                  .replaceAll(/\.\d+\.torrent$/g, '.torrent')
                  .replaceAll(/\.torrent$/g, '');
              } else if (d.name) {
                infoText = String(d.name);
              }

              const inputTime = d.pubDate;
              let time = toUnixTime(inputTime);
              if (Number.isNaN(time)) {
                return null;
              }

              let download = d.link;
              let cleanedLink = download.replaceAll('&amp;', '&');

              const torrentObj = {
                api_size: api_size,
                datasetRelease: infoText,
                size: size,
                info_text: infoText,
                tracker: tracker,
                site: tracker,
                snatch: d.grabs || 0,
                seed: d.seeders || 0,
                leech: d.leechers || 0,
                download_link: cleanedLink || '',
                torrent_page: d.guid || '',
                discount: 'None',
                status: 'default',
                groupId: d.releaseGroup,
                time: time,
                filecount: antFilecount,
                files: antFiles
              };

              // Map additional properties if necessary
              const mappedObj = {
                ...torrentObj,
                quality: get_torrent_quality(torrentObj)
              };
              return mappedObj;
            })
            .filter((obj) => obj !== null); // Filter out any null objects
        } catch (error) {
          console.error('An error occurred while processing ANT tracker:', error);
        }
      } else if (tracker === 'RTF') {
        try {
          torrent_objs = postData
            .map((d) => {
              const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
              const api_size = Number.parseInt(d.size); // Original size

              const inputTime = d.created_at;
              let time = toUnixTime(inputTime);
              if (Number.isNaN(time)) {
                return null;
              }

              let infoText = d.name;
              let groupText = '';
              const groups = goodGroups();
              const badGroupsList = badGroups();
              let matchedGroup = null;
              let badGroupFound = false;

              for (const badGroup of badGroupsList) {
                if (infoText.includes(badGroup)) {
                  badGroupFound = true;
                  infoText = infoText.replace(badGroup, '').trim();
                  break;
                }
              }

              if (!badGroupFound) {
                for (const group of groups) {
                  if (infoText.includes(group)) {
                    matchedGroup = group;
                    break;
                  }
                }

                if (matchedGroup) {
                  groupText = matchedGroup;
                  if (improved_tags) {
                    infoText = infoText.replace(groupText, '').trim();
                  }
                } else {
                  const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                  if (match) {
                    groupText = match[1];
                    groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                    if (improved_tags) {
                      infoText = infoText.replace(`-${match[1]}`, '').trim();
                    }
                  }
                }
              }
              let download = d.url;

              const torrentObj = {
                api_size: api_size,
                datasetRelease: infoText,
                size: size,
                info_text: infoText,
                tracker: tracker,
                site: tracker,
                snatch: d.times_completed || 0,
                seed: d.seeders || 0,
                leech: d.leechers || 0,
                download_link: download || '',
                torrent_page: d.url || '',
                discount: 'None',
                status: 'default',
                groupId: groupText,
                time: time
              };

              const mappedObj = {
                ...torrentObj,
                quality: get_torrent_quality(torrentObj)
              };

              return mappedObj;
            })
            .filter((obj) => obj !== null); // Filter out any null objects
        } catch (error) {
          console.error('An error occurred while processing RTF tracker:', error);
        }
      } else if (tracker === 'AvistaZ' || tracker === 'CinemaZ' || tracker === 'PHD') {
        try {
          torrent_objs = postData.data
            .map((d) => {
              const size = Number.parseInt(d.file_size / (1024 * 1024)); // Convert size to MiB
              const api_size = Number.parseInt(d.file_size); // Original size

              const inputTime = d.created_at;
              let time = toUnixTime(inputTime);
              if (Number.isNaN(time)) {
                return null;
              }

              const torrentObj = {
                api_size: api_size,
                datasetRelease: d.file_name,
                size: size,
                info_text: d.file_name,
                tracker: tracker,
                site: tracker,
                snatch: d.completed || 0,
                seed: d.seed || 0,
                leech: d.leech || 0,
                download_link: d.download,
                torrent_page: d.url || '',
                discount: 'None',
                status: 'default',
                //groupId: d.releaseGroup,
                time: time
              };

              // Map additional properties if necessary
              const mappedObj = {
                ...torrentObj,
                quality: get_torrent_quality(torrentObj)
              };
              return mappedObj;
            })
            .filter((obj) => obj !== null); // Filter out any null objects
        } catch (error) {
          console.error(`An error occurred while processing ${tracker} tracker:`, error);
        }
      } else if (tracker === 'TL') {
        try {
          if (postData.torrentList) {
            torrent_objs = Object.values(postData.torrentList)
              .map((d) => {
                const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                const api_size = Number.parseInt(d.size); // Original size

                const originalInfoText = d.name;
                let infoText = originalInfoText;
                if (
                  /S\d{1,2}E\d{1,2}/.test(infoText) ||
                  (!isMiniSeriesFromSpan && /S\d{2}/.test(infoText))
                ) {
                  return null;
                } else {
                  let groupText = '';
                  const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                  const badGroupsList = badGroups(); // Get the list of bad group names
                  let matchedGroup = null;
                  let badGroupFound = false;

                  // Check for bad groups
                  for (const badGroup of badGroupsList) {
                    if (infoText.includes(badGroup)) {
                      badGroupFound = true;
                      infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                      break;
                    }
                  }

                  if (!badGroupFound) {
                    // Check for good groups if no bad group was found
                    for (const group of groups) {
                      if (infoText.includes(group)) {
                        matchedGroup = group;
                        break;
                      }
                    }

                    if (matchedGroup) {
                      groupText = matchedGroup;
                      if (improved_tags) {
                        infoText = infoText.replace(groupText, '').trim();
                      }
                    } else {
                      const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                      if (match) {
                        groupText = match[1]; // Use match[1] to get the capturing group
                        groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                        groupText = groupText.replace('Z0N3', 'D-Z0N3');
                        if (improved_tags) {
                          infoText = infoText.replace(`-${match[1]}`, '').trim();
                        }
                      }
                    }
                  }
                  const inputTime = d.addedTimestamp;
                  let time = toUnixTime(inputTime);
                  if (Number.isNaN(time)) {
                    return null;
                  }
                  const id = d.fid;
                  const down = d.filename;

                  const match = infoText.match(' TS ');
                  if (match) {
                    if (improved_tags) {
                      infoText = infoText.replace(' TS ', 'CAM_RIP').trim();
                    }
                  }
                  const match1 = infoText.match('HDTS');
                  if (match1) {
                    if (improved_tags) {
                      infoText = infoText.replace('HDTS', 'CAM_RIP').trim();
                    }
                  }
                  const match2 = infoText.match('TELESYNC');
                  if (match2) {
                    if (improved_tags) {
                      infoText = infoText.replace('TELESYNC', 'CAM_RIP').trim();
                    }
                  }
                  const match3 = infoText.match(' CAM ');
                  if (match3) {
                    if (improved_tags) {
                      infoText = infoText.replace(' CAM ', 'CAM_RIP').trim();
                    }
                  }
                  const cat = d.categoryID;
                  let uhd = '2160p';
                  let hd = '1080p';
                  if (cat === 47 || infoText.includes('2160P')) {
                    if (infoText.includes('2160P')) {
                      infoText = infoText.replace('2160P', uhd);
                    } else {
                      infoText = `${uhd} ${infoText}`;
                    }
                  }

                  if (cat === 13 || infoText.includes('1080P')) {
                    if (infoText.includes('1080P')) {
                      infoText = infoText.replace('1080P', hd);
                    } else {
                      infoText = `${hd} ${infoText}`;
                    }
                  }
                  let isFL = d.tags;
                  let discount;
                  if (isFL.includes('FREELEECH')) {
                    if (simplediscounts) {
                      discount = 'FL';
                    } else {
                      discount = 'Freeleech';
                    }
                  } else {
                    discount = 'None';
                  }

                  const torrentObj = {
                    api_size: api_size,
                    datasetRelease: originalInfoText,
                    size: size,
                    info_text: infoText,
                    tracker: tracker,
                    site: tracker,
                    snatch: Number.parseInt(d.completed) || 0,
                    seed: Number.parseInt(d.seeders) || 0,
                    leech: Number.parseInt(d.Leechers) || 0,
                    download_link: `https://www.torrentleech.cc/download/${id}/${down}`,
                    torrent_page: `https://www.torrentleech.cc/torrent/${id}`,
                    discount: discount,
                    status: 'default',
                    groupId: groupText,
                    time: time
                  };

                  const mappedObj = {
                    ...torrentObj,
                    quality: get_torrent_quality(torrentObj)
                  };

                  return mappedObj;
                }
              })
              .filter((obj) => obj !== null); // Filter out any null objects
          }
        } catch (error) {
          console.error('An error occurred while processing TL tracker:', error);
        }
      } else if (tracker === 'FL') {
        try {
          torrent_objs = postData
            .map((d) => {
              const size = Number.parseInt(d.size / (1024 * 1024)); // Convert size to MiB
              const api_size = Number.parseInt(d.size); // Original size
              let infoText = d.name;
              if (
                /S\d{1,2}E\d{1,2}/.test(infoText) ||
                (!isMiniSeriesFromSpan && /S\d{2}/.test(infoText))
              ) {
                return null;
              } else {
                const inputTime = d.upload_date;
                let time = toUnixTime(inputTime);
                if (Number.isNaN(time)) {
                  return null;
                }
                let groupText = '';
                const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                const badGroupsList = badGroups(); // Get the list of bad group names
                let matchedGroup = null;
                let badGroupFound = false;

                // Check for bad groups
                for (const badGroup of badGroupsList) {
                  if (infoText.includes(badGroup)) {
                    badGroupFound = true;
                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                    break;
                  }
                }

                if (!badGroupFound) {
                  // Check for good groups if no bad group was found
                  for (const group of groups) {
                    if (infoText.includes(group)) {
                      matchedGroup = group;
                      break;
                    }
                  }

                  if (matchedGroup) {
                    groupText = matchedGroup;
                    if (improved_tags) {
                      infoText = infoText.replace(groupText, '').trim();
                    }
                  } else {
                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                    if (match) {
                      groupText = match[1]; // Use match[1] to get the capturing group
                      groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                      groupText = groupText.replace('Z0N3', 'D-Z0N3');
                      if (improved_tags) {
                        infoText = infoText.replace(`-${match[1]}`, '').trim();
                      }
                    }
                  }
                }
                const url = 'https://filelist.io/details.php?id=';
                const id = d.id;
                let isFL = d.freeleech;
                let discount;
                if (isFL === 1) {
                  if (simplediscounts) {
                    discount = 'FL';
                  } else {
                    discount = 'Freeleech';
                  }
                } else {
                  discount = 'None';
                }
                const parsedFilecount = Number.parseInt(d.files ?? d.fileCount ?? d.filecount, 10);
                const flFilecount = Number.isFinite(parsedFilecount) ? parsedFilecount : null;

                const torrentObj = {
                  api_size: api_size,
                  datasetRelease: d.name,
                  size: size,
                  info_text: infoText,
                  tracker: tracker,
                  site: tracker,
                  snatch: d.times_completed || 0,
                  seed: d.seeders || 0,
                  leech: d.leechers || 0,
                  download_link: d.download_link,
                  torrent_page: `${url}${id}`,
                  discount: discount,
                  internal: d.internal === 1,
                  double_upload: d.doubleup === 1,
                  groupId: groupText,
                  time: time,
                  filecount: flFilecount
                };

                // Map additional properties if necessary
                const mappedObj = {
                  ...torrentObj,
                  quality: get_torrent_quality(torrentObj)
                };
                return mappedObj;
              }
            })
            .filter((obj) => obj !== null); // Filter out any null objects
        } catch (error) {
          console.error('An error occurred while processing FL tracker:', error);
        }
      } else if (tracker === 'MTeam') {
        try {
          torrent_objs = postData
            .map((d) => {
              const size = Number.parseInt(d.size / (1024 * 1024));
              const api_size = Number.parseInt(d.size);

              const inputTime = d.createdDate;
              let time = toUnixTime(inputTime);
              if (Number.isNaN(time)) {
                return null;
              }
              const url = 'https://kp.m-team.cc/detail/';
              const id = d.id;

              const status = d.status || {};
              const snatch = Number.parseInt(status.timesCompleted) || 0;
              const seed = Number.parseInt(status.seeders) || 0;
              const leech = Number.parseInt(status.leechers) || 0;
              let discount = status.discount || 'None';

              if (discount !== 'None') {
                if (simplediscounts) {
                  if (discount === 'FREE') {
                    discount = 'FL';
                  } else if (discount === 'PERCENT_50') {
                    discount = '50%';
                  } else if (discount === 'NORMAL') {
                    discount = 'None';
                  }
                } else if (discount === 'FREE') {
                  discount = 'Freeleech';
                } else if (discount === 'PERCENT_50') {
                  discount = '50% Freeleech';
                } else if (discount === 'NORMAL') {
                  discount = 'None';
                }
              }

              let infoText = d.name;

              let groupText = '';
              const groups = goodGroups();
              const badGroupsList = badGroups();
              let matchedGroup = null;
              let badGroupFound = false;

              for (const badGroup of badGroupsList) {
                if (infoText.includes(badGroup)) {
                  badGroupFound = true;
                  infoText = infoText.replace(badGroup, '').trim();
                  break;
                }
              }

              if (!badGroupFound) {
                for (const group of groups) {
                  if (infoText.includes(group)) {
                    matchedGroup = group;
                    break;
                  }
                }

                if (matchedGroup) {
                  groupText = matchedGroup;
                  if (improved_tags) {
                    infoText = infoText.replace(groupText, '').trim();
                  }
                } else {
                  const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                  if (match) {
                    groupText = match[1];
                    groupText = groupText.replaceAll(/[^a-z0-9]/gi, '');
                    if (improved_tags) {
                      infoText = infoText.replace(`-${match[1]}`, '').trim();
                    }
                  }
                }
              }

              const torrentObj = {
                api_size: api_size,
                datasetRelease: d.name,
                size: size,
                info_text: infoText,
                tracker: tracker,
                site: tracker,
                snatch: snatch,
                seed: seed,
                leech: leech,
                download_link: `https://kp.m-team.cc/download/${id}`,
                torrent_page: `${url}${id}`,
                teamId: `${id}`,
                discount: discount,
                groupId: groupText,
                time: time
              };

              // Map additional properties if necessary
              const mappedObj = {
                ...torrentObj,
                quality: get_torrent_quality(torrentObj)
              };
              return mappedObj;
            })
            .filter((obj) => obj !== null); // Filter out any null objects
        } catch (error) {
          console.error('An error occurred while processing M-Team tracker:', error);
        }
      } else if (tracker === 'RED') {
        try {
          const pageYear = getUnit3dTitleMeta().year;

          // Check if a valid year was extracted from the page
          if (!pageYear) {
            console.error('No valid year found in page title');
            return [];
          }

          // Filter the results to match the extracted year
          torrent_objs = postData.response.results
            .filter((d) => d.groupYear === pageYear)
            .flatMap((d) =>
              d.torrents.map((torrent) => {
                const sizeInMiB = Number.parseInt(torrent.size / (1024 * 1024));
                const api_size = Number.parseInt(torrent.size);

                const inputTime = torrent.time;
                let time = toUnixTime(inputTime);
                if (Number.isNaN(time)) {
                  return null;
                }

                let infoText = improved_tags
                  ? ''
                  : `${torrent.media} / ${torrent.format} / ${torrent.encoding}`;

                const groupId = d.groupId;
                const Id = torrent.torrentId;
                const torrentLink = `https://redacted.sh/torrents.php?id=${groupId}&torrentid=${Id}#torrent${Id}`;

                // Construct the torrent object
                const torrentObj = {
                  api_size: api_size,
                  datasetRelease: d.groupName,
                  size: sizeInMiB,
                  info_text: infoText,
                  tracker: tracker,
                  site: tracker,
                  snatch: torrent.snatches || 0,
                  seed: torrent.seeders || 0,
                  leech: torrent.leechers || 0,
                  download_link: `https://redacted.sh/download/${Id}`,
                  torrent_page: torrentLink || '',
                  discount: torrent.isFreeleech ? 'Freeleech' : 'None',
                  status: 'default',
                  groupId: d.groupName,
                  time: time,
                  quality: 'Soundtrack',
                  media: torrent.media,
                  format: torrent.format,
                  encoding: torrent.encoding,
                  title: torrent.remasterTitle,
                  year: torrent.remasterYear,
                  log: torrent.logScore,
                  cue: torrent.hasCue,
                  redId: `${Id}`,
                  catalog: torrent.remasterCatalogueNumber,
                  album: d.groupName
                };

                return torrentObj;
              })
            )
            .filter((obj) => obj !== null) // Remove null objects
            .filter((obj) => {
              if (media && obj.media) {
                if (obj.media.toLowerCase().trim() !== media.toLowerCase().trim()) {
                  return false; // Skip if media doesn't match
                }
              }
              if (format && obj.format) {
                if (obj.format.toLowerCase().trim() !== format.toLowerCase().trim()) {
                  return false; // Skip if format doesn't match
                }
              }

              return true; // Include if all conditions pass
            });
        } catch (error) {
          console.error('An error occurred while processing RED tracker:', error);
        }
      } else if (tracker === 'OPS') {
        try {
          torrent_objs = postData.response.results
            .filter((d) => d.releaseType === 'Soundtrack')
            .flatMap((d) =>
              d.torrents.map((torrent) => {
                const sizeInMiB = Number.parseInt(torrent.size / (1024 * 1024));
                const api_size = Number.parseInt(torrent.size);

                const inputTime = torrent.time;
                let time = toUnixTime(inputTime);
                if (Number.isNaN(time)) {
                  return null;
                }

                let infoText = improved_tags
                  ? ''
                  : `${torrent.media} / ${torrent.format} / ${torrent.encoding}`;

                const groupId = d.groupId;
                const Id = torrent.torrentId;
                const torrentLink = `https://orpheus.network/torrents.php?id=${groupId}&torrentid=${Id}#torrent${Id}`;

                // Construct the torrent object
                const torrentObj = {
                  api_size: api_size,
                  datasetRelease: d.groupName,
                  size: sizeInMiB,
                  info_text: infoText,
                  tracker: tracker,
                  site: tracker,
                  snatch: torrent.snatches || 0,
                  seed: torrent.seeders || 0,
                  leech: torrent.leechers || 0,
                  download_link: `https://orpheus.network/download/${Id}`,
                  torrent_page: torrentLink || '',
                  discount: torrent.isFreeleech ? 'Freeleech' : 'None',
                  status: 'default',
                  groupId: d.groupName,
                  time: time,
                  quality: 'Soundtrack',
                  media: torrent.media,
                  format: torrent.format,
                  encoding: torrent.encoding,
                  title: torrent.remasterTitle,
                  year: torrent.remasterYear,
                  log: torrent.logScore,
                  cue: torrent.hasCue,
                  opsId: `${Id}`,
                  catalog: torrent.remasterCatalogueNumber,
                  album: d.groupName
                };

                return torrentObj;
              })
            )
            .filter((obj) => obj !== null) // Remove null objects
            .filter((obj) => {
              if (media && obj.media) {
                if (obj.media.toLowerCase().trim() !== media.toLowerCase().trim()) {
                  return false; // Skip if media doesn't match
                }
              }
              if (format && obj.format) {
                if (obj.format.toLowerCase().trim() !== format.toLowerCase().trim()) {
                  return false; // Skip if format doesn't match
                }
              }

              return true; // Include if all conditions pass
            });
        } catch (error) {
          console.error('An error occurred while processing RED tracker:', error);
        }
      } else if (tracker === 'AR') {
        try {
          // Ensure `postData` contains the result array from AlphaRatio
          torrent_objs = postData.response.results
            .map((d) => {
              // Convert size from bytes to MiB
              const size = Number.parseInt(d.size / (1024 * 1024));
              const api_size = Number.parseInt(d.size);
              const parsedFileCount = Number.parseInt(d.fileCount ?? d.filecount, 10);
              const filecount = Number.isFinite(parsedFileCount) ? parsedFileCount : null;

              // Extract release time and validate
              const inputTime = Number.parseInt(d.groupTime); // AlphaRatio uses UNIX timestamps
              if (Number.isNaN(inputTime)) {
                console.warn(`Invalid time for ${d.groupName}`);
                return null;
              }

              // Construct download link and torrent page link
              const download = `https://alpharatio.cc/torrents.php?action=download&id=${d.torrentId}&authkey=${AR_AUTH}&torrent_pass=${AR_PASS}`;
              const torrentPage = `https://alpharatio.cc/torrents.php?id=${d.groupId}&torrentid=${d.torrentId}#torrent${d.torrentId}`;

              // Build the torrent object
              const torrentObj = {
                api_size: api_size,
                datasetRelease: d.groupName || '',
                size: size,
                info_text: d.groupName || '',
                tracker: tracker,
                site: 'AR',
                snatch: d.snatches || 0,
                seed: d.seeders || 0,
                leech: d.leechers || 0,
                download_link: download,
                torrent_page: torrentPage,
                discount: d.isFreeleech ? 'Freeleech' : 'None',
                status: 'default',
                time: inputTime,
                filecount: filecount
              };

              // Add additional properties if needed (e.g., quality determination)
              const mappedObj = {
                ...torrentObj,
                quality: get_torrent_quality(torrentObj) // Assuming this function exists
              };

              return mappedObj; // Return the processed torrent object
            })
            .filter((obj) => obj !== null); // Filter out invalid objects

          if (debug) {
            console.log(`Processed torrent objects for ${tracker}:`, torrent_objs);
          }
        } catch (error) {
          console.error(`An error occurred while processing ${tracker} tracker:`, error);
        }
      }
      if (debug) {
        console.log(`${tracker} processed torrent objects`, torrent_objs);
      }
      return torrent_objs;
    };

    const get_api_discount = (text, refundable) => {
      let discountText = '';
      if (refundable === true) {
        discountText += 'Refundable';
      } else if (text === 0 || text === '0%') {
        discountText = 'None';
      } else if (text === '25%') {
        discountText = simplediscounts ? '25%' : '25% Freeleech';
      } else if (text === 'Copper') {
        discountText = simplediscounts ? '25% ' : 'Copper';
      } else if (text === '50%') {
        discountText = simplediscounts ? '50%' : '50% Freeleech';
      } else if (text === 'Bronze') {
        discountText = simplediscounts ? '50%' : 'Bronze';
      } else if (text === '75%') {
        discountText = simplediscounts ? '75%' : '75% Freeleech';
      } else if (text === 'Silver') {
        discountText = simplediscounts ? '75%' : 'Silver';
      } else if (text === '100%') {
        discountText = simplediscounts ? 'FL' : 'Freeleech';
      } else if (text === 'Golden') {
        discountText = simplediscounts ? 'FL' : 'Golden';
      } else {
        discountText = text + (simplediscounts ? ' FL' : ' Freeleech');
      }
      return discountText;
    };

    const get_api_internal = (internal) => {
      return !!internal; // Convert internal to boolean directly
    };

    const get_api_personal_release = (personal_release) => {
      return !!personal_release; // Convert internal to boolean directly
    };

    const get_api_double_upload = (double_upload, tracker) => {
      if (tracker === 'TIK' && double_upload === true) {
        return 'Emerald';
      } else if (double_upload === true) {
        return 'DU';
      } else return '';
    };

    const get_api_featured = (featured, tracker) => {
      if (tracker === 'TIK' && featured === true) {
        return 'Platinum';
      } else if (featured === true) {
        return 'Featured';
      } else {
        return '';
      }
    };

    const get_api_files = (files) => {
      const containerExtensions = ['mkv', 'iso', 'mpg', 'mp4', 'avi']; // List of possible containers you might be looking for

      if (files.length === 1) {
        const singleFileName = files[0].name;
        const lastDotIndex = singleFileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
          // Handle case where there is no full stop in the name
          return { extension: null, filename: null };
        }

        const extension = singleFileName.substring(lastDotIndex + 1).toLowerCase();
        if (containerExtensions.includes(extension)) {
          return { extension, filename: singleFileName }; // Return the container and filename
        } else {
          return { extension, filename: null };
        }
      } else {
        // If more than one file or no files, return default behavior
        return { extension: null, filename: null };
      }
    };

    const get_blu_ray_disc_type = (size) => {
      const sizeInGB = size / (1024 * 1024 * 1024); // Convert size to GB
      if (sizeInGB <= 25) {
        return 'BD25';
      } else if (sizeInGB <= 50) {
        return 'BD50';
        //} else if (sizeInGB <= 66) {
        //    return "BD66";
        //} else if (sizeInGB <= 100) {
        //    return "BD100";
      } else {
        return 'BDSET';
      }
    };

    const get_api_torrent_objects = (tracker, json) => {
      let torrent_objs = [];

      if (
        tracker === 'BLU' ||
        tracker === 'Aither' ||
        tracker === 'RFX' ||
        tracker === 'OE' ||
        tracker === 'HUNO' ||
        tracker === 'TIK' ||
        tracker === 'LST' ||
        tracker === 'IFL' ||
        tracker === 'ULCX' ||
        tracker === 'OTW' ||
        tracker === 'DP' ||
        tracker === 'YUS' ||
        tracker === 'LDU' ||
        tracker === 'RAS' ||
        tracker === 'SP' ||
        tracker === 'HHD' ||
        tracker === 'LUME' ||
        tracker === 'RMC'
      ) {
        torrent_objs = json.data
          .map((element) => {
            let originalInfoText;

            if (tracker === 'HUNO') {
              originalInfoText = element.attributes.name
                ? element.attributes.name.replaceAll(/[()]/g, '')
                : null;
            } else if (tracker === 'TIK') {
              originalInfoText = element.attributes.bd_info
                ? element.attributes.bd_info
                : element.attributes.name
                  ? element.attributes.name
                  : null;
            } else {
              originalInfoText = element.attributes.name ? element.attributes.name : null;
            }
            const apiReleaseName = element.attributes.name
              ? String(element.attributes.name).replaceAll(/[()]/g, '').trim()
              : originalInfoText;

            const parseDiscLabel = (text) => {
              // Regular expression to match "Disc Label" line
              const discLabelRegex = /Disc Label:\s*(.*)/;
              // Extract the "Disc Label" line
              const match = text.match(discLabelRegex);

              if (match && match[1]) {
                return match[1].trim();
              }
              return null;
            };

            if (tracker === 'TIK') {
              if (originalInfoText) {
                const parsedText = parseDiscLabel(originalInfoText);
                if (parsedText) {
                  originalInfoText = parsedText;
                } else {
                  originalInfoText = element.attributes.name
                    ? element.attributes.name
                    : originalInfoText;
                }
              }
            }
            let infoText = originalInfoText;

            // Check if the info text contains "SxxExx" where "xx" is not known beforehand
            if (/S\d{1,2}E\d{1,2}/.test(infoText)) {
              // If the info text contains the pattern, skip further processing
              return null; // Return null to filter out this torrent object
            }

            // If the info text does not contain the pattern, proceed with further processing
            const files = element.attributes.files || []; // Ensure files is defined
            const container = get_api_files(files); // Call the function with files as argument
            const extension = container.extension;
            let filenaming;
            if (container.filename == null) {
              filenaming = originalInfoText;
            } else {
              filenaming = container.filename;
              const lastDotIndex = filenaming.lastIndexOf('.');
              if (lastDotIndex !== -1) {
                filenaming = filenaming.substring(0, lastDotIndex);
              }
            }
            // Step 1: Identify the year
            const yearMatch = infoText.match(/\((\d{4})\)/);
            let relevantText = infoText;

            if (yearMatch) {
              // Step 2: If a year is found, process only the text after the year
              const yearIndex = infoText.indexOf(yearMatch[0]) + yearMatch[0].length;
              relevantText = infoText.substring(yearIndex).trim();
            }

            // Step 3: Perform the match on the relevant text
            let groupText = '';
            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
            const badGroupsList = badGroups(); // Get the list of bad group names
            let matchedGroup = null;
            let badGroupFound = false;

            // Check for bad groups
            for (const badGroup of badGroupsList) {
              if (infoText.includes(badGroup)) {
                badGroupFound = true;
                infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                break;
              }
            }

            if (!badGroupFound) {
              // Check for good groups if no bad group was found
              for (const group of groups) {
                if (infoText.includes(group)) {
                  matchedGroup = group;
                  break;
                }
              }

              if (matchedGroup) {
                groupText = matchedGroup;
                if (improved_tags) {
                  infoText = infoText.replace(groupText, '').trim();
                }
              } else {
                // Adjust the regex to correctly capture the desired group
                const match = relevantText.match(/-\s*([a-zA-Z0-9]+)$/);
                if (match) {
                  groupText = match[1]; // Use match[1] to get the capturing group
                  groupText = groupText.replaceAll(/[()]/g, ' '); // Replace parentheses with spaces
                  //groupText = groupText.replaceAll(/\[.*?\]/g, '').trim(); // Remove text inside brackets and trim
                  groupText = groupText.replaceAll(/[^a-z0-9]/gi, ''); // Sanitize to alphanumeric characters
                  if (improved_tags) {
                    infoText = infoText.replace(`-${match[0].substring(1)}`, '').trim(); // Remove the matched group
                  }
                }
              }
            }

            let updatedInfoText = infoText.trim();
            if (improved_tags) {
              const region = element.attributes.region;
              if (region) {
                const regionRegex = new RegExp(String.raw`\b${region}\b`, 'gi');
                updatedInfoText = updatedInfoText.replace(regionRegex, '').trim();
              }
              updatedInfoText = updatedInfoText.replace(groupText, '').trim();
              if (container) {
                updatedInfoText = `${extension} ${updatedInfoText}`; // Append container to info_text
                // Add BD type if container is m2ts or iso
                if (extension === 'm2ts' || extension === 'iso') {
                  const bdType = get_blu_ray_disc_type(element.attributes.size);
                  if (tracker === 'TIK') {
                    updatedInfoText = `${bdType} Blu-ray ${updatedInfoText}`;
                  } else {
                    updatedInfoText = `${bdType} ${updatedInfoText}`;
                  }
                }
              }
            }
            const mediaInfo = element.attributes.media_info;
            if (mediaInfo) {
              let isHdr10Plus = mediaInfo.includes('HDR10+');
              let isHdr10 = mediaInfo.includes('HDR10 compatible') || mediaInfo.includes('HDR10');
              let isCommentary = mediaInfo.includes('Commentary');
              let isdtsx = mediaInfo.includes('DTS:X');
              if (improved_tags) {
                if (isHdr10Plus) {
                  if (!updatedInfoText.includes('HDR10+')) {
                    updatedInfoText = 'HDR10+ ' + updatedInfoText.replace('HDR', 'HDR10+').trim();
                  }
                } else if (isHdr10) {
                  if (!updatedInfoText.includes('HDR10')) {
                    updatedInfoText = 'HDR10 ' + updatedInfoText.replace('HDR', 'HDR10').trim();
                  } else if (!updatedInfoText.includes('HDR')) {
                    updatedInfoText = 'HDR10 ' + updatedInfoText;
                  }
                }

                if (isCommentary && !updatedInfoText.includes('Commentary')) {
                  updatedInfoText = 'Commentary ' + updatedInfoText;
                }
                if (isdtsx && !updatedInfoText.includes('DTS:X')) {
                  updatedInfoText = 'DTS:X' + updatedInfoText;
                }
              }
            }
            if (tracker === 'TIK') {
              let tikQuality = element.attributes.type;
              if (tikQuality) {
                if (tikQuality.includes('UHD')) {
                  updatedInfoText = '2160p ' + updatedInfoText;
                } else if (tikQuality.includes('BD')) {
                  updatedInfoText = '1080p ' + updatedInfoText;
                }
              }
            }

            const inputTime = element.attributes.created_at;
            let time = toUnixTime(inputTime);
            if (Number.isNaN(time)) {
              return null;
            }

            const descriptionText = element.attributes.description;
            const imageUrls = [];
            const bbCodeImageRegex = /\[img(?:=\d+)?\](https?:\/\/[^\s[\]]+?\.png)\[\/img\]/gi;
            const plainImageRegex = /(?:^|\s)(https?:\/\/[^\s[\]]+?\.png)(?=\s|$)/gi;
            const slowPicsRegex = /(https?:\/\/slow\.pics\/\S+)/gi;
            let match;

            while ((match = bbCodeImageRegex.exec(descriptionText)) !== null) {
              imageUrls.push(match[1]);
            }
            while ((match = plainImageRegex.exec(descriptionText)) !== null) {
              imageUrls.push(match[1]);
            }
            while ((match = slowPicsRegex.exec(descriptionText)) !== null) {
              let url = match[0];
              // Remove [url] and [/url] tags if present
              url = url.replaceAll(/\[\/?url\]/g, '');
              imageUrls.push(url);
            }

            const torrentObj = {
              api_size: Number.parseInt(element.attributes.size),
              datasetRelease: apiReleaseName || filenaming,
              size: Number.parseInt(element.attributes.size / (1024 * 1024)),
              info_text: updatedInfoText,
              tracker: tracker,
              site: tracker,
              snatch: element.attributes.times_completed,
              seed: element.attributes.seeders,
              leech: element.attributes.leechers,
              download_link: element.attributes.download_link,
              torrent_page: element.attributes.details_link,
              externalId: element.id || element.attributes.id || '',
              description: descriptionText || '',
              mediainfo: element.attributes.media_info || '',
              bdinfo: element.attributes.bd_info || '',
              discount:
                tracker === 'TIK'
                  ? element.attributes.freeleech === '75%'
                    ? 'Silver'
                    : element.attributes.freeleech === '50%'
                      ? 'Bronze'
                      : element.attributes.freeleech === '100%'
                        ? 'Golden'
                        : element.attributes.freeleech === '25%'
                          ? 'Copper'
                          : element.attributes.freeleech
                  : element.attributes.freeleech,
              featured: element.attributes.featured,
              internal: element.attributes.internal,
              double_upload: element.attributes.double_upload,
              refundable: element.attributes.refundable,
              personal_release: element.attributes.personal_release,
              groupId: groupText,
              distributor: element.attributes.distributor,
              region: element.attributes.region,
              time: time,
              images: imageUrls,
              files: files
            };
            // Mapping additional properties and logging the final torrent objects
            const mappedObj = {
              ...torrentObj,
              quality: get_torrent_quality(torrentObj),
              discount: get_api_discount(torrentObj.discount, torrentObj.refundable),
              internal: get_api_internal(torrentObj.internal),
              Featured: get_api_featured(torrentObj.featured)
            };

            // Returning the final torrent object if it passes the "SxxExx" check
            return mappedObj;
          })
          .filter((obj) => obj !== null); // Filter out the null objects (skipped torrents)
        // Returning the final torrent objects
        if (debug) {
          console.log(`${tracker} processed torrent objects`, torrent_objs);
        }
        return torrent_objs;
      }
    };

    const insertAfter = (newNode, referenceNode) => {
      referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    };

    const get_filtered_torrents = (quality) => {
      let all_trs = [...document.querySelectorAll('tr.group_torrent')];
      let filtered_torrents = [];

      if (quality === 'SD') {
        let first_idx = all_trs.findIndex((a) => a.textContent.includes('Standard Definition'));
        let sliced = all_trs.slice(first_idx + 1, all_trs.length);

        let last_idx = sliced.findIndex((a) => a.className === 'group_torrent');
        if (last_idx === -1) last_idx = all_trs.length;
        filtered_torrents = sliced.slice(0, last_idx);

        if (debug) {
          console.log('SD filtered torrents', filtered_torrents);
        }
      } else if (quality === 'HD') {
        let first_idx = all_trs.findIndex(
          (a) =>
            a.textContent.includes('High Definition') &&
            !a.textContent.includes('Ultra High Definition')
        );
        let sliced = all_trs.slice(first_idx + 1, all_trs.length);

        let last_idx = sliced.findIndex((a) => a.className === 'group_torrent');
        if (last_idx === -1) last_idx = all_trs.length;
        filtered_torrents = sliced.slice(0, last_idx);

        if (debug) {
          console.log('HD filtered torrents', filtered_torrents);
        }
      } else if (quality === 'UHD') {
        let first_idx = all_trs.findIndex((a) => a.textContent.includes('Ultra High Definition'));
        let sliced = all_trs.slice(first_idx + 1, all_trs.length);

        let last_idx = sliced.findIndex((a) => a.className === 'group_torrent');
        if (last_idx === -1) last_idx = all_trs.length;
        filtered_torrents = sliced.slice(0, last_idx);

        if (debug) {
          console.log('UHD filtered torrents', filtered_torrents);
        }
      } else if (quality === 'Soundtrack') {
        // Filter for the "Soundtrack" specifically
        let soundtrack_idx = all_trs.findIndex((a) => a.textContent.includes('Soundtrack'));
        if (soundtrack_idx !== -1) {
          filtered_torrents.push(all_trs[soundtrack_idx]);
        }

        if (debug) {
          console.log('Soundtrack filtered torrents', filtered_torrents);
        }
      }

      // part 2 !
      let group_torrent_objs = [];

      filtered_torrents.forEach((t) => {
        try {
          let sizeSpan = [...t.querySelectorAll('span')].find(
            (s) => s.title && s.title.includes(' bytes')
          );
          if (!sizeSpan) {
            return; // Skip this iteration if no relevant span is found
          }
          let sizeText = sizeSpan.title;
          let sizeInBytes = Number.parseInt(sizeText.replaceAll(',', '').split(' bytes')[0]);
          if (Number.isNaN(sizeInBytes)) {
            console.error('Failed to parse size from text: ', sizeText);
            return; // Skip this iteration if parsing fails
          }
          let sizeInMiB = Math.floor(sizeInBytes / 1024 / 1024);
          group_torrent_objs.push({
            dom_path: t,
            size: sizeInMiB
          });
        } catch (e) {
          console.error('An error has occurred during processing a torrent: ', e);
        }
      });

      return group_torrent_objs;
    };

    const get_torrent_quality = (torrent) => {
      if (torrent.quality) return torrent.quality;

      let text = torrent.info_text.toLowerCase();

      if (text.includes('2160p')) return 'UHD';
      else if (
        text.includes('1080p') ||
        text.includes('720p') ||
        text.includes('1080i') ||
        text.includes('720i')
      )
        return 'HD';
      else return 'SD';
    };

    const get_ref_div = (torrent, ptp_torrent_group) => {
      let my_size = torrent.size;

      try {
        let div = ptp_torrent_group.find((e) => e.size < my_size);
        if (!div) {
          return null;
        }
        let selector_id = 'torrent_' + div.dom_path.id.split('header_')[1];
        return document.getElementById(selector_id);
      } catch (e) {
        console.error('Error occurred:', e);
        return null; // The size is too small, put it at the top of the group.
      }
    };

    const get_ptp_format_size = (size) => {
      // Ensure 'size' is a number. If it's a string, try converting it to a number.
      if (typeof size === 'string') {
        size = Number.parseFloat(size);
      }

      // Check if 'size' is a number after potential conversion. If not, return "N/A".
      if (Number.isNaN(size) || size === null || size === undefined) {
        return 'N/A'; // or any default value you prefer
      }

      // Format size based on its magnitude.
      if (size >= 1048576) {
        // TiB format, where 1 TiB = 1024 GiB = 1048576 MiB
        return (size / 1048576).toFixed(2) + ' TiB';
      } else if (size >= 1024) {
        // GiB format
        return (size / 1024).toFixed(2) + ' GiB';
      } else {
        // MiB format
        return size.toFixed(2) + ' MiB';
      }
    };

    const get_element_size = (size) => {
      if (typeof size === 'string') {
        size = Number.parseFloat(size);
      }
      if (Number.isNaN(size) || size === null || size === undefined) {
        return 'N/A'; // or any default value you prefer
      }
      const bytes = size * 1024 * 1024;
      return bytes.toLocaleString() + ' Bytes';
    };

    const add_as_first = (div, quality) => {
      let all_trs = [...document.querySelectorAll('tr.group_torrent')];
      all_trs.forEach((tr, index) => {});
      let first_idx;

      if (quality === 'SD') {
        first_idx = all_trs.findIndex((a) => a.textContent.includes('Standard Definition'));
      } else if (quality === 'HD') {
        first_idx = all_trs.findIndex(
          (a) =>
            a.textContent.includes('High Definition') &&
            !a.textContent.includes('Ultra High Definition')
        );
      } else if (quality === 'UHD') {
        first_idx = all_trs.findIndex((a) => a.textContent.includes('Ultra High Definition'));
      } else if (quality === 'Soundtrack') {
        // Special case for "Soundtrack" quality
        first_idx = all_trs.findIndex((a) => a.textContent.includes('Soundtrack'));
      }

      if (first_idx === -1) {
        let tbody = document.querySelector('#torrent-table > tbody');
        tbody.insertBefore(div, tbody.firstChild);
      } else {
        insertAfter(div, all_trs[first_idx]);
      }
    };

    const countryCodes = new Set([
      'AFG',
      'ALB',
      'DZA',
      'AND',
      'AGO',
      'ARG',
      'ARM',
      'AUS',
      'AUT',
      'AZE',
      'BHS',
      'BHR',
      'BGD',
      'BRB',
      'BLR',
      'BEL',
      'BLZ',
      'BEN',
      'BTN',
      'BOL',
      'BIH',
      'BWA',
      'BRA',
      'BRN',
      'BGR',
      'BFA',
      'BDI',
      'CPV',
      'KHM',
      'CMR',
      'CAN',
      'CAF',
      'TCD',
      'CHL',
      'CHN',
      'COL',
      'COM',
      'COG',
      'CRI',
      'HRV',
      'CUB',
      'CYP',
      'CZE',
      'DNK',
      'DJI',
      'DMA',
      'DOM',
      'ECU',
      'EGY',
      'SLV',
      'GNQ',
      'ERI',
      'EST',
      'ETH',
      'FJI',
      'FIN',
      'FRA',
      'GAB',
      'GMB',
      'GEO',
      'DEU',
      'GHA',
      'GRC',
      'GRD',
      'GTM',
      'GIN',
      'GNB',
      'GUY',
      'HTI',
      'HND',
      'HUN',
      'ISL',
      'IND',
      'IDN',
      'IRN',
      'IRQ',
      'IRL',
      'ISR',
      'ITA',
      'JAM',
      'JPN',
      'JOR',
      'KAZ',
      'KEN',
      'KIR',
      'PRK',
      'KOR',
      'KWT',
      'KGZ',
      'LAO',
      'LVA',
      'LBN',
      'LSO',
      'LBR',
      'LBY',
      'LIE',
      'LTU',
      'LUX',
      'MDG',
      'MWI',
      'MYS',
      'MDV',
      'MLI',
      'MLT',
      'MHL',
      'MRT',
      'MUS',
      'MEX',
      'FSM',
      'MDA',
      'MCO',
      'MNG',
      'MNE',
      'MAR',
      'MOZ',
      'MMR',
      'NAM',
      'NRU',
      'NPL',
      'NLD',
      'NZL',
      'NIC',
      'NER',
      'NGA',
      'NOR',
      'OMN',
      'PAK',
      'PLW',
      'PAN',
      'PNG',
      'PRY',
      'PER',
      'PHL',
      'POL',
      'PRT',
      'QAT',
      'ROU',
      'RUS',
      'RWA',
      'KNA',
      'LCA',
      'VCT',
      'WSM',
      'SMR',
      'STP',
      'SAU',
      'SEN',
      'SRB',
      'SYC',
      'SLE',
      'SGP',
      'SVK',
      'SVN',
      'SLB',
      'SOM',
      'ZAF',
      'SSD',
      'ESP',
      'LKA',
      'SDN',
      'SUR',
      'SWE',
      'CHE',
      'SYR',
      'TWN',
      'TJK',
      'TZA',
      'THA',
      'TLS',
      'TGO',
      'TON',
      'TTO',
      'TUN',
      'TUR',
      'TKM',
      'TUV',
      'UGA',
      'UKR',
      'ARE',
      'GBR',
      'USA',
      'URY',
      'UZB',
      'VUT',
      'VEN',
      'VNM',
      'YEM',
      'ZMB',
      'ZWE'
    ]);

    const get_codec = (lower, torrent) => {
      if (lower.includes('x264') || lower.includes('x.264') || lower.includes('x 264'))
        return 'x264 / ';
      else if (lower.includes('x265') || lower.includes('x.265') || lower.includes('x 265'))
        return 'x265 / ';
      else if (
        lower.includes('h264') ||
        lower.includes('h.264') ||
        lower.includes('avc') ||
        lower.includes('h 264')
      )
        return 'H.264 / ';
      else if (
        lower.includes('h265') ||
        lower.includes('h.265') ||
        lower.includes('hevc') ||
        lower.includes('h 265')
      )
        return 'H.265 / ';
      else if (lower.includes('xvid') || lower.includes('x.vid')) return 'XviD / ';
      else if (lower.includes('divx') || lower.includes('div.x')) return 'DivX / ';
      else if (lower.includes('mpeg2') || lower.includes('mpeg-2')) return 'MPEG2 / ';
      else if (lower.includes('mpeg1') || lower.includes('mpeg-1')) return 'MPEG1 / ';
      else if (lower.includes('vc-1')) return 'VC-1 / ';

      return null; // skip this info
    };

    const get_disc = (lower, torrent) => {
      if (lower.includes('dvd5') || lower.includes('dvd-5') || lower.includes('dvd 5'))
        return 'DVD5 / ';
      else if (lower.includes('dvd9') || lower.includes('dvd-9') || lower.includes('dvd 9'))
        return 'DVD9 / ';
      else if (
        lower.includes('bd25') ||
        lower.includes('bd-25') ||
        lower.includes('bd 25') ||
        lower.includes('uhd 25') ||
        lower.includes('uhd25') ||
        lower.includes('uhd-25')
      )
        return 'BD25 / ';
      else if (
        lower.includes('bd50') ||
        lower.includes('bd-50') ||
        lower.includes('bd 50') ||
        lower.includes('uhd 50') ||
        lower.includes('uhd50') ||
        lower.includes('uhd-50')
      )
        return 'BD50 / ';
      else if (
        lower.includes('bd66') ||
        lower.includes('bd-66') ||
        lower.includes('bd 66') ||
        lower.includes('uhd 66') ||
        lower.includes('uhd66') ||
        lower.includes('uhd-66')
      )
        return 'BD66 / ';
      else if (
        lower.includes('bd100') ||
        lower.includes('bd-100') ||
        lower.includes('bd 100') ||
        lower.includes('uhd 100') ||
        lower.includes('uhd100') ||
        lower.includes('uhd-100')
      )
        return 'BD100 / ';
      else if (lower.includes('dvdset')) return 'Disc Set / ';
      else if (lower.includes('bdset')) return 'Disc Set / ';

      return null;
    };

    const get_container = (lower, torrent) => {
      if (lower.includes(' avi') || lower.includes('.avi')) return 'AVI / ';
      else if (lower.includes(' mpg') || lower.includes('.mpg')) return 'MPG / ';
      else if (lower.includes(' mkv') || lower.includes('.mkv')) return 'MKV / ';
      else if (lower.includes(' mp4') || lower.includes('.mp4')) return 'MP4 / ';
      else if (lower.includes(' vob') || lower.includes('.vob')) return 'VOB IFO / ';
      else if (lower.includes(' iso') || lower.includes('.iso')) return 'ISO / ';
      else if (lower.includes(' m2ts') || lower.includes('.m2ts')) return 'm2ts / ';

      return null;
    };

    const get_source = (lower, torrent) => {
      if (lower.includes('/cam')) return 'CAM / ';
      else if (lower.includes('/ts')) return 'TS / ';
      else if (lower.includes('/r5')) return 'R5 / ';
      else if (lower.includes('vhs')) return 'VHS / ';
      else if (lower.includes('web')) return 'WEB / ';
      else if (lower.includes('hddvd') || lower.includes('hd-dvd') || lower.includes('hd dvd'))
        return 'HD-DVD / ';
      else if (lower.includes('dvd')) return 'DVD / ';
      else if (lower.includes('hdtv') || lower.includes('hd-tv')) return 'HDTV / ';
      else if (lower.includes('tv')) return 'TV / ';
      else if (
        lower.includes('bluray') ||
        lower.includes('blu-ray') ||
        lower.includes('blu.ray') ||
        lower.includes('blu ray')
      )
        return 'Blu-ray / ';

      return null;
    };

    const get_res = (lower, torrent) => {
      if (lower.includes('ntsc')) return 'NTSC / ';
      else if (lower.includes('pal')) return 'PAL / ';
      else if (lower.includes('480p')) return '480p / ';
      else if (lower.includes('576p')) return '576p / ';
      else if (lower.includes('720p')) return '720p / ';
      else if (lower.includes('1080i')) return '1080i / ';
      else if (lower.includes('1080p')) return '1080p / ';
      else if (lower.includes('2160p')) return '2160p / ';

      return null;
    };

    const get_audio = (lower, torrent) => {
      if (lower.includes('atmos')) return 'Dolby Atmos / ';
      else if (lower.includes('dts:x') || lower.includes('dts-x')) return 'DTS:X / ';
      else if (lower.includes('mp3')) return 'MP3 / ';

      return null;
    };

    const get_hdr = (lower, torrent) => {
      if (lower.includes('dolby vision hdr10+')) return 'Dolby Vision / HDR10+ / ';
      else if (lower.includes('dolby vision hdr10')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('dolby vision hdr')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('dv hdr10+')) return 'Dolby Vision / HDR10+ / ';
      else if (lower.includes('dv hdr10')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('dv hdr')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('hdr10+ / dv')) return 'Dolby Vision / HDR10+ / ';
      else if (lower.includes('hdr10 / dv')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('hdr / dv')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('hdr dv')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('hdr dovi')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('dovi hdr10+')) return 'Dolby Vision / HDR10+ / ';
      else if (lower.includes('dovi hdr10')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('dovi hdr')) return 'Dolby Vision / HDR10 / ';
      else if (lower.includes('dovi')) return 'Dolby Vision / ';
      else if (lower.includes('dolby vision')) return 'Dolby Vision / ';
      else if (lower.includes(' dv '))
        return 'Dolby Vision / '; // Need spaces or else DVD suddenly has Dolby Vision.
      else if (lower.includes('hdr10+')) return 'HDR10+ / ';
      else if (lower.includes('hdr10')) return 'HDR10 / ';
      else if (lower.includes('hdr')) return 'HDR10 / ';
      //else if (lower.includes("pq10")) return "10bit / ";
      else if (lower.includes('sdr')) return 'SDR / ';

      return null;
    };

    const get_remux = (lower, torrent) => {
      if (lower.includes('remux')) return 'Remux / ';

      return null;
    };

    const get_bonus = (lower, torrent) => {
      const bonuses = [];
      const anthologyMatch = lower.match(/anthology/);
      const yearMatch = lower.match(/\d{4}/);

      if (anthologyMatch && yearMatch && anthologyMatch.index < yearMatch.index) {
        bonuses.push('Anthology');
      }
      if (lower.includes('cam_rip')) bonuses.push('CAM');
      if (lower.includes('2in1')) bonuses.push('2in1');
      if (lower.includes('3in1')) bonuses.push('3in1');
      if (lower.includes('4in1')) bonuses.push('4in1');
      if (lower.includes('special features')) bonuses.push('Special Features');
      if (lower.includes('special edition')) bonuses.push('Special Edition');
      if (lower.includes('directors cut')) bonuses.push('Directors Cut');
      if (lower.includes("director's cut")) bonuses.push('Directors Cut');
      if (lower.includes('pan & scan')) bonuses.push('Pan & Scan');
      if (lower.includes('hybrid')) bonuses.push('Hybrid');
      if (lower.includes('proper')) bonuses.push('Proper');
      if (lower.includes('skynet edition')) bonuses.push('Skynet Edition');
      if (lower.includes('ultimate cut')) bonuses.push('Ultimate Cut');
      if (lower.includes('ultimate edition')) bonuses.push('Ultimate Edition');
      if (lower.includes('remastered')) bonuses.push('Remastered');
      if (lower.includes('commentary')) bonuses.push('Commentary');
      if (lower.includes('10bit')) bonuses.push('10bit');
      if (lower.includes('35mm')) bonuses.push('35mm');
      if (lower.includes('hfr')) bonuses.push('HFR');
      if (lower.includes('dcp')) bonuses.push('Digital Cinema Package');
      if (lower.includes('open matte')) bonuses.push('Open Matte');
      if (lower.includes('audio only track')) bonuses.push('Audio Only Track');
      if (lower.includes('repack2')) bonuses.push('Repack2');
      else if (lower.includes('repack')) bonuses.push('Repack');
      if (lower.includes('extended edition') || lower.includes('extended'))
        bonuses.push('Extended Edition');
      if (lower.includes('half-sbs') || lower.includes('half sbs')) {
        bonuses.push('3D Half SBS');
      } else if (lower.includes('half-ou') || lower.includes('half ou')) {
        bonuses.push('3D Half OU');
      } else if (lower.includes('3d')) bonuses.push('3D Edition');

      return bonuses.length > 0 ? bonuses.join(' / ') + ' / ' : null;
    };

    const get_country = (normal, torrent) => {
      const countryCodeMatch = normal.match(/\b[A-Z]{3}\b/g);
      if (countryCodeMatch) {
        const filteredCodes = countryCodeMatch.filter((code) => countryCodes.has(code));
        if (filteredCodes.length > 0) {
          return filteredCodes.join(' / ') + ' / ';
        }
      }

      return null;
    };

    const get_scene = (lower, torrent) => {
      if (lower.includes('scene')) return 'Scene / ';

      return null;
    };

    const get_simplified_title = (info_text, torrent) => {
      let lower = info_text.toLowerCase();
      let normal = info_text;

      // required infos: codec (x264 vs) / container (mkv, mp4) / source (dvd, web, bluray) / res (1080p, 720, SD, 1024x768 etc) / Bonus (with commentary, remux, XYZ edition)
      let codec = get_codec(lower, torrent);
      let container = get_container(lower, torrent);
      let source = get_source(lower, torrent);
      let res = get_res(lower, torrent);
      let audio = get_audio(lower, torrent);
      let hdr = get_hdr(lower, torrent);
      let bonus = get_bonus(lower, torrent);
      let country = get_country(normal, torrent);
      let disc = get_disc(lower, torrent);
      let scene = get_scene(lower, torrent);
      let remux = get_remux(lower, torrent);

      const parts = [];

      if (disc) parts.push(disc.trim());
      if (codec) parts.push(codec.trim());
      if (container) parts.push(container.trim());
      if (source) parts.push(source.trim());
      if (res) parts.push(res.trim());
      if (scene) parts.push(scene.trim());
      if (remux) parts.push(remux.trim());
      if (audio) parts.push(audio.trim());
      if (hdr) parts.push(hdr.trim());
      if (bonus) parts.push(bonus.trim());
      if (country) parts.push(country.trim());

      // Use a Set to filter out duplicates
      const uniqueParts = [...new Set(parts)];

      let combined_text = uniqueParts
        .join(' ')
        .replaceAll(/\s+\/$/g, '')
        .trim();

      if (combined_text === '') return info_text;
      else return combined_text;
    };

    const fetchDownloadUrl = async (torrentId, tracker) => {
      try {
        if (tracker === 'MTeam') {
          const tokenResponse = await fetch(
            `https://api.m-team.cc/api/torrent/genDlToken?id=${torrentId}`,
            {
              method: 'POST',
              headers: {
                'x-api-key': GM_config.get('MTeam_api'),
                'Content-Type': 'application/json',
                Accept: 'application/json'
              }
            }
          );

          const tokenData = await tokenResponse.json();
          if (tokenData.code === '0' && tokenData.data) {
            const downloadUrl = tokenData.data;
            const linkElement = document.querySelector(`a[data-torrent-id="${torrentId}"]`);

            if (linkElement) {
              linkElement.href = downloadUrl;
              linkElement.removeAttribute('onclick');
              linkElement.dataset.downloadCompleted = 'true';
              linkElement.click();
            }
          } else {
            console.warn(`Failed to fetch download URL for torrent ID ${torrentId}`);
          }
        } else if (tracker === 'RED') {
          const downloadUrl = `https://redacted.sh/ajax.php?action=download&id=${torrentId}`;
          console.log('Download URL for RED:', downloadUrl);

          GM_xmlhttpRequest({
            url: downloadUrl,
            method: 'GET',
            headers: {
              Authorization: GM_config.get('red_api')
            },
            responseType: 'blob',
            onload: (res) => {
              if (res.status === 200) {
                console.log('Download successful for RED');
                const blob = new Blob([res.response], { type: 'application/x-bittorrent' });
                const url = globalThis.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `torrent_${torrentId}.torrent`;
                document.body.appendChild(a);
                a.click();
                globalThis.URL.revokeObjectURL(url);
              } else {
                console.error('Failed to download torrent from RED:', res.responseText);
              }
            },
            onerror: (err) => {
              console.error('Error during download request for RED:', err);
            }
          });
        } else if (tracker === 'OPS') {
          const downloadUrl = `https://orpheus.network/ajax.php?action=download&id=${torrentId}`;
          console.log('Download URL for OPS:', downloadUrl);

          GM_xmlhttpRequest({
            url: downloadUrl,
            method: 'GET',
            headers: {
              Authorization: GM_config.get('ops_api')
            },
            responseType: 'blob',
            onload: (res) => {
              if (res.status === 200) {
                console.log('Download successful for OPS');
                const blob = new Blob([res.response], { type: 'application/x-bittorrent' });
                const url = globalThis.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `torrent_${torrentId}.torrent`;
                document.body.appendChild(a);
                a.click();
                globalThis.URL.revokeObjectURL(url);
              } else {
                console.error('Failed to download torrent from OPS:', res.responseText);
              }
            },
            onerror: (err) => {
              console.error('Error during download request for OPS:', err);
            }
          });
        }
      } catch (error) {
        console.warn(`Error fetching download URL for torrent ID ${torrentId}:`, error);
      }
    };

    function renderUnit3dExternalTorrents(external_torrents, options = {}) {
      latestUnit3dExternalTorrents = external_torrents;
      if (isRenderingUnit3dExternalTorrents) return;

      const tbody = document.querySelector('#torrent-table > tbody');
      if (!tbody) {
        displayAlert('UNIT3D layout torrent table not found');
        return;
      }
      if (!options.force && hasRenderedUnit3dExternalRows(tbody)) return;

      isRenderingUnit3dExternalTorrents = true;
      try {
        renderUnit3dExternalTorrentsIntoTable(external_torrents, tbody);
      } finally {
        isRenderingUnit3dExternalTorrents = false;
      }
    }

    function renderUnit3dExternalTorrentsIntoTable(external_torrents, tbody) {
      document
        .querySelectorAll(`tr.${EXTERNAL_ROW_CLASS}, tr.${EXTERNAL_ROW_CLASS}-detail`)
        .forEach((row) => row.remove());
      document.getElementById(FILTER_PANEL_ID)?.remove();
      unit3dExternalDetailTorrents.clear();

      const existingTorrentSizes = getExistingUnit3dTorrentSizes();
      const mibThreshold = valueinMIB * 1024 * 1024;
      const rows = [];
      doms = getExistingUnit3dFilterDoms();

      const filteredTorrents = external_torrents.filter((torrent) => {
        const seeders = Number.parseInt(torrent.seed, 10) || 0;
        const apiSize = Number.parseInt(torrent.api_size, 10);
        if (hide_dead_external_torrents && seeders === 0) return false;

        if (hide_if_torrent_with_same_size_exists && Number.isFinite(apiSize)) {
          const exactSizeExists = existingTorrentSizes.includes(apiSize);
          const fuzzySizeExists = existingTorrentSizes.some(
            (existingSize) => Math.abs(existingSize - apiSize) <= mibThreshold
          );
          if ((!fuzzyMatching && exactSizeExists) || (fuzzyMatching && fuzzySizeExists)) {
            if (log_torrents_with_same_size) {
              console.log(
                `[${torrent.site}] Matching UNIT3D torrent size exists: ${formatUnit3dSize(apiSize)} ${torrent.torrent_page}`
              );
            }
            return false;
          }
        }

        return true;
      });

      filteredTorrents.forEach((torrent, index) => {
        const id = `unit3d_external_${cssSafe(String(torrent.site || 'site'))}_${index}`;
        registerUnit3dExternalDetailTorrent(id, torrent);
        const header = buildUnit3dExternalHeaderRow(torrent, id);
        const detail = buildUnit3dExternalDetailRow(torrent, id);
        rows.push(header, detail);
        doms.push({
          discount: torrent.discount || 'None',
          dom_id: id,
          dom_path: header,
          group_id: torrent.groupId || '',
          info_text: torrent.info_text || '',
          detail_path: detail,
          leechers: Number.parseInt(torrent.leech, 10) || 0,
          quality: displayQuality(torrent),
          seeders: Number.parseInt(torrent.seed, 10) || 0,
          size: Number.parseInt(torrent.size, 10) || 0,
          snatchers: Number.parseInt(torrent.snatch, 10) || 0,
          tracker: torrent.site || torrent.tracker || ''
        });
      });

      tbody.append(...rows);
      filters = buildUnit3dFilterState(doms);
      if (!hide_filters_div) addUnit3dFilterPanel();
      filter_torrents();

      if (debug) console.log('Finished adding UNIT3D releases from other trackers');
      document.dispatchEvent(new CustomEvent('PTPAddReleasesFromOtherTrackersComplete'));
    }

    document.addEventListener('unit3d:ptp-dom-ready', () => {
      if (!latestUnit3dExternalTorrents) return;
      setTimeout(() => renderUnit3dExternalTorrents(latestUnit3dExternalTorrents), 0);
    });

    getExternalDetailEventTarget().addEventListener(
      EXTERNAL_DETAIL_REQUEST_EVENT,
      handleUnit3dExternalDetailRequest
    );

    function registerUnit3dExternalDetailTorrent(id, torrent) {
      if (!torrent) return;
      const keys = [
        id,
        torrent.torrent_page,
        torrent.download_link,
        torrent.externalId ? `${torrent.site}:${torrent.externalId}` : ''
      ];
      keys.filter(Boolean).forEach((key) => unit3dExternalDetailTorrents.set(String(key), torrent));
    }

    function handleUnit3dExternalDetailRequest(event) {
      const detail = event.detail || {};
      if (!detail.requestId) return;

      const task =
        detail.field === 'mediainfo'
          ? resolveUnit3dExternalMediaInfo(detail.torrentId, detail.torrentUrl)
          : resolveUnit3dExternalDetail(detail.torrentId, detail.torrentUrl);

      task
        .then((payload) => {
          dispatchUnit3dExternalDetailResponse(detail.requestId, { ok: true, payload });
        })
        .catch((error) => {
          dispatchUnit3dExternalDetailResponse(detail.requestId, {
            ok: false,
            error: error?.message || String(error)
          });
        });
    }

    function dispatchUnit3dExternalDetailResponse(requestId, detail) {
      getExternalDetailEventTarget().dispatchEvent(
        new CustomEvent(EXTERNAL_DETAIL_RESPONSE_EVENT, {
          bubbles: false,
          cancelable: false,
          composed: false,
          detail: { requestId, ...detail }
        })
      );
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

    async function resolveUnit3dExternalDetail(torrentId, torrentUrl) {
      const torrent = findUnit3dExternalDetailTorrent(torrentId, torrentUrl);
      if (!torrent) {
        throw new Error('External torrent payload not found');
      }

      const cacheKey = getUnit3dExternalDetailCacheKey(torrent, torrentUrl);
      if (unit3dExternalDetailCache.has(cacheKey)) {
        return unit3dExternalDetailCache.get(cacheKey);
      }

      const hydrated = await hydrateUnit3dExternalDetail(torrent);
      const payload = {
        title: `${hydrated.site || hydrated.tracker || 'External'}: ${
          hydrated.info_text || hydrated.datasetRelease || hydrated.title || ''
        }`,
        tracker: hydrated.site || hydrated.tracker || '',
        torrentPage: hydrated.torrent_page || torrentUrl || '',
        downloadLink: hydrated.download_link || '',
        externalDetailId: torrentId || '',
        mediainfoLazy:
          (hydrated.site || hydrated.tracker) === 'BHD' &&
          !firstNonEmpty(hydrated.mediainfo, hydrated.media_info, hydrated.mediaInfo),
        description: firstNonEmpty(
          hydrated.description,
          hydrated.descr,
          hydrated.bbcode_description,
          hydrated.release_description
        ),
        mediainfo: firstNonEmpty(hydrated.mediainfo, hydrated.media_info, hydrated.mediaInfo),
        bdinfo: firstNonEmpty(hydrated.bdinfo, hydrated.bd_info, hydrated.bdInfo)
      };
      unit3dExternalDetailCache.set(cacheKey, payload);
      return payload;
    }

    async function resolveUnit3dExternalMediaInfo(torrentId, torrentUrl) {
      const torrent = findUnit3dExternalDetailTorrent(torrentId, torrentUrl);
      if (!torrent) {
        throw new Error('External torrent payload not found');
      }

      if (torrent.site === 'BHD') {
        const hydrated = await fetchBhdExternalMediaInfo(torrent);
        return {
          mediainfo: firstNonEmpty(
            hydrated.mediainfo,
            hydrated.media_info,
            hydrated.mediaInfo,
            hydrated.mediainfo_text
          )
        };
      }

      return {
        mediainfo: firstNonEmpty(torrent.mediainfo, torrent.media_info, torrent.mediaInfo)
      };
    }

    function findUnit3dExternalDetailTorrent(torrentId, torrentUrl) {
      const direct =
        unit3dExternalDetailTorrents.get(String(torrentId || '')) ||
        unit3dExternalDetailTorrents.get(String(torrentUrl || ''));
      if (direct) return direct;

      const normalizedUrl = String(torrentUrl || '');
      return [...unit3dExternalDetailTorrents.values()].find((torrent) => {
        return (
          torrent?.torrent_page === normalizedUrl ||
          torrent?.download_link === normalizedUrl ||
          (torrent?.externalId &&
            normalizedUrl.includes(String(torrent.externalId)) &&
            normalizedUrl.includes(String(torrent.site || '').toLowerCase()))
        );
      });
    }

    function getUnit3dExternalDetailCacheKey(torrent, fallbackUrl) {
      return [
        torrent.site || torrent.tracker || 'external',
        torrent.externalId || torrent.torrent_page || fallbackUrl || torrent.download_link || ''
      ].join(':');
    }

    async function hydrateUnit3dExternalDetail(torrent) {
      if (hasUnit3dExternalDetailPayload(torrent)) return torrent;

      try {
        if (torrent.site === 'HDB') {
          return await fetchHdbExternalDetail(torrent);
        }

        if (torrent.site === 'BHD') {
          return await fetchBhdExternalDetail(torrent);
        }

        if (torrent.site === 'PTP') {
          return await fetchPtpExternalDetail(torrent);
        }

        if (isUnit3dApiTracker(torrent.site)) {
          return await fetchUnit3dExternalDetail(torrent);
        }
      } catch (error) {
        if (debug) {
          console.warn(`${torrent.site || 'External'} detail hydration failed`, error);
        }
      }

      return torrent;
    }

    function hasUnit3dExternalDetailPayload(torrent) {
      return !!firstNonEmpty(
        torrent?.description,
        torrent?.descr,
        torrent?.bbcode_description,
        torrent?.release_description,
        torrent?.mediainfo,
        torrent?.media_info,
        torrent?.bdinfo,
        torrent?.bd_info
      );
    }

    async function fetchHdbExternalDetail(torrent) {
      const id = torrent.externalId || extractExternalTorrentIdFromUrl(torrent.torrent_page);
      if (!id) return torrent;

      const result = await post_json('https://hdbits.org/api/torrents', 'HDB', {
        username: HDB_USER_NAME,
        passkey: HDB_PASS_KEY,
        id: Number.parseInt(id, 10) || id
      });
      const entry = Array.isArray(result?.data) ? result.data[0] : result?.data || result;
      return Object.assign(torrent, {
        description: firstNonEmpty(entry?.descr, entry?.description, torrent.description),
        mediainfo: firstNonEmpty(entry?.mediainfo, entry?.media_info, torrent.mediainfo),
        bdinfo: firstNonEmpty(entry?.bdinfo, entry?.bd_info, torrent.bdinfo)
      });
    }

    async function fetchBhdExternalDetail(torrent) {
      const id = torrent.externalId || extractExternalTorrentIdFromUrl(torrent.torrent_page);
      if (!id) return torrent;

      const queryUrl = `https://beyond-hd.me/api/torrents/${BHD_API_TOKEN}`;
      const torrentId = Number.parseInt(id, 10);
      if (!Number.isFinite(torrentId) || torrentId <= 0) return torrent;

      const basePayload = { torrent_id: torrentId };
      if (BHD_RSS_KEY) basePayload.rsskey = BHD_RSS_KEY;
      const descriptionResult = await post_json(queryUrl, 'BHD', {
        ...basePayload,
        action: 'description'
      });
      const descriptionEntry =
        descriptionResult.status === 'fulfilled'
          ? extractBhdDetailPayload(descriptionResult.value)
          : extractBhdDetailPayload(descriptionResult);
      return Object.assign(torrent, {
        description: firstNonEmpty(
          descriptionEntry?.description,
          descriptionEntry?.descr,
          descriptionEntry?.bbcode_description,
          descriptionEntry?.release_description,
          torrent.description
        ),
        mediainfo: firstNonEmpty(torrent.mediainfo, torrent.media_info, torrent.mediaInfo),
        mediainfoLazy: true
      });
    }

    async function fetchBhdExternalMediaInfo(torrent) {
      const id = torrent.externalId || extractExternalTorrentIdFromUrl(torrent.torrent_page);
      if (!id) return torrent;

      const torrentId = Number.parseInt(id, 10);
      if (!Number.isFinite(torrentId) || torrentId <= 0) return torrent;

      const queryUrl = `https://beyond-hd.me/api/torrents/${BHD_API_TOKEN}`;
      const payload = { action: 'mediainfo', torrent_id: torrentId };
      if (BHD_RSS_KEY) payload.rsskey = BHD_RSS_KEY;

      const mediaInfoEntry = extractBhdDetailPayload(await post_json(queryUrl, 'BHD', payload));
      return Object.assign(torrent, {
        mediainfo: firstNonEmpty(
          mediaInfoEntry?.mediainfo,
          mediaInfoEntry?.media_info,
          mediaInfoEntry?.mediainfo_text,
          mediaInfoEntry?.description,
          mediaInfoEntry?.result,
          torrent.mediainfo
        )
      });
    }

    async function fetchPtpExternalDetail(torrent) {
      const id = torrent.externalId || extractExternalTorrentIdFromUrl(torrent.torrent_page);
      if (!id || !PTP_API_USER || !PTP_API_KEY) return torrent;

      const url = `https://passthepopcorn.me/torrents.php?action=get_description&id=${encodeURIComponent(
        id
      )}`;
      const description = await getPtpText(url);
      return Object.assign(torrent, {
        description: firstNonEmpty(description, torrent.description)
      });
    }

    function getPtpText(url) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          url,
          method: 'GET',
          headers: {
            Accept: 'text/plain,*/*',
            ApiUser: PTP_API_USER,
            ApiKey: PTP_API_KEY
          },
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              resolve(response.responseText || '');
              return;
            }
            reject(new Error(`PTP detail endpoint returned HTTP ${response.status}`));
          },
          onerror: reject,
          onabort: reject,
          ontimeout: reject,
          timeout: timer
        });
      });
    }

    function extractBhdDetailPayload(result) {
      if (!result) return {};
      if (result?.status_code !== undefined && Number(result.status_code) !== 1) return {};
      if (result?.success === false) return {};
      if (typeof result?.result === 'string') {
        return { description: result.result, mediainfo: result.result };
      }
      if (typeof result === 'string') return { description: result };
      if (Array.isArray(result?.results)) return result.results[0] || {};
      if (Array.isArray(result?.data)) return result.data[0] || {};
      if (result?.result && typeof result.result === 'object') return result.result;
      if (result?.data && typeof result.data === 'object') return result.data;
      if (result?.results && typeof result.results === 'object') return result.results;
      return result;
    }

    async function fetchUnit3dExternalDetail(torrent) {
      const id = torrent.externalId || extractExternalTorrentIdFromUrl(torrent.torrent_page);
      const token = getUnit3dApiToken(torrent.site);
      const origin = getUrlOrigin(torrent.torrent_page);
      if (!id || !token || !origin) return torrent;

      const result = await getUnit3dApiJson(`${origin}/api/torrents/${id}`, token, torrent.site);
      const entry = Array.isArray(result?.data) ? result.data[0] : result?.data || result;
      const attributes = entry?.attributes || entry || {};
      return Object.assign(torrent, {
        description: firstNonEmpty(attributes.description, torrent.description),
        mediainfo: firstNonEmpty(attributes.media_info, attributes.mediainfo, torrent.mediainfo),
        bdinfo: firstNonEmpty(attributes.bd_info, attributes.bdinfo, torrent.bdinfo)
      });
    }

    function getUnit3dApiJson(url, token, tracker) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          url,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          },
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              resolve(parseJsonResponse(response, tracker));
              return;
            }
            reject(new Error(`${tracker} detail endpoint returned HTTP ${response.status}`));
          },
          onerror: reject,
          onabort: reject,
          ontimeout: reject,
          timeout: timer
        });
      });
    }

    function hasRenderedUnit3dExternalRows(root = document) {
      return !!root.querySelector(`tr.${EXTERNAL_ROW_CLASS}`);
    }

    function getExistingUnit3dTorrentSizes() {
      return [
        ...document.querySelectorAll(
          '#torrent-table tr:not(.unit3d-add-releases-external) .size-span'
        )
      ]
        .map((span) =>
          Number.parseInt(String(span.getAttribute('title') || '').replaceAll(',', ''), 10)
        )
        .filter(Number.isFinite);
    }

    function getExistingUnit3dFilterDoms() {
      return [
        ...document.querySelectorAll(
          '#torrent-table tr.group_torrent.group_torrent_header:not(.unit3d-add-releases-external)'
        )
      ].map((row, index) => {
        const domId = `unit3d_existing_aither_${index}`;
        row.classList.add(domId);
        return {
          detail_path: getUnit3dDetailRowForHeader(row),
          discount: getUnit3dRowDiscount(row),
          dom_id: domId,
          dom_path: row,
          group_id: row.dataset.releasegroup || '',
          info_text: getUnit3dRowInfoText(row),
          leechers: parseUnit3dRowNumber(row.dataset.leechers, row, '.unit3d-ptp-leechers'),
          quality: getUnit3dRowDisplayQuality(row),
          seeders: parseUnit3dRowNumber(row.dataset.seeders, row, '.unit3d-ptp-seeders'),
          size: Math.round(getUnit3dRowSizeBytes(row) / (1024 * 1024)),
          snatchers: parseUnit3dRowNumber(row.dataset.completed, row, '.unit3d-ptp-completed'),
          tracker: 'Aither'
        };
      });
    }

    function getUnit3dDetailRowForHeader(row) {
      const torrentId = row.dataset.unit3dTorrentId;
      if (!torrentId) return null;
      const next = row.nextElementSibling;
      if (
        next?.matches?.(
          `tr.torrent_info_row[data-unit3d-torrent-id="${cssEscape(torrentId)}"]`
        )
      ) {
        return next;
      }
      return document.querySelector(
        `#torrent-table tr.torrent_info_row[data-unit3d-torrent-id="${cssEscape(torrentId)}"]`
      );
    }

    function getUnit3dRowDiscount(row) {
      let discount = 'None';
      row
        .querySelectorAll('.torrent-info__download-modifier, .torrent-icons span, .torrent-icons i')
        .forEach((modifier) => {
          const text = normalizeUnit3dText(modifier.textContent).toLowerCase();
          const title = normalizeUnit3dText(modifier.getAttribute('title') || '').toLowerCase();
          const value = `${text} ${title}`;
          if (value.includes('freeleech')) {
            discount = simplediscounts ? 'FL' : 'Freeleech';
          } else if (value.includes('half-leech') || value.includes('50%')) {
            discount = simplediscounts ? '50%' : '50% Freeleech';
          }
        });
      return discount;
    }

    function getUnit3dRowInfoText(row) {
      return (
        row.dataset.releasename ||
        row.querySelector('.torrent-info-link, .unit3d-ptp-release-name')?.textContent ||
        row.textContent ||
        ''
      );
    }

    function getUnit3dRowDisplayQuality(row) {
      const text = `${row.dataset.unit3dQuality || ''} ${getUnit3dRowInfoText(row)}`;
      if (/\b(2160p|4320p|4k|uhd)\b/i.test(text)) return '2160p';
      if (/\b1080p|1080i\b/i.test(text)) return '1080p';
      if (/\b720p\b/i.test(text)) return '720p';
      if (/\bhd\b/i.test(text) && !/\bsd\b/i.test(text)) return '1080p';
      return 'SD';
    }

    function getUnit3dRowSizeBytes(row) {
      const datasetSize = Number.parseInt(row.dataset.sizeBytes, 10);
      if (Number.isFinite(datasetSize) && datasetSize > 0) return datasetSize;
      const spanSize = Number.parseInt(
        String(row.querySelector('.size-span')?.getAttribute('title') || '').replaceAll(',', ''),
        10
      );
      return Number.isFinite(spanSize) ? spanSize : 0;
    }

    function parseUnit3dRowNumber(datasetValue, row, selector) {
      const fromDataset = Number.parseInt(datasetValue, 10);
      if (Number.isFinite(fromDataset)) return fromDataset;
      const fromText = Number.parseInt(
        normalizeUnit3dText(row.querySelector(selector)?.textContent || '').replaceAll(',', ''),
        10
      );
      return Number.isFinite(fromText) ? fromText : 0;
    }

    function normalizeUnit3dText(value) {
      return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function buildUnit3dExternalHeaderRow(torrent, id) {
      const row = document.createElement('tr');
      const sizeBytes = resolveTorrentSizeBytes(torrent);
      const seeders = Number.parseInt(torrent.seed, 10) || 0;
      const leechers = Number.parseInt(torrent.leech, 10) || 0;
      const completed = Number.parseInt(torrent.snatch, 10) || 0;
      const releaseName = buildExternalReleaseName(torrent);
      const releaseDisplayName = formatExternalReleaseDisplayText(torrent, releaseName);
      const unit3dQuality = unit3dQualityId(torrent);
      const context = getCurrentUnit3dRowContext();

      row.className = `group_torrent group_torrent_header ${EXTERNAL_ROW_CLASS} ${id}`;
      row.id = `group_torrent_header_${id}`;
      row.dataset.unit3dTorrentId = id;
      row.dataset.unit3dQuality = unit3dQuality;
      row.dataset.releasename = releaseDisplayName;
      row.dataset.releasegroup = torrent.groupId || '';
      row.dataset.sizeBytes = String(sizeBytes || 0);
      row.dataset.seeders = String(seeders);
      row.dataset.leechers = String(leechers);
      row.dataset.completed = String(completed);
      row.dataset.unit3dTvEpisodeSort = context.episode;
      row.dataset.unit3dTvGroupKey = context.groupKey;
      row.dataset.unit3dTvGroupLabel = context.groupLabel;
      row.dataset.unit3dTvScope = context.scope;
      row.dataset.unit3dTvScopeSort = context.scopeSort;
      row.dataset.unit3dTvSeasonSort = context.season;
      row.dataset.unit3dAddReleasesTracker = torrent.site || torrent.tracker || '';
      row.dataset.unit3dAddReleasesDiscount = torrent.discount || 'None';
      row.dataset.unit3dAddReleasesQuality = displayQuality(torrent);

      row.append(
        buildUnit3dExternalOverviewCell(torrent, id, releaseDisplayName),
        buildUnit3dExternalBadgeCell(torrent),
        buildUnit3dExternalSizeCell(torrent, sizeBytes),
        buildUnit3dNumberCell(seeders, seeders === 0 ? 'no-seeders' : ''),
        buildUnit3dNumberCell(leechers),
        buildUnit3dNumberCell(completed)
      );

      return row;
    }

    function buildUnit3dExternalOverviewCell(torrent, id, releaseName) {
      const cell = document.createElement('td');
      cell.className = 'unit3d-ptp-overview-cell';

      const action = document.createElement('span');
      action.className = 'basic-movie-list__torrent__action';
      action.append(
        buildExternalActionLink('link_1', torrent.torrent_page, 'View', 'View torrent page'),
        document.createTextNode(' '),
        buildExternalDownloadLink(torrent)
      );

      const link = document.createElement('a');
      link.className = 'torrent-info-link link_3';
      link.href = torrent.torrent_page || '#';
      link.dataset.unit3dAddReleasesExternal = 'true';
      link.title = 'Open external torrent page';
      if (open_in_new_tab) link.target = '_blank';
      link.rel = 'noreferrer';
      appendReleaseLabel(link, torrent, releaseName);

      cell.append(action, document.createTextNode(' '));
      const trackerIcon = buildExternalTrackerIcon(torrent);
      if (trackerIcon) cell.append(trackerIcon, document.createTextNode(' '));
      cell.appendChild(link);
      appendHiddenPayloadMarkers(cell, torrent);
      return cell;
    }

    function buildExternalTrackerIcon(torrent) {
      if (!show_tracker_icon) return null;
      const img = document.createElement('img');
      img.className = 'unit3d-ptp-tracker-icon unit3d-add-releases-tracker-icon';
      img.src = get_tracker_icon(torrent.site);
      img.alt = torrent.site || 'Tracker';
      img.title = torrent.site || 'Tracker';
      img.width = 16;
      img.height = 16;
      return img;
    }

    function appendReleaseLabel(link, torrent, releaseName) {
      link.append(...buildExternalReleaseNameNodes(torrent, releaseName));

      if (hide_tags) return;
      const badges = getUnit3dExternalInlineBadges(torrent);
      badges.forEach(({ className, text }) => {
        link.append(document.createTextNode(' / '), buildInlineBadge(className, text));
      });
    }

    function buildExternalReleaseNameNodes(torrent, releaseName) {
      const text = formatExternalReleaseDisplayText(torrent, releaseName);
      const ranges = getExternalReleaseTokenRanges(text, inferExternalReleaseType(torrent, text));
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

    function formatExternalReleaseDisplayText(torrent, releaseName) {
      const rawName = normalizeUnit3dReleaseWhitespace(releaseName);
      const group = extractExternalReleaseGroup(torrent, rawName);
      const body = group
        ? rawName.replace(
            new RegExp(`-${escapeRegExp(group)}(?:\\.(?:torrent|mkv|mp4|avi|iso|ts))?$`, 'i'),
            ''
          )
        : rawName;
      const normalizedBody = canonicalizeExternalReleaseText(body);
      const resolutionMatch = /\b((?:480|576|720|1080|2160|4320)[pi]|4k|uhd)\b/i.exec(
        normalizedBody
      );

      let text = normalizedBody;
      if (resolutionMatch) {
        const beforeResolution = normalizeExternalPreResolutionText(
          normalizedBody.slice(0, resolutionMatch.index)
        );
        const resolution = resolutionMatch[1];
        const afterResolution = normalizeUnit3dReleaseWhitespace(
          normalizedBody.slice(resolutionMatch.index + resolution.length)
        );
        text = normalizeUnit3dReleaseWhitespace(
          [resolution, beforeResolution, afterResolution].filter(Boolean).join(' ')
        );
      }

      text = text.replace(UNIT3D_HDR_TEXT_PATTERN, '$1 ').replace(/\s+/g, ' ').trim();

      if (unit3dQualityId(torrent) === 'uhd') {
        text = normalizeUnit3dReleaseWhitespace(text.replace(/\b(?:UHD|Ultra\s*HD)\b/gi, ' '));
      }

      const releaseType = inferExternalReleaseType(torrent, text || normalizedBody);
      if (releaseType) {
        text = removeExternalReleaseTypeTokens(text, releaseType);
        text = injectExternalReleaseTypeAfterResolution(text, releaseType);
      }

      text = normalizeUnit3dReleaseWhitespace(text);
      if (group) text = `${text}-${group}`;
      return text || rawName || torrent.site || 'External release';
    }

    function canonicalizeExternalReleaseText(value) {
      return normalizeUnit3dReleaseWhitespace(
        String(value || '')
          .replace(/\.(?:torrent|mkv|mp4|avi|iso|ts)$/i, '')
          .replace(/\bDTS[._ -]?HD[._ -]?MA\b/gi, 'DTS-HD MA')
          .replace(/\bDTS[._ -]?HD[._ -]?HRA\b/gi, 'DTS-HD HRA')
          .replace(/\bDTS[._ -]?ES\b/gi, 'DTS-ES')
          .replace(/\bDTS[._ -]?X\b/gi, 'DTS:X')
          .replace(/\bDTS\s*([1-7])[._ -]*([012])\b/gi, 'DTS $1.$2')
          .replace(/\bDDP\s*([1-7])[._ -]*([012])\b/gi, 'DD+ $1.$2')
          .replace(/\b(?:DDP|EAC3|E-AC-?3)\b/gi, 'DD+')
          .replace(/\bDD(?!P|\+)\s*([1-7])[._ -]*([012])\b/gi, 'DD $1.$2')
          .replace(/\bLPCM\s*([1-7])[._ -]*([012])\b/gi, 'LPCM $1.$2')
          .replace(/\bTRUE[._ -]?HD\b/gi, 'TrueHD')
          .replace(/\bH[._ -]?264\b/gi, 'H.264')
          .replace(/\bH[._ -]?265\b/gi, 'H.265')
          .replace(/\bX[._ -]?264\b/gi, 'x264')
          .replace(/\bX[._ -]?265\b/gi, 'x265')
          .replace(/\bMPEG[._ -]?2\b/gi, 'MPEG-2')
          .replace(/\bWEB[._ -]?DL\b/gi, 'WEB-DL')
          .replace(/\bWEB[._ -]?Rip\b/gi, 'WEBRip')
          .replace(/\bBlu[._ -]?Ray\b/gi, 'BluRay')
          .replace(/[._]+/g, ' ')
          .replace(/\bDTS\s+HD\s+MA\s+([1-7])\s+([012])\b/gi, 'DTS-HD MA $1.$2')
          .replace(/\bDTS\s+HD\s+HRA\s+([1-7])\s+([012])\b/gi, 'DTS-HD HRA $1.$2')
          .replace(/\bDTS\s+HD\s+MA\b/gi, 'DTS-HD MA')
          .replace(/\bDTS\s+HD\s+HRA\b/gi, 'DTS-HD HRA')
          .replace(/\bDTS\s+([1-7])\s+([012])\b/gi, 'DTS $1.$2')
          .replace(/\bDD\+\s+([1-7])\s+([012])\b/gi, 'DD+ $1.$2')
          .replace(/\bDD\s+([1-7])\s+([012])\b/gi, 'DD $1.$2')
          .replace(/\bLPCM\s+([1-7])\s+([012])\b/gi, 'LPCM $1.$2')
          .replace(/\bTrueHD\s+([1-7])\s+([012])\b/gi, 'TrueHD $1.$2')
          .replace(/\bH\s+264\b/gi, 'H.264')
          .replace(/\bH\s+265\b/gi, 'H.265')
      );
    }

    function normalizeExternalPreResolutionText(value) {
      return normalizeUnit3dReleaseWhitespace(
        canonicalizeExternalReleaseText(value)
          .replace(/^.*?\b(?:19|20)\d{2}\b/i, ' ')
          .replace(/^.*?\bS\d{1,2}(?:E\d{1,3})?\b/i, ' ')
      );
    }

    function inferExternalReleaseType(torrent, text = '') {
      const explicit = normalizeExternalReleaseType(torrent.type || torrent.category || '');
      if (explicit) return explicit;

      const source = `${torrent.info_text || ''} ${torrent.quality || ''} ${text}`.toLowerCase();
      if (/\b(?:bdmv|dvd[59]|full\s*disc|complete\s*(?:uhd\s*)?blu-?ray)\b/i.test(source)) {
        return 'Full Disc';
      }
      if (/\bremux\b/i.test(source)) return 'Remux';
      if (/\bweb[ ._-]?dl\b/i.test(source)) return 'WEB-DL';
      if (/\bweb[ ._-]?rip\b/i.test(source)) return 'WEBRip';
      if (/\bhdtv\b/i.test(source)) return 'HDTV';
      if (/\b(?:x264|x265|h\.?264|h\.?265|hevc|avc)\b/i.test(source)) return 'Encode';
      return '';
    }

    function normalizeExternalReleaseType(type) {
      const normalized = normalizeUnit3dReleaseWhitespace(type);
      return (
        UNIT3D_RELEASE_TYPES.find(
          (releaseType) => releaseType.toLowerCase() === normalized.toLowerCase()
        ) || ''
      );
    }

    function removeExternalReleaseTypeTokens(text, type) {
      if (!type) return text;
      const patterns = [type];
      if (type === 'WEB-DL') patterns.push('WEB DL');
      if (type === 'WEBRip') patterns.push('WEB Rip');
      return normalizeUnit3dReleaseWhitespace(
        patterns.reduce(
          (current, pattern) =>
            current.replace(new RegExp(String.raw`\b${escapeRegExp(pattern)}\b`, 'gi'), ' '),
          text
        )
      );
    }

    function injectExternalReleaseTypeAfterResolution(text, type) {
      const match = /\b((?:480|576|720|1080|2160|4320)[pi]|4k|uhd)\b/i.exec(text);
      if (!match) return normalizeUnit3dReleaseWhitespace([type, text].filter(Boolean).join(' '));

      const before = text.slice(0, match.index + match[0].length);
      const after = text.slice(match.index + match[0].length);
      return normalizeUnit3dReleaseWhitespace(`${before} ${type} ${after}`);
    }

    function extractExternalReleaseGroup(torrent, releaseName) {
      const direct = normalizeUnit3dReleaseWhitespace(torrent.groupId || torrent.group || '');
      if (direct) return direct.replace(/^-/, '');

      const name = String(releaseName || '').replace(/\.(?:torrent|mkv|mp4|avi|iso|ts)$/i, '');
      const match = /-([A-Za-z0-9][A-Za-z0-9._]*)$/.exec(name);
      return match ? match[1] : '';
    }

    function getExternalReleaseTokenRanges(text, type) {
      const ranges = [];
      const releaseType = normalizeExternalReleaseType(type);
      if (releaseType) {
        addExternalReleaseTokenRanges(
          ranges,
          text,
          releaseType,
          `unit3d-ptp-release-token--type-${slugifyUnit3dReleaseToken(releaseType)}`
        );
      }

      UNIT3D_AUDIO_CODEC_TOKENS.forEach((token) => {
        addExternalAudioTokenRanges(
          ranges,
          text,
          token,
          `unit3d-ptp-release-token--audio-${slugifyUnit3dReleaseToken(token)}`
        );
      });

      UNIT3D_METADATA_TOKENS.forEach((token) => {
        addExternalReleaseTokenRanges(ranges, text, token, 'unit3d-ptp-release-token--metadata');
      });

      return ranges.sort((left, right) => left.start - right.start || right.end - left.end);
    }

    function addExternalReleaseTokenRanges(ranges, text, token, className) {
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

    function addExternalAudioTokenRanges(ranges, text, token, className) {
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

    function slugifyUnit3dReleaseToken(value) {
      return normalizeUnit3dReleaseWhitespace(value)
        .toLowerCase()
        .replace(/\+/g, ' plus')
        .replace(/:/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    function normalizeUnit3dReleaseWhitespace(value) {
      return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function escapeRegExp(value) {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    }

    function getUnit3dExternalInlineBadges(torrent) {
      const badges = [];
      if (torrent.region)
        badges.push({ className: 'torrent-info__tags-region', text: torrent.region });
      if (torrent.distributor) {
        badges.push({ className: 'torrent-info__tags-distributor', text: torrent.distributor });
      }
      return badges;
    }

    function buildInlineBadge(className, text) {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      return span;
    }

    function buildUnit3dExternalBadgeCell(torrent) {
      const cell = document.createElement('td');
      cell.className = 'unit3d-ptp-status-badges-cell';

      const statusIcons = buildUnit3dExternalStatusIcons(torrent);
      if (statusIcons) {
        const badges = document.createElement('span');
        badges.className = 'unit3d-ptp-badges unit3d-ptp-status-badges';
        badges.appendChild(statusIcons);
        cell.appendChild(badges);
      }

      return cell;
    }

    function buildUnit3dExternalStatusIcons(torrent) {
      if (!torrent) return null;
      const icons = document.createElement('span');
      icons.className = 'torrent-icons';

      if (get_api_internal(torrent.internal) || torrent.internal === true) {
        icons.appendChild(
          buildUnit3dTorrentIcon('fas fa-magic torrent-icons__internal', 'Internal release')
        );
      }

      if (get_api_personal_release(torrent.personal_release)) {
        icons.appendChild(
          buildUnit3dTorrentIcon(
            'fas fa-user-plus torrent-icons__personal-release',
            'Personal release'
          )
        );
      }

      if (get_api_featured(torrent.featured, torrent.site)) {
        icons.appendChild(
          buildUnit3dTorrentIcon(
            'fas fa-award-simple torrent-icons__featured',
            'Featured - 100% Freeleech + Double upload'
          )
        );
      } else {
        const discountIcon = buildUnit3dFreeleechIcon(torrent.discount);
        if (discountIcon) icons.appendChild(discountIcon);

        if (get_api_double_upload(torrent.double_upload)) {
          icons.appendChild(
            buildUnit3dTorrentIcon(
              'fas fa-chevron-double-up torrent-icons__double-upload',
              'Double upload'
            )
          );
        }
      }

      if (torrent.refundable) {
        icons.appendChild(buildUnit3dTorrentIcon('fas fa-percentage', 'Refundable'));
      }

      if (torrent.sticky) {
        icons.appendChild(
          buildUnit3dTorrentIcon('fas fa-thumbtack torrent-icons__sticky', 'Sticky')
        );
      }

      if (torrent.highspeed) {
        icons.appendChild(
          buildUnit3dTorrentIcon('fas fa-bolt-lightning torrent-icons__highspeed', 'High speeds')
        );
      }

      if (torrent.exclusive) {
        icons.appendChild(buildUnit3dTorrentIcon('fas fa-lock', 'Exclusive'));
      }

      if (torrent.reported) {
        icons.appendChild(
          buildUnit3dTorrentIcon('fas fa-exclamation-triangle', 'Reported torrent')
        );
      }

      if (torrent.trumpable) {
        const trumpIcon = buildUnit3dTorrentIcon(
          'fas fa-skull-crossbones torrent-icons__torrent-trump',
          'Trumpable torrent'
        );
        trumpIcon.style.color = 'lightcoral';
        icons.appendChild(trumpIcon);
      }

      return icons.childElementCount ? icons : null;
    }

    function buildUnit3dFreeleechIcon(discount) {
      if (!discount || discount === 'None') return null;
      const label = simplediscounts ? simplifyDiscount(discount) : `${discount} Freeleech`;
      const normalized = String(discount).trim().toLowerCase();
      const iconClass =
        normalized.includes('25') ||
        normalized.includes('50') ||
        normalized.includes('75') ||
        normalized.includes('copper') ||
        normalized.includes('bronze') ||
        normalized.includes('silver')
          ? 'fas fa-star-half torrent-icons__freeleech'
          : 'fas fa-star torrent-icons__freeleech';
      return buildUnit3dTorrentIcon(iconClass, label);
    }

    function buildUnit3dTorrentIcon(className, title) {
      const icon = document.createElement('i');
      icon.className = className;
      icon.title = title;
      return icon;
    }

    function buildUnit3dExternalSizeCell(torrent, sizeBytes) {
      const cell = document.createElement('td');
      cell.className = 'nobr';
      const span = document.createElement('span');
      span.className = 'size-span';
      span.title = String(sizeBytes || 0);
      span.textContent = formatUnit3dSize(sizeBytes || resolveTorrentSizeBytes(torrent));
      cell.appendChild(span);
      return cell;
    }

    function buildUnit3dNumberCell(value, className = '') {
      const cell = document.createElement('td');
      if (className) cell.className = className;
      cell.textContent = String(value || 0);
      return cell;
    }

    function buildUnit3dExternalDetailRow(torrent, id) {
      const row = document.createElement('tr');
      row.className = `torrent_info_row unit3d-ptp-detail-row ${EXTERNAL_ROW_CLASS}-detail`;
      row.dataset.unit3dTorrentId = id;
      row.dataset.unit3dTvGroupKey = getCurrentUnit3dRowContext().groupKey;
      row.hidden = true;

      const cell = document.createElement('td');
      cell.colSpan = 6;
      const body = document.createElement('div');
      body.className = 'unit3d-ptp-detail-body';
      const title = document.createElement('p');
      title.textContent = `${torrent.site}: ${torrent.info_text || torrent.datasetRelease || ''}`;
      const page = buildExternalActionLink('', torrent.torrent_page, 'Open torrent page', '');
      const download = buildExternalDownloadLink(torrent);
      body.append(title, page, document.createTextNode(' '), download);
      cell.appendChild(body);
      row.appendChild(cell);
      return row;
    }

    function buildExternalActionLink(className, href, text, title) {
      const link = document.createElement('a');
      if (className) link.className = className;
      link.href = href || '#';
      link.textContent = text;
      if (title) link.title = title;
      if (open_in_new_tab) link.target = '_blank';
      link.rel = 'noreferrer';
      return link;
    }

    function buildExternalDownloadLink(torrent) {
      const link = buildExternalActionLink(
        'link_2',
        torrent.download_link || torrent.torrent_page,
        'DL',
        'Download'
      );

      if (torrent.site === 'MTeam' || torrent.site === 'RED' || torrent.site === 'OPS') {
        link.dataset.torrentId = torrent.teamId || torrent.redId || torrent.opsId || '';
        link.dataset.tracker = torrent.site;
        link.addEventListener('click', (event) => {
          if (link.dataset.downloadCompleted || !link.dataset.torrentId) return;
          event.preventDefault();
          fetchDownloadUrl(link.dataset.torrentId, torrent.site);
        });
      }

      return link;
    }

    function appendHiddenPayloadMarkers(cell, torrent) {
      if (torrent.time && torrent.time !== 'None') {
        cell.appendChild(buildHiddenMarker('release time', torrent.time));
      }
      (Array.isArray(torrent.images) ? torrent.images : []).forEach((image) => {
        cell.appendChild(buildHiddenMarker('UNIT3D images', image));
      });
      (Array.isArray(torrent.files) ? torrent.files : []).forEach((file) => {
        cell.appendChild(buildHiddenMarker('files', JSON.stringify(file)));
      });
      const filecount = Number.parseInt(torrent.filecount, 10);
      if (Number.isFinite(filecount)) {
        cell.appendChild(buildHiddenMarker('filecount', String(filecount)));
      }
    }

    function buildHiddenMarker(className, title) {
      const marker = document.createElement('span');
      marker.className = className;
      marker.title = title;
      marker.hidden = true;
      return marker;
    }

    function buildExternalReleaseName(torrent) {
      const text = torrent.datasetRelease || torrent.info_text || torrent.title || '';
      if (torrent.site === 'RED' || torrent.site === 'OPS') {
        return [torrent.media, torrent.format, torrent.encoding, torrent.title || text]
          .filter(Boolean)
          .join(' ');
      }
      return String(text).trim() || torrent.site || 'External release';
    }

    function resolveTorrentSizeBytes(torrent) {
      const apiSize = Number.parseInt(torrent.api_size, 10);
      if (Number.isFinite(apiSize) && apiSize > 0) return apiSize;
      const mibSize = Number.parseFloat(torrent.size);
      return Number.isFinite(mibSize) ? Math.round(mibSize * 1024 * 1024) : 0;
    }

    function formatUnit3dSize(bytes) {
      const size = Number(bytes) || 0;
      if (size >= 1024 ** 4) return `${(size / 1024 ** 4).toFixed(2)} TiB`;
      if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GiB`;
      if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(2)} MiB`;
      return `${size} B`;
    }

    function unit3dQualityId(torrent) {
      const quality = String(torrent.quality || torrent.info_text || '').toLowerCase();
      const text = `${quality} ${torrent.info_text || ''}`.toLowerCase();
      if (/\b(2160p|4320p|4k|uhd|ultra\s*hd)\b/.test(text)) return 'uhd';
      if (/\b(720p|1080p|1080i|hd|blu-?ray|bdrip|web-?dl|webrip)\b/.test(text)) return 'hd';
      return 'sd';
    }

    function displayQuality(torrent) {
      const text = `${torrent.quality || ''} ${torrent.info_text || ''}`;
      if (/soundtrack/i.test(text)) return 'Soundtrack';
      if (/\b2160p|4320p|4k|uhd\b/i.test(text)) return '2160p';
      if (/\b1080p|1080i\b/i.test(text)) return '1080p';
      if (/\b720p\b/i.test(text)) return '720p';
      return 'SD';
    }

    function getCurrentUnit3dRowContext() {
      const row = document.querySelector(
        '#torrent-table tr.group_torrent.group_torrent_header:not(.unit3d-add-releases-external)'
      );
      return {
        episode: row?.dataset.unit3dTvEpisodeSort || 'Infinity',
        groupKey: row?.dataset.unit3dTvGroupKey || 'movie',
        groupLabel: row?.dataset.unit3dTvGroupLabel || '',
        scope: row?.dataset.unit3dTvScope || 'movie',
        scopeSort: row?.dataset.unit3dTvScopeSort || 'Infinity',
        season: row?.dataset.unit3dTvSeasonSort || 'Infinity'
      };
    }

    function buildUnit3dFilterState(items) {
      const unique = (values) => [...new Set(values.filter(Boolean))].sort();
      return {
        discounts: unique(items.map((item) => item.discount)).map((name) => ({
          name,
          status: 'default'
        })),
        qualities: unique(items.map((item) => item.quality)).map((name) => ({
          name,
          status: 'default'
        })),
        trackers: unique(items.map((item) => item.tracker)).map((name) => ({
          name,
          status: 'default'
        }))
      };
    }

    function addUnit3dFilterPanel() {
      const panel = document.createElement('section');
      panel.id = FILTER_PANEL_ID;
      panel.className = 'panelV2';

      const heading = document.createElement('h2');
      heading.className = 'panel__heading';
      heading.textContent = 'Filter Releases';
      heading.style.cursor = 'pointer';

      const body = document.createElement('div');
      body.className = 'panel__body';
      body.style.display = GM_config.get('filterhidden') ? 'none' : 'block';
      body.append(
        buildUnit3dFilterGroup('Tracker', 'trackers'),
        buildUnit3dFilterGroup('Discount', 'discounts'),
        buildUnit3dFilterGroup('Quality', 'qualities'),
        buildUnit3dSearchFilter()
      );

      heading.addEventListener('click', () => {
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? 'block' : 'none';
        GM_config.set('filterhidden', !hidden);
      });

      panel.append(heading, body);
      placeFilterPanel(panel);
    }

    function getFilterPanelLocation() {
      return filterboxlocation === 'Sidebar' ? 'Sidebar' : 'Torrents';
    }

    function findFilterPanelInsertTarget() {
      if (getFilterPanelLocation() === 'Sidebar') {
        const sidebar = document.querySelector('.unit3d-ptp-sidebar');
        if (sidebar && !sidebar.hidden) {
          const posterPanel = sidebar.querySelector('.unit3d-ptp-poster-panel');
          return {
            anchor: posterPanel ? posterPanel.nextSibling : sidebar.firstChild,
            container: sidebar,
            method: 'before'
          };
        }
      }

      const mainColumn = document.querySelector('.unit3d-ptp-page > .main-column');
      if (mainColumn) {
        return {
          anchor: mainColumn.querySelector('.unit3d-ptp-table-scroll') || mainColumn.firstChild,
          container: mainColumn,
          method: 'before'
        };
      }

      const anchor = document.querySelector('#torrent-table');
      if (anchor?.parentNode) {
        return {
          anchor,
          container: anchor.parentNode,
          method: 'before'
        };
      }

      return null;
    }

    function placeFilterPanel(panel) {
      const target = findFilterPanelInsertTarget();
      if (!target) return;

      if (target.anchor) {
        target.container.insertBefore(panel, target.anchor);
      } else {
        target.container.appendChild(panel);
      }
    }

    function buildUnit3dFilterGroup(labelText, key) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:baseline;margin:4px 0;gap:8px';
      const label = document.createElement('div');
      label.textContent = `${labelText}: `;
      label.style.flex = '0 0 70px';
      const values = document.createElement('div');
      filters[key].forEach((filter) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.id = key === 'trackers' ? `filter-${filter.name.toLowerCase()}` : '';
        chip.className = 'filter-box form__button form__button--outlined';
        chip.textContent = filter.name;
        chip.style.cssText = 'margin:3px;padding:2px 7px';
        chip.addEventListener('click', () => update_filter_box_status(key, filter.name, chip));
        values.appendChild(chip);
      });
      row.append(label, values);
      return row;
    }

    function buildUnit3dSearchFilter() {
      const row = document.createElement('div');
      row.style.margin = '8px 0 0';
      const input = document.createElement('input');
      input.className = 'torrent-search search-bar__search-field__input';
      input.type = 'text';
      input.spellcheck = false;
      input.placeholder = 'Search torrents...';
      input.style.width = '84%';
      input.addEventListener('input', filter_torrents);
      const reset = document.createElement('button');
      reset.className = 'form__button form__button--outlined';
      reset.type = 'button';
      reset.textContent = 'Reset';
      reset.addEventListener('click', () => {
        input.value = '';
        Object.values(filters).forEach((group) =>
          group.forEach((filter) => (filter.status = 'default'))
        );
        document.querySelectorAll(`#${FILTER_PANEL_ID} .filter-box`).forEach((chip) => {
          chip.style.background = '';
          chip.style.removeProperty('color');
        });
        filter_torrents();
      });
      row.append(input, document.createTextNode(' '), reset);
      return row;
    }

    function handleExternalInfoClick(event) {
      const link = event.target.closest?.('a.torrent-info-link[data-unit3d-add-releases-external]');
      if (!link) return;
      link.dataset.unit3dAddReleasesExternal = 'true';
    }

    function cssSafe(value) {
      return value.replace(/[^A-Za-z0-9_-]+/g, '_');
    }

    function firstNonEmpty(...values) {
      for (const value of values) {
        if (value === null || value === undefined) continue;
        const text = stringifyExternalDetailText(value);
        if (isUsableExternalDetailText(text)) return text;
      }
      return '';
    }

    function isUsableExternalDetailText(value) {
      const text = String(value || '').trim();
      return !!text && text !== '0';
    }

    function stringifyExternalDetailText(value) {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value === 0 ? '' : String(value);
      if (typeof value === 'boolean') return '';
      if (Array.isArray(value))
        return value.map(stringifyExternalDetailText).filter(Boolean).join('\n');
      if (typeof value === 'object') {
        for (const key of [
          'description',
          'descr',
          'bbcode_description',
          'release_description',
          'mediainfo',
          'media_info',
          'mediainfo_text',
          'bdinfo',
          'bd_info',
          'text',
          'body',
          'message',
          'value',
          'data',
          'result',
          'results'
        ]) {
          if (value[key] === undefined || value[key] === value) continue;
          const text = stringifyExternalDetailText(value[key]);
          if (text.trim()) return text;
        }
      }
      return '';
    }

    function extractExternalTorrentIdFromUrl(value) {
      const text = String(value || '');
      if (!text) return '';
      try {
        const url = new URL(text, location.href);
        const id =
          url.searchParams.get('torrentid') ||
          url.searchParams.get('torrent_id') ||
          url.searchParams.get('id');
        if (id) return id;
        const trailingMatch = url.pathname.match(/(?:^|[/.=-])(\d{5,})(?:$|[/.=-])/);
        if (trailingMatch) return trailingMatch[1];
        const pathMatch = url.pathname.match(/(?:details|torrents?|torrent)[^\d]*(\d+)/i);
        if (pathMatch) return pathMatch[1];
      } catch {
        const idMatch = text.match(/[?&](?:torrentid|torrent_id|id)=(\d+)/i);
        if (idMatch) return idMatch[1];
        const trailingMatch = text.match(/(?:^|[/.=-])(\d{5,})(?:$|[/.=-])/);
        if (trailingMatch) return trailingMatch[1];
      }
      return '';
    }

    function resolveBhdTorrentId(result) {
      return firstNonEmpty(
        result?.id,
        result?.torrent_id,
        result?.torrentId,
        result?.torrentid,
        extractExternalTorrentIdFromUrl(result?.url),
        extractExternalTorrentIdFromUrl(result?.download_url)
      );
    }

    function getUrlOrigin(value) {
      try {
        return new URL(String(value || ''), location.href).origin;
      } catch {
        return '';
      }
    }

    function isUnit3dApiTracker(site) {
      return !!getUnit3dApiToken(site);
    }

    function getUnit3dApiToken(site) {
      const tokens = {
        BLU: BLU_API_TOKEN,
        Aither: AITHER_API_TOKEN,
        RFX: RFX_API_TOKEN,
        OE: OE_API_TOKEN,
        HUNO: HUNO_API_TOKEN,
        TIK: TIK_API_TOKEN,
        LST: LST_API_TOKEN,
        IFL: IFL_API_TOKEN,
        ULCX: ULCX_API_TOKEN,
        DP: DP_API_TOKEN,
        SP: SP_API_TOKEN,
        LDU: LDU_API_TOKEN,
        RAS: RAS_API_TOKEN,
        HHD: HHD_API_TOKEN,
        LUME: LUME_API_TOKEN,
        RMC: RMC_API_TOKEN
      };
      return tokens[site] || '';
    }

    function isFreeleechDiscount(value) {
      return /freeleech|fl|golden/i.test(String(value || ''));
    }

    function simplifyDiscount(value) {
      return String(value || '')
        .replace(/\s*Freeleech!?/i, '%')
        .replace(/%%$/, '%');
    }

    document.addEventListener('click', handleExternalInfoClick);

    const add_external_torrents = (external_torrents) => {
      renderUnit3dExternalTorrents(external_torrents, { force: true });
      return;

      const existing_torrent_sizes = Array.from(
        document.querySelectorAll("span[style='float: left;']")
      ).map((x) => {
        const sizeStr = x.title.replace(' bytes', '').replaceAll(',', '');
        return Number.parseInt(sizeStr, 10);
      });

      let sd_ptp_torrents = get_filtered_torrents('SD').sort((a, b) => (a.size < b.size ? 1 : -1));
      let hd_ptp_torrents = get_filtered_torrents('HD').sort((a, b) => (a.size < b.size ? 1 : -1));
      let uhd_ptp_torrents = get_filtered_torrents('UHD').sort((a, b) =>
        a.size < b.size ? 1 : -1
      );
      let soundtrack_ptp_torrents = get_filtered_torrents('Soundtrack').sort((a, b) => {
        // Compare by year first
        if (a.year !== b.year) {
          return a.year < b.year ? 1 : -1; // Sort descending by year
        }
        // If years are the same, compare by title
        return a.title.localeCompare(b.title); // Sort alphabetically by title
      });

      create_needed_groups(external_torrents);

      // Separate torrents that need album handling (OPS and RED) from others
      const albumTrackers = new Set(['OPS', 'RED']);
      const albumGroups = {};
      const nonAlbumTorrents = [];

      external_torrents.forEach((torrent) => {
        if (albumTrackers.has(torrent.site) && torrent.album) {
          if (!albumGroups[torrent.album]) {
            albumGroups[torrent.album] = [];
          }
          albumGroups[torrent.album].push(torrent);
        } else {
          nonAlbumTorrents.push(torrent);
        }
      });

      // Handle non-album torrents (maintain existing functionality)
      nonAlbumTorrents.forEach((torrent, i) => {
        let seeders = Number.parseInt(torrent.seed);
        if (hide_dead_external_torrents && Number.parseInt(seeders) === 0) return;

        let ref_div;
        let tracker = torrent.site;
        let dom_id = tracker + '_' + i;
        const group_id = torrent.groupId;

        if (torrent.quality === 'UHD') {
          ref_div = get_ref_div(torrent, uhd_ptp_torrents);
        } else if (torrent.quality === 'HD') {
          ref_div = get_ref_div(torrent, hd_ptp_torrents);
        } else if (torrent.quality === 'Soundtrack') {
          // New Soundtrack case
          ref_div = get_ref_div(torrent, soundtrack_ptp_torrents);
        } else {
          ref_div = get_ref_div(torrent, sd_ptp_torrents);
        }
        if (improved_tags) {
          if (typeof sceneGroups !== 'undefined') {
            if (sceneGroups.includes(torrent.groupId)) {
              torrent.info_text = 'Scene / ' + torrent.info_text;
            }
          }
        }
        let cln = line_example.cloneNode(true);

        if (improved_tags) {
          if (tracker === 'RED' || tracker === 'OPS') {
            cln.querySelector('.torrent-info-link').textContent = ``;
          } else {
            cln.querySelector('.torrent-info-link').textContent = get_simplified_title(
              torrent.info_text
            );
          }
        } else {
          cln.querySelector('.torrent-info-link').textContent = torrent.info_text;
        }

        if (!hide_tags) {
          if (improved_tags) {
            if (torrent.region) {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__tags-region'>${torrent.region}</span>`;
            }
            if (torrent.distributor) {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__tags-distributor'>${torrent.distributor}</span>`;
            }
            if (torrent.site === 'HDB') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>";
              }
              if (torrent.exclusive) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--exclusive'>Exclusive</span>";
              }
            }
            if (torrent.site === 'BHD') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>";
              }
            }
            if (torrent.site === 'BTN') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>";
              }
              // enforce styling because it's important
              if (torrent.season2) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--season2' style='font-weight: bold; color: #FF0000'>Season 2</span>";
              }
              if (torrent.extras) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--extras'>Extras</span>";
              }
            }
            if (torrent.site === 'MTV') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>";
              }
            }
            if (
              torrent.site === 'BLU' ||
              torrent.site === 'Aither' ||
              torrent.site === 'RFX' ||
              torrent.site === 'OE' ||
              torrent.site === 'HUNO' ||
              torrent.site === 'LST' ||
              torrent.site === 'FL' ||
              tracker === 'IFL' ||
              tracker === 'ULCX' ||
              tracker === 'OTW' ||
              tracker === 'DP' ||
              tracker === 'YUS' ||
              tracker === 'LDU' ||
              tracker === 'RAS' ||
              tracker === 'HHD' ||
              tracker === 'LUME' ||
              tracker === 'RMC'
            ) {
              if (get_api_internal(torrent.internal)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>";
              }
              if (get_api_double_upload(torrent.double_upload)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__download-modifier'>DU</span>";
              }
              if (get_api_featured(torrent.featured)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__download-modifier'>Featured</span>";
              }
              if (get_api_personal_release(torrent.personal_release)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--Personal'>Personal Release</span>";
              }
            }
            if (torrent.site === 'TIK') {
              if (get_api_internal(torrent.internal)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>";
              }
              if (get_api_double_upload(torrent.double_upload)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__download-modifier'>Emerald</span>";
              }
              if (get_api_featured(torrent.featured, torrent.site)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__download-modifier'>Platinum</span>";
              }
              if (get_api_personal_release(torrent.personal_release)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='ttorrent-info__tags torrent-info__tags--Personal'>Personal Release</span>";
              }
            }
          } else if (!improved_tags) {
            if (torrent.site === 'HDB') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>";
              }
              if (torrent.exclusive) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__exclusive' style='font-weight: bold; color: #a14989'>Exclusive</span>";
              }
            }
            if (torrent.site === 'BHD') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>";
              }
            }
            if (torrent.site === 'BTN') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__internal' style='font-weight: bold; color: #00FF00'>Internal</span>";
              }
              if (torrent.season2) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__season2' style='font-weight: bold; color: #FF0000'>Season 2</span>";
              }
              if (torrent.extras) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__season2' style='font-weight: bold; color: #a14989'>Extras</span>";
              }
            }
            if (torrent.site === 'MTV') {
              if (torrent.internal) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>";
              }
            }
            if (
              torrent.site === 'BLU' ||
              torrent.site === 'Aither' ||
              torrent.site === 'RFX' ||
              torrent.site === 'OE' ||
              torrent.site === 'HUNO' ||
              torrent.site === 'LST' ||
              torrent.site === 'FL' ||
              tracker === 'IFL' ||
              tracker === 'ULCX' ||
              tracker === 'OTW' ||
              tracker === 'DP' ||
              tracker === 'YUS' ||
              tracker === 'LDU' ||
              tracker === 'RAS' ||
              tracker === 'HHD' ||
              tracker === 'LUME' ||
              tracker === 'RMC'
            ) {
              if (get_api_internal(torrent.internal)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__internal' style='font-weight: bold; color: #baaf92'>Internal</span>";
              }
              if (get_api_double_upload(torrent.double_upload)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__DU' style='font-weight: bold; color: #279d29'>DU</span>";
              }
              if (get_api_featured(torrent.featured)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__Featured' style='font-weight: bold; color: #997799'>Featured</span>";
              }
              if (get_api_personal_release(torrent.personal_release)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__Personal' style='font-weight: bold; color: #865BE9'>Personal Release</span>";
              }
            }
            if (torrent.site === 'TIK') {
              if (get_api_internal(torrent.internal)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__internal' style='font-weight: bold; color: #baaf92'>Internal</span>";
              }
              if (get_api_double_upload(torrent.double_upload)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__Emerald' style='font-weight: bold; color: #3FB618'>Emerald</span>";
              }
              if (get_api_featured(torrent.featured, torrent.site)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__Platinum' style='font-weight: bold; color: #26A69A'>Platinum</span>";
              }
              if (get_api_personal_release(torrent.personal_release)) {
                cln.querySelector('.torrent-info-link').innerHTML +=
                  " / <span class='torrent-info__Personal' style='font-weight: bold; color: #865BE9'>Personal Release</span>";
              }
            }
          }
        }
        if (!hide_tags) {
          if (improved_tags) {
            const torrentInfoLink = cln.querySelector('.torrent-info-link');
            if (
              torrent.discount === 'Freeleech' ||
              torrent.discount === 'FL' ||
              torrent.discount === 'Golden'
            ) {
              torrentInfoLink.innerHTML +=
                " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
            } else if (
              torrent.discount === '50% Freeleech' ||
              torrent.discount === '50%' ||
              torrent.discount === 'Bronze'
            ) {
              torrentInfoLink.innerHTML +=
                " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
            } else if (torrent.discount != 'None') {
              torrentInfoLink.innerHTML += ` / <span class='torrent-info__download-modifier'>${torrent.discount}!</span>`;
            }
          } else if (torrent.discount != 'None') {
            cln.querySelector('.torrent-info-link').innerHTML +=
              ` / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>${torrent.discount}!</span>`;
          }
        }
        if (!hide_tags) {
          if (torrent.reported) {
            cln.querySelector('.torrent-info-link').innerHTML +=
              ` / <span class='torrent-info__reported'>Reported</span>`;
          }
          if (torrent.trumpable) {
            cln.querySelector('.torrent-info-link').innerHTML +=
              ` / <span class='torrent-info__trumpable'>Trumpable</span>`;
          }
        }

        const groupTorrent = cln.querySelector('.torrent-info-link');
        let newHtml = groupTorrent.outerHTML;

        if (torrent.time && torrent.time !== 'None') {
          if (groupTorrent) {
            newHtml += `<span class='release time' title="${torrent.time}"></span>`;
          }
        }

        if (torrent.images && Array.isArray(torrent.images) && torrent.images.length > 0) {
          if (groupTorrent) {
            torrent.images.forEach((image) => {
              newHtml += `<span class='UNIT3D images' title="${image}"></span>`;
            });
          }
        }

        if (groupTorrent) {
          const files = Array.isArray(torrent.files) ? torrent.files : [];
          if (files.length > 0) {
            files.forEach((file) => {
              const filePayload = JSON.stringify(file).replaceAll('"', '&quot;');
              newHtml += `<span class='files' title="${filePayload}"></span>`;
            });
          }

          const parsedFilecount = Number.parseInt(torrent.filecount, 10);
          const resolvedFilecount = Number.isFinite(parsedFilecount)
            ? parsedFilecount
            : files.length > 0
              ? files.length
              : null;

          if (resolvedFilecount !== null) {
            newHtml += `<span class='filecount' title="${resolvedFilecount}"></span>`;
          }
        }

        if (improved_tags) {
          if (torrent.tags) {
            if (groupTorrent) {
              newHtml += `<span class='WEB_tags' title="${torrent.tags}"></span>`;
            }
          }
        }

        if (groupTorrent) {
          groupTorrent.outerHTML = newHtml;
        }

        if (torrent.status === 'seeding')
          cln.querySelector('.torrent-info-link').className += ' torrent-info-link--user-seeding';
        if (torrent.status === 'leeching')
          cln.querySelector('.torrent-info-link').className += ' torrent-info-link--user-leeching';
        if (torrent.status === 'grabbed')
          cln.querySelector('.torrent-info-link').className +=
            ' torrent-info-link--user-downloaded';
        if (torrent.status === 'snatched')
          cln.querySelector('.torrent-info-link').className += ' torrent-info-link--user-snatched';

        let elements = cln
          .querySelector('.basic-movie-list__torrent__action')
          .querySelectorAll('a');

        if (elements.length > 0) {
          const element = [...elements].find((a) => a.textContent.trim() === 'DL');

          // If the element exists, handle both MTeam and RED functionality
          if (element) {
            if (tracker === 'MTeam') {
              element.href = torrent.download_link;
              element.dataset.torrentId = torrent.teamId;
              element.dataset.tracker = 'MTeam';

              element.addEventListener('click', function (event) {
                const downloadCompleted = element.dataset.downloadCompleted;

                if (!downloadCompleted) {
                  event.preventDefault();
                  const torrentId = element.dataset.torrentId;
                  fetchDownloadUrl(torrentId, 'MTeam'); // Pass 'MTeam' to handle the MTeam case
                }
              });
            } else {
              element.href = torrent.download_link; // Fallback for other trackers
            }
          }
        } else {
          console.log('No elements found matching the criteria.');
        }

        let api_sized = torrent.api_size;
        const menu_value = valueinMIB; // This value can be set dynamically based on your menu selection
        const MIB_IN_BYTES = menu_value * 1024 * 1024;
        const sizeWithinMiBExists = existing_torrent_sizes.some(
          (existingSize) => Math.abs(existingSize - api_sized) <= MIB_IN_BYTES
        );

        const exactSizeExists = existing_torrent_sizes.includes(api_sized);
        const ptp_format_size = get_ptp_format_size(torrent.size);

        if (hide_if_torrent_with_same_size_exists) {
          if (!fuzzyMatching && exactSizeExists) {
            if (log_torrents_with_same_size) {
              console.log(
                `[${torrent.site}] A ${ptp_format_size} torrent already exists:\n${torrent.datasetRelease}\n${torrent.torrent_page}`
              );
            }
            return;
          } else if (fuzzyMatching && sizeWithinMiBExists) {
            if (log_torrents_with_same_size) {
              console.log(
                `[${torrent.site}] A torrent within ${menu_value} MiB of ${ptp_format_size} already exists:\n${torrent.datasetRelease}\n${torrent.torrent_page}`
              );
            }
            return;
          }
        }
        const element_size = get_element_size(torrent.size);

        if (api_sized !== undefined && api_sized !== null) {
          api_sized = api_sized.toLocaleString() + ' Bytes';
        }

        cln.querySelector('.size-span').textContent = ptp_format_size;

        const byteSizedTrackers = [
          'BLU',
          'Aither',
          'RFX',
          'OE',
          'HUNO',
          'TIK',
          'TVV',
          'BHD',
          'HDB',
          'NBL',
          'BTN',
          'MTV',
          'LST',
          'ANT',
          'RTF',
          'AvistaZ',
          'CinemaZ',
          'PHD',
          'TL',
          'FL',
          'MTeam',
          'IFL',
          'RED',
          'OPS',
          'ULCX',
          'AR',
          'OTW',
          'DP',
          'YUS',
          'LDU',
          'RAS',
          'SP',
          'HHD',
          'LUME',
          'RMC'
        ];
        if (byteSizedTrackers.includes(torrent.site)) {
          cln.querySelector('.size-span').setAttribute('title', api_sized);
        } else {
          cln.querySelector('.size-span').setAttribute('title', element_size);
        }
        cln.querySelector('td:nth-child(3)').textContent = torrent.snatch; // snatch
        cln.querySelector('td:nth-child(4)').textContent = torrent.seed; // seed

        if (torrent.seed === 0) {
          cln.querySelector('td:nth-child(4)').className = 'no-seeders';
        }

        cln.querySelector('td:nth-child(5)').textContent = torrent.leech; // leech
        cln.querySelector('.link_3').href = torrent.torrent_page;
        cln.className += ' ' + dom_id;
        cln.id += ' ' + dom_id;
        if (torrent?.datasetRelease) {
          if (cln?.dataset?.releasename) {
            cln.dataset.releasename += torrent.datasetRelease;
          } else {
            cln.dataset.releasename = torrent.datasetRelease;
          }
        } else if (torrent.info_text && cln.dataset.releasename) {
          cln.dataset.releasename += torrent.info_text;
        } else if (torrent.info_text) {
          cln.dataset.releasename = torrent.info_text;
        }

        if (group_id && cln.dataset.releasegroup) {
          cln.dataset.releasegroup += group_id;
        } else if (group_id || group_id === '') {
          cln.dataset.releasegroup = group_id;
        }

        if (open_in_new_tab) cln.querySelector('.link_3').target = '_blank';

        if (show_tracker_icon) {
          cln.querySelector('img').src = get_tracker_icon(torrent.site);
          cln.querySelector('img').title = torrent.site;
        }

        if (ref_div) {
          insertAfter(cln, ref_div);
        } else {
          add_as_first(cln, torrent.quality);
        }

        let dom_path = cln;
        let quality = dom_get_quality(torrent.info_text);
        let discount = torrent.discount;
        let info_text = torrent.info_text;
        let leechers = Number.parseInt(torrent.leech);
        let snatchers = Number.parseInt(torrent.snatch);
        let size = torrent.size;

        doms.push({
          tracker,
          dom_path,
          quality,
          discount,
          info_text,
          group_id,
          seeders,
          leechers,
          snatchers,
          dom_id,
          size
        });
      });

      // Handle album torrents (for OPS and RED)
      Object.keys(albumGroups).forEach((album) => {
        // Insert the album header
        let headerDiv = get_group_header_div(album);
        insert_group(album, headerDiv);

        // Insert torrents for the current album
        albumGroups[album].forEach((torrent, i) => {
          let tracker = torrent.site;
          let dom_id = tracker + '_' + i;
          const group_id = torrent.groupId;
          let seeders = Number.parseInt(torrent.seed);
          if (hide_dead_external_torrents && Number.parseInt(seeders) === 0) return;

          let ref_div = get_ref_div(torrent, soundtrack_ptp_torrents); // Example of sorting under soundtrack
          let cln = line_example.cloneNode(true);

          if (improved_tags) {
            cln.querySelector('.torrent-info-link').textContent = ``;
          } else {
            cln.querySelector('.torrent-info-link').textContent = torrent.info_text;
          }

          // Improved tags for RED/OPS
          if (improved_tags && (torrent.site === 'RED' || torrent.site === 'OPS')) {
            cln.querySelector('.torrent-info-link').innerHTML +=
              ` / <span class='torrent-info__tags-media'>${torrent.media}</span>`;
            cln.querySelector('.torrent-info-link').innerHTML +=
              ` / <span class='torrent-info__tags-format'>${torrent.format}</span>`;
            cln.querySelector('.torrent-info-link').innerHTML +=
              ` / <span class='torrent-info__tags-encoding'>${torrent.encoding}</span>`;
            if (torrent.title) {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__tags-title'>${torrent.title}</span>`;
            }
            if (torrent.year !== null) {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__tags-year'>${torrent.year}</span>`;
            }
            if (torrent.log !== 0) {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__tags-log'>${torrent.log}%</span>`;
            }
            if (torrent.hasCue !== false) {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__tags-cue'>Cue</span>`;
            }
          }

          // Handle Freeleech, Half-leech, and other discounts
          if (!hide_tags) {
            const torrentInfoLink = cln.querySelector('.torrent-info-link');
            if (improved_tags) {
              if (
                torrent.discount === 'Freeleech' ||
                torrent.discount === 'FL' ||
                torrent.discount === 'Golden'
              ) {
                torrentInfoLink.innerHTML +=
                  " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
              } else if (
                torrent.discount === '50% Freeleech' ||
                torrent.discount === '50%' ||
                torrent.discount === 'Bronze'
              ) {
                torrentInfoLink.innerHTML +=
                  " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
              } else if (torrent.discount != 'None') {
                torrentInfoLink.innerHTML += ` / <span class='torrent-info__download-modifier'>${torrent.discount}!</span>`;
              }
            } else if (torrent.discount != 'None') {
              cln.querySelector('.torrent-info-link').innerHTML +=
                ` / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>${torrent.discount}!</span>`;
            }
          }

          // Set size, snatch, seed, leech values
          cln.querySelector('.size-span').textContent = get_ptp_format_size(torrent.size);
          cln.querySelector('td:nth-child(3)').textContent = torrent.snatch; // snatch
          cln.querySelector('td:nth-child(4)').textContent = torrent.seed; // seed
          cln.querySelector('td:nth-child(5)').textContent = torrent.leech; // leech
          cln.querySelector('.link_3').href = torrent.torrent_page;
          cln.className += ' ' + dom_id;
          cln.id += ' ' + dom_id;
          if (torrent?.datasetRelease) {
            if (cln?.dataset?.releasename) {
              cln.dataset.releasename += torrent.datasetRelease;
            } else {
              cln.dataset.releasename = torrent.datasetRelease;
            }
          } else if (torrent.info_text && cln.dataset.releasename) {
            cln.dataset.releasename += torrent.info_text;
          } else if (torrent.info_text) {
            cln.dataset.releasename = torrent.info_text;
          }

          cln.querySelector('.size-span').setAttribute('title', torrent.size);
          if (group_id && cln.dataset.releasegroup) {
            cln.dataset.releasegroup += group_id;
          } else if (group_id || group_id === '') {
            cln.dataset.releasegroup = group_id;
          }

          if (open_in_new_tab) cln.querySelector('.link_3').target = '_blank';

          if (show_tracker_icon) {
            cln.querySelector('img').src = get_tracker_icon(torrent.site);
            cln.querySelector('img').title = torrent.site;
          }

          // Handle the download link based on the tracker
          let elements = cln
            .querySelector('.basic-movie-list__torrent__action')
            .querySelectorAll('a');
          if (elements.length > 0) {
            const element = [...elements].find((a) => a.textContent.trim() === 'DL');

            // Handle specific tracker download links
            if (element) {
              if (torrent.site === 'RED') {
                element.href = torrent.download_link;
                element.dataset.torrentId = torrent.redId;
                element.dataset.tracker = 'RED';
                element.addEventListener('click', function (event) {
                  const downloadCompleted = element.dataset.downloadCompleted;
                  if (!downloadCompleted) {
                    event.preventDefault();
                    const torrentId = element.dataset.torrentId;
                    fetchDownloadUrl(torrentId, 'RED');
                  }
                });
              } else if (torrent.site === 'OPS') {
                element.href = torrent.download_link;
                element.dataset.torrentId = torrent.opsId;
                element.dataset.tracker = 'OPS';
                element.addEventListener('click', function (event) {
                  const downloadCompleted = element.dataset.downloadCompleted;
                  if (!downloadCompleted) {
                    event.preventDefault();
                    const torrentId = element.dataset.torrentId;
                    fetchDownloadUrl(torrentId, 'OPS');
                  }
                });
              } else {
                element.href = torrent.download_link; // Fallback for other trackers
              }
            }
          } else {
            console.log('No elements found matching the criteria.');
          }
          // Append the cloned row to the DOM
          if (ref_div) {
            insertAfter(cln, ref_div);
          } else {
            add_as_first(cln, torrent.quality);
          }

          doms.push({
            tracker: torrent.site,
            dom_path: cln,
            quality: torrent.quality,
            discount: torrent.discount,
            info_text: torrent.info_text,
            group_id: torrent.groupId,
            seeders,
            leechers: torrent.leech,
            snatchers: torrent.snatch,
            dom_id: torrent.site + '_' + i,
            size: torrent.size
          });
        });
      });

      let reduced_trackers = get_reduced_trackers(doms);
      let reduced_discounts = get_reduced_discounts(doms);
      let reduced_qualities = get_reduced_qualities(doms);

      if (!hide_filters_div) {
        add_filters_div(reduced_trackers, reduced_discounts, reduced_qualities);
        // disable_highlight()
        if (!isUnit3dSimilarPage()) add_sort_listeners();
      }
      console.log('Finished adding releases for other scripts');
      const event = new CustomEvent('PTPAddReleasesFromOtherTrackersComplete');
      document.dispatchEvent(event);
    };

    const insert_group = (quality, header_div) => {
      let all_trs = [
        ...document.querySelector('#torrent-table > tbody').querySelectorAll('tr.group_torrent')
      ];
      let tbody = document.querySelector('#torrent-table > tbody');

      if (quality === 'HD') {
        let idx = -2; // add_after_this_index

        for (let i = 0; i < all_trs.length; i++) {
          if (
            all_trs[i].textContent.includes('Other') ||
            all_trs[i].textContent.includes('Ultra High Definition') ||
            all_trs[i].textContent.includes('Soundtrack')
          ) {
            idx = i - 1;
            break;
          }
        }
        if (idx === -2) {
          tbody.appendChild(header_div); // nothing to stop me
        } else {
          insertAfter(header_div, all_trs[idx]);
        }
      } else if (quality === 'UHD') {
        let idx = -2; // add_after_this_index

        for (let i = 0; i < all_trs.length; i++) {
          if (
            all_trs[i].textContent.includes('Other') ||
            all_trs[i].textContent.includes('Soundtrack')
          ) {
            idx = i - 1;
            break;
          }
        }

        if (idx === -2) {
          tbody.appendChild(header_div); // nothing to stop me
        } else {
          insertAfter(header_div, all_trs[idx]);
        }
      } else if (quality === 'Soundtrack') {
        // Always insert Soundtrack at the very end
        tbody.appendChild(header_div);
      }
    };

    const get_group_header_div = (quality) => {
      let tr = document.createElement('tr');
      tr.className = 'group_torrent';

      let td = document.createElement('td');
      td.colSpan = '6';
      td.className = 'basic-movie-list__torrent-edition';

      let existingSpanMain = document.querySelector('.basic-movie-list__torrent-edition__main');
      let mainTextContent = existingSpanMain ? existingSpanMain.textContent : 'Feature Film';

      let spanMain = document.createElement('span');
      spanMain.className = 'basic-movie-list__torrent-edition__main';
      spanMain.textContent = mainTextContent;

      let spanSub = document.createElement('span');
      spanSub.className = 'basic-movie-list__torrent-edition__sub';
      spanSub.textContent = quality;

      td.appendChild(spanMain);
      td.appendChild(document.createTextNode(' - '));
      td.appendChild(spanSub);

      tr.appendChild(td);

      return tr;
    };

    const create_needed_groups = (torrents) => {
      let all_trs = [
        ...document.querySelector('#torrent-table > tbody').querySelectorAll('tr.group_torrent')
      ];
      let tbody = document.querySelector('#torrent-table > tbody');

      if (
        torrents.some((e) => e.quality === 'SD') &&
        !all_trs.some((d) => d.textContent.includes('Standard Definition'))
      ) {
        let group_header_example = get_group_header_div('Standard Definition');
        if (group_header_example) {
          tbody.insertBefore(
            group_header_example,
            document.querySelector('#torrent-table > tbody').firstChild
          );
        } else {
          console.error('Group header example for SD not found.');
        }
      }

      if (
        torrents.some((e) => e.quality === 'HD') &&
        !all_trs.some(
          (d) =>
            d.textContent.includes('High Definition') &&
            !d.textContent.includes('Ultra High Definition')
        )
      ) {
        let group_header_example = get_group_header_div('High Definition');
        if (group_header_example) {
          insert_group('HD', group_header_example);
        } else {
          console.error('Group header example for HD not found.');
        }
      }

      if (
        torrents.some((e) => e.quality === 'UHD') &&
        !all_trs.some((d) => d.textContent.includes('Ultra High Definition'))
      ) {
        let group_header_example = get_group_header_div('Ultra High Definition');
        if (group_header_example) {
          insert_group('UHD', group_header_example);
        } else {
          console.error('Group header example for UHD not found.');
        }
      }

      // New logic for Soundtrack group
      if (
        torrents.some((e) => e.quality === 'Soundtrack') &&
        !all_trs.some((d) => d.textContent.includes('Soundtrack'))
      ) {
        let group_header_example = get_group_header_div('Soundtrack');
        if (group_header_example) {
          insert_group('Soundtrack', group_header_example);
        } else {
          console.error('Group header example for Soundtrack not found.');
        }
      }
    };

    const filter_torrents = () => {
      let any_include = false;
      let any_exclude = false;
      let empties = [...document.querySelectorAll('tr.empty-row')];

      if (debug && !filter_torrents.hasLoggedDebugSummary) {
        console.log(`Filtering ${doms.length} external release rows`);
        filter_torrents.hasLoggedDebugSummary = true;
      }

      doms.forEach((e) => {
        let include_tracker = true;
        let include_discount = true;
        let include_quality = true;
        let include_text = true;

        let tracker_status = filters.trackers.find((d) => d.name === e.tracker)?.status;
        if (tracker_status === 'include') {
          any_include = true;
        } else if (tracker_status === 'exclude') {
          include_tracker = false;
          any_exclude = true;
        } else {
          include_tracker = filters.trackers.filter((d) => d.status === 'include').length === 0;
        }

        let discount_status = filters.discounts.find((d) => d.name === e.discount)?.status;
        if (discount_status === 'include') {
          any_include = true;
        } else if (discount_status === 'exclude') {
          include_discount = false;
          any_exclude = true;
        } else {
          include_discount = filters.discounts.filter((d) => d.status === 'include').length === 0;
        }

        let quality_status = filters.qualities.find((d) => d.name === e.quality)?.status;
        if (quality_status === 'include') {
          any_include = true;
        } else if (quality_status === 'exclude') {
          include_quality = false;
          any_exclude = true;
        } else {
          include_quality = filters.qualities.filter((d) => d.status === 'include').length === 0;
        }

        const torrentSearchElement = document.querySelector('.torrent-search');
        if (torrentSearchElement) {
          let must_include_words = torrentSearchElement.value
            .toLowerCase()
            .split(' ')
            .filter(Boolean);
          if (must_include_words.length > 0) {
            include_text = must_include_words.every((word) =>
              e.info_text.toLowerCase().includes(word)
            );
            if (include_text) {
              any_include = true;
            } else {
              any_exclude = true;
            }
          } else {
            // If the text search is empty, consider all rows for inclusion
          }
        }

        if (include_tracker && include_discount && include_quality && include_text) {
          e.dom_path.style.display = 'table-row';
          setFilterDetailRowsDisplay(e, true);
        } else {
          e.dom_path.style.display = 'none';
          setFilterDetailRowsDisplay(e, false);
        }
      });

      if (!any_include) {
        doms.forEach((e) => {
          if (!any_exclude || e.dom_path.style.display !== 'none') {
            e.dom_path.style.display = 'table-row';
            setFilterDetailRowsDisplay(e, true);
          }
        });
      }

      // Hide empty rows if there is any include
      if (any_include) {
        empties.forEach((e) => {
          e.classList.add('hidden', 'initially-hidden');
        });
      } else {
        empties.forEach((e) => {
          e.classList.remove('hidden', 'initially-hidden');
        });
      }
    };

    function setFilterDetailRowsDisplay(entry, visible) {
      getFilterDetailRows(entry).forEach((detail) => {
        if (!visible) {
          detail.style.display = 'none';
          return;
        }
        const expanded =
          entry.dom_path.querySelector('a.torrent-info-link')?.getAttribute('aria-expanded') ===
          'true';
        if (expanded) detail.style.display = 'table-row';
      });
    }

    function getFilterDetailRows(entry) {
      const rows = new Set();
      if (entry.detail_path) rows.add(entry.detail_path);

      const keys = [entry.dom_id, entry.dom_path?.dataset?.unit3dTorrentId].filter(Boolean);
      keys.forEach((key) => {
        document
          .querySelectorAll(
            `tr.${EXTERNAL_ROW_CLASS}-detail[data-unit3d-torrent-id="${cssEscape(key)}"], ` +
              `#torrent-table tr.torrent_info_row[data-unit3d-torrent-id="${cssEscape(key)}"]`
          )
          .forEach((row) => rows.add(row));
      });

      return [...rows];
    }

    const update_filter_box_status = (object_key, value, dom_path) => {
      let filter = filters[object_key].find((e) => e.name === value);
      let current_status = filter.status;

      if (current_status === 'default') {
        filter.status = 'include';
        dom_path.style.background = '#e1f5dc';
        dom_path.style.color = '#575757';
      } else if (current_status === 'include') {
        filter.status = 'exclude';
        dom_path.style.background = '#f8e4d6';
        dom_path.style.color = '#575757';
      } else {
        filter.status = 'default';
        dom_path.style.background = '';
        dom_path.style.opacity = 1;
        dom_path.style.removeProperty('color');
      }

      const event = new CustomEvent('AddReleasesStatusChanged');
      document.dispatchEvent(event);

      filter_torrents(); // big update
    };

    function apply_default_filters() {
      console.log('Applying default filters...');

      // Apply default tracker filters
      show_only_by_default.forEach((tracker) => {
        const trackerID = `#filter-${tracker.toLowerCase()}`;
        const dom_path = document.querySelector(trackerID);
        const trackerFilter = filters.trackers.find(
          (e) => e.name.toLowerCase() === tracker.toLowerCase()
        );

        if (trackerFilter) {
          trackerFilter.status = 'include';
          if (dom_path) {
            dom_path.style.background = '#e1f5dc';
            dom_path.style.color = '#575757';
          }
          console.log(`Applied tracker filter for ${tracker}`);
        } else {
          console.log(`Tracker ${tracker} not found in filters.`);
        }
      });

      // Apply default quality filters
      show_resolution_by_default.forEach((quality) => {
        const qualityElements = document.querySelectorAll('.filter-box');
        const qualityFilter = filters.qualities.find(
          (e) => e.name.toLowerCase() === quality.toLowerCase()
        );

        qualityElements.forEach((dom_path) => {
          if (dom_path.textContent.trim().toLowerCase() === quality.toLowerCase()) {
            dom_path.style.background = '#40E0D0';
          }
        });

        if (qualityFilter) {
          qualityFilter.status = 'include';
          console.log(`Applied quality filter for ${quality}`);
        } else {
          console.log(`Quality ${quality} not found in filters.`);
        }
      });

      filter_torrents(); // Applies the filters to the page
    }

    const fix_ptp_names = () => {
      document.querySelectorAll('tr.group_torrent').forEach((d) => {
        if (ptp_release_name && !improved_tags) {
          // Find the closest header element with a matching dom_id class
          const matchingDom = doms.find((dom) => d.classList.contains(dom.dom_id));
          if (matchingDom) {
            const torrent = d.querySelector('a.torrent-info-link');
            if (torrent) {
              // Extract the HTML element with the specific class if present
              const freeleechSpan = torrent.querySelector(
                'span.torrent-info__download-modifier.torrent-info__download-modifier--free'
              );
              const halfleechSpan = torrent.querySelector(
                'span.torrent-info__download-modifier.torrent-info__download-modifier--half'
              );
              const trumpableSpan = torrent.querySelector('span.torrent-info__trumpable');
              const reportedSpan = torrent.querySelector('span.torrent-info__reported');

              const freeleechSpanHtml = freeleechSpan ? freeleechSpan.outerHTML : '';
              const halfleechSpanHtml = halfleechSpan ? halfleechSpan.outerHTML : '';
              const trumpableSpanHtml = trumpableSpan ? trumpableSpan.outerHTML : '';
              const reportedSpanHtml = reportedSpan ? reportedSpan.outerHTML : '';

              [freeleechSpan, halfleechSpan, trumpableSpan, reportedSpan].forEach((span) => {
                if (span) span.remove(); // Remove the element temporarily
              });

              let ptp_info_text = matchingDom.info_text;

              // Function to replace full stops outside of the patterns
              const replaceFullStops = (text) => {
                let tempText = text;
                const protectedSegments = [];

                // Define patterns to keep full stops
                const keepPatterns = [
                  /\b\d\.\d\b/g,
                  /\bDD\d\.\d\b/g,
                  /\bDDP\d\.\d\b/g,
                  /\bDD\+\d\.\d\b/g,
                  /\bTrueHD \d\.\d\b/g,
                  /\bDTS\d\.\d\b/g,
                  /\bAC3\d\.\d\b/g,
                  /\bAAC\d\.\d\b/g,
                  /\bOPUS\d\.\d\b/g,
                  /\bMP3\d\.\d\b/g,
                  /\bFLAC\d\.\d\b/g,
                  /\bLPCM\d\.\d\b/g,
                  /\bH\.264\b/g,
                  /\bH\.265\b/g,
                  /\bDTS-HD MA \d\.\d\b/g,
                  /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                ];

                keepPatterns.forEach((pattern) => {
                  tempText = tempText.replace(pattern, (match) => {
                    const token = `__DOT_KEEP_${protectedSegments.length}__`;
                    protectedSegments.push({ token, match });
                    return token;
                  });
                });

                // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                tempText = tempText.replaceAll(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                tempText = tempText.replaceAll(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                tempText = tempText.replaceAll(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                tempText = tempText.replaceAll(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                protectedSegments.forEach(({ token, match }) => {
                  tempText = tempText.replaceAll(token, match);
                });

                // Additional replacements
                tempText = tempText
                  .replaceAll('DD+', 'DD+ ')
                  .replaceAll('DDP', 'DD+ ')
                  .replaceAll('DoVi', 'DV')
                  .replaceAll('(', '')
                  .replaceAll(')', '')
                  .replaceAll(/\bhdr\b/g, 'HDR')
                  .replaceAll(/\bweb\b/g, 'WEB')
                  .replaceAll(/\bbluray\b/g, 'BluRay')
                  .replaceAll(/\bh254\b/g, 'H.264')
                  .replaceAll(/\bh265\b/g, 'H.265')
                  .replaceAll(/\b\w/g, (char) => char.toUpperCase())
                  .replaceAll(/\bX264\b/g, 'x264')
                  .replaceAll(/\bX265\b/g, 'x265')
                  .replaceAll(/\b - \b/g, ' ');

                return tempText;
              };

              // Clean ptp_info_text by replacing full stops according to the rules
              const cleanedPtpInfoText = replaceFullStops(ptp_info_text);

              // Re-add the extracted HTML elements after making the modifications
              // Construct the final innerHTML string
              let finalHtml = `${cleanedPtpInfoText}`;

              [freeleechSpanHtml, halfleechSpanHtml, trumpableSpanHtml, reportedSpanHtml].forEach(
                (spanHtml) => {
                  if (spanHtml) finalHtml += ` / ${spanHtml}`;
                }
              );

              torrent.innerHTML = finalHtml;
            }
          }
        }
      });
    };

    const add_filters_div = (trackers, discounts, qualities) => {
      let div = document.createElement('div');
      div.className = 'panel__body';
      div.style.padding = '0 10px 5px 10px';
      div.style.display = GM_config.get('filterhidden') ? 'none' : 'block';

      // Filter by tracker section
      let filterByTracker = document.createElement('div');
      filterByTracker.style = 'display: flex; align-items: baseline';
      filterByTracker.style.margin = '4px 0';

      let label = document.createElement('div');
      label.textContent = 'Tracker: ';
      label.style.cursor = 'default';
      label.style.flex = '0 0 60px';
      filterByTracker.appendChild(label);

      let trackerContents = document.createElement('div');
      trackers.forEach((tracker_name) => {
        let div = document.createElement('div');
        div.id = `filter-${tracker_name.toLowerCase()}`;
        div.className = 'filter-box';
        div.textContent = tracker_name;
        div.style.padding = '2px 5px';
        div.style.margin = '3px';
        div.style.display = 'inline-block';
        div.style.cursor = 'pointer';
        div.style.fontSize = '1em';
        div.style.textAlign = 'center';

        div.addEventListener('click', () => {
          update_filter_box_status('trackers', tracker_name, div);
        });

        trackerContents.append(div);
      });
      filterByTracker.append(trackerContents);
      div.append(filterByTracker);

      let unavailableTrackers = active_trackers.filter((tracker) => !trackers.includes(tracker));

      if (unavailableTrackers.length > 0) {
        let unavailableTrackersSection = document.createElement('div');
        unavailableTrackersSection.style = 'display: flex; align-items: baseline';
        unavailableTrackersSection.style.margin = '4px 0';

        let unavailableLabel = document.createElement('div');
        unavailableLabel.textContent = 'Unavailable: ';
        unavailableLabel.style.cursor = 'default';
        unavailableLabel.style.flex = '0 0 60px';
        unavailableTrackersSection.appendChild(unavailableLabel);

        let unavailableContents = document.createElement('div');

        unavailableTrackers.forEach((tracker_name) => {
          let div = document.createElement('div');
          div.id = `unavailable-${tracker_name.toLowerCase()}`;
          div.className = 'filter-box';
          div.textContent = tracker_name;
          div.style.padding = '2px 5px';
          div.style.margin = '3px';
          div.style.display = 'inline-block';
          div.style.cursor = 'pointer';
          div.style.fontSize = '1em';
          div.style.textAlign = 'center';
          div.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Light red to indicate unavailability

          unavailableContents.append(div);
        });

        unavailableTrackersSection.append(unavailableContents);
        div.append(unavailableTrackersSection);
      }

      // Filter by discount section
      let additional_settings = document.createElement('div');
      additional_settings.style = 'display: flex; align-items: baseline';

      let label_2 = document.createElement('div');
      label_2.textContent = 'Discount: ';
      label_2.style.cursor = 'default';
      label_2.style.flex = '0 0 60px';
      additional_settings.appendChild(label_2);

      let discountContents = document.createElement('div');
      discounts.forEach((discount_name) => {
        let only_discount = document.createElement('div');
        only_discount.className = 'filter-box';
        only_discount.textContent = discount_name;
        only_discount.style.padding = '2px 5px';
        only_discount.style.margin = '3px';
        only_discount.style.display = 'inline-block';
        only_discount.style.cursor = 'pointer';
        only_discount.style.fontSize = '1em';

        only_discount.addEventListener('click', () => {
          update_filter_box_status('discounts', discount_name, only_discount);
        });
        discountContents.append(only_discount);
      });
      additional_settings.append(discountContents);
      div.append(additional_settings);

      // Filter by quality section
      let filterByQuality = document.createElement('div');
      filterByQuality.style = 'display: flex; align-items: baseline';
      filterByQuality.style.margin = '4px 0';

      let label_3 = document.createElement('div');
      label_3.textContent = 'Quality: ';
      label_3.style.cursor = 'default';
      label_3.style.flex = '0 0 60px';
      filterByQuality.appendChild(label_3);

      let qualityContents = document.createElement('div');
      qualities.forEach((quality_name) => {
        let quality = document.createElement('div');
        quality.className = 'filter-box';
        quality.textContent = quality_name;
        quality.style.padding = '2px 5px';
        quality.style.margin = '3px';
        quality.style.display = 'inline-block';
        quality.style.cursor = 'pointer';
        quality.style.fontSize = '1em';
        quality.style.textAlign = 'center';

        quality.addEventListener('click', () => {
          update_filter_box_status('qualities', quality_name, quality);
        });

        qualityContents.append(quality);
      });
      filterByQuality.append(qualityContents);
      div.append(filterByQuality);

      // Search box
      let filterByText = document.createElement('div');
      filterByText.style.margin = '8px 0 0';

      let input = document.createElement('input');
      input.className = 'torrent-search search-bar__search-field__input';
      input.type = 'text';
      input.spellcheck = false;
      input.placeholder = 'Search torrents...';
      input.style.fontSize = '1em';
      input.style.width = '84%';

      input.addEventListener('input', (e) => {
        filter_torrents();
      });
      filterByText.appendChild(input);

      // Reset button
      let rst = document.createElement('div');
      rst.textContent = '⟳';
      rst.style.padding = '4px 8px';
      rst.style.margin = '0px 4px';
      rst.style.display = 'inline-block';
      rst.style.cursor = 'pointer';
      rst.style.fontSize = '1em';
      rst.style.textAlign = 'center';

      rst.addEventListener('click', () => {
        document.querySelector('.torrent-search').value = '';
        filters = {
          trackers: trackers.map((e) => {
            return { name: e, status: 'default' };
          }),
          discounts: discounts.map((e) => {
            return { name: e, status: 'default' };
          }),
          qualities: qualities.map((e) => {
            return { name: e, status: 'default' };
          })
        };

        filter_torrents();

        document.querySelectorAll('.filter-box').forEach((d) => {
          d.style.background = '';
        });
      });
      filterByText.appendChild(rst);

      div.appendChild(filterByText);

      // Panel setup
      const panel = document.createElement('div');
      panel.id = FILTER_PANEL_ID;
      panel.className = 'panel';
      const panelHeading = document.createElement('div');
      panelHeading.className = 'panel__heading';
      panelHeading.style.cursor = 'pointer'; // Make the header clickable

      const panelHeadingTitle = document.createElement('span');
      panelHeadingTitle.textContent = 'Filter Releases';
      panelHeadingTitle.className = 'panel__heading__title';
      panelHeading.append(panelHeadingTitle);

      // Toggle functionality
      panelHeading.addEventListener('click', () => {
        let isHidden = div.style.display === 'none';
        div.style.display = isHidden ? 'block' : 'none';
        GM_config.set('filterhidden', !isHidden);
      });

      panel.append(panelHeading, div);
      placeFilterPanel(panel);
    };

    const get_example_div = () => {
      let tr = document.createElement('tr');
      tr.className = 'group_torrent group_torrent_header';
      tr.id = 'group_torrent_header';
      tr['data-releasename'] = 'release_name_here';
      tr['data-releasegroup'] = 'group_name_here';

      let td = document.createElement('td');
      td.style.width = '596px';

      let span = document.createElement('span');
      span.className = 'basic-movie-list__torrent__action';
      span.textContent = '[';

      let a = document.createElement('a');
      a.href = '#';
      a.className = 'link_1';
      a.textContent = ' DL ';
      a.title = 'Download';
      span.appendChild(a);

      span.innerHTML += ']';

      let a2 = document.createElement('a');
      a2.className = 'link_2';

      let img = document.createElement('img');
      img.style.width = '12px';
      img.style.height = '12px';
      img.height = '12';
      img.width = '12';
      img.src = 'static/common/check.png';
      img.alt = '☑';
      img.title = 'Tracker title';

      a2.appendChild(img);

      let a3 = document.createElement('a');
      a3.href = 'link_3';
      a3.className = 'torrent-info-link link_3';
      a3.textContent = 'INFO_TEXT_HERE';

      let whitespace = document.createTextNode(' ');

      td.appendChild(span);
      td.appendChild(a2);
      td.appendChild(whitespace);
      td.appendChild(a3);

      let td2 = document.createElement('td');
      td2.className = 'nobr';
      td2.style.width = '63px';

      let span2 = document.createElement('span');
      span2.className = 'size-span';
      span2.style.float = 'left';
      span2.title = 'SIZE_IN_BYTES_HERE';
      span2.textContent = 'TORRENT_SIZE_HERE';
      td2.appendChild(span2);

      let td3 = document.createElement('td');
      let td4 = document.createElement('td');
      let td5 = document.createElement('td');

      tr.appendChild(td);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tr.appendChild(td5);

      return tr;
    };

    const get_sorted_qualities = (qualities) => {
      let arr = [];

      qualities.forEach((q) => {
        if (q === 'SD') arr.push({ value: 0, name: q });
        else if (q === '720p') arr.push({ value: 3, name: q });
        else if (q === '1080p') arr.push({ value: 4, name: q });
        else if (q === '2160p') arr.push({ value: 5, name: q });
        else if (q === 'Soundtrack') arr.push({ value: 6, name: q });
      });

      arr.sort((a, b) => (a.value > b.value ? 1 : -1));
      return arr.map((e) => e.name);
    };

    const get_sorted_discounts = (discounts, simplediscounts) => {
      let arr = [];

      discounts.forEach((q) => {
        if (q === 'None') arr.push({ value: 0, name: q });
        else if (q === 'Rescuable') arr.push({ value: 1, name: q });
        else if (q === 'Rescue') arr.push({ value: 1, name: q });
        else if (q === 'Rewind') arr.push({ value: 2, name: q });
        else if (q === 'Refundable') arr.push({ value: 3, name: q });
        else if (q === 'Refund') arr.push({ value: 3, name: q });
        else if (q === '25% Freeleech') arr.push({ value: 4, name: q });
        else if (q === '25%') arr.push({ value: 4, name: q });
        else if (q === 'Copper') arr.push({ value: 5, name: q });
        else if (q === '30% Bonus') arr.push({ value: 6, name: q });
        else if (q === '30%') arr.push({ value: 6, name: q });
        else if (q === '40% Bonus') arr.push({ value: 7, name: q });
        else if (q === '40%') arr.push({ value: 7, name: q });
        else if (q === '50% Freeleech') arr.push({ value: 8, name: q });
        else if (q === '50%') arr.push({ value: 8, name: q });
        else if (q === 'Bronze') arr.push({ value: 9, name: q });
        else if (q === '75% Freeleech') arr.push({ value: 10, name: q });
        else if (q === '75%') arr.push({ value: 10, name: q });
        else if (q === 'Silver') arr.push({ value: 11, name: q });
        else if (q === 'Freeleech') arr.push({ value: 12, name: q });
        else if (q === 'FL') arr.push({ value: 12, name: q });
        else if (q === 'Golden') arr.push({ value: 13, name: q });
        else if (q === 'Pollination') arr.push({ value: 14, name: q });
        else if (q === 'Pollin') arr.push({ value: 14, name: q });
      });

      arr.sort((a, b) => (a.value < b.value ? 1 : -1));
      return arr.map((e) => e.name);
    };

    const get_reduced_trackers = (doms) => {
      let lst = []; // default

      doms.forEach((t) => {
        if (lst.includes(t.tracker) === false) lst.push(t.tracker);
      });

      return lst.sort((a, b) => (a > b ? 1 : -1));
    };

    const get_reduced_discounts = (doms) => {
      let lst = [];

      doms.forEach((t) => {
        if (lst.includes(t.discount) === false) lst.push(t.discount);
      });

      return get_sorted_discounts(lst);
    };

    const get_reduced_qualities = (doms) => {
      let lst = [];

      qualities.forEach((q) => {
        for (const dom of doms) {
          if (
            dom.info_text.toLowerCase().includes(q.toLowerCase()) &&
            q != 'SD' &&
            !lst.includes(q)
          ) {
            lst.push(q);
            break;
          }
        }
      });

      return get_sorted_qualities(lst.concat(['SD']));
    };

    let seed_desc = true;
    let leech_desc = true;
    let snatch_desc = true;
    let size_desc = true;
    let sortingInProgress = false;

    const add_sort_listeners = () => {
      const sortTable = (key, desc) => {
        if (sortingInProgress) return;
        sortingInProgress = true;

        let rowsData = [];

        // Collecting main rows and their hidden siblings
        document.querySelectorAll('tr.group_torrent.group_torrent_header').forEach((row) => {
          let sizeElement = row.querySelector('td.nobr span');
          if (!sizeElement) return;

          let keyElement;
          let parsedKey = null; // Default value for rows without key elements
          const sizeTd = sizeElement.closest('td');
          const tds = Array.from(row.children);
          const sizeIndex = tds.indexOf(sizeTd);

          switch (key) {
            case 'seeders':
              keyElement = tds[sizeIndex + 2]; // Assuming seeders column is 3 columns after size
              parsedKey = keyElement
                ? Number.parseInt(keyElement.textContent.trim().replaceAll(',', '')) || 0
                : 0;
              break;
            case 'leechers':
              keyElement = tds[sizeIndex + 3]; // Assuming leechers column is 4 columns after size
              parsedKey = keyElement
                ? Number.parseInt(keyElement.textContent.trim().replaceAll(',', '')) || 0
                : 0;
              break;
            case 'snatchers':
              keyElement = tds[sizeIndex + 1]; // Assuming snatchers column is 2 columns after size
              parsedKey = keyElement
                ? Number.parseInt(keyElement.textContent.trim().replaceAll(',', '')) || 0
                : 0;
              break;
            case 'size': {
              let sizeText = sizeElement.getAttribute('title');
              parsedKey = sizeText ? Number.parseInt(sizeText.replaceAll(',', '')) || 0 : 0;
              break;
            }
            default:
              parsedKey = 0;
          }

          let dataObj = {
            key: parsedKey,
            mainRow: row,
            hiddenRows: []
          };

          // Track hidden sibling rows
          let nextRow = row.nextElementSibling;
          while (nextRow && nextRow.classList.contains('torrent_info_row')) {
            dataObj.hiddenRows.push(nextRow);
            nextRow = nextRow.nextElementSibling;
          }

          rowsData.push(dataObj);
        });

        // Filter and sort rows with valid keys
        let sortableRows = rowsData.filter((row) => row.key !== null);
        sortableRows.sort((a, b) => (desc ? b.key - a.key : a.key - b.key));

        // Remove existing rows from the DOM
        document.querySelectorAll('.group_torrent, .torrent_info_row').forEach((d) => d.remove());

        // Re-insert sorted rows and their hidden siblings
        const tbody = document.querySelector('table.torrent_table > tbody');
        sortableRows.forEach((dataObj) => {
          tbody.appendChild(dataObj.mainRow);
          dataObj.hiddenRows.forEach((row) => tbody.appendChild(row));
        });

        console.log('Finished sorting');
        const event = new CustomEvent('SortingComplete');
        document.dispatchEvent(event);

        // Allow sorting again after a brief delay
        setTimeout(() => {
          sortingInProgress = false;
        }, 500); // Adjust the delay as needed
      };

      const addSortListener = (headerElement, key, descRef) => {
        headerElement.style.cursor = 'pointer';
        headerElement.addEventListener('click', () => {
          descRef.value = !descRef.value;
          sortTable(key, descRef.value);
        });
      };

      const seed_th = [
        ...document.querySelector('table.torrent_table').querySelectorAll('th')
      ].find((e) => e.querySelector('img')?.src.includes('seeders.png'));
      addSortListener(seed_th, 'seeders', { value: seed_desc });

      const leech_th = [
        ...document.querySelector('table.torrent_table').querySelectorAll('th')
      ].find((e) => e.querySelector('img')?.src.includes('leechers.png'));
      addSortListener(leech_th, 'leechers', { value: leech_desc });

      const snatch_th = [
        ...document.querySelector('table.torrent_table').querySelectorAll('th')
      ].find((e) => e.querySelector('img')?.src.includes('snatched.png'));
      addSortListener(snatch_th, 'snatchers', { value: snatch_desc });

      const size_th = [
        ...document.querySelector('table.torrent_table').querySelectorAll('th')
      ].find((e) => e.textContent === 'Size');
      addSortListener(size_th, 'size', { value: size_desc });
    };

    // UNIT3D layout owns table sorting.
    if (!isUnit3dSimilarPage()) add_sort_listeners();

    let line_example = get_example_div();

    const trackerStatusState = {
      active: false,
      errors: [],
      hideTimer: null,
      statuses: new Map(),
      total: 0
    };

    function installStatusPanelStyle() {
      if (document.getElementById(STATUS_STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STATUS_STYLE_ID;
      style.textContent = `
#${STATUS_PANEL_ID} {
  margin: 0.75rem 0;
  border-radius: 6px;
  overflow: hidden;
}
#${STATUS_PANEL_ID}[hidden] {
  display: none !important;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-summary {
  margin-bottom: 0.5rem;
  font-weight: 700;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.75rem;
  padding: 0.15rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item::before {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  content: "";
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item--pending::before {
  background: #9aa0a6;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item--fetching::before {
  background: #61afef;
  box-shadow: 0 0 0 0.18rem rgba(97, 175, 239, 0.18);
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item--success::before {
  background: #98c379;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item--empty::before {
  background: #e5c07b;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-item--error::before {
  background: #e06c75;
}
#${STATUS_PANEL_ID} .unit3d-add-releases-status-errors {
  margin: 0.6rem 0 0;
  padding-left: 1.25rem;
  color: #f2a7ad;
}
`;
      (document.head || document.documentElement).appendChild(style);
    }

    function findStatusPanelInsertTarget() {
      const mainColumn = document.querySelector('.unit3d-ptp-page > .main-column');
      if (mainColumn) {
        return {
          anchor: mainColumn.querySelector('.unit3d-ptp-table-scroll') || mainColumn.firstChild,
          container: mainColumn,
          method: 'before'
        };
      }

      const torrentPanel = document.querySelector('#torrent-table')?.closest('.panelV2');
      if (torrentPanel?.parentNode) {
        return {
          anchor: torrentPanel,
          container: torrentPanel.parentNode,
          method: 'before'
        };
      }

      const title =
        document.querySelector('section.meta .meta__title-link') ||
        document.querySelector('.meta__title-link') ||
        document.querySelector('section.meta .meta__title') ||
        document.querySelector('.meta__title.page__title, .meta__title, .page__title');
      if (title?.parentNode && !title.closest('aside, .unit3d-ptp-sidebar')) {
        return {
          anchor: title.nextSibling,
          container: title.parentNode,
          method: 'before'
        };
      }

      return {
        anchor: null,
        container:
          document.querySelector('#content') ||
          document.querySelector('.unit3d-ptp-page') ||
          document.body,
        method: 'prepend'
      };
    }

    function placeStatusPanel(panel) {
      const target = findStatusPanelInsertTarget();
      if (target.method === 'prepend') {
        if (panel.parentNode !== target.container || target.container.firstChild !== panel) {
          target.container.prepend(panel);
        }
        return;
      }
      if (target.anchor) {
        if (panel.parentNode !== target.container || panel.nextSibling !== target.anchor) {
          target.container.insertBefore(panel, target.anchor);
        }
        return;
      }
      if (panel.parentNode !== target.container || target.container.lastChild !== panel) {
        target.container.appendChild(panel);
      }
    }

    function ensureStatusPanel() {
      installStatusPanelStyle();
      let panel = document.getElementById(STATUS_PANEL_ID);
      if (panel) {
        placeStatusPanel(panel);
        return panel;
      }

      panel = document.createElement('section');
      panel.id = STATUS_PANEL_ID;
      panel.className = 'panelV2 unit3d-add-releases-status-panel';
      panel.hidden = true;
      panel.innerHTML = `
        <h2 class="panel__heading">
          <i class="fas fa-cloud-download-alt"></i>
          Other tracker status
        </h2>
        <div class="panel__body">
          <div class="unit3d-add-releases-status-summary"></div>
          <ul class="unit3d-add-releases-status-list"></ul>
          <ul class="unit3d-add-releases-status-errors"></ul>
        </div>
      `;

      placeStatusPanel(panel);
      return panel;
    }

    function removeStatusPanel() {
      document.getElementById(STATUS_PANEL_ID)?.remove();
    }

    function getTrackerStatusKey(tracker) {
      return String(tracker || 'General');
    }

    function renderStatusPanel() {
      const panel = ensureStatusPanel();
      const hasErrors = trackerStatusState.errors.length > 0;
      const hasStatuses = trackerStatusState.statuses.size > 0;
      panel.hidden = !trackerStatusState.active && !hasErrors && !hasStatuses;
      if (panel.hidden) return;

      const values = [...trackerStatusState.statuses.values()];
      const completed = values.filter((entry) =>
        ['success', 'empty', 'error'].includes(entry.state)
      ).length;
      const displayTotal = Math.max(trackerStatusState.total, values.length);
      const summary = panel.querySelector('.unit3d-add-releases-status-summary');
      const errorCount = trackerStatusState.errors.length;
      if (trackerStatusState.active) {
        summary.textContent = `Fetching tracker data: ${completed}/${displayTotal}`;
      } else if (errorCount > 0) {
        summary.textContent = `Finished with ${errorCount} error${errorCount === 1 ? '' : 's'}`;
      } else {
        summary.textContent = `Finished fetching tracker data: ${completed}/${displayTotal}`;
      }

      const list = panel.querySelector('.unit3d-add-releases-status-list');
      list.replaceChildren(
        ...values.map((entry) => {
          const item = document.createElement('li');
          item.className = `unit3d-add-releases-status-item unit3d-add-releases-status-item--${entry.state}`;
          item.title = entry.message || '';
          item.textContent = `${entry.label}: ${entry.message || entry.state}`;
          return item;
        })
      );

      const errors = panel.querySelector('.unit3d-add-releases-status-errors');
      errors.replaceChildren(
        ...trackerStatusState.errors.map((message) => {
          const item = document.createElement('li');
          item.textContent = message;
          return item;
        })
      );
      errors.hidden = trackerStatusState.errors.length === 0;
    }

    function beginTrackerStatus(trackersToFetch) {
      if (trackerStatusState.hideTimer) {
        clearTimeout(trackerStatusState.hideTimer);
        trackerStatusState.hideTimer = null;
      }
      trackerStatusState.active = true;
      trackerStatusState.errors = [];
      trackerStatusState.statuses = new Map(
        trackersToFetch.map((tracker) => [
          getTrackerStatusKey(tracker),
          { label: getTrackerStatusKey(tracker), message: 'Queued', state: 'pending' }
        ])
      );
      trackerStatusState.total = trackersToFetch.length;
      renderStatusPanel();
    }

    function setTrackerStatus(tracker, state, message) {
      const key = getTrackerStatusKey(tracker);
      const existing = trackerStatusState.statuses.get(key);
      if (existing?.state === 'error' && state !== 'error') return;
      trackerStatusState.statuses.set(key, {
        label: existing?.label || key,
        message,
        state
      });
      renderStatusPanel();
    }

    function addTrackerStatusError(text, tracker = 'General') {
      const message = String(text || '').trim();
      if (!message) return;
      if (!trackerStatusState.errors.includes(message)) {
        trackerStatusState.errors.push(message);
      }
      setTrackerStatus(tracker, 'error', message);
    }

    function completeTrackerStatus() {
      trackerStatusState.active = false;
      renderStatusPanel();
      if (trackerStatusState.errors.length > 0) return;
      trackerStatusState.statuses.clear();
      removeStatusPanel();
    }

    function detectStatusTracker(text) {
      const message = String(text || '');
      return (
        [...trackerStatusState.statuses.keys()]
          .sort((a, b) => b.length - a.length)
          .find((tracker) =>
            new RegExp(`(^|\\b)${escapeRegExp(tracker)}(\\b|$)`, 'i').test(message)
          ) || 'General'
      );
    }

    function displayAlert(text) {
      addTrackerStatusError(text, detectStatusTracker(text));
    }

    async function waitForTvdbId(imdb_Id) {
      let tvdbId = await GM_getValue(`tvdb_id_${imdb_Id}`);
      if (tvdbId) {
        return tvdbId;
      } else {
        const query = `
                    SELECT ?item ?itemLabel ?tvdbID WHERE {
                    ?item wdt:P345 "${imdb_Id}" .
                    ?item wdt:P4835 ?tvdbID .
                    SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
                    }
                `;
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

        return new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 10000,
            onload: function (response) {
              try {
                const data = JSON.parse(response.responseText);
                console.log(data);
                if (data && data.results && data.results.bindings.length > 0) {
                  const tvdbId = data.results.bindings[0].tvdbID.value;
                  GM_setValue(`tvdb_id_${imdb_Id}`, tvdbId);
                  resolve(tvdbId);
                } else {
                  resolve(null);
                }
              } catch (error) {
                console.log('Failed to parse TVDB ID response from Wikidata.', error);
                resolve(null);
              }
            },
            onerror: function () {
              console.log('Failed to fetch TVDB ID from Wikidata.');
              resolve(null);
            },
            ontimeout: function () {
              console.log('TVDB ID request to Wikidata timed out.');
              resolve(null);
            }
          });
        });
      }
    }

    // Function to get TVmaze ID
    async function getTvmazeId(imdb_Id) {
      let tvmazeId = await GM_getValue(`tvmaze_id_${imdb_Id}`);
      if (tvmazeId) {
        return tvmazeId;
      } else {
        const tvmazeUrl = `https://api.tvmaze.com/lookup/shows?imdb=${imdb_Id}`;

        return new Promise((resolve) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: tvmazeUrl,
            timeout: 10000,
            onload: function (response) {
              try {
                const data = JSON.parse(response.responseText);
                if (data && data.id) {
                  GM_setValue(`tvmaze_id_${imdb_Id}`, data.id);
                  resolve(data.id);
                } else {
                  resolve(null);
                }
              } catch (error) {
                console.error('Failed to parse TVmaze data.', error);
                resolve(null);
              }
            },
            onerror: function () {
              console.error('Failed to fetch TVmaze data.');
              resolve(null);
            },
            ontimeout: function () {
              console.error('TVmaze request timed out.');
              resolve(null);
            }
          });
        });
      }
    }

    function getUnit3dTitleText() {
      const titleText =
        document.querySelector(
          '.meta__title.page__title, .meta__title, .torrent__name, h1:not(.page__title), .page__title'
        )?.textContent || document.title.replace(/\s+-\s+.*$/, '');

      return normalizeUnit3dTitleText(titleText);
    }

    function getUnit3dTitleMeta() {
      const raw = getUnit3dTitleText();
      return {
        raw,
        title: stripUnit3dTitleYear(raw),
        year: extractUnit3dTitleYear(raw)
      };
    }

    function normalizeUnit3dTitleText(value) {
      return String(value || '')
        .replaceAll(/\s+/g, ' ')
        .trim();
    }

    function extractUnit3dTitleYear(value) {
      const match = String(value || '').match(/(?:\(|\[)\s*(\d{4})\s*(?:\)|\])/);
      if (!match) return null;
      const year = Number.parseInt(match[1], 10);
      return Number.isFinite(year) ? year : null;
    }

    function stripUnit3dTitleYear(value) {
      return normalizeUnit3dTitleText(
        String(value || '').replaceAll(/\s*(?:\(\s*\d{4}\s*\)|\[\s*\d{4}\s*\])\s*/g, ' ')
      );
    }

    function getUnit3dGenreTags() {
      const tags = [];
      const addGenreText = (value) => {
        String(value || '')
          .replace(/^genres\s*/i, '')
          .split(/\s*(?:\/|,|\n)\s*/g)
          .map(normalizeGenreTag)
          .filter(Boolean)
          .forEach((tag) => {
            if (!tags.includes(tag)) tags.push(tag);
          });
      };

      document
        .querySelectorAll(
          [
            '.meta__genres .meta-chip__value',
            '.work__tags a[href*="genreIds"]',
            '.torrent-search--grouped__genres a[href*="genreIds"]',
            '.torrent-card__genres a[href*="genreIds"]',
            'a[href*="/torrents?"][href*="genreIds"]'
          ].join(', ')
        )
        .forEach((element) => addGenreText(element.textContent));

      document.querySelectorAll('#unit3d-imdb-movie-info .unit3d-imdb-kv dt').forEach((term) => {
        if (!/^genres$/i.test(term.textContent.trim())) return;
        addGenreText(term.nextElementSibling?.textContent || '');
      });

      readGenreExport(document.documentElement.dataset.unit3dImdbGenres).forEach(addGenreText);
      readGenreExport(localStorage.getItem(`unit3d_imdb_genres_${findUnit3dImdbId()}`)).forEach(
        addGenreText
      );

      return tags;
    }

    function readGenreExport(value) {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.genres)) return parsed.genres;
      } catch {
        return [];
      }
      return [];
    }

    function normalizeGenreTag(value) {
      const normalized = String(value || '')
        .replace(/\band\b/gi, '&')
        .replaceAll(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      const aliases = {
        'sci fi': 'science fiction',
        'sci-fi': 'science fiction',
        scifi: 'science fiction'
      };
      return aliases[normalized] || normalized;
    }

    function isOtwAllowedGenre(genre) {
      return genre === 'animation' || genre === 'family';
    }

    function findUnit3dImdbId() {
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

    function waitForUnit3dTable(timeoutMs = 20000) {
      const existing = document.querySelector('#torrent-table');
      if (existing) return Promise.resolve(existing);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          observer.disconnect();
          resolve(document.querySelector('#torrent-table'));
        }, timeoutMs);
        const observer = new MutationObserver(() => {
          const table = document.querySelector('#torrent-table');
          if (!table) return;
          clearTimeout(timeout);
          observer.disconnect();
          resolve(table);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      });
    }

    const mainFunc = async () => {
      if (!isUnit3dSimilarPage()) return;
      if (!document.querySelector('#torrent-table')) {
        await waitForUnit3dTable();
      }

      if (!isUnit3dSimilarPage() && (improved_tags || ptp_release_name)) {
        fix_ptp_names();
      }

      const imdb_id = findUnit3dImdbId();
      if (!imdb_id) {
        console.log('Failed to extract IMDb ID from UNIT3D page');
        return;
      }

      let tvdbId;
      if (trackers.includes('BTN')) {
        tvdbId = await waitForTvdbId(imdb_id);
        if (tvdbId) {
          console.log(`TVDB ID is ${tvdbId}`);
        } else {
          console.log('TVDB ID not found.');
        }
      }

      let tvmazeId;
      if (trackers.includes('NBL')) {
        tvmazeId = await getTvmazeId(imdb_id);
        if (tvmazeId) {
          console.log(`TVmaze ID is ${tvmazeId}`);
        } else {
          console.log('TVmaze ID not found yet.');
        }
      }

      const pageTitle = getUnit3dTitleMeta();
      let name_url = pageTitle.raw;
      let show_name;
      let show_nbl_name;
      let red_name;

      let year = pageTitle.year;

      // Process show name
      const akaIndex = name_url.indexOf(' AKA ');
      if (akaIndex === -1) {
        show_name = pageTitle.title || name_url;
        show_nbl_name = show_name;
      } else {
        show_name = stripUnit3dTitleYear(name_url.substring(0, akaIndex));
        show_nbl_name = show_name;
      }

      const colonIndex = show_nbl_name.indexOf(':');
      if (colonIndex !== -1) {
        show_nbl_name = show_nbl_name.substring(0, colonIndex);
      }

      red_name = show_name.replaceAll(/[:-]+/g, '').trim();
      show_name = show_name.trim().replaceAll(/[\s:]+$/g, '');
      show_nbl_name = show_nbl_name.trim().replaceAll(/[\s:]+$/g, '');

      if (trackers.length === 0) {
        beginTrackerStatus([]);
        displayAlert('No trackers enabled');
        completeTrackerStatus();
        return;
      }

      beginTrackerStatus(trackers);
      let promises = [];
      trackers.forEach((t) => {
        setTrackerStatus(t, 'fetching', 'Fetching');
        promises.push(
          fetch_tracker(t, imdb_id, show_name, show_nbl_name, red_name, tvdbId, tvmazeId, year)
            .then((torrentList) => {
              const resultCount = Array.isArray(torrentList) ? torrentList.length : 0;
              setTrackerStatus(
                t,
                resultCount > 0 ? 'success' : 'empty',
                resultCount > 0
                  ? `${resultCount} release${resultCount === 1 ? '' : 's'}`
                  : 'No results'
              );
              return torrentList;
            })
            .catch((error) => {
              const message = error?.message || String(error || 'Unknown error');
              addTrackerStatusError(`${t}: ${message}`, t);
              return [];
            })
        );
      });
      Promise.all(promises).then((torrents_lists) => {
        // Combine all torrents into one array
        const all_torrents = torrents_lists
          .flat()
          .filter(Boolean)
          .sort((a, b) => {
            // Check if both torrents are soundtracks
            if (a.quality === 'Soundtrack' && b.quality === 'Soundtrack') {
              // Sort by groupId (album title) first
              if ((a.album || '').localeCompare(b.album || '') !== 0) {
                return (a.album || '').localeCompare(b.album || ''); // Sort alphabetically by groupId (album title)
              }
              // Sort by year if groupId is the same
              if (a.year !== b.year) {
                return a.year < b.year ? 1 : -1; // Sort descending by year
              }
              // Sort by title if year is the same
              if ((a.title || '').localeCompare(b.title || '') !== 0) {
                return (a.title || '').localeCompare(b.title || ''); // Sort alphabetically by title
              }
              // Sort by catalog if title is the same
              if ((a.catalog || '').localeCompare(b.catalog || '') !== 0) {
                return (a.catalog || '').localeCompare(b.catalog || ''); // Sort alphabetically by catalog
              }
              // If catalog is the same, sort by size
              return a.size > b.size ? 1 : -1;
            }
            // Otherwise, sort by size for non-soundtrack torrents
            return a.size < b.size ? 1 : -1; // Sort descending by size
          });

        // Add external torrents to the page
        add_external_torrents(all_torrents);

        // Only apply default filters if there are any specified
        if (show_only_by_default.length > 0 || show_resolution_by_default.length > 0) {
          apply_default_filters();
        }

        localStorage.setItem('play_now_flag', 'true');
        completeTrackerStatus();
      });
    };

    function installLauncherStyle() {
      if (document.getElementById(LAUNCHER_STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = LAUNCHER_STYLE_ID;
      style.textContent = `
#${LAUNCHER_ID}.unit3d-add-releases-meta-action {
  cursor: pointer;
  white-space: nowrap;
}
.unit3d-add-releases-meta-action-item {
  list-style: none;
  margin: 0;
}
.meta__actions .unit3d-add-releases-meta-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
}
`;
      (document.head || document.documentElement).appendChild(style);
    }

    function createLauncherClickHandler(element) {
      return function clickHandler(e) {
        e.preventDefault();
        mainFunc();
        element.setAttribute('aria-disabled', 'true');
        element.classList.add('unit3d-add-releases-meta-action--used');
        element.removeEventListener('click', clickHandler);
      };
    }

    function createNativeActionLauncher() {
      const button = document.createElement('button');
      button.id = LAUNCHER_ID;
      button.type = 'button';
      button.className =
        'form__button form__button--text form__button--centered unit3d-add-releases-meta-action';
      button.title = 'Add releases from other trackers';
      button.innerHTML = '<i class="fas fa-plus"></i><span>Other trackers</span>';
      button.addEventListener('click', createLauncherClickHandler(button));
      return button;
    }

    function findNativeActionsContainer() {
      const actions = document.querySelector('section.meta .meta__actions, .meta__actions');
      if (!actions) return null;
      return actions.matches('menu, ul, ol, [role="menu"], [role="list"]')
        ? actions
        : actions.querySelector(
            ':scope > menu, :scope > ul, :scope > ol, :scope > [role="menu"]'
          ) || actions;
    }

    function appendNativeActionLauncher() {
      const actions = findNativeActionsContainer();
      if (!actions) return false;
      installLauncherStyle();

      const launcher = createNativeActionLauncher();
      if (actions.matches('menu, ul, ol, [role="menu"], [role="list"]')) {
        const item = document.createElement('li');
        item.className = 'meta__action unit3d-add-releases-meta-action-item';
        item.appendChild(launcher);
        actions.appendChild(item);
      } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'meta__action unit3d-add-releases-meta-action-item';
        wrapper.appendChild(launcher);
        actions.appendChild(wrapper);
      }

      return true;
    }

    function appendLinkboxLauncher() {
      const menu = document.querySelector('.unit3d-ptp-linkbox, .linkbox');
      if (!menu) return false;
      const newLink = document.createElement('a');
      newLink.id = LAUNCHER_ID;
      newLink.textContent = '[Other Trackers]';
      newLink.href = '#';
      newLink.className = 'linkbox_link';
      newLink.addEventListener('click', createLauncherClickHandler(newLink));
      menu.appendChild(newLink);
      return true;
    }

    const addLink = function () {
      if (document.getElementById(LAUNCHER_ID)) return;
      appendNativeActionLauncher() || appendLinkboxLauncher();
    };

    if (run_by_default) {
      mainFunc();
    } else {
      waitForUnit3dTable().then(addLink);
      document.addEventListener('unit3d:ptp-dom-ready', addLink, { once: true });
    }
  }
})();
