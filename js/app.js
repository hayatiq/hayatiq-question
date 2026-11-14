/*
 * UI: renders the three tabs from QUESTIONNAIRE / PLAN / ROADMAP, saves every change,
 * and links questions and plan items both ways. Links are hashes:
 *   #q/<sectionId>/<questionId>   #plan/<planSectionId>/<itemId>   #road
 */
const index = indexQuestions(QUESTIONNAIRE, PRODUCT_FIELDS);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sectionById = Object.fromEntries(QUESTIONNAIRE.sections.map((s) => [s.id, s]));
const planSectionOf = {};
const planItemById = {};
for (const s of PLAN.sections) for (const i of s.items) { planSectionOf[i.id] = s; planItemById[i.id] = i; }

/* ---------- storage ---------- */

let store;
{
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) {}
  const parsed = parseStore(raw);
  store = parsed.store;
  if (parsed.corrupt) {
    // Keep the unreadable copy instead of overwriting it.
    try { localStorage.setItem(`${STORE_KEY}:unreadable-${Date.now()}`, parsed.corrupt); } catch (e) {}
    setTimeout(() => toast("Some saved answers could not be read. A copy was kept."), 500);
  }
}

let saveTimer = null;
function scheduleSave() {
  setSaveState("busy", "Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 350);
}
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  store.savedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    setSaveState("", "Saved ✓");
  } catch (e) {
    setSaveState("err", "Not saved!");
    toast("This browser did not save. Please download your answers now.");
  }
}
function setSaveState(cls, text) {
  const el = $("saveState");
  el.className = `save ${cls}`;
  el.textContent = text;
}
addEventListener("pagehide", () => saveTimer && saveNow());
document.addEventListener("visibilitychange", () => document.hidden && saveTimer && saveNow());

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---------- links between questions and plan items (many to many) ---------- */

// A question named by a plan item links back to it. A plan item that names a whole section
// links back only from questions that no item names directly, so a card shows at most 2 links.
const planLinksOfQuestion = {};
const sectionLinks = {};
for (const s of PLAN.sections) {
  for (const item of s.items) {
    const link = { sec: s.id, item: item.id, title: item.title };
    for (const qid of item.questions || []) {
      if (!index.byId[qid]) { console.warn(`Plan item ${item.id} links to a missing question: ${qid}`); continue; }
      (planLinksOfQuestion[qid] = planLinksOfQuestion[qid] || []).push(link);
    }
    for (const secId of item.sections || []) (sectionLinks[secId] = sectionLinks[secId] || []).push(link);
  }
}
for (const q of index.list) if (!planLinksOfQuestion[q.id] && sectionLinks[q.sectionId]) planLinksOfQuestion[q.id] = sectionLinks[q.sectionId];
const qHash = (q) => `#q/${q.sectionId}/${q.id}`;
const itemHash = (itemId) => `#plan/${planSectionOf[itemId].id}/${itemId}`;

/* ---------- Questions tab ---------- */

function optionRow(q, o, checked, a, older) {
  const multi = q.type === "multi";
  const notePh = o.note || q.optionNotes;
  const noteVal = (a && a.optNotes && a.optNotes[o.id]) || "";
  return `<label class="opt${older ? " older" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="r-${esc(q.id)}" value="${esc(o.id)}" data-k="v"${checked ? " checked" : ""}><span>${esc(o.label)}</span></label>` +
    (notePh ? `<input type="text" class="in opt-note" data-k="opt" data-opt="${esc(o.id)}" placeholder="${esc(notePh)}" value="${esc(noteVal)}" aria-label="${esc(`${o.label}: ${notePh}`)}"${checked ? "" : " hidden"}>` : "");
}

