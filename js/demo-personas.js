/* ========================================
   Demo Persona Quick-Fill
   Floating panel for demo purposes
   ======================================== */

(function() {
  'use strict';

  // --- Demo Personas ---
  var PERSONAS = [
    {
      id: 'marc',
      name: 'Marc Baumgartner',
      emoji: '👨',
      role: 'Kunde / Interessent',
      color: '#da2323',
      data: {
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
      }
    },
    {
      id: 'sandra',
      name: 'Sandra Keller',
      emoji: '👩‍💼',
      role: 'Marketing Managerin',
      color: '#7c3aed',
      data: {
        vorname: 'Sandra',
        nachname: 'Keller',
        email: 'sandra.keller@mobiliar.ch',
        telefon: '+41 79 654 32 10',
        plz: '3001',
        marke: 'mercedes',
        baujahr: '2025',
        deckung: 'vollkasko',
        km: '10000',
        personen: '1',
        bemerkung: ''
      }
    },
    {
      id: 'thomas',
      name: 'Thomas Sutter',
      emoji: '👨‍💼',
      role: 'VB / Generalagent Bern',
      color: '#0369a1',
      data: {
        vorname: 'Thomas',
        nachname: 'Sutter',
        email: 'thomas.sutter@mobiliar.ch',
        telefon: '+41 31 310 22 33',
        plz: '3011',
        marke: 'bmw',
        baujahr: '2024',
        deckung: 'teilkasko',
        km: '20000',
        personen: '3',
        bemerkung: 'Firmenparkplatz vorhanden'
      }
    }
  ];

  // --- Build Floating Panel ---
  function createPanel() {
    var panel = document.createElement('div');
    panel.id = 'demoPersonaPanel';
    panel.innerHTML =
      '<div class="dp-toggle" id="dpToggle">' +
        '<span class="dp-toggle__icon">🎭</span>' +
        '<span class="dp-toggle__label">Demo</span>' +
      '</div>' +
      '<div class="dp-drawer" id="dpDrawer">' +
        '<div class="dp-drawer__header">' +
          '<span>Demo-Personas</span>' +
          '<button class="dp-drawer__close" id="dpClose">✕</button>' +
        '</div>' +
        '<p class="dp-drawer__hint">Klicken Sie auf eine Persona, um das Formular automatisch auszufüllen und die Identity-Verknüpfung auszulösen.</p>' +
        PERSONAS.map(function(p) {
          return '<button class="dp-persona-btn" data-persona="' + p.id + '" style="--persona-color:' + p.color + '">' +
            '<span class="dp-persona-btn__emoji">' + p.emoji + '</span>' +
            '<div class="dp-persona-btn__info">' +
              '<strong>' + p.name + '</strong>' +
              '<small>' + p.role + '</small>' +
            '</div>' +
            '<span class="dp-persona-btn__arrow">→</span>' +
          '</button>';
        }).join('') +
        '<div class="dp-drawer__footer">' +
          '<button class="dp-clear-btn" id="dpClear">🗑️ Formular leeren</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Inject styles
    var style = document.createElement('style');
    style.textContent = getDemoStyles();
    document.head.appendChild(style);

    // Event listeners
    document.getElementById('dpToggle').addEventListener('click', function() {
      panel.classList.toggle('dp--open');
    });

    document.getElementById('dpClose').addEventListener('click', function() {
      panel.classList.remove('dp--open');
    });

    document.getElementById('dpClear').addEventListener('click', function() {
      clearForms();
      showToast('Formular geleert', '#636363');
    });

    // Persona buttons
    var btns = panel.querySelectorAll('.dp-persona-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        var id = this.getAttribute('data-persona');
        var persona = PERSONAS.filter(function(p) { return p.id === id; })[0];
        if (persona) {
          fillForms(persona);
          panel.classList.remove('dp--open');
          showToast('✓ ' + persona.name + ' eingesetzt', persona.color);
        }
      });
    }
  }

  // --- Fill all forms on page ---
  function fillForms(persona) {
    var data = persona.data;
    var forms = document.querySelectorAll('form');

    forms.forEach(function(form) {
      Object.keys(data).forEach(function(key) {
        // Try by name first, then by id with evt- prefix
        var input = form.querySelector('[name="' + key + '"]');
        if (!input) return;

        if (data[key] === '') return; // skip empty values

        if (input.tagName === 'SELECT') {
          // Try to set the value
          var option = input.querySelector('option[value="' + data[key] + '"]');
          if (option) {
            input.value = data[key];
          }
        } else {
          input.value = data[key];
        }

        // Trigger change + input events for tracking
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true }));
      });
    });

    // Fire identity event for Data Cloud (unknown → known stitching)
    if (data.email && window.SalesforceInteractions) {
      try {
        window.SalesforceInteractions.sendEvent({
          interaction: { name: 'Identity' },
          user: {
            identities: {
              emailAddress: data.email
            },
            attributes: {
              eventType: 'identity',
              firstName: data.vorname || '',
              lastName: data.nachname || ''
            }
          }
        });
        console.log('[Demo] Identity event sent for:', data.email);
      } catch(e) {
        console.warn('[Demo] Identity event error:', e);
      }
    }
  }

  // --- Clear all forms ---
  function clearForms() {
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      form.reset();
    });
  }

  // --- Toast notification ---
  function showToast(msg, color) {
    var existing = document.querySelector('.dp-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'dp-toast';
    toast.style.backgroundColor = color || '#da2323';
    toast.textContent = msg;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(function() {
      toast.classList.add('dp-toast--show');
    });

    // Remove after 2.5s
    setTimeout(function() {
      toast.classList.remove('dp-toast--show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 2500);
  }

  // --- Styles ---
  function getDemoStyles() {
    return '' +
      '#demoPersonaPanel { position: fixed; bottom: 24px; right: 24px; z-index: 10000; font-family: "Inter", sans-serif; }' +

      /* Toggle button */
      '.dp-toggle { display: flex; align-items: center; gap: 8px; background: #1a1a1a; color: #fff; padding: 12px 20px; border-radius: 1000px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.25); transition: transform 0.2s, box-shadow 0.2s; user-select: none; }' +
      '.dp-toggle:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(0,0,0,0.35); }' +
      '.dp-toggle__icon { font-size: 20px; }' +
      '.dp-toggle__label { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }' +
      '.dp--open .dp-toggle { display: none; }' +

      /* Drawer */
      '.dp-drawer { display: none; width: 320px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.2); overflow: hidden; animation: dpSlideUp 0.25s ease-out; }' +
      '.dp--open .dp-drawer { display: block; }' +
      '@keyframes dpSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }' +

      /* Header */
      '.dp-drawer__header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #1a1a1a; color: #fff; font-size: 14px; font-weight: 600; }' +
      '.dp-drawer__close { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; opacity: 0.7; }' +
      '.dp-drawer__close:hover { opacity: 1; }' +

      /* Hint */
      '.dp-drawer__hint { padding: 12px 20px; font-size: 12px; color: #636363; background: #f5f5f5; margin: 0; border-bottom: 1px solid #e8e8e8; line-height: 1.4; }' +

      /* Persona buttons */
      '.dp-persona-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 20px; border: none; background: #fff; cursor: pointer; text-align: left; transition: background 0.15s; border-bottom: 1px solid #f0f0f0; }' +
      '.dp-persona-btn:hover { background: #f8f8f8; }' +
      '.dp-persona-btn__emoji { font-size: 28px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--persona-color) 10%, white); border-radius: 12px; flex-shrink: 0; }' +
      '.dp-persona-btn__info { flex: 1; }' +
      '.dp-persona-btn__info strong { display: block; font-size: 14px; color: #1a1a1a; margin-bottom: 2px; }' +
      '.dp-persona-btn__info small { font-size: 12px; color: #8c8c8c; }' +
      '.dp-persona-btn__arrow { font-size: 16px; color: var(--persona-color); opacity: 0; transition: opacity 0.15s, transform 0.15s; }' +
      '.dp-persona-btn:hover .dp-persona-btn__arrow { opacity: 1; transform: translateX(3px); }' +

      /* Footer */
      '.dp-drawer__footer { padding: 12px 20px; background: #f9f9f9; border-top: 1px solid #e8e8e8; }' +
      '.dp-clear-btn { display: block; width: 100%; padding: 8px; border: 1px dashed #d4d4d4; border-radius: 8px; background: none; font-size: 12px; color: #8c8c8c; cursor: pointer; transition: color 0.15s, border-color 0.15s; }' +
      '.dp-clear-btn:hover { color: #da2323; border-color: #da2323; }' +

      /* Toast */
      '.dp-toast { position: fixed; bottom: 80px; right: 24px; padding: 12px 24px; border-radius: 1000px; color: #fff; font-size: 14px; font-weight: 500; font-family: "Inter", sans-serif; z-index: 10001; opacity: 0; transform: translateY(8px); transition: opacity 0.3s, transform 0.3s; pointer-events: none; }' +
      '.dp-toast--show { opacity: 1; transform: translateY(0); }' +

      /* Mobile */
      '@media (max-width: 768px) {' +
        '#demoPersonaPanel { bottom: 16px; right: 16px; left: 16px; }' +
        '.dp-drawer { width: 100%; }' +
        '.dp-toggle { padding: 10px 16px; }' +
        '.dp-toggle__label { display: none; }' +
      '}';
  }

  // --- Only show on pages with forms ---
  function init() {
    if (document.querySelectorAll('form').length > 0) {
      createPanel();
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
