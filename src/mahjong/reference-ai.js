const UNITY_RULE_OVERRIDES = Object.freeze({
  '配給原点':25000,
  '赤牌':{m:1,p:1,s:1},
  'クイタンあり':true,
  '喰い替え許可レベル':0
});

let MajiangAI = null;
let majiangRule = null;
if (typeof window === 'undefined') {
  try {
    const [ai,core]=await Promise.all([import('@kobalab/majiang-ai'),import('@kobalab/majiang-core')]);
    MajiangAI=ai.default;majiangRule=core.default.rule;
  }
  catch { /* Existing Unity policy remains available when the optional adapter is unavailable. */ }
}

export function configureReferenceAI(PlayerClass, ruleFactory = null) {
  MajiangAI = typeof PlayerClass === 'function' ? PlayerClass : null;
  majiangRule=typeof ruleFactory==='function'?ruleFactory:null;
  return !!MajiangAI;
}

function makeReferenceRule(){
  const rule=majiangRule?majiangRule():{'配給原点':25000,'赤牌':{m:1,p:1,s:1},'クイタンあり':true,'喰い替え許可レベル':0};
  Object.assign(rule,UNITY_RULE_OVERRIDES);rule['場数']=1;return rule;
}

function tileCode(tile) {
  if (!Number.isInteger(tile) || tile < 0 || tile > 36) return null;
  const type = tile < 34 ? tile : [4,13,22][tile-34];
  const suit = ['m','p','s','z'][Math.floor(type/9)];
  const rank = type < 27 ? type%9+1 : type-26;
  return suit + (tile >= 34 ? '0' : rank);
}

function meldCode(meld) {
  if (!meld || !Array.isArray(meld.tiles) || !meld.tiles.length) return null;
  const called = meld.open ? meld.tiles.at(-1) : null;
  const ordered = meld.type === 'chi'
    ? [...meld.tiles].sort((a,b)=>(a<34?a:[4,13,22][a-34])-(b<34?b:[4,13,22][b-34]))
    : [...meld.tiles];
  let calledMarked = false;
  const codes = ordered.map(tile => {
    const code = tileCode(tile);
    if (!code) return null;
    if (meld.open && tile === called && !calledMarked) { calledMarked = true; return `${code}+`; }
    return code;
  });
  if (codes.some(code=>!code)) return null;
  const suit = codes[0][0];
  if (codes.some(code=>code[0]!==suit)) return null;
  return codes.join('').replaceAll(suit,'');
}

function concealedNotation(hand) {
  const bySuit = {m:[],p:[],s:[],z:[]};
  for (const tile of hand) {
    const code=tileCode(tile);if(!code)return null;
    bySuit[code[0]].push(code[1]);
  }
  return ['m','p','s','z'].map(suit=>bySuit[suit].length?suit+bySuit[suit].join(''):'').join('');
}

function decreaseVisible(ai, tile) {
  const code=tileCode(tile);if(code)ai._suanpai.decrease(code);
}

/**
 * Ask the pinned Kobalab discard evaluator, then translate its tile back to an
 * exact legal Unity action. Only the acting hand and already-public tiles are
 * included; the hidden wall order and other hands never enter the adapter.
 */
function makeAdvisor(match, seat) {
  const player=match.players[seat];
  if(!player||!Array.isArray(player.hand))return null;
  const ownMelds=(player.melds||[]).map(meldCode);
  if(ownMelds.some(code=>!code))return null;
  const ownHand=concealedNotation(player.hand),dora=match.doraIndicators||[],doraCode=tileCode(dora[0]);
  if(ownHand===null||!doraCode)return null;
  const dealer=Number.isInteger(match.dealer)?match.dealer:0;
  const selfWind=(seat-dealer+4)%4;
  const seatForWind=wind=>(dealer+wind)%4;
  const hands=Array(4).fill('_'.repeat(13));
  hands[selfWind]=`${ownHand}${player.riichi?'*':''}${ownMelds.map(code=>`,${code}`).join('')}`;
  const windPlayers=Array.from({length:4},(_,wind)=>match.players[seatForWind(wind)]);
  const advisor=new MajiangAI();
  advisor.action({kaiju:{id:selfWind,player:['東家','南家','西家','北家'],qijia:0,rule:makeReferenceRule()}});
  advisor.action({qipai:{
    zhuangfeng:Math.max(0,Math.min(3,(match.roundWind||1)-1)),jushu:0,
    changbang:match.honba||0,lizhibang:Math.floor((match.riichiPot||0)/1000),
    defen:windPlayers.map(value=>value?.points||25000),baopai:doraCode,shoupai:hands
  }});
  advisor._suanpai._n_zimo=Math.max(0,Math.min(70,Number(match.liveWall?.length)||0));
  for(let index=1;index<dora.length;index++)decreaseVisible(advisor,dora[index]);
  for(let wind=0;wind<4;wind++){
    const opponent=windPlayers[wind];
    if(wind!==selfWind&&opponent?.riichi)advisor._model.shoupai[wind]._lizhi=true;
    for(const discard of opponent?.discards||[])if(!discard?.called)decreaseVisible(advisor,discard.tile??discard);
    if(wind!==selfWind)for(const meld of opponent?.melds||[])for(const tile of meld.tiles||[])decreaseVisible(advisor,tile);
  }
  return {advisor,selfWind,seatForWind};
}

