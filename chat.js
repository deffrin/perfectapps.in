/*
 * Tawk.to live chat.
 *
 * The bubble loads on every page; it auto-opens only on the homepage.
 * Loaded after window.load + idle so it stays off the critical render path
 * and does not undo the render-blocking work done in styles.css.
 *
 * The greeting message itself is NOT set here. Tawk has no client-side API for
 * injecting an agent message, so the text lives in a dashboard Trigger
 * (Administration -> Triggers). What this file does is feed that trigger the
 * context it needs: a custom event on landing, plus visitor attributes the
 * agent can see in the sidebar. See "Interactive greeting" below.
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
  var AUTO_OPEN_PATHS    = ['/', '/index.html'];  // auto-open only here
  var AUTO_OPEN_DELAY    = 3000;   // ms after the widget is ready
  var AUTO_OPEN_MOBILE   = true;   // false = bubble only on phones
  var REOPEN_AFTER_CLOSE = false;  // false = if they close it, stay closed this session

  /* ── 3. Interactive greeting ─────────────────────────────────────────────
   * These fire a custom Tawk event so a dashboard Trigger can answer with a
   * message. In Tawk: Administration → Triggers → Add Trigger
   *     When:   Custom event is fired   →   perfectapps_landing
   *     Do:     Send a message as <your operator>
   * Page-specific events let one trigger greet a homepage visitor and another
   * greet someone reading a case study.
   */
  var FIRE_EVENTS = true;
  var EVENT_NAME  = 'perfectapps_landing';

  /* ────────────────────────────────────────────────────────────────────── */

  if (/PROPERTY_ID|WIDGET_ID/.test(TAWK_SRC)) {
    console.warn('[chat] Tawk.to is not configured yet — set TAWK_SRC in /chat.js');
    return;
  }

  var path = window.location.pathname;
  var isAutoOpenPage = AUTO_OPEN_PATHS.indexOf(path) !== -1;
  var isMobile = window.matchMedia('(max-width: 640px)').matches;

  // A coarse label so one trigger can branch on where the visitor actually is.
  function pageKind() {
    if (isAutoOpenPage) return 'homepage';
    if (path.indexOf('/work/') === 0) return path === '/work/' ? 'work-index' : 'case-study';
    if (path.indexOf('privacy') !== -1 || path.indexOf('terms') !== -1) return 'legal';
    return 'other';
  }

  function dismissed() {
    try { return sessionStorage.getItem('chatDismissed') === '1'; } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem('chatDismissed', '1'); } catch (e) { /* private mode */ }
  }

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  window.Tawk_API.customStyle = {
    visibility: {
      desktop: { position: 'br', xOffset: 20, yOffset: 20 },
      mobile:  { position: 'br', xOffset: 10, yOffset: 20 }
    }
  };

  window.Tawk_API.onLoad = function () {
    var api = window.Tawk_API;

    if (FIRE_EVENTS) {
      // Visible to the operator in the sidebar, and usable as trigger conditions.
      if (typeof api.setAttributes === 'function') {
        api.setAttributes({
          page: pageKind(),
          pageTitle: document.title,
          pagePath: path,
          referrer: document.referrer || 'direct'
        }, function (err) { if (err) console.warn('[chat] setAttributes', err); });
      }
      // The hook a dashboard Trigger listens for.
      if (typeof api.addEvent === 'function') {
        api.addEvent(EVENT_NAME, { page: pageKind(), path: path },
          function (err) { if (err) console.warn('[chat] addEvent', err); });
      }
    }

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
