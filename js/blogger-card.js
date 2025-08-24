// blogger-card.js

// Основная функция для рендеринга карточки блогера
function renderBloggerCard(bloggerData) {
  const card = document.createElement('div');
  card.className = 'blogger-card';
  card.innerHTML = `
    <div class="blogger-info">
      <h3>${bloggerData.name}</h3>
      <p>${bloggerData.platform} · ${Number(bloggerData.subscribers || 0).toLocaleString('ru-RU')} подписчиков</p>
    </div>
  `;
  
  // Добавляем улучшения к карточке
  enhanceBloggerCard(card, bloggerData);
  
  return card;
}

// Функция для улучшения карточки блогера (добавляет дополнительные элементы)
function enhanceBloggerCard(cardElement, bloggerData) {
  // Добавляем дополнительные элементы информации
  const infoSection = document.createElement('div');
  infoSection.className = 'blogger-additional-info';
  infoSection.innerHTML = `
    <p class="meta">Ниша: ${bloggerData.niche || 'Не указана'}</p>
    ${bloggerData.youtube ? `<p><a class="link" href="${bloggerData.youtube}" target="_blank" rel="noopener">Смотреть канал</a></p>` : ''}
  `;
  
  // Добавляем кнопки действий
  const actionSection = document.createElement('div');
  actionSection.className = 'blogger-actions';
  actionSection.innerHTML = `
    <a class="btn" href="deal.html?blogger=${encodeURIComponent(bloggerData.id)}">Начать сделку</a>
    <a class="btn btn-secondary" href="agency.html">Назад к списку</a>
  `;
  
  // Добавляем медиакит информацию
  const mediaKitSection = document.createElement('div');
  mediaKitSection.className = 'blogger-mediakit';
  mediaKitSection.innerHTML = `
    <hr>
    <h4>Медиакит</h4>
    <ul>
      <li>Гео: RU/UA/KZ</li>
      <li>Средние просмотры: ${(bloggerData.avgViews || Math.round((bloggerData.subscribers || 100000) / 3)).toLocaleString('ru-RU')}</li>
      <li>CPM (оценка): $${(bloggerData.cpm || 8)}</li>
      <li>ER: ${(bloggerData.engagementRate || 4.2).toFixed(1)}%</li>
    </ul>
  `;
  
  // Добавляем все секции в карточку
  cardElement.appendChild(infoSection);
  cardElement.appendChild(actionSection);
  cardElement.appendChild(mediaKitSection);
}

// Основная функция выполнения при загрузке страницы
(async function(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const box = document.getElementById('card');
  
  try {
    const res = await fetch('json/bloggers.json');
    const list = await res.json();
    const blogger = list.find(x => x.id === id) || list[0];
    
    if (!blogger) {
      box.innerHTML = '<p class="error-message">Блогер не найден</p>';
      return;
    }
    
    // Используем функцию renderBloggerCard для создания карточки
    const bloggerCard = renderBloggerCard(blogger);
    box.appendChild(bloggerCard);
    
    // После того как данные блогера загружены и отображены
    const analyticsContainer = document.getElementById('analytics-container');
    if (analyticsContainer && typeof initBloggerAnalytics === 'function') {
        // Инициализируем аналитику
        const analytics = initBloggerAnalytics(blogger);
        
        // Сохраняем данные в глобальную переменную для автоматической инициализации
        window.bloggerData = blogger;
    }
    
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
    box.innerHTML = '<p class="error-message">Ошибка загрузки данных. Пожалуйста, попробуйте позже.</p>';
  }
})();