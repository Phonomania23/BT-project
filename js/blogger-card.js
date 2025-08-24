(async function(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const box = document.getElementById('card');
  try {
    const res = await fetch('json/bloggers.json'); const list = await res.json();
    const b = list.find(x=>x.id===id) || list[0];
    if(!b){ box.innerHTML = '<p>Блогер не найден</p>'; return; }
    box.innerHTML = `
      <h1>${b.name}</h1>
      <p><span class="badge">${b.platform}</span> <span class="badge">${b.niche}</span></p>
      <p class="meta">Подписчики: ${Number(b.subscribers).toLocaleString('ru-RU')}</p>
      ${b.youtube?`<p><a class="link" href="${b.youtube}" target="_blank" rel="noopener">Канал</a></p>`:''}
      <p><a class="btn" href="deal.html?blogger=${encodeURIComponent(b.id)}">Начать сделку</a>
         <a class="btn btn-secondary" href="agency.html">Назад</a></p>
      <hr>
      <h3>Медиакит (демо)</h3>
      <ul>
        <li>Гео: RU/UA/KZ</li>
        <li>Средние просмотры: ${(b.avgViews||Math.round((b.subscribers||100000)/3)).toLocaleString('ru-RU')}</li>
        <li>CPM (оценка): $${(b.cpm||8)}</li>
      </ul>
    `;
  } catch(e){ box.innerHTML = '<p>Ошибка загрузки данных.</p>'; }
})();
