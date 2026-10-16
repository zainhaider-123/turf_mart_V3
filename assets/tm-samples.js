/* Turf Mart — free samples (snippets/tm-sample-button.liquid,
   tm-sample-counter.liquid, tm-sample-picker.liquid).

   One module-level singleton holds the cart's sample state so every surface on
   the page agrees with every other one.

   THE CART HOLDS A SINGLE BUNDLE LINE. The Free Sample product keeps one $0
   variant, and the whole chosen selection rides on that one line as line item
   properties:

     _tm_bundle   "1"                                  marker, constant
     _tm_ids      "10197412544567,10197412151351"     product ids
     _tm_titles   "Classic 35,CoolPlay 23"            aligned with _tm_ids
     _tm_handles  "handle-a,handle-b"                 aligned with _tm_ids

   All four keys are underscore-prefixed so Dawn's cart loops hide them, and the
   cart renders the bundle with a dedicated block (see snippets/cart-sample-
   bundle.liquid) instead of the generic property list. The three data arrays
   are positional: entry i of each describes the same sample.

   Because the marker never varies, adding a sample to an existing bundle means
   REWRITING that line's properties rather than adding another line — otherwise
   every distinct selection would merge into a separate line and the customer
   would see one product per pick again.

   The 5-sample cap counts _tm_ids and is enforced client-side only; a
   hand-crafted POST /cart/add.js can exceed it. See
   references/prompts/free-sample-picker.md section 2.

   Every label arrives preformatted in Liquid; this file only substitutes
   numbers into `{{ count }}` / `{{ max }}` placeholders. It never formats money
   and never builds sentences from translation keys. */
