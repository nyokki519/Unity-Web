// Inextensible sheet bent around a cylindrical moving fold. World units are
// card-widths, not a claim about paper stiffness. Both sides use the actual card.
export function cardMesh(value,columns=8,rows=80,{gripX=0}={}){
 const p=Math.max(0,Math.min(1,Number.isFinite(value)?value:0)),vertices=[],triangles=[],radius=.12,start=.7-p*(1.4+Math.PI*radius);
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const u=i/columns,v=j/rows,x=u-.5,y=v*1.4-.7,fold=start-(u-.5)*(.08+.34*Math.max(-1,Math.min(1,gripX)))*Math.sin(p*Math.PI),delta=Math.max(0,y-fold),angle=Math.min(Math.PI,delta/radius);
  const yy=delta===0?y:delta<Math.PI*radius?fold+radius*Math.sin(angle):fold-(delta-Math.PI*radius),z=radius*(1-Math.cos(angle));vertices.push({x,y:yy,z,u,v,angle});
 }
 const centre=(Math.min(...vertices.map(v=>v.y))+Math.max(...vertices.map(v=>v.y)))/2;for(const v of vertices)v.y-=centre;
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;for(const indices of [[a,c,b],[b,c,d]]){const angle=indices.reduce((n,k)=>n+vertices[k].angle,0)/3;triangles.push({indices,side:Math.cos(angle)>=0?'back':'face',light:.68+.32*Math.abs(Math.cos(angle-.3))});}}
 return{vertices,triangles};
}
