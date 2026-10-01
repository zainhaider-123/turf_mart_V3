# Prompt — Build a new footer section from the Figma design (do not touch the existing footer)

> Give this whole file to the agent doing the work. It is the single source of instructions
> for creating a **new** footer section matching the Figma design, without modifying the
> footer that is live today.

## Objective

Create one **new** theme section that reproduces the Figma footer design as closely as
possible (pixel parity at desktop, sensible responsive behaviour below it), fully editable
in the theme editor.

**The existing footer stays untouched and stays live.** This prompt is additive only — the
new section is built alongside `tm-footer`, not in place of it. Swapping the live footer
over to the new one is a later, separate decision.

## Figma source

- URL: `https://www.figma.com/design/16nLbQMGkj6X5Zyn2Zu8xW/Turf-Mart_Website?node-id=1-305`
- File key: `16nLbQMGkj6X5Zyn2Zu8xW`, node: `1:305` (frame **"Footer"**, 1440 × 582).
- Figma MCP connectivity was verified at the time of writing (authenticated). **Verify
  again at execution time** (e.g. `whoami`); if disconnected, stop and report instead of
  guessing the design.
- **Workflow:** load the `/figma-design-to-code` skill first, then call
  `get_design_context` for node `1:305` and use its output (code + screenshot + tokens) as
  the design reference. `get_screenshot` / `get_metadata` alone are not enough to implement.
- The file contains **only this desktop footer frame** — there is no mobile/tablet footer
  design. Responsive behaviour must be inferred (see §Responsive).

### Design summary (observed — confirm exact values against `get_design_context`)

Dark-green footer, one row of content + giant wordmark below:

- **Background:** dark green (matches the mockup's green-dark token, `#0f2f22` region —
  take the exact fill from Figma; existing `homepage.css` tokens likely already define it).
- **Left: three link columns**, headings at y=74 — `Shop` (x=120), `Help` (x=309),
  `Trade` (x=477). Bold white headings; links ~13px light text, ~24px row spacing.
  - Shop: Pet Turf, Pool Turf, Landscape Turf, Commercial Turf, Sports Turf
  - Help: Delivery, Returns, Install guides, Contact
  - Trade: Trade accounts, Bulk orders
- **Right: newsletter** (x=845, width 518) — heading **"Join our mailing list"** in the
  heavy display font (Archivo Black via `type_header_font`), then a row: outlined
  pill input 320×52 (placeholder "Email address") + yellow **"Sign up"** pill button
  (~103×52) + circular outlined arrow button 52×52 (arrow submits the form).
- **Giant wordmark:** "Turf Mart" text spanning ~1210px (x≈120, y=297, height 210) in a
  muted sage-green — full-bleed-feeling display text, not an image.
- **Copyright:** centred at y=530 — `© 2026 Turf Mart, All rights Reserved`.
- No logo image, no tagline in this design (unlike the current `tm-footer`).

## Ground rules (from AGENTS.md — non-negotiable)

- Theme is **Dawn 16.0.0**. Commands: `shopify theme dev`, `shopify theme check` (run
  after every structural `.liquid` edit — it is the only verifier),
  `shopify theme push --unpublished`.
- `references/` is never uploaded (`.shopifyignore`) and must not be modified.
- New work uses the `tm-` prefix, plain-English schema labels (no `t:` keys),
  `"type": "url"` for link settings, `presets` on sections, `limit` on block types.
- `templates/*.json`, `sections/*-group.json`, `config/settings_data.json` are
  auto-generated: keep the `/* ... */` header comment, edit minimally, never reformat.
  **For this task they are entirely off-limits** (see Scope).
- No Google Fonts `<link>` — headings use the theme's `type_header_font` (Archivo Black),
  body uses `type_body_font` (Public Sans). The fonts are already configured.
- Edit large Dawn files surgically or not at all. Prefer new files over rewriting Dawn's.
- Read `references/prompts/_archive/convert-homepage.md` (original section specs, parity
  checklist) and `references/prompts/_archive/dynamic-cms-content.md` (CMS fallback
  pattern) — this prompt follows the conventions established there.

