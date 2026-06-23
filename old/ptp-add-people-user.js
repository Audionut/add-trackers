// ==UserScript==
// @name         PTP - Add people.php
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  adds people.php page (uses IMDb GraphQL API)
// @author       passthepopcorn_cc
// @match        https://passthepopcorn.me/*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com

// ==/UserScript==

(function () {
    'use strict';

    /**************************************************************************************************************/

    let use_high_quality_image = true;
    let include_adult = true;

    /**************************************************************************************************************/

    const GRAPHQL_QUERY = `query AdvancedNameSearch(
    $first: Int!
    $after: String
    $constraints: AdvancedNameSearchConstraints
    $sort: AdvancedNameSearchSort
  ) {
    advancedNameSearch(
      first: $first
      after: $after
      constraints: $constraints
      sort: $sort
    ) {
      total
      pageInfo { endCursor hasNextPage }
      edges {
        node {
          name {
            id
            nameText { text }
            birthDate { date }
            primaryImage { url width height }
            primaryProfessions(limit: 1) {
              category { text }
            }
            knownFor(first: 1) {
              edges {
                node {
                  title {
                    id
                    titleText { text }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;

    // Award checkbox IDs mapped to GraphQL award filter objects.
    // Oscar event ID: ev0000003
    // Category IDs from: searchMetadata { advancedSearchAwardOptions { events { awardCategories } } }
    const AWARD_MAP = {
      oscar_best_actress_nominees:            { eventId: 'ev0000003', searchAwardCategoryId: 'bestActress' },
      oscar_best_actor_nominees:              { eventId: 'ev0000003', searchAwardCategoryId: 'bestActor' },
      oscar_best_director_nominees:           { eventId: 'ev0000003', searchAwardCategoryId: 'bestDirector' },
      oscar_best_actress_winners:             { eventId: 'ev0000003', searchAwardCategoryId: 'bestActress', winnerFilter: 'WINNER_ONLY' },
      oscar_best_actor_winners:               { eventId: 'ev0000003', searchAwardCategoryId: 'bestActor', winnerFilter: 'WINNER_ONLY' },
      best_director_winner:                   { eventId: 'ev0000003', searchAwardCategoryId: 'bestDirector', winnerFilter: 'WINNER_ONLY' },
      oscar_best_supporting_actress_nominees: { eventId: 'ev0000003', searchAwardCategoryId: 'bestSupportingActress' },
      oscar_best_supporting_actor_nominees:   { eventId: 'ev0000003', searchAwardCategoryId: 'bestSupportingActor' },
      oscar_nominee:                          { eventId: 'ev0000003' },
      oscar_best_supporting_actress_winners:  { eventId: 'ev0000003', searchAwardCategoryId: 'bestSupportingActress', winnerFilter: 'WINNER_ONLY' },
      oscar_best_supporting_actor_winners:    { eventId: 'ev0000003', searchAwardCategoryId: 'bestSupportingActor', winnerFilter: 'WINNER_ONLY' },
      oscar_winner:                           { eventId: 'ev0000003', winnerFilter: 'WINNER_ONLY' }
    };

    // Name Data filter options (NameDataType enum values)
    const NAME_DATA_OPTIONS = [
      { label: 'Awards', value: 'AWARD_NOMINATIONS' },
      { label: 'Biography', value: 'BIOGRAPHY' },
      { label: 'Birth Date', value: 'BIRTH_DATE' },
      { label: 'Birth Place', value: 'BIRTH_PLACE' },
      { label: 'Death Date', value: 'DEATH_DATE' },
      { label: 'Death Place', value: 'DEATH_PLACE' },
      { label: 'Height', value: 'HEIGHT_INFO' },
      { label: 'Quotes', value: 'QUOTES' },
      { label: 'Trivia', value: 'TRIVIA' }
    ];

    const formatNumber = (n) => Number(n).toLocaleString();

    const getZodiacSign = (dateStr) => {
      if (!dateStr) return null;
      // dateStr is ISO format: "YYYY-MM-DD"
      let parts = dateStr.split('-');
      if (parts.length < 3) return null;
      let month = parseInt(parts[1]);
      let day = parseInt(parts[2]);
      if (!month || !day) return null;
      // [sign, emoji, startMonth, startDay]
      const signs = [
        ['Capricorn', '\u2651', 12, 22],
        ['Aquarius', '\u2652', 1, 20],
        ['Pisces', '\u2653', 2, 19],
        ['Aries', '\u2648', 3, 21],
        ['Taurus', '\u2649', 4, 20],
        ['Gemini', '\u264A', 5, 21],
        ['Cancer', '\u264B', 6, 21],
        ['Leo', '\u264C', 7, 23],
        ['Virgo', '\u264D', 8, 23],
        ['Libra', '\u264E', 9, 23],
        ['Scorpio', '\u264F', 10, 23],
        ['Sagittarius', '\u2650', 11, 22],
        ['Capricorn', '\u2651', 12, 22]
      ];
      for (let i = signs.length - 1; i >= 0; i--) {
        let [name, emoji, m, d] = signs[i];
        if (month > m || (month === m && day >= d)) {
          return { name, emoji };
        }
      }
      return { name: 'Capricorn', emoji: '\u2651' };
    };

    function insertAfter(newNode, existingNode) {
      existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }

    const add_people_navbar = () => {
      let li = document.createElement('li');
      li.className = 'main-menu__item';
      li.id = 'nav_people';
      let a = document.createElement('a');
      a.href = 'people.php';
      a.className = 'main-menu__link';
      a.textContent = 'People';
      li.appendChild(a);
      insertAfter(li, document.getElementById('nav_torrents'));
    };

    const get_person_html = (people) => {
      let div0 = document.createElement('div');
      div0.style.margin = '20px 0px';
      div0.style.borderRadius = '9px';
      div0.style.overflow = 'hidden';
      div0.style.width = '210px';
      div0.className = 'person-container';

      let div = document.createElement('div');
      div.style.width = '210px';
      div.style.height = '315px';
      div.style.cursor = 'pointer';
      div.style.backgroundImage = "url('" + people.image + "')";
      div.style.textAlign = 'center';
      div.className = 'person-img-container';
      div.id = people.id;
      div.dataset.name = people.name;

      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'center';

      div0.appendChild(div);

      let person_imdb_link = 'https://www.imdb.com/name/' + people.id;

      let zodiacHtml = '';
      if (people.zodiac) {
        zodiacHtml = `<span title="${people.zodiac.name}" style="position:absolute;top:4px;right:6px;font-size:14px;cursor:help;opacity:0.7;">${people.zodiac.emoji}</span>`;
      }

      div0.innerHTML += `<div class="cover-movie-list__movie__undercover" style="background-color:#232323;padding:5px 0 5px;position:relative;">${zodiacHtml}<div class="cover-movie-list__movie__title-row" style="text-align:center;margin-bottom:4px;"><a href="${person_imdb_link}" class="cover-movie-list__movie__title" target="_blank">${people.name}</a> </div>
            <div class="new-line" style="font-size:12px;text-align:center;margin:0 auto;padding:0 8px 2px;">
              <span style="margin-right:4px;overflow:hidden;padding:0;cursor:default;">${people.role}</span>|
              <a style="margin-left:4px" target="_blank" href="${people.main_title_link}">${people.main_title_name}</a>
            </div>
          </div>`;

      return div0;
    };

    const buildConstraints = () => {
      let constraints = {};

      // Explicit content
      constraints.explicitContentConstraint = {
        explicitContentFilter: include_adult ? 'INCLUDE_ADULT' : 'EXCLUDE_ADULT'
      };

      try {
        // Search text
        let search_text = document.getElementById('text-search').value.trim();
        if (search_text) {
          constraints.nameTextConstraint = { searchTerm: search_text };
        }

        // Birth date range
        let birth1 = document.getElementById('birth1').value.trim();
        let birth2 = document.getElementById('birth2').value.trim();
        if (birth1 || birth2) {
          constraints.birthDateConstraint = {
            birthDateRange: {
              start: birth1 ? birth1 + '-01-01' : null,
              end: birth2 ? birth2 + '-12-31' : null
            }
          };
        }

        // Death date range
        let death1 = document.getElementById('death1').value.trim();
        let death2 = document.getElementById('death2').value.trim();
        if (death1 || death2) {
          constraints.deathDateConstraint = {
            deathDateRange: {
              start: death1 ? death1 + '-01-01' : null,
              end: death2 ? death2 + '-12-31' : null
            }
          };
        }

        // Birth place
        let birthPlace = document.getElementById('birth_place').value.trim();
        if (birthPlace) {
          constraints.birthPlaceConstraint = { birthPlace: birthPlace };
        }

        // Death place
        let deathPlace = document.getElementById('death_place').value.trim();
        if (deathPlace) {
          constraints.deathPlaceConstraint = { deathPlace: deathPlace };
        }

        // Gender
        let maleChecked = document.querySelector('#gender_male').checked;
        let femaleChecked = document.querySelector('#gender_female').checked;
        if (maleChecked && !femaleChecked) {
          constraints.genderIdentityConstraint = { anyGender: ['MALE'] };
        } else if (femaleChecked && !maleChecked) {
          constraints.genderIdentityConstraint = { anyGender: ['FEMALE'] };
        }

        // Awards
        let awardFilters = [];
        document.querySelectorAll('.custom-input-award').forEach((a) => {
          if (a.checked && AWARD_MAP[a.id]) {
            awardFilters.push(AWARD_MAP[a.id]);
          }
        });
        if (awardFilters.length > 0) {
          constraints.awardConstraint = { anyEventNominations: awardFilters };
        }

        // Name Data (has data)
        let nameDataSelect = document.getElementById('name_data');
        if (nameDataSelect && nameDataSelect.value) {
          constraints.withNameDataConstraint = { allDataAvailable: [nameDataSelect.value] };
        }
      } catch (e) {
        // Form elements may not exist on first load
      }

      return constraints;
    };

    const buildVariables = (cursor) => {
      let sortBy = 'POPULARITY';
      let sortOrder = 'ASC';
      try {
        let sortSelect = document.getElementById('sort_by');
        if (sortSelect && sortSelect.value) {
          // Value format: "FIELD_ORDER" where ORDER is last segment
          let val = sortSelect.value;
          let lastUnderscore = val.lastIndexOf('_');
          sortBy = val.substring(0, lastUnderscore);
          sortOrder = val.substring(lastUnderscore + 1);
        }
      } catch (e) {}

      return {
        first: 50,
        after: cursor || null,
        sort: { sortBy: sortBy, sortOrder: sortOrder },
        constraints: buildConstraints()
      };
    };

    const fetch_imdb = ({ cursor = null } = {}) => {
      let oldResults = document.getElementById('lol');
      if (oldResults) oldResults.remove();

      GM_xmlhttpRequest({
        url: 'https://api.graphql.imdb.com/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-imdb-user-country': 'US',
          'x-imdb-user-language': 'en-US'
        },
        data: JSON.stringify({
          query: GRAPHQL_QUERY,
          variables: buildVariables(cursor)
        }),
        timeout: 15000,
        onload: function (response) {
          if (response.status == 200) {
            let json;
            try {
              json = JSON.parse(response.responseText);
            } catch (e) {
              console.log('Error: Failed to parse JSON response.');
              return;
            }

            if (json.errors) {
              console.log('GraphQL errors:', json.errors);
            }

            let result = json.data && json.data.advancedNameSearch;
            if (!result) {
              try {
                document.querySelector('.info_div').textContent = 'Results: 0';
                document.querySelector('.info_div').style.display = 'block';
              } catch (e) {}
              return;
            }

            // Update pagination state
            current_end_cursor = result.pageInfo.endCursor;
            has_next_page = result.pageInfo.hasNextPage;

            try {
              document.querySelector('.info_div').textContent =
                'Results: ' + formatNumber(result.total);
            } catch (e) {}

            let people = [];

            result.edges.forEach((edge) => {
              const n = edge.node.name;

              let name = n.nameText ? n.nameText.text : 'Unknown';

              // Image handling
              let image = '';
              if (n.primaryImage && n.primaryImage.url) {
                image = n.primaryImage.url;
                if (image.includes('_V1_')) {
                  if (use_high_quality_image) {
                    image = image.split('_V1_')[0] + '_V1_.jpg';
                  } else {
                    // Request 210px wide version matching card width
                    image = image.split('_V1_')[0] + '_V1_UX210_.jpg';
                  }
                }
              }

              let id = n.id || '';

              let zodiac = getZodiacSign(n.birthDate && n.birthDate.date);

              let role = '';
              if (
                n.primaryProfessions &&
                n.primaryProfessions.length > 0 &&
                n.primaryProfessions[0].category
              ) {
                role = n.primaryProfessions[0].category.text;
              }

              let main_title_name = '';
              let main_title_link = '';
              if (n.knownFor && n.knownFor.edges && n.knownFor.edges.length > 0) {
                const kf = n.knownFor.edges[0].node;
                if (kf && kf.title) {
                  main_title_name = kf.title.titleText ? kf.title.titleText.text : '';
                  main_title_link = '/torrents.php?imdb=' + kf.title.id;
                }
              }

              people.push({ name, image, id, role, main_title_name, main_title_link, zodiac });
            });

            let div = document.createElement('div');
            div.className = 'cover-movie-list__container cover-movie-list__container--centered';

            div.id = 'lol';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-around';
            div.style.flexWrap = 'wrap';

            for (let i = 0; i < people.length; i++) div.appendChild(get_person_html(people[i]));

            try {
              document.querySelector('.info_div').style.display = 'block';
            } catch (e) {}

            document.querySelector('.thin').appendChild(div);

            if (footer_added === false) {
              footer_added = true;
              addFooter();
              add_input_form();
            }

            // Top pagination above results, bottom pagination below
            ensureTopPagination();
            let bottomPag = document.querySelector('.custom_pagination_bottom');
            if (bottomPag) {
              document.querySelector('.thin').appendChild(bottomPag);
            }
            updateAllPageInfo();

            document.querySelectorAll('.person-img-container').forEach((d) => {
              d.addEventListener('click', () => {
                open_ppl_page(d.id, d.dataset.name);
              });
            });
          } else {
            console.log(' Error: HTTP ' + response.status + ' Error.');
          }
        },
        onerror: function () {
          console.log('Error: Request Error.');
        },
        onabort: function () {
          console.log('Error: Request is aborted.');
        },
        ontimeout: function () {
          console.log('Error: Request timed out.');
        }
      });
    };

    const updateAllPageInfo = () => {
      document.querySelectorAll('.page-info-text').forEach((el) => {
        el.textContent = 'Current Page: ' + page_num;
      });
    };

    const handlePagClick = (id) => {
      if (id === 'next-page' && has_next_page) {
        cursor_history[page_num] = current_end_cursor;
        page_num += 1;
        fetch_imdb({ cursor: current_end_cursor });
      } else if (id === 'prev-page' && page_num > 1) {
        page_num -= 1;
        fetch_imdb({ cursor: cursor_history[page_num - 1] || null });
      } else if (id === 'first-page') {
        page_num = 1;
        fetch_imdb({ cursor: null });
      }
      updateAllPageInfo();
    };

    const createPaginationBar = (suffix) => {
      let bar = document.createElement('div');
      bar.className =
        'pagination pagination--bottom js-pagination custom_pagination custom_pagination_' + suffix;
      bar.style.cssText =
        'display:flex;justify-content:center;align-items:center;gap:20px;padding:10px 0;';

      let prev = document.createElement('a');
      prev.href = '#';
      prev.className = 'pagination__link pagination__link--last';
      prev.textContent = '\u2039 Prev';
      prev.addEventListener('click', (e) => {
        e.preventDefault();
        handlePagClick('prev-page');
      });

      let info = document.createElement('span');
      info.className = 'pagination__current-page page-info-text';
      info.textContent = 'Current Page: ' + page_num;

      let next = document.createElement('a');
      next.href = '#';
      next.className = 'pagination__link pagination__link--next';
      next.textContent = 'Next \u203A';
      next.addEventListener('click', (e) => {
        e.preventDefault();
        handlePagClick('next-page');
      });

      bar.appendChild(prev);
      bar.appendChild(info);
      bar.appendChild(next);
      return bar;
    };

    const addFooter = () => {
      // Bottom pagination is appended; top pagination is added in fetch_imdb
      document.querySelector('.thin').appendChild(createPaginationBar('bottom'));
    };

    const ensureTopPagination = () => {
      let existing = document.querySelector('.custom_pagination_top');
      if (existing) existing.remove();
      let results = document.getElementById('lol');
      if (results && results.parentNode) {
        results.parentNode.insertBefore(createPaginationBar('top'), results);
      }
    };

    // Helper: create a tooltip-styled span
    const makeTooltip = (text) => {
      let tip = document.createElement('span');
      tip.textContent = '?';
      tip.title = text;
      tip.style.cssText =
        'display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border-radius:50%;background:#555;color:#ddd;font-size:11px;cursor:help;margin-left:6px;vertical-align:middle;';
      return tip;
    };

    // Helper: create a labeled row (flex centered) with optional tooltip
    const makeLabeledRow = (labelText, tooltipText) => {
      let row = document.createElement('div');
      row.style.cssText =
        'display:flex;justify-content:center;align-items:center;margin:4px auto 2px;';
      let lbl = document.createElement('span');
      lbl.textContent = labelText;
      lbl.style.cssText = 'font-size:13px;color:#aaa;';
      row.appendChild(lbl);
      if (tooltipText) row.appendChild(makeTooltip(tooltipText));
      return row;
    };

    const add_input_form = () => {
      let div_0 = document.createElement('div');
      div_0.style.padding = '15px 27px 23px';
      div_0.style.width = '999px';
      div_0.style.margin = '24px auto 32px';
      div_0.className = 'filter_torrents panel form--horizontal search-form search-form--narrow';

      let div = document.createElement('div');

      // --- Name search ---

      div.appendChild(
        makeLabeledRow(
          'Name',
          'First and/or last name. Partial matches work (e.g. "Nic Cage" finds Nicolas Cage).'
        )
      );

      let input = document.createElement('input');
      input.className = 'custom-input';
      input.id = 'text-search';
      input.style.display = 'block';
      input.type = 'text';
      input.style.width = '300px';
      input.style.margin = '6px auto 30px';
      input.style.height = '43px';
      input.placeholder = 'Search people...';

      div.appendChild(input);

      // --- Birth year inputs ---

      div.appendChild(
        makeLabeledRow(
          'Birth Year Range',
          'Enter a 4-digit year in each box (e.g. 1960 to 1980). Leave one empty for open-ended.'
        )
      );

      let div_c = document.createElement('div');
      div_c.style.display = 'flex';
      div_c.style.justifyContent = 'center';
      div_c.style.margin = '6px auto';

      let input_birth1 = document.createElement('input');
      input_birth1.className = 'custom-input custom-input-year';
      input_birth1.id = 'birth1';
      input_birth1.type = 'text';
      input_birth1.style.width = '200px';
      input_birth1.style.height = '33px';
      input_birth1.style.margin = '0 18px';
      input_birth1.placeholder = 'From year (e.g. 1960)';

      div_c.appendChild(input_birth1);

      input_birth1 = document.createElement('input');
      input_birth1.className = 'custom-input custom-input-year';
      input_birth1.id = 'birth2';
      input_birth1.type = 'text';
      input_birth1.style.width = '200px';
      input_birth1.style.height = '33px';
      input_birth1.style.margin = '0 18px';
      input_birth1.placeholder = 'To year (e.g. 1980)';

      div_c.appendChild(input_birth1);

      div.appendChild(div_c);

      // --- Death year inputs ---

      div.appendChild(
        makeLabeledRow(
          'Death Year Range',
          'Enter a 4-digit year in each box. Leave both empty to include living people.'
        )
      );

      div_c = document.createElement('div');
      div_c.style.display = 'flex';
      div_c.style.justifyContent = 'center';
      div_c.style.margin = '6px auto';

      input_birth1 = document.createElement('input');
      input_birth1.className = 'custom-input custom-input-year';
      input_birth1.id = 'death1';
      input_birth1.type = 'text';
      input_birth1.style.width = '200px';
      input_birth1.style.height = '33px';
      input_birth1.style.margin = '0 18px';
      input_birth1.placeholder = 'From year (e.g. 2000)';

      div_c.appendChild(input_birth1);

      input_birth1 = document.createElement('input');
      input_birth1.className = 'custom-input custom-input-year';
      input_birth1.id = 'death2';
      input_birth1.type = 'text';
      input_birth1.style.width = '200px';
      input_birth1.style.height = '33px';
      input_birth1.style.margin = '0 18px';
      input_birth1.placeholder = 'To year (e.g. 2020)';

      div_c.appendChild(input_birth1);

      div.appendChild(div_c);

      // --- Birth place / Death place ---

      div.appendChild(
        makeLabeledRow(
          'Birth / Death Place',
          'City, state, or country (e.g. "New York" or "England"). Partial matches work.'
        )
      );

      div_c = document.createElement('div');
      div_c.style.display = 'flex';
      div_c.style.justifyContent = 'center';
      div_c.style.margin = '6px auto';

      let input_place = document.createElement('input');
      input_place.className = 'custom-input';
      input_place.id = 'birth_place';
      input_place.type = 'text';
      input_place.style.width = '200px';
      input_place.style.height = '33px';
      input_place.style.margin = '0 18px';
      input_place.placeholder = 'Birth place';

      div_c.appendChild(input_place);

      input_place = document.createElement('input');
      input_place.className = 'custom-input';
      input_place.id = 'death_place';
      input_place.type = 'text';
      input_place.style.width = '200px';
      input_place.style.height = '33px';
      input_place.style.margin = '0 18px';
      input_place.placeholder = 'Death place';

      div_c.appendChild(input_place);

      div.appendChild(div_c);

      // --- Sort + Name Data dropdowns ---

      div.appendChild(
        makeLabeledRow(
          'Sort / Filter',
          'Sort controls result ordering. Name Data filters to people who have that type of info on IMDb.'
        )
      );

      div_c = document.createElement('div');
      div_c.style.display = 'flex';
      div_c.style.justifyContent = 'center';
      div_c.style.margin = '6px auto 15px';

      let sortSelect = document.createElement('select');
      sortSelect.id = 'sort_by';
      sortSelect.style.cssText = 'width:200px;height:33px;margin:0 18px;padding:0 8px;';
      let sortOptions = [
        { label: 'Popularity (High to Low)', value: 'POPULARITY_ASC' },
        { label: 'Popularity (Low to High)', value: 'POPULARITY_DESC' },
        { label: 'Name (A-Z)', value: 'NAME_ASC' },
        { label: 'Name (Z-A)', value: 'NAME_DESC' },
        { label: 'Birth Date (Newest)', value: 'BIRTH_DATE_DESC' },
        { label: 'Birth Date (Oldest)', value: 'BIRTH_DATE_ASC' },
        { label: 'Death Date (Newest)', value: 'DEATH_DATE_DESC' },
        { label: 'Death Date (Oldest)', value: 'DEATH_DATE_ASC' }
      ];
      sortOptions.forEach((opt) => {
        let o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sortSelect.appendChild(o);
      });

      div_c.appendChild(sortSelect);

      let nameDataSelect = document.createElement('select');
      nameDataSelect.id = 'name_data';
      nameDataSelect.style.cssText = 'width:200px;height:33px;margin:0 18px;padding:0 8px;';
      let emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'Name Data (any)';
      nameDataSelect.appendChild(emptyOpt);
      NAME_DATA_OPTIONS.forEach((opt) => {
        let o = document.createElement('option');
        o.value = opt.value;
        o.textContent = 'Has ' + opt.label;
        nameDataSelect.appendChild(o);
      });

      div_c.appendChild(nameDataSelect);

      div.appendChild(div_c);

      /* gender */

      div.appendChild(
        makeLabeledRow('Gender', 'Check one to filter. Check both or neither to show all.')
      );

      div_c = document.createElement('div');
      div_c.style.display = 'flex';
      div_c.style.justifyContent = 'center';
      div_c.style.margin = '6px auto 0';

      let input_checkbox = document.createElement('input');
      input_checkbox.className = 'custom-input-gender';
      input_checkbox.id = 'gender_male';
      input_checkbox.type = 'checkbox';
      input_checkbox.style.margin = '0 5px';
      input_checkbox.style.width = '15px';
      input_checkbox.style.height = '15px';

      let label = document.createElement('label');
      label.htmlFor = 'gender_male';
      label.textContent = 'Males';
      label.style.marginRight = '40px';

      div_c.appendChild(input_checkbox);
      div_c.appendChild(label);

      /* females */

      input_checkbox = document.createElement('input');
      input_checkbox.className = 'custom-input-gender';
      input_checkbox.id = 'gender_female';
      input_checkbox.type = 'checkbox';
      input_checkbox.style.margin = '0 5px';
      input_checkbox.style.width = '15px';
      input_checkbox.style.height = '15px';

      label = document.createElement('label');
      label.htmlFor = 'gender_female';
      label.textContent = 'Females';
      label.style.marginRight = '0px';

      div_c.appendChild(input_checkbox);
      div_c.appendChild(label);

      div.appendChild(div_c);

      /* awards */

      div.appendChild(
        makeLabeledRow(
          'Oscar Awards',
          'Filters by specific Oscar category. Multiple selections use AND logic. "Oscar-Nominated/Winning" matches any Oscar category.'
        )
      );

      let awards = [
        { name: 'Best Actress-Nominated', id: 'oscar_best_actress_nominees' },
        { name: 'Best Actor-Nominated', id: 'oscar_best_actor_nominees' },
        { name: 'Best Director-Nominated', id: 'oscar_best_director_nominees' },
        { name: 'Best Actress-Winning', id: 'oscar_best_actress_winners' },
        { name: 'Best Actor-Winning', id: 'oscar_best_actor_winners' },
        { name: 'Best Director-Winning', id: 'best_director_winner' },
        { name: 'Best Supporting Actress-Nominated', id: 'oscar_best_supporting_actress_nominees' },
        { name: 'Best Supporting Actor-Nominated', id: 'oscar_best_supporting_actor_nominees' },
        { name: 'Oscar-Nominated', id: 'oscar_nominee' },
        { name: 'Best Supporting Actress-Winning', id: 'oscar_best_supporting_actress_winners' },
        { name: 'Best Supporting Actor-Winning', id: 'oscar_best_supporting_actor_winners' },
        { name: 'Oscar-Winning', id: 'oscar_winner' }
      ];

      div_c = document.createElement('div');
      div_c.style.display = 'flex';
      div_c.style.justifyContent = 'center';
      div_c.style.margin = '8px auto 48px';
      div_c.style.flexWrap = 'wrap';

      awards.forEach((a) => {
        let aw_container = document.createElement('div');
        aw_container.style.width = '290px';
        aw_container.style.margin = '2px 10px';

        input_checkbox = document.createElement('input');
        input_checkbox.className = 'custom-input-award';
        input_checkbox.id = a.id;
        input_checkbox.type = 'checkbox';
        input_checkbox.style.margin = '0 5px';
        input_checkbox.style.width = '15px';
        input_checkbox.style.height = '15px';

        label = document.createElement('label');
        label.htmlFor = a.id;
        label.textContent = a.name;
        label.style.marginRight = '0px';

        aw_container.appendChild(input_checkbox);
        aw_container.appendChild(label);

        div_c.appendChild(aw_container);
      });

      div.appendChild(div_c);

      let submit_container = document.createElement('div');
      submit_container.style.textAlign = 'center';
      submit_container.style.display = 'flex';
      submit_container.style.justifyContent = 'center';
      submit_container.style.columnGap = '20px';

      let btn = document.createElement('a');
      btn.textContent = '[Clear]';

      btn.style.cursor = 'pointer';
      btn.style.display = 'inline-block';
      btn.style.fontSize = '18px';

      btn.addEventListener('click', () => {
        clear_form();
      });

      submit_container.appendChild(btn);

      btn = document.createElement('a');
      btn.textContent = '[Search]';

      btn.style.cursor = 'pointer';
      btn.style.display = 'inline-block';
      btn.style.fontSize = '18px';

      btn.addEventListener('click', () => {
        page_num = 1;
        cursor_history = [null];
        current_end_cursor = null;
        has_next_page = false;
        fetch_imdb({ cursor: null });
      });

      submit_container.appendChild(btn);

      div.appendChild(submit_container);

      /* additional info */

      let info_div = document.createElement('div');
      info_div.textContent = '';
      info_div.style.margin = '19px 0 5px';
      info_div.className = 'info_div';

      div.appendChild(info_div);

      div_0.appendChild(div);

      document.querySelector('.thin').insertBefore(div_0, document.querySelector('.thin').firstChild);

      document.querySelectorAll('.custom-input').forEach((input) => {
        input.addEventListener('keyup', function (event) {
          if (event.key === 'Enter') {
            document.querySelector('.info_div').style.display = 'none';
            page_num = 1;
            cursor_history = [null];
            current_end_cursor = null;
            has_next_page = false;
            fetch_imdb({ cursor: null });
          }
        });
      });
    };

    const open_ppl_page = (id, name) => {
      let url = 'https://passthepopcorn.me/artist.php?artistname=' + encodeURIComponent(name);
      window.open(url, '_blank').focus();
    };

    const clear_form = () => {
      document.querySelectorAll('.custom-input').forEach((d) => {
        d.value = '';
      });
      document.querySelectorAll('.custom-input-award').forEach((d) => {
        d.checked = false;
      });
      document.querySelectorAll('.custom-input-gender').forEach((d) => {
        d.checked = false;
      });
      try {
        document.getElementById('sort_by').selectedIndex = 0;
        document.getElementById('name_data').selectedIndex = 0;
      } catch (e) {}
    };

    let footer_added = false;
    let page_num = 1;
    let cursor_history = [null];
    let current_end_cursor = null;
    let has_next_page = false;

    add_people_navbar();

    if (window.location.href.includes('passthepopcorn.me/people.php')) {
      document.querySelector('.panel__body').remove();
      document.querySelector('.page__title').remove();
      document.title = 'Browse People :: PassThePopcorn';

      fetch_imdb({ cursor: null });
    }
  })();