import {mkdir,copyFile} from 'node:fs/promises';
for(const [name,source,files] of [['rapier','@dimforge/rapier3d-compat',['rapier.mjs','LICENSE']],['earcut','earcut',['LICENSE']]]){
 await mkdir(`public/vendor/${name}`,{recursive:true});
 for(const file of files)await copyFile(`node_modules/${source}/${name==='rapier'&&file!=='LICENSE'?'dist/':''}${file}`,`public/vendor/${name}/${file}`);
}
await copyFile('node_modules/earcut/src/earcut.js','public/vendor/earcut/earcut.js');
