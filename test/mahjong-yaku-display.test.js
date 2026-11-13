import test from 'node:test';
import assert from 'node:assert/strict';
import {renderYakuSummary,yakuLabel} from '../public/mahjong/src/yaku-labels.js';
import {renderApp} from '../public/mahjong/src/app.js';

test('all supported public yaku IDs have readable Japanese labels',()=>{
 const labels=[
  ['riichi','立直'],['double-riichi','ダブル立直'],['ippatsu','一発'],['menzen-tsumo','門前清自摸和'],
  ['tanyao','断么九'],['pinfu','平和'],['iipeikou','一盃口'],['ryanpeikou','二盃口'],
  ['yakuhai-round','場風牌'],['yakuhai-seat','自風牌'],['chankan','槍槓'],['rinshan','嶺上開花'],
  ['haitei','海底摸月'],['houtei','河底撈魚'],['chiitoitsu','七対子'],['toitoi','対々和'],
  ['sanankou','三暗刻'],['sankantsu','三槓子'],['sanshoku-doujun','三色同順'],['sanshoku-doukou','三色同刻'],
  ['ittsu','一気通貫'],['chanta','混全帯么九'],['junchan','純全帯么九'],['honroutou','混老頭'],
  ['honitsu','混一色'],['chinitsu','清一色'],['shousangen','小三元'],['daisangen','大三元'],
  ['shousuushii','小四喜'],['daisuushii','大四喜'],['tsuuiisou','字一色'],['chinroutou','清老頭'],
  ['ryuuiisou','緑一色'],['kokushi','国士無双'],['suuankou','四暗刻'],['suukantsu','四槓子'],
  ['chuuren','九蓮宝燈'],['tenhou','天和'],['chiihou','地和'],['dora','ドラ'],['ura-dora','裏ドラ'],['aka-dora','赤ドラ']
 ];
 for(const [id,expected] of labels)assert.equal(yakuLabel({id}),expected,id);
 assert.equal(yakuLabel({id:'yakuhai-dragon-31'}),'役牌 白');
 assert.equal(yakuLabel({id:'yakuhai-dragon-32'}),'役牌 發');
 assert.equal(yakuLabel({id:'yakuhai-dragon-33'}),'役牌 中');
});

test('hand result shows Japanese yaku names and distinguishes double yakuman',()=>{
 const markup=renderYakuSummary([
  {id:'riichi',han:1},
  {id:'yakuhai-dragon-31',han:1},
  {id:'daisuushii',han:26,yakuman:2}
 ]);
 assert.match(markup,/成立役/);assert.match(markup,/立直/);assert.match(markup,/白/);
 assert.match(markup,/大四喜/);assert.match(markup,/ダブル役満/);
});

test('unknown public yaku labels are escaped instead of injecting markup',()=>{
 const markup=renderYakuSummary([{id:'<img src=x>',han:1}]);
 assert.match(markup,/&lt;img src=x&gt;/);assert.doesNotMatch(markup,/<img/);
});

test('hand-result table renders the actual public winning yaku',()=>{
 const players=Array.from({length:4},(_,seat)=>({name:`席${seat+1}`,points:25000,handCount:13,hand:[],discards:[],melds:[]}));
 const markup=renderApp({screen:'table',characterId:'moka',view:{phase:'HAND_RESULT',dealer:0,players,legalActions:[],result:{type:'win',winner:0,winType:'tsumo',han:26,fu:0,yaku:[{id:'kokushi',han:26,yakuman:2}]}}});
 assert.match(markup,/国士無双/);assert.match(markup,/ダブル役満 ×2/);assert.match(markup,/役満 ×2/);assert.doesNotMatch(markup,/26翻/);
});
