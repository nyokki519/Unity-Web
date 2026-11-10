import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const result=spawnSync(fileURLToPath(new URL('../node_modules/.bin/esbuild',import.meta.url)),[
  'tools/majiang-ai-browser-entry.js',
  '--bundle','--platform=browser','--format=esm','--target=es2022',
  '--legal-comments=none','--outfile=public/mahjong/vendor/majiang-ai.bundle.js'
],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
