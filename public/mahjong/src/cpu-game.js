import { characters, getCharacter } from './characters.js';

/** Browser bridge contract (no rules implemented here):
 * createMatch({players, seed, now}), legalActions(match, seat),
 * applyAction(match, seat, action, expectedRevision, now), advanceTurn(match, now),
 * chooseAction(match, seat, random), view(match, 0).
 * All may return promises. view returns { phase, revision, activeSeat, round,
 * dealer, players:[{name,points,handCount,hand?,discards}], legalActions, result? }.
 * Only seat 0 is human. Actions are opaque engine objects with type and tile?;
 * the adapter forwards an exact legal object, never computes scores or wins.
 */
let configuredEngine;
export function configureCpuEngine(engine) { configuredEngine = engine; }
function seededRandom(seed){
  let value=2166136261;
  if(typeof seed==='number'&&Number.isFinite(seed))value=seed>>>0;
  else for(const char of String(seed)){value^=char.codePointAt(0);value=Math.imul(value,16777619)>>>0;}
  if(value===0)value=0x6d2b79f5;
  return()=>{
    value=(value+0x6d2b79f5)>>>0;
    let result=value;
    result=Math.imul(result^result>>>15,result|1);
    result^=result+Math.imul(result^result>>>7,result|61);
    return((result^result>>>14)>>>0)/4294967296;
  };
}
export function createCpuGame(suppliedEngine) {
  let match = null, currentView = null, random = Math.random;
  const engine = () => {
    const api = suppliedEngine || configuredEngine;
    if (!api) throw new Error('対局エンジンは接続の準備中です。');
    for (const key of ['createMatch', 'legalActions', 'applyAction', 'advanceTurn', 'chooseAction', 'view']) {
      if (typeof api[key] !== 'function') throw new Error(`対局エンジンの接続を確認してください (${key})。`);
    }
    return api;
  };
  async function settle(api) {
    for (let step = 0; step < 500; step++) {
      currentView = await api.view(match, 0);
      if (['HAND_RESULT','MATCH_RESULT'].includes(currentView.phase) || (await api.legalActions(match, 0)).length) return currentView;
      let acted = false;
      for (let seat = 1; seat < 4; seat++) {
        if (!(await api.legalActions(match, seat)).length) continue;
        const action = await api.chooseAction(match, seat, random);
        match = await api.applyAction(match, seat, action, match.revision, Date.now());
        acted = true; break;
      }
      if (!acted) {
        const before = match.revision;
        match = await api.advanceTurn(match, Date.now());
        if (match.revision === before) { currentView = await api.view(match, 0); return currentView; }
      }
    }
    throw new Error('対局の進行を確認できませんでした。もう一度お試しください。');
  }
  return {
    async startCpuMatch(characterId, seed = Date.now()) {
      const api = engine(), chosen = getCharacter(characterId);
      if (!chosen) throw new Error('キャラクターを選択してください。');
      random=seededRandom(seed);
      const ordered = [chosen, ...characters.filter(c => c.id !== characterId)];
      match = await api.createMatch({ players: ordered.map((c, seat) => ({ id: c.id, name: c.name, characterId: c.id, isCpu: seat !== 0 })), seed, now: Date.now() });
      return settle(api);
    },
    async dispatchCpuAction(action) {
      const api = engine();
      if (!match) throw new Error('対局を開始してください。');
      const legal = await api.legalActions(match, 0);
      const canonical = legal.find(candidate => JSON.stringify(candidate) === JSON.stringify(action));
      if (!canonical) throw new Error('現在の合法な操作を選んでください。');
      match = await api.applyAction(match, 0, canonical, match.revision, Date.now());
      return settle(api);
    },
    async continueMatch() {
      const api=engine();if(!match||match.phase!=='HAND_RESULT')throw new Error('局の結果を確認してから次へ進んでください。');
      match=await api.advanceTurn(match,Date.now());return settle(api);
    },
    getView: () => currentView
  };
}
const defaultGame = createCpuGame();
export const startCpuMatch = (...args) => defaultGame.startCpuMatch(...args);
export const dispatchCpuAction = (...args) => defaultGame.dispatchCpuAction(...args);
