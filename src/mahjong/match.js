import {createWall,sortHand,tileType} from './tiles.js';
import {isCompleteHand} from './hand.js';
import {evaluateYaku} from './yaku.js';
import {calculatePayments} from './score.js';

export const MAX_HANDS=12;

const clone = value => structuredClone(value);
const nextSeat = seat => (seat + 1) % 4;
const countType = (hand, wanted) => hand.filter(tile => tileType(tile) === wanted).length;
const sameTiles = (hand, tiles) => {
  const remaining=[...hand];
  for(const tile of tiles){const i=remaining.indexOf(tile);if(i<0)return false;remaining.splice(i,1);}
  return true;
};
function makeContext(match, seat, winningTile, winType, flags={}) {
  const player=match.players[seat];
  return {concealed:player.hand, melds:player.melds, winningTile, winType, seatWind:((seat-match.dealer+4)%4)+1,
    roundWind:match.roundWind, riichi:player.riichi, doubleRiichi:player.doubleRiichi, ippatsu:player.ippatsu,
    furiten:player.furiten, doraIndicators:match.doraIndicators, uraIndicators:player.riichi?match.uraIndicators:[], ...flags};
}
function canWin(match, seat, tile, winType, flags={}) {
  const player=match.players[seat];
  const concealed=winType==='tsumo'?player.hand:[...player.hand,tile];
  if(!isCompleteHand(concealed,player.melds))return false;
  const riverFuriten=winType==='ron'&&[...Array(34).keys()].some(type=>player.discards.some(d=>tileType(d.tile)===type)&&isCompleteHand([...player.hand,type],player.melds));
  const result=evaluateYaku({...makeContext(match,seat,tile,winType,flags),concealed,furiten:riverFuriten||player.furiten,temporaryFuriten:player.temporaryFuriten,riichiFuriten:player.riichiFuriten});
  return flags.kokushiOnly?!!result?.yaku.some(yaku=>yaku.id==='kokushi'):!!result;
}
function makeMeldChoices(hand, calledTile, kind) {
  const type=tileType(calledTile), choices=[];
  if(type<0)return choices;
  if(kind==='pon'||kind==='kan'){
    const required=kind==='pon'?2:3;
    const same=hand.filter(tile=>tileType(tile)===type);
    if(same.length>=required)choices.push({type:kind,tiles:same.slice(0,required)});
  }else if(kind==='chi'&&type<27){
    const startMin=Math.max(Math.floor(type/9)*9,type-2),startMax=Math.min(Math.floor(type/9)*9+6,type);
    for(let start=startMin;start<=startMax;start++){
      if(type<start||type>start+2)continue;
      const required=[start,start+1,start+2].filter(t=>t!==type),selected=[];
      for(const need of required){const found=hand.find(tile=>tileType(tile)===need&&!selected.includes(tile));if(found===undefined){selected.length=0;break;}selected.push(found);}
      if(selected.length===2)choices.push({type:'chi',tiles:selected});
    }
  }
  return choices;
}
function tileFromType(wall,type){const i=wall.findIndex(t=>tileType(t)===type);return i<0?null:wall.splice(i,1)[0];}
function waitingTypes(hand,melds){
  const waits=[];
  for(let type=0;type<34;type++){
    if(countType([...hand,...melds.flatMap(m=>m.tiles)],type)>=4)continue;
    if(isCompleteHand([...hand,type],melds))waits.push(type);
  }
  return waits;
}
function canDeclareRiichiAnkan(player,drawnTile,tiles){
  if(drawnTile===null||drawnTile===undefined||!tiles.some(tile=>tile===drawnTile)||tiles.length!==4)return false;
  const before=[...player.hand],drawIndex=before.indexOf(drawnTile);if(drawIndex<0)return false;before.splice(drawIndex,1);
  const type=tileType(tiles[0]);if(type<0||tiles.some(tile=>tileType(tile)!==type))return false;
  const after=[...player.hand];for(const tile of tiles){const index=after.indexOf(tile);if(index<0)return false;after.splice(index,1);}
  const kan={type:'kan',tiles:[...tiles],open:false},beforeWaits=waitingTypes(before,player.melds),afterWaits=waitingTypes(after,[...player.melds,kan]);
  return beforeWaits.length>0&&beforeWaits.length===afterWaits.length&&beforeWaits.every((wait,index)=>wait===afterWaits[index]);
}
function validDiscardAction(match,seat,action){
  const player=match.players[seat];
  if(action.type==='discard')return player.hand.includes(action.tile);
  if(action.type==='riichi_discard')return !player.riichi&&!player.melds.some(m=>m.open)&&player.points>=1000&&player.hand.includes(action.tile)&&isTenpaiAfterDiscard(player.hand,action.tile,player.melds);
  return false;
}
function isTenpaiAfterDiscard(hand,tile,melds){
  const next=[...hand],i=next.indexOf(tile);if(i<0)return false;next.splice(i,1);
  for(let type=0;type<34;type++){const candidate=type; if(countType(next,candidate)>=4)continue;if(isCompleteHand([...next,candidate],melds))return true;}
  return false;
}
function discard(match,seat,action,now){
  const player=match.players[seat],index=player.hand.indexOf(action.tile);
  if(index<0)throw new Error('Illegal discard');
  const [tile]=player.hand.splice(index,1);
  if(action.type==='riichi_discard'){
    player.doubleRiichi=player.discards.length===0&&match.players.every(p=>p.discards.length===0&&p.melds.length===0);
    player.riichi=true;player.ippatsu=true;player.points-=1000;match.riichiPot+=1000;match.riichiDeclarations++;
  }else if(player.riichi)player.ippatsu=false;
  player.discards.push({tile,turn:match.turnNumber,riichi:action.type==='riichi_discard',called:false});
  match.lastDiscard={tile,seat,riverIndex:player.discards.length-1};
  match.drawnTile=null;match.phase='REACTION';match.activeSeat=null;match.responses={};
  match.reactionSeats=[0,1,2,3].filter(s=>s!==seat);
  for(const other of match.reactionSeats){const choices=legalReactionActions(match,other);if(choices.length===1&&choices[0].type==='pass')match.responses[other]={type:'pass'};}
  match.deadlineAt=now+30000;
  resolveReactions(match,now);
}
function legalReactionActions(match,seat){
  const {tile,seat:from}=match.lastDiscard,player=match.players[seat],actions=[{type:'pass'}];
  const ankanRob=match.pendingKan?.kind==='ankan',flags={houtei:match.liveWall.length===0,chankan:!!match.pendingKan,...(ankanRob?{kokushiOnly:true}:{})};
  if(canWin(match,seat,tile,'ron',flags))actions.push({type:'ron'});
  if(match.pendingKan)return actions;
  if(player.riichi)return actions;
  for(const kind of ['pon','kan','chi']){
    if(kind==='kan'&&!match.liveWall.length)continue;
    if(kind==='chi'&&seat!==nextSeat(from))continue;
    for(const choice of makeMeldChoices(player.hand,tile,kind))actions.push(choice);
  }
  return actions;
}
function advance(match,now){
  const from=match.lastDiscard.seat;
  match.activeSeat=nextSeat(from);match.phase='DRAW';match.responses={};match.reactionSeats=[];match.deadlineAt=now+30000;
  return draw(match,match.activeSeat,now);
}
function draw(match,seat,now){
  if(!match.liveWall.length){finishHand(match,{type:'exhaustive',tenpai:findTenpaiSeats(match)},now);return;}
  const tile=match.liveWall.shift();match.players[seat].hand.push(tile);match.players[seat].hand=sortHand(match.players[seat].hand);
  match.players[seat].temporaryFuriten=false;
  match.activeSeat=seat;match.drawnTile=tile;match.phase='DISCARD';match.rinshanSeat=null;match.turnNumber++;
  match.deadlineAt=now+30000;
}
function replacementDraw(match,seat,now){
  if(!match.rinshanTiles.length||!match.liveWall.length){finishHand(match,{type:'abortive',reason:'no-rinshan-tile'},now);return;}
  const tile=match.rinshanTiles.shift();match.liveWall.pop();match.kanCount++;match.kanOwners??=[];match.kanOwners.push(seat);
  const dora=match.kanDoraIndicators[match.kanCount-1],ura=match.kanUraIndicators[match.kanCount-1];
  if(dora!==undefined)match.doraIndicators.push(dora);if(ura!==undefined)match.uraIndicators.push(ura);
  const player=match.players[seat];player.hand.push(tile);player.hand=sortHand(player.hand);
  match.activeSeat=seat;match.drawnTile=tile;match.phase='DISCARD';match.rinshanSeat=seat;match.deadlineAt=now+30000;
  if(match.kanCount>=4&&new Set(match.kanOwners).size>1)finishHand(match,{type:'abortive',reason:'four-kans'},now);
}
function resolveReactions(match,now){
  if(match.phase!=='REACTION'||match.reactionSeats.some(seat=>!match.responses[seat]))return;
  const winners=match.reactionSeats.filter(seat=>match.responses[seat].type==='ron').sort((a,b)=>((a-match.lastDiscard.seat+4)%4)-((b-match.lastDiscard.seat+4)%4));
  if(winners.length){
    if(winners.length>=3){finishHand(match,{type:'abortive',reason:'triple-ron'},now);return;}
    const winner=winners[0];finishHand(match,{type:'win',winner,loser:match.lastDiscard.seat,winType:'ron',tile:match.lastDiscard.tile,...(match.pendingKan?{chankan:true}:{})},now);return;
  }
  for(const seat of match.reactionSeats)if(match.responses[seat]?.type==='pass'&&legalReactionActions(match,seat).some(action=>action.type==='ron')){
    match.players[seat].temporaryFuriten=true;if(match.players[seat].riichi)match.players[seat].riichiFuriten=true;
  }
  if(match.pendingKan){const pending=match.pendingKan,player=match.players[pending.seat];if(pending.kind==='ankan'){for(const tile of pending.tiles)player.hand.splice(player.hand.indexOf(tile),1);player.melds.push({type:'kan',tiles:[...pending.tiles],open:false});}else{const meld=player.melds[pending.meldIndex];meld.tiles.push(pending.tile);meld.type='kan';}match.pendingKan=null;match.lastDiscard=null;match.responses={};match.reactionSeats=[];match.drawnTile=null;replacementDraw(match,pending.seat,now);return;}
  const claims=match.reactionSeats.map(seat=>({seat,action:match.responses[seat]})).filter(v=>['pon','kan','chi'].includes(v.action.type));
  claims.sort((a,b)=>(({kan:0,pon:0,chi:1}[a.action.type]??2)-({kan:0,pon:0,chi:1}[b.action.type]??2))||(((a.seat-match.lastDiscard.seat+4)%4)-((b.seat-match.lastDiscard.seat+4)%4)));
  if(claims.length){const {seat,action}=claims[0],player=match.players[seat],tiles=[...action.tiles];if(!sameTiles(player.hand,tiles)){delete match.responses[seat];return;}
    for(const tile of tiles)player.hand.splice(player.hand.indexOf(tile),1);
    match.players[match.lastDiscard.seat].discards[match.lastDiscard.riverIndex].called=true;
    player.melds.push({type:action.type,tiles:[...tiles,match.lastDiscard.tile],open:true});match.activeSeat=seat;match.lastDiscard=null;match.responses={};match.reactionSeats=[];
    if(action.type==='kan')replacementDraw(match,seat,now);
    else{match.phase='DISCARD';match.drawnTile=null;match.deadlineAt=now+30000;}
    for(const p of match.players)p.ippatsu=false;
    return;
  }
  advance(match,now);
}
function findTenpaiSeats(match){return match.players.map((player,seat)=>{for(let type=0;type<34;type++)if(countType(player.hand,type)<4&&isCompleteHand([...player.hand,type],player.melds))return seat;return -1;}).filter(seat=>seat>=0);}
function finishHand(match,result,now){
  if(match.phase==='HAND_RESULT'||match.phase==='MATCH_RESULT')return;
  match.phase='HAND_RESULT';match.result={...result,at:now};match.deadlineAt=null;if(result.chankan)match.pendingKan=null;
  if(result.type==='win'){
    const loser=result.loser;
    const flags=result.winType==='tsumo'?{haitei:match.liveWall.length===0,rinshan:match.rinshanSeat===result.winner}:{houtei:match.liveWall.length===0,chankan:!!result.chankan};
    const scored=evaluateYaku(makeContext(match,result.winner,result.tile,result.winType,flags));
    const yakuman=scored.yaku.reduce((sum,item)=>sum+(item.yakuman||0),0);
    const settlement=calculatePayments({winner:result.winner,loser,dealer:match.dealer,winType:result.winType,han:scored.han,fu:scored.fu,yakuman,honba:match.honba,riichiPot:match.riichiPot});
    settlement.deltas.forEach((delta,seat)=>match.players[seat].points+=delta);
    match.riichiPot=0;match.result.yaku=scored.yaku;match.result.han=scored.han;match.result.fu=scored.fu;match.result.deltas=settlement.deltas;
  }else if(result.type==='exhaustive'){
    const settlement=calculatePayments({type:'exhaustive',tenpai:result.tenpai||[]});
    settlement.deltas.forEach((delta,seat)=>match.players[seat].points+=delta);
    match.result.deltas=settlement.deltas;
  }else if(result.type==='nagashi'){
    const settlement=calculatePayments({type:'nagashi',winner:result.winner,dealer:match.dealer,winType:'tsumo',han:5,fu:30,honba:match.honba,riichiPot:match.riichiPot});
    settlement.deltas.forEach((delta,seat)=>match.players[seat].points+=delta);
    match.riichiPot=0;match.result.deltas=settlement.deltas;
  }
}

