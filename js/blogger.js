// Имя пользователя (из ?user=... или localStorage)
(function initName() {
  const p = new URLSearchParams(location.search);
  const name = p.get("user") || localStorage.getItem("bloggerName") || "Demo Blogger";
  const el = document.getElementById("bloggerName");
  if (el) el.textContent = name;
})();

// Выход
(function initLogout() {
  const btn = document.getElementById("logoutBlogger");
  btn?.addEventListener("click", () => {
    try { localStorage.removeItem("bloggerName"); } catch(_) {}
    location.href = "index.html";
  });
})();

// Локальное состояние статусов (имитация бэкенда)
const STATE_KEY = "dealsState";
function readState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
  } catch { return {}; }
}
function writeState(s) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
}

// Рендер сделки в виде карточки
function dealCard(d) {
  const ruStatus = d.status === "in_progress" ? "В работе" :
                   d.status === "awaiting_review" ? "На проверке" : d.status;
  const canUpload = d.status === "in_progress";
  return `
    <div class="deal" data-id="${d.id}">
      <div class="row">
        <strong>${d.title}</strong>
        <span class="badge">${ruStatus}</span>
      </div>
      <div class="meta">${d.brand} · ${d.platform} · дедлайн: ${d.dueDate}</div>
      <div class="deal-actions">
        <a class="btn-ghost" href="deal.html?id=${encodeURIComponent(d.id)}">Детали сделки</a>
        ${canUpload ? `<button class="btn" data-action="upload" type="button">Загрузить видео</button>` : ""}
      </div>
      <input type="file" accept="video/*" hidden />
    </div>
  `.trim();
}

// Простейшие бары на canvas
function drawBars(canvas, labels, data, title) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  // рамка
  ctx.strokeStyle = "#ddd";
  ctx.strokeRect(0.5,0.5,w-1,h-1);

  const max = Math.max(...data, 1);
  const pad = 24;
  const chartH = h - pad*2 - 14;
  const chartW = w - pad*2;
  const n = data.length;
  const barW = Math.max(16, (chartW - (n+1)*8) / n);

  // ось X подписи
  ctx.fillStyle = "#111";
  ctx.font = "12px system-ui";

  data.forEach((v, i) => {
    const x = pad + 8 + i*(barW+8);
    const bh = Math.round((v / max) * chartH);
    const y = h - pad - bh;
    ctx.fillStyle = "#888";
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = "#111";
    const lab = (labels[i] || "").slice(0,10);
    ctx.fillText(lab, x, h - pad + 12);
  });

  // заголовок
  ctx.font = "bold 13px system-ui";
  ctx.fillText(title, pad, pad - 6);
}

async function main() {
  const inProgress = document.getElementById("inProgress");
  const awaiting = document.getElementById("awaiting");
  const chatSelect = document.getElementById("chatDealSelect");
  const openChatBtn = document.getElementById("openChatBtn");
  const audCanvas = document.getElementById("audChart");
  const viewsCanvas = document.getElementById("viewsChart");

  let deals = [];
  try {
    const res = await fetch("json/deals.json", { cache: "no-store" });
    deals = await res.json();

    // применяем локальные изменения статусов
    const st = readState();
    deals = deals.map(d => st[d.id] ? { ...d, status: st[d.id] } : d);
  } catch (e) {
    console.error("Ошибка загрузки deals.json", e);
  }

  // Рендер списков
  function render() {
    const prog = deals.filter(d => d.status === "in_progress");
    const rev = deals.filter(d => d.status === "awaiting_review");

    const htmlProg = prog.length ? prog.map(dealCard).join("") : `<p class="empty">Нет задач «В работе».</p>`;
    const htmlRev  = rev.length ? rev.map(dealCard).join("")  : `<p class="empty">Нет задач «На проверке».</p>`;

    inProgress.innerHTML = htmlProg;
    awaiting.innerHTML = htmlRev;

    // повесим обработчики на кнопки Загрузить видео
    document.querySelectorAll('.deal [data-action="upload"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".deal");
        const input = card.querySelector('input[type="file"]');
        input.click();
        input.onchange = () => {
          if (input.files?.length) {
            const id = card.getAttribute("data-id");
            // имитация аплоада -> статус "На проверке"
            const s = readState(); s[id] = "awaiting_review"; writeState(s);
            deals = deals.map(d => d.id === id ? { ...d, status: "awaiting_review" } : d);
            render();
            alert("Видео загружено. Проект переведён в статус «На проверке».");
          }
        };
      });
    });

    // чат-выбор
    chatSelect.innerHTML = deals.map(d => `<option value="${d.id}">${d.title} — ${d.brand}</option>`).join("");
    if (!deals.length) chatSelect.innerHTML = `<option>Нет проектов</option>`;

    // графики (фейковые на основе metrics)
    const labels = deals.map(d => d.brand);
    const aud = deals.map(d => (d.metrics?.audience ?? 0));
    const views = deals.map(d => (d.metrics?.avgViews ?? 0));
    drawBars(audCanvas, labels, aud, "Аудитория");
    drawBars(viewsCanvas, labels, views, "Просмотры");
  }

  render();

  // открыть переписку
  openChatBtn?.addEventListener("click", () => {
    const id = chatSelect.value;
    const deal = deals.find(d => d.id === id) || deals[0];
    if (!deal) return;
    if (deal.chatUrl) {
      window.open(deal.chatUrl, "_blank", "noopener");
    } else {
      location.href = `deal.html?id=${encodeURIComponent(deal.id)}#chat`;
    }
  });
}

main();
