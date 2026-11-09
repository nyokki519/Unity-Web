import test from 'node:test';
import assert from 'node:assert/strict';

const load = async () => (await import('../public/mahjong/src/online.js')).createOnlineGame;
function harness(create, overrides = {}) {
  const sockets = [], requests = [], states = [], connections = [], errors = [];
  const values = new Map();
  class Socket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    send(data) { this.sent.push(JSON.parse(data)); }
    open() { this.readyState = 1; this.onopen?.({}); }
    message(data) { this.onmessage?.({data: JSON.stringify(data)}); }
    close(code = 1000) { this.readyState = 3; this.onclose?.({code}); }
  }
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key)};
  const options = {fetchImpl: async (path, init) => { requests.push({path,init}); return {ok:true,json:async () => ({code:'0123',token:'secret',seat:0,private:'discard'})}; }, WebSocketImpl:Socket, storage, locationImpl:{protocol:'https:',host:'game.example:443'}, onState: state => states.push(state), onConnection: status => connections.push(status), onError: error => errors.push(error), ...overrides};
  return {game:create(options), options, sockets, requests, states, connections, errors, storage, values};
}
async function connected(create) {
  const h = harness(create); await h.game.createRoom('Alice'); const socket = h.sockets[0]; socket.open();
  socket.message({type:'state',state:{revision:4,phase:'LOBBY',players:[]}});
  socket.message({type:'ack',action:'auth'}); return {...h,socket};
}

