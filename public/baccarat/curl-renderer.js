import {cardImage as image} from './card-images.js';
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('CARD_SHADER');return s;}
// One tiny local WebGL surface, reused across cards. The rest of the game is DOM.
export class CurlRenderer{
 constructor(canvas,front,back){
  this.canvas=canvas;this.progress=0;this.disposed=false;const gl=this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});if(!gl){this.ready=Promise.reject(Error('CARD_GRAPHICS'));return;}
  this.program=gl.createProgram();const vs=shader(gl,gl.VERTEX_SHADER,`attribute vec2 uv;uniform vec2 scale;uniform float peek;uniform float bend;uniform float centre;varying vec2 tex;varying vec2 surface;void main(){float fold=.7-peek*(1.4+3.141592653589793*.12)-(uv.x-.5)*bend;float originalY=uv.y*1.4-.7;float delta=max(0.,originalY-fold);float curl=min(3.141592653589793,delta/.12);float yy=delta==0.?originalY:delta<3.141592653589793*.12?fold+.12*sin(curl):fold-(delta-3.141592653589793*.12);vec3 position=vec3(uv.x-.5,yy-centre,.12*(1.-cos(curl)));float angle=.16;float y=position.y*cos(angle)-(position.z-.12)*sin(angle);float z=position.y*sin(angle)+(position.z-.12)*cos(angle)+position.x*.035;float approach=1.+.02*smoothstep(.7,1.,peek);gl_Position=vec4((position.x+(position.z-.12)*.045)*scale.x*approach,-y*scale.y*approach,-z*.2,1.-z/4.);tex=uv;surface=vec2(0.,.68+.32*abs(cos(curl-.3)));}`),fs=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;uniform sampler2D face;uniform sampler2D reverse;varying vec2 tex;varying vec2 surface;void main(){vec4 c=gl_FrontFacing?texture2D(reverse,tex):texture2D(face,vec2(tex.x,1.-tex.y));if(c.a<.02)discard;float band=max(0.,1.-abs(tex.x-.32)*1.5);band*=band;band*=band;float sheen=band*band*(1.-surface.y)*.16;vec3 paper=c.rgb*(.78+.22*surface.y)+vec3(1.,.94,.80)*sheen;gl_FragColor=vec4(paper,c.a);}`);
  gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('CARD_PROGRAM');gl.useProgram(this.program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  // Geometry topology and UVs never change; only the fold uniforms move.
  const grid=new Float32Array(9*81*2),indices=new Uint16Array(8*80*6);let cursor=0;
  for(let j=0;j<=80;j++)for(let i=0;i<=8;i++){grid[cursor++]=i/8;grid[cursor++]=j/80;}
  cursor=0;for(let j=0;j<80;j++)for(let i=0;i<8;i++){const a=j*9+i;for(const index of[a,a+9,a+1,a+1,a+9,a+10])indices[cursor++]=index;}
  gl.bufferData(gl.ARRAY_BUFFER,grid,gl.STATIC_DRAW);this.vertexCount=indices.length;
  this.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(this.program,'uv');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,8,0);
  this.uniforms=Object.fromEntries(['peek','scale','bend','centre'].map(name=>[name,gl.getUniformLocation(this.program,name)]));
  this.positions=new Float64Array(9*81*3);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);this.textures=[];
  this.ready=Promise.all([image(front),image(back)]).then(images=>{if(this.disposed)return;gl.useProgram(this.program);for(const[i,img]of images.entries()){const t=gl.createTexture();this.textures.push(t);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(this.program,i?'reverse':'face'),i);}canvas.dataset.renderer='webgl';this.loaded=true;this.draw(this.progress);});
  this.resize=new ResizeObserver(()=>this.draw(this.progress));this.resize.observe(canvas);
 }
 draw(value,options=this.options||{}){this.options=options;this.progress=value;if(!this.loaded||this.disposed||this.gl.isContextLost())return;const c=this.canvas,rect=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(!w||!h)return;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const gl=this.gl,p= Math.max(0,Math.min(1,Number.isFinite(this.progress)?this.progress:0)),bend=(.08+.34*Math.max(-1,Math.min(1,options.gripX??0)))*Math.sin(p*Math.PI),start=.7-p*(1.4+Math.PI*.12),positions=this.positions;
  // Keep the reference grid's sampled centre and bounds, without mesh objects.
  let minY=Infinity,maxY=-Infinity,index=0;
  for(let j=0;j<=80;j++)for(let i=0;i<=8;i++){
   const x=i/8-.5,y=j/80*1.4-.7,fold=start-x*bend,delta=Math.max(0,y-fold),angle=Math.min(Math.PI,delta/.12),yy=delta===0?y:delta<Math.PI*.12?fold+.12*Math.sin(angle):fold-(delta-Math.PI*.12);
   positions[index++]=x;positions[index++]=yy;positions[index++]=.12*(1-Math.cos(angle));minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);
  }
  const centre=(minY+maxY)/2,scale=Math.min(w/1.08,h/1.52);
  gl.useProgram(this.program);gl.uniform1f(this.uniforms.peek,p);gl.uniform1f(this.uniforms.bend,bend);gl.uniform1f(this.uniforms.centre,centre);gl.uniform2f(this.uniforms.scale,scale*2/w,scale*2/h);gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,this.vertexCount,gl.UNSIGNED_SHORT,0);
  let left=Infinity,right=-Infinity,bottom=-Infinity;
  for(let k=0;k<positions.length;k+=3){const x=positions[k],yy=positions[k+1]-centre,zz=positions[k+2]-.12,y=yy*Math.cos(.16)-zz*Math.sin(.16),z=yy*Math.sin(.16)+zz*Math.cos(.16)+x*.035,factor=(1+.02*(p>.7?Math.min(1,(p-.7)/.3):0))/(1-z/4),px=w/2+(x+zz*.045)*scale*factor,py=h/2+y*scale*factor;left=Math.min(left,px);right=Math.max(right,px);bottom=Math.max(bottom,py);}
  left/=dpr;right/=dpr;bottom/=dpr;c.dataset.cardWidth=right-left;if(p<.02&&c.parentElement){c.parentElement.style.setProperty('--card-left',left+'px');c.parentElement.style.setProperty('--card-right',right+'px');c.parentElement.style.setProperty('--card-bottom',bottom+'px');}

 }
 dispose(){this.disposed=true;this.resize?.disconnect();if(!this.gl)return;for(const t of this.textures||[])this.gl.deleteTexture(t);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.indexBuffer)this.gl.deleteBuffer(this.indexBuffer);if(this.program)this.gl.deleteProgram(this.program);}
}
