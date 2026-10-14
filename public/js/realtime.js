export class Realtime extends EventTarget {
  constructor(){super();this.socket=null;this.retry=0;this.stopped=true;this.timer=null;}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  connect(session){this.stop();this.session=session;this.stopped=false;this.retry=0;this.open();}
  open(){
    if(this.stopped)return;
    this.emit('connection','connecting');
    const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);this.socket=socket;
    socket.addEventListener('open',()=>socket.send(JSON.stringify({action:'auth',...this.session})));
    socket.addEventListener('message',event=>{
      if(this.socket!==socket||this.stopped)return;
      let msg;try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.type==='state'){this.retry=0;this.emit('connection','online');this.emit('state',msg.state);}
      if(msg.type==='error'){this.emit('error',msg);if(['ROOM_NOT_FOUND','BAD_SESSION','EXPIRED'].includes(msg.code)){this.stopped=true;socket.close();this.emit('connection','expired');}}
      if(msg.type==='ack')this.emit('ack',msg);
    });
    socket.addEventListener('error',()=>{});
    socket.addEventListener('close',event=>{
      if(this.socket!==socket||this.stopped)return;
      if(event.code===4001){this.stopped=true;this.emit('connection','other-tab');this.emit('error',{code:'OTHER_TAB',message:'同じ参加情報で別のタブが開かれました。このタブを使う場合は「再接続」を押してください。'});return;}
      this.emit('connection','offline');
      this.timer=setTimeout(()=>this.open(),Math.min(8000,700*2**this.retry++)+Math.random()*300);
    });
  }
  send(action,data={}){if(!this.socket||this.socket.readyState!==WebSocket.OPEN){this.emit('error',{code:'OFFLINE',message:'接続を確認しています。回答は送信されていません。再接続後に送ってください。'});return false;}const requestId=crypto.randomUUID?.()||String(Date.now());this.socket.send(JSON.stringify({action,requestId,...data}));return requestId;}
  stop(){this.stopped=true;clearTimeout(this.timer);if(this.socket){const s=this.socket;this.socket=null;s.close();}}
}
export async function api(path,data){const res=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});const result=await res.json();if(!res.ok)throw new Error(result.message||'うまく接続できませんでした。もう一度お試しください。');return result;}
