// /js/filters.js — фильтрация + список блогеров на шаге «Подбор» через <blogger-card>
(function () {
  const LS_PICKED = "selectedBloggers";

  let allBloggers = [];
  const picked = new Set(readPicked().map(String));
  const current = { ai: null };

  // ====== shorthands ======
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => root.querySelectorAll(sel);

  function readPicked(){ try{ return JSON.parse(localStorage.getItem(LS_PICKED)||"[]"); }catch{ return []; } }
  function writePicked(arr){ try{ localStorage.setItem(LS_PICKED, JSON.stringify(arr)); }catch{} }

  // ====== загрузка данных ======
  async function loadBloggers() {
    try{
      const r = await fetch("../json/bloggers.json");
      if (!r.ok) throw new Error(r.statusText);
      allBloggers = await r.json();
    }catch(e){
      // fallback с полями под расширенные фильтры
      allBloggers = [
        {
          id:"b101", name:"TechBro", platform:"YouTube", category:"техника",
          subscribers:210000, er:4.5, avg_er:4.5, avg_views:18000,
          pricing:{integrated:1200,currency:"USD"}, avatar:"/images/avatars/placeholder.png",
          language:"ru", country:"RU", audience_geo:"RU", audience_geo_share:70,
          audience_gender:"male", audience_gender_share:65,
          audience_age_bucket:"25-34", audience_age_share:40,
          email:"techbro@example.com", tags:["gadgets","reviews"], ai_similar_to:["Wylsacom"]
        },
        {
          id:"b102", name:"BeautyDaily", platform:"TikTok", category:"красота",
          subscribers:580000, er:7.2, avg_er:7.2, avg_views:30000,
          pricing:{integrated:850,currency:"USD"}, avatar:"/images/avatars/placeholder.png",
          language:"ru", country:"RU", audience_geo:"RU", audience_geo_share:80,
          audience_gender:"female", audience_gender_share:75,
          audience_age_bucket:"18-24", audience_age_share:45,
          email:null, tags:["makeup","skincare"], ai_similar_to:["Huda Beauty"]
        },
        {
          id:"b103", name:"GameRoom", platform:"YouTube", category:"игры",
          subscribers:350000, er:3.8, avg_er:3.8, avg_views:22000,
          pricing:{integrated:950,currency:"USD"}, avatar:"/images/avatars/placeholder.png",
          language:"ru", country:"RU", audience_geo:"RU", audience_geo_share:60,
          audience_gender:"male", audience_gender_share:70,
          audience_age_bucket:"18-24", audience_age_share:35,
          email:"games@example.com", tags:["gaming","streams"], ai_similar_to:["PewDiePie"]
        }
      ];
      console.warn("bloggers.json не найден — используем fallback", e);
    }
  }

  // ====== публичный инициализатор для роутера ======
  window.initPickStep = async function(){
    await loadBloggers();
    bindUI();
    applyFilters();
    document.dispatchEvent(new CustomEvent("filters:ready"));
  };

  // ====== биндинги ======
  function bindUI(){
    // AI-поиск
    $("#aiApply")?.addEventListener("click", applyAIFilter);
    $("#aiClear")?.addEventListener("click", ()=>{
      const i = $("#aiQuery"); if (i) i.value = "";
      current.ai = null; applyFilters();
    });

    // включение полей после выбора платформы
    $("#fPlatform")?.addEventListener("change", () => {
      enableFilters(!!$("#fPlatform")?.value);
      applyFilters();
    });

    // обычные фильтры
    const ids = [
      "followersMinK","followersMaxK","fCategory","fQuery",
      "fGeo","fGeoShare","fGender","fAgeBucket","fAgeShare",
      "fErMin","fErMax","fViewsMin",
      "fPriceMin","fPriceMax","fLang","fCountry","fHasEmail",
      "fSimilarTo","fTopER","fSortBy","fSortDir"
    ];
    ids.forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      const evt = el.tagName === "SELECT" || el.type==="checkbox" ? "change" : "input";
      el.addEventListener(evt, applyFilters);
    });

    // действия
    $("#selectAll")?.addEventListener("click", ()=>{
      const host = $("#resultsList");
      // ожидаем, что в <blogger-card> есть чекбокс .bc-pick в light DOM
      host?.querySelectorAll("blogger-card .bc-pick").forEach(cb=>{
        if (!cb.checked){ cb.checked = true; cb.dispatchEvent(new Event("change")); }
      });
    });
    $("#clearPicked")?.addEventListener("click", ()=>{
      picked.clear(); writePicked([]);
      updateCounters();
      $("#resultsList")?.querySelectorAll("blogger-card .bc-pick").forEach(cb=> cb.checked=false);
    });

    $("#clearFilters")?.addEventListener("click", ()=>{
      $$("#filtersForm input, #filtersForm select").forEach(el=>{
        if (el.type==="checkbox") el.checked=false; else el.value="";
      });
      current.ai = null;
      enableFilters(false);
      applyFilters();
    });

    // реакция на выбор карточек (эмиитируется <blogger-card>)
    $("#resultsList")?.addEventListener("pick:change", (e)=>{
      const {id, picked: on} = e.detail || {};
      if (!id) return;
      on ? picked.add(String(id)) : picked.delete(String(id));
      writePicked([...picked]);
      updateCounters();
    });

    // дадим компонентам доступ к Set
    const host = $("#resultsList");
    if (host) { host.dataset.pickedSet = "1"; host._pickedSet = picked; }

    // при первом входе блокируем расширенные фильтры до платформы
    enableFilters(!!$("#fPlatform")?.value);
  }

  function enableFilters(enable){
    const toEnable = $$("#fCategory, #fGeo, #fGeoShare, #fGender, #fAgeBucket, #fAgeShare, #fErMin, #fErMax, #fViewsMin, #fPriceMin, #fPriceMax, #fLang, #fCountry, #fHasEmail, #fSimilarTo, #fTopER, #fSortBy, #fSortDir");
    toEnable.forEach(el => el.disabled = !enable);
  }

  function applyAIFilter(){
    const q = ($("#aiQuery")?.value||"").toLowerCase().trim();
    current.ai = q || null;
    applyFilters();
  }

  // ====== фильтрация ======
  function applyFilters(){
    let list = allBloggers.slice();

    const platform  = $("#fPlatform")?.value || "";
    const cat       = $("#fCategory")?.value || "";
    const q         = ($("#fQuery")?.value || "").toLowerCase();

    const minK      = +($("#followersMinK")?.value || 0);
    const maxK      = +($("#followersMaxK")?.value || 0);

    const geo       = $("#fGeo")?.value || "";
    const geoShare  = +($("#fGeoShare")?.value || 0);

    const gender    = $("#fGender")?.value || "";             // male/female
    const ageBucket = $("#fAgeBucket")?.value || "";          // "18-24" и т.д.
    const ageShare  = +($("#fAgeShare")?.value || 0);

    const erMin     = parseFloat($("#fErMin")?.value || "");
    const erMax     = parseFloat($("#fErMax")?.value || "");
    const viewsMin  = parseFloat($("#fViewsMin")?.value || "");

    const pMin      = parseFloat($("#fPriceMin")?.value || "");
    const pMax      = parseFloat($("#fPriceMax")?.value || "");

    const lang      = $("#fLang")?.value || "";               // "ru"/"en"
    const country   = $("#fCountry")?.value || "";            // "RU"
    const hasEmail  = !!$("#fHasEmail")?.checked;

    const similarTo = ($("#fSimilarTo")?.value || "").toLowerCase().trim();
    const topER     = !!$("#fTopER")?.checked;

    const sortBy    = $("#fSortBy")?.value || "followers";
    const sortDir   = $("#fSortDir")?.value || "desc";

    // helpers
    const ER   = b => (b.avg_er ?? b.er ?? b.engagement_rate ?? 0);
    const VIEWS= b => (b.avg_views ?? b.views ?? b.avg_views_per_post ?? 0);
    const SUBS = b => (+b.subscribers||+b.followers||+b.follower_count||0);
    const USD  = b => {
      const p = b?.pricing?.integrated ?? b?.price ?? b?.integrated_usd;
      if (p==null) return NaN;
      const cur = (b?.pricing?.currency || b?.currency || "USD").toUpperCase();
      const FX = { USD:1, RUB:0.012, EUR:1.07 };
      return Math.round(+p * (FX[cur] ?? 1));
    };

    if (platform) list = list.filter(b => (b.platform||"") === platform);

    // базовые
    if (cat) list = list.filter(b => (b.category||"").toLowerCase().includes(cat.toLowerCase()));
    if (q)   list = list.filter(b => {
      const hay = [
        (b.name||""),(b.category||""),(b.platform||""),(Array.isArray(b.tags)? b.tags.join(" "):"")
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });

    if (minK) list = list.filter(b => SUBS(b) >= minK*1000);
    if (maxK) list = list.filter(b => SUBS(b) <= maxK*1000);

    // демография/гео
    if (geo) {
      list = list.filter(b => {
        const g = (b.audience_geo || b.geo || b.country || "").toString().toUpperCase();
        if (!g) return false;
        if (geoShare>0) {
          const share = Number(b.audience_geo_share ?? b.geo_share ?? 0);
          return g.includes(geo.toUpperCase()) && share >= geoShare;
        }
        return g.includes(geo.toUpperCase());
      });
    }
    if (gender) {
      list = list.filter(b => {
        const g = (b.audience_gender || "").toLowerCase();
        const share = Number(b.audience_gender_share ?? 0);
        return g === gender && (share >= 60 || share >= ($("#fGender") ? 60 : 0)); // по умолч. 60%
      });
    }
    if (ageBucket) {
      list = list.filter(b => {
        const bkt = (b.audience_age_bucket || "").toString();
        const share = Number(b.audience_age_share ?? 0);
        return bkt === ageBucket && (ageShare ? share >= ageShare : true);
      });
    }

    // метрики
    if (!Number.isNaN(erMin)) list = list.filter(b => ER(b)   >= erMin);
    if (!Number.isNaN(erMax)) list = list.filter(b => ER(b)   <= erMax);
    if (!Number.isNaN(viewsMin)) list = list.filter(b => VIEWS(b) >= viewsMin);

    // цена
    if (!Number.isNaN(pMin)) list = list.filter(b => Number.isNaN(USD(b)) || USD(b) >= pMin);
    if (!Number.isNaN(pMax)) list = list.filter(b => Number.isNaN(USD(b)) || USD(b) <= pMax);

    // язык/страна автора
    if (lang)    list = list.filter(b => (b.language||"").toLowerCase() === lang.toLowerCase());
    if (country) list = list.filter(b => (b.country||"").toUpperCase()   === country.toUpperCase());

    // контакты
    if (hasEmail) list = list.filter(b => !!b.email);

    // AI
    if (similarTo) {
      list = list.filter(b => {
        const arr = (b.ai_similar_to || []);
        const tags= (b.tags || []);
        const hay = [arr.join(" "), tags.join(" "), b.name||"", b.category||""].join(" ").toLowerCase();
        return hay.includes(similarTo);
      });
    }
    if (current.ai){
      const words = current.ai.split(/\s+/).filter(Boolean);
      list = list.filter(b => {
        const hay = [
          (b.name||""),(b.category||""),(b.platform||""),(b.language||""),(b.country||""),
          (b.tags||[]).join(" "), (b.ai_similar_to||[]).join(" ")
        ].join(" ").toLowerCase();
        return words.every(w => hay.includes(w));
      });
    }

    // топ по ER (25%)
    if (topER && list.length>3) {
      const sorted = list.slice().sort((a,b)=> ER(b)-ER(a));
      const cutoff = Math.ceil(sorted.length*0.25);
      const thr = ER(sorted[cutoff-1]);
      list = list.filter(b => ER(b) >= thr);
    }

    // сортировка
    const cmpMap = {
      followers: (a,b)=> SUBS(b)-SUBS(a),
      er:        (a,b)=> ER(b)-ER(a),
      views:     (a,b)=> VIEWS(b)-VIEWS(a),
      price:     (a,b)=> {
        const au=USD(a), bu=USD(b);
        if (Number.isNaN(au) && Number.isNaN(bu)) return 0;
        if (Number.isNaN(au)) return 1;
        if (Number.isNaN(bu)) return -1;
        return bu-au;
      }
    };
    const cmp = cmpMap[sortBy] || cmpMap.followers;
    list.sort(cmp);
    if (sortDir==="asc") list.reverse();

    renderResults(list);
    updateChips();
  }

  // ====== рендер ======
  function renderResults(list){
    const host = $("#resultsList");
    if (!host) return;
    host.innerHTML = "";

    if (!list.length){
      host.innerHTML = `<li class="muted">Ничего не найдено. Уточните фильтры.</li>`;
      updateCounters();
      return;
    }

    list.forEach(b => {
      const el = document.createElement("blogger-card");
      el.data = b;                 // отдаём объект компоненту
      el.setAttribute("selectable",""); // просим показать чекбокс
      host.appendChild(el);
    });

    updateCounters(list.length);
  }

  function updateCounters(len){
    const results = (len ?? $("#resultsList")?.querySelectorAll("blogger-card")?.length ?? 0);
    if ($("#resultsCount")) $("#resultsCount").textContent = results;
    if ($("#pickedCount"))  $("#pickedCount").textContent  = picked.size;
  }

  // ====== чипы ======
  function updateChips(){
    const chips = $("#activeChips");
    if (!chips) return;
    const A = [];
    if ($("#fPlatform")?.value)  A.push(`Платформа: ${$("#fPlatform").value}`);
    if ($("#fCategory")?.value)  A.push(`Категория: ${$("#fCategory").value}`);
    if ($("#followersMinK")?.value) A.push(`Подписчики ≥ ${$("#followersMinK").value}k`);
    if ($("#followersMaxK")?.value) A.push(`Подписчики ≤ ${$("#followersMaxK").value}k`);

    if ($("#fGeo")?.value)       A.push(`Audience geo: ${$("#fGeo").value}${$("#fGeoShare")?.value?` ≥ ${$("#fGeoShare").value}%`:""}`);
    if ($("#fGender")?.value)    A.push(`Audience gender: ${$("#fGender").value}`);
    if ($("#fAgeBucket")?.value) A.push(`Age: ${$("#fAgeBucket").value}${$("#fAgeShare")?.value?` ≥ ${$("#fAgeShare").value}%`:""}`);

    if ($("#fErMin")?.value)     A.push(`ER ≥ ${$("#fErMin").value}%`);
    if ($("#fErMax")?.value)     A.push(`ER ≤ ${$("#fErMax").value}%`);
    if ($("#fViewsMin")?.value)  A.push(`Views ≥ ${$("#fViewsMin").value}`);

    if ($("#fPriceMin")?.value)  A.push(`Цена ≥ $${$("#fPriceMin").value}`);
    if ($("#fPriceMax")?.value)  A.push(`Цена ≤ $${$("#fPriceMax").value}`);

    if ($("#fLang")?.value)      A.push(`Язык: ${$("#fLang").value}`);
    if ($("#fCountry")?.value)   A.push(`Страна: ${$("#fCountry").value}`);
    if ($("#fHasEmail")?.checked)A.push(`Только с email`);

    if ($("#fSimilarTo")?.value) A.push(`Lookalikes: ${$("#fSimilarTo").value}`);
    if ($("#fTopER")?.checked)   A.push(`Top 25% ER`);

    if ($("#fSortBy")?.value)    A.push(`Сорт: ${$("#fSortBy").value} ${$("#fSortDir")?.value==="asc"?"↑":"↓"}`);
    if (current.ai)              A.push(`AI: ${current.ai}`);
    if ($("#fQuery")?.value)     A.push(`Поиск: ${$("#fQuery").value}`);

    chips.innerHTML = A.length ? A.map(x=>`<span class="tag">${x}</span>`).join("") : `<span class="muted">Нет активных фильтров</span>`;
  }
})();
