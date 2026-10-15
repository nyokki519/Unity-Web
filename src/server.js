import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve,extname,sep } from 'node:path';
import { WebSocketServer,WebSocket } from 'ws';
import QRCode from 'qrcode';
import {games} from './events/catalog.js';
import { GameEngine,GameError } from './engine.js';
import { RoomStore } from './store.js';
import { catalog,questions } from './questions.js';

const ERROR_TEXT={STALE_STATE:'画面が更新されました。現在の画面から操作してください。',SELF_VOTE:'自分の回答には投票できません。',CAPTAIN_ONLY:'この操作はチーム代表だけができます。',ALREADY_VOTED:'予想は受理済みです。',BUDGET_EXCEEDED:'予算を超えています。案を見直してください。',ROOM_NOT_FOUND:'このルームは見つかりません。コードを確認するか、新しいルームを作ってください。',BAD_NAME:'名前を1〜20文字で入力してください。',ROOM_FULL:'このルームは定員（24人）に達しました。',BAD_SESSION:'参加情報が見つかりません。名前を入力して参加し直してください。',BAD_SETTINGS:'設定を確認してください。',EMPTY_POOL:'このモード・深さ・カテゴリの組合せにはお題がありません。カテゴリを広げてください。',SERVER_FULL:'ただいまルームを作れません。少し待ってからお試しください。',HOST_ONLY:'この操作はホストだけができます。',WAIT_ANSWERS:'まだ回答していない人がいます。全員の回答を待ってください。',NEED_PLAYERS:'準備できた参加者が2人以上必要です。',NOT_READY:'全員の準備ができてからスタートしてください。',ALREADY_ANSWERED:'このお題の回答は、すでに受け付けています。',STALE_ROUND:'お題が変わりました。現在のお題に回答してください。',INVALID_ANSWER:'回答を確認してください。配分は合計100、順位は全項目が必要です。',SPECTATING:'次のお題から参加できます。',NOT_ANSWERING:'今は回答を受け付けていません。',NOT_LOBBY:'この操作は待合室で行ってください。',NOT_TALK:'結果公開のあとに次へ進めます。',BAD_PHASE:'今はこの操作を行えません。',BAD_COMMAND:'操作を確認して、もう一度お試しください。',RATE_LIMIT:'操作が続いています。少し待ってからお試しください。',EXPIRED:'このルームは終了しました。',SERVER_ERROR:'うまくつながりませんでした。少し待って、もう一度お試しください。'};
export function createApp({database=process.env.DATA_PATH||resolve('.data/rooms.sqlite'),countdownMs=3000,hostGraceMs=12000}={}) {
  const root=resolve(fileURLToPath(new URL('../public/',import.meta.url)));
  const store=new RoomStore(database),engine=new GameEngine(store,{countdownMs,hostGraceMs});
  const sockets=new Map(),limits=new Map();let shuttingDown=false;
  const publicUrl=(process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL)?.replace(/\/$/,'');
  if(publicUrl && !/^https?:\/\/[^\s]+$/.test(publicUrl)) throw new Error('PUBLIC_URL must be an HTTP(S) URL');
  const rate=(key,max,window=60000)=>{const now=Date.now();const item=limits.get(key);if(!item||now-item.at>window){limits.set(key,{at:now,n:1});return true;}return ++item.n<=max;};
  const send=(ws,value)=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>1024*1024){ws.close(1013);return;}ws.send(JSON.stringify(value));}};
  const failResponse=(res,code,status=400)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:code,message:ERROR_TEXT[code]||ERROR_TEXT.SERVER_ERROR}));};
  const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const baseUrl=req=>publicUrl||`http://${req.headers.host}`;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url=new URL(req.url,'http://local');
      if(url.pathname==='/api/health'&&req.method==='GET')return json(res,{status:'ok',product:'UNITY MIX'});
      if(url.pathname==='/api/catalog'&&req.method==='GET')return json(res,{...catalog,eventGames:games,questionCount:questions.length,hosting:{ephemeral:process.env.EPHEMERAL_STORAGE==='true'}});
      if(url.pathname==='/api/qr'&&req.method==='GET') {
        const room=engine.get(url.searchParams.get('room'));
        const target=`${baseUrl(req)}/?room=${room.code}`;
        const svg=await QRCode.toString(target,{type:'svg',margin:2,errorCorrectionLevel:'M',color:{dark:'#383d30',light:'#fcfaf6'}});
        res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'});return res.end(svg);
      }
      if(req.method==='POST'&&(url.pathname==='/api/rooms'||/^\/api\/rooms\/\d{4}\/join$/.test(url.pathname))) {
        const origin=req.headers.origin;
        if(origin && origin!==new URL(baseUrl(req)).origin && origin!==`http://${req.headers.host}` && origin!==`https://${req.headers.host}`)return failResponse(res,'BAD_COMMAND',403);
        const key=req.socket.remoteAddress;
        if(!rate(`http:${key}`,40))return failResponse(res,'RATE_LIMIT',429);
        let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){return failResponse(res,'BAD_COMMAND',413);}}
        let data;try{data=JSON.parse(body);}catch{return failResponse(res,'BAD_COMMAND');}
        const session=url.pathname==='/api/rooms'?engine.create(data.name,data.settings):engine.join(url.pathname.split('/')[3],data.name);
        return json(res,session,201);
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return failResponse(res,'BAD_COMMAND',405);
      const pathname=decodeURIComponent(url.pathname);
      let file=resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
      if(!file.startsWith(root+sep))return failResponse(res,'BAD_COMMAND',403);
      try{const info=await stat(file);if(!info.isFile())throw new Error('not file');}catch{return failResponse(res,'ROOM_NOT_FOUND',404);}
      const data=await readFile(file);
      const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':extname(file)==='.html'||file.endsWith('sw.js')?'no-cache':'public, max-age=3600'});
      res.end(req.method==='HEAD'?undefined:data);
    }catch(error){failResponse(res,error instanceof GameError?error.code:'SERVER_ERROR',error.code==='ROOM_NOT_FOUND'?404:400);}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    const origin=req.headers.origin;
    if(req.url!=='/ws'||(origin&&origin!==new URL(baseUrl(req)).origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)||!rate(`ws:${req.socket.remoteAddress}`,80)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  wss.on('connection',ws=>{
    ws.alive=true;const authTimer=setTimeout(()=>{if(!ws.session)ws.close(4003);},8000);
    ws.on('pong',()=>{ws.alive=true;});
    ws.on('error',()=>{});
    ws.on('message',buffer=>{
      let requestId;
      try {
        const msg=JSON.parse(buffer.toString());
        requestId=typeof msg?.requestId==='string'&&msg.requestId.length<=100?msg.requestId:undefined;
        if(!msg||typeof msg!=='object'||Array.isArray(msg))throw new GameError('BAD_COMMAND');
        if(!ws.session) {
          if(msg.action!=='auth')throw new GameError('BAD_SESSION');
          const {room,player}=engine.authenticate(msg.code,msg.token);
          const key=`${room.code}:${player.id}`;const previous=sockets.get(key);
          sockets.set(key,ws);ws.session={code:room.code,id:player.id,key};
          if(previous&&previous!==ws)previous.close(4001,'Other tab');
          clearTimeout(authTimer);engine.connect(room.code,player.id);
          if(room.phase==='ANSWER'&&!room.paused&&room.settings.autoReveal&&engine.allAnswered(room)){engine.reveal(room);engine.changed(room);}
          send(ws,{type:'ack',action:'auth'});return;
        }
        const s=ws.session;if(!rate(`cmd:${s.key}`,100))throw new GameError('RATE_LIMIT');
        engine.command(s.code,s.id,msg);send(ws,{type:'ack',action:msg.action,requestId:msg.requestId});
        if(msg.action==='leave')ws.close(1000);
      }catch(error){send(ws,{type:'error',requestId,code:error instanceof GameError?error.code:'BAD_COMMAND',message:ERROR_TEXT[error.code]||ERROR_TEXT.BAD_COMMAND});}
    });
    ws.on('close',()=>{clearTimeout(authTimer);const s=ws.session;if(s&&sockets.get(s.key)===ws){sockets.delete(s.key);if(!shuttingDown)engine.disconnect(s.code,s.id);}});
  });
  engine.onChange=room=>{
    for(const ws of sockets.values())if(ws.session.code===room.code){
      if(room.expired){send(ws,{type:'error',code:'EXPIRED',message:ERROR_TEXT.EXPIRED});ws.close(4004);}
      else if(room.players[ws.session.id]?.left){send(ws,{type:'error',code:'BAD_SESSION',message:'司会によって退出されました。'});ws.close(4003);}else send(ws,{type:'state',state:engine.view(room,ws.session.id)});
    }
  };
  const clock=setInterval(()=>engine.tick(),100);clock.unref();
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const [key,v]of limits)if(Date.now()-v.at>120000)limits.delete(key);},20000);heartbeat.unref();
  const close=async()=>{shuttingDown=true;clearInterval(clock);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>server.close(resolve));store.close();};
  return {server,engine,store,close};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const app=createApp();const port=Number(process.env.PORT||3000);
  app.server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`UNITY MIX listening on port ${port}`));
  const shutdown=()=>app.close().then(()=>process.exit(0));process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
