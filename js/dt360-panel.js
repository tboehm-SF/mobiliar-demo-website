/* ========================================
   RT DT360 — Real-Time Tracking Validator
   Floating panel for Data Cloud Web SDK
   ======================================== */

(function() {
  'use strict';

  // --- Config ---
  var MAX_EVENTS = 15;
  var POLL_MS = 500;
  var EVENTS_STORAGE_KEY = 'dt360-events';
  var events = [];
  var isOpen = false;
  var toastQueue = [];
  var toastShowing = false;
  var identityState = { status: 'anonymous', email: '', firstName: '', lastName: '' };
  var consentState = { status: 'Ausstehend', timestamp: null };
  var emailState = { sent: false, to: '', subject: '', template: '', timestamp: null };
  var sdkState = { loaded: false, sitemapReady: false, anonymousId: '—' };
  var journeyState = { formStarted: false, formPage: '', formId: '', formFields: {}, formSubmitted: false, abandoned: false };

  // --- Inject Styles ---
  var style = document.createElement('style');
  style.textContent = [
    /* Badge */
    '.dt360-badge{position:fixed;top:140px;left:16px;z-index:9500;display:flex;align-items:center;gap:8px;',
    'background:rgba(26,26,26,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
    'color:#fff;padding:8px 14px;border-radius:20px;cursor:pointer;font-family:"SF Mono","Fira Code",monospace;',
    'font-size:12px;font-weight:600;letter-spacing:.5px;box-shadow:0 4px 20px rgba(0,0,0,.3);',
    'transition:all .25s cubic-bezier(.4,0,.2,1);user-select:none;border:1px solid rgba(255,255,255,.08)}',
    '.dt360-badge:hover{transform:translateX(2px);box-shadow:0 6px 28px rgba(218,35,35,.25);border-color:rgba(218,35,35,.3)}',
    '.dt360-badge .dt360-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;',
    'animation:dt360pulse 2s ease-in-out infinite}',
    '.dt360-dot.ok{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.6)}',
    '.dt360-dot.err{background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,.6)}',
    '@keyframes dt360pulse{0%,100%{opacity:1}50%{opacity:.4}}',

    /* Panel */
    '.dt360-panel{position:fixed;top:140px;left:16px;z-index:9501;width:370px;max-height:calc(100vh - 180px);',
    'background:rgba(20,20,24,.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
    'border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);',
    'color:#e4e4e7;font-family:"Inter","Helvetica Neue",Arial,sans-serif;font-size:13px;',
    'overflow:hidden;transform:translateX(-110%);opacity:0;transition:all .3s cubic-bezier(.4,0,.2,1);',
    'display:flex;flex-direction:column}',
    '.dt360-panel.open{transform:translateX(0);opacity:1}',

    /* Panel header */
    '.dt360-hdr{display:flex;align-items:center;justify-content:space-between;',
    'padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}',
    '.dt360-hdr-left{display:flex;align-items:center;gap:8px}',
    '.dt360-hdr h3{margin:0;font-size:13px;font-weight:700;letter-spacing:.8px;color:#fff}',
    '.dt360-close{background:none;border:none;color:#71717a;cursor:pointer;font-size:18px;',
    'padding:0 2px;line-height:1;transition:color .2s}',
    '.dt360-close:hover{color:#fff}',

    /* Scrollable body */
    '.dt360-body{overflow-y:auto;padding:0;flex:1;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}',
    '.dt360-body::-webkit-scrollbar{width:4px}',
    '.dt360-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}',

    /* Section */
    '.dt360-sec{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.04)}',
    '.dt360-sec:last-child{border-bottom:none}',
    '.dt360-sec-title{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;',
    'text-transform:uppercase;letter-spacing:1.2px;color:#a1a1aa;margin-bottom:8px}',

    /* Key-value rows */
    '.dt360-row{display:flex;justify-content:space-between;align-items:flex-start;padding:3px 0;gap:8px}',
    '.dt360-label{color:#71717a;font-size:11px;flex-shrink:0}',
    '.dt360-val{color:#e4e4e7;font-size:11px;font-family:"SF Mono","Fira Code",monospace;',
    'text-align:right;word-break:break-all;max-width:220px}',

    /* Identity badge */
    '.dt360-id-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;',
    'font-size:10px;font-weight:700;letter-spacing:.5px}',
    '.dt360-id-badge.anon{background:rgba(250,204,21,.12);color:#facc15;border:1px solid rgba(250,204,21,.2)}',
    '.dt360-id-badge.known{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.2)}',
    '.dt360-id-badge.flash{animation:dt360flash .6s ease}',
    '@keyframes dt360flash{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}',

    /* Event log */
    '.dt360-evt{padding:6px 8px;border-radius:6px;margin-bottom:4px;',
    'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);transition:background .2s}',
    '.dt360-evt:hover{background:rgba(255,255,255,.06)}',
    '.dt360-evt-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}',
    '.dt360-evt-name{font-weight:600;font-size:11px;color:#fff}',
    '.dt360-evt-time{font-size:9px;color:#52525b;font-family:"SF Mono","Fira Code",monospace}',
    '.dt360-evt-type{font-size:9px;color:#71717a;font-style:italic}',
    '.dt360-evt-attrs{font-size:9px;color:#52525b;margin-top:2px;font-family:"SF Mono","Fira Code",monospace;',
    'max-height:40px;overflow:hidden;text-overflow:ellipsis}',
    '.dt360-evt.identity .dt360-evt-name{color:#22c55e}',
    '.dt360-evt.consent .dt360-evt-name{color:#facc15}',
    '.dt360-evt.email .dt360-evt-name{color:#da2323}',
    '.dt360-evt.email{background:rgba(218,35,35,.08);border-color:rgba(218,35,35,.15)}',
    '.dt360-email-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;',
    'font-size:10px;font-weight:700;letter-spacing:.5px;background:rgba(218,35,35,.12);color:#da2323;border:1px solid rgba(218,35,35,.2)}',

    /* Journey badges */
    '.dt360-journey-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;',
    'font-size:10px;font-weight:700;letter-spacing:.5px}',
    '.dt360-journey-badge.active{background:rgba(59,130,246,.12);color:#3b82f6;border:1px solid rgba(59,130,246,.2)}',
    '.dt360-journey-badge.abandoned{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.2);',
    'animation:dt360flash .6s ease}',
    '.dt360-journey-badge.completed{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.2)}',
    '.dt360-journey-badge.idle{background:rgba(161,161,170,.12);color:#a1a1aa;border:1px solid rgba(161,161,170,.2)}',
    '.dt360-journey-progress{display:flex;gap:4px;margin-top:6px}',
    '.dt360-journey-step{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08)}',
    '.dt360-journey-step.done{background:#3b82f6}',
    '.dt360-journey-step.fail{background:#ef4444}',

    /* Empty state */
    '.dt360-empty{text-align:center;padding:16px 0;color:#52525b;font-size:11px;font-style:italic}',

    /* Consent badge */
    '.dt360-consent-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;',
    'font-size:10px;font-weight:600}',
    '.dt360-consent-badge.optin{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.2)}',
    '.dt360-consent-badge.optout{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.2)}',
    '.dt360-consent-badge.pending{background:rgba(161,161,170,.12);color:#a1a1aa;border:1px solid rgba(161,161,170,.2)}',

    /* Toast notification */
    '.dt360-toast{position:fixed;top:140px;left:16px;z-index:9510;',
    'background:rgba(26,26,26,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
    'color:#fff;padding:10px 16px;border-radius:10px;font-family:"SF Mono","Fira Code",monospace;',
    'font-size:11px;max-width:340px;box-shadow:0 6px 28px rgba(0,0,0,.4);',
    'border:1px solid rgba(255,255,255,.1);',
    'transform:translateX(-120%);opacity:0;transition:all .35s cubic-bezier(.4,0,.2,1);',
    'display:flex;align-items:center;gap:8px;pointer-events:none}',
    '.dt360-toast.show{transform:translateX(0);opacity:1}',
    '.dt360-toast .dt360-toast-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:#22c55e}',
    '.dt360-toast .dt360-toast-dot.identity{background:#22c55e}',
    '.dt360-toast .dt360-toast-dot.consent{background:#facc15}',
    '.dt360-toast .dt360-toast-dot.email{background:#da2323}',
    '.dt360-toast .dt360-toast-dot.journey{background:#ef4444}',
    '.dt360-toast .dt360-toast-dot.pageview{background:#60a5fa}',
    '.dt360-toast .dt360-toast-dot.navigation{background:#a78bfa}',
    '.dt360-toast .dt360-toast-dot.default{background:#22c55e}',
    '.dt360-toast-label{color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:.5px}',
    '.dt360-toast-name{color:#fff;font-weight:600}',

    /* Mobile */
    '@media(max-width:480px){.dt360-panel{width:calc(100vw - 32px);left:16px}',
    '.dt360-badge{top:90px;left:12px;padding:6px 10px;font-size:10px}}',
  ].join('\n');
  document.head.appendChild(style);

  // --- Create Badge ---
  var badge = document.createElement('div');
  badge.className = 'dt360-badge';
  badge.innerHTML = '<span class="dt360-dot err"></span><span>RT DT360</span>';
  badge.addEventListener('click', togglePanel);
  document.body.appendChild(badge);

  // --- Create Panel ---
  var panel = document.createElement('div');
  panel.className = 'dt360-panel';
  panel.innerHTML = [
    '<div class="dt360-hdr">',
    '  <div class="dt360-hdr-left">',
    '    <span class="dt360-dot ok" style="animation:none"></span>',
    '    <h3>RT DT360</h3>',
    '  </div>',
    '  <button class="dt360-close" title="Schliessen">&times;</button>',
    '</div>',
    '<div class="dt360-body" id="dt360Body"></div>'
  ].join('');
  panel.querySelector('.dt360-close').addEventListener('click', togglePanel);
  document.body.appendChild(panel);

  // --- Toggle ---
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    badge.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) refreshPanel();
  }

  // --- Refresh Panel Content ---
  function refreshPanel() {
    var SI = window.SalesforceInteractions || window.DataCloudInteractions;

    // Update SDK state
    sdkState.loaded = !!SI;
    if (SI && typeof SI.getAnonymousId === 'function') {
      try { sdkState.anonymousId = SI.getAnonymousId() || '—'; } catch(e) { sdkState.anonymousId = '(Fehler)'; }
    }

    // Detect page type from sitemap
    var pageType = detectPageType();

    var body = document.getElementById('dt360Body');
    if (!body) return;

    body.innerHTML = [
      // --- SDK Status ---
      renderSection('SDK Status', '⚡', [
        row('SDK geladen', sdkState.loaded ? '<span style="color:#22c55e">✓ Aktiv</span>' : '<span style="color:#ef4444">✗ Nicht geladen</span>'),
        row('Beacon', extractBeaconId()),
        row('Sitemap', sdkState.sitemapReady ? '<span style="color:#22c55e">✓ Initialisiert</span>' : '<span style="color:#a1a1aa">—</span>'),
      ]),

      // --- Identity ---
      renderSection('Identität', '🔑', [
        row('Session / Anon-ID', '<span style="color:#60a5fa;font-weight:600">' + (sdkState.anonymousId !== '—' ? sdkState.anonymousId : '—') + '</span>'),
        row('Status', identityState.status === 'known'
          ? '<span class="dt360-id-badge known">🟢 BEKANNT</span>'
          : '<span class="dt360-id-badge anon">🟡 ANONYM</span>'),
        identityState.status === 'known' ? row('E-Mail', '<span style="color:#22c55e">' + identityState.email + '</span>') : '',
        identityState.status === 'known' ? row('Name', identityState.firstName + ' ' + identityState.lastName) : '',
      ]),

      // --- Current Page ---
      renderSection('Aktuelle Seite', '📄', [
        row('Seiten-Typ', pageType || '—'),
        row('URL', truncateUrl(window.location.pathname)),
        row('Content Zones', getContentZones(pageType)),
      ]),

      // --- Consent ---
      renderSection('Einwilligung', '🛡️', [
        row('Status', renderConsentBadge()),
        consentState.timestamp ? row('Zeitpunkt', consentState.timestamp) : '',
      ]),

      // --- RT Email / Channel ---
      emailState.sent ? renderSection('RT Email', '📧', [
        row('Status', '<span class="dt360-email-badge">✓ DELIVERED</span>'),
        row('Empfänger', '<span style="color:#da2323">' + emailState.to + '</span>'),
        row('Betreff', emailState.subject),
        row('Template', emailState.template),
        row('Zeitpunkt', emailState.timestamp),
      ]) : '',

      // --- Journey Signal ---
      renderSection('Journey Signal', '🚦', renderJourneyContent()),

      // --- Event Log ---
      renderSection('Ereignis-Log (' + events.length + ')', '📡',
        events.length > 0
          ? events.map(renderEvent).reverse()
          : ['<div class="dt360-empty">Noch keine Ereignisse erfasst</div>']
      ),
    ].flat().filter(Boolean).join('');
  }

  // --- Section renderer ---
  function renderSection(title, icon, rows) {
    return '<div class="dt360-sec"><div class="dt360-sec-title">' + icon + ' ' + title + '</div>' +
      rows.filter(Boolean).join('') + '</div>';
  }

  function row(label, value) {
    if (!value && value !== 0) return '';
    return '<div class="dt360-row"><span class="dt360-label">' + label + '</span><span class="dt360-val">' + value + '</span></div>';
  }

  // --- Event renderer ---
  function renderEvent(evt) {
    var cls = 'dt360-evt';
    if (evt.name === 'identity' || evt.name === 'Identity Capture' || evt.name === 'contactPointEmail') cls += ' identity';
    if (evt.name === 'ConsentGranted' || evt.name === 'Consent Granted' || evt.name === 'ConsentRejected' || evt.name === 'Consent Rejected') cls += ' consent';
    if (evt.name === 'RT_EmailTriggered') cls += ' email';

    var attrs = '';
    if (evt.attrs && Object.keys(evt.attrs).length > 0) {
      var attrParts = [];
      Object.keys(evt.attrs).forEach(function(k) {
        if (k !== 'eventType') attrParts.push(k + '=' + evt.attrs[k]);
      });
      if (attrParts.length > 0) attrs = '<div class="dt360-evt-attrs">' + attrParts.join(' · ') + '</div>';
    }

    // Special rendering for email events
    if (evt.name === 'RT_EmailTriggered') {
      var emailTo = (evt.attrs && evt.attrs.emailTo) || '?';
      var emailSubject = (evt.attrs && evt.attrs.emailSubject) || '';
      return '<div class="' + cls + '">' +
        '<div class="dt360-evt-hdr"><span class="dt360-evt-name">📧 RT Email Sent</span>' +
        '<span class="dt360-evt-time">' + evt.time + '</span></div>' +
        '<div style="margin-top:4px"><span class="dt360-email-badge">✓ DELIVERED</span></div>' +
        '<div class="dt360-evt-attrs" style="margin-top:4px;max-height:none">To: ' + emailTo +
        (emailSubject ? '<br>Subject: ' + emailSubject : '') + '</div>' +
        '</div>';
    }

    return '<div class="' + cls + '">' +
      '<div class="dt360-evt-hdr"><span class="dt360-evt-name">' + evt.name + '</span>' +
      '<span class="dt360-evt-time">' + evt.time + '</span></div>' +
      (evt.eventType ? '<div class="dt360-evt-type">' + evt.eventType + '</div>' : '') +
      attrs + '</div>';
  }

  // --- Helpers ---
  function truncateId(id) {
    if (!id || id === '—') return '—';
    // Show full ID — it's important for validation
    return '<span title="' + id + '" style="font-size:10px;word-break:break-all;line-height:1.3">' + id + '</span>';
  }

  function truncateUrl(url) {
    if (!url) return '/';
    return url.length > 40 ? url.substring(0, 40) + '…' : url;
  }

  function extractBeaconId() {
    var scripts = document.querySelectorAll('script[src*="c360a"]');
    if (scripts.length === 0) return '—';
    var src = scripts[0].src;
    var match = src.match(/beacon\/c360a\/([a-f0-9-]+)/);
    return match ? '<span title="' + match[1] + '">' + match[1].substring(0, 8) + '…</span>' : '—';
  }

  function detectPageType() {
    var path = window.location.pathname;
    var file = path.split('/').pop() || '';
    if (file === '' || file === 'index.html' || file === '/') return 'Homepage';
    if (file === 'praemienrechner.html') return 'Praemienrechner';
    if (file === 'autoversicherung.html') return 'Autoversicherung';
    if (file === 'event.html') return 'Event';
    if (file === 'veranstaltungen.html') return 'Veranstaltungen';
    return file;
  }

  function getContentZones(pageType) {
    var zones = {
      'Homepage': 'home_hero, home_products, home_categories, home_cta',
      'Praemienrechner': 'praemienrechner_hero, praemienrechner_grid',
      'Autoversicherung': 'auto_hero, auto_calculator, auto_leistungen, auto_cta',
      'Event': 'event_hero, event_details, event_registration, event_info',
      'Veranstaltungen': 'evt_hero, evt_spotlight, evt_grid, evt_filters, evt_registration, evt_modal'
    };
    var global = 'global_header, global_popup, global_footer, cookie_banner';
    var page = zones[pageType] || '';
    return page ? page : global;
  }

  function renderConsentBadge() {
    if (consentState.status === 'OptIn') return '<span class="dt360-consent-badge optin">✓ OptIn</span>';
    if (consentState.status === 'OptOut') return '<span class="dt360-consent-badge optout">✗ OptOut</span>';
    return '<span class="dt360-consent-badge pending">⏳ Ausstehend</span>';
  }

  function timeStr() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // --- Toast Notification System ---
  var toastEl = null;

  function createToastEl() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'dt360-toast';
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function getEventCategory(name) {
    if (!name) return 'default';
    var n = name.toLowerCase();
    if (n === 'identity capture' || n === 'identity' || n === 'login email capture' || n === 'contactpointemail') return 'identity';
    if (n.indexOf('consent') >= 0) return 'consent';
    if (n.indexOf('email') >= 0 || n === 'rt_emailtriggered') return 'email';
    if (n.indexOf('abandon') >= 0 || n === 'journeyabandonment') return 'journey';
    if (n.indexOf('view') >= 0 || n.indexOf('page') >= 0) return 'pageview';
    if (n.indexOf('navigation') >= 0 || n.indexOf('breadcrumb') >= 0) return 'navigation';
    return 'default';
  }

  function showToastNotification(name, eventType) {
    toastQueue.push({ name: name, eventType: eventType });
    processToastQueue();
  }

  function processToastQueue() {
    if (toastShowing || toastQueue.length === 0) return;
    toastShowing = true;

    var item = toastQueue.shift();
    var el = createToastEl();
    var cat = getEventCategory(item.name);

    // Position toast below badge when panel is closed, or below panel header when open
    if (isOpen) {
      el.style.top = '140px';
      el.style.left = '400px';
    } else {
      el.style.top = '178px';
      el.style.left = '16px';
    }

    el.innerHTML = '<span class="dt360-toast-dot ' + cat + '"></span>' +
      '<div><div class="dt360-toast-label">📡 Event erkannt</div>' +
      '<div class="dt360-toast-name">' + (item.name || '?') + '</div></div>';

    // Animate in
    requestAnimationFrame(function() {
      el.classList.add('show');
    });

    // Animate out after 2.5s
    setTimeout(function() {
      el.classList.remove('show');
      setTimeout(function() {
        toastShowing = false;
        processToastQueue();
      }, 400);
    }, 2500);
  }

  // --- Event Persistence (sessionStorage) ---
  function saveEventsToStorage() {
    try {
      sessionStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch(e) {}
  }

  function loadEventsFromStorage() {
    try {
      var stored = sessionStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          events = parsed;
          // Cap at MAX_EVENTS
          while (events.length > MAX_EVENTS) events.shift();
        }
      }
    } catch(e) {}
  }

  // Load persisted events from previous page
  loadEventsFromStorage();

  // Track whether a form was actually submitted (user clicked "Prämie berechnen")
  var formSubmitted = false;

  // --- Log an event ---
  function logEvent(payload) {
    var name = '?';
    var eventType = '';
    var attrs = {};

    if (payload && payload.interaction) {
      name = payload.interaction.name || '?';
      eventType = payload.interaction.eventType || '';
    }
    if (payload && payload.user && payload.user.attributes) {
      attrs = payload.user.attributes;
    }

    events.push({ name: name, eventType: eventType, attrs: attrs, time: timeStr() });
    if (events.length > MAX_EVENTS) events.shift();

    // Persist events to sessionStorage for cross-page continuity
    saveEventsToStorage();

    // Always show toast notification for every tracked event
    showToastNotification(name, eventType);

    // Track form submissions — this gates identity resolution display
    // Match both spaced and unspaced variants from tracking.js
    if (name === 'FormSubmit' || name === 'Form Submit' || name === 'EventRegistration' || name === 'Event Registration') {
      formSubmitted = true;
    }

    // Track RT email events
    if (name === 'RT_EmailTriggered' && payload.user && payload.user.attributes) {
      emailState.sent = true;
      emailState.to = payload.user.attributes.emailTo || '';
      emailState.subject = payload.user.attributes.emailSubject || '';
      emailState.template = payload.user.attributes.emailTemplate || '';
      emailState.timestamp = timeStr();
    }

    // Resolve identity from the identity event fired by tracking.js
    // tracking.js sends: interaction.name = 'Identity Capture', user.attributes.eventType = 'identity'
    // Also support: interaction.name = 'identity' for direct SDK usage
    var isIdentityEvent = (name === 'Identity Capture' || name === 'identity');
    var hasIdentityAttr = (attrs && attrs.eventType === 'identity');
    if ((isIdentityEvent || hasIdentityAttr) && formSubmitted && payload.user) {
      var userAttrs = payload.user.attributes || {};
      var email = userAttrs.email || (payload.user.identities && payload.user.identities.emailAddress) || '';
      if (email) {
        identityState.status = 'known';
        identityState.email = email;
        identityState.firstName = userAttrs.firstName || '';
        identityState.lastName = userAttrs.lastName || '';
        // Flash the badge if visible
        flashIdentityBadge();
      }
    }

    // Check for consent events (match both spaced and unspaced variants)
    if (name === 'ConsentGranted' || name === 'Consent Granted') {
      consentState.status = 'OptIn';
      consentState.timestamp = timeStr();
    } else if (name === 'ConsentRejected' || name === 'Consent Rejected') {
      consentState.status = 'OptOut';
      consentState.timestamp = timeStr();
    }

    if (isOpen) refreshPanel();
  }

  // --- Journey Signal renderer ---
  function renderJourneyContent() {
    // Check if there's a cached form from sessionStorage
    var cache = null;
    try {
      var cacheStr = sessionStorage.getItem('mobi-form-cache');
      if (cacheStr) cache = JSON.parse(cacheStr);
    } catch(e) {}

    // If no journey activity
    if (!journeyState.formStarted && !cache) {
      return [
        row('Status', '<span class="dt360-journey-badge idle">— Kein Formular</span>'),
        row('Hinweis', '<span style="color:#71717a;font-size:10px">Starten Sie den Prämienrechner, um Journey-Signale zu sehen</span>')
      ];
    }

    var rows = [];

    // Journey status badge
    if (journeyState.formSubmitted) {
      rows.push(row('Status', '<span class="dt360-journey-badge completed">✓ ABGESCHLOSSEN</span>'));
    } else if (journeyState.abandoned) {
      rows.push(row('Status', '<span class="dt360-journey-badge abandoned">🚨 ABBRUCH ERKANNT</span>'));
    } else if (journeyState.formStarted || cache) {
      rows.push(row('Status', '<span class="dt360-journey-badge active">▶ Formular begonnen</span>'));
    }

    // Page where form is being filled
    var page = journeyState.formPage || (cache && cache.page) || '';
    if (page) {
      var pageLabels = {
        'autoversicherung.html': 'Autoversicherung',
        'praemienrechner.html': 'Prämienrechner',
        'event.html': 'Event-Anmeldung',
        'veranstaltungen.html': 'Veranstaltungen'
      };
      rows.push(row('Formular', pageLabels[page] || page));
    }

    // Cached form fields
    var fields = (cache && cache.fields) || journeyState.formFields || {};
    var fieldCount = Object.keys(fields).length;
    if (fieldCount > 0) {
      rows.push(row('Felder ausgefüllt', '<span style="color:#3b82f6;font-weight:600">' + fieldCount + '</span>'));

      // Show key product interest fields
      if (fields.deckung) {
        var deckungLabels = { 'haftpflicht': 'Haftpflicht', 'teilkasko': 'Teilkasko', 'vollkasko': 'Vollkasko' };
        rows.push(row('Deckung', '<span style="color:#f59e0b">' + (deckungLabels[fields.deckung] || fields.deckung) + '</span>'));
      }
      if (fields.marke) rows.push(row('Fahrzeug', fields.marke));
      if (fields.baujahr) rows.push(row('Baujahr', fields.baujahr));
    }

    // Progress bar: Login → Form Start → Fields → Submit
    var step1 = identityState.status === 'known' ? 'done' : '';
    var step2 = (journeyState.formStarted || cache) ? 'done' : '';
    var step3 = fieldCount > 2 ? 'done' : '';
    var step4 = journeyState.formSubmitted ? 'done' : (journeyState.abandoned ? 'fail' : '');

    rows.push('<div class="dt360-journey-progress">' +
      '<div class="dt360-journey-step ' + step1 + '" title="Login"></div>' +
      '<div class="dt360-journey-step ' + step2 + '" title="Formular gestartet"></div>' +
      '<div class="dt360-journey-step ' + step3 + '" title="Felder ausgefüllt"></div>' +
      '<div class="dt360-journey-step ' + step4 + '" title="Absenden"></div>' +
    '</div>');

    // Legend below progress
    rows.push('<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:8px;color:#52525b">' +
      '<span>Login</span><span>Start</span><span>Felder</span><span>Absenden</span></div>');

    return rows;
  }

  // --- Listen for journey events from main.js ---
  window.addEventListener('mobi-form-start', function(e) {
    journeyState.formStarted = true;
    journeyState.formPage = (e.detail && e.detail.page) || '';
    journeyState.formId = (e.detail && e.detail.formId) || '';
    journeyState.formSubmitted = false;
    journeyState.abandoned = false;
    if (isOpen) refreshPanel();
  });

  window.addEventListener('mobi-form-submit', function(e) {
    journeyState.formSubmitted = true;
    journeyState.abandoned = false;
    if (isOpen) refreshPanel();
  });

  // Listen for login/logout to update identity without needing form submit
  window.addEventListener('mobi-login', function(e) {
    if (e.detail) {
      identityState.status = 'known';
      identityState.email = e.detail.email || '';
      identityState.firstName = e.detail.vorname || '';
      identityState.lastName = e.detail.nachname || '';
      formSubmitted = true; // Allow identity display from login too
      flashIdentityBadge();
    }
    if (isOpen) refreshPanel();
  });

  window.addEventListener('mobi-logout', function() {
    identityState.status = 'anonymous';
    identityState.email = '';
    identityState.firstName = '';
    identityState.lastName = '';
    if (isOpen) refreshPanel();
  });

  // Periodically refresh journey section if form cache changes
  setInterval(function() {
    if (isOpen && journeyState.formStarted) refreshPanel();
  }, 2000);

  function flashIdentityBadge() {
    setTimeout(function() {
      var b = document.querySelector('.dt360-id-badge');
      if (b) {
        b.classList.add('flash');
        setTimeout(function() { b.classList.remove('flash'); }, 700);
      }
    }, 100);
  }

  // --- Monkey-patch SDK ---
  function hookSDK(SI) {
    sdkState.loaded = true;
    badge.querySelector('.dt360-dot').className = 'dt360-dot ok';

    // Try to get anonymous ID
    if (typeof SI.getAnonymousId === 'function') {
      try { sdkState.anonymousId = SI.getAnonymousId() || '—'; } catch(e) {}
    }

    // Hook sendEvent
    if (typeof SI.sendEvent === 'function' && !SI.__dt360Hooked) {
      var origSend = SI.sendEvent.bind(SI);
      SI.sendEvent = function(payload) {
        logEvent(payload);
        return origSend(payload);
      };
      SI.__dt360Hooked = true;
    }

    // Hook setConsent
    if (typeof SI.setConsent === 'function' && !SI.__dt360ConsentHooked) {
      var origConsent = SI.setConsent.bind(SI);
      SI.setConsent = function(opts) {
        if (opts && opts.consent) {
          consentState.status = opts.consent;
          consentState.timestamp = timeStr();
          if (isOpen) refreshPanel();
        }
        return origConsent(opts);
      };
      SI.__dt360ConsentHooked = true;
    }

    // Check if sitemap was already initialized
    sdkState.sitemapReady = true; // If SDK is loaded and we got here, sitemap is likely ready

    // Check consent from localStorage
    var stored = localStorage.getItem('mobi-consent');
    if (stored === 'accept') { consentState.status = 'OptIn'; }
    else if (stored === 'reject') { consentState.status = 'OptOut'; }
  }

  // --- Hook SDK immediately if available, otherwise poll ---
  // The SDK script loads before dt360-panel.js, so SalesforceInteractions
  // is usually available immediately. Hook it BEFORE the init().then()
  // callback fires to ensure we capture the initial page view event.
  var SI_immediate = window.SalesforceInteractions || window.DataCloudInteractions;
  if (SI_immediate) {
    hookSDK(SI_immediate);
  } else {
    // Fallback: poll if SDK is loaded asynchronously
    var elapsed = 0;
    var pollInterval = setInterval(function() {
      elapsed += POLL_MS;
      var SI = window.SalesforceInteractions || window.DataCloudInteractions;
      if (SI) {
        clearInterval(pollInterval);
        hookSDK(SI);
      } else if (elapsed >= 15000) {
        clearInterval(pollInterval);
        console.warn('[DT360] SDK not detected after 15s');
      }
    }, POLL_MS);
  }

  // --- Keyboard shortcut: Ctrl+Shift+D to toggle ---
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      togglePanel();
    }
  });

  // --- Restore login state from sessionStorage (user may have logged in before panel loaded) ---
  var savedLogin = sessionStorage.getItem('mobi-login');
  if (savedLogin) {
    try {
      var loginUser = JSON.parse(savedLogin);
      if (loginUser.email) {
        identityState.status = 'known';
        identityState.email = loginUser.email;
        identityState.firstName = loginUser.vorname || '';
        identityState.lastName = loginUser.nachname || '';
        formSubmitted = true; // Gate identity display
      }
    } catch(e) {}
  }

  // --- Restore form cache state ---
  var savedCache = sessionStorage.getItem('mobi-form-cache');
  if (savedCache) {
    try {
      var cacheData = JSON.parse(savedCache);
      if (cacheData.formTouched) {
        journeyState.formStarted = true;
        journeyState.formPage = cacheData.page || '';
        journeyState.formId = cacheData.formId || '';
        journeyState.formFields = cacheData.fields || {};

        // Detect abandonment: either the flag was explicitly set by main.js
        // during beforeunload, OR the user is now on a different page than
        // where the form was started (they navigated away without submitting).
        var currentFile = (window.location.pathname.split('/').pop() || 'index.html');
        var formPage = cacheData.page || '';
        if (cacheData.abandoned || (formPage && formPage !== currentFile)) {
          journeyState.abandoned = true;
        }
      }
    } catch(e) {}
  }

  console.log('[DT360] RT DT360 Tracking Validator loaded — click badge or Ctrl+Shift+D');

})();