function dealNextHand(match,now){
  const wall=createWall(`${match.seed}:${match.handNumber}:${match.dealer}`),deadWall=wall.splice(-14);
  for(const player of match.players){player.hand=[];player.melds=[];player.discards=[];player.doubleRiichi=false;player.ippatsu=false;player.furiten=false;player.temporaryFuriten=false;player.riichiFuriten=false;}
  for(let i=0;i<13;i++)for(const player of match.players)player.hand.push(wall.shift());
  for(const player of match.players)player.hand=sortHand(player.hand);
  match.liveWall=wall;setupDeadWall(match,deadWall);
  match.phase='DISCARD';match.activeSeat=match.dealer;match.lastDiscard=null;match.responses={};match.reactionSeats=[];match.drawnTile=match.liveWall.shift();
  match.players[match.dealer].hand.push(match.drawnTile);match.players[match.dealer].hand=sortHand(match.players[match.dealer].hand);
  match.turnNumber=1;match.deadlineAt=now+30000;
}
function setupDeadWall(match,deadWall){
  match.deadWall=deadWall;match.rinshanTiles=deadWall.slice(0,4);match.kanDoraIndicators=[deadWall[6],deadWall[8],deadWall[10],deadWall[12]];
  match.kanUraIndicators=[deadWall[7],deadWall[9],deadWall[11],deadWall[13]];match.kanCount=0;match.rinshanSeat=null;
  match.doraIndicators=[deadWall[4]];match.uraIndicators=[deadWall[5]];
}

