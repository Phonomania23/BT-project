// deal-router.js — хэш-роутинг, блокировки этапов, навигация Назад/Далее
// Работает с /deal/index.html и модулями filters.js + cards.js

/********************
 * Константы/ключи  *
 ********************/
const MAX_STEP     = 9;
const KEY_FUNNEL   = "dealFunnelV2";
const KEY_PICKED   = "selectedBloggers"; // список id из filters.js

/********************
 * Хранилище (LS)   *
 ********************/
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getFunnel() {
  return readJSON(KEY_FUNNEL, {
    step: 1,
    brief:   { goal:"", budget:"", deadline:"", done:false },
    email:   { account:"", linked:false },
    outreach:{ sent:false, responded:0 },
    contract:{ signed:false },
    payment: { reserved:false },
    shoot:   { uploaded:false },
    approval:{ link:"", comment:"", approved:false, fixRequested:false },
    payout:  { done:false }
  });
}
function setFunnel(patch) {
  const f = { ...getFunnel(), ...patch };
  writeJSON(KEY_FUNNEL, f);
  return f;
}

/********************
 * Утилиты UI       *
 ********************/
const $ = (sel, root=document) => root.querySelector(sel);
const $all = (sel, root=document) => [...root.querySelectorAll(sel)];

function cloneTpl(id) {
  const t = document.getElementById(id);
  if (!t) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = `Шаблон не найден: ${id}`;
    return div;
  }
  return document.importNode(t.content, true);
}

function setAriaCurrent(step) {
  const nav = document.getElementById("dealNav");
  if (!nav) return;
  const allowed = allowedMaxStep();

  $all("a", nav).forEach(a => {
    a.removeAttribute("aria-current");
    const s = Number(a.dataset.step);
    if (s === step) a.setAttribute("aria-current", "step");
    if (s > allowed) a.setAttribute("disabled", "true");
    else a.removeAttribute("disabled");
  });
}

function setTabsActive(step) {
  const tabs = document.getElementById("dealTabs");
  if (!tabs) return;
  const allowed = allowedMaxStep();

  $all("button", tabs).forEach(b => {
    const s = Number(b.dataset.step);
    b.classList.toggle("is-active", s === step);
    b.disabled = s > allowed;
  });
}

function updateFooter(step) {
  const now = $("#stepNow");
  if (now) now.textContent = String(step);
  const prev = $("#prevBtn");
  const next = $("#nextBtn");
  if (prev) prev.disabled = step <= 1;
  if (next) next.textContent = step >= MAX_STEP ? "Готово" : "Далее";
}

/********************************
 * Бизнес-правила блокировки     *
 ********************************/
function pickedCount() {
  try { return JSON.parse(localStorage.getItem(KEY_PICKED) || "[]").length; }
  catch { return 0; }
}

function isStepDone(n) {
  const f = getFunnel();
  switch (n) {
    case 1: return pickedCount() > 0;
    case 2: return !!f.brief.done;
    case 3: return !!f.email.linked;
    case 4: return !!f.outreach.sent;
    case 5: return !!f.contract.signed;
    case 6: return !!f.payment.reserved;
    case 7: return !!f.shoot.uploaded;
    case 8: return !!f.approval.approved;
    case 9: return !!f.payout.done;
    default: return false;
  }
}

function allowedMaxStep() {
  // Последовательно открываем этапы; 4→5 требует хотя бы один ответ
  if (!isStepDone(1)) return 1;
  if (!isStepDone(2)) return 2;
  if (!isStepDone(3)) return 3;

  const f = getFunnel();
  if (!isStepDone(4) || (f.outreach.sent && f.outreach.responded <= 0)) return 4;
  if (!isStepDone(5)) return 5;
  if (!isStepDone(6)) return 6;
  if (!isStepDone(7)) return 7;
  if (!isStepDone(8)) return 8;
  return 9;
}

/********************
 * Роутер           *
 ********************/
