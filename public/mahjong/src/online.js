const SESSION_KEY = 'unity-mahjong-session';

/** Server-authoritative Mahjong transport. Commands resolve only on their own ack. */
export function createOnlineGame({
  fetchImpl = globalThis.fetch, WebSocketImpl = globalThis.WebSocket,
  storage = globalThis.localStorage, locationImpl = globalThis.location,
  onState = () => {}, onConnection = () => {}, onError = () => {}
} = {}) {
  let state = null, status = 'idle', session = null, socket = null;
  let retryTimer = null, retries = 0, stopped = false;
  const pending = new Map();
  const connection = value => { status = value; onConnection(value); };
  const surface = error => { onError(error); return error; };
  const rejectPending = error => {
    for (const {reject} of pending.values()) reject(error);
    pending.clear();
  };
  const deliver = value => { state = value; onState(value); };
  function detach() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    const old = socket; socket = null;
    if (old) { old.onopen = old.onmessage = old.onclose = old.onerror = null; old.close(); }
  }
  function retry() {
    if (stopped || retryTimer !== null) return;
    connection('reconnecting');
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, Math.min(500 * 2 ** Math.min(retries++, 5), 10000));
  }
  function connect() {
    connection('connecting');
    let ws;
    try {
      ws = new WebSocketImpl(`${locationImpl.protocol === 'https:' ? 'wss:' : 'ws:'}//${locationImpl.host}/mahjong-ws`);
    } catch (error) { surface(error); retry(); return; }
    socket = ws;
    const active = () => !stopped && socket === ws;
    ws.onopen = () => {
      if (!active()) return;
      connection('authenticating');
      ws.send(JSON.stringify({action:'auth',code:session.code,token:session.token}));
    };
    ws.onmessage = event => {
      if (!active()) return;
      let message;
      try { message = JSON.parse(event.data); }
      catch { surface(new Error('サーバーからの応答を確認できません。')); return; }
      if (!message || typeof message !== 'object') return;
      if (message.type === 'state') deliver(message.state);
      if (message.type === 'ack') {
        if (message.action === 'auth') { retries = 0; connection('connected'); }
        const command = pending.get(message.actionId);
        if (command) { pending.delete(message.actionId); command.resolve(message); }
      }
      if (message.type === 'error') {
        if (message.state) deliver(message.state);
        const error = Object.assign(new Error(message.message || '操作を完了できません。'), {code:message.code});
        const command = pending.get(message.actionId);
        if (command) { pending.delete(message.actionId); command.reject(error); }
        surface(error);
      }
    };
    ws.onerror = () => { if (active()) surface(new Error('接続でエラーが発生しました。')); };
    ws.onclose = event => {
      if (!active()) return;
      socket = null;
      if(event.code===4005){connection('idle');return;}
      const error = surface(new Error('接続が切れました。最新の状態を確認してください。'));
      rejectPending(error);
      if ([4001,4003,4004].includes(event.code)) { connection('error'); return; }
      retry();
    };
  }
  async function enter(path, name) {
    try {
      const response = await fetchImpl(path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
      const body = await response.json();
      if (!response.ok) throw Object.assign(new Error(body.message || 'ルームに接続できません。'), {code:body.error});
      detach(); rejectPending(new Error('ルームの接続を変更しました。'));
      session = {code:body.code,token:body.token,seat:body.seat};
      try { storage?.setItem(SESSION_KEY, JSON.stringify(session)); }
      catch { surface(new Error('このブラウザーでは再読み込み後の復帰情報を保存できません。接続は続けます。')); }
      state = null; stopped = false; retries = 0; connect();
      return {...session};
    } catch (error) { throw surface(error); }
  }
  function send(action, fields = {}) {
    if (status !== 'connected' || socket?.readyState !== 1 || !Number.isInteger(state?.revision)) {
      throw surface(new Error('接続と最新の状態を確認してください。'));
    }
    const actionId = globalThis.crypto.randomUUID();
    const payload = {...fields,action,actionId,expectedRevision:state.revision};
    return new Promise((resolve, reject) => {
      pending.set(actionId, {resolve,reject});
      try { socket.send(JSON.stringify(payload)); }
      catch (error) { pending.delete(actionId); reject(surface(error)); }
    });
  }
  return {
    createRoom: name => enter('/api/mahjong/rooms', name),
    joinRoom: (code, name) => enter(`/api/mahjong/rooms/${encodeURIComponent(code)}/join`, name),
    resume() {
      let saved;
      try { saved = JSON.parse(storage?.getItem(SESSION_KEY) || 'null'); }
      catch (error) { surface(error); return false; }
      if (!saved || typeof saved.code !== 'string' || typeof saved.token !== 'string' || !Number.isInteger(saved.seat) || saved.seat < 0 || saved.seat > 3) return false;
      detach(); rejectPending(new Error('接続を再開します。'));
      session = {code:saved.code,token:saved.token,seat:saved.seat};
      state = null; stopped = false; retries = 0; connect(); return true;
    },
    send,
    setReady: ready => send('ready', {ready:!!ready}),
    start: () => send('start'),
    async leaveRoom() {
      const result=await send('leave');
      session=null;state=null;stopped=true;detach();
      try { storage?.removeItem(SESSION_KEY); } catch { surface(new Error('復帰情報を消去できませんでした。')); }
      connection('idle');return result;
    },
    stop() { stopped = true; detach(); rejectPending(new Error('接続を停止しました。')); connection('stopped'); },
    get state() { return state; },
    get status() { return status; },
    get session() { return session && {...session}; }
  };
}
