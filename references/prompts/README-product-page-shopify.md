# Turf Mart — Product page: Shopify conversion guide

This guide turns the approved product-page prototype (`turf-mart-product-page.zip`) into the Shopify theme. It covers:

- the **changes to the existing calculator code**;
- the **new metafields** to create;
- the **new theme files**;
- how to **import the Classic 35 data**.

It assumes the trial-phase calculator is already installed (`assets/turf-calculator.js`, `assets/turf-calculator.css`, `snippets/turf-calculator.liquid`). It also assumes the homepage header, footer and design tokens are, or will be, in the theme.

---

## 1. Overview of changes

| Area | What changes |
|---|---|
| Calculator script | One small change in `setBusy()` so the button icon survives "Adding…" (section 3.1) |
| Calculator snippet | New price block, new stock and delivery box, button icons, heading level, warranty line removed (section 3.2) |
| Calculator styles | `turf-calculator.css` replaced with the new brand styles (section 3.3) |
| Product layout | New section `main-turf-product.liquid` replaces Dawn's product section on the turf template (section 5) |
| Product data | 9 new product metafields, plus a new meaning for `stock_message` (section 2) |
| Accessories and recommendations | "Complete your project" uses a section setting. "You may also like" uses Shopify's product recommendations. No metafield is needed for either |
| Mobile | The homepage quick-actions bar is hidden on turf products, and the calculator's sticky buy bar is used instead |

Not needed any more: the two additions to Dawn's `sections/main-product.liquid` from the trial. The new section renders the calculator itself. You can leave those additions in place, as they're harmless, or remove them once no template uses the "Turf calculator" block.

---

## 2. Metafields

Create these under **Settings → Metafields and metaobjects → Products → Add definition**. Namespace and key must match exactly.

### Already created in the trial (keep)

| Name | Key | Type | Used for |
|---|---|---|---|
| Sand rate | `custom.sand_rate` | Decimal | Calculator sand quantity. Specification table |
| Warranty | `custom.warranty` | Single line text | Feature icon, trust row, specification table (e.g. `12-year`) |
| Roll width | `custom.roll_width` | Decimal | Optional. Leave blank for 3.71 m |
| Badge | `custom.badge` | Single line text | Yellow badge on the main image (e.g. `Save $10`). Leave blank for none |
| Stock message | `custom.stock_message` | Single line text | **New meaning:** the dispatch line under "In stock", e.g. `Ships in 1–2 days` |

**Stock message change:** previously this held the full message ("In stock, ships in 1-2 days"). The page now shows **In stock** or **Sold out** automatically from Shopify inventory, so this field should hold only the dispatch time. The Classic 35 import file already uses the new format. Update the other 15 products the same way.

### New

| Name | Key | Type | Used for | Set by |
|---|---|---|---|---|
| Short description | `custom.short_description` | Multi-line text | Paragraph under the title | CSV or admin |
| Pile height | `custom.pile_height` | Integer | Feature icon ("35mm … pile") and specification table. Value in mm | CSV or admin |
| Colour | `custom.colour` | Single line text | Feature icon and specification table | CSV or admin |
| Heat reduction | `custom.heat_reduction` | Single line text | Feature icon and specification table (e.g. `COOLplus`). Leave blank if none | CSV or admin |
| Material | `custom.material` | Single line text | Specification table | CSV or admin |
| Backing | `custom.backing` | Single line text | Specification table | CSV or admin |
| Made in | `custom.made_in` | Single line text | Specification table | CSV or admin |
| Primary collection | `custom.primary_collection` | Collection (reference) | Breadcrumb when the customer didn't arrive from a collection | **Admin only** |
| Installation guide | `custom.install_guide` | File | Downloads tab | **Admin only** |
| Data sheet | `custom.data_sheet` | File | Downloads tab | **Admin only** |
| Warranty certificate | `custom.warranty_certificate` | File | Downloads tab | **Admin only** |

When creating the three file metafields, choose type **File** and, under accepted file types, allow general files so PDFs can be attached.

Every specification row and download link only appears when its metafield has a value. Blank fields simply disappear from the page, so nothing shows as empty.

Collection and file references can't be set reliably through a CSV import. Set them on the product page in admin, under **Metafields**.

### Not metafields (use built-in Shopify data)

