// Reproducible logic survey, not a human bankroll or real-device performance test.
import {newShoe,seededRandom} from '../public/baccarat/shoe.js';
import {deal,payout,totalBet} from '../public/baccarat/rules.js';
import {Session,validateSession} from '../public/baccarat/session.js';
import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const random=seededRandom(20261028),counts={player:0,banker:0,tie:0},net={player:0,banker:0,tie:0},cardCounts={4:0,5:0,6:0};let shoe=newShoe(random),shoes=1;
const start=performance.now();
for(let n=0;n<100000;n++){
 if(shoe.cursor>=shoe.cut||416-shoe.cursor<6){shoe=newShoe(random,++shoes);}
 const r=deal(shoe.order,shoe.cursor);assert.ok(r.end<=416);assert.equal(new Set(r.cards.map(c=>c.card)).size,r.cards.length);counts[r.winner]++;cardCounts[r.cards.length]++;shoe.cursor=r.end;assert.equal(shoe.burn+(shoe.cursor-shoe.burn)+(416-shoe.cursor),416);
 for(const side of ['player','banker','tie']){const receipt=payout({[side]:100},r.winner);assert.equal(receipt.returned-receipt.stake,receipt.net);net[side]+=receipt.net;}
}
assert.equal(net.player,(counts.player-counts.banker)*100);assert.equal(net.banker,counts.banker*95-counts.player*100);assert.equal(net.tie,counts.tie*800-(counts.player+counts.banker)*100);
const logicMs=performance.now()-start;
const s=new Session({random:seededRandom(719)}),memory=[],latency=[];
for(let n=0;n<5000;n++){
 const at=performance.now();s.bet(n%2?'banker':'player',1000);s.confirm();s.skip();s.next();latency.push(performance.now()-at);
 if((n+1)%500===0){globalThis.gc?.();memory.push({round:n+1,heap:process.memoryUsage().heapUsed,history:s.state.history.length});}
}
validateSession(s.state);assert.equal(s.state.stats.rounds,5000);assert.equal(s.state.history.length,500);assert.equal(totalBet(s.state.bets),0);
if(globalThis.gc)assert.ok(memory.at(-1).heap-memory[0].heap<8*1024*1024,'retained heap growth exceeds 8MiB guard');
latency.sort((a,b)=>a-b);const report={seed:20261028,rounds:100000,shoes,counts,cardCounts,netAtFlatOneChip:net,logicMs,sessionRounds:5000,historyCap:500,memory,explicitGC:!!globalThis.gc,sessionTransactionMs:{median:latency[2500],p95:latency[4750],max:latency.at(-1)},note:'Logic benchmark on execution-host Node.js; not mobile frame-rate or human win-rate validation.'};
const path=process.argv[2]||'/tmp/baccarat-survey.json';writeFileSync(path,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