function control(q, a) {
  const v = a ? a.v : "";
  const labelled = `aria-labelledby="ql-${esc(q.id)}"`;
  if (q.type === "text") return `<input type="text" class="in" data-k="v" value="${esc(v)}" placeholder="${esc(q.placeholder || "")}" ${labelled}>`;
  if (q.type === "number") return `<input type="text" inputmode="decimal" class="in" data-k="v" value="${esc(v)}" placeholder="${esc(q.placeholder || "")}" ${labelled}>`;
  if (q.type === "longtext") return `<textarea class="in" data-k="v" rows="3" placeholder="${esc(q.placeholder || "")}" ${labelled}>${esc(v)}</textarea>`;
  const sel = selectedIds(a);
  const older = olderChoices(q, a);
  let html = `<div class="opts" role="group" ${labelled}>`;
  html += optionsOf(q).map((o) => optionRow(q, o, sel.includes(o.id), a, false)).join("");
  if (q.type === "multi") {
    html += older.map((id) => optionRow(q, { id, label: `${(a.labels && a.labels[id]) || id} (older choice)` }, true, a, true)).join("");
  }
  html += "</div>";
  if (q.type !== "multi" && older.length) {
    html = `<p class="older-warn">Your earlier answer “${esc((a.labels && a.labels[older[0]]) || older[0])}” is no longer one of the choices. It is kept until you pick another one.</p>` + html;
  }
  if (q.type !== "multi") html += `<button type="button" class="linkbtn quiet clear-btn"${sel.length ? "" : " hidden"}>Clear my answer</button>`;
  return html;
}

function questionCard(q) {
  const a = store.answers[q.id];
  const note = (a && a.note) || "";
  const links = (planLinksOfQuestion[q.id] || []).slice(0, 2);
  const linkHtml = links.map((l) =>
    `<a class="xlink" href="${itemHash(l.item)}" data-back="${qHash(q)}" data-back-title="${esc(q.label)}">View why we need this →${links.length > 1 ? ` <small>${esc(l.title)}</small>` : ""}</a>`).join("");
  return `<div class="q" id="q-${esc(q.id)}" data-qid="${esc(q.id)}" tabindex="-1">
    <div class="q-head"><span class="q-label" id="ql-${esc(q.id)}">${esc(q.label)}</span><span class="chip ${q.required ? "need" : "optional"}">${q.required ? "Needed" : "Optional"}</span></div>
    ${q.help ? `<p class="help">${esc(q.help)}</p>` : ""}
    ${control(q, a)}
    <div class="note-box">
      <button type="button" class="linkbtn add-note"${note ? " hidden" : ""}>+ Add a note</button>
      <textarea class="in note" data-k="note" rows="2" placeholder="Your note (optional)" aria-label="Note for: ${esc(q.label)}"${note ? "" : " hidden"}>${esc(note)}</textarea>
    </div>
    ${linkHtml ? `<div class="links">${linkHtml}</div>` : ""}
  </div>`;
}

function productBlock(section, p) {
  const qs = index.list.filter((q) => q.productId === p.id);
  const needed = qs.filter((q) => q.required);
  const more = qs.filter((q) => !q.required);
  return `<details class="prod" id="prod-${esc(p.id)}" name="prod">
    <summary><span>${esc(p.name)}</span><br><span class="pill" data-progress-prod="${esc(p.id)}"></span></summary>
    <div class="prod-body">
      <p class="prod-now"><b>On the website now:</b> ${esc(p.now)}</p>
      ${needed.map(questionCard).join("")}
      <details class="more" id="more-${esc(p.id)}"><summary>More details (optional)</summary>${more.map(questionCard).join("")}</details>
    </div>
  </details>`;
}

