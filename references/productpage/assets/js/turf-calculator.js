/*
 * Turf Mart — materials calculator for Dawn (Online Store 2.0)
 * ----------------------------------------------------------------
 * Ported from the Turf Mart HTML mockup. All numbers (roll width, sand
 * rate, prices, pack sizes) come from the JSON config that the
 * `turf-calculator` snippet prints from product data, metafields and
 * block settings, so nothing here needs editing when prices change.
 *
 * Money is handled in cents (Shopify's native unit) to avoid rounding drift.
 */
(function () {
  'use strict';

  var EPS = 1e-9; // guards against float error, e.g. 22.26 / 3.71 = 6.000000000000001

  /* ================= pure logic (no DOM) — unit tested ================= */

  function roundUpToStep(lineal, step, min) {
    if (lineal % step !== 0) lineal += step - (lineal % step);
    return Math.max(lineal, min);
  }

  // Greedily split a total lineal-metre length into cuts no longer than max.
  function planRolls(totalLineal, min, max) {
    var rolls = [];
    var remaining = totalLineal;
    while (remaining >= max) { rolls.push(max); remaining -= max; }
    if (remaining > 0) rolls.push(Math.max(remaining, min));
    if (!rolls.length) rolls.push(min);
    return rolls;
  }

  function groupRolls(rolls) {
    var counts = {};
    rolls.forEach(function (len) { counts[len] = (counts[len] || 0) + 1; });
    return Object.keys(counts)
      .map(function (len) { return { length: +len, count: counts[len] }; })
      .sort(function (a, b) { return b.length - a.length; });
  }

  /*
   * input: { mode: 'area'|'dims'|'roll', area, length, width, rollLength }
   * cfg:   the JSON config (see snippet)
   * Returns null when there is nothing to price yet.
   */
  function computePlan(cfg, input) {
    var rollWidth = cfg.rollWidth;
    var L = cfg.lineal;
    var totalLineal, area;

    if (input.mode === 'roll') {
      // Use the picked length directly (the mockup converted to m² and back,
      // which turned a 6 m pick into 8 m and 12 m into 14 m through float error).
      var picked = +input.rollLength;
      if (!(picked > 0)) return null;
      totalLineal = roundUpToStep(picked, L.step, L.min);
      area = totalLineal * rollWidth;
    } else {
      area = input.mode === 'dims'
        ? ((+input.length > 0 && +input.width > 0) ? +input.length * +input.width : NaN)
        : +input.area;
      if (!(area > 0)) return null;
      totalLineal = roundUpToStep(Math.ceil(area / rollWidth - EPS), L.step, L.min);
    }

    var rolls = planRolls(totalLineal, L.min, L.max);
    var sumLineal = rolls.reduce(function (a, b) { return a + b; }, 0);
    var coverage = Math.round(sumLineal * rollWidth * 100) / 100;
    var longest = Math.max.apply(null, rolls);
    var seamMetres = rolls.length > 1 ? sumLineal - longest : 0;
    var hasSeams = seamMetres > 0;

    var sandRate = cfg.sandRate;
    var sandKg = coverage * sandRate;
    var sandBags = Math.ceil(sandKg / cfg.sand.bagKg - EPS);

    var pinCount = Math.ceil(coverage * cfg.pins.perSqm - EPS);
    var pinBoxes = Math.max(1, Math.ceil(pinCount / cfg.pins.perBox));

    var tapeRolls = hasSeams ? Math.ceil(seamMetres / cfg.tape.rollM) : 1;
    var glueLitres = hasSeams ? Math.ceil(seamMetres / cfg.glue.mPerL) : cfg.glue.drumL;
    var glueDrums = Math.ceil(glueLitres / cfg.glue.drumL);

    return {
      mode: input.mode,
      area: area,
      width: rollWidth,
      totalLineal: sumLineal,
      rolls: rolls,
      grouped: groupRolls(rolls),
      coverage: coverage,
      seamMetres: seamMetres,
      turf: { cents: cfg.turf.pricePerMetre * sumLineal },
      sand: { bags: sandBags, kg: sandKg, rate: sandRate, cents: sandBags * cfg.sand.price },
      pins: { count: pinCount, boxes: pinBoxes, cents: pinBoxes * cfg.pins.price },
      tape: { rolls: tapeRolls, cents: tapeRolls * cfg.tape.price, hasSeams: hasSeams },
      glue: { drums: glueDrums, litres: glueLitres, cents: glueDrums * cfg.glue.price, hasSeams: hasSeams }
    };
  }

  // Line items for /cart/add.js. `addons` = { sand, pins, tape, glue } booleans.
  function buildCartItems(cfg, plan, addons, token) {
    var items = [];
    plan.grouped.forEach(function (g) {
      items.push({
        id: cfg.turf.variantId,
        quantity: g.length * g.count, // turf variant is priced per lineal metre
        properties: {
          'Cut lengths': g.count + ' × ' + g.length + ' m',
          'Coverage': (g.length * g.count * plan.width).toFixed(2) + ' m²',
          '_turf_calc': token // keeps separate calculator orders from merging into one line
        }
      });
    });
    var extras = [
      ['sand', plan.sand.bags],
      ['pins', plan.pins.boxes],
      ['tape', plan.tape.rolls],
      ['glue', plan.glue.drums]
    ];
    extras.forEach(function (e) {
      var key = e[0];
      if (addons[key] && cfg[key].variantId && e[1] > 0) {
        items.push({ id: cfg[key].variantId, quantity: e[1] });
      }
    });
    return items;
  }

  function formatMoney(cents, format) {
    format = format || '${{amount}}';
    cents = Math.round(cents);
    function withDelims(n, precision, thousands, decimal) {
      var parts = (n / 100).toFixed(precision).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts.join(decimal);
    }
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, key) {
      switch (key) {
        case 'amount_no_decimals': return withDelims(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return withDelims(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withDelims(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return withDelims(cents, 2, "'", '.');
        default: return withDelims(cents, 2, ',', '.');
      }
    });
  }

  var logic = {
    computePlan: computePlan,
    planRolls: planRolls,
    groupRolls: groupRolls,
    buildCartItems: buildCartItems,
    formatMoney: formatMoney
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  if (typeof window === 'undefined') return;
  window.TurfCalcLogic = logic;
  if (!window.customElements || customElements.get('turf-calculator')) return;

  /* ================= <turf-calculator> custom element ================= */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  class TurfCalculator extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      try {
        this.cfg = JSON.parse(this.querySelector('script[data-turf-config]').textContent);
      } catch (e) {
        console.error('turf-calculator: missing or invalid config', e);
        return;
      }
      this.state = {
        mode: 'area',
        plan: null,
        addons: { sand: true, pins: true, tape: false, glue: false },
        touched: { tape: false, glue: false },
        busy: false
      };
      this.$ = function (sel) { return this.querySelector(sel); }.bind(this);
      this.buyBar = document.getElementById('TurfBuyBar-' + this.dataset.blockId);

      this.querySelectorAll('[data-calc-tab]').forEach((tab) => {
        tab.addEventListener('click', () => this.switchMode(tab.dataset.calcTab));
      });
      ['[data-input=area]', '[data-input=length]', '[data-input=width]'].forEach((sel) => {
        var el = this.$(sel);
        if (el) el.addEventListener('input', () => this.recalc());
      });
      var pick = this.$('[data-input=roll]');
      if (pick) pick.addEventListener('change', () => this.recalc());

      this.$('[data-materials]').addEventListener('change', (e) => {
        var key = e.target && e.target.dataset.addon;
        if (!key) return;
        this.state.addons[key] = e.target.checked;
        if (key in this.state.touched) this.state.touched[key] = true;
        this.updateTotals();
      });

      var buttons = Array.prototype.slice.call(this.querySelectorAll('[data-add-to-cart]'));
      if (this.buyBar) buttons = buttons.concat(Array.prototype.slice.call(this.buyBar.querySelectorAll('[data-add-to-cart]')));
      this.addButtons = buttons;
      buttons.forEach((b) => b.addEventListener('click', () => this.addToCart()));

      var sample = this.$('[data-add-sample]');
      if (sample) sample.addEventListener('click', () => this.addSample(sample));

      if (this.buyBar) {
        // Move to <body> so theme animations (CSS transforms) can't break position: fixed.
        document.body.appendChild(this.buyBar);
        this.buyBar.hidden = false;
        document.body.classList.add('has-turf-buybar');
      }
      this.recalc();
    }

    disconnectedCallback() {
      document.body.classList.remove('has-turf-buybar');
    }

    switchMode(mode) {
      this.state.mode = mode;
      this.querySelectorAll('[data-calc-tab]').forEach((t) => {
        t.setAttribute('aria-selected', t.dataset.calcTab === mode ? 'true' : 'false');
      });
      this.querySelectorAll('[data-calc-panel]').forEach((p) => {
        p.hidden = p.dataset.calcPanel !== mode;
      });
      this.recalc();
    }

    readInput() {
      var val = (sel) => { var el = this.$(sel); return el ? parseFloat(el.value) : NaN; };
      return {
        mode: this.state.mode,
        area: val('[data-input=area]'),
        length: val('[data-input=length]'),
        width: val('[data-input=width]'),
        rollLength: val('[data-input=roll]')
      };
    }

    money(cents) { return formatMoney(cents, this.cfg.moneyFormat); }

    recalc() {
      var cfg = this.cfg;
      var plan = computePlan(cfg, this.readInput());
      this.state.plan = plan;
      var msg = this.$('[data-message]');
      var list = this.$('[data-materials]');
      this.$('[data-error]').hidden = true;

      if (!plan) {
        msg.textContent = cfg.text.prompt;
        list.innerHTML = '<div class="turf-calc__empty">' + esc(cfg.text.empty) + '</div>';
        this.setTotals(0, '', '', cfg.text.buybarPrompt);
        this.setButtonsDisabled(true);
        return;
      }

      var rollsLabel = plan.grouped.map((g) => g.count + ' × ' + g.length + ' m').join(' + ');
      msg.textContent = plan.mode === 'roll'
        ? 'You picked ' + rollsLabel + ' — ' + plan.coverage.toFixed(2) + ' m² of turf.'
        : 'For ' + plan.area.toFixed(1) + ' m², order ' + rollsLabel + ' (' + plan.coverage.toFixed(2) +
          ' m² of roll' + (plan.coverage > plan.area + EPS ? ', rounded up to the nearest cut length' : '') + ').';

      // Tape and glue default on only when there is a seam, unless the shopper chose otherwise.
      if (!this.state.touched.tape) this.state.addons.tape = plan.tape.hasSeams;
      if (!this.state.touched.glue) this.state.addons.glue = plan.glue.hasSeams;

      var rows = [];
      rows.push(this.row({
        required: true,
        title: cfg.turf.title + ' — ' + rollsLabel,
        sub: plan.coverage.toFixed(2) + ' m² of turf, ' + plan.width + ' m wide rolls',
        cents: plan.turf.cents
      }));
      if (cfg.sand.variantId) rows.push(this.row({
        addon: 'sand',
        title: 'Sand infill — ' + plan.sand.bags + ' × ' + cfg.sand.bagKg + ' kg bag' + (plan.sand.bags > 1 ? 's' : ''),
        sub: plan.sand.kg.toFixed(0) + ' kg needed at ' + plan.sand.rate + ' kg/m²',
        cents: plan.sand.cents
      }));
      if (cfg.pins.variantId) rows.push(this.row({
        addon: 'pins',
        title: 'Turf pins — ' + plural(plan.pins.boxes, 'box', 'boxes') + ' of ' + cfg.pins.perBox,
        sub: 'Fixes the perimeter and seams',
        cents: plan.pins.cents
      }));
      if (cfg.tape.variantId) rows.push(this.row({
        addon: 'tape',
        title: 'Jointing tape — ' + plan.tape.rolls + ' × ' + cfg.tape.rollM + ' m roll' + (plan.tape.rolls > 1 ? 's' : ''),
        sub: plan.tape.hasSeams
          ? 'Covers the seams between your ' + plan.rolls.length + ' rolls'
          : 'Optional — for joining to an existing lawn or garden edge',
        cents: plan.tape.cents
      }));
      if (cfg.glue.variantId) rows.push(this.row({
        addon: 'glue',
        title: 'Turf glue — ' + plan.glue.drums + ' × ' + cfg.glue.drumL + ' L drum' + (plan.glue.drums > 1 ? 's' : ''),
        sub: plan.glue.hasSeams
          ? 'Bonds the seams alongside the jointing tape'
          : 'Optional — for joining to an existing lawn or garden edge',
        cents: plan.glue.cents
      }));
      list.innerHTML = rows.join('');

      this.updateTotals();
      this.setButtonsDisabled(!cfg.turf.available);
    }

    row(o) {
      var id = o.addon ? 'TurfAddon-' + this.dataset.blockId + '-' + o.addon : '';
      var control = o.required ? '' :
        '<input type="checkbox" id="' + id + '" data-addon="' + o.addon + '"' +
        (this.state.addons[o.addon] ? ' checked' : '') + '>';
      var tag = o.required ? 'div' : 'label';
      return '<' + tag + ' class="turf-calc__row' + (o.required ? ' is-required' : '') + '"' +
        (o.required ? '' : ' for="' + id + '"') + '>' +
        '<span class="turf-calc__row-main">' + control +
        '<span class="turf-calc__row-text"><span class="turf-calc__row-title">' + esc(o.title) +
        (o.required ? ' <span class="turf-calc__badge">Required</span>' : '') + '</span>' +
        '<span class="turf-calc__row-sub">' + esc(o.sub) + '</span></span></span>' +
        '<span class="turf-calc__row-price">' + esc(this.money(o.cents)) + '</span></' + tag + '>';
    }

    updateTotals() {
      var plan = this.state.plan;
      if (!plan) return;
      var a = this.state.addons, cfg = this.cfg;
      var total = plan.turf.cents;
      var included = [plural(plan.rolls.length, 'roll', 'rolls')];
      if (a.sand && cfg.sand.variantId) { total += plan.sand.cents; included.push(plural(plan.sand.bags, 'sand bag', 'sand bags')); }
      if (a.pins && cfg.pins.variantId) { total += plan.pins.cents; included.push(plural(plan.pins.boxes, 'pin box', 'pin boxes')); }
      if (a.tape && cfg.tape.variantId) { total += plan.tape.cents; included.push(plural(plan.tape.rolls, 'tape roll', 'tape rolls')); }
      if (a.glue && cfg.glue.variantId) { total += plan.glue.cents; included.push(plural(plan.glue.drums, 'glue drum', 'glue drums')); }

      var note = 'For ' + plan.coverage.toFixed(2) + ' m² of turf' +
        (included.length > 1 ? ', plus ' + included.slice(1).join(', ') : '') + '.';
      var payLater = cfg.payLaterInstalments > 1
        ? 'or ' + cfg.payLaterInstalments + ' payments of ' + this.money(total / cfg.payLaterInstalments) + '*'
        : '';
      this.setTotals(total, note, payLater, included.join(' · '));
    }

    setTotals(cents, note, payLater, buybarSub) {
      var price = this.money(cents);
      this.$('[data-total]').textContent = price;
      this.$('[data-note]').textContent = note;
      this.$('[data-paylater]').textContent = payLater;
      if (this.buyBar) {
        this.buyBar.querySelector('[data-buybar-total]').textContent = price;
        this.buyBar.querySelector('[data-buybar-sub]').textContent = buybarSub;
      }
    }

    setButtonsDisabled(disabled) {
      this.addButtons.forEach((b) => { b.disabled = disabled || this.state.busy; });
    }

    showError(message) {
      var err = this.$('[data-error]');
      err.textContent = message;
      err.hidden = false;
      if (window.matchMedia('(max-width: 749px)').matches) err.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setBusy(busy) {
      this.state.busy = busy;
      this.addButtons.forEach((b) => {
        b.setAttribute('aria-busy', busy ? 'true' : 'false');
        b.textContent = busy ? this.cfg.text.adding : this.cfg.text.addToCart;
      });
      this.setButtonsDisabled(!this.state.plan || !this.cfg.turf.available);
    }

    async addToCart() {
      var plan = this.state.plan;
      if (!plan || this.state.busy) return;
      var token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      var items = buildCartItems(this.cfg, plan, this.state.addons, token);
      await this.postItems(items);
    }

    async addSample(button) {
      if (!this.cfg.sampleVariantId) return;
      button.disabled = true;
      await this.postItems([{ id: this.cfg.sampleVariantId, quantity: 1, properties: { 'Sample of': this.cfg.turf.title } }]);
      button.disabled = false;
    }

    async postItems(items) {
      this.setBusy(true);
      var drawer = document.querySelector('cart-drawer');
      var useDrawer = !!(drawer && typeof drawer.renderContents === 'function' && typeof drawer.getSectionsToRender === 'function');
      var body = { items: items };
      if (useDrawer) {
        body.sections = drawer.getSectionsToRender().map((s) => s.id);
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
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'turf-calculator', cartData: data });
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
        this.setBusy(false);
      }
    }
  }

  customElements.define('turf-calculator', TurfCalculator);
})();