export function createMatch({players,seed=0,now=Date.now()}={}){
  if(!Array.isArray(players)||players.length!==4)throw new TypeError('Exactly four players are required');
  const wall=createWall(seed),deadWall=wall.splice(-14),seats=players.map((id,seat)=>({id,seat,hand:[],melds:[],discards:[],points:25000,riichi:false,doubleRiichi:false,ippatsu:false,furiten:false,temporaryFuriten:false,riichiFuriten:false}));
  for(let seat=0;seat<4;seat++){
    const player=players[seat];
    if(player&&typeof player==='object')Object.assign(seats[seat],{id:String(player.id??seat),name:String(player.name??player.id??`Player ${seat+1}`),characterId:player.characterId??null,isCpu:!!player.isCpu});
    else seats[seat].name=String(player);
  }
  for(let i=0;i<13;i++)for(const p of seats)p.hand.push(wall.shift());
  seats.forEach(p=>p.hand=sortHand(p.hand));
  const doraIndicators=[deadWall[4]],uraIndicators=[deadWall[5]];
  const match={players:seats,phase:'DISCARD',dealer:0,roundWind:1,handNumber:1,honba:0,riichiPot:0,riichiDeclarations:0,
    activeSeat:0,liveWall:wall,deadWall,drawnTile:null,lastDiscard:null,responses:{},reactionSeats:[],deadlineAt:now+30000,revision:0,
    turnNumber:0,doraIndicators,uraIndicators,result:null,history:[],handsPlayed:0,seed,rinshanTiles:[],kanDoraIndicators:[],kanUraIndicators:[],kanCount:0,kanOwners:[],rinshanSeat:null};
  setupDeadWall(match,deadWall);
  match.drawnTile=match.liveWall.shift();match.players[0].hand.push(match.drawnTile);match.players[0].hand=sortHand(match.players[0].hand);match.turnNumber=1;
  return match;
}

