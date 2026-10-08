# Prompt — Convert the Turf Mart product page mockup into the Shopify theme

> Give this whole file to the agent doing the conversion. It is the single source of
> instructions for porting `references/productpage/index.html` into this Dawn-based theme.
> The companion spec `references/prompts/README-product-page-shopify.md` holds the detailed
> calculator diff, metafield tables, CSV import steps and the test checklist. Where the two
> documents overlap, **this prompt's adaptations for the current theme state win**; where
> this prompt is silent, the README is normative.

## Objective

Rebuild the product page mockup as a Shopify Online Store 2.0 product template that is
**visually identical to the reference at every breakpoint**, driven entirely by real
Shopify data (product, variants, metafields, media) and editable theme settings — with the
materials calculator working exactly as approved.

The reference design is:

- Markup: `references/productpage/index.html`
- Styles: `references/productpage/assets/css/pdp.css` (page-specific),
  `references/productpage/assets/css/style.css` (design tokens — already ported as
  `assets/homepage.css`)
- Behaviour: `references/productpage/assets/js/pdp.js` and
  `references/productpage/assets/js/turf-calculator.js` (do **not** port wholesale — see
  Behaviour)
- Sample product data: `references/productpage/turf-mart-classic-35-import.csv`

## Ground rules (from AGENTS.md — non-negotiable)

- Theme is **Dawn 16.0.0**. Follow Dawn's file layout and conventions; new work should look
  like it belongs in this theme.
- Commands: `shopify theme dev` (preview), `shopify theme check` (lint — run it after every
  structural `.liquid` change; it is the only verifier), `shopify theme push --unpublished`.
- `references/` is never uploaded (`.shopifyignore`) and must not be modified. Copy assets
  **out** of it, never write into it.
- **No Google Fonts `<link>`, no new font files.** Fonts are already handled (see Current
  theme state).
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are
  auto-generated files: keep their `/* ... */` header comment, edit minimally, never
  reformat or reorder.
