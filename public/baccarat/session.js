import {deal,payout,totalBet,SIDES} from './rules.js';
import {newShoe,cryptoRandom} from './shoe.js';
export const TABLES={lounge:{min:1000,max:100000,start:1000000},salon:{min:10000,max:500000,start:5000000},suite:{min:50000,max:2000000,start:20000000},classic:{min:100,max:10500000,start:5000000}};
const MAX=9e12,integer=(x,max=MAX)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const require=(ok,code='CORRUPT')=>{if(!ok)throw Error(code);};
function validBets(bets){require(bets&&typeof bets==='object'&&!Array.isArray(bets));for(const[side,x]of Object.entries(bets))require(SIDES.includes(side)&&integer(x)&&x>0&&x%100===0);}
export function validateSession(s){
 require(s&&s.version===1&&typeof s.id==='string'&&s.id.length<=100&&Object.hasOwn(TABLES,s.table));
 require(['betting','dealing','judging','result','ended'].includes(s.phase)&&integer(s.balance)&&s.initial===TABLES[s.table].start&&integer(s.sequence));
 validBets(s.bets);validBets(s.lastBet);require(Array.isArray(s.undo)&&s.undo.length<=200);s.undo.forEach(validBets);
 const shoe=s.shoe;require(shoe&&Array.isArray(shoe.order)&&shoe.order.length===416&&new Set(shoe.order).size===416&&shoe.order.every(x=>integer(x,415))&&integer(shoe.cursor,416)&&integer(shoe.burn,11)&&shoe.cursor>=shoe.burn&&shoe.cut===402&&integer(shoe.serial)&&shoe.serial>0);
 require(Array.isArray(s.history)&&s.history.length<=500&&new Set(s.history.map(x=>x.id)).size===s.history.length);
 const st=s.stats;require(st&&Object.values(st).every(x=>Number.isSafeInteger(x)&&Math.abs(x)<=MAX));require(st.rounds===st.player+st.banker+st.tie&&st.rounds===st.positive+st.negative+st.push&&st.rounds===s.sequence-(s.round&&!s.round.paid?1:0));for(const [key,value]of Object.entries(st))if(key!=='net')require(value>=0);
 let reserved=0;
 if(s.round){const r=s.round;require(r.plan&&integer(r.plan.start,410)&&r.plan.start>=shoe.burn&&integer(r.plan.end,416),'CORRUPT');require(r.id===s.id+':'+s.sequence&&r.shoeSerial===shoe.serial&&integer(r.balanceBefore)&&integer(r.revealed,6)&&typeof r.paid==='boolean');validBets(r.bets);
  const expected=deal(shoe.order,r.plan.start);require(JSON.stringify(expected)===JSON.stringify(r.plan)&&shoe.cursor===r.plan.end&&r.revealed<=r.plan.cards.length);if(s.phase==='judging'||r.paid)require(r.revealed===r.plan.cards.length);if(s.phase==='dealing')require(r.revealed<r.plan.cards.length);
  require(totalBet(r.bets)>=TABLES[s.table].min&&totalBet(r.bets)<=TABLES[s.table].max);for(const amount of Object.values(r.bets))require(amount>=TABLES[s.table].min);
  const result=payout(r.bets,r.plan.winner);require(s.balance===r.balanceBefore-result.stake+(r.paid?result.returned:0));
  if(r.paid){require(JSON.stringify(r.receipt)===JSON.stringify(result)&&s.history.at(-1)?.id===r.id&&['result','ended'].includes(s.phase));}else{reserved=result.stake;require(['dealing','judging'].includes(s.phase));}
 }else require(['betting','ended'].includes(s.phase));
 require(st.net===s.balance+reserved-s.initial&&st.peak>=s.initial&&st.peak>=s.balance+reserved&&st.maxDrawdown>=st.peak-(s.balance+reserved));
 require(totalBet(s.bets)<=s.balance&&totalBet(s.bets)<=TABLES[s.table].max);
 for(const [index,h] of s.history.entries()){require(h&&typeof h.id==='string'&&h.id.startsWith(s.id+':')&&SIDES.includes(h.winner)&&integer(h.before)&&integer(h.after)&&integer(h.shoeSerial)&&integer(h.start,416)&&integer(h.end,416)&&integer(h.number)&&h.id===s.id+':'+h.number&&Array.isArray(h.cards)&&h.cards.length>=4&&h.cards.length<=6);require(h.cards.every(c=>c&&['player','banker'].includes(c.side)&&integer(c.card,415))&&new Set(h.cards.map(c=>c.card)).size===h.cards.length&&h.end-h.start===h.cards.length);const hand=deal(h.cards.map(c=>c.card),0);require(JSON.stringify(hand.cards)===JSON.stringify(h.cards)&&hand.winner===h.winner&&hand.player===h.player&&hand.banker===h.banker);const receipt=payout(h.bets,h.winner);require(receipt.net===h.net&&receipt.returned===h.returned&&h.after===h.before+receipt.net);if(index){const previous=s.history[index-1];require(h.number===previous.number+1&&h.before===previous.after);}if(h.shoeSerial===shoe.serial){const expected=deal(shoe.order,h.start);require(JSON.stringify(expected.cards)===JSON.stringify(h.cards)&&expected.winner===h.winner&&expected.player===h.player&&expected.banker===h.banker&&expected.end===h.end);}}
 if(s.history.length){const last=s.history.at(-1);require(last.number===st.rounds&&last.after===s.balance+reserved);if(!s.round&&last.shoeSerial===shoe.serial)require(shoe.cursor===last.end);}
 if(st.rounds<=500){require(s.history.length===st.rounds);let peak=s.initial,dd=0;for(const h of s.history){peak=Math.max(peak,h.after);dd=Math.max(dd,peak-h.after);}require(peak===st.peak&&dd===st.maxDrawdown);require(s.history.reduce((n,h)=>n+h.net,0)===st.net&&s.history.reduce((n,h)=>n+totalBet(h.bets),0)===st.wagered);for(const side of SIDES)require(s.history.filter(h=>h.winner===side).length===st[side]);}
 return true;
}
function settleState(s){
 if(!s.round||s.round.paid||!['dealing','judging'].includes(s.phase))return false;
 const r=s.round,receipt=payout(r.bets,r.plan.winner);r.revealed=r.plan.cards.length;r.receipt=receipt;r.paid=true;s.balance+=receipt.returned;s.lastBet={...r.bets};s.phase='result';
 const st=s.stats;st.rounds++;st[r.plan.winner]++;st[receipt.net>0?'positive':receipt.net<0?'negative':'push']++;st.net+=receipt.net;st.wagered+=receipt.stake;st.peak=Math.max(st.peak,s.balance);st.maxDrawdown=Math.max(st.maxDrawdown,st.peak-s.balance);
 s.history.push({id:r.id,number:s.sequence,shoeSerial:r.shoeSerial,start:r.plan.start,end:r.plan.end,cards:r.plan.cards,player:r.plan.player,banker:r.plan.banker,winner:r.plan.winner,bets:r.bets,before:r.balanceBefore,after:s.balance,returned:receipt.returned,net:receipt.net});s.history=s.history.slice(-500);return true;
}
export class Session{
 constructor({table='lounge',state=null,random=cryptoRandom,commit=()=>true,decorateRound=null}={}){
  this.random=random;this.commit=commit;this.decorateRound=decorateRound;
  if(state){validateSession(state);this.state=structuredClone(state);}else{require(Object.hasOwn(TABLES,table),'TABLE');this.state={version:1,id:globalThis.crypto.randomUUID(),table,initial:TABLES[table].start,balance:TABLES[table].start,phase:'betting',sequence:0,shoe:newShoe(random),bets:{},lastBet:{},undo:[],round:null,history:[],stats:{rounds:0,player:0,banker:0,tie:0,positive:0,negative:0,push:0,net:0,wagered:0,peak:TABLES[table].start,maxDrawdown:0}};}
 }
 transaction(change){const next=structuredClone(this.state);const result=change(next);validateSession(next);if(this.commit(next)!==true)throw Error('SAVE');this.state=next;return result;}
 editable(){require(this.state.phase==='betting','PHASE');}
 edit(bets){this.editable();validBets(bets);require(totalBet(bets)<=TABLES[this.state.table].max,'MAX');require(totalBet(bets)<=this.state.balance,'FUNDS');return this.transaction(s=>{s.undo.push({...s.bets});s.undo=s.undo.slice(-200);s.bets=bets;});}
 bet(side,amount){require(SIDES.includes(side)&&integer(amount)&&amount>0&&amount%100===0,'AMOUNT');return this.edit({...this.state.bets,[side]:(this.state.bets[side]||0)+amount});}
 clear(){return this.edit({});}
 undo(){this.editable();if(!this.state.undo.length)return;this.transaction(s=>{s.bets=s.undo.pop();});}
 repeat(){require(totalBet(this.state.lastBet)>0,'PREVIOUS');return this.edit({...this.state.lastBet});}
 double(){require(totalBet(this.state.bets)>0,'EMPTY');return this.edit(Object.fromEntries(Object.entries(this.state.bets).map(([k,v])=>[k,v*2])));}
 confirm(){this.editable();const table=TABLES[this.state.table];require(totalBet(this.state.bets)>0,'EMPTY');for(const amount of Object.values(this.state.bets))require(amount>=table.min,'MIN');
  return this.transaction(s=>{if(s.shoe.cursor>=s.shoe.cut||416-s.shoe.cursor<6)s.shoe=newShoe(this.random,s.shoe.serial+1);const plan=deal(s.shoe.order,s.shoe.cursor);s.sequence++;s.round={id:s.id+':'+s.sequence,bets:{...s.bets},balanceBefore:s.balance,plan,shoeSerial:s.shoe.serial,revealed:0,paid:false};if(this.decorateRound)s.round.presentation=this.decorateRound(structuredClone(s.round));s.shoe.cursor=plan.end;s.balance-=totalBet(s.bets);s.bets={};s.undo=[];s.phase='dealing';});
 }
 reveal(){if(this.state.phase!=='dealing')return false;this.state.round.revealed++;if(this.state.round.revealed===this.state.round.plan.cards.length)this.state.phase='judging';return true;}
 revealAll(){while(this.reveal());}
 settle(){if(!this.state.round||this.state.round.paid||!['dealing','judging'].includes(this.state.phase))return false;require(this.state.round.revealed===this.state.round.plan.cards.length,'REVEAL');return this.transaction(settleState);}
 skip(){if(!['dealing','judging'].includes(this.state.phase))return false;return this.transaction(settleState);}
 next(){require(this.state.phase==='result','PHASE');this.transaction(s=>{s.phase='betting';s.round=null;s.bets={};s.undo=[];});}
 end(){return this.transaction(s=>{settleState(s);s.phase='ended';});}
 resume(){require(this.state.phase==='ended','PHASE');this.transaction(s=>{s.phase=s.round?'result':'betting';});}
}