(function () {
  'use strict';
  if (customElements.get('tm-sample-button')) return;

  var DEFAULT_MAX = 5;
  var BUNDLE_MARKER = '1';
  var BUNDLE_PROP = '_tm_bundle';

  var state = {
    ready: false,
    max: DEFAULT_MAX,
    variantId: null,
    count: 0, /* samples in the bundle plus any legacy per-sample lines */
    byProduct: {}, /* product id -> { line } legacy, or { bundle: true } */
    bundle: null, /* { line, key, ids: [], titles: [], handles: [] } */
    routes: null /* first config wins: { cart, cartAdd, cartChange, cartJs } */
  };

  var listeners = [];
  var refreshTimer = null;
  var pending = null;
  var booted = false;

  /* ---------- config ---------- */

  function readConfig(el) {
    var node = el.querySelector('[data-tm-sample-config]');
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (e) {
      return null;
    }
  }

  /* The first element that knows the values seeds the singleton. `max` is only
     ever sent by the picker, whose section setting is the single place the
     merchant changes the cap; the PDP snippets omit it and inherit the default. */
  function adopt(cfg) {
    if (!state.variantId && cfg.variantId) state.variantId = Number(cfg.variantId);
    if (cfg.max) state.max = Number(cfg.max);
    if (cfg.routes) state.routes = cfg.routes;
  }

  /* ---------- subscribe / notify ---------- */

  /* Deliberately not named `subscribe`: assets/pubsub.js declares a global
     `subscribe(event, callback)` and a local declaration of the same name
     would shadow it, silently hijacking any call meant for the pubsub. */
  function listen(fn) {
    listeners.push(fn);
    if (state.ready) fn();
    return function () {
      var i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  /* One misbehaving surface must never stop the others from updating. */
  function notify() {
    listeners.slice().forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.error('[tm-samples]', e);
      }
    });
  }

  /* ---------- helpers ---------- */

  function fill(text, vars) {
    return String(text == null ? '' : text).replace(/\{\{\s*(\w+)\s*\}\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
    });
  }

  function propName(p) {
    return p && typeof p === 'object' ? p.name : null;
  }

  function propValue(p) {
    return p && typeof p === 'object' ? p.value : p;
  }

  /* /cart.js returns properties as a plain { name: value } object; some
     endpoints return an array of { name, value }. Both have to be understood — an
     array-only reader silently finds nothing and every counter stays at zero. */
  function propOf(props, name) {
    if (!props) return null;
    if (Array.isArray(props)) {
      for (var i = 0; i < props.length; i++) {
        if (propName(props[i]) === name) return propValue(props[i]);
      }
      return null;
    }
    return Object.prototype.hasOwnProperty.call(props, name) ? props[name] : null;
  }

  function splitList(value) {
    return value == null || value === '' ? [] : String(value).split(',').filter(Boolean);
  }

  function parseBundle(props) {
    if (propOf(props, BUNDLE_PROP) !== BUNDLE_MARKER) return null;
    var ids = splitList(propOf(props, '_tm_ids'));
    var titles = splitList(propOf(props, '_tm_titles'));
    var handles = splitList(propOf(props, '_tm_handles'));
    /* The three arrays are positional; pad the shorter ones so index i always
       describes one complete sample. */
    while (titles.length < ids.length) titles.push('');
    while (handles.length < ids.length) handles.push('');
    return { ids: ids, titles: titles, handles: handles };
  }

  function parseCart(cart) {
    var count = 0;
    var byProduct = {};
    var bundle = null;
    var items = (cart && cart.items) || [];

    items.forEach(function (item, i) {
      var props = item.properties;
      /* /cart/change.js addresses a line by its 1-based POSITION, not by key —
         posting the key returns 400 "expected String to be a Integer: line".
         /cart.js exposes no index field, so it comes from array order. */
      var line = i + 1;

      var found = parseBundle(props);
      if (found) {
        /* There must only ever be one bundle; if an old cart somehow holds more
           (two different selections added before a marker was stable), keep the
           first and fold the rest into the count so the cap still holds. */
        if (!bundle) {
          bundle = { line: line, key: item.key, ids: found.ids, titles: found.titles, handles: found.handles };
        } else {
          count += found.ids.length;
        }
        return;
      }

      /* Lines written by the previous per-sample model still have to count,
         or a cart that predates the bundle would read as empty. */
      var legacyId = propOf(props, '_sample_id');
      if (legacyId !== null && legacyId !== undefined) {
        count += item.quantity;
        byProduct[String(legacyId)] = { line: line, quantity: item.quantity };
      }
    });

    if (bundle) {
      count += bundle.ids.length;
      bundle.ids.forEach(function (id) {
        byProduct[id] = { bundle: true };
      });
    }

    return { count: count, byProduct: byProduct, bundle: bundle };
  }

  /* All keys are underscore-prefixed, so Dawn's cart loops hide them and the
     cart renders a dedicated bundle block instead. Sample titles can legitimately
     contain commas, so the human-readable list is only ever rendered as a single
     opaque string — counting and lookup go through _tm_ids, which is numeric. */
  function bundleProperties(entries) {
/* Titles can themselves contain commas, so the reader must not split this on
     them. Titles are only ever *displayed*; counting and lookup go through the
     numeric _tm_ids array. */
  var titles = entries.map(function (e) {
    return e.title || '';
  });
    return {
      _tm_bundle: BUNDLE_MARKER,
      _tm_ids: entries.map((e) => String(e.id)).join(','),
      _tm_titles: titles.join(','),
      _tm_handles: entries.map((e) => e.handle || '').join(',')
    };
  }

  /* One entry per picked sample, preserving bundle order and dropping
     duplicates. */
  function mergeEntries(picks) {
    var out = [];
    var seen = {};
    if (state.bundle) {
      state.bundle.ids.forEach(function (id, i) {
        seen[id] = true;
        out.push({ id: id, title: state.bundle.titles[i], handle: state.bundle.handles[i] });
      });
    }
    picks.forEach(function (pick) {
      var id = String(pick.id);
      if (seen[id]) return;
      seen[id] = true;
      out.push({ id: id, title: pick.title || '', handle: pick.handle || '' });
    });
    return out;
  }

  /* True when this id is already spoken for, whether by the bundle or by a
     leftover legacy line. */
  function isSelected(id) {
    return Object.prototype.hasOwnProperty.call(state.byProduct, String(id));
  }

  function atCap() {
    return state.count >= state.max;
  }

  /* True once `n` more would sit exactly on the cap, i.e. nothing more can be
     added without going over it. */
  function atCapWith(n) {
    return state.count + n >= state.max;
  }

  /* True once `n` more would go *past* the cap. The cap itself is inclusive —
     exactly `max` samples is allowed — so this, not atCapWith(), decides
     whether a fresh pick is accepted. */
  function overCapWith(n) {
    return state.count + n > state.max;
  }

  /* ---------- cart reads ---------- */

  function hydrate() {
    if (!state.routes || !state.routes.cartJs || pending) return pending || Promise.resolve();
    pending = fetch(state.routes.cartJs, { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('cart');
        return res.json();
      })
      .then(function (cart) {
        var parsed = parseCart(cart);
        state.count = parsed.count;
        state.byProduct = parsed.byProduct;
        state.bundle = parsed.bundle;
      })
      .catch(function () {
        /* Fail open: a broken counter must never break add to cart. */
        state.count = 0;
        state.byProduct = {};
        state.bundle = null;
      })
      .then(function () {
        pending = null;
        state.ready = true;
        notify();
      });
    return pending;
  }

  /* Dawn re-renders the drawer's sections in place, so a debounced refetch of
     /cart.js is what keeps every counter correct after add, remove and
     quantity-stepper changes.

  The bundle is ONE line and its quantity is not customer-adjustable: Dawn's
  plus/minus controls are hidden on that line by the cart templates, because a
  quantity of 3 would read as "3 bundles" and quietly break the cap. */
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(hydrate, 150);
  }

  function boot() {
    if (booted) return;
    booted = true;
    if (typeof window.subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      window.subscribe(PUB_SUB_EVENTS.cartUpdate, scheduleRefresh);
    }
    /* Belt and braces: refetch when Dawn's cart drawer opens. Dawn does not
       dispatch an event for it, so watch for the `active` class it adds. */
    document.addEventListener('cart-drawer:open', scheduleRefresh);
    var drawer = document.querySelector('cart-drawer');
    if (drawer) {
      new MutationObserver(scheduleRefresh).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- shared post/notify plumbing ---------- */

  function drawerTarget() {
    var drawer = document.querySelector('cart-drawer');
    return drawer && typeof drawer.renderContents === 'function' && typeof drawer.getSectionsToRender === 'function'
      ? drawer
      : null;
  }

  function sectionsFor(body, drawer) {
    if (!drawer) return;
    body.sections = drawer.getSectionsToRender().map(function (s) {
      return s.id;
    });
    body.sections_url = window.location.pathname;
  }

  function announce(cfg, data) {
    if (typeof window.publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      window.publish(PUB_SUB_EVENTS.cartUpdate, { source: 'tm-samples', cartData: data });
    }
  }

  /* Mirrors the add-to-cart flow in assets/tm-buy-box.js: post, publish, then
     render the drawer, falling back to the cart page if anything throws. */
  async function postToCart(cfg, body) {
    var drawer = drawerTarget();
    sectionsFor(body, drawer);
    var res = await fetch(cfg.routes.cartAdd, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    if (!res.ok || data.status) throw new Error(data.description || data.message || cfg.text.error);
    announce(cfg, data);
    if (drawer) {
      try {
        drawer.classList.remove('is-empty');
        var inner = drawer.querySelector('.drawer__inner');
        if (inner) inner.classList.remove('is-empty');
        drawer.renderContents(data);
        return data;
      } catch (e) {
        /* fall through to cart page */
      }
    }
    window.location.href = cfg.routes.cart;
    return data;
  }

  /* `quantity: 0` deletes the line; passing `props` instead rewrites its
     properties and leaves the quantity alone. /cart/change.js addresses a line
     by 1-based position. */
  async function changeLine(cfg, line, props) {
    var drawer = drawerTarget();
    var body = props ? { line: line, properties: props } : { line: line, quantity: 0 };
    sectionsFor(body, drawer);
    var res = await fetch(cfg.routes.cartChange, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    if (!res.ok || data.status) throw new Error(data.description || data.message || cfg.text.error);
    announce(cfg, data);
    if (drawer) {
      try {
        drawer.renderContents(data);
        return data;
      } catch (e) {
        /* fall through to cart page */
      }
    }
    window.location.href = cfg.routes.cart;
    return data;
  }

  /* ---------- the bundle itself ---------- */

  /* Every add surface funnels through here so the "one line, whole selection"
     rule lives in exactly one place. Re-reads the cart first: the picker may
     have been open for a while, and the cap is measured against live state. */
  async function addToBundle(cfg, picks) {
    if (!cfg.variantId || !picks.length) return null;
    await hydrate();

    var entries = mergeEntries(picks);
    if (entries.length > state.max) {
      throw new Error(cfg.text.limitReached);
    }

    var props = bundleProperties(entries);
    if (!state.bundle) {
      return postToCart(cfg, { items: [{ id: cfg.variantId, quantity: 1, properties: props }] });
    }
    /* The bundle exists, so this is an edit of that one line rather than a new
       line — otherwise each distinct selection would sit in the cart as its own
       product again. */
    return changeLine(cfg, state.bundle.line, props);
  }

  /* Drops one sample from the bundle. An emptied bundle deletes its line; a
     leftover legacy line is simply removed. */
  async function removeFromBundle(cfg, id) {
    await hydrate();
    var entry = state.byProduct[String(id)];
    if (!entry) return null;

    if (!entry.bundle) return changeLine(cfg, entry.line);

    var kept = [];
    state.bundle.ids.forEach(function (bundleId, i) {
      if (bundleId !== String(id)) {
        kept.push({ id: bundleId, title: state.bundle.titles[i], handle: state.bundle.handles[i] });
      }
    });
    if (!kept.length) return changeLine(cfg, state.bundle.line);
    return changeLine(cfg, state.bundle.line, bundleProperties(kept));
  }

  /* ---------- <tm-sample-checkout-gate> ---------- */

  var GATE_ATTR = 'data-tm-gate-locked';
  var gateObserver = null;
  var gateFrame = null;

  /* A half-finished bundle cannot be ordered: the customer must either fill the
     bundle to the cap or take it out of the cart entirely.

     This is a UI gate only — see the note in assets/tm-samples.css and the
     handoff doc. Shopify serves /checkout without consulting the theme, so the
     only hard enforcement is a Cart and Checkout Validation Function. */

  function isBlocked() {
    return state.ready && state.count > 0 && state.count < state.max;
  }

  function checkoutButtons() {
    return document.querySelectorAll('#checkout, #CartDrawer-Checkout');
  }

  function lockCheckout(locked) {
    checkoutButtons().forEach(function (btn) {
      if (locked) {
        if (!btn.hasAttribute(GATE_ATTR)) {
          /* Record whether Dawn had already disabled it, so unlocking never
             revives a button the cart itself turned off (empty cart). */
          btn.setAttribute(GATE_ATTR, btn.hasAttribute('disabled') ? 'was' : 'fresh');
        }
        btn.setAttribute('disabled', '');
      } else if (btn.hasAttribute(GATE_ATTR)) {
        if (btn.getAttribute(GATE_ATTR) === 'fresh') btn.removeAttribute('disabled');
        btn.removeAttribute(GATE_ATTR);
      }
    });

    /* Shop Pay and the other accelerated wallets are rendered by Shopify as
       iframes, so they take no `disabled`. The only way to stop them is to take
       them out of the page entirely. */
    document.querySelectorAll('.cart__dynamic-checkout-buttons').forEach(function (el) {
      el.hidden = locked;
    });
  }

  /* Dawn re-renders the cart footer and the drawer wholesale on every cart
     mutation, which throws away the `disabled` attribute set above. One
     observer over those two subtrees re-applies it after each swap instead of
     trusting an element that lives beside the button. */
  function watchCheckoutSurfaces() {
    if (gateObserver) return;
    var targets = [document.getElementById('main-cart-footer'), document.querySelector('cart-drawer')].filter(
      Boolean
    );
    if (!targets.length) return;
    gateObserver = new MutationObserver(function () {
      if (gateFrame) return;
      gateFrame = requestAnimationFrame(function () {
        gateFrame = null;
        lockCheckout(isBlocked());
      });
    });
    targets.forEach(function (el) {
      gateObserver.observe(el, { childList: true, subtree: true });
    });
  }

  class TmSampleCheckoutGate extends HTMLElement {
    connectedCallback() {
      var cfg = readConfig(this);
      if (!cfg) return;
      adopt(cfg);
      this.cfg = cfg;
      this.textEl = this.querySelector('[data-text]');
      this.linkEl = this.querySelector('[data-link]');
      this.removeEl = this.querySelector('[data-remove]');
      var self = this;
      this.removeEl.addEventListener('click', function () {
        self.removeBundle();
      });
      this.unsubscribe = listen(function () {
        self.render();
      });
      watchCheckoutSurfaces();
      hydrate();
      /* This element is rendered immediately before the checkout button, so on
         a Dawn section swap it connects before the new button exists. */
      requestAnimationFrame(function () {
        self.render();
      });
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
    }

    render() {
      var blocked = isBlocked();
      lockCheckout(blocked);
      this.hidden = !blocked;
      if (!blocked) return;
      var remaining = state.max - state.count;
      this.textEl.textContent = fill(
        remaining === 1 ? this.cfg.text.blockedOne : this.cfg.text.blockedOther,
        { count: remaining, max: state.max }
      );
    }

    /* The escape hatch the customer is offered: drop the bundle line and the
       cart becomes orderable again. */
    async removeBundle() {
      this.removeEl.disabled = true;
      try {
        await hydrate();
        if (state.bundle) await changeLine(this.cfg, state.bundle.line);
      } catch (e) {
        console.error('[tm-samples]', e);
        this.removeEl.disabled = false;
      }
    }
  }

  /* ---------- <tm-sample-counter> ---------- */

  class TmSampleCounter extends HTMLElement {
    connectedCallback() {
      var cfg = readConfig(this);
      if (!cfg) return;
      adopt(cfg);
      this.cfg = cfg;
      this.textEl = this.querySelector('[data-text]');
      this.pipsEl = this.querySelector('[data-pips]');
      this.unsubscribe = listen(() => this.render());
      hydrate();
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
    }

    render() {
      /* Stays hidden until the first /cart.js read lands, so a reload never
         flashes a wrong number. */
      if (!state.ready) {
        this.hidden = true;
        return;
      }
      this.hidden = state.count === 0;
      if (this.hidden) return;
      this.textEl.textContent = fill(this.cfg.text.counter, { count: state.count, max: state.max });
      if (this.pipsEl && this.pipsEl.childElementCount !== state.max) {
        this.pipsEl.innerHTML = '';
        for (var i = 0; i < state.max; i++) {
          var pip = document.createElement('span');
          pip.className = 'tm-sample-pip';
          this.pipsEl.appendChild(pip);
        }
      }
      if (this.pipsEl) {
        this.pipsEl.querySelectorAll('.tm-sample-pip').forEach(function (pip, i) {
          pip.classList.toggle('is-on', i < state.count);
        });
      }
    }
  }

  /* ---------- <tm-sample-button> ---------- */

  class TmSampleButton extends HTMLElement {
    connectedCallback() {
      var cfg = readConfig(this);
      if (!cfg) return;
      adopt(cfg);
      this.cfg = cfg;
      this.button = this.querySelector('[data-add]');
      this.label = this.querySelector('[data-label]');
      this.errorEl = this.querySelector('[data-error]');
      this.busy = false;
      this.flash = null;

      this.button.addEventListener('click', () => this.add());
      this.unsubscribe = listen(() => this.render());
      hydrate();
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
      clearTimeout(this.flashTimer);
    }

    picks() {
      return [
        {
          id: this.cfg.productId,
          title: this.cfg.productTitle,
          handle: this.cfg.productHandle
        }
      ];
    }

    render() {
      var inBundle = isSelected(this.cfg.productId);
      var capped = atCap();
      var text = this.cfg.text;

      if (this.flash) {
        this.label.textContent = this.flash;
      } else if (!this.cfg.variantId || capped) {
        this.label.textContent = text.limitReached;
      } else if (inBundle) {
        /* Already part of the bundle — re-adding it would be a no-op, so the
           button goes quiet rather than raising a duplicate. */
        this.label.textContent = text.inBundle;
      } else {
        this.label.textContent = text.button;
      }

      this.button.disabled = !!this.flash || this.busy || !this.cfg.variantId || capped || inBundle;
      if (this.busy) this.button.setAttribute('aria-busy', 'true');
      else this.button.removeAttribute('aria-busy');
      this.button.classList.toggle('is-in-cart', inBundle && !this.flash);
      this.button.classList.toggle('is-limit', capped);
    }

    async add() {
      if (this.busy || !this.cfg.variantId || atCap() || isSelected(this.cfg.productId)) return;
      this.busy = true;
      this.hideError();
      this.render();

      try {
        await addToBundle(this.cfg, this.picks());
        this.busy = false;
        this.flash = this.cfg.text.added;
        this.render();
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => {
          this.flash = null;
          this.render();
        }, 1800);
      } catch (e) {
        this.busy = false;
        this.showError(e.message || this.cfg.text.error);
        this.render();
      }
    }

    showError(msg) {
      if (!this.errorEl) return;
      this.errorEl.textContent = msg;
      this.errorEl.hidden = false;
    }

    hideError() {
      if (!this.errorEl) return;
      this.errorEl.hidden = true;
      this.errorEl.textContent = '';
    }
  }

  /* ---------- <tm-sample-picker> ---------- */

  class TmSamplePicker extends HTMLElement {
    connectedCallback() {
      var cfg = readConfig(this);
      if (!cfg) return;
      adopt(cfg);
      this.cfg = cfg;
      this.rowsEl = this.querySelector('[data-rows]');
      this.addBtn = this.querySelector('[data-add-selected]');
      if (!this.rowsEl || !this.addBtn) return;
      this.addLabel = this.addBtn.querySelector('[data-label]');
      this.errorEl = this.querySelector('[data-error]');
      this.pending = {};
      this.busy = false;

      this.rowsEl.addEventListener('change', (e) => this.onChange(e));
      this.rowsEl.addEventListener('click', (e) => {
        var btn = e.target.closest('[data-remove]');
        if (btn) this.remove(btn);
      });
      this.addBtn.addEventListener('click', () => this.addSelected());

      this.buildRows();
      this.unsubscribe = listen(() => this.render());
      hydrate();
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
    }

    /* Rows are built once and then updated in place, so re-rendering on every cart
       event cannot steal focus from the checkbox the customer just clicked. The
       Remove button sits outside the <label> on purpose: clicking it must not
       also toggle the checkbox. */
    rowFor(item) {
      var row = document.createElement('div');
      row.className = 'tm-picker__row';
      row.dataset.rowId = String(item.id);

      var label = document.createElement('label');
      label.className = 'tm-picker__pick';

      var check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'tm-picker__check';
      check.dataset.pick = '';
      check.setAttribute('aria-label', item.title);
      label.appendChild(check);

      if (item.image) {
        var img = document.createElement('img');
        img.className = 'tm-picker__img';
        img.src = item.image;
        img.alt = '';
        img.width = 56;
        img.height = 56;
        img.loading = 'lazy';
        label.appendChild(img);
      }

      var text = document.createElement('span');
      text.className = 'tm-picker__text';
      var title = document.createElement('span');
      title.className = 'tm-picker__title';
      title.textContent = item.title;
      var meta = document.createElement('span');
      meta.className = 'tm-picker__meta';
      text.appendChild(title);
      text.appendChild(meta);
      label.appendChild(text);
      row.appendChild(label);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tm-picker__remove';
      remove.dataset.remove = '';
      remove.textContent = this.cfg.text.remove;
      remove.setAttribute('aria-label', (this.cfg.text.removeFromBundle || '') + ' ' + item.title);
      remove.hidden = true;
      row.appendChild(remove);

      return row;
    }

    buildRows() {
      this.rowsEl.textContent = '';
      (this.cfg.items || []).forEach((item) => {
        this.rowsEl.appendChild(this.rowFor(item));
      });
    }

    pendingIds() {
      return Object.keys(this.pending).filter((id) => this.pending[id]);
    }

    onChange(e) {
      var input = e.target;
      if (!input || !input.matches('[data-pick]')) return;
      var id = input.closest('[data-row-id]').dataset.rowId;
      if (input.checked) {
        if (overCapWith(this.pendingIds().length + 1)) {
          input.checked = false;
          this.render();
          return;
        }
        this.pending[id] = true;
      } else {
        delete this.pending[id];
      }
      this.hideError();
      this.render();
    }

    async addSelected() {
      var ids = this.pendingIds().filter((id) => !isSelected(id));
      if (this.busy || !ids.length || !this.cfg.variantId) return;
      this.hideError();

      this.busy = true;
      this.render();
      try {
        var picks = ids.map((id) => {
          var item = this.itemById(id);
          return { id: id, title: item.title, handle: item.handle };
        });
        await addToBundle(this.cfg, picks);
        this.pending = {};
      } catch (e) {
        this.showError(e.message || this.cfg.text.error);
      } finally {
        this.busy = false;
        this.render();
      }
    }

    itemById(id) {
      var found = null;
      (this.cfg.items || []).forEach(function (item) {
        if (String(item.id) === String(id)) found = item;
      });
      return found || { id: id, title: '', handle: '' };
    }

    async remove(btn) {
      if (this.busy) return;
      var row = btn.closest('[data-row-id]');
      this.busy = true;
      this.hideError();
      this.render();
      try {
        /* Removes this sample from the bundle; the bundle line itself survives
           unless this was the last sample in it. Line positions shift on every
           cart change, so removeFromBundle re-reads the cart first. */
        await removeFromBundle(this.cfg, row.dataset.rowId);
      } catch (e) {
        this.showError(e.message || this.cfg.text.error);
      } finally {
        this.busy = false;
        this.render();
      }
    }

    showError(msg) {
      if (!this.errorEl) return;
      this.errorEl.textContent = msg;
      this.errorEl.hidden = false;
    }

    hideError() {
      if (!this.errorEl) return;
      this.errorEl.hidden = true;
      this.errorEl.textContent = '';
    }

    render() {
      /* Samples already in the bundle are not re-offered: the cap applies to the
         bundle, and re-adding one would only ever be a duplicate. */
      var selected = this.pendingIds();
      var blocked = atCapWith(selected.length);
      var over = overCapWith(selected.length);

      this.querySelectorAll('[data-row-id]').forEach((row) => {
        var id = row.dataset.rowId;
        var inBundle = isSelected(id);
        var check = row.querySelector('[data-pick]');
        var meta = row.querySelector('.tm-picker__meta');
        var remove = row.querySelector('[data-remove]');
        var picked = !!this.pending[id];

        row.classList.toggle('is-in-cart', inBundle);
        /* An in-bundle sample is locked in until Remove is pressed. */
        check.checked = inBundle || picked;
        check.disabled = inBundle || this.busy || (!picked && blocked);
        remove.hidden = !inBundle;
        remove.disabled = this.busy;
        meta.textContent = inBundle ? this.cfg.text.inBundle : '';
      });

      this.addLabel.textContent =
        selected.length === 1
          ? this.cfg.text.addSelectedOne
          : fill(this.cfg.text.addSelected, { count: selected.length });
      this.addBtn.disabled = this.busy || !selected.length || over || !this.cfg.variantId;
      this.addBtn.setAttribute('aria-busy', this.busy ? 'true' : 'false');
    }
  }

/* Wire the cart subscription before the elements upgrade: defining a custom
     element runs connectedCallback synchronously for anything already parsed. */
  boot();

  customElements.define('tm-sample-counter', TmSampleCounter);
  customElements.define('tm-sample-checkout-gate', TmSampleCheckoutGate);
  customElements.define('tm-sample-button', TmSampleButton);
  customElements.define('tm-sample-picker', TmSamplePicker);

  /* Expose the singleton for anything that needs to force a read (the theme
     editor re-renders sections without a cart event). */
  window.TmSamples = { state: state, refresh: hydrate };
})();