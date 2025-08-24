// /js/components/blogger-card.js
// Web Component <blogger-card> — детальная карточка блогера (light DOM)
// Совместим с текущими /js/filters.js и /js/cards.js (классы/события совпадают)

(function () {
  // === LS helpers ===
  const LS_TAGS   = "bloggerTagsV1";   // { [id]: string[] }
  const LS_NOTES  = "bloggerNotesV1";  // { [id]: string }
  const LS_FUNNEL = "dealFunnelV2";    // { brief:{goal,budget,...}, ... }

  function readJSON(k, d) { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  // === utils/format ===
  const nfRU = new Intl.NumberFormat("ru-RU");
  function nf(n)  { return nfRU.format(Math.round(+n || 0)); }
  function pct(n) { const x = +n || 0; return (Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + "%"; }
  function esc(s) { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

  function getSubs(b){ return Number(b.subscribers ?? b.followers ?? b.follower_count ?? 0); }
  function getER(b){ const v = b.avg_er ?? b.er ?? b.engagement_rate; return Number.isFinite(v) ? Number(v) : 0; }
  function getViews(b){ return Number(b.avg_views ?? b.views ?? b.avg_views_per_post ?? 0); }
  function getCat(b){ return b.category ?? b.niche ?? (Array.isArray(b.rubrics) ? b.rubrics.join(", ") : "—"); }

  const RUBLE_TO_USD = 0.012;
  function priceUSD(b){
    const p = b?.pricing?.integrated ?? b?.price;
    if (p == null) return NaN;
    const cur = (b?.pricing?.currency || b?.currency || "USD").toUpperCase();
    return cur === "RUB" ? Math.round(+p * RUBLE_TO_USD) : +p;
  }
  function priceLabel(b){
    const p = b?.pricing?.integrated ?? b?.price;
    if (p == null) return "—";
    const cur = (b?.pricing?.currency || b?.currency || "USD").toUpperCase();
    return cur === "RUB" ? `$${nf(+p * RUBLE_TO_USD)} / ${nf(p)}₽` : `$${nf(p)}`;
  }

  // === relevance by brief keywords (простая эвристика) ===
  function computeRelevance(blr){
    const funnel = readJSON(LS_FUNNEL, {});
    const brief  = (funnel?.brief?.goal || "").toLowerCase();
    if (!brief) return 0;

    const pool = [
      (blr.name || ""),
      (getCat(blr) || ""),
      (blr.platform || ""),
      ...(Array.isArray(blr.tags) ? blr.tags : []),
    ].join(" ").toLowerCase();

    const words = [...new Set(brief.replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(w => w.length > 3))];
    let hits = 0;
    for (const w of words) if (pool.includes(w)) hits++;

    // небольшой бонус за «вписываемость» цены в бюджет
    const budget = Number(funnel?.brief?.budget || 0);
    let bonus = 0;
    const usd = priceUSD(blr);
    if (budget > 0 && Number.isFinite(usd)) {
      // упрощённо: таргетим ~15% бюджета (условно), ближе — больше бонус
      const target = budget * 0.15 / 100; // очень грубо ₽→$
      const ratio  = target > 0 && usd > 0 ? 1 - Math.min(1, Math.abs(usd - target) / target) : 0;
      bonus = Math.round(ratio * 20);
    }

    return Math.max(0, Math.min(100, Math.round((hits / Math.max(3, words.length)) * 80) + bonus));
  }

  // === sparkline (inline SVG) ===
  function spark(values = [], width = 180, height = 44, pad = 6) {
    const arr = values.length ? values : [10,12,11,13,14,16,15,17,22,21];
    const min = Math.min(...arr), max = Math.max(...arr);
    const xStep = (width - pad * 2) / Math.max(1, arr.length - 1);
    const toX = i => pad + i * xStep;
    const toY = v => {
      if (max === min) return height / 2;
      const t = (v - min) / (max - min);
      return height - pad - t * (height - pad * 2);
    };
    const d = arr.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");
    return `<svg viewBox="0 0 ${width} ${height}" class="sl"><path d="${d}" /></svg>`;
  }

  // === AI автотеги (эвристика) ===
  function aiSuggestTags(b){
    const out = new Set();
    const cat = (getCat(b) || "").toLowerCase(); if (cat) out.add(cat);
    const p   = (b.platform || "").toLowerCase(); if (p) out.add(p);
    if ((b.language || "").toLowerCase() === "ru") out.add("ru");
    if ((b.language || "").toLowerCase() === "en") out.add("en");
    const er  = getER(b); if (er >= 6) out.add("high-er");
    const f   = getSubs(b);
    if (f >= 500_000) out.add("500k+"); else if (f >= 100_000) out.add("100k+"); else if (f >= 10_000) out.add("10k+");
    return [...out];
  }

  // === компонент ===
  class BloggerCard extends HTMLElement {
    static get observedAttributes() { return ["selectable"]; }
    constructor() {
      super();
      this.blogger = null; // данные
      this._connected = false;
    }

    set data(obj) { this.blogger = obj; this.render(); }
    get data()    { return this.blogger; }

    attributeChangedCallback() { if (this._connected) this.render(); }
    connectedCallback() { this._connected = true; this.render(); }

    // LS maps (теги/заметки)
    get tagsMap(){ return readJSON(LS_TAGS, {}); }
    set tagsMap(m){ writeJSON(LS_TAGS, m); }

    get notesMap(){ return readJSON(LS_NOTES, {}); }
    set notesMap(m){ writeJSON(LS_NOTES, m); }

    render() {
      const b = this.blogger;
      if (!b) { this.innerHTML = ""; return; }

      const id   = String(b.id ?? b._id ?? b.name ?? Math.random().toString(36).slice(2));
      const subs = getSubs(b);
      const er   = getER(b);
      const views= getViews(b);
      const cat  = getCat(b);
      const rel  = computeRelevance(b);
      const avatar = b.avatar || b.photo || "/images/avatars/placeholder.png";
      const price  = priceLabel(b);

      // истории для графиков (если нет — синтезируем)
      const growth = b.stats?.growth       ?? this.synthetic(subs, 12, 0.04, true);
      const erHist = b.stats?.erHistory    ?? this.synthetic(er,   12, 0.08, true);
      const vHist  = b.stats?.viewsHistory ?? this.synthetic(views,12, 0.12, true);

      // был ли уже выбран (Set может быть у контейнера)
      const host = this.closest("#resultsList");
      const prePicked = !!(host && host._pickedSet && host._pickedSet.has(id));

      // Разметка в терминах существующей вёрстки и cards.js
      this.classList.add("card-blogger");
      this.setAttribute("data-id", id);
      this.innerHTML = `
        <img class="avatar" src="${esc(avatar)}" alt="">
        <div>
          <div class="name"><strong>${esc(b.name || "—")}</strong></div>
          <div class="meta">
            <span class="badge">${esc(b.platform || "—")}</span>
            ${cat ? `<span class="badge">${esc(cat)}</span>` : ""}
            ${(b.ai_recommended || b.ai_match) ? `<span class="badge">AI</span>` : ""}
          </div>
          <div class="meta">
            Подписчики: ${nf(subs)} · Views/post: ${nf(views)} · ER: ${pct(er)}
          </div>
          <div class="meta">Цена (integrated): ${esc(price)}</div>

          <!-- Мини-статистика (графики) -->
          <div class="meta" style="margin-top:8px">
            <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center">
              <div title="Динамика подписчиков">${spark(growth)}</div>
              <div title="Динамика ER">${spark(erHist)}</div>
              <div title="Динамика просмотров">${spark(vHist)}</div>
              <div class="badge" title="ИИ-оценка релевантности">Rel: ${rel}</div>
            </div>
          </div>

          <!-- Блок действий — ПУСТОЙ. Его заполнит cards.js через enhanceBloggerCard(...) -->
          <div class="actions blogger-actions"></div>

          <!-- Теги (ручные + авто) -->
          <div class="meta" style="margin-top:10px">
            <div class="tags-list"></div>
            <div class="row" style="gap:6px; margin-top:6px">
              <input class="tag-input" type="text" placeholder="добавить тег и Enter" style="max-width:220px">
              <button class="btn btn-secondary ai-tags" type="button">Авто</button>
              <button class="btn btn-secondary kit" type="button">Медиакит</button>
              <button class="btn btn-secondary msg" type="button">Сообщение</button>
            </div>
          </div>

          <!-- Нотес-блок (структура под cards.js) -->
          <div class="note" id="note-${cssId(id)}" hidden>
            <textarea class="note-text" data-id="${esc(id)}" rows="2" placeholder="Ваша заметка..."></textarea>
            <div class="row" style="margin-top:6px">
              <button class="btn btn-secondary note-cancel" data-id="${esc(id)}" type="button">Скрыть</button>
              <button class="btn note-save" data-id="${esc(id)}" type="button">Сохранить</button>
            </div>
          </div>
        </div>
      `;

      // Если карточка "выбираемая" — добавим чекбокс как ожидает cards.js/filters.js
      if (this.hasAttribute("selectable")) {
        const actions = this.querySelector(".blogger-actions");
        if (actions && !actions.querySelector(".select-radio")) {
          const wrap = document.createElement("label");
          wrap.className = "select-radio";
          wrap.title = "Добавить в выборку";
          wrap.innerHTML = `<input class="pick" type="checkbox" data-id="${esc(id)}" ${prePicked ? "checked" : ""}/> В выборку`;
          actions.prepend(wrap);

          // событие для filters.js (оно слушает pick:change)
          const cb = wrap.querySelector(".pick");
          cb.addEventListener("change", () => {
            this.dispatchEvent(new CustomEvent("pick:change", {
              bubbles: true,
              detail: { id, picked: cb.checked }
            }));
          });
        }
      }

      // Договоримся с cards.js: пусть он «докрутит» actions (папки/заметки/избранное)
      if (typeof window.enhanceBloggerCard === "function") {
        window.enhanceBloggerCard(this, b);
      }

      // Теги
      this.renderTags();

      // Заметки: подставим сохранённый текст (cards.js сам обработает сохранение по кнопке)
      const notes = this.notesMap;
      const ta = this.querySelector(".note-text");
      if (ta) ta.value = notes[id] || "";

      // Локальные обработчики, не конфликтующие с cards.js
      this.bindLocalExtras(b);
    }

    // синтетические истории для графиков
    synthetic(seed = 100, n = 12, vol = 0.1, allowZero = false) {
      const out = [];
      let x = Math.max(allowZero ? 0 : 1, +seed || 100);
      for (let i = n - 1; i >= 0; i--) {
        const d = (Math.random() - 0.3) * vol * (x || 1);
        x = Math.max(allowZero ? 0 : 1, x + d);
        out.unshift(Math.round(x));
      }
      return out;
    }

    renderTags() {
      const b = this.blogger; if (!b) return;
      const id = String(b.id);
      const map = this.tagsMap;
      const list = Array.isArray(map[id]) ? map[id] : [];
      const box = this.querySelector(".tags-list");
      if (!box) return;

      box.innerHTML = list.length
        ? list.map(t => `<span class="tag">${esc(t)} <button type="button" class="x" data-tag="${esc(t)}">×</button></span>`).join("")
        : `<span class="muted">Тегов пока нет</span>`;

      box.querySelectorAll(".x").forEach(btn => {
        btn.addEventListener("click", () => {
          const m = this.tagsMap;
          m[id] = (m[id] || []).filter(x => x !== btn.dataset.tag);
          this.tagsMap = m;
          this.renderTags();
        });
      });
    }

    bindLocalExtras(b) {
      const id = String(b.id);

      // Ввод тега по Enter
      const tagInput = this.querySelector(".tag-input");
      if (tagInput) {
        tagInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = tagInput.value.trim().toLowerCase();
            if (!v) return;
            const m = this.tagsMap;
            const arr = Array.isArray(m[id]) ? m[id] : [];
            if (!arr.includes(v)) arr.push(v);
            m[id] = arr; this.tagsMap = m;
            tagInput.value = "";
            this.renderTags();
          }
        });
      }

      // Автотеги
      this.querySelector(".ai-tags")?.addEventListener("click", () => {
        const m = this.tagsMap;
        const cur = new Set(Array.isArray(m[id]) ? m[id] : []);
        for (const t of aiSuggestTags(b)) cur.add(t);
        m[id] = [...cur];
        this.tagsMap = m;
        this.renderTags();
      });

      // Медиакит (печать в PDF)
      this.querySelector(".kit")?.addEventListener("click", () => this.downloadMediaKit());

      // Сообщение (просто событие наверх — чтобы роутер/чат открылся, если есть)
      this.querySelector(".msg")?.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("openMessage", { detail: { blogger: b } }));
      });

      // Заметка — локальное сохранение (на случай, если cards.js отсутствует)
      this.querySelector(".note-save")?.addEventListener("click", () => {
        const ta = this.querySelector(".note-text");
        const m = this.notesMap; m[id] = (ta?.value || "").trim(); this.notesMap = m;
        const btn = this.querySelector(".note-save"); if (btn) { btn.textContent = "Сохранено"; setTimeout(() => btn.textContent = "Сохранить", 900); }
      });
      this.querySelector(".note-cancel")?.addEventListener("click", () => {
        const box = this.querySelector(`#note-${cssId(id)}`); if (box) box.hidden = true;
      });
    }

    downloadMediaKit() {
      const b = this.blogger;
      const html = `
      <html><head>
        <meta charset="utf-8"/>
        <title>Media Kit — ${esc(b.name || "")}</title>
        <style>
          body{font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:0;padding:24px;background:#fff}
          h1{margin:0 0 6px}
          .muted{color:#666}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
          .card{border:1px solid #ddd;border-radius:12px;padding:16px;background:#fff}
          .row{display:flex;gap:8px;align-items:center;justify-content:space-between}
          .badge{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #ccc;background:#f7f7f7}
          img{border-radius:12px;max-width:120px}
          .footer{margin-top:16px;color:#666;font-size:12px}
        </style>
      </head><body>
        <div class="row">
          <div>
            <h1>${esc(b.name || "—")}</h1>
            <div class="muted">${esc(getCat(b) || "")}</div>
          </div>
          <span class="badge">${esc(b.platform || "—")}</span>
        </div>

        <div class="grid" style="margin-top:12px">
          <div class="card">
            <h3>Статистика</h3>
            <p>Подписчики: <strong>${nf(getSubs(b))}</strong></p>
            <p>ER: <strong>${pct(getER(b))}</strong></p>
            <p>Просмотры/пост: <strong>${nf(getViews(b))}</strong></p>
            <p>Прайс (integrated): <strong>${esc(priceLabel(b))}</strong></p>
          </div>
          <div class="card">
            <h3>Контакты</h3>
            <p>E-mail: <strong>${esc(b.email || "—")}</strong></p>
            <p>Ссылки: ${b.youtube ? `<a href="${esc(b.youtube)}">${esc(b.youtube)}</a>` : "—"}</p>
          </div>
        </div>

        <div class="footer">Сгенерировано в Bloggers.tools — сохраните как PDF через диалог печати браузера.</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
      </body></html>`;
      const w = window.open("", "_blank"); w.document.write(html); w.document.close();
    }
  }

  function cssId(s){ return String(s).replace(/[^a-z0-9_\-:.]/gi, "_"); }

  // регистрация
  customElements.define("blogger-card", BloggerCard);
})();
