# Prompt — Move Turf Mart homepage content onto Shopify CMS sources (with editor fallback)

> Give this whole file to the agent doing the work. It is the single source of instructions
> for making the homepage's collections/menus dynamic from the Shopify admin while keeping
> the current theme-editor blocks as a fallback.

## Objective

Let the merchant manage homepage content in the **Shopify admin (CMS)** instead of only in
the theme editor — without losing anything that exists today:

1. **Best sellers** render their cards from **one Shopify collection** (e.g. handle
   `best-sellers`), while the current hand-made `product_card` blocks remain available and
   editable exactly as they are now.
2. **Turf type cards** can each be bound to a **Shopify collection** (title, image, link and
   price follow the collection); the current manual fields remain as fallback.
3. **Header main nav** (`.tm-main-nav__inner` + the mobile drawer) can render from a
   **Shopify menu** instead of `nav_link` blocks.
4. **Footer link columns** render from **Shopify menus** (one per column); the `link`
   blocks remain the fallback.
5. **"Add to cart" buttons on homepage `tm-` cards never perform an AJAX add.** They are
   plain links that navigate to the product page.

Everywhere: **both options stay** — a CMS source selected → CMS data renders; source blank →
the existing theme-editor blocks render.

## Ground rules (from AGENTS.md — non-negotiable)

- Theme is **Dawn 16.0.0**. Commands: `shopify theme dev`, `shopify theme check` (run after
  every structural `.liquid` edit — it is the only verifier), `shopify theme push --unpublished`.
- `references/` is never uploaded (`.shopifyignore`) and must not be modified.
- New work uses the `tm-` prefix, plain-English schema labels (no `t:` keys), `"type": "url"`
  for link settings, `presets` on sections, `limit` on block types.
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are auto-generated:
  keep the `/* ... */` header comment, edit minimally, never reformat.
- Edit the large files surgically; prefer small diffs over rewrites.
- Read `references/prompts/_archive/convert-homepage.md` for the original section specs and
  parity checklist if you need context on why the files look the way they do.

## Scope

**In scope — edit these four files only (plus nothing else unless a bug forces it):**

| File | Change |
|---|---|
| `sections/tm-best-sellers.liquid` | Optional `collection` source + product cards + no-AJAX button |
| `sections/tm-turf-types.liquid` | Optional per-card `collection` source |
| `sections/tm-header.liquid` | Optional `menu` source for `.tm-main-nav__inner` and the drawer |
| `sections/tm-footer.liquid` | Optional per-column `menu` sources |

**Out of scope**

- `templates/index.json`, `sections/header-group.json`, `sections/footer-group.json` — do
  **not** edit them; new settings default to blank, so the stored blocks keep working with
  zero JSON changes.
- Dawn's product page, cart, quick-add, turf calculator — their AJAX behaviour stays as is.
- The quickbar, promos, reviews, USPs, feature, hero sections.
- Locales (plain-English labels make them unnecessary).

## Architecture decisions (already made — do not re-litigate)

| Decision | Rule |
|---|---|
| No mode toggle | Presence of a source **is** the mode. Setting a `collection`/`menu` → CMS data renders. Clearing it → blocks render. No "Content source" dropdown. |
| Precedence | **Dynamic source wins** whenever it is set and non-empty. Blocks stay visible/editable in the theme editor at all times — the storefront simply ignores them while a source is active. |
| Empty-source safety | A source that resolves to **zero items** (empty collection, empty menu) falls back to the blocks — never render an empty section/grid. |
| Fallback chain | Source → block setting → `asset_url` mockup fallback (images). Current markup/CSS/classes never change; only the data feeding them changes. |
| Default state | All new settings default to **blank/off**, so a fresh checkout of the theme renders the homepage **pixel-identical** to today. |
| Add to cart | Homepage `tm-` card buttons are `<a href="…product or card url…">` only. No `<product-form>`, no `fetch(routes.cart_add_url)`, no quick-add modal, no form POST from any `tm-` section or `tm-*.js`. |

## 1. `sections/tm-best-sellers.liquid` — products from one collection

Add to section settings:

- `collection` — `"type": "collection"`, label `"Collection (source — overrides product cards)"`.
- `products_to_show` — `"type": "range"`, 1–10, default **5**, label `"Products to show"`
  (the grid is 5 columns desktop; the mockup ships 5 cards).
- `price_prefix` — text, default `"From"` (blank hides the prefix).
- `price_unit` — text, default `"/m²"` (blank hides the unit).
- `hide_extra_on_mobile` — checkbox, default `true`, label `"Hide cards after the 4th on mobile"`.

Rendering:

- If `section.settings.collection != blank` **and** it has products:
  - Loop `collection.products` with `limit: products_to_show`.
  - Per product build the card with the **exact existing `product-card` markup and classes**:
    - image → `product.featured_image` (via `image_url: width: 640`, keep `width`/`height`
      attrs, `loading="lazy"`), fallback to the existing per-index mockup asset.
    - vendor → `product.vendor`; name → `product.title` (escape both).
    - price → `{{ product.price | money }}`; prefix → `section.settings.price_prefix`
      (rendered only when non-blank); unit → `section.settings.price_unit` (only when
      non-blank).
    - button → `<a href="{{ product.url }}" class="tm-btn tm-btn--green">` with
      `section.settings.button_label`. **Plain link — no form, no JS, no `/cart/add`.**
  - Cards after the 4th (`forloop.index > 4`) get the `d-only` class when
    `hide_extra_on_mobile` is on — mirrors the mockup's desktop-only 5th card so mobile keeps
    a clean 2×2 grid.
  - `view_all` href → `section.settings.view_all_url`, falling back to
    `section.settings.collection.url` when the setting is blank.