function renderQuestions() {
  const secs = QUESTIONNAIRE.sections;
  $("tab-q").innerHTML = `
    <div class="card intro">
      <h2>Hello! 👋</h2>
      <p>These questions help us improve the HAYATIQ website. You know the products and customers best.</p>
      <p class="muted">Answer what you know. Skip what you don't. You can add a note to any question. Everything saves on this phone by itself.</p>
      <div class="bar" aria-hidden="true"><i id="progBar"></i></div>
      <p class="small muted" id="progText"></p>
      <div class="chips"><span class="chip need">Needed</span><span class="chip optional">Optional</span><span class="small muted">Tap a topic to open it.</span></div>
    </div>
    ${secs.map((s, i) => `
      <details class="sec" id="qs-${esc(s.id)}" name="qsec">
        <summary><span class="sum-title">${i + 1}. ${esc(s.title)}</span><span class="pill" data-progress-sec="${esc(s.id)}"></span></summary>
        <div class="sec-body">
          <p class="sec-intro"><b>Why we ask:</b> ${esc(s.intro)}</p>
          ${s.products ? s.products.map((p) => productBlock(s, p)).join("") : sectionQuestions(s, PRODUCT_FIELDS).map((q) => questionCard(index.byId[q.id])).join("")}
          ${i < secs.length - 1 ? `<button type="button" class="btn ghost next-btn" data-next="${esc(secs[i + 1].id)}">Next: ${esc(secs[i + 1].title)} →</button>` : `<p class="muted">That's the last topic. Thank you! Please send your answers below.</p>`}
        </div>
      </details>`).join("")}
    <div class="card" id="sendCard">
      <h3 style="margin:0">Send your answers</h3>
      <p class="muted small">Download a file and send it to us on WhatsApp or Messenger. If a download doesn't work in this app, use “Copy as text” and paste it into a message.</p>
      <div class="btn-row">
        <button type="button" class="btn" id="expXlsx">Excel file</button>
        <button type="button" class="btn ghost" id="expTxt">Text file</button>
        <button type="button" class="btn ghost" id="expCopy">Copy as text</button>
        <button type="button" class="btn ghost" id="expShare" hidden>Share…</button>
      </div>
      <details class="more"><summary>Backup and restore</summary>
        <p class="muted small">Answers stay only in this browser on this phone. Some phones clear saved data from websites that aren't opened for a while, so download a backup now and then. A backup can also move your answers to another phone.</p>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="backupBtn">Download backup</button>
          <label class="btn ghost" for="restoreFile">Restore backup</label>
          <input type="file" id="restoreFile" accept=".json,application/json" hidden>
        </div>
      </details>
    </div>`;
  const orphans = orphanAnswers(store, index.byId);
  if (orphans.length) {
    $("sendCard").insertAdjacentHTML("beforebegin", `<p class="card muted small">${orphans.length} earlier answer(s) belong to questions we have since removed or changed. They are kept and included in your exports.</p>`);
  }
  if (navigator.share) $("expShare").hidden = false;
  refreshStatus();
}

// Show/hide conditional questions and update every progress label.
function refreshStatus() {
  for (const q of index.list) {
    const card = document.getElementById(`q-${q.id}`);
    if (!card) continue;
    const st = statusOf(q, store, index.byId);
    card.hidden = st === "hidden";
    card.dataset.status = st;
  }
  const label = (list, el) => {
    if (!el) return;
    const p = progress(list, store, index.byId);
    const done = p.needed ? p.neededDone === p.needed : p.done > 0;
    el.textContent = p.needed ? `${p.neededDone} of ${p.needed} needed${done ? " ✓" : ""}` : p.done ? `${p.done} answered ✓` : "Optional";
    el.classList.toggle("done", done);
  };
  for (const s of QUESTIONNAIRE.sections) {
    const el = document.querySelector(`[data-progress-sec="${s.id}"]`);
    if (!s.products) {
      label(index.list.filter((q) => q.sectionId === s.id), el);
      continue;
    }
    let started = 0;
    for (const p of s.products) {
      const list = index.list.filter((q) => q.productId === p.id);
      label(list, document.querySelector(`[data-progress-prod="${p.id}"]`));
      if (progress(list, store, index.byId).done) started++;
    }
    // A big "0 of 77" would scare; count products instead.
    el.textContent = `${started} of ${s.products.length} products started`;
    el.classList.toggle("done", started === s.products.length);
  }
  const all = progress(index.list, store, index.byId);
  const pct = all.needed ? Math.round((all.neededDone / all.needed) * 100) : 0;
  $("progBar").style.width = `${pct}%`;
  $("progText").textContent = all.done ? `${pct}% of the needed answers done · ${all.done} answers so far` : "Nothing answered yet. Start with topic 1.";
}

