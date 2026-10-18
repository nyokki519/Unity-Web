import test from'node:test';import assert from'node:assert/strict';import{frameDelta}from'../public/silver-ring/src/frame-time.js';
test('stale RAF time never drives physics or camera interpolation backwards',()=>{assert.equal(frameDelta(1000,3000),0);assert.equal(frameDelta(2999,3000),0);const dt=frameDelta(1000,3000),k=1-Math.exp(-2.6*dt);assert.ok(k>=0&&k<=1)});
test('initial and resumed frames are bounded while ordinary frame times survive',()=>{assert.equal(frameDelta(20,null),0);assert.equal(frameDelta(10000,20),.05);assert.equal(frameDelta(1016,1000),.016)});
