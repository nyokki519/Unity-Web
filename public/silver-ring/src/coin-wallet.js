// Integer game credits. Ball identity is the object itself, not a reusable numeric ID.
export class CoinWallet {
 constructor({start=50000,onChange=()=>{}}={}){this.start=start;this.onChange=onChange;this.reset();}
 reset(){this.gates=new WeakSet();this.paid=new WeakSet();this.setBalance(this.start);}
 get balance(){return this.value;}
 setBalance(value){if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Credits must be a nonnegative safe integer');this.value=value;this.onChange(value);}
 credit(amount){if(!Number.isSafeInteger(amount)||amount<0)throw new RangeError('Invalid credit');this.setBalance(this.value+amount);}
 canAfford(cost){return Number.isSafeInteger(cost)&&cost>0&&this.value>=cost;}
 spend(cost){if(!this.canAfford(cost))return false;this.setBalance(this.value-cost);return true;}
 gate(ball){if(ball&&typeof ball==='object')this.gates.add(ball);}
 starter(ball,tier){if(tier!==0||!ball||!this.gates.has(ball)||this.paid.has(ball))return 0;this.paid.add(ball);this.credit(100);return 100;}
}
