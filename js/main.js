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

  /* --- Login / Logout Functionality --- */
  const DEMO_USER = {
    email: 'marc.baumgartner@email.ch',
    vorname: 'Marc',
    nachname: 'Baumgartner'
  };

  const loginBtn = document.getElementById('loginBtn');
  const loginModal = document.getElementById('loginModal');
  const loginModalClose = document.getElementById('loginModalClose');
  const loginCancelBtn = document.getElementById('loginCancelBtn');
  const loginForm = document.getElementById('loginForm');
  const prefillBtn = document.getElementById('prefillDemoUser');
  const userInfoEl = document.getElementById('userInfo');
  const userAvatarEl = document.getElementById('userAvatar');
  const userNameEl = document.getElementById('userName');
  const logoutBtn = document.getElementById('logoutBtn');

  // Restore login state from sessionStorage
  const savedUser = sessionStorage.getItem('mobi-login');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      showLoggedInState(user);
    } catch(e) { /* ignore */ }
  }

  function openLoginModal() {
    if (loginModal) loginModal.classList.add('visible');
  }
  function closeLoginModal() {
    if (loginModal) loginModal.classList.remove('visible');
  }

  function showLoggedInState(user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfoEl) {
      userInfoEl.classList.add('visible');
      const initials = (user.vorname || '').charAt(0).toUpperCase() + (user.nachname || '').charAt(0).toUpperCase();
      if (userAvatarEl) userAvatarEl.textContent = initials || '?';
      if (userNameEl) userNameEl.textContent = (user.vorname || '') + ' ' + (user.nachname || '');
    }
  }

  function handleLogin(email, vorname, nachname) {
    const user = { email, vorname, nachname };
    sessionStorage.setItem('mobi-login', JSON.stringify(user));
    showLoggedInState(user);
    closeLoginModal();

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
    if (loginBtn) loginBtn.style.display = '';
    if (userInfoEl) userInfoEl.classList.remove('visible');

    // Fire logout event
    if (window.__logoutIdentity) {
      window.__logoutIdentity();
    }

    // Dispatch custom event for DT360 panel
    window.dispatchEvent(new CustomEvent('mobi-logout'));

    showToast('Sie wurden abgemeldet.');
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', openLoginModal);
  }
  if (loginModalClose) {
    loginModalClose.addEventListener('click', closeLoginModal);
  }
  if (loginCancelBtn) {
    loginCancelBtn.addEventListener('click', closeLoginModal);
  }
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeLoginModal();
    });
  }
  if (prefillBtn) {
    prefillBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('login-email');
      const vornameInput = document.getElementById('login-vorname');
      const nachnameInput = document.getElementById('login-nachname');
      if (emailInput) emailInput.value = DEMO_USER.email;
      if (vornameInput) vornameInput.value = DEMO_USER.vorname;
      if (nachnameInput) nachnameInput.value = DEMO_USER.nachname;
    });
  }
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
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLoginModal();
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
