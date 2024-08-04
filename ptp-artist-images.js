// ==UserScript==
// @name         PTP Artist Image Enhancer
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1
// @description  Fetch and display IMDb images and details for artists
// @match        https://passthepopcorn.me/artist.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    const calculateAge = (birthDate) => {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateStr) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, options);
    };

    const fetchDetails = async (imdbID, callback) => {
        const cacheKey = `imdb_details_${imdbID}`;
        const cachedData = await GM.getValue(cacheKey);
        const cachedTimestamp = await GM.getValue(`${cacheKey}_timestamp`);

        if (cachedData && cachedTimestamp && (Date.now() - cachedTimestamp < CACHE_DURATION)) {
            console.log("Using cached data for artist details");
            callback(JSON.parse(cachedData));
            return;
        }

        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    name(id: "${imdbID}") {
                        akas(first: 5) {
                            total
                            edges {
                                node {
                                    text
                                }
                            }
                        }
                        bio {
                            text {
                                plainText
                            }
                        }
                        birthDate {
                            date
                        }
                        deathDate {
                            date
                        }
                        prestigiousAwardSummary {
                            wins
                            nominations
                        }
                        id
                        nameText {
                            text
                        }
                        primaryImage {
                            url
                        }
                        images(first: 30) {
                            edges {
                                node {
                                    url
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
            onload: async function (response) {
                if (response.status >= 200 && response.status < 300) {
                    const data = JSON.parse(response.responseText);
                    await GM.setValue(cacheKey, JSON.stringify(data.data));
                    await GM.setValue(`${cacheKey}_timestamp`, Date.now());
                    callback(data.data);
                } else {
                    console.error("Failed to fetch details", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    const addDetailsToPanel = (details) => {
        const artistInfoPanel = document.querySelector('#artistinfo');
        if (artistInfoPanel) {
            const panelBody = artistInfoPanel.querySelector('.panel__body ul');
            if (!panelBody) return;

            const existingText = panelBody.innerText.toLowerCase();
            const bioText = details.name.bio && details.name.bio.text.plainText ? details.name.bio.text.plainText : null;
            const birthDate = details.name.birthDate ? formatDate(details.name.birthDate.date) : null;
            const deathDate = details.name.deathDate ? formatDate(details.name.deathDate.date) : null;
            const age = details.name.birthDate ? calculateAge(details.name.birthDate.date) : null;
            const awards = details.name.prestigiousAwardSummary ?
                `Wins: ${details.name.prestigiousAwardSummary.wins || "N/A"}, Nominations: ${details.name.prestigiousAwardSummary.nominations || "N/A"}`
                : null;
            const akas = details.name.akas && details.name.akas.edges.length > 0 ? details.name.akas.edges.map(edge => edge.node.text).join(', ') : null;

            if (birthDate && !existingText.includes('born:')) {
                const birthItem = document.createElement('li');
                birthItem.innerHTML = `<strong>Born:</strong> ${birthDate} (age: ${age})`;
                panelBody.appendChild(birthItem);
            }

            if (deathDate && !existingText.includes('died:')) {
                const deathItem = document.createElement('li');
                deathItem.innerHTML = `<strong>Died:</strong> ${deathDate}`;
                panelBody.appendChild(deathItem);
            }

            if (akas && !existingText.includes('akas:')) {
                const akasItem = document.createElement('li');
                akasItem.innerHTML = `<strong>AKAs:</strong> ${akas}`;
                panelBody.appendChild(akasItem);
            }

            if (awards && !existingText.includes('oscars:')) {
                const awardsItem = document.createElement('li');
                awardsItem.innerHTML = `<strong style="color: rgb(255, 227, 110);">Oscars:</strong> <a href="https://www.imdb.com/name/${details.name.id}/awards/" target="_blank" rel="noreferrer">${awards}</a>`;
                panelBody.appendChild(awardsItem);
            }

            if (bioText && !existingText.includes('bio:')) {
                const bioItem = document.createElement('li');
                bioItem.innerHTML = `<strong>Bio:</strong> <span class="bio-text">${bioText.substring(0, 100)}</span><span class="more-bio-text" style="display:none;">${bioText.substring(100)}</span>
                <div id="bio_toggle" class="toggleable-search-form__toggler-container clearfix"><a class="toggleable-search-form__toggler" href="javascript:void(0);">[+] Show more</a></div>`;
                panelBody.appendChild(bioItem);

                const toggleLink = bioItem.querySelector('#bio_toggle .toggleable-search-form__toggler');
                toggleLink.addEventListener('click', () => {
                    const moreText = bioItem.querySelector('.more-bio-text');
                    if (moreText.style.display === 'none') {
                        moreText.style.display = 'inline';
                        toggleLink.innerText = '[-] Show less';
                    } else {
                        moreText.style.display = 'none';
                        toggleLink.innerText = '[+] Show more';
                    }
                });
            }
        }
    };

    const addImagePanel = (nameData) => {
        const primaryImage = nameData.primaryImage ? nameData.primaryImage.url : null;
        const images = nameData.images.edges.map(edge => edge.node.url);
        if (primaryImage) {
            images.unshift(primaryImage);
        }

        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            let existingPanel = sidebar.querySelector('.panel img.sidebar-cover-image');
            if (existingPanel) {
                images.unshift(existingPanel.src);
            } else {
                existingPanel = document.createElement('img');
                existingPanel.className = 'sidebar-cover-image';
                existingPanel.alt = nameData.nameText.text;
                existingPanel.onclick = () => { lightbox.init(existingPanel, 220); };

                const newPanel = document.createElement('div');
                newPanel.className = 'panel';

                const headingDiv = document.createElement('div');
                headingDiv.className = 'panel__heading';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'panel__heading__title';
                titleSpan.innerText = nameData.nameText.text;

                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'panel__body';

                bodyDiv.appendChild(existingPanel);
                headingDiv.appendChild(titleSpan);
                newPanel.appendChild(headingDiv);
                newPanel.appendChild(bodyDiv);
                sidebar.insertBefore(newPanel, sidebar.firstChild);
            }

            // Function to cycle through images every 5 seconds
            let currentIndex = 0;
            existingPanel.src = images[currentIndex];
            setInterval(() => {
                currentIndex = (currentIndex + 1) % images.length;
                existingPanel.src = images[currentIndex];
            }, 5000);
        }
    };

    const init = () => {
        const artistInfoPanel = document.querySelector('#artistinfo');
        if (artistInfoPanel) {
            const imdbLink = artistInfoPanel.querySelector('a[href*="http://www.imdb.com/name/"]');
            if (imdbLink) {
                const imdbUrl = new URL(imdbLink.href);
                const imdbId = imdbUrl.pathname.split('/')[2];

                fetchDetails(imdbId, (data) => {
                    addDetailsToPanel(data);
                    addImagePanel(data.name);
                });
            }
        }
    };

    window.addEventListener('load', init);
})();