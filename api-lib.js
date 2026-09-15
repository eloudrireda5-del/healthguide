/* مكتبة مشتركة لواجهات Kimi على Vercel Serverless */
const KEY = process.env.MOONSHOT_API_KEY || "";
const MODEL = process.env.KIMI_MODEL || "moonshot-v1-8k";

const SYSTEM = `أنت مدقق طبي مسؤول داخل تطبيق "مُرشدك الصحي".
قواعد إلزامية:
1) افحص سؤال المستخدم بحثًا عن علامات خطر طارئة (ألم صدر، ضيق نفس، شلل، فقدان وعي، نزيف شديد...) — إن وُجدت ضعها في redFlags فورًا.
2) أجب بتثقيف طبي موجز ودقيق، ولا تجزم بتشخيص أبدًا، واختم بتوصية تقييم طبي عند الحاجة.
3) تحقق عبر بحث الويب المدمج واذكر مصادر موثوقة حديثة في sources.
4) أعد JSON صالحًا فقط: {"redFlags":["..."],"answer":"...","sources":[{"title":"...","url":"..."}],"seeDoctor":"..."}`;

const SYSTEM_VERIFY = `أنت مدقق محتوى طبي. تحقق من المعلومة المُرسلة مقابل أحدث الإرشادات عبر بحث الويب المدمج.
أعد JSON فقط: {"verified":true|false,"notes":"...","sources":[{"title":"...","url":"..."}]}`;

async function kimi(system, user, lang){
  const body = { model: MODEL, temperature: 0.2,
    messages: [{role:"system", content: system}, {role:"user", content: user + "\n\nاللغة المطلوبة: " + lang}] };
  if (MODEL.includes("kimi-k2")) body.tools = [{type:"builtin_function", function:{name:"$web_search"}}];
  const r = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Authorization:"Bearer " + KEY },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("Kimi API " + r.status);
  const j = await r.json();
  return j.choices[0].message.content;
}
function parseJson(t){ const m = t.match(/\{[\s\S]*\}/); try{ return JSON.parse(m ? m[0] : t); }catch(e){ return { answer: t, sources: [] }; } }

module.exports = { KEY, MODEL, SYSTEM, SYSTEM_VERIFY, kimi, parseJson };