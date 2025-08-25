<!-- /js/ai-brief.js -->
<script>
/**
 * AI Brief Module — клиентский модуль анализа/улучшения брифов.
 * - Кэширует результаты по хешу ввода (LS + TTL)
 * - Вызывает /api/ai-brief (OpenAI или аналог)
 * - Имеет резервный оффлайн-анализ на эвристиках
 * - Экспортирует window.AIBrief и хелперы для шага 2
 *
 * Ожидаемая разметка на шаге 2 (/deal/index.html):
 *   - textarea#briefGoal, input#briefBudget, input#briefDeadline (как есть)
 *   - контейнер для вывода: #aiBriefPanel
 *   - кнопки: #aiAnalyzeBtn, #aiApplyBtn
 */
(function () {
  const LS_KEY = "aiBriefCacheV1";
  const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 дней

  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  function readJSON(key, def){ try{ return JSON.parse(localStorage.getItem(key)||JSON.stringify(def)); }catch{ return def; } }
  function writeJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }

  /** Быстрый хеш (fallback), если SubtleCrypto недоступен */
  function poorHash(str){
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h += (h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24);
    }
    return ("0000000"+(h>>>0).toString(16)).slice(-8);
  }

  async function sha256(data){
    try{
      const enc = new TextEncoder().encode(data);
      const buf = await crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
    }catch{
      return poorHash(data);
    }
  }

  function now(){ return Date.now(); }

  function getCache(){
    const data = readJSON(LS_KEY, { items:{} });
    if (!data.items) data.items = {};
    return data;
  }
  function setCache(cache){ writeJSON(LS_KEY, cache); }

  function getFromCache(key){
    const cache = getCache();
    const rec = cache.items[key];
    if (!rec) return null;
    if (rec.expires && rec.expires < now()){
      delete cache.items[key];
      setCache(cache);
      return null;
    }
    return rec.value;
  }

  function setToCache(key, value, ttl=DEFAULT_TTL_MS){
    const cache = getCache();
    cache.items[key] = { value, expires: now()+ttl };
    setCache(cache);
  }

  /** Эвристический оффлайн-анализ — когда API недоступно */
  function fallbackAnalyze(brief){
    const issues = [];
    const questions = [];
    const suggestions = [];
    const ideas = [];
    const formats = [];

    const goal = (brief.goal||"").trim();
    const budget = +brief.budget || 0;
    const deadline = (brief.deadline||"").trim();

    if (!goal) issues.push("Не указана цель кампании.");
    if (!budget) issues.push("Не указан бюджет (₽).");
    if (!deadline) issues.push("Не указан дедлайн.");

    // Рекомендуемые дополнения
    if (!/аудитор/i.test(goal)) suggestions.push("Добавьте описание целевой аудитории: возраст, гео, интересы, pain points.");
    if (!/cta|призыв|действ/i.test(goal)) suggestions.push("Пропишите чёткий CTA (действие после просмотра).");
    if (!/kpi|роас|cpa|cpl|просмотр/i.test(goal)) suggestions.push("Определите KPI/метрики успеха: CPA/CPL/ROAS, просмотры, CTR, код/UTM.");
    if (!/tone|тон/i.test(goal)) suggestions.push("Уточните тон/стиль: экспертный, дружелюбный, провокационный и т.д.");
    if (!/формат|ролик|сторис|shorts|reels/i.test(goal)) suggestions.push("Определите форматы: обзор, интеграция, челлендж, туториал, UGC.");

    // Идеи — примитивно, на основе упоминаний в цели
    const isTech = /техник|гаджет|софт|app|прилож/i.test(goal);
    const isBeauty = /красот|beauty|космет/i.test(goal);
    const isFood = /еда|food|рецеп/i.test(goal);
    const isEdu = /курс|обуч|образован/i.test(goal);

    if (isTech){
      ideas.push(
        "Серия «7 дней с продуктом»: честный дневник опыта",
        "«Мифы и правда» о продукте — краш-тест и сравнение",
        "Челлендж «смена привычки за неделю» с фиксацией метрик"
      );
      formats.push("YouTube интеграция 60–90 сек", "Shorts/Reels: 3×15–30 сек", "TikTok челлендж");
    } else if (isBeauty){
      ideas.push(
        "До/после с прозрачной методологией",
        "Разбор состава и аналогов («value за рубль»)",
        "Съёмка «рутина дня» с продуктом в естественном контексте"
      );
      formats.push("Reels/TikTok 3×20–30 сек", "UGC-отзывы", "Интеграция у эксперта");
    } else if (isFood){
      ideas.push(
        "«5 быстрых рецептов за 15 минут» с продуктом",
        "Слепая дегустация vs конкуренты",
        "«Неделя рационов» — план питания с ценой"
      );
      formats.push("Short-form сериалы", "YouTube интеграция", "Shorts с нарезками рецептов");
    } else if (isEdu){
      ideas.push(
        "«30-дневный челлендж навыка» с чек-листами",
        "Кейс «ноль → результат за 2 недели»",
        "Обзор полезных фреймворков и практик"
      );
      formats.push("YouTube long-form 5–10 мин", "Карусели в IG", "TikTok разборы");
    } else {
      ideas.push(
        "Челлендж «7 дней — 7 инсайтов»",
        "История пользователя (UGC) + честный отзыв",
        "«Ошибки и как их избежать» — экспертный формат"
      );
      formats.push("Интеграция 45–90 сек", "3×Shorts/Reels", "Стрим/AMA 20–40 мин");
    }

    // Слабая оценка полноты (0–100)
    let score = 40;
    if (goal) score += 20;
    if (budget) score += 20;
    if (deadline) score += 10;
    if (suggestions.length <= 2) score += 10;

    return {
      source: "fallback",
      score: Math.max(0, Math.min(100, score)),
      issues,
      questions: questions.length ? questions : [
        "Кто основная ЦА? Возраст/гео/интересы/уровень дохода.",
        "Какой ключевой инсайт/боль аудитории решает продукт?",
        "Какой CTA и целевая посадочная? Нужен промокод/UTM?",
        "Есть ли ограничения по креативу/сообщениям/конкурентам?",
        "Какие KPI важнее всего (просмотры/CPA/ROAS/регистрации)?"
      ],
      suggestions,
      ideas,
      formats
    };
  }

  /** Вызов серверного эндпоинта (можно заменить на любой аналог) */
  async function callAPI(brief, signal){
    const r = await fetch("/api/ai-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief }),
      signal
    });
    if (!r.ok) {
      const text = await r.text().catch(()=> "");
      throw new Error(`API ${r.status}: ${text||r.statusText}`);
    }
    const data = await r.json();
    if (!data || data.ok !== true || !data.result) {
      throw new Error(data && data.error || "Некорректный ответ AI");
    }
    return data.result;
  }

  /** Публичный метод анализа + кэш */
  async function analyze(brief, opts={}){
    const ttl = Number(opts.ttlMs ?? DEFAULT_TTL_MS) || DEFAULT_TTL_MS;
    const keyInput = JSON.stringify({
      goal: (brief.goal||"").trim(),
      budget: Number(brief.budget||0),
      deadline: (brief.deadline||"").trim(),
      audience: (brief.audience||"").trim(),
      product: (brief.product||"").trim(),
      kpi: (brief.kpi||"").trim(),
      tone: (brief.tone||"").trim(),
      platforms: (brief.platforms||"").trim()
    });
    const hash = await sha256(keyInput);

    const cached = getFromCache(hash);
    if (cached) return { ...cached, cached: true };

    // Пытаемся API → иначе fallback
    try{
      const ctrl = new AbortController();
      const timer = setTimeout(()=> ctrl.abort(), opts.timeoutMs || 20000);
      const result = await callAPI(JSON.parse(keyInput), ctrl.signal);
      clearTimeout(timer);
      setToCache(hash, { ...result, cached:false }, ttl);
      return result;
    }catch(e){
      const fb = fallbackAnalyze(JSON.parse(keyInput));
      setToCache(hash, { ...fb, cached:false }, ttl);
      return fb;
    }
  }

  /** Рендер результата в контейнер */
  function renderResult(container, res){
    if (!container) return;
    const esc = (s)=> String(s||"").replace(/[&<>"]/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;" }[m]));
    const li = (arr)=> arr && arr.length ? "<ul>"+arr.map(x=>`<li>${esc(x)}</li>`).join("")+"</ul>" : "<div class='muted'>—</div>";
    container.innerHTML = `
      <div class="card" style="border-color:#e0e0e0">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h3 style="margin:0">AI-оценка брифа</h3>
          <span class="badge" title="${res.cached ? "из кэша" : (res.source||"ai")}">Score: <strong>${Number(res.score||0)}</strong>/100</span>
        </div>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap:16px; margin-top:10px">
          <div>
            <div class="muted" style="font-weight:700;margin-bottom:6px">Пробелы/неясности</div>
            ${li(res.issues)}
          </div>
          <div>
            <div class="muted" style="font-weight:700;margin-bottom:6px">Что уточнить у бренда</div>
            ${li(res.questions)}
          </div>
          <div>
            <div class="muted" style="font-weight:700;margin-bottom:6px">Рекомендации</div>
            ${li(res.suggestions)}
          </div>
          <div>
            <div class="muted" style="font-weight:700;margin-bottom:6px">Идеи креативов</div>
            ${li(res.ideas)}
          </div>
          <div>
            <div class="muted" style="font-weight:700;margin-bottom:6px">Оптимальные форматы</div>
            ${li(res.formats)}
          </div>
        </div>
      </div>
    `;
  }

  /** Собор данных из формы шага 2 (мягко — поля опциональны) */
  function collectFromStep2(){
    const v = id => document.getElementById(id)?.value?.trim() || "";
    return {
      goal: v("briefGoal"),
      budget: v("briefBudget"),
      deadline: v("briefDeadline"),
      audience: v("briefAudience"),
      product: v("briefProduct"),
      kpi: v("briefKPI"),
      tone: v("briefTone"),
      platforms: v("briefPlatforms")
    };
  }

  async function runFromUI(){
    const panel = document.getElementById("aiBriefPanel");
    const btn = document.getElementById("aiAnalyzeBtn");
    const applyBtn = document.getElementById("aiApplyBtn");
    if (!panel || !btn) return;

    btn.disabled = true; btn.textContent = "Анализ…";
    panel.innerHTML = `<div class="muted">AI анализирует бриф…</div>`;
    try{
      const data = collectFromStep2();
      const res = await analyze(data);
      renderResult(panel, res);
      if (applyBtn){
        applyBtn.disabled = false;
        applyBtn.onclick = () => applyRecommendationsToGoal(res);
      }
    }catch(e){
      panel.innerHTML = `<div class="muted">Не удалось выполнить анализ (${e.message||e}). Попробуйте позже.</div>`;
    }finally{
      btn.disabled = false; btn.textContent = "AI-анализ брифа";
    }
  }

  /** Применение рекомендаций: доклеиваем к цели короткое резюме */
  function applyRecommendationsToGoal(res){
    const goalEl = document.getElementById("briefGoal");
    if (!goalEl) return;
    const take = (arr, n)=> (arr||[]).slice(0,n);
    const append = [
      "",
      "— AI: основные рекомендации —",
      ...take(res.suggestions, 4).map((s,i)=>`${i+1}) ${s}`),
      "Идеи: " + take(res.ideas, 3).join(" · "),
      "Форматы: " + take(res.formats, 3).join(" · ")
    ].join("\n");
    goalEl.value = (goalEl.value||"").trim() + "\n\n" + append;
    try{
      goalEl.dispatchEvent(new Event("input", { bubbles:true }));
      goalEl.dispatchEvent(new Event("change", { bubbles:true }));
    }catch{}
  }

  // Экспорт
  window.AIBrief = { analyze, renderResult, runFromUI, collectFromStep2 };
})();
</script>
