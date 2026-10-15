import {randomUUID} from 'node:crypto';import {fail} from '../errors.js';
export function assignTeams(room,count,assignments){
 const members=Object.values(room.players).filter(p=>!p.left&&p.connected&&p.ready).map(p=>p.id);
 if(!Number.isInteger(count)||count<2||count>4||count>members.length)fail('BAD_SETTINGS');
 const teams=Array.from({length:count},(_,i)=>({id:randomUUID(),name:`チーム${i+1}`,memberIds:[],captainId:null}));
 if(assignments){if(typeof assignments!=='object'||Array.isArray(assignments)||members.some(id=>!Number.isInteger(assignments[id])||assignments[id]<0||assignments[id]>=count)||Object.keys(assignments).some(id=>!members.includes(id)))fail('BAD_SETTINGS');}
 members.forEach((id,i)=>teams[assignments?assignments[id]:i%count].memberIds.push(id));if(teams.some(t=>!t.memberIds.length))fail('BAD_SETTINGS');for(const t of teams)t.captainId=t.memberIds.find(id=>!room.players[id].cpu)??t.memberIds[0];return teams;
}
export function refreshCaptains(room){let changed=false;for(const t of room.event?.teams||[]){if(!room.players[t.captainId]?.connected||room.players[t.captainId]?.left||(room.players[t.captainId]?.cpu&&t.memberIds.some(id=>room.players[id]?.connected&&!room.players[id].left&&!room.players[id].cpu&&!room.event.passes?.[id]))){const next=[...t.memberIds].sort((a,b)=>Number(!!room.players[a]?.cpu)-Number(!!room.players[b]?.cpu)).find(id=>room.players[id]?.connected&&!room.players[id].left&&!room.event.passes?.[id]);if(next&&next!==t.captainId){t.captainId=next;changed=true;}}}return changed;}
export function prepareTeams(room){
 const e=room.event;if(!e.teams.length){e.teams=assignTeams(room,Math.min(e.options.teamCount,e.participants.length));return;}
 for(const t of e.teams){t.memberIds=t.memberIds.filter(id=>e.participants.includes(id));t.draft=null;}
 for(const id of e.participants)if(!e.teams.some(t=>t.memberIds.includes(id))){const target=[...e.teams].sort((a,b)=>a.memberIds.length-b.memberIds.length)[0];target.memberIds.push(id);}
 e.teams=e.teams.filter(t=>t.memberIds.length);refreshCaptains(room);
}
export function captainTeam(room,id){const e=room.event,t=e.teams.find(t=>t.memberIds.includes(id));if(!t||t.captainId!==id)fail('CAPTAIN_ONLY');return t;}
