export class BallLedger{
 constructor(initial=250){if(!Number.isInteger(initial)||initial<0)throw new Error('invalid stock');Object.assign(this,{initial,stock:initial,fired:0,recovered:0,payout:0,entries:0,active:new Set(),seen:new Set()});}
 fire(id){if(this.stock<1||this.seen.has(id))return false;this.stock--;this.fired++;this.active.add(id);this.seen.add(id);return true;}
 recover(id,kind='out'){if(!this.active.delete(id))return false;this.recovered++;if(kind!=='out')this.entries++;return true;}
 award(count){if(!Number.isInteger(count)||count<0||count>100000)throw new Error('invalid payout');this.stock+=count;this.payout+=count;}
 valid(){return this.fired===this.active.size+this.recovered&&this.stock===this.initial+this.payout-this.fired;}
 snapshot(){return {initial:this.initial,stock:this.stock,fired:this.fired,active:this.active.size,recovered:this.recovered,payout:this.payout,valid:this.valid()};}
}
export function chooseTicket(type,rng){const r=rng();if(r<0||r>=1)throw new Error('invalid draw');if(type===1&&r<.004)return {rounds:10,long:true};return {rounds:r<(type===1?.336:.336)?10:r<.668?5:3,long:false};}
// Published total payout is consistent with (rounds-1)*9*14; first V round counted.
export const paidRounds=r=>r-1;
export function openingWindows(type,long=false){return type===2?[[0,.6],[.72,1.32]]:[[0,long?1.3:.4]];}
