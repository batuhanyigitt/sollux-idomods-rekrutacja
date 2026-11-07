/* Reviewer companion only. Does not modify the storefront code. */
(() => {
  'use strict';
  const trigger = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('global-nav');
  if (trigger && nav) {
    const close = () => { trigger.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(expanded));
      nav.classList.toggle('open', expanded);
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }
  const status = document.getElementById('copy-status');
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        if (status) status.textContent = `Skopiowano kod ${value} do schowka.`;
      } catch {
        if (status) status.textContent = `Kopiowanie niedostępne w tej przeglądarce. Kod HEX: ${value}`;
      }
    });
  });
  document.querySelectorAll('[data-image-size]').forEach(label => {
    const img = Array.from(document.querySelectorAll('.asset-tile img')).find(item => item.getAttribute('src') === label.dataset.imageSize);
    if (!img) return;
    const update = () => { label.textContent = img.naturalWidth ? `${img.naturalWidth} × ${img.naturalHeight} · WebP` : 'Obraz niedostępny'; };
    if (img.complete) update(); else { img.addEventListener('load', update, {once:true}); img.addEventListener('error', update, {once:true}); }
  });
})();
