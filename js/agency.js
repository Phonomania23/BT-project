// Имя пользователя
(function initUserName() {
  const params = new URLSearchParams(location.search);
  const name = params.get("user") || localStorage.getItem("userName") || "Demo Agency";
  const el = document.getElementById("userName");
  if (el) el.textContent = name;
})();

// Выход
(function initLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    try { localStorage.removeItem("userName"); } catch(_) {}
    location.href = "index.html";
  });
})();

// ===== Поиск/фильтры/выбор
const norm = (s) => (s||"").toString().trim().toLowerCase();

async function loadBloggers() {
  const res = await fetch("json/bloggers.json", { cache: "no-store" });
  return res.json();
}

(function main(){
  const platformSelect = document.getElementById("platformSelect");
  const categoryInput  = document.getElementById("categoryInput");
  const aiOnly         = document.getElementById("aiOnly");
  const searchInput    = document.getElementById("searchInput");
  const resultsList    = document.getElementById("resultsList");
  const chips          = document.getElementById("activeChips");

  const selectAllBtn   = document.getElementById("selectAll");
  const clearAllBtn    = document.getElementById("clearAll");
  const goToBrief      = document.getElementById("goToBrief");
  const pickedCountEl  = document.getElementById("pickedCount");

  let bloggers = [];
  // восстановим прошлый выбор (если есть)
  let selected = new Set();
  try {
    const prev = JSON.parse(localStorage.getItem("selectedBloggers") || "[]");
    if (Array.isArray(prev)) prev.forEach(id => selected.add(String(id)));
  } catch {}

  function renderChips(filters){
    const items = [];
    if (filters.platform) items.push(`Платформа: ${filters.platform}`);
    if (filters.category) items.push(`Рубрика: ${filters.category}`);
    if (filters.aiOnly)   items.push(`ИИ: рекомендованные`);
    if (filters.q)        items.push(`Поиск: ${filters.q}`);
    chips.innerHTML = items.map(x=>`<span class="chip">${x}</span>`).join("");
  }

  function toItem(b) {
    const isChecked = selected.has(String(b.id));
    return `
      <li>
        <label class="row">
          <input type="checkbox" class="pickChk" value="${b.id}" ${isChecked ? "checked" : ""} />
          <strong>${b.name}</strong>
          <span class="badge">${b.platform}</span>
          ${b.category ? `<span class="badge">${b.category}</span>` : ""}
          ${b.ai_recommended ? `<span class="badge">ИИ</span>` : ""}
          <span class="muted">· ${b.niche || ""} · ${Number(b.subscribers||0).toLocaleString("ru-RU")} подписчиков</span>
        </label>
        <div class="row" style="margin-left:26px">
          ${b.email ? `<a href="mailto:${b.email}">email</a>` : ""}
          ${b.telegram ? `<a href="${b.telegram}" target="_blank" rel="noopener">telegram</a>` : ""}
          ${b.youtube ? `<a href="${b.youtube}" target="_blank" rel="noopener">канал</a>` : ""}
          <a href="blogger-card.html?id=${encodeURIComponent(b.id)}">профиль</a>
        </div>
      </li>
    `.trim();
  }

  function applyFilters() {
    const f = {
      platform: platformSelect.value || "",
      category: categoryInput.value.trim(),
      aiOnly:   !!aiOnly.checked,
      q:        norm(searchInput.value)
    };
    renderChips(f);

    let list = bloggers.slice();

    if (f.platform) list = list.filter(b => (b.platform||"") === f.platform);
    if (f.category) list = list.filter(b => norm(b.category).includes(norm(f.category)));
    if (f.aiOnly)   list = list.filter(b => !!b.ai_recommended);
    if (f.q)        list = list.filter(b => [b.name, b.niche, b.platform, b.category].some(v => norm(v).includes(f.q)));

    resultsList.setAttribute("aria-busy","true");
    resultsList.innerHTML = list.slice(0,200).map(toItem).join("") || `<li class="muted">Нет результатов по заданным фильтрам.</li>`;
    resultsList.setAttribute("aria-busy","false");

    // подписываем чекбоксы
    resultsList.querySelectorAll(".pickChk").forEach(cb => {
      cb.addEventListener("change", ()=>{
        const id = String(cb.value);
        if (cb.checked) selected.add(id); else selected.delete(id);
        updateControls();
      });
    });

    updateControls();
  }

  function updateControls(){
    // сохранить выбор между перерисовками
    try { localStorage.setItem("selectedBloggers", JSON.stringify([...selected])); } catch {}
    // обновить счётчик и состояние кнопки
    const count = selected.size;
    if (pickedCountEl) pickedCountEl.textContent = count;
    goToBrief.disabled = count < 1;
  }

  // кнопки выбора
  selectAllBtn?.addEventListener("click", ()=>{
    resultsList.querySelectorAll(".pickChk").forEach(cb => {
      cb.checked = true; selected.add(String(cb.value));
    });
    updateControls();
  });
  clearAllBtn?.addEventListener("click", ()=>{
    resultsList.querySelectorAll(".pickChk").forEach(cb => cb.checked = false);
    selected.clear();
    updateControls();
  });

  // переход к брифу
  goToBrief.addEventListener("click", ()=>{
    if (selected.size < 1) return;
    // выбранные блогеры уже сохранены в localStorage.selectedBloggers
    location.href = "deal.html";
  });

  // слушатели фильтров
  [platformSelect, categoryInput, aiOnly, searchInput].forEach(el =>
    el.addEventListener("input", applyFilters)
  );

  // загрузка данных
  loadBloggers().then(data => {
    bloggers = Array.isArray(data) ? data : [];
    applyFilters();
  }).catch(e => {
    console.error("Ошибка загрузки bloggers.json", e);
    resultsList.innerHTML = `<li>Ошибка загрузки списка блогеров.</li>`;
  });

})();
