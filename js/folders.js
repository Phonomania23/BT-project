// js/folders.js - Система папок и избранного для блогеров
class FoldersSystem {
    constructor() {
        this.folders = [];
        this.favorites = new Set();
        this.init();
    }

    // Инициализация системы
    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.renderFoldersSidebar();
    }

    // Загрузка данных из localStorage
    loadFromStorage() {
        try {
            const savedFolders = localStorage.getItem('bloggerFolders');
            const savedFavorites = localStorage.getItem('bloggerFavorites');
            
            if (savedFolders) {
                this.folders = JSON.parse(savedFolders);
            }
            
            if (savedFavorites) {
                this.favorites = new Set(JSON.parse(savedFavorites));
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.folders = [];
            this.favorites = new Set();
        }
    }

    // Сохранение данных в localStorage
    saveToStorage() {
        try {
            localStorage.setItem('bloggerFolders', JSON.stringify(this.folders));
            localStorage.setItem('bloggerFavorites', JSON.stringify(Array.from(this.favorites)));
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Глобальные обработчики
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Делегирование событий для динамических элементов
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-folder-btn')) {
                this.handleAddToFolder(e);
            }
            if (e.target.closest('.toggle-favorite')) {
                this.toggleFavorite(e);
            }
            if (e.target.closest('.create-folder-btn')) {
                this.showCreateFolderModal();
            }
        });
    }

    // Создание новой папки
    createFolder(name, color = '#667eea', isPrivate = false) {
        const newFolder = {
            id: Date.now().toString(),
            name: name.trim(),
            color: color,
            isPrivate: isPrivate,
            bloggers: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.folders.push(newFolder);
        this.saveToStorage();
        this.renderFoldersSidebar();
        
        return newFolder;
    }

    // Удаление папки
    deleteFolder(folderId) {
        this.folders = this.folders.filter(folder => folder.id !== folderId);
        this.saveToStorage();
        this.renderFoldersSidebar();
    }

    // Переименование папки
    renameFolder(folderId, newName) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            folder.name = newName.trim();
            folder.updatedAt = new Date().toISOString();
            this.saveToStorage();
            this.renderFoldersSidebar();
        }
    }

    // Добавление блогера в папку
    addToFolder(bloggerId, folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder && !folder.bloggers.includes(bloggerId)) {
            folder.bloggers.push(bloggerId);
            folder.updatedAt = new Date().toISOString();
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Удаление блогера из папки
    removeFromFolder(bloggerId, folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            folder.bloggers = folder.bloggers.filter(id => id !== bloggerId);
            folder.updatedAt = new Date().toISOString();
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Перемещение блогера между папками
    moveBlogger(bloggerId, fromFolderId, toFolderId) {
        if (this.removeFromFolder(bloggerId, fromFolderId)) {
            return this.addToFolder(bloggerId, toFolderId);
        }
        return false;
    }

    // Добавление/удаление из избранного
    toggleFavorite(event) {
        const button = event.target.closest('.toggle-favorite');
        if (!button) return;

        const bloggerId = button.dataset.bloggerId;
        if (!bloggerId) return;

        if (this.favorites.has(bloggerId)) {
            this.favorites.delete(bloggerId);
            button.classList.remove('favorited');
            button.innerHTML = '☆';
        } else {
            this.favorites.add(bloggerId);
            button.classList.add('favorited');
            button.innerHTML = '⭐';
        }

        this.saveToStorage();
        this.updateFavoriteBadges();
    }

    // Проверка, находится ли блогер в избранном
    isFavorite(bloggerId) {
        return this.favorites.has(bloggerId);
    }

    // Получение всех избранных блогеров
    getFavorites() {
        return Array.from(this.favorites);
    }

    // Получение блогеров в папке
    getFolderBloggers(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        return folder ? folder.bloggers : [];
    }

    // Поиск папок содержащих блогера
    getBloggerFolders(bloggerId) {
        return this.folders.filter(folder => 
            folder.bloggers.includes(bloggerId)
        );
    }

    // Обновление бейджей избранного
    updateFavoriteBadges() {
        document.querySelectorAll('.toggle-favorite').forEach(button => {
            const bloggerId = button.dataset.bloggerId;
            if (bloggerId && this.isFavorite(bloggerId)) {
                button.classList.add('favorited');
                button.innerHTML = '⭐';
            } else {
                button.classList.remove('favorited');
                button.innerHTML = '☆';
            }
        });
    }

    // Рендер сайдбара с папками
    renderFoldersSidebar() {
        const sidebar = document.getElementById('foldersSidebar');
        if (!sidebar) return;

        sidebar.innerHTML = this.generateFoldersSidebarHTML();
        this.attachFolderSidebarListeners();
    }

    // Генерация HTML сайдбара папок
    generateFoldersSidebarHTML() {
        return `
            <div class="folders-header">
                <h3>📁 Мои папки</h3>
                <button class="btn-icon create-folder-btn" title="Создать папку">+</button>
            </div>
            
            <div class="folders-list">
                <div class="folder-item ${this.favorites.size > 0 ? 'has-items' : ''}" data-folder-id="favorites">
                    <span class="folder-icon">⭐</span>
                    <span class="folder-name">Избранное</span>
                    <span class="folder-count">${this.favorites.size}</span>
                </div>
                
                ${this.folders.map(folder => `
                    <div class="folder-item ${folder.bloggers.length > 0 ? 'has-items' : ''}" data-folder-id="${folder.id}">
                        <span class="folder-icon" style="color: ${folder.color}">📁</span>
                        <span class="folder-name">${folder.name}</span>
                        <span class="folder-count">${folder.bloggers.length}</span>
                        <div class="folder-actions">
                            <button class="btn-icon edit-folder" data-folder-id="${folder.id}" title="Редактировать">✏️</button>
                            <button class="btn-icon delete-folder" data-folder-id="${folder.id}" title="Удалить">🗑️</button>
                        </div>
                    </div>
                `).join('')}
                
                ${this.folders.length === 0 ? `
                    <div class="empty-state">
                        <p>Папок пока нет</p>
                        <p class="muted">Создайте первую папку для организации блогеров</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Прикрепление обработчиков для сайдбара
    attachFolderSidebarListeners() {
        // Открытие папки
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-actions')) {
                    const folderId = item.dataset.folderId;
                    this.openFolder(folderId);
                }
            });
        });

        // Редактирование папки
        document.querySelectorAll('.edit-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                this.showEditFolderModal(folderId);
            });
        });

        // Удаление папки
        document.querySelectorAll('.delete-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                this.confirmDeleteFolder(folderId);
            });
        });
    }

    // Открытие папки
    openFolder(folderId) {
        if (folderId === 'favorites') {
            this.showFavorites();
        } else {
            this.showFolderContent(folderId);
        }
    }

    // Показ содержимого папки
    showFolderContent(folderId) {
        // Здесь будет логика отображения содержимого папки
        console.log('Opening folder:', folderId);
    }

    // Показ избранного
    showFavorites() {
        // Здесь будет логика отображения избранного
        console.log('Showing favorites');
    }

    // Модальное окно создания папки
    showCreateFolderModal() {
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>Создать новую папку</h3>
                    <div class="field">
                        <label>Название папки</label>
                        <input type="text" id="newFolderName" placeholder="Например: Топ блогеры" />
                    </div>
                    <div class="field">
                        <label>Цвет папки</label>
                        <div class="color-picker">
                            ${this.getColorOptions().map(color => `
                                <label class="color-option" style="background: ${color}">
                                    <input type="radio" name="folderColor" value="${color}" ${color === '#667eea' ? 'checked' : ''}>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="field">
                        <label class="checkbox">
                            <input type="checkbox" id="folderPrivate"> 
                            <span>Приватная папка</span>
                        </label>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelCreateFolder">Отмена</button>
                        <button class="btn" id="confirmCreateFolder">Создать</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Обработчики для модального окна
        document.getElementById('confirmCreateFolder').addEventListener('click', () => {
            const name = document.getElementById('newFolderName').value;
            const color = document.querySelector('input[name="folderColor"]:checked').value;
            const isPrivate = document.getElementById('folderPrivate').checked;
            
            if (name.trim()) {
                this.createFolder(name, color, isPrivate);
                this.closeModal();
            }
        });

        document.getElementById('cancelCreateFolder').addEventListener('click', this.closeModal);
    }

    // Варианты цветов для папок
    getColorOptions() {
        return [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#43e97b', '#fa709a', '#ffecd2',
            '#fc4a1a', '#f7b733', '#6a11cb', '#2575fc'
        ];
    }

    // Закрытие модального окна
    closeModal() {
        document.querySelector('.modal-overlay')?.remove();
    }

    // Обработчик глобальных кликов
    handleGlobalClick(e) {
        // Закрытие выпадающих меню при клике вне их
        if (!e.target.closest('.folder-actions') && !e.target.closest('.add-to-folder-menu')) {
            this.closeAllMenus();
        }
    }

    // Закрытие всех меню
    closeAllMenus() {
        document.querySelectorAll('.add-to-folder-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    // Обработчик добавления в папку
    handleAddToFolder(event) {
        const button = event.target.closest('.add-to-folder-btn');
        if (!button) return;

        const bloggerId = button.dataset.bloggerId;
        if (!bloggerId) return;

        // Показать меню выбора папки
        this.showAddToFolderMenu(button, bloggerId);
    }

    // Показать меню добавления в папку
    showAddToFolderMenu(button, bloggerId) {
        // Закрыть другие меню
        this.closeAllMenus();

        const menuHTML = `
            <div class="add-to-folder-menu">
                <div class="menu-header">
                    <span>Добавить в папку</span>
                </div>
                <div class="menu-items">
                    ${this.folders.map(folder => `
                        <div class="menu-item" data-folder-id="${folder.id}">
                            <span class="folder-color" style="background: ${folder.color}"></span>
                            <span>${folder.name}</span>
                            ${this.getFolderBloggers(folder.id).includes(bloggerId) ? 
                                '<span class="already-added">✓</span>' : ''}
                        </div>
                    `).join('')}
                    ${this.folders.length === 0 ? 
                        '<div class="menu-item muted">Нет папок</div>' : ''}
                </div>
                <div class="menu-footer">
                    <button class="btn-sm create-folder-from-menu">+ Новая папка</button>
                </div>
            </div>
        `;

        const menu = document.createElement('div');
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Позиционирование меню
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.zIndex = '1000';

        // Обработчики для меню
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const folderId = item.dataset.folderId;
                if (folderId) {
                    this.addToFolder(bloggerId, folderId);
                    menu.remove();
                }
            });
        });

        menu.querySelector('.create-folder-from-menu').addEventListener('click', () => {
            this.showCreateFolderModal();
            menu.remove();
        });

        // Закрытие меню при клике вне его
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target) && e.target !== button) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        });
    }
}

// Инициализация системы при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.foldersSystem = new FoldersSystem();
});

// Вспомогательные функции для интеграции с карточками блогеров
function enhanceBloggerCard(bloggerCard, bloggerData) {
    if (!bloggerData || !bloggerData.id) return;

    const actionsHTML = `
        <div class="blogger-actions">
            <button class="btn-icon toggle-favorite" data-blogger-id="${bloggerData.id}" 
                    title="${window.foldersSystem.isFavorite(bloggerData.id) ? 'Удалить из избранного' : 'В избранное'}">
                ${window.foldersSystem.isFavorite(bloggerData.id) ? '⭐' : '☆'}
            </button>
            <button class="btn-icon add-to-folder-btn" data-blogger-id="${bloggerData.id}" title="Добавить в папку">
                📁
            </button>
        </div>
    `;

    const actionsContainer = bloggerCard.querySelector('.blogger-actions') || 
                           bloggerCard.querySelector('.card-actions');
    
    if (actionsContainer) {
        actionsContainer.innerHTML += actionsHTML;
    } else {
        bloggerCard.insertAdjacentHTML('beforeend', actionsHTML);
    }
}