export function secureDie(){const b=new Uint8Array(1);do{crypto.getRandomValues(b);}while(b[0]>=252);return b[0]%6+1;}
export function evaluate(dice){
 if(!Array.isArray(dice)||dice.length!==3||dice.some(n=>!Number.isInteger(n)||n<1||n>6))throw new Error('不正な出目です');
 const [a,b,c]=[...dice].sort((a,b)=>a-b);
 if(a===c)return a===1?{kind:'pin',label:'ピンゾロ',rank:900,multiplier:5}:{kind:'triple',label:`${a}のゾロ目`,rank:800+a,multiplier:3};
 if(a===4&&b===5&&c===6)return {kind:'shigoro',label:'シゴロ',rank:700,multiplier:2};
 if(a===1&&b===2&&c===3)return {kind:'hifumi',label:'ヒフミ',rank:-100,multiplier:2};
 if(a===b||b===c){const point=a===b?c:a;return {kind:'point',label:`${point}の目`,rank:100+point,multiplier:1};}
 return {kind:'none',label:'役なし',rank:0,multiplier:1};
}
// Signed profit for A. Both sides lose/win exactly the same number of coins.
export function settlement(a,b,bet){
 if(!Number.isSafeInteger(bet)||bet<1)throw new Error('賭け枚数を確認してください');
 if(a.rank===b.rank)return 0;
 const win=a.rank>b.rank?a:b,lose=a.rank>b.rank?b:a;
 return (a.rank>b.rank?1:-1)*bet*Math.max(win.multiplier,lose.kind==='hifumi'?2:1);
}
export class Match{
 constructor({die=secureDie}={}){this.die=die;this.players=[{name:'あなた',coins:1000},{name:'CPU・モカ',coins:1000}];this.hand=0;this.phase='BET';this.history=[];this.results=[null,null];this.last=null;this.dice=[];this.attempt=0;this.locked=false;}
 get dealer(){return this.hand%2;}
 get current(){return this.order?.[this.turnIndex]??null;}
 get maxBet(){return Math.min(100,Math.floor(Math.min(...this.players.map(p=>p.coins))/5));}
 placeBet(bet){
  if(this.phase!=='BET'||!Number.isInteger(bet)||bet<1||bet>this.maxBet)throw new Error('賭け枚数を確認してください');
  this.bet=bet;this.order=[this.dealer,1-this.dealer];this.turnIndex=0;this.results=[null,null];this.phase='TURN';this.resetTurn();
 }
 resetTurn(){this.attempt=0;this.dice=[];this.locked=false;}
 roll(physicalDice=null){
  if(this.phase!=='TURN'||this.locked)throw new Error('今は振れません');
  const dice=physicalDice===null?[this.die(),this.die(),this.die()]:[...physicalDice],role=evaluate(dice);
  this.dice=dice;this.attempt++;this.locked=role.kind!=='none'||this.attempt===3;
  this.results[this.current]={...role,dice:[...dice],attempt:this.attempt,final:this.locked};return this.results[this.current];
 }
 advance(){
  if(this.phase!=='TURN'||!this.locked)throw new Error('まだ出目が決まっていません');
  if(this.turnIndex===0){this.turnIndex=1;this.resetTurn();return;}
  const delta=settlement(this.results[0],this.results[1],this.bet);
  this.players[0].coins+=delta;this.players[1].coins-=delta;
  this.last={hand:this.hand+1,dealer:this.dealer,bet:this.bet,delta,results:structuredClone(this.results)};this.history.push(this.last);this.phase='ROUND_END';
 }
 next(){if(this.phase!=='ROUND_END')throw new Error('今は次の局に進めません');this.hand++;this.phase=this.hand>=4||this.maxBet<1?'FINAL':'BET';if(this.phase==='BET')this.results=[null,null];this.resetTurn();}
}
