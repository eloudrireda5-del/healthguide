const { KEY, MODEL, SYSTEM_VERIFY, kimi, parseJson } = require("./api-lib");
module.exports = async function handler(req, res){
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).end(JSON.stringify({error:"POST only"}));
  if (!KEY) return res.status(503).end(JSON.stringify({offline:true}));
  try{
    const { topic, content, lang } = req.body || {};
    const out = parseJson(await kimi(SYSTEM_VERIFY, "الموضوع: " + topic + "\nالمحتوى:\n" + String(content||"").slice(0,3000), lang==="ar"?"العربية":"English"));
    return res.status(200).end(JSON.stringify({...out, model:MODEL}));
  }catch(e){ return res.status(502).end(JSON.stringify({error:String(e.message||e)})); }
};