import test from 'node:test';import assert from 'node:assert/strict';
import os from 'node:os';import fs from 'node:fs/promises';import path from 'node:path';
import {spawn} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {normalizeModel,issueCookie,isAuthorized,detectImage,BLANK} from '../cms-shared.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sollux-test-'));const port=45000+Math.floor(Math.random()*5000);
const secret=randomBytes(32).toString('hex');const pwd='temporary-test-password';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),CMS_ADMIN_USERNAME:'admin',CMS_ADMIN_PASSWORD:pwd,CMS_SESSION_SECRET:secret,CMS_LOCAL_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
const api=`http://127.0.0.1:${port}/.netlify/functions/cms?action=`;
async function ready(){for(let i=0;i<90;i++){try{const r=await fetch(api+'published');if(r.ok)return;}catch(_){/* initializing */}await new Promise(r=>setTimeout(r,65));}throw new Error('Server failed to start');}
await ready();
test.after(async()=>{server.kill();await fs.rm(dir,{force:true,recursive:true});});
test('auth signs and rejects invalid sessions',()=>{const c=issueCookie(secret);assert.equal(isAuthorized(c,secret),true);assert.equal(isAuthorized(c,secret+'x'),false);assert.equal(isAuthorized('sollux_admin=invalid',secret),false);});
test('model validation strips unsafe links and limits fields',()=>{
  const m=normalizeModel({...BLANK(),links:{'body > div:nth-of-type(1)':'javascript:alert(1)'},theme:{'--c-yellow':'#123456'},blocks:[{id:'safe',type:'cta',title:'Hello',url:'javascript:alert(1)'}]});
  assert.equal(Object.keys(m.links).length,0);assert.equal(m.blocks[0].url,'#');assert.equal(m.theme['--c-yellow'],'#123456');
});
test('invalid image bytes are rejected',()=>{assert.equal(detectImage('image/png',Buffer.from('notpng12345')),null);});
test('local CMS: login, draft save, publish and public read', async()=>{
  assert.equal((await fetch(api+'draft')).status,401);
  assert.equal((await fetch(api+'login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'admin',password:'invalid'})})).status,401);
  const badUsername=await fetch(api+'login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'visitor',password:pwd})});assert.equal(badUsername.status,401);
  const r=await fetch(api+'login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'admin',password:pwd})});assert.equal(r.status,200);
  const cookie=r.headers.get('set-cookie').split(';')[0];const headers={cookie,'content-type':'application/json'};
  const data={...BLANK(),theme:{'--c-yellow':'#123456'},blocks:[{id:'block1',type:'text',title:'Updated by CMS',body:'Test value'}]};
  assert.equal((await fetch(api+'draft',{method:'PUT',headers,body:JSON.stringify(data)})).status,200);
  assert.equal((await (await fetch(api+'published')).json()).blocks.length,0,'draft must not leak before publish');
  assert.equal((await fetch(api+'publish',{method:'POST',headers})).status,200);
  const pub=await (await fetch(api+'published')).json();assert.equal(pub.blocks[0].title,'Updated by CMS');
  const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
  const upload=await fetch(api+'upload',{method:'POST',headers:{cookie,'content-type':'image/gif'},body:gif});assert.equal(upload.status,200);
  const url=(await upload.json()).url;
  const media=await fetch('http://127.0.0.1:'+port+url);assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/gif');
  assert.equal((await fetch(api+'draft',{method:'PUT',headers:{...headers,origin:'https://wrong.example'},body:JSON.stringify(data)})).status,403);
});
