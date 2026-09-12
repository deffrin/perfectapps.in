/*
 * Tawk.to live chat.
 *
 * The bubble loads on every page; it auto-opens only on the homepage.
 * Loaded after window.load + idle so it stays off the critical render path
 * and does not undo the render-blocking work done in styles.css.
 */
(function () {
  'use strict';

  /* ── 1. Tawk.to property ─────────────────────────────────────────────────
   * The two ids are the property id and widget id from
   * Tawk dashboard → Administration → Chat Widget. They are public by design
   * (they ship in the page to every visitor); they are not credentials.
   */
  var TAWK_SRC = 'https://embed.tawk.to/6aa4f73a0f09ed34497bc905/1k2a6bfn2';

  /* ── 2. Behaviour ────────────────────────────────────────────────────── */
  var AUTO_OPEN_PATHS   = ['/', '/index.html'];  // auto-open only here
  var AUTO_OPEN_DELAY   = 3000;   // ms after the widget is ready
  var AUTO_OPEN_MOBILE  = true;   // false = bubble only on phones (see note below)
  var REOPEN_AFTER_CLOSE = false; // false = if they close it, stay closed this session

  /* ────────────────────────────────────────────────────────────────────── */

  if (/PROPERTY_ID|WIDGET_ID/.test(TAWK_SRC)) {
    console.warn('[chat] Tawk.to is not configured yet — set TAWK_SRC in /chat.js');
    return;
  }

  var isAutoOpenPage = AUTO_OPEN_PATHS.indexOf(window.location.pathname) !== -1;
  var isMobile = window.matchMedia('(max-width: 640px)').matches;

  function dismissed() {
    try { return sessionStorage.getItem('chatDismissed') === '1'; } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem('chatDismissed', '1'); } catch (e) { /* private mode */ }
  }

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  // Lift the widget clear of the voice-introduction widget pinned bottom-right.
  window.Tawk_API.customStyle = {
    visibility: {
      desktop: { position: 'br', xOffset: 20, yOffset: 110 },
      mobile:  { position: 'br', xOffset: 10, yOffset: 100 }
    }
  };

  window.Tawk_API.onLoad = function () {
    if (!isAutoOpenPage || dismissed()) return;
    if (isMobile && !AUTO_OPEN_MOBILE) return;
    window.setTimeout(function () {
      if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
        window.Tawk_API.maximize();
      }
    }, AUTO_OPEN_DELAY);
  };

  window.Tawk_API.onChatMinimized = function () {
    if (!REOPEN_AFTER_CLOSE) remember();
  };

  function inject() {
    var s = document.createElement('script');
    s.async = true;
    s.src = TAWK_SRC;
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.head.appendChild(s);
  }

  function whenIdle(fn) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fn, { timeout: 2500 });
    } else {
      window.setTimeout(fn, 1200);
    }
  }

  if (document.readyState === 'complete') {
    whenIdle(inject);
  } else {
    window.addEventListener('load', function () { whenIdle(inject); });
  }
})();