function onQuestionInput(e) {
  const el = e.target;
  const k = el.dataset && el.dataset.k;
  const card = el.closest && el.closest(".q");
  if (!k || !card) return;
  if (e.type === "input" && (el.type === "checkbox" || el.type === "radio")) return; // handled on "change"
  const q = index.byId[card.dataset.qid];
  const a = store.answers[q.id] || {};
  let patch;
  if (k === "note") patch = { note: el.value };
  else if (k === "opt") patch = { optNotes: { ...(a.optNotes || {}), [el.dataset.opt]: el.value } };
  else if (el.type === "checkbox") patch = { v: [...card.querySelectorAll('input[type=checkbox][data-k="v"]:checked')].map((i) => i.value) };
  else if (el.type === "radio") patch = { v: el.value };
  else patch = { v: el.value };
  setAnswer(store, q, patch, QUESTIONNAIRE.version);
  if (el.type === "checkbox" || el.type === "radio") syncOptionNotes(card);
  if (el.type === "radio") {
    const warn = card.querySelector(".older-warn");
    if (warn) warn.remove();
    card.querySelector(".clear-btn").hidden = false;
  }
  scheduleSave();
  refreshStatus();
}

function syncOptionNotes(card) {
  for (const n of card.querySelectorAll(".opt-note")) {
    const box = card.querySelector(`input[data-k="v"][value="${CSS.escape(n.dataset.opt)}"]`);
    n.hidden = !(box && box.checked);
  }
}

function onQuestionClick(e) {
  const t = e.target;
  if (t.classList.contains("add-note")) {
    t.hidden = true;
    const ta = t.nextElementSibling;
    ta.hidden = false;
    ta.focus();
  } else if (t.classList.contains("clear-btn")) {
    const card = t.closest(".q");
    const q = index.byId[card.dataset.qid];
    for (const r of card.querySelectorAll('input[data-k="v"]')) r.checked = false;
    const warn = card.querySelector(".older-warn");
    if (warn) warn.remove();
    setAnswer(store, q, { v: "" }, QUESTIONNAIRE.version);
    syncOptionNotes(card);
    t.hidden = true;
    scheduleSave();
    refreshStatus();
  } else if (t.dataset.next) {
    goTo(`#q/${t.dataset.next}`, { push: false });
  }
}

/* ---------- Plan tab ---------- */

const EVIDENCE = { checked: "We checked this", research: "Research finding", hypothesis: "AI research hypothesis" };

function questionLinks(item) {
  const back = itemHash(item.id);
  const out = [];
  for (const secId of item.sections || []) {
    const s = sectionById[secId];
    if (s) out.push(`<a class="xlink" href="#q/${esc(secId)}" data-back="${back}" data-back-title="${esc(item.title)}">Go to questions: ${esc(s.title)} →</a>`);
  }
  for (const qid of item.questions || []) {
    const q = index.byId[qid];
    if (!q) continue;
    const name = q.productName ? `${q.productName}: ${q.label}` : q.label;
    out.push(`<a class="xlink" href="${qHash(q)}" data-back="${back}" data-back-title="${esc(item.title)}">Answer related question → <small>${esc(name)}</small></a>`);
  }
  return out.join("");
}

