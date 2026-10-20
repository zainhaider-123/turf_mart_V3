/* Turf Mart — homepage quick turf estimate (sections/tm-promo-tiles.liquid,
   "Turf calculator" block).

   Uses the approved roll logic from assets/turf-calculator.js
   (window.TurfCalcLogic.computePlan), so the roll breakdown always matches the
   product-page calculator. The estimate is priced at the chosen turf type's
   "from" price per m². The button links to that turf type's collection. */
(function () {
  'use strict';
  if (!window.customElements || customElements.get('tm-turf-estimate')) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  class TurfEstimate extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      var logic = window.TurfCalcLogic;
      if (!logic) {
        // turf-calculator.js loads with defer just before this file; retry once it has run.
        if (!this._waited) { this._waited = true; window.addEventListener('DOMContentLoaded', () => this.connectedCallback()); }
        return;
      }
      this._ready = true;
      try {
        this.cfg = JSON.parse(this.querySelector('script[data-tm-estimate-config]').textContent);
      } catch (e) {
        console.error('tm-turf-estimate: invalid config', e);
        return;
      }
      this.logic = logic;
      this.mode = 'area';
      this.calcCfg = {
        rollWidth: Number(this.cfg.rollWidth) || 3.71,
        sandRate: 0,
        lineal: this.cfg.lineal,
        turf: { pricePerMetre: 0 },
        sand: { price: 0, bagKg: 20 },
        pins: { price: 0, perSqm: 5, perBox: 100 },
        tape: { price: 0, rollM: 100 },
        glue: { price: 0, mPerL: 5, drumL: 20 }
      };

      var q = (sel) => this.querySelector(sel);
      this.form = q('[data-est-form]');
      this.typeSel = q('[data-est-type]');
      this.areaIn = q('[data-est-area]');
      this.lenIn = q('[data-est-length]');
      this.widIn = q('[data-est-width]');
      this.result = q('[data-est-result]');
      this.cta = q('[data-est-cta]');
      this.ctaLabel = q('[data-est-cta-label]');
      this.modeBtns = this.querySelectorAll('[data-est-mode]');
      if (!this.typeSel || !this.typeSel.options.length) return;

      this.typeSel.addEventListener('change', () => { this.updateLink(); this.update(); });
      [this.areaIn, this.lenIn, this.widIn].forEach((el) => el.addEventListener('input', () => this.update()));
      this.modeBtns.forEach((btn) => btn.addEventListener('click', () => this.setMode(btn.dataset.estMode)));
      this.form.addEventListener('submit', (e) => { e.preventDefault(); window.location.href = this.cta.href; });

      this.updateLink();
      this.update();
    }

    setMode(mode) {
      this.mode = mode;
      this.modeBtns.forEach((b) => b.setAttribute('aria-selected', b.dataset.estMode === mode ? 'true' : 'false'));
      this.querySelectorAll('[data-est-show]').forEach((el) => { el.hidden = el.dataset.estShow !== mode; });
      this.update();
    }

    updateLink() {
      var opt = this.typeSel.selectedOptions[0];
      if (!opt) return;
      this.cta.href = opt.dataset.url;
      this.form.action = opt.dataset.url;
      this.ctaLabel.textContent = this.cfg.buttonPrefix + ' ' + opt.textContent.trim().toLowerCase();
    }

    money(cents) { return this.logic.formatMoney(cents, this.cfg.moneyFormat); }

    update() {
      var t = this.cfg.text;
      var plan = this.logic.computePlan(this.calcCfg, {
        mode: this.mode,
        area: parseFloat(this.areaIn.value),
        length: parseFloat(this.lenIn.value),
        width: parseFloat(this.widIn.value)
      });
      if (!plan) {
        this.result.innerHTML = '<span class="tm-est__hint">' + esc(this.mode === 'dims' ? t.hintDims : t.hintArea) + '</span>';
        return;
      }
      var opt = this.typeSel.selectedOptions[0];
      var fromCents = parseFloat(opt.dataset.from) || 0;
      var rolls = plan.grouped.map((g) => g.count + ' × ' + g.length + ' m').join(' + ');
      var areaLine = this.mode === 'dims'
        ? parseFloat(this.lenIn.value) + ' m × ' + parseFloat(this.widIn.value) + ' m = '
        : t.yourArea + ' ';
      var priceLine = fromCents > 0
        ? ' <b>' + esc(this.money(plan.coverage * fromCents)) + '</b> (' + esc(this.money(fromCents)) + '/m²)'
        : '';
      this.result.innerHTML =
        '<span class="tm-est__meta">' + esc(areaLine) + '<b>' + plan.area.toFixed(2) + ' m²</b></span>' +
        '<span class="tm-est__rolls">' + esc(rolls) + '</span>' +
        '<span class="tm-est__meta">' + plan.coverage.toFixed(2) + ' ' + (fromCents > 0 ? esc(t.coverage) + priceLine : 'm² of turf') + '</span>';
    }
  }

  customElements.define('tm-turf-estimate', TurfEstimate);
})();
