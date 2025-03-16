// ==UserScript==
// @name         ANT - Add releases from other trackers
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0
// @description  Add releases from other trackers to ANT
// @author       Audionut
// @match        https://anthelion.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ant-add-filter-all-releases-anut.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ant-add-filter-all-releases-anut.js
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://github.com/Audionut/add-trackers/raw/main/scene_groups.js
// ==/UserScript==

(function () {
    "use strict";

    const trackers = ["RFX", "AITHER", "BHD", "OE", "HDB", "MTV", "LST", "ULCX"];
    const BLU_API_TOKEN = ""; // if you want to use BLU - find your api key here: https://blutopia.cc/users/YOUR_USERNAME_HERE/apikeys
    const TIK_API_TOKEN = ""; // if you want to use TIK - find your api key here: https://cinematik.net/users/YOUR_USERNAME_HERE/apikeys
    const AITHER_API_TOKEN = ""; // if you want to use Aither - find your api key here: https:/aither.cc/users/YOUR_USERNAME_HERE/apikeys
    const HUNO_API_TOKEN = ""; // if you want to use HUNO - find your api key here: https://hawke.uno/users/YOUR_USERNAME_HERE/settings/security#api
    const RFX_API_TOKEN = ""; // if you want to use RFX - find your api key here: https:/reelflix.xyz/users/YOUR_USERNAME_HERE/apikeys
    const OE_API_TOKEN = ""; /// if you want to use OE - find your api key here: https:/onlyencodes.cc/users/YOUR_USERNAME_HERE/apikeys
    const BHD_API_TOKEN = "";
    const BHD_RSS_KEY = "";
    const HDB_USER_NAME = "";
    const HDB_PASS_KEY = "";
    const MTV_API_TOKEN = "";
    const LST_API_TOKEN = "";
    const ANT_API_TOKEN = "";
    const FL_USER_NAME = "";
    const FL_PASS_KEY = "";
    const MTeam_API_TOKEN = "";
    const ULCX_API_TOKEN = "";

    const hideBlankLinks = false;
    const show_tracker_icon = true; // false = will show default green checked icon ||| true = will show tracker logo instead of checked icon
    const show_tracker_name = true; // false = will hide tracker name ||| true = will show tracker name
    const hide_if_torrent_with_same_size_exists = false; // true = will hide torrents with the same file size as existing PTP ones
    const log_torrents_with_same_size = false; // true = will log torrents with the same file size as existing PTP ones in console (F12)
    const hide_filters_div = false; // false = will show filters box ||| true = will hide filters box
    const hide_dead_external_torrents = false; // true = won't display dead external torrents
    const open_in_new_tab = true; // false : when you click external torrent, it will open the page in new tab. ||| true : it will replace current tab.
    let hide_tags = true; // true = will hide all of the tags. Featured, DU, reported, etc.
    const run_by_default = true; // false = won't run the script by default, but will add an "Other Trackers" link under the page title, which when clicked will run the script.
    let ptp_release_name = false; // true = show release name - false = original PTP release style. Ignored if Improved Tags  = true
    let improved_tags = true; // true = Change display to work fully with PTP Improved Tags from jmxd.
    const debug = true;
    const simplediscounts = false;
    const bhdSeeding = false;
    const filterboxlocation = "Below"; //"Above" cover, "Below" cover, "Torrents" above torrents

        let discounts;
        if (simplediscounts) {
            discounts = ["FL", "75%", "50%", "40%", "30%", "25%", "Refund", "Rewind", "Rescue", "Pollin", "None"];
        } else {
            discounts = ["Freeleech", "75% Freeleech", "50% Freeleech", "40% Bonus", "30% Bonus", "25% Freeleech", "Copper", "Bronze", "Silver", "Golden", "Refundable", "Rewind", "Rescuable", "Pollination", "None"];
        }

        let qualities = ["SD", "720p", "1080p", "2160p"];
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
            else if (text.includes("1080p") || text.includes("1080i")) return "1080p";
            else if (text.includes("2160p")) return "2160p";
            else return "SD";
        };

        const get_default_doms = () => {
            [...document.querySelectorAll("tr.torrent_row")].forEach((d, i) => {
                let tracker = "ANT";
                let dom_path = d;
                let quality = dom_get_quality(d.textContent);
                let discount = "None";
                const modifiers = d.querySelectorAll(".torrent_label.tooltip.tl_free");
                modifiers.forEach(modifier => {
                    const text = modifier.textContent.trim().toLowerCase();
                    if (text.includes("freeleech") || text.includes("freeleech!")) {
                        if (simplediscounts) {
                            discount = "FL";
                        } else {
                            discount = "Freeleech";
                        }
                    } else if (text.includes("half-leech") || text.includes("half-leech!")) {
                        if (simplediscounts) {
                            discount = "50%"
                        } else {
                            discount = "50% Freeleech";
                        }
                    }
                });
                let releaseNameElement = d.querySelector('a[data-toggle-target]');
                let releaseName = Array.from(releaseNameElement.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join(" ");
                let groupName = d.closest('strong.tl_notice');
                let info_text = releaseName
                let group_id = groupName
                let seeders = parseInt(d.querySelector("td:nth-child(4)").textContent.replace(",", ""));
                let leechers = parseInt(d.querySelector("td:nth-child(5)").textContent.replace(",", ""));
                let snatchers = parseInt(d.querySelector("td:nth-child(3)").textContent.replace(",", ""));
                let size = d.querySelector("td:nth-child(2)").textContent.trim();

                if (size.includes("TiB")) {
                    size = (parseFloat(size.split(" ")[0]) * 1048576).toFixed(2); // Convert TiB to MiB
                } else if (size.includes("GiB")) {
                    size = (parseFloat(size.split(" ")[0]) * 1024).toFixed(2); // Convert GiB to MiB
                } else if (size.includes("MiB")) {
                    size = parseFloat(size.split(" ")[0]).toFixed(2); // Directly use the MiB value
                } else {
                    size = 1; // Default case when no size unit is provided
                }

                let dom_id = "ant_" + i;

                d.className += " " + dom_id;

                doms.push({ tracker, dom_path, quality, discount, group_id, info_text, seeders, leechers, snatchers, dom_id, size });
            });
        };

        get_default_doms();

        const trackerIcons = {
            "BHD": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABm1BMVEUAAAAZS9cgXc8jYswjY8siYMwgXM8cStogXM8eWNAAAP8hXc8gXM4gWs4laMkfWNAbR9kZStghW8sgW88jYMkhYMsjYssjY8sjY8shYcsiX8sgW8wgWc0ZRtckZ8kjZ8kfWdInacomacoeWtAAAP8hW8shXMwgWM8gWs4XRNYgWcwjY8siYMshXM0ZTNYladEob9Uma80lackma8wnb9QmatQqd+UmbM4laMkmackbYsYeZMcqd+Qqd+YmacodY8ZGe9c4ctMfZcYlacoladInbM4jZ8gfZMcMVsTN1/ijt/IJVMIgZcclaMgmatUob9YSW8UHUsNLftf////8+f8sZdQNV8UUXMYnb9U4b9WzxPTJ1fb19v/s7v/Q2vm6yPc3cNMhZsceYcqtwPH9/v/+/v+ct+obYcciZsgmasomaMkgZscJVMSSreuHp+cHU8IiZscOWcNpk95ok94PWcMPWcSyx/CVru2SrOyyxvEQWcQfZMh0leZIedkMVsMLVsM/dNZzluYhZcgYX8YXX8UkaMgZYMUnbM8ladQQmoZOAAAAL3RSTlMAM6Xn+u+qN5afAsPMkf6dLzSjqefs+fv87OumpzP+/p3+/pcBxsKZlzim+eakMhtflnAAAAD5SURBVHicYwABRiZmFhZWNnYwBwg49A0MjYyMTUw5ucB8bjNzC0sra0sLcxsekAivrR2fhb2Do5OFhbMZPwODgIsrn5u7h6eXt4+br7mfIIOQv6VbQGBQcEhoWLibZYQwg4ihfWRUdExwcGxcfIK9sSiDmHNiUnJwcEpqcHBaeoaROINYZlZ2Tm4wEOTlF2QZSTBIGltYFBaBBIpLLCyMpRikIyzcSsuCyyuCK6vcLAxkGGRNzeWqa2rr6hsam+TNTWUZGBTM7BSbW1ot2lqUMs2UgS5VUTUzb7UAgtZ2MzWI59Q7IoyNnA0N9DVg3tXUkpLQ1tHVA7EB7Jc4ygIVY/MAAAAASUVORK5CYII=",
            "BLU": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACGVBMVEUAAAAAdeIAduMAcdwAZ8UAacQAbMkAefIAdOMAc98AdN4AZsMAZsUAY8MAcdUAc+EAdd8AdN4AZsMAasUAasoAduIAasUAdN8AbMcAeOMAdN4AZ8MAaMcAgOoAct0AaMQAccYAcN0AacQAb90AaMUAcd8AacQAdN8AacUAdeEAasUAdeQAdN8AacQAbMYAceM3keY9i9AAacUAbdsAceMAdOAAacUAcMwAduYActwAacYAa8IAeusAbd8AYsUAbM0Af/MAfO4AdeMAZtuNwPGRvOMAXb8WeM4QedYAatMAgvoAeOcAdN8AcdwAZ9o6keT///9EjtIlbsUzhM7G3PIkgdUAb9kAduMAdeEAcNwIdd0eft/H4PifyO+aw+rD2/AAVrwAYMBtp9wqgtAAZcUAc+IQet8vi+MJdN3d7Pvl7/kAZcIAX78Wc8gQdMwHeuYCb9wAbtzk8Pvq8voIasQlfMsAasouku8VfuAAa9vc6/rg7PgAY8EbdsgCaMMAbc48m/QKeN4AZNlfpulvqNwAXL4AZsIAcNEUhfIsieM2juMyhM4AXr8AcdQAe/ECbtwghOGkyfKjxej8/f4fesoActUAhP0AcN4Aatra6vqJvvB1r+t6rN6EtuHg7PcAZsQAd+AAgfcAduUSfN8CbNuUxPGdxOYDYcAScccAdNoAduEAefMAbeEAYMMAbNUAasYAd+QAc+UAaMt/Lf+4AAAAPHRSTlMAI3/m5H4hE2O+/Pu8YhIzsf79sDBqZUA7JPv5IAzt6gnZ1cG8paGIg29qMPTyLQn+/oUHG56bGTTT0TI1uk9cAAAA+ElEQVR4nGMAA0YmZhZWNgibgYGdg5PLxtbOnpuHlw/I5RcQdHB0cnZxdXP38BQSFmEQ9fL28fXzDwgIDAoOCQ0TYxAPj4iMio6JjYtPSExKTpFgkJRKTUvPyAwIyMrOyc2TlmGQlcv3LygsCggozi4pLZNXYGBQLK+o9KsKCKiuqa2rVwJao9zQ2NQcAAQtrW3tKkAB1Y7OLhA/IKC7p1cNKKDe1z8hIGDipMkBUxKnagAFNKdNnzFz1uw5c+clzl+gBRTQ1lm4aPGSpcuWryhbqasH8ou++qrVawwM165bb2QM9Z6J6YaNm9abmcO8CwQWllbWEBYAex5Hkh1GjloAAAAASUVORK5CYII=",
            "Aither": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACYElEQVQokT2RS2sUQRSFb9169MOZScc8TBQN0Wg2URBB3Sj+ZHe6VhQloAgu1GjMQxMhycx093RXdVfVvS5G3BzO4izOxye2nzwbLq8MlleK9atSaQAAgLacMpFAzEYjW1XT0999284uzl1dqeTSYHRlrVi/lheFSdLOWSYKfddMxgtX1vPFRZ1mKGVvW52mtiyVybLhyuqtra0+hEjUObuytLRzc3PStABwXs/IBJPnebGYF4tn+98VKpWNFs6qmmK8u3H94damkVIiaim7EGrrPh4ej38dp0Mo1q424wsVuq48PTktp6u3bi/kd3Z/HJwcHTWTsdR6YW19e+PG/Y3rddOc7f8wWc5EqmubP3tfB5eXtm5uPn/x8uDDbvReIAKAMubbYHht597Tx4/eVdWfb19cXSlvbfR+4/6Dz58+7b19TSH4zqGUiLKbzVxdt+UUmKU2s4tz7xwyEYWQDoZ7b15F70PfRe+7pumd7W3bNTNblj9339uq9NZSDDIbjRBRJcnF4UHoXOh7jhEA5gkARJFiTIfD6emJrUqpkwQAlEnGx0eh7ykEZgZmgQjMTDTvJs3q87N2MlFM5J2z5TQGP7crBDIAMwMAMIMQKGVbTr1zIIRMB0MhQCDG3kfvmQgAQMC/NQDFIJWS2ri6jsHLvCjm3DpNo/f/rwMzMzETCGGyvG+a3lkAkCbLmTkGj1JKpVFKZmYiZhaIKJVOUiayVUkhUIxKIEqtmYiJAFGnqeJkji6VQqWEELauhBDSmBiCEkJIpaPv575i8EobVCp6j0r1bUsUo/fALLQWQvwFLByUKNhkQJ4AAAAASUVORK5CYII=",
            "RFX": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABm1BMVEUAAAAAAAAAAAAGBgYICAgAAAAAAAAAAAAAAABjY2NpaWkGBgYAAAAAAAA7Ozs/RUQAAAAAAAA8PDxASEcAAAARERHmSlsPGhh4eHgAAAAAAAAAAAAAAAACAgIAAAACAgIAAAAAAAB9fX0AAAAVFRVOTk4eHh4AAABFRUX///9GRkYAAAAMDAwSEhIAAAAVFRUYGBgAAAAAAADCwsLMzMzLy8vGxsbw8PD////Q0NAfHx8cHBzDwsLx+fgmJiYAAAAVFxbb29tSUlIPDw+KiopjY2NIU1Lxi5jFEBTu4+ShoaHR0dGIiIh6g4LqzNDGAAe/AAW7AAD+kp9zhoTIyMi4uLjk5OT+///w3uDHABK/AAD4n6rH2dbW1tafn59sbGzOzs729vYrKyseHh7l8vD9wsrnXV/0iZXh5OTX19cRERHx8fHAzs1camqPn57k4+O3t7fj4+Pg4OAAAQG1tbXa2tqampqVlZWioqKNjY1QUFBtbW1dXV0QEBAjIyMUFBRRUVH9/f0TExOzs7NycnLS0tLPz8/Nzc15eXl4m6f0AAAAM3RSTlMAFliDhVwaDZv5/KMTJfD5MAzv+hSW/qf5Hldpg5WEl1tt/COf/rAR+P77PKu0apWXbihYkh2SAAAA6UlEQVR4nGMAA0YmZhZWNggbCNg5OI1NTM24uHkgfF4+cwtLK2sbC1t+ARBfUMjCwsLO3t4BSAmLAAVEHZ2cXVzt7d3cPcQ8xRkYeCS87O3tvX18/fwDAoOCJRmkQkKBAmEW4RGRUYHRMdIMMrEWcfEJiUnJKalp6RYZsgxymWCB5KzsnNw8i3x5BgXTAqCWQguLomJ7+5JSRQZGJZChsWXl3kCqolKZgUElrMrZpdrevsanVtVcDegOdQ0LTYs6e/t6INUA9o+AVqOFcVNts4VFgzbUrzotrW3tsR26knD/KuvpGxgagZkAsF41tDjKE9wAAAAASUVORK5CYII=",
            "OE": " data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAn/8IM6z/3TKr/1IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADKt/5M5wf//NK3/XQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqqv8MM63//zvF//8zrP+BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADOs/3g6xP//OcH//zKs/6IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAv/8IM63/7je4//85wf//M6z/wiqq/wwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGt/103uf//NK///zm///8zrP/eMKf3IAAAAAAAAAAAAAAAAAAAAAAAAAAANK3/OzGs/2gxrP9ZNKz/WTKs/1YzrP9fM6z/+TSw//8zrP//OLz//zOs//Uxqv85AAAAAAAAAAAAAAAAAAAAADOs/2k8yv//OsL//ze4//83uP//NrX//zOs//0zrP//NK7//zSu//83u///NbT//zKt/1cAAAAAAAAAAAAAAAAAAAAAMav/WDW0//83u///NK7//zSu//8zrP//M6z//Ta1//83uP//N7j//zrC//88yf//M6z/aQAAAAAAAAAAAAAAAAAAAAAwq/86M6z/9ji8//8zrP//NLD//zOs//kzrP9fMqz/VjSs/1kxrP9ZMaz/aDSt/zsAAAAAAAAAAAAAAAAAAAAAAAAAADCv/yAzrP/eOb///zSv//83uf//NK3/XQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKqr/DDOs/8I5wf//N7j//zOt/+45qv8JAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMqz/ojnB//86xP//M63/eQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzrP+BO8X//zOt//8qqv8MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGq/105wP//NKz/lAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMqr/UTOs/t1Av/8IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            "CG": " data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAABMLAAATCwAAAAAAAAAAAAA0NEk1NUU1NUc1NUcuLj4dHSYABQgAWpAAm/cAnvwAnvwAnvwAnvwAnvwAnvwJofwzMzY3Nzc5OTk5OTk1NTUmJiYHBwcAPGAAjuIAnvwAnvwAnvwAnvwAnvwSpfxJuv0kJCUrKysxMTE1NTU1NTUqKioPDw8ALEYAkugQpPwBnvwAnvwAnvwZqPxVvv1bnMIEBAQNDQ0cHBwnJycrKyslJSUVFRUAFCAQbaUwfq0no+wIofwiq/xewv1Qh6gFCQwAUoIAMEwACxIGBgYPDw8VFRUPDw8GBgYABQcAChADDhQWW4RSvf0/aoQSEhIqKioAmPIAhdQAaqkARW4ALUgABgkAAgMAJjwAR3EAVooAVYgBCQ4RKjoWFhYzMzM5OTkAnvwAnvwAnPkAkukhq/wAHzEAIDMAVogAitsAmvUBnvwZbJ0ODg4uLi4zMzM3NzcAnvwAnvwAnvwBnvxOuvoFEhsAPmMAecIAnvwAnvwXp/xEodgDAwMVFRUhISEqKioAnvwAnvwAnvwAnvw6s/wJGiQAPmMAhNIAnvwGoPxGuf1Gkb4AAQIAEx4AAgMLCwsAnvwAnvwAnvwAnvwVpvwbT28BERsAiNk1sv1Svf1kuOoIHisAIDMAS3gAVYgANFMAnvwAnvwAnvwBnvwxsf1QreUECw8BDBMWQFkXQVoCDBIAFCAASnYAesMAmvUAiNkAnvwAnvwBnvwxsf1qxfsrSVoBAQIiIiINDQ0ACQ4AK0QAS3gAc7cAm/cAnvwAnvwAnvwBnvwxsf1qxforSFkXFxc1NTUmJiYLCwsAJDoAV4oAhdQAnPgAnvwAnvwAnvwAnvwwsP1qxforSFkXFxc5OTk1NTUnJycNDQ0AITUAc7gAnvwAnvwAnvwAnvwAnvwur/1qxv0sSVoXFxc5OTk5OTk2NjYpKSkPDw8AGysAba4AnvwAnvwAnvwAnvwAnvxqxv0vTmAVFR01NUg1NUg1NUgzM0UnJzUPDxUAFiMAZ6UAnvwAnvwAnvwAnvwAnvwAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//",
            "FL": " data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAClhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSzVoh8vLSwvLSwvLSwvLSzVoh/Voh/Voh/Voh8vLSwvLSylhCylhCwvLSwvLSyeeyPVoh8vLSwvLSwvLSyeeyPVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSx8ZCbVoh/Voh/Voh9bTCl8ZCbVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh8vLSwvLSwvLSx8ZCbVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh8vLSwvLSwvLSxbTCnVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSxbTCnVoh/Voh/Voh/Voh9bTCnVoh8vLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSwvLSylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCylhCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "HDB": " data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAAAAAAAAAAAAAAAAAAAAAAABwX0r/cF9K/29eSf9wX0r/cF5K/29eSf9wXkr/b19K/3BfSf9wXkr/cF5J/29fSf9vXkr/b15J/29eSf9vXkn/dGNP/3RjTv90Y07/dGRP/3RjTv91Y07/dWNO/3RjTv90Y07/dWNO/3VjTv91Y07/dGRP/3VjT/90Y07/dGNP/3ppVf96aVT/emlU/3ppVP96aVT/emlU/3ppVP96aVT/emlU/3ppVP96aVT/emlU/3ppVP96aVT/emlV/3ppVP+BcVz/fWxW/3dkTf+AcFr/gnBc/4FwW/93ZE3/fm1X/39uWP91Ykv/dmRN/3dkTv95Z1H/f25Z/4FwW/+AcFv/hHJd/5mLef+6saT/iHdi/4VzXv+Id2L/urCk/5aHdP+Sgm//xr60/83Gvf/Jwrn/qZ2O/4FvWf+FdF7/iHdi/4d1Xv+zqJr//fz7/5GAa/+IdmD/kYBr//38+/+soJD/qZyM///////GvbL/xb2x//Hv7f/Y08v/indi/418Z/+Qfmf/tama//Px7/+Vg27/jXpj/5WDbv/z8e7/sKOT/7Cjk//y7+3/j31m/4VyWf+ainb///7+/7qvof+OfGX/mIZw/7uun//18/H/qJiF/6GQfP+omIX/9fPx/7WomP+2qZj/9PHv/6CPev+binT/k4Bp/93Xz//f2tL/l4Rt/6GPeP+9sKD///////Lv7P/v7Oj/8u/s//////+4qpn/vK6f//Xz8P+ol4P/pJN9/52Kc//X0Mb/6OTe/6GPef+ql4H/xrqr//b08v+yoo7/rZuG/7Kijv/29PL/wbSk/8K1pf/19PH/r56I/6qXgf+mk3z/7Ojj/97Wzv+olX7/sqCJ/83Bsv/49vT/taSP/6+dhv+1o47/+Pb0/8i7q//Ju6v/+Pf0/7alkP+xnoj/0ca4///////Bs6H/sqCK/7qokf/Rxbb/9/bz/7+umf+6qJL/v66a//f18//NwLD/yr2s//7////t6eT/8e3p//v6+P/Tx7j/uaeQ/76tmP/FtJ//x7aj/8y8qv/FtJ//xLSf/8W0n//MvKr/x7ai/8a1oP/OwK//1Me3/9HEsv/FtJ//wK2X/8W0n//FtKD/zLum/8u5pP/Jt6H/y7um/8y7pv/Mu6b/ybeh/8u6pP/LuqX/yLag/8i2oP/Jt6D/yrij/8y6pf/Mu6b/zLum/9HBq//Rwaz/0cGs/9LAq//Swav/0cGr/9LBq//Swaz/0sGs/9LAq//Rwaz/0cCs/9LBrP/Swaz/0sGs/9LBq//XxbD/1sWw/9bGsP/XxbD/18Ww/9bFsf/WxbD/1sax/9fGsf/XxbD/1sWw/9bFsf/WxbH/18Ww/9fFsf/XxrD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            "TIK": " data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkOW9HJzpvniU6b3wrOXESAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQ7cSsnOnKdJjpw5SU5b7gnPHOpJzpxrCQ3bSoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAiY6cZUrQX3/Jjpxyyc5b6UqPnbdLEJ+/yQ5b8slOW65JztsGgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACc5b1UmOm/XJztxvik/dqcmOm+1JjpvviU5bv8sQn7/KkB7zipBe50AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkOm9qJzxzryo/eP8qQHj/Kj90oyY6bs8oPnWyK0GB/yAxaNwuRoCVMEiEXwAAAAAAAAAAAAAAAAAAAAAAAAAAJTdvRSc7cb8rQHf/Jz1y/x8xZLsrQHecLEF8niE0aZQlOm/TJThu1h8xZK0cMl4uAAAAAAAAAAAAAAAAAAAAACc7dg0nPHOiIDJk5CEzbf8jM2vWM0uIdDNLh30ySYSaHzBl4yExbv8dLmLELUR5pik9c1AmOW+BAAAAAAAAAAAAAAAAKDtxbCAwZ68rP3m/LkV/wSQ1b80qQXuRNlCOYyk9dqYgMmXqKDxx1Sk9dMEmOm/iJjhxXyc7dg0AAAAAAAAAAEBAgAQxSYWWJzx2vCIzcP8jNW7/LEN9tC5GgWMuRXlOKj92tiY7cscmOW55QECABAAAAAAlOW+zKUB0oDBIgVUAQEAEPFeYLyc7dqkoPHTrMUqH/yk+declOm6rJDdtDh48aREiM2YPAAAAAAAAAAAAAAAAJjlxNic8cvglOG3KHi5hqxYgWVAxR4doLEJ7qic8df8oPXb/JjpxsyQ4cGkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlOG3qIzVx/yAvaf8bK2C6IDJlmCg9dbclOm/DJjpwwiY6cKYlOnCdAAAAAQAAAAAAAAAAAAAAAAAAAAAAAIACJzxyzCY3a+AfL2LZIDJj1iEyZtMoPXWxKkB5ryc5b/UmOm/zJztvpQAAgAIAAAAAAAAAAAAAAAAAAAAAAAAAADFKjB8xSoh8JztxrB8vY+AgMmr/HjBh5Sc8cqonO3HnJjpx/yY7cV8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5GfEIkOW2hIzhryiY6cNQnO3LwJjpypig2ciYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM0R3DyY8c2omOnKmKDlvRwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            "MTV": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABrVBMVEUAAAC5AAC/AAC8AADDAADBAAD/AADVAADRAADNAADMAADJAADCAAC9AADGAADEAADDAADEAADIAAD/AADUAADIAADFAAC9AAC1AACwAACoAACZAADhAADRAADIAADPAADeAADQAAD/AADZAADOAADMAADGAADHAADNAADVAAChAAC4AACnAACcAAC5AAC3AAD/AAC4AACNAACqAAC2AAC/AACoAADMAACxAAC2AAD/AACjAACPAAChAAD/AACxAAC8AACTAACiAACJAACLAACyAADIAACHAADaAACeAACPAACvAADKAACLAACtAACfAACPAACwAACmAACUAACSAAC5AACYAACTAAC4AADYAADKAADKAADoAADtAAD/AAD/AAD/AAD/AADtAAD/AACmAAC3AADMAADJAADEAAC9AAC3AACwAACpAACiAACVAADWAADjAADOAADAAAC9AAC4AAC4AACyAACzAACxAAC3AAD2AAChAACfAACaAACbAACdAACeAACzAACcAACOAACVAACrAACkAACsAACtAACUAACwAACvAACYAACZAACgAABF3XSeAAAAe3RSTlMAFhgiIi0EEhwkKD1cZUg4PD04DAxFcpO71uXbIgsqJRcbEC8vMjY3Mze9XZeDYlwBc8BCFShJBWVbBf2g+QNiXKDT7IJqPHc+3BBsOv1t8KZqh9RlTa4aYQ0rHQsODw4GFh0gq18PS3SQuNTl9/AsCSpBSU9TVldYUhyfbGMXAAAA1klEQVR4nGMAA0YmBgZmIEYAFgYGVhibjZ2Dk4ubh5ePX0BQSJiBQURUTFxCUqq6praurr5BWoZBVk5eQVFJWUVVTV1DU6teG6JNRxdC69XrgygDw0YjYxMGUzNziyZLkICVdXNLqw2DbYudPUTAwKHN0clZs92FwRUiwODW4e7R4NnpxeANFfDp8vXz7w5gYAiECjAEBYeEhoUzMEQAbYmMio6JZbCKi09ITEpOqU9lSEvPyMzKzslt6untrevLy2dgKOAoVC8qLiktKy+vqKxC9jEEAAAB8zELYV8noAAAAABJRU5ErkJggg==",
            "ANT": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAQCAMAAAD6fQULAAABblBMVEUAAABirNpkrdtfrthgrtpesNpisdxgrtlgrdg2irBAkLdYp9Njs9xfrdhfrtmAgIA5irA4ia44ia82h60tgKUAbZKAxv9frtlesdw5h7E4ia8ziKo4ia83iK4gdZVhsN1ertpesNtJtts9hqo5ia84iK45ia44h644iq80hqtdrto6i646iq83ia83iK5Vqv9hrtpfrthesds3h685ia84iq84ibA4ibE3ia87ibE3iq83h69frdlfrtlgrNlAgJ83iK44ia82h643irM5ibEwgKR5zv9dst1AgIA5iq84ia84iK40hqthr9terdk7ibE4i7A4ia02h60sfKBisd1gr9t2xPVltN5frtpertlgr9ter9lfrtpfrtpertlhsNtgn99qw/Nis99z0v9gr9tz0/9Gq9tEptRgr9psxvc5jLM9lb86jbQ+mcNDpdJsxfZmu+o4ia9wzv9rxPVrxPRsx/huyft21/9vzP5mu+mzOFNqAAAAYXRSTlMAIhzGaESxhZg9PB18g6ECXl+ctT4HEvhBJPUP+vwYfop3BxV5ctRozKYpOSNd9wOuwzEzwnzEaI8aRoKTpygIPOxCJWxaFR4EWenSdp3FJzec4kZ/QBpt2oe6f6TumioI4ywrxgAAAKlJREFUeJxjAANGJggNAcyJLKwIHlsSezIHjMPJxc2TwsvHD2ILCAoJi4iKiadKADmSaVIM0jKycvIKikoMyiqqAmrqGumaDBmZWgzaWQw62Tm6uXr6BoZGDMYmpmbmFpZW1gw2tnYM9g6OeTJOzi6ubvkF7gwMHoVZnl7ePgy+RX4gG/wDAoOCGUKKS0Kh1oeFR5SWRcIcE1VeURkNd2dMbFw8wtUJUBoAzXQdbDqMcq4AAAAASUVORK5CYII=",
            "HUNO": " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABRFBMVEUAAAAAs/cAtfgAtPcAtPYAtPMA////gE3gdHridHrkdHrkdHrjdHwAtPUCquvAanPjc3kAtPbhdXsAtPYAtPYAtvkAx/8Als+JZnj/enrnc3njdHrjdHoAtPYASGoAT3fjdHoAtPYATGwATnbjdHoAtPYAtfUAtPkAyf8Al9CLZ3n/enrodHridXrjdHoAtPbjc3kAtfcCquvCanPic3kAtfcAtPgAtPUAtfYAtPUA////n0DhdXvjdHrjdHrkdHric3sAx/8Axf8AxP8Azf//gYT4f4X7gIcAwv8Au/8AwP8Auf0Awf8Aa5okVHPueX75fIHqd37yfILseH/1fYQAvP8Av/8ATnEAUXjxe4HueYAAuPsAWoIAW4LseX/odn3od30Avf8Auv4AbJslVHPweX75fILreH7zfIIAxv//gYX6gIYT1O0uAAAAQXRSTlMAQK3WzYQKCoTN1q1AfuXlflVV260qSfPzSSqt2/NnZ/P0aGj02q8sS/PzSyyv2lJSfOPifD6r1cqBCAiBytWrPsjENTgAAACmSURBVHicYyALMDIxs7CysXNwcnHzgPi8jo5Ozi58/K5ubu7uAgwMgh6eXt4+Xr5+/gGBQcEhQgzCoWEiomLi4RESklLSkVEyDNGeskB9cjGx8kBKIS4eKKAIZCnFxCgDKZW4BAbVxDA1dQ3N8AgtbR3dyCg9Bn2goUkeXskpqWnpGXEhBgwMhpmOTk4uRsZZQGuzTUAOMTUzt7C0sraxtbN3IMtnAHcwH2Ecu0oMAAAAAElFTkSuQmCC",
            "ULCX": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7EAAAOxAGVKw4bAAADRklEQVQ4jV3TTUwcdRiA8ef9z+zODizfXxVKoRhslVRTIkbKpVaNTSs1euhFYzxoPGjqwRhOJmsMBxMRDqYX0oOJ9VATE5uoMW3l0JaC2opiWWJTdGm1UFhYdmfZZXZnXg/Ixef8XH/CfyUSahIJCQE+uqW7/RL7GyLsUtAwZM2NMPd6l6T+/woAqoKInruv8T/SPFofpbPZpfrSOlkXTJOFAr4lLO2rZ+aFJsmpqoiImkRCDSI6tqAtqQwnXEOPV8b+vYB/+sJo78iF0d7FAGmIUWUM++ZWeX58QVtERBMJNYKqnFuhMrnK8c5qagfbyh1vz9o3z14cOciV86+CwMDxz9498V6yQykWFNsSyhW1nH+ribxBRP9e47GIIb6ySfaDpD1/9s7lCNcvvcjwme8YHv+GGxMvjUx/XZwrYYa61wbb4zSl0xxARGX8ru5OexwKAqK2hd4LYFTm3iS/YY3V92uuzMb72akKLKtwyu77ZKCeB+8W2CwGFFttpmwvzwELonEH616BYn8NjYW2R3qNYf1QmokwJCh2P9mvUH1sCevbJeY74+yNCbEM9NhlQ0PBJ3Rs7EAoNzk0uBoEhFLxRL0+A2yiYgFho2va1ktcP1ZHcaNEzWyaGjtdpNTXTG00xL6RIbNlEEQkNCY0pZKNhlYYcdRoYLIhJmbjzqyyVA7ZrIlSazIey60ulY/vCttf66Dp6FenH8bfIq9UMTmxxeUfSh7E8f3wyBcfP30whh2J4Lo2pZghZY50sPB9ir8+nDGzXT4eUxd72Srky2Dj5UK8nJaUCIV8kZnJvpfjOL6FE7MR12LenGyVxeYoKw0O7k0fxct5/Hg1GhMs6hoqaGx0VKhk+opLNpdNKtG0h1G4/0aXLNuoSuMKv2QztM/5RI9WVCi/zZ5JHR6s3R+viaMaLvtsNt7+M4sTe+rnEpG6CMFDlSRBRXZgjC1oCz7PvpO66gy1DvyaDjDPVRENQuzJAlpliA0v/7Tn0z19ywrXTnXLiqqKbFvahvH5La2+VqZnr0VEBeOHWGGI5RjsEHQRVg/XkTzZLN4OQBtgB8Yr3ZJVmP7yjj6QLtGWL1MnBssRvCqX20Pt8o+AJhJqErLN+V9lAIdSSyRDdQAAAABJRU5ErkJggg==",
            "LST": " data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANQAAAJ4AAADeAAAA/wAAAP8AAADeAAAAngAAADUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAlQAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAlQAAAAIAAAAAAAAAAAAAAAAAAAADAAAAwQAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAADBAAAAAwAAAAAAAAAAAAAAkgAAAP8AAAD/AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAD/AAAA/wAAAJIAAAAAAAAAMwUFBf8LCwv/DAwM/gEBAf8AAAD/FhYW/zExMf8KCgr/AAAA/wAAAP8AAAD/BgYG/gsLC/8AAAD/AAAAM5GRkZ729vb///////////9/f3//bm9v/////////////f39/2JiYv8AAAD/AAAA/9vb2//Nzc3/AAAA/wAAAJ6jo6Pe/////5aWlv9xcXH/NDMz/2xsbP9ra2v/PT09////////////AAAA/wAAAP//////2dnZ/wAAAP8AAADeiIiI//////8wMDD/AAAA/wAAAP8AAAD/Ojo6/66urv//////y8vL/wAAAP8AAAD/9PT0/9HR0f8AAAD/AAAA/4eHh///////Pz8//wAAAP8AAAD/fn5+///////u7u7/e3t7/wYGBv8AAAD/AAAA//Pz8//Nzc3/AAAA/wAAAP+hoaHe/////0RERP8AAAD/AAAA/8XFxf//////a2tr/1FRUf9BQUH/MTEx/4GBgf//////8vLy/3h4eP8zMzTe1dXVn/////8uLy7/AAAA/wAAAP9BQUH/7u7u////////////a2tr/2loaP//////7u7u//Hx8f//////vb29nicnJzQQEBD/AAAA/wAAAP4AAAD/AAAA/wMDA/8wMDD/HBwc/wAAAP8AAAD/BgcH/wQEBP4EBAT/BwcH/woKCjMAAAAAAAAAkgAAAP8AAAD/AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAD/AAAA/wAAAJIAAAAAAAAAAAAAAAMAAADBAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAMEAAAADAAAAAAAAAAAAAAAAAAAAAgAAAJUAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAJUAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANQAAAJ4AAADeAAAA/wAAAP8AAADeAAAAngAAADUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
        };

        const get_tracker_icon = (tracker) => {
            return trackerIcons[tracker] || "https://default-favicon.ico"; // Provide a default favicon URL
        };

        const use_api_instead = (tracker) => {
            if (
                (tracker === "BLU") ||
                (tracker === "Aither") ||
                (tracker === "RFX") ||
                (tracker === "OE") ||
                (tracker === "HUNO") ||
                (tracker === "TIK") ||
                (tracker === "LST") ||
                (tracker === "ULCX")
            )
                return true;
            else return false;
        };

        const use_post_instead = (tracker) => {
            if (
              (tracker === "BHD") ||
              (tracker === "HDB") ||
              (tracker === "ANT") ||
              (tracker === "FL")
              ) {
                return true;
            } else {
                return false;
            }
        };

        const goodGroups = () => {
            return [
                "D-Z0N3",
                "Tigole QxR",
                "FraMeSToR",
                "HONE",
                "TAoE",
                "Silence QxR",
                "0xC0",
                "r00t QxR",
                "AI-Raws",
                "3L",
                "3DAccess",
                "CultFilms",
                "BluDragon",
                "AdBlue",
                "EML HDTeam",
                "FTW-HD",
                "de[42]"
                //"ExampleText3"
            ];
        };

        const badGroups = () => {
            return [
                "NOGRP",
                "NoGrp",
                "nogroup",
                "NOGROUP",
                "VC-1",
                "MIXED",
                "Mixed",
                "MiXED",
                "BTN",
                "Unknown",
                "-UNK-"
                //"ExampleText2",
                //"ExampleText3"
            ];
        };

        const get_torrent_objs = async (tracker, html) => {
            const get_dvd_type = (size) => {
                const sizeInGB = size / 1024; // Convert size from MiB to GB
                if (sizeInGB <= 4.7) {
                    return "DVD5";
                } else if (sizeInGB <= 8.5) {
                    return "DVD9";
                } else {
                    return "DVDSET";
                }
            };

            const get_bd_type = (size) => {
                const sizeInGB = size / 1024; // Convert size from MiB to GB
                if (sizeInGB <= 25) {
                    return "BD25";
                } else if (sizeInGB <= 50) {
                    return "BD50";
                //} else if (sizeInGB <= 66) {
                //    return "BD66";
                //} else if (sizeInGB <= 100) {
                //    return "BD100";
                } else {
                    return "BDSET";
                }
            };
            let torrent_objs = [];
            if (tracker === "MTV") {
                try {
                    const torrents = html.querySelectorAll('item');

                    torrents.forEach(torrent => {
                        let torrent_obj = {};

                        const documentTitle = torrent.querySelector('title')?.textContent;
                        if (!documentTitle) {
                            console.error("Missing title information.");
                            return; // Skip this torrent if title information is missing
                        }
                        let infoText = documentTitle;
                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            torrent_obj.datasetRelease = documentTitle;
                            const isInternal = infoText.includes("-hallowed") || infoText.includes("-TEPES") || infoText.includes("-E.N.D") || infoText.includes("-WDYM");
                            torrent_obj.internal = isInternal ? true : false;

                            const sizeElement = torrent.querySelector('size');
                            if (sizeElement) {
                                const sizeValue = sizeElement.textContent;
                                torrent_obj.size = parseInt(parseFloat(sizeValue) / (1024 * 1024)); // Convert size from bytes to MB
                                torrent_obj.api_size = parseInt(sizeValue);
                            } else {
                                console.error("Missing size information.");
                                return; // Skip this torrent if size information is missing
                            }
                            let groupText = "";
                            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                            const badGroupsList = badGroups(); // Get the list of bad group names
                            let matchedGroup = null;
                            let badGroupFound = false;

                            // Check for bad groups
                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                    groupText = ""; // Set groupText to an empty string
                                    break;
                                }
                            }

                            if (!badGroupFound) {
                                // Check for good groups if no bad group was found
                                for (const group of groups) {
                                    if (infoText.includes(group)) {
                                        matchedGroup = group;
                                        break;
                                    }
                                }

                                if (matchedGroup) {
                                    groupText = matchedGroup;
                                    if (improved_tags) {
                                        infoText = infoText.replace(groupText, '').trim();
                                    }
                                } else {
                                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                    if (match) {
                                        groupText = match[1]; // Use match[1] to get the capturing group
                                        groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                        if (improved_tags) {
                                            infoText = infoText.replace(`-${match[1]}`, '').trim();
                                        }
                                    }
                                }
                            }
                            torrent_obj.groupId = groupText;
                                let cleanTheText = infoText;
                                const replaceFullStops = (text) => {

                                    const placeholders = new Map();
                                    let tempText = text;

                                    const keepPatterns = [
                                        /\b\d\.\d\b/g,
                                        /\bDD\d\.\d\b/g,
                                        /\bDDP\d\.\d\b/g,
                                        /\bDD\+\d\.\d\b/g,
                                        /\bTrueHD \d\.\d\b/g,
                                        /\bDTS\d\.\d\b/g,
                                        /\bAC3\d\.\d\b/g,
                                        /\bAAC\d\.\d\b/g,
                                        /\bOPUS\d\.\d\b/g,
                                        /\bMP3\d\.\d\b/g,
                                        /\bFLAC\d\.\d\b/g,
                                        /\bLPCM\d\.\d\b/g,
                                        /\bH\.264\b/g,
                                        /\bH\.265\b/g,
                                        /\bDTS-HD MA \d\.\d\b/g,
                                        /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                    ];

                                    keepPatterns.forEach((pattern, index) => {
                                        tempText = tempText.replace(pattern, (match) => {
                                            const placeholder = `__PLACEHOLDER${index}__`;
                                            placeholders.set(placeholder, match);
                                            return placeholder;
                                        });
                                    });

                                    // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                    tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                    tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                    tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                    tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                    placeholders.forEach((original, placeholder) => {
                                        tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                    });

                                    tempText = tempText
                                        .replace(/DD\+/g, 'DD+ ')
                                        .replace(/DDP/g, 'DD+ ')
                                        .replace(/DoVi/g, 'DV')
                                        .replace(/\(/g, '')
                                        .replace(/\)/g, '')
                                        .replace(/\bhdr\b/g, 'HDR')
                                        .replace(/\bweb\b/g, 'WEB')
                                        .replace(/\bbluray\b/gi, 'BluRay')
                                        .replace(/\bh254\b/g, 'H.264')
                                        .replace(/\bh265\b/g, 'H.265')
                                        .replace(/\b\w/g, char => char.toUpperCase())
                                        .replace(/\bX264\b/g, 'x264')
                                        .replace(/\bX265\b/g, 'x265')
                                        .replace(/\b - \b/g, ' ');

                                    return tempText;
                                };
                            let formatted = "";
                            if (improved_tags) {
                                formatted = replaceFullStops(cleanTheText);
                                if (groupText && groupText.includes("FraMeSToR")) {
                                    if (formatted.includes("DV")) {
                                        formatted = formatted.replace("DV", "DV HDR");
                                    }
                                }
                                let files = parseInt(torrent.querySelector('files').textContent);

                                if (formatted.includes("BluRay") && torrent_obj.size && files > 10) {
                                    const bdType = get_bd_type(torrent_obj.size);
                                    formatted = `${bdType} ${formatted}`;
                                }
                            } else {
                                formatted = infoText;
                            }
                            if (improved_tags) {
                                torrent_obj.info_text = formatted;
                            } else torrent_obj.info_text = documentTitle;

                            const linkElement = torrent.querySelector('link');
                            if (linkElement) {
                                torrent_obj.download_link = linkElement.textContent;
                            } else {
                                console.error("Missing download link.");
                                return;
                            }

                            torrent_obj.snatch = parseInt(torrent.querySelector('attr[name="grabs"]')?.getAttribute('value') || "0");
                            torrent_obj.seed = parseInt(torrent.querySelector('attr[name="seeders"]')?.getAttribute('value') || "0");
                            torrent_obj.leech = parseInt(torrent.querySelector('attr[name="leechers"]')?.getAttribute('value') || "0");

                            const commentsElement = torrent.querySelector('comments');
                            if (commentsElement) {
                                torrent_obj.torrent_page = commentsElement.textContent;
                            } else {
                                console.error("Missing comments link.");
                                return;
                            }

                            torrent_obj.site = "MTV";
                            const discountMTVElement = torrent.querySelector('torznab\\:attr[name="downloadvolumefactor"]');
                            let discountType = "None";
                            if (discountMTVElement) {
                                const discountValue = discountMTVElement.getAttribute('value');
                                const isFreeLeech = discountValue === "0";
                                if (simplediscounts) {
                                    discountType = isFreeLeech ? "FL" : "None";
                                } else {
                                    discountType = isFreeLeech ? "Freeleech" : "None";
                                }
                            }
                            torrent_obj.discount = discountType;
                            torrent_objs.push(torrent_obj);
                        };
                    });
                } catch (error) {
                    console.error("Error processing XML from MTV:", error);
                }
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

                    if (size.includes("TB")) {
                        size = parseInt(parseFloat(size.split("TB")[0]) * 1024 * 1024);
                    } else if (size.includes("GB")) {
                        size = parseInt(parseFloat(size.split("GB")[0]) * 1024);
                    } else if (size.includes("MB")) {
                        size = parseInt(parseFloat(size.split("MB")[0]));
                    } else {
                        size = 1;
                    }

                    torrent_obj.size = size;
                    let releaseName = d.querySelectorAll("td")[1].querySelector("b").textContent.trim();
                    torrent_obj.datasetRelease = releaseName;
                    let groupText = "";
                    const groups = goodGroups();
                    const badGroupsList = badGroups();
                    let matchedGroup = null;
                    let badGroupFound = false;

                    for (const badGroup of badGroupsList) {
                        if (releaseName.includes(badGroup)) {
                            badGroupFound = true;
                            releaseName = releaseName.replace(badGroup, '').trim();
                            groupText = "";
                            break;
                        }
                    }

                    if (!badGroupFound) {
                        for (const group of groups) {
                            if (releaseName.includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }

                        if (matchedGroup) {
                            groupText = matchedGroup;
                            if (improved_tags) {
                                releaseName = releaseName.replace(groupText, '').trim();
                            }
                        } else {
                            const match = releaseName.match(/-(?![^(]*[()[]])[a-zA-Z]([a-zA-Z0-9]*$|[^-]*\([^()]*\)[^-]*)/);
                            if (match) {
                                groupText = match[1];
                                groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                if (improved_tags) {
                                    releaseName = releaseName.replace(`-${match[1]}`, '').trim();
                                }
                            }
                        }
                    }

                    torrent_obj.info_text = releaseName;
                    torrent_obj.groupId = groupText;
                    torrent_obj.site = "CG";
                    torrent_obj.snatch = parseInt(d.querySelector("td:nth-child(6)").textContent);
                    torrent_obj.seed = parseInt(d.querySelector("td:nth-child(7)").textContent);
                    torrent_obj.leech = parseInt(d.querySelector("td:nth-child(8)").textContent);
                    torrent_obj.download_link = [...d.querySelectorAll("a")].find(a => a.href.includes("download.php?id=")).href.replace("passthepopcorn.me", "cinemageddon.net");
                    torrent_obj.torrent_page = [...d.querySelectorAll("a")].find(a => a.href.includes("/details.php?id=")).href.replace("passthepopcorn.me", "cinemageddon.net");
                    torrent_obj.status = d.className.includes("torrenttable_usersnatched") ? "seeding" : "default";

                    const discountImg = [...document.querySelectorAll("img")].find(e => e.alt.includes("bonus"));
                    let discountType = "None";
                    if (discountImg) {
                        const altText = discountImg.alt;
                        if (simplediscounts) {
                            if (altText === "100% bonus") {
                                discountType = "FL";
                            } else if (altText === "30% bonus") {
                                discountType = "30%";
                            } else if (altText === "40% bonus") {
                                discountType = "40%";
                            } else {
                                discountType = "None";
                            }
                        } else {
                            if (altText === "100% bonus") {
                                discountType = "FreeLeech";
                            } else if (altText === "30% bonus") {
                                discountType = "30% Bonus";
                            } else if (altText === "40% bonus") {
                                discountType = "40% Bonus";
                            } else {
                                discountType = "None";
                            }
                        }
                    }
                    torrent_obj.discount = discountType;
                    torrent_objs.push(torrent_obj);
                });
            }
            torrent_objs = torrent_objs.map(e => {
                return { ...e, "quality": get_torrent_quality(e) };
            });
            if (debug) {
                console.log(`${tracker} processed torrent objects`, torrent_objs);
            }
            return torrent_objs;
        };

        const is_movie_exist = (tracker, html) => { // true or false
            if (tracker === "MTV") {
                if (html.querySelector('item') === null) return false;
                else return true;
            }
            else if (tracker === "BLU" || tracker === "Aither" || tracker === "RFX" || tracker === "OE" || tracker === "HUNO" || tracker === "TIK" || tracker === "LST" || tracker === "ULCX") {
                if (html.querySelector(".torrent-search--list__no-result") === null) return true;
                else return false;
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
            else if (tracker === "PxHD") {
                const element = html.querySelector("div.box.pad > h2");

                // Check if element exists
                if (element) {
                    if (element.textContent.includes("did not match anything")) {
                        return false; // Text did not match anything
                    } else {
                        return true; // Text matched something
                    }
                } else {
                    return true; // Element not found
                }
            }
            else if (tracker === "PTP") {
                if (html.querySelector("#no_results_message > div") === null) return true;
                else return false;
            }
        };

        const isTrackerSelected = (tracker) => {
            return GM_config.get(tracker.toLowerCase());
        };

        function clearToken(tracker) {
            const key = `${tracker.toLowerCase()}_token`;
            GM_config.set(key, '');  // Set the token value to an empty string
            GM_config.save();  // Save the changes
        }

        const post_json = async (post_query_url, tracker, postData, timeout = 4000) => {
            const headersMapping = {
                'ANT': {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Host': 'anthelion.me'
                },
                'MTeam': {
                    'x-api-key': MTeam_API_TOKEN,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                // Add more trackers and their headers as needed
            };

            const headers = headersMapping[tracker] || {
                'Content-Type': 'application/json'
            };

            if (debug) {
                console.log(`Headers for ${tracker}`, headers);
            }

            const methodMapping = {
                'TL': 'GET',
                'FL': 'GET',
            };
            const method = methodMapping[tracker] || 'POST';

            // Return a Promise that resolves with the response or rejects on timeout
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`Request timed out after ${timeout}ms`));
                }, timeout);

                GM_xmlhttpRequest({
                    url: post_query_url,
                    method: method,
                    data: JSON.stringify(postData),
                    headers: headers,
                    onload: (res) => {
                        clearTimeout(timer);
                        resolve(res);
                    },
                    onerror: (err) => {
                        clearTimeout(timer);
                        reject(err);
                    },
                    onabort: (err) => {
                        clearTimeout(timer);
                        reject(err);
                    },
                    ontimeout: (err) => {
                        clearTimeout(timer);
                        reject(err);
                    },
                });
            }).then(response => {
                if (response.status === 200) {
                    return JSON.parse(response.responseText);
                } else if (response.status === 404) {
                    const jsonResponse = JSON.parse(response.responseText);
                    if (debug) {
                        console.log(`raw response from ${tracker}`, response.responseText);
                    }
                    return jsonResponse;
                } else if (response.status === 422) {
                    console.log(`Confirmed Auth details incorrect for ${tracker}`);
                    return null;
                } else if (response.status === 502) {
                    console.warn(`502 bad gateway for ${tracker}`);
                    displayAlert(`502 bad gateway for ${tracker}`);
                    return null;
                } else {
                    if (debug) {
                        console.log(`Raw response from ${tracker}`, response.responseText);
                    }
                    console.warn(`Error: ${tracker} HTTP ${response.status} Error.`);
                    displayAlert(`${tracker} returned not ok`);
                    return null;
                }
            }).catch(error => {
                console.error(`Error with request to ${tracker}:`, error);
                return null;
            });
        };

        const fetch_url = async (query_url, tracker) => {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: query_url,
                    method: "GET",
                    onload: (res) => {
                        resolve(res);
                    },
                    onerror: (err) => {
                        reject(err);
                    },
                    onabort: (err) => {
                        reject(err);
                    },
                    ontimeout: (err) => {
                        reject(err);
                    },
                });
            });

            if (response.status === 200) {
                const contentType = response.responseHeaders.match(/content-type: ([^;]+)/i)[1].toLowerCase();
                const parser = new DOMParser();
                let result;

                if (contentType.includes("xml")) {
                    const xmlDoc = parser.parseFromString(response.responseText, "text/xml");

                    if (tracker === "MTV") {
                        if (debug) {
                            const items = parseMTVItems(xmlDoc);
                            if (items.length === 0) {
                                console.log(`No response XML from ${tracker}`, response.responseText);
                            }
                            console.log(`XML array from ${tracker}`, items);
                        }
                        result = xmlDoc;
                    }
                } else {
                    result = parser.parseFromString(response.responseText, "text/html").body;
                }

                return result;
            } else {
                console.warn(`${tracker} Error: HTTP ${response.status} Error.`);
                console.warn(`${tracker} Error: HTTP ${response.responseHeaders} Error.`);
                console.warn(`${tracker} Error: HTTP ${response.responseText} Error.`);
                displayAlert(`${tracker} returned not ok`);
                return null;
            }
        };

        const parseMTVItems = (xmlDoc) => {
            const parseItem = (item) => {
                const getTextContent = (tagName) => item.getElementsByTagName(tagName)[0]?.textContent || "";
                const attributes = Array.from(item.getElementsByTagName('torznab:attr')).reduce((acc, attr) => {
                    acc[attr.getAttribute('name')] = attr.getAttribute('value');
                    return acc;
                }, {});

                return {
                    title: getTextContent('title'),
                    guid: getTextContent('guid'),
                    link: getTextContent('link'),
                    comments: getTextContent('comments'),
                    pubDate: getTextContent('pubDate'),
                    size: getTextContent('size'),
                    files: getTextContent('files'),
                    grabs: getTextContent('grabs'),
                    categories: Array.from(item.getElementsByTagName('category')).map(cat => cat.textContent),
                    description: getTextContent('description'),
                    enclosure: {
                        url: item.getElementsByTagName('enclosure')[0]?.getAttribute('url') || "",
                        length: item.getElementsByTagName('enclosure')[0]?.getAttribute('length') || "",
                        type: item.getElementsByTagName('enclosure')[0]?.getAttribute('type') || ""
                    },
                    torznabAttributes: attributes
                };
            };

            return Array.from(xmlDoc.getElementsByTagName('item')).map(parseItem);
        };

        const generateGUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        let name_url = document.querySelector("div.header > h2 > span").textContent.trim();
        console.log(`name url: ${name_url}`);
        //let yearMatch = name_url.match(/\[\d{4}\]/);
        //let pageYear = yearMatch ? parseInt(yearMatch[0].replace(/\[|\]/g, '')) : null;

        // Check if a valid year was extracted from the page
        //if (!pageYear) {
        //    console.error("No valid year found in page title");
        //    return [];
        //}

        const fetch_tracker = async (tracker, imdb_id, show_name, show_nbl_name, red_name, tvdbId, tvmazeId, timeout = 6000, retryCount = 0) => {
            return new Promise(async (resolve, reject) => {
                const timer = setTimeout(() => {
                    console.warn(`${tracker} is timing out`);
                    displayAlert(`${tracker} is timing out`);
            resolve([]);
        }, timeout);
                let query_url = "";
                let api_query_url = "";
                let post_query_url = "";
                let postData = {};

                if (tracker === "HDB") {
                    post_query_url = "https://hdbits.org/api/torrents";
                    postData = {
                    username: HDB_USER_NAME,
                    passkey: HDB_PASS_KEY,
                    imdb: { id: imdb_id.split("tt")[1] }
                    };
                }
                else if (tracker === "MTV") {
                    query_url = "https://www.morethantv.me/api/torznab?t=search&apikey=" + MTV_API_TOKEN + "&imdbid=" + imdb_id;
                }
                else if (tracker === "ANT") {
                    post_query_url = "https://anthelion.me/api.php?apikey=" + ANT_API_TOKEN + "&t=movie&imdbid="+ imdb_id + "&o=json";
                } else if (tracker === "BHD") {
                    post_query_url = "https://beyond-hd.me/api/torrents/" + BHD_API_TOKEN;
                    postData = {
                        action: "search",
                        rsskey: BHD_RSS_KEY,
                        imdb_id: imdb_id.split("tt")[1],
                        //folder_name: "Stuart.Little.1999.REPACK.BluRay.1080p.DTS-HD.MA.5.1.AVC.REMUX-FraMeSToR",
                        //info_hash: "ab4b2949671cccbe1c64c0a06215d81cee8722b2"
                    };
                } else if (tracker === "BLU") {
                    api_query_url =
                        "https://blutopia.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=3&perPage=100&api_token=" +
                        BLU_API_TOKEN;
                }
                else if (tracker === "TIK") {
                    api_query_url =
                        "https://cinematik.net/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=3&categories[3]=4&categories[4]=5&categories[5]=6&perPage=100&api_token=" +
                        TIK_API_TOKEN;
                }
                else if (tracker === "Aither") {
                    api_query_url =
                        "https://aither.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&perPage=100&api_token=" +
                        AITHER_API_TOKEN;
                }
                else if (tracker === "RFX") {
                    api_query_url =
                        "https://reelflix.xyz/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&perPage=100&api_token=" +
                        RFX_API_TOKEN;
                }
                else if (tracker === "OE") {
                    api_query_url =
                        "https://onlyencodes.cc/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&perPage=100&api_token=" +
                        OE_API_TOKEN;
                }
                else if (tracker === "HUNO") {
                    api_query_url =
                        "https://hawke.uno/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=2&categories[1]=1&perPage=100&api_token=" +
                        HUNO_API_TOKEN;
                } else if (tracker === "LST") {
                    api_query_url =
                        "https://lst.gg/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=6&categories[3]=8&perPage=100&api_token=" +
                        LST_API_TOKEN;
                } else if (tracker === "ULCX") {
                    api_query_url =
                        "https://upload.cx/api/torrents/filter?imdbId=" +
                        imdb_id.split("tt")[1] +
                        "&categories[0]=1&categories[1]=2&categories[2]=6&categories[3]=8&perPage=100&api_token=" +
                        ULCX_API_TOKEN;
                }
                else if (tracker === "FL") {
                    post_query_url = "https://filelist.io/api.php?username=" + FL_USER_NAME + "&passkey=" + FL_PASS_KEY + "&action=search-torrents&type=imdb&query=" + imdb_id;
                }
                else if (tracker === "CG") {
                    query_url = "https://cinemageddon.net/browse.php?search=" + imdb_id + "&orderby=size&dir=DESC";
                }
                else if (tracker === "KG") {
                    query_url = "https://karagarga.in/browse.php?sort=size&search=" + imdb_id + "&search_type=imdb&d=DESC";
                }
                else if (tracker === "PxHD") {
                    query_url = "https://pixelhd.me/torrents.php?groupname=&year=&tmdbover=&tmdbunder=&tmdbid=&imdbover=&imdbunder=&imdbid=" + imdb_id + "&order_by=time&order_way=desc&taglist=&tags_type=1&filter_cat%5B1%5D=1&filterTorrentsButton=Filter+Torrents";
                }
                else if (tracker === "TL") {
                    post_query_url = "https://www.torrentleech.cc/torrents/browse/list/imdbID/"+ imdb_id;
                }
                else if (tracker === "MTeam") {
                    post_query_url = "https://api.m-team.cc/api/torrent/search";
                        postData = {
                            "imdb": imdb_id,
                            "pageSize": "100"
                            //"mode": "adult"
                        };
                }
                else if (tracker === "PTP") {
                    query_url = "https://passthepopcorn.me/torrents.php?imdb=" + imdb_id;
                }
                const performRequest = async () => {
                    if (use_post_instead(tracker) === true) {
                        try {
                            const result = await post_json(post_query_url, tracker, postData, timeout);

                            if (debug) {
                                console.log(`URL for ${tracker}`, post_query_url);
                                console.log(`Post data for ${tracker}`, postData);
                                console.log(`Result from ${tracker}`, result);
                            }

                            clearTimeout(timer); // Clear the timer on successful fetch

                            if (result) {
                                try {
                                    if (result?.results && tracker === "BHD") {
                                        if (result.status_code !== 1) {
                                            console.warn("BHD returned a failed status code");
                                            resolve([]);
                                        }
                                        if (result.total_results === 0) {
                                            console.log("BHD reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            console.log("Data fetched successfully from BHD");
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (result?.data && tracker === "HDB") {
                                        switch (result.status) {
                                            case 1:
                                                console.warn("HDB: Failure (something bad happened)");
                                                resolve([]);
                                                break;
                                            case 4:
                                                console.warn("HDB: Auth data missing");
                                                resolve([]);
                                                break;
                                            case 5:
                                                console.warn("HDB: Auth failed (incorrect username / password)");
                                                resolve([]);
                                                break;
                                            default:
                                                if (result.data.length === 0) {
                                                    console.log("HDB reached successfully but no results were returned");
                                                    resolve([]);
                                                } else {
                                                    console.log("Data fetched successfully from HDB");
                                                    resolve(get_post_torrent_objects(tracker, result));
                                                }
                                        }
                                    } else if (result?.item && tracker === "ANT") {
                                        if (result.item.length === 0) {
                                            console.log("ANT reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            console.log("Data fetched successfully from ANT");
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (result?.torrentList && tracker === "TL") {
                                        if (result.numFound === "0") {
                                            console.log("TL reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            console.log("Data fetched successfully from TL");
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (result && tracker === "FL") {
                                        if (result.length === 0) {
                                            console.log("FL reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            console.log(`Data fetched successfully from ${tracker}`);
                                            resolve(get_post_torrent_objects(tracker, result));
                                        }
                                    } else if (tracker === "MTeam") {
                                        if (result.code !== "0") {
                                            console.warn("M-Team returned a failed status code");
                                            displayAlert(`Too many requests to ${tracker}`);
                                            resolve([]);
                                        } else if (!result.data || !result.data.data || result.data.data.length === 0) {
                                            console.log("M-Team reached successfully but no results were returned");
                                            resolve([]);
                                        } else {
                                            console.log("Data fetched successfully from M-Team");
                                            resolve(get_post_torrent_objects(tracker, result.data.data, null));
                                        }
                                    } else {
                                        console.warn(`Unhandled tracker or response format for ${tracker}`);
                                        resolve([]);
                                    }
                                } catch (processingError) {
                                    console.error(`Error processing result from ${tracker}:`, processingError);
                                    resolve([]);
                                }
                            } else {
                                  console.log(`{tracker} returned a NULL result from post_json`);
                                  resolve([]);
                            }
                        } catch (error) {
                            clearTimeout(timer);
                            console.warn(`Error fetching data from ${tracker}:`, error);
                            resolve([]);
                        }
                    } else if (use_api_instead(tracker) === false) {
                        fetch_url(query_url, tracker)
                            .then(result => {
                                if (debug) {
                                    console.log(`URL for ${tracker}`, query_url);
                                }
                                clearTimeout(timer); // Clear the timer on successful fetch
                                let movie_exist = is_movie_exist(tracker, result);
                                if (movie_exist === false) {
                                    console.log(`${tracker} reached successfully but no results were returned`);
                                    resolve([]);
                                } else {
                                    if (debug) {
                                        console.log(`HTML data from ${tracker}`, result);
                                    }
                                    console.log(`Data fetched successfully from ${tracker}`);
                                    resolve(get_torrent_objs(tracker, result));
                                }
                            })
                            .catch(error => {
                                console.warn(`Error fetching data from ${tracker}:`);
                                //displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]); // Resolve with an empty array if there's an error
                            });
                    } else {
                        fetch(api_query_url)
                            .then(response => {
                                clearTimeout(timer); // Clear the timer on successful fetch
                                if (!response.ok) throw new Error('Failed to fetch data');
                                if (debug) {
                                    console.log(`HTML response from ${tracker}`, response);
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (data.data.length === 0 || data.data === "404") {
                                    if (debug) {
                                    console.log(`Data array from ${tracker}`, data);
                                    }
                                    console.log(`${tracker} reached successfully but no results were returned`);
                                } else {
                                    if (debug) {
                                        console.log(`Data array from ${tracker}`, data.data);
                                    }
                                    console.log(`Data fetched successfully from ${tracker}`);
                                }
                                resolve(get_api_torrent_objects(tracker, data));
                            })
                            .catch(error => {
                                console.warn(`Error fetching data from ${tracker}:`);
                                //displayAlert(`Error fetching data from ${tracker}`);
                                resolve([]);
                            });
                    }
                };

                performRequest();
            });
        };

        let queue = [];
        let isProcessing = false;

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        const processQueue = async () => {
            if (isProcessing) return;
            isProcessing = true;

            while (queue.length > 0) {
                const { tracker, info_hash, resolve, reject } = queue.shift();
                try {
                    const seeding_status = await fetch_seeding_status(tracker, info_hash);
                    resolve(seeding_status);
                } catch (error) {
                    reject(error);
                }
                await delay(100);
            }

            isProcessing = false;
        };

        // This function will add API calls to the queue
        const enqueueSeedingStatus = (tracker, info_hash) => {
            return new Promise((resolve, reject) => {
                queue.push({ tracker, info_hash, resolve, reject });
                processQueue();
            });
        };

        // Original fetch_seeding_status with slight modifications to be used in the queue
        const fetch_seeding_status = async (tracker, info_hash) => {
            const post_query_url = "https://beyond-hd.me/api/torrents/" + BHD_API_TOKEN;
            const postData = {
                action: "search",
                rsskey: BHD_RSS_KEY,
                info_hash: info_hash,
                seeding: 1
            };

            const result = await post_json(post_query_url, tracker, postData);

            if (debug) {
                console.log(`Seeding result from ${tracker}`, result);
            }

            if (result && result.status_code === 1 && result.total_results === 1) {
                return "seeding";  // Return 'seeding' status if valid
            } else {
                return "default";  // Return 'default' if no valid seeding status is found
            }
        };

        const get_post_torrent_objects = async (tracker, postData, isMiniSeries) => {
            let torrent_objs = [];

            if (tracker === "BHD") {  // Process for BHD tracker
                try {
                    // Await the resolved promise from Promise.all, then filter
                    const results = await Promise.all(
                        postData.results.map(async (d) => {
                            const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                            const api_size = parseInt(d.size); // Original size
                            const info_hash = d.info_hash;

                            const originalInfoText = d.name;
                            let infoText = originalInfoText;
                            let groupText = "";

                            // Custom processing logic for BHD
                            if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                                const groups = goodGroups(); // Array of good group names
                                const badGroupsList = badGroups(); // Array of bad group names
                                let matchedGroup = null;
                                let badGroupFound = false;

                                // Remove bad groups if found
                                for (const badGroup of badGroupsList) {
                                    if (infoText.includes(badGroup)) {
                                        badGroupFound = true;
                                        infoText = infoText.replace(badGroup, '').trim();
                                        break;
                                    }
                                }

                                if (!badGroupFound) {
                                    // Check for good groups if no bad group was found
                                    for (const group of groups) {
                                        if (infoText.includes(group)) {
                                            matchedGroup = group;
                                            break;
                                        }
                                    }
                                }

                                if (matchedGroup) {
                                    groupText = matchedGroup;
                                    if (improved_tags) {
                                        infoText = infoText.replace(groupText, '').trim();
                                    }
                                }

                                // Further processing of the infoText
                                const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                if (match) {
                                    groupText = match[1].replace(/[^a-z0-9]/gi, '');
                                    if (improved_tags) {
                                        infoText = infoText.replace(`-${match[1]}`, '').trim();
                                    }
                                }

                                // Handle HDR, DV, and resolution tags
                                const dv = (d.dv === 1);
                                const hdr10 = (d.hdr10 === 1);
                                const hdr10Plus = (d["hdr10+"] === 1);

                                if (hdr10Plus) {
                                    if (infoText.includes("HDR")) {
                                        infoText = infoText.replace("HDR", "HDR10+");
                                    } else if (!infoText.includes("HDR10+")) {
                                        infoText += " HDR10+";
                                    }
                                } else if (hdr10) {
                                    if (infoText.includes("HDR")) {
                                        infoText = infoText.replace("HDR", "HDR10");
                                    } else if (!infoText.includes("HDR10")) {
                                        infoText += " HDR10";
                                    }
                                }

                                // Append DV tag if necessary
                                if (dv) {
                                    if (hdr10Plus && !infoText.includes("DV HDR10+")) {
                                        infoText = "DV HDR10+ " + infoText.replace("HDR10+", "").replace("HDR10", "").replace("DV", "").trim();
                                    } else if (hdr10 && !infoText.includes("DV HDR10")) {
                                        infoText = "DV HDR10 " + infoText.replace("HDR10+", "").replace("HDR10", "").replace("DV", "").trim();
                                    } else if (!infoText.includes("DV")) {
                                        infoText = "DV " + infoText;
                                    }
                                }

                                if (d.commentary === 1) {
                                    infoText = "Commentary " + infoText;
                                }

                                const resolution = d.type;
                                if (resolution) {
                                    let resText = resolution;
                                    const originalResText = resText;

                                    resText = resText.replace(/UHD\s?.{0,3}/, "2160p");
                                    resText = resText.replace(/BD\s?.{0,3}/, "1080p");

                                    if (!infoText.includes(resText)) {
                                        infoText = `${resText} ${infoText}`;
                                    }

                                    if (!infoText.includes(originalResText)) {
                                        infoText = `${originalResText} ${infoText}`;
                                    }
                                    if (!infoText.toLowerCase().includes("remux") && (originalResText.includes("UHD") || originalResText.includes("BD"))) {
                                        infoText = "m2ts " + infoText;
                                    }
                                }
                            }

                            // Additional processing for discounts and time
                            const discounted = d.freeleech === 1 ? "FL" : "None";

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: d.name.replace(/DDP \d\.\d/g, (match) => {
                                    return match.replace(' ', '');
                                }).replace(/ /g, '.'),
                                size: size,
                                info_text: infoText,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.times_completed || 0,
                                seed: d.seeders || 0,
                                leech: d.leechers || 0,
                                download_link: d.download_url || "",
                                torrent_page: d.url || "",
                                discount: discounted,
                                internal: d.internal === 1 ? true : false,
                                status: "default",
                                groupId: groupText,
                                bhd_rating: d.bhd_rating,
                                tmdb_rating: d.tmdb_rating,
                                imdb_rating: d.imdb_rating,
                                year: d.year,
                                type: d.type,
                            };

                            // Call the second API to check the seeding status using info_hash
                            if (bhdSeeding) {
                                if (info_hash) {
                                    console.log("Processing seeding status from BHD, this might take a moment");
                                    const seeding_status = await enqueueSeedingStatus(tracker, info_hash);
                                    torrentObj.status = seeding_status;  // Update the status based on the second API call
                                }
                            }

                            // Map additional properties if necessary
                            const mappedObj = {
                                ...torrentObj,
                                quality: get_torrent_quality(torrentObj),
                            };

                            return mappedObj;
                        })
                    );

                    // After awaiting Promise.all, filter the results to remove any null objects
                    torrent_objs = results.filter(obj => obj !== null);

                } catch (error) {
                    console.error("An error occurred while processing BHD tracker:", error);
                }
            } else if (tracker === "HDB") {
                try {
                    torrent_objs = postData.data.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size

                        const originalInfoText = d.name;
                        let infoText = originalInfoText;
                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                            let groupText = "";
                            const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                            const badGroupsList = badGroups(); // Get the list of bad group names
                            let matchedGroup = null;
                            let badGroupFound = false;

                            // Check for bad groups
                            for (const badGroup of badGroupsList) {
                                if (infoText.includes(badGroup)) {
                                    badGroupFound = true;
                                    infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                    groupText = ""; // Set groupText to an empty string
                                    break;
                                }
                            }

                            if (!badGroupFound) {
                                // Check for good groups if no bad group was found
                                for (const group of groups) {
                                    if (infoText.includes(group)) {
                                        matchedGroup = group;
                                        break;
                                    }
                                }

                                if (matchedGroup) {
                                    groupText = matchedGroup;
                                    if (improved_tags) {
                                        infoText = infoText.replace(groupText, '').trim();
                                    }
                                } else {
                                    const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                    if (match) {
                                        groupText = match[1]; // Use match[1] to get the capturing group
                                        groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                        if (improved_tags) {
                                            infoText = infoText.replace(`-${match[1]}`, '').trim();
                                        }
                                    }
                                }
                            }

                            const id = d.id;
                            const baseURL = 'https://hdbits.org/download.php/';
                            const pageURL = 'https://hdbits.org/details.php?id=';
                            const torrent = d.filename;
                            let releaseName = d.filename.replace(/\.torrent$/, "");

                            if (releaseName.length > 20) {
                                const pattern = /-\w+\.\w{3}$/;
                                const match = releaseName.match(pattern);
                                if (match) {
                                    releaseName = releaseName.substring(0, releaseName.length - match[0].length);
                                }
                            } else {
                                releaseName = d.name;
                            }

                            const pullExtention = releaseName.match(/[^.]+$/);
                            const extention = pullExtention ? pullExtention[0] : null;

                            // Check if web.dl, web-dl, or webdl is present in the infoText
                            const isWebDL = /web.dl|web-dl|webdl/i.test(infoText);
                            let finalReleaseName = releaseName;
                            let webtags = "";
                            if (isWebDL) {
                                const tagsArray = d.tags.filter(tag => !infoText.includes(tag));

                                // Create webTagsArray only if web.dl, web-dl, or webdl is present
                                const webTagsArray = tagsArray.map(tag => `${tag.toLowerCase()}.web.dl`);
                                const tags = webTagsArray.join(' ');
                                webtags = tags;

                                if (tags && improved_tags) {
                                    infoText += ` ${tags}`;
                                }
                            } else {
                                const tagsArray = d.tags.filter(tag => !infoText.includes(tag));
                                const tags = tagsArray.join(' ');

                                if (tags && improved_tags) {
                                    infoText += ` ${tags}`;
                                }
                            }
                            if (improved_tags) {
                                const bdType = get_blu_ray_disc_type(d.size);
                                if (improved_tags && infoText.includes("Blu-ray") && (infoText.includes("1080p") || infoText.includes("2160p"))) {
                                    infoText = `${bdType} ${infoText}`;
                                }
                                const isAudioOnly = d.type_category === 6 ? true : false;
                                if (isAudioOnly) {
                                    infoText = infoText += "Audio Only Track";
                                }
                                if (extention) {
                                    infoText = `${infoText} ${extention}`;
                                }
                                if (!extention && releaseName.includes("Blu-ray") || releaseName.includes("BluRay") || releaseName.includes("BLURAY")) {
                                    let lower = releaseName.toLowerCase();
                                    if (!lower.includes("remux")) {
                                    infoText = "m2ts " + infoText;
                                    }
                                }
                                if (releaseName && releaseName.includes("Blu-ray") || releaseName.includes("BluRay") || releaseName.includes("BLURAY") && (!infoText.includes("Blu-ray"))) {
                                    infoText = infoText += " Blu-ray";
                                }
                            }
                            const isRemux = d.type_medium === 5 ? true : false;
                            const isDisc = d.type_medium === 1 ? true : false;
                            const isCapture = d.type_medium === 4 ? true : false;
                            const isWeb = d.type_medium === 6 ? true : false;
                            const isInternal = d.type_origin === 1 ? true : false;
                            const isDoco = d.type_category === 3 ? true : false;
                            const isTv = d.type_category === 2 ? true : false;
                            const get_hdb_discount = () => {
                                let discountText = "None";

                                if (d.freeleech === "yes") {
                                    discountText = simplediscounts ? "FL" : "Freeleech";
                                } else {
                                    if (isInternal || isRemux || isDisc || isCapture || isTv || isDoco) {
                                        discountText = simplediscounts ? "50%" : "50% Freeleech";
                                    } else if (isWeb && isInternal) {
                                        discountText = simplediscounts ? "25%" : "25% Freeleech";
                                    } else {
                                        discountText = "None";
                                    }
                                }

                                return discountText;
                            };
                            const status = d.torrent_status || "default";

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: releaseName,
                                size: size,
                                info_text: infoText,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.times_completed || 0,
                                seed: d.seeders || 0,
                                leech: d.leechers || 0,
                                download_link: `${baseURL}${torrent}?id=${id}&passkey=${HDB_PASS_KEY}`,
                                torrent_page: `${pageURL}${id}`,
                                discount: d.freeleech === "yes" ? "Freeleech" : "None",
                                internal: isInternal,
                                exclusive: d.type_exclusive === 1 ? true : false,
                                status: status,
                                groupId: groupText,
                                tags: webtags,
                            };

                            const mappedObj = {
                                ...torrentObj,
                                quality: get_torrent_quality(torrentObj), "discount": get_hdb_discount(torrentObj.discount),
                            };

                            return mappedObj;
                        } else {
                          return null;
                        }
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing HDB tracker:", error);
                }
			}
            else if (tracker === "ANT") {
                try {
                    torrent_objs = postData.item.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size

                        let infoText = '';
                        const filesCount = d.fileCount;

                        if (filesCount === 1 && d.files && d.files.length > 0) {
                          infoText = d.files[0].name;
                          const lastDotIndex = infoText.lastIndexOf('.');
                          if (lastDotIndex !== -1) {
                            infoText = infoText.substring(0, lastDotIndex);
                          }
                        } else if (d.fileName) {
                          infoText = d.fileName.replace(/\.\d+\.torrent$/i, '.torrent').replace(/\.torrent$/i, '');
                        }

                        let download = d.link;
                        let cleanedLink = download.replace(/&amp;/g, '&');

                            const torrentObj = {
                                api_size: api_size,
                                datasetRelease: infoText,
                                size: size,
                                info_text: infoText,
                                tracker: tracker,
                                site: tracker,
                                snatch: d.grabs || 0,
                                seed: d.seeders || 0,
                                leech: d.leechers || 0,
                                download_link: cleanedLink || "",
                                torrent_page: d.guid || "",
                                discount: "None",
                                status: "default",
                                groupId: d.releaseGroup,
                            };

                            // Map additional properties if necessary
                            const mappedObj = {
                                ...torrentObj,
                                quality: get_torrent_quality(torrentObj),
                            };
                            return mappedObj;
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing ANT tracker:", error);
                }
            }
            else if (tracker === "TL") {
                try {
                    if (postData.torrentList) {
                        torrent_objs = Object.values(postData.torrentList).map(d => {
                            const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                            const api_size = parseInt(d.size); // Original size

                            const originalInfoText = d.name;
                            let infoText = originalInfoText;
                            if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                              if (!isMiniSeriesFromSpan && /S\d{2}/.test(infoText)) {
                                  return null;
                              } else {
                                  let groupText = "";
                                  const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                                  const badGroupsList = badGroups(); // Get the list of bad group names
                                  let matchedGroup = null;
                                  let badGroupFound = false;

                                  // Check for bad groups
                                  for (const badGroup of badGroupsList) {
                                      if (infoText.includes(badGroup)) {
                                          badGroupFound = true;
                                          infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                          groupText = ""; // Set groupText to an empty string
                                          break;
                                      }
                                  }

                                  if (!badGroupFound) {
                                      // Check for good groups if no bad group was found
                                      for (const group of groups) {
                                          if (infoText.includes(group)) {
                                              matchedGroup = group;
                                              break;
                                          }
                                      }

                                      if (matchedGroup) {
                                          groupText = matchedGroup;
                                          if (improved_tags) {
                                              infoText = infoText.replace(groupText, '').trim();
                                          }
                                      } else {
                                          const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                          if (match) {
                                              groupText = match[1]; // Use match[1] to get the capturing group
                                              groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                              groupText = groupText.replace("Z0N3", "D-Z0N3");
                                              if (improved_tags) {
                                                  infoText = infoText.replace(`-${match[1]}`, '').trim();
                                              }
                                          }
                                      }
                                  }
                                  const id = d.fid;
                                  const down = d.filename;

                                  const match = infoText.match(" TS ");
                                  if (match) {
                                      if (improved_tags) {
                                          infoText = infoText.replace(" TS ", 'CAM_RIP').trim();
                                      }
                                  }
                                  const match1 = infoText.match("HDTS");
                                  if (match1) {
                                      if (improved_tags) {
                                          infoText = infoText.replace("HDTS", 'CAM_RIP').trim();
                                      }
                                  }
                                  const match2 = infoText.match("TELESYNC");
                                  if (match2) {
                                      if (improved_tags) {
                                          infoText = infoText.replace("TELESYNC", 'CAM_RIP').trim();
                                      }
                                  }
                                  const match3 = infoText.match(" CAM ");
                                  if (match2) {
                                      if (improved_tags) {
                                          infoText = infoText.replace(" CAM ", 'CAM_RIP').trim();
                                      }
                                  }
                                  const cat = d.categoryID;
                                  let uhd = "2160p";
                                  let hd = "1080p";
                                  if (cat === 47 || infoText.includes("2160P")) {
                                      if (infoText.includes("2160P")) {
                                          infoText = infoText.replace("2160P", uhd);
                                      } else {
                                          infoText = `${uhd} ${infoText}`;
                                      }
                                  }

                                  if (cat === 13 || infoText.includes("1080P")) {
                                      if (infoText.includes("1080P")) {
                                          infoText = infoText.replace("1080P", hd);
                                      } else {
                                          infoText = `${hd} ${infoText}`;
                                      }
                                  }
                                  let isFL = d.tags;
                                  let discount;
                                  if (isFL.includes("FREELEECH")) {
                                      if (simplediscounts) {
                                          discount = "FL";
                                      } else {
                                          discount = "Freeleech";
                                      }
                                  } else {
                                      discount = "None";
                                  }

                                  const torrentObj = {
                                      api_size: api_size,
                                      datasetRelease: originalInfoText,
                                      size: size,
                                      info_text: infoText,
                                      tracker: tracker,
                                      site: tracker,
                                      snatch: parseInt(d.completed) || 0,
                                      seed: parseInt(d.seeders) || 0,
                                      leech: parseInt(d.Leechers) || 0,
                                      download_link: `https://www.torrentleech.cc/download/${id}/${down}`,
                                      torrent_page: `https://www.torrentleech.cc/torrent/${id}`,
                                      discount: discount,
                                      status: "default",
                                      groupId: groupText,
                                  };

                                  const mappedObj = {
                                      ...torrentObj,
                                      quality: get_torrent_quality(torrentObj),
                                  };

                                  return mappedObj;
                              }
                            } else {
                              return null;
                            }
                        }).filter(obj => obj !== null); // Filter out any null objects
                    }
                } catch (error) {
                    console.error("An error occurred while processing TL tracker:", error);
                }
            }
            else if (tracker === "FL") {
                try {
                    torrent_objs = postData.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024)); // Convert size to MiB
                        const api_size = parseInt(d.size); // Original size
                        let infoText = d.name;
                        if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                          if (!isMiniSeriesFromSpan && /S\d{2}/.test(infoText)) {
                              return null;
                          } else {
                                  let groupText = "";
                                  const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                                  const badGroupsList = badGroups(); // Get the list of bad group names
                                  let matchedGroup = null;
                                  let badGroupFound = false;

                                  // Check for bad groups
                                  for (const badGroup of badGroupsList) {
                                      if (infoText.includes(badGroup)) {
                                          badGroupFound = true;
                                          infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                          groupText = ""; // Set groupText to an empty string
                                          break;
                                      }
                                  }

                                  if (!badGroupFound) {
                                      // Check for good groups if no bad group was found
                                      for (const group of groups) {
                                          if (infoText.includes(group)) {
                                              matchedGroup = group;
                                              break;
                                          }
                                      }

                                      if (matchedGroup) {
                                          groupText = matchedGroup;
                                          if (improved_tags) {
                                              infoText = infoText.replace(groupText, '').trim();
                                          }
                                      } else {
                                          const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                          if (match) {
                                              groupText = match[1]; // Use match[1] to get the capturing group
                                              groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                              groupText = groupText.replace("Z0N3", "D-Z0N3");
                                              if (improved_tags) {
                                                  infoText = infoText.replace(`-${match[1]}`, '').trim();
                                              }
                                          }
                                      }
                                  }
                              const url ="https://filelist.io/details.php?id=";
                              const id = d.id;
                              let isFL = d.freeleech
                              let discount;
                              if (isFL === 1) {
                                  if (simplediscounts) {
                                      discount = "FL";
                                  } else {
                                      discount = "Freeleech";
                                  }
                              } else {
                                  discount = "None";
                              }

                                  const torrentObj = {
                                      api_size: api_size,
                                      datasetRelease: d.name,
                                      size: size,
                                      info_text: infoText,
                                      tracker: tracker,
                                      site: tracker,
                                      snatch: d.times_completed || 0,
                                      seed: d.seeders || 0,
                                      leech: d.leechers || 0,
                                      download_link: d.download_link,
                                      torrent_page: `${url}${id}`,
                                      discount: discount,
                                      internal: d.internal === 1 ? true : false,
                                      double_upload: d.doubleup === 1 ? true : false,
                                      groupId: groupText,
                                  };

                                  // Map additional properties if necessary
                                  const mappedObj = {
                                      ...torrentObj,
                                      quality: get_torrent_quality(torrentObj),
                                  };
                                  return mappedObj;
                              }
                          } else {
                            return null;
                          }
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing FL tracker:", error);
                }
            } else if (tracker === "MTeam") {
                try {
                    torrent_objs = postData.map((d) => {
                        const size = parseInt(d.size / (1024 * 1024));
                        const api_size = parseInt(d.size);

                        const url = "https://kp.m-team.cc/detail/";
                        const id = d.id;

                        const status = d.status || {};
                        const snatch = parseInt(status.timesCompleted) || 0;
                        const seed = parseInt(status.seeders) || 0;
                        const leech = parseInt(status.leechers) || 0;
                        let discount = status.discount || "None";

                        if (discount !== "None") {
                            if (simplediscounts) {
                                if (discount === "FREE") {
                                    discount = "FL";
                                } else if (discount === "PERCENT_50") {
                                    discount = "50%";
                                } else if (discount === "NORMAL") {
                                    discount = "None";
                                }
                            } else {
                                if (discount === "FREE") {
                                    discount = "Freeleech";
                                } else if (discount === "PERCENT_50") {
                                    discount = "50% Freeleech";
                                } else if (discount === "NORMAL") {
                                    discount = "None";
                                }
                            }
                        }

                        let infoText = d.name;

                        let groupText = "";
                        const groups = goodGroups();
                        const badGroupsList = badGroups();
                        let matchedGroup = null;
                        let badGroupFound = false;

                        for (const badGroup of badGroupsList) {
                            if (infoText.includes(badGroup)) {
                                badGroupFound = true;
                                infoText = infoText.replace(badGroup, '').trim();
                                groupText = "";
                                break;
                            }
                        }

                        if (!badGroupFound) {
                            for (const group of groups) {
                                if (infoText.includes(group)) {
                                    matchedGroup = group;
                                    break;
                                }
                            }

                            if (matchedGroup) {
                                groupText = matchedGroup;
                                if (improved_tags) {
                                    infoText = infoText.replace(groupText, '').trim();
                                }
                            } else {
                                const match = infoText.match(/(?:-(?!\.))([a-zA-Z][a-zA-Z0-9]*)$/);
                                if (match) {
                                    groupText = match[1];
                                    groupText = groupText.replace(/[^a-z0-9]/gi, '');
                                    if (improved_tags) {
                                        infoText = infoText.replace(`-${match[1]}`, '').trim();
                                    }
                                }
                            }
                        }

                        const torrentObj = {
                            api_size: api_size,
                            datasetRelease: d.name,
                            size: size,
                            info_text: infoText,
                            tracker: tracker,
                            site: tracker,
                            snatch: snatch,
                            seed: seed,
                            leech: leech,
                            download_link: `https://kp.m-team.cc/download/${id}`,
                            torrent_page: `${url}${id}`,
                            teamId : `${id}`,
                            discount: discount,
                            groupId: groupText,
                        };

                        // Map additional properties if necessary
                        const mappedObj = {
                            ...torrentObj,
                            quality: get_torrent_quality(torrentObj),
                        };
                        return mappedObj;
                    }).filter(obj => obj !== null); // Filter out any null objects
                } catch (error) {
                    console.error("An error occurred while processing M-Team tracker:", error);
                }
            }
            if (debug) {
                console.log(`${tracker} processed torrent objects`, torrent_objs);
            }
            return torrent_objs;
        };

        const get_api_discount = (text, refundable) => {
            let discountText = "";
            if (refundable === true) {
                discountText += "Refundable";
            } else {
                if (text === 0 || text === "0%") {
                    discountText = "None";
                } else if (text === "25%") {
                    discountText = simplediscounts ? "25%" : "25% Freeleech";
                } else if (text === "Copper") {
                    discountText = simplediscounts ? "25% " : "Copper";
                } else if (text === "50%") {
                    discountText = simplediscounts ? "50%" : "50% Freeleech";
                } else if (text === "Bronze") {
                    discountText = simplediscounts ? "50%" : "Bronze";
                } else if (text === "75%") {
                    discountText = simplediscounts ? "75%" : "75% Freeleech";
                } else if (text === "Silver") {
                    discountText = simplediscounts ? "75%" : "Silver";
                } else if (text === "100%") {
                    discountText = simplediscounts ? "FL" : "Freeleech";
                } else if (text === "Golden") {
                    discountText = simplediscounts ? "FL" : "Golden";
                } else {
                    discountText = text + (simplediscounts ? " FL" : " Freeleech");
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

        const get_api_files = (files) => {
            const containerExtensions = ["mkv", "iso", "mpg", "mp4", "avi"]; // List of possible containers you might be looking for

            if (files.length === 1) {
                const singleFileName = files[0].name;
                const lastDotIndex = singleFileName.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    const extension = singleFileName.substring(lastDotIndex + 1).toLowerCase();
                    if (containerExtensions.includes(extension)) {
                        return { extension, filename: singleFileName }; // Return the container and filename
                    } else {
                        return { extension, filename: null };
                    }
                } else {
                    // Handle case where there is no full stop in the name
                    return { extension: null, filename: null };
                }
            } else {
                // If more than one file or no files, return default behavior
                return { extension: null, filename: null };
            }
        };

        const get_blu_ray_disc_type = (size) => {
            const sizeInGB = size / (1024 * 1024 * 1024); // Convert size to GB
            if (sizeInGB <= 25) {
                return "BD25";
            } else if (sizeInGB <= 50) {
                return "BD50";
            //} else if (sizeInGB <= 66) {
            //    return "BD66";
            //} else if (sizeInGB <= 100) {
            //    return "BD100";
            } else {
                return "BDSET";
            }
        };

        const get_api_torrent_objects = (tracker, json) => {
            let torrent_objs = [];

            if (
                tracker === "BLU" ||
                tracker === "TIK" ||
                tracker === "RFX" ||
                tracker === "OE" ||
                tracker === "Aither" ||
                tracker === "HUNO" ||
                tracker === "LST" ||
                tracker === "ULCX"
            ) {
                torrent_objs = json.data.map((element) => {
                    let originalInfoText;

                    if (tracker === "HUNO") {
                      originalInfoText = element.attributes.name ? element.attributes.name.replace(/[()]/g, "") : null;
                    } else if (tracker === "TIK") {
                      originalInfoText = element.attributes.bd_info ? element.attributes.bd_info : (element.attributes.name ? element.attributes.name : null);
                    } else {
                      originalInfoText = element.attributes.name ? element.attributes.name : null;
                    }

                    const parseDiscLabel = (text) => {
                      // Regular expression to match "Disc Label" line
                      const discLabelRegex = /Disc Label:\s*(.*)/;
                      // Extract the "Disc Label" line
                      const match = text.match(discLabelRegex);

                      if (match && match[1]) {
                        return match[1].trim();
                      }
                      return null;
                    };

                    if (tracker === "TIK") {
                      if (originalInfoText) {
                        const parsedText = parseDiscLabel(originalInfoText);
                        if (parsedText) {
                          originalInfoText = parsedText;
                        } else {
                          originalInfoText = element.attributes.name ? element.attributes.name : originalInfoText;
                        }
                      }
                    }
                    let getRelease = originalInfoText;
                    let infoText = originalInfoText;

                    // Check if the info text contains "SxxExx" where "xx" is not known beforehand
                    if (!/S\d{1,2}E\d{1,2}/.test(infoText)) {
                        // If the info text does not contain the pattern, proceed with further processing
                        const files = element.attributes.files || []; // Ensure files is defined
                        const container = get_api_files(files); // Call the function with files as argument
                        const extension = container.extension;
                        let filenaming;
                        if (container.filename != null) {
                                filenaming = container.filename;
                                const lastDotIndex = filenaming.lastIndexOf('.');
                                if (lastDotIndex !== -1) {
                                    filenaming = filenaming.substring(0, lastDotIndex);
                                }
                        } else {
                            filenaming = originalInfoText;
                        }
                        // Step 1: Identify the year
                        const yearMatch = infoText.match(/\((\d{4})\)/);
                        let relevantText = infoText;

                        if (yearMatch) {
                            // Step 2: If a year is found, process only the text after the year
                            const yearIndex = infoText.indexOf(yearMatch[0]) + yearMatch[0].length;
                            relevantText = infoText.substring(yearIndex).trim();
                        }

                        // Step 3: Perform the match on the relevant text
                        let groupText = "";
                        const groups = goodGroups(); // Assuming goodGroups() returns an array of good group names
                        const badGroupsList = badGroups(); // Get the list of bad group names
                        let matchedGroup = null;
                        let badGroupFound = false;

                        // Check for bad groups
                        for (const badGroup of badGroupsList) {
                            if (infoText.includes(badGroup)) {
                                badGroupFound = true;
                                infoText = infoText.replace(badGroup, '').trim(); // Remove the bad group text
                                groupText = ""; // Set groupText to an empty string
                                break;
                            }
                        }

                        if (!badGroupFound) {
                            // Check for good groups if no bad group was found
                            for (const group of groups) {
                                if (infoText.includes(group)) {
                                    matchedGroup = group;
                                    break;
                                }
                            }

                            if (matchedGroup) {
                                groupText = matchedGroup;
                                if (improved_tags) {
                                    infoText = infoText.replace(groupText, '').trim();
                                }
                            } else {
                                // Adjust the regex to correctly capture the desired group
                                const match = relevantText.match(/-\s*([a-zA-Z0-9]+)$/);
                                if (match) {
                                    groupText = match[1]; // Use match[1] to get the capturing group
                                    groupText = groupText.replace(/[()]/g, ' '); // Replace parentheses with spaces
                                    //groupText = groupText.replace(/\[.*?\]/g, '').trim(); // Remove text inside brackets and trim
                                    groupText = groupText.replace(/[^a-z0-9]/gi, ''); // Sanitize to alphanumeric characters
                                    if (improved_tags) {
                                        infoText = infoText.replace(`-${match[0].substring(1)}`, '').trim(); // Remove the matched group
                                    }
                                } else {
                                    groupText = ""; // Explicitly set to an empty string if no match
                                }
                            }
                        }

                        let updatedInfoText = infoText.trim();
                        if (improved_tags) {
                            const region = element.attributes.region;
                            if (region) {
                                const regionRegex = new RegExp(`\\b${region}\\b`, 'gi');
                                updatedInfoText = updatedInfoText.replace(regionRegex, '').trim();
                            }
                            updatedInfoText = updatedInfoText.replace(groupText, '').trim();
                            if (container) {
                                //updatedInfoText = updatedInfoText.replace(/\[.*?\]/g, '').trim();
                                updatedInfoText = `${extension} ${updatedInfoText}`; // Append container to info_text
                                // Add BD type if container is m2ts or iso
                                if (container === "m2ts" || container === "iso") {
                                    const bdType = get_blu_ray_disc_type(element.attributes.size);
                                    if (tracker === "TIK") {
                                        updatedInfoText = `${bdType} Blu-ray ${updatedInfoText}`;
                                    } else {
                                        updatedInfoText = `${bdType} ${updatedInfoText}`;
                                    }
                                }
                            }
                        }

                        const torrentObj = {
                            api_size: parseInt(element.attributes.size),
                            //datasetRelease: filenaming,
                            size: parseInt(element.attributes.size / (1024 * 1024)),
                            info_text: updatedInfoText,
                            tracker: tracker,
                            site: tracker,
                            snatch: element.attributes.times_completed,
                            seed: element.attributes.seeders,
                            leech: element.attributes.leechers,
                            download_link: element.attributes.download_link,
                            torrent_page: element.attributes.details_link,
                            //featured: element.attributes.featured,
                            //internal: element.attributes.internal,
                            //double_upload: element.attributes.double_upload,
                            //refundable: element.attributes.refundable,
                            //personal_release: element.attributes.personal_release,
                            groupId: groupText,
                            distributor: element.attributes.distributor,
                            region: element.attributes.region,
                            //images: imageUrls,
                        };
                        // Mapping additional properties and logging the final torrent objects
                        const mappedObj = { ...torrentObj, "quality": get_torrent_quality(torrentObj), "discount": get_api_discount(torrentObj.discount, torrentObj.refundable, tracker), "internal": get_api_internal(torrentObj.internal), "Featured": get_api_featured(torrentObj.featured) };

                        // Returning the final torrent object if it passes the "SxxExx" check
                        return mappedObj;
                    } else {
                        // If the info text contains the pattern, skip further processing
                        return null; // Return null to filter out this torrent object
                    }
                }).filter(obj => obj !== null); // Filter out the null objects (skipped torrents)
                // Returning the final torrent objects
                if (debug) {
                    console.log(`${tracker} processed torrent objects`, torrent_objs);
                }
                return torrent_objs;
            }
        };

        function insertAfter(newNode, referenceNode) {
            if (referenceNode && referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
            } else {
                console.error("Reference node is undefined or has no parentNode.");
            }
        }

        const get_filtered_torrents = (quality) => {
            let all_trs = [...document.querySelectorAll("tr.sortGroup, tr.torrent_row")];
            all_trs.forEach((tr, index) => {
                //console.log(`Row ${index} text content:`, tr.textContent.trim());
            });
            let filtered_torrents = [];

            if (quality === "SD") {
                let first_idx = all_trs.findIndex((a) => a.textContent.includes("SD"));
                let sliced = all_trs.slice(first_idx + 1, all_trs.length);

                let last_idx = sliced.findIndex((a) => a.className === "sortGroup" && a.textContent.includes("HD/FHD"));
                if (last_idx === -1) last_idx = all_trs.length;
                filtered_torrents = sliced.slice(0, last_idx);

                if (debug) {
                    console.log("SD filtered torrents", filtered_torrents);
                }
            }
            else if (quality === "HD") {
                let first_idx = all_trs.findIndex((a) => a.textContent.includes("HD/FHD") && !a.textContent.includes("Ultra High Definition"));
                let sliced = all_trs.slice(first_idx + 1, all_trs.length);

                let last_idx = sliced.findIndex((a) => a.className === "sortGroup" && a.textContent.includes("UHD"));
                if (last_idx === -1) last_idx = all_trs.length;
                filtered_torrents = sliced.slice(0, last_idx);

                if (debug) {
                    console.log("HD filtered torrents", filtered_torrents);
                }
            }
            else if (quality === "UHD") {
                let first_idx = all_trs.findIndex((a) => a.textContent.includes("UHD"));
                let sliced = all_trs.slice(first_idx + 1, all_trs.length);

                let last_idx = sliced.findIndex((a) => a.className === "sortGroup");
                if (last_idx === -1) last_idx = all_trs.length;
                filtered_torrents = sliced.slice(0, last_idx);

                if (debug) {
                    console.log("UHD filtered torrents", filtered_torrents);
                }
            }

            // part 2 !
            let group_torrent_objs = [];

            filtered_torrents.forEach((t) => {
                try {
                    // Find the <td> element containing the size
                    let sizeSpan = [...t.querySelectorAll("td")].find(s => s.textContent.includes("GiB") || s.textContent.includes("MiB") || s.textContent.includes("TiB"));
                    if (!sizeSpan) {
                        return; // Skip this iteration if no relevant span is found
                    }

                    // Extract the size text directly from the text content
                    let sizeText = sizeSpan.textContent.trim();
                    //console.log(`size text: ${sizeText}`);

                    // Parse the size value and convert to MiB
                    let sizeInMiB;
                    if (sizeText.includes("GiB")) {
                        sizeInMiB = parseFloat(sizeText.split(" ")[0]) * 1024;
                    } else if (sizeText.includes("TiB")) {
                        sizeInMiB = parseFloat(sizeText.split(" ")[0]) * 1048576;
                    } else if (sizeText.includes("MiB")) {
                        sizeInMiB = parseFloat(sizeText.split(" ")[0]);
                    } else {
                        console.error("Unknown size unit in size text: ", sizeText);
                        return; // Skip this iteration if the size unit is unknown
                    }

                    // Round down to an integer value for consistency
                    sizeInMiB = Math.floor(sizeInMiB);

                    // Add the torrent object
                    group_torrent_objs.push({
                        dom_path: t,
                        size: sizeInMiB
                    });

                } catch (e) {
                    console.error("An error has occurred during processing a torrent: ", e);
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
            //console.warn("Getting SIZE div");

            try {
                let div = ptp_torrent_group.find(e => e.size < my_size);
                if (!div) {
                    //console.log("no size div");
                    return false;
                }
                let unique_id = div.dom_path.id.split("torrent")[1];
                //console.log(`unique ID: ${unique_id}`);
                let selector_id = `torrent${unique_id}`;
                return document.getElementById(selector_id);
            } catch (e) {
                console.error('Error occurred:', e);
                return false; // The size is too small, put it at the top of the group.
            }
        };

        const get_ptp_format_size = (size) => {
            // Ensure 'size' is a number. If it's a string, try converting it to a number.
            if (typeof size === 'string') {
                size = parseFloat(size);
            }

            // Check if 'size' is a number after potential conversion. If not, return "N/A".
            if (isNaN(size) || size === null || size === undefined) {
                return "N/A"; // or any default value you prefer
            }

            // Format size based on its magnitude.
            if (size >= 1048576) { // TiB format, where 1 TiB = 1024 GiB = 1048576 MiB
                return (size / 1048576).toFixed(2) + " TiB";
            } else if (size >= 1024) { // GiB format
                return (size / 1024).toFixed(2) + " GiB";
            } else { // MiB format
                return size.toFixed(2) + " MiB";
            }
        };

        const get_element_size = (size) => {
            if (typeof size === 'string') {
                size = parseFloat(size);
            }
            if (isNaN(size) || size === null || size === undefined) {
                return "N/A"; // or any default value you prefer
            }
            const bytes = size * 1024 * 1024;
            return bytes.toLocaleString() + " Bytes";
        };

        const add_as_first = (div, quality) => {
            let all_trs = [...document.querySelectorAll("tr.sortGroup, tr.torrent_row")];
            let first_idx;

            if (quality === "SD") {
                first_idx = all_trs.findIndex((a) => a.textContent.includes("SD"));
            } else if (quality === "HD") {
                first_idx = all_trs.findIndex((a) => a.textContent.includes("HD/FHD") && !a.textContent.includes("UHD"));
            } else if (quality === "UHD") {
                first_idx = all_trs.findIndex((a) => a.textContent.includes("UHD"));
            }

            console.log("First Index:", first_idx);
            console.log("Reference Node:", all_trs[first_idx]);
            if (first_idx !== -1 && all_trs[first_idx]) {
                insertAfter(div, all_trs[first_idx]);
            } else {
                let tbody = document.querySelector(".torrent_table.details > tbody");
                const secondChild = tbody.children[1];
                if (secondChild) {
                    tbody.insertBefore(div, secondChild);
                } else {
                    tbody.appendChild(div);
                }
            }
        };

        const countryCodes = [
            "AFG", "ALB", "DZA", "AND", "AGO", "ARG", "ARM", "AUS", "AUT", "AZE",
            "BHS", "BHR", "BGD", "BRB", "BLR", "BEL", "BLZ", "BEN", "BTN", "BOL",
            "BIH", "BWA", "BRA", "BRN", "BGR", "BFA", "BDI", "CPV", "KHM", "CMR",
            "CAN", "CAF", "TCD", "CHL", "CHN", "COL", "COM", "COG", "CRI", "HRV",
            "CUB", "CYP", "CZE", "DNK", "DJI", "DMA", "DOM", "ECU", "EGY", "SLV",
            "GNQ", "ERI", "EST", "ETH", "FJI", "FIN", "FRA", "GAB", "GMB", "GEO",
            "DEU", "GHA", "GRC", "GRD", "GTM", "GIN", "GNB", "GUY", "HTI", "HND",
            "HUN", "ISL", "IND", "IDN", "IRN", "IRQ", "IRL", "ISR", "ITA", "JAM",
            "JPN", "JOR", "KAZ", "KEN", "KIR", "PRK", "KOR", "KWT", "KGZ", "LAO",
            "LVA", "LBN", "LSO", "LBR", "LBY", "LIE", "LTU", "LUX", "MDG", "MWI",
            "MYS", "MDV", "MLI", "MLT", "MHL", "MRT", "MUS", "MEX", "FSM", "MDA",
            "MCO", "MNG", "MNE", "MAR", "MOZ", "MMR", "NAM", "NRU", "NPL", "NLD",
            "NZL", "NIC", "NER", "NGA", "NOR", "OMN", "PAK", "PLW", "PAN", "PNG",
            "PRY", "PER", "PHL", "POL", "PRT", "QAT", "ROU", "RUS", "RWA", "KNA",
            "LCA", "VCT", "WSM", "SMR", "STP", "SAU", "SEN", "SRB", "SYC", "SLE",
            "SGP", "SVK", "SVN", "SLB", "SOM", "ZAF", "SSD", "ESP", "LKA", "SDN",
            "SUR", "SWE", "CHE", "SYR", "TWN", "TJK", "TZA", "THA", "TLS", "TGO",
            "TON", "TTO", "TUN", "TUR", "TKM", "TUV", "UGA", "UKR", "ARE", "GBR",
            "USA", "URY", "UZB", "VUT", "VEN", "VNM", "YEM", "ZMB", "ZWE"
        ];

        const get_codec = (lower, torrent) => {
            if (lower.includes("x264") || lower.includes("x.264") || lower.includes("x 264")) return "x264 / ";
            else if (lower.includes("x265") || lower.includes("x.265") || lower.includes("x 265")) return "x265 / ";
            else if (lower.includes("h264") || lower.includes("h.264") || lower.includes("avc") || lower.includes("h 264")) return "H.264 / ";
            else if (lower.includes("h265") || lower.includes("h.265") || lower.includes("hevc") || lower.includes("h 265")) return "H.265 / ";
            else if (lower.includes("xvid") || lower.includes("x.vid")) return "XviD / ";
            else if (lower.includes("divx") || lower.includes("div.x")) return "DivX / ";
            else if (lower.includes("mpeg2") || lower.includes("mpeg-2")) return "MPEG2 / ";
            else if (lower.includes("mpeg1") || lower.includes("mpeg-1")) return "MPEG1 / ";
            else if (lower.includes("vc-1")) return "VC-1 / ";

            return null; // skip this info
        };

        const get_disc = (lower, torrent) => {
            if (lower.includes("dvd5") || lower.includes("dvd-5") || lower.includes("dvd 5")) return "DVD5 / ";
            else if (lower.includes("dvd9") || lower.includes("dvd-9") || lower.includes("dvd 9")) return "DVD9 / ";
            else if (lower.includes("bd25") || lower.includes("bd-25") || lower.includes("bd 25") || lower.includes("uhd 25") || lower.includes("uhd25") || lower.includes("uhd-25")) return "BD25 / ";
            else if (lower.includes("bd50") || lower.includes("bd-50") || lower.includes("bd 50") || lower.includes("uhd 50") || lower.includes("uhd50") || lower.includes("uhd-50")) return "BD50 / ";
            else if (lower.includes("bd66") || lower.includes("bd-66") || lower.includes("bd 66") || lower.includes("uhd 66") || lower.includes("uhd66") || lower.includes("uhd-66")) return "BD66 / ";
            else if (lower.includes("bd100") || lower.includes("bd-100") || lower.includes("bd 100") || lower.includes("uhd 100") || lower.includes("uhd100") || lower.includes("uhd-100")) return "BD100 / ";
            else if (lower.includes("dvdset")) return "Disc Set / ";
            else if (lower.includes("bdset")) return "Disc Set / ";

            return null;
        };

        const get_container = (lower, torrent) => {
            if (lower.includes(" avi") || lower.includes(".avi")) return "AVI / ";
            else if (lower.includes(" mpg") || lower.includes(".mpg")) return "MPG / ";
            else if (lower.includes(" mkv") || lower.includes(".mkv")) return "MKV / ";
            else if (lower.includes(" mp4") || lower.includes(".mp4")) return "MP4 / ";
            else if (lower.includes(" vob") || lower.includes(".vob")) return "VOB IFO / ";
            else if (lower.includes(" iso") || lower.includes(".iso")) return "ISO / ";
            else if (lower.includes(" m2ts") || lower.includes(".m2ts")) return "m2ts / ";

            return null;
        };

        const get_source = (lower, torrent) => {
            if (lower.includes("/cam")) return "CAM / ";
            else if (lower.includes("/ts")) return "TS / ";
            else if (lower.includes("/r5")) return "R5 / ";
            else if (lower.includes("vhs")) return "VHS / ";
            else if (lower.includes("web")) return "WEB / ";
            else if (lower.includes("hddvd") || lower.includes("hd-dvd") || lower.includes("hd dvd")) return "HD-DVD / ";
            else if (lower.includes("dvd")) return "DVD / ";
            else if (lower.includes("hdtv") || lower.includes("hd-tv")) return "HDTV / ";
            else if (lower.includes("tv")) return "TV / ";
            else if (lower.includes("bluray") || lower.includes("blu-ray") || lower.includes("blu.ray") || lower.includes("blu ray")) return "Blu-ray / ";

            return null;
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

            return null;
        };

        const get_audio = (lower, torrent) => {
            if (lower.includes("atmos")) return "Dolby Atmos / ";
            else if (lower.includes("dts:x") || lower.includes("dts-x")) return "DTS:X / ";
            else if (lower.includes("mp3")) return "MP3 / ";

            return null;
        };

        const get_hdr = (lower, torrent) => {
            if (lower.includes("dolby vision hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dolby vision hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dolby vision hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dv hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dv hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dv hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr10+ / dv")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("hdr10 / dv")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr / dv")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr dv")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("hdr dovi")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi hdr10+")) return "Dolby Vision / HDR10+ / ";
            else if (lower.includes("dovi hdr10")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi hdr")) return "Dolby Vision / HDR10 / ";
            else if (lower.includes("dovi")) return "Dolby Vision / ";
            else if (lower.includes("dolby vision")) return "Dolby Vision / ";
            else if (lower.includes(" dv ")) return "Dolby Vision / "; // Need spaces or else DVD suddenly has Dolby Vision.
            else if (lower.includes("hdr10+")) return "HDR10+ / ";
            else if (lower.includes("hdr10")) return "HDR10 / ";
            else if (lower.includes("hdr")) return "HDR10 / ";
            //else if (lower.includes("pq10")) return "10bit / ";
            else if (lower.includes("sdr")) return "SDR / ";

            return null;
        };

        const get_remux = (lower, torrent) => {
            if (lower.includes("remux")) return "Remux / ";

            return null;
        }

        const get_bonus = (lower, torrent) => {
            const bonuses = [];
            const anthologyMatch = lower.match(/anthology/);
            const yearMatch = lower.match(/\d{4}/);

            if (anthologyMatch && yearMatch && anthologyMatch.index < yearMatch.index) {
                bonuses.push("Anthology");
            }
            if (lower.includes("cam_rip")) bonuses.push("CAM");
            if (lower.includes("2in1")) bonuses.push("2in1");
            if (lower.includes("3in1")) bonuses.push("3in1");
            if (lower.includes("4in1")) bonuses.push("4in1");
            if (lower.includes("special features")) bonuses.push("Special Features");
            if (lower.includes("special edition")) bonuses.push("Special Edition");
            if (lower.includes("directors cut")) bonuses.push("Directors Cut");
            if (lower.includes("director's cut")) bonuses.push("Directors Cut");
            if (lower.includes("pan & scan")) bonuses.push("Pan & Scan");
            if (lower.includes("hybrid")) bonuses.push("Hybrid");
            if (lower.includes("proper")) bonuses.push("Proper");
            if (lower.includes("skynet edition")) bonuses.push("Skynet Edition");
            if (lower.includes("ultimate cut")) bonuses.push("Ultimate Cut");
            if (lower.includes("ultimate edition")) bonuses.push("Ultimate Edition");
            if (lower.includes("remastered")) bonuses.push("Remastered");
            if (lower.includes("commentary")) bonuses.push("Commentary");
            if (lower.includes("10bit")) bonuses.push("10bit");
            if (lower.includes("35mm")) bonuses.push("35mm");
            if (lower.includes("hfr")) bonuses.push("HFR");
            if (lower.includes("dcp")) bonuses.push("Digital Cinema Package");
            if (lower.includes("open matte")) bonuses.push("Open Matte");
            if (lower.includes("audio only track")) bonuses.push("Audio Only Track");
            if (lower.includes("repack2")) bonuses.push("Repack2");
            else if (lower.includes("repack")) bonuses.push("Repack");
            if (lower.includes("extended edition")) bonuses.push("Extended Edition");
            else if (lower.includes("extended")) bonuses.push("Extended Edition");
            if (lower.includes("half-sbs") || lower.includes("half sbs")) {
                bonuses.push("3D Half SBS");
            }
            else if (lower.includes("half-ou") || lower.includes("half ou")) {
                bonuses.push("3D Half OU");
            }
            else if (lower.includes("3d")) bonuses.push("3D Edition");

            return bonuses.length > 0 ? bonuses.join(" / ") + " / " : null;
        };

        const get_country = (normal, torrent) => {
            const countryCodeMatch = normal.match(/\b[A-Z]{3}\b/g);
            if (countryCodeMatch) {
                const filteredCodes = countryCodeMatch.filter(code => countryCodes.includes(code));
                if (filteredCodes.length > 0) {
                    return filteredCodes.join(' / ') + " / ";
                }
            }

            return null;
        };

        const get_scene = (lower, torrent) => {
            if (lower.includes("scene")) return "Scene / ";

            return null;
        }

        const get_simplified_title = (info_text, torrent) => {
            let lower = info_text.toLowerCase();
            let normal = info_text;

            // required infos: codec (x264 vs) / container (mkv, mp4) / source (dvd, web, bluray) / res (1080p, 720, SD, 1024x768 etc) / Bonus (with commentary, remux, XYZ edition)
            let codec = get_codec(lower, torrent);
            let container = get_container(lower, torrent);
            let source = get_source(lower, torrent);
            let res = get_res(lower, torrent);
            let audio = get_audio(lower, torrent);
            let hdr = get_hdr(lower, torrent);
            let bonus = get_bonus(lower, torrent);
            let country = get_country(normal, torrent);
            let disc = get_disc(lower, torrent);
            let scene = get_scene(lower, torrent);
            let remux = get_remux(lower, torrent);

            const parts = [];

            if (disc) parts.push(disc.trim());
            if (codec) parts.push(codec.trim());
            if (container) parts.push(container.trim());
            if (source) parts.push(source.trim());
            if (res) parts.push(res.trim());
            if (scene) parts.push(scene.trim());
            if (remux) parts.push(remux.trim());
            if (audio) parts.push(audio.trim());
            if (hdr) parts.push(hdr.trim());
            if (bonus) parts.push(bonus.trim());
            if (country) parts.push(country.trim());

            // Use a Set to filter out duplicates
            const uniqueParts = [...new Set(parts)];

            let combined_text = uniqueParts.join(' ').replace(/\s+\/$/, '').trim();

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
            const existing_torrent_sizes = Array.from(document.querySelectorAll("td.number_column.nobr")).map(x => {
                const sizeStr = x.textContent.replace(" GiB", "").replace(/,/g, '');
                return parseInt(sizeStr, 10);
            });
            //console.warn("existing sizes", existing_torrent_sizes);

            let sd_ptp_torrents = get_filtered_torrents("SD").sort((a, b) => a.size < b.size ? 1 : -1);
            let hd_ptp_torrents = get_filtered_torrents("HD").sort((a, b) => a.size < b.size ? 1 : -1);
            let uhd_ptp_torrents = get_filtered_torrents("UHD").sort((a, b) => a.size < b.size ? 1 : -1);
            create_needed_groups(external_torrents);

            // Separate torrents that need album handling (OPS and RED) from others
            const albumTrackers = ["OPS", "RED"];
            const albumGroups = {};
            const nonAlbumTorrents = [];

            external_torrents.forEach(torrent => {
                if (albumTrackers.includes(torrent.site) && torrent.album) {
                    if (!albumGroups[torrent.album]) {
                        albumGroups[torrent.album] = [];
                    }
                    albumGroups[torrent.album].push(torrent);
                } else {
                    nonAlbumTorrents.push(torrent);
                }
            });

            // Handle non-album torrents (maintain existing functionality)
            nonAlbumTorrents.forEach((torrent, i) => {
                let seeders = parseInt(torrent.seed);
                if (hide_dead_external_torrents && parseInt(seeders) === 0) return;

                let group_torrents;
                let ref_div;
                let tracker = torrent.site;
                let dom_id = tracker + "_" + i;
                const group_id = torrent.groupId;

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

                if (improved_tags) {
                    if (typeof sceneGroups !== 'undefined') {
                        if (sceneGroups.includes(torrent.groupId)) {
                            torrent.info_text = "Scene / " + torrent.info_text;
                        }
                    }
                }

                let cln = line_example.cloneNode(true);

                if (improved_tags && show_tracker_name) {
                    if (tracker === "RED" || tracker === "OPS") {
                        cln.querySelector('a[data-toggle-target=]').textContent = `[${torrent.site}] `;
                    } else {
                        cln.querySelector('a[data-toggle-target="torrent"]').textContent = `[${torrent.site}] / ` + get_simplified_title(torrent.info_text) + ' / ' + torrent.groupId;
                    }
                } else if (improved_tags) {
                    if (tracker === "RED" || tracker === "OPS") {
                        cln.querySelector(".torrent-info-link").textContent = ``;
                    } else {
                        cln.querySelector(".torrent-info-link").textContent = get_simplified_title(torrent.info_text);
                    }
                } else if (show_tracker_name) {
                    cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] ` + torrent.info_text;
                } else {
                    cln.querySelector(".torrent-info-link").textContent = torrent.info_text;
                }

                if (!hide_tags) {
                    if (improved_tags) {
                        if (torrent.region != null && torrent.region != false) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-region'>${torrent.region}</span>`;
                        }
                        if (torrent.distributor != null && torrent.distributor != false) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-distributor'>${torrent.distributor}</span>`;
                        }
                        if (torrent.site === "HDB") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                            torrent.exclusive ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--exclusive'>Exclusive</span>" : false;
                        }
                        if (torrent.site === "BHD") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                        }
                        if (torrent.site === "BTN") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                            // enforce styling because it's important
                            torrent.season2 ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--season2' style='font-weight: bold; color: #FF0000'>Season 2</span>" : false;
                            torrent.extras ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--extras'>Extras</span>" : false;
                        }
                        if (torrent.site === "MTV") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>" : false;
                        }
                        if (torrent.site === "BLU" || torrent.site === "Aither" || torrent.site === "RFX" || torrent.site === "OE" || torrent.site === "HUNO" || torrent.site === "LST" || torrent.site === "FL" || tracker === "ULCX") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>DU</span>") : false;
                            get_api_featured(torrent.featured) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>Featured</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--Personal'>Personal Release</span>") : false;
                        }
                        if (torrent.site === "TIK") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__tags torrent-info__tags--internal'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>Emerald</span>") : false;
                            get_api_featured(torrent.featured, torrent.site) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__download-modifier'>Platinum</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='ttorrent-info__tags torrent-info__tags--Personal'>Personal Release</span>") : false;
                        }
                    } else if (!improved_tags) {
                        if (torrent.site === "HDB") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                            torrent.exclusive ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__exclusive' style='font-weight: bold; color: #a14989'>Exclusive</span>" : false;
                        }
                        if (torrent.site === "BHD") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                        }
                        if (torrent.site === "BTN") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #00FF00'>Internal</span>" : false;
                            torrent.season2 ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__season2' style='font-weight: bold; color: #FF0000'>Season 2</span>" : false;
                            torrent.extras ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__season2' style='font-weight: bold; color: #a14989'>Extras</span>" : false;
                        }
                        if (torrent.site === "MTV") {
                            torrent.internal ? cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #2f4879'>Internal</span>" : false;
                        }
                        if (torrent.site === "BLU" || torrent.site === "Aither" || torrent.site === "RFX" || torrent.site === "OE" || torrent.site === "HUNO" || torrent.site === "LST" || torrent.site === "FL" || tracker === "ULCX") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #baaf92'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__DU' style='font-weight: bold; color: #279d29'>DU</span>") : false;
                            get_api_featured(torrent.featured) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Featured' style='font-weight: bold; color: #997799'>Featured</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Personal' style='font-weight: bold; color: #865BE9'>Personal Release</span>") : false;
                        }
                        if (torrent.site === "TIK") {
                            get_api_internal(torrent.internal) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__internal' style='font-weight: bold; color: #baaf92'>Internal</span>") : false;
                            get_api_double_upload(torrent.double_upload) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Emerald' style='font-weight: bold; color: #3FB618'>Emerald</span>") : false;
                            get_api_featured(torrent.featured, torrent.site) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Platinum' style='font-weight: bold; color: #26A69A'>Platinum</span>") : false;
                            get_api_personal_release(torrent.personal_release) ? (cln.querySelector(".torrent-info-link").innerHTML += " / <span class='torrent-info__Personal' style='font-weight: bold; color: #865BE9'>Personal Release</span>") : false;
                        }
                    }
                }
                if (!hide_tags) {
                    if (improved_tags) {
                        const torrentInfoLink = cln.querySelector(".torrent-info-link");
                        if (torrent.discount === "Freeleech" || torrent.discount === "FL" || torrent.discount === "Golden") {
                            torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
                        } else if (torrent.discount === "50% Freeleech" || torrent.discount === "50%" || torrent.discount === "Bronze") {
                            torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
                        } else if (torrent.discount != "None") {
                            torrentInfoLink.innerHTML += ` / <span class='torrent-info__download-modifier'>${torrent.discount}!</span>`;
                        }
                    } else {
                        if (torrent.discount != "None") {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>${torrent.discount}!</span>`;
                        }
                    }
                }
                if (!hide_tags) {
                    if (torrent.reported != null && torrent.reported != false) {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__reported'>Reported</span>`;
                    }
                    if (torrent.trumpable != null && torrent.trumpable != false) {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__trumpable'>Trumpable</span>`;
                    }
                }

                if (torrent.status === "seeding") cln.querySelector("strong.tl_seeding");
                if (torrent.status === "leeching") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-leeching";
                if (torrent.status === "grabbed") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-downloaded";
                if (torrent.status === "snatched") cln.querySelector(".torrent-info-link").className += " torrent-info-link--user-snatched";

                async function fetchDownloadUrl(torrentId, tracker) {
                    try {
                        if (tracker === "MTeam") {
                            const tokenResponse = await fetch(`https://api.m-team.cc/api/torrent/genDlToken?id=${torrentId}`, {
                                method: 'POST',
                                headers: {
                                    'x-api-key': GM_config.get("MTeam_api"),
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json',
                                }
                            });

                            const tokenData = await tokenResponse.json();
                            if (tokenData.code === "0" && tokenData.data) {
                                const downloadUrl = tokenData.data;
                                const linkElement = document.querySelector(`a[data-torrent-id="${torrentId}"]`);

                                if (linkElement) {
                                    linkElement.href = downloadUrl;
                                    linkElement.removeAttribute("onclick");
                                    linkElement.setAttribute('data-download-completed', 'true');
                                    linkElement.click();
                                }
                            } else {
                                console.warn(`Failed to fetch download URL for torrent ID ${torrentId}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`Error fetching download URL for torrent ID ${torrentId}:`, error);
                    }
                }

                let elements = cln.querySelector(".brackets").querySelectorAll("a");

                if (elements.length > 0) {
                    let element;

                    // Find the appropriate element based on hideBlankLinks
                    if (hideBlankLinks === "DL") {
                        element = [...elements].find(a => a.textContent.trim() === "DL");
                    } else if (hideBlankLinks === "Download") {
                        element = [...elements].find(a => a.textContent.trim().toUpperCase() === "DOWNLOAD");
                    } else if (hideBlankLinks === "Spaced") {
                        element = [...elements].find(a => a.textContent.trim() === "DL");
                        if (element) {
                            element.style.paddingRight = "51px";
                        }
                    }

                    // If the element exists, handle both MTeam and RED functionality
                    if (element) {
                        if (tracker === "MTeam") {
                            element.href = torrent.download_link;
                            element.setAttribute('data-torrent-id', torrent.teamId);
                            element.setAttribute('data-tracker', 'MTeam');

                            element.addEventListener('click', function(event) {
                                const downloadCompleted = element.getAttribute('data-download-completed');

                                if (!downloadCompleted) {
                                    event.preventDefault();
                                    const torrentId = element.getAttribute('data-torrent-id');
                                    fetchDownloadUrl(torrentId, 'MTeam'); // Pass 'MTeam' to handle the MTeam case
                                }
                            });
                        } else {
                            element.href = torrent.download_link; // Fallback for other trackers
                        }
                    }
                } else {
                    console.log("No elements found matching the criteria.");
                }

                let api_sized = torrent.api_size;
                const ptp_format_size = get_ptp_format_size(torrent.size);

                const element_size = get_element_size(torrent.size);

                if (api_sized !== undefined && api_sized !== null) {
                    api_sized = api_sized.toLocaleString() + " Bytes";
                }

                cln.querySelector(".number_column.nobr").textContent = ptp_format_size;

                const byteSizedTrackers = ["BLU", "Aither", "OE", "HUNO", "TIK", "TVV", "BHD", "HDB", "MTV", "LST", "ANT", "FL", "MTeam", "RFX", "ULCX"];
                if (byteSizedTrackers.includes(torrent.site)) {
                    cln.querySelector(".number_column.nobr").setAttribute("title", api_sized);
                } else {
                    cln.querySelector(".number_column.nobr").setAttribute("title", element_size);
                }
                cln.querySelector("td:nth-child(3)").textContent = torrent.snatch; // snatch
                cln.querySelector("td:nth-child(4)").textContent = torrent.seed; // seed

                if (torrent.seed === 0) {
                    cln.querySelector("td:nth-child(4)").className = "no-seeders";
                }

                cln.querySelector("td:nth-child(5)").textContent = torrent.leech; // leech
                cln.querySelector('a[data-toggle-target="torrent"]').href = torrent.torrent_page;
                cln.className += " " + dom_id;
                cln.id += " " + dom_id;
                if (torrent?.datasetRelease) {
                    if (cln?.dataset?.releasename) {
                        cln.dataset.releasename += torrent.datasetRelease;
                    } else {
                        cln.dataset.releasename = torrent.datasetRelease;
                    }
                } else if (torrent.info_text && cln.dataset.releasename) {
                    cln.dataset.releasename += `[${torrent.site}] ` + torrent.info_text;
                } else if (torrent.info_text) {
                    cln.dataset.releasename = `[${torrent.site}] ` + torrent.info_text;
                }

                //if (improved_tags && cln?.dataset?.releasename) {
                //    cln.dataset.releasename = cln.dataset.releasename.replace(/\./g, ' ');
                //}
                if (group_id && cln.dataset.releasegroup) {
                    cln.dataset.releasegroup += group_id;
                } else if (group_id || group_id === "") {
                    cln.dataset.releasegroup = group_id;
                }

                if (open_in_new_tab) cln.querySelector('a[data-toggle-target="torrent"]').target = "_blank";

                if (show_tracker_icon) {
                    cln.querySelector("img").src = get_tracker_icon(torrent.site);
                    cln.querySelector("img").title = torrent.site;
                }

                if (ref_div !== false) {
                    insertAfter(cln, ref_div);
                } else {
                    add_as_first(cln, torrent.quality);
                }

                let dom_path = cln;
                let quality = dom_get_quality(torrent.info_text);
                let discount = torrent.discount;
                let info_text = torrent.info_text;
                let leechers = parseInt(torrent.leech);
                let snatchers = parseInt(torrent.snatch);
                let size = torrent.size;

                doms.push({ tracker, dom_path, quality, discount, info_text, group_id, seeders, leechers, snatchers, dom_id, size });
            });

            // Handle album torrents (for OPS and RED)
            Object.keys(albumGroups).forEach(album => {
                // Insert the album header
                let headerDiv = get_group_header_div(album);
                insert_group(album, headerDiv);

                // Insert torrents for the current album
                albumGroups[album].forEach((torrent, i) => {
                    let group_torrents;
                    //let ref_div;
                    let tracker = torrent.site;
                    let dom_id = tracker + "_" + i;
                    const group_id = torrent.groupId;
                    let seeders = parseInt(torrent.seed);
                    if (hide_dead_external_torrents && parseInt(seeders) === 0) return;

                    let ref_div = get_ref_div(torrent, soundtrack_ptp_torrents); // Example of sorting under soundtrack
                    let cln = line_example.cloneNode(true);

                    if (improved_tags && show_tracker_name) {
                        cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] `;
                    } else if (improved_tags) {
                        cln.querySelector(".torrent-info-link").textContent = ``;
                    } else if (show_tracker_name) {
                        cln.querySelector(".torrent-info-link").textContent = `[${torrent.site}] ` + torrent.info_text;
                    } else {
                        cln.querySelector(".torrent-info-link").textContent = torrent.info_text;
                    }

                    // Improved tags for RED/OPS
                    if (improved_tags && (torrent.site === "RED" || torrent.site === "OPS")) {
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-media'>${torrent.media}</span>`;
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-format'>${torrent.format}</span>`;
                        cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-encoding'>${torrent.encoding}</span>`;
                        if (torrent.title) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-title'>${torrent.title}</span>`;
                        }
                        if (torrent.year !== null) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-year'>${torrent.year}</span>`;
                        }
                        if (torrent.log !== 0) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-log'>${torrent.log}%</span>`;
                        }
                        if (torrent.hasCue !== false) {
                            cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__tags-cue'>Cue</span>`;
                        }
                    }

                    // Handle Freeleech, Half-leech, and other discounts
                    if (!hide_tags) {
                        const torrentInfoLink = cln.querySelector(".torrent-info-link");
                        if (improved_tags) {
                            if (torrent.discount === "Freeleech" || torrent.discount === "FL" || torrent.discount === "Golden") {
                                torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>Freeleech!</span>";
                            } else if (torrent.discount === "50% Freeleech" || torrent.discount === "50%" || torrent.discount === "Bronze") {
                                torrentInfoLink.innerHTML += " / <span class='torrent-info__download-modifier torrent-info__download-modifier--half'>Half-leech!</span>";
                            } else if (torrent.discount != "None") {
                                torrentInfoLink.innerHTML += ` / <span class='torrent-info__download-modifier'>${torrent.discount}!</span>`;
                            }
                        } else {
                            if (torrent.discount != "None") {
                                cln.querySelector(".torrent-info-link").innerHTML += ` / <span class='torrent-info__download-modifier torrent-info__download-modifier--free'>${torrent.discount}!</span>`;
                            }
                        }
                    }

                    // Set size, snatch, seed, leech values
                    cln.querySelector(".size-span").textContent = get_ptp_format_size(torrent.size);
                    cln.querySelector("td:nth-child(3)").textContent = torrent.snatch; // snatch
                    cln.querySelector("td:nth-child(4)").textContent = torrent.seed; // seed
                    cln.querySelector("td:nth-child(5)").textContent = torrent.leech; // leech
                    cln.querySelector(".link_3").href = torrent.torrent_page;
                    cln.className += " " + dom_id;
                    cln.id += " " + dom_id;
                    if (torrent?.datasetRelease) {
                        if (cln?.dataset?.releasename) {
                            cln.dataset.releasename += torrent.datasetRelease;
                        } else {
                            cln.dataset.releasename = torrent.datasetRelease;
                        }
                    } else if (torrent.info_text && cln.dataset.releasename) {
                        cln.dataset.releasename += `[${torrent.site}] ` + torrent.info_text;
                    } else if (torrent.info_text) {
                        cln.dataset.releasename = `[${torrent.site}] ` + torrent.info_text;
                    }

                    cln.querySelector(".size-span").setAttribute("title", torrent.size);
                    if (group_id && cln.dataset.releasegroup) {
                        cln.dataset.releasegroup += group_id;
                    } else if (group_id || group_id === "") {
                        cln.dataset.releasegroup = group_id;
                    }

                    if (open_in_new_tab) cln.querySelector(".link_3").target = "_blank";

                    if (show_tracker_icon) {
                        cln.querySelector("img").src = get_tracker_icon(torrent.site);
                        cln.querySelector("img").title = torrent.site;
                    }

                    // Handle the download link based on the tracker
                    let elements = cln.querySelector(".brackets").querySelectorAll("a");
                    if (elements.length > 0) {
                        let element;
                        if (hideBlankLinks === "DL") {
                            element = [...elements].find(a => a.textContent.trim() === "DL");
                        } else if (hideBlankLinks === "Download") {
                            element = [...elements].find(a => a.textContent.trim().toUpperCase() === "DOWNLOAD");
                        } else if (hideBlankLinks === "Spaced") {
                            element = [...elements].find(a => a.textContent.trim() === "DL");
                            if (element) {
                                element.style.paddingRight = "51px";
                            }
                        }

                        // Handle specific tracker download links
                        if (element) {
                            if (torrent.site === "RED") {
                                element.href = torrent.download_link;
                                element.setAttribute('data-torrent-id', torrent.redId);
                                element.setAttribute('data-tracker', 'RED');
                                element.addEventListener('click', function(event) {
                                    const downloadCompleted = element.getAttribute('data-download-completed');
                                    if (!downloadCompleted) {
                                        event.preventDefault();
                                        const torrentId = element.getAttribute('data-torrent-id');
                                        fetchDownloadUrl(torrentId, 'RED');
                                    }
                                });
                            } else if (torrent.site === "OPS") {
                                element.href = torrent.download_link;
                                element.setAttribute('data-torrent-id', torrent.opsId);
                                element.setAttribute('data-tracker', 'OPS');
                                element.addEventListener('click', function(event) {
                                    const downloadCompleted = element.getAttribute('data-download-completed');
                                    if (!downloadCompleted) {
                                        event.preventDefault();
                                        const torrentId = element.getAttribute('data-torrent-id');
                                        fetchDownloadUrl(torrentId, 'OPS');
                                    }
                                });
                            } else {
                                element.href = torrent.download_link; // Fallback for other trackers
                            }
                        }
                    } else {
                        console.log("No elements found matching the criteria.");
                    }
                    const groupTorrent = cln.querySelector('.torrent-info-link');
                    let newHtml = groupTorrent.outerHTML;

                    if (torrent.time && torrent.time !== "None") {
                        if (groupTorrent) {
                            newHtml += `<span class='release time' title="${torrent.time}"></span>`;
                        }
                    }
                    // Append the cloned row to the DOM
                    if (ref_div !== false) {
                        insertAfter(cln, ref_div);
                    } else {
                        add_as_first(cln, torrent.quality);
                    }

                    doms.push({
                        tracker: torrent.site, dom_path: cln, quality: torrent.quality, discount: torrent.discount,
                        info_text: torrent.info_text, group_id: torrent.groupId, seeders, leechers: torrent.leech,
                        snatchers: torrent.snatch, dom_id: torrent.site + "_" + i, size: torrent.size
                    });
                });
            });

            console.log("Finished adding releases for other scripts");
            const event = new CustomEvent('PTPAddReleasesFromOtherTrackersComplete');
            document.dispatchEvent(event);

            let reduced_trackers = get_reduced_trackers(doms);
            let reduced_discounts = get_reduced_discounts(doms);
            let reduced_qualities = get_reduced_qualities(doms);

            if (!hide_filters_div) {
                add_filters_div(reduced_trackers, reduced_discounts, reduced_qualities);
                // disable_highlight()
                //add_sort_listeners();
            }
        };

        const insert_group = (quality, header_div) => {
            let all_trs = [...document.querySelector("#torrent-table > tbody").querySelectorAll("tr.group_torrent")];
            let tbody = document.querySelector("#torrent-table > tbody");

            if (quality === "HD") {
                let idx = -2; // add_after_this_index

                for (let i = 0; i < all_trs.length; i++) {
                    if (all_trs[i].textContent.includes("Other") || all_trs[i].textContent.includes("Ultra High Definition") || all_trs[i].textContent.includes("Soundtrack")) {
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
                    if (all_trs[i].textContent.includes("Other") || all_trs[i].textContent.includes("Soundtrack")) {
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

        const get_group_header_div = (quality) => {
            let tr = document.createElement("tr");
            tr.className = "sortGroup";

            let td = document.createElement("td");
            td.colSpan = "5";
            td.textContent = quality;

            tr.appendChild(td);

            return tr;
        };

        const create_needed_groups = (torrents) => {
            let all_trs = [...document.querySelector("#torrent_details > tbody").querySelectorAll("tr.sortGroup")];
            let tbody = document.querySelector("#torrent_details > tbody");

            if (torrents.find(e => e.quality === "SD") != undefined && all_trs.find(d => d.textContent.includes("SD")) === undefined) {
                let group_header_example = get_group_header_div("SD");
                if (group_header_example) {
                    // Find the second child
                    const secondChild = tbody.children[1];
                    if (secondChild) {
                        // Insert as the second child
                        tbody.insertBefore(group_header_example, secondChild);
                    } else {
                        // If no second child, append as the last child
                        tbody.appendChild(group_header_example);
                    }
                } else {
                    console.error("Group header example for SD not found.");
                }
            }

            if (torrents.find(e => e.quality === "HD") != undefined &&
                all_trs.find(d => d.textContent.includes("HD/FHD") && !d.textContent.includes("Ultra High Definition")) === undefined) {
                let group_header_example = get_group_header_div("HD/FHD");
                if (group_header_example) {
                    insert_group("HD", group_header_example);
                } else {
                    console.error("Group header example for HD not found.");
                }
            }

            if (torrents.find(e => e.quality === "UHD") != undefined && all_trs.find(d => d.textContent.includes("UHD")) === undefined) {
                let group_header_example = get_group_header_div("UHD");
                if (group_header_example) {
                    insert_group("UHD", group_header_example);
                } else {
                    console.error("Group header example for UHD not found.");
                }
            }
        };

        const fix_doms = () => {
            doms.forEach((d) => {
                // Find the element with class 'group_torrent' that also has a class matching d.dom_id
                const targetElement = [...document.querySelectorAll(".group_torrent")].find(e =>
                    e.classList.contains(d.dom_id)
                );
                // Update the dom_path property
                d.dom_path = targetElement;
            });
        };

        const filter_torrents = () => {
            let any_include = false;
            let any_exclude = false;
            let empties = [...document.querySelectorAll("tr.empty-row")];

            doms.forEach((e, index) => {
                let include_tracker = true;
                let include_discount = true;
                let include_quality = true;
                let include_text = true;
                if (debug) {
                    console.log(`Processing dom element ${index + 1}`, e);
                }

                let tracker_status = filters.trackers.find(d => d.name === e.tracker)?.status;
                if (tracker_status === "include") {
                    include_tracker = true;
                    any_include = true;
                } else if (tracker_status === "exclude") {
                    include_tracker = false;
                    any_exclude = true;
                } else {
                    include_tracker = filters.trackers.filter(d => d.status === "include").length === 0;
                }

                let discount_status = filters.discounts.find(d => d.name === e.discount)?.status;
                if (discount_status === "include") {
                    include_discount = true;
                    any_include = true;
                } else if (discount_status === "exclude") {
                    include_discount = false;
                    any_exclude = true;
                } else {
                    include_discount = filters.discounts.filter(d => d.status === "include").length === 0;
                }

                let quality_status = filters.qualities.find(d => d.name === e.quality)?.status;
                if (quality_status === "include") {
                    include_quality = true;
                    any_include = true;
                } else if (quality_status === "exclude") {
                    include_quality = false;
                    any_exclude = true;
                } else {
                    include_quality = filters.qualities.filter(d => d.status === "include").length === 0;
                }

                const torrentSearchElement = document.querySelector(".torrent-search");
                if (torrentSearchElement) {
                    let must_include_words = torrentSearchElement.value.toLowerCase().split(" ").filter(w => w);
                    if (must_include_words.length > 0) {
                        include_text = must_include_words.every(word => e.info_text.toLowerCase().includes(word));
                        if (include_text) {
                            any_include = true;
                        } else {
                            any_exclude = true;
                        }
                    } else {
                        // If the text search is empty, consider all rows for inclusion
                        include_text = true;
                    }
                }

                if (include_tracker && include_discount && include_quality && include_text) {
                    e.dom_path.style.display = "table-row";
                } else {
                    e.dom_path.style.display = "none";
                }
            });

            if (!any_include) {
                doms.forEach((e) => {
                    if (!any_exclude || e.dom_path.style.display !== "none") {
                        e.dom_path.style.display = "table-row";
                    }
                });
            }

            // Hide empty rows if there is any include
            if (any_include) {
                empties.forEach((e) => {
                    e.classList.add("hidden", "initially-hidden");
                });
            } else {
                empties.forEach((e) => {
                    e.classList.remove("hidden", "initially-hidden");
                });
            }
        };

        const update_filter_box_status = (object_key, value, dom_path) => {
            let filter = filters[object_key].find(e => e.name === value);
            let current_status = filter.status;

            if (current_status === "default") {
                filter.status = "include";
                dom_path.style.background = "#e1f5dc";
                dom_path.style.color = "#575757";
            } else if (current_status === "include") {
                filter.status = "exclude";
                dom_path.style.background = "#f8e4d6";
                dom_path.style.color = "#575757";
            } else {
                filter.status = "default";
                dom_path.style.background = "";
                dom_path.style.opacity = 1;
                dom_path.style.removeProperty("color");
            }

            const event = new CustomEvent('AddReleasesStatusChanged');
            document.dispatchEvent(event);

            filter_torrents(); // big update
        };

        function apply_default_filters() {
            console.log("Applying default filters...");

            // Apply default tracker filters
            show_only_by_default.forEach(tracker => {
                const trackerID = `#filter-${tracker.toLowerCase()}`;
                const dom_path = document.querySelector(trackerID);

                if (dom_path) {
                    const trackerFilter = filters.trackers.find(e => e.name === tracker);
                    if (trackerFilter) {
                        trackerFilter.status = "include";
                        dom_path.style.background = "#e1f5dc";
                        dom_path.style.color = "#575757";
                        console.log(`Applied tracker filter for ${tracker}`);
                    } else {
                        console.log(`Tracker ${tracker} not found in filters.`);
                    }
                } else {
                    console.log(`No DOM element found for tracker ${trackerID}`);
                }
            });

            // Apply default quality filters
            show_resolution_by_default.forEach(quality => {
                const qualityElements = document.querySelectorAll(".filter-box");
                let qualityFound = false;

                qualityElements.forEach(dom_path => {
                    if (dom_path.textContent.trim().toLowerCase() === quality.toLowerCase()) {
                        const qualityFilter = filters.qualities.find(e => e.name === quality);
                        if (qualityFilter) {
                            qualityFilter.status = "include";
                            dom_path.style.background = "#40E0D0";
                            //dom_path.style.color = "#111";
                            qualityFound = true;
                            console.log(`Applied quality filter for ${quality}`);
                        } else {
                            console.log(`Quality ${quality} not found in filters.`);
                        }
                    }
                });

                if (!qualityFound) {
                    console.log(`No DOM element found for quality ${quality}`);
                }
            });

            filter_torrents(); // Applies the filters to the page
        }

        const fix_ptp_names = () => {
            document.querySelectorAll("tr.group_torrent").forEach(d => {
                if (ptp_release_name && !improved_tags) {
                    // Find the closest header element with a matching dom_id class
                    const matchingDom = doms.find(dom => d.classList.contains(dom.dom_id));
                    if (matchingDom) {
                        const torrent = d.querySelector("a.torrent-info-link");
                        if (torrent) {
                            // Extract the HTML element with the specific class if present
                            const freeleechSpan = torrent.querySelector("span.torrent-info__download-modifier.torrent-info__download-modifier--free");
                            const halfleechSpan = torrent.querySelector("span.torrent-info__download-modifier.torrent-info__download-modifier--half");
                            const trumpableSpan = torrent.querySelector("span.torrent-info__trumpable");
                            const reportedSpan = torrent.querySelector("span.torrent-info__reported");

                            const freeleechSpanHtml = freeleechSpan ? freeleechSpan.outerHTML : '';
                            const halfleechSpanHtml = halfleechSpan ? halfleechSpan.outerHTML : '';
                            const trumpableSpanHtml = trumpableSpan ? trumpableSpan.outerHTML : '';
                            const reportedSpanHtml = reportedSpan ? reportedSpan.outerHTML : '';

                            [freeleechSpan, halfleechSpan, trumpableSpan, reportedSpan].forEach(span => {
                                if (span) span.remove(); // Remove the element temporarily
                            });

                            // Define patterns to keep full stops
                            const keepPatterns = [
                                /\b\d\.\d\b/g,
                                /\bDD\d\.\d\b/g,
                                /\bDDP\d\.\d\b/g,
                                /\bDD\+\d\.\d\b/g,
                                /\bTrueHD \d\.\d\b/g,
                                /\bDTS\d\.\d\b/g,
                                /\bAC3\d\.\d\b/g,
                                /\bAAC\d\.\d\b/g,
                                /\bOPUS\d\.\d\b/g,
                                /\bMP3\d\.\d\b/g,
                                /\bFLAC\d\.\d\b/g,
                                /\bLPCM\d\.\d\b/g,
                                /\bH\.264\b/g,
                                /\bH\.265\b/g,
                                /\bDTS-HD MA \d\.\d\b/g
                            ];

                            let ptp_info_text = matchingDom.info_text;

                            // Function to replace full stops outside of the patterns
                            const replaceFullStops = (text) => {
                                // Map to store original patterns and their placeholders
                                const placeholders = new Map();
                                let tempText = text;

                                // Define patterns to keep full stops
                                const keepPatterns = [
                                    /\b\d\.\d\b/g,
                                    /\bDD\d\.\d\b/g,
                                    /\bDDP\d\.\d\b/g,
                                    /\bDD\+\d\.\d\b/g,
                                    /\bTrueHD \d\.\d\b/g,
                                    /\bDTS\d\.\d\b/g,
                                    /\bAC3\d\.\d\b/g,
                                    /\bAAC\d\.\d\b/g,
                                    /\bOPUS\d\.\d\b/g,
                                    /\bMP3\d\.\d\b/g,
                                    /\bFLAC\d\.\d\b/g,
                                    /\bLPCM\d\.\d\b/g,
                                    /\bH\.264\b/g,
                                    /\bH\.265\b/g,
                                    /\bDTS-HD MA \d\.\d\b/g,
                                    /\bDTS-HD MA \d\.\d\b/g // Ensuring variations
                                ];

                                // Temporarily replace patterns with placeholders
                                keepPatterns.forEach((pattern, index) => {
                                    tempText = tempText.replace(pattern, (match) => {
                                        const placeholder = `__PLACEHOLDER${index}__`;
                                        placeholders.set(placeholder, match);
                                        return placeholder;
                                    });
                                });

                                // Replace remaining full stops not followed by a digit, not preceded by a digit, or directly following a year
                                tempText = tempText.replace(/(?<!\d)\.(?!\d)/g, ' '); // Replace full stops not preceded by a digit
                                tempText = tempText.replace(/\.(?!(\d))/g, ' '); // Replace full stops not followed by a digit
                                tempText = tempText.replace(/(?<=\b\d{4})\./g, ' '); // Remove full stops directly following a year
                                tempText = tempText.replace(/\.(?=\b\d{4}\b)/g, ' '); // Remove full stops directly before a year

                                // Restore the original patterns from the placeholders
                                placeholders.forEach((original, placeholder) => {
                                    tempText = tempText.replace(new RegExp(placeholder, 'g'), original);
                                });

                                // Additional replacements
                                tempText = tempText
                                    .replace(/DD\+/g, 'DD+ ')
                                    .replace(/DDP/g, 'DD+ ')
                                    .replace(/DoVi/g, 'DV')
                                    .replace(/\(/g, '')
                                    .replace(/\)/g, '')
                                    .replace(/\bhdr\b/g, 'HDR')
                                    .replace(/\bweb\b/g, 'WEB')
                                    .replace(/\bbluray\b/gi, 'BluRay')
                                    .replace(/\bh254\b/g, 'H.264')
                                    .replace(/\bh265\b/g, 'H.265')
                                    .replace(/\b\w/g, char => char.toUpperCase())
                                    .replace(/\bX264\b/g, 'x264')
                                    .replace(/\bX265\b/g, 'x265')
                                    .replace(/\b - \b/g, ' ');

                                return tempText;
                            };

                            // Clean ptp_info_text by replacing full stops according to the rules
                            const cleanedPtpInfoText = replaceFullStops(ptp_info_text);

                            // Re-add the extracted HTML elements after making the modifications
                            // Construct the final innerHTML string
                            let finalHtml = show_tracker_name
                                ? `[PTP]${improved_tags ? ' /' : ''} ${cleanedPtpInfoText}`
                                : `${cleanedPtpInfoText}`;

                            [freeleechSpanHtml, halfleechSpanHtml, trumpableSpanHtml, reportedSpanHtml].forEach(spanHtml => {
                                if (spanHtml) finalHtml += ` / ${spanHtml}`;
                            });

                            torrent.innerHTML = finalHtml;
                        }
                    }
                } else {
                    if (d.className !== "group_torrent") {
                        const torrent = d.querySelector("a.torrent-info-link");
                        if (torrent) {
                            if (improved_tags && show_tracker_name) {
                                torrent.innerHTML = "[PTP] / " + torrent.innerHTML;
                            } else if (show_tracker_name) {
                                torrent.innerHTML = "[PTP] " + torrent.innerHTML;
                            }
                        }
                    }
                }
            });
        };

        const add_filters_div = (trackers, discounts, qualities) => {
            const filterboxlocationMap = {
                "Above": ".box_albumart",
                "Below": ".box.box_details",
                "Torrents": "#torrent_details",
            };

            let addBeforeThis = document.querySelector(filterboxlocationMap[filterboxlocation] || "#movieinfo");

            let div = document.createElement("div");
            div.className = "panel__body";
            div.style.padding = "0 10px 5px 10px";
            div.style.display = "block";

            // Filter by tracker section
            let filterByTracker = document.createElement("div");
            filterByTracker.style = "display: flex; align-items: baseline";
            filterByTracker.style.margin = "4px 0";

            let label = document.createElement("div");
            label.textContent = "Tracker: ";
            label.style.cursor = "default";
            label.style.flex = "0 0 60px";
            filterByTracker.appendChild(label);

            let trackerContents = document.createElement("div");
            trackers.forEach((tracker_name) => {
                let div = document.createElement("div");
                div.id = `filter-${tracker_name.toLowerCase()}`;
                div.className = "filter-box";
                div.textContent = tracker_name;
                div.style.padding = "2px 5px";
                div.style.margin = "3px";
                //div.style.color = "#eee";
                div.style.display = "inline-block";
                div.style.cursor = "pointer";
                //div.style.border = "1px dashed #606060";
                div.style.fontSize = "1em";
                div.style.textAlign = "center";

                div.addEventListener("click", () => {
                    update_filter_box_status("trackers", tracker_name, div);
                });

                trackerContents.append(div);
            });
            filterByTracker.append(trackerContents);
            div.append(filterByTracker);

            // Filter by discount section
            let additional_settings = document.createElement("div");
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
                //only_discount.style.color = "#eee";
                only_discount.style.display = "inline-block";
                only_discount.style.cursor = "pointer";
                //only_discount.style.border = "1px dashed #606060";
                only_discount.style.fontSize = "1em";

                only_discount.addEventListener("click", () => {
                    update_filter_box_status("discounts", discount_name, only_discount);
                });
                discountContents.append(only_discount);
            });
            additional_settings.append(discountContents);
            div.append(additional_settings);

            // Filter by quality section
            let filterByQuality = document.createElement("div");
            filterByQuality.style = "display: flex; align-items: baseline";
            filterByQuality.style.margin = "4px 0";

            let label_3 = document.createElement("div");
            label_3.textContent = "Quality: ";
            label_3.style.cursor = "default";
            label_3.style.flex = "0 0 60px";
            filterByQuality.appendChild(label_3);

            let qualityContents = document.createElement("div");
            qualities.forEach((quality_name) => {
                let quality = document.createElement("div");
                quality.className = "filter-box";
                quality.textContent = quality_name;
                quality.style.padding = "2px 5px";
                quality.style.margin = "3px";
                //quality.style.color = "#eee";
                quality.style.display = "inline-block";
                quality.style.cursor = "pointer";
                //quality.style.border = "1px dashed #606060";
                quality.style.fontSize = "1em";
                quality.style.textAlign = "center";

                quality.addEventListener("click", () => {
                    update_filter_box_status("qualities", quality_name, quality);
                });

                qualityContents.append(quality);
            });
            filterByQuality.append(qualityContents);
            div.append(filterByQuality);

            // Search box
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

            // Reset button
            let rst = document.createElement("div");
            rst.textContent = "⟳";
            rst.style.padding = "4px 8px";
            rst.style.margin = "0px 4px";
            //rst.style.color = "#eee";
            rst.style.display = "inline-block";
            rst.style.cursor = "pointer";
            //rst.style.border = "1px dashed #606060";
            rst.style.fontSize = "1em";
            rst.style.textAlign = "center";

            rst.addEventListener("click", () => {
                document.querySelector(".torrent-search").value = "";
                filters = {
                    "trackers": trackers.map((e) => {
                        return { "name": e, "status": "default" };
                    }),
                    "discounts": discounts.map((e) => {
                        return { "name": e, "status": "default" };
                    }),
                    "qualities": qualities.map((e) => {
                        return { "name": e, "status": "default" };
                    }),
                };

                filter_torrents();

                document.querySelectorAll(".filter-box").forEach(d => {
                    d.style.background = "";
                    //d.style.color = "#eee";
                });
            });
            filterByText.appendChild(rst);

            div.appendChild(filterByText);

            // Panel setup
            const panel = document.createElement("div");
            panel.className = "panel";
            const panelHeading = document.createElement("div");
            panelHeading.className = "panel__heading";
            panelHeading.style.cursor = "pointer"; // Make the header clickable

            const panelHeadingTitle = document.createElement("span");
            panelHeadingTitle.textContent = "Filter Releases";
            panelHeadingTitle.className = "panel__heading__title";
            panelHeading.append(panelHeadingTitle);

            // Toggle functionality
            panelHeading.addEventListener("click", () => {
                let isHidden = div.style.display === "none";
                div.style.display = isHidden ? "block" : "none";
                GM_config.set('filterhidden', !isHidden);
            });

            panel.append(panelHeading, div);
            addBeforeThis.insertAdjacentElement("beforeBegin", panel);
        };

        const get_example_div = () => {
            let tr = document.createElement("tr");
            tr.className = "torrent_row groupid group_torrent";
            tr.id = "torrent";
            //tr["data-releasename"] = "release_name_here";
            //tr["data-releasegroup"] = "group_name_here";

            let td = document.createElement("td");
            //td.style.width = "596px";

            let span = document.createElement("span");
            span.className = "brackets";
            //span.textContent = "[";
                let a = document.createElement("a");
                a.href = "#";
                a.className = "tooltip";
                a.textContent = "DL";
                //a.title = "Download";
                span.appendChild(a);
            //span.innerHTML += "]";

            let a2 = document.createElement("a");
            a2.className = "link_2";

            let img = document.createElement("img");
            img.style.width = "12px";
            img.style.height = "12px";
            img.height = "12";
            img.width = "12";
            img.src = "static/common/check.png";
            img.alt = "☑";
            img.title = "Tracker title";

            a2.appendChild(img);

            let a3 = document.createElement("a");
            a3.href = "link_3";
            a3.setAttribute("data-toggle-target", "torrent");
            a3.textContent = "INFO_TEXT_HERE";

            let whitespace = document.createTextNode(' ');

            td.appendChild(span);
            td.appendChild(a2);
            td.appendChild(whitespace);
            td.appendChild(a3);

            let td2 = document.createElement("td");
            td2.className = "number_column nobr";
            td2.textContent = "TORRENT_SIZE_HERE";

            //let span2 = document.createElement("span");
            //span2.className = "size-span";
            //span2.style.float = "left";
            //span2.title = "SIZE_IN_BYTES_HERE";
            //span2.textContent = "TORRENT_SIZE_HERE";
            //td2.appendChild(span2);

            let td3 = document.createElement("td");
            let td4 = document.createElement("td");
            let td5 = document.createElement("td");

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
                }
            }, false);
        };

        const get_sorted_qualities = (qualities) => {
            let arr = [];

            qualities.forEach(q => {

                if (q === "SD") arr.push({ "value": 0, "name": q });
                else if (q === "720p") arr.push({ "value": 3, "name": q });
                else if (q === "1080p") arr.push({ "value": 4, "name": q });
                else if (q === "2160p") arr.push({ "value": 5, "name": q });
                else if (q === "Soundtrack") arr.push({ "value": 6, "name": q });

            });

            return arr.sort((a, b) => (a.value > b.value) ? 1 : -1).map(e => e.name);
        };

        const get_sorted_discounts = (discounts, simplediscounts) => {
            let arr = [];

            discounts.forEach(q => {
                if (q === "None") arr.push({ "value": 0, "name": q });
                else if (q === "Rescuable") arr.push({ "value": 1, "name": q });
                else if (q === "Rescue") arr.push({ "value": 1, "name": q });
                else if (q === "Rewind") arr.push({ "value": 2, "name": q });
                else if (q === "Refundable") arr.push({ "value": 3, "name": q });
                else if (q === "Refund") arr.push({ "value": 3, "name": q });
                else if (q === "25% Freeleech") arr.push({ "value": 4, "name": q });
                else if (q === "25%") arr.push({ "value": 4, "name": q });
                else if (q === "Copper") arr.push({ "value": 5, "name": q });
                else if (q === "30% Bonus") arr.push({ "value": 6, "name": q });
                else if (q === "30%") arr.push({ "value": 6, "name": q });
                else if (q === "40% Bonus") arr.push({ "value": 7, "name": q });
                else if (q === "40%") arr.push({ "value": 7, "name": q });
                else if (q === "50% Freeleech") arr.push({ "value": 8, "name": q });
                else if (q === "50%") arr.push({ "value": 8, "name": q });
                else if (q === "Bronze") arr.push({ "value": 9, "name": q });
                else if (q === "75% Freeleech") arr.push({ "value": 10, "name": q });
                else if (q === "75%") arr.push({ "value": 10, "name": q });
                else if (q === "Silver") arr.push({ "value": 11, "name": q });
                else if (q === "Freeleech") arr.push({ "value": 12, "name": q });
                else if (q === "FL") arr.push({ "value": 12, "name": q });
                else if (q === "Golden") arr.push({ "value": 13, "name": q });
                else if (q === "Pollination") arr.push({ "value": 14, "name": q });
                else if (q === "Pollin") arr.push({ "value": 14, "name": q });
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

        let line_example = get_example_div();
        let group_header_example = document.querySelector("tr.group_torrent").cloneNode(true);
        let original_table;

        function displayAlert(text, backgroundColor = "red") {
            const alert = document.createElement("div");
            alert.className = "alert text--center alert-fade";
            alert.textContent = text;
            alert.style = `background-color: ${backgroundColor}; color: white`;
            document.querySelector("#content").prepend(alert);

            setTimeout(() => {
                alert.classList.add("alert-fade-out");
                setTimeout(() => {
                    alert.remove();
                }, 1000);
            }, 2);
        }

        // Function to get TVDB ID from localStorage
        function getTvdbIdFromStorage(ptpId) {
            return localStorage.getItem(`tvdb_id_${ptpId}`);
        }

        // Function to get TVDB ID
        function getTvdbId() {
            const ptpId = new URL(window.location.href).searchParams.get("id");
            let tvdbId = getTvdbIdFromStorage(ptpId);
            return tvdbId;
        }

        // Function to wait for TVDB ID with a timeout
        function waitForTvdbId(timeout = btnTimer) {
            return new Promise((resolve, reject) => {
                // Check if the TVDB ID is already in localStorage
                let tvdbId = getTvdbId();
                if (tvdbId) {
                    resolve(tvdbId);
                } else {
                    // Add event listener for TVDB ID
                    const onTvdbIdFetched = (event) => {
                        const { tvdbId: fetchedTvdbId } = event.detail;
                        resolve(fetchedTvdbId);
                        cleanup();
                    };

                    // Add event listener for TVDB ID fetch errors
                    const onTvdbIdFetchError = (event) => {
                        const { message } = event.detail;
                        reject(new Error(message));
                        cleanup();
                    };

                    // Cleanup function to remove event listeners
                    const cleanup = () => {
                        clearTimeout(timeoutId);
                        document.removeEventListener('tvdbIdFetched', onTvdbIdFetched);
                        document.removeEventListener('tvdbIdFetchError', onTvdbIdFetchError);
                    };

                    document.addEventListener('tvdbIdFetched', onTvdbIdFetched);
                    document.addEventListener('tvdbIdFetchError', onTvdbIdFetchError);

                    // Set a timeout to reject the promise if neither event is triggered
                    const timeoutId = setTimeout(() => {
                        reject(new Error("TVDB ID fetch timed out."));
                        cleanup();
                    }, timeout);
                }
            });
        }

        // Function to get TVmaze ID
        function getTvmazeId() {
            return new Promise((resolve, reject) => {
                // Add event listener for TVmaze ID
                const onTvmazeIdFetched = (event) => {
                    const { tvmazeId } = event.detail;
                    resolve(tvmazeId);
                    cleanup();
                };

                // Add event listener for TVmaze ID fetch errors
                const onTvmazeIdFetchError = (event) => {
                    const { message } = event.detail;
                    reject(new Error(message));
                    cleanup();
                };

                // Cleanup function to remove event listeners
                const cleanup = () => {
                    clearTimeout(timeoutId);
                    document.removeEventListener('tvmazeIdFetched', onTvmazeIdFetched);
                    document.removeEventListener('tvmazeIdFetchError', onTvmazeIdFetchError);
                };

                document.addEventListener('tvmazeIdFetched', onTvmazeIdFetched);
                document.addEventListener('tvmazeIdFetchError', onTvmazeIdFetchError);

                // Set a timeout to reject the promise if neither event is triggered
                const timeoutId = setTimeout(() => {
                    reject(new Error("TVmaze ID fetch timed out."));
                    cleanup();
                }, 2000); // Adjusted timeout to 10 seconds for better reliability
            });
        }

        // Function to wait for TVmaze ID with a timeout
        async function waitForTvmazeId() {
            try {
                const tvmazeId = await getTvmazeId();
                return tvmazeId;
            } catch (error) {
                console.log('TVmaze error:', error.message);
                return null;
            }
        }

        const mainFunc = async () => {
            if (show_tracker_name || improved_tags || ptp_release_name) {
                fix_ptp_names();
            }

            let imdb_id;

            let imdbAnchor = document.querySelector('a[href*="imdb.com/title/tt"]');

            // Extract the IMDb ID from the href attribute
            imdb_id = "tt" + imdbAnchor.href.split("/tt")[1].split("/")[0];

            let tvdbId;
            if (trackers.includes("BTN")) {
                try {
                    tvdbId = getTvdbId();
                    if (!tvdbId) {
                        tvdbId = await waitForTvdbId();
                    }
                    if (tvdbId) {
                        console.log(`TVDB ID is ${tvdbId}`);
                    } else {
                        console.log('TVDB ID not found yet.');
                    }
                } catch (error) {
                    console.log('TVDB error:', error.message);
                }
            }

            let tvmazeId;
            if (trackers.includes("NBL")) {
                try {
                    tvmazeId = await waitForTvmazeId();
                    if (tvmazeId) {
                        console.log(`TVmaze ID is ${tvmazeId}`);
                    } else {
                        console.log('TVmaze ID not found yet.');
                    }
                } catch (error) {
                    console.log('TVmaze error:', error.message);
                }
            }

            let name_url = document.querySelector("div.header > h2 > span").textContent.trim();
            let show_name;
            let show_nbl_name;
            let red_name;

            const akaIndex = name_url.indexOf(" AKA ");
            if (akaIndex !== -1) {
                show_name = name_url.substring(0, akaIndex);
                show_nbl_name = show_name;
            } else {
                const yearMatch = name_url.match(/\[\d{4}\]/);
                show_name = yearMatch ? name_url.substring(0, yearMatch.index).trim() : name_url;
                show_nbl_name = show_name;
            }

            const colonIndex = show_nbl_name.indexOf(":");
            if (colonIndex !== -1) {
                show_nbl_name = show_nbl_name.substring(0, colonIndex);
            }

            red_name = show_name.replace(/[:\-]+/g, '').trim();

            show_name = show_name.trim().replace(/[\s:]+$/, '');
            show_nbl_name = show_nbl_name.trim().replace(/[\s:]+$/, '');

            let promises = [];
            trackers.forEach(t => promises.push(fetch_tracker(t, imdb_id, show_name, show_nbl_name, red_name, tvdbId, tvmazeId)));
            Promise.all(promises)
                .then(torrents_lists => {
                    // Combine all torrents into one array
                    var all_torrents = [].concat.apply([], torrents_lists)
                        .sort((a, b) => {
                            // Check if both torrents are soundtracks
                            if (a.quality === "Soundtrack" && b.quality === "Soundtrack") {
                                // Sort by groupId (album title) first
                                if ((a.album || '').localeCompare(b.album || '') !== 0) {
                                    return (a.album || '').localeCompare(b.album || ''); // Sort alphabetically by groupId (album title)
                                }
                                // Sort by year if groupId is the same
                                if (a.year !== b.year) {
                                    return a.year < b.year ? 1 : -1; // Sort descending by year
                                }
                                // Sort by title if year is the same
                                if ((a.title || '').localeCompare(b.title || '') !== 0) {
                                    return (a.title || '').localeCompare(b.title || ''); // Sort alphabetically by title
                                }
                                // Sort by catalog if title is the same
                                if ((a.catalog || '').localeCompare(b.catalog || '') !== 0) {
                                    return (a.catalog || '').localeCompare(b.catalog || ''); // Sort alphabetically by catalog
                                }
                                // If catalog is the same, sort by size
                                return a.size > b.size ? 1 : -1;
                            }
                            // Otherwise, sort by size for non-soundtrack torrents
                            return a.size < b.size ? 1 : -1; // Sort descending by size
                        });

                    // Add external torrents to the page
                    add_external_torrents(all_torrents);

                    original_table = document.querySelector("table.torrent_table").cloneNode(true);

                    localStorage.setItem("play_now_flag", "true");
                });
        };

        const addLink = function () {
            var menu = document.querySelector("#content > div > div.linkbox");
            if (menu) {
                var newLink = document.createElement("a");
                newLink.id = "other-trackers";
                newLink.textContent = "[Other Trackers]";
                newLink.href = "#";
                newLink.className = "linkbox_link";
                const clickHandler = function (e) {
                    e.preventDefault();
                    mainFunc();
                    newLink.removeEventListener('click', clickHandler); // Ensure the function only runs once by removing the event listener after the first click
                };
                newLink.addEventListener('click', clickHandler);
                menu.appendChild(newLink);
            }
        };

        if (!run_by_default) {
            addLink();
        } else {
            mainFunc();
        }
})();