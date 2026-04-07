// ==UserScript==
// @name         Sonarr - Metadata Rating Links
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Add TVDB/TVMaze/IMDb/custom metadata links above the Links row on Sonarr series pages.
// @author       Audionut
// @match        http://localhost:8989/*
// @match        https://localhost:8989/*
// @match        http://127.0.0.1:8989/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE = {
        settings: 'sonarr_metadata_links_settings_v1'
    };

    const REDACTED_API_KEY_PLACEHOLDER = '<Redacted>';
    const BUILTIN_ICON_SOURCES = {
        tmdb: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTAuMjQgODEuNTIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeTE9IjQwLjc2IiB4Mj0iMTkwLjI0IiB5Mj0iNDAuNzYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM5MGNlYTEiLz48c3RvcCBvZmZzZXQ9Ii41NiIgc3RvcC1jb2xvcj0iIzNjYmVjOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwYjNlNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik0xMDUuNjcgMzYuMDZoNjYuOWExNy42NyAxNy42NyAwIDAwMTcuNjctMTcuNjZBMTcuNjcgMTcuNjcgMCAwMDE3Mi41Ny43M2gtNjYuOUExNy42NyAxNy42NyAwIDAwODggMTguNGExNy42NyAxNy42NyAwIDAwMTcuNjcgMTcuNjZ6bS04OCA0NWg3Ni45YTE3LjY3IDE3LjY3IDAgMDAxNy42Ny0xNy42NiAxNy42NyAxNy42NyAwIDAwLTE3LjY3LTE3LjY3aC03Ni45QTE3LjY3IDE3LjY3IDAgMDAwIDYzLjRhMTcuNjcgMTcuNjcgMCAwMDE3LjY3IDE3LjY2em0tNy4yNi00NS42NGg3LjhWNi45MmgxMC4xVjBoLTI4djYuOWgxMC4xem0yOC4xIDBoNy44VjguMjVoLjFsOSAyNy4xNWg2bDkuMy0yNy4xNWguMVYzNS40aDcuOFYwSDY2Ljc2bC04LjIgMjMuMWgtLjFMNTAuMzEgMGgtMTEuOHptMTEzLjkyIDIwLjI1YTE1LjA3IDE1LjA3IDAgMDAtNC41Mi01LjUyIDE4LjU3IDE4LjU3IDAgMDAtNi42OC0zLjA4IDMzLjU0IDMzLjU0IDAgMDAtOC4wNy0xaC0xMS43djM1LjRoMTIuNzVhMjQuNTggMjQuNTggMCAwMDcuNTUtMS4xNSAxOS4zNCAxOS4zNCAwIDAwNi4zNS0zLjMyIDE2LjI3IDE2LjI3IDAgMDA0LjM3LTUuNSAxNi45MSAxNi45MSAwIDAwMS42My03LjU4IDE4LjUgMTguNSAwIDAwLTEuNjgtOC4yNXpNMTQ1IDY4LjZhOC44IDguOCAwIDAxLTIuNjQgMy40IDEwLjcgMTAuNyAwIDAxLTQgMS44MiAyMS41NyAyMS41NyAwIDAxLTUgLjU1aC00LjA1di0yMWg0LjZhMTcgMTcgMCAwMTQuNjcuNjMgMTEuNjYgMTEuNjYgMCAwMTMuODggMS44N0E5LjE0IDkuMTQgMCAwMTE0NSA1OWE5Ljg3IDkuODcgMCAwMTEgNC41MiAxMS44OSAxMS44OSAwIDAxLTEgNS4wOHptNDQuNjMtLjEzYTggOCAwIDAwLTEuNTgtMi42MiA4LjM4IDguMzggMCAwMC0yLjQyLTEuODUgMTAuMzEgMTAuMzEgMCAwMC0zLjE3LTF2LS4xYTkuMjIgOS4yMiAwIDAwNC40Mi0yLjgyIDcuNDMgNy40MyAwIDAwMS42OC01IDguNDIgOC40MiAwIDAwLTEuMTUtNC42NSA4LjA5IDguMDkgMCAwMC0zLTIuNzIgMTIuNTYgMTIuNTYgMCAwMC00LjE4LTEuMyAzMi44NCAzMi44NCAwIDAwLTQuNjItLjMzaC0xMy4ydjM1LjRoMTQuNWEyMi40MSAyMi40MSAwIDAwNC43Mi0uNSAxMy41MyAxMy41MyAwIDAwNC4yOC0xLjY1IDkuNDIgOS40MiAwIDAwMy4xLTMgOC41MiA4LjUyIDAgMDAxLjItNC42OCA5LjM5IDkuMzkgMCAwMC0uNTUtMy4xOHptLTE5LjQyLTE1Ljc1aDUuM2ExMCAxMCAwIDAxMS44NS4xOCA2LjE4IDYuMTggMCAwMTEuNy41NyAzLjM5IDMuMzkgMCAwMTEuMjIgMS4xMyAzLjIyIDMuMjIgMCAwMS40OCAxLjgyIDMuNjMgMy42MyAwIDAxLS40MyAxLjggMy40IDMuNCAwIDAxLTEuMTIgMS4yIDQuOTIgNC45MiAwIDAxLTEuNTguNjUgNy41MSA3LjUxIDAgMDEtMS43Ny4yaC01LjY1em0xMS43MiAyMGEzLjkgMy45IDAgMDEtMS4yMiAxLjMgNC42NCA0LjY0IDAgMDEtMS42OC43IDguMTggOC4xOCAwIDAxLTEuODIuMmgtN3YtOGg1LjlhMTUuMzUgMTUuMzUgMCAwMTIgLjE1IDguNDcgOC40NyAwIDAxMi4wNS41NSA0IDQgMCAwMTEuNTcgMS4xOCAzLjExIDMuMTEgMCAwMS42MyAyIDMuNzEgMy43MSAwIDAxLS40MyAxLjkyeiIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==',
        tvdb: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAA2CAMAAAAGesyaAAAAqFBMVEUAAABs1ZH///9RoG2/v782a0lAQECAgIAbNiUIDglfvIBs1pIQEBBZr3dmyYkVKRxgYGAyX0FMk2REhlswMDDv7+9GiWApUTfPz89v15JSoG0+eVMlRjEOGxIgICASHRWwsLBwcHBSom4pUDciQy4gOSrf39+goKCQkJBCe1lUpHJMlWZQUFArUjhy2Jlpy4pZsH05bks5YEdozY5isH04blAyUz4eLCPbOFdaAAAAAXRSTlMAQObYZgAAArZJREFUWMO9mOl2qjAQgGcIUXYQUVuLVdu61253e/83u8cxMdwoQqiX749JDocvmcyYKADsQ0R8YynvORP4T/SxiMeG/MVx4bb08BJ+OObcWcCN8PAa0W2iiLXwxt+KIprgfzSLoo/m+A+GawqxCVswYoyN2IMJQ2xECiZwbIQHBWwik40EdEZYgNX2+lDAIjqy0QUdpw3JnzYk0IokakPC2pBsG0mGZhJ+MjD2QCPPTBGiwqMROhueAYJkbQs0yVIMr+aPZxK4xBQV+ekkHQF0B5ZCSTTsTCsUuEiqFfkEET8huLOsSgmR1JG8oKRH/QfEMQA5KiXK4l6XwDseeXPp6QhxAWurvmRAG1O68bmcOtGX944tPFpHlklQnl2Z3LUVHVtlKfxEvVj0YnnveJELmQXXUzgTlsNjrEyCk8LZ+UHtPaIfiB0ZBFV1kljEKx1bZZJj9L6oPaL2E+JP+a41VEkC1eelkojm6t4fmnBggYg7yMRLKyViyTN5bJ1L1PT7tCjZ4tCpLbGpb1OhlEpC6udyeybYWBKXSlRKpfS5oSuEDHVSLVmq/hVJX7w8l4VIqxuI/K+QyHqa07FVLolcCpN3LFIa8l2YWURWIZHPUckzTeKg4plGZNSI3zL/7yqKcS4ek8lPyER1f1y8X+WnmQSilAfdTqkkS2xL1KIenunR0uOci3k7IFBzWcCrwRekDbqkd3b290EQFxN7VVNCMdX34N3VJb57/ttyA9CtKZkFcCbBcKpJ5OKmPipGAB27hmSpasnFAtEwj/+ReHpMpflx3rUl6sKt6M4zKIDm7MCUEI25B1NYG5J+GxKOxjAw5QuN2YApDpoSuWBKbOyIwRw0wGPDngsNuMcahGP+y4mhMenVbGU7PnKm8F1ylJz/iwc3I9X/tvukwNwY54kCk1Jgbs1fyDwsK7JykskAAAAASUVORK5CYII=',
        tvmaze: 'data:image/png;base64,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',
        imdb: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2aWV3Qm94PSIwIDAgNTc1IDI4OS44MyIgd2lkdGg9IjU3NSIgaGVpZ2h0PSIyODkuODMiPjxkZWZzPjxwYXRoIGQ9Ik01NzUgMjQuOTFDNTczLjQ0IDEyLjE1IDU2My45NyAxLjk4IDU1MS45MSAwQzQ5OS4wNSAwIDc2LjE4IDAgMjMuMzIgMEMxMC4xMSAyLjE3IDAgMTQuMTYgMCAyOC42MUMwIDUxLjg0IDAgMjM3LjY0IDAgMjYwLjg2QzAgMjc2Ljg2IDEyLjM3IDI4OS44MyAyNy42NCAyODkuODNDNzkuNjMgMjg5LjgzIDQ5NS42IDI4OS44MyA1NDcuNTkgMjg5LjgzQzU2MS42NSAyODkuODMgNTczLjI2IDI3OC44MiA1NzUgMjY0LjU3QzU3NSAyMTYuNjQgNTc1IDQ4Ljg3IDU3NSAyNC45MVoiIGlkPSJkMXB3aGY5d3kyIj48L3BhdGg+PHBhdGggZD0iTTY5LjM1IDU4LjI0TDExNC45OCA1OC4yNEwxMTQuOTggMjMzLjg5TDY5LjM1IDIzMy44OUw2OS4zNSA1OC4yNFoiIGlkPSJnNWpqbnEyNnlTIj48L3BhdGg+PHBhdGggZD0iTTIwMS4yIDEzOS4xNUMxOTcuMjggMTEyLjM4IDE5NS4xIDk3LjUgMTk0LjY3IDk0LjUzQzE5Mi43NiA4MC4yIDE5MC45NCA2Ny43MyAxODkuMiA1Ny4wOUMxODUuMjUgNTcuMDkgMTY1LjU0IDU3LjA5IDEzMC4wNCA1Ny4wOUwxMzAuMDQgMjMyLjc0TDE3MC4wMSAyMzIuNzRMMTcwLjE1IDExNi43NkwxODYuOTcgMjMyLjc0TDIxNS40NCAyMzIuNzRMMjMxLjM5IDExNC4xOEwyMzEuNTQgMjMyLjc0TDI3MS4zOCAyMzIuNzRMMjcxLjM4IDU3LjA5TDIxMS43NyA1Ny4wOUwyMDEuMiAxMzkuMTVaIiBpZD0iaTNQcmgxSnBYdCI+PC9wYXRoPjxwYXRoIGQ9Ik0zNDYuNzEgOTMuNjNDMzQ3LjIxIDk1Ljg3IDM0Ny40NyAxMDAuOTUgMzQ3LjQ3IDEwOC44OUMzNDcuNDcgMTE1LjcgMzQ3LjQ3IDE3MC4xOCAzNDcuNDcgMTc2Ljk5QzM0Ny40NyAxODguNjggMzQ2LjcxIDE5NS44NCAzNDUuMiAxOTguNDhDMzQzLjY4IDIwMS4xMiAzMzkuNjQgMjAyLjQzIDMzMy4wOSAyMDIuNDNDMzMzLjA5IDE5MC45IDMzMy4wOSA5OC42NiAzMzMuMDkgODcuMTNDMzM4LjA2IDg3LjEzIDM0MS40NSA4Ny42NiAzNDMuMjUgODguN0MzNDUuMDUgODkuNzUgMzQ2LjIxIDkxLjM5IDM0Ni43MSA5My42M1pNMzY3LjMyIDIzMC45NUMzNzIuNzUgMjI5Ljc2IDM3Ny4zMSAyMjcuNjYgMzgxLjAxIDIyNC42N0MzODQuNyAyMjEuNjcgMzg3LjI5IDIxNy41MiAzODguNzcgMjEyLjIxQzM5MC4yNiAyMDYuOTEgMzkxLjE0IDE5Ni4zOCAzOTEuMTQgMTgwLjYzQzM5MS4xNCAxNzQuNDcgMzkxLjE0IDEyNS4xMiAzOTEuMTQgMTE4Ljk1QzM5MS4xNCAxMDIuMzMgMzkwLjQ5IDkxLjE5IDM4OS40OCA4NS41M0MzODguNDYgNzkuODYgMzg1LjkzIDc0LjcxIDM4MS44OCA3MC4wOUMzNzcuODIgNjUuNDcgMzcxLjkgNjIuMTUgMzY0LjEyIDYwLjEzQzM1Ni4zMyA1OC4xMSAzNDMuNjMgNTcuMDkgMzIxLjU0IDU3LjA5QzMxOS4yNyA1Ny4wOSAzMDcuOTMgNTcuMDkgMjg3LjUgNTcuMDlMMjg3LjUgMjMyLjc0TDM0Mi43OCAyMzIuNzRDMzU1LjUyIDIzMi4zNCAzNjMuNyAyMzEuNzUgMzY3LjMyIDIzMC45NVoiIGlkPSJhNG92OXJSR1FtIj48L3BhdGg+PHBhdGggZD0iTTQ2NC43NiAyMDQuN0M0NjMuOTIgMjA2LjkzIDQ2MC4yNCAyMDguMDYgNDU3LjQ2IDIwOC4wNkM0NTQuNzQgMjA4LjA2IDQ1Mi45MyAyMDYuOTggNDUyLjAxIDIwNC44MUM0NTEuMDkgMjAyLjY1IDQ1MC42NCAxOTcuNzIgNDUwLjY0IDE5MEM0NTAuNjQgMTg1LjM2IDQ1MC42NCAxNDguMjIgNDUwLjY0IDE0My41OEM0NTAuNjQgMTM1LjU4IDQ1MS4wNCAxMzAuNTkgNDUxLjg1IDEyOC42QzQ1Mi42NSAxMjYuNjMgNDU0LjQxIDEyNS42MyA0NTcuMTMgMTI1LjYzQzQ1OS45MSAxMjUuNjMgNDYzLjY0IDEyNi43NiA0NjQuNiAxMjkuMDNDNDY1LjU1IDEzMS4zIDQ2Ni4wMyAxMzYuMTUgNDY2LjAzIDE0My41OEM0NjYuMDMgMTQ2LjU4IDQ2Ni4wMyAxNjEuNTggNDY2LjAzIDE4OC41OUM0NjUuNzQgMTk3Ljg0IDQ2NS4zMiAyMDMuMjEgNDY0Ljc2IDIwNC43Wk00MDYuNjggMjMxLjIxTDQ0Ny43NiAyMzEuMjFDNDQ5LjQ3IDIyNC41IDQ1MC40MSAyMjAuNzcgNDUwLjYgMjIwLjAyQzQ1NC4zMiAyMjQuNTIgNDU4LjQxIDIyNy45IDQ2Mi45IDIzMC4xNEM0NjcuMzcgMjMyLjM5IDQ3NC4wNiAyMzMuNTEgNDc5LjI0IDIzMy41MUM0ODYuNDUgMjMzLjUxIDQ5Mi42NyAyMzEuNjIgNDk3LjkyIDIyNy44M0M1MDMuMTYgMjI0LjA1IDUwNi41IDIxOS41NyA1MDcuOTIgMjE0LjQyQzUwOS4zNCAyMDkuMjYgNTEwLjA1IDIwMS40MiA1MTAuMDUgMTkwLjg4QzUxMC4wNSAxODUuOTUgNTEwLjA1IDE0Ni41MyA1MTAuMDUgMTQxLjZDNTEwLjA1IDEzMSA1MDkuODEgMTI0LjA4IDUwOS4zNCAxMjAuODNDNTA4Ljg3IDExNy41OCA1MDcuNDcgMTE0LjI3IDUwNS4xNCAxMTAuODhDNTAyLjgxIDEwNy40OSA0OTkuNDIgMTA0Ljg2IDQ5NC45OCAxMDIuOThDNDkwLjU0IDEwMS4xIDQ4NS4zIDEwMC4xNiA0NzkuMjYgMTAwLjE2QzQ3NC4wMSAxMDAuMTYgNDY3LjI5IDEwMS4yMSA0NjIuODEgMTAzLjI4QzQ1OC4zNCAxMDUuMzUgNDU0LjI4IDEwOC40OSA0NTAuNjQgMTEyLjdDNDUwLjY0IDEwOC44OSA0NTAuNjQgODkuODUgNDUwLjY0IDU1LjU2TDQwNi42OCA1NS41Nkw0MDYuNjggMjMxLjIxWiIgaWQ9ImZrOTY4QnBzWCI+PC9wYXRoPjwvZGVmcz48Zz48Zz48Zz48dXNlIHhsaW5rOmhyZWY9IiNkMXB3aGY5d3kyIiBvcGFjaXR5PSIxIiBmaWxsPSIjZjZjNzAwIiBmaWxsLW9wYWNpdHk9IjEiPjwvdXNlPjxnPjx1c2UgeGxpbms6aHJlZj0iI2QxcHdoZjl3eTIiIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjxnPjx1c2UgeGxpbms6aHJlZj0iI2c1ampucTI2eVMiIG9wYWNpdHk9IjEiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMSI+PC91c2U+PGc+PHVzZSB4bGluazpocmVmPSIjZzVqam5xMjZ5UyIgb3BhY2l0eT0iMSIgZmlsbC1vcGFjaXR5PSIwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLW9wYWNpdHk9IjAiPjwvdXNlPjwvZz48L2c+PGc+PHVzZSB4bGluazpocmVmPSIjaTNQcmgxSnBYdCIgb3BhY2l0eT0iMSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1vcGFjaXR5PSIxIj48L3VzZT48Zz48dXNlIHhsaW5rOmhyZWY9IiNpM1ByaDFKcFh0IiBvcGFjaXR5PSIxIiBmaWxsLW9wYWNpdHk9IjAiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMCI+PC91c2U+PC9nPjwvZz48Zz48dXNlIHhsaW5rOmhyZWY9IiNhNG92OXJSR1FtIiBvcGFjaXR5PSIxIiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjEiPjwvdXNlPjxnPjx1c2UgeGxpbms6aHJlZj0iI2E0b3Y5clJHUW0iIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjxnPjx1c2UgeGxpbms6aHJlZj0iI2ZrOTY4QnBzWCIgb3BhY2l0eT0iMSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1vcGFjaXR5PSIxIj48L3VzZT48Zz48dXNlIHhsaW5rOmhyZWY9IiNmazk2OEJwc1giIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjwvZz48L2c+PC9zdmc+'
    };
    const FALLBACK_CUSTOM_ICON = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>')}`;

    const DEFAULT_SETTINGS = {
        sonarr: {
            baseUrl: '',
            apiKey: ''
        },
        customSites: [],
        faviconCache: {
            ttlMs: 7 * 24 * 60 * 60 * 1000,
            byOrigin: {}
        }
    };

    const metadataCache = new Map();
    const pendingFetches = new Map();
    let settingsCache = null;
    let updateTimer = null;

    function normalizeBaseUrl(value) {
        return String(value || '').trim().replace(/\/$/, '');
    }

    function cloneDefaultSettings() {
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    function createDefaultCustomSite() {
        return {
            enabled: true,
            name: '',
            url: '',
            iconInput: '',
            useTemplate: false
        };
    }

    function sanitizeSettings(raw) {
        const output = cloneDefaultSettings();

        if (!raw || typeof raw !== 'object') {
            return output;
        }

        if (raw.sonarr && typeof raw.sonarr === 'object') {
            output.sonarr.baseUrl = normalizeBaseUrl(raw.sonarr.baseUrl);
            output.sonarr.apiKey = String(raw.sonarr.apiKey || '').trim();
        }

        if (Array.isArray(raw.customSites)) {
            output.customSites = raw.customSites
                .map((site) => {
                    if (!site || typeof site !== 'object') {
                        return null;
                    }

                    const clean = createDefaultCustomSite();
                    clean.enabled = site.enabled !== false;
                    clean.name = String(site.name || '').trim();
                    clean.url = String(site.url || '').trim();
                    clean.iconInput = String(site.iconInput || '').trim();
                    clean.useTemplate = site.useTemplate === true;
                    return clean;
                })
                .filter(Boolean);
        }

        if (raw.faviconCache && typeof raw.faviconCache === 'object') {
            const ttlMs = Number(raw.faviconCache.ttlMs);
            output.faviconCache.ttlMs = Number.isFinite(ttlMs) && ttlMs > 0
                ? ttlMs
                : DEFAULT_SETTINGS.faviconCache.ttlMs;

            const byOrigin = raw.faviconCache.byOrigin && typeof raw.faviconCache.byOrigin === 'object'
                ? raw.faviconCache.byOrigin
                : {};

            Object.keys(byOrigin).forEach((origin) => {
                const entry = byOrigin[origin];
                if (!entry || typeof entry !== 'object') {
                    return;
                }

                output.faviconCache.byOrigin[origin] = {
                    iconUrl: String(entry.iconUrl || '').trim(),
                    fetchedAt: Number(entry.fetchedAt) || 0,
                    expiresAt: Number(entry.expiresAt) || 0,
                    failCount: Number(entry.failCount) || 0,
                    lastError: String(entry.lastError || '').trim()
                };
            });
        }

        return output;
    }

    async function saveSettings(nextSettings) {
        const sanitized = sanitizeSettings(nextSettings);
        settingsCache = sanitized;
        await GM.setValue(STORAGE.settings, sanitized);
        return sanitized;
    }

    async function loadSettings(forceRefresh) {
        if (!forceRefresh && settingsCache) {
            return settingsCache;
        }

        const stored = await GM.getValue(STORAGE.settings, null);
        const settings = sanitizeSettings(stored);
        settingsCache = settings;
        return settings;
    }

    function tryGetApiKeyFromPage() {
        if (globalThis.Sonarr && typeof globalThis.Sonarr.apiKey === 'string' && globalThis.Sonarr.apiKey.trim()) {
            return globalThis.Sonarr.apiKey.trim();
        }

        const runtimeApiKey = globalThis.__APP_CONFIG__ && typeof globalThis.__APP_CONFIG__.apiKey === 'string'
            ? globalThis.__APP_CONFIG__.apiKey.trim()
            : '';

        return runtimeApiKey;
    }

    async function getConfig() {
        const settings = await loadSettings();
        return {
            baseUrl: settings.sonarr.baseUrl || globalThis.location.origin,
            apiKey: settings.sonarr.apiKey || tryGetApiKeyFromPage()
        };
    }

    function gmRequest(options) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                ...options,
                onload: resolve,
                onerror: () => reject(new Error(`Request failed: ${options.url}`)),
                ontimeout: () => reject(new Error(`Request timed out: ${options.url}`))
            });
        });
    }

    function getSeriesSlugFromPathname(pathname) {
        const match = String(pathname || '').match(/\/series\/([^/?#]+)/i);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function getTvdbIdFromPathText() {
        const candidates = [
            document.querySelector('span[class*="SeriesDetails-path"]')?.textContent || '',
            document.body ? document.body.textContent || '' : ''
        ];

        for (let i = 0; i < candidates.length; i += 1) {
            const text = candidates[i];
            const match = text.match(/\{tvdb-(\d+)\}/i);
            if (match) {
                return match[1];
            }
        }

        return '';
    }

    function buildSeriesLookupTerms() {
        const terms = [];
        const tvdbId = getTvdbIdFromPathText();
        if (tvdbId) {
            terms.push(`tvdb:${tvdbId}`);
        }

        const slug = getSeriesSlugFromPathname(globalThis.location.pathname);
        if (slug) {
            terms.push(slug.replace(/-/g, ' '));
            terms.push(slug);
        }

        const title = document.querySelector('div[class*="SeriesDetails-title"]')?.textContent || '';
        if (title.trim()) {
            terms.push(title.trim());
        }

        return Array.from(new Set(terms.filter(Boolean)));
    }

    async function fetchSeriesLookup() {
        const config = await getConfig();
        if (!config.baseUrl || !config.apiKey) {
            throw new Error('Missing Sonarr API key. Use menu: Sonarr Metadata Links - Configure API.');
        }

        const terms = buildSeriesLookupTerms();
        if (!terms.length) {
            return null;
        }

        for (let i = 0; i < terms.length; i += 1) {
            const term = terms[i];
            const url = `${config.baseUrl}/api/v3/series/lookup?term=${encodeURIComponent(term)}`;
            const response = await gmRequest({
                method: 'GET',
                url,
                timeout: 10000,
                headers: {
                    Accept: 'application/json',
                    'X-Api-Key': config.apiKey
                }
            });

            if (response.status < 200 || response.status >= 300) {
                continue;
            }

            let payload;
            try {
                payload = JSON.parse(response.responseText || '[]');
            } catch (_error) {
                continue;
            }

            if (!Array.isArray(payload) || payload.length === 0) {
                continue;
            }

            const tvdbId = getTvdbIdFromPathText();
            if (tvdbId) {
                const exactTvdb = payload.find((item) => String(item?.tvdbId || '') === String(tvdbId));
                if (exactTvdb) {
                    return exactTvdb;
                }
            }

            const title = (document.querySelector('div[class*="SeriesDetails-title"]')?.textContent || '').trim().toLowerCase();
            if (title) {
                const titleMatch = payload.find((item) => String(item?.title || '').trim().toLowerCase() === title);
                if (titleMatch) {
                    return titleMatch;
                }
            }

            return payload[0] || null;
        }

        return null;
    }

    async function getSeriesMetadata(seriesKey) {
        if (metadataCache.has(seriesKey)) {
            return metadataCache.get(seriesKey);
        }

        if (pendingFetches.has(seriesKey)) {
            return pendingFetches.get(seriesKey);
        }

        const fetchPromise = fetchSeriesLookup()
            .then((metadata) => {
                metadataCache.set(seriesKey, metadata);
                pendingFetches.delete(seriesKey);
                return metadata;
            })
            .catch((error) => {
                pendingFetches.delete(seriesKey);
                throw error;
            });

        pendingFetches.set(seriesKey, fetchPromise);
        return fetchPromise;
    }

    function buildCustomHref(site, values) {
        const rawUrl = String(site?.url || '').trim();
        if (!rawUrl) {
            return '';
        }

        if (site.useTemplate) {
            const tokenMap = {
                imdbid: 'imdbId',
                tvdbid: 'tvdbId',
                tvmazeid: 'tvMazeId',
                title: 'title',
                year: 'year'
            };

            const result = rawUrl.replace(/\{\s*([a-z0-9_]+)\s*\}/gi, (_full, token) => {
                const key = tokenMap[String(token || '').toLowerCase()];
                return key ? String(values[key] || '') : '';
            });

            return result;
        }

        if (!values.tvdbId) {
            return '';
        }

        return `${rawUrl}${encodeURIComponent(values.tvdbId)}`;
    }

    function isLikelyImageUrl(value) {
        if (!value) {
            return false;
        }

        if (/^data:image\//i.test(value)) {
            return true;
        }

        try {
            const parsed = new URL(value);
            return /^https?:$/i.test(parsed.protocol);
        } catch (_error) {
            return false;
        }
    }

    function getCustomIconSource(site) {
        const iconInput = String(site?.iconInput || '').trim();
        if (isLikelyImageUrl(iconInput)) {
            return iconInput;
        }

        try {
            const url = new URL(String(site?.url || '').trim());
            if (/^https?:$/i.test(url.protocol)) {
                return `${url.origin}/favicon.ico`;
            }
        } catch (_error) {
        }

        return FALLBACK_CUSTOM_ICON;
    }

    function createModalField(labelText, input) {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'block';
        wrapper.style.fontSize = '13px';
        wrapper.style.marginBottom = '10px';

        const label = document.createElement('div');
        label.textContent = labelText;
        label.style.fontWeight = '600';
        label.style.marginBottom = '4px';

        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '8px';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '6px';
        input.style.background = '#1f1f1f';
        input.style.color = '#fff';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    function styleModalInput(input) {
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '8px';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '6px';
        input.style.background = '#1f1f1f';
        input.style.color = '#fff';
    }

    function createCustomSiteEditor(site, index, totalSites, onMove, onDelete) {
        if (typeof site._uiCollapsed !== 'boolean') {
            site._uiCollapsed = true;
        }

        const card = document.createElement('div');
        card.style.border = '1px solid #333';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.marginBottom = '10px';
        card.style.background = '#171717';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';
        header.style.gap = '10px';
        header.style.cursor = 'pointer';

        const title = document.createElement('strong');
        title.style.flex = '1';
        title.style.minWidth = '140px';
        title.textContent = site.name || `Custom Site ${index + 1}`;

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '6px';

        const upButton = document.createElement('button');
        upButton.type = 'button';
        upButton.textContent = '↑';
        upButton.disabled = index === 0;

        const downButton = document.createElement('button');
        downButton.type = 'button';
        downButton.textContent = '↓';
        downButton.disabled = index >= totalSites - 1;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';

        [upButton, downButton, deleteButton].forEach((button) => {
            button.style.padding = '6px 8px';
            button.style.border = '1px solid #666';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            button.style.background = '#252525';
            button.style.color = '#fff';
            if (button.disabled) {
                button.style.opacity = '0.55';
                button.style.cursor = 'default';
            }
        });

        upButton.addEventListener('click', () => onMove(index, -1));
        downButton.addEventListener('click', () => onMove(index, 1));
        deleteButton.addEventListener('click', () => onDelete(index));

        controls.appendChild(upButton);
        controls.appendChild(downButton);
        controls.appendChild(deleteButton);

        header.appendChild(title);
        header.appendChild(controls);

        const body = document.createElement('div');
        body.style.display = site._uiCollapsed ? 'none' : 'block';

        const setCollapsed = (collapsed) => {
            site._uiCollapsed = collapsed;
            body.style.display = collapsed ? 'none' : 'block';
            header.style.marginBottom = collapsed ? '0' : '8px';
        };

        header.addEventListener('click', (event) => {
            if (event.target && (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT')) {
                return;
            }

            setCollapsed(!site._uiCollapsed);
        });

        setCollapsed(site._uiCollapsed);

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

        body.appendChild(enabledRow);
        body.appendChild(useTemplateRow);
        body.appendChild(createModalField('Site Title', nameInput));
        body.appendChild(createModalField('Site URL', urlInput));
        body.appendChild(createModalField('Site Icon (optional)', iconInput));

        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    async function openSettingsModal() {
        const existing = document.getElementById('sonarr-links-settings-overlay');
        if (existing) {
            existing.remove();
        }

        const settings = await loadSettings();

        const overlay = document.createElement('div');
        overlay.id = 'sonarr-links-settings-overlay';
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
        title.textContent = 'Sonarr Metadata Links Settings';
        title.style.margin = '0 0 14px';
        title.style.fontSize = '18px';

        const sonarrBaseInput = document.createElement('input');
        sonarrBaseInput.type = 'text';
        sonarrBaseInput.placeholder = globalThis.location.origin;
        sonarrBaseInput.value = settings.sonarr.baseUrl || '';

        const sonarrKeyInput = document.createElement('input');
        sonarrKeyInput.type = 'text';
        sonarrKeyInput.placeholder = 'Optional if Sonarr runtime key is available';
        let apiKeyEdited = false;
        if ((settings.sonarr.apiKey || '').trim()) {
            sonarrKeyInput.value = REDACTED_API_KEY_PLACEHOLDER;
        } else {
            sonarrKeyInput.value = '';
        }
        sonarrKeyInput.addEventListener('input', () => {
            apiKeyEdited = true;
        });

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
        sitesContainer.style.maxHeight = '42vh';
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

        const helper = document.createElement('div');
        helper.textContent = 'When template mode is enabled, URL supports {imdbId}, {tvdbId}, {tvMazeId}, {title}, {year}. Without template mode, TVDB ID is appended. Site icon field is validated like Radarr config handling.';
        helper.style.fontSize = '12px';
        helper.style.opacity = '0.8';
        helper.style.marginBottom = '12px';

        const status = document.createElement('div');
        status.style.minHeight = '18px';
        status.style.fontSize = '12px';
        status.style.marginBottom = '10px';
        status.style.color = '#9ecbff';

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

        const clearCacheButton = document.createElement('button');
        clearCacheButton.type = 'button';
        clearCacheButton.textContent = 'Clear Favicon Cache';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';

        [saveButton, clearCacheButton, cancelButton].forEach((button) => {
            button.style.padding = '8px 10px';
            button.style.border = '1px solid #666';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            button.style.background = '#252525';
            button.style.color = '#fff';
        });

        actions.appendChild(saveButton);
        actions.appendChild(clearCacheButton);
        actions.appendChild(cancelButton);

        modalContent.appendChild(title);
        modalContent.appendChild(createModalField('Sonarr Base URL', sonarrBaseInput));
        modalContent.appendChild(createModalField('Sonarr API Key', sonarrKeyInput));
        modalContent.appendChild(customSection);
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

        clearCacheButton.addEventListener('click', async () => {
            const latest = await loadSettings();
            latest.faviconCache.byOrigin = {};
            await saveSettings(latest);
            status.textContent = 'Favicon cache cleared.';
        });

        saveButton.addEventListener('click', async () => {
            const latest = await loadSettings();
            latest.sonarr.baseUrl = normalizeBaseUrl(sonarrBaseInput.value || '');

            if (!apiKeyEdited && (settings.sonarr.apiKey || '').trim()) {
                latest.sonarr.apiKey = settings.sonarr.apiKey;
            } else {
                const apiValue = (sonarrKeyInput.value || '').trim();
                latest.sonarr.apiKey = apiValue === REDACTED_API_KEY_PLACEHOLDER ? settings.sonarr.apiKey : apiValue;
            }

            latest.customSites = workingSites
                .map((site) => ({ ...createDefaultCustomSite(), ...site }))
                .filter((site) => String(site.url || '').trim())
                .map((site) => {
                    return {
                        enabled: site.enabled !== false,
                        useTemplate: site.useTemplate === true,
                        name: String(site.name || '').trim(),
                        url: String(site.url || '').trim(),
                        iconInput: String(site.iconInput || '').trim()
                    };
                });

            const invalidIcon = latest.customSites.find((site) => {
                return site.iconInput && !isLikelyImageUrl(site.iconInput);
            });

            if (invalidIcon) {
                status.textContent = 'Each custom icon must be a valid image URL or data:image base64 string.';
                return;
            }

            await saveSettings(latest);
            overlay.remove();
            globalThis.location.reload();
        });
    }

    function buildLinkMap(metadata, settings) {
        const tmdbId = String(metadata?.tmdbId || '').trim();
        const tvdbId = String(metadata?.tvdbId || '').trim();
        const tvMazeId = String(metadata?.tvMazeId || '').trim();
        const imdbId = String(metadata?.imdbId || '').trim();
        const title = String(metadata?.title || '').trim();
        const year = String(metadata?.year || '').trim();

        const values = {
            tmdbId,
            tvdbId,
            tvMazeId,
            imdbId,
            title: encodeURIComponent(title),
            year
        };

        const customLinks = Array.isArray(settings.customSites)
            ? settings.customSites
                .map((site, index) => {
                    if (!site || site.enabled === false) {
                        return null;
                    }

                    const href = buildCustomHref(site, values);
                    if (!href) {
                        return null;
                    }

                    return {
                        id: `custom-${index}`,
                        href,
                        title: site.name || 'Custom link',
                        label: site.name || `Custom ${index + 1}`,
                        iconSrc: getCustomIconSource(site)
                    };
                })
                .filter(Boolean)
            : [];

        return {
            tmdb: tmdbId
                ? {
                    href: `https://www.themoviedb.org/tv/${tmdbId}`,
                    title: `TMDB ID: ${tmdbId}`,
                    label: 'TMDB',
                    iconSrc: BUILTIN_ICON_SOURCES.tmdb
                }
                : null,
            tvdb: tvdbId
                ? {
                    href: `https://thetvdb.com/dereferrer/series/${tvdbId}`,
                    title: `TVDB ID: ${tvdbId}`,
                    label: 'TVDB',
                    iconSrc: BUILTIN_ICON_SOURCES.tvdb
                }
                : null,
            tvmaze: tvMazeId
                ? {
                    href: `https://www.tvmaze.com/shows/${tvMazeId}`,
                    title: `TVMaze ID: ${tvMazeId}`,
                    label: 'TVMaze',
                    iconSrc: BUILTIN_ICON_SOURCES.tvmaze
                }
                : null,
            imdb: imdbId
                ? {
                    href: `https://www.imdb.com/title/${imdbId}/`,
                    title: `IMDb ID: ${imdbId}`,
                    label: 'IMDb',
                    iconSrc: BUILTIN_ICON_SOURCES.imdb
                }
                : null,
            customLinks
        };
    }

    function createLinkAnchor(item, referenceElement) {
        const anchor = document.createElement('a');
        anchor.href = item.href;
        anchor.title = item.title || item.label || '';
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
        anchor.style.display = 'inline-flex';
        anchor.style.alignItems = 'center';
        anchor.style.lineHeight = '0';

        if (item.iconSrc) {
            const img = document.createElement('img');
            img.alt = item.label || 'Link';
            img.src = item.iconSrc;
            const referenceHeight = referenceElement ? referenceElement.getBoundingClientRect().height : 0;
            img.style.height = referenceHeight > 0 ? `${Math.round(referenceHeight * 1.12)}px` : '23px';
            img.style.display = 'block';
            img.style.verticalAlign = 'middle';
            img.style.transform = 'translateY(6px)';
            anchor.appendChild(img);
        }

        return anchor;
    }

    function getMetadataInsertionContext() {
        const detailsRow = document.querySelector('div[class*="SeriesDetails-details-"]');
        if (!detailsRow || !detailsRow.parentElement) {
            return null;
        }

        const referenceElement =
            detailsRow.querySelector('span[class*="HeartRating-rating"] svg') ||
            detailsRow.querySelector('svg[class*="Icon-default"]') ||
            detailsRow.querySelector('span[class*="SeriesDetails-runtime"]');

        return {
            detailsRow,
            parent: detailsRow.parentElement,
            referenceElement: referenceElement || detailsRow
        };
    }

    function ensureMetadataRow(context) {
        const existing = context.parent.querySelector('div[data-sonarr-metadata-links-row="1"]');
        if (existing) {
            return existing;
        }

        const row = document.createElement('div');
        row.dataset.sonarrMetadataLinksRow = '1';
        row.className = context.detailsRow.className || 'SeriesDetails-links-jRNp_';
        row.style.marginTop = '4px';
        row.style.marginBottom = '18px';
        row.style.display = 'inline-flex';
        row.style.alignItems = 'center';
        row.style.flexWrap = 'wrap';
        row.style.gap = '12px';

        context.parent.insertBefore(row, context.detailsRow.nextSibling);
        return row;
    }

    function renderMetadataLinks(linkMap) {
        const context = getMetadataInsertionContext();
        if (!context) {
            return;
        }

        const row = ensureMetadataRow(context);

        const ordered = [linkMap.tmdb, linkMap.tvdb, linkMap.tvmaze, linkMap.imdb].filter(Boolean);
        if (Array.isArray(linkMap.customLinks)) {
            ordered.push(...linkMap.customLinks.filter(Boolean));
        }

        const nextSignature = ordered
            .map((item) => `${item.href}|${item.title || ''}|${item.iconSrc || ''}`)
            .join('||');

        if (row.dataset.sonarrMetadataSignature === nextSignature) {
            return;
        }

        row.textContent = '';

        if (!ordered.length) {
            row.dataset.sonarrMetadataSignature = '';
            return;
        }

        ordered.forEach((item) => {
            row.appendChild(createLinkAnchor(item, context.referenceElement));
        });

        row.dataset.sonarrMetadataSignature = nextSignature;
    }

    async function updatePageLinks() {
        if (!/\/series\//i.test(globalThis.location.pathname)) {
            return;
        }

        const seriesKey = `${globalThis.location.pathname}|${getTvdbIdFromPathText()}`;

        try {
            const settings = await loadSettings();
            const metadata = await getSeriesMetadata(seriesKey);
            if (!metadata) {
                return;
            }

            const linkMap = buildLinkMap(metadata, settings);
            renderMetadataLinks(linkMap);
        } catch (error) {
            console.warn('Sonarr metadata links:', error.message || error);
        }
    }

    function scheduleUpdate() {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }

        updateTimer = setTimeout(() => {
            updateTimer = null;
            updatePageLinks();
        }, 150);
    }

    function patchHistory() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            const result = originalPushState.apply(this, arguments);
            scheduleUpdate();
            return result;
        };

        history.replaceState = function () {
            const result = originalReplaceState.apply(this, arguments);
            scheduleUpdate();
            return result;
        };

        globalThis.addEventListener('popstate', scheduleUpdate);
    }

    function observeDomChanges() {
        const observer = new MutationObserver(() => {
            scheduleUpdate();
        });

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true
        });
    }

    GM.registerMenuCommand('Sonarr: Open Settings', () => {
        openSettingsModal();
    });

    patchHistory();
    observeDomChanges();
    scheduleUpdate();
})();
