/*
 * Tawk.to live chat.
 *
 * The bubble loads on every page. On the homepage the panel opens itself a
 * couple of seconds after landing.
 *
 * Tawk is injected after window.load + idle so it stays off the critical
 * render path and does not undo the render-blocking work done in styles.css.
 *
 * Note: the message a visitor reads when the panel opens is NOT set here.
 * Tawk has no client-side API for injecting an operator message, so it comes
 * from the dashboard — either Administration -> Chat Widget -> Content for a
 * static greeting, or Administration -> Triggers for a conditional one. The
 * addEvent/setAttributes calls below give a trigger something to fire on.
 */
(function () {
  'use strict';

  /* ── 1. Tawk.to property ─────────────────────────────────────────────────
   * Property id and widget id from Tawk dashboard → Administration → Chat
   * Widget. Public by design (they ship to every visitor); not credentials.
   */
  var TAWK_SRC = 'https://embed.tawk.to/6aa4f73a0f09ed34497bc905/1k2a6bfn2';

  /* ── 2. Behaviour ────────────────────────────────────────────────────── */
  var AUTO_OPEN_PATHS    = ['/', '/index.html'];  // open the panel only here
  var AUTO_OPEN_DELAY    = 2000;   // ms after the widget is ready
  var AUTO_OPEN_MOBILE   = true;   // false = bubble only on phones
  var REOPEN_AFTER_CLOSE = false;  // false = once they close it, stay closed this session
  var EVENT_NAME         = 'perfectapps_landing';
  var PLAY_SOUND         = true;   // chime when the panel opens itself
  var SOUND_VOLUME       = 0.12;   // 0-1; keep it quiet, it is unsolicited

  /* ────────────────────────────────────────────────────────────────────── */

  if (/PROPERTY_ID|WIDGET_ID/.test(TAWK_SRC)) {
    console.warn('[chat] Tawk.to is not configured — set TAWK_SRC in /chat.js');
    return;
  }

  var path = window.location.pathname;
  var isAutoOpenPage = AUTO_OPEN_PATHS.indexOf(path) !== -1;
  var isMobile = window.matchMedia('(max-width: 640px)').matches;
  var weOpenedIt = false;

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

  /* ── Notification chime ──────────────────────────────────────────────────
   * Synthesised with Web Audio rather than loaded as a file: no asset, no
   * request, a few hundred bytes of code.
   *
   * Browsers refuse to start audio until the page has had a real user gesture,
   * so an AudioContext created on a cold landing stays "suspended" and the
   * chime is silently skipped. To make it work as often as it legitimately
   * can, we unlock the context on the visitor's first interaction — if they
   * click, tap or press a key before the panel opens, the chime plays.
   */
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx = null;

  function unlockAudio() {
    if (actx || !AC) return;
    try {
      actx = new AC();
      if (actx.state === 'suspended' && typeof actx.resume === 'function') {
        actx.resume().catch(function () {});
      }
    } catch (e) { actx = null; }
  }

  if (PLAY_SOUND && AC) {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, unlockAudio, { once: true, passive: true });
    });
  }

  function chime() {
    if (!PLAY_SOUND || !AC) return;
    unlockAudio();
    if (!actx || actx.state !== 'running') return;  // autoplay still blocked
    try {
      var t = actx.currentTime;
      [[880, 0], [1174.66, 0.1]].forEach(function (note) {
        var osc = actx.createOscillator();
        var gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.value = note[0];
        gain.gain.setValueAtTime(0.0001, t + note[1]);
        gain.gain.exponentialRampToValueAtTime(SOUND_VOLUME, t + note[1] + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + note[1] + 0.3);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(t + note[1]);
        osc.stop(t + note[1] + 0.32);
      });
    } catch (e) { /* never let a chime break the chat */ }
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

    if (typeof api.setAttributes === 'function') {
      api.setAttributes({
        page: pageKind(),
        pageTitle: document.title,
        pagePath: path,
        referrer: document.referrer || 'direct'
      }, function () {});
    }
    if (typeof api.addEvent === 'function') {
      api.addEvent(EVENT_NAME, { page: pageKind(), path: path }, function () {});
    }

    if (!isAutoOpenPage || dismissed()) return;
    if (isMobile && !AUTO_OPEN_MOBILE) return;

    window.setTimeout(function () {
      if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
        weOpenedIt = true;
        window.Tawk_API.maximize();
        chime();
      }
    }, AUTO_OPEN_DELAY);
  };

  /* Tawk fires onChatMinimized when the widget first renders as a bubble, not
     only when a visitor closes the panel. Treat it as a dismissal only after
     the panel has actually been open, otherwise the auto-open suppresses
     itself before it ever runs. */
  window.Tawk_API.onChatMaximized = function () { weOpenedIt = true; };
  window.Tawk_API.onChatMinimized = function () {
    if (weOpenedIt && !REOPEN_AFTER_CLOSE) remember();
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
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2500 });
    else window.setTimeout(fn, 1200);
  }
  if (document.readyState === 'complete') whenIdle(inject);
  else window.addEventListener('load', function () { whenIdle(inject); });
})();
