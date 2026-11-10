import {createCpuGame} from './cpu-game.js';
import {mountApp} from './app.js';
import {createOnlineGame} from './online.js';

const root=document.getElementById('mahjong-app');
if(root){
  root.innerHTML='<main class="loading" role="status">対局の準備をしています…</main>';
  try{
    const prefix='/mahjong-engine/';
    const [match,ai,localView,referenceAdapter,referenceBundle]=await Promise.all([
      import(`${prefix}match.js`),import(`${prefix}ai.js`),import(`${prefix}client-view.js`),import(`${prefix}reference-ai.js`),import('../vendor/majiang-ai.bundle.js')
    ]);
    referenceAdapter.configureReferenceAI(referenceBundle.default,referenceBundle.Majiang?.rule);
    const engine={...match,...ai,view:localView.view};
    let app;
    const online=createOnlineGame({onState:state=>app?.setOnlineState(state),onConnection:value=>app?.setConnection(value),onError:error=>app?.setOnlineError(error)});
    app=mountApp(root,{cpu:createCpuGame(engine),online});
    try { online.resume(); } catch(error) { app.setOnlineError(error.message); }
  }catch(error){
    console.error('Mahjong bootstrap failed',error);
    root.innerHTML='<main class="loading" role="alert">対局エンジンを読み込めませんでした。ページを再読み込みしてください。</main>';
  }
}
