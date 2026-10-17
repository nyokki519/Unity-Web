// Original generated engraved-metal backplate, with a quiet fallback while loading.
export function paintCabinetArt(g,w,h,image=null){
 g.save();const bg=g.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#180c22');bg.addColorStop(.55,'#110c1d');bg.addColorStop(1,'#080b10');g.fillStyle=bg;g.fillRect(0,0,w,h);
 if(image)g.drawImage(image,0,0,w,h);
 g.restore();
}
