/* التطبيق — واجهة ودالة عرض لكل شاشة */
let LANG = localStorage.getItem("hg_lang") || "ar";
const T = () => I18N[LANG];
const isAr = () => LANG === "ar";
const L = (obj, field) => obj[field + "_" + LANG] || obj[field + "_en"] || obj[field + "_ar"] || "";
const $ = s => document.querySelector(s);

const App = {
  screen:"home", flowKey:null, step:0, ans:[], foodKey:null, medKey:null, labResults:null,

  setLang(l){ LANG=l; localStorage.setItem("hg_lang",l); this.render(); },
  go(screen, params){ Object.assign(this, {screen, flowKey:null, step:0, ans:[], foodKey:null, medKey:null}, params||{}); this.render(); },

  render(){
    document.documentElement.lang = LANG;
    document.documentElement.dir = isAr() ? "rtl" : "ltr";
    const t = T();
    $("#appName").textContent = t.appName;
    $("#tagline").textContent = t.tagline;
    let h = "";
    if(this.screen==="home") h = this.vHome();
    else if(this.screen==="interview") h = this.vInterview();
    else if(this.screen==="result") h = this.vResult();
    else if(this.screen==="food") h = this.vFood();
    else if(this.screen==="foodDetail") h = this.vFoodDetail();
    else if(this.screen==="meds") h = this.vMeds();
    else if(this.screen==="medDetail") h = this.vMedDetail();
    else if(this.screen==="labs") h = this.vLabs();
    else if(this.screen==="profile") h = this.vProfile();
    else if(this.screen==="ask") h = this.vAsk();
    else if(this.screen==="history") h = this.vHistory();
    $("#view").innerHTML = h;
    this.bind();
    $("#navbar").innerHTML = [["home",t.navHome],["food",t.navFood],["ask",t.navAsk],["meds",t.navMeds],["labs",t.navLabs],["profile",t.navProfile]]
      .map(n=>`<button class="navbtn ${this.screen===n[0]?'on':''}" data-go="${n[0]}">${n[1]}</button>`).join("");
    document.querySelectorAll("#navbar .navbtn").forEach(b=>b.onclick=()=>this.go(b.dataset.go));
  },

  /* ===== الرئيسية ===== */
  vHome(){
    const t = T();
    return `<div class="langbar">${["ar","en","fr","it"].map(l=>`<button class="lang ${l===LANG?'on':''}" data-lang="${l}">${I18N[l].langName}</button>`).join("")}</div>
    <div class="card hero"><h2>${t.startInterview}</h2><p>${t.tagline}</p></div>
    <p class="sec">${t.whatFeeling}</p>
    <div class="grid3">${DB.FLOWS.map(f=>`<button class="sym" data-flow="${f.k}"><span class="ic">${f.icon}</span><b>${L(f,"")|| (isAr()?f.ar:f.en)}</b><small>${isAr()?f.en:f.ar}</small></button>`).join("")}</div>
    <p class="sec">${t.historyTitle}</p>
    <div class="card" id="histPeek">${Store.getHistory().length ? this.histItems(3) : `<p class="muted">${t.noHistory}</p>`}</div>
    <p class="hint">${t.trySafe}</p>
    <p class="disclaimer">${t.disclaimer}</p>`;
  },
  histItems(n){
    return Store.getHistory().slice(0,n).map(h=>`<div class="histrow"><span class="badge ${h.cls}">${T()["tr"+h.level[0].toUpperCase()+h.level.slice(1)]||h.level}</span> ${h.title} <small>${h.date}</small></div>`).join("");
  },

  /* ===== المقابلة ===== */
  vInterview(){
    const t = T(), f = DB.FLOWS.find(x=>x.k===this.flowKey);
    if(!f) return this.vHome();
    if(this.step >= f.qs.length) return this.vResult();
    const q = f.qs[this.step];
    return `<button class="back" data-go="home">‹ ${t.back}</button>
    <h3>${t.interviewTitle} — ${isAr()?f.ar:f.en}</h3>
    <div class="prog"><div style="width:${(this.step/f.qs.length)*100}%"></div></div>
    <p class="muted">${t.question} ${this.step+1} ${t.of} ${f.qs.length}</p>
    <div class="card q"><p>${isAr()?q.ar:q.en}</p>
      <div class="yn"><button class="btn yes" data-a="1">${t.yes}</button><button class="btn no" data-a="0">${t.no}</button></div>
    </div>`;
  },

  /* ===== النتيجة ===== */
  vResult(){
    const t = T(), f = DB.FLOWS.find(x=>x.k===this.flowKey);
    const r = Engine.evalFlow(f, this.ans);
    const tri = Engine.triageText(r.level, t);
    const prof = Store.getProfile();
    const inter = Engine.checkInteractions(prof);
    const fname = isAr()?f.ar:f.en;
    let body="", foodHtml="";
    if(r.level==="emergency"){
      body = `<div class="alert emergency"><b>${isAr()?"احتمال حالة طارئة":"Possible emergency"}</b><p>${isAr()?"أجبت بنعم على علامة إنذار حرجة ("+ (isAr()?r.reds.ar:r.reds.en) +"). اتصل بالإسعاف فورًا ولا تنتظر ولا تقُد السيارة بنفسك.":"You answered YES to a critical red flag ("+(isAr()?r.reds.ar:r.reds.en)+"). Call emergency services now — do not wait or drive yourself."}</p></div>`;
    } else if(r.level==="urgent"){
      body = `<div class="alert urgent"><b>${isAr()?"يحتاج تقييمًا طبيًا سريعًا":"Needs prompt medical assessment"}</b><p>${isAr()?"علامة تنبيه واحدة على الأقل موجودة — راجع طبيبًا أو طوارئ خلال 24 ساعة.":"At least one warning sign is present — see a doctor or ER within 24 hours."}</p></div>`;
    } else {
      const like = {high:t.progHigh, moderate:t.progMod, low:t.progLow}[r.likelihood];
      body = `<p><b>${t.likely}:</b> ${isAr()?f.base.ar:f.base.en} <span class="badge routine">${like}</span></p>
      <p class="muted">${isAr()?f.base_t.ar:f.base_t.en}</p>
      <p class="sec">${t.differential}</p>
      <div class="card">${r.diffs.map((d,i)=>`<div class="diffrow"><span>${i+1}. ${isAr()?d.ar:d.en}</span><span class="badge monitor">${t[d.prog]}</span></div>`).join("")}</div>`;
    }
    if(f.food && r.level!=="emergency"){
      const fd = Engine.personalizeFood(f.food, prof);
      if(fd) foodHtml = `<div class="card"><p class="sec">${t.suitable} / ${t.unsuitable} — ${isAr()?fd.ar:fd.en}</p>
        ${(isAr()?fd.ok_ar:fd.ok_en).map(x=>`<div class="frow ok">✓ ${x}</div>`).join("")}
        ${(isAr()?fd.no_ar:fd.no_en).map(x=>`<div class="frow no">⚠ ${x}</div>`).join("")}
        <p class="note">${t.safetyNote}: ${isAr()?fd.note_ar:fd.note_en}</p></div>`;
    }
    Store.addHistory({level:r.level, cls:tri.cls, title:fname, date:new Date().toLocaleDateString(isAr()?"ar":"en")});
    return `<h3>${t.result} — ${fname}</h3>
    <span class="badge ${tri.cls}">${tri.label}</span>
    ${body}
    <div class="card"><b>${t.specialist}:</b> ${isAr()?f.spec_ar:f.spec_en}</div>
    ${inter.length && r.level!=="emergency" ? `<div class="alert warn">${t.interactionWarn}: ${inter.map(i=>L(i,"")).join(" • ")}</div>`:""}
    ${foodHtml}
    ${r.level==="emergency" ? `<a class="btn emergencybtn" href="tel:911">${t.emergencyBtn}</a>`:""}
    <p class="disclaimer">${t.disclaimer} <br><small>${t.references}</small></p>
    <button class="btn ghost" data-go="home">${t.back}</button>`;
  },

  /* ===== الغذاء ===== */
  vFood(){
    const t = T();
    return `<h3>${t.foodGuide}</h3><p class="muted">${t.foodSub}</p>
    ${DB.FOOD.map(f=>`<button class="listrow" data-food="${f.k}">${isAr()?f.ar:f.en}<span>‹</span></button>`).join("")}
    <p class="hint">${t.foodPersonal}</p>`;
  },
  vFoodDetail(){
    const t = T(), fd = Engine.personalizeFood(this.foodKey, Store.getProfile());
    if(!fd) return this.vFood();
    return `<button class="back" data-go="food">‹ ${t.back}</button><h3>${isAr()?fd.ar:fd.en}</h3>
    <div class="card"><p class="sec ok-c">${t.suitable}</p>${(isAr()?fd.ok_ar:fd.ok_en).map(x=>`<div class="frow ok">✓ ${x}</div>`).join("")}</div>
    <div class="card"><p class="sec no-c">${t.unsuitable}</p>${(isAr()?fd.no_ar:fd.no_en).map(x=>`<div class="frow no">⚠ ${x}</div>`).join("")}</div>
    <div class="notebox">${t.safetyNote}: ${isAr()?fd.note_ar:fd.note_en}</div>
    <button class="btn ghost" id="verifyBtn">${t.verifyBtn}</button><div id="verifyOut"></div>`;
  },

  /* ===== الأدوية ===== */
  vMeds(){
    const t = T();
    return `<h3>${t.medGuide}</h3>
    ${DB.MEDS.map(m=>`<button class="listrow" data-med="${m.name}">${m.name}<span>‹</span></button>`).join("")}`;
  },
  vMedDetail(){
    const t = T(), m = DB.MEDS.find(x=>x.name===this.medKey);
    const li = a=>(isAr()?m[a+"_ar"]:m[a+"_en"]).map(x=>`<div class="frow ok">• ${x}</div>`).join("");
    return `<button class="back" data-go="meds">‹ ${t.back}</button><h3>${m.name}</h3>
    <div class="card"><p class="sec">${t.medPurpose}</p><p>${L(m,"p")}</p></div>
    <div class="card"><p class="sec">${t.medBenefits}</p>${li("b")}</div>
    <div class="card"><p class="sec">${t.medSide}</p>${li("s")}</div>
    <div class="card"><p class="sec no-c">${t.medWarn}</p>${li("w")}</div>
    <div class="notebox">${t.medInteract}: ${L(m,"i")}</div>
    <p class="disclaimer">${T().disclaimer}</p>`;
  },

  /* ===== التحاليل ===== */
  vLabs(){
    const t = T();
    const inputs = DB.LABS.map(l=>`<div class="labrow"><label>${isAr()?l.ar:l.en} <small class="muted">(${l.unit})</small></label><input type="number" step="any" data-lab="${l.k}" placeholder="${l.low}–${l.high}"></div>`).join("");
    const res = this.labResults ? `<div class="card"><p class="sec">${t.interpret}</p>
      ${this.labResults.map(r=>`<div class="labres"><div><b>${isAr()?r.l.ar:r.l.en}</b>: ${r.v} ${r.l.unit} <span class="badge ${r.st==="normal"?"routine":(r.st==="low"?"urgent":"emergency")}">${t[r.st]}</span></div><p class="muted">${r.st==="normal"?(isAr()?"طبيعي — ضمن المعدل.":"Within reference range."):L(r.l,r.st)}</p></div>`).join("")}</div>` : "";
    return `<h3>${t.labTitle}</h3><p class="muted">${t.labSub}</p>
    <p class="hint">${t.uploadHint}</p>
    <div class="card">${inputs}</div>
    <button class="btn" id="runLabs">${t.runAnalysis}</button>${res}
    <p class="disclaimer">${t.disclaimer}</p>`;
  },


  /* ===== اسأل الذكاء الاصطناعي ===== */
  vAsk(){
    const t = T();
    return `<h3>${t.askTitle}</h3><p class="muted">${t.askSub}</p>
    <div class="card"><textarea id="aiq" rows="3" style="width:100%;padding:10px;border:1px solid #cbd4db;border-radius:8px;font:inherit" placeholder="${t.askPh}"></textarea>
    <button class="btn" id="askBtn">${t.askBtn}</button></div>
    <div id="aiOut"></div>`;
  },
  renderAIOut(r){
    const t = T();
    if(r.offline) return `<div class="alert warn">${t.offline}</div>`;
    let h = "";
    if(r.error) return `<div class="alert warn">${r.error}</div>`;
    if(r.redFlags && r.redFlags.length)
      h += `<div class="alert emergency"><b>${t.redFlagTitle}</b>${r.redFlags.map(x=>"<p>• "+x+"</p>").join("")}</div>`;
    h += `<div class="card"><span class="badge routine">✔ ${t.verified}${r.model?" · "+r.model:""}</span><p style="margin-top:8px">${(r.answer||"").replace(/\n/g,"<br>")}</p></div>`;
    if(r.seeDoctor) h += `<div class="notebox"><b>${t.seeDoc}:</b> ${r.seeDoctor}</div>`;
    if(r.sources && r.sources.length)
      h += `<div class="card"><p class="sec">${t.srcs}</p>${r.sources.map(s=>`<div class="frow ok">🔗 <a href="${s.url}" target="_blank" rel="noopener">${s.title||s.url}</a></div>`).join("")}</div>`;
    h += `<p class="disclaimer">${t.disclaimer}</p>`;
    return h;
  },
  /* ===== الملف الشخصي ===== */
  vProfile(){
    const t = T(), p = Store.getProfile();
    const chk = (opts, sel)=>opts.map(o=>`<label class="chk"><input type="checkbox" value="${o.v}" ${(sel||[]).includes(o.v)?"checked":""}> ${isAr()?o.ar:o.en}</label>`).join("");
    return `<h3>${t.profileTitle}</h3>
    <div class="card form">
      <label>${t.name}</label><input id="pname" value="${p.name||""}">
      <label>${t.age}</label><input id="page" type="number" value="${p.age||""}">
      <label>${t.sex}</label><select id="psex"><option value="m" ${p.sex==="m"?"selected":""}>${t.male}</option><option value="f" ${p.sex==="f"?"selected":""}>${t.female}</option></select>
      <label>${t.conditions}</label>${chk(DB.CONDITION_OPTIONS, p.conditions)}
      <label>${t.meds}</label>${chk(DB.MED_OPTIONS, p.meds)}
      <label>${t.allergies}</label><input id="pall" value="${p.allergies||""}" placeholder="Penicillin / فستق...">
      <button class="btn" id="psave">${t.save}</button>
    </div>
    <div id="pAlerts">${this.profileAlerts(p)}</div>
    <p class="disclaimer">${isAr()?"بياناتك محفوظة محليًا على جهازك فقط (localStorage) — في النسخة السحابية ستُشفّر.":"Data stays on your device (localStorage) — the cloud version will encrypt it."}</p>`;
  },
  profileAlerts(p){
    const inter = Engine.checkInteractions(p);
    if(!inter.length) return "";
    return `<div class="alert warn"><b>${T().interactionWarn}</b>${inter.map(i=>`<p>• ${L(i,"")}</p>`).join("")}</div>`;
  },

  /* ===== السجل ===== */
  vHistory(){
    const t = T(), h = Store.getHistory();
    return `<h3>${t.historyTitle}</h3>
    ${h.length ? h.map(x=>`<div class="histrow"><span class="badge ${x.cls}">${x.level}</span> ${x.title} <small>${x.date}</small></div>`).join("") : `<div class="card"><p class="muted">${t.noHistory}</p></div>`}`;
  },

  /* ===== ربط الأحداث ===== */
  bind(){
    document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>this.setLang(b.dataset.lang));
    document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>this.go(b.dataset.go));
    document.querySelectorAll("[data-flow]").forEach(b=>b.onclick=()=>this.go("interview",{flowKey:b.dataset.flow}));
    document.querySelectorAll("[data-food]").forEach(b=>b.onclick=()=>this.go("foodDetail",{foodKey:b.dataset.food}));
    document.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>this.go("medDetail",{medKey:b.dataset.med}));
    document.querySelectorAll(".q .btn").forEach(b=>b.onclick=()=>{ this.ans.push(b.dataset.a==="1"); this.step++; this.render(); });
    const run = $("#runLabs");
    if(run) run.onclick = ()=>{
      const vals = {};
      document.querySelectorAll("[data-lab]").forEach(i=>{ if(i.value!=="") vals[i.dataset.lab]=i.value; });
      this.labResults = Engine.analyzeLabs(vals); this.render(); window.scrollTo(0,0);
    };
    const vb = $("#verifyBtn");
    if(vb) vb.onclick = async ()=>{
      const fd2 = Engine.personalizeFood(this.foodKey, Store.getProfile());
      $("#verifyOut").innerHTML = '<div class="card muted">' + T().verifying + "</div>";
      const r = await API.verify(isAr()?fd2.ar:fd2.en, JSON.stringify({ok:isAr()?fd2.ok_ar:fd2.ok_en, avoid:isAr()?fd2.no_ar:fd2.no_en, note:isAr()?fd2.note_ar:fd2.note_en}));
      if(r.offline || r.error){ $("#verifyOut").innerHTML = '<div class="alert warn">' + (r.error||T().offline) + "</div>"; return; }
      $("#verifyOut").innerHTML = '<div class="alert ' + (r.verified?"urgent":"emergency") + '"><b>' + (r.verified?T().verifiedOk:T().verifiedNo) + '</b><p>' + (r.notes||"") + "</p>" +
        (r.sources&&r.sources.length ? '<p class="sec">' + T().srcs + "</p>" + r.sources.map(x=>'<div class="frow ok">🔗 <a href="'+x.url+'" target="_blank" rel="noopener">'+(x.title||x.url)+"</a></div>").join(""):"") + "</div>";
    };
    const ab = $("#askBtn");
    if(ab) ab.onclick = async ()=>{
      const q = $("#aiq").value.trim(); if(!q) return;
      $("#aiOut").innerHTML = '<div class="card muted">' + T().thinking + "</div>";
      const r = await API.ask(q);
      $("#aiOut").innerHTML = this.renderAIOut(r);
    };
    const ps = $("#psave");
    if(ps) ps.onclick = ()=>{
      const get = id=>document.querySelector(id);
      const checks = sel=>[...document.querySelectorAll(sel+":checked")].map(c=>c.value);
      Store.saveProfile({ name:get("#pname").value, age:get("#page").value, sex:get("#psex").value,
        conditions:checks('#view .form input[type=checkbox]'), meds:checks('#view .form input[type=checkbox]'),
        allergies:get("#pall").value });
      /* فصل الحقول: الأدوية والأمراض لها نفس نوع الحقل — أعد التقاطها بعناوين */
      const boxes = document.querySelectorAll('#view .form label.chk');
      const conds=[], meds=[];
      DB.CONDITION_OPTIONS.forEach(o=>{ const c=document.querySelector(`#view .form input[value="${o.v}"]`); if(c&&c.checked) conds.push(o.v); });
      DB.MED_OPTIONS.forEach(o=>{ const c=document.querySelector(`#view .form input[value="${o.v}"]`); if(c&&c.checked) meds.push(o.v); });
      Store.saveProfile({ name:get("#pname").value, age:get("#page").value, sex:get("#psex").value,
        conditions:conds, meds:meds, allergies:get("#pall").value });
      $("#pAlerts").innerHTML = this.profileAlerts(Store.getProfile());
      alert(T().save + " ✓");
    };
  }
};

document.addEventListener("DOMContentLoaded", ()=>App.render());