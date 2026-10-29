import('./salon-main.js').then(module => module.bootSalon()).catch(error => {
  console.error(error);
  const loading = document.querySelector('#salon-loading');
  loading.hidden = false;
  loading.replaceChildren(document.createTextNode('テーブルを読み込めませんでした。通信状況をご確認ください。 '));
  const link = document.createElement('a');
  link.href = './index.html';
  link.textContent = '再試行';
  loading.append(link);
});
