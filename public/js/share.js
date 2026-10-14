import {el,button,toast,modal} from './dom.js';
export async function shareCard(state,kind){
 const summary=state.summary,data=kind==='own'?summary.own:summary.group;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d');
 await document.fonts.ready;
 ctx.fillStyle='#f5f2eb';ctx.fillRect(0,0,1080,1920);ctx.fillStyle='#3b4233';
 ctx.font='26px sans-serif';ctx.fillText('UNITY / A CONVERSATION GAME',88,110);
 ctx.font='120px Cormorant, serif';ctx.fillText('UNITY MIX.',80,265);
 ctx.strokeStyle='#cbc9be';ctx.beginPath();ctx.moveTo(88,330);ctx.lineTo(990,330);ctx.stroke();
 ctx.font='28px sans-serif';ctx.fillStyle='#62684c';ctx.fillText(kind==='own'?'YOUR MIX':'OUR MIX',88,413);
 ctx.font='26px sans-serif';ctx.fillStyle='#56544c';const date=new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'Asia/Tokyo'}).format(new Date(summary.date)).toUpperCase();ctx.fillText(`${date}   /   ${summary.people} PEOPLE   /   ${summary.questions} QUESTIONS`,88,470);
 if(!data.values.length){ctx.font='40px sans-serif';ctx.fillText('言葉を交わす、いい時間。',88,700);}else data.values.slice(0,6).forEach((item,i)=>{
  const y=610+i*155;ctx.fillStyle='#302e29';ctx.font='34px sans-serif';ctx.fillText(item.label,88,y);ctx.textAlign='right';ctx.font='60px Cormorant, serif';ctx.fillText(String(item.score),990,y);ctx.textAlign='left';ctx.fillStyle='#d8d7cb';ctx.fillRect(88,y+28,902,7);ctx.fillStyle='#62684c';ctx.fillRect(88,y+28,902*item.score/100,7);
 });
 const logo=new Image();logo.src='/assets/unity-mark.webp';await logo.decode();ctx.drawImage(logo,88,1630,115,150);
 ctx.fillStyle='#62684c';ctx.font='28px sans-serif';ctx.fillText('遊ぶほど、その人が見えてくる。',275,1708);ctx.font='20px sans-serif';ctx.fillStyle='#67645b';ctx.fillText('今回の回答のまとめです。性格診断ではありません。',88,1850);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('カードを作れませんでした。');
 const file=new File([blob],`unity-mix-${kind}.png`,{type:'image/png'});
 const preview=el('img','share-preview');const url=URL.createObjectURL(blob);preview.src=url;preview.alt=`${kind==='own'?'あなた':'グループ'}のMIX共有カード`;preview.width=1080;preview.height=1920;
 const controls=el('div','actions');const download=el('a','button','画像を保存 ↓');download.href=url;download.download=file.name;controls.append(download);
 if(navigator.canShare?.({files:[file]}))controls.append(button('共有する ↗',async()=>{try{await navigator.share({files:[file],title:'UNITY MIX'});}catch(e){if(e.name!=='AbortError')toast('画像を保存して共有してください。');}}));
 modal(kind==='own'?'YOUR MIX / 共有カード':'OUR MIX / 共有カード',preview,controls,el('p','small muted','名前や、個々の回答はカードに含まれません。共有先は自分で選べます。'));
 document.querySelector('#modal').addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
}
