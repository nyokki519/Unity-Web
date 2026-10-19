import{el,button,labeledSelect,field}from'../dom.js';
export function mountSilver({onBack}){
 const abort=new AbortController(),node=el('section','silver-shell'),head=el('header','silver-head'),title=el('strong','','喫茶Unity'),frame=el('iframe','silver-game');
 frame.title='喫茶Unityのゲーム画面';frame.allow='accelerometer; gyroscope';
 const url=new URL('/silver-ring/index.html',location.origin),query=new URLSearchParams(location.search);for(const key of ['seed','debug'])if(query.has(key))url.searchParams.set(key,query.get(key));if(matchMedia('(max-width:850px)').matches)url.searchParams.set('touch','1');frame.src=url.href;
 const send=(type,value)=>frame.contentWindow?.postMessage({source:'silver-shell',type,value},location.origin);
 let phase='title';
 const pause=button('一時停止',()=>{frame.contentWindow?.focus();send('setPaused',phase!=='paused');},'button secondary'),options=el('section','silver-options');options.hidden=true;
 const settings=button('設定',()=>{options.hidden=!options.hidden;settings.setAttribute('aria-expanded',String(!options.hidden));},'button secondary');settings.setAttribute('aria-expanded','false');
 head.append(button('Unity MIXへ戻る',onBack,'quiet-button'),title,pause,settings);
 const camera=labeledSelect('表示する場所',[['auto','自動で追う'],['wide','盤面全体'],['cradle1','1段目の皿'],['cradle2','2段目の皿'],['cradle3','3段目の皿']],'auto',value=>{send('camera',value);options.hidden=true;settings.setAttribute('aria-expanded','false');});
 const motion=el('input');motion.type='checkbox';motion.checked=matchMedia('(prefers-reduced-motion:reduce)').matches;motion.addEventListener('change',()=>send('motion',motion.checked),{signal:abort.signal});const label=el('label');label.append(motion,document.createTextNode('動きを減らす'));
 const lab=el('a','','旧版・接触物理の検証');lab.href='/?bonus=jackpot&physics=1';const power=el('input');power.type='range';power.min='2';power.max='100';power.value='40';power.addEventListener('input',()=>send('power',Number(power.value)),{signal:abort.signal});
 const strength=el('div','silver-strength');strength.append(button('−',()=>send('power',Math.max(2,Number(power.value)-2)),'button secondary'),field('発射威力',power),button('＋',()=>send('power',Math.min(100,Number(power.value)+2)),'button secondary'));
 const quality=labeledSelect('描画品質',[['auto','自動'],['high','最高画質'],['low','省電力']],'high',value=>send('quality',value));
 const notes=el('input');notes.type='checkbox';notes.checked=true;const noteLabel=el('label');noteLabel.append(notes,document.createTextNode('金貨の背景演出'));notes.addEventListener('change',()=>send('banknotes',notes.checked),{signal:abort.signal});
 const backgroundCheck=button('背景の落下を確認',()=>{notes.checked=true;send('banknotes',true);send('camera','wide');options.hidden=true;settings.setAttribute('aria-expanded','false');},'button secondary');
 options.append(camera,label,noteLabel,backgroundCheck,el('small','','入口調整版 r28：1球200・初期5万'),quality,strength,lab);
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.source!=='silver-game')return;if(e.data.power!==undefined&&document.activeElement!==power)power.value=String(e.data.power);phase=e.data.phase;pause.textContent=e.data.phase==='paused'?'再開する':'一時停止';pause.disabled=!['play','paused'].includes(e.data.phase);},{signal:abort.signal});
 // Visibility is authoritative; iframe/browser-toolbar focus changes are not a background transition.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)send('suspend');},{signal:abort.signal});
 frame.addEventListener('load',()=>{send('motion',motion.checked);send('banknotes',notes.checked);send('quality','high');},{signal:abort.signal});
 const reserve=el('footer','silver-scroll-reserve','上下にスクロールして、押しやすい位置へ。'),alignControls=()=>{const viewport=window.visualViewport?.height||innerHeight;window.scrollTo({top:Math.max(0,scrollY+frame.getBoundingClientRect().bottom-viewport+112),behavior:motion.checked?'auto':'smooth'});},scrollHint=button('操作欄を上に移動 ↓',alignControls,'silver-scroll-hint');
 const resizeViewport=()=>{if(!window.visualViewport||visualViewport.scale===1)node.style.setProperty('--silver-viewport',`${window.visualViewport?.height||innerHeight}px`);};resizeViewport();window.addEventListener('resize',resizeViewport,{signal:abort.signal});window.visualViewport?.addEventListener('resize',resizeViewport,{signal:abort.signal});node.append(head,scrollHint,options,frame,reserve);
 return{node,destroy(){abort.abort();frame.remove();}};
}