export function referenceDiscardAction(match, seat, actions) {
  if (!MajiangAI || !Array.isArray(actions) || !actions.length) return null;
  try {
    const {advisor}=makeAdvisor(match,seat)||{};if(!advisor)return null;
    const recommendation=advisor.select_dapai();
    if(typeof recommendation!=='string')return null;
    const parsed=recommendation.match(/^([mpsz])([0-9])_?\*?$/);
    if(!parsed)return null;
    const suit={m:0,p:1,s:2,z:3}[parsed[1]],rank=Number(parsed[2]);
    const referenceTile=rank===0?[34,35,36][suit]:suit<3?suit*9+rank-1:27+rank-1;
    const tileType=tile=>tile>=34?[4,13,22][tile-34]:tile;
    const sameType=action=>tileType(action.tile)===tileType(referenceTile);
    const wantsRiichi=recommendation.endsWith('*');
    const wantedType=wantsRiichi?'riichi_discard':'discard';
    return actions.find(action=>action.type===wantedType&&action.tile===referenceTile)
      || actions.find(action=>action.type===wantedType&&sameType(action))
      || actions.find(action=>action.type==='discard'&&sameType(action))
      || null;
  }catch{return null;}
}

export function referenceReactionAction(match, seat, actions) {
  if(!MajiangAI||match?.phase!=='REACTION'||!match.lastDiscard||!Array.isArray(actions)||!actions.length)return null;
  try{
    const setup=makeAdvisor(match,seat);if(!setup)return null;
    const {advisor,selfWind,seatForWind}=setup;
    const sourceWind=(match.lastDiscard.seat-match.dealer+4)%4;
    advisor._model.lunban=sourceWind;
    const direction=['','+','=','-'][(4+sourceWind-selfWind)%4];
    const source=tileCode(match.lastDiscard.tile);if(!source)return null;
    const recommendation=advisor.select_fulou(source+direction);
    if(!recommendation)return actions.find(action=>action.type==='pass')||null;
    const matchResult=recommendation.match(/^([mpsz])([0-9]+)([+\-=])$/);if(!matchResult)return null;
    const suit={m:0,p:1,s:2,z:3}[matchResult[1]],digits=[...matchResult[2]];
    const referenceTiles=digits.map(value=>{const rank=Number(value);return suit<3?rank===0?[34,35,36][suit]:suit*9+rank-1:27+rank-1;});
    const tileType=tile=>tile>=34?[4,13,22][tile-34]:tile;
    let sourceIndex=referenceTiles.indexOf(match.lastDiscard.tile);
    if(sourceIndex<0)sourceIndex=referenceTiles.findIndex(tile=>tileType(tile)===tileType(match.lastDiscard.tile));
    if(sourceIndex<0)return null;referenceTiles.splice(sourceIndex,1);
    const recommendationType=digits.length===4?'kan':new Set(digits).size===1?'pon':'chi';
    const sorted=list=>list.map(tileType).sort((a,b)=>a-b).join(',');
    const sortedExact=list=>list.slice().sort((a,b)=>a-b).join(',');
    const exact=sortedExact(referenceTiles);
    const expected=sorted(referenceTiles);
    const candidates=actions.filter(candidate=>candidate.type===recommendationType);
    const action=candidates.find(candidate=>sortedExact(candidate.tiles||[])===exact)
      || candidates.find(candidate=>sorted(candidate.tiles||[])===expected);
    return action||null;
  }catch{return null;}
}

export function referenceAction(match, seat, actions) {
  const reaction=referenceReactionAction(match,seat,actions);
  if(reaction)return reaction;
  return referenceDiscardAction(match,seat,actions);
}
