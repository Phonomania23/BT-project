// blogger-analytics.js

// Конфигурация для аналитики
const ANALYTICS_CONFIG = {
  chartColors: {
    primary: 'rgba(101, 116, 255, 0.8)',
    secondary: 'rgba(155, 81, 255, 0.8)',
    accent: 'rgba(76, 175, 80, 0.8)',
    background: 'rgba(245, 246, 247, 0.1)'
  },
  metrics: {
    engagement: ['Очень низкий', 'Низкий', 'Средний', 'Высокий', 'Очень высокий'],
    audienceQuality: ['Низкое', 'Ниже среднего', 'Среднее', 'Выше среднего', 'Высокое']
  }
};

// Основной класс для расширенной аналитики
class BloggerAnalytics {
  constructor(bloggerData, containerSelector = '#analytics-container') {
    this.blogger = bloggerData;
    this.container = document.querySelector(containerSelector);
    this.charts = {};
  }

  // Инициализация аналитики
  init() {
    if (!this.container) {
      console.warn('Контейнер для аналитики не найден');
      return;
    }

    this.renderAnalytics();
    this.initCharts();
  }

  // Рендеринг аналитической информации
  renderAnalytics() {
    this.container.innerHTML = this.getAnalyticsHTML();
  }

  // Генерация HTML для аналитики
  getAnalyticsHTML() {
    const stats = this.calculateMetrics();
    
    return `
      <div class="analytics-section">
        <h3>📊 Расширенная аналитика</h3>
        
        <div class="analytics-grid">
          <!-- Основные метрики -->
          <div class="metric-card">
            <div class="metric-value">${stats.engagement.score}%</div>
            <div class="metric-label">Вовлеченность</div>
            <div class="metric-description">${stats.engagement.level}</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${stats.audienceQuality.score}/10</div>
            <div class="metric-label">Качество аудитории</div>
            <div class="metric-description">${stats.audienceQuality.level}</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${stats.avgViews.toLocaleString('ru-RU')}</div>
            <div class="metric-label">Ср. просмотры</div>
            <div class="metric-description">за 30 дней</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">${stats.retentionRate}%</div>
            <div class="metric-label">Удержание</div>
            <div class="metric-description">до конца ролика</div>
          </div>
        </div>

        <!-- Графики -->
        <div class="charts-grid">
          <div class="chart-container">
            <div class="chart-title">📈 Динамика подписчиков</div>
            <canvas id="subscribersChart" width="400" height="250"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-title">🔥 Вовлеченность постам</div>
            <canvas id="engagementChart" width="400" height="250"></canvas>
          </div>
        </div>

        <!-- Детальная статистика -->
        <div class="detailed-stats">
          <h4>📋 Детальная статистика</h4>
          <div class="stats-table">
            <div class="stat-row">
              <span>Макс. охват</span>
              <span>${stats.maxReach.toLocaleString('ru-RU')}</span>
            </div>
            <div class="stat-row">
              <span>CTR</span>
              <span>${stats.ctr}%</span>
            </div>
            <div class="stat-row">
              <span>Время публикации</span>
              <span>${stats.bestPostTime}</span>
            </div>
            <div class="stat-row">
              <span>Рост за месяц</span>
              <span>+${stats.monthlyGrowth} подписчиков</span>
            </div>
          </div>
        </div>

        <!-- Рекомендации -->
        <div class="recommendations">
          <h4>💡 Рекомендации</h4>
          <ul>
            ${stats.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  // Расчет метрик на основе данных блогера
  calculateMetrics() {
    const subs = this.blogger.subscribers || 100000;
    const avgViews = this.blogger.avgViews || Math.round(subs / 3);
    
    // Расчет вовлеченности (симуляция)
    const engagementScore = Math.min(100, Math.max(1, Math.round((avgViews / subs) * 100 * 1.5)));
    const engagementLevel = this.getEngagementLevel(engagementScore);
    
    // Расчет качества аудитории
    const audienceScore = Math.min(10, Math.max(1, Math.round((engagementScore / 10) + 4)));
    const audienceLevel = this.getAudienceQualityLevel(audienceScore);
    
    return {
      engagement: {
        score: engagementScore,
        level: engagementLevel
      },
      audienceQuality: {
        score: audienceScore,
        level: audienceLevel
      },
      avgViews: avgViews,
      retentionRate: Math.min(100, Math.max(20, Math.round(75 - (subs / 500000)))),
      maxReach: Math.round(avgViews * 1.8),
      ctr: (engagementScore / 10).toFixed(1),
      bestPostTime: this.getBestPostTime(),
      monthlyGrowth: Math.round(subs * 0.05),
      recommendations: this.generateRecommendations(engagementScore, audienceScore)
    };
  }

  // Определение уровня вовлеченности
  getEngagementLevel(score) {
    const levels = ANALYTICS_CONFIG.metrics.engagement;
    if (score >= 80) return levels[4];
    if (score >= 60) return levels[3];
    if (score >= 40) return levels[2];
    if (score >= 20) return levels[1];
    return levels[0];
  }

  // Определение качества аудитории
  getAudienceQualityLevel(score) {
    const levels = ANALYTICS_CONFIG.metrics.audienceQuality;
    if (score >= 8) return levels[4];
    if (score >= 6) return levels[3];
    if (score >= 5) return levels[2];
    if (score >= 4) return levels[1];
    return levels[0];
  }

  // Определение лучшего времени для публикации
  getBestPostTime() {
    const times = ['18:00-20:00', '16:00-18:00', '12:00-14:00', '20:00-22:00'];
    return times[Math.floor(Math.random() * times.length)];
  }

  // Генерация рекомендаций
  generateRecommendations(engagementScore, audienceScore) {
    const recommendations = [];
    
    if (engagementScore < 50) {
      recommendations.push('Увеличьте частоту взаимодействия с аудиторией в комментариях');
    }
    
    if (audienceScore < 6) {
      recommendations.push('Попробуйте более таргетированный контент для улучшения качества аудитории');
    }
    
    recommendations.push('Экспериментируйте с форматами: рилсы, сторис, прямые эфиры');
    recommendations.push('Анализируйте топовые посты и повторяйте успешные паттерны');
    
    return recommendations;
  }

  // Инициализация графиков
  initCharts() {
    this.initSubscribersChart();
    this.initEngagementChart();
  }

  // График динамики подписчиков
  initSubscribersChart() {
    const ctx = document.getElementById('subscribersChart')?.getContext('2d');
    if (!ctx) return;

    const data = this.generateSubscribersData();
    
    this.charts.subscribers = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен'],
        datasets: [{
          label: 'Подписчики',
          data: data,
          borderColor: ANALYTICS_CONFIG.chartColors.primary,
          backgroundColor: 'rgba(101, 116, 255, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  // График вовлеченности
  initEngagementChart() {
    const ctx = document.getElementById('engagementChart')?.getContext('2d');
    if (!ctx) return;

    this.charts.engagement = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Пон', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        datasets: [{
          label: 'Вовлеченность (%)',
          data: [65, 59, 80, 81, 56, 55, 40],
          backgroundColor: ANALYTICS_CONFIG.chartColors.secondary,
          borderColor: 'rgba(155, 81, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  // Генерация данных для графика подписчиков
  generateSubscribersData() {
    const base = (this.blogger.subscribers || 100000) * 0.7;
    return Array.from({length: 9}, (_, i) => 
      Math.round(base + (base * 0.1 * i) + (Math.random() * base * 0.05))
    );
  }

  // Обновление данных аналитики
  updateAnalytics(newData) {
    this.blogger = {...this.blogger, ...newData};
    this.renderAnalytics();
    this.updateCharts();
  }

  // Обновление графиков
  updateCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.initCharts();
  }

  // Экспорт данных аналитики
  exportData(format = 'json') {
    const data = this.calculateMetrics();
    
    if (format === 'json') {
      return JSON.stringify({
        blogger: this.blogger,
        analytics: data,
        timestamp: new Date().toISOString()
      }, null, 2);
    }
    
    return data;
  }
}

// Функция для быстрой инициализации аналитики
function initBloggerAnalytics(bloggerData, containerSelector = '#analytics-container') {
  const analytics = new BloggerAnalytics(bloggerData, containerSelector);
  analytics.init();
  return analytics;
}

// Автоматическая инициализация при наличии контейнера
document.addEventListener('DOMContentLoaded', function() {
  const analyticsContainer = document.querySelector('#analytics-container');
  if (analyticsContainer && window.bloggerData) {
    initBloggerAnalytics(window.bloggerData);
  }
});