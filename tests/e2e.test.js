// Browser test on a phone-sized screen. Run: node tests/e2e.test.js
// Needs playwright-core and Chrome: set PLAYWRIGHT_CORE (path to the package) and CHROME (browser path)
// if the defaults below don't exist. SHOTS=<folder> saves screenshots.
const assert = require("assert");
const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const ROOT = path.join(__dirname, "..");
const SHOTS = process.env.SHOTS;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

function readXlsx(file) {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "vendor/xlsx.mini.min.js"), "utf8"), ctx);
  const wb = ctx.XLSX.read(fs.readFileSync(file), { type: "buffer" });
  return JSON.parse(JSON.stringify(ctx.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }))); // plain arrays, not the vm realm's
}

const inView = (page, sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return !el.closest("[hidden]") && r.top < innerHeight && r.bottom > 0; });

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const step = (s) => console.log("ok -", s);
  const shot = (name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  const q = (id) => `[id="q-${id}"]`;

  await page.goto(base);
  await shot("1-questions");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page scrolls sideways");
  assert.ok(await page.isVisible("#qOverview") && !(await page.isVisible("#qs-brand")), "should start on the topic list");
  assert.ok((await page.textContent("#ovTitle")).startsWith("0 of "), "overall count");
  const total = Number((await page.textContent("#ovTitle")).match(/of (\d+)/)[1]);
  step(`loads on a phone screen on the topic list (${total} questions), no sideways scroll`);

  // Answer a few kinds of question.
  await page.click('[data-topic="brand"]');
  assert.ok(await page.isVisible("#strip"), "overall progress strip on a topic page");
  await page.fill(`${q("brand_business_name")} input.in`, "HAYATIQ");
  await page.click(`${q("brand_business_name")} .add-note`);
  await page.fill(`${q("brand_business_name")} textarea.note`, "Same as trade licence");
  await page.check(`${q("brand_display_name")} input[value="upper"]`);
  await page.check(`${q("brand_tagline_choice")} input[value="t_own"]`);
  assert.ok(await page.isVisible(`${q("brand_tagline_choice")} .opt-note[data-opt="t_own"]`), "option note box should show");
  await page.fill(`${q("brand_tagline_choice")} .opt-note[data-opt="t_own"]`, "Pure. Handmade. Ours.");
  assert.ok(!(await page.isVisible(q("brand_story"))), "story question should be hidden until yes");
  await page.check(`${q("brand_story_has")} input[value="yes"]`);
  assert.ok(await page.isVisible(q("brand_story")), "story question should appear");
  await shot("2-brand-section");
  assert.strictEqual(await page.textContent("#stripPct"), `${Math.round((4 / total) * 100)}%`);
  assert.ok((await page.textContent('[data-text-sec="brand"]')).startsWith("4 of "), "topic progress");
  step("text, note, single choice, option note, conditional question, progress updates");

  await page.click('#qs-brand a.btn[href="#q/products"]');
  assert.ok((await page.isVisible("#qs-products")) && !(await page.isVisible("#qs-brand")), "Next topic should show only that topic");
  await page.click("#prod-mg_oil > summary");
  await page.fill(`${q("p.mg_oil.lasts")} input.in`, "About 2 months");
  await shot("3-product");
  await page.click("#qs-products .back-link");
  await page.click('[data-topic="reviews"]');
  await page.check(`${q("rev_have")} input[value="yes"]`);
  await page.check(`${q("rev_where")} input[value="daraz"]`);
  await page.check(`${q("rev_where")} input[value="messenger"]`);
  await page.fill(`${q("rev_where")} .opt-note[data-opt="daraz"]`, "about 5");
  step("product field and multi choice with option note");

  await page.waitForFunction(() => document.getElementById("saveState").textContent.includes("Saved"));
  await page.reload();
  await page.goto(`${base}#q/brand`);
  assert.strictEqual(await page.inputValue(`${q("brand_business_name")} input.in`), "HAYATIQ");
  assert.strictEqual(await page.inputValue(`${q("brand_business_name")} textarea.note`), "Same as trade licence");
  assert.ok(await page.isChecked(`${q("brand_display_name")} input[value="upper"]`));
  assert.strictEqual(await page.inputValue(`${q("brand_tagline_choice")} .opt-note[data-opt="t_own"]`), "Pure. Handmade. Ours.");
  assert.ok(await page.isVisible(q("brand_story")));
  await page.goto(`${base}#q/reviews`);
  assert.strictEqual(await page.inputValue(`${q("rev_where")} .opt-note[data-opt="daraz"]`), "about 5");
  assert.ok(await page.isChecked(`${q("rev_where")} input[value="messenger"]`));
  step("everything is still there after a reload");

  // "Continue" jumps to the first unanswered Needed question, and the topic list shows what is left.
  await page.goto(`${base}#q`);
  assert.ok((await page.textContent('[data-progress-sec="brand"]')).includes("left"));
  await page.click("#continueBtn");
  await page.waitForTimeout(500);
  assert.ok(await inView(page, q("p.mg_oil.name")), "Continue should go to the first open Needed question");
  await page.goto(`${base}#q/customers`);
  await page.click('[data-missing="customers"]');
  await page.waitForTimeout(500);
  assert.ok(await inView(page, q("cq_before")), "next unanswered in this topic");
  step("Continue and 'next unanswered' buttons find the open questions");

  // Plan -> question -> back.
  await page.click('.tabs a[data-tab="plan"]');
  await page.click("#ps-plan_products > summary");
  await shot("4-plan");
  await page.click('#pi-prod_names a[href="#q/products/p.mg_oil.name"]');
  assert.ok(await page.isVisible("#tab-q") && !(await page.isVisible("#tab-plan")));
  assert.ok(await page.$eval("#prod-mg_oil", (d) => d.open), "product should open");
  await page.waitForTimeout(700);
  assert.ok(await inView(page, q("p.mg_oil.name")), "linked question should be on screen");
  assert.ok(await page.$eval(q("p.mg_oil.name"), (el) => el.classList.contains("flash")));
  assert.ok(await page.isVisible("#backChip"));
  await shot("5-jumped-to-question");
  await page.click("#backChip");
  await page.waitForTimeout(700);
  assert.ok(await page.isVisible("#tab-plan"));
  assert.ok(await inView(page, "#pi-prod_names"), "back should return to the plan item");
  step("plan -> question -> back returns to the same plan item");

  // Question -> plan (an "optional" product field inside "More details" too).
  await page.goto(`${base}#q/brand/brand_tagline_choice`);
  await page.waitForTimeout(500);
  await page.click(`${q("brand_tagline_choice")} a.xlink`);
  await page.waitForTimeout(700);
  assert.ok(await page.isVisible("#tab-plan") && (await inView(page, "#pi-brand_same")));
  await page.goBack();
  await page.waitForTimeout(700);
  assert.ok(await inView(page, q("brand_tagline_choice")), "browser Back should return to the question");
  await page.goto(`${base}#q/products/p.pain_salve.storage`);
  await page.waitForTimeout(600);
  assert.ok(await page.$eval("#more-pain_salve", (d) => d.open) && (await inView(page, q("p.pain_salve.storage"))));
  step("question -> plan, browser Back, deep link into optional fields");

  // Plan notes.
  await page.goto(`${base}#plan/plan_claims`);
  await page.fill('[data-plan-note="plan_claims"]', "Keep the word 'relaxing'");
  await page.waitForFunction(() => document.getElementById("saveState").textContent.includes("Saved"));
  await page.reload();
  assert.strictEqual(await page.inputValue('[data-plan-note="plan_claims"]'), "Keep the word 'relaxing'");
  assert.ok(await page.isVisible('[data-note-flag="plan_claims"]'));
  step("plan notes save and show a note flag");

  // Exports.
  const dl = async (sel) => { const [d] = await Promise.all([page.waitForEvent("download"), page.click(sel)]); const f = path.join(require("os").tmpdir(), d.suggestedFilename()); await d.saveAs(f); return f; };
  await page.goto(`${base}#q`);
  const xlsx = await dl("#expXlsx");
  const rows = readXlsx(xlsx);
  assert.deepStrictEqual(rows[0].slice(0, 4), ["Section", "Product", "Question ID", "Question"]);
  const biz = rows.find((r) => r[2] === "brand_business_name");
  assert.strictEqual(biz[6], "HAYATIQ");
  assert.strictEqual(biz[9], "Same as trade licence");
  const tag = rows.find((r) => r[2] === "brand_tagline_choice");
  assert.ok(String(tag[8]).includes("Pure. Handmade. Ours."));
  const where = rows.find((r) => r[2] === "rev_where");
  assert.strictEqual(where[7], "messenger, daraz"); // option order, not click order
  const txt = fs.readFileSync(await dl("#expTxt"), "utf8");
  assert.ok(txt.includes("[p.mg_oil.lasts]") && txt.includes("About 2 months"));
  await page.goto(`${base}#plan`);
  const prow = readXlsx(await dl("#pexpXlsx")).find((r) => r[1] === "plan_claims");
  assert.strictEqual(prow[3], "Keep the word 'relaxing'");
  const ptxt = fs.readFileSync(await dl("#pexpTxt"), "utf8");
  assert.ok(ptxt.includes("Keep the word 'relaxing'"));
  step("Excel and text exports for answers and plan notes");

  // A questionnaire change: an option and a question that no longer exist.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("hayatiq-question:v1"));
    s.answers.brand_display_name = { v: "legacy", labels: { legacy: "HaYaTiQ (old style)" }, q: "How should the brand name be written?", section: "Brand", ver: 0 };
    s.answers.old_question = { v: "kept", q: "A question we removed", section: "Old section", ver: 0 };
    localStorage.setItem("hayatiq-question:v1", JSON.stringify(s));
  });
  await page.goto(`${base}#q/brand/brand_display_name`);
  await page.reload(); // goto only changed the hash
  await page.waitForTimeout(500);
  assert.ok((await page.textContent(`${q("brand_display_name")} .older-warn`)).includes("HaYaTiQ (old style)"));
  assert.ok((await page.textContent("#tab-q")).includes("1 earlier answer(s)"));
  await page.goto(`${base}#q`); // the export buttons are on the topic list
  const txt2 = fs.readFileSync(await dl("#expTxt"), "utf8");
  assert.ok(txt2.includes("[old_question] A question we removed") && txt2.includes("Answer: kept"));
  assert.ok(txt2.includes("HaYaTiQ (old style) (older choice)"));
  step("older options and removed questions are kept and exported");

  await page.goto(`${base}#road`);
  await page.click("#ph-ph1 > summary");
  await shot("6-roadmap");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "roadmap scrolls sideways");
  await page.goto(`${base}#plan`);
  for (const d of await page.$$("#tab-plan details.sec")) await d.evaluate((el) => (el.open = true));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "plan scrolls sideways");
  step("roadmap and fully open plan fit the phone width");

  assert.deepStrictEqual(errors, [], "console errors");
  step("no console errors");
  await browser.close();
  server.close();
  console.log("\nall browser checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
