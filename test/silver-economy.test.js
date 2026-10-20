import test from 'node:test';import assert from 'node:assert/strict';import{CFG}from'../public/silver-ring/src/config.js';
test('normal challenge has 200 paid shots at 200 credits per shot',()=>{assert.equal(CFG.eco.ballCost,200);assert.equal(CFG.eco.start,40000);assert.equal(CFG.eco.start/CFG.eco.ballCost,200)});
