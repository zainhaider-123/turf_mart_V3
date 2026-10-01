# Prompt — Replace every theme font with self-hosted Helvetica Neue 5

> Give this whole file to the agent doing the work. It is the single source of instructions
> for switching the whole storefront from Libre Franklin / Archivo Black (and their
> `Public Sans` / `Archivo Black` fallback stacks) to the self-hosted Helvetica Neue 5 files
> already sitting in `assets/helvetica-neue-5/`, using the correct cut for every weight the
> theme actually declares.

## Objective

1. Every element renders in **Helvetica Neue** (body, headings, display, header, footer) —
   sourced from the 16 files in `assets/helvetica-neue-5/` via `asset_url`.
2. Each declared CSS `font-weight` resolves to the **correct Helvetica Neue cut**
   (400 → Roman, 500 → Medium, 700 → Bold, 800 → Heavy, …), with real `@font-face` rules —
   no faux bold, no all-fonts-at-400.
3. **Heading/display = Heavy 800** (user decision): today's Archivo Black stand-ins mostly
   declare `font-weight: 400` because Archivo Black ships one cut. With Helvetica Neue they
   must render Heavy — update those declarations to `800`.
4. Shopify's CDN font loading for the old fonts (`font_face` output, `fonts.shopifycdn.com`
   preconnect, `font_url` preloads) is removed so no unused webfonts are fetched.

## Ground rules (from AGENTS.md — non-negotiable)

- Dawn 16.0.0 Shopify theme. Verifier: `shopify theme check` — run after every structural
  `.liquid` edit. Also `shopify theme dev` for visual checks.
- `references/` (the mockup) is never modified and never uploads (`.shopifyignore`).
- `config/settings_data.json`, `templates/*.json`, `sections/*-group.json` are
  auto-generated: keep the `/* ... */` header, edit minimally, never reformat. **Do not
  touch them for this task** (see Scope).
- No Google Fonts `<link>` ever. Fonts come from theme assets only.
- Edit large Dawn files surgically (`layout/theme.liquid` etc.); prefer a new snippet over
  repeating 16 `@font-face` blocks three times.
- No comments in CSS/liquid unless already present. Plain-English labels only if a schema
  label is unavoidable (it should not be — no new settings).

## Scope

**In scope:**

| File | Change |
|---|---|
| `snippets/tm-font-faces.liquid` (**new**) | All 16 `@font-face` rules + font preloads for the critical cuts |
| `layout/theme.liquid` | Render the snippet; hardcode font CSS vars in `:root`; remove old `font_face` output, `font_modify` lines, Shopify CDN font preloads/preconnect |
| `layout/password.liquid` | Same treatment (it duplicates the font block) |
| `templates/gift_card.liquid` | Same treatment (it duplicates the font block) |
| `assets/homepage.css` | Fix `--font-body` / `--font-display` fallback stacks; display rules `font-weight: 400` → `800` |
| `assets/tm-footer-v2.css` | Fix `'Public Sans'` / `'Archivo Black'` fallback stacks |
| `assets/base.css` | Only if a grep turns up a stray old-font reference (expected: none) |

**Out of scope:**

- `references/**` — never write into the mockup (its `style.css` keeps `'Public Sans'` /
  `'Archivo Black'`; that is correct, it is a static reference).
- `config/settings_schema.json` / `config/settings_data.json` — **leave the font pickers
  exactly as they are.** They cannot select custom assets, and the hardcoded `:root` values
  below bypass them. Known limitation: the editor's Typography section still shows
  Archivo Black / Libre Franklin but no longer affects the storefront.
- Section/snippet markup, JS, locales (no new strings, no new schema keys).
- Font file formats — ship the `.otf`/`.ttf` as-is; no conversion to woff2.
- Any `font-weight` that is **not** a display/heading rule (600s, 700s, 500s, `bold`,
  `bolder`, `normal`, `var(--font-body-weight-bold)`) stay untouched — see mapping.

## Architecture decisions (already made — do not re-litigate)

| Decision | Rule |
|---|---|
| Family name | `@font-face` family is **`'Helvetica Neue'`**; every stack is `'Helvetica Neue', Helvetica, Arial, sans-serif`. No `local()` sources — only theme assets. |
| Where declared | One new snippet `snippets/tm-font-faces.liquid` emitting a `<style>` block of all 16 faces, `{% render %}`-ed from `<head>` of the three layouts. Never move it into a template JSON. |
| Vars hardcoded | In each layout's `:root`, replace the settings-driven font values with literals (below). Pickers become inert — accepted. |
| Heading weight | `--font-heading-weight: 800` (Heavy). Body weight stays `400`; `--font-body-weight-bold: 700`. |
| Display `400` → `800` | Every CSS rule whose `font-family` is the display/heading family and declares `font-weight: 400` gets `800`. Body-family rules declaring 400 keep 400. |
| Weight 600 | There is **no SemiBold file**. Leave all `font-weight: 600` declarations alone — CSS nearest-match resolves them to the 700 Bold face. Do not create a 600 face or edit the 600 rules. |
| Unused cuts | Declare all 16 faces (100–900 + italics) even though 100/200/300/900 are unused today — future-proof, zero cost since unused faces are not downloaded. |
| Preloads | Preload only **Roman (400)** and **Heavy (800)** — the above-the-fold cuts. Every font preload must include `crossorigin` (required for font preloads even same-origin). |
| Shopify CDN fonts | Remove `| font_face` output, the `font_modify` variables that only feed it, the `as="font" … | font_url }}` preloads, and the `fonts.shopifycdn.com` preconnect from all three layouts. |

