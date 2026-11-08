/* =========================================================
   SOLLUX landing – interakcje (czysty JS, bez zależności)
   1. Nagłówek: biały stan na hover (CSS) + po przewinięciu za hero
   2. Rozwijane menu / menu mobilne
   3. Slider w hero: autoplay 3 s, crossfade, pasek postępu
   4. Lampy w hero: paralaksa za kursorem, delikatne unoszenie, kliknięcie = włączenie lampy
   ========================================================= */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Klasyczne (nienakładkowe) paski przewijania sprawiają, że 100vw jest szersze niż strona; przekazujemy różnicę do CSS.
  const setScrollbarWidth = () => {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--sbw', `${Math.max(0, sbw)}px`);
  };
  setScrollbarWidth();
  window.addEventListener('resize', setScrollbarWidth);
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------------------------------------------------------
     1. Nagłówek
     --------------------------------------------------------- */
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-slider]');

  const updateHeader = () => {
    const limit = hero ? hero.offsetHeight - header.offsetHeight : 0;
    header.classList.toggle('is-solid', window.scrollY > limit || document.body.classList.contains('menu-open'));
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();

  /* ---------------------------------------------------------
     2. Rozwijane menu (kliknięcie / klawiatura / dotyk; hover obsługuje CSS)
     --------------------------------------------------------- */
  const ddItems = [...document.querySelectorAll('.nav__item.has-dropdown')];
  const closeDropdowns = (except) => {
    ddItems.forEach((item) => {
      if (item === except) return;
      item.classList.remove('is-open');
      item.querySelector('.nav__link').setAttribute('aria-expanded', 'false');
    });
  };
  ddItems.forEach((item) => {
    const btn = item.querySelector('.nav__link');
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      closeDropdowns(item);
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    item.addEventListener('mouseleave', () => {
      if (canHover.matches) closeDropdowns();
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item.has-dropdown')) closeDropdowns();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdowns();
      toggleMenu(false);
    }
  });

  // menu mobilne
  const burger = document.querySelector('[data-burger]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  function toggleMenu(force) {
    if (!burger || !mobileMenu) return;
    const open = typeof force === 'boolean' ? force : burger.getAttribute('aria-expanded') !== 'true';
    if (open === (burger.getAttribute('aria-expanded') === 'true')) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    document.body.classList.toggle('menu-open', open);
    if (open) {
      mobileMenu.hidden = false;
      requestAnimationFrame(() => mobileMenu.classList.add('is-open'));
    } else {
      mobileMenu.classList.remove('is-open');
      setTimeout(() => { if (!mobileMenu.classList.contains('is-open')) mobileMenu.hidden = true; }, 260);
    }
    updateHeader();
  }
  burger && burger.addEventListener('click', () => toggleMenu());
  window.matchMedia('(min-width: 1281px)').addEventListener('change', (e) => e.matches && toggleMenu(false));

  if (!hero) return;

  /* ---------------------------------------------------------
     3. Slider
        - autoplay co 3 s (napędza go animationend paska postępu,
          więc pasek i licznik nigdy się nie rozjadą)
        - crossfade 600 ms ease-in-out, scale obrazu 1.05 -> 1 (800 ms ease-out) – CSS
        - pauza, gdy: lampa świeci, kursor jest nad lampą/sterowaniem,
          fokus klawiatury jest w środku, karta jest ukryta lub hero poza ekranem
     --------------------------------------------------------- */
  const slides = [...hero.querySelectorAll('[data-slide]')];
  const dots = [...hero.querySelectorAll('.dot')];
  const DELAY = 3000;
  hero.style.setProperty('--slide-delay', `${DELAY}ms`);
  let current = 0;
  const pauseReasons = new Set();

  const setPaused = (reason, on) => {
    on ? pauseReasons.add(reason) : pauseReasons.delete(reason);
    hero.classList.toggle('is-paused', pauseReasons.size > 0);
  };

  const setFocusable = (slide, on) => {
    slide.querySelectorAll('a, button').forEach((el) => {
      on ? el.removeAttribute('tabindex') : el.setAttribute('tabindex', '-1');
    });
  };

  const restartProgress = (dot) => {
    const fill = dot.querySelector('.dot__fill');
    fill.style.animation = 'none';
    void fill.offsetWidth; // reflow -> restart animacji CSS
    fill.style.animation = '';
  };

  // One exit timer per slide. Cancel stale timers during rapid swipes/taps.
  const leavingTimers = new WeakMap();
  const clearLeaving = (slide) => {
    const timer = leavingTimers.get(slide);
    if (timer !== undefined) clearTimeout(timer);
    leavingTimers.delete(slide);
    slide.classList.remove('is-leaving');
  };

  function goTo(index) {
    const next = (index + slides.length) % slides.length;
    if (next === current) return;
    const prevSlide = slides[current];
    const nextSlide = slides[next];

    // Re-entering a previously departing slide must cancel its pending cleanup.
    clearLeaving(nextSlide);
    prevSlide.classList.remove('is-active');
    prevSlide.classList.add('is-leaving');
    prevSlide.setAttribute('aria-hidden', 'true');
    setFocusable(prevSlide, false);
    // CSS handles the 600ms fade in parallel with the incoming slide.
    const timer = setTimeout(() => {
      prevSlide.classList.remove('is-leaving');
      leavingTimers.delete(prevSlide);
    }, 650);
    leavingTimers.set(prevSlide, timer);

    nextSlide.classList.add('is-active');
    nextSlide.removeAttribute('aria-hidden');
    setFocusable(nextSlide, true);

    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === next);
      d.classList.toggle('is-done', false);
      i === next ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current');
    });
    restartProgress(dots[next]);

    current = next;
    hero.dispatchEvent(new CustomEvent('slidechange', { detail: { index: current } }));
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
    dot.querySelector('.dot__fill').addEventListener('animationend', () => {
      if (!hero.classList.contains('is-static')) goTo(current + 1);
    });
  });
  hero.querySelector('[data-prev]').addEventListener('click', () => goTo(current - 1));
  hero.querySelector('[data-next]').addEventListener('click', () => goTo(current + 1));

  hero.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  // przesunięcie palcem (dotyk)
  let swipeX = null;
  hero.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') swipeX = e.clientX; });
  hero.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
  });

  // wyzwalacze pauzy
  hero.querySelectorAll('.hero__arrow, .hero__pagination').forEach((el) => {
    el.addEventListener('pointerenter', () => setPaused('control', true));
    el.addEventListener('pointerleave', () => setPaused('control', false));
  });
  hero.addEventListener('focusin', (e) => setPaused('focus', e.target.matches(':focus-visible')));
  hero.addEventListener('focusout', () => setPaused('focus', false));
  document.addEventListener('visibilitychange', () => setPaused('hidden', document.hidden));

  let heroVisible = true;
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    setPaused('offscreen', !heroVisible);
    heroVisible ? startLoop() : stopLoop();
  }, { threshold: 0.15 }).observe(hero);

  const applyMotionPref = () => {
    hero.classList.toggle('is-static', reducedMotion.matches);
  };
  reducedMotion.addEventListener('change', () => { applyMotionPref(); startLoop(); });
  applyMotionPref();
  slides.forEach((s, i) => setFocusable(s, i === current));

  /* ---------------------------------------------------------
     4. Lampy w hero
        - podążają za kursorem z głębią (paralaksa) + delikatne unoszenie
        - kliknięcie / Enter / Spacja przełącza lampę: świecący dyfuzor, poświata,
          wiązka światła, krótkie mrugnięcie; scena ciemnieje, gdy któraś lampa świeci
        - wszystko wyłącznie przez transform / opacity
     --------------------------------------------------------- */
  const lamps = [...hero.querySelectorAll('[data-lamp]')];
  const lights = [...hero.querySelectorAll('[data-light]')];
  const hint = hero.querySelector('[data-cursor-hint]');

  const state = lamps.map((el, i) => ({
    el,
    light: lights[i],
    depth: parseFloat(el.dataset.depth) || 1,
    phase: i * 2.1,
    x: 0, y: 0, r: 0,
  }));

  const pointer = { x: 0, y: 0, active: false };
  let scrollShift = 0;

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointer.active = true;
    if (hint) hint.style.transform = `translate(${e.clientX - rect.left + 18}px, ${e.clientY - rect.top + 18}px)`;
  });
  hero.addEventListener('pointerleave', () => {
    pointer.active = false;
    hint && hint.classList.remove('is-visible');
  });
  window.addEventListener('scroll', () => { scrollShift = window.scrollY; }, { passive: true });

  const anyOn = () => lamps.some((l) => l.getAttribute('aria-pressed') === 'true');
  const labelFor = (lamp, on) => lamp.getAttribute('aria-label').replace(on ? 'Włącz' : 'Wyłącz', on ? 'Wyłącz' : 'Włącz');

  lamps.forEach((lamp, i) => {
    lamp.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      setPaused('lamp-hover', true);
      if (hint) {
        hint.textContent = lamp.getAttribute('aria-pressed') === 'true' ? 'Kliknij, aby wyłączyć' : 'Kliknij, aby włączyć';
        hint.classList.add('is-visible');
      }
    });
    lamp.addEventListener('pointerleave', () => {
      setPaused('lamp-hover', false);
      hint && hint.classList.remove('is-visible');
    });
    lamp.addEventListener('click', () => {
      const on = lamp.getAttribute('aria-pressed') !== 'true';
      lamp.setAttribute('aria-pressed', String(on));
      lamp.setAttribute('aria-label', labelFor(lamp, on));
      const light = lights[i];
      light.classList.remove('is-on', 'is-off');
      void light.offsetWidth;
      light.classList.add(on ? 'is-on' : 'is-off');
      hero.classList.toggle('has-light', anyOn());
      setPaused('lamp-on', anyOn());
      if (hint) hint.textContent = on ? 'Kliknij, aby wyłączyć' : 'Kliknij, aby włączyć';
    });
  });

  // pętla animacji (działa tylko, gdy hero jest widoczne i ruch jest dozwolony)
  let raf = 0;
  let last = 0;
  const TAU = 0.2; // stała czasowa wygładzania (s) -> ~600 ms do ustalenia, zgodnie z zasadą 500–800 ms

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const k = 1 - Math.exp(-dt / TAU);
    const t = now / 1000;
    const vw = hero.offsetWidth;
    const amp = Math.max(14, Math.min(34, vw * 0.018));

    for (const s of state) {
      const tx = pointer.active ? -pointer.x * amp * s.depth : 0;
      const ty = (pointer.active ? -pointer.y * amp * 0.7 * s.depth : 0) - scrollShift * 0.12 * s.depth;
      const tr = pointer.active ? pointer.x * 3 * s.depth : 0;
      s.x += (tx - s.x) * k;
      s.y += (ty - s.y) * k;
      s.r += (tr - s.r) * k;

      // unoszenie w spoczynku: powolne, trochę inne dla każdej lampy
      const fy = Math.sin(t * 0.9 + s.phase) * 7 * s.depth;
      const fx = Math.cos(t * 0.6 + s.phase) * 3 * s.depth;
      const fr = Math.sin(t * 0.7 + s.phase) * 1.2;

      const transform = `translate3d(${(s.x + fx).toFixed(2)}px, ${(s.y + fy).toFixed(2)}px, 0) rotate(${(s.r + fr).toFixed(3)}deg)`;
      s.el.style.transform = transform;
      s.light.style.transform = transform;
    }
  }

  function startLoop() {
    if (raf || reducedMotion.matches || !heroVisible) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      stopLoop();
      state.forEach((s) => { s.el.style.transform = ''; s.light.style.transform = ''; });
    }
  });
  hero.addEventListener('slidechange', (e) => {
    // pętla ma znaczenie tylko na slajdzie 1
    e.detail.index === 0 ? startLoop() : setTimeout(() => current !== 0 && stopLoop(), 800);
  });
  startLoop();
})();
