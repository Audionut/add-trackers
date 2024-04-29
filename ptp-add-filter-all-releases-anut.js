// ==UserScript==
// @name         PTP - Add releases from other trackers
// @namespace    https://github.com/Audionut/add-trackers
// @version      3.3.0-A
// @description  add releases from other trackers
// @author       passthepopcorn_cc (edited by Perilune + Audionut)
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    "use strict";

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////                                   USER OPTIONS                     ////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //  available trackers: "BHD", "CG", "FL", "HDB", "KG", "PTP", "MTV", "ANT", "BTN", "BLU"*, "HUNO"*, TIK"*, "Aither"*, "FNP"*, "RFX"*, "OE"*, "AvistaZ"**, "CinemaZ"**, "PHD"**
    //  if you don't need the results from some of these trackers, do not add them. the fewer you add, the faster the code execution.
    //  remove tracker that you do not have access too.
    //  *requires API key     **performs two requests
    //  requires each tracker to be logged in with the same browser session (and container type if using multi-account containers).
   const trackers = ["BHD", "CG", "FL", "HDB", "KG", "PTP", "MTV", "ANT", "BTN", "BLU", "HUNO", "TIK", "Aither", "FNP", "RFX", "OE", "AvistaZ", "CinemaZ", "PHD"];

    const BLU_API_TOKEN = ""; // if you want to use BLU - find your api key here: https://blutopia.cc/users/YOUR_USERNAME_HERE/apikeys
    const TIK_API_TOKEN = ""; // if you want to use TIK - find your api key here: https://cinematik.net/users/YOUR_USERNAME_HERE/apikeys
    const AITHER_API_TOKEN = ""; // if you want to use Aither - find your api key here: https:/aither.cc/users/YOUR_USERNAME_HERE/apikeys
    const HUNO_API_TOKEN = ""; // if you want to use HUNO - find your api key here: https://hawke.uno/users/YOUR_USERNAME_HERE/settings/security#api
    const RFX_API_TOKEN = ""; // if you want to use RFX - find your api key here: https:/reelflix.xyz/users/YOUR_USERNAME_HERE/apikeys
    const OE_API_TOKEN = ""; /// if you want to use OE - find your api key here: https:/onlyencodes.cc/users/YOUR_USERNAME_HERE/apikeys
    const FNP_API_TOKEN = ""; // if you want to use FNP - find your api key here: https:/https://fearnopeer.com/users/YOUR_USERNAME_HERE/apikeys

    // Define how the DL link is displayed. Useful to clean the displayed output depending on stylsheet.
    let hideBlankLinks = "DL"; // Options are "DL" which only displays the "DL" link (like the old code). "Download" which displays "DOWNLOAD". "Spaced" which adds "DL" but spaced to fit left aligned style sheets.

    const show_tracker_icon = true; // false = will show default green checked icon ||| true = will show tracker logo instead of checked icon
    const show_tracker_name = true; // false = will hide tracker name ||| true = will show tracker name
    const hide_if_torrent_with_same_size_exists = false; // true = will hide torrents with the same file size as existing PTP ones
    const log_torrents_with_same_size = false; // true = will log torrents with the same file size as existing PTP ones in console (F12)
    const hide_filters_div = false; // false = will show filters box ||| true = will hide filters box
    const show_only_ptp_by_default = false; // false = will show all torrents by default, including external ones ||| true = will only show PTP torrents by default
    const hide_dead_external_torrents = false; // true = won't display dead external torrents
    const open_in_new_tab = true; // false : when you click external torrent, it will open the page in new tab. ||| true : it will replace current tab.

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    let discounts = ["Freeleech", "75% Freeleech", "50% Freeleech", "40% Bonus", "30% Bonus", "25% Freeleech", "Copper", "Bronze", "Silver", "Golden", "Refundable", "Rewind", "Rescuable", "None"];
    let qualities = ["SD", "480p", "576p", "720p", "1080p", "2160p"];
    let filters = {
        "trackers": trackers.map((e) => {
            return ({ "name": e, "status": "default" });
        }),

        "discounts": discounts.map((e) => {
            return ({ "name": e, "status": "default" });
        }),

        "qualities": qualities.map((e) => {
            return ({ "name": e, "status": "default" });
        }),
    };
    let doms = [];
    const TIMEOUT_DURATION = 10000;


    const dom_get_quality = (text) => {
        if (text.includes("720p")) return "720p";
        else if (text.includes("1080p")) return "1080p";
        else if (text.includes("2160p")) return "2160p";
        else if (text.includes("576p")) return "576p";
        else if (text.includes("480p")) return "480p";
        else return "SD";
    };


    const get_default_doms = () => {
        [...document.querySelectorAll("tr.group_torrent_header")].forEach((d, i) => {
            let tracker = "PTP";
            let dom_path = d;
            let quality = dom_get_quality(d.textContent);
            let discount = "None";
            let info_text = d.textContent;
            let seeders = parseInt(d.querySelector("td:nth-child(4)").textContent.replace(",", ""));
            let leechers = parseInt(d.querySelector("td:nth-child(5)").textContent.replace(",", ""));
            let snatchers = parseInt(d.querySelector("td:nth-child(3)").textContent.replace(",", ""));
            let size = d.querySelector("td:nth-child(2)").textContent.trim();

            if (size.includes("GiB")) size = (parseFloat(size.split(" ")[0]) * 1024).toFixed(2);
            else if (size.includes("MiB")) size = (parseFloat(size.split(" ")[0])).toFixed(2);
            else size = 1;

            let dom_id = "ptp_" + i;

            d.className += " " + dom_id; // required for re-render, nice fix

            doms.push({ tracker, dom_path, quality, discount, info_text, seeders, leechers, snatchers, dom_id, size });
        });
    };


    get_default_doms();

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }


    const get_discount_text = (div, tracker) => {
        if (tracker === "HDB") {
            if (div.querySelector("b > a").title.includes("50% Free Leech")) return "50% Freeleech";
            else if (div.querySelector("b > a").title.includes("25% Free Leech")) return "25% Freeleech";
            else if (div.querySelector("b > a").title.includes("Neutral Leech")) return "Neutral Leech";
            else if (div.querySelector("b > a").title.includes("100% FL")) return "Freeleech";
        }
        else if (tracker === "BHD") {
            if (div.querySelector("i.fa-peace") != null) return "Freeleech"; // limited FL, with 1.0 upload cap.
            else if (div.querySelector("i.fa-popcorn") != null) return "Rewind"; // limited FL, until there are enough seeders?
            else if (div.querySelector("i.text-refund") != null) return "Refundable";
            else if (div.querySelector("i.fa-life-ring") != null) return "Rescuable"; // limited FL, until there are enough seeders=
            else { // eğer fl varsa
                let discount = [...div.querySelectorAll("i.fa-star")].find(i => {
                    return (
                        i.getAttribute("title") != null &&
                        i.getAttribute("title").includes("Free")
                    );
                });
                //[...div.querySelectorAll("i.fa-star")].forEach(a => console.log(a));
                if (discount === undefined) return "None";
                else {
                    let discount_value = discount.getAttribute("title").split(" ")[0]; // returns 50%
                    if (discount_value === "100%") return "Freeleech";
                    else return discount_value + "Freeleech";
                }
            }
        }
        else if (["BLU", "Aither", "RFX", "OE", "TIK", "HUNO", "FNP"].includes(tracker)) {
            return true;
        }
        else if (tracker === "FL") {
            if ([...div.querySelectorAll("img")].find(e => e.alt === "FreeLeech") != undefined) return "Freeleech";
        }
        else if (tracker === "BTN") {
                let discount = [...div.querySelectorAll("i.fa-star")].find(i => {
                    return (
                        i.getAttribute("title") != null &&
                        i.getAttribute("title").includes("Free")
                    );
                });
                if (discount === undefined || discount === null) {
                    return "None";
                }
                else {
                    let discount_value = discount.getAttribute("title").split(" ")[0]; // This does nothing except removed 'undefined' from the displayed results.
                    if (discount_value === "100%") return "Freeleech";
                    else return discount_value + "Freeleech";
                }
        }
        else if (tracker === "MTV") {
                let discount = [...div.querySelectorAll("i.fa-star")].find(i => {
                    return (
                        i.getAttribute("title") != null &&
                        i.getAttribute("title").includes("Free")
                    );
                });
                if (discount === undefined || discount === null) {
                    return "None";
                }
                else {
                    let discount_value = discount.getAttribute("title").split(" ")[0]; // This does nothing except removed 'undefined' from the displayed results.
                    if (discount_value === "100%") return "Freeleech";
                    else return discount_value + "Freeleech";
                }
        }
        else if (tracker === "ANT") {
            const pollenLabel = div.querySelector(".torrent_table#torrent_details .torrent_label.tooltip.tl_pollen");
            const freeLabel = div.querySelector(".torrent_table#torrent_details .torrent_label.tooltip.tl_free");

            let label;

            if (pollenLabel !== null) {
                const labelText = pollenLabel.textContent.trim();
                let pollenText = labelText.split("Pollination")[1].trim();
                // Remove the exclamation mark if it appears after "Pollination"
                if (pollenText.charAt(0) === '!') {
                    pollenText = pollenText.substring(1);
                }
                // Extract time value from pollenText
                const pollenTime = pollenText.match(/\(([^)]+)\)/)[1];
                // Remove brackets from pollenText
                pollenText = pollenText.replace(/\(([^)]+)\)/, "").trim();
                label = "Pollination";
            } else if (freeLabel !== null) {
                const labelText = freeLabel.textContent.trim();
                const freeTime = labelText.match(/\(([^)]+)\)/)[1];
                const freeText = labelText.replace(/\(([^)]+)\)/, "").trim();
                label = "Freeleech";
            }

            return label !== undefined ? label : "None";
        }
        else if (tracker === "CG") {
            if ([...div.querySelectorAll("img")].find(e => e.alt === "100% bonus")) return "Freeleech";
            else if ([...div.querySelectorAll("img")].find(e => e.alt === "30% bonus")) return "30% Bonus";
            else if ([...div.querySelectorAll("img")].find(e => e.alt === "40% bonus")) return "40% Bonus";
        }
        else if (["AvistaZ", "CinemaZ", "PHD"].includes(tracker)) {
            const icons = div.querySelectorAll(".torrent-file > div > i");
            if (icons.length > 0) {
                let discount = "";
                let text;
                for (let [i, icon] of icons.entries()) {
                    if (icon.title === "Free Download") {
                        text = "Freeleech";
                    } else if (icon.title === "Half Download") {
                        text = "50% Freeleech";
                    } else if (icon.title === "Double upload") {
                        text = "Double Upload";
                    } else {
                        text = icon.title;
                    }
                    discount += text + (icons.length > 0 && i < icons.length - 1 ? " / " : "");
                }
                return text;
            }
        }
        return "None";
    };


    const get_tracker_icon = (tracker) => {
        if (tracker === "BHD") return "https://beyond-hd.me/favicon.ico";
        else if (tracker === "BLU") return "https://blutopia.cc/favicon.ico";
        else if (tracker === "Aither") return "https://aither.cc/favicon.ico";
        else if (tracker === "RFX") return "https://reelflix.xyz/favicon.ico";
        else if (tracker === "OE") return "https://onlyencodes.cc/favicon.ico";
        else if (tracker === "CG") return "https://cinemageddon.net/favicon.ico";
        else if (tracker === "FL") return "https://filelist.io/favicon.ico";
        else if (tracker === "AvistaZ") return "https://avistaz.to/images/avistaz-favicon.png";
        else if (tracker === "PHD") return "https://privatehd.to/images/privatehd-favicon.png";
        else if (tracker === "CinemaZ") return "https://cinemaz.to/images/cinemaz-favicon.png";
        else if (tracker === "HDB") return "https://hdbits.org/pic/favicon/favicon.ico";
        else if (tracker === "KG") return "https://karagarga.in/favicon.ico";
        else if (tracker === "TIK") return "https://cinematik.net/favicon.ico";
        else if (tracker === "MTV") return "https://www.morethantv.me/favicon.ico";
        else if (tracker === "ANT") return "https://anthelion.me/favicon.ico";
        else if (tracker === "HUNO") return "https://hawke.uno/favicon.ico";
        else if (tracker === "BTN") return "https://broadcasthe.net/favicon.ico";
        else if (tracker === "FNP") return "https://fearnopeer.com/favicon.ico";
    };


    const use_api_instead = (tracker) => {
        if (
            (tracker === "BLU") ||
            (tracker === "Aither") ||
            (tracker === "RFX") ||
            (tracker === "OE") ||
            (tracker === "HUNO") ||
            (tracker === "TIK") ||
            (tracker === "FNP")
        )
            return true;
        else return false;
    };


    const get_torrent_objs = async (tracker, html) => {
        let torrent_objs = [];

        if (tracker === "HDB") {
            html.querySelector("#torrent-list > tbody").querySelectorAll("tr").forEach((d) => {
                let torrent_obj = {};
                let size = d.querySelectorAll("td")[5].textContent;

                if (size.includes("GiB")) {
                    size = parseInt(parseFloat(size.split("GiB")[0]) * 1024); // MB
                }
                else if (size.includes("MiB")) size = parseInt(parseFloat(size.split("MiB")[0]));

                torrent_obj.size = size;
                torrent_obj.info_text = d.querySelector("td:nth-child(3) > b > a").textContent;
                torrent_obj.site = "HDB";
                torrent_obj.download_link = d.querySelector(".js-download").href.replace("passthepopcorn.me", "hdbits.org");
                torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(7)").textContent);
                torrent_obj.seed = parseInt(d.querySelector("td:nth-child(8)").textContent);
                torrent_obj.leech = parseInt(d.querySelector("td:nth-child(9)").textContent);
                torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "hdbits.org");
                torrent_obj.status = d.querySelectorAll("span.tag_seeding").length > 0 ? "seeding" : "default";
                torrent_obj.discount = get_discount_text(d, tracker);
                torrent_obj.internal = d.querySelector(".tag.internal") ? true : false;
                torrent_obj.exclusive = d.querySelector(".tag.exclusive") ? true : false;
                torrent_objs.push(torrent_obj);
            });
        }
        else if (tracker === "BTN") {
            html.querySelector(".torrent_table > tbody:nth-child(2)").querySelectorAll("tr[style='border-top: none;']").forEach((d) => {

                // BTN has differing layouts for the top torrent compared to the other torrents. This is the top torrent.
                if (d.querySelectorAll("td")[2].textContent.includes("GB")) {
                  let torrent_obj = {};
                    let size = d.querySelectorAll("td")[2].textContent;

                    if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // MB
                    }
                    else if (size.includes("MB")) size = parseInt(parseFloat(size.split("MB")[0]));

                    torrent_obj.size = size;
                    torrent_obj.info_text = Array.from(d.querySelector("td:nth-child(2)").querySelectorAll("span"))
                        .map(span => span.textContent.trim())
                        .filter(text => !text.includes("Internal"))
                        .filter(text => !text.includes("["))
                        .filter(text => !text.includes("DL") || text.includes("WEB-DL"))
                        .filter(text => !text.includes("]"))
                        .join(" ");
                    torrent_obj.site = "BTN";
                    torrent_obj.download_link = d.querySelector("a[title='Download']").href.replace("passthepopcorn.me", "broadcasthe.net");
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(3)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(4)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(5)").textContent);
                    torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("torrentid=")).href.replace("passthepopcorn.me", "broadcasthe.net");
                    torrent_obj.status = d.querySelectorAll("span.internal").length > 0 ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_obj.internal = Array.from(d.querySelector("td:nth-child(2)").querySelectorAll("span"))
                                          .map(span => span.textContent.trim())
                                          .some(text => text.includes("Internal"));
                    torrent_objs.push(torrent_obj);
                }

                // Layout for other torrents
                if (d.querySelectorAll("td")[1].textContent.includes("GB")) {
                  let torrent_obj = {};
                    let size = d.querySelectorAll("td")[1].textContent;

                    if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // MB
                    }
                    else if (size.includes("MB")) size = parseInt(parseFloat(size.split("MB")[0]));

                    torrent_obj.size = size;
                    torrent_obj.info_text = Array.from(d.querySelector("td:nth-child(1)").querySelectorAll("span"))
                        .map(span => span.textContent.trim())
                        .filter(text => !text.includes("Internal"))
                        .filter(text => !text.includes("["))
                        .filter(text => !text.includes("DL") || text.includes("WEB-DL"))
                        .filter(text => !text.includes("]"))
                        .join(" ");
                    torrent_obj.site = "BTN";
                    torrent_obj.download_link = d.querySelector("a[title='Download']").href.replace("passthepopcorn.me", "broadcasthe.net");
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(2)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(3)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(4)").textContent);
                    torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("torrentid=")).href.replace("passthepopcorn.me", "broadcasthe.net");
                    torrent_obj.status = d.querySelectorAll("span.internal").length > 0 ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_obj.internal = Array.from(d.querySelector("td:nth-child(1)").querySelectorAll("span"))
                                          .map(span => span.textContent.trim())
                                          .some(text => text.includes("Internal"));
                    torrent_objs.push(torrent_obj);
                }
            });
        }
        else if (tracker === "MTV") {
            try {
                html.querySelector("#torrent_table > tbody").querySelectorAll("tr:not(.colhead)").forEach((d) => {
                    // Check if the torrent is marked
                    if (!d.querySelectorAll('span[title="You cannot download a marked Torrent"]').length) {
                        let torrent_obj = {};

                        try {
                            let sizeElement = d.querySelectorAll("td")[4];
                            let size = null;
                            if (sizeElement) {
                                size = sizeElement.textContent;
                                if (size.includes("GiB")) {
                                    size = parseInt(parseFloat(size.split("GiB")[0]) * 1024); // MB
                                } else if (size.includes("MiB")) {
                                    size = parseInt(parseFloat(size.split("MiB")[0]));
                                }
                            }
                            torrent_obj.size = size;
                        } catch (error) {
                            console.error("An error occurred while extracting size:", error);
                            torrent_obj.size = null;
                        }

                        try {
                            const overlayTorrentLink = d.querySelector("a.overlay_torrent");
                            let infoText = overlayTorrentLink ? overlayTorrentLink.innerText : "";
                            if (infoText) {
                                // Check if the inner text contains "SxxExx" where "xx" is not known beforehand
                                if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                                    // If the inner text does not contain the pattern, proceed with further processing
                                    // Remove forward slashes
                                    infoText = infoText.replace(/\//g, '');

                                    const spanElements = overlayTorrentLink.querySelectorAll('span');

                                    spanElements.forEach(span => {
                                        const spanText = span.innerText || span.textContent;
                                        infoText = infoText.replace(spanText, '');
                                    });

                                    // Remove extra whitespaces
                                    infoText = infoText.replace(/\s+/g, ' ').trim();

                                    const modifiedInfoText = infoText.replace(/\./g, ' ');
                                    const isInternal = infoText.includes("-hallowed") || infoText.includes("-TEPES") || infoText.includes("-E.N.D") || infoText.includes("-WDYM");
                                    torrent_obj.info_text = modifiedInfoText;
                                    torrent_obj.internal = isInternal ? true : false;

                                    // Only push to torrent_objs if it passes the "SxxExx" check
                                    torrent_objs.push(torrent_obj);
                                }
                            } else {
                                console.log("Skipping torrent due to missing info text");
                            }
                        } catch (error) {
                            console.error("An error occurred while extracting info text:", error);
                        }

                        try {
                            torrent_obj.site = "MTV";
                            const downloadLinkArray = [...d.querySelectorAll("a")].filter(a => a.href.includes("torrents.php?action="));
                            if (downloadLinkArray.length > 0) {
                                torrent_obj.download_link = downloadLinkArray[0].href.replace("passthepopcorn.me", "morethantv.me");
                            } else {
                                torrent_obj.download_link = ""; // Or assign default value if needed
                            }
                            torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(6)").textContent);
                            torrent_obj.seed = parseInt(d.querySelector("td:nth-child(7)").textContent);
                            torrent_obj.leech = parseInt(d.querySelector("td:nth-child(8)").textContent);
                            torrent_obj.torrent_page = [...d.querySelectorAll("a.overlay_torrent")].find(a => a.href.includes("/torrents.php?id=")).href.replace("passthepopcorn.me", "morethantv.me");
                            torrent_obj.status = d.querySelectorAll('a[title="Currently Seeding Torrent"]').length > 0 ? 'seeding' : 'default' ;
                            torrent_obj.discount = get_discount_text(d, tracker);
                            torrent_obj.reported = d.querySelector(".reported") ? true : false;
                        } catch (error) {
                            console.error("An error occurred while extracting other properties:", error);
                            // Assign default or null values for these properties if needed
                            torrent_obj.site = "MTV";
                            torrent_obj.download_link = "";
                            torrent_obj.snatch = 0;
                            torrent_obj.seed = 0;
                            torrent_obj.leech = 0;
                            torrent_obj.torrent_page = "";
                            torrent_obj.status = "default";
                            torrent_obj.discount = "";
                        }
                    } else {
                        console.log("Skipping marked torrent");
                    }
                });
            } catch (error) {
                console.error("An error occurred while processing MTV tracker:", error);
            }
        }
        else if (tracker === "ANT") {
            const rows = html.querySelector(".torrent_table#torrent_details > tbody").querySelectorAll("tr:not(.colhead_dark):not(.sortGroup)");
            rows.forEach((d, index) => {
                let torrent_obj = {};
                let size = null;
                const tdElements = d.querySelectorAll("td");
                if (tdElements.length >= 2) {
                    size = tdElements[1].textContent;
                    if (size.includes("GiB")) {
                        size = parseInt(parseFloat(size.split("GiB")[0]) * 1024); // MB
                    } else if (size.includes("MiB")) {
                        size = parseInt(parseFloat(size.split("MiB")[0]));
                    }
                }

                let torrentId = null;
                const hrefElement = d.querySelector('a[data-toggle-target^="#torrent_"]');
                if (hrefElement) {
                    const hrefValue = hrefElement.getAttribute('data-toggle-target');
                    const match = hrefValue.match(/#torrent_(\d+)/);
                    if (match) {
                        torrentId = match[1];
                    }
                }

                const baseUrl = 'https://anthelion.me/torrents.php?';

                if (torrentId !== null) {
                    const torrentPageUrl = `${baseUrl}torrentid=${torrentId}`;
                    torrent_obj.size = size;

                const titleElement = d.querySelector("td:nth-child(1) > a");
                if (titleElement) {
                    let infoTextParts = [];
                    const titleText = Array.from(titleElement.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim().replace(/\//g, ''))
                        .join(' / ');
                    if (titleText) {
                        infoTextParts.push(titleText);
                    }
                    const strongElements = titleElement.querySelectorAll("strong.torrent_label");
                    strongElements.forEach(strong => {
                        const text = strong.textContent.trim();
                        if (strong.classList.contains("tl_notice")) {
                            infoTextParts.push(text);
                        }
                    });
                    torrent_obj.info_text = infoTextParts.join(' / ').replace(/\/\s*\/\s*/g, ' / ');
                }
                    torrent_obj.site = "ANT";
                    torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("torrents.php?action=") && !a.href.includes("&usetoken=1")).href.replace("passthepopcorn.me", "anthelion.me");
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(3)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(4)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(5)").textContent);
                    torrent_obj.torrent_page = torrentPageUrl;
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_obj.reported = d.querySelector(".torrent_table#torrent_details .torrent_label.tl_reported.tooltip") ? true : false;
                    const elements = d.querySelectorAll('strong.torrent_label.tl_seeding.tooltip');
                    torrent_obj.status = elements.length > 0 ? 'seeding' : 'default';
                    torrent_objs.push(torrent_obj);
                }
            });
        }
        else if (tracker === "BHD") {
            try {
                [...html.querySelector(".table-new").querySelectorAll("tr.bhd-sub-header-compact")].forEach((d) => {
                    let torrent_obj = {};

                    try {
                        let sizeElement = [...d.querySelectorAll("td")].find(e => e.textContent.includes(" GiB") || e.textContent.includes(" MiB"));
                        let size = null;
                        if (sizeElement) {
                            size = sizeElement.textContent.trim();
                            if (size.includes("GiB")) {
                                size = parseInt(parseFloat(size.split(" ")[0]) * 1024); // MB
                            } else if (size.includes("MiB")) {
                                size = parseInt(parseFloat(size.split(" ")[0]));
                            }
                        }
                        torrent_obj.size = size;
                    } catch (error) {
                        console.error("An error occurred while extracting size:", error);
                        torrent_obj.size = null;
                    }

                    try {
                        let infoTextElement = d.querySelector("a.text-compact");
                        const infoText = infoTextElement ? infoTextElement.textContent.trim() : "";

                        // Check if the info text contains "SxxExx" where "xx" is not known beforehand
                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            // If the info text does not contain the pattern, proceed with further processing
                            torrent_obj.info_text = infoText;

                            // Proceed with other property extractions
                            torrent_obj.site = "BHD";
                            let snatchElement = d.querySelector("a.torrent-completes");
                            torrent_obj.snatch = snatchElement ? snatchElement.textContent.trim() : "";
                            let seedElement = d.querySelector("a.torrent-seeders");
                            torrent_obj.seed = seedElement ? seedElement.textContent.trim() : "";
                            let leechElement = d.querySelector("a.torrent-leechers");
                            torrent_obj.leech = leechElement ? leechElement.textContent.trim() : "";
                            let downloadLinkElement = [...d.querySelectorAll("a")].find(a => a.title === "Download Torrent");
                            torrent_obj.download_link = downloadLinkElement ? downloadLinkElement.href : "";
                            let torrentPageElement = d.querySelector("a");
                            torrent_obj.torrent_page = torrentPageElement ? torrentPageElement.href : "";
                            torrent_obj.status = d.querySelectorAll("i.fa-seedling").length > 0 ? "seeding" : "default";
                            torrent_obj.discount = get_discount_text(d, tracker);

                            // Push the fully processed torrent object
                            torrent_objs.push(torrent_obj);
                        }
                    } catch (error) {
                        console.error("An error occurred while extracting info text:", error);
                    }
                });
            } catch (error) {
                console.error("An error occurred while processing BHD tracker:", error);
            }
        }
        else if (tracker === "FL") {
            html.querySelectorAll(".torrentrow").forEach((d) => {
                let torrent_obj = {};
                let size = [...d.querySelectorAll("font")].find((d) => {
                    return (d.textContent.includes("[") === false) && (d.textContent.includes("GB") || d.textContent.includes("MB"));
                }).textContent;

                if (size.includes("GB")) {
                    size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // MB
                }
                else if (size.includes("MB")) size = parseInt(parseFloat(size.split("MB")[0]));

                torrent_obj.size = size;
                torrent_obj.info_text = [...d.querySelectorAll("a")].find(a => a.href.includes("details.php?id=")).title.replace(/\./g, " ");
                torrent_obj.site = "FL";
                torrent_obj.snatch = parseInt(d.querySelector("div:nth-child(8)").textContent.replace(/,/g, ""));
                torrent_obj.seed = parseInt(d.querySelector("div:nth-child(9)").textContent.replace(/,/g, ""));
                torrent_obj.leech = parseInt(d.querySelector("div:nth-child(10)").textContent.replace(/,/g, ""));
                torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("download.php?id=")).href.replace("passthepopcorn.me", "filelist.io");
                torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "filelist.io");
                torrent_obj.status = "default";
                torrent_obj.discount = get_discount_text(d, tracker);
                torrent_objs.push(torrent_obj);
            });
        }
        else if (tracker === "CG") {
            let ar1 = [...html.querySelectorAll("tr.prim")];
            let ar2 = [...html.querySelectorAll("tr.sec")];
            let ar3 = [...html.querySelectorAll("tr.torrenttable_usersnatched")];
            let ar4 = [...html.querySelectorAll("tr.torrenttable_bumped")];

            let combined_arr = ar1.concat(ar2).concat(ar3).concat(ar4);

            combined_arr.forEach((d) => {
                let torrent_obj = {};

                let size = d.querySelector("td:nth-child(5)").textContent;

                if (size.includes("GB")) {
                    size = parseInt(parseFloat(size.split(" ")[0]) * 1024); // MB
                }
                else if (size.includes("MB")) size = parseInt(parseFloat(size.split(" ")[0]));
                else size = 1; // must be kiloBytes, so lets assume 1mb.

                torrent_obj.size = size;
                torrent_obj.info_text = d.querySelectorAll("td")[1].querySelector("b").textContent.trim();
                torrent_obj.site = "CG";
                torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(6)").textContent);
                torrent_obj.seed = parseInt(d.querySelector("td:nth-child(7)").textContent);
                torrent_obj.leech = parseInt(d.querySelector("td:nth-child(8)").textContent);
                torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("download.php?id=")).href.replace("passthepopcorn.me", "cinemageddon.net");
                torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "cinemageddon.net");
                torrent_obj.status = d.className.includes("torrenttable_usersnatched") ? "seeding" : "default";
                torrent_obj.discount = get_discount_text(d, tracker);
                torrent_objs.push(torrent_obj);
            });
        }
        else if (tracker === "KG") {
            html.querySelector("#browse > tbody").querySelectorAll("tr").forEach((d) => {
                try {
                    let torrent_obj = {};
                    let size = d.querySelector("td:nth-child(11)").textContent.replace(",", "");

                    if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024); // MB
                    }
                    else if (size.includes("MB")) size = parseInt(parseFloat(size.split("MB")[0]));
                    else size = 1; // must be kiloBytes, so lets assume 1mb.

                    const images = d.querySelectorAll("[style='position:absolute;top:0px; left:0px'] > img");
                    torrent_obj.quality = Array.from(images).some(img => img.title.includes("HD")) ? "HD" : "SD";
                    torrent_obj.size = size;
                    torrent_obj.info_text = d.querySelectorAll("td")[1].querySelector("a").textContent.trim();
                    torrent_obj.site = "KG";
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(12)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(13)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(14)").textContent);
                    torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("/down.php/")).href.replace("passthepopcorn.me", "karagarga.in");
                    torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "karagarga.in");
                    torrent_obj.status = d.className.includes("snatchedrow") ? "seeding" : "default";
                    torrent_obj.discount = get_discount_text(d, tracker);
                    torrent_objs.push(torrent_obj);
                } catch (e) {
                    console.error("An error has occurred: ", e);
                }
            });
        }
        else if (tracker === "AvistaZ") {
            // requires another request to get to the torrents
            const groupUrl = html.querySelector("h3.movie-title > a").href;
            const groupId = groupUrl.match(/\/movie\/(\d+)-/)[1];
            const url = `https://avistaz.to/movies/torrents/${groupId}?quality=all`;
            const result = await fetch_url(url);

            result.querySelectorAll("tbody > tr").forEach(d => {
                let torrent_obj = {};
                let size = d.querySelector("td:nth-child(5)").textContent.trim().replace(",", "");

                if (size.includes("GB")) size = parseInt(parseFloat(size.split(" ")[0]) * 1024); // MB
                else if (size.includes("MB")) size = parseInt(parseFloat(size.split(" ")[0]));
                else size = 1;

                const torrentLink = d.querySelector(".torrent-file > div > a");
                torrent_obj.size = size;
                torrent_obj.info_text = torrentLink.textContent.trim();
                torrent_obj.site = "AvistaZ";
                torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(8)").textContent);
                torrent_obj.seed = parseInt(d.querySelector("td:nth-child(6)").textContent);
                torrent_obj.leech = parseInt(d.querySelector("td:nth-child(7)").textContent);
                torrent_obj.download_link = d.querySelector(".torrent-download-icon").href.replace("passthepopcorn.me", "avistaz.to");
                torrent_obj.torrent_page = torrentLink.href.replace("passthepopcorn.me", "avistaz.to");
                torrent_obj.status = d.className.includes("success") ? "seeding" : "default";
                torrent_obj.discount = get_discount_text(d, tracker);
                torrent_objs.push(torrent_obj);
            });
        }
        else if (tracker === "CinemaZ") {
            // requires another request to get to the torrents
            const groupUrl = html.querySelector("h3.movie-title > a").href;
            const groupId = groupUrl.match(/\/movie\/(\d+)-/)[1];
            const url = `https://cinemaz.to/movies/torrents/${groupId}?quality=all`;
            const result = await fetch_url(url);

            result.querySelectorAll("tbody > tr").forEach(d => {
                let torrent_obj = {};
                let size = d.querySelector("td:nth-child(5)").textContent.trim().replace(",", "");

                if (size.includes("GB")) size = parseInt(parseFloat(size.split(" ")[0]) * 1024); // MB
                else if (size.includes("MB")) size = parseInt(parseFloat(size.split(" ")[0]));
                else size = 1;

                const torrentLink = d.querySelector(".torrent-file > div > a");
                torrent_obj.size = size;
                torrent_obj.info_text = torrentLink.textContent.trim();
                torrent_obj.site = "CinemaZ";
                torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(8)").textContent);
                torrent_obj.seed = parseInt(d.querySelector("td:nth-child(6)").textContent);
                torrent_obj.leech = parseInt(d.querySelector("td:nth-child(7)").textContent);
                torrent_obj.download_link = d.querySelector(".torrent-download-icon").href.replace("passthepopcorn.me", "cinemaz.to");
                torrent_obj.torrent_page = torrentLink.href.replace("passthepopcorn.me", "cinemaz.to");
                torrent_obj.status = d.className.includes("success") ? "seeding" : "default";
                torrent_obj.discount = get_discount_text(d, tracker);
                torrent_objs.push(torrent_obj);
            });
        }
        else if (tracker === "PHD") {
            // requires another request to get to the torrents
            const groupUrl = html.querySelector("h3.movie-title > a").href;
            const groupId = groupUrl.match(/\/movie\/(\d+)-/)[1];
            const url = `https://privatehd.to/movies/torrents/${groupId}?quality=all`;
            const result = await fetch_url(url);

            result.querySelectorAll("tbody > tr").forEach(d => {
                let torrent_obj = {};
                let size = d.querySelector("td:nth-child(5)").textContent.trim().replace(",", "");

                if (size.includes("GB")) size = parseInt(parseFloat(size.split(" ")[0]) * 1024); // MB
                else if (size.includes("MB")) size = parseInt(parseFloat(size.split(" ")[0]));
                else size = 1;

                const torrentLink = d.querySelector(".torrent-file > div > a");
                torrent_obj.size = size;
                torrent_obj.info_text = torrentLink.textContent.trim();
                torrent_obj.site = "PHD";
                torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(8)").textContent);
                torrent_obj.seed = parseInt(d.querySelector("td:nth-child(6)").textContent);
                torrent_obj.leech = parseInt(d.querySelector("td:nth-child(7)").textContent);
                torrent_obj.download_link = d.querySelector(".torrent-download-icon").href.replace("passthepopcorn.me", "privatehd.to");
                torrent_obj.torrent_page = torrentLink.href.replace("passthepopcorn.me", "privatehd.to");
                torrent_obj.status = d.className.includes("success") ? "seeding" : "default";
                torrent_obj.discount = get_discount_text(d, tracker);
                torrent_objs.push(torrent_obj);
            });
        }
        torrent_objs = torrent_objs.map(e => {
            return { ...e, "quality": get_torrent_quality(e) };
        });

        return torrent_objs;
    };


    const is_movie_exist = (tracker, html) => { // true or false
        if (tracker === "PTP") {
            if (html.querySelector("#no_results_message > div") === null) return true;
            else return false;
        }
        else if (tracker === "HDB") {
            if (html.querySelector("#resultsarea").textContent.includes("Nothing here!")) return false;
            else return true;
        }
        else if (tracker === "BTN") {
            if (html.querySelector(".thin").textContent.includes("Error 404")) return false;
            else return true;
        }
        else if (tracker === "MTV") {
            if (html.querySelector(".numsearchresults").textContent.includes("0 results")) return false;
            else return true;
        }
        else if (tracker === "ANT") {
            if (html.querySelector(".head").textContent.includes("Basic Search (")) return false;
            else return true;
        }
        else if (tracker === "BHD") {
            if (html.querySelectorAll(".bhd-meta-box").length === 0) return false;
            else return true;
        } else if (tracker === "BLU" || tracker === "Aither" || tracker === "RFX" || tracker === "OE" || tracker === "HUNO" || tracker === "TIK" || tracker === "FNP") {
            if (html.querySelector(".torrent-search--list__no-result") === null) return true;
            else return false;
        }
        else if (["AvistaZ", "CinemaZ", "PHD"].includes(tracker)) {
            if (html.querySelector("#content-area > div.block > p") === null) return true;
            else return false;
        }
        else if (tracker === "FL") {
            if (html.querySelectorAll(".torrentrow").length === 0) return false;
            else return true;
        }
        else if (tracker === "CG") {
            let ar1 = [...html.querySelectorAll("tr.prim")];
            let ar2 = [...html.querySelectorAll("tr.even")];
            let ar3 = [...html.querySelectorAll("tr.torrenttable_usersnatched")];
            let ar4 = [...html.querySelectorAll("tr.torrenttable_bumped")];

            let combined_arr = ar1.concat(ar2).concat(ar3).concat(ar4);

            if (combined_arr.length > 0) return true; // it's different, pay attention !
            else return false;
        }
        else if (tracker === "KG") {
            if (html.querySelector("tr.oddrow") === null) return false; // it's different, pay attention !
            else return true;
        }
    };

    const fetch_url = async (query_url) => {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: query_url,
                    method: "GET",
                    timeout: TIMEOUT_DURATION,
                    onload: resolve,
                    onerror: reject,
                    onabort: reject,
                    ontimeout: reject,
                });
            });

            if (response.status === 200) {
                const parser = new DOMParser();
                const result = parser.parseFromString(response.responseText, "text/html").body;
                return result;
            } else {
                console.error(`Error: HTTP ${response.status} Error.`);
                throw new Error(`HTTP ${response.status} Error`);
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
            throw error;
        }
    };

    const fetch_tracker = async (tracker, imdb_id) => {
        return new Promise((resolve, reject) => {
            let query_url = "";
            let api_query_url = "";

            if (tracker === "PTP") {
                query_url = "https://passthepopcorn.me/torrents.php?imdb=" + imdb_id;
            }
            else if (tracker === "HDB") {
                //query_url = "https://hdbits.org/browse.php?c3=1&c1=1&c2=1&tagsearchtype=or&imdb=" + mov.imdb_id + "&sort=size&h=8&d=DESC"
                query_url = "https://hdbits.org/browse.php?c3=1&c8=1&c1=1&c4=1&c5=1&c2=1&c7=1&descriptions=0&season_packs=0&from=&to=&imdbgt=0&imdblt=10&imdb=" + imdb_id + "&sort=size&h=8&d=DESC";
            }
            else if (tracker === "BTN") {
                query_url = "https://broadcasthe.net/torrents.php?action=advanced&imdb=" + imdb_id;
            }
            else if (tracker === "MTV") {
                query_url = "https://www.morethantv.me/torrents/browse?page=1&order_by=time&order_way=desc&=Search&=Reset&=Search&searchtext=" + imdb_id + "&action=advanced&title=&sizeall=&sizetype=kb&sizerange=0.01&filelist=&autocomplete_toggle=on";
            }
            else if (tracker === "ANT") {
                query_url = "https://anthelion.me/torrents.php?searchstr=" + imdb_id +"&order_by=time&order_way=desc&group_results=1&action=basic&searchsubmit=1";
            }
            else if (tracker === "BHD") {
                query_url = "https://beyond-hd.me/library?activity=&q=" + imdb_id;
            }
            else if (tracker === "BLU") {
                api_query_url =
                    "https://blutopia.cc/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=1&categories[1]=2&categories[2]=3&api_token=" +
                    BLU_API_TOKEN;
            }
            else if (tracker === "TIK") {
                api_query_url =
                    "https://cinematik.net/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=1&categories[1]=3&categories[2]=5&categories[3]=6&api_token=" +
                    TIK_API_TOKEN;
            }
            else if (tracker === "Aither") {
                api_query_url =
                    "https://aither.cc/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=1&categories[1]=2&api_token=" +
                    AITHER_API_TOKEN;
            }
            else if (tracker === "RFX") {
                api_query_url =
                    "https://reelflix.xyz/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=1&api_token=" +
                    RFX_API_TOKEN;
            }
            else if (tracker === "OE") {
                api_query_url =
                    "https://onlyencodes.cc/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=1&api_token=" +
                    OE_API_TOKEN;
            }
            else if (tracker === "HUNO") {
                api_query_url =
                    "https://hawke.uno/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=2&categories[1]=1&api_token=" +
                    HUNO_API_TOKEN;
            }
            else if (tracker === "FNP") {
                api_query_url =
                    "https://fearnopeer.com/api/torrents/filter?imdbId=" +
                    imdb_id.split("tt")[1] +
                    "&categories[0]=1&categories[1]=2&categories[2]=6&api_token=" +
                    FNP_API_TOKEN;
            }
            else if (tracker === "AvistaZ") {
                query_url = "https://avistaz.to/movies?search=&imdb=" + imdb_id + "&view=lists";
            }
            else if (tracker === "CinemaZ") {
                query_url = "https://cinemaz.to/movies?search=&imdb=" + imdb_id + "&view=lists";
            }
            else if (tracker === "PHD") {
                query_url = "https://privatehd.to/movies?search=&imdb=" + imdb_id + "&view=lists";
            }
            else if (tracker === "FL") {
                query_url = "https://filelist.io/browse.php?search=" + imdb_id + "&cat=0&searchin=1&sort=3";
            }
            else if (tracker === "CG") {
                query_url = "https://cinemageddon.net/browse.php?search=" + imdb_id + "&orderby=size&dir=DESC";
            }
            else if (tracker === "KG") {
                query_url = "https://karagarga.in/browse.php?sort=size&search=" + imdb_id + "&search_type=imdb&d=DESC";
            }

            try {
                if (use_api_instead(tracker) === false) {
                    fetch_url(query_url)
                        .then(result => {
                            let movie_exist = is_movie_exist(tracker, result);

                            if (movie_exist === false) {
                                console.log(`No data found on ${tracker}`);
                                console.log(`${tracker} reached successfully`);
                                resolve([]);
                            }
                            else {
                                console.log(`Data fetched successfully from ${tracker}`);
                                console.log("Fetched data:", result); // Log the fetched data
                                resolve(get_torrent_objs(tracker, result));
                            }
                        })
                        .catch(error => {
                            console.error(`Error fetching data from ${tracker}:`, error);
                            resolve([]); // Resolve with empty array if there's an error
                        });
                }
                else {
                    fetch(api_query_url)
                        .then(res => {
                            if (!res.ok) {
                                throw new Error(`Failed to fetch data from ${tracker}`);
                            }
                            return res.json();
                        })
                        .then(data => {
                            if (data.data.length === 0) {
                                console.log(`${tracker} reached successfully`);
                                console.log(`No data found on ${tracker}`);
                            }
                            else {
                                console.log(`Data fetched successfully from ${tracker}`);
                                console.log("Fetched data:", data); // Log the fetched data
                            }
                            resolve(get_api_torrent_objects(tracker, data));
                        })
                        .catch(error => {
                            console.error(`Error fetching data from ${tracker}:`, error);
                            resolve([]); // Resolve with empty array if there's an error
                        });
                }
            } catch (error) {
                console.error(`Error fetching data from ${tracker}:`, error);
                resolve([]); // Resolve with empty array if there's an error
            }
        });
    };

    const get_api_discount = (text, refundable) => {
        let discountText = "";

        if (refundable === true) {
            discountText += "Refundable";
        } else {
            if (text === 0 || text === "0%") {
                discountText = "None";
            } else if (text === "25%") {
                discountText = "25% Freeleech";
            } else if (text === "Copper") {
                discountText = "Copper";
            } else if (text === "50%") {
                discountText = "50% Freeleech";
            } else if (text === "Bronze") {
                discountText = "Bronze";
            } else if (text === "75%") {
                discountText = "75% Freeleech";
            } else if (text === "Silver") {
                discountText = "Silver";
            } else if (text === "100%") {
                discountText = "Freeleech";
            } else if (text === "Golden") {
                discountText = "Golden";
            } else {
                discountText = text + " Freeleech";
            }
        }

        return discountText;
    };

    const get_api_internal = (internal) => {
        return !!internal; // Convert internal to boolean directly
    };

    const get_api_personal_release = (personal_release) => {
        return !!personal_release; // Convert internal to boolean directly
    };

    const get_api_double_upload = (double_upload, tracker) => {
        if (tracker === "TIK" && double_upload === true) {
            return "Emerald";
        } else if (double_upload === true) {
            return "DU";
        } else return false;
    };

    const get_api_featured = (featured, tracker) => {
        if (tracker === "TIK" && featured === true) {
            return "Platinum";
        } else if (featured === true) {
            return "Featured";
        } else {
            return false;
        }
    };

    const get_api_torrent_objects = (tracker, json) => {
        let torrent_objs = [];

        if (
            tracker === "BLU" ||
            tracker === "Aither" ||
            tracker === "RFX" ||
            tracker === "OE" ||
            tracker === "HUNO" ||
            tracker === "TIK" ||
            tracker === "FNP"
        ) {
            torrent_objs = json.data.map((element) => {
                // Mapping element attributes to a torrent object
                const infoText = tracker === "HUNO" ? element.attributes.name.replace(/[()]/g, "") : element.attributes.name;

                // Check if the info text contains "SxxExx" where "xx" is not known beforehand
                if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                    // If the info text does not contain the pattern, proceed with further processing
                    const torrentObj = {
                        size: parseInt(element.attributes.size / (1024 * 1024)),
                        info_text: infoText,
                        tracker: tracker,
                        site: tracker,
                        snatch: element.attributes.times_completed,
                        seed: element.attributes.seeders,
                        leech: element.attributes.leechers,
                        download_link: element.attributes.download_link,
                        torrent_page: element.attributes.details_link,
                        discount: (tracker === "TIK") ?
                            (
                                (element.attributes.freeleech === "75%") ? "Silver" :
                                (element.attributes.freeleech === "50%") ? "Bronze" :
                                (element.attributes.freeleech === "100%") ? "Golden" :
                                (element.attributes.freeleech === "25%") ? "Copper" :
                                element.attributes.freeleech
                            ) :
                            element.attributes.freeleech,
                        featured: element.attributes.featured,
                        internal: element.attributes.internal,
                        double_upload: element.attributes.double_upload,
                        refundable: element.attributes.refundable,
                        personal_release: element.attributes.personal_release,
                    };

                    // Mapping additional properties and logging the final torrent objects
                    const mappedObj = { ...torrentObj, "quality": get_torrent_quality(torrentObj), "discount": get_api_discount(torrentObj.discount, torrentObj.refundable, tracker), "internal": get_api_internal(torrentObj.internal), "Featured": get_api_featured(torrentObj.featured)};

                    // Returning the final torrent object if it passes the "SxxExx" check
                    return mappedObj;
                } else {
                    // If the info text contains the pattern, skip further processing
                    return null; // Return null to filter out this torrent object
                }
            }).filter(obj => obj !== null); // Filter out the null objects (skipped torrents)

            // Returning the final torrent objects
            return torrent_objs;
        }
    };

    const get_filtered_torrents = (quality) => {
        let all_trs = [...document.querySelectorAll("tr.group_torrent")];
        let filtered_torrents = [];

        if (quality === "SD") {
            let first_idx = all_trs.findIndex((a) => a.textContent.includes("Standard Definition"));
            let sliced = all_trs.slice(first_idx + 1, all_trs.length);

            let last_idx = sliced.findIndex((a) => a.className === "group_torrent");
            if (last_idx === -1) last_idx = all_trs.length;
            filtered_torrents = sliced.slice(0, last_idx);
        }
        else if (quality === "HD") {
            let first_idx = all_trs.findIndex((a) => a.textContent.includes("High Definition") && !a.textContent.includes("Ultra High Definition"));
            let sliced = all_trs.slice(first_idx + 1, all_trs.length);

            let last_idx = sliced.findIndex((a) => a.className === "group_torrent");
            if (last_idx === -1) last_idx = all_trs.length;
            filtered_torrents = sliced.slice(0, last_idx);
        }
        else if (quality === "UHD") {
            let first_idx = all_trs.findIndex((a) => a.textContent.includes("Ultra High Definition"));
            let sliced = all_trs.slice(first_idx + 1, all_trs.length);

            let last_idx = sliced.findIndex((a) => a.className === "group_torrent");
            if (last_idx === -1) last_idx = all_trs.length;
            filtered_torrents = sliced.slice(0, last_idx);
        }

        // part 2 !
        let group_torrent_objs = [];

        filtered_torrents.forEach((t) => {
            try {
                let size_text = [...t.querySelectorAll("span")].find(s => s.title.includes(" bytes")).title;
                let size = Math.floor(parseInt(size_text.split(" bytes")[0].replace(/,/g, "")) / 1024 / 1024);
                let dom_path = t;

                group_torrent_objs.push({ dom_path, size });

            } catch (e) {
                console.error("An error has occurred: ", e);
            }
        });

        return group_torrent_objs;
    };


    const get_torrent_quality = (torrent) => {
        if (torrent.quality) return torrent.quality;

        let text = torrent.info_text.toLowerCase();

        if (text.includes("2160p")) return "UHD";
        else if (text.includes("1080p") || text.includes("720p") || text.includes("1080i") || text.includes("720i")) return "HD";
        else return "SD";
    };


    const get_ref_div = (torrent, ptp_torrent_group) => {
        let my_size = torrent.size;

        try {
            // dont add after this div, add it after the hidden div !
            let div = ptp_torrent_group.find(e => e.size < my_size).dom_path;
            let selector_id = "torrent_" + div.id.split("header_")[1];
            return document.getElementById(selector_id);
        } catch (e) {
            return false; // the size is too small, put it at the top of the group.
        }
    };


    const get_ptp_format_size = (size) => {
        if (size === null || size === undefined) {
            return "N/A"; // or any default value you prefer
        }
        if (size > 1024) { // GiB format
            return (size / 1024).toFixed(2) + " GiB";
        } else { // MiB format
            return size.toFixed(2) + " MiB";
        }
    };


    const add_as_first = (div, quality) => { // puts 2gb 1080p at the top of the pack.
        let all_trs = [...document.querySelectorAll("tr.group_torrent")];
        let first_idx;

        if (quality === "SD") {
            first_idx = all_trs.findIndex((a) => a.textContent.includes("Standard Definition"));
        }
        else if (quality === "HD") {
            first_idx = all_trs.findIndex((a) => a.textContent.includes("High Definition") && !a.textContent.includes("Ultra High Definition"));
        }
        else if (quality === "UHD") {
            first_idx = all_trs.findIndex((a) => a.textContent.includes("Ultra High Definition"));
        }

        insertAfter(div, all_trs[first_idx]);
    };


    const get_codec = (lower, torrent) => {
        if (lower.includes("x264") || lower.includes("x.264")) return "x264 / ";
        else if (lower.includes("h264") || lower.includes("h.264")) return "H.264 / ";
        else if (lower.includes("x265") || lower.includes("x.265")) return "x265 / ";
        else if (lower.includes("h265") || lower.includes("h.265")) return "H.265 / ";
        else if (lower.includes("xvid") || lower.includes("x.vid")) return "XviD / ";
        else if (lower.includes("divx") || lower.includes("div.x")) return "DivX / ";
        else if (lower.includes("dvd5") || lower.includes("dvd-5") || lower.includes("dvd 5")) return "DVD5 / ";
        else if (lower.includes("dvd9") || lower.includes("dvd-9") || lower.includes("dvd 9")) return "DVD9 / ";

        else if (lower.includes("bd25") || lower.includes("bd-25")) return "BD25 / ";
        else if (lower.includes("bd50") || lower.includes("bd-50")) return "BD50 / ";
        else if (lower.includes("bd66") || lower.includes("bd-66")) return "BD66 / ";
        else if (lower.includes("bd100") || lower.includes("bd-100")) return "BD100 / ";

        return ""; // skip this info
    };


    const get_container = (lower, torrent) => {
        if (lower.includes("avi")) return "AVI / ";
        else if (lower.includes("mpg")) return "MPG / ";
        else if (lower.includes("mkv")) return "MKV / ";
        else if (lower.includes("mp4")) return "MP4 / ";
        else if (lower.includes("vob")) return "VOB / ";
        else if (lower.includes("iso")) return "ISO / ";
        else if (lower.includes("m2ts")) return "m2ts / ";

        return ""; // skip this info
    };


    const get_source = (lower, torrent) => {
        if (lower.includes("/cam")) return "CAM / ";
        else if (lower.includes("/ts")) return "TS / ";
        else if (lower.includes("/r5")) return "R5 / ";
        else if (lower.includes("vhs")) return "VHS / ";
        else if (lower.includes("web")) return "WEB / ";
        else if (lower.includes("dvd")) return "DVD / ";
        else if (lower.includes("hdtv") || lower.includes("hd-tv")) return "HDTV / ";
        else if (lower.includes("tv")) return "TV / ";
        else if (lower.includes("hddvd") || lower.includes("hd-dvd")) return "HD-DVD / ";
        else if (lower.includes("bluray") || lower.includes("blu-ray") || lower.includes("blu.ray") || lower.includes("blu ray")) return "Blu-ray / ";

        return ""; // skip this info
    };


    const get_res = (lower, torrent) => {
        if (lower.includes("ntsc")) return "NTSC / ";
        else if (lower.includes("pal")) return "PAL / ";
        else if (lower.includes("480p")) return "480p / ";
        else if (lower.includes("576p")) return "576p / ";
        else if (lower.includes("720p")) return "720p / ";
        else if (lower.includes("1080i")) return "1080i / ";
        else if (lower.includes("1080p")) return "1080p / ";
        else if (lower.includes("2160p")) return "2160p / ";

        return ""; // skip this info
    };

    const get_simplified_title = (info_text, torrent) => {
        let lower = info_text.toLowerCase();

        // required infos : codec (x264 vs) / container (mkv,mp4) / source (dvd,web,bluray) / res (1080p,720,SD,1024x768 etc) / Bonus (with commentary,remux, XYZ edition)
        let codec = get_codec(lower, torrent);
        let container = get_container(lower, torrent);
        let source = get_source(lower, torrent);
        let res = get_res(lower, torrent);

        let combined_text = codec + container + source + res;

        if (combined_text === "") return info_text;
        else return combined_text;
    };


    const get_discount_color = (discount) => {
        if (discount === "Freeleech") return "inherit";
        else if (discount === "50% Freeleech") return "inherit";
        else if (discount === "25% Freeleech") return "inherit";
        else return "inherit";
    };


    const add_external_torrents = (external_torrents) => {
        const existing_torrent_sizes = Array.from(document.querySelectorAll("span[style='float: left;']")).map(x => x.textContent);
        // console.log(existing_torrent_sizes);

        let sd_ptp_torrents = get_filtered_torrents("SD").sort((a, b) => a.size < b.size ? 1 : -1);
        let hd_ptp_torrents = get_filtered_torrents("HD").sort((a, b) => a.size < b.size ? 1 : -1);
        let uhd_ptp_torrents = get_filtered_torrents("UHD").sort((a, b) => a.size < b.size ? 1 : -1);

        create_needed_groups(external_torrents);

        external_torrents.forEach((torrent, i) => {
            let seeders = parseInt(torrent.seed);
            if (hide_dead_external_torrents && parseInt(seeders) === 0) return;

            let group_torrents;
            let ref_div;
            let tracker = torrent.site;
            let dom_id = tracker + "_" + i;

            if (torrent.quality === "UHD") {
                ref_div = get_ref_div(torrent, uhd_ptp_torrents);
                group_torrents = uhd_ptp_torrents; // needed just in case ref returns false/if its smallest
            } else if (torrent.quality === "HD") {
                ref_div = get_ref_div(torrent, hd_ptp_torrents);
                group_torrents = hd_ptp_torrents;
            } else {
                ref_div = get_ref_div(torrent, sd_ptp_torrents);
                group_torrents = sd_ptp_torrents;
            }

            let cln = line_example.cloneNode(true);

            if (show_tracker_name) {
                cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] ` + torrent.info_text;
            } else {
                cln.querySelector(".torrent-info-link").textContent = torrent.info_text;
            }

            // HDB only
            if (torrent.site === "HDB") {
                torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                torrent.exclusive ? cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #a14989'>Exclusive</span>" : false;
            }
            if (torrent.site === "BTN") {
                torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #00FF00'>Internal</span>" : false;
            }
            if (torrent.site === "ANT") {
                torrent.reported ? cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #FF0000'>Reported</span>" : false;
            }
            if (torrent.site === "MTV") {
                torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                torrent.reported ? cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #FF0000'>Reported</span>" : false;
            }
            if (torrent.site === "BLU" || torrent.site ==="Aither" || torrent.site ===  "RFX" || torrent.site ===  "OE" || torrent.site ===  "HUNO" || torrent.site === "FNP") {
                get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #baaf92'>Internal</span>") : false;
                get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #279d29'>DU</span>") : false;
                get_api_featured(torrent.featured) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #997799'>Featured</span>") : false;
                get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #865BE9'>Personal Release</span>") : false;
            }
            if (torrent.site === "TIK") {
                get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #baaf92'>Internal</span>") : false;
                get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #3FB618'>Emerald</span>") : false;
                get_api_featured(torrent.featured, torrent.site) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #26A69A'>Platinum</span>") : false;
                get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span style='font-weight: bold; color: #865BE9'>Personal Release</span>") : false;
            }
            torrent.discount != "None" ? cln.querySelector(".torrent-info-link").innerHTML += ` / <span style='font-weight: bold;color:${get_discount_color(torrent.discount)};'>` + torrent.discount + "!</span>" : false;

            //cln.querySelector(".torrent-info-link").textContent = torrent.info_text;
            if (torrent.status === "seeding") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-seeding";

            //cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] ` + get_simplified_title(torrent.info_text);
            let elements = cln.querySelector(".basic-movie-list__torrent__action").querySelectorAll("a");

            if (elements.length > 0) {
                if (hideBlankLinks === "DL") {
                    let element = [...elements].find(a => a.textContent === " DL ");
                    if (element) {
                        element.href = torrent.download_link;
                    }
                } else if (hideBlankLinks === "Download") {
                    let element = [...elements].find(a => a.textContent === " DOWNLOAD ");
                    if (element) {
                        element.href = torrent.download_link;
                    }
                } else if (hideBlankLinks === "Spaced") {
                    let element = [...elements].find(a => a.textContent.trim() === " DL ");
                    if (element) {
                        element.style.paddingLeft = "49px";
                        element.href = torrent.download_link;
                    }
                }
            } else {
                console.log("No elements found matching the criteria.");
            }

            const ptp_format_size = get_ptp_format_size(torrent.size);
            if (hide_if_torrent_with_same_size_exists && existing_torrent_sizes.includes(ptp_format_size)) {
                if (log_torrents_with_same_size) {
                    console.log(`[${torrent.site}] A ${ptp_format_size} torrent already exists:\n${torrent.info_text}\n${torrent.torrent_page}`);
                }
                return;
            }

            cln.querySelector(".size-span").textContent = ptp_format_size;
            cln.querySelector("td:nth-child(3)").textContent = torrent.snatch; // snatch
            cln.querySelector("td:nth-child(4)").textContent = torrent.seed; // seed

            if (torrent.seed === 0) {
                cln.querySelector("td:nth-child(4)").className = "no-seeders";
            }

            cln.querySelector("td:nth-child(5)").textContent = torrent.leech; // leech
            cln.querySelector(".link_3").href = torrent.torrent_page;
            cln.className += " " + dom_id;

            if (open_in_new_tab) cln.querySelector(".link_3").target = "_blank";

            if (show_tracker_icon) {
                cln.querySelector("img").src = get_tracker_icon(torrent.site);
                cln.querySelector("img").title = torrent.site;
            }

            if (ref_div != false) insertAfter(cln, ref_div);
            else {
                add_as_first(cln, torrent.quality);
            }

            let dom_path = cln;
            let quality = dom_get_quality(torrent.info_text);
            let discount = torrent.discount;
            let info_text = torrent.info_text;
            let leechers = parseInt(torrent.leech);
            let snatchers = parseInt(torrent.snatch);
            let size = torrent.size;

            doms.push({ tracker, dom_path, quality, discount, info_text, seeders, leechers, snatchers, dom_id, size });
        });

        let reduced_trackers = get_reduced_trackers(doms);
        let reduced_discounts = get_reduced_discounts(doms);
        let reduced_qualities = get_reduced_qualities(doms);

        if (!hide_filters_div) {
            add_filters_div(reduced_trackers, reduced_discounts, reduced_qualities);
            // disable_highlight()
            add_sort_listeners();
        }
    };


    const insert_group = (quality, header_div) => {
        let all_trs = [...document.querySelector("#torrent-table > tbody").querySelectorAll("tr.group_torrent")];
        let tbody = document.querySelector("#torrent-table > tbody");

        if (quality === "HD") {
            let idx = -2; // add_after_this_index

            for (let i = 0; i < all_trs.length; i++) {
                if (all_trs[i].textContent.includes("Other") || all_trs[i].textContent.includes("Ultra High Definition")) {
                    idx = i - 1;
                    break;
                }
            }
            if (idx === -2) {
                tbody.appendChild(header_div); // nothing to stop me
            } else {
                insertAfter(header_div, all_trs[idx]);
            }
        }
        else if (quality === "UHD") {
            let idx = -2; // add_after_this_index

            for (let i = 0; i < all_trs.length; i++) {
                if (all_trs[i].textContent.includes("Other")) {
                    idx = i - 1;
                    break;
                }
            }

            if (idx === -2) {
                tbody.appendChild(header_div); // nothing to stop me
            } else {
                insertAfter(header_div, all_trs[idx]);
            }
        }
    };


    const create_needed_groups = (torrents) => {
        let all_trs = [...document.querySelector("#torrent-table > tbody").querySelectorAll("tr.group_torrent")];
        let tbody = document.querySelector("#torrent-table > tbody");

        if (torrents.find(e => e.quality === "SD") != undefined && all_trs.find(d => d.textContent.includes("Standard Definition")) === undefined) {
            group_header_example.querySelector(".basic-movie-list__torrent-edition__sub").textContent = "Standard Definition";
            tbody.insertBefore(group_header_example, document.querySelector("#torrent-table > tbody").firstChild);
        }
        if (torrents.find(e => e.quality === "HD") != undefined &&
            all_trs.find(d => d.textContent.includes("High Definition") && !d.textContent.includes("Ultra High Definition")) === undefined) {
            group_header_example.querySelector(".basic-movie-list__torrent-edition__sub").textContent = "High Definition";
            insert_group("HD", group_header_example);
        }
        if (torrents.find(e => e.quality === "UHD") != undefined && all_trs.find(d => d.textContent.includes("Ultra High Definition")) === undefined) {
            group_header_example.querySelector(".basic-movie-list__torrent-edition__sub").textContent = "Ultra High Definition";
            insert_group("UHD", group_header_example);
        }
    };


    const fix_doms = () => {
        doms.forEach((d) => {
            d.dom_path = [...document.querySelectorAll(".group_torrent")].find(e => e.className.split(" ").find(c => c === d.dom_id) != undefined);
        });

    };


    const filter_torrents = () => {
        doms.forEach((e, i) => {
            let tracker_constraint = false;

            let inc_value = undefined;
            let exc_value = undefined; // should this be the initial value or should it be null?

            let status = filters.trackers.find(d => d.name === e.tracker).status;

            if (status === "include") inc_value = true;
            else if (status === "exclude") exc_value = true;

            if (inc_value === true) tracker_constraint = true;
            else if (exc_value === true) tracker_constraint = false; // actually this line is redundant.
            else {
                tracker_constraint = true;
                if (filters.trackers.filter(e => e.status === "include").length > 0) tracker_constraint = false;

            }

            if (tracker_constraint === false) {
                e.dom_path.style.display = "none";
                return;
            }
            ////////////////////
            let discount_constraint = false;

            let inc_value_2 = undefined;
            let exc_value_2 = undefined; // should this be the initial value or should it be null?

            let status_2 = filters.discounts.find(d => d.name === e.discount).status;

            if (status_2 === "include") inc_value_2 = true;
            else if (status_2 === "exclude") exc_value_2 = true;

            if (inc_value_2 === true) discount_constraint = true;
            else if (exc_value_2 === true) discount_constraint = false; // actually this line is redundant.
            else { // neutral
                discount_constraint = true;
                if (filters.discounts.filter(e => e.status === "include").length > 0) discount_constraint = false;
            }

            if (discount_constraint === false) {
                e.dom_path.style.display = "none";
                return;
            }
            /////////////////////////////////
            let quality_constraint = false;

            let inc_value_3 = undefined;
            let exc_value_3 = undefined; // should this be the initial value or should it be null?

            let status_3 = filters.qualities.find(d => d.name === e.quality).status;

            if (status_3 === "include") inc_value_3 = true;
            else if (status_3 === "exclude") exc_value_3 = true;

            if (inc_value_3 === true) quality_constraint = true;
            else if (exc_value_3 === true) quality_constraint = false; // actually this line is redundant.
            else { // neutral
                quality_constraint = true;
                if (filters.qualities.filter(e => e.status === "include").length > 0) quality_constraint = false;
            }

            if (quality_constraint === false) {
                e.dom_path.style.display = "none";
                return;
            }
            //////////////////////

            let text_constraint = true;
            let must_include_words = document.querySelector(".torrent-search").value.split(" ").map((w) => w.toLowerCase());

            for (let word of must_include_words) {
                if (e.info_text.toLowerCase().includes(word) === false) {
                    text_constraint = false;
                    break;
                }
            }

            if (text_constraint === false) {
                e.dom_path.style.display = "none";
                return;
            }

            // congrats !
            e.dom_path.style.display = "table-row";
        });
    };


    function show_only_ptp() {
        const dom_path = document.querySelector("#filter-ptp");
        filters.trackers.find(e => e.name === "PTP").status = "include";
        dom_path.style.background = "#40E0D0";
        dom_path.style.color = "#111";

        filter_torrents();
    }


    const update_filter_box_status = (object_key, value, dom_path) => { // object_key = tracker/quality/discount || value = BHD, HDB, 50% Freeleech, 720p etc...
        // let all_values = ["default", "include", "exclude"];

        if (object_key === "trackers") {
            let current_status = filters.trackers.find(e => e.name === value).status;

            if (current_status === "default") {
                filters.trackers.find(e => e.name === value).status = "include";
                dom_path.style.background = "#40E0D0";
                dom_path.style.color = "#111";
            } else if (current_status === "include") {
                filters.trackers.find(e => e.name === value).status = "exclude";
                dom_path.style.background = "#920000";
                dom_path.style.color = "#eee";
            } else {
                filters.trackers.find(e => e.name === value).status = "default";
                dom_path.style.background = "";
                dom_path.style.opacity = 1;
            }
        }
        else if (object_key === "discounts") {
            let current_status = filters.discounts.find(e => e.name === value).status;

            if (current_status === "default") {
                filters.discounts.find(e => e.name === value).status = "include";
                dom_path.style.background = "#40E0D0";
                dom_path.style.color = "#111";
            } else if (current_status === "include") {
                filters.discounts.find(e => e.name === value).status = "exclude";
                dom_path.style.background = "#920000";
                dom_path.style.color = "#eee";
            } else {
                filters.discounts.find(e => e.name === value).status = "default";
                dom_path.style.background = "";
                dom_path.style.opacity = 1;
            }
        }
        else if (object_key === "qualities") {
            let current_status = filters.qualities.find(e => e.name === value).status;

            if (current_status === "default") {
                filters.qualities.find(e => e.name === value).status = "include";
                dom_path.style.background = "#40E0D0";
                dom_path.style.color = "#111";
            } else if (current_status === "include") {
                filters.qualities.find(e => e.name === value).status = "exclude";
                dom_path.style.background = "#920000";
                dom_path.style.color = "#eee";
            } else {
                filters.qualities.find(e => e.name === value).status = "default";
                dom_path.style.background = "";
                dom_path.style.opacity = 1;
            }
        }

        filter_torrents(); // big update
    };


    const fix_ptp_names = () => {
        document.querySelectorAll("tr.group_torrent").forEach(d => {
            if (d.className != "group_torrent") {
                const torrent = d.querySelector("a.torrent-info-link");
                torrent.innerHTML = "[PTP] " + torrent.innerHTML;
            }
        });
    };


    const add_filters_div = (trackers, discounts, qualities) => {
        let addBeforeThis = document.querySelector("#movieinfo");

        let div = document.createElement("div");
        div.className = "panel__body";
        div.style.padding = "0 10px 5px 10px";

        let filterByTracker = document.createElement("div");
        filterByTracker.style = "display: flex; align-items: baseline";

        let label = document.createElement("div");
        label.textContent = "Tracker: ";
        label.style.cursor = "default";
        label.style.flex = "0 0 60px";
        filterByTracker.appendChild(label);

        filterByTracker.style.margin = "4px 0";

        let trackerContents = document.createElement("div");

        trackers.forEach((tracker_name) => {
            let div = document.createElement("div");
            div.id = `filter-${tracker_name.toLowerCase()}`;
            div.className = "filter-box";
            div.textContent = tracker_name;
            div.style.padding = "2px 5px";
            div.style.margin = "3px";
            div.style.color = "#eee";
            div.style.display = "inline-block";
            div.style.cursor = "pointer";
            // div.style.width = "40px"
            div.style.border = "1px dashed #606060";
            div.style.fontSize = "1em";
            div.style.textAlign = "center";

            div.addEventListener("click", () => {
                update_filter_box_status("trackers", tracker_name, div);
            });

            trackerContents.append(div);
        });

        filterByTracker.append(trackerContents);
        div.append(filterByTracker);

        let additional_settings = document.createElement("div"); // discounts
        additional_settings.style = "display: flex; align-items: baseline";

        let label_2 = document.createElement("div");
        label_2.textContent = "Discount: ";
        label_2.style.cursor = "default";
        label_2.style.flex = "0 0 60px";
        additional_settings.appendChild(label_2);

        let discountContents = document.createElement("div");

        discounts.forEach((discount_name) => {
            let only_discount = document.createElement("div");
            only_discount.className = "filter-box";
            only_discount.textContent = discount_name;
            only_discount.style.padding = "2px 5px";
            only_discount.style.margin = "3px";
            only_discount.style.color = "#eee";
            only_discount.style.display = "inline-block";
            only_discount.style.cursor = "pointer";
            only_discount.style.border = "1px dashed #606060";
            only_discount.style.fontSize = "1em";

            only_discount.addEventListener("click", () => {
                update_filter_box_status("discounts", discount_name, only_discount);
            });
            discountContents.append(only_discount);
        });

        additional_settings.append(discountContents);
        div.append(additional_settings);

        ///////
        let filterByQuality = document.createElement("div");
        filterByQuality.style = "display: flex; align-items: baseline";

        let label_3 = document.createElement("div");
        label_3.textContent = "Quality: ";
        label_3.style.cursor = "default";
        label_3.style.flex = "0 0 60px";
        filterByQuality.appendChild(label_3);

        filterByQuality.style.margin = "4px 0";

        let qualityContents = document.createElement("div");

        qualities.forEach((quality_name) => {

            let quality = document.createElement("div");
            quality.className = "filter-box";
            quality.textContent = quality_name;
            quality.style.padding = "2px 5px";
            quality.style.margin = "3px";
            quality.style.color = "#eee";
            quality.style.display = "inline-block";
            quality.style.cursor = "pointer";
            quality.style.border = "1px dashed #606060";
            quality.style.fontSize = "1em";
            quality.style.textAlign = "center";

            quality.addEventListener("click", () => {
                update_filter_box_status("qualities", quality_name, quality);
            });

            qualityContents.append(quality);
        });

        filterByQuality.append(qualityContents);
        div.append(filterByQuality);

        /////////////////////
        let filterByText = document.createElement("div");
        filterByText.style.margin = "8px 0 0";

        let input = document.createElement("input");
        input.className = "torrent-search search-bar__search-field__input";
        input.type = "text";
        input.spellcheck = false;
        input.placeholder = "Search torrents...";
        input.style.fontSize = "1em";
        input.style.width = "84%";

        input.addEventListener("input", (e) => {
            filter_torrents();
        });

        filterByText.appendChild(input);

        // reset btn
        let rst = document.createElement("div");
        rst.textContent = "⟳";

        rst.style.padding = "4px 8px";
        rst.style.margin = "0px 4px";
        rst.style.color = "#eee";
        rst.style.display = "inline-block";
        rst.style.cursor = "pointer";
        rst.style.border = "1px dashed #606060";
        rst.style.fontSize = "1em";
        rst.style.textAlign = "center";

        rst.addEventListener("click", () => {
            document.querySelector(".torrent-search").value = "";
            filters = {
                "trackers": trackers.map((e) => {
                    return ({ "name": e, "status": "default" });
                }),
                "discounts": discounts.map((e) => {
                    return ({ "name": e, "status": "default" });
                }),
                "qualities": qualities.map((e) => {
                    return ({ "name": e, "status": "default" });
                }),
            };

            filter_torrents();

            document.querySelectorAll(".filter-box").forEach(d => {
                d.style.background = "";
                d.style.color = "#eee";
            });
        });

        filterByText.appendChild(rst);

        div.appendChild(filterByText);

        const panel = document.createElement("div");
        panel.className = "panel";
        const panelHeading = document.createElement("div");
        panelHeading.className = "panel__heading";

        const panelHeadingTitle = document.createElement("span");
        panelHeadingTitle.textContent = "Filter Releases";
        panelHeadingTitle.className = "panel__heading__title";
        panelHeading.append(panelHeadingTitle);

        panel.append(panelHeading, div);


        addBeforeThis.insertAdjacentElement("beforeBegin", panel);

        // done.
    };


    const get_example_div = () => {
        let tr = document.createElement("tr");
        tr.className = "group_torrent group_torrent_header";
        tr["data-releasename"] = "release_name_here";

        let td = document.createElement("td");
        td.style.width = "596px";

        let span = document.createElement("span");
        span.className = "basic-movie-list__torrent__action";
        span.style.marginLeft = "12px";
        span.textContent = "[";

        if (hideBlankLinks === "DL") {
          let a = document.createElement("a");
          a.href = "#";
          a.className = "link_1";
          a.textContent = " DL ";
          a.title = "Download";
          span.appendChild(a); // Append the <a> element to the <span> element
        } else if (hideBlankLinks === "Download") {
          let aDownload = document.createElement("a"); // Create a new <a> element for "Download"
          aDownload.href = "#";
          aDownload.className = "link_1";
          aDownload.textContent = " DOWNLOAD ";
          aDownload.title = "Download";
          span.appendChild(aDownload); // Append the <a> element to the <span> element
        }
          else if (hideBlankLinks === "Spaced") {
            let aSpaced = document.createElement("a"); // Create a new <a> element for "Spaced"
            aSpaced.href = "#";
            aSpaced.className = "link_1";
            aSpaced.title = "Download";
            aSpaced.style.paddingLeft = "49px";

            let textNode = document.createTextNode("DL "); // Create a text node with "DL"
            aSpaced.appendChild(textNode); // Append the text node to the <a> element

            span.appendChild(aSpaced); // Append the <a> element to the <span> element
          }

        span.innerHTML += "]"; // Append closing bracket to the span element

        let a2 = document.createElement("a");
        a2.href = "#";
        a2.className = "link_2";
        a2.style.marginRight = "4px";

        let img = document.createElement("img");
        img.style.width = "12px";
        img.style.height = "12px";
        img.src = "static/common/check.png";
        img.alt = "☑";
        img.title = "Tracker title";

        a2.appendChild(img);

        let a3 = document.createElement("a");
        a3.href = "link_3";
        a3.className = "torrent-info-link link_3";
        a3.textContent = "INFO_TEXT_HERE";

        td.appendChild(span);
        td.appendChild(a2);
        td.appendChild(a3);

        let td2 = document.createElement("td");
        td2.className = "nobr";
        td2.style.width = "63px";

        let span2 = document.createElement("span");
        span2.className = "size-span";
        span2.style.float = "left";
        span2.textContent = "TORRENT_SIZE_HERE";
        td2.appendChild(span2);

        let td3 = document.createElement("td");
        td3.style.width = "31px";

        let td4 = document.createElement("td");
        td3.style.width = "21px";

        let td5 = document.createElement("td");
        td3.style.width = "10px";

        tr.appendChild(td);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);

        return tr;
    };


    const disable_highlight = () => {
        document.querySelector(".filter-container").addEventListener("mousedown", function (event) {
            if (event.detail > 1) {
                event.preventDefault();
                // of course, you still do not know what you prevent here...
                // You could also check event.ctrlKey/event.shiftKey/event.altKey
                // to not prevent something useful.
            }
        }, false);


        document.querySelector("table.torrent_table > thead").addEventListener("mousedown", function (event) {
            if (event.detail > 1) {
                event.preventDefault();
                // of course, you still do not know what you prevent here...
                // You could also check event.ctrlKey/event.shiftKey/event.altKey
                // to not prevent something useful.
            }
        }, false);



    };

    const get_sorted_qualities = (qualities) => {
        let arr = [];

        qualities.forEach(q => {

            if (q === "SD") arr.push({ "value": 0, "name": q });
            else if (q === "480p") arr.push({ "value": 1, "name": q });
            else if (q === "576p") arr.push({ "value": 2, "name": q });
            else if (q === "720p") arr.push({ "value": 3, "name": q });
            else if (q === "1080p") arr.push({ "value": 4, "name": q });
            else if (q === "2160p") arr.push({ "value": 5, "name": q });

        });

        return arr.sort((a, b) => (a.value > b.value) ? 1 : -1).map(e => e.name);
    };

    const get_sorted_discounts = (discounts) => {
        let arr = [];

        discounts.forEach(q => {
            if (q === "None") arr.push({ "value": 0, "name": q });
            else if (q === "Rescuable") arr.push({ "value": 1, "name": q });
            else if (q === "Rewind") arr.push({ "value": 2, "name": q });
            else if (q === "Refundable") arr.push({ "value": 3, "name": q });
            else if (q === "25% Freeleech") arr.push({ "value": 4, "name": q });
            else if (q === "Copper") arr.push({ "value": 5, "name": q });
            else if (q === "30% Bonus") arr.push({ "value": 6, "name": q });
            else if (q === "40% Bonus") arr.push({ "value": 7, "name": q });
            else if (q === "50% Freeleech") arr.push({ "value": 8, "name": q });
            else if (q === "Bronze") arr.push({ "value": 9, "name": q });
            else if (q === "75% Freeleech") arr.push({ "value": 10, "name": q });
            else if (q === "Silver") arr.push({ "value": 11, "name": q });
            else if (q === "Freeleech") arr.push({ "value": 12, "name": q });
            else if (q === "Golden") arr.push({ "value": 13, "name": q });
            else if (q === "Pollination") arr.push({ "value": 14, "name": q });
        });

        return arr.sort((a, b) => (a.value < b.value) ? 1 : -1).map(e => e.name);
    };

    const get_reduced_trackers = (doms) => {
        let lst = []; // default

        doms.forEach(t => {
            if (lst.includes(t.tracker) === false) lst.push(t.tracker);
        });

        return lst.sort((a, b) => a > b ? 1 : -1);

    };


    const get_reduced_discounts = (doms) => {
        let lst = [];

        doms.forEach(t => {
            if (lst.includes(t.discount) === false) lst.push(t.discount);
        });

        return get_sorted_discounts(lst);

    };


    const get_reduced_qualities = (doms) => {
        let lst = [];

        qualities.forEach(q => {
            for (let i = 0; i < doms.length; i++) {
                if (doms[i].info_text.toLowerCase().includes(q.toLowerCase()) && q != "SD" && !lst.includes(q)) {
                    lst.push(q);
                    break;
                }
            }
        });

        return get_sorted_qualities(lst.concat(["SD"]));
    };


    let seed_desc = true;
    let leech_desc = true;
    let snatch_desc = true;
    let size_desc = true;


    const add_sort_listeners = () => {
        let seed_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].filter(e => e.querySelector("img") != null).find(t => t.querySelector("img").src.includes("seeders.png"));

        seed_th.style.cursor = "pointer";
        seed_th.addEventListener("click", () => {
            if (seed_desc) doms = doms.sort((a, b) => parseInt(a.seeders) < parseInt(b.seeders) ? 1 : -1);
            else doms = doms.sort((a, b) => parseInt(a.seeders) > parseInt(b.seeders) ? 1 : -1);

            seed_desc = !seed_desc;

            document.querySelectorAll(".group_torrent").forEach(d => d.remove());

            doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
        });

        /////////////////////////////////////
        let leech_th = [...document.querySelector("table.torrent_table").querySelectorAll("th.sign")].filter(e => e.querySelector("img") != null).find(t => t.querySelector("img").src.includes("leechers.png"));

        leech_th.style.cursor = "pointer";
        leech_th.addEventListener("click", () => {
            if (leech_desc) doms = doms.sort((a, b) => parseInt(a.leechers) < parseInt(b.leechers) ? 1 : -1);
            else doms = doms.sort((a, b) => parseInt(a.leechers) > parseInt(b.leechers) ? 1 : -1);

            leech_desc = !leech_desc;

            document.querySelectorAll(".group_torrent").forEach(d => d.remove());

            doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
        });

        ////////////////////////////
        let snatch_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].filter(e => e.querySelector("img") != null).find(t => t.querySelector("img").src.includes("snatched.png"));

        snatch_th.style.cursor = "pointer";
        snatch_th.addEventListener("click", () => {
            if (snatch_desc) doms = doms.sort((a, b) => parseInt(a.snatchers) < parseInt(b.snatchers) ? 1 : -1);
            else doms = doms.sort((a, b) => parseInt(a.snatchers) > parseInt(b.snatchers) ? 1 : -1);

            snatch_desc = !snatch_desc;

            document.querySelectorAll(".group_torrent").forEach(d => d.remove());

            doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
        });

        /////////////////////////////////
        let size_th = [...document.querySelector("table.torrent_table").querySelectorAll("th")].find(e => e.textContent === "Size");

        size_th.style.cursor = "pointer";
        size_th.addEventListener("click", () => {

            if (size_desc) doms = doms.sort((a, b) => parseInt(a.size) < parseInt(b.size) ? 1 : -1);
            else doms = doms.sort((a, b) => parseInt(a.size) > parseInt(b.size) ? 1 : -1);

            size_desc = !size_desc;

            document.querySelectorAll(".group_torrent").forEach(d => d.remove());

            doms.forEach(d => document.querySelector("table.torrent_table > tbody").appendChild(d.dom_path));
        });
    };


    let line_example = get_example_div();
    let group_header_example = document.querySelector("tr.group_torrent").cloneNode(true);
    let original_table;


    const mainFunc = async () => {
        if (show_tracker_name) {
            fix_ptp_names();
        }

        let imdb_id;

        try {
            imdb_id = "tt" + document.getElementById("imdb-title-link").href.split("/tt")[1].split("/")[0];
        } catch (e) { // replaced by ratings box script...
            imdb_id = "tt" + [...document.querySelectorAll(".rating")].find(a => a.href.includes("imdb.com")).href.split("/tt")[1].split("/")[0];
        }

        let promises = [];

        trackers.forEach(t => promises.push(fetch_tracker(t, imdb_id)));

        Promise.all(promises)
            .then(torrents_lists => {
                var all_torrents = [].concat.apply([], torrents_lists).sort((a, b) => a.size < b.size ? 1 : -1);

                add_external_torrents(all_torrents);

                document.querySelectorAll(".basic-movie-list__torrent__action").forEach(d => { d.style.marginLeft = "12px"; }); // style fix

                original_table = document.querySelector("table.torrent_table").cloneNode(true);

                if (show_only_ptp_by_default) {
                    show_only_ptp();
                }

                localStorage.setItem("play_now_flag", "true"); // yy
            });
    };


    mainFunc();
})();