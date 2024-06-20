// ==UserScript==
// @name        PTP - Torrent Row Group Toggle
// @match       https://passthepopcorn.me/torrents.php?id=*
// @namespace  https://github.com/Audionut/add-trackers
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-torrent-row-group-toggle.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-torrent-row-group-toggle.js
// @version     1.1
// @icon        https://passthepopcorn.me/favicon.ico
// @require     https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// ==/UserScript==

function toggleRowGroup(startRow, hide) {
    let row = startRow.nextElementSibling;
    while (row && !row.querySelector('.basic-movie-list__torrent-edition__sub') && row.tagName !== 'TBODY') {
      if (!row.classList.contains('initially-hidden')) {
        if (hide) {
          if (row.style.display === 'table-row') {
            row.dataset.originalDisplay = 'table-row';
            row.style.display = '';
          }
          row.classList.add('hidden');
        } else {
          row.classList.remove('hidden');
          if (row.dataset.originalDisplay) {
            row.style.display = row.dataset.originalDisplay;
            delete row.dataset.originalDisplay;
          }
        }
      }
      row = row.nextElementSibling;
    }
  }

function addRowGroupToggleButtons() {
  const rowGroups = document.querySelectorAll('.basic-movie-list__torrent-edition__sub');

  document.querySelectorAll('.row-toggle-button').forEach(button => button.remove());

  rowGroups.forEach(rowGroup => {
    const toggleButton = document.createElement('a');
    toggleButton.innerHTML = '(Hide)';
    toggleButton.classList.add('row-toggle-button');
    toggleButton.style = 'margin-left: 10px; font-size:0.9em; font-weight: normal; cursor: pointer;';

    toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      const row = rowGroup.closest('tr');
      const hide = toggleButton.innerHTML === '(Hide)';
      toggleRowGroup(row, hide);
      toggleButton.innerHTML = hide ? '(Show)' : '(Hide)';
    });

    rowGroup.parentElement.appendChild(toggleButton);
  });
}

function markInitiallyHiddenRows() {
  const rows = document.querySelectorAll('#torrent-table tr.hidden:not(.initially-hidden)');
  rows.forEach(row => row.classList.add('initially-hidden'));
}

function applySettings() {
  const rowGroups = document.querySelectorAll('.basic-movie-list__torrent-edition__sub');
  rowGroups.forEach(rowGroup => {
    const labelText = rowGroup.textContent.trim();
    const isChecked = GM_getValue(`setting-${labelText}`, true);
    const row = rowGroup.closest('tr');
    toggleRowGroup(row, !isChecked);
    const toggleButton = rowGroup.parentElement.querySelector('.row-toggle-button');
    if (toggleButton) {
      toggleButton.innerHTML = isChecked ? '(Hide)' : '(Show)';
    }
  });
}

function createSettingsMenu() {
  const rowGroups = document.querySelectorAll('.basic-movie-list__torrent-edition__sub');
  const fields = {};

  rowGroups.forEach((rowGroup, index) => {
    const labelText = rowGroup.textContent.trim();
    fields[`setting-${labelText}`] = {
      label: labelText,
      type: 'checkbox',
      default: GM_getValue(`setting-${labelText}`, true)
    };
  });

  GM_config.init({
    id: 'TorrentRowToggleConfig',
    title: 'Torrent Row Toggle Settings',
    fields: fields,
    css: `
      #TorrentRowToggleConfig {
        background: #333333;
        margin: 0;
        padding: 20px 20px;
        width: 90%; /* Adjust the width as needed */
        max-width: 500px; /* Optional: Set a max-width */
      }
      #TorrentRowToggleConfig .field_label {
        color: #fff;
        width: 90%;
      }
      #TorrentRowToggleConfig .config_header {
        color: #fff;
        padding-bottom: 10px;
        font-weight: 100;
      }
      #TorrentRowToggleConfig .reset {
        color: #e8d3d3;
        text-decoration: none;
      }
      #TorrentRowToggleConfig .config_var {
        display: flex;
        flex-direction: row;
        text-align: left;
        justify-content: center;
        align-items: center;
        width: 90%; /* Adjust the width to fit the new background size */
        margin: 4px auto;
        padding: 4px 0;
        border-bottom: 1px solid #7470703d;
      }
      #TorrentRowToggleConfig_buttons_holder {
        display: grid;
        gap: 10px;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1fr 1fr 1fr;
        width: 90%; /* Adjust the width to fit the new background size */
        height: 100px;
        margin: 0 auto;
        text-align: center;
        align-items: center;
      }
      #TorrentRowToggleConfig_saveBtn {
        grid-column: 1;
        grid-row: 1;
        cursor: pointer;
      }
      #TorrentRowToggleConfig_closeBtn {
        grid-column: 3;
        grid-row: 1;
        cursor: pointer;
      }
      #TorrentRowToggleConfig .reset_holder {
        grid-column: 2;
        grid-row: 2;
      }
      #TorrentRowToggleConfig .config_var input[type="checkbox"] {
        cursor: pointer;
      }
    `,
    events: {
      open: function (doc) {
        let style = this.frame.style;
        style.width = "500px"; // Adjust the width as needed
        style.height = "400px"; // Adjust the height as needed
        style.inset = "";
        style.top = "10%"; // Adjust the top position as needed
        style.right = "10%"; // Adjust the right position as needed
        style.borderRadius = "10px"; // Adjust the border radius as needed
        console.log("Config window opened");

        // Add tooltips
        for (const field in fields) {
          if (fields.hasOwnProperty(field) && fields[field].tooltip) {
            let label = doc.querySelector(`label[for="TorrentRowToggleConfig_field_${field}"]`);
            if (label) {
              label.title = fields[field].tooltip;
            }
          }
        }
      },
      save: function () {
        const rowGroups = document.querySelectorAll('.basic-movie-list__torrent-edition__sub');
        rowGroups.forEach(rowGroup => {
          const labelText = rowGroup.textContent.trim();
          const isChecked = GM_config.get(`setting-${labelText}`);
          GM_setValue(`setting-${labelText}`, isChecked);
          const row = rowGroup.closest('tr');
          toggleRowGroup(row, !isChecked);
          const toggleButton = rowGroup.parentElement.querySelector('.row-toggle-button');
          if (toggleButton) {
            toggleButton.innerHTML = isChecked ? '(Hide)' : '(Show)';
          }
        });
      }
    }
  });

GM_registerMenuCommand("Toggle Settings", () => { GM_config.open(); });
}

function initializeScript() {
  console.log('Initializing group hidden script');
  if (!document.querySelector('body').classList.contains('script-initialized')) {
    document.querySelector('body').classList.add('script-initialized');
    markInitiallyHiddenRows();
  }
  createSettingsMenu();
  addRowGroupToggleButtons();
  applySettings();
}

(function () {
  'use strict';

  initializeScript();

  document.addEventListener('PTPAddReleasesFromOtherTrackersComplete', () => {
    console.log("Rerunning to hide added releases");
    setTimeout(() => {
      createSettingsMenu();
      addRowGroupToggleButtons();
      applySettings();
    }, 100);
  });

  document.addEventListener('AddReleasesStatusChanged', () => {
    console.log('AddReleasesStatusChanged event triggered');
    setTimeout(() => {
      createSettingsMenu();
      addRowGroupToggleButtons();
      applySettings();
    }, 50);
  });
})();