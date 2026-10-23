import earcut from '../../vendor/earcut/earcut.js';
import {v,q,axisAngle,mul} from './math.js';
export function apertureContains(p,h,r){return Math.hypot(p.x-h.x,p.z-h.z)<=h.radius-r;}
// Watertight extruded deck. Exact same vertices/triangles become the Rapier collider and Three mesh.
function deckMesh(holes){
 const outer=[[-.068,.025],[.068,.025],[.068,.080],[-.068,.080]];
 const loops=[outer,...holes.map(h=>Array.from({length:32},(_,i)=>{const a=-i/32*Math.PI*2;return [h.x+Math.cos(a)*h.radius,h.z+Math.sin(a)*h.radius];}))];
 const flat=loops.flat().flat(),starts=[];let count=outer.length;for(const loop of loops.slice(1)){starts.push(count);count+=loop.length;}
 const faces=earcut(flat,starts),vertices=[],indices=[];const N=flat.length/2;
 for(const y of [.418,.414])for(let i=0;i<N;i++)vertices.push(flat[i*2],y+(flat[i*2+1]-.052)*.25,flat[i*2+1]);
 for(let i=0;i<faces.length;i+=3){const [a,b,c]=faces.slice(i,i+3);indices.push(c,b,a,a+N,b+N,c+N);}
 let base=0;for(const loop of loops){for(let i=0;i<loop.length;i++){const a=base+i,b=base+(i+1)%loop.length;indices.push(a,b,a+N,b,b+N,a+N);}base+=loop.length;}
 return {vertices,indices};
}
export function buildMachine(c){
 const parts=[];const add=(id,kind,position,size,role='resin',extra={})=>parts.push({id,kind,position,rotation:q(),size,role,body:'fixed',...extra});
 const box=(id,pos,size,role='resin',extra={})=>add(id,'box',v(...pos),size,role,extra);
 const rod=(id,a,b,r,role='resin',depth=.022)=>{const dx=b[0]-a[0],dy=b[1]-a[1];box(id,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[Math.hypot(dx,dy),r*2,depth],role,{rotation:axisAngle(v(0,0,1),Math.atan2(dy,dx))});};
 box('field-front',[0,.74,.028],[.50,.40,.002],'glass');
 for(const side of [-1,1])box(`lane-front-${side}`,[side*.204,.26,.028],[.09,.56,.002],'glass');
 box('lower-front',[0,.11,.25],[.50,.33,.002],'glass');
 box('frame-top',[0,.887,.02],[.58,.026,.14],'frame');
 box('back',[0,.425,-.006],[.51,.90,.012],'back');
 box('left-wall',[-.253,.40,.04],[.008,.90,.10],'frame');box('right-wall',[.253,.40,.04],[.008,.90,.10],'frame');
 // Launch groove is bounded by a visible outer frame and an inner rail, ending into the field.
 box('launch-divider',[.222,.305,.012],[.003,.60,.027],'rail');
 for(let i=0;i<40;i++){const a=i/40*Math.PI,b=(i+1)/40*Math.PI;rod(`crown-${i}`,[.247*Math.cos(a),.605+.247*Math.sin(a),.012],[.247*Math.cos(b),.605+.247*Math.sin(b),.012],.003,'rail');}
 for(let i=0;i<24;i++){const a=i/24*Math.PI*.35,b=(i+1)/24*Math.PI*.35;rod(`launch-curve-${i}`,[.222*Math.cos(a),.605+.222*Math.sin(a),.012],[.222*Math.cos(b),.605+.222*Math.sin(b),.012],.0015,'rail');}
 // Head / wing roots. Pins stop above the mechanism and continue down the outside lanes.
 for(let row=0;row<7;row++){const y=.755-row*.024;for(let col=0;col<15;col++){const x=-.207+col*.028+(row%2)*.014;if((y<.665&&Math.abs(x)<.15)||Math.abs(x)>.209||Math.hypot(x,y-.605)>.232||(x>0&&Math.atan2(y-.605,x)<Math.PI*.35&&Math.hypot(x,y-.605)>.211))continue;add(`pin-${row}-${col}`,'cylinder',v(x,y,.010),{radius:.00145,height:.017},'pin',{rotation:axisAngle(v(1,0,0),Math.PI/2)});}}
 for(const side of [-1,1])for(let row=0;row<11;row++)for(let k=0;k<2;k++){const x=side*(.175+k*.029+(row%2)*.007);if(side===1&&x>.205)continue;add(`side-pin-${side}-${row}-${k}`,'cylinder',v(x,.53-row*.03,.01),{radius:.00145,height:.017},'pin',{rotation:axisAngle(v(1,0,0),Math.PI/2)});}
 for(const side of [-1,1])box(`head-roof-${side}`,[side*.027,.61,.019],[.068,.008,.037],'metal',{rotation:axisAngle(v(0,0,1),-side*.60)});
 for(const side of [-1,1])box(`wing-root-${side}`,[side*.125,.543,.017],[.045,.004,.035],'metal',{rotation:axisAngle(v(0,0,1),-side*.50)});
 for(const side of [-1,1])box(`wing-${side}`,[side*.079,.57,.017],[c.wing.length,.004,c.wing.width],'wing',{body:'kinematic',mechanism:`wing:${side}`});
 // Visible separators provide the same left/right pickup mouths as the crossing tests.
 box('entry-divider',[0,.541,.021],[.006,.075,.043],'resin');
 for(const side of [-1,1])box(`entry-outer-${side}`,[side*.139,.477,.034],[.004,.11,.073],'resin');
 box('left-channel-back',[-.085,.505,-.002],[.095,.11,.004],'resin');
 box('right-channel-back',[.084,.49,-.002],[.094,.14,.004],'resin');
 // Entry collectors join the wide wing mouths to the narrower actual route floors.
 for(const side of [-1,1]){rod(`entry-inner-guide-${side}`,[side*.001,.542,.036],[side*.049,.488,.036],.0015,'resin',.072);rod(`entry-outer-guide-${side}`,[side*.136,.532,.036],[side*.123,.488,.036],.0015,'resin',.072);}
 box('stopper',[-.085,.482,.032],[.085,.005,.064],'red',{body:'kinematic',mechanism:'stopper'});
 box('sway-tray',[-.085,.450,.041],[.084,.004,.090],'red',{body:'kinematic',mechanism:'sway'});
 box('left-lip',[-.130,.448,.044],[.004,.06,.08],'resin');
 // Descending red delivery shelf to the front playing stage.
 box('left-delivery',[-.082,.362,.108],[.086,.004,.080],'resin',{rotation:mul(axisAngle(v(0,0,1),-.50),axisAngle(v(1,0,0),.50))});
 box('main-stage',[0,.310,.163],[.240,.006,.100],'green',{rotation:axisAngle(v(1,0,0),.55)});
 box('stage-left-wall',[-.125,.337,.166],[.004,.065,.11],'resin');box('stage-right-wall',[.125,.337,.166],[.004,.065,.11],'resin');
 box('bat',[0,.314,.187],[.096,.011,.009],'bat',{body:'kinematic',mechanism:'bat'});
 // Slugger branch is a narrow sloped chute into the rotor, not a scripted trajectory.
 box('slugger-shelf',[.084,.475,.035],[.084,.004,.090],'blue',{rotation:mul(axisAngle(v(0,0,1),.35),axisAngle(v(1,0,0),.62))});
 box('slugger-chute',[.053,.434,.091],[.070,.004,.057],'resin',{rotation:mul(axisAngle(v(0,0,1),.50),axisAngle(v(1,0,0),.40))});
 box('slugger-right-wall',[.123,.46,.068],[.004,.075,.12],'resin');
 add('rotor','cylinder',v(c.rotor.x,c.rotor.y,c.rotor.z),{radius:c.rotor.radius,height:c.rotor.width},'rotor',{body:'kinematic',mechanism:'rotor',rotation:axisAngle(v(0,0,1),Math.PI/2)});
 box('mechanism-front',[0,.432,.232],[.284,.306,.003],'resin');
 const holes=[{id:'out-left',x:-.044,z:.052,radius:.011},{id:'v',x:0,z:.052,radius:.011},{id:'out-right',x:.044,z:.052,radius:.011}];
 for(const h of holes)add(`${h.id}-well`,'cylinder',v(h.x,.392,h.z),{radius:.012,height:.002},'well');
 parts.push({id:'entry-deck',kind:'mesh',position:v(),rotation:q(),role:'deck',body:'fixed',...deckMesh(holes)});
 // Rear deck edge is open to a visible recovery path; no horizontal retaining ledge.
 for(const side of [-1,1])box(`deck-side-${side}`,[side*.071,.426,.051],[.004,.022,.06],'resin');
 // Ordinary starter cups: open throat, two side walls. Capture is below the visible rim.
 const cups=[{id:'starter-left',x:-.180,y:.19,type:1},{id:'starter-right',x:.18,y:.19,type:1},{id:'starter-center',x:0,y:.052,type:2}];
 for(const side of [-1,1]){
  rod(`starter-funnel-outer-${side}`,[side*.207,.270,.016],[side*.193,.216,.016],.0015,'rail');
  rod(`starter-funnel-inner-${side}`,[side*.147,.259,.016],[side*.166,.215,.016],.0015,'rail');
 }
 for(const cup of cups){cup.halfClearance=.012-.003/2-c.ball.radius;cup.captureY=cup.y-.009;cup.minZ=-.002;cup.maxZ=.058+c.ball.radius;for(const side of [-1,1])box(`${cup.id}-side-${side}`,[cup.x+side*.012,cup.y,.028],[.003,.028,.060],'brass');box(`${cup.id}-base`,[cup.x,cup.y-.021,.028],[.027,.010,.060],'metal');}
 // Visible lower attacker shutter and its broad mouth. It actually closes in normal play.
 box('attacker-lid',[0,.132,.012],[.145,.004,.027],'metal',{body:'kinematic',mechanism:'attacker'});
 for(const side of [-1,1])box(`attacker-wall-${side}`,[side*.074,.115,.016],[.004,.039,.032],'brass');
 box('attacker-base',[0,.090,.012],[.15,.008,.027],'metal',{rotation:axisAngle(v(1,0,0),.65)});
 // Start-through in the left lane, physically bounded and visibly labelled.
 for(const side of [-1,1])box(`start-through-wall-${side}`,[-.214+side*.017,.29,.013],[.002,.016,.026],'brass');
 for(const pin of parts.filter(p=>p.role==='pin'))add(pin.id+'-head','sphere',v(pin.position.x,pin.position.y,.019),{radius:.0019},'pin');
 return {parts,holes,cups,rotor:c.rotor};
}