| Page element | Comes from |
|---|---|
| Title, brand, SKU | Product title, Vendor, variant SKU |
| Price, was price, "Save $10" next to the price | Variant price and compare-at price, converted per m² |
| Product overview text | Product description |
| Images and zoom | Product media |
| Brand link above the title | `product.vendor | url_for_vendor`, which is Shopify's automatic vendor page, so no brand collection is needed |
| In stock / Sold out | Variant inventory |

---

## 3. Changes to the existing calculator files

### 3.1 `assets/turf-calculator.js`: keep the button icon

The Add to cart button now has an icon. Without this change, the "Adding…" text would wipe it out.

Find:

```js
    setBusy(busy) {
      this.state.busy = busy;
      this.addButtons.forEach((b) => {
        b.setAttribute('aria-busy', busy ? 'true' : 'false');
        b.textContent = busy ? this.cfg.text.adding : this.cfg.text.addToCart;
      });
```

Replace with:

```js
    setBusy(busy) {
      this.state.busy = busy;
      this.addButtons.forEach((b) => {
        b.setAttribute('aria-busy', busy ? 'true' : 'false');
        var label = b.querySelector('[data-label]') || b;
        label.textContent = busy ? this.cfg.text.adding : this.cfg.text.addToCart;
      });
```

Nothing else in the script changes. The calculation logic, tests and cart format stay exactly as approved.

### 3.2 `snippets/turf-calculator.liquid`

**a) Add two variables.** At the end of the `{%- liquid … -%}` block at the top, before `-%}`, add:

```liquid
  assign compare_per_sqm = variant.compare_at_price | divided_by: roll_width | round
  assign save_per_sqm = compare_per_sqm | minus: price_per_sqm
```

**b) Replace the old price and warranty lines.** Find and delete this whole block:

```liquid
  <div class="turf-calc__headline">
    <span class="turf-calc__from">From</span>
    <span class="turf-calc__per-sqm">{{ price_per_sqm | money }}<sup>/m²</sup></span>
  </div>
  <p class="turf-calc__gst">Price per m²{% if cart.taxes_included %}, includes GST{% endif %}</p>
  {%- if warranty != blank -%}
    <p class="turf-calc__warranty">{{ warranty }} manufacturer warranty · Sand infill {{ sand_rate }} kg/m²</p>
  {%- endif -%}
```

Put this in its place:

```liquid
  <div class="turf-calc__price">
    <div class="turf-calc__headline">
      <span class="turf-calc__per-sqm">{{ price_per_sqm | money }}<span class="turf-calc__unit">/m²</span></span>
      {%- if variant.compare_at_price > variant.price -%}
        <s class="turf-calc__was">{{ compare_per_sqm | money }}/m²</s>
        <span class="turf-calc__save">Save {{ save_per_sqm | money_without_trailing_zeros }}</span>
      {%- endif -%}
    </div>
    <p class="turf-calc__gst">{{ roll_width }} m wide · sold by the lineal metre{% if cart.taxes_included %} · incl. GST{% endif %}</p>
  </div>

  <div class="pdp__status">
    <div class="pdp__status-item">
      {%- if variant.available -%}
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#175c3f"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span><b>In stock</b>{% if product.metafields.custom.stock_message != blank %}<small>{{ product.metafields.custom.stock_message }}</small>{% endif %}</span>
      {%- else -%}
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#c1442a"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>
        <span><b>Sold out</b><small>Contact us for availability</small></span>
      {%- endif -%}
    </div>
    <div class="pdp__status-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="#175c3f" stroke-width="1.8" aria-hidden="true"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>
      <span><b>{{ block.settings.delivery_title | default: 'Australia-wide delivery' }}</b><small>{{ block.settings.delivery_text | default: '$180 per order, cut to size' }}</small></span>
    </div>
  </div>
```

The `warranty` variable is no longer used by the snippet. You can delete `assign warranty = …`, or leave it.

**c) Heading level.** Change `<h3 class="turf-calc__title">` to `<h2 class="turf-calc__title">`, and its closing tag to `</h2>`. The product title is now the page's only `h1`.

**d) Buttons with icons.** Find:

```liquid
    <button type="button" class="turf-calc__buy turf-calc__buy--inline" data-add-to-cart disabled>
      {%- if variant.available -%}{{ 'products.product.add_to_cart' | t }}{%- else -%}{{ 'products.product.sold_out' | t }}{%- endif -%}
    </button>
    {%- if sample_v -%}
      <button type="button" class="turf-calc__sample" data-add-sample>Order a free sample first</button>
    {%- endif -%}
```

