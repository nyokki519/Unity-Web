import{vec,identity,fromY,box,rod,chute,bowlMesh,shaftMesh,bowlHeight}from'./si-geometry.js';
export const PHYSICS_VERSION='si-3',WIDTH=1000,HEIGHT=1600,FIXED_DT=1/240,BALL_RADIUS=.0055,BALL_MASS=.0055,PX_PER_METER=2000;
const clamp=(v,d,a,b)=>Number.isFinite(Number(v))?Math.min(b,Math.max(a,Number(v))):d;
export function gateAt(g,time){const phase=((time+g.phase)%g.period+g.period)%g.period,ramp=Math.min(.25,g.openDuration/3),f=phase<g.openDuration&&ramp?Math.max(0,Math.min(1,phase/ramp,(g.openDuration-phase)/ramp)):0;return{position:vec(g.x+(g.width+.014)*f,g.y,g.z),rotation:identity(),open:f>.85,offset:(g.width+.014)*f};}
export function holesAt(tray){return tray.holes;}
export function createBoard(difficulty='easy',overrides={}){
 const level=['easy','normal','abyss','custom'].includes(difficulty)?difficulty:'easy',easy=level==='easy',hard=level==='abyss';
 const board={physicsVersion:PHYSICS_VERSION,units:'m-s-kg',width:.5,height:.8,presentation:{width:WIDTH,height:HEIGHT,pxPerMeter:PX_PER_METER},difficulty:level,ballRadius:BALL_RADIUS,ballMass:BALL_MASS,gravity:clamp(overrides.gravity,9.80665,1,15),friction:clamp(overrides.friction,.18,.01,1),restitution:clamp(overrides.restitution,.68,0,.9),fireInterval:clamp(overrides.fireInterval,.6,.1,3),maxBalls:Math.floor(clamp(overrides.maxBalls,24,1,32)),launchVariance:clamp(overrides.launchVariance,.012,0,.1),launcher:vec(.455,.045,.007),entry:{x:.25,y:.35,width:easy?.065:hard?.019:.032},parts:[],pins:[],trays:[],evidence:{source:'Offline Research Pack v1.0',confidence:'secondary-note',measuredOrEstimated:'ball standard summary; all mechanisms original provisional',ballDiameter:{value:.011,source:'offline-pack/03_ENGINEERING/01_DIMENSIONS_AND_PHYSICS.md',confidence:'secondary-note',measuredOrEstimated:'reported-standard'},ballMass:{value:.0055,source:'same note: 5.4–5.7g',confidence:'secondary-note',measuredOrEstimated:'adopted-within-reported-range'},mechanisms:{source:'JACKPOT_REDESIGN.md',confidence:'E',measuredOrEstimated:'original-provisional'}}};
 const p=board.parts;
 box(p,'back','back',vec(.25,.4,-.003),vec(.25,.4,.003));
 box(p,'upper-glass','glass',vec(.235,.565,.017),vec(.205,.215,.001),identity(),{visible:false});
 box(p,'rail-glass','glass',vec(.455,.4,.017),vec(.018,.38,.001),identity(),{visible:false});
 // Two physical guide rails, including a continuous upper arc. No launch teleport.
 for(const[x,id]of [[.444,'inner'],[.466,'outer']])rod(p,`rail-${id}`,'rail',vec(x,.025,.007),vec(x,.55,.007),.002);
 for(const[r,id]of [[.1958,'inner'],[.2142,'outer']]){const vertices=[],indices=[],count=100;for(let i=0;i<=count;i++){const a=i*150*Math.PI/180/count;for(const z of[-.004,.019])vertices.push(.25+r*Math.cos(a),.55+r*Math.sin(a),z);}for(let i=0;i<count;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c);}p.push({id:`arc-${id}`,kind:'mesh',tag:'rail',position:vec(),rotation:identity(),vertices:new Float32Array(vertices),indices:new Uint32Array(indices),friction:.01,restitution:0});}
 rod(p,'upper-deflector','rail',vec(.043,.646,.007),vec(.115,.565,.007),.0025,{friction:.03,restitution:.15});
 rod(p,'board-left','rail',vec(.035,.34,.007),vec(.035,.675,.007),.0025);
 rod(p,'board-right','rail',vec(.421,.34,.007),vec(.421,.59,.007),.0025);
 const addPin=(x,y,role)=>{const id=board.pins.length,r=.0015+(id%3)*.00012,adjust=overrides.pinAdjustments?.find(a=>a.index===id);x+=(overrides.pinPreset==='left'?-.003:overrides.pinPreset==='right'?.003:0);x+=clamp(adjust?.dx,0,-.006,.006);y+=clamp(adjust?.dy,0,-.006,.006);let clearanceAttempts=0;
 const railTooClose=()=>p.some(q=>{if(q.tag!=='rail'||!q.start)return false;const a=q.start,b=q.end,dx=b.x-a.x,dy=b.y-a.y,f=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a.x-f*dx,y-a.y-f*dy)<q.radius+r+.014;});
 while((board.pins.some(q=>Math.hypot(q.x-x,q.y-y)<q.r+r+.014)||railTooClose())&&clearanceAttempts++<120)y-=.002;
 const pin={id,x,y,z:.007,r,role};board.pins.push(pin);p.push({id:`pin-${id}`,kind:'cylinder',tag:'pin',pinId:id,position:vec(x,y,.007),rotation:fromY(vec(Math.sin(clamp(adjust?.angle,0,-15,15)*Math.PI/180),0,Math.cos(clamp(adjust?.angle,0,-15,15)*Math.PI/180))),radius:r,halfHeight:.009,restitution:clamp(adjust?.restitution,board.restitution,0,.9)});};
 const line=(a,b,count,role)=>{for(let i=0;i<count;i++){const f=count===1?0:i/(count-1);addPin(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,role);}};
 // Functional groups form several channels; not a jittered rectangular grid.
 const groups=[[[.075,.645],[.16,.61],7,'天釘'],[[.18,.655],[.36,.635],12,'天釘'],[[.055,.592],[.125,.565],6,'左誘導'],[[.14,.61],[.20,.58],5,'中央誘導'],[[.235,.618],[.30,.59],5,'中央誘導'],[[.33,.60],[.395,.568],6,'右誘導'],[[.08,.54],[.15,.51],6,'寄り'],[[.185,.555],[.24,.525],5,'寄り'],[[.28,.555],[.35,.515],6,'寄り'],[[.055,.485],[.115,.455],5,'アウト誘導'],[[.135,.49],[.19,.465],5,'入口誘導'],[[.22,.495],[.27,.463],5,'入口誘導'],[[.31,.49],[.39,.456],7,'アウト誘導'],[[.09,.426],[.16,.399],6,'入口誘導'],[[.19,.437],[.225,.405],4,'寄り'],[[.27,.433],[.31,.4],4,'寄り'],[[.35,.417],[.399,.392],5,'アウト誘導']];
 for(const[a,b,n,role]of groups)line(a,b,n,role);
 for(const s of[-1,1]){line([.25+s*.065,.405],[.25+s*(board.entry.width/2+.005),.365],5,'命釘・入口');}
 board.gate={x:.25,y:.343,z:.007,width:board.entry.width,height:.004,depth:.025,period:clamp(overrides.gatePeriod,3,.5,15),openDuration:clamp(overrides.gateOpenDuration,easy?2:hard?.7:1.2,.15,12),phase:0};
 box(p,'gate','gate',vec(.25,.343,.007),vec(board.gate.width/2,.002,.013));
 const holeScale=clamp(overrides.holeScale,1,.7,1.3),counts=easy?[3,3,3]:[3,4,5];
 for(let i=0;i<3;i++){
  const radius=[.0675,.0625,.0575][i]*clamp(overrides.cradleScale,1,.8,1.2),cy=[.25,.145,.04][i],cz=.115+i*.005,ratio=easy?1.95:hard?1.3:1.55;
  const t={profile:'curved',stage:i+1,cx:.25,cy,cz,radius,diameter:radius*2,depth:.014*clamp(overrides.cradleDepthScale,1,.7,1.3),valleyRadius:radius*.47,centerRise:.007,tilt:-.006*Math.cos(2*Math.PI/counts[i]),tiltZ:-.006*Math.sin(2*Math.PI/counts[i]),rpm:0,omega:0,holes:[],evidence:'E: original curved fixed dish; not machine measurement'};
  for(let j=0;j<counts[i];j++){const a=counts[i]===3?-Math.PI/3+(j-1)*2*Math.PI/3:(j-1)*2*Math.PI/(counts[i]-1),distance=j===0?0:radius*(easy?.5:.4);t.holes.push({id:j,x:distance*Math.cos(a),z:distance*Math.sin(a),r:easy?Math.max(BALL_RADIUS*1.16,Math.min(BALL_RADIUS*ratio*holeScale*(j===0?1.7:.72),radius*(j===0?.28:.12))):Math.min(BALL_RADIUS*ratio*holeScale,radius*.18),win:j===0});}
  const wallVertices=[],wallIndices=[];for(let j=0;j<=96;j++){const a=j*2*Math.PI/96;for(const y of[cy-.006,cy+.025])wallVertices.push(t.cx+radius*Math.cos(a),y,cz+radius*Math.sin(a));}for(let j=0;j<96;j++){const k=j*2;wallIndices.push(k,k+1,k+2,k+1,k+3,k+2);}p.push({id:`outer-wall-${i}`,kind:'mesh',tag:'rim',position:vec(),rotation:identity(),vertices:new Float32Array(wallVertices),indices:new Uint32Array(wallIndices),friction:.08,restitution:.05});
  board.trays.push(t);p.push({id:`bowl-${i}`,kind:'mesh',tag:'bowl',position:vec(),rotation:identity(),...bowlMesh(t),friction:Math.min(board.friction,.004),restitution:.08});
  for(let j=0;j<72;j++){const a=j*2*Math.PI/72,b=(j+1)*2*Math.PI/72;rod(p,`rim-${i}-${j}`,'rim',vec(t.cx+radius*Math.cos(a),cy+.025,cz+radius*Math.sin(a)),vec(t.cx+radius*Math.cos(b),cy+.025,cz+radius*Math.sin(b)),.003);}
  for(const h of t.holes){p.push({id:`shaft-${i}-${h.id}`,kind:'mesh',tag:'shaft',win:h.win,position:vec(),rotation:identity(),...shaftMesh(t,h),friction:.12,restitution:.08});if(!h.win){const sy=bowlHeight(t,h.x,h.z)-.018;chute(p,`reject-${i}-${h.id}`,[vec(t.cx+h.x,sy,cz+h.z),vec(t.cx+Math.cos(Math.atan2(h.z,h.x))*(radius+.045),sy-.045,cz+Math.sin(Math.atan2(h.z,h.x))*(radius+.045))],.026);}}
 }
 const first=board.trays[0];chute(p,'gate-entry',[vec(.25,.335,.007),vec(.25-first.radius*.67,.284,.075)],[board.entry.width+.024,.032]);
 for(let i=0;i<2;i++){const t=board.trays[i],next=board.trays[i+1],h=t.holes.find(h=>h.win),sy=bowlHeight(t,h.x,h.z)-.02,ex=next.cx+next.radius*.67;
  chute(p,`transfer-${i}`,[vec(t.cx+h.x,sy,t.cz+h.z),vec(next.cx-next.radius*.45,next.cy+.033,next.cz-.02)],.026);}
 return board;
}
