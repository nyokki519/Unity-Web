#!/usr/bin/env node
/** Reproducible, offline CPU match stress harness. Does not serve game routes. */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMatch,legalActions,applyAction,advanceTurn} from '../src/mahjong/match.js';
import {chooseAction} from '../src/mahjong/ai.js';

const CHARACTERS=['moka','sumire','houma','kona'];
const BASE_POINTS=100000;
const INTERPRETATION='Offline deterministic CPU self-play is stability and coverage evidence, not a competitive AI rating or a human gameplay evaluation. Seat and character win shares are descriptive samples; they do not establish relative strength.';

function positiveInteger(value,label,max){
  const parsed=Number(value);
  if(!Number.isSafeInteger(parsed)||parsed<1||parsed>max)throw new RangeError(`${label} must be an integer from 1 to ${max}`);
  return parsed;
}

export function parseSimulationArgs(args){
  const options={matches:20,seed:'unity-mahjong-quality',maxSteps:12000,output:null};
  for(let index=0;index<args.length;index++){
    const flag=args[index];
    if(!['--matches','--seed','--max-steps','--output'].includes(flag))throw new Error(`Unknown option: ${flag}`);
    const value=args[++index];
    if(value===undefined||value.startsWith('--'))throw new Error(`Missing value for ${flag}`);
    if(flag==='--matches')options.matches=positiveInteger(value,'matches',10000);
    if(flag==='--max-steps')options.maxSteps=positiveInteger(value,'max-steps',100000);
    if(flag==='--seed'){
      if(!value.length||value.length>200)throw new RangeError('seed must contain 1 to 200 characters');
      options.seed=value;
    }
    if(flag==='--output')options.output=value;
  }
  return options;
}

function seededRandom(seed){
  let state=2166136261;
  for(const char of String(seed))state=Math.imul(state^char.charCodeAt(0),16777619)>>>0;
  return()=>{
    state=state+0x6d2b79f5|0;
    let value=Math.imul(state^state>>>15,1|state);
    value^=value+Math.imul(value^value>>>7,61|value);
    return((value^value>>>14)>>>0)/4294967296;
  };
}

function validatePoints(match,seed,step){
  const points=match.players.map(player=>player.points);
  if(!points.every(Number.isSafeInteger)||!Number.isSafeInteger(match.riichiPot))throw new Error(`Non-integer points: seed=${seed}, transition=${step}`);
  if(points.reduce((sum,value)=>sum+value,match.riichiPot)!==BASE_POINTS)throw new Error(`Point conservation failed: seed=${seed}, transition=${step}`);
}

export function simulateMatch({seed='unity-mahjong-quality:0',characters=CHARACTERS,maxSteps=12000,decide=chooseAction}={}){
  positiveInteger(maxSteps,'maxSteps',100000);
  if(!Array.isArray(characters)||characters.length!==4||characters.some(value=>typeof value!=='string'))throw new TypeError('characters must contain four character IDs');
  const players=characters.map((characterId,seat)=>({id:`cpu-${seat}`,name:`CPU ${seat+1}`,characterId,isCpu:true}));
  let match=createMatch({players,seed,now:0}),transitions=0,handStart=0;
  const random=seededRandom(`${seed}:cpu`),trace=createHash('sha256'),hands=[],actionCounts={};
  const checks={legalActions:0,revisions:0,pointConservation:0};
  const started=performance.now();
  validatePoints(match,seed,transitions);checks.pointConservation++;
  while(match.phase!=='MATCH_RESULT'){
    if(transitions>=maxSteps)throw new Error(`Exceeded transition budget: seed=${seed}, phase=${match.phase}, revision=${match.revision}, budget=${maxSteps}`);
    const revision=match.revision;
    if(match.phase==='HAND_RESULT'){
      const result=match.result,previous={dealer:match.dealer,handNumber:match.handNumber,honba:match.honba,handsPlayed:match.handsPlayed};
      const dealerContinues=result.type==='abortive'||result.winner===previous.dealer||result.type==='nagashi'&&(result.winners||[result.winner]).includes(previous.dealer)||result.type==='exhaustive'&&(result.tenpai||[]).includes(previous.dealer);
      hands.push({type:result.type,winner:result.winner??null,winners:result.winners??(result.winner===undefined?[]:[result.winner]),winType:result.winType??null,
        reason:result.reason??null,actions:transitions-handStart,normalDraws:match.turnNumber,
        discards:match.players.reduce((sum,player)=>sum+player.discards.length,0),
        yaku:(result.yaku||[]).map(item=>item.id)});
      trace.update(JSON.stringify({result,hands:match.handsPlayed}));
      match=advanceTurn(match,transitions+1);
      if(match.dealer!==(dealerContinues?previous.dealer:(previous.dealer+1)%4)||match.handNumber!==previous.handNumber+(dealerContinues?0:1)||match.honba!==(dealerContinues||result.type==='exhaustive'?previous.honba+1:0)||match.handsPlayed!==previous.handsPlayed+1)throw new Error(`Invalid hand progression: seed=${seed}, transition=${transitions}, outcome=${result.type}`);
      handStart=transitions+1;
    }else{
      let seat,actions;
      for(let candidate=0;candidate<4;candidate++){
        const offered=legalActions(match,candidate);
        if(offered.length){seat=candidate;actions=offered;break;}
      }
      if(seat===undefined)throw new Error(`No legal actor: seed=${seed}, phase=${match.phase}, revision=${match.revision}`);
      const action=decide(match,seat,random),serialized=JSON.stringify(action);
      if(!actions.some(candidate=>JSON.stringify(candidate)===serialized))throw new Error(`Illegal CPU recommendation: seed=${seed}, revision=${match.revision}, seat=${seat}, action=${serialized}`);
      checks.legalActions++;
      actionCounts[action.type]=(actionCounts[action.type]||0)+1;
      trace.update(JSON.stringify({seat,action,revision}));
      match=applyAction(match,seat,action,match.revision,transitions+1);
    }
    transitions++;
    if(match.revision!==revision+1)throw new Error(`Non-monotonic revision: seed=${seed}, transition=${transitions}`);
    checks.revisions++;
    validatePoints(match,seed,transitions);checks.pointConservation++;
  }
  const rankings=match.result.rankings;
  if(!Array.isArray(rankings)||rankings.length!==4||rankings.some(row=>!row||!Number.isInteger(row.seat)||row.seat<0||row.seat>3||!Number.isSafeInteger(row.points))||new Set(rankings.map(row=>row.seat)).size!==4||rankings.some((row,index)=>row.rank!==index+1||row.points!==match.players[row.seat]?.points)||rankings.some((row,index)=>index>0&&rankings[index-1].points<row.points))throw new Error(`Invalid final rankings: seed=${seed}`);
  return {seed,characters:[...characters],phase:match.phase,transitions,hands,rankings:rankings.map(row=>({seat:row.seat,rank:row.rank,points:row.points})),actionCounts,checks,
    finalPoints:match.players.map(player=>player.points),riichiPot:match.riichiPot,
    firstPlaceSeat:match.result.rankings[0].seat,traceHash:trace.digest('hex'),runtimeMs:performance.now()-started};
}

