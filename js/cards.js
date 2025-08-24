// /js/cards.js — карточки блогеров + мини-CRM (папки/заметки/избранное)
// Экспортирует:
//   - window.renderCards(listEl, bloggers, pickedSet)
//   - window.enhanceBloggerCard(cardEl, blogger)
//
// Совместимо с /js/filters.js: если filters.js сам рендерит карточки,
// он может не использовать этот рендер, но enhanceBloggerCard доступен.

(function () {
  // ================== LS helpers ==================
  const LS_FOLDERS = "favFoldersV1";   // { folders: [name], map: { [bloggerId]: "folderName" } }
  const LS_NOTES   = "bloggerNotesV1"; // { [bloggerId]: "text" }
  const LS_FAVS    = "bloggerFavsV1";  // string[] ids

  function readJSON(key, defVal) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(defVal)); } catch { return defVal; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function readFolders() {
    const def = { folders: ["Готовы к коллабе", "Отказники"], map: {} };
    const data = readJSON(LS_FOLDERS, def);
    if (!Array.isArray(data.folders)) data.folders = def.folders.slice();
    if (!data.map || typeof data.map !== "object") data.map = {};
    return data;
  }
  function writeFolders(x) { writeJSON(LS_FOLDERS, x); }

  function readNotes()  { return readJSON(LS_NOTES, {}); }
  function writeNotes(m){ writeJSON(LS_NOTES, m); }

  function readFavs()   { return new Set(readJSON(LS_FAVS, [])); }
  function writeFavs(s) { writeJSON(LS_FAVS, [...s]); }

  // ================== Formatters / Normalizers ==================
  const FX = { USD: 1, RUB: 0.011, EUR: 1.07 };

  const nfRU = new Intl.NumberFormat("ru-RU");
  function fmtInt(n) { return nfRU.format(Math.round(Number(n || 0))); }
  function fmtPct(n) {
    const x = Number(n || 0);
    return (Number.isFinite(x) ? x.toFixed(1).replace(/\.0$/, "") : "0") + "%";
  }
  function fmtViews(n) {
    const x = Number(n || 0);
    if (x >= 1_000_000) return (x / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (x >= 1_000)     return (x / 1_000).toFixed(0) + "k";
    return fmtInt(x);
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function getFollowers(b) {
    return Number(b.subscribers ?? b.followers ?? b.follower_count ?? 0);
  }
  function getER(b) {
    const v = b.er ?? b.avg_er ?? b.engagement_rate;
    return Number.isFinite(v) ? Number(v) : 0;
  }
  function getViews(b) {
    return Number(b.avg_views ?? b.views ?? b.avg_views_per_post ?? 0);
  }
  function getCategory(b) {
    return b.category ?? b.niche ?? (Array.isArray(b.rubrics) ? b.rubrics.join(", ") : "—");
  }
  function getPriceUSD(b) {
    if (typeof b.priceUSD === "number") return b.priceUSD;
    if (b.pricing && typeof b.pricing.integrated === "number") {
      const cur = (b.pricing.currency || b.currency || "USD").toUpperCase();
      const fx = FX[cur] ?? 1;
      return Math.round(Number(b.pricing.integrated) * fx);
    }
    if (typeof b.integrated_usd === "number") return Number(b.integrated_usd);
    if (typeof b.price === "number") return Number(b.price);
    return NaN;
  }
  function getPriceLabel(b) {
    const usd = getPriceUSD(b);
    if (!Number.isFinite(usd)) return "—";
    return `$${fmtInt(usd)}`;
  }

  // ================== Шаблон для «старого» рендера ==================
  function cardHTML(b, pickedSet, currentFolder, isFav) {
    const id        = String(b.id ?? b._id ?? b.name ?? Math.random().toString(36).slice(2));
    const checked   = pickedSet?.has(id) ? "checked" : "";
    const avatar    = b.avatar || b.photo || "/images/avatars/placeholder.png";
    const platform  = b.platform || "—";
    const cat       = getCategory(b);
    const followers = getFollowers(b);
    const er        = getER(b);
    const views     = getViews(b);
    const priceLbl  = getPriceLabel(b);

    const aiBadge   = (b.ai_recommended || b.ai_match || (Array.isArray(b.ai_similar_to) && b.ai_similar_to.length))
      ? `<span class="badge" title="AI рекомендации">AI</span>` : "";

    const folderBadge = currentFolder ? `<span class="badge" title="Папка">${esc(currentFolder)}</span>` : "";
    const favCls = isFav ? "favorited" : "";

    return `
      <li class="card-blogger" data-id="${esc(id)}">
        <img class="avatar" src="${esc(avatar)}" alt="">
        <div>
          <div class="name"><strong>${esc(b.name || "—")}</strong></div>
          <div class="meta">
            <span class="badge">${esc(platform)}</span>
            <span class="badge">${esc(cat)}</span>
            ${aiBadge} ${folderBadge}
          </div>
          <div class="meta">
            Подписчики: ${fmtInt(followers)} · Views/post: ${fmtViews(views)} · ER: ${fmtPct(er)}
          </div>
          <div class="meta">Цена (integrated): ${priceLbl}</div>

          <div class="actions blogger-actions">
            <label class="select-radio" title="Добавить в выборку">
              <input class="pick" type="checkbox" data-id="${esc(id)}" ${checked}/> В выборку
            </label>

            <div class="row" style="gap:6px">
              <select class="folder-select" data-id="${esc(id)}" title="Папки"></select>
              <button class="btn btn-secondary new-folder" data-id="${esc(id)}" type="button" title="Создать папку">+ Папка</button>
              <button class="btn btn-secondary add-to-folder" data-id="${esc(id)}" type="button">Добавить</button>
            </div>

            <button class="btn btn-secondary btn-note" data-id="${esc(id)}" type="button">Заметка</button>
            <button class="btn btn-ghost btn-sm btn-fav ${favCls}" data-id="${esc(id)}" type="button" title="Избранное">★</button>
            ${b.email   ? `<a class="btn btn-secondary" href="mailto:${esc(b.email)}">E-mail</a>` : ""}
            ${b.youtube ? `<a class="btn btn-secondary" href="${esc(b.youtube)}" target="_blank" rel="noopener">Канал</a>` : ""}
          </div>

          <div class="note" id="note-${esc(id)}" hidden>
            <textarea class="note-text" data-id="${esc(id)}" rows="2" placeholder="Ваша заметка..."></textarea>
            <div class="row" style="margin-top:6px">
              <button class="btn btn-secondary note-cancel" data-id="${esc(id)}" type="button">Скрыть</button>
              <button class="btn note-save" data-id="${esc(id)}" type="button">Сохранить</button>
            </div>
          </div>
        </div>
      </li>
    `;
  }

  // ================== Наполнение селектов папок ==================
  function fillFolderSelects(root) {
    const data = readFolders();
    const options = [`<option value="">— в папку —</option>`]
      .concat(data.folders.map(name => `<option value="${esc(name)}">${esc(name)}</option>`))
      .join("");

    (root || document).querySelectorAll(".folder-select").forEach(sel => {
      const id = sel.dataset.id;
      sel.innerHTML = options;
      const current = data.map[id];
      if (current) sel.value = current;
    });
  }

  // ================== Делегирование событий ==================
  function bindOnce(listEl, pickedSet) {
    if (listEl._cardsBound) return;
    listEl._cardsBound = true;

    const favs = readFavs();

    // Выборка
    listEl.addEventListener("change", (e) => {
      const cb = e.target.closest(".pick");
      if (!cb) return;
      const id = String(cb.dataset.id);
      if (cb.checked) pickedSet.add(id); else pickedSet.delete(id);
      try {
        localStorage.setItem("selectedBloggers", JSON.stringify([...pickedSet]));
      } catch {}
      const cnt = document.querySelector("#pickedCount");
      if (cnt) cnt.textContent = pickedSet.size;
    });

    // Заметки
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-note");
      if (!btn) return;
      const id = String(btn.dataset.id);
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
      const id = String(btn.dataset.id);
      const ta = listEl.querySelector(`#note-${CSS.escape(id)} .note-text`);
      const map = readNotes();
      map[id] = (ta?.value || "").trim();
      writeNotes(map);
      btn.textContent = "Сохранено";
      setTimeout(() => (btn.textContent = "Сохранить"), 900);
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".note-cancel");
      if (!btn) return;
      const id = String(btn.dataset.id);
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
      const id = String(btn.dataset.id);
      const sel = listEl.querySelector(`.folder-select[data-id="${CSS.escape(id)}"]`);
      const name = sel && sel.value;
      if (!name) return alert("Выберите папку из списка.");
      const data = readFolders();
      data.map[id] = name;
      writeFolders(data);

      // Обновим бейдж папки
      const card = btn.closest(".card-blogger");
      if (card) {
        const meta = card.querySelectorAll(".meta")[0];
        if (meta) {
          meta.querySelectorAll(".badge").forEach(b => {
            if (b.title === "Папка" || b.textContent === name) b.remove();
          });
          const badge = document.createElement("span");
          badge.className = "badge";
          badge.title = "Папка";
          badge.textContent = name;
          meta.appendChild(badge);
        }
      }
      btn.textContent = "Добавлено";
      setTimeout(() => (btn.textContent = "Добавить"), 900);
    });

    // Избранное
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-fav");
      if (!btn) return;
      const id = String(btn.dataset.id);
      if (favs.has(id)) {
        favs.delete(id);
        btn.classList.remove("favorited");
      } else {
        favs.add(id);
        btn.classList.add("favorited");
      }
      writeFavs(favs);
    });
  }

  // ================== Public API ==================
  function renderCards(listEl, bloggers, pickedSet = new Set()) {
    if (!listEl) return;

    const folders = readFolders();
    const favs    = readFavs();

    listEl.innerHTML =
      bloggers.map(b => cardHTML(b, pickedSet, folders.map[String(b.id)], favs.has(String(b.id)))).join("") ||
      `<li class="muted">Ничего не найдено. Уточните фильтры.</li>`;

    fillFolderSelects(listEl);
    bindOnce(listEl, pickedSet);
  }

  // Функция-улучшатель карточки (когда её рисует не renderCards, а внешний код)
  function enhanceBloggerCard(cardEl, blogger) {
    if (!cardEl) return;

    let actions = cardEl.querySelector(".blogger-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "blogger-actions actions";
      cardEl.appendChild(actions);
    }
    if (actions._enhanced) return;
    actions._enhanced = true;

    const id = String(blogger.id ?? blogger._id ?? blogger.name ?? Math.random().toString(36).slice(2));
    const favs = readFavs();
    const favCls = favs.has(id) ? "favorited" : "";

    const block = document.createElement("div");
    block.className = "row";
    block.style.gap = "6px";
    block.innerHTML = `
      <select class="folder-select" data-id="${esc(id)}" title="Папки"></select>
      <button class="btn btn-secondary new-folder" data-id="${esc(id)}" type="button" title="Создать папку">+ Папка</button>
      <button class="btn btn-secondary add-to-folder" data-id="${esc(id)}" type="button">Добавить</button>
      <button class="btn btn-secondary btn-note" data-id="${esc(id)}" type="button">Заметка</button>
      <button class="btn btn-ghost btn-sm btn-fav ${favCls}" data-id="${esc(id)}" type="button" title="Избранное">★</button>
    `;
    actions.appendChild(block);

    // вставим скрытое поле заметки (если его нет)
    if (!cardEl.querySelector(`#note-${CSS.escape(id)}`)) {
      const noteBox = document.createElement("div");
      noteBox.className = "note";
      noteBox.id = `note-${id}`;
      noteBox.hidden = true;
      noteBox.innerHTML = `
        <textarea class="note-text" data-id="${esc(id)}" rows="2" placeholder="Ваша заметка..."></textarea>
        <div class="row" style="margin-top:6px">
          <button class="btn btn-secondary note-cancel" data-id="${esc(id)}" type="button">Скрыть</button>
          <button class="btn note-save" data-id="${esc(id)}" type="button">Сохранить</button>
        </div>
      `;
      cardEl.appendChild(noteBox);
    }

    // Наполним селект папок
    fillFolderSelects(cardEl.closest("ul") || document);

    // Если карточка вне общего списка — повесим локальные обработчики
    if (!cardEl.closest("ul,ol,#resultsList")) {
      block.querySelector(".new-folder")?.addEventListener("click", () => {
        const name = prompt("Название папки:");
        if (!name) return;
        const data = readFolders();
        if (!data.folders.includes(name)) data.folders.push(name);
        writeFolders(data);
        fillFolderSelects(cardEl);
      });
      block.querySelector(".add-to-folder")?.addEventListener("click", () => {
        const sel = block.querySelector(`.folder-select[data-id="${CSS.escape(id)}"]`);
        const name = sel && sel.value;
        if (!name) return alert("Выберите папку из списка.");
        const data = readFolders();
        data.map[id] = name;
        writeFolders(data);
      });
      block.querySelector(".btn-note")?.addEventListener("click", () => {
        const box = cardEl.querySelector(`#note-${CSS.escape(id)}`);
        const notes = readNotes();
        const ta = box.querySelector(".note-text");
        ta.value = notes[id] || "";
        box.hidden = !box.hidden;
      });
      block.querySelector(".btn-fav")?.addEventListener("click", (e) => {
        if (favs.has(id)) { favs.delete(id); e.currentTarget.classList.remove("favorited"); }
        else { favs.add(id); e.currentTarget.classList.add("favorited"); }
        writeFavs(favs);
      });
    }
  }

  // Экспорт
  window.renderCards = renderCards;
  window.enhanceBloggerCard = enhanceBloggerCard;
})();
