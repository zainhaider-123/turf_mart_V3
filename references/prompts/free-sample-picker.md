# Prompt — Free Sample button on every PDP + a checkbox sample picker on the Free Sample product's own page

> Give this whole file to the agent doing the work. It is the single source of instructions
> for adding the free-sample feature to the Turf Mart theme. Read it end to end before
> writing any code — the architecture decision in §1 is deliberate and **must not** be
> "improved" into one-variant-per-product.

## Objective

Let a customer pick up to **5 free samples** of turf products:

1. Every product page gets a **"Get free sample"** button. Clicking it adds that
   product's sample to the cart. Clicking again increases the quantity on the same
   cart line.
2. The **Free Sample product's own page** (`/products/free-turf-sample`) becomes a
   **checkbox picker**: it lists the sampleable products, shows a checkbox for any
   sample already in the cart (checked and locked, with a Remove control), and one
   bulk **"Add N free samples to cart"** button for the pending selections.
3. A **"N of 5 free samples selected"** counter appears in the cart drawer and the
   cart page, and inline next to the PDP button.
4. At the cap (5), every add surface disables itself and says so.

Pages in scope: the default PDP, the turf PDP, the Free Sample product page
(via a new product template suffix), the cart drawer and the cart page.

Out of scope: homepage sections, header/footer, `references/` (read-only source),
and Dawn's own `sections/main-product.liquid` (unwired — see AGENTS.md).

---

## 1. Architecture decision — ONE variant, not one variant per product

**The Free Sample product keeps a single $0 variant.** Each sample is identified by a
**line item property**, not by a variant.

```js
{ id: SAMPLE_VARIANT_ID, quantity: 1,
  properties: {
    'Sample of': 'Kundu Grass 20mm',   // customer-visible label
    '_sample_id': '8123456789',        // machine marker (hidden)
    '_sample_handle': 'kundu-grass-20mm' // hidden, lets the drawer link to the product
  } }
```

Do **not** create a variant per product, and do **not** add any script, app or
automation that syncs variants to the catalog. Reasons, all of which were
deliberately accepted:

- **Nothing in Shopify does this natively.** There is no feature that auto-creates a
  product's variants from other products. Flow has no "create variant" action. Every
  variant-per-product design therefore needs a bespoke app/Admin-API sync plus a CSV
  re-import on every catalog change.
- **The catalog would rot.** Turf Mart adds and retires turf lines. With one variant
  per product, a new product is not sampleable until someone rebuilds the sample
  product. With a property, it is sampleable immediately and automatically.
- **Variant limits.** Shopify raised the limit to 2,048 variants/product on
  2025-10-15, but the Liquid storefront layer did not move in step and degrades well
  below that. You would still only have 3 option names.
- **Quantity semantics come for free.** Shopify merges cart lines that have the same
  variant *and* the same properties, so adding the same product's sample twice
  becomes one line with quantity 2. That is exactly the "each variant is treated as
  a quantity" requirement, with no extra code.
- **The pattern already exists.** `snippets/turf-calculator.liquid:58` resolves
  `sample_v`, and `assets/turf-calculator.js:395-400` already posts a sample line
  carrying a `Sample of` property. This work generalises that; it does not invent it.

`_`-prefixed properties are hidden from the customer by the existing cart-drawer and
cart-item loops (`snippets/cart-drawer.liquid:204-206`,
`sections/main-cart-items.liquid:158-160`, which skip any property whose first
character is `_`) while still reaching orders and metafields. `Sample of` has no
underscore, so it is shown to the customer. Use `_sample_id` as the authoritative
marker for "this cart line is a sample".

## 2. The 5-sample cap is client-side, and that is a known limitation

The cap is enforced in JavaScript by counting cart lines that carry `_sample_id`.
**It is not tamper-proof** — a hand-crafted `POST /cart/add.js` can exceed it.

Real server-side enforcement needs a Shopify **Cart and Checkout Validation
Function**. Per Shopify's own docs, a *custom app* containing Functions requires
**Shopify Plus**; on Basic/Grow/Advanced the only route is installing an App Store
app that ships one. That is a separate project outside this theme repo.

Do not pretend the cap is server-enforced. State the limitation in the handoff, and
do not try to fake enforcement with a cart attribute or a Liquid `cart.item_count`
check (Liquid cannot see the cart at all — `/cart` is a client-side fetch).

## 3. Hard rules (from AGENTS.md — non-negotiable)

- Theme is **Dawn 16.0.0**. `shopify theme check` is the only verifier; run it after
  every structural `.liquid` edit. No tests, no build, no lint config.
