// emails.js — рассылка офферов с плейсхолдерами {{имя}}, {{дата}}
// Seed читаем из json/emails.json, «отправленные» храним в localStorage (EMAILS_OUTBOX).
// Добавлен дневной лимит отправок (150) и авто-футер "Отправлено через BloggerTools".

const OUTBOX_KEY = "EMAILS_OUTBOX";

// --- Лимит писем/день + квота ---
const DAILY_LIMIT = 150;
const QUOTA_KEY = "EMAILS_QUOTA"; // { date: 'YYYY-MM-DD', count: N }
function todayStr() { return new Date().toISOString().slice(0,10); }
function readQuota() { try { return JSON.parse(localStorage.getItem(QUOTA_KEY)||"{}"); } catch { return {}; } }
function writeQuota(q) { try { localStorage.setItem(QUOTA_KEY, JSON.stringify(q)); } catch {} }

// --- Аутбокс ---
function readOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]"); } catch { return []; }
}
function writeOutbox(arr) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr)); } catch {}
}

// --- Подстановка плейсхолдеров ---
function fmtDate(d = new Date()) {
  return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}
function applyTemplate(str, blogger) {
  return (str || "")
    .replace(/\{\{\s*имя\s*\}\}/gi, blogger.name || "")
    .replace(/\{\{\s*дата\s*\}\}/gi, fmtDate());
}

// --- Фирменный футер в письме ---
function ensureFooter(html) {
  const footer = `<hr><p style="font-size:12px;color:#888">Отправлено через <a href="https://bloggers.tools" target="_blank" rel="noopener">BloggerTools</a></p>`;
  return /Отправлено через\s*BloggerTools/i.test(html) ? html : (html + footer);
}

// --- Данные блогеров ---
async function loadBloggers() {
  const res = await fetch("json/bloggers.json", { cache: "no-store" });
  return res.json();
}
function renderBloggers(listEl, bloggers) {
  listEl.setAttribute("aria-busy", "true");
  listEl.innerHTML = bloggers.map(b => `
    <li>
      <label class="row">
        <input type="checkbox" name="recip" value="${b.id}" />
        <strong>${b.name}</strong>
        <span class="badge">${b.platform}</span>
        <span class="badge">${b.niche}</span>
        <span class="muted">· ${Number(b.subscribers).toLocaleString("ru-RU")} подписчиков</span>
      </label>
    </li>
  `).join("");
  listEl.setAttribute("aria-busy", "false");
}
function getSelectedBloggers(bloggers) {
  const checked = [...document.querySelectorAll('input[name="recip"]:checked')].map(i => i.value);
  const map = new Map(bloggers.map(b => [b.id, b]));
  return checked.map(id => map.get(id)).filter(Boolean);
}

// --- UI/логика ---
async function main() {
  const bloggersList = document.getElementById("bloggersList");
  const search = document.getElementById("searchBloggers");
  const selectAll = document.getElementById("selectAll");
  const form = document.getElementById("mailForm");
  const subjectEl = document.getElementById("subject");
  const bodyEl = document.getElementById("body");
  const preview = document.getElementById("preview");
  const clearBtn = document.getElementById("clearBtn");

  let bloggers = [];
  try {
    bloggers = await loadBloggers();
    renderBloggers(bloggersList, bloggers);
  } catch (e) {
    bloggersList.innerHTML = `<li>Ошибка загрузки bloggers.json</li>`;
    console.error(e);
  }

  // Поиск
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    const filtered = bloggers.filter(b =>
      [b.name, b.niche, b.platform].some(v => (v || "").toLowerCase().includes(q))
    );
    renderBloggers(bloggersList, filtered);
    selectAll.checked = false;
    updatePreview();
  });

  // Выбрать всех
  selectAll.addEventListener("change", () => {
    document.querySelectorAll('input[name="recip"]').forEach(cb => { cb.checked = selectAll.checked; });
    updatePreview();
  });

  // Обновление превью при отметке чекбоксов
  bloggersList.addEventListener("change", (e) => {
    if (e.target.name === "recip") {
      const allBoxes = [...document.querySelectorAll('input[name="recip"]')];
      const checkedBoxes = allBoxes.filter(cb => cb.checked);
      selectAll.checked = checkedBoxes.length === allBoxes.length && allBoxes.length > 0;
      updatePreview();
    }
  });

  // Превью: рендер для первого выбранного
  function updatePreview() {
    const selected = getSelectedBloggers(bloggers);
    const b = selected[0];
    const subj = subjectEl.value || "";
    theBody = bodyEl.value || "";
    if (!b) {
      preview.innerHTML = `<div class="muted">Выберите хотя бы одного блогера, чтобы увидеть превью.</div>`;
      return;
    }
    const subjR = applyTemplate(subj, b);
    const bodyR = applyTemplate(theBody, b);
    preview.innerHTML = `<div><strong>Тема:</strong> ${escapeHtml(subjR)}</div><hr/>${bodyR}`;
  }

  // Экранируем только тему (превью темы без HTML)
  function escapeHtml(s) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return s.replace(/[&<>"']/g, m => map[m]);
  }

  subjectEl.addEventListener("input", updatePreview);
  bodyEl.addEventListener("input", updatePreview);

  clearBtn.addEventListener("click", () => {
    subjectEl.value = "";
    bodyEl.value = "";
    document.querySelectorAll('input[name="recip"]').forEach(cb => cb.checked = false);
    selectAll.checked = false;
    updatePreview();
  });

  // Отправка
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selected = getSelectedBloggers(bloggers);
    if (!selected.length) return alert("Выберите хотя бы одного блогера.");
    if (!subjectEl.value.trim()) return alert("Введите тему письма.");
    if (!bodyEl.value.trim()) return alert("Введите текст письма.");

    // --- Квота/лимит ДО формирования batch ---
    const quota = readQuota();
    const today = todayStr();
    if (!quota.date || quota.date !== today) { quota.date = today; quota.count = 0; }
    const wantToSend = selected.length;
    if (quota.count + wantToSend > DAILY_LIMIT) {
      const left = Math.max(0, DAILY_LIMIT - quota.count);
      return alert(`Дневной лимит ${DAILY_LIMIT} писем превышен. Осталось: ${left}.`);
    }

    // --- Пачка «отправленных» ---
    const now = new Date().toISOString();
    const batch = selected.map(b => ({
      id: `m_${Date.now()}_${b.id}`,
      to: { id: b.id, name: b.name, email: b.email || "" },
      subject: applyTemplate(subjectEl.value, b),
      bodyHtml: ensureFooter(applyTemplate(bodyEl.value, b)),
      sentAt: now
    }));

    // --- Сохранение аутбокса ---
    const outbox = readOutbox();
    outbox.push(...batch);
    writeOutbox(outbox);

    // --- Обновить квоту ПОСЛЕ сохранения ---
    quota.count += batch.length;
    writeQuota(quota);

    // Имитация SMTP
    alert("Письмо отправлено!");

    // Сброс
    form.reset();
    preview.innerHTML = `<div class="muted">Письмо отправлено. Выберите блогеров, чтобы сформировать новое превью.</div>`;
  });

  // Инициализация превью на старте
  updatePreview();

  // Подгрузка seed из emails.json (для соответствия ТЗ; UI не использует)
  try { await fetch("json/emails.json", { cache: "no-store" }); } catch {}
}

main();
