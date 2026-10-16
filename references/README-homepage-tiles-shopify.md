# Homepage promo tiles: free-sample picker and turf calculator

This turns the approved mockup (`Turf-Mart-Homepage-Promo-Tiles-Mockup.html`) into the Shopify theme. It changes the homepage **Promo tiles** section, `tm-promos`:

| Tile | Before | After |
|---|---|---|
| Large left tile | Free samples: image and button | Free-sample picker. Customers tick up to 5 turfs and add or remove them without leaving the page |
| Wide top tile | Trade promo | Turf calculator: turf type, then area or length × width, then rolls and starting price. The button goes to that turf collection. The trade tile is kept, just switched off |
| Yellow tile | How much turf do I need? | Not sure which turf? Talk to a turf expert |
| White tile | DIY installation | Your complete install kit |

Built on the theme export of 10 Oct 2026, **including the free-sample fixes** (bundle snippet moved to `snippets/`, no 5-sample minimum).

---

## Files

| File | Status | What it does |
|---|---|---|
| `sections/tm-promos.liquid` | **Replace** | New block **Turf calculator**. The **Samples promo** block gets a *Sample picker* layout. Tiles get two new icons (Chat, Install kit). Trade block unchanged |
| `assets/tm-promos.css` | **New** | Styles for the picker tile, the calculator tile and the taller tile grid |
| `assets/tm-estimate.js` | **New** | The calculator tile (`<tm-turf-estimate>`). Uses the approved roll logic from `assets/turf-calculator.js` |
| `snippets/tm-sample-picker.liquid` | **Replace** | Adds one option, `stay_on_page`. The samples page is unchanged |
| `assets/tm-samples.js` | **Replace** | Adds stay-on-page mode, and keeps the header cart count in sync. Includes the earlier no-minimum fix |
| `templates/index.json` | **Optional** | Homepage settings with the new tiles already set up (see step 3) |

No other files change. `assets/turf-calculator.js`, `assets/homepage.css`, `assets/tm-samples.css` and the samples page section are used as they are.

---

## Install

### 1. Duplicate the theme

Go to **Online Store → Themes**, then **⋯ → Duplicate** on the live theme. Work on the copy.

### 2. Upload the code

Go to **⋯ → Edit code** on the copy:

1. **Sections → `tm-promos.liquid`:** replace its contents with the new file.
2. **Snippets → `tm-sample-picker.liquid`:** replace its contents.
3. **Assets → `tm-samples.js`:** replace its contents.
4. **Assets → Add a new asset → Create a blank file**, named `tm-promos.css` and then `tm-estimate.js`. Paste in the contents of each.
5. Click **Save** on each file.

If Shopify shows a schema error when saving `tm-promos.liquid`, check that the whole file was pasted, from the first line to `{% endschema %}`.

### 3. Set up the tiles

Use **one** of these options.

**Option A: theme editor (recommended).** This keeps any homepage edits made since the theme export.

Open **Customize** on the homepage and click the **Promo tiles** section. Set up each block as below.

1. **Samples promo:**
   - **Layout:** *Sample picker*
   - **Text:** "Pick up to 5 turf samples and we'll post them to you."
   - **Free samples page link:** the Free turf sample product
   - **Turfs to show:** a collection such as "Popular samples". Leave it blank for all turf.
   - **Product type:** `Synthetic turf`
   - **Turfs to show (number):** 6
   - **Free samples per order:** 5, matching the Free sample page setting
2. **Trade promo:** click the eye icon to hide it. Its content stays saved for later.
3. **Add block → Turf calculator,** then drag it directly under Samples promo.
   - **Turf types 1–6:** set each label and pick its collection: Pet, Pool, Landscape, Commercial, Sports and Eco-friendly. A type with no collection is left out of the list.
   - **Selected type on load:** 3 (Landscape)
   - **Roll rules:** leave as is (blank width = 3.71 m, then 4 / 20 / 2)
4. **First Promo tile** (yellow):
   - **Icon:** Chat / expert
   - **Title:** Not sure which turf?
   - **Desktop subtitle:** Talk to a turf expert on 1300 000 000.
   - **Mobile subtitle:** Talk to a turf expert.
   - **Link:** a contact page or `tel:1300000000`
5. **Second Promo tile** (white):
   - **Icon:** Install kit (box)
   - **Title:** Your complete install kit
   - **Desktop subtitle:** Turf, sand, pins, tape and glue, all in one order.
   - **Mobile subtitle:** Everything in one order.
   - **Link:** the accessories collection or install guide
6. Click **Save**.

**Option B: replace `templates/index.json`.** Only use this if nobody has edited the homepage in the theme editor since the 10 Oct export, because it overwrites the whole homepage's settings. It has the tiles above already set up, with the trade block hidden and the calculator's collections set to `pet`, `pool`, `landscape`, `commercial`, `sports` and `eco-friendly`. The tile links still need setting in the editor.

