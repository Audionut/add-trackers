// ==UserScript==
// @name     PTP - lazy images in hidden elements
// @version  2
// @grant    none
// @match    https://passthepopcorn.me/forums.php?*
// @namespace https://passthepopcorn.me/user.php?id=111982#lazyimageloader
// @run-at document-end
// ==/UserScript==

'use strict';

function unhide(el) {
  for (const img of el.getElementsByTagName("img")) {
    if (img.classList.contains("lazy")) {
      const src = img.getAttribute("data-src");
      if (!src) {
        continue;
      }

      img.src = src;
      img.classList.remove("lazy");
    }
  }
}

function filtermuts(mutlist, obs) {
  for (const mutation of mutlist) {
    if (!mutation.target.classList.contains("hidden")) {
      unhide(mutation.target);
    }
  }
}

const obscfg = { attributes: true, attributeFilter: ["class"] };
const obs = new MutationObserver(filtermuts);

for (const hide_el of document.querySelectorAll(".forum-post blockquote.hidden")) {
  obs.observe(hide_el, obscfg);
  for (const img of hide_el.getElementsByTagName("img")) {
    if (img.classList.contains("lazy") || img.hasAttribute("data-src")) {
      continue;
    }

    const src = img.getAttribute("src");
    if (!src) {
      continue;
    }

    img.setAttribute("data-src", src);
    img.removeAttribute("src");
    img.classList.add("lazy");
  }
}
