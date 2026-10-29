import test from 'node:test';
import assert from 'node:assert/strict';
// Losing a denomination or expanding every chip instead of bounding the list breaks these checks.
test('chip arithmetic is exact, bounded and validates public inputs', async () => {
  const { CHIP_DENOMINATIONS, chipAsset, wagerChips } = await import('../public/baccarat/chips.js');
  assert.deepEqual(CHIP_DENOMINATIONS, [50000,10000,5000,1000,500,100]);
  assert.equal(chipAsset(500), './chips/500.svg');
  assert.throws(() => chipAsset(42), RangeError);
  for (const [amount,visible,totalCount] of [[0,[],0],[100,[100],1],[500,[500],1],[1100,[1000,100],2],[1000000,[50000,50000,50000,50000,50000],20]]) {
    assert.deepEqual(wagerChips(amount), {visible, totalCount, hiddenCount:totalCount-visible.length});
  }
  assert.deepEqual(wagerChips(1100,1),{visible:[1000],totalCount:2,hiddenCount:1});
  assert.deepEqual(wagerChips(99),{visible:[],totalCount:0,hiddenCount:0});
  const huge = wagerChips(Number.MAX_SAFE_INTEGER,12);
  assert.equal(huge.visible.length,12);
  let remainder=BigInt(Number.MAX_SAFE_INTEGER), count=0n;
  for(const d of CHIP_DENOMINATIONS){ count+=remainder/BigInt(d); remainder%=BigInt(d); }
  assert.equal(huge.totalCount,Number(count));
  for(const value of [-1,1.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'100']) assert.throws(()=>wagerChips(value),RangeError);
  for(const cap of [0,-1,13,1.5,NaN,'5']) assert.throws(()=>wagerChips(100,cap),RangeError);
});

test('every denomination asset is self contained with legible outlined digits and community crest', async () => {
  const {readFile} = await import('node:fs/promises');
  const {CHIP_DENOMINATIONS} = await import('../public/baccarat/chips.js');
  const assets = await Promise.all(CHIP_DENOMINATIONS.map(d=>readFile(new URL(`../public/baccarat/chips/${d}.svg`,import.meta.url),'utf8')));
  for(const [i,svg] of assets.entries()) {
    assert.match(svg,/viewBox="0 0 256 256"/);
    assert.ok(svg.includes(`aria-label="${CHIP_DENOMINATIONS[i]/100} Unity chip"`));
    assert.match(svg,/data:image\/png;base64,/);
    assert.doesNotMatch(svg,/<text\b|https?:\/\/(?!www\.w3\.org)/);
    assert.match(svg,/scale\([^)]* -/);
  }
  assert.equal(new Set(assets).size,6);
});