// Wrong route, credentials, or persistence of private room state must fail here.
test('create and join POST names, authenticate on same-origin socket, and persist only seat credentials', async t => {
  const create = await load(); const h = harness(create); t.after(() => h.game.stop());
  assert.deepEqual(await h.game.createRoom('Alice'), {code:'0123',token:'secret',seat:0});
  assert.equal(h.requests[0].path, '/api/mahjong/rooms');
  assert.equal(h.requests[0].init.method, 'POST');
  assert.equal(h.requests[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(h.requests[0].init.body), {name:'Alice'});
  assert.equal(h.sockets[0].url, 'wss://game.example:443/mahjong-ws'); h.sockets[0].open();
  assert.deepEqual(h.sockets[0].sent, [{action:'auth',code:'0123',token:'secret'}]);
  h.sockets[0].message({type:'state',state:{revision:0,hand:['private']}});
  assert.deepEqual(h.states, [{revision:0,hand:['private']}]); assert.equal(h.game.state.revision,0);
  assert.deepEqual([...h.values.values()].map(JSON.parse), [{code:'0123',token:'secret',seat:0}]);
  await h.game.joinRoom('4321', 'Bob');
  assert.equal(h.requests[1].path, '/api/mahjong/rooms/4321/join');
  assert.deepEqual(JSON.parse(h.requests[1].init.body), {name:'Bob'});
  assert.equal(h.sockets[0].readyState,3);
});

// Resolving on send or any state update falsely reports successful play.
test('commands use current revision and fresh UUIDs, and await their own acknowledgment', async t => {
  const h = await connected(await load()); t.after(() => h.game.stop());
  let settled = false; const action = h.game.send('discard',{tile:'m1',actionId:'forged',expectedRevision:99}); action.then(() => {settled=true;});
  const wire = h.socket.sent[1];
  assert.equal(wire.action,'discard'); assert.equal(wire.tile,'m1'); assert.equal(wire.expectedRevision,4);
  assert.match(wire.actionId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  h.socket.message({type:'state',state:{revision:5}}); await Promise.resolve(); assert.equal(settled,false);
  h.socket.message({type:'ack',actionId:'other',revision:5}); await Promise.resolve(); assert.equal(settled,false);
  h.socket.message({type:'ack',actionId:wire.actionId,revision:5}); assert.equal((await action).revision,5);
  const ready = h.game.setReady(true); const readyWire = h.socket.sent[2]; assert.equal(readyWire.action,'ready'); assert.equal(readyWire.ready,true); assert.equal(readyWire.expectedRevision,5); assert.notEqual(readyWire.actionId,wire.actionId);
  h.socket.message({type:'ack',actionId:readyWire.actionId}); await ready;
  const start = h.game.start(); assert.equal(h.socket.sent[3].action,'start'); h.socket.message({type:'ack',actionId:h.socket.sent[3].actionId}); await start;
});

test('stale errors reject pending play, remain observable, and deliver authoritative state', async t => {
  const h = await connected(await load()); t.after(() => h.game.stop());
  const command = h.game.send('pass'); const rejected = assert.rejects(command, error => error.code==='STALE_STATE' && error.message==='最新の状態を確認');
  h.socket.message({type:'error',code:'STALE_STATE',actionId:h.socket.sent[1].actionId,message:'最新の状態を確認',state:{revision:9}});
  await rejected; assert.equal(h.game.state.revision,9); assert.equal(h.states.at(-1).revision,9); assert.equal(h.errors.at(-1).message,'最新の状態を確認');
  const next = h.game.send('pass'); assert.equal(h.socket.sent[2].expectedRevision,9); h.socket.message({type:'ack',actionId:h.socket.sent[2].actionId}); await next;
});

test('HTTP errors surface without opening a socket or storing credentials', async () => {
  const h = harness(await load(), {fetchImpl:async () => ({ok:false,json:async () => ({error:'ROOM_FULL',message:'満員です'})})});
  await assert.rejects(h.game.joinRoom('1111','A'), error => error.code==='ROOM_FULL' && error.message==='満員です');
  assert.equal(h.errors.at(-1).code,'ROOM_FULL'); assert.equal(h.sockets.length,0); assert.equal(h.values.size,0);
});

test('storage denial does not strand a created room before WebSocket connect',async t=>{const create=await load(),h=harness(create,{storage:{getItem:()=>null,setItem(){throw new Error('denied')},removeItem(){}}});t.after(()=>h.game.stop());assert.deepEqual(await h.game.createRoom('A'),{code:'0123',token:'secret',seat:0});assert.equal(h.sockets.length,1);assert.ok(h.errors.at(-1).message.includes('接続は続けます'));});

test('resume restores persisted seat credentials over ws without another HTTP request', async t => {
  const create = await load(); const first = harness(create); await first.game.createRoom('A'); first.game.stop();
  const h = harness(create,{storage:first.storage,locationImpl:{protocol:'http:',host:'localhost:3000'}}); t.after(() => h.game.stop());
  assert.equal(h.game.resume(),true); assert.equal(h.requests.length,0); assert.equal(h.sockets[0].url,'ws://localhost:3000/mahjong-ws'); h.sockets[0].open();
  assert.deepEqual(h.sockets[0].sent[0],{action:'auth',code:'0123',token:'secret'}); assert.equal(h.game.session.seat,0);
  const empty = harness(create); assert.equal(empty.game.resume(),false);
});

test('leave room waits for its own acknowledgment then forgets credentials and disconnects',async t=>{const h=await connected(await load());t.after(()=>h.game.stop());const leave=h.game.leaveRoom(),wire=h.socket.sent.at(-1);assert.equal(wire.action,'leave');h.socket.message({type:'ack',actionId:wire.actionId,revision:5});assert.equal((await leave).revision,5);assert.equal(h.game.session,null);assert.equal(h.game.state,null);assert.equal(h.values.size,0);assert.equal(h.game.status,'idle');assert.equal(h.socket.readyState,3);});

test('disconnect rejects uncertain pending action and retries exponentially with bounded delay and same token', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const h = await connected(await load()); t.after(() => h.game.stop());
  const command = h.game.send('pass'); const rejected = assert.rejects(command,/接続/); h.socket.close(1006); await rejected;
  assert.equal(h.game.status,'reconnecting');
  for (const delay of [500,1000,2000,4000,8000,10000,10000]) {
    const count = h.sockets.length; t.mock.timers.tick(delay-1); assert.equal(h.sockets.length,count);
    t.mock.timers.tick(1); assert.equal(h.sockets.length,count+1); const socket = h.sockets.at(-1); socket.open();
    assert.deepEqual(socket.sent[0],{action:'auth',code:'0123',token:'secret'}); socket.close(1006);
  }
});

test('stop cancels reconnect, closes socket, rejects pending actions and ignores late events', async t => {
  t.mock.timers.enable({apis:['setTimeout']}); const h = await connected(await load());
  const command = h.game.send('pass'); const rejected = assert.rejects(command,/停止/); h.game.stop(); await rejected;
  assert.equal(h.socket.readyState,3); assert.equal(h.game.status,'stopped');
  h.socket.message({type:'state',state:{revision:100}}); assert.equal(h.game.state.revision,4);
  t.mock.timers.tick(60000); assert.equal(h.sockets.length,1);
  assert.throws(() => h.game.send('pass'), /接続/);
  const other = await connected(await load()); other.socket.close(1006); other.game.stop(); t.mock.timers.tick(60000); assert.equal(other.sockets.length,1);
});

// Retrying a superseded tab would repeatedly evict the active session.
test('superseded or expired sessions stop retrying and surface a terminal connection error', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  for (const code of [4001,4003,4004]) {
    const h = await connected(await load()); h.socket.close(code);
    assert.equal(h.game.status,'error'); assert.ok(h.errors.length);
    t.mock.timers.tick(60000); assert.equal(h.sockets.length,1); h.game.stop();
  }
});
