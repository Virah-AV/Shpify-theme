/* Virah contact page — reveal animations, FAQ accordion + search, AJAX inquiry form */
(() => {
  if (window.__vcContactLoaded) return;
  window.__vcContactLoaded = true;

  /* ---------- Count-up numbers ---------- */
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const runCounters = (root) => {
    root.querySelectorAll('[data-vc-count]').forEach((el) => {
      if (el.dataset.vcCounted) return;
      el.dataset.vcCounted = 'true';
      const target = parseFloat(el.dataset.vcCount);
      if (isNaN(target) || reduceMotion) return;
      const decimals = (el.dataset.vcCount.split('.')[1] || '').length;
      const format = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(target * eased);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = format(target);
      };
      el.textContent = format(0);
      requestAnimationFrame(tick);
    });
  };

  /* ---------- Reveal on scroll ---------- */
  const revealObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-in');
              runCounters(entry.target);
              revealObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        )
      : null;

  const initReveal = (root) => {
    root.querySelectorAll('.vc[data-vc-animate="true"]').forEach((section) => {
      if (!revealObserver || section.closest('.shopify-design-mode')) {
        section.classList.add('is-in');
        return;
      }
      revealObserver.observe(section);
    });
  };

  /* ---------- FAQ accordion ---------- */
  const setPanel = (item, open, animate = true) => {
    const btn = item.querySelector('.vc-faq__q');
    const panel = item.querySelector('.vc-faq__a');
    if (!btn || !panel) return;
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (!animate) panel.style.transition = 'none';
    panel.style.gridTemplateRows = open ? '1fr' : '0fr';
    if (!animate) requestAnimationFrame(() => (panel.style.transition = ''));
  };

  const initFaq = (root) => {
    root.querySelectorAll('[data-vc-faq]').forEach((faq) => {
      if (faq.dataset.vcReady) return;
      faq.dataset.vcReady = 'true';
      const single = faq.dataset.allowMultiple !== 'true';
      const items = Array.from(faq.querySelectorAll('.vc-faq__item'));

      items.forEach((item) => {
        setPanel(item, item.classList.contains('is-open'), false);
        item.querySelector('.vc-faq__q')?.addEventListener('click', () => {
          const willOpen = !item.classList.contains('is-open');
          if (single && willOpen) items.forEach((other) => other !== item && setPanel(other, false));
          setPanel(item, willOpen);
        });
      });

      const search = faq.querySelector('[data-vc-faq-search]');
      const empty = faq.querySelector('[data-vc-faq-empty]');
      if (search) {
        search.addEventListener('input', () => {
          const term = search.value.trim().toLowerCase();
          let visible = 0;
          items.forEach((item) => {
            const match = !term || item.textContent.toLowerCase().includes(term);
            item.hidden = !match;
            if (match) visible += 1;
          });
          if (empty) empty.hidden = visible > 0;
        });
      }
    });
  };

  /* ---------- Inquiry form ---------- */
  const initForms = (root) => {
    root.querySelectorAll('[data-vc-form]').forEach((wrapper) => {
      if (wrapper.dataset.vcReady) return;
      wrapper.dataset.vcReady = 'true';
      const form = wrapper.querySelector('form');
      if (!form) return;

      const btn = form.querySelector('[data-vc-submit]');
      const errorBox = wrapper.querySelector('[data-vc-form-error]');
      const success = wrapper.querySelector('[data-vc-form-success]');
      const reset = wrapper.querySelector('[data-vc-form-reset]');
      const topic = form.querySelector('select[data-vc-topic]');

      const selects = Array.from(form.querySelectorAll('select'));

      // Pre-select a topic from ?topic=… (e.g. links from the routing cards)
      const wanted = new URLSearchParams(window.location.search).get('topic');
      if (wanted) {
        const needle = wanted.toLowerCase().replace(/[-_]+/g, ' ');
        if (topic) {
          const option = Array.from(topic.options).find((o) => o.value && o.value.toLowerCase().includes(needle));
          if (option) topic.value = option.value;
        }
        const radio = Array.from(form.querySelectorAll('input[data-vc-topic-radio]')).find((r) =>
          r.value.toLowerCase().includes(needle)
        );
        if (radio) radio.checked = true;
      }

      // Floating label state for selects
      const syncSelect = () => selects.forEach((sel) => sel.classList.toggle('has-value', !!sel.value));
      selects.forEach((sel) => sel.addEventListener('change', syncSelect));
      syncSelect();

      const setLoading = (loading) => {
        if (!btn) return;
        btn.classList.toggle('is-loading', loading);
        btn.disabled = loading;
        btn.setAttribute('aria-busy', String(loading));
      };

      const showSuccess = () => {
        wrapper.classList.add('is-sent');
        if (success) {
          success.hidden = false;
          success.focus({ preventScroll: true });
        }
      };

      form.addEventListener('submit', async (event) => {
        if (!window.fetch || !window.FormData) return;
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;
        setLoading(true);

        try {
          const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'text/html' },
            credentials: 'same-origin',
          });
          const url = response.url || '';

          if (url.includes('/challenge')) {
            // Shopify spam protection — hand over to a normal submission
            HTMLFormElement.prototype.submit.call(form);
            return;
          }

          if (response.ok && url.includes('contact_posted=true')) {
            form.reset();
            syncSelect();
            showSuccess();
          } else {
            throw new Error('Contact form not accepted');
          }
        } catch (error) {
          if (errorBox) errorBox.hidden = false;
        } finally {
          setLoading(false);
        }
      });

      reset?.addEventListener('click', () => {
        wrapper.classList.remove('is-sent');
        if (success) success.hidden = true;
        form.querySelector('input, select, textarea')?.focus();
      });
    });
  };

  const init = (root = document) => {
    initReveal(root);
    initFaq(root);
    initForms(root);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
  document.addEventListener('shopify:block:select', (event) => {
    const item = event.target.closest?.('.vc-faq__item');
    if (item) setPanel(item, true);
  });
})();
