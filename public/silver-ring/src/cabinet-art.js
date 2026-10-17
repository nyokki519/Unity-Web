// Original nocturnal coffee-mask artwork. No reference image or third-party artwork is embedded.
export function paintCabinetArt(g,w,h){
 g.save();g.scale(w/1024,h/1700);
 const bg=g.createLinearGradient(0,0,0,1700);bg.addColorStop(0,'#211039');bg.addColorStop(.5,'#170d30');bg.addColorStop(1,'#090e20');g.fillStyle=bg;g.fillRect(0,0,1024,1700);
 const path=(points,fill,stroke='#b68b4e',line=4)=>{g.beginPath();for(const [cmd,...args] of points)g[cmd](...args);g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=line;g.stroke();};
 for(const side of [-1,1]){
  g.save();g.translate(512,0);g.scale(side,1);
  // Swept horns and segmented wings sit at the perimeter, leaving the pin routes quiet.
  path([['moveTo',45,185],['bezierCurveTo',150,155,230,45,365,70],['bezierCurveTo',285,165,350,225,435,280],['bezierCurveTo',318,255,245,240,180,310],['bezierCurveTo',115,290,90,225,45,185]],'#66334f');
  path([['moveTo',195,310],['bezierCurveTo',290,185,370,174,448,128],['bezierCurveTo',425,290,496,380,475,570],['bezierCurveTo',415,460,395,385,315,380],['bezierCurveTo',275,360,240,350,195,310]],'#413067');
  for(let i=0;i<7;i++){
   const y=430+i*117,x=420-i*8;
   path([['moveTo',x-32,y-65],['bezierCurveTo',x+48,y-95,x+65,y-35,x+58,y+57],['lineTo',x-13,y+125],['bezierCurveTo',x+14,y+22,x-23,y-5,x-32,y-65]],i%2?'#57264c':'#342051','#bb925d',3);
  }
  // Coffee-bean eye under a machined brow, distinct from the supplied four-eye cabinet.
  path([['moveTo',155,390],['bezierCurveTo',222,340,290,355,338,410],['bezierCurveTo',261,443,206,449,155,390]],'#c18b72','#d6b878',5);
  g.save();g.translate(245,401);g.rotate(-.25);g.fillStyle='#1a152f';g.beginPath();g.ellipse(0,0,30,20,0,0,Math.PI*2);g.fill();g.strokeStyle='#e5bc75';g.lineWidth=3;g.beginPath();g.moveTo(-4,-17);g.bezierCurveTo(-18,-2,15,2,4,17);g.stroke();g.restore();
  // Brass scrollwork and rivets.
  g.strokeStyle='#a87551';g.lineWidth=3;g.beginPath();g.moveTo(352,130);g.bezierCurveTo(100,185,395,290,160,490);g.bezierCurveTo(85,620,254,717,160,850);g.stroke();
  for(let i=0;i<15;i++){g.fillStyle=i%3?'#a17852':'#e0bf80';g.beginPath();g.arc(456+10*Math.sin(i*.9),300+i*74,i%3?3:5,0,Math.PI*2);g.fill();}
  g.restore();
 }
 // A central espresso-mask crest, with a restrained geometric mouth grille.
 path([['moveTo',512,165],['lineTo',577,260],['lineTo',545,349],['lineTo',568,480],['lineTo',512,530],['lineTo',456,480],['lineTo',479,349],['lineTo',447,260]],'#322144','#c9a66b',5);
 g.fillStyle='#e2c493';g.beginPath();g.ellipse(512,279,18,34,.25,0,Math.PI*2);g.fill();g.strokeStyle='#38253d';g.lineWidth=4;g.beginPath();g.moveTo(517,250);g.bezierCurveTo(490,276,536,282,506,308);g.stroke();
 for(let i=-2;i<=2;i++){g.fillStyle='#aa8265';g.fillRect(505+i*13,425+Math.abs(i)*4,6,49-Math.abs(i)*8);}
 g.strokeStyle='rgba(220,164,95,.45)';g.lineWidth=5;g.strokeRect(25,24,974,1650);
 // Slight center vignette improves the contrast of chrome balls and pins.
 const quiet=g.createRadialGradient(512,700,60,512,700,510);quiet.addColorStop(0,'rgba(9,6,23,.35)');quiet.addColorStop(1,'rgba(9,6,23,0)');g.fillStyle=quiet;g.fillRect(0,0,1024,1700);
 g.restore();
}
