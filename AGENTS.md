# AGENTS.md

## What this is
- Shopify Online Store 2.0 theme ("Turf Mart") based on **Dawn 16.0.0** — see `theme_info` in `config/settings_schema.json`. Standard Dawn layout: `assets/ config/ layout/ locales/ sections/ snippets/ templates/`.
- No package.json, no tests, no CI, no lint config. Nothing builds locally; Liquid renders server-side.

## Commands (Shopify CLI)
- `shopify theme dev` — local preview with hot reload
- `shopify theme push --unpublished` — upload as a new theme; `shopify theme push` — overwrite live theme
- `shopify theme check` — lint (theme-check). Run after any structural `.liquid` edits; there is no other verifier.

## references/ — source design, never uploads
- `references/index.html` + `references/assets/{css/style.css, js/main.js, images/}` is the static mockup being converted to Liquid. `.shopifyignore` excludes `references/` and `AGENTS.md` from theme uploads.
- The homepage mockup is **not yet ported**: `templates/index.json` still holds stock Dawn sections (image-banner + featured-collection).
- Mockup conventions that do not exist in the theme:
  - `.d-only` / `.m-only` visibility utility classes — must be defined (or replaced) when porting.
  - Google Fonts (Archivo Black, Public Sans) — do **not** add a Google Fonts `<link>`; map to the theme's Shopify font settings.
- Mockup JS (mobile menu drawer, mobile search toggle, reviews carousel): prefer existing Dawn components (`snippets/header-drawer.liquid`, carousel/slideshow logic in `assets/global.js`, `sections/slideshow.liquid`) over porting `references/assets/js/main.js`.

## Turf calculator — the existing custom feature and the model for new work
- Block `turf_calculator` (limit 1) is declared inline in the schema of `sections/main-product.liquid` and rendered from there via `snippets/turf-calculator.liquid`; assets are `assets/turf-calculator.css` / `.js`.
- Only wired into `templates/product.turf.json` — an alternate product template (suffix `turf`), not `product.json`. Its block settings are the live config (add-on products, pack sizes, cut rules).
- Data rules: variant price is per **lineal metre** of roll (m² price × roll width); product metafields `custom.sand_rate`, `custom.roll_width`, `custom.warranty` override block defaults. JS does money math in **cents**.
- Custom blocks/sections use plain-English schema labels (no `t:` locale keys), unlike Dawn's own — follow the convention of the file you're editing.

## File gotchas
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are auto-generated / editable only via the theme editor (their headers say so). Edit minimally, never reformat.
- Those JSON files start with a `/* ... */` comment — strict JSON parsers fail; strip comments before parsing.
- Translations: add new keys only to `locales/en.default.json` (storefront) and `locales/en.default.schema.json` (editor labels). 49 other locale files exist; don't hand-edit them. Keep Dawn's existing `t:` keys intact.
- Very large Dawn files (`sections/main-product.liquid` ~104KB, `snippets/card-product.liquid`, `snippets/facets.liquid`) — edit surgically.
