/*
 * Tawk.to live chat.
 *
 * Tawk's standard embed snippet, plus two documented API members used to open
 * the panel by itself on the homepage:
 *
 *   Tawk_API.onLoad    -- callback, fires "right after the widget is rendered"
 *   Tawk_API.maximize()-- method, "enlarge the chat widget"
 *
 * Reference: https://developer.tawk.to/jsapi/
 *
 * Everything else about the widget -- position, colours, the greeting a
 * visitor reads, notification sound, offline behaviour -- is configured in the
 * Tawk dashboard rather than here.
 */
(function () {
  'use strict';

  // Open the panel on these paths only.
  var AUTO_OPEN_PATHS = ['/', '/index.html'];
  var AUTO_OPEN_DELAY = 2000;

  var Tawk_API = window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  if (AUTO_OPEN_PATHS.indexOf(window.location.pathname) !== -1) {
    Tawk_API.onLoad = function () {
      window.setTimeout(function () {
        Tawk_API.maximize();
      }, AUTO_OPEN_DELAY);
    };
  }

  // Tawk's standard embed snippet.
  (function () {
    var s1 = document.createElement("script"),
        s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/6aa4f73a0f09ed34497bc905/1k2a6bfn2';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
  })();
})();
