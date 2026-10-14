export const $ = (selector,root=document)=>root.querySelector(selector);
export function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
export function button(text,callback,cls='button'){const n=el('button',cls,text);n.type='button';n.addEventListener('click',callback);return n;}
export function field(label,input){if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',label);const wrap=el('label','field');wrap.append(el('span','field-label',label),input);return wrap;}
export function input(name,placeholder='',value=''){const n=el('input');n.name=name;n.placeholder=placeholder;n.value=value;return n;}
export function eyebrow(text){return el('p','eyebrow',text);}
export function title(kicker,heading,description){const n=el('div','screen-heading');n.append(eyebrow(kicker),el('h1','',heading));if(description)n.append(el('p','muted',description));return n;}
export function logo(size='small'){const n=el('img',`unity-logo ${size}`);n.src='/assets/unity-mark.webp';n.alt='Unityのオリジナルロゴ';n.width=size==='large'?160:56;n.height=size==='large'?168:58;return n;}
export function row(label,value,cls='stat'){const n=el('div',cls);n.append(el('span','',label),el('strong','',String(value)));return n;}
export function bar(label,value,caption=''){const n=el('div','bar-row');n.append(row(label,value,'bar-label'));const track=el('div','bar-track'),fill=el('span');fill.style.width=`${Math.max(0,Math.min(100,value))}%`;track.append(fill);n.append(track);if(caption)n.append(el('p','small muted',caption));return n;}
export function toast(text){const n=$('#toast');n.textContent=text;n.hidden=false;clearTimeout(n._timer);n._timer=setTimeout(()=>{n.hidden=true;},4500);}
export function modal(heading,...nodes){$('#modal-title').textContent=heading;$('#modal-body').replaceChildren(...nodes);if(!$('#modal').open)$('#modal').showModal();}
export async function copy(text){try{await navigator.clipboard.writeText(text);toast('コピーしました。');}catch{const box=input('copy','',text);box.readOnly=true;modal('この文字列をコピーしてください',box);box.select();}}
export function labeledSelect(label,options,value,onChange){const n=el('select');for(const [id,text]of options){const o=el('option','',text);o.value=id;n.append(o);}n.value=value;if(onChange)n.addEventListener('change',()=>onChange(n.value));return field(label,n);}
export const modeNames={MIX:'おまかせ MIX',ALIGN:'価値観の二択',PREDICT:'あの人ならどっち？',LINE:'0〜100の距離',RANK:'大切なものの順位',AUCTION:'人生100ポイント',QUICK:'話して、知る'};
export const modeDescription={MIX:'6つのモードを、少しずつ。',ALIGN:'選んだ理由に、その人らしさ。',PREDICT:'イメージと、本当の答えの違い。',LINE:'同じ問いでも、感じ方はさまざま。',RANK:'あなたの1位は、みんなの何位？',AUCTION:'限られた100ポイントを、何に使う？',QUICK:'答えよりも、そこから広がる会話。'};
