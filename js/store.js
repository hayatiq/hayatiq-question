/*
 * Answers and notes in localStorage, keyed only by stable ids. No UI code here.
 *
 * Saved shape (key STORE_KEY):
 * { schema: 1,
 *   answers:   { [questionId]: { v, note, optNotes: {optionId: text}, labels: {optionId: label},
 *                                q: question text, section: section title, ver, at } },
 *   planNotes: { [planSectionId]: { text, at } },
 *   savedAt }
 * `labels`, `q` and `section` are copies taken when the owner answered, so an answer still
 * makes sense after the question or option is renamed or removed. Nothing is ever deleted
 * because the questionnaire changed.
 */
const STORE_KEY = "hayatiq-question:v1";
const STORE_SCHEMA = 1;

const YES_NO_DEFAULT = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

function optionsOf(q) {
  return q.options || (q.type === "yesno" ? YES_NO_DEFAULT : []);
}

function isChoice(q) {
  return q.type === "single" || q.type === "multi" || q.type === "yesno";
}

// Product questions are built from the product list: asked fields first ("Needed"), then the rest.
function sectionQuestions(section, fields) {
  if (!section.products) return section.questions;
  return section.products.flatMap((p) => {
    const asked = p.ask.map((id) => fields.find((f) => f.id === id)).filter(Boolean);
    const rest = fields.filter((f) => !p.ask.includes(f.id));
    return [...asked, ...rest].map((f) => ({
      ...f,
      id: `p.${p.id}.${f.id}`,
      productId: p.id,
      productName: p.name,
      required: p.ask.includes(f.id),
    }));
  });
}

// Flat list of every current question, each with its section. Also an id -> question map.
function indexQuestions(qn, fields) {
  const list = [];
  for (const s of qn.sections) {
    for (const q of sectionQuestions(s, fields)) list.push({ ...q, sectionId: s.id, sectionTitle: s.title });
  }
  return { list, byId: Object.fromEntries(list.map((q) => [q.id, q])) };
}

function emptyStore() {
  return { schema: STORE_SCHEMA, answers: {}, planNotes: {}, savedAt: null };
}

// Returns { store, corrupt }. A broken saved value is handed back (corrupt) so the app can keep a copy.
function parseStore(raw) {
  if (!raw) return { store: emptyStore(), corrupt: null };
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { store: emptyStore(), corrupt: raw };
  }
  if (!data || typeof data !== "object") return { store: emptyStore(), corrupt: raw };
  // Future schema changes migrate here, step by step, without dropping fields.
  return {
    store: {
      ...data,
      schema: STORE_SCHEMA,
      answers: data.answers && typeof data.answers === "object" ? data.answers : {},
      planNotes: data.planNotes && typeof data.planNotes === "object" ? data.planNotes : {},
    },
    corrupt: null,
  };
}

function hasValue(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return typeof v === "string" && v.trim() !== "";
}

function selectedIds(a) {
  if (!a || !hasValue(a.v)) return [];
  return Array.isArray(a.v) ? a.v : [a.v];
}

// A question with showIf is visible only when the question it depends on is visible and matches.
function isVisible(q, store, byId, depth = 0) {
  if (!q.showIf) return true;
  const target = byId[q.showIf.q];
  if (!target || depth > 10) return true; // broken link: show rather than hide silently
  if (!isVisible(target, store, byId, depth + 1)) return false;
  const picked = selectedIds(store.answers[target.id]);
  if (!picked.length) return false;
  const list = (x) => (Array.isArray(x) ? x : [x]);
  if (q.showIf.is !== undefined) return picked.some((id) => list(q.showIf.is).includes(id));
  if (q.showIf.not !== undefined) return !picked.some((id) => list(q.showIf.not).includes(id));
  return true;
}

function noteOf(a) {
  return a && typeof a.note === "string" ? a.note.trim() : "";
}

// "answered" | "note_only" | "empty" | "hidden"
function statusOf(q, store, byId) {
  if (!isVisible(q, store, byId)) return "hidden";
  const a = store.answers[q.id];
  if (a && hasValue(a.v)) return "answered";
  if (noteOf(a)) return "note_only";
  return "empty";
}

const STATUS_LABEL = {
  answered: "Answered",
  note_only: "Note only",
  empty: "Not answered",
  hidden: "Not needed (skipped by an earlier answer)",
};

// Merge a change into one answer. Choice answers keep a copy of the chosen option labels.
function setAnswer(store, q, patch, version) {
  const prev = store.answers[q.id] || {};
  const next = { ...prev, ...patch, q: q.label, section: q.productName ? `${q.sectionTitle} — ${q.productName}` : q.sectionTitle, ver: version, at: new Date().toISOString() };
  if (isChoice(q)) {
    const labels = { ...(prev.labels || {}) };
    for (const o of optionsOf(q)) if (selectedIds(next).includes(o.id)) labels[o.id] = o.label;
    next.labels = labels;
  }
  const optNotes = next.optNotes || {};
  const empty = !hasValue(next.v) && !noteOf(next) && !Object.values(optNotes).some((t) => t && t.trim());
  if (empty) delete store.answers[q.id];
  else store.answers[q.id] = next;
  return store;
}

// Human-readable answer. An option that no longer exists keeps its saved label, marked as older.
function answerText(q, a) {
  if (!a || !hasValue(a.v)) return "";
  if (!isChoice(q)) return String(a.v);
  const opts = optionsOf(q);
  return selectedIds(a)
    .map((id) => {
      const o = opts.find((x) => x.id === id);
      if (o) return o.label;
      return `${(a.labels && a.labels[id]) || id} (older choice)`;
    })
    .join("; ");
}

function optionNotesText(q, a) {
  if (!a || !a.optNotes) return "";
  const opts = optionsOf(q);
  return selectedIds(a)
    .filter((id) => a.optNotes[id] && a.optNotes[id].trim())
    .map((id) => {
      const o = opts.find((x) => x.id === id);
      const label = o ? o.label : (a.labels && a.labels[id]) || id;
      return `${label}: ${a.optNotes[id].trim()}`;
    })
    .join("; ");
}

// Selected ids that are no longer options of the question.
function olderChoices(q, a) {
  const ids = optionsOf(q).map((o) => o.id);
  return selectedIds(a).filter((id) => !ids.includes(id));
}

function progress(questions, store, byId) {
  let needed = 0, neededDone = 0, total = 0, done = 0;
  for (const q of questions) {
    const s = statusOf(q, store, byId);
    if (s === "hidden") continue;
    total++;
    if (s === "answered") done++;
    if (q.required) {
      needed++;
      if (s === "answered") neededDone++;
    }
  }
  return { needed, neededDone, total, done };
}

// Answers saved for questions that are no longer in the questionnaire.
function orphanAnswers(store, byId) {
  return Object.entries(store.answers)
    .filter(([id]) => !byId[id])
    .map(([id, a]) => ({ id, a }));
}

if (typeof module !== "undefined")
  module.exports = { STORE_KEY, optionsOf, isChoice, sectionQuestions, indexQuestions, emptyStore, parseStore, hasValue, selectedIds, isVisible, statusOf, STATUS_LABEL, setAnswer, answerText, optionNotesText, olderChoices, progress, orphanAnswers, noteOf };
