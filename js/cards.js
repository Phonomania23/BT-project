// cards.js — отрисовка карточек блогеров и мини-CRM (папки/заметки).
// Экспортирует window.renderCards(listEl, bloggers, pickedSet).

(function () {
  // ====== LS helpers ======
  const LS_FOLDERS = "favFoldersV1";   // { folders: [name], map: { [bloggerId]: "folderName" } }
  const LS_NOTES   = "bloggerNotesV1"; // { [bloggerId]: "text" }

  function readJSON(key, defVal) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(defVal)); } catch { return defVal; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function readFolders() {
    const def = { folders: ["Готовы к коллабу", "Отказники"], map: {} };
    const data = readJSON(LS_FOLDERS, def);
    // Защита от поломанных структур
    if (!Array.isArray(data.folders)) data.folders = def.folders.slice();
    if (!data.map || typeof data.map !== "object") data.map = {};
    return data;
  }
  function writeFolders(x) { writeJSON(LS_FOLDERS, x); }

  function readNotes() { return readJSON(LS_NOTES, {}); }
  function writeNotes(m) { writeJSON(LS_NOTES, m); }

  // ====== Formatters ======
  const RUBLE_TO_USD = 0.012; // грубая конверсия для прототипа

  const nfRU = new Intl.NumberFormat("ru-RU");
  function fmtInt(n) { return nfRU.format(Math.round(Number(n || 0))); }
  function fmtPct(n) { return (Number(n || 0)).toFixed(1).replace(".0", "") + "%"; }

  function getER(b) {
    return typeof b.er === "number" ? b.er : (typeof b.avg_er === "number" ? b.avg_er : 0);
  }
  function getViews(b) { return Number(b.avg_views || 0); }
  function getFollowers(b) { return Number(b.subscribers || 0); }

  function getPriceUSD(b) {
    const p = b?.pricing?.integrated;
    if (p == null) return NaN;
    const cur = (b.pricing.currency || b.currency || "USD").toUpperCase();
    return cur === "RUB" ? Math.round(Number(p) * RUBLE_TO_USD) : Number(p);
  }
  function getPriceLabel(b) {
    // Покажем «$123 / 9 999₽», если валюта — RUB
    const p = b?.pricing?.integrated;
    if (p == null) return "—";
    const cur = (b.pricing.currency || b.currency || "USD").toUpperCase();
    if (cur === "RUB") {
      return `$${fmtInt(p * RUBLE_TO_USD)} / ${fmtInt(p)}₽`;
    }
    return `$${fmtInt(p)}`;
  }

  // ====== Тemplating ======
  function cardHTML(b, pickedSet, currentFolder) {
    const id = String(b.id);
    const checked = pickedSet.has(id) ? "checked" : "";
    const avatar = b.avatar || "images/avatars/placeholder.png";
    const er = getER(b);
    const views = getViews(b);
    const followers = getFollowers(b);
    const priceLbl = getPriceLabel(b);

    const platform = b.platform || "—";
    const cat = b.category || b.niche || (Array.isArray(b.rubrics) ? b.rubrics[0] : "") || "—";

    const ai = (b.ai_recommended || b.ai_match) ? `<span class="badge">AI</span>` : "";
    const folderBadge = currentFolder ? `<span class="badge" title="Папка">${escapeHtml(currentFolder)}</span>` : "";

    return `
      <li class="card-blogger" data-id="${id}">
        <img class="avatar" src="${avatar}" alt="">
        <div>
          <div class="name"><strong>${escapeHtml(b.name || "—")}</strong></div>
          <div class="meta">
            <span class="badge">${escapeHtml(platform)}</span>
            <span class="badge">${escapeHtml(cat)}</span>
            ${ai} ${folderBadge}
          </div>
          <div class="meta">
            Подписчики: ${fmtInt(followers)} · Views/post: ${fmtInt(views)} · ER: ${fmtPct(er)}
          </div>
          <div class="meta">Цена (integrated): ${priceLbl}</div>

          <div class="actions">
            <label class="select-radio" title="Добавить в выборку">
              <input class="pick" type="checkbox" data-id="${id}" ${checked}/> В выборку
            </label>

            <div class="row" style="gap:6px">
              <select class="folder-select" data-id="${id}" title="Папки"></select>
              <button class="btn btn-secondary new-folder" data-id="${id}" type="button" title="Создать папку">+ Папка</button>
              <button class="btn btn-secondary add-to-folder" data-id="${id}" type="button">Добавить</button>
            </div>

            <button class="btn btn-secondary btn-note" data-id="${id}" type="button">Заметка</button>
            ${b.email ? `<a class="btn btn-secondary" href="mailto:${b.email}">E-mail</a>` : ""}
            ${b.youtube ? `<a class="btn btn-secondary" href="${b.youtube}" target="_blank" rel="noopener">Канал</a>` : ""}
          </div>

          <div class="note" id="note-${id}" hidden>
            <textarea class="note-text" data-id="${id}" rows="2" placeholder="Ваша заметка..."></textarea>
            <div class="row" style="margin-top:6px">
              <button class="btn btn-secondary note-cancel" data-id="${id}" type="button">Скрыть</button>
              <button class="btn note-save" data-id="${id}" type="button">Сохранить</button>
            </div>
          </div>
        </div>
      </li>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // ====== Заполнение селекта папок для карточек ======
  function fillFolderSelects(listEl) {
    const data = readFolders();
    const options = [`<option value="">— в папку —</option>`]
      .concat(data.folders.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`))
      .join("");

    listEl.querySelectorAll(".folder-select").forEach(sel => {
      const id = sel.dataset.id;
      sel.innerHTML = options;
      const current = data.map[id];
      if (current) {
        const opt = [...sel.options].find(o => o.value === current);
        if (opt) sel.value = current;
      }
    });
  }

  // ====== Bind once (делегирование) ======
  function bindOnce(listEl) {
    if (listEl._cardsBound) return;
    listEl._cardsBound = true;

    // Делегирование: заметки
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-note");
      if (!btn) return;
      const id = btn.dataset.id;
      const box = listEl.querySelector(`#note-${CSS.escape(id)}`);
      if (!box) return;
      const notes = readNotes();
      const ta = box.querySelector(".note-text");
      ta.value = notes[id] || "";
      box.hidden = !box.hidden;
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".note-save");
      if (!btn) return;
      const id = btn.dataset.id;
      const ta = listEl.querySelector(`#note-${CSS.escape(id)} .note-text`);
      const map = readNotes();
      map[id] = ta.value.trim();
      writeNotes(map);
      // лёгкий фидбек
      btn.textContent = "Сохранено";
      setTimeout(() => (btn.textContent = "Сохранить"), 900);
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".note-cancel");
      if (!btn) return;
      const id = btn.dataset.id;
      const box = listEl.querySelector(`#note-${CSS.escape(id)}`);
      if (box) box.hidden = true;
    });

    // Папки
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".new-folder");
      if (!btn) return;
      const name = prompt("Название папки:");
      if (!name) return;
      const data = readFolders();
      if (!data.folders.includes(name)) data.folders.push(name);
      writeFolders(data);
      fillFolderSelects(listEl);
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-folder");
      if (!btn) return;
      const id = btn.dataset.id;
      const sel = listEl.querySelector(`.folder-select[data-id="${CSS.escape(id)}"]`);
      const name = sel && sel.value;
      if (!name) return alert("Выберите папку из списка.");
      const data = readFolders();
      data.map[id] = name;
      writeFolders(data);
      // Перерисуем бейдж на карточке
      const card = btn.closest(".card-blogger");
      if (card) {
        let meta = card.querySelector(".meta");
        // второй .meta в карточке — про ER/Views, нам нужен первый с бейджами
        const metas = card.querySelectorAll(".meta");
        if (metas.length) meta = metas[0];
        // удалить старый бейдж папки
        meta.querySelectorAll(".badge").forEach(b => {
          if (b.textContent === name) b.remove();
        });
        // добавить новый (и не дублировать ai/platform/category)
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.title = "Папка";
        badge.textContent = name;
        meta.appendChild(badge);
      }
      btn.textContent = "Добавлено";
      setTimeout(() => (btn.textContent = "Добавить"), 900);
    });
  }

  // ====== Публичное API ======
  function renderCards(listEl, bloggers, pickedSet) {
    if (!listEl) return;

    const folders = readFolders();
    listEl.innerHTML = bloggers.map(b => cardHTML(b, pickedSet, folders.map[String(b.id)])).join("") ||
      `<li class="muted">Ничего не найдено. Уточните фильтры.</li>`;

    // Заполнить селекты папок
    fillFolderSelects(listEl);

    // Подключить делегирование событий один раз
    bindOnce(listEl);
  }

  // Экспорт
  window.renderCards = renderCards;
})();
