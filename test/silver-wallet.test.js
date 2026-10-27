import test from 'node:test';import assert from 'node:assert/strict';
import {CoinWallet} from '../public/silver-ring/src/coin-wallet.js';
import {UI} from '../public/silver-ring/src/ui.js';
test('250 paid shots consume exactly 50000 and reset restores an integer 50000',()=>{
 const w=new CoinWallet();for(let i=0;i<250;i++)assert.equal(w.spend(200),true);
 assert.equal(w.balance,0);assert.equal(w.spend(200),false);w.reset();assert.equal(w.balance,50000);
 assert.throws(()=>w.setBalance(1.5));assert.throws(()=>w.credit(-1));assert.equal(w.balance,50000);
});
test('same-ball gate then first-bowl admission credits 100 once and can fund a shot',()=>{
 const w=new CoinWallet(),a={},b={};w.setBalance(100);
 assert.equal(w.starter(b,0),0);w.gate(a);assert.equal(w.starter(b,0),0);assert.equal(w.starter(a,1),0);
 assert.equal(w.starter(a,0),100);assert.equal(w.balance,200);assert.equal(w.starter(a,0),0);
 assert.equal(w.spend(200),true);assert.equal(w.balance,0);
 w.gate(a);assert.equal(w.starter(a,0),0);w.reset();assert.equal(w.starter(a,0),0);
});
test('exact display reaches zero rather than retaining one from a fractional cached value',()=>{
 const funds={textContent:'',classList:{toggle(){}}},ui={_lastFunds:null,el:{funds}};
 UI.prototype.setFunds.call(ui,.9,false);assert.equal(funds.textContent,'1枚');
 UI.prototype.setFunds.call(ui,0,true);assert.equal(funds.textContent,'0枚');
});