## Scope

**In scope — create/edit only these:**

| File | Change |
|---|---|
| `sections/tm-footer-v2.liquid` | **New** section (the Figma design) |
| `assets/tm-footer-v2.css` | **New** stylesheet, self-included by the section (see Styling) |
| `assets/homepage.css` | **Only if** a tiny shared-token addition is unavoidable; no edits to existing `.tm-footer` rules |

**Out of scope — do not touch:**

- `sections/tm-footer.liquid` — the existing footer, unchanged.
- `sections/tm-quickbar.liquid` — mobile bottom bar, unchanged and unrelated.
- `sections/footer-group.json` — **do not edit.** The live footer stays `tm-footer` +
  `tm-quickbar`. The new section ships with `presets` so it appears under *Add section*;
  wiring/swapping is a later decision. Mention in your summary if the editor does not
  surface the section for the footer group (note how Shopify surfaces footer-group
  sections) rather than editing the group file yourself.
- `templates/index.json`, `sections/header-group.json`, `config/settings_data.json`,
  `locales/*`, everything in `references/`, all Dawn files.

## Architecture decisions (already made — do not re-litigate)

| Decision | Rule |
|---|---|
| New section, not a rewrite | `sections/tm-footer-v2.liquid` with its own schema. `tm-footer.liquid` is read-only reference for conventions (real newsletter form, block patterns), never edited. |
| Not wired live | Section ships unattached with `presets` (plain-English name, e.g. "Turf Mart — Footer v2 (Figma)"). No JSON group/template files change. |
| Class prefix | All new markup/classes scoped `tm-footer-v2` / `tm-footer-v2__*`. **Never reuse `.tm-footer` or generic `.footer` classes** — both already exist (Dawn + current footer) and the two footers must be style-independent. |
| Own stylesheet | `assets/tm-footer-v2.css`, included from the section itself (same pattern as `homepage.css` being section-included). Do not append to `homepage.css` unless you only need to expose an existing `:root` token. |
| Content | Every visible string/image/link is a schema setting or block. Defaults reproduce the Figma copy exactly. |
| Blocks vs settings | Repeated links = `link` blocks with a `column` select (`shop` \| `help` \| `trade`), exactly like `tm-footer`. One-off content (wordmark, newsletter heading, copyright) = section settings. |
| Newsletter | Real Shopify form: `{% form 'customer' %}` with hidden `contact[tags]` newsletter tag, `name="contact[email]"`, styled to match Figma. Success/error states wired, look unaltered. Reuse the exact pattern from `tm-footer.liquid`. |
| CMS menus (follow the archived convention) | Three optional `link_list` settings — `shop_menu`, `help_menu`, `trade_menu` (labels `"Shop menu (source)"` etc.). Source set + non-empty → render `linklists[...].links`; blank/empty → fall back to `link` blocks. Default blank so blocks render out of the box. |
| URL type | `"type": "url"` for every link setting. |
| Arrow button | The circular arrow is part of the newsletter submit (not a decorative link) — it submits the same form (a hidden submit or button inside the form). |

## Section spec — `sections/tm-footer-v2.liquid`

**Settings**

- `newsletter_heading` — default `"Join our mailing list"` (render exactly as Figma; use
  a single heading element — confirm against `get_design_context` whether the Figma label
  newline is real or a layer-name artefact).
- `newsletter_placeholder` — default `"Email address"`.
- `newsletter_button_label` — default `"Sign up"`.
- `wordmark` — default `"Turf Mart"` (the giant text; text setting, not an image).
- `copyright` — default `"© 2026 Turf Mart, All rights Reserved"`.
- `shop_menu`, `help_menu`, `trade_menu` — `"type": "link_list"` source overrides (above).

**Blocks**

