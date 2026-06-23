// ==UserScript==
// @name         PTP - Alternate Versions Wiki
// @version      1.0.0
// @description  Interactive alternate version details from wiki
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function () {
    "use strict";

    const DEBUG = false;

    function debug(...args) {
        if (DEBUG) console.log("[PTP Alternate Wiki]", ...args);
    }

    function getGroupId() {
        const link = document.querySelector('.linkbox__link[href*="groupid="]');
        if (!link) return null;
        const match = link.href.match(/groupid=(\d+)/);
        return match ? match[1] : null;
    }

    function getAnticsrfToken() {
        const body = document.querySelector('body[data-anticsrftoken]');
        return body ? body.getAttribute('data-anticsrftoken') : '';
    }

    function fetchWikiArticle(groupId, cb) {
        const url = `https://passthepopcorn.me/wiki.php?action=article&id=361`;
        debug("Fetching wiki article for groupId:", groupId, url);
        GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: function (response) {
                debug("Wiki GET response:", response);
                if (response.status === 200) {
                    const html = response.responseText;
                    const regex = new RegExp(`\\[groupid:${groupId}\\]([\\s\\S]*?)\\[\\/groupid\\]`, "i");
                    const match = html.match(regex);
                    cb(match ? match[1].trim() : "");
                } else {
                    debug("Failed to fetch wiki article:", response.status, response.statusText);
                    cb("");
                }
            },
            onerror: function (err) {
                debug("Wiki GET error:", err);
                cb("");
            }
        });
    }

    function fetchWikiBBCode(groupId, cb) {
        const url = `https://passthepopcorn.me/wiki.php?action=edit&id=361`;
        debug("Fetching wiki BBCode for groupId:", groupId);
        GM_xmlhttpRequest({
            method: "GET",
            url,
            onload: function (response) {
                if (response.status === 200) {
                    const html = response.responseText;
                    const match = html.match(/<textarea[^>]*id="quickpost"[^>]*>([\s\S]*?)<\/textarea>/i);
                    let bbcode = match ? match[1] : "";
                    const entryRegex = new RegExp(`\\[groupid:${groupId}\\]([\\s\\S]*?)\\[\\/groupid\\]`, "i");
                    const entryMatch = bbcode.match(entryRegex);
                    cb(entryMatch ? entryMatch[1].trim() : "");
                } else {
                    debug("Failed to fetch wiki edit page for BBCode:", response.status);
                    cb("");
                }
            },
            onerror: function (err) {
                debug("Wiki BBCode GET error:", err);
                cb("");
            }
        });
    }

    function saveWikiArticle(groupId, newText, cb) {
        const getUrl = `https://passthepopcorn.me/wiki.php?action=edit&id=361`;
        debug("Fetching wiki edit page for groupId:", groupId, getUrl);
        GM_xmlhttpRequest({
            method: "GET",
            url: getUrl,
            onload: function (response) {
                debug("Wiki edit GET response:", response);
                if (response.status === 200) {
                    const html = response.responseText;
                    const match = html.match(/<textarea[^>]*id="quickpost"[^>]*>([\s\S]*?)<\/textarea>/i);
                    let body = match ? match[1] : "";
                    const entryRegex = new RegExp(`\\[groupid:${groupId}\\][\\s\\S]*?\\[\\/groupid\\]`, "i");
                    body = body.replace(entryRegex, "");
                    body = `${body.trim()}\n[groupid:${groupId}]\n${newText.trim()}\n[/groupid]\n`.trim();
                    const antiCsrfMatch = html.match(/name=["']AntiCsrfToken["']\s+value=["']([^"']+)["']/i);
                    const revisionMatch = html.match(/name=["']revision["']\s+value=["']([^"']+)["']/i);
                    const titleMatch = html.match(/name=["']title["']\s+value=["']([^"']+)["']/i);

                    const AntiCsrfToken = antiCsrfMatch ? antiCsrfMatch[1] : '';
                    const revision = revisionMatch ? revisionMatch[1] : '';
                    const title = titleMatch ? titleMatch[1] : 'Alternate Versions';

                    debug("Using AntiCsrfToken:", AntiCsrfToken, "revision:", revision, "title:", title);

                    const postData = new URLSearchParams({
                        AntiCsrfToken,
                        action: "edit",
                        id: "361",
                        revision,
                        title,
                        body,
                        editsummary: ""
                    }).toString();

                    GM_xmlhttpRequest({
                        method: "POST",
                        url: getUrl,
                        data: postData,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        onload: function (resp) {
                            debug("Wiki POST response:", resp);
                            cb(resp.status === 200);
                        },
                        onerror: function (err) {
                            debug("Wiki POST error:", err);
                            cb(false);
                        }
                    });
                } else {
                    debug("Failed to fetch wiki edit page:", response.status, response.statusText);
                    cb(false);
                }
            },
            onerror: function (err) {
                debug("Wiki edit GET error:", err);
                cb(false);
            }
        });
    }

    function createPanel(groupId, onLoadData, onSave) {
        const panel = document.createElement("div");
        panel.className = "alternate-wiki-panel panel";
        panel.style.marginBottom = "20px";

        panel.innerHTML = `
            <div class="panel__heading" style="cursor:pointer;">
                <span class="panel__heading__title">PTP Alternate Version Data</span>
                <span style="float: right; font-size: 0.9em;">
                    <a style="cursor: pointer; display:none;" id="altver-edit-link">(Edit)</a>
                </span>
            </div>
            <div id="altver-panel-body" class="panel__body" style="display: none;">
                <div id="altver-content" style="margin-bottom: 10px; min-height: 30px;"></div>
                <div id="altver-edit-area" style="display:none;">
                    <textarea id="altver-textarea" style="width: 100%; min-height: 80px;"></textarea>
                    <button id="altver-save-btn" style="margin-right: 10px;">Save</button>
                    <button id="altver-cancel-btn" style="margin-right: 10px;">Cancel</button>
                    <span id="altver-status" style="font-size: 0.95em; color: #888;"></span>
                </div>
            </div>
        `;

        const heading = panel.querySelector(".panel__heading");
        const body = panel.querySelector("#altver-panel-body");
        const contentDiv = panel.querySelector("#altver-content");
        const editLink = panel.querySelector("#altver-edit-link");
        const editArea = panel.querySelector("#altver-edit-area");
        const textarea = panel.querySelector("#altver-textarea");
        const saveBtn = panel.querySelector("#altver-save-btn");
        const cancelBtn = panel.querySelector("#altver-cancel-btn");
        const statusSpan = panel.querySelector("#altver-status");

        let loaded = false;
        let currentText = "";

        heading.onclick = function (e) {
            if (e.target.closest('#altver-edit-link')) return;
            if (body.style.display === "none") {
                body.style.display = "block";
                if (!loaded) {
                    contentDiv.textContent = "Loading...";
                    onLoadData(function (text) {
                        currentText = text || "";
                        contentDiv.innerHTML = currentText || "(No alternate version data found)";
                        editLink.style.display = "";
                        loaded = true;
                    });
                }
            } else {
                body.style.display = "none";
            }
        };

        editLink.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            textarea.value = "Loading...";
            editArea.style.display = "";
            contentDiv.style.display = "none";
            editLink.style.display = "none";

            fetchWikiBBCode(groupId, function(bbcode) {
                textarea.value = bbcode || "";
            });
        };

        saveBtn.onclick = function () {
            const newText = textarea.value;
            statusSpan.textContent = "Saving...";
            debug("Saving new text:", newText);
            onSave(newText, function (success) {
                statusSpan.textContent = success ? "Saved!" : "Failed to save.";
                debug("Save result:", success);
                if (success) {
                    onLoadData(function (renderedText) {
                        currentText = renderedText || "";
                        contentDiv.innerHTML = currentText || "(No alternate version data found)";
                        editArea.style.display = "none";
                        contentDiv.style.display = "";
                        editLink.style.display = "";
                    });
                } else {
                    editArea.style.display = "none";
                    contentDiv.style.display = "";
                    editLink.style.display = "";
                }
                setTimeout(() => { statusSpan.textContent = ""; }, 2000);
            });
        };

        cancelBtn.onclick = function () {
            editArea.style.display = "none";
            contentDiv.style.display = "";
            editLink.style.display = "";
        };

        return panel;
    }

    function main() {
        const groupId = getGroupId();
        if (!groupId) return;

        const panel = createPanel(
            groupId,
            function (cb) { fetchWikiArticle(groupId, cb); },
            function (newText, cb) { saveWikiArticle(groupId, newText, cb); }
        );

        const mainColumn = document.querySelector('.main-column');
        const synopsisPanel = document.getElementById('synopsis-and-trailer');
        if (mainColumn && synopsisPanel) {
            if (synopsisPanel.nextSibling) {
                mainColumn.insertBefore(panel, synopsisPanel.nextSibling);
            } else {
                mainColumn.appendChild(panel);
            }
        } else {
            if (mainColumn) mainColumn.insertBefore(panel, mainColumn.firstChild);
        }
    }

    main();
})();