function parseHash() {
  // #/1-pick, #/2-brief ...
  const m = location.hash.match(/#\/(\d+)/);
  const n = Math.max(1, Math.min(MAX_STEP, Number(m?.[1] || 1)));
  return n;
}

function go(step) {
  step = Math.max(1, Math.min(MAX_STEP, step));
  const slug = ["", "pick","brief","email","outreach","contract","payment","shoot","approval","payout"][step] || "";
  location.hash = `#/${step}-${slug}`;
}

function render(step) {
  // Не даём уходить «вперёд» по прямой ссылке
  const allowed = allowedMaxStep();
  if (step > allowed) {
    step = allowed;
    go(step);
    return;
  }

  // Контент шага
  const host = document.getElementById("stepHost");
  if (!host) return;
  host.innerHTML = "";
  const tplId = `tpl-${step}-${["","pick","brief","email","outreach","contract","payment","shoot","approval","payout"][step]}`;
  host.appendChild(cloneTpl(tplId));

  // Инициализация шага
  initStep(step);

  // Обновление UI
  setAriaCurrent(step);
  setTabsActive(step);
  updateFooter(step);

  // Сохраняем текущий шаг
  setFunnel({ step });
}

function onHashChange() {
  render(parseHash());
}

/********************************
 * Инициализаторы шагов         *
 ********************************/
function initStep(step) {
  switch (step) {
    case 1: return initStep1();
    case 2: return initStep2();
    case 3: return initStep3();
    case 4: return initStep4();
    case 5: return initStep5();
    case 6: return initStep6();
    case 7: return initStep7();
    case 8: return initStep8();
    case 9: return initStep9();
  }
}

// Шаг 1 — Подбор (упрощенная инициализация)
function initStep1() {
  console.log("🔄 Инициализация шага 1");
  
  // Простая инициализация без сложных проверок
  if (typeof window.initPickStep === "function") {
    setTimeout(() => {
      window.initPickStep();
      console.log("✅ initPickStep вызван");
    }, 100);
    return;
  }

  // Если функция не найдена, пробуем загрузить данные хотя бы
  console.warn("initPickStep не найден, пробуем базовую инициализацию");
  
  const listEl = $("#resultsList");
  if (listEl) {
    listEl.innerHTML = `
      <li class="muted">Загрузка блогеров...</li>
    `;
    
    // Пробуем загрузить данные
    setTimeout(() => {
      if (listEl) {
        listEl.innerHTML = `
          <li class="muted">Фильтры загружены. Выберите платформу для начала работы.</li>
        `;
      }
      document.dispatchEvent(new CustomEvent('filters:ready'));
    }, 500);
  }
}

// Шаг 2 — Бриф
function initStep2() {
  const f = getFunnel();
  const goal = $("#briefGoal"), budget = $("#briefBudget"), deadline = $("#briefDeadline");
  if (goal) goal.value = f.brief.goal || "";
  if (budget) budget.value = f.brief.budget || "";
  if (deadline) deadline.value = f.brief.deadline || "";

  const form = $("#briefForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = {
        goal: (goal?.value || "").trim(),
        budget: Number(budget?.value || 0),
        deadline: deadline?.value || ""
      };
      if (!data.goal || !data.budget || !data.deadline) {
        return alert("Заполните все поля брифа.");
      }
      setFunnel({ brief: { ...data, done: true } });
      const savedEl = $("#briefSaved");
      if (savedEl) {
        savedEl.textContent = "Сохранено.";
        setTimeout(() => (savedEl.textContent = ""), 1200);
      }
    });
  }
}

// Шаг 3 — Привязка почты
function initStep3() {
  const f = getFunnel();
  const acc = $("#emailAccount");
  if (acc) acc.value = f.email.account || "";

  const btn = $("#linkEmailBtn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const v = (acc?.value || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return alert("Введите корректный e-mail.");
      setFunnel({ email: { account: v, linked: true } });
      const st = $("#emailStatus");
      if (st) st.textContent = "Почта привязана.";
    });
  }
}

// Шаг 4 — Рассылка
function initStep4() {
  const picked = readJSON(KEY_PICKED, []);
  const list = $("#outreachList");
  if (list) {
    list.innerHTML = picked.map(id => `<li>Блогер ID: ${id} — ожидаем ответ</li>`).join("")
      || `<li class="muted">Нет выбранных получателей.</li>`;
  }

  const sendBtn = $("#sendOutreachBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      setFunnel({ outreach: { ...getFunnel().outreach, sent: true } });
      const st = $("#outreachStatus");
      if (st) st.textContent = "Письма отправлены (эмуляция).";
    });
  }

  const markBtn = $("#markRespondBtn");
  if (markBtn) {
    markBtn.addEventListener("click", () => {
      const count = Math.max(1, Math.round(picked.length * 0.3)); // эмуляция 30% ответов
      setFunnel({ outreach: { sent: true, responded: count } });
      const st = $("#outreachStatus");
      if (st) st.textContent = `Ответили: ${count}`;
    });
  }
}