- `link` (unbounded, like `tm-footer`): `label` (text), `url` (`"type": "url"`),
  `column` (select: `shop` \| `help` \| `trade`).
  - Pre-fill all 12 links from the Figma copy listed above, in Figma order, grouped into
    the three fixed columns rendered in order Shop → Help → Trade (group from
    `block_order`, don't rely on DOM order).
  - Column headings ("Shop" / "Help" / "Trade") are structural markup — hardcoded in the
    Liquid, not per-block text.

**Rendering rules**

- Escape all output (`| escape`). No hardcoded merchant-facing copy in Liquid except
  structural/sr-only labels and the three fixed column headings.
- Column headings styled bold/white per Figma; links ~13px, generous 24px spacing.
- Newsletter form success/error messaging: reuse Dawn/`tm-footer` conventions; keep the
  Figma visual state (form itself must not restyle on error beyond what `tm-footer` does).
- Include `block.shopify_attributes` on blocks.

## Styling — `assets/tm-footer-v2.css`

- Take **every** size, colour, radius, gap and font-size from `get_design_context`
  (Figma values), not from eyeballing the screenshot. Pixel parity beats elegance.
- Reuse existing design tokens where they exist (check `assets/homepage.css` `:root` /
  `tm-` tokens for the dark green, yellow, sage wordmark colour). If a token doesn't
  exist, define it scoped under `.tm-footer-v2` (or suffixed `--tm-footer-v2-*`) inside
  the new file — do not add bare global `:root` entries unless they already exist.
- **Collision safety:** grep `assets/base.css` and the existing footer/header CSS before
  reusing any generic name. Everything in the new file must be namespaced `tm-footer-v2`
  or be a unique new class. No bare `body`/`html`/unprefixed element-selector rules.
- Fonts: heading/wordmark = `var(--font-heading-family)` (Archivo Black already mapped in
  `config/settings_data.json`); body = `var(--font-body-family)`. Never `@import` Google
  Fonts.
- Breakpoints: match the mockup's — mobile ≤ 749px, tablet 750–1199px, desktop ≥ 1200px
  (values live in `assets/homepage.css`; keep consistent).

### Responsive (inferred — no Figma mobile frame exists)

- Desktop ≥1200px: exact Figma layout (three columns left, newsletter right, full-width
  wordmark, centred copyright).
- Tablet (750–1199px): keep columns + newsletter in a row if they fit, otherwise wrap the
  newsletter below the columns. Wordmark scales down but stays full-width.
- Mobile ≤749px: single column — link columns stack (Shop, Help, Trade), newsletter below
  them (input + Sign up + arrow row stays on one line if it fits at 390px, else stacks),
  wordmark scales to viewport width, copyright centred. Do **not** hide the wordmark on
  mobile (unlike `tm-footer`'s `.d-only` wordmark) unless the Figma shows otherwise —
  there is no Figma evidence either way; keeping it visible matches this design's intent.
- The mobile quickbar (`tm-quickbar`) overlaps the bottom of every page — ensure the new
  footer's copyright isn't hidden behind it at 390px (check the current `tm-footer`
  spacing and mirror it).

## Definition of done

1. `shopify theme check` passes with no new errors/warnings from the created files.
2. Existing footer untouched: `git diff` shows **no changes** to `tm-footer.liquid`,
   `tm-quickbar.liquid`, `footer-group.json`, `header-group.json`, `index.json`,
   `settings_data.json`, `locales/`, `references/`.
3. With the section added in the theme editor (Add section → "Turf Mart — Footer v2"),
   it matches node `1:305` side by side at **1440px**: layout, colours, type sizes,
   spacing, the input/button shapes, wordmark size, copyright — and remains coherent at
   **1200, 990, 750 and 390px** (per the inferred responsive rules).
4. Theme editor: every visible string and link is editable; the three menu-source
   settings exist and default blank; blocks render when a menu is cleared/empty.
5. Newsletter form is real: submitting a valid email posts to Shopify, success/error
   states appear, and the arrow button submits it too.
6. No request to `fonts.googleapis.com`; the homepage and current footer render
   pixel-identical to before the change.
7. Summarise any deviation from this prompt (and the reason) in your final reply,
  including the exact Figma values you used for colours/sizes and any responsive
  judgement calls.
