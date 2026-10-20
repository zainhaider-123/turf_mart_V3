# Homepage promo tiles v2 — free-sample picker + turf calculator (new section)

## Goal

Port the package in `references/turf-mart-homepage-tiles-shopify/` into the theme as a **new section**, `sections/tm-promo-tiles.liquid`, and make it the homepage's default promo row in place of `tm-promos`.

**Do not replace or edit `sections/tm-promos.liquid`.** It stays in the theme as it is, with its presets, so a merchant can still add it or switch back to it. The package's README (`references/README-homepage-tiles-shopify.md`, same text as `references/turf-mart-homepage-tiles-shopify/README.md`) says "Replace `tm-promos.liquid`". Ignore that instruction. It was written for a manual paste-in install. Read the README for **how the tiles behave**: the picker rules, calculator maths, stay-on-page mode and test checklist all still apply.

What the new section shows (desktop grid, same slots as `tm-promos`):

| Slot | Block | Content |
|---|---|---|
| Large left tile (spans 2 rows) | `samples`, layout **Sample picker** | Tick up to 5 turfs and add or remove them in place, without leaving the homepage |
| Wide top-right tile | `estimate` (**Turf calculator**) | Turf type, then area or length × width, then rolls and a "from" price. The CTA goes to that type's collection |
| Wide top-right tile (hidden) | `trade` | The old trade promo, kept but `disabled` in the seed |
| Yellow small tile | `tile`, icon `chat` | "Not sure which turf?" |
| White small tile | `tile`, icon `kit` | "Your complete install kit" |

---

## 0. Prerequisite: bring in the free-sample feature

This branch (`homepage-tiles`) was cut from `3544775`, **before** the free-sample feature landed on `master` (`5251d8d feat(samples)…`, merged in `8ba6ab7`). The new section renders `tm-sample-picker` and `tm-sample-counter`, and those snippets plus `assets/tm-samples.js`/`.css`, `snippets/cart-sample-bundle.liquid`, `sections/tm-sample-selector.liquid` and `templates/product.sample.json` **do not exist on this branch yet**.

- Merge `master` into `homepage-tiles` first (`git merge master`). Do not cherry-pick individual files. Stop and ask if the merge conflicts.
- After the merge, confirm that `snippets/tm-sample-picker.liquid`, `snippets/tm-sample-counter.liquid`, `assets/tm-samples.js` and `assets/turf-calculator.js` exist. Also confirm that `turf-calculator.js` still sets `window.TurfCalcLogic` with `computePlan` and `formatMoney`, because `tm-estimate.js` depends on them.

---

## 1. Files

