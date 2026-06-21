/**
 * Die Mobiliar – Data Cloud Web SDK Sitemap
 * Version 2.0 — Production-quality tracking with native personalization
 *
 * Uses Data Cloud Web SDK v2.0 APIs:
 *   - SalesforceInteractions.init()
 *   - SalesforceInteractions.sendEvent()
 *   - SalesforceInteractions.ConsentStatus
 *
 * Personalization delivery:
 *   - Requests Mobi_Hero_Content_PP for TA-specific hero on homepage
 *   - Requests Mobi_Autoversicherung_PP for calculator pre-fill & dynamic banner
 *   - Falls back to static content if no personalization returned
 *
 * Event structure:
 *   - All events use eventType: 'websiteEngagement'
 *   - Catalog objects for product/category pages
 *   - Identity stitching on form submit (email → Individual)
 *   - Section-level scroll tracking via IntersectionObserver
 */

SalesforceInteractions.init({
    consents: [{
        provider: 'MobiliarCookieConsent',
        purpose: 'Tracking',
        status: SalesforceInteractions.ConsentStatus.OptIn
    }]
}).then(function () {

    // ─── CONSOLE LOGGING (DEV) ──────────────────────────
    var LOG_STYLE = 'background:#e63312;color:#fff;padding:2px 8px;border-radius:3px;font-weight:bold;';
    function log(msg, data) {
        console.log('%c[Mobiliar Tracking]%c ' + msg, LOG_STYLE, 'color:#1a73e8;', data || '');
    }
    log('SDK initialized — tracking active');

    // ─── PAGE TYPE DETECTION ────────────────────────────
    function getPageType() {
        var path = window.location.pathname;
        var file = path.split('/').pop() || '';
        if (file === '' || file === '/' || file === 'index.html') return 'home';
        if (file === 'praemienrechner.html') return 'praemienrechner';
        if (file === 'autoversicherung.html') return 'autoversicherung';
        if (file === 'event.html') return 'event';
        return 'other';
    }

    var pageType = getPageType();

    // ─── PAGE VIEW EVENT ────────────────────────────────
    var pageNames = {
        home: 'Homepage View',
        praemienrechner: 'Prämienrechner View',
        autoversicherung: 'Autoversicherung View',
        event: 'Event Page View',
        other: 'Page View'
    };

    var pageViewEvent = {
        interaction: {
            name: pageNames[pageType] || 'Page View',
            eventType: 'websiteEngagement'
        }
    };

    // Add catalog object for product/category pages
    if (pageType === 'autoversicherung') {
        pageViewEvent.interaction.catalogObject = {
            type: 'Product',
            id: 'autoversicherung',
            attributes: {
                name: 'Autoversicherung',
                category: 'Fahrzeuge & Reisen',
                productType: 'Motorfahrzeug-Versicherung',
                coverageOptions: 'Haftpflicht, Teilkasko, Vollkasko'
            }
        };
    } else if (pageType === 'praemienrechner') {
        pageViewEvent.interaction.catalogObject = {
            type: 'Article',
            id: 'praemienrechner-hub',
            attributes: {
                name: 'Prämienrechner',
                category: 'Versicherungen',
                contentType: 'Product Hub'
            }
        };
    } else if (pageType === 'event') {
        pageViewEvent.interaction.catalogObject = {
            type: 'Article',
            id: 'zibelemarit-apero-2026',
            attributes: {
                name: 'Zibelemärit-Apéro 2026',
                category: 'Events',
                contentType: 'Event',
                eventDate: '2026-11-23',
                eventLocation: 'Bundesplatz 15, 3011 Bern'
            }
        };
    }

    SalesforceInteractions.sendEvent(pageViewEvent);
    log('Page View: ' + (pageNames[pageType] || 'Page View'));

    // ─── COOKIE CONSENT TRACKING ────────────────────────
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-consent]');
        if (!btn) return;
        var consent = btn.dataset.consent;

        SalesforceInteractions.sendEvent({
            interaction: {
                name: consent === 'accept' ? 'Consent Granted' : 'Consent Rejected',
                eventType: 'websiteEngagement'
            }
        });
        log('Consent: ' + consent);
    });

    // ─── CTA / LINK / BUTTON CLICK TRACKING ─────────────
    document.addEventListener('click', function (e) {
        var target = e.target.closest('a.btn, button.btn');
        if (!target) return;
        // Skip consent buttons (handled above) and form submits
        if (target.dataset.consent || target.type === 'submit') return;

        var text = (target.textContent || '').trim().substring(0, 100);
        var href = target.getAttribute('href') || '';
        var isButton = target.tagName === 'BUTTON';

        SalesforceInteractions.sendEvent({
            interaction: {
                name: isButton ? 'Button Click' : 'CTA Click',
                eventType: 'websiteEngagement'
            }
        });
        log('Click: ' + text + (href ? ' → ' + href : ''));
    });

    // ─── NAVIGATION LINK TRACKING ────────────────────────
    document.addEventListener('click', function (e) {
        var navLink = e.target.closest('.header__nav a');
        if (!navLink) return;

        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Navigation Click',
                eventType: 'websiteEngagement'
            }
        });
    });

    // ─── PRODUCT CARD CLICK TRACKING (Prämienrechner) ────
    document.addEventListener('click', function (e) {
        var card = e.target.closest('.product-card');
        if (!card) return;

        var titleEl = card.querySelector('.product-card__title');
        var productName = titleEl ? titleEl.textContent.trim() : 'Unknown';

        // Determine the category from nearest section heading
        var section = card.closest('.section');
        var sectionH2 = section ? section.querySelector('h2') : null;
        var category = sectionH2 ? sectionH2.textContent.trim() : 'Versicherungen';

        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Product Click',
                eventType: 'websiteEngagement',
                catalogObject: {
                    type: 'Product',
                    id: productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    attributes: {
                        name: productName,
                        category: category,
                        contentType: 'Insurance Product'
                    }
                }
            }
        });
        log('Product Click: ' + productName + ' (' + category + ')');
    });

    // ─── CATEGORY CARD CLICK TRACKING (Homepage) ─────────
    document.addEventListener('click', function (e) {
        var card = e.target.closest('.cat-card');
        if (!card) return;

        var titleEl = card.querySelector('.cat-card__content h3');
        var categoryName = titleEl ? titleEl.textContent.trim() : 'Unknown';

        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Category Click',
                eventType: 'websiteEngagement',
                catalogObject: {
                    type: 'Article',
                    id: 'category-' + categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    attributes: {
                        name: categoryName,
                        category: 'Versicherungskategorien',
                        contentType: 'Insurance Category'
                    }
                }
            }
        });
        log('Category Click: ' + categoryName);
    });

    // ─── SECTION SCROLL TRACKING (IntersectionObserver) ──
    function setupScrollTracking() {
        var trackedSections = [];

        // Define sections to track per page
        if (pageType === 'home') {
            trackedSections = [
                { selector: '.categories', name: 'Section View - Versicherungen' },
                { selector: '#beratung', name: 'Section View - Beratung CTA' },
                { selector: '#kontakt', name: 'Section View - Kontakt' }
            ];
        } else if (pageType === 'autoversicherung') {
            trackedSections = [
                { selector: '#autoCalcForm', name: 'Section View - Prämienrechner Form' },
                { selector: '#kontakt', name: 'Section View - Kontakt' }
            ];
        } else if (pageType === 'event') {
            trackedSections = [
                { selector: '.event-hero', name: 'Section View - Event Hero' },
                { selector: '#anmeldung', name: 'Section View - Event Anmeldung' }
            ];
        }

        if (trackedSections.length === 0) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var sectionName = entry.target.getAttribute('data-track-section');
                if (!sectionName) return;

                SalesforceInteractions.sendEvent({
                    interaction: {
                        name: sectionName,
                        eventType: 'websiteEngagement'
                    }
                });
                log(sectionName);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.3 });

        trackedSections.forEach(function (def) {
            var el = document.querySelector(def.selector);
            if (el) {
                el.setAttribute('data-track-section', def.name);
                observer.observe(el);
            }
        });
    }

    // ─── FORM INTERACTION TRACKING ───────────────────────
    // Track when user first starts interacting with a form
    function setupFormTracking() {

        // --- Autoversicherung Calculator Form ---
        if (pageType === 'autoversicherung') {
            var autoForm = document.getElementById('autoCalcForm');
            if (autoForm) {
                var autoStarted = false;

                // First interaction
                autoForm.addEventListener('focusin', function () {
                    if (autoStarted) return;
                    autoStarted = true;
                    SalesforceInteractions.sendEvent({
                        interaction: {
                            name: 'Calculator Start',
                            eventType: 'websiteEngagement'
                        }
                    });
                    log('Calculator Start: autoCalcForm');
                });

                // Form submission
                autoForm.addEventListener('submit', function (e) {
                    var fd = new FormData(autoForm);
                    var email = fd.get('email');
                    var vorname = fd.get('vorname');
                    var nachname = fd.get('nachname');

                    // 1. websiteEngagement event — tracks the form submit
                    SalesforceInteractions.sendEvent({
                        interaction: {
                            name: 'Form Submit',
                            eventType: 'websiteEngagement',
                            catalogObject: {
                                type: 'Product',
                                id: 'autoversicherung',
                                attributes: {
                                    name: 'Autoversicherung',
                                    category: 'Fahrzeuge & Reisen',
                                    fahrzeugMarke: fd.get('marke') || '',
                                    baujahr: fd.get('baujahr') || '',
                                    deckung: fd.get('deckung') || '',
                                    km: fd.get('km') || '',
                                    plz: fd.get('plz') || ''
                                }
                            }
                        },
                        user: {
                            attributes: {
                                eventType: 'contactPointEmail',
                                email: email
                            }
                        }
                    });
                    log('Form Submit: autoCalcForm', { email: email, marke: fd.get('marke') });

                    // 2. Identity stitching — marks this device as a known user
                    if (email) {
                        SalesforceInteractions.sendEvent({
                            interaction: {
                                name: 'Identity Capture'
                            },
                            user: {
                                attributes: {
                                    eventType: 'identity',
                                    firstName: vorname || '',
                                    lastName: nachname || '',
                                    email: email,
                                    isAnonymous: false
                                }
                            }
                        });
                        log('Identity Stitched: ' + email);
                    }
                });
            }
        }

        // --- Event Registration Form ---
        if (pageType === 'event') {
            var eventForm = document.getElementById('eventForm');
            if (eventForm) {
                var eventStarted = false;

                // First interaction
                eventForm.addEventListener('focusin', function () {
                    if (eventStarted) return;
                    eventStarted = true;
                    SalesforceInteractions.sendEvent({
                        interaction: {
                            name: 'Event Registration Start',
                            eventType: 'websiteEngagement'
                        }
                    });
                    log('Event Registration Start: eventForm');
                });

                // Form submission
                eventForm.addEventListener('submit', function (e) {
                    var fd = new FormData(eventForm);
                    var email = fd.get('email');
                    var vorname = fd.get('vorname');
                    var nachname = fd.get('nachname');

                    // 1. websiteEngagement event — tracks the event registration
                    SalesforceInteractions.sendEvent({
                        interaction: {
                            name: 'Event Registration',
                            eventType: 'websiteEngagement',
                            catalogObject: {
                                type: 'Article',
                                id: 'zibelemarit-apero-2026',
                                attributes: {
                                    name: 'Zibelemärit-Apéro 2026',
                                    category: 'Events',
                                    eventDate: '2026-11-23',
                                    personen: fd.get('personen') || '1',
                                    eventLocation: 'Bundesplatz 15, 3011 Bern'
                                }
                            }
                        },
                        user: {
                            attributes: {
                                eventType: 'contactPointEmail',
                                email: email
                            }
                        }
                    });
                    log('Event Registration: eventForm', { email: email, personen: fd.get('personen') });

                    // 2. Identity stitching
                    if (email) {
                        SalesforceInteractions.sendEvent({
                            interaction: {
                                name: 'Identity Capture'
                            },
                            user: {
                                attributes: {
                                    eventType: 'identity',
                                    firstName: vorname || '',
                                    lastName: nachname || '',
                                    email: email,
                                    isAnonymous: false
                                }
                            }
                        });
                        log('Identity Stitched: ' + email);
                    }
                });
            }
        }
    }

    // ─── FORM ABANDONMENT TRACKING ───────────────────────
    window.addEventListener('beforeunload', function () {
        var forms = document.querySelectorAll('form.calc-form');
        forms.forEach(function (form) {
            if (form.dataset.submitted) return;
            var hasInput = false;
            form.querySelectorAll('input, select').forEach(function (input) {
                if (input.value && input.value.trim() !== '' && input.type !== 'hidden' && input.type !== 'submit') {
                    hasInput = true;
                }
            });
            if (hasInput) {
                SalesforceInteractions.sendEvent({
                    interaction: {
                        name: 'Form Abandon',
                        eventType: 'websiteEngagement'
                    }
                });
            }
        });
    });

    // ─── HERO PERSONALIZATION (Homepage Only) ────────────
    if (pageType === 'home') {
        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Hero Personalization Request',
                eventType: 'personalizationRequest'
            },
            personalization: {
                personalizationPoints: [{
                    name: 'Mobi_Hero_Content_PP'
                }]
            }
        }).then(function (response) {
            try {
                if (response && response.personalizationPoints && response.personalizationPoints.length > 0) {
                    var ppResponse = response.personalizationPoints[0];
                    if (ppResponse && ppResponse.decisions && ppResponse.decisions.length > 0) {
                        var decision = ppResponse.decisions[0];
                        var attrs = decision.attributes || decision.content || {};
                        applyHeroPersonalization(attrs);
                    }
                }
            } catch (e) {
                // Silently fail — static hero content remains visible
            }
        }).catch(function () {
            // Silently fail — static hero content remains visible
        });
    }

    /**
     * Apply personalized hero content to the homepage banner.
     * Targets the .hero section and updates headline, subtext, CTA.
     */
    function applyHeroPersonalization(data) {
        if (!data) return;

        var heroSection = document.querySelector('.hero');
        if (!heroSection) return;

        if (data.Hero_Headline) {
            var headline = heroSection.querySelector('h1');
            if (headline) headline.textContent = data.Hero_Headline;
        }

        if (data.Hero_Subtext) {
            var subtext = heroSection.querySelector('.hero__content p');
            if (subtext) subtext.textContent = data.Hero_Subtext;
        }

        if (data.Hero_CTA_Text) {
            var cta = heroSection.querySelector('.btn');
            if (cta) cta.textContent = data.Hero_CTA_Text;
        }

        if (data.Hero_CTA_URL) {
            var ctaLink = heroSection.querySelector('a.btn');
            if (ctaLink) ctaLink.setAttribute('href', data.Hero_CTA_URL);
        }

        heroSection.setAttribute('data-personalized', 'true');
        heroSection.setAttribute('data-pp', 'Mobi_Hero_Content_PP');
        log('Hero Personalization Applied', data);
    }

    // ─── AUTOVERSICHERUNG PERSONALIZATION ────────────────
    if (pageType === 'autoversicherung') {
        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Auto Product Personalization Request',
                eventType: 'personalizationRequest'
            },
            personalization: {
                personalizationPoints: [{
                    name: 'Mobi_Autoversicherung_PP'
                }]
            }
        }).then(function (response) {
            try {
                if (response && response.personalizationPoints && response.personalizationPoints.length > 0) {
                    var ppResponse = response.personalizationPoints[0];
                    if (ppResponse && ppResponse.decisions && ppResponse.decisions.length > 0) {
                        var decision = ppResponse.decisions[0];
                        var attrs = decision.attributes || decision.content || {};
                        applyAutoPersonalization(attrs);
                    }
                }
            } catch (e) {
                // Silently fail
            }
        }).catch(function () {
            // Silently fail
        });
    }

    /**
     * Apply personalized content to the Autoversicherung page.
     * Can pre-select vehicle brand, highlight specific coverage, etc.
     */
    function applyAutoPersonalization(data) {
        if (!data) return;

        // Pre-fill vehicle brand if known from browsing history
        if (data.Preferred_Vehicle_Brand) {
            var markeSelect = document.getElementById('marke');
            if (markeSelect) {
                var options = markeSelect.querySelectorAll('option');
                options.forEach(function (opt) {
                    if (opt.value === data.Preferred_Vehicle_Brand) {
                        markeSelect.value = data.Preferred_Vehicle_Brand;
                    }
                });
            }
        }

        // Update hero headline
        if (data.Hero_Headline) {
            var hero = document.querySelector('.hero');
            var h1 = hero ? hero.querySelector('h1') : null;
            if (h1) h1.textContent = data.Hero_Headline;
        }

        var heroSection = document.querySelector('.hero');
        if (heroSection) {
            heroSection.setAttribute('data-personalized', 'true');
            heroSection.setAttribute('data-pp', 'Mobi_Autoversicherung_PP');
        }
        log('Auto Personalization Applied', data);
    }

    // ─── EVENT PAGE PERSONALIZATION ──────────────────────
    if (pageType === 'event') {
        // Track scroll depth on event page for engagement scoring
        var eventSections = [];
        var eventHero = document.querySelector('.event-hero');
        var eventDetails = document.querySelector('.features-list');
        var eventRegistration = document.getElementById('anmeldung');

        if (eventHero) eventSections.push({ el: eventHero, name: 'Event Hero Viewed', tracked: false });
        if (eventDetails) eventSections.push({ el: eventDetails, name: 'Event Details Viewed', tracked: false });
        if (eventRegistration) eventSections.push({ el: eventRegistration, name: 'Event Registration Form Viewed', tracked: false });

        if (eventSections.length > 0) {
            var eventObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    eventSections.forEach(function (sec) {
                        if (sec.el === entry.target && !sec.tracked) {
                            sec.tracked = true;
                            SalesforceInteractions.sendEvent({
                                interaction: {
                                    name: sec.name,
                                    eventType: 'websiteEngagement'
                                }
                            });
                            log(sec.name);
                            eventObserver.unobserve(entry.target);
                        }
                    });
                });
            }, { threshold: 0.3 });

            eventSections.forEach(function (sec) {
                eventObserver.observe(sec.el);
            });
        }
    }

    // ─── FOOTER LINK TRACKING ────────────────────────────
    document.addEventListener('click', function (e) {
        var footerLink = e.target.closest('.footer a');
        if (!footerLink) return;

        var column = footerLink.closest('.footer__col');
        var columnHeader = column ? column.querySelector('h4') : null;
        var section = columnHeader ? columnHeader.textContent.trim() : 'Footer';

        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Footer Link Click',
                eventType: 'websiteEngagement'
            }
        });
    });

    // ─── TIME ON PAGE TRACKING ───────────────────────────
    // Send engagement signal after 30 seconds of active browsing
    var timeOnPageTimer = setTimeout(function () {
        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Engaged Visit (30s)',
                eventType: 'websiteEngagement'
            }
        });
        log('Engaged Visit: 30s on page');
    }, 30000);

    // Clear if user navigates away quickly
    window.addEventListener('beforeunload', function () {
        clearTimeout(timeOnPageTimer);
    });

    // ─── BREADCRUMB CLICK TRACKING ───────────────────────
    document.addEventListener('click', function (e) {
        var crumbLink = e.target.closest('.breadcrumb a');
        if (!crumbLink) return;

        SalesforceInteractions.sendEvent({
            interaction: {
                name: 'Breadcrumb Click',
                eventType: 'websiteEngagement'
            }
        });
    });

    // ─── GLOBAL EVENT HOOK ───────────────────────────────
    // Make trackEvent available for main.js and other scripts
    window.__trackEvent = function (name, data) {
        var payload = {
            interaction: {
                name: name,
                eventType: 'websiteEngagement'
            }
        };
        if (data) {
            if (!payload.user) payload.user = {};
            payload.user.attributes = data;
        }
        SalesforceInteractions.sendEvent(payload);
        log('Custom: ' + name, data);
    };

    // ─── INITIALIZE TRACKING ─────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setupScrollTracking();
            setupFormTracking();
        });
    } else {
        setupScrollTracking();
        setupFormTracking();
    }

    log('✓ Sitemap active — ' + pageType + ' | ' + window.location.href);

});
