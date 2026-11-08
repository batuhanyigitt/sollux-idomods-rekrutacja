import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { BLANK,normalizeModel,secureEquals,issueCookie,isAuthorized,detectImage,respond } from '../../cms-shared.mjs';

const endpoint = '/.netlify/functions/cms';
const context = process.env.CONTEXT === 'production' ? 'production' : 'preview';
// Preview deploys cannot overwrite production content.
const storeName = `sollux-cms-${context}`;
export default async function handler(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const username = process.env.CMS_ADMIN_USERNAME || 'admin';
  const password = process.env.CMS_ADMIN_PASSWORD;
  const secret = process.env.CMS_SESSION_SECRET;
  const isWrite = ['POST','PUT','DELETE'].includes(request.method);
  if(isWrite && request.headers.get('origin') && new URL(request.headers.get('origin')).host!==url.host)
    return respond({error:'Origin not allowed'},403);
  try{
    const store=getStore(storeName);
    if(request.method==='GET'&&action==='published')return respond(await store.get('published',{type:'json',consistency:'strong'})||BLANK());
    if(request.method==='GET'&&action==='media'){
      const id=url.searchParams.get('id');if(!id||!/^[a-f0-9-]{20,80}$/.test(id))return respond({error:'Not found'},404);
      const asset=await store.getWithMetadata(`media/${id}`,{type:'arrayBuffer',consistency:'strong'});
      if(!asset?.data)return respond({error:'Not found'},404);
      return new Response(asset.data,{headers:{'content-type':asset.metadata?.mime||'application/octet-stream','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'}});
    }
    const weakDemoOptIn = process.env.CMS_ALLOW_WEAK_DEMO_PASSWORD === 'true';
    if(!password || (!weakDemoOptIn && password.length<12) || !secret || secret.length<32)
      return respond({error:'CMS is not configured. Set CMS_ADMIN_USERNAME, CMS_ADMIN_PASSWORD (at least 12 characters), and CMS_SESSION_SECRET.'},503);
    if(request.method==='POST'&&action==='login'){
      const {username:givenUser,password:given}=await request.json();
      if(typeof givenUser!=='string'||typeof given!=='string'||!secureEquals(givenUser,username)||!secureEquals(given,password))return respond({error:'Invalid credentials'},401);
      return respond({ok:true},200,{'set-cookie':issueCookie(secret,url.protocol==='https:')});
    }
    if(request.method==='POST'&&action==='logout')return respond({ok:true},200,{'set-cookie':`sollux_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${url.protocol==='https:'?'; Secure':''}`});
    if(!isAuthorized(request.headers.get('cookie')||'',secret))return respond({error:'Authentication required'},401);
    if(request.method==='GET'&&action==='status')return respond({authenticated:true});
    if(request.method==='GET'&&action==='draft')return respond(await store.get('draft',{type:'json',consistency:'strong'})||await store.get('published',{type:'json',consistency:'strong'})||BLANK());
    if(request.method==='PUT'&&action==='draft'){
      const body=await request.text();if(body.length>2_000_000)return respond({error:'Draft too large'},413);
      await store.setJSON('draft',normalizeModel(JSON.parse(body)));return respond({saved:true});
    }
    if(request.method==='POST'&&action==='publish'){
      const draft=await store.get('draft',{type:'json',consistency:'strong'});
      if(!draft)return respond({error:'Save a draft first'},409);
      await store.setJSON('published',normalizeModel(draft));return respond({published:true,at:new Date().toISOString()});
    }
    if(request.method==='POST'&&action==='upload'){
      const mime=(request.headers.get('content-type')||'').split(';')[0].trim();
      const buffer=await request.arrayBuffer();if(buffer.byteLength>3_000_000||buffer.byteLength<8)return respond({error:'Image must be under 3 MB'},413);
      const verified=detectImage(mime,buffer);if(!verified)return respond({error:'Unsupported image or invalid file signature'},415);
      const id=randomUUID();await store.set(`media/${id}`,new Blob([buffer],{type:verified.mime}),{metadata:{mime:verified.mime}});
      return respond({url:`${endpoint}?action=media&id=${id}`,id});
    }
    return respond({error:'Unknown endpoint'},404);
  }catch(err){console.error('SOLLUX CMS API:',err?.message||err);return respond({error:'CMS operation failed'},500);}
}
