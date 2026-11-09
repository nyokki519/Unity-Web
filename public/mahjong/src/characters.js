// Original characters and CSS portraits created for Unity Mahjong. Cosmetic only.
export const characters = Object.freeze([
  { id: 'moka', name: '星乃 モカ', reading: 'ほしの・もか', genderPresentation: 'female', colors: ['#fff3dc', '#de7968'], role: '新米カフェ店主', motif: '☕', greetings: ['今日の一杯と、一局を。'], reactions: { turn: 'ゆっくり、ひとつずつ。', result: 'ご一緒できてうれしいです。' } },
  { id: 'sumire', name: '琥珀 すみれ', reading: 'こはく・すみれ', genderPresentation: 'female', colors: ['#303b68', '#b5a0da'], role: '静かな書店の店主', motif: '本', greetings: ['次の一頁を、開きましょう。'], reactions: { turn: 'この一手を、読みながら。', result: '余韻の残る一局でしたね。' } },
  { id: 'houma', name: '深山 焙真', reading: 'みやま・ほうま', genderPresentation: 'male', colors: ['#24483e', '#bda15c'], role: '家具職人', motif: '木', greetings: ['じっくり、いい時間にしよう。'], reactions: { turn: '手ざわりを確かめて。', result: 'また同じ卓を囲もう。' } },
  { id: 'kona', name: '小野 コナ', reading: 'おの・こな', genderPresentation: 'male', colors: ['#21344e', '#c4ccd6'], role: '深夜ラジオのパーソナリティ', motif: '波', greetings: ['今夜の席へ、ようこそ。'], reactions: { turn: 'あわてず、自分のテンポで。', result: 'お相手ありがとう。また次の夜に。' } }
]);
export const getCharacter = id => characters.find(character => character.id === id);
