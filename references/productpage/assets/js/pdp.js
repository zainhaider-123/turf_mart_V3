/* Turf Mart product page — gallery, zoom, detail tabs, and a prototype
   cart preview. In Shopify the calculator posts to /cart/add.js and opens
   the cart drawer; here that call is replaced with an on-page summary. */
(function () {
  'use strict';

  /* ---------- Gallery ---------- */
  var gallery = document.querySelector('[data-gallery]');
  var mainImg = gallery && gallery.querySelector('[data-gallery-main]');
  if (gallery && mainImg) {
    gallery.querySelectorAll('.gallery__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        gallery.querySelectorAll('.gallery__thumb').forEach(function (t) {
          t.classList.remove('is-active'); t.removeAttribute('aria-current');
        });
        thumb.classList.add('is-active'); thumb.setAttribute('aria-current', 'true');
        mainImg.src = thumb.dataset.src; mainImg.alt = thumb.dataset.alt || '';
      });
    });
  }

  /* ---------- Zoom ---------- */
  var lightbox = document.querySelector('[data-lightbox]');
  var zoomBtn = document.querySelector('[data-gallery-zoom]');
  function closeZoom() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true; document.documentElement.style.overflow = '';
    if (zoomBtn) zoomBtn.focus();
  }
  if (lightbox && zoomBtn && mainImg) {
    var lbImg = lightbox.querySelector('[data-lightbox-img]');
    zoomBtn.addEventListener('click', function () {
      lbImg.src = mainImg.src; lbImg.alt = mainImg.alt;
      lightbox.hidden = false; document.documentElement.style.overflow = 'hidden';
      lightbox.querySelector('[data-lightbox-close]').focus();
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.closest('[data-lightbox-close]')) closeZoom();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeZoom(); });
  }

  /* ---------- Detail tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); select(next); next.focus(); }
      });
    });
  });

  /* ---------- Prototype cart preview ---------- */
  var catalogue = {
    1001: { name: 'SYNLawn Classic 35', price: 25599, unit: 'm' },
    2001: { name: 'Sand infill – 20 kg bag', price: 1800 },
    2002: { name: 'Turf pins – box of 100', price: 1500 },
    2003: { name: 'Jointing tape – 100 m roll', price: 4500 },
    2004: { name: 'Turf glue – 20 L drum', price: 9500 },
    3001: { name: 'Free turf sample', price: 0 }
  };
  var toast = document.querySelector('[data-toast]');
  var cartCount = 0, toastTimer;
  function money(cents) {
    return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function showAdded(lines) {
    if (!toast) return;
    var total = 0;
    var rows = lines.map(function (l) {
      total += l.price * l.qty;
      var detail = l.detail ? '<small>' + esc(l.detail) + '</small>' : '';
      return '<li><span>' + esc(l.name) + ' × ' + l.qty + (l.unit ? ' ' + l.unit : '') + detail + '</span><b>' + money(l.price * l.qty) + '</b></li>';
    }).join('');
    cartCount += lines.length;
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = cartCount; });
    toast.innerHTML =
      '<div class="toast__head"><span class="toast__title">' +
      '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="11" fill="#175c3f"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      'Added to cart</span><button type="button" class="toast__close" aria-label="Close">✕</button></div>' +
      '<ul>' + rows + '</ul>' +
      '<div class="toast__foot"><span>Added</span><span>' + money(total) + '</span></div>' +
      '<div class="toast__note">Prototype preview: in Shopify this opens the cart drawer.</div>';
    toast.hidden = false;
    toast.querySelector('.toast__close').addEventListener('click', function () { toast.hidden = true; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 9000);
  }

  // Replace the calculator's network call with the preview.
  var Calc = window.customElements && customElements.get('turf-calculator');
  if (Calc) {
    Calc.prototype.postItems = function (items) {
      showAdded(items.map(function (item) {
        var info = catalogue[item.id] || { name: 'Item ' + item.id, price: 0 };
        var props = item.properties || {};
        var detail = props['Cut lengths'] ? 'Cut lengths: ' + props['Cut lengths'] + ' · ' + props['Coverage'] : (props['Sample of'] ? 'Sample of: ' + props['Sample of'] : '');
        return { name: info.name, qty: item.quantity, price: info.price, unit: info.unit, detail: detail };
      }));
      return Promise.resolve();
    };
  }

  document.querySelectorAll('[data-quick-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showAdded([{ name: btn.dataset.quickAdd, qty: 1, price: parseInt(btn.dataset.price, 10) || 0 }]);
    });
  });
})();
