/*
 * Exports: answers and plan notes as Excel (.xlsx) or plain text, plus a full backup file.
 * The row builders are pure (tested in tests/store.test.js); the download helpers need a browser.
 * Uses store.js helpers (globals in the browser, require() in Node).
 */
if (typeof module !== "undefined" && typeof indexQuestions === "undefined") {
  Object.assign(globalThis, require("./store.js"));
}

const ANSWER_COLUMNS = ["Section", "Product", "Question ID", "Question", "Needed?", "Status", "Answer", "Selected option IDs", "Option notes", "Notes", "Last updated"];
const PLAN_COLUMNS = ["Section", "Section ID", "Plan items in this section", "Your notes", "Last updated"];

function stamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function answerRows(index, store) {
  const rows = index.list.map((q) => {
    const a = store.answers[q.id];
    return [
      q.sectionTitle,
      q.productName || "",
      q.id,
      q.label,
      q.required ? "Needed" : "Optional",
      STATUS_LABEL[statusOf(q, store, index.byId)],
      answerText(q, a),
      isChoice(q) ? selectedIds(a).join(", ") : "",
      optionNotesText(q, a),
      noteOf(a),
      stamp(a && a.at),
    ];
  });
  for (const { id, a } of orphanAnswers(store, index.byId)) {
    const q = { id, label: a.q || id, type: Array.isArray(a.v) ? "multi" : a.labels ? "single" : "text", options: [] };
    rows.push(["Removed or changed questions", a.section || "", id, a.q || "", "", "Answered earlier", answerText(q, a), isChoice(q) ? selectedIds(a).join(", ") : "", optionNotesText(q, a), noteOf(a), stamp(a.at)]);
  }
  return rows;
}

function planRows(plan, store) {
  return plan.sections.map((s) => {
    const n = store.planNotes[s.id];
    return [s.title, s.id, s.items.map((i) => `${i.title} [${i.id}]`).join("; "), (n && n.text) || "", stamp(n && n.at)];
  });
}

function answersText(index, store, qn, now = new Date()) {
  const p = progress(index.list, store, index.byId);
  const out = [
    "HAYATIQ — Information for the website",
    `Exported: ${stamp(now.toISOString())} · Questionnaire version ${qn.version}`,
    `Needed answers: ${p.neededDone} of ${p.needed} · All answers: ${p.done} of ${p.total}`,
    "",
  ];
  let section = null, product = null;
  for (const r of answerRows(index, store)) {
    const [sec, prod, id, label, needed, status, answer, , optNotes, note] = r;
    if (sec !== section) {
      out.push("", `==== ${sec.toUpperCase()} ====`);
      section = sec;
      product = null;
    }
    if (prod && prod !== product) {
      out.push("", `--- ${prod} ---`);
      product = prod;
    }
    out.push("", `[${id}] ${label}${needed ? ` (${needed})` : ""}`);
    out.push(`  Answer: ${answer || "—"}`);
    if (optNotes) out.push(`  Option notes: ${optNotes}`);
    if (note) out.push(`  Note: ${note.replace(/\n/g, "\n        ")}`);
    out.push(`  Status: ${status}`);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function planText(plan, store, now = new Date()) {
  const out = ["HAYATIQ — Notes on our improvement plan", `Exported: ${stamp(now.toISOString())}`, ""];
  for (const [title, id, items, note, at] of planRows(plan, store)) {
    out.push(`==== ${title} [${id}] ====`, `Plan items: ${items}`, `Notes: ${note ? note.replace(/\n/g, "\n       ") : "(no notes)"}`);
    if (at) out.push(`Last updated: ${at}`);
    out.push("");
  }
  return out.join("\n");
}

/* ---------- browser only ---------- */

function fileDate() {
  return stamp(new Date().toISOString()).slice(0, 10);
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadText(name, text) {
  downloadBlob(name, new Blob([text], { type: "text/plain;charset=utf-8" }));
}

let xlsxLoading = null;
// The Excel library (~250 KB) loads only when someone exports.
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  xlsxLoading =
    xlsxLoading ||
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "vendor/xlsx.mini.min.js";
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => {
        xlsxLoading = null;
        reject(new Error("Could not load the Excel tool. Check the internet connection."));
      };
      document.head.appendChild(s);
    });
  return xlsxLoading;
}

async function downloadXlsx(name, sheetName, columns, rows, widths) {
  const XLSX = await loadXlsx();
  const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!autofilter"] = { ref: ws["!ref"] };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, name);
}

if (typeof module !== "undefined") module.exports = { answerRows, planRows, answersText, planText, ANSWER_COLUMNS, PLAN_COLUMNS };
