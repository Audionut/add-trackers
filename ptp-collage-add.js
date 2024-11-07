// ==UserScript==
// @name         PTP - Add to collage from search
// @version      1.0
// @description  Search for torrents matching a collection, filter and add.
// @namespace    https://github.com/Audionut/add-trackers
// @author       Audionut
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-collage-add.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-collage-add.js
// @match        https://passthepopcorn.me/torrents.php?action=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // Find all elements with class 'basic-movie-list__movie__title-row' containing the movie details
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
    panelHeaderTitle.textContent = 'Releases matching collage';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.placeholder = 'Input Collage ID...';
    inputBox.style = 'float:right;margin-right:10px;font-size:0.9em';

    const filterButton = document.createElement('button');
    filterButton.textContent = 'Filter Torrents';
    filterButton.style = 'float:right;font-size:0.9em';

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
                const response = await fetch(`https://passthepopcorn.me/collages.php?id=${collageId}`);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const collageName = doc.querySelector('h2.page__title').textContent;
                panelHeaderTitle.textContent = `Releases matching collage: ${collageName}`;

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

                        const addButton = document.createElement('button');
                        addButton.textContent = 'Add to Collage';
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
        } else {
            alert('Please enter a Collage ID.');
        }
    };
})();