// ==UserScript==
// @name         PTP - Add iMDB Soundtracks
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0
// @description  Add soundtracks from IMDB API
// @author       passthepopcorn_cc (mods by Audionut)
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    const fetchNames = async (uniqueIds) => {
        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    names(ids: ${JSON.stringify(uniqueIds)}) {
                        id
                        nameText {
                            text
                        }
                    }
                }
            `
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
                        console.log("Name ID query output:", data.data.names); // Log the output
                        resolve(data.data.names);
                    } else {
                        reject("Failed to fetch names");
                    }
                },
                onerror: function (response) {
                    reject("Request error");
                }
            });
        });
    };

    const fetchSoundtrackData = async (titleId) => {
        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    title(id: "${titleId}") {
                        soundtrack(first: 30) {
                            edges {
                                node {
                                    id
                                    text
                                    comments {
                                        markdown
                                    }
                                    amazonMusicProducts {
                                        amazonId {
                                            asin
                                        }
                                        artists {
                                            artistName {
                                                text
                                            }
                                        }
                                        format {
                                            text
                                        }
                                        productTitle {
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
            onload: async function (response) {
                if (response.status >= 200 && response.status < 300) {
                    const data = JSON.parse(response.responseText);
                    const soundtracks = data.data.title.soundtrack.edges;

                    // Extract unique IDs from comments
                    const uniqueIds = [];
                    soundtracks.forEach(edge => {
                        edge.node.comments.forEach(comment => {
                            const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                            if (match) {
                                uniqueIds.push(`nm${match[1]}`);
                            }
                        });
                    });

                    const uniqueIdSet = [...new Set(uniqueIds)];
                    const names = await fetchNames(uniqueIdSet);

                    // Map IDs to names
                    const idToNameMap = {};
                    names.forEach(name => {
                        idToNameMap[name.id] = name.nameText.text;
                    });
                    console.log("ID to Name Map:", idToNameMap); // Log the ID to Name mapping

                    // Process the soundtrack data
                    const processedSoundtracks = soundtracks.map(edge => {
                        const soundtrack = edge.node;
                        let artistName = null;
                        let artistLink = null;
                        let artistId = null;

                        // Try to find "Performed by" first
                        soundtrack.comments.forEach(comment => {
                            const performedByMatch = comment.markdown.match(/Performed by \[link=nm(\d+)\]/);
                            if (performedByMatch && !artistName) {
                                artistId = `nm${performedByMatch[1]}`;
                                artistName = idToNameMap[artistId];
                                artistLink = `https://www.imdb.com/name/${artistId}/`;
                                console.log(`Matched "Performed by" ID: ${artistId}, Artist Name: ${artistName}, Artist Link: ${artistLink}`);
                            }
                        });

                        // If no "Performed by" found, try to find other roles
                        if (!artistName) {
                            soundtrack.comments.forEach(comment => {
                                const match = comment.markdown.match(/\[link=nm(\d+)\]/);
                                if (match && !artistName) {
                                    artistId = `nm${match[1]}`;
                                    artistName = idToNameMap[artistId] || match[0];
                                    artistLink = `https://www.imdb.com/name/${artistId}/`;
                                    console.log(`Matched other role ID: ${artistId}, Artist Name: ${artistName}, Artist Link: ${artistLink}`);
                                } else if (!match && !artistName) {
                                    const performedByMatch = comment.markdown.match(/Performed by (.*)/);
                                    if (performedByMatch) {
                                        artistName = performedByMatch[1];
                                        artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                        console.log(`Performed by match: Artist Name: ${artistName}, Artist Link: ${artistLink}`); // Log performed by match
                                    }
                                }
                            });
                        }

                        // Fallback to amazonMusicProducts if no artist name found
                        if (!artistName && soundtrack.amazonMusicProducts.length > 0) {
                            const product = soundtrack.amazonMusicProducts[0];
                            if (product.artists && product.artists.length > 0) {
                                artistName = product.artists[0].artistName.text;
                                artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                console.log(`Amazon Music Product Artist: Artist Name: ${artistName}, Artist Link: ${artistLink}`); // Log amazon music product artist
                            } else {
                                artistName = product.productTitle.text;
                                artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                                console.log(`Amazon Music Product Title: Artist Name: ${artistName}, Artist Link: ${artistLink}`); // Log amazon music product title
                            }
                        }

                        // Final fallback to text
                        if (!artistName) {
                            artistName = soundtrack.text;
                            artistLink = `https://duckduckgo.com/?q=${encodeURIComponent(artistName)}`;
                            console.log(`Fallback to soundtrack text: Artist Name: ${artistName}, Artist Link: ${artistLink}`); // Log fallback to soundtrack text
                        }

                        return {
                            title: soundtrack.text,
                            artist: artistName,
                            link: artistLink,
                            artistId: artistId
                        };
                    });

                    appendSongs(processedSoundtracks, idToNameMap);
                } else {
                    console.error("Failed to fetch soundtrack data", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    const appendSongs = (songs, idToNameMap) => {
        let movie_title = document.querySelector(".page__title").textContent.split("[")[0].trim();
        if (movie_title.includes(" AKA ")) movie_title = movie_title.split(" AKA ")[1]; // 0 = title in foreign lang, 1 = title in eng lang

        let cast_container = [...document.querySelectorAll("table")].find(e => e.textContent.trim().startsWith("Actor\n"));
        let bg_color_1 = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("background-color").split("none")[0];
        let bg_color_2 = window.getComputedStyle(cast_container.querySelector("tbody > tr"), null).getPropertyValue("background-color").split("none")[0];
        let border_color = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("border-color").split("none")[0];

        let new_panel = document.createElement("div");
        new_panel.id = "imdb-soundtrack";
        new_panel.className = "panel";
        new_panel.style.padding = 0;
        new_panel.style.margin = "18px 0";

        new_panel.innerHTML = '<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/' + imdbId + '/soundtrack"><span style="color: rgb(242, 219, 131);">iMDB</span> Soundtrack</a></span></div>';

        new_panel.querySelector(".panel__heading").style.display = "flex";
        new_panel.querySelector(".panel__heading").style.justifyContent = "space-between";

        let yt_search = document.createElement("a");
        yt_search.href = "https://www.youtube.com/results?search_query=" + movie_title + " soundtrack";
        yt_search.textContent = "(YouTube search)";
        yt_search.target = "_blank";

        let yt_search_wrapper = document.createElement("span");
        yt_search_wrapper.style.float = "right";
        yt_search_wrapper.style.fontSize = "0.9em";
        yt_search_wrapper.appendChild(yt_search);

        new_panel.querySelector(".panel__heading").appendChild(yt_search_wrapper);

        let songs_container = document.createElement("div");
        songs_container.className = "panel__body";
        songs_container.style.display = "flex";
        songs_container.style.padding = 0;

        if (songs.length === 0) {
            let no_songs_container = document.createElement("div");
            no_songs_container.style.padding = "11px";
            no_songs_container.textContent = "No soundtrack information found on IMDb.";
            no_songs_container.style.textAlign = "center";
            new_panel.appendChild(no_songs_container);
            cast_container.parentNode.insertBefore(new_panel, cast_container);
            return;
        }

        let songs_col_1 = document.createElement("div");
        songs_col_1.style.display = "inline-block";
        songs_col_1.style.width = "50%";
        songs_col_1.style.padding = 0;
        songs_col_1.style.borderRight = "1px solid " + border_color;

        let songs_col_2 = document.createElement("div");
        songs_col_2.style.display = "inline-block";
        songs_col_2.style.width = "50%";
        songs_col_2.style.padding = 0;

        let j = 0;
        for (let i = 0; i < songs.length / 2; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2, idToNameMap);
            songs_col_1.appendChild(div);
            j++;
        }

        for (let i = Math.ceil(songs.length / 2); i < songs.length; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2, idToNameMap);
            songs_col_2.appendChild(div);
            j++;
        }

        songs_container.appendChild(songs_col_1);
        songs_container.appendChild(songs_col_2);
        new_panel.appendChild(songs_container);

        cast_container.parentNode.insertBefore(new_panel, cast_container);
    };

    const createSongDiv = (song, movie_title, index, bg_color_1, bg_color_2, idToNameMap) => {
        let div = document.createElement("div");
        div.style.height = "31px";
        div.style.overflow = "hidden";
        div.style.padding = "6px 14px";

        let track_line = document.createElement("a");
        track_line.textContent = song.title;
        track_line.title = song.title;
        track_line.href = "https://www.youtube.com/results?search_query=" + movie_title.replace(/&/, " and ") + " " + song.title.replace(/&/, " and ");
        track_line.target = "_blank";

        let seperator = document.createElement("span");
        seperator.innerHTML = "-&nbsp;&nbsp;&nbsp;";

        let artist_link = document.createElement("a");
        artist_link.textContent = song.artistId ? idToNameMap[song.artistId] : song.artist;
        artist_link.href = song.link;
        artist_link.target = "_blank";
        artist_link.style.marginRight = "10px";

        if (index % 2 === 0) div.style.background = bg_color_1;
        else div.style.background = bg_color_2;

        div.appendChild(artist_link);
        div.appendChild(seperator);
        div.appendChild(track_line);

        return div;
    };

    const imdbUrl = document.querySelector("a#imdb-title-link.rating").getAttribute("href");
    const imdbId = imdbUrl.split("/")[4];

    fetchSoundtrackData(imdbId);
})();