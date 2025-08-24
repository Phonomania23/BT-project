/* =========  DESIGN TOKENS (из скриншота) ========= */
:root{
  /* База */
  --bg-body: #0f1012;           /* тёмный фон страницы */
  --surface: #f5f6f7;           /* светлая «карточка»/панель */
  --surface-2: #ffffff;
  --text: #eef1f3;              /* основной текст на тёмном фоне */
  --text-muted: #a3a8b0;
  --text-on-surface: #121417;   /* текст на светлой карточке */
  --border: #262a2f;            /* бордеры на тёмном */
  --surface-border: #e4e7ec;    /* бордеры на светлом */

  /* Акценты (из логотипа/кнопок) */
  --primary: #c7ff1a;           /* лаймовый (кнопка «Продолжить» на скрине) */
  --primary-hover: #b2ea15;
  --primary-active: #99cf12;
  --primary-ink: #0e0f11;       /* текст на primary */

  --accent: #9b51ff;            /* фиолетовый (кнопка Pro) */
  --accent-hover: #8a3fff;
  --accent-active: #782dff;
  --accent-ink: #ffffff;

  --link: #61d1ff;              /* ссылки в тексте на тёмном */

  /* Формы/радиусы/анимации */
  --radius: 12px;
  --radius-sm: 8px;
  --shadow-1: 0 8px 24px rgba(0,0,0,.28);
  --shadow-2: 0 2px 8px rgba(0,0,0,.10);
  --focus: 0 0 0 3px rgba(199,255,26,.35);
}

/* =========  БАЗА/ТИПОГРАФИКА ========= */
*{ box-sizing:border-box }
html,body{ height:100% }
body{
  margin:0;
  background:var(--bg-body);
  color:var(--text);
  font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
h1,h2,h3{ color:#fff; margin:0 0 .6rem }
h1{ font-size: clamp(22px, 3vw, 28px) }
h2{ font-size: clamp(18px, 2.4vw, 22px) }
p{ margin:.4rem 0 .8rem }
a{
  color:var(--link);
  text-decoration:none;
}
a:hover{ text-decoration:underline }

/* =========  КНОПКИ (совместимо с .btn) ========= */
.button,.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:10px 16px;
  border-radius: var(--radius);
  border:1px solid transparent;
  background: var(--primary);
  color: var(--primary-ink);
  font-weight: 600;
  cursor:pointer;
  transition: background .15s ease, transform .02s ease, border-color .15s ease, color .15s ease;
  box-shadow: var(--shadow-2);
}
.button:hover,.btn:hover{ background: var(--primary-hover); }
.button:active,.btn:active{ background: var(--primary-active); transform: translateY(1px); }
.button:focus-visible,.btn:focus-visible{ outline:none; box-shadow: var(--focus); }

/* Вторичная — теперь ФИОЛЕТОВАЯ заливка (как на скриншоте) */
.btn-secondary{
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}
.btn-secondary:hover{
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}
.btn-secondary:active{
  background: var(--accent-active);
  border-color: var(--accent-active);
}
.btn-secondary:focus-visible{
  outline: none;
  box-shadow: 0 0 0 3px rgba(155,81,255,.35);
}

/* Признаки опасных действий */
.btn-danger{
  background:#ff4141; color:#fff; border-color:#ff4141;
}
.btn-danger:hover{ background:#e33939 }

/* Состояния */
.btn:disabled, .button:disabled{ opacity:.55; cursor:not-allowed }

/* =========  ФОРМЫ ========= */
input,select,textarea{
  width:100%;
  padding:10px 12px;
  border:1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-on-surface);
}
input::placeholder,textarea::placeholder{ color:#8c9197 }
input:focus,select:focus,textarea:focus{
  outline:none; border-color: var(--accent); box-shadow: var(--focus);
}

/* =========  КАРТОЧКИ/ТЕКСТ НА СВЕТЛОМ ========= */
.card{
  background: var(--surface);
  color: var(--text-on-surface);
  border:1px solid var(--surface-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-2);
}
.card h1,.card h2,.card h3{ color:#0e0f11 }

/* =========  МЕЛОЧИ ========= */
.muted{ color: var(--text-muted) }
.badge{
  display:inline-block; padding:2px 8px; border-radius:999px;
  border:1px solid rgba(199,255,26,.55);
  color:#0e0f11; background: rgba(199,255,26,.22);
  font-size:.82rem; font-weight:600;
}
.row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }

/* =========  ПРОГРЕСС/СТЕППЕР ========= */
.steps{ display:flex; gap:8px; flex-wrap:wrap; margin:0; padding:0; list-style:none }
.step{
  padding:8px 12px; border:1px solid var(--border); border-radius:10px;
  background: transparent; color:#c9cdd4; user-select:none; cursor:default;
  transition: background .2s, border-color .2s, color .2s, opacity .2s;
}
.step[data-active="true"]{
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-ink);
}
.step[data-done="true"]{
  border-color: var(--accent);
  color: #e9ddff;
}
.step[data-disabled="true"]{ opacity:.5 }

/* Полупрозрачная блокировка будущих этапов (из deal.html) */
.locked{
  position:relative; opacity:.6; pointer-events:none;
}
.locked::after{
  content:"Завершите предыдущий этап";
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(245,246,247,.55);
  color:#0e0f11; font-weight:700; border-radius: var(--radius);
}

/* =========  СТИЛИ ДЛЯ СДЕЛОК (DEAL) ========= */
.deal-wrap {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  min-height: calc(100vh - 120px);
}

.deal-sidebar {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--surface-border);
}

