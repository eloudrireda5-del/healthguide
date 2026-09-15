/* واجهة الاتصال بخادم Kimi — تفشل بهدوء إذا كان التطبيق يعمل بدون خادم */
const API = {
  async call(endpoint, payload){
    try{
      const r = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      if(!r.ok) throw new Error();
      return await r.json();
    }catch(e){ return { offline:true }; }
  },
  ask(q){ return this.call("/api/ask", {question:q, lang:LANG}); },
  verify(topic, content){ return this.call("/api/verify", {topic, content, lang:LANG}); }
};