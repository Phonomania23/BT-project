// deal.js — строгая последовательность этапов
// Подбор → Бриф → Привязка почты → Рассылка → Договор/Оплата → Съёмка → Одобрение → Оплата блогеру

const OVERLAY_KEY = "dealsOverlay";
const STAGES = [
  { key: "select", label: "Подбор" },
  { key: "brief", label: "Бриф" },
  { key: "email", label: "Привязка почты" },
  { key: "outreach", label: "Рассылка" },
  { key: "contractPayment", label: "Договор/Оплата" },
  { key: "shoot", label: "Съёмка" },
  { key: "approval", label: "Одобрение" },
  { key: "payout", label: "Оплата блогеру" },
];

function readOverlay() {
  try { return JSON.parse(localStorage.getItem(OVERLAY_KEY) || "{}"); } catch { return {}; }
}
function writeOverlay(obj) {
  try { localStorage.setItem(OVERLAY_KEY, JSON.stringify(obj)); } catch {}
}

// Обновляет overlay конкретной сделки
function patchDeal(baseId, patch) {
  const all = readOverlay();
  const cur = all[baseId] || {};
  const next = {
    ...cur,
    ...patch,
    brief: { ...(cur.brief||{}), ...(patch.brief||{}) },
    approval: { ...(cur.approval||{}), ...(patch.approval||{}) }
  };
  all[baseId] = next;
  writeOverlay(all);
  return next;
}

function stepIndex(key) { return STAGES.findIndex(s=>s.key===key) + 1; }

