/* ========================================
   Die Mobiliar – Data Cloud Web SDK Tracking
   Beacon: c360a
   ======================================== */

(function() {
  'use strict';

  // Wait for SDK to be available
  function waitForSDK(callback, maxAttempts) {
    let attempts = 0;
    const max = maxAttempts || 20;
    const interval = setInterval(function() {
      attempts++;
      if (window.SalesforceInteractions) {
        clearInterval(interval);
        callback();
      } else if (attempts >= max) {
        clearInterval(interval);
        console.warn('[Mobiliar Tracking] SDK not available after ' + max + ' attempts');
      }
    }, 250);
  }

  // Helper: Get current page type
  function getPageType() {
    var path = window.location.pathname;
    var page = path.split('/').pop() || 'index.html';
    if (page === '' || page === 'index.html') return 'Homepage';
    if (page === 'praemienrechner.html') return 'Praemienrechner';
    if (page === 'autoversicherung.html') return 'Autoversicherung';
    if (page === 'event.html') return 'Event';
    return 'Other';
  }

  // Helper: Track an event
  function trackEvent(name, data) {
    if (!window.SalesforceInteractions) return;
    var eventPayload = {
      interaction: { name: name }
    };
    if (data) {
      Object.keys(data).forEach(function(key) {
        eventPayload[key] = data[key];
      });
    }
    try {
      window.SalesforceInteractions.sendEvent(eventPayload);
    } catch(e) {
      console.warn('[Mobiliar Tracking] Event error:', e);
    }
  }

  // Make trackEvent globally available for main.js hooks
  window.__trackEvent = trackEvent;

  waitForSDK(function() {

    // --- 1. Track Page View ---
    trackEvent('PageView', {
      page: {
        url: window.location.href,
        title: document.title,
        pageType: getPageType()
      }
    });

    // --- 2. Consent Integration ---
    // Override the consent buttons to also fire SDK consent
    document.querySelectorAll('[data-consent]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var consent = btn.dataset.consent;
        if (window.SalesforceInteractions) {
          window.SalesforceInteractions.setConsent({
            consent: consent === 'accept' ? 'OptIn' : 'OptOut'
          });
          trackEvent(consent === 'accept' ? 'ConsentGranted' : 'ConsentRejected');
        }
      });
    });

    // --- 3. Product Card Click Tracking ---
    document.querySelectorAll('.product-card, .cat-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var title = card.querySelector('.product-card__title, .cat-card__content h3');
        trackEvent('ProductClick', {
          product: {
            name: title ? title.textContent.trim() : 'Unknown',
            url: card.href || ''
          }
        });
      });
    });

    // --- 4. Form Tracking (Calculator + Event Registration) ---
    document.querySelectorAll('form').forEach(function(form) {
      var formStarted = false;

      // Track form start on first interaction
      form.querySelectorAll('input, select').forEach(function(input) {
        input.addEventListener('focus', function() {
          if (!formStarted) {
            formStarted = true;
            trackEvent('CalculatorStart', {
              form: {
                id: form.id || 'unknown',
                pageType: getPageType()
              }
            });
          }
        });
      });

      // Track form submission
      form.addEventListener('submit', function(e) {
        var formData = new FormData(form);
        var email = formData.get('email');
        var vorname = formData.get('vorname');
        var nachname = formData.get('nachname');

        // Form submit event
        trackEvent('FormSubmit', {
          form: {
            id: form.id || 'unknown',
            pageType: getPageType()
          }
        });

        // Identity event if email is provided (key for Data Cloud resolution)
        if (email) {
          try {
            window.SalesforceInteractions.sendEvent({
              interaction: { name: 'Identity' },
              user: {
                identities: {
                  emailAddress: email
                },
                attributes: {
                  eventType: 'identity',
                  firstName: vorname || '',
                  lastName: nachname || ''
                }
              }
            });
          } catch(e) {
            console.warn('[Mobiliar Tracking] Identity event error:', e);
          }
        }
      });
    });

    // --- 5. Track form abandonment ---
    window.addEventListener('beforeunload', function() {
      document.querySelectorAll('form').forEach(function(form) {
        var inputs = form.querySelectorAll('input, select');
        var hasInput = false;
        inputs.forEach(function(input) {
          if (input.value && input.value.trim() !== '' && input.type !== 'hidden') {
            hasInput = true;
          }
        });
        // If form has input but wasn't submitted
        if (hasInput && !form.dataset.submitted) {
          trackEvent('CalculatorAbandon', {
            form: {
              id: form.id || 'unknown',
              pageType: getPageType()
            }
          });
        }
      });
    });

    // Mark forms as submitted on submit
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function() {
        form.dataset.submitted = 'true';
      });
    });

    // --- 6. CTA Button Click Tracking ---
    document.querySelectorAll('.btn').forEach(function(btn) {
      if (btn.closest('form') || btn.dataset.consent) return; // Skip form/consent buttons
      btn.addEventListener('click', function() {
        trackEvent('ClickEvent', {
          interaction: { name: 'ClickEvent' },
          page: {
            url: window.location.href,
            element: btn.textContent.trim(),
            target: btn.href || ''
          }
        });
      });
    });

    console.log('[Mobiliar Tracking] Data Cloud Web SDK initialized – Page: ' + getPageType());
  });

})();
