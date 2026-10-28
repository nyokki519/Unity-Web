// Cosmetic RNG only. It never reads or advances the shoe's random source.
import {payout} from './rules.js';
const base={rainbow:.002,red:.018,green:.06,blue:.16};
export const SHOW_RATES=Object.freeze({standard:base,squeeze:base,rich:{rainbow:.005,red:.045,green:.13,blue:.27},quick:{rainbow:.001,red:.009,green:.03,blue:.08},off:{rainbow:0,red:0,green:0,blue:0}});
const levels=['none','blue','green','red','rainbow'];
function randomFor(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6d2b79f5;let x=n;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;};}
export function createPresentation(round,mode='standard'){
 if(!Object.hasOwn(SHOW_RATES,mode))mode='standard';
 const random=randomFor('vesper-show-v1:'+round.id),roll=random();let tier='none',sum=0;
 if(payout(round.bets,round.plan.winner).net>0)for(const [name,chance]of Object.entries(SHOW_RATES[mode])){sum+=chance;if(roll<sum){tier=name;break;}}
 const primary=['doors','seal','starlight','quiet'][Math.floor(random()*4)],aux=tier==='none'?[]:(random()<.5?['line','bell']:['line']);
 const last=round.plan.cards.length-1,cues=[],n=levels.indexOf(tier);
 if(n){if(primary!=='quiet'&&mode!=='quick')cues.push({at:0,tier:levels[Math.max(1,n-2)],kind:'trace',ms:400});if(n>1&&mode!=='quick')cues.push({at:2,tier:levels[Math.max(1,n-1)],kind:'upgrade',ms:500});cues.push({at:last,tier,kind:primary,ms:mode==='quick'?350:850});}
 return{version:1,id:'show-v1:'+round.id,mode,tier,primary,aux,cues,extraMs:cues.reduce((n,c)=>n+c.ms,0)};
}
export function roundPresentation(round){const p=round?.presentation;if(p?.version===1&&Object.hasOwn(SHOW_RATES,p.mode)){const expected=createPresentation(round,p.mode);if(JSON.stringify(p)===JSON.stringify(expected))return expected;}
 return{version:1,id:'legacy:'+round?.id,mode:'off',tier:'none',primary:'quiet',aux:[],cues:[],extraMs:0};}
