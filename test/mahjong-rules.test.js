import test from 'node:test';
import assert from 'node:assert/strict';
import { createWall, sortHand, tileType, tileSuit, tileRank } from '../src/mahjong/tiles.js';
import { isCompleteHand, enumerateWinningForms } from '../src/mahjong/hand.js';

// Literal types use m=0..8, p=9..17, s=18..26, honors=27..33.
const standard = [0,1,2,9,10,11,18,19,20,24,25,26,27,27];
test('wall contains four of every normalized type and exactly one red five per suit', () => {
  const wall = createWall(123);
  assert.equal(wall.length, 136);
  for (let type = 0; type < 34; type++) assert.equal(wall.filter(t => tileType(t) === type).length, 4);
  assert.equal(wall.filter(t => t >= 34).length, 3);
  assert.deepEqual([34,35,36].map(t => wall.filter(x => x === t).length), [1,1,1]);
  assert.deepEqual([tileType(34),tileSuit(35),tileRank(36)], [4,'p',5]);
});
test('seeded wall is repeatable across calls and different seeds change the deal', () => {
  assert.deepEqual(createWall('coffee'), createWall('coffee'));
  assert.notDeepEqual(createWall('coffee'), createWall('tea'));
});
test('sortHand sorts red fives with their suit without mutating its input', () => {
  const hand = [33,35,3,34,4,9,36,18];
  assert.deepEqual(sortHand(hand), [3,4,34,9,35,18,36,33]);
  assert.deepEqual(hand, [33,35,3,34,4,9,36,18]);
});
test('standard hands decompose into four groups and one pair', () => {
  assert.equal(isCompleteHand(standard, []), true);
  assert.equal(isCompleteHand(standard.slice(1), []), false);
  assert.equal(isCompleteHand([...standard.slice(0,13),28], []), false);
  const forms = enumerateWinningForms(standard, []);
  assert.equal(forms[0].type, 'standard');
  assert.equal(forms[0].pair, 27);
  assert.equal(forms[0].groups.length, 4);
});
test('open melds and concealed kans count as one complete group each', () => {
  const concealed = [9,10,11,18,19,20,24,25,26,27,27];
  assert.equal(isCompleteHand(concealed, [{type:'chi',tiles:[0,1,2],open:true}]), true);
  assert.equal(isCompleteHand(concealed, [{type:'kan',tiles:[0,0,0,0],open:false}]), true);
  assert.equal(isCompleteHand(concealed, [{type:'chi',tiles:[0,1,3],open:true}]), false);
});
test('seven distinct pairs win, while counting a quadruplet twice does not', () => {
  assert.equal(enumerateWinningForms([0,0,2,2,10,10,12,12,20,20,28,28,33,33], []).some(f => f.type === 'chiitoitsu'), true);
  assert.equal(isCompleteHand([0,0,0,0,2,2,10,10,20,20,28,28,33,33], []), false);
});
test('thirteen orphans require every terminal and honor and one duplicate', () => {
  const hand = [0,8,9,17,18,26,27,28,29,30,31,32,33,33];
  assert.equal(enumerateWinningForms(hand, [])[0].type, 'kokushi');
  assert.equal(isCompleteHand([...hand.slice(1),33], []), false);
});
test('illegal tile counts and five copies of a type are rejected', () => {
  assert.equal(isCompleteHand([0,0,0,0,0,1,2,3,9,10,11,27,27,27], []), false);
  assert.equal(isCompleteHand(standard.map(t => t === 0 ? 37 : t), []), false);
});
test('ambiguous sequences and pairs retain all winning decompositions', () => {
  const forms = enumerateWinningForms([0,0,1,1,2,2,3,3,4,4,5,5,6,6], []);
  assert.equal(forms.some(f => f.type === 'chiitoitsu'), true);
  assert.ok(forms.filter(f => f.type === 'standard').length > 1);
});

