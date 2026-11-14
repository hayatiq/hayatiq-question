/*
 * "Our Plan" and "Roadmap" content. No UI code. See README.md "Plan items".
 *
 * Section and item ids are permanent: notes are saved under the section id, and links use both.
 * Item keys (all optional except id/title):
 *   now        what the website has today
 *   found      the problem or opportunity; `evidence` says how we know it:
 *              "checked" (we looked ourselves), "research" (seen in Google suggestions or search),
 *              "hypothesis" (AI research idea, still needs checking)
 *   plan, why, benefit   our proposal, why it matters, what we hope it brings
 *   example    a short example box;  hypothesis  an "AI research hypothesis" box
 *   input      what we need from the owner;  questions [question ids], sections [question section ids]
 *   cards      list of {problem, search, want, product, content, evidence} (customer research)
 *   tiers      list of {level, why, terms[]} (keyword priorities)
 *   kinds      list of {name, example, meaning}
 *   rows       list of [left, right] pairs shown as a two-column table, with `rowHead` [left, right]
 *   list       list of {name, text}
 */
const PLAN = {
  sections: [
    {
      id: "plan_brand",
      title: "Brand name & consistency",
      summary: "One name and one tagline everywhere, so people know it is you.",
      items: [
        {
          id: "brand_same",
          title: "Use one name and one tagline everywhere",
          now: "Instagram says “Handcrafted Skincare”. Facebook says “Handcrafted wellness essentials for conscious souls”. The website says “Handcrafted with Intention” and “Natural Self-Care for Everyday You”.",
          found: "Four different short descriptions of the same shop.",
          evidence: "checked",
          plan: "Choose one way to write the name and one tagline. Use them on the website, Facebook, Instagram, Daraz and Packly.",
          why: "When every profile looks and sounds the same, customers recognise the shop and trust it more. Google and AI tools also find it easier to see that these profiles belong to one brand. Small wording differences don't cause a penalty. This is about being easy to recognise.",
          benefit: "Easier to recognise and to trust.",
          input: "Please choose the official name style and tagline.",
          questions: ["brand_display_name", "brand_diff_taglines", "brand_tagline_choice"],
        },
        {
          id: "brand_story",
          title: "Tell customers who makes the products",
          now: "The “Our Story” page has one sentence. It does not say who makes the products or where.",
          found: "Shops that show a real maker and a real place earn more trust, especially for products you put on your skin.",
          evidence: "checked",
          plan: "A short “Our Story” page: who makes the products, where, since when and why. A photo only if you are comfortable.",
          why: "People like to buy from real people. Search engines and AI tools also prefer shops with a clear identity.",
          benefit: "More trust for first-time buyers.",
          input: "Your story in a few lines, and how much you want to share.",
          questions: ["brand_story_has", "brand_story", "brand_maker_show", "brand_location"],
        },
        {
          id: "brand_links",
          title: "Link all your pages to each other",
          now: "The Instagram bio says “DM to order” but does not link to the website. We could not find the Daraz and Packly shops.",
          evidence: "checked",
          plan: "The website links to Facebook, Instagram, Daraz and Packly, and each of them links back to the website.",
          why: "Customers can move between your pages easily, and search tools can see that they all belong to HAYATIQ.",
          benefit: "More visits to the website, where the full product details are.",
          input: "The links to your Daraz and Packly shops.",
          questions: ["sales_links"],
        },
      ],
    },
    {
      id: "plan_products",
      title: "Product pages",
      summary: "Clear names and full, useful details on every product.",
      items: [
        {
          id: "prod_names",
          title: "Clear product names with size or strength",
          now: "The three magnesium oil pages all have the same title, “Magnesium Oil Spray — Hayatiq”. In Google, their description is the slogan “Nature's Calm in Every Spray”.",
          found: "People search like “magnesium oil price in bangladesh”. Our titles don't say price, size or Bangladesh.",
          evidence: "checked",
          plan: "Give each page its own clear title, for example “Magnesium Oil Spray 30% 100ml – Price in Bangladesh”.",
          why: "A clear title tells a searcher at once that this is the product they want. It also stops our own three pages from competing with each other.",
          benefit: "More of the right people click through from Google.",
          input: "Do you agree with names that include size or strength? Confirm the official names.",
          questions: ["dec_naming", "p.mg_oil.name", "p.mg_oil.variants"],
        },
        {
          id: "prod_details",
          title: "Fill in the short product pages",
          now: "11 of 19 product pages have only one sentence: Detox and Silkroot Shampoo Bars, Scalp Elixir, Bath Bomb, Bath Bomb Set, Footsoak, Pain Relief Salve, Toilet Pods, both Handwash Tablet packs and All-Purpose Tablets.",
          found: "No ingredients, no how-to and no answers to common questions on these pages.",
          evidence: "checked",
          plan: "Add the ingredients, size, how to use, who it is for, how to store it, and 4–6 common questions to every product page.",
          why: "Customers can't buy with confidence when basic facts are missing. Google also sees very short pages as less useful, so it shows them less.",
          benefit: "More trust, fewer “what's inside?” messages, and pages that can show up in search.",
          input: "The product facts. Skip anything you don't know yet.",
          sections: ["products"],
          questions: ["lang_more_detail", "lang_can_provide", "dec_descriptions", "ev_ingredients_source"],
        },
        {
          id: "prod_photos",
          title: "Real photos for three products",
          now: "Pain Relief Salve, both Handwash Tablet packs and All-Purpose Tablets show a placeholder picture.",
          evidence: "checked",
          plan: "Replace the placeholder with real photos. A plain phone photo in daylight is fine.",
          why: "People rarely buy what they can't see.",
          benefit: "These products can finally be shown on the homepage.",
          input: "Can you send photos?",
          questions: ["p.pain_salve.photo", "p.handwash_tablets.photo", "p.allpurpose_tablets.photo"],
        },
        {
          id: "prod_lasts",
          title: "Show how long a product lasts",
          now: "Pages show the price, but not how long one pack lasts.",
          plan: "Add a line like “about 60 washes per bar” or “about 2 months per bottle”.",
          why: "It helps a customer compare a ৳700 bar with a cheaper bottle of shampoo.",
          hypothesis: "Price may be one reason people don't order. Research shows buyers compare bars with cheap bottles. Showing the cost per use may help. We need your real numbers, so this is not proven yet.",
          input: "How long one pack lasts, for each product.",
          questions: ["p.mg_oil.lasts", "p.detox_shampoo.lasts", "p.conditioner_bar.lasts", "cq_blockers"],
        },
      ],
    },
    {
      id: "plan_categories",
      title: "Category pages",
      summary: "Turn product lists into small, helpful guides.",
      items: [
        {
          id: "cat_intro",
          title: "Add a short guide to each category",
          now: "A category page (for example Hair Care) only shows a list of products. It has no text of its own, and Google is not told about it.",
          found: "Many people search for a type of product, like “shampoo bar in Bangladesh”, not a product name. A plain list doesn't answer them.",
          evidence: "checked",
          plan: "Add 2–4 sentences about the category, a “Which one is right for me?” table and 2–3 common questions.",
          why: "It helps customers choose the right product, and gives Google a page to show for those wider searches.",
          benefit: "Visitors pick the right product faster.",
          example: "Hair Care — Which bar is right for me?\n• Oily scalp → Detox Shampoo Bar\n• Sensitive scalp → Silkroot Shampoo Bar\n• Tangles and dry ends → Solid Conditioner Bar\nQ: Do shampoo bars work in hard water?",
          input: "Do you agree? Would you rename or regroup any categories?",
          questions: ["dec_categories", "dec_category_names"],
        },
      ],
    },
    {
      id: "plan_needs",
      title: "What customers are looking for",
      summary: "Real problems people search for, and the product that fits.",
      items: [
        {
          id: "needs_research",
          title: "Problems people search for",
          found: "We collected the words people really type into Google in Bangladesh, in English and Bangla. These are Google's own search suggestions. They show what people type, not how many people.",
          evidence: "research",
          cards: [
            { problem: "Trouble sleeping", search: "magnesium oil for sleep · ঘুমের সমস্যা দূর করার উপায়", want: "Simple things to try at night, and whether it is safe", product: "Magnesium Oil Spray", content: "A guide: how people use magnesium oil at bedtime, with honest limits", evidence: "research" },
            { problem: "Leg cramps at night", search: "পায়ের রগে টান লাগলে করণীয় · how to use magnesium oil for leg cramps", want: "Why it happens, what to do now, when to see a doctor", product: "Magnesium Oil Spray", content: "A Bangla guide on leg cramps", evidence: "research" },
            { problem: "Worried about tingling", search: "magnesium oil side effects itching", want: "Is the tingle normal? How to avoid it?", product: "Magnesium Oil Spray", content: "Common questions on the product page", evidence: "research" },
            { problem: "Unsure about shampoo bars", search: "shampoo bar vs liquid shampoo · why do shampoo bars make hair greasy", want: "Will it work with our water and heat?", product: "Shampoo and conditioner bars", content: "A guide to switching to bars in Bangladesh", evidence: "research" },
            { problem: "Oily scalp or dandruff", search: "shampoo bar oily scalp · খুশকির জন্য কোন শ্যাম্পু ভালো", want: "Which product suits my scalp?", product: "Detox or Silkroot Shampoo Bar", content: "“Which bar for my scalp” on the Hair Care page", evidence: "research" },
            { problem: "Bad breath", search: "মুখে দুর্গন্ধ দূর করার উপায় · জিভ পরিষ্কার করার যন্ত্র", want: "Simple home steps", product: "Copper Tongue Scraper, Dental Floss", content: "A Bangla guide on tongue cleaning", evidence: "research" },
            { problem: "Checking the price", search: "… price in bangladesh (magnesium oil, shampoo bar, tongue scraper, toilet cleaner tablet, foaming hand wash, bath bomb)", want: "A clear price and size", product: "All products", content: "Price and size in the page title", evidence: "research" },
            { problem: "Less plastic, refills", search: "হ্যান্ডওয়াশ রিফিল প্যাক · toilet cleaner tablet how to use", want: "How it works and what it saves", product: "Handwash Tablets, Toilet Pods", content: "Clear how-to and cost comparison", evidence: "research" },
          ],
          input: "Your real customer questions are the best source. They will improve this list a lot.",
          questions: ["cq_before", "cq_problems", "cq_blockers", "cq_misunderstand"],
        },
      ],
    },
    {
      id: "plan_keywords",
      title: "Search words (keywords)",
      summary: "Which searches matter most, and why.",
      items: [
        {
          id: "kw_what",
          title: "What a keyword is",
          plan: "A keyword is simply the words someone types into Google. People type different things depending on where they are in their decision.",
          kinds: [
            { name: "Learning", example: "what is magnesium oil", meaning: "Curious, not buying yet." },
            { name: "Has a problem", example: "leg cramps at night", meaning: "Looking for a solution. Could become a customer." },
            { name: "Comparing", example: "shampoo bar vs liquid shampoo", meaning: "Close to deciding." },
            { name: "Ready to buy", example: "magnesium oil price in bangladesh", meaning: "Wants to order now. Most valuable." },
          ],
        },
        {
          id: "kw_priority",
          title: "Our priorities",
          found: "These come from Google's own search suggestions in Bangladesh. We don't have exact numbers of searches, so we don't show any.",
          evidence: "research",
          tiers: [
            { level: "High", why: "People ready to buy, and we saw no other local shop answering them.", terms: ["magnesium oil price in bangladesh", "magnesium spray bd", "shampoo bar price in bangladesh", "conditioner bar bangladesh", "tongue scraper price in bangladesh", "toilet cleaner tablet price in bangladesh", "foaming hand wash price in bangladesh", "bath bomb price in bangladesh"] },
            { level: "Medium", why: "People with a problem or comparing. Good for guides and common questions.", terms: ["magnesium oil for sleep", "how to use magnesium oil for leg cramps", "magnesium oil side effects itching", "shampoo bar vs liquid shampoo", "copper tongue scraper benefits", "পায়ের রগে টান লাগলে করণীয়", "মুখে দুর্গন্ধ দূর করার উপায়", "খুশকির জন্য কোন শ্যাম্পু ভালো"] },
            { level: "Low", why: "Few or no searches seen in Bangladesh, or very large websites already win.", terms: ["non toxic cleaning products bangladesh", "dish soap bar", "biodegradable floss", "leg cramps (general)", "dandruff (general)"] },
          ],
          input: "Which language should we focus on?",
          questions: ["lang_audience"],
        },
      ],
    },
    {
      id: "plan_content",
      title: "Product information & helpful guides",
      summary: "What we want to write, and how it helps people buy.",
      items: [
        {
          id: "content_types",
          title: "What we plan to write",
          list: [
            { name: "Better product descriptions", text: "What it is, what is inside, who it is for. Answers “is this right for me?”" },
            { name: "Common questions per product", text: "4–6 short answers, like “Why does it tingle?”. Fewer doubts before ordering." },
            { name: "How to use", text: "Short steps. People use it right and are happier with the result." },
            { name: "Ingredients", text: "The full list, from your records. Builds trust." },
            { name: "Category introductions", text: "“Which one is right for me?” Helps people choose." },
            { name: "A few helpful guides", text: "About 5 guides on real customer problems. Each one leads to the right product." },
          ],
          plan: "We will write a few strong pages, not many blog posts. More posts alone do not bring more customers.",
          hypothesis: "Guides we have in mind: 1) Magnesium oil at bedtime and for leg cramps (English and Bangla). 2) Switching to shampoo bars in Bangladesh. 3) Tongue cleaning and bad breath (Bangla). 4) Swapping to non-toxic cleaning at home. 5) Which HAYATIQ product for which need. Your customer questions may change this list.",
          input: "Do you agree? Who checks the facts?",
          questions: ["dec_guides", "dec_descriptions", "dec_tone", "cq_before"],
        },
      ],
    },
    {
      id: "plan_seo",
      title: "SEO: being found on Google",
      summary: "Making sure Google and other search engines can read and show every page.",
      items: [
        {
          id: "seo_what",
          title: "What SEO means",
          plan: "SEO (Search Engine Optimisation) means making the website easy for Google and other search engines to read, understand and show when people search for what we sell.",
        },
        {
          id: "seo_readable",
          title: "Make every product page readable for search tools",
          now: "When some search and AI tools open a product page, they see the homepage text instead of the product. Your customers see the product, because their phone runs the page's code. Many of these tools don't run that code.",
          found: "Product text, price and ingredients are invisible to tools like ChatGPT search and Perplexity. Google can read them, but later and less reliably.",
          evidence: "checked",
          plan: "Proposed option: prepare a ready-made copy of each product page every time we update the website, so every tool sees the product text at once.",
          why: "Search and AI tools can only show what they can read.",
          benefit: "Every product page can be found and quoted.",
          rowHead: ["Good", "Cost"],
          rows: [
            ["Customers see no change, and all links stay the same", "Some extra setup work for us, once"],
            ["Works for Google, Bing, ChatGPT, Perplexity and others", "Every update needs a re-publish, which already happens today"],
            ["No new hosting and no domain purchase needed", "Results show over weeks, not days"],
          ],
          input: "No input needed. We will ask you before we start.",
        },
        {
          id: "seo_facts",
          title: "A hidden fact card for each product",
          plan: "Add an invisible “fact card” to each page with the product name, price, size and stock. Google reads it and can show the price in search results.",
          why: "It is the clearest way to tell search tools the key facts.",
          benefit: "Better-looking search results that show the price.",
          input: "Correct names, sizes and prices.",
          sections: ["products"],
        },
        {
          id: "seo_bing",
          title: "Register the shop with Bing too",
          plan: "Add the website to Bing's tools for site owners, like it already is on Google's.",
          why: "ChatGPT search and Microsoft Copilot use Bing's results to find websites.",
          benefit: "A chance to show up in more places, with little work.",
        },
        {
          id: "seo_same",
          title: "What stays the same",
          plan: "We keep the current address (hayatiq.netlify.app), the current hosting and every product link. No domain purchase is needed now.",
        },
      ],
    },
    {
      id: "plan_aeo",
      title: "AEO: being the answer",
      summary: "Clear answers to the questions customers really ask.",
      items: [
        {
          id: "aeo_what",
          title: "What AEO means",
          plan: "AEO (Answer Engine Optimisation) means making our content easy for “answer engines” to understand and use when they reply to people's questions. Answer engines are things like Google's answer boxes, voice assistants and AI chat tools.",
          example: "A customer asks: “Why does magnesium oil tingle?”\nA good answer starts with the answer: “A mild tingle is common at first, because it is a salt solution. Try a smaller amount, or mix it with a little water.”",
        },
        {
          id: "aeo_how",
          title: "What we will improve",
          list: [
            { name: "Answer first", text: "Each question gets a one- or two-line answer, then details." },
            { name: "One question per heading", text: "Easy to find and easy to quote." },
            { name: "Specific facts", text: "Sizes, prices, minutes, number of sprays. Specific facts get used more than slogans." },
            { name: "Common questions on every product", text: "Taken from what customers really ask you." },
          ],
          benefit: "Customers (and answer tools) get a clear answer, and the answer points to our product.",
          input: "The questions customers ask you most.",
          questions: ["cq_before", "cq_misunderstand"],
        },
      ],
    },
    {
      id: "plan_geo",
      title: "GEO: being named by AI assistants",
      summary: "Raising the chance that AI tools mention HAYATIQ. A long-term effort.",
      items: [
        {
          id: "geo_what",
          title: "What GEO means",
          plan: "GEO (Generative Engine Optimisation) means improving the chance that AI tools understand, mention or recommend our shop and products when people ask them for help. Examples: ChatGPT, Gemini, Perplexity, Google AI Overviews and AI Mode, and Microsoft Copilot.",
          why: "More people now ask an AI “where can I buy magnesium oil in Bangladesh?” instead of searching.",
          hypothesis: "No one can guarantee that an AI tool will recommend a shop. These tools decide for themselves and change often. GEO raises our chances over months. It is not a quick ranking trick.",
        },
        {
          id: "geo_how",
          title: "What raises our chances",
          list: [
            { name: "Readable pages", text: "AI tools must be able to read our product pages (see “Make every product page readable”)." },
            { name: "One clear brand", text: "The same name, tagline and links everywhere." },
            { name: "Others talking about us", text: "Reviews, news stories and lists of local brands. AI tools trust what other websites say about a shop." },
            { name: "Specific, honest facts", text: "“Magnesium oil spray, ৳360, cash on delivery, made in Dhaka” is easier to quote than a slogan." },
            { name: "A monthly check", text: "We ask the same 10 questions in ChatGPT, Gemini, Perplexity and Copilot and write down whether HAYATIQ is mentioned." },
          ],
          input: "Reviews and a clear brand line help most.",
          questions: ["rev_have", "brand_tagline_choice"],
        },
      ],
    },
    {
      id: "plan_claims",
      title: "Careful wording about health",
      summary: "Only say what we can support. This protects customers and the shop.",
      items: [
        {
          id: "claims_now",
          title: "What the website says today",
          now: "The magnesium oil pages list “Stress & Anxiety” as a benefit. One product is called “Pain Relief Salve”.",
          found: "These are health claims. A claim like “helps anxiety” needs real proof.",
          evidence: "checked",
          why: "Unsupported health claims can mislead customers and damage trust if a product doesn't work that way for them. Facebook and Google ads may reject them, and regulators can question them. Google is also stricter with health-related pages.",
        },
        {
          id: "claims_research",
          title: "What research says",
          found: "We did not find strong scientific proof that magnesium on the skin works better than a placebo for sleep, stress or cramps. Many people still use it and like it. This is a summary from AI research and needs checking with a qualified person.",
          evidence: "hypothesis",
        },
        {
          id: "claims_plan",
          title: "How we propose to write it",
          plan: "Keep three things apart on every page: product facts (ingredients, size, how to use), what customers say (real reviews), and what people use it for (careful wording).",
          rowHead: ["Instead of", "We could say"],
          rows: [
            ["Reduces anxiety", "Part of a calm bedtime routine"],
            ["Cures sleep problems", "Many customers use it before bed"],
            ["Relieves pain", "A massage balm for tired muscles (if true)"],
            ["Stops hair fall", "Gentle care for the scalp"],
            ["Chemical-free", "Made with [list the actual ingredients]"],
          ],
          hypothesis: "These alternative wordings are AI suggestions. Please check that each one is true for the product. This is not legal advice.",
          input: "Which facts are you sure about, and which words should we keep or avoid?",
          questions: ["ev_claims_sure", "ev_claims_keep", "ev_docs", "ev_expert", "dec_safe_words"],
        },
      ],
    },
    {
      id: "plan_market",
      title: "Other shops & marketplaces",
      summary: "Who else shows up, what we can learn, and where we have room.",
      items: [
        {
          id: "market_gap",
          title: "Where no local shop shows up yet",
          found: "In our searches (14 Nov 2026), these showed only foreign shops or general items, and no local brand: magnesium oil spray, solid conditioner bar, copper tongue scraper, biodegradable dental floss. Results may differ a little for people in Bangladesh.",
          evidence: "research",
          why: "A clear, helpful local page has a real chance here.",
          benefit: "Being the local answer for products that are hard to find in Bangladesh.",
        },
        {
          id: "market_others",
          title: "Shops we saw in search",
          list: [
            { name: "Antobihin (Facebook shop)", text: "Shampoo bars (about ৳720) and a conditioner bar. Featured in TBS News. Learn: a good eco story gets press. Our room: clear product pages that people can find on Google." },
            { name: "Ribana Organic (ribana.com.bd)", text: "Handmade soaps and skin care since 2015. Own website, blog, press and review pages. Learn: real reviews and a founder story build trust. Little overlap with our products." },
            { name: "Marketplaces: Daraz, ePharma, Arogga, Chaldal, Rokomari", text: "Show up often because they are big. Product pages are short, with little brand story. Learn: be listed there too, with the same names. Our room: be the more helpful page." },
            { name: "Imported products and foreign shops", text: "iHerb, Indian and UK shops, and australiangoods.com.bd (imported magnesium oil). Our room: local price in Taka, cash on delivery, fast delivery." },
          ],
          hypothesis: "This is based on a few searches and press articles, not on full data. We could not open Daraz and Facebook pages, so prices and ratings there are unknown.",
          input: "Your Daraz and Packly links, and whether prices are the same everywhere.",
          questions: ["sales_links", "sales_channels", "sales_consistent"],
        },
      ],
    },
  ],
};

