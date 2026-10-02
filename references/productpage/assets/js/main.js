/* Turf Mart homepage — small interactions only:
   mobile search toggle, mobile menu drawer, reviews carousel. */
(function () {
  'use strict';

  /* ---------- Mobile search (header icon + quick-bar button) ---------- */
  var searchForm = document.getElementById('mobile-search');
  var searchToggles = document.querySelectorAll('[data-search-toggle]');

  function setSearch(open) {
    if (!searchForm) return;
    searchForm.hidden = !open;
    searchToggles.forEach(function (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (btn.classList.contains('header__search-toggle')) {
        btn.setAttribute('aria-label', open ? 'Close search' : 'Open search');
      }
    });
    if (open) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var input = searchForm.querySelector('input');
      if (input) setTimeout(function () { input.focus(); }, 50);
    }
  }
  searchToggles.forEach(function (btn) {
    btn.addEventListener('click', function () { setSearch(searchForm.hidden); });
  });

  /* ---------- Mobile menu drawer ---------- */
  var drawer = document.getElementById('menu-drawer');
  var openBtn = document.querySelector('[data-menu-open]');

  function setMenu(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var first = drawer.querySelector('.drawer__panel a, .drawer__panel button');
      if (first) first.focus();
    } else if (openBtn) {
      openBtn.focus();
    }
  }
  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  document.querySelectorAll('[data-menu-close]').forEach(function (el) {
    el.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && !drawer.hidden) setMenu(false);
    else if (searchForm && !searchForm.hidden) setSearch(false);
  });

  /* ---------- Reviews carousel: arrows scroll one card; swipe/scroll natively ---------- */
  document.querySelectorAll('[data-carousel-track]').forEach(function (track) {
    var section = track.closest('section');
    var prev = section.querySelector('[data-carousel-prev]');
    var next = section.querySelector('[data-carousel-next]');

    function step() {
      var card = track.firstElementChild;
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
