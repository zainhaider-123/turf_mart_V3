# Redesign product, collection, list-collections and search pages to homepage UI

## Goal

Restyle four storefront pages so they look like a continuation of the homepage, using the
`tm-` design layer (the ported mockup styles). **This is a UI-only job.** No logic, no
schema, no settings and no template fields change anywhere.

Pages in scope:

1. Product page — `templates/product.json` → `sections/main-product.liquid`
2. Collection page — `templates/collection.json` → `sections/main-collection-banner.liquid` + `sections/main-collection-product-grid.liquid`
3. List-collections page — `templates/list-collections.json` → `sections/main-list-collections.liquid`
4. Search page — `templates/search.json` → `sections/main-search.liquid`

Out of scope: `templates/product.turf.json` / `sections/main-turf-product.liquid` (it is
already the design reference and must not be touched), homepage sections, header/footer,
`references/` (read-only source — never write into it, never ships: `.shopifyignore`).

---

## Hard rules

- **Zero schema/settings/field changes.** Every `{% schema %}` block in every touched file
  stays byte-identical. In particular:
  - The `turf_calculator` block in `main-product.liquid` (definition at the top of the
    schema **and** the render case `{%- when 'turf_calculator' -%} →
    {% render 'turf-calculator', product: product, block: block %}`) stays exactly as-is.
    Do not remove, rename, reorder or "clean up" it or any of its settings. All other
    blocks and section settings are equally frozen.
  - No new settings, no new blocks, no new locale keys, no removed settings.
- **Template JSONs untouched.** `templates/product.json`, `collection.json`,
  `list-collections.json`, `search.json` keep their current sections, settings and
  `block_order` (they carry auto-generated headers — edit them minimally, i.e. not at all
  for this task).
- **No logic changes.** Filtering/sorting/pagination, predictive search, quick-add,
  variant selection, add-to-cart, media/gallery sync, structured data, recommendations —
  all existing Liquid/JS behaviour keeps working exactly as before. Restyle markup; do
  not reimplement behaviour.
- **Homepage continuity.** Each redesigned section self-includes the stylesheet it needs
  the tm- way (see per-section notes) and wraps its content in `tm-scope`. Use homepage
  conventions: `tm-container`, `tm-section`, `tm-section-title`, `tm-grid`, `tm-btn`
  family, `cat-card`, homepage type/colour tokens (CSS vars defined in `homepage.css` /
  colour scheme 1), never a Google Fonts `<link>`.
- **Class naming:** any generic class reused from the mockup (`.header`, `.btn`,
  `.container`, `.grid`, `.pill`, `.tag`, `.card`, `.price`, `.breadcrumb`, `.tabs`, …)
  must be prefixed `tm-` in **both** CSS and markup. Grep `assets/base.css` (and other
  Dawn assets) before reusing a generic name to avoid collisions. Where tm- styles already
  exist (`homepage.css`), reuse them instead of re-declaring.
- **Mockup parity beats Dawn conventions.** Keep the mockup's pixel values (breakpoints
  `max-width: 749px / 989px / 1199px` plus `min-width: 1441px`; `.d-only`/`.m-only`
  utilities) rather than Dawn's 750/990 grid, unless a Dawn component's internal JS
  depends on its own classes.
