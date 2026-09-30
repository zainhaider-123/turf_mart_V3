# Prompt — Convert the Turf Mart homepage mockup into the Shopify theme

> Give this whole file to the agent doing the conversion. It is the single source of
> instructions for porting `references/index.html` into this Dawn-based theme.

## Objective

Rebuild the homepage mockup as a Shopify Online Store 2.0 theme page that is **visually
identical to the reference at every breakpoint**, where **every text string, image and link
is editable in the theme editor**. Homepage only — no other templates get new content.

The reference design is:

- Markup: `references/index.html`
- Styles: `references/assets/css/style.css` (design tokens, 3 breakpoints)
- Behaviour: `references/assets/js/main.js` (do **not** port wholesale — see §7)
- Images: `references/assets/images/`

## Ground rules (from AGENTS.md — non-negotiable)

- Theme is **Dawn 16.0.0**. Follow Dawn's file layout and conventions; new work should look
  like it belongs in this theme.
- Commands: `shopify theme dev` (preview), `shopify theme check` (lint — run it after every
  structural `.liquid` change; it is the only verifier), `shopify theme push --unpublished`.
- `references/` is never uploaded (`.shopifyignore`) and must not be modified. Copy assets
  **out** of it, never write into it.
- **No Google Fonts `<link>`.** Map the mockup fonts through the theme's font settings (§5).
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are
  auto-generated files: keep their `/* ... */` header comment, edit minimally, never
  reformat or reorder. (Their leading comment breaks strict JSON parsers — strip it when
  parsing programmatically.)
