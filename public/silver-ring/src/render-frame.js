// Avoid HDR ping-pong targets and canvas alpha compositing on mobile/free camera.
export function renderFrame(refs,{mobile=false,freeCamera=false}={}){
 if(mobile||freeCamera){refs.renderer.setRenderTarget(null);refs.renderer.render(refs.scene,refs.camera);return'direct';}
 refs.composer.render();return'postprocessed';
}