Replace with:

```liquid
    <div class="turf-calc__actions">
      <button type="button" class="turf-calc__buy turf-calc__buy--inline" data-add-to-cart disabled>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6"/></svg>
        <span data-label>{%- if variant.available -%}{{ 'products.product.add_to_cart' | t }}{%- else -%}{{ 'products.product.sold_out' | t }}{%- endif -%}</span>
      </button>
      {%- if sample_v -%}
        <button type="button" class="turf-calc__sample" data-add-sample>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>
          <span>Order free sample</span>
        </button>
      {%- endif -%}
    </div>
```

**e) Settings source.** The snippet reads everything from `block.settings`: the add-on products, pack sizes and cut rules. In the new section it's rendered with `block: section` (section 5), so these settings move into the section's schema. The new `delivery_title` and `delivery_text` settings are added there too.

### 3.3 `assets/turf-calculator.css`

Replace the whole file with the calculator rules from the prototype's `assets/css/pdp.css`:

- the sections headed **Calculator: price + stock**, **Calculator card** and **Mobile sticky buy bar**;
- the matching `turf-calc`, `pdp__status` and `turf-buybar` rules inside the three `@media` blocks at the bottom.

The rules use `px`, so Dawn's 62.5% root font size doesn't affect them. They rely on the brand tokens (`--green`, `--ink`, `--line`, `--mint`, `--yellow`, `--muted`, `--paper`, `--white`, `--line-soft`, `--font-display`). Those tokens come from the `:root` block of the homepage `style.css`, which goes into the theme as `assets/turf-mart-base.css` and is loaded in `layout/theme.liquid`.

---

## 4. New theme files

| File | Content |
|---|---|
| `sections/main-turf-product.liquid` | Breadcrumb, gallery, product info, calculator, trust row, detail tabs, "Complete your project", "You may also like" (section 5) |
| `assets/turf-product.css` | Everything else in the prototype's `pdp.css`: breadcrumb, gallery, info, trust row, tabs, specification table, downloads, related cards, zoom |
| `assets/turf-product.js` | The prototype's `pdp.js` **without** the "Prototype cart preview" part. Keep the gallery, zoom and tabs code |
| `templates/product.turf.json` | Replace its contents so it uses the new section (below) |

`templates/product.turf.json`:

```json
{
  "sections": {
    "main": { "type": "main-turf-product", "settings": {} }
  },
  "order": ["main"]
}
```

Re-pick the add-on products in the theme editor after switching (**Customize → Products → turf**). The section has new settings, so the previous block's picks don't carry over.

**Fonts.** Archivo Black and Public Sans are part of the homepage build. Upload their `.woff2` files to `assets/` and declare them with `@font-face` in `turf-mart-base.css`. That's faster than Google Fonts and avoids a third-party request.

**Mobile quick-actions bar.** The homepage's bottom bar and the calculator's sticky buy bar would overlap. Wrap the quick-actions bar in `layout/theme.liquid` like this:

```liquid
{%- unless template.name == 'product' and template.suffix == 'turf' -%}
  {%- comment -%} quick-actions bar markup {%- endcomment -%}
{%- endunless -%}
```

---

## 5. `sections/main-turf-product.liquid`: the key parts

The markup and class names are the prototype's `index.html` (`<main class="pdp">`), with fixed text swapped for Liquid. The dynamic parts:

### Breadcrumb (flat collections)

```liquid
{%- liquid
  assign crumb = collection
  if crumb == blank
    assign crumb = product.metafields.custom.primary_collection.value
  endif
-%}
<nav class="page-width breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="{{ routes.root_url }}">Home</a></li>
    {%- if crumb -%}<li><a href="{{ crumb.url }}">{{ crumb.title }}</a></li>{%- endif -%}
    <li aria-current="page">{{ product.title }}</li>
  </ol>
</nav>
```

`collection` is only set when the product URL includes the collection, as in `/collections/landscape-turf/products/synlawn-classic-35`. For that to happen, collection grids must link with `{{ card_product.url | within: collection }}`. In Dawn that's in `snippets/card-product.liquid`, which by default uses `card_product.url`. Change it there.

