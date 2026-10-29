// A bounded decoded-image cache, shared by the local card renderer and warm-up.
// It never owns cards, outcomes or GL textures. Only authored artwork is cached.
export function createCardImageCache(limit=8,createImage=()=>new Image()){
 const cache=new Map();
 return src=>{
  if(cache.has(src)){const pending=cache.get(src);cache.delete(src);cache.set(src,pending);return pending;}
  let pending;
  pending=new Promise((resolve,reject)=>{const img=createImage();img.onload=()=>{Promise.resolve(img.decode?.()).catch(()=>{}).then(()=>resolve(img));};img.onerror=()=>{if(cache.get(src)===pending)cache.delete(src);reject(Error('CARD_IMAGE'));};img.src=src;});
  cache.set(src,pending);while(cache.size>limit)cache.delete(cache.keys().next().value);return pending;
 };
}
export const cardImage=createCardImageCache();
export const preloadCardImages=sources=>Promise.allSettled([...new Set(sources)].map(cardImage));
