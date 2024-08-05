// ==UserScript==
// @name         PTP Add cast photos with awards
// @namespace    https://github.com/Audionut/add-trackers
// @version      3.0.4
// @description  Adds cast photos and awards to movie pages
// @author       Chameleon (mods by Audionut to use IMDB API)
// @include      http*://*passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
  'use strict';

  const fetchIMDbData = async (imdbId, afterCursor = null, allNominations = []) => {
    const url = `https://api.graphql.imdb.com/`;
    const query = {
      query: `
        query getTitleDetails($id: ID!, $first: Int!, $after: ID) {
          title(id: $id) {
            id
            titleText {
              text
            }
            prestigiousAwardSummary {
              wins
              nominations
              award {
                year
                category {
                  text
                }
              }
            }
            awardNominations(first: $first, after: $after) {
              edges {
                node {
                  id
                  award {
                    id
                    text
                  }
                  awardedEntities {
                    ... on AwardedNames {
                      names {
                        id
                        nameText {
                          text
                        }
                      }
                    }
                    ... on AwardedTitles {
                      titles {
                        id
                        titleText {
                          text
                        }
                      }
                    }
                  }
                  category {
                    text
                  }
                  forEpisodes {
                    id
                    titleText {
                      text
                    }
                  }
                  forSongTitles
                  isWinner
                  notes {
                    plainText
                  }
                  winAnnouncementDate {
                    date
                  }
                  winningRank
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
            credits(first: 48) {
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
      `,
      variables: {
        id: imdbId,
        first: 250,
        after: afterCursor
      }
    };

    return new Promise((resolve, reject) => {
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
            console.log("API response data:", data);
            const titleData = data.data.title;
            if (!titleData) {
              console.error("No title data returned from IMDB API", data);
              reject(new Error("No title data returned from IMDB API"));
              return;
            }
            const nominations = titleData.awardNominations.edges.map(edge => edge.node);
            allNominations.push(...nominations);

            if (titleData.awardNominations.pageInfo.hasNextPage) {
              fetchIMDbData(imdbId, titleData.awardNominations.pageInfo.endCursor, allNominations)
                .then(resolve)
                .catch(reject);
            } else {
              resolve({
                nominations: allNominations,
                credits: titleData.credits.edges.map(edge => edge.node),
                prestigiousAwardSummary: titleData.prestigiousAwardSummary
              });
            }
          } else {
            console.error("Failed to fetch IMDb data: ", response);
            reject(new Error(`Failed to fetch IMDb data: ${response.statusText}`));
          }
        },
        onerror: function (response) {
          console.error("Request error: ", response);
          reject(new Error("Request error"));
        }
      });
    });
  };

  const fetchPrimaryImagesAndAwardNominations = async (nameIds) => {
    const url = `https://api.graphql.imdb.com/`;
    const query = {
      query: `
        query getNamesDetails($ids: [ID!]!) {
          names(ids: $ids) {
            id
            nameText {
              text
            }
            primaryImage {
              url
            }
            prestigiousAwardSummary {
              wins
              nominations
              award {
                year
                category {
                  text
                }
              }
            }
            awardNominations(first: 250) {
              edges {
                node {
                  id
                  award {
                    id
                    text
                  }
                  awardedEntities {
                    ... on AwardedNames {
                      names {
                        id
                        nameText {
                          text
                        }
                      }
                    }
                    ... on AwardedTitles {
                      titles {
                        id
                        titleText {
                          text
                        }
                      }
                    }
                  }
                  category {
                    text
                  }
                  forEpisodes {
                    id
                    titleText {
                      text
                    }
                  }
                  forSongTitles
                  isWinner
                  notes {
                    plainText
                  }
                  winAnnouncementDate {
                    date
                  }
                  winningRank
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      `,
      variables: {
        ids: nameIds
      }
    };

    return new Promise((resolve, reject) => {
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
            resolve(data.data.names);
          } else {
            console.error("Failed to fetch primary images and award nominations", response);
            reject(new Error("Failed to fetch primary images and award nominations"));
          }
        },
        onerror: function (response) {
          console.error("Request error: ", response);
          reject(new Error("Request error"));
        }
      });
    });
  };

  const logCredits = (credits, titleNominations, prestigiousAwardSummary) => {
    const nameIds = credits.map(credit => credit.name.id);

    fetchPrimaryImagesAndAwardNominations(nameIds)
      .then(namesData => {
        let cast = namesData
          .filter(name => name.nameText) // Ensure nameText exists
          .map(name => ({
            photo: name.primaryImage ? name.primaryImage.url.replace('w66_and_h66', 'w300_and_h300') : 'https://ptpimg.me/9wv452.png',
            name: name.nameText ? name.nameText.text : 'Unknown',
            imdbId: name.id,
            awardNominations: name.awardNominations.edges.map(edge => edge.node),
            prestigiousAwardSummary: name.prestigiousAwardSummary,
            matchedNominations: name.awardNominations.edges.map(edge => edge.node).filter(castNomination => {
              return titleNominations.some(titleNomination => {
                return (
                  castNomination.award && titleNomination.award &&
                  castNomination.award.id === titleNomination.award.id &&
                  castNomination.category && titleNomination.category &&
                  castNomination.category.text === titleNomination.category.text &&
                  (!castNomination.winAnnouncementDate || !titleNomination.winAnnouncementDate || castNomination.winAnnouncementDate.date === titleNomination.winAnnouncementDate.date)
                );
              });
            })
          }));

        console.log("Cast data with primary images and award nominations:", cast);

        cast.forEach(castMember => {
          console.log(`Award Nominations for ${castMember.name}:`, castMember.awardNominations);
          console.log(`Prestigious Award Summary for ${castMember.name}:`, castMember.prestigiousAwardSummary);
          console.log(`Matched Nominations for ${castMember.name}:`, castMember.matchedNominations);
        });

        // Call gotCredits to update the display
        gotCredits(cast);
      })
      .catch(error => {
        console.error("Error fetching primary images and award nominations:", error);
      });

    // Log the prestigious award summary for the title
    console.log("Prestigious Award Summary for the Title:", prestigiousAwardSummary);
  };

  const gotCredits = (names) => {
    console.log("Names data received in gotCredits:", names); // Log the names data

    const castPhotosCount = window.localStorage.castPhotosCount ? parseInt(window.localStorage.castPhotosCount) : 4;

    let cast = names.map(name => {
      console.log("Processing name:", name); // Log each name being processed
      return {
        photo: name.photo,
        name: name.name ? name.name : 'Unknown',
        imdbId: name.imdbId,
        awardNominations: name.awardNominations,
        prestigiousAwardSummary: name.prestigiousAwardSummary,
        matchedNominations: name.matchedNominations,
        role: 'Unknown', // Role data will be updated below
        link: '' // Link will be updated below
      };
    });

    console.log("Processed cast data:", cast); // Log the processed cast data

  // Create the awards panel
  const aDiv = document.createElement('div');
  aDiv.setAttribute('id', 'imdb-award');
  aDiv.setAttribute('class', 'panel');
  aDiv.innerHTML = '<div class="panel__heading"><span class="panel__heading__title"><span style="color: rgb(242, 219, 131);">iMDB</span> Awards</span><a id="show-all-awards" href="javascript:void(0);" style="float:right; font-size:0.9em;">(Show all awards)</a></div>';
  const awardDiv = document.createElement('div');
  awardDiv.setAttribute('style', 'text-align:center; display:table; width:100%; border-collapse: separate; border-spacing:4px;');
  aDiv.appendChild(awardDiv);

    // Placeholder for the awards content
    const awardsContent = document.createElement('div');
    awardsContent.setAttribute('id', 'awards-content');
    aDiv.appendChild(awardsContent);

    // Mutation observer to detect when the imdb-cast div is added to the DOM
    const observer = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const awardsBefore = document.querySelector('#imdb-cast');
          if (awardsBefore) {
            awardsBefore.parentNode.insertBefore(aDiv, awardsBefore);
            observer.disconnect(); // Stop observing once the element is found and the panel is inserted
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

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
    cDiv.setAttribute('id', 'imdb-cast');
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

  const fetchCreditsData = async () => {
    const imdb_id = document.getElementById('imdb-title-link');
    if (imdb_id) {
      const imdbId = imdb_id.href.match(/title\/(tt\d+)/)[1];
      console.log("Extracted IMDb ID:", imdbId);

      try {
        const { nominations, credits, prestigiousAwardSummary } = await fetchIMDbData(imdbId);
        console.log("All Award Nominations:", nominations);
        console.log("Credits data:", credits);
        console.log("Prestigious Award Summary for the Title:", prestigiousAwardSummary);

        logCredits(credits, nominations, prestigiousAwardSummary); // Call logCredits to process and log the data
      } catch (error) {
        console.error(error);
      }
    }
  };

  fetchCreditsData();
})();