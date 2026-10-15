import {updateCpuNotice} from './cpu.js';
import {eventScreen,updateEventScreen} from './events/screen.js';
import {$,el,button,modal,toast,title} from './dom.js';
import {Realtime,api} from './realtime.js';
import {home,setup,joinScreen} from './home.js';
import {lobby,updateLobby} from './lobby.js';
import {game,updateGame,confirmAction} from './game.js';
import {finalScreen} from './final.js';
const transport=new Realtime();let catalog={categories:{},values:{}},session=null,state=null,key='',offset=0,connection='home';
let catalogPromise=null;
function loadCatalog(){catalogPromise||=api('/api/catalog').catch(error=>{catalogPromise=null;throw error;});return catalogPromise;}
const drafts=new Map();let bonusDestroy=null,bonusGeneration=0;
function closeBonus(){bonusGeneration++;bonusDestroy?.();bonusDestroy=null;}
async function showBonus(){closeBonus();const generation=bonusGeneration;clearCpuPending();clearPending();transport.stop();state=null;session=null;key='';connection='home';const query=new URLSearchParams(location.search);query.delete('room');query.set('bonus','jackpot');history.replaceState(null,'',`/?${query}`);updateConnection();replace(title('SOLO BONUS','台を準備しています。'));try{const {mountBonus}=await import('./bonus/screen.js');if(generation!==bonusGeneration)return;const mounted=mountBonus({onBack:showHome});bonusDestroy=mounted.destroy;replace(mounted.node);}catch{if(generation!==bonusGeneration)return;replace(title('SOLO BONUS','台を読み込めませんでした。','通信を確認して、もう一度お試しください。'));$('#main').append(button('ホームへ戻る',showHome));}}
function stored(code){try{return JSON.parse(localStorage.getItem(`unity-mix:${code}`));}catch{return null;}}
function remember(s){localStorage.setItem(`unity-mix:${s.code}`,JSON.stringify(s));localStorage.setItem('unity-mix:last',s.code);}
function clearSession(){if(session){localStorage.removeItem(`unity-mix:${session.code}`);if(localStorage.getItem('unity-mix:last')===session.code)localStorage.removeItem('unity-mix:last');}session=null;}
const savedDraft=(id)=>{if(!drafts.has(id)){let value={};try{value=JSON.parse(sessionStorage.getItem(`mix-draft:${id}`))||{};}catch{}drafts.set(id,value);}return drafts.get(id);};
function saveDrafts(){for(const [id,draft]of drafts)try{sessionStorage.setItem(`mix-draft:${id}`,JSON.stringify(draft));}catch{}}
function clearDrafts(){for(const id of drafts.keys())sessionStorage.removeItem(`mix-draft:${id}`);drafts.clear();}
let pendingEvent=null,pendingTimer=null,pendingCpu=null,cpuTimer=null;
function cpuBusy(){for(const b of document.querySelectorAll('.cpu-controls button'))b.disabled=true;}
function clearCpuPending(){pendingCpu=null;clearTimeout(cpuTimer);if(state?.phase==='LOBBY')updateLobby(state);}
function eventPending(value,message=''){
 document.body.classList.toggle('event-pending',value);
 const status=document.querySelector('#event-send-status');if(status)status.textContent=message;
 for(const b of document.querySelectorAll('.event-screen button')){
  if(value){if(b.dataset.pendingDisabled===undefined)b.dataset.pendingDisabled=String(b.disabled);b.disabled=true;}
  else if(b.dataset.pendingDisabled!==undefined){b.disabled=b.dataset.pendingDisabled==='true';delete b.dataset.pendingDisabled;}
 }
}
function clearPending(message=''){pendingEvent=null;clearTimeout(pendingTimer);eventPending(false,message);}
function send(action,data={}){
 const eventAction=action.startsWith('event_'),cpuAction=action.startsWith('cpu_');if((eventAction&&pendingEvent)||(cpuAction&&pendingCpu))return;
 if(eventAction&&state?.event)data={roundId:state.event.roundId,revision:state.event.revision,...data};
 const requestId=transport.send(action,data);
 if(requestId){if(cpuAction){pendingCpu=requestId;cpuBusy();cpuTimer=setTimeout(()=>{clearCpuPending();toast('受理を確認できません。再接続して人数を確認してください。');transport.connect(session);},8000);}if(action==='answer'||eventAction)saveDrafts();if(eventAction){pendingEvent=requestId;eventPending(true,'送信中…サーバーの受理を確認しています。');pendingTimer=setTimeout(()=>{clearPending('受理を確認できません。再接続して現在の状態を確認してください。');transport.connect(session);},8000);}}
 else toast('未送信です。再接続後に操作してください。');
}
function replace(node){$('#main').replaceChildren(node);window.scrollTo({top:0,behavior:'instant'});}
async function connect(s){closeBonus();const generation=bonusGeneration;remember(s);try{catalog=await loadCatalog();}catch{if(generation===bonusGeneration)toast('ゲーム設定を読み込めません。通信を確認して、ルームへ戻ってください。');return;}if(generation!==bonusGeneration)return;clearCpuPending();session=s;remember(s);history.replaceState(null,'',`/?room=${s.code}`);key='';state=null;replace(title('JOINING THE ROOM','会話の輪につなぎます。','参加情報を確認しています。'));transport.connect(s);}
async function create(name,settings){const generation=bonusGeneration;try{const created=await api('/api/rooms',{name,settings});remember(created);if(generation===bonusGeneration)await connect(created);}catch(e){if(generation===bonusGeneration)toast(e.message);}}
async function join(code,name){const generation=bonusGeneration;try{const joined=stored(code)||await api(`/api/rooms/${code}/join`,{name});remember(joined);if(generation===bonusGeneration)await connect(joined);}catch(e){if(generation===bonusGeneration)toast(e.message);}}
function showHome(){closeBonus();clearCpuPending();transport.stop();state=null;session=null;key='';connection='home';history.replaceState(null,'','/');const last=localStorage.getItem('unity-mix:last'),saved=last?stored(last):null;replace(home({create:()=>showSetup(),join:()=>showJoin(),session:saved,resume:()=>connect(saved),bonus:showBonus}));updateConnection();}
async function showSetup(){closeBonus();const generation=bonusGeneration;try{catalog=await loadCatalog();if(generation!==bonusGeneration)return;replace(setup({catalog,submit:create,back:showHome}));}catch{if(generation===bonusGeneration)toast('ルーム設定を読み込めません。通信を確認してください。');}}
function showJoin(code=''){closeBonus();replace(joinScreen({code,submit:join,back:showHome}));}
function leave(){confirmAction('このルームから退出しますか？','ゲーム中の未回答はパスになります。ホストが退出した場合は、接続中の参加者が引き継ぎます。',()=>{transport.send('leave');transport.stop();clearDrafts();clearSession();showHome();});}
function updateConnection(){const n=$('#connection');const labels={home:'PLAY TO CONNECT',connecting:'接続を確認中',online:`ROOM ${session?.code||''} · 接続中`,offline:'再接続しています',expired:'ルーム終了','other-tab':'別タブで接続中'};n.textContent=labels[connection]||labels.home;n.className=`connection ${connection}`;let banner=$('#connection-banner');if(['offline','other-tab'].includes(connection)){if(!banner){banner=el('div','connection-banner');banner.id='connection-banner';document.body.insertBefore(banner,$('#main'));}banner.replaceChildren(el('p','',connection==='offline'?'通信が途切れました。回答内容を保ったまま再接続しています。':'この参加情報は別のタブで使用中です。'),button('再接続',()=>transport.connect(session),'quiet-button'));}else banner?.remove();document.body.classList.toggle('disconnected',['offline','connecting','other-tab'].includes(connection));}
function render(s){state=s;offset=s.serverTime-Date.now();const self=s.players.find(p=>p.id===s.selfId);const nextKey=[s.code,s.phase,s.round?.id,!!s.round?.ownAnswer,s.hostId===s.selfId,s.paused,s.phase==='LOBBY'?JSON.stringify(s.settings):'',self?.ready,s.event?.phase,s.event?.roundId,s.event?.revision,!!s.event?.ownAnswer,!!s.event?.guess?.ownVote,s.event?.team?.captainId,s.event?.team?.captainId!==s.selfId?JSON.stringify(s.event?.team?.draft):''].join('|');if(nextKey!==key){key=nextKey;const props={state:s,send:(action,data={})=>send(action,action.startsWith('event_')?{roundId:s.event?.roundId,revision:s.event?.revision,...data}:data),catalog,leave,draft:s.event?savedDraft(s.event.roundId):s.round?savedDraft(s.round.id):{}};replace(s.event?eventScreen(props):s.phase==='LOBBY'?lobby(props):s.phase==='FINAL'?finalScreen(props):game(props));if(s.phase==='FINAL')clearDrafts();}if(s.event)updateEventScreen(s,offset);else if(s.phase==='LOBBY')updateLobby(s);else if(s.round)updateGame(s,offset);let notice=$('#room-notice');if(s.notice||s.hostOffline){if(!notice){notice=el('div','room-notice');notice.id='room-notice';$('#main').prepend(notice);}notice.textContent=s.hostOffline?'ホストの復帰を待っています。約12秒後、接続中の参加者が引き継ぎます。':s.notice;}else notice?.remove();updateCpuNotice(s);if(pendingCpu)cpuBusy();}
transport.addEventListener('ack',e=>{if(e.detail.requestId===pendingCpu)clearCpuPending();if(e.detail.requestId===pendingEvent)clearPending('操作を受理しました。');});
transport.addEventListener('state',e=>{render(e.detail);if(pendingEvent)eventPending(true,'送信中…');});transport.addEventListener('connection',e=>{connection=e.detail;if(connection!=='online')clearCpuPending();if(connection!=='online')clearPending('通信不良です。受理状況は再接続後に確認できます。');updateConnection();});transport.addEventListener('error',e=>{if(pendingCpu&&(!e.detail.requestId||e.detail.requestId===pendingCpu))clearCpuPending();if(pendingEvent&&(!e.detail.requestId||e.detail.requestId===pendingEvent))clearPending('操作は受理されませんでした。');toast(e.detail.message);if(['BAD_SESSION','ROOM_NOT_FOUND','EXPIRED'].includes(e.detail.code)){const code=session?.code;clearSession();key='';replace(title('ROOM NOT FOUND','このルームは終了したようです。',e.detail.message));$('#main').append(button('ホームへ戻る →',showHome));if(code)$('#main').append(button('コードを入力して参加',()=>showJoin(code),'button secondary'));}});
document.body.classList.toggle('reduce-motion',localStorage.getItem('mix-reduce-motion')==='true');
document.addEventListener('input',()=>saveDrafts());
setInterval(()=>{if(state?.event)updateEventScreen(state,offset);if(state?.phase==='COUNTDOWN'&&!state.paused)updateGame(state,offset);},100);
window.addEventListener('pagehide',saveDrafts);window.addEventListener('online',()=>{if(session&&connection!=='online')transport.connect(session);});
$('#close-modal').addEventListener('click',()=>$('#modal').close());$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))$('#modal').close();});
$('#help-button').addEventListener('click',()=>{if(bonusDestroy){modal('琥珀の三段塔の遊び方',el('p','','強さを調整して発射し、釘を抜けて3段の金色の穴を狙います。最下段の突破で10,000点。残り玉と動いている玉が0になると終了。画面を離れると一時停止します。'));return;}if(state?.event){modal('イベントゲームの遊び方',el('p','',state.event.rule),el('p','','説明→回答・対面相談→締切→公開→会話→次のラウンド。短文・体験談では、予想締切と正解公開を分けます。スキップは自由です。'));return;}const steps=el('ol','help-steps');['ホストがルームをつくり、QRか4桁コードで招待。','名前を入れて「準備できた」を押します。2人以上でスタート。','自分の答えを秘密で選びます。パスもOK。','全員の回答後、3・2・1で結果を公開。','画面を少し置いて、選んだ理由を話そう。','最後はOUR MIX / YOUR MIX。画像にして持ち帰れます。'].forEach(t=>steps.append(el('li','',t)));modal('遊び方 / Play to connect',steps);});
$('#privacy-button').addEventListener('click',()=>modal('回答とプライバシー',el('p','','公開前の回答は本人だけに表示されます。回答人数と、回答済みかどうかはルーム内で共有します。'),el('p','','二択・PREDICT・Quick Mixの入力は、公開時に名前と一緒に共有します。LINEの位置は匿名。RANKとAUCTIONの個人回答は本人だけ、ルームには平均を表示します。'),el('p','','YOUR MIXは本人だけに送ります。共有画像には名前や個々の回答を含めません。ルーム情報は未使用24時間、終了後1時間で削除対象になります。端末に残す参加情報は復帰用IDです。回答の下書きはこのタブのセッション内だけに保存します。'),el('p','','イベントゲームの匿名予想は正解公開時に現在の一件だけ回答者名を公開します。カフェの下書きは同チームに共有。共通点とカフェの確定案は締切後にチーム名と公開します。司会が非表示にした内容は以降の配信から除きます。'),el('p','small muted','アカウント不要・解析トラッキングなし。参加コードを知っている人は同じルームに参加できます。話したくない質問は、いつでもパスしてください。')));
const standaloneBonus=new URL(location.href).searchParams.get('bonus')==='jackpot';if(standaloneBonus)await showBonus();
try{catalog=await loadCatalog();if(catalog.hosting?.ephemeral){const note=el('aside','storage-note small muted','一時ルームの公開版です。サーバーの再起動時は、新しいルームを作ってください。');document.body.insertBefore(note,$('#main'));}const code=new URL(location.href).searchParams.get('room');if(standaloneBonus){}else if(code&&/^\d{4}$/.test(code)){const saved=stored(code);saved?connect(saved):showJoin(code);}else showHome();}catch{if(!standaloneBonus){replace(title('CONNECTING','サーバーにつながりませんでした。','通信を確認して、ページを再読み込みしてください。'));$('#main').append(button('再読み込み',()=>location.reload()),button('大穴チャレンジで遊ぶ',showBonus,'button secondary'));}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
