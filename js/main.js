/* ========================================
   Die Mobiliar – Main JS (Demo)
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* --- Header Scroll Effect --- */
  const header = document.querySelector('.header');
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 20);
      lastScroll = y;
    }, { passive: true });
  }

  /* --- Mobile Nav Toggle --- */
  const burger = document.querySelector('.header__burger');
  const nav = document.querySelector('.header__nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      nav.classList.toggle('open');
    });
    // Close on link click
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('active');
        nav.classList.remove('open');
      });
    });
  }

  /* --- Cookie Banner --- */
  const cookieBanner = document.querySelector('.cookie-banner');
  if (cookieBanner && !localStorage.getItem('mobi-consent')) {
    setTimeout(() => cookieBanner.classList.add('visible'), 1200);
  }

  document.querySelectorAll('[data-consent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const consent = btn.dataset.consent;
      localStorage.setItem('mobi-consent', consent);
      cookieBanner?.classList.remove('visible');

      // Hook for Data Cloud SDK (added later)
      if (window.SalesforceInteractions) {
        try {
          window.SalesforceInteractions.setConsent({
            consent: consent === 'accept' ? 'OptIn' : 'OptOut'
          });
        } catch(e) {
          // setConsent may not exist on this SDK version — consent tracked via sitemap listener
        }
      }
    });
  });

  /* --- Active Nav Highlight --- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.header__nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* --- Scroll Animations (Intersection Observer) --- */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.cat-card, .product-card, .info-box, .usp-item').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });

  /* --- Form Interaction Tracking (placeholder for SDK) --- */
  document.querySelectorAll('.calc-form').forEach(form => {
    let interactionStarted = false;

    form.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('focus', () => {
        if (!interactionStarted) {
          interactionStarted = true;
          // SDK hook: CalculatorStart event
          if (window.__trackEvent) window.__trackEvent('CalculatorStart', { page: currentPage });
        }
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Collect form data
      const data = new FormData(form);
      const values = {};
      data.forEach((v, k) => values[k] = v);

      // SDK hook: FormSubmit event
      if (window.__trackEvent) window.__trackEvent('FormSubmit', values);

      // Show success toast
      showToast('Vielen Dank! Wir kontaktieren Sie in Kürze.');

      // Trigger RT branded email send
      const emailAddr = data.get('email');
      if (emailAddr) {
        const product = currentPage === 'autoversicherung.html' ? 'Autoversicherung'
          : currentPage === 'event.html' ? 'Zibelemärit-Apéro 2026'
          : 'Versicherung';

        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailAddr,
            firstName: data.get('vorname') || '',
            lastName: data.get('nachname') || '',
            product: product
          })
        })
        .then(r => r.json())
        .then(result => {
          console.log('[Mobiliar] RT Email:', result);
        })
        .catch(err => {
          console.warn('[Mobiliar] Email send failed:', err);
        });
      }

      // Reset after delay
      setTimeout(() => form.reset(), 2000);
    });
  });

  /* --- Toast Helper --- */
  window.showToast = function(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3500);
  };

  /* --- Login / Logout Functionality (Floating Popup) --- */
  const DEMO_USER = {
    email: 'marc.baumgartner@email.ch',
    vorname: 'Marc',
    nachname: 'Baumgartner'
  };

  const loginFab = document.getElementById('loginFab');
  const loginPopup = document.getElementById('loginPopup');
  const loginPopupClose = document.getElementById('loginPopupClose');
  const loginForm = document.getElementById('loginForm');
  const prefillBtn = document.getElementById('prefillDemoUser');

  // Restore login state from sessionStorage
  const savedUser = sessionStorage.getItem('mobi-login');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      showLoggedInState(user);
    } catch(e) { /* ignore */ }
  }

  function togglePopup() {
    if (!loginPopup) return;
    const isOpen = loginPopup.classList.contains('visible');
    if (isOpen) {
      loginPopup.classList.remove('visible');
    } else {
      loginPopup.classList.add('visible');
    }
  }

  function closePopup() {
    if (loginPopup) loginPopup.classList.remove('visible');
  }

  function showLoggedInState(user) {
    if (loginFab) {
      loginFab.classList.add('logged-in');
      const initials = (user.vorname || '').charAt(0).toUpperCase() + (user.nachname || '').charAt(0).toUpperCase();
      const textEl = loginFab.querySelector('.login-fab__text');
      if (textEl) {
        textEl.innerHTML = (user.vorname || 'User') + ' ' + (user.nachname || '') + '<small>Abmelden ✕</small>';
      }
      // Change icon to checkmark
      const iconEl = loginFab.querySelector('.login-fab__icon');
      if (iconEl) {
        iconEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
      }
    }
  }

  function showLoggedOutState() {
    if (loginFab) {
      loginFab.classList.remove('logged-in');
      const textEl = loginFab.querySelector('.login-fab__text');
      if (textEl) {
        textEl.innerHTML = 'Anmelden<small>myMobiliar</small>';
      }
      const iconEl = loginFab.querySelector('.login-fab__icon');
      if (iconEl) {
        iconEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';
      }
    }
  }

  function handleLogin(email, vorname, nachname) {
    const user = { email, vorname, nachname };
    sessionStorage.setItem('mobi-login', JSON.stringify(user));
    showLoggedInState(user);
    closePopup();

    // Fire Data Cloud identity events (anonymous → known)
    if (window.__loginIdentity) {
      window.__loginIdentity(email, vorname, nachname);
    }

    // Dispatch custom event for DT360 panel
    window.dispatchEvent(new CustomEvent('mobi-login', { detail: user }));

    showToast('Willkommen, ' + (vorname || 'Benutzer') + '!');
  }

  function handleLogout() {
    sessionStorage.removeItem('mobi-login');
    showLoggedOutState();

    // Fire logout event
    if (window.__logoutIdentity) {
      window.__logoutIdentity();
    }

    // Dispatch custom event for DT360 panel
    window.dispatchEvent(new CustomEvent('mobi-logout'));

    showToast('Sie wurden abgemeldet.');
  }

  // FAB click — toggle popup or logout
  if (loginFab) {
    loginFab.addEventListener('click', () => {
      if (loginFab.classList.contains('logged-in')) {
        handleLogout();
      } else {
        togglePopup();
      }
    });
  }

  if (loginPopupClose) {
    loginPopupClose.addEventListener('click', closePopup);
  }

  // Demo prefill button — instant login
  if (prefillBtn) {
    prefillBtn.addEventListener('click', () => {
      handleLogin(DEMO_USER.email, DEMO_USER.vorname, DEMO_USER.nachname);
    });
  }

  // Manual form submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value;
      const vorname = document.getElementById('login-vorname')?.value;
      const nachname = document.getElementById('login-nachname')?.value;
      if (email) {
        handleLogin(email, vorname, nachname);
      }
    });
  }

  // Close popup on Escape or outside click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });
  document.addEventListener('click', (e) => {
    if (loginPopup && loginPopup.classList.contains('visible')) {
      if (!loginPopup.contains(e.target) && e.target !== loginFab && !loginFab?.contains(e.target)) {
        closePopup();
      }
    }
  });

  /* --- Smooth Scroll for Anchors --- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      e.preventDefault();
      const target = document.querySelector(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
