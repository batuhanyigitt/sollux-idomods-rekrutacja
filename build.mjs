import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'dist');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
for(const directory of ['assets','css','js','studio']) await fs.cp(path.join(root,directory),path.join(out,directory),{recursive:true});
for(const f of ['index.html','engineering.html','experience.html','system.html','quality.html','process.html'])await fs.copyFile(path.join(root,f),path.join(out,f));
console.log('SOLLUX CMS static assets built into dist/; Netlify Functions are deployed separately.');
