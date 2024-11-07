// ==UserScript==
// @name         PTP - Add to collage from search
// @version      1.1
// @description  Search for torrents matching a collection, filter and add.
// @namespace    https://github.com/Audionut/add-trackers
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-collage-add.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-collage-add.js
// @match        https://passthepopcorn.me/torrents.php?action=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Original functionality for finding title rows
    const allTitleRows = document.querySelectorAll('.basic-movie-list__movie__title-row');
    const links = Array.from(allTitleRows).map(row => {
        const link = row.querySelector('a.basic-movie-list__movie__title');
        const year = row.querySelector('.basic-movie-list__movie__year').textContent;
        const director = row.querySelector('.basic-movie-list__movie__director-list a').textContent;
        return { href: link.href, title: link.textContent, year, director };
    });

    const targetDiv = document.getElementById('torrents-movie-view');
    if (!targetDiv) {
        console.warn('Target div with id "torrents-movie-view" not found.');
        return;
    }

    const panel = document.createElement('div');
    panel.classList.add('panel');
    panel.id = 'collage_add';

    const panelHeader = document.createElement('div');
    panelHeader.classList.add('panel__heading');

    const panelHeaderTitle = document.createElement('span');
    panelHeaderTitle.classList.add('panel__heading__title');
    panelHeaderTitle.textContent = 'Filter shown torrents by a collection id';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.placeholder = 'Input Collage ID...';
    inputBox.style = 'float:right;margin-right:10px;font-size:0.9em';

    const filterButton = document.createElement('input');
    filterButton.type = "submit";
    filterButton.setAttribute('value', 'Filter torrents');
    filterButton.style = 'float:right;font-size:0.9em';

    const findCollectionsButton = document.createElement('input');
    findCollectionsButton.type = "submit";
    findCollectionsButton.setAttribute('value', 'Find all matching collections');
    findCollectionsButton.style = 'float:right;font-size:0.9em;margin-right:10px;';

    panelHeader.appendChild(findCollectionsButton);
    panelHeader.appendChild(inputBox);
    panelHeader.appendChild(filterButton);
    panelHeader.appendChild(panelHeaderTitle);
    panel.appendChild(panelHeader);

    const panelBody = document.createElement('div');
    panelBody.classList.add('panel__body');
    const ul = document.createElement('ul');
    ul.style.padding = '10px';
    panelBody.appendChild(ul);
    panel.appendChild(panelBody);
    targetDiv.parentNode.insertBefore(panel, targetDiv);

    filterButton.onclick = async function() {
        const collageId = inputBox.value.trim();
        if (collageId) {
            try {
                await fetchAndDisplayCollage(collageId);
            } catch (error) {
                console.error('Failed to load Collage ID content:', error);
                alert('Error loading Collage ID content.');
            }
        } else {
            alert('Please enter a Collage ID.');
        }
    };

    findCollectionsButton.onclick = async function() {
        const editionTitleInput = document.getElementById('edition_title');
        if (editionTitleInput && editionTitleInput.value.trim()) {
            const searchQuery = encodeURIComponent(editionTitleInput.value.trim());
            const searchUrl = `https://passthepopcorn.me/collages.php?action=search&search=${searchQuery}`;
            try {
                const response = await fetch(searchUrl);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const matchingCollages = Array.from(doc.querySelectorAll('a[href^="collages.php?id="]'))
                    .map(link => ({ id: link.href.match(/id=(\d+)/)[1], name: link.textContent }));

                ul.innerHTML = '';
                if (matchingCollages.length > 0) {
                    matchingCollages.forEach(collage => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = `https://passthepopcorn.me/collages.php?id=${collage.id}`;
                        a.textContent = collage.name;
                        a.style.cursor = 'pointer';
                        a.onclick = async function(event) {
                            event.preventDefault();
                            await fetchAndDisplayCollage(collage.id);
                        };

                        li.appendChild(a);
                        ul.appendChild(li);
                    });
                } else {
                    const noResults = document.createElement('li');
                    noResults.textContent = 'No matching collections found.';
                    ul.appendChild(noResults);
                }
            } catch (error) {
                console.error('Failed to load matching collections:', error);
                alert('Error loading matching collections.');
            }
        } else {
            alert('Please ensure there is a value in the "Edition Title" field.');
        }
    };

    async function fetchAndDisplayCollage(collageId) {
        try {
            const response = await fetch(`https://passthepopcorn.me/collages.php?id=${collageId}`);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const collageName = doc.querySelector('h2.page__title').textContent;
            panelHeaderTitle.innerHTML = `Releases not in selected collection: <span style="font-weight: bold; color: yellow;">${collageName}</span>`;

            const collageLinks = Array.from(doc.querySelectorAll('#collection_movielist .list a[href*="torrents.php?id="]'))
                .map(link => new URL(link.href, 'https://passthepopcorn.me').origin + new URL(link.href).pathname + "?id=" + new URL(link.href).searchParams.get("id"));

            const antiCsrfToken = document.body.getAttribute('data-anticsrftoken');

            const filteredLinks = links.filter(link => {
                const url = new URL(link.href);
                const baseLink = url.origin + url.pathname + "?id=" + url.searchParams.get("id");
                return !collageLinks.includes(baseLink);
            });

            ul.innerHTML = '';
            if (filteredLinks.length > 0) {
                filteredLinks.forEach(link => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = link.href;
                    a.textContent = `${link.title} ${link.year} by ${link.director}`;
                    a.style.display = 'inline-block';
                    a.style.marginRight = '10px';

                    const addButton = document.createElement('input');
                    addButton.type = "submit";
                    addButton.setAttribute('value', 'Add to collection');
                    addButton.onclick = async function() {
                        if (confirm(`Add ${link.title} to collage?`)) {
                            try {
                                const formData = new FormData();
                                formData.append('AntiCsrfToken', antiCsrfToken);
                                formData.append('action', 'add_torrent');
                                formData.append('collageid', collageId);
                                formData.append('url', link.href);

                                await fetch('https://passthepopcorn.me/collages.php', {
                                    method: 'POST',
                                    body: formData
                                });

                                alert(`${link.title} added to collage.`);
                            } catch (error) {
                                console.error('Failed to add torrent to collage:', error);
                                alert('Error adding torrent to collage.');
                            }
                        }
                    };

                    li.appendChild(a);
                    li.appendChild(addButton);
                    ul.appendChild(li);
                });
            } else {
                const noResults = document.createElement('li');
                noResults.textContent = 'No links found after filtering.';
                ul.appendChild(noResults);
            }
        } catch (error) {
            console.error('Failed to load Collage ID content:', error);
            alert('Error loading Collage ID content.');
        }
    }

})();