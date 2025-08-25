// /api/ai-brief.js — серверный эндпоинт для анализа брифа
// Требует переменную окружения OPENAI_API_KEY
//
// Развёртывание: Vercel / Netlify / Cloudflare Workers (адаптируйте fetch)
// Ответ строго в JSON, структура согласована с клиентом.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok:false, error:"Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Без ключа — используем тот же оффлайн-резерв что и на клиенте,
    // чтобы поведение было стабильным (минимальный дублирующий код).
    try{
      const body = await readJSON(req);
      const result = fallbackAnalyze(body.brief || {});
      return res.status(200).json({ ok:true, result: { ...result, source: "server-fallback" } });
    }catch(e){
      return res.status(200).json({ ok:true, result: fallbackAnalyze({}) });
    }
  }

  try{
    const body = await readJSON(req);
    const brief = body?.brief || {};
    const system = [
      "Ты — продюсер креативных интеграций и стратег по инфлюенсер-маркетингу.",
      "Проанализируй бриф, найди пробелы, предложи улучшения, идеи и форматы.",
      "Отвечай СТРОГО в JSON по схеме {score, issues[], questions[], suggestions[], ideas[], formats[]}.",
      "score — целое 0..100."
    ].join(" ");

    const user = JSON.stringify({
      brief,
      required_schema: { score: "int(0..100)", issues: "string[]", questions: "string[]", suggestions: "string[]", ideas: "string[]", formats: "string[]" }
    });

    // Chat Completions (gpt-4o-mini) — оптимальная цена/скорость
    // Рекомендация модели упоминается в официальных best practices. :contentReference[oaicite:0]{index=0}
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(()=> "");
      // Мягкий даунгрейд: сервер вернёт оффлайн-резерв вместо 5xx
      const fb = fallbackAnalyze(brief);
      return res.status(200).json({ ok:true, result: { ...fb, source: `api-fallback (${r.status})`, error: text.slice(0,200) } });
    }

    const data = await r.json();
    let parsed;
    try{
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    }catch{
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") {
      const fb = fallbackAnalyze(brief);
      return res.status(200).json({ ok:true, result: { ...fb, source:"parse-fallback" } });
    }

    // Нормализация
    const result = {
      score: clampNum(parsed.score, 0, 100, 60),
      issues: arr(parsed.issues),
      questions: arr(parsed.questions),
      suggestions: arr(parsed.suggestions),
      ideas: arr(parsed.ideas),
      formats: arr(parsed.formats),
      source: "openai"
    };

    // Короткий клиентский кэш можно дополнительно усилить CDN-заголовками
    res.setHeader("Cache-Control", "public, max-age=60"); // 1 мин как подсказка
    return res.status(200).json({ ok:true, result });
  } catch (e) {
    const fb = fallbackAnalyze({});
    return res.status(200).json({ ok:true, result: { ...fb, source:"server-error", error: String(e).slice(0,200) } });
  }
}

/* ----------------- helpers ----------------- */
async function readJSON(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw||"{}"); } catch { return {}; }
}
function clampNum(n, min, max, def=0){
  const x = Number(n); if (!Number.isFinite(x)) return def;
  return Math.max(min, Math.min(max, Math.round(x)));
}
function arr(a){ return Array.isArray(a) ? a.map(x=>String(x||"").trim()).filter(Boolean) : []; }

/** Тот же резерв, что и на клиенте — краткая версия */
function fallbackAnalyze(brief){
  const goal = (brief.goal||"").trim();
  const budget = +brief.budget||0;
  const deadline = (brief.deadline||"").trim();

  const issues = [];
  if (!goal) issues.push("Не указана цель кампании.");
  if (!budget) issues.push("Не указан бюджет (₽).");
  if (!deadline) issues.push("Не указан дедлайн.");

  const suggestions = [
    "Добавьте портрет ЦА: возраст, гео, интересы, боли.",
    "Пропишите чёткий CTA и посадочную (UTM/промокод).",
    "Определите KPI: CPA/CPL/ROAS, просмотры, CTR."
  ];
  const ideas = [
    "Челлендж 7-дневного использования продукта",
    "Кейс «до/после» с честной методологией",
    "Серия коротких UGC-отзывов"
  ];
  const formats = ["Интеграция 60–90 сек", "3×Shorts/Reels", "Стрим/AMA 20–40 мин"];

  let score = 50; if (goal) score += 20; if (budget) score += 15; if (deadline) score += 10;

  return { score: Math.max(0, Math.min(100, score)), issues, questions: [
    "Кто ЦА и какой ключевой инсайт?",
    "Какой CTA и куда ведём трафик?",
    "Какие KPI и ограничения по креативам?"
  ], suggestions, ideas, formats };
}
