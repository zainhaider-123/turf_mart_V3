/* Turf Mart product page — gallery thumb switching, image zoom lightbox and
   detail tabs. Ported from references/productpage/assets/js/pdp.js without the
   prototype cart preview (Shopify's cart drawer replaces it; the calculator
   posts to /cart/add.js itself). Zoom fixes: the lightbox opens a width=2400
   image, and the main image's srcset is cleared on thumb click so the new
   src wins. */
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
        mainImg.removeAttribute('srcset');
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
      lbImg.removeAttribute('width'); lbImg.removeAttribute('height');
      lbImg.src = mainImg.src.replace(/([?&])width=\d+/, '$1width=2400');
      if (lbImg.src === mainImg.src) {
        lbImg.src = mainImg.src + (mainImg.src.indexOf('?') > -1 ? '&' : '?') + 'width=2400';
      }
      lbImg.alt = mainImg.alt;
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
})();
