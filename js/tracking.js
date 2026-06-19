/* ========================================
   Die Mobiliar – Data Cloud Web SDK Tracking
   Beacon: c360a
   With initSitemap for Visual Editor / Dev Console visibility
   ======================================== */

(function() {
  'use strict';

  // --- SDK Poll ---
  var SDK_POLL_MS = 250;
  var SDK_TIMEOUT_MS = 10000;

  function waitForSDK(callback) {
    var elapsed = 0;
    var t = setInterval(function() {
      elapsed += SDK_POLL_MS;
      var sdk = window.SalesforceInteractions || window.DataCloudInteractions;
      if (sdk) {
        clearInterval(t);
        // Ensure global alias exists
        if (!window.SalesforceInteractions) {
          window.SalesforceInteractions = sdk;
        }
        callback(sdk);
      } else if (elapsed >= SDK_TIMEOUT_MS) {
        clearInterval(t);
        console.warn('[Mobiliar Tracking] SDK not loaded (timeout). Check CDN URL.');
      }
    }, SDK_POLL_MS);
  }

  // --- Helper: send event safely ---
  function trackEvent(name, data) {
    var SI = window.SalesforceInteractions;
    if (!SI || typeof SI.sendEvent !== 'function') return;
    var payload = { interaction: { name: name } };
    if (data) {
      Object.keys(data).forEach(function(key) {
        payload[key] = data[key];
      });
    }
    try {
      SI.sendEvent(payload);
    } catch(e) {
      console.warn('[Mobiliar Tracking] Event error:', e);
    }
  }

  // Make trackEvent globally available
  window.__trackEvent = trackEvent;

  // --- Helper: page path matching ---
  function pathIs(page) {
    var p = window.location.pathname;
    var file = p.split('/').pop() || '';
    return file === page || (page === 'index.html' && (file === '' || file === '/'));
  }

  // =========================================================
  // Main init — called once SDK is ready
  // =========================================================
  waitForSDK(function(SI) {

    // =======================================================
    // 1. SITEMAP — defines pageTypes, contentZones, listeners
    //    This is what makes events visible in the Visual Editor
    //    and the browser dev console debugger.
    // =======================================================
    SI.initSitemap({

      // Global content zones available on ALL pages
      global: {
        contentZones: [
          { name: "global_header" },
          { name: "global_popup" },
          { name: "global_footer" },
          { name: "cookie_banner" }
        ],
        listeners: [
          // Track all CTA button clicks globally
          SI.listener && SI.listener("click", ".btn", function(e) {
            var el = e.target.closest('.btn');
            if (!el || el.closest('form') || el.dataset.consent) return;
            SI.sendEvent({
              interaction: {
                name: "ClickEvent",
                eventType: "pageViewEvent"
              },
              user: {
                attributes: {
                  eventType: "pageViewEvent",
                  buttonText: el.textContent.trim(),
                  targetUrl: el.href || '',
                  currentUrl: window.location.href
                }
              }
            });
          }),
          // Track consent banner interaction
          SI.listener && SI.listener("click", "[data-consent]", function(e) {
            var btn = e.target.closest('[data-consent]');
            if (!btn) return;
            var consent = btn.dataset.consent;
            SI.setConsent({
              consent: consent === 'accept' ? 'OptIn' : 'OptOut'
            });
            SI.sendEvent({
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
          })
        ].filter(Boolean) // Remove nulls if SI.listener doesn't exist
      },

      // =======================================================
      // Page Type Definitions
      // =======================================================
      pageTypes: [

        // --- Homepage ---
        {
          name: "Homepage",
          isMatch: function() {
            return pathIs('index.html') || pathIs('');
          },
          contentZones: [
            { name: "home_hero" },
            { name: "home_products" },
            { name: "home_categories" },
            { name: "home_cta" }
          ],
          interaction: {
            name: "Homepage View",
            eventType: "pageViewEvent"
          },
          listeners: [
            SI.listener && SI.listener("click", ".product-card", function(e) {
              var card = e.target.closest('.product-card');
              if (!card) return;
              var title = card.querySelector('.product-card__title');
              SI.sendEvent({
                interaction: {
                  name: "ProductClick",
                  eventType: "pageViewEvent"
                },
                user: {
                  attributes: {
                    eventType: "pageViewEvent",
                    productName: title ? title.textContent.trim() : 'Unknown',
                    productUrl: card.href || ''
                  }
                }
              });
            }),
            SI.listener && SI.listener("click", ".cat-card", function(e) {
              var card = e.target.closest('.cat-card');
              if (!card) return;
              var title = card.querySelector('.cat-card__content h3');
              SI.sendEvent({
                interaction: {
                  name: "CategoryClick",
                  eventType: "pageViewEvent"
                },
                user: {
                  attributes: {
                    eventType: "pageViewEvent",
                    categoryName: title ? title.textContent.trim() : 'Unknown',
                    categoryUrl: card.href || ''
                  }
                }
              });
            })
          ].filter(Boolean)
        },

        // --- Prämienrechner (Product Overview) ---
        {
          name: "Praemienrechner",
          isMatch: function() {
            return pathIs('praemienrechner.html');
          },
          contentZones: [
            { name: "praemienrechner_hero" },
            { name: "praemienrechner_grid" }
          ],
          interaction: {
            name: "Praemienrechner View",
            eventType: "pageViewEvent"
          },
          listeners: [
            SI.listener && SI.listener("click", ".product-card", function(e) {
              var card = e.target.closest('.product-card');
              if (!card) return;
              var title = card.querySelector('.product-card__title');
              SI.sendEvent({
                interaction: {
                  name: "ProductClick",
                  eventType: "pageViewEvent"
                },
                user: {
                  attributes: {
                    eventType: "pageViewEvent",
                    productName: title ? title.textContent.trim() : 'Unknown',
                    productUrl: card.href || '',
                    sourcePageType: 'Praemienrechner'
                  }
                }
              });
            })
          ].filter(Boolean)
        },

        // --- Autoversicherung (Product Detail + Calculator) ---
        {
          name: "Autoversicherung",
          isMatch: function() {
            return pathIs('autoversicherung.html');
          },
          contentZones: [
            { name: "auto_hero" },
            { name: "auto_calculator" },
            { name: "auto_leistungen" },
            { name: "auto_cta" }
          ],
          interaction: {
            name: "Autoversicherung View",
            eventType: "pageViewEvent"
          },
          listeners: [
            // Calculator form start
            SI.listener && SI.listener("focus", "#autoCalcForm input, #autoCalcForm select", function() {
              if (window.__autoCalcStarted) return;
              window.__autoCalcStarted = true;
              SI.sendEvent({
                interaction: {
                  name: "CalculatorStart",
                  eventType: "pageViewEvent"
                },
                user: {
                  attributes: {
                    eventType: "pageViewEvent",
                    formId: "autoCalcForm",
                    pageType: "Autoversicherung"
                  }
                }
              });
            }),
            // Calculator form submission + Identity stitching
            SI.listener && SI.listener("submit", "#autoCalcForm", function(e) {
              var form = document.getElementById('autoCalcForm');
              if (!form) return;
              form.dataset.submitted = 'true';

              var fd = new FormData(form);
              var email = fd.get('email');
              var vorname = fd.get('vorname');
              var nachname = fd.get('nachname');

              // Form submit event
              SI.sendEvent({
                interaction: {
                  name: "FormSubmit",
                  eventType: "leadSubmit"
                },
                user: {
                  attributes: {
                    eventType: "leadSubmit",
                    formId: "autoCalcForm",
                    fahrzeugMarke: fd.get('marke') || '',
                    baujahr: fd.get('baujahr') || '',
                    deckung: fd.get('deckung') || '',
                    km: fd.get('km') || '',
                    plz: fd.get('plz') || ''
                  }
                }
              });

              // Identity event — unknown → known stitching
              if (email) {
                SI.sendEvent({
                  interaction: {
                    name: "identity",
                    eventType: "identity"
                  },
                  user: {
                    identities: {
                      emailAddress: email
                    },
                    attributes: {
                      eventType: "identity",
                      firstName: vorname || '',
                      lastName: nachname || '',
                      isAnonymous: '0'
                    }
                  }
                });

                // Contact point email
                SI.sendEvent({
                  interaction: {
                    name: "contactPointEmail",
                    eventType: "contactPointEmail"
                  },
                  user: {
                    attributes: {
                      eventType: "contactPointEmail",
                      email: email
                    }
                  }
                });
              }
            })
          ].filter(Boolean)
        },

        // --- Event (Zibelemärit-Apéro Registration) ---
        {
          name: "Event",
          isMatch: function() {
            return pathIs('event.html');
          },
          contentZones: [
            { name: "event_hero" },
            { name: "event_details" },
            { name: "event_registration" },
            { name: "event_info" }
          ],
          interaction: {
            name: "Event Page View",
            eventType: "pageViewEvent"
          },
          listeners: [
            // Event form start
            SI.listener && SI.listener("focus", "#eventForm input, #eventForm select", function() {
              if (window.__eventFormStarted) return;
              window.__eventFormStarted = true;
              SI.sendEvent({
                interaction: {
                  name: "EventRegistrationStart",
                  eventType: "pageViewEvent"
                },
                user: {
                  attributes: {
                    eventType: "pageViewEvent",
                    formId: "eventForm",
                    eventName: "Zibelemärit-Apéro 2026"
                  }
                }
              });
            }),
            // Event registration submission + Identity stitching
            SI.listener && SI.listener("submit", "#eventForm", function(e) {
              var form = document.getElementById('eventForm');
              if (!form) return;
              form.dataset.submitted = 'true';

              var fd = new FormData(form);
              var email = fd.get('email');
              var vorname = fd.get('vorname');
              var nachname = fd.get('nachname');

              // Registration event
              SI.sendEvent({
                interaction: {
                  name: "EventRegistration",
                  eventType: "leadSubmit"
                },
                user: {
                  attributes: {
                    eventType: "leadSubmit",
                    formId: "eventForm",
                    eventName: "Zibelemärit-Apéro 2026",
                    personen: fd.get('personen') || '1',
                    telefon: fd.get('telefon') || '',
                    bemerkung: fd.get('bemerkung') || ''
                  }
                }
              });

              // Identity stitching
              if (email) {
                SI.sendEvent({
                  interaction: {
                    name: "identity",
                    eventType: "identity"
                  },
                  user: {
                    identities: {
                      emailAddress: email
                    },
                    attributes: {
                      eventType: "identity",
                      firstName: vorname || '',
                      lastName: nachname || '',
                      isAnonymous: '0'
                    }
                  }
                });

                SI.sendEvent({
                  interaction: {
                    name: "contactPointEmail",
                    eventType: "contactPointEmail"
                  },
                  user: {
                    attributes: {
                      eventType: "contactPointEmail",
                      email: email
                    }
                  }
                });
              }
            })
          ].filter(Boolean)
        }
      ]
    });

    // =======================================================
    // 2. Form abandonment tracking (beforeunload)
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
          SI.sendEvent({
            interaction: {
              name: "FormAbandon",
              eventType: "pageViewEvent"
            },
            user: {
              attributes: {
                eventType: "pageViewEvent",
                formId: form.id || 'unknown',
                pageUrl: window.location.href
              }
            }
          });
        }
      });
    });

    console.log('[Mobiliar Tracking] Sitemap initialized – Visual Editor ready');
  });

})();