export function legalActions(match,seat){
  if(!Number.isInteger(seat)||seat<0||seat>3||['HAND_RESULT','MATCH_RESULT'].includes(match.phase))return [];
  if(match.phase==='DISCARD'&&match.activeSeat===seat){const player=match.players[seat],actions=(player.riichi?[match.drawnTile]:player.hand).map(tile=>({type:'discard',tile}));
    if(!player.riichi&&!player.melds.some(m=>m.open)&&player.points>=1000){for(const tile of new Set(player.hand))if(validDiscardAction(match,seat,{type:'riichi_discard',tile}))actions.push({type:'riichi_discard',tile});}
    if(canWin(match,seat,match.drawnTile,'tsumo',{haitei:match.liveWall.length===0,rinshan:match.rinshanSeat===seat}))actions.push({type:'tsumo'});
    const grouped=new Map();for(const tile of player.hand){const type=tileType(tile);if(!grouped.has(type))grouped.set(type,[]);grouped.get(type).push(tile);}if(match.liveWall.length)for(const tiles of grouped.values())if(tiles.length===4&&(!player.riichi||canDeclareRiichiAnkan(player,match.drawnTile,tiles)))actions.push({type:'ankan',tiles:[...tiles]});
    if(match.liveWall.length&&!player.riichi)for(let meldIndex=0;meldIndex<player.melds.length;meldIndex++){const meld=player.melds[meldIndex];if(meld.type!=='pon'||!meld.open)continue;const type=tileType(meld.tiles[0]),tile=player.hand.find(value=>tileType(value)===type);if(tile!==undefined)actions.push({type:'kakan',tile,meldIndex});}
    return actions;
  }
  if(match.phase==='REACTION'&&match.reactionSeats.includes(seat)&&!match.responses[seat])return legalReactionActions(match,seat);
  return [];
}

