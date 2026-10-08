# Prompt — Build `tm-footer-v3` (logo left · menus middle · mailing form right)

> Give this whole file to the agent doing the work. It is the single source of instructions
> for creating a **new** footer section, `tm-footer-v3`, using `tm-footer-v2` as the
> starting point. Do not implement anything beyond what is described here.

## Objective

Create a third footer style as a **new, standalone section** whose top row is laid out in
three zones on desktop:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  [ SITE LOGO ]      Shop        Help        Trade       Join our mailing  │
│                     Pet Turf    Delivery    Trade acc…  list              │
│  (optional tagline) Pool Turf   Returns     Bulk orders [ email ][Sign up]│
│                     …           …                       (→)               │
├───────────────────────────────────────────────────────────────────────────┤
│                        (optional) giant wordmark                          │
│                  © 2026 Turf Mart, All rights Reserved                    │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Left:** the site logo (linked to the home page).
- **Middle:** the three link columns (Shop / Help / Trade) — same data model as v2.
- **Right:** the mailing-list signup form — same markup/behaviour as v2.
- Bottom: copyright line (wordmark optional, see §Settings).
- Fully responsive at every width from 320px to 2560px — no horizontal scroll, no
  overlapping, no clipped text.

## Scope & constraints

- **Additive only.** Do **not** edit `sections/tm-footer-v2.liquid`, `assets/tm-footer-v2.css`,
  `sections/tm-footer.liquid`, or `assets/homepage.css`. v3 is built alongside them.
- **Do not wire it live.** Do not change `sections/footer-group.json` (it currently orders
  `tm-footer-v2` + `tm-quickbar`). The merchant swaps footers in the theme editor. Because
  the section has `presets` and the footer group type is `footer`, it will be addable there.
- Follow `AGENTS.md`: `tm-` prefix, plain-English schema labels (no `t:` keys), `presets`
  required, `"type": "url"` for link settings, `image_picker` with `asset_url` fallback,
  never add a Google Fonts `<link>`, CMS menu source overrides blocks with a hardcoded
  fallback that is never removed.

## Files to create

| File | Start from | Notes |
| --- | --- | --- |
| `sections/tm-footer-v3.liquid` | copy of `sections/tm-footer-v2.liquid` | Rename every `tm-footer-v2` class/id → `tm-footer-v3`. |
| `assets/tm-footer-v3.css` | copy of `assets/tm-footer-v2.css` | Rename `.tm-footer-v2*` → `.tm-footer-v3*`, CSS vars `--tm-fv2-*` → `--tm-fv3-*`. Then rework the layout per §Layout. |

The section self-includes only its own stylesheet at the top, exactly like v2:
`{{ 'tm-footer-v3.css' | asset_url | stylesheet_tag }}`. No JS is needed.

## Markup (`sections/tm-footer-v3.liquid`)

Keep v2's Liquid preamble (`shop_menu` / `help_menu` / `trade_menu` → `use_*_menu` flags,
`email_id` built from `section.id` — change the prefix to `tm-footer-v3-email-`).

Structure:

```liquid
<footer class="tm-footer-v3">
  <div class="tm-footer-v3__row">
    <div class="tm-footer-v3__brand">
      <a href="{{ routes.root_url }}" class="tm-footer-v3__logo" aria-label="{{ shop.name | escape }}">
        {%- comment -%} logo fallback chain — see below {%- endcomment -%}
      </a>
      {%- if section.settings.tagline != blank -%}
        <p class="tm-footer-v3__tagline">{{ section.settings.tagline | escape }}</p>
      {%- endif -%}
    </div>

    <div class="tm-footer-v3__cols">
      … three <nav class="tm-footer-v3__col" aria-label="Shop|Help|Trade"> blocks,
        copied verbatim from v2 (menu source first, block fallback second) …
    </div>

    <div class="tm-footer-v3__newsletter">
      … v2 `{%- form 'customer' -%}` copied verbatim (hidden `contact[tags]=newsletter`,
        label/heading, email input, Sign up + arrow buttons, success / error messages) …
    </div>
  </div>

  {%- if section.settings.show_wordmark -%}
    … v2 wordmark markup (text / image) unchanged apart from class rename …
  {%- endif -%}

  <div class="tm-footer-v3__bottom">
    <div class="tm-footer-v3__copyright">{{ section.settings.copyright | escape }}</div>
  </div>
</footer>
```

### Logo fallback chain

1. `section.settings.logo` (section `image_picker`) if set.
2. else global `settings.logo` (Dawn theme setting — currently `TurfMart_Logo.jpg`) if set.
3. else `{{ 'logo.png' | asset_url }}` (same fallback `tm-header` uses).

Render picker images with `image_url` + `image_tag` (`widths: '200, 300, 400, 600'`,
`sizes` matching the CSS width, `loading: 'lazy'`), and the asset fallback as a plain
`<img>` with explicit `width`/`height` (700 × 237, as in `tm-header`). The rendered width
comes from the `logo_width` setting via an inline custom property
(`style="--logo-w: {{ section.settings.logo_width }}px;"`), never a hardcoded value.

Note: the footer background is dark green and the current logo may be dark / on white —
the `logo` picker exists so the merchant can upload a light/white variant. Say this in the
setting's `info`.

## Settings (schema)

Name: `"Turf Mart — Footer v3"` (section and preset). Keep every v2 setting and block, then
add/adjust:

