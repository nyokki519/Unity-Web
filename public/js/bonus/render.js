// Original café amusement cabinet. Coordinates are logical canvas pixels.
const C = { green:'#123e35', dark:'#092b26', ivory:'#f5edd6', brass:'#d7b66e', rim:'#b68c43', ink:'#172b27', hole:'#071b18' };

function ellipse(ctx,x,y,rx,ry,fill,stroke,width=1) {
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function label(ctx,text,x,y,size=12,color=C.ivory,align='center') {
  ctx.font=`600 ${size}px sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function path(ctx,points,color,width) {
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function pipe(ctx,points) {
  path(ctx,points,'#061e1b',19);path(ctx,points,C.rim,15);path(ctx,points,'#254d42',11);path(ctx,points,'#5f7860',2);
}

export function ballScreenPosition(ball,board) {
  if(ball.zone==='transfer') return {x:ball.screenX??ball.x,y:ball.screenY??ball.y};
  if(ball.zone==='tray') {
    const tray=board.trays[ball.stage-1];
    return {x:tray.cx+ball.x,y:tray.cy+ball.y*tray.scaleY};
  }
  return {x:ball.x,y:ball.y};
}

function tray(ctx,t,index,active,glow) {
  const {cx,cy,radius:r,scaleY:s}=t;
  // Lower apron, upper lip, and recessed playing surface remain separate shapes.
  ellipse(ctx,cx,cy+13,r+7,r*s+7,'#082820',C.rim,2);
  ellipse(ctx,cx,cy,r+7,r*s+7,C.brass,C.rim,2);
  const surface=ctx.createRadialGradient(cx-25,cy-16,3,cx,cy,r);
  surface.addColorStop(0,'#436755');surface.addColorStop(.7,'#264e40');surface.addColorStop(1,'#102f29');
  ellipse(ctx,cx,cy,r,r*s,surface,'#f0d798',1.5);
  // Contours suggest a bowl without inventing extra holes or obstacles.
  ellipse(ctx,cx,cy,r*.78,r*s*.78,null,'#65816a',.6);
  ellipse(ctx,cx,cy,r*.5,r*s*.5,null,'#56755f',.6);
  if(active) ellipse(ctx,cx,cy,r+10,r*s+10,null,`rgba(238,207,129,${.45+glow*.3})`,2);
  for(const h of t.holes) {
    const x=cx+h.x,y=cy+h.y*s;
    if(h.win) {
      ellipse(ctx,x,y,h.r+4,(h.r+4)*s,C.brass,'#ffe8a1',1);
      ellipse(ctx,x,y,h.r,h.r*s,C.hole,'#8e713a',1);
      const ly=index===2?725:cy+r*s+35;
      const lx=index===2?cx+112:cx+64;
      path(ctx,[[x,y+ h.r*s+3],[x,ly-12],[lx,ly-12]],C.brass,1);
      label(ctx,index===2?'大穴 WIN':'次へ WIN',lx,ly,12,C.brass);
    } else {
      ellipse(ctx,x,y,h.r+1,(h.r+1)*s,'#68806a');
      ellipse(ctx,x,y,h.r,h.r*s,C.hole);
    }
  }
  label(ctx,`0${index+1}`,48,cy-4,21,C.brass);
  label(ctx,['一段目','二段目','最終段'][index],48,cy+18,12);
  label(ctx,['PRELUDE','ASCENT','JACKPOT'][index],cx,cy-r*s-23,12,index===2?C.brass:C.ivory);
}

export function drawBoard(ctx,game,{reducedMotion=false,time=0}={}) {
  const b=game.board;
  ctx.save();ctx.clearRect(0,0,420,760);
  ctx.fillStyle=C.dark;ctx.fillRect(0,0,420,760);
  const bg=ctx.createLinearGradient(0,0,420,760);bg.addColorStop(0,'#245447');bg.addColorStop(1,'#0b302a');
  ctx.fillStyle=bg;ctx.fillRect(8,8,404,744);
  ctx.strokeStyle=C.brass;ctx.lineWidth=2;ctx.strokeRect(9,9,402,742);
  ctx.strokeStyle='#617963';ctx.lineWidth=1;ctx.strokeRect(15,15,390,730);
  for(const x of [22,398])for(const y of [22,244,420,584,738]) {
    ellipse(ctx,x,y,3,3,C.brass);path(ctx,[[x-1,y-1],[x+1,y+1]],'#776239',1);
  }
  // All paths sit behind bowl surfaces; their exposed sections explain progression.
  const first=b.trays[0];
  // The entrance is a collecting gutter: every accepted board x follows
  // one of these curved lanes into the first bowl's right inlet.
  const entrance=[];
  for(let lane=0;lane<=24;lane++) {
    const start=b.entry.x-b.entry.width/2+b.entry.width*lane/24;
    const points=[];
    const amplitude=Math.min(110,400-Math.max(start,first.cx+96));
    for(let step=0;step<=40;step++) {
      const t=step/40;
      points.push([(1-t)*start+t*(first.cx+96)+Math.sin(Math.PI*t)*amplitude,
        (1-t)*b.entry.y+t*(first.cy+(start-210)*.08*first.scaleY)]);
    }
    entrance.push(points);
  }
  for(const lane of entrance) path(ctx,lane,'#173d32',17);
  path(ctx,entrance[0],C.rim,2);
  path(ctx,entrance[entrance.length-1],C.rim,2);
  for(let i=0;i<b.trays.length-1;i++) {
    const from=b.trays[i],to=b.trays[i+1];
    const h=from.holes.find(h=>h.win);
    const sx=from.cx+h.x,sy=from.cy+h.y*from.scaleY;
    const points=[];
    for(let step=0;step<=40;step++) {
      const t=step/40;
      points.push([(1-t)*sx+t*(to.cx+96)+Math.sin(Math.PI*t)*110,(1-t)*sy+t*to.cy]);
    }
    pipe(ctx,points);
  }
  // Pinboard occupies only the upper compartment.
  ctx.fillStyle='#0b2d27';ctx.fillRect(b.left,42,b.right-b.left,183);
  path(ctx,[[b.left,47],[b.left,226],[b.entry.x-b.entry.width/2,226]],C.rim,3);
  path(ctx,[[b.right,47],[b.right,226],[b.entry.x+b.entry.width/2,226]],C.rim,3);
  label(ctx,'琥珀の三段塔',210,30,16,C.ivory);
  label(ctx,'PIN GALLERY',210,46,12,'#adbc9b');
  for(const p of b.pins) {
    ellipse(ctx,p.x+1,p.y+2,p.r+1,p.r+1,'#041e1a');
    ellipse(ctx,p.x,p.y,p.r,p.r,C.brass,'#f8e6b5',.6);
  }
  ellipse(ctx,b.launcher.x,b.launcher.y,12,12,'#1f4a3d',C.brass,2);
  label(ctx,'↑',b.launcher.x,b.launcher.y,16,C.ivory);
  label(ctx,'ENTRY',b.entry.x,241,12,C.brass);
  const recent=(game.events||[]).some(e=>e.type==='jackpot'&&game.elapsed-e.at>=0&&game.elapsed-e.at<1.8);
  const glow=recent&&!reducedMotion ? (Math.sin(time*.012)+1)/2 : 0;
  const activeStages=new Set((game.balls||[]).filter(b=>b.zone!=='board').map(b=>b.stage));
  b.trays.forEach((t,i)=>tray(ctx,t,i,activeStages.has(i+1)||i===2&&recent,glow));
  for(const ball of game.balls||[]) {
    const p=ballScreenPosition(ball,b);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
    const r=ball.r??4;
    ellipse(ctx,p.x+2,p.y+3,r+1,r*.55,'rgba(0,0,0,.5)');
    const shine=ctx.createRadialGradient(p.x-1.5,p.y-1.5,.1,p.x,p.y,r);
    shine.addColorStop(0,'#fffef1');shine.addColorStop(.55,'#f7e9bd');shine.addColorStop(1,'#aa843b');
    ellipse(ctx,p.x,p.y,r,r,shine,'#fff6d8',.6);
  }
  label(ctx,'CAFÉ • AMBER WORKS',210,739,12,'#bdc5a8');
  ctx.restore();
}