- **No new locale keys.** Reuse existing `t:` keys for any Dawn text you keep; tm- copy
  uses plain-English schema labels only if a new section were created (it isn't — all
  work is inside existing sections, so schemas don't change at all).
- Run `shopify theme check` after the structural `.liquid` edits and fix anything it
  flags.

---

## 1. Product page — `sections/main-product.liquid`

**Design reference:** `sections/main-turf-product.liquid` + `assets/turf-product.css`
(markup patterns from the mockup `references/productpage/index.html`).

**What the finished page should look like** (same visual structure as the turf product
page):

- **Breadcrumb bar** above the product — `Home › <collection> › <product>`, styled like
  `.breadcrumb` in `turf-product.css` (13px muted links, `›` separators, current page bold
  ink). Derive the collection from the existing context (`collection` or
  `product.metafields.custom.primary_collection`) exactly as `main-turf-product.liquid`
  does — this reads data, it does not add settings.
- **Two-column `pdp__main` layout**: gallery/media on the left, product info column on the
  right, inside `tm-container`. Match the turf page's spacing/typography
  (`.pdp__brand` green uppercase eyebrow for vendor, `.pdp__title` display-font 44px for
  the product title, muted SKU, `.pdp__features` icon list, `.pdp__trust` row).
- **Info column content = the existing Dawn blocks, unchanged.** Keep the
  `{% for block in section.blocks %}` / `{%- case block.type -%}` loop and render every
  block exactly as today (`turf_calculator`, `@app`, `text`, `title`, `price`, `sku`,
  `inventory`, `quantity_selector`, `variant_picker`, `buy_buttons`, `description`,
  `share`, `disclosures`, `custom_liquid`, `collapsible_tab`, `popup`, `rating`,
  `complementary`, `icon-with-text`) plus the `view_full_details` link. Only their
  surrounding markup/classes/positioning change so they sit in the turf-style info
  column. The `turf_calculator` render stays where it is in the block order.
- **Details/tabs styling:** where the turf page shows tabbed `.details` panels
  (Overview / Specifications / …), express the Dawn equivalents (the `description` block,
  `collapsible_tab` blocks) with the `.details__tabs` / `.details__panel` visual language
  — but keep the existing `<details>`/tab behaviour and ARIA that Dawn's JS expects. Do
  not invent new content sources.
- **Trust row:** map to what exists today — the `icon-with-text` blocks (Dawn's
  closest equivalent) rendered in the `.pdp__trust` visual style, or omit the row if the
  merchant hasn't added blocks. Do **not** copy `main-turf-product`'s `trust_item` block
  (that would be a schema change).
- **Spec table / delivery tab / downloads tab:** only render if their data already comes
  from sources the section has today (product metafields already used elsewhere on the
  page, `product.description`, existing blocks). If an element would require a new
  setting/block/metafield mandate, **omit it**. Never add a field to make UI appear.
- **Related products:** keep the existing `complementary` block (product-recommendations)
  logic; restyle its cards toward the turf page's mini-card / homepage card look where
  that doesn't break `product-recommendations` JS (safe: wrap/class the rendered card,
  don't change the custom element or its `data-` attributes).

**What must keep working (restyle, don't replace):**

- `<product-info>` and `<product-component>` custom elements and all their `data-`
  attributes (`data-section`, `data-product-id`, `data-update-url`, `data-url`, zoom
  flag).
- Every script include: `product-info.js`, `product-form.js`, `magnify.js`,
  `show-more.js` / `price-per-item.js` (volume pricing), `theme-editor.js`,
  `product-modal.js`, `media-gallery.js`, `product-model.js`.
- The media gallery (`{% render 'product-media-gallery' %}`), variant-image sync,
  variant picker, quantity rules, buy buttons / dynamic checkout, installment form,
  inventory/SKU/price status elements and their IDs (`price-{{ section.id }}`,
  `Inventory-…`, `Sku-…`, `Quantity-Form-…`, `ProductInfo-…`).
- Structured data (`{{ product | structured_data }}`), popups, 3D model handling.
- The CSS includes at the top of the section (component-accordion/price/slider/rating/
  deferred-media/variant-picker/volume-pricing, …) — the Dawn components still need them.

**Assets:** reuse `turf-product.css` (and `turf-product.js` only for behaviours you
actually adopt, e.g. gallery thumbs/tabs/lightbox — if adopted, ensure it doesn't fight
Dawn's `media-gallery.js`; prefer Dawn JS where they overlap) plus `homepage.css` for the
tm- tokens. Any new page-specific rules go into a tm-prefixed block or a new
`assets/tm-product.css`-style file — never edit `turf-product.css` values that
`main-turf-product.liquid` depends on (it must keep pixel parity untouched).

---

## 2. Collection page — banner + product grid

**Card reference:** `sections/tm-turf-types.liquid` (`.cat-card` markup + `homepage.css`
rules at `.cat-card` / `.tm-grid--cats`).

### 2a. `sections/main-collection-banner.liquid` — homepage-style banner

- Keep the section's settings-driven behaviour: render description only when
  `show_collection_description`, render image only when `show_collection_image` and
  `collection.image` exists.
- Restyle as a homepage banner band: `tm-container` + `tm-scope`, display-font
  `tm-section-title`-style H1 for the collection title, description in the homepage body
  style, optional collection image treated like a homepage card/hero media (rounded,
  homepage radius) rather than Dawn's `.collection-hero` block.
- Include `homepage.css` from this section (each tm- section self-includes its CSS).
- Drop or neutralise Dawn-only visuals (`.collection-hero`, `gradient` colour-scheme
  wrapper) **only in the markup** — the `color_scheme` setting stays in the schema and
  may keep being applied as a class so theme-editor colour controls still do something
  harmless.

### 2b. `sections/main-collection-product-grid.liquid` — tm product grid

- **Product cards become `cat-card` look**, mirroring `tm-turf-types`:

  ```html
  <a class="cat-card" href="{{ product.url }}">
    <img src="…" alt="…" width="…" height="…" loading="lazy">
    <div class="cat-card__body">
      <span class="cat-card__name">{{ product.title }}
        <svg viewBox="0 0 24 24" fill="none" stroke="#175c3f" stroke-width="2.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </span>
      <span class="cat-card__price">From <b>{{ product.price | money }}</b>/m²</span>
    </div>
  </a>
  ```

  - Image: `product.featured_image` via `image_url: width: 640` (like `tm-turf-types`
    does), with the section's existing image settings (`image_ratio`,
    `show_secondary_image`, `image_shape`) honoured where feasible inside the card
    styling; fall back to the same style of placeholder used by tm- sections if no image.
  - Price line: use the same "From `<b>`money`</b>`/m²" presentation as `tm-turf-types`.
    If a per-m² figure needs `product.metafields.custom.roll_width` (pattern:
    `product.price | divided_by: roll_width | round | money`), that is a data read, not a
    field change — use it only where the metafield exists, otherwise show
    `product.price | money` plainly (or the section's existing price rendering). Never
    hardcode prices.
  - Keep settings-driven extras the merchant already has (`show_vendor`, `show_rating`,
    `quick_add`): render them inside/under the cat-card in tm styling; if a setting is
    `false` the card simply omits it, as today.
- **Grid:** wrap cards in `tm-container` + `tm-grid tm-grid--cats` (5 → 3 → 2 columns at
  the homepage breakpoints). Column settings (`columns_desktop`, `columns_mobile`) stay in
  the schema; map them onto the tm-grid modifier if possible, otherwise let the homepage
  responsive grid win (documented trade-off — no setting is removed).
- **Facets / sort / pagination keep their logic and elements:** the
  `facet-filters-form`, `FacetSortForm`, `facets` snippet, `facets.js`, product count,
  `#product-grid` data attributes, empty state and `pagination` snippet stay as-is in
  function. Only their visual layer changes: tm- pill/button styling for sort and filter
  chips so they read as homepage UI. Do not change the snippets' inputs, IDs or JS hooks.
- Self-include `homepage.css` (keep Dawn's `component-facets.css` etc. — the JS needs
  them).

---

## 3. List-collections page — `sections/main-list-collections.liquid`

- Keep everything logical: the `sort` case over `collections`, the 28/30 paginate
  calculation, `{% paginate %}`, `{{ section.settings.title }}` H1.
- Replace the `card-collection` render with `cat-card` markup per card:
  - Image: `collection.image`, else `collection.products.first.featured_image`, else the
    same fallback approach `tm-turf-types` uses (its `fallbacks` asset list) — this
    mirrors the reference card's resolution order.
  - `cat-card__name`: `collection.title` + the standard arrow SVG.
  - `cat-card__price`: "From `<b>`…`</b>`" lowest price computed exactly like
    `tm-turf-types` does (loop `collection.products limit: 100`, track lowest
    `price_product.price`, render `| money`); if the collection has no products, omit the
    price line (or show the card without it) rather than showing a fake value.
- Grid: `tm-container` + `tm-grid tm-grid--cats` (homepage breakpoints), inside
  `tm-scope`; keep `columns_desktop` / `columns_mobile` / `image_ratio` settings in the
  schema (map to grid modifiers where sensible).
- Self-include `homepage.css`. Keep `component-card.css`/`section-collection-list.css`
  includes only if some untouched markup still needs them.

---

## 4. Search page — `sections/main-search.liquid`

- **Search input looks like the header search** (`tm-header.liquid`'s `.tm-search`):
  magnifier icon span + `type="search"` input + green `.tm-search__submit` button, inside
  the existing `<main-search>` / `predictive-search` / `search-form` wrappers with the
  same IDs (`Search-In-Template`), name (`q`), ARIA attributes and reset button so
  `main-search.js` and predictive search keep working. Visual tokens come from
  `homepage.css`'s `.tm-search` (52px pill, icon padding, submit treatment) — reuse those
  classes/rules; don't fork new ones. Placeholder/labels keep using existing locale keys.
- **Header block:** keep the H1 / results-count / no-results strings (existing `t:` keys)
  but present them with homepage typography (`.tm-section-title`, `tm-container`,
  `tm-eyebrow`-style kicker if it fits) instead of Dawn's `.template-search__header`
  inline-styled block.
- **Results:** product results render as the same `cat-card` card as §2b (image, title +
  arrow, price line, link to `product.url`). Non-product results (articles, pages,
  product-in-article etc. — the existing loop branches) keep their content and links but
  are restyled with a simple tm- card (tm border-radius, same body/typography) so they
  sit in the same grid.
- **Facets/sort/pagination:** identical rule to §2b — logic, IDs, JS untouched; visual
  only (tm pills/buttons).
- Self-include `homepage.css` alongside the Dawn CSS the components still need
  (`component-search.css`, `component-facets.css`, `template-collection.css` as
  required by remaining markup).

---

## 5. Parity & verification checklist

Run `shopify theme check` and review the diff before calling this done.

**Diff review (must all pass):**

- [ ] No `{% schema %}` block changed anywhere (compare with `git diff` — schema bodies identical).
- [ ] `turf_calculator` block definition + render case in `main-product.liquid` untouched.
- [ ] No changes under `templates/`, `config/`, `locales/`, `snippets/` (unless a purely
      presentational snippet change is unavoidable — prefer not), `references/`.
- [ ] No removed script/CSS includes; no removed element IDs used by Dawn JS.

**Visual checks** (`shopify theme dev`, view at 1440 / 1200 / 990 / 750 / 390 px):

- [ ] Product page: breadcrumb, two-column gallery/info, tm typography, calculator block
      still renders and functions, buy buttons/variant picker/quantity work, tabs/description
      styled tm, sticky info still sticks, related products render.
- [ ] Collection page: banner reads like a homepage band; cards are `cat-card` (image,
      title + arrow, price); filters/sort work; pagination works; quick-add (if enabled)
      works.
- [ ] List-collections: cat-card grid with collection image + name + arrow + "From" price;
      sort setting still orders correctly; pagination works.
- [ ] Search: input matches header search styling; predictive search dropdown still
      appears; filters/sort/pagination work; product cards are cat-cards; article/page
      results styled consistently.
- [ ] All four pages share homepage look: same fonts, colours, card shadows/radius,
      container width, section rhythm — they should not look like stock Dawn.
- [ ] Mobile: `.m-only`/`.d-only` behave, 2-column grids at ≤749px, no horizontal
      overflow.