| Theme file | Action | Source in `references/turf-mart-homepage-tiles-shopify/` |
|---|---|---|
| `sections/tm-promo-tiles.liquid` | **New** | `sections/tm-promos.liquid` (adapted, see §2) |
| `assets/tm-promo-tiles.css` | **New** | `assets/tm-promos.css` (scoped, see §3) |
| `assets/tm-estimate.js` | **New** | `assets/tm-estimate.js` (verbatim, except the header comment's section path) |
| `snippets/tm-sample-picker.liquid` | **Update** | Add the `stay_on_page` option only (see §4) |
| `assets/tm-samples.js` | **Update** | Apply the package's diff only (see §4) |
| `locales/en.default.json` | **Update** | Reword the checkout-gate strings (see §4) |
| `templates/index.json` | **Update** | Swap the seed to the new section (see §5) |
| `sections/tm-promos.liquid`, `assets/homepage.css`, `assets/turf-calculator.js`, `assets/tm-samples.css`, `sections/tm-sample-selector.liquid` | **Do not touch** | — |

The package's `tm-samples.js` and `tm-sample-picker.liquid` use **CRLF** line endings. The theme files use LF. Port the *changes* into the existing LF files. Do not copy the package files over them, or the whole file will show as changed in the diff.

---

## 2. `sections/tm-promo-tiles.liquid`

Start from the package's `sections/tm-promos.liquid` and keep its markup, block types (`samples`, `estimate`, `trade`, `tile`), settings IDs and defaults **exactly**, so the README's set-up steps and the seed in §5 still match. Then make these changes:

1. **Asset includes** at the top, following the `tm-*` convention:
   ```liquid
   {{ 'homepage.css' | asset_url | stylesheet_tag }}
   {{ 'tm-promo-tiles.css' | asset_url | stylesheet_tag }}
   ```
   Keep the `turf-calculator.js` and `tm-estimate.js` `<script defer>` tags inside the `estimate` branch, as in the package. `tm-sample-picker` already includes `tm-samples.css`/`.js` itself.
2. **Section wrapper class.** Use `class="tm-section tm-section--promos tm-section--promo-tiles tm-scope"`. Keep `tm-section--promos` so the padding in `homepage.css` (desktop `28px 0`, mobile `0 0 28px`) still applies. `tm-section--promo-tiles` is the scope hook for §3.
3. **Header comment.** Update it to name this file, and say it is the v2 of `tm-promos` and that `tm-promos` remains as the simple image/link version.
4. **Schema `name`:** `"Promo tiles: samples & calculator"`, so it can't be confused with the existing `"Promo tiles"` in the Add section list. Preset `name` is the same string. Add a `presets[0].blocks` list that matches the seed in §5 (`samples`, `estimate`, `trade`, `tile` ×2, with the tile icon/style/title/sub settings). Without it, a newly added section starts empty.
5. Keep every hardcoded fallback: the `turf-closeup-blades.jpg` and `commercial-turf.jpg` `asset_url` images, the `all_products['free-turf-sample']` product fallback, the `collections['all']` collection fallback, and the "Image and button" layout as the fallback when no sample variant resolves. Keep the design-mode hint when no turf type is configured.
6. Plain-English labels, no `t:` keys, `limit` on every block (`samples` 1, `estimate` 1, `trade` 1, `tile` 4), `"type": "url"` for links, which matches the package already.

Do **not** port the mockup HTML or invent new markup. The package's section is the approved Liquid version of it.

---

## 3. `assets/tm-promo-tiles.css`

Copy `assets/tm-promos.css` from the package, with one change. The package's rules on the shared grid classes would also restyle the old `tm-promos` section if it were on the same page. Prefix these with `.tm-section--promo-tiles`:

- `.promos { grid-template-rows: minmax(312px, auto) minmax(356px, auto); }` inside `@media (min-width: 1200px)`
- `.promos h2.promo__title` and `.promos p.promo__text`
- any other rule in the file that targets `.promos`, `.promo--samples`, `.promo--tile` or `.promo__*` **without** `.promo--picker` / `.promo--estimate` / `.tm-est` / `.tm-pick` in the selector (check the `@media (max-width: 749px)` block as well).

`.promo--picker`, `.promo--estimate`, `.tm-est*` and `.tm-pick*` are new names and can stay unprefixed. Keep every pixel value and breakpoint as it is (749 / 989 / 1199). Fix the header comment so it points at `sections/tm-promo-tiles.liquid`. Grep `assets/base.css` for each new class name to check it doesn't collide with Dawn.

---

## 4. Shared free-sample changes (backward-compatible)

Apply these as surgical edits to the files merged in from `master`. Diff them against the package with `diff --strip-trailing-cr` to see the exact hunks.

**`snippets/tm-sample-picker.liquid`**
- Add the header-comment paragraph about being rendered from the homepage section with `stay_on_page: true`. Name `sections/tm-promo-tiles.liquid`, not `tm-promos`.
- Add `"stayOnPage": {% if stay_on_page %}true{% else %}false{% endif %},` to the JSON config. When the parameter is left out it defaults to `false`, so the samples page and PDP behave exactly as before.

**`assets/tm-samples.js`**
- `syncHeaderCount(cart)` updates every `.tm-cart-count` (counting units, or lines with `data-count="lines"`) and the parent link's `aria-label`. Call it from the cart hydrate path.
- `if (cfg.stayOnPage) { await hydrate(); return data; }` early-returns in **both** the add and the remove paths, before the redirect to the cart.
- **No-minimum checkout gate.** `blocked` becomes `state.count > state.max`, and the message computes `extra = state.count - state.max` in place of `remaining`. Update the comment above it to match. This is the "free-sample fix" the README says the package already includes.

**`locales/en.default.json`.** The gate now means "too many", not "too few", so reword the two existing keys. Don't add new keys, and don't edit any other locale file.
- `tm_samples.checkout_blocked_one`: "Remove 1 sample from your bundle to check out."
- `tm_samples.checkout_blocked_other`: "Remove {{ count }} samples from your bundle to check out."
- Don't add a `{{ max }}` placeholder. The Liquid `t` filter in the gate snippet doesn't pass `max`, so the placeholder wouldn't be filled in.
- Check `snippets/tm-sample-checkout-gate.liquid`. If its `finish_bundle` ("Choose my samples") button no longer makes sense for an over-cap bundle, report it rather than redesign it.

`sections/tm-header.liquid` already renders `<span class="tm-cart-count">{{ cart.item_count }}</span>` (units), so no `data-count` attribute is needed.

---

## 5. Homepage default seed: `templates/index.json`

The file is editor-generated. Edit it minimally, keep the `/* … */` header comment and the existing 2-space formatting, and don't reformat other sections.

1. Add a new section entry `"tm_promo_tiles"` of `"type": "tm-promo-tiles"`, built from the package's `templates/index.json` → `sections.tm_promos`, with these changes:
   - **Drop** the `image` settings (`shopify://shop_images/...`) on `samples` and `trade`. The seed must not depend on store files, and the `asset_url` fallbacks render the same images.
   - **Drop** `samples.url` (`shopify://products/free-turf-sample`). The section already falls back to `sample_p.url`, and a dangling resource reference breaks pushes to stores without that product.
   - **Keep** the calculator's `type_N_collection` handles (`pet`, `pool`, `landscape`, `commercial`, `sports`, `eco-friendly`). The section skips a type whose collection doesn't resolve. If `shopify theme push` rejects missing collection handles, remove them and report it.
   - Keep `"disabled": true` on the `trade` block and the `block_order` `["samples", "estimate", "trade", "measure", "diy"]`.
2. **Keep** the existing `"tm_promos"` entry exactly as it is, but add `"disabled": true` to it. That way it stays configured in the editor and switching back is one click.
3. In `"order"`, put `"tm_promo_tiles"` directly after `"tm_promos"`. The final order is `tm_hero, tm_turf_types, tm_promos, tm_promo_tiles, tm_best_sellers, tm_feature, tm_reviews, tm_usps`.
4. Don't import anything else from the package's `index.json` (hero image, copy and so on). It is a full store export and would overwrite the repo's seed.

Validate the result by stripping the leading comment and parsing it as JSON.

---

## 6. Don'ts

- Don't edit `sections/tm-promos.liquid`, `assets/homepage.css` or `assets/turf-calculator.js`.
- Don't write into `references/` (it's source material only).
- Don't move the CSS/JS includes into `layout/theme.liquid` or a template.
- Don't duplicate roll maths in `tm-estimate.js`. Always call `window.TurfCalcLogic.computePlan`.
- Don't add Google Fonts, `t:` schema keys, or edits to non-`en` locale files.

---

## 7. Verify

1. `shopify theme check`. No new errors in the touched files.
2. Strip the comment from `templates/index.json` and parse it as JSON.
3. `shopify theme dev`, then run the README's **Test checklist** on the homepage (samples tile, calculator tile, other tiles), at 1440 / 1200 / 990 / 750 / 390 px. Pay particular attention to:
   - 180 m² Landscape gives `2 × 20 m + 1 × 10 m · 185.50 m²`. 8 × 5 gives `40.00 m²`, then `1 × 12 m · 44.52 m²`.
   - Adding or removing samples stays on the homepage, and the header `.tm-cart-count` updates.
   - The Free sample page and the PDP "Get free sample" button still redirect to the cart, because they don't set `stay_on_page`.
   - A cart with 1–4 samples checks out without the gate appearing.
4. In the theme editor, add the old **Promo tiles** (`tm-promos`) section to a test page and confirm it still looks exactly as before. This shows the new CSS is properly scoped.
5. Report anything you couldn't verify, for example missing collections or the free-sample product on the dev store.
