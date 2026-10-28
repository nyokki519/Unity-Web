// Eight-deck commission Punto Banco. All monetary values are integer 0.01 chips.
export const SIDES=['player','tie','banker'];
export const rank=id=>id%13+1;
export const value=id=>rank(id)>=10?0:rank(id);
export const points=cards=>cards.reduce((n,c)=>n+value(c),0)%10;
export function bankerDraw(total,third){
 if(third===null)return total<=5;
 return total<=2||total===3&&third!==8||total===4&&third>=2&&third<=7||total===5&&third>=4&&third<=7||total===6&&(third===6||third===7);
}
export function deal(order,start){
 const hands={player:[],banker:[]},cards=[];let cursor=start;
 const draw=side=>{if(cursor>=order.length)throw Error('SHOE');const card=order[cursor++];hands[side].push(card);cards.push({side,card});};
 for(const side of ['player','banker','player','banker'])draw(side);
 const initialP=points(hands.player),initialB=points(hands.banker),natural=initialP>=8||initialB>=8;
 if(!natural){let third=null;if(initialP<=5){draw('player');third=value(hands.player[2]);}if(bankerDraw(initialB,third))draw('banker');}
 const player=points(hands.player),banker=points(hands.banker);
 return{cards,player,banker,natural,winner:player===banker?'tie':player>banker?'player':'banker',start,end:cursor};
}
export const totalBet=bets=>Object.values(bets).reduce((sum,x)=>sum+x,0);
export function payout(bets,winner){
 if(!SIDES.includes(winner))throw Error('RESULT');const lines=[];
 for(const [side,stake]of Object.entries(bets)){
  if(!SIDES.includes(side)||!Number.isSafeInteger(stake)||stake<=0||stake%100!==0)throw Error('AMOUNT');
  const won=side===winner,push=winner==='tie'&&side!=='tie',principal=won||push?stake:0;
  const profit=won?(side==='banker'?stake/100*95:side==='tie'?stake*8:stake):0;
  lines.push({side,stake,principal,profit,returned:principal+profit,net:principal+profit-stake});
 }
 const stake=totalBet(bets),returned=lines.reduce((sum,x)=>sum+x.returned,0);
 if(!Number.isSafeInteger(returned))throw Error('AMOUNT');return{stake,returned,net:returned-stake,lines};
}
