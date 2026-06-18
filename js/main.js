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
        window.SalesforceInteractions.setConsent({
          consent: consent === 'accept' ? 'OptIn' : 'OptOut'
        });
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
