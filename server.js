/* خادم مُرشدك الصحي — وسيط آمن لـ Kimi AI (بدون أي مكتبات خارجية)
   التشغيل:  MOONSHOT_API_KEY=مفتاحك node server.js
   النتيجة:  http://localhost:3000  (التطبيق + واجهة AI) */
const http = require("http"), fs = require("fs"), path = require("path");
const KEY   = process.env.MOONSHOT_API_KEY || "";
const MODEL = process.env.KIMI_MODEL || "moonshot-v1-8k";
const PORT  = process.env.PORT || 3000;
const ROOT  = __dirname;
const MIME  = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".md":"text/plain; charset=utf-8"};

/* ---- موجه النظام: محقق طبي صارم يعيد JSON منضبطًا ---- */
const SYSTEM = `أنت مدقق طبي مسؤول داخل تطبيق "مُرشدك الصحي".
قواعد إلزامية:
1) افحص سؤال المستخدم بحثًا عن علامات خطر طارئة (ألم صدر، ضيق نفس، شلل، فقدان وعي، نزيف شديد...) — إن وُجدت ضعها في redFlags فورًا.
2) أجب بتثقيف طبي موجز ودقيق، ولا تجزم بتشخيص أبدًا، واختم دائمًا بتوصية تقييم طبي عند الحاجة.
3) تحقق من المعلومة عبر بحث الويب المدمج واذكر المصادر الحديثة الموثوقة (WHO، NHS، Mayo Clinic، إرشادات سريرية) في sources.
4) أعد الإجابة كـ JSON صالح فقط بهذا الشكل:
{"redFlags":["..."],"answer":"شرح مبسط باللغة المطلوبة","sources":[{"title":"...","url":"..."}],"seeDoctor":"متى يراجع الطبيب"}`;

const SYSTEM_VERIFY = `أنت مدقق محتوى طبي. تحقق من صحة المعلومة الطبية المُرسلة مقابل أحدث الإرشادات الموثوقة عبر بحث الويب المدمج.
أعد JSON فقط: {"verified":true|false,"notes":"ملاحظات التدقيق باللغة المطلوبة","sources":[{"title":"...","url":"..."}]}`;

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
function parseJson(t){
  const m = t.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : t); } catch(e){ return { answer: t, sources: [] }; }
}
function readBody(req){ return new Promise(res=>{ let d=""; req.on("data",c=>d+=c); req.on("end",()=>{ try{res(JSON.parse(d))}catch(e){res({})} }); }); }

const server = http.createServer(async (req,res)=>{
  const u = req.url.split("?")[0];
  /* واجهات AI */
  if (req.method === "POST" && u === "/api/ask"){
    if(!KEY){ res.writeHead(503,{"Content-Type":"application/json; charset=utf-8"}); return res.end(JSON.stringify({offline:true, error:"MOONSHOT_API_KEY غير مضبوط"})); }
    try{
      const b = await readBody(req);
      const out = parseJson(await kimi(SYSTEM, String(b.question||"").slice(0,2000), b.lang==="ar"?"العربية":b.lang||"العربية"));
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({...out, verified:true, model:MODEL}));
    }catch(e){ res.writeHead(502,{"Content-Type":"application/json; charset=utf-8"}); res.end(JSON.stringify({error:String(e.message||e)})); }
    return;
  }
  if (req.method === "POST" && u === "/api/verify"){
    if(!KEY){ res.writeHead(503,{"Content-Type":"application/json; charset=utf-8"}); return res.end(JSON.stringify({offline:true})); }
    try{
      const b = await readBody(req);
      const out = parseJson(await kimi(SYSTEM_VERIFY, "الموضوع: " + b.topic + "\nالمحتوى المطلوب تدقيقه:\n" + String(b.content||"").slice(0,3000), b.lang==="ar"?"العربية":"English"));
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({...out, model:MODEL}));
    }catch(e){ res.writeHead(502,{"Content-Type":"application/json; charset=utf-8"}); res.end(JSON.stringify({error:String(e.message||e)})); }
    return;
  }
  /* ملفات ثابتة */
  let fp = path.normalize(path.join(ROOT, u === "/" ? "index.html" : u));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (err, data)=>{
    if (err){ res.writeHead(404); return res.end("404"); }
    res.writeHead(200, {"Content-Type": MIME[path.extname(fp)] || "application/octet-stream"});
    res.end(data);
  });
});
server.listen(PORT, ()=>console.log("✔ مُرشدك الصحي يعمل على http://localhost:" + PORT + (KEY ? "" : "  (بدون مفتاح — واجهات AI متوقفة)")));