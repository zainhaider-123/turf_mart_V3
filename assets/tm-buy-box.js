/* Turf Mart default buy box (snippets/tm-buy-box.liquid): variant pills,
   quantity stepper and add to cart. Posts to /cart/add.js and opens Dawn's
   cart drawer the same way assets/turf-calculator.js does, falling back to
   the cart page. Prices arrive preformatted in the JSON config. */
(function () {
  'use strict';
  if (customElements.get('tm-buy-box')) return;

  class TmBuyBox extends HTMLElement {
    connectedCallback() {
      this.cfg = JSON.parse(this.querySelector('[data-tm-buy-config]').textContent);
      this.form = this.querySelector('form');
      this.idInput = this.querySelector('[data-variant-id]');
      this.qtyInput = this.querySelector('[data-qty]');
      this.button = this.querySelector('[data-add-to-cart]');
      this.label = this.button.querySelector('[data-label]');
      this.errorEl = this.querySelector('[data-error]');
      this.groups = Array.prototype.slice.call(this.querySelectorAll('[data-option-group]'));
      var id = Number(this.idInput.value);
      this.variant = this.cfg.variants.find(function (v) { return v.id === id; }) || null;

      this.addEventListener('change', (e) => {
        if (e.target.matches('[data-option]')) this.onOptionChange();
      });
      this.querySelectorAll('[data-qty-step]').forEach((btn) => {
        btn.addEventListener('click', () => this.stepQty(Number(btn.dataset.qtyStep)));
      });
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addToCart();
      });
      this.markUnavailable();
    }

    selected() {
      return this.groups.map(function (g) {
        var input = g.querySelector('input:checked');
        return input ? input.value : null;
      });
    }

    findVariant(values) {
      return this.cfg.variants.find(function (v) {
        return v.options.every(function (o, i) { return o === values[i]; });
      }) || null;
    }

    onOptionChange() {
      var values = this.selected();
      this.groups.forEach(function (g, i) {
        var out = g.querySelector('[data-option-value]');
        if (out) out.textContent = values[i];
      });
      this.variant = this.findVariant(values);
      this.render();
      this.markUnavailable();
    }

    // Grey out values that have no available variant alongside the other current selections.
    markUnavailable() {
      var values = this.selected();
      this.groups.forEach((g, i) => {
        g.querySelectorAll('[data-option]').forEach((input) => {
          var test = values.slice();
          test[i] = input.value;
          var v = this.findVariant(test);
          input.closest('.tm-buy__value').classList.toggle('is-unavailable', !v || !v.available);
        });
      });
    }

    render() {
      var v = this.variant;
      var t = this.cfg.text;
      this.hideError();

      if (v) {
        this.idInput.value = v.id;
        this.querySelector('[data-price]').textContent = v.price;
        var compare = this.querySelector('[data-compare]');
        var save = this.querySelector('[data-save]');
        compare.hidden = !v.compare;
        compare.textContent = v.compare || '';
        save.hidden = !v.save;
        save.textContent = v.save ? 'Save ' + v.save : '';

        var sku = document.querySelector('[data-tm-sku]');
        if (sku) {
          sku.hidden = !v.sku;
          sku.textContent = v.sku ? 'SKU: ' + v.sku : '';
        }

        this.qtyInput.min = v.qty.min;
        this.qtyInput.step = v.qty.step;
        if (v.qty.max) this.qtyInput.max = v.qty.max; else this.qtyInput.removeAttribute('max');
        this.stepQty(0);

        if (v.mediaId) {
          var thumb = document.querySelector('.gallery__thumb[data-media-id="' + v.mediaId + '"]');
          if (thumb && !thumb.classList.contains('is-active')) thumb.click();
        }

        var url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
      }

      this.updateButton();
    }

    updateButton() {
      var v = this.variant;
      var t = this.cfg.text;
      var available = !!(v && v.available);
      this.querySelector('[data-status-in]').hidden = !available;
      this.querySelector('[data-status-out]').hidden = available;
      this.button.disabled = !available;
      this.label.textContent = !v ? t.unavailable : available ? t.addToCart : t.soldOut;
    }

    stepQty(dir) {
      var min = Number(this.qtyInput.min) || 1;
      var step = Number(this.qtyInput.step) || 1;
      var max = Number(this.qtyInput.max) || Infinity;
      var val = (Number(this.qtyInput.value) || min) + dir * step;
      this.qtyInput.value = Math.min(Math.max(val, min), max);
    }

    async addToCart() {
      if (!this.variant || !this.variant.available) return;
      this.stepQty(0);
      this.hideError();
      this.button.disabled = true;
      this.button.setAttribute('aria-busy', 'true');
      this.label.textContent = this.cfg.text.adding;

      var drawer = document.querySelector('cart-drawer');
      var useDrawer = !!(drawer && typeof drawer.renderContents === 'function' && typeof drawer.getSectionsToRender === 'function');
      var body = { items: [{ id: this.variant.id, quantity: Number(this.qtyInput.value) }] };
      if (useDrawer) {
        body.sections = drawer.getSectionsToRender().map(function (s) { return s.id; });
        body.sections_url = window.location.pathname;
      }

      try {
        var res = await fetch(this.cfg.routes.cartAdd, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        });
        var data = await res.json();
        if (!res.ok || data.status) {
          this.showError(data.description || data.message || this.cfg.text.error);
          return;
        }
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'tm-buy-box', cartData: data });
        }
        if (useDrawer) {
          try {
            drawer.classList.remove('is-empty');
            var inner = drawer.querySelector('.drawer__inner');
            if (inner) inner.classList.remove('is-empty');
            drawer.renderContents(data);
            return;
          } catch (e) { /* fall through to cart page */ }
        }
        window.location.href = this.cfg.routes.cart;
      } catch (e) {
        this.showError(this.cfg.text.error);
      } finally {
        this.button.removeAttribute('aria-busy');
        this.updateButton();
      }
    }

    showError(msg) {
      this.errorEl.textContent = msg;
      this.errorEl.hidden = false;
    }

    hideError() {
      this.errorEl.hidden = true;
      this.errorEl.textContent = '';
    }
  }

  customElements.define('tm-buy-box', TmBuyBox);
})();
