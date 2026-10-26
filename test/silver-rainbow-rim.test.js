import test from 'node:test';
import assert from 'node:assert/strict';
import {createRainbowRim,updateRainbowRim} from '../public/silver-ring/src/rainbow-rim.js';
test('rainbow actually changes vertex colors while its geometry stays fixed',()=>{
 const ring=createRainbowRim(.023),positions=Array.from(ring.geometry.attributes.position.array),before=Array.from(ring.geometry.attributes.color.array);
 updateRainbowRim(ring,.5,false);
 assert.notDeepEqual(Array.from(ring.geometry.attributes.color.array),before);
 assert.deepEqual(Array.from(ring.geometry.attributes.position.array),positions);
 assert.equal(ring.rotation.z,0);
 const paused=Array.from(ring.geometry.attributes.color.array);updateRainbowRim(ring,1,true);
 assert.deepEqual(Array.from(ring.geometry.attributes.color.array),paused);
});
