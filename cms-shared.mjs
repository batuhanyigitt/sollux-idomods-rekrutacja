/* Shared validation and auth used by local development and Netlify production. */
import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
export const BLANK = () => ({version:1,texts:{},images:{},styles:{},theme:{},links:{},blocks:[]});
const COLOR=/^#[a-fA-F0-9]{6}$/;
const THEME=new Set(['--c-yellow','--c-ink','--c-text','--c-tile-blue','--c-tile-cream','--c-tile-grey','--c-white','--c-black','--c-grey-btn','--c-line']);
const safeImage=(v)=>typeof v==='string' && v.length<1200 && (/^https:\/\/[\w.-]+(?:\:[0-9]+)?(?:\/[^\s<>"']*)?$/i.test(v)||/^assets\/[\w./-]+$/.test(v)&&!v.includes('..')||/^\/\.netlify\/functions\/cms\?action=media&id=[a-f0-9-]{20,80}$/.test(v));
const safeUrl=(v)=>typeof v==='string' && v.length<=1000 && (/^https:\/\/[\w.-]+(?:\:[0-9]+)?(?:\/[^\s<>"']*)?$/i.test(v)||/^(\/[a-zA-Z0-9#?=&/._-]*|#[a-zA-Z0-9_-]*)$/.test(v));
const safeSelector=(s)=>typeof s==='string'&&s.startsWith('body > ')&&s.length<=2048&&/^[a-zA-Z0-9 >:().#_-]+$/.test(s);
export function normalizeModel(m){
  if(!m||typeof m!=='object'||Array.isArray(m))throw new Error('Invalid content model');
  const out=BLANK();
  for(const [k,limit] of [['texts',5000],['images',1200],['links',1000]]){
    const o=m[k];if(!o)continue;
    if(typeof o!=='object'||Array.isArray(o)||Object.keys(o).length>600)throw new Error('Invalid '+k);
    for(const [key,v] of Object.entries(o)){
      if(!safeSelector(key)||typeof v!=='string'||v.length>limit)continue;
      if(k==='images'&&!safeImage(v))continue;
      if(k==='links'&&!safeUrl(v))continue;
      out[k][key]=v;
    }
  }
  if(m.theme&&typeof m.theme==='object')for(const [k,v] of Object.entries(m.theme))if(THEME.has(k)&&COLOR.test(v))out.theme[k]=v;
  if(m.styles&&typeof m.styles==='object'&&Object.keys(m.styles).length<=600){
    for(const [k,v] of Object.entries(m.styles)){
      if(!safeSelector(k)||!v||typeof v!=='object')continue;
      const s={};if(COLOR.test(v.color))s.color=v.color;if(COLOR.test(v.backgroundColor))s.backgroundColor=v.backgroundColor;
      if(Number.isFinite(v.fontSize)&&v.fontSize>=9&&v.fontSize<=128)s.fontSize=v.fontSize;
      if(Object.keys(s).length)out.styles[k]=s;
    }
  }
  if(Array.isArray(m.blocks)){
    if(m.blocks.length>40)throw new Error('Too many content blocks');
    const ids=new Set();
    for(const b of m.blocks){
      if(!b||!['text','split','cta'].includes(b.type))continue;
      const id=String(b.id||'').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80);if(!id||ids.has(id))continue;ids.add(id);
      out.blocks.push({id,type:b.type,title:String(b.title||'').slice(0,160),body:String(b.body||'').slice(0,1500),
        image:safeImage(b.image)?b.image:'',alt:String(b.alt||'').slice(0,160),imageSide:b.imageSide==='left'?'left':'right',
        buttonText:String(b.buttonText||'').slice(0,80),url:safeUrl(b.url)?b.url:'#',
        background:COLOR.test(b.background)?b.background:'#f8f7f5',foreground:COLOR.test(b.foreground)?b.foreground:'#101011',hidden:b.hidden===true});
    }
  }
  return out;
}
export function hashComparable(secret){return createHash('sha256').update(String(secret)).digest();}
export function secureEquals(a,b){const x=hashComparable(a),y=hashComparable(b);return timingSafeEqual(x,y);}
export function issueCookie(secret,secure=false){const claims=Buffer.from(JSON.stringify({exp:Date.now()+12*3600_000,nonce:randomUUID()})).toString('base64url');const sig=createHmac('sha256',secret).update(claims).digest('base64url');return `sollux_admin=${claims}.${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`;}
export function isAuthorized(cookieHeader,secret){
  if(!secret||!cookieHeader)return false;
  const match=cookieHeader.match(/(?:^|;\s*)sollux_admin=([^;]+)/);if(!match)return false;
  const [claims,sig]=match[1].split('.');if(!claims||!sig)return false;
  try{const expected=createHmac('sha256',secret).update(claims).digest('base64url');if(!secureEquals(sig,expected))return false;
    const data=JSON.parse(Buffer.from(claims,'base64url').toString('utf8'));return typeof data.exp==='number'&&data.exp>Date.now();}
  catch(_){return false;}
}
export function detectImage(type,buf){
  const a=new Uint8Array(buf);let actual='';
  if(a.length>=8&&a.slice(0,8).every((n,i)=>n===[137,80,78,71,13,10,26,10][i]))actual='image/png';
  else if(a.length>=3&&a[0]===255&&a[1]===216&&a[2]===255)actual='image/jpeg';
  else if(a.length>=12&&Buffer.from(a.slice(0,4)).toString()==='RIFF'&&Buffer.from(a.slice(8,12)).toString()==='WEBP')actual='image/webp';
  else if(a.length>=6&&['GIF87a','GIF89a'].includes(Buffer.from(a.slice(0,6)).toString()))actual='image/gif';
  else if(a.length>=12&&Buffer.from(a.slice(4,12)).toString().includes('ftypavif'))actual='image/avif';
  if(!actual||actual!==type)return null;
  return {mime:actual,ext:({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/avif':'avif'})[actual]};
}
export const respond=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