### 4. Preview, test, then publish

Run the checklist below on the copy, then publish it.

---

## How it works

### Free-sample picker tile

- The tile renders the same `tm-sample-picker` snippet as the Free sample page. The rules are the same: up to 5 samples, no minimum. It also fills the **same single sample bundle** in the cart as the samples page and the product-page "Get free sample" button. A sample added on the homepage shows "In your bundle" everywhere else.
- **Stays on the homepage.** On the samples page and product pages, adding a sample still goes to the cart page, because the theme has no cart drawer. The homepage tile passes `stay_on_page: true` instead, so after adding or removing it re-reads the cart and updates the tile, the counter and the header cart count in place. Customers can keep adding and removing freely.
- **Counter:** "N of 5 free samples selected" stays hidden until the bundle has at least one sample, as on the other surfaces.
- **Remove:** samples already in the bundle show "In your bundle" with a small ✕ to take them out. The button's text is still read out to screen readers.
- **Which turfs show:** the block's collection, filtered by product type. Up to "Turfs to show" products are listed, and the Free sample product itself is never one of them.
- **"See all samples":** goes to the Free sample page.

### Turf calculator tile

- **Roll maths:** the roll breakdown uses `window.TurfCalcLogic.computePlan` from `assets/turf-calculator.js`, the same code as the product-page calculator. For example, 180 m² gives 2 × 20 m + 1 × 10 m (185.50 m²), and 8 × 5 m gives 40 m², which is 1 × 12 m.
- **Starting price:** the collection's cheapest product, `collection.price_min`, divided by the roll width. Turf variants are priced per lineal metre, so dividing by the width gives the price per m². To show a different figure, such as a promotion, enter **From price per m²** for that type.
- **The button** reads "Shop {type}", for example "Shop pet turf", and goes to that type's collection. Pressing Enter in a field does the same.
- **Layout:** turf type always has its own row, and the second row is Area or Length | Width. The result box has a fixed height, so the card doesn't jump when switching tabs.

---

## Things to know

- **Same roll rules in two places.** The tile has its own Roll rules settings, because a homepage section can't read the product-page calculator's settings. If the cut rules ever change, change them in both places.
- **Same sample cap in two places.** "Free samples per order" exists on the homepage tile and on the Free sample page. Keep both at the same number. Whichever one the page loads sets the cap for that page.
- **The from price depends on the collection.** If a turf collection also contains accessories, `price_min` would pick up an accessory price. Keep turf collections turf-only, or use the price override.
- **Header cart count.** `tm-samples.js` updates `.tm-cart-count` after homepage add and remove. It counts units, matching `cart.item_count` in the header. If the header is changed to count products (`cart.items.size`, as suggested for the cart clutter), add `data-count="lines"` to the `<span class="tm-cart-count">` in `sections/tm-header.liquid` so the script counts the same way.
- **Turning trade back on.** Show the Trade promo block again and hide the Turf calculator block. They share the same wide slot.
- **Free postage wording.** The tile says samples are posted to the customer, and the samples page says postage is covered. Sample-only orders are currently charged $50 delivery, so confirm the wording with the client.

---

## Test checklist

**Samples tile**
- [ ] Desktop: the tile shows the image, title, 6 turfs in two columns, "Add N free samples to cart" and "See all samples"
- [ ] Tick 2 and click Add. You stay on the homepage, both show "In your bundle", the counter shows 2 of 5 and the header cart count goes up
- [ ] Tick 3 more. The rest grey out at 5 of 5
- [ ] ✕ on one sample removes it. The counter drops and that turf can be ticked again
- [ ] The cart page shows one "free samples" line with the right turfs, and checkout works with 1 to 5 samples
- [ ] Samples added on a product page show as "In your bundle" on the homepage, and the other way round
- [ ] Mobile: a white card with no image, two columns and a full-width button

**Calculator tile**
- [ ] 180 m² of Landscape → 2 × 20 m + 1 × 10 m · 185.50 m² · from the collection's cheapest price × 185.50
- [ ] Length × width 8 × 5 → "8 m × 5 m = 40.00 m²" · 1 × 12 m · 44.52 m²
- [ ] Switching tabs doesn't change the card's height
- [ ] Changing the type updates the price and the button ("Shop pet turf"), and the button opens that collection
- [ ] The Trade promo is hidden, and the calculator sits in its place
- [ ] Mobile: the tile stacks, with turf type on its own row and length and width side by side

**Other tiles**
- [ ] The yellow tile shows the chat icon and "Not sure which turf?"
- [ ] The white tile shows the box icon and "Your complete install kit"
