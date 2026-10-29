import test from 'node:test';
import assert from 'node:assert/strict';
import {Session,TABLES} from '../public/baccarat/session.js';
import {ClassicController} from '../public/baccarat/classic-controller.js';
import {roundTimeline} from '../public/baccarat/classic-config.js';
import {classicRecord} from '../public/baccarat/classic-records.js';

test('source-sized one-chip bet remains cent-exact on banker and is paid once',()=>{
 assert.equal(TABLES.classic.min,100);
 const c=new ClassicController();c.start();
 const s=c.session.state,cards=[1,2,14,3,9];s.shoe.order=[...cards,...s.shoe.order.filter(x=>!cards.includes(x))];s.shoe.cursor=s.shoe.burn=0;
 c.select('banker');c.chip(1);assert.equal(s.balance,5000000);assert.equal(c.session.state.bets.banker,100);
 c.confirm();assert.throws(()=>c.confirm(),/PHASE/);c.session.revealAll();assert.equal(c.settle(),true);assert.equal(c.settle(),false);
 assert.equal(c.session.state.balance,5000095);
});
test('source area limits, min clear and maximum respect real funds',()=>{
 const c=new ClassicController();c.start();assert.throws(()=>c.chip(1),/TARGET/);
 c.select('tie');c.maximum();assert.equal(c.session.state.bets.tie,500000);
 c.chip(10000);assert.equal(c.session.state.bets.tie,500000);
 c.minimum();assert.deepEqual(c.session.state.bets,{});
 c.select('player');c.maximum();assert.equal(c.session.state.bets.player,5000000);c.select('banker');assert.throws(()=>c.chip(1),/FUNDS/);
});
test('source deal uses real card sequence, dimensions, separate third timings',()=>{
 const s=new Session();const cards=[1,14,2,15,3,16];s.state.shoe.order=[...cards,...s.state.shoe.order.filter(x=>!cards.includes(x))];s.state.shoe.cursor=s.state.shoe.burn=0;s.bet('tie',1000);s.confirm();
 const t=roundTimeline(s.state.round.plan);assert.equal(t.cards.length,6);
 assert.deepEqual(t.cards.slice(0,4).map(x=>x.start),[200,600,1000,1400]);
 assert.deepEqual(t.cards.map(x=>x.duration),[200,200,200,200,500,200]);
 assert.deepEqual(t.cards.map(x=>[x.x,x.y]),[[150,120],[417,120],[186,120],[453,120],[222,120],[489,120]]);
 assert.equal(t.cards[5].start,t.cards[4].start+500);assert.equal(t.prompt,t.result+1000);
});
test('source record ratios and reset boundary never change the wallet',()=>{
 const c=new ClassicController();c.start();const s=c.session.state,cards=[2,9,4,6];s.shoe.order=[...cards,...s.shoe.order.filter(x=>!cards.includes(x))];s.shoe.cursor=s.shoe.burn=0;c.select('player');c.chip(100);c.confirm();c.session.skip();
 const balance=c.session.state.balance,r=classicRecord(c.session.state);assert.equal(r.rounds,1);assert.deepEqual(r.ratios,{player:'2.00',banker:'0.00',tie:'0.00',total:'2.00'});
 const cleared=classicRecord(c.session.state,{id:c.session.state.id,after:1});assert.equal(cleared.rounds,0);assert.equal(cleared.ratios.player,'0.00');assert.equal(c.session.state.balance,balance);
 assert.equal(classicRecord(c.session.state,{id:'other',after:999}).rounds,1);
});