- `references/` is never modified and never uploaded (`.shopifyignore`).
- New work uses the `tm-` prefix. Generic classes that collide with Dawn
  (`.btn`, `.card`, `.count`, `.title`, …) must be prefixed `tm-` in **both** CSS and
  markup. Grep `assets/base.css` before reusing a name.
- **Each section/snippet self-includes the CSS and JS it needs** (the
  `{{ 'x.css' | asset_url | stylesheet_tag }}` + `<script … defer>` pattern at the
  top of the file, e.g. `snippets/tm-buy-box.liquid:18-19`). Do **not** move these
  into `layout/theme.liquid` or a template JSON — the other `tm-` snippets don't work
  that way.
- Every new section has `presets`. Block types with a fixed count get `limit`.
  Link settings use `"type": "url"`. Schema labels are **plain English — no `t:` keys**
  in schema.
- Add new translation keys **only** to `locales/en.default.json` (storefront strings
  that are rendered from snippets) and `locales/en.default.schema.json` (editor
  labels). There are 49 other locale files — do not touch them. Keep Dawn's existing
  `t:` keys intact.
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are
  auto-generated and start with a `/* … */` comment (strict JSON parsers fail — strip
  it before parsing). Edit minimally; never reformat.
- Edit large files surgically (`sections/main-product.liquid` is ~104KB and is dead
  code anyway — leave it completely alone, including its `sample_product` setting).
  Prefer small diffs.

---

## 4. Files

### New

| File | Purpose |
|---|---|
| `assets/tm-samples.css` | All sample styles: button, counter, picker rows, checkbox. |
| `assets/tm-samples.js` | Module-level singleton (cart state, cap) + three custom elements. |
| `snippets/tm-sample-button.liquid` | Self-contained "Get free sample" button + state label. |
| `snippets/tm-sample-counter.liquid` | "N of 5 free samples selected" readout with pips. |
| `snippets/tm-sample-picker.liquid` | Checkbox grid over a collection, in-cart rows, bulk add. |
| `sections/tm-sample-selector.liquid` | Product-template section for the Free Sample page. |
| `templates/product.sample.json` | Product template with suffix `sample`. |

### Modified

| File | Change |
|---|---|
| `snippets/tm-buy-box.liquid` | `{% render 'tm-sample-button' %}` after `.tm-buy__card` (ends line 119). |
| `sections/main-tm-product.liquid` | New `sample_product` setting; pass it to the buy box. |
| `snippets/turf-calculator.liquid` | Replace the hand-rolled `<button data-add-sample>` (lines 202-207) with the shared snippet; keep `sample_v` (line 58). |
| `assets/turf-calculator.js` | Delete `addSample()` (395-400) and its listener (214-215). Leave `postItems()` (402-440) — the main add-to-cart still uses it. |
| `sections/main-turf-product.liquid` | Keep `sample_product` (line 305); move it under a clearer `header` and relabel so it reads as "shared with the Get free sample button". |
| `snippets/cart-drawer.liquid` | Render the counter in `.drawer__footer` (line 490), above the totals block. |
| `sections/main-cart-items.liquid` | Render the counter above the items table. |
| `locales/en.default.json` | New `tm_samples.*` keys only. |

### Do not touch

`sections/main-product.liquid` (Dawn stock, unwired), `layout/theme.liquid`,
`sections/cart-drawer.liquid`, `config/*`, `templates/index.json`, `references/**`.

---

## 5. `assets/tm-samples.js` — the shared component

Follow the existing custom-element conventions: IIFE, `'use strict'`, and an
`if (customElements.get('…')) return;` guard (see `assets/tm-buy-box.js:5-7`,
`assets/turf-calculator.js:160`).

### Singleton state

```js
var state = {
  ready: false,
  max: 5,
  variantId: null,
  count: 0,                              // total sample quantity in the cart
  byProduct: { '8123456789': { lineId: '…', quantity: 1 } }
};
```

The **first** element to connect initialises `variantId` and `max` from its own
config; later elements adopt the existing singleton and just re-render. The picker
is the admin-facing control of `max` (its section setting wins); the PDP snippets
omit `max` and inherit the default of 5, so the number lives in one place.

### Hydration and sync

- On first connect: `fetch(routes.cart + 'js')`, derive `count` and `byProduct`.
- `subscribe(PUB_SUB_EVENTS.cartUpdate, …)` → **debounced 150ms refetch of
  `/cart.js`**, then notify every subscribed element to re-render. This is what keeps
  the counter correct after add, remove and quantity-stepper changes on both the
  drawer and the cart page.
