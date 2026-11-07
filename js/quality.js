/* Browser assertions are genuine and run only when requested; nothing is pre-marked as passing. */
(() => {
  'use strict';
  const frame = document.getElementById('audit-frame');
  const launch = document.getElementById('run-qa');
  const chooser = document.getElementById('qa-width');
  const message = document.getElementById('qa-message');
  const exportButton = document.getElementById('qa-export');
  let lastReport = null;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const content = () => {
    try { return frame.contentDocument?.readyState === 'complete' ? frame.contentDocument : null; }
    catch { return null; }
  };
  const frameReady = () => new Promise((resolve, reject) => {
    if (content()) return resolve();
    const timer = setTimeout(() => reject(new Error('Nie udało się wczytać strony testowej.')), 12000);
    frame.addEventListener('load', () => { clearTimeout(timer); resolve(); }, {once:true});
  });
  function setResult(key, status, detail='') {
    const row = document.querySelector(`[data-check="${key}"]`);
    if (!row) return {key, status, detail};
    row.classList.toggle('pass', status === 'pass');
    row.classList.toggle('fail', status !== 'pass');
    row.querySelector('.qa-icon').textContent = status === 'pass' ? '✓' : '!';
    row.querySelector('.qa-status').textContent = status === 'pass' ? 'OK' : 'SPRAWDŹ';
    row.title = detail;
    return {key, status, detail};
  }
  async function run() {
    launch.disabled = true;
    exportButton.disabled = true;
    lastReport = null;
    message.textContent = 'Trwają testy w przeglądarce…';
    document.getElementById('qa-overall').textContent = 'W trakcie';
    document.getElementById('qa-pass').textContent = '—';
    const width = Number(chooser.value);
    document.getElementById('qa-viewport').textContent = `${width}px`;
    frame.style.width = `${width}px`;
    try {
      await frameReady();
      await wait(500);
      const doc = content();
      if (!doc) throw new Error('Brak dostępu do strony testowej. Użyj serwera lokalnego lub Netlify.');
      const win = frame.contentWindow;
      const results = [];
      const check = (key, condition, detail) => results.push(setResult(key, Boolean(condition) ? 'pass' : 'fail', detail));
      check('ready', doc.documentElement.lang === 'pl' && !!doc.querySelector('main') && !!doc.querySelector('h1') && !!doc.querySelector('.skip-link'), 'Język polski, element main, nagłówek h1 i link pomijania nawigacji');
      const hero = [...doc.querySelectorAll('.stage__bg,.stage__lamps img')];
      check('assets', hero.length === 4 && hero.every(img => img.complete && img.naturalWidth > 0), `${hero.filter(img => img.complete && img.naturalWidth).length} z 4 grafik sekcji głównej zostało wczytanych`);
      const overflow = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);
      check('layout', overflow <= 2, `${overflow} px przewijania poziomego przy szerokości ${width} px`);
      const dots = [...doc.querySelectorAll('.dot')];
      const slides = [...doc.querySelectorAll('[data-slide]')];
      if (dots.length > 1) dots[1].click();
      const slideOk = slides.length === 2 && slides[1].classList.contains('is-active') && slides[0].getAttribute('aria-hidden') === 'true' && dots[1]?.getAttribute('aria-current') === 'true';
      check('slider', slideOk, 'Drugi slajd aktywny, atrybuty ARIA zaktualizowane');
      dots[0]?.click();
      const lamps = [...doc.querySelectorAll('[data-lamp]')];
      const lamp = lamps[0];
      const initial = lamp?.getAttribute('aria-pressed');
      lamp?.click();
      const lampOk = (initial === 'true' || initial === 'false') && lamp?.getAttribute('aria-pressed') !== initial && lamp?.tagName === 'BUTTON';
      check('lighting', lampOk, 'Oryginalny przycisk lampy zmienił stan aria-pressed');
      if (lamp?.getAttribute('aria-pressed') !== initial) lamp?.click();
      const canvas = doc.querySelector('[data-shader]');
      const glow = doc.querySelector('.glow');
      const gpu = canvas?.classList.contains('is-ready');
      const fallback = !!glow && win.getComputedStyle(glow).backgroundImage !== 'none';
      check('shader', gpu || fallback, gpu ? 'Zainicjowano canvas WebGL' : fallback ? 'Dostępny zapasowy gradient CSS' : 'Nie znaleziono wariantu awaryjnego');
      // Local linked resources are read from the real origin and checked independently.
      const paths=['css/style.css','js/main.js','js/shader.js'];
      const resourceStates = await Promise.all(paths.map(async path => {
        try { const response = await fetch(path, {method:'GET',cache:'no-store'}); return {path, ok:response.ok}; }
        catch { return {path,ok:false}; }
      }));
      check('links', resourceStates.every(r => r.ok), resourceStates.map(r => `${r.path}: ${r.ok ? 'OK' : 'BŁĄD'}`).join('; '));
      const burger = doc.querySelector('[data-burger]');
      check('navigation', burger?.tagName === 'BUTTON' && burger.hasAttribute('aria-expanded') && burger.hasAttribute('aria-controls'), 'Menu mobilne udostępnia przycisk oraz informację o rozwinięciu');
      let cssText='';
      try { const response=await fetch('css/style.css',{cache:'no-store'}); if(response.ok) cssText=await response.text(); } catch { /* fail transparently */ }
      check('reduced', /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(cssText), 'Arkusz stylów zawiera reguły ograniczania animacji');
      const ids=new Set([...doc.querySelectorAll('[id]')].map(el=>el.id));
      const links=[...doc.querySelectorAll('a[href^="#"]')].map(el=>el.getAttribute('href')).filter(href=>href && href!=='#');
      const missing=links.filter(href=>!ids.has(decodeURIComponent(href.slice(1))));
      check('targets', missing.length === 0, missing.length ? `Brakujące cele: ${missing.join(', ')}` : `${links.length} odnośników wewnętrznych prowadzi do istniejących elementów`);
      const passed=results.filter(result=>result.status==='pass').length;
      lastReport={project:'SOLLUX / testy przeglądarkowe',generatedAt:new Date().toISOString(),viewport:width,passed,total:results.length,results,disclaimer:'Podstawowe testy działania, nie certyfikacja Lighthouse ani WCAG.'};
      document.getElementById('qa-pass').textContent=String(passed);
      document.getElementById('qa-overall').textContent=passed===results.length?'Wszystkie testy zaliczone':`${results.length-passed} wymaga weryfikacji`;
      document.getElementById('qa-time').textContent=new Date().toLocaleTimeString();
      message.textContent=`Zaliczono ${passed} z ${results.length} testów. Nieprawidłowe wyniki pozostają widoczne. Możesz pobrać raport.`;
      exportButton.disabled=false;
      refreshMetrics();
    } catch (error) {
      message.textContent=`Nie można ukończyć testów: ${error.message}`;
      document.getElementById('qa-overall').textContent='Niedostępne';
    } finally {launch.disabled=false;}
  }
  function refreshMetrics() {
    const doc=content();
    if(!doc) {document.getElementById('metric-gl').textContent='Niedostępne';return;}
    const images=[...doc.images];
    const navigation=frame.contentWindow.performance.getEntriesByType('navigation')[0];
    document.getElementById('metric-nodes').textContent=doc.querySelectorAll('*').length.toLocaleString();
    document.getElementById('metric-images').textContent=`${images.filter(img=>img.complete && img.naturalWidth>0).length}/${images.length}`;
    const duration=navigation?.duration;
    document.getElementById('metric-nav').textContent=Number.isFinite(duration) && duration>0 ? `${Math.round(duration)} ms` : 'B/D';
    const shader=doc.querySelector('[data-shader]');
    const glow=doc.querySelector('.glow');
    document.getElementById('metric-gl').textContent=shader?.classList.contains('is-ready') ? 'Aktywny' : glow && frame.contentWindow.getComputedStyle(glow).backgroundImage !== 'none' ? 'Wariant CSS' : 'B/D';
  }
  launch.addEventListener('click',run);
  chooser.addEventListener('change',()=>{
    frame.style.width=`${chooser.value}px`;
    document.getElementById('qa-viewport').textContent=`${chooser.value}px`;
    document.getElementById('qa-overall').textContent='Wymaga ponownego testu';
    document.getElementById('qa-pass').textContent='—';
    document.querySelectorAll('[data-check]').forEach(row=>{row.classList.remove('pass','fail');row.querySelector('.qa-icon').textContent='○';row.querySelector('.qa-status').textContent='NIE WYKONANO';});
    exportButton.disabled=true;
    lastReport=null;
    message.textContent='Zmieniono szerokość. Uruchom testy ponownie dla tego widoku.';
  });
  document.getElementById('refresh-metrics').addEventListener('click',refreshMetrics);
  exportButton.addEventListener('click',()=>{
    if(!lastReport) return;
    const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`sollux-qa-${lastReport.viewport}px.json`;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  frame.addEventListener('load',refreshMetrics);
})();
