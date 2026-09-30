# AGENTS.md

## What this is
- Shopify Online Store 2.0 theme ("Turf Mart") based on **Dawn 16.0.0** — see `theme_info` in `config/settings_schema.json`. Standard Dawn layout: `assets/ config/ layout/ locales/ sections/ snippets/ templates/`.
- No package.json, no tests, no CI, no lint config. Nothing builds locally; Liquid renders server-side — `shopify theme check` is the only verifier.

## Commands (Shopify CLI)
- `shopify theme dev` — local preview with hot reload
- `shopify theme push --unpublished` — upload as a new theme; `shopify theme push` — overwrite live theme
- `shopify theme check` — lint (theme-check). Run after any structural `.liquid` edits.

## Custom Turf Mart layer (`tm-` prefix) — the model for new work
- The homepage mockup (`references/`) **has been ported**: `templates/index.json` runs `tm-hero`, `tm-turf-types`, `tm-promos`, `tm-best-sellers`, `tm-feature`, `tm-reviews`, `tm-usps`.
- **Dawn's `sections/header.liquid`, `announcement-bar.liquid`, `footer.liquid` are no longer wired**: `sections/header-group.json` = `tm-header`; `sections/footer-group.json` = `tm-footer` + `tm-quickbar` (mobile bottom bar). Editing the stock Dawn ones has no storefront effect.
- Each `tm-*` section self-includes `{{ 'homepage.css' | asset_url | stylesheet_tag }}` (and header/quickbar/reviews also `tm-homepage.js`, `defer`). Don't move these into `theme.liquid` or a template JSON.
- CSS lives in `assets/homepage.css` (ported mockup styles). Generic class names that collide with Dawn (`.header`, `.btn`, `.container`, `.grid`, `.pill`, `.tag`, `.cart-count`, …) are prefixed `tm-` in **both** CSS and markup — grep `assets/base.css` before reusing a generic class.
- Mockup utilities `.d-only` / `.m-only` are defined in `homepage.css`; its breakpoints are `max-width: 749px / 989px / 1199px` plus `min-width: 1441px`. Keep mockup values exact — pixel parity beats Dawn's conventions.
- Fonts are mapped through theme settings (`config/settings_data.json`: `type_header_font` = Archivo Black); page colours come from colour scheme 1, not bare `body` rules. Never add a Google Fonts `<link>`.
- Section conventions: `presets` on every section, `limit` on block types with a fixed count (only `tm-footer`'s `link` block is unbounded), `"type": "url"` link settings, `image_picker` with `asset_url` fallbacks to copied mockup images, plain-English schema labels (no `t:` locale keys).

## references/ — source design, never modify, never uploads
- `references/index.html` + `references/assets/{css,js,images}` is the static mockup. `.shopifyignore` excludes `references/` and `AGENTS.md` from theme uploads. Copy assets **out** of it; never write into it.
- `references/prompts/convert-homepage.md` is the detailed conversion spec (architecture decisions, per-section settings, parity checklist at 1440/1200/990/750/390px). Read it before touching homepage sections; it supersedes guesswork about why files look the way they do.
- Mockup JS (`references/assets/js/main.js`): do **not** port wholesale — reuse Dawn components (`snippets/header-drawer.liquid`, carousel/slideshow logic in `assets/global.js`) or `assets/tm-homepage.js`.

## Turf calculator — the existing custom feature and the model for non-homepage work
- Block `turf_calculator` (limit 1) is declared inline in the schema of `sections/main-product.liquid` and rendered from there via `snippets/turf-calculator.liquid`; assets are `assets/turf-calculator.css` / `.js`.
- Only wired into `templates/product.turf.json` — an alternate product template (suffix `turf`), not `product.json`. Its block settings are the live config (add-on products, pack sizes, cut rules).
- Data rules: variant price is per **lineal metre** of roll (m² price × roll width); product metafields `custom.sand_rate`, `custom.roll_width`, `custom.warranty` override block defaults. JS does money math in **cents**.

## File gotchas
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are auto-generated / editable only via the theme editor (their headers say so). Edit minimally, never reformat.
- Those JSON files start with a `/* ... */` comment — strict JSON parsers fail; strip comments before parsing.
- Translations: add new keys only to `locales/en.default.json` (storefront) and `locales/en.default.schema.json` (editor labels). 49 other locale files exist; don't hand-edit them. Keep Dawn's existing `t:` keys intact.
- Very large Dawn files (`sections/main-product.liquid` ~104KB, `snippets/card-product.liquid`, `snippets/facets.liquid`) — edit surgically; prefer new files over rewriting Dawn's.