import { evaluateYaku } from '../src/mahjong/yaku.js';
import { calculatePayments } from '../src/mahjong/score.js';
const pinfuHand = [0,1,2,3,4,5,10,11,12,23,24,25,13,13];
const noYakuHand = [0,1,2,3,4,5,10,11,12,24,25,26,27,27];
const simpleHand = [1,2,3,3,4,5,12,13,14,23,24,25,10,10];
const base = {concealed:pinfuHand,melds:[],winningTile:0,winType:'ron',seatWind:2,roundWind:1};
const names = result => result?.yaku.map(y => y.id) ?? [];
test('closed two-sided sequences score pinfu with 30 fu ron or 20 fu tsumo', () => {
  assert.deepEqual(evaluateYaku(base), {yaku:[{id:'pinfu',han:1}],han:1,fu:30});
  const result = evaluateYaku({...base,winType:'tsumo'});
  assert.equal(result.han, 2);
  assert.equal(result.fu, 20);
  assert.ok(names(result).includes('menzen-tsumo'));
});
test('riichi, double riichi and ippatsu use mutually exclusive declaration han', () => {
  assert.equal(evaluateYaku({...base,riichi:true,ippatsu:true}).han, 3);
  const double = evaluateYaku({...base,riichi:true,doubleRiichi:true,ippatsu:true});
  assert.equal(double.han, 4);
  assert.ok(names(double).includes('double-riichi'));
  assert.equal(names(double).includes('riichi'), false);
});
test('tanyao is legal with closed and open hands under kuitan', () => {
  assert.ok(names(evaluateYaku({...base,concealed:simpleHand,winningTile:1})).includes('tanyao'));
  const result = evaluateYaku({...base,concealed:simpleHand.slice(3),winningTile:3,melds:[{type:'chi',tiles:[1,2,3],open:true}]});
  assert.ok(names(result).includes('tanyao'));
  assert.equal(names(result).includes('pinfu'), false);
});
test('dragon and matching seat/round wind triplets award separate yakuhai', () => {
  const result = evaluateYaku({...base,concealed:[31,31,31,27,27,27,0,1,2,12,13,14,18,18],seatWind:1,winningTile:2});
  assert.equal(result.han, 3);
  assert.deepEqual(names(result).sort(), ['yakuhai-dragon-31','yakuhai-round','yakuhai-seat']);
  assert.equal(result.fu, 50);
});
test('seven pairs have fixed 25 fu and thirteen orphans score one yakuman', () => {
  const pairs = evaluateYaku({...base,concealed:[0,0,2,2,10,10,12,12,20,20,28,28,33,33],winningTile:33});
  assert.deepEqual(pairs, {yaku:[{id:'chiitoitsu',han:2}],han:2,fu:25});
  const orphans = evaluateYaku({...base,concealed:[0,8,9,17,18,26,27,28,29,30,31,32,33,33],winningTile:33});
  assert.deepEqual(orphans, {yaku:[{id:'kokushi',han:13,yakuman:1}],han:13,fu:0});
});
test('ron rejects permanent, temporary and riichi furiten while tsumo remains legal', () => {
  for (const key of ['furiten','temporaryFuriten','riichiFuriten']) {
    assert.equal(evaluateYaku({...base,[key]:true}), null);
    assert.ok(evaluateYaku({...base,[key]:true,winType:'tsumo'}));
  }
});
test('incomplete or no-yaku hands cannot win even with bonus dora', () => {
  assert.equal(evaluateYaku({...base,concealed:pinfuHand.slice(2)}), null);
  assert.equal(evaluateYaku({...base,concealed:noYakuHand,winningTile:0,doraIndicators:[8]}), null);
});
test('wait fu distinguish edge, closed and pair waits from two-sided pinfu', () => {
  for (const winningTile of [2,1,13]) {
    const result = evaluateYaku({...base,winningTile,riichi:true});
    assert.equal(names(result).includes('pinfu'), false);
    assert.equal(result.fu, 40);
  }
});
test('ron-completed triplets use open fu; concealed and open kans use correct fu', () => {
  const hand = [0,0,0,9,10,11,18,19,20,24,25,26,31,31];
  assert.equal(evaluateYaku({...base,concealed:hand,winningTile:0,riichi:true}).fu, 40);
  assert.equal(evaluateYaku({...base,concealed:hand,winningTile:11,riichi:true}).fu, 50);
  for (const [open,fu] of [[true,50],[false,60]]) {
    const result = evaluateYaku({...base,concealed:[9,10,11,18,19,20,24,25,26,31,31],winningTile:11,melds:[{type:'kan',tiles:[0,0,0,0],open}],rinshan:true,winType:'tsumo'});
    assert.equal(result.fu, fu);
    assert.ok(names(result).includes('rinshan'));
  }
});
test('kan robbery and last-tile events award their yaku for the matching win type', () => {
  for (const [flag,winType] of [['chankan','ron'],['rinshan','tsumo'],['haitei','tsumo'],['houtei','ron']]) {
    assert.ok(names(evaluateYaku({...base,[flag]:true,winType})).includes(flag));
  }
});
test('red, indicator and riichi-only ura dora add han after a real yaku', () => {
  const result = evaluateYaku({...base,concealed:pinfuHand.map((t,i) => i === 4 ? 34 : t),riichi:true,doraIndicators:[3],uraIndicators:[12]});
  assert.equal(result.han, 6); // pinfu + riichi + red five + 5m + two 5p.
  assert.equal(evaluateYaku({...base,uraIndicators:[12]}).han, 1);
  assert.equal(evaluateYaku({...base,riichi:true,doraIndicators:[30,33,8,17,26]}).han, 3); // west/north, dragon, suit-wrap: 1m.
});
test('standard sequence, triplet and suit yaku award open/closed han', () => {
  const fixtures = [
    {hand:[0,1,2,0,1,2,9,10,11,18,19,20,27,27],id:'iipeikou',han:1},
    {hand:[0,1,2,9,10,11,18,19,20,24,25,26,27,27],id:'sanshoku-doujun',han:2},
    {hand:[0,1,2,3,4,5,6,7,8,9,9,9,27,27],id:'ittsu',han:2},
    {hand:[0,0,0,9,9,9,18,18,18,31,31,31,27,27],id:'toitoi',han:2},
    {hand:[0,1,2,3,4,5,6,7,8,31,31,31,27,27],id:'honitsu',han:3},
    {hand:[0,1,2,2,3,4,3,4,5,6,7,8,1,1],id:'chinitsu',han:6},
    {hand:[0,1,2,6,7,8,9,10,11,24,25,26,27,27],id:'chanta',han:2},
    {hand:[0,1,2,6,7,8,9,10,11,24,25,26,8,8],id:'junchan',han:3},
  ];
  for (const fixture of fixtures) {
    const result = evaluateYaku({...base,concealed:fixture.hand,winningTile:fixture.hand[0],riichi:true});
    assert.equal(result.yaku.find(y => y.id === fixture.id)?.han, fixture.han, fixture.id);
  }
});
test('yakuman triplet and honor patterns override ordinary yaku and dora', () => {
  const fixtures = [
    {hand:[31,31,31,32,32,32,33,33,33,0,1,2,27,27],id:'daisangen'},
    {hand:[27,27,27,28,28,28,29,29,29,30,30,30,31,31],id:'daisuushii'},
    {hand:[0,0,0,8,8,8,9,9,9,26,26,26,18,18],id:'chinroutou'},
    {hand:[19,19,19,20,20,20,21,21,21,23,23,23,32,32],id:'ryuuiisou'},
    {hand:[0,0,0,1,2,3,4,4,5,6,7,8,8,8],id:'chuuren'},
  ];
  for (const {hand,id} of fixtures) {
    const result = evaluateYaku({...base,concealed:hand,winningTile:hand[0],winType:'tsumo',doraIndicators:[8]});
    assert.ok(names(result).includes(id),id);
    assert.equal(result.fu, 0);
    assert.equal(result.yaku.every(y => y.yakuman), true);
  }
});
const paymentFixtures = [
  {winner:1,loser:2,dealer:0,winType:'ron',han:1,fu:30,want:[0,1000,-1000,0]},
  {winner:0,loser:2,dealer:0,winType:'ron',han:1,fu:30,want:[1500,0,-1500,0]},
  {winner:1,dealer:0,winType:'tsumo',han:1,fu:30,want:[-500,1100,-300,-300]},
  {winner:0,dealer:0,winType:'tsumo',han:1,fu:30,want:[1500,-500,-500,-500]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:4,fu:40,want:[0,8000,-8000,0]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:3,fu:70,want:[0,8000,-8000,0]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:5,fu:30,want:[0,8000,-8000,0]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:6,fu:30,want:[0,12000,-12000,0]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:8,fu:30,want:[0,16000,-16000,0]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:11,fu:30,want:[0,24000,-24000,0]},
  {winner:1,loser:2,dealer:0,winType:'ron',han:13,fu:0,want:[0,32000,-32000,0]},
  {winner:0,loser:2,dealer:0,winType:'ron',han:26,fu:0,yakuman:2,want:[96000,0,-96000,0]},
];
for (const {want,...context} of paymentFixtures) test(`payments ${JSON.stringify(context)}`, () => {
  assert.deepEqual(calculatePayments(context).deltas, want);
});
test('honba is included in total deltas and separately reported; riichi pot goes to winner', () => {
  assert.deepEqual(calculatePayments({winner:1,loser:3,dealer:0,winType:'ron',han:1,fu:30,honba:2,riichiPot:2000}), {deltas:[0,3600,0,-1600],honbaDelta:[0,600,0,-600],riichiPotWinner:1});
  assert.deepEqual(calculatePayments({winner:1,dealer:0,winType:'tsumo',han:1,fu:30,honba:2}), {deltas:[-700,1700,-500,-500],honbaDelta:[-200,600,-200,-200],riichiPotWinner:null});
});
test('exhaustive draws exchange exactly 3000 points between tenpai and noten seats', () => {
  for (const [tenpai,want] of [[[],[0,0,0,0]],[[0],[3000,-1000,-1000,-1000]],[[0,2],[1500,-1500,1500,-1500]],[[0,1,2],[1000,1000,1000,-3000]],[[0,1,2,3],[0,0,0,0]]]) {
    assert.deepEqual(calculatePayments({type:'exhaustive',tenpai,riichiPot:3000}).deltas,want);
    assert.equal(calculatePayments({type:'exhaustive',tenpai,riichiPot:3000}).riichiPotWinner,null);
  }
});
test('abortive draws preserve points and nagashi mangan uses mangan tsumo payments', () => {
  assert.deepEqual(calculatePayments({type:'abortive'}).deltas,[0,0,0,0]);
  assert.deepEqual(calculatePayments({type:'nagashi',winner:1,dealer:0,honba:1}).deltas,[-4100,8300,-2100,-2100]);
});