- New sections use **plain-English schema labels** (no `t:` locale keys). Touch only
  `locales/en.default.*` if a key is truly needed (it shouldn't be).
- Edit large Dawn files surgically or not at all. Prefer adding new files over rewriting
  Dawn's.

## Current theme state — README assumptions vs reality

The README was written against the trial install. Read this table first; every item changes
how you execute the README.

| README assumes | Reality in this repo |
|---|---|
| Quickbar bar is markup inside `layout/theme.liquid`, so wrap it in `{%- unless template.name == 'product' and template.suffix == 'turf' -%}` (README §4) | The quickbar is a section: `sections/tm-quickbar.liquid`, wired in `sections/footer-group.json`. Put the same `unless` guard around its markup **inside `sections/tm-quickbar.liquid`**. Do not touch `layout/theme.liquid` for this, do not touch `footer-group.json`. |
| Brand tokens live in `assets/turf-mart-base.css`, loaded from `layout/theme.liquid` (README §3.3) | That file does not exist yet. The tokens (`--ink`, `--green`, `--green-dark`, `--yellow`, `--paper`, `--white`, `--line`, `--line-soft`, `--muted`, `--mint`, `--font-display`, …) are the `:root` block of `assets/homepage.css` (lines 10–36). **Create `assets/turf-mart-base.css`** containing a copy of that `:root` token block only, and load it once from `layout/theme.liquid` `<head>` (same `stylesheet_tag` pattern Dawn uses). Leave `homepage.css` untouched. The new `turf-calculator.css` depends on this file existing. |
| Fonts: upload Archivo Black / Public Sans `.woff2` and add `@font-face` (README §4) | **Void — do none of that.** The theme now runs on self-hosted Helvetica Neue (`snippets/tm-font-faces.liquid`, wired from `theme.liquid`, with `--font-body-family` / `--font-heading-family` hardcoded in `theme.liquid`). `config/settings_data.json` still shows `archivo_black_n4` / `libre_franklin_n4` but it is overridden. The product page inherits fonts automatically through `var(--font-display)` / `var(--font-body)`. |
| Copy the trial block schema from `SETUP.md` step 5 (README §5) | `SETUP.md` does not exist in this repo. The trial `turf_calculator` block schema lives inline in `sections/main-product.liquid` (search `"type": "turf_calculator"`), and the merchant's current picks (add-on product handles, pack sizes, cut rules) are the block settings in `templates/product.turf.json`. Copy from there. |
| Trial calculator already has the new presentation | No. `snippets/turf-calculator.liquid` still has the old price/warranty block, `<h3>` title and icon-less buttons; `assets/turf-calculator.js` still has the old `setBusy()`; `assets/turf-calculator.css` is still the Dawn-token trial version. All three README §3 changes are **pending**. |
| Homepage work pending | Done. `tm-*` sections, `header-group.json` = `tm-header`, `footer-group.json` = `tm-footer-v2` + `tm-quickbar`, `assets/homepage.css` (tokens, `.tm-container`, `.tm-btn`, `.d-only`/`.m-only`) are live and load site-wide through `tm-header`. Reuse them; don't rebuild them. |

## Scope

**In scope**

1. New `sections/main-turf-product.liquid` wired into `templates/product.turf.json`.
2. Calculator changes to `assets/turf-calculator.js`, `snippets/turf-calculator.liquid`,
   `assets/turf-calculator.css` (README §3).
3. New `assets/turf-product.css`, `assets/turf-product.js`, `snippets/turf-icon.liquid`,
   `assets/turf-mart-base.css`.
4. Quickbar hide-guard on the turf template.
5. One surgical edit in `snippets/card-product.liquid` for collection-aware breadcrumbs.
6. Metafield/CSV/import documentation handed to the merchant (the agent cannot do admin
   work — see Definition of done).

**Out of scope (later prompts)**

- Creating metafield definitions or running the CSV import (admin work — document it).
- `templates/product.json` (default template) and every non-turf template — unchanged.
- Collection, cart, search pages — unchanged (except the card-product breadcrumb edit and
  the quickbar guard, both of which must not alter how those pages look).
- Reviews (stay off until a reviews app is connected).
- The other 15 products' `stock_message` cleanup — list it as a merchant follow-up.
- Redesigning Dawn sections.

## Architecture decisions (already made — do not re-litigate)

| Decision | Rule |
|---|---|
| One section for the page | The whole mockup `<main class="pdp">` becomes `sections/main-turf-product.liquid`. It is a Dawn-style template-main section, so it keeps the `main-` prefix from the README instead of `tm-` — this is the **sanctioned exception** to the `tm-` naming rule (the name must match `templates/product.turf.json`). All other new files keep README names: `turf-product.css`, `turf-product.js`, `turf-icon.liquid`, `turf-mart-base.css`. |
| Template | Only `templates/product.turf.json` renders the new section. The default `product.json` stays on Dawn's `main-product`. |
| Content source | Everything is real Shopify data: product/variant fields, media, metafields (README §2), or section settings/blocks. No hardcoded merchant-facing text except structural labels and the README's defaults. |
| Calculator settings | The snippet keeps reading from `block.settings`; it is rendered with `{% render 'turf-calculator', product: product, block: section %}`, so the trial block's settings move into the new section's schema (README §3.2e). `block.id` → `section.id` keeps the buy-bar id unique. |
| Styling | `pdp.css` splits per README §3.3: calculator price/status/card/buybar rules → `assets/turf-calculator.css` (replacing it); everything else → new `assets/turf-product.css`. Tokens come from the new `turf-mart-base.css`. |
| JS | Port `pdp.js` minus the prototype cart preview (README §4). Calculator JS gets only the `setBusy()` change (README §3.1). |
| Images | None copied: the product page uses product media and product images throughout. The mockup's static JPGs were stand-ins for Classic 35's photos. |
| Accessory / related cards | "Complete your project" = `product_list` section setting (limit 4). "You may also like" = Shopify's `product-recommendations` filtered to turf. No metafield for either. |

## Files

| File | Action |
|---|---|
| `sections/main-turf-product.liquid` | **Create** — breadcrumb, gallery, info, calculator render, trust row, tabs, accessories, recommendations |
| `assets/turf-product.css` | **Create** — `pdp.css` minus the calculator rules |
| `assets/turf-product.js` | **Create** — `pdp.js` minus prototype cart preview, plus README §5 zoom tweaks |
| `snippets/turf-icon.liquid` | **Create** — the mockup's inline SVGs selected by `name` |
| `assets/turf-mart-base.css` | **Create** — `:root` brand tokens copied from `homepage.css` |
| `assets/turf-calculator.css` | **Replace** per README §3.3 |
| `assets/turf-calculator.js` | **Edit** — README §3.1 only |
| `snippets/turf-calculator.liquid` | **Edit** per README §3.2 (a–e) |
| `sections/tm-quickbar.liquid` | **Edit** — hide-guard (see Mobile) |
| `snippets/card-product.liquid` | **Edit** — `| within: collection` (see Breadcrumb) |
| `layout/theme.liquid` | **Edit** — add the `turf-mart-base.css` link only |
| `templates/product.turf.json` | **Replace contents** (keep the auto-generated header comment) |

## Section structure — `sections/main-turf-product.liquid`

Markup and class names come straight from the mockup's `<main class="pdp">`, with fixed
text swapped for Liquid. Load at the bottom of the section (README §5):

```liquid
{{ 'turf-product.css' | asset_url | stylesheet_tag }}
<script src="{{ 'turf-product.js' | asset_url }}" defer="defer"></script>
```

(The snippet already loads `turf-calculator.css` / `turf-calculator.js`.)

### Breadcrumb

Use the README §5 code verbatim, with one change: the mockup wraps it in
`class="container breadcrumb"` — render that as **`tm-container breadcrumb`** (the mockup's
`.container` is the homepage's `tm-container`; `page-width` in the README snippet is a
placeholder, `tm-container` gives pixel parity).

For the collection crumb to appear, also make Dawn's collection cards link "within" the
collection (README §5): in `snippets/card-product.liquid`, change the card link hrefs from
`{{ card_product.url }}` to `{{ card_product.url | within: collection }}` — at minimum the
media link and title link used by the collection grid (lines ~120 and ~157). The snippet
does not currently receive `collection`; if `within: collection` renders empty inside the
`{% render %}` scope, pass `collection: collection` from
`sections/main-collection-product-grid.liquid` (which has it in scope). Verify with the
README §7 breadcrumb test. Do not change search/predictive-search cards.

### Gallery

README §5 gallery code as-is (thumbnails from `product.media`, stage from
`product.featured_media`, badge from `custom.badge`, zoom button with the mockup's SVG).
Fallbacks: no static image needed — if `product.media` is empty the section may fall back
to nothing (a placeholder product has no media anyway).

### Title block and features

README §5 code as-is: vendor link via `url_for_vendor`, `h1` title, SKU from the selected
variant, `custom.short_description`, then the three feature `<li>`s built from
`pile_height` / `colour` / `heat_reduction` / `warranty` via `snippets/turf-icon.liquid`.
The product title is the page's only `h1`.

### Calculator

```liquid
{% render 'turf-calculator', product: product, block: section %}
```

Placement: immediately after the features list, inside `.pdp__info` — exactly where the
mockup has `<turf-calculator>`.

### Trust row

The mockup's `.pdp__trust` (4 icon + two-line label items: delivery / price promise /
warranty / secure checkout). Make it **blocks**: `trust_item` (limit 4) with `icon`
(select: `delivery` | `price` | `shield` | `lock` — inline SVGs, add them to
`turf-icon.liquid`) and `line_1` / `line_2` text settings. Prefill with the mockup copy.

### Details tabs

Four tabs per the mockup (`Overview`, `Specifications`, `Delivery & returns`,
`Downloads`), ported from `data-tabs` markup + `pdp.js` tab code.

- **Overview**: `{{ product.description }}` beside the spec table (mockup layout).
- **Specifications**: the wide spec table + SKU + category row.
- **Spec table**: README §5 "Specification table" code — every row guarded by its
  metafield; rows with blank metafields must not render.
- **Delivery & returns**: section setting `delivery_returns` (`richtext`), default = the
  mockup's delivery/returns wording.
- **Downloads**: one link per file metafield (`custom.install_guide`, `custom.data_sheet`,
  `custom.warranty_certificate`), shown only when set. **Hide the whole tab button and
  panel** when none are set (README §5 Downloads). Same discipline for tab buttons: the
  panel set and the tab set must always match.

### Complete your project

README §5 accessories code as-is: `product_list` setting `complementary_products`
(limit 4), plain `<form method="post" action="{{ routes.cart_add_url }}">` per card (works
without JS), button classes `tm-btn tm-btn--green mini-card__btn` (the mockup's
`.btn .btn--green` collides with Dawn — the homepage already renamed these to `tm-btn*`,
reuse those rules from `homepage.css`). Group heading = section setting, default
"Complete your project".

### You may also like

README §5 recommendations code as-is: `<product-recommendations>` (Dawn's `assets/global.js`
already defines it), filter `rec.type == 'Synthetic turf'`, max 4, price divided by roll
width, button `tm-btn tm-btn--outline-green mini-card__btn` linking to the product page.
Group heading = section setting, default "You may also like".

### Section schema

- Copy the trial block schema from `sections/main-product.liquid`'s `turf_calculator`
  block into `settings` (add-on products, pack sizes, rates, cut rules, pay-later) — with
  the current values from `templates/product.turf.json` as defaults where the block had
  them (handles: `sand-infill-20kg-bag`, `turf-pins-box-of-100`, `jointing-tape-100m-roll`,
  `turf-glue-20l-drum`, `free-turf-sample`). Keep `roll_width` without a default (Shopify
  only allows one decimal place in number defaults).
- Add per README §5: `delivery_title` (default "Australia-wide delivery"),
  `delivery_text` (default "$180 per order, cut to size"), `delivery_returns` (richtext),
  `complementary_products` (product_list, limit 4).
- Plus: `accessories_heading`, `recommendations_heading` text settings.
- Blocks: `trust_item` (limit 4) as above.
- Plain-English labels everywhere. No `presets` (this is a template-main section, not an
  index section).

## Calculator changes (README §3 is normative — summarised here)

1. **`assets/turf-calculator.js` §3.1**: `setBusy()` must write the label into
   `[data-label]` (or the button itself) instead of `b.textContent`, otherwise "Adding…"
   wipes the cart icon. Nothing else in the file changes — **calculation logic, tests and
   cart format stay exactly as approved**.
2. **`snippets/turf-calculator.liquid` §3.2**:
   - (a) add `compare_per_sqm` / `save_per_sqm` variables at the end of the top liquid tag;
   - (b) replace the old headline/warranty block with the new
     `.turf-calc__price` (per-m² price, `<s>` was-price, "Save" pill, roll-width/GST line)
     + `.pdp__status` box (In stock / Sold out from `variant.available`, dispatch line from
     `custom.stock_message`, delivery item from `block.settings.delivery_title` /
     `delivery_text` — they resolve as section settings when rendered with `block: section`);
   - (c) `<h3 class="turf-calc__title">` → `<h2 …>` (product title is the only `h1`);
   - (d) buttons wrapped in `.turf-calc__actions` with the mockup's inline SVGs and
     `<span data-label>` around the add-to-cart text; sample button text "Order free
     sample";
   - (e) settings now come from the section (rendered `block: section`).
   - The `warranty` variable is no longer used by the snippet.
3. **`assets/turf-calculator.css` §3.3**: replace the whole file with the `pdp.css`
   sections **Calculator: price + stock**, **Calculator card**, **Mobile sticky buy bar**,
   plus the matching `turf-calc`, `pdp__status` and `turf-buybar` rules inside `pdp.css`'s
   three bottom `@media` blocks. All px — no rem conversion needed. Depends on
   `turf-mart-base.css` tokens.

## Metafields and Classic 35 data (README §2 and §6 are normative)

- Keep the 5 trial metafields; note the **`stock_message` meaning change** (now only the
  dispatch line, e.g. `Ships in 1–2 days` — stock status itself is computed from
  inventory).
- Create the 7 CSV-settable definitions (`short_description`, `pile_height`, `colour`,
  `heat_reduction`, `material`, `backing`, `made_in`) and the 4 admin-only ones
  (`primary_collection` collection reference; 3 file references for downloads).
- Import `references/productpage/turf-mart-classic-35-import.csv`
  (**Products → Import**, overwrite matching handles) — manual merchant step.
- Admin-only after import: primary collection = Landscape Turf, download PDFs, theme
  template = `product.turf`.
- Every spec row / feature / download link renders only when its metafield has a value.

## Styling

- Port every size, colour, radius, gap, shadow, gradient and breakpoint from `pdp.css`
  **unchanged**. Pixel parity beats elegance. Breakpoints: mobile ≤ 749px, tablet
  750–1199px, desktop ≥ 1200px (as in the mockup).
- **Display weight rule**: the mockup's `font-family: var(--font-display); font-weight: 400`
  rules (Archivo Black ships one cut) must become `font-weight: 800` in the port — this is
  what the homepage conversion already does for Helvetica Neue Heavy. Applies to at least
  `.pdp__title`, `.turf-calc__title`, `.details__heading`, `.related__title`.
- **Collision safety** (Dawn's CSS stays loaded site-wide). Grep `assets/*.css` before
  reusing any generic class. Known and already handled by the homepage: `.container` →
  `tm-container`, `.btn` / `.btn--green` / `.btn--outline-green` → `tm-btn` variants.
  Check the rest of the pdp markup (`.pdp`, `.gallery`, `.details`, `.breadcrumb`,
  `.related`, `.mini-card`, `.spec-table`, `.downloads`, `.lightbox`) — as of writing none
  collide with Dawn, but verify before keeping them. `.turf-calc*`, `.turf-buybar`,
  `.pdp__*` are unique by design and keep their names (the calculator CSS/JS data
  attributes depend on them).
- `.d-only` / `.m-only` come from `homepage.css` (loaded via `tm-header` on every page).
  The pdp markup itself barely uses them (header/footer only) — no new utility definitions.
- No bare `body`/`html` rules in `turf-product.css`, except the existing
  `body.has-turf-buybar` padding which already lives in `turf-calculator.css`.
- Load `turf-product.css` from the section only (never from a template JSON). Load
  `turf-mart-base.css` once from `theme.liquid` `<head>` so tokens exist before
  section CSS resolves.

## Behaviour / JS

- **`assets/turf-product.js`** = `references/productpage/assets/js/pdp.js` with the
  prototype cart-preview/toast block removed (Shopify's cart drawer replaces it — the
  calculator already opens `cart-drawer` when present). Keep gallery thumb switching, tab
  switching and the lightbox zoom. Add README §5's two zoom fixes: open the zoom image at
  `width=2400`, and strip the main image's `srcset` when a thumb is clicked so the new
  `src` wins. Port only the **tabs** keyboard behaviour (arrow keys / roving `tabindex`)
  if the mockup provides it; otherwise match the mockup exactly.
- Lightbox markup (`[data-lightbox]`) is rendered by the section (not a global element).
  The toast markup is not ported at all.
- Calculator JS: only the §3.1 `setBusy` change. Cart add keeps `/cart/add.js`, cart-drawer
  integration and the `_turf_calc` line-item token.
- No `onsubmit="return false"` dead handlers anywhere in new markup.
- Respect `prefers-reduced-motion` (mockup already does).

## Mobile

- **Quickbar vs sticky buy bar**: in `sections/tm-quickbar.liquid`, wrap the quickbar
  markup:

  ```liquid
  {%- unless template.name == 'product' and template.suffix == 'turf' -%}
    {%- comment -%} quick-actions bar markup {%- endcomment -%}
  {%- endunless -%}
  ```

  Keep the section's `homepage.css` link outside the guard (harmless) or inside — either
  is fine, but the `nav` must not render.
- The calculator's sticky `.turf-buybar` (emitted by the snippet, moved to `<body>` by JS)
  is the only mobile bottom bar on turf products. `body.has-turf-buybar` padding already
  exists in `turf-calculator.css`.
- Gallery thumbnails: mockup shows them as a scrollable column/row per `pdp.css` mobile
  rules — port as-is.

## Template wiring

`templates/product.turf.json` — replace contents with (keep the `/* … */` header comment,
edit minimally):

```json
{
  "sections": {
    "main": { "type": "main-turf-product", "settings": {} }
  },
  "order": ["main"]
}
```

- This drops the trial `main-product` block wiring plus Dawn's `disclosures` and
  `related-products` sections from the turf template (recommendations now render inside
  the new section). Deliberate — README §4.
- **Leave `sections/main-product.liquid` as-is** (the `turf_calculator` block case and
  schema stay; harmless — README §1).
- After switching, re-pick the add-on products + accessories in
  **Customize → Products → turf** (section settings don't inherit the old block's picks —
  defaults are pre-filled, but verify).
- `templates/product.json` and all other templates untouched.

## Definition of done

1. `shopify theme check` passes with no new errors/warnings from created or edited files.
2. `shopify theme dev` → Classic 35 (template `product.turf`) matches
   `references/productpage/index.html` side by side at **1440, 1200, 990, 750 and 390 px**:
   breadcrumb, gallery (thumbs left, square stage, badge), price block, status box,
   calculator card, trust row, tabs, both related groups, sticky buy bar on mobile.
3. Blank metafields hide their rows/tabs; set a value and they appear.
4. Theme editor: every visible string, image-source and link on the page is editable
   (section settings, blocks, product data) — walk the editor and check.
5. README §7 test checklist passes (price/compare-at/Save, stock states, breadcrumbs,
   vendor page, 180 m² → 2×20 m + 1×10 m, accessory add, recommendations, mobile bars).
6. Quickbar hidden on `product.turf`; visible everywhere else, unchanged.
7. Default product template and all other templates render unchanged; homepage unchanged.
8. No request to `fonts.googleapis.com`; no new font files added.
9. `references/` untouched; `.shopifyignore` unchanged.
10. **Merchant handoff in the final reply**: the manual admin steps the agent cannot run —
    metafield definition list (README §2), CSV import steps (§6), admin-only fields
    (primary collection, PDFs, template check), the other 15 products' `stock_message`
    update, and the open client questions (README §8: sample wording, missing
    material/backing/made-in data, returns policy, PDFs, reviews).

## Conventions recap

- Plain-English schema labels; `limit` on every block type; `url` type for links;
  `image_picker` only where an image is genuinely pickable (none expected — product media).
- JSON with header comments: preserve the comment, keep diffs minimal.
- Locales: touch only `en.default.*` and only if unavoidable.
- Prefer new files over editing Dawn's; surgical edits only for the two documented cases
  (`card-product.liquid`, `tm-quickbar.liquid`) plus the two one-liners
  (`theme.liquid` stylesheet, `product.turf.json`).
- Summarise any deviation from this prompt (and the reason) in your final reply.
