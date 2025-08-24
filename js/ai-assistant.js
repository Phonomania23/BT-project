// js/ai-assistant.js - ИИ-ассистент для улучшения брифингов
class AIAssistant {
    constructor() {
        this.apiKey = null;
        this.isEnabled = false;
        this.suggestions = [];
        this.init();
    }

    // Инициализация ассистента
    init() {
        this.loadAPIKey();
        this.setupEventListeners();
        this.checkAIAvailability();
    }

    // Загрузка API ключа (в реальном приложении из безопасного источника)
    loadAPIKey() {
        this.apiKey = localStorage.getItem('ai_api_key') || null;
        this.isEnabled = !!this.apiKey;
    }

    // Проверка доступности ИИ
    checkAIAvailability() {
        const aiToggle = document.getElementById('aiToggle');
        if (aiToggle) {
            aiToggle.checked = this.isEnabled;
            this.updateUIStatus();
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Переключение ИИ
        document.getElementById('aiToggle')?.addEventListener('change', (e) => {
            this.isEnabled = e.target.checked;
            this.updateUIStatus();
            
            if (this.isEnabled && !this.apiKey) {
                this.showAPIKeyModal();
            } else if (this.isEnabled) {
                this.analyzeBrief();
            }
        });

        // Кнопка анализа
        document.getElementById('analyzeBriefBtn')?.addEventListener('click', () => {
            this.analyzeBrief();
        });

        // Сохранение API ключа
        document.getElementById('saveAPIKey')?.addEventListener('click', () => {
            this.saveAPIKey();
        });

        // Автоматический анализ при изменении текста
        const briefTextarea = document.getElementById('briefGoal');
        if (briefTextarea) {
            briefTextarea.addEventListener('input', this.debounce(() => {
                if (this.isEnabled && briefTextarea.value.length > 50) {
                    this.analyzeBrief();
                }
            }, 1000));
        }
    }

    // Анализ брифа
    async analyzeBrief() {
        if (!this.isEnabled) return;

        const briefText = document.getElementById('briefGoal')?.value;
        const budget = document.getElementById('briefBudget')?.value;
        const deadline = document.getElementById('briefDeadline')?.value;

        if (!briefText || briefText.length < 20) {
            this.showMessage('Введите более подробное описание цели для анализа', 'warning');
            return;
        }

        this.showLoading();

        try {
            const suggestions = await this.generateSuggestions(briefText, budget, deadline);
            this.displaySuggestions(suggestions);
        } catch (error) {
            console.error('Ошибка анализа брифа:', error);
            this.showMessage('Ошибка при анализе брифа. Проверьте API ключ.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Генерация предложений (имитация или реальный API вызов)
    async generateSuggestions(briefText, budget, deadline) {
        // В реальном приложении здесь будет вызов к OpenAI API
        if (this.apiKey && this.apiKey !== 'demo') {
            return await this.callOpenAI(briefText, budget, deadline);
        } else {
            // Демо-режим с заранее подготовленными предложениями
            return this.generateDemoSuggestions(briefText, budget, deadline);
        }
    }

    // Вызов OpenAI API
    async callOpenAI(briefText, budget, deadline) {
        const prompt = this.buildPrompt(briefText, budget, deadline);
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка API OpenAI');
            }

            const data = await response.json();
            return this.parseAIResponse(data.choices[0].message.content);
        } catch (error) {
            throw new Error('Ошибка соединения с OpenAI');
        }
    }

    // Построение промпта для ИИ
    buildPrompt(briefText, budget, deadline) {
        return `
        Проанализируй бриф для collaboration с блогером и предложи улучшения:

        ОРИГИНАЛЬНЫЙ БРИФ:
        ${briefText}

        БЮДЖЕТ: ${budget || 'не указан'} руб.
        ДЕДЛАЙН: ${deadline || 'не указан'}

        Проанализируй и предложи улучшения по следующим категориям:
        1. Четкость и конкретность цели
        2. Измеримость результатов
        3. Релевантность для блогера
        4. Призыв к действию
        5. Оптимизация под платформу
        6. Улучшение формулировок

        Верни ответ в формате JSON:
        {
          "score": число от 1 до 10,
          "summary": "краткое резюме",
          "suggestions": [
            {
              "category": "название категории",
              "suggestion": "текст предложения",
              "priority": "high/medium/low"
            }
          ],
          "improvedBrief": "улучшенная версия брифа"
        }
        `;
    }

    // Парсинг ответа от ИИ
    parseAIResponse(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            // Fallback для некорректного JSON
            return this.generateDemoSuggestions();
        }
    }

    // Демо-предложения (если API недоступно)
    generateDemoSuggestions(briefText, budget, deadline) {
        return {
            score: Math.floor(Math.random() * 4) + 6, // 6-9 баллов
            summary: "Хороший стартовый бриф, но можно улучшить конкретику и измеримость",
            suggestions: [
                {
                    category: "Конкретность цели",
                    suggestion: "Добавьте конкретные KPI: охват, engagement rate, конверсии",
                    priority: "high"
                },
                {
                    category: "Измеримость результатов",
                    suggestion: "Укажите ожидаемые метрики: количество просмотров, лайков, комментариев",
                    priority: "high"
                },
                {
                    category: "Призыв к действию",
                    suggestion: "Добавьте четкий call-to-action для аудитории блогера",
                    priority: "medium"
                },
                {
                    category: "Релевантность",
                    suggestion: "Увяжите продукт с тематикой блогера более органично",
                    priority: "medium"
                }
            ],
            improvedBrief: this.generateImprovedBrief(briefText)
        };
    }

    // Генерация улучшенного брифа
    generateImprovedBrief(originalBrief) {
        return `Улучшенная версия: ${originalBrief}\n\nДобавлены конкретные KPI и измеримые цели. Улучшена структура и призывы к действию.`;
    }

    // Отображение предложений
    displaySuggestions(data) {
        const container = document.getElementById('aiSuggestions');
        if (!container) return;

        container.innerHTML = this.renderSuggestionsHTML(data);
        this.setupSuggestionListeners();
    }

    // Рендер HTML предложений
    renderSuggestionsHTML(data) {
        return `
            <div class="ai-score">
                <div class="score-circle" style="--score: ${data.score * 10}%">
                    <span>${data.score}/10</span>
                </div>
                <p>${data.summary}</p>
            </div>

            <div class="suggestions-list">
                <h4>Предложения для улучшения:</h4>
                ${data.suggestions.map(suggestion => `
                    <div class="suggestion-item" data-priority="${suggestion.priority}">
                        <div class="suggestion-header">
                            <span class="priority-badge ${suggestion.priority}">${this.getPriorityLabel(suggestion.priority)}</span>
                            <strong>${suggestion.category}</strong>
                        </div>
                        <p>${suggestion.suggestion}</p>
                        <button class="btn-sm apply-suggestion" data-suggestion="${this.escapeHtml(suggestion.suggestion)}">
                            Применить
                        </button>
                    </div>
                `).join('')}
            </div>

            <div class="improved-brief">
                <h4>Улучшенная версия брифа:</h4>
                <div class="brief-preview">${data.improvedBrief}</div>
                <button class="btn use-improved-brief">Использовать этот вариант</button>
            </div>
        `;
    }

    // Настройка обработчиков для предложений
    setupSuggestionListeners() {
        // Применить отдельное предложение
        document.querySelectorAll('.apply-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suggestion = e.target.dataset.suggestion;
                this.applySuggestion(suggestion);
            });
        });

        // Использовать улучшенный бриф
        document.querySelector('.use-improved-brief')?.addEventListener('click', () => {
            const improvedBrief = document.querySelector('.brief-preview')?.textContent;
            if (improvedBrief) {
                document.getElementById('briefGoal').value = improvedBrief;
                this.showMessage('Бриф обновлен!', 'success');
            }
        });
    }

    // Применение предложения
    applySuggestion(suggestion) {
        const textarea = document.getElementById('briefGoal');
        if (textarea) {
            textarea.value += '\n\n' + suggestion;
            this.showMessage('Предложение добавлено в бриф', 'success');
        }
    }

    // Вспомогательные методы
    getPriorityLabel(priority) {
        const labels = { high: 'Высокая', medium: 'Средняя', low: 'Низкая' };
        return labels[priority] || priority;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // UI методы
    showLoading() {
        const container = document.getElementById('aiSuggestions');
        if (container) {
            container.innerHTML = `
                <div class="ai-loading">
                    <div class="loading-spinner"></div>
                    <p>Анализируем бриф...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Убираем спиннер, если он есть
    }

    showMessage(message, type = 'info') {
        // Показать уведомление
        console.log(`${type}: ${message}`);
    }

    updateUIStatus() {
        const status = document.getElementById('aiStatus');
        if (status) {
            status.textContent = this.isEnabled ? 'Включен' : 'Выключен';
            status.className = this.isEnabled ? 'status-enabled' : 'status-disabled';
        }
    }

    showAPIKeyModal() {
        // Показать модальное окно для ввода API ключа
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>Введите API ключ OpenAI</h3>
                    <p>Для использования ИИ-ассистента требуется API ключ</p>
                    <input type="password" id="apiKeyInput" placeholder="sk-...">
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelAPIKey">Отмена</button>
                        <button class="btn" id="saveAPIKey">Сохранить</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Обработчики для модального окна
        document.getElementById('saveAPIKey').addEventListener('click', () => {
            this.saveAPIKey();
        });

        document.getElementById('cancelAPIKey').addEventListener('click', () => {
            this.closeModal();
            document.getElementById('aiToggle').checked = false;
        });
    }

    saveAPIKey() {
        const apiKey = document.getElementById('apiKeyInput')?.value;
        if (apiKey && apiKey.startsWith('sk-')) {
            this.apiKey = apiKey;
            localStorage.setItem('ai_api_key', apiKey);
            this.isEnabled = true;
            this.closeModal();
            this.analyzeBrief();
        } else {
            this.showMessage('Введите корректный API ключ', 'error');
        }
    }

    closeModal() {
        document.querySelector('.modal-overlay')?.remove();
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
});