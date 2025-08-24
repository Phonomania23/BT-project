// /js/guard.js — мягкий вариант для статики/превью.
// НИЧЕГО не делает, пока вы явно не включите проверку.
(() => {
  // Включать только на проде:
  if (!window.BT_REQUIRE_AUTH) return;

  async function me() {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (!r.ok) throw new Error("unauthorized");
      return await r.json();
    } catch {
      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await me();
    if (!user) {
      // мягкий редирект: только если есть кнопка «Войти» и нет хэша шага
      if (!location.hash) location.href = "/index.html";
    }
  });
})();