export function summarizeSimulation(records,{seed='unity-mahjong-quality',maxSteps=12000}={}){
  if(!Array.isArray(records)||!records.length)throw new TypeError('At least one match record is required');
  const handOutcomes={win:0,exhaustive:0,abortive:0,nagashi:0},actionCounts={},yakuCoverage={};
  const bySeat=Array.from({length:4},(_,seat)=>({seat,matches:0,handOpportunities:0,wins:0,firstPlaces:0}));
  const characters=new Map();
  let hands=0,transitions=0,discards=0,normalDraws=0,actions=0,totalMs=0;
  const checks={legalActions:0,revisions:0,pointConservation:0};
  for(const record of records){
    transitions+=record.transitions;hands+=record.hands.length;totalMs+=record.runtimeMs;
    for(const [key,count]of Object.entries(record.checks))checks[key]+=count;
    for(const [key,count]of Object.entries(record.actionCounts))actionCounts[key]=(actionCounts[key]||0)+count;
    record.characters.forEach((id,seat)=>{
      if(!characters.has(id))characters.set(id,{characterId:id,matches:0,handOpportunities:0,wins:0,firstPlaces:0});
      const char=characters.get(id),row=bySeat[seat];
      char.matches++;char.handOpportunities+=record.hands.length;
      row.matches++;row.handOpportunities+=record.hands.length;
      if(record.firstPlaceSeat===seat){row.firstPlaces++;char.firstPlaces++;}
    });
    for(const hand of record.hands){
      handOutcomes[hand.type]=(handOutcomes[hand.type]||0)+1;
      discards+=hand.discards;normalDraws+=hand.normalDraws;actions+=hand.actions;
      for(const seat of hand.winners||[]){bySeat[seat].wins++;characters.get(record.characters[seat]).wins++;}
      for(const id of hand.yaku)yakuCoverage[id]=(yakuCoverage[id]||0)+1;
    }
  }
  const rates=row=>({...row,winRatePerHand:row.wins/row.handOpportunities,firstPlaceRate:row.firstPlaces/row.matches});
  return {seed,maxSteps,matches:records.length,terminatedMatches:records.filter(row=>row.phase==='MATCH_RESULT').length,
    hands,transitions,checks,handOutcomes,actionCounts,yakuCoverage,
    averageHandLength:{actions:actions/hands,discards:discards/hands,normalDraws:normalDraws/hands},
    bySeat:bySeat.map(rates),byCharacter:[...characters.values()].map(rates),
    runtime:{totalMs,meanMatchMs:totalMs/records.length,meanTransitionMs:totalMs/transitions},
    interpretation:INTERPRETATION,records};
}

function sourceFingerprint(){
  const files=['match.js','ai.js','reference-ai.js','hand.js','score.js','yaku.js','tiles.js'];
  const entries=files.map(file=>[file,new URL(`../src/mahjong/${file}`,import.meta.url)]);
  entries.push(['harness',new URL(import.meta.url)],['package-lock.json',new URL('../package-lock.json',import.meta.url)]);
  return Object.fromEntries(entries.map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')]));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const options=parseSimulationArgs(process.argv.slice(2)),sources=sourceFingerprint(),records=[];
    for(let index=0;index<options.matches;index++){
      const characters=CHARACTERS.map((_,seat)=>CHARACTERS[(seat+index)%4]);
      records.push(simulateMatch({seed:`${options.seed}:${index}`,characters,maxSteps:options.maxSteps}));
      process.stderr.write(`Mahjong self-play ${index+1}/${options.matches}: ${records.at(-1).hands.length} hands, ${records.at(-1).transitions} transitions\n`);
    }
    const report={generatedAt:new Date().toISOString(),nodeVersion:process.version,sourceSHA256:sources,
      method:'All four existing character IDs rotate one seat per match. normalDraws includes the opening dealer draw and excludes kan replacement draws. Runtime includes assertions and instrumentation, not rendering or network transport.',
      ...summarizeSimulation(records,options)};
    const json=JSON.stringify(report,null,2)+'\n';
    if(options.output){const output=resolve(options.output);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,json);}
    process.stdout.write(json);
  }catch(error){process.stderr.write(`${error.stack||error}\n`);process.exitCode=1;}
}
