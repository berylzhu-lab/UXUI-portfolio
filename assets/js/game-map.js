'use strict';

/**
 * Game-style minimap on the Contact page: a tinted, non-interactive strip of the map with a
 * pixel pin. The button (or the "M" key while Contact is open) unfolds it into the full,
 * interactive map, like opening the map screen in a game.
 */

(function () {

  const map = document.querySelector('[data-game-map]');
  if (!map) return;

  const toggle = map.querySelector('[data-map-toggle]');
  const label = map.querySelector('[data-map-toggle-label]');
  const frame = map.querySelector('iframe');
  const contactPage = document.querySelector('[data-page="contact"]');

  const EN = { 'map.open': 'Open map', 'map.close': 'Close map' };
  const t = function (key) {
    const isZh = document.documentElement.lang.indexOf('zh') === 0;
    if (isZh && typeof zh !== 'undefined' && zh[key]) return zh[key];
    return EN[key];
  };

  const setOpen = function (open) {
    map.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    frame.tabIndex = open ? 0 : -1;
    // keep the label translatable: point it at the right key, then fill in the current language
    label.dataset.i18n = open ? 'map.close' : 'map.open';
    label.textContent = t(label.dataset.i18n);
  };

  toggle.addEventListener('click', function () {
    setOpen(!map.classList.contains('is-open'));
  });

  // "M" toggles the map while the Contact page is showing (but never while typing)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!contactPage || !contactPage.classList.contains('active')) return;
    setOpen(!map.classList.contains('is-open'));
  });

})();
