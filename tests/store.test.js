// Run: node tests/store.test.js  — checks the content files and the storage rules.
const assert = require("assert");
const { QUESTIONNAIRE, PRODUCT_FIELDS } = require("../js/questions.js");
const { PLAN, ROADMAP } = require("../js/plan.js");
const S = require("../js/store.js");
const X = require("../js/export.js");

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log("ok -", name); };
const clone = (o) => JSON.parse(JSON.stringify(o));

const index = S.indexQuestions(QUESTIONNAIRE, PRODUCT_FIELDS);

test("question ids are unique and option ids unique per question", () => {
  const ids = index.list.map((q) => q.id);
  assert.strictEqual(new Set(ids).size, ids.length, "duplicate question id");
  for (const q of index.list) {
    const o = S.optionsOf(q).map((x) => x.id);
    assert.strictEqual(new Set(o).size, o.length, `duplicate option id in ${q.id}`);
    if (S.isChoice(q)) assert.ok(o.length, `${q.id} has no options`);
  }
});

test("showIf, plan and roadmap links point to real ids", () => {
  for (const q of index.list) {
    if (!q.showIf) continue;
    const t = index.byId[q.showIf.q];
    assert.ok(t, `${q.id} showIf -> missing ${q.showIf.q}`);
    const want = [].concat(q.showIf.is ?? q.showIf.not);
    for (const id of want) assert.ok(S.optionsOf(t).some((o) => o.id === id), `${q.id} showIf option ${id} missing`);
  }
  const itemIds = [];
  for (const s of PLAN.sections) for (const i of s.items) {
    itemIds.push(i.id);
    for (const qid of i.questions || []) assert.ok(index.byId[qid], `plan ${i.id} -> missing question ${qid}`);
    for (const sid of i.sections || []) assert.ok(QUESTIONNAIRE.sections.some((x) => x.id === sid), `plan ${i.id} -> missing section ${sid}`);
  }
  assert.strictEqual(new Set(itemIds).size, itemIds.length, "duplicate plan item id");
  for (const p of ROADMAP.phases) for (const qid of p.needs) assert.ok(index.byId[qid], `roadmap ${p.id} -> missing ${qid}`);
});

test("every product has the asked fields and they are marked Needed", () => {
  const q = index.byId["p.detox_shampoo.ingredients"];
  assert.ok(q && q.required && q.productName === "Detox Shampoo Bar");
  assert.strictEqual(index.byId["p.detox_shampoo.photo"].required, false);
});

test("answers survive wording changes, removed options and new questions", () => {
  const store = S.emptyStore();
  S.setAnswer(store, index.byId["brand_tagline_choice"], { v: "t_fb" }, 1);
  S.setAnswer(store, index.byId["cq_problems"], { v: ["sleep", "gift"], optNotes: { sleep: "Magnesium oil 30%" } }, 1);
  S.setAnswer(store, index.byId["brand_business_name"], { v: "HAYATIQ", note: "trade licence name" }, 1);
  const saved = JSON.parse(JSON.stringify(store)); // as if reloaded from localStorage

  // Version 2: reworded question, option "t_fb" and "gift" removed, a new question, one question deleted.
  const qn2 = clone(QUESTIONNAIRE);
  qn2.version = 2;
  const brand = qn2.sections.find((s) => s.id === "brand");
  const tag = brand.questions.find((q) => q.id === "brand_tagline_choice");
  tag.label = "Pick the official tagline";
  tag.options = tag.options.filter((o) => o.id !== "t_fb");
  brand.questions = brand.questions.filter((q) => q.id !== "brand_business_name");
  brand.questions.push({ id: "brand_new_q", type: "text", label: "A brand new question" });
  const cq = qn2.sections.find((s) => s.id === "customers").questions.find((q) => q.id === "cq_problems");
  cq.options = cq.options.filter((o) => o.id !== "gift");
  const idx2 = S.indexQuestions(qn2, PRODUCT_FIELDS);
  const store2 = S.parseStore(JSON.stringify(saved)).store;

  assert.strictEqual(S.answerText(idx2.byId["brand_tagline_choice"], store2.answers.brand_tagline_choice), "Handcrafted wellness essentials for conscious souls (older choice)");
  assert.deepStrictEqual(S.olderChoices(idx2.byId["cq_problems"], store2.answers.cq_problems), ["gift"]);
  assert.strictEqual(S.answerText(idx2.byId["cq_problems"], store2.answers.cq_problems), "Trouble sleeping; Looking for a gift (older choice)");
  assert.strictEqual(S.optionNotesText(idx2.byId["cq_problems"], store2.answers.cq_problems), "Trouble sleeping: Magnesium oil 30%");
  assert.strictEqual(S.statusOf(idx2.byId["brand_new_q"], store2, idx2.byId), "empty");
  assert.strictEqual(S.statusOf(idx2.byId["brand_tagline_choice"], store2, idx2.byId), "answered");

  // The deleted question's answer is still exported.
  const rows = X.answerRows(idx2, store2);
  const orphan = rows.find((r) => r[2] === "brand_business_name");
  assert.ok(orphan, "removed question missing from export");
  assert.strictEqual(orphan[6], "HAYATIQ");
  assert.strictEqual(orphan[9], "trade licence name");
  // Answering a changed question keeps the old label copy for other ids.
  S.setAnswer(store2, idx2.byId["cq_problems"], { v: ["sleep", "gift", "plastic"] }, 2);
  assert.strictEqual(store2.answers.cq_problems.labels.gift, "Looking for a gift");
});

