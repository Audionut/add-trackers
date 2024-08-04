// ==UserScript==
// @name         iMDB title query
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.2
// @description  Run iMDB queries and introspect the IMDb API
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      api.graphql.imdb.com
// ==/UserScript==

(function () {
    'use strict';

    const fetchIntrospectionData = async () => {
        const url = `https://api.graphql.imdb.com/`;
        const query = {
            query: `
                {
                    __type(name: "Title") {
                        name
                        fields {
                            name
                            type {
                                name
                                kind
                                ofType {
                                    name
                                    kind
                                    ofType {
                                        name
                                        kind
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
                    console.log("Introspection data:", data);
                } else {
                    console.error("Failed to fetch introspection data", response);
                }
            },
            onerror: function (response) {
                console.error("Request error", response);
            }
        });
    };

    fetchIntrospectionData();
})();