- New custom sections use **plain-English schema labels** (no `t:` locale keys), like
  `snippets/turf-calculator.liquid`. Do not touch the 49 non-default locale files; only
  `locales/en.default.json` / `en.default.schema.json` if a key is truly needed (it
  shouldn't be — plain-English labels avoid this).
- Edit large Dawn files surgically or not at all. Prefer adding new files over rewriting
  Dawn's.

## Scope

**In scope**

1. All mockup `<main>` sections → new theme sections, wired into `templates/index.json`.
2. Custom header (announcement + header + nav + mobile drawer + mobile search) → one new
   section wired into `sections/header-group.json`.
3. Custom footer + mobile quick-action bar → new sections wired into
   `sections/footer-group.json`.
4. Styling, fonts, colours, images, JS needed to hit pixel parity.
5. Minimal edits to `config/settings_data.json` for fonts + base colours (§5).

**Out of scope (later prompts)**

- Product / collection / cart / page templates — leave every Dawn template as-is.
- Real product data for "Best sellers" (for now it is static editor content; see §4).
- Real review data (static blocks), real search results page styling, translations.
- Redesigning Dawn sections not on the homepage.

## Architecture decisions (already made — do not re-litigate)

| Decision | Rule |
|---|---|
| One section per mockup area | Each visual section of `index.html` becomes its own `sections/tm-*.liquid`. |
| File naming | Prefix every new section/snippet/asset with `tm-` (e.g. `tm-hero.liquid`, `homepage.css`). Prevents collisions with Dawn now and on future upgrades. |
| Content | All copy, images, prices and links are schema settings or blocks. No hardcoded merchant-facing text in Liquid except structural/sr-only labels. |
| Blocks vs settings | Free-form repeated items (category cards, reviews, USPs, nav links, footer links, quickbar items) = blocks. One-off content (hero text, headings, glass card) = section settings. |
| Styling | Port `style.css` → `assets/homepage.css`, adapted per §6. One CSS file for the whole homepage chrome (header, main, footer, quickbar). |
| JS | Prefer existing Dawn components/logic over porting `references/assets/js/main.js` (§7). |
| Images | Copy all files from `references/assets/images/` into `assets/` unchanged (same filenames). Sections fall back to these `asset_url` defaults so the storefront matches the mockup out of the box; the theme-editor image picker overrides them. |
| Menus/footer links | Link **blocks** (label + `url` setting), pre-filled with the mockup's links — fully editable in the theme editor. Do not depend on admin-managed linklists existing with specific handles. |
| URL type | Use `"type": "url"` for every link setting (gives the `shopify://` picker). Default to mockup hrefs as relative placeholders only where no real target exists yet (`#` → leave link setting blank and hide? No — keep the element rendered; blank url renders `href="#"`). |

## Section inventory

Create these files. "Settings/blocks" lists the editable surface; defaults must reproduce
the exact mockup copy. Order below = order in `templates/index.json`.

### 1. `sections/tm-header.liquid` → wired into `header-group.json` (replaces both Dawn sections)

Renders the mockup's `.site-top` (announcement + header + main nav) **and** the
`.drawer#menu-drawer` mobile menu (markup may live in this section; it is `position: fixed`).

- Settings: announcement text, announcement desktop-only suffix (mockup appends
  "· Trade accounts available" with `.d-only`), logo (`image_picker`, fall back to
  `settings.logo` then `assets/logo.png`), search placeholder, show account/cart toggles.
- Blocks: `nav_link` (label, url) ×9 — default Pet Turf … Sale, in order. Also used to
  populate the drawer (same blocks, second render pass).
- Real functionality: search `<form>` posts to `{{ routes.search_url }}` (`role="search"`,
  `method="get"`, `name="q"`); account → `routes.account_url`; cart → `routes.cart_url`
  with live count `{{ cart.item_count }}` inside `.cart-count`.
- Mobile behaviour: hamburger opens drawer, search icon toggles the mobile search row —
  reuse Dawn's mechanisms (§7). Note: Dawn's `snippets/header-drawer.liquid` uses the id
  `menu-drawer`, same as the mockup — if you reuse Dawn markup, rename the id to
  `tm-menu-drawer` to avoid a duplicate-id collision.
- Announcement/header/nav must stay sticky together on mobile (mockup `.site-top` rule).

### 2. `sections/tm-hero.liquid`

- Settings: `image`, `eyebrow`, `heading` (h1), `lead`, `cta_label`, `cta_link`
  (yellow pill, desktop+mobile), `mobile_cta_label`, `mobile_cta_link` (the
  `.btn--outline-light` shown `.m-only`), `card_title`, `card_text`, `card_link_label`,
  `card_link` (the `.glass-card`, rendered `.d-only`).
- Gradient overlay, glass blur, pill/arrow visuals = pure CSS from the mockup.
- Image fallback: `assets/hero-backyard-pool.jpg`.

### 3. `sections/tm-turf-types.liquid`

- Settings: `heading` ("Shop by turf type"), section anchor id `types`.
- Blocks `card` (limit 6): `image`, `name`, `price` (e.g. "From **$54.00**/m²" —
  split into `price_prefix` "From", `price_value` "$54.00", `price_unit` "/m²" to match
  the mockup's markup), `url`, plus a `mobile_only` checkbox (the 6th "All turf" card is
  `.m-only` in the mockup).
- Arrow icon after name = inline SVG, hardcode like the mockup.
- Fallbacks: `pet-turf-dog.jpg`, `pool-turf.jpg`, `landscape-turf.jpg`,
  `commercial-turf.jpg`, `sports-turf-putting-green.jpg`, `product-cooldeluxe-35.jpg`.

### 4. `sections/tm-promos.liquid`

The 4-tile "Why buy from Turf Mart" grid. One section so the CSS grid layout stays intact;
three block types:

- `samples` (limit 1): `image`, `pill` ("Free samples"), `title`, `text` (`.d-only`),
  `button_label`, `url`.
- `trade` (limit 1): `pill`, `title`, `text`, `button_label`, `button_url`, `text_link_label`
  (mobile variant), `image` (`.d-only` on desktop).
- `tile` (limit 4): `icon` (select: `measure` | `diy` — inline SVG per choice), `title`,
  `sub_desktop`, `sub_mobile` (mockup swaps copy by breakpoint), `url`, plus a `style`
  select (`yellow` | `white`) — or infer style from block order; a select is safer.
- Grid placement: the mockup grid is fixed (`500px` first column, rows 312/356). Keep that
  layout; blocks render in `block_order`.

### 5. `sections/tm-best-sellers.liquid`

- Settings: `heading` ("Best sellers"), `button_label` ("Add to cart"), `view_all_label`
  ("View all turf"), `view_all_url`.
- Blocks `product_card` (limit 6): `image`, `vendor` ("SYNLawn"), `name`, `price_from`
  ("From"), `price_value` ("$84.00"), `price_unit` ("/m²"), `url`, `desktop_only` checkbox
  (5th card is `.d-only` in the mockup).
- Card and its button both link to `url` (render the button as an `<a class="btn
  btn--green">` — visually identical to the mockup, works without JS). Real add-to-cart /
  dynamic product cards are a later phase; keep markup so a `product` block type can be
  swapped in later.
- Fallbacks: `product-supreme-35.jpg`, `turf-closeup-blades.jpg`,
  `product-pooldeluxe-30.jpg`, `product-classic-35.jpg`, `product-cooldeluxe-35.jpg`.

### 6. `sections/tm-feature.liquid` (Pet turf feature)

- Settings: `image`, `eyebrow`, `heading`, `text` (keep the mockup's `.d-only` sentence
  tail behaviour via a `text_desktop_extra` setting or one inline `.d-only` span),
  `button_1_label`, `button_1_url`, `button_2_label`, `button_2_url`.
- Left-to-right dark gradient = CSS (desktop) / bottom-up gradient on mobile, per mockup.

### 7. `sections/tm-reviews.liquid`

- Settings: `heading`, `rating` (default "4.9"), `rating_suffix` ("out of 5", `.d-only`),
  `reviews_label` ("1,200+ reviews"), `reviews_url`, `show_arrows` (checkbox).
- Blocks `review` (limit 12): `image`, `rating` (integer range 1–5, default 5 — renders N
  star `<i>` elements), `quote`, `author`, `location`, `tag`.
- Carousel: keep the mockup's scroll-snap track CSS; wire prev/next arrows with Dawn's
  slider logic (§7). Cards must remain natively swipeable/scrollable and keyboard-
  operable, matching the mockup's `role`/`aria` attributes.
- Fallbacks: the six mockup images, in order.

### 8. `sections/tm-usps.liquid` (Why Turf Mart benefits)

- Blocks `usp` (limit 8, default 4): `icon` (select: `delivery` | `samples` | `shield` |
  `chat` — the four mockup SVGs), `title`, `text`.
- Defaults: "Australia-wide delivery / Cut to size, to your door", "Free samples / Feel it
  before you buy", "Price promise / Found it cheaper? We'll match it", "Real turf experts /
  Call 1300 000 000".

### 9. `sections/tm-footer.liquid` → wired into `footer-group.json`

- Settings: `logo` (fallback `assets/logo.png`), `tagline`, `newsletter_heading`
  (render desktop as two lines / mobile one line using the mockup's `.d-only`/`.m-only`
  spans or a `|` → `<br>` replace), `newsletter_button_label`, `wordmark` (`.d-only`,
  default "Turf Mart"), `copyright` (default "© Turf Mart").
- Blocks `link` (label, url, `column` select: `shop` | `help` | `trade`,
  `desktop_only` checkbox for the Trade column, `mobile_only` checkbox for Help's
  "Trade accounts" item). Section renders the three columns in fixed order, grouped from
  `block_order`. Pre-fill every mockup link.
- Newsletter must be a **real** Shopify form: `{% form 'customer' %}` with the hidden
  `contact[tags]` newsletter tag, email input `name="contact[email]"` — styled exactly like
  the mockup. Wire success/error states so the form works, but do not alter its look.

### 10. `sections/tm-quickbar.liquid` → wired into `footer-group.json` (after tm-footer)

Mobile-only fixed bottom bar (`.quickbar .m-only`).

- Blocks `item` (limit 5): `label`, `url`, `icon` (select: `home` | `categories` |
  `search` | `cart` | `account`), `current` checkbox (home default on).
- The `search` item toggles the header's mobile search (same hook as the header search
  icon). The `cart` item shows the live `.cart-count` badge like the mockup.

