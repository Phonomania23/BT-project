// Подставляет HTML-фрагменты из /components/*.html в элементы с data-include
(async () => {
  const slots = document.querySelectorAll("[data-include]");
  await Promise.all(
    [...slots].map(async (el) => {
      const url = el.getAttribute("data-include");
      try {
        const res = await fetch(url, { cache: "no-store" });
        el.outerHTML = await res.text();
      } catch (e) {
        console.error("Include failed:", url, e);
      }
    })
  );
})();
