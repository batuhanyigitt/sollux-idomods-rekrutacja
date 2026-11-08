/* SOLLUX visual-content layer. No framework, backend, or runtime dependency. */
(() => {
  'use strict';
  const TEXT_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','A','SPAN','BUTTON','LABEL','SMALL','STRONG','EM','LI','DIV','ADDRESS','DT','DD','TIME']);
  const IMAGE_TAGS = new Set(['IMG']);
  const THEME_KEYS = ['--c-yellow','--c-ink','--c-text','--c-tile-blue','--c-tile-cream','--c-tile-grey','--c-white','--c-black','--c-grey-btn','--c-line'];
  const isTextNode = n => n.nodeType === 3 && !!n.textContent.trim();
  const relevantNodes = element => Array.from(element.childNodes).filter(node => isTextNode(node) || node.nodeName === 'BR');
  function pathFor(element) {
    const result = [];
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      if (!el.parentElement) return null;
      let ordinal = 1;
      for (let sibling = el.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
        if (sibling.tagName === el.tagName) ordinal++;
      }
      result.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${ordinal})`);
    }
    return 'body > ' + result.join(' > ');
  }
  function directText(element) {
    return relevantNodes(element).map(n => n.nodeName === 'BR' ? '\n' : n.textContent).join('').trim();
  }
  function setText(element, value) {
    // Only replace direct text and line-break nodes. Preserve icons, links and other markup.
    const nodes = relevantNodes(element);
    const first = nodes[0] || null;
    const next = first ? first.nextSibling : element.firstChild;
    const fragment = document.createDocumentFragment();
    String(value).split('\n').forEach((part, index) => {
      if (index) fragment.appendChild(document.createElement('br'));
      fragment.appendChild(document.createTextNode(part));
    });
    if (first) element.insertBefore(fragment, first);
    else element.insertBefore(fragment, next);
    nodes.forEach(n => n.remove());
  }
  function buildIndex() {
    const elements = Array.from(document.body.querySelectorAll('*'));
    for (const el of elements) {
      if (el.closest('[data-no-visual-edit]')) continue;
      if (IMAGE_TAGS.has(el.tagName)) {
        const key = pathFor(el); if (key) el.dataset.cmsImage = key;
      }
      if (TEXT_TAGS.has(el.tagName) && relevantNodes(el).length && directText(el)) {
        const key = pathFor(el); if (key) el.dataset.cmsText = key;
      }
    }
  }
  function getElement(key) {
    if (typeof key !== 'string' || !key.startsWith('body > ') || key.length > 2048) return null;
    try { return document.querySelector(key); } catch (_) { return null; }
  }
  // Keep client-side validation aligned with cms-shared.mjs.
  const isSecureRemoteUrl = raw => typeof raw === 'string' && /^https:\/\/[\w.-]+(?::[0-9]+)?(?:\/[^\s<>"']*)?$/i.test(raw);
  function validImageUrl(raw) {
    return typeof raw === 'string' && raw.length < 1200 && (
      isSecureRemoteUrl(raw) ||
      (/^assets\/[\w./-]+$/.test(raw) && !raw.includes('..')) ||
      /^\/\.netlify\/functions\/cms\?action=media&id=[a-f0-9-]{20,80}$/.test(raw)
    );
  }
  function validLinkUrl(raw) {
    return typeof raw === 'string' && raw.length <= 1000 && (
      isSecureRemoteUrl(raw) ||
      /^(\/[a-zA-Z0-9#?=&/._-]*|#[a-zA-Z0-9_-]*)$/.test(raw)
    );
  }
  function validColor(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  }
  const EMPTY = () => ({version:1,texts:{},images:{},styles:{},theme:{},links:{},blocks:[]});
  function normalize(input) {
    const out = EMPTY();
    if (!input || typeof input !== 'object') return out;
    for (const key of ['texts','images','styles','theme','links']) {
      if (input[key] && typeof input[key] === 'object' && !Array.isArray(input[key])) out[key] = input[key];
    }
    if (Array.isArray(input.blocks)) out.blocks = input.blocks.filter(b => b && typeof b === 'object').slice(0,40);
    return out;
  }
  const original = new Map();
  function remember(element) {
    if (!original.has(element)) original.set(element, {text:directText(element),src:element.getAttribute('src'),href:element.getAttribute('href'),color:element.style.color,backgroundColor:element.style.backgroundColor,fontSize:element.style.fontSize});
  }
  function resetDom() {
    for (const [element, state] of original) {
      if (!element.isConnected) continue;
      if (element.dataset.cmsText) setText(element, state.text);
      if (element.tagName === 'IMG' && state.src !== null) element.setAttribute('src',state.src);
      if (element.tagName === 'A' && state.href !== null) element.setAttribute('href', state.href);
      element.style.color = state.color;
      element.style.backgroundColor = state.backgroundColor;
      element.style.fontSize = state.fontSize;
    }
    for (const key of THEME_KEYS) document.documentElement.style.removeProperty(key);
    document.getElementById('sollux-cms-blocks')?.replaceChildren();
  }
  function apply(input, clearFirst=false) {
    const data = normalize(input);
    if (clearFirst) resetDom();
    for (const [key, text] of Object.entries(data.texts)) {
      const el = getElement(key);
      if (el && el.dataset.cmsText && typeof text === 'string' && text.length < 5000) {
        remember(el); setText(el, text);
      }
    }
    for (const [key, src] of Object.entries(data.images)) {
      const el = getElement(key);
      if (el && el.tagName === 'IMG' && validImageUrl(src)) {remember(el);el.setAttribute('src',src);}
    }
    for (const [key, href] of Object.entries(data.links)) {
      const el = getElement(key);
      if (el && el.tagName === 'A' && validLinkUrl(href)) {remember(el);el.setAttribute('href',href);}
    }
    for (const [key, style] of Object.entries(data.styles)) {
      const el = getElement(key);
      if (!el || !style || typeof style !== 'object') continue;
      remember(el);
      if (validColor(style.color)) el.style.color = style.color;
      if (validColor(style.backgroundColor)) el.style.backgroundColor = style.backgroundColor;
      if (typeof style.fontSize === 'number' && style.fontSize >= 9 && style.fontSize <= 128) el.style.fontSize = style.fontSize + 'px';
    }
    for (const key of THEME_KEYS) {
      if (validColor(data.theme[key])) document.documentElement.style.setProperty(key,data.theme[key]);
    }
    renderBlocks(data.blocks);
    return data;
  }

  const BLOCK_TYPES = new Set(['text','split','cta']);
  function renderBlocks(blocks) {
    let root = document.getElementById('sollux-cms-blocks');
    if (!root) {
      root = document.createElement('div');root.id='sollux-cms-blocks';root.setAttribute('aria-label','Dodatkowe sekcje');
      const footer=document.querySelector('footer');(footer?.parentNode||document.body).insertBefore(root,footer||null);
    }
    root.replaceChildren();
    for (const b of Array.isArray(blocks)?blocks.slice(0,40):[]) {
      if (!b || !BLOCK_TYPES.has(b.type) || b.hidden === true) continue;
      const section=document.createElement('section');section.className='cms-custom-block cms-custom-block--'+b.type;
      section.dataset.cmsBlockId=String(b.id||'').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80);
      if (validColor(b.background)) section.style.background=b.background;
      if (validColor(b.foreground)) section.style.color=b.foreground;
      const wrap=document.createElement('div');wrap.className='cms-custom-block__inner';
      const copy=document.createElement('div');copy.className='cms-custom-block__copy';
      const heading=document.createElement('h2');heading.textContent=String(b.title||'').slice(0,160);
      const para=document.createElement('p');para.textContent=String(b.body||'').slice(0,1500);
      copy.append(heading,para);
      if(b.type==='cta'){
        const a=document.createElement('a');a.className='cms-custom-block__button';a.href=(typeof b.url==='string' && validLinkUrl(b.url))?b.url:'#';
        a.textContent=String(b.buttonText||'Dowiedz się więcej').slice(0,80);copy.append(a);
      }
      if(b.type==='split' && validImageUrl(b.image||'')){
        const figure=document.createElement('div');figure.className='cms-custom-block__image';
        const img=document.createElement('img');img.src=b.image;img.alt=String(b.alt||'').slice(0,160);img.loading='lazy';figure.append(img);
        if(b.imageSide==='left')wrap.append(figure,copy);else wrap.append(copy,figure);
      }else wrap.append(copy);
      section.append(wrap);root.append(section);
    }
  }

  function entries() {
    const text = Array.from(document.querySelectorAll('[data-cms-text]')).map(el=>({type:'text',key:el.dataset.cmsText,label:directText(el).slice(0,140),tag:el.tagName.toLowerCase()}));
    const images = Array.from(document.querySelectorAll('[data-cms-image]')).map(el=>({type:'image',key:el.dataset.cmsImage,label:(el.getAttribute('alt') || el.getAttribute('src') || 'Image').slice(0,90),src:el.getAttribute('src')}));
    return {text,images};
  }
  function init() {
    buildIndex();
    // Capture the original DOM state before edits, for previews and reset.
    document.querySelectorAll('[data-cms-text],[data-cms-image]').forEach(remember);
    apply(window.SOLLUX_CONTENT || EMPTY());
    window.dispatchEvent(new Event('sollux-content-ready'));
  }
  window.SolluxContent = {init,apply,entries,pathFor,directText,setText,getElement,validImageUrl,validLinkUrl,validColor,EMPTY,THEME_KEYS,renderBlocks};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
