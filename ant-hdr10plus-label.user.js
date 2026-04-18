// ==UserScript==
// @name         ANT - HDR10+ Label Fix
// @version      1.0
// @description  Update visible HDR labels to HDR10+ when MediaInfo confirms HDR10+.
// @author       Audionut
// @match        https://anthelion.me/torrents.php?id=*
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const HDR10_PLUS_REGEX = /(?:\bHDR10\+|\bHDR10\s*PLUS\b|\bSMPTE\s*ST\s*2094\s*App\s*4\b)/i;
  const processedTorrentIds = new Set();

  function getTorrentIdFromRow(row) {
    const match = row.id.match(/^torrent(\d+)$/);
    return match ? match[1] : null;
  }

  function rowHasHdr10PlusMediaInfo(detailsRow) {
    const mediaInfoNode = detailsRow.querySelector('blockquote.mediainfoRaw');
    if (!mediaInfoNode) {
      return false;
    }

    const mediaInfoText = mediaInfoNode.textContent || '';
    return HDR10_PLUS_REGEX.test(mediaInfoText);
  }

  function updateVisibleHdrLabel(mainRow, torrentId) {
    const toggleLink = mainRow.querySelector(`a[data-toggle-target="#torrent_${torrentId}"]`);
    if (!toggleLink) {
      return;
    }

    const labelNodes = toggleLink.querySelectorAll('strong.torrent_label');
    labelNodes.forEach((labelNode) => {
      if (labelNode.textContent && labelNode.textContent.trim().toUpperCase() === 'HDR10') {
        labelNode.textContent = 'HDR10+';
      }
    });
  }

  function processMainRow(mainRow) {
    const torrentId = getTorrentIdFromRow(mainRow);
    if (!torrentId || processedTorrentIds.has(torrentId)) {
      return;
    }

    const detailsRow = document.getElementById(`torrent_${torrentId}`);
    if (!detailsRow || !detailsRow.classList.contains('torrentdetails')) {
      return;
    }

    if (rowHasHdr10PlusMediaInfo(detailsRow)) {
      updateVisibleHdrLabel(mainRow, torrentId);
    }

    processedTorrentIds.add(torrentId);
  }

  function processAllRows() {
    const mainRows = document.querySelectorAll('tr.torrent_row[id^="torrent"]');
    mainRows.forEach(processMainRow);
  }

  function observeTorrentTable() {
    const observer = new MutationObserver(() => {
      processAllRows();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processAllRows();
  observeTorrentTable();
})();