(async function init(){
  // Узнаём выбранного блогера (из ?blogger или localStorage)
  const params = new URLSearchParams(location.search);
  const bloggerIdFromQuery = params.get("blogger") || localStorage.getItem("selectedBloggerId") || "";

  // Базовая сделка: берём первую из json/deals.json как шаблон (для хранения прогресса)
  let deals = [];
  try {
    const res = await fetch("json/deals.json", { cache: "no-store" });
    deals = await res.json();
  } catch(e){ console.error(e); }

  const base = deals[0] || { id: "deal_demo", title:"Сделка", brand:"Demo Brand", platform:"" };

  // Слияние с overlay
  const ovAll = readOverlay();
  let current = { ...base, ...(ovAll[base.id]||{}) };

  // Если из поиска пришёл блогер — сохраняем в overlay как пройденный «Подбор»
  if (bloggerIdFromQuery && current.selectedBloggerId !== bloggerIdFromQuery) {
    current = patchDeal(base.id, { selectedBloggerId: bloggerIdFromQuery });
  }

  // Подтянем инфо по блогеру (для карточки «Подбор»)
  let bloggerName = "";
  if (current.selectedBloggerId) {
    try {
      const res = await fetch("json/bloggers.json", { cache: "no-store" });
      const bloggers = await res.json();
      const b = bloggers.find(x=>x.id===current.selectedBloggerId);
      bloggerName = b ? `${b.name} · ${b.platform} · ${b.niche||""}` : `ID: ${current.selectedBloggerId}`;
    } catch(e){ console.error(e); }
  }

  // DOM
  const stepsEl = document.getElementById("steps");
  const titleEl = document.getElementById("dealTitle");
  const metaEl  = document.getElementById("dealMeta");
  const cancelBtn = document.getElementById("cancelBtn");

  // Секции
  const sec = {
    select: document.getElementById("stage-select"),
    brief: document.getElementById("stage-brief"),
    email: document.getElementById("stage-email"),
    outreach: document.getElementById("stage-outreach"),
    contractPayment: document.getElementById("stage-contract"),
    shoot: document.getElementById("stage-shoot"),
    approval: document.getElementById("stage-approval"),
    payout: document.getElementById("stage-payout"),
  };

  // Поля/кнопки
  const selectedInfo = document.getElementById("selectedInfo");

  const briefForm = document.getElementById("briefForm");
  const briefGoal = document.getElementById("briefGoal");
  const briefBudget = document.getElementById("briefBudget");
  const briefDeadline = document.getElementById("briefDeadline");
  const briefSaved = document.getElementById("briefSaved");

  const emailAccount = document.getElementById("emailAccount");
  const linkEmailBtn = document.getElementById("linkEmailBtn");
  const emailStatus = document.getElementById("emailStatus");

  const prepOutreachBtn = document.getElementById("prepOutreachBtn");
  const sendOutreachBtn = document.getElementById("sendOutreachBtn");
  const outreachStatus = document.getElementById("outreachStatus");

  const signBtn = document.getElementById("signBtn");
  const contractStatus = document.getElementById("contractStatus");
  const payBtn = document.getElementById("payBtn");
  const paymentStatus = document.getElementById("paymentStatus");

  const uploadBtn = document.getElementById("uploadBtn");
  const uploadInput = document.getElementById("uploadInput");
  const shootStatus = document.getElementById("shootStatus");

  const approvalLink = document.getElementById("approvalLink");
  const approvalComment = document.getElementById("approvalComment");
  const approveBtn = document.getElementById("approveBtn");
  const requestFixBtn = document.getElementById("requestFixBtn");
  const approvalStatus = document.getElementById("approvalStatus");

  const payoutBtn = document.getElementById("payoutBtn");
  const payoutStatus = document.getElementById("payoutStatus");

  // Шапка
  titleEl.textContent = current.title || "Сделка";
  metaEl.textContent = `${current.brand || ""} · ${current.platform || ""} · дедлайн: ${current.dueDate || "—"}`;
  selectedInfo.textContent = current.selectedBloggerId ? `Выбран блогер: ${bloggerName}` : "Не выбран. Вернитесь в поиск.";

  // Заполнить формы из state
  if (current.brief) {
    briefGoal.value = current.brief.goal || "";
    briefBudget.value = current.brief.budget ?? "";
    briefDeadline.value = current.brief.deadline || "";
  }
  if (current.emailLinked) {
    emailStatus.textContent = `Привязано к: ${current.emailAccount || "аккаунту"}`;
    if (emailAccount) emailAccount.value = current.emailAccount || "";
  }
  if (current.outreachSent) outreachStatus.textContent = "Рассылка отправлена";
  contractStatus.textContent = current.contractSigned ? "Договор подписан" : "Не подписан";
  paymentStatus.textContent  = current.paid ? "Оплата проведена" : "Не оплачено";
  if (current.uploadDone) shootStatus.textContent = "Черновик загружен. Ожидает публикации/одобрения.";
  if (current.approval?.result) {
    approvalStatus.textContent = current.approval.result === "approved"
      ? "Реклама принята"
      : `Запрошены правки: ${current.approval.comment||""}`;
    if (current.approval.link) approvalLink.value = current.approval.link;
    if (current.approval.comment) approvalComment.value = current.approval.comment;
  }
  if (current.payoutDone) payoutStatus.textContent = "Выплата произведена";

  // Лента шагов
  function renderSteps(activeIndex) {
    stepsEl.innerHTML = "";
    STAGES.forEach((s, i) => {
      const idx = i + 1;
      const li = document.createElement("li");
      li.className = "step" + (idx === activeIndex ? " active" : idx < activeIndex ? " done" : "");
      li.innerHTML = `<span class="dot">${idx}</span><span class="step-label">${s.label}</span>`;
      stepsEl.appendChild(li);
    });
  }

  // Правила готовности этапов
  function computeActiveStep(state) {
    if (!state.selectedBloggerId) return stepIndex("select");
    if (!(state.brief && (state.brief.goal || state.brief.budget || state.brief.deadline))) return stepIndex("brief");
    if (!state.emailLinked) return stepIndex("email");
    if (!state.outreachSent) return stepIndex("outreach");
    if (!(state.contractSigned && state.paid)) return stepIndex("contractPayment");
    if (!state.uploadDone) return stepIndex("shoot");
    if (!(state.approval && state.approval.result === "approved")) return stepIndex("approval");
    if (!state.payoutDone) return stepIndex("payout");
    return stepIndex("payout");
  }

  let activeStep = computeActiveStep(current);

  function lockUI(n) {
    renderSteps(n);
    // Блокируем все секции после активной
    STAGES.forEach((s, i) => {
      const idx = i+1;
      const node = sec[s.key];
      if (!node) return;
      node.classList.toggle("locked", idx > n);
      // Дополнительно скрываем «будущее»? (оставим видимым, но заблокированным)
    });

    // Кнопки доступности по локальным правилам
    signBtn && (signBtn.disabled = n < stepIndex("contractPayment") || current.contractSigned);
    payBtn && (payBtn.disabled = !current.contractSigned || current.paid);
    uploadBtn && (uploadBtn.disabled = n < stepIndex("shoot") || current.uploadDone);
    approveBtn && (approveBtn.disabled = n < stepIndex("approval"));
    requestFixBtn && (requestFixBtn.disabled = n < stepIndex("approval"));
    payoutBtn && (payoutBtn.disabled = n < stepIndex("payout") || current.payoutDone);
  }

  lockUI(activeStep);

  // Сохранить и перерасчитать шаг
  function persist(patch){
    current = patchDeal(base.id, patch);
    activeStep = computeActiveStep(current);
    lockUI(activeStep);
    // обновим шапку статусов
    contractStatus.textContent = current.contractSigned ? "Договор подписан" : "Не подписан";
    paymentStatus.textContent  = current.paid ? "Оплата проведена" : "Не оплачено";
    if (current.uploadDone) shootStatus.textContent = "Черновик загружен. Ожидает публикации/одобрения.";
    if (current.outreachSent) outreachStatus.textContent = "Рассылка отправлена";
    if (current.emailLinked) emailStatus.textContent = `Привязано к: ${current.emailAccount || "аккаунту"}`;
    if (current.approval?.result) {
      approvalStatus.textContent = current.approval.result === "approved"
        ? "Реклама принята"
        : `Запрошены правки: ${current.approval.comment||""}`;
    }
    if (current.payoutDone) payoutStatus.textContent = "Выплата произведена";
  }

  // БРИФ
  briefForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const brief = {
      goal: briefGoal.value.trim(),
      budget: briefBudget.value ? Number(briefBudget.value) : "",
      deadline: briefDeadline.value || ""
    };
    persist({ brief });
    briefSaved.textContent = "Сохранено.";
    setTimeout(() => (briefSaved.textContent = ""), 1800);
  });

  // EMAIL LINK
  linkEmailBtn.addEventListener("click", () => {
    const email = (emailAccount.value||"").trim();
    if (!email) return alert("Укажите email-аккаунт.");
    persist({ emailLinked: true, emailAccount: email });
  });

  // OUTREACH
  prepOutreachBtn.addEventListener("click", () => {
    alert("Список для рассылки сформирован (демо).");
  });
  sendOutreachBtn.addEventListener("click", () => {
    persist({ outreachSent: true });
    alert("Рассылка отправлена (демо).");
  });

  // CONTRACT & PAYMENT
  signBtn.addEventListener("click", () => persist({ contractSigned: true }));
  payBtn.addEventListener("click", () => persist({ paid: true }));

  // SHOOT
  uploadBtn.addEventListener("click", () => uploadInput.click());
  uploadInput.addEventListener("change", () => {
    if (!uploadInput.files || !uploadInput.files.length) return;
    persist({ uploadDone: true });
    alert("Видео загружено (демо).");
  });

  // APPROVAL
  approveBtn.addEventListener("click", () => {
    const link = (approvalLink.value||"").trim();
    if (!link) return alert("Добавьте ссылку на опубликованный ролик.");
    persist({ approval: { link, result: "approved", comment: (approvalComment.value||"").trim() } });
  });
  requestFixBtn.addEventListener("click", () => {
    const link = (approvalLink.value||"").trim();
    const comment = (approvalComment.value||"").trim();
    if (!comment) return alert("Опишите, что нужно поправить.");
    // Возвращаемся на съёмку (шаг до одобрения)
    persist({ approval: { link, result: "needs_changes", comment }, uploadDone: false });
    alert("Запрошены правки. Этап возвращён на «Съёмку».");
  });

  // PAYOUT
  payoutBtn.addEventListener("click", () => persist({ payoutDone: true }));

  // ОТМЕНА СДЕЛКИ
  cancelBtn.addEventListener("click", () => {
    if (!confirm("Отменить и очистить данные по этой сделке?")) return;
    const all = readOverlay();
    delete all[base.id];
    writeOverlay(all);
    location.reload();
  });
})();
