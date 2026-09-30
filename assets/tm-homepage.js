/* Turf Mart homepage behaviours: mobile search, menu drawer, reviews carousel.
   Idempotent: may be included by several sections. */
(function () {
  'use strict';
  if (window.__tmHomepageInit) return;
  window.__tmHomepageInit = true;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Mobile search toggle ---------- */
  var searchToggles = document.querySelectorAll('[data-tm-search-toggle]');
  var mobileSearch = document.getElementById('tm-mobile-search');

  function setSearch(open) {
    if (!mobileSearch) return;
    mobileSearch.hidden = !open;
    searchToggles.forEach(function (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close search' : 'Open search');
    });
    if (open) {
      window.scrollTo(0, 0);
      var input = mobileSearch.querySelector('input');
      if (input) input.focus();
    }
  }

  searchToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setSearch(Boolean(mobileSearch && mobileSearch.hidden));
    });
  });

  /* ---------- Mobile menu drawer ---------- */
  var drawer = document.getElementById('tm-menu-drawer');
  var openBtn = document.querySelector('[data-tm-menu-open]');

  function setDrawer(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var first = drawer.querySelector('button, a');
      if (first) first.focus();
    }
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      setDrawer(Boolean(drawer && drawer.hidden));
    });
  }
  document.querySelectorAll('[data-tm-menu-close]').forEach(function (el) {
    el.addEventListener('click', function () {
      setDrawer(false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && !drawer.hidden) {
      setDrawer(false);
    } else if (mobileSearch && !mobileSearch.hidden) {
      setSearch(false);
    }
  });

  /* ---------- Reviews carousel ---------- */
  document.querySelectorAll('[data-tm-carousel-track]').forEach(function (track) {
    var section = track.closest('section');
    if (!section) return;
    var prev = section.querySelector('[data-tm-carousel-prev]');
    var next = section.querySelector('[data-tm-carousel-next]');
    if (!prev || !next) return;
    var first = track.firstElementChild;

    function step() {
      if (!first) return 0;
      var styles = getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function maxScroll() {
      return track.scrollWidth - track.clientWidth - 2;
    }
    function update() {
      var max = maxScroll();
      prev.disabled = track.scrollLeft <= 0;
      next.disabled = max <= 0 || track.scrollLeft >= max;
    }
    function scrollByCards(dir) {
      track.scrollBy({
        left: dir * step(),
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
    }

    prev.addEventListener('click', function () { scrollByCards(-1); });
    next.addEventListener('click', function () { scrollByCards(1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCards(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCards(1); }
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();
  });
})();