test("conditional questions follow their parent, including chains", () => {
  const store = S.emptyStore();
  const q = (id) => index.byId[id];
  assert.strictEqual(S.isVisible(q("rev_where"), store, index.byId), false);
  S.setAnswer(store, q("rev_have"), { v: "yes" }, 1);
  assert.strictEqual(S.isVisible(q("rev_where"), store, index.byId), true);
  assert.strictEqual(S.isVisible(q("rev_publish_what"), store, index.byId), false);
  S.setAnswer(store, q("rev_permission"), { v: "ask_each" }, 1);
  assert.strictEqual(S.isVisible(q("rev_publish_what"), store, index.byId), true);
  S.setAnswer(store, q("rev_have"), { v: "no" }, 1); // parent hidden -> child hidden
  assert.strictEqual(S.isVisible(q("rev_publish_what"), store, index.byId), false);
  assert.strictEqual(S.statusOf(q("rev_publish_what"), store, index.byId), "hidden");
  S.setAnswer(store, q("ev_docs"), { v: ["labels"] }, 1);
  assert.strictEqual(S.isVisible(q("ev_send_docs"), store, index.byId), true);
  S.setAnswer(store, q("ev_docs"), { v: ["none"] }, 1);
  assert.strictEqual(S.isVisible(q("ev_send_docs"), store, index.byId), false);
});

test("clearing everything removes the entry; a note alone counts as note_only", () => {
  const store = S.emptyStore();
  const q = index.byId["cq_feedback"];
  S.setAnswer(store, q, { v: "They love it" }, 1);
  S.setAnswer(store, q, { v: "" }, 1);
  assert.ok(!store.answers.cq_feedback);
  S.setAnswer(store, q, { note: "ask my sister" }, 1);
  assert.strictEqual(S.statusOf(q, store, index.byId), "note_only");
});

test("broken saved data is handed back, not lost", () => {
  const r = S.parseStore("{not json");
  assert.strictEqual(r.corrupt, "{not json");
  assert.deepStrictEqual(r.store.answers, {});
  assert.deepStrictEqual(S.parseStore(null).store.answers, {});
});

test("text exports are readable", () => {
  const store = S.emptyStore();
  S.setAnswer(store, index.byId["p.mg_oil.lasts"], { v: "About 2 months" }, 1);
  store.planNotes.plan_claims = { text: "Keep 'relaxing'", at: new Date().toISOString() };
  const t = X.answersText(index, store, QUESTIONNAIRE);
  assert.ok(t.includes("--- Magnesium Oil Spray ---"));
  assert.ok(t.includes("[p.mg_oil.lasts] How long does one pack last with normal use? (Needed)\n  Answer: About 2 months"));
  const p = X.planText(PLAN, store);
  assert.ok(p.includes("==== Careful wording about health [plan_claims] ===="));
  assert.ok(p.includes("Notes: Keep 'relaxing'"));
  assert.strictEqual(X.planRows(PLAN, store).length, PLAN.sections.length);
});

console.log(`\n${passed} tests passed`);
