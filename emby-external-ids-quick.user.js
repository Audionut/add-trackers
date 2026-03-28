// ==UserScript==
// @name         Emby - Quick External IDs
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Add tracker metadata links on Emby item pages using external IDs from page links.
// @author       Audionut
// @match        http://localhost:8096/*
// @match        https://localhost:8096/*
// @match        http://127.0.0.1:8096/*
// @match        https://127.0.0.1:8096/*
// @match        http://localhost:8920/*
// @match        https://localhost:8920/*
// @match        http://127.0.0.1:8920/*
// @match        https://127.0.0.1:8920/*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/emby-external-ids-quick.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/emby-external-ids-quick.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const EDIT_BUTTON_SELECTOR = 'button.btnDetailEdit.btnEditMetadata';
    const QUICK_SETTINGS_BUTTON_CLASS = 'btnExternalIdsQuickSettings';
    const LINKS_ROW_CLASS = 'externalIdsQuickLinksRow';
    const STYLE_ID = 'external-ids-quick-style';
    const DETAIL_BUTTONS_SELECTOR = 'div.verticalFieldItem.detailButtons.mainDetailButtons, .detailButtons.mainDetailButtons';
    const MEDIA_INFO_SELECTOR = 'div.mediaInfo.detail-mediaInfoPrimary, div.detail-mediaInfoPrimary';
    const SETTINGS_STORAGE_KEY = 'emby_external_ids_quick_settings_v1';
    const ICON_CACHE_STORAGE_KEY = 'emby_external_ids_quick_icon_cache_v1';
    const ICON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const ICON_CACHE_MAX_ENTRIES = 200;
    const DEFAULT_RENDER_DELAY_MS = 140;
    const RETRY_RENDER_DELAY_MS = 260;
    const MAX_EMPTY_RENDER_RETRIES = 18;
    const DEFAULT_SETTINGS = {
        customSites: [],
        sortAlphabetically: false
    };
    const BUILTIN_ICON_SOURCES = {
        imdb: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2aWV3Qm94PSIwIDAgNTc1IDI4OS44MyIgd2lkdGg9IjU3NSIgaGVpZ2h0PSIyODkuODMiPjxkZWZzPjxwYXRoIGQ9Ik01NzUgMjQuOTFDNTczLjQ0IDEyLjE1IDU2My45NyAxLjk4IDU1MS45MSAwQzQ5OS4wNSAwIDc2LjE4IDAgMjMuMzIgMEMxMC4xMSAyLjE3IDAgMTQuMTYgMCAyOC42MUMwIDUxLjg0IDAgMjM3LjY0IDAgMjYwLjg2QzAgMjc2Ljg2IDEyLjM3IDI4OS44MyAyNy42NCAyODkuODNDNzkuNjMgMjg5LjgzIDQ5NS42IDI4OS44MyA1NDcuNTkgMjg5LjgzQzU2MS42NSAyODkuODMgNTczLjI2IDI3OC44MiA1NzUgMjY0LjU3QzU3NSAyMTYuNjQgNTc1IDQ4Ljg3IDU3NSAyNC45MVoiIGlkPSJkMXB3aGY5d3kyIj48L3BhdGg+PHBhdGggZD0iTTY5LjM1IDU4LjI0TDExNC45OCA1OC4yNEwxMTQuOTggMjMzLjg5TDY5LjM1IDIzMy44OUw2OS4zNSA1OC4yNFoiIGlkPSJnNWpqbnEyNnlTIj48L3BhdGg+PHBhdGggZD0iTTIwMS4yIDEzOS4xNUMxOTcuMjggMTEyLjM4IDE5NS4xIDk3LjUgMTk0LjY3IDk0LjUzQzE5Mi43NiA4MC4yIDE5MC45NCA2Ny43MyAxODkuMiA1Ny4wOUMxODUuMjUgNTcuMDkgMTY1LjU0IDU3LjA5IDEzMC4wNCA1Ny4wOUwxMzAuMDQgMjMyLjc0TDE3MC4wMSAyMzIuNzRMMTcwLjE1IDExNi43NkwxODYuOTcgMjMyLjc0TDIxNS40NCAyMzIuNzRMMjMxLjM5IDExNC4xOEwyMzEuNTQgMjMyLjc0TDI3MS4zOCAyMzIuNzRMMjcxLjM4IDU3LjA5TDIxMS43NyA1Ny4wOUwyMDEuMiAxMzkuMTVaIiBpZD0iaTNQcmgxSnBYdCI+PC9wYXRoPjxwYXRoIGQ9Ik0zNDYuNzEgOTMuNjNDMzQ3LjIxIDk1Ljg3IDM0Ny40NyAxMDAuOTUgMzQ3LjQ3IDEwOC44OUMzNDcuNDcgMTE1LjcgMzQ3LjQ3IDE3MC4xOCAzNDcuNDcgMTc2Ljk5QzM0Ny40NyAxODguNjggMzQ2LjcxIDE5NS44NCAzNDUuMiAxOTguNDhDMzQzLjY4IDIwMS4xMiAzMzkuNjQgMjAyLjQzIDMzMy4wOSAyMDIuNDNDMzMzLjA5IDE5MC45IDMzMy4wOSA5OC42NiAzMzMuMDkgODcuMTNDMzM4LjA2IDg3LjEzIDM0MS40NSA4Ny42NiAzNDMuMjUgODguN0MzNDUuMDUgODkuNzUgMzQ2LjIxIDkxLjM5IDM0Ni43MSA5My42M1pNMzY3LjMyIDIzMC45NUMzNzIuNzUgMjI5Ljc2IDM3Ny4zMSAyMjcuNjYgMzgxLjAxIDIyNC42N0MzODQuNyAyMjEuNjcgMzg3LjI5IDIxNy41MiAzODguNzcgMjEyLjIxQzM5MC4yNiAyMDYuOTEgMzkxLjE0IDE5Ni4zOCAzOTEuMTQgMTgwLjYzQzM5MS4xNCAxNzQuNDcgMzkxLjE0IDEyNS4xMiAzOTEuMTQgMTE4Ljk1QzM5MS4xNCAxMDIuMzMgMzkwLjQ5IDkxLjE5IDM4OS40OCA4NS41M0MzODguNDYgNzkuODYgMzg1LjkzIDc0LjcxIDM4MS44OCA3MC4wOUMzNzcuODIgNjUuNDcgMzcxLjkgNjIuMTUgMzY0LjEyIDYwLjEzQzM1Ni4zMyA1OC4xMSAzNDMuNjMgNTcuMDkgMzIxLjU0IDU3LjA5QzMxOS4yNyA1Ny4wOSAzMDcuOTMgNTcuMDkgMjg3LjUgNTcuMDlMMjg3LjUgMjMyLjc0TDM0Mi43OCAyMzIuNzRDMzU1LjUyIDIzMi4zNCAzNjMuNyAyMzEuNzUgMzY3LjMyIDIzMC45NVoiIGlkPSJhNG92OXJSR1FtIj48L3BhdGg+PHBhdGggZD0iTTQ2NC43NiAyMDQuN0M0NjMuOTIgMjA2LjkzIDQ2MC4yNCAyMDguMDYgNDU3LjQ2IDIwOC4wNkM0NTQuNzQgMjA4LjA2IDQ1Mi45MyAyMDYuOTggNDUyLjAxIDIwNC44MUM0NTEuMDkgMjAyLjY1IDQ1MC42NCAxOTcuNzIgNDUwLjY0IDE5MEM0NTAuNjQgMTg1LjM2IDQ1MC42NCAxNDguMjIgNDUwLjY0IDE0My41OEM0NTAuNjQgMTM1LjU4IDQ1MS4wNCAxMzAuNTkgNDUxLjg1IDEyOC42QzQ1Mi42NSAxMjYuNjMgNDU0LjQxIDEyNS42MyA0NTcuMTMgMTI1LjYzQzQ1OS45MSAxMjUuNjMgNDYzLjY0IDEyNi43NiA0NjQuNiAxMjkuMDNDNDY1LjU1IDEzMS4zIDQ2Ni4wMyAxMzYuMTUgNDY2LjAzIDE0My41OEM0NjYuMDMgMTQ2LjU4IDQ2Ni4wMyAxNjEuNTggNDY2LjAzIDE4OC41OUM0NjUuNzQgMTk3Ljg0IDQ2NS4zMiAyMDMuMjEgNDY0Ljc2IDIwNC43Wk00MDYuNjggMjMxLjIxTDQ0Ny43NiAyMzEuMjFDNDQ5LjQ3IDIyNC41IDQ1MC40MSAyMjAuNzcgNDUwLjYgMjIwLjAyQzQ1NC4zMiAyMjQuNTIgNDU4LjQxIDIyNy45IDQ2Mi45IDIzMC4xNEM0NjcuMzcgMjMyLjM5IDQ3NC4wNiAyMzMuNTEgNDc5LjI0IDIzMy41MUM0ODYuNDUgMjMzLjUxIDQ5Mi42NyAyMzEuNjIgNDk3LjkyIDIyNy44M0M1MDMuMTYgMjI0LjA1IDUwNi41IDIxOS41NyA1MDcuOTIgMjE0LjQyQzUwOS4zNCAyMDkuMjYgNTEwLjA1IDIwMS40MiA1MTAuMDUgMTkwLjg4QzUxMC4wNSAxODUuOTUgNTEwLjA1IDE0Ni41MyA1MTAuMDUgMTQxLjZDNTEwLjA1IDEzMSA1MDkuODEgMTI0LjA4IDUwOS4zNCAxMjAuODNDNTA4Ljg3IDExNy41OCA1MDcuNDcgMTE0LjI3IDUwNS4xNCAxMTAuODhDNTAyLjgxIDEwNy40OSA0OTkuNDIgMTA0Ljg2IDQ5NC45OCAxMDIuOThDNDkwLjU0IDEwMS4xIDQ4NS4zIDEwMC4xNiA0NzkuMjYgMTAwLjE2QzQ3NC4wMSAxMDAuMTYgNDY3LjI5IDEwMS4yMSA0NjIuODEgMTAzLjI4QzQ1OC4zNCAxMDUuMzUgNDU0LjI4IDEwOC40OSA0NTAuNjQgMTEyLjdDNDUwLjY0IDEwOC44OSA0NTAuNjQgODkuODUgNDUwLjY0IDU1LjU2TDQwNi42OCA1NS41Nkw0MDYuNjggMjMxLjIxWiIgaWQ9ImZrOTY4QnBzWCI+PC9wYXRoPjwvZGVmcz48Zz48Zz48Zz48dXNlIHhsaW5rOmhyZWY9IiNkMXB3aGY5d3kyIiBvcGFjaXR5PSIxIiBmaWxsPSIjZjZjNzAwIiBmaWxsLW9wYWNpdHk9IjEiPjwvdXNlPjxnPjx1c2UgeGxpbms6aHJlZj0iI2QxcHdoZjl3eTIiIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjxnPjx1c2UgeGxpbms6aHJlZj0iI2c1ampucTI2eVMiIG9wYWNpdHk9IjEiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMSI+PC91c2U+PGc+PHVzZSB4bGluazpocmVmPSIjZzVqam5xMjZ5UyIgb3BhY2l0eT0iMSIgZmlsbC1vcGFjaXR5PSIwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLW9wYWNpdHk9IjAiPjwvdXNlPjwvZz48L2c+PGc+PHVzZSB4bGluazpocmVmPSIjaTNQcmgxSnBYdCIgb3BhY2l0eT0iMSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1vcGFjaXR5PSIxIj48L3VzZT48Zz48dXNlIHhsaW5rOmhyZWY9IiNpM1ByaDFKcFh0IiBvcGFjaXR5PSIxIiBmaWxsLW9wYWNpdHk9IjAiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMCI+PC91c2U+PC9nPjwvZz48Zz48dXNlIHhsaW5rOmhyZWY9IiNhNG92OXJSR1FtIiBvcGFjaXR5PSIxIiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjEiPjwvdXNlPjxnPjx1c2UgeGxpbms6aHJlZj0iI2E0b3Y5clJHUW0iIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjxnPjx1c2UgeGxpbms6aHJlZj0iI2ZrOTY4QnBzWCIgb3BhY2l0eT0iMSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1vcGFjaXR5PSIxIj48L3VzZT48Zz48dXNlIHhsaW5rOmhyZWY9IiNmazk2OEJwc1giIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjwvZz48L2c+PC9zdmc+',
        tmdb: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMTkwLjI0IDgxLjUyIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6dXJsKCNsaW5lYXItZ3JhZGllbnQpO308L3N0eWxlPjxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50IiB5MT0iNDAuNzYiIHgyPSIxOTAuMjQiIHkyPSI0MC43NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzkwY2VhMSIvPjxzdG9wIG9mZnNldD0iMC41NiIgc3RvcC1jb2xvcj0iIzNjYmVjOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwYjNlNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjx0aXRsZT5Bc3NldCAyPC90aXRsZT48ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIj48ZyBpZD0iTGF5ZXJfMS0yIiBkYXRhLW5hbWU9IkxheWVyIDEiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTEwNS42NywzNi4wNmg2Ni45QTE3LjY3LDE3LjY3LDAsMCwwLDE5MC4yNCwxOC40aDBBMTcuNjcsMTcuNjcsMCwwLDAsMTcyLjU3LjczaC02Ni45QTE3LjY3LDE3LjY3LDAsMCwwLDg4LDE4LjRoMEExNy42NywxNy42NywwLDAsMCwxMDUuNjcsMzYuMDZabS04OCw0NWg3Ni45QTE3LjY3LDE3LjY3LDAsMCwwLDExMi4yNCw2My40aDBBMTcuNjcsMTcuNjcsMCwwLDAsOTQuNTcsNDUuNzNIMTcuNjdBMTcuNjcsMTcuNjcsMCwwLDAsMCw2My40SDBBMTcuNjcsMTcuNjcsMCwwLDAsMTcuNjcsODEuMDZaTTEwLjQxLDM1LjQyaDcuOFY2LjkyaDEwLjFWMEguMzF2Ni45aDEwLjFabTI4LjEsMGg3LjhWOC4yNWguMWw5LDI3LjE1aDZsOS4zLTI3LjE1aC4xVjM1LjRoNy44VjBINjYuNzZsLTguMiwyMy4xaC0uMUw1MC4zMSwwSDM4LjUxWk0xNTIuNDMsNTUuNjdhMTUuMDcsMTUuMDcsMCwwLDAtNC41Mi01LjUyLDE4LjU3LDE4LjU3LDAsMCwwLTYuNjgtMy4wOCwzMy41NCwzMy41NCwwLDAsMC04LjA3LTFoLTExLjd2MzUuNGgxMi43NWEyNC41OCwyNC41OCwwLDAsMCw3LjU1LTEuMTVBMTkuMzQsMTkuMzQsMCwwLDAsMTQ4LjExLDc3YTE2LjI3LDE2LjI3LDAsMCwwLDQuMzctNS41LDE2LjkxLDE2LjkxLDAsMCwwLDEuNjMtNy41OEExOC41LDE4LjUsMCwwLDAsMTUyLjQzLDU1LjY3Wk0xNDUsNjguNkE4LjgsOC44LDAsMCwxLDE0Mi4zNiw3MmExMC43LDEwLjcsMCwwLDEtNCwxLjgyLDIxLjU3LDIxLjU3LDAsMCwxLTUsLjU1aC00LjA1di0yMWg0LjZhMTcsMTcsMCwwLDEsNC42Ny42MywxMS42NiwxMS42NiwwLDAsMSwzLjg4LDEuODdBOS4xNCw5LjE0LDAsMCwxLDE0NSw1OWE5Ljg3LDkuODcsMCwwLDEsMSw0LjUyQTExLjg5LDExLjg5LDAsMCwxLDE0NSw2OC42Wm00NC42My0uMTNhOCw4LDAsMCwwLTEuNTgtMi42MkE4LjM4LDguMzgsMCwwLDAsMTg1LjYzLDY0YTEwLjMxLDEwLjMxLDAsMCwwLTMuMTctMXYtLjFhOS4yMiw5LjIyLDAsMCwwLDQuNDItMi44Miw3LjQzLDcuNDMsMCwwLDAsMS42OC01LDguNDIsOC40MiwwLDAsMC0xLjE1LTQuNjUsOC4wOSw4LjA5LDAsMCwwLTMtMi43MiwxMi41NiwxMi41NiwwLDAsMC00LjE4LTEuMywzMi44NCwzMi44NCwwLDAsMC00LjYyLS4zM2gtMTMuMnYzNS40aDE0LjVhMjIuNDEsMjIuNDEsMCwwLDAsNC43Mi0uNSwxMy41MywxMy41MywwLDAsMCw0LjI4LTEuNjUsOS40Miw5LjQyLDAsMCwwLDMuMS0zLDguNTIsOC41MiwwLDAsMCwxLjItNC42OEE5LjM5LDkuMzksMCwwLDAsMTg5LjY2LDY4LjQ3Wk0xNzAuMjEsNTIuNzJoNS4zYTEwLDEwLDAsMCwxLDEuODUuMTgsNi4xOCw2LjE4LDAsMCwxLDEuNy41NywzLjM5LDMuMzksMCwwLDEsMS4yMiwxLjEzLDMuMjIsMy4yMiwwLDAsMSwuNDgsMS44MiwzLjYzLDMuNjMsMCwwLDEtLjQzLDEuOCwzLjQsMy40LDAsMCwxLTEuMTIsMS4yLDQuOTIsNC45MiwwLDAsMS0xLjU4LjY1LDcuNTEsNy41MSwwLDAsMS0xLjc3LjJoLTUuNjVabTExLjcyLDIwYTMuOSwzLjksMCwwLDEtMS4yMiwxLjMsNC42NCw0LjY0LDAsMCwxLTEuNjguNyw4LjE4LDguMTgsMCwwLDEtMS44Mi4yaC03di04aDUuOWExNS4zNSwxNS4zNSwwLDAsMSwyLC4xNSw4LjQ3LDguNDcsMCwwLDEsMi4wNS41NSw0LDQsMCwwLDEsMS41NywxLjE4LDMuMTEsMy4xMSwwLDAsMSwuNjMsMkEzLjcxLDMuNzEsMCwwLDEsMTgxLjkzLDcyLjcyWiIvPjwvZz48L2c+PC9zdmc+',
        tvdb: 'data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAQAAAAEAgGAAAAH/P/YQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAPFJREFUOI2dk7EOgjAURo8MhcHE3+Qz2A3M3QQn0I2NweQLeA7GwN5A2Jj4ATY2E4P4A6gMMYQ2kthFK7V8f+e8f6XQewwR9+f5bYBTQfJYQga9v7Q0x5N7v4i7j6Y5sX6k8rC2Q5R6WwVfG2g1A6k7mJrBzL0CqR2c7cJ4fJQ0YxQxq6Qm0lM3xg5JY0q7jzW0Jd1xJzQ2n8+9G8tM3a1Jk2hQ8k1+R8jQ2m8Q2m2r1k8gN8Q9Rz0H3J3Lz8xV4HfKQmK2dYwY2+0Qh+1H7R5kVx7g1kWv9E8jIY8A9B9uYxA0pG8EAAAAASUVORK5CYII='
    };
    const pageContext = typeof unsafeWindow === 'object' ? unsafeWindow : globalThis;
    let iconCacheMap = null;
    let settingsCache = null;
    let renderTimer = null;
    const emptyRenderRetriesByItemId = new Map();

    function normalizeText(text) {
        return String(text || '').trim();
    }

    function getGmValue(key, fallbackValue) {
        if (typeof GM_getValue !== 'function') return fallbackValue;
        try {
            return GM_getValue(key, fallbackValue);
        } catch {
            return fallbackValue;
        }
    }

    function setGmValue(key, value) {
        if (typeof GM_setValue !== 'function') return;
        try {
            GM_setValue(key, value);
        } catch {
            // Ignore write failures and continue with in-memory cache.
        }
    }

    function loadIconCacheMap() {
        if (iconCacheMap && typeof iconCacheMap === 'object') {
            return iconCacheMap;
        }

        const raw = getGmValue(ICON_CACHE_STORAGE_KEY, '{}');
        const parsed = parsePossibleJson(typeof raw === 'string' ? raw : '{}');
        const cache = parsed && typeof parsed === 'object' ? parsed : {};
        const now = Date.now();
        let dirty = false;

        Object.keys(cache).forEach((key) => {
            const entry = cache[key];
            if (!entry || typeof entry !== 'object') {
                delete cache[key];
                dirty = true;
                return;
            }

            const dataUrl = normalizeText(entry.dataUrl);
            const expiresAt = Number(entry.expiresAt || 0);
            if (!dataUrl || expiresAt <= now || !/^data:image\//i.test(dataUrl)) {
                delete cache[key];
                dirty = true;
            }
        });

        iconCacheMap = cache;
        if (dirty) {
            setGmValue(ICON_CACHE_STORAGE_KEY, JSON.stringify(iconCacheMap));
        }

        return iconCacheMap;
    }

    function getCachedIconDataUrl(iconUrl) {
        const key = normalizeText(iconUrl);
        if (!key) return '';

        const cache = loadIconCacheMap();
        const entry = cache[key];
        if (!entry || typeof entry !== 'object') return '';

        const dataUrl = normalizeText(entry.dataUrl);
        const expiresAt = Number(entry.expiresAt || 0);
        if (!dataUrl || expiresAt <= Date.now()) {
            delete cache[key];
            setGmValue(ICON_CACHE_STORAGE_KEY, JSON.stringify(cache));
            return '';
        }

        return dataUrl;
    }

    function setCachedIconDataUrl(iconUrl, dataUrl) {
        const key = normalizeText(iconUrl);
        const cleanDataUrl = normalizeText(dataUrl);
        if (!key || !/^data:image\//i.test(cleanDataUrl)) return;

        const cache = loadIconCacheMap();
        cache[key] = {
            dataUrl: cleanDataUrl,
            expiresAt: Date.now() + ICON_CACHE_TTL_MS,
            updatedAt: Date.now()
        };

        const keys = Object.keys(cache);
        if (keys.length > ICON_CACHE_MAX_ENTRIES) {
            const ordered = keys
                .map((cacheKey) => ({
                    cacheKey,
                    updatedAt: Number(cache[cacheKey]?.updatedAt || 0)
                }))
                .sort((a, b) => a.updatedAt - b.updatedAt);

            const removeCount = keys.length - ICON_CACHE_MAX_ENTRIES;
            for (let index = 0; index < removeCount; index += 1) {
                delete cache[ordered[index].cacheKey];
            }
        }

        setGmValue(ICON_CACHE_STORAGE_KEY, JSON.stringify(cache));
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(normalizeText(reader.result));
            };
            reader.onerror = () => {
                reject(new Error('Failed to convert blob to data URL'));
            };
            reader.readAsDataURL(blob);
        });
    }

    function fetchIconBlob(url) {
        const cleanUrl = normalizeText(url);
        if (!cleanUrl) return Promise.reject(new Error('Empty icon URL'));

        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: cleanUrl,
                    responseType: 'blob',
                    onload: (response) => {
                        const status = Number(response?.status || 0);
                        const responseBlob = response?.response;
                        if (status >= 200 && status < 400 && responseBlob instanceof Blob) {
                            resolve(responseBlob);
                            return;
                        }
                        reject(new Error(`Icon fetch failed with status ${status}`));
                    },
                    onerror: () => reject(new Error('Icon fetch error')),
                    onabort: () => reject(new Error('Icon fetch aborted')),
                    ontimeout: () => reject(new Error('Icon fetch timeout'))
                });
            });
        }

        return fetch(cleanUrl, {
            method: 'GET',
            credentials: 'omit'
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Icon fetch failed with status ${response.status}`);
            }
            return response.blob();
        });
    }

    async function resolveIconSource(candidate) {
        const cleanCandidate = normalizeText(candidate);
        if (!cleanCandidate) return '';

        if (/^data:image\//i.test(cleanCandidate)) return cleanCandidate;
        if (!/^https?:\/\//i.test(cleanCandidate)) return cleanCandidate;

        const cached = getCachedIconDataUrl(cleanCandidate);
        if (cached) return cached;

        try {
            const blob = await fetchIconBlob(cleanCandidate);
            if (!(blob instanceof Blob) || blob.size === 0) {
                return cleanCandidate;
            }

            const mime = normalizeText(blob.type).toLowerCase();
            if (mime && !mime.startsWith('image/')) {
                return cleanCandidate;
            }

            const dataUrl = await blobToDataUrl(blob);
            if (!/^data:image\//i.test(dataUrl)) {
                return cleanCandidate;
            }

            setCachedIconDataUrl(cleanCandidate, dataUrl);
            return dataUrl;
        } catch {
            return cleanCandidate;
        }
    }

    function extractItemIdCandidate(value) {
        const raw = normalizeText(value);
        if (!raw) return '';

        if (raw.includes('|')) {
            const parts = raw.split('|');
            for (const part of parts) {
                const idFromPart = extractItemIdCandidate(part);
                if (idFromPart) return idFromPart;
            }
        }

        const fromItemPath = /\/Items\/([\w-]+)/i.exec(raw);
        if (fromItemPath) return normalizeText(fromItemPath[1]);

        const fromParam = /(?:itemid|id)=([\w-]+)/i.exec(raw);
        if (fromParam) return normalizeText(fromParam[1]);

        const plain = raw.replace(/[?#].*$/, '');
        if (/^[A-Za-z0-9-]{2,}$/.test(plain) && !/^https?:\/\//i.test(plain)) {
            return plain;
        }

        return '';
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${LINKS_ROW_CLASS} {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-inline-start: 6px;
            }

            .detailButtons.mainDetailButtons .${LINKS_ROW_CLASS} {
                margin-inline-start: 0;
                gap: 6px;
            }

            .detailButtons.mainDetailButtons .${LINKS_ROW_CLASS}.externalIdsQuickLinksRow--detailButtons {
                display: contents;
            }

            .${LINKS_ROW_CLASS} button.externalIdsQuickFabButton {
                width: auto;
                height: auto;
                border: 0;
                border-radius: 999px;
                background: transparent;
                overflow: visible;
                text-decoration: none;
                transition: none;
            }

            .${LINKS_ROW_CLASS} button.externalIdsQuickFabButton:hover {
                transform: none;
                border-color: transparent;
                background: transparent;
            }

            .${LINKS_ROW_CLASS} button.externalIdsQuickFabButton .externalIdsQuickFabIcon {
                width: 1.6em;
                height: 1.6em;
                object-fit: contain;
                display: block;
            }

            .${LINKS_ROW_CLASS} a {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.18);
                overflow: hidden;
                text-decoration: none;
                transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
            }

            .${LINKS_ROW_CLASS} a:hover {
                transform: translateY(-1px);
                border-color: rgba(255, 255, 255, 0.34);
                background: rgba(255, 255, 255, 0.14);
            }

            .${LINKS_ROW_CLASS} img {
                width: 14px;
                height: 14px;
                display: block;
            }

            .detailButtons.mainDetailButtons .${LINKS_ROW_CLASS} a.externalIdsQuickCompactLink {
                width: 34px;
                height: 34px;
            }

            .detailButtons.mainDetailButtons .${LINKS_ROW_CLASS} a.externalIdsQuickCompactLink img {
                width: 20px;
                height: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    function parsePossibleJson(text) {
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    }

    function getHashParams() {
        const hash = String(location.hash || '');
        const queryIndex = hash.indexOf('?');
        if (queryIndex < 0) return new URLSearchParams();
        return new URLSearchParams(hash.slice(queryIndex + 1));
    }

    function getParamCaseInsensitive(params, key) {
        const target = String(key || '').toLowerCase();
        for (const [k, value] of params.entries()) {
            if (String(k || '').toLowerCase() === target) {
                return value;
            }
        }
        return '';
    }

    function getCurrentItemIdFromUrl() {
        const hashParams = getHashParams();
        const searchParams = new URLSearchParams(location.search || '');

        const direct = getParamCaseInsensitive(hashParams, 'id')
            || getParamCaseInsensitive(hashParams, 'itemid')
            || getParamCaseInsensitive(hashParams, 'itemId')
            || getParamCaseInsensitive(searchParams, 'id')
            || getParamCaseInsensitive(searchParams, 'itemid')
            || getParamCaseInsensitive(searchParams, 'itemId');

        const directId = extractItemIdCandidate(direct);
        if (directId) return directId;

        const hashPathMatch = /\/(?:details|item)\/(\w[\w-]*)/i.exec(String(location.hash || ''));
        if (hashPathMatch) return extractItemIdCandidate(hashPathMatch[1]);

        const pathMatch = /\/(?:details|item)\/(\w[\w-]*)/i.exec(location.pathname);
        return pathMatch ? extractItemIdCandidate(pathMatch[1]) : '';
    }

    function getCurrentItemIdFromApiClient() {
        const apiClient = getApiClient();
        if (!apiClient) return '';

        if (typeof apiClient.getCurrentItemId === 'function') {
            const id = normalizeText(apiClient.getCurrentItemId());
            if (id) return id;
        }

        const candidates = [
            apiClient.itemId,
            apiClient.currentItemId,
            apiClient._itemId,
            apiClient._currentItemId
        ];

        for (const candidate of candidates) {
            const id = extractItemIdCandidate(candidate);
            if (id) return id;
        }

        return '';
    }

    function getCurrentItemIdFromAppState() {
        const dashboard = pageContext.Dashboard;

        if (dashboard && typeof dashboard.getCurrentItem === 'function') {
            const item = dashboard.getCurrentItem();
            const id = extractItemIdCandidate(item?.Id || item?.id);
            if (id) return id;
        }

        const appRouter = pageContext.AppRouter;
        if (appRouter && typeof appRouter.currentRouteInfo === 'function') {
            const route = appRouter.currentRouteInfo();
            const id = extractItemIdCandidate(route?.params?.id || route?.params?.itemid || route?.params?.itemId);
            if (id) return id;
        }

        return '';
    }

    function getCurrentItemId() {
        return normalizeText(
            extractItemIdCandidate(getCurrentItemIdFromUrl())
            || extractItemIdCandidate(getCurrentItemIdFromAppState())
            || extractItemIdCandidate(getCurrentItemIdFromApiClient())
        );
    }

    function cloneDefaultSettings() {
        return structuredClone(DEFAULT_SETTINGS);
    }

    function sanitizeSettings(raw) {
        const output = cloneDefaultSettings();

        if (!raw || typeof raw !== 'object') {
            return output;
        }

        output.customSites = Array.isArray(raw.customSites)
            ? raw.customSites
                .map((site) => {
                    if (!site || typeof site !== 'object') return null;
                    const name = normalizeText(site.name);
                    const url = normalizeText(site.url);
                    if (!name || !url) return null;

                    return {
                        enabled: site.enabled !== false,
                        name,
                        url,
                        iconInput: normalizeText(site.iconInput),
                        useTemplate: site.useTemplate === true,
                        _uiCollapsed: site._uiCollapsed !== false,
                        idSource: ['imdbId', 'tmdbId', 'tvdbId', 'aniListId', 'tvmazeId'].includes(site.idSource)
                            ? site.idSource
                            : 'imdbId',
                        type: ['both', 'movie', 'tv'].includes(site.type) ? site.type : 'both'
                    };
                })
                .filter(Boolean)
            : [];

        output.sortAlphabetically = raw.sortAlphabetically === true;

        return output;
    }

    function loadSettings() {
        if (settingsCache) return settingsCache;

        const raw = parsePossibleJson(localStorage.getItem(SETTINGS_STORAGE_KEY));
        settingsCache = sanitizeSettings(raw);
        return settingsCache;
    }

    function saveSettings(nextSettings) {
        settingsCache = sanitizeSettings(nextSettings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsCache));
        return settingsCache;
    }

    function createDefaultCustomSite() {
        return {
            enabled: true,
            name: '',
            url: '',
            iconInput: '',
            useTemplate: false,
            _uiCollapsed: true,
            idSource: 'imdbId',
            type: 'both'
        };
    }

    function isLikelyImageUrl(value) {
        const text = normalizeText(value);
        if (!text) return false;
        if (/^data:image\//i.test(text)) return true;
        try {
            const parsed = new URL(text, location.href);
            const pathname = (parsed.pathname || '').toLowerCase();
            return /\.(png|ico|svg|webp|jpg|jpeg|gif)$/.test(pathname) || pathname.endsWith('/favicon.ico');
        } catch {
            return false;
        }
    }

    function createModalField(labelText, input) {
        const field = document.createElement('label');
        field.style.display = 'flex';
        field.style.flexDirection = 'column';
        field.style.gap = '6px';
        field.style.marginBottom = '10px';

        const label = document.createElement('span');
        label.textContent = labelText;
        label.style.fontSize = '12px';
        label.style.opacity = '0.85';

        field.appendChild(label);
        field.appendChild(input);
        return field;
    }

    function styleModalInput(input) {
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '8px 10px';
        input.style.border = '1px solid #555';
        input.style.borderRadius = '6px';
        input.style.background = '#1f1f1f';
        input.style.color = '#fff';
        input.style.fontSize = '13px';
    }

    function createCustomSiteEditor(site, index, total, moveSite, deleteSite) {
        const card = document.createElement('div');
        card.style.border = '1px solid #2f2f2f';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.marginBottom = '10px';
        card.style.background = '#181818';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '8px';
        header.style.marginBottom = '8px';

        const title = document.createElement('strong');
        title.textContent = site.name || `Custom Site ${index + 1}`;
        title.style.flex = '1';
        title.style.fontSize = '13px';

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = site._uiCollapsed === false ? 'Collapse' : 'Expand';

        const upButton = document.createElement('button');
        upButton.type = 'button';
        upButton.textContent = 'Up';
        upButton.disabled = index === 0;

        const downButton = document.createElement('button');
        downButton.type = 'button';
        downButton.textContent = 'Down';
        downButton.disabled = index === total - 1;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';

        [toggleButton, upButton, downButton, deleteButton].forEach((button) => {
            button.style.padding = '4px 8px';
            button.style.border = '1px solid #555';
            button.style.borderRadius = '6px';
            button.style.background = '#262626';
            button.style.color = '#fff';
            button.style.cursor = 'pointer';
            button.style.fontSize = '12px';
        });

        toggleButton.addEventListener('click', () => {
            site._uiCollapsed = !site._uiCollapsed;
            body.style.display = site._uiCollapsed ? 'none' : 'block';
            toggleButton.textContent = site._uiCollapsed ? 'Expand' : 'Collapse';
        });

        upButton.addEventListener('click', () => moveSite(index, -1));
        downButton.addEventListener('click', () => moveSite(index, 1));
        deleteButton.addEventListener('click', () => deleteSite(index));

        header.appendChild(title);
        header.appendChild(toggleButton);
        header.appendChild(upButton);
        header.appendChild(downButton);
        header.appendChild(deleteButton);

        const body = document.createElement('div');
        body.style.display = site._uiCollapsed ? 'none' : 'block';

        const enabledRow = document.createElement('label');
        enabledRow.style.display = 'flex';
        enabledRow.style.alignItems = 'center';
        enabledRow.style.gap = '8px';
        enabledRow.style.marginBottom = '10px';
        enabledRow.style.fontSize = '13px';

        const enabledInput = document.createElement('input');
        enabledInput.type = 'checkbox';
        enabledInput.checked = site.enabled !== false;
        enabledInput.addEventListener('change', () => {
            site.enabled = enabledInput.checked;
        });

        const enabledText = document.createElement('span');
        enabledText.textContent = 'Enabled';
        enabledRow.appendChild(enabledInput);
        enabledRow.appendChild(enabledText);

        const useTemplateRow = document.createElement('label');
        useTemplateRow.style.display = 'flex';
        useTemplateRow.style.alignItems = 'center';
        useTemplateRow.style.gap = '8px';
        useTemplateRow.style.marginBottom = '10px';
        useTemplateRow.style.fontSize = '13px';

        const useTemplateInput = document.createElement('input');
        useTemplateInput.type = 'checkbox';
        useTemplateInput.checked = site.useTemplate === true;
        useTemplateInput.addEventListener('change', () => {
            site.useTemplate = useTemplateInput.checked;
            idSourceField.style.display = site.useTemplate ? 'none' : 'flex';
        });

        const useTemplateText = document.createElement('span');
        useTemplateText.textContent = 'Use template URL';
        useTemplateRow.appendChild(useTemplateInput);
        useTemplateRow.appendChild(useTemplateText);

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'https://example.com/search/';
        urlInput.value = site.url || '';
        styleModalInput(urlInput);
        urlInput.addEventListener('input', () => {
            site.url = (urlInput.value || '').trim();
        });

        const iconInput = document.createElement('input');
        iconInput.type = 'text';
        iconInput.placeholder = 'PNG/ICO URL or data:image/...;base64,...';
        iconInput.value = site.iconInput || '';
        styleModalInput(iconInput);
        iconInput.addEventListener('input', () => {
            site.iconInput = (iconInput.value || '').trim();
        });

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Custom Site ${index + 1}`;
        nameInput.value = site.name || '';
        styleModalInput(nameInput);
        nameInput.addEventListener('input', () => {
            site.name = (nameInput.value || '').trim();
            title.textContent = site.name || `Custom Site ${index + 1}`;
        });

        const idSourceSelect = document.createElement('select');
        styleModalInput(idSourceSelect);
        ['imdbId', 'tmdbId', 'tvdbId', 'aniListId', 'tvmazeId'].forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            idSourceSelect.appendChild(option);
        });
        idSourceSelect.value = site.idSource || 'imdbId';
        idSourceSelect.addEventListener('change', () => {
            site.idSource = idSourceSelect.value;
        });

        const idSourceField = createModalField('ID source for non-template URL', idSourceSelect);
        idSourceField.style.display = site.useTemplate ? 'none' : 'flex';

        const typeSelect = document.createElement('select');
        styleModalInput(typeSelect);
        [
            { value: 'both', label: 'Movie & TV' },
            { value: 'movie', label: 'Movie only' },
            { value: 'tv', label: 'TV only' }
        ].forEach(({ value, label }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            typeSelect.appendChild(option);
        });
        typeSelect.value = site.type || 'both';
        typeSelect.addEventListener('change', () => {
            site.type = typeSelect.value;
        });

        body.appendChild(enabledRow);
        body.appendChild(useTemplateRow);
        body.appendChild(createModalField('Site Title', nameInput));
        body.appendChild(createModalField('Site URL', urlInput));
        body.appendChild(idSourceField);
        body.appendChild(createModalField('Display on', typeSelect));
        body.appendChild(createModalField('Site Icon (optional)', iconInput));

        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    function openSettingsModal() {
        const existing = document.getElementById('emby-links-settings-overlay');
        if (existing) {
            existing.remove();
        }

        const settings = loadSettings();

        const overlay = document.createElement('div');
        overlay.id = 'emby-links-settings-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0, 0, 0, 0.75)';
        overlay.style.zIndex = '2147483647';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const modal = document.createElement('div');
        modal.style.width = 'min(560px, 92vw)';
        modal.style.maxHeight = '90vh';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.background = '#121212';
        modal.style.color = '#fff';
        modal.style.border = '1px solid #333';
        modal.style.borderRadius = '10px';
        modal.style.padding = '14px';
        modal.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        modal.style.boxShadow = '0 10px 35px rgba(0, 0, 0, 0.45)';

        const modalContent = document.createElement('div');
        modalContent.style.overflowY = 'auto';
        modalContent.style.flex = '1';
        modalContent.style.paddingRight = '4px';

        const title = document.createElement('h2');
        title.textContent = 'Emby Metadata Links Settings';
        title.style.margin = '0 0 14px';
        title.style.fontSize = '18px';

        const workingSites = Array.isArray(settings.customSites)
            ? settings.customSites.map((site) => ({ ...createDefaultCustomSite(), ...site }))
            : [];

        const customSection = document.createElement('div');
        customSection.style.marginBottom = '12px';

        const customTitle = document.createElement('h3');
        customTitle.textContent = 'Custom Sites';
        customTitle.style.margin = '10px 0 8px';
        customTitle.style.fontSize = '15px';

        const sitesContainer = document.createElement('div');
        sitesContainer.style.maxHeight = '52vh';
        sitesContainer.style.overflowY = 'auto';
        sitesContainer.style.paddingRight = '4px';

        const addSiteButton = document.createElement('button');
        addSiteButton.type = 'button';
        addSiteButton.textContent = 'Add Site';
        addSiteButton.style.padding = '8px 10px';
        addSiteButton.style.border = '1px solid #666';
        addSiteButton.style.borderRadius = '6px';
        addSiteButton.style.cursor = 'pointer';
        addSiteButton.style.background = '#252525';
        addSiteButton.style.color = '#fff';

        const emptyState = document.createElement('div');
        emptyState.style.fontSize = '12px';
        emptyState.style.opacity = '0.8';
        emptyState.style.marginBottom = '8px';
        emptyState.textContent = 'No custom sites configured.';

        const status = document.createElement('div');
        status.style.minHeight = '18px';
        status.style.fontSize = '12px';
        status.style.marginBottom = '10px';
        status.style.color = '#9ecbff';

        const moveSite = (index, direction) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= workingSites.length) {
                return;
            }

            const temp = workingSites[index];
            workingSites[index] = workingSites[nextIndex];
            workingSites[nextIndex] = temp;
            renderSites();
        };

        const deleteSite = (index) => {
            if (index < 0 || index >= workingSites.length) {
                return;
            }

            workingSites.splice(index, 1);
            renderSites();
        };

        function renderSites() {
            sitesContainer.textContent = '';

            if (workingSites.length === 0) {
                sitesContainer.appendChild(emptyState);
                return;
            }

            workingSites.forEach((site, index) => {
                sitesContainer.appendChild(createCustomSiteEditor(site, index, workingSites.length, moveSite, deleteSite));
            });
        }

        addSiteButton.addEventListener('click', () => {
            const newSite = createDefaultCustomSite();
            newSite._uiCollapsed = false;
            workingSites.push(newSite);
            renderSites();
        });

        customSection.appendChild(customTitle);
        customSection.appendChild(sitesContainer);
        customSection.appendChild(addSiteButton);

        renderSites();

        const displaySection = document.createElement('div');
        displaySection.style.marginBottom = '12px';

        const displayTitle = document.createElement('h3');
        displayTitle.textContent = 'Display Options';
        displayTitle.style.margin = '10px 0 8px';
        displayTitle.style.fontSize = '15px';

        const sortRow = document.createElement('label');
        sortRow.style.display = 'flex';
        sortRow.style.alignItems = 'center';
        sortRow.style.gap = '8px';
        sortRow.style.fontSize = '13px';
        sortRow.style.cursor = 'pointer';

        const sortInput = document.createElement('input');
        sortInput.type = 'checkbox';
        sortInput.checked = settings.sortAlphabetically === true;

        const sortText = document.createElement('span');
        sortText.textContent = 'Sort tracker icons alphabetically';
        sortRow.appendChild(sortInput);
        sortRow.appendChild(sortText);

        displaySection.appendChild(displayTitle);
        displaySection.appendChild(sortRow);

        const helper = document.createElement('div');
        helper.textContent = 'Template mode supports {imdbId}, {tmdbId}, {tvdbId}, {aniListId}, {tvmazeId}, {title}, {year}. Without template mode, the selected ID source is appended to Site URL. Display on allows filtering trackers by content type. Icon is optional and must be an image URL or data:image base64 string.';
        helper.style.fontSize = '12px';
        helper.style.opacity = '0.8';
        helper.style.marginBottom = '12px';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.flexWrap = 'wrap';
        actions.style.paddingTop = '10px';
        actions.style.marginTop = '8px';
        actions.style.borderTop = '1px solid #2a2a2a';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';

        [saveButton, cancelButton].forEach((button) => {
            button.style.padding = '8px 10px';
            button.style.border = '1px solid #666';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            button.style.background = '#252525';
            button.style.color = '#fff';
        });

        actions.appendChild(saveButton);
        actions.appendChild(cancelButton);

        modalContent.appendChild(title);
        modalContent.appendChild(customSection);
        modalContent.appendChild(displaySection);
        modalContent.appendChild(helper);
        modalContent.appendChild(status);

        modal.appendChild(modalContent);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            overlay.remove();
        });

        modal.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        cancelButton.addEventListener('click', () => {
            overlay.remove();
        });

        saveButton.addEventListener('click', () => {
            const latest = loadSettings();
            latest.customSites = workingSites
                .map((site) => ({ ...createDefaultCustomSite(), ...site }))
                .filter((site) => String(site.url || '').trim())
                .map((site) => {
                    return {
                        enabled: site.enabled !== false,
                        useTemplate: site.useTemplate === true,
                        name: String(site.name || '').trim(),
                        url: String(site.url || '').trim(),
                        iconInput: String(site.iconInput || '').trim(),
                        idSource: ['imdbId', 'tmdbId', 'tvdbId', 'aniListId', 'tvmazeId'].includes(site.idSource) ? site.idSource : 'imdbId',
                        type: ['both', 'movie', 'tv'].includes(site.type) ? site.type : 'both'
                    };
                });

            latest.sortAlphabetically = sortInput.checked;

            const invalidIcon = latest.customSites.find((site) => {
                return site.iconInput && !isLikelyImageUrl(site.iconInput);
            });

            if (invalidIcon) {
                status.textContent = 'Each custom icon must be a valid image URL or data:image base64 string.';
                return;
            }

            saveSettings(latest);
            overlay.remove();

            // Clear signatures to force re-render with new sort order
            document.querySelectorAll('[data-external-ids-quick-signature]').forEach((el) => {
                el.dataset.externalIdsQuickSignature = '';
            });

            scheduleTrackerLinkRender();
        });
    }

    function shouldShowTracker(trackerType, detectedItemType) {
        // trackerType can be 'both', 'movie', or 'tv'
        // detectedItemType can be 'movie', 'series', or ''
        if (!trackerType || trackerType === 'both') return true;
        if (trackerType === 'movie') return detectedItemType === 'movie';
        if (trackerType === 'tv') return detectedItemType === 'series' || detectedItemType === 'tv';
        return true;
    }

    function getTrackerType(item, settings) {
        // Built-in trackers default to 'both'
        const builtInTrackerIds = new Set(['imdb', 'tmdb', 'tvdb', 'tvmaze', 'anilist']);
        if (builtInTrackerIds.has(item.id)) return 'both';

        // Custom trackers use their setting
        if (item.id.startsWith('custom-')) {
            const index = Number.parseInt(item.id.replace('custom-', ''), 10);
            const site = Array.isArray(settings.customSites) ? settings.customSites[index] : null;
            return (site && site.type) || 'both';
        }

        return 'both';
    }

    function getCanonicalProviderMap(providerIds) {
        const normalized = {};

        Object.entries(providerIds || {}).forEach(([rawKey, rawValue]) => {
            const key = normalizeText(rawKey).toLowerCase();
            const value = normalizeText(rawValue);
            if (!key || !value) return;
            normalized[key] = value;
        });

        return {
            imdbId: normalized.imdb || normalized.imdbid || '',
            tmdbId: normalized.tmdb || normalized.themoviedb || normalized.themoviedbid || '',
            tvdbId: normalized.tvdb || normalized.thetvdb || normalized.thetvdbid || '',
            aniListId: normalized.anilist || normalized.anilistid || '',
            tvmazeId: normalized.tvmaze || normalized.tvmazeid || ''
        };
    }

    function isElementVisible(element) {
        if (!(element instanceof HTMLElement)) return false;
        if (element.closest('.hide, [hidden]')) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return element.getClientRects().length > 0;
    }

    function getFirstVisibleElement(selector, root = document) {
        const scope = root instanceof Element || root instanceof Document ? root : document;
        const elements = Array.from(scope.querySelectorAll(selector));
        return elements.find((element) => isElementVisible(element)) || null;
    }

    function getApiClient() {
        const apiClient = pageContext.ApiClient;
        if (apiClient && typeof apiClient === 'object') return apiClient;

        const dashboardClient = pageContext.Dashboard && typeof pageContext.Dashboard.getCurrentApiClient === 'function'
            ? pageContext.Dashboard.getCurrentApiClient()
            : null;

        return dashboardClient && typeof dashboardClient === 'object' ? dashboardClient : null;
    }

    function normalizeHrefHost(hostname) {
        return normalizeText(hostname).toLowerCase().replace(/^www\./, '');
    }

    function extractIdsFromHref(rawHref) {
        const href = normalizeText(rawHref);
        if (!href) return null;

        let parsed;
        try {
            parsed = new URL(href, location.href);
        } catch {
            return null;
        }

        const host = normalizeHrefHost(parsed.hostname);
        const pathname = decodeURIComponent(normalizeText(parsed.pathname));
        const query = parsed.searchParams;
        const out = {
            imdbId: '',
            tmdbId: '',
            tvdbId: '',
            aniListId: '',
            tvmazeId: '',
            itemType: ''
        };

        if (host.endsWith('imdb.com')) {
            const imdbMatch = /\/title\/(tt\d{5,})/i.exec(pathname);
            if (imdbMatch) out.imdbId = imdbMatch[1];
        }

        if (host.endsWith('themoviedb.org')) {
            const tmdbMatch = /\/(movie|tv)\/(\d+)/i.exec(pathname);
            if (tmdbMatch) {
                out.tmdbId = tmdbMatch[2];
                out.itemType = tmdbMatch[1].toLowerCase() === 'tv' ? 'series' : 'movie';
            }
        }

        if (host.endsWith('thetvdb.com')) {
            const dereferrerMatch = /\/dereferrer\/(series|movie)\/(\d+)/i.exec(pathname);
            const topLevelMatch = /\/(series|movies|movie)\/(\d+)/i.exec(pathname);
            const tvdbMatch = dereferrerMatch || topLevelMatch;

            if (tvdbMatch) {
                out.tvdbId = tvdbMatch[2];
                out.itemType = /series/i.test(tvdbMatch[1]) ? 'series' : 'movie';
            }

            if (!out.tvdbId) {
                const queryId = normalizeText(query.get('id') || query.get('tvdb_id') || query.get('tvdb') || query.get('tvdbId'));
                if (/^\d+$/.test(queryId)) {
                    out.tvdbId = queryId;
                }
            }

            const tab = normalizeText(query.get('tab')).toLowerCase();
            if (!out.itemType && tab === 'series') out.itemType = 'series';
            if (!out.itemType && tab === 'movie') out.itemType = 'movie';
        }

        if (host.endsWith('tvmaze.com')) {
            const tvMazeMatch = /\/shows\/(\d+)/i.exec(pathname);
            if (tvMazeMatch) {
                out.tvmazeId = tvMazeMatch[1];
                out.itemType = 'series';
            }
        }

        if (host.endsWith('anilist.co')) {
            const aniListMatch = /\/(?:anime|manga)\/(\d+)/i.exec(pathname);
            if (aniListMatch) out.aniListId = aniListMatch[1];
        }

        if (host.endsWith('trakt.tv')) {
            const tmdbOnTraktMatch = /\/search\/tmdb\/(\d+)/i.exec(pathname);
            const imdbOnTraktMatch = /\/search\/imdb\/(tt\d{5,})/i.exec(pathname);
            if (tmdbOnTraktMatch) out.tmdbId = tmdbOnTraktMatch[1];
            if (imdbOnTraktMatch) out.imdbId = imdbOnTraktMatch[1];

            const idType = normalizeText(query.get('id_type')).toLowerCase();
            if (!out.itemType && (idType === 'movie' || idType === 'show' || idType === 'series' || idType === 'tv')) {
                out.itemType = idType === 'movie' ? 'movie' : 'series';
            }
        }

        if (!out.imdbId) {
            const queryImdb = normalizeText(query.get('imdb_id') || query.get('imdb') || query.get('imdbId'));
            if (/^tt\d{5,}$/i.test(queryImdb)) out.imdbId = queryImdb;
        }

        if (!out.tmdbId) {
            const queryTmdb = normalizeText(query.get('tmdb_id') || query.get('tmdb') || query.get('tmdbId'));
            if (/^\d+$/.test(queryTmdb)) out.tmdbId = queryTmdb;
        }

        if (!out.tvdbId) {
            const queryTvdb = normalizeText(query.get('tvdb_id') || query.get('tvdb') || query.get('tvdbId'));
            if (/^\d+$/.test(queryTvdb)) out.tvdbId = queryTvdb;
        }

        if (!out.aniListId) {
            const queryAniList = normalizeText(query.get('anilist_id') || query.get('anilist') || query.get('aniListId'));
            if (/^\d+$/.test(queryAniList)) out.aniListId = queryAniList;
        }

        const hasAnyId = out.imdbId || out.tmdbId || out.tvdbId || out.aniListId;
        if (out.tvmazeId) return out;
        return hasAnyId ? out : null;
    }

    function getPageTitleAndYearFromDom(scopeRoot = document) {
        const scope = scopeRoot instanceof Element || scopeRoot instanceof Document ? scopeRoot : document;
        const title = normalizeText(
            scope.querySelector('.itemName')?.textContent
            || scope.querySelector('.name')?.textContent
            || scope.querySelector('.pageTitle')?.textContent
        );

        const yearSource = normalizeText(
            scope.querySelector('.itemMiscInfo-primary')?.textContent
            || scope.querySelector('.itemMiscInfo')?.textContent
            || ''
        );
        const yearMatch = /\b(18|19|20)\d{2}\b/.exec(yearSource);

        return {
            title,
            year: yearMatch ? yearMatch[0] : ''
        };
    }

    function collectProviderMetadataFromDom() {
        const providerIds = {};
        let itemType = '';

        const hostContainer = getTrackerHostContainer();
        const scopeRoot = hostContainer?.closest('.mainAnimatedPage, .itemDetailPage, .page') || document;
        const visibleLinksSection = getFirstVisibleElement('.linksSection', scopeRoot);
        const linksRoot = visibleLinksSection || scopeRoot;

        const anchorList = Array.from(linksRoot.querySelectorAll('.linksSection .itemLinks a[href], .linksSection a[href], .itemLinks a[href]'))
            .filter((anchor) => isElementVisible(anchor));
        anchorList.forEach((anchor) => {
            const parsed = extractIdsFromHref(anchor.getAttribute('href') || anchor.href);
            if (!parsed) return;

            if (parsed.imdbId && !providerIds.Imdb) providerIds.Imdb = parsed.imdbId;
            if (parsed.tmdbId && !providerIds.Tmdb) providerIds.Tmdb = parsed.tmdbId;
            if (parsed.tvdbId && !providerIds.Tvdb) providerIds.Tvdb = parsed.tvdbId;
            if (parsed.aniListId && !providerIds.AniList) providerIds.AniList = parsed.aniListId;
            if (parsed.tvmazeId && !providerIds.TvMaze) providerIds.TvMaze = parsed.tvmazeId;
            if (!itemType && parsed.itemType) itemType = parsed.itemType;
        });

        const titleAndYear = getPageTitleAndYearFromDom(scopeRoot);
        return {
            providerIds,
            itemType,
            title: titleAndYear.title,
            year: titleAndYear.year
        };
    }

    function getFaviconUrl(domainOrUrl) {
        const raw = normalizeText(domainOrUrl);
        if (!raw) return '';

        let domain = raw;
        try {
            if (/^https?:\/\//i.test(raw)) {
                domain = new URL(raw).hostname;
            }
        } catch {
            domain = raw;
        }

        return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
    }

    function getAutoIconCandidates(domainOrUrl) {
        const raw = normalizeText(domainOrUrl);
        if (!raw) return [];

        let hostname = '';
        let origin = '';

        try {
            const parsed = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(`https://${raw}`);
            hostname = normalizeText(parsed.hostname);
            origin = normalizeText(parsed.origin);
        } catch {
            return [getFaviconUrl(raw)].filter(Boolean);
        }

        const candidates = [
            origin ? `${origin}/favicon.ico` : '',
            hostname ? `https://icons.duckduckgo.com/ip3/${hostname}.ico` : '',
            hostname ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}` : ''
        ].filter(Boolean);

        return Array.from(new Set(candidates));
    }

    function buildCustomHref(site, values) {
        const rawUrl = normalizeText(site?.url);
        if (!rawUrl) return '';

        if (site.useTemplate) {
            return rawUrl.replaceAll(/\{(imdbId|tmdbId|tvdbId|aniListId|tvmazeId|title|year)\}/g, (_, key) => {
                return values[key] || '';
            });
        }

        const sourceKey = ['imdbId', 'tmdbId', 'tvdbId', 'aniListId', 'tvmazeId'].includes(site?.idSource)
            ? site.idSource
            : 'imdbId';

        const sourceValue = values[sourceKey] || '';
        if (!sourceValue) return '';

        const separator = /[/?=&]$/.test(rawUrl) ? '' : '/';
        return `${rawUrl}${separator}${encodeURIComponent(sourceValue)}`;
    }

    function buildMetadataAndTrackerLinks(providerIds, itemType, title, year) {
        const ids = getCanonicalProviderMap(providerIds);
        const tmdbKind = /(series|season|episode|tv)/i.test(itemType) ? 'tv' : 'movie';
        const links = [];
        const values = {
            imdbId: ids.imdbId,
            tmdbId: ids.tmdbId,
            tvdbId: ids.tvdbId,
            aniListId: ids.aniListId,
            tvmazeId: ids.tvmazeId,
            title: encodeURIComponent(normalizeText(title)),
            year: normalizeText(year)
        };

        if (ids.imdbId) {
            links.push({
                id: 'imdb',
                href: `https://www.imdb.com/title/${ids.imdbId}/`,
                title: `IMDb (${ids.imdbId})`,
                label: 'IMDb',
                iconSrc: BUILTIN_ICON_SOURCES.imdb
            });
        }

        if (ids.tmdbId) {
            const tmdbCandidates = getAutoIconCandidates('themoviedb.org');
            links.push({
                id: 'tmdb',
                href: `https://www.themoviedb.org/${tmdbKind}/${ids.tmdbId}`,
                title: `TMDb (${ids.tmdbId})`,
                label: 'TMDb',
                iconSrc: BUILTIN_ICON_SOURCES.tmdb,
                iconCandidates: [BUILTIN_ICON_SOURCES.tmdb, ...tmdbCandidates].filter(Boolean)
            });
        }

        if (ids.tvdbId) {
            const tvdbCandidates = getAutoIconCandidates('thetvdb.com');
            links.push({
                id: 'tvdb',
                href: `https://thetvdb.com/dereferrer/${tmdbKind === 'tv' ? 'series' : 'movie'}/${ids.tvdbId}`,
                title: `TVDB (${ids.tvdbId})`,
                label: 'TVDB',
                iconSrc: BUILTIN_ICON_SOURCES.tvdb,
                iconCandidates: [BUILTIN_ICON_SOURCES.tvdb, ...tvdbCandidates].filter(Boolean)
            });
        }

        if (ids.tvmazeId) {
            const tvmazeCandidates = getAutoIconCandidates('tvmaze.com');
            links.push({
                id: 'tvmaze',
                href: `https://www.tvmaze.com/shows/${ids.tvmazeId}`,
                title: `TVmaze (${ids.tvmazeId})`,
                label: 'TVmaze',
                iconSrc: tvmazeCandidates[0] || '',
                iconCandidates: tvmazeCandidates
            });
        }

        if (ids.aniListId) {
            const anilistCandidates = getAutoIconCandidates('anilist.co');
            links.push({
                id: 'anilist',
                href: `https://anilist.co/anime/${ids.aniListId}/`,
                title: `AniList (${ids.aniListId})`,
                label: 'AniList',
                iconSrc: anilistCandidates[0] || '',
                iconCandidates: anilistCandidates
            });
        }

        const settings = loadSettings();
        if (Array.isArray(settings.customSites)) {
            settings.customSites.forEach((site, index) => {
                if (!site || site.enabled === false) return;

                const href = buildCustomHref(site, values);
                if (!href) return;

                const autoCandidates = getAutoIconCandidates(href);
                const explicitIcon = normalizeText(site.iconInput);
                const iconCandidates = explicitIcon
                    ? [explicitIcon]
                    : autoCandidates;

                links.push({
                    id: `custom-${index}`,
                    href,
                    title: site.name || `Custom ${index + 1}`,
                    label: site.name || `Custom ${index + 1}`,
                    iconSrc: iconCandidates[0] || '',
                    iconCandidates
                });
            });
        }

        return links;
    }

    function createTrackerIconImage(item, className) {
        const img = document.createElement('img');
        const candidates = Array.isArray(item.iconCandidates)
            ? item.iconCandidates.filter((value) => normalizeText(value) !== '')
            : [];

        if (normalizeText(item.iconSrc) && !candidates.includes(item.iconSrc)) {
            candidates.unshift(item.iconSrc);
        }

        let iconIndex = 0;
        let requestToken = 0;
        const applyNextIcon = () => {
            if (iconIndex >= candidates.length) {
                img.remove();
                return;
            }

            const currentIndex = iconIndex;
            const token = ++requestToken;
            const fallbackSource = candidates[currentIndex];
            img.src = fallbackSource;

            resolveIconSource(fallbackSource).then((resolvedSource) => {
                if (token !== requestToken || currentIndex !== iconIndex) return;
                const nextSource = normalizeText(resolvedSource) || fallbackSource;
                if (nextSource !== img.src) {
                    img.src = nextSource;
                }
            }).catch(() => {
                if (token !== requestToken || currentIndex !== iconIndex) return;
                img.src = fallbackSource;
            });
        };

        img.addEventListener('error', () => {
            iconIndex += 1;
            applyNextIcon();
        });
        applyNextIcon();
        img.alt = '';

        if (normalizeText(className)) {
            img.className = className;
        }

        return img;
    }

    function createTrackerAnchor(item, detailButtonsMode) {
        if (detailButtonsMode) {
            const button = document.createElement('button');
            button.type = 'button';
            button.title = item.title;
            button.setAttribute('aria-label', item.title);
            button.setAttribute('is', 'emby-button');
            button.className = 'fab detailButton detailButton-autotext emby-button fab-backdropfilter button-hoverable externalIdsQuickFabButton';

            const img = createTrackerIconImage(item, 'detailButton-autotext-icon fab-icon externalIdsQuickFabIcon');
            button.appendChild(img);

            const textNode = document.createElement('div');
            textNode.className = 'detailButton-autotext-text secondaryText button-text';
            textNode.textContent = normalizeText(item.label) || normalizeText(item.id).toUpperCase();
            button.appendChild(textNode);

            button.addEventListener('click', () => {
                pageContext.open(item.href, '_blank', 'noopener,noreferrer');
            });

            return button;
        }

        const anchor = document.createElement('a');
        anchor.href = item.href;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
        anchor.title = item.title;
        anchor.setAttribute('aria-label', item.title);
        anchor.setAttribute('is', 'emby-linkbutton');
        const img = createTrackerIconImage(item);

        anchor.classList.add('externalIdsQuickCompactLink');
        anchor.appendChild(img);

        return anchor;
    }

    function getTrackerHostContainer() {
        return getFirstVisibleElement(DETAIL_BUTTONS_SELECTOR)
            || getFirstVisibleElement(MEDIA_INFO_SELECTOR);
    }

    function ensureLinksContainer(hostContainer) {
        const existing = hostContainer.querySelector(`.${LINKS_ROW_CLASS}`);
        if (existing) return existing;

        const row = document.createElement('div');
        const isDetailButtons = hostContainer.matches?.(DETAIL_BUTTONS_SELECTOR);
        row.className = isDetailButtons
            ? `${LINKS_ROW_CLASS} externalIdsQuickLinksRow--detailButtons`
            : `mediaInfoItem ${LINKS_ROW_CLASS}`;
        row.dataset.externalIdsQuickLinks = '1';

        if (isDetailButtons) {
            hostContainer.appendChild(row);
        } else {
            const ratingContainer = hostContainer.querySelector('.starRatingContainer.mediaInfoItem, .starRatingContainer');
            if (ratingContainer && ratingContainer.parentElement === hostContainer) {
                ratingContainer.after(row);
            } else {
                hostContainer.appendChild(row);
            }
        }

        return row;
    }

    async function renderTrackerLinksForCurrentItem() {
        const hostContainer = getTrackerHostContainer();
        if (!(hostContainer instanceof HTMLElement)) {
            scheduleTrackerLinkRender(RETRY_RENDER_DELAY_MS);
            return;
        }

        const itemId = getCurrentItemId();
        if (!itemId) {
            scheduleTrackerLinkRender(RETRY_RENDER_DELAY_MS);
            return;
        }

        const metadata = collectProviderMetadataFromDom();
        const links = buildMetadataAndTrackerLinks(metadata.providerIds, metadata.itemType, metadata.title, metadata.year);
        const detailButtonsMode = Boolean(hostContainer.matches?.(DETAIL_BUTTONS_SELECTOR));

        const row = ensureLinksContainer(hostContainer);

        const settings = loadSettings();
        const signature = [
            links.map((item) => `${item.id}:${item.href}`).join('|'),
            settings.sortAlphabetically ? '1' : '0'
        ].join(':');

        if (row.dataset.externalIdsQuickSignature === signature) return;

        row.textContent = '';
        if (links.length === 0) {
            const retryCount = (emptyRenderRetriesByItemId.get(itemId) || 0) + 1;
            emptyRenderRetriesByItemId.set(itemId, retryCount);
            row.dataset.externalIdsQuickSignature = '';
            if (retryCount <= MAX_EMPTY_RENDER_RETRIES) {
                scheduleTrackerLinkRender(RETRY_RENDER_DELAY_MS);
            }
            return;
        }

        emptyRenderRetriesByItemId.delete(itemId);

        // Separate built-in trackers from custom sites
        const builtInTrackerIds = new Set(['imdb', 'tmdb', 'tvdb', 'tvmaze', 'anilist']);
        let builtInLinks = links.filter((item) => builtInTrackerIds.has(item.id));
        let customLinks = links.filter((item) => !builtInTrackerIds.has(item.id));

        // Filter trackers based on type setting and detected item type
        builtInLinks = builtInLinks.filter((item) => shouldShowTracker(getTrackerType(item, settings), metadata.itemType));
        customLinks = customLinks.filter((item) => shouldShowTracker(getTrackerType(item, settings), metadata.itemType));

        // Sort only custom links if enabled
        if (settings.sortAlphabetically === true) {
            customLinks.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
        }

        // Append built-in trackers first, then custom links
        [...builtInLinks, ...customLinks].forEach((item) => {
            row.appendChild(createTrackerAnchor(item, detailButtonsMode));
        });

        row.dataset.externalIdsQuickSignature = signature;
    }

    function scheduleTrackerLinkRender(delayMs = DEFAULT_RENDER_DELAY_MS) {
        if (renderTimer) {
            clearTimeout(renderTimer);
        }

        renderTimer = setTimeout(() => {
            renderTimer = null;
            renderTrackerLinksForCurrentItem().catch(() => {
                // Keep silent on render failures to avoid noisy console in normal browsing.
            });
        }, Number.isFinite(delayMs) && delayMs > 0 ? delayMs : DEFAULT_RENDER_DELAY_MS);
    }

    function createQuickSettingsButton(referenceButton) {
        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = `${referenceButton.className} ${QUICK_SETTINGS_BUTTON_CLASS}`;
        settingsBtn.title = 'Configure custom tracker links';
        settingsBtn.setAttribute('aria-label', 'Configure tracker links');
        settingsBtn.innerHTML = '<i class="md-icon autortl">settings</i>';
        settingsBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openSettingsModal();
        });
        return settingsBtn;
    }

    function attachQuickButtons(root) {
        const scope = root instanceof Element || root instanceof Document ? root : document;
        const editButtons = Array.from(scope.querySelectorAll(EDIT_BUTTON_SELECTOR));

        editButtons.forEach((editButton) => {
            if (!(editButton instanceof HTMLButtonElement)) return;

            const parent = editButton.parentElement;
            if (!parent) return;

            if (parent.querySelector(`.${QUICK_SETTINGS_BUTTON_CLASS}`)) return;
            const settingsBtn = createQuickSettingsButton(editButton);
            editButton.after(settingsBtn);
        });

        scheduleTrackerLinkRender();
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                if (node.matches?.(EDIT_BUTTON_SELECTOR)) {
                    attachQuickButtons(node.parentElement || document);
                } else {
                    attachQuickButtons(node);
                }

                if (node.matches?.(MEDIA_INFO_SELECTOR) || node.querySelector?.(MEDIA_INFO_SELECTOR)) {
                    scheduleTrackerLinkRender();
                }
            }
        }
    });

    function patchHistory() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            const result = originalPushState.apply(this, arguments);
            scheduleTrackerLinkRender();
            return result;
        };

        history.replaceState = function () {
            const result = originalReplaceState.apply(this, arguments);
            scheduleTrackerLinkRender();
            return result;
        };

        globalThis.addEventListener('popstate', () => {
            scheduleTrackerLinkRender();
        });
    }

    ensureStyles();
    attachQuickButtons(document);
    scheduleTrackerLinkRender();
    patchHistory();
    observer.observe(document.body, { childList: true, subtree: true });
})();