### Gallery

```liquid
<section class="gallery" aria-label="Product images" data-gallery>
  <div class="gallery__thumbs" role="list">
    {%- for media in product.media -%}
      {%- if media.media_type == 'image' -%}
        <button type="button" class="gallery__thumb{% if forloop.first %} is-active{% endif %}" role="listitem"
          aria-label="Image {{ forloop.index }}"{% if forloop.first %} aria-current="true"{% endif %}
          data-src="{{ media | image_url: width: 1400 }}" data-alt="{{ media.alt | escape }}">
          {{ media | image_url: width: 200 | image_tag: alt: '', loading: 'lazy' }}
        </button>
      {%- endif -%}
    {%- endfor -%}
  </div>
  <div class="gallery__stage">
    {%- assign first = product.featured_media -%}
    <img class="gallery__main" data-gallery-main
      src="{{ first | image_url: width: 1400 }}"
      srcset="{{ first | image_url: width: 600 }} 600w, {{ first | image_url: width: 900 }} 900w, {{ first | image_url: width: 1400 }} 1400w"
      sizes="(min-width: 990px) 50vw, 100vw" alt="{{ first.alt | escape }}"
      width="{{ first.width }}" height="{{ first.height }}">
    {%- if product.metafields.custom.badge != blank -%}
      <span class="gallery__badge">{{ product.metafields.custom.badge }}</span>
    {%- endif -%}
    <button type="button" class="gallery__zoom" data-gallery-zoom>… Click to zoom</button>
  </div>
</section>
```

In `turf-product.js`, open a larger image in the zoom view by replacing `width=1400` with `width=2400` in the image URL. Also remove the main image's `srcset` when a thumbnail is clicked, so the new `src` is the one shown.

### Title block and features

```liquid
<a href="{{ product.vendor | url_for_vendor }}" class="pdp__brand">{{ product.vendor }}</a>
<h1 class="pdp__title">{{ product.title }}</h1>
{%- if variant.sku != blank -%}<span class="pdp__sku">SKU: {{ variant.sku }}</span>{%- endif -%}
{%- if product.metafields.custom.short_description != blank -%}
  <p class="pdp__intro">{{ product.metafields.custom.short_description }}</p>
{%- endif -%}

{%- liquid
  assign m = product.metafields.custom
-%}
<ul class="pdp__features">
  {%- if m.pile_height != blank -%}
    <li>{% render 'turf-icon', name: 'leaf' %}<span>{{ m.pile_height }}mm {{ m.colour | default: 'natural' | downcase }}<br>pile</span></li>
  {%- endif -%}
  {%- if m.heat_reduction != blank -%}
    <li>{% render 'turf-icon', name: 'sun' %}<span>{{ m.heat_reduction }} heat<br>reduction</span></li>
  {%- endif -%}
  {%- if m.warranty != blank -%}
    <li>{% render 'turf-icon', name: 'shield' %}<span>{{ m.warranty }}<br>warranty</span></li>
  {%- endif -%}
</ul>
```

