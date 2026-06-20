/* ========================================
   RT DT360 — Real-Time Tracking Validator
   Floating panel for Data Cloud Web SDK
   ======================================== */

(function() {
  'use strict';

  // --- Config ---
  var MAX_EVENTS = 15;
  var POLL_MS = 500;
  var events = [];
  var isOpen = false;
  var identityState = { status: 'anonymous', email: '', firstName: '', lastName: '' };
  var consentState = { status: 'Ausstehend', timestamp: null };
  var emailState = { sent: false, to: '', subject: '', template: '', timestamp: null };
  var sdkState = { loaded: false, sitemapReady: false, anonymousId: '—' };

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

    /* Empty state */
    '.dt360-empty{text-align:center;padding:16px 0;color:#52525b;font-size:11px;font-style:italic}',

    /* Consent badge */
    '.dt360-consent-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;',
    'font-size:10px;font-weight:600}',
    '.dt360-consent-badge.optin{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.2)}',
    '.dt360-consent-badge.optout{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.2)}',
    '.dt360-consent-badge.pending{background:rgba(161,161,170,.12);color:#a1a1aa;border:1px solid rgba(161,161,170,.2)}',

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
    if (evt.name === 'identity' || evt.name === 'contactPointEmail') cls += ' identity';
    if (evt.name === 'ConsentGranted' || evt.name === 'ConsentRejected') cls += ' consent';
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
    return file;
  }

  function getContentZones(pageType) {
    var zones = {
      'Homepage': 'home_hero, home_products, home_categories, home_cta',
      'Praemienrechner': 'praemienrechner_hero, praemienrechner_grid',
      'Autoversicherung': 'auto_hero, auto_calculator, auto_leistungen, auto_cta',
      'Event': 'event_hero, event_details, event_registration, event_info'
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

    // Track form submissions — this gates identity resolution display
    if (name === 'FormSubmit' || name === 'EventRegistration') {
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

    // Only resolve identity when it follows an actual form submit
    // (not from demo auto-fill persona click which also fires identity events)
    if (name === 'identity' && formSubmitted && payload.user && payload.user.identities) {
      identityState.status = 'known';
      identityState.email = payload.user.identities.emailAddress || '';
      if (payload.user.attributes) {
        identityState.firstName = payload.user.attributes.firstName || '';
        identityState.lastName = payload.user.attributes.lastName || '';
      }
      // Flash the badge if visible
      flashIdentityBadge();
    }

    // Check for consent events
    if (name === 'ConsentGranted') {
      consentState.status = 'OptIn';
      consentState.timestamp = timeStr();
    } else if (name === 'ConsentRejected') {
      consentState.status = 'OptOut';
      consentState.timestamp = timeStr();
    }

    if (isOpen) refreshPanel();
  }

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

  // --- Wait for SDK and hook ---
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

  // --- Keyboard shortcut: Ctrl+Shift+D to toggle ---
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      togglePanel();
    }
  });

  console.log('[DT360] RT DT360 Tracking Validator loaded — click badge or Ctrl+Shift+D');

})();
