// js/chat.js - основные функции чата
class ChatManager {
    constructor() {
        this.currentChat = null;
        this.messages = [];
        this.isTyping = false;
    }
    
    // Инициализация чата
    init(chatId, bloggerData) {
        this.currentChat = chatId;
        this.loadMessages(chatId);
        this.setupEventListeners();
        this.updateChatHeader(bloggerData);
    }
    
    // Загрузка сообщений
    async loadMessages(chatId) {
        try {
            // Здесь будет загрузка из localStorage или API
            const savedMessages = localStorage.getItem(`chat_${chatId}`);
            if (savedMessages) {
                this.messages = JSON.parse(savedMessages);
                this.renderMessages();
            }
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }
    
    // Сохранение сообщений
    async saveMessages() {
        if (this.currentChat) {
            localStorage.setItem(`chat_${this.currentChat}`, JSON.stringify(this.messages));
        }
    }
    
    // Отправка сообщения
    async sendMessage(content, type = 'outgoing', files = []) {
        const message = {
            id: Date.now(),
            content,
            type,
            timestamp: new Date().toISOString(),
            files,
            status: 'sent'
        };
        
        this.messages.push(message);
        this.renderMessage(message);
        await this.saveMessages();
        
        return message;
    }
    
    // Рендер всех сообщений
    renderMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = '';
        this.messages.forEach(message => this.renderMessage(message));
        this.scrollToBottom();
    }
    
    // Рендер одного сообщения
    renderMessage(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${message.type}`;
        messageDiv.dataset.messageId = message.id;
        
        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let filesHTML = '';
        if (message.files && message.files.length > 0) {
            filesHTML = message.files.map(file => `
                <div class="message-file">
                    <span>📄</span>
                    <span>${file.name}</span>
                </div>
            `).join('');
        }
        
        messageDiv.innerHTML = `
            <p class="message-content">${this.escapeHtml(message.content)}</p>
            ${filesHTML}
            <span class="message-time">${time}</span>
        `;
        
        container.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    // Показать индикатор набора
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const container = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <span>Собеседник печатает...</span>
        `;
        
        container.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    // Скрыть индикатор набора
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Прокрутка вниз
    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    // Обновление шапки чата
    updateChatHeader(bloggerData) {
        const header = document.querySelector('.chat-header');
        if (header && bloggerData) {
            // Обновляем аватар, имя и статус
        }
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики для отправки сообщений, загрузки файлов и т.д.
    }
    
    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Глобальный экземпляр чата
window.chatManager = new ChatManager();