/* Controls existing UI state via same-origin native DOM events; no duplicate storefront logic. */
(() => {
  'use strict';
  const frame = document.getElementById('landing-preview');
  const stage = document.querySelector('[data-frame-container]');
  const status = document.getElementById('lab-status');
  const indicator = document.getElementById('viewport-indicator');
  const presets = [...document.querySelectorAll('[data-width]')];
  const slideButtons = [...document.querySelectorAll('[data-slide-to]')];
  const lampButtons = [...document.querySelectorAll('[data-lamp-to]')];
  let deviceWidth = 1440;
  const live = () => {
    try {
      const doc = frame.contentDocument;
      return doc?.readyState === 'complete' ? doc : null;
    } catch { return null; }
  };
  function resize() {
    const parent = stage.parentElement;
    const style = getComputedStyle(parent);
    const outerWidth = Math.max(280, parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const scale = Math.min(1, outerWidth / deviceWidth);
    const visibleWidth = Math.min(deviceWidth, outerWidth);
    stage.style.width = `${visibleWidth}px`;
    stage.style.height = `${Math.round(Math.min(700, 930 * scale))}px`;
    frame.style.width = `${deviceWidth}px`;
    frame.style.height = '930px';
    frame.style.transform = `scale(${scale})`;
    indicator.textContent = `Szerokość: ${deviceWidth} px · skala podglądu: ${Math.round(scale * 100)}%`;
  }
  function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  function inspect() {
    const doc = live();
    if (!doc) {
      setText('inspect-ready', 'Brak dostępu');
      status.textContent = 'Uruchom stronę przez localhost lub Netlify, aby sterować interakcjami w tej samej domenie.';
      return;
    }
    const slides = [...doc.querySelectorAll('[data-slide]')];
    const lamps = [...doc.querySelectorAll('[data-lamp]')];
    const selectedSlide = slides.findIndex(el => el.classList.contains('is-active'));
    const activeLamps = lamps.filter(el => el.getAttribute('aria-pressed') === 'true').length;
    const shader = doc.querySelector('[data-shader]');
    const glow = doc.querySelector('.glow');
    const hasFallback = !!glow && frame.contentWindow.getComputedStyle(glow).backgroundImage !== 'none';
    const overflow = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);
    setText('inspect-ready', 'Połączono');
    setText('inspect-slide', selectedSlide < 0 ? '—' : `Scena 0${selectedSlide+1}`);
    setText('inspect-lamps', `${activeLamps} / ${lamps.length}`);
    setText('inspect-shader', shader?.classList.contains('is-ready') ? 'WebGL aktywny' : hasFallback ? 'Wariant CSS' : 'Niedostępne');
    setText('inspect-overflow', `${overflow}px`);
    slideButtons.forEach(button => {
      const on = Number(button.dataset.slideTo) === selectedSlide;
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    lampButtons.forEach((button,index) => {
      const on = lamps[index]?.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(on));
      button.querySelector('b').textContent = on ? 'WŁ.' : 'WYŁ.';
    });
  }
  function engage(callback) {
    const doc = live();
    if (!doc) { inspect(); return; }
    callback(doc);
    inspect();
  }
  presets.forEach(button => button.addEventListener('click', () => {
    deviceWidth = Number(button.dataset.width);
    presets.forEach(b => {
      const on = b === button;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    resize();
    status.textContent = `Ustawiono szerokość ${deviceWidth} px. Sprawdź układ w interaktywnym podglądzie.`;
    inspect();
  }));
  slideButtons.forEach(button => button.addEventListener('click', () => engage(doc => {
    doc.querySelectorAll('.dot')[Number(button.dataset.slideTo)]?.click();
    status.textContent = `Włączono scenę karuzeli ${Number(button.dataset.slideTo)+1} na rzeczywistej stronie.`;
  })));
  lampButtons.forEach(button => button.addEventListener('click', () => engage(doc => {
    if (!doc.querySelector('[data-slide].is-active [data-lamp]')) doc.querySelectorAll('.dot')[0]?.click();
    doc.querySelectorAll('[data-lamp]')[Number(button.dataset.lampTo)]?.click();
    status.textContent = 'Uruchomiono oryginalne zdarzenie kliknięcia lampy.';
  })));
  document.querySelector('[data-reset]')?.addEventListener('click', () => engage(doc => {
    doc.querySelectorAll('.dot')[0]?.click();
    doc.querySelectorAll('[data-lamp]').forEach(button => {
      if (button.getAttribute('aria-pressed') === 'true') button.click();
    });
    doc.defaultView.scrollTo({top:0,behavior:'instant'});
    status.textContent = 'Przywrócono pierwszy slajd i wyłączono wszystkie lampy.';
  }));
  frame.addEventListener('load', () => { resize(); inspect(); status.textContent = 'Połączono ze stroną. Wypróbuj sterowanie sceną.'; });
  frame.addEventListener('error', () => { status.textContent = 'Nie udało się wczytać strony w podglądzie.'; });
  window.addEventListener('resize', resize);
  resize();
  // Observes native carousel autoplay without modifying the embedded document.
  window.setInterval(() => { if (!document.hidden) inspect(); }, 850);
})();
