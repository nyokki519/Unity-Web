import{Vector3}from'../../vendor/three/three.module.js';
// A corner behind the near plane cannot safely define a projected rectangle.
export function projectCabinet(corners,matrix,camera,width,height){
 const v=new Vector3();let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const corner of corners){v.copy(corner).applyMatrix4(matrix).applyMatrix4(camera.matrixWorldInverse);if(v.z>=-camera.near)return{left:0,right:width,top:0,bottom:height};v.applyMatrix4(camera.projectionMatrix);const x=(v.x+1)*width/2,y=(1-v.y)*height/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return{left,right,top,bottom};
}
