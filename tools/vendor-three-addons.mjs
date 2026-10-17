// Copy only the dependency closure of the locked Three.js addons; preserve MIT notice.
import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve,dirname,relative}from'node:path';
const base=resolve('node_modules/three/examples/jsm'),dest=resolve('public/vendor/three/addons'),seen=new Set();
async function copy(file){file=resolve(base,file);if(seen.has(file))return;if(!file.startsWith(base+'/'))throw Error('Unexpected addon import');seen.add(file);let text=await readFile(file,'utf8');const rel=relative(base,file),out=resolve(dest,rel);await mkdir(dirname(out),{recursive:true});for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+\.js)['"]/g))await copy(resolve(dirname(file),m[1]));const core=relative(dirname(out),resolve('public/vendor/three/three.module.js')).split('\\').join('/');text=text.replace(/from\s*(['"])three\1/g,`from '${core}'`);await writeFile(out,text);}
for(const f of ['postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js','controls/OrbitControls.js','utils/BufferGeometryUtils.js'])await copy(f);
console.log('Vendored Three addon modules:',seen.size);