function planItem(item) {
  const b = [];
  if (item.now) b.push(`<p class="kv"><b>Today:</b> ${esc(item.now)}</p>`);
  if (item.found) b.push(`<div class="block"><span class="chip ev-${item.evidence || "checked"}">${EVIDENCE[item.evidence || "checked"]}</span><p>${esc(item.found)}</p></div>`);
  if (item.plan) b.push(`<div class="box plan"><span class="chip c-plan">Our Plan</span><p>${esc(item.plan)}</p></div>`);
  if (item.kinds) b.push(`<table class="tbl"><tr><th>Kind of search</th><th>Example</th><th>What it tells us</th></tr>${item.kinds.map((k) => `<tr><td><b>${esc(k.name)}</b></td><td>“${esc(k.example)}”</td><td>${esc(k.meaning)}</td></tr>`).join("")}</table>`);
  if (item.list) b.push(`<ul class="list">${item.list.map((l) => `<li><b>${esc(l.name)}.</b> ${esc(l.text)}</li>`).join("")}</ul>`);
  if (item.cards) b.push(`<div class="rcards">${item.cards.map((c) => `<div class="rcard"><h4>${esc(c.problem)} <span class="chip ev-${c.evidence}">${EVIDENCE[c.evidence]}</span></h4><dl>
      <dt>People search</dt><dd>${esc(c.search)}</dd><dt>They want</dt><dd>${esc(c.want)}</dd><dt>Product</dt><dd>${esc(c.product)}</dd><dt>We could write</dt><dd>${esc(c.content)}</dd></dl></div>`).join("")}</div>`);
  if (item.tiers) b.push(`<div class="tiers">${item.tiers.map((t) => `<div class="tier ${esc(t.level)}"><h4>${esc(t.level)} priority</h4><p class="small">${esc(t.why)}</p><ul>${t.terms.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>`);
  if (item.rows) b.push(`<table class="tbl"><tr><th>${esc(item.rowHead[0])}</th><th>${esc(item.rowHead[1])}</th></tr>${item.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</table>`);
  if (item.why) b.push(`<div class="box why"><span class="chip c-why">Why It Matters</span><p>${esc(item.why)}</p></div>`);
  if (item.benefit) b.push(`<p class="kv"><b>Expected benefit:</b> ${esc(item.benefit)}</p>`);
  if (item.example) b.push(`<div class="box example"><b>Example</b>\n${esc(item.example)}</div>`);
  if (item.hypothesis) b.push(`<div class="box hypo"><span class="chip c-hypo">AI Research Hypothesis</span><p>${esc(item.hypothesis)}</p></div>`);
  const links = questionLinks(item);
  if (item.input || links) b.push(`<div class="box input"><span class="chip c-input">Your Input Needed</span>${item.input ? `<p>${esc(item.input)}</p>` : ""}<div class="links">${links}</div></div>`);
  return `<article class="plan-item" id="pi-${esc(item.id)}" tabindex="-1"><h3>${esc(item.title)}</h3>${b.join("")}</article>`;
}

function renderPlan() {
  $("tab-plan").innerHTML = `
    <div class="card intro">
      <h2>Our plan for the website</h2>
      <p>This is what we would like to improve, and why. <b>Nothing has changed on the website yet.</b> We will only start after you agree.</p>
      <p class="muted small">Tap a topic to read it. Each topic has a box for your notes.</p>
      <div class="legend">
        <div><span class="chip c-plan">Our Plan</span> what we suggest doing</div>
        <div><span class="chip c-why">Why It Matters</span> why it is useful</div>
        <div><span class="chip c-input">Your Input Needed</span> a decision or facts from you</div>
        <div><span class="chip c-hypo">AI Research Hypothesis</span> an idea from research that still needs checking</div>
        <div><span class="chip c-note">Your Notes</span> your thoughts, questions or concerns</div>
      </div>
    </div>
    ${PLAN.sections.map((s, i) => `
      <details class="sec" id="ps-${esc(s.id)}" name="psec">
        <summary><span class="sum-title">${String.fromCharCode(65 + i)}. ${esc(s.title)}<span class="sum-note" data-note-flag="${esc(s.id)}"${store.planNotes[s.id] ? "" : " hidden"}>✎ note</span></span><span class="sum-sub">${esc(s.summary)}</span></summary>
        <div class="sec-body">
          ${s.items.map(planItem).join("")}
          <div class="notes-area"><span class="chip c-note">Your Notes</span>
            <textarea class="in" data-plan-note="${esc(s.id)}" rows="3" placeholder="Questions, ideas or concerns about “${esc(s.title)}”" aria-label="Your notes on ${esc(s.title)}">${esc((store.planNotes[s.id] && store.planNotes[s.id].text) || "")}</textarea>
          </div>
        </div>
      </details>`).join("")}
    <div class="card">
      <h3 style="margin:0">Send your notes on the plan</h3>
      <div class="btn-row">
        <button type="button" class="btn" id="pexpXlsx">Excel file</button>
        <button type="button" class="btn ghost" id="pexpTxt">Text file</button>
        <button type="button" class="btn ghost wide" id="pexpCopy">Copy as text</button>
      </div>
    </div>`;
}

function onPlanInput(e) {
  const id = e.target.dataset && e.target.dataset.planNote;
  if (!id) return;
  const text = e.target.value;
  if (text.trim()) store.planNotes[id] = { text, at: new Date().toISOString() };
  else delete store.planNotes[id];
  document.querySelector(`[data-note-flag="${id}"]`).hidden = !text.trim();
  scheduleSave();
}

/* ---------- Roadmap tab ---------- */

function renderRoadmap() {
  const qLink = (qid) => {
    const q = index.byId[qid];
    return q ? `<a class="xlink" href="${qHash(q)}" data-back="#road" data-back-title="Roadmap">${esc(q.productName ? `${q.productName}: ${q.label}` : q.label)} →</a>` : "";
  };
  $("tab-road").innerHTML = `
    <div class="card intro">
      <h2>Roadmap</h2>
      <p class="stage">${esc(ROADMAP.stage)}</p>
      <div class="steps">${ROADMAP.steps.map((s) => `<span class="step ${s.state}">${s.state === "done" ? "✓ " : ""}${esc(s.title)}</span>`).join("")}</div>
      <p class="muted small">These phases are a proposal. Each one starts only after you agree.</p>
    </div>
    ${ROADMAP.phases.map((p) => `
      <details class="sec" id="ph-${p.id}" name="phase">
        <summary><span class="sum-title">${esc(p.title)}</span><span class="sum-sub">${esc(p.plain)}</span></summary>
        <div class="sec-body">
          <p class="kv"><b>What it may include:</b></p><ul class="list">${p.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="box input"><span class="chip c-input">Your Input Needed</span><div class="links">${p.needs.map(qLink).join("")}</div></div>
          <p class="kv"><b>How we'll know it helped:</b> ${esc(p.measure)}</p>
        </div>
      </details>`).join("")}
    <details class="sec" id="ph-kpi" name="phase">
      <summary><span class="sum-title">How we will measure progress</span><span class="sum-sub">Real results, mainly orders.</span></summary>
      <div class="sec-body"><ul class="list">${ROADMAP.kpis.map((k) => `<li><b>${esc(k.name)}.</b> ${esc(k.plain)}</li>`).join("")}</ul>
      <div class="box hypo"><span class="chip c-hypo">Please note</span><p>${esc(ROADMAP.note)}</p></div></div>
    </details>`;
}

/* ---------- navigation ---------- */

const scrollOf = {};
let currentTab = "q";

function parseHash(h) {
  const [tab, a, b] = decodeURIComponent((h || "").replace(/^#/, "")).split("/");
  return { tab: ["q", "plan", "road"].includes(tab) ? tab : "q", a, b };
}

function openDetails(el) {
  if (!el || el.open) return;
  // Older browsers ignore <details name>: close same-name siblings ourselves.
  const name = el.getAttribute("name");
  if (name) for (const d of document.querySelectorAll(`details[name="${name}"]`)) if (d !== el) d.open = false;
  el.open = true;
}

function highlight(el) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    el.focus({ preventScroll: true });
  });
}

function showTab(tab) {
  if (tab !== currentTab) scrollOf[currentTab] = scrollY;
  for (const t of ["q", "plan", "road"]) $(`tab-${t}`).hidden = t !== tab;
  for (const a of document.querySelectorAll(".tabs a")) {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const changed = tab !== currentTab;
  currentTab = tab;
  return changed;
}

function route() {
  const { tab, a, b } = parseHash(location.hash);
  const changed = showTab(tab);
  let target = null;
  if (tab === "q" && a) {
    const sec = $(`qs-${a}`);
    openDetails(sec);
    target = sec;
    const q = b && index.byId[b];
    if (q) {
      if (q.productId) {
        openDetails($(`prod-${q.productId}`));
        if (!q.required) openDetails($(`more-${q.productId}`));
      }
      target = $(`q-${q.id}`);
      if (target && target.hidden) { toast("This question shows after an earlier answer."); target = sec; }
    }
  } else if (tab === "plan" && a) {
    const sec = $(`ps-${a}`);
    openDetails(sec);
    target = (b && $(`pi-${b}`)) || sec;
  }
  if (target) highlight(target);
  else if (changed) requestAnimationFrame(() => scrollTo(0, scrollOf[tab] || 0));

  const st = history.state;
  const chip = $("backChip");
  if (st && st.back) {
    chip.textContent = `← Back to: ${st.backTitle}`;
    chip.hidden = false;
  } else chip.hidden = true;
}

function goTo(hash, { push = true, back = null, backTitle = "" } = {}) {
  const state = back ? { back, backTitle } : null;
  if (push) history.pushState(state, "", hash);
  else history.replaceState(state, "", hash);
  route();
}

document.addEventListener("click", (e) => {
  const link = e.target.closest && e.target.closest("a[href^='#']");
  if (!link || e.defaultPrevented || e.ctrlKey || e.metaKey) return;
  if (link.id === "backChip") {
    e.preventDefault();
    history.back();
    return;
  }
  e.preventDefault();
  const href = link.getAttribute("href");
  if (link.dataset.back) {
    // Remember exactly where we came from, so Back returns to that item.
    history.replaceState(history.state, "", link.dataset.back);
    goTo(href, { back: link.dataset.back, backTitle: link.dataset.backTitle });
  } else if (link.closest(".tabs")) {
    if (parseHash(href).tab === currentTab) return;
    goTo(href);
  } else goTo(href);
});
addEventListener("popstate", route);
addEventListener("hashchange", route);

// Keep the address in step with the open topic, so a refresh comes back to it.
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (!d.open || !d.id) return;
  const m = d.id.match(/^(qs|ps)-(.+)$/);
  if (!m) return;
  const hash = `#${m[1] === "qs" ? "q" : "plan"}/${m[2]}`;
  if (!location.hash.startsWith(hash)) history.replaceState(history.state, "", hash);
}, true);

/* ---------- exports ---------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast("Copied. Paste it into a message to us.");
}

function wireExports() {
  const date = () => fileDate();
  const answers = () => answersText(index, store, QUESTIONNAIRE);
  const planNotesText = () => planText(PLAN, store);
  const xlsx = (fn) => async () => {
    saveNow();
    try { await fn(); toast("Excel file downloaded."); } catch (err) { toast(err.message); }
  };
  $("expXlsx").onclick = xlsx(() => downloadXlsx(`hayatiq-answers-${date()}.xlsx`, "Answers", ANSWER_COLUMNS, answerRows(index, store), [22, 24, 26, 52, 9, 16, 44, 22, 40, 40, 16]));
  $("expTxt").onclick = () => { saveNow(); downloadText(`hayatiq-answers-${date()}.txt`, answers()); };
  $("expCopy").onclick = () => copyText(answers());
  $("expShare").onclick = () => navigator.share({ title: "HAYATIQ answers", text: answers() }).catch(() => {});
  $("backupBtn").onclick = () => { saveNow(); downloadBlob(`hayatiq-backup-${date()}.json`, new Blob([JSON.stringify(store, null, 1)], { type: "application/json" })); };
  $("restoreFile").onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const parsed = parseStore(await file.text());
    if (parsed.corrupt) return toast("That file is not a backup from this page.");
    if (!confirm("Replace the answers on this phone with the backup? (The current answers are kept as a copy.)")) return;
    try { localStorage.setItem(`${STORE_KEY}:before-restore-${Date.now()}`, JSON.stringify(store)); } catch (err) {}
    store = parsed.store;
    saveNow();
    renderAll();
    route();
    toast("Backup restored.");
  };
  $("pexpXlsx").onclick = xlsx(() => downloadXlsx(`hayatiq-plan-notes-${date()}.xlsx`, "Plan notes", PLAN_COLUMNS, planRows(PLAN, store), [30, 16, 60, 60, 16]));
  $("pexpTxt").onclick = () => { saveNow(); downloadText(`hayatiq-plan-notes-${date()}.txt`, planNotesText()); };
  $("pexpCopy").onclick = () => copyText(planNotesText());
}

/* ---------- start ---------- */

function renderAll() {
  renderQuestions();
  renderPlan();
  renderRoadmap();
  wireExports();
}

$("tab-q").addEventListener("input", onQuestionInput);
$("tab-q").addEventListener("change", onQuestionInput);
$("tab-q").addEventListener("click", onQuestionClick);
$("tab-plan").addEventListener("input", onPlanInput);
renderAll();
setSaveState("", store.savedAt ? "Saved on this phone" : "Saves automatically");
route();
