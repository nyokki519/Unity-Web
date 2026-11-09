import {fail} from '../errors.js';

export const TIER_ORDER=Object.freeze(['S','A','B','C','D']);
const RESERVED_ITEM_IDS=new Set(['__proto__','prototype','constructor','toString','toLocaleString','valueOf','hasOwnProperty','isPrototypeOf','propertyIsEnumerable','__defineGetter__','__defineSetter__','__lookupGetter__','__lookupSetter__']);
const clean=(value,max,optional=false)=>{
  if(typeof value!=='string'||[...value].length>max||(!optional&&!value.trim()))fail('BAD_SETTINGS');
  return value.replace(/[\u0000-\u001f\u007f]/g,'').trim();
};

/** Validate the editable theme definition used by a single tier-meeting round. */
export function validateTierQuestion(input){
  if(!input||typeof input!=='object'||input.game!=='TIER')fail('BAD_SETTINGS');
  const id=typeof input.id==='string'&&/^[\w-]{1,80}$/.test(input.id)?input.id:fail('BAD_SETTINGS');
  if(!Array.isArray(input.items)||input.items.length<2||input.items.length>15)fail('BAD_SETTINGS');
  const items=input.items.map(item=>{
    if(!item||typeof item!=='object')fail('BAD_SETTINGS');
    const id=clean(item.id,30);if(!/^[A-Za-z0-9_-]+$/.test(id)||RESERVED_ITEM_IDS.has(id))fail('BAD_SETTINGS');
    return{id,label:clean(item.label,80)};
  });
  if(new Set(items.map(item=>item.id)).size!==items.length)fail('BAD_SETTINGS');
  return{id,game:'TIER',prompt:clean(input.prompt,160),talkPrompt:clean(input.talkPrompt,200),items};
}

/** Validate a complete private ballot. Every item must occupy exactly one row. */
export function validateTierAnswer(question,value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!value.tiers||typeof value.tiers!=='object'||Array.isArray(value.tiers))fail('INVALID_ANSWER');
  const keys=Object.keys(value.tiers);
  if(keys.length!==TIER_ORDER.length||keys.some(key=>!TIER_ORDER.includes(key)))fail('INVALID_ANSWER');
  const itemIds=new Set(question.items.map(item=>item.id)),seen=new Set(),tiers={};
  for(const tier of TIER_ORDER){
    const ids=value.tiers[tier];
    if(!Array.isArray(ids)||ids.length>question.items.length)fail('INVALID_ANSWER');
    tiers[tier]=ids.map(id=>{
      if(typeof id!=='string'||!itemIds.has(id)||seen.has(id))fail('INVALID_ANSWER');
      seen.add(id);return id;
    });
  }
  if(seen.size!==itemIds.size)fail('INVALID_ANSWER');
  return{tiers};
}

/**
 * Aggregate revealed ballots. `answers` maps stable participant IDs to either
 * a ballot or the event engine's `{value: ballot}` wrapper. Ties are explicit:
 * majorityTier is null and majorityTiers contains every tied row.
 */
export function tierResult(question,answers){
  if(!answers||typeof answers!=='object'||Array.isArray(answers))fail('INVALID_ANSWER');
  const entries=Object.entries(answers),n=entries.length;
  if(n<2||n>10)fail('INVALID_ANSWER');
  const ballots=entries.map(([,raw])=>validateTierAnswer(question,raw?.value??raw));
  const pairCount=n*(n-1)/2;
  const items=question.items.map(item=>{
    const counts=Object.fromEntries(TIER_ORDER.map(tier=>[tier,0]));
    for(const ballot of ballots)for(const tier of TIER_ORDER)if(ballot.tiers[tier].includes(item.id))counts[tier]++;
    const max=Math.max(...Object.values(counts)),majorityTiers=TIER_ORDER.filter(tier=>counts[tier]===max);
    const agreements=Object.values(counts).reduce((sum,count)=>sum+count*(count-1)/2,0);
    const agreementPct=Math.round(agreements/pairCount*100);
    return{id:item.id,label:item.label,counts,majorityTier:majorityTiers.length===1?majorityTiers[0]:null,majorityTiers,
      minorityTiers:TIER_ORDER.filter(tier=>counts[tier]>0&&!majorityTiers.includes(tier)),agreementPct,unanimous:max===n};
  });
  const agreementPct=Math.round(items.reduce((sum,item)=>sum+item.agreementPct,0)/items.length);
  return{participantCount:n,tiers:[...TIER_ORDER],agreementPct,items};
}