(`snippets/turf-icon.liquid` holds the prototype's inline SVGs, selected by `name`.)

Then render the calculator:

```liquid
{% render 'turf-calculator', product: product, block: section %}
```

### Specification table

Show only the rows that have a value:

```liquid
<table class="spec-table"><tbody>
  <tr><th scope="row">Brand</th><td>{{ product.vendor }}</td></tr>
  <tr><th scope="row">Product name</th><td>{{ product.title }}</td></tr>
  {%- if m.pile_height != blank -%}<tr><th scope="row">Pile height</th><td>{{ m.pile_height }}mm</td></tr>{%- endif -%}
  {%- if m.colour != blank -%}<tr><th scope="row">Colour</th><td>{{ m.colour }}</td></tr>{%- endif -%}
  {%- if m.heat_reduction != blank -%}<tr><th scope="row">Heat reduction</th><td>{{ m.heat_reduction }}</td></tr>{%- endif -%}
  {%- if m.material != blank -%}<tr><th scope="row">Material</th><td>{{ m.material }}</td></tr>{%- endif -%}
  {%- if m.backing != blank -%}<tr><th scope="row">Backing</th><td>{{ m.backing }}</td></tr>{%- endif -%}
  <tr><th scope="row">Roll width</th><td>{{ m.roll_width | default: 3.71 }}m</td></tr>
  <tr><th scope="row">Sold by</th><td>Lineal metre (4m minimum, 2m steps, 20m max per roll)</td></tr>
  {%- if m.sand_rate != blank -%}<tr><th scope="row">Sand infill rate</th><td>{{ m.sand_rate }} kg/m²</td></tr>{%- endif -%}
  {%- if m.warranty != blank -%}<tr><th scope="row">Warranty</th><td>{{ m.warranty }}</td></tr>{%- endif -%}
  {%- if m.made_in != blank -%}<tr><th scope="row">Made in</th><td>{{ m.made_in }}</td></tr>{%- endif -%}
</tbody></table>
```

The **Overview** tab shows `{{ product.description }}` beside this table. The **Specifications** tab shows the same table plus SKU and category.

### Delivery & returns and Downloads tabs

- **Delivery & returns:** a section setting of type `richtext`, `delivery_returns`, with the text shared by all turf products. Default it to the prototype's wording, then have the client confirm the returns policy.
- **Downloads:** one link per file metafield, shown only when the metafield has a file. Hide the whole tab when none are set:

```liquid
{%- liquid
  assign has_downloads = false
  if m.install_guide != blank or m.data_sheet != blank or m.warranty_certificate != blank
    assign has_downloads = true
  endif
-%}
{%- if m.install_guide != blank -%}
  <li><a href="{{ m.install_guide.value.url }}" target="_blank" rel="noopener">… <b>Installation guide</b><small>PDF</small></a></li>
{%- endif -%}
{%- comment -%} same for data_sheet and warranty_certificate {%- endcomment -%}
```

### Complete your project (accessories)

The same four add-ons appear for every turf, so they're a section setting rather than a metafield. Use a `product_list` setting, `complementary_products` with a limit of 4. Each card is a plain cart form, which works even if JavaScript fails:

```liquid
{%- for item in section.settings.complementary_products -%}
  <article class="mini-card">
    {{ item.featured_image | image_url: width: 400 | image_tag: class: 'mini-card__media', loading: 'lazy' }}
    <div class="mini-card__body">
      <span class="mini-card__name">{{ item.title }}</span>
      <span class="mini-card__price">{{ item.price | money }}</span>
      <form method="post" action="{{ routes.cart_add_url }}">
        <input type="hidden" name="id" value="{{ item.selected_or_first_available_variant.id }}">
        <button type="submit" class="btn btn--green mini-card__btn"{% unless item.available %} disabled{% endunless %}>Add to cart</button>
      </form>
    </div>
  </article>
{%- endfor -%}
```

Add photos to the four accessory products in admin; the prototype's icon tiles were placeholders.

### You may also like (recommendations)

Use Shopify's product recommendations. Dawn already includes the `<product-recommendations>` element in `assets/global.js`. Only other turfs are shown, and their buttons link to the product page, because turf needs an area first:

```liquid
<product-recommendations class="related__group"
  data-url="{{ routes.product_recommendations_url }}?section_id={{ section.id }}&product_id={{ product.id }}&limit=10&intent=related">
  {%- if recommendations.performed and recommendations.products_count > 0 -%}
    <h2 class="related__title">You may also like</h2>
    <div class="related__row">
      {%- assign shown = 0 -%}
      {%- for rec in recommendations.products -%}
        {%- if rec.type == 'Synthetic turf' and shown < 4 -%}
          {%- assign shown = shown | plus: 1 -%}
          {%- assign rec_width = rec.metafields.custom.roll_width.value | default: 3.71 -%}
          <article class="mini-card">
            {{ rec.featured_image | image_url: width: 400 | image_tag: class: 'mini-card__media', loading: 'lazy' }}
            <div class="mini-card__body">
              <span class="mini-card__brand">{{ rec.vendor }}</span>
              <span class="mini-card__name">{{ rec.title }}</span>
              <span class="mini-card__price">{{ rec.price | divided_by: rec_width | round | money }}<small>/m²</small></span>
              <a href="{{ rec.url }}" class="btn btn--outline-green mini-card__btn">Choose size</a>
            </div>
          </article>
        {%- endif -%}
      {%- endfor -%}
    </div>
  {%- endif -%}
</product-recommendations>
```

The price is divided by the roll width because the variant price is per lineal metre.

To pick similar products by hand instead of automatically, use Shopify's free **Search & Discovery** app (**Product recommendations → Related products**). The code above picks those choices up with no changes.

### Section schema (settings)

Copy every setting from the trial's "Turf calculator" block schema (`SETUP.md`, step 5, Edit B) into this section's `{% schema %}` `settings`. Then add:

```json
{ "type": "header", "content": "Delivery" },
{ "type": "text", "id": "delivery_title", "label": "Delivery heading", "default": "Australia-wide delivery" },
{ "type": "text", "id": "delivery_text", "label": "Delivery line", "default": "$180 per order, cut to size" },
{ "type": "richtext", "id": "delivery_returns", "label": "Delivery & returns tab" },
{ "type": "header", "content": "Complete your project" },
{ "type": "product_list", "id": "complementary_products", "label": "Accessories", "limit": 4 }
```

Keep `roll_width` without a default, as in the trial. Shopify only allows one decimal place in number defaults.

At the bottom of the section, load the files:

```liquid
{{ 'turf-product.css' | asset_url | stylesheet_tag }}
<script src="{{ 'turf-product.js' | asset_url }}" defer="defer"></script>
```

The snippet already loads `turf-calculator.css` and `turf-calculator.js`.

---

## 6. Importing the Classic 35 data

`turf-mart-classic-35-import.csv` updates Classic 35 with the new content and metafields.

1. **Create metafield definitions.** Make the 7 new text and number definitions in section 2 first (short description, pile height, colour, heat reduction, material, backing, made in). Shopify ignores metafield columns that have no definition.
2. **Import.** Go to **Products → Import**, upload the file, tick **Overwrite products with matching handles**, then **Upload and preview → Import products**.
3. **Set the admin-only fields.** Open Classic 35 in admin and set:
   - **Primary collection:** Landscape Turf;
   - **Download files:** once the client supplies the PDFs;
   - **Theme template:** product.turf. It should already be set; an import doesn't change it.
4. **Check the images.** The file has no image columns, so existing product images are kept. Upload high-resolution photos in admin.

What the file contains:

| Field | Value |
|---|---|
| Description (Overview tab) | Two paragraphs from the prototype |
| Short description | The paragraph under the title |
| Price / compare-at | $255.99 / $293.09 per lineal metre (shows as $69.00 / $79.00 per m²) |
| SKU | TM-SYN-CLASSIC-35-LM |
| SEO title and description | New |
| Sand rate / Warranty / Badge | 18 / 12-year / Save $10 (unchanged) |
| Stock message | `Ships in 1–2 days` (new format) |
| Pile height / Colour / Heat reduction | 35 / Natural multi-tone / COOLplus |
| Material / Backing / Made in | **Blank.** Not in the product spreadsheet, so these rows stay hidden until the client provides them |

---

## 7. Test checklist

- [ ] Classic 35 shows $69.00/m², ~~$79.00/m²~~ and a "Save $10" tag. The badge on the image comes from the Badge metafield
- [ ] "In stock · Ships in 1–2 days" shows. Setting inventory to 0 (with tracking on) shows "Sold out" and disables Add to cart
- [ ] Breadcrumb from the Landscape Turf collection: Home › Landscape Turf › Classic 35. From search: same, via Primary collection. With Primary collection blank: Home › Classic 35
- [ ] SYNLawn link opens the vendor page with all SYNLawn products
- [ ] Specification table hides Material, Backing and Made in while they're blank
- [ ] Downloads tab is hidden until a file is set
- [ ] 180 m² → 2 × 20 m + 1 × 10 m, $16,095.50 with all add-ons. Add to cart keeps its icon after adding, and the cart drawer opens
- [ ] "Complete your project" adds one accessory to the cart
- [ ] "You may also like" shows only turf products, priced per m², with "Choose size"
- [ ] Mobile: the sticky buy bar shows, the quick-actions bar is hidden, and the gallery thumbnails scroll
- [ ] The calculator's original acceptance tests (Documentation, section 7) still pass

---

## 8. Still open with the client

- **Free sample wording:** "Order free sample" while sample-only orders are charged $50 delivery.
- **Missing data:** material, backing and country of manufacture for each turf.
- **Policy and files:** the returns policy wording, and the PDF downloads.
- **Reviews:** these stay off the product page until a reviews app is connected.
