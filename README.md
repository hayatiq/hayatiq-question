# HAYATIQ · Website Questions

A small, phone-first page for the HAYATIQ owner. It has three tabs:

1. **Questions**: what we need to know (brand, product facts, reviews, customer questions, proof, language, sales channels, opinions). It opens on a topic list with the overall progress (% answered, how many left, in which topics) and a "Continue where you left off" button. Each topic is its own screen with its own progress and a "next unanswered question" button. Progress counts every main question plus each product's "Needed" fields; the optional "More details" fields don't count.
2. **Our Plan**: what we want to improve on the website and why, in plain words, with a notes box per topic.
3. **Roadmap**: the five proposed phases and how we will measure progress.

There is no login and no server. Answers save in the owner's browser (localStorage). The owner sends them back as an Excel or text file.
This repo is public, so never put passwords, tokens or private customer data in it.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` straight from disk also works, apart from the Excel export (browsers block loading the Excel script from `file://`).

## Build

None. The files are deployed as they are.

## Deploy to GitHub Pages

1. Push to `main` on GitHub (repo `hayatiq/hayatiq-question`).
2. GitHub → Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. After about a minute it is live at `https://hayatiq.github.io/hayatiq-question/`.

`.nojekyll` stops GitHub from processing the files. The page has `noindex` so search engines don't list it.

## Files

| File | What it holds |
|---|---|
| `js/questions.js` | All questions and the product list. Content only. |
| `js/plan.js` | "Our Plan" topics and the Roadmap. Content only. |
| `js/store.js` | Saving, loading, answer status, conditions. No UI. |
| `js/export.js` | Excel and text exports, backup file. |
| `js/app.js` | Draws the tabs, handles typing and taps, links between tabs. |
| `css/app.css` | Styles (colours follow the shop's theme). |
| `vendor/xlsx.mini.min.js` | SheetJS 0.18.5, only loaded when someone exports to Excel. |
| `tests/` | `store.test.js` (Node) and `e2e.test.js` (a real browser at phone size). |

## How question IDs work

Answers are saved under the question `id` and the option `id`, never under the wording. So:

- **Change wording freely.** Labels, help text and order can change any time.
- **Never rename or reuse an id.** A new id means a new, empty question.
- **Adding** a question or option: give it a new id. It shows up unanswered; nothing else changes.
- **Removing** an option: just delete it. If the owner had picked it, the answer is kept. The page shows it as an "older choice", and exports show its saved label with "(older choice)".
- **Removing** a question: delete it. Its answer is kept and exported under "Removed or changed questions".
- **Product questions** are built from `PRODUCTS` × `PRODUCT_FIELDS` with the id `p.<product id>.<field id>`, so product ids and field ids are permanent too. A product's `ask` list says which fields are "Needed"; the others sit under "More details".
- Raise `QUESTIONNAIRE.version` when you change questions. Each answer stores the version it was given under.

## How saving works (localStorage)

- One key: `hayatiq-question:v1`. Shape: `{ schema, answers, planNotes, savedAt }`, described at the top of `js/store.js`.
- Each answer stores its value, note, notes per option, and copies of the question text and chosen option labels. The copies are what keeps old answers readable after the wording changes.
- It saves about 0.3 s after each change and when the tab is hidden. The header shows "Saving…", "Saved ✓" or a red "Not saved!".
- Unreadable saved data is never overwritten: it is copied to `hayatiq-question:unreadable-<time>` first.
- Data lives in one browser on one phone. Some phones (iPhone Safari) clear site data that isn't used for a while. The owner can use **Backup and restore** (a JSON file) to keep a copy or move to another phone. A restore keeps the old data as `hayatiq-question:before-restore-<time>`.
- If the storage format ever changes, raise `STORE_SCHEMA` and migrate in `parseStore()` without dropping fields.

## Add or change a question

In `js/questions.js`, add an object to a section's `questions`:

```js
{ id: "sales_delivery_partner", type: "single", label: "Which courier do you use?",
  help: "Optional short help.", required: false,
  options: [{ id: "pathao", label: "Pathao" }, { id: "steadfast", label: "Steadfast" },
            { id: "other", label: "Other", note: "Which one?" }] }
```

- `type`: `text`, `longtext`, `number`, `single`, `multi`, `yesno` (yes / no / not sure by default).
- `note` on an option adds a small text box under it when it is ticked. `optionNotes: "placeholder"` adds one under every ticked option.
- `showIf: { q: "rev_have", is: "yes" }` shows the question only for that answer. `is`/`not` take one option id or a list. Conditions can chain.
- Every question gets a notes box automatically.
- A new section is a new object in `sections` with a new `id`, a `title` and a short `intro`.

## Add or change a plan item

In `js/plan.js`, add an item to a section's `items` (keys are listed at the top of the file):

```js
{ id: "prod_bundles", title: "Gift bundles",
  now: "…", found: "…", evidence: "research", // checked | research | hypothesis
  plan: "…", why: "…", benefit: "…", hypothesis: "…",
  input: "What we need from the owner.",
  questions: ["sales_top"], sections: ["products"] }
```

- `questions` makes "Answer related question →" links. The questions get a "View why we need this →" link back automatically. Links are many-to-many.
- `sections` links to a whole question section. Its questions link back only if no item names them directly.
- Plan notes are saved per plan **section** id, so keep those ids permanent.
- Links are hashes: `#q` (topic list), `#q/<section>` (one topic), `#q/<section>/<question id>`, `#plan/<section>/<item id>`, `#road`.

## Tests

```bash
node tests/store.test.js        # data checks: unique ids, valid links, answers surviving changes
PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node tests/e2e.test.js
```

The browser test opens the page at phone size and checks typing, choices, notes, conditions, reload, links both ways, Back, exports (it reads the Excel file back) and older answers. It uses Chrome at `/usr/bin/google-chrome` (or `CHROME=…`). `SHOTS=<folder>` saves screenshots.

Run `node tests/store.test.js` after every content edit. It catches duplicate ids and links to missing questions.
