import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSimulationArgs,simulateMatch,summarizeSimulation} from '../tools/mahjong-match-simulate.mjs';

test('Mahjong simulation CLI validates bounded reproducible inputs',()=>{
  assert.deepEqual(parseSimulationArgs(['--matches','2','--seed','review','--max-steps','9000','--output','/tmp/mj.json']),
    {matches:2,seed:'review',maxSteps:9000,output:'/tmp/mj.json'});
  assert.throws(()=>parseSimulationArgs(['--matches','0']),/matches/);
  assert.throws(()=>parseSimulationArgs(['--max-steps','2.5']),/max-steps/);
  assert.throws(()=>parseSimulationArgs(['--unknown','2']),/Unknown/);
});

test('seeded Mahjong harness validates full matches and reports reproducible gameplay',{timeout:60000},()=>{
  const first=simulateMatch({seed:'quality-harness-test',maxSteps:12000});
  const second=simulateMatch({seed:'quality-harness-test',maxSteps:12000});
  assert.equal(first.phase,'MATCH_RESULT');
  assert.equal(first.checks.legalActions,first.transitions-first.hands.length);
  assert.equal(first.checks.revisions,first.transitions);
  assert.equal(first.checks.pointConservation,first.transitions+1);
  assert.ok(first.hands.length>=4&&first.hands.length<=12);
  assert.equal(first.finalPoints.reduce((sum,value)=>sum+value,first.riichiPot),100000);
  assert.equal(first.rankings.length,4);
  assert.deepEqual(first.rankings.map(row=>row.rank),[1,2,3,4]);
  assert.ok(first.rankings.every(row=>row.points===first.finalPoints[row.seat]));
  assert.ok(first.rankings.every((row,index)=>index===0||first.rankings[index-1].points>=row.points));
  assert.equal(first.traceHash,second.traceHash);
  assert.deepEqual(first.finalPoints,second.finalPoints);
  assert.deepEqual(first.hands,second.hands);
  const report=summarizeSimulation([first,second],{seed:'quality-harness-test'});
  assert.equal(report.matches,2);
  assert.equal(report.terminatedMatches,2);
  assert.equal(report.hands,first.hands.length*2);
  assert.equal(report.handOutcomes.win+report.handOutcomes.exhaustive+report.handOutcomes.abortive+report.handOutcomes.nagashi,report.hands);
  assert.equal(report.bySeat.reduce((sum,row)=>sum+row.firstPlaces,0),2);
  assert.equal(report.byCharacter.reduce((sum,row)=>sum+row.firstPlaces,0),2);
  assert.ok(report.runtime.totalMs>0);
  assert.match(report.interpretation,/not.*competitive/i);
});

test('independent seeds complete with ordered four-seat rankings and conserved points',{timeout:60000},()=>{
 for(const seed of ['multi-seed-a','multi-seed-b','multi-seed-c']){
  const record=simulateMatch({seed,maxSteps:12000});
  assert.equal(record.phase,'MATCH_RESULT',seed);assert.equal(record.rankings.length,4,seed);
  assert.deepEqual(record.rankings.map(row=>row.rank),[1,2,3,4],seed);
  assert.ok(record.rankings.every((row,index)=>row.points===record.finalPoints[row.seat]&&(index===0||record.rankings[index-1].points>=row.points)),seed);
  assert.equal(record.finalPoints.reduce((sum,value)=>sum+value,record.riichiPot),100000,seed);
 }
});

test('harness rejects an illegal policy recommendation instead of silently continuing',()=>{
  assert.throws(()=>simulateMatch({seed:'illegal-policy-test',decide:()=>({type:'discard',tile:999})}),/Illegal CPU recommendation/);
});

test('harness fails explicitly when a match exceeds its transition budget',()=>{
  assert.throws(()=>simulateMatch({seed:'budget-test',maxSteps:1}),/transition budget/);
});