- If the collection is blank or empty → render the current `product_card` blocks exactly as
  today (including their per-block `desktop_only` checkbox and `<a href="{{ block.settings.url }}">`
  button — which is already AJAX-free and must stay that way).

Verify after the change: grep the homepage assets for `cart/add` — the only hits may be
Dawn's `product-form.js` / `turf-calculator.js` (product page), never anything a `tm-`
section loads.

## 2. `sections/tm-turf-types.liquid` — cards bound to collections

Add one setting to the existing `card` block:

- `collection` — `"type": "collection"`, label `"Shopify collection (overrides the fields below)"`.

When set on a block, the card (which is already a single `<a class="cat-card">`) derives:

- href → `collection.url`
- name → `collection.title` (escape)
- image → `collection.image`, else the first product's `featured_image`, else the block's
  `image` setting, else the existing per-index mockup asset fallback (same `image_url`
  width/`width`/`height`/`loading` pattern as now).
- price → lowest `product.price` across `collection.products` (`limit: 100`), rendered with
  the `money` filter, wrapped in the block's existing `price_prefix` / `price_unit` text and
  the same `<b>` markup. If the collection has no products, keep the block's manual
  `price_value`.

When blank → render exactly as today. `mobile_only` checkbox behaviour unchanged.

## 3. `sections/tm-header.liquid` — nav from a Shopify menu

Add to section settings:

- `menu` — `"type": "link_list"`, label `"Menu (source — overrides navigation links)"`.

When `section.settings.menu != blank` and the menu has links:

- `.tm-main-nav__inner` renders `linklists[section.settings.menu].links` — **top-level links
  only** (the mockup nav is flat; ignore children), `<a href="{{ link.url }}">{{ link.title | escape }}</a>`.
- The mobile drawer (`#tm-menu-drawer`) renders the **same menu**, same flat rule — one
  source drives both, exactly as the blocks do today.
- Keep the surrounding markup, `aria-label`s and classes untouched. No
  `block.shopify_attributes` in menu mode (no blocks are rendering).

When blank/empty → current `nav_link` blocks, unchanged, in both nav and drawer.

## 4. `sections/tm-footer.liquid` — columns from Shopify menus

Add three section settings (one per column, each falls back independently):

- `shop_menu`, `help_menu`, `trade_menu` — `"type": "link_list"`,
  labels `"Shop menu (source)"`, `"Help menu (source)"`, `"Trade menu (source)"`.

Per column: if its `*_menu` is set and non-empty → render
`linklists[section.settings.shop_menu].links` (etc.) as plain
`<a href="{{ link.url }}">{{ link.title | escape }}</a>` inside the existing
`<nav class="tm-footer__col">`. If blank/empty → keep filtering that column's `link` blocks
by `block.settings.column` exactly as now.

Unchanged in every mode:

- Column headings (`Shop` / `Help` / `Trade`) stay as they are in the markup.
- Visibility rules: Trade column keeps `d-only`, the `<span class="d-only">` spacer stays.
- Note for the merchant (mention in your summary): per-link `mobile_only`/`desktop_only`
  flags exist only in block mode — menu links all render plainly. The mobile-only
  "Trade accounts" item in Help is therefore a block-mode-only flourish; in menu mode the
  merchant omits/includes links in the menu itself.

## 5. Add-to-cart rule (explicit, must hold)

The mockup's best-seller button is labelled "Add to cart" but behaves as a link. Keep that
contract everywhere on the homepage:

- Every `tm-` card button/card is an `<a>` navigating to the target URL (product page,
  collection page or card URL). Clicking it must **never** hit `/cart/add`, open a cart
  drawer, or submit a form.
- Do not include `product-form.js`, `quick-add.js`, `cart.js` or any form markup from the
  four sections in this prompt.
- Dawn's AJAX add **on the product page itself** (buy buttons, turf calculator) is out of
  scope and stays untouched.

## Definition of done

1. `shopify theme check` passes with no new errors/warnings from the edited files.
2. With no new setting touched, the homepage is **pixel-identical** to today at
   **1440, 1200, 990, 750 and 390 px** (mockup parity checklist from the archived prompt).
3. Selecting a collection in *Best sellers* renders real products (image, vendor, title,
   price, link to the product page), honouring *Products to show*; clearing it restores the
   blocks. `view_all` falls back to the collection URL when its own link is blank.
4. Binding a turf-type card to a collection swaps title/image/price/link; clearing it
   restores the manual fields.
5. Selecting a header menu renders it in both the desktop nav and the mobile drawer;
   clearing it restores the blocks. Same per footer column.
6. Empty collection/menu → blocks render (no empty grid/sections).
7. Network check in `shopify theme dev`: browsing the homepage and clicking a card button
   produces **no `/cart/add` request** — the browser navigates to the product page.
8. Theme editor: all existing blocks still editable; new settings carry plain-English labels.
9. No edits to `references/`, `templates/index.json`, `sections/*-group.json`, or locales.

## Conventions recap

- New settings are blank by default; existing JSON files untouched.
- Reuse the exact card markup/classes so `assets/homepage.css` needs no changes (if a tiny
  CSS addition is unavoidable, it goes in `homepage.css` with `tm-`-safe selectors).
- Escape all merchant/CMS text output (`| escape`), `money` filter for all prices.
- Summarise any deviation from this prompt (and the reason) in your final reply.
