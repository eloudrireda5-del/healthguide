/* محرك الفرز والسلامة — منطق حتمي قابل للاختبار، مستقل عن الواجهة */
const Engine = {

  /* تقييم مسار مقابلة: علامات حمراء أولًا، ثم ترتيب الاحتمالات */
  evalFlow(flow, answers){
    for(let i=0;i<flow.qs.length;i++){
      if(answers[i] && flow.qs[i].red === "emergency"){
        return {level:"emergency", reds:flow.qs[i]};
      }
    }
    for(let i=0;i<flow.qs.length;i++){
      if(answers[i] && flow.qs[i].red === "urgent"){
        return {level:"urgent", reds:flow.qs[i]};
      }
    }
    const yes = answers.filter(Boolean).length;
    const half = Math.ceil(flow.qs.length/2);
    const likelihood = yes >= half ? "high" : (yes >= 1 ? "moderate" : "low");
    const diffs = [...flow.diff].sort((a,b)=>b.w-a.w).map(d=>({...d, prog: d.w>=1?"progHigh":(d.w>=0.5?"progMod":"progLow")}));
    return {level:"routine", likelihood, diffs};
  },

  /* مستوى الفرز النهائي للعرض */
  triageText(level, t){
    if(level==="emergency") return {label:t.trEmergency, cls:"emergency"};
    if(level==="urgent")    return {label:t.trUrgent, cls:"urgent"};
    return {label:t.trRoutine, cls:"routine"};
  },

  /* فحص تعارضات الأدوية-الأغذية بناءً على ملف المستخدم */
  checkInteractions(profile){
    const meds = (profile.meds||[]).map(m=>m.toLowerCase());
    return DB.INTERACTIONS.filter(x => x.med && meds.includes(x.med));
  },

  /* تحليل قيم المختبر */
  analyzeLabs(values){
    return DB.LABS.map(l=>{
      const v = parseFloat(values[l.k]);
      if(isNaN(v)) return {l, v:null, st:null};
      let st = "normal";
      if(v < l.low) st = "low";
      else if(v > l.high) st = "high";
      return {l, v, st};
    }).filter(r => r.v !== null);
  },

  /* تخصيص النصائح الغذائية حسب ملف المستخدم (مثال: الكلى والبوتاسيوم) */
  personalizeFood(foodKey, profile){
    const f = DB.FOOD.find(x=>x.k===foodKey);
    if(!f) return null;
    const hasCKD = (profile.conditions||[]).includes("ckd");
    const out = {ar:f.ar, en:f.en, note_ar:f.note_ar, note_en:f.note_en,
                 ok_ar:[...f.ok_ar], no_ar:[...f.no_ar], ok_en:[...f.ok_en], no_en:[...f.no_en]};
    if(hasCKD){
      const warn = {ar:"⚠️ لديك مرض كلى مزمن: تم تطبيق قواعد خاصة — خفّض البوتاسيوم والملح وبروتينك حسب خطة طبيبك فقط.",
                    en:"⚠️ You have CKD: special rules applied — follow your doctor's plan on potassium, salt and protein."};
      out.note_ar = warn.ar + " — " + out.note_ar;
      out.note_en = warn.en + " — " + out.note_en;
      out.ok_ar = out.ok_ar.filter(x=>!/موز|بطاطس/.test(x));
    }
    return out;
  }
};

/* التخزين المحلي للملف والسجل */
const Store = {
  getProfile(){ try{ return JSON.parse(localStorage.getItem("hg_profile")) || {}; }catch(e){ return {}; } },
  saveProfile(p){ localStorage.setItem("hg_profile", JSON.stringify(p)); },
  getHistory(){ try{ return JSON.parse(localStorage.getItem("hg_history")) || []; }catch(e){ return []; } },
  addHistory(item){
    const h = Store.getHistory(); h.unshift(item);
    localStorage.setItem("hg_history", JSON.stringify(h.slice(0,50)));
  }
};