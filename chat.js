/*
 * Perfect Apps live chat.
 *
 * Two parts:
 *   1. A first-party "greeting card" — avatar, name, online dot and a real
 *      question — that slides in bottom-right a few seconds after landing.
 *      This is the proactive message; it is ours, so it needs no Tawk
 *      dashboard configuration and renders even before Tawk is ready.
 *   2. Tawk.to, which handles the actual conversation. Clicking the card
 *      (or a quick reply) opens it.
 *
 * Tawk has no client-side API for injecting an operator message, which is why
 * the greeting is drawn here rather than sent through Tawk. A dashboard
 * Trigger can still send a message *inside* the panel once it opens; the
 * addEvent/setAttributes calls below give such triggers something to fire on.
 *
 * Tawk is loaded after window.load + idle so it stays off the critical render
 * path and does not undo the render-blocking work done in styles.css.
 */
(function () {
  'use strict';

  /* ── 1. Tawk.to property ─────────────────────────────────────────────────
   * Property id and widget id from Tawk dashboard → Administration → Chat
   * Widget. Public by design (they ship to every visitor); not credentials.
   */
  var TAWK_SRC = 'https://embed.tawk.to/6aa4f73a0f09ed34497bc905/1k2a6bfn2';

  /* ── 2. The greeting ─────────────────────────────────────────────────────
   * QUESTION is what the visitor reads. Ask something they actually want
   * answered; "How can I help?" gets ignored, a question about their project
   * gets replies.
   */
  var GREETING = {
    avatar:  '/images/deffrin-joseph.webp',
    name:    'Deffrin',
    role:    'Perfect Apps',
    question: 'Hi! 👋 Planning a new website or online store? ' +
              'Tell me what you are building and I will give you a rough idea ' +
              'of cost and timeline.',
    // Quick replies open the chat and tag the conversation with the intent, so
    // you can see what they came for. Set to [] to show only the Reply button.
    replies: [
      { label: 'A business website', intent: 'website' },
      { label: 'An online store',    intent: 'ecommerce' },
      { label: 'A web or mobile app', intent: 'app' },
      { label: 'Pricing',            intent: 'pricing' }
    ]
  };

  /* ── 3. Behaviour ────────────────────────────────────────────────────── */
  var GREET_PATHS   = ['/', '/index.html'];  // where the card appears
  var GREET_DELAY   = 2000;   // ms after page load before it slides in
  var GREET_MOBILE  = true;   // false = no card on phones
  var OPEN_PANEL_ON_GREET_CLICK = true;  // false = just show the Tawk bubble
  var REOPEN_AFTER_CLOSE = false;        // false = dismissed stays dismissed this session
  var EVENT_NAME = 'perfectapps_landing';
  // If Tawk is blocked or still loading when they click, fall back to the
  // channel the rest of the site already uses.
  var WHATSAPP = 'https://wa.me/919946218608?text=' +
    encodeURIComponent("Hi, I'd like to discuss a project with you.");

  /* ────────────────────────────────────────────────────────────────────── */

  if (/PROPERTY_ID|WIDGET_ID/.test(TAWK_SRC)) {
    console.warn('[chat] Tawk.to is not configured — set TAWK_SRC in /chat.js');
    return;
  }

  var path = window.location.pathname;
  var onGreetPage = GREET_PATHS.indexOf(path) !== -1;
  var isMobile = window.matchMedia('(max-width: 640px)').matches;
  var tawkReady = false;
  var card = null;

  function pageKind() {
    if (onGreetPage) return 'homepage';
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

  /* ── Greeting card ───────────────────────────────────────────────────── */

  var CSS = [
    '#pa-greet{position:fixed;z-index:2147483000;right:20px;bottom:96px;width:330px;max-width:calc(100vw - 32px);',
    'background:#fff;border:1px solid #e2e8f0;border-radius:16px;',
    'box-shadow:0 20px 48px -12px rgba(15,23,42,.28);padding:16px;',
    'font:14px/1.5 Inter,system-ui,-apple-system,sans-serif;color:#0f172a;',
    'opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s cubic-bezier(.165,.84,.44,1)}',
    '#pa-greet.pa-in{opacity:1;transform:none}',
    '@media (max-width:640px){#pa-greet{right:12px;left:12px;width:auto;bottom:88px}}',
    '@media (prefers-reduced-motion:reduce){#pa-greet{transition:none}}',
    '#pa-greet .pa-hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
    '#pa-greet .pa-av{position:relative;flex:0 0 auto}',
    '#pa-greet .pa-av img{width:38px;height:38px;border-radius:50%;object-fit:cover;display:block}',
    '#pa-greet .pa-dot{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;',
    'background:#22c55e;border:2px solid #fff}',
    '#pa-greet .pa-nm{font-weight:700;line-height:1.2}',
    '#pa-greet .pa-rl{font-size:12px;color:#64748b;line-height:1.2}',
    '#pa-greet .pa-x{margin-left:auto;background:none;border:0;cursor:pointer;color:#94a3b8;',
    'font-size:20px;line-height:1;padding:2px 4px;border-radius:6px}',
    '#pa-greet .pa-x:hover{color:#0f172a;background:#f1f5f9}',
    '#pa-greet .pa-q{margin:0 0 12px;color:#334155}',
    '#pa-greet .pa-rs{display:flex;flex-wrap:wrap;gap:6px}',
    '#pa-greet .pa-r{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:999px;',
    'padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit}',
    '#pa-greet .pa-r:hover{border-color:#0052ff;color:#0052ff;background:#f5f8ff}',
    '#pa-greet .pa-go{width:100%;margin-top:10px;background:#0052ff;color:#fff;border:0;border-radius:10px;',
    'padding:10px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit}',
    '#pa-greet .pa-go:hover{background:#0f172a}'
  ].join('');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function openChat(intent) {
    var api = window.Tawk_API;
    if (!tawkReady || !api || typeof api.maximize !== 'function') {
      window.open(WHATSAPP, '_blank', 'noopener');
      hideCard(true);
      return;
    }
    if (intent && typeof api.addEvent === 'function') {
      api.addEvent('intent_' + intent, { page: pageKind() }, function () {});
    }
    if (typeof api.showWidget === 'function') api.showWidget();
    if (OPEN_PANEL_ON_GREET_CLICK) api.maximize();
    hideCard(false);
  }

  function hideCard(persist) {
    if (!card) return;
    card.classList.remove('pa-in');
    var n = card; card = null;
    window.setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 350);
    if (persist && !REOPEN_AFTER_CLOSE) remember();
  }

  function buildCard() {
    if (card || dismissed()) return;
    if (isMobile && !GREET_MOBILE) return;

    var style = el('style'); style.textContent = CSS; document.head.appendChild(style);

    card = el('div');
    card.id = 'pa-greet';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Message from ' + GREETING.name);

    var hd = el('div', 'pa-hd');
    var av = el('div', 'pa-av');
    var img = el('img');
    img.src = GREETING.avatar; img.alt = GREETING.name;
    img.width = 38; img.height = 38; img.loading = 'lazy'; img.decoding = 'async';
    av.appendChild(img);
    var dot = el('span', 'pa-dot'); dot.setAttribute('title', 'Online'); av.appendChild(dot);
    hd.appendChild(av);

    var who = el('div');
    who.appendChild(el('div', 'pa-nm', GREETING.name));
    who.appendChild(el('div', 'pa-rl', GREETING.role));
    hd.appendChild(who);

    var x = el('button', 'pa-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss message');
    x.addEventListener('click', function (e) { e.stopPropagation(); hideCard(true); });
    hd.appendChild(x);
    card.appendChild(hd);

    card.appendChild(el('p', 'pa-q', GREETING.question));

    if (GREETING.replies && GREETING.replies.length) {
      var rs = el('div', 'pa-rs');
      GREETING.replies.forEach(function (r) {
        var b = el('button', 'pa-r', r.label);
        b.type = 'button';
        b.addEventListener('click', function () { openChat(r.intent); });
        rs.appendChild(b);
      });
      card.appendChild(rs);
    } else {
      var go = el('button', 'pa-go', 'Reply');
      go.type = 'button';
      go.addEventListener('click', function () { openChat(null); });
      card.appendChild(go);
    }

    document.body.appendChild(card);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { if (card) card.classList.add('pa-in'); });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && card) hideCard(true);
  });

  /* ── Tawk ────────────────────────────────────────────────────────────── */

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  window.Tawk_API.customStyle = {
    visibility: {
      desktop: { position: 'br', xOffset: 20, yOffset: 20 },
      mobile:  { position: 'br', xOffset: 10, yOffset: 20 }
    }
  };

  window.Tawk_API.onLoad = function () {
    tawkReady = true;
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

  };

  // If the visitor opens the chat themselves, the card is redundant.
  window.Tawk_API.onChatMaximized = function () { hideCard(false); };
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
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2500 });
    else window.setTimeout(fn, 1200);
  }
  if (document.readyState === 'complete') whenIdle(inject);
  else window.addEventListener('load', function () { whenIdle(inject); });

  // The greeting is ours, so it is scheduled independently of Tawk: an
  // adblocked or slow-loading widget must not cost us the message.
  if (onGreetPage) window.setTimeout(buildCard, GREET_DELAY);
})();
