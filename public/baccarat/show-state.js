import {roundPresentation} from './show-plan.js';
const KEY='unity-baccarat-show-v1';
export class ShowState{
 constructor(storage,round){this.storage=storage;this.round=round;this.ok=true;this.data={version:1,roundId:round.id,planId:roundPresentation(round).id,seen:0,played:[],squeeze:null};try{const p=JSON.parse(storage.getItem(KEY)||'null');if(p&&p.version===1&&p.roundId===round.id&&p.planId===this.data.planId&&this.valid(p))this.data=p;}catch{this.ok=false;}}
 valid(p){return Number.isInteger(p.seen)&&p.seen>=0&&p.seen<=this.round.plan.cards.length&&Array.isArray(p.played)&&p.played.length<=30&&p.played.every(x=>typeof x==='string'&&/^[a-z0-9:-]{1,80}$/i.test(x))&&(p.squeeze===null||p.squeeze&&Number.isInteger(p.squeeze.index)&&p.squeeze.index===p.seen&&p.squeeze.index<this.round.plan.cards.length&&Number.isFinite(p.squeeze.progress)&&p.squeeze.progress>=0&&p.squeeze.progress<=1&&typeof p.squeeze.manual==='boolean');}
 update(patch){const next={...this.data,...patch};if(!this.valid(next))return false;this.data=next;try{this.storage.setItem(KEY,JSON.stringify(next));this.ok=true;}catch{this.ok=false;}return true;}
 emit(id){if(!/^[a-z0-9:-]{1,80}$/i.test(id)||this.data.played.includes(id)||this.data.played.length>=30)return false;return this.update({played:[...this.data.played,id]});}
}
