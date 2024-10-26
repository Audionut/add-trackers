// ==UserScript==
// @name           Gazelle File Count
// @namespace      NWCD/OPS/RED
// @description    Shows the number of tracks and/or files in each torrent
// @version        2.0.3
// @match          https://notwhat.cd/torrents.php*id=*
// @match          https://orpheus.network/torrents.php*id=*
// @match          https://redacted.ch/torrents.php*id=*
// @downloadURL    https://github.com/Audionut/add-trackers/raw/main/gazelle-file-count.js
// @updateURL      https://github.com/Audionut/add-trackers/raw/main/gazelle-file-count.js
// @grant          none
// ==/UserScript==

// _____________________________________________________________
// _____________ Preferences ___________________________________


//    How to display the file count:

//    1 = Total number of files in torrent (15)
//    2 = Number of tracks out of total files (12/15)
//    3 = Number of tracks plus extra files (12+3)
//    4 = Only the number of tracks (12)

        var display = 1;



//    Highlight editions with conflicting track counts:

        var checkEditions = true;



//    Highlight torrents with extra files (usually artwork)
//    exceeding this size (in MB; 0 = disable):

        var extraSizeLimit = 40;



//    Always show the size of extras when hovering over a
//    torrent size (false = only the highlighted ones):

        var tooltipAll = false;


// _____________________________________________________________
// __________ End of Preferences _______________________________


function toBytes(size) {
  var num = parseFloat(size.replace(',', ''));
  var i = ' KMGT'.indexOf(size.charAt(size.length-2));
  return Math.round(num * Math.pow(1024, i));
}

function toSize(bytes) {
  if (bytes <= 0) return '0 B';
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  var num = Math.round(bytes / Math.pow(1024, i));
  return num + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
}

function addStyle(css) {
  var s = document.createElement('style');
  s.type = 'text/css';
  s.textContent = css;
  document.head.appendChild(s);
}

function setTitle(elem, str) {
  elem.title = str;
  if (window.jQuery && jQuery.fn.tooltipster) {
    jQuery(elem).tooltipster({ delay: 500, maxWidth: 400 });
  }
}

var table = document.getElementById('torrent_details');
if (table) {

  var isMusic = !!document.querySelector('.box_artists');
  extraSizeLimit = extraSizeLimit * 1048576;

  addStyle(
    '.gmfc_files { cursor: pointer; }' +
    '.gmfc_extrasize { background-color: rgba(228, 169, 29, 0.12) !important; }'
  );

  table.rows[0].insertCell(1).innerHTML = '<strong>Files</strong>';

  var rows = table.querySelectorAll('.edition, .torrentdetails');
  for (var i = rows.length; i--; ) {
    ++rows[i].cells[0].colSpan;
  }

  rows = table.getElementsByClassName('torrent_row');
  var editions = {};

  for (var i = rows.length; i--; ) {

    var fileRows = rows[i].nextElementSibling.
        querySelectorAll('.filelist_table tr:not(:first-child)');
    var numFiles = fileRows.length;
    var numTracks = 0;

    if (isMusic) {
      var extraSize = 0;

      for (var j = numFiles; j--; ) {
        if (/\.(flac|mp3|m4a|ac3|dts)\s*$/i.test(fileRows[j].cells[0].textContent)) {
          ++numTracks;
        } else if (extraSizeLimit || tooltipAll) {
          extraSize += toBytes(fileRows[j].cells[1].textContent);
        }
      }

      if (checkEditions) {
        var ed = /edition_\d+/.exec(rows[i].className)[0];
        editions[ed] = ed in editions && editions[ed] !== numTracks ? -1 : numTracks;
      }

      var largeExtras = extraSizeLimit && extraSize > extraSizeLimit;
      if (largeExtras || tooltipAll) {
        var sizeCell = rows[i].cells[1];
        setTitle(sizeCell, 'Extras: ' + toSize(extraSize));
        if (largeExtras) {
          sizeCell.classList.add('gmfc_extrasize');
        }
      }

    } else {
      display = 0;
    }

    var cell = rows[i].insertCell(1);
    cell.textContent = display < 2 ? numFiles : numTracks;
    cell.className = 'gmfc_files';
    if (display != 3) {
      cell.className += ' number_column';
    } else {
      var numExtras = numFiles - numTracks;
      if (numExtras) {
        var sml = document.createElement('small');
        sml.textContent = '+' + numExtras;
        cell.appendChild(sml);
      }
    }
    if (display == 2) {
      cell.textContent += '/' + numFiles;
    }
  }

  if (checkEditions) {
    var sel = '';
    for (var ed in editions) {
      if (editions.hasOwnProperty(ed) && editions[ed] < 1) {
        sel += [sel ? ',.' : '.', ed, '>.gmfc_files'].join('');
      }
    }
    if (sel) addStyle(sel + '{background-color: rgba(236, 17, 0, 0.09) !important;}');
  }

  // Show filelist on filecount click

  table.addEventListener('click', function (e) {

    function get(type) {
      return document.getElementById([type, id].join('_'));
    }

    var elem = e.target.nodeName != 'SMALL' ? e.target : e.target.parentNode;
    if (elem.classList.contains('gmfc_files')) {

      var id = elem.parentNode.id.replace('torrent', '');
      var tEl = get('torrent');
      var fEl = get('files');
      var show = [tEl.className, fEl.className].join().indexOf('hidden') > -1;

      tEl.classList[show ? 'remove' : 'add']('hidden');
      fEl.classList[show ? 'remove' : 'add']('hidden');

      if (show) {
        var sections = ['peers', 'downloads', 'snatches', 'reported', 'logs'];
        for (var i = sections.length; i--; ) {
          var el = get(sections[i]);
          if (el) el.classList.add('hidden');
        }
      }

    }
  }, false);

  function checkAndDispatchEvents() {
      if (display === 2 || display === 3) {
          const event = new CustomEvent('vardisplay3');
          document.dispatchEvent(event);
      } else if (display === 1 || display === 4) {
          const event = new CustomEvent('vardisplay4');
          document.dispatchEvent(event);
      }
  }

  // Run the function once when the script first runs
  checkAndDispatchEvents();

  // Set up an interval to repeat the event dispatching
  const interval1 = setInterval(() => {
      checkAndDispatchEvents();
  }, 200); // Repeat every 200 ms

  // Listen for the custom event 'OPSaddREDreleasescomplete'
  document.addEventListener('OPSaddREDreleasescomplete', function () {
      // console.log("Detected OPSaddREDreleasescomplete event, stopping event dispatching");

      // Stop further dispatching of vardisplay3 and vardisplay4
      clearInterval(interval1);

      // Get all elements with the class 'RED_filecount_placeholder'
      const fileCountElements = document.querySelectorAll('td.RED_filecount_placeholder');

      // Loop through the elements and remove the 'hidden' class
      fileCountElements.forEach(function (element) {
          element.classList.remove('hidden');
      });
      //console.log("Finished processing RED_filecount_placeholder elements");
  });
}