const ROADMAP = {
  stage: "We are here: research and collecting information. Nothing on the website has changed yet.",
  steps: [
    { title: "Research", state: "done" },
    { title: "Your answers", state: "now" },
    { title: "Phase 1", state: "next" },
    { title: "Phase 2", state: "next" },
    { title: "Phase 3", state: "next" },
    { title: "Phase 4", state: "next" },
    { title: "Phase 5", state: "next" },
  ],
  phases: [
    { id: "ph1", title: "Phase 1: Important fixes", plain: "Make sure search tools can read every page and that essential facts are right.",
      items: ["Fix pages that search tools can't read properly", "Fix titles that repeat (the three magnesium oil pages)", "Add the hidden product fact card", "Register with Bing"],
      needs: ["brand_display_name", "p.mg_oil.name"], measure: "More product pages listed in Google." },
    { id: "ph2", title: "Phase 2: Better product and category pages", plain: "Clear titles, full details, and links between related products.",
      items: ["Product titles and descriptions", "Category introductions", "Common questions per product", "Links between related products and guides"],
      needs: ["dec_descriptions", "dec_categories", "ev_ingredients_source"], measure: "More people see our pages in Google and click." },
    { id: "ph3", title: "Phase 3: Content for real customer problems", plain: "A few helpful guides and answers, built on what customers ask.",
      items: ["About 5 guides", "Common questions", "Bangla pages, if you decide so"],
      needs: ["cq_before", "lang_bangla_pages", "dec_guides"], measure: "Guides bring visitors who then view a product." },
    { id: "ph4", title: "Phase 4: Search, answer and AI visibility", plain: "Make the brand and products easy to understand for Google, answer tools and AI assistants.",
      items: ["Answer-first content", "Same brand details everywhere", "Monthly AI check"],
      needs: ["brand_tagline_choice"], measure: "Monthly: is HAYATIQ mentioned when we ask AI tools our 10 questions?" },
    { id: "ph5", title: "Phase 5: Trust and growth", plain: "Reviews, mentions and marketplaces that bring people back to the shop.",
      items: ["Collecting real reviews", "Local news or blog mentions", "Same names on Daraz and Packly", "Regular social posts linking to the website"],
      needs: ["rev_have", "rev_ask_new", "sales_links"], measure: "More reviews, more searches for “hayatiq”, more orders." },
  ],
  kpis: [
    { name: "Google impressions", plain: "How often our pages appear in Google results." },
    { name: "Clicks from Google", plain: "How often people click through to us." },
    { name: "Positions for chosen searches", plain: "Where we appear for searches like “magnesium oil price in bangladesh”." },
    { name: "Pages listed in Google", plain: "How many product and category pages Google knows about." },
    { name: "Visitors from search", plain: "People who arrive from Google, Bing or AI tools." },
    { name: "Product page visits", plain: "Do visitors look at products, and add them to the cart?" },
    { name: "Orders and order rate", plain: "The result that matters most. The website already records where each order came from." },
    { name: "Brand searches", plain: "How many people search for “hayatiq” by name." },
    { name: "Visits from other platforms", plain: "Visitors from Facebook, Instagram, marketplaces and AI tools like ChatGPT." },
  ],
  note: "No one can promise a Google position or an AI recommendation. We measure real results, mainly orders, not just numbers that look good.",
};

if (typeof module !== "undefined") module.exports = { PLAN, ROADMAP };