- **Logo** header
  - `image_picker` `logo` — "Footer logo", info: "Use a light/white version for the dark
    background. Falls back to the theme logo, then the default Turf Mart logo."
  - `range` `logo_width` — "Logo width", 80–300, step 10, unit px, default 180.
  - `text` `tagline` — "Text under logo", default blank (optional short line).
- **Newsletter** — v2's three settings unchanged (`newsletter_heading`,
  `newsletter_placeholder`, `newsletter_button_label`).
- **Wordmark** — add `checkbox` `show_wordmark` ("Show giant wordmark", default `false`,
  because the logo now carries the brand). Keep v2's `wordmark_type`, `wordmark`,
  `wordmark_image`, `wordmark_image_width` as-is.
- **Bottom bar** — `copyright` unchanged.
- **Menus** — `shop_menu` / `help_menu` / `trade_menu` `link_list` unchanged.
- Blocks: v2's `link` block unchanged (unbounded, `column` select shop/help/trade).
- Presets: copy v2's preset blocks (Shop ×5, Help ×4, Trade ×2) under the new name.

## Layout (`assets/tm-footer-v3.css`)

Keep v2's colour tokens, typography, input/button styles, message styles, wordmark and
copyright styles (renamed). Replace the top-row layout with a 3-zone grid.

v2's newsletter heading is 54px — far too large beside a logo and menus in one row. In v3
scale it down so the three zones feel balanced (desktop ~32px / line-height 1.1, `clamp()`
down on smaller widths).

### Breakpoints (match the theme's: 749 / 989 / 1199 / 1441)

**≥1200px (desktop)** — one row, three zones:

```css
.tm-footer-v3__row {
  display: grid;
  grid-template-columns: minmax(160px, auto) minmax(0, 1fr) minmax(320px, 440px);
  column-gap: clamp(40px, 5vw, 96px);
  align-items: start;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 clamp(40px, 6vw, 120px);
}
.tm-footer-v3__cols {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  column-gap: clamp(32px, 4vw, 72px);
  justify-content: center;
}
```

Menus sit centred in the middle track; the form fills the right track. Input + buttons
stay on one line (input `flex: 1 1 auto; min-width: 0`).

**≥1441px** — content capped at 1440px and centred (the `max-width` above); background
stays full bleed.

**990–1199px (small desktop / landscape tablet)** — logo left, menus beside it, form drops
to its **own full-width row** below:

```
[ LOGO ]   Shop   Help   Trade
───────────────────────────────
Join our mailing list  [email][Sign up](→)
```

`grid-template-columns: auto 1fr; grid-template-areas: "brand cols" "news news";`
The newsletter becomes a row: heading left, form right (`display: flex; align-items:
center; justify-content: space-between; gap`), wrapping if needed. Separate it with a 1px
`--tm-fv3-outline` top border + padding.

**750–989px (tablet)** — stack brand → cols → newsletter in a single-column grid: logo
left-aligned, three menu columns side by side (`repeat(3, minmax(0, 1fr))`), form full
width with the input stretching.

**≤749px (mobile)**
- Single column, `padding: 0 20px`, gaps ~32px.
- Logo at most `min(var(--logo-w), 160px)`.
- Menus in two columns (`repeat(2, minmax(0, 1fr))`, Trade wraps under Shop); one column
  at ≤359px.
- Newsletter full width; input `flex: 1 1 0`; Sign up and arrow stay on the same line as
  in v2 mobile. At ≤359px let the buttons wrap under the input (`flex-wrap: wrap`, input
  `flex-basis: 100%`).
- Keep v2's bottom padding that clears `tm-quickbar`:
  `padding-bottom: calc(106px + env(safe-area-inset-bottom, 0px));`
- Copyright centred.

At all widths: `min-width: 0` on grid/flex children, long link text wraps
(`overflow-wrap: anywhere`), link tap targets ≥ 44px tall on mobile (via padding, not font
size), visible yellow `:focus-visible` outlines on links, logo and buttons.

### Ordering

DOM order is brand → cols → newsletter, matching the visual order at every breakpoint and
keyboard tab order. Do not reshuffle with CSS `order`.

## Accessibility

- Logo link carries `aria-label="{{ shop.name }}"`, so the image uses `alt=""` (no double
  announcement).
- Each `<nav>` keeps its `aria-label`; the email `<label for>` stays bound to the input.
- Wordmark keeps `aria-hidden="true"`.

## Verification

1. `shopify theme check` — no new errors in `sections/tm-footer-v3.liquid`.
2. `shopify theme dev`, then in the theme editor add **Turf Mart — Footer v3** to the
   footer group (temporarily — don't save it live unless asked) and check widths
   **2560, 1440, 1200, 1199, 990, 989, 750, 749, 390, 320**:
   - three zones on one row at ≥1200; logo/menus row + full-width form row at 990–1199;
     stacked below 990;
   - no horizontal scroll, nothing overlaps or clips, input + buttons usable;
   - on mobile, content isn't hidden under `tm-quickbar`.
3. CMS paths: menus assigned → menu links render; menus cleared → block fallback renders.
   Logo: section picker → theme logo → `logo.png` fallback.
4. Submit the form: success message shows; an invalid email shows the error message.
5. `git diff` touches only the two new files.

## Out of scope

- Changing which footer is live (`footer-group.json`).
- Editing the v1/v2 footer files, `homepage.css`, or `tm-quickbar`.
- Social icons, payment icons, locale/currency selectors (possible follow-up prompt).