### 11. `templates/index.json`

Replace the two stock Dawn sections (`image_banner`, `featured_collection`) with the ten
sections above (tm-header/footer/quickbar live in the group files, so index.json gets
sections 2–8: hero, turf-types, promos, best-sellers, feature, reviews, usps) in mockup
order. Pre-populate all block content with the mockup copy so a fresh load of the homepage
looks like the reference with zero editor work. Keep the file's header comment; edit
minimally. Give each section `"presets"` (plain-English names, e.g. "Turf Mart — Hero") so
they appear under *Add section*.

### Group files

- `sections/header-group.json` → single `tm-header` section (the mockup owns the whole
  top chrome; Dawn's `announcement-bar` + `header` are replaced).
- `sections/footer-group.json` → `tm-footer` then `tm-quickbar`.

## Fonts, colours, page chrome (§5)

- Mockup fonts: display **Archivo Black**, body **Public Sans**.
  - In the theme editor font picker (Shopify font library) find the exact families if
    available; otherwise choose the closest match (display: an ultra-heavy grotesque;
    body: a neutral grotesque with 400–800 weights). Set them as `type_header_font` /
    `type_body_font`.
  - Record the chosen families in the PR/summary so the merchant can review.
  - Never add a Google Fonts `<link>`; verify no `fonts.googleapis.com` request at runtime.
  - Keep the mockup's font stack as the CSS fallback chain behind the theme variables.
- Mockup palette: paper `#f6f4ee`, ink `#12201a`, green `#175c3f`, green-dark `#0f2f22`,
  yellow `#f3c11d`, plus the footer/muted tokens — port them as `:root` custom properties
  in `homepage.css` (scoped or suffixed if the names risk collision — Dawn already defines
  many `--*` variables in `base.css`).
- Page background/text: set via `config/settings_data.json` colour scheme 1 (background
  `#f6f4ee`, text `#12201a`) — **not** by styling bare `body` in `homepage.css` (that would
  silently override Dawn settings on every template).
- `settings_data.json` edits: only the font keys and scheme-1 colour values, in place, no
  reformatting.

## Styling rules (§6)

- Port every size, colour, radius, gap, shadow, gradient and breakpoint from
  `style.css` **unchanged**. Pixel parity beats elegance; do not "clean up" values.
- Breakpoints must match the mockup exactly: mobile ≤ 749px, tablet 750–1199px,
  desktop ≥ 1200px (plus the `>1441px` wordmark rule).
- Port the `.d-only` / `.m-only` utility pair and its mobile overrides verbatim — the
  markup depends on them everywhere.
- **Collision safety** (Dawn's CSS stays loaded site-wide):
  - Grep Dawn (`assets/base.css`, sections, snippets) before reusing any generic class
    name. Known collisions: `.search`, `.drawer`, `.grid`, `.header`, `.footer`,
    `.container`, `.btn`, `.stack`, `.pill`, `.tag`, `.stars`, `.icon-btn`, `.cart-count`,
    `.announcement`, `.newsletter`, `.eyebrow`, `.section-title`, `.text-link`.
  - Any ported class that collides (or is generic enough to plausibly collide) gets a
    `tm-` prefix in **both** CSS and markup (e.g. `tm-container`, `tm-btn`,
    `tm-footer__col`). Unique mockup names (`hero`, `cat-card`, `promo`, `usp`,
    `review-card`, `feature`, `quickbar__fab` …) may stay as-is.
  - No bare `body`/`html`/unprefixed element-selector rules in `homepage.css`.
  - Result: other templates (product, collection, cart…) must render exactly as they do
    today, except for the intentional font/colour-setting change from §5.
- Load `homepage.css` from the new sections only (each section may emit the link; browsers
  dedupe) or once from `layout/theme.liquid` — your choice, but never inside a template
  JSON. Prefer Dawn's pattern for how sections include CSS (check how Dawn sections ship
  their CSS before inventing one).
- Mockup-only markup conventions (`.d-only`, `.m-only`, inline SVG icons, star mask
  trick) carry over as-is.

## Behaviour / JS (§7)

- **Do not port `references/assets/js/main.js` wholesale.** Reuse Dawn first:
  - Mobile menu drawer → Dawn's drawer/details pattern (`snippets/header-drawer.liquid`,
    `details-disclosure`, `assets/global.js`) restyled to the mockup; or port only the
    mockup's ~40 lines of drawer/search toggling into a small `assets/tm-header.js` if
    Dawn's pattern fights the design. The id collision noted in §1 applies.
  - Mobile search toggle → same treatment (Dawn `header-search`/summary pattern or a tiny
    dedicated script).
  - Reviews carousel → Dawn's slider logic (`assets/global.js` / component-slider
    pattern): arrows call scrollBy one card, disabled states at the ends, native
    scroll-snap + swipe retained, keyboard arrows work, hidden scrollbar.
