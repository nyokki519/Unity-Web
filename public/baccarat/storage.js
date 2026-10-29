import {validateSession} from './session.js';
export const DEFAULT_SETTINGS={language:'ja',speed:'normal',text:1,bgm:.15,se:.4,ui:.25,reduced:false,quality:'high',presentation:'squeeze',squeezeMode:'important',forecastVolume:.35,resultVolume:.4,dialogue:true,flash:true,particles:true,shake:false};
const KEY='unity-baccarat-session-v1',BACKUP=KEY+'-backup',SETTINGS='unity-baccarat-settings-v1';
function checksum(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16);}
function decode(raw){if(!raw)return null;if(raw.length>2000000)throw Error('SIZE');const envelope=JSON.parse(raw);if(envelope.version!==1||typeof envelope.payload!=='string'||envelope.checksum!==checksum(envelope.payload))throw Error('CORRUPT');const state=JSON.parse(envelope.payload);validateSession(state);return state;}
export class SessionStore{
 constructor(storage){this.storage=storage;}
 load(){try{const raw=this.storage.getItem(KEY);try{const state=decode(raw);if(state)return{state,status:'ok'};}catch{}
  try{const state=decode(this.storage.getItem(BACKUP));if(state)return{state,status:'recovered'};}catch{}
  return{state:null,status:raw?'corrupt':'empty'};
 }catch{return{state:null,status:'unavailable'};}}
 save(state){try{validateSession(state);const payload=JSON.stringify(state),serialized=JSON.stringify({version:1,payload,checksum:checksum(payload)}),old=this.storage.getItem(KEY);if(old){try{decode(old);this.storage.setItem(BACKUP,old);}catch{}}
  this.storage.setItem(KEY,serialized);return true;
 }catch{return false;}}
}
export function loadSettings(storage){let saved={};try{saved=JSON.parse(storage.getItem(SETTINGS)||'{}')||{};}catch{}
 const settings={...DEFAULT_SETTINGS};for(const[k,values]of Object.entries({language:['ja','en'],speed:['normal','quick','instant'],text:[1,1.15,1.3],quality:['high','low'],presentation:['standard','squeeze','rich','quick','off'],squeezeMode:['auto','important','all']}))if(values.includes(saved[k]))settings[k]=saved[k];
 for(const k of ['bgm','se','ui','forecastVolume','resultVolume'])if(typeof saved[k]==='number'&&Number.isFinite(saved[k])&&saved[k]>=0&&saved[k]<=1)settings[k]=saved[k];for(const k of ['flash','particles','shake'])if(typeof saved[k]==='boolean')settings[k]=saved[k];if(typeof saved.dialogue==='boolean')settings.dialogue=saved.dialogue;if(typeof saved.reduced==='boolean')settings.reduced=saved.reduced;return settings;
}
export function saveSettings(settings,storage){try{storage.setItem(SETTINGS,JSON.stringify(settings));return true;}catch{return false;}}
