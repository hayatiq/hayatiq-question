/*
 * UI: renders the three tabs from QUESTIONNAIRE / PLAN / ROADMAP, saves every change,
 * and links questions and plan items both ways. Links are hashes:
 *   #q (all topics)  #q/<sectionId>  #q/<sectionId>/<questionId>  #plan/<planSectionId>/<itemId>  #road
 */
const index = indexQuestions(QUESTIONNAIRE, PRODUCT_FIELDS);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SECTIONS = QUESTIONNAIRE.sections;
const sectionById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const planSectionOf = {};
for (const s of PLAN.sections) for (const i of s.items) planSectionOf[i.id] = s;

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
    setSaveState("ok", "Saved");
  } catch (e) {
    setSaveState("err", "Not saved!");
    toast("This browser did not save. Please download your answers now.");
  }
}
function setSaveState(cls, text) {
  const el = $("saveState");
  el.className = `save ${cls}`;
  el.lastChild.textContent = text;
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

/* ---------- progress ---------- */

// What counts towards progress: every main question, and the "Needed" fields of each product.
// Optional extra product fields ("More details") don't, or the total would be huge.
const counts = (q) => !q.productId || q.required;

function stats(list) {
  const p = progress(list.filter(counts), store, index.byId);
  return { ...p, left: p.total - p.done, neededLeft: p.needed - p.neededDone, pct: p.total ? Math.round((p.done / p.total) * 100) : 100 };
}
const questionsOf = (secId) => index.list.filter((q) => q.sectionId === secId);
const questionsOfProduct = (pid) => index.list.filter((q) => q.productId === pid);

// First unanswered question, "Needed" ones first.
function firstMissing(list) {
  const open = list.filter((q) => counts(q) && statusOf(q, store, index.byId) !== "answered" && statusOf(q, store, index.byId) !== "hidden");
  return open.find((q) => q.required) || open[0] || null;
}

const ring = (pct, inner, cls = "") => `<span class="ring ${cls}" style="--p:${pct}" aria-hidden="true"><span>${inner}</span></span>`;

/* ---------- links between questions and plan items (many to many) ---------- */

// A question named by a plan item links back to it. A plan item that names a whole section
// links back only from questions that no item names directly.
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
for (const q of index.list) if (!planLinksOfQuestion[q.id] && sectionLinks[q.sectionId]) planLinksOfQuestion[q.id] = sectionLinks[q.sectionId].slice(0, 1);
const qHash = (q) => `#q/${q.sectionId}/${q.id}`;
const itemHash = (itemId) => `#plan/${planSectionOf[itemId].id}/${itemId}`;
const qName = (q) => (q.productName ? `${q.productName}: ${q.label}` : q.label);

/* ---------- Questions tab: question cards ---------- */

function optionRow(q, o, checked, a, older) {
  const multi = q.type === "multi";
  const notePh = o.note || q.optionNotes;
  const noteVal = (a && a.optNotes && a.optNotes[o.id]) || "";
  return `<label class="opt${older ? " older" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="r-${esc(q.id)}" value="${esc(o.id)}" data-k="v"${checked ? " checked" : ""}><span class="opt-mark" aria-hidden="true"></span><span class="opt-text">${esc(o.label)}</span></label>` +
    (notePh ? `<input type="text" class="in opt-note" data-k="opt" data-opt="${esc(o.id)}" placeholder="${esc(notePh)}" value="${esc(noteVal)}" aria-label="${esc(`${o.label}: ${notePh}`)}"${checked ? "" : " hidden"}>` : "");
}

function control(q, a) {
  const v = a ? a.v : "";
  const labelled = `aria-labelledby="ql-${esc(q.id)}"`;
  if (q.type === "text") return `<input type="text" class="in" data-k="v" value="${esc(v)}" placeholder="${esc(q.placeholder || "Type here")}" ${labelled}>`;
  if (q.type === "number") return `<input type="text" inputmode="decimal" class="in" data-k="v" value="${esc(v)}" placeholder="${esc(q.placeholder || "")}" ${labelled}>`;
  if (q.type === "longtext") return `<textarea class="in" data-k="v" rows="3" placeholder="${esc(q.placeholder || "Type here")}" ${labelled}>${esc(v)}</textarea>`;
  const sel = selectedIds(a);
  const older = olderChoices(q, a);
  let html = "";
  if (q.type !== "multi" && older.length) {
    html += `<p class="older-warn">Your earlier answer “${esc((a.labels && a.labels[older[0]]) || older[0])}” is no longer one of the choices. It is kept until you pick another one.</p>`;
  }
  html += `<div class="opts${q.type === "multi" ? " multi" : ""}" role="group" ${labelled}>`;
  html += optionsOf(q).map((o) => optionRow(q, o, sel.includes(o.id), a, false)).join("");
  if (q.type === "multi") html += older.map((id) => optionRow(q, { id, label: `${(a.labels && a.labels[id]) || id} (older choice)` }, true, a, true)).join("");
  html += "</div>";
  if (q.type === "multi") html = `<p class="hint">Tick all that apply.</p>` + html;
  return html;
}

function questionCard(q) {
  const a = store.answers[q.id];
  const note = (a && a.note) || "";
  const links = planLinksOfQuestion[q.id] || [];
  const why = links.slice(0, 2).map((l, i) =>
    `<a class="tool xlink" href="${itemHash(l.item)}" data-back="${qHash(q)}" data-back-title="${esc(q.label)}" title="${esc(l.title)}">${i ? "One more reason" : "Why we ask"} →</a>`).join("");
  const choice = q.type === "single" || q.type === "yesno";
  return `<div class="q" id="q-${esc(q.id)}" data-qid="${esc(q.id)}" data-need="${q.required ? 1 : 0}" tabindex="-1">
    <div class="q-top"><span class="tag ${q.required ? "need" : "optional"}">${q.required ? "Needed" : "Optional"}</span><span class="tag answered">✓ Answered</span></div>
    <p class="q-label" id="ql-${esc(q.id)}">${esc(q.label)}</p>
    ${q.help ? `<p class="help">${esc(q.help)}</p>` : ""}
    ${control(q, a)}
    <textarea class="in note" data-k="note" rows="2" placeholder="Your note (optional)" aria-label="Note for: ${esc(q.label)}"${note ? "" : " hidden"}>${esc(note)}</textarea>
    <div class="q-tools">
      <button type="button" class="tool add-note"${note ? " hidden" : ""}>✎ Add a note</button>
      ${why}
      ${choice ? `<button type="button" class="tool quiet clear-btn"${selectedIds(a).length ? "" : " hidden"}>Clear answer</button>` : ""}
    </div>
  </div>`;
}

/* ---------- Questions tab: pages ---------- */

function productBlock(p) {
  const qs = questionsOfProduct(p.id);
  const more = qs.filter((q) => !q.required);
  return `<details class="prod" id="prod-${esc(p.id)}" name="prod">
    <summary><span class="prod-ring" data-ring-prod="${esc(p.id)}"></span><span class="prod-name">${esc(p.name)}<span class="sub" data-progress-prod="${esc(p.id)}"></span></span></summary>
    <div class="prod-body">
      <p class="prod-now"><b>On the website now:</b> ${esc(p.now)}</p>
      ${qs.filter((q) => q.required).map(questionCard).join("")}
      <details class="more" id="more-${esc(p.id)}"><summary>More details (optional) · ${more.length}</summary>${more.map(questionCard).join("")}</details>
    </div>
  </details>`;
}

function sectionPage(s, i) {
  const next = SECTIONS[i + 1];
  const body = s.products ? s.products.map(productBlock).join("") : sectionQuestions(s, PRODUCT_FIELDS).map((q) => questionCard(index.byId[q.id])).join("");
  return `<section class="qpage" id="qs-${esc(s.id)}" hidden aria-labelledby="qt-${esc(s.id)}">
    <a class="back-link" href="#q">← All topics</a>
    <div class="qpage-head">
      <div class="qh-row"><span class="qh-num" aria-hidden="true">${i + 1}</span><div><p class="eyebrow">Topic ${i + 1} of ${SECTIONS.length}</p><h2 id="qt-${esc(s.id)}">${esc(s.title)}</h2></div></div>
      <div class="sec-progress"><div class="bar"><i data-bar-sec="${esc(s.id)}"></i></div><span data-text-sec="${esc(s.id)}"></span></div>
      <details class="why-more"><summary>Why we ask this</summary><p>${esc(s.intro)}</p></details>
    </div>
    <div class="qlist">${body}</div>
    <div class="qpage-foot">
      <button type="button" class="btn ghost" data-missing="${esc(s.id)}">Go to the next unanswered question</button>
      ${next ? `<a class="btn" href="#q/${esc(next.id)}">Next topic: ${esc(next.title)} →</a>` : `<a class="btn" href="#q">Finish: back to all topics</a>`}
    </div>
  </section>`;
}

function renderQuestions() {
  $("tab-q").innerHTML = `
    <div id="qOverview">
      <section class="hero-card">
        <p class="hc-eyebrow">Hello 👋</p>
        <h2 class="hc-title">Let's make the HAYATIQ website even better</h2>
        <p class="hc-text">Answer what you know and skip the rest. Everything saves on this phone by itself.</p>
        <div class="hc-panel"><span id="ovRing"></span><div><p class="pc-title" id="ovTitle"></p><p class="pc-sub" id="ovSub"></p></div></div>
        <button type="button" class="btn light wide" id="continueBtn">Start with topic 1 →</button>
      </section>
      <div class="list-head"><h3 class="list-title">Topics</h3><span class="list-meta">${SECTIONS.length} topics · tap one to open</span></div>
      <div class="topics">${SECTIONS.map((s, i) => `
        <a class="topic" href="#q/${esc(s.id)}" data-topic="${esc(s.id)}">
          <span class="topic-ring" data-ring-sec="${esc(s.id)}">${ring(0, i + 1)}</span>
          <span class="topic-text"><b>${esc(s.title)}<span class="next-tag" data-next-tag="${esc(s.id)}" hidden>Up next</span></b><span class="sub" data-progress-sec="${esc(s.id)}"></span></span>
          <span class="chev" aria-hidden="true">›</span>
        </a>`).join("")}
      </div>
      <p class="card muted small" id="orphanNote" hidden></p>
      <section class="card send-card" id="sendCard">
        <div class="send-head"><span class="send-ico" aria-hidden="true">↗</span><div><h3>Send your answers</h3><p class="muted small">Save a file, then send it to us on WhatsApp or Messenger.</p></div></div>
        <div class="mini-row">
          <button type="button" class="mini primary" id="expXlsx"><span aria-hidden="true">⤓</span>Excel</button>
          <button type="button" class="mini" id="expTxt"><span aria-hidden="true">⤓</span>Text</button>
          <button type="button" class="mini" id="expCopy"><span aria-hidden="true">⧉</span>Copy</button>
          <button type="button" class="mini" id="expShare" hidden><span aria-hidden="true">↗</span>Share</button>
        </div>
        <p class="tiny muted">Download not working inside an app? Tap Copy and paste it into a message.</p>
        <details class="more small-more"><summary>Backup &amp; restore</summary>
          <p class="muted small">Answers are kept only in this browser on this phone. Some phones clear website data that isn't opened for a while, so download a backup now and then. A backup can also move your answers to another phone.</p>
          <div class="mini-row">
            <button type="button" class="mini" id="backupBtn"><span aria-hidden="true">⤓</span>Download backup</button>
            <label class="mini" for="restoreFile"><span aria-hidden="true">⤒</span>Restore</label>
            <input type="file" id="restoreFile" accept=".json,application/json" hidden>
          </div>
        </details>
      </section>
    </div>
    ${SECTIONS.map(sectionPage).join("")}`;
  const orphans = orphanAnswers(store, index.byId);
  if (orphans.length) {
    $("orphanNote").hidden = false;
    $("orphanNote").textContent = `${orphans.length} earlier answer(s) belong to questions we have since removed or changed. They are kept and included in your exports.`;
  }
  if (navigator.share) $("expShare").hidden = false;
  refreshStatus();
}

// Show/hide conditional questions and update every progress display.
function refreshStatus() {
  for (const q of index.list) {
    const card = document.getElementById(`q-${q.id}`);
    if (!card) continue;
    const st = statusOf(q, store, index.byId);
    card.hidden = st === "hidden";
    card.dataset.status = st;
  }
  const leftText = (st) => (st.left === 0 ? "Done ✓" : st.done === 0 ? `${st.total} questions` : `${st.done} of ${st.total} answered · <em>${st.left} left</em>`);
  SECTIONS.forEach((s, i) => {
    const st = stats(questionsOf(s.id));
    let sub = leftText(st);
    if (s.products) {
      let started = 0;
      for (const p of s.products) {
        const ps = stats(questionsOfProduct(p.id));
        if (ps.done) started++;
        document.querySelector(`[data-progress-prod="${p.id}"]`).innerHTML = ps.left === 0 ? "Done ✓" : ps.done ? `${ps.done} of ${ps.total} · <em>${ps.left} left</em>` : `${ps.total} questions`;
        document.querySelector(`[data-ring-prod="${p.id}"]`).innerHTML = ring(ps.pct, ps.left ? "" : "✓", ps.left ? "small" : "small done");
      }
      sub = `${s.products.length} products · ${st.left === 0 ? "Done ✓" : st.done ? `${started} started · <em>${st.left} answers left</em>` : `${st.total} questions`}`;
    }
    const subEl = document.querySelector(`[data-progress-sec="${s.id}"]`);
    subEl.innerHTML = sub;
    subEl.closest(".topic").classList.toggle("done", st.left === 0);
    document.querySelector(`[data-ring-sec="${s.id}"]`).innerHTML = ring(st.pct, st.left ? i + 1 : "✓", st.left ? "" : "done");
    document.querySelector(`[data-bar-sec="${s.id}"]`).style.width = `${st.pct}%`;
    document.querySelector(`[data-text-sec="${s.id}"]`).innerHTML = st.left ? `${st.done} of ${st.total} answered · <em>${st.left} left</em>` : "All answered in this topic ✓";
    document.querySelector(`[data-missing="${s.id}"]`).hidden = st.left === 0;
  });

  const all = stats(index.list);
  const topicsLeft = SECTIONS.filter((s) => stats(questionsOf(s.id)).left > 0).length;
  $("ovRing").innerHTML = ring(all.pct, all.left ? `${all.pct}%` : "✓", all.left ? "big light" : "big light done");
  const next = firstMissing(index.list);
  for (const s of SECTIONS) document.querySelector(`[data-next-tag="${s.id}"]`).hidden = !(all.done && next && next.sectionId === s.id);
  const badge = $("tabBadge");
  badge.hidden = all.done === 0;
  badge.textContent = all.left ? `${all.pct}%` : "✓";
  $("ovTitle").textContent = all.left ? `${all.done} of ${all.total} questions answered` : "Everything is answered. Thank you! 🎉";
  $("ovSub").innerHTML = all.left
    ? `<em>${all.left} left</em> in ${topicsLeft} topic${topicsLeft === 1 ? "" : "s"}${all.neededLeft ? ` · ${all.neededLeft} of them marked Needed` : ""}`
    : "Please send your answers to us below.";
  const cont = $("continueBtn");
  cont.hidden = all.left === 0;
  cont.textContent = all.done ? "Continue where you left off →" : "Start with topic 1 →";
  $("stripPct").textContent = `${all.pct}%`;
  $("stripLeft").textContent = all.left ? `${all.left} left` : "all done ✓";
  $("stripBar").style.width = `${all.pct}%`;
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
  autoGrow(el);
  if (el.type === "checkbox" || el.type === "radio") syncOptionNotes(card);
  if (el.type === "radio") {
    const warn = card.querySelector(".older-warn");
    if (warn) warn.remove();
    card.querySelector(".clear-btn").hidden = false;
  }
  scheduleSave();
  refreshStatus();
}

// Text boxes grow with what is typed, so long answers stay readable on a phone.
function autoGrow(el) {
  if (!el || el.tagName !== "TEXTAREA" || el.offsetParent === null) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 3}px`;
}
const growAll = (root) => root && root.querySelectorAll("textarea.in").forEach(autoGrow);

function syncOptionNotes(card) {
  for (const n of card.querySelectorAll(".opt-note")) {
    const box = card.querySelector(`input[data-k="v"][value="${CSS.escape(n.dataset.opt)}"]`);
    n.hidden = !(box && box.checked);
  }
}

function onQuestionClick(e) {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.classList.contains("add-note")) {
    t.hidden = true;
    const ta = t.closest(".q").querySelector("textarea.note");
    ta.hidden = false;
    autoGrow(ta);
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
  } else if (t.dataset.missing !== undefined || t.id === "continueBtn") {
    const q = firstMissing(t.id === "continueBtn" ? index.list : questionsOf(t.dataset.missing));
    if (q) goTo(qHash(q));
  }
}

/* ---------- Plan tab ---------- */

const EVIDENCE = { checked: "We checked this", research: "Research finding", hypothesis: "AI research hypothesis" };

function questionLinks(item) {
  const back = itemHash(item.id);
  const out = [];
  for (const secId of item.sections || []) {
    const s = sectionById[secId];
    if (s) out.push(`<a class="qlink xlink" href="#q/${esc(secId)}" data-back="${back}" data-back-title="${esc(item.title)}"><span class="qstate" data-sec-state="${esc(secId)}"></span><span>All questions in “${esc(s.title)}”</span><span class="go">→</span></a>`);
  }
  for (const qid of item.questions || []) {
    const q = index.byId[qid];
    if (q) out.push(`<a class="qlink xlink" href="${qHash(q)}" data-back="${back}" data-back-title="${esc(item.title)}"><span class="qstate" data-q-state="${esc(qid)}"></span><span>${esc(qName(q))}</span><span class="go">→</span></a>`);
  }
  return out.join("");
}

function planItem(item) {
  const b = [];
  if (item.now) b.push(`<p class="kv"><span class="kv-k">Today</span>${esc(item.now)}</p>`);
  if (item.found) b.push(`<div class="found"><span class="ev ev-${item.evidence || "checked"}">${EVIDENCE[item.evidence || "checked"]}</span><p>${esc(item.found)}</p></div>`);
  if (item.plan) b.push(`<div class="box plan"><span class="lbl c-plan">Our Plan</span><p>${esc(item.plan)}</p></div>`);
  if (item.kinds) b.push(`<div class="kinds">${item.kinds.map((k) => `<div class="kind"><b>${esc(k.name)}</b><span class="ex">“${esc(k.example)}”</span><span class="muted small">${esc(k.meaning)}</span></div>`).join("")}</div>`);
  if (item.list) b.push(`<ul class="list">${item.list.map((l) => `<li><b>${esc(l.name)}</b><span>${esc(l.text)}</span></li>`).join("")}</ul>`);
  if (item.cards) b.push(`<div class="rcards">${item.cards.map((c) => `<div class="rcard"><h4>${esc(c.problem)}</h4><dl>
      <dt>People search</dt><dd>${esc(c.search)}</dd><dt>They want</dt><dd>${esc(c.want)}</dd><dt>Product</dt><dd>${esc(c.product)}</dd><dt>We could write</dt><dd>${esc(c.content)}</dd></dl></div>`).join("")}</div>`);
  if (item.tiers) b.push(`<div class="tiers">${item.tiers.map((t) => `<div class="tier ${esc(t.level)}"><h4>${esc(t.level)} priority</h4><p class="small muted">${esc(t.why)}</p><div class="terms">${t.terms.map((x) => `<span>${esc(x)}</span>`).join("")}</div></div>`).join("")}</div>`);
  if (item.rows) b.push(`<table class="tbl"><thead><tr><th>${esc(item.rowHead[0])}</th><th>${esc(item.rowHead[1])}</th></tr></thead><tbody>${item.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table>`);
  if (item.why) b.push(`<div class="box why"><span class="lbl c-why">Why It Matters</span><p>${esc(item.why)}</p></div>`);
  if (item.benefit) b.push(`<p class="kv"><span class="kv-k">Expected benefit</span>${esc(item.benefit)}</p>`);
  if (item.example) b.push(`<div class="box example"><span class="lbl c-note">Example</span><p>${esc(item.example)}</p></div>`);
  if (item.hypothesis) b.push(`<div class="box hypo"><span class="lbl c-hypo">AI Research Hypothesis</span><p>${esc(item.hypothesis)}</p></div>`);
  const links = questionLinks(item);
  if (item.input || links) b.push(`<div class="box input"><span class="lbl c-input">Your Input Needed</span>${item.input ? `<p>${esc(item.input)}</p>` : ""}${links ? `<div class="qlinks">${links}</div>` : ""}</div>`);
  return `<article class="plan-item" id="pi-${esc(item.id)}" tabindex="-1"><h3>${esc(item.title)}</h3>${b.join("")}</article>`;
}

const planItems = PLAN.sections.flatMap((s) => s.items);

function renderPlan() {
  $("tab-plan").innerHTML = `
    <section class="hero-card">
      <p class="hc-eyebrow">Our plan</p>
      <h2 class="hc-title">How we want to improve the website</h2>
      <p class="hc-text">Read each topic at your own pace. Add a note wherever you have a thought or a question.</p>
      <div class="hc-note"><span class="status-ico" aria-hidden="true">⏸</span><span><b>Nothing has changed on the website yet.</b> We start only after you agree.</span></div>
      <div class="stats">
        <div><b>${PLAN.sections.length}</b><span>topics</span></div>
        <div><b>${planItems.length}</b><span>ideas</span></div>
        <div class="warm"><b>${planItems.filter((i) => i.input || (i.questions || []).length || (i.sections || []).length).length}</b><span>need your input</span></div>
      </div>
    </section>
    <details class="card howto">
      <summary><span class="howto-ico" aria-hidden="true">?</span>How to read this plan</summary>
      <div class="legend-grid">
        <div class="box plan"><span class="lbl c-plan">Our Plan</span><p>What we suggest doing</p></div>
        <div class="box why"><span class="lbl c-why">Why It Matters</span><p>Why it is useful</p></div>
        <div class="box input"><span class="lbl c-input">Your Input Needed</span><p>A decision or facts from you</p></div>
        <div class="box hypo"><span class="lbl c-hypo">AI Research Hypothesis</span><p>An idea that still needs checking</p></div>
      </div>
      <p class="kv-k legend-sub">How we know something</p>
      <ul class="ev-list">
        <li><span class="ev ev-checked">We checked this</span><span>We looked at the website or pages ourselves.</span></li>
        <li><span class="ev ev-research">Research finding</span><span>Seen in Google suggestions or search results.</span></li>
        <li><span class="ev ev-hypothesis">AI research hypothesis</span><span>Likely, but not proven yet.</span></li>
      </ul>
      <p class="small muted">Each topic ends with a <b>Your Notes</b> box for your thoughts, questions or concerns.</p>
    </details>
    <div class="list-head"><h3 class="list-title">Topics</h3><span class="list-meta">tap one to read</span></div>
    <div class="psecs">${PLAN.sections.map((s, i) => `
      <details class="sec" id="ps-${esc(s.id)}" name="psec">
        <summary><span class="letter">${String.fromCharCode(65 + i)}</span><span class="topic-text"><b>${esc(s.title)}</b><span class="sub">${esc(s.summary)}</span><span class="flag" data-note-flag="${esc(s.id)}"${store.planNotes[s.id] ? "" : " hidden"}>✎ You added a note</span></span><span class="chev" aria-hidden="true">›</span></summary>
        <div class="sec-body">
          ${s.items.map(planItem).join("")}
          <div class="notes-area"><span class="lbl c-note">Your Notes</span>
            <textarea class="in" data-plan-note="${esc(s.id)}" rows="3" placeholder="Questions, ideas or concerns about “${esc(s.title)}”" aria-label="Your notes on ${esc(s.title)}">${esc((store.planNotes[s.id] && store.planNotes[s.id].text) || "")}</textarea>
          </div>
        </div>
      </details>`).join("")}
    </div>
    <section class="card send-card">
      <div class="send-head"><span class="send-ico" aria-hidden="true">↗</span><div><h3>Send your notes on the plan</h3><p class="muted small">Only the topics where you wrote a note matter to us.</p></div></div>
      <div class="mini-row">
        <button type="button" class="mini primary" id="pexpXlsx"><span aria-hidden="true">⤓</span>Excel</button>
        <button type="button" class="mini" id="pexpTxt"><span aria-hidden="true">⤓</span>Text</button>
        <button type="button" class="mini" id="pexpCopy"><span aria-hidden="true">⧉</span>Copy</button>
      </div>
    </section>`;
}

// Answered / not yet, next to each linked question in the plan and roadmap.
function refreshLinkStates() {
  for (const el of document.querySelectorAll("[data-q-state]")) {
    const q = index.byId[el.dataset.qState];
    const done = statusOf(q, store, index.byId) === "answered";
    el.className = `qstate${done ? " done" : ""}`;
    el.title = done ? "Answered" : "Not answered yet";
  }
  for (const el of document.querySelectorAll("[data-sec-state]")) {
    const done = stats(questionsOf(el.dataset.secState)).left === 0;
    el.className = `qstate${done ? " done" : ""}`;
  }
}

function onPlanInput(e) {
  const id = e.target.dataset && e.target.dataset.planNote;
  if (!id) return;
  const text = e.target.value;
  if (text.trim()) store.planNotes[id] = { text, at: new Date().toISOString() };
  else delete store.planNotes[id];
  document.querySelector(`[data-note-flag="${id}"]`).hidden = !text.trim();
  autoGrow(e.target);
  scheduleSave();
}

/* ---------- Roadmap tab ---------- */

function renderRoadmap() {
  const qLink = (qid) => {
    const q = index.byId[qid];
    return q ? `<a class="qlink xlink" href="${qHash(q)}" data-back="#road" data-back-title="Roadmap"><span class="qstate" data-q-state="${esc(qid)}"></span><span>${esc(qName(q))}</span><span class="go">→</span></a>` : "";
  };
  $("tab-road").innerHTML = `
    <section class="hero-card">
      <p class="hc-eyebrow">Roadmap</p>
      <h2 class="hc-title">Where we are, and what comes next</h2>
      <div class="hc-note"><span class="status-ico" aria-hidden="true">●</span><span>${esc(ROADMAP.stage)}</span></div>
    </section>
    <div class="card">
      <ol class="timeline">${ROADMAP.steps.map((s) => `<li class="${s.state}"><span class="dot">${s.state === "done" ? "✓" : ""}</span><span>${esc(s.title)}</span>${s.state === "now" ? ' <span class="here">We are here</span>' : ""}</li>`).join("")}</ol>
      <p class="muted small">The phases are a proposal. Each one starts only after you agree.</p>
    </div>
    <div class="list-head"><h3 class="list-title">The phases</h3><span class="list-meta">tap one to read</span></div>
    <div class="psecs">${ROADMAP.phases.map((p, i) => `
      <details class="sec" id="ph-${p.id}" name="phase">
        <summary><span class="letter">${i + 1}</span><span class="topic-text"><b>${esc(p.title.replace(/^Phase \d+: /, ""))}</b><span class="sub">${esc(p.plain)}</span></span><span class="chev" aria-hidden="true">›</span></summary>
        <div class="sec-body">
          <p class="kv"><span class="kv-k">What it may include</span></p><ul class="list plain">${p.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="box input"><span class="lbl c-input">Your Input Needed</span><div class="qlinks">${p.needs.map(qLink).join("")}</div></div>
          <p class="kv"><span class="kv-k">How we'll know it helped</span>${esc(p.measure)}</p>
        </div>
      </details>`).join("")}
      <details class="sec" id="ph-kpi" name="phase">
        <summary><span class="letter">%</span><span class="topic-text"><b>How we will measure progress</b><span class="sub">Real results, mainly orders.</span></span><span class="chev" aria-hidden="true">›</span></summary>
        <div class="sec-body"><ul class="list">${ROADMAP.kpis.map((k) => `<li><b>${esc(k.name)}</b><span>${esc(k.plain)}</span></li>`).join("")}</ul>
        <div class="box hypo"><span class="lbl c-hypo">Please note</span><p>${esc(ROADMAP.note)}</p></div></div>
      </details>
    </div>`;
}

/* ---------- navigation ---------- */

const scrollOf = {};
let currentView = "q";

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
    el.scrollIntoView({ block: "start" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    el.focus({ preventScroll: true });
  });
}

function route() {
  const { tab, a, b } = parseHash(location.hash);
  // A "view" is a tab, or one topic page inside Questions; each keeps its own scroll position.
  const page = tab === "q" && sectionById[a] ? a : null;
  const view = page ? `q/${page}` : tab;
  if (view !== currentView) scrollOf[currentView] = scrollY;
  for (const t of ["q", "plan", "road"]) $(`tab-${t}`).hidden = t !== tab;
  for (const link of document.querySelectorAll(".tabs a")) {
    if (link.dataset.tab === tab) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  $("strip").hidden = tab !== "q" || !page;
  $("qOverview").hidden = !!page;
  for (const s of SECTIONS) $(`qs-${s.id}`).hidden = s.id !== page;
  if (tab !== "q") refreshLinkStates();

  let target = null;
  if (page && b) {
    const q = index.byId[b];
    if (q) {
      if (q.productId) {
        openDetails($(`prod-${q.productId}`));
        if (!q.required) openDetails($(`more-${q.productId}`));
      }
      target = $(`q-${q.id}`);
      if (target && target.hidden) { toast("This question shows after an earlier answer."); target = null; }
    }
  } else if (tab === "plan" && a) {
    const sec = $(`ps-${a}`);
    openDetails(sec);
    target = (b && $(`pi-${b}`)) || sec;
  }
  requestAnimationFrame(() => growAll($(`tab-${tab}`)));
  if (target) highlight(target);
  else if (view !== currentView) {
    const y = page ? 0 : scrollOf[view] || 0;
    requestAnimationFrame(() => scrollTo(0, y));
  }
  currentView = view;

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
  e.preventDefault();
  if (link.id === "backChip") return history.back();
  const href = link.getAttribute("href");
  if (link.dataset.back) {
    // Remember exactly where we came from, so Back returns to that item.
    history.replaceState(history.state, "", link.dataset.back);
    goTo(href, { back: link.dataset.back, backTitle: link.dataset.backTitle });
  } else if (link.closest(".tabs") && parseHash(href).tab === parseHash(location.hash).tab && parseHash(location.hash).a === undefined) {
    scrollTo({ top: 0, behavior: "smooth" });
  } else goTo(href);
});
addEventListener("popstate", route);
addEventListener("hashchange", route);

// Keep the address in step with the open plan topic, so a refresh comes back to it.
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (d.open) growAll(d);
  if (!d.open || !d.id || !d.id.startsWith("ps-")) return;
  const hash = `#plan/${d.id.slice(3)}`;
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
    currentView = null;
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
setSaveState("ok", store.savedAt ? "Saved" : "Saves by itself");
currentView = null;
route();
