/* ========================================
   Demo Auto-Fill — Marc Baumgartner
   Subtle note below forms to speed up demo data entry
   ======================================== */

(function() {
  'use strict';

  var MARC = {
    vorname: 'Marc',
    nachname: 'Baumgartner',
    email: 'marc.baumgartner@email.ch',
    telefon: '+41 79 321 54 67',
    plz: '3011',
    marke: 'vw',
    baujahr: '2023',
    deckung: 'vollkasko',
    km: '15000',
    personen: '2',
    bemerkung: ''
  };

  function fillForm(form) {
    Object.keys(MARC).forEach(function(key) {
      var input = form.querySelector('[name="' + key + '"]');
      if (!input || MARC[key] === '') return;
      if (input.tagName === 'SELECT') {
        if (input.querySelector('option[value="' + MARC[key] + '"]')) {
          input.value = MARC[key];
        }
      } else {
        input.value = MARC[key];
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('focus', { bubbles: true }));
    });

    // Fire identity event for Data Cloud stitching
    if (MARC.email && window.SalesforceInteractions) {
      try {
        window.SalesforceInteractions.sendEvent({
          interaction: { name: 'identity', eventType: 'identity' },
          user: {
            identities: { emailAddress: MARC.email },
            attributes: { eventType: 'identity', firstName: MARC.vorname, lastName: MARC.nachname, isAnonymous: '0' }
          }
        });
      } catch(e) { /* silent */ }
    }
  }

  function init() {
    document.querySelectorAll('form').forEach(function(form) {
      var note = document.createElement('p');
      note.style.cssText = 'margin:12px 0 0;font-size:12px;color:#8c8c8c;text-align:center;';
      note.innerHTML = 'Demo: <a href="#" style="color:#da2323;text-decoration:underline;cursor:pointer;" class="js-autofill">Marc Baumgartner einfüllen</a>';
      form.appendChild(note);

      note.querySelector('.js-autofill').addEventListener('click', function(e) {
        e.preventDefault();
        fillForm(form);
        this.textContent = '✓ eingefüllt';
        this.style.color = '#16a34a';
        this.style.textDecoration = 'none';
        this.style.cursor = 'default';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
