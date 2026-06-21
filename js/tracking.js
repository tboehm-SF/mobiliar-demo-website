/* ========================================
   Die Mobiliar – Data Cloud Web SDK Tracking
   Beacon: c360a
   With initSitemap + direct DOM listeners for dev console visibility
   ======================================== */

(function() {
  'use strict';

  // --- SDK Poll ---
  var SDK_POLL_MS = 250;
  var SDK_TIMEOUT_MS = 10000;

  // --- Console styling for dev console visibility ---
  var LOG_STYLE = 'background:#e63312;color:#fff;padding:2px 8px;border-radius:3px;font-weight:bold;';
  var LOG_DATA_STYLE = 'color:#1a73e8;font-weight:normal;';

  function log(eventName, data) {
    console.log('%c[Mobiliar Tracking]%c ' + eventName, LOG_STYLE, LOG_DATA_STYLE, data || '');
  }

  function waitForSDK(callback) {
    var elapsed = 0;
    var t = setInterval(function() {
      elapsed += SDK_POLL_MS;
      var sdk = window.SalesforceInteractions || window.DataCloudInteractions;
      if (sdk) {
        clearInterval(t);
        if (!window.SalesforceInteractions) {
          window.SalesforceInteractions = sdk;
        }
        callback(sdk);
      } else if (elapsed >= SDK_TIMEOUT_MS) {
        clearInterval(t);
        console.warn('%c[Mobiliar Tracking]%c SDK not loaded (timeout). Check CDN URL.', LOG_STYLE, 'color:red;');
      }
    }, SDK_POLL_MS);
  }

  // --- Helper: send event with console logging ---
  function trackEvent(SI, name, payload) {
    if (!SI || typeof SI.sendEvent !== 'function') {
      log('⚠ SDK not ready, skipping: ' + name);
      return;
    }
    var eventData = payload || { interaction: { name: name } };
    if (!eventData.interaction) eventData.interaction = {};
    if (!eventData.interaction.name) eventData.interaction.name = name;
    try {
      SI.sendEvent(eventData);
      log('✓ ' + name, eventData);
    } catch(e) {
      log('✗ Error sending ' + name, e);
    }
  }

  // Make trackEvent globally available
  window.__trackEvent = function(name, data) {
    var SI = window.SalesforceInteractions;
    var payload = { interaction: { name: name } };
    if (data) {
      Object.keys(data).forEach(function(key) { payload[key] = data[key]; });
    }
    trackEvent(SI, name, payload);
  };

  // --- Helper: page path matching ---
  function pathIs(page) {
    var p = window.location.pathname;
    var file = p.split('/').pop() || '';
    return file === page || (page === 'index.html' && (file === '' || file === '/'));
  }

  // --- Helper: closest polyfill-safe delegated click ---
  function onDelegate(eventType, selector, handler) {
    document.addEventListener(eventType, function(e) {
      var target = e.target;
      while (target && target !== document) {
        if (target.matches && target.matches(selector)) {
          handler(e, target);
          return;
        }
        target = target.parentElement;
      }
    }, eventType === 'focus' || eventType === 'focusin');
  }

  // =========================================================
  // Main init — called once SDK is ready
  // =========================================================
  waitForSDK(function(SI) {

    log('SDK loaded', { sdk: typeof SI, methods: Object.keys(SI).slice(0, 10) });

    // Enable SDK debug logging so events are visible in dev console
    if (typeof SI.setLoggingLevel === 'function') {
      SI.setLoggingLevel(3); // 0=silent, 1=error, 2=warn, 3=debug
      log('SDK logging set to DEBUG (level 3)');
    }

    // =======================================================
    // 0. INITIALIZE SDK — required for cookie/anonymousId
    //    The beacon CDN script auto-registers the tenant but
    //    SI.init() must be called to activate tracking.
    //    cookieDomain should match the production domain.
    // =======================================================
    try {
      var cookieDomain = window.location.hostname.includes('herokuapp.com')
        ? '.herokuapp.com'
        : window.location.hostname;

      SI.init({
        cookieDomain: cookieDomain
      });
      log('SDK initialized', { cookieDomain: cookieDomain, anonymousId: SI.getAnonymousId() });
    } catch(initErr) {
      log('SDK init error (non-fatal)', initErr);
    }

    // =======================================================
    // 1. SITEMAP — defines pageTypes, contentZones, and listeners
    //    Registers page structure for beacon recognition
    //    Uses SI.listener (available on this SDK version) for
    //    proper event binding visible in the Visual Editor
    // =======================================================
    try {
      SI.initSitemap({
        global: {
          contentZones: [
            { name: "global_header" },
            { name: "global_popup" },
            { name: "global_footer" },
            { name: "cookie_banner" }
          ],
          listeners: [
            SI.listener("click", ".btn", function(e) {
              var el = e.target.closest('.btn');
              if (!el || el.closest('form') || el.dataset.consent) return;
              SI.sendEvent({
                interaction: { name: "ClickEvent", eventType: "pageViewEvent" },
                user: { attributes: { buttonText: el.textContent.trim(), targetUrl: el.href || '' } }
              });
            }),
            SI.listener("click", "[data-consent]", function(e) {
              var btn = e.target.closest('[data-consent]');
              if (!btn) return;
              var consent = btn.dataset.consent;
              try { SI.setConsent({ consent: consent === 'accept' ? 'OptIn' : 'OptOut' }); } catch(err) { /* setConsent may not exist on this SDK version */ }
              SI.sendEvent({
                interaction: { name: consent === 'accept' ? 'ConsentGranted' : 'ConsentRejected', eventType: 'consentLog' },
                user: { attributes: { consentStatus: consent === 'accept' ? 'OptIn' : 'OptOut' } }
              });
            }),
            SI.listener("click", ".header__nav a", function(e) {
              var el = e.target.closest('a');
              SI.sendEvent({
                interaction: { name: "NavigationClick", eventType: "pageViewEvent" },
                user: { attributes: { linkText: el ? el.textContent.trim() : '', targetUrl: el ? el.href : '' } }
              });
            })
          ]
        },
        pageTypes: [
          {
            name: "Homepage",
            isMatch: function() { return pathIs('index.html') || pathIs(''); },
            contentZones: [
              { name: "home_hero" },
              { name: "home_products" },
              { name: "home_categories" },
              { name: "home_cta" }
            ],
            interaction: { name: "Homepage View" },
            listeners: [
              SI.listener("click", ".product-card", function(e) {
                var card = e.target.closest('.product-card');
                var title = card ? card.querySelector('.product-card__title') : null;
                SI.sendEvent({
                  interaction: { name: "ProductClick", eventType: "pageViewEvent" },
                  user: { attributes: { productName: title ? title.textContent.trim() : 'Unknown' } }
                });
              }),
              SI.listener("click", ".cat-card", function(e) {
                var card = e.target.closest('.cat-card');
                var title = card ? card.querySelector('.cat-card__content h3') : null;
                SI.sendEvent({
                  interaction: { name: "CategoryClick", eventType: "pageViewEvent" },
                  user: { attributes: { categoryName: title ? title.textContent.trim() : 'Unknown' } }
                });
              })
            ]
          },
          {
            name: "Praemienrechner",
            isMatch: function() { return pathIs('praemienrechner.html'); },
            contentZones: [
              { name: "praemienrechner_hero" },
              { name: "praemienrechner_grid" }
            ],
            interaction: { name: "Praemienrechner View" },
            listeners: [
              SI.listener("click", ".product-card", function(e) {
                var card = e.target.closest('.product-card');
                var title = card ? card.querySelector('.product-card__title') : null;
                SI.sendEvent({
                  interaction: { name: "ProductClick", eventType: "pageViewEvent" },
                  user: { attributes: { productName: title ? title.textContent.trim() : 'Unknown', sourcePageType: 'Praemienrechner' } }
                });
              })
            ]
          },
          {
            name: "Autoversicherung",
            isMatch: function() { return pathIs('autoversicherung.html'); },
            contentZones: [
              { name: "auto_hero" },
              { name: "auto_calculator" },
              { name: "auto_leistungen" },
              { name: "auto_cta" }
            ],
            interaction: { name: "Autoversicherung View" },
            listeners: [
              SI.listener("focus", "#autoCalcForm input, #autoCalcForm select", function() {
                if (window.__autoCalcStarted) return;
                window.__autoCalcStarted = true;
                SI.sendEvent({
                  interaction: { name: "CalculatorStart", eventType: "pageViewEvent" },
                  user: { attributes: { formId: "autoCalcForm", pageType: "Autoversicherung" } }
                });
              }),
              SI.listener("submit", "#autoCalcForm", function(e) {
                var form = document.getElementById('autoCalcForm');
                if (!form) return;
                form.dataset.submitted = 'true';
                var fd = new FormData(form);
                var email = fd.get('email');
                var vorname = fd.get('vorname');
                var nachname = fd.get('nachname');
                SI.sendEvent({
                  interaction: { name: "FormSubmit", eventType: "leadSubmit" },
                  user: { attributes: { formId: "autoCalcForm", fahrzeugMarke: fd.get('marke') || '', baujahr: fd.get('baujahr') || '' } }
                });
                if (email) {
                  SI.sendEvent({
                    interaction: { name: "identity", eventType: "identity" },
                    user: { identities: { emailAddress: email }, attributes: { firstName: vorname || '', lastName: nachname || '', isAnonymous: '0' } }
                  });
                }
              })
            ]
          },
          {
            name: "Event",
            isMatch: function() { return pathIs('event.html'); },
            contentZones: [
              { name: "event_hero" },
              { name: "event_details" },
              { name: "event_registration" },
              { name: "event_info" }
            ],
            interaction: { name: "Event Page View" },
            listeners: [
              SI.listener("focus", "#eventForm input, #eventForm select", function() {
                if (window.__eventFormStarted) return;
                window.__eventFormStarted = true;
                SI.sendEvent({
                  interaction: { name: "EventRegistrationStart", eventType: "pageViewEvent" },
                  user: { attributes: { formId: "eventForm", eventName: "Zibelemärit-Apéro 2026" } }
                });
              }),
              SI.listener("submit", "#eventForm", function(e) {
                var form = document.getElementById('eventForm');
                if (!form) return;
                form.dataset.submitted = 'true';
                var fd = new FormData(form);
                var email = fd.get('email');
                SI.sendEvent({
                  interaction: { name: "EventRegistration", eventType: "leadSubmit" },
                  user: { attributes: { formId: "eventForm", eventName: "Zibelemärit-Apéro 2026" } }
                });
                if (email) {
                  SI.sendEvent({
                    interaction: { name: "identity", eventType: "identity" },
                    user: { identities: { emailAddress: email }, attributes: { firstName: fd.get('vorname') || '', lastName: fd.get('nachname') || '', isAnonymous: '0' } }
                  });
                }
              })
            ]
          }
        ]
      });
      log('Sitemap initialized with SI.listener bindings');
    } catch(e) {
      log('Sitemap init error (non-fatal, using direct events)', e);
    }

    // =======================================================
    // 2. PAGE VIEW EVENT — fire immediately on page load
    // =======================================================
    var currentPage = 'Unknown';
    if (pathIs('index.html') || pathIs('')) currentPage = 'Homepage';
    else if (pathIs('praemienrechner.html')) currentPage = 'Praemienrechner';
    else if (pathIs('autoversicherung.html')) currentPage = 'Autoversicherung';
    else if (pathIs('event.html')) currentPage = 'Event';

    trackEvent(SI, currentPage + ' View', {
      interaction: {
        name: currentPage + ' View',
        eventType: 'pageViewEvent'
      },
      user: {
        attributes: {
          eventType: 'pageViewEvent',
          pageUrl: window.location.href,
          pageType: currentPage,
          timestamp: new Date().toISOString()
        }
      }
    });

    // =======================================================
    // 3. GLOBAL LISTENERS — direct DOM event delegation
    //    These replace SI.listener which is unavailable
    // =======================================================

    // --- CTA Button Clicks (all pages) ---
    onDelegate('click', '.btn', function(e, el) {
      if (el.closest('form') || el.dataset.consent) return;
      trackEvent(SI, 'ClickEvent', {
        interaction: {
          name: 'ClickEvent',
          eventType: 'pageViewEvent'
        },
        user: {
          attributes: {
            eventType: 'pageViewEvent',
            buttonText: el.textContent.trim(),
            targetUrl: el.href || '',
            currentUrl: window.location.href
          }
        }
      });
    });

    // --- Consent Banner ---
    onDelegate('click', '[data-consent]', function(e, btn) {
      var consent = btn.dataset.consent;
      try {
        SI.setConsent({ consent: consent === 'accept' ? 'OptIn' : 'OptOut' });
        log('Consent set: ' + (consent === 'accept' ? 'OptIn' : 'OptOut'));
      } catch(err) {
        log('setConsent error', err);
      }
      trackEvent(SI, consent === 'accept' ? 'ConsentGranted' : 'ConsentRejected', {
        interaction: {
          name: consent === 'accept' ? 'ConsentGranted' : 'ConsentRejected',
          eventType: 'consentLog'
        },
        user: {
          attributes: {
            eventType: 'consentLog',
            consentStatus: consent === 'accept' ? 'OptIn' : 'OptOut'
          }
        }
      });
    });

    // --- Navigation Link Clicks ---
    onDelegate('click', '.header__nav a', function(e, el) {
      trackEvent(SI, 'NavigationClick', {
        interaction: {
          name: 'NavigationClick',
          eventType: 'pageViewEvent'
        },
        user: {
          attributes: {
            eventType: 'pageViewEvent',
            linkText: el.textContent.trim(),
            targetUrl: el.href || '',
            sourceUrl: window.location.href
          }
        }
      });
    });

    // =======================================================
    // 4. PAGE-SPECIFIC LISTENERS
    // =======================================================

    // --- Homepage: Product Card Clicks ---
    if (pathIs('index.html') || pathIs('')) {
      onDelegate('click', '.product-card', function(e, card) {
        var title = card.querySelector('.product-card__title');
        trackEvent(SI, 'ProductClick', {
          interaction: {
            name: 'ProductClick',
            eventType: 'pageViewEvent'
          },
          user: {
            attributes: {
              eventType: 'pageViewEvent',
              productName: title ? title.textContent.trim() : 'Unknown',
              productUrl: card.href || ''
            }
          }
        });
      });

      onDelegate('click', '.cat-card', function(e, card) {
        var title = card.querySelector('.cat-card__content h3');
        trackEvent(SI, 'CategoryClick', {
          interaction: {
            name: 'CategoryClick',
            eventType: 'pageViewEvent'
          },
          user: {
            attributes: {
              eventType: 'pageViewEvent',
              categoryName: title ? title.textContent.trim() : 'Unknown',
              categoryUrl: card.href || ''
            }
          }
        });
      });
    }

    // --- Prämienrechner: Product Card Clicks ---
    if (pathIs('praemienrechner.html')) {
      onDelegate('click', '.product-card', function(e, card) {
        var title = card.querySelector('.product-card__title');
        trackEvent(SI, 'ProductClick', {
          interaction: {
            name: 'ProductClick',
            eventType: 'pageViewEvent'
          },
          user: {
            attributes: {
              eventType: 'pageViewEvent',
              productName: title ? title.textContent.trim() : 'Unknown',
              productUrl: card.href || '',
              sourcePageType: 'Praemienrechner'
            }
          }
        });
      });
    }

    // --- Autoversicherung: Calculator Form ---
    if (pathIs('autoversicherung.html')) {
      // Calculator form start (first interaction)
      onDelegate('focusin', '#autoCalcForm input, #autoCalcForm select', function() {
        if (window.__autoCalcStarted) return;
        window.__autoCalcStarted = true;
        trackEvent(SI, 'CalculatorStart', {
          interaction: {
            name: 'CalculatorStart',
            eventType: 'pageViewEvent'
          },
          user: {
            attributes: {
              eventType: 'pageViewEvent',
              formId: 'autoCalcForm',
              pageType: 'Autoversicherung'
            }
          }
        });
      });

      // Calculator form submission + Identity stitching
      var autoForm = document.getElementById('autoCalcForm');
      if (autoForm) {
        autoForm.addEventListener('submit', function(e) {
          this.dataset.submitted = 'true';
          var fd = new FormData(this);
          var email = fd.get('email');
          var vorname = fd.get('vorname');
          var nachname = fd.get('nachname');

          trackEvent(SI, 'FormSubmit', {
            interaction: { name: 'FormSubmit', eventType: 'leadSubmit' },
            user: {
              attributes: {
                eventType: 'leadSubmit',
                formId: 'autoCalcForm',
                fahrzeugMarke: fd.get('marke') || '',
                baujahr: fd.get('baujahr') || '',
                deckung: fd.get('deckung') || '',
                km: fd.get('km') || '',
                plz: fd.get('plz') || ''
              }
            }
          });

          if (email) {
            // Identity stitching
            trackEvent(SI, 'Identity', {
              interaction: { name: 'identity', eventType: 'identity' },
              user: {
                identities: { emailAddress: email },
                attributes: {
                  eventType: 'identity',
                  firstName: vorname || '',
                  lastName: nachname || '',
                  isAnonymous: '0'
                }
              }
            });

            trackEvent(SI, 'ContactPointEmail', {
              interaction: { name: 'contactPointEmail', eventType: 'contactPointEmail' },
              user: {
                attributes: { eventType: 'contactPointEmail', email: email }
              }
            });

            // RT Email trigger
            setTimeout(function() {
              trackEvent(SI, 'RT_EmailTriggered', {
                interaction: { name: 'RT_EmailTriggered', eventType: 'emailSend' },
                user: {
                  attributes: {
                    eventType: 'emailSend',
                    emailTo: email,
                    emailSubject: 'Willkommen bei der Mobiliar',
                    emailTemplate: 'Autoversicherung Welcome',
                    channel: 'Email',
                    status: 'Sent'
                  }
                }
              });
            }, 800);
          }
        });
      }
    }

    // --- Event: Registration Form ---
    if (pathIs('event.html')) {
      // Event form start (first interaction)
      onDelegate('focusin', '#eventForm input, #eventForm select', function() {
        if (window.__eventFormStarted) return;
        window.__eventFormStarted = true;
        trackEvent(SI, 'EventRegistrationStart', {
          interaction: { name: 'EventRegistrationStart', eventType: 'pageViewEvent' },
          user: {
            attributes: {
              eventType: 'pageViewEvent',
              formId: 'eventForm',
              eventName: 'Zibelemärit-Apéro 2026'
            }
          }
        });
      });

      // Event registration submission + Identity stitching
      var eventForm = document.getElementById('eventForm');
      if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
          this.dataset.submitted = 'true';
          var fd = new FormData(this);
          var email = fd.get('email');
          var vorname = fd.get('vorname');
          var nachname = fd.get('nachname');

          trackEvent(SI, 'EventRegistration', {
            interaction: { name: 'EventRegistration', eventType: 'leadSubmit' },
            user: {
              attributes: {
                eventType: 'leadSubmit',
                formId: 'eventForm',
                eventName: 'Zibelemärit-Apéro 2026',
                personen: fd.get('personen') || '1',
                telefon: fd.get('telefon') || '',
                bemerkung: fd.get('bemerkung') || ''
              }
            }
          });

          if (email) {
            trackEvent(SI, 'Identity', {
              interaction: { name: 'identity', eventType: 'identity' },
              user: {
                identities: { emailAddress: email },
                attributes: {
                  eventType: 'identity',
                  firstName: vorname || '',
                  lastName: nachname || '',
                  isAnonymous: '0'
                }
              }
            });

            trackEvent(SI, 'ContactPointEmail', {
              interaction: { name: 'contactPointEmail', eventType: 'contactPointEmail' },
              user: {
                attributes: { eventType: 'contactPointEmail', email: email }
              }
            });

            setTimeout(function() {
              trackEvent(SI, 'RT_EmailTriggered', {
                interaction: { name: 'RT_EmailTriggered', eventType: 'emailSend' },
                user: {
                  attributes: {
                    eventType: 'emailSend',
                    emailTo: email,
                    emailSubject: 'Anmeldebestätigung Zibelemärit-Apéro',
                    emailTemplate: 'Event Registration Confirmation',
                    channel: 'Email',
                    status: 'Sent'
                  }
                }
              });
            }, 800);
          }
        });
      }
    }

    // =======================================================
    // 5. Form abandonment tracking (beforeunload)
    // =======================================================
    window.addEventListener('beforeunload', function() {
      document.querySelectorAll('form').forEach(function(form) {
        if (form.dataset.submitted) return;
        var hasInput = false;
        form.querySelectorAll('input, select').forEach(function(input) {
          if (input.value && input.value.trim() !== '' && input.type !== 'hidden') {
            hasInput = true;
          }
        });
        if (hasInput) {
          trackEvent(SI, 'FormAbandon', {
            interaction: { name: 'FormAbandon', eventType: 'pageViewEvent' },
            user: {
              attributes: {
                eventType: 'pageViewEvent',
                formId: form.id || 'unknown',
                pageUrl: window.location.href
              }
            }
          });
        }
      });
    });

    // =======================================================
    // 6. Live status in console
    // =======================================================
    log('✓ Tracking LIVE — all events will appear below ↓');
    log('Page: ' + currentPage + ' | URL: ' + window.location.href);

  });

})();
