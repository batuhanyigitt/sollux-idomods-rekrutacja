/* SOLLUX CMS Studio: inline live preview, server-backed drafts and publishing. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const frame = $('pageFrame');
  const API='/.netlify/functions/cms';
  const SECTION_NAMES = {HEADER:'Nawigacja',MAIN:'Strona główna',FOOTER:'Stopka',SECTION:'Sekcja',DIV:'Zawartość'};
  const PALETTE = [
    ['--c-ink','Ciemne tło','#101011'],['--c-text','Tekst','#1a1a1a'],
    ['--c-yellow','Akcent żółty','#f2bf25'],['--c-tile-blue','Kafel niebieski','#72a3f3'],
    ['--c-tile-cream','Kafel kremowy','#fdf8eb'],['--c-tile-grey','Kafel szary','#e8e4df'],
    ['--c-white','Biel','#ffffff'],['--c-black','Czerń','#000000'],
    ['--c-grey-btn','Przyciski','#4a4a4a'],['--c-line','Separatory','#e6e6e6']
  ];
  let model = blank(), doc = null, api = null, selection = null, selectMode = true;
  let items = {text:[],images:[]}, saveTimeout = null, toastTimeout = null;
  let undoStack = [], redoStack = [], lastHistory = 0, saveSequence = Promise.resolve();
  let inlineEditing = null;
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function blank(){return {version:1,texts:{},images:{},styles:{},theme:{},links:{},blocks:[]};}
  function normalize(obj){
    const safe=blank();
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return safe;
    for (const k of ['texts','images','styles','theme','links']) {
      if(obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]))
        for(const [key,value] of Object.entries(obj[k])) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          safe[k][key]=value;
        }
    }
    if(Array.isArray(obj.blocks))safe.blocks=obj.blocks.slice(0,40).map(b=>({...b}));
    return safe;
  }
  function status(s){$('saveStatus').textContent=s;}
  function notify(s){const el=$('toast');el.textContent=s;el.classList.add('is-visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('is-visible'),3200);}
  function countChanges(){return ['texts','images','styles','theme','links'].reduce((n,k)=>n+Object.keys(model[k]).length,0)+model.blocks.length;}
  function updateCount(){const n=countChanges();$('countChanges').textContent=n+' '+(n===1?'zmiana':n<5?'zmiany':'zmian');}
  async function fetchApi(action,options={}) {
    const r=await fetch(API+'?action='+encodeURIComponent(action),{credentials:'same-origin',cache:'no-store',...options});
    if(r.status===401){location.replace('/studio/login.html');throw new Error('Zaloguj się ponownie');}
    if(!r.ok){let data={};try{data=await r.json();}catch(_){/* no body */}throw new Error(data.error||`HTTP ${r.status}`);}
    return r.json();
  }
  async function restore(){
    try{await fetchApi('status');model=normalize(await fetchApi('draft'));updateCount();status('Wersja robocza gotowa');}
    catch(err){status('Błąd serwera — '+err.message);notify('Nie można wczytać szkicu: '+err.message);throw err;}
  }
  async function flushSave(){
    clearTimeout(saveTimeout);
    const snapshot=JSON.stringify(model);
    // Serialize writes so rapid editing does not overwrite a newer draft with an older one.
    saveSequence=saveSequence.catch(()=>{}).then(async()=>{
      await fetchApi('draft',{method:'PUT',headers:{'content-type':'application/json'},body:snapshot});
      status('Szkic zapisany na serwerze ✓');
    });
    try{await saveSequence;}catch(err){status('Błąd autozapisu');notify('Nie zapisano szkicu: '+err.message);throw err;}
  }
  function scheduleSave(){clearTimeout(saveTimeout);status('Zapisywanie…');updateCount();saveTimeout=setTimeout(flushSave,300);}
  function saveBeforeChange(){
    const now=Date.now();
    if(now-lastHistory>550 || !undoStack.length){undoStack.push(clone(model));if(undoStack.length>35)undoStack.shift();lastHistory=now;}
    redoStack=[];
  }
  function rebuild(){if(!api)return;api.apply(model,true);refreshLists();renderBlockList();restoreSelected();updateCount();}
  function undo(){if(!undoStack.length)return;redoStack.push(clone(model));model=undoStack.pop();lastHistory=0;rebuild();scheduleSave();notify('Cofnięto zmianę');}
  function redo(){if(!redoStack.length)return;undoStack.push(clone(model));model=redoStack.pop();lastHistory=0;rebuild();scheduleSave();notify('Ponowiono zmianę');}
  function getEl(type,key){if(!api)return null;const el=api.getElement(key);if(!el)return null;
    if(type==='text'&&!el.dataset.cmsText)return null;
    if(type==='image'&&el.tagName!=='IMG')return null;
    return el;
  }
  function findSection(el){
    const s=el.closest('section,header,footer,main');
    if(!s)return 'Inne';
    const explicit=s.getAttribute('aria-label')||s.id||'';
    if(s.tagName==='HEADER')return 'Nawigacja';
    if(s.tagName==='FOOTER')return 'Stopka';
    if(/hero|stage|slide/i.test(s.className+' '+explicit))return 'Hero / Slider';
    if(/tile|feature|usp/i.test(s.className+' '+explicit))return 'Kafelki / Sekcje';
    return explicit ? explicit.replace(/[-_]/g,' ') : (SECTION_NAMES[s.tagName]||'Zawartość');
  }
  function refreshLists(){
    if(!api||!doc)return;
    const entries=api.entries();
    items.text=entries.text.map(it=>({...it,section:findSection(api.getElement(it.key))}));
    items.images=entries.images.map(it=>({...it,section:findSection(api.getElement(it.key))}));
    $('textCount').textContent=items.text.length;
    $('imageCount').textContent=items.images.length;
    $('textTotal').textContent=items.text.length+' pól';
    $('imageTotal').textContent=items.images.length+' grafik';
    renderTextList();renderImageList();
  }
  function renderTextList(){
    const filter=$('itemSearch').value.trim().toLowerCase();
    const list=items.text.filter(it=>(it.label+' '+it.section).toLowerCase().includes(filter));
    const html=[];let last='';
    for(const it of list){
      if(it.section!==last){last=it.section;html.push(`<div class="list-group-heading">${esc(last)}</div>`);}
      html.push(`<button type="button" class="item ${selection?.key===it.key?'is-selected':''}" data-kind="text" data-path="${esc(it.key)}" title="${esc(it.label)}"><span class="item__tag">${esc(it.tag)}</span><span class="item__text">${esc(it.label||'(puste)')}</span></button>`);
    }
    $('textItems').innerHTML=html.join('')||'<div class="item-list__empty">Brak pasujących treści</div>';
  }
  function relativeMedia(src){return typeof src==='string' && src.startsWith('assets/')?'../'+src:src||'';}
  function renderImageList(){
    $('imageItems').innerHTML=items.images.map(it=>`<button type="button" class="image-tile ${selection?.key===it.key?'is-selected':''}" data-kind="image" data-path="${esc(it.key)}" title="${esc(it.section+' — '+it.label)}"><img loading="lazy" src="${esc(relativeMedia(it.src))}" alt=""><span>${esc(it.section)} · ${esc(it.label)}</span></button>`).join('');
  }
  function renderTheme(){
    $('themeItems').innerHTML=PALETTE.map(([key,label,defaultColor])=>{
      const val=/^#[0-9a-f]{6}$/i.test(model.theme[key]||'')?model.theme[key]:defaultColor;
      return `<div class="theme-row"><input type="color" data-theme="${esc(key)}" value="${val}"><div class="theme-row__body"><strong>${esc(label)}</strong><span>${esc(key)}</span></div><output>${val}</output></div>`;
    }).join('');
    // Change event on input gives instant feedback.
  }
  function selectTab(id){
    for(const tab of document.querySelectorAll('.tab')){
      const active=tab.dataset.tab===id;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));
      $('panel-'+tab.dataset.tab).hidden=!active;
    }
  }
  function refreshPreviewSelection(){
    if(!doc)return;
    doc.querySelectorAll('[data-studio-selected]').forEach(el=>el.removeAttribute('data-studio-selected'));
    if(selection){const el=selection.type==='block'?doc?.querySelector('[data-cms-block-id="'+selection.key+'"]'):getEl(selection.type,selection.key);if(el)el.setAttribute('data-studio-selected','true');}
  }
  function pick(type,key,scroll=true){
    const el=getEl(type,key);if(!el)return;
    selection={type,key};
    $('blockEditGroup').hidden=true;$('elementStyleGroup').hidden=false;
    document.querySelector('.studio').classList.add('has-selection');
    refreshPreviewSelection();
    $('inspectorEmpty').hidden=true;$('inspectorEdit').hidden=false;
    $('selectedType').textContent=type==='image'?'OBRAZ':'TEKST';
    $('selectedTitle').textContent=type==='image'?(el.getAttribute('alt')||'Grafika'):(api.directText(el).slice(0,95)||'Element tekstowy');
    $('selectedPath').textContent=key;
    $('textEditGroup').hidden=type!=='text'; $('imageEditGroup').hidden=type!=='image';
    $('linkEditGroup').hidden=type!=='text'||el.tagName!=='A';
    $('fontEditGroup').hidden=type!=='text';
    if(type==='text'){
      $('textEdit').value=api.directText(el);
      if(el.tagName==='A')$('linkEdit').value=el.getAttribute('href')||'';
    }else{
      $('selectedImage').src=el.currentSrc||el.src; $('imageUrl').value=/^data:/i.test(el.getAttribute('src')||'')?'':(el.getAttribute('src')||'');
    }
    const css=doc.defaultView.getComputedStyle(el);
    const cssColor=rgbToHex(css.color)||'#ffffff'; const bg=rgbToHex(css.backgroundColor)||'#ffffff';
    $('colorEdit').value=model.styles[key]?.color||cssColor;
    $('colorText').textContent=$('colorEdit').value;
    $('bgEdit').value=model.styles[key]?.backgroundColor||bg;
    $('bgText').textContent=$('bgEdit').value;
    $('fontEdit').value=Math.round(parseFloat(css.fontSize)||16);
    renderTextList();renderImageList();
    if(scroll)el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
  }
  function restoreSelected(){if(!selection)return;
    if(selection.type==='block'){if(model.blocks.some(b=>b.id===selection.key))pickBlock(selection.key,false);else{selection=null;$('inspectorEdit').hidden=true;$('inspectorEmpty').hidden=false;}return;}
    const el=getEl(selection.type,selection.key);if(el)pick(selection.type,selection.key,false);else{selection=null;$('inspectorEdit').hidden=true;$('inspectorEmpty').hidden=false;}}
  function rgbToHex(v){
    const match=(v||'').match(/rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);
    if(!match)return /^#[0-9a-f]{6}$/i.test(v)?v:null;
    return '#'+match.slice(1,4).map(n=>(+n).toString(16).padStart(2,'0')).join('');
  }
  function editText(value){if(!selection||selection.type!=='text')return;const el=getEl('text',selection.key);if(!el)return;
    saveBeforeChange();model.texts[selection.key]=value;api.setText(el,value);$('selectedTitle').textContent=value.slice(0,95)||'Element tekstowy';scheduleSave();
  }
  function editStyle(key,value){if(!selection)return;const el=getEl(selection.type,selection.key);if(!el)return;
    saveBeforeChange();model.styles[selection.key]??={};model.styles[selection.key][key]=value;
    if(key==='fontSize')el.style.fontSize=value+'px'; else el.style[key]=value;
    scheduleSave();
  }
  function editImage(src){if(!selection||selection.type!=='image')return;
    if(!api.validImageUrl(src)){notify('Nieprawidłowy URL lub format obrazu.');return;}
    const el=getEl('image',selection.key);if(!el)return;
    saveBeforeChange();model.images[selection.key]=src;el.setAttribute('src',src);$('selectedImage').src=src;scheduleSave();refreshLists();
  }
  function editLink(href){if(!selection||selection.type!=='text')return;const el=getEl('text',selection.key);
    if(!el||el.tagName!=='A')return;if(!api.validLinkUrl(href)){notify('Dozwolony jest bezpieczny adres HTTPS, ścieżka /… lub kotwica #…');return;}
    saveBeforeChange();model.links[selection.key]=href;el.setAttribute('href',href);scheduleSave();
  }
  function clearElement(){if(!selection)return;
    saveBeforeChange();for(const k of ['texts','images','styles','links'])delete model[k][selection.key];
    rebuild();scheduleSave();notify('Przywrócono oryginalny element');
  }
  function setupFrame(){
    try {doc=frame.contentDocument;api=frame.contentWindow.SolluxContent;
      if(!doc||!api){status('Błąd podglądu');notify('Otwórz projekt przez serwer lokalny, nie przez file://');return;}
    }catch(e){notify('Brak dostępu do podglądu — użyj serwera localhost.');status('Błąd połączenia z podglądem');return;}
    api.apply(model);doc.querySelector('#sollux-studio-css')?.remove();
    const style=doc.createElement('style');style.id='sollux-studio-css';style.textContent=`
      [data-studio-selected]{outline:3px solid #a3e65a!important;outline-offset:4px!important;}
      [data-studio-hover]{outline:2px dashed #a3e65a!important;outline-offset:3px!important;cursor:crosshair!important;}
      body.studio-editing [data-cms-text],body.studio-editing [data-cms-image]{cursor:crosshair!important;}
      body.studio-editing .stage__lamp{pointer-events:auto!important;}
      [data-studio-inline]{outline:2px solid #a3e65a!important;outline-offset:3px!important;cursor:text!important;}
    `;doc.head.appendChild(style);
    doc.body.classList.toggle('studio-editing',selectMode);
    doc.addEventListener('dblclick',e=>{
      if(!selectMode)return;
      const el=e.target.closest('[data-cms-text]');
      if(!el||el.tagName==='A'||el.tagName==='BUTTON')return;
      // Direct editing is safe only when markup is plain text and line breaks.
      if(Array.from(el.children).some(child=>child.tagName!=='BR'))return;
      const key=el.dataset.cmsText;
      pick('text',key,false);
      el.contentEditable='plaintext-only';el.setAttribute('data-studio-inline','true');
      inlineEditing=el;el.focus();
      el.addEventListener('input',()=>{
        const text=el.innerText.replace(/\r/g,'');
        saveBeforeChange();model.texts[key]=text;
        $('textEdit').value=text;status('Edytowanie bezpośrednio w podglądzie…');scheduleSave();
      },{signal:(()=>{const ctrl=new AbortController();el.addEventListener('blur',()=>{el.contentEditable='false';el.removeAttribute('data-studio-inline');inlineEditing=null;ctrl.abort();},{once:true});return ctrl.signal;})()});
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    },true);
    doc.addEventListener('pointerover', e=>{
      doc.querySelectorAll('[data-studio-hover]').forEach(el=>el.removeAttribute('data-studio-hover'));
      if(!selectMode)return;
      const el=e.target.closest('[data-cms-image],[data-cms-text]');
      if(el)el.setAttribute('data-studio-hover','true');
    },true);
    doc.addEventListener('click',e=>{
      if(!selectMode)return;
      const block=e.target.closest('[data-cms-block-id]');
      if(block){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();pickBlock(block.dataset.cmsBlockId,false);return;}
      const el=e.target.closest('[data-cms-image],[data-cms-text]');
      if(!el)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      pick(el.dataset.cmsImage?'image':'text',el.dataset.cmsImage||el.dataset.cmsText,false);
    },true);
    refreshLists();renderTheme();renderBlockList();refreshPreviewSelection();status('Podgląd gotowy · na żywo');
  }
  function setDevice(device){
    const widths={desktop:'100%',tablet:'820px',mobile:'390px'};
    $('canvasInner').style.width=widths[device]||'100%';
    $('canvasLabel').textContent=(device==='desktop'?'Responsive':device==='tablet'?'Tablet · 820px':'Mobile · 390px')+' · podgląd na żywo';
    document.querySelectorAll('.device').forEach(b=>b.classList.toggle('is-active',b.dataset.device===device));
  }
  function setMode(active){selectMode=active;
    $('modeButton').classList.toggle('is-active',active);$('modeButton').setAttribute('aria-pressed',String(active));
    $('modeButton').innerHTML=active?'<span>✎</span> Wybieranie':'<span>▷</span> Interakcje';
    $('modeDescription').textContent=active?'Kliknij tekst lub obraz, aby rozpocząć edycję':'Tryb interakcji — testuj slider, lampy i linki';
    doc?.body.classList.toggle('studio-editing',active);
    doc?.querySelectorAll('[data-studio-hover]').forEach(el=>el.removeAttribute('data-studio-hover'));
  }
  function triggerDownload(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000);}
  function exportJson(){const json=JSON.stringify(model,null,2);triggerDownload(new Blob([json],{type:'application/json'}),'sollux-content-draft.json');notify('Pobrano kopię roboczą JSON');}
  async function uploadMedia(file){
    if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type)||file.size>3_000_000)throw new Error('PNG/JPEG/WebP/GIF/AVIF, maks. 3 MB');
    return fetchApi('upload',{method:'POST',headers:{'content-type':file.type},body:file});
  }
  function newBlock(type){
    const common={id:crypto.randomUUID(),type,title:type==='cta'?'Odkryj nowe możliwości':type==='split'?'Poznaj nasze produkty':'Nowa sekcja',body:'Dodaj opis sekcji w edytorze.',background:'#f8f7f5',foreground:'#101011',hidden:false};
    if(type==='split')return {...common,image:'assets/img/tile-app.webp',alt:'',imageSide:'right'};
    if(type==='cta')return {...common,buttonText:'Dowiedz się więcej',url:'#'};
    return common;
  }
  function renderBlockList(){
    $('blocksCount').textContent=model.blocks.length;
    $('blockItems').innerHTML=model.blocks.map((b,i)=>`<div class="cms-block-card ${selection?.type==='block'&&selection.key===b.id?'is-active':''}" data-block-id="${esc(b.id)}">
      <button class="cms-block-card__title" data-action="select" title="Wybierz blok"><strong>${esc(b.title||'Bez tytułu')}</strong><small>${esc(b.type)} ${b.hidden?'· Ukryty':''}</small></button>
      <button data-action="up" title="Przesuń wyżej" ${i===0?'disabled':''}>↑</button><button data-action="down" title="Przesuń niżej" ${i===model.blocks.length-1?'disabled':''}>↓</button>
      <button data-action="toggle" title="Pokaż / ukryj">${b.hidden?'○':'●'}</button></div>`).join('')||'<p class="panel-note">Nie masz jeszcze dodatkowych bloków. Dodaj pierwszy powyżej.</p>';
  }
  function addBlock(){if(model.blocks.length>=40){notify('Maksymalnie 40 bloków');return;}
    saveBeforeChange();const b=newBlock($('addBlockType').value);model.blocks.push(b);api?.renderBlocks(model.blocks);renderBlockList();pickBlock(b.id);scheduleSave();notify('Dodano blok');
  }
  function removeSelectedBlock(){if(selection?.type!=='block')return;
    if(!confirm('Usunąć wybrany blok?'))return;
    saveBeforeChange();model.blocks=model.blocks.filter(b=>b.id!==selection.key);selection=null;
    api?.renderBlocks(model.blocks);renderBlockList();$('inspectorEdit').hidden=true;$('inspectorEmpty').hidden=false;
    scheduleSave();notify('Usunięto blok');
  }
  function handleBlockItemClick(event){const el=event.target.closest('[data-block-id]');if(!el)return;
    const id=el.dataset.blockId;const act=event.target.closest('[data-action]')?.dataset.action;const i=model.blocks.findIndex(b=>b.id===id);if(i<0)return;
    if(act==='select'){pickBlock(id);return;}
    saveBeforeChange();
    if(act==='up'&&i>0)[model.blocks[i-1],model.blocks[i]]=[model.blocks[i],model.blocks[i-1]];
    if(act==='down'&&i<model.blocks.length-1)[model.blocks[i+1],model.blocks[i]]=[model.blocks[i],model.blocks[i+1]];
    if(act==='toggle')model.blocks[i].hidden=!model.blocks[i].hidden;
    api?.renderBlocks(model.blocks);renderBlockList();restoreSelected();scheduleSave();
  }
  function pickBlock(id,scroll=true){const b=model.blocks.find(b=>b.id===id);if(!b)return;
    selection={type:'block',key:id};document.querySelector('.studio').classList.add('has-selection');
    $('inspectorEmpty').hidden=true;$('inspectorEdit').hidden=false;
    $('selectedType').textContent='BLOK / '+b.type.toUpperCase();$('selectedTitle').textContent=b.title;$('selectedPath').textContent=b.id;
    for(const el of ['textEditGroup','imageEditGroup','linkEditGroup','fontEditGroup','elementStyleGroup'])$(el).hidden=true;
    $('blockEditGroup').hidden=false;
    const fields=[['title','Tytuł','text'],['body','Opis','textarea']];
    if(b.type==='split')fields.push(['image','Adres zdjęcia','text'],['alt','Tekst alternatywny','text'],['imageSide','Położenie zdjęcia','select']);
    if(b.type==='cta')fields.push(['buttonText','Tekst przycisku','text'],['url','Link przycisku','text']);
    fields.push(['background','Kolor tła','color'],['foreground','Kolor tekstu','color'],['hidden','Ukryj blok','checkbox']);
    $('blockFields').innerHTML=fields.map(([name,label,type])=>`<div class="cms-form-field"><label for="block-${name}">${esc(label)}</label>${type==='textarea'?`<textarea id="block-${name}" data-block-field="${name}">${esc(b[name]||'')}</textarea>`:type==='select'?`<select id="block-${name}" data-block-field="${name}"><option value="right" ${b.imageSide!=='left'?'selected':''}>Po prawej</option><option value="left" ${b.imageSide==='left'?'selected':''}>Po lewej</option></select>`:`<input id="block-${name}" data-block-field="${name}" type="${type}" ${type==='checkbox'?(b.hidden?'checked':''):`value="${esc(b[name]||'')}"`}>`}</div>`).join('')+(b.type==='split'?'<div class="cms-form-field"><label for="block-file">Prześlij zdjęcie</label><input id="block-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></div>':'');
    renderBlockList();refreshPreviewSelection();const node=doc?.querySelector('[data-cms-block-id="'+id+'"]');if(scroll&&node)node.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function handleBlockFieldChange(e){const input=e.target.closest('[data-block-field]');if(!input||selection?.type!=='block')return;
    const b=model.blocks.find(b=>b.id===selection.key);if(!b)return;
    saveBeforeChange();const field=input.dataset.blockField;b[field]=input.type==='checkbox'?input.checked:input.value;
    api?.renderBlocks(model.blocks);renderBlockList();refreshPreviewSelection();if(field==='title')$('selectedTitle').textContent=b.title;scheduleSave();
  }
  async function handleBlockMediaChange(e){if(e.target.id!=='block-file'||selection?.type!=='block')return;const file=e.target.files?.[0];if(!file)return;
    const b=model.blocks.find(b=>b.id===selection.key);if(!b)return;
    try{const {url}=await uploadMedia(file);saveBeforeChange();b.image=url;api?.renderBlocks(model.blocks);pickBlock(b.id,false);scheduleSave();notify('Wgrano obraz bloku');}catch(err){notify(err.message);}
  }
  function setupEvents(){
    frame.addEventListener('load',setupFrame);
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>selectTab(btn.dataset.tab)));
    $('addBlock').addEventListener('click',addBlock);
    $('removeBlock').addEventListener('click',removeSelectedBlock);
    $('blockItems').addEventListener('click',handleBlockItemClick);
    $('blockFields').addEventListener('input',handleBlockFieldChange);
    $('blockFields').addEventListener('change',handleBlockMediaChange);
    $('logoutCMS').addEventListener('click',async()=>{try{await fetchApi('logout',{method:'POST'});}catch(_){/* ignore */}location.replace('/studio/login.html');});
    $('itemSearch').addEventListener('input',renderTextList);
    $('textItems').addEventListener('click',e=>{const button=e.target.closest('[data-path]');if(button)pick('text',button.dataset.path);});
    $('imageItems').addEventListener('click',e=>{const button=e.target.closest('[data-path]');if(button)pick('image',button.dataset.path);});
    document.querySelectorAll('.device').forEach(btn=>btn.addEventListener('click',()=>setDevice(btn.dataset.device)));
    $('modeButton').addEventListener('click',()=>setMode(!selectMode));
    $('refreshPreview').addEventListener('click',()=>frame.contentWindow.location.reload());
    $('undoChange').addEventListener('click',undo);
    $('redoChange').addEventListener('click',redo);
    $('textEdit').addEventListener('input',e=>editText(e.target.value));
    $('colorEdit').addEventListener('input',e=>{editStyle('color',e.target.value);$('colorText').textContent=e.target.value;});
    $('bgEdit').addEventListener('input',e=>{editStyle('backgroundColor',e.target.value);$('bgText').textContent=e.target.value;});
    $('fontEdit').addEventListener('input',e=>{const n=Number(e.target.value);if(n>=9&&n<=128)editStyle('fontSize',n);});
    $('linkEdit').addEventListener('change',e=>editLink(e.target.value));
    $('clearElement').addEventListener('click',clearElement);
    $('closeInspector').addEventListener('click',()=>document.querySelector('.studio').classList.remove('has-selection'));
    $('themeItems').addEventListener('input',e=>{if(!e.target.matches('[data-theme]'))return;
      const key=e.target.dataset.theme;const v=e.target.value;
      saveBeforeChange();model.theme[key]=v;doc?.documentElement.style.setProperty(key,v);
      e.target.closest('.theme-row').querySelector('output').textContent=v;scheduleSave();
    });
    $('imageUpload').addEventListener('change',async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      const supported=['image/png','image/jpeg','image/webp','image/gif','image/avif'];
      if(!supported.includes(file.type)){notify('Wybierz plik PNG, JPG, WebP, GIF lub AVIF.');return;}
      if(file.size>3_000_000){notify('Maksymalny rozmiar obrazu: 3 MB.');return;}
      try{const uploaded=await uploadMedia(file);editImage(uploaded.url);notify('Obraz zmieniony na żywo');}catch(err){notify('Błąd przesyłania: '+err.message);}e.target.value='';
    });
    $('applyImageUrl').addEventListener('click',()=>editImage($('imageUrl').value.trim()));
    $('importJson').addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{const parsed=JSON.parse(await file.text());
        if(!confirm('Import zastąpi aktualne zmiany. Kontynuować?'))return;
        saveBeforeChange();model=normalize(parsed);rebuild();scheduleSave();renderTheme();notify('Projekt zaimportowany');
      }catch(err){notify('Nieprawidłowy plik JSON');}e.target.value='';
    });
    $('exportJson').addEventListener('click',exportJson);
    for(const id of ['exportZip','exportZipSecondary'])$(id).addEventListener('click',publish);
    $('resetAll').addEventListener('click',()=>{
      if(!confirm('Usunąć WSZYSTKIE zmiany z edytora? Tej operacji nie można cofnąć.'))return;
      saveBeforeChange();model=blank();rebuild();renderTheme();scheduleSave();notify('Przywrócono oryginalną wersję projektu');
    });
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();exportJson();}
      const focused=e.target.closest('input,textarea,[contenteditable=true]');
      if(!focused&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){
        e.preventDefault();if(e.shiftKey)redo();else undo();}
    });
  }
  async function publish(){
    const btn=$('exportZip');btn.disabled=true;$('exportZipSecondary').disabled=true;
    status('Publikowanie zmian…');
    try{
      await flushSave();
      const result=await fetchApi('publish',{method:'POST'});
      status('Opublikowano ✓');notify('Zmiany opublikowane! Strona publiczna została zaktualizowana.');
    }catch(err){status('Błąd publikowania');notify('Nie udało się opublikować: '+err.message);}
    finally{btn.disabled=false;$('exportZipSecondary').disabled=false;}
  }
  async function start(){setupEvents();renderTheme();try{await restore();}catch(_){return;}
    // The iframe may have loaded while the server-backed draft was being restored.
    if(frame.contentDocument?.readyState==='complete')setupFrame();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
