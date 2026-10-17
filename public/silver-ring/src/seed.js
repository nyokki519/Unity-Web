export function createRng(seed){let n=5381;for(const c of String(seed))n=Math.imul(n,33)^c.codePointAt(0);return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