## 1. `snippets/tm-font-faces.liquid` — the 16 `@font-face` rules

Emit a `<style>` element. One rule per file, `font-display: swap`, exact weights:

| Weight | Normal | Italic |
|---|---|---|
| 100 | `HelveticaNeueUltraLight.otf` | `HelveticaNeueUltraLightItalic.otf` |
| 200 | `HelveticaNeueThin.otf` | `HelveticaNeueThinItalic.otf` |
| 300 | `HelveticaNeueLight.otf` | `HelveticaNeueLightItalic.otf` |
| 400 | `HelveticaNeueRoman.otf` | `HelveticaNeueItalic.ttf` (the Roman italic is the `.ttf`) |
| 500 | `HelveticaNeueMedium.otf` | `HelveticaNeueMediumItalic.otf` |
| 700 | `HelveticaNeueBold.otf` | `HelveticaNeueBoldItalic.otf` |
| 800 | `HelveticaNeueHeavy.otf` | `HelveticaNeueHeavyItalic.otf` |
| 900 | `HelveticaNeueBlack.otf` | `HelveticaNeueBlackItalic.otf` |

No 600 face (see mapping decision). URLs via `{{ 'helvetica-neue-5/<file>' | asset_url }}`.
Keep the snippet self-contained: `presets` are not applicable to snippets.

## 2. The three layouts — `layout/theme.liquid`, `layout/password.liquid`,
`templates/gift_card.liquid`

Each currently duplicates the same three font pieces; apply the same edit in all three:

1. **Remove** the `settings.type_*_font | font_face` output (theme.liquid ~lines 68–79,
   password.liquid ~33–37, gift_card.liquid ~36–40) and, in theme.liquid, the
   `font_modify` liquid variables that only feed it.
2. **Render** `{% render 'tm-font-faces' %}` in `<head>` where the removed output was (or
   directly before it).
3. **` :root` font vars become literals** (theme.liquid ~126–137, password.liquid ~71–77,
   gift_card.liquid ~43–49):

   ```css
   --font-body-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
   --font-body-style: normal;
   --font-body-weight: 400;
   --font-body-weight-bold: 700;
   --font-heading-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
   --font-heading-style: normal;
   --font-heading-weight: 800;
   ```

   Keep `--font-body-scale` / `--font-heading-scale` exactly as they are (settings-driven).
4. **Remove** the `preload as="font" … | font_url }}` links (they point at the old Shopify
   CDN fonts) and the `<link rel="preconnect" href="https://fonts.shopifycdn.com">`
   (theme.liquid:15, password.liquid:15, gift_card.liquid:18). New Roman/Heavy preloads
   live in the snippet.

## 3. `assets/homepage.css`

- Lines ~29–30: rebuild the two stacks — drop `'Public Sans'`, `'Archivo Black'`,
  `'Arial Black'`, `system-ui` leftovers:

  ```css
  --font-body: var(--font-body-family), Helvetica, Arial, sans-serif;
  --font-display: var(--font-heading-family), Helvetica, Arial, sans-serif;
  ```

- Display rules currently at `font-weight: 400` → `800`. Known ones: `.tm-section-title`
  (line ~124), `.feature__title` (~358), mobile `.hero__title` (~558), plus any other rule
  using `var(--font-display)` that greps positive for `font-weight: 400`
  (`.cat-card__name`, `.promo__title`, `.promo__tile-title`, `.tm-footer__wordmark` —
  check each; only change the ones that actually declare 400).
- Leave `.tm-scope h1–h5 { font-weight: 700 }` — that resolves to Bold, correct per the
  mapping. Leave all other weights (800, 500, 600…) untouched.

## 4. `assets/tm-footer-v2.css`

Lines ~16 and ~201 — replace the fallback halves only, keep the `var(…)` primary:

```css
var(--font-body-family, Helvetica, Arial, sans-serif)
var(--font-heading-family, Helvetica, Arial, sans-serif)
```

## Verification (do not skip)

1. `shopify theme check` — must pass after the liquid edits.
2. Greps that must come back **empty** across `assets/*.css` and `layout/` + `templates/`
   (excluding `references/`): `Public Sans`, `Archivo Black`, `Libre Franklin`,
   `fonts.shopifycdn.com`, `font_face`.
3. Weight spot-check: `grep -r "font-weight: 400" assets/*.css` — every remaining hit must
   be a body-family rule (or Dawn default), none on display/heading rules.
4. `shopify theme dev` visual pass at 1440 / 990 / 750 / 390 px:
   - Section titles, feature title, footer wordmark, promo/cat titles render visibly
     **Heavy (800)**, not Regular.
   - Body copy is Helvetica Neue Regular; bold text (`.tm-scope h1–h5` at 700, buttons,
     eyebrows at 800) maps to Bold/Heavy — no synthetic/faux bold (letterforms look real).
   - One `font-style: italic` spot (base.css:374) renders a true italic (HelveticaNeueItalic).
   - Product pages (Dawn) headings are Heavy 800, prices/body Regular — matches
     `convert-homepage.md` parity expectations otherwise.
5. Network tab: no requests to `fonts.shopifycdn.com` or `fonts.googleapis.com`; only
   `helvetica-neue-5/*` font files (and only the ones actually used).
