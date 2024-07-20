// ==UserScript==
// @name         PTP Add cast photos
// @namespace    https://github.com/Audionut/add-trackers
// @version      3.0.2
// @description  Adds cast photos to movie pages
// @author       Chameleon (mods by Audionut to use IMDB API)
// @include      http*://*passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
  'use strict';

  const fetchPrimaryImageUrl = async (nameIds) => {
    const url = `https://api.graphql.imdb.com/`;
    const query = {
      query: `
        query {
          names(ids: ${JSON.stringify(nameIds)}) {
            id
            nameText {
              text
            }
            primaryImage {
              url
            }
          }
        }
      `
    };

    GM_xmlhttpRequest({
      method: "POST",
      url: url,
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify(query),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          const data = JSON.parse(response.responseText);
          console.log("Primary image URLs:", data);
          gotCredits(data.data.names);
        } else {
          console.error("Failed to fetch primary image URLs", response);
        }
      },
      onerror: function (response) {
        console.error("Request error", response);
      }
    });
  };

  const fetchCreditsData = async () => {
    const imdb_id = document.getElementById('imdb-title-link');
    if (imdb_id) {
      const imdbId = imdb_id.href.split('/title/tt')[1].split('/')[0];
      const url = `https://api.graphql.imdb.com/`;
      const query = {
        query: `
          query {
            title(id: "tt${imdbId}") {
              credits(first: 40) {
                edges {
                  node {
                    name {
                      id
                      nameText {
                        text
                      }
                    }
                    category {
                      id
                      text
                    }
                    title {
                      id
                      titleText {
                        text
                      }
                    }
                  }
                }
              }
            }
          }
        `
      };

      GM_xmlhttpRequest({
        method: "POST",
        url: url,
        headers: {
          "Content-Type": "application/json"
        },
        data: JSON.stringify(query),
        onload: function (response) {
          if (response.status >= 200 && response.status < 300) {
            const data = JSON.parse(response.responseText);
            console.log("Credits data:", data);
            const nameIds = data.data.title.credits.edges.map(edge => edge.node.name.id);
            fetchPrimaryImageUrl(nameIds);
          } else {
            console.error("Failed to fetch credits data", response);
          }
        },
        onerror: function (response) {
          console.error("Request error", response);
        }
      });
    }
  };

  const gotCredits = (names) => {
    const castPhotosCount = window.localStorage.castPhotosCount ? parseInt(window.localStorage.castPhotosCount) : 4;

    let cast = names.map(name => ({
      photo: name.primaryImage ? name.primaryImage.url.replace('w66_and_h66', 'w300_and_h300') : 'https://ptpimg.me/9wv452.png',
      name: name.nameText.text,
      imdbId: name.id,
      role: 'Unknown', // Role data will be updated below
      link: '' // Link will be updated below
    }));

    const actorRows = document.querySelectorAll('.table--panel-like tbody tr');
    actorRows.forEach(row => {
      const actorNameElement = row.querySelector('.movie-page__actor-column a');
      const roleNameElement = row.querySelector('td:nth-child(2)');
      if (actorNameElement && roleNameElement) {
        const actorName = actorNameElement.textContent;
        const roleName = roleNameElement.textContent;
        const actorLink = actorNameElement.href;
        const castMember = cast.find(member => member.name === actorName);
        if (castMember) {
          castMember.role = roleName;
          castMember.link = actorLink;
        }
      }
    });

    // Sort cast members, those with primary image first
    cast.sort((a, b) => (a.photo === 'https://ptpimg.me/9wv452.png') - (b.photo === 'https://ptpimg.me/9wv452.png'));

    const actors = document.getElementsByClassName('movie-page__actor-column');

    const cDiv = document.createElement('div');
    cDiv.setAttribute('class', 'panel');
    cDiv.innerHTML = '<div class="panel__heading"><span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">iMDB</span> Cast</a></span></div>';
    const castDiv = document.createElement('div');
    castDiv.setAttribute('style', 'text-align:center; display:table; width:100%; border-collapse: separate; border-spacing:4px;');
    cDiv.appendChild(castDiv);
    const a = document.createElement('a');
    a.innerHTML = '(Show all cast photos)';
    a.href = 'javascript:void(0);';
    a.setAttribute('style', 'float:right;');
    a.setAttribute('stle', 'fontSize:0.9em');

    cDiv.firstElementChild.appendChild(a);
    a.addEventListener('click', function (a) {
      const divs = castDiv.getElementsByClassName('castRow');
      let disp = 'none';
      a.innerHTML = '(Show all cast photos)';
      if (divs[4].style.display == 'none') {
        disp = 'table-row';
        a.innerHTML = '(Hide extra cast photos)';
      }
      for (let i = 3; i < divs.length; i++) {
        divs[i].style.display = disp;
      }
    }.bind(undefined, a));
    const before = actors[0].parentNode.parentNode.parentNode;
    before.parentNode.insertBefore(cDiv, before);
    before.style.display = 'none';
    let count = 0;
    let dr = document.createElement('div');
    dr.setAttribute('style', 'display:table-row;');
    dr.setAttribute('class', 'castRow');
    castDiv.appendChild(dr);

    const bg = getComputedStyle(document.getElementsByClassName('movie-page__torrent__panel')[0]).backgroundColor;
    const width = 100 / castPhotosCount;
    let fontSize = 1;
    cast.forEach(person => {
      const d = document.createElement('div');
      dr.appendChild(d);
      if ((count + 1) % castPhotosCount === 0) {
        dr = document.createElement('div');
        dr.setAttribute('style', 'display:table-row;');
        if (count >= 11) dr.style.display = 'none';
        dr.setAttribute('class', 'castRow');
        castDiv.appendChild(dr);
      }
      if (window.localStorage.castPhotosSmallText == 'true') {
        fontSize = (1 + (4 / castPhotosCount)) / 2;
      }
      d.setAttribute('style', `width:${width}%; display:table-cell; text-align:center; background-color:${bg}; border-radius:10px; overflow:hidden; font-size:${fontSize}em;`);
      d.innerHTML = `
        <a href="${person.link}">
          <div style="width: 100%; height: 300px; overflow: hidden;">
            <img style="width: 100%; height: 100%; object-fit: cover;" src="${person.photo}" />
          </div>
        </a>
        <span style="padding:2px;"></span><br />
        <a href="https://www.imdb.com/name/${person.imdbId}" target="_blank">${person.name}</a><br />
        <span style="padding:2px;"></span>`;
      d.firstElementChild.nextElementSibling.innerHTML = person.name;
      d.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.innerHTML = person.role;
      count++;
    });
  };

  fetchCreditsData();
})();
