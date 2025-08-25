// /js/ai-brief.js  — клиентский модуль AI-брифа (без <script> оболочки)
(function () {
  "use strict";

  // === Небольшая утилита: безопасный querySelector ===
  const $ = (sel, root = document) => root.querySelector(sel);

  // === Ключи кэша в localStorage ===
  const LS_KEY_CACHE = "aiBrief:cache:v1";
  const LS_KEY_API   = "OPENAI_API_KEY"; // Можно положить ключ в localStorage на dev

  // === Простой кэш (ключ — хэш данных брифа) ===
  const Cache = {
    readAll() { try { return JSON.parse(localStorage.getItem(LS_KEY_CACHE) || "{}"); } catch { return {}; } },
    writeAll(obj) { try { localStorage.setItem(LS_KEY_CACHE, JSON.stringify(obj)); } catch {} },
    get(hash) { return this.readAll()[hash]; },
    set(hash, value) { const all = this.readAll(); all[hash] = value; this.writeAll(all); }
  };

  // Простой хеш для строки (без крипто, нам для кэша ок)
  function hashOf(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ("h" + (h >>> 0).toString(16));
  }

  // Отрисовка панели результатов
  function renderPanel(html) {
    const box = $("#aiBriefPanel");
    if (!box) return;
    box.innerHTML = html;
  }

  // Красивый блок рекомендаций
  function renderResultUI(result) {
    const {
      completenessReport = [],
      improvements = [],
      creativeIdeas = [],
      contentFormats = [],
      warnings = []
    } = result || {};

    const block = (title, items) => {
      if (!items || !items.length) return "";
      const lis = items.map(x => `<li>${escapeHtml(x)}</li>`).join("");
      return `
        <section style="margin:8px 0">
          <h3 style="margin:0 0 6px 0">${escapeHtml(title)}</h3>
          <ul style="margin:0 0 0 16px;padding:0">${lis}</ul>
        </section>`;
    };

    const warnBlock = warnings?.length
      ? `<div class="muted" style="margin-top:8px;color:#b55">Предупреждения: ${warnings.map(escapeHtml).join("; ")}</div>`
      : "";

    return `
      <div>
        ${block("Полнота и ясность", completenessReport)}
        ${block("Конкретные улучшения", improvements)}
        ${block("Креативные идеи (по ЦА)", creativeIdeas)}
        ${block("Рекомендованные форматы", contentFormats)}
        ${warnBlock}
        <div style="margin-top:10px">
          <button id="aiApplyBtn" class="btn btn-secondary" type="button">Применить рекомендации</button>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Сбор данных брифа из формы
  function collectBriefFromForm() {
    const goal       = $("#briefGoal")?.value?.trim() || "";
    const budget     = Number($("#briefBudget")?.value || 0) || 0;
    const deadline   = $("#briefDeadline")?.value || "";
    const audience   = $("#briefAudience")?.value?.trim() || "";
    const product    = $("#briefProduct")?.value?.trim() || "";
    const kpi        = $("#briefKPI")?.value?.trim() || "";
    const tone       = $("#briefTone")?.value?.trim() || "";
    const platforms  = $("#briefPlatforms")?.value?.trim() || "";

    return { goal, budget, deadline, audience, product, kpi, tone, platforms };
  }

  // Подсветка ошибок заполнения минимума
  function validateMinimum(b) {
    if (!b.goal || !b.budget || !b.deadline) {
      throw new Error("Заполните минимум: цель, бюджет и дедлайн.");
    }
  }

  // Рендер «состояний»
  function renderLoading() {
    renderPanel(`<div class="muted">Анализируем бриф…</div>`);
  }
  function renderError(msg) {
    renderPanel(`<div class="muted" style="color:#b55">Ошибка: ${escapeHtml(msg)}</div>`);
  }

  // === Вызов сервера (Vercel Function /api/ai-brief) ===
  async function runServerless(brief) {
    const resp = await fetch("/api/ai-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief })
    });
    if (!resp.ok) {
      const text = await resp.text().catch(()=>"");
      throw new Error(`API ${resp.status}: ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  // === Локальный режим (прямо из браузера, для dev; нужен ключ в localStorage) ===
  async function runLocal(brief) {
    const key = localStorage.getItem(LS_KEY_API) || "";
    if (!key) throw new Error("Нет API-ключа. Для dev положите его в localStorage по ключу OPENAI_API_KEY, либо используйте серверный режим /api/ai-brief.");
    // Небольшая подсказка, что ключ хранится только локально в браузере
    console.warn("Using local OpenAI API key from localStorage — dev only.");

    const sys = [
      "Ты — ИИ-помощник по брифам. Проверь полноту/ясность, предложи улучшения, идеи под ЦА и форматы контента.",
      "Отвечай кратко пунктами, без «воды». Верни JSON с полями: completenessReport[], improvements[], creativeIdeas[], contentFormats[], warnings[]"
    ].join(" ");

    const user = "Brief data (JSON):\n" + JSON.stringify(brief, null, 2);

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization":"Bearer " + key
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role:"system", content: sys },
          { role:"user", content: user }
        ],
        temperature: 0.6
      })
    });

    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      throw new Error(`OpenAI ${r.status}: ${t || r.statusText}`);
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "";
    // Пытаемся вычленить JSON из ответа
    const m = content.match(/\{[\s\S]*\}$/);
    let parsed;
    try { parsed = JSON.parse(m ? m[0] : content); }
    catch { parsed = { improvements:[content || ""] }; }
    return parsed;
  }

  // === Главный раннер с кэшем и fallback ===
  async function runAnalysis(brief) {
    validateMinimum(brief);

    // Кэш
    const key = hashOf(JSON.stringify(brief));
    const cached = Cache.get(key);
    if (cached) return { ...cached, _cached:true };

    // Сначала пробуем серверный режим, если упадёт — пробуем локальный
    try {
      const data = await runServerless(brief);
      Cache.set(key, data);
      return data;
    } catch (e) {
      console.warn("Serverless API failed, trying local…", e);
      const data = await runLocal(brief);
      Cache.set(key, data);
      return data;
    }
  }

  // === Публичный API модуля (вешаем на window) ===
  window.AIBrief = {
    async runFromUI() {
      try {
        const brief = collectBriefFromForm();
        renderLoading();
        const result = await runAnalysis(brief);
        renderPanel(renderResultUI(result));

        // Активируем кнопку «Применить рекомендации» после получения ответа
        const applyBtn = $("#aiApplyBtn");
        if (applyBtn) {
          applyBtn.disabled = false;
          applyBtn.addEventListener("click", () => {
            // Простой «апплай»: добавим идеи к цели, если пусто — подсказка
            const goalEl = $("#briefGoal");
            if (goalEl && result?.improvements?.length) {
              const addendum = "\n\nAI рекомендации:\n• " + result.improvements.join("\n• ");
              goalEl.value = (goalEl.value || "") + addendum;
              const saved = $("#briefSaved");
              if (saved) { saved.textContent = "Рекомендации добавлены в поле «Цель»."; setTimeout(()=> saved.textContent="", 1500); }
            }
          }, { once:true });
        }
      } catch (err) {
        renderError(err?.message || String(err));
      }
    }
  };

  // На всякий случай — доступ из консоли
  console.log("[ai-brief] ready");

})();