export function applyAction(current,seat,action,expectedRevision,now=Date.now()){
  if(!action||typeof action!=='object')throw new TypeError('Invalid action');
  if(expectedRevision!==current.revision)throw new Error('Stale revision');
  const match=clone(current),allowed=legalActions(match,seat),key=action.type;
  if(!allowed.some(candidate=>candidate.type===key&&(key==='discard'||key==='riichi_discard'||key==='kakan'?candidate.tile===action.tile&&(key!=='kakan'||candidate.meldIndex===action.meldIndex):key==='chi'||key==='pon'||key==='kan'||key==='ankan'?JSON.stringify(candidate.tiles)===JSON.stringify(action.tiles):true)))throw new Error('Illegal action');
  if(match.phase==='DISCARD'){
    if(action.type==='tsumo')finishHand(match,{type:'win',winner:seat,loser:null,winType:'tsumo',tile:match.drawnTile},now);
    else if(action.type==='ankan'){for(const p of match.players)p.ippatsu=false;match.pendingKan={kind:'ankan',seat,tiles:[...action.tiles],tile:action.tiles[0]};match.lastDiscard={tile:action.tiles[0],seat,riverIndex:null,kan:true};match.phase='REACTION';match.activeSeat=null;match.responses={};match.reactionSeats=[0,1,2,3].filter(s=>s!==seat);for(const other of match.reactionSeats){const choices=legalReactionActions(match,other);if(choices.length===1)match.responses[other]={type:'pass'};}match.deadlineAt=now+30000;resolveReactions(match,now);}
    else if(action.type==='kakan'){const player=match.players[seat];player.hand.splice(player.hand.indexOf(action.tile),1);for(const p of match.players)p.ippatsu=false;match.pendingKan={kind:'kakan',seat,tile:action.tile,meldIndex:action.meldIndex};match.lastDiscard={tile:action.tile,seat,riverIndex:null,kan:true};match.phase='REACTION';match.activeSeat=null;match.responses={};match.reactionSeats=[0,1,2,3].filter(s=>s!==seat);for(const other of match.reactionSeats){const choices=legalReactionActions(match,other);if(choices.length===1)match.responses[other]={type:'pass'};}match.deadlineAt=now+30000;resolveReactions(match,now);}
    else discard(match,seat,action,now);
  }else{
    match.responses[seat]=clone(action);resolveReactions(match,now);
  }
  match.revision++;
  return match;
}

export function advanceTurn(current,now=Date.now()){
  if(current.phase!=='HAND_RESULT')throw new Error('Cannot advance turn outside hand result phase');
  const match=clone(current),result=match.result;match.handsPlayed=Number.isInteger(match.handsPlayed)?match.handsPlayed:(match.history?.length||0);match.handsPlayed++;
  match.history.push(clone(result));
  const dealerContinues=result.type==='abortive'||result.winner===match.dealer||result.type==='exhaustive'&&(result.tenpai||[]).includes(match.dealer);
  if(dealerContinues)match.honba++;
  else{match.dealer=nextSeat(match.dealer);match.handNumber++;match.honba=0;}
  match.result=null;
  if(match.handNumber>4||match.handsPlayed>=MAX_HANDS){
    match.phase='MATCH_RESULT';match.deadlineAt=null;
    const ranking=match.players.map(p=>({seat:p.seat,id:p.id,name:p.name,points:p.points,uma:p.points-30000})).sort((a,b)=>b.points-a.points);
    match.result={type:'match',title:match.handsPlayed>=MAX_HANDS?`東風戦終了（最大${MAX_HANDS}局）`:'東風戦終了',...(match.handsPlayed>=MAX_HANDS?{reason:'hand-limit'}:{}),rankings:ranking.map((row,index)=>({...row,rank:index+1})),at:now};
  }else dealNextHand(match,now);
  match.revision++;return match;
}
