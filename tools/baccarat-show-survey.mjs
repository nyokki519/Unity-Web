import {deal,payout} from '../public/baccarat/rules.js';
import {newShoe,seededRandom} from '../public/baccarat/shoe.js';
import {createPresentation,SHOW_RATES} from '../public/baccarat/show-plan.js';
const n=100000,random=seededRandom(28102026);let shoe=newShoe(random),positive=0;const counts=Object.fromEntries(Object.keys(SHOW_RATES).map(k=>[k,{none:0,blue:0,green:0,red:0,rainbow:0}]));
for(let i=0;i<n;i++){if(shoe.cursor>=shoe.cut)shoe=newShoe(random,shoe.serial+1);const plan=deal(shoe.order,shoe.cursor);shoe.cursor=plan.end;const r={id:'survey-20261028:'+i,plan,bets:{player:1000}};const net=payout(r.bets,plan.winner).net;if(net>0)positive++;for(const mode of Object.keys(counts)){const p=createPresentation(r,mode);counts[mode][p.tier]++;if(net<=0&&p.tier!=='none')throw Error('nonpositive preview');if(p.extraMs>6000)throw Error('budget');}}
console.log(JSON.stringify({rounds:n,wager:'Player 10 chips, fixed',positive,nonpositive:n-positive,seed:28102026,note:'Full-round denominators are rounds; configured rarity probabilities are conditional on positive personal net. Observed counts, not promised future odds.',counts,conditionalRates:SHOW_RATES},null,2));
