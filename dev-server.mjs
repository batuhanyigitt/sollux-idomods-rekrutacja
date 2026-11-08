/* Self-contained local CMS backend: run npm start. Serves the same API as Netlify Functions. */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import { randomUUID,randomBytes } from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BLANK,normalizeModel,secureEquals,issueCookie,isAuthorized,detectImage} from './cms-shared.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.CMS_LOCAL_DATA_DIR?path.resolve(process.env.CMS_LOCAL_DATA_DIR):path.join(root,'.cms-local');const port=+(process.env.PORT||4173);
// Local-only demo defaults. Production credentials are configured separately on Netlify.
const username=process.env.CMS_ADMIN_USERNAME||'admin';
const password=process.env.CMS_ADMIN_PASSWORD??'1';
const secret=process.env.CMS_SESSION_SECRET||randomBytes(32).toString('hex');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.avif':'image/avif','.woff2':'font/woff2','.ico':'image/x-icon'};
async function readModel(file){try{return JSON.parse(await fs.readFile(path.join(dataDir,file),'utf8'))}catch{return BLANK()}}
async function atomicWrite(filename,data){await fs.mkdir(dataDir,{recursive:true});const tmp=path.join(dataDir,'.'+filename+'.'+randomUUID());await fs.writeFile(tmp,data);await fs.rename(tmp,path.join(dataDir,filename))}
async function body(req,max){const chunks=[];let n=0;for await(const part of req){n+=part.length;if(n>max)throw Object.assign(new Error('Too large'),{status:413});chunks.push(part)}return Buffer.concat(chunks)}
function send(res,obj,status=200,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers});res.end(JSON.stringify(obj))}
async function handleApi(req,res,url){const act=url.searchParams.get('action');
  if(['PUT','POST','DELETE'].includes(req.method)){
    const origin=req.headers.origin;if(origin && new URL(origin).host!==req.headers.host)return send(res,{error:'Cross-origin operation rejected'},403);
  }
  if(req.method==='GET'&&act==='published')return send(res,await readModel('published.json'));
  if(req.method==='GET'&&act==='media'){
    const id=url.searchParams.get('id');if(!id||!/^[a-f0-9-]{20,80}$/.test(id))return send(res,{error:'Not found'},404);
    const dir=path.join(dataDir,'media');for(const ext of ['png','jpg','webp','gif','avif']){
      const name=path.join(dir,id+'.'+ext);if(existsSync(name)){
        res.writeHead(200,{'content-type':MIME['.'+ext],'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'});
        return res.end(await fs.readFile(name));
      }
    }
    return send(res,{error:'Not found'},404);
  }
  if(req.method==='POST'&&act==='login'){
    const data=JSON.parse((await body(req,4096)).toString('utf8'));
    if(typeof data.username!=='string'||typeof data.password!=='string'||!secureEquals(data.username,username)||!secureEquals(data.password,password))return send(res,{error:'Incorrect credentials'},401);
    return send(res,{ok:true},200,{'set-cookie':issueCookie(secret)});
  }
  if(req.method==='POST'&&act==='logout')return send(res,{ok:true},200,{'set-cookie':'sollux_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});
  if(!isAuthorized(req.headers.cookie||'',secret))return send(res,{error:'Login required'},401);
  if(req.method==='GET'&&act==='status')return send(res,{authenticated:true});
  if(req.method==='GET'&&act==='draft')return send(res,existsSync(path.join(dataDir,'draft.json'))?await readModel('draft.json'):await readModel('published.json'));
  if(req.method==='PUT'&&act==='draft'){
    const raw=(await body(req,2_000_000)).toString();const m=normalizeModel(JSON.parse(raw));
    await atomicWrite('draft.json',JSON.stringify(m));return send(res,{saved:true});
  }
  if(req.method==='POST'&&act==='publish'){
    if(!existsSync(path.join(dataDir,'draft.json')))return send(res,{error:'No draft to publish'},409);
    const data=normalizeModel(await readModel('draft.json'));
    await atomicWrite('published.json',JSON.stringify(data));return send(res,{published:true,at:new Date().toISOString()});
  }
  if(req.method==='POST'&&act==='upload'){
    const raw=await body(req,3_000_000);const info=detectImage((req.headers['content-type']||'').split(';')[0],raw);
    if(!info)return send(res,{error:'Invalid or unsupported image'},415);
    const id=randomUUID();await fs.mkdir(path.join(dataDir,'media'),{recursive:true});
    await fs.writeFile(path.join(dataDir,'media',`${id}.${info.ext}`),raw,{flag:'wx'});
    return send(res,{url:`/.netlify/functions/cms?action=media&id=${id}`,id});
  }
  return send(res,{error:'Unknown endpoint'},404);
}
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(url.pathname==='/.netlify/functions/cms')return await handleApi(req,res,url);
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,{error:'Method not allowed'},405);
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/studio'||pathname==='/studio/')pathname='/studio/index.html';
  if(pathname==='/')pathname='/index.html';
  const requested=path.resolve(root,'.'+pathname);
  if(!requested.startsWith(root+path.sep))return send(res,{error:'Forbidden'},403);
  if(/(^|\/)(?:\.cms-local|node_modules|netlify|\.git)(?:\/|$)/.test(requested)||/\.(?:mjs|toml|lock|env)$/.test(requested)||['package.json','cms-shared.mjs','dev-server.mjs'].includes(path.basename(requested)))return send(res,{error:'Forbidden'},403);
  const bytes=await fs.readFile(requested).catch(()=>null);if(!bytes)return send(res,{error:'Not found'},404);
  res.writeHead(200,{'content-type':MIME[path.extname(requested)]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':pathname.startsWith('/studio/')?'no-store':'public, max-age=120'});
  if(req.method==='HEAD')res.end();else res.end(bytes);
}catch(err){send(res,{error:err.status===413?'Request too large':'Invalid request'},err.status||400);}}).listen(port,'127.0.0.1',()=>{
  process.stdout.write(`\nSOLLUX live site: http://127.0.0.1:${port}/\nSOLLUX CMS Studio: http://127.0.0.1:${port}/studio/\nAdmin username: ${username}\nAdmin password: ${password}\nLOCAL TEST ONLY: Never use '1' as a password on an internet-accessible deployment.\n\n`);
});
