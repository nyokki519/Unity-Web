import {el,button,title,eyebrow,field,input,labeledSelect,modeNames,modeDescription,logo} from './dom.js';
export function home({create,join,resume,session}){
 const screen=el('div','home screen');const intro=el('div','home-copy');
 intro.append(eyebrow('UNITY / A LITTLE CLOSER, EVERY ROUND'),el('p','display-name','UNITY MIX.'),el('h1','','遊ぶほど、\nその人が見えてくる。'),el('p','home-description','同じ問いに、違う答え。\nその理由を聞く時間が、いちばん面白い。'));
 const actions=el('div','actions');actions.append(button('ルームをつくる ↗',create),button('ルームに参加する',join,'button secondary'));intro.append(actions,el('p','small muted','2〜24人 · 登録不要 · それぞれのスマートフォンで'));
 if(session)intro.append(button(`ROOM ${session.code} に戻る →`,resume,'resume-link quiet-button'));
 const visual=el('div','home-visual');visual.append(eyebrow('01 / A QUESTION TO START WITH'));
 const card=el('div','sample-card');card.append(el('span','serif sample-index','Align.'),el('h2','','カフェで選ぶなら？'));
 const options=el('div','sample-options');options.append(el('p','','A　いつもの一杯'),el('p','','B　初めてのメニュー'));card.append(options,el('p','small muted','答えは、みんなが選んでから。'));visual.append(card,el('p','home-caption','違いが見つかる。会話がはじまる。'),logo());
 const modes=el('section','home-modes');modes.append(eyebrow('SIX WAYS TO MEET EACH OTHER'),el('h2','','知り方も、いろいろ。'));
 const grid=el('div','mode-overview');Object.keys(modeNames).filter(k=>k!=='MIX').forEach((key,i)=>{const row=el('div');row.append(el('span','small muted',`0${i+1}`),el('h3','serif',key==='QUICK'?'Quick Mix':key[0]+key.slice(1).toLowerCase()),el('p','',modeDescription[key]));grid.append(row);});modes.append(grid);
 screen.append(intro,visual,modes);return screen;
}
export function setup({catalog,submit,back,initial={}}){
 const screen=el('div','screen narrow');screen.append(button('← ホーム','function'===typeof back?back:()=>{},'quiet-button'),title('CREATE A ROOM','今日のMIXを、つくろう。','初めてなら、LIGHTとおまかせMIXがおすすめです。'));
 const form=el('form','setup-form');const name=input('name','ニックネーム',initial.name||'');name.required=true;name.maxLength=20;name.autocomplete='nickname';form.append(field('あなたの名前',name));
 const eventSelect=labeledSelect('イベントゲーム',[['','既存のMIXで遊ぶ'],...Object.entries(catalog.eventGames||{}).map(([id,g])=>[id,g.name])],initial.eventGame||'');eventSelect.querySelector('select').name='eventGame';form.append(eventSelect,el('p','small muted','イベントゲームは6〜15人向け。説明→回答・相談→締切→公開→会話で進みます。個人・チームゲームは標準3ラウンド、匿名予想は標準1ラウンド。時間とお題は司会が開始前に編集できます。'));
 const modeGrid=el('fieldset','mode-picker');modeGrid.append(el('legend','field-label','遊ぶモード'));
 for(const [key,label]of Object.entries(modeNames)){const wrap=el('label','mode-option');const radio=input('mode');radio.type='radio';radio.value=key;radio.checked=key===(initial.mode||'MIX');const copy=el('span','mode-copy');copy.append(el('span','serif mode-code',key==='QUICK'?'Quick Mix':key),el('strong','',label),el('small','',modeDescription[key]));wrap.append(radio,copy);modeGrid.append(wrap);}form.append(modeGrid);modeGrid.dataset.legacy='true';
 const depths=el('fieldset','depth-picker');depths.append(el('legend','field-label','会話の深さ'));
 for(const [key,label]of [['LIGHT','初対面に。気軽な話から。'],['BALANCED','少しずつ、価値観の話も。'],['DEEP','仲のいい人と、じっくり。']]){const wrap=el('label');const n=input('depth');n.type='radio';n.value=key;n.checked=key===(initial.depth||'LIGHT');wrap.append(n,el('strong','',key),el('span','small',label));depths.append(wrap);}form.append(depths);depths.dataset.legacy='true';
 const selects=el('div','two-columns');selects.append(labeledSelect('お題のカテゴリ',[['ALL','すべて'],...Object.entries(catalog.categories)],initial.category||'ALL'),labeledSelect('お題の数',[[6,'6問 / 気軽に'],[12,'12問 / おすすめ'],[20,'20問 / じっくり'],[30,'30問 / たっぷり']],initial.rounds||12));selects.querySelectorAll('select')[0].name='category';selects.querySelectorAll('select')[1].name='rounds';form.append(selects);selects.dataset.legacy='true';
 const auto=el('label','check-field');const check=input('autoReveal');check.type='checkbox';check.checked=initial.autoReveal!==false;auto.append(check,el('span','','全員回答したら、自動で公開する'));auto.dataset.legacy='true';form.append(auto,el('p','small muted','チェックを外すと、ホストの操作で公開します。回答前の人がいる間は公開できません。'));
 form.append(el('p','small muted','お題は重複せずに出題します。指定した数よりお題が少ない組合せでは、使えるお題の数に調整します。'));
 const submitButton=el('button','button wide','ルームをつくる ↗');submitButton.type='submit';form.append(submitButton);form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);submitButton.disabled=true;await submit(data.get('name'),{eventGame:data.get('eventGame')||undefined,eventOptions:{roundLimit:['WHO','STORY'].includes(data.get('eventGame'))?1:3},mode:data.get('mode'),depth:data.get('depth'),category:data.get('category'),rounds:Number(data.get('rounds')),autoReveal:check.checked});submitButton.disabled=false;});eventSelect.querySelector('select').addEventListener('change',()=>{const chosen=!!eventSelect.querySelector('select').value;form.querySelectorAll('[data-legacy]').forEach(n=>n.hidden=chosen);});screen.append(form);return screen;
}
export function joinScreen({code='',submit,back}){
 const screen=el('div','screen narrow join-screen');screen.append(button('← ホーム',back,'quiet-button'),title('JOIN THE CONVERSATION',code?`ROOM ${code}`:'みんなのルームへ。',code?'名前を入れたら、会話の輪へ。':'ホストの4桁コードと、あなたの名前だけ。'));
 const form=el('form');const room=input('code','5192',code);room.inputMode='numeric';room.pattern='[0-9]{4}';room.maxLength=4;room.required=true;room.autocomplete='off';const name=input('name','ニックネーム');name.required=true;name.maxLength=20;name.autocomplete='nickname';form.append(field('ルームコード',room),field('あなたの名前',name),el('p','small muted','登録は不要です。同じ端末から戻ると、参加情報を引き継ぎます。'));
 const enter=el('button','button wide','参加する ↗');enter.type='submit';form.append(enter);form.addEventListener('submit',async e=>{e.preventDefault();enter.disabled=true;await submit(room.value,name.value);enter.disabled=false;});screen.append(form,logo('large'));return screen;
}
