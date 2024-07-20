// ==UserScript==
// @name         PTP - Add iMDB Soundtracks
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.8
// @description  Add soundtracks from IMDB API
// @author       passthepopcorn_cc (mods by Audionut)
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function() {
    'use strict';

    let imdb_id;

    try {
        imdb_id = "tt" + document.getElementById("imdb-title-link").href.split("/tt")[1].split("/")[0];
    } catch(e) { // replaced by ratings box script...
        imdb_id = "tt" + [...document.querySelectorAll(".rating")].find(a => a.href.includes("imdb.com")).href.split("/tt")[1].split("/")[0];
    }

    const insertAfter = (newNode, referenceNode) => {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    const fetchTrackData = async (imdb_id) => {
        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                query {
                    title(id: "${imdb_id}") {
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

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(query),
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        const tracks = data.data.title.soundtrack.edges.map(edge => {
                            const node = edge.node;
                            const trackInfo = {
                                title: node.text,
                                artistIds: extractArtistsFromComments(node.comments),
                                writers: extractWritersFromComments(node.comments)
                            };
                            return trackInfo;
                        });
                        fetchArtistNames(tracks).then(tracksWithArtists => {
                            appendSongs(tracksWithArtists);
                        });
                    } else {
                        console.error("Failed to fetch track data", response);
                        reject(response);
                    }
                },
                onerror: function(response) {
                    console.error("Request error", response);
                    reject(response);
                }
            });
        });
    };

    const extractArtistsFromComments = (comments) => {
        const artistRegex = /Performed by \[link=nm(\d+)\]/;
        const artistIds = comments
            .map(comment => {
                const match = comment.markdown.match(artistRegex);
                return match ? `nm${match[1]}` : null;
            })
            .filter(Boolean);

        return artistIds;
    };

    const extractWritersFromComments = (comments) => {
        const writerRegex = /Written by \[link=nm(\d+)\]/g;
        const writerIds = [];
        comments.forEach(comment => {
            let match;
            while ((match = writerRegex.exec(comment.markdown)) !== null) {
                writerIds.push(`nm${match[1]}`);
            }
        });

        return writerIds;
    };

    const fetchArtistNames = (tracks) => {
        const artistIds = tracks.flatMap(track => track.artistIds);
        const writerIds = tracks.flatMap(track => track.writers);
        const uniqueIds = [...new Set([...artistIds, ...writerIds])];

        if (uniqueIds.length === 0) {
            console.log("No artist or writer IDs found.");
            return Promise.resolve(tracks);
        }

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
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        const nameMap = data.data.names.reduce((acc, name) => {
                            acc[name.id] = name.nameText.text;
                            return acc;
                        }, {});

                        const tracksWithArtists = tracks.map(track => {
                            const artists = track.artistIds.map(id => ({
                                id,
                                name: nameMap[id],
                                link: `https://www.imdb.com/name/${id}`
                            })).filter(artist => artist.name); // filter out undefined artist names
                            const writers = track.writers.map(id => ({
                                id,
                                name: nameMap[id],
                                link: `https://www.imdb.com/name/${id}`
                            })).filter(writer => writer.name); // filter out undefined writer names

                            return {
                                ...track,
                                artists: artists.length > 0 ? artists : writers
                            };
                        });

                        resolve(tracksWithArtists);
                    } else {
                        console.error("Failed to fetch names", response);
                        reject(response);
                    }
                },
                onerror: function(response) {
                    console.error("Request error", response);
                    reject(response);
                }
            });
        });
    };

    const appendSongs = (songs) => {
        let movie_title = document.querySelector(".page__title").textContent.split("[")[0].trim();
        if (movie_title.includes(" AKA ")) movie_title = movie_title.split(" AKA ")[1]; // 0 = title in foreign lang, 1 = title in eng lang

        let cast_container = [...document.querySelectorAll("table")].find(e => e.textContent.trim().startsWith("Actor\n"));
        let bg_color_1 = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("background-color").split("none")[0];
        let bg_color_2 = window.getComputedStyle(cast_container.querySelector("tbody > tr"), null).getPropertyValue("background-color").split("none")[0];
        let border_color = window.getComputedStyle(cast_container.querySelector("tbody > tr > td"), null).getPropertyValue("border-color").split("none")[0];

        let new_panel = document.createElement("div");
        new_panel.id = "imdb-soundtrack"
        new_panel.className = "panel";
        new_panel.style.padding = 0;
        new_panel.style.margin = "18px 0";

        new_panel.innerHTML = '<div class="panel__heading"><span class="panel__heading__title"><a href="https://www.imdb.com/title/' + imdb_id + '/soundtrack"><span style="color: rgb(242, 219, 131);">IMDb</span> Soundtrack</a></span></div>';

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
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2);
            songs_col_1.appendChild(div);
            j++;
        }

        for (let i = Math.ceil(songs.length / 2); i < songs.length; i++) {
            let div = createSongDiv(songs[i], movie_title, j, bg_color_1, bg_color_2);
            songs_col_2.appendChild(div);
            j++;
        }

        songs_container.appendChild(songs_col_1);
        songs_container.appendChild(songs_col_2);
        new_panel.appendChild(songs_container);

        cast_container.parentNode.insertBefore(new_panel, cast_container);
    };

    const createSongDiv = (song, movie_title, index, bg_color_1, bg_color_2) => {
        let div = document.createElement("div");
        div.style.height = "31px";
        div.style.overflow = "hidden";
        div.style.padding = "6px 14px";

        let title_text = song.title;
        let artist = song.artists.length > 0 ? song.artists[0] : { name: "Unknown Artist", link: "#" };
        let artist_text = artist.name;

        let track_line = document.createElement("a");
        track_line.textContent = title_text;
        track_line.title = song.title;
        //track_line.style.verticalAlign = "middle";
        track_line.href = "https://www.youtube.com/results?search_query=" + movie_title.replace(/&/, " and ") + " " + song.title.replace(/&/, " and ");
        track_line.target = "_blank";

        let seperator = document.createElement("span");
        seperator.innerHTML = "-&nbsp;&nbsp;&nbsp;";

        let artist_link = document.createElement("a");
        artist_link.textContent = artist_text;
        artist_link.href = artist.link;
        artist_link.target = "_blank";
        artist_link.style.marginRight = "10px";

        if (index % 2 === 0) div.style.background = bg_color_1;
        else div.style.background = bg_color_2;

        div.appendChild(artist_link);
        div.appendChild(seperator);
        div.appendChild(track_line);

        return div;
    };

    fetchTrackData(imdb_id);
})();