// Шаг 5 — Договор
function initStep5() {
  const btn = $("#signContractBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      setFunnel({ contract: { signed: true } });
      const st = $("#contractStatus");
      if (st) st.textContent = "Договор подписан.";
    });
  }
}

// Шаг 6 — Оплата (резерв)
function initStep6() {
  const btn = $("#reserveFundsBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      setFunnel({ payment: { reserved: true } });
      const st = $("#paymentStatus");
      if (st) st.textContent = "Средства зарезервированы.";
    });
  }
}

// Шаг 7 — Съёмка черновика
function initStep7() {
  const input = $("#uploadInput");
  const btn = $("#uploadBtn");
  if (btn && input) {
    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      if (input.files && input.files.length) {
        setFunnel({ shoot: { uploaded: true } });
        const st = $("#shootStatus");
        if (st) st.textContent = "Видео загружено (эмуляция).";
      }
    });
  }
}

// Шаг 8 — Одобрение
function initStep8() {
  const f = getFunnel();
  const linkEl = $("#approvalLink");
  const commEl = $("#approvalComment");
  if (linkEl)  linkEl.value  = f.approval.link || "";
  if (commEl)  commEl.value  = f.approval.comment || "";

  const approve = $("#approveBtn");
  if (approve) {
    approve.addEventListener("click", () => {
      const link = (linkEl?.value || "").trim();
      if (!/^https?:\/\/.+/i.test(link)) return alert("Введите корректную ссылку на ролик.");
      setFunnel({ approval: { link, comment: (commEl?.value || "").trim(), approved: true, fixRequested: false } });
      const st = $("#approvalStatus");
      if (st) st.textContent = "Принято. Выплата будет доступна.";
      setTimeout(() => go(9), 400);
    });
  }

  const request = $("#requestFixBtn");
  if (request) {
    request.addEventListener("click", () => {
      setFunnel({ approval: { link: (linkEl?.value || "").trim(), comment: (commEl?.value || "").trim(), approved: false, fixRequested: true } });
      const st = $("#approvalStatus");
      if (st) st.textContent = "Запрошены правки.";
    });
  }
}

// Шаг 9 — Выплата блогеру
function initStep9() {
  const f = getFunnel();
  const info = $("#payoutInfo");
  if (f.approval.approved && !f.payout.done) {
    setTimeout(() => {
      setFunnel({ payout: { done: true } });
      if (info) info.textContent = "Выплата проведена (эмуляция).";
    }, 300);
  } else if (f.payout.done) {
    if (info) info.textContent = "Выплата уже проведена.";
  } else {
    if (info) info.textContent = "Сначала одобрите ролик.";
  }
}

/********************************
 * Навигация (кнопки/табы)      *
 ********************************/
function attachPrevNext() {
  const prev = $("#prevBtn");
  const next = $("#nextBtn");

  if (prev) prev.addEventListener("click", () => go(parseHash() - 1));

  if (next) next.addEventListener("click", () => {
    let step = parseHash();
    const f = getFunnel();

    if (step === 1 && pickedCount() <= 0)      return alert("Выберите хотя бы одного блогера.");
    if (step === 2 && !f.brief.done)           return alert("Заполните и сохраните бриф.");
    if (step === 3 && !f.email.linked)         return alert("Привяжите e-mail.");
    if (step === 4) {
      if (!f.outreach.sent)                    return alert("Сначала отправьте письма.");
      if (f.outreach.responded <= 0)           return alert("Отметьте хотя бы один ответ.");
    }
    if (step === 5 && !f.contract.signed)      return alert("Подпишите договор.");
    if (step === 6 && !f.payment.reserved)     return alert("Зарезервируйте средства.");
    if (step === 7 && !f.shoot.uploaded)       return alert("Загрузите черновик видео.");
    if (step === 8 && !f.approval.approved)    return alert("Нажмите «Принять» для одобрения.");

    if (step >= MAX_STEP) {
      alert("Сделка завершена.");
      return;
    }
    go(step + 1);
  });

  // клики по табам (верх)
  $all("#dealTabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = Number(btn.dataset.step);
      if (s <= allowedMaxStep()) go(s);
    });
  });
}

/********************
 * Запуск           *
 ********************/
window.addEventListener("hashchange", onHashChange);
window.addEventListener("DOMContentLoaded", () => {
  attachPrevNext();
  if (!location.hash) go(getFunnel().step || 1);
  onHashChange();
});