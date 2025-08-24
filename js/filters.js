// filters.js — единый файл для фильтрации и отображения блогеров
(function() {
    console.log("✅ filters.js loaded");

    const LS_PICKED = "selectedBloggers";
    let allBloggers = [];
    let selected = new Set();
    let currentFilters = {};

    // Утилиты
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function readPicked() {
        try {
            return JSON.parse(localStorage.getItem(LS_PICKED) || '[]');
        } catch {
            return [];
        }
    }

    function writePicked(ids) {
        localStorage.setItem(LS_PICKED, JSON.stringify(ids));
    }

    // Загрузка данных
    async function loadBloggers() {
        try {
            console.log("🔄 Загрузка bloggers.json...");
            const response = await fetch('../json/bloggers.json');
            
            if (response.ok) {
                allBloggers = await response.json();
                console.log(`✅ Загружено ${allBloggers.length} блогеров`);
                return allBloggers;
            }
            
            throw new Error('Не удалось загрузить bloggers.json');
            
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            // Fallback данные
            allBloggers = [
                {
                    id: "1",
                    name: "Иван Петров",
                    platform: "YouTube",
                    category: "техника",
                    subscribers: 125000,
                    er: 4.5,
                    price: 2500,
                    email: "ivan@example.com",
                    avatar: "../images/avatars/placeholder.png"
                },
                {
                    id: "2", 
                    name: "Анна Сидорова",
                    platform: "Instagram",
                    category: "красота", 
                    subscribers: 87000,
                    er: 7.2,
                    price: 1800,
                    email: "anna@example.com",
                    avatar: "../images/avatars/placeholder.png"
                },
                {
                    id: "3",
                    name: "Сергей Козлов", 
                    platform: "YouTube",
                    category: "игры",
                    subscribers: 356000,
                    er: 3.8,
                    price: 4200,
                    email: "sergey@example.com",
                    avatar: "../images/avatars/placeholder.png"
                },
                {
                    id: "4",
                    name: "Мария Иванова",
                    platform: "TikTok",
                    category: "мода",
                    subscribers: 210000,
                    er: 8.1,
                    price: 1900,
                    email: "maria@example.com",
                    avatar: "../images/avatars/placeholder.png"
                },
                {
                    id: "5",
                    name: "Дмитрий Смирнов",
                    platform: "Telegram",
                    category: "новости",
                    subscribers: 45000,
                    er: 5.5,
                    price: 1200,
                    email: "dmitry@example.com",
                    avatar: "../images/avatars/placeholder.png"
                },
                {
                    id: "6",
                    name: "Ольга Кузнецова",
                    platform: "YouTube",
                    category: "кулинария",
                    subscribers: 98000,
                    er: 6.2,
                    price: 1600,
                    email: "olga@example.com",
                    avatar: "../images/avatars/placeholder.png"
                }
            ];
            console.log("🔄 Используем fallback данные");
            return allBloggers;
        }
    }

    // Основная функция инициализации
    window.initPickStep = async function() {
        console.log("🚀 Инициализация шага подбора");
        
        await loadBloggers();
        
        // Восстанавливаем выбранное
        try {
            const saved = readPicked();
            selected = new Set(saved.map(String));
            console.log(`📊 Восстановлено ${selected.size} выбранных блогеров`);
        } catch (e) {
            console.warn('Ошибка восстановления выбора:', e);
        }

        initFilterListeners();
        applyFilters();
        
        console.log("✅ Шаг 1 готов");
        document.dispatchEvent(new CustomEvent('filters:ready'));
    };

    function initFilterListeners() {
        console.log("🔄 Инициализация обработчиков фильтров");

        // Основные фильтры
        const filterInputs = ['fPlatform', 'followersMinK', 'followersMaxK', 'fCategory', 'fQuery'];
        
        filterInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', applyFilters);
                element.addEventListener('change', applyFilters);
            }
        });

        // Кнопки управления
        $('#selectAll')?.addEventListener('click', selectAllFiltered);
        $('#clearPicked')?.addEventListener('click', clearSelected);
        $('#clearFilters')?.addEventListener('click', clearAllFilters);
    }

    function applyFilters() {
        let filtered = [...allBloggers];
        
        // Получаем значения фильтров
        const platform = $('#fPlatform')?.value || '';
        const minFollowers = $('#followersMinK')?.value || '';
        const maxFollowers = $('#followersMaxK')?.value || '';
        const category = $('#fCategory')?.value || '';
        const query = $('#fQuery')?.value || '';

        // Фильтр по платформе
        if (platform) {
            filtered = filtered.filter(b => b.platform === platform);
        }

        // Фильтр по подписчикам
        if (minFollowers) {
            const min = parseInt(minFollowers) * 1000;
            filtered = filtered.filter(b => b.subscribers >= min);
        }
        
        if (maxFollowers) {
            const max = parseInt(maxFollowers) * 1000;
            filtered = filtered.filter(b => b.subscribers <= max);
        }

        // Фильтр по категории
        if (category) {
            const categoryLower = category.toLowerCase();
            filtered = filtered.filter(b => 
                b.category && b.category.toLowerCase().includes(categoryLower)
            );
        }

        // Поисковый запрос
        if (query) {
            const queryLower = query.toLowerCase();
            filtered = filtered.filter(b => 
                b.name.toLowerCase().includes(queryLower) ||
                (b.category && b.category.toLowerCase().includes(queryLower)) ||
                b.platform.toLowerCase().includes(queryLower)
            );
        }

        renderResults(filtered);
        updateChips();
    }

    function renderResults(bloggers) {
        const resultsList = $('#resultsList');
        if (!resultsList) return;
        
        if (bloggers.length === 0) {
            resultsList.innerHTML = '<li class="muted">Ничего не найдено. Попробуйте изменить фильтры.</li>';
            
            // Обновляем счетчики
            if ($('#resultsCount')) $('#resultsCount').textContent = '0';
            if ($('#pickedCount')) $('#pickedCount').textContent = selected.size;
            
            return;
        }
        
        resultsList.innerHTML = bloggers.map(blogger => `
            <li class="card-blogger" data-id="${blogger.id}">
                <div class="avatar">${blogger.name.charAt(0)}</div>
                <div>
                    <div class="name"><strong>${blogger.name}</strong></div>
                    <div class="meta">
                        <span class="badge">${blogger.platform || '—'}</span>
                        <span class="badge">${blogger.category || '—'}</span>
                    </div>
                    <div class="meta">
                        Подписчики: ${(blogger.subscribers / 1000).toFixed(0)}K · 
                        ER: ${blogger.er || 'N/A'}% · 
                        Цена: ${blogger.price || '—'}$
                    </div>
                    <div class="actions">
                        <label class="select-radio">
                            <input type="checkbox" class="pick" 
                                   data-id="${blogger.id}" 
                                   ${selected.has(String(blogger.id)) ? 'checked' : ''}>
                            В выборку
                        </label>
                    </div>
                </div>
            </li>
        `).join('');

        // Обновляем счетчики
        if ($('#resultsCount')) $('#resultsCount').textContent = bloggers.length;
        if ($('#pickedCount')) $('#pickedCount').textContent = selected.size;

        // Вешаем обработчики на чекбоксы
        resultsList.querySelectorAll('.pick').forEach(checkbox => {
            checkbox.addEventListener('change', handleSelection);
        });
    }

    function handleSelection(e) {
        const id = e.target.dataset.id;
        const card = e.target.closest('.card-blogger');
        
        if (e.target.checked) {
            selected.add(id);
            card.classList.add('selected');
        } else {
            selected.delete(id);
            card.classList.remove('selected');
        }
        
        writePicked([...selected]);
        if ($('#pickedCount')) $('#pickedCount').textContent = selected.size;
    }

    function selectAllFiltered() {
        const visibleCards = $('#resultsList').querySelectorAll('.card-blogger');
        const visibleIds = Array.from(visibleCards).map(card => card.dataset.id);
        
        visibleIds.forEach(id => {
            if (!selected.has(id)) {
                selected.add(id);
            }
        });
        
        writePicked([...selected]);
        
        // Обновляем UI
        visibleCards.forEach(card => {
            card.classList.add('selected');
            const checkbox = card.querySelector('.pick');
            if (checkbox) checkbox.checked = true;
        });
        
        if ($('#pickedCount')) $('#pickedCount').textContent = selected.size;
    }

    function clearSelected() {
        // Снимаем выделение со всех карточек
        $('#resultsList').querySelectorAll('.card-blogger').forEach(card => {
            card.classList.remove('selected');
            const checkbox = card.querySelector('.pick');
            if (checkbox) checkbox.checked = false;
        });
        
        selected.clear();
        writePicked([]);
        if ($('#pickedCount')) $('#pickedCount').textContent = '0';
    }

    function clearAllFilters() {
        // Сброс всех полей
        const fieldsToClear = ['fPlatform', 'followersMinK', 'followersMaxK', 'fCategory', 'fQuery'];
        
        fieldsToClear.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        currentFilters = {};
        applyFilters();
    }

    function updateChips() {
        const chips = $('#activeChips');
        if (!chips) return;
        
        const activeFilters = [];
        const platform = $('#fPlatform')?.value;
        const minFollowers = $('#followersMinK')?.value;
        const maxFollowers = $('#followersMaxK')?.value;
        const category = $('#fCategory')?.value;
        const query = $('#fQuery')?.value;

        if (platform) {
            activeFilters.push(`Платформа: ${platform}`);
        }
        
        if (minFollowers) {
            activeFilters.push(`Подписчики от: ${minFollowers}K`);
        }
        
        if (maxFollowers) {
            activeFilters.push(`Подписчики до: ${maxFollowers}K`);
        }
        
        if (category) {
            activeFilters.push(`Категория: ${category}`);
        }
        
        if (query) {
            activeFilters.push(`Поиск: ${query}`);
        }

        chips.innerHTML = activeFilters.map(filter => 
            `<span class="chip-filter">${filter}<button type="button">×</button></span>`
        ).join('') || '<span class="muted">Нет активных фильтров</span>';

        // Добавляем обработчики для кнопок удаления чипов
        chips.querySelectorAll('.chip-filter button').forEach((button, index) => {
            button.addEventListener('click', function() {
                const filterType = activeFilters[index].split(':')[0].trim();
                
                switch(filterType) {
                    case 'Платформа':
                        $('#fPlatform').value = '';
                        break;
                    case 'Подписчики от':
                        $('#followersMinK').value = '';
                        break;
                    case 'Подписчики до':
                        $('#followersMaxK').value = '';
                        break;
                    case 'Категория':
                        $('#fCategory').value = '';
                        break;
                    case 'Поиск':
                        $('#fQuery').value = '';
                        break;
                }
                
                applyFilters();
            });
        });
    }

    // Глобальная функция для переключения выбора (для использования в других скриптах)
    window.toggleBloggerSelection = function(bloggerId) {
        const blogger = allBloggers.find(b => b.id === bloggerId);
        if (!blogger) return;
        
        const id = String(bloggerId);
        
        if (selected.has(id)) {
            selected.delete(id);
        } else {
            selected.add(id);
        }
        
        writePicked([...selected]);
        
        // Обновляем UI
        const card = $(`.card-blogger[data-id="${bloggerId}"]`);
        if (card) {
            card.classList.toggle('selected');
            const checkbox = card.querySelector('.pick');
            if (checkbox) checkbox.checked = selected.has(id);
        }
        
        if ($('#pickedCount')) $('#pickedCount').textContent = selected.size;
    };

})();