- Cart counts everywhere (header, quickbar) = `{{ cart.item_count }}`, not `0`.
- Respect `prefers-reduced-motion` (mockup already does).
- No `onsubmit="return false"`-style dead handlers: search goes to the search page,
  newsletter to the customer form.

## Definition of done

1. `shopify theme check` passes with no new errors/warnings from the created or edited
   files.
2. `shopify theme dev` → homepage matches `references/index.html` side by side at
   **1440, 1200, 990, 750 and 390 px** widths: layout, type sizes, colours, spacing,
   image crops, hover states, the footer wordmark, quickbar, drawer and sticky header.
3. Mobile-only/desktop-only elements (`.m-only`/`.d-only` set) appear exactly where the
   mockup shows them at each breakpoint.
4. Theme editor: every visible string, image and link on the homepage is editable
   (walk the editor section list and check).
5. Real behaviour: search submits to the search page, cart links show live count,
   newsletter form submits, drawer/search toggles work, carousel arrows/swipe work.
6. No request to `fonts.googleapis.com`.
7. Product/collection/cart templates render unchanged (except §5 font/colour settings).
8. `references/` untouched; `.shopifyignore` unchanged.

## Conventions recap

- New files: `tm-` prefix; plain-English schema labels; `presets` on every section;
  `limit` on every block type; `url` type for links; `image_picker` with `asset_url`
  fallbacks to the copied mockup images.
- JSON with header comments: preserve the comment, keep diffs minimal.
- Locales: touch only `en.default.*` and only if unavoidable.
- Summarise any deviation from this prompt (and the reason) in your final reply.
