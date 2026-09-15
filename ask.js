const { KEY, MODEL, SYSTEM, kimi, parseJson } = require("./api-lib");
module.exports = async function handler(req, res){
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).end(JSON.stringify({error:"POST only"}));
  if (!KEY) return res.status(503).end(JSON.stringify({offline:true, error:"MOONSHOT_API_KEY غير مضبوط في Vercel Environment Variables"}));
  try{
    const { question, lang } = req.body || {};
    const out = parseJson(await kimi(SYSTEM, String(question||"").slice(0,2000), lang==="ar"?"العربية":lang||"العربية"));
    return res.status(200).end(JSON.stringify({...out, verified:true, model:MODEL}));
  }catch(e){ return res.status(502).end(JSON.stringify({error:String(e.message||e)})); }
};