- Also refetch when the `cart-drawer` element fires `open` (belt and braces).
- If the fetch fails or the response is not OK: set `count = 0`, `ready = true`.
  **Fail open** — a broken counter must never break add-to-cart.

### Counting predicate

A line is a sample when `item.properties.some(function (p) { return p.name === '_sample_id'; })`.
`count` is the sum of `item.quantity` over those lines. Build `byProduct` keyed on
the `_sample_id` value so picker rows can be pre-checked and removed individually.

### `<tm-sample-button>`

- Adds `{ id: variantId, quantity: 1, properties: {...} }` using the same JSON
  `POST /cart/add.js` shape as `assets/tm-buy-box.js:139-154`, including `sections`
  and `sections_url` from `cart-drawer.getSectionsToRender()`.
- On success: `publish(PUB_SUB_EVENTS.cartUpdate, { source: 'tm-samples', cartData: data })`,
  then `drawer.renderContents(data)`; fall back to `window.location.href = routes.cart`
  on any throw — mirror `tm-buy-box.js:159-168` exactly.
- Label states, all read from `state`:
  - `Get free sample` — nothing in cart
  - `In your cart (N)` — this product is already sampled
  - `Sample limit reached` — disabled at the cap
- Owns a `[data-error]` element with `role="alert"`, styled like
  `tm-buy-box__error`.

### `<tm-sample-counter>`

- Renders `{count} of {max} free samples selected` plus a `max`-segment pip row that
  fills as samples are used.
- `hidden` entirely when `count === 0`.
- `aria-live="polite"` so screen readers hear the count change.

### `<tm-sample-picker>`

- Rows whose product is already in the cart render **checked + disabled** with a
  small **Remove** control that posts `{ id: lineId, quantity: 0 }` to
  `/cart/change.js`.
- Remaining rows toggle a *pending* selection held in local state (not the cart).
- The primary button reads **"Add N free samples to cart"** and posts **all pending
  items in a single `/cart/add.js` request** — one request and one drawer render
  instead of N sequential posts.
- Disable remaining checkboxes once `count + pending.length >= max`, so the customer
  must remove a sample before picking another.
- The picker renders `max_samples` as its own cap; the bulk-add still re-checks the
  cap against live cart state before posting, in case the cart changed underneath.

### Config emitted by each snippet

One `<script type="application/json">` per element, parsed in `connectedCallback`:

```json
{ "variantId": 123, "sampleProductId": 456, "productId": 789,
  "productTitle": "…", "productUrl": "/products/…", "max": 5,
  "routes": { "cart": "/cart", "cartAdd": "/cart/add.js", "cartChange": "/cart/change.js" },
  "text": { … } }
```

**Every label is preformatted in Liquid.** JS never formats money or builds strings
from translation keys — the `tm-buy-box` convention (`snippets/tm-buy-box.liquid:22-48`).
The picker additionally needs an `items[]` array of `{ id, title, url, image }` for
the rows it renders.

## 6. `sections/tm-sample-selector.liquid` + `templates/product.sample.json`

`templates/product.sample.json` mirrors `templates/product.turf.json`:

```json
{ "sections": { "main": { "type": "tm-sample-selector", "settings": {} } }, "order": ["main"] }
```

Keep the auto-generated `/* … */` header comment.

Section settings (plain-English labels, no `t:` keys):

- `sample_product` — `type: "product"`; blank falls back to
  `all_products['free-turf-sample']` (a schema cannot set a default handle on a
  product setting — the same fallback pattern as `snippets/turf-calculator.liquid:50-52`).
- `collection` — `type: "collection"`; blank falls back to `collections['all']`.
- `max_samples` — `range: 1..10`, default `5`.
- `products_to_show` — `range: 4..50`, default `24`.
- `heading`, `subheading`, `empty_text` — text settings.

Layout: intro (`heading` / `subheading`) → counter → checkbox grid → bulk add button.

Two deliberate constraints:

- **This section renders no buy box.** The $0 sample product must not be buyable as a
  bare line with no product attached; the picker is the only way to add it.
- **No `{% paginate %}`.** The customer selects up to 5 across the whole list, which
  pagination would break. Cap the loop at `products_to_show` instead.
- Exclude the sample product itself from the row loop.

## 7. Locale keys

Add to `locales/en.default.json` **only**, under a new top-level `tm_samples` object,
nested to match how the snippets read them:

- `title` — "Free samples"
- `button` — "Get free sample"
- `in_cart` — "In your cart ({{ count }})"
- `limit_reached` — "Sample limit reached"
- `counter` — "{{ count }} of {{ max }} free samples selected"
- `picker_heading`, `picker_subheading`
- `add_selected` — "Add {{ count }} free samples to cart"
- `remove` — "Remove"
- `added` — "Added to your cart"
- `error` — "Sorry, we couldn't add that sample. Please try again."

Schema labels for the new section go in `locales/en.default.schema.json` only if you
use a `t:` label there — the convention is plain English, so you probably won't.

## 8. Styling

Match the existing mockup sample button, already implemented at
`assets/turf-calculator.css:96-106` and `:123-124`:

```
.turf-calc__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
.turf-calc__sample  { background: var(--white); color: var(--green); border: 2px solid var(--green); padding: 0 12px; font-size: 15px; white-space: nowrap; }
.turf-calc__sample:hover:not(:disabled) { background: var(--mint); }
/* mobile */ .turf-calc__buy, .turf-calc__sample { height: 52px; font-size: 15px; }
```

Port these values into `.tm-sample*` classes in `assets/tm-samples.css` and keep the
existing `.turf-calc__actions` grid intact around the snippet render in
`turf-calculator.liquid` (it is a two-column grid — buy button + sample button — and
must not reflow). Use the theme's colour tokens (`--green`, `--mint`, `--white`) and
the homepage type scale; never add a Google Fonts `<link>`. Disable states must be
visibly distinct, not just `cursor: not-allowed`.

## 9. Merchant rollout steps (admin — not theme code)

These are configuration, not code. Hand them to the merchant with the change:

1. Confirm the `free-turf-sample` product exists: price `0.00`, a single variant, SKU
   `TM-SAMPLE` (per the mockup catalog CSV, `references/productpage/`), **"Continue
   selling when out of stock" ON**, and **inventory tracking OFF**. Inventory-off
   also exempts the variant from Settings → Checkout → add-to-cart limit, which would
   otherwise fight the 5-cap.
2. Assign it the **template suffix `sample`** in the theme editor.
3. Point the `tm-sample-selector` section's `collection` at the sampleable turf
   products.
4. Catalog visibility: the product stays reachable at `/products/free-turf-sample`.
   Hide it from search and collections by excluding it from collections or
   unpublishing the Online Store channel — but note that unpublishing the channel
   also removes it from the cart/checkout pipeline, so prefer exclusion.
5. **Shipping:** the turf PDP already advertises *"Sample-only orders: $50"*
   (`sections/main-turf-product.liquid:329`), so a sample-only cart does have a rate.
   If that policy changes to free samples, assign the sample product the **Free
   shipping** shipping profile — otherwise a $0 cart has no rate and checkout stalls.
6. Optionally add `custom.samples` as a `list.metafield` on the sample product for
   reporting only. The feature does not read it, so there is nothing to wire up if
   you don't want it.

## 10. Verification

`shopify theme check` after the Liquid edits. Then, manually:

- Add a sample from the **default** PDP → drawer shows `1 of 5`, and a line item
  reads `Free turf sample — Sample of: <title>`.
- Click the same PDP's button again → **one** line with quantity 2, counter `2 of 5`.
- Open the **turf** PDP calculator → the sample button still sits in the
  two-column `.turf-calc__actions` grid and adds the same line.
- Open `/products/free-turf-sample` (with the suffix assigned) → the already-sampled
  product's row is checked and disabled; its Remove control drops the count to `0 of 5`.
- Select 4 pending products → one bulk add → `4 of 5`; a 5th adds and everything
  disables at `5 of 5`.
- Change quantity in the **cart drawer** and in the **cart page** → the counter updates
  in both, with no page reload.
- Reload any of those pages → the counter rehydrates from `/cart.js` without a flash of
  a wrong number (keep the element `hidden` until `state.ready`).
- Check out → `Sample of` values appear on the order line items; `_sample_id` /
  `_sample_handle` are present on the order but not displayed to the customer.

## 11. Explicitly out of scope

- One variant per product (§1).
- Server-side 5-cap via a Shopify Function (§2) — needs Shopify Plus for a custom app.
- Persisting a selection across sessions. Cart-only by decision: a Shopify cart
  survives ~30 days via cookie, so an abandoned cart keeps the selection. A
  customer metafield (`custom.samples`) would survive longer but needs a metafield
  definition in admin plus a write path; not built.
- Quantities other than +1 per click on the PDP button (the cart quantity stepper
  already handles multiples).