test('multiple nagashi mangan winners exchange mangan payments and award the riichi pot once',()=>{
 const result=calculatePayments({type:'nagashi',winner:1,winners:[1,2],dealer:0,winType:'tsumo',honba:1,riichiPot:1000});
 assert.deepEqual(result.deltas,[-8200,7200,6200,-4200]);
 assert.deepEqual(result.honbaDelta,[-200,200,200,-200]);
 assert.equal(result.riichiPotWinner,1);assert.equal(result.deltas.reduce((sum,value)=>sum+value,0),1000);
});
test('invalid scoring contexts are rejected instead of creating NaN or fractional deltas', () => {
  assert.throws(() => calculatePayments({winner:1,loser:1,dealer:0,winType:'ron',han:1,fu:30}), /invalid/i);
  assert.throws(() => calculatePayments({winner:1,loser:2,dealer:0,winType:'ron',han:0,fu:30}), /invalid/i);
});
test('multiple yakuman remain separate for the payment caller to count', () => {
  const result = evaluateYaku({...base,concealed:[27,27,27,28,28,28,29,29,29,30,30,30,31,31],winningTile:31,winType:'tsumo'});
  assert.deepEqual(names(result).sort(), ['daisuushii','suuankou','tsuuiisou']);
  assert.equal(result.han,39);
});
test('three concealed triplets and small three dragons are ordinary two-han yaku', () => {
  const result = evaluateYaku({...base,concealed:[31,31,31,32,32,32,0,0,0,9,10,11,33,33],winningTile:10});
  assert.equal(result.yaku.find(y => y.id === 'sanankou')?.han,2);
  assert.equal(result.yaku.find(y => y.id === 'shousangen')?.han,2);
  assert.equal(result.fu,60);
});
test('two pairs of identical sequences score ryanpeikou instead of iipeikou or seven pairs', () => {
  const result = evaluateYaku({...base,concealed:[0,0,1,1,2,2,9,9,10,10,11,11,28,28],winningTile:0});
  assert.ok(names(result).includes('ryanpeikou'));
  assert.equal(names(result).includes('iipeikou'),false);
  assert.equal(names(result).includes('chiitoitsu'),false);
});
test('open sequences have reduced han and cannot declare riichi or claim ura dora', () => {
  const melds = [{type:'chi',tiles:[0,1,2],open:true}];
  const result = evaluateYaku({...base,concealed:[9,10,11,18,19,20,24,25,26,27,27],winningTile:20,melds,riichi:true,doubleRiichi:true,ippatsu:true,uraIndicators:[26]});
  assert.equal(result.yaku.find(y => y.id === 'sanshoku-doujun')?.han,1);
  assert.equal(result.yaku.find(y => y.id === 'chanta')?.han,1);
  for (const id of ['riichi','double-riichi','ippatsu','ura-dora','menzen-tsumo']) assert.equal(names(result).includes(id),false);
});
test('double-valued wind pair contributes four fu and cannot be pinfu', () => {
  const result = evaluateYaku({...base,concealed:[0,1,2,3,4,5,10,11,12,23,24,25,27,27],winningTile:27,seatWind:1,riichi:true});
  assert.equal(result.fu,40); // base20 + closed ron10 + wind pair4 + tanki2.
  assert.equal(names(result).includes('pinfu'),false);
});
test('concealed pre-win hand may pass winningTile separately without mutating it', () => {
  const concealed = pinfuHand.slice(1);
  assert.deepEqual(evaluateYaku({...base,concealed}),evaluateYaku(base));
  assert.equal(concealed.length,13);
});
test('seed fixture preserves a recorded wall order', () => {
  assert.deepEqual(createWall('coffee').slice(0,16), [22,30,19,11,26,30,17,0,36,8,24,23,21,15,28,0]);
});
test('kan melds award three/four kan yaku and all four physical tiles count as dora', () => {
  const kans = [0,9,18].map(t => ({type:'kan',tiles:[t,t,t,t],open:true}));
  const three = evaluateYaku({...base,concealed:[31,31,31,27,27],winningTile:31,melds:kans,doraIndicators:[8]});
  assert.equal(three.yaku.find(y => y.id === 'sankantsu')?.han,2);
  assert.equal(three.yaku.find(y => y.id === 'sanshoku-doukou')?.han,2);
  assert.equal(three.yaku.find(y => y.id === 'honroutou')?.han,2);
  assert.equal(three.yaku.find(y => y.id === 'dora')?.han,4);
  const four = evaluateYaku({...base,concealed:[27,27],winningTile:27,melds:[...kans,{type:'kan',tiles:[31,31,31,31],open:true}]});
  assert.ok(names(four).includes('suukantsu'));
});
test('small four winds award yakuman with the fourth wind as pair', () => {
  const result = evaluateYaku({...base,concealed:[27,27,27,28,28,28,29,29,29,0,1,2,30,30],winningTile:0});
  assert.ok(names(result).includes('shousuushii'));
});
test('open all-sequence hand has the minimum 30 fu even without extra fu', () => {
  const result = evaluateYaku({...base,concealed:[9,10,11,18,19,20,24,25,26,13,13],winningTile:18,melds:[{type:'chi',tiles:[0,1,2],open:true}]});
  assert.equal(result.fu,30);
});
test('ordinary 25-fu seven-pair payments round separately for dealer and nondealer tsumo payers', () => {
  assert.deepEqual(calculatePayments({winner:1,dealer:0,winType:'tsumo',han:2,fu:25}).deltas,[-800,1600,-400,-400]);
  assert.deepEqual(calculatePayments({winner:1,loser:2,dealer:0,winType:'ron',han:4,fu:30}).deltas,[0,7700,-7700,0]);
});