.steps-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.steps-vertical a {
  display: block;
  padding: 12px 16px;
  color: var(--text-on-surface);
  text-decoration: none;
  border-radius: var(--radius-sm);
  border-left: 3px solid transparent;
  transition: all 0.3s ease;
}

.steps-vertical a:hover {
  background: var(--surface-2);
  border-left-color: var(--accent);
}

.steps-vertical a.step-active {
  background: var(--surface-2);
  border-left-color: var(--primary);
  font-weight: 600;
}

.deal-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.deal-tabs {
  display: flex;
  gap: 2px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.deal-tabs button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: var(--surface-2);
  color: var(--text-on-surface);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.deal-tabs button:hover {
  background: var(--surface);
}

.deal-tabs button.tab-active {
  background: var(--primary);
  color: var(--primary-ink);
}

.deal-footer {
  margin-top: auto;
  padding: 20px 0;
  border-top: 1px solid var(--surface-border);
}

/* Стили для фильтров */
.filterbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  background: var(--surface-2);
  border-radius: var(--radius);
  border: 1px solid var(--surface-border);
  margin: 16px 0;
}

.chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.chip label {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--text-on-surface);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.chip-filter {
  display: inline-flex;
  align-items: center;
  background: rgba(199, 255, 26, 0.15);
  padding: 6px 12px;
  border-radius: 16px;
  margin: 4px;
  font-size: 14px;
  color: var(--primary-ink);
  border: 1px solid var(--primary);
}

.chip-filter button {
  background: none;
  border: none;
  margin-left: 6px;
  cursor: pointer;
  color: var(--primary-ink);
  font-weight: bold;
}

.aibar {
  background: linear-gradient(135deg, rgba(155, 81, 255, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%);
  border: 1px solid var(--accent);
}

.cards-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.blogger-card {
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--surface);
}

.blogger-card:hover {
  box-shadow: var(--shadow-1);
  transform: translateY(-2px);
}

.blogger-card.selected {
  background: rgba(199, 255, 26, 0.15);
  border-color: var(--primary);
}

/* Стили для ИИ-ассистента */
.ai-assistant {
  margin: 20px 0;
  padding: 20px;
  background: var(--surface-2);
  border-radius: var(--radius);
  border: 1px solid var(--surface-border);
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--surface-border);
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.ai-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: 600;
}

.status-enabled {
  background: rgba(76, 175, 80, 0.2);
  color: #2e7d32;
}

.status-disabled {
  background: rgba(244, 67, 54, 0.2);
  color: #d32f2f;
}

.ai-suggestions {
  margin-top: 20px;
}

.ai-score {
  text-align: center;
  margin-bottom: 25px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(var(--primary) var(--score), var(--surface-border) 0);
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 70px;
  height: 70px;
  background: var(--surface);
  border-radius: 50%;
}

.score-circle span {
  position: relative;
  z-index: 1;
  font-weight: bold;
  font-size: 1.2em;
  color: var(--text-on-surface);
}

.suggestions-list {
  margin-bottom: 25px;
}

.suggestion-item {
  padding: 15px;
  margin: 10px 0;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--surface-border);
}

.suggestion-item[data-priority="high"] {
  border-left-color: #f44336;
}

.suggestion-item[data-priority="medium"] {
  border-left-color: #ff9800;
}

.suggestion-item[data-priority="low"] {
  border-left-color: #4caf50;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8em;
  font-weight: 600;
}

.priority-badge.high {
  background: rgba(244, 67, 54, 0.2);
  color: #d32f2f;
}

.priority-badge.medium {
  background: rgba(255, 152, 0, 0.2);
  color: #f57c00;
}

.priority-badge.low {
  background: rgba(76, 175, 80, 0.2);
  color: #2e7d32;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.9em;
  margin-top: 8px;
}

.improved-brief {
  background: var(--surface);
  padding: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-border);
}

.brief-preview {
  background: var(--surface-2);
  padding: 15px;
  border-radius: var(--radius-sm);
  margin: 15px 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

.ai-loading {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--surface-border);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--surface);
  padding: 25px;
  border-radius: var(--radius);
  max-width: 500px;
  width: 90%;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Стили для статусов */
.status-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-success { background-color: #4CAF50; }
.status-waiting { background-color: #FFC107; }
.status-error { background-color: #F44336; }

/* Адаптивность */
@media (max-width: 768px) {
  .deal-wrap {
    grid-template-columns: 1fr;
  }
  
  .deal-sidebar {
    order: 2;
  }
  
  .filterbar {
    flex-direction: column;
  }
  
  .chip {
    min-width: 100%;
  }
  
  .deal-tabs {
    flex-direction: column;
  }
  
  .ai-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Анимации */
.fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Улучшенные поля форм для сделок */
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.field label {
  color: var(--text-on-surface);
  font-weight: 600;
  font-size: 14px;
}

/* Стили для сеток в сделках */
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

/* Специфические стили для этапов сделки */
.stage-section {
  padding: 24px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--surface-border);
  margin-bottom: 20px;
}

.stage-section h2 {
  color: var(--text-on-surface);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--surface-border);
}

/* Стили для списков в сделках */
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list li {
  padding: 12px;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  background: var